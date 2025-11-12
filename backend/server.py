from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import random
import razorpay


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 720  # 30 days

# Configure logging first
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Razorpay Configuration
RAZORPAY_KEY_ID = os.environ.get('RAZORPAY_KEY_ID', '')
RAZORPAY_KEY_SECRET = os.environ.get('RAZORPAY_KEY_SECRET', '')
RAZORPAY_MOCK_MODE = not RAZORPAY_KEY_ID or not RAZORPAY_KEY_SECRET

if not RAZORPAY_MOCK_MODE:
    razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
else:
    razorpay_client = None
    logger.info("Running in MOCK payment mode - Razorpay credentials not configured")

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

security = HTTPBearer()

# ===================== MODELS =====================

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    phone_number: str
    name: str
    role: str  # chairman or user
    society_id: Optional[str] = None
    user_type: Optional[str] = None  # owner or tenant
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Society(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    address: str
    chairman_id: str
    bank_account_number: Optional[str] = None
    bank_ifsc: Optional[str] = None
    bank_name: Optional[str] = None
    owner_maintenance_rate: Optional[float] = None
    tenant_maintenance_rate: Optional[float] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Payment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    society_id: str
    amount: float
    razorpay_order_id: str
    razorpay_payment_id: Optional[str] = None
    razorpay_signature: Optional[str] = None
    status: str  # pending, completed, failed
    payment_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    month: str  # format: YYYY-MM
    user_name: str
    user_phone: str

class Notification(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    society_id: str
    message: str
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    read_by: List[str] = Field(default_factory=list)

# ===================== REQUEST/RESPONSE MODELS =====================

class SendOTPRequest(BaseModel):
    phone_number: str

class VerifyOTPRequest(BaseModel):
    phone_number: str
    otp: str
    name: str
    role: str

class CreateSocietyRequest(BaseModel):
    name: str
    address: str

class UpdateBankDetailsRequest(BaseModel):
    bank_account_number: str
    bank_ifsc: str
    bank_name: str

class UpdateMaintenanceRatesRequest(BaseModel):
    owner_rate: float
    tenant_rate: float

class JoinSocietyRequest(BaseModel):
    user_type: str  # owner or tenant

class CreatePaymentOrderRequest(BaseModel):
    amount: float
    month: str

class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str

class CreateNotificationRequest(BaseModel):
    message: str

class MarkNotificationReadRequest(BaseModel):
    notification_ids: List[str]

# ===================== AUTH UTILITIES =====================

def create_jwt_token(user_id: str, phone_number: str, role: str) -> str:
    payload = {
        'user_id': user_id,
        'phone_number': phone_number,
        'role': role,
        'exp': datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_jwt_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = verify_jwt_token(token)
    user = await db.users.find_one({"id": payload['user_id']}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return User(**user)

# ===================== AUTH ROUTES =====================

@api_router.post("/auth/send-otp")
async def send_otp(request: SendOTPRequest):
    # Generate 6-digit OTP
    otp = str(random.randint(100000, 999999))
    otp_expiry = datetime.now(timezone.utc) + timedelta(minutes=10)
    
    # Store OTP in database
    await db.otp_store.update_one(
        {"phone_number": request.phone_number},
        {"$set": {
            "otp": otp,
            "expiry": otp_expiry.isoformat()
        }},
        upsert=True
    )
    
    # In production, integrate SMS gateway here
    logger.info(f"OTP for {request.phone_number}: {otp}")
    
    return {"message": "OTP sent successfully", "otp": otp}  # Remove OTP from response in production

@api_router.post("/auth/verify-otp")
async def verify_otp(request: VerifyOTPRequest):
    # Get stored OTP
    otp_data = await db.otp_store.find_one({"phone_number": request.phone_number}, {"_id": 0})
    
    if not otp_data:
        raise HTTPException(status_code=400, detail="OTP not found. Please request a new OTP")
    
    # Check if OTP expired
    if datetime.fromisoformat(otp_data['expiry']) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="OTP expired. Please request a new OTP")
    
    # Verify OTP
    if otp_data['otp'] != request.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    
    # Check if user exists
    existing_user = await db.users.find_one({"phone_number": request.phone_number}, {"_id": 0})
    
    if existing_user:
        user = User(**existing_user)
    else:
        # Create new user
        user = User(
            phone_number=request.phone_number,
            name=request.name,
            role=request.role
        )
        user_dict = user.model_dump()
        user_dict['created_at'] = user_dict['created_at'].isoformat()
        await db.users.insert_one(user_dict)
    
    # Generate JWT token
    token = create_jwt_token(user.id, user.phone_number, user.role)
    
    # Delete used OTP
    await db.otp_store.delete_one({"phone_number": request.phone_number})
    
    return {
        "token": token,
        "user": user.model_dump()
    }

@api_router.get("/auth/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

# ===================== SOCIETY ROUTES =====================

@api_router.post("/society/create")
async def create_society(request: CreateSocietyRequest, current_user: User = Depends(get_current_user)):
    if current_user.role != "chairman":
        raise HTTPException(status_code=403, detail="Only chairmen can create societies")
    
    # Check if chairman already has a society
    existing_society = await db.societies.find_one({"chairman_id": current_user.id}, {"_id": 0})
    if existing_society:
        raise HTTPException(status_code=400, detail="You already have a society")
    
    society = Society(
        name=request.name,
        address=request.address,
        chairman_id=current_user.id
    )
    
    society_dict = society.model_dump()
    society_dict['created_at'] = society_dict['created_at'].isoformat()
    await db.societies.insert_one(society_dict)
    
    # Update user's society_id
    await db.users.update_one(
        {"id": current_user.id},
        {"$set": {"society_id": society.id}}
    )
    
    return society

@api_router.put("/society/{society_id}/bank-details")
async def update_bank_details(society_id: str, request: UpdateBankDetailsRequest, current_user: User = Depends(get_current_user)):
    society = await db.societies.find_one({"id": society_id}, {"_id": 0})
    if not society:
        raise HTTPException(status_code=404, detail="Society not found")
    
    if society['chairman_id'] != current_user.id:
        raise HTTPException(status_code=403, detail="Only the chairman can update bank details")
    
    await db.societies.update_one(
        {"id": society_id},
        {"$set": {
            "bank_account_number": request.bank_account_number,
            "bank_ifsc": request.bank_ifsc,
            "bank_name": request.bank_name
        }}
    )
    
    return {"message": "Bank details updated successfully"}

@api_router.put("/society/{society_id}/maintenance-rates")
async def update_maintenance_rates(society_id: str, request: UpdateMaintenanceRatesRequest, current_user: User = Depends(get_current_user)):
    society = await db.societies.find_one({"id": society_id}, {"_id": 0})
    if not society:
        raise HTTPException(status_code=404, detail="Society not found")
    
    if society['chairman_id'] != current_user.id:
        raise HTTPException(status_code=403, detail="Only the chairman can update maintenance rates")
    
    await db.societies.update_one(
        {"id": society_id},
        {"$set": {
            "owner_maintenance_rate": request.owner_rate,
            "tenant_maintenance_rate": request.tenant_rate
        }}
    )
    
    return {"message": "Maintenance rates updated successfully"}

@api_router.get("/society/search")
async def search_societies(query: str, current_user: User = Depends(get_current_user)):
    societies = await db.societies.find(
        {"name": {"$regex": query, "$options": "i"}},
        {"_id": 0}
    ).to_list(20)
    return societies

@api_router.post("/society/{society_id}/join")
async def join_society(society_id: str, request: JoinSocietyRequest, current_user: User = Depends(get_current_user)):
    if current_user.role != "user":
        raise HTTPException(status_code=403, detail="Only users can join societies")
    
    society = await db.societies.find_one({"id": society_id}, {"_id": 0})
    if not society:
        raise HTTPException(status_code=404, detail="Society not found")
    
    await db.users.update_one(
        {"id": current_user.id},
        {"$set": {
            "society_id": society_id,
            "user_type": request.user_type
        }}
    )
    
    return {"message": "Successfully joined society"}

@api_router.get("/society/{society_id}/members")
async def get_society_members(society_id: str, current_user: User = Depends(get_current_user)):
    society = await db.societies.find_one({"id": society_id}, {"_id": 0})
    if not society:
        raise HTTPException(status_code=404, detail="Society not found")
    
    if society['chairman_id'] != current_user.id:
        raise HTTPException(status_code=403, detail="Only the chairman can view members")
    
    members = await db.users.find({"society_id": society_id, "role": "user"}, {"_id": 0}).to_list(1000)
    return members

@api_router.get("/society/{society_id}/details")
async def get_society_details(society_id: str, current_user: User = Depends(get_current_user)):
    society = await db.societies.find_one({"id": society_id}, {"_id": 0})
    if not society:
        raise HTTPException(status_code=404, detail="Society not found")
    
    return society

@api_router.get("/society/{society_id}/payments")
async def get_society_payments(society_id: str, current_user: User = Depends(get_current_user)):
    society = await db.societies.find_one({"id": society_id}, {"_id": 0})
    if not society:
        raise HTTPException(status_code=404, detail="Society not found")
    
    if society['chairman_id'] != current_user.id:
        raise HTTPException(status_code=403, detail="Only the chairman can view payments")
    
    payments = await db.payments.find({"society_id": society_id}, {"_id": 0}).sort("payment_date", -1).to_list(1000)
    return payments

# ===================== PAYMENT ROUTES =====================

@api_router.get("/user/maintenance")
async def get_user_maintenance(current_user: User = Depends(get_current_user)):
    if not current_user.society_id:
        raise HTTPException(status_code=400, detail="You are not part of any society")
    
    society = await db.societies.find_one({"id": current_user.society_id}, {"_id": 0})
    if not society:
        raise HTTPException(status_code=404, detail="Society not found")
    
    if current_user.user_type == "owner":
        amount = society.get('owner_maintenance_rate', 0)
    else:
        amount = society.get('tenant_maintenance_rate', 0)
    
    return {
        "amount": amount,
        "user_type": current_user.user_type,
        "society_name": society['name']
    }

@api_router.post("/payment/create-order")
async def create_payment_order(request: CreatePaymentOrderRequest, current_user: User = Depends(get_current_user)):
    if not current_user.society_id:
        raise HTTPException(status_code=400, detail="You are not part of any society")
    
    # Check if payment already exists for this month
    existing_payment = await db.payments.find_one({
        "user_id": current_user.id,
        "month": request.month,
        "status": "completed"
    }, {"_id": 0})
    
    if existing_payment:
        raise HTTPException(status_code=400, detail="Payment already made for this month")
    
    amount_in_paise = int(request.amount * 100)
    
    # Mock payment mode
    if RAZORPAY_MOCK_MODE:
        mock_order_id = f"order_mock_{str(uuid.uuid4())[:8]}"
        
        # Create payment record
        payment = Payment(
            user_id=current_user.id,
            society_id=current_user.society_id,
            amount=request.amount,
            razorpay_order_id=mock_order_id,
            status="pending",
            month=request.month,
            user_name=current_user.name,
            user_phone=current_user.phone_number
        )
        
        payment_dict = payment.model_dump()
        payment_dict['payment_date'] = payment_dict['payment_date'].isoformat()
        await db.payments.insert_one(payment_dict)
        
        logger.info(f"Mock payment order created: {mock_order_id}")
        
        return {
            "order_id": mock_order_id,
            "amount": amount_in_paise,
            "currency": "INR",
            "razorpay_key": "mock_key",
            "mock_mode": True
        }
    
    # Real Razorpay integration
    razorpay_order = razorpay_client.order.create({
        "amount": amount_in_paise,
        "currency": "INR",
        "payment_capture": 1
    })
    
    # Create payment record
    payment = Payment(
        user_id=current_user.id,
        society_id=current_user.society_id,
        amount=request.amount,
        razorpay_order_id=razorpay_order['id'],
        status="pending",
        month=request.month,
        user_name=current_user.name,
        user_phone=current_user.phone_number
    )
    
    payment_dict = payment.model_dump()
    payment_dict['payment_date'] = payment_dict['payment_date'].isoformat()
    await db.payments.insert_one(payment_dict)
    
    return {
        "order_id": razorpay_order['id'],
        "amount": amount_in_paise,
        "currency": "INR",
        "razorpay_key": RAZORPAY_KEY_ID
    }

@api_router.post("/payment/verify")
async def verify_payment(request: VerifyPaymentRequest, current_user: User = Depends(get_current_user)):
    # Mock payment mode - auto-verify
    if RAZORPAY_MOCK_MODE:
        logger.info(f"Mock payment verification for order: {request.razorpay_order_id}")
        
        # Update payment record
        await db.payments.update_one(
            {"razorpay_order_id": request.razorpay_order_id},
            {"$set": {
                "razorpay_payment_id": request.razorpay_payment_id,
                "razorpay_signature": request.razorpay_signature,
                "status": "completed",
                "payment_date": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        return {"message": "Payment verified successfully (MOCK MODE)"}
    
    # Verify signature with real Razorpay
    try:
        razorpay_client.utility.verify_payment_signature({
            'razorpay_order_id': request.razorpay_order_id,
            'razorpay_payment_id': request.razorpay_payment_id,
            'razorpay_signature': request.razorpay_signature
        })
    except Exception as e:
        logger.error(f"Payment verification failed: {str(e)}")
        raise HTTPException(status_code=400, detail="Payment verification failed")
    
    # Update payment record
    await db.payments.update_one(
        {"razorpay_order_id": request.razorpay_order_id},
        {"$set": {
            "razorpay_payment_id": request.razorpay_payment_id,
            "razorpay_signature": request.razorpay_signature,
            "status": "completed",
            "payment_date": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Payment verified successfully"}

@api_router.get("/payment/receipts")
async def get_user_receipts(current_user: User = Depends(get_current_user)):
    receipts = await db.payments.find(
        {"user_id": current_user.id, "status": "completed"},
        {"_id": 0}
    ).sort("payment_date", -1).to_list(1000)
    return receipts

# ===================== NOTIFICATION ROUTES =====================

@api_router.post("/notifications/create")
async def create_notification(request: CreateNotificationRequest, current_user: User = Depends(get_current_user)):
    if current_user.role != "chairman":
        raise HTTPException(status_code=403, detail="Only chairmen can create notifications")
    
    if not current_user.society_id:
        raise HTTPException(status_code=400, detail="You don't have a society")
    
    notification = Notification(
        society_id=current_user.society_id,
        message=request.message,
        created_by=current_user.id
    )
    
    notification_dict = notification.model_dump()
    notification_dict['created_at'] = notification_dict['created_at'].isoformat()
    await db.notifications.insert_one(notification_dict)
    
    return {"message": "Notification sent successfully"}

@api_router.get("/notifications")
async def get_notifications(current_user: User = Depends(get_current_user)):
    if not current_user.society_id:
        return []
    
    notifications = await db.notifications.find(
        {"society_id": current_user.society_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return notifications

@api_router.post("/notifications/mark-read")
async def mark_notifications_read(request: MarkNotificationReadRequest, current_user: User = Depends(get_current_user)):
    await db.notifications.update_many(
        {"id": {"$in": request.notification_ids}},
        {"$addToSet": {"read_by": current_user.id}}
    )
    
    return {"message": "Notifications marked as read"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

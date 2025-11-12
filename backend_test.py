import requests
import sys
import json
from datetime import datetime

class SocietyMaintenanceAPITester:
    def __init__(self, base_url="https://maintain-ease.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.chairman_token = None
        self.user_token = None
        self.society_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def run_test(self, name, method, endpoint, expected_status, data=None, token=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = f'Bearer {token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json()
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}")
                self.failed_tests.append({
                    "test": name,
                    "expected": expected_status,
                    "actual": response.status_code,
                    "response": response.text[:200]
                })
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append({
                "test": name,
                "error": str(e)
            })
            return False, {}

    def test_chairman_auth_flow(self):
        """Test chairman authentication flow"""
        print("\n=== TESTING CHAIRMAN AUTHENTICATION ===")
        
        # Send OTP
        success, response = self.run_test(
            "Chairman Send OTP",
            "POST",
            "auth/send-otp",
            200,
            data={"phone_number": "9876543210"}
        )
        
        if not success:
            return False
            
        otp = response.get('otp', '123456')
        
        # Verify OTP
        success, response = self.run_test(
            "Chairman Verify OTP",
            "POST",
            "auth/verify-otp",
            200,
            data={
                "phone_number": "9876543210",
                "otp": otp,
                "name": "Test Chairman",
                "role": "chairman"
            }
        )
        
        if success and 'token' in response:
            self.chairman_token = response['token']
            print(f"✅ Chairman token obtained")
            return True
        return False

    def test_user_auth_flow(self):
        """Test user authentication flow"""
        print("\n=== TESTING USER AUTHENTICATION ===")
        
        # Send OTP
        success, response = self.run_test(
            "User Send OTP",
            "POST",
            "auth/send-otp",
            200,
            data={"phone_number": "9876543211"}
        )
        
        if not success:
            return False
            
        otp = response.get('otp', '123456')
        
        # Verify OTP
        success, response = self.run_test(
            "User Verify OTP",
            "POST",
            "auth/verify-otp",
            200,
            data={
                "phone_number": "9876543211",
                "otp": otp,
                "name": "Test User",
                "role": "user"
            }
        )
        
        if success and 'token' in response:
            self.user_token = response['token']
            print(f"✅ User token obtained")
            return True
        return False

    def test_society_management(self):
        """Test society creation and management"""
        print("\n=== TESTING SOCIETY MANAGEMENT ===")
        
        # Create society
        success, response = self.run_test(
            "Create Society",
            "POST",
            "society/create",
            200,
            data={
                "name": "Test Society",
                "address": "123 Test Street, Test City"
            },
            token=self.chairman_token
        )
        
        if success and 'id' in response:
            self.society_id = response['id']
            print(f"✅ Society created with ID: {self.society_id}")
        else:
            return False

        # Update bank details
        success, _ = self.run_test(
            "Update Bank Details",
            "PUT",
            f"society/{self.society_id}/bank-details",
            200,
            data={
                "bank_account_number": "1234567890",
                "bank_ifsc": "HDFC0001234",
                "bank_name": "HDFC Bank"
            },
            token=self.chairman_token
        )

        # Update maintenance rates
        success, _ = self.run_test(
            "Update Maintenance Rates",
            "PUT",
            f"society/{self.society_id}/maintenance-rates",
            200,
            data={
                "owner_rate": 2000.0,
                "tenant_rate": 2500.0
            },
            token=self.chairman_token
        )

        # Get society details
        success, _ = self.run_test(
            "Get Society Details",
            "GET",
            f"society/{self.society_id}/details",
            200,
            token=self.chairman_token
        )

        return True

    def test_user_society_interaction(self):
        """Test user joining society"""
        print("\n=== TESTING USER-SOCIETY INTERACTION ===")
        
        # Search societies
        success, response = self.run_test(
            "Search Societies",
            "GET",
            "society/search?query=Test",
            200,
            token=self.user_token
        )

        # Join society
        success, _ = self.run_test(
            "Join Society",
            "POST",
            f"society/{self.society_id}/join",
            200,
            data={"user_type": "owner"},
            token=self.user_token
        )

        # Get user maintenance
        success, response = self.run_test(
            "Get User Maintenance",
            "GET",
            "user/maintenance",
            200,
            token=self.user_token
        )

        if success:
            print(f"✅ Maintenance amount: ₹{response.get('amount', 0)}")

        return True

    def test_payment_flow(self):
        """Test payment creation and verification (MOCK mode)"""
        print("\n=== TESTING PAYMENT FLOW (MOCK MODE) ===")
        
        current_month = datetime.now().strftime("%Y-%m")
        
        # Create payment order
        success, response = self.run_test(
            "Create Payment Order",
            "POST",
            "payment/create-order",
            200,
            data={
                "amount": 2000.0,
                "month": current_month
            },
            token=self.user_token
        )

        if success and 'order_id' in response:
            order_id = response['order_id']
            print(f"✅ Payment order created: {order_id}")
            
            # Verify payment (MOCK mode)
            success, _ = self.run_test(
                "Verify Payment",
                "POST",
                "payment/verify",
                200,
                data={
                    "razorpay_order_id": order_id,
                    "razorpay_payment_id": f"pay_mock_{datetime.now().timestamp()}",
                    "razorpay_signature": f"sig_mock_{datetime.now().timestamp()}"
                },
                token=self.user_token
            )

            # Get payment receipts
            success, response = self.run_test(
                "Get Payment Receipts",
                "GET",
                "payment/receipts",
                200,
                token=self.user_token
            )

            if success:
                print(f"✅ Found {len(response)} receipts")

        return True

    def test_member_management(self):
        """Test member management features"""
        print("\n=== TESTING MEMBER MANAGEMENT ===")
        
        # Get society members
        success, response = self.run_test(
            "Get Society Members",
            "GET",
            f"society/{self.society_id}/members",
            200,
            token=self.chairman_token
        )

        if success:
            print(f"✅ Found {len(response)} members")

        # Get society payments
        success, response = self.run_test(
            "Get Society Payments",
            "GET",
            f"society/{self.society_id}/payments",
            200,
            token=self.chairman_token
        )

        if success:
            print(f"✅ Found {len(response)} payments")

        return True

    def test_notifications(self):
        """Test notification system"""
        print("\n=== TESTING NOTIFICATIONS ===")
        
        # Create notification
        success, _ = self.run_test(
            "Create Notification",
            "POST",
            "notifications/create",
            200,
            data={"message": "Test notification from chairman"},
            token=self.chairman_token
        )

        # Get notifications (chairman)
        success, response = self.run_test(
            "Get Notifications (Chairman)",
            "GET",
            "notifications",
            200,
            token=self.chairman_token
        )

        if success:
            print(f"✅ Chairman found {len(response)} notifications")

        # Get notifications (user)
        success, response = self.run_test(
            "Get Notifications (User)",
            "GET",
            "notifications",
            200,
            token=self.user_token
        )

        if success:
            print(f"✅ User found {len(response)} notifications")

        return True

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Society Maintenance API Tests")
        print(f"📍 Testing against: {self.base_url}")
        
        try:
            # Test authentication flows
            if not self.test_chairman_auth_flow():
                print("❌ Chairman authentication failed - stopping tests")
                return False
                
            if not self.test_user_auth_flow():
                print("❌ User authentication failed - stopping tests")
                return False

            # Test society management
            if not self.test_society_management():
                print("❌ Society management failed - stopping tests")
                return False

            # Test user interactions
            if not self.test_user_society_interaction():
                print("❌ User-society interaction failed - stopping tests")
                return False

            # Test payment flow
            if not self.test_payment_flow():
                print("❌ Payment flow failed - stopping tests")
                return False

            # Test member management
            if not self.test_member_management():
                print("❌ Member management failed - stopping tests")
                return False

            # Test notifications
            if not self.test_notifications():
                print("❌ Notifications failed - stopping tests")
                return False

            return True

        except Exception as e:
            print(f"❌ Unexpected error during testing: {str(e)}")
            return False

    def print_summary(self):
        """Print test summary"""
        print(f"\n{'='*50}")
        print(f"📊 TEST SUMMARY")
        print(f"{'='*50}")
        print(f"✅ Tests passed: {self.tests_passed}/{self.tests_run}")
        print(f"❌ Tests failed: {len(self.failed_tests)}")
        
        if self.failed_tests:
            print(f"\n🔍 FAILED TESTS:")
            for i, test in enumerate(self.failed_tests, 1):
                print(f"{i}. {test.get('test', 'Unknown')}")
                if 'error' in test:
                    print(f"   Error: {test['error']}")
                else:
                    print(f"   Expected: {test.get('expected')}, Got: {test.get('actual')}")
                    if test.get('response'):
                        print(f"   Response: {test['response']}")
        
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"\n🎯 Success Rate: {success_rate:.1f}%")
        
        return success_rate >= 80

def main():
    tester = SocietyMaintenanceAPITester()
    
    success = tester.run_all_tests()
    overall_success = tester.print_summary()
    
    return 0 if overall_success else 1

if __name__ == "__main__":
    sys.exit(main())
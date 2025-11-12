import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Building2, CreditCard, Bell, LogOut, Search, Download, User, IndianRupee } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const UserDashboard = ({ user, onLogout }) => {
  const [society, setSociety] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [userType, setUserType] = useState('owner');
  const [maintenance, setMaintenance] = useState(null);
  const [receipts, setReceipts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSearchDialog, setShowSearchDialog] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

  useEffect(() => {
    loadRazorpayScript();
    if (user.society_id) {
      loadData();
    } else {
      setShowSearchDialog(true);
    }
  }, []);

  const loadRazorpayScript = () => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => setRazorpayLoaded(true);
    document.body.appendChild(script);
  };

  const loadData = async () => {
    await Promise.all([
      loadSociety(),
      loadMaintenance(),
      loadReceipts(),
      loadNotifications()
    ]);
  };

  const loadSociety = async () => {
    try {
      const response = await axios.get(`${API}/society/${user.society_id}/details`);
      setSociety(response.data);
    } catch (error) {
      console.error('Failed to load society:', error);
    }
  };

  const loadMaintenance = async () => {
    try {
      const response = await axios.get(`${API}/user/maintenance`);
      setMaintenance(response.data);
    } catch (error) {
      console.error('Failed to load maintenance:', error);
    }
  };

  const loadReceipts = async () => {
    try {
      const response = await axios.get(`${API}/payment/receipts`);
      setReceipts(response.data);
    } catch (error) {
      console.error('Failed to load receipts:', error);
    }
  };

  const loadNotifications = async () => {
    try {
      const response = await axios.get(`${API}/notifications`);
      setNotifications(response.data);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  const handleSearchSociety = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const response = await axios.get(`${API}/society/search?query=${searchQuery}`);
      setSearchResults(response.data);
    } catch (error) {
      toast.error('Failed to search societies');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinSociety = async (societyId) => {
    setLoading(true);
    try {
      await axios.post(`${API}/society/${societyId}/join`, {
        user_type: userType
      });
      toast.success('Successfully joined society!');
      window.location.reload();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to join society');
    } finally {
      setLoading(false);
    }
  };

  const handlePayMaintenance = async () => {
    if (!maintenance) return;

    const currentMonth = new Date().toISOString().slice(0, 7);

    // Check if already paid this month
    const alreadyPaid = receipts.some(r => r.month === currentMonth);
    if (alreadyPaid) {
      toast.error('You have already paid for this month');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/payment/create-order`, {
        amount: maintenance.amount,
        month: currentMonth
      });

      // Mock payment mode
      if (response.data.mock_mode) {
        toast.info('MOCK Payment Mode - Simulating payment...');
        
        // Simulate payment process
        setTimeout(async () => {
          try {
            await axios.post(`${API}/payment/verify`, {
              razorpay_order_id: response.data.order_id,
              razorpay_payment_id: `pay_mock_${Date.now()}`,
              razorpay_signature: `sig_mock_${Date.now()}`
            });
            toast.success('Payment successful! (MOCK MODE)');
            await loadReceipts();
          } catch (error) {
            toast.error('Payment verification failed');
          }
        }, 1500);
        return;
      }

      // Real Razorpay integration
      if (!razorpayLoaded) {
        toast.error('Payment system is loading. Please try again.');
        return;
      }

      const options = {
        key: response.data.razorpay_key,
        amount: response.data.amount,
        currency: response.data.currency,
        order_id: response.data.order_id,
        name: society?.name || 'Society Maintenance',
        description: `Maintenance Payment - ${currentMonth}`,
        handler: async (razorpayResponse) => {
          try {
            await axios.post(`${API}/payment/verify`, {
              razorpay_order_id: razorpayResponse.razorpay_order_id,
              razorpay_payment_id: razorpayResponse.razorpay_payment_id,
              razorpay_signature: razorpayResponse.razorpay_signature
            });
            toast.success('Payment successful!');
            await loadReceipts();
          } catch (error) {
            toast.error('Payment verification failed');
          }
        },
        prefill: {
          name: user.name,
          contact: user.phone_number
        },
        theme: {
          color: '#2563eb'
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create payment order');
    } finally {
      setLoading(false);
    }
  };

  const downloadReceipt = (receipt) => {
    const receiptText = `
      PAYMENT RECEIPT
      ================
      
      Society: ${society?.name}
      Name: ${user.name}
      Phone: ${user.phone_number}
      
      Month: ${receipt.month}
      Amount: ₹${receipt.amount}
      Payment ID: ${receipt.razorpay_payment_id}
      Date: ${new Date(receipt.payment_date).toLocaleDateString()}
      
      Status: PAID
    `;

    const blob = new Blob([receiptText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `receipt-${receipt.month}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!user.society_id) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto">
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-4xl font-bold text-gray-900">Join Your Society</h1>
              <Button data-testid="logout-btn" variant="ghost" onClick={onLogout}>
                <LogOut className="w-5 h-5" />
              </Button>
            </div>

            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Search Society</CardTitle>
                <CardDescription>Find and join your residential society</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      data-testid="search-society-input"
                      placeholder="Enter society name"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearchSociety()}
                    />
                    <Button data-testid="search-btn" onClick={handleSearchSociety} disabled={loading}>
                      <Search className="w-5 h-5" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">I am a:</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        data-testid="owner-radio"
                        type="radio"
                        name="userType"
                        value="owner"
                        checked={userType === 'owner'}
                        onChange={(e) => setUserType(e.target.value)}
                        className="w-4 h-4"
                      />
                      <span>Owner</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        data-testid="tenant-radio"
                        type="radio"
                        name="userType"
                        value="tenant"
                        checked={userType === 'tenant'}
                        onChange={(e) => setUserType(e.target.value)}
                        className="w-4 h-4"
                      />
                      <span>Tenant</span>
                    </label>
                  </div>
                </div>

                {searchResults.length > 0 && (
                  <div className="space-y-3 mt-6">
                    <p className="text-sm font-medium">Search Results:</p>
                    {searchResults.map((society) => (
                      <div key={society.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg" data-testid="society-result">
                        <div>
                          <p className="font-semibold text-gray-900">{society.name}</p>
                          <p className="text-sm text-gray-600">{society.address}</p>
                        </div>
                        <Button 
                          data-testid="join-society-btn"
                          onClick={() => handleJoinSociety(society.id)}
                          disabled={loading}
                          size="sm"
                        >
                          Join
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const currentMonth = new Date().toISOString().slice(0, 7);
  const isPaidThisMonth = receipts.some(r => r.month === currentMonth);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50">
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{society?.name || 'Loading...'}</h1>
              <p className="text-sm text-gray-600">Welcome, {user.name}</p>
            </div>
            <Button data-testid="logout-btn" variant="ghost" onClick={onLogout}>
              <LogOut className="w-5 h-5 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard" data-testid="dashboard-tab">Dashboard</TabsTrigger>
            <TabsTrigger value="receipts" data-testid="receipts-tab">Receipts</TabsTrigger>
            <TabsTrigger value="notifications" data-testid="notifications-tab">Notifications</TabsTrigger>
            <TabsTrigger value="profile" data-testid="profile-tab">Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Maintenance</CardTitle>
                  <CardDescription>Your maintenance charges</CardDescription>
                </CardHeader>
                <CardContent>
                  {maintenance ? (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between p-6 bg-gradient-to-r from-blue-50 to-teal-50 rounded-xl">
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Amount Due</p>
                          <p className="text-4xl font-bold text-gray-900" data-testid="maintenance-amount">
                            ₹{maintenance.amount?.toLocaleString() || '0'}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            Type: <span className="font-medium capitalize">{maintenance.user_type}</span>
                          </p>
                        </div>
                        <IndianRupee className="w-16 h-16 text-blue-600 opacity-20" />
                      </div>

                      {isPaidThisMonth ? (
                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                          <p className="text-green-700 font-medium">✓ Paid for this month</p>
                        </div>
                      ) : (
                        <Button 
                          data-testid="pay-now-btn"
                          onClick={handlePayMaintenance}
                          disabled={loading || !maintenance.amount}
                          className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-700"
                        >
                          {loading ? 'Processing...' : 'Pay Now'}
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p>Loading maintenance details...</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Payment Summary</CardTitle>
                  <CardDescription>Your payment history</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm text-gray-600">Total Payments</p>
                        <p className="text-2xl font-bold" data-testid="total-payments-count">{receipts.length}</p>
                      </div>
                      <CreditCard className="w-10 h-10 text-gray-400" />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm text-gray-600">Total Paid</p>
                        <p className="text-2xl font-bold" data-testid="total-paid-amount">
                          ₹{receipts.reduce((sum, r) => sum + r.amount, 0).toLocaleString()}
                        </p>
                      </div>
                      <IndianRupee className="w-10 h-10 text-gray-400" />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm text-gray-600">Unread Notifications</p>
                        <p className="text-2xl font-bold" data-testid="unread-notifications">
                          {notifications.filter(n => !n.read_by?.includes(user.id)).length}
                        </p>
                      </div>
                      <Bell className="w-10 h-10 text-gray-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="receipts">
            <Card>
              <CardHeader>
                <CardTitle>Payment Receipts</CardTitle>
                <CardDescription>Download your payment receipts</CardDescription>
              </CardHeader>
              <CardContent>
                {receipts.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No receipts yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {receipts.map((receipt) => (
                      <div key={receipt.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg" data-testid="receipt-card">
                        <div>
                          <p className="font-semibold text-gray-900">Month: {receipt.month}</p>
                          <p className="text-sm text-gray-600">
                            {new Date(receipt.payment_date).toLocaleDateString()} • ₹{receipt.amount}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">ID: {receipt.razorpay_payment_id}</p>
                        </div>
                        <Button 
                          data-testid="download-receipt-btn"
                          size="sm" 
                          variant="outline"
                          onClick={() => downloadReceipt(receipt)}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>Updates from your society</CardDescription>
              </CardHeader>
              <CardContent>
                {notifications.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No notifications yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {notifications.map((notification) => (
                      <div 
                        key={notification.id} 
                        className={`p-4 rounded-lg border ${
                          notification.read_by?.includes(user.id) 
                            ? 'bg-gray-50 border-gray-200' 
                            : 'bg-blue-50 border-blue-200'
                        }`}
                        data-testid="notification-card"
                      >
                        <p className="text-gray-900">{notification.message}</p>
                        <p className="text-xs text-gray-500 mt-2">
                          {new Date(notification.created_at).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Your account details</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                    <User className="w-10 h-10 text-gray-400 mt-1" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-600">Name</p>
                      <p className="text-lg font-semibold" data-testid="profile-name">{user.name}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                    <Building2 className="w-10 h-10 text-gray-400 mt-1" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-600">Phone Number</p>
                      <p className="text-lg font-semibold" data-testid="profile-phone">{user.phone_number}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                    <Building2 className="w-10 h-10 text-gray-400 mt-1" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-600">Society</p>
                      <p className="text-lg font-semibold" data-testid="profile-society">{society?.name}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                    <User className="w-10 h-10 text-gray-400 mt-1" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-600">Member Type</p>
                      <p className="text-lg font-semibold capitalize" data-testid="profile-type">{user.user_type}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default UserDashboard;

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Building2, Users, CreditCard, Bell, LogOut, IndianRupee, Settings } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ChairmanDashboard = ({ user, onLogout }) => {
  const [society, setSociety] = useState(null);
  const [members, setMembers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateSociety, setShowCreateSociety] = useState(false);

  // Form states
  const [societyName, setSocietyName] = useState('');
  const [societyAddress, setSocietyAddress] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [bankIFSC, setBankIFSC] = useState('');
  const [bankName, setBankName] = useState('');
  const [ownerRate, setOwnerRate] = useState('');
  const [tenantRate, setTenantRate] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (user.society_id) {
      await Promise.all([
        loadSociety(),
        loadMembers(),
        loadPayments()
      ]);
    }
  };

  const loadSociety = async () => {
    try {
      const response = await axios.get(`${API}/society/${user.society_id}/details`);
      setSociety(response.data);
    } catch (error) {
      console.error('Failed to load society:', error);
    }
  };

  const loadMembers = async () => {
    try {
      const response = await axios.get(`${API}/society/${user.society_id}/members`);
      setMembers(response.data);
    } catch (error) {
      console.error('Failed to load members:', error);
    }
  };

  const loadPayments = async () => {
    try {
      const response = await axios.get(`${API}/society/${user.society_id}/payments`);
      setPayments(response.data);
    } catch (error) {
      console.error('Failed to load payments:', error);
    }
  };

  const handleCreateSociety = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API}/society/create`, {
        name: societyName,
        address: societyAddress
      });
      toast.success('Society created successfully!');
      window.location.reload();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create society');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBankDetails = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.put(`${API}/society/${society.id}/bank-details`, {
        bank_account_number: bankAccount,
        bank_ifsc: bankIFSC,
        bank_name: bankName
      });
      toast.success('Bank details updated successfully!');
      await loadSociety();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update bank details');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateMaintenanceRates = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.put(`${API}/society/${society.id}/maintenance-rates`, {
        owner_rate: parseFloat(ownerRate),
        tenant_rate: parseFloat(tenantRate)
      });
      toast.success('Maintenance rates updated successfully!');
      await loadSociety();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update maintenance rates');
    } finally {
      setLoading(false);
    }
  };

  const handleSendNotification = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API}/notifications/create`, {
        message: notificationMessage
      });
      toast.success('Notification sent to all members!');
      setNotificationMessage('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send notification');
    } finally {
      setLoading(false);
    }
  };

  if (!user.society_id) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto">
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-4xl font-bold text-gray-900">Create Your Society</h1>
              <Button data-testid="logout-btn" variant="ghost" onClick={onLogout}>
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Society Details</CardTitle>
                <CardDescription>Register your society to get started</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateSociety} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="society-name">Society Name</Label>
                    <Input
                      data-testid="society-name-input"
                      id="society-name"
                      value={societyName}
                      onChange={(e) => setSocietyName(e.target.value)}
                      placeholder="e.g., Green Valley Apartments"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="society-address">Address</Label>
                    <Input
                      data-testid="society-address-input"
                      id="society-address"
                      value={societyAddress}
                      onChange={(e) => setSocietyAddress(e.target.value)}
                      placeholder="Complete address"
                      required
                    />
                  </div>
                  <Button data-testid="create-society-btn" type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Creating...' : 'Create Society'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50">
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{society?.name || 'Loading...'}</h1>
              <p className="text-sm text-gray-600">Chairman Dashboard</p>
            </div>
            <Button data-testid="logout-btn" variant="ghost" onClick={onLogout}>
              <LogOut className="w-5 h-5 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Members</p>
                  <p className="text-2xl font-bold" data-testid="total-members">{members.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Payments</p>
                  <p className="text-2xl font-bold" data-testid="total-payments">{payments.filter(p => p.status === 'completed').length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <IndianRupee className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Collected</p>
                  <p className="text-2xl font-bold" data-testid="total-collected">
                    ₹{payments.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="settings" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="settings" data-testid="settings-tab">Settings</TabsTrigger>
            <TabsTrigger value="members" data-testid="members-tab">Members</TabsTrigger>
            <TabsTrigger value="payments" data-testid="payments-tab">Payments</TabsTrigger>
            <TabsTrigger value="notifications" data-testid="notifications-tab">Notifications</TabsTrigger>
          </TabsList>

          <TabsContent value="settings">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Bank Details</CardTitle>
                  <CardDescription>Update your society's bank account information</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleUpdateBankDetails} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Bank Name</Label>
                      <Input
                        data-testid="bank-name-input"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        placeholder={society?.bank_name || 'e.g., HDFC Bank'}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Account Number</Label>
                      <Input
                        data-testid="account-number-input"
                        value={bankAccount}
                        onChange={(e) => setBankAccount(e.target.value)}
                        placeholder={society?.bank_account_number || 'Enter account number'}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>IFSC Code</Label>
                      <Input
                        data-testid="ifsc-input"
                        value={bankIFSC}
                        onChange={(e) => setBankIFSC(e.target.value.toUpperCase())}
                        placeholder={society?.bank_ifsc || 'e.g., HDFC0001234'}
                      />
                    </div>
                    <Button data-testid="update-bank-btn" type="submit" className="w-full" disabled={loading}>
                      {loading ? 'Updating...' : 'Update Bank Details'}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Maintenance Rates</CardTitle>
                  <CardDescription>Set monthly maintenance charges</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleUpdateMaintenanceRates} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Owner Rate (₹/month)</Label>
                      <Input
                        data-testid="owner-rate-input"
                        type="number"
                        value={ownerRate}
                        onChange={(e) => setOwnerRate(e.target.value)}
                        placeholder={society?.owner_maintenance_rate?.toString() || 'e.g., 2000'}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tenant Rate (₹/month)</Label>
                      <Input
                        data-testid="tenant-rate-input"
                        type="number"
                        value={tenantRate}
                        onChange={(e) => setTenantRate(e.target.value)}
                        placeholder={society?.tenant_maintenance_rate?.toString() || 'e.g., 2500'}
                      />
                    </div>
                    <Button data-testid="update-rates-btn" type="submit" className="w-full" disabled={loading}>
                      {loading ? 'Updating...' : 'Update Rates'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="members">
            <Card>
              <CardHeader>
                <CardTitle>Society Members</CardTitle>
                <CardDescription>All registered members of your society</CardDescription>
              </CardHeader>
              <CardContent>
                {members.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No members yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {members.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg" data-testid="member-card">
                        <div>
                          <p className="font-semibold text-gray-900">{member.name}</p>
                          <p className="text-sm text-gray-600">{member.phone_number}</p>
                        </div>
                        <div className="text-right">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                            member.user_type === 'owner' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                          }`}>
                            {member.user_type === 'owner' ? 'Owner' : 'Tenant'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
                <CardDescription>All maintenance payments received</CardDescription>
              </CardHeader>
              <CardContent>
                {payments.filter(p => p.status === 'completed').length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No payments yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {payments.filter(p => p.status === 'completed').map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg" data-testid="payment-card">
                        <div>
                          <p className="font-semibold text-gray-900">{payment.user_name}</p>
                          <p className="text-sm text-gray-600">{payment.user_phone} • {payment.month}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">₹{payment.amount.toLocaleString()}</p>
                          <p className="text-xs text-gray-500">{new Date(payment.payment_date).toLocaleDateString()}</p>
                        </div>
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
                <CardTitle>Send Notification</CardTitle>
                <CardDescription>Broadcast a message to all society members</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSendNotification} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Message</Label>
                    <textarea
                      data-testid="notification-textarea"
                      className="w-full min-h-[120px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={notificationMessage}
                      onChange={(e) => setNotificationMessage(e.target.value)}
                      placeholder="Type your message here..."
                      required
                    />
                  </div>
                  <Button data-testid="send-notification-btn" type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Sending...' : 'Send Notification'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ChairmanDashboard;

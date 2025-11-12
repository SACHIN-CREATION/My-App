import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, Smartphone, Key } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AuthPage = ({ onLogin }) => {
  const { role } = useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (phoneNumber.length !== 10) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/send-otp`, { phone_number: phoneNumber });
      toast.success(`OTP sent! (Demo: ${response.data.otp})`);
      setStep(2);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Please enter your name');
      return;
    }
    if (otp.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/verify-otp`, {
        phone_number: phoneNumber,
        otp: otp,
        name: name,
        role: role
      });
      toast.success('Login successful!');
      onLogin(response.data.user, response.data.token);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to verify OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Button
          data-testid="back-btn"
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Button>

        <Card className="border-0 shadow-2xl">
          <CardHeader className="text-center pb-8">
            <CardTitle className="text-3xl font-bold">
              {role === 'chairman' ? 'Chairman' : 'Resident'} Login
            </CardTitle>
            <CardDescription className="text-base mt-2">
              {step === 1 ? 'Enter your phone number to receive OTP' : 'Enter the OTP sent to your phone'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 1 ? (
              <form onSubmit={handleSendOTP} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-base">Phone Number</Label>
                  <div className="relative">
                    <Smartphone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      data-testid="phone-input"
                      id="phone"
                      type="tel"
                      placeholder="10-digit mobile number"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      className="pl-12 h-12 text-base"
                      required
                    />
                  </div>
                </div>
                <Button 
                  data-testid="send-otp-btn"
                  type="submit" 
                  className="w-full h-12 text-base bg-blue-600 hover:bg-blue-700"
                  disabled={loading}
                >
                  {loading ? 'Sending...' : 'Send OTP'}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOTP} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-base">Full Name</Label>
                  <Input
                    data-testid="name-input"
                    id="name"
                    type="text"
                    placeholder="Enter your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-12 text-base"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="otp" className="text-base">OTP</Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      data-testid="otp-input"
                      id="otp"
                      type="text"
                      placeholder="6-digit OTP"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="pl-12 h-12 text-base tracking-widest"
                      required
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button 
                    data-testid="change-number-btn"
                    type="button" 
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="flex-1 h-12 text-base"
                  >
                    Change Number
                  </Button>
                  <Button 
                    data-testid="verify-otp-btn"
                    type="submit" 
                    className="flex-1 h-12 text-base bg-blue-600 hover:bg-blue-700"
                    disabled={loading}
                  >
                    {loading ? 'Verifying...' : 'Verify & Login'}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AuthPage;

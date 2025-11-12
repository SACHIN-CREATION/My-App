import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Building2, Users, CreditCard, Bell, Shield, TrendingUp } from 'lucide-react';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 rounded-full mb-6">
            <Building2 className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-600">Modern Society Management</span>
          </div>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 mb-6">
            Simplify Your<br />
            <span className="bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">
              Society Maintenance
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto mb-12">
            A complete solution for managing society payments, communications, and member records. 
            Transparent, efficient, and hassle-free.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              data-testid="chairman-login-btn"
              size="lg" 
              onClick={() => navigate('/auth/chairman')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-lg rounded-xl"
            >
              Chairman Login
            </Button>
            <Button 
              data-testid="resident-login-btn"
              size="lg" 
              variant="outline"
              onClick={() => navigate('/auth/user')}
              className="border-2 border-blue-600 text-blue-600 hover:bg-blue-50 px-8 py-6 text-lg rounded-xl"
            >
              Resident Login
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mt-24">
          <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow border border-gray-100">
            <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
              <Users className="w-7 h-7 text-blue-600" />
            </div>
            <h3 className="text-2xl font-semibold mb-3 text-gray-900">Member Management</h3>
            <p className="text-gray-600 leading-relaxed">
              Easily manage all society members, track owner and tenant details, and maintain comprehensive records.
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow border border-gray-100">
            <div className="w-14 h-14 bg-teal-100 rounded-xl flex items-center justify-center mb-6">
              <CreditCard className="w-7 h-7 text-teal-600" />
            </div>
            <h3 className="text-2xl font-semibold mb-3 text-gray-900">Online Payments</h3>
            <p className="text-gray-600 leading-relaxed">
              Secure payment gateway integration for hassle-free maintenance collection with instant receipts.
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow border border-gray-100">
            <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center mb-6">
              <Bell className="w-7 h-7 text-purple-600" />
            </div>
            <h3 className="text-2xl font-semibold mb-3 text-gray-900">Notifications</h3>
            <p className="text-gray-600 leading-relaxed">
              Send instant notifications to all members about important announcements and updates.
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow border border-gray-100">
            <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center mb-6">
              <Shield className="w-7 h-7 text-green-600" />
            </div>
            <h3 className="text-2xl font-semibold mb-3 text-gray-900">Secure & Transparent</h3>
            <p className="text-gray-600 leading-relaxed">
              Bank-grade security with complete transparency in all transactions and payment records.
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow border border-gray-100">
            <div className="w-14 h-14 bg-orange-100 rounded-xl flex items-center justify-center mb-6">
              <TrendingUp className="w-7 h-7 text-orange-600" />
            </div>
            <h3 className="text-2xl font-semibold mb-3 text-gray-900">Payment Reports</h3>
            <p className="text-gray-600 leading-relaxed">
              Comprehensive payment tracking and detailed reports for better financial management.
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow border border-gray-100">
            <div className="w-14 h-14 bg-pink-100 rounded-xl flex items-center justify-center mb-6">
              <Building2 className="w-7 h-7 text-pink-600" />
            </div>
            <h3 className="text-2xl font-semibold mb-3 text-gray-900">Society Dashboard</h3>
            <p className="text-gray-600 leading-relaxed">
              Centralized dashboard with all essential tools and information at your fingertips.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8 mt-24">
        <div className="container mx-auto px-4 text-center text-gray-600">
          <p>&copy; 2025 Society Maintenance App. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

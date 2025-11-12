import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import '@/App.css';

import LandingPage from '@/pages/LandingPage';
import AuthPage from '@/pages/AuthPage';
import ChairmanDashboard from '@/pages/ChairmanDashboard';
import UserDashboard from '@/pages/UserDashboard';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Axios interceptor for auth token
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const response = await axios.get(`${API}/auth/me`);
        setUser(response.data);
      } catch (error) {
        localStorage.removeItem('token');
      }
    }
    setLoading(false);
  };

  const handleLogin = (userData, token) => {
    localStorage.setItem('token', token);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    toast.success('Logged out successfully');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="App">
      <Toaster position="top-right" richColors />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={user ? <Navigate to={user.role === 'chairman' ? '/chairman/dashboard' : '/user/dashboard'} /> : <LandingPage />} />
          <Route path="/auth/:role" element={user ? <Navigate to={user.role === 'chairman' ? '/chairman/dashboard' : '/user/dashboard'} /> : <AuthPage onLogin={handleLogin} />} />
          <Route path="/chairman/dashboard" element={user && user.role === 'chairman' ? <ChairmanDashboard user={user} onLogout={handleLogout} /> : <Navigate to="/" />} />
          <Route path="/user/dashboard" element={user && user.role === 'user' ? <UserDashboard user={user} onLogout={handleLogout} /> : <Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;

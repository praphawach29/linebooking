/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { SaaSProvider } from './context/SaaSContext';
import { AuthProvider } from './context/AuthContext';
import { LiffLayout } from './components/liff/LiffLayout';
import { MerchantLayout } from './components/merchant/MerchantLayout';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { LineSimulator } from './components/line_simulator/LineSimulator';
import { MerchantLoginPage } from './components/auth/MerchantLoginPage';
import { MerchantRegisterPage } from './components/auth/MerchantRegisterPage';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

const AppLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans antialiased flex flex-col">
      <main className="flex-1 w-full">
        <Routes>
          {/* Public LIFF routes (customer-facing) */}
          <Route path="/" element={<LiffLayout />} />
          <Route path="/liff" element={<LiffLayout />} />
          <Route path="/liff/:tenantId" element={<LiffLayout />} />

          {/* Auth routes (public) */}
          <Route path="/merchant/login" element={<MerchantLoginPage />} />
          <Route path="/merchant/register" element={<MerchantRegisterPage />} />

          {/* Protected Merchant routes */}
          <Route
            path="/merchant/*"
            element={
              <ProtectedRoute requiredRole="merchant_admin" redirectTo="/merchant/login">
                <MerchantLayout />
              </ProtectedRoute>
            }
          />

          {/* Protected Admin routes */}
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute requiredRole="platform_admin" redirectTo="/merchant/login">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Dev/testing tools */}
          <Route path="/simulator/*" element={<LineSimulator />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <SaaSProvider>
        <BrowserRouter>
          <AppLayout />
        </BrowserRouter>
      </SaaSProvider>
    </AuthProvider>
  );
}

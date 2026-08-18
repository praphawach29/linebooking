/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SaaSProvider } from './context/SaaSContext';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

const SaaSLandingPage = lazy(() =>
  import('./components/landing/SaaSLandingPage').then((module) => ({ default: module.SaaSLandingPage }))
);
const LiffLayout = lazy(() =>
  import('./components/liff/LiffLayout').then((module) => ({ default: module.LiffLayout }))
);
const MerchantLayout = lazy(() =>
  import('./components/merchant/MerchantLayout').then((module) => ({ default: module.MerchantLayout }))
);
const AdminDashboard = lazy(() =>
  import('./components/admin/AdminDashboard').then((module) => ({ default: module.AdminDashboard }))
);
const LineSimulator = lazy(() =>
  import('./components/line_simulator/LineSimulator').then((module) => ({ default: module.LineSimulator }))
);
const MerchantLoginPage = lazy(() =>
  import('./components/auth/MerchantLoginPage').then((module) => ({ default: module.MerchantLoginPage }))
);
const MerchantRegisterPage = lazy(() =>
  import('./components/auth/MerchantRegisterPage').then((module) => ({ default: module.MerchantRegisterPage }))
);

const RouteFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-slate-50" aria-label="Loading">
    <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
  </div>
);

const AppLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans antialiased flex flex-col">
      <main className="flex-1 w-full">
        <Suspense fallback={<RouteFallback />}>
          <Routes>
          {/* Main SaaS Landing Page */}
          <Route path="/" element={<SaaSLandingPage />} />

          {/* Public LIFF routes (customer-facing) */}
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
        </Suspense>
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

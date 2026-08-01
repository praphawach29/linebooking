/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { SaaSProvider } from './context/SaaSContext';
import { HeaderNav } from './components/common/HeaderNav';
import { LiffLayout } from './components/liff/LiffLayout';
import { MerchantLayout } from './components/merchant/MerchantLayout';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { LineSimulator } from './components/line_simulator/LineSimulator';

const AppLayout: React.FC = () => {
  const location = useLocation();
  // We do not show the global SaaS Header in the Customer (LIFF) view
  const isLiff = location.pathname === '/' || location.pathname.startsWith('/liff');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased flex flex-col">
      {!isLiff && <HeaderNav />}
      <main className="flex-1 p-3 sm:p-6 max-w-7xl mx-auto w-full">
        <Routes>
          <Route path="/" element={<LiffLayout />} />
          <Route path="/liff" element={<LiffLayout />} />
          <Route path="/merchant/*" element={<MerchantLayout />} />
          <Route path="/admin/*" element={<AdminDashboard />} />
          <Route path="/simulator/*" element={<LineSimulator />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
};

export default function App() {
  return (
    <SaaSProvider>
      <BrowserRouter>
        <AppLayout />
      </BrowserRouter>
    </SaaSProvider>
  );
}


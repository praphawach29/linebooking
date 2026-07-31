/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { SaaSProvider, useSaaS } from './context/SaaSContext';
import { HeaderNav } from './components/common/HeaderNav';
import { LiffLayout } from './components/liff/LiffLayout';
import { MerchantLayout } from './components/merchant/MerchantLayout';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { LineSimulator } from './components/line_simulator/LineSimulator';

const MainAppContent: React.FC = () => {
  const { viewMode } = useSaaS();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased flex flex-col">
      <HeaderNav />
      <main className="flex-1 p-3 sm:p-6 max-w-7xl mx-auto w-full">
        {viewMode === 'liff' && <LiffLayout />}
        {viewMode === 'merchant' && <MerchantLayout />}
        {viewMode === 'admin' && <AdminDashboard />}
        {(viewMode === 'line_simulator' || (viewMode as any) === 'simulator') && <LineSimulator />}
      </main>
    </div>
  );
};

export default function App() {
  return (
    <SaaSProvider>
      <MainAppContent />
    </SaaSProvider>
  );
}


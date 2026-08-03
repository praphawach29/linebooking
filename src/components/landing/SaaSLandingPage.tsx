import React from 'react';
import { Navbar } from './Navbar';
import { HeroSection } from './HeroSection';
import { FeaturesSection } from './FeaturesSection';
import { ChatDemoSection } from './ChatDemoSection';
import { HowItWorksSection } from './HowItWorksSection';
import { PricingSection } from './PricingSection';
import { CtaSection } from './CtaSection';
import { Footer } from './Footer';

export const SaaSLandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 font-prompt text-slate-100 selection:bg-emerald-500 selection:text-white">
      <Navbar />
      <main>
        <HeroSection />
        <FeaturesSection />
        <ChatDemoSection />
        <HowItWorksSection />
        <PricingSection />
        <CtaSection />
      </main>
      <Footer />
    </div>
  );
};

export default SaaSLandingPage;

/**
 * Landing Page Component
 * v0-designed landing page with modern Tailwind UI
 */

import React from 'react';
import Navbar from '../../components/Navigation/Navbar';
import HeroSection from '../../components/Landing/HeroSection';
import FeaturesGrid from '../../components/Landing/FeaturesGrid';
import ValueProposition from '../../components/Landing/ValueProposition';
import CTASection from '../../components/Landing/CTASection';
import Footer from '../../components/Navigation/Footer';

function LandingPage() {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <FeaturesGrid />
      <ValueProposition />
      <CTASection />
      <Footer />
    </main>
  );
}

export default LandingPage;

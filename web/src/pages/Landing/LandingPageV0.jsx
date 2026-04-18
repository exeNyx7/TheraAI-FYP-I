import React from 'react'
import Navbar from '../../components/Navigation/Navbar'
import HeroSection from '../../components/Landing/HeroSection'
import StatsSection from '../../components/Landing/StatsSection'
import FeaturesGrid from '../../components/Landing/FeaturesGrid'
import HowItWorksSection from '../../components/Landing/HowItWorksSection'
import ValueProposition from '../../components/Landing/ValueProposition'
import CTASection from '../../components/Landing/CTASection'
import Footer from '../../components/Navigation/Footer'

function LandingPage() {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <StatsSection />
      <FeaturesGrid />
      <HowItWorksSection />
      <ValueProposition />
      <CTASection />
      <Footer />
    </main>
  )
}

export default LandingPage

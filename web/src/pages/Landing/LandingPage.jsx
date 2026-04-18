/**
 * Landing Page - TheraAI Welcome & Features
 * Modern landing page with purple gradient theme
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Heart, BookOpen, BarChart3, MessageSquare, Target, Shield,
  Sparkles, TrendingUp, Users, Lock, Zap, Award, ChevronRight,
  CheckCircle, Star, Brain, Activity
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import './LandingPage.css';

function LandingPage() {
  const navigate = useNavigate();

  const features = [
    {
      icon: BookOpen,
      title: 'Daily Diary',
      description: 'Express yourself freely with AI-powered insights and sentiment analysis',
      color: 'purple'
    },
    {
      icon: BarChart3,
      title: 'Mood Tracking',
      description: 'Visualize your emotional patterns and discover trends over time',
      color: 'blue'
    },
    {
      icon: MessageSquare,
      title: 'AI Wellness Companion',
      description: '24/7 support from your personal AI companion for emotional guidance',
      color: 'pink'
    },
    {
      icon: Target,
      title: 'Goal Setting',
      description: 'Set and achieve wellness goals with gamified progress tracking',
      color: 'green'
    },
    {
      icon: Brain,
      title: 'Mental Health Assessments',
      description: 'Professional-grade assessments (PHQ-9, GAD-7) with actionable insights',
      color: 'orange'
    },
    {
      icon: Shield,
      title: 'Privacy & Security',
      description: 'Your data is encrypted and secure. We prioritize your privacy always',
      color: 'indigo'
    }
  ];

  const benefits = [
    {
      emoji: '🎓',
      title: 'For Students',
      description: 'Manage academic stress, track mood patterns, and build healthy habits'
    },
    {
      emoji: '💼',
      title: 'For Professionals',
      description: 'Balance work-life stress, improve productivity, and maintain well-being'
    },
    {
      emoji: '💚',
      title: 'For Everyone',
      description: 'Whether seeking support or personal growth, TheraAI is here for you'
    }
  ];

  const steps = [
    {
      number: '01',
      title: 'Create Account',
      description: 'Sign up in seconds and choose your role'
    },
    {
      number: '02',
      title: 'Start Writing',
      description: 'Write your thoughts and track your mood'
    },
    {
      number: '03',
      title: 'Get Insights',
      description: 'Receive AI-powered insights and recommendations'
    },
    {
      number: '04',
      title: 'Grow & Thrive',
      description: 'Watch your progress and celebrate milestones'
    }
  ];

  const stats = [
    { value: '10K+', label: 'Active Users' },
    { value: '50K+', label: 'Diary Entries' },
    { value: '95%', label: 'Satisfaction Rate' },
    { value: '24/7', label: 'AI Support' }
  ];

  return (
    <div className="landing-page">
      {/* Navigation */}
      <nav className="landing-nav">
        <div className="nav-container">
          <div className="nav-logo">
            <Heart size={28} className="logo-icon" />
            <span className="logo-text">TheraAI</span>
          </div>
          <div className="nav-actions">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/login')}
              className="nav-button"
            >
              Sign In
            </Button>
            <Button 
              onClick={() => navigate('/signup')}
              className="nav-button-primary"
            >
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-background">
          <div className="hero-blob blob-1"></div>
          <div className="hero-blob blob-2"></div>
          <div className="hero-blob blob-3"></div>
        </div>
        
        <div className="hero-content">
          <div className="hero-badge">
            <Sparkles size={16} />
            <span>Your Personal Mental Wellness Platform</span>
          </div>
          
          <h1 className="hero-title">
            Take Control of Your
            <span className="gradient-text"> Mental Wellness</span>
          </h1>
          
          <p className="hero-subtitle">
            Write, track, and grow with AI-powered insights. 
            Join thousands who are improving their mental health every day.
          </p>
          
          <div className="hero-cta">
            <Button 
              size="lg" 
              onClick={() => navigate('/signup')}
              className="cta-primary"
            >
              Start Your Journey
              <ChevronRight size={20} />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => navigate('/login')}
              className="cta-secondary"
            >
              Sign In
            </Button>
          </div>

          <div className="hero-stats">
            {stats.map((stat, idx) => (
              <div key={idx} className="stat-item">
                <div className="stat-value">{stat.value}</div>
                <div className="stat-label">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="section-container">
          <div className="section-header">
            <div className="section-badge">
              <Star size={16} />
              <span>Features</span>
            </div>
            <h2 className="section-title">Everything You Need for Mental Wellness</h2>
            <p className="section-subtitle">
              Powerful tools designed to support your journey to better mental health
            </p>
          </div>

          <div className="features-grid">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div key={idx} className={`feature-card feature-${feature.color}`}>
                  <div className="feature-icon-wrapper">
                    <Icon size={28} />
                  </div>
                  <h3 className="feature-title">{feature.title}</h3>
                  <p className="feature-description">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works-section">
        <div className="section-container">
          <div className="section-header">
            <div className="section-badge">
              <Zap size={16} />
              <span>How It Works</span>
            </div>
            <h2 className="section-title">Get Started in Minutes</h2>
            <p className="section-subtitle">
              Simple, intuitive, and designed for everyone
            </p>
          </div>

          <div className="steps-grid">
            {steps.map((step, idx) => (
              <div key={idx} className="step-card">
                <div className="step-number">{step.number}</div>
                <h3 className="step-title">{step.title}</h3>
                <p className="step-description">{step.description}</p>
                {idx < steps.length - 1 && (
                  <ChevronRight className="step-arrow" size={24} />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="benefits-section">
        <div className="section-container">
          <div className="section-header">
            <div className="section-badge">
              <Users size={16} />
              <span>For Everyone</span>
            </div>
            <h2 className="section-title">Built for Your Unique Journey</h2>
          </div>

          <div className="benefits-grid">
            {benefits.map((benefit, idx) => (
              <div key={idx} className="benefit-card">
                <div className="benefit-emoji">{benefit.emoji}</div>
                <h3 className="benefit-title">{benefit.title}</h3>
                <p className="benefit-description">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose TheraAI */}
      <section className="why-section">
        <div className="section-container">
          <div className="why-content">
            <div className="why-text">
              <h2 className="why-title">Why Choose TheraAI?</h2>
              <div className="why-features">
                <div className="why-feature">
                  <CheckCircle size={24} className="check-icon" />
                  <div>
                    <h4>Evidence-Based Approach</h4>
                    <p>Built on proven mental health frameworks and research</p>
                  </div>
                </div>
                <div className="why-feature">
                  <CheckCircle size={24} className="check-icon" />
                  <div>
                    <h4>Privacy First</h4>
                    <p>Your data is encrypted and never shared without consent</p>
                  </div>
                </div>
                <div className="why-feature">
                  <CheckCircle size={24} className="check-icon" />
                  <div>
                    <h4>Professional Support</h4>
                    <p>Connect with licensed therapists when you need them</p>
                  </div>
                </div>
                <div className="why-feature">
                  <CheckCircle size={24} className="check-icon" />
                  <div>
                    <h4>Always Improving</h4>
                    <p>Regular updates based on user feedback and research</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="why-visual">
              <div className="visual-card">
                <Activity size={64} className="visual-icon" />
                <div className="visual-stat">
                  <TrendingUp size={20} />
                  <span>Mental Health Improvement</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-container">
          <div className="cta-content">
            <h2 className="cta-title">Ready to Start Your Wellness Journey?</h2>
            <p className="cta-subtitle">
              Join thousands of people who are taking control of their mental health
            </p>
            <div className="cta-buttons">
              <Button 
                size="lg" 
                onClick={() => navigate('/signup')}
                className="cta-button-primary"
              >
                <Sparkles size={20} />
                Create Free Account
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                onClick={() => navigate('/login')}
                className="cta-button-secondary"
              >
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-container">
          <div className="footer-brand">
            <div className="footer-logo">
              <Heart size={24} />
              <span>TheraAI</span>
            </div>
            <p className="footer-tagline">
              Empowering mental wellness through technology
            </p>
          </div>
          
          <div className="footer-links">
            <div className="footer-column">
              <h4>Product</h4>
              <a href="#features">Features</a>
              <a href="#pricing">Pricing</a>
              <a href="#faq">FAQ</a>
            </div>
            <div className="footer-column">
              <h4>Company</h4>
              <a href="#about">About Us</a>
              <a href="#contact">Contact</a>
              <a href="#careers">Careers</a>
            </div>
            <div className="footer-column">
              <h4>Legal</h4>
              <a href="#privacy">Privacy Policy</a>
              <a href="#terms">Terms of Service</a>
              <a href="#security">Security</a>
            </div>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>© 2025 TheraAI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;

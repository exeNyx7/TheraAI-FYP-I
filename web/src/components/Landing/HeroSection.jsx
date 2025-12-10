import { Button } from "../ui/button"
import { Link } from "react-router-dom"
import { ArrowRight, Sparkles } from "lucide-react"

export default function HeroSection() {
  return (
    <section className="relative w-full overflow-hidden py-20 sm:py-32 md:py-40 lg:py-48">
      {/* Animated gradient background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-20 right-0 h-96 w-96 rounded-full bg-gradient-to-br from-primary/15 to-transparent blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 left-1/4 h-96 w-96 rounded-full bg-gradient-to-br from-accent/10 to-transparent blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center text-center gap-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/5">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">AI-Powered Mental Health Platform</span>
          </div>

          {/* Headline */}
          <div className="space-y-6 max-w-3xl">
            <h1
              className="text-5xl sm:text-6xl md:text-7xl font-bold leading-tight text-pretty bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70"
              style={{ fontFamily: "Montserrat" }}
            >
              Your Mental Health Companion
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed text-pretty max-w-2xl mx-auto">
              24/7 AI support, mood tracking, evidence-based assessments, and seamless therapist connection—all in one
              secure, private platform designed for your wellbeing.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <Link to="/signup">
              <Button
                size="lg"
                className="bg-primary hover:bg-primary/90 text-base px-8 h-12 gap-2 shadow-lg hover:shadow-xl transition-all"
              >
                Start Free Today
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/login">
              <Button
                size="lg"
                variant="outline"
                className="text-base px-8 h-12 border-primary/30 hover:bg-primary/5 bg-transparent"
              >
                Sign In
              </Button>
            </Link>
          </div>

          {/* Trust indicator */}
          <div className="pt-4 space-y-2">
            <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
              <span>✓ No credit card required</span>
              <span className="text-border">|</span>
              <span>✓ Free core features</span>
            </div>
            <p className="text-xs text-muted-foreground">Trusted by thousands of users worldwide</p>
          </div>
        </div>
      </div>
    </section>
  )
}

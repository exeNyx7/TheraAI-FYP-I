import { Button } from "../ui/button"
import { Link } from "react-router-dom"
import { ArrowRight, Sparkles } from "lucide-react"

export default function CTASection() {
  return (
    <section className="w-full py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl overflow-hidden">
          {/* Gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-primary/70" />

          {/* Decorative blobs */}
          <div className="absolute top-0 right-0 h-64 w-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 h-48 w-48 bg-white/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
          <div className="absolute inset-0 opacity-5" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '24px 24px',
          }} />

          {/* Content */}
          <div className="relative flex flex-col items-center text-center gap-8 px-6 py-16 sm:px-12 sm:py-20">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 border border-white/25 text-white text-sm font-medium">
              <Sparkles className="h-3.5 w-3.5" />
              Start your journey today — it's free
            </div>

            <div className="space-y-4 max-w-2xl">
              <h2
                className="text-4xl sm:text-5xl font-bold leading-tight text-white"
                style={{ fontFamily: "Montserrat" }}
              >
                Take the first step toward better mental health
              </h2>
              <p className="text-lg text-white/80 leading-relaxed">
                Join thousands of people who are already using TheraAI to understand themselves better,
                build healthy habits, and connect with professional support when they need it.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link to="/signup">
                <Button
                  size="lg"
                  className="bg-white text-primary hover:bg-white/90 text-base px-8 h-12 gap-2 font-semibold shadow-xl w-full sm:w-auto"
                >
                  Create Free Account
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/login">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/40 text-white hover:bg-white/10 hover:text-white bg-transparent text-base px-8 h-12 w-full sm:w-auto"
                >
                  I Already Have an Account
                </Button>
              </Link>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-white/70">
              <span>✓ No credit card required</span>
              <span>✓ Free forever for core features</span>
              <span>✓ Cancel anytime</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

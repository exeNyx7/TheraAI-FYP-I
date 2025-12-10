import { Button } from "../ui/button"
import { Link } from "react-router-dom"
import { ArrowRight } from "lucide-react"

export default function CTASection() {
  return (
    <section className="w-full py-16 sm:py-24 md:py-32 border-t border-border">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl bg-gradient-to-r from-primary/10 via-accent/5 to-primary/10 border border-primary/20 overflow-hidden">
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-0 right-0 h-40 w-40 bg-primary/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 h-40 w-40 bg-accent/10 rounded-full blur-3xl"></div>
          </div>

          <div className="flex flex-col items-center text-center gap-8 p-8 sm:p-12 md:p-16">
            <div className="space-y-4">
              <h2 className="text-4xl sm:text-5xl font-bold leading-tight" style={{ fontFamily: "Montserrat" }}>
                Ready to Transform Your Mental Health?
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
                Join thousands taking control of their wellbeing. Begin your personalized support experience
                today—completely free.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link to="/signup">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-base px-8 h-12 gap-2 shadow-lg">
                  Get Started Now
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline" className="text-base px-8 h-12 border-primary/30 bg-transparent">
                  Already Signed Up? Login
                </Button>
              </Link>
            </div>

            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground pt-4">
              <span>✓ No credit card needed</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

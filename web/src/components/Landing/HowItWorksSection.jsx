import { UserPlus, BarChart2, Calendar } from "lucide-react"
import { Link } from "react-router-dom"
import { Button } from "../ui/button"
import { ArrowRight } from "lucide-react"

const steps = [
  {
    number: "01",
    icon: UserPlus,
    title: "Sign Up & Personalise",
    description:
      "Create your free account in under a minute. Complete a brief onboarding quiz so TheraAI can tailor your experience — language, goals, and support preferences.",
    detail: "No credit card. Instant access.",
  },
  {
    number: "02",
    icon: BarChart2,
    title: "Track, Journal & Chat",
    description:
      "Log your mood daily, write in your private journal, and take clinical assessments. Chat with your AI companion whenever you need a listening ear.",
    detail: "AI-powered insights surface after just a few days.",
  },
  {
    number: "03",
    icon: Calendar,
    title: "Connect with a Therapist",
    description:
      "When you're ready for professional support, browse licensed therapists, view their profiles and availability, and book a video session directly in-app.",
    detail: "Your AI data is shared with your therapist only with your consent.",
  },
]

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="w-full py-20 sm:py-28 bg-gradient-to-b from-transparent via-primary/3 to-transparent">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="space-y-14">
          {/* Header */}
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-xs font-medium text-primary">
              Simple to get started
            </div>
            <h2
              className="text-4xl sm:text-5xl font-bold leading-tight"
              style={{ fontFamily: "Montserrat" }}
            >
              How It Works
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              From sign-up to your first therapy session in three simple steps.
            </p>
          </div>

          {/* Steps */}
          <div className="relative">
            {/* Connecting line (desktop) */}
            <div className="hidden lg:block absolute top-12 left-[calc(16.67%+2rem)] right-[calc(16.67%+2rem)] h-px bg-gradient-to-r from-transparent via-border to-transparent" />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-6">
              {steps.map((step, i) => {
                const Icon = step.icon
                return (
                  <div key={i} className="relative flex flex-col items-center lg:items-start text-center lg:text-left gap-5">
                    {/* Step number + icon */}
                    <div className="relative flex-shrink-0">
                      <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 flex items-center justify-center">
                        <Icon className="h-7 w-7 text-primary" />
                      </div>
                      <div className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold shadow-md">
                        {i + 1}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold" style={{ fontFamily: "Montserrat" }}>
                        {step.title}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                      <p className="text-xs text-primary font-medium">{step.detail}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* CTA */}
          <div className="flex justify-center">
            <Link to="/signup">
              <Button size="lg" className="bg-primary hover:bg-primary/90 px-8 h-12 gap-2 shadow-lg">
                Start Your Journey
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

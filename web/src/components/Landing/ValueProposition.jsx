import { CheckCircle2 } from "lucide-react"

export default function ValueProposition() {
  const benefits = [
    {
      title: "Always Available",
      description: "Get support whenever you need it, 24/7. Your AI companion is always ready to listen and help.",
    },
    {
      title: "Evidence-Based",
      description: "Built on proven psychological principles and modern AI technology to provide effective support.",
    },
    {
      title: "Professional Integration",
      description: "Seamlessly connect with licensed therapists for comprehensive mental health care.",
    },
    {
      title: "Completely Private",
      description: "Your conversations and data are fully encrypted and never shared without your consent.",
    },
  ]

  return (
    <section className="w-full py-16 sm:py-24 md:py-32 bg-gradient-to-b from-transparent to-primary/5">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          {/* Left side - Benefits */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h2 className="text-4xl sm:text-5xl font-bold leading-tight" style={{ fontFamily: "Montserrat" }}>
                Why Choose Thera-AI?
              </h2>
              <p className="text-lg text-muted-foreground">
                We're redefining mental health support with technology, compassion, and accessibility.
              </p>
            </div>

            <div className="space-y-4">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex gap-4 group">
                  <div className="flex-shrink-0 mt-1">
                    <CheckCircle2 className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-semibold text-foreground">{benefit.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{benefit.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right side - Visual highlight */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-transparent rounded-3xl blur-2xl"></div>
            <div className="relative bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/10 rounded-3xl p-8 sm:p-12 text-center space-y-6">
              <div className="space-y-4">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20">
                  <span className="text-4xl">🧠</span>
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold" style={{ fontFamily: "Montserrat" }}>
                    Mental Health
                  </h3>
                  <p className="text-lg text-muted-foreground">Redefined for Everyone</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
                Accessible, effective, and compassionate support when and where you need it most.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

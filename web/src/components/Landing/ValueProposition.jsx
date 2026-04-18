import { CheckCircle2, Brain, TrendingUp, Calendar, BookOpen } from "lucide-react"

const benefits = [
  {
    title: "Always Available — Day or Night",
    description: "Your AI companion never sleeps. Get support at 3 AM when it matters most, without waiting for an appointment.",
  },
  {
    title: "Evidence-Based Approach",
    description: "Built on validated clinical tools — PHQ-9, GAD-7, PSS-10 and more — combined with modern AI to give you real insight.",
  },
  {
    title: "Seamless Therapist Integration",
    description: "AI data flows into your therapist's dashboard (with your consent), so every session starts informed, not from scratch.",
  },
  {
    title: "Progress You Can See",
    description: "Mood heatmaps, streak tracking, achievement badges, and weekly AI summaries show you how far you've come.",
  },
]

function MiniDashboardPreview() {
  return (
    <div className="relative rounded-2xl border border-border/60 bg-card shadow-xl overflow-hidden p-5 space-y-4">
      {/* Top row */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <p className="text-xs text-muted-foreground">Your progress</p>
          <p className="text-sm font-semibold">This month</p>
        </div>
        <div className="text-2xl font-bold text-primary" style={{ fontFamily: "Montserrat" }}>Level 3</div>
      </div>

      {/* XP progress bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>XP Progress</span>
          <span>750 / 1000 XP</span>
        </div>
        <div className="h-2.5 rounded-full bg-muted overflow-hidden">
          <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-primary to-primary/70" />
        </div>
      </div>

      {/* Achievement row */}
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground font-medium">Recent achievements</p>
        <div className="flex gap-2 flex-wrap">
          {[
            { icon: "📔", label: "First Entry" },
            { icon: "🔥", label: "7-Day Streak" },
            { icon: "🧠", label: "Self-Aware" },
            { icon: "😊", label: "Mood Mapper" },
          ].map((a) => (
            <div key={a.label} className="flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-medium px-2 py-1 rounded-lg">
              <span>{a.icon}</span>
              <span>{a.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Mini stats */}
      <div className="grid grid-cols-3 gap-3 pt-1">
        {[
          { icon: BookOpen, value: "12", label: "Journals" },
          { icon: TrendingUp, value: "21", label: "Moods" },
          { icon: Calendar, value: "2", label: "Sessions" },
        ].map(({ icon: Icon, value, label }) => (
          <div key={label} className="flex flex-col items-center gap-1 p-2.5 rounded-xl bg-muted/50">
            <Icon className="h-4 w-4 text-primary" />
            <span className="text-base font-bold" style={{ fontFamily: "Montserrat" }}>{value}</span>
            <span className="text-[10px] text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>

      {/* AI insight strip */}
      <div className="flex items-start gap-2.5 bg-primary/8 border border-primary/15 rounded-xl p-3">
        <Brain className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
        <p className="text-xs text-foreground leading-relaxed">
          <span className="font-semibold">AI insight:</span> Your mood improved by 24% this week. Keep up the journaling habit!
        </p>
      </div>
    </div>
  )
}

export default function ValueProposition() {
  return (
    <section id="why-us" className="w-full py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-20 items-center">

          {/* Left: Benefits */}
          <div className="space-y-10">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-xs font-medium text-primary">
                Why thousands choose TheraAI
              </div>
              <h2
                className="text-4xl sm:text-5xl font-bold leading-tight"
                style={{ fontFamily: "Montserrat" }}
              >
                Why Choose{" "}
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
                  TheraAI?
                </span>
              </h2>
              <p className="text-lg text-muted-foreground">
                We're redefining mental health support — making it accessible, continuous, and connected.
              </p>
            </div>

            <div className="space-y-5">
              {benefits.map((benefit, i) => (
                <div key={i} className="flex gap-4 group">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="h-6 w-6 rounded-full bg-primary/15 flex items-center justify-center group-hover:bg-primary/25 transition-colors">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-semibold text-foreground text-sm">{benefit.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{benefit.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Mini dashboard */}
          <div className="relative">
            <div className="absolute -inset-6 bg-gradient-to-br from-primary/10 to-accent/5 rounded-3xl blur-2xl -z-10" />
            <MiniDashboardPreview />
          </div>
        </div>
      </div>
    </section>
  )
}

import { MessageSquare, TrendingUp, ClipboardList, Users, ShieldCheck, Lightbulb, BookOpen, Award, Video } from "lucide-react"

const features = [
  {
    title: "AI Chat Companion",
    description: "Talk to a Llama 3.1-powered AI companion available 24/7. It listens, remembers your context, and provides evidence-informed support.",
    icon: MessageSquare,
    gradient: "from-violet-500/20 to-purple-500/10",
    iconColor: "text-violet-500",
  },
  {
    title: "Mood Tracking",
    description: "Log your mood daily and watch patterns emerge. Visual heatmaps and weekly summaries help you understand your emotional landscape.",
    icon: TrendingUp,
    gradient: "from-blue-500/20 to-cyan-500/10",
    iconColor: "text-blue-500",
  },
  {
    title: "Clinical Assessments",
    description: "Complete validated tools including PHQ-9, GAD-7, PSS-10, PCL-5, DASS-21 and more — with instant AI-generated recommendations.",
    icon: ClipboardList,
    gradient: "from-emerald-500/20 to-teal-500/10",
    iconColor: "text-emerald-500",
  },
  {
    title: "Therapist Connection",
    description: "Browse licensed psychiatrists, view profiles, check availability, and book video sessions — all from within the app.",
    icon: Video,
    gradient: "from-orange-500/20 to-amber-500/10",
    iconColor: "text-orange-500",
  },
  {
    title: "Journal & Insights",
    description: "Write freely in your private journal. Our AI analyzes sentiment and emotions to surface patterns you might have missed.",
    icon: BookOpen,
    gradient: "from-pink-500/20 to-rose-500/10",
    iconColor: "text-pink-500",
  },
  {
    title: "Gamified Progress",
    description: "Earn XP, unlock achievements, and maintain streaks. Staying consistent with your mental health goals has never felt more rewarding.",
    icon: Award,
    gradient: "from-yellow-500/20 to-orange-500/10",
    iconColor: "text-yellow-600",
  },
  {
    title: "Therapist Dashboard",
    description: "Psychiatrists get a full clinical view: patient briefings, session notes, SOAP templates, treatment plans and crisis alerts.",
    icon: Users,
    gradient: "from-indigo-500/20 to-blue-500/10",
    iconColor: "text-indigo-500",
  },
  {
    title: "Personalized Insights",
    description: "AI-generated weekly mood summaries, early-warning crisis detection, and tailored recommendations based on your progress.",
    icon: Lightbulb,
    gradient: "from-amber-500/20 to-yellow-500/10",
    iconColor: "text-amber-500",
  },
  {
    title: "Privacy & Security",
    description: "JWT-secured sessions, role-based access control, and encrypted data storage. Your mental health information stays yours.",
    icon: ShieldCheck,
    gradient: "from-green-500/20 to-emerald-500/10",
    iconColor: "text-green-500",
  },
]

export default function FeaturesGrid() {
  return (
    <section id="features" className="w-full py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="space-y-14">
          {/* Section header */}
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-xs font-medium text-primary">
              Everything in one place
            </div>
            <h2
              className="text-4xl sm:text-5xl font-bold leading-tight"
              style={{ fontFamily: "Montserrat" }}
            >
              Everything You Need
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              From daily mood check-ins to full teletherapy sessions — TheraAI covers your entire mental health journey.
            </p>
          </div>

          {/* Features grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feature) => {
              const Icon = feature.icon
              return (
                <div
                  key={feature.title}
                  className="group relative p-6 rounded-2xl border border-border/60 bg-card hover:border-primary/40 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 overflow-hidden"
                >
                  {/* Subtle gradient background on hover */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl`} />

                  <div className="relative space-y-3">
                    <div className={`inline-flex p-2.5 rounded-xl bg-gradient-to-br ${feature.gradient}`}>
                      <Icon className={`h-5 w-5 ${feature.iconColor}`} />
                    </div>
                    <h3 className="font-semibold text-foreground" style={{ fontFamily: "Montserrat" }}>
                      {feature.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

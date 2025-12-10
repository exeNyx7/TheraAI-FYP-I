import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { MessageSquare, TrendingUp, Gamepad2, Users, Lock, Lightbulb } from "lucide-react"

const features = [
  {
    title: "AI Chatbot Support",
    description:
      "Chat with our intelligent AI companion for immediate mental health support, guidance, and conversations tailored to your needs.",
    icon: MessageSquare,
  },
  {
    title: "Mood Tracking",
    description:
      "Monitor your emotional patterns over time with intuitive tracking and gain meaningful insights into your wellbeing journey.",
    icon: TrendingUp,
  },
  {
    title: "Gamified Assessments",
    description:
      "Complete engaging, interactive assessments to understand your mental health with evidence-based psychological tools.",
    icon: Gamepad2,
  },
  {
    title: "Therapist Connection",
    description:
      "Seamlessly connect with licensed mental health professionals for personalized therapy and professional guidance.",
    icon: Users,
  },
  {
    title: "Privacy & Security",
    description:
      "Your data is encrypted with enterprise-grade security. Your privacy and confidentiality are our absolute top priority.",
    icon: Lock,
  },
  {
    title: "Personalized Insights",
    description: "Get AI-powered recommendations and insights based on your unique mental health journey and progress.",
    icon: Lightbulb,
  },
]

export default function FeaturesGrid() {
  return (
    <section className="w-full py-16 sm:py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="space-y-12">
          {/* Section Header */}
          <div className="space-y-4 text-center max-w-2xl mx-auto">
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold" style={{ fontFamily: "Montserrat" }}>
              Everything You Need
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Comprehensive tools designed to support your mental health journey
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => {
              const Icon = feature.icon
              return (
                <Card
                  key={feature.title}
                  className="group border border-border/50 bg-card/30 hover:border-primary/50 hover:bg-card/70 transition-all duration-300 overflow-hidden"
                >
                  <CardHeader className="relative">
                    <div className="inline-flex p-3 rounded-lg bg-muted/50 group-hover:bg-primary/20 transition-colors w-fit mb-4">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle style={{ fontFamily: "Montserrat" }}>{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="relative">
                    <CardDescription className="text-base leading-relaxed">{feature.description}</CardDescription>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

import { Button } from "../ui/button"
import { Link } from "react-router-dom"
import { ArrowRight, Sparkles, MessageCircle, TrendingUp, Brain } from "lucide-react"

function AppPreview() {
  return (
    <div className="relative w-full max-w-sm mx-auto lg:max-w-none">
      {/* Glow behind the card */}
      <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 via-primary/10 to-accent/20 rounded-3xl blur-2xl" />

      {/* Browser-style card */}
      <div className="relative rounded-2xl border border-border/60 bg-card shadow-2xl overflow-hidden">
        {/* Browser chrome */}
        <div className="flex items-center gap-1.5 px-4 py-3 bg-muted/50 border-b border-border/50">
          <div className="h-3 w-3 rounded-full bg-red-400/70" />
          <div className="h-3 w-3 rounded-full bg-yellow-400/70" />
          <div className="h-3 w-3 rounded-full bg-green-400/70" />
          <div className="ml-3 flex-1 h-5 rounded-md bg-background/70 flex items-center px-3">
            <span className="text-[10px] text-muted-foreground">theraai.app/dashboard</span>
          </div>
        </div>

        {/* App content mockup */}
        <div className="p-4 space-y-3 bg-background">
          {/* Header row */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Good morning,</p>
              <p className="text-sm font-semibold">Sarah ✨</p>
            </div>
            <div className="flex items-center gap-1.5 bg-orange-500/10 text-orange-500 text-xs font-medium px-2.5 py-1 rounded-full">
              <span>🔥</span> 7-day streak
            </div>
          </div>

          {/* Mood trend mini chart */}
          <div className="bg-muted/40 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">This week's mood</span>
              <span className="text-xs text-primary font-semibold">↑ Improving</span>
            </div>
            <div className="flex items-end gap-1 h-10">
              {[3, 4, 3, 5, 4, 6, 7].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-sm bg-primary/30"
                  style={{ height: `${h * 14}%`, minHeight: 4,
                    background: i === 6 ? "hsl(var(--primary))" : undefined,
                    opacity: i === 6 ? 1 : 0.4 + i * 0.07 }}
                />
              ))}
            </div>
            <div className="flex justify-between text-[9px] text-muted-foreground">
              {["M","T","W","T","F","S","S"].map((d,i) => <span key={i}>{d}</span>)}
            </div>
          </div>

          {/* AI Chat bubble */}
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <div className="h-6 w-6 rounded-full bg-gradient-to-br from-primary to-primary/60 flex-shrink-0 flex items-center justify-center">
                <Brain className="h-3 w-3 text-white" />
              </div>
              <div className="bg-muted/50 rounded-xl rounded-tl-sm px-3 py-2 text-xs text-foreground max-w-[80%]">
                How are you feeling today, Sarah?
              </div>
            </div>
            <div className="flex justify-end">
              <div className="bg-primary text-primary-foreground rounded-xl rounded-tr-sm px-3 py-2 text-xs max-w-[75%]">
                Much better! The breathing exercises helped 😊
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            {[
              { icon: "📔", label: "Journal" },
              { icon: "😊", label: "Mood" },
              { icon: "📋", label: "Assess" },
            ].map((a) => (
              <div key={a.label} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-muted/40 hover:bg-primary/10 transition-colors cursor-pointer">
                <span className="text-base">{a.icon}</span>
                <span className="text-[9px] text-muted-foreground font-medium">{a.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating badge cards */}
      <div className="absolute -left-6 top-1/3 hidden lg:flex items-center gap-2 bg-card border border-border/60 rounded-xl px-3 py-2 shadow-lg">
        <TrendingUp className="h-4 w-4 text-green-500" />
        <div>
          <p className="text-[10px] text-muted-foreground">Mood score</p>
          <p className="text-xs font-bold text-green-500">+24% this week</p>
        </div>
      </div>

      <div className="absolute -right-4 bottom-16 hidden lg:flex items-center gap-2 bg-card border border-border/60 rounded-xl px-3 py-2 shadow-lg">
        <MessageCircle className="h-4 w-4 text-primary" />
        <div>
          <p className="text-[10px] text-muted-foreground">AI support</p>
          <p className="text-xs font-bold">Available 24/7</p>
        </div>
      </div>
    </div>
  )
}

export default function HeroSection() {
  return (
    <section className="relative w-full overflow-hidden pt-16 pb-20 sm:pt-20 sm:pb-28 lg:pt-28 lg:pb-36">
      {/* Background blobs */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 right-1/4 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-primary/12 to-transparent blur-3xl" />
        <div className="absolute bottom-0 left-0 h-[400px] w-[400px] rounded-full bg-gradient-to-tr from-primary/8 to-transparent blur-3xl" />
        <div className="absolute top-1/3 left-1/2 h-[300px] w-[300px] rounded-full bg-gradient-to-br from-accent/6 to-transparent blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          {/* Left: Text content */}
          <div className="flex flex-col gap-7 text-center lg:text-left">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/25 bg-primary/8 text-sm font-medium text-primary self-center lg:self-start">
              <Sparkles className="h-3.5 w-3.5" />
              AI-Powered Mental Health Platform
            </div>

            {/* Headline */}
            <div className="space-y-4">
              <h1
                className="text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.1] tracking-tight"
                style={{ fontFamily: "Montserrat" }}
              >
                Your mental health{" "}
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
                  companion
                </span>
                , always here
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto lg:mx-0">
                24/7 AI support, guided mood tracking, clinical assessments, and seamless therapist
                connection — all in one private, secure platform built for your wellbeing.
              </p>
            </div>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <Link to="/signup">
                <Button
                  size="lg"
                  className="bg-primary hover:bg-primary/90 text-base px-8 h-12 gap-2 shadow-lg hover:shadow-xl transition-all w-full sm:w-auto"
                >
                  Start Free Today
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/login">
                <Button
                  size="lg"
                  variant="outline"
                  className="text-base px-8 h-12 border-border hover:bg-muted/50 bg-transparent w-full sm:w-auto"
                >
                  Sign In
                </Button>
              </Link>
            </div>

            {/* Trust row */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-5 gap-y-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="text-green-500">✓</span> No credit card required</span>
              <span className="flex items-center gap-1.5"><span className="text-green-500">✓</span> Free core features</span>
              <span className="flex items-center gap-1.5"><span className="text-green-500">✓</span> End-to-end encrypted</span>
            </div>
          </div>

          {/* Right: App preview */}
          <div className="relative">
            <AppPreview />
          </div>
        </div>
      </div>
    </section>
  )
}

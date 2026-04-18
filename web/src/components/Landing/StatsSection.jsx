const stats = [
  { value: "9+", label: "Clinical Assessments", sublabel: "PHQ-9, GAD-7, PSS-10 & more" },
  { value: "24/7", label: "AI Support", sublabel: "Always available, never judging" },
  { value: "4", label: "Licensed Therapists", sublabel: "Expert psychiatrists on platform" },
  { value: "100%", label: "Private & Encrypted", sublabel: "Your data stays yours" },
]

export default function StatsSection() {
  return (
    <section className="w-full py-14 border-y border-border/50 bg-muted/20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-4">
          {stats.map((stat, i) => (
            <div key={i} className="flex flex-col items-center text-center gap-1 group">
              <span
                className="text-4xl sm:text-5xl font-bold text-primary"
                style={{ fontFamily: "Montserrat" }}
              >
                {stat.value}
              </span>
              <span className="text-sm font-semibold text-foreground">{stat.label}</span>
              <span className="text-xs text-muted-foreground leading-tight max-w-[160px]">{stat.sublabel}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

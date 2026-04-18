import { useState } from "react"
import { Link } from "react-router-dom"
import { Heart } from "lucide-react"

function LogoMark() {
  const [imgError, setImgError] = useState(false)
  if (imgError) {
    return (
      <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center flex-shrink-0">
        <span className="text-sm font-bold text-primary-foreground">T</span>
      </div>
    )
  }
  return (
    <img
      src="/logo.png"
      alt="TheraAI"
      className="h-8 w-8 rounded-lg object-contain flex-shrink-0"
      onError={() => setImgError(true)}
    />
  )
}

const footerLinks = [
  {
    heading: "Platform",
    links: [
      { label: "Features", href: "#features" },
      { label: "How It Works", href: "#how-it-works" },
      { label: "Assessments", href: "#features" },
      { label: "Therapist Portal", href: "#features" },
    ],
  },
  {
    heading: "Account",
    links: [
      { label: "Sign Up", href: "/signup" },
      { label: "Log In", href: "/login" },
      { label: "Patient Dashboard", href: "/dashboard" },
      { label: "Therapist Dashboard", href: "/therapist-dashboard" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Privacy Policy", href: "#" },
      { label: "Terms of Service", href: "#" },
      { label: "Data Security", href: "#" },
      { label: "Cookie Policy", href: "#" },
    ],
  },
]

export default function Footer() {
  return (
    <footer className="w-full border-t border-border/50 bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">

        {/* Top grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="space-y-4 sm:col-span-2 lg:col-span-1">
            <Link to="/" className="inline-flex items-center gap-2.5 hover:opacity-80 transition-opacity">
              <LogoMark />
              <span className="font-bold text-lg" style={{ fontFamily: "Montserrat" }}>TheraAI</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              AI-powered mental health companion for everyone. Available 24/7, backed by evidence-based tools.
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2 w-fit">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              All systems operational
            </div>
          </div>

          {/* Links */}
          {footerLinks.map((col) => (
            <div key={col.heading} className="space-y-4">
              <h4 className="font-semibold text-sm" style={{ fontFamily: "Montserrat" }}>
                {col.heading}
              </h4>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    {link.href.startsWith("/") ? (
                      <Link
                        to={link.href}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {link.label}
                      </Link>
                    ) : (
                      <a
                        href={link.href}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="h-px bg-border/50" />

        {/* Bottom */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-6 text-sm text-muted-foreground">
          <p className="flex items-center gap-1.5">
            Built with <Heart className="h-3.5 w-3.5 text-red-500 fill-red-500" /> for mental health — FYP Project
          </p>
          <p>© {new Date().getFullYear()} TheraAI. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

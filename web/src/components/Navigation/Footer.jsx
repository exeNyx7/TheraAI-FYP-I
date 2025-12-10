import { Link } from "react-router-dom"
import { Heart } from "lucide-react"

export default function Footer() {
  return (
    <footer className="w-full border-t border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="space-y-4">
            <Link to="/" className="inline-flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                <span className="text-sm font-bold text-primary-foreground">T</span>
              </div>
              <span className="font-semibold" style={{ fontFamily: "Montserrat" }}>
                Thera-AI
              </span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your AI-powered mental health companion. Support, whenever you need it.
            </p>
          </div>

          {/* Product */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm" style={{ fontFamily: "Montserrat" }}>
              Product
            </h4>
            <ul className="space-y-2 text-sm">
              {["Features", "Pricing", "Security", "FAQ"].map((item) => (
                <li key={item}>
                  <Link to="#" className="text-muted-foreground hover:text-foreground transition-colors">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm" style={{ fontFamily: "Montserrat" }}>
              Company
            </h4>
            <ul className="space-y-2 text-sm">
              {["About Us", "Blog", "Careers", "Contact"].map((item) => (
                <li key={item}>
                  <Link to="#" className="text-muted-foreground hover:text-foreground transition-colors">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm" style={{ fontFamily: "Montserrat" }}>
              Legal
            </h4>
            <ul className="space-y-2 text-sm">
              {["Privacy Policy", "Terms of Service", "Cookie Policy", "Data Security"].map((item) => (
                <li key={item}>
                  <Link to="#" className="text-muted-foreground hover:text-foreground transition-colors">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-border my-8"></div>

        {/* Bottom */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <p className="flex items-center gap-2">
            Made with <Heart className="h-4 w-4 text-red-500 fill-red-500" /> for mental health
          </p>
          <p>&copy; 2025 Thera-AI. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

import { Link, useLocation } from "react-router-dom"
import { Button } from "../ui/button"

export default function Navbar() {
  const location = useLocation()
  const pathname = location.pathname

  // Hide navbar on login/signup pages
  if (pathname === "/login" || pathname === "/signup") {
    return null
  }

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-md">
              <span className="text-sm font-bold text-primary-foreground">T</span>
            </div>
            <span className="text-xl font-semibold" style={{ fontFamily: "Montserrat" }}>
              Thera-AI
            </span>
          </Link>

          {/* Auth Buttons */}
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm" className="hover:bg-primary/10">
                Login
              </Button>
            </Link>
            <Link to="/signup">
              <Button size="sm" className="bg-primary hover:bg-primary/90 shadow-md">
                Sign Up
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}

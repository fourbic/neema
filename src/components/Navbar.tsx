import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SignedIn, SignedOut, UserButton } from "@clerk/clerk-react";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  return (
    <header className="fixed w-full bg-neema-background/95 backdrop-blur-md z-50 border-b border-neema-secondary/10">
      <div className="max-w-7xl mx-auto px-6 md:px-8 lg:px-12 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl overflow-hidden">
            <img 
              src="/images/neema_icon.png" 
              alt="Neema Logo" 
              className="h-full w-full object-cover"
            />
          </div>
          <span className="text-xl font-bold text-neema-text">Neema</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1 text-foreground/80 hover:text-foreground transition-colors">
                Features 
                <ChevronDown className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuItem asChild>
                <Link to="/features/ai-safety-mentor">AI Safety Mentor</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/features/secure-communication">Secure Communication</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/features/safe-networking">Safe Networking</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/features/community-protection">Community Protection</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-4">
          <SignedOut>
            <Link to="/login">
              <Button variant="outline" className="border-neema-secondary text-neema-text hover:bg-neema-secondary/10">
                Log in
              </Button>
            </Link>
            <Link to="/joinwaitlist">
              <Button className="neema-button">
                Start for Free
              </Button>
            </Link>
          </SignedOut>
          <SignedIn>
            <Link to="/dashboard">
              <Button variant="outline" className="border-neema-secondary text-neema-text hover:bg-neema-secondary/10 mr-2">
                Dashboard
              </Button>
            </Link>
            <UserButton 
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: "h-9 w-9"
                }
              }}
            />
          </SignedIn>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle menu"
        >
          {isMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-neema-background border-b">
          <div className="section-container py-4 flex flex-col gap-4">
            <Link 
              to="/features" 
              className="py-2 text-foreground/80 hover:text-foreground"
              onClick={() => setIsMenuOpen(false)}
            >
              Features
            </Link>
            <div className="flex flex-col gap-3 pt-2">
              <SignedOut>
                <Link to="/login" onClick={() => setIsMenuOpen(false)}>
                  <Button variant="outline" className="border-neema-secondary text-neema-text hover:bg-neema-secondary/10 w-full">
                    Log in
                  </Button>
                </Link>
                <Link to="/joinwaitlist" onClick={() => setIsMenuOpen(false)}>
                  <Button className="neema-button w-full">
                    Start for Free
                  </Button>
                </Link>
              </SignedOut>
              <SignedIn>
                <div className="flex items-center justify-between">
                  <Link to="/dashboard" className="flex-1 mr-2">
                    <Button variant="outline" className="border-neema-secondary text-neema-text hover:bg-neema-secondary/10 w-full">
                      Dashboard
                    </Button>
                  </Link>
                  <UserButton 
                    afterSignOutUrl="/"
                    appearance={{
                      elements: {
                        avatarBox: "h-9 w-9"
                      }
                    }}
                  />
                </div>
              </SignedIn>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;

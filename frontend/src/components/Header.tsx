import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import logo from "../assets/hkvidya-updated-logo.png";
import { Heart, Menu, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const navLinks = [
    { label: "Home", path: "/" },
    { label: "About Us", path: "/about" },
    { 
      label: "Programs", 
      children: [
        { label: "Education", path: "/impact/education" },
        { label: "Food & Education", path: "/impact/food-education" },
        { label: "Complete Care", path: "/impact/complete-care" },
      ]
    },
    { label: "Gallery", path: "/gallery" },
    { label: "Tax Benefits", path: "/tax-benefits" },
    { label: "FAQ", path: "/faq" },
    { label: "Contact", path: "/contact" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="container px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <img src={logo} alt="HK Vidya Logo" className="h-14 w-auto object-contain group-hover:scale-105 transition-transform" />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              link.children ? (
                <DropdownMenu key={link.label}>
                  <DropdownMenuTrigger asChild>
                    <button className={cn(
                      "flex items-center gap-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                      "hover:bg-secondary hover:text-foreground",
                      link.children.some(child => isActive(child.path))
                        ? "text-primary"
                        : "text-muted-foreground"
                    )}>
                      {link.label}
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" className="w-48">
                    {link.children.map((child) => (
                      <DropdownMenuItem key={child.path} asChild>
                        <Link 
                          to={child.path}
                          className={cn(
                            "w-full cursor-pointer",
                            isActive(child.path) && "text-primary font-medium"
                          )}
                        >
                          {child.label}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link
                  key={link.path}
                  to={link.path}
                  className={cn(
                    "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                    "hover:bg-secondary hover:text-foreground",
                    isActive(link.path)
                      ? "text-primary bg-primary/5"
                      : "text-muted-foreground"
                  )}
                >
                  {link.label}
                </Link>
              )
            ))}
          </nav>

          {/* CTA Button */}
          <div className="hidden md:flex items-center gap-4">
            <Link to="/donate">
              <Button variant="saffron" size="default">
                <Heart className="w-4 h-4 mr-2" />
                Donate Now
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden p-2 text-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border animate-fade-in-up">
            <nav className="flex flex-col gap-1">
              {navLinks.map((link) => (
                link.children ? (
                  <div key={link.label} className="space-y-1">
                    <div className="px-4 py-2 text-sm font-medium text-muted-foreground">
                      {link.label}
                    </div>
                    <div className="pl-4">
                      {link.children.map((child) => (
                        <Link
                          key={child.path}
                          to={child.path}
                          onClick={() => setMobileMenuOpen(false)}
                          className={cn(
                            "block px-4 py-2 text-sm rounded-lg transition-colors",
                            "hover:bg-secondary",
                            isActive(child.path)
                              ? "text-primary font-medium bg-primary/5"
                              : "text-muted-foreground"
                          )}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                      "hover:bg-secondary",
                      isActive(link.path)
                        ? "text-primary bg-primary/5"
                        : "text-muted-foreground"
                    )}
                  >
                    {link.label}
                  </Link>
                )
              ))}
              <div className="pt-4 px-4">
                <Link to="/donate" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="saffron" size="default" className="w-full">
                    <Heart className="w-4 h-4 mr-2" />
                    Donate Now
                  </Button>
                </Link>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;

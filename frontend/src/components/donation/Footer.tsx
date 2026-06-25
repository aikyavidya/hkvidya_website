import { useState } from "react";
import { Link } from "react-router-dom";
import { Heart, Mail, Phone, MapPin, Facebook, Twitter, Instagram, Youtube, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

const socialLinks = [
  { icon: Facebook, href: "https://facebook.com/hkvidya", label: "Facebook" },
  { icon: Twitter, href: "https://twitter.com/hkvidya", label: "Twitter" },
  { icon: Instagram, href: "https://instagram.com/hkvidya", label: "Instagram" },
  { icon: Youtube, href: "https://youtube.com/hkvidya", label: "YouTube" },
];

const Footer = () => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    
    setIsSubmitting(true);
    // Simulate submission
    setTimeout(() => {
      toast({
        title: "Subscribed!",
        description: "Thank you for subscribing to our newsletter.",
      });
      setEmail("");
      setIsSubmitting(false);
    }, 500);
  };

  return (
    <footer className="bg-foreground text-background py-12">
      <div className="container px-4">
        <div className="grid md:grid-cols-4 gap-8 max-w-6xl mx-auto">
          {/* About */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Heart className="w-6 h-6 text-primary" />
              <span className="font-display text-xl font-bold">HK Vidya</span>
            </div>
            <p className="text-sm text-background/70 leading-relaxed mb-4">
              Hare Krishna Vidya is dedicated to enriching communities through education, nutrition, and value-based learning, empowering children to grow into responsible citizens and future leaders.
            </p>
            {/* Social Links */}
            <div className="flex items-center gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="w-9 h-9 rounded-full bg-background/10 hover:bg-primary flex items-center justify-center transition-colors"
                >
                  <social.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-display font-semibold text-lg mb-4">Quick Links</h3>
            <div className="space-y-2 text-sm">
              <Link to="/about" className="block text-background/70 hover:text-primary transition-colors">
                About Us
              </Link>
              <Link to="/donate-upi"   className="block text-background/70 hover:text-primary transition-colors">  Donate via UPI</Link>
              <Link to="/impact/education" className="block text-background/70 hover:text-primary transition-colors">
                Our Programs
              </Link>
              <Link to="/contact" className="block text-background/70 hover:text-primary transition-colors">
                Contact Us
              </Link>
              <Link to="/tax-benefits" className="block text-background/70 hover:text-primary transition-colors">
                Tax Benefits
              </Link>
            </div>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-display font-semibold text-lg mb-4">Contact Us</h3>
            <div className="space-y-3 text-sm">
              <a href="mailto:connect@harekrishnavidya.org" className="flex items-center gap-2 text-background/70 hover:text-primary transition-colors">
                <Mail className="w-4 h-4" />
                connect@harekrishnavidya.org
              </a>
              <a href="tel:+917207619870" className="flex items-center gap-2 text-background/70 hover:text-primary transition-colors">
                <Phone className="w-4 h-4" />
                +91 7207619870
              </a>
              <div className="flex items-start gap-2 text-background/70">
                <MapPin className="w-4 h-4 mt-0.5" />
                <span>MLA Colony, Road No-12, Banjara Hills, Hyderabad - 500034</span>
              </div>
            </div>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="font-display font-semibold text-lg mb-4">Stay Updated</h3>
            <p className="text-sm text-background/70 mb-4">
              Subscribe to receive updates on our programs and impact stories.
            </p>
            <form onSubmit={handleNewsletterSubmit} className="space-y-3">
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-background/10 border-background/20 text-background placeholder:text-background/50 focus-visible:ring-primary"
                required
              />
              <Button 
                type="submit" 
                variant="saffron" 
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Subscribing..." : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Subscribe
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>

        <div className="border-t border-background/10 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-background/50">
          <p>© {new Date().getFullYear()} HK Vidya. All rights reserved. Made with ❤️ for humanity.</p>
          <div className="flex items-center gap-4">
            {socialLinks.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary transition-colors"
              >
                {social.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

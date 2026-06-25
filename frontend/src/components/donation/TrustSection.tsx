import { Shield, Award, FileCheck, Lock, CheckCircle2 } from "lucide-react";

const trustBadges = [
  {
    icon: Shield,
    title: "80G Tax Exemption",
    description: "Get tax benefits on your donations under Section 80G",
    highlight: "Save up to 50%",
  },
  {
    icon: Award,
    title: "Registered NGO",
    description: "Government registered charitable organization",
    highlight: "Since 2021",
  },

  {
    icon: Lock,
    title: "Secure Payments",
    description: "Bank-grade security for all transactions",
    highlight: "256-bit SSL",
  },
];

const TrustSection = () => {
  return (
    <section className="py-16 md:py-20 bg-gradient-to-b from-background via-secondary/30 to-background">
      <div className="container px-4">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <CheckCircle2 className="w-4 h-4" />
            Trusted by 10,000+ Donors
          </div>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
            Why Donate With Us?
          </h2>
        </div>

        {/* Trust Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 max-w-6xl mx-auto justify-center">
          {trustBadges.map((badge, index) => (
            <div
              key={badge.title}
              className="group relative bg-card rounded-2xl p-6 border border-border/50 hover:border-primary/30 hover:shadow-elevated transition-all duration-300 animate-fade-in-up overflow-hidden"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Gradient overlay on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <div className="relative">
                {/* Icon */}
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <badge.icon className="w-7 h-7 text-primary" />
                </div>
                
                {/* Content */}
                <h3 className="font-display font-bold text-foreground text-base md:text-lg mb-2">
                  {badge.title}
                </h3>
                <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                  {badge.description}
                </p>
                
                {/* Highlight Badge */}
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                  <CheckCircle2 className="w-3 h-3" />
                  {badge.highlight}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom trust indicators */}
        <div className="flex flex-wrap justify-center items-center gap-6 md:gap-10 mt-12 pt-8 border-t border-border/50">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Shield className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium">100% Secure</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Award className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium">Govt. Verified</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <FileCheck className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium">Audited Annually</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TrustSection;

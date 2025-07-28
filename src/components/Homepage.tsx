import { useState } from "react";
import { HeroSection } from "./HeroSection";
import { AuthForms } from "./AuthForms";
import { OperatorLogin } from "./OperatorLogin";
import { ServicesSection } from "./ServicesSection";
import { HowItWorksSection } from "./HowItWorksSection";
import { FAQSection } from "./FAQSection";
import { CustomerDashboard } from "./dashboards/CustomerDashboard";
import { OwnerDashboard } from "./dashboards/OwnerDashboard";
import { OperatorDashboard } from "./dashboards/OperatorDashboard";
import { MarketingDashboard } from "./dashboards/MarketingDashboard";
import { WasherDashboard } from "./washers/WasherDashboard";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";

export function Homepage() {
  const [showOperatorLogin, setShowOperatorLogin] = useState(false);
  const { user, userRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-wave flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect authenticated users to their role-based dashboard
  if (user && userRole) {
    switch (userRole) {
      case 'customer':
        return <CustomerDashboard />;
      case 'washer':
        return <WasherDashboard onBack={() => {}} />;
      case 'owner':
        return <OwnerDashboard />;
      case 'operator':
        return <OperatorDashboard />;
      case 'marketing':
        return <MarketingDashboard />;
      default:
        return <CustomerDashboard />;
    }
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section with embedded login */}
      <div className="relative">
        <HeroSection />
        
        {/* Login overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="absolute top-8 right-8 z-20">
            <Card className="bg-background/95 backdrop-blur-md border-0 shadow-glow p-6 max-w-md">
              {showOperatorLogin ? (
                <OperatorLogin onBack={() => setShowOperatorLogin(false)} />
              ) : (
                <AuthForms onOperatorLogin={() => setShowOperatorLogin(true)} />
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* Public sections */}
      <ServicesSection />
      <HowItWorksSection />
      <FAQSection />
      
      {/* Footer */}
      <footer className="bg-primary text-primary-foreground py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-2">
              <h3 className="text-2xl font-bold mb-4">FreshDrop</h3>
              <p className="text-primary-foreground/80 mb-4">
                Professional laundry service made simple. 
                Drop off at lockers or schedule pickup & delivery.
              </p>
              <div className="text-sm text-primary-foreground/60">
                © 2024 FreshDrop. All rights reserved.
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Services</h4>
              <ul className="space-y-2 text-sm text-primary-foreground/80">
                <li>Wash & Fold</li>
                <li>Express Service</li>
                <li>Locker Pickup</li>
                <li>Door-to-Door</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-primary-foreground/80">
                <li>Help Center</li>
                <li>Contact Us</li>
                <li>Track Order</li>
                <li>Service Areas</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-primary-foreground/20 mt-8 pt-8 text-center text-sm text-primary-foreground/60">
            <p>Available in select cities. Download our app for the best experience.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
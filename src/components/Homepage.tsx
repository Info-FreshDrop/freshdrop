import { useState, useEffect } from "react";
import { HeroSection } from "./HeroSection";
import { AuthForms } from "./AuthForms";
import { OperatorLogin } from "./OperatorLogin";
import { ServicesSection } from "./ServicesSection";
import { ChatWidget } from "./customer/ChatWidget";
import { HowItWorksSection } from "./HowItWorksSection";
import { FAQSection } from "./FAQSection";
import { OperatorApplication } from "./OperatorApplication";
import { CustomerDashboard } from "./dashboards/CustomerDashboard";
import { OwnerDashboard } from "./dashboards/OwnerDashboard";
import { OperatorDashboard } from "./dashboards/OperatorDashboard";
import { MarketingDashboard } from "./dashboards/MarketingDashboard";
import { WasherDashboard } from "./washers/WasherDashboard";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";

export function Homepage() {
  const [showOperatorLogin, setShowOperatorLogin] = useState(false);
  const [timeoutReached, setTimeoutReached] = useState(false);
  const { user, userRole, loading } = useAuth();
  
  useEffect(() => {
    // Increase timeout to 10 seconds and add more detailed logging
    const timer = setTimeout(() => {
      console.log('Loading timeout reached after 10 seconds');
      console.log('Current auth state:', { user: !!user, userRole, loading });
      setTimeoutReached(true);
    }, 10000); // Increased to 10 seconds
    
    return () => clearTimeout(timer);
  }, [user, userRole, loading]);

  // Show loading spinner for a reasonable amount of time
  if (loading && !timeoutReached) {
    return (
      <div className="min-h-screen bg-gradient-wave flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If loading is stuck, show error message with refresh option
  if (timeoutReached && loading) {
    console.log('Forcing page load due to timeout - this indicates an authentication issue');
    return (
      <div className="min-h-screen bg-gradient-wave flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">Connection Issue</h2>
            <p className="text-muted-foreground mb-4">
              We're having trouble connecting to our servers. This usually resolves itself quickly.
            </p>
          </div>
          <div className="space-y-3">
            <button 
              onClick={() => window.location.reload()} 
              className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
            >
              Refresh Page
            </button>
            <button 
              onClick={() => {
                setTimeoutReached(false);
                // Force continue anyway
              }} 
              className="w-full bg-muted text-muted-foreground px-4 py-2 rounded-lg hover:bg-muted/80 transition-colors"
            >
              Continue Anyway
            </button>
          </div>
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
      {/* Hero Section */}
      <HeroSection />
      
      {/* Login Section */}
      <section id="auth-section" className="py-16 bg-background">
        <div className="max-w-md mx-auto px-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Sign in to Order</h2>
            <p className="text-muted-foreground">Create an account or sign in to place your laundry order</p>
          </div>
          <Card className="shadow-glow">
            {showOperatorLogin ? (
              <OperatorLogin onBack={() => setShowOperatorLogin(false)} />
            ) : (
              <AuthForms onOperatorLogin={() => setShowOperatorLogin(true)} />
            )}
          </Card>
        </div>
      </section>

      {/* Public sections */}
      <ServicesSection />
      <HowItWorksSection />
      <FAQSection />
      <OperatorApplication />
      
      {/* Support Section - Moved to bottom */}
      <section className="py-12 px-6 bg-muted/20">
        <div className="max-w-4xl mx-auto text-center">
          <div className="p-6 bg-gradient-wave rounded-xl border">
            <h3 className="text-xl font-bold mb-3 text-primary">Still have questions?</h3>
            <p className="text-muted-foreground mb-4">
              Our support team is here to help you get the most out of FreshDrop's services.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center text-sm">
              <div>
                <strong>Email:</strong> support@freshdrop.com
              </div>
              <div>
                <strong>Phone:</strong> (555) 123-WASH
              </div>
              <div>
                <strong>Hours:</strong> 7 AM - 10 PM daily
              </div>
            </div>
          </div>
        </div>
      </section>
      
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
      
      {/* Live Chat Widget */}
      <ChatWidget />
    </div>
  );
}
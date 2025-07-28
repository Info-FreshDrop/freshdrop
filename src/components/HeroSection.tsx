import { Button } from "@/components/ui/button";
import { Droplets, Clock, Shield, Smartphone } from "lucide-react";
import freshDropLogo from "@/assets/freshdrop-logo.png";

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center bg-gradient-hero overflow-hidden">
      {/* Animated wave background */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-gradient-wave animate-wave"></div>
        <div className="absolute inset-0 bg-gradient-wave animate-wave" style={{ animationDelay: '1s' }}></div>
        <div className="absolute inset-0 bg-gradient-wave animate-wave" style={{ animationDelay: '2s' }}></div>
      </div>
      
      {/* Floating elements */}
      <div className="absolute top-20 left-20 animate-float">
        <Droplets className="h-8 w-8 text-primary-lighter opacity-60" />
      </div>
      <div className="absolute top-40 right-20 animate-float" style={{ animationDelay: '1s' }}>
        <Droplets className="h-12 w-12 text-primary-light opacity-40" />
      </div>
      <div className="absolute bottom-40 left-40 animate-float" style={{ animationDelay: '2s' }}>
        <Droplets className="h-6 w-6 text-primary-lighter opacity-80" />
      </div>

      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
        {/* Logo section - Enhanced */}
        <div className="mb-8 flex items-center justify-center">
          <img 
            src={freshDropLogo} 
            alt="FreshDrop Logo" 
            className="h-40 md:h-64 w-auto drop-shadow-lg"
            style={{ filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.3))' }}
          />
        </div>

        <h2 className="text-2xl md:text-4xl font-semibold text-white/90 mb-6">
          Laundry made easy
        </h2>
        
        <p className="text-lg md:text-xl text-white/80 mb-12 max-w-2xl mx-auto leading-relaxed">
          Professional laundry service with 24-hour turnaround. 
          Drop off at any locker or schedule pickup & delivery. 
          Eco-friendly, secure, and contactless.
        </p>

        <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16">
          <Button 
            variant="hero" 
            size="xl" 
            className="min-w-64"
            onClick={() => {
              const authSection = document.querySelector('#auth-section');
              if (authSection) {
                authSection.scrollIntoView({ behavior: 'smooth' });
              }
            }}
          >
            Schedule a Pickup
          </Button>
          <Button 
            variant="default" 
            size="xl" 
            className="min-w-64 bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => {
              const authSection = document.querySelector('#auth-section');
              if (authSection) {
                authSection.scrollIntoView({ behavior: 'smooth' });
              }
            }}
          >
            Find a Locker
          </Button>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-white/90">
          <div className="text-center">
            <Clock className="h-8 w-8 mx-auto mb-3 text-primary-lighter" />
            <div className="text-2xl font-bold">24hr</div>
            <div className="text-sm">Turnaround</div>
          </div>
          <div className="text-center">
            <Shield className="h-8 w-8 mx-auto mb-3 text-primary-lighter" />
            <div className="text-2xl font-bold">Secure</div>
            <div className="text-sm">& Trusted</div>
          </div>
          <div className="text-center">
            <Smartphone className="h-8 w-8 mx-auto mb-3 text-primary-lighter" />
            <div className="text-2xl font-bold">Easy</div>
            <div className="text-sm">App Control</div>
          </div>
          <div className="text-center">
            <Droplets className="h-8 w-8 mx-auto mb-3 text-primary-lighter" />
            <div className="text-2xl font-bold">Eco</div>
            <div className="text-sm">Friendly</div>
          </div>
        </div>
      </div>
    </section>
  );
}
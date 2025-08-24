import { Button } from "@/components/ui/button";
import { Droplets, Clock, Shield, Smartphone } from "lucide-react";
import freshDropLogo from "@/assets/freshdrop-logo.png";
export function HeroSection() {
  return <section className="relative min-h-screen flex flex-col justify-start bg-gradient-hero overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 bg-contain bg-top bg-no-repeat" style={{
      backgroundImage: `url('/lovable-uploads/876c111c-7235-405f-a56c-e9ddb449bf39.png')`
    }} />
      
      {/* Overlay for better text readability */}
      <div className="absolute inset-0 bg-black/20"></div>

      <div className="relative z-10 px-6 max-w-4xl mx-auto">
        {/* Header Text - Left aligned */}
        <div className="text-left pt-12 pb-4">
          <h2 className="text-2xl font-bold text-white drop-shadow-lg mb-4 md:text-2xl">
            Laundry made easy
          </h2>
          
          <p className="text-base text-white/90 drop-shadow-md mb-12 max-w-lg leading-relaxed md:text-sm">Professional laundry service<br />
with 24-hour turnaround.<br />
Drop off at any locker or schedule pickup & delivery.
        </p>
        </div>

        {/* Spacer to push content down */}
        <div style={{
        height: '40vh'
      }}></div>

        {/* Call to Action Buttons */}
        <div className="flex flex-col gap-4 justify-start items-start mb-16 px-4">
          <Button variant="hero" size="xl" className="max-w-sm" onClick={() => {
          const authSection = document.querySelector('#auth-section');
          if (authSection) {
            authSection.scrollIntoView({
              behavior: 'smooth'
            });
          }
        }}>
            Schedule a Pickup
          </Button>
          <Button variant="default" size="xl" className="max-w-sm bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => {
          const authSection = document.querySelector('#auth-section');
          if (authSection) {
            authSection.scrollIntoView({
              behavior: 'smooth'
            });
          }
        }}>
            Find a Locker
          </Button>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 text-white/90 px-4">
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
    </section>;
}
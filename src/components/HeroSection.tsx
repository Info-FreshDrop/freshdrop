import { Button } from "@/components/ui/button";
import { Droplets } from "lucide-react";
import freshDropLogo from "@/assets/freshdrop-logo.png";

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex flex-col bg-white overflow-hidden">
      {/* Clean white background with wave at bottom */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-20 pb-32">
        {/* Logo section */}
        <div className="mb-12 flex flex-col items-center">
          <div className="mb-6">
            <Droplets className="h-16 w-16 mx-auto text-primary mb-4" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-primary mb-2">
            FreshDrop
          </h1>
        </div>

        <h2 className="text-3xl md:text-4xl font-semibold text-primary mb-16 text-center">
          Laundry<br />made easy
        </h2>
      </div>

      {/* Wave gradient background at bottom */}
      <div className="relative h-64 bg-gradient-to-t from-primary to-primary/80">
        {/* Wave shape */}
        <div className="absolute top-0 left-0 w-full overflow-hidden leading-none">
          <svg 
            className="relative block w-full h-16" 
            viewBox="0 0 1200 120" 
            preserveAspectRatio="none"
          >
            <path 
              d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" 
              className="fill-white"
            />
          </svg>
        </div>
        
        {/* Content area */}
        <div className="flex items-center justify-center h-full pt-16">
          <Button 
            size="xl" 
            className="bg-white/20 text-white border-2 border-white/30 hover:bg-white/30 min-w-64 h-14 text-lg font-semibold rounded-full backdrop-blur-sm"
            onClick={() => {
              const authSection = document.querySelector('#auth-section');
              if (authSection) {
                authSection.scrollIntoView({ behavior: 'smooth' });
              }
            }}
          >
            Schedule a Pickup
          </Button>
        </div>
      </div>
    </section>
  );
}
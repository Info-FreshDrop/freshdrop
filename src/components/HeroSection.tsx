import { Button } from "@/components/ui/button";
import { Droplets } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex flex-col bg-white overflow-hidden">
      {/* Main content area */}
      <div className="flex-1 flex flex-col items-center px-6 pt-16">
        {/* Single turquoise droplet icon */}
        <div className="mt-16 mb-8">
          <div className="relative">
            {/* Outer turquoise droplet */}
            <Droplets className="h-20 w-20 text-cyan-400 fill-cyan-400" />
            {/* Inner dark blue droplet */}
            <div className="absolute top-2 left-1/2 transform -translate-x-1/2">
              <Droplets className="h-8 w-8 text-blue-700 fill-blue-700" />
            </div>
          </div>
        </div>

        {/* FreshDrop title */}
        <h1 className="text-5xl md:text-6xl font-bold text-blue-800 mb-16 text-center">
          FreshDrop
        </h1>

        {/* Tagline positioned lower */}
        <div className="mt-8 mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-cyan-400 text-center leading-tight">
            Laundry<br />made easy
          </h2>
        </div>
      </div>

      {/* Layered wave section at bottom */}
      <div className="relative mt-auto">
        {/* Multiple wave layers for the exact effect */}
        <svg className="absolute bottom-0 left-0 w-full h-64 z-10" viewBox="0 0 1200 320" preserveAspectRatio="none">
          {/* Top wave layer - lightest */}
          <path d="M0,160L48,176C96,192,192,224,288,213.3C384,203,480,149,576,154.7C672,160,768,224,864,234.7C960,245,1056,203,1152,176C1200,149,1248,139,1296,154.7L1344,170.7L1344,320L1296,320C1248,320,1152,320,1056,320C960,320,864,320,768,320C672,320,576,320,480,320C384,320,288,320,192,320C96,320,48,320,24,320L0,320Z" fill="#67e8f9" />
          
          {/* Middle wave layer */}
          <path d="M0,224L48,213.3C96,203,192,181,288,186.7C384,192,480,224,576,224C672,224,768,192,864,181.3C960,171,1056,181,1152,197.3C1200,213,1248,235,1296,229.3L1344,224L1344,320L1296,320C1248,320,1152,320,1056,320C960,320,864,320,768,320C672,320,576,320,480,320C384,320,288,320,192,320C96,320,48,320,24,320L0,320Z" fill="#22d3ee" />
          
          {/* Bottom wave layer - darkest */}
          <path d="M0,256L48,261.3C96,267,192,277,288,272C384,267,480,245,576,240C672,235,768,245,864,261.3C960,277,1056,299,1152,288C1200,277,1248,235,1296,224L1344,213L1344,320L1296,320C1248,320,1152,320,1056,320C960,320,864,320,768,320C672,320,576,320,480,320C384,320,288,320,192,320C96,320,48,320,24,320L0,320Z" fill="#0891b2" />
        </svg>

        {/* Solid background behind waves */}
        <div className="h-64 bg-gradient-to-t from-cyan-600 to-cyan-400"></div>
        
        {/* Schedule button positioned in the wave area */}
        <div className="absolute inset-0 flex items-center justify-center z-20 mt-16">
          <Button 
            size="xl" 
            className="bg-white/20 text-white border-0 hover:bg-white/30 px-8 py-4 text-lg font-medium rounded-full backdrop-blur-sm shadow-lg min-w-72 h-14"
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
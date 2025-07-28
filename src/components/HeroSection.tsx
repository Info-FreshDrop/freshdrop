import { Button } from "@/components/ui/button";
import { Droplets } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex flex-col bg-white overflow-hidden">
      {/* Main content area */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-20">
        {/* Droplet icon */}
        <div className="mb-8">
          <div className="relative">
            <Droplets className="h-24 w-24 text-cyan-400 fill-cyan-400" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Droplets className="h-12 w-12 text-blue-600 fill-blue-600" />
            </div>
          </div>
        </div>

        {/* FreshDrop title */}
        <h1 className="text-5xl md:text-6xl font-bold text-blue-800 mb-12 text-center">
          FreshDrop
        </h1>

        {/* Tagline */}
        <h2 className="text-4xl md:text-5xl font-bold text-cyan-400 mb-20 text-center leading-tight">
          Laundry<br />made easy
        </h2>
      </div>

      {/* Wave section at bottom */}
      <div className="relative">
        {/* Multiple wave layers for depth */}
        <div className="absolute bottom-0 left-0 w-full">
          <svg className="relative block w-full h-32" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M985.66,92.83C906.67,72,823.78,31,743.84,14.19c-82.26-17.34-168.06-16.33-250.45.39-57.84,11.73-114,31.07-172,41.86A600.21,600.21,0,0,1,0,27.35V120H1200V95.8C1132.19,118.92,1055.71,111.31,985.66,92.83Z" className="fill-cyan-300 opacity-60"></path>
          </svg>
        </div>
        
        <div className="relative bg-gradient-to-t from-cyan-400 to-cyan-300 pt-16 pb-32">
          {/* Schedule button */}
          <div className="flex justify-center pt-8">
            <Button 
              size="xl" 
              className="bg-white/20 text-white border-0 hover:bg-white/30 px-12 py-4 text-xl font-semibold rounded-full backdrop-blur-sm shadow-lg"
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
      </div>
    </section>
  );
}
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Zap, MapPin, Truck, Leaf, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function ServicesSection() {
  const [content, setContent] = useState({
    services_title: 'Our Services',
    services_subtitle: 'Professional laundry service designed for your busy lifestyle. From quick express service to convenient locker options, we\'ve got you covered.',
    team_title: 'Meet Our Professional Team',
    team_subtitle: 'Trusted, background-checked operators who care about your clothes'
  });
  const [featuredOperators, setFeaturedOperators] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      // Fetch homepage content
      const { data: contentData, error: contentError } = await supabase
        .from('homepage_content')
        .select('*')
        .in('section_key', ['services_title', 'services_subtitle', 'team_title', 'team_subtitle']);

      if (contentError) {
        console.error('Error fetching content:', contentError);
      } else {
        const contentMap = {};
        contentData.forEach(item => {
          contentMap[item.section_key] = item.content_text;
        });
        setContent(prev => ({ ...prev, ...contentMap }));
      }

      // Fetch featured operators for team showcase
      const { data: operatorsData, error: operatorsError } = await supabase
        .from('featured_operators')
        .select('*')
        .eq('is_featured', true)
        .order('display_order', { ascending: true })
        .limit(4);

      if (operatorsError) {
        console.error('Error fetching operators:', operatorsError);
      } else {
        setFeaturedOperators(operatorsData || []);
      }
    } catch (error) {
      console.error('Error fetching services content:', error);
    } finally {
      setLoading(false);
    }
  };

  const services = [
    {
      icon: Clock,
      title: "24-Hour Turnaround",
      description: "Standard orders processed and returned within 24 hours of pickup",
      color: "text-primary"
    },
    {
      icon: Zap,
      title: "Express Service",
      description: "Place by 12 PM, get it back by 8 PM the same day",
      color: "text-accent"
    },
    {
      icon: MapPin,
      title: "Locker Pickup",
      description: "Drop off at any FreshDrop locker and pick up when ready",
      color: "text-secondary"
    },
    {
      icon: Truck,
      title: "Door-to-Door",
      description: "Pickup and delivery from your home, office, or dorm",
      color: "text-primary-light"
    },
    {
      icon: Leaf,
      title: "Eco-Friendly",
      description: "Sustainable detergents and custom washing preferences",
      color: "text-primary-lighter"
    },
    {
      icon: Lock,
      title: "Secure & Contactless",
      description: "Affordable service with secure tracking and contactless options",
      color: "text-primary"
    }
  ];

  return (
    <section className="py-20 px-6 bg-background">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-primary bg-clip-text text-transparent">
            {content.services_title}
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            {content.services_subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <Card 
              key={index} 
              className="border-0 shadow-soft hover:shadow-glow transition-all duration-300 hover:scale-105 bg-card/50 backdrop-blur-sm"
            >
              <CardHeader className="text-center pb-4">
                <div className="flex justify-center mb-4">
                  <div className="p-3 rounded-full bg-gradient-wave">
                    <service.icon className={`h-8 w-8 ${service.color}`} />
                  </div>
                </div>
                <CardTitle className="text-xl mb-2">{service.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <CardDescription className="text-base leading-relaxed">
                  {service.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Meet Our Professional Team - Only show if we have operators */}
        {featuredOperators.length > 0 && (
          <div className="mt-16 p-8 bg-gradient-wave rounded-2xl border shadow-soft">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold mb-4 text-primary">{content.team_title}</h3>
              <p className="text-muted-foreground mb-6">{content.team_subtitle}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {featuredOperators.map((operator) => (
                <div key={operator.id} className="text-center">
                  <img 
                    src={operator.image_url || `https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=200&h=200&fit=crop&crop=face`}
                    alt={`${operator.name} - Professional operator`} 
                    className="w-20 h-20 rounded-full mx-auto mb-3 border-2 border-primary/30"
                  />
                  <h4 className="font-semibold text-sm">{operator.name}</h4>
                  <p className="text-xs text-muted-foreground">{operator.experience}</p>
                  <div className="flex justify-center mt-1">
                    <div className="text-xs text-primary">★★★★★ {operator.rating}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center">
              <h3 className="text-2xl font-bold mb-4 text-primary">Why Choose FreshDrop?</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span>Background-checked professionals</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-secondary rounded-full"></div>
                  <span>Real-time photo updates</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-accent rounded-full"></div>
                  <span>Satisfaction guaranteed</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
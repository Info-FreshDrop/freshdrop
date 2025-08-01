import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { MapPin, QrCode, Settings, Bell, Home, Package, Truck, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function HowItWorksSection() {
  const [content, setContent] = useState({
    how_it_works_title: 'How It Works',
    how_it_works_subtitle: 'Choose the service method that works best for you. Both options are designed for maximum convenience and flexibility.'
  });
  const [processImages, setProcessImages] = useState([]);
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
        .in('section_key', ['how_it_works_title', 'how_it_works_subtitle']);

      if (contentError) {
        console.error('Error fetching content:', contentError);
      } else {
        const contentMap = {};
        contentData.forEach(item => {
          contentMap[item.section_key] = item.content_text;
        });
        setContent(prev => ({ ...prev, ...contentMap }));
      }

      // Fetch process images
      const { data: imagesData, error: imagesError } = await supabase
        .from('content_images')
        .select('*')
        .in('section', ['how_it_works_locker', 'how_it_works_pickup'])
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (imagesError) {
        console.error('Error fetching images:', imagesError);
      } else {
        setProcessImages(imagesData || []);
      }
    } catch (error) {
      console.error('Error fetching how it works content:', error);
    } finally {
      setLoading(false);
    }
  };

  const lockerSteps = [
    {
      icon: MapPin,
      title: "Drop at Locker",
      description: "Find any FreshDrop locker near you and drop your laundry bag inside",
      step: 1
    },
    {
      icon: QrCode,
      title: "Scan QR Code",
      description: "Scan the locker QR code or enter the locker number in our app",
      step: 2
    },
    {
      icon: Settings,
      title: "Choose Service",
      description: "Select wash & fold, express service, or custom preferences",
      step: 3
    },
    {
      icon: Bell,
      title: "Get Notified",
      description: "Receive notifications when your laundry is ready for pickup",
      step: 4
    }
  ];

  const pickupSteps = [
    {
      icon: Home,
      title: "Schedule Pickup",
      description: "Choose pickup from home, office, dorm, or business location",
      step: 1
    },
    {
      icon: Package,
      title: "Prepare Bag",
      description: "Place clothes in a bag at your door or front desk",
      step: 2
    },
    {
      icon: Truck,
      title: "Track Progress",
      description: "Follow pickup and cleaning progress with real-time updates",
      step: 3
    },
    {
      icon: CheckCircle,
      title: "Get Delivery",
      description: "Receive confirmation when your clean laundry is delivered",
      step: 4
    }
  ];

  const StepCard = ({ step, icon: Icon, title, description }: any) => (
    <Card className="border-0 shadow-soft hover:shadow-glow transition-all duration-300 relative overflow-hidden group">
      <div className="absolute top-4 right-4">
        <Badge variant="secondary" className="bg-gradient-primary text-primary-foreground">
          {step}
        </Badge>
      </div>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-full bg-gradient-wave group-hover:bg-gradient-primary transition-all duration-300">
            <Icon className="h-6 w-6 text-primary group-hover:text-primary-foreground" />
          </div>
          <CardTitle className="text-lg">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-base leading-relaxed">
          {description}
        </CardDescription>
      </CardContent>
    </Card>
  );

  // Get images for specific sections
  const lockerImages = processImages.filter(img => img.section === 'how_it_works_locker');
  const pickupImages = processImages.filter(img => img.section === 'how_it_works_pickup');

  return (
    <section className="py-20 px-6 bg-gradient-wave">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-primary bg-clip-text text-transparent">
            {content.how_it_works_title}
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            {content.how_it_works_subtitle}
          </p>
        </div>

        <Tabs defaultValue="locker" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-12 bg-card/50 backdrop-blur-sm">
            <TabsTrigger value="locker" className="text-base py-3">
              <MapPin className="h-4 w-4 mr-2" />
              Locker Flow
            </TabsTrigger>
            <TabsTrigger value="pickup" className="text-base py-3">
              <Truck className="h-4 w-4 mr-2" />
              Pickup & Delivery
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="locker">
            <div className="space-y-8">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold mb-3 text-primary">Convenient Locker Service</h3>
                <p className="text-muted-foreground">
                  Perfect for those who want flexibility and control over timing
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {lockerSteps.map((step, index) => (
                  <StepCard key={index} {...step} />
                ))}
              </div>
              
              {/* Dynamic Process Photos */}
              {lockerImages.length > 0 ? (
                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {lockerImages.map((image) => (
                    <div key={image.id} className="bg-card rounded-xl border shadow-soft overflow-hidden">
                      <img 
                        src={image.image_url}
                        alt={image.alt_text || image.title || "Locker service process"} 
                        className="w-full h-32 object-cover"
                      />
                      <div className="p-4">
                        <h4 className="font-semibold mb-2">{image.title}</h4>
                        <p className="text-sm text-muted-foreground">{image.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-card rounded-xl border shadow-soft overflow-hidden">
                    <img 
                      src="https://images.unsplash.com/photo-1434494878577-86c23bcb06b9?w=400&h=250&fit=crop"
                      alt="Using smart locker interface" 
                      className="w-full h-32 object-cover"
                    />
                    <div className="p-4">
                      <h4 className="font-semibold mb-2">Smart Locker Access</h4>
                      <p className="text-sm text-muted-foreground">Convenient touchscreen interface for easy drop-off and pickup</p>
                    </div>
                  </div>
                  <div className="bg-card rounded-xl border shadow-soft p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <MapPin className="h-5 w-5 text-primary" />
                      <h4 className="font-semibold">Locker Benefits</h4>
                    </div>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li>• Available 24/7 at convenient locations</li>
                      <li>• No need to wait for pickup or delivery windows</li>
                      <li>• Secure storage with QR code access</li>
                      <li>• Perfect for busy schedules</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="pickup">
            <div className="space-y-8">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold mb-3 text-primary">Door-to-Door Service</h3>
                <p className="text-muted-foreground">
                  Complete hands-off experience with pickup and delivery
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {pickupSteps.map((step, index) => (
                  <StepCard key={index} {...step} />
                ))}
              </div>
              
              {/* Dynamic Process Photos */}
              {pickupImages.length > 0 ? (
                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {pickupImages.map((image) => (
                    <div key={image.id} className="bg-card rounded-xl border shadow-soft overflow-hidden">
                      <img 
                        src={image.image_url}
                        alt={image.alt_text || image.title || "Pickup service process"} 
                        className="w-full h-32 object-cover"
                      />
                      <div className="p-4">
                        <h4 className="font-semibold mb-2">{image.title}</h4>
                        <p className="text-sm text-muted-foreground">{image.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-card rounded-xl border shadow-soft overflow-hidden">
                    <img 
                      src="https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400&h=250&fit=crop"
                      alt="Professional delivery service" 
                      className="w-full h-32 object-cover"
                    />
                    <div className="p-4">
                      <h4 className="font-semibold mb-2">Professional Delivery</h4>
                      <p className="text-sm text-muted-foreground">Trusted operators handle your clothes with care from pickup to delivery</p>
                    </div>
                  </div>
                  <div className="bg-card rounded-xl border shadow-soft p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <Truck className="h-5 w-5 text-primary" />
                      <h4 className="font-semibold">Pickup & Delivery Benefits</h4>
                    </div>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li>• Completely contactless service option</li>
                      <li>• Background-checked operators</li>
                      <li>• GPS tracking for pickup and delivery</li>
                      <li>• Perfect for homes, offices, and dorms</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCapacitor } from '@/hooks/useCapacitor';
import { supabase } from '@/integrations/supabase/client';
import { IOSScreen, IOSContent, IOSScrollView, IOSSection } from '@/components/ui/ios-layout';
import { IOSHeader, IOSTabBar } from '@/components/ui/ios-navigation';
import { IOSPrimaryButton, IOSSecondaryButton, HapticButton } from '@/components/ui/haptic-button';
import { IOSCard } from '@/components/ui/ios-navigation';
import { IOSAlert } from '@/components/ui/ios-components';
import { AuthForms } from '@/components/AuthForms';
import { OperatorLogin } from '@/components/OperatorLogin';
import { CustomerDashboard } from '@/components/dashboards/CustomerDashboard';
import { OperatorDashboard } from '@/components/dashboards/OperatorDashboard';
import { OwnerDashboard } from '@/components/dashboards/OwnerDashboard';
import { MarketingDashboard } from '@/components/dashboards/MarketingDashboard';
import { WasherDashboard } from '@/components/washers/WasherDashboard';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, Shield, Star, Smartphone, Droplets, Timer, Users } from 'lucide-react';
import freshDropLogo from '@/assets/freshdrop-logo-transparent.png';

interface Service {
  id: string;
  name: string;
  title: string;
  description: string;
  price_display: string;
  duration_hours: number;
  icon_name: string;
  display_order: number;
}

// Icon mapping for database icon names
const iconMap: Record<string, any> = {
  droplets: Droplets,
  timer: Timer,
  'map-pin': MapPin,
  users: Users,
  smartphone: Smartphone,
  clock: Clock,
  shield: Shield,
  star: Star
};

// Fallback services (for when database is loading)
const fallbackServices = [
  {
    icon: Droplets,
    title: "Wash & Fold",
    description: "Professional washing, drying, and folding",
    price: "From $15",
    duration: "24 hours"
  },
  {
    icon: Timer,
    title: "Express Service",
    description: "Same-day laundry service",
    price: "From $25",
    duration: "4-6 hours"
  },
  {
    icon: MapPin,
    title: "Locker Pickup",
    description: "Drop off at smart lockers",
    price: "From $12",
    duration: "24-48 hours"
  },
  {
    icon: Users,
    title: "Door-to-Door",
    description: "Full pickup and delivery service",
    price: "From $20",
    duration: "24-48 hours"
  }
];

const features = [
  {
    icon: Smartphone,
    title: "Easy Mobile Ordering",
    description: "Place orders in seconds with our native app"
  },
  {
    icon: MapPin,
    title: "Real-Time Tracking",
    description: "Track your laundry from pickup to delivery"
  },
  {
    icon: Clock,
    title: "Flexible Scheduling",
    description: "Choose pickup and delivery times that work for you"
  },
  {
    icon: Shield,
    title: "100% Satisfaction",
    description: "We guarantee quality service or your money back"
  }
];

const steps = [
  {
    number: "1",
    title: "Schedule Pickup",
    description: "Choose your service type and schedule a convenient time"
  },
  {
    number: "2", 
    title: "We Collect",
    description: "Our team picks up your laundry from lockers or your door"
  },
  {
    number: "3",
    title: "Professional Care",
    description: "Your clothes are washed, dried, and folded with care"
  },
  {
    number: "4",
    title: "Fresh Delivery",
    description: "Receive your clean, fresh laundry at your chosen location"
  }
];

export function MobileHomepage() {
  const [currentTab, setCurrentTab] = useState('account'); // Default to sign in
  const [showOperatorLogin, setShowOperatorLogin] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [dbServices, setDbServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, userRole, loading: authLoading } = useAuth();
  const { isNative } = useCapacitor();

  // Load services from database
  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) {
        console.error('Error loading services:', error);
        return;
      }

      setDbServices(data || []);
    } catch (error) {
      console.error('Error loading services:', error);
    } finally {
      setLoading(false);
    }
  };

  // Route authenticated users to their dashboards
  if (user && userRole) {
    switch (userRole) {
      case 'customer':
        return <CustomerDashboard />;
      case 'operator':
        return <OperatorDashboard />;
      case 'owner':
        return <OwnerDashboard />;
      case 'marketing':
        return <MarketingDashboard />;
      case 'washer':
        return <WasherDashboard onBack={() => {}} />;
      default:
        return <CustomerDashboard />;
    }
  }

  if (authLoading || loading) {
    return (
      <IOSScreen>
        <IOSHeader title="FreshDrop" />
        <IOSContent>
          <div className="flex items-center justify-center h-64">
            <div className="ios-body text-muted-foreground">Loading...</div>
          </div>
        </IOSContent>
      </IOSScreen>
    );
  }

  const tabs = [
    { id: 'home', label: 'Home', icon: <div>🏠</div>, onClick: () => setCurrentTab('home') },
    { id: 'services', label: 'Services', icon: <div>📦</div>, onClick: () => setCurrentTab('services') },
    { id: 'how-it-works', label: 'How It Works', icon: <div>ℹ️</div>, onClick: () => setCurrentTab('how-it-works') },
    { id: 'account', label: 'Sign In', icon: <div>👤</div>, onClick: () => setCurrentTab('account') }
  ];

  const renderTabContent = () => {
    switch (currentTab) {
      case 'home':
        return (
          <IOSScrollView>
            {/* Hero Section */}
            <IOSSection>
              <div className="text-center py-8">
                <div className="mb-6">
                  <div className="flex justify-center mb-6">
                    <img 
                      src={freshDropLogo} 
                      alt="FreshDrop Logo" 
                      className="h-16 w-auto"
                    />
                  </div>
                  <h1 className="ios-title1 mb-4">Fresh Laundry, Delivered</h1>
                  <p className="ios-body text-muted-foreground mb-6">
                    Professional laundry service with smart locker pickup and door-to-door delivery
                  </p>
                </div>
                
                <div className="space-y-3 mb-8">
                  <IOSPrimaryButton 
                    className="w-full"
                    onClick={() => setCurrentTab('account')}
                  >
                    Get Started
                  </IOSPrimaryButton>
                  <IOSSecondaryButton 
                    className="w-full"
                    onClick={() => setCurrentTab('services')}
                  >
                    View Services
                  </IOSSecondaryButton>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="ios-title2 text-primary">24hr</div>
                    <div className="ios-caption text-muted-foreground">Turnaround</div>
                  </div>
                  <div className="text-center">
                    <div className="ios-title2 text-primary">$15</div>
                    <div className="ios-caption text-muted-foreground">Starting Price</div>
                  </div>
                </div>
              </div>
            </IOSSection>

            {/* Features */}
            <IOSSection title="Why Choose FreshDrop?">
              <div className="space-y-4">
                {features.map((feature, index) => {
                  const Icon = feature.icon;
                  return (
                    <IOSCard key={index}>
                      <div className="flex items-start space-x-3 p-4">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                            <Icon className="w-5 h-5 text-primary" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <h3 className="ios-headline mb-1">{feature.title}</h3>
                          <p className="ios-subhead text-muted-foreground">{feature.description}</p>
                        </div>
                      </div>
                    </IOSCard>
                  );
                })}
              </div>
            </IOSSection>

            {/* Testimonials */}
            <IOSSection title="What Our Customers Say">
              <IOSCard>
                <div className="p-4">
                  <div className="flex items-center mb-3">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="ios-body mb-3">
                    "FreshDrop has transformed my weekly routine. The smart lockers are so convenient!"
                  </p>
                  <p className="ios-caption text-muted-foreground">Sarah M., San Francisco</p>
                </div>
              </IOSCard>
            </IOSSection>
          </IOSScrollView>
        );

      case 'services':
        return (
          <IOSScrollView>
            <IOSSection title="Our Services">
              <div className="space-y-4">
                {dbServices.length > 0 ? dbServices.map((service) => {
                  const Icon = iconMap[service.icon_name] || Droplets;
                  const durationText = service.duration_hours < 24 
                    ? `${service.duration_hours} hours`
                    : `${Math.round(service.duration_hours / 24)} days`;
                  
                  return (
                    <IOSCard key={service.id}>
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                              <Icon className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <h3 className="ios-headline">{service.title}</h3>
                              <p className="ios-caption text-muted-foreground">{durationText}</p>
                            </div>
                          </div>
                          <Badge variant="secondary">{service.price_display}</Badge>
                        </div>
                        <p className="ios-subhead text-muted-foreground">{service.description}</p>
                      </div>
                    </IOSCard>
                  );
                }) : fallbackServices.map((service, index) => {
                  const Icon = service.icon;
                  return (
                    <IOSCard key={index}>
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                              <Icon className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <h3 className="ios-headline">{service.title}</h3>
                              <p className="ios-caption text-muted-foreground">{service.duration}</p>
                            </div>
                          </div>
                          <Badge variant="secondary">{service.price}</Badge>
                        </div>
                        <p className="ios-subhead text-muted-foreground">{service.description}</p>
                      </div>
                    </IOSCard>
                  );
                })}
              </div>
            </IOSSection>

            <IOSSection>
              <IOSPrimaryButton 
                className="w-full"
                onClick={() => setCurrentTab('account')}
              >
                Order Now
              </IOSPrimaryButton>
            </IOSSection>
          </IOSScrollView>
        );

      case 'how-it-works':
        return (
          <IOSScrollView>
            <IOSSection title="How It Works">
              <div className="space-y-6">
                {steps.map((step, index) => (
                  <div key={index} className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                        <span className="ios-callout text-primary-foreground font-semibold">
                          {step.number}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 pb-6">
                      <h3 className="ios-headline mb-2">{step.title}</h3>
                      <p className="ios-subhead text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </IOSSection>

            <IOSSection>
              <IOSPrimaryButton 
                className="w-full"
                onClick={() => setCurrentTab('account')}
              >
                Get Started
              </IOSPrimaryButton>
            </IOSSection>
          </IOSScrollView>
        );

      case 'account':
        return (
          <IOSScrollView>
            <IOSSection title="Sign In to Order">
              <div className="space-y-4">
                <p className="ios-body text-muted-foreground text-center">
                  Create an account or sign in to place your first laundry order
                </p>
                
                <Card className="border-border">
                  {showOperatorLogin ? (
                    <OperatorLogin onBack={() => setShowOperatorLogin(false)} />
                  ) : (
                    <AuthForms onOperatorLogin={() => setShowOperatorLogin(true)} />
                  )}
                </Card>
              </div>
            </IOSSection>
          </IOSScrollView>
        );

      default:
        return null;
    }
  };

  return (
    <IOSScreen>
      <IOSHeader 
        title="FreshDrop"
        rightButton={{
          text: "Help",
          onClick: () => setShowAlert(true)
        }}
      />
      
      <IOSContent>
        {renderTabContent()}
      </IOSContent>

      <IOSTabBar
        tabs={tabs}
        activeTab={currentTab}
      />

      {showAlert && (
        <IOSAlert
          variant="info"
          title="Need Help?"
          onDismiss={() => setShowAlert(false)}
        >
          Contact support at support@freshdrop.com or call (555) 123-WASH
        </IOSAlert>
      )}
    </IOSScreen>
  );
}
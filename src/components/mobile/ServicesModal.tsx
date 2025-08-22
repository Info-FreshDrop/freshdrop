import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Package, Zap, Home } from 'lucide-react';

interface ServicesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ServicesModal({ isOpen, onClose }: ServicesModalProps) {
  const services = [
    {
      icon: Clock,
      title: "24-Hour Turnaround",
      price: "Standard Service",
      description: "Standard orders processed and returned within 24 hours of pickup",
      features: ["Professional cleaning", "Eco-friendly products", "Careful handling"]
    },
    {
      icon: Zap,
      title: "Express Service",
      price: "Same Day",
      description: "Place by 12 PM, get it back by 8 PM the same day",
      features: ["4-hour turnaround", "Priority processing", "Rush delivery"],
      badge: "POPULAR"
    },
    {
      icon: Package,
      title: "Locker Pickup",
      price: "24/7 Access",
      description: "Drop off at any FreshDrop locker and pick up when ready",
      features: ["Convenient locations", "Secure storage", "Mobile app access"]
    },
    {
      icon: Home,
      title: "Door-to-Door",
      price: "Full Service",
      description: "Pickup and delivery from your home, office, or dorm",
      features: ["Free pickup & delivery", "Scheduled windows", "Contact-free option"]
    }
  ];

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="max-h-[80vh] rounded-t-xl">
        <SheetHeader className="text-left">
          <SheetTitle className="ios-title2">Our Services</SheetTitle>
          <p className="ios-body text-muted-foreground">Professional laundry solutions for your lifestyle</p>
        </SheetHeader>
        
        <div className="mt-6 space-y-4">
          {services.map((service, index) => {
            const Icon = service.icon;
            return (
              <Card key={index} className="p-4 border-border bg-card">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="ios-headline">{service.title}</h3>
                        {service.badge && (
                          <Badge variant="secondary" className="ios-caption2">
                            {service.badge}
                          </Badge>
                        )}
                      </div>
                      <p className="ios-footnote text-primary font-semibold">{service.price}</p>
                    </div>
                  </div>
                </div>
                
                <p className="ios-body text-muted-foreground mb-3">{service.description}</p>
                
                <div className="space-y-1">
                  {service.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-center">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full mr-2"></div>
                      <span className="ios-footnote text-muted-foreground">{feature}</span>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>

        <div className="mt-6 p-4 bg-primary/5 rounded-xl border border-primary/20">
          <h3 className="ios-headline text-primary mb-2">Service Areas</h3>
          <p className="ios-body text-muted-foreground">
            Currently serving downtown, midtown, and select suburban areas. 
            Check availability during order placement.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
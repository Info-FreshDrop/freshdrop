import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Card } from '@/components/ui/card';
import { MapPin, Package, Sparkles } from 'lucide-react';

interface HowItWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HowItWorksModal({ isOpen, onClose }: HowItWorksModalProps) {
  const steps = [
    {
      icon: MapPin,
      title: "Drop Off",
      description: "Find a FreshDrop locker near you or schedule a pickup from your door"
    },
    {
      icon: Package,
      title: "We Clean",
      description: "Our professional team washes, dries, and folds your clothes with care"
    },
    {
      icon: Sparkles,
      title: "Pick Up",
      description: "Get notified when ready and collect your fresh, clean laundry"
    }
  ];

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="max-h-[80vh] rounded-t-xl">
        <SheetHeader className="text-left">
          <SheetTitle className="ios-title2">How It Works</SheetTitle>
          <p className="ios-body text-muted-foreground">Our simple 3-step process</p>
        </SheetHeader>
        
        <div className="mt-6 space-y-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <Card key={index} className="p-4 border-border bg-card">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="ios-headline mb-1">{step.title}</h3>
                    <p className="ios-body text-muted-foreground">{step.description}</p>
                  </div>
                  <div className="flex-shrink-0 w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center">
                    <span className="ios-caption1 font-semibold text-primary">{index + 1}</span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <div className="mt-6 p-4 bg-primary/5 rounded-xl border border-primary/20">
          <h3 className="ios-headline text-primary mb-2">Why Choose FreshDrop?</h3>
          <ul className="space-y-1 ios-body text-muted-foreground">
            <li>• Professional cleaning with eco-friendly products</li>
            <li>• Convenient locker network across the city</li>
            <li>• Real-time tracking and notifications</li>
            <li>• Flexible pickup and delivery options</li>
          </ul>
        </div>
      </SheetContent>
    </Sheet>
  );
}
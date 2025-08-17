import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { AuthForms } from '@/components/AuthForms';
import { OperatorLogin } from '@/components/OperatorLogin';
import { IOSScreen, IOSContent } from '@/components/ui/ios-layout';
import { IOSPrimaryButton } from '@/components/ui/haptic-button';
import { IOSActionSheet } from '@/components/ui/ios-components';
import { HowItWorksModal } from './HowItWorksModal';
import { ServicesModal } from './ServicesModal';
import { ContactModal } from './ContactModal';
import { LogIn, Info, Phone, Users } from 'lucide-react';
import freshDropLogo from '@/assets/freshdrop-logo-transparent.png';

type BottomTab = 'auth' | 'learn' | 'contact' | 'operator';

export function MobileApp() {
  const [activeTab, setActiveTab] = useState<BottomTab>('auth');
  const [showOperatorLogin, setShowOperatorLogin] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [showServices, setShowServices] = useState(false);
  const [showContact, setShowContact] = useState(false);

  const tabs = [
    { id: 'auth' as const, label: 'Sign In', icon: LogIn },
    { id: 'learn' as const, label: 'Learn More', icon: Info },
    { id: 'contact' as const, label: 'Contact', icon: Phone },
    { id: 'operator' as const, label: 'Operators', icon: Users },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'auth':
        return (
          <div className="px-4 py-6 space-y-6">
            {/* Logo Section */}
            <div className="text-center mb-8">
              <img 
                src={freshDropLogo} 
                alt="FreshDrop" 
                className="h-16 w-auto mx-auto mb-4"
              />
              <h1 className="ios-title1 text-foreground mb-2">Welcome to FreshDrop</h1>
              <p className="ios-body text-muted-foreground">
                Professional laundry service made simple
              </p>
            </div>

            {/* Auth Forms */}
            <Card className="border-border bg-card rounded-xl overflow-hidden">
              {showOperatorLogin ? (
                <OperatorLogin onBack={() => setShowOperatorLogin(false)} />
              ) : (
                <AuthForms onOperatorLogin={() => setShowOperatorLogin(true)} />
              )}
            </Card>
          </div>
        );

      case 'learn':
        return (
          <div className="px-4 py-6 space-y-4">
            <h2 className="ios-title2 text-foreground mb-6">Learn More</h2>
            
            <Card className="p-4 border-border bg-card rounded-xl">
              <h3 className="ios-headline mb-2">How It Works</h3>
              <p className="ios-body text-muted-foreground mb-4">
                Discover our simple 3-step process for fresh, clean laundry
              </p>
              <IOSPrimaryButton 
                onClick={() => setShowHowItWorks(true)}
                className="w-full"
              >
                Learn How It Works
              </IOSPrimaryButton>
            </Card>

            <Card className="p-4 border-border bg-card rounded-xl">
              <h3 className="ios-headline mb-2">Our Services</h3>
              <p className="ios-body text-muted-foreground mb-4">
                Explore our wash & fold, express, and pickup services
              </p>
              <IOSPrimaryButton 
                onClick={() => setShowServices(true)}
                className="w-full"
              >
                View Services
              </IOSPrimaryButton>
            </Card>
          </div>
        );

      case 'contact':
        return (
          <div className="px-4 py-6 space-y-4">
            <h2 className="ios-title2 text-foreground mb-6">Contact Us</h2>
            <IOSPrimaryButton 
              onClick={() => setShowContact(true)}
              className="w-full"
            >
              Get Support
            </IOSPrimaryButton>
          </div>
        );

      case 'operator':
        return (
          <div className="px-4 py-6 space-y-4">
            <h2 className="ios-title2 text-foreground mb-6">For Operators</h2>
            
            <Card className="p-4 border-border bg-card rounded-xl">
              <h3 className="ios-headline mb-2">Join Our Team</h3>
              <p className="ios-body text-muted-foreground mb-4">
                Become a FreshDrop operator and start earning
              </p>
              <IOSPrimaryButton 
                onClick={() => {
                  setActiveTab('auth');
                  setShowOperatorLogin(true);
                }}
                className="w-full"
              >
                Operator Login
              </IOSPrimaryButton>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <IOSScreen className="bg-background">
      <IOSContent className="pb-20">
        {renderContent()}
      </IOSContent>

      {/* Bottom Tab Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border safe-area-bottom">
        <div className="flex items-center justify-around h-16 max-w-md mx-auto px-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center flex-1 py-2 ios-touch ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <Icon className="h-5 w-5 mb-1" />
                <span className="ios-caption2 font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Modals */}
      <HowItWorksModal 
        isOpen={showHowItWorks} 
        onClose={() => setShowHowItWorks(false)} 
      />
      <ServicesModal 
        isOpen={showServices} 
        onClose={() => setShowServices(false)} 
      />
      <ContactModal 
        isOpen={showContact} 
        onClose={() => setShowContact(false)} 
      />
    </IOSScreen>
  );
}
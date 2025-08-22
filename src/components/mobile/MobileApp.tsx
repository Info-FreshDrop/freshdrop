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
import { FAQModal } from './FAQModal';
import { OperatorModal } from './OperatorModal';
import { LogIn, Info, Phone } from 'lucide-react';
import freshDropLogo from '@/assets/freshdrop-logo-transparent.png';

type BottomTab = 'auth' | 'learn' | 'contact';

export function MobileApp() {
  const [activeTab, setActiveTab] = useState<BottomTab>('auth');
  const [showOperatorLogin, setShowOperatorLogin] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [showServices, setShowServices] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [showFAQ, setShowFAQ] = useState(false);
  const [showOperator, setShowOperator] = useState(false);

  const tabs = [
    { id: 'auth' as const, label: 'Sign In', icon: LogIn },
    { id: 'learn' as const, label: 'Learn More', icon: Info },
    { id: 'contact' as const, label: 'Contact', icon: Phone },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'auth':
        return (
          <div className="mobile-spacing responsive-padding responsive-gap">
            {/* Logo Section */}
            <div className="text-center mb-6 sm:mb-8 lg:mb-12">
              <img 
                src="/lovable-uploads/400d5514-59e3-4714-8281-fc739cf00f88.png" 
                alt="FreshDrop" 
                className="h-16 sm:h-20 lg:h-24 xl:h-28 w-auto mx-auto mb-4 sm:mb-6"
              />
              <h1 className="ios-title1 text-foreground mb-2 sm:mb-4">Laundry made easy</h1>
              <p className="ios-body text-muted-foreground max-w-lg mx-auto leading-relaxed">
                Professional laundry service with 24-hour turnaround. 
                Drop off at any locker or schedule pickup & delivery. 
                Eco-friendly, secure, and contactless.
              </p>
            </div>

            {/* Auth Forms */}
            <Card className="border-border bg-card rounded-xl overflow-hidden max-w-md mx-auto w-full">
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
          <div className="mobile-spacing responsive-padding responsive-gap">
            <h2 className="ios-title2 text-foreground mb-6 sm:mb-8 text-center">Learn More</h2>
            
            <div className="responsive-grid max-w-4xl mx-auto">
              <Card className="responsive-padding border-border bg-card rounded-xl">
                <h3 className="ios-headline mb-2 sm:mb-4">How It Works</h3>
                <p className="ios-body text-muted-foreground mb-4 sm:mb-6 leading-relaxed">
                  Discover our simple 3-step process for fresh, clean laundry
                </p>
                <IOSPrimaryButton 
                  onClick={() => setShowHowItWorks(true)}
                  className="w-full"
                >
                  Learn How It Works
                </IOSPrimaryButton>
              </Card>

              <Card className="responsive-padding border-border bg-card rounded-xl">
                <h3 className="ios-headline mb-2 sm:mb-4">Our Services</h3>
                <p className="ios-body text-muted-foreground mb-4 sm:mb-6 leading-relaxed">
                  24-hour turnaround, express service, locker pickup & door-to-door
                </p>
                <IOSPrimaryButton 
                  onClick={() => setShowServices(true)}
                  className="w-full"
                >
                  View Services
                </IOSPrimaryButton>
              </Card>

              <Card className="responsive-padding border-border bg-card rounded-xl">
                <h3 className="ios-headline mb-2 sm:mb-4">FAQ</h3>
                <p className="ios-body text-muted-foreground mb-4 sm:mb-6 leading-relaxed">
                  Everything you need to know about FreshDrop's laundry service
                </p>
                <IOSPrimaryButton 
                  onClick={() => setShowFAQ(true)}
                  className="w-full"
                >
                  View FAQ
                </IOSPrimaryButton>
              </Card>

              <Card className="responsive-padding border-border bg-card rounded-xl">
                <h3 className="ios-headline mb-2 sm:mb-4">Become an Operator</h3>
                <p className="ios-body text-muted-foreground mb-4 sm:mb-6 leading-relaxed">
                  Be your own boss! Join our network and start earning money
                </p>
                <IOSPrimaryButton 
                  onClick={() => setShowOperator(true)}
                  className="w-full"
                >
                  Apply Now
                </IOSPrimaryButton>
              </Card>
            </div>
          </div>
        );

      case 'contact':
        return (
          <div className="mobile-spacing responsive-padding responsive-gap">
            <h2 className="ios-title2 text-foreground mb-6 sm:mb-8 text-center">Contact Us</h2>
            <div className="max-w-md mx-auto">
              <IOSPrimaryButton 
                onClick={() => setShowContact(true)}
                className="w-full"
              >
                Get Support
              </IOSPrimaryButton>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <IOSScreen className="bg-gradient-to-b from-primary/20 to-primary/5">
      <IOSContent className="pb-20 sm:pb-24">
        {renderContent()}
      </IOSContent>

      {/* Responsive Bottom Tab Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border safe-area-bottom">
        <div className="flex items-center justify-around h-16 sm:h-20 responsive-container px-2 sm:px-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center flex-1 py-2 sm:py-3 ios-touch transition-colors ${
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="h-5 w-5 sm:h-6 sm:w-6 mb-1" />
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
      <FAQModal 
        isOpen={showFAQ} 
        onClose={() => setShowFAQ(false)} 
      />
      <OperatorModal 
        isOpen={showOperator} 
        onClose={() => setShowOperator(false)} 
      />
    </IOSScreen>
  );
}
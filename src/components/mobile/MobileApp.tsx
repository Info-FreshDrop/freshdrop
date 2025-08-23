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
          <div className="relative min-h-screen">
            {/* Background Image - Positioned at top */}
            <div 
              className="absolute inset-0 bg-contain bg-top bg-no-repeat"
              style={{
                backgroundImage: `url('/lovable-uploads/efb21ff1-6eb6-47f0-b000-a1e8ee6ff1e2.png')`
              }}
            />
            
            {/* Content Overlay */}
            <div className="relative z-10 min-h-screen flex flex-col">
              {/* Compact Header Text - Above the lady's head */}
              <div className="text-center pt-8 pb-2 px-6">
                <h2 className="text-xl font-bold text-white drop-shadow-lg mb-2">Laundry made easy</h2>
                
                <p className="text-white/90 text-xs leading-tight max-w-48 mx-auto drop-shadow-md">
                  Professional laundry service with 24-hour turnaround. Drop off at any locker.
                </p>
              </div>

              {/* Spacer to position form below her arms */}
              <div style={{ height: '50vh' }}></div>

              {/* Auth Forms positioned below the lady's arms */}
              <div className="px-8 pb-20">
                <Card className="bg-white/98 backdrop-blur-sm border-0 rounded-2xl shadow-xl max-w-sm w-full mx-auto">
                  {showOperatorLogin ? (
                    <OperatorLogin onBack={() => setShowOperatorLogin(false)} />
                  ) : (
                    <AuthForms onOperatorLogin={() => setShowOperatorLogin(true)} />
                  )}
                </Card>
              </div>
            </div>
          </div>
        );

      case 'learn':
        return (
          <div className="mobile-spacing responsive-padding responsive-gap">
            <h2 className="ios-title2 text-foreground mb-6 sm:mb-8 text-center">Learn More</h2>
            
            <div className="space-y-6 max-w-4xl mx-auto">
              {/* Hero Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card className="responsive-padding border-0 bg-gradient-to-br from-primary/10 via-primary/5 to-background shadow-lg">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                      <Info className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="ios-headline text-foreground">How It Works</h3>
                  </div>
                  <p className="ios-body text-muted-foreground mb-4 leading-relaxed">
                    Discover our simple 3-step process for fresh, clean laundry
                  </p>
                  <IOSPrimaryButton 
                    onClick={() => setShowHowItWorks(true)}
                    className="w-full bg-primary hover:bg-primary/90"
                  >
                    Learn How It Works
                  </IOSPrimaryButton>
                </Card>

                <Card className="responsive-padding border-0 bg-gradient-to-br from-secondary/10 via-secondary/5 to-background shadow-lg">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 bg-secondary/20 rounded-full flex items-center justify-center">
                      <LogIn className="h-5 w-5 text-secondary" />
                    </div>
                    <h3 className="ios-headline text-foreground">Our Services</h3>
                  </div>
                  <p className="ios-body text-muted-foreground mb-4 leading-relaxed">
                    24-hour turnaround, express service, locker pickup & door-to-door
                  </p>
                  <IOSPrimaryButton 
                    onClick={() => setShowServices(true)}
                    className="w-full bg-secondary hover:bg-secondary/90"
                    variant="secondary"
                  >
                    View Services
                  </IOSPrimaryButton>
                </Card>

                <Card className="responsive-padding border-0 bg-gradient-to-br from-accent/10 via-accent/5 to-background shadow-lg">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 bg-accent/20 rounded-full flex items-center justify-center">
                      <Phone className="h-5 w-5 text-accent" />
                    </div>
                    <h3 className="ios-headline text-foreground">FAQ</h3>
                  </div>
                  <p className="ios-body text-muted-foreground mb-4 leading-relaxed">
                    Everything you need to know about FreshDrop's laundry service
                  </p>
                  <IOSPrimaryButton 
                    onClick={() => setShowFAQ(true)}
                    className="w-full bg-accent hover:bg-accent/90"
                    variant="outline"
                  >
                    View FAQ
                  </IOSPrimaryButton>
                </Card>

                <Card className="responsive-padding border-0 bg-gradient-to-br from-primary/10 via-primary/5 to-background shadow-lg">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                      <Info className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="ios-headline text-foreground">Become an Operator</h3>
                  </div>
                  <p className="ios-body text-muted-foreground mb-4 leading-relaxed">
                    Be your own boss! Join our network and start earning money
                  </p>
                  <IOSPrimaryButton 
                    onClick={() => setShowOperator(true)}
                    className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                  >
                    Apply Now
                  </IOSPrimaryButton>
                </Card>
              </div>

              {/* Why Choose FreshDrop Section */}
              <Card className="responsive-padding border-0 bg-gradient-to-r from-primary/5 to-secondary/5 shadow-lg">
                <h3 className="ios-title3 text-center mb-4 text-primary">Why Choose FreshDrop?</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                  <div className="flex flex-col items-center space-y-2">
                    <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                    </div>
                    <span className="ios-body text-muted-foreground">Professional-grade cleaning</span>
                  </div>
                  <div className="flex flex-col items-center space-y-2">
                    <div className="w-8 h-8 bg-secondary/20 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-secondary rounded-full"></div>
                    </div>
                    <span className="ios-body text-muted-foreground">Real-time order tracking</span>
                  </div>
                  <div className="flex flex-col items-center space-y-2">
                    <div className="w-8 h-8 bg-accent/20 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-accent rounded-full"></div>
                    </div>
                    <span className="ios-body text-muted-foreground">Satisfaction guaranteed</span>
                  </div>
                </div>
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
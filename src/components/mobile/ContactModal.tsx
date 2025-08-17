import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Card } from '@/components/ui/card';
import { IOSPrimaryButton } from '@/components/ui/haptic-button';
import { Mail, Phone, Clock, MessageCircle, HelpCircle } from 'lucide-react';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ContactModal({ isOpen, onClose }: ContactModalProps) {
  const contactMethods = [
    {
      icon: Phone,
      title: "Call Us",
      value: "(555) 123-WASH",
      description: "Speak directly with our support team",
      action: () => window.open('tel:+15551239274', '_self')
    },
    {
      icon: Mail,
      title: "Email Support",
      value: "support@freshdrop.com", 
      description: "Get detailed help via email",
      action: () => window.open('mailto:support@freshdrop.com', '_self')
    },
    {
      icon: MessageCircle,
      title: "Live Chat",
      value: "Available 7 AM - 10 PM",
      description: "Chat with us in real-time",
      action: () => {
        // This would trigger the chat widget
        console.log('Open chat widget');
      }
    }
  ];

  const faqItems = [
    {
      question: "How long does washing take?",
      answer: "Standard service: 24-48 hours. Express service: 4-6 hours."
    },
    {
      question: "What if I'm not satisfied?",
      answer: "We offer 100% satisfaction guarantee. We'll re-clean for free or refund your order."
    },
    {
      question: "Are your products eco-friendly?",
      answer: "Yes! We use biodegradable, hypoallergenic detergents safe for you and the environment."
    }
  ];

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="max-h-[80vh] rounded-t-xl">
        <SheetHeader className="text-left">
          <SheetTitle className="ios-title2">Contact & Support</SheetTitle>
        </SheetHeader>
        
        <div className="mt-6 space-y-6">
          {/* Contact Methods */}
          <div className="space-y-3">
            <h3 className="ios-headline">Get in Touch</h3>
            {contactMethods.map((method, index) => {
              const Icon = method.icon;
              return (
                <Card key={index} className="p-4 border-border bg-card">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="ios-body font-semibold">{method.title}</h4>
                        <p className="ios-footnote text-primary">{method.value}</p>
                        <p className="ios-caption1 text-muted-foreground">{method.description}</p>
                      </div>
                    </div>
                    <IOSPrimaryButton 
                      size="sm"
                      onClick={method.action}
                    >
                      Contact
                    </IOSPrimaryButton>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Hours */}
          <Card className="p-4 border-border bg-card">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="ios-body font-semibold">Support Hours</h4>
                <p className="ios-footnote text-muted-foreground">7 AM - 10 PM daily</p>
                <p className="ios-caption1 text-muted-foreground">Response within 15 minutes during business hours</p>
              </div>
            </div>
          </Card>

          {/* Quick FAQ */}
          <div className="space-y-3">
            <h3 className="ios-headline">Quick Answers</h3>
            {faqItems.map((item, index) => (
              <Card key={index} className="p-4 border-border bg-card">
                <div className="flex items-start space-x-3">
                  <HelpCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="ios-body font-semibold mb-1">{item.question}</h4>
                    <p className="ios-footnote text-muted-foreground">{item.answer}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
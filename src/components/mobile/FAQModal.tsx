import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Clock, MapPin, Home, Zap, Leaf, Package, HelpCircle } from 'lucide-react';

interface FAQModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FAQModal({ isOpen, onClose }: FAQModalProps) {
  const faqs = [
    {
      icon: Clock,
      question: "What's the turnaround time?",
      answer: "Standard orders have a 24-hour turnaround from pickup to drop-off. Express service (orders placed by 12 PM) is returned by 8 PM the same day."
    },
    {
      icon: MapPin,
      question: "How do I use a locker?",
      answer: "Simply drop your laundry bag in any available FreshDrop locker, then scan the QR code or enter the locker number in our app. You'll get notifications when ready for pickup."
    },
    {
      icon: Home,
      question: "Where do you pick up from?",
      answer: "We offer pickup and delivery from homes, apartments, offices, dormitories, and businesses. As long as you're in our service area, we can arrange pickup."
    },
    {
      icon: Package,
      question: "What happens if I'm not home?",
      answer: "No problem! You can leave your laundry bag at your door, front desk, or designated pickup spot. We'll text you pickup confirmation with a photo."
    },
    {
      icon: Zap,
      question: "What if I need same-day service?",
      answer: "Our express service guarantees same-day return for orders placed by 12 PM. This service is available in select zip codes and may have a premium charge."
    },
    {
      icon: Leaf,
      question: "What detergent do you use?",
      answer: "We use eco-friendly, hypoallergenic detergents by default. You can specify your preferences in the app, including fragrance-free or sensitive skin formulas."
    },
    {
      icon: Package,
      question: "Can I send in my own bag?",
      answer: "Absolutely! You can use any bag you prefer - laundry bags, garbage bags, or even a pillowcase. We'll return your clean laundry in the same bag type."
    },
    {
      icon: HelpCircle,
      question: "How do I track my order?",
      answer: "Once you place an order, you'll receive real-time updates through the app and SMS. You can track pickup, washing, and delivery status with photo confirmations."
    }
  ];

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="max-h-[80vh] rounded-t-xl">
        <SheetHeader className="text-left">
          <SheetTitle className="ios-title2">Frequently Asked Questions</SheetTitle>
          <p className="ios-body text-muted-foreground">Everything you need to know about FreshDrop</p>
        </SheetHeader>
        
        <div className="mt-6">
          <Accordion type="single" collapsible className="w-full space-y-3">
            {faqs.map((faq, index) => {
              const Icon = faq.icon;
              return (
                <AccordionItem 
                  key={index} 
                  value={`item-${index}`}
                  className="border rounded-lg bg-card"
                >
                  <AccordionTrigger className="text-left px-4 py-3 hover:no-underline">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <span className="ios-headline">{faq.question}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-3 text-muted-foreground ios-body">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>

        <div className="mt-6 p-4 bg-primary/5 rounded-xl border border-primary/20">
          <h3 className="ios-headline text-primary mb-2">Still have questions?</h3>
          <p className="ios-body text-muted-foreground">
            Contact our support team for personalized help with your laundry needs.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
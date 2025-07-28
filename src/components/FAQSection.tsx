import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Clock, MapPin, Home, Zap, Leaf, Package, HelpCircle } from "lucide-react";

export function FAQSection() {
  const faqs = [
    {
      icon: Clock,
      question: "What's the turnaround time?",
      answer: "Standard orders have a 24-hour turnaround from pickup to drop-off. Express service (orders placed by 12 PM) is returned by 8 PM the same day. We guarantee these timeframes for all orders in our service areas."
    },
    {
      icon: MapPin,
      question: "How do I use a locker?",
      answer: "Simply drop your laundry bag in any available FreshDrop locker, then scan the QR code or enter the locker number in our app. Select your service preferences, and we'll handle the rest. You'll get notifications when your laundry is ready for pickup at the same locker."
    },
    {
      icon: Home,
      question: "Where do you pick up from?",
      answer: "We offer pickup and delivery from homes, apartments, offices, dormitories, and businesses. As long as you're in our service area, we can arrange pickup from your preferred location. Check our app to confirm service availability in your zip code."
    },
    {
      icon: Package,
      question: "What happens if I'm not home?",
      answer: "No problem! You can leave your laundry bag at your door, front desk, or designated pickup spot. We'll text you pickup confirmation with a photo. For delivery, we'll place your clean laundry in the same location and send you a delivery confirmation."
    },
    {
      icon: Zap,
      question: "What if I need same-day service?",
      answer: "Our express service guarantees same-day return for orders placed by 12 PM. This service is available in select zip codes and may have a premium charge. Check the app when placing your order to see if express service is available in your area."
    },
    {
      icon: Leaf,
      question: "What detergent do you use?",
      answer: "We use eco-friendly, hypoallergenic detergents by default. You can specify your preferences in the app, including fragrance-free, sensitive skin formulas, or if you'd like us to use your own detergent. We accommodate most special requests for fabrics and allergies."
    },
    {
      icon: Package,
      question: "Can I send in my own bag?",
      answer: "Absolutely! You can use any bag you prefer - laundry bags, garbage bags, or even a pillowcase. We'll return your clean laundry in the same bag type. Just make sure it's clearly marked with your name or order number for easy identification."
    },
    {
      icon: HelpCircle,
      question: "How do I track my order?",
      answer: "Once you place an order, you'll receive real-time updates through the app and SMS. You can track when your laundry is picked up, when washing begins, and when it's ready for delivery or locker pickup. We also send photos at pickup and delivery for your peace of mind."
    }
  ];

  return (
    <section className="py-20 px-6 bg-background">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-primary bg-clip-text text-transparent">
            Frequently Asked Questions
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Everything you need to know about FreshDrop's laundry service. 
            Can't find what you're looking for? Contact our support team.
          </p>
        </div>

        <div className="bg-card/50 backdrop-blur-sm rounded-2xl border shadow-soft p-6">
          <Accordion type="single" collapsible className="w-full space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem 
                key={index} 
                value={`item-${index}`}
                className="border rounded-lg px-4 bg-background/50 shadow-sm hover:shadow-md transition-all duration-300"
              >
                <AccordionTrigger className="text-left py-4 hover:no-underline group">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-gradient-wave group-hover:bg-gradient-primary transition-all duration-300">
                      <faq.icon className="h-4 w-4 text-primary group-hover:text-primary-foreground" />
                    </div>
                    <span className="font-semibold text-base">{faq.question}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4 pt-2 text-muted-foreground leading-relaxed ml-11">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* Become an Operator Section */}
        <div className="mt-12">
          <div className="p-6 bg-gradient-primary rounded-xl border text-center">
            <h3 className="text-xl font-bold mb-3 text-primary-foreground">Want to Become an Operator?</h3>
            <p className="text-primary-foreground/90 mb-4">
              Be your own boss! Join our network of independent operators and start earning money doing laundry pickups and deliveries.
            </p>
            <Button 
              variant="secondary" 
              size="lg"
              onClick={() => {
                const operatorForm = document.querySelector('#operator-application');
                if (operatorForm) {
                  operatorForm.scrollIntoView({ behavior: 'smooth' });
                }
              }}
            >
              Apply Now
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
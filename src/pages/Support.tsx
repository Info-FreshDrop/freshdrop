import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ChatWidget } from "@/components/customer/ChatWidget";
import { Phone, Mail, Clock, MapPin, MessageCircle, HelpCircle, Truck, CreditCard } from "lucide-react";

const Support = () => {
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  const contactMethods = [
    {
      icon: Phone,
      title: "Phone Support",
      value: "(555) 123-4567",
      description: "Call us for immediate assistance",
      action: "tel:+15551234567"
    },
    {
      icon: Mail,
      title: "Email Support",
      value: "support@freshdrop.com",
      description: "Email us for detailed inquiries",
      action: "mailto:support@freshdrop.com"
    },
    {
      icon: MessageCircle,
      title: "Live Chat",
      value: "AI Assistant",
      description: "Chat with our AI assistant below",
      action: "scroll"
    }
  ];

  const supportHours = [
    { day: "Monday - Friday", hours: "8:00 AM - 8:00 PM EST" },
    { day: "Saturday", hours: "9:00 AM - 6:00 PM EST" },
    { day: "Sunday", hours: "10:00 AM - 4:00 PM EST" }
  ];

  const faqTopics = [
    {
      icon: Truck,
      title: "Orders & Delivery",
      description: "Pickup times, delivery schedules, order status",
      questions: [
        "How do I track my order?",
        "What are your pickup and delivery times?",
        "Can I change my pickup address?",
        "What if I miss my scheduled pickup?"
      ]
    },
    {
      icon: CreditCard,
      title: "Billing & Payment",
      description: "Pricing, payment methods, billing issues",
      questions: [
        "What are your service rates?",
        "What payment methods do you accept?",
        "How do I update my payment information?",
        "Can I get a refund?"
      ]
    },
    {
      icon: HelpCircle,
      title: "Service Issues",
      description: "Quality concerns, lost items, special requests",
      questions: [
        "What if my clothes are damaged?",
        "How do you handle lost items?",
        "Can I request special care instructions?",
        "What is your satisfaction guarantee?"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-primary text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            How Can We Help?
          </h1>
          <p className="text-xl text-white/90 max-w-2xl mx-auto">
            Get instant answers with our AI assistant or contact our support team directly
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Contact Methods */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Contact Methods
                </CardTitle>
                <CardDescription>
                  Choose the best way to reach our support team
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  {contactMethods.map((method, index) => (
                    <div key={index} className="p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                      <method.icon className="h-8 w-8 text-primary mb-3" />
                      <h3 className="font-semibold mb-1">{method.title}</h3>
                      <p className="text-primary font-medium mb-2">{method.value}</p>
                      <p className="text-sm text-muted-foreground mb-3">{method.description}</p>
                      {method.action.startsWith('tel:') || method.action.startsWith('mailto:') ? (
                        <Button variant="outline" size="sm" asChild>
                          <a href={method.action}>Contact</a>
                        </Button>
                      ) : (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => document.getElementById('chat-section')?.scrollIntoView({ behavior: 'smooth' })}
                        >
                          Start Chat
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* FAQ Topics */}
            <Card>
              <CardHeader>
                <CardTitle>Frequently Asked Questions</CardTitle>
                <CardDescription>
                  Common questions organized by topic
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {faqTopics.map((topic, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div 
                        className="flex items-start gap-3 cursor-pointer"
                        onClick={() => setSelectedTopic(selectedTopic === topic.title ? null : topic.title)}
                      >
                        <topic.icon className="h-6 w-6 text-primary mt-1" />
                        <div className="flex-1">
                          <h3 className="font-semibold mb-1">{topic.title}</h3>
                          <p className="text-sm text-muted-foreground">{topic.description}</p>
                        </div>
                        <Button variant="ghost" size="sm">
                          {selectedTopic === topic.title ? "Hide" : "Show"}
                        </Button>
                      </div>
                      
                      {selectedTopic === topic.title && (
                        <div className="mt-4 pl-9 space-y-2">
                          {topic.questions.map((question, qIndex) => (
                            <div key={qIndex} className="text-sm p-2 bg-accent/30 rounded">
                              {question}
                            </div>
                          ))}
                          <p className="text-xs text-muted-foreground mt-3">
                            For detailed answers, please use our chat assistant below or contact support directly.
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Emergency Contact */}
            <Card className="border-destructive/20 bg-destructive/5">
              <CardHeader>
                <CardTitle className="text-destructive">Emergency Support</CardTitle>
                <CardDescription>
                  For urgent issues requiring immediate attention
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">24/7 Emergency Line</p>
                    <p className="text-sm text-muted-foreground">
                      Lost items, service failures, or urgent complaints
                    </p>
                  </div>
                  <Button variant="destructive" asChild>
                    <a href="tel:+15551234911">(555) 123-4911</a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Support Hours */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Support Hours
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {supportHours.map((schedule, index) => (
                  <div key={index}>
                    <div className="flex justify-between items-start">
                      <span className="font-medium text-sm">{schedule.day}</span>
                      <span className="text-sm text-muted-foreground text-right">
                        {schedule.hours}
                      </span>
                    </div>
                    {index < supportHours.length - 1 && <Separator className="mt-2" />}
                  </div>
                ))}
                <div className="pt-2">
                  <Badge variant="secondary" className="w-full justify-center">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      Currently Available
                    </div>
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Service Areas */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Service Coverage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Currently serving these metropolitan areas:
                </p>
                <div className="space-y-1 text-sm">
                  <div>• New York City</div>
                  <div>• Los Angeles</div>
                  <div>• Chicago</div>
                  <div>• Houston</div>
                  <div>• Philadelphia</div>
                </div>
                <Button variant="outline" size="sm" className="w-full mt-4">
                  Check Your Area
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* AI Chat Section */}
        <div id="chat-section" className="mt-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-4">AI Support Assistant</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Get instant answers to your questions with our AI-powered support assistant. 
              Available 24/7 to help with orders, billing, and general inquiries.
            </p>
          </div>
        </div>
      </div>

      {/* Chat Widget */}
      <ChatWidget />
    </div>
  );
};

export default Support;
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Shield, Award, CheckCircle } from "lucide-react";

export function TrustSection() {
  const operators = [
    {
      id: 1,
      name: "Alex Thompson",
      image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=300&h=300&fit=crop&crop=face",
      experience: "3 years",
      rating: 4.9,
      completedOrders: 1247,
      specialties: ["Delicates", "Express"],
      verified: true
    },
    {
      id: 2,
      name: "Maria Santos",
      image: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=300&h=300&fit=crop&crop=face",
      experience: "5 years",
      rating: 5.0,
      completedOrders: 2156,
      specialties: ["Eco-Friendly", "Stain Removal"],
      verified: true
    },
    {
      id: 3,
      name: "David Lee",
      image: "https://images.unsplash.com/photo-1605810230434-7631ac76ec81?w=300&h=300&fit=crop&crop=face",
      experience: "2 years",
      rating: 4.8,
      completedOrders: 892,
      specialties: ["Quick Turnaround", "Pickup/Delivery"],
      verified: true
    },
    {
      id: 4,
      name: "Rachel Martinez",
      image: "https://images.unsplash.com/photo-1649972904349-6e44c42644a7?w=300&h=300&fit=crop&crop=face",
      experience: "4 years",
      rating: 4.9,
      completedOrders: 1689,
      specialties: ["Premium Care", "Business Attire"],
      verified: true
    }
  ];

  const trustMetrics = [
    {
      icon: Shield,
      title: "Background Checked",
      description: "All operators undergo thorough background verification",
      value: "100%"
    },
    {
      icon: Award,
      title: "Customer Satisfaction",
      description: "Average rating across all completed orders",
      value: "4.9/5"
    },
    {
      icon: CheckCircle,
      title: "Orders Completed",
      description: "Successfully processed orders this month",
      value: "15,000+"
    }
  ];

  return (
    <section className="py-20 px-6 bg-background">
      <div className="max-w-6xl mx-auto">
        {/* Trust Metrics */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-primary bg-clip-text text-transparent">
            Trusted by Thousands
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed mb-12">
            Our professional operators are the heart of our service. Each one is carefully vetted, 
            trained, and committed to providing exceptional care for your clothes.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {trustMetrics.map((metric, index) => (
              <Card key={index} className="border-0 shadow-soft hover:shadow-glow transition-all duration-300">
                <CardHeader className="text-center pb-2">
                  <div className="flex justify-center mb-4">
                    <div className="p-3 rounded-full bg-gradient-primary">
                      <metric.icon className="h-8 w-8 text-primary-foreground" />
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-primary mb-2">{metric.value}</div>
                  <CardTitle className="text-lg">{metric.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-center pt-0">
                  <p className="text-sm text-muted-foreground">{metric.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Featured Operators */}
        <div className="mb-16">
          <h3 className="text-3xl font-bold text-center mb-12 text-primary">Meet Our Featured Operators</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {operators.map((operator) => (
              <Card key={operator.id} className="border-0 shadow-soft hover:shadow-glow transition-all duration-300 overflow-hidden group">
                <div className="relative">
                  <img 
                    src={operator.image}
                    alt={`${operator.name} - Professional Operator`}
                    className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {operator.verified && (
                    <Badge className="absolute top-3 right-3 bg-green-500 hover:bg-green-600">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  )}
                </div>
                
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{operator.name}</CardTitle>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center">
                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
                      <span className="text-sm font-semibold ml-1">{operator.rating}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground">{operator.experience} exp</span>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    <div className="text-xs text-muted-foreground">
                      {operator.completedOrders.toLocaleString()} orders completed
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {operator.specialties.map((specialty, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {specialty}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Process Transparency */}
        <div className="bg-gradient-wave rounded-2xl p-8 border shadow-soft">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold mb-4 text-primary">Complete Process Transparency</h3>
            <p className="text-muted-foreground">
              We believe in full transparency. Every step of your laundry process is documented and tracked.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <img 
                src="https://images.unsplash.com/photo-1487058792275-0ad4aaf24ca7?w=400&h=250&fit=crop"
                alt="Order tracking and documentation" 
                className="w-full h-32 object-cover rounded-lg mb-4"
              />
              <h4 className="font-semibold mb-2">Real-Time Updates</h4>
              <p className="text-sm text-muted-foreground">Get photo updates at every step of the process</p>
            </div>
            <div className="text-center">
              <img 
                src="https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400&h=250&fit=crop"
                alt="Quality control systems" 
                className="w-full h-32 object-cover rounded-lg mb-4"
              />
              <h4 className="font-semibold mb-2">Quality Control</h4>
              <p className="text-sm text-muted-foreground">Multi-point quality checks ensure perfect results</p>
            </div>
            <div className="text-center">
              <img 
                src="https://images.unsplash.com/photo-1581090464777-f3220bbe1b8b?w=400&h=250&fit=crop"
                alt="Customer communication" 
                className="w-full h-32 object-cover rounded-lg mb-4"
              />
              <h4 className="font-semibold mb-2">Direct Communication</h4>
              <p className="text-sm text-muted-foreground">Chat directly with your assigned operator</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
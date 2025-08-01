import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Shield, Award, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// Icon mapping for dynamic icon rendering
const iconMap = {
  Shield,
  Award,
  CheckCircle,
};

export function TrustSection() {
  const [operators, setOperators] = useState([]);
  const [trustMetrics, setTrustMetrics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrustData();
  }, []);

  const fetchTrustData = async () => {
    try {
      // Fetch featured operators
      const { data: operatorsData, error: operatorsError } = await supabase
        .from('featured_operators')
        .select('*')
        .eq('is_featured', true)
        .order('display_order', { ascending: true });

      if (operatorsError) {
        console.error('Error fetching operators:', operatorsError);
      } else {
        setOperators(operatorsData || []);
      }

      // Fetch trust metrics
      const { data: metricsData, error: metricsError } = await supabase
        .from('trust_metrics')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (metricsError) {
        console.error('Error fetching trust metrics:', metricsError);
      } else {
        setTrustMetrics(metricsData || []);
      }
    } catch (error) {
      console.error('Error fetching trust data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <section className="py-20 px-6 bg-background">
        <div className="max-w-6xl mx-auto text-center">
          <div className="animate-pulse">Loading trust information...</div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 px-6 bg-background">
      <div className="max-w-6xl mx-auto">

        {/* Trust Metrics */}
        {trustMetrics.length > 0 && (
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-primary bg-clip-text text-transparent">
              Trusted by Thousands
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed mb-12">
              Our professional operators are the heart of our service. Each one is carefully vetted, 
              trained, and committed to providing exceptional care for your clothes.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
              {trustMetrics.map((metric) => {
                const IconComponent = iconMap[metric.icon_name] || CheckCircle;
                return (
                  <Card key={metric.id} className="border-0 shadow-soft hover:shadow-glow transition-all duration-300">
                    <CardHeader className="text-center pb-2">
                      <div className="flex justify-center mb-4">
                        <div className="p-3 rounded-full bg-gradient-primary">
                          <IconComponent className="h-8 w-8 text-primary-foreground" />
                        </div>
                      </div>
                      <div className="text-3xl font-bold text-primary mb-2">{metric.value}</div>
                      <CardTitle className="text-lg">{metric.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center pt-0">
                      <p className="text-sm text-muted-foreground">{metric.description}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Featured Operators */}
        {operators.length > 0 && (
          <div className="mb-16">
            <h3 className="text-3xl font-bold text-center mb-12 text-primary">Meet Our Featured Operators</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {operators.map((operator) => (
                <Card key={operator.id} className="border-0 shadow-soft hover:shadow-glow transition-all duration-300 overflow-hidden group">
                  <div className="relative">
                    <img 
                      src={operator.image_url || "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=300&h=300&fit=crop&crop=face"}
                      alt={`${operator.name} - Professional Operator`}
                      className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {operator.is_verified && (
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
                        {operator.completed_orders?.toLocaleString() || '0'} orders completed
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {operator.specialties?.map((specialty, index) => (
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
        )}

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
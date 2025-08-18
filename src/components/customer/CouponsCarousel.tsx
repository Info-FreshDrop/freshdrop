import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Percent, Gift, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Coupon {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  description: string;
  image_url?: string;
  is_active: boolean;
}

export function CouponsCarousel() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCoupons();

    // Set up real-time subscription for promo codes
    const promoCodesChannel = supabase
      .channel('promo-codes-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'promo_codes'
        },
        () => {
          loadCoupons();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(promoCodesChannel);
    };
  }, []);

  const loadCoupons = async () => {
    try {
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('is_active', true)
        .eq('visible_to_customers', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCoupons(data || []);
    } catch (error) {
      console.error('Error loading coupons:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCoupon = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(`Coupon code "${code}" copied to clipboard!`);
  };

  const formatDiscount = (type: string, value: number) => {
    if (type === 'percentage') {
      return `${value}% OFF`;
    } else {
      return `$${(value / 100).toFixed(2)} OFF`;
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-muted rounded w-24 mb-4"></div>
        <div className="h-32 bg-muted rounded"></div>
      </div>
    );
  }

  if (coupons.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Gift className="h-5 w-5 text-primary" />
        Available Coupons
      </h3>
      
      <Carousel className="w-full" opts={{ align: "start", loop: false }}>
        <CarouselContent className="-ml-2 md:-ml-4">
          {coupons.map((coupon) => (
            <CarouselItem key={coupon.id} className="pl-2 md:pl-4 basis-full md:basis-1/2 lg:basis-1/3">
              <Card className="border-0 shadow-soft bg-gradient-to-br from-primary/5 to-accent/5 hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  {coupon.image_url && (
                    <div className="w-full h-24 rounded-lg mb-3 overflow-hidden">
                      <img 
                        src={coupon.image_url} 
                        alt={coupon.description}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="bg-primary text-primary-foreground">
                        <Percent className="h-3 w-3 mr-1" />
                        {formatDiscount(coupon.discount_type, coupon.discount_value)}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        Limited Time
                      </Badge>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-sm mb-1">{coupon.description}</h4>
                      <p className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded">
                        Code: {coupon.code}
                      </p>
                    </div>
                    
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="w-full"
                      onClick={() => handleCopyCoupon(coupon.code)}
                    >
                      Copy Code
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="hidden md:flex" />
        <CarouselNext className="hidden md:flex" />
      </Carousel>
      
      {/* Mobile navigation dots */}
      <div className="flex justify-center gap-2 mt-4 md:hidden">
        {coupons.map((_, index) => (
          <button
            key={index}
            className="w-2 h-2 rounded-full bg-muted hover:bg-primary transition-colors"
            aria-label={`Go to coupon ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
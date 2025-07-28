import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { 
  Package, 
  MapPin, 
  Clock, 
  Truck, 
  Calendar,
  AlertCircle,
  CheckCircle,
  ArrowLeft
} from "lucide-react";

interface OrderPlacementProps {
  onBack: () => void;
}

export function OrderPlacement({ onBack }: OrderPlacementProps) {
  const [orderType, setOrderType] = useState<'locker' | 'pickup_delivery'>('locker');
  const [serviceType, setServiceType] = useState('');
  const [isExpress, setIsExpress] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lockers, setLockers] = useState<any[]>([]);
  const [clothesItems, setClothesItems] = useState<any[]>([]);
  const [serviceAreas, setServiceAreas] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    pickupAddress: '',
    deliveryAddress: '',
    lockerId: '',
    zipCode: '',
    specialInstructions: '',
    bagCount: 1,
    timeWindow: '',
    detergentType: 'standard',
    fragranceFree: false,
    shirtsOnHangers: false,
    extraRinse: false,
    promoCode: ''
  });

  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [lockersRes, itemsRes, areasRes] = await Promise.all([
        supabase.from('lockers').select('*').eq('is_active', true),
        supabase.from('clothes_items').select('*').eq('is_active', true),
        supabase.from('service_areas').select('*').eq('is_active', true)
      ]);

      if (lockersRes.data) setLockers(lockersRes.data);
      if (itemsRes.data) setClothesItems(itemsRes.data);
      if (areasRes.data) setServiceAreas(areasRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load order options. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isExpressAvailable = () => {
    const now = new Date();
    const hour = now.getHours();
    
    // Express only available before 12 PM
    if (hour >= 12) return false;
    
    // Check if zip code allows express
    const area = serviceAreas.find(a => a.zip_code === formData.zipCode);
    return area?.allows_express || false;
  };

  const validateServiceArea = () => {
    const area = serviceAreas.find(a => a.zip_code === formData.zipCode);
    if (!area) return { valid: false, message: "Service not available in this area" };
    
    if (orderType === 'locker' && !area.allows_locker) {
      return { valid: false, message: "Locker service not available in this area" };
    }
    
    if (orderType === 'pickup_delivery' && !area.allows_delivery) {
      return { valid: false, message: "Pickup/delivery not available in this area" };
    }
    
    return { valid: true, message: "" };
  };

  const calculateTotal = () => {
    let total = formData.bagCount * 3500; // $35 per bag
    
    if (isExpress) {
      total += 2000; // $20 express fee
    }
    
    // Add-on services
    if (formData.fragranceFree) {
      total += 300; // $3 fragrance-free detergent
    }
    
    if (formData.shirtsOnHangers) {
      total += 800; // $8 shirts on hangers
    }
    
    if (formData.extraRinse) {
      total += 200; // $2 extra rinse
    }
    
    // Apply promo code discount
    if (formData.promoCode === 'TEST') {
      total = 0; // 100% off for testing
    }
    
    return total;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate service area
      const validation = validateServiceArea();
      if (!validation.valid) {
        toast({
          title: "Service Not Available",
          description: validation.message,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Prepare order data
      const orderData = {
        pickup_type: orderType,
        service_type: serviceType as any,
        zip_code: formData.zipCode,
        is_express: isExpress,
        pickup_address: orderType === 'pickup_delivery' ? formData.pickupAddress : null,
        delivery_address: orderType === 'pickup_delivery' ? formData.deliveryAddress : null,
        locker_id: orderType === 'locker' ? formData.lockerId : null,
        special_instructions: formData.specialInstructions,
        bag_count: formData.bagCount,
        items: [{ time_window: formData.timeWindow }],
        total_amount_cents: calculateTotal(),
        pickup_window_start: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        pickup_window_end: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
        delivery_window_start: isExpress 
          ? new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString()
          : new Date(Date.now() + 22 * 60 * 60 * 1000).toISOString(),
        delivery_window_end: isExpress 
          ? new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()
          : new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString()
      };

      // Create payment session
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: { orderData }
      });

      if (error) throw error;

      if (data?.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url;
      } else {
        throw new Error("Failed to create payment session");
      }

    } catch (error) {
      console.error('Error creating order:', error);
      toast({
        title: "Order Failed",
        description: "Failed to process order. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const selectedLocker = lockers.find(l => l.id === formData.lockerId);
  const expressAvailable = isExpressAvailable();

  return (
    <div className="min-h-screen bg-gradient-wave">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={onBack}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Place New Order
          </h1>
          <p className="text-muted-foreground">
            Choose your service type and preferences
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Order Type Selection */}
          <Card className="border-0 shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Service Type
              </CardTitle>
              <CardDescription>
                Choose between locker drop-off or pickup & delivery
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={orderType} onValueChange={(value: any) => setOrderType(value)}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="locker">
                    <MapPin className="h-4 w-4 mr-2" />
                    Locker Drop-off
                  </TabsTrigger>
                  <TabsTrigger value="pickup_delivery">
                    <Truck className="h-4 w-4 mr-2" />
                    Pickup & Delivery
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="locker" className="space-y-4 mt-6">
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="h-4 w-4 text-amber-600" />
                      <span className="font-medium text-amber-800">No Lockers Available</span>
                    </div>
                    <p className="text-sm text-amber-700">
                      There are no lockers near you at this moment. Please use our pickup and delivery service instead.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      className="mt-3"
                      onClick={() => setOrderType('pickup_delivery')}
                    >
                      Switch to Pickup & Delivery
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="pickup_delivery" className="space-y-4 mt-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="service-address">Service Address</Label>
                      <Textarea
                        id="service-address"
                        placeholder="Enter your address for both pickup and delivery"
                        value={formData.pickupAddress}
                        onChange={(e) => {
                          handleInputChange('pickupAddress', e.target.value);
                          handleInputChange('deliveryAddress', e.target.value); // Same address for both
                        }}
                        required={orderType === 'pickup_delivery'}
                        rows={3}
                      />
                      <p className="text-xs text-muted-foreground">
                        We'll pickup and deliver to the same address
                      </p>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Service Area Validation */}
          <Card className="border-0 shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-accent" />
                Service Area
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="zip-code">Zip Code</Label>
                <Input
                  id="zip-code"
                  placeholder="Enter your zip code"
                  value={formData.zipCode}
                  onChange={(e) => handleInputChange('zipCode', e.target.value)}
                  required
                />
                {formData.zipCode && (
                  <div className="mt-2">
                    {validateServiceArea().valid ? (
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-sm">Service available in your area</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-red-600">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-sm">{validateServiceArea().message}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Service Options */}
          <Card className="border-0 shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-secondary" />
                Service Options
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Service Description */}
              <div className="p-4 bg-primary/5 rounded-lg border">
                <h4 className="font-medium mb-2">Service Details</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• Each bag holds up to 15 lbs of laundry</li>
                  <li>• Bag options: Basic bag, 13-gallon trash bag, or FreshDrop basket</li>
                  <li>• Pickup in your selected time window</li>
                  <li>• Delivery in the same window the following day</li>
                </ul>
              </div>

              <div className="space-y-2">
                <Label htmlFor="service-type">Wash Type</Label>
                <Select value={serviceType} onValueChange={setServiceType} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select wash type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wash_fold">Wash & Fold</SelectItem>
                    <SelectItem value="wash_hang_dry">Wash & Hang Dry</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Express Service Option */}
              {expressAvailable && (
                <div className="p-4 border rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-amber-600" />
                      <span className="font-medium">Express Service Available</span>
                      <Badge variant="secondary">Same Day</Badge>
                    </div>
                    <Button
                      type="button"
                      variant={isExpress ? "default" : "outline"}
                      size="sm"
                      onClick={() => setIsExpress(!isExpress)}
                    >
                      {isExpress ? "Selected" : "Add +$20"}
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Order by 12 PM, get it back by 8 PM today
                  </p>
                </div>
              )}

              {!expressAvailable && (
                <div className="p-4 border rounded-lg bg-gray-50 border-gray-200">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Express service not available</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {new Date().getHours() >= 12 
                      ? "Express orders must be placed before 12 PM"
                      : "Express service not available in this area"
                    }
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="bag-count">Number of Bags ($35 each)</Label>
                <Select 
                  value={formData.bagCount.toString()} 
                  onValueChange={(value) => handleInputChange('bagCount', parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5].map(num => (
                      <SelectItem key={num} value={num.toString()}>
                        {num} bag{num > 1 ? 's' : ''} - ${(num * 35).toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

                <div className="space-y-2">
                  <Label htmlFor="time-window">Pickup Time Window</Label>
                  <Select value={formData.timeWindow} onValueChange={(value) => handleInputChange('timeWindow', value)} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select pickup time window" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="morning">Morning (6AM - 8AM)</SelectItem>
                      <SelectItem value="lunch">Lunch (12PM - 2PM)</SelectItem>
                      <SelectItem value="evening">Evening (5PM - 7PM)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Drop-off will be in the same time window 24 hours later
                  </p>
                </div>

                {/* Detergent & Add-on Services */}
                <div className="space-y-4 border-t pt-6">
                  <h4 className="font-semibold text-lg">Add-on Services</h4>
                  
                  <div className="space-y-4">
                    {/* Fragrance-Free Detergent */}
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h5 className="font-medium">Fragrance-Free Detergent</h5>
                        <p className="text-sm text-muted-foreground">Hypoallergenic and gentle for sensitive skin</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">+$3.00</p>
                        <input
                          type="checkbox"
                          checked={formData.fragranceFree}
                          onChange={(e) => handleInputChange('fragranceFree', e.target.checked)}
                          className="mt-1"
                        />
                      </div>
                    </div>

                    {/* Shirts on Hangers */}
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h5 className="font-medium">Shirts on Hangers</h5>
                        <p className="text-sm text-muted-foreground">Professional hanging service for dress shirts</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">+$8.00</p>
                        <input
                          type="checkbox"
                          checked={formData.shirtsOnHangers}
                          onChange={(e) => handleInputChange('shirtsOnHangers', e.target.checked)}
                          className="mt-1"
                        />
                      </div>
                    </div>

                    {/* Extra Rinse */}
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h5 className="font-medium">Extra Rinse Cycle</h5>
                        <p className="text-sm text-muted-foreground">Additional rinse for thorough cleaning</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">+$2.00</p>
                        <input
                          type="checkbox"
                          checked={formData.extraRinse}
                          onChange={(e) => handleInputChange('extraRinse', e.target.checked)}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Promo Code */}
                <div className="space-y-2">
                  <Label htmlFor="promo-code">Promo Code (Optional)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="promo-code"
                      placeholder="Enter promo code"
                      value={formData.promoCode}
                      onChange={(e) => handleInputChange('promoCode', e.target.value.toUpperCase())}
                    />
                    {formData.promoCode === 'TEST' && (
                      <div className="flex items-center text-green-600 text-sm">
                        ✓ 100% Off Applied!
                      </div>
                    )}
                  </div>
                  {formData.promoCode === 'TEST' && (
                    <p className="text-xs text-green-600">Test promo code applied - this order is free!</p>
                  )}
                </div>

              <div className="space-y-2">
                <Label htmlFor="instructions">Special Instructions (Optional)</Label>
                <Textarea
                  id="instructions"
                  placeholder="Any special instructions for your laundry..."
                  value={formData.specialInstructions}
                  onChange={(e) => handleInputChange('specialInstructions', e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Order Summary */}
          <Card className="border-0 shadow-soft">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Service Type:</span>
                  <span className="capitalize">{orderType.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Wash Type:</span>
                  <span className="capitalize">{serviceType.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Number of Bags:</span>
                  <span>{formData.bagCount} × $35.00 = ${(formData.bagCount * 35).toFixed(2)}</span>
                </div>
                {isExpress && (
                  <div className="flex justify-between">
                    <span>Express Service:</span>
                    <span>$20.00</span>
                  </div>
                )}
                {formData.fragranceFree && (
                  <div className="flex justify-between text-sm">
                    <span>Fragrance-Free Detergent:</span>
                    <span>$3.00</span>
                  </div>
                )}
                {formData.shirtsOnHangers && (
                  <div className="flex justify-between text-sm">
                    <span>Shirts on Hangers:</span>
                    <span>$8.00</span>
                  </div>
                )}
                {formData.extraRinse && (
                  <div className="flex justify-between text-sm">
                    <span>Extra Rinse:</span>
                    <span>$2.00</span>
                  </div>
                )}
                {formData.promoCode === 'TEST' && (
                  <div className="flex justify-between text-green-600">
                    <span>Promo Code (TEST):</span>
                    <span>-100%</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Time Window:</span>
                  <span className="capitalize">
                    {formData.timeWindow === 'morning' && 'Morning (6AM - 8AM)'}
                    {formData.timeWindow === 'lunch' && 'Lunch (12PM - 2PM)'}
                    {formData.timeWindow === 'evening' && 'Evening (5PM - 7PM)'}
                  </span>
                </div>
                <hr className="my-2" />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total:</span>
                  <span>${(calculateTotal() / 100).toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <Button
            type="submit"
            variant="hero"
            size="xl"
            className="w-full"
            disabled={isLoading || !validateServiceArea().valid || !serviceType || !formData.timeWindow || (orderType === 'pickup_delivery' && !formData.pickupAddress)}
            >
              {isLoading ? "Processing Payment..." : `Pay Now - $${(calculateTotal() / 100).toFixed(2)}`}
            </Button>
        </form>
      </div>
    </div>
  );
}
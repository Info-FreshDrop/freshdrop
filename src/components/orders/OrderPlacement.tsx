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
    bagType: 'basic',
    timeWindow: ''
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
        customer_id: user?.id,
        pickup_type: orderType,
        service_type: serviceType as any,
        zip_code: formData.zipCode,
        is_express: isExpress,
        pickup_address: orderType === 'pickup_delivery' ? formData.pickupAddress : null,
        delivery_address: orderType === 'pickup_delivery' ? formData.deliveryAddress : null,
        locker_id: orderType === 'locker' ? formData.lockerId : null,
        special_instructions: formData.specialInstructions,
        bag_count: formData.bagCount,
        items: [{ bag_type: formData.bagType, time_window: formData.timeWindow }],
        total_amount_cents: calculateTotal(),
        status: 'unclaimed' as const,
        pickup_window_start: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        pickup_window_end: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
        delivery_window_start: isExpress 
          ? new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString()
          : new Date(Date.now() + 22 * 60 * 60 * 1000).toISOString(),
        delivery_window_end: isExpress 
          ? new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()
          : new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString()
      };

      const { error } = await supabase
        .from('orders')
        .insert(orderData);

      if (error) throw error;

      toast({
        title: "Order Placed Successfully!",
        description: `Your ${isExpress ? 'express' : 'standard'} order has been submitted.`,
      });

      onBack(); // Return to dashboard
    } catch (error) {
      console.error('Error creating order:', error);
      toast({
        title: "Order Failed",
        description: "Failed to place order. Please try again.",
        variant: "destructive",
      });
    }
    
    setIsLoading(false);
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
                  <div className="space-y-2">
                    <Label htmlFor="locker-select">Select Locker Location</Label>
                    <Select value={formData.lockerId} onValueChange={(value) => handleInputChange('lockerId', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a locker location" />
                      </SelectTrigger>
                      <SelectContent>
                        {lockers.map((locker) => (
                          <SelectItem key={locker.id} value={locker.id}>
                            <div>
                              <div className="font-medium">{locker.name}</div>
                              <div className="text-sm text-muted-foreground">{locker.address}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedLocker && (
                      <div className="p-3 bg-primary/5 rounded-lg">
                        <p className="text-sm">
                          <strong>Selected:</strong> {selectedLocker.name}
                        </p>
                        <p className="text-sm text-muted-foreground">{selectedLocker.address}</p>
                        <p className="text-sm text-muted-foreground">
                          Available lockers: {selectedLocker.locker_count}
                        </p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="pickup_delivery" className="space-y-4 mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="pickup-address">Pickup Address</Label>
                      <Textarea
                        id="pickup-address"
                        placeholder="Enter your pickup address"
                        value={formData.pickupAddress}
                        onChange={(e) => handleInputChange('pickupAddress', e.target.value)}
                        required={orderType === 'pickup_delivery'}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="delivery-address">Delivery Address</Label>
                      <Textarea
                        id="delivery-address"
                        placeholder="Enter your delivery address (or same as pickup)"
                        value={formData.deliveryAddress}
                        onChange={(e) => handleInputChange('deliveryAddress', e.target.value)}
                        required={orderType === 'pickup_delivery'}
                      />
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
                <Label htmlFor="bag-type">Bag Type (15 lbs capacity each)</Label>
                <Select value={formData.bagType} onValueChange={(value) => handleInputChange('bagType', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Basic Bag</SelectItem>
                    <SelectItem value="trash_13gal">Trash Bag (13 gallons)</SelectItem>
                    <SelectItem value="freshdrop_basket">FreshDrop Laundry Basket</SelectItem>
                  </SelectContent>
                </Select>
              </div>

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
                  <span>Bag Type:</span>
                  <span className="capitalize">{formData.bagType.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Number of Bags:</span>
                  <span>{formData.bagCount} × $35.00 = ${(formData.bagCount * 35).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Time Window:</span>
                  <span className="capitalize">
                    {formData.timeWindow === 'morning' && 'Morning (6AM - 8AM)'}
                    {formData.timeWindow === 'lunch' && 'Lunch (12PM - 2PM)'}
                    {formData.timeWindow === 'evening' && 'Evening (5PM - 7PM)'}
                  </span>
                </div>
                {isExpress && (
                  <div className="flex justify-between text-amber-600">
                    <span>Express Service:</span>
                    <span>+$20.00</span>
                  </div>
                )}
                <hr className="my-2" />
                <div className="flex justify-between font-semibold">
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
            disabled={isLoading || !validateServiceArea().valid || !serviceType || !formData.timeWindow}
          >
            {isLoading ? "Placing Order..." : `Place Order - $${(calculateTotal() / 100).toFixed(2)}`}
          </Button>
        </form>
      </div>
    </div>
  );
}
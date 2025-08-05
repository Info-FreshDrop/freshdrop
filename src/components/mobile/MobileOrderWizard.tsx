import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useCapacitor } from "@/hooks/useCapacitor";
import { supabase } from "@/integrations/supabase/client";
import { Elements } from '@stripe/react-stripe-js';
import { stripePromise } from '@/lib/stripe';
import { EmbeddedPaymentForm } from '@/components/payment/EmbeddedPaymentForm';
import { LaundryInstructionsModal } from '../orders/LaundryInstructionsModal';
import { 
  ArrowLeft,
  ArrowRight,
  MapPin, 
  Clock, 
  Truck, 
  Calendar,
  AlertCircle,
  CheckCircle,
  Crosshair,
  Loader2,
  Package,
  ShoppingBag,
  CreditCard,
  Settings,
  Plus,
  Minus,
  X
} from "lucide-react";

interface MobileOrderWizardProps {
  onBack: () => void;
}

interface ShopItem {
  id: string;
  name: string;
  price_cents: number;
  image_url?: string;
  category: string;
  quantity: number;
}

export function MobileOrderWizard({ onBack }: MobileOrderWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [orderType, setOrderType] = useState<'pickup_delivery' | 'locker'>('pickup_delivery');
  const [serviceType, setServiceType] = useState('');
  const [isExpress, setIsExpress] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [lockers, setLockers] = useState<any[]>([]);
  const [clothesItems, setClothesItems] = useState<any[]>([]);
  const [serviceAreas, setServiceAreas] = useState<any[]>([]);
  const [laundryPreferences, setLaundryPreferences] = useState<any[]>([]);
  const [selectedShopItems, setSelectedShopItems] = useState<ShopItem[]>([]);
  const [showShopModal, setShowShopModal] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  const [clientSecret, setClientSecret] = useState('');
  const [orderId, setOrderId] = useState('');
  const [formData, setFormData] = useState({
    pickupAddress: '',
    deliveryAddress: '',
    zipCode: '',
    specialInstructions: '',
    bagCount: 1,
    timeWindow: '',
    pickupDate: '',
    soapPreference: '',
    washTempPreference: '',
    dryTempPreference: '',
    promoCode: ''
  });

  const { user } = useAuth();
  const { toast } = useToast();
  const { getCurrentLocation } = useCapacitor();

  const steps = [
    { number: 1, title: "Service & Area", icon: MapPin, subtitle: "Choose service and location" },
    { number: 2, title: "Options", icon: Settings, subtitle: "Preferences and timing" },
    { number: 3, title: "Shop", icon: ShoppingBag, subtitle: "Add items (optional)" },
    { number: 4, title: "Payment", icon: CreditCard, subtitle: "Review and pay" }
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [lockersRes, itemsRes, areasRes, preferencesRes] = await Promise.all([
        supabase.from('lockers').select('*').eq('is_active', true),
        supabase.from('clothes_items').select('*').eq('is_active', true),
        supabase.from('service_areas').select('*').eq('is_active', true),
        supabase.from('laundry_preferences').select('*').eq('is_active', true)
      ]);

      if (lockersRes.data) setLockers(lockersRes.data);
      if (itemsRes.data) setClothesItems(itemsRes.data);
      if (areasRes.data) setServiceAreas(areasRes.data);
      if (preferencesRes.data) {
        setLaundryPreferences(preferencesRes.data);
        // Set default preferences
        const defaultSoap = preferencesRes.data.find(p => p.category === 'soap' && p.is_default);
        const defaultWashTemp = preferencesRes.data.find(p => p.category === 'wash_temp' && p.is_default);
        const defaultDryTemp = preferencesRes.data.find(p => p.category === 'dry_temp' && p.is_default);
        
        setFormData(prev => ({
          ...prev,
          soapPreference: defaultSoap?.id || '',
          washTempPreference: defaultWashTemp?.id || '',
          dryTempPreference: defaultDryTemp?.id || ''
        }));
      }
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

  const handleDetectLocation = async () => {
    setIsDetectingLocation(true);
    try {
      let location;
      try {
        location = await getCurrentLocation();
      } catch (capacitorError) {
        location = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              resolve({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy
              });
            },
            (error) => reject(error),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
          );
        });
      }
      
        // Use reverse geocoding to get address
        try {
          const response = await supabase.functions.invoke('geocoding', {
            body: { 
              query: `${location.longitude},${location.latitude}`,
              type: 'reverse'
            }
          });
          
          console.log('Reverse geocoding response:', response);
          
          if (response.data?.suggestions?.[0]) {
            const address = response.data.suggestions[0].display_name;
            handleInputChange('pickupAddress', address);
            handleInputChange('deliveryAddress', address);
            
            // Extract zip code from address
            const zipMatch = address.match(/\b\d{5}\b/);
            if (zipMatch) {
              handleInputChange('zipCode', zipMatch[0]);
            }
          } else {
            // Fallback address
            const mockAddress = "123 Main St, Springfield, MO 65804";
            handleInputChange('pickupAddress', mockAddress);
            handleInputChange('deliveryAddress', mockAddress);
            handleInputChange('zipCode', '65804');
          }
        } catch (error) {
          console.error('Geocoding error:', error);
          // Fallback address  
          const mockAddress = "123 Main St, Springfield, MO 65804";
          handleInputChange('pickupAddress', mockAddress);
          handleInputChange('deliveryAddress', mockAddress);
          handleInputChange('zipCode', '65804');
        }
      
      toast({
        title: "Location Detected",
        description: "Your address has been automatically filled in.",
      });
    } catch (error) {
      toast({
        title: "Location Error",
        description: "Unable to detect location. Please enter manually.",
        variant: "destructive",
      });
    } finally {
      setIsDetectingLocation(false);
    }
  };

  const validateServiceArea = () => {
    const area = serviceAreas.find(a => a.zip_code === formData.zipCode);
    if (!area) return { valid: false, message: "Service not available in this area" };
    
    if (orderType === 'pickup_delivery' && !area.allows_delivery) {
      return { valid: false, message: "Pickup/delivery not available in this area" };
    }
    
    return { valid: true, message: "" };
  };

  const isExpressAvailable = () => {
    const now = new Date();
    const hour = now.getHours();
    if (hour >= 12) return false;
    const area = serviceAreas.find(a => a.zip_code === formData.zipCode);
    return area?.allows_express || false;
  };

  const [validatedPromoCode, setValidatedPromoCode] = useState<any>(null);
  const [promoCodeError, setPromoCodeError] = useState('');

  const validatePromoCode = async (code: string) => {
    if (!code.trim()) {
      setValidatedPromoCode(null);
      setPromoCodeError('');
      return;
    }

    try {
      const { data: promoCodes, error } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('code', code.toUpperCase())
        .eq('is_active', true)
        .single();

      if (error || !promoCodes) {
        setValidatedPromoCode(null);
        setPromoCodeError('Invalid promo code');
        return;
      }

      // Check if user has already used this one-time promo code
      if (promoCodes.one_time_use_per_user && user) {
        const { data: usage } = await supabase
          .from('promo_code_usage')
          .select('id')
          .eq('promo_code_id', promoCodes.id)
          .eq('user_id', user.id)
          .single();

        if (usage) {
          setValidatedPromoCode(null);
          setPromoCodeError('This promo code has already been used');
          return;
        }
      }

      // Check if promo code is restricted to specific items
      if (promoCodes.restricted_to_item_ids && promoCodes.restricted_to_item_ids.length > 0) {
        const hasRestrictedItems = selectedShopItems.some(item => 
          promoCodes.restricted_to_item_ids.includes(item.id)
        );
        
        if (!hasRestrictedItems) {
          setValidatedPromoCode(null);
          setPromoCodeError('This promo code is only valid for specific items');
          return;
        }
      }

      setValidatedPromoCode(promoCodes);
      setPromoCodeError('');
    } catch (error) {
      console.error('Error validating promo code:', error);
      setValidatedPromoCode(null);
      setPromoCodeError('Error validating promo code');
    }
  };

  const calculateTotal = () => {
    let total = formData.bagCount * 3500; // $35 per bag
    
    if (isExpress) {
      total += 2000; // $20 express fee
    }
    
    // Add laundry preference costs
    const soapPref = laundryPreferences.find(p => p.id === formData.soapPreference);
    if (soapPref) {
      total += soapPref.price_cents;
    }
    
    // Add shop items
    selectedShopItems.forEach(item => {
      total += item.price_cents * item.quantity;
    });
    
    // Apply promo code discount
    if (validatedPromoCode) {
      let discountAmount = 0;
      
      if (validatedPromoCode.discount_type === 'percentage') {
        discountAmount = total * (validatedPromoCode.discount_value / 100);
      } else if (validatedPromoCode.discount_type === 'fixed') {
        discountAmount = validatedPromoCode.discount_value * 100; // Convert dollars to cents
      }
      
      total = Math.max(0, total - discountAmount);
    }
    
    return total;
  };

  const addShopItem = (item: any) => {
    setSelectedShopItems(prev => {
      const existingItem = prev.find(shopItem => shopItem.id === item.id);
      if (existingItem) {
        return prev.map(shopItem =>
          shopItem.id === item.id
            ? { ...shopItem, quantity: shopItem.quantity + 1 }
            : shopItem
        );
      } else {
        return [...prev, { ...item, quantity: 1 }];
      }
    });
  };

  const removeShopItem = (itemId: string) => {
    setSelectedShopItems(prev => {
      const existingItem = prev.find(shopItem => shopItem.id === itemId);
      if (existingItem && existingItem.quantity > 1) {
        return prev.map(shopItem =>
          shopItem.id === itemId
            ? { ...shopItem, quantity: shopItem.quantity - 1 }
            : shopItem
        );
      } else {
        return prev.filter(shopItem => shopItem.id !== itemId);
      }
    });
  };

  const canGoToNextStep = () => {
    switch (currentStep) {
      case 1:
        return formData.zipCode && validateServiceArea().valid && serviceType && formData.pickupAddress;
      case 2:
        return formData.timeWindow && formData.pickupDate && 
               formData.soapPreference && formData.washTempPreference && formData.dryTempPreference;
      case 3:
        return true; // Shop is optional
      default:
        return true;
    }
  };

  const handleContinueFromInstructions = () => {
    setShowInstructions(false);
  };

  const handleNext = () => {
    if (canGoToNextStep() && currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      // Calculate pickup time based on selected date and time window
      const pickupDate = new Date(formData.pickupDate);
      let pickupStart, pickupEnd;
      
      switch (formData.timeWindow) {
        case 'morning':
          pickupStart = new Date(pickupDate);
          pickupStart.setHours(6, 0, 0, 0);
          pickupEnd = new Date(pickupDate);
          pickupEnd.setHours(8, 0, 0, 0);
          break;
        case 'lunch':
          pickupStart = new Date(pickupDate);
          pickupStart.setHours(12, 0, 0, 0);
          pickupEnd = new Date(pickupDate);
          pickupEnd.setHours(14, 0, 0, 0);
          break;
        case 'evening':
          pickupStart = new Date(pickupDate);
          pickupStart.setHours(17, 0, 0, 0);
          pickupEnd = new Date(pickupDate);
          pickupEnd.setHours(19, 0, 0, 0);
          break;
        default:
          throw new Error('Invalid time window');
      }

      // Delivery is in the same window the next day
      const deliveryStart = new Date(pickupStart);
      deliveryStart.setDate(deliveryStart.getDate() + 1);
      const deliveryEnd = new Date(pickupEnd);
      deliveryEnd.setDate(deliveryEnd.getDate() + 1);

      // Calculate total and discount amounts
      let baseTotal = formData.bagCount * 3500; // Base amount before discount
      
      if (isExpress) {
        baseTotal += 2000; // $20 express fee
      }
      
      // Add laundry preference costs
      const soapPref = laundryPreferences.find(p => p.id === formData.soapPreference);
      if (soapPref) {
        baseTotal += soapPref.price_cents;
      }
      
      // Add shop items
      selectedShopItems.forEach(item => {
        baseTotal += item.price_cents * item.quantity;
      });

      let discountAmountCents = 0;
      if (validatedPromoCode) {
        if (validatedPromoCode.discount_type === 'percentage') {
          discountAmountCents = baseTotal * (validatedPromoCode.discount_value / 100);
        } else if (validatedPromoCode.discount_type === 'fixed') {
          discountAmountCents = validatedPromoCode.discount_value * 100; // Convert dollars to cents
        }
      }

      const totalAmountCents = Math.max(0, baseTotal - discountAmountCents);

      const orderData = {
        pickup_type: orderType,
        service_type: serviceType as any,
        zip_code: formData.zipCode,
        is_express: isExpress,
        pickup_address: formData.pickupAddress,
        delivery_address: formData.deliveryAddress,
        special_instructions: formData.specialInstructions,
        bag_count: formData.bagCount,
        items: [{ time_window: formData.timeWindow, shop_items: selectedShopItems }],
        total_amount_cents: totalAmountCents,
        discount_amount_cents: discountAmountCents,
        soap_preference_id: formData.soapPreference,
        wash_temp_preference_id: formData.washTempPreference,
        dry_temp_preference_id: formData.dryTempPreference,
        pickup_window_start: pickupStart.toISOString(),
        pickup_window_end: pickupEnd.toISOString(),
        delivery_window_start: isExpress ? pickupEnd.toISOString() : deliveryStart.toISOString(),
        delivery_window_end: isExpress ? new Date(pickupEnd.getTime() + 2 * 60 * 60 * 1000).toISOString() : deliveryEnd.toISOString(),
        promoCode: formData.promoCode || null
      };

      // Create order and payment intent
      console.log('Creating order with payment data:', orderData);
      const { data, error } = await supabase.functions.invoke('create-order-with-payment', {
        body: { orderData }
      });

      console.log('Payment response:', { data, error });

      if (error) {
        console.error('Payment error:', error);
        throw error;
      }

      if (data?.clientSecret && data?.paymentIntentId) {
        console.log('Payment intent created successfully');
        setClientSecret(data.clientSecret);
        setOrderId(data.paymentIntentId); // Store payment intent ID temporarily
        setShowPayment(true);
        setIsLoading(false);
      } else if (data?.isFreeOrder && data?.orderId) {
        // Handle $0 orders - no payment required
        console.log('Free order created successfully');
        toast({
          title: "Order Placed Successfully!",
          description: "Your order has been placed successfully - no payment required!",
        });
        onBack(); // Go back to dashboard
        setIsLoading(false);
      } else {
        console.error('Unexpected response format:', data);
        throw new Error("Failed to create payment intent");
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

  const handlePaymentSuccess = (confirmedOrderId: string) => {
    console.log('Payment confirmed, order created:', confirmedOrderId);
    toast({
      title: "Payment Successful",
      description: "Your order has been placed successfully!",
    });
    setShowPayment(false);
    setClientSecret('');
    setOrderId('');
    onBack(); // Go back to dashboard
  };

  const handlePaymentError = (error: string) => {
    toast({
      title: "Payment Failed",
      description: error,
      variant: "destructive",
    });
  };

  // Show payment form if we have a client secret
  if (showPayment && clientSecret) {
    return (
      <div className="min-h-screen bg-gradient-wave">
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={() => setShowPayment(false)}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Order Review
            </Button>
            
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Complete Payment
            </h1>
            <p className="text-muted-foreground">
              Total: ${(calculateTotal() / 100).toFixed(2)}
            </p>
          </div>

          <Card className="border-0 shadow-soft">
            <CardContent className="p-6">
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <EmbeddedPaymentForm
                  clientSecret={clientSecret}
                  orderId={orderId}
                  onPaymentSuccess={handlePaymentSuccess}
                  onPaymentError={handlePaymentError}
                />
              </Elements>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6 p-1">
            {/* Service Type Selection */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Service Type</h3>
              <div className="grid grid-cols-1 gap-3">
                <Card 
                  className={`cursor-pointer transition-all hover:shadow-md ${orderType === 'pickup_delivery' ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-gray-50'}`}
                  onClick={() => setOrderType('pickup_delivery')}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Truck className="h-6 w-6 text-primary" />
                      <div className="flex-1">
                        <h4 className="font-medium">Pickup & Delivery</h4>
                        <p className="text-sm text-muted-foreground">We handle pickup and delivery</p>
                      </div>
                      <div className="w-4 h-4 rounded-full border-2 border-primary flex items-center justify-center">
                        {orderType === 'pickup_delivery' && <div className="w-2 h-2 bg-primary rounded-full" />}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card 
                  className={`cursor-pointer transition-all hover:shadow-md ${orderType === 'locker' ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-gray-50'}`}
                  onClick={() => {
                    setOrderType('locker');
                    toast({
                      title: "Coming Soon!",
                      description: "Locker service will be available soon. Please use pickup & delivery for now.",
                    });
                    setTimeout(() => setOrderType('pickup_delivery'), 1500);
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Package className="h-6 w-6 text-muted-foreground" />
                      <div className="flex-1">
                        <h4 className="font-medium text-muted-foreground">Locker Service</h4>
                        <p className="text-sm text-muted-foreground">Drop off and pick up at secure lockers</p>
                        <Badge variant="secondary" className="mt-1 text-xs">Coming Soon</Badge>
                      </div>
                      <div className="w-4 h-4 rounded-full border-2 border-muted-foreground flex items-center justify-center">
                        {orderType === 'locker' && <div className="w-2 h-2 bg-muted-foreground rounded-full" />}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Wash Type */}
            <div className="space-y-2">
              <Label>Wash Type</Label>
              <Select value={serviceType} onValueChange={setServiceType} required>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select wash type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wash_fold">Wash and Fold</SelectItem>
                  <SelectItem value="delicates_airdry">Delicates / Air Dry</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Address Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Service Address</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDetectLocation}
                  disabled={isDetectingLocation}
                  className="text-xs h-8"
                >
                  {isDetectingLocation ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Detecting...
                    </>
                  ) : (
                    <>
                      <Crosshair className="h-3 w-3 mr-1" />
                      Auto-detect
                    </>
                  )}
                </Button>
              </div>
              <Input
                placeholder="Enter your address"
                value={formData.pickupAddress}
                onChange={async (e) => {
                  const value = e.target.value;
                  handleInputChange('pickupAddress', value);
                  handleInputChange('deliveryAddress', value);
                  
                  // Auto-search for addresses as user types
                  if (value.length > 3) {
                    try {
                      const response = await supabase.functions.invoke('geocoding', {
                        body: { 
                          query: value,
                          type: 'search'
                        }
                      });
                      
                      if (response.data?.suggestions?.[0]) {
                        const suggestion = response.data.suggestions[0];
                        console.log('Address suggestion:', suggestion);
                        
                        // Extract zip code from the display name
                        const zipMatch = suggestion.display_name?.match(/\b\d{5}\b/);
                        if (zipMatch) {
                          handleInputChange('zipCode', zipMatch[0]);
                        }
                      }
                    } catch (error) {
                      console.error('Address search error:', error);
                    }
                  }
                }}
                className="h-12"
                required
              />
            </div>

            {/* Zip Code */}
            <div className="space-y-2">
              <Label>Zip Code</Label>
              <Input
                placeholder="Enter zip code"
                value={formData.zipCode}
                onChange={(e) => handleInputChange('zipCode', e.target.value)}
                className="h-12"
                required
              />
              {formData.zipCode && (
                <div className="mt-2">
                  {validateServiceArea().valid ? (
                    <div className="flex items-center gap-2 text-green-600 text-sm">
                      <CheckCircle className="h-4 w-4" />
                      <span>Service available in your area</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-red-600 text-sm">
                      <AlertCircle className="h-4 w-4" />
                      <span>{validateServiceArea().message}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6 p-1">
            {/* Pickup Date */}
            <div className="space-y-2">
              <Label>Pickup Date</Label>
              <Input
                type="date"
                value={formData.pickupDate}
                onChange={(e) => handleInputChange('pickupDate', e.target.value)}
                min={new Date(Date.now() + 60 * 60 * 1000).toISOString().split('T')[0]}
                className="h-12"
                required
              />
            </div>

            {/* Time Window */}
            <div className="space-y-2">
              <Label>Time Window</Label>
              <Select value={formData.timeWindow} onValueChange={(value) => handleInputChange('timeWindow', value)} required>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select time window" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="morning">Morning (6AM - 8AM)</SelectItem>
                  <SelectItem value="lunch">Lunch (12PM - 2PM)</SelectItem>
                  <SelectItem value="evening">Evening (5PM - 7PM)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Bag Count */}
            <div className="space-y-2">
              <Label>Number of Bags ($35 each)</Label>
              <Select 
                value={formData.bagCount.toString()} 
                onValueChange={(value) => handleInputChange('bagCount', parseInt(value))}
              >
                <SelectTrigger className="h-12">
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

            {/* Express Service */}
            {isExpressAvailable() && (
              <Card 
                className={`cursor-pointer transition-all ${isExpress ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-gray-50'}`} 
                onClick={() => setIsExpress(!isExpress)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Express Service (+$20)</h4>
                      <p className="text-sm text-muted-foreground">Same-day service</p>
                    </div>
                    <div className="w-5 h-5 rounded-full border-2 border-primary flex items-center justify-center">
                      {isExpress && <div className="w-3 h-3 bg-primary rounded-full" />}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Laundry Preferences */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Preferences</h3>
              
              {/* Soap */}
              <div className="space-y-2">
                <Label>Soap Type</Label>
                <Select value={formData.soapPreference} onValueChange={(value) => handleInputChange('soapPreference', value)} required>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select soap" />
                  </SelectTrigger>
                  <SelectContent>
                    {laundryPreferences
                      .filter(p => p.category === 'soap')
                      .map(preference => (
                        <SelectItem key={preference.id} value={preference.id}>
                          {preference.name} {preference.price_cents > 0 && `(+$${(preference.price_cents / 100).toFixed(2)})`}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Temperature preferences in a grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Wash Temp</Label>
                  <Select value={formData.washTempPreference} onValueChange={(value) => handleInputChange('washTempPreference', value)} required>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Wash" />
                    </SelectTrigger>
                    <SelectContent>
                      {laundryPreferences
                        .filter(p => p.category === 'wash_temp')
                        .map(preference => (
                          <SelectItem key={preference.id} value={preference.id}>
                            {preference.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Dry Temp</Label>
                  <Select value={formData.dryTempPreference} onValueChange={(value) => handleInputChange('dryTempPreference', value)} required>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Dry" />
                    </SelectTrigger>
                    <SelectContent>
                      {laundryPreferences
                        .filter(p => p.category === 'dry_temp')
                        .map(preference => (
                          <SelectItem key={preference.id} value={preference.id}>
                            {preference.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4 p-1">
            {/* Shop Items */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Shop Items (Optional)</h3>
              <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto">
                {clothesItems.map((item) => (
                  <Card key={item.id} className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{item.name}</h4>
                        <p className="text-xs text-muted-foreground">{item.category}</p>
                        <p className="text-sm font-semibold text-primary">${(item.price_cents / 100).toFixed(2)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {selectedShopItems.find(si => si.id === item.id) ? (
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => removeShopItem(item.id)}
                              className="h-8 w-8 p-0"
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="text-sm font-medium w-6 text-center">
                              {selectedShopItems.find(si => si.id === item.id)?.quantity || 0}
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => addShopItem(item)}
                              className="h-8 w-8 p-0"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => addShopItem(item)}
                            className="h-8"
                          >
                            Add
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
            
            {selectedShopItems.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium">Selected Items:</h4>
                {selectedShopItems.map((item) => (
                  <Card key={item.id} className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h5 className="font-medium text-sm">{item.name}</h5>
                        <p className="text-sm text-muted-foreground">${(item.price_cents / 100).toFixed(2)} each</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeShopItem(item.id)}
                          className="h-8 w-8 p-0"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-8 text-center font-medium">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addShopItem(item)}
                          className="h-8 w-8 p-0"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Shop Modal */}
            {showShopModal && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
                <div className="bg-white w-full h-4/5 rounded-t-2xl animate-slide-in-bottom">
                  <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Shop Items</h3>
                    <Button variant="ghost" size="sm" onClick={() => setShowShopModal(false)}>
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                  <div className="p-4 h-full overflow-y-auto">
                    <div className="grid grid-cols-2 gap-3">
                      {clothesItems.map((item) => (
                        <Card key={item.id} className="hover-scale">
                          <CardContent className="p-3">
                            {item.image_url ? (
                              <img
                                src={item.image_url}
                                alt={item.name}
                                className="w-full h-24 object-cover rounded mb-2"
                              />
                            ) : (
                              <div className="w-full h-24 bg-gray-100 rounded mb-2 flex items-center justify-center">
                                <Package className="h-8 w-8 text-gray-400" />
                              </div>
                            )}
                            <h4 className="font-medium text-sm mb-1">{item.name}</h4>
                            <p className="text-primary font-bold text-sm mb-2">
                              ${(item.price_cents / 100).toFixed(2)}
                            </p>
                            <Button
                              size="sm"
                              className="w-full h-8 text-xs"
                              onClick={() => {
                                addShopItem(item);
                                toast({
                                  title: "Added to order",
                                  description: `${item.name} added to your order`,
                                });
                              }}
                            >
                              Add to Order
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-6 p-1">
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Service:</span>
                <span className="font-medium capitalize">{serviceType.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Bags:</span>
                <span className="font-medium">{formData.bagCount} × $35 = ${(formData.bagCount * 35).toFixed(2)}</span>
              </div>
              {isExpress && (
                <div className="flex justify-between text-sm">
                  <span>Express:</span>
                  <span className="font-medium">$20.00</span>
                </div>
              )}
              {selectedShopItems.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span>{item.name} ×{item.quantity}:</span>
                  <span className="font-medium">${((item.price_cents * item.quantity) / 100).toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm">
                <span>Date:</span>
                <span className="font-medium">{new Date(formData.pickupDate).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Time:</span>
                <span className="font-medium capitalize">
                  {formData.timeWindow === 'morning' && '6AM - 8AM'}
                  {formData.timeWindow === 'lunch' && '12PM - 2PM'}
                  {formData.timeWindow === 'evening' && '5PM - 7PM'}
                </span>
              </div>
            </div>

            {/* Promo Code */}
            <div className="space-y-2">
              <Label>Promo Code (Optional)</Label>
              <Input
                placeholder="Enter promo code"
                value={formData.promoCode}
                onChange={async (e) => {
                  const code = e.target.value.toUpperCase();
                  handleInputChange('promoCode', code);
                  await validatePromoCode(code);
                }}
                className="h-12"
              />
              {promoCodeError && (
                <p className="text-xs text-red-600">{promoCodeError}</p>
              )}
              {validatedPromoCode && (
                <p className="text-xs text-green-600">
                  {validatedPromoCode.discount_type === 'percentage' 
                    ? `${validatedPromoCode.discount_value}% off applied!`
                    : `$${(validatedPromoCode.discount_value).toFixed(2)} off applied!`
                  }
                </p>
              )}
            </div>

            {/* Special Instructions */}
            <div className="space-y-2">
              <Label>Special Instructions (Optional)</Label>
              <Textarea
                placeholder="Any special instructions..."
                value={formData.specialInstructions}
                onChange={(e) => handleInputChange('specialInstructions', e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between font-bold text-lg">
                <span>Total:</span>
                <span className="text-primary">${(calculateTotal() / 100).toFixed(2)}</span>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-wave">
      <div className="max-w-md mx-auto bg-white min-h-screen overflow-x-hidden">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 z-40">
          <div className="flex items-center p-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={currentStep === 1 ? onBack : handlePrevious}
              className="p-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1 text-center">
              <h1 className="text-lg font-bold">New Order</h1>
              <p className="text-sm text-muted-foreground">
                {steps[currentStep - 1]?.subtitle}
              </p>
            </div>
            <div className="text-sm text-muted-foreground">
              {currentStep}/4
            </div>
          </div>

          {/* Progress Bar */}
          <div className="px-4 pb-4">
            <div className="flex items-center">
              {steps.map((step, index) => (
                <div key={step.number} className="flex-1 flex items-center">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                    step.number === currentStep ? 'bg-primary text-white' :
                    step.number < currentStep ? 'bg-green-500 text-white' :
                    'bg-gray-200 text-gray-600'
                  }`}>
                    {step.number < currentStep ? '✓' : step.number}
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 ${
                      step.number < currentStep ? 'bg-green-500' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="pb-20 px-1">
          {renderStepContent()}
        </div>

        {/* Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 pb-safe safe-area-bottom">
          <div className="max-w-md mx-auto">
            {currentStep < 4 ? (
              <div className="flex gap-2">
                {currentStep > 1 && (
                  <Button
                    variant="outline"
                    onClick={handlePrevious}
                    className="flex-1 h-10 md:h-11 text-sm"
                  >
                    Previous
                  </Button>
                )}
                <Button
                  onClick={handleNext}
                  disabled={!canGoToNextStep()}
                  className="flex-1 h-10 md:h-11 text-sm"
                >
                  Next
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isLoading}
                className="w-full h-10 md:h-11 text-sm md:text-base font-semibold"
              >
                {isLoading ? "Processing..." : `Pay $${(calculateTotal() / 100).toFixed(2)}`}
              </Button>
            )}
          </div>
        </div>
        
        {/* Instructions Modal */}
        <LaundryInstructionsModal
          isOpen={showInstructions}
          onClose={() => setShowInstructions(false)}
          onContinue={handleContinueFromInstructions}
        />
      </div>
    </div>
  );
}
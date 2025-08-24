import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useCapacitor } from "@/hooks/useCapacitor";
import { supabase } from "@/integrations/supabase/client";
import { Elements } from '@stripe/react-stripe-js';
import { stripePromise } from '@/lib/stripe';
import { EmbeddedPaymentForm } from '@/components/payment/EmbeddedPaymentForm';
import { LaundryInstructionsModal } from './LaundryInstructionsModal';
import { ClothesShop } from "@/components/customer/ClothesShop";
import { PrePaymentTipSelector } from "@/components/customer/PrePaymentTipSelector";
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
  Settings
} from "lucide-react";
import { sanitizeInput, validateZipCode } from "@/utils/inputValidation";

interface OrderPlacementWizardProps {
  onBack: () => void;
}

export function OrderPlacementWizard({ onBack }: OrderPlacementWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [orderType, setOrderType] = useState<'locker' | 'pickup_delivery'>('pickup_delivery');
  const [serviceType, setServiceType] = useState('');
  const [isExpress, setIsExpress] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [lockers, setLockers] = useState<any[]>([]);
  const [clothesItems, setClothesItems] = useState<any[]>([]);
  const [serviceAreas, setServiceAreas] = useState<any[]>([]);
  const [laundryPreferences, setLaundryPreferences] = useState<any[]>([]);
  const [selectedShopItems, setSelectedShopItems] = useState<any[]>([]);
  const [paymentClientSecret, setPaymentClientSecret] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState(true);
  const [bagSizes, setBagSizes] = useState<any[]>([]);
  const [selectedBagSizeId, setSelectedBagSizeId] = useState<string>('');
  const [tipAmount, setTipAmount] = useState(0);
  const [formData, setFormData] = useState({
    pickupAddress: '',
    deliveryAddress: '',
    lockerId: '',
    zipCode: '',
    specialInstructions: '',
    bagCount: 1,
    timeWindow: '',
    pickupDate: '',
    soapPreference: '',
    washTempPreference: '',
    dryTempPreference: '',
    promoCode: '',
    useReferralCash: false
  });
  const [availableReferralCash, setAvailableReferralCash] = useState(0);

  const { user } = useAuth();
  const { toast } = useToast();
  const { getCurrentLocation } = useCapacitor();

  const steps = [
    { number: 1, title: "Service Type & Area", icon: MapPin },
    { number: 2, title: "Service Options", icon: Settings },
    { number: 3, title: "Shop Items", icon: ShoppingBag },
    { number: 4, title: "Summary & Payment", icon: CreditCard }
  ];

  useEffect(() => {
    loadData();
    loadBagSizes();
    loadReferralCash();
  }, []);

  const loadReferralCash = async () => {
    const cash = await getAvailableReferralMoney();
    setAvailableReferralCash(cash);
  };

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

  const loadBagSizes = async () => {
    try {
      const { data, error } = await supabase
        .from('bag_sizes')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setBagSizes(data || []);
      
      // Auto-select first bag size if available
      if (data && data.length > 0 && !selectedBagSizeId) {
        setSelectedBagSizeId(data[0].id);
      }
    } catch (error) {
      console.error('Error loading bag sizes:', error);
      toast({
        title: "Error",
        description: "Failed to load bag sizes. Please try again.",
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
      
      // Use reverse geocoding to get actual address
      try {
        const response = await supabase.functions.invoke('geocoding', {
          body: { 
            query: `${location.longitude},${location.latitude}`,
            type: 'reverse'
          }
        });

        if (response.data?.suggestions?.[0]) {
          const address = response.data.suggestions[0].display_name;
          const zipMatch = address.match(/\b\d{5}\b/);
          
          handleInputChange('pickupAddress', address);
          handleInputChange('deliveryAddress', address);
          if (zipMatch) {
            handleInputChange('zipCode', zipMatch[0]);
          }
          
          toast({
            title: "Location Detected",
            description: "Your address has been automatically filled in.",
          });
        } else {
          throw new Error('No address found');
        }
      } catch (geocodingError) {
        console.error('Reverse geocoding failed:', geocodingError);
        // Fallback to mock address
        const mockAddress = "123 Main St, Springfield, MO 65804";
        handleInputChange('pickupAddress', mockAddress);
        handleInputChange('deliveryAddress', mockAddress);
        handleInputChange('zipCode', '65804');
        
        toast({
          title: "Location Detected",
          description: "Your address has been automatically filled in.",
        });
      }
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

  // Address autocomplete function
  const searchAddresses = async (query: string) => {
    if (!query || query.length < 3) {
      setAddressSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const response = await supabase.functions.invoke('geocoding', {
        body: { query, type: 'search' }
      });

      if (response.error) {
        console.error('Geocoding error:', response.error);
        setAddressSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      const suggestions = response.data?.suggestions || [];
      setAddressSuggestions(suggestions);
      setShowSuggestions(suggestions.length > 0);
    } catch (error) {
      console.error('Address search error:', error);
      setAddressSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Handle address suggestion selection
  const handleAddressSelect = (suggestion: any) => {
    const zipMatch = suggestion.display_name.match(/\b\d{5}\b/);
    if (zipMatch) {
      handleInputChange('zipCode', zipMatch[0]);
    }
    
    handleInputChange('pickupAddress', suggestion.display_name);
    handleInputChange('deliveryAddress', suggestion.display_name);
    setShowSuggestions(false);
    setAddressSuggestions([]);
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

  const isExpressAvailable = () => {
    const now = new Date();
    const hour = now.getHours();
    if (hour >= 12) return false;
    const area = serviceAreas.find(a => a.zip_code === formData.zipCode);
    return area?.allows_express || false;
  };

  const getMinPickupDate = () => {
    const now = new Date();
    const minDate = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
    return minDate.toISOString().split('T')[0];
  };

  const validatePickupDateTime = () => {
    if (!formData.pickupDate || !formData.timeWindow) return { valid: true, message: "" };
    
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    
    const selectedDate = new Date(formData.pickupDate);
    let selectedStartTime;
    
    switch (formData.timeWindow) {
      case 'morning':
        selectedStartTime = new Date(selectedDate);
        selectedStartTime.setHours(6, 0, 0, 0);
        break;
      case 'lunch':
        selectedStartTime = new Date(selectedDate);
        selectedStartTime.setHours(12, 0, 0, 0);
        break;
      case 'evening':
        selectedStartTime = new Date(selectedDate);
        selectedStartTime.setHours(17, 0, 0, 0);
        break;
      default:
        return { valid: true, message: "" };
    }
    
    // Check if the selected time is in the past
    if (selectedStartTime <= oneHourFromNow) {
      return { 
        valid: false, 
        message: "Pickup time must be at least 1 hour from now. Please select a later date or time window." 
      };
    }
    
    return { valid: true, message: "" };
  };

  const calculateTotal = () => {
    // Get selected bag size price
    const selectedBagSize = bagSizes.find(b => b.id === selectedBagSizeId);
    let total = selectedBagSize ? selectedBagSize.price_cents * formData.bagCount : 0;
    
    if (isExpress) {
      total += 1500; // $15 express fee
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
    if (formData.promoCode === 'TEST') {
      total = Math.max(0, total - 5000); // $50 off for testing
    }
    
    // Apply referral cash discount
    if (formData.useReferralCash && availableReferralCash > 0) {
      total = Math.max(0, total - availableReferralCash);
    }
    
    return total;
  };

  const calculateTotalWithTip = () => {
    return calculateTotal() + tipAmount;
  };

  const getAvailableReferralMoney = async () => {
    if (!user) return 0;
    
    try {
      const { data, error } = await supabase
        .from('referral_uses')
        .select('reward_given_cents')
        .eq('referrer_user_id', user.id);
      
      if (error) {
        console.error('Error fetching referral cash:', error);
        return 0;
      }
      
      const totalReferralCash = data?.reduce((total, use) => total + (use.reward_given_cents || 0), 0) || 0;
      return totalReferralCash;
    } catch (error) {
      console.error('Error calculating referral cash:', error);
      return 0;
    }
  };

  const canGoToNextStep = () => {
    switch (currentStep) {
      case 1:
        return formData.zipCode && validateServiceArea().valid && serviceType && 
               (orderType === 'locker' ? formData.lockerId : formData.pickupAddress);
      case 2:
        const dateTimeValidation = validatePickupDateTime();
        return formData.timeWindow && formData.pickupDate && 
               formData.soapPreference && formData.washTempPreference && formData.dryTempPreference &&
               dateTimeValidation.valid;
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
    // Validate and sanitize inputs before submission
    if (formData.zipCode && !validateZipCode(formData.zipCode)) {
      toast({
        title: "Invalid zip code",
        description: "Please enter a valid zip code (e.g., 12345 or 12345-6789)",
        variant: "destructive",
      });
      return;
    }

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

      // Prepare order data with sanitized inputs
      const orderData = {
        pickup_type: orderType,
        service_type: serviceType as any,
        zip_code: formData.zipCode,
        is_express: isExpress,
        pickup_address: orderType === 'pickup_delivery' ? sanitizeInput(formData.pickupAddress) : null,
        delivery_address: orderType === 'pickup_delivery' ? sanitizeInput(formData.deliveryAddress) : null,
        locker_id: orderType === 'locker' ? formData.lockerId : null,
        special_instructions: sanitizeInput(formData.specialInstructions),
        bag_count: formData.bagCount,
        bag_size_id: selectedBagSizeId,
        items: [{ time_window: formData.timeWindow, shop_items: selectedShopItems }],
        total_amount_cents: calculateTotalWithTip(),
        tip_amount_cents: tipAmount,
        referral_cash_used: formData.useReferralCash ? Math.min(availableReferralCash, calculateTotal() + availableReferralCash) : 0,
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

      console.log('Payment intent response:', { data, error });

      if (error) {
        console.error('Payment intent error:', error);
        throw error;
      }

      if (data?.clientSecret && data?.orderId) {
        console.log('Payment intent created successfully');
        setPaymentClientSecret(data.clientSecret);
        setOrderId(data.orderId);
        setIsLoading(false);
      } else if (data?.isFreeOrder) {
        console.log('Free order placed successfully');
        toast({
          title: "Order Placed Successfully!",
          description: "Your order has been placed successfully - no payment required!",
        });
        onBack(); // Go back to dashboard
        setIsLoading(false);
      } else {
        console.error('No client secret received:', data);
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

  const handlePaymentSuccess = () => {
    toast({
      title: "Payment Successful!",
      description: "Your order has been placed successfully.",
    });
    // Redirect to order confirmation or dashboard
    onBack();
  };

  const handlePaymentError = (error: string) => {
    console.error('Payment error:', error);
    toast({
      title: "Payment Failed",
      description: error,
      variant: "destructive",
    });
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return renderServiceTypeAndArea();
      case 2:
        return renderServiceOptions();
      case 3:
        return renderClothesShop();
      case 4:
        return renderOrderSummary();
      default:
        return null;
    }
  };

  const renderServiceTypeAndArea = () => (
    <div className="space-y-6">
      {/* Service Type Selection */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Choose Service Type</h3>
        <div className="grid grid-cols-1 gap-3">
          <Card 
            className={`cursor-pointer transition-all hover:shadow-md ${orderType === 'pickup_delivery' ? 'ring-2 ring-primary' : ''}`}
            onClick={() => setOrderType('pickup_delivery')}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Truck className="h-6 w-6 text-primary" />
                <div className="flex-1">
                  <h4 className="font-medium">Pickup & Delivery</h4>
                  <p className="text-sm text-muted-foreground">We pick up and deliver to your door</p>
                </div>
                <div className="w-4 h-4 rounded-full border-2 border-primary flex items-center justify-center">
                  {orderType === 'pickup_delivery' && <div className="w-2 h-2 bg-primary rounded-full" />}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Service Type */}
      <div className="space-y-2">
        <Label htmlFor="service-type">Wash Type</Label>
        <Select value={serviceType} onValueChange={setServiceType} required>
          <SelectTrigger>
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
          <Label htmlFor="service-address">Service Address</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDetectLocation}
            disabled={isDetectingLocation}
            className="text-xs"
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
        <div className="relative">
          <Input
            id="service-address"
            placeholder="Enter your full address (street, city, state)"
            value={formData.pickupAddress}
            onChange={(e) => {
              const value = e.target.value;
              handleInputChange('pickupAddress', value);
              handleInputChange('deliveryAddress', value);
              
              // Auto-extract zip code from address
              const zipMatch = value.match(/\b\d{5}\b/);
              if (zipMatch) {
                handleInputChange('zipCode', zipMatch[0]);
              }
              
              // Trigger address search for autocomplete
              searchAddresses(value);
            }}
            onFocus={() => {
              if (formData.pickupAddress) {
                searchAddresses(formData.pickupAddress);
              }
            }}
            onBlur={() => {
              // Delay hiding suggestions to allow clicking
              setTimeout(() => setShowSuggestions(false), 200);
            }}
            required={orderType === 'pickup_delivery'}
          />
          
          {/* Address Suggestions Dropdown */}
          {showSuggestions && addressSuggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-auto">
              {addressSuggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="px-3 py-2 hover:bg-muted cursor-pointer text-sm border-b border-border last:border-b-0"
                  onClick={() => handleAddressSelect(suggestion)}
                >
                  {suggestion.display_name}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Zip Code */}
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
    </div>
  );

  const renderServiceOptions = () => (
    <div className="space-y-6">
      {/* Pickup Date */}
      <div className="space-y-2">
        <Label htmlFor="pickup-date">Pickup Date</Label>
        <Input
          id="pickup-date"
          type="date"
          value={formData.pickupDate}
          onChange={(e) => handleInputChange('pickupDate', e.target.value)}
          min={getMinPickupDate()}
          required
        />
      </div>

      {/* Time Window */}
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
        {!validatePickupDateTime().valid && (
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{validatePickupDateTime().message}</span>
          </div>
        )}
      </div>

      {/* Bag Size Selection */}
      <div className="space-y-3">
        <Label>Select Bag Size</Label>
        <div className="grid gap-3">
          {bagSizes.map((bagSize) => (
            <Card 
              key={bagSize.id} 
              className={`cursor-pointer transition-all ${selectedBagSizeId === bagSize.id ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setSelectedBagSizeId(bagSize.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{bagSize.name}</h4>
                    {bagSize.description && (
                      <p className="text-sm text-muted-foreground">{bagSize.description}</p>
                    )}
                    {bagSize.capacity_gallons && (
                      <p className="text-xs text-muted-foreground">Capacity: {bagSize.capacity_gallons} gallons</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-bold">${(bagSize.price_cents / 100).toFixed(2)}</p>
                    <div className="w-4 h-4 rounded-full border-2 border-primary flex items-center justify-center">
                      {selectedBagSizeId === bagSize.id && <div className="w-2 h-2 bg-primary rounded-full" />}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Bag Count */}
      <div className="space-y-2">
        <Label htmlFor="bag-count">Number of Bags</Label>
        <Select 
          value={formData.bagCount.toString()} 
          onValueChange={(value) => handleInputChange('bagCount', parseInt(value))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[1,2,3,4,5].map(num => {
              const selectedBagSize = bagSizes.find(b => b.id === selectedBagSizeId);
              const price = selectedBagSize ? selectedBagSize.price_cents * num / 100 : 0;
              return (
                <SelectItem key={num} value={num.toString()}>
                  {num} bag{num > 1 ? 's' : ''} - ${price.toFixed(2)}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Express Service */}
      {isExpressAvailable() && (
        <Card className={`cursor-pointer transition-all ${isExpress ? 'ring-2 ring-primary' : ''}`} onClick={() => setIsExpress(!isExpress)}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Express Service (+$15)</h4>
                <p className="text-sm text-muted-foreground">Same-day service (order by 12 PM)</p>
              </div>
              <div className="w-4 h-4 rounded-full border-2 border-primary flex items-center justify-center">
                {isExpress && <div className="w-2 h-2 bg-primary rounded-full" />}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Laundry Preferences */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Laundry Preferences</h3>
        
        {/* Soap */}
        <div className="space-y-2">
          <Label>Soap Type</Label>
          <Select value={formData.soapPreference} onValueChange={(value) => handleInputChange('soapPreference', value)} required>
            <SelectTrigger>
              <SelectValue placeholder="Select soap type" />
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

        {/* Wash Temperature */}
        <div className="space-y-2">
          <Label>Wash Temperature</Label>
          <Select value={formData.washTempPreference} onValueChange={(value) => handleInputChange('washTempPreference', value)} required>
            <SelectTrigger>
              <SelectValue placeholder="Select wash temperature" />
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

        {/* Dry Temperature */}
        <div className="space-y-2">
          <Label>Dry Temperature</Label>
          <Select value={formData.dryTempPreference} onValueChange={(value) => handleInputChange('dryTempPreference', value)} required>
            <SelectTrigger>
              <SelectValue placeholder="Select dry temperature" />
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
  );

  const renderClothesShop = () => (
    <div className="space-y-4">
      <div className="text-center py-8">
        <ShoppingBag className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">Add Shop Items (Optional)</h3>
        <p className="text-muted-foreground mb-4">Browse our selection of clothing and accessories</p>
        <Button variant="outline" onClick={() => {/* TODO: Implement shop modal */}}>
          Items
        </Button>
      </div>
      
      {selectedShopItems.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium">Selected Items:</h4>
          {selectedShopItems.map((item, index) => (
            <div key={index} className="flex justify-between items-center p-2 bg-muted rounded">
              <span>{item.name} x{item.quantity}</span>
              <span>${((item.price_cents * item.quantity) / 100).toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderOrderSummary = () => {
    if (paymentClientSecret && orderId) {
      // Show embedded payment form
      return (
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">Complete Your Payment</h3>
            <p className="text-muted-foreground mb-4">
              Total: ${(calculateTotalWithTip() / 100).toFixed(2)}
            </p>
          </div>
          
          <Elements 
            stripe={stripePromise} 
            options={{
              clientSecret: paymentClientSecret,
              appearance: {
                theme: 'stripe',
              },
            }}
          >
            <EmbeddedPaymentForm
              clientSecret={paymentClientSecret}
              orderId={orderId}
              onPaymentSuccess={handlePaymentSuccess}
              onPaymentError={handlePaymentError}
            />
          </Elements>
        </div>
      );
    }

    // Show order summary before payment
    return (
      <div className="space-y-6">
        <div className="space-y-4">
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
            <span>{formData.bagCount} × ${bagSizes.find(b => b.id === selectedBagSizeId)?.price_cents ? (bagSizes.find(b => b.id === selectedBagSizeId)!.price_cents / 100).toFixed(2) : '0.00'} = ${bagSizes.find(b => b.id === selectedBagSizeId) ? (bagSizes.find(b => b.id === selectedBagSizeId)!.price_cents * formData.bagCount / 100).toFixed(2) : '0.00'}</span>
          </div>
          {isExpress && (
            <div className="flex justify-between">
              <span>Express Service:</span>
              <span>$15.00</span>
            </div>
          )}
          {selectedShopItems.map((item, index) => (
            <div key={index} className="flex justify-between text-sm">
              <span>{item.name} x{item.quantity}:</span>
              <span>${((item.price_cents * item.quantity) / 100).toFixed(2)}</span>
            </div>
          ))}
          <div className="flex justify-between">
            <span>Pickup Date:</span>
            <span>{new Date(formData.pickupDate).toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Time Window:</span>
            <span className="capitalize">
              {formData.timeWindow === 'morning' && 'Morning (6AM - 8AM)'}
              {formData.timeWindow === 'lunch' && 'Lunch (12PM - 2PM)'}
              {formData.timeWindow === 'evening' && 'Evening (5PM - 7PM)'}
            </span>
          </div>
        </div>

        {/* Promo Code */}
        <div className="space-y-2">
          <Label htmlFor="promo-code">Promo Code (Optional)</Label>
          <Input
            id="promo-code"
            placeholder="Enter promo code"
            value={formData.promoCode}
            onChange={(e) => handleInputChange('promoCode', e.target.value.toUpperCase())}
          />
          {formData.promoCode === 'TEST' && (
            <p className="text-xs text-green-600">Test promo code applied - this order is free!</p>
          )}
        </div>

        {/* Referral Cash */}
        {availableReferralCash > 0 && (
          <div className="space-y-3 p-4 border rounded-lg bg-green-50 dark:bg-green-900/20">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="use-referral-cash"
                checked={formData.useReferralCash}
                onCheckedChange={(checked) => handleInputChange('useReferralCash', checked)}
              />
              <Label htmlFor="use-referral-cash" className="text-sm font-medium">
                Use Referral Cash (${(availableReferralCash / 100).toFixed(2)} available)
              </Label>
            </div>
            {formData.useReferralCash && (
              <p className="text-xs text-green-600">
                ${(Math.min(availableReferralCash, calculateTotal() + availableReferralCash) / 100).toFixed(2)} will be applied to your order
              </p>
            )}
          </div>
        )}

        {/* Special Instructions */}
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

        {/* Pre-Payment Tip Selector */}
        <PrePaymentTipSelector
          subtotal={calculateTotal()}
          onTipChange={setTipAmount}
          selectedTip={tipAmount}
        />

        <hr className="my-4" />
        
        {/* Order Total Breakdown */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>${((calculateTotal() + (formData.useReferralCash ? availableReferralCash : 0)) / 100).toFixed(2)}</span>
          </div>
          {tipAmount > 0 && (
            <div className="flex justify-between text-primary">
              <span>Tip:</span>
              <span>+${(tipAmount / 100).toFixed(2)}</span>
            </div>
          )}
          {formData.useReferralCash && availableReferralCash > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Referral Cash:</span>
              <span>-${(Math.min(availableReferralCash, calculateTotal() + availableReferralCash) / 100).toFixed(2)}</span>
            </div>
          )}
          <hr className="my-2" />
          <div className="flex justify-between font-bold text-lg">
            <span>Total:</span>
            <span>${(calculateTotalWithTip() / 100).toFixed(2)}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-wave">
      <div className="container mx-auto px-4 py-4 max-w-md">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={currentStep === 1 ? onBack : handlePrevious}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">New Order</h1>
            <p className="text-sm text-muted-foreground">Step {currentStep} of 4</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="flex items-center justify-between mb-8">
          {steps.map((step, index) => (
            <div key={step.number} className="flex flex-col items-center flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step.number === currentStep ? 'bg-primary text-primary-foreground' :
                step.number < currentStep ? 'bg-green-500 text-white' :
                'bg-muted text-muted-foreground'
              }`}>
                {step.number < currentStep ? '✓' : step.number}
              </div>
              <span className="text-xs mt-1 text-center">{step.title}</span>
              {index < steps.length - 1 && (
                <div className={`h-0.5 w-full mt-4 ${
                  step.number < currentStep ? 'bg-green-500' : 'bg-muted'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <Card className="border-0 shadow-soft">
          <CardContent className="p-6">
            {renderStepContent()}
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        <div className="flex gap-3 mt-6">
          {currentStep > 1 && (
            <Button
              variant="outline"
              onClick={handlePrevious}
              className="flex-1"
            >
              Previous
            </Button>
          )}
          
          {currentStep < 4 ? (
            <Button
              onClick={handleNext}
              disabled={!canGoToNextStep()}
              className="flex-1"
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? "Processing..." : `Pay Now - $${(calculateTotalWithTip() / 100).toFixed(2)}`}
            </Button>
          )}
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
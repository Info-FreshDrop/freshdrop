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
import { useCapacitor } from "@/hooks/useCapacitor";
import { supabase } from "@/integrations/supabase/client";
import { Elements } from '@stripe/react-stripe-js';
import { stripePromise } from '@/lib/stripe';
import { EmbeddedPaymentForm } from '@/components/payment/EmbeddedPaymentForm';
import { 
  Package, 
  MapPin, 
  Clock, 
  Truck, 
  Calendar,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
  Crosshair,
  Loader2
} from "lucide-react";

interface OrderPlacementProps {
  onBack: () => void;
}

export function OrderPlacement({ onBack }: OrderPlacementProps) {
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
  const [selectedPickupDate, setSelectedPickupDate] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [clientSecret, setClientSecret] = useState('');
  const [orderId, setOrderId] = useState('');
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
    detergentType: 'standard',
    fragranceFree: false,
    shirtsOnHangers: false,
    extraRinse: false,
    promoCode: ''
  });

  const { user } = useAuth();
  const { toast } = useToast();
  const { getCurrentLocation } = useCapacitor();

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

  // Reverse geocoding function using free API with CORS proxy
  const reverseGeocode = async (latitude: number, longitude: number) => {
    try {
      const response = await fetch(
        `https://api.allorigins.win/get?url=${encodeURIComponent(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
        )}`
      );
      const data = await response.json();
      const result = JSON.parse(data.contents);
      
      if (result && result.display_name) {
        // Extract zip code from the address
        const zipCode = result.address?.postcode || '';
        
        // Format the address nicely
        const addressParts = [
          result.address?.house_number,
          result.address?.road,
          result.address?.city || result.address?.town || result.address?.village,
          result.address?.state,
          zipCode
        ].filter(Boolean);
        
        const formattedAddress = addressParts.join(', ');
        
        return {
          address: formattedAddress,
          zipCode: zipCode
        };
      }
      throw new Error('No address found');
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
      throw error;
    }
  };

  // Address autocomplete function using Mapbox geocoding
  const searchAddresses = async (query: string) => {
    if (query.length < 3) {
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
      console.error('Address search failed:', error);
      // Silently fail - don't show error to user
      setAddressSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Handle address suggestion selection
  const handleAddressSelect = (suggestion: any) => {
    // Extract zip code from the formatted address or use a regex
    const zipRegex = /\b\d{5}(-\d{4})?\b/;
    const zipMatch = suggestion.formatted.match(zipRegex);
    const zipCode = zipMatch ? zipMatch[0] : '';
    
    handleInputChange('pickupAddress', suggestion.formatted);
    handleInputChange('deliveryAddress', suggestion.formatted);
    if (zipCode) {
      handleInputChange('zipCode', zipCode);
    }
    setShowSuggestions(false);
    setAddressSuggestions([]);
  };

  // Handle location detection with better error handling and fallback
  const handleDetectLocation = async () => {
    setIsDetectingLocation(true);
    console.log('Starting location detection...');
    
    try {
      // Check if geolocation is supported
      if (!navigator.geolocation) {
        throw new Error('Geolocation is not supported by this browser');
      }

      console.log('Requesting current position...');
      
      let location;
      try {
        // Try Capacitor first (for mobile apps)
        location = await getCurrentLocation();
        console.log('Location received from Capacitor:', location);
      } catch (capacitorError) {
        console.log('Capacitor geolocation failed, trying browser API:', capacitorError);
        
        // Fallback to browser geolocation API
        location = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              resolve({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy
              });
            },
            (error) => {
              console.error('Browser geolocation error:', error);
              reject(error);
            },
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 60000
            }
          );
        });
        console.log('Location received from browser API:', location);
      }
      
      const addressData = await reverseGeocode(location.latitude, location.longitude);
      console.log('Address data:', addressData);
      
      // Update form data with detected address and zip code
      handleInputChange('pickupAddress', addressData.address);
      handleInputChange('deliveryAddress', addressData.address);
      if (addressData.zipCode) {
        handleInputChange('zipCode', addressData.zipCode);
      }
      
      toast({
        title: "Location Detected",
        description: "Your address has been automatically filled in.",
      });
    } catch (error) {
      console.error('Location detection failed:', error);
      
      // More specific error messages
      let errorMessage = "Unable to detect your location. Please enter your address manually.";
      if (error instanceof Error) {
        if (error.message.includes('Permission denied') || (error as any).code === 1) {
          errorMessage = "Location access denied. Please allow location permissions and try again.";
        } else if (error.message.includes('Position unavailable') || (error as any).code === 2) {
          errorMessage = "Your location is currently unavailable. Please enter your address manually.";
        } else if (error.message.includes('Timeout') || (error as any).code === 3) {
          errorMessage = "Location request timed out. Please try again or enter your address manually.";
        }
      }
      
      toast({
        title: "Location Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsDetectingLocation(false);
    }
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
    
    if (selectedStartTime <= oneHourFromNow) {
      return { 
        valid: false, 
        message: "Pickup time must be at least 1 hour from now. Please select a later date or time window." 
      };
    }
    
    return { valid: true, message: "" };
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

      // Validate pickup date and time
      const dateTimeValidation = validatePickupDateTime();
      if (!dateTimeValidation.valid) {
        toast({
          title: "Invalid Pickup Time",
          description: dateTimeValidation.message,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

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
        soap_preference_id: formData.soapPreference,
        wash_temp_preference_id: formData.washTempPreference,
        dry_temp_preference_id: formData.dryTempPreference,
        pickup_window_start: pickupStart.toISOString(),
        pickup_window_end: pickupEnd.toISOString(),
        delivery_window_start: isExpress ? pickupEnd.toISOString() : deliveryStart.toISOString(),
        delivery_window_end: isExpress ? new Date(pickupEnd.getTime() + 2 * 60 * 60 * 1000).toISOString() : deliveryEnd.toISOString()
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

      if (data?.clientSecret && data?.orderId) {
        console.log('Payment intent created successfully');
        setClientSecret(data.clientSecret);
        setOrderId(data.orderId);
        setShowPayment(true);
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

  const selectedLocker = lockers.find(l => l.id === formData.lockerId);
  const expressAvailable = isExpressAvailable();

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
              Back to Order Details
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
                    <div className="space-y-2 relative">
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
                      <Input
                        id="service-address"
                        placeholder="Enter your address for both pickup and delivery, or use auto-detect"
                        value={formData.pickupAddress}
                        onChange={(e) => {
                          const value = e.target.value;
                          handleInputChange('pickupAddress', value);
                          handleInputChange('deliveryAddress', value); // Same address for both
                          searchAddresses(value); // Trigger address search
                        }}
                        onFocus={() => {
                          if (formData.pickupAddress.length >= 3) {
                            searchAddresses(formData.pickupAddress);
                          }
                        }}
                        onBlur={() => {
                          // Delay hiding suggestions to allow clicking on them
                          setTimeout(() => setShowSuggestions(false), 200);
                        }}
                        required={orderType === 'pickup_delivery'}
                      />
                      
                      {/* Address Suggestions Dropdown */}
                      {showSuggestions && addressSuggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 z-50 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                          {addressSuggestions.map((suggestion, index) => (
                            <button
                              key={index}
                              type="button"
                              className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 text-sm"
                              onClick={() => handleAddressSelect(suggestion)}
                            >
                              <div className="font-medium">{suggestion.formatted}</div>
                              <div className="text-xs text-gray-500 mt-1">{suggestion.display_name}</div>
                            </button>
                          ))}
                        </div>
                      )}
                      
                      <p className="text-xs text-muted-foreground">
                        We'll pickup and deliver to the same address. Click "Auto-detect" to use your current location or start typing for suggestions.
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
                    <SelectItem value="wash_fold">Wash and Fold</SelectItem>
                    <SelectItem value="delicates_airdry">Delicates / Air Dry</SelectItem>
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

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="pickup-date">Pickup Date</Label>
                    <Input
                      id="pickup-date"
                      type="date"
                      value={formData.pickupDate}
                      onChange={(e) => handleInputChange('pickupDate', e.target.value)}
                      min={new Date(Date.now() + 60 * 60 * 1000).toISOString().split('T')[0]} // At least 1 hour from now
                      required
                    />
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
                       Drop-off will be in the same time window the following day
                     </p>
                     {!validatePickupDateTime().valid && (
                       <div className="flex items-center gap-2 text-red-600">
                         <AlertCircle className="h-4 w-4" />
                         <span className="text-sm">{validatePickupDateTime().message}</span>
                       </div>
                     )}
                  </div>

                  {/* Laundry Preferences */}
                  <div className="space-y-4 border-t pt-6">
                    <h4 className="font-semibold text-lg">Laundry Preferences</h4>
                    
                    <div className="space-y-4">
                      {/* Soap Selection */}
                      <div className="space-y-2">
                        <Label htmlFor="soap-preference">Soap Type</Label>
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
                        {laundryPreferences.find(p => p.id === formData.soapPreference)?.description && (
                          <p className="text-xs text-muted-foreground">
                            {laundryPreferences.find(p => p.id === formData.soapPreference)?.description}
                          </p>
                        )}
                      </div>

                      {/* Wash Temperature */}
                      <div className="space-y-2">
                        <Label htmlFor="wash-temp">Wash Temperature</Label>
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
                        {laundryPreferences.find(p => p.id === formData.washTempPreference)?.description && (
                          <p className="text-xs text-muted-foreground">
                            {laundryPreferences.find(p => p.id === formData.washTempPreference)?.description}
                          </p>
                        )}
                      </div>

                      {/* Dry Temperature */}
                      <div className="space-y-2">
                        <Label htmlFor="dry-temp">Dry Temperature</Label>
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
                        {laundryPreferences.find(p => p.id === formData.dryTempPreference)?.description && (
                          <p className="text-xs text-muted-foreground">
                            {laundryPreferences.find(p => p.id === formData.dryTempPreference)?.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
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
            disabled={isLoading || !validateServiceArea().valid || !serviceType || !formData.timeWindow || !formData.pickupDate || !formData.soapPreference || !formData.washTempPreference || !formData.dryTempPreference || (orderType === 'pickup_delivery' && !formData.pickupAddress)}
            >
              {isLoading ? "Processing Payment..." : `Pay Now - $${(calculateTotal() / 100).toFixed(2)}`}
            </Button>
        </form>
      </div>
    </div>
  );
}
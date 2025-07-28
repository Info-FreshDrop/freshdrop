import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ClothesShop } from "@/components/customer/ClothesShop";
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
    promoCode: ''
  });

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
      
      // Mock address for demo - in real app, use reverse geocoding
      const mockAddress = "123 Main St, Springfield, MO 65804";
      handleInputChange('pickupAddress', mockAddress);
      handleInputChange('deliveryAddress', mockAddress);
      handleInputChange('zipCode', '65804');
      
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
    if (formData.promoCode === 'TEST') {
      total = 0; // 100% off for testing
    }
    
    return total;
  };

  const canGoToNextStep = () => {
    switch (currentStep) {
      case 1:
        return formData.zipCode && validateServiceArea().valid && serviceType && 
               (orderType === 'locker' ? formData.lockerId : formData.pickupAddress);
      case 2:
        return formData.timeWindow && formData.pickupDate && 
               formData.soapPreference && formData.washTempPreference && formData.dryTempPreference;
      case 3:
        return true; // Shop is optional
      default:
        return true;
    }
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
        items: [{ time_window: formData.timeWindow, shop_items: selectedShopItems }],
        total_amount_cents: calculateTotal(),
        soap_preference_id: formData.soapPreference,
        wash_temp_preference_id: formData.washTempPreference,
        dry_temp_preference_id: formData.dryTempPreference,
        pickup_window_start: pickupStart.toISOString(),
        pickup_window_end: pickupEnd.toISOString(),
        delivery_window_start: isExpress ? pickupEnd.toISOString() : deliveryStart.toISOString(),
        delivery_window_end: isExpress ? new Date(pickupEnd.getTime() + 2 * 60 * 60 * 1000).toISOString() : deliveryEnd.toISOString()
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
        <Input
          id="service-address"
          placeholder="Enter your address"
          value={formData.pickupAddress}
          onChange={(e) => {
            handleInputChange('pickupAddress', e.target.value);
            handleInputChange('deliveryAddress', e.target.value);
          }}
          required={orderType === 'pickup_delivery'}
        />
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
          min={new Date(Date.now() + 60 * 60 * 1000).toISOString().split('T')[0]}
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
      </div>

      {/* Bag Count */}
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

      {/* Express Service */}
      {isExpressAvailable() && (
        <Card className={`cursor-pointer transition-all ${isExpress ? 'ring-2 ring-primary' : ''}`} onClick={() => setIsExpress(!isExpress)}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Express Service (+$20)</h4>
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

  const renderOrderSummary = () => (
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
          <span>{formData.bagCount} × $35.00 = ${(formData.bagCount * 35).toFixed(2)}</span>
        </div>
        {isExpress && (
          <div className="flex justify-between">
            <span>Express Service:</span>
            <span>$20.00</span>
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

      <hr className="my-4" />
      <div className="flex justify-between font-bold text-lg">
        <span>Total:</span>
        <span>${(calculateTotal() / 100).toFixed(2)}</span>
      </div>
    </div>
  );

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
              {isLoading ? "Processing..." : `Pay Now - $${(calculateTotal() / 100).toFixed(2)}`}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
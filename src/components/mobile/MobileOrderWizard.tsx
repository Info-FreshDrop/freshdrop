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
  const [orderType, setOrderType] = useState<'pickup_delivery'>('pickup_delivery');
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
        pickup_address: formData.pickupAddress,
        delivery_address: formData.deliveryAddress,
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
        return (
          <div className="space-y-6 p-1">
            {/* Service Type Selection */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Service Type</h3>
              <Card className="border-primary bg-primary/5">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Truck className="h-6 w-6 text-primary" />
                    <div className="flex-1">
                      <h4 className="font-medium">Pickup & Delivery</h4>
                      <p className="text-sm text-muted-foreground">We handle pickup and delivery</p>
                    </div>
                    <CheckCircle className="h-5 w-5 text-primary" />
                  </div>
                </CardContent>
              </Card>
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
                onChange={(e) => {
                  handleInputChange('pickupAddress', e.target.value);
                  handleInputChange('deliveryAddress', e.target.value);
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
            <div className="text-center py-6">
              <ShoppingBag className="h-16 w-16 mx-auto mb-4 text-primary" />
              <h3 className="text-lg font-semibold mb-2">Shop Items</h3>
              <p className="text-muted-foreground mb-4 text-sm">Add clothing and accessories (optional)</p>
              <Button 
                variant="outline" 
                onClick={() => setShowShopModal(true)}
                className="w-full h-12"
              >
                Browse Shop Items
              </Button>
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
                onChange={(e) => handleInputChange('promoCode', e.target.value.toUpperCase())}
                className="h-12"
              />
              {formData.promoCode === 'TEST' && (
                <p className="text-xs text-green-600">Test promo applied - order is free!</p>
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
      <div className="max-w-md mx-auto bg-white min-h-screen">
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
        <div className="pb-24">
          {renderStepContent()}
        </div>

        {/* Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
          <div className="max-w-md mx-auto">
            {currentStep < 4 ? (
              <div className="flex gap-3">
                {currentStep > 1 && (
                  <Button
                    variant="outline"
                    onClick={handlePrevious}
                    className="flex-1 h-12"
                  >
                    Previous
                  </Button>
                )}
                <Button
                  onClick={handleNext}
                  disabled={!canGoToNextStep()}
                  className="flex-1 h-12"
                >
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isLoading}
                className="w-full h-12 text-lg font-semibold"
              >
                {isLoading ? "Processing..." : `Pay $${(calculateTotal() / 100).toFixed(2)}`}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
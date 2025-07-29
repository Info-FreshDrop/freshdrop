import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useCapacitor } from "@/hooks/useCapacitor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Package, 
  Users, 
  MapPin, 
  Clock,
  CheckCircle,
  Circle,
  Phone,
  MessageSquare,
  Camera,
  AlertTriangle,
  DollarSign,
  Star,
  Truck,
  Upload,
  X,
  Navigation,
  ArrowLeft,
  Check,
  Settings
} from "lucide-react";
import { ServiceAreaModal } from './ServiceAreaModal';
import { LiveOrderMap } from '../orders/LiveOrderMap';
import { OrdersOverviewMap } from '../orders/OrdersOverviewMap';

interface Order {
  id: string;
  customer_id: string;
  pickup_type: string;
  service_type: string;
  status: string;
  locker_id: string | null;
  is_express: boolean;
  pickup_window_start: string | null;
  pickup_window_end: string | null;
  delivery_window_start: string | null;
  delivery_window_end: string | null;
  items: any;
  bag_count: number;
  total_amount_cents: number;
  claimed_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  discount_amount_cents: number | null;
  operator_payout_cents: number | null;
  business_cut_cents: number | null;
  step_photos: any;
  current_step: number | null;
  special_instructions: string | null;
  pickup_address: string | null;
  delivery_address: string | null;
  zip_code: string;
  washer_id: string | null;
  profiles?: {
    first_name: string;
    last_name: string;
    phone: string;
  } | null;
}

interface OperatorProfile {
  first_name: string;
  last_name: string;
  phone: string;
}

interface WasherData {
  id: string;
  user_id: string;
  zip_codes: string[];
  is_online: boolean;
  is_active: boolean;
  current_location?: {
    coordinates: [number, number];
  };
}

export function OperatorDashboard() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const { getCurrentLocation } = useCapacitor();
  const [activeTab, setActiveTab] = useState("live-orders");
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [operatorProfile, setOperatorProfile] = useState<OperatorProfile | null>(null);
  const [washerData, setWasherData] = useState<WasherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmOrder, setConfirmOrder] = useState<Order | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderSteps, setOrderSteps] = useState<Record<string, number>>({});
  const [stepData, setStepData] = useState<Record<string, Record<string, any>>>({});
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);
  const [photoStep, setPhotoStep] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [photoUploaded, setPhotoUploaded] = useState<Record<string, boolean>>({});
  const [bagCountInput, setBagCountInput] = useState<string>("");
  const [newZipCode, setNewZipCode] = useState<string>("");
  const [isAddingZipCode, setIsAddingZipCode] = useState(false);
  const [showServiceAreaModal, setShowServiceAreaModal] = useState(false);
  const [showLiveMap, setShowLiveMap] = useState(false);
  const [selectedMapOrder, setSelectedMapOrder] = useState<Order | null>(null);
  const [operatorLocation, setOperatorLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      loadDashboardData();
      getCurrentOperatorLocation();
    }
  }, [user]);

  const getCurrentOperatorLocation = async () => {
    try {
      const position = await getCurrentLocation();
      const newLocation = {
        latitude: position.latitude,
        longitude: position.longitude
      };
      setOperatorLocation(newLocation);
      
      // Store location in washer profile for persistence
      if (washerData?.id) {
        try {
          await supabase
            .from('washers')
            .update({
              // Note: current_location might need to be added to the database schema
              // For now, we'll just store it in state
            })
            .eq('id', washerData.id);
        } catch (error) {
          console.warn('Could not update location in database:', error);
        }
      }
      
      console.log('Operator location updated:', newLocation);
    } catch (error) {
      console.warn('Could not get operator location:', error);
      // Try to get location from stored data if available
      if (washerData?.current_location) {
        try {
          const coords = washerData.current_location.coordinates;
          if (coords && coords.length === 2) {
            setOperatorLocation({
              latitude: coords[1],
              longitude: coords[0]
            });
            console.log('Using stored operator location:', coords);
          }
        } catch (parseError) {
          console.warn('Could not parse stored location:', parseError);
        }
      }
    }
  };

  const loadDashboardData = async () => {
    try {
      // Load operator profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, phone')
        .eq('user_id', user?.id)
        .single();

      setOperatorProfile(profile);

      // Load washer data
      const { data: washer, error: washerError } = await supabase
        .from('washers')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (washerError || !washer) {
        console.error('Error loading washer data:', washerError);
        setLoading(false);
        return;
      }

      setWasherData(washer);

      // Load available orders
      const { data: available, error: availableError } = await supabase
        .from('orders')
        .select(`
          *,
          profiles!orders_customer_id_profiles_fkey(first_name, last_name, phone)
        `)
        .eq('status', 'unclaimed')
        .in('zip_code', washer.zip_codes)
        .order('created_at', { ascending: true });

      if (availableError) {
        console.error('Error loading available orders:', availableError);
      }
      setAvailableOrders((available as any) || []);

      // Load operator's claimed orders
      const { data: claimed, error: claimedError } = await supabase
        .from('orders')
        .select(`
          *,
          profiles!orders_customer_id_profiles_fkey(first_name, last_name, phone)
        `)
        .eq('washer_id', washer.id)
        .in('status', ['claimed', 'in_progress', 'picked_up', 'washed', 'folded', 'completed'])
        .order('claimed_at', { ascending: true });

      if (claimedError) {
        console.error('Error loading claimed orders:', claimedError);
      }
      const claimedOrders = (claimed as any) || [];
      setMyOrders(claimedOrders);

      setLoading(false);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      setLoading(false);
    }
  };

  const getOrderProgressInfo = (order: Order) => {
    const currentStep = orderSteps[order.id] || order.current_step || 1;
    
    const progressMap: Record<string, { text: string; color: string; step: number }> = {
      'claimed': { text: 'Ready for pickup', color: 'text-blue-600', step: 1 },
      'in_progress': { text: 'In progress', color: 'text-orange-600', step: 6 },
      'picked_up': { text: 'Picked up, heading to wash', color: 'text-purple-600', step: 7 },
      'washed': { text: 'Washed, ready for folding', color: 'text-indigo-600', step: 9 },
      'folded': { text: 'Folded, ready for delivery', color: 'text-green-600', step: 11 },
      'completed': { text: 'Completed', color: 'text-green-700', step: 13 }
    };

    const info = progressMap[order.status] || { text: 'Unknown status', color: 'text-gray-600', step: 1 };
    return {
      progressText: info.text,
      progressColor: info.color,
      currentStep: Math.max(currentStep, info.step)
    };
  };

  const openLiveOrderMap = (order: Order) => {
    setSelectedMapOrder(order);
    setShowLiveMap(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !washerData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <h3 className="text-lg font-medium mb-2">Access Denied</h3>
              <p className="text-muted-foreground mb-4">You need operator privileges to access this dashboard.</p>
              <Button onClick={signOut} variant="outline">
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-wave">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={signOut}
            className="p-0 h-auto text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Exit Dashboard
          </Button>
        </div>
        
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Operator Dashboard
            </h1>
            <p className="text-muted-foreground">
              Welcome back, {operatorProfile?.first_name}! Manage your orders and workflow.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
              washerData.is_online ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
            }`}>
              <div className={`w-2 h-2 rounded-full ${washerData.is_online ? 'bg-green-500' : 'bg-gray-400'}`} />
              {washerData.is_online ? 'Online' : 'Offline'}
            </div>
          </div>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="live-orders" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Live Orders ({availableOrders.length})
            </TabsTrigger>
            <TabsTrigger value="my-orders" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              My Orders ({myOrders.length})
            </TabsTrigger>
            <TabsTrigger value="account" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Account
            </TabsTrigger>
          </TabsList>

          {/* Live Orders Tab */}
          <TabsContent value="live-orders" className="space-y-4">
            <div className="text-center mb-4">
              <h2 className="text-lg font-semibold">Available Orders</h2>
              <p className="text-sm text-muted-foreground">Claim orders in your service area</p>
            </div>

            {availableOrders.length === 0 ? (
              <Card className="p-8 text-center">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No available orders</h3>
                <p className="text-muted-foreground">New orders in your area will appear here automatically.</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {availableOrders.map((order) => (
                  <Card key={order.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-semibold">Order #{order.id.slice(0, 8)}</h4>
                          <p className="text-sm text-muted-foreground">
                            {order.profiles?.first_name} {order.profiles?.last_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {order.service_type.replace('_', ' ')} • {order.bag_count} bags
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant={order.is_express ? "destructive" : "secondary"}>
                            {order.is_express ? "Express" : "Standard"}
                          </Badge>
                          <p className="text-lg font-bold text-green-600">
                            ${(order.total_amount_cents / 100).toFixed(2)}
                          </p>
                        </div>
                      </div>
                      
                      <Button 
                        className="w-full" 
                        onClick={() => setConfirmOrder(order)}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Claim Order
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* My Orders Tab */}
          <TabsContent value="my-orders" className="space-y-4">
            <div className="text-center mb-4">
              <h2 className="text-lg font-semibold">Your Orders</h2>
              <p className="text-sm text-muted-foreground">Track and manage your claimed orders</p>
            </div>

            {myOrders.length === 0 ? (
              <Card className="p-8 text-center">
                <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No orders</h3>
                <p className="text-muted-foreground">Claim orders from the Live Orders tab to see them here!</p>
              </Card>
            ) : (
              <div className="space-y-6">
                {(() => {
                  const activeOrders = myOrders.filter(order => 
                    !['completed', 'delivered'].includes(order.status)
                  );
                  const completedOrders = myOrders.filter(order => 
                    ['completed', 'delivered'].includes(order.status)
                  );

                  return (
                    <>
                      {/* Maps for active orders only */}
                      {activeOrders.length > 0 && (
                        <OrdersOverviewMap
                          orders={activeOrders}
                          currentLocation={operatorLocation}
                        />
                      )}
                      
                      {/* Active Orders Section */}
                      {activeOrders.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                            <Clock className="h-5 w-5 text-primary" />
                            Active Orders ({activeOrders.length})
                          </h3>
                          <div className="space-y-4">
                            {activeOrders.map((order) => {
                              const { progressText, progressColor, currentStep } = getOrderProgressInfo(order);
                              
                              return (
                                <Card 
                                  key={order.id} 
                                  className="hover:shadow-md transition-shadow"
                                >
                                  <CardContent className="p-4">
                                    <div className="flex justify-between items-start mb-3">
                                      <div>
                                        <h4 className="font-semibold">Order #{order.id.slice(0, 8)}</h4>
                                        <p className="text-sm text-muted-foreground">
                                          {order.profiles?.first_name} {order.profiles?.last_name}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                          {order.service_type.replace('_', ' ')} • {order.bag_count} bags
                                        </p>
                                      </div>
                                      <div className="text-right">
                                        <Badge variant={order.is_express ? "destructive" : "secondary"}>
                                          {order.is_express ? "Express" : "Standard"}
                                        </Badge>
                                        <p className="text-xs text-muted-foreground mt-1">
                                          Due: {order.pickup_window_end && new Date(order.pickup_window_end).toLocaleTimeString([], { 
                                            hour: '2-digit', 
                                            minute: '2-digit' 
                                          })}
                                        </p>
                                      </div>
                                    </div>
                                    
                                    {/* Progress Information */}
                                    <div className="border-t pt-3">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <div className="w-2 h-2 rounded-full bg-current animate-pulse" />
                                          <span className={`text-sm font-medium ${progressColor}`}>
                                            {progressText}
                                          </span>
                                        </div>
                                        <span className="text-xs text-muted-foreground">
                                          Step {currentStep}/13
                                        </span>
                                      </div>
                                      
                                      {/* Progress bar */}
                                      <div className="w-full bg-muted rounded-full h-1.5 mt-2">
                                        <div 
                                          className="bg-primary h-1.5 rounded-full transition-all" 
                                          style={{ width: `${(currentStep / 13) * 100}%` }}
                                        />
                                      </div>
                                      
                                      {/* Action buttons */}
                                      <div className="flex gap-2 mt-3">
                                        <Button 
                                          size="sm" 
                                          onClick={() => setSelectedOrder(order)}
                                        >
                                          View Workflow
                                        </Button>
                                        <Button 
                                          variant="outline" 
                                          size="sm"
                                          onClick={() => openLiveOrderMap(order)}
                                        >
                                          <MapPin className="h-4 w-4 mr-1" />
                                          Map
                                        </Button>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Completed Orders Section */}
                      {completedOrders.length > 0 && (
                        <div className="mt-8">
                          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                            Completed Orders ({completedOrders.length})
                          </h3>
                          <div className="space-y-3">
                            {completedOrders.map((order) => (
                              <Card 
                                key={order.id} 
                                className="bg-green-50 border-green-200"
                              >
                                <CardContent className="p-4">
                                  <div className="flex justify-between items-center">
                                    <div>
                                      <h4 className="font-medium">Order #{order.id.slice(0, 8)}</h4>
                                      <p className="text-sm text-muted-foreground">
                                        {order.profiles?.first_name} {order.profiles?.last_name}
                                      </p>
                                      <p className="text-sm text-muted-foreground">
                                        {order.service_type.replace('_', ' ')} • {order.bag_count} bags
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      <Badge variant="outline" className="text-green-600 border-green-600">
                                        {order.status === 'completed' ? 'Completed' : 'Delivered'}
                                      </Badge>
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {order.completed_at && new Date(order.completed_at).toLocaleDateString()}
                                      </p>
                                      <p className="text-sm font-medium text-green-600">
                                        ${(order.total_amount_cents / 100).toFixed(2)}
                                      </p>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
          </TabsContent>

          {/* Account Tab */}
          <TabsContent value="account" className="space-y-4">
            <div className="text-center mb-4">
              <h2 className="text-lg font-semibold">Account Settings</h2>
              <p className="text-sm text-muted-foreground">Manage your profile and preferences</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="font-medium">Name</p>
                    <p className="text-muted-foreground">
                      {operatorProfile?.first_name} {operatorProfile?.last_name}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium">Phone</p>
                    <p className="text-muted-foreground">{operatorProfile?.phone}</p>
                  </div>
                  <div>
                    <p className="font-medium">Service Areas</p>
                    <p className="text-muted-foreground">
                      {washerData?.zip_codes?.join(', ') || 'None assigned'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Status Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Online Status</p>
                      <p className="text-sm text-muted-foreground">
                        Control your availability for new orders
                      </p>
                    </div>
                    <Switch
                      checked={washerData.is_online}
                      disabled={true}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Live Order Map Modal */}
        {selectedMapOrder && (
          <LiveOrderMap
            isOpen={showLiveMap}
            onClose={() => {
              setShowLiveMap(false);
              setSelectedMapOrder(null);
            }}
            order={selectedMapOrder}
            operatorLocation={operatorLocation}
          />
        )}
      </div>
    </div>
  );
}
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
  Check
} from "lucide-react";

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
  special_instructions: string | null;
  pickup_address: string | null;
  delivery_address: string | null;
  zip_code: string;
  washer_id: string | null;
  claimed_at: string | null;
  completed_at: string | null;
  created_at: string;
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
  is_online: boolean;
  zip_codes: string[];
  locker_access: string[];
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      // Load operator profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, phone')
        .eq('user_id', user?.id)
        .single();

      setOperatorProfile(profile);

      // Load washer data (zip codes, online status)
      const { data: washer } = await supabase
        .from('washers')
        .select('id, is_online, zip_codes, locker_access')
        .eq('user_id', user?.id)
        .single();

      setWasherData(washer);

      if (washer) {
        console.log('Washer data:', washer);
        console.log('Looking for orders in zip codes:', washer.zip_codes);
        
        // First, let's check if there are ANY unclaimed orders at all
        const { data: allUnclaimed, error: allUnclaimedError } = await supabase
          .from('orders')
          .select('*')
          .eq('status', 'unclaimed');
        
        console.log('ALL unclaimed orders in database:', { allUnclaimed, allUnclaimedError });
        
        // Then check unclaimed orders in this specific zip code
        const { data: unclaimedInZip, error: unclaimedInZipError } = await supabase
          .from('orders')
          .select('*')
          .eq('status', 'unclaimed')
          .in('zip_code', washer.zip_codes);
        
        console.log('Unclaimed orders in zip codes:', { unclaimedInZip, unclaimedInZipError });
        
        // Now try the join without profiles first to see if that works
        const { data: ordersWithoutProfiles, error: ordersWithoutProfilesError } = await supabase
          .from('orders')
          .select('*')
          .eq('status', 'unclaimed')
          .in('zip_code', washer.zip_codes)
          .order('created_at', { ascending: true });
        
        console.log('Orders without profiles join:', { ordersWithoutProfiles, ordersWithoutProfilesError });
        
        // Finally, try with profiles using the correct foreign key
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
        console.log('Available orders query result:', { available, availableError });
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
        
        // Initialize orderSteps state from database current_step values
        const stepState: Record<string, number> = {};
        const photoState: Record<string, boolean> = {};
        claimedOrders.forEach((order: any) => {
          stepState[order.id] = order.current_step || 1;
          
          // Initialize photo upload state from existing step_photos
          if (order.step_photos) {
            Object.keys(order.step_photos).forEach(stepKey => {
              if (order.step_photos[stepKey]) {
                const stepNum = stepKey.replace('step_', '');
                photoState[`${order.id}-${stepNum}`] = true;
              }
            });
          }
        });
        setOrderSteps(stepState);
        setPhotoUploaded(photoState);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const claimOrder = async (orderId: string) => {
    if (!washerData) {
      toast({
        title: "Error",
        description: "Unable to find your operator profile. Please try logging in again.",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('Claiming order:', orderId, 'with washer:', washerData.id);
      
      const { error } = await supabase
        .from('orders')
        .update({
          washer_id: washerData.id,
          status: 'claimed',
          claimed_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .eq('status', 'unclaimed'); // Only claim if still unclaimed

      if (error) {
        console.error('Claim order error:', error);
        throw error;
      }

      // TODO: Send notification to customer (email/SMS)
      // This would typically call an edge function to send notifications
      console.log('Order claimed successfully - customer notification would be sent here');

      toast({
        title: "Order Claimed!",
        description: "You've successfully claimed this order. Customer has been notified.",
      });

      setConfirmOrder(null); // Close confirmation dialog
      loadDashboardData(); // Refresh data
    } catch (error) {
      console.error('Error claiming order:', error);
      toast({
        title: "Error",
        description: "Failed to claim order. It may have been claimed by another operator.",
        variant: "destructive"
      });
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: 'claimed' | 'in_progress' | 'washed' | 'completed') => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;

      // Send notification to customer about status update
      console.log(`Sending notification to customer: Order ${newStatus.replace('_', ' ')}`);
      
      // TODO: Call edge function to send SMS/email notification
      // This would call an edge function like: supabase.functions.invoke('notify-customer', { orderId, status: newStatus })

      toast({
        title: "Status Updated",
        description: `Order marked as ${newStatus.replace('_', ' ')}. Customer has been notified.`,
      });

      setSelectedOrder(null); // Close the workflow dialog
      loadDashboardData(); // Refresh data
    } catch (error) {
      console.error('Error updating order status:', error);
      toast({
        title: "Error",
        description: "Failed to update status. Please try again.",
        variant: "destructive"
      });
    }
  };

  const completeStep = async (orderId: string, stepNumber: number) => {
    try {
      // Update step completion for this specific order
      const newCurrentStep = stepNumber + 1;
      setOrderSteps(prev => ({ ...prev, [orderId]: newCurrentStep }));
      
      // Update database with current step and completion timestamp
      const stepCompletedAt = { [`step_${stepNumber}`]: new Date().toISOString() };
      
      // Determine order status based on step
      let newStatus: 'placed' | 'unclaimed' | 'claimed' | 'in_progress' | 'washed' | 'returned' | 'completed' | 'cancelled' | 'picked_up' | 'folded' = 'claimed';
      if (stepNumber === 6) newStatus = 'picked_up';        // After pickup
      if (stepNumber === 8) newStatus = 'washed';           // After washing  
      if (stepNumber === 9) newStatus = 'folded';           // After folding
      if (stepNumber === 13) newStatus = 'completed';       // After delivery (step 13)
      
      console.log(`Updating order ${orderId}: step ${stepNumber} -> ${newCurrentStep}, status: ${newStatus}`);
      
      const { error } = await supabase
        .from('orders')
        .update({ 
          current_step: newCurrentStep,
          step_completed_at: stepCompletedAt,
          status: newStatus
        })
        .eq('id', orderId);

      if (error) {
        console.error('Error updating order:', error);
        throw error;
      }
      
      // Notify customer of progress
      console.log(`Step ${stepNumber} completed for order ${orderId} - Status: ${newStatus}`);
      
      // Send customer notification based on step
      if (stepNumber === 6) {
        console.log('Sending pickup confirmation to customer');
        // TODO: Call notification edge function
      } else if (stepNumber === 13) {
        console.log('Sending delivery confirmation to customer - ORDER COMPLETED');
        // TODO: Call notification edge function
      }
      
      toast({
        title: "Step Complete",
        description: `Step ${stepNumber} completed. Order status: ${newStatus.replace('_', ' ')}`,
      });

      // Force component re-render
      if (selectedOrder) {
        setSelectedOrder({...selectedOrder, status: newStatus});
      }
      
      // Refresh data to show updated progress
      loadDashboardData();
    } catch (error) {
      console.error('Error completing step:', error);
      toast({
        title: "Error",
        description: "Failed to complete step. Please try again.",
        variant: "destructive"
      });
    }
  };

  const uploadPhoto = async (file: File, orderId: string, stepNumber: number) => {
    if (!file || !user) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${orderId}/step-${stepNumber}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('order-photos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data } = supabase.storage
        .from('order-photos')
        .getPublicUrl(fileName);

      const photoUrl = data.publicUrl;

      // Update order with photo URL
      const updateData: any = {};
      if (stepNumber === 4) {
        updateData.pickup_photo_url = photoUrl;
      } else if (stepNumber === 13) {
        updateData.delivery_photo_url = photoUrl;
      } else {
        // Store in step_photos JSON object
        const { data: currentOrder } = await supabase
          .from('orders')
          .select('step_photos')
          .eq('id', orderId)
          .single();

        const stepPhotos = currentOrder?.step_photos || {};
        stepPhotos[`step_${stepNumber}`] = photoUrl;
        updateData.step_photos = stepPhotos;
      }

      const { error: updateError } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId);

      if (updateError) throw updateError;

      // Mark photo as uploaded for this order and step
      setPhotoUploaded(prev => ({ ...prev, [`${orderId}-${stepNumber}`]: true }));

      toast({
        title: "Photo Uploaded",
        description: `Step ${stepNumber} photo uploaded successfully.`,
      });

      setShowPhotoUpload(false);
      setPhotoStep(null);
      loadDashboardData(); // Refresh data

    } catch (error) {
      console.error('Error uploading photo:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload photo. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const openGPSNavigation = async (address: string) => {
    try {
      // Try to get current location first
      const position = await getCurrentLocation();
      const { latitude, longitude } = position;
      
      // Create maps URL for navigation
      const destination = encodeURIComponent(address);
      const mapsUrl = `https://www.google.com/maps/dir/${latitude},${longitude}/${destination}`;
      
      // Open in browser/native maps app
      window.open(mapsUrl, '_blank');
      
      toast({
        title: "Opening Navigation",
        description: "Directions opened in your maps app",
      });
    } catch (error) {
      console.error('Error opening navigation:', error);
      // Fallback: just open maps with the address
      const destination = encodeURIComponent(address);
      const fallbackUrl = `https://www.google.com/maps/search/${destination}`;
      window.open(fallbackUrl, '_blank');
      
      toast({
        title: "Opening Maps",
        description: "Address opened in maps",
      });
    }
  };

  const canCompleteStep = (stepNumber: number, orderId: string) => {
    // Step 3 and 12 require photos (pickup and delivery)
    if (stepNumber === 3 || stepNumber === 12) {
      return photoUploaded[`${orderId}-${stepNumber}`] || false;
    }
    
    // Step 5 requires bag count verification
    if (stepNumber === 5) {
      const stepInfo = stepData[orderId]?.[`step_${stepNumber}`];
      return stepInfo?.bagCount !== undefined;
    }
    
    return true;
  };

  const updateStepData = (orderId: string, stepNumber: number, data: any) => {
    setStepData(prev => ({
      ...prev,
      [orderId]: {
        ...prev[orderId],
        [`step_${stepNumber}`]: { ...prev[orderId]?.[`step_${stepNumber}`], ...data }
      }
    }));
  };

  const getCustomerPreferences = (order: Order) => {
    const preferences = [];
    
    if (order.service_type === 'wash_fold') {
      preferences.push('Wash & Fold');
    } else if (order.service_type === 'wash_hang_dry') {
      preferences.push('Wash & Hang Dry');
    }
    
    if (order.is_express) {
      preferences.push('Express Service (same day)');
    }
    
    if (order.special_instructions) {
      preferences.push(`Special Instructions: ${order.special_instructions}`);
    }
    
    return preferences;
  };

  const getLabelText = (order: Order, isDelivery: boolean = false) => {
    const customerName = `${order.profiles?.first_name || ''} ${order.profiles?.last_name || ''}`.trim();
    const orderNumber = order.id.slice(0, 8);
    const bagCount = order.bag_count;
    
    if (isDelivery) {
      return `DELIVERY - ${customerName} - Order #${orderNumber} - ${bagCount} bag(s)`;
    }
    
    return `${customerName} - Order #${orderNumber} - ${bagCount} bag(s)`;
  };

  const getDeliveryTimeInfo = (order: Order) => {
    if (!order.delivery_window_start || !order.delivery_window_end) {
      return "No delivery time specified";
    }
    
    const startTime = new Date(order.delivery_window_start);
    const endTime = new Date(order.delivery_window_end);
    
    return `${startTime.toLocaleDateString()} ${startTime.toLocaleTimeString([], { 
      hour: 'numeric', 
      minute: '2-digit' 
    })} - ${endTime.toLocaleTimeString([], { 
      hour: 'numeric', 
      minute: '2-digit' 
    })}`;
  };

  const getOrderProgressInfo = (order: Order) => {
    const currentStep = orderSteps[order.id] || 1;
    const stepNames = [
      "", "Preparing", "Going to pickup", "Locating bags", "Taking photo", 
      "Labeling bags", "Counting bags", "Picked up", "Going to washer", 
      "Washing", "Folding", "Bagging", "Re-labeling", "Delivering"
    ];
    
    let progressText = "";
    let progressColor = "";
    
    if (order.status === 'picked_up') {
      progressText = "🚗 In transit to washer";
      progressColor = "text-blue-600";
    } else if (order.status === 'washed') {
      progressText = "🧺 In washer/dryer";
      progressColor = "text-yellow-600";
    } else if (order.status === 'folded') {
      progressText = "👕 Folded & ready";
      progressColor = "text-green-600";
    } else if (order.status === 'completed') {
      progressText = "✅ Delivered";
      progressColor = "text-green-700";
    } else {
      progressText = stepNames[currentStep] || "Processing";
      progressColor = "text-blue-600";
    }
    
    return { progressText, progressColor, currentStep };
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && selectedOrder && photoStep) {
      uploadPhoto(file, selectedOrder.id, photoStep);
    }
  };

  const triggerPhotoUpload = (stepNumber: number) => {
    setPhotoStep(stepNumber);
    setShowPhotoUpload(true);
    setTimeout(() => fileInputRef.current?.click(), 100);
  };

  const toggleOnlineStatus = async (isOnline: boolean) => {
    if (!washerData) return;

    try {
      const { error } = await supabase
        .from('washers')
        .update({ is_online: isOnline })
        .eq('id', washerData.id);

      if (error) throw error;

      setWasherData({ ...washerData, is_online: isOnline });
      
      toast({
        title: isOnline ? "Now Online" : "Now Offline",
        description: isOnline ? "You'll receive new orders" : "You won't receive new orders",
      });
    } catch (error) {
      console.error('Error updating online status:', error);
    }
  };

  const formatTimeWindow = (start: string | null, end: string | null) => {
    if (!start || !end) return "No time specified";
    const startTime = new Date(start).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const endTime = new Date(end).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    return `${startTime} - ${endTime}`;
  };

  const getStatusIcon = (status: string, isCompleted: boolean) => {
    return isCompleted ? (
      <CheckCircle className="h-4 w-4 text-green-600" />
    ) : (
      <Circle className="h-4 w-4 text-gray-400" />
    );
  };

  const getOrderProgress = (status: string) => {
    const steps = ['claimed', 'in_progress', 'washed', 'completed'];
    const currentIndex = steps.indexOf(status);
    return steps.map((step, index) => ({
      name: step.replace('_', ' '),
      completed: index <= currentIndex
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-wave flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-wave">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Operator Dashboard
            </h1>
            <p className="text-muted-foreground">
              Welcome back, {operatorProfile?.first_name}!
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant={washerData?.is_online ? "default" : "secondary"} className="px-3 py-1">
              {washerData?.is_online ? "🟢 Online" : "🔴 Offline"}
            </Badge>
            <Button variant="outline" onClick={signOut}>
              Sign Out
            </Button>
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
              <h2 className="text-lg font-semibold">Available Orders in Your Area</h2>
              <p className="text-sm text-muted-foreground">
                Showing orders in zip codes: {washerData?.zip_codes?.join(', ')}
              </p>
            </div>

            {availableOrders.length === 0 ? (
              <Card className="p-8 text-center">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No orders available</h3>
                <p className="text-muted-foreground">Check back soon for new orders in your area!</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {availableOrders.map((order) => (
                  <Card key={order.id} className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold">
                          {order.profiles?.first_name} {order.profiles?.last_name}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {order.profiles?.phone}
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={order.is_express ? "destructive" : "secondary"}>
                          {order.is_express ? "Express" : "Standard"}
                        </Badge>
                        <p className="text-lg font-bold text-green-600 mt-1">
                          ${(order.total_amount_cents / 100).toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                      <div>
                        <p className="font-medium">Pickup Window</p>
                        <p className="text-muted-foreground">
                          {formatTimeWindow(order.pickup_window_start, order.pickup_window_end)}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium">Service Type</p>
                        <p className="text-muted-foreground capitalize">
                          {order.pickup_type} • {order.service_type}
                        </p>
                      </div>
                    </div>

                    {order.pickup_address && (
                      <div className="mb-3">
                        <p className="font-medium text-sm">Pickup Address</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {order.pickup_address}
                        </p>
                      </div>
                    )}

                    {order.special_instructions && (
                      <div className="mb-3">
                        <p className="font-medium text-sm">Special Instructions</p>
                        <p className="text-sm text-muted-foreground bg-muted p-2 rounded">
                          {order.special_instructions}
                        </p>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button 
                        onClick={() => setConfirmOrder(order)}
                        className="flex-1"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Claim Order
                      </Button>
                      <Button variant="outline" size="icon">
                        <MapPin className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* My Orders Tab */}
          <TabsContent value="my-orders" className="space-y-4">
            <div className="text-center mb-4">
              <h2 className="text-lg font-semibold">Your Active Orders</h2>
              <p className="text-sm text-muted-foreground">Track and manage your claimed orders</p>
            </div>

            {myOrders.length === 0 ? (
              <Card className="p-8 text-center">
                <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No active orders</h3>
                <p className="text-muted-foreground">Claim orders from the Live Orders tab to see them here!</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {myOrders.map((order) => {
                  const { progressText, progressColor, currentStep } = getOrderProgressInfo(order);
                  
                  return (
                    <Card 
                      key={order.id} 
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => setSelectedOrder(order)}
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
                          
                          {/* Quick status info */}
                          {order.status === 'washed' && (
                            <p className="text-xs text-orange-600 mt-1">
                              💧 Items are currently washing/drying
                            </p>
                          )}
                          {order.status === 'folded' && (
                            <p className="text-xs text-green-600 mt-1">
                              📦 Ready for delivery preparation
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Account Tab */}
          <TabsContent value="account" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Personal Info */}
              <Card className="p-4">
                <CardHeader className="px-0 pt-0">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Personal Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-0 space-y-3">
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

              {/* Status & Settings */}
              <Card className="p-4">
                <CardHeader className="px-0 pt-0">
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Status & Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-0 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Online Status</p>
                      <p className="text-sm text-muted-foreground">
                        {washerData?.is_online ? 'Receiving orders' : 'Not receiving orders'}
                      </p>
                    </div>
                    <Switch
                      checked={washerData?.is_online || false}
                      onCheckedChange={toggleOnlineStatus}
                    />
                  </div>
                  
                  <div>
                    <p className="font-medium">Locker Access</p>
                    <p className="text-sm text-muted-foreground">
                      {washerData?.locker_access?.length || 0} location(s)
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Performance Stats */}
              <Card className="p-4">
                <CardHeader className="px-0 pt-0">
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5" />
                    Performance
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-0 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Orders Completed</span>
                    <span className="font-medium">0</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Customer Rating</span>
                    <span className="font-medium">New</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">On-Time Rate</span>
                    <span className="font-medium">N/A</span>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card className="p-4">
                <CardHeader className="px-0 pt-0">
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-0 space-y-2">
                  <Button variant="outline" className="w-full justify-start">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Contact Support
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <DollarSign className="h-4 w-4 mr-2" />
                    View Earnings
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Truck className="h-4 w-4 mr-2" />
                    Training Materials
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Order Confirmation Dialog */}
        <Dialog open={!!confirmOrder} onOpenChange={() => setConfirmOrder(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Confirm Order Claim</DialogTitle>
              <DialogDescription>
                Are you sure you want to claim this order? Once claimed, you'll be responsible for pickup and delivery.
              </DialogDescription>
            </DialogHeader>
            
            {confirmOrder && (
              <div className="space-y-4 py-4">
                <div>
                  <h4 className="font-semibold">Customer Details</h4>
                  <p className="text-sm text-muted-foreground">
                    {confirmOrder.profiles?.first_name} {confirmOrder.profiles?.last_name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    📞 {confirmOrder.profiles?.phone}
                  </p>
                </div>
                
                <div>
                  <h4 className="font-semibold">Service Details</h4>
                  <p className="text-sm text-muted-foreground">
                    {confirmOrder.pickup_type} • {confirmOrder.service_type}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {confirmOrder.bag_count} bag(s) • ${(confirmOrder.total_amount_cents / 100).toFixed(2)}
                  </p>
                </div>
                
                {confirmOrder.pickup_address && (
                  <div>
                    <h4 className="font-semibold">Pickup Address</h4>
                    <p className="text-sm text-muted-foreground">
                      📍 {confirmOrder.pickup_address}
                    </p>
                  </div>
                )}
                
                {confirmOrder.delivery_address && (
                  <div>
                    <h4 className="font-semibold">Delivery Address</h4>
                    <p className="text-sm text-muted-foreground">
                      📍 {confirmOrder.delivery_address}
                    </p>
                  </div>
                )}
                
                {confirmOrder.special_instructions && (
                  <div>
                    <h4 className="font-semibold">Special Instructions</h4>
                    <p className="text-sm text-muted-foreground bg-muted p-2 rounded">
                      {confirmOrder.special_instructions}
                    </p>
                  </div>
                )}
                
                <div>
                  <h4 className="font-semibold">Pickup Window</h4>
                  <p className="text-sm text-muted-foreground">
                    {formatTimeWindow(confirmOrder.pickup_window_start, confirmOrder.pickup_window_end)}
                  </p>
                </div>
              </div>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmOrder(null)}>
                Cancel
              </Button>
              <Button onClick={() => confirmOrder && claimOrder(confirmOrder.id)}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Claim Order
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Step-by-Step Workflow Dialog */}
        <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setSelectedOrder(null)}
                    className="h-8 w-8 p-0"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  Order Workflow
                </div>
                <Badge variant={selectedOrder?.is_express ? "destructive" : "secondary"}>
                  {selectedOrder?.is_express ? "Express" : "Standard"}
                </Badge>
              </DialogTitle>
              <DialogDescription>
                Pickup Deadline: {selectedOrder?.pickup_window_end && 
                  new Date(selectedOrder.pickup_window_end).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })
                }
              </DialogDescription>
            </DialogHeader>
            
            {selectedOrder && (
              <div className="space-y-6 py-4">
                 {/* Progress Indicators */}
                <div className="flex justify-center space-x-4 mb-6">
                  {[
                    { label: "Prepare", icon: Package, active: selectedOrder.status === 'claimed' },
                    { label: "Pickup", icon: Truck, active: selectedOrder.status === 'in_progress' },
                    { label: "Wash", icon: Circle, active: selectedOrder.status === 'washed' },
                    { label: "Deliver", icon: CheckCircle, active: selectedOrder.status === 'completed' }
                  ].map((step, index) => (
                    <div key={index} className="flex flex-col items-center">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        step.active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                      }`}>
                        <step.icon className="h-6 w-6" />
                      </div>
                      <span className="text-xs mt-1">{step.label}</span>
                    </div>
                  ))}
                </div>

                {/* Combined Step 1 - Preparation and navigation combined */}
                {((selectedOrder ? (orderSteps[selectedOrder.id] || 1) : 1) === 1) && selectedOrder.status === 'claimed' && (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">1</div>
                      <h3 className="font-semibold text-lg">Prepare & Head to Pickup</h3>
                    </div>
                    <div className="space-y-3 text-sm">
                      <div>
                        <p className="font-medium mb-1">✅ Preparation checklist:</p>
                        <ul className="list-disc pl-4 space-y-1 text-xs">
                          <li>Clear bags for organization</li>
                          <li>Labels for identification</li>
                          <li>Pen for marking</li>
                        </ul>
                      </div>
                      <div>
                        <p className="font-medium mb-1">📍 Pickup Address:</p>
                        <p className="text-muted-foreground text-xs bg-background rounded p-2 border">{selectedOrder.pickup_address}</p>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => selectedOrder.pickup_address && openGPSNavigation(selectedOrder.pickup_address)}
                        className="w-full"
                      >
                        <Navigation className="h-3 w-3 mr-1" />
                        Open GPS Navigation
                      </Button>
                    </div>
                    <Button 
                      className="w-full mt-4" 
                      onClick={() => selectedOrder && completeStep(selectedOrder.id, 1)}
                    >
                      Ready & Heading to Pickup →
                    </Button>
                  </div>
                )}

                {/* Enhanced All Steps List */}
                <div className="space-y-3">
                  {[
                    { num: 1, title: "PREPARE & HEAD TO PICKUP", desc: "Get ready and navigate to location", completed: selectedOrder.status !== 'claimed' },
                    { num: 2, title: "LOCATE BAGS", desc: "Find customer's laundry bag", completed: false },
                    { num: 3, title: "TAKE A PHOTO", desc: "Document pickup condition (PHOTO REQUIRED)", completed: false },
                    { num: 4, title: "LABEL BAGS", desc: "Attach identification label", completed: false },
                    { num: 5, title: "COUNT BAGS", desc: "Verify bag count", completed: false },
                    { num: 6, title: "PICKUP", desc: "Collect items and confirm pickup", completed: false },
                    { num: 7, title: "GET TO WASHER", desc: "Transport to washing facility", completed: false },
                    { num: 8, title: "WASH FOLLOWING INSTRUCTIONS", desc: "Follow customer preferences", completed: false },
                    { num: 9, title: "FOLD/HANG", desc: "Properly prepare clean items", completed: false },
                    { num: 10, title: "BAG PROPERLY", desc: "Package items professionally", completed: false },
                    { num: 11, title: "RE-LABEL", desc: "Attach delivery label", completed: false },
                    { num: 12, title: "RETURN & TAKE PHOTO", desc: "Deliver on time and document (PHOTO REQUIRED)", completed: false }
                  ].map((step) => {
                    const currentStep = selectedOrder ? (orderSteps[selectedOrder.id] || 1) : 1;
                    const isActive = step.num === currentStep;
                    const isCompleted = step.completed || step.num < currentStep;
                    const stepCanComplete = canCompleteStep(step.num, selectedOrder.id);
                    const hasPhoto = photoUploaded[`${selectedOrder.id}-${step.num}`];
                    
                    return (
                      <div key={step.num} className={`flex items-start gap-3 p-4 rounded-lg border transition-all ${
                        isActive ? 'bg-primary/5 border-primary/20 shadow-sm' : 
                        isCompleted ? 'bg-green-50 border-green-200' : 
                        'bg-muted/30 border-border'
                      }`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                          isActive ? 'bg-primary text-primary-foreground' :
                          isCompleted ? 'bg-green-500 text-white' :
                          'bg-muted-foreground text-background'
                        }`}>
                          {isCompleted ? '✓' : step.num}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm">{step.title}</h4>
                          <p className="text-xs text-muted-foreground mb-2">{step.desc}</p>
                          
                          {/* Step-specific content */}
                          {isActive && (
                            <div className="bg-background rounded-md p-3 mb-3 text-xs space-y-2">
                              {step.num === 4 && (
                                <div className="space-y-2">
                                  <p className="font-medium">🏷️ Label the bag with:</p>
                                  <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
                                    <p className="font-mono text-xs font-medium text-yellow-800">
                                      {getLabelText(selectedOrder)}
                                    </p>
                                  </div>
                                </div>
                              )}
                              
                              {step.num === 5 && (
                                <div className="space-y-2">
                                  <p className="font-medium">📝 Verify bag count:</p>
                                  <div className="flex items-center gap-2">
                                    <Label htmlFor="bagCount" className="text-xs">Expected: {selectedOrder.bag_count}</Label>
                                    <Input 
                                      id="bagCount"
                                      type="number" 
                                      placeholder="Actual count"
                                      value={bagCountInput}
                                      onChange={(e) => {
                                        setBagCountInput(e.target.value);
                                        updateStepData(selectedOrder.id, 5, { bagCount: parseInt(e.target.value) });
                                      }}
                                      className="h-7 text-xs w-20"
                                    />
                                  </div>
                                </div>
                              )}
                              
                              {step.num === 8 && (
                                <div className="space-y-2">
                                  <p className="font-medium">🧺 Customer Preferences:</p>
                                  <ul className="text-xs space-y-1">
                                    {getCustomerPreferences(selectedOrder).map((pref, idx) => (
                                      <li key={idx} className="flex items-center gap-1">
                                        <Check className="h-3 w-3 text-green-500" />
                                        {pref}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              
                              {step.num === 11 && (
                                <div className="space-y-2">
                                  <p className="font-medium">🏷️ Delivery label format:</p>
                                  <div className="bg-blue-50 border border-blue-200 rounded p-2">
                                    <p className="font-mono text-xs font-medium text-blue-800">
                                      {getLabelText(selectedOrder, true)}
                                    </p>
                                  </div>
                                </div>
                              )}
                              
                              {step.num === 12 && (
                                <div className="space-y-2">
                                  <p className="font-medium">⏰ Delivery Window:</p>
                                  <div className="bg-orange-50 border border-orange-200 rounded p-2">
                                    <p className="text-xs font-medium text-orange-800">
                                      {getDeliveryTimeInfo(selectedOrder)}
                                    </p>
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    📍 Delivery to: {selectedOrder.delivery_address}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                          
                          {/* Action buttons */}
                          <div className="flex gap-2 flex-wrap">
                            {isActive && (
                              <Button 
                                size="sm" 
                                onClick={() => selectedOrder && completeStep(selectedOrder.id, step.num)}
                                disabled={!stepCanComplete}
                                className="text-xs h-7"
                              >
                                {stepCanComplete ? 'Complete Step' : 'Requirements not met'}
                              </Button>
                            )}
                            
                            {(step.num === 3 || step.num === 12) && (
                              <Button 
                                size="sm" 
                                variant={hasPhoto ? "default" : "outline"}
                                onClick={() => triggerPhotoUpload(step.num)}
                                disabled={uploading}
                                className="text-xs h-7"
                              >
                                <Camera className="h-3 w-3 mr-1" />
                                {uploading && photoStep === step.num 
                                  ? "Uploading..." 
                                  : hasPhoto 
                                  ? "Photo ✓" 
                                  : "Take Photo"
                                }
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Order Info */}
                <div className="border-t pt-4 space-y-2 text-sm">
                  <p><strong>Customer:</strong> {selectedOrder.profiles?.first_name} {selectedOrder.profiles?.last_name}</p>
                  <p><strong>Phone:</strong> {selectedOrder.profiles?.phone}</p>
                  <p><strong>Service:</strong> {selectedOrder.service_type.replace('_', ' ')}</p>
                  <p><strong>Bags:</strong> {selectedOrder.bag_count}</p>
                  {selectedOrder.special_instructions && (
                    <p><strong>Instructions:</strong> {selectedOrder.special_instructions}</p>
                  )}
                </div>
              </div>
            )}
            
            <DialogFooter className="flex gap-2">
              <Button variant="outline" onClick={() => setSelectedOrder(null)}>
                Close
              </Button>
              {selectedOrder?.status === 'claimed' && (
                <Button onClick={() => selectedOrder && updateOrderStatus(selectedOrder.id, 'in_progress')}>
                  Mark Pickup Complete
                </Button>
              )}
              {selectedOrder?.status === 'in_progress' && (
                <Button onClick={() => selectedOrder && updateOrderStatus(selectedOrder.id, 'washed')}>
                  Mark Washing Complete
                </Button>
              )}
              {selectedOrder?.status === 'washed' && (
                <Button onClick={() => selectedOrder && updateOrderStatus(selectedOrder.id, 'completed')}>
                  Mark Delivered
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Hidden File Input for Photo Upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />
      </div>
    </div>
  );
}
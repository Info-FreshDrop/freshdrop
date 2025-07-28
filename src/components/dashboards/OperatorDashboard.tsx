import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  Truck
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
  const [activeTab, setActiveTab] = useState("live-orders");
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [operatorProfile, setOperatorProfile] = useState<OperatorProfile | null>(null);
  const [washerData, setWasherData] = useState<WasherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmOrder, setConfirmOrder] = useState<Order | null>(null);

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
          .in('status', ['claimed', 'in_progress'])
          .order('claimed_at', { ascending: true });

        if (claimedError) {
          console.error('Error loading claimed orders:', claimedError);
        }
        setMyOrders((claimed as any) || []);
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

      toast({
        title: "Status Updated",
        description: `Order marked as ${newStatus.replace('_', ' ')}`,
      });

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
                {myOrders.map((order) => (
                  <Card key={order.id} className="p-4">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-semibold">
                          {order.profiles?.first_name} {order.profiles?.last_name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Claimed {new Date(order.claimed_at!).toLocaleString()}
                        </p>
                      </div>
                      <Badge variant={order.is_express ? "destructive" : "secondary"}>
                        {order.is_express ? "Express" : "Standard"}
                      </Badge>
                    </div>

                    {/* Detailed Workflow Steps */}
                    <div className="mb-4">
                      <h4 className="font-medium mb-3">Order Workflow</h4>
                      <div className="space-y-2 text-sm">
                        <div className={`flex items-start gap-2 p-2 rounded ${order.status === 'claimed' ? 'bg-blue-50 border border-blue-200' : 'bg-muted'}`}>
                          <CheckCircle className={`h-4 w-4 mt-0.5 ${order.status === 'claimed' ? 'text-blue-600' : 'text-green-600'}`} />
                          <div>
                            <p className="font-medium">Step 1: Prepare for Pickup</p>
                            <p className="text-muted-foreground">Get clear bags, labels, pen</p>
                          </div>
                        </div>
                        
                        <div className={`flex items-start gap-2 p-2 rounded ${order.status === 'claimed' ? 'bg-muted border' : 'bg-muted'}`}>
                          <Circle className="h-4 w-4 mt-0.5 text-gray-400" />
                          <div>
                            <p className="font-medium">Step 2: Go to Address</p>
                            <p className="text-muted-foreground">Navigate to pickup location</p>
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-2 p-2 rounded bg-muted">
                          <Circle className="h-4 w-4 mt-0.5 text-gray-400" />
                          <div>
                            <p className="font-medium">Step 3: Locate Bag</p>
                            <p className="text-muted-foreground">Find customer's laundry bag</p>
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-2 p-2 rounded bg-muted">
                          <Circle className="h-4 w-4 mt-0.5 text-gray-400" />
                          <div>
                            <p className="font-medium">Step 4: Label Bag</p>
                            <p className="text-muted-foreground">Attach identification label</p>
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-2 p-2 rounded bg-muted">
                          <Circle className="h-4 w-4 mt-0.5 text-gray-400" />
                          <div>
                            <p className="font-medium">Step 5: Take Photo</p>
                            <p className="text-muted-foreground">Document pickup condition</p>
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-2 p-2 rounded bg-muted">
                          <Circle className="h-4 w-4 mt-0.5 text-gray-400" />
                          <div>
                            <p className="font-medium">Step 6: Pickup/Confirm</p>
                            <p className="text-muted-foreground">Collect items and confirm pickup</p>
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-2 p-2 rounded bg-muted">
                          <Circle className="h-4 w-4 mt-0.5 text-gray-400" />
                          <div>
                            <p className="font-medium">Step 7: Get to Washer</p>
                            <p className="text-muted-foreground">Transport to washing facility</p>
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-2 p-2 rounded bg-muted">
                          <Circle className="h-4 w-4 mt-0.5 text-gray-400" />
                          <div>
                            <p className="font-medium">Step 8: Wash Following Instructions</p>
                            <p className="text-muted-foreground">Wash & dry according to customer needs</p>
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-2 p-2 rounded bg-muted">
                          <Circle className="h-4 w-4 mt-0.5 text-gray-400" />
                          <div>
                            <p className="font-medium">Step 9: Fold/Hang</p>
                            <p className="text-muted-foreground">Properly prepare clean items</p>
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-2 p-2 rounded bg-muted">
                          <Circle className="h-4 w-4 mt-0.5 text-gray-400" />
                          <div>
                            <p className="font-medium">Step 10: Bag Properly</p>
                            <p className="text-muted-foreground">Package items professionally</p>
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-2 p-2 rounded bg-muted">
                          <Circle className="h-4 w-4 mt-0.5 text-gray-400" />
                          <div>
                            <p className="font-medium">Step 11: Re-label</p>
                            <p className="text-muted-foreground">Attach delivery label</p>
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-2 p-2 rounded bg-muted">
                          <Circle className="h-4 w-4 mt-0.5 text-gray-400" />
                          <div>
                            <p className="font-medium">Step 12: Return & Take Photo</p>
                            <p className="text-muted-foreground">Deliver within pickup window time, document delivery</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Order Details */}
                    <div className="mb-4 text-sm space-y-1">
                      <p><strong>Bags:</strong> {order.bag_count}</p>
                      <p><strong>Total:</strong> ${(order.total_amount_cents / 100).toFixed(2)}</p>
                      {order.pickup_address && (
                        <p><strong>Pickup:</strong> {order.pickup_address}</p>
                      )}
                      {order.delivery_address && (
                        <p><strong>Delivery:</strong> {order.delivery_address}</p>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 flex-wrap">
                      {order.status === 'claimed' && (
                        <Button 
                          size="sm" 
                          onClick={() => updateOrderStatus(order.id, 'in_progress')}
                        >
                          ✅ Mark Pickup Done
                        </Button>
                      )}
                      {order.status === 'in_progress' && (
                        <Button 
                          size="sm" 
                          onClick={() => updateOrderStatus(order.id, 'washed')}
                        >
                          🧼 Washing Complete
                        </Button>
                      )}
                      {order.status === 'washed' && (
                        <Button 
                          size="sm" 
                          onClick={() => updateOrderStatus(order.id, 'completed')}
                        >
                          📦 Mark Delivered
                        </Button>
                      )}
                      <Button variant="outline" size="sm">
                        <Camera className="h-3 w-3 mr-1" />
                        Photo
                      </Button>
                      <Button variant="outline" size="sm">
                        <MessageSquare className="h-3 w-3 mr-1" />
                        Support
                      </Button>
                    </div>
                  </Card>
                ))}
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
      </div>
    </div>
  );
}
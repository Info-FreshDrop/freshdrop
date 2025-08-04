import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { 
  Package, 
  Clock, 
  MapPin, 
  Truck,
  Camera,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Play,
  User
} from "lucide-react";

interface WasherDashboardProps {
  onBack: () => void;
}

interface Order {
  id: string;
  pickup_type: 'locker' | 'pickup_delivery';
  service_type: 'wash_fold' | 'wash_hang_dry' | 'express';
  status: 'placed' | 'unclaimed' | 'claimed' | 'in_progress' | 'washing' | 'drying' | 'folding' | 'delivering' | 'washed' | 'returned' | 'completed' | 'cancelled';
  is_express: boolean;
  pickup_address?: string;
  delivery_address?: string;
  locker_id?: string;
  bag_count: number;
  total_amount_cents: number;
  special_instructions?: string;
  created_at: string;
  pickup_window_start?: string;
  pickup_window_end?: string;
  delivery_window_start?: string;
  delivery_window_end?: string;
  customer_id: string;
  lockers?: {
    name: string;
    address: string;
  };
  profiles?: {
    first_name: string;
    last_name: string;
    phone: string;
  } | null;
}

export function WasherDashboard({ onBack }: WasherDashboardProps) {
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [isOnline, setIsOnline] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [taskStep, setTaskStep] = useState(0);
  const [taskData, setTaskData] = useState({
    pickupPhoto: null as File | null,
    deliveryPhoto: null as File | null,
    notes: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      loadOrders();
      loadWasherStatus();
    }
  }, [user]);

  const loadOrders = async () => {
    if (!user) return;

    try {
      // Load available orders in washer's area
      const { data: availableData } = await supabase
        .from('orders')
        .select(`
          *,
          lockers:locker_id (name, address),
          profiles:customer_id (first_name, last_name, phone)
        `)
        .eq('status', 'unclaimed')
        .order('created_at', { ascending: true });

      // Load washer's claimed orders
      const { data: myData } = await supabase
        .from('orders')
        .select(`
          *,
          lockers:locker_id (name, address),
          profiles:customer_id (first_name, last_name, phone)
        `)
        .eq('washer_id', user.id)
        .not('status', 'eq', 'completed')
        .order('created_at', { ascending: true });

      setAvailableOrders((availableData as any) || []);
      setMyOrders((myData as any) || []);
    } catch (error) {
      console.error('Error loading orders:', error);
    }
  };

  const loadWasherStatus = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('washers')
        .select('is_online')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setIsOnline(data.is_online);
      }
    } catch (error) {
      console.error('Error loading washer status:', error);
    }
  };

  const toggleOnlineStatus = async () => {
    if (!user) return;

    try {
      const newStatus = !isOnline;
      
      const { error } = await supabase
        .from('washers')
        .update({ is_online: newStatus })
        .eq('user_id', user.id);

      if (error) throw error;

      setIsOnline(newStatus);
      toast({
        title: newStatus ? "You're Online" : "You're Offline",
        description: newStatus 
          ? "You'll receive notifications for new orders in your area." 
          : "You won't receive new order notifications.",
      });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Status Update Failed",
        description: "Could not update your online status.",
        variant: "destructive",
      });
    }
  };

  const claimOrder = async (orderId: string) => {
    if (!user) return;
    
    setIsLoading(true);
    
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          washer_id: user.id, 
          status: 'claimed',
          claimed_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .eq('status', 'unclaimed'); // Ensure it's still unclaimed

      if (error) throw error;

      // Send notification about order claim
      const order = availableOrders.find(o => o.id === orderId);
      console.log('=== SENDING CLAIM NOTIFICATION ===');
      console.log('Order found:', order);
      if (order) {
        try {
          console.log('Calling notification function with:', {
            orderId: order.id,
            customerId: order.customer_id,
            status: 'claimed',
            orderNumber: order.id.substring(0, 8).toUpperCase()
          });
          
          const result = await supabase.functions.invoke('send-order-notifications', {
            body: {
              orderId: order.id,
              customerId: order.customer_id,
              status: 'claimed',
              orderNumber: order.id.substring(0, 8).toUpperCase()
            }
          });
          
          console.log('Notification function result:', result);
        } catch (notificationError) {
          console.error('Failed to send notification:', notificationError);
        }
      } else {
        console.error('Order not found for notification');
      }

      toast({
        title: "Order Claimed",
        description: "You have successfully claimed this order.",
      });

      loadOrders();
    } catch (error) {
      console.error('Error claiming order:', error);
      toast({
        title: "Claim Failed",
        description: "Failed to claim order. It may have been claimed by another washer.",
        variant: "destructive",
      });
    }
    
    setIsLoading(false);
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const updateData: any = { status: newStatus };
      
      if (newStatus === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId);

      if (error) throw error;

      // Send notification about status change
      const order = myOrders.find(o => o.id === orderId);
      console.log('=== SENDING STATUS CHANGE NOTIFICATION ===');
      console.log('Order found:', order);
      console.log('New status:', newStatus);
      if (order) {
        try {
          console.log('Calling notification function with:', {
            orderId: order.id,
            customerId: order.customer_id,
            status: newStatus,
            orderNumber: order.id.substring(0, 8).toUpperCase()
          });
          
          const result = await supabase.functions.invoke('send-order-notifications', {
            body: {
              orderId: order.id,
              customerId: order.customer_id,
              status: newStatus,
              orderNumber: order.id.substring(0, 8).toUpperCase()
            }
          });
          
          console.log('Notification function result:', result);
        } catch (notificationError) {
          console.error('Failed to send notification:', notificationError);
        }
      } else {
        console.error('Order not found for notification');
      }

      toast({
        title: "Status Updated",
        description: `Order status updated to ${newStatus.replace('_', ' ')}.`,
      });

      loadOrders();
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(null);
        setTaskStep(0);
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update order status.",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'unclaimed':
        return 'bg-yellow-100 text-yellow-800';
      case 'claimed':
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'washing':
        return 'bg-orange-100 text-orange-800';
      case 'drying':
        return 'bg-purple-100 text-purple-800';
      case 'folding':
        return 'bg-indigo-100 text-indigo-800';
      case 'delivering':
        return 'bg-teal-100 text-teal-800';
      case 'washed':
        return 'bg-purple-100 text-purple-800';
      case 'returned':
      case 'completed':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const taskSteps = [
    "Drive to pickup location",
    "Locate and collect laundry bags", 
    "Take pickup photo and verify bag count",
    "Transport laundry to washing location",
    "Sort clothes by fabric type and color",
    "Load first batch into washing machine",
    "Start washing cycle (30-45 min)",
    "Transfer clothes from washer to dryer",
    "Start drying cycle (45-60 min)",
    "Remove clothes and begin folding/hanging",
    "Complete folding and organize by customer",
    "Transport to delivery location",
    "Take delivery photo and complete handoff"
  ];

  const stepStatuses = [
    'in_progress', // Step 1: Drive to pickup
    'in_progress', // Step 2: Locate bags
    'in_progress', // Step 3: Take pickup photo
    'in_progress', // Step 4: Transport to washing
    'washing',     // Step 5: Sort clothes
    'washing',     // Step 6: Load washer
    'washing',     // Step 7: Start wash cycle
    'drying',      // Step 8: Transfer to dryer
    'drying',      // Step 9: Start drying
    'folding',     // Step 10: Remove and fold
    'folding',     // Step 11: Complete folding
    'delivering',  // Step 12: Transport to delivery
    'completed'    // Step 13: Complete handoff
  ];

  if (selectedOrder) {
    return (
      <div className="min-h-screen bg-gradient-wave">
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={() => setSelectedOrder(null)}
              className="mb-4"
            >
              ← Back to Orders
            </Button>
            
            <h1 className="text-2xl font-bold">Order #{selectedOrder.id.slice(-8)}</h1>
            <p className="text-muted-foreground">
              Task checklist - Complete each step
            </p>
          </div>

          <Card className="border-0 shadow-soft mb-6">
            <CardHeader>
              <CardTitle>Order Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p><strong>Customer:</strong> {selectedOrder.profiles?.first_name} {selectedOrder.profiles?.last_name}</p>
                <p><strong>Phone:</strong> {selectedOrder.profiles?.phone}</p>
                <p><strong>Service:</strong> {selectedOrder.service_type.replace('_', ' ')}</p>
                <p><strong>Bags:</strong> {selectedOrder.bag_count}</p>
                {selectedOrder.pickup_type === 'locker' && selectedOrder.lockers ? (
                  <p><strong>Locker:</strong> {selectedOrder.lockers.name} - {selectedOrder.lockers.address}</p>
                ) : (
                  <p><strong>Pickup:</strong> {selectedOrder.pickup_address}</p>
                )}
                {selectedOrder.special_instructions && (
                  <p><strong>Instructions:</strong> {selectedOrder.special_instructions}</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-soft">
            <CardHeader>
              <CardTitle>Task Progress</CardTitle>
              <CardDescription>
                Step {taskStep + 1} of {taskSteps.length}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {taskSteps.map((step, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      index < taskStep ? 'bg-green-50 border border-green-200' :
                      index === taskStep ? 'bg-blue-50 border border-blue-200' :
                      'bg-gray-50 border border-gray-200'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      index < taskStep ? 'bg-green-500 text-white' :
                      index === taskStep ? 'bg-blue-500 text-white' :
                      'bg-gray-300 text-gray-600'
                    }`}>
                      {index < taskStep ? '✓' : index + 1}
                    </div>
                    <div className="flex items-center justify-between w-full">
                      <span className={`${
                        index === taskStep ? 'font-semibold' : ''
                      }`}>
                        {step}
                      </span>
                      {index === 1 && taskStep === 1 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const address = selectedOrder?.pickup_type === 'locker' 
                              ? selectedOrder?.lockers?.address 
                              : selectedOrder?.pickup_address;
                            if (address) {
                              window.open(`https://maps.google.com/?q=${encodeURIComponent(address)}`, '_blank');
                            }
                          }}
                        >
                          Navigate
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {taskStep < taskSteps.length && (
                <div className="mt-6 space-y-4">
                  {(taskStep === 2 || taskStep === 12) && (
                    <div className="space-y-2">
                      <Label htmlFor="photo">
                        {taskStep === 2 ? 'Upload pickup photo' : 'Upload delivery photo'}
                      </Label>
                      <Input
                        id="photo"
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          setTaskData(prev => ({
                            ...prev,
                            [taskStep === 2 ? 'pickupPhoto' : 'deliveryPhoto']: file
                          }));
                        }}
                      />
                    </div>
                  )}

                  {taskStep === 12 && (
                    <div className="space-y-2">
                      <Label htmlFor="notes">Final Notes (Optional)</Label>
                      <Textarea
                        id="notes"
                        placeholder="Any final notes about the order..."
                        value={taskData.notes}
                        onChange={(e) => setTaskData(prev => ({ ...prev, notes: e.target.value }))}
                      />
                    </div>
                  )}

                  <Button
                    variant="hero"
                    className="w-full"
                    onClick={async () => {
                      if (taskStep === taskSteps.length - 1) {
                        // Final step - mark as completed
                        await updateOrderStatus(selectedOrder.id, 'completed');
                      } else {
                        // Progress to next step
                        const newStep = taskStep + 1;
                        setTaskStep(newStep);
                        
                        // Update order status based on current step
                        const newStatus = stepStatuses[newStep] || stepStatuses[taskStep];
                        if (newStatus !== stepStatuses[taskStep]) {
                          await updateOrderStatus(selectedOrder.id, newStatus);
                        }
                      }
                    }}
                  >
                    {taskStep === taskSteps.length - 1 ? 'Complete Order' : 'Next Step'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-wave">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Washer Dashboard
            </h1>
            <p className="text-muted-foreground">
              Manage your orders and availability
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="online-status">Online</Label>
              <Switch
                id="online-status"
                checked={isOnline}
                onCheckedChange={toggleOnlineStatus}
              />
            </div>
            <Badge variant={isOnline ? "default" : "secondary"}>
              {isOnline ? "Available" : "Offline"}
            </Badge>
          </div>
        </div>

        {/* Available Orders */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Available Orders</h2>
          {availableOrders.length === 0 ? (
            <Card className="border-0 shadow-soft">
              <CardContent className="p-8 text-center">
                <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No orders available in your area</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {availableOrders.map((order) => (
                <Card key={order.id} className="border-0 shadow-soft">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-semibold">Order #{order.id.slice(-8)}</h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{order.pickup_type === 'locker' ? 'Locker' : 'Pickup/Delivery'}</span>
                          {order.is_express && <Badge variant="secondary">Express</Badge>}
                        </div>
                      </div>
                      <Badge className="bg-yellow-100 text-yellow-800">
                        ${(order.total_amount_cents / 100).toFixed(2)}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="text-sm">
                        <p><strong>Service:</strong> {order.service_type.replace('_', ' ')}</p>
                        <p><strong>Bags:</strong> {order.bag_count}</p>
                        <p><strong>Customer:</strong> {order.profiles?.first_name} {order.profiles?.last_name}</p>
                      </div>
                      <div className="text-sm">
                        {order.pickup_type === 'locker' && order.lockers ? (
                          <p><strong>Location:</strong> {order.lockers.name}</p>
                        ) : (
                          <p><strong>Pickup:</strong> {order.pickup_address}</p>
                        )}
                        {order.pickup_window_start && (
                          <p><strong>Window:</strong> {formatDate(order.pickup_window_start)}</p>
                        )}
                      </div>
                    </div>

                    <Button
                      variant="hero"
                      className="w-full"
                      onClick={() => claimOrder(order.id)}
                      disabled={isLoading || !isOnline}
                    >
                      {isLoading ? "Claiming..." : "Claim Order"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* My Orders */}
        <div>
          <h2 className="text-xl font-semibold mb-4">My Orders</h2>
          {myOrders.length === 0 ? (
            <Card className="border-0 shadow-soft">
              <CardContent className="p-8 text-center">
                <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No active orders</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {myOrders.map((order) => (
                <Card key={order.id} className="border-0 shadow-soft">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-semibold">Order #{order.id.slice(-8)}</h3>
                        <p className="text-sm text-muted-foreground">
                          Customer: {order.profiles?.first_name} {order.profiles?.last_name}
                        </p>
                      </div>
                      <Badge className={getStatusColor(order.status)}>
                        {order.status.replace('_', ' ')}
                      </Badge>
                    </div>

                    <div className="text-sm text-muted-foreground mb-4">
                      <p><strong>Service:</strong> {order.service_type.replace('_', ' ')}</p>
                      <p><strong>Bags:</strong> {order.bag_count}</p>
                      {order.pickup_type === 'locker' && order.lockers ? (
                        <p><strong>Location:</strong> {order.lockers.name}</p>
                      ) : (
                        <p><strong>Pickup:</strong> {order.pickup_address}</p>
                      )}
                    </div>

                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setSelectedOrder(order)}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Continue Task
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
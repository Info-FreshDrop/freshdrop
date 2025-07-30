import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { OrderHistory } from "@/components/orders/OrderHistory";
import { OrderStatusProgress } from "@/components/customer/OrderStatusProgress";
import { OrderCancellation } from "@/components/customer/OrderCancellation";
import { OrderMessaging } from "@/components/customer/OrderMessaging";
import { LiveOrderMap } from "@/components/orders/LiveOrderMap";
import { 
  Package, 
  Clock, 
  MapPin, 
  Truck,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Camera,
  History,
  Image as ImageIcon,
  MessageCircle
} from "lucide-react";

interface Order {
  id: string;
  pickup_type: 'locker' | 'pickup_delivery';
  service_type: 'wash_fold' | 'wash_hang_dry' | 'express';
  status: 'placed' | 'unclaimed' | 'claimed' | 'in_progress' | 'washed' | 'returned' | 'completed' | 'cancelled' | 'picked_up' | 'folded';
  is_express: boolean;
  pickup_address?: string;
  delivery_address?: string;
  locker_id?: string;
  washer_id?: string;
  bag_count: number;
  total_amount_cents: number;
  special_instructions?: string;
  created_at: string;
  pickup_window_start?: string;
  pickup_window_end?: string;
  delivery_window_start?: string;
  delivery_window_end?: string;
  pickup_photo_url?: string;
  delivery_photo_url?: string;
  step_photos?: any;
  current_step?: number;
  lockers?: {
    name: string;
    address: string;
  };
  washers?: {
    user_id?: string;
    profiles?: {
      first_name?: string;
      last_name?: string;
    };
  };
}

interface OrderTrackingProps {
  onBack: () => void;
  onOrderUpdate?: () => void;
  selectedOrderId?: string;
}

export function OrderTracking({ onBack, onOrderUpdate, selectedOrderId }: OrderTrackingProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [selectedOrderForMessaging, setSelectedOrderForMessaging] = useState<Order | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showLiveMap, setShowLiveMap] = useState(false);
  const { user } = useAuth();

  console.log('OrderTracking component mounted, user:', user?.id, 'selectedOrderId:', selectedOrderId);
  console.log('selectedOrder state:', selectedOrder);
  
  
  if (showHistory) {
    return <OrderHistory onBack={() => setShowHistory(false)} />;
  }

  useEffect(() => {
    loadOrders();
    
    // Set up real-time subscription for order updates
    if (!user) return;
    
    console.log('Setting up real-time subscription for user:', user.id);
    
    const channel = supabase
      .channel('customer-order-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `customer_id=eq.${user.id}`
        },
        (payload) => {
          console.log('🔄 Real-time order update received:', {
            orderId: payload.new.id,
            status: payload.new.status,
            currentStep: payload.new.current_step,
            fullPayload: payload.new
          });
          
          // Update the specific order in state
          setOrders(prev => {
            const updated = prev.map(order => 
              order.id === payload.new.id 
                ? { ...order, ...payload.new }
                : order
            );
            console.log('📊 Updated orders state after real-time update');
            return updated;
          });
        }
      )
      .subscribe((status) => {
        console.log('📡 Subscription status:', status);
      });
      
    console.log('✅ Real-time subscription setup complete for user:', user.id);

    return () => {
      console.log('🔌 Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [user]);

  const loadOrders = async () => {
    console.log('Loading orders, user:', user?.id, 'selectedOrderId:', selectedOrderId);
    console.log('User auth state:', user);
    if (!user) {
      console.log('No user found, cannot load orders');
      return;
    }
    
    setLoading(true);
    try {
      let query = supabase
        .from('orders')
        .select(`
          *,
          lockers:locker_id (
            name,
            address
          )
        `)
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false });

      // If we have a selectedOrderId, only fetch that order
      if (selectedOrderId) {
        console.log('Adding filter for selectedOrderId:', selectedOrderId);
        query = query.eq('id', selectedOrderId);
      }

      console.log('About to execute query with user.id:', user.id);
      const { data, error } = await query;

      if (error) {
        console.error('Supabase query error:', error);
        throw error;
      }
      console.log('Loaded orders for customer:', data?.length || 0, 'orders');
      console.log('Order statuses:', data?.map(o => ({ id: o.id.slice(-8), status: o.status, step: o.current_step })) || []);
      console.log('selectedOrderId being searched for:', selectedOrderId);
      console.log('Raw data returned:', data);
      
      
      const ordersData = data as Order[] || [];
      setOrders(ordersData);
      
      // If we're showing a specific order, set it as selected
      if (selectedOrderId && ordersData.length > 0) {
        console.log('Setting selectedOrder to:', ordersData[0]);
        setSelectedOrder(ordersData[0]);
      } else {
        console.log('Not setting selectedOrder. selectedOrderId:', selectedOrderId, 'ordersData.length:', ordersData.length);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'placed':
      case 'unclaimed':
        return 'bg-yellow-100 text-yellow-800';
      case 'claimed':
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'washed':
        return 'bg-purple-100 text-purple-800';
      case 'returned':
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'cancelled':
        return <AlertCircle className="h-4 w-4" />;
      case 'in_progress':
      case 'washed':
        return <RefreshCw className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
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

  const getDeliveryEstimate = (order: Order) => {
    if (order.delivery_window_start) {
      const deliveryTime = new Date(order.delivery_window_start);
      const now = new Date();
      
      if (deliveryTime > now) {
        const hoursLeft = Math.ceil((deliveryTime.getTime() - now.getTime()) / (1000 * 60 * 60));
        return `Estimated in ${hoursLeft} hours`;
      } else if (order.status === 'completed') {
        return 'Delivered';
      } else {
        return 'Delivery window active';
      }
    }
    return null;
  };

  // Check if we should show live map for pickup/delivery phases
  const shouldShowMap = (order: Order) => {
    if (!order.current_step) return false;
    
    // Show map during pickup (steps 1-6) or delivery (steps 10-12)
    return (order.current_step >= 1 && order.current_step <= 6) || 
           (order.current_step >= 10 && order.current_step <= 12) ||
           ['claimed', 'out_for_delivery'].includes(order.status);
  };

  const getMapTitle = (order: Order) => {
    if (!order.current_step) return "Live Tracking";
    
    if (order.current_step >= 1 && order.current_step <= 6) {
      return "Pickup in Progress";
    } else if (order.current_step >= 10 && order.current_step <= 12) {
      return "Out for Delivery";
    }
    return "Live Tracking";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-wave flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading your orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-wave">
      <div className="container mx-auto px-4 py-4 sm:py-8 max-w-4xl">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              {selectedOrderId ? `Order #${selectedOrder?.id.slice(-8) || ''}` : 'Active Orders'}
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              {selectedOrderId ? 'Track your order progress and communicate with your operator' : 'Track your current orders'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={loadOrders}>
              <RefreshCw className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            {!selectedOrderId && (
              <Button variant="outline" size="sm" onClick={() => setShowHistory(true)}>
                <History className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">View All History</span>
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={onBack}>
              <span className="sm:hidden">Back</span>
              <span className="hidden sm:inline">Back to Dashboard</span>
            </Button>
          </div>
        </div>

        {orders.length === 0 ? (
          <Card className="border-0 shadow-soft">
            <CardContent className="p-12 text-center">
              <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-xl font-semibold mb-2">
                {selectedOrderId ? "Order Not Found" : "No Orders Yet"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {selectedOrderId 
                  ? "This order could not be found or may have been removed." 
                  : "You haven't placed any orders yet. Start your first order!"
                }
              </p>
              <Button variant="hero" onClick={onBack}>
                {selectedOrderId ? "Back to Dashboard" : "Place Your First Order"}
              </Button>
            </CardContent>
          </Card>
        ) : selectedOrderId && selectedOrder ? (
          // DoorDash-style full-screen tracking view for selected order
          <div className="space-y-6">
            {/* Live Map Section - Show only during pickup/delivery */}
            {shouldShowMap(selectedOrder) && selectedOrder.pickup_type === 'pickup_delivery' && (
              <Card className="border-0 shadow-soft overflow-hidden">
                <div className="aspect-video bg-gradient-to-br from-primary/5 to-secondary/5 relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Button
                      onClick={() => setShowLiveMap(true)}
                      className="bg-primary/90 backdrop-blur-sm hover:bg-primary text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2"
                    >
                      <MapPin className="h-5 w-5" />
                      View Live Map - {getMapTitle(selectedOrder)}
                    </Button>
                  </div>
                  <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      Live Tracking Active
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Enhanced Status Card */}
            <Card className="border-0 shadow-soft">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-2xl">
                      {selectedOrder.pickup_type === 'locker' ? (
                        <MapPin className="h-6 w-6 text-primary" />
                      ) : (
                        <Truck className="h-6 w-6 text-primary" />
                      )}
                      Order #{selectedOrder.id.slice(-8)}
                      {selectedOrder.is_express && (
                        <Badge variant="secondary" className="text-sm">Express</Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="text-base mt-1">
                      Placed on {formatDate(selectedOrder.created_at)}
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <Badge className={`${getStatusColor(selectedOrder.status)} text-sm px-3 py-1`}>
                      {getStatusIcon(selectedOrder.status)}
                      <span className="ml-2 capitalize">
                        {selectedOrder.status.replace('_', ' ')}
                      </span>
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Enhanced Progress Section */}
                <div className="bg-gradient-to-r from-primary/5 to-secondary/5 rounded-xl p-6">
                  <OrderStatusProgress 
                    status={selectedOrder.status} 
                    currentStep={selectedOrder.current_step}
                    stepPhotos={selectedOrder.step_photos}
                    showDetailedTimeline={true}
                    operatorName={selectedOrder.washers?.profiles ? 
                      `${selectedOrder.washers.profiles.first_name || ''} ${selectedOrder.washers.profiles.last_name || ''}`.trim() :
                      undefined
                    }
                  />
                </div>

                {/* Service & Location Info */}
                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-3">
                    <h4 className="font-semibold text-lg">Service Details</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="space-y-2">
                        <div>
                          <span className="text-muted-foreground block">Type:</span>
                          <span className="font-medium">
                            {selectedOrder.pickup_type === 'locker' ? 'Locker Drop-off' : 'Pickup & Delivery'}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Service:</span>
                          <span className="font-medium">{selectedOrder.service_type.replace('_', ' ')}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <span className="text-muted-foreground block">Bags:</span>
                          <span className="font-medium">{selectedOrder.bag_count}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Total:</span>
                          <span className="font-semibold text-lg">
                            ${(selectedOrder.total_amount_cents / 100).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-semibold text-lg">Location & Timeline</h4>
                    <div className="space-y-3 text-sm">
                      {selectedOrder.pickup_type === 'locker' && selectedOrder.lockers ? (
                        <div>
                          <span className="text-muted-foreground block">Locker:</span>
                          <span className="font-medium">{selectedOrder.lockers.name}</span>
                        </div>
                      ) : (
                        <div>
                          <span className="text-muted-foreground block">Pickup:</span>
                          <p className="font-medium mt-1 break-words">{selectedOrder.pickup_address}</p>
                        </div>
                      )}
                      
                      {selectedOrder.pickup_window_start && (
                        <div>
                          <span className="text-muted-foreground block">Pickup Window:</span>
                          <p className="font-medium mt-1">
                            {formatDate(selectedOrder.pickup_window_start)}
                            {selectedOrder.pickup_window_end && ` - ${formatDate(selectedOrder.pickup_window_end)}`}
                          </p>
                        </div>
                      )}
                      
                      {getDeliveryEstimate(selectedOrder) && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Delivery:</span>
                          <span className="font-medium">{getDeliveryEstimate(selectedOrder)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {selectedOrder.special_instructions && (
                  <div className="bg-muted rounded-xl p-4">
                    <h5 className="font-medium mb-2">Special Instructions</h5>
                    <p className="text-muted-foreground">
                      {selectedOrder.special_instructions}
                    </p>
                  </div>
                )}

                {/* Enhanced Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                  {selectedOrder.washer_id && (
                    <Button
                      variant="default"
                      size="lg"
                      onClick={() => setSelectedOrderForMessaging(selectedOrder)}
                      className="w-full sm:flex-1"
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Message Operator
                    </Button>
                  )}
                  
                  {shouldShowMap(selectedOrder) && selectedOrder.pickup_type === 'pickup_delivery' && (
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => setShowLiveMap(true)}
                      className="w-full sm:flex-1"
                    >
                      <MapPin className="h-4 w-4 mr-2" />
                      Live Map
                    </Button>
                  )}
                  
                  {['placed', 'unclaimed', 'claimed'].includes(selectedOrder.status) && (
                    <div className="w-full sm:w-auto">
                      <OrderCancellation
                        orderId={selectedOrder.id}
                        orderStatus={selectedOrder.status}
                        totalAmount={selectedOrder.total_amount_cents || 0}
                        onCancelled={() => {
                          loadOrders();
                          onOrderUpdate?.();
                        }}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Card key={order.id} className="border-0 shadow-soft">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {order.pickup_type === 'locker' ? (
                          <MapPin className="h-5 w-5 text-primary" />
                        ) : (
                          <Truck className="h-5 w-5 text-primary" />
                        )}
                        Order #{order.id.slice(-8)}
                        {order.is_express && (
                          <Badge variant="secondary">Express</Badge>
                        )}
                      </CardTitle>
                      <CardDescription>
                        Placed on {formatDate(order.created_at)}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(order.status)}>
                        {getStatusIcon(order.status)}
                        <span className="ml-1 capitalize">
                          {order.status.replace('_', ' ')}
                        </span>
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-medium">Service Details</h4>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>
                          <strong>Type:</strong> {order.pickup_type === 'locker' ? 'Locker Drop-off' : 'Pickup & Delivery'}
                        </p>
                        <p>
                          <strong>Service:</strong> {order.service_type.replace('_', ' ')}
                        </p>
                        <p>
                          <strong>Bags:</strong> {order.bag_count}
                        </p>
                        <p>
                          <strong>Total:</strong> ${(order.total_amount_cents / 100).toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-medium">Location & Timeline</h4>
                      <div className="text-sm text-muted-foreground space-y-1">
                        {order.pickup_type === 'locker' && order.lockers ? (
                          <p>
                            <strong>Locker:</strong> {order.lockers.name}
                          </p>
                        ) : (
                          <p>
                            <strong>Pickup:</strong> {order.pickup_address}
                          </p>
                        )}
                        
                        {order.pickup_window_start && (
                          <p>
                            <strong>Pickup Window:</strong> {formatDate(order.pickup_window_start)}
                            {order.pickup_window_end && ` - ${formatDate(order.pickup_window_end)}`}
                          </p>
                        )}
                        
                        {getDeliveryEstimate(order) && (
                          <p>
                            <strong>Delivery:</strong> {getDeliveryEstimate(order)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {order.special_instructions && (
                    <div className="mt-4 p-3 bg-muted rounded-lg">
                      <h5 className="font-medium text-sm mb-1">Special Instructions</h5>
                      <p className="text-sm text-muted-foreground">
                        {order.special_instructions}
                      </p>
                    </div>
                  )}

                  {/* Order Progress */}
                  <div className="mt-4 pt-4 border-t">
                    <OrderStatusProgress 
                      status={order.status} 
                      currentStep={order.current_step}
                      operatorName={order.washers?.profiles ? 
                        `${order.washers.profiles.first_name || ''} ${order.washers.profiles.last_name || ''}`.trim() :
                        undefined
                      }
                    />
                  </div>

                  {/* Order Actions */}
                  <div className="mt-4 flex gap-2">
                    {/* Messaging */}
                    {order.washers && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedOrderForMessaging(order)}
                        className="flex items-center gap-2"
                      >
                        <MessageCircle className="h-4 w-4" />
                        Message Operator
                      </Button>
                    )}
                    
                    {/* Order Cancellation */}
                    {['placed', 'unclaimed', 'claimed'].includes(order.status) && (
                      <OrderCancellation
                        orderId={order.id}
                        orderStatus={order.status}
                        totalAmount={order.total_amount_cents || 0}
                        onCancelled={() => {
                          loadOrders();
                          onOrderUpdate?.();
                        }}
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Order Messaging Modal */}
        {selectedOrderForMessaging && (
          <OrderMessaging
            orderId={selectedOrderForMessaging.id}
            operatorId={selectedOrderForMessaging.washers?.user_id}
            operatorName={
              selectedOrderForMessaging.washers?.profiles
                ? `${selectedOrderForMessaging.washers.profiles.first_name || ''} ${selectedOrderForMessaging.washers.profiles.last_name || ''}`.trim()
                : 'Operator'
            }
            isOpen={!!selectedOrderForMessaging}
            onClose={() => setSelectedOrderForMessaging(null)}
          />
        )}

        {/* Live Order Map Modal */}
        {showLiveMap && selectedOrder && selectedOrder.pickup_type === 'pickup_delivery' && (
          <LiveOrderMap
            isOpen={showLiveMap}
            onClose={() => setShowLiveMap(false)}
            order={{
              id: selectedOrder.id,
              pickup_address: selectedOrder.pickup_address || '',
              delivery_address: selectedOrder.delivery_address || '',
              status: selectedOrder.status,
              pickup_window_end: selectedOrder.pickup_window_end || '',
              profiles: selectedOrder.washers?.profiles ? {
                first_name: selectedOrder.washers.profiles.first_name || '',
                last_name: selectedOrder.washers.profiles.last_name || '',
                phone: ''
              } : null
            }}
          />
        )}
      </div>
    </div>
  );
}
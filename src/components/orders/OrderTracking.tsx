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
  const { user } = useAuth();

  console.log('OrderTracking component mounted, user:', user?.id, 'selectedOrderId:', selectedOrderId);
  
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
    if (!user) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from('orders')
        .select(`
          *,
          lockers:locker_id (
            name,
            address
          ),
          washers:washer_id (
            user_id,
            profiles:user_id (
              first_name,
              last_name
            )
          )
        `)
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false });

      // If we have a selectedOrderId, only fetch that order
      if (selectedOrderId) {
        query = query.eq('id', selectedOrderId);
      }

      const { data, error } = await query;

      if (error) throw error;
      console.log('Loaded orders for customer:', data?.length || 0, 'orders');
      console.log('Order statuses:', data?.map(o => ({ id: o.id.slice(-8), status: o.status, step: o.current_step })) || []);
      
      const ordersData = data as Order[] || [];
      setOrders(ordersData);
      
      // If we're showing a specific order, set it as selected
      if (selectedOrderId && ordersData.length > 0) {
        setSelectedOrder(ordersData[0]);
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
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              {selectedOrderId ? `Order #${selectedOrder?.id.slice(-8) || ''}` : 'Active Orders'}
            </h1>
            <p className="text-muted-foreground">
              {selectedOrderId ? 'Track your order progress and communicate with your operator' : 'Track your current orders'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadOrders}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            {!selectedOrderId && (
              <Button variant="outline" onClick={() => setShowHistory(true)}>
                <History className="h-4 w-4 mr-2" />
                View All History
              </Button>
            )}
            <Button variant="outline" onClick={onBack}>
              Back to Dashboard
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
          // Show detailed view for selected order
          <Card className="border-0 shadow-soft">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {selectedOrder.pickup_type === 'locker' ? (
                      <MapPin className="h-5 w-5 text-primary" />
                    ) : (
                      <Truck className="h-5 w-5 text-primary" />
                    )}
                    Order #{selectedOrder.id.slice(-8)}
                    {selectedOrder.is_express && (
                      <Badge variant="secondary">Express</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Placed on {formatDate(selectedOrder.created_at)}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(selectedOrder.status)}>
                    {getStatusIcon(selectedOrder.status)}
                    <span className="ml-1 capitalize">
                      {selectedOrder.status.replace('_', ' ')}
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
                      <strong>Type:</strong> {selectedOrder.pickup_type === 'locker' ? 'Locker Drop-off' : 'Pickup & Delivery'}
                    </p>
                    <p>
                      <strong>Service:</strong> {selectedOrder.service_type.replace('_', ' ')}
                    </p>
                    <p>
                      <strong>Bags:</strong> {selectedOrder.bag_count}
                    </p>
                    <p>
                      <strong>Total:</strong> ${(selectedOrder.total_amount_cents / 100).toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Location & Timeline</h4>
                  <div className="text-sm text-muted-foreground space-y-1">
                    {selectedOrder.pickup_type === 'locker' && selectedOrder.lockers ? (
                      <p>
                        <strong>Locker:</strong> {selectedOrder.lockers.name}
                      </p>
                    ) : (
                      <p>
                        <strong>Pickup:</strong> {selectedOrder.pickup_address}
                      </p>
                    )}
                    
                    {selectedOrder.pickup_window_start && (
                      <p>
                        <strong>Pickup Window:</strong> {formatDate(selectedOrder.pickup_window_start)}
                        {selectedOrder.pickup_window_end && ` - ${formatDate(selectedOrder.pickup_window_end)}`}
                      </p>
                    )}
                    
                    {getDeliveryEstimate(selectedOrder) && (
                      <p>
                        <strong>Delivery:</strong> {getDeliveryEstimate(selectedOrder)}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {selectedOrder.special_instructions && (
                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <h5 className="font-medium text-sm mb-1">Special Instructions</h5>
                  <p className="text-sm text-muted-foreground">
                    {selectedOrder.special_instructions}
                  </p>
                </div>
              )}

              {/* Order Progress */}
              <div className="mt-4 pt-4 border-t">
                <OrderStatusProgress 
                  status={selectedOrder.status} 
                  currentStep={selectedOrder.current_step}
                  operatorName={selectedOrder.washers?.profiles ? 
                    `${selectedOrder.washers.profiles.first_name || ''} ${selectedOrder.washers.profiles.last_name || ''}`.trim() :
                    undefined
                  }
                />
              </div>

              {/* Order Actions */}
              <div className="mt-4 flex gap-2">
                {/* Messaging */}
                {selectedOrder.washers && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedOrderForMessaging(selectedOrder)}
                    className="flex items-center gap-2"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Message Operator
                  </Button>
                )}
                
                {/* Order Cancellation */}
                {['placed', 'unclaimed', 'claimed'].includes(selectedOrder.status) && (
                  <OrderCancellation
                    orderId={selectedOrder.id}
                    orderStatus={selectedOrder.status}
                    totalAmount={selectedOrder.total_amount_cents || 0}
                    onCancelled={() => {
                      loadOrders();
                      onOrderUpdate?.();
                    }}
                  />
                )}
              </div>
            </CardContent>
          </Card>
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
      </div>
    </div>
  );
}
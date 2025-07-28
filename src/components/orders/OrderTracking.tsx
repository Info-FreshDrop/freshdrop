import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { OrderHistory } from "@/components/orders/OrderHistory";
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
  Image as ImageIcon
} from "lucide-react";

interface Order {
  id: string;
  pickup_type: 'locker' | 'pickup_delivery';
  service_type: 'wash_fold' | 'wash_hang_dry' | 'express';
  status: 'placed' | 'unclaimed' | 'claimed' | 'in_progress' | 'washed' | 'returned' | 'completed' | 'cancelled';
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
  lockers?: {
    name: string;
    address: string;
  };
}

interface OrderTrackingProps {
  onBack: () => void;
}

export function OrderTracking({ onBack }: OrderTrackingProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const { user } = useAuth();

  if (showHistory) {
    return <OrderHistory onBack={() => setShowHistory(false)} />;
  }

  useEffect(() => {
    loadOrders();
    
    // Set up real-time subscription for order updates
    if (!user) return;
    
    const channel = supabase
      .channel('order-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `customer_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Order updated:', payload.new);
          // Update the specific order in state
          setOrders(prev => prev.map(order => 
            order.id === payload.new.id 
              ? { ...order, ...payload.new }
              : order
          ));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const loadOrders = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
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

      if (error) throw error;
      setOrders(data as Order[] || []);
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
              Active Orders
            </h1>
            <p className="text-muted-foreground">
              Track your current orders
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowHistory(true)}>
              <History className="h-4 w-4 mr-2" />
              View All History
            </Button>
            <Button variant="outline" onClick={onBack}>
              Back to Dashboard
            </Button>
          </div>
        </div>

        {orders.length === 0 ? (
          <Card className="border-0 shadow-soft">
            <CardContent className="p-12 text-center">
              <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-xl font-semibold mb-2">No Orders Yet</h3>
              <p className="text-muted-foreground mb-4">
                You haven't placed any orders yet. Start your first order!
              </p>
              <Button variant="hero" onClick={onBack}>
                Place Your First Order
              </Button>
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

                  {/* Order Status Timeline */}
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center justify-between text-xs">
                      <div className={`flex items-center gap-1 ${
                        ['placed', 'unclaimed', 'claimed', 'in_progress', 'washed', 'returned', 'completed'].includes(order.status) 
                          ? 'text-green-600' : 'text-gray-400'
                      }`}>
                        <div className="w-2 h-2 rounded-full bg-current"></div>
                        <span>Placed</span>
                      </div>
                      
                      <div className={`flex items-center gap-1 ${
                        ['claimed', 'in_progress', 'washed', 'returned', 'completed'].includes(order.status) 
                          ? 'text-green-600' : 'text-gray-400'
                      }`}>
                        <div className="w-2 h-2 rounded-full bg-current"></div>
                        <span>Claimed</span>
                      </div>
                      
                      <div className={`flex items-center gap-1 ${
                        ['in_progress', 'washed', 'returned', 'completed'].includes(order.status) 
                          ? 'text-green-600' : 'text-gray-400'
                      }`}>
                        <div className="w-2 h-2 rounded-full bg-current"></div>
                        <span>Washing</span>
                      </div>
                      
                      <div className={`flex items-center gap-1 ${
                        ['returned', 'completed'].includes(order.status) 
                          ? 'text-green-600' : 'text-gray-400'
                      }`}>
                        <div className="w-2 h-2 rounded-full bg-current"></div>
                        <span>Delivered</span>
                      </div>
                    </div>
                    
                    <div className="w-full bg-gray-200 rounded-full h-1 mt-2">
                      <div 
                        className="bg-green-600 h-1 rounded-full transition-all duration-300"
                        style={{
                          width: order.status === 'placed' || order.status === 'unclaimed' ? '25%' :
                                 order.status === 'claimed' ? '50%' :
                                 order.status === 'in_progress' || order.status === 'washed' ? '75%' :
                                 order.status === 'returned' || order.status === 'completed' ? '100%' : '0%'
                        }}
                      ></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
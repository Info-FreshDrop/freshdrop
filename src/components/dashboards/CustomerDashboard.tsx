import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, MapPin, Clock, Star, Plus } from "lucide-react";
import { OrderPlacement } from "@/components/orders/OrderPlacement";
import { OrderTracking } from "@/components/orders/OrderTracking";
import { supabase } from "@/integrations/supabase/client";

export function CustomerDashboard() {
  const { user, signOut } = useAuth();
  const [currentView, setCurrentView] = useState<'dashboard' | 'order' | 'tracking'>('dashboard');
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [orderCount, setOrderCount] = useState(0);

  useEffect(() => {
    if (user) {
      loadActiveOrders();
    }
  }, [user]);

  const loadActiveOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          lockers:locker_id (name, address)
        `)
        .eq('customer_id', user?.id)
        .not('status', 'in', '(completed,cancelled)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setActiveOrders(data || []);
      setOrderCount(data?.length || 0);
    } catch (error) {
      console.error('Error loading orders:', error);
    }
  };

  if (currentView === 'order') {
    return <OrderPlacement onBack={() => setCurrentView('dashboard')} />;
  }

  if (currentView === 'tracking') {
    return <OrderTracking onBack={() => setCurrentView('dashboard')} />;
  }

  return (
    <div className="min-h-screen bg-gradient-wave">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Welcome back!
            </h1>
            <p className="text-muted-foreground">
              Ready to get your laundry done?
            </p>
          </div>
          <Button variant="outline" onClick={signOut}>
            Sign Out
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="border-0 shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                New Order
              </CardTitle>
              <CardDescription>
                Start a new laundry order
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="hero" 
                className="w-full"
                onClick={() => setCurrentView('order')}
              >
                <Plus className="h-4 w-4 mr-2" />
                Place Order
              </Button>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-accent" />
                Find Lockers
              </CardTitle>
              <CardDescription>
                Locate nearby FreshDrop lockers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                View Map
              </Button>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-secondary" />
                Order History
              </CardTitle>
              <CardDescription>
                View your past orders
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setCurrentView('tracking')}
              >
                View History
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Active Orders</h2>
            {orderCount > 0 && (
              <Badge variant="secondary">{orderCount} active</Badge>
            )}
          </div>
          
          {activeOrders.length === 0 ? (
            <Card className="border-0 shadow-soft">
              <CardContent className="p-6">
                <div className="text-center text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No active orders</p>
                  <p className="text-sm">Place your first order to get started!</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {activeOrders.map((order) => (
                <Card key={order.id} className="border-0 shadow-soft">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-semibold">Order #{order.id.slice(-8)}</h3>
                        <p className="text-sm text-muted-foreground">
                          {order.pickup_type === 'locker' ? 'Locker Drop-off' : 'Pickup & Delivery'}
                          {order.is_express && ' • Express'}
                        </p>
                      </div>
                      <Badge 
                        variant="secondary"
                        className={
                          order.status === 'unclaimed' ? 'bg-yellow-100 text-yellow-800' :
                          order.status === 'claimed' || order.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                          order.status === 'washed' ? 'bg-purple-100 text-purple-800' :
                          'bg-green-100 text-green-800'
                        }
                      >
                        {order.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      <p><strong>Service:</strong> {order.service_type.replace('_', ' ')}</p>
                      <p><strong>Bags:</strong> {order.bag_count}</p>
                      {order.pickup_type === 'locker' && order.lockers && (
                        <p><strong>Location:</strong> {order.lockers.name}</p>
                      )}
                      {order.pickup_address && (
                        <p><strong>Pickup:</strong> {order.pickup_address}</p>
                      )}
                    </div>
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
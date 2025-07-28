import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Package, MapPin, Clock, Star, Plus, LogOut, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { OrderPlacement } from "@/components/orders/OrderPlacement";
import { OrderTracking } from "@/components/orders/OrderTracking";
import { FindLockers } from "@/components/FindLockers";
import { ProfileModal } from "@/components/customer/ProfileModal";
import { CouponsCarousel } from "@/components/customer/CouponsCarousel";
import { OrderStatusProgress } from "@/components/customer/OrderStatusProgress"; 
import { ChatWidget } from "@/components/customer/ChatWidget";

export function CustomerDashboard() {
  const { user, signOut } = useAuth();
  const [currentView, setCurrentView] = useState<'dashboard' | 'order' | 'tracking' | 'lockers'>('dashboard');
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [orderCount, setOrderCount] = useState(0);
  const [profile, setProfile] = useState<any>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);

  useEffect(() => {
    if (user) {
      loadActiveOrders();
      loadProfile();
    }
  }, [user]);

  const loadActiveOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          lockers:locker_id (name, address),
          washers:washer_id (
            user_id,
            profiles:user_id (first_name, last_name)
          )
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

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setProfile(data);
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  if (currentView === 'order') {
    return <OrderPlacement onBack={() => setCurrentView('dashboard')} />;
  }

  if (currentView === 'tracking') {
    return <OrderTracking onBack={() => setCurrentView('dashboard')} />;
  }

  if (currentView === 'lockers') {
    return <FindLockers onBack={() => setCurrentView('dashboard')} />;
  }

  const getCustomerName = () => {
    const firstName = profile?.first_name || user?.user_metadata?.first_name || '';
    const lastName = profile?.last_name || user?.user_metadata?.last_name || '';
    return firstName || lastName ? `${firstName} ${lastName}`.trim() : 'Customer';
  };

  const getInitials = () => {
    const firstName = profile?.first_name || user?.user_metadata?.first_name || '';
    const lastName = profile?.last_name || user?.user_metadata?.last_name || '';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || 'C';
  };

  const getOperatorName = (order: any) => {
    if (order.washers?.profiles) {
      const operatorProfile = order.washers.profiles;
      return `${operatorProfile.first_name || ''} ${operatorProfile.last_name || ''}`.trim() || 'Operator';
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-wave">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Welcome back, {getCustomerName()}!
            </h1>
            <p className="text-muted-foreground">
              Ready to get your laundry done?
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowProfileModal(true)}
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={profile?.avatar_url} />
                <AvatarFallback className="text-sm">{getInitials()}</AvatarFallback>
              </Avatar>
            </button>
            <Button variant="outline" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
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
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setCurrentView('lockers')}
              >
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

        <div className="mt-8 space-y-8">
          {/* Active Orders Section */}
          <div>
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
                      </div>

                      {/* Order Status Progress */}
                      <div className="mb-4">
                        <OrderStatusProgress 
                          status={order.status} 
                          operatorName={getOperatorName(order)}
                        />
                      </div>
                      
                      <div className="text-sm text-muted-foreground border-t pt-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p><strong>Service:</strong> {order.service_type.replace('_', ' ')}</p>
                            <p><strong>Bags:</strong> {order.bag_count}</p>
                            <p><strong>Total:</strong> ${(order.total_amount_cents / 100).toFixed(2)}</p>
                          </div>
                          <div>
                            {order.pickup_type === 'locker' && order.lockers && (
                              <p><strong>Location:</strong> {order.lockers.name}</p>
                            )}
                            {order.pickup_address && (
                              <p><strong>Pickup:</strong> {order.pickup_address}</p>
                            )}
                            {order.delivery_address && (
                              <p><strong>Delivery:</strong> {order.delivery_address}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Coupons Carousel */}
          <CouponsCarousel />
        </div>

        {/* Profile Modal */}
        <ProfileModal 
          isOpen={showProfileModal} 
          onClose={() => setShowProfileModal(false)} 
        />
      </div>

      {/* Live Chat Widget */}
      <ChatWidget />
    </div>
  );
}
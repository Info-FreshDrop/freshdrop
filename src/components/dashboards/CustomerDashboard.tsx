import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CouponsCarousel } from "@/components/customer/CouponsCarousel";
import { OrderStatusProgress } from "@/components/customer/OrderStatusProgress"; 
import { ChatWidget } from "@/components/customer/ChatWidget";
import { ProfileModal } from "@/components/customer/ProfileModal";
import { WalletInterface } from "@/components/customer/WalletInterface";
import { ReferralInterface } from "@/components/customer/ReferralInterface";
import { TipModal } from "@/components/customer/TipModal";
import { RatingModal } from "@/components/customer/RatingModal";
import { 
  Package, 
  User, 
  Settings, 
  ArrowLeft, 
  Clock,
  MapPin,
  Plus,
  Wallet,
  Share2,
  Star,
  Heart
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export function CustomerDashboard() {
  const { user, signOut } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showTipModal, setShowTipModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  useEffect(() => {
    if (user) {
      loadOrders();
    }
  }, [user]);

  const loadOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error loading orders:', error);
    }
  };

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

        <Tabs defaultValue="orders" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="orders" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Orders
            </TabsTrigger>
            <TabsTrigger value="wallet" className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Wallet
            </TabsTrigger>
            <TabsTrigger value="referrals" className="flex items-center gap-2">
              <Share2 className="h-4 w-4" />
              Referrals
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  Welcome back, {user?.user_metadata?.first_name || user?.email?.split('@')[0]}!
                </h1>
                <p className="text-muted-foreground">
                  Manage your laundry orders and track their progress
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowProfileModal(true)}
                className="flex items-center gap-2"
              >
                <Settings className="h-4 w-4" />
                Account Settings
              </Button>
            </div>

            {/* Active Orders Section */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Your Orders</h2>
              {orders.length === 0 ? (
                <Card className="p-8 text-center border-0 shadow-soft">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No orders yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Ready to get your laundry done? Place your first order!
                  </p>
                  <Button variant="hero" className="bg-gradient-primary">
                    <Plus className="h-4 w-4 mr-2" />
                    Place New Order
                  </Button>
                </Card>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <Card key={order.id} className="border-0 shadow-soft">
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-semibold text-lg">Order #{order.id.slice(0, 8)}</h3>
                            <p className="text-muted-foreground">
                              {new Date(order.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge variant="outline" className="mb-2">
                              {order.status}
                            </Badge>
                            <p className="text-lg font-bold text-green-600">
                              ${(order.total_amount_cents / 100).toFixed(2)}
                            </p>
                          </div>
                        </div>

                        {/* Order Status Progress */}
                        <OrderStatusProgress 
                          status={order.status}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-sm">
                          <div>
                            <p><strong>Service:</strong> {order.service_type?.replace('_', ' ')}</p>
                            <p><strong>Bags:</strong> {order.bag_count}</p>
                            <p><strong>Express:</strong> {order.is_express ? 'Yes' : 'No'}</p>
                          </div>
                          <div>
                            {order.washer_id && (
                              <p><strong>Operator Assigned:</strong> Yes</p>
                            )}
                            {order.pickup_address && (
                              <p><strong>Pickup:</strong> {order.pickup_address}</p>
                            )}
                            {order.delivery_address && (
                              <p><strong>Delivery:</strong> {order.delivery_address}</p>
                            )}
                          </div>
                        </div>

                        {/* Action buttons for completed orders */}
                        {order.status === 'completed' && (
                          <div className="flex gap-2 mt-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedOrder(order);
                                setShowTipModal(true);
                              }}
                            >
                              <Heart className="h-4 w-4 mr-2" />
                              Tip Operator
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedOrder(order);
                                setShowRatingModal(true);
                              }}
                            >
                              <Star className="h-4 w-4 mr-2" />
                              Rate Service
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Coupons Carousel */}
            <CouponsCarousel />
          </TabsContent>

          <TabsContent value="wallet">
            <WalletInterface />
          </TabsContent>

          <TabsContent value="referrals">
            <ReferralInterface />
          </TabsContent>

          <TabsContent value="profile">
            <Card className="border-0 shadow-soft">
              <CardHeader>
                <CardTitle>Account Settings</CardTitle>
                <p className="text-muted-foreground">Manage your profile and preferences</p>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => setShowProfileModal(true)}
                  className="w-full"
                >
                  <User className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Modals */}
        <ProfileModal 
          isOpen={showProfileModal} 
          onClose={() => setShowProfileModal(false)} 
        />
        
        {selectedOrder && (
          <>
            <TipModal
              isOpen={showTipModal}
              onClose={() => {
                setShowTipModal(false);
                setSelectedOrder(null);
              }}
              order={selectedOrder}
              operatorName="Your Operator"
            />
            
            <RatingModal
              isOpen={showRatingModal}
              onClose={() => {
                setShowRatingModal(false);
                setSelectedOrder(null);
              }}
              order={selectedOrder}
              operatorName="Your Operator"
            />
          </>
        )}
      </div>

      {/* Live Chat Widget */}
      <ChatWidget />
    </div>
  );
}
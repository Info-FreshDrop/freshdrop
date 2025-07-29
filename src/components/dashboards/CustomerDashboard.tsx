import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RatingModal } from "@/components/customer/RatingModal";
import { OrderStatusProgress } from "@/components/customer/OrderStatusProgress"; 
import { CouponsCarousel } from "@/components/customer/CouponsCarousel";
import { OrderTracking } from "@/components/orders/OrderTracking";
import { ClothesShop } from "@/components/customer/ClothesShop";
import { ReferralInterface } from "@/components/customer/ReferralInterface";
import { WalletInterface } from "@/components/customer/WalletInterface";
import { MobileOrderWizard } from "@/components/mobile/MobileOrderWizard";
import { OrderHistory } from "@/components/orders/OrderHistory";
import { ProfileModal } from "@/components/customer/ProfileModal";
import { TipModal } from "@/components/customer/TipModal";
import { ChatWidget } from "@/components/customer/ChatWidget";
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
  Heart,
  CreditCard,
  Gift,
  LogOut,
  ShoppingBag,
  History
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import laundryServiceImg from "@/assets/laundry-service.jpg";
import cleanLaundryImg from "@/assets/clean-laundry.jpg";
import laundryDeliveryImg from "@/assets/laundry-delivery.jpg";

export function CustomerDashboard() {
  const { user, signOut } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [orderHistory, setOrderHistory] = useState<any[]>([]);
  const [showWallet, setShowWallet] = useState(false);
  const [showTipModal, setShowTipModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showOrderPlacement, setShowOrderPlacement] = useState(false);
  const [showOrderHistory, setShowOrderHistory] = useState(false);
  const [showClothesShop, setShowClothesShop] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  
  const [activeTab, setActiveTab] = useState('orders');
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);

  useEffect(() => {
    if (user) {
      loadOrders();
      loadUserProfile();
    }
  }, [user]);

  const loadUserProfile = async () => {
    try {
      setIsLoadingProfile(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (data) {
        setUserProfile(data);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const loadOrders = async () => {
    try {
      setIsLoadingOrders(true);
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const allOrders = data || [];
      // Separate active orders from completed/canceled ones
      const activeOrders = allOrders.filter(order => 
        !['completed', 'cancelled'].includes(order.status)
      );
      const completedOrders = allOrders.filter(order => 
        ['completed', 'cancelled'].includes(order.status)
      );
      
      setOrders(activeOrders);
      setOrderHistory(completedOrders);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  const getUserInitials = () => {
    const firstName = userProfile?.first_name || user?.user_metadata?.first_name || '';
    const lastName = userProfile?.last_name || user?.user_metadata?.last_name || '';
    if (firstName && lastName) {
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    }
    return user?.email?.charAt(0).toUpperCase() || 'U';
  };

  const getUserDisplayName = () => {
    const firstName = userProfile?.first_name || user?.user_metadata?.first_name;
    if (firstName) {
      return firstName;
    }
    return user?.email?.split('@')[0] || 'User';
  };

  // Show OrderPlacement component if requested
  if (showOrderPlacement) {
    return <MobileOrderWizard onBack={() => setShowOrderPlacement(false)} />;
  }

  // Show OrderHistory component if requested
  if (showOrderHistory) {
    return <OrderHistory onBack={() => setShowOrderHistory(false)} />;
  }
  
  // Show ClothesShop component if requested
  if (showClothesShop) {
    return <ClothesShop onBack={() => setShowClothesShop(false)} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col">
      {/* Professional Header */}
      <div className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-md mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Avatar className="h-12 w-12 ring-2 ring-primary/10">
                <AvatarImage src={userProfile?.avatar_url} />
                <AvatarFallback className="bg-gradient-primary text-white font-semibold">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-xl font-bold text-slate-900">
                  Welcome back,
                </h1>
                <p className="text-lg text-primary font-medium">
                  {getUserDisplayName()}!
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowProfileModal(true)}
              className="h-10 w-10 rounded-full"
            >
              <Settings className="h-5 w-5 text-slate-600" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 max-w-md mx-auto w-full">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsContent value="orders" className="flex-1 px-4 py-6 mt-0">
            <div className="space-y-6">
              {/* Quick Action Hero */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-primary p-6 text-white">
                <div className="absolute inset-0 opacity-20">
                  <img 
                    src={laundryServiceImg} 
                    alt="Laundry Service" 
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="relative">
                  <h2 className="text-xl font-bold mb-2">Ready for fresh laundry?</h2>
                  <p className="text-white/90 mb-4 text-sm">
                    24-hour turnaround • Pickup & delivery
                  </p>
                  <Button 
                    variant="secondary"
                    size="lg"
                    className="bg-white text-primary hover:bg-white/90 font-semibold"
                    onClick={() => setShowOrderPlacement(true)}
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Place New Order
                  </Button>
                </div>
              </div>

              {/* Active Orders */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-3">Your Orders</h3>
                {orders.length === 0 ? (
                  <Card className="p-6 text-center border-0 shadow-sm bg-white">
                    <div className="relative h-32 mb-4 rounded-lg overflow-hidden">
                      <img 
                        src={cleanLaundryImg} 
                        alt="Clean Laundry" 
                        className="h-full w-full object-cover opacity-60"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                    </div>
                    <h4 className="font-medium mb-2">No orders yet</h4>
                    <p className="text-sm text-slate-600 mb-4">
                      Place your first order and experience our amazing service!
                    </p>
                    <Button 
                      variant="outline"
                      onClick={() => setShowOrderPlacement(true)}
                    >
                      Get Started
                    </Button>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {orders.map((order) => (
                      <Card key={order.id} className="border-0 shadow-sm bg-white">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h4 className="font-semibold">Order #{order.id.slice(0, 8)}</h4>
                              <p className="text-sm text-slate-600">
                                {new Date(order.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <Badge variant="outline" className="mb-1">
                                {order.status}
                              </Badge>
                              <p className="text-sm font-bold text-green-600">
                                ${(order.total_amount_cents / 100).toFixed(2)}
                              </p>
                            </div>
                          </div>

                          <OrderStatusProgress status={order.status} />

                          <div className="grid grid-cols-2 gap-3 mt-3 text-xs text-slate-600">
                            <div>
                              <p><strong>Service:</strong> {order.service_type?.replace('_', ' ')}</p>
                              <p><strong>Bags:</strong> {order.bag_count}</p>
                            </div>
                            <div>
                              <p><strong>Express:</strong> {order.is_express ? 'Yes' : 'No'}</p>
                              {order.washer_id && <p><strong>Operator:</strong> Assigned</p>}
                            </div>
                          </div>

                          {order.status === 'completed' && (
                            <div className="flex gap-2 mt-3">
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 text-xs"
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setShowTipModal(true);
                                }}
                              >
                                <Heart className="h-3 w-3 mr-1" />
                                Tip
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 text-xs"
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setShowRatingModal(true);
                                }}
                              >
                                <Star className="h-3 w-3 mr-1" />
                                Rate
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                     ))}
                   </div>
                 )}
               </div>

               {/* Quick Actions */}
               <div>
                 <h3 className="text-lg font-semibold text-slate-900 mb-3">Quick Actions</h3>
                 <div className="grid grid-cols-2 gap-3">
                   <Button
                     variant="outline"
                     className="flex items-center justify-center gap-2 h-16 border-dashed"
                     onClick={() => setShowClothesShop(true)}
                   >
                     <ShoppingBag className="h-5 w-5" />
                     <span className="text-sm font-medium">Shop</span>
                   </Button>
                   <Button
                     variant="outline"
                     className="flex items-center justify-center gap-2 h-16 border-dashed"
                     onClick={() => setShowOrderHistory(true)}
                   >
                     <History className="h-5 w-5" />
                     <span className="text-sm font-medium">History</span>
                   </Button>
                 </div>
               </div>

               {/* Coupons */}
               <CouponsCarousel />
             </div>
          </TabsContent>

          <TabsContent value="payments" className="flex-1 px-4 py-6 mt-0">
            <div className="space-y-6">
              <div className="relative overflow-hidden rounded-2xl bg-gradient-primary p-6 text-white">
                <div className="absolute inset-0 opacity-20">
                  <img 
                    src={laundryDeliveryImg} 
                    alt="Delivery Service" 
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="relative">
                  <CreditCard className="h-8 w-8 mb-3" />
                  <h2 className="text-xl font-bold mb-2">Wallet & Payments</h2>
                  <p className="text-white/90 text-sm">
                    Manage your payment methods and wallet balance
                  </p>
                </div>
              </div>
              
              <WalletInterface />
            </div>
          </TabsContent>

          <TabsContent value="referrals" className="flex-1 px-4 py-6 mt-0">
            <div className="space-y-6">
              <div className="relative overflow-hidden rounded-2xl bg-gradient-primary p-6 text-white">
                <div className="absolute inset-0 opacity-20">
                  <img 
                    src={cleanLaundryImg} 
                    alt="Fresh Laundry" 
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="relative">
                  <Gift className="h-8 w-8 mb-3" />
                  <h2 className="text-xl font-bold mb-2">Refer & Earn</h2>
                  <p className="text-white/90 text-sm">
                    Share FreshDrop with friends and earn rewards
                  </p>
                </div>
              </div>
              
              <ReferralInterface />
            </div>
          </TabsContent>

          {/* Bottom Navigation */}
          <div className="border-t border-slate-200 bg-white">
            <TabsList className="grid w-full grid-cols-3 h-auto p-2 bg-transparent">
              <TabsTrigger 
                value="orders" 
                className="flex flex-col items-center gap-1 py-3 px-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
              >
                <Package className="h-5 w-5" />
                <span className="text-xs font-medium">Orders</span>
              </TabsTrigger>
              <TabsTrigger 
                value="payments"
                className="flex flex-col items-center gap-1 py-3 px-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
              >
                <CreditCard className="h-5 w-5" />
                <span className="text-xs font-medium">Wallet</span>
              </TabsTrigger>
              <TabsTrigger 
                value="referrals"
                className="flex flex-col items-center gap-1 py-3 px-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
              >
                <Gift className="h-5 w-5" />
                <span className="text-xs font-medium">Referrals</span>
              </TabsTrigger>
            </TabsList>
          </div>
        </Tabs>

      </div>

      {/* Modals */}
      <ProfileModal 
        isOpen={showProfileModal} 
        onClose={() => setShowProfileModal(false)}
        onProfileUpdate={loadUserProfile}
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
            onRatingSubmitted={loadOrders}
          />
        </>
      )}

      {/* Live Chat Widget */}
      <ChatWidget />
    </div>
  );
}
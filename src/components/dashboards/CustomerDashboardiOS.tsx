import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RatingModal } from "@/components/customer/RatingModal";
import { OrderStatusProgress } from "@/components/customer/OrderStatusProgress"; 
import { CouponsCarousel } from "@/components/customer/CouponsCarousel";
import { OrderTracking } from "@/components/orders/OrderTracking";
import { ClothesShop } from "@/components/customer/ClothesShop";
import { ReferralInterface } from "@/components/customer/ReferralInterface";
import { PaymentMethods } from "@/components/customer/PaymentMethods";
import { MobileOrderWizard } from "@/components/mobile/MobileOrderWizard";
import { OrderHistory } from "@/components/orders/OrderHistory";
import { ProfileModal } from "@/components/customer/ProfileModal";
import { TipModal } from "@/components/customer/TipModal";
import { OrderMessaging } from "@/components/customer/OrderMessaging";
import { ChatWidget } from "@/components/customer/ChatWidget";
import { NotificationCenter } from "@/components/customer/NotificationCenter";
import { HapticButton, IOSPrimaryButton } from "@/components/ui/haptic-button";
import { NativeCapabilitiesStatus } from "@/components/mobile/NativeFeatures";
import { IOSScreen, IOSContent, IOSScrollView, IOSSection, IOSList, IOSListItem } from "@/components/ui/ios-layout";
import { IOSHeader, IOSTabBar } from "@/components/ui/ios-navigation";
import { IOSCard } from "@/components/ui/ios-navigation";
import { 
  Package, 
  User, 
  Settings, 
  ArrowLeft, 
  Clock,
  MapPin,
  Plus,
  Share2,
  Star,
  Heart,
  CreditCard,
  Gift,
  LogOut,
  ShoppingBag,
  History,
  MessageCircle
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import laundryServiceImg from "@/assets/laundry-service.jpg";
import cleanLaundryImg from "@/assets/clean-laundry.jpg";
import laundryDeliveryImg from "@/assets/laundry-delivery.jpg";

function MessageButton({ order }: { order: any }) {
  const unreadCount = useUnreadMessages(order.id);
  const [selectedOrderForMessaging, setSelectedOrderForMessaging] = useState<any>(null);
  const [showMessaging, setShowMessaging] = useState(false);

  return (
    <>
      <HapticButton
        variant="outline"
        size="default"
        className="flex-1 ios-touch relative"
        onClick={() => {
          setSelectedOrderForMessaging(order);
          setShowMessaging(true);
        }}
      >
        <MessageCircle className="h-4 w-4 mr-2" />
        Message
        {unreadCount > 0 && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
            {unreadCount}
          </div>
        )}
      </HapticButton>
      
      {showMessaging && selectedOrderForMessaging && (
        <OrderMessaging
          orderId={selectedOrderForMessaging.id}
          operatorId={selectedOrderForMessaging.washer_id}
          operatorName={
            selectedOrderForMessaging.washers?.profiles
              ? `${selectedOrderForMessaging.washers.profiles.first_name || ''} ${selectedOrderForMessaging.washers.profiles.last_name || ''}`.trim()
              : 'Operator'
          }
          isOpen={showMessaging}
          onClose={() => {
            setShowMessaging(false);
            setSelectedOrderForMessaging(null);
          }}
        />
      )}
    </>
  );
}

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
  const [showOrderTracking, setShowOrderTracking] = useState(false);
  const [selectedOrderForTracking, setSelectedOrderForTracking] = useState<any>(null);
  
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
    if (!user?.id) {
      console.log('No user ID available for loading orders');
      return;
    }
    
    try {
      console.log('Loading orders for user:', user.id);
      setIsLoadingOrders(true);
      const { data, error } = await supabase
        .from('orders')
        .select(`*`)
        .eq('customer_id', user?.id)
        .order('created_at', { ascending: false });

      console.log('Supabase query result - data:', data, 'error:', error);

      if (error) {
        console.error('Error loading orders:', error);
        throw error;
      }

      console.log('Orders loaded successfully:', data?.length || 0, 'orders');
      
      let allOrders = data || [];
      
      // Load washer information separately for orders that have washers
      if (allOrders.length > 0) {
        const ordersWithWashers = allOrders.filter(order => order.washer_id);
        console.log('Orders with washers:', ordersWithWashers.length, ordersWithWashers.map(o => ({id: o.id.slice(0,8), washer_id: o.washer_id})));
        
        if (ordersWithWashers.length > 0) {
          const washerIds = ordersWithWashers.map(order => order.washer_id);
          console.log('Loading washers for IDs:', washerIds);
          
          const { data: washersData, error: washerError } = await supabase
            .from('washers')
            .select(`
              id,
              user_id,
              profiles!washers_user_id_fkey(first_name, last_name, phone)
            `)
            .in('id', washerIds);
          
          console.log('Washers data loaded:', washersData, 'error:', washerError);
          
          // Merge washer data with orders
          allOrders = allOrders.map(order => {
            if (order.washer_id) {
              const washerInfo = washersData?.find(w => w.id === order.washer_id);
              console.log(`Order ${order.id.slice(0,8)} - washer_id: ${order.washer_id}, found washer:`, washerInfo);
              return { ...order, washers: washerInfo };
            }
            return order;
          });
        }
      }
      
      console.log('Raw orders from database:', allOrders);
      console.log('All orders with customer_acknowledged:', allOrders.map(o => ({id: o.id.slice(0,8), status: o.status, acknowledged: o.customer_acknowledged})));
      
      // Separate active orders from acknowledged completed ones
      const activeOrders = allOrders.filter(order => {
        // Show as active if not completed/cancelled, or if completed but not acknowledged
        if (!['completed', 'cancelled'].includes(order.status)) {
          return true;
        }
        return order.status === 'completed' && !order.customer_acknowledged;
      });
      const completedOrders = allOrders.filter(order => 
        (['completed', 'cancelled'].includes(order.status)) && order.customer_acknowledged
      );
      
      console.log('Active orders:', activeOrders.length, activeOrders);
      console.log('Completed orders:', completedOrders.length, completedOrders);
      
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

  // Show OrderTracking component if requested
  if (showOrderTracking && selectedOrderForTracking) {
    return (
      <OrderTracking 
        onBack={() => {
          setShowOrderTracking(false);
          setSelectedOrderForTracking(null);
        }} 
        onOrderUpdate={loadOrders}
        selectedOrderId={selectedOrderForTracking.id}
      />
    );
  }

  const tabs = [
    { id: 'orders', label: 'Orders', icon: <Package className="h-5 w-5" />, onClick: () => setActiveTab('orders') },
    { id: 'payments', label: 'Payments', icon: <CreditCard className="h-5 w-5" />, onClick: () => setActiveTab('payments') },
    { id: 'referrals', label: 'Referrals', icon: <Gift className="h-5 w-5" />, onClick: () => setActiveTab('referrals') },
    { id: 'account', label: 'Account', icon: <User className="h-5 w-5" />, onClick: () => setActiveTab('account') }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'orders':
        return (
          <IOSScrollView>
            {/* Native Features Status */}
            <IOSSection>
              <NativeCapabilitiesStatus />
            </IOSSection>
            
            {/* Quick Action Hero */}
            <IOSSection>
              <IOSCard className="relative overflow-hidden bg-gradient-primary p-6 text-white">
                <div className="absolute inset-0 opacity-20">
                  <img 
                    src={laundryServiceImg} 
                    alt="Laundry Service" 
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="relative">
                  <h2 className="ios-title2 mb-2">Ready for fresh laundry?</h2>
                  <p className="ios-subhead text-white/90 mb-4">
                    24-hour turnaround • Pickup & delivery
                  </p>
                  <IOSPrimaryButton 
                    onClick={() => setShowOrderPlacement(true)}
                    className="bg-white text-primary hover:bg-white/90"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Place New Order
                  </IOSPrimaryButton>
                </div>
              </IOSCard>
            </IOSSection>

            {/* Active Orders */}
            <IOSSection title="Your Orders">
              {isLoadingOrders ? (
                <IOSCard className="p-6 text-center">
                  <p className="ios-body">Loading orders...</p>
                </IOSCard>
              ) : orders.length === 0 ? (
                <IOSCard className="p-6 text-center">
                  <div className="relative h-32 mb-4 rounded-lg overflow-hidden">
                    <img 
                      src={cleanLaundryImg} 
                      alt="Clean Laundry" 
                      className="h-full w-full object-cover opacity-60"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                  </div>
                  <h4 className="ios-body font-medium mb-2">No orders yet</h4>
                  <p className="ios-caption text-muted-foreground mb-4">
                    Place your first order and experience our amazing service!
                  </p>
                  <HapticButton 
                    variant="outline"
                    onClick={() => setShowOrderPlacement(true)}
                    className="ios-button-secondary"
                  >
                    Get Started
                  </HapticButton>
                </IOSCard>
              ) : (
                <IOSList>
                  {orders.map((order) => (
                    <IOSListItem
                      key={order.id}
                      leadingIcon={<Package className="h-5 w-5 text-primary" />}
                      trailingIcon={<Badge variant="outline">{order.status}</Badge>}
                      subtitle={`${new Date(order.created_at).toLocaleDateString()} • $${(order.total_amount_cents / 100).toFixed(2)}`}
                    >
                      Order #{order.id.slice(0, 8)}
                    </IOSListItem>
                  ))}
                </IOSList>
              )}
            </IOSSection>

            {/* Quick Actions */}
            <IOSSection title="Quick Actions">
              <IOSList>
                <IOSListItem
                  interactive
                  onClick={() => setShowClothesShop(true)}
                  leadingIcon={<ShoppingBag className="h-5 w-5 text-primary" />}
                  trailingIcon={<span className="ios-chevron">›</span>}
                >
                  Shop Clothes
                </IOSListItem>
                <IOSListItem
                  interactive
                  onClick={() => setShowOrderHistory(true)}
                  leadingIcon={<History className="h-5 w-5 text-primary" />}
                  trailingIcon={<span className="ios-chevron">›</span>}
                >
                  Order History
                </IOSListItem>
              </IOSList>
            </IOSSection>
          </IOSScrollView>
        );

      case 'payments':
        return (
          <IOSScrollView>
            <IOSSection title="Payment Methods">
              <PaymentMethods />
            </IOSSection>
            <IOSSection title="Special Offers">
              <CouponsCarousel />
            </IOSSection>
          </IOSScrollView>
        );

      case 'referrals':
        return (
          <IOSScrollView>
            <IOSSection title="Refer Friends">
              <ReferralInterface />
            </IOSSection>
          </IOSScrollView>
        );

      case 'account':
        return (
          <IOSScrollView>
            <IOSSection title="Profile">
              <IOSList>
                <IOSListItem
                  leadingIcon={
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={userProfile?.avatar_url} />
                      <AvatarFallback>{getUserInitials()}</AvatarFallback>
                    </Avatar>
                  }
                  subtitle={user?.email || ''}
                >
                  {getUserDisplayName()}
                </IOSListItem>
                <IOSListItem
                  interactive
                  onClick={() => setShowProfileModal(true)}
                  leadingIcon={<Settings className="h-5 w-5 text-primary" />}
                  trailingIcon={<span className="ios-chevron">›</span>}
                >
                  Edit Profile
                </IOSListItem>
                <IOSListItem
                  interactive
                  onClick={signOut}
                  leadingIcon={<LogOut className="h-5 w-5 text-destructive" />}
                  className="text-destructive"
                >
                  Sign Out
                </IOSListItem>
              </IOSList>
            </IOSSection>
          </IOSScrollView>
        );

      default:
        return null;
    }
  };

  return (
    <IOSScreen>
      <IOSHeader 
        title="FreshDrop"
        rightButton={{
          text: "Profile",
          onClick: () => setShowProfileModal(true)
        }}
      />
      
      <IOSContent>
        {renderTabContent()}
      </IOSContent>

      <IOSTabBar
        tabs={tabs}
        activeTab={activeTab}
      />

      {/* Modals */}
      {showTipModal && selectedOrder && (
        <TipModal
          order={selectedOrder}
          isOpen={showTipModal}
          onClose={() => {
            setShowTipModal(false);
            setSelectedOrder(null);
          }}
        />
      )}

      {showRatingModal && selectedOrder && (
        <RatingModal
          order={selectedOrder}
          isOpen={showRatingModal}
          onClose={() => {
            setShowRatingModal(false);
            setSelectedOrder(null);
          }}
          onOrderUpdate={loadOrders}
        />
      )}

      {showProfileModal && (
        <ProfileModal
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          onProfileUpdate={loadUserProfile}
        />
      )}

      {/* Chat Widget */}
      <ChatWidget />
    </IOSScreen>
  );
}
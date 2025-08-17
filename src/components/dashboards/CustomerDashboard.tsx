// Re-export the iOS version for complete transformation
export { CustomerDashboard } from './CustomerDashboardiOS';
  const unreadCount = useUnreadMessages(order.id);
  const [selectedOrderForMessaging, setSelectedOrderForMessaging] = useState<any>(null);
  const [showMessaging, setShowMessaging] = useState(false);

  return (
    <>
      <Button
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
      </Button>
      
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col safe-area-full">
      {/* iOS-Style Header */}
      <div className="bg-background/95 backdrop-blur-sm border-b border-border safe-area-top">
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex items-center justify-between min-h-[44px]">
            <div className="flex items-center space-x-3">
              <Avatar className="h-12 w-12 ring-2 ring-primary/10">
                <AvatarImage src={userProfile?.avatar_url} />
                <AvatarFallback className="bg-gradient-primary text-white font-semibold">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="ios-title3 text-foreground">
                  Welcome back,
                </h1>
                <p className="ios-body text-primary font-medium">
                  {getUserDisplayName()}!
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <NotificationCenter />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowProfileModal(true)}
                className="ios-touch"
              >
                <Settings className="h-5 w-5 text-muted-foreground" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 max-w-md mx-auto w-full">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsContent value="orders" className="flex-1 px-4 py-4 mt-0 pb-20">
            <div className="space-y-6">
              {/* Native Features Status */}
              <NativeCapabilitiesStatus />
              
              {/* Quick Action Hero */}
              <div className="relative overflow-hidden rounded-xl bg-gradient-primary p-6 text-white">
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
              </div>

              {/* Active Orders */}
              <div>
                <h3 className="ios-title3 text-foreground mb-4">Your Orders</h3>
                {isLoadingOrders ? (
                  <Card className="p-6 text-center border-0 shadow-sm bg-white">
                    <p>Loading orders...</p>
                  </Card>
                ) : orders.length === 0 ? (
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
                    <HapticButton 
                      variant="outline"
                      size="mobile"
                      onClick={() => setShowOrderPlacement(true)}
                      className="ios-button-secondary"
                    >
                      Get Started
                    </HapticButton>
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

                          <OrderStatusProgress 
                            status={order.status} 
                            currentStep={order.current_step}
                          />

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

                          <div className="flex gap-2 mt-3">
                            <Button
                              variant="outline"
                              size="default"
                              className="flex-1 ios-touch"
                              onClick={() => {
                                console.log('Track Order clicked for order:', order.id);
                                setSelectedOrderForTracking(order);
                                setShowOrderTracking(true);
                              }}
                            >
                              <Package className="h-4 w-4 mr-2" />
                              Track Order
                            </Button>
                            {order.washer_id && <MessageButton order={order} />}
                            {order.status === 'completed' && !order.customer_acknowledged && (
                              <>
                                <Button
                                  variant="outline"
                                  size="default"
                                  className="flex-1 ios-touch"
                                  onClick={() => {
                                    setSelectedOrder(order);
                                    setShowTipModal(true);
                                  }}
                                >
                                  <Heart className="h-4 w-4 mr-2" />
                                  Tip
                                </Button>
                                <Button
                                  variant="outline"
                                  size="default"
                                  className="flex-1 ios-touch"
                                  onClick={() => {
                                    setSelectedOrder(order);
                                    setShowRatingModal(true);
                                  }}
                                >
                                  <Star className="h-4 w-4 mr-2" />
                                  Rate
                                </Button>
                              </>
                            )}
                          </div>
                          {order.status === 'completed' && !order.customer_acknowledged && (
                            <Button
                              variant="default"
                              size="lg"
                              className="w-full text-sm mt-3 py-3 bg-primary hover:bg-primary/90 text-white font-semibold"
                              onClick={async () => {
                                console.log('Clear button clicked for order:', order.id);
                                console.log('Order current acknowledged status:', order.customer_acknowledged);
                                try {
                                  const { data, error } = await supabase
                                    .from('orders')
                                    .update({ customer_acknowledged: true })
                                    .eq('id', order.id)
                                    .select();
                                  
                                  if (error) {
                                    console.error('Supabase update error:', error);
                                    throw error;
                                  }
                                  
                                  console.log('Order successfully updated:', data);
                                  loadOrders(); // Refresh the orders list
                                } catch (error) {
                                  console.error('Error acknowledging order:', error);
                                }
                              }}
                            >
                              <Package className="h-4 w-4 mr-2" />
                              Clear Order
                            </Button>
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
                      className="flex items-center justify-center gap-2 h-16 border-dashed ios-touch"
                      onClick={() => setShowClothesShop(true)}
                    >
                      <ShoppingBag className="h-5 w-5" />
                      <span className="ios-callout">Shop</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="flex items-center justify-center gap-2 h-16 border-dashed ios-touch"
                      onClick={() => setShowOrderHistory(true)}
                    >
                      <History className="h-5 w-5" />
                      <span className="ios-callout">History</span>
                    </Button>
                 </div>
               </div>

               {/* Coupons */}
               <CouponsCarousel />
             </div>
          </TabsContent>

          <TabsContent value="payments" className="flex-1 px-3 sm:px-4 py-4 sm:py-6 mt-0">
            <div className="space-y-4 sm:space-y-6">
              <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-primary p-4 sm:p-6 text-white">
                <div className="absolute inset-0 opacity-20">
                  <img 
                    src={laundryDeliveryImg} 
                    alt="Delivery Service" 
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="relative">
                  <CreditCard className="h-6 w-6 sm:h-8 sm:w-8 mb-2 sm:mb-3" />
                  <h2 className="text-lg sm:text-xl font-bold mb-2">Payment Methods</h2>
                  <p className="text-white/90 text-sm">
                    Manage your saved payment methods
                  </p>
                </div>
              </div>
              
              <PaymentMethods />
            </div>
          </TabsContent>

          <TabsContent value="referrals" className="flex-1 px-3 sm:px-4 py-4 sm:py-6 mt-0">
            <div className="space-y-4 sm:space-y-6">
              <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-primary p-4 sm:p-6 text-white">
                <div className="absolute inset-0 opacity-20">
                  <img 
                    src={cleanLaundryImg} 
                    alt="Fresh Laundry" 
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="relative">
                  <Gift className="h-6 w-6 sm:h-8 sm:w-8 mb-2 sm:mb-3" />
                  <h2 className="text-lg sm:text-xl font-bold mb-2">Refer & Earn</h2>
                  <p className="text-white/90 text-sm">
                    Share FreshDrop with friends and earn rewards
                  </p>
                </div>
              </div>
              
              <ReferralInterface />
            </div>
          </TabsContent>

          {/* iOS-Style Bottom Navigation */}
          <div className="ios-tab-bar border-t border-border bg-background/95 backdrop-blur-sm safe-area-bottom">
            <TabsList className="grid w-full grid-cols-3 h-full bg-transparent">
              <TabsTrigger 
                value="orders" 
                className="ios-touch flex flex-col items-center justify-center gap-1 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
              >
                <Package className="h-5 w-5" />
                <span className="ios-caption font-medium">Orders</span>
              </TabsTrigger>
              <TabsTrigger 
                value="payments"
                className="ios-touch flex flex-col items-center justify-center gap-1 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
              >
                <CreditCard className="h-5 w-5" />
                <span className="ios-caption font-medium">Payments</span>
              </TabsTrigger>
              <TabsTrigger 
                value="referrals"
                className="ios-touch flex flex-col items-center justify-center gap-1 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
              >
                <Gift className="h-5 w-5" />
                <span className="ios-caption font-medium">Referrals</span>
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
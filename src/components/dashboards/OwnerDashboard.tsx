import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OperatorManagement } from "@/components/admin/OperatorManagement";
import { ServiceAreasManagement } from "@/components/admin/ServiceAreasManagement";
import { ClothesShopManagement } from "@/components/admin/ClothesShopManagement";
import { AnalyticsDashboard } from "@/components/admin/AnalyticsDashboard";
import { PromoCodeManagement } from "@/components/admin/PromoCodeManagement";
import { AllOperatorsView } from "@/components/admin/AllOperatorsView";
import { LiveOrderManagement } from "@/components/admin/LiveOrderManagement";
import { OrderIssueTracking } from "@/components/admin/OrderIssueTracking";
import { OperatorWorkloadBalance } from "@/components/admin/OperatorWorkloadBalance";
import { UserManagement } from "@/components/admin/UserManagement";
import { OperatorPaymentManagement } from "@/components/admin/OperatorPaymentManagement";
import { BusinessCutManagement } from "@/components/admin/BusinessCutManagement";
import { NotificationTesting } from "@/components/admin/NotificationTesting";
import NotificationTemplateManagement from "@/components/admin/NotificationTemplateManagement";
import { CustomerManagement } from "@/components/admin/CustomerManagement";
import { AuthForms } from "@/components/AuthForms";
import { supabase } from "@/integrations/supabase/client";
import { 
  Users, 
  Package, 
  MapPin, 
  TrendingUp, 
  Settings,
  PlusCircle,
  BarChart3,
  Shield,
  ArrowLeft,
  UserPlus,
  Bell,
  MessageSquare,
  DollarSign
} from "lucide-react";

export function OwnerDashboard() {
  const { user, userRole, signOut } = useAuth();
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState<'dashboard' | 'operators' | 'service-areas' | 'shop' | 'analytics' | 'promo-codes' | 'promo-analytics' | 'live-orders' | 'order-history' | 'all-operators' | 'live-order-management' | 'order-issues' | 'workload-balance' | 'user-management' | 'notifications' | 'notification-templates' | 'customer-management' | 'operator-payments' | 'business-cut'>('dashboard');
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [liveOrders, setLiveOrders] = useState<any[]>([]);
  const [completedOrders, setCompletedOrders] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalOrders: 0,
    activeOperators: 0,
    pendingApprovals: 0,
    pendingApplications: 0,
    totalLockers: 0,
    activeLockers: 0,
    totalRevenue: 0,
    freshDropPay: 0,
    operatorPay: 0
  });

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      // Get total orders count
      const { count: ordersCount, error: ordersError } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true });
      
      console.log('Owner dashboard - orders count query:', { ordersCount, ordersError });

      // Get all orders for owner dashboard
      const { data: allOrdersData, error: allOrdersError } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      
      console.log('Owner dashboard - all orders query:', { allOrdersData, allOrdersError });
      setAllOrders(allOrdersData || []);

      // Separate live orders from completed/cancelled orders
      const live = (allOrdersData || []).filter(order => 
        !['completed', 'cancelled'].includes(order.status)
      );
      const completed = (allOrdersData || []).filter(order => 
        ['completed', 'cancelled'].includes(order.status)
      );
      
      setLiveOrders(live);
      setCompletedOrders(completed);

      // Get financial data (sum of all completed orders)
      const { data: financialData } = await supabase
        .from('orders')
        .select('total_amount_cents, business_cut_cents, operator_payout_cents')
        .eq('status', 'completed');

      const totalRevenue = financialData?.reduce((sum, order) => sum + (order.total_amount_cents || 0), 0) || 0;
      const freshDropPay = financialData?.reduce((sum, order) => sum + (order.business_cut_cents || 0), 0) || 0;
      const operatorPay = financialData?.reduce((sum, order) => sum + (order.operator_payout_cents || 0), 0) || 0;

      // Get active operators count
      const { count: operatorsCount } = await supabase
        .from('washers')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .eq('approval_status', 'approved');

      // Get pending approvals count
      const { count: pendingCount } = await supabase
        .from('washers')
        .select('*', { count: 'exact', head: true })
        .eq('approval_status', 'pending');

      // Get pending applications count
      const { count: pendingApplicationsCount } = await supabase
        .from('operator_applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Get lockers stats
      const { count: totalLockersCount } = await supabase
        .from('lockers')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      const { count: activeLockersCount } = await supabase
        .from('lockers')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .eq('status', 'available');

      setStats({
        totalOrders: ordersCount || 0,
        activeOperators: operatorsCount || 0,
        pendingApprovals: pendingCount || 0,
        pendingApplications: pendingApplicationsCount || 0,
        totalLockers: totalLockersCount || 0,
        activeLockers: activeLockersCount || 0,
        totalRevenue: totalRevenue,
        freshDropPay: freshDropPay,
        operatorPay: operatorPay
      });

      // Set up real-time subscription for pending approvals and applications
      const channel = supabase
        .channel('dashboard-stats')
        .on('postgres_changes', 
          { event: 'INSERT', schema: 'public', table: 'washers' },
          () => loadDashboardStats()
        )
        .on('postgres_changes', 
          { event: 'UPDATE', schema: 'public', table: 'washers' },
          () => loadDashboardStats()
        )
        .on('postgres_changes', 
          { event: 'INSERT', schema: 'public', table: 'operator_applications' },
          () => loadDashboardStats()
        )
        .on('postgres_changes', 
          { event: 'UPDATE', schema: 'public', table: 'operator_applications' },
          () => loadDashboardStats()
        )
        .on('postgres_changes', 
          { event: 'INSERT', schema: 'public', table: 'orders' },
          () => loadDashboardStats()
        )
        .on('postgres_changes', 
          { event: 'UPDATE', schema: 'public', table: 'orders' },
          () => loadDashboardStats()
        )
        .subscribe();
        
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    }
  };

  // Check authentication and role
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
              Owner Dashboard
            </h1>
            <p className="text-muted-foreground">Please sign in to access the owner dashboard</p>
          </div>
          <AuthForms onOperatorLogin={() => {}} />
        </div>
      </div>
    );
  }

  if (userRole !== 'owner') {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <h3 className="text-lg font-medium mb-2">Access Denied</h3>
              <p className="text-muted-foreground mb-4">You need owner privileges to access this dashboard.</p>
              <p className="text-sm text-muted-foreground mb-4">Current role: {userRole}</p>
              <Button onClick={signOut} variant="outline">
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (currentView === 'operators') {
    return <OperatorManagement onBack={() => setCurrentView('dashboard')} />;
  }

  if (currentView === 'service-areas') {
    return <ServiceAreasManagement onBack={() => setCurrentView('dashboard')} />;
  }

  if (currentView === 'shop') {
    return <ClothesShopManagement onBack={() => setCurrentView('dashboard')} />;
  }

  if (currentView === 'analytics') {
    return <AnalyticsDashboard onBack={() => setCurrentView('dashboard')} />;
  }

  if (currentView === 'all-operators') {
    return <AllOperatorsView onBack={() => setCurrentView('dashboard')} />;
  }

  if (currentView === 'promo-codes') {
    return <PromoCodeManagement onBack={() => setCurrentView('dashboard')} />;
  }

  if (currentView === 'promo-analytics') {
    return <PromoCodeManagement onBack={() => setCurrentView('dashboard')} initialView="reports" />;
  }

  if (currentView === 'live-order-management') {
    return <LiveOrderManagement onBack={() => setCurrentView('dashboard')} />;
  }

  if (currentView === 'order-issues') {
    return <OrderIssueTracking onBack={() => setCurrentView('dashboard')} />;
  }

  if (currentView === 'workload-balance') {
    return <OperatorWorkloadBalance onBack={() => setCurrentView('dashboard')} />;
  }

  if (currentView === 'user-management') {
    return (
      <div className="min-h-screen bg-gradient-wave">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={() => setCurrentView('dashboard')}
              className="p-0 h-auto text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
          
          <div className="mb-6">
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              User Management
            </h1>
            <p className="text-muted-foreground">
              Create and manage owner and marketing team members
            </p>
          </div>

          <UserManagement onBack={() => setCurrentView('dashboard')} />
        </div>
      </div>
    );
  }

  if (currentView === 'notifications') {
    return (
      <div className="min-h-screen bg-gradient-wave">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={() => setCurrentView('dashboard')}
              className="p-0 h-auto text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
          
          <div className="mb-6">
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Notification System
            </h1>
            <p className="text-muted-foreground">
              Test and monitor notification delivery
            </p>
          </div>

          <NotificationTesting />
        </div>
      </div>
    );
  }

  if (currentView === 'notification-templates') {
    return <NotificationTemplateManagement onBack={() => setCurrentView('dashboard')} />;
  }

  if (currentView === 'operator-payments') {
    return (
      <div className="min-h-screen bg-gradient-wave">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={() => setCurrentView('dashboard')}
              className="p-0 h-auto text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
          
          <div className="mb-6">
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Operator Payment Management
            </h1>
            <p className="text-muted-foreground">
              Manage hourly rates and per-order compensation for all operators
            </p>
          </div>

          <OperatorPaymentManagement />
        </div>
      </div>
    );
  }

  if (currentView === 'business-cut') {
    return (
      <div className="min-h-screen bg-gradient-wave">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={() => setCurrentView('dashboard')}
              className="p-0 h-auto text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
          
          <div className="mb-6">
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Business Cut Management
            </h1>
            <p className="text-muted-foreground">
              Configure revenue splits, pricing, and business analytics
            </p>
          </div>

          <BusinessCutManagement />
        </div>
      </div>
    );
  }

  if (currentView === 'customer-management') {
    return <CustomerManagement onBack={() => setCurrentView('dashboard')} />;
  }

  if (currentView === 'live-orders') {
    return (
      <div className="min-h-screen bg-gradient-wave">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={() => setCurrentView('dashboard')}
              className="p-0 h-auto text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
          
          <div className="mb-6">
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Live Orders
            </h1>
            <p className="text-muted-foreground">
              Orders currently in progress (excluding completed/cancelled)
            </p>
          </div>

          <div className="space-y-4">
            {liveOrders.length === 0 ? (
              <Card className="p-8 text-center">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No live orders found</h3>
                <p className="text-muted-foreground">Live orders will appear here when customers place them.</p>
              </Card>
            ) : (
              liveOrders.map((order) => (
                <Card key={order.id} className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold">Order #{order.id.slice(0, 8)}</h3>
                      <p className="text-sm text-muted-foreground">
                        Status: <Badge variant="outline">{order.status}</Badge>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Zip: {order.zip_code} • {order.pickup_type}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-600">
                        ${(order.total_amount_cents / 100).toFixed(2)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p><strong>Service:</strong> {order.service_type}</p>
                      <p><strong>Bags:</strong> {order.bag_count}</p>
                    </div>
                    <div>
                      <p><strong>Express:</strong> {order.is_express ? 'Yes' : 'No'}</p>
                      <p><strong>Washer ID:</strong> {order.washer_id || 'Unassigned'}</p>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  if (currentView === 'order-history') {
    return (
      <div className="min-h-screen bg-gradient-wave">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={() => setCurrentView('dashboard')}
              className="p-0 h-auto text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
          
          <div className="mb-6">
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Order History
            </h1>
            <p className="text-muted-foreground">
              Completed and cancelled orders
            </p>
          </div>

          <div className="space-y-4">
            {completedOrders.length === 0 ? (
              <Card className="p-8 text-center">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No completed orders found</h3>
                <p className="text-muted-foreground">Completed orders will appear here.</p>
              </Card>
            ) : (
              completedOrders.map((order) => (
                <Card key={order.id} className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold">Order #{order.id.slice(0, 8)}</h3>
                      <p className="text-sm text-muted-foreground">
                        Status: <Badge variant={order.status === 'completed' ? 'default' : 'destructive'}>{order.status}</Badge>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Zip: {order.zip_code} • {order.pickup_type}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-600">
                        ${(order.total_amount_cents / 100).toFixed(2)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {order.completed_at ? new Date(order.completed_at).toLocaleDateString() : new Date(order.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p><strong>Service:</strong> {order.service_type}</p>
                      <p><strong>Bags:</strong> {order.bag_count}</p>
                    </div>
                    <div>
                      <p><strong>Express:</strong> {order.is_express ? 'Yes' : 'No'}</p>
                      <p><strong>Washer ID:</strong> {order.washer_id || 'Unassigned'}</p>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-wave">
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <div className="mb-4 sm:mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="p-0 h-auto text-muted-foreground hover:text-foreground text-sm"
          >
            <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            Exit Dashboard
          </Button>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 sm:mb-8 gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Owner Dashboard
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Complete system management and control
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <Badge variant="secondary" className="px-2 sm:px-3 py-1 text-xs sm:text-sm">
              <Shield className="h-2 w-2 sm:h-3 sm:w-3 mr-1" />
              Owner Access
            </Badge>
          </div>
        </div>

        {/* Financial Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6">
          <Card className="border-0 shadow-soft">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-xs text-muted-foreground hidden sm:block">All customer payments</p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold">${(stats.totalRevenue / 100).toFixed(2)}</p>
                </div>
                <TrendingUp className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-success" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-soft">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">FreshDrop Pay</p>
                  <p className="text-xs text-muted-foreground hidden sm:block">Business cut (50%)</p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-primary">${(stats.freshDropPay / 100).toFixed(2)}</p>
                </div>
                <TrendingUp className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-soft sm:col-span-2 lg:col-span-1">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Operator Pay</p>
                  <p className="text-xs text-muted-foreground hidden sm:block">Washer payouts (50%)</p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-accent">${(stats.operatorPay / 100).toFixed(2)}</p>
                </div>
                <Users className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-accent" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Operational Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
          <Card className="border-0 shadow-soft">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Total Orders</p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold">{stats.totalOrders}</p>
                </div>
                <Package className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-soft">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Active Operators</p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold">{stats.activeOperators}</p>
                  {(stats.pendingApprovals > 0 || stats.pendingApplications > 0) && (
                    <p className="text-xs text-yellow-600 font-medium">
                      {stats.pendingApplications > 0 && `${stats.pendingApplications} new apps`}
                      {stats.pendingApplications > 0 && stats.pendingApprovals > 0 && ', '}
                      {stats.pendingApprovals > 0 && `${stats.pendingApprovals} pending`}
                    </p>
                  )}
                </div>
                <Users className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-accent" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-soft sm:col-span-2 lg:col-span-1">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Lockers Online</p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold">{stats.activeLockers}/{stats.totalLockers}</p>
                </div>
                <MapPin className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-secondary" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Management Sections */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
          <Card className="border-0 shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Manage Operators
                {(stats.pendingApprovals > 0 || stats.pendingApplications > 0) && (
                  <Badge variant="outline" className="ml-auto text-yellow-600 border-yellow-600">
                    {stats.pendingApplications + stats.pendingApprovals} pending
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Review applications, invite and manage operators
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button 
                  variant="hero" 
                  className="w-full"
                  onClick={() => setCurrentView('operators')}
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Manage Operators
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setCurrentView('all-operators')}
                >
                  View All Operators
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-accent" />
                Service Areas
              </CardTitle>
              <CardDescription>
                Manage zip codes and service capabilities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button 
                  variant="hero" 
                  className="w-full"
                  onClick={() => setCurrentView('service-areas')}
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Manage Service Areas
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setCurrentView('service-areas')}
                >
                  View Coverage Map
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-secondary" />
                Order Overview
              </CardTitle>
              <CardDescription>
                Monitor all system orders
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setCurrentView('live-orders')}
                >
                  Live Orders ({liveOrders.length})
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setCurrentView('order-history')}
                >
                  Order History ({completedOrders.length})
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-muted-foreground" />
                Clothes Shop
              </CardTitle>
              <CardDescription>
                Manage items and pricing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setCurrentView('shop')}
                >
                  Edit Items
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setCurrentView('shop')}
                >
                  Update Pricing
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Analytics
              </CardTitle>
              <CardDescription>
                View performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setCurrentView('analytics')}
                >
                  Performance Dashboard
                </Button>
                <Button variant="outline" className="w-full">
                  Export Reports
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-green-600" />
                Promo Codes
              </CardTitle>
              <CardDescription>
                Create and manage discount codes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setCurrentView('promo-codes')}
                >
                  Manage Codes
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setCurrentView('promo-analytics')}
                >
                  Usage Analytics
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                User Management
              </CardTitle>
              <CardDescription>
                Create owner and marketing profiles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button 
                  variant="hero" 
                  className="w-full"
                  onClick={() => setCurrentView('user-management')}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Manage Users
                </Button>
                <Button variant="outline" className="w-full">
                  View Team Members
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-orange-500" />
                Notification System
              </CardTitle>
              <CardDescription>
                Test and monitor notification delivery
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button 
                  variant="hero" 
                  className="w-full"
                  onClick={() => setCurrentView('notifications')}
                >
                  <Bell className="h-4 w-4 mr-2" />
                  Test Notifications
                </Button>
                <Button variant="outline" className="w-full">
                  View Logs
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-blue-500" />
                Notification Templates
              </CardTitle>
              <CardDescription>
                Customize email and SMS notification messages
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button 
                  variant="hero" 
                  className="w-full"
                  onClick={() => setCurrentView('notification-templates')}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Edit Templates
                </Button>
                <Button variant="outline" className="w-full">
                  Preview Messages
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                Operator Payments
              </CardTitle>
              <CardDescription>
                Manage hourly rates and per-order compensation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button 
                  variant="hero" 
                  className="w-full"
                  onClick={() => setCurrentView('operator-payments')}
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  Manage Payments
                </Button>
                <Button variant="outline" className="w-full">
                  Payment Reports
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-success" />
                Business Cut & Revenue
              </CardTitle>
              <CardDescription>
                Manage revenue splits and pricing structure
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button 
                  variant="hero" 
                  className="w-full"
                  onClick={() => setCurrentView('business-cut')}
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Manage Business Cut
                </Button>
                <Button variant="outline" className="w-full">
                  Revenue Analytics
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-accent" />
                Customer Management
              </CardTitle>
              <CardDescription>
                View and manage customers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setCurrentView('customer-management')}
                >
                  Customer List
                </Button>
                <Button variant="outline" className="w-full">
                  Support Tickets
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
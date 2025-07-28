import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OperatorManagement } from "@/components/admin/OperatorManagement";
import { ServiceAreasManagement } from "@/components/admin/ServiceAreasManagement";
import { ClothesShopManagement } from "@/components/admin/ClothesShopManagement";
import { AnalyticsDashboard } from "@/components/admin/AnalyticsDashboard";
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
  ArrowLeft
} from "lucide-react";

export function OwnerDashboard() {
  const { user, userRole, signOut } = useAuth();
  const [currentView, setCurrentView] = useState<'dashboard' | 'operators' | 'service-areas' | 'shop' | 'analytics'>('dashboard');
  const [stats, setStats] = useState({
    totalOrders: 0,
    activeOperators: 0,
    pendingApprovals: 0,
    totalLockers: 0,
    activeLockers: 0,
    totalRevenue: 0
  });

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      // Get total orders count
      const { count: ordersCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true });

      // Get total revenue (sum of all completed orders)
      const { data: revenueData } = await supabase
        .from('orders')
        .select('total_amount_cents')
        .eq('status', 'completed');

      const totalRevenue = revenueData?.reduce((sum, order) => sum + (order.total_amount_cents || 0), 0) || 0;

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
        totalLockers: totalLockersCount || 0,
        activeLockers: activeLockersCount || 0,
        totalRevenue: totalRevenue
      });

      // Set up real-time subscription for pending approvals
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
        
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Owner Dashboard
            </h1>
            <p className="text-muted-foreground">
              Complete system management and control
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="secondary" className="px-3 py-1">
              <Shield className="h-3 w-3 mr-1" />
              Owner Access
            </Badge>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="border-0 shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Orders</p>
                  <p className="text-2xl font-bold">{stats.totalOrders}</p>
                </div>
                <Package className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Operators</p>
                  <p className="text-2xl font-bold">{stats.activeOperators}</p>
                  {stats.pendingApprovals > 0 && (
                    <p className="text-xs text-yellow-600 font-medium">
                      +{stats.pendingApprovals} pending approval
                    </p>
                  )}
                </div>
                <Users className="h-8 w-8 text-accent" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Lockers Online</p>
                  <p className="text-2xl font-bold">{stats.activeLockers}/{stats.totalLockers}</p>
                </div>
                <MapPin className="h-8 w-8 text-secondary" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Revenue</p>
                  <p className="text-2xl font-bold">${(stats.totalRevenue / 100).toFixed(2)}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-success" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Management Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="border-0 shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Manage Operators
                {stats.pendingApprovals > 0 && (
                  <Badge variant="outline" className="ml-auto text-yellow-600 border-yellow-600">
                    {stats.pendingApprovals} pending
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Invite, approve, and manage operators
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
                <Button variant="outline" className="w-full">
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
                <Button variant="outline" className="w-full">
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
                <Button variant="outline" className="w-full">
                  Live Orders
                </Button>
                <Button variant="outline" className="w-full">
                  Order History
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
                <Button variant="outline" className="w-full">
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
                <Users className="h-5 w-5 text-accent" />
                Customer Management
              </CardTitle>
              <CardDescription>
                View and manage customers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button variant="outline" className="w-full">
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
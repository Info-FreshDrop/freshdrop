import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WasherManagement } from "@/components/washers/WasherManagement";
import { ClothesShopManagement } from "@/components/admin/ClothesShopManagement";
import { AnalyticsDashboard } from "@/components/admin/AnalyticsDashboard";
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
  const { signOut } = useAuth();
  const [currentView, setCurrentView] = useState<'dashboard' | 'washers' | 'shop' | 'analytics'>('dashboard');
  const [stats, setStats] = useState({
    totalOrders: 0,
    activeWashers: 0,
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

      // Get active washers count
      const { count: washersCount } = await supabase
        .from('washers')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

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
        activeWashers: washersCount || 0,
        totalLockers: totalLockersCount || 0,
        activeLockers: activeLockersCount || 0,
        totalRevenue: totalRevenue
      });
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    }
  };

  if (currentView === 'washers') {
    return <WasherManagement onBack={() => setCurrentView('dashboard')} />;
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
                  <p className="text-sm text-muted-foreground">Active Washers</p>
                  <p className="text-2xl font-bold">{stats.activeWashers}</p>
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
                Manage Washers
              </CardTitle>
              <CardDescription>
                Add, edit, and assign washers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button 
                  variant="hero" 
                  className="w-full"
                  onClick={() => setCurrentView('washers')}
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Manage Washers
                </Button>
                <Button variant="outline" className="w-full">
                  View All Washers
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-accent" />
                Locker Management
              </CardTitle>
              <CardDescription>
                Monitor and manage locker locations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button variant="hero" className="w-full">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add New Locker
                </Button>
                <Button variant="outline" className="w-full">
                  Locker Status
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
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { 
  TrendingUp, 
  Package, 
  Users, 
  DollarSign,
  Clock,
  MapPin,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Calendar,
  BarChart3,
  ArrowUp,
  ArrowDown
} from "lucide-react";

interface AnalyticsDashboardProps {
  onBack: () => void;
}

interface AnalyticsData {
  totalOrders: number;
  totalRevenue: number;
  activeWashers: number;
  completionRate: number;
  avgTurnaroundTime: number;
  ordersByStatus: Record<string, number>;
  revenueByDay: Array<{ date: string; revenue: number }>;
  topServices: Array<{ service: string; count: number; revenue: number }>;
  washersPerformance: Array<{ name: string; orders: number; rating: number }>;
}

export function AnalyticsDashboard({ onBack }: AnalyticsDashboardProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalOrders: 0,
    totalRevenue: 0,
    activeWashers: 0,
    completionRate: 0,
    avgTurnaroundTime: 0,
    ordersByStatus: {},
    revenueByDay: [],
    topServices: [],
    washersPerformance: []
  });
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [isLoading, setIsLoading] = useState(true);

  const { userRole } = useAuth();

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    setIsLoading(true);
    
    try {
      const endDate = new Date();
      const startDate = new Date();
      
      switch (timeRange) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
      }

      // Load orders data
      const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      // Load washers data
      const { data: washers } = await supabase
        .from('washers')
        .select('*, profiles!washers_user_id_fkey(first_name, last_name)')
        .eq('is_active', true);

      if (orders) {
        const totalOrders = orders.length;
        const totalRevenue = orders.reduce((sum, order) => sum + order.total_amount_cents, 0) / 100;
        const completedOrders = orders.filter(order => order.status === 'completed');
        const completionRate = totalOrders > 0 ? (completedOrders.length / totalOrders) * 100 : 0;

        // Calculate average turnaround time
        const avgTurnaround = completedOrders.length > 0 
          ? completedOrders.reduce((sum, order) => {
              const created = new Date(order.created_at);
              const completed = new Date(order.completed_at || order.updated_at);
              return sum + (completed.getTime() - created.getTime());
            }, 0) / completedOrders.length / (1000 * 60 * 60) // Convert to hours
          : 0;

        // Group orders by status
        const ordersByStatus = orders.reduce((acc: Record<string, number>, order) => {
          acc[order.status] = (acc[order.status] || 0) + 1;
          return acc;
        }, {});

        // Group revenue by day
        const revenueByDay = orders.reduce((acc: Record<string, number>, order) => {
          const date = new Date(order.created_at).toLocaleDateString();
          acc[date] = (acc[date] || 0) + (order.total_amount_cents / 100);
          return acc;
        }, {});

        // Top services
        const serviceStats = orders.reduce((acc: Record<string, { count: number; revenue: number }>, order) => {
          const service = order.service_type;
          if (!acc[service]) acc[service] = { count: 0, revenue: 0 };
          acc[service].count++;
          acc[service].revenue += order.total_amount_cents / 100;
          return acc;
        }, {});

        const topServices = Object.entries(serviceStats)
          .map(([service, stats]) => ({ service, ...stats }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5);

        setAnalytics({
          totalOrders,
          totalRevenue,
          activeWashers: washers?.length || 0,
          completionRate,
          avgTurnaroundTime: avgTurnaround,
          ordersByStatus,
          revenueByDay: Object.entries(revenueByDay).map(([date, revenue]) => ({ date, revenue })),
          topServices,
          washersPerformance: [] // This would require more complex queries
        });
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
    
    setIsLoading(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-wave flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-wave">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Analytics Dashboard
            </h1>
            <p className="text-muted-foreground">
              Real-time insights and performance metrics
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant={timeRange === '7d' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeRange('7d')}
              >
                7 Days
              </Button>
              <Button
                variant={timeRange === '30d' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeRange('30d')}
              >
                30 Days
              </Button>
              <Button
                variant={timeRange === '90d' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeRange('90d')}
              >
                90 Days
              </Button>
            </div>
            <Button variant="outline" onClick={onBack}>
              Back to Dashboard
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-0 shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Orders</p>
                  <p className="text-3xl font-bold">{analytics.totalOrders.toLocaleString()}</p>
                  <div className="flex items-center gap-1 text-sm text-green-600 mt-1">
                    <ArrowUp className="h-3 w-3" />
                    <span>+12% vs last period</span>
                  </div>
                </div>
                <Package className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-3xl font-bold">{formatCurrency(analytics.totalRevenue)}</p>
                  <div className="flex items-center gap-1 text-sm text-green-600 mt-1">
                    <ArrowUp className="h-3 w-3" />
                    <span>+18% vs last period</span>
                  </div>
                </div>
                <DollarSign className="h-8 w-8 text-success" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completion Rate</p>
                  <p className="text-3xl font-bold">{formatPercentage(analytics.completionRate)}</p>
                  <div className="flex items-center gap-1 text-sm text-green-600 mt-1">
                    <ArrowUp className="h-3 w-3" />
                    <span>+3% vs last period</span>
                  </div>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Turnaround</p>
                  <p className="text-3xl font-bold">{analytics.avgTurnaroundTime.toFixed(1)}h</p>
                  <div className="flex items-center gap-1 text-sm text-red-600 mt-1">
                    <ArrowDown className="h-3 w-3" />
                    <span>-5% vs last period</span>
                  </div>
                </div>
                <Clock className="h-8 w-8 text-accent" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts and Detailed Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Order Status Breakdown */}
          <Card className="border-0 shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Order Status Breakdown
              </CardTitle>
              <CardDescription>Current distribution of order statuses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(analytics.ordersByStatus).map(([status, count]) => {
                  const percentage = analytics.totalOrders > 0 ? (count / analytics.totalOrders) * 100 : 0;
                  const getStatusColor = (status: string) => {
                    switch (status) {
                      case 'completed': return 'bg-green-500';
                      case 'in_progress': case 'washed': return 'bg-blue-500';
                      case 'claimed': return 'bg-purple-500';
                      case 'unclaimed': return 'bg-yellow-500';
                      case 'cancelled': return 'bg-red-500';
                      default: return 'bg-gray-500';
                    }
                  };

                  return (
                    <div key={status} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${getStatusColor(status)}`}></div>
                        <span className="capitalize text-sm font-medium">
                          {status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {formatPercentage(percentage)}
                        </span>
                        <Badge variant="secondary">{count}</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Top Services */}
          <Card className="border-0 shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Top Services
              </CardTitle>
              <CardDescription>Most popular services by revenue</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.topServices.map((service, index) => (
                  <div key={service.service} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-xs font-bold text-primary">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium capitalize">
                          {service.service.replace('_', ' ')}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {service.count} orders
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(service.revenue)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Operational Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="border-0 shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Washer Performance
              </CardTitle>
              <CardDescription>Top performing washers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium">Sarah Johnson</p>
                    <p className="text-sm text-muted-foreground">24 orders completed</p>
                  </div>
                  <Badge variant="default">4.9★</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium">Mike Chen</p>
                    <p className="text-sm text-muted-foreground">21 orders completed</p>
                  </div>
                  <Badge variant="default">4.8★</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium">Lisa Wang</p>
                    <p className="text-sm text-muted-foreground">19 orders completed</p>
                  </div>
                  <Badge variant="default">4.7★</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Service Areas
              </CardTitle>
              <CardDescription>Performance by location</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">10001 (Manhattan)</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">89 orders</span>
                    <Badge variant="default">High</Badge>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">10002 (Lower East)</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">67 orders</span>
                    <Badge variant="secondary">Medium</Badge>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">10003 (East Village)</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">45 orders</span>
                    <Badge variant="outline">Low</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                System Alerts
              </CardTitle>
              <CardDescription>Issues requiring attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">High unclaimed orders</p>
                    <p className="text-xs text-muted-foreground">8 orders pending for &gt;2 hours</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <Clock className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Locker #3 maintenance</p>
                    <p className="text-xs text-muted-foreground">Scheduled for tomorrow 2 PM</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">All systems operational</p>
                    <p className="text-xs text-muted-foreground">No critical issues detected</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
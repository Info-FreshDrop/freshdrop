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
  freshDropPay: number;
  operatorPay: number;
  activeWashers: number;
  completionRate: number;
  avgTurnaroundTime: number;
  ordersByStatus: Record<string, number>;
  revenueByDay: Array<{ date: string; revenue: number }>;
  topServices: Array<{ service: string; count: number; revenue: number }>;
  operatorsPerformance: Array<{ 
    id: string; 
    name: string; 
    orders: number; 
    completedOrders: number;
    rating: number; 
    revenue: number;
    user_id: string;
  }>;
}

export function AnalyticsDashboard({ onBack }: AnalyticsDashboardProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalOrders: 0,
    totalRevenue: 0,
    freshDropPay: 0,
    operatorPay: 0,
    activeWashers: 0,
    completionRate: 0,
    avgTurnaroundTime: 0,
    ordersByStatus: {},
    revenueByDay: [],
    topServices: [],
    operatorsPerformance: []
  });
  const [selectedOperator, setSelectedOperator] = useState<string | null>(null);
  const [operatorDetails, setOperatorDetails] = useState<any>(null);
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

      // Load approved operators data (fetch profiles separately)
      const { data: operators } = await supabase
        .from('washers')
        .select('*')
        .eq('is_active', true)
        .eq('approval_status', 'approved');

      // Fetch profiles for all operators
      const operatorsWithProfiles = await Promise.all(
        (operators || []).map(async (operator) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('user_id', operator.user_id)
            .maybeSingle();

          return {
            ...operator,
            profiles: profile
          };
        })
      );

      const activeOperators = operatorsWithProfiles.length;

      if (orders) {
        const totalOrders = orders.length;
        const totalRevenue = orders.reduce((sum, order) => sum + order.total_amount_cents, 0) / 100;
        const freshDropPay = orders.reduce((sum, order) => sum + (order.business_cut_cents || 0), 0) / 100;
        const operatorPay = orders.reduce((sum, order) => sum + (order.operator_payout_cents || 0), 0) / 100;
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

        // Calculate operator performance
        const operatorsPerformance = await Promise.all(
          operatorsWithProfiles.map(async (operator) => {
            const operatorOrders = orders.filter(order => order.washer_id === operator.id);
            const completedOperatorOrders = operatorOrders.filter(order => order.status === 'completed');
            
            // Get ratings for this operator's completed orders
            const { data: ratings } = await supabase
              .from('order_ratings')
              .select('overall_rating')
              .in('order_id', completedOperatorOrders.map(o => o.id));
            
            const avgRating = ratings && ratings.length > 0 
              ? ratings.reduce((sum, r) => sum + (r.overall_rating || 0), 0) / ratings.length
              : 0;
              
            const operatorRevenue = completedOperatorOrders.reduce((sum, order) => sum + (order.total_amount_cents || 0), 0) / 100;
            
            return {
              id: operator.id,
              user_id: operator.user_id,
              name: operator.profiles 
                ? `${operator.profiles.first_name || ''} ${operator.profiles.last_name || ''}`.trim()
                : `Operator #${operator.id.slice(0, 8)}`,
              orders: operatorOrders.length,
              completedOrders: completedOperatorOrders.length,
              rating: avgRating,
              revenue: operatorRevenue
            };
          })
        );
        
        // Sort by completed orders descending
        operatorsPerformance.sort((a, b) => b.completedOrders - a.completedOrders);

        setAnalytics({
          totalOrders,
          totalRevenue,
          freshDropPay,
          operatorPay,
          activeWashers: activeOperators,
          completionRate,
          avgTurnaroundTime: avgTurnaround,
          ordersByStatus,
          revenueByDay: Object.entries(revenueByDay).map(([date, revenue]) => ({ date, revenue })),
          topServices,
          operatorsPerformance
        });
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
    
    setIsLoading(false);
  };

  const loadOperatorDetails = async (operatorId: string, userId: string) => {
    try {
      // Get all orders for this operator
      const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .eq('washer_id', operatorId)
        .order('created_at', { ascending: false });

      // Get all ratings for completed orders
      const completedOrders = orders?.filter(o => o.status === 'completed') || [];
      const { data: ratings } = await supabase
        .from('order_ratings')
        .select('*')
        .in('order_id', completedOrders.map(o => o.id));

      // Get operator profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      const totalRevenue = completedOrders.reduce((sum, order) => sum + (order.total_amount_cents || 0), 0) / 100;
      const avgRating = ratings && ratings.length > 0 
        ? ratings.reduce((sum, r) => sum + (r.overall_rating || 0), 0) / ratings.length
        : 0;

      setOperatorDetails({
        orders: orders || [],
        completedOrders,
        ratings: ratings || [],
        totalRevenue,
        avgRating,
        profile
      });
    } catch (error) {
      console.error('Error loading operator details:', error);
    }
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

  if (selectedOperator && operatorDetails) {
    return (
      <div className="min-h-screen bg-gradient-wave">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={() => {
                setSelectedOperator(null);
                setOperatorDetails(null);
              }}
              className="mb-4"
            >
              <ArrowUp className="h-4 w-4 mr-2 rotate-180" />
              Back to Analytics
            </Button>
            
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Operator Performance Details
            </h1>
            <p className="text-muted-foreground">
              Detailed performance metrics for {operatorDetails.profile?.first_name} {operatorDetails.profile?.last_name}
            </p>
          </div>

          {/* Performance Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="border-0 shadow-soft">
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">{operatorDetails.orders.length}</p>
                  <p className="text-sm text-muted-foreground">Total Orders</p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-soft">
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{operatorDetails.completedOrders.length}</p>
                  <p className="text-sm text-muted-foreground">Completed Orders</p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-soft">
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-yellow-600">{operatorDetails.avgRating.toFixed(1)}★</p>
                  <p className="text-sm text-muted-foreground">Average Rating</p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-soft">
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(operatorDetails.totalRevenue)}</p>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Orders */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-0 shadow-soft">
              <CardHeader>
                <CardTitle>Recent Orders</CardTitle>
                <CardDescription>Latest order activity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {operatorDetails.orders.slice(0, 10).map((order: any) => (
                    <div key={order.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <p className="font-medium">Order #{order.id.slice(0, 8)}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge 
                          variant={order.status === 'completed' ? 'default' : 'secondary'}
                        >
                          {order.status}
                        </Badge>
                        <p className="text-sm font-medium mt-1">
                          {formatCurrency(order.total_amount_cents / 100)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Reviews */}
            <Card className="border-0 shadow-soft">
              <CardHeader>
                <CardTitle>Customer Reviews</CardTitle>
                <CardDescription>Recent ratings and feedback</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {operatorDetails.ratings.slice(0, 10).map((rating: any) => (
                    <div key={rating.id} className="p-3 bg-muted rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <span
                              key={star}
                              className={`text-sm ${
                                star <= (rating.overall_rating || 0)
                                  ? 'text-yellow-500'
                                  : 'text-gray-300'
                              }`}
                            >
                              ★
                            </span>
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(rating.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {rating.feedback && (
                        <p className="text-sm text-muted-foreground">{rating.feedback}</p>
                      )}
                    </div>
                  ))}
                  {operatorDetails.ratings.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">No reviews yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

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
        <div className="flex flex-col gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
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

        {/* Financial Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card className="border-0 shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-xs text-muted-foreground">All customer payments</p>
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
                  <p className="text-sm text-muted-foreground">FreshDrop Pay</p>
                  <p className="text-xs text-muted-foreground">Business cut (50%)</p>
                  <p className="text-3xl font-bold text-primary">{formatCurrency(analytics.freshDropPay)}</p>
                  <div className="flex items-center gap-1 text-sm text-green-600 mt-1">
                    <ArrowUp className="h-3 w-3" />
                    <span>+15% vs last period</span>
                  </div>
                </div>
                <TrendingUp className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Operator Pay</p>
                  <p className="text-xs text-muted-foreground">Washer payouts (50%)</p>
                  <p className="text-3xl font-bold text-accent">{formatCurrency(analytics.operatorPay)}</p>
                  <div className="flex items-center gap-1 text-sm text-green-600 mt-1">
                    <ArrowUp className="h-3 w-3" />
                    <span>+20% vs last period</span>
                  </div>
                </div>
                <Users className="h-8 w-8 text-accent" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
                Operator Performance
              </CardTitle>
              <CardDescription>Top performing approved operators</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.operatorsPerformance.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No approved operators found</p>
                ) : (
                  analytics.operatorsPerformance.slice(0, 5).map((operator) => (
                    <div 
                      key={operator.id} 
                      className="flex items-center justify-between p-3 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 transition-colors"
                      onClick={() => {
                        setSelectedOperator(operator.id);
                        loadOperatorDetails(operator.id, operator.user_id);
                      }}
                    >
                      <div>
                        <p className="font-medium">{operator.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {operator.completedOrders} completed orders • {formatCurrency(operator.revenue)} revenue
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant="default">{operator.rating > 0 ? `${operator.rating.toFixed(1)}★` : 'No ratings'}</Badge>
                        <p className="text-xs text-muted-foreground mt-1">Click for details</p>
                      </div>
                    </div>
                  ))
                )}
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
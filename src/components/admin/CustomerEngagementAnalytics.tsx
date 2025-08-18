import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users, Clock, TrendingUp, Calendar as CalendarIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CustomerEngagementProps {
  onBack: () => void;
}

interface EngagementData {
  totalCustomers: number;
  activeCustomers: number;
  newCustomers: number;
  averageOrderValue: number;
  repeatCustomerRate: number;
  lastOrderDate: string;
}

export function CustomerEngagementAnalytics({ onBack }: CustomerEngagementProps) {
  const [engagementData, setEngagementData] = useState<EngagementData>({
    totalCustomers: 0,
    activeCustomers: 0,
    newCustomers: 0,
    averageOrderValue: 0,
    repeatCustomerRate: 0,
    lastOrderDate: ''
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadEngagementData();
  }, []);

  const loadEngagementData = async () => {
    try {
      setLoading(true);
      
      // Get total customers with customer role
      const { data: customers, error: customersError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'customer');

      if (customersError) throw customersError;

      // Get orders data for engagement metrics
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('customer_id, total_amount_cents, created_at')
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      // Calculate metrics
      const totalCustomers = customers?.length || 0;
      
      // Get unique customers who have ordered in last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentOrders = orders?.filter(order => 
        new Date(order.created_at) > thirtyDaysAgo
      ) || [];
      
      const activeCustomerIds = new Set(recentOrders.map(order => order.customer_id));
      const activeCustomers = activeCustomerIds.size;

      // Get new customers (first order in last 30 days)
      const customerFirstOrders = new Map();
      orders?.forEach(order => {
        const customerId = order.customer_id;
        const orderDate = new Date(order.created_at);
        
        if (!customerFirstOrders.has(customerId) || orderDate < customerFirstOrders.get(customerId)) {
          customerFirstOrders.set(customerId, orderDate);
        }
      });

      const newCustomers = Array.from(customerFirstOrders.values())
        .filter(date => date > thirtyDaysAgo).length;

      // Calculate average order value
      const totalRevenue = orders?.reduce((sum, order) => sum + order.total_amount_cents, 0) || 0;
      const averageOrderValue = orders?.length ? totalRevenue / orders.length / 100 : 0;

      // Calculate repeat customer rate
      const customerOrderCounts = new Map();
      orders?.forEach(order => {
        const count = customerOrderCounts.get(order.customer_id) || 0;
        customerOrderCounts.set(order.customer_id, count + 1);
      });

      const repeatCustomers = Array.from(customerOrderCounts.values())
        .filter(count => count > 1).length;
      const repeatCustomerRate = totalCustomers > 0 ? (repeatCustomers / totalCustomers) * 100 : 0;

      const lastOrderDate = orders?.[0]?.created_at || '';

      setEngagementData({
        totalCustomers,
        activeCustomers,
        newCustomers,
        averageOrderValue,
        repeatCustomerRate,
        lastOrderDate
      });

    } catch (error) {
      console.error('Error loading engagement data:', error);
      toast({
        title: "Error",
        description: "Failed to load customer engagement data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-wave">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <Button
              variant="ghost"
              onClick={onBack}
              className="p-0 h-auto text-muted-foreground hover:text-foreground mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Marketing Dashboard
            </Button>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Customer Engagement Analytics
            </h1>
            <p className="text-muted-foreground">
              Track customer behavior and engagement metrics
            </p>
          </div>
          <Badge variant="secondary" className="px-3 py-1">
            <Users className="h-3 w-3 mr-1" />
            Engagement Data
          </Badge>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-muted-foreground mt-2">Loading engagement data...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              <Card className="border-0 shadow-soft">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Customers</p>
                      <p className="text-2xl font-bold">{engagementData.totalCustomers.toLocaleString()}</p>
                    </div>
                    <Users className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-soft">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Active (30 days)</p>
                      <p className="text-2xl font-bold">{engagementData.activeCustomers.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">
                        {engagementData.totalCustomers > 0 
                          ? `${((engagementData.activeCustomers / engagementData.totalCustomers) * 100).toFixed(1)}% of total`
                          : '0% of total'
                        }
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-accent" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-soft">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">New Customers</p>
                      <p className="text-2xl font-bold">{engagementData.newCustomers.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Last 30 days</p>
                    </div>
                    <Users className="h-8 w-8 text-secondary" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-soft">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Avg Order Value</p>
                      <p className="text-2xl font-bold">${engagementData.averageOrderValue.toFixed(2)}</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-0 shadow-soft">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Customer Loyalty
                  </CardTitle>
                  <CardDescription>
                    Track repeat customer behavior
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Repeat Customer Rate</span>
                    <div className="text-right">
                      <span className="font-medium text-lg">{engagementData.repeatCustomerRate.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full" 
                      style={{ width: `${Math.min(engagementData.repeatCustomerRate, 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Customers who have made more than one order
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-soft">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-accent" />
                    Recent Activity
                  </CardTitle>
                  <CardDescription>
                    Latest customer engagement
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Last Order</span>
                    <span className="font-medium">
                      {engagementData.lastOrderDate 
                        ? new Date(engagementData.lastOrderDate).toLocaleDateString()
                        : 'No orders yet'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Active Customer %</span>
                    <span className="font-medium">
                      {engagementData.totalCustomers > 0 
                        ? `${((engagementData.activeCustomers / engagementData.totalCustomers) * 100).toFixed(1)}%`
                        : '0%'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Growth Rate</span>
                    <span className="font-medium text-green-600">
                      +{engagementData.newCustomers} this month
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
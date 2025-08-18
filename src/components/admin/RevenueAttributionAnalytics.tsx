import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, DollarSign, TrendingUp, Target, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface RevenueAttributionProps {
  onBack: () => void;
}

interface RevenueData {
  totalRevenue: number;
  campaignRevenue: number;
  promoCodeRevenue: number;
  organicRevenue: number;
  averageOrderValue: number;
  totalOrders: number;
  conversionRate: number;
}

interface CampaignRevenue {
  campaign_id: string;
  campaign_name: string;
  revenue: number;
  orders: number;
}

export function RevenueAttributionAnalytics({ onBack }: RevenueAttributionProps) {
  const [revenueData, setRevenueData] = useState<RevenueData>({
    totalRevenue: 0,
    campaignRevenue: 0,
    promoCodeRevenue: 0,
    organicRevenue: 0,
    averageOrderValue: 0,
    totalOrders: 0,
    conversionRate: 0
  });
  const [campaignBreakdown, setCampaignBreakdown] = useState<CampaignRevenue[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadRevenueData();
  }, []);

  const loadRevenueData = async () => {
    try {
      setLoading(true);
      
      // Get all orders with revenue data
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('total_amount_cents, promo_code, created_at')
        .eq('status', 'completed');

      if (ordersError) throw ordersError;

      // Get campaign analytics for attribution
      const { data: campaignAnalytics, error: analyticsError } = await supabase
        .from('campaign_analytics')
        .select(`
          campaign_id,
          revenue_cents,
          conversion_count,
          marketing_campaigns!inner(name)
        `);

      if (analyticsError) throw analyticsError;

      // Calculate revenue metrics
      const totalRevenue = orders?.reduce((sum, order) => sum + order.total_amount_cents, 0) || 0;
      const totalOrders = orders?.length || 0;
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Calculate promo code revenue (orders with promo codes)
      const promoCodeRevenue = orders
        ?.filter(order => order.promo_code)
        .reduce((sum, order) => sum + order.total_amount_cents, 0) || 0;

      // Calculate campaign-attributed revenue
      const campaignRevenue = campaignAnalytics
        ?.reduce((sum, analytics) => sum + (analytics.revenue_cents || 0), 0) || 0;

      // Organic revenue (not attributed to campaigns or promos)
      const organicRevenue = Math.max(0, totalRevenue - campaignRevenue - promoCodeRevenue);

      // Calculate conversion rate (placeholder - would need traffic data)
      const conversionRate = 2.4; // This should be calculated from actual traffic data

      // Create campaign breakdown
      const breakdown: CampaignRevenue[] = campaignAnalytics?.map(analytics => ({
        campaign_id: analytics.campaign_id,
        campaign_name: analytics.marketing_campaigns?.name || 'Unknown Campaign',
        revenue: analytics.revenue_cents || 0,
        orders: analytics.conversion_count || 0
      })) || [];

      setRevenueData({
        totalRevenue: totalRevenue / 100, // Convert to dollars
        campaignRevenue: campaignRevenue / 100,
        promoCodeRevenue: promoCodeRevenue / 100,
        organicRevenue: organicRevenue / 100,
        averageOrderValue: averageOrderValue / 100,
        totalOrders,
        conversionRate
      });

      setCampaignBreakdown(breakdown);

    } catch (error) {
      console.error('Error loading revenue data:', error);
      toast({
        title: "Error",
        description: "Failed to load revenue attribution data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getPercentage = (value: number, total: number) => {
    return total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
  };

  return (
    <div className="min-h-screen bg-gradient-wave">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col gap-4 mb-8">
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
              Revenue Attribution Analytics
            </h1>
            <p className="text-muted-foreground">
              Track revenue sources and marketing ROI
            </p>
          </div>
          <Badge variant="secondary" className="px-3 py-1">
            <DollarSign className="h-3 w-3 mr-1" />
            Revenue Data
          </Badge>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-muted-foreground mt-2">Loading revenue data...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Revenue Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              <Card className="border-0 shadow-soft">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Revenue</p>
                      <p className="text-2xl font-bold">${revenueData.totalRevenue.toFixed(2)}</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-soft">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Avg Order Value</p>
                      <p className="text-2xl font-bold">${revenueData.averageOrderValue.toFixed(2)}</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-accent" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-soft">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Orders</p>
                      <p className="text-2xl font-bold">{revenueData.totalOrders.toLocaleString()}</p>
                    </div>
                    <Target className="h-8 w-8 text-secondary" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-soft">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Conversion Rate</p>
                      <p className="text-2xl font-bold">{revenueData.conversionRate}%</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Revenue Attribution Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-0 shadow-soft">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    Revenue Attribution
                  </CardTitle>
                  <CardDescription>
                    Revenue breakdown by source
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Campaign Revenue</span>
                      <div className="text-right">
                        <span className="font-medium">${revenueData.campaignRevenue.toFixed(2)}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          ({getPercentage(revenueData.campaignRevenue, revenueData.totalRevenue)}%)
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full" 
                        style={{ width: `${getPercentage(revenueData.campaignRevenue, revenueData.totalRevenue)}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Promo Code Revenue</span>
                      <div className="text-right">
                        <span className="font-medium">${revenueData.promoCodeRevenue.toFixed(2)}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          ({getPercentage(revenueData.promoCodeRevenue, revenueData.totalRevenue)}%)
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div 
                        className="bg-accent h-2 rounded-full" 
                        style={{ width: `${getPercentage(revenueData.promoCodeRevenue, revenueData.totalRevenue)}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Organic Revenue</span>
                      <div className="text-right">
                        <span className="font-medium">${revenueData.organicRevenue.toFixed(2)}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          ({getPercentage(revenueData.organicRevenue, revenueData.totalRevenue)}%)
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div 
                        className="bg-secondary h-2 rounded-full" 
                        style={{ width: `${getPercentage(revenueData.organicRevenue, revenueData.totalRevenue)}%` }}
                      ></div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-soft">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-accent" />
                    Campaign Performance
                  </CardTitle>
                  <CardDescription>
                    Revenue by individual campaigns
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {campaignBreakdown.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-sm text-muted-foreground">No campaign revenue data available</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {campaignBreakdown.map((campaign, index) => (
                        <div key={campaign.campaign_id} className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                          <div>
                            <p className="font-medium text-sm">{campaign.campaign_name}</p>
                            <p className="text-xs text-muted-foreground">{campaign.orders} orders</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">${(campaign.revenue / 100).toFixed(2)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
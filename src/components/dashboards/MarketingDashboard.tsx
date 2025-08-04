import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NotificationSystem } from "@/components/admin/NotificationSystem";
import { PromoCodeManagement } from "@/components/admin/PromoCodeManagement";
import { AnalyticsDashboard } from "@/components/admin/AnalyticsDashboard";
import { EmailAnalyticsDashboard } from "@/components/admin/EmailAnalyticsDashboard";
import { CampaignPerformanceAnalytics } from "@/components/admin/CampaignPerformanceAnalytics";
import { CustomerEngagementAnalytics } from "@/components/admin/CustomerEngagementAnalytics";
import { RevenueAttributionAnalytics } from "@/components/admin/RevenueAttributionAnalytics";
import { ContentCalendarManagement } from "@/components/admin/ContentCalendarManagement";
import { CustomerSegmentsManagement } from "@/components/admin/CustomerSegmentsManagement";
import { MarketingCampaignManagement } from "@/components/admin/MarketingCampaignManagement";
import { BehavioralTriggersManagement } from "@/components/admin/BehavioralTriggersManagement";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Megaphone, 
  Mail, 
  Gift, 
  TrendingUp,
  PlusCircle,
  BarChart3,
  Calendar,
  Target,
  ArrowLeft
} from "lucide-react";

export function MarketingDashboard() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentView, setCurrentView] = useState<'dashboard' | 'notifications' | 'promos' | 'promos-create' | 'promos-reports' | 'analytics' | 'campaigns' | 'triggers' | 'email-analytics' | 'campaign-performance' | 'customer-engagement' | 'revenue-attribution' | 'content-calendar' | 'content-schedule' | 'content-library' | 'customer-segments' | 'segments-create' | 'segments-analytics'>('dashboard');
  const [stats, setStats] = useState({
    activeCampaigns: 0,
    emailOpenRate: 0,
    promoRedemptions: 0,
    conversionRate: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMarketingStats();
  }, []);

  const loadMarketingStats = async () => {
    try {
      setLoading(true);
      
      // Get active campaigns count
      const { data: campaigns, error: campaignsError } = await supabase
        .from('marketing_campaigns')
        .select('id')
        .eq('status', 'active');

      if (campaignsError) throw campaignsError;

      // Get email analytics
      const { data: analytics, error: analyticsError } = await supabase
        .from('campaign_analytics')
        .select('*');

      if (analyticsError) throw analyticsError;

      // Get promo code usage
      const { data: promoUsage, error: promoError } = await supabase
        .from('promo_code_usage')
        .select('id');

      if (promoError) throw promoError;

      // Calculate stats
      const activeCampaigns = campaigns?.length || 0;
      
      let emailOpenRate = 0;
      if (analytics && analytics.length > 0) {
        const totals = analytics.reduce((acc, record) => ({
          sent: acc.sent + (record.sent_count || 0),
          opened: acc.opened + (record.opened_count || 0),
          conversions: acc.conversions + (record.conversion_count || 0),
        }), { sent: 0, opened: 0, conversions: 0 });

        emailOpenRate = totals.sent > 0 ? (totals.opened / totals.sent) * 100 : 0;
      }

      const promoRedemptions = promoUsage?.length || 0;
      
      // For conversion rate, we'd need to track actual conversions vs total visitors
      // For now, using a placeholder calculation
      const conversionRate = 12.4; // This should be calculated from actual data

      setStats({
        activeCampaigns,
        emailOpenRate,
        promoRedemptions,
        conversionRate
      });
    } catch (error) {
      console.error('Error loading marketing stats:', error);
      toast({
        title: "Error",
        description: "Failed to load marketing statistics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (currentView === 'notifications') {
    return <NotificationSystem onBack={() => setCurrentView('dashboard')} />;
  }

  if (currentView === 'promos') {
    return <PromoCodeManagement onBack={() => setCurrentView('dashboard')} initialView="list" />;
  }

  if (currentView === 'promos-create') {
    return <PromoCodeManagement onBack={() => setCurrentView('dashboard')} initialView="create" />;
  }

  if (currentView === 'promos-reports') {
    return <PromoCodeManagement onBack={() => setCurrentView('dashboard')} initialView="reports" />;
  }

  if (currentView === 'analytics') {
    return <AnalyticsDashboard onBack={() => setCurrentView('dashboard')} />;
  }

  if (currentView === 'campaigns') {
    return <MarketingCampaignManagement onBack={() => setCurrentView('dashboard')} />;
  }

  if (currentView === 'triggers') {
    return <BehavioralTriggersManagement onBack={() => setCurrentView('dashboard')} />;
  }

  if (currentView === 'email-analytics') {
    return <EmailAnalyticsDashboard onBack={() => setCurrentView('dashboard')} />;
  }

  if (currentView === 'campaign-performance') {
    return <CampaignPerformanceAnalytics onBack={() => setCurrentView('dashboard')} />;
  }

  if (currentView === 'customer-engagement') {
    return <CustomerEngagementAnalytics onBack={() => setCurrentView('dashboard')} />;
  }

  if (currentView === 'revenue-attribution') {
    return <RevenueAttributionAnalytics onBack={() => setCurrentView('dashboard')} />;
  }

  if (currentView === 'content-calendar') {
    return <ContentCalendarManagement onBack={() => setCurrentView('dashboard')} initialView="calendar" />;
  }

  if (currentView === 'content-schedule') {
    return <ContentCalendarManagement onBack={() => setCurrentView('dashboard')} initialView="schedule" />;
  }

  if (currentView === 'content-library') {
    return <ContentCalendarManagement onBack={() => setCurrentView('dashboard')} initialView="library" />;
  }

  if (currentView === 'customer-segments') {
    return <CustomerSegmentsManagement onBack={() => setCurrentView('dashboard')} initialView="segments" />;
  }

  if (currentView === 'segments-create') {
    return <CustomerSegmentsManagement onBack={() => setCurrentView('dashboard')} initialView="create" />;
  }

  if (currentView === 'segments-analytics') {
    return <CustomerSegmentsManagement onBack={() => setCurrentView('dashboard')} initialView="analytics" />;
  }

  return (
    <div className="min-h-screen bg-gradient-wave">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Marketing Dashboard
            </h1>
            <p className="text-muted-foreground">
              Manage campaigns, promotions, and communications
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={() => navigate('/owner-dashboard')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Owner Dashboard
            </Button>
            <Badge variant="secondary" className="px-3 py-1">
              <Megaphone className="h-3 w-3 mr-1" />
              Marketing Access
            </Badge>
            <Button variant="outline" onClick={signOut}>
              Sign Out
            </Button>
          </div>
        </div>

        {/* Campaign Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="border-0 shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Campaigns</p>
                  <p className="text-2xl font-bold">
                    {loading ? (
                      <div className="animate-pulse bg-muted rounded h-8 w-12"></div>
                    ) : (
                      stats.activeCampaigns
                    )}
                  </p>
                </div>
                <Target className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Email Open Rate</p>
                  <p className="text-2xl font-bold">
                    {loading ? (
                      <div className="animate-pulse bg-muted rounded h-8 w-16"></div>
                    ) : (
                      `${stats.emailOpenRate.toFixed(1)}%`
                    )}
                  </p>
                </div>
                <Mail className="h-8 w-8 text-accent" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Promo Redemptions</p>
                  <p className="text-2xl font-bold">
                    {loading ? (
                      <div className="animate-pulse bg-muted rounded h-8 w-16"></div>
                    ) : (
                      stats.promoRedemptions
                    )}
                  </p>
                </div>
                <Gift className="h-8 w-8 text-secondary" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Conversion Rate</p>
                  <p className="text-2xl font-bold">
                    {loading ? (
                      <div className="animate-pulse bg-muted rounded h-8 w-16"></div>
                    ) : (
                      `${stats.conversionRate}%`
                    )}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-success" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Marketing Tools */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="border-0 shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                Email Campaigns
              </CardTitle>
              <CardDescription>
                Create and manage email marketing campaigns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button 
                  variant="hero" 
                  className="w-full"
                  onClick={() => setCurrentView('campaigns')}
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Manage Campaigns
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setCurrentView('triggers')}
                >
                  Behavioral Triggers
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setCurrentView('email-analytics')}
                >
                  Email Analytics
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-accent" />
                Promotions & Discounts
              </CardTitle>
              <CardDescription>
                Manage promo codes and special offers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button 
                  variant="hero" 
                  className="w-full"
                  onClick={() => setCurrentView('promos-create')}
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Create Promo Code
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setCurrentView('promos')}
                >
                  Active Promotions
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setCurrentView('promos-reports')}
                >
                  Redemption Reports
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-secondary" />
                Push Notifications
              </CardTitle>
              <CardDescription>
                Send targeted app notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button 
                  variant="hero" 
                  className="w-full"
                  onClick={() => setCurrentView('notifications')}
                >
                  Send Notification
                </Button>
                <Button variant="outline" className="w-full">
                  Scheduled Messages
                </Button>
                <Button variant="outline" className="w-full">
                  Notification History
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Analytics & Reports
              </CardTitle>
              <CardDescription>
                Track campaign performance and ROI
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setCurrentView('campaign-performance')}
                >
                  Campaign Performance
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setCurrentView('customer-engagement')}
                >
                  Customer Engagement
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setCurrentView('revenue-attribution')}
                >
                  Revenue Attribution
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-accent" />
                Content Calendar
              </CardTitle>
              <CardDescription>
                Plan and schedule marketing content
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setCurrentView('content-calendar')}
                >
                  View Calendar
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setCurrentView('content-schedule')}
                >
                  Schedule Content
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setCurrentView('content-library')}
                >
                  Content Library
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-secondary" />
                Customer Segments
              </CardTitle>
              <CardDescription>
                Target specific customer groups
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setCurrentView('segments-create')}
                >
                  Create Segment
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setCurrentView('customer-segments')}
                >
                  Active Segments
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setCurrentView('segments-analytics')}
                >
                  Segment Analytics
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
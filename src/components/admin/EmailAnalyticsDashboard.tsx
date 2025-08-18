import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Mail, TrendingUp, Users, Target, Eye, MousePointer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface EmailAnalyticsProps {
  onBack: () => void;
}

interface EmailStats {
  totalSent: number;
  totalOpened: number;
  totalClicked: number;
  totalBounced: number;
  totalUnsubscribed: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
}

export function EmailAnalyticsDashboard({ onBack }: EmailAnalyticsProps) {
  const [stats, setStats] = useState<EmailStats>({
    totalSent: 0,
    totalOpened: 0,
    totalClicked: 0,
    totalBounced: 0,
    totalUnsubscribed: 0,
    openRate: 0,
    clickRate: 0,
    bounceRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadEmailAnalytics();
  }, []);

  const loadEmailAnalytics = async () => {
    try {
      setLoading(true);
      
      // Get campaign analytics data
      const { data: analytics, error } = await supabase
        .from('campaign_analytics')
        .select('*');

      if (error) throw error;

      if (analytics && analytics.length > 0) {
        // Aggregate the data
        const totals = analytics.reduce((acc, record) => ({
          sent: acc.sent + (record.sent_count || 0),
          opened: acc.opened + (record.opened_count || 0),
          clicked: acc.clicked + (record.clicked_count || 0),
          bounced: acc.bounced + (record.bounce_count || 0),
          unsubscribed: acc.unsubscribed + (record.unsubscribe_count || 0),
        }), { sent: 0, opened: 0, clicked: 0, bounced: 0, unsubscribed: 0 });

        const openRate = totals.sent > 0 ? (totals.opened / totals.sent) * 100 : 0;
        const clickRate = totals.opened > 0 ? (totals.clicked / totals.opened) * 100 : 0;
        const bounceRate = totals.sent > 0 ? (totals.bounced / totals.sent) * 100 : 0;

        setStats({
          totalSent: totals.sent,
          totalOpened: totals.opened,
          totalClicked: totals.clicked,
          totalBounced: totals.bounced,
          totalUnsubscribed: totals.unsubscribed,
          openRate,
          clickRate,
          bounceRate,
        });
      }
    } catch (error) {
      console.error('Error loading email analytics:', error);
      toast({
        title: "Error",
        description: "Failed to load email analytics",
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
              Email Campaign Analytics
            </h1>
            <p className="text-muted-foreground">
              Track email performance and engagement metrics
            </p>
          </div>
          <Badge variant="secondary" className="px-3 py-1">
            <Mail className="h-3 w-3 mr-1" />
            Email Analytics
          </Badge>
        </div>

        {/* Email Performance Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-0 shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Sent</p>
                  <p className="text-2xl font-bold">{stats.totalSent.toLocaleString()}</p>
                </div>
                <Mail className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Open Rate</p>
                  <p className="text-2xl font-bold">{stats.openRate.toFixed(1)}%</p>
                </div>
                <Eye className="h-8 w-8 text-accent" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Click Rate</p>
                  <p className="text-2xl font-bold">{stats.clickRate.toFixed(1)}%</p>
                </div>
                <MousePointer className="h-8 w-8 text-secondary" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Bounce Rate</p>
                  <p className="text-2xl font-bold">{stats.bounceRate.toFixed(1)}%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-destructive" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-0 shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Engagement Metrics
              </CardTitle>
              <CardDescription>
                Detailed breakdown of email engagement
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Emails Opened</span>
                <span className="font-medium">{stats.totalOpened.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Links Clicked</span>
                <span className="font-medium">{stats.totalClicked.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Unsubscribes</span>
                <span className="font-medium">{stats.totalUnsubscribed.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Bounces</span>
                <span className="font-medium">{stats.totalBounced.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-accent" />
                Performance Summary
              </CardTitle>
              <CardDescription>
                Key performance indicators
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Delivery Rate</span>
                  <span className="font-medium">
                    {stats.totalSent > 0 ? (((stats.totalSent - stats.totalBounced) / stats.totalSent) * 100).toFixed(1) : 0}%
                  </span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full" 
                    style={{ 
                      width: `${stats.totalSent > 0 ? ((stats.totalSent - stats.totalBounced) / stats.totalSent) * 100 : 0}%` 
                    }}
                  ></div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Engagement Rate</span>
                  <span className="font-medium">
                    {stats.totalSent > 0 ? ((stats.totalOpened + stats.totalClicked) / stats.totalSent * 100).toFixed(1) : 0}%
                  </span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div 
                    className="bg-accent h-2 rounded-full" 
                    style={{ 
                      width: `${stats.totalSent > 0 ? ((stats.totalOpened + stats.totalClicked) / stats.totalSent) * 100 : 0}%` 
                    }}
                  ></div>
                </div>
              </div>

              {loading && (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                  <p className="text-sm text-muted-foreground mt-2">Loading analytics...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
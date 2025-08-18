import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, TrendingUp, Users, DollarSign, Target, Eye, MousePointer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CampaignPerformanceProps {
  onBack: () => void;
}

interface CampaignData {
  id: string;
  name: string;
  status: string;
  sent_count: number;
  opened_count: number;
  clicked_count: number;
  conversion_count: number;
  revenue_cents: number;
  created_at: string;
}

export function CampaignPerformanceAnalytics({ onBack }: CampaignPerformanceProps) {
  const [campaigns, setCampaigns] = useState<CampaignData[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadCampaignData();
  }, []);

  const loadCampaignData = async () => {
    try {
      setLoading(true);
      
      // Get campaign data with analytics
      const { data: campaignData, error } = await supabase
        .from('marketing_campaigns')
        .select(`
          id,
          name,
          status,
          created_at,
          campaign_analytics (
            sent_count,
            opened_count,
            clicked_count,
            conversion_count,
            revenue_cents
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform the data to flatten analytics
      const transformedData = campaignData?.map(campaign => ({
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        created_at: campaign.created_at,
        sent_count: campaign.campaign_analytics?.[0]?.sent_count || 0,
        opened_count: campaign.campaign_analytics?.[0]?.opened_count || 0,
        clicked_count: campaign.campaign_analytics?.[0]?.clicked_count || 0,
        conversion_count: campaign.campaign_analytics?.[0]?.conversion_count || 0,
        revenue_cents: campaign.campaign_analytics?.[0]?.revenue_cents || 0,
      })) || [];

      setCampaigns(transformedData);
    } catch (error) {
      console.error('Error loading campaign data:', error);
      toast({
        title: "Error",
        description: "Failed to load campaign performance data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateRate = (numerator: number, denominator: number) => {
    return denominator > 0 ? ((numerator / denominator) * 100).toFixed(1) : '0.0';
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
              Campaign Performance Analytics
            </h1>
            <p className="text-muted-foreground">
              Track individual campaign performance and metrics
            </p>
          </div>
          <Badge variant="secondary" className="px-3 py-1">
            <TrendingUp className="h-3 w-3 mr-1" />
            Performance Data
          </Badge>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-muted-foreground mt-2">Loading campaign data...</p>
          </div>
        ) : campaigns.length === 0 ? (
          <Card className="border-0 shadow-soft">
            <CardContent className="p-8 text-center">
              <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Campaign Data</h3>
              <p className="text-muted-foreground">Create some marketing campaigns to see performance analytics here.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {campaigns.map((campaign) => (
              <Card key={campaign.id} className="border-0 shadow-soft">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {campaign.name}
                        <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'}>
                          {campaign.status}
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        Created: {new Date(campaign.created_at).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Total Revenue</p>
                      <p className="text-2xl font-bold text-green-600">
                        ${(campaign.revenue_cents / 100).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-muted/30 rounded-lg">
                      <div className="flex items-center justify-center mb-2">
                        <Users className="h-4 w-4 text-primary mr-1" />
                        <span className="text-sm text-muted-foreground">Sent</span>
                      </div>
                      <p className="text-2xl font-bold">{campaign.sent_count.toLocaleString()}</p>
                    </div>
                    
                    <div className="text-center p-4 bg-muted/30 rounded-lg">
                      <div className="flex items-center justify-center mb-2">
                        <Eye className="h-4 w-4 text-accent mr-1" />
                        <span className="text-sm text-muted-foreground">Opens</span>
                      </div>
                      <p className="text-2xl font-bold">{campaign.opened_count.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">
                        {calculateRate(campaign.opened_count, campaign.sent_count)}% rate
                      </p>
                    </div>

                    <div className="text-center p-4 bg-muted/30 rounded-lg">
                      <div className="flex items-center justify-center mb-2">
                        <MousePointer className="h-4 w-4 text-secondary mr-1" />
                        <span className="text-sm text-muted-foreground">Clicks</span>
                      </div>
                      <p className="text-2xl font-bold">{campaign.clicked_count.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">
                        {calculateRate(campaign.clicked_count, campaign.opened_count)}% CTR
                      </p>
                    </div>

                    <div className="text-center p-4 bg-muted/30 rounded-lg">
                      <div className="flex items-center justify-center mb-2">
                        <Target className="h-4 w-4 text-green-600 mr-1" />
                        <span className="text-sm text-muted-foreground">Conversions</span>
                      </div>
                      <p className="text-2xl font-bold">{campaign.conversion_count.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">
                        {calculateRate(campaign.conversion_count, campaign.sent_count)}% rate
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
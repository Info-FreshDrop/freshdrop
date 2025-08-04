import React, { useState, useEffect } from 'react';
import { Plus, Calendar, Send, Users, Eye, Edit, Trash2, Play, Pause } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface MarketingCampaign {
  id: string;
  name: string;
  description: string;
  campaign_type: string;
  status: string;
  template_id: string;
  target_segment: string;
  schedule_date: string;
  recurring_pattern: string;
  created_at: string;
  template?: {
    subject: string;
    message: string;
  };
}

interface MarketingCampaignManagementProps {
  onBack: () => void;
}

export function MarketingCampaignManagement({ onBack }: MarketingCampaignManagementProps) {
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<MarketingCampaign | null>(null);
  const { toast } = useToast();

  const [newCampaign, setNewCampaign] = useState({
    name: '',
    description: '',
    campaign_type: 'promotional',
    template_id: '',
    target_segment: 'all_customers',
    schedule_date: '',
    recurring_pattern: 'none'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load campaigns
      const { data: campaignsData, error: campaignsError } = await supabase
        .from('marketing_campaigns')
        .select(`
          *,
          template:notification_templates(subject, message)
        `)
        .order('created_at', { ascending: false });

      if (campaignsError) throw campaignsError;

      // Load templates for campaign creation
      const { data: templatesData, error: templatesError } = await supabase
        .from('notification_templates')
        .select('*')
        .eq('is_active', true)
        .order('status');

      if (templatesError) throw templatesError;

      setCampaigns(campaignsData || []);
      setTemplates(templatesData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load campaigns",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createCampaign = async () => {
    try {
      const { error } = await supabase
        .from('marketing_campaigns')
        .insert({
          ...newCampaign,
          schedule_date: newCampaign.schedule_date || null,
          status: 'draft'
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Campaign created successfully"
      });

      setIsCreateDialogOpen(false);
      setNewCampaign({
        name: '',
        description: '',
        campaign_type: 'promotional',
        template_id: '',
        target_segment: 'all_customers',
        schedule_date: '',
        recurring_pattern: 'none'
      });
      loadData();
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast({
        title: "Error",
        description: "Failed to create campaign",
        variant: "destructive"
      });
    }
  };

  const updateCampaignStatus = async (campaignId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('marketing_campaigns')
        .update({ status: newStatus })
        .eq('id', campaignId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Campaign ${newStatus === 'active' ? 'activated' : 'paused'}`
      });

      loadData();
    } catch (error) {
      console.error('Error updating campaign:', error);
      toast({
        title: "Error",
        description: "Failed to update campaign",
        variant: "destructive"
      });
    }
  };

  const sendCampaignNow = async (campaignId: string) => {
    try {
      const response = await supabase.functions.invoke('marketing-automation', {
        body: { campaignId, triggerType: 'scheduled' }
      });

      if (response.error) throw response.error;

      toast({
        title: "Success",
        description: "Campaign sent successfully"
      });
    } catch (error) {
      console.error('Error sending campaign:', error);
      toast({
        title: "Error",
        description: "Failed to send campaign",
        variant: "destructive"
      });
    }
  };

  const deleteCampaign = async (campaignId: string) => {
    try {
      const { error } = await supabase
        .from('marketing_campaigns')
        .delete()
        .eq('id', campaignId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Campaign deleted successfully"
      });

      loadData();
    } catch (error) {
      console.error('Error deleting campaign:', error);
      toast({
        title: "Error",
        description: "Failed to delete campaign",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getCampaignTypeColor = (type: string) => {
    switch (type) {
      case 'holiday': return 'bg-purple-100 text-purple-800';
      case 'retention': return 'bg-orange-100 text-orange-800';
      case 'feedback': return 'bg-blue-100 text-blue-800';
      case 'promotional': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  if (loading) {
    return <div className="p-6 text-center">Loading campaigns...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="outline" onClick={onBack} className="mb-4">
            ← Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold">Marketing Campaigns</h1>
          <p className="text-muted-foreground">Manage automated marketing campaigns and notifications</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Campaign</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Campaign Name</Label>
                  <Input
                    id="name"
                    value={newCampaign.name}
                    onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                    placeholder="Fourth of July Special"
                  />
                </div>
                <div>
                  <Label htmlFor="campaign_type">Campaign Type</Label>
                  <Select
                    value={newCampaign.campaign_type}
                    onValueChange={(value) => setNewCampaign({ ...newCampaign, campaign_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="promotional">Promotional</SelectItem>
                      <SelectItem value="holiday">Holiday/Event</SelectItem>
                      <SelectItem value="retention">Customer Retention</SelectItem>
                      <SelectItem value="feedback">Feedback Request</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newCampaign.description}
                  onChange={(e) => setNewCampaign({ ...newCampaign, description: e.target.value })}
                  placeholder="Campaign description and goals"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="template_id">Notification Template</Label>
                  <Select
                    value={newCampaign.template_id}
                    onValueChange={(value) => setNewCampaign({ ...newCampaign, template_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.subject} ({template.status})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="target_segment">Target Segment</Label>
                  <Select
                    value={newCampaign.target_segment}
                    onValueChange={(value) => setNewCampaign({ ...newCampaign, target_segment: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all_customers">All Customers</SelectItem>
                      <SelectItem value="active_customers">Active Customers</SelectItem>
                      <SelectItem value="inactive_customers">Inactive Customers</SelectItem>
                      <SelectItem value="high_value_customers">High Value Customers</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="schedule_date">Schedule Date (Optional)</Label>
                  <Input
                    id="schedule_date"
                    type="datetime-local"
                    value={newCampaign.schedule_date}
                    onChange={(e) => setNewCampaign({ ...newCampaign, schedule_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="recurring_pattern">Recurring Pattern</Label>
                  <Select
                    value={newCampaign.recurring_pattern}
                    onValueChange={(value) => setNewCampaign({ ...newCampaign, recurring_pattern: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">One-time</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={createCampaign} disabled={!newCampaign.name || !newCampaign.template_id}>
                  Create Campaign
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {campaigns.map((campaign) => (
          <Card key={campaign.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {campaign.name}
                    <Badge className={getStatusColor(campaign.status)}>
                      {campaign.status}
                    </Badge>
                    <Badge className={getCampaignTypeColor(campaign.campaign_type)}>
                      {campaign.campaign_type}
                    </Badge>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">{campaign.description}</p>
                </div>
                
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-1">
                    <Eye className="h-4 w-4" />
                    Preview
                  </Button>
                  
                  {campaign.status === 'draft' || campaign.status === 'paused' ? (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="gap-1"
                      onClick={() => updateCampaignStatus(campaign.id, 'active')}
                    >
                      <Play className="h-4 w-4" />
                      Activate
                    </Button>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="gap-1"
                      onClick={() => updateCampaignStatus(campaign.id, 'paused')}
                    >
                      <Pause className="h-4 w-4" />
                      Pause
                    </Button>
                  )}
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-1"
                    onClick={() => sendCampaignNow(campaign.id)}
                  >
                    <Send className="h-4 w-4" />
                    Send Now
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-1 text-destructive hover:text-destructive"
                    onClick={() => deleteCampaign(campaign.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Target Segment:</span>
                  <p className="font-medium">{campaign.target_segment?.replace('_', ' ') || 'All customers'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Recurring:</span>
                  <p className="font-medium">{campaign.recurring_pattern || 'One-time'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Created:</span>
                  <p className="font-medium">{format(new Date(campaign.created_at), 'MMM d, yyyy')}</p>
                </div>
                {campaign.schedule_date && (
                  <div>
                    <span className="text-muted-foreground">Scheduled:</span>
                    <p className="font-medium">{format(new Date(campaign.schedule_date), 'MMM d, yyyy HH:mm')}</p>
                  </div>
                )}
              </div>
              
              {campaign.template && (
                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium">{campaign.template.subject}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {campaign.template.message.substring(0, 100)}...
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        
        {campaigns.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No campaigns yet</h3>
              <p className="text-muted-foreground mb-4">Create your first marketing campaign to get started</p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                Create Campaign
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { Plus, Clock, Users, Target, Edit, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
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

interface BehavioralTrigger {
  id: string;
  name: string;
  trigger_type: string;
  conditions: any;
  campaign_id: string;
  delay_minutes: number;
  is_active: boolean;
  created_at: string;
  campaign?: {
    name: string;
    status: string;
  };
}

interface BehavioralTriggersManagementProps {
  onBack: () => void;
}

export function BehavioralTriggersManagement({ onBack }: BehavioralTriggersManagementProps) {
  const [triggers, setTriggers] = useState<BehavioralTrigger[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();

  const [newTrigger, setNewTrigger] = useState({
    name: '',
    trigger_type: 'inactivity',
    campaign_id: '',
    delay_minutes: 0,
    conditions: {}
  });

  const [conditionValues, setConditionValues] = useState({
    inactiveDays: 14,
    hoursAfterDelivery: 2,
    orderCount: 5,
    abandonedHours: 24,
    daysBeforeBirthday: 3,
    hoursAfterSignup: 1,
    hoursAfterReview: 2,
    hoursAfterReferral: 1
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load triggers
      const { data: triggersData, error: triggersError } = await supabase
        .from('campaign_triggers')
        .select(`
          *,
          campaign:marketing_campaigns(name, status)
        `)
        .order('created_at', { ascending: false });

      if (triggersError) throw triggersError;

      // Load campaigns for trigger creation
      const { data: campaignsData, error: campaignsError } = await supabase
        .from('marketing_campaigns')
        .select('id, name, status')
        .order('name');

      if (campaignsError) throw campaignsError;

      setTriggers(triggersData || []);
      setCampaigns(campaignsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load behavioral triggers",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createTrigger = async () => {
    try {
      let conditions = {};
      
      switch (newTrigger.trigger_type) {
        case 'inactivity':
          conditions = { inactiveDays: conditionValues.inactiveDays };
          break;
        case 'post_order':
          conditions = { hoursAfterDelivery: conditionValues.hoursAfterDelivery };
          break;
        case 'milestone':
          conditions = { orderCount: conditionValues.orderCount };
          break;
        case 'abandoned_cart':
          conditions = { abandonedHours: conditionValues.abandonedHours };
          break;
        case 'new_signup':
          conditions = { hoursAfterSignup: conditionValues.hoursAfterSignup };
          break;
        case 'review_posted':
          conditions = { hoursAfterReview: conditionValues.hoursAfterReview };
          break;
        case 'referral_shared':
          conditions = { hoursAfterReferral: conditionValues.hoursAfterReferral };
          break;
        case 'birthday':
          conditions = { daysBeforeBirthday: conditionValues.daysBeforeBirthday };
          break;
      }

      const { error } = await supabase
        .from('campaign_triggers')
        .insert({
          ...newTrigger,
          conditions,
          is_active: true
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Behavioral trigger created successfully"
      });

      setIsCreateDialogOpen(false);
      setNewTrigger({
        name: '',
        trigger_type: 'inactivity',
        campaign_id: '',
        delay_minutes: 0,
        conditions: {}
      });
      setConditionValues({
        inactiveDays: 14,
        hoursAfterDelivery: 2,
        orderCount: 5,
        abandonedHours: 24,
        daysBeforeBirthday: 3,
        hoursAfterSignup: 1,
        hoursAfterReview: 2,
        hoursAfterReferral: 1
      });
      loadData();
    } catch (error) {
      console.error('Error creating trigger:', error);
      toast({
        title: "Error",
        description: "Failed to create behavioral trigger",
        variant: "destructive"
      });
    }
  };

  const toggleTrigger = async (triggerId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('campaign_triggers')
        .update({ is_active: !isActive })
        .eq('id', triggerId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Trigger ${!isActive ? 'activated' : 'deactivated'}`
      });

      loadData();
    } catch (error) {
      console.error('Error updating trigger:', error);
      toast({
        title: "Error",
        description: "Failed to update trigger",
        variant: "destructive"
      });
    }
  };

  const deleteTrigger = async (triggerId: string) => {
    try {
      const { error } = await supabase
        .from('campaign_triggers')
        .delete()
        .eq('id', triggerId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Trigger deleted successfully"
      });

      loadData();
    } catch (error) {
      console.error('Error deleting trigger:', error);
      toast({
        title: "Error",
        description: "Failed to delete trigger",
        variant: "destructive"
      });
    }
  };

  const getTriggerTypeColor = (type: string) => {
    switch (type) {
      case 'inactivity': return 'bg-orange-100 text-orange-800';
      case 'post_order': return 'bg-blue-100 text-blue-800';
      case 'milestone': return 'bg-green-100 text-green-800';
      case 'abandoned_cart': return 'bg-red-100 text-red-800';
      case 'new_signup': return 'bg-purple-100 text-purple-800';
      case 'review_posted': return 'bg-yellow-100 text-yellow-800';
      case 'referral_shared': return 'bg-pink-100 text-pink-800';
      case 'birthday': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getTriggerTypeIcon = (type: string) => {
    switch (type) {
      case 'inactivity': return Clock;
      case 'post_order': return Target;
      case 'milestone': return Users;
      case 'abandoned_cart': return Clock;
      case 'new_signup': return Plus;
      case 'review_posted': return Edit;
      case 'referral_shared': return Users;
      case 'birthday': return Users;
      default: return Clock;
    }
  };

  const formatConditions = (type: string, conditions: any) => {
    switch (type) {
      case 'inactivity':
        return `${conditions.inactiveDays || 14} days without order`;
      case 'post_order':
        return `${conditions.hoursAfterDelivery || 2} hours after delivery`;
      case 'milestone':
        return `${conditions.orderCount || 5} orders completed`;
      case 'abandoned_cart':
        return `${conditions.abandonedHours || 24} hours since cart abandonment`;
      case 'new_signup':
        return `${conditions.hoursAfterSignup || 1} hours after signup`;
      case 'review_posted':
        return `${conditions.hoursAfterReview || 2} hours after review posted`;
      case 'referral_shared':
        return `${conditions.hoursAfterReferral || 1} hours after referral shared`;
      case 'birthday':
        return `${conditions.daysBeforeBirthday || 3} days before birthday`;
      default:
        return 'Custom conditions';
    }
  };

  if (loading) {
    return <div className="p-6 text-center">Loading behavioral triggers...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="outline" onClick={onBack} className="mb-4">
            ← Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold">Behavioral Triggers</h1>
          <p className="text-muted-foreground">Set up automated triggers based on customer behavior</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create Trigger
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Behavioral Trigger</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Trigger Name</Label>
                <Input
                  id="name"
                  value={newTrigger.name}
                  onChange={(e) => setNewTrigger({ ...newTrigger, name: e.target.value })}
                  placeholder="Inactive Customer Reminder"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="trigger_type">Trigger Type</Label>
                  <Select
                    value={newTrigger.trigger_type}
                    onValueChange={(value) => setNewTrigger({ ...newTrigger, trigger_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inactivity">Customer Inactivity</SelectItem>
                      <SelectItem value="post_order">Post-Order Follow-up</SelectItem>
                      <SelectItem value="milestone">Order Milestone</SelectItem>
                      <SelectItem value="abandoned_cart">Abandoned Cart</SelectItem>
                      <SelectItem value="new_signup">Welcome New User</SelectItem>
                      <SelectItem value="review_posted">Review Thank You</SelectItem>
                      <SelectItem value="referral_shared">Referral Reward</SelectItem>
                      <SelectItem value="birthday">Birthday Campaign</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="campaign_id">Campaign</Label>
                  <Select
                    value={newTrigger.campaign_id}
                    onValueChange={(value) => setNewTrigger({ ...newTrigger, campaign_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select campaign" />
                    </SelectTrigger>
                    <SelectContent>
                      {campaigns.map((campaign) => (
                        <SelectItem key={campaign.id} value={campaign.id}>
                          {campaign.name} ({campaign.status})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Condition-specific inputs */}
              {newTrigger.trigger_type === 'inactivity' && (
                <div>
                  <Label htmlFor="inactiveDays">Days of Inactivity</Label>
                  <Input
                    id="inactiveDays"
                    type="number"
                    value={conditionValues.inactiveDays}
                    onChange={(e) => setConditionValues({ ...conditionValues, inactiveDays: parseInt(e.target.value) })}
                    min="1"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Trigger after customer hasn't ordered for this many days
                  </p>
                </div>
              )}

              {newTrigger.trigger_type === 'post_order' && (
                <div>
                  <Label htmlFor="hoursAfterDelivery">Hours After Delivery</Label>
                  <Input
                    id="hoursAfterDelivery"
                    type="number"
                    value={conditionValues.hoursAfterDelivery}
                    onChange={(e) => setConditionValues({ ...conditionValues, hoursAfterDelivery: parseInt(e.target.value) })}
                    min="1"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Send follow-up notification this many hours after order completion
                  </p>
                </div>
              )}

              {newTrigger.trigger_type === 'milestone' && (
                <div>
                  <Label htmlFor="orderCount">Order Count Milestone</Label>
                  <Input
                    id="orderCount"
                    type="number"
                    value={conditionValues.orderCount}
                    onChange={(e) => setConditionValues({ ...conditionValues, orderCount: parseInt(e.target.value) })}
                    min="1"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Trigger when customer reaches this order count
                  </p>
                </div>
              )}

              {newTrigger.trigger_type === 'abandoned_cart' && (
                <div>
                  <Label htmlFor="abandonedHours">Hours Since Abandonment</Label>
                  <Input
                    id="abandonedHours"
                    type="number"
                    value={conditionValues.abandonedHours}
                    onChange={(e) => setConditionValues({ ...conditionValues, abandonedHours: parseInt(e.target.value) })}
                    min="1"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Trigger this many hours after cart abandonment
                  </p>
                </div>
              )}

              {newTrigger.trigger_type === 'new_signup' && (
                <div>
                  <Label htmlFor="hoursAfterSignup">Hours After Signup</Label>
                  <Input
                    id="hoursAfterSignup"
                    type="number"
                    value={conditionValues.hoursAfterSignup}
                    onChange={(e) => setConditionValues({ ...conditionValues, hoursAfterSignup: parseInt(e.target.value) })}
                    min="1"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Send welcome email this many hours after user signup
                  </p>
                </div>
              )}

              {newTrigger.trigger_type === 'review_posted' && (
                <div>
                  <Label htmlFor="hoursAfterReview">Hours After Review</Label>
                  <Input
                    id="hoursAfterReview"
                    type="number"
                    value={conditionValues.hoursAfterReview}
                    onChange={(e) => setConditionValues({ ...conditionValues, hoursAfterReview: parseInt(e.target.value) })}
                    min="1"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Thank customer this many hours after they leave a review
                  </p>
                </div>
              )}

              {newTrigger.trigger_type === 'referral_shared' && (
                <div>
                  <Label htmlFor="hoursAfterReferral">Hours After Referral</Label>
                  <Input
                    id="hoursAfterReferral"
                    type="number"
                    value={conditionValues.hoursAfterReferral}
                    onChange={(e) => setConditionValues({ ...conditionValues, hoursAfterReferral: parseInt(e.target.value) })}
                    min="1"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Send reward notification this many hours after referral is shared
                  </p>
                </div>
              )}

              {newTrigger.trigger_type === 'birthday' && (
                <div>
                  <Label htmlFor="daysBeforeBirthday">Days Before Birthday</Label>
                  <Input
                    id="daysBeforeBirthday"
                    type="number"
                    value={conditionValues.daysBeforeBirthday}
                    onChange={(e) => setConditionValues({ ...conditionValues, daysBeforeBirthday: parseInt(e.target.value) })}
                    min="1"
                    max="30"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Send birthday message this many days before customer's birthday
                  </p>
                </div>
              )}

              <div>
                <Label htmlFor="delay_minutes">Delay (minutes)</Label>
                <Input
                  id="delay_minutes"
                  type="number"
                  value={newTrigger.delay_minutes}
                  onChange={(e) => setNewTrigger({ ...newTrigger, delay_minutes: parseInt(e.target.value) })}
                  min="0"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Additional delay before sending the notification
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={createTrigger} disabled={!newTrigger.name || !newTrigger.campaign_id}>
                  Create Trigger
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {triggers.map((trigger) => {
          const IconComponent = getTriggerTypeIcon(trigger.trigger_type);
          
          return (
            <Card key={trigger.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      <IconComponent className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {trigger.name}
                        <Badge className={getTriggerTypeColor(trigger.trigger_type)}>
                          {trigger.trigger_type.replace('_', ' ')}
                        </Badge>
                        {trigger.is_active ? (
                          <Badge className="bg-green-100 text-green-800">Active</Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-600">Inactive</Badge>
                        )}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {trigger.campaign?.name} • {formatConditions(trigger.trigger_type, trigger.conditions)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="gap-1"
                      onClick={() => toggleTrigger(trigger.id, trigger.is_active)}
                    >
                      {trigger.is_active ? (
                        <>
                          <ToggleRight className="h-4 w-4" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="h-4 w-4" />
                          Activate
                        </>
                      )}
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="gap-1 text-destructive hover:text-destructive"
                      onClick={() => deleteTrigger(trigger.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Campaign Status:</span>
                    <p className="font-medium">{trigger.campaign?.status || 'Unknown'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Delay:</span>
                    <p className="font-medium">
                      {trigger.delay_minutes > 0 ? `${trigger.delay_minutes} minutes` : 'Immediate'}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Created:</span>
                    <p className="font-medium">
                      {new Date(trigger.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        
        {triggers.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No behavioral triggers yet</h3>
              <p className="text-muted-foreground mb-4">Create automated triggers to engage customers based on their behavior</p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                Create Trigger
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
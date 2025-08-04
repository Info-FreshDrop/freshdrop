import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Edit2, Save, X, Eye, RotateCcw, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface NotificationTemplate {
  id: string;
  status: string;
  subject: string;
  message: string;
  is_active: boolean;
  trigger_step?: number;
  step_description?: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

interface NotificationTemplateManagementProps {
  onBack: () => void;
}

export default function NotificationTemplateManagement({ onBack }: NotificationTemplateManagementProps) {
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [deletedTemplates, setDeletedTemplates] = useState<NotificationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<NotificationTemplate | null>(null);
  const [showDeleted, setShowDeleted] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadTemplates();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('notification_templates_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notification_templates'
        },
        () => {
          loadTemplates();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('notification_templates')
        .select('*')
        .order('trigger_step', { nullsFirst: false });

      if (error) throw error;
      
      const activeTemplates = (data || []).filter(t => !t.is_deleted);
      const deletedTemplates = (data || []).filter(t => t.is_deleted);
      
      setTemplates(activeTemplates);
      setDeletedTemplates(deletedTemplates);
    } catch (error) {
      console.error('Error loading templates:', error);
      toast({
        title: "Error",
        description: "Failed to load notification templates",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateTemplate = async (template: NotificationTemplate) => {
    try {
      // Validate step number if provided
      if (template.trigger_step !== null && template.trigger_step !== undefined) {
        if (template.trigger_step < 1 || template.trigger_step > 13) {
          toast({
            title: "Validation Error",
            description: "Trigger step must be between 1 and 13",
            variant: "destructive"
          });
          return;
        }
      }

      const { error } = await supabase
        .from('notification_templates')
        .update({
          subject: template.subject,
          message: template.message,
          is_active: template.is_active,
          trigger_step: template.trigger_step,
          step_description: template.step_description
        })
        .eq('id', template.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Template updated successfully"
      });
      setEditingTemplate(null);
    } catch (error) {
      console.error('Error updating template:', error);
      toast({
        title: "Error",
        description: "Failed to update template",
        variant: "destructive"
      });
    }
  };

  const toggleTemplateStatus = async (template: NotificationTemplate) => {
    try {
      const { error } = await supabase
        .from('notification_templates')
        .update({ is_active: !template.is_active })
        .eq('id', template.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Template ${!template.is_active ? 'enabled' : 'disabled'}`
      });
    } catch (error) {
      console.error('Error toggling template status:', error);
      toast({
        title: "Error",
        description: "Failed to update template status",
        variant: "destructive"
      });
    }
  };

  // Delete template (soft delete)
  const deleteTemplate = async (template: NotificationTemplate) => {
    try {
      const { error } = await supabase
        .from('notification_templates')
        .update({
          is_deleted: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', template.id);

      if (error) throw error;
      
      await loadTemplates();
      toast({
        title: "Success",
        description: "Template deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        title: "Error",
        description: "Failed to delete template",
        variant: "destructive"
      });
    }
  };

  // Restore deleted template
  const restoreTemplate = async (template: NotificationTemplate) => {
    try {
      const { error } = await supabase
        .from('notification_templates')
        .update({
          is_deleted: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', template.id);

      if (error) throw error;
      
      await loadTemplates();
      toast({
        title: "Success",
        description: "Template restored successfully"
      });
    } catch (error) {
      console.error('Error restoring template:', error);
      toast({
        title: "Error",
        description: "Failed to restore template",
        variant: "destructive"
      });
    }
  };

  const resetToDefault = async (template: NotificationTemplate) => {
    const defaultTemplates = {
      'claimed': { subject: 'Order Claimed - Fresh Drop', message: 'Great news! Your laundry order has been claimed by one of our professional operators and will be picked up soon.' },
      'picked_up': { subject: 'Order Picked Up - Fresh Drop', message: 'Your laundry has been picked up and is on its way to be cleaned with care.' },
      'washing': { subject: 'Washing Started - Fresh Drop', message: 'Your clothes are now being washed with premium detergents and care.' },
      'rinsing': { subject: 'Rinse Cycle - Fresh Drop', message: 'Your laundry is in the rinse cycle, almost ready for drying.' },
      'drying': { subject: 'Drying Started - Fresh Drop', message: 'Your clothes are now in the drying process and will be ready soon.' },
      'folding': { subject: 'Folding & Packaging - Fresh Drop', message: 'Your clean laundry is being carefully folded and packaged for delivery.' },
      'delivering': { subject: 'Out for Delivery - Fresh Drop', message: 'Your fresh, clean laundry is out for delivery and will arrive soon!' },
      'completed': { subject: 'Order Completed - Fresh Drop', message: 'Your laundry order has been completed and delivered. Thank you for choosing Fresh Drop!' },
      'cancelled': { subject: 'Order Cancelled - Fresh Drop', message: 'Your laundry order has been cancelled. If you have any questions, please contact our support team.' }
    };

    const defaultTemplate = defaultTemplates[template.status as keyof typeof defaultTemplates];
    if (!defaultTemplate) return;

    try {
      const { error } = await supabase
        .from('notification_templates')
        .update(defaultTemplate)
        .eq('id', template.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Template reset to default"
      });
    } catch (error) {
      console.error('Error resetting template:', error);
      toast({
        title: "Error",
        description: "Failed to reset template",
        variant: "destructive"
      });
    }
  };

  const formatStatus = (status: string) => {
    return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const processPreviewMessage = (message: string) => {
    return message.replace(/\{customerName\}/g, 'John Smith');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
        <h1 className="text-3xl font-bold">Notification Templates</h1>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Active Templates</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDeleted(!showDeleted)}
          >
            {showDeleted ? "Hide Deleted" : "Show Deleted"} ({deletedTemplates.length})
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {templates.map((template) => (
          <Card key={template.id} className={`${!template.is_active ? 'opacity-60' : ''}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-3">
                {template.trigger_step && (
                  <Badge variant="default" className="bg-primary/10 text-primary">
                    Step {template.trigger_step}
                  </Badge>
                )}
                <CardTitle className="text-lg">{formatStatus(template.status)}</CardTitle>
                <Badge variant={template.is_active ? "default" : "secondary"}>
                  {template.is_active ? "Active" : "Disabled"}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={template.is_active}
                  onCheckedChange={() => toggleTemplateStatus(template)}
                />
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" onClick={() => setPreviewTemplate(template)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Preview - {formatStatus(template.status)}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="border rounded-lg p-4 bg-muted">
                        <h3 className="font-semibold mb-2">Email Preview</h3>
                        <div className="bg-white p-4 rounded border">
                          <div className="font-family: Arial, sans-serif">
                            <h1 className="text-blue-600 text-xl mb-2">FreshDrop Laundry</h1>
                            <h2 className="text-lg mb-3">Order Update - {template.subject}</h2>
                            <p className="mb-2">Hi John Smith,</p>
                            <p className="mb-4">{processPreviewMessage(template.message)}</p>
                            <div className="bg-gray-100 p-4 rounded mb-4">
                              <strong>Order Details:</strong><br />
                              Order ID: ORDER123<br />
                              Status: {formatStatus(template.status).toUpperCase()}
                              {template.trigger_step && (
                                <>
                                  <br />Step: {template.trigger_step}
                                </>
                              )}
                            </div>
                            <p className="mb-2">Thank you for choosing FreshDrop!</p>
                            <p className="text-gray-600 text-sm">
                              If you have any questions, please contact our support team.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button variant="outline" size="sm" onClick={() => setEditingTemplate(template)}>
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => resetToDefault(template)}>
                  <RotateCcw className="w-4 h-4" />
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteTemplate(template)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {template.step_description && (
                  <div>
                    <strong>Trigger:</strong> {template.step_description}
                  </div>
                )}
                <div>
                  <strong>Subject:</strong> {template.subject}
                </div>
                <div>
                  <strong>Message:</strong> {template.message}
                </div>
                <div className="text-sm text-muted-foreground">
                  Last updated: {new Date(template.updated_at).toLocaleString()}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {showDeleted && deletedTemplates.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4 text-muted-foreground">Deleted Templates</h3>
            <div className="space-y-4">
              {deletedTemplates.map((template) => (
                <Card key={template.id} className="opacity-60 border-dashed">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {template.trigger_step && (
                            <Badge variant="secondary" className="opacity-60">
                              Step {template.trigger_step}
                            </Badge>
                          )}
                          <Badge variant="outline" className="capitalize opacity-60">
                            {formatStatus(template.status)}
                          </Badge>
                          <Badge variant="secondary">Deleted</Badge>
                        </div>
                        <h4 className="font-medium text-muted-foreground mb-1">
                          {template.subject}
                        </h4>
                        {template.step_description && (
                          <p className="text-xs text-muted-foreground mb-1">
                            {template.step_description}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => restoreTemplate(template)}
                      >
                        Restore
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      {editingTemplate && (
        <Dialog open={!!editingTemplate} onOpenChange={() => setEditingTemplate(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Template - {formatStatus(editingTemplate.status)}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="subject">Subject Line</Label>
                <Input
                  id="subject"
                  value={editingTemplate.subject}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                  placeholder="Enter email subject line"
                />
              </div>
              <div>
                <Label htmlFor="message">Message Content</Label>
                <Textarea
                  id="message"
                  value={editingTemplate.message}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, message: e.target.value })}
                  placeholder="Enter notification message"
                  rows={4}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Use {'{customerName}'} to insert the customer's name automatically
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="trigger_step">Trigger Step (1-13)</Label>
                  <Input
                    id="trigger_step"
                    type="number"
                    min="1"
                    max="13"
                    value={editingTemplate.trigger_step || ''}
                    onChange={(e) => setEditingTemplate({ 
                      ...editingTemplate, 
                      trigger_step: e.target.value ? parseInt(e.target.value) : null 
                    })}
                    placeholder="Leave empty for status-based"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Which workflow step should trigger this notification
                  </p>
                </div>
                <div>
                  <Label htmlFor="step_description">Step Description</Label>
                  <Input
                    id="step_description"
                    value={editingTemplate.step_description || ''}
                    onChange={(e) => setEditingTemplate({ 
                      ...editingTemplate, 
                      step_description: e.target.value || null 
                    })}
                    placeholder="Describe what happens at this step"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Brief description of the step (optional)
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={editingTemplate.is_active}
                  onCheckedChange={(checked) => setEditingTemplate({ ...editingTemplate, is_active: checked })}
                />
                <Label htmlFor="active">Template is active</Label>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingTemplate(null)}>
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={() => updateTemplate(editingTemplate)}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
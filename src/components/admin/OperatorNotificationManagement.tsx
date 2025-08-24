import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, Edit, Eye, RotateCcw, Save } from 'lucide-react';

interface OperatorNotificationTemplate {
  id: string;
  notification_type: string;
  channel: string;
  subject: string;
  message: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface OperatorNotificationManagementProps {
  onBack: () => void;
}

export default function OperatorNotificationManagement({ onBack }: OperatorNotificationManagementProps) {
  const [templates, setTemplates] = useState<OperatorNotificationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<OperatorNotificationTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<OperatorNotificationTemplate | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('operator_notification_templates')
        .select('*')
        .order('notification_type', { ascending: true })
        .order('channel', { ascending: true });

      if (error) {
        console.error('Error loading operator notification templates:', error);
        toast.error('Failed to load notification templates');
        return;
      }

      setTemplates(data || []);
    } catch (error) {
      console.error('Error loading operator notification templates:', error);
      toast.error('Failed to load notification templates');
    } finally {
      setLoading(false);
    }
  };

  const updateTemplate = async (template: OperatorNotificationTemplate) => {
    try {
      const { error } = await supabase
        .from('operator_notification_templates')
        .update({
          subject: template.subject,
          message: template.message,
          is_active: template.is_active,
        })
        .eq('id', template.id);

      if (error) {
        console.error('Error updating template:', error);
        toast.error('Failed to update template');
        return;
      }

      toast.success('Template updated successfully');
      await loadTemplates();
      setEditingTemplate(null);
    } catch (error) {
      console.error('Error updating template:', error);
      toast.error('Failed to update template');
    }
  };

  const toggleTemplateStatus = async (template: OperatorNotificationTemplate) => {
    try {
      const { error } = await supabase
        .from('operator_notification_templates')
        .update({ is_active: !template.is_active })
        .eq('id', template.id);

      if (error) {
        console.error('Error toggling template status:', error);
        toast.error('Failed to update template status');
        return;
      }

      toast.success(`Template ${!template.is_active ? 'enabled' : 'disabled'}`);
      await loadTemplates();
    } catch (error) {
      console.error('Error toggling template status:', error);
      toast.error('Failed to update template status');
    }
  };

  const resetToDefault = async (template: OperatorNotificationTemplate) => {
    const defaultTemplates = {
      'new_order_email': {
        subject: 'New Order Available - {serviceName}',
        message: `Hello {operatorName},

A new order is available in your area!

Order Details:
- Service: {serviceName}
- Location: {zipCode}
- Estimated Earnings: $\{earnings\}
{expressBadge}

Order ID: {orderId}

Log into the FreshDrop app to claim this order.

Best regards,
FreshDrop Team`
      },
      'new_order_sms': {
        subject: 'FreshDrop: New Order Available',
        message: 'New order available! {serviceName} in {zipCode} - ${earnings}{expressText}. Order: {orderNumber}'
      },
      'broadcast_email': {
        subject: 'Important Update from FreshDrop',
        message: `Hello {operatorName},

{message}

Best regards,
FreshDrop Team`
      },
      'broadcast_sms': {
        subject: 'FreshDrop Update',
        message: '{message}'
      }
    };

    const templateKey = `${template.notification_type}_${template.channel}`;
    const defaultTemplate = defaultTemplates[templateKey as keyof typeof defaultTemplates];

    if (!defaultTemplate) {
      toast.error('No default template available');
      return;
    }

    try {
      const { error } = await supabase
        .from('operator_notification_templates')
        .update({
          subject: defaultTemplate.subject,
          message: defaultTemplate.message,
        })
        .eq('id', template.id);

      if (error) {
        console.error('Error resetting template:', error);
        toast.error('Failed to reset template');
        return;
      }

      toast.success('Template reset to default');
      await loadTemplates();
    } catch (error) {
      console.error('Error resetting template:', error);
      toast.error('Failed to reset template');
    }
  };

  const formatNotificationType = (type: string) => {
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const processPreviewMessage = (message: string) => {
    return message
      .replace(/\{operatorName\}/g, 'John Doe')
      .replace(/\{serviceName\}/g, 'Wash & Fold')
      .replace(/\{zipCode\}/g, '12345')
      .replace(/\{earnings\}/g, '15.00')
      .replace(/\{orderId\}/g, 'ABC123DEF')
      .replace(/\{orderNumber\}/g, 'ABC123DEF')
      .replace(/\{expressBadge\}/g, '\n- ⚡ Express Service')
      .replace(/\{expressText\}/g, ' (Express)')
      .replace(/\{message\}/g, 'This is a sample broadcast message.');
  };

  const processPreviewSubject = (subject: string) => {
    return subject
      .replace(/\{operatorName\}/g, 'John Doe')
      .replace(/\{serviceName\}/g, 'Wash & Fold')
      .replace(/\{zipCode\}/g, '12345')
      .replace(/\{earnings\}/g, '15.00')
      .replace(/\{orderId\}/g, 'ABC123DEF')
      .replace(/\{orderNumber\}/g, 'ABC123DEF')
      .replace(/\{message\}/g, 'Sample broadcast message');
  };

  const getChannelColor = (channel: string) => {
    switch (channel) {
      case 'email':
        return 'bg-blue-100 text-blue-800';
      case 'sms':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Group templates by notification type
  const groupedTemplates = templates.reduce((acc, template) => {
    if (!acc[template.notification_type]) {
      acc[template.notification_type] = [];
    }
    acc[template.notification_type].push(template);
    return acc;
  }, {} as Record<string, OperatorNotificationTemplate[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Operator Notification Templates</h1>
          <p className="text-muted-foreground">Manage email and SMS notifications sent to operators</p>
        </div>
      </div>

      <Tabs defaultValue="new_order" className="space-y-4">
        <TabsList>
          {Object.keys(groupedTemplates).map((type) => (
            <TabsTrigger key={type} value={type}>
              {formatNotificationType(type)}
            </TabsTrigger>
          ))}
        </TabsList>

        {Object.entries(groupedTemplates).map(([type, typeTemplates]) => (
          <TabsContent key={type} value={type} className="space-y-4">
            <div className="grid gap-4">
              {typeTemplates.map((template) => (
                <Card key={template.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">
                          {template.channel.toUpperCase()} Template
                        </CardTitle>
                        <Badge className={getChannelColor(template.channel)}>
                          {template.channel}
                        </Badge>
                        <Badge variant={template.is_active ? 'default' : 'secondary'}>
                          {template.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleTemplateStatus(template)}
                        >
                          {template.is_active ? 'Disable' : 'Enable'}
                        </Button>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => setPreviewTemplate(template)}>
                              <Eye className="h-4 w-4 mr-1" />
                              Preview
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Preview {template.channel.toUpperCase()} Template</DialogTitle>
                              <DialogDescription>
                                See how this template will look when sent to operators
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label className="text-sm font-medium">Subject:</Label>
                                <div className="mt-1 p-3 bg-gray-50 rounded border">
                                  {processPreviewSubject(template.subject)}
                                </div>
                              </div>
                              <div>
                                <Label className="text-sm font-medium">Message:</Label>
                                <div className="mt-1 p-3 bg-gray-50 rounded border whitespace-pre-wrap">
                                  {processPreviewMessage(template.message)}
                                </div>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                <p className="font-medium">Available Variables:</p>
                                <ul className="mt-1 grid grid-cols-2 gap-1">
                                  <li>• {'{operatorName}'}</li>
                                  <li>• {'{serviceName}'}</li>
                                  <li>• {'{zipCode}'}</li>
                                  <li>• {'{earnings}'}</li>
                                  <li>• {'{orderId}'}</li>
                                  <li>• {'{orderNumber}'}</li>
                                  <li>• {'{expressBadge}'}</li>
                                  <li>• {'{expressText}'}</li>
                                </ul>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => setEditingTemplate({ ...template })}>
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Edit {template.channel.toUpperCase()} Template</DialogTitle>
                              <DialogDescription>
                                Customize the notification template sent to operators
                              </DialogDescription>
                            </DialogHeader>
                            {editingTemplate && editingTemplate.id === template.id && (
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <Label htmlFor="subject">Subject</Label>
                                  <Input
                                    id="subject"
                                    value={editingTemplate.subject}
                                    onChange={(e) => setEditingTemplate({
                                      ...editingTemplate,
                                      subject: e.target.value
                                    })}
                                    placeholder="Enter email subject"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="message">Message</Label>
                                  <Textarea
                                    id="message"
                                    value={editingTemplate.message}
                                    onChange={(e) => setEditingTemplate({
                                      ...editingTemplate,
                                      message: e.target.value
                                    })}
                                    placeholder="Enter message content"
                                    rows={10}
                                  />
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Switch
                                    id="active"
                                    checked={editingTemplate.is_active}
                                    onCheckedChange={(checked) => setEditingTemplate({
                                      ...editingTemplate,
                                      is_active: checked
                                    })}
                                  />
                                  <Label htmlFor="active">Active</Label>
                                </div>
                                <div className="flex gap-2 pt-4">
                                  <Button onClick={() => updateTemplate(editingTemplate)}>
                                    <Save className="h-4 w-4 mr-2" />
                                    Save Changes
                                  </Button>
                                  <Button
                                    variant="outline"
                                    onClick={() => resetToDefault(template)}
                                  >
                                    <RotateCcw className="h-4 w-4 mr-2" />
                                    Reset to Default
                                  </Button>
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm font-medium text-gray-700">Subject:</Label>
                        <p className="mt-1 text-sm">{template.subject}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-700">Message:</Label>
                        <p className="mt-1 text-sm whitespace-pre-wrap line-clamp-3">{template.message}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
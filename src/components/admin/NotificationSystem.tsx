import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Bell, 
  Send, 
  Users, 
  MapPin, 
  Calendar,
  ArrowLeft,
  Megaphone,
  AlertCircle,
  CheckCircle,
  Clock
} from "lucide-react";

interface NotificationSystemProps {
  onBack: () => void;
}

interface NotificationTemplate {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'success' | 'urgent';
}

export function NotificationSystem({ onBack }: NotificationSystemProps) {
  const [selectedAudience, setSelectedAudience] = useState<'all' | 'customers' | 'washers' | 'specific_zip'>('all');
  const [zipCode, setZipCode] = useState('');
  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationContent, setNotificationContent] = useState('');
  const [notificationType, setNotificationType] = useState<'info' | 'warning' | 'success' | 'urgent'>('info');
  const [isLoading, setIsLoading] = useState(false);
  const [recentNotifications, setRecentNotifications] = useState<any[]>([]);

  const { toast } = useToast();

  useEffect(() => {
    loadRecentNotifications();
  }, []);

  const loadRecentNotifications = async () => {
    // In a real implementation, you'd load notification history from a database
    // For now, we'll use mock data
    setRecentNotifications([
      {
        id: '1',
        title: 'System Maintenance',
        content: 'Scheduled maintenance tonight from 11 PM to 1 AM',
        type: 'warning',
        audience: 'all',
        sent_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        delivered_count: 245
      },
      {
        id: '2',
        title: 'New Express Service',
        content: 'Express service now available in Manhattan!',
        type: 'success',
        audience: 'customers',
        sent_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        delivered_count: 156
      },
      {
        id: '3',
        title: 'High Order Volume',
        content: 'Multiple orders available in your area',
        type: 'info',
        audience: 'washers',
        sent_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        delivered_count: 12
      }
    ]);
  };

  const predefinedTemplates: NotificationTemplate[] = [
    {
      id: 'maintenance',
      title: 'Scheduled Maintenance',
      content: 'We will be performing scheduled maintenance on [DATE] from [TIME] to [TIME]. Service may be temporarily unavailable.',
      type: 'warning'
    },
    {
      id: 'new_feature',
      title: 'New Feature Available',
      content: 'We\'ve added a new feature to improve your experience! Check it out in the app.',
      type: 'success'
    },
    {
      id: 'high_demand',
      title: 'High Demand Alert',
      content: 'Multiple orders are available in your service area. Log in to claim orders now!',
      type: 'info'
    },
    {
      id: 'urgent_orders',
      title: 'Urgent Orders Available',
      content: 'Express orders need immediate attention. Please check your dashboard.',
      type: 'urgent'
    },
    {
      id: 'promotion',
      title: 'Special Promotion',
      content: 'Enjoy 20% off your next order! Use code FRESH20 at checkout.',
      type: 'success'
    }
  ];

  const sendNotification = async () => {
    if (!notificationTitle || !notificationContent) {
      toast({
        title: "Missing Information",
        description: "Please provide both title and content for the notification.",
        variant: "destructive",
      });
      return;
    }

    if (selectedAudience === 'specific_zip' && !zipCode) {
      toast({
        title: "Missing Zip Code",
        description: "Please specify a zip code for targeted notifications.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // In a real implementation, this would:
      // 1. Store the notification in a database
      // 2. Send push notifications to mobile devices
      // 3. Send email notifications if configured
      // 4. Update user notification preferences
      
      // For now, we'll simulate the process
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Calculate estimated reach
      let estimatedReach = 0;
      switch (selectedAudience) {
        case 'all':
          estimatedReach = 250; // All users
          break;
        case 'customers':
          estimatedReach = 200; // Customer users
          break;
        case 'washers':
          estimatedReach = 15; // Washer users
          break;
        case 'specific_zip':
          estimatedReach = 35; // Users in specific zip
          break;
      }

      toast({
        title: "Notification Sent!",
        description: `Successfully sent to approximately ${estimatedReach} users.`,
      });

      // Add to recent notifications
      const newNotification = {
        id: Date.now().toString(),
        title: notificationTitle,
        content: notificationContent,
        type: notificationType,
        audience: selectedAudience,
        sent_at: new Date().toISOString(),
        delivered_count: estimatedReach
      };

      setRecentNotifications(prev => [newNotification, ...prev]);

      // Reset form
      setNotificationTitle('');
      setNotificationContent('');
      setNotificationType('info');
      setSelectedAudience('all');
      setZipCode('');

    } catch (error) {
      console.error('Error sending notification:', error);
      toast({
        title: "Send Failed",
        description: "Failed to send notification. Please try again.",
        variant: "destructive",
      });
    }

    setIsLoading(false);
  };

  const loadTemplate = (template: NotificationTemplate) => {
    setNotificationTitle(template.title);
    setNotificationContent(template.content);
    setNotificationType(template.type);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'success': return 'bg-green-100 text-green-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'urgent': return 'bg-red-100 text-red-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="h-4 w-4" />;
      case 'warning': return <AlertCircle className="h-4 w-4" />;
      case 'urgent': return <AlertCircle className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-wave">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={onBack}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Notification Center
          </h1>
          <p className="text-muted-foreground">
            Send targeted notifications to users and track engagement
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Send Notification */}
          <div className="space-y-6">
            <Card className="border-0 shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Megaphone className="h-5 w-5 text-primary" />
                  Send Notification
                </CardTitle>
                <CardDescription>
                  Create and send notifications to specific user groups
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="audience">Target Audience</Label>
                  <Select value={selectedAudience} onValueChange={(value: any) => setSelectedAudience(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select audience" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          All Users
                        </div>
                      </SelectItem>
                      <SelectItem value="customers">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Customers Only
                        </div>
                      </SelectItem>
                      <SelectItem value="washers">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Washers Only
                        </div>
                      </SelectItem>
                      <SelectItem value="specific_zip">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          Specific Zip Code
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {selectedAudience === 'specific_zip' && (
                  <div className="space-y-2">
                    <Label htmlFor="zipCode">Zip Code</Label>
                    <Input
                      id="zipCode"
                      value={zipCode}
                      onChange={(e) => setZipCode(e.target.value)}
                      placeholder="e.g., 10001"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="type">Notification Type</Label>
                  <Select value={notificationType} onValueChange={(value: any) => setNotificationType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">Information</SelectItem>
                      <SelectItem value="success">Success/Good News</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={notificationTitle}
                    onChange={(e) => setNotificationTitle(e.target.value)}
                    placeholder="Notification title..."
                    maxLength={50}
                  />
                  <p className="text-xs text-muted-foreground">
                    {notificationTitle.length}/50 characters
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content">Message</Label>
                  <Textarea
                    id="content"
                    value={notificationContent}
                    onChange={(e) => setNotificationContent(e.target.value)}
                    placeholder="Your message here..."
                    rows={4}
                    maxLength={200}
                  />
                  <p className="text-xs text-muted-foreground">
                    {notificationContent.length}/200 characters
                  </p>
                </div>

                <Button
                  variant="hero"
                  className="w-full"
                  onClick={sendNotification}
                  disabled={isLoading}
                >
                  <Send className="h-4 w-4 mr-2" />
                  {isLoading ? "Sending..." : "Send Notification"}
                </Button>
              </CardContent>
            </Card>

            {/* Quick Templates */}
            <Card className="border-0 shadow-soft">
              <CardHeader>
                <CardTitle>Quick Templates</CardTitle>
                <CardDescription>Pre-built notification templates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {predefinedTemplates.map((template) => (
                    <Button
                      key={template.id}
                      variant="outline"
                      className="w-full justify-start text-left h-auto p-3"
                      onClick={() => loadTemplate(template)}
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          {getTypeIcon(template.type)}
                          <span className="font-medium">{template.title}</span>
                          <Badge variant="secondary" className={getTypeColor(template.type)}>
                            {template.type}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground text-left">
                          {template.content.substring(0, 80)}...
                        </p>
                      </div>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Notifications */}
          <Card className="border-0 shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Recent Notifications
              </CardTitle>
              <CardDescription>Previously sent notifications and their performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentNotifications.map((notification) => (
                  <div key={notification.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(notification.type)}
                        <h4 className="font-medium">{notification.title}</h4>
                        <Badge variant="secondary" className={getTypeColor(notification.type)}>
                          {notification.type}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(notification.sent_at)}
                      </span>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-3">
                      {notification.content}
                    </p>
                    
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        Audience: <span className="capitalize">{notification.audience.replace('_', ' ')}</span>
                      </span>
                      <span className="font-medium">
                        Delivered to {notification.delivered_count} users
                      </span>
                    </div>
                  </div>
                ))}

                {recentNotifications.length === 0 && (
                  <div className="text-center py-8">
                    <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">No notifications sent yet</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
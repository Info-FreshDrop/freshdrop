import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Send, RefreshCw, Mail, MessageSquare, Bell } from 'lucide-react';

interface NotificationLog {
  id: string;
  order_id: string;
  customer_id: string;
  notification_type: string;
  status: string;
  recipient: string;
  message_content: string;
  error_message?: string;
  sent_at?: string;
  created_at: string;
}

export const NotificationTesting = () => {
  const { toast } = useToast();
  const [isTesting, setIsTesting] = useState(false);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  
  // Test form state
  const [testForm, setTestForm] = useState({
    orderId: '',
    customerId: '',
    status: 'claimed',
    customerEmail: '',
    customerPhone: '',
    customerName: '',
    orderNumber: ''
  });

  const statusOptions = [
    { value: 'unclaimed', label: 'Order Confirmed - Looking for Operator' },
    { value: 'claimed', label: 'Order Claimed - Operator Assigned' },
    { value: 'picked_up', label: 'Laundry Picked Up' },
    { value: 'washing', label: 'Laundry Being Washed' },
    { value: 'drying', label: 'Laundry Being Dried' },
    { value: 'folded', label: 'Laundry Folded & Ready' },
    { value: 'in_progress', label: 'Laundry In Progress' },
    { value: 'completed', label: 'Order Complete - Ready for Delivery' },
    { value: 'delivered', label: 'Order Delivered' },
    { value: 'cancelled', label: 'Order Cancelled' }
  ];

  const loadNotificationLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const { data, error } = await supabase
        .from('notification_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error loading logs:', error);
      toast({
        title: "Error",
        description: "Failed to load notification logs",
        variant: "destructive"
      });
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const testNotification = async () => {
    if (!testForm.customerId || !testForm.status) {
      toast({
        title: "Validation Error",
        description: "Customer ID and status are required",
        variant: "destructive"
      });
      return;
    }

    setIsTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-order-notifications', {
        body: {
          orderId: testForm.orderId || 'test-' + Date.now(),
          customerId: testForm.customerId,
          status: testForm.status,
          customerEmail: testForm.customerEmail || undefined,
          customerPhone: testForm.customerPhone || undefined,
          customerName: testForm.customerName || undefined,
          orderNumber: testForm.orderNumber || undefined
        }
      });

      if (error) throw error;

      toast({
        title: "Test Notification Sent",
        description: `Email: ${data?.emailSent ? 'Sent' : 'Failed'}, SMS: ${data?.smsSent ? 'Sent' : 'Failed'}`,
        variant: data?.success ? "default" : "destructive"
      });

      // Refresh logs
      setTimeout(() => loadNotificationLogs(), 1000);
      
    } catch (error) {
      console.error('Error testing notification:', error);
      toast({
        title: "Test Failed",
        description: error.message || "Failed to send test notification",
        variant: "destructive"
      });
    } finally {
      setIsTesting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'default';
      case 'failed': return 'destructive';
      case 'pending': return 'secondary';
      default: return 'outline';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'email': return <Mail className="h-4 w-4" />;
      case 'sms': return <MessageSquare className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  useEffect(() => {
    loadNotificationLogs();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Notification Testing</h1>
          <p className="text-muted-foreground">Test and monitor notification delivery</p>
        </div>
        <Button onClick={loadNotificationLogs} disabled={isLoadingLogs}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingLogs ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Test Notification Form */}
        <Card>
          <CardHeader>
            <CardTitle>Send Test Notification</CardTitle>
            <CardDescription>
              Send a test notification to verify the system is working
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customerId">Customer ID *</Label>
                <Input
                  id="customerId"
                  value={testForm.customerId}
                  onChange={(e) => setTestForm(prev => ({ ...prev, customerId: e.target.value }))}
                  placeholder="Enter customer UUID"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Notification Status *</Label>
                <Select
                  value={testForm.status}
                  onValueChange={(value) => setTestForm(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="orderId">Order ID</Label>
                <Input
                  id="orderId"
                  value={testForm.orderId}
                  onChange={(e) => setTestForm(prev => ({ ...prev, orderId: e.target.value }))}
                  placeholder="Optional order UUID"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="orderNumber">Order Number</Label>
                <Input
                  id="orderNumber"
                  value={testForm.orderNumber}
                  onChange={(e) => setTestForm(prev => ({ ...prev, orderNumber: e.target.value }))}
                  placeholder="Optional display number"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="customerName">Customer Name</Label>
              <Input
                id="customerName"
                value={testForm.customerName}
                onChange={(e) => setTestForm(prev => ({ ...prev, customerName: e.target.value }))}
                placeholder="Leave empty to fetch from profile"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customerEmail">Email</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={testForm.customerEmail}
                  onChange={(e) => setTestForm(prev => ({ ...prev, customerEmail: e.target.value }))}
                  placeholder="Leave empty to fetch from auth"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerPhone">Phone</Label>
                <Input
                  id="customerPhone"
                  value={testForm.customerPhone}
                  onChange={(e) => setTestForm(prev => ({ ...prev, customerPhone: e.target.value }))}
                  placeholder="Leave empty to fetch from profile"
                />
              </div>
            </div>

            <Button onClick={testNotification} disabled={isTesting} className="w-full">
              {isTesting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Send Test Notification
            </Button>
          </CardContent>
        </Card>

        {/* Recent Notifications Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Notification Stats (Last 24h)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {logs.filter(log => log.status === 'sent' && 
                    new Date(log.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)).length}
                </div>
                <div className="text-sm text-muted-foreground">Sent</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {logs.filter(log => log.status === 'failed' && 
                    new Date(log.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)).length}
                </div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notification Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Notification Logs</CardTitle>
          <CardDescription>
            Latest 50 notification attempts with status and error details
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingLogs ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Sent At</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getTypeIcon(log.notification_type)}
                        <span className="capitalize">{log.notification_type}</span>
                      </div>
                    </TableCell>
                    <TableCell>{log.recipient}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(log.status)}>
                        {log.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {log.order_id?.substring(0, 8)}...
                    </TableCell>
                    <TableCell>
                      {log.sent_at ? new Date(log.sent_at).toLocaleString() : '-'}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {log.error_message || '-'}
                    </TableCell>
                  </TableRow>
                ))}
                {logs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No notification logs found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
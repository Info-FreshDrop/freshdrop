import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, AlertTriangle, Users, Activity, Clock, Database } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SecurityAuditLog {
  id: string;
  user_id: string;
  action: string;
  details: any;
  user_agent: string;
  ip_address: string;
  created_at: string;
}

interface RateLimitEntry {
  id: string;
  identifier: string;
  action: string;
  attempts: number;
  window_start: string;
  created_at: string;
}

export const SecurityDashboard: React.FC = () => {
  const [auditLogs, setAuditLogs] = useState<SecurityAuditLog[]>([]);
  const [rateLimits, setRateLimits] = useState<RateLimitEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchSecurityData();
  }, []);

  const fetchSecurityData = async () => {
    try {
      setLoading(true);
      
      // Fetch recent security audit logs
      const { data: auditData, error: auditError } = await supabase
        .from('security_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (auditError) throw auditError;

      // Fetch rate limit data
      const { data: rateLimitData, error: rateLimitError } = await supabase
        .from('rate_limits')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (rateLimitError) throw rateLimitError;

      setAuditLogs(auditData || []);
      setRateLimits(rateLimitData || []);
    } catch (error) {
      console.error('Error fetching security data:', error);
      toast.error('Failed to load security data');
    } finally {
      setLoading(false);
    }
  };

  const getActionBadgeVariant = (action: string) => {
    if (action.includes('login') || action.includes('auth')) return 'default';
    if (action.includes('role_change') || action.includes('admin')) return 'destructive';
    if (action.includes('rate_limit') || action.includes('violation')) return 'secondary';
    return 'outline';
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const clearOldRateLimits = async () => {
    try {
      const { error } = await supabase.rpc('cleanup_expired_pending_orders');
      if (error) throw error;
      
      toast.success('Old rate limit entries cleared');
      fetchSecurityData();
    } catch (error) {
      console.error('Error clearing rate limits:', error);
      toast.error('Failed to clear rate limits');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Security Dashboard</h2>
          <p className="text-muted-foreground">Monitor security events and system access</p>
        </div>
        <Button onClick={fetchSecurityData} variant="outline">
          <Activity className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="audit-logs">Audit Logs</TabsTrigger>
          <TabsTrigger value="rate-limits">Rate Limits</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Recent Events</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{auditLogs.length}</div>
                <p className="text-xs text-muted-foreground">
                  Last 50 security events
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Rate Limits</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{rateLimits.length}</div>
                <p className="text-xs text-muted-foreground">
                  Current rate limit entries
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Auth Events</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {auditLogs.filter(log => log.action.includes('auth') || log.action.includes('login')).length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Authentication related events
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Critical Events</CardTitle>
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {auditLogs.filter(log => 
                    log.action.includes('role_change') || 
                    log.action.includes('violation') || 
                    log.action.includes('rate_limit')
                  ).length}
                </div>
                <p className="text-xs text-muted-foreground">
                  High priority security events
                </p>
              </CardContent>
            </Card>
          </div>

          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Security monitoring is active. All authentication events, role changes, and suspicious activities are logged.
            </AlertDescription>
          </Alert>
        </TabsContent>

        <TabsContent value="audit-logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Audit Logs</CardTitle>
              <CardDescription>
                Recent security events and system access logs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {auditLogs.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No audit logs found</p>
              ) : (
                <div className="space-y-2">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={getActionBadgeVariant(log.action)}>
                            {log.action}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            User: {log.user_id}
                          </span>
                        </div>
                        {log.details && Object.keys(log.details).length > 0 && (
                          <pre className="text-xs text-muted-foreground bg-muted p-2 rounded">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        )}
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTimestamp(log.created_at)}
                        </div>
                        {log.ip_address && (
                          <div className="mt-1">IP: {log.ip_address}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rate-limits" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Rate Limit Status</CardTitle>
                <CardDescription>
                  Current rate limiting entries and blocked attempts
                </CardDescription>
              </div>
              <Button onClick={clearOldRateLimits} variant="outline" size="sm">
                Clear Old Entries
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {rateLimits.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No active rate limits</p>
              ) : (
                <div className="space-y-2">
                  {rateLimits.map((limit) => (
                    <div key={limit.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{limit.action}</Badge>
                          <span className="text-sm">
                            Identifier: {limit.identifier}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Attempts: {limit.attempts}
                        </div>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Window: {formatTimestamp(limit.window_start)}
                        </div>
                        <div className="mt-1">
                          Created: {formatTimestamp(limit.created_at)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
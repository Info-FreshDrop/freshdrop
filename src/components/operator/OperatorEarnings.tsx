import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DollarSign, Calendar, Clock, TrendingUp, Wallet, RefreshCw } from 'lucide-react';
import { formatDistanceToNow, startOfWeek, endOfWeek, subWeeks, format } from 'date-fns';

interface Earning {
  id: string;
  order_id: string;
  revenue_share_cents: number;
  tips_cents: number;
  total_earnings_cents: number;
  status: string; // Changed from 'pending' | 'paid' to string
  earned_at: string;
  order?: {
    id: string;
    status: string;
    created_at: string;
  };
}

interface Payout {
  id: string;
  total_amount_cents: number;
  earnings_count: number;
  status: string; // Changed from specific union to string
  payout_period_start: string;
  payout_period_end: string;
  processed_at?: string;
}

interface EarningsSummary {
  pending_earnings_cents: number;
  paid_earnings_cents: number;
  total_orders: number;
  avg_earnings_per_order_cents: number;
}

export const OperatorEarnings: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [summary, setSummary] = useState<EarningsSummary>({
    pending_earnings_cents: 0,
    paid_earnings_cents: 0,
    total_orders: 0,
    avg_earnings_per_order_cents: 0
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'earnings' | 'payouts'>('earnings');
  const [selectedWeek, setSelectedWeek] = useState<string>('current');
  const [calculatingEarnings, setCalculatingEarnings] = useState(false);

  useEffect(() => {
    if (user) {
      loadEarningsData();
    }
  }, [user, selectedWeek]);

  const getWeekRange = (weekSelection: string) => {
    const now = new Date();
    switch (weekSelection) {
      case 'current':
        return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
      case 'last':
        const lastWeek = subWeeks(now, 1);
        return { start: startOfWeek(lastWeek, { weekStartsOn: 1 }), end: endOfWeek(lastWeek, { weekStartsOn: 1 }) };
      case 'two':
        const twoWeeksAgo = subWeeks(now, 2);
        return { start: startOfWeek(twoWeeksAgo, { weekStartsOn: 1 }), end: endOfWeek(twoWeeksAgo, { weekStartsOn: 1 }) };
      case 'all':
      default:
        return null;
    }
  };

  const loadEarningsData = async () => {
    try {
      // Get operator ID from washers table
      const { data: washer, error: washerError } = await supabase
        .from('washers')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (washerError || !washer) {
        toast({
          title: "Error",
          description: "Could not find operator profile",
          variant: "destructive"
        });
        return;
      }

      // Build earnings query with date filter
      const weekRange = getWeekRange(selectedWeek);
      let earningsQuery = supabase
        .from('operator_earnings')
        .select('*')
        .eq('operator_id', washer.id);

      if (weekRange) {
        earningsQuery = earningsQuery
          .gte('earned_at', weekRange.start.toISOString())
          .lte('earned_at', weekRange.end.toISOString());
      }

      const { data: earningsData, error: earningsError } = await earningsQuery
        .order('earned_at', { ascending: false });

      if (earningsError) {
        console.error('Error loading earnings:', earningsError);
        toast({
          title: "Error",
          description: "Failed to load earnings data",
          variant: "destructive"
        });
        return;
      }

      // Load payouts
      const { data: payoutsData, error: payoutsError } = await supabase
        .from('payouts')
        .select('*')
        .eq('operator_id', washer.id)
        .order('created_at', { ascending: false });

      if (payoutsError) {
        console.error('Error loading payouts:', payoutsError);
      }

      // Calculate summary
      const pendingEarnings = earningsData?.filter(e => e.status === 'pending') || [];
      const paidEarnings = earningsData?.filter(e => e.status === 'paid') || [];
      
      const summaryData: EarningsSummary = {
        pending_earnings_cents: pendingEarnings.reduce((sum, e) => sum + e.total_earnings_cents, 0),
        paid_earnings_cents: paidEarnings.reduce((sum, e) => sum + e.total_earnings_cents, 0),
        total_orders: earningsData?.length || 0,
        avg_earnings_per_order_cents: earningsData?.length 
          ? Math.round(earningsData.reduce((sum, e) => sum + e.total_earnings_cents, 0) / earningsData.length)
          : 0
      };

      setEarnings(earningsData || []);
      setPayouts(payoutsData || []);
      setSummary(summaryData);
      
    } catch (error) {
      console.error('Error in loadEarningsData:', error);
      toast({
        title: "Error",
        description: "Failed to load earnings data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateMissingEarnings = async () => {
    try {
      setCalculatingEarnings(true);
      
      // Get operator ID
      const { data: washer, error: washerError } = await supabase
        .from('washers')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (washerError || !washer) return;

      // Get completed orders without earnings
      const { data: completedOrders, error: ordersError } = await supabase
        .from('orders')
        .select('id')
        .eq('washer_id', washer.id)
        .eq('status', 'completed');

      if (ordersError) throw ordersError;

      // Calculate earnings for each order
      for (const order of completedOrders || []) {
        try {
          await supabase.functions.invoke('calculate-operator-earnings', {
            body: { order_id: order.id }
          });
        } catch (error) {
          console.error(`Error calculating earnings for order ${order.id}:`, error);
        }
      }

      toast({
        title: "Success",
        description: "Earnings calculated successfully"
      });

      // Reload data
      loadEarningsData();
    } catch (error) {
      console.error('Error calculating earnings:', error);
      toast({
        title: "Error",
        description: "Failed to calculate earnings",
        variant: "destructive"
      });
    } finally {
      setCalculatingEarnings(false);
    }
  };

  const formatCurrency = (cents: number): string => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'paid': return 'bg-green-100 text-green-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-sm text-muted-foreground">Loading earnings...</div>
        </div>
      </div>
    );
  }

  const getWeekOptions = () => [
    { value: 'all', label: 'All Time' },
    { value: 'current', label: 'Current Week' },
    { value: 'last', label: 'Last Week' },
    { value: 'two', label: '2 Weeks Ago' }
  ];

  return (
    <div className="space-y-6">
      {/* Week Selection and Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Earnings Dashboard</h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Select value={selectedWeek} onValueChange={setSelectedWeek}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getWeekOptions().map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        
        <Button 
          onClick={calculateMissingEarnings}
          disabled={calculatingEarnings}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${calculatingEarnings ? 'animate-spin' : ''}`} />
          {calculatingEarnings ? 'Calculating...' : 'Sync Earnings'}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Pending Earnings
                </p>
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(summary.pending_earnings_cents)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Total Paid
                </p>
                <p className="text-2xl font-bold">
                  {formatCurrency(summary.paid_earnings_cents)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Completed Orders
                </p>
                <p className="text-2xl font-bold">
                  {summary.total_orders}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Avg per Order
                </p>
                <p className="text-2xl font-bold">
                  {formatCurrency(summary.avg_earnings_per_order_cents)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation */}
      <div className="flex space-x-4 border-b">
        <Button
          variant={activeTab === 'earnings' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('earnings')}
        >
          Recent Earnings
        </Button>
        <Button
          variant={activeTab === 'payouts' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('payouts')}
        >
          Payout History
        </Button>
      </div>

      {/* Earnings List */}
      {activeTab === 'earnings' && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Earnings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {earnings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No earnings yet. Complete your first order to start earning!
                </div>
              ) : (
                earnings.map((earning) => (
                  <div key={earning.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="font-medium">Order #{earning.order_id.slice(0, 8)}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(earning.earned_at), { addSuffix: true })}
                          </p>
                        </div>
                        <Badge className={getStatusColor(earning.status)}>
                          {earning.status}
                        </Badge>
                      </div>
                      <div className="mt-2 text-sm text-muted-foreground">
                        Revenue Share: {formatCurrency(earning.revenue_share_cents)}
                        {earning.tips_cents > 0 && (
                          <> • Tips: {formatCurrency(earning.tips_cents)}</>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary">
                        {formatCurrency(earning.total_earnings_cents)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payouts List */}
      {activeTab === 'payouts' && (
        <Card>
          <CardHeader>
            <CardTitle>Payout History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {payouts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No payouts yet. Payouts are processed weekly.
                </div>
              ) : (
                payouts.map((payout) => (
                  <div key={payout.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="font-medium">
                            {formatDate(payout.payout_period_start)} - {formatDate(payout.payout_period_end)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {payout.earnings_count} orders included
                          </p>
                          {payout.processed_at && (
                            <p className="text-sm text-muted-foreground">
                              Processed {formatDate(payout.processed_at)}
                            </p>
                          )}
                        </div>
                        <Badge className={getStatusColor(payout.status)}>
                          {payout.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">
                        {formatCurrency(payout.total_amount_cents)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
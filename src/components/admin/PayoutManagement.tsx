import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DollarSign, Users, Calendar, AlertTriangle, Send, Eye } from 'lucide-react';
import { formatDistanceToNow, subDays, startOfDay, endOfDay } from 'date-fns';

interface OperatorEarnings {
  operator_id: string;
  operator_name: string;
  operator_email: string;
  pending_earnings_cents: number;
  pending_orders_count: number;
  last_earning_date: string;
}

interface PendingPayout {
  operator_id: string;
  operator_name: string;
  operator_email: string;
  total_earnings_cents: number;
  earnings_count: number;
  oldest_earning_date: string;
  earnings: Array<{
    id: string;
    order_id: string;
    revenue_share_cents: number;
    tips_cents: number;
    total_earnings_cents: number;
    earned_at: string;
  }>;
}

interface PayoutHistory {
  id: string;
  operator_id: string;
  operator_name: string;
  total_amount_cents: number;
  earnings_count: number;
  status: string;
  payout_period_start: string;
  payout_period_end: string;
  processed_at?: string;
  notes?: string;
}

export const PayoutManagement: React.FC = () => {
  const { toast } = useToast();
  
  const [operatorEarnings, setOperatorEarnings] = useState<OperatorEarnings[]>([]);
  const [payoutHistory, setPayoutHistory] = useState<PayoutHistory[]>([]);
  const [selectedOperatorPayouts, setSelectedOperatorPayouts] = useState<PendingPayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingPayouts, setProcessingPayouts] = useState(false);
  const [selectedPayoutPeriod, setSelectedPayoutPeriod] = useState('7'); // days
  const [viewPayoutDetails, setViewPayoutDetails] = useState<PendingPayout | null>(null);

  useEffect(() => {
    loadPayoutData();
  }, []);

  const loadPayoutData = async () => {
    try {
      // Load operator earnings summary - simplified query
      const { data: earningsData, error: earningsError } = await supabase
        .from('operator_earnings')
        .select('*')
        .eq('status', 'pending');

      if (earningsError) {
        console.error('Error loading earnings:', earningsError);
        toast({
          title: "Error",
          description: "Failed to load earnings data",
          variant: "destructive"
        });
        return;
      }

      // Get washer details separately
      const operatorIds = [...new Set(earningsData?.map(e => e.operator_id) || [])];
      const { data: washersData, error: washersError } = await supabase
        .from('washers')
        .select(`
          id,
          profiles!inner(first_name, last_name)
        `)
        .in('id', operatorIds);

      if (washersError) {
        console.error('Error loading washers:', washersError);
      }

      // Create washer lookup map
      const washerMap = new Map(
        washersData?.map(w => [
          w.id, 
          {
            name: w.profiles?.first_name && w.profiles?.last_name 
              ? `${w.profiles.first_name} ${w.profiles.last_name}`
              : 'Unknown Operator',
            email: ''
          }
        ]) || []
      );

      // Group earnings by operator
      const operatorEarningsMap = new Map<string, OperatorEarnings>();
      
      earningsData?.forEach((earning) => {
        const operatorId = earning.operator_id;
        const washerInfo = washerMap.get(operatorId);
        const operatorName = washerInfo?.name || 'Unknown Operator';
        const operatorEmail = washerInfo?.email || '';

        if (!operatorEarningsMap.has(operatorId)) {
          operatorEarningsMap.set(operatorId, {
            operator_id: operatorId,
            operator_name: operatorName,
            operator_email: operatorEmail,
            pending_earnings_cents: 0,
            pending_orders_count: 0,
            last_earning_date: earning.earned_at
          });
        }

        const summary = operatorEarningsMap.get(operatorId)!;
        summary.pending_earnings_cents += earning.total_earnings_cents;
        summary.pending_orders_count += 1;
        
        // Keep the most recent earning date
        if (new Date(earning.earned_at) > new Date(summary.last_earning_date)) {
          summary.last_earning_date = earning.earned_at;
        }
      });

      // Load payout history - simplified query
      const { data: historyData, error: historyError } = await supabase
        .from('payouts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (historyError) {
        console.error('Error loading payout history:', historyError);
      }

      const formattedHistory: PayoutHistory[] = historyData?.map(payout => ({
        id: payout.id,
        operator_id: payout.operator_id,
        operator_name: washerMap.get(payout.operator_id)?.name || 'Unknown Operator',
        total_amount_cents: payout.total_amount_cents,
        earnings_count: payout.earnings_count,
        status: payout.status,
        payout_period_start: payout.payout_period_start,
        payout_period_end: payout.payout_period_end,
        processed_at: payout.processed_at,
        notes: payout.notes
      })) || [];

      setOperatorEarnings(Array.from(operatorEarningsMap.values()));
      setPayoutHistory(formattedHistory);
      
    } catch (error) {
      console.error('Error in loadPayoutData:', error);
      toast({
        title: "Error",
        description: "Failed to load payout data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const preparePayouts = async () => {
    try {
      const periodDays = parseInt(selectedPayoutPeriod);
      const cutoffDate = subDays(new Date(), periodDays);
      
      // Get detailed earnings for operators that have earnings older than cutoff - simplified query
      const { data: detailedEarnings, error } = await supabase
        .from('operator_earnings')
        .select('*')
        .eq('status', 'pending')
        .lte('earned_at', cutoffDate.toISOString());

      if (error) {
        console.error('Error preparing payouts:', error);
        toast({
          title: "Error",
          description: "Failed to prepare payouts",
          variant: "destructive"
        });
        return;
      }

      // Get washer details separately
      const operatorIds = [...new Set(detailedEarnings?.map(e => e.operator_id) || [])];
      const { data: washersData, error: washersError } = await supabase
        .from('washers')
        .select(`
          id,
          profiles!inner(first_name, last_name)
        `)
        .in('id', operatorIds);

      if (washersError) {
        console.error('Error loading washers:', washersError);
      }

      // Create washer lookup map
      const washerMap = new Map(
        washersData?.map(w => [
          w.id, 
          {
            name: w.profiles?.first_name && w.profiles?.last_name 
              ? `${w.profiles.first_name} ${w.profiles.last_name}`
              : 'Unknown Operator',
            email: ''
          }
        ]) || []
      );

      // Group by operator
      const operatorPayoutsMap = new Map<string, PendingPayout>();
      
      detailedEarnings?.forEach((earning) => {
        const operatorId = earning.operator_id;
        const washerInfo = washerMap.get(operatorId);
        const operatorName = washerInfo?.name || 'Unknown Operator';
        const operatorEmail = washerInfo?.email || '';

        if (!operatorPayoutsMap.has(operatorId)) {
          operatorPayoutsMap.set(operatorId, {
            operator_id: operatorId,
            operator_name: operatorName,
            operator_email: operatorEmail,
            total_earnings_cents: 0,
            earnings_count: 0,
            oldest_earning_date: earning.earned_at,
            earnings: []
          });
        }

        const payout = operatorPayoutsMap.get(operatorId)!;
        payout.total_earnings_cents += earning.total_earnings_cents;
        payout.earnings_count += 1;
        payout.earnings.push({
          id: earning.id,
          order_id: earning.order_id,
          revenue_share_cents: earning.revenue_share_cents,
          tips_cents: earning.tips_cents,
          total_earnings_cents: earning.total_earnings_cents,
          earned_at: earning.earned_at
        });
        
        // Keep the oldest earning date
        if (new Date(earning.earned_at) < new Date(payout.oldest_earning_date)) {
          payout.oldest_earning_date = earning.earned_at;
        }
      });

      setSelectedOperatorPayouts(Array.from(operatorPayoutsMap.values()));
    } catch (error) {
      console.error('Error preparing payouts:', error);
      toast({
        title: "Error",
        description: "Failed to prepare payouts",
        variant: "destructive"
      });
    }
  };

  const processPayouts = async () => {
    if (selectedOperatorPayouts.length === 0) return;

    setProcessingPayouts(true);
    
    try {
      const periodStart = startOfDay(subDays(new Date(), parseInt(selectedPayoutPeriod)));
      const periodEnd = endOfDay(new Date());

      for (const operatorPayout of selectedOperatorPayouts) {
        // Create payout record
        const { data: payout, error: payoutError } = await supabase
          .from('payouts')
          .insert({
            operator_id: operatorPayout.operator_id,
            total_amount_cents: operatorPayout.total_earnings_cents,
            earnings_count: operatorPayout.earnings_count,
            payout_period_start: periodStart.toISOString(),
            payout_period_end: periodEnd.toISOString(),
            status: 'completed', // For now, mark as completed. In production, this would be 'pending' until payment processor confirms
            processed_at: new Date().toISOString(),
            notes: `Batch payout for ${operatorPayout.earnings_count} orders`
          })
          .select()
          .single();

        if (payoutError) {
          console.error('Error creating payout:', payoutError);
          continue;
        }

        // Create payout_earnings junction records and mark earnings as paid
        const earningIds = operatorPayout.earnings.map(e => e.id);
        
        // Insert junction records
        const junctionRecords = earningIds.map(earningId => ({
          payout_id: payout.id,
          earning_id: earningId
        }));

        await supabase
          .from('payout_earnings')
          .insert(junctionRecords);

        // Mark earnings as paid
        await supabase
          .from('operator_earnings')
          .update({ status: 'paid' })
          .in('id', earningIds);
      }

      toast({
        title: "Payouts Processed",
        description: `Successfully processed payouts for ${selectedOperatorPayouts.length} operators`,
      });

      setSelectedOperatorPayouts([]);
      loadPayoutData();
      
    } catch (error) {
      console.error('Error processing payouts:', error);
      toast({
        title: "Error",
        description: "Failed to process payouts",
        variant: "destructive"
      });
    } finally {
      setProcessingPayouts(false);
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
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const totalPendingPayouts = selectedOperatorPayouts.reduce((sum, op) => sum + op.total_earnings_cents, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-sm text-muted-foreground">Loading payout data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Total Pending
                </p>
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(operatorEarnings.reduce((sum, op) => sum + op.pending_earnings_cents, 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Operators with Earnings
                </p>
                <p className="text-2xl font-bold">
                  {operatorEarnings.length}
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
                  Total Orders
                </p>
                <p className="text-2xl font-bold">
                  {operatorEarnings.reduce((sum, op) => sum + op.pending_orders_count, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payout Processing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Process Payouts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Payout Period:</label>
              <Select value={selectedPayoutPeriod} onValueChange={setSelectedPayoutPeriod}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="14">Last 14 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={preparePayouts} disabled={processingPayouts}>
              Prepare Payouts
            </Button>
          </div>

          {selectedOperatorPayouts.length > 0 && (
            <>
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Ready to process payouts for {selectedOperatorPayouts.length} operators totaling {formatCurrency(totalPendingPayouts)}
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                {selectedOperatorPayouts.map((payout) => (
                  <div key={payout.operator_id} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex-1">
                      <p className="font-medium">{payout.operator_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {payout.earnings_count} orders • Oldest: {formatDistanceToNow(new Date(payout.oldest_earning_date), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setViewPayoutDetails(payout)}
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Payout Details - {payout.operator_name}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 max-h-96 overflow-y-auto">
                            {payout.earnings.map((earning) => (
                              <div key={earning.id} className="flex justify-between p-3 border rounded">
                                <div>
                                  <p className="font-medium">Order #{earning.order_id.slice(0, 8)}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {formatDate(earning.earned_at)}
                                  </p>
                                  <p className="text-sm">
                                    Revenue: {formatCurrency(earning.revenue_share_cents)}
                                    {earning.tips_cents > 0 && ` + Tips: ${formatCurrency(earning.tips_cents)}`}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold">{formatCurrency(earning.total_earnings_cents)}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </DialogContent>
                      </Dialog>
                      <span className="font-bold text-primary">{formatCurrency(payout.total_earnings_cents)}</span>
                    </div>
                  </div>
                ))}
              </div>

              <Button 
                onClick={processPayouts} 
                disabled={processingPayouts}
                className="w-full"
              >
                {processingPayouts ? 'Processing...' : `Process ${selectedOperatorPayouts.length} Payouts`}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Current Pending Earnings */}
      <Card>
        <CardHeader>
          <CardTitle>Operator Earnings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {operatorEarnings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No pending earnings found
              </div>
            ) : (
              operatorEarnings.map((operator) => (
                <div key={operator.operator_id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">{operator.operator_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {operator.pending_orders_count} orders • Last earning {formatDistanceToNow(new Date(operator.last_earning_date), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary">
                      {formatCurrency(operator.pending_earnings_cents)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payout History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Payouts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {payoutHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No payouts processed yet
              </div>
            ) : (
              payoutHistory.map((payout) => (
                <div key={payout.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-medium">{payout.operator_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(payout.payout_period_start)} - {formatDate(payout.payout_period_end)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {payout.earnings_count} orders
                        </p>
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
                    {payout.processed_at && (
                      <p className="text-sm text-muted-foreground">
                        {formatDate(payout.processed_at)}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

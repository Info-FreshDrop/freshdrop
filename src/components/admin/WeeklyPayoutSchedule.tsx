import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, DollarSign, Users, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { format, startOfWeek, endOfWeek, subWeeks } from "date-fns";

interface PayoutSchedule {
  id: string;
  week_start_date: string;
  week_end_date: string;
  status: string;
  total_contractors: number;
  total_amount_cents: number;
  processed_at: string | null;
  created_at: string;
}

interface WeeklyPayoutScheduleProps {
  contractors: any[];
  onPayoutProcessed: () => void;
}

export const WeeklyPayoutSchedule = ({ contractors, onPayoutProcessed }: WeeklyPayoutScheduleProps) => {
  const [schedules, setSchedules] = useState<PayoutSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  const loadSchedules = async () => {
    try {
      const { data, error } = await supabase
        .from('payout_schedules')
        .select('*')
        .order('week_start_date', { ascending: false })
        .limit(10);

      if (error) throw error;
      setSchedules(data || []);
    } catch (error) {
      console.error('Error loading payout schedules:', error);
      toast({
        title: "Error",
        description: "Failed to load payout schedules",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchedules();
  }, []);

  const createWeeklySchedule = async () => {
    setProcessing(true);
    try {
      // Create schedule for the previous week (Sunday to Saturday)
      const today = new Date();
      const lastSunday = startOfWeek(subWeeks(today, 1), { weekStartsOn: 0 });
      const lastSaturday = endOfWeek(subWeeks(today, 1), { weekStartsOn: 0 });

      const { data, error } = await supabase.functions.invoke('process-weekly-payouts', {
        body: {
          week_start: format(lastSunday, 'yyyy-MM-dd'),
          week_end: format(lastSaturday, 'yyyy-MM-dd'),
        },
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Weekly payout schedule created for ${format(lastSunday, 'MMM d')} - ${format(lastSaturday, 'MMM d, yyyy')}`,
      });

      loadSchedules();
      onPayoutProcessed();
    } catch (error) {
      console.error('Error creating weekly schedule:', error);
      toast({
        title: "Error",
        description: "Failed to create weekly payout schedule",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const processSchedulePayouts = async (scheduleId: string) => {
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-weekly-payouts', {
        body: {
          schedule_id: scheduleId,
        },
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Payouts processed successfully",
      });

      loadSchedules();
      onPayoutProcessed();
    } catch (error) {
      console.error('Error processing payouts:', error);
      toast({
        title: "Error",
        description: "Failed to process payouts",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="secondary">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case 'processing':
        return (
          <Badge variant="default">
            <AlertCircle className="w-3 h-3 mr-1" />
            Processing
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Calculate eligible earnings for next payout
  const eligibleContractors = contractors.filter(c => 
    c.pending_earnings > 0 && 
    c.w9_completed && 
    c.ach_verified
  );
  
  const totalEligibleEarnings = eligibleContractors.reduce((sum, c) => sum + c.pending_earnings, 0);

  if (loading) {
    return <div className="flex justify-center p-8">Loading payout schedules...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Next Payout Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Next Weekly Payout
          </CardTitle>
          <CardDescription>
            Preview of contractors eligible for the next weekly payout
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3 mb-4">
            <div className="text-center p-4 border rounded-lg">
              <Users className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <div className="text-2xl font-bold">{eligibleContractors.length}</div>
              <div className="text-sm text-muted-foreground">Eligible Contractors</div>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <DollarSign className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <div className="text-2xl font-bold">{formatCurrency(totalEligibleEarnings)}</div>
              <div className="text-sm text-muted-foreground">Total Amount</div>
            </div>

            <div className="text-center p-4 border rounded-lg">
              <Calendar className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <div className="text-2xl font-bold">Sunday</div>
              <div className="text-sm text-muted-foreground">Payout Day</div>
            </div>
          </div>

          <Button 
            onClick={createWeeklySchedule}
            disabled={processing || eligibleContractors.length === 0}
            className="w-full"
          >
            {processing ? "Creating Schedule..." : "Create Weekly Payout Schedule"}
          </Button>

          {eligibleContractors.length === 0 && (
            <p className="text-sm text-muted-foreground text-center mt-2">
              No contractors are currently eligible for payouts
            </p>
          )}
        </CardContent>
      </Card>

      {/* Payout History */}
      <Card>
        <CardHeader>
          <CardTitle>Payout History</CardTitle>
          <CardDescription>
            Recent weekly payout schedules and their status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {schedules.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No payout schedules found. Create your first weekly payout above.
              </p>
            ) : (
              schedules.map((schedule) => (
                <div key={schedule.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">
                        Week of {format(new Date(schedule.week_start_date), 'MMM d')} - {format(new Date(schedule.week_end_date), 'MMM d, yyyy')}
                      </h3>
                      {getStatusBadge(schedule.status)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {schedule.total_contractors} contractors • {formatCurrency(schedule.total_amount_cents)}
                    </div>
                    {schedule.processed_at && (
                      <div className="text-xs text-muted-foreground">
                        Processed on {format(new Date(schedule.processed_at), 'MMM d, yyyy h:mm a')}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {schedule.status === 'pending' && (
                      <Button
                        onClick={() => processSchedulePayouts(schedule.id)}
                        disabled={processing}
                        size="sm"
                      >
                        {processing ? "Processing..." : "Process Payouts"}
                      </Button>
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
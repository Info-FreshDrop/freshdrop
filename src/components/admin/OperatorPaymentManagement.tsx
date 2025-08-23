import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { 
  DollarSign, 
  Edit,
  Percent,
  TrendingUp,
  Users,
  CalendarIcon,
  Eye,
  Clock
} from "lucide-react";

interface OperatorEarnings {
  id: string;
  user_id: string;
  is_active: boolean;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  total_earnings_cents: number;
  pending_earnings_cents: number;
  paid_earnings_cents: number;
  total_orders: number;
  total_tips_cents: number;
}

interface EarningDetail {
  id: string;
  order_id: string;
  revenue_share_cents: number;
  tips_cents: number;
  total_earnings_cents: number;
  status: string;
  earned_at: string;
  order_total_cents: number;
}

interface RevenueSplit {
  business_percentage: number;
  operator_percentage: number;
}

export function OperatorPaymentManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [operators, setOperators] = useState<OperatorEarnings[]>([]);
  const [revenueSplit, setRevenueSplit] = useState<RevenueSplit>({ business_percentage: 50, operator_percentage: 50 });
  const [loading, setLoading] = useState(false);
  const [editingRevenue, setEditingRevenue] = useState(false);
  const [newOperatorPercentage, setNewOperatorPercentage] = useState(50);
  
  // Date range filtering
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  
  // Operator details modal
  const [selectedOperator, setSelectedOperator] = useState<OperatorEarnings | null>(null);
  const [operatorDetails, setOperatorDetails] = useState<EarningDetail[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    loadOperators();
    loadRevenueSplit();
  }, [startDate, endDate]);

  const loadOperators = async () => {
    try {
      setLoading(true);
      
      // Get operators with earnings data
      const { data: washersData, error: washersError } = await supabase
        .from('washers')
        .select(`
          id,
          user_id,
          is_active,
          profiles!inner(
            first_name,
            last_name,
            email
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (washersError) throw washersError;

      // Get earnings for each operator
      const operatorsWithEarnings: OperatorEarnings[] = [];
      
      for (const washer of washersData || []) {
        const profile = Array.isArray(washer.profiles) ? washer.profiles[0] : washer.profiles;
        
        // Get earnings for each operator with date filtering
        let earningsQuery = supabase
          .from('operator_earnings')
          .select('revenue_share_cents, tips_cents, status, earned_at')
          .eq('operator_id', washer.id);
          
        if (startDate) {
          earningsQuery = earningsQuery.gte('earned_at', startDate.toISOString());
        }
        if (endDate) {
          const endOfDay = new Date(endDate);
          endOfDay.setHours(23, 59, 59, 999);
          earningsQuery = earningsQuery.lte('earned_at', endOfDay.toISOString());
        }
        
        const { data: earnings, error: earningsError } = await earningsQuery;

        if (earningsError) {
          console.error('Error loading earnings:', earningsError);
          continue;
        }

        const totalEarnings = earnings?.reduce((sum, e) => sum + e.revenue_share_cents + e.tips_cents, 0) || 0;
        const pendingEarnings = earnings?.filter(e => e.status === 'pending').reduce((sum, e) => sum + e.revenue_share_cents + e.tips_cents, 0) || 0;
        const paidEarnings = earnings?.filter(e => e.status === 'paid').reduce((sum, e) => sum + e.revenue_share_cents + e.tips_cents, 0) || 0;
        const totalTips = earnings?.reduce((sum, e) => sum + e.tips_cents, 0) || 0;

        operatorsWithEarnings.push({
          id: washer.id,
          user_id: washer.user_id,
          is_active: washer.is_active,
          first_name: profile?.first_name,
          last_name: profile?.last_name,
          email: profile?.email,
          total_earnings_cents: totalEarnings,
          pending_earnings_cents: pendingEarnings,
          paid_earnings_cents: paidEarnings,
          total_orders: earnings?.length || 0,
          total_tips_cents: totalTips
        });
      }

      setOperators(operatorsWithEarnings);
    } catch (error) {
      console.error('Error loading operators:', error);
      toast({
        title: "Error",
        description: "Failed to load operator information",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadRevenueSplit = async () => {
    try {
      const { data, error } = await supabase
        .from('business_settings')
        .select('setting_value')
        .eq('setting_key', 'revenue_split')
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data?.setting_value) {
        const split = data.setting_value as any;
        setRevenueSplit({
          business_percentage: split.business_percentage || 50,
          operator_percentage: split.operator_percentage || 50
        });
        setNewOperatorPercentage(split.operator_percentage || 50);
      }
    } catch (error) {
      console.error('Error loading revenue split:', error);
    }
  };

  const handleUpdateRevenueSplit = async () => {
    if (!user) return;

    try {
      const businessPercentage = 100 - newOperatorPercentage;
      
      const { error } = await supabase
        .from('business_settings')
        .upsert({
          setting_key: 'revenue_split',
          setting_value: {
            business_percentage: businessPercentage,
            operator_percentage: newOperatorPercentage
          },
          updated_by: user.id,
          description: 'Revenue split between business and operators'
        });

      if (error) throw error;

      setRevenueSplit({
        business_percentage: businessPercentage,
        operator_percentage: newOperatorPercentage
      });

      toast({
        title: "Success",
        description: "Revenue split updated successfully"
      });

      setEditingRevenue(false);
      loadOperators();
    } catch (error) {
      console.error('Error updating revenue split:', error);
      toast({
        title: "Error",
        description: "Failed to update revenue split",
        variant: "destructive"
      });
    }
  };

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const getOperatorName = (operator: OperatorEarnings) => {
    if (operator.first_name && operator.last_name) {
      return `${operator.first_name} ${operator.last_name}`;
    }
    return operator.email || "Unknown Operator";
  };

  const loadOperatorDetails = async (operatorId: string) => {
    try {
      setDetailsLoading(true);
      
      let detailsQuery = supabase
        .from('operator_earnings')
        .select(`
          id,
          order_id,
          revenue_share_cents,
          tips_cents,
          total_earnings_cents,
          status,
          earned_at
        `)
        .eq('operator_id', operatorId)
        .order('earned_at', { ascending: false });
        
      if (startDate) {
        detailsQuery = detailsQuery.gte('earned_at', startDate.toISOString());
      }
      if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        detailsQuery = detailsQuery.lte('earned_at', endOfDay.toISOString());
      }
      
      const { data, error } = await detailsQuery;
      
      if (error) throw error;
      
      const details: EarningDetail[] = (data || []).map(item => ({
        id: item.id,
        order_id: item.order_id,
        revenue_share_cents: item.revenue_share_cents,
        tips_cents: item.tips_cents,
        total_earnings_cents: item.total_earnings_cents,
        status: item.status,
        earned_at: item.earned_at,
        order_total_cents: 0 // We'll get this separately if needed
      }));
      
      setOperatorDetails(details);
    } catch (error) {
      console.error('Error loading operator details:', error);
      toast({
        title: "Error",
        description: "Failed to load operator details",
        variant: "destructive"
      });
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleOperatorClick = (operator: OperatorEarnings) => {
    setSelectedOperator(operator);
    loadOperatorDetails(operator.id);
  };

  const getDateRangeText = () => {
    if (!startDate && !endDate) return "All Time";
    if (startDate && endDate) return `${format(startDate, "MMM d")} - ${format(endDate, "MMM d, yyyy")}`;
    if (startDate) return `Since ${format(startDate, "MMM d, yyyy")}`;
    if (endDate) return `Until ${format(endDate, "MMM d, yyyy")}`;
    return "All Time";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="text-sm text-muted-foreground">Loading operator earnings...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Revenue Split Management */}
      <Card className="border-0 shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Percent className="h-5 w-5 text-primary" />
            Revenue Split Configuration
          </CardTitle>
          <CardDescription>
            Configure how order revenue is split between business and operators
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="text-sm font-medium">Current Split</div>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-primary">{revenueSplit.business_percentage}%</div>
                  <div className="text-sm text-muted-foreground">Business</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-primary">{revenueSplit.operator_percentage}%</div>
                  <div className="text-sm text-muted-foreground">Operator</div>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <Button
                variant="outline"
                onClick={() => setEditingRevenue(true)}
                className="w-full"
              >
                <Edit className="h-4 w-4 mr-2" />
                Update Revenue Split
              </Button>
              <div className="text-xs text-muted-foreground">
                Operators receive their percentage of each completed order plus any tips received from customers.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Operator Earnings Overview */}
      <Card className="border-0 shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Operator Earnings Overview
          </CardTitle>
          <CardDescription className="flex items-center justify-between flex-wrap gap-4">
            <div>View earnings and performance for all active operators</div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4" />
              <span className="font-medium">{getDateRangeText()}</span>
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Date Range Filters */}
          <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium">Filter Period:</Label>
            </div>
            
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">From:</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[140px] justify-start text-left font-normal text-xs",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3 w-3" />
                    {startDate ? format(startDate, "MMM d, yyyy") : "Start date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">To:</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[140px] justify-start text-left font-normal text-xs",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3 w-3" />
                    {endDate ? format(endDate, "MMM d, yyyy") : "End date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                setStartDate(undefined);
                setEndDate(undefined);
              }}
              className="text-xs"
            >
              Clear Dates
            </Button>
          </div>
          {operators.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No active operators found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {operators.map((operator) => (
                <div
                  key={operator.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => handleOperatorClick(operator)}
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="font-medium">{getOperatorName(operator)}</h3>
                      <Badge variant="outline" className="text-xs">
                        Active
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        <span className="text-muted-foreground">Total Earnings:</span>
                        <span className="font-medium">{formatCurrency(operator.total_earnings_cents)}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-orange-500" />
                        <span className="text-muted-foreground">Pending:</span>
                        <span className="font-medium text-orange-600">{formatCurrency(operator.pending_earnings_cents)}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-green-500" />
                        <span className="text-muted-foreground">Paid:</span>
                        <span className="font-medium text-green-600">{formatCurrency(operator.paid_earnings_cents)}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary" />
                        <span className="text-muted-foreground">Orders:</span>
                        <span className="font-medium">{operator.total_orders}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-xs text-muted-foreground">
                        Revenue Share: {revenueSplit.operator_percentage}% • Tips: {formatCurrency(operator.total_tips_cents)}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOperatorClick(operator);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View Details
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Revenue Split Dialog */}
      <Dialog open={editingRevenue} onOpenChange={setEditingRevenue}>
        <DialogContent className="max-w-[95vw] sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Update Revenue Split</DialogTitle>
            <DialogDescription>
              Adjust how order revenue is divided between the business and operators.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div>
              <Label htmlFor="operator_percentage">Operator Revenue Share</Label>
              <div className="flex items-center gap-4 mt-2">
                <Input
                  id="operator_percentage"
                  type="number"
                  min="10"
                  max="90"
                  value={newOperatorPercentage}
                  onChange={(e) => setNewOperatorPercentage(parseInt(e.target.value) || 50)}
                  className="w-20"
                />
                <span className="text-sm">%</span>
                <div className="flex-1">
                  <div className="text-sm text-muted-foreground">
                    Business gets {100 - newOperatorPercentage}%
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium text-sm mb-3">Preview</h4>
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground mb-2">
                  For a $30.00 order:
                </div>
                <div className="flex justify-between text-sm">
                  <span>Business Revenue:</span>
                  <span className="font-medium">${((30 * (100 - newOperatorPercentage)) / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Operator Revenue:</span>
                  <span className="font-medium">${((30 * newOperatorPercentage) / 100).toFixed(2)}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  + Any tips received go 100% to the operator
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRevenue(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateRevenueSplit}>
              Update Split
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Operator Details Dialog */}
      <Dialog open={!!selectedOperator} onOpenChange={() => setSelectedOperator(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-[800px] max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              {selectedOperator ? getOperatorName(selectedOperator) : "Operator"} - Earnings Details
            </DialogTitle>
            <DialogDescription>
              Detailed breakdown of earnings for the selected time period: {getDateRangeText()}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden">
            {selectedOperator && (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-lg font-bold text-primary">{formatCurrency(selectedOperator.total_earnings_cents)}</div>
                    <div className="text-xs text-muted-foreground">Total Earnings</div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-lg font-bold text-orange-600">{formatCurrency(selectedOperator.pending_earnings_cents)}</div>
                    <div className="text-xs text-muted-foreground">Pending</div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-lg font-bold text-green-600">{formatCurrency(selectedOperator.paid_earnings_cents)}</div>
                    <div className="text-xs text-muted-foreground">Paid</div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-lg font-bold text-primary">{selectedOperator.total_orders}</div>
                    <div className="text-xs text-muted-foreground">Orders</div>
                  </div>
                </div>

                {/* Earnings List */}
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  <div className="text-sm font-medium mb-2">Individual Earnings</div>
                  {detailsLoading ? (
                    <div className="text-center py-8">
                      <div className="text-sm text-muted-foreground">Loading earnings details...</div>
                    </div>
                  ) : operatorDetails.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-sm text-muted-foreground">No earnings found for selected period</div>
                    </div>
                  ) : (
                    operatorDetails.map((detail) => (
                      <div
                        key={detail.id}
                        className="flex items-center justify-between p-3 border rounded-lg text-sm"
                      >
                        <div className="space-y-1">
                          <div className="font-medium">Order #{detail.order_id.slice(0, 8)}...</div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(detail.earned_at), "MMM d, yyyy 'at' h:mm a")}
                          </div>
                        </div>
                        
                        <div className="text-right space-y-1">
                          <div className="font-medium">{formatCurrency(detail.total_earnings_cents)}</div>
                          <div className="text-xs text-muted-foreground">
                            Revenue: {formatCurrency(detail.revenue_share_cents)}
                            {detail.tips_cents > 0 && ` + Tips: ${formatCurrency(detail.tips_cents)}`}
                          </div>
                          <div className="text-xs">
                            <Badge 
                              variant={detail.status === 'paid' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {detail.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
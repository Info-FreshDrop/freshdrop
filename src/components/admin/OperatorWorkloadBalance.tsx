import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  ArrowLeft,
  Users,
  Package,
  Clock,
  TrendingUp,
  UserCheck,
  AlertTriangle,
  BarChart3,
  Settings,
  Shuffle,
  Eye,
  Star,
  DollarSign,
  MapPin,
  Phone
} from "lucide-react";

interface OperatorStats {
  id: string;
  user_id: string;
  is_online: boolean;
  zip_codes: string[];
  profiles: {
    first_name: string;
    last_name: string;
    phone: string;
  };
  activeOrders: number;
  completedOrders: number;
  totalEarnings: number;
  averageRating: number;
  responseTime: number; // minutes
  workloadScore: number; // 0-100
}

interface OperatorWorkloadBalanceProps {
  onBack: () => void;
}

export function OperatorWorkloadBalance({ onBack }: OperatorWorkloadBalanceProps) {
  const { toast } = useToast();
  const [operators, setOperators] = useState<OperatorStats[]>([]);
  const [selectedOperator, setSelectedOperator] = useState<OperatorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [balanceDialogOpen, setBalanceDialogOpen] = useState(false);
  const [sortBy, setSortBy] = useState("workload");
  const [filterZipCode, setFilterZipCode] = useState("all");
  const [availableZipCodes, setAvailableZipCodes] = useState<string[]>([]);

  useEffect(() => {
    loadOperatorStats();
  }, []);

  const loadOperatorStats = async () => {
    try {
      // Get all active operators with their profiles
      const { data: operatorsData, error: operatorsError } = await supabase
        .from('washers')
        .select(`
          id,
          user_id,
          is_online,
          zip_codes,
          profiles!washers_user_id_fkey(first_name, last_name, phone)
        `)
        .eq('is_active', true)
        .eq('approval_status', 'approved');

      if (operatorsError) throw operatorsError;

      // Get orders data for each operator
      const operatorStats: OperatorStats[] = [];
      const allZipCodes = new Set<string>();

      for (const operator of operatorsData || []) {
        // Add zip codes to the set
        operator.zip_codes?.forEach((zip: string) => allZipCodes.add(zip));

        // Get active orders count
        const { count: activeCount } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('washer_id', operator.id)
          .in('status', ['claimed', 'in_progress', 'washed']);

        // Get completed orders
        const { data: completedOrders, count: completedCount } = await supabase
          .from('orders')
          .select('total_amount_cents, operator_payout_cents, completed_at')
          .eq('washer_id', operator.id)
          .eq('status', 'completed');

        // Calculate total earnings (50% of completed orders)
        const totalEarnings = completedOrders?.reduce((sum, order) => 
          sum + (order.operator_payout_cents || order.total_amount_cents * 0.5), 0
        ) || 0;

        // Get ratings (simulate for now since we don't have ratings table)
        const averageRating = 4.2 + Math.random() * 0.8; // Simulate ratings between 4.2-5.0

        // Calculate response time (simulate for now)
        const responseTime = Math.floor(Math.random() * 30) + 5; // 5-35 minutes

        // Calculate workload score (0-100, where 100 is overloaded)
        const maxActiveOrders = 5; // Assume max capacity is 5 active orders
        const workloadScore = Math.min(((activeCount || 0) / maxActiveOrders) * 100, 100);

        operatorStats.push({
          id: operator.id,
          user_id: operator.user_id,
          is_online: operator.is_online,
          zip_codes: operator.zip_codes || [],
          profiles: operator.profiles as any,
          activeOrders: activeCount || 0,
          completedOrders: completedCount || 0,
          totalEarnings,
          averageRating,
          responseTime,
          workloadScore
        });
      }

      // Sort operators based on selected criteria
      operatorStats.sort((a, b) => {
        switch (sortBy) {
          case 'workload':
            return b.workloadScore - a.workloadScore;
          case 'earnings':
            return b.totalEarnings - a.totalEarnings;
          case 'rating':
            return b.averageRating - a.averageRating;
          case 'orders':
            return b.completedOrders - a.completedOrders;
          default:
            return b.workloadScore - a.workloadScore;
        }
      });

      setOperators(operatorStats);
      setAvailableZipCodes(Array.from(allZipCodes).sort());
    } catch (error) {
      console.error('Error loading operator stats:', error);
      toast({
        title: "Error",
        description: "Failed to load operator statistics",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const redistributeWorkload = async () => {
    try {
      // Get all unclaimed orders
      const { data: unclaimedOrders } = await supabase
        .from('orders')
        .select('id, zip_code')
        .eq('status', 'unclaimed');

      if (!unclaimedOrders || unclaimedOrders.length === 0) {
        toast({
          title: "No Orders to Redistribute",
          description: "All orders are already assigned or completed",
        });
        return;
      }

      // Find operators with lowest workload
      const availableOperators = operators
        .filter(op => op.is_online && op.workloadScore < 80)
        .sort((a, b) => a.workloadScore - b.workloadScore);

      if (availableOperators.length === 0) {
        toast({
          title: "No Available Operators",
          description: "All operators are at capacity or offline",
          variant: "destructive"
        });
        return;
      }

      // Simulate redistribution (in a real app, you'd implement actual assignment logic)
      let assignedCount = 0;
      for (const order of unclaimedOrders.slice(0, 5)) {
        // Find operator in the zip code with lowest workload
        const eligibleOperators = availableOperators.filter(op => 
          op.zip_codes.includes(order.zip_code)
        );

        if (eligibleOperators.length > 0) {
          const selectedOperator = eligibleOperators[0];
          
          // Assign order to operator
          await supabase
            .from('orders')
            .update({
              washer_id: selectedOperator.id,
              status: 'claimed',
              claimed_at: new Date().toISOString()
            })
            .eq('id', order.id);

          assignedCount++;
        }
      }

      toast({
        title: "Workload Redistributed",
        description: `Successfully assigned ${assignedCount} orders to available operators`,
      });

      setBalanceDialogOpen(false);
      loadOperatorStats();
    } catch (error) {
      console.error('Error redistributing workload:', error);
      toast({
        title: "Error",
        description: "Failed to redistribute workload",
        variant: "destructive"
      });
    }
  };

  const filteredOperators = operators.filter(operator => {
    if (filterZipCode === "all") return true;
    return operator.zip_codes.includes(filterZipCode);
  });

  const getWorkloadColor = (score: number) => {
    if (score >= 80) return 'text-red-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getWorkloadLabel = (score: number) => {
    if (score >= 80) return 'Overloaded';
    if (score >= 60) return 'Busy';
    if (score >= 30) return 'Moderate';
    return 'Available';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-wave flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading operator statistics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-wave">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={onBack}
            className="p-0 h-auto text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Operator Workload Balance
              </h1>
              <p className="text-muted-foreground">
                Monitor and optimize operator workload distribution
              </p>
            </div>
            
            <div className="flex gap-2">
              <Dialog open={balanceDialogOpen} onOpenChange={setBalanceDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Shuffle className="h-4 w-4 mr-2" />
                    Auto Balance
                  </Button>
                </DialogTrigger>
              </Dialog>
              
              <Button variant="outline" onClick={loadOperatorStats}>
                <BarChart3 className="h-4 w-4 mr-2" />
                Refresh Stats
              </Button>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-6">
          <Card className="border-0 shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Operators</p>
                  <p className="text-2xl font-bold">{operators.length}</p>
                </div>
                <Users className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Online Now</p>
                  <p className="text-2xl font-bold text-green-600">
                    {operators.filter(op => op.is_online).length}
                  </p>
                </div>
                <UserCheck className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Overloaded</p>
                  <p className="text-2xl font-bold text-red-600">
                    {operators.filter(op => op.workloadScore >= 80).length}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg. Workload</p>
                  <p className="text-2xl font-bold">
                    {operators.length > 0 
                      ? Math.round(operators.reduce((sum, op) => sum + op.workloadScore, 0) / operators.length)
                      : 0}%
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-accent" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Sort */}
        <Card className="mb-6 border-0 shadow-soft">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <div>
                <Label className="text-sm">Sort by</Label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="workload">Workload</SelectItem>
                    <SelectItem value="earnings">Earnings</SelectItem>
                    <SelectItem value="rating">Rating</SelectItem>
                    <SelectItem value="orders">Completed Orders</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="text-sm">Filter by Zip Code</Label>
                <Select value={filterZipCode} onValueChange={setFilterZipCode}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Areas</SelectItem>
                    {availableZipCodes.map((zip) => (
                      <SelectItem key={zip} value={zip}>{zip}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Operators List */}
        <div className="space-y-4">
          {filteredOperators.length === 0 ? (
            <Card className="p-8 text-center border-0 shadow-soft">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No operators found</h3>
              <p className="text-muted-foreground">Try adjusting your filters</p>
            </Card>
          ) : (
            filteredOperators.map((operator) => (
              <Card key={operator.id} className="border-0 shadow-soft">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">
                          {operator.profiles.first_name} {operator.profiles.last_name}
                        </h3>
                        <Badge variant={operator.is_online ? "default" : "secondary"}>
                          {operator.is_online ? "🟢 Online" : "🔴 Offline"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {operator.profiles.phone}
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {operator.zip_codes.join(', ')}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right space-y-1">
                      <div className={`font-bold ${getWorkloadColor(operator.workloadScore)}`}>
                        {getWorkloadLabel(operator.workloadScore)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {operator.workloadScore.toFixed(0)}% capacity
                      </div>
                    </div>
                  </div>

                  {/* Workload Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Current Workload</span>
                      <span className="text-sm text-muted-foreground">
                        {operator.activeOrders} active orders
                      </span>
                    </div>
                    <Progress 
                      value={operator.workloadScore} 
                      className="h-2"
                    />
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-lg font-bold">{operator.activeOrders}</div>
                      <div className="text-xs text-muted-foreground">Active Orders</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-lg font-bold">{operator.completedOrders}</div>
                      <div className="text-xs text-muted-foreground">Completed</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-lg font-bold flex items-center justify-center gap-1">
                        <Star className="h-3 w-3 text-yellow-500" />
                        {operator.averageRating.toFixed(1)}
                      </div>
                      <div className="text-xs text-muted-foreground">Rating</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-lg font-bold text-green-600">
                        ${(operator.totalEarnings / 100).toFixed(0)}
                      </div>
                      <div className="text-xs text-muted-foreground">Earnings</div>
                    </div>
                  </div>

                  {/* Performance Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Avg. Response Time:</span>
                      <span className="font-medium">{operator.responseTime} min</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Efficiency Score:</span>
                      <span className="font-medium">
                        {Math.round(100 - operator.workloadScore + operator.averageRating * 10)}%
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 mt-4">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedOperator(operator)}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View Details
                    </Button>
                    
                    {operator.workloadScore >= 80 && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-orange-600 border-orange-600"
                      >
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Reduce Load
                      </Button>
                    )}
                    
                    {operator.workloadScore <= 30 && operator.is_online && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-green-600 border-green-600"
                      >
                        <Package className="h-3 w-3 mr-1" />
                        Assign More
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Auto Balance Dialog */}
        <Dialog open={balanceDialogOpen} onOpenChange={setBalanceDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Auto Balance Workload</DialogTitle>
              <DialogDescription>
                Automatically redistribute orders to balance operator workloads
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">Balance Strategy</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Reassign unclaimed orders to available operators</li>
                  <li>• Prioritize operators with lower workload scores</li>
                  <li>• Respect zip code coverage areas</li>
                  <li>• Maintain service quality standards</li>
                </ul>
              </div>
              
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Current Status</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Overloaded operators:</span>
                    <span className="ml-2 font-medium text-red-600">
                      {operators.filter(op => op.workloadScore >= 80).length}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Available operators:</span>
                    <span className="ml-2 font-medium text-green-600">
                      {operators.filter(op => op.workloadScore < 60 && op.is_online).length}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={redistributeWorkload} className="flex-1">
                  <Shuffle className="h-4 w-4 mr-2" />
                  Start Auto Balance
                </Button>
                <Button variant="outline" onClick={() => setBalanceDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
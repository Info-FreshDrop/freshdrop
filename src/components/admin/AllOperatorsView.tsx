import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  ArrowLeft, 
  Users, 
  Search, 
  Filter,
  User,
  MapPin,
  Calendar,
  Eye,
  EyeOff,
  UserCheck,
  UserX,
  Phone,
  Mail
} from "lucide-react";

interface AllOperatorsViewProps {
  onBack: () => void;
}

interface Operator {
  id: string;
  user_id: string;
  approval_status: string;
  is_active: boolean;
  is_online: boolean;
  zip_codes: string[];
  locker_access: string[];
  created_at: string;
  profiles?: {
    first_name?: string;
    last_name?: string;
    phone?: string;
  } | null;
}

interface OperatorStats {
  totalOrders: number;
  completedOrders: number;
  averageRating: number;
  totalRevenue: number;
}

export function AllOperatorsView({ onBack }: AllOperatorsViewProps) {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [filteredOperators, setFilteredOperators] = useState<Operator[]>([]);
  const [operatorStats, setOperatorStats] = useState<Record<string, OperatorStats>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'pending' | 'rejected'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'created_at' | 'orders' | 'revenue'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadOperators();
  }, []);

  useEffect(() => {
    filterAndSortOperators();
  }, [operators, searchTerm, statusFilter, sortBy, sortDirection]);

  const loadOperators = async () => {
    try {
      // Fetch all operators directly from washers table
      const { data: operatorData, error: operatorError } = await supabase
        .from('washers')
        .select('*')
        .order('created_at', { ascending: false });

      if (operatorError) throw operatorError;

      // Fetch profile data separately for each operator
      const operatorsWithProfiles = await Promise.all(
        (operatorData || []).map(async (operator) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name, phone')
            .eq('user_id', operator.user_id)
            .maybeSingle();

          return {
            ...operator,
            profiles: profile
          };
        })
      );

      setOperators(operatorsWithProfiles);

      // Fetch stats for each operator
      const statsPromises = operatorsWithProfiles.map(async (operator) => {
        const { data: orders } = await supabase
          .from('orders')
          .select('id, total_amount_cents, status')
          .eq('washer_id', operator.id);

        const orderIds = orders?.map(o => o.id) || [];
        let ratings: any[] = [];
        
        if (orderIds.length > 0) {
          const { data: ratingsData } = await supabase
            .from('order_ratings')
            .select('overall_rating')
            .in('order_id', orderIds);
          ratings = ratingsData || [];
        }

        const totalOrders = orders?.length || 0;
        const completedOrders = orders?.filter(o => o.status === 'completed').length || 0;
        const totalRevenue = orders?.filter(o => o.status === 'completed')
          .reduce((sum, o) => sum + (o.total_amount_cents || 0), 0) || 0;
        const averageRating = ratings?.length > 0 
          ? ratings.reduce((sum, r) => sum + (r.overall_rating || 0), 0) / ratings.length
          : 0;

        return {
          operatorId: operator.id,
          stats: {
            totalOrders,
            completedOrders,
            averageRating,
            totalRevenue
          }
        };
      });

      const statsResults = await Promise.all(statsPromises);
      const statsMap = statsResults.reduce((acc, { operatorId, stats }) => {
        acc[operatorId] = stats;
        return acc;
      }, {} as Record<string, OperatorStats>);

      setOperatorStats(statsMap);
    } catch (error) {
      console.error('Error loading operators:', error);
      toast({
        title: "Error",
        description: "Failed to load operators",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterAndSortOperators = () => {
    let filtered = [...operators];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(operator => {
        const fullName = `${operator.profiles?.first_name || ''} ${operator.profiles?.last_name || ''}`.toLowerCase();
        const zipCodes = operator.zip_codes?.join(' ').toLowerCase() || '';
        return fullName.includes(searchTerm.toLowerCase()) || zipCodes.includes(searchTerm.toLowerCase());
      });
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(operator => {
        switch (statusFilter) {
          case 'active':
            return operator.approval_status === 'approved' && operator.is_active;
          case 'inactive':
            return operator.approval_status === 'approved' && !operator.is_active;
          case 'pending':
            return operator.approval_status === 'pending';
          case 'rejected':
            return operator.approval_status === 'rejected';
          default:
            return true;
        }
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          const nameA = `${a.profiles?.first_name || ''} ${a.profiles?.last_name || ''}`;
          const nameB = `${b.profiles?.first_name || ''} ${b.profiles?.last_name || ''}`;
          comparison = nameA.localeCompare(nameB);
          break;
        case 'created_at':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'orders':
          const ordersA = operatorStats[a.id]?.totalOrders || 0;
          const ordersB = operatorStats[b.id]?.totalOrders || 0;
          comparison = ordersA - ordersB;
          break;
        case 'revenue':
          const revenueA = operatorStats[a.id]?.totalRevenue || 0;
          const revenueB = operatorStats[b.id]?.totalRevenue || 0;
          comparison = revenueA - revenueB;
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    setFilteredOperators(filtered);
  };

  const toggleOperatorStatus = async (operatorId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('washers')
        .update({ is_active: !isActive })
        .eq('id', operatorId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Operator ${!isActive ? 'activated' : 'deactivated'} successfully`
      });

      loadOperators();
    } catch (error) {
      console.error('Error toggling operator status:', error);
      toast({
        title: "Error",
        description: "Failed to update operator status",
        variant: "destructive"
      });
    }
  };

  const updateApprovalStatus = async (operatorId: string, status: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('washers')
        .update({ 
          approval_status: status,
          is_active: status === 'approved'
        })
        .eq('id', operatorId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Operator ${status} successfully`
      });

      loadOperators();
    } catch (error) {
      console.error('Error updating approval status:', error);
      toast({
        title: "Error",
        description: "Failed to update approval status",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (operator: Operator) => {
    if (operator.approval_status === 'pending') {
      return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Pending</Badge>;
    }
    if (operator.approval_status === 'rejected') {
      return <Badge variant="destructive">Rejected</Badge>;
    }
    if (!operator.is_active) {
      return <Badge variant="secondary">Inactive</Badge>;
    }
    return operator.is_online 
      ? <Badge className="bg-green-100 text-green-800 border-green-300">Online</Badge>
      : <Badge variant="outline" className="text-green-600 border-green-600">Active</Badge>;
  };

  const getDisplayName = (operator: Operator) => {
    if (operator.profiles?.first_name || operator.profiles?.last_name) {
      return `${operator.profiles.first_name || ''} ${operator.profiles.last_name || ''}`.trim();
    }
    return `Operator #${operator.id.slice(0, 8)}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-wave flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading operators...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-wave">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
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
            All Operators
          </h1>
          <p className="text-muted-foreground">
            Manage all operators with advanced filtering and sorting
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="border-0 shadow-soft">
            <CardContent className="p-4">
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
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active</p>
                  <p className="text-2xl font-bold text-green-600">
                    {operators.filter(op => op.approval_status === 'approved' && op.is_active).length}
                  </p>
                </div>
                <UserCheck className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-soft">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {operators.filter(op => op.approval_status === 'pending').length}
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-soft">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Online Now</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {operators.filter(op => op.is_online).length}
                  </p>
                </div>
                <Eye className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="border-0 shadow-soft mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search by name or zip code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="created_at">Join Date</SelectItem>
                  <SelectItem value="orders">Total Orders</SelectItem>
                  <SelectItem value="revenue">Revenue</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortDirection} onValueChange={(value: any) => setSortDirection(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Direction" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Ascending</SelectItem>
                  <SelectItem value="desc">Descending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Operators Table */}
        <Card className="border-0 shadow-soft">
          <CardHeader>
            <CardTitle>Operators ({filteredOperators.length})</CardTitle>
            <CardDescription>
              Complete operator management with performance metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredOperators.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No operators found</h3>
                <p className="text-muted-foreground">
                  {searchTerm || statusFilter !== 'all' 
                    ? 'Try adjusting your filters to see more results'
                    : 'No operators have been added yet'
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOperators.map((operator) => {
                  const stats = operatorStats[operator.id] || { totalOrders: 0, completedOrders: 0, averageRating: 0, totalRevenue: 0 };
                  
                  return (
                    <div key={operator.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <User className="h-5 w-5 text-muted-foreground" />
                              <h4 className="font-medium text-lg">{getDisplayName(operator)}</h4>
                            </div>
                            {getStatusBadge(operator)}
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <span>Zip Codes: {operator.zip_codes?.join(', ') || 'None'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span>Joined: {new Date(operator.created_at).toLocaleDateString()}</span>
                            </div>
                            {operator.profiles?.phone && (
                              <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <span>{operator.profiles.phone}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <span>Lockers: {operator.locker_access?.length || 0}</span>
                            </div>
                          </div>

                          {/* Performance Stats */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm bg-muted/50 p-3 rounded">
                            <div>
                              <p className="text-muted-foreground">Total Orders</p>
                              <p className="font-medium">{stats.totalOrders}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Completed</p>
                              <p className="font-medium">{stats.completedOrders}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Avg Rating</p>
                              <p className="font-medium">{stats.averageRating > 0 ? stats.averageRating.toFixed(1) : 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Revenue</p>
                              <p className="font-medium text-green-600">${(stats.totalRevenue / 100).toFixed(2)}</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          {operator.approval_status === 'pending' && (
                            <>
                              <Button 
                                size="sm" 
                                onClick={() => updateApprovalStatus(operator.id, 'approved')}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <UserCheck className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Button 
                                size="sm" 
                                variant="destructive"
                                onClick={() => updateApprovalStatus(operator.id, 'rejected')}
                              >
                                <UserX className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </>
                          )}
                          
                          {operator.approval_status === 'approved' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => toggleOperatorStatus(operator.id, operator.is_active)}
                            >
                              {operator.is_active ? (
                                <>
                                  <EyeOff className="h-4 w-4 mr-1" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <Eye className="h-4 w-4 mr-1" />
                                  Activate
                                </>
                              )}
                            </Button>
                          )}

                          {operator.approval_status === 'rejected' && (
                            <Button 
                              size="sm" 
                              onClick={() => updateApprovalStatus(operator.id, 'approved')}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              <UserCheck className="h-4 w-4 mr-1" />
                              Reinstate
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
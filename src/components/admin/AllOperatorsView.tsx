import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  CheckCircle, 
  X, 
  UserCheck, 
  UserX,
  Package,
  DollarSign,
  Clock,
  Star,
  FileText,
  Eye,
  ArrowLeft
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { OperatorDetailModal } from "./OperatorDetailModal";
import { supabase } from "@/integrations/supabase/client";

interface AllOperatorsViewProps {
  onBack: () => void;
}

interface Operator {
  id: string;
  user_id: string;
  zip_codes: string[];
  is_active: boolean;
  approval_status: string;
  created_at: string;
  bank_account_info?: any;
  ach_verified?: boolean;
  availability_schedule?: any;
  service_radius_miles?: number;
  profiles: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    business_name?: string;
    tax_id?: string;
    tax_address?: any;
    w9_completed?: boolean;
    is_contractor?: boolean;
    contractor_start_date?: string;
  } | null;
}

interface OperatorStats {
  completed_orders: number;
  total_earnings: number;
  average_rating: number;
  pending_payout: number;
  paid_payout: number;
}

export function AllOperatorsView({ onBack }: AllOperatorsViewProps) {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [filteredOperators, setFilteredOperators] = useState<Operator[]>([]);
  const [operatorStats, setOperatorStats] = useState<Record<string, OperatorStats>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'pending' | 'rejected'>('all');
  const [loading, setLoading] = useState(true);
  const [selectedOperator, setSelectedOperator] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadOperators();
  }, []);

  useEffect(() => {
    filterAndSortOperators();
  }, [operators, searchTerm, statusFilter]);

  const loadOperators = async () => {
    setLoading(true);
    try {
      // Load operators with profiles including contractor information
      const { data: operators, error } = await supabase
        .from('washers')
        .select(`
          id,
          user_id,
          zip_codes,
          is_active,
          approval_status,
          created_at,
          bank_account_info,
          ach_verified,
          availability_schedule,
          service_radius_miles
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Load profiles separately for each operator
      const operatorsWithProfiles = await Promise.all(
        (operators || []).map(async (operator: any) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select(`
              first_name,
              last_name,
              email,
              phone,
              business_name,
              tax_id,
              tax_address,
              w9_completed,
              is_contractor,
              contractor_start_date
            `)
            .eq('user_id', operator.user_id)
            .maybeSingle();

          return {
            ...operator,
            profiles: profile
          };
        })
      );

      setOperators(operatorsWithProfiles);
      
      // Load all stats
      const statsMap: Record<string, OperatorStats> = {};
      for (const operator of operatorsWithProfiles) {
        statsMap[operator.id] = await loadOperatorStats(operator.id);
      }
      setOperatorStats(statsMap);
    } catch (error) {
      console.error('Error loading operators:', error);
      toast({
        title: "Error",
        description: "Failed to load operators",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadOperatorStats = async (operatorId: string): Promise<OperatorStats> => {
    try {
      // Get completed orders and earnings
      const { data: earnings } = await supabase
        .from('operator_earnings')
        .select('total_earnings_cents, status')
        .eq('operator_id', operatorId);

      const totalEarnings = earnings?.reduce((sum, earning) => sum + earning.total_earnings_cents, 0) || 0;
      const pendingPayout = earnings?.filter(e => e.status === 'pending')?.reduce((sum, e) => sum + e.total_earnings_cents, 0) || 0;
      const paidPayout = earnings?.filter(e => e.status === 'paid')?.reduce((sum, e) => sum + e.total_earnings_cents, 0) || 0;

      const { data: orders } = await supabase
        .from('orders')
        .select('id')
        .eq('washer_id', operatorId)
        .eq('status', 'completed');

      return {
        completed_orders: orders?.length || 0,
        total_earnings: totalEarnings,
        average_rating: 0,
        pending_payout: pendingPayout,
        paid_payout: paidPayout
      };
    } catch (error) {
      console.error('Error loading operator stats:', error);
      return {
        completed_orders: 0,
        total_earnings: 0,
        average_rating: 0,
        pending_payout: 0,
        paid_payout: 0
      };
    }
  };

  const filterAndSortOperators = () => {
    let filtered = [...operators];

    if (searchTerm) {
      filtered = filtered.filter(operator => {
        const fullName = `${operator.profiles?.first_name || ''} ${operator.profiles?.last_name || ''}`.toLowerCase();
        const zipCodes = operator.zip_codes?.join(' ').toLowerCase() || '';
        return fullName.includes(searchTerm.toLowerCase()) || zipCodes.includes(searchTerm.toLowerCase());
      });
    }

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

    setFilteredOperators(filtered);
  };

  const toggleOperatorStatus = async (operatorId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('washers')
        .update({ is_active: !isActive })
        .eq('id', operatorId);

      if (error) throw error;
      loadOperators();
    } catch (error) {
      console.error('Error toggling operator status:', error);
    }
  };

  const updateApprovalStatus = async (operatorId: string, status: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('washers')
        .update({ approval_status: status })
        .eq('id', operatorId);

      if (error) throw error;
      loadOperators();
    } catch (error) {
      console.error('Error updating approval status:', error);
    }
  };

  const getDisplayName = (profiles: any) => {
    if (profiles?.first_name || profiles?.last_name) {
      return `${profiles.first_name || ''} ${profiles.last_name || ''}`.trim();
    }
    return 'Operator';
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-wave">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <Button variant="ghost" onClick={onBack} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <h1 className="text-3xl font-bold mb-6">All Operators</h1>

        <div className="space-y-6">
          {filteredOperators.map((operator: any) => (
            <Card key={operator.id} className="p-6">
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">
                        {getDisplayName(operator.profiles)}
                      </h3>
                      <div className="flex items-center gap-2">
                        {operator.profiles?.email && (
                          <span className="text-sm text-muted-foreground">
                            {operator.profiles.email}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {operator.approval_status === 'pending' && (
                      <>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => updateApprovalStatus(operator.id, 'approved')}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => updateApprovalStatus(operator.id, 'rejected')}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      </>
                    )}
                    {operator.approval_status === 'approved' && (
                      <Button
                        variant={operator.is_active ? "destructive" : "default"}
                        size="sm"
                        onClick={() => toggleOperatorStatus(operator.id, operator.is_active)}
                      >
                        {operator.is_active ? (
                          <>
                            <UserX className="w-4 h-4 mr-1" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <UserCheck className="w-4 h-4 mr-1" />
                            Activate
                          </>
                        )}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedOperator(operator);
                        setShowDetailModal(true);
                      }}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View Details
                    </Button>
                  </div>
                </div>

                {/* Performance Stats */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Package className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-medium">Orders</span>
                    </div>
                    <div className="text-xl font-bold">
                      {operatorStats[operator.id]?.completed_orders || 0}
                    </div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <DollarSign className="w-4 h-4 text-green-600" />
                      <span className="text-xs font-medium">Total Earned</span>
                    </div>
                    <div className="text-xl font-bold">
                      ${((operatorStats[operator.id]?.total_earnings || 0) / 100).toFixed(0)}
                    </div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-4 h-4 text-orange-600" />
                      <span className="text-xs font-medium">Pending</span>
                    </div>
                    <div className="text-xl font-bold">
                      ${((operatorStats[operator.id]?.pending_payout || 0) / 100).toFixed(0)}
                    </div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle className="w-4 h-4 text-green-700" />
                      <span className="text-xs font-medium">Paid Out</span>
                    </div>
                    <div className="text-xl font-bold">
                      ${((operatorStats[operator.id]?.paid_payout || 0) / 100).toFixed(0)}
                    </div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Star className="w-4 h-4 text-yellow-600" />
                      <span className="text-xs font-medium">Rating</span>
                    </div>
                    <div className="text-xl font-bold">
                      {operatorStats[operator.id]?.average_rating || 0}/5
                    </div>
                  </div>
                </div>

                {/* Contractor Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Contact Information
                    </h4>
                    <div className="space-y-2 text-sm">
                      {operator.profiles?.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-3 h-3 text-muted-foreground" />
                          {operator.profiles.phone}
                        </div>
                      )}
                      {operator.profiles?.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-3 h-3 text-muted-foreground" />
                          {operator.profiles.email}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Contractor Status
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        {operator.profiles?.is_contractor ? (
                          <CheckCircle className="w-3 h-3 text-green-600" />
                        ) : (
                          <X className="w-3 h-3 text-red-600" />
                        )}
                        <span>1099 Contractor</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {operator.profiles?.w9_completed ? (
                          <CheckCircle className="w-3 h-3 text-green-600" />
                        ) : (
                          <X className="w-3 h-3 text-red-600" />
                        )}
                        <span>W-9 Completed</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Service Areas
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {operator.zip_codes?.slice(0, 4).map((zip: string) => (
                        <Badge key={zip} variant="outline" className="text-xs">
                          {zip}
                        </Badge>
                      ))}
                      {operator.zip_codes?.length > 4 && (
                        <Badge variant="outline" className="text-xs">
                          +{operator.zip_codes.length - 4} more
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
      
      {/* Operator Detail Modal */}
      {selectedOperator && (
        <OperatorDetailModal
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedOperator(null);
          }}
          operator={selectedOperator}
          stats={operatorStats[selectedOperator.id]}
        />
      )}
    </div>
  );
}
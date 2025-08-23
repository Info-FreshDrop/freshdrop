import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, DollarSign, Calendar, FileText, AlertTriangle, CheckCircle } from "lucide-react";
import { ContractorOnboardingModal } from "./ContractorOnboardingModal";
import { WeeklyPayoutSchedule } from "./WeeklyPayoutSchedule";
import { TaxDocumentManagement } from "./TaxDocumentManagement";

interface Contractor {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  tax_id: string;
  business_name: string;
  w9_completed: boolean;
  is_contractor: boolean;
  contractor_start_date: string;
  ach_verified: boolean;
  total_earnings: number;
  pending_earnings: number;
}

export const ContractorManagement = () => {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const { toast } = useToast();

  const loadContractors = async () => {
    try {
      // First get contractors
      const { data: contractorsData, error } = await supabase
        .from('profiles')
        .select(`
          user_id,
          first_name,
          last_name,
          email,
          tax_id,
          business_name,
          w9_completed,
          is_contractor,
          contractor_start_date
        `)
        .eq('is_contractor', true);

      if (error) throw error;

      if (!contractorsData || contractorsData.length === 0) {
        setContractors([]);
        return;
      }

      // Get washer info for contractors
      const contractorIds = contractorsData.map(c => c.user_id);
      
      const { data: washersData } = await supabase
        .from('washers')
        .select('user_id, ach_verified')
        .in('user_id', contractorIds);

      // Get earnings data
      const { data: washersForEarnings } = await supabase
        .from('washers')
        .select('id, user_id')
        .in('user_id', contractorIds);

      const washerIds = washersForEarnings?.map(w => w.id) || [];
      
      const { data: earningsData } = await supabase
        .from('operator_earnings')
        .select('operator_id, total_earnings_cents, status')
        .in('operator_id', washerIds);

      const contractorsWithEarnings = contractorsData.map(contractor => {
        const washerInfo = washersData?.find(w => w.user_id === contractor.user_id);
        const washerId = washersForEarnings?.find(w => w.user_id === contractor.user_id)?.id;
        
        const earnings = earningsData?.filter(e => e.operator_id === washerId) || [];
        const totalEarnings = earnings.reduce((sum, e) => sum + e.total_earnings_cents, 0);
        const pendingEarnings = earnings
          .filter(e => e.status === 'pending')
          .reduce((sum, e) => sum + e.total_earnings_cents, 0);

        return {
          id: contractor.user_id,
          first_name: contractor.first_name || '',
          last_name: contractor.last_name || '',
          email: contractor.email || '',
          tax_id: contractor.tax_id || '',
          business_name: contractor.business_name || '',
          w9_completed: contractor.w9_completed,
          is_contractor: contractor.is_contractor,
          contractor_start_date: contractor.contractor_start_date,
          ach_verified: washerInfo?.ach_verified || false,
          total_earnings: totalEarnings,
          pending_earnings: pendingEarnings,
        };
      });

      setContractors(contractorsWithEarnings);
    } catch (error) {
      console.error('Error loading contractors:', error);
      toast({
        title: "Error",
        description: "Failed to load contractors",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContractors();
  }, []);

  const getComplianceStatus = (contractor: Contractor) => {
    const issues = [];
    if (!contractor.w9_completed) issues.push("W-9 Missing");
    if (!contractor.tax_id) issues.push("Tax ID Missing");
    if (!contractor.ach_verified) issues.push("Bank Account Not Verified");
    
    return issues;
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading contractors...</div>;
  }

  const totalContractors = contractors.length;
  const compliantContractors = contractors.filter(c => getComplianceStatus(c).length === 0).length;
  const totalPendingEarnings = contractors.reduce((sum, c) => sum + c.pending_earnings, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">1099 Contractor Management</h2>
          <p className="text-muted-foreground">
            Manage independent contractors, weekly payouts, and tax compliance
          </p>
        </div>
        <Button onClick={() => setShowOnboardingModal(true)}>
          <Users className="w-4 h-4 mr-2" />
          Add Contractor
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Contractors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalContractors}</div>
            <p className="text-xs text-muted-foreground">
              {compliantContractors} fully compliant
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payouts</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalPendingEarnings)}</div>
            <p className="text-xs text-muted-foreground">
              Ready for next payout
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliance Rate</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalContractors > 0 ? Math.round((compliantContractors / totalContractors) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              W-9 and bank verification
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Payout</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Sunday</div>
            <p className="text-xs text-muted-foreground">
              Weekly schedule
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="contractors" className="space-y-4">
        <TabsList>
          <TabsTrigger value="contractors">Contractors</TabsTrigger>
          <TabsTrigger value="payouts">Weekly Payouts</TabsTrigger>
          <TabsTrigger value="tax-docs">Tax Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="contractors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Contractors</CardTitle>
              <CardDescription>
                Manage contractor information and compliance status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {contractors.map((contractor) => {
                  const issues = getComplianceStatus(contractor);
                  const isCompliant = issues.length === 0;

                  return (
                    <div key={contractor.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">
                            {contractor.first_name} {contractor.last_name}
                          </h3>
                          {isCompliant ? (
                            <Badge variant="default" className="bg-green-500">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Compliant
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Issues ({issues.length})
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {contractor.email} • {contractor.business_name || 'Individual'}
                        </p>
                        {!isCompliant && (
                          <p className="text-sm text-red-600">
                            Issues: {issues.join(', ')}
                          </p>
                        )}
                      </div>
                      
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {formatCurrency(contractor.pending_earnings)} pending
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatCurrency(contractor.total_earnings)} total earned
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payouts">
          <WeeklyPayoutSchedule contractors={contractors} onPayoutProcessed={loadContractors} />
        </TabsContent>

        <TabsContent value="tax-docs">
          <TaxDocumentManagement contractors={contractors} />
        </TabsContent>
      </Tabs>

      <ContractorOnboardingModal
        isOpen={showOnboardingModal}
        onClose={() => setShowOnboardingModal(false)}
        onSuccess={() => {
          setShowOnboardingModal(false);
          loadContractors();
        }}
      />
    </div>
  );
};
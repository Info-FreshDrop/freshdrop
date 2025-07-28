import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Users, UserCheck, UserX, Clock, Copy, Link as LinkIcon } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

interface OperatorManagementProps {
  onBack: () => void;
}

interface Operator {
  id: string;
  user_id: string;
  zip_codes: string[];
  locker_access: string[];
  is_active: boolean;
  is_online: boolean;
  approval_status: string;
  signup_token: string | null;
  signup_expires_at: string | null;
  created_at: string;
  profiles?: {
    first_name: string;
    last_name: string;
    phone: string;
  } | null;
}

interface Locker {
  id: string;
  name: string;
  address: string;
  zip_code: string;
}

interface ServiceArea {
  id: string;
  zip_code: string;
}

export const OperatorManagement: React.FC<OperatorManagementProps> = ({ onBack }) => {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [lockers, setLockers] = useState<Locker[]>([]);
  const [serviceAreas, setServiceAreas] = useState<ServiceArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    selectedZipCodes: [] as string[],
    selectedLockers: [] as string[],
  });
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('operators-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'washers' },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadData = async () => {
    try {
      // Load operators
      const { data: operatorsData, error: operatorsError } = await supabase
        .from('washers')
        .select('*')
        .order('created_at', { ascending: false });

      if (operatorsError) throw operatorsError;

      // Load profiles separately and map them
      const operatorsWithProfiles = await Promise.all(
        (operatorsData || []).map(async (operator) => {
          if (operator.user_id && operator.user_id !== '00000000-0000-0000-0000-000000000000') {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('first_name, last_name, phone')
              .eq('user_id', operator.user_id)
              .maybeSingle();
            
            return { ...operator, profiles: profileData };
          }
          return { ...operator, profiles: null };
        })
      );

      // Load lockers
      const { data: lockersData, error: lockersError } = await supabase
        .from('lockers')
        .select('id, name, address, zip_code')
        .eq('is_active', true);

      if (lockersError) throw lockersError;

      // Load service areas
      const { data: serviceAreasData, error: serviceAreasError } = await supabase
        .from('service_areas')
        .select('id, zip_code')
        .eq('is_active', true);

      if (serviceAreasError) throw serviceAreasError;

      setOperators(operatorsWithProfiles);
      setLockers(lockersData || []);
      setServiceAreas(serviceAreasData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load operator data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const generateInviteLink = async () => {
    try {
      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

      const { error } = await supabase
        .from('washers')
        .insert([{
          signup_token: token,
          signup_expires_at: expiresAt.toISOString(),
          zip_codes: inviteForm.selectedZipCodes,
          locker_access: inviteForm.selectedLockers,
          approval_status: 'pending',
          is_active: false,
          user_id: '00000000-0000-0000-0000-000000000000' // Placeholder until signup
        }]);

      if (error) throw error;

      const inviteUrl = `${window.location.origin}/operator-signup?token=${token}`;
      setGeneratedLink(inviteUrl);
      
      toast({
        title: "Success",
        description: "Invite link generated successfully"
      });
    } catch (error) {
      console.error('Error generating invite link:', error);
      toast({
        title: "Error",
        description: "Failed to generate invite link",
        variant: "destructive"
      });
    }
  };

  const copyInviteLink = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      toast({
        title: "Success",
        description: "Invite link copied to clipboard"
      });
    }
  };

  const handleApproval = async (operatorId: string, approved: boolean) => {
    try {
      const { error } = await supabase
        .from('washers')
        .update({ 
          approval_status: approved ? 'approved' : 'rejected',
          is_active: approved 
        })
        .eq('id', operatorId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Operator ${approved ? 'approved' : 'rejected'} successfully`
      });
    } catch (error) {
      console.error('Error updating operator status:', error);
      toast({
        title: "Error",
        description: "Failed to update operator status",
        variant: "destructive"
      });
    }
  };

  const toggleOperatorStatus = async (operatorId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('washers')
        .update({ is_active: isActive })
        .eq('id', operatorId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Operator ${isActive ? 'activated' : 'deactivated'} successfully`
      });
    } catch (error) {
      console.error('Error toggling operator status:', error);
      toast({
        title: "Error",
        description: "Failed to update operator status",
        variant: "destructive"
      });
    }
  };

  const handleZipCodeChange = (zipCode: string, checked: boolean) => {
    setInviteForm(prev => ({
      ...prev,
      selectedZipCodes: checked 
        ? [...prev.selectedZipCodes, zipCode]
        : prev.selectedZipCodes.filter(zc => zc !== zipCode)
    }));
  };

  const handleLockerAccessChange = (lockerId: string, checked: boolean) => {
    setInviteForm(prev => ({
      ...prev,
      selectedLockers: checked
        ? [...prev.selectedLockers, lockerId]
        : prev.selectedLockers.filter(id => id !== lockerId)
    }));
  };

  const getStatusBadge = (operator: Operator) => {
    if (operator.approval_status === 'pending') {
      return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Pending Approval</Badge>;
    }
    if (operator.approval_status === 'rejected') {
      return <Badge variant="destructive">Rejected</Badge>;
    }
    if (!operator.is_active) {
      return <Badge variant="secondary">Inactive</Badge>;
    }
    return operator.is_online 
      ? <Badge className="bg-green-100 text-green-800 border-green-300">Online</Badge>
      : <Badge variant="outline">Offline</Badge>;
  };

  const pendingOperators = operators.filter(op => op.approval_status === 'pending');
  const activeOperators = operators.filter(op => op.approval_status === 'approved');

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button onClick={onBack} variant="outline" className="mb-4">
            ← Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold">Operator Management</h1>
          <p className="text-muted-foreground">Manage operators and approve new applications</p>
        </div>
        <Button 
          onClick={() => setShowInviteForm(!showInviteForm)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Invite Operator
        </Button>
      </div>

      {/* Pending Approvals */}
      {pendingOperators.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800">
              <Clock className="h-5 w-5" />
              Pending Approvals ({pendingOperators.length})
            </CardTitle>
            <CardDescription>Review and approve new operator applications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingOperators.map((operator) => (
                <div key={operator.id} className="flex items-center justify-between p-4 bg-white rounded-lg border">
                  <div>
                    <h4 className="font-medium">
                      {operator.profiles ? 
                        `${operator.profiles.first_name} ${operator.profiles.last_name}` : 
                        'Pending Registration'
                      }
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Service Areas: {operator.zip_codes?.join(', ') || 'None'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Applied: {new Date(operator.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={() => handleApproval(operator.id, true)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <UserCheck className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={() => handleApproval(operator.id, false)}
                    >
                      <UserX className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invite Form */}
      {showInviteForm && (
        <Card>
          <CardHeader>
            <CardTitle>Invite New Operator</CardTitle>
            <CardDescription>Generate an invite link for a new operator</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label className="text-base font-medium">Service Areas</Label>
              <p className="text-sm text-muted-foreground mb-3">Select zip codes this operator can service</p>
              <div className="grid grid-cols-3 gap-2">
                {serviceAreas.map((area) => (
                  <div key={area.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`zip-${area.zip_code}`}
                      checked={inviteForm.selectedZipCodes.includes(area.zip_code)}
                      onCheckedChange={(checked) => handleZipCodeChange(area.zip_code, checked as boolean)}
                    />
                    <Label htmlFor={`zip-${area.zip_code}`} className="text-sm">
                      {area.zip_code}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-base font-medium">Locker Access</Label>
              <p className="text-sm text-muted-foreground mb-3">Select lockers this operator can access</p>
              <div className="space-y-2">
                {lockers.map((locker) => (
                  <div key={locker.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`locker-${locker.id}`}
                      checked={inviteForm.selectedLockers.includes(locker.id)}
                      onCheckedChange={(checked) => handleLockerAccessChange(locker.id, checked as boolean)}
                    />
                    <Label htmlFor={`locker-${locker.id}`} className="text-sm">
                      {locker.name} - {locker.address}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={generateInviteLink}>
                <LinkIcon className="h-4 w-4 mr-2" />
                Generate Invite Link
              </Button>
              <Button variant="outline" onClick={() => setShowInviteForm(false)}>
                Cancel
              </Button>
            </div>

            {generatedLink && (
              <div className="p-4 bg-muted rounded-lg">
                <Label className="text-sm font-medium">Generated Invite Link:</Label>
                <div className="flex items-center gap-2 mt-2">
                  <Input value={generatedLink} readOnly className="font-mono text-xs" />
                  <Button size="sm" onClick={copyInviteLink}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  This link expires in 7 days. Share it with the operator to complete registration.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Active Operators */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Active Operators ({activeOperators.length})
          </CardTitle>
          <CardDescription>Manage your approved operators</CardDescription>
        </CardHeader>
        <CardContent>
          {activeOperators.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No operators yet</h3>
              <p className="text-muted-foreground mb-4">Invite your first operator to get started</p>
              <Button onClick={() => setShowInviteForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Invite Operator
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {activeOperators.map((operator) => (
                <div key={operator.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div>
                      <h4 className="font-medium">
                        {operator.profiles ? 
                          `${operator.profiles.first_name} ${operator.profiles.last_name}` : 
                          'Unknown Operator'
                        }
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {operator.profiles?.phone && `Phone: ${operator.profiles.phone} • `}
                        Service Areas: {operator.zip_codes?.join(', ') || 'None'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Locker Access: {operator.locker_access?.length || 0} location(s)
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {getStatusBadge(operator)}
                    <div className="flex items-center gap-2">
                      <Label className="text-sm">Active</Label>
                      <Switch
                        checked={operator.is_active}
                        onCheckedChange={(checked) => toggleOperatorStatus(operator.id, checked)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
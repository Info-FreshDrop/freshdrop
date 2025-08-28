import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Users, UserCheck, UserX, Clock, Copy, Link as LinkIcon, Edit, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { OperatorZipCodeEditModal } from './OperatorZipCodeEditModal';

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
  needs_onboarding?: boolean;
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

interface OperatorApplication {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  drivers_license: string;
  vehicle_type: string;
  availability: string;
  experience: string | null;
  motivation: string;
  status: string;
  created_at: string;
  updated_at?: string;
  washer_photo_url?: string;
  washer_inside_photo_url?: string;
  dryer_photo_url?: string;
  dryer_inside_photo_url?: string;
  towel_photo_url?: string;
  tshirt_photo_url?: string;
  laundry_stack_photo_url?: string;
  laundry_area_photo_url?: string;
}

export const OperatorManagement: React.FC<OperatorManagementProps> = ({ onBack }) => {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [applications, setApplications] = useState<OperatorApplication[]>([]);
  const [lockers, setLockers] = useState<Locker[]>([]);
  const [serviceAreas, setServiceAreas] = useState<ServiceArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    selectedZipCodes: [] as string[],
    selectedLockers: [] as string[],
  });
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'applications' | 'rejected' | 'operators' | 'invite'>('applications');
  const [editingOperator, setEditingOperator] = useState<Operator | null>(null);
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
      // Load applications
      const { data: applicationsData, error: applicationsError } = await supabase
        .from('operator_applications')
        .select('*')
        .order('created_at', { ascending: false });

      if (applicationsError) throw applicationsError;

      // Load operators
      const { data: operatorsData, error: operatorsError } = await supabase
        .from('washers')
        .select('*')
        .order('created_at', { ascending: false });

      if (operatorsError) throw operatorsError;

      // Load profiles separately and map them, including user metadata
      const operatorsWithProfiles = await Promise.all(
        (operatorsData || []).map(async (operator) => {
          if (operator.user_id && operator.user_id !== '00000000-0000-0000-0000-000000000000') {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('first_name, last_name, phone')
              .eq('user_id', operator.user_id)
              .maybeSingle();
            
            // Get user metadata to check onboarding status
            const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(operator.user_id);
            
            return { 
              ...operator, 
              profiles: profileData,
              needs_onboarding: user?.user_metadata?.needs_onboarding || false
            };
          }
          return { ...operator, profiles: null, needs_onboarding: false };
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

      setApplications(applicationsData || []);
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
      // Validation: ensure at least one zip code or locker is selected
      if (inviteForm.selectedZipCodes.length === 0 && inviteForm.selectedLockers.length === 0) {
        toast({
          title: "Error",
          description: "Please select at least one service area or locker access",
          variant: "destructive"
        });
        return;
      }

      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

      // Create invite in the new invites table (no application_id for manual invites)
      const { error } = await supabase
        .from('operator_invites')
        .insert([{
          signup_token: token,
          signup_expires_at: expiresAt.toISOString(),
          zip_codes: inviteForm.selectedZipCodes,
          locker_access: inviteForm.selectedLockers
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
        description: "Failed to generate invite link. Please try again.",
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

  const handleDeleteUser = async (email: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('delete-user-account', {
        body: { email }
      });

      if (error) throw error;

      toast({
        title: "User Deleted",
        description: `User ${email} has been removed from the system`,
      });

      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: `Failed to delete user: ${error.message}`,
        variant: "destructive",
      });
      return false;
    }
  };

  const handleApplicationAction = async (applicationId: string, action: 'approved' | 'rejected') => {
    console.log('handleApplicationAction called:', { applicationId, action });
    try {
      if (action === 'approved') {
        console.log('Starting approval process for:', applicationId);
        
        // Get the application details first
        const { data: application, error: fetchError } = await supabase
          .from('operator_applications')
          .select('*')
          .eq('id', applicationId)
          .single();

        if (fetchError || !application) {
          throw new Error('Could not fetch application details');
        }

        // Check if user already exists via profiles table (simpler approach)
        const { data: existingProfile, error: profileCheckError } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('email', application.email)
          .maybeSingle();

        if (existingProfile) {
          const shouldDelete = window.confirm(
            `A user with email "${application.email}" already exists.\n\nDelete existing user and approve application?`
          );

          if (shouldDelete) {
            const deleted = await handleDeleteUser(application.email);
            if (!deleted) return;
          } else {
            throw new Error(`User already exists. Operation cancelled.`);
          }
        }

        // Update application status to approved - this triggers the database function
        const { error: updateError } = await supabase
          .from('operator_applications')
          .update({ 
            status: 'approved',
            approved_at: new Date().toISOString()
          })
          .eq('id', applicationId);

        if (updateError) throw updateError;

        toast({
          title: "Application Approved!",
          description: `${application.first_name} ${application.last_name} will receive an email with login instructions.`,
        });
      } else {
        // Handle rejection
        const { error: updateError } = await supabase
          .from('operator_applications')
          .update({ 
            status: 'rejected',
            rejected_at: new Date().toISOString()
          })
          .eq('id', applicationId);

        if (updateError) throw updateError;

        toast({
          title: "Application Rejected",
          description: "The application has been rejected.",
        });
      }

      // Refresh applications list
      loadData();
    } catch (error) {
      console.error('Error updating application status:', error);
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
      
      toast({
        title: "Error",
        description: `Failed to update application status: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const reinstateApplication = async (applicationId: string) => {
    try {
      const { error } = await supabase
        .from('operator_applications')
        .update({ 
          status: 'pending',
          updated_at: new Date().toISOString()
        })
        .eq('id', applicationId);

      if (error) throw error;

      toast({
        title: "Application Reinstated",
        description: "Application has been moved back to pending applications for review.",
      });

      loadData(); // Reload data to update the UI
    } catch (error) {
      console.error('Error reinstating application:', error);
      toast({
        title: "Error",
        description: "Failed to reinstate application",
        variant: "destructive"
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

  const pendingApplications = applications.filter(app => app.status === 'pending');
  const rejectedApplications = applications.filter(app => app.status === 'rejected');
  const rejectedCount = rejectedApplications.length;
  const pendingOperators = operators.filter(op => op.approval_status === 'pending');
  const onboardingOperators = operators.filter(op => op.approval_status === 'approved' && op.needs_onboarding);
  const activeOperators = operators.filter(op => op.approval_status === 'approved' && !op.needs_onboarding);

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
      </div>

      {/* Tab Navigation */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 gap-0.5">
          <TabsTrigger value="applications" className="text-xs px-2 py-1">
            Apps {pendingApplications.length > 0 && (
              <Badge variant="destructive" className="ml-1 text-xs px-1">
                {pendingApplications.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="rejected" className="text-xs px-2 py-1">
            Rejected {rejectedCount > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs px-1">
                {rejectedCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="operators" className="text-xs px-2 py-1">
            Operators {pendingOperators.length > 0 && (
              <Badge variant="destructive" className="ml-1 text-xs px-1">
                {pendingOperators.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="invite" className="text-xs px-2 py-1">
            <Plus className="h-3 w-3 mr-1" />
            Invite
          </TabsTrigger>
        </TabsList>

        <TabsContent value="applications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Operator Applications ({pendingApplications.length} pending)
              </CardTitle>
              <CardDescription>Review applications from the homepage form</CardDescription>
            </CardHeader>
            <CardContent>
              {pendingApplications.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No pending applications</h3>
                  <p className="text-muted-foreground">New applications will appear here for review</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingApplications.map((application) => (
                    <div key={application.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <h4 className="font-medium text-lg">
                            {application.first_name} {application.last_name}
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
                            <p><strong>Email:</strong> {application.email}</p>
                            <p><strong>Phone:</strong> {application.phone}</p>
                            <p><strong>Address:</strong> {application.address}, {application.city}, {application.state}</p>
                            <p><strong>Zip Code:</strong> {application.zip_code}</p>
                            <p><strong>Vehicle:</strong> {application.vehicle_type}</p>
                            <p><strong>Availability:</strong> {application.availability}</p>
                          </div>
                          {application.experience && (
                            <div className="mt-2">
                              <p className="text-sm"><strong>Experience:</strong> {application.experience}</p>
                            </div>
                          )}
                          <div className="mt-2">
                            <p className="text-sm"><strong>Motivation:</strong> {application.motivation}</p>
                          </div>
                          
                          {/* Application Photos */}
                          <div className="mt-4 border-t pt-4">
                            <h5 className="text-sm font-medium mb-3">Application Photos:</h5>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              {application.washer_photo_url && (
                                <div className="space-y-1">
                                  <p className="text-xs text-muted-foreground">Washer (Front)</p>
                                  <img 
                                    src={application.washer_photo_url} 
                                    alt="Washer front" 
                                    className="w-full h-20 object-cover rounded border cursor-pointer hover:opacity-80"
                                    onClick={() => window.open(application.washer_photo_url, '_blank')}
                                  />
                                </div>
                              )}
                              {application.washer_inside_photo_url && (
                                <div className="space-y-1">
                                  <p className="text-xs text-muted-foreground">Washer (Inside)</p>
                                  <img 
                                    src={application.washer_inside_photo_url} 
                                    alt="Washer inside" 
                                    className="w-full h-20 object-cover rounded border cursor-pointer hover:opacity-80"
                                    onClick={() => window.open(application.washer_inside_photo_url, '_blank')}
                                  />
                                </div>
                              )}
                              {application.dryer_photo_url && (
                                <div className="space-y-1">
                                  <p className="text-xs text-muted-foreground">Dryer (Front)</p>
                                  <img 
                                    src={application.dryer_photo_url} 
                                    alt="Dryer front" 
                                    className="w-full h-20 object-cover rounded border cursor-pointer hover:opacity-80"
                                    onClick={() => window.open(application.dryer_photo_url, '_blank')}
                                  />
                                </div>
                              )}
                              {application.dryer_inside_photo_url && (
                                <div className="space-y-1">
                                  <p className="text-xs text-muted-foreground">Dryer (Inside)</p>
                                  <img 
                                    src={application.dryer_inside_photo_url} 
                                    alt="Dryer inside" 
                                    className="w-full h-20 object-cover rounded border cursor-pointer hover:opacity-80"
                                    onClick={() => window.open(application.dryer_inside_photo_url, '_blank')}
                                  />
                                </div>
                              )}
                              {application.towel_photo_url && (
                                <div className="space-y-1">
                                  <p className="text-xs text-muted-foreground">Folded Towel</p>
                                  <img 
                                    src={application.towel_photo_url} 
                                    alt="Folded towel" 
                                    className="w-full h-20 object-cover rounded border cursor-pointer hover:opacity-80"
                                    onClick={() => window.open(application.towel_photo_url, '_blank')}
                                  />
                                </div>
                              )}
                              {application.tshirt_photo_url && (
                                <div className="space-y-1">
                                  <p className="text-xs text-muted-foreground">Folded T-Shirt</p>
                                  <img 
                                    src={application.tshirt_photo_url} 
                                    alt="Folded t-shirt" 
                                    className="w-full h-20 object-cover rounded border cursor-pointer hover:opacity-80"
                                    onClick={() => window.open(application.tshirt_photo_url, '_blank')}
                                  />
                                </div>
                              )}
                              {application.laundry_stack_photo_url && (
                                <div className="space-y-1">
                                  <p className="text-xs text-muted-foreground">Laundry Stack</p>
                                  <img 
                                    src={application.laundry_stack_photo_url} 
                                    alt="Laundry stack" 
                                    className="w-full h-20 object-cover rounded border cursor-pointer hover:opacity-80"
                                    onClick={() => window.open(application.laundry_stack_photo_url, '_blank')}
                                  />
                                </div>
                              )}
                              {application.laundry_area_photo_url && (
                                <div className="space-y-1">
                                  <p className="text-xs text-muted-foreground">Laundry Area</p>
                                  <img 
                                    src={application.laundry_area_photo_url} 
                                    alt="Laundry area" 
                                    className="w-full h-20 object-cover rounded border cursor-pointer hover:opacity-80"
                                    onClick={() => window.open(application.laundry_area_photo_url, '_blank')}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <p className="text-xs text-muted-foreground mt-4">
                            Applied: {new Date(application.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button 
                            size="sm" 
                            onClick={() => handleApplicationAction(application.id, 'approved')}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <UserCheck className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => handleApplicationAction(application.id, 'rejected')}
                          >
                            <UserX className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rejected">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserX className="h-5 w-5" />
                Rejected Applications ({rejectedCount})
              </CardTitle>
              <CardDescription>Review and reinstate rejected applications</CardDescription>
            </CardHeader>
            <CardContent>
              {rejectedCount === 0 ? (
                <div className="text-center py-8">
                  <UserX className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No rejected applications</h3>
                  <p className="text-muted-foreground">Rejected applications will appear here for future review</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {rejectedApplications.map((application) => (
                    <div key={application.id} className="border border-red-200 rounded-lg p-4 space-y-3 bg-red-50">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-lg">
                              {application.first_name} {application.last_name}
                            </h4>
                            <Badge variant="destructive">Rejected</Badge>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
                            <p><strong>Email:</strong> {application.email}</p>
                            <p><strong>Phone:</strong> {application.phone}</p>
                            <p><strong>Address:</strong> {application.address}, {application.city}, {application.state}</p>
                            <p><strong>Zip Code:</strong> {application.zip_code}</p>
                            <p><strong>Vehicle:</strong> {application.vehicle_type}</p>
                            <p><strong>Availability:</strong> {application.availability}</p>
                          </div>
                          {application.experience && (
                            <div className="mt-2">
                              <p className="text-sm"><strong>Experience:</strong> {application.experience}</p>
                            </div>
                          )}
                          <div className="mt-2">
                            <p className="text-sm"><strong>Motivation:</strong> {application.motivation}</p>
                          </div>
                          
                          <div className="flex gap-4 text-xs text-muted-foreground mt-4 pt-4 border-t border-red-200">
                            <p>Applied: {new Date(application.created_at).toLocaleDateString()}</p>
                            <p>Rejected: {new Date(application.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            onClick={() => reinstateApplication(application.id)}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <UserCheck className="h-4 w-4 mr-1" />
                            Reinstate
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="operators">
          <>
            {/* Pending Approvals */}
            {pendingOperators.length > 0 && (
              <Card className="border-yellow-200 bg-yellow-50 mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-yellow-800">
                    <Clock className="h-5 w-5" />
                    Pending Approvals ({pendingOperators.length})
                  </CardTitle>
                  <CardDescription>Review and approve new operator invites</CardDescription>
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
                        <div className="flex flex-col sm:flex-row gap-2">
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

            {/* Pending Onboarding */}
            {onboardingOperators.length > 0 && (
              <Card className="border-blue-200 bg-blue-50 mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-800">
                    <Clock className="h-5 w-5" />
                    Pending Onboarding ({onboardingOperators.length})
                  </CardTitle>
                  <CardDescription>Operators who are approved but haven't completed onboarding yet</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {onboardingOperators.map((operator) => (
                      <div key={operator.id} className="flex items-center justify-between p-4 bg-white rounded-lg border">
                        <div>
                          <h4 className="font-medium">
                            {operator.profiles ? 
                              `${operator.profiles.first_name} ${operator.profiles.last_name}` : 
                              'Pending Name Entry'
                            }
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            Service Areas: {operator.zip_codes?.join(', ') || 'None'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Approved: {new Date(operator.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-blue-100 text-blue-800 border-blue-300">
                            Waiting for Onboarding
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
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
                    <Button onClick={() => setActiveTab('invite')}>
                      <Plus className="h-4 w-4 mr-2" />
                      Invite Operator
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activeOperators.map((operator) => (
                      <div key={operator.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg space-y-4 sm:space-y-0">
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
                        
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
                          {getStatusBadge(operator)}
                          <div className="flex items-center gap-2">
                            <Label className="text-sm">Active</Label>
                            <Switch
                              checked={operator.is_active}
                              onCheckedChange={(checked) => toggleOperatorStatus(operator.id, checked)}
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingOperator(operator)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => toggleOperatorStatus(operator.id, false)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        </TabsContent>

        <TabsContent value="invite">
          <Card>
            <CardHeader>
              <CardTitle>Invite New Operator</CardTitle>
              <CardDescription>Generate an invite link for a new operator</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="text-base font-medium">Service Areas</Label>
                <p className="text-sm text-muted-foreground mb-3">Select zip codes this operator can service</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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
        </TabsContent>
      </Tabs>

      {/* Zip Code Edit Modal */}
      {editingOperator && (
        <OperatorZipCodeEditModal
          isOpen={!!editingOperator}
          onClose={() => setEditingOperator(null)}
          operator={editingOperator}
          onSuccess={() => {
            loadData();
            setEditingOperator(null);
          }}
        />
      )}
    </div>
  );
};
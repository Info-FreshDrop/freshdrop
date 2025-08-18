import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  MapPin,
  Mail,
  Phone,
  ArrowLeft,
  UserCheck,
  UserX
} from "lucide-react";

interface WasherManagementProps {
  onBack: () => void;
}

interface Washer {
  id: string;
  user_id: string;
  zip_codes: string[];
  locker_access: string[];
  is_active: boolean;
  is_online: boolean;
  created_at: string;
  profiles: {
    first_name: string;
    last_name: string;
    phone: string;
  } | null;
  user_email?: string;
}

export function WasherManagement({ onBack }: WasherManagementProps) {
  const [washers, setWashers] = useState<Washer[]>([]);
  const [lockers, setLockers] = useState<any[]>([]);
  const [serviceAreas, setServiceAreas] = useState<any[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    zipCodes: [] as string[],
    lockerAccess: [] as string[]
  });

  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [washersRes, lockersRes, areasRes] = await Promise.all([
        supabase
          .from('washers')
          .select(`
            *,
            profiles!washers_user_id_fkey (first_name, last_name, phone)
          `)
          .order('created_at', { ascending: false }),
        supabase.from('lockers').select('*').eq('is_active', true),
        supabase.from('service_areas').select('*').eq('is_active', true)
      ]);

      if (washersRes.data) setWashers((washersRes.data as any) || []);
      if (lockersRes.data) setLockers(lockersRes.data);
      if (areasRes.data) setServiceAreas(areasRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load washer data.",
        variant: "destructive",
      });
    }
  };

  const handleCreateWasher = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // For now, we'll use a simplified approach since admin.createUser requires elevated privileges
      // In a real implementation, this would be handled by a secure server endpoint
      
      const tempPassword = Math.random().toString(36).slice(-8);
      
      // Create the user account using signUp (in production, this would be server-side)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password || tempPassword,
        options: {
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            phone: formData.phone
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // Assign washer role
        await supabase
          .from('user_roles')
          .insert([
            { user_id: authData.user.id, role: 'washer' }
          ]);

        // Create washer profile
        await supabase
          .from('washers')
          .insert([{
            user_id: authData.user.id,
            zip_codes: formData.zipCodes,
            locker_access: formData.lockerAccess,
            is_active: true,
            is_online: false
          }]);
      }

      toast({
        title: "Washer Created",
        description: `Successfully created washer account for ${formData.firstName} ${formData.lastName}`,
      });

      setShowCreateForm(false);
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: '',
        zipCodes: [],
        lockerAccess: []
      });
      loadData();
    } catch (error) {
      console.error('Error creating washer:', error);
      toast({
        title: "Creation Failed",
        description: "Failed to create washer account. Please try again.",
        variant: "destructive",
      });
    }
    
    setIsLoading(false);
  };

  const toggleWasherStatus = async (washerId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('washers')
        .update({ is_active: !isActive })
        .eq('id', washerId);

      if (error) throw error;

      toast({
        title: isActive ? "Washer Deactivated" : "Washer Activated",
        description: `Washer has been ${isActive ? 'deactivated' : 'activated'} successfully.`,
      });

      loadData();
    } catch (error) {
      console.error('Error updating washer status:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update washer status.",
        variant: "destructive",
      });
    }
  };

  const handleZipCodeChange = (zipCode: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      zipCodes: checked 
        ? [...prev.zipCodes, zipCode]
        : prev.zipCodes.filter(z => z !== zipCode)
    }));
  };

  const handleLockerAccessChange = (lockerId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      lockerAccess: checked 
        ? [...prev.lockerAccess, lockerId]
        : prev.lockerAccess.filter(l => l !== lockerId)
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-wave">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex justify-between items-center mb-6">
          <div>
            <Button
              variant="ghost"
              onClick={onBack}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Washer Management
            </h1>
            <p className="text-muted-foreground">
              Create and manage washer accounts and assignments
            </p>
          </div>
          
          <Button
            variant="hero"
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add New Washer
          </Button>
        </div>

        {showCreateForm && (
          <Card className="border-0 shadow-soft mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" />
                Create New Washer Account
              </CardTitle>
              <CardDescription>
                Add a new washer/driver to the team
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateWasher} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Temporary Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Minimum 6 characters"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Service Areas (Zip Codes)</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {serviceAreas.map((area) => (
                      <div key={area.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`zip-${area.zip_code}`}
                          checked={formData.zipCodes.includes(area.zip_code)}
                          onChange={(e) => handleZipCodeChange(area.zip_code, e.target.checked)}
                        />
                        <Label htmlFor={`zip-${area.zip_code}`} className="text-sm">
                          {area.zip_code}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Locker Access</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {lockers.map((locker) => (
                      <div key={locker.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`locker-${locker.id}`}
                          checked={formData.lockerAccess.includes(locker.id)}
                          onChange={(e) => handleLockerAccessChange(locker.id, e.target.checked)}
                        />
                        <Label htmlFor={`locker-${locker.id}`} className="text-sm">
                          {locker.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    type="submit"
                    variant="hero"
                    disabled={isLoading}
                  >
                    {isLoading ? "Creating..." : "Create Washer"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Washers List */}
        <div className="grid grid-cols-1 gap-4">
          {washers.length === 0 ? (
            <Card className="border-0 shadow-soft">
              <CardContent className="p-12 text-center">
                <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-xl font-semibold mb-2">No Washers Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first washer account to get started.
                </p>
                <Button variant="hero" onClick={() => setShowCreateForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Washer
                </Button>
              </CardContent>
            </Card>
          ) : (
            washers.map((washer) => (
              <Card key={washer.id} className="border-0 shadow-soft">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                          <Users className="h-6 w-6 text-primary" />
                        </div>
                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                          washer.is_online ? 'bg-green-500' : 'bg-gray-400'
                        }`}></div>
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">
                          {washer.profiles?.first_name || 'Unknown'} {washer.profiles?.last_name || 'User'}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {washer.user_email || 'Email not available'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {washer.profiles?.phone || 'Phone not available'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge variant={washer.is_online ? "default" : "secondary"}>
                        {washer.is_online ? (
                          <>
                            <UserCheck className="h-3 w-3 mr-1" />
                            Online
                          </>
                        ) : (
                          <>
                            <UserX className="h-3 w-3 mr-1" />
                            Offline
                          </>
                        )}
                      </Badge>
                      
                      <Switch
                        checked={washer.is_active}
                        onCheckedChange={() => toggleWasherStatus(washer.id, washer.is_active)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">Service Areas</h4>
                      <div className="flex flex-wrap gap-1">
                        {washer.zip_codes.length > 0 ? (
                          washer.zip_codes.map((zipCode) => (
                            <Badge key={zipCode} variant="outline" className="text-xs">
                              {zipCode}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">No areas assigned</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Locker Access</h4>
                      <div className="flex flex-wrap gap-1">
                        {washer.locker_access.length > 0 ? (
                          washer.locker_access.map((lockerId) => {
                            const locker = lockers.find(l => l.id === lockerId);
                            return locker ? (
                              <Badge key={lockerId} variant="outline" className="text-xs">
                                <MapPin className="h-2 w-2 mr-1" />
                                {locker.name}
                              </Badge>
                            ) : null;
                          })
                        ) : (
                          <span className="text-sm text-muted-foreground">No locker access</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4 pt-4 border-t">
                    <Button variant="outline" size="sm">
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" className="text-red-600">
                      <Trash2 className="h-3 w-3 mr-1" />
                      Remove
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
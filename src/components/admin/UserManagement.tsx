import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  ArrowLeft,
  Users,
  Search,
  Edit,
  Trash2,
  Plus,
  Eye,
  Shield,
  UserCheck,
  AlertTriangle,
  MessageSquare
} from "lucide-react";

interface UserManagementProps {
  onBack: () => void;
}

interface User {
  id: string;
  email: string;
  created_at: string;
  profiles?: {
    first_name: string;
    last_name: string;
    phone: string;
  };
  user_roles: Array<{
    role: string;
  }>;
}

interface SupportTicket {
  id: string;
  subject: string;
  status: string;
  priority: string;
  created_at: string;
  customer_id: string;
  profiles?: {
    first_name: string;
    last_name: string;
  };
}

export function UserManagement({ onBack }: UserManagementProps) {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('users');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createUserData, setCreateUserData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'marketing' as 'owner' | 'marketing'
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      console.log('Loading user data...');
      
      // First get all profiles with owner/marketing roles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          user_id,
          first_name,
          last_name,
          phone,
          created_at
        `)
        .order('created_at', { ascending: false });

      console.log('Profiles data:', profilesData);
      console.log('Profiles error:', profilesError);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        throw profilesError;
      }

      // Now get user roles for each profile
      const transformedUsers: User[] = [];
      
      for (const profile of profilesData || []) {
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', profile.user_id);

        if (roleError) {
          console.error('Error fetching role for user:', profile.user_id, roleError);
          continue; // Skip this user if we can't get their role
        }

        // Only include users with owner or marketing roles
        const userRoles = roleData || [];
        const hasAdminRole = userRoles.some(r => r.role === 'owner' || r.role === 'marketing');
        
        if (hasAdminRole) {
          transformedUsers.push({
            id: profile.user_id,
            email: 'user@example.com', // We can't access auth.users directly via client
            created_at: profile.created_at,
            profiles: {
              first_name: profile.first_name || '',
              last_name: profile.last_name || '',
              phone: profile.phone || ''
            },
            user_roles: userRoles
          });
        }
      }

      console.log('Transformed users:', transformedUsers);
      setUsers(transformedUsers);

      // Load support tickets
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('support_tickets')
        .select(`
          id,
          subject,
          status,
          priority,
          created_at,
          customer_id,
          profiles(first_name, last_name)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      console.log('Tickets data:', ticketsData);
      console.log('Tickets error:', ticketsError);

      if (ticketsError) {
        console.error('Error fetching tickets:', ticketsError);
        // Don't throw here, just log the error as tickets are secondary
      } else {
        setSupportTickets((ticketsData as any) || []);
      }

    } catch (error: any) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: `Failed to load user data: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    return (
      user.email.toLowerCase().includes(searchLower) ||
      user.profiles?.first_name?.toLowerCase().includes(searchLower) ||
      user.profiles?.last_name?.toLowerCase().includes(searchLower) ||
      user.profiles?.phone?.includes(searchTerm)
    );
  });

  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setShowUserDialog(true);
  };

  const handleDeleteUser = (user: User) => {
    setUserToDelete(user);
    setShowDeleteDialog(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      // In a real app, you'd need proper user deletion logic
      // This is a simplified version
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', userToDelete.id);

      if (error) throw error;

      toast({
        title: "User Deleted",
        description: "User has been successfully deleted.",
      });

      setShowDeleteDialog(false);
      setUserToDelete(null);
      loadData();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: "Failed to delete user.",
        variant: "destructive",
      });
    }
  };

  const handleCreateUser = async () => {
    console.log('handleCreateUser called with data:', createUserData);
    
    if (!createUserData.firstName || !createUserData.lastName || !createUserData.email || !createUserData.password) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Current session:', session);
      
      if (!session) {
        throw new Error('No active session');
      }

      const functionUrl = `https://sbilxpqluuvxhmgfpggx.supabase.co/functions/v1/create-user`;
      console.log('Calling edge function at:', functionUrl);
      
      const requestBody = {
        email: createUserData.email,
        password: createUserData.password,
        firstName: createUserData.firstName,
        lastName: createUserData.lastName,
        role: createUserData.role,
      };
      console.log('Request body:', requestBody);

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      const responseText = await response.text();
      console.log('Response text:', responseText);

      let result;
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse response as JSON:', e);
        throw new Error(`Invalid response: ${responseText}`);
      }

      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}: ${responseText}`);
      }
      
      console.log('User created successfully:', result);
      toast({
        title: "User Created",
        description: `Successfully created user: ${result.user.email}`,
      });

      setShowCreateDialog(false);
      setCreateUserData({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        role: 'marketing'
      });
      loadData();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create user.",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner': return 'default';
      case 'operator': return 'secondary';
      case 'marketing': return 'outline';
      default: return 'outline';
    }
  };

  const getTicketStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-red-100 text-red-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTicketPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-wave flex items-center justify-center">
        <div className="text-center">
          <Users className="h-8 w-8 animate-pulse mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading user data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-wave">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={onBack}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                User Management
              </h1>
              <p className="text-muted-foreground">
                Manage users, roles, and support tickets
              </p>
            </div>
            <Button onClick={() => setShowCreateDialog(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add User
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Users ({users.length})
            </TabsTrigger>
            <TabsTrigger value="support" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Support Tickets ({supportTickets.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-6">
            {/* Search */}
            <Card className="border-0 shadow-soft">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users by name, email, or phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Users List */}
            <div className="space-y-4">
              {filteredUsers.map((user) => (
                <Card key={user.id} className="border-0 shadow-soft">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <div>
                            <h3 className="font-semibold">
                              {user.profiles?.first_name} {user.profiles?.last_name}
                            </h3>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {user.user_roles.map((role, index) => (
                            <Badge key={index} variant={getRoleBadgeVariant(role.role)}>
                              {role.role}
                            </Badge>
                          ))}
                        </div>

                        <div className="text-sm text-muted-foreground">
                          <p>Phone: {user.profiles?.phone || 'Not provided'}</p>
                          <p>Joined: {new Date(user.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewUser(user)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteUser(user)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredUsers.length === 0 && (
              <Card className="border-0 shadow-soft">
                <CardContent className="p-12 text-center">
                  <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-xl font-semibold mb-2">No Users Found</h3>
                  <p className="text-muted-foreground">
                    {searchTerm ? 'Try adjusting your search criteria.' : 'No users registered yet.'}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="support" className="space-y-6">
            {/* Support Tickets */}
            <div className="space-y-4">
              {supportTickets.map((ticket) => (
                <Card key={ticket.id} className="border-0 shadow-soft">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold">{ticket.subject}</h3>
                          <Badge className={getTicketStatusColor(ticket.status)}>
                            {ticket.status}
                          </Badge>
                          <Badge className={getTicketPriorityColor(ticket.priority)}>
                            {ticket.priority} priority
                          </Badge>
                        </div>
                        
                        <div className="text-sm text-muted-foreground">
                          <p>Customer: {ticket.profiles?.first_name} {ticket.profiles?.last_name}</p>
                          <p>Created: {new Date(ticket.created_at).toLocaleDateString()}</p>
                          <p>Ticket ID: #{ticket.id.slice(-8)}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {supportTickets.length === 0 && (
              <Card className="border-0 shadow-soft">
                <CardContent className="p-12 text-center">
                  <MessageSquare className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-xl font-semibold mb-2">No Support Tickets</h3>
                  <p className="text-muted-foreground">
                    All caught up! No support tickets at the moment.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* User Details Dialog */}
        <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>User Details</DialogTitle>
              <DialogDescription>
                View and manage user information
              </DialogDescription>
            </DialogHeader>
            {selectedUser && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">First Name</label>
                    <p className="text-sm text-muted-foreground">
                      {selectedUser.profiles?.first_name || 'Not provided'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Last Name</label>
                    <p className="text-sm text-muted-foreground">
                      {selectedUser.profiles?.last_name || 'Not provided'}
                    </p>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Phone</label>
                  <p className="text-sm text-muted-foreground">
                    {selectedUser.profiles?.phone || 'Not provided'}
                  </p>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Roles</label>
                  <div className="flex gap-2 mt-1">
                    {selectedUser.user_roles.map((role, index) => (
                      <Badge key={index} variant={getRoleBadgeVariant(role.role)}>
                        {role.role}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Account Created</label>
                  <p className="text-sm text-muted-foreground">
                    {new Date(selectedUser.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowUserDialog(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create User Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>
                Add a new owner or marketing user to the system
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={createUserData.firstName}
                    onChange={(e) => setCreateUserData(prev => ({ ...prev, firstName: e.target.value }))}
                    placeholder="John"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={createUserData.lastName}
                    onChange={(e) => setCreateUserData(prev => ({ ...prev, lastName: e.target.value }))}
                    placeholder="Doe"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={createUserData.email}
                  onChange={(e) => setCreateUserData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="john@example.com"
                />
              </div>
              
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={createUserData.password}
                  onChange={(e) => setCreateUserData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="••••••••"
                />
              </div>
              
              <div>
                <Label htmlFor="role">Role</Label>
                <Select
                  value={createUserData.role}
                  onValueChange={(value: 'owner' | 'marketing') => 
                    setCreateUserData(prev => ({ ...prev, role: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="owner">Owner</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateUser} disabled={creating}>
                {creating ? "Creating..." : "Create User"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Delete User
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this user? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            {userToDelete && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-medium">
                  {userToDelete.profiles?.first_name} {userToDelete.profiles?.last_name}
                </p>
                <p className="text-sm text-muted-foreground">{userToDelete.email}</p>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmDeleteUser}>
                Delete User
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
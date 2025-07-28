import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Plus, MapPin, Trash2, Search, Filter, MoreHorizontal } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InteractiveServiceMap } from "./InteractiveServiceMap";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface ServiceAreasManagementProps {
  onBack: () => void;
}

interface ServiceArea {
  id: string;
  zip_code: string;
  allows_delivery: boolean;
  allows_locker: boolean;
  allows_express: boolean;
  is_active: boolean;
  created_at: string;
}

export const ServiceAreasManagement: React.FC<ServiceAreasManagementProps> = ({ onBack }) => {
  const [serviceAreas, setServiceAreas] = useState<ServiceArea[]>([]);
  const [filteredAreas, setFilteredAreas] = useState<ServiceArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMap, setShowMap] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [serviceFilter, setServiceFilter] = useState<'all' | 'delivery' | 'locker' | 'express'>('all');
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [newArea, setNewArea] = useState({
    zip_code: '',
    allows_delivery: true,
    allows_locker: true,
    allows_express: true
  });
  const { toast } = useToast();
  const { user, userRole } = useAuth();

  // Check if user has proper permissions
  const hasManagementAccess = userRole === 'owner' || userRole === 'operator';

  useEffect(() => {
    loadServiceAreas();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('service-areas-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'service_areas' },
        () => {
          loadServiceAreas();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Filter areas based on search and filters
  useEffect(() => {
    let filtered = serviceAreas;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(area => 
        area.zip_code.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(area => 
        statusFilter === 'active' ? area.is_active : !area.is_active
      );
    }

    // Service filter
    if (serviceFilter !== 'all') {
      filtered = filtered.filter(area => {
        switch (serviceFilter) {
          case 'delivery': return area.allows_delivery;
          case 'locker': return area.allows_locker;
          case 'express': return area.allows_express;
          default: return true;
        }
      });
    }

    setFilteredAreas(filtered);
  }, [serviceAreas, searchTerm, statusFilter, serviceFilter]);

  const loadServiceAreas = async () => {
    try {
      const { data, error } = await supabase
        .from('service_areas')
        .select('*')
        .order('zip_code');

      if (error) throw error;
      setServiceAreas(data || []);
      setFilteredAreas(data || []);
    } catch (error) {
      console.error('Error loading service areas:', error);
      toast({
        title: "Error",
        description: "Failed to load service areas",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddArea = async () => {
    if (!newArea.zip_code.trim()) {
      toast({
        title: "Error",
        description: "Please enter a zip code",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('service_areas')
        .insert([newArea]);

      if (error) {
        console.error('RLS Error:', error);
        throw error;
      }

      toast({
        title: "Success",
        description: "Service area added successfully"
      });

      setNewArea({
        zip_code: '',
        allows_delivery: true,
        allows_locker: true,
        allows_express: true
      });
      setShowAddForm(false);
    } catch (error: any) {
      console.error('Error adding service area:', error);
      toast({
        title: "Error",
        description: error.message?.includes('row-level security') 
          ? "Access denied. Please ensure you're logged in as an owner or operator."
          : "Failed to add service area",
        variant: "destructive"
      });
    }
  };

  const handleDeleteArea = async (id: string) => {
    try {
      const { error } = await supabase
        .from('service_areas')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Delete Error:', error);
        throw error;
      }

      toast({
        title: "Success",
        description: "Service area deleted successfully"
      });
    } catch (error: any) {
      console.error('Error deleting service area:', error);
      toast({
        title: "Error", 
        description: error.message?.includes('row-level security')
          ? "Access denied. Please ensure you're logged in as an owner or operator."
          : "Failed to delete service area",
        variant: "destructive"
      });
    }
  };

  const handleToggleActive = async (id: string, is_active: boolean) => {
    try {
      const { error } = await supabase
        .from('service_areas')
        .update({ is_active })
        .eq('id', id);

      if (error) {
        console.error('Update Error:', error);
        throw error;
      }

      toast({
        title: "Success",
        description: `Service area ${is_active ? 'activated' : 'deactivated'}`
      });
    } catch (error: any) {
      console.error('Error updating service area:', error);
      toast({
        title: "Error",
        description: error.message?.includes('row-level security')
          ? "Access denied. Please ensure you're logged in as an owner or operator."
          : "Failed to update service area",
        variant: "destructive"
      });
    }
  };

  const handleUpdateCapabilities = async (id: string, field: string, value: boolean) => {
    try {
      const { error } = await supabase
        .from('service_areas')
        .update({ [field]: value })
        .eq('id', id);

      if (error) {
        console.error('Update Capabilities Error:', error);
        throw error;
      }

      toast({
        title: "Success",
        description: "Service area updated successfully"
      });
    } catch (error: any) {
      console.error('Error updating service area:', error);
      toast({
        title: "Error",
        description: error.message?.includes('row-level security')
          ? "Access denied. Please ensure you're logged in as an owner or operator."
          : "Failed to update service area",
        variant: "destructive"
      });
    }
  };

  const handleBulkAction = async (action: 'activate' | 'deactivate' | 'delete') => {
    if (selectedAreas.length === 0) {
      toast({
        title: "No areas selected",
        description: "Please select areas to perform bulk actions",
        variant: "destructive"
      });
      return;
    }

    try {
      if (action === 'delete') {
        const { error } = await supabase
          .from('service_areas')
          .delete()
          .in('id', selectedAreas);

        if (error) throw error;
        toast({
          title: "Success",
          description: `${selectedAreas.length} areas deleted successfully`
        });
      } else {
        const is_active = action === 'activate';
        const { error } = await supabase
          .from('service_areas')
          .update({ is_active })
          .in('id', selectedAreas);

        if (error) throw error;
        toast({
          title: "Success",
          description: `${selectedAreas.length} areas ${action}d successfully`
        });
      }

      setSelectedAreas([]);
    } catch (error: any) {
      console.error('Error in bulk action:', error);
      toast({
        title: "Error",
        description: `Failed to ${action} selected areas`,
        variant: "destructive"
      });
    }
  };

  const toggleAreaSelection = (areaId: string) => {
    setSelectedAreas(prev => 
      prev.includes(areaId) 
        ? prev.filter(id => id !== areaId)
        : [...prev, areaId]
    );
  };

  const toggleSelectAll = () => {
    setSelectedAreas(prev => 
      prev.length === filteredAreas.length 
        ? [] 
        : filteredAreas.map(area => area.id)
    );
  };

  // Calculate statistics
  const stats = {
    total: serviceAreas.length,
    active: serviceAreas.filter(a => a.is_active).length,
    inactive: serviceAreas.filter(a => !a.is_active).length,
    delivery: serviceAreas.filter(a => a.allows_delivery && a.is_active).length,
    locker: serviceAreas.filter(a => a.allows_locker && a.is_active).length,
    express: serviceAreas.filter(a => a.allows_express && a.is_active).length
  };

  if (showMap) {
    return <InteractiveServiceMap onBack={() => setShowMap(false)} />;
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="p-6">
        <Button onClick={onBack} variant="outline" className="mb-4">
          ← Back to Dashboard
        </Button>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <h3 className="text-lg font-medium mb-2">Authentication Required</h3>
              <p className="text-muted-foreground">Please log in to access service area management.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!hasManagementAccess) {
    return (
      <div className="p-6">
        <Button onClick={onBack} variant="outline" className="mb-4">
          ← Back to Dashboard
        </Button>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <h3 className="text-lg font-medium mb-2">Access Denied</h3>
              <p className="text-muted-foreground">You need owner or operator privileges to manage service areas.</p>
              <p className="text-sm text-muted-foreground mt-2">Current role: {userRole}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button onClick={onBack} variant="outline" className="mb-4">
            ← Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold">Service Areas Management</h1>
          <p className="text-muted-foreground">Manage zip codes and their service capabilities</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Service Area
          </Button>
          <Button 
            variant="outline"
            onClick={() => setShowMap(true)}
            className="flex items-center gap-2"
          >
            <MapPin className="h-4 w-4" />
            View Coverage Map
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total Areas</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <div className="text-sm text-muted-foreground">Active</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{stats.inactive}</div>
            <div className="text-sm text-muted-foreground">Inactive</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.delivery}</div>
            <div className="text-sm text-muted-foreground">Delivery</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.locker}</div>
            <div className="text-sm text-muted-foreground">Locker</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.express}</div>
            <div className="text-sm text-muted-foreground">Express</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search zip codes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active Only</SelectItem>
            <SelectItem value="inactive">Inactive Only</SelectItem>
          </SelectContent>
        </Select>

        <Select value={serviceFilter} onValueChange={(value: any) => setServiceFilter(value)}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Filter by service" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Services</SelectItem>
            <SelectItem value="delivery">Delivery</SelectItem>
            <SelectItem value="locker">Locker</SelectItem>
            <SelectItem value="express">Express</SelectItem>
          </SelectContent>
        </Select>

        {selectedAreas.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <MoreHorizontal className="h-4 w-4" />
                Bulk Actions ({selectedAreas.length})
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleBulkAction('activate')}>
                Activate Selected
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleBulkAction('deactivate')}>
                Deactivate Selected
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleBulkAction('delete')}
                className="text-destructive"
              >
                Delete Selected
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Service Area</CardTitle>
            <CardDescription>Configure a new zip code with service capabilities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="zip_code">Zip Code</Label>
                <Input
                  id="zip_code"
                  value={newArea.zip_code}
                  onChange={(e) => setNewArea({ ...newArea, zip_code: e.target.value })}
                  placeholder="Enter zip code"
                />
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="allows_delivery">Home Delivery</Label>
                  <Switch
                    id="allows_delivery"
                    checked={newArea.allows_delivery}
                    onCheckedChange={(checked) => setNewArea({ ...newArea, allows_delivery: checked })}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="allows_locker">Locker Service</Label>
                  <Switch
                    id="allows_locker"
                    checked={newArea.allows_locker}
                    onCheckedChange={(checked) => setNewArea({ ...newArea, allows_locker: checked })}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="allows_express">Express Service</Label>
                  <Switch
                    id="allows_express"
                    checked={newArea.allows_express}
                    onCheckedChange={(checked) => setNewArea({ ...newArea, allows_express: checked })}
                  />
                </div>
              </div>
            </div>
            
            <div className="flex gap-2 mt-4">
              <Button onClick={handleAddArea}>Add Service Area</Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Area List with Selection */}
      {filteredAreas.length > 0 && (
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={selectedAreas.length === filteredAreas.length}
              onCheckedChange={toggleSelectAll}
            />
            <Label className="text-sm">
              Select All ({filteredAreas.length} areas)
            </Label>
          </div>
          <div className="text-sm text-muted-foreground">
            Showing {filteredAreas.length} of {serviceAreas.length} areas
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {filteredAreas.map((area) => (
          <Card key={area.id} className={!area.is_active ? 'opacity-50' : ''}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={selectedAreas.includes(area.id)}
                    onCheckedChange={() => toggleAreaSelection(area.id)}
                  />
                  <MapPin className="h-5 w-5 text-primary" />
                  <div>
                    <h3 className="font-semibold text-lg">{area.zip_code}</h3>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-muted-foreground">
                        Added {new Date(area.created_at).toLocaleDateString()}
                      </p>
                      {!area.is_active && (
                        <Badge variant="secondary" className="text-xs">Inactive</Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm">Delivery</Label>
                      <Switch
                        checked={area.allows_delivery}
                        onCheckedChange={(checked) => handleUpdateCapabilities(area.id, 'allows_delivery', checked)}
                        disabled={!area.is_active}
                      />
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Label className="text-sm">Locker</Label>
                      <Switch
                        checked={area.allows_locker}
                        onCheckedChange={(checked) => handleUpdateCapabilities(area.id, 'allows_locker', checked)}
                        disabled={!area.is_active}
                      />
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Label className="text-sm">Express</Label>
                      <Switch
                        checked={area.allows_express}
                        onCheckedChange={(checked) => handleUpdateCapabilities(area.id, 'allows_express', checked)}
                        disabled={!area.is_active}
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteArea(area.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    
                    <Label className="text-sm">Active</Label>
                    <Switch
                      checked={area.is_active}
                      onCheckedChange={(checked) => handleToggleActive(area.id, checked)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {filteredAreas.length === 0 && serviceAreas.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Filter className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No areas match your filters</h3>
                <p className="text-muted-foreground mb-4">Try adjusting your search or filter criteria</p>
                <Button variant="outline" onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setServiceFilter('all');
                }}>
                  Clear Filters
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        
        {serviceAreas.length === 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No service areas configured</h3>
                <p className="text-muted-foreground mb-4">Get started by adding your first service area</p>
                <Button onClick={() => setShowAddForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Service Area
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
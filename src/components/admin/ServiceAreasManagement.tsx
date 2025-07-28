import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Plus, MapPin, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ServiceAreasMap } from "./ServiceAreasMap";
import { Badge } from "@/components/ui/badge";

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
  const [loading, setLoading] = useState(true);
  const [showMap, setShowMap] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
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

  const loadServiceAreas = async () => {
    try {
      const { data, error } = await supabase
        .from('service_areas')
        .select('*')
        .order('zip_code');

      if (error) throw error;
      setServiceAreas(data || []);
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

  if (showMap) {
    return <ServiceAreasMap onBack={() => setShowMap(false)} />;
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

      <div className="grid gap-4">
        {serviceAreas.map((area) => (
          <Card key={area.id} className={!area.is_active ? 'opacity-50' : ''}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-primary" />
                  <div>
                    <h3 className="font-semibold text-lg">{area.zip_code}</h3>
                    <p className="text-sm text-muted-foreground">
                      Added {new Date(area.created_at).toLocaleDateString()}
                    </p>
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
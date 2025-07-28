import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Settings, 
  Plus, 
  Edit, 
  Trash2, 
  DollarSign,
  ArrowLeft,
  Save,
  Eye,
  EyeOff,
  Thermometer,
  Droplets
} from "lucide-react";

interface LaundryPreferencesManagementProps {
  onBack: () => void;
}

interface LaundryPreference {
  id: string;
  name: string;
  category: string;
  price_cents: number;
  description?: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function LaundryPreferencesManagement({ onBack }: LaundryPreferencesManagementProps) {
  const [preferences, setPreferences] = useState<LaundryPreference[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPreference, setEditingPreference] = useState<LaundryPreference | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    price: '',
    description: '',
    isDefault: false,
    isActive: true
  });

  const { toast } = useToast();

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from('laundry_preferences')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      setPreferences(data || []);
    } catch (error) {
      console.error('Error loading preferences:', error);
      toast({
        title: "Error",
        description: "Failed to load laundry preferences.",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      price: '',
      description: '',
      isDefault: false,
      isActive: true
    });
    setEditingPreference(null);
  };

  const handleEdit = (preference: LaundryPreference) => {
    setEditingPreference(preference);
    setFormData({
      name: preference.name,
      category: preference.category,
      price: (preference.price_cents / 100).toString(),
      description: preference.description || '',
      isDefault: preference.is_default,
      isActive: preference.is_active
    });
    setShowCreateForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const preferenceData = {
        name: formData.name,
        category: formData.category,
        price_cents: Math.round(parseFloat(formData.price) * 100),
        description: formData.description || null,
        is_default: formData.isDefault,
        is_active: formData.isActive
      };

      if (editingPreference) {
        // Update existing preference
        const { error } = await supabase
          .from('laundry_preferences')
          .update(preferenceData)
          .eq('id', editingPreference.id);

        if (error) throw error;

        toast({
          title: "Preference Updated",
          description: `${formData.name} has been updated successfully.`,
        });
      } else {
        // Create new preference
        const { error } = await supabase
          .from('laundry_preferences')
          .insert([preferenceData]);

        if (error) throw error;

        toast({
          title: "Preference Created",
          description: `${formData.name} has been added successfully.`,
        });
      }

      setShowCreateForm(false);
      resetForm();
      loadPreferences();
    } catch (error) {
      console.error('Error saving preference:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save preference. Please try again.",
        variant: "destructive",
      });
    }
    
    setIsLoading(false);
  };

  const togglePreferenceStatus = async (preferenceId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('laundry_preferences')
        .update({ is_active: !currentStatus })
        .eq('id', preferenceId);

      if (error) throw error;

      toast({
        title: currentStatus ? "Preference Disabled" : "Preference Enabled",
        description: `Preference has been ${currentStatus ? 'disabled' : 'enabled'} successfully.`,
      });

      loadPreferences();
    } catch (error) {
      console.error('Error updating preference status:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update preference status.",
        variant: "destructive",
      });
    }
  };

  const deletePreference = async (preferenceId: string, preferenceName: string) => {
    if (!confirm(`Are you sure you want to delete "${preferenceName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('laundry_preferences')
        .delete()
        .eq('id', preferenceId);

      if (error) throw error;

      toast({
        title: "Preference Deleted",
        description: `${preferenceName} has been deleted successfully.`,
      });

      loadPreferences();
    } catch (error) {
      console.error('Error deleting preference:', error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete preference. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'soap':
        return <Droplets className="h-4 w-4" />;
      case 'wash_temp':
      case 'dry_temp':
        return <Thermometer className="h-4 w-4" />;
      default:
        return <Settings className="h-4 w-4" />;
    }
  };

  const categories = Array.from(new Set(preferences.map(p => p.category)));

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
              Back to Shop Management
            </Button>
            
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Laundry Preferences
            </h1>
            <p className="text-muted-foreground">
              Manage soap types and temperature settings
            </p>
          </div>
          
          <Button
            variant="hero"
            onClick={() => {
              resetForm();
              setShowCreateForm(true);
            }}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add New Preference
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-0 shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Preferences</p>
                  <p className="text-2xl font-bold">{preferences.length}</p>
                </div>
                <Settings className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Preferences</p>
                  <p className="text-2xl font-bold">{preferences.filter(p => p.is_active).length}</p>
                </div>
                <Eye className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Categories</p>
                  <p className="text-2xl font-bold">{categories.length}</p>
                </div>
                <DollarSign className="h-8 w-8 text-accent" />
              </div>
            </CardContent>
          </Card>
        </div>

        {showCreateForm && (
          <Card className="border-0 shadow-soft mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {editingPreference ? <Edit className="h-5 w-5 text-primary" /> : <Plus className="h-5 w-5 text-primary" />}
                {editingPreference ? 'Edit Preference' : 'Add New Preference'}
              </CardTitle>
              <CardDescription>
                {editingPreference ? 'Update preference details and pricing' : 'Add a new laundry preference option'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Preference Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Scented (Default)"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select 
                      value={formData.category} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="soap">Soap</SelectItem>
                        <SelectItem value="wash_temp">Wash Temperature</SelectItem>
                        <SelectItem value="dry_temp">Dry Temperature</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price">Additional Price ($)</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                    placeholder="0.00"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe this preference option..."
                    rows={3}
                  />
                </div>

                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isDefault"
                      checked={formData.isDefault}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isDefault: checked }))}
                    />
                    <Label htmlFor="isDefault">Default option for this category</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                    />
                    <Label htmlFor="isActive">Active (visible to customers)</Label>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    type="submit"
                    variant="hero"
                    disabled={isLoading}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isLoading ? "Saving..." : editingPreference ? "Update Preference" : "Add Preference"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowCreateForm(false);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Preferences List by Category */}
        {categories.map(category => (
          <div key={category} className="mb-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              {getCategoryIcon(category)}
              <span className="capitalize">
                {category === 'soap' ? 'Soap Types' : 
                 category === 'wash_temp' ? 'Wash Temperatures' :
                 category === 'dry_temp' ? 'Dry Temperatures' : category}
              </span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {preferences
                .filter(preference => preference.category === category)
                .map((preference) => (
                  <Card key={preference.id} className="border-0 shadow-soft">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{preference.name}</h3>
                          <p className="text-2xl font-bold text-primary">
                            {preference.price_cents > 0 ? `+$${(preference.price_cents / 100).toFixed(2)}` : 'Free'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {preference.is_default && (
                            <Badge variant="secondary">Default</Badge>
                          )}
                          <Badge variant={preference.is_active ? "default" : "secondary"}>
                            {preference.is_active ? (
                              <>
                                <Eye className="h-3 w-3 mr-1" />
                                Active
                              </>
                            ) : (
                              <>
                                <EyeOff className="h-3 w-3 mr-1" />
                                Hidden
                              </>
                            )}
                          </Badge>
                        </div>
                      </div>

                      {preference.description && (
                        <p className="text-sm text-muted-foreground mb-4">
                          {preference.description}
                        </p>
                      )}

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(preference)}
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => togglePreferenceStatus(preference.id, preference.is_active)}
                        >
                          {preference.is_active ? (
                            <>
                              <EyeOff className="h-3 w-3 mr-1" />
                              Hide
                            </>
                          ) : (
                            <>
                              <Eye className="h-3 w-3 mr-1" />
                              Show
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600"
                          onClick={() => deletePreference(preference.id, preference.name)}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>
        ))}

        {preferences.length === 0 && (
          <Card className="border-0 shadow-soft">
            <CardContent className="p-12 text-center">
              <Settings className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-xl font-semibold mb-2">No Preferences Yet</h3>
              <p className="text-muted-foreground mb-4">
                Add your first laundry preference to get started.
              </p>
              <Button 
                variant="hero" 
                onClick={() => {
                  resetForm();
                  setShowCreateForm(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add First Preference
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  ArrowUp, 
  ArrowDown,
  Package,
  DollarSign,
  Users,
  Settings
} from "lucide-react";

interface BagSizesManagementProps {
  onBack: () => void;
}

interface BagSize {
  id: string;
  name: string;
  description: string | null;
  capacity_gallons: number | null;
  price_cents: number;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function BagSizesManagement({ onBack }: BagSizesManagementProps) {
  const [bagSizes, setBagSizes] = useState<BagSize[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    capacity_gallons: '',
    price_cents: '',
    is_active: true
  });

  const { toast } = useToast();

  useEffect(() => {
    loadBagSizes();
  }, []);

  const loadBagSizes = async () => {
    try {
      const { data, error } = await supabase
        .from('bag_sizes')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setBagSizes(data || []);
    } catch (error) {
      console.error('Error loading bag sizes:', error);
      toast({
        title: "Error",
        description: "Failed to load bag sizes",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (bagSize: BagSize) => {
    setEditingId(bagSize.id);
    setFormData({
      name: bagSize.name,
      description: bagSize.description || '',
      capacity_gallons: bagSize.capacity_gallons?.toString() || '',
      price_cents: (bagSize.price_cents / 100).toString(),
      is_active: bagSize.is_active
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const bagSizeData = {
        name: formData.name,
        description: formData.description || null,
        capacity_gallons: formData.capacity_gallons ? parseInt(formData.capacity_gallons) : null,
        price_cents: Math.round(parseFloat(formData.price_cents) * 100),
        is_active: formData.is_active
      };

      if (editingId) {
        // Update existing bag size
        const { error } = await supabase
          .from('bag_sizes')
          .update(bagSizeData)
          .eq('id', editingId);

        if (error) throw error;
        toast({ title: "Success", description: "Bag size updated successfully" });
      } else {
        // Create new bag size
        const maxOrder = Math.max(...bagSizes.map(b => b.display_order), 0);
        const { error } = await supabase
          .from('bag_sizes')
          .insert({
            ...bagSizeData,
            display_order: maxOrder + 1
          });

        if (error) throw error;
        toast({ title: "Success", description: "Bag size created successfully" });
      }

      setShowForm(false);
      setEditingId(null);
      setFormData({
        name: '',
        description: '',
        capacity_gallons: '',
        price_cents: '',
        is_active: true
      });
      loadBagSizes();
    } catch (error) {
      console.error('Error saving bag size:', error);
      toast({
        title: "Error",
        description: "Failed to save bag size",
        variant: "destructive"
      });
    }
  };

  const toggleBagSizeStatus = async (bagSizeId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('bag_sizes')
        .update({ is_active: !currentStatus })
        .eq('id', bagSizeId);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: `Bag size ${!currentStatus ? 'activated' : 'deactivated'} successfully`
      });
      loadBagSizes();
    } catch (error) {
      console.error('Error toggling bag size status:', error);
      toast({
        title: "Error",
        description: "Failed to update bag size status",
        variant: "destructive"
      });
    }
  };

  const deleteBagSize = async (bagSizeId: string, bagSizeName: string) => {
    if (!confirm(`Are you sure you want to delete "${bagSizeName}"?`)) return;

    try {
      const { error } = await supabase
        .from('bag_sizes')
        .delete()
        .eq('id', bagSizeId);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Bag size deleted successfully"
      });
      loadBagSizes();
    } catch (error) {
      console.error('Error deleting bag size:', error);
      toast({
        title: "Error",
        description: "Failed to delete bag size",
        variant: "destructive"
      });
    }
  };

  const reorderBagSize = async (bagSizeId: string, direction: 'up' | 'down') => {
    const currentIndex = bagSizes.findIndex(b => b.id === bagSizeId);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= bagSizes.length) return;

    try {
      const updates = [
        {
          id: bagSizes[currentIndex].id,
          display_order: bagSizes[targetIndex].display_order
        },
        {
          id: bagSizes[targetIndex].id,
          display_order: bagSizes[currentIndex].display_order
        }
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from('bag_sizes')
          .update({ display_order: update.display_order })
          .eq('id', update.id);

        if (error) throw error;
      }

      loadBagSizes();
    } catch (error) {
      console.error('Error reordering bag sizes:', error);
      toast({
        title: "Error",
        description: "Failed to reorder bag sizes",
        variant: "destructive"
      });
    }
  };

  const totalActiveBagSizes = bagSizes.filter(b => b.is_active).length;
  const averagePrice = bagSizes.length > 0 ? 
    bagSizes.reduce((sum, b) => sum + b.price_cents, 0) / bagSizes.length / 100 : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-none lg:max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 py-4 lg:py-6 space-y-4 lg:space-y-6 overflow-x-hidden">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
        <Button variant="outline" onClick={onBack} className="w-full sm:w-auto">
          <ArrowUp className="w-4 h-4 mr-2 flex-shrink-0" />
          <span className="break-words">Back to Owner Dashboard</span>
        </Button>
        <div className="w-full sm:flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold break-words">Bag Sizes & Pricing Management</h1>
          <p className="text-sm text-muted-foreground break-words">Manage your laundry bag sizes and pricing</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
        <Card className="w-full">
          <CardContent className="p-3 lg:p-4">
            <div className="flex items-center gap-2 lg:gap-3">
              <Package className="w-6 h-6 lg:w-8 lg:h-8 text-primary flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs lg:text-sm text-muted-foreground">Active Bag Sizes</p>
                <p className="text-lg lg:text-2xl font-bold">{totalActiveBagSizes}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="w-full">
          <CardContent className="p-3 lg:p-4">
            <div className="flex items-center gap-2 lg:gap-3">
              <DollarSign className="w-6 h-6 lg:w-8 lg:h-8 text-green-600 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs lg:text-sm text-muted-foreground">Average Price</p>
                <p className="text-lg lg:text-2xl font-bold">${averagePrice.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="w-full sm:col-span-2 lg:col-span-1">
          <CardContent className="p-3 lg:p-4">
            <div className="flex items-center gap-2 lg:gap-3">
              <Settings className="w-6 h-6 lg:w-8 lg:h-8 text-blue-600 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs lg:text-sm text-muted-foreground">Total Bag Types</p>
                <p className="text-lg lg:text-2xl font-bold">{bagSizes.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add New Bag Size Button */}
      {!showForm && (
        <Card className="w-full">
          <CardContent className="p-3 lg:p-6">
            <Button 
              onClick={() => setShowForm(true)}
              className="w-full sm:w-auto"
            >
              <Plus className="w-4 h-4 mr-2 flex-shrink-0" />
              <span className="break-words">Add New Bag Size</span>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <Card className="w-full">
          <CardHeader className="pb-3 lg:pb-6">
            <CardTitle className="text-lg lg:text-xl break-words">
              {editingId ? 'Edit Bag Size' : 'Add New Bag Size'}
            </CardTitle>
            <CardDescription className="text-sm break-words">
              Configure your bag size details and pricing
            </CardDescription>
          </CardHeader>
          <CardContent className="px-3 pb-3 lg:px-6 lg:pb-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="w-full">
                  <Label htmlFor="name" className="text-sm font-medium">Bag Size Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Small Bag, Large Bag"
                    required
                    className="w-full"
                  />
                </div>
                
                <div className="w-full">
                  <Label htmlFor="price" className="text-sm font-medium">Price (USD) *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price_cents}
                    onChange={(e) => setFormData({ ...formData, price_cents: e.target.value })}
                    placeholder="35.00"
                    required
                    className="w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="w-full">
                  <Label htmlFor="capacity" className="text-sm font-medium">Capacity (Gallons)</Label>
                  <Input
                    id="capacity"
                    type="number"
                    min="1"
                    value={formData.capacity_gallons}
                    onChange={(e) => setFormData({ ...formData, capacity_gallons: e.target.value })}
                    placeholder="13"
                    className="w-full"
                  />
                </div>

                <div className="flex items-center space-x-2 w-full">
                  <Switch
                    id="active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="active" className="text-sm font-medium">Active</Label>
                </div>
              </div>

              <div className="w-full">
                <Label htmlFor="description" className="text-sm font-medium">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Perfect for 1-2 people, includes shirts, pants, and undergarments"
                  className="min-h-[80px] w-full"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-2 w-full">
                <Button type="submit" className="w-full sm:w-auto">
                  <Save className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span className="break-words">{editingId ? 'Update' : 'Create'} Bag Size</span>
                </Button>
                <Button 
                  type="button" 
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                    setFormData({
                      name: '',
                      description: '',
                      capacity_gallons: '',
                      price_cents: '',
                      is_active: true
                    });
                  }}
                >
                  <X className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span className="break-words">Cancel</span>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Bag Sizes List */}
      <div className="space-y-3 lg:space-y-4 w-full">
        {bagSizes.length === 0 ? (
          <Card className="w-full">
            <CardContent className="p-6 lg:p-8 text-center">
              <Package className="w-10 h-10 lg:w-12 lg:h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-base lg:text-lg font-semibold mb-2 break-words">No bag sizes configured</h3>
              <p className="text-sm text-muted-foreground mb-4 break-words">
                Add your first bag size to start offering laundry services.
              </p>
              <Button onClick={() => setShowForm(true)} className="w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2 flex-shrink-0" />
                <span className="break-words">Add First Bag Size</span>
              </Button>
            </CardContent>
          </Card>
        ) : (
          bagSizes.map((bagSize, index) => (
            <Card key={bagSize.id} className="w-full">
              <CardContent className="p-3 lg:p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 lg:gap-4">
                  <div className="flex-1 min-w-0 w-full">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                      <h3 className="text-base lg:text-lg font-semibold break-words">{bagSize.name}</h3>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant={bagSize.is_active ? "default" : "secondary"} className="text-xs">
                          {bagSize.is_active ? "Active" : "Inactive"}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          ${(bagSize.price_cents / 100).toFixed(2)}
                        </Badge>
                        {bagSize.capacity_gallons && (
                          <Badge variant="outline" className="text-xs">
                            {bagSize.capacity_gallons} gallons
                          </Badge>
                        )}
                      </div>
                    </div>
                    {bagSize.description && (
                      <p className="text-sm text-muted-foreground break-words">{bagSize.description}</p>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full lg:w-auto">
                    <div className="flex items-center gap-1 sm:gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => reorderBagSize(bagSize.id, 'up')}
                        disabled={index === 0}
                        className="flex-1 sm:flex-none"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => reorderBagSize(bagSize.id, 'down')}
                        disabled={index === bagSizes.length - 1}
                        className="flex-1 sm:flex-none"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(bagSize)}
                        className="flex-1 sm:flex-none"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2">
                      <Button
                        variant={bagSize.is_active ? "outline" : "default"}
                        size="sm"
                        onClick={() => toggleBagSizeStatus(bagSize.id, bagSize.is_active)}
                        className="flex-1 sm:flex-none text-xs"
                      >
                        {bagSize.is_active ? "Deactivate" : "Activate"}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteBagSize(bagSize.id, bagSize.name)}
                        className="flex-1 sm:flex-none"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
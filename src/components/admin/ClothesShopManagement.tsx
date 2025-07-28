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
  Package, 
  Plus, 
  Edit, 
  Trash2, 
  DollarSign,
  Image,
  ArrowLeft,
  Save,
  Eye,
  EyeOff,
  Percent,
  Calculator
} from "lucide-react";

interface ClothesShopManagementProps {
  onBack: () => void;
}

interface ClothesItem {
  id: string;
  name: string;
  category: string;
  price_cents: number;
  description?: string;
  image_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function ClothesShopManagement({ onBack }: ClothesShopManagementProps) {
  const [items, setItems] = useState<ClothesItem[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showBulkPricing, setShowBulkPricing] = useState(false);
  const [editingItem, setEditingItem] = useState<ClothesItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [bulkPricingData, setBulkPricingData] = useState({
    category: '',
    priceAdjustment: '',
    adjustmentType: 'percentage' // 'percentage' or 'fixed'
  });
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    price: '',
    description: '',
    imageUrl: '',
    isActive: true
  });

  const { toast } = useToast();

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      const { data, error } = await supabase
        .from('clothes_items')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error loading items:', error);
      toast({
        title: "Error",
        description: "Failed to load clothes items.",
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
      imageUrl: '',
      isActive: true
    });
    setEditingItem(null);
  };

  const handleEdit = (item: ClothesItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category: item.category,
      price: (item.price_cents / 100).toString(),
      description: item.description || '',
      imageUrl: item.image_url || '',
      isActive: item.is_active
    });
    setShowCreateForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const itemData = {
        name: formData.name,
        category: formData.category,
        price_cents: Math.round(parseFloat(formData.price) * 100),
        description: formData.description || null,
        image_url: formData.imageUrl || null,
        is_active: formData.isActive
      };

      if (editingItem) {
        // Update existing item
        const { error } = await supabase
          .from('clothes_items')
          .update(itemData)
          .eq('id', editingItem.id);

        if (error) throw error;

        toast({
          title: "Item Updated",
          description: `${formData.name} has been updated successfully.`,
        });
      } else {
        // Create new item
        const { error } = await supabase
          .from('clothes_items')
          .insert([itemData]);

        if (error) throw error;

        toast({
          title: "Item Created",
          description: `${formData.name} has been added to the shop.`,
        });
      }

      setShowCreateForm(false);
      resetForm();
      loadItems();
    } catch (error) {
      console.error('Error saving item:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save item. Please try again.",
        variant: "destructive",
      });
    }
    
    setIsLoading(false);
  };

  const toggleItemStatus = async (itemId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('clothes_items')
        .update({ is_active: !currentStatus })
        .eq('id', itemId);

      if (error) throw error;

      toast({
        title: currentStatus ? "Item Disabled" : "Item Enabled",
        description: `Item has been ${currentStatus ? 'disabled' : 'enabled'} successfully.`,
      });

      loadItems();
    } catch (error) {
      console.error('Error updating item status:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update item status.",
        variant: "destructive",
      });
    }
  };

  const deleteItem = async (itemId: string, itemName: string) => {
    if (!confirm(`Are you sure you want to delete "${itemName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('clothes_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      toast({
        title: "Item Deleted",
        description: `${itemName} has been deleted successfully.`,
      });

      loadItems();
    } catch (error) {
      console.error('Error deleting item:', error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete item. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleBulkPricing = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const adjustment = parseFloat(bulkPricingData.priceAdjustment);
      if (isNaN(adjustment)) {
        throw new Error('Invalid price adjustment value');
      }

      const itemsToUpdate = bulkPricingData.category === 'all' 
        ? items 
        : items.filter(item => item.category === bulkPricingData.category);

      const updates = itemsToUpdate.map(item => {
        let newPriceCents: number;
        
        if (bulkPricingData.adjustmentType === 'percentage') {
          // Apply percentage change
          newPriceCents = Math.round(item.price_cents * (1 + adjustment / 100));
        } else {
          // Apply fixed amount change
          newPriceCents = Math.round(item.price_cents + (adjustment * 100));
        }

        // Ensure price is not negative
        newPriceCents = Math.max(0, newPriceCents);

        return {
          id: item.id,
          price_cents: newPriceCents
        };
      });

      // Update all items in batch
      for (const update of updates) {
        const { error } = await supabase
          .from('clothes_items')
          .update({ price_cents: update.price_cents })
          .eq('id', update.id);

        if (error) throw error;
      }

      toast({
        title: "Bulk Pricing Updated",
        description: `Updated prices for ${updates.length} items successfully.`,
      });

      setShowBulkPricing(false);
      setBulkPricingData({
        category: '',
        priceAdjustment: '',
        adjustmentType: 'percentage'
      });
      loadItems();
    } catch (error) {
      console.error('Error updating bulk pricing:', error);
      toast({
        title: "Bulk Pricing Failed",
        description: "Failed to update pricing. Please try again.",
        variant: "destructive",
      });
    }
    
    setIsLoading(false);
  };

  const categories = Array.from(new Set(items.map(item => item.category)));

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
              Clothes Shop Management
            </h1>
            <p className="text-muted-foreground">
              Manage items, pricing, and availability in real-time
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="hero"
              onClick={() => {
                resetForm();
                setShowCreateForm(true);
              }}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add New Item
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setShowBulkPricing(true)}
              className="flex items-center gap-2"
            >
              <Calculator className="h-4 w-4" />
              Bulk Pricing
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="border-0 shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Items</p>
                  <p className="text-2xl font-bold">{items.length}</p>
                </div>
                <Package className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Items</p>
                  <p className="text-2xl font-bold">{items.filter(item => item.is_active).length}</p>
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
                <Package className="h-8 w-8 text-accent" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Price</p>
                  <p className="text-2xl font-bold">
                    ${items.length > 0 ? (items.reduce((sum, item) => sum + item.price_cents, 0) / items.length / 100).toFixed(2) : '0.00'}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-secondary" />
              </div>
            </CardContent>
          </Card>
        </div>

        {showCreateForm && (
          <Card className="border-0 shadow-soft mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {editingItem ? <Edit className="h-5 w-5 text-primary" /> : <Plus className="h-5 w-5 text-primary" />}
                {editingItem ? 'Edit Item' : 'Add New Item'}
              </CardTitle>
              <CardDescription>
                {editingItem ? 'Update item details and pricing' : 'Add a new service item to the shop'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Item Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Standard Wash & Fold"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Input
                      id="category"
                      value={formData.category}
                      onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                      placeholder="e.g., Regular, Delicate, Special"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">Price ($)</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                      placeholder="15.00"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="imageUrl">Image URL (Optional)</Label>
                    <Input
                      id="imageUrl"
                      type="url"
                      value={formData.imageUrl}
                      onChange={(e) => setFormData(prev => ({ ...prev, imageUrl: e.target.value }))}
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe the service..."
                    rows={3}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                  />
                  <Label htmlFor="isActive">Active (visible to customers)</Label>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    type="submit"
                    variant="hero"
                    disabled={isLoading}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isLoading ? "Saving..." : editingItem ? "Update Item" : "Add Item"}
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

        {showBulkPricing && (
          <Card className="border-0 shadow-soft mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-primary" />
                Bulk Pricing Update
              </CardTitle>
              <CardDescription>
                Apply price changes to multiple items at once
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleBulkPricing} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bulk-category">Category</Label>
                    <Select 
                      value={bulkPricingData.category} 
                      onValueChange={(value) => setBulkPricingData(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories.map(category => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="adjustment-type">Adjustment Type</Label>
                    <Select 
                      value={bulkPricingData.adjustmentType} 
                      onValueChange={(value) => setBulkPricingData(prev => ({ ...prev, adjustmentType: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">
                          <div className="flex items-center gap-2">
                            <Percent className="h-4 w-4" />
                            Percentage
                          </div>
                        </SelectItem>
                        <SelectItem value="fixed">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            Fixed Amount
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="adjustment-value">
                      {bulkPricingData.adjustmentType === 'percentage' ? 'Percentage Change' : 'Amount Change ($)'}
                    </Label>
                    <Input
                      id="adjustment-value"
                      type="number"
                      step={bulkPricingData.adjustmentType === 'percentage' ? '1' : '0.01'}
                      value={bulkPricingData.priceAdjustment}
                      onChange={(e) => setBulkPricingData(prev => ({ ...prev, priceAdjustment: e.target.value }))}
                      placeholder={bulkPricingData.adjustmentType === 'percentage' ? '10 (for +10%)' : '5.00 (for +$5.00)'}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      {bulkPricingData.adjustmentType === 'percentage' 
                        ? 'Use negative values to decrease prices (e.g., -10 for -10%)'
                        : 'Use negative values to decrease prices (e.g., -2.50 for -$2.50)'
                      }
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    type="submit"
                    variant="hero"
                    disabled={isLoading || !bulkPricingData.category || !bulkPricingData.priceAdjustment}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isLoading ? "Updating..." : "Apply Bulk Changes"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowBulkPricing(false);
                      setBulkPricingData({
                        category: '',
                        priceAdjustment: '',
                        adjustmentType: 'percentage'
                      });
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Items List by Category */}
        {categories.map(category => (
          <div key={category} className="mb-8">
            <h2 className="text-xl font-semibold mb-4 capitalize">{category}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items
                .filter(item => item.category === category)
                .map((item) => (
                  <Card key={item.id} className="border-0 shadow-soft">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{item.name}</h3>
                          <p className="text-2xl font-bold text-primary">
                            ${(item.price_cents / 100).toFixed(2)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={item.is_active ? "default" : "secondary"}>
                            {item.is_active ? (
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

                      {item.description && (
                        <p className="text-sm text-muted-foreground mb-4">
                          {item.description}
                        </p>
                      )}

                      {item.image_url && (
                        <div className="mb-4">
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-full h-32 object-cover rounded-lg"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(item)}
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleItemStatus(item.id, item.is_active)}
                        >
                          {item.is_active ? (
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
                          onClick={() => deleteItem(item.id, item.name)}
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

        {items.length === 0 && (
          <Card className="border-0 shadow-soft">
            <CardContent className="p-12 text-center">
              <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-xl font-semibold mb-2">No Items Yet</h3>
              <p className="text-muted-foreground mb-4">
                Add your first service item to get started.
              </p>
              <Button 
                variant="hero" 
                onClick={() => {
                  resetForm();
                  setShowCreateForm(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add First Item
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
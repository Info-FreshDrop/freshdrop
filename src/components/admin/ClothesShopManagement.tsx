import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  ArrowLeft,
  Package,
  Plus,
  Edit,
  Trash2,
  ShoppingBag,
  Palette,
  Ruler
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
  product_options?: {
    colors?: string[];
    sizes?: string[];
    custom_options?: Array<{
      name: string;
      values: string[];
      required: boolean;
    }>;
  };
  created_at: string;
  updated_at: string;
}

export function ClothesShopManagement({ onBack }: ClothesShopManagementProps) {
  const { toast } = useToast();
  const [items, setItems] = useState<ClothesItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<ClothesItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    price_cents: 0,
    description: '',
    image_url: '',
    is_active: true,
    colors: [''],
    sizes: [''],
    custom_options: [] as Array<{
      name: string;
      values: string[];
      required: boolean;
    }>
  });

  const categories = [
    'Clothing',
    'Bedding',
    'Towels',
    'Accessories',
    'Laundry Supplies',
    'Home Goods'
  ];

  const defaultSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
  const defaultColors = ['Black', 'White', 'Gray', 'Navy', 'Red', 'Blue', 'Green', 'Pink', 'Purple', 'Yellow', 'Orange'];

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      const { data, error } = await supabase
        .from('clothes_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error loading items:', error);
      toast({
        title: "Error",
        description: "Failed to load shop items.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      price_cents: 0,
      description: '',
      image_url: '',
      is_active: true,
      colors: [''],
      sizes: [''],
      custom_options: []
    });
    setEditingItem(null);
    setShowForm(false);
  };

  const handleEdit = (item: ClothesItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category: item.category,
      price_cents: item.price_cents,
      description: item.description || '',
      image_url: item.image_url || '',
      is_active: item.is_active,
      colors: item.product_options?.colors || [''],
      sizes: item.product_options?.sizes || [''],
      custom_options: item.product_options?.custom_options || []
    });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.category || formData.price_cents <= 0) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields with valid values.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const productOptions = {
        colors: formData.colors.filter(c => c.trim()),
        sizes: formData.sizes.filter(s => s.trim()),
        custom_options: formData.custom_options.filter(opt => opt.name.trim())
      };

      const itemData = {
        name: formData.name.trim(),
        category: formData.category,
        price_cents: formData.price_cents,
        description: formData.description.trim() || null,
        image_url: formData.image_url.trim() || null,
        is_active: formData.is_active,
        product_options: productOptions,
        updated_at: new Date().toISOString()
      };

      if (editingItem) {
        const { error } = await supabase
          .from('clothes_items')
          .update(itemData)
          .eq('id', editingItem.id);

        if (error) throw error;

        toast({
          title: "Item Updated",
          description: "Shop item has been updated successfully.",
        });
      } else {
        const { error } = await supabase
          .from('clothes_items')
          .insert([itemData]);

        if (error) throw error;

        toast({
          title: "Item Created",
          description: "New shop item has been added successfully.",
        });
      }

      resetForm();
      loadItems();
    } catch (error) {
      console.error('Error saving item:', error);
      toast({
        title: "Error",
        description: "Failed to save item. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      const { error } = await supabase
        .from('clothes_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      toast({
        title: "Item Deleted",
        description: "Shop item has been deleted successfully.",
      });

      loadItems();
    } catch (error) {
      console.error('Error deleting item:', error);
      toast({
        title: "Error",
        description: "Failed to delete item.",
        variant: "destructive",
      });
    }
  };

  const addColorField = () => {
    setFormData(prev => ({
      ...prev,
      colors: [...prev.colors, '']
    }));
  };

  const updateColor = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      colors: prev.colors.map((color, i) => i === index ? value : color)
    }));
  };

  const removeColor = (index: number) => {
    setFormData(prev => ({
      ...prev,
      colors: prev.colors.filter((_, i) => i !== index)
    }));
  };

  const addSizeField = () => {
    setFormData(prev => ({
      ...prev,
      sizes: [...prev.sizes, '']
    }));
  };

  const updateSize = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      sizes: prev.sizes.map((size, i) => i === index ? value : size)
    }));
  };

  const removeSize = (index: number) => {
    setFormData(prev => ({
      ...prev,
      sizes: prev.sizes.filter((_, i) => i !== index)
    }));
  };

  const addCustomOption = () => {
    setFormData(prev => ({
      ...prev,
      custom_options: [...prev.custom_options, {
        name: '',
        values: [''],
        required: false
      }]
    }));
  };

  const updateCustomOption = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      custom_options: prev.custom_options.map((opt, i) => 
        i === index ? { ...opt, [field]: value } : opt
      )
    }));
  };

  const removeCustomOption = (index: number) => {
    setFormData(prev => ({
      ...prev,
      custom_options: prev.custom_options.filter((_, i) => i !== index)
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-wave flex items-center justify-center">
        <div className="text-center">
          <Package className="h-8 w-8 animate-pulse mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading shop items...</p>
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
                Clothes Shop Management
              </h1>
              <p className="text-muted-foreground">
                Manage your clothing inventory, pricing, and product options
              </p>
            </div>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add New Item
            </Button>
          </div>
        </div>

        {/* Form */}
        {showForm && (
          <Card className="mb-6 border-0 shadow-soft">
            <CardHeader>
              <CardTitle>{editingItem ? 'Edit Item' : 'Add New Item'}</CardTitle>
              <CardDescription>
                Configure product details, pricing, and available options
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Product Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter product name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select 
                    value={formData.category} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Price *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="price"
                    type="number"
                    value={formData.price_cents / 100}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      price_cents: Math.round(parseFloat(e.target.value || '0') * 100)
                    }))}
                    placeholder="0.00"
                    className="pl-8"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Product description..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="image_url">Image URL</Label>
                <Input
                  id="image_url"
                  value={formData.image_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              {/* Product Options */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Product Options
                </h3>

                {/* Colors */}
                <div className="space-y-2">
                  <Label>Available Colors</Label>
                  {formData.colors.map((color, index) => (
                    <div key={index} className="flex gap-2">
                      <Select 
                        value={color} 
                        onValueChange={(value) => updateColor(index, value)}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Select color" />
                        </SelectTrigger>
                        <SelectContent>
                          {defaultColors.map(c => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => removeColor(index)}
                        disabled={formData.colors.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addColorField}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Color
                  </Button>
                </div>

                {/* Sizes */}
                <div className="space-y-2">
                  <Label>Available Sizes</Label>
                  {formData.sizes.map((size, index) => (
                    <div key={index} className="flex gap-2">
                      <Select 
                        value={size} 
                        onValueChange={(value) => updateSize(index, value)}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Select size" />
                        </SelectTrigger>
                        <SelectContent>
                          {defaultSizes.map(s => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => removeSize(index)}
                        disabled={formData.sizes.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addSizeField}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Size
                  </Button>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
                <Label htmlFor="is_active">Active (visible in shop)</Label>
              </div>

              {/* Form Actions */}
              <div className="flex gap-2">
                <Button onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : editingItem ? 'Update Item' : 'Create Item'}
                </Button>
                <Button variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Items List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <Card key={item.id} className="border-0 shadow-soft">
              <CardContent className="p-4">
                {item.image_url && (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-full h-32 object-cover rounded-lg mb-3"
                  />
                )}
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{item.name}</h3>
                    <Badge variant={item.is_active ? "default" : "secondary"}>
                      {item.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-muted-foreground">{item.category}</p>
                  <p className="text-lg font-bold text-primary">
                    ${(item.price_cents / 100).toFixed(2)}
                  </p>
                  
                  {item.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {item.description}
                    </p>
                  )}

                  {/* Product Options Summary */}
                  {item.product_options && (
                    <div className="text-xs space-y-1">
                      {item.product_options.colors && item.product_options.colors.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Palette className="h-3 w-3" />
                          <span>{item.product_options.colors.length} colors</span>
                        </div>
                      )}
                      {item.product_options.sizes && item.product_options.sizes.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Ruler className="h-3 w-3" />
                          <span>{item.product_options.sizes.length} sizes</span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(item)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleDelete(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {items.length === 0 && (
          <Card className="border-0 shadow-soft">
            <CardContent className="p-12 text-center">
              <ShoppingBag className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-xl font-semibold mb-2">No Items Yet</h3>
              <p className="text-muted-foreground mb-4">
                Start building your shop by adding your first product
              </p>
              <Button onClick={() => setShowForm(true)}>
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
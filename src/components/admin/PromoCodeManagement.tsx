import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Percent, DollarSign, ShoppingBag } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface PromoCodeManagementProps {
  onBack: () => void;
}

interface PromoCode {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  description: string | null;
  is_active: boolean;
  one_time_use_per_user: boolean;
  restricted_to_item_ids: string[] | null;
  created_at: string;
  updated_at: string;
}

interface ClothesItem {
  id: string;
  name: string;
  category: string;
  price_cents: number;
}

export const PromoCodeManagement: React.FC<PromoCodeManagementProps> = ({ onBack }) => {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [clothesItems, setClothesItems] = useState<ClothesItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCode, setEditingCode] = useState<PromoCode | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    discount_type: 'percentage',
    discount_value: 0,
    description: '',
    is_active: true,
    one_time_use_per_user: false,
    restricted_to_item_ids: [] as string[]
  });
  const { toast } = useToast();

  useEffect(() => {
    loadPromoCodes();
    loadClothesItems();
  }, []);

  const loadPromoCodes = async () => {
    try {
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPromoCodes(data || []);
    } catch (error) {
      console.error('Error loading promo codes:', error);
      toast({
        title: "Error",
        description: "Failed to load promo codes",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadClothesItems = async () => {
    try {
      const { data, error } = await supabase
        .from('clothes_items')
        .select('id, name, category, price_cents')
        .eq('is_active', true)
        .order('category, name');

      if (error) throw error;
      setClothesItems(data || []);
    } catch (error) {
      console.error('Error loading clothes items:', error);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({
      code: '',
      discount_type: 'percentage',
      discount_value: 0,
      description: '',
      is_active: true,
      one_time_use_per_user: false,
      restricted_to_item_ids: []
    });
    setEditingCode(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validation
      if (!formData.code.trim()) {
        toast({
          title: "Error",
          description: "Promo code is required",
          variant: "destructive"
        });
        return;
      }

      if (formData.discount_value <= 0) {
        toast({
          title: "Error", 
          description: "Discount value must be greater than 0",
          variant: "destructive"
        });
        return;
      }

      if (formData.discount_type === 'percentage' && formData.discount_value > 100) {
        toast({
          title: "Error",
          description: "Percentage discount cannot exceed 100%",
          variant: "destructive"
        });
        return;
      }

      const promoData = {
        code: formData.code.toUpperCase().trim(),
        discount_type: formData.discount_type,
        discount_value: formData.discount_value,
        description: formData.description.trim() || null,
        is_active: formData.is_active,
        one_time_use_per_user: formData.one_time_use_per_user,
        restricted_to_item_ids: formData.restricted_to_item_ids.length > 0 ? formData.restricted_to_item_ids : null,
        updated_at: new Date().toISOString()
      };

      if (editingCode) {
        // Update existing promo code
        const { error } = await supabase
          .from('promo_codes')
          .update(promoData)
          .eq('id', editingCode.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Promo code updated successfully"
        });
      } else {
        // Create new promo code
        const { error } = await supabase
          .from('promo_codes')
          .insert([promoData]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Promo code created successfully"
        });
      }

      resetForm();
      loadPromoCodes();
    } catch (error: any) {
      console.error('Error saving promo code:', error);
      
      if (error.code === '23505') {
        toast({
          title: "Error",
          description: "A promo code with this name already exists",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to save promo code",
          variant: "destructive"
        });
      }
    }
  };

  const handleEdit = (promoCode: PromoCode) => {
    setEditingCode(promoCode);
    setFormData({
      code: promoCode.code,
      discount_type: promoCode.discount_type,
      discount_value: promoCode.discount_value,
      description: promoCode.description || '',
      is_active: promoCode.is_active,
      one_time_use_per_user: promoCode.one_time_use_per_user,
      restricted_to_item_ids: promoCode.restricted_to_item_ids || []
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this promo code?')) return;

    try {
      const { error } = await supabase
        .from('promo_codes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Promo code deleted successfully"
      });

      loadPromoCodes();
    } catch (error) {
      console.error('Error deleting promo code:', error);
      toast({
        title: "Error",
        description: "Failed to delete promo code",
        variant: "destructive"
      });
    }
  };

  const toggleStatus = async (id: string, is_active: boolean) => {
    try {
      const { error } = await supabase
        .from('promo_codes')
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Promo code ${is_active ? 'activated' : 'deactivated'} successfully`
      });

      loadPromoCodes();
    } catch (error) {
      console.error('Error updating promo code status:', error);
      toast({
        title: "Error",
        description: "Failed to update promo code status",
        variant: "destructive"
      });
    }
  };

  const getDiscountDisplay = (type: string, value: number) => {
    if (type === 'percentage') {
      return `${value}% off`;
    } else {
      return `$${(value / 100).toFixed(2)} off`;
    }
  };

  const handleItemSelection = (itemId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      restricted_to_item_ids: checked 
        ? [...prev.restricted_to_item_ids, itemId]
        : prev.restricted_to_item_ids.filter(id => id !== itemId)
    }));
  };

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
          <h1 className="text-3xl font-bold">Promo Code Management</h1>
          <p className="text-muted-foreground">Create and manage discount codes for customers</p>
        </div>
        <Button 
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          {editingCode ? 'Cancel Edit' : 'Create Promo Code'}
        </Button>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingCode ? 'Edit Promo Code' : 'Create New Promo Code'}</CardTitle>
            <CardDescription>
              {editingCode ? 'Update the promo code details' : 'Add a new discount code for customers'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="code">Promo Code</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => handleInputChange('code', e.target.value)}
                    placeholder="e.g., SAVE20, WELCOME"
                    required
                    className="uppercase"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Will be converted to uppercase
                  </p>
                </div>
                <div>
                  <Label htmlFor="discount_type">Discount Type</Label>
                  <Select 
                    value={formData.discount_type} 
                    onValueChange={(value) => handleInputChange('discount_type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage Off</SelectItem>
                      <SelectItem value="fixed">Fixed Amount Off</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="discount_value">
                  Discount Value {formData.discount_type === 'percentage' ? '(%)' : '($)'}
                </Label>
                <Input
                  id="discount_value"
                  type="number"
                  value={formData.discount_value}
                  onChange={(e) => handleInputChange('discount_value', parseFloat(e.target.value) || 0)}
                  placeholder={formData.discount_type === 'percentage' ? '20' : '5.00'}
                  min="0"
                  max={formData.discount_type === 'percentage' ? '100' : undefined}
                  step={formData.discount_type === 'percentage' ? '1' : '0.01'}
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Brief description of this promo code..."
                  rows={2}
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => handleInputChange('is_active', checked)}
                  />
                  <Label htmlFor="is_active">Active</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="one_time_use"
                    checked={formData.one_time_use_per_user}
                    onCheckedChange={(checked) => handleInputChange('one_time_use_per_user', checked)}
                  />
                  <Label htmlFor="one_time_use">One-time use per user</Label>
                </div>

                {/* Item Restrictions */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Restrict to specific items (optional)</Label>
                  <div className="max-h-48 overflow-y-auto border rounded-md p-3 space-y-2">
                    {clothesItems.map((item) => (
                      <div key={item.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`item-${item.id}`}
                          checked={formData.restricted_to_item_ids.includes(item.id)}
                          onCheckedChange={(checked) => handleItemSelection(item.id, checked as boolean)}
                        />
                        <Label htmlFor={`item-${item.id}`} className="text-sm flex-1 cursor-pointer">
                          <span className="font-medium">{item.name}</span>
                          <span className="text-muted-foreground ml-2">({item.category}) - ${(item.price_cents / 100).toFixed(2)}</span>
                        </Label>
                      </div>
                    ))}
                  </div>
                  {formData.restricted_to_item_ids.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Selected {formData.restricted_to_item_ids.length} item(s)
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit">
                  {editingCode ? 'Update Promo Code' : 'Create Promo Code'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Promo Codes List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Percent className="h-5 w-5" />
            Active Promo Codes ({promoCodes.filter(p => p.is_active).length})
          </CardTitle>
          <CardDescription>Manage your discount codes</CardDescription>
        </CardHeader>
        <CardContent>
          {promoCodes.length === 0 ? (
            <div className="text-center py-8">
              <Percent className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No promo codes yet</h3>
              <p className="text-muted-foreground mb-4">Create your first promo code to start offering discounts</p>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Promo Code
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {promoCodes.map((promoCode) => (
                <div key={promoCode.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {promoCode.discount_type === 'percentage' ? (
                        <Percent className="h-4 w-4 text-primary" />
                      ) : (
                        <DollarSign className="h-4 w-4 text-primary" />
                      )}
                      <Badge variant={promoCode.is_active ? "default" : "secondary"}>
                        {promoCode.code}
                      </Badge>
                    </div>
                    <div>
                      <h4 className="font-medium">
                        {getDiscountDisplay(promoCode.discount_type, promoCode.discount_value)}
                      </h4>
                      {promoCode.description && (
                        <p className="text-sm text-muted-foreground">{promoCode.description}</p>
                      )}
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>Created: {new Date(promoCode.created_at).toLocaleDateString()}</span>
                        {promoCode.one_time_use_per_user && (
                          <Badge variant="outline" className="text-xs">One-time use</Badge>
                        )}
                        {promoCode.restricted_to_item_ids && promoCode.restricted_to_item_ids.length > 0 && (
                          <Badge variant="outline" className="text-xs flex items-center gap-1">
                            <ShoppingBag className="h-3 w-3" />
                            {promoCode.restricted_to_item_ids.length} item(s)
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm">Active</Label>
                      <Switch
                        checked={promoCode.is_active}
                        onCheckedChange={(checked) => toggleStatus(promoCode.id, checked)}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(promoCode)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(promoCode.id)}
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
    </div>
  );
};
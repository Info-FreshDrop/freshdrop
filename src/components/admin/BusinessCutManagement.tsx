import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { 
  DollarSign, 
  Edit,
  TrendingUp,
  Percent,
  Calculator,
  PieChart
} from "lucide-react";

interface BusinessSetting {
  id: string;
  setting_key: string;
  setting_value: any;
  description: string | null;
  updated_by: string | null;
  updated_at: string;
}

interface RevenueSplitSettings {
  business_percentage: number;
  operator_percentage: number;
  split_type: 'percentage' | 'fixed';
  minimum_business_cut_cents: number;
  minimum_operator_cut_cents: number;
}

interface PricingSettings {
  base_price_cents: number;
  per_bag_cents: number;
  express_surcharge_cents: number;
  currency: string;
}

export function BusinessCutManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<BusinessSetting[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingRevenue, setEditingRevenue] = useState(false);
  const [editingPricing, setEditingPricing] = useState(false);
  
  const [revenueSplit, setRevenueSplit] = useState<RevenueSplitSettings>({
    business_percentage: 50,
    operator_percentage: 50,
    split_type: 'percentage',
    minimum_business_cut_cents: 0,
    minimum_operator_cut_cents: 0
  });

  const [pricing, setPricing] = useState<PricingSettings>({
    base_price_cents: 3500,
    per_bag_cents: 3500,
    express_surcharge_cents: 1000,
    currency: 'USD'
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('business_settings')
        .select('*')
        .order('setting_key');

      if (error) throw error;

      setSettings(data || []);
      
      // Load specific settings
      const revenueSettings = data?.find(s => s.setting_key === 'revenue_split');
      if (revenueSettings) {
        setRevenueSplit(revenueSettings.setting_value as unknown as RevenueSplitSettings);
      }

      const pricingSettings = data?.find(s => s.setting_key === 'pricing_structure');
      if (pricingSettings) {
        setPricing(pricingSettings.setting_value as unknown as PricingSettings);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast({
        title: "Error",
        description: "Failed to load business settings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const saveRevenueSplit = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('business_settings')
        .update({
          setting_value: revenueSplit as any,
          updated_by: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('setting_key', 'revenue_split');

      if (error) throw error;

      toast({
        title: "Success",
        description: "Revenue split settings updated successfully"
      });

      setEditingRevenue(false);
      loadSettings();
    } catch (error) {
      console.error('Error updating revenue split:', error);
      toast({
        title: "Error",
        description: "Failed to update revenue split settings",
        variant: "destructive"
      });
    }
  };

  const savePricingSettings = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('business_settings')
        .update({
          setting_value: pricing as any,
          updated_by: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('setting_key', 'pricing_structure');

      if (error) throw error;

      toast({
        title: "Success",
        description: "Pricing settings updated successfully"
      });

      setEditingPricing(false);
      loadSettings();
    } catch (error) {
      console.error('Error updating pricing:', error);
      toast({
        title: "Error",
        description: "Failed to update pricing settings",
        variant: "destructive"
      });
    }
  };

  const handleRevenuePercentageChange = (field: 'business_percentage' | 'operator_percentage', value: number) => {
    const newSplit = { ...revenueSplit };
    newSplit[field] = value;
    
    // Auto-adjust the other percentage to maintain 100% total
    if (field === 'business_percentage') {
      newSplit.operator_percentage = 100 - value;
    } else {
      newSplit.business_percentage = 100 - value;
    }
    
    setRevenueSplit(newSplit);
  };

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const calculateSampleSplit = (orderTotal: number) => {
    const businessCut = Math.floor(orderTotal * revenueSplit.business_percentage / 100);
    const operatorCut = orderTotal - businessCut;
    return { businessCut, operatorCut };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="text-sm text-muted-foreground">Loading business settings...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Revenue Split Configuration */}
      <Card className="border-0 shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5 text-primary" />
            Revenue Split Configuration
          </CardTitle>
          <CardDescription>
            Configure how revenue is split between business and operators
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Business Cut</Label>
                  <Badge variant="secondary" className="bg-primary text-primary-foreground">
                    {revenueSplit.business_percentage}%
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Operator Cut</Label>
                  <Badge variant="outline">
                    {revenueSplit.operator_percentage}%
                  </Badge>
                </div>
              </div>
              
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Sample Order ($35.00)</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Business receives:</span>
                    <span className="font-medium text-primary">
                      {formatCurrency(calculateSampleSplit(3500).businessCut)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Operator receives:</span>
                    <span className="font-medium text-accent">
                      {formatCurrency(calculateSampleSplit(3500).operatorCut)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <Button 
              variant="outline" 
              onClick={() => setEditingRevenue(true)}
              className="w-full"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Revenue Split
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Pricing Structure */}
      <Card className="border-0 shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            Pricing Structure
          </CardTitle>
          <CardDescription>
            Manage base pricing for laundry services
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <Label className="text-sm text-muted-foreground">Base Price</Label>
                <p className="text-lg font-bold text-primary">
                  {formatCurrency(pricing.base_price_cents)}
                </p>
              </div>
              
              <div className="text-center p-4 border rounded-lg">
                <Label className="text-sm text-muted-foreground">Per Bag</Label>
                <p className="text-lg font-bold text-accent">
                  {formatCurrency(pricing.per_bag_cents)}
                </p>
              </div>
              
              <div className="text-center p-4 border rounded-lg">
                <Label className="text-sm text-muted-foreground">Express Surcharge</Label>
                <p className="text-lg font-bold text-orange-600">
                  {formatCurrency(pricing.express_surcharge_cents)}
                </p>
              </div>
            </div>
            
            <Button 
              variant="outline" 
              onClick={() => setEditingPricing(true)}
              className="w-full"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Pricing Structure
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Current Analytics */}
      <Card className="border-0 shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-success" />
            Revenue Analytics
          </CardTitle>
          <CardDescription>
            Current business performance metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">
              Analytics will be calculated based on completed orders with the current revenue split settings.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Revenue Split Edit Dialog */}
      <Dialog open={editingRevenue} onOpenChange={setEditingRevenue}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Revenue Split</DialogTitle>
            <DialogDescription>
              Configure how revenue is divided between business and operators
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="business_percentage">Business Percentage</Label>
                <div className="relative">
                  <Input
                    id="business_percentage"
                    type="number"
                    min="0"
                    max="100"
                    value={revenueSplit.business_percentage}
                    onChange={(e) => 
                      handleRevenuePercentageChange('business_percentage', parseInt(e.target.value) || 0)
                    }
                    className="pr-8"
                  />
                  <Percent className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              
              <div>
                <Label htmlFor="operator_percentage">Operator Percentage</Label>
                <div className="relative">
                  <Input
                    id="operator_percentage"
                    type="number"
                    min="0"
                    max="100"
                    value={revenueSplit.operator_percentage}
                    onChange={(e) => 
                      handleRevenuePercentageChange('operator_percentage', parseInt(e.target.value) || 0)
                    }
                    className="pr-8"
                  />
                  <Percent className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </div>
            
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                Sample Calculations
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>$35.00 order:</span>
                  <span>
                    Business: {formatCurrency(calculateSampleSplit(3500).businessCut)} | 
                    Operator: {formatCurrency(calculateSampleSplit(3500).operatorCut)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>$70.00 order:</span>
                  <span>
                    Business: {formatCurrency(calculateSampleSplit(7000).businessCut)} | 
                    Operator: {formatCurrency(calculateSampleSplit(7000).operatorCut)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRevenue(false)}>
              Cancel
            </Button>
            <Button onClick={saveRevenueSplit}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pricing Edit Dialog */}
      <Dialog open={editingPricing} onOpenChange={setEditingPricing}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Pricing Structure</DialogTitle>
            <DialogDescription>
              Update base pricing for laundry services
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="base_price">Base Price</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="base_price"
                  type="number"
                  step="0.01"
                  min="0"
                  className="pl-8"
                  value={(pricing.base_price_cents / 100).toFixed(2)}
                  onChange={(e) => 
                    setPricing({
                      ...pricing, 
                      base_price_cents: Math.round(parseFloat(e.target.value || "0") * 100)
                    })
                  }
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Minimum charge per order</p>
            </div>
            
            <div>
              <Label htmlFor="per_bag">Price per Bag</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="per_bag"
                  type="number"
                  step="0.01"
                  min="0"
                  className="pl-8"
                  value={(pricing.per_bag_cents / 100).toFixed(2)}
                  onChange={(e) => 
                    setPricing({
                      ...pricing, 
                      per_bag_cents: Math.round(parseFloat(e.target.value || "0") * 100)
                    })
                  }
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Additional charge per bag</p>
            </div>
            
            <div>
              <Label htmlFor="express_surcharge">Express Surcharge</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="express_surcharge"
                  type="number"
                  step="0.01"
                  min="0"
                  className="pl-8"
                  value={(pricing.express_surcharge_cents / 100).toFixed(2)}
                  onChange={(e) => 
                    setPricing({
                      ...pricing, 
                      express_surcharge_cents: Math.round(parseFloat(e.target.value || "0") * 100)
                    })
                  }
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Additional charge for express service</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPricing(false)}>
              Cancel
            </Button>
            <Button onClick={savePricingSettings}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
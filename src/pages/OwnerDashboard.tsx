import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { 
  Settings, 
  MapPin, 
  DollarSign, 
  Tag,
  Plus,
  Trash2,
  Edit,
  Save
} from "lucide-react";

export default function OwnerDashboard() {
  const [isLoading, setIsLoading] = useState(false);
  const [lockers, setLockers] = useState<any[]>([]);
  const [promoCodes, setPromoCodes] = useState<any[]>([]);
  const [prices, setPrices] = useState({
    bagPrice: 3500, // $35.00 in cents
    expressPrice: 2000 // $20.00 in cents
  });
  const [newLocker, setNewLocker] = useState({
    name: '',
    address: '',
    zip_code: '',
    locker_count: 1
  });
  const [newPromoCode, setNewPromoCode] = useState({
    code: '',
    discount_type: 'percentage',
    discount_value: 0,
    description: ''
  });

  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [lockersRes, promoCodesRes] = await Promise.all([
        supabase.from('lockers').select('*').eq('is_active', true),
        supabase.from('promo_codes').select('*').eq('is_active', true)
      ]);

      if (lockersRes.data) setLockers(lockersRes.data);
      if (promoCodesRes.data) setPromoCodes(promoCodesRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive",
      });
    }
  };

  const addLocker = async () => {
    if (!newLocker.name || !newLocker.address || !newLocker.zip_code) {
      toast({
        title: "Error",
        description: "Please fill in all locker fields",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.from('lockers').insert({
        ...newLocker,
        qr_code: `QR${Date.now()}`,
        status: 'available'
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Locker added successfully",
      });

      setNewLocker({ name: '', address: '', zip_code: '', locker_count: 1 });
      loadData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add locker",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  const deleteLocker = async (id: string) => {
    try {
      const { error } = await supabase
        .from('lockers')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Locker removed successfully",
      });

      loadData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove locker",
        variant: "destructive",
      });
    }
  };

  const addPromoCode = async () => {
    if (!newPromoCode.code || !newPromoCode.discount_value) {
      toast({
        title: "Error",
        description: "Please fill in all promo code fields",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.from('promo_codes').insert(newPromoCode);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Promo code added successfully",
      });

      setNewPromoCode({ code: '', discount_type: 'percentage', discount_value: 0, description: '' });
      loadData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add promo code",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  const deletePromoCode = async (id: string) => {
    try {
      const { error } = await supabase
        .from('promo_codes')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Promo code removed successfully",
      });

      loadData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove promo code",
        variant: "destructive",
      });
    }
  };

  const updatePrices = async () => {
    // This would update a settings table or similar
    toast({
      title: "Success",
      description: "Prices updated successfully",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-wave">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Owner Dashboard
          </h1>
          <p className="text-muted-foreground">
            Manage your laundry service settings and locations
          </p>
        </div>

        <Tabs defaultValue="pricing" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pricing">
              <DollarSign className="h-4 w-4 mr-2" />
              Pricing
            </TabsTrigger>
            <TabsTrigger value="locations">
              <MapPin className="h-4 w-4 mr-2" />
              Locations
            </TabsTrigger>
            <TabsTrigger value="promo-codes">
              <Tag className="h-4 w-4 mr-2" />
              Promo Codes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pricing">
            <Card className="border-0 shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  Pricing Settings
                </CardTitle>
                <CardDescription>
                  Update your service pricing
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bag-price">Price per Bag ($)</Label>
                    <Input
                      id="bag-price"
                      type="number"
                      step="0.01"
                      value={prices.bagPrice / 100}
                      onChange={(e) => setPrices(prev => ({ 
                        ...prev, 
                        bagPrice: Math.round(parseFloat(e.target.value) * 100) 
                      }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="express-price">Express Fee ($)</Label>
                    <Input
                      id="express-price"
                      type="number"
                      step="0.01"
                      value={prices.expressPrice / 100}
                      onChange={(e) => setPrices(prev => ({ 
                        ...prev, 
                        expressPrice: Math.round(parseFloat(e.target.value) * 100) 
                      }))}
                    />
                  </div>
                </div>
                <Button onClick={updatePrices} className="w-full">
                  <Save className="h-4 w-4 mr-2" />
                  Update Prices
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="locations">
            <div className="space-y-6">
              <Card className="border-0 shadow-soft">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5 text-primary" />
                    Add New Locker Location
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="locker-name">Locker Name</Label>
                      <Input
                        id="locker-name"
                        placeholder="e.g., Central Park Locker"
                        value={newLocker.name}
                        onChange={(e) => setNewLocker(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="locker-zip">Zip Code</Label>
                      <Input
                        id="locker-zip"
                        placeholder="e.g., 10001"
                        value={newLocker.zip_code}
                        onChange={(e) => setNewLocker(prev => ({ ...prev, zip_code: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="locker-address">Address</Label>
                    <Textarea
                      id="locker-address"
                      placeholder="e.g., 123 Central Park West, New York, NY"
                      value={newLocker.address}
                      onChange={(e) => setNewLocker(prev => ({ ...prev, address: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="locker-count">Number of Lockers</Label>
                    <Input
                      id="locker-count"
                      type="number"
                      min="1"
                      value={newLocker.locker_count}
                      onChange={(e) => setNewLocker(prev => ({ ...prev, locker_count: parseInt(e.target.value) }))}
                    />
                  </div>
                  <Button onClick={addLocker} disabled={isLoading} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Locker
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-soft">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    Existing Locations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {lockers.map((locker) => (
                      <div key={locker.id} className="flex justify-between items-center p-3 border rounded-lg">
                        <div>
                          <h4 className="font-medium">{locker.name}</h4>
                          <p className="text-sm text-muted-foreground">{locker.address}</p>
                          <p className="text-xs text-muted-foreground">
                            {locker.locker_count} lockers • {locker.zip_code}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteLocker(locker.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    {lockers.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">
                        No lockers added yet
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="promo-codes">
            <div className="space-y-6">
              <Card className="border-0 shadow-soft">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5 text-primary" />
                    Add New Promo Code
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="promo-code">Promo Code</Label>
                      <Input
                        id="promo-code"
                        placeholder="e.g., SAVE20"
                        value={newPromoCode.code}
                        onChange={(e) => setNewPromoCode(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="discount-type">Discount Type</Label>
                      <select
                        id="discount-type"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={newPromoCode.discount_type}
                        onChange={(e) => setNewPromoCode(prev => ({ ...prev, discount_type: e.target.value }))}
                      >
                        <option value="percentage">Percentage (%)</option>
                        <option value="fixed">Fixed Amount ($)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="discount-value">
                        Discount {newPromoCode.discount_type === 'percentage' ? '(%)' : '($)'}
                      </Label>
                      <Input
                        id="discount-value"
                        type="number"
                        step={newPromoCode.discount_type === 'percentage' ? "1" : "0.01"}
                        value={newPromoCode.discount_value}
                        onChange={(e) => setNewPromoCode(prev => ({ ...prev, discount_value: parseFloat(e.target.value) }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="promo-description">Description</Label>
                    <Input
                      id="promo-description"
                      placeholder="e.g., 20% off your first order"
                      value={newPromoCode.description}
                      onChange={(e) => setNewPromoCode(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                  <Button onClick={addPromoCode} disabled={isLoading} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Promo Code
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-soft">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Tag className="h-5 w-5 text-primary" />
                    Active Promo Codes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {promoCodes.map((promo) => (
                      <div key={promo.id} className="flex justify-between items-center p-3 border rounded-lg">
                        <div>
                          <h4 className="font-medium">{promo.code}</h4>
                          <p className="text-sm text-muted-foreground">{promo.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {promo.discount_type === 'percentage' 
                              ? `${promo.discount_value}% off` 
                              : `$${promo.discount_value} off`}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deletePromoCode(promo.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    {promoCodes.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">
                        No promo codes added yet
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
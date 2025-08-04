import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { 
  Settings, 
  MapPin, 
  DollarSign, 
  Tag,
  Plus,
  Trash2,
  Edit,
  Save,
  ArrowLeft,
  BarChart3,
  Users,
  TrendingUp
} from "lucide-react";
import { ServiceAreasManagement } from "@/components/admin/ServiceAreasManagement";

export default function OwnerDashboard() {
  const [isLoading, setIsLoading] = useState(false);
  const [lockers, setLockers] = useState<any[]>([]);
  const [currentView, setCurrentView] = useState<'dashboard' | 'service-areas'>('dashboard');
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

  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const lockersRes = await supabase.from('lockers').select('*').eq('is_active', true);
      
      if (lockersRes.data) setLockers(lockersRes.data);
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

  const updatePrices = async () => {
    // This would update a settings table or similar
    toast({
      title: "Success",
      description: "Prices updated successfully",
    });
  };

  if (currentView === 'service-areas') {
    return <ServiceAreasManagement onBack={() => setCurrentView('dashboard')} />;
  }
  const handleExitDashboard = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-wave">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={handleExitDashboard}
            className="p-0 h-auto text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Exit Dashboard
          </Button>
          
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Owner Dashboard
          </h1>
          <p className="text-muted-foreground">
            Manage your laundry service settings and locations
          </p>
        </div>

        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-0 shadow-soft hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/marketing-dashboard')}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-gradient-primary">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold">Marketing Dashboard</h3>
                  <p className="text-sm text-muted-foreground">Manage campaigns & analytics</p>
                </div>
              </div>
            </CardContent>
          </Card>
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
            <TabsTrigger value="service-areas" onClick={() => setCurrentView('service-areas')}>
              <BarChart3 className="h-4 w-4 mr-2" />
              Service Areas
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

        </Tabs>
      </div>
    </div>
  );
}
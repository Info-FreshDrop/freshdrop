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
  TrendingUp,
  FileText,
  Calculator,
  Package
} from "lucide-react";
import { ServiceAreasManagement } from "@/components/admin/ServiceAreasManagement";
import { ContentManagement } from "@/components/admin/ContentManagement";
import { BagSizesManagement } from "@/components/admin/BagSizesManagement";


export default function OwnerDashboard() {
  const [isLoading, setIsLoading] = useState(false);
  const [lockers, setLockers] = useState<any[]>([]);
  const [currentView, setCurrentView] = useState<'dashboard' | 'service-areas' | 'bag-sizes'>('dashboard');
  // Removed separate pricing state - now managed through bag sizes
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

  // Pricing now managed through bag sizes management

  if (currentView === 'service-areas') {
    return <ServiceAreasManagement onBack={() => setCurrentView('dashboard')} />;
  }

  if (currentView === 'bag-sizes') {
    return <BagSizesManagement onBack={() => setCurrentView('dashboard')} />;
  }
  const handleExitDashboard = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-wave">
      <div className="container mx-auto px-4 py-8 max-w-full lg:max-w-6xl overflow-x-hidden">
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

        <div className="mb-6 grid grid-cols-1 gap-4">
          <Card className="border-0 shadow-soft hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/marketing-dashboard')}>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-gradient-primary flex-shrink-0">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-sm sm:text-base">Marketing Dashboard</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">Manage campaigns & analytics</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="bags" className="space-y-6">
          <div className="overflow-x-auto">
            <TabsList className="grid grid-cols-4 gap-0.5 min-w-max w-full">
              <TabsTrigger value="bags" className="flex items-center gap-1 px-2 py-2 text-xs whitespace-nowrap">
                <Package className="h-3 w-3 flex-shrink-0" />
                <span className="hidden sm:inline">Bag Sizes & Pricing</span>
                <span className="sm:hidden">Bags</span>
              </TabsTrigger>
              <TabsTrigger value="locations" className="flex items-center gap-1 px-2 py-2 text-xs whitespace-nowrap">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                <span className="hidden sm:inline">Locations</span>
                <span className="sm:hidden">Locations</span>
              </TabsTrigger>
              <TabsTrigger value="service-areas" onClick={() => setCurrentView('service-areas')} className="flex items-center gap-1 px-2 py-2 text-xs whitespace-nowrap">
                <BarChart3 className="h-3 w-3 flex-shrink-0" />
                <span className="hidden sm:inline">Service Areas</span>
                <span className="sm:hidden">Service</span>
              </TabsTrigger>
              <TabsTrigger value="content" className="flex items-center gap-1 px-2 py-2 text-xs whitespace-nowrap">
                <FileText className="h-3 w-3 flex-shrink-0" />
                <span className="hidden sm:inline">Content</span>
                <span className="sm:hidden">Content</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="bags">
            <Card className="border-0 shadow-soft">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Package className="h-5 w-5 text-primary flex-shrink-0" />
                  <span className="break-words">Bag Sizes & Pricing</span>
                </CardTitle>
                <CardDescription className="text-sm">
                  Manage your laundry bag sizes, descriptions, and pricing. Changes update across the entire app in real-time.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => setCurrentView('bag-sizes')} className="w-full sm:w-auto">
                  <Package className="w-4 h-4 mr-2 flex-shrink-0" />
                  Manage Bag Sizes & Pricing
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="locations">
            <div className="space-y-6">
              <Card className="border-0 shadow-soft">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Plus className="h-5 w-5 text-primary flex-shrink-0" />
                    <span className="break-words">Add New Locker Location</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="locker-name" className="text-sm font-medium">Locker Name</Label>
                      <Input
                        id="locker-name"
                        placeholder="e.g., Central Park Locker"
                        value={newLocker.name}
                        onChange={(e) => setNewLocker(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="locker-zip" className="text-sm font-medium">Zip Code</Label>
                      <Input
                        id="locker-zip"
                        placeholder="e.g., 10001"
                        value={newLocker.zip_code}
                        onChange={(e) => setNewLocker(prev => ({ ...prev, zip_code: e.target.value }))}
                        className="w-full"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="locker-address" className="text-sm font-medium">Address</Label>
                    <Textarea
                      id="locker-address"
                      placeholder="e.g., 123 Central Park West, New York, NY"
                      value={newLocker.address}
                      onChange={(e) => setNewLocker(prev => ({ ...prev, address: e.target.value }))}
                      className="w-full min-h-[80px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="locker-count" className="text-sm font-medium">Number of Lockers</Label>
                    <Input
                      id="locker-count"
                      type="number"
                      min="1"
                      value={newLocker.locker_count}
                      onChange={(e) => setNewLocker(prev => ({ ...prev, locker_count: parseInt(e.target.value) }))}
                      className="w-full"
                    />
                  </div>
                  <Button onClick={addLocker} disabled={isLoading} className="w-full">
                    <Plus className="h-4 w-4 mr-2 flex-shrink-0" />
                    Add Locker
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-soft">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <MapPin className="h-5 w-5 text-primary flex-shrink-0" />
                    <span className="break-words">Existing Locations</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {lockers.map((locker) => (
                      <div key={locker.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 border rounded-lg gap-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm break-words">{locker.name}</h4>
                          <p className="text-xs text-muted-foreground break-words">{locker.address}</p>
                          <p className="text-xs text-muted-foreground">
                            {locker.locker_count} lockers • {locker.zip_code}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteLocker(locker.id)}
                          className="flex-shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    {lockers.length === 0 && (
                      <p className="text-center text-muted-foreground py-8 text-sm">
                        No lockers added yet
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="content">
            <ContentManagement />
          </TabsContent>


        </Tabs>
      </div>
    </div>
  );
}
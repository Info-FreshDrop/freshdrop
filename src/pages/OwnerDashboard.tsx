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
    <div className="min-h-screen bg-gradient-wave overflow-x-hidden">
      <div className="w-full max-w-none lg:max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-8 overflow-x-hidden">
        <div className="mb-4 sm:mb-6">
          <Button
            variant="ghost"
            onClick={handleExitDashboard}
            className="p-0 h-auto text-muted-foreground hover:text-foreground mb-2 sm:mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2 flex-shrink-0" />
            <span className="text-sm">Exit Dashboard</span>
          </Button>
          
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent break-words">
            Owner Dashboard
          </h1>
          <p className="text-sm text-muted-foreground break-words">
            Manage your laundry service settings and locations
          </p>
        </div>

        <div className="mb-4 sm:mb-6 w-full">
          <Card className="border-0 shadow-soft hover:shadow-lg transition-shadow cursor-pointer w-full" onClick={() => navigate('/marketing-dashboard')}>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="p-2 sm:p-3 rounded-lg bg-gradient-primary flex-shrink-0">
                  <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-sm sm:text-base break-words">Marketing Dashboard</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground break-words">Manage campaigns & analytics</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="w-full overflow-x-hidden">
          <Tabs defaultValue="bags" className="space-y-4 sm:space-y-6 w-full">
            <div className="w-full">
              <TabsList className="w-full grid grid-cols-2 lg:grid-cols-4 gap-1 h-auto p-1">
                <TabsTrigger value="bags" className="flex flex-col sm:flex-row items-center gap-1 px-2 py-3 text-xs min-w-0">
                  <Package className="h-4 w-4 flex-shrink-0" />
                  <span className="text-center break-words leading-tight">
                    <span className="block sm:hidden">Bags</span>
                    <span className="hidden sm:block">Bag Sizes</span>
                  </span>
                </TabsTrigger>
                <TabsTrigger value="locations" className="flex flex-col sm:flex-row items-center gap-1 px-2 py-3 text-xs min-w-0">
                  <MapPin className="h-4 w-4 flex-shrink-0" />
                  <span className="text-center break-words leading-tight">Locations</span>
                </TabsTrigger>
                <TabsTrigger value="service-areas" onClick={() => setCurrentView('service-areas')} className="flex flex-col sm:flex-row items-center gap-1 px-2 py-3 text-xs min-w-0">
                  <BarChart3 className="h-4 w-4 flex-shrink-0" />
                  <span className="text-center break-words leading-tight">Service</span>
                </TabsTrigger>
                <TabsTrigger value="content" className="flex flex-col sm:flex-row items-center gap-1 px-2 py-3 text-xs min-w-0">
                  <FileText className="h-4 w-4 flex-shrink-0" />
                  <span className="text-center break-words leading-tight">Content</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="bags" className="w-full">
              <Card className="border-0 shadow-soft w-full">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-start gap-2 text-base sm:text-lg">
                    <Package className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="break-words leading-tight">Bag Sizes & Pricing</span>
                  </CardTitle>
                  <CardDescription className="text-sm break-words">
                    Manage your laundry bag sizes, descriptions, and pricing. Changes update across the entire app in real-time.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={() => setCurrentView('bag-sizes')} className="w-full sm:w-auto">
                    <Package className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span className="break-words">Manage Bag Sizes & Pricing</span>
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="locations" className="w-full">
              <div className="space-y-4 sm:space-y-6 w-full">
                <Card className="border-0 shadow-soft w-full">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-start gap-2 text-base sm:text-lg">
                      <Plus className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="break-words leading-tight">Add New Locker Location</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                      <div className="space-y-2 w-full">
                        <Label htmlFor="locker-name" className="text-sm font-medium">Locker Name</Label>
                        <Input
                          id="locker-name"
                          placeholder="e.g., Central Park Locker"
                          value={newLocker.name}
                          onChange={(e) => setNewLocker(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full"
                        />
                      </div>
                      <div className="space-y-2 w-full">
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
                    <div className="space-y-2 w-full">
                      <Label htmlFor="locker-address" className="text-sm font-medium">Address</Label>
                      <Textarea
                        id="locker-address"
                        placeholder="e.g., 123 Central Park West, New York, NY"
                        value={newLocker.address}
                        onChange={(e) => setNewLocker(prev => ({ ...prev, address: e.target.value }))}
                        className="w-full min-h-[80px]"
                      />
                    </div>
                    <div className="space-y-2 w-full">
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
                      <span className="break-words">Add Locker</span>
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-soft w-full">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-start gap-2 text-base sm:text-lg">
                      <MapPin className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="break-words leading-tight">Existing Locations</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 w-full">
                      {lockers.map((locker) => (
                        <div key={locker.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-start p-3 border rounded-lg gap-3 w-full">
                          <div className="flex-1 min-w-0 w-full">
                            <h4 className="font-medium text-sm break-words">{locker.name}</h4>
                            <p className="text-xs text-muted-foreground break-words">{locker.address}</p>
                            <p className="text-xs text-muted-foreground break-words">
                              {locker.locker_count} lockers • {locker.zip_code}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteLocker(locker.id)}
                            className="flex-shrink-0 w-full sm:w-auto"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      {lockers.length === 0 && (
                        <p className="text-center text-muted-foreground py-8 text-sm break-words">
                          No lockers added yet
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="content" className="w-full">
              <div className="w-full">
                <ContentManagement />
              </div>
            </TabsContent>

          </Tabs>
        </div>
      </div>
    </div>
  );
}
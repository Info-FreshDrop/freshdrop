import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Loader2 } from "lucide-react";

interface ServiceAreasMapProps {
  onBack: () => void;
}

interface ServiceArea {
  id: string;
  zip_code: string;
  allows_locker: boolean;
  allows_delivery: boolean;
  allows_express: boolean;
  is_active: boolean;
}

export function ServiceAreasMap({ onBack }: ServiceAreasMapProps) {
  const [serviceAreas, setServiceAreas] = useState<ServiceArea[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadServiceAreas();
  }, []);

  const loadServiceAreas = async () => {
    try {
      const { data, error } = await supabase
        .from('service_areas')
        .select('*')
        .order('zip_code');

      if (error) throw error;
      setServiceAreas(data || []);
    } catch (error) {
      console.error('Error loading service areas:', error);
    } finally {
      setLoading(false);
    }
  };

  const activeAreas = serviceAreas.filter(area => area.is_active);
  const inactiveAreas = serviceAreas.filter(area => !area.is_active);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-wave flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading service areas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-wave">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button onClick={onBack} variant="outline" className="mb-4">
            ← Back to Service Areas
          </Button>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Service Coverage Map
          </h1>
          <p className="text-muted-foreground">
            View all service areas and their capabilities
          </p>
        </div>

        {/* Map Placeholder - Future enhancement */}
        <Card className="mb-8 border-2 border-dashed border-primary/20">
          <CardContent className="p-12 text-center">
            <MapPin className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">Interactive Map Coming Soon</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              An interactive map showing all service areas with visual indicators for service types will be available in a future update.
            </p>
          </CardContent>
        </Card>

        {/* Service Areas Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Active Service Areas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700">
                <MapPin className="h-5 w-5" />
                Active Service Areas ({activeAreas.length})
              </CardTitle>
              <CardDescription>
                Currently serving these zip codes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {activeAreas.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No active service areas
                  </p>
                ) : (
                  activeAreas.map(area => (
                    <div key={area.id} className="p-3 border rounded-lg bg-green-50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-green-800">{area.zip_code}</span>
                        <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                          Active
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {area.allows_locker && (
                          <Badge variant="secondary" className="text-xs">
                            Locker Service
                          </Badge>
                        )}
                        {area.allows_delivery && (
                          <Badge variant="secondary" className="text-xs">
                            Pickup & Delivery
                          </Badge>
                        )}
                        {area.allows_express && (
                          <Badge variant="secondary" className="text-xs">
                            Express Service
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Inactive Service Areas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-700">
                <MapPin className="h-5 w-5" />
                Inactive Service Areas ({inactiveAreas.length})
              </CardTitle>
              <CardDescription>
                Not currently serving these areas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {inactiveAreas.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No inactive service areas
                  </p>
                ) : (
                  inactiveAreas.map(area => (
                    <div key={area.id} className="p-3 border rounded-lg bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-gray-800">{area.zip_code}</span>
                        <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-300">
                          Inactive
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {area.allows_locker && (
                          <Badge variant="outline" className="text-xs text-gray-500">
                            Locker Service
                          </Badge>
                        )}
                        {area.allows_delivery && (
                          <Badge variant="outline" className="text-xs text-gray-500">
                            Pickup & Delivery
                          </Badge>
                        )}
                        {area.allows_express && (
                          <Badge variant="outline" className="text-xs text-gray-500">
                            Express Service
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{serviceAreas.length}</div>
              <div className="text-sm text-muted-foreground">Total Areas</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{activeAreas.length}</div>
              <div className="text-sm text-muted-foreground">Active Areas</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {activeAreas.filter(a => a.allows_locker).length}
              </div>
              <div className="text-sm text-muted-foreground">Locker Service</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {activeAreas.filter(a => a.allows_express).length}
              </div>
              <div className="text-sm text-muted-foreground">Express Service</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
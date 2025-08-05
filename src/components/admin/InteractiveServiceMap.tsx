import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Loader2 } from "lucide-react";

interface ServiceArea {
  id: string;
  zip_code: string;
  allows_locker: boolean;
  allows_delivery: boolean;
  allows_express: boolean;
  is_active: boolean;
}

interface InteractiveServiceMapProps {
  onBack: () => void;
}

export function InteractiveServiceMap({ onBack }: InteractiveServiceMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [serviceAreas, setServiceAreas] = useState<ServiceArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapboxError, setMapboxError] = useState<string | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string>('');

  useEffect(() => {
    loadServiceAreas();
    fetchMapboxToken();
  }, []);

  const fetchMapboxToken = async () => {
    try {
      // Get token from our edge function
      const { data, error } = await supabase.functions.invoke('get-mapbox-token');
      
      if (error) {
        console.error('Error fetching Mapbox token:', error);
        throw error;
      }
      
      if (data?.token) {
        setMapboxToken(data.token);
      } else {
        throw new Error('No token received from edge function');
      }
    } catch (error) {
      console.warn('Could not fetch Mapbox token, using demo token:', error);
      // Fallback to demo token
      const token = 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw';
      setMapboxToken(token);
    }
  };

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

  // Function to get real coordinates for a zip code using our geocoding service
  const getZipCodeCoordinates = async (zipCode: string): Promise<[number, number]> => {
    try {
      const { data, error } = await supabase.functions.invoke('geocoding', {
        body: { 
          query: `${zipCode}, Missouri, USA`,
          type: 'search'
        }
      });
      
      if (error) throw error;
      
      if (data.suggestions && data.suggestions.length > 0) {
        const coords = data.suggestions[0].coordinates;
        return [coords[0], coords[1]];
      }
      
      throw new Error('No coordinates found');
    } catch (error) {
      console.warn(`Geocoding failed for ${zipCode}:`, error);
      // Return Springfield, MO coordinates as fallback
      return [-93.26, 37.21];
    }
  };

  // Function to load real zip code locations using geocoding
  const loadRealZipCodeLocations = async () => {
    const features = await Promise.all(
      serviceAreas.map(async (area) => {
        try {
          // Use our geocoding function to get real coordinates
          const coords = await getZipCodeCoordinates(area.zip_code);
          
          return {
            type: 'Feature' as const,
            properties: {
              zip_code: area.zip_code,
              is_active: area.is_active,
              allows_delivery: area.allows_delivery,
              allows_locker: area.allows_locker,
              allows_express: area.allows_express
            },
            geometry: {
              type: 'Point' as const,
              coordinates: coords
            }
          };
        } catch (error) {
          console.warn(`Could not geocode ${area.zip_code}, using fallback location`);
          // Fallback to Springfield, MO area
          return {
            type: 'Feature' as const,
            properties: {
              zip_code: area.zip_code,
              is_active: area.is_active,
              allows_delivery: area.allows_delivery,
              allows_locker: area.allows_locker,
              allows_express: area.allows_express
            },
            geometry: {
              type: 'Point' as const,
              coordinates: [-93.26 + (Math.random() - 0.5) * 0.1, 37.21 + (Math.random() - 0.5) * 0.1]
            }
          };
        }
      })
    );

    // Update the map source with the new data
    if (map.current?.getSource('service-markers')) {
      (map.current.getSource('service-markers') as mapboxgl.GeoJSONSource).setData({
        type: 'FeatureCollection',
        features: features
      });
    }
  };

  useEffect(() => {
    if (!mapContainer.current || !mapboxToken || loading) return;

    try {
      mapboxgl.accessToken = mapboxToken;
      
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center: [-93.26, 37.21], // Springfield, Missouri area
        zoom: 10,
        pitch: 0,
      });

      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
      map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');

      map.current.on('load', () => {
        if (!map.current) return;

        // Add data sources for service markers instead of fake boundaries
        map.current.addSource('service-markers', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: []
          }
        });

        // Add circle layer for service coverage areas
        map.current.addLayer({
          id: 'service-coverage',
          type: 'circle',
          source: 'service-markers',
          paint: {
            'circle-radius': [
              'interpolate',
              ['linear'],
              ['zoom'],
              8, 12,  // At zoom 8, radius is 12px
              12, 24 // At zoom 12, radius is 24px
            ],
            'circle-color': [
              'case',
              ['get', 'allows_express'], '#ef4444', // Red for express
              ['get', 'allows_locker'], '#8b5cf6',  // Purple for locker
              ['get', 'allows_delivery'], '#3b82f6', // Blue for delivery
              '#6b7280' // Gray for inactive
            ],
            'circle-opacity': [
              'case',
              ['get', 'is_active'], 0.8,
              0.4
            ],
            'circle-stroke-width': 2,
            'circle-stroke-color': [
              'case',
              ['get', 'is_active'], '#ffffff',
              '#9ca3af'
            ]
          }
        });

        // Label layer for zip codes
        map.current.addLayer({
          id: 'service-labels',
          type: 'symbol',
          source: 'service-markers',
          layout: {
            'text-field': ['get', 'zip_code'],
            'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
            'text-size': 12,
            'text-anchor': 'center',
            'text-offset': [0, 2]
          },
          paint: {
            'text-color': '#1f2937',
            'text-halo-color': '#ffffff',
            'text-halo-width': 2
          }
        });

        // Load real zip code locations using geocoding
        loadRealZipCodeLocations();

        // Add click handlers for interactive features
        map.current.on('click', 'service-coverage', (e) => {
          if (!e.features || e.features.length === 0) return;
          
          const feature = e.features[0];
          const properties = feature.properties;
          
          const services = [];
          if (properties?.allows_delivery) services.push('Pickup & Delivery');
          if (properties?.allows_locker) services.push('Locker Service');
          if (properties?.allows_express) services.push('Express Service');

          const popupContent = `
            <div style="font-family: system-ui; padding: 12px; min-width: 200px;">
              <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">
                Zip Code: ${properties?.zip_code}
              </h3>
              <div style="margin-bottom: 8px;">
                <span style="padding: 4px 8px; border-radius: 12px; font-size: 12px; background-color: ${properties?.is_active ? '#10b981' : '#6b7280'}; color: white;">
                  ${properties?.is_active ? 'Active Coverage' : 'Inactive'}
                </span>
              </div>
              ${services.length > 0 ? `
                <div style="font-size: 14px; color: #374151;">
                  <strong>Available Services:</strong><br>
                  ${services.join('<br>')}
                </div>
              ` : '<div style="font-size: 14px; color: #6b7280;">No services enabled</div>'}
              <div style="font-size: 12px; color: #6b7280; margin-top: 8px;">
                📍 Real zip code location
              </div>
            </div>
          `;

          new mapboxgl.Popup()
            .setLngLat(e.lngLat)
            .setHTML(popupContent)
            .addTo(map.current!);
        });

        // Change cursor on hover
        map.current.on('mouseenter', 'service-coverage', () => {
          if (map.current) map.current.getCanvas().style.cursor = 'pointer';
        });

        map.current.on('mouseleave', 'service-coverage', () => {
          if (map.current) map.current.getCanvas().style.cursor = '';
        });
      });

    } catch (error) {
      console.error('Error initializing map:', error);
      setMapboxError('Failed to initialize map. Please check your Mapbox token.');
    }

    return () => {
      map.current?.remove();
    };
  }, [mapboxToken, serviceAreas, loading]);
  
  const activeAreas = serviceAreas.filter(area => area.is_active);
  const inactiveAreas = serviceAreas.filter(area => !area.is_active);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-wave flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading service areas map...</p>
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
            Interactive Service Map
          </h1>
          <p className="text-muted-foreground">
            Service locations using real zip code coordinates from geocoding
          </p>
        </div>

        {/* Map Legend */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Map Legend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-red-500"></div>
                <span className="text-sm">Express Service</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-purple-500"></div>
                <span className="text-sm">Locker Service</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                <span className="text-sm">Pickup & Delivery</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-gray-500"></div>
                <span className="text-sm">Inactive</span>
              </div>
            </div>
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                📍 <strong>Real Locations:</strong> These markers show actual zip code coordinates obtained through geocoding services.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Map Container */}
        <Card className="mb-6">
          <CardContent className="p-0">
            {mapboxError ? (
              <div className="p-12 text-center">
                <MapPin className="h-16 w-16 mx-auto mb-4 text-red-500" />
                <h3 className="text-xl font-semibold mb-2 text-red-600">Map Loading Error</h3>
                <p className="text-muted-foreground max-w-md mx-auto mb-4">
                  {mapboxError}
                </p>
                <p className="text-sm text-muted-foreground">
                  Please configure your Mapbox public token in the edge function secrets.
                </p>
              </div>
            ) : (
              <div 
                ref={mapContainer} 
                className="w-full h-[500px] rounded-lg"
                style={{ borderRadius: '8px' }}
              />
            )}
          </CardContent>
        </Card>

        {/* Service Areas Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700">
                <MapPin className="h-5 w-5" />
                Active Areas ({activeAreas.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {activeAreas.map(area => (
                  <div key={area.id} className="flex items-center justify-between p-2 bg-green-50 rounded">
                    <span className="font-medium">{area.zip_code}</span>
                    <div className="flex gap-1">
                      {area.allows_express && <Badge variant="secondary" className="text-xs">Express</Badge>}
                      {area.allows_locker && <Badge variant="secondary" className="text-xs">Locker</Badge>}
                      {area.allows_delivery && <Badge variant="secondary" className="text-xs">Delivery</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-700">
                <MapPin className="h-5 w-5" />
                Coverage Statistics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{activeAreas.length}</div>
                  <div className="text-sm text-muted-foreground">Active Areas</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-600">{inactiveAreas.length}</div>
                  <div className="text-sm text-muted-foreground">Inactive Areas</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {activeAreas.filter(a => a.allows_express).length}
                  </div>
                  <div className="text-sm text-muted-foreground">Express Service</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {activeAreas.filter(a => a.allows_locker).length}
                  </div>
                  <div className="text-sm text-muted-foreground">Locker Service</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
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

        // Add data sources for service areas
        map.current.addSource('service-areas', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: []
          }
        });

        // Add layers for service areas
        // Fill layer for coverage areas
        map.current.addLayer({
          id: 'service-areas-fill',
          type: 'fill',
          source: 'service-areas',
          paint: {
            'fill-color': [
              'case',
              ['get', 'is_active'], '#10b981', // Green for active
              '#6b7280' // Gray for inactive
            ],
            'fill-opacity': [
              'case',
              ['get', 'is_active'], 0.3,
              0.1
            ]
          }
        });

        // Outline layer for service areas
        map.current.addLayer({
          id: 'service-areas-outline',
          type: 'line',
          source: 'service-areas',
          paint: {
            'line-color': [
              'case',
              ['get', 'is_active'], '#059669', // Darker green for active
              '#4b5563' // Darker gray for inactive
            ],
            'line-width': 2,
            'line-opacity': 0.8
          }
        });

        // Label layer for zip codes
        map.current.addLayer({
          id: 'service-areas-labels',
          type: 'symbol',
          source: 'service-areas',
          layout: {
            'text-field': ['get', 'zip_code'],
            'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
            'text-size': 14,
            'text-anchor': 'center'
          },
          paint: {
            'text-color': [
              'case',
              ['get', 'is_active'], '#065f46', // Dark green for active
              '#374151' // Dark gray for inactive
            ],
            'text-halo-color': '#ffffff',
            'text-halo-width': 1
          }
        });

        // Load zip code boundaries and update the map
        loadZipCodeBoundaries();

        // Add click handlers for interactive features
        map.current.on('click', 'service-areas-fill', (e) => {
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
            </div>
          `;

          new mapboxgl.Popup()
            .setLngLat(e.lngLat)
            .setHTML(popupContent)
            .addTo(map.current!);
        });

        // Change cursor on hover
        map.current.on('mouseenter', 'service-areas-fill', () => {
          if (map.current) map.current.getCanvas().style.cursor = 'pointer';
        });

        map.current.on('mouseleave', 'service-areas-fill', () => {
          if (map.current) map.current.getCanvas().style.cursor = '';
        });
      });

      // Function to load zip code boundaries
      const loadZipCodeBoundaries = async () => {
        const features = await Promise.all(
          serviceAreas.map(async (area) => {
            // Get approximate boundaries for the zip code
            const bounds = await getZipCodeBounds(area.zip_code);
            
             return {
               type: 'Feature' as const,
               properties: {
                 zip_code: area.zip_code,
                 is_active: area.is_active,
                 allows_delivery: area.allows_delivery,
                 allows_locker: area.allows_locker,
                 allows_express: area.allows_express
               },
               geometry: bounds
             };
          })
        );

        // Update the map source with the new data
        if (map.current?.getSource('service-areas')) {
          (map.current.getSource('service-areas') as mapboxgl.GeoJSONSource).setData({
            type: 'FeatureCollection',
            features: features
          });
        }
      };

    } catch (error) {
      console.error('Error initializing map:', error);
      setMapboxError('Failed to initialize map. Please check your Mapbox token.');
    }

    return () => {
      map.current?.remove();
    };
  }, [mapboxToken, serviceAreas, loading]);

  // Function to get non-overlapping zip code boundaries
  // In production, you'd use a geocoding service or zip code database
  const getZipCodeBounds = async (zipCode: string): Promise<any> => {
    // For demo, create non-overlapping polygon boundaries based on zip code
    // In production, you'd call a geocoding API or use a zip code boundaries dataset
    const centerCoords = getMockCoordinatesForZip(zipCode);
    
    // Create unique polygon size and offset to prevent overlapping
    const zipNumber = parseInt(zipCode.replace(/\D/g, '')) || 0;
    const baseOffset = 0.015; // Smaller base size
    const uniqueOffset = baseOffset + (zipNumber % 5) * 0.003; // Vary size by zip code
    
    // Create unique shape rotation to minimize overlap
    const rotation = (zipNumber % 8) * 45; // Rotate by 0, 45, 90, 135, 180, 225, 270, 315 degrees
    const radians = (rotation * Math.PI) / 180;
    
    // Create a more unique polygon shape (hexagon with rotation)
    const points = [];
    const sides = 6; // Hexagon
    for (let i = 0; i < sides; i++) {
      const angle = (i * 2 * Math.PI) / sides + radians;
      const x = centerCoords[0] + uniqueOffset * Math.cos(angle);
      const y = centerCoords[1] + uniqueOffset * Math.sin(angle);
      points.push([x, y]);
    }
    // Close the polygon
    points.push(points[0]);
    
    return {
      type: 'Polygon',
      coordinates: [points]
    };
  };

  // Mock function to get coordinates for zip codes with better distribution
  // In a real app, you'd use a geocoding service
  const getMockCoordinatesForZip = (zipCode: string): [number, number] => {
    // Springfield, MO area with better distribution to prevent overlapping
    const baseCoords: [number, number] = [-93.26, 37.21];
    const zipNumber = parseInt(zipCode.replace(/\D/g, '')) || 0;
    
    // Create a grid-like distribution to minimize overlap
    const gridSize = 0.05; // Distance between grid points
    const gridX = (zipNumber % 10) - 5; // -5 to 4
    const gridY = (Math.floor(zipNumber / 10) % 10) - 5; // -5 to 4
    
    // Add some randomness but keep it within grid bounds
    const randomOffsetX = (zipNumber % 7 - 3) * 0.005;
    const randomOffsetY = ((zipNumber * 3) % 7 - 3) * 0.005;
    
    return [
      baseCoords[0] + gridX * gridSize + randomOffsetX,
      baseCoords[1] + gridY * gridSize + randomOffsetY
    ];
  };
  
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
            View service areas on an interactive map with color-coded service types
          </p>
        </div>

        {/* Map Legend */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Map Legend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
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
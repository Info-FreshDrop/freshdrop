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

        // Add service areas as markers
        serviceAreas.forEach((area) => {
          if (!map.current) return;

          // Create a marker for each zip code
          const markerEl = document.createElement('div');
          markerEl.className = 'custom-marker';
          markerEl.style.width = '30px';
          markerEl.style.height = '30px';
          markerEl.style.borderRadius = '50%';
          markerEl.style.border = '2px solid white';
          markerEl.style.display = 'flex';
          markerEl.style.alignItems = 'center';
          markerEl.style.justifyContent = 'center';
          markerEl.style.fontSize = '10px';
          markerEl.style.fontWeight = 'bold';
          markerEl.style.color = 'white';
          markerEl.style.cursor = 'pointer';
          markerEl.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
          
          // Color based on status and services
          if (!area.is_active) {
            markerEl.style.backgroundColor = '#gray';
          } else if (area.allows_express) {
            markerEl.style.backgroundColor = '#ef4444'; // Red for express
          } else if (area.allows_locker) {
            markerEl.style.backgroundColor = '#8b5cf6'; // Purple for locker
          } else if (area.allows_delivery) {
            markerEl.style.backgroundColor = '#3b82f6'; // Blue for delivery
          } else {
            markerEl.style.backgroundColor = '#10b981'; // Green for basic
          }

          markerEl.textContent = area.zip_code; // Show full zip code

          // Create popup content
          const services = [];
          if (area.allows_delivery) services.push('Pickup & Delivery');
          if (area.allows_locker) services.push('Locker Service');
          if (area.allows_express) services.push('Express Service');

          const popupContent = `
            <div style="font-family: system-ui; padding: 8px;">
              <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600;">
                ${area.zip_code}
              </h3>
              <div style="margin-bottom: 8px;">
                <span style="padding: 2px 8px; border-radius: 12px; font-size: 11px; background-color: ${area.is_active ? '#10b981' : '#6b7280'}; color: white;">
                  ${area.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              ${services.length > 0 ? `
                <div style="font-size: 12px; color: #666;">
                  <strong>Services:</strong><br>
                  ${services.join('<br>')}
                </div>
              ` : '<div style="font-size: 12px; color: #666;">No services enabled</div>'}
            </div>
          `;

          const popup = new mapboxgl.Popup({ offset: 25 })
            .setHTML(popupContent);

          // For demo purposes, use approximate coordinates
          // In a real app, you'd geocode the zip codes
          const mockCoordinates = getMockCoordinatesForZip(area.zip_code);
          
          new mapboxgl.Marker(markerEl)
            .setLngLat(mockCoordinates)
            .setPopup(popup)
            .addTo(map.current);
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

  // Mock function to get coordinates for zip codes
  // In a real app, you'd use a geocoding service
  const getMockCoordinatesForZip = (zipCode: string): [number, number] => {
    // Springfield, MO area with some variation
    const baseCoords: [number, number] = [-93.26, 37.21];
    const hash = zipCode.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const offsetLng = (hash % 100 - 50) * 0.001;
    const offsetLat = ((hash * 7) % 100 - 50) * 0.001;
    return [baseCoords[0] + offsetLng, baseCoords[1] + offsetLat];
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
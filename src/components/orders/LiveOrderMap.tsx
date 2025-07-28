import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Navigation, MapPin, X } from 'lucide-react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/integrations/supabase/client';

interface LiveOrderMapProps {
  isOpen: boolean;
  onClose: () => void;
  order: {
    id: string;
    pickup_address: string;
    delivery_address: string;
    status: string;
    pickup_window_end: string;
    profiles?: {
      first_name: string;
      last_name: string;
      phone: string;
    } | null;
  };
  operatorLocation?: { latitude: number; longitude: number };
}

export const LiveOrderMap: React.FC<LiveOrderMapProps> = ({
  isOpen,
  onClose,
  order,
  operatorLocation
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMapboxToken();
  }, []);

  useEffect(() => {
    if (isOpen && mapboxToken && mapContainer.current && !map.current) {
      initializeMap();
    }
    
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [isOpen, mapboxToken]);

  const loadMapboxToken = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-mapbox-token');
      if (error) throw error;
      setMapboxToken(data.token);
    } catch (error) {
      console.error('Error loading Mapbox token:', error);
      setLoading(false);
    }
  };

  const initializeMap = async () => {
    if (!mapContainer.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;

    try {
      // Geocode addresses to get coordinates
      const orderAddress = order.status === 'claimed' || order.status === 'in_progress' 
        ? order.pickup_address 
        : order.delivery_address;

      const response = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(orderAddress)}.json?access_token=${mapboxToken}`);
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const orderCoords = data.features[0].center as [number, number];
        
        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: orderCoords,
          zoom: 12,
        });

        map.current.on('load', () => {
          if (!map.current) return;

          // Add order location marker
          new mapboxgl.Marker({ color: '#ef4444' })
            .setLngLat(orderCoords)
            .setPopup(new mapboxgl.Popup().setHTML(`
              <div class="p-2">
                <p class="font-medium">${order.status === 'claimed' || order.status === 'in_progress' ? 'Pickup' : 'Delivery'} Location</p>
                <p class="text-sm text-gray-600">${orderAddress}</p>
                <p class="text-sm"><strong>Customer:</strong> ${order.profiles?.first_name} ${order.profiles?.last_name}</p>
              </div>
            `))
            .addTo(map.current);

          // Add operator location marker if available
          if (operatorLocation) {
            new mapboxgl.Marker({ color: '#3b82f6' })
              .setLngLat([operatorLocation.longitude, operatorLocation.latitude])
              .setPopup(new mapboxgl.Popup().setHTML(`
                <div class="p-2">
                  <p class="font-medium">Your Location</p>
                </div>
              `))
              .addTo(map.current!);

            // Add route if both locations are available
            addRoute([operatorLocation.longitude, operatorLocation.latitude], orderCoords);

            // Fit map to show both points
            const bounds = new mapboxgl.LngLatBounds()
              .extend([operatorLocation.longitude, operatorLocation.latitude])
              .extend(orderCoords);
            
            map.current.fitBounds(bounds, { padding: 50 });
          }

          setLoading(false);
        });

        // Add navigation controls
        map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
      }
    } catch (error) {
      console.error('Error initializing map:', error);
      setLoading(false);
    }
  };

  const addRoute = async (start: [number, number], end: [number, number]) => {
    if (!map.current || !mapboxToken) return;

    try {
      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${start[0]},${start[1]};${end[0]},${end[1]}?geometries=geojson&access_token=${mapboxToken}`
      );
      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        
        map.current.addSource('route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: route.geometry
          }
        });

        map.current.addLayer({
          id: 'route',
          type: 'line',
          source: 'route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#3b82f6',
            'line-width': 5,
            'line-opacity': 0.75
          }
        });
      }
    } catch (error) {
      console.error('Error adding route:', error);
    }
  };

  const openDirections = () => {
    const address = order.status === 'claimed' || order.status === 'in_progress' 
      ? order.pickup_address 
      : order.delivery_address;
    
    if (operatorLocation) {
      const { latitude, longitude } = operatorLocation;
      const destination = encodeURIComponent(address);
      const mapsUrl = `https://www.google.com/maps/dir/${latitude},${longitude}/${destination}`;
      window.open(mapsUrl, '_blank');
    } else {
      const destination = encodeURIComponent(address);
      const fallbackUrl = `https://www.google.com/maps/search/${destination}`;
      window.open(fallbackUrl, '_blank');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Order Location - {order.status === 'claimed' || order.status === 'in_progress' ? 'Pickup' : 'Delivery'}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={openDirections}
                className="flex items-center gap-1"
              >
                <Navigation className="h-4 w-4" />
                Get Directions
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogTitle>
          <DialogDescription>
            {order.profiles && (
              <>Customer: {order.profiles.first_name} {order.profiles.last_name} • </>
            )}
            {order.status === 'claimed' || order.status === 'in_progress' ? order.pickup_address : order.delivery_address}
          </DialogDescription>
        </DialogHeader>

        <div className="relative h-[500px] w-full">
          {loading && (
            <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-10">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-muted-foreground">Loading map...</p>
              </div>
            </div>
          )}
          <div ref={mapContainer} className="absolute inset-0 rounded-lg" />
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span>Your Location</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span>{order.status === 'claimed' || order.status === 'in_progress' ? 'Pickup' : 'Delivery'}</span>
            </div>
          </div>
          {order.pickup_window_end && (
            <span>
              Deadline: {new Date(order.pickup_window_end).toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </span>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
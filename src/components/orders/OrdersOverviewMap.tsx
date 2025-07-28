import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Locate } from 'lucide-react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/integrations/supabase/client';

interface Order {
  id: string;
  pickup_address: string;
  delivery_address: string;
  status: string;
  pickup_window_end: string;
  profiles?: {
    first_name: string;
    last_name: string;
  } | null;
}

interface OrdersOverviewMapProps {
  orders: Order[];
  currentLocation?: { latitude: number; longitude: number };
}

export const OrdersOverviewMap: React.FC<OrdersOverviewMapProps> = ({
  orders,
  currentLocation
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMapboxToken();
  }, []);

  useEffect(() => {
    if (mapboxToken && mapContainer.current && !map.current) {
      initializeMap();
    }
    
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [mapboxToken, orders]);

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

  const geocodeAddress = async (address: string): Promise<[number, number] | null> => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${mapboxToken}`
      );
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        return data.features[0].center as [number, number];
      }
      return null;
    } catch (error) {
      console.error('Error geocoding address:', error);
      return null;
    }
  };

  const initializeMap = async () => {
    if (!mapContainer.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;

    try {
      // Start with a default center
      let center: [number, number] = [-74.006, 40.7128]; // NYC default
      
      if (currentLocation) {
        center = [currentLocation.longitude, currentLocation.latitude];
      }

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: center,
        zoom: 11,
      });

      map.current.on('load', async () => {
        if (!map.current) return;

        const bounds = new mapboxgl.LngLatBounds();
        let hasValidCoordinates = false;

        // Add current location marker
        if (currentLocation) {
          new mapboxgl.Marker({ 
            color: '#10b981',
            scale: 1.2
          })
            .setLngLat([currentLocation.longitude, currentLocation.latitude])
            .setPopup(new mapboxgl.Popup().setHTML(`
              <div class="p-2">
                <p class="font-medium text-green-600">📍 Your Current Location</p>
              </div>
            `))
            .addTo(map.current);
          
          bounds.extend([currentLocation.longitude, currentLocation.latitude]);
          hasValidCoordinates = true;
        }

        // Geocode and add markers for each order
        for (const order of orders) {
          const address = order.status === 'claimed' || order.status === 'in_progress' 
            ? order.pickup_address 
            : order.delivery_address;
          
          const coordinates = await geocodeAddress(address);
          
          if (coordinates) {
            const isPickup = order.status === 'claimed' || order.status === 'in_progress';
            const markerColor = getStatusColor(order.status);
            
            new mapboxgl.Marker({ color: markerColor })
              .setLngLat(coordinates)
              .setPopup(new mapboxgl.Popup().setHTML(`
                <div class="p-3">
                  <p class="font-medium">${isPickup ? 'Pickup' : 'Delivery'}: ${order.id.slice(-6)}</p>
                  <p class="text-sm text-gray-600">${address}</p>
                  <p class="text-sm"><strong>Customer:</strong> ${order.profiles?.first_name} ${order.profiles?.last_name}</p>
                  <p class="text-sm"><strong>Status:</strong> ${order.status}</p>
                  <p class="text-sm"><strong>Deadline:</strong> ${new Date(order.pickup_window_end).toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}</p>
                </div>
              `))
              .addTo(map.current);

            bounds.extend(coordinates);
            hasValidCoordinates = true;
          }
        }

        // Fit map to show all markers
        if (hasValidCoordinates) {
          map.current.fitBounds(bounds, { 
            padding: 50,
            maxZoom: 15
          });
        }

        setLoading(false);
      });

      // Add navigation controls
      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
      
    } catch (error) {
      console.error('Error initializing map:', error);
      setLoading(false);
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'claimed':
        return '#3b82f6'; // blue
      case 'in_progress':
        return '#f59e0b'; // amber
      case 'washed':
        return '#8b5cf6'; // purple
      case 'completed':
        return '#10b981'; // green
      default:
        return '#6b7280'; // gray
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          if (map.current) {
            map.current.flyTo({
              center: [longitude, latitude],
              zoom: 14
            });
          }
        },
        (error) => {
          console.error('Error getting current location:', error);
        }
      );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Orders Map</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={getCurrentLocation}
          className="flex items-center gap-1"
        >
          <Locate className="h-4 w-4" />
          My Location
        </Button>
      </div>

      <div className="relative h-[400px] w-full">
        {loading && (
          <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-muted-foreground">Loading map...</p>
            </div>
          </div>
        )}
        <div ref={mapContainer} className="absolute inset-0 rounded-lg border" />
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>Your Location</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span>Claimed</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
            <span>In Progress</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
            <span>Washed</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-600 rounded-full"></div>
            <span>Completed</span>
          </div>
        </div>
        <span>
          Total Orders: {orders.length}
        </span>
      </div>
    </div>
  );
};
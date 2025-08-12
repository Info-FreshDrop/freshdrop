import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useCapacitor } from '@/hooks/useCapacitor';
import { useToast } from '@/hooks/use-toast';
import { 
  MapPin, 
  Navigation, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  Vibrate,
  Camera,
  Bell
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface LocationButtonProps {
  onLocationDetected: (address: string, zipCode: string) => void;
  className?: string;
  disabled?: boolean;
}

export function LocationButton({ onLocationDetected, className, disabled }: LocationButtonProps) {
  const [isDetecting, setIsDetecting] = useState(false);
  const { getCurrentLocation, isNative } = useCapacitor();
  const { toast } = useToast();

  const handleDetectLocation = async () => {
    setIsDetecting(true);
    try {
      let location;
      try {
        location = await getCurrentLocation();
      } catch (capacitorError) {
        // Fallback to web geolocation
        location = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              resolve({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy
              });
            },
            (error) => reject(error),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
          );
        });
      }
      
      // Mock address for now - in real app would use reverse geocoding
      const mockAddress = "123 Main St, Springfield, MO 65804";
      onLocationDetected(mockAddress, "65804");
      
      toast({
        title: "Location Detected",
        description: "Your address has been automatically filled in.",
      });
    } catch (error) {
      toast({
        title: "Location Error",
        description: "Unable to detect location. Please enter manually.",
        variant: "destructive",
      });
    } finally {
      setIsDetecting(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleDetectLocation}
      disabled={disabled || isDetecting}
      className={cn(
        "w-full h-11 ios-touch",
        className
      )}
    >
      {isDetecting ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Detecting...
        </>
      ) : (
        <>
          <Navigation className="h-4 w-4 mr-2" />
          Use Current Location
        </>
      )}
    </Button>
  );
}

interface NativeCapabilitiesStatusProps {
  className?: string;
}

export function NativeCapabilitiesStatus({ className }: NativeCapabilitiesStatusProps) {
  const { isNative, permissions } = useCapacitor();

  if (!isNative) {
    return (
      <Card className={cn("border-amber-200 bg-amber-50", className)}>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <div>
              <h4 className="ios-callout font-medium text-amber-900">Web Version</h4>
              <p className="ios-footnote text-amber-700">
                Install the native app for full features
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("border-green-200 bg-green-50", className)}>
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <h4 className="ios-callout font-medium text-green-900">Native App Active</h4>
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col items-center space-y-1">
              <Camera className="h-4 w-4 text-green-600" />
              <Badge variant={permissions.camera ? "default" : "secondary"} className="text-xs">
                Camera
              </Badge>
            </div>
            <div className="flex flex-col items-center space-y-1">
              <MapPin className="h-4 w-4 text-green-600" />
              <Badge variant={permissions.location ? "default" : "secondary"} className="text-xs">
                Location
              </Badge>
            </div>
            <div className="flex flex-col items-center space-y-1">
              <Bell className="h-4 w-4 text-green-600" />
              <Badge variant={permissions.notifications ? "default" : "secondary"} className="text-xs">
                Notifications
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface HapticTestButtonProps {
  className?: string;
}

export function HapticTestButton({ className }: HapticTestButtonProps) {
  const { triggerHaptic, isNative } = useCapacitor();
  const { toast } = useToast();

  const testHaptic = async () => {
    if (isNative) {
      await triggerHaptic();
      toast({
        title: "Haptic Feedback",
        description: "Did you feel the vibration?",
      });
    } else {
      toast({
        title: "Native Feature",
        description: "Haptic feedback only works in native app",
        variant: "destructive",
      });
    }
  };

  return (
    <Button
      variant="outline"
      onClick={testHaptic}
      className={cn("ios-touch", className)}
    >
      <Vibrate className="h-4 w-4 mr-2" />
      Test Haptic
    </Button>
  );
}
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Camera, MapPin, Bell, Smartphone, Vibrate } from 'lucide-react';
import { useCapacitor, LocationCoords } from '@/hooks/useCapacitor';
import { useToast } from '@/hooks/use-toast';
import { ImpactStyle } from '@capacitor/haptics';

export function MobileFeatures() {
  const [photo, setPhoto] = useState<string | null>(null);
  const [location, setLocation] = useState<LocationCoords | null>(null);
  const [isLoading, setIsLoading] = useState({
    camera: false,
    location: false,
    notification: false
  });

  const { 
    isNative, 
    permissions, 
    takePicture, 
    getCurrentLocation, 
    sendLocalNotification,
    triggerHaptic,
    requestPermissions
  } = useCapacitor();
  const { toast } = useToast();

  const handleTakePhoto = async () => {
    setIsLoading(prev => ({ ...prev, camera: true }));
    try {
      const photoData = await takePicture();
      setPhoto(photoData);
      await triggerHaptic(ImpactStyle.Light);
      toast({
        title: "Photo captured!",
        description: "Successfully took a photo"
      });
    } catch (error) {
      toast({
        title: "Camera Error",
        description: "Failed to take photo. Please check camera permissions.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(prev => ({ ...prev, camera: false }));
    }
  };

  const handleGetLocation = async () => {
    setIsLoading(prev => ({ ...prev, location: true }));
    try {
      const coords = await getCurrentLocation();
      setLocation(coords);
      await triggerHaptic(ImpactStyle.Medium);
      toast({
        title: "Location found!",
        description: `Lat: ${coords.latitude.toFixed(4)}, Lng: ${coords.longitude.toFixed(4)}`
      });
    } catch (error) {
      toast({
        title: "Location Error", 
        description: "Failed to get location. Please check location permissions.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(prev => ({ ...prev, location: false }));
    }
  };

  const handleSendNotification = async () => {
    setIsLoading(prev => ({ ...prev, notification: true }));
    try {
      await sendLocalNotification(
        "FreshDrop Notification",
        "Your laundry order has been updated!"
      );
      await triggerHaptic(ImpactStyle.Heavy);
      toast({
        title: "Notification sent!",
        description: "Check your device notifications"
      });
    } catch (error) {
      toast({
        title: "Notification Error",
        description: "Failed to send notification",
        variant: "destructive"
      });
    } finally {
      setIsLoading(prev => ({ ...prev, notification: false }));
    }
  };

  if (!isNative) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Mobile Features
          </CardTitle>
          <CardDescription>
            These features are only available in the mobile app
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            To test mobile features, export this project to GitHub and run it as a mobile app using Capacitor.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-md mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Mobile Features
          </CardTitle>
          <CardDescription>
            Native mobile capabilities for FreshDrop
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Permissions Status */}
          <div className="space-y-2">
            <h3 className="font-medium">Permissions Status</h3>
            <div className="flex flex-wrap gap-2">
              <Badge variant={permissions.camera ? "default" : "secondary"}>
                <Camera className="h-3 w-3 mr-1" />
                Camera: {permissions.camera ? "Granted" : "Denied"}
              </Badge>
              <Badge variant={permissions.location ? "default" : "secondary"}>
                <MapPin className="h-3 w-3 mr-1" />
                Location: {permissions.location ? "Granted" : "Denied"}
              </Badge>
              <Badge variant={permissions.notifications ? "default" : "secondary"}>
                <Bell className="h-3 w-3 mr-1" />
                Notifications: {permissions.notifications ? "Granted" : "Denied"}
              </Badge>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={requestPermissions}
              className="w-full"
            >
              Request All Permissions
            </Button>
          </div>

          {/* Camera Feature */}
          <div className="space-y-2">
            <Button
              onClick={handleTakePhoto}
              disabled={!permissions.camera || isLoading.camera}
              className="w-full"
            >
              <Camera className="h-4 w-4 mr-2" />
              {isLoading.camera ? "Taking Photo..." : "Take Photo"}
            </Button>
            {photo && (
              <div className="mt-2">
                <img 
                  src={photo} 
                  alt="Captured" 
                  className="w-full h-32 object-cover rounded-md border"
                />
              </div>
            )}
          </div>

          {/* Location Feature */}
          <div className="space-y-2">
            <Button
              onClick={handleGetLocation}
              disabled={!permissions.location || isLoading.location}
              variant="secondary"
              className="w-full"
            >
              <MapPin className="h-4 w-4 mr-2" />
              {isLoading.location ? "Getting Location..." : "Get Current Location"}
            </Button>
            {location && (
              <div className="text-sm bg-muted p-2 rounded">
                <p>Latitude: {location.latitude.toFixed(6)}</p>
                <p>Longitude: {location.longitude.toFixed(6)}</p>
                <p>Accuracy: {location.accuracy.toFixed(0)}m</p>
              </div>
            )}
          </div>

          {/* Notification Feature */}
          <Button
            onClick={handleSendNotification}
            disabled={!permissions.notifications || isLoading.notification}
            variant="outline"
            className="w-full"
          >
            <Bell className="h-4 w-4 mr-2" />
            {isLoading.notification ? "Sending..." : "Send Test Notification"}
          </Button>

          {/* Haptic Feedback */}
          <Button
            onClick={() => triggerHaptic(ImpactStyle.Heavy)}
            variant="ghost"
            className="w-full"
          >
            <Vibrate className="h-4 w-4 mr-2" />
            Test Haptic Feedback
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
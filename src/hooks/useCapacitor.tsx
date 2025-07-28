import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { StatusBar, Style } from '@capacitor/status-bar';

export interface LocationCoords {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export function useCapacitor() {
  const [isNative, setIsNative] = useState(false);
  const [permissions, setPermissions] = useState({
    camera: false,
    location: false,
    notifications: false
  });

  useEffect(() => {
    setIsNative(Capacitor.isNativePlatform());
    
    if (Capacitor.isNativePlatform()) {
      initializeNativeFeatures();
    }
  }, []);

  const initializeNativeFeatures = async () => {
    try {
      // Initialize status bar
      await StatusBar.setStyle({ style: Style.Default });
      
      // Request permissions
      await requestPermissions();
    } catch (error) {
      console.error('Failed to initialize native features:', error);
    }
  };

  const requestPermissions = async () => {
    try {
      // Camera permissions
      const cameraPermission = await Camera.requestPermissions();
      
      // Location permissions
      const locationPermission = await Geolocation.requestPermissions();
      
      // Notification permissions
      let notificationPermission = { receive: 'granted' };
      if (Capacitor.isNativePlatform()) {
        notificationPermission = await PushNotifications.requestPermissions();
      }

      setPermissions({
        camera: cameraPermission.camera === 'granted',
        location: locationPermission.location === 'granted',
        notifications: notificationPermission.receive === 'granted'
      });
    } catch (error) {
      console.error('Permission request failed:', error);
    }
  };

  const takePicture = async () => {
    try {
      const result = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera
      });
      return result.dataUrl;
    } catch (error) {
      console.error('Camera failed:', error);
      throw error;
    }
  };

  const getCurrentLocation = async (): Promise<LocationCoords> => {
    try {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000
      });
      
      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy
      };
    } catch (error) {
      console.error('Geolocation failed:', error);
      throw error;
    }
  };

  const sendLocalNotification = async (title: string, body: string) => {
    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: Date.now(),
            title,
            body,
            schedule: { at: new Date(Date.now() + 1000) }
          }
        ]
      });
    } catch (error) {
      console.error('Local notification failed:', error);
    }
  };

  const triggerHaptic = async (style: ImpactStyle = ImpactStyle.Medium) => {
    try {
      if (Capacitor.isNativePlatform()) {
        await Haptics.impact({ style });
      }
    } catch (error) {
      console.error('Haptic feedback failed:', error);
    }
  };

  const setStatusBarStyle = async (dark: boolean) => {
    try {
      if (Capacitor.isNativePlatform()) {
        await StatusBar.setStyle({ 
          style: dark ? Style.Dark : Style.Light 
        });
      }
    } catch (error) {
      console.error('Status bar update failed:', error);
    }
  };

  return {
    isNative,
    permissions,
    takePicture,
    getCurrentLocation,
    sendLocalNotification,
    triggerHaptic,
    setStatusBarStyle,
    requestPermissions
  };
}
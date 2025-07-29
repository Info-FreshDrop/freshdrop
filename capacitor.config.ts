import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.freshdrop',
  appName: 'FreshDrop',
  webDir: 'dist',
  // Production config - no server URL for native builds
  plugins: {
    Camera: {
      permissions: ['camera', 'photos']
    },
    Geolocation: {
      permissions: ['location']
    },
    PushNotifications: {
      presentationOptions: ['alert', 'badge', 'sound']
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#488AFF'
    },
    StatusBar: {
      style: 'default',
      backgroundColor: '#FFFFFF'
    }
  }
};

export default config;
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.freshdrop',
  appName: 'FreshDrop',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    url: 'https://15cd9fd2-7824-49dc-9081-d06b548dff20.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
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
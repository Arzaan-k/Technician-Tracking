import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'in.crystalgroup.loctrack',
  appName: 'LocTrack',
  webDir: 'dist',
  android: {
    // Make webview transparent to show status bar properly
    backgroundColor: '#ffffff',
  },
  plugins: {
    AndroidForegroundService: {
      foregroundServiceType: "location",
    },
    // Geolocation plugin configuration
    Geolocation: {
      // Request background location permission
      enableHighAccuracy: true,
    },
  },
  // Server configuration for debugging
  server: {
    // Clear text traffic for development  
    cleartext: true,
  },
};

export default config;

import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.loctrack.app',
  appName: 'LocTrack',
  webDir: 'dist',
  plugins: {
    AndroidForegroundService: {
      foregoundServiceType: "location",
    },
  },
};

export default config;

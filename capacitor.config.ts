
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.devnconnect.app', // TODO: Update with your Apple Developer Team ID bundle (e.g., com.yourcompany.devnconnect)
  appName: 'Devn Connect',
  webDir: 'dist/public',
  server: {
    androidScheme: 'http',
    // For production, you'll need to update this to your API URL
     url: 'https://emerson-proenforcement-zenia.ngrok-free.dev',
    cleartext: true 
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: true,
      backgroundColor: "#ffffff",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: true,
      androidSpinnerStyle: "large",
      iosSpinnerStyle: "small",
      spinnerColor: "#999999",
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

export default config;
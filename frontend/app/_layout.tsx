import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import { Platform } from 'react-native';
import { COLORS, FONTS } from '@/utils/constants';
import fontMap from './fonts';

export default function RootLayout() {
  // Web: fontMap is {} (Inter via Google Fonts in useEffect). Native: fontMap loads local .ttf
  const [fontsLoaded] = useFonts(fontMap);

  useEffect(() => {
    if (Platform.OS === 'web') {
      // Load Inter from Google Fonts as fallback/primary for web
      const link = document.createElement('link');
      link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
      link.rel = 'stylesheet';
      document.head.appendChild(link);
      
      // Set Inter as default font
      const style = document.createElement('style');
      style.textContent = `
        * {
          font-family: '${FONTS.INTER}', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: COLORS.BACKGROUND,
        },
        headerTintColor: COLORS.TEXT,
        headerTitleStyle: {
          fontFamily: FONTS.INTER,
          fontWeight: '500',
          color: COLORS.TEXT,
        },
        contentStyle: {
          backgroundColor: COLORS.BACKGROUND,
        },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, Orbitron_900Black } from '@expo-google-fonts/orbitron';

import { ThemeContextProvider, useTheme } from '@/context/theme-context';
import { LanguageContextProvider } from '@/context/language-context';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const unstable_settings = {
  anchor: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

function RootLayoutContent() {
  const { activeScheme } = useTheme();

  return (
    <ThemeProvider value={activeScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar
        style={activeScheme === 'dark' ? 'light' : 'dark'}
        translucent={false}
        backgroundColor={activeScheme === 'dark' ? '#0A0A0A' : '#F7F7F7'}
      />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Orbitron_900Black,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <LanguageContextProvider>
      <ThemeContextProvider>
        <RootLayoutContent />
      </ThemeContextProvider>
    </LanguageContextProvider>
  );
}

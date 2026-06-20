import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

SplashScreen.preventAutoHideAsync();

function RootLayoutContent() {
  const { activeScheme } = useTheme();
  const [isSetupDone, setIsSetupDone] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkSetup() {
      const hasCompleted = await AsyncStorage.getItem('@BreatheFree:hasCompletedSetup');
      setIsSetupDone(hasCompleted === 'true');
    }
    checkSetup();
  }, []);

  if (isSetupDone === null) return null; // Đang kiểm tra trạng thái

  return (
    <ThemeProvider value={activeScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        {!isSetupDone ? (
          <Stack.Screen name="setup" />
        ) : (
          <Stack.Screen name="(tabs)" />
        )}
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
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
  const [fontsLoaded, error] = useFonts({
    Orbitron_900Black,
  });

  useEffect(() => {
    if (fontsLoaded || error) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, error]);

  if (!fontsLoaded && !error) {
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

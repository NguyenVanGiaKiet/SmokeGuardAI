import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { ThemeContextProvider, useTheme } from '@/context/theme-context';
import { LanguageContextProvider } from '@/context/language-context';

export const unstable_settings = {
  anchor: '(tabs)',
};

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
  return (
    <LanguageContextProvider>
      <ThemeContextProvider>
        <RootLayoutContent />
      </ThemeContextProvider>
    </LanguageContextProvider>
  );
}

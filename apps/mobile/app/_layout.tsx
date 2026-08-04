import '../global.css';

import { semantic } from '@cricket/tokens';
import { useFonts } from 'expo-font';
import { Stack, SplashScreen } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { FONT_MAP } from '../lib/fonts';

// Prints the full stack on the device instead of a truncated one-liner.
// Temporary — delete once M0 boots cleanly.
export { ErrorReport as ErrorBoundary } from '../components/ErrorReport';

// Hold the splash screen until the fonts are ready. A frame of fallback system
// type before Archivo swaps in reads as a bug on a dark screen.
void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(FONT_MAP);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    // GestureHandlerRootView must wrap the whole tree — the fielder drag in M4
    // depends on it, and a missing root fails silently rather than loudly.
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: semantic.screen }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: semantic.screen },
          }}
        />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

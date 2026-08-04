import type { ErrorBoundaryProps } from 'expo-router';
import { Pressable, ScrollView, Text } from 'react-native';

/**
 * Diagnostic error screen. Temporary — delete once M0 boots on a device.
 *
 * expo-router renders a route's exported `ErrorBoundary` when that route (or its
 * layout) throws during render. The default red box truncates to a one-line
 * message in the terminal — `TypeError: undefined is not a function` on its own
 * names neither the module nor the call. This prints the whole stack on the
 * device, `selectable` so it can be copied out.
 *
 * Deliberately inline-styled and dependency-free: an error screen that depends
 * on NativeWind or the token package cannot report a crash in NativeWind or the
 * token package.
 */
export function ErrorReport({ error, retry }: ErrorBoundaryProps) {
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#07090B' }}
      contentContainerStyle={{ padding: 20, paddingTop: 60 }}
    >
      <Text style={{ color: '#E0A34A', fontSize: 20, marginBottom: 10 }}>Runtime error</Text>

      <Text selectable style={{ color: '#F2F4F3', fontSize: 15, lineHeight: 22, marginBottom: 20 }}>
        {error?.message ?? String(error)}
      </Text>

      <Text style={{ color: '#8D9AA5', fontSize: 11, letterSpacing: 1.2, marginBottom: 6 }}>
        STACK
      </Text>
      <Text selectable style={{ color: '#8D9AA5', fontSize: 11, lineHeight: 17 }}>
        {error?.stack ?? '(no stack)'}
      </Text>

      <Pressable
        onPress={retry}
        accessibilityRole="button"
        accessibilityLabel="Retry rendering"
        style={{
          marginTop: 24,
          minHeight: 44,
          justifyContent: 'center',
          backgroundColor: '#A32B2B',
          borderRadius: 6,
        }}
      >
        <Text style={{ color: '#F2F4F3', textAlign: 'center', fontSize: 16 }}>Retry</Text>
      </Pressable>
    </ScrollView>
  );
}

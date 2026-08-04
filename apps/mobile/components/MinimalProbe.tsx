import { ScrollView, Text, View } from 'react-native';

/**
 * Bisect probe. Deliberately depends on nothing: no NativeWind `className`, no
 * `@cricket/tokens`, no `@cricket/domain`, no safe-area context. Only React
 * Native primitives and inline styles.
 *
 * Used to split a runtime crash in half:
 *
 *   renders  → the root layout (fonts, gesture handler, router) is fine, and the
 *              fault is in the token screen — i.e. NativeWind or the workspace
 *              packages.
 *   crashes  → the fault is above the screen, in app/_layout.tsx.
 *
 * Delete once M0 boots cleanly on a device.
 */
export default function MinimalProbe() {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#07090B' }}>
      <View style={{ padding: 24 }}>
        <Text style={{ color: '#F2F4F3', fontSize: 28, marginBottom: 12 }}>Minimal probe</Text>
        <Text style={{ color: '#8D9AA5', fontSize: 15, lineHeight: 22 }}>
          If you can read this, React Native, expo-router and app/_layout.tsx are all fine. The
          crash is inside the token screen — NativeWind or a workspace package.
        </Text>
        <View
          style={{
            marginTop: 20,
            height: 44,
            borderRadius: 6,
            backgroundColor: '#A32B2B',
          }}
        />
        <Text style={{ color: '#8D9AA5', fontSize: 13, marginTop: 8 }}>
          System font, inline styles, no className anywhere.
        </Text>
      </View>
    </ScrollView>
  );
}

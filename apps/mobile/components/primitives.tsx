import { color, layout, semantic } from '@cricket/tokens';
import { Pressable, Text, View, type ViewStyle } from 'react-native';

/** Small shared pieces. Deliberately not a `packages/ui` — see BUILD.md §2. */

export function SectionLabel({ children, tight }: { children: string; tight?: boolean }) {
  return (
    <Text
      accessibilityRole="header"
      style={{
        color: color.chalk400,
        fontFamily: 'IBMPlexMono_500Medium',
        fontSize: 11,
        letterSpacing: 1.4,
        textTransform: 'uppercase',
        marginTop: tight ? 14 : 26,
        marginBottom: 10,
      }}
    >
      {children}
    </Text>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return (
    <View
      style={[
        {
          backgroundColor: semantic.card,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: color.ink500,
          padding: 14,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      style={{
        // Minimum 44pt touch target (§5).
        minHeight: layout.minTouchTarget,
        justifyContent: 'center',
        paddingHorizontal: 15,
        borderRadius: 999,
        marginRight: 8,
        marginBottom: 8,
        backgroundColor: selected ? semantic.accent : color.ink800,
        borderWidth: 1,
        borderColor: selected ? semantic.accent : color.ink500,
      }}
    >
      <Text
        style={{
          color: selected ? color.chalk100 : color.chalk400,
          fontFamily: selected ? 'InterTight_600SemiBold' : 'InterTight_400Regular',
          fontSize: 14,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * Stat cells lay out in a fixed three-column grid rather than wrapping freely.
 * Free wrap left a single orphaned cell on its own row, which read as a mistake.
 */
export function StatGrid({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 }}>{children}</View>
  );
}

export function StatCell({
  label,
  value,
  accent,
  hint,
}: {
  label: string;
  value: string;
  accent?: boolean;
  hint?: string;
}) {
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}${hint ? `, ${hint}` : ''}`}
      style={{
        width: '33.333%',
        paddingHorizontal: 4,
        marginBottom: 8,
      }}
    >
      <View
        style={{
          backgroundColor: semantic.card,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: accent ? 'rgba(224,163,74,0.4)' : color.ink500,
          paddingHorizontal: 11,
          paddingVertical: 10,
          minHeight: 62,
        }}
      >
        <Text
          numberOfLines={1}
          style={{
            color: color.chalk400,
            fontFamily: 'IBMPlexMono_400Regular',
            fontSize: 9.5,
            letterSpacing: 0.9,
            textTransform: 'uppercase',
          }}
        >
          {label}
        </Text>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          style={{
            color: accent ? semantic.warning : color.chalk100,
            fontFamily: 'InterTight_600SemiBold',
            fontSize: 15,
            marginTop: 4,
          }}
        >
          {value}
        </Text>
        {hint && (
          <Text
            numberOfLines={1}
            style={{
              color: color.chalk400,
              fontFamily: 'InterTight_400Regular',
              fontSize: 10,
              marginTop: 1,
            }}
          >
            {hint}
          </Text>
        )}
      </View>
    </View>
  );
}

/**
 * A thin bar, used for execution reliability and pressure. Never labelled with
 * a number the app has invented — §10 rule 3's reasoning applies to the app's
 * own arithmetic too, so `pressureIndex` drives a bar and never a figure.
 */
export function Meter({
  value,
  tint,
  label,
}: {
  value: number;
  tint: string;
  label?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <View accessible accessibilityLabel={label ? `${label}, ${clamped} of 100` : undefined}>
      <View
        style={{
          height: 4,
          borderRadius: 999,
          backgroundColor: color.ink500,
          overflow: 'hidden',
        }}
      >
        <View style={{ width: `${clamped}%`, height: '100%', backgroundColor: tint }} />
      </View>
    </View>
  );
}

export function Pill({
  text,
  tint,
  background,
}: {
  text: string;
  tint: string;
  background: string;
}) {
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        borderRadius: 999,
        paddingHorizontal: 11,
        paddingVertical: 5,
        backgroundColor: background,
      }}
    >
      <Text
        style={{
          color: tint,
          fontFamily: 'IBMPlexMono_500Medium',
          fontSize: 10.5,
          letterSpacing: 1,
        }}
      >
        {text}
      </Text>
    </View>
  );
}

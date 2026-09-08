import { SHOT_LABELS, ZONE_LABELS, type BatterOption } from '@cricket/domain';
import { color, semantic } from '@cricket/tokens';
import { Pressable, Text, View } from 'react-native';

const RISK_TINT: Record<BatterOption['risk'], string> = {
  low: semantic.legal,
  medium: semantic.warning,
  high: semantic.accent,
};

/**
 * One defensible option, with what it costs (BUILD.md §0).
 *
 * Options are shown side by side and none is marked "best" — there is no
 * single correct answer to a cricket tactical question, and the product never
 * presents itself as an oracle. The user commits; the app does not.
 */
export function OptionCard({
  option,
  selected,
  onPress,
}: {
  option: BatterOption;
  selected: boolean;
  onPress: () => void;
}) {
  const tint = RISK_TINT[option.risk];

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${SHOT_LABELS[option.shot]} to ${ZONE_LABELS[option.targetZone]}, ${option.risk} risk. ${option.because} ${option.unless}`}
      style={{
        backgroundColor: semantic.card,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: selected ? tint : color.ink500,
        padding: 14,
        marginBottom: 10,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text
          style={{ color: color.chalk100, fontFamily: 'Archivo_700Bold', fontSize: 19, flex: 1 }}
        >
          {SHOT_LABELS[option.shot]}
        </Text>
        <View
          style={{
            borderRadius: 999,
            paddingHorizontal: 9,
            paddingVertical: 4,
            borderWidth: 1,
            borderColor: tint,
          }}
        >
          <Text style={{ color: tint, fontFamily: 'IBMPlexMono_500Medium', fontSize: 10 }}>
            {option.risk.toUpperCase()}
          </Text>
        </View>
      </View>

      <Text
        style={{
          color: color.chalk400,
          fontFamily: 'IBMPlexMono_400Regular',
          fontSize: 11,
          marginTop: 3,
        }}
      >
        {`→ ${ZONE_LABELS[option.targetZone]}`}
      </Text>

      <Text
        style={{
          color: color.chalk100,
          fontFamily: 'InterTight_400Regular',
          fontSize: 13.5,
          lineHeight: 19,
          marginTop: 10,
        }}
      >
        {option.because}
      </Text>

      <View style={{ flexDirection: 'row', marginTop: 8 }}>
        <Text
          style={{
            color: semantic.warning,
            fontFamily: 'IBMPlexMono_500Medium',
            fontSize: 10,
            marginRight: 6,
            marginTop: 2,
          }}
        >
          UNLESS
        </Text>
        <Text
          style={{
            color: color.chalk400,
            fontFamily: 'InterTight_400Regular',
            fontSize: 13,
            lineHeight: 19,
            flex: 1,
          }}
        >
          {option.unless}
        </Text>
      </View>
    </Pressable>
  );
}

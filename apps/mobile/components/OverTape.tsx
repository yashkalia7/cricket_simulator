import { deliveryGlyph, type DeliveryRecord } from '@cricket/domain';
import { color, semantic } from '@cricket/tokens';
import { ScrollView, Text, View } from 'react-native';

/**
 * The Over Tape (BUILD.md §5) — the signature element.
 *
 * A persistent horizontal ribbon of the last twelve deliveries. Each ball is a
 * cell with an outcome glyph, colour-coded, the current ball pulsing in
 * leather. `19.1 19.2 19.3` is real sequence information, not decoration —
 * this is what the product should be recognisable by.
 *
 * On a phone it sits directly under the score block and scrolls horizontally.
 */

interface Props {
  deliveries: readonly DeliveryRecord[];
}

const cellColour = (d: DeliveryRecord): string => {
  if (d.wicket) return semantic.accent;
  if (d.runs >= 4) return semantic.warning;
  if (d.runs === 0) return color.ink500;
  return color.ink700;
};

const textColour = (d: DeliveryRecord): string => {
  if (d.wicket) return color.chalk100;
  if (d.runs >= 4) return color.ink900;
  return color.chalk400;
};

export function OverTape({ deliveries }: Props) {
  const shown = deliveries.slice(-12);
  const lastIndex = shown.length - 1;

  return (
    <View accessibilityLabel={`Last ${shown.length} deliveries`}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 6, paddingVertical: 2 }}
      >
        {shown.map((d, i) => {
          const current = i === lastIndex;
          return (
            <View
              key={`${d.over}.${d.ball}-${i}`}
              accessible
              accessibilityLabel={`${d.over}.${d.ball}, ${
                d.wicket ? 'wicket' : `${d.runs} runs`
              }`}
              style={{
                alignItems: 'center',
                minWidth: 34,
              }}
            >
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 6,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: cellColour(d),
                  borderWidth: current ? 1.5 : 0,
                  borderColor: semantic.accent,
                }}
              >
                <Text
                  style={{
                    color: textColour(d),
                    fontSize: 14,
                    fontFamily: 'IBMPlexMono_500Medium',
                  }}
                >
                  {deliveryGlyph(d)}
                </Text>
              </View>
              <Text
                style={{
                  color: color.chalk400,
                  fontSize: 10,
                  marginTop: 3,
                  fontFamily: 'IBMPlexMono_400Regular',
                  opacity: current ? 1 : 0.55,
                }}
              >
                {`${d.over}.${d.ball}`}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

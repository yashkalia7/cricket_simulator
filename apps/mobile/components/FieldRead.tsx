import { ZONE_LABELS, type FieldRead as FieldReadData } from '@cricket/domain';
import { color, semantic } from '@cricket/tokens';
import { Text, View } from 'react-native';

import { Card } from './primitives';

/** 'a', 'a and b', 'a, b and c' — chaining bare `and` reads badly past two. */
const listOf = (items: string[]): string =>
  items.length <= 1
    ? (items[0] ?? '')
    : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;

/**
 * What the field is actually telling you — computed, not guessed.
 *
 * No model produces any of this. Zone coverage comes from the relation graph
 * and the geometry, so it is exact and instant.
 */
export function FieldReadPanel({ read }: { read: FieldReadData }) {
  return (
    <Card>
      <Text
        style={{
          color: color.chalk400,
          fontFamily: 'IBMPlexMono_500Medium',
          fontSize: 10,
          letterSpacing: 1.2,
          marginBottom: 8,
        }}
      >
        BOUNDARY UNGUARDED
      </Text>

      {read.gaps.length === 0 ? (
        <Text style={{ color: semantic.legal, fontFamily: 'InterTight_500Medium', fontSize: 14 }}>
          Every boundary has a sweeper. There is no free four.
        </Text>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {read.gaps.map((zone) => (
            <View
              key={zone}
              style={{
                backgroundColor: 'rgba(224,163,74,0.14)',
                borderRadius: 999,
                paddingHorizontal: 10,
                paddingVertical: 5,
                marginRight: 6,
                marginBottom: 6,
              }}
            >
              <Text
                style={{
                  color: semantic.warning,
                  fontFamily: 'InterTight_500Medium',
                  fontSize: 12.5,
                }}
              >
                {ZONE_LABELS[zone]}
              </Text>
            </View>
          ))}
        </View>
      )}

      {read.doubled.length > 0 && (
        <Text
          style={{
            color: color.chalk400,
            fontFamily: 'InterTight_400Regular',
            fontSize: 12,
            marginTop: 8,
            lineHeight: 18,
          }}
        >
          {`Two fielders each in ${listOf(read.doubled.map((z) => ZONE_LABELS[z]))} — that is where they expect you to hit.`}
        </Text>
      )}
    </Card>
  );
}

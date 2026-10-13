import {
  INTENT_LABELS,
  LENGTH_LABELS,
  LINE_LABELS,
  VARIATION_LABELS,
  type Intent,
  type Length,
  type Line,
  type Variation,
} from '@cricket/domain';
import { color, semantic } from '@cricket/tokens';
import { ActivityIndicator, Text, View } from 'react-native';

import type { SuggestResponse, SuggestionOption } from '../lib/api';
import { Card, Pill } from './primitives';

/**
 * What a coach might say — shown **after** you commit, never before.
 *
 * That ordering is the product (§1): the app asks, you answer, and only then
 * do you see the trade-offs. Showing options first would turn a decision gym
 * into an answer key.
 *
 * Options are presented side by side with none marked best (§0).
 */

const RISK_TINT: Record<SuggestionOption['risk'], string> = {
  low: semantic.legal,
  medium: semantic.warning,
  high: semantic.accent,
};

const describe = (option: SuggestionOption['option']): string => {
  const length = LENGTH_LABELS[option.length as Length] ?? option.length;
  const line = LINE_LABELS[option.line as Line] ?? option.line;
  const variation = VARIATION_LABELS[option.variation as Variation] ?? option.variation;
  return option.variation === 'stock' ? `${length}, ${line}` : `${length}, ${line} — ${variation}`;
};

export function Suggestions({
  loading,
  result,
  error,
}: {
  loading: boolean;
  result: SuggestResponse | null;
  error: string | null;
}) {
  if (loading) {
    return (
      <Card style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center' }}>
        <ActivityIndicator color={color.chalk400} />
        <Text
          style={{
            color: color.chalk400,
            fontFamily: 'InterTight_400Regular',
            fontSize: 14,
            marginLeft: 12,
          }}
        >
          Working through the situation…
        </Text>
      </Card>
    );
  }

  if (error) {
    return (
      <Card style={{ marginTop: 14 }}>
        <Text
          style={{ color: semantic.warning, fontFamily: 'InterTight_500Medium', fontSize: 14 }}
        >
          {error}
        </Text>
      </Card>
    );
  }

  if (!result || result.options.length === 0) return null;

  return (
    <View style={{ marginTop: 18 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
        <Text
          style={{
            color: color.chalk400,
            fontFamily: 'IBMPlexMono_500Medium',
            fontSize: 11,
            letterSpacing: 1.4,
            flex: 1,
          }}
        >
          WHAT A COACH MIGHT SAY
        </Text>
        {/* Never hide which engine answered. A computed fallback reads exactly
            like a model answer otherwise, and the two deserve different trust. */}
        <Pill
          text={result.source === 'model' ? 'MODEL' : 'COMPUTED'}
          tint={result.source === 'model' ? semantic.warning : semantic.legal}
          background={
            result.source === 'model' ? 'rgba(224,163,74,0.14)' : 'rgba(62,122,94,0.16)'
          }
        />
      </View>

      <Text
        style={{
          color: color.chalk400,
          fontFamily: 'InterTight_400Regular',
          fontSize: 13,
          lineHeight: 19,
          marginBottom: 12,
        }}
      >
        {result.source === 'model'
          ? 'None of these is the answer. They are defensible options — the disagreement is the lesson.'
          : 'The model did not answer, so these are computed from the field itself.'}
      </Text>

      {result.options.map((option) => (
        <Card key={option.id} style={{ marginBottom: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text
              style={{
                color: color.chalk100,
                fontFamily: 'Archivo_700Bold',
                fontSize: 17,
                flex: 1,
              }}
            >
              {describe(option.option)}
            </Text>
            <View
              style={{
                borderRadius: 999,
                paddingHorizontal: 9,
                paddingVertical: 4,
                borderWidth: 1,
                borderColor: RISK_TINT[option.risk],
              }}
            >
              <Text
                style={{
                  color: RISK_TINT[option.risk],
                  fontFamily: 'IBMPlexMono_500Medium',
                  fontSize: 10,
                }}
              >
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
            {INTENT_LABELS[option.option.intent as Intent] ?? option.option.intent}
            {option.confidence === 'contested' ? '  ·  CONTESTED' : ''}
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
        </Card>
      ))}

      {result.cached && (
        <Text
          style={{
            color: color.chalk400,
            fontFamily: 'IBMPlexMono_400Regular',
            fontSize: 10,
            marginTop: 2,
          }}
        >
          CACHED — THIS SITUATION HAS BEEN ASKED BEFORE
        </Text>
      )}
    </View>
  );
}

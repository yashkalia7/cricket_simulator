import {
  INTENT_LABELS,
  LENGTH_LABELS,
  LINE_LABELS,
  VARIATION_LABELS,
  type Intent,
  type Length,
  type Line,
  type PositionId,
  type Variation,
} from '@cricket/domain';
import { color, semantic } from '@cricket/tokens';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import type { SuggestResponse, SuggestionOption } from '../lib/api';
import { POSITION_LABEL } from '../lib/labels';
import { Card, Pill } from './primitives';

function Para({ label, text, tint }: { label: string; text: string; tint?: string }) {
  return (
    <View style={{ marginTop: 10 }}>
      <Text
        style={{
          color: tint ?? color.chalk400,
          fontFamily: 'IBMPlexMono_500Medium',
          fontSize: 10,
          letterSpacing: 1.1,
          marginBottom: 4,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          color: color.chalk100,
          fontFamily: 'InterTight_400Regular',
          fontSize: 14,
          lineHeight: 21,
        }}
      >
        {text}
      </Text>
    </View>
  );
}

const ACTION_LABELS: Record<string, string> = {
  push_back: 'push back',
  bring_up: 'bring up',
  finer: 'finer',
  squarer: 'squarer',
};

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
  onRethink,
}: {
  loading: boolean;
  result: SuggestResponse | null;
  error: string | null;
  onRethink?: () => void;
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
          Reading the situation…
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
      {/* The position itself, before any option is offered. */}
      {result.theRead && (
        <Card style={{ marginBottom: 14 }}>
          <Text
            style={{
              color: color.chalk400,
              fontFamily: 'IBMPlexMono_500Medium',
              fontSize: 11,
              letterSpacing: 1.4,
            }}
          >
            THE READ
          </Text>
          <Para label="WHAT HE IS TRYING TO DO" text={result.theRead.batterIntent} />
          <Para label="WHAT YOU HAVE TO WORK WITH" text={result.theRead.bowlerLeverage} />
          <Para label="GROUND AND CONDITIONS" text={result.theRead.groundAndConditions} />
        </Card>
      )}

      {/* The read of the call they actually made. This is the part they came
          for — it goes first, and it is about their decision, not the field. */}
      {result.onYourCall && (
        <Card style={{ marginBottom: 18, borderColor: RISK_TINT[result.onYourCall.risk] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Text
              style={{
                color: color.chalk400,
                fontFamily: 'IBMPlexMono_500Medium',
                fontSize: 11,
                letterSpacing: 1.4,
                flex: 1,
              }}
            >
              YOUR CALL
            </Text>
            <Text
              style={{
                color: RISK_TINT[result.onYourCall.risk],
                fontFamily: 'IBMPlexMono_500Medium',
                fontSize: 10,
              }}
            >
              {result.onYourCall.risk.toUpperCase()} RISK
            </Text>
          </View>
          <Text
            style={{
              color: color.chalk100,
              fontFamily: 'InterTight_400Regular',
              fontSize: 14.5,
              lineHeight: 21,
            }}
          >
            {result.onYourCall.reading}
          </Text>
          <Para
            label="WHEN IT LANDS"
            text={result.onYourCall.whenItLands}
            tint={semantic.legal}
          />
          <Para
            label="WHEN IT MISSES"
            text={result.onYourCall.whenItMisses}
            tint={semantic.warning}
          />
          <Para label="SHARPEN" text={result.onYourCall.sharpen} tint={semantic.legal} />
        </Card>
      )}

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
          WHAT ELSE YOU COULD HAVE DONE
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
          : 'Worked out from the field itself, not from a coach.'}
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

          {(option.option.fieldChanges ?? []).length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 }}>
              {option.option.fieldChanges!.map((change) => (
                <View
                  key={`${change.position}-${change.action}`}
                  style={{
                    backgroundColor: 'rgba(62,122,94,0.14)',
                    borderRadius: 999,
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    marginRight: 6,
                    marginBottom: 6,
                  }}
                >
                  <Text
                    style={{
                      color: semantic.legal,
                      fontFamily: 'IBMPlexMono_400Regular',
                      fontSize: 11,
                    }}
                  >
                    {`${POSITION_LABEL[change.position as PositionId] ?? change.position} · ${ACTION_LABELS[change.action]}`}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <Para label="UNLESS" text={option.unless} tint={semantic.warning} />
          {option.howTheOverDevelops && (
            <Para label="WHAT IT SETS UP" text={option.howTheOverDevelops} />
          )}
        </Card>
      ))}

      {result.overPlan && (
        <Card style={{ marginTop: 4 }}>
          <Text
            style={{
              color: color.chalk400,
              fontFamily: 'IBMPlexMono_500Medium',
              fontSize: 11,
              letterSpacing: 1.4,
            }}
          >
            HOW TO PLAY THE REST OF THE OVER
          </Text>
          <Text
            style={{
              color: color.chalk100,
              fontFamily: 'InterTight_400Regular',
              fontSize: 14,
              lineHeight: 21,
              marginTop: 8,
            }}
          >
            {result.overPlan}
          </Text>
        </Card>
      )}

      {/* When the model answered and was refused, say so and say why. A silent
          fallback is indistinguishable from a model that simply writes badly. */}
      {result.source === 'computed' && result.rejected && result.rejected.length > 0 && (
        <Card
          style={{
            marginTop: 10,
            backgroundColor: 'rgba(224,163,74,0.1)',
            borderColor: 'rgba(224,163,74,0.3)',
          }}
        >
          <Text
            style={{
              color: semantic.warning,
              fontFamily: 'IBMPlexMono_500Medium',
              fontSize: 10,
              letterSpacing: 1.1,
              marginBottom: 6,
            }}
          >
            THE COACH ANSWERED AND WAS TURNED DOWN
          </Text>
          {result.rejected.slice(0, 4).map((reason) => (
            <Text
              key={reason}
              style={{
                color: color.chalk400,
                fontFamily: 'InterTight_400Regular',
                fontSize: 12.5,
                lineHeight: 18,
              }}
            >
              {`· ${reason}`}
            </Text>
          ))}
        </Card>
      )}

      {onRethink && (
        <Pressable
          onPress={onRethink}
          accessibilityRole="button"
          accessibilityLabel="Ask again for a different answer"
          style={{
            marginTop: 14,
            minHeight: 46,
            borderRadius: 10,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: color.ink500,
            backgroundColor: color.ink800,
          }}
        >
          <Text
            style={{
              color: color.chalk100,
              fontFamily: 'InterTight_500Medium',
              fontSize: 14,
            }}
          >
            Ask again for a different read
          </Text>
        </Pressable>
      )}

      {result.cached && (
        <Text
          style={{
            color: color.chalk400,
            fontFamily: 'IBMPlexMono_400Regular',
            fontSize: 10,
            marginTop: 8,
            textAlign: 'center',
          }}
        >
          YOU HAVE ASKED THIS BEFORE — THIS IS THE SAME ANSWER
        </Text>
      )}
    </View>
  );
}

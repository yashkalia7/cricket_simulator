import {
  INTENTS,
  INTENT_LABELS,
  LENGTHS,
  LENGTH_LABELS,
  LINES,
  LINE_LABELS,
  ZONE_LABELS,
  batterOptions,
  bowlerRead,
  chaseLabel,
  coherenceGaps,
  createScenario,
  evaluateField,
  hashScenario,
  nearestCanonicalPosition,
  overBallLabel,
  readField,
  type BatterOption,
  type FieldSetting,
  type Intent,
  type Length,
  type Line,
  type Vec2,
} from '@cricket/domain';
import { color, semantic } from '@cricket/tokens';
import { Stack, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FieldReadPanel } from '../components/FieldRead';
import { Ground } from '../components/Ground';
import { OptionCard } from '../components/OptionCard';
import { Card, Chip, Pill, SectionLabel } from '../components/primitives';
import { recordDecision } from '../lib/decisionLog';
import { useDraft } from '../lib/draftStore';

/**
 * Step 3: the analysis, and the commitment.
 *
 * Everything on this screen is **computed** — the relation graph, the geometry
 * and the rules engine. No model, no network, no key. See docs/DECISIONS.md.
 *
 * It shows options with trade-offs and asks the user to commit. It never
 * nominates a best (§0).
 */
export default function Analysis() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { role, draft } = useDraft();

  const base = useMemo(() => createScenario(draft), [draft]);

  const [field, setField] = useState<FieldSetting | null>(null);
  const [activeFielderId, setActiveFielderId] = useState<string | null>(null);
  const workingField = useMemo<FieldSetting>(() => field ?? base.field, [field, base]);
  const scenario = useMemo(() => ({ ...base, field: workingField }), [base, workingField]);

  const openedAt = useRef<number | null>(null);
  useEffect(() => {
    openedAt.current = Date.now();
  }, []);

  const [shot, setShot] = useState<BatterOption | null>(null);
  const [length, setLength] = useState<Length | null>(null);
  const [line, setLine] = useState<Line | null>(null);
  const [intent, setIntent] = useState<Intent | null>(null);
  const [committed, setCommitted] = useState(false);

  const moveFielder = useCallback((fielderId: string, to: Vec2) => {
    setField((current) => {
      const source = current ?? base.field;
      return {
        fielders: source.fielders.map((f) =>
          f.id === fielderId ? { ...f, at: to, positionId: nearestCanonicalPosition(to).id } : f,
        ),
      };
    });
  }, [base]);

  const violations = useMemo(
    () =>
      evaluateField(
        {
          format: scenario.format,
          over: scenario.over,
          strikerHandedness: scenario.striker.handedness,
        },
        workingField,
      ),
    [scenario, workingField],
  );

  const read = useMemo(() => readField(workingField), [workingField]);
  const options = useMemo(() => batterOptions(scenario), [scenario]);
  const execution = useMemo(() => bowlerRead(scenario), [scenario]);

  const gaps = useMemo(() => {
    if (!length || !line) return [];
    return coherenceGaps(length, line, workingField.fielders.map((f) => f.positionId));
  }, [workingField, length, line]);

  const ready =
    role === 'BOWLER' ? length !== null && line !== null && intent !== null : shot !== null;

  const commit = () => {
    if (!ready) return;
    const started = openedAt.current ?? Date.now();
    recordDecision({
      id: `custom-${started}`,
      scenarioHash: hashScenario(scenario),
      role,
      decision:
        role === 'BOWLER'
          ? {
              role: 'BOWLER',
              delivery: {
                length: length!,
                line: line!,
                variation: 'stock',
                targetSpeedKph: scenario.bowler.avgSpeedKph,
              },
              fieldChanges: [],
              intent: intent!,
              confidence: 3,
            }
          : {
              role: 'BATTER',
              shot: shot!.shot,
              targetZone: shot!.targetZone,
              risk: shot!.risk,
              intent: 'attack',
            },
      suggestionsShown: [],
      msToDecide: Date.now() - started,
      createdAt: new Date().toISOString(),
      schemaVersion: 1,
    });
    setCommitted(true);
  };

  const groundSize = Math.min(width - 24, 400);
  const chase = chaseLabel(scenario);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: semantic.screen }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 48 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 10,
          }}
        >
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Back to the builder"
            style={{ minHeight: 44, justifyContent: 'center', paddingRight: 16 }}
          >
            <Text
              style={{ color: color.chalk400, fontFamily: 'InterTight_500Medium', fontSize: 15 }}
            >
              ‹ Edit situation
            </Text>
          </Pressable>
          <Pill
            text={role === 'BOWLER' ? 'BOWLING' : 'BATTING'}
            tint={semantic.accent}
            background="rgba(163,43,43,0.16)"
          />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 8, paddingHorizontal: 4 }}>
          <Text
            style={{
              color: color.chalk100,
              fontFamily: 'Archivo_700Bold',
              fontSize: 52,
              letterSpacing: -1.4,
            }}
          >
            {String(scenario.score)}
          </Text>
          <Text
            style={{
              color: color.chalk400,
              fontFamily: 'Archivo_700Bold',
              fontSize: 52,
              letterSpacing: -1.4,
            }}
          >
            {`/${scenario.wicketsLost}`}
          </Text>
          <Text
            style={{
              color: color.chalk400,
              fontFamily: 'IBMPlexMono_400Regular',
              fontSize: 15,
              marginLeft: 12,
            }}
          >
            {overBallLabel(scenario)}
          </Text>
        </View>
        {chase && (
          <Text
            style={{
              color: semantic.warning,
              fontFamily: 'IBMPlexMono_500Medium',
              fontSize: 16,
              paddingHorizontal: 4,
            }}
          >
            {chase}
          </Text>
        )}

        <SectionLabel>The field — drag anyone</SectionLabel>
        <View style={{ alignItems: 'center' }}>
          <Ground
            field={workingField}
            ground={scenario.ground}
            handedness={scenario.striker.handedness}
            violations={violations}
            size={groundSize}
            activeFielderId={activeFielderId}
            onMoveFielder={moveFielder}
            onActiveChange={setActiveFielderId}
          />
        </View>

        <View style={{ paddingHorizontal: 4, marginTop: 6 }}>
          {violations.length === 0 ? (
            <Pill text="FIELD LEGAL" tint={semantic.legal} background="rgba(62,122,94,0.16)" />
          ) : (
            violations.map((v) => (
              <Card
                key={v.restrictionId}
                style={{
                  backgroundColor: 'rgba(224,163,74,0.12)',
                  borderColor: 'rgba(224,163,74,0.35)',
                  marginBottom: 6,
                  padding: 11,
                }}
              >
                <Text
                  style={{
                    color: semantic.warning,
                    fontFamily: 'InterTight_600SemiBold',
                    fontSize: 13,
                  }}
                >
                  {v.message}
                </Text>
              </Card>
            ))
          )}
        </View>

        <SectionLabel>What the field says</SectionLabel>
        <FieldReadPanel read={read} />

        {role === 'BATTER' ? (
          <View style={{ marginTop: 18 }}>
            <SectionLabel tight>Your options</SectionLabel>
            {options.length === 0 ? (
              <Card>
                <Text
                  style={{
                    color: color.chalk100,
                    fontFamily: 'InterTight_400Regular',
                    fontSize: 14,
                    lineHeight: 20,
                  }}
                >
                  Every boundary is guarded. There is no free option here — you are choosing
                  between ones and taking the bowler on.
                </Text>
              </Card>
            ) : (
              <>
                <Text
                  style={{
                    color: color.chalk400,
                    fontFamily: 'InterTight_400Regular',
                    fontSize: 13,
                    lineHeight: 19,
                    marginBottom: 12,
                  }}
                >
                  Low to high risk. None is marked best — that is your call to make and justify.
                </Text>
                {options.map((option) => (
                  <OptionCard
                    key={`${option.shot}-${option.targetZone}`}
                    option={option}
                    selected={shot?.shot === option.shot}
                    onPress={() => setShot(option)}
                  />
                ))}
              </>
            )}
          </View>
        ) : (
          <View style={{ marginTop: 12 }}>
            <Card style={{ marginBottom: 12 }}>
              <Text
                style={{
                  color: execution.precisionViable ? color.chalk100 : semantic.warning,
                  fontFamily: 'InterTight_400Regular',
                  fontSize: 13.5,
                  lineHeight: 19,
                }}
              >
                {execution.executionNote}
              </Text>
            </Card>

            <SectionLabel tight>Length</SectionLabel>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {LENGTHS.map((l) => (
                <Chip
                  key={l}
                  label={LENGTH_LABELS[l]}
                  selected={length === l}
                  onPress={() => setLength(l)}
                />
              ))}
            </View>

            <SectionLabel tight>Line</SectionLabel>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {LINES.map((l) => (
                <Chip
                  key={l}
                  label={LINE_LABELS[l]}
                  selected={line === l}
                  onPress={() => setLine(l)}
                />
              ))}
            </View>

            <SectionLabel tight>Intent</SectionLabel>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {INTENTS.map((i) => (
                <Chip
                  key={i}
                  label={INTENT_LABELS[i]}
                  selected={intent === i}
                  onPress={() => setIntent(i)}
                />
              ))}
            </View>

            {gaps.length > 0 && (
              <Card
                style={{
                  backgroundColor: 'rgba(224,163,74,0.1)',
                  borderColor: 'rgba(224,163,74,0.3)',
                  marginTop: 14,
                }}
              >
                <Text
                  style={{
                    color: semantic.warning,
                    fontFamily: 'InterTight_600SemiBold',
                    fontSize: 13,
                    lineHeight: 19,
                  }}
                >
                  {`This ball invites ${gaps.map((g) => ZONE_LABELS[g.zone]).join(', ')} — nobody there.`}
                </Text>
                <Text
                  style={{
                    color: color.chalk400,
                    fontFamily: 'InterTight_400Regular',
                    fontSize: 12,
                    marginTop: 4,
                  }}
                >
                  Advisory only. Bowl it anyway if that is the plan.
                </Text>
              </Card>
            )}
          </View>
        )}

        <Pressable
          onPress={commit}
          disabled={!ready || committed}
          accessibilityRole="button"
          accessibilityLabel="Commit this decision"
          style={{
            marginTop: 20,
            minHeight: 54,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: committed ? semantic.legal : ready ? semantic.accent : color.ink700,
          }}
        >
          <Text
            style={{
              color: ready || committed ? color.chalk100 : color.chalk400,
              fontFamily: 'InterTight_600SemiBold',
              fontSize: 16,
            }}
          >
            {committed
              ? 'Logged ✓'
              : ready
                ? 'Commit'
                : role === 'BOWLER'
                  ? 'Pick length, line and intent'
                  : 'Pick a shot'}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

export { ErrorReport as ErrorBoundary } from '../components/ErrorReport';

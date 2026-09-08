import {
  ARCHETYPE_LABELS,
  BOWLER_TYPE_LABELS,
  INTENTS,
  INTENT_LABELS,
  LENGTHS,
  LENGTH_LABELS,
  LINES,
  LINE_LABELS,
  PHASE_LABELS,
  PITCH_LABELS,
  PRESET_PROMPTS,
  ZONE_LABELS,
  batterOptions,
  bowlerRead,
  chaseLabel,
  coherenceGaps,
  evaluateField,
  hashScenario,
  overBallLabel,
  phase,
  nearestCanonicalPosition,
  presetById,
  pressureIndex,
  readField,
  type BatterOption,
  type FieldSetting,
  type Intent,
  type Length,
  type Line,
  type Vec2,
} from '@cricket/domain';
import { color, semantic } from '@cricket/tokens';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Ground } from '../../components/Ground';
import { OverTape } from '../../components/OverTape';
import { FieldReadPanel } from '../../components/FieldRead';
import { OptionCard } from '../../components/OptionCard';
import { Card, Chip, Meter, Pill, SectionLabel, StatCell, StatGrid } from '../../components/primitives';
import { recordDecision } from '../../lib/decisionLog';

/**
 * The decision screen (BUILD.md §5, M5).
 *
 * Scenario summary, top-down field, bowler and batter cards, conditions, Over
 * Tape — then "What would you do?" with chips and selectors only.
 *
 * Primary actions live in the bottom third. Nothing important above the thumb
 * line (§5).
 */

export default function DecisionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();

  /**
   * Stamped in an effect, not during render. `Date.now()` in a render body is
   * impure — React may re-render at will, and §5 requires `msToDecide` to be
   * accurate. Measuring from first paint is also the more honest start point:
   * the clock begins when the user can actually see the scenario.
   */
  const openedAt = useRef<number | null>(null);
  useEffect(() => {
    openedAt.current = Date.now();
  }, []);

  const scenario = presetById(id ?? '');

  /**
   * The field is editable (§4 M4): drags mutate a local copy, and every
   * restriction is re-evaluated on the next render. The user is never blocked
   * from an illegal placement — they are told what is illegal and why (§7).
   */
  const [field, setField] = useState<FieldSetting | null>(null);
  const [activeFielderId, setActiveFielderId] = useState<string | null>(null);
  // Memoised: a fresh object literal each render would invalidate every
  // downstream useMemo, re-running the rules engine on every keystroke.
  const workingField = useMemo<FieldSetting>(
    () => field ?? scenario?.field ?? { fielders: [] },
    [field, scenario],
  );

  const moveFielder = useCallback((fielderId: string, to: Vec2) => {
    setField((current) => {
      const base = current ?? scenario?.field;
      if (!base) return current;
      return {
        fielders: base.fielders.map((f) =>
          f.id === fielderId
            ? { ...f, at: to, positionId: nearestCanonicalPosition(to).id }
            : f,
        ),
      };
    });
  }, [scenario]);

  /**
   * Which side of the ball you are on. The Decision union (§9) has always had
   * both roles; this is where the app finally offers the choice.
   */
  const [role, setRole] = useState<'BOWLER' | 'BATTER'>('BOWLER');
  const [shot, setShot] = useState<BatterOption | null>(null);

  const [length, setLength] = useState<Length | null>(null);
  const [line, setLine] = useState<Line | null>(null);
  const [intent, setIntent] = useState<Intent | null>(null);
  const [committed, setCommitted] = useState(false);

  const violations = useMemo(
    () =>
      scenario
        ? evaluateField(
            {
              format: scenario.format,
              over: scenario.over,
              strikerHandedness: scenario.striker.handedness,
              superOver: scenario.superOver,
            },
            workingField,
          )
        : [],
    [scenario, workingField],
  );

  const read = useMemo(
    () => readField(workingField),
    [workingField],
  );

  const options = useMemo(
    () => (scenario ? batterOptions({ ...scenario, field: workingField }) : []),
    [scenario, workingField],
  );

  const execution = useMemo(() => (scenario ? bowlerRead(scenario) : null), [scenario]);

  const gaps = useMemo(() => {
    if (!scenario || !length || !line) return [];
    return coherenceGaps(
      length,
      line,
      workingField.fielders.map((f) => f.positionId),
    );
  }, [scenario, workingField, length, line]);

  if (!scenario) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: semantic.screen, padding: 20 }}>
        <Text style={{ color: color.chalk100, fontFamily: 'InterTight_400Regular' }}>
          No scenario called “{id}”.
        </Text>
      </SafeAreaView>
    );
  }

  const groundSize = Math.min(width - 24, 400);
  const chase = chaseLabel(scenario);
  const ready =
    role === 'BOWLER' ? length !== null && line !== null && intent !== null : shot !== null;
  const shaky = scenario.bowler.executionReliability < 50;

  const commit = () => {
    if (!ready) return;
    const started = openedAt.current ?? Date.now();
    recordDecision({
      id: `${scenario.id}-${started}`,
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: semantic.screen }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 48 }}>
        {/* ---- header ---------------------------------------------------- */}
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
            accessibilityLabel="Back to scenarios"
            style={{ minHeight: 44, justifyContent: 'center', paddingRight: 16 }}
          >
            <Text
              style={{ color: color.chalk400, fontFamily: 'InterTight_500Medium', fontSize: 15 }}
            >
              ‹ Scenarios
            </Text>
          </Pressable>
          <Pill
            text={PHASE_LABELS[phase(scenario)].toUpperCase()}
            tint={semantic.warning}
            background="rgba(224,163,74,0.12)"
          />
        </View>

        {/* ---- the hero -------------------------------------------------- */}
        <View style={{ paddingHorizontal: 4 }}>
          <Text
            style={{
              color: color.chalk400,
              fontFamily: 'InterTight_500Medium',
              fontSize: 13,
              marginTop: 10,
            }}
          >
            {scenario.title}
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 2 }}>
            <Text
              style={{
                color: color.chalk100,
                fontFamily: 'Archivo_700Bold',
                fontSize: 56,
                letterSpacing: -1.5,
              }}
              accessibilityLabel={`${scenario.score} for ${scenario.wicketsLost}`}
            >
              {String(scenario.score)}
            </Text>
            <Text
              style={{
                color: color.chalk400,
                fontFamily: 'Archivo_700Bold',
                fontSize: 56,
                letterSpacing: -1.5,
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
                fontSize: 17,
                marginTop: -4,
              }}
            >
              {chase}
            </Text>
          )}

          <View style={{ marginTop: 12, marginBottom: 2 }}>
            <Meter value={pressureIndex(scenario)} tint={semantic.warning} label="Pressure" />
          </View>

          {PRESET_PROMPTS[scenario.id] && (
            <Text
              style={{
                color: color.chalk400,
                fontFamily: 'InterTight_400Regular',
                fontSize: 14,
                lineHeight: 20,
                marginTop: 10,
              }}
            >
              {PRESET_PROMPTS[scenario.id]}
            </Text>
          )}
        </View>

        {/* ---- Over Tape ------------------------------------------------- */}
        <SectionLabel tight>{`Last ${scenario.lastDeliveries.length} balls`}</SectionLabel>
        <OverTape deliveries={scenario.lastDeliveries} />

        {/* ---- the ground ------------------------------------------------ */}
        <SectionLabel>The field</SectionLabel>
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
            <Pill
              text="FIELD LEGAL"
              tint={semantic.legal}
              background="rgba(62,122,94,0.16)"
            />
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
                <Text
                  style={{
                    color: color.chalk400,
                    fontFamily: 'IBMPlexMono_400Regular',
                    fontSize: 9.5,
                    marginTop: 4,
                  }}
                >
                  {v.verified ? v.citation : `${v.citation} · UNVERIFIED`}
                </Text>
              </Card>
            ))
          )}
        </View>

        {/* ---- match state ----------------------------------------------- */}
        <SectionLabel>Bowler</SectionLabel>
        <StatGrid>
          <StatCell label="Type" value={BOWLER_TYPE_LABELS[scenario.bowler.type]} />
          <StatCell label="Speed" value={`${scenario.bowler.avgSpeedKph}`} hint="kph" />
          <StatCell
            label="Execution"
            value={String(scenario.bowler.executionReliability)}
            accent={shaky}
            hint={shaky ? 'unreliable' : 'dependable'}
          />
        </StatGrid>

        <SectionLabel tight>Striker</SectionLabel>
        <StatGrid>
          <StatCell
            label="Batter"
            value={ARCHETYPE_LABELS[scenario.striker.archetype]}
            hint={scenario.striker.handedness}
          />
          <StatCell
            label="Score"
            value={`${scenario.striker.runs} (${scenario.striker.ballsFaced})`}
          />
          <StatCell label="Aggression" value={String(scenario.striker.aggression)} />
        </StatGrid>

        <SectionLabel tight>Conditions</SectionLabel>
        <StatGrid>
          <StatCell label="Pitch" value={PITCH_LABELS[scenario.pitch]} />
          <StatCell label="Ball" value={`${scenario.ballAgeOvers.toFixed(1)}`} hint="overs old" />
          <StatCell
            label="Ground"
            value={`${scenario.ground.straightM}/${scenario.ground.squareM}`}
            hint="straight / square"
          />
        </StatGrid>

        {/* ---- the decision ---------------------------------------------- */}
        <SectionLabel>What would you do?</SectionLabel>

        {/* Role switch. Both roles were always in the Decision union (§9). */}
        <View style={{ flexDirection: 'row', marginBottom: 4 }}>
          {(['BOWLER', 'BATTER'] as const).map((r) => (
            <Pressable
              key={r}
              onPress={() => setRole(r)}
              accessibilityRole="button"
              accessibilityState={{ selected: role === r }}
              accessibilityLabel={`Answer as the ${r.toLowerCase()}`}
              style={{
                flex: 1,
                minHeight: 46,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: role === r ? color.ink700 : 'transparent',
                borderWidth: 1,
                borderColor: role === r ? semantic.accent : color.ink500,
                borderRadius: 10,
                marginRight: r === 'BOWLER' ? 8 : 0,
              }}
            >
              <Text
                style={{
                  color: role === r ? color.chalk100 : color.chalk400,
                  fontFamily: role === r ? 'InterTight_600SemiBold' : 'InterTight_400Regular',
                  fontSize: 15,
                }}
              >
                {r === 'BOWLER' ? "I'm bowling" : "I'm batting"}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* What the field says. Computed from the relation graph and the
            geometry — no model is involved anywhere on this screen. */}
        <View style={{ marginTop: 12 }}>
          <FieldReadPanel read={read} />
        </View>

        {role === 'BATTER' ? (
          <View style={{ marginTop: 14 }}>
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
                  Three defensible options, low to high risk. None of them is marked best —
                  that is your call to make and justify.
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
          <>
            {execution && (
              <Card style={{ marginTop: 14, marginBottom: 4 }}>
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
            )}

            <ChipGroup title="Length">
              {LENGTHS.map((l) => (
                <Chip
                  key={l}
                  label={LENGTH_LABELS[l]}
                  selected={length === l}
                  onPress={() => setLength(l)}
                />
              ))}
            </ChipGroup>

            <ChipGroup title="Line">
              {LINES.map((l) => (
                <Chip
                  key={l}
                  label={LINE_LABELS[l]}
                  selected={line === l}
                  onPress={() => setLine(l)}
                />
              ))}
            </ChipGroup>

            <ChipGroup title="Intent">
              {INTENTS.map((i) => (
                <Chip
                  key={i}
                  label={INTENT_LABELS[i]}
                  selected={intent === i}
                  onPress={() => setIntent(i)}
                />
              ))}
            </ChipGroup>

            {/* Non-blocking coherence advisory (§6). */}
            {gaps.length > 0 && (
              <Card
                style={{
                  backgroundColor: 'rgba(224,163,74,0.1)',
                  borderColor: 'rgba(224,163,74,0.3)',
                  marginTop: 12,
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
          </>
        )}

        {/* Primary action, bottom third. */}
        <Pressable
          onPress={commit}
          disabled={!ready || committed}
          accessibilityRole="button"
          accessibilityLabel="Commit this decision"
          style={{
            marginTop: 18,
            minHeight: 54,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: committed ? semantic.legal : ready ? semantic.accent : color.ink700,
            borderWidth: 1,
            borderColor: committed ? semantic.legal : ready ? semantic.accent : color.ink500,
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

        {committed && (
          <Text
            style={{
              color: color.chalk400,
              fontFamily: 'InterTight_400Regular',
              fontSize: 13,
              marginTop: 12,
              lineHeight: 20,
              paddingHorizontal: 4,
            }}
          >
            Nothing tells you whether you were right — that is deliberate. Your call is logged so
            that when an answer does arrive, it can be checked against what people actually chose.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ChipGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 6 }}>
      <Text
        style={{
          color: color.chalk400,
          fontFamily: 'IBMPlexMono_400Regular',
          fontSize: 10,
          letterSpacing: 1.2,
          textTransform: 'uppercase',
          marginBottom: 8,
          marginTop: 6,
        }}
      >
        {title}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{children}</View>
    </View>
  );
}

export { ErrorReport as ErrorBoundary } from '../../components/ErrorReport';

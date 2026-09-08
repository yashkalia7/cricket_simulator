import {
  ARCHETYPES,
  ARCHETYPE_LABELS,
  BOWLER_TYPES,
  BOWLER_TYPE_LABELS,
  FIELD_TEMPLATES,
  FORMATS,
  FORMAT_LABELS,
  HANDEDNESS,
  createScenario,
  evaluateField,
  phase,
  PHASE_LABELS,
  type FieldTemplateId,
} from '@cricket/domain';
import { color, semantic } from '@cricket/tokens';
import { Stack, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card, Chip, SectionLabel } from '../components/primitives';
import { useDraft } from '../lib/draftStore';

/**
 * Step 2: describe the situation.
 *
 * §3 M3: **zero free-text inputs.** Segmented controls, chips and steppers
 * only — a scenario has to be describable with one thumb.
 *
 * Only the fields that change the answer are here. Everything else takes a
 * defensible default in `createScenario`.
 */

function Stepper({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (next: number) => void;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
}) {
  const clamp = (n: number) => Math.max(min, Math.min(max, n));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
      <Text
        style={{
          color: color.chalk400,
          fontFamily: 'InterTight_400Regular',
          fontSize: 14,
          flex: 1,
        }}
      >
        {label}
      </Text>
      <Pressable
        onPress={() => onChange(clamp(value - step))}
        accessibilityRole="button"
        accessibilityLabel={`Decrease ${label}`}
        style={{
          width: 44,
          height: 44,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 10,
          backgroundColor: color.ink700,
          borderWidth: 1,
          borderColor: color.ink500,
        }}
      >
        <Text style={{ color: color.chalk100, fontSize: 20, fontFamily: 'InterTight_500Medium' }}>
          −
        </Text>
      </Pressable>
      <Text
        style={{
          color: color.chalk100,
          fontFamily: 'IBMPlexMono_500Medium',
          fontSize: 16,
          minWidth: 62,
          textAlign: 'center',
        }}
      >
        {`${value}${suffix ?? ''}`}
      </Text>
      <Pressable
        onPress={() => onChange(clamp(value + step))}
        accessibilityRole="button"
        accessibilityLabel={`Increase ${label}`}
        style={{
          width: 44,
          height: 44,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 10,
          backgroundColor: color.ink700,
          borderWidth: 1,
          borderColor: color.ink500,
        }}
      >
        <Text style={{ color: color.chalk100, fontSize: 20, fontFamily: 'InterTight_500Medium' }}>
          +
        </Text>
      </Pressable>
    </View>
  );
}

export default function BuildScenario() {
  const router = useRouter();
  const { role, draft, patch } = useDraft();

  // Live preview: the situation as it stands, and whether the field is legal.
  const scenario = useMemo(() => createScenario(draft), [draft]);
  const violations = useMemo(
    () =>
      evaluateField(
        {
          format: scenario.format,
          over: scenario.over,
          strikerHandedness: scenario.striker.handedness,
        },
        scenario.field,
      ),
    [scenario],
  );

  const chasing = draft.target !== null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: semantic.screen }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
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
            accessibilityLabel="Back"
            style={{ minHeight: 44, justifyContent: 'center', paddingRight: 16 }}
          >
            <Text
              style={{ color: color.chalk400, fontFamily: 'InterTight_500Medium', fontSize: 15 }}
            >
              ‹ Back
            </Text>
          </Pressable>
          <Text
            style={{
              color: semantic.accent,
              fontFamily: 'IBMPlexMono_500Medium',
              fontSize: 11,
              letterSpacing: 1.2,
            }}
          >
            {role === 'BOWLER' ? 'BOWLING' : 'BATTING'}
          </Text>
        </View>

        <Text
          style={{
            color: color.chalk100,
            fontFamily: 'Archivo_700Bold',
            fontSize: 30,
            marginTop: 8,
            letterSpacing: -0.7,
          }}
        >
          Your situation
        </Text>

        {/* Live summary so the choices below always have a consequence. */}
        <Card style={{ marginTop: 14 }}>
          <Text
            style={{ color: color.chalk100, fontFamily: 'Archivo_700Bold', fontSize: 28 }}
          >
            {`${draft.score}/${draft.wicketsLost}`}
            <Text style={{ color: color.chalk400, fontSize: 16 }}>
              {`   ${draft.over}.${draft.ball}`}
            </Text>
          </Text>
          <Text
            style={{
              color: semantic.warning,
              fontFamily: 'IBMPlexMono_500Medium',
              fontSize: 14,
              marginTop: 4,
            }}
          >
            {chasing
              ? `${Math.max(0, draft.target! - draft.score)} needed off ${scenario.ballsRemaining ?? 0}`
              : `${FORMAT_LABELS[draft.format]} · ${PHASE_LABELS[phase(scenario)]}`}
          </Text>
          {violations.length > 0 && (
            <Text
              style={{
                color: semantic.warning,
                fontFamily: 'InterTight_500Medium',
                fontSize: 12.5,
                marginTop: 8,
                lineHeight: 18,
              }}
            >
              {violations[0]!.message}
            </Text>
          )}
        </Card>

        {/* ---- match ------------------------------------------------------ */}
        <SectionLabel>Match</SectionLabel>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {FORMATS.map((f) => (
            <Chip
              key={f}
              label={FORMAT_LABELS[f]}
              selected={draft.format === f}
              onPress={() => patch({ format: f })}
            />
          ))}
        </View>

        <View style={{ marginTop: 10 }}>
          <Stepper
            label="Over"
            value={draft.over}
            min={0}
            max={draft.format === 'T20' ? 19 : draft.format === 'ODI' ? 49 : 120}
            onChange={(over) => patch({ over })}
          />
          <Stepper
            label="Ball"
            value={draft.ball}
            min={1}
            max={6}
            onChange={(ball) => patch({ ball: ball as 1 | 2 | 3 | 4 | 5 | 6 })}
          />
          <Stepper
            label="Score"
            value={draft.score}
            min={0}
            max={600}
            step={1}
            onChange={(score) => patch({ score })}
          />
          <Stepper
            label="Wickets down"
            value={draft.wicketsLost}
            min={0}
            max={9}
            onChange={(wicketsLost) => patch({ wicketsLost })}
          />
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 }}>
          <Chip
            label="Chasing"
            selected={chasing}
            onPress={() => patch({ target: draft.score + 30 })}
          />
          <Chip
            label="Batting first"
            selected={!chasing}
            onPress={() => patch({ target: null })}
          />
        </View>
        {chasing && (
          <Stepper
            label="Target"
            value={draft.target ?? 0}
            min={draft.score + 1}
            max={700}
            onChange={(target) => patch({ target })}
          />
        )}

        {/* ---- bowler ----------------------------------------------------- */}
        <SectionLabel>The bowler</SectionLabel>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {BOWLER_TYPES.map((t) => (
            <Chip
              key={t}
              label={BOWLER_TYPE_LABELS[t]}
              selected={draft.bowlerType === t}
              onPress={() => patch({ bowlerType: t })}
            />
          ))}
        </View>

        <Text
          style={{
            color: color.chalk400,
            fontFamily: 'InterTight_400Regular',
            fontSize: 13,
            lineHeight: 19,
            marginTop: 10,
            marginBottom: 4,
          }}
        >
          How reliably does he land it? Below 50 a yorker is a hope, not a plan.
        </Text>
        <Stepper
          label="Execution"
          value={draft.executionReliability}
          min={0}
          max={100}
          step={5}
          onChange={(executionReliability) => patch({ executionReliability })}
        />

        {/* ---- batter ----------------------------------------------------- */}
        <SectionLabel>The batter on strike</SectionLabel>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {HANDEDNESS.map((h) => (
            <Chip
              key={h}
              label={h === 'RHB' ? 'Right-hand' : 'Left-hand'}
              selected={draft.strikerHandedness === h}
              onPress={() => patch({ strikerHandedness: h })}
            />
          ))}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 }}>
          {ARCHETYPES.map((a) => (
            <Chip
              key={a}
              label={ARCHETYPE_LABELS[a]}
              selected={draft.strikerArchetype === a}
              onPress={() => patch({ strikerArchetype: a })}
            />
          ))}
        </View>
        <View style={{ marginTop: 8 }}>
          <Stepper
            label="His runs"
            value={draft.strikerRuns}
            min={0}
            max={300}
            onChange={(strikerRuns) => patch({ strikerRuns })}
          />
          <Stepper
            label="Balls faced"
            value={draft.strikerBalls}
            min={0}
            max={400}
            onChange={(strikerBalls) => patch({ strikerBalls })}
          />
        </View>

        {/* ---- field ------------------------------------------------------ */}
        <SectionLabel>The field</SectionLabel>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {(Object.keys(FIELD_TEMPLATES) as FieldTemplateId[]).map((id) => (
            <Chip
              key={id}
              label={FIELD_TEMPLATES[id].label}
              selected={draft.fieldTemplate === id}
              onPress={() => patch({ fieldTemplate: id })}
            />
          ))}
        </View>
        <Text
          style={{
            color: color.chalk400,
            fontFamily: 'InterTight_400Regular',
            fontSize: 12.5,
            marginTop: 6,
          }}
        >
          You can drag any fielder on the next screen.
        </Text>

        <SectionLabel>The ground</SectionLabel>
        <Stepper
          label="Straight boundary"
          value={draft.straightM}
          min={50}
          max={90}
          step={2}
          suffix="m"
          onChange={(straightM) => patch({ straightM })}
        />
        <Stepper
          label="Square boundary"
          value={draft.squareM}
          min={45}
          max={90}
          step={2}
          suffix="m"
          onChange={(squareM) => patch({ squareM })}
        />

        <Pressable
          onPress={() => router.push('/analysis')}
          accessibilityRole="button"
          accessibilityLabel="See the analysis for this situation"
          style={{
            marginTop: 26,
            minHeight: 54,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: semantic.accent,
          }}
        >
          <Text
            style={{
              color: color.chalk100,
              fontFamily: 'InterTight_600SemiBold',
              fontSize: 16,
            }}
          >
            {role === 'BOWLER' ? 'What should I bowl?' : 'Where are the gaps?'}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

export { ErrorReport as ErrorBoundary } from '../components/ErrorReport';

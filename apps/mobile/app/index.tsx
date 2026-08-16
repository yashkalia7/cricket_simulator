import {
  FORMAT_LABELS,
  PRESETS,
  PRESET_PROMPTS,
  chaseLabel,
  overBallLabel,
  phase,
  PHASE_LABELS,
  scoreLabel,
  type ScenarioState,
} from '@cricket/domain';
import { color, semantic } from '@cricket/tokens';
import { Link } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * Preset picker (BUILD.md §3, M3).
 *
 * "Preset picker first. Six named scenarios as full-bleed cards. Most users
 * start and stop here."
 *
 * Zero free-text inputs anywhere in this flow.
 */

function PresetCard({ scenario }: { scenario: ScenarioState }) {
  const chase = chaseLabel(scenario);
  const prompt = PRESET_PROMPTS[scenario.id];

  return (
    <Link href={{ pathname: '/scenario/[id]', params: { id: scenario.id } }} asChild>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${scenario.title}. ${scoreLabel(scenario)} after ${overBallLabel(scenario)}. ${prompt ?? ''}`}
        style={({ pressed }) => ({
          backgroundColor: semantic.card,
          borderRadius: 16,
          padding: 16,
          marginBottom: 12,
          borderWidth: 1,
          borderColor: pressed ? semantic.accent : color.ink500,
          opacity: pressed ? 0.92 : 1,
        })}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text
            style={{
              color: color.chalk400,
              fontFamily: 'IBMPlexMono_500Medium',
              fontSize: 11,
              letterSpacing: 1.2,
            }}
          >
            {`${FORMAT_LABELS[scenario.format].toUpperCase()} · ${PHASE_LABELS[phase(scenario)].toUpperCase()}`}
          </Text>
          <Text
            style={{
              color: color.chalk400,
              fontFamily: 'IBMPlexMono_400Regular',
              fontSize: 12,
            }}
          >
            {overBallLabel(scenario)}
          </Text>
        </View>

        <Text
          style={{
            color: color.chalk100,
            fontFamily: 'Archivo_700Bold',
            fontSize: 22,
            marginTop: 10,
            letterSpacing: -0.4,
          }}
        >
          {scenario.title}
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 8 }}>
          <Text
            style={{
              color: color.chalk100,
              fontFamily: 'Archivo_700Bold',
              fontSize: 32,
              letterSpacing: -1,
            }}
          >
            {String(scenario.score)}
          </Text>
          <Text
            style={{
              color: color.chalk400,
              fontFamily: 'Archivo_700Bold',
              fontSize: 32,
              letterSpacing: -1,
            }}
          >
            {`/${scenario.wicketsLost}`}
          </Text>
          {chase && (
            <Text
              style={{
                color: semantic.warning,
                fontFamily: 'IBMPlexMono_500Medium',
                fontSize: 13,
                marginLeft: 12,
              }}
            >
              {chase}
            </Text>
          )}
        </View>

        {prompt && (
          <Text
            style={{
              color: color.chalk400,
              fontFamily: 'InterTight_400Regular',
              fontSize: 14,
              lineHeight: 20,
              marginTop: 10,
            }}
          >
            {prompt}
          </Text>
        )}
      </Pressable>
    </Link>
  );
}

export default function PresetPicker() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: semantic.screen }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}>
        <Text
          style={{
            color: color.chalk100,
            fontFamily: 'Archivo_700Bold',
            fontSize: 32,
            marginTop: 20,
            letterSpacing: -0.8,
          }}
        >
          Pick a situation
        </Text>
        <Text
          style={{
            color: color.chalk400,
            fontFamily: 'InterTight_400Regular',
            fontSize: 15,
            lineHeight: 22,
            marginTop: 6,
            marginBottom: 20,
          }}
        >
          Six real match states. Read it, commit to a call, see the trade-off.
        </Text>

        {PRESETS.map((scenario) => (
          <PresetCard key={scenario.id} scenario={scenario} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

export { ErrorReport as ErrorBoundary } from '../components/ErrorReport';

import { color, semantic } from '@cricket/tokens';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useDraft, type UserRole } from '../lib/draftStore';

/**
 * Step 1 of the flow: which side of the ball are you on?
 *
 *   role → build the situation → read the field → commit
 *
 * The role comes first because it changes what the next screen asks for and
 * what the answer looks like. A bowler picks a ball; a batter picks a shot.
 */

const ROLES: { role: UserRole; title: string; blurb: string }[] = [
  {
    role: 'BOWLER',
    title: "I'm bowling",
    blurb: 'Set the field, choose the ball, and see what it leaves open.',
  },
  {
    role: 'BATTER',
    title: "I'm batting",
    blurb: 'Read where the gaps are, and pick a shot worth the risk.',
  },
];

export default function RolePicker() {
  const router = useRouter();
  const setRole = useDraft((s) => s.setRole);

  const choose = (role: UserRole) => {
    setRole(role);
    router.push('/build');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: semantic.screen }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}>
        <Text
          style={{
            color: color.chalk100,
            fontFamily: 'Archivo_700Bold',
            fontSize: 34,
            marginTop: 28,
            letterSpacing: -0.9,
          }}
        >
          Cricket Tactical{'\n'}Simulator
        </Text>
        <Text
          style={{
            color: color.chalk400,
            fontFamily: 'InterTight_400Regular',
            fontSize: 15,
            lineHeight: 22,
            marginTop: 10,
            marginBottom: 28,
          }}
        >
          Build the situation you are actually in, then commit to a call.
        </Text>

        <Text
          style={{
            color: color.chalk400,
            fontFamily: 'IBMPlexMono_500Medium',
            fontSize: 11,
            letterSpacing: 1.4,
            marginBottom: 12,
          }}
        >
          WHERE ARE YOU?
        </Text>

        {ROLES.map(({ role, title, blurb }) => (
          <Pressable
            key={role}
            onPress={() => choose(role)}
            accessibilityRole="button"
            accessibilityLabel={`${title}. ${blurb}`}
            style={({ pressed }) => ({
              backgroundColor: semantic.card,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: pressed ? semantic.accent : color.ink500,
              padding: 20,
              marginBottom: 14,
              minHeight: 110,
              justifyContent: 'center',
            })}
          >
            <Text
              style={{ color: color.chalk100, fontFamily: 'Archivo_700Bold', fontSize: 26 }}
            >
              {title}
            </Text>
            <Text
              style={{
                color: color.chalk400,
                fontFamily: 'InterTight_400Regular',
                fontSize: 14,
                lineHeight: 20,
                marginTop: 8,
              }}
            >
              {blurb}
            </Text>
          </Pressable>
        ))}

        <Pressable
          onPress={() => router.push('/presets')}
          accessibilityRole="button"
          accessibilityLabel="Start from a ready-made situation instead"
          style={{ minHeight: 44, justifyContent: 'center', marginTop: 10 }}
        >
          <Text
            style={{
              color: color.chalk400,
              fontFamily: 'InterTight_500Medium',
              fontSize: 14,
              textDecorationLine: 'underline',
            }}
          >
            Or start from a ready-made situation
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

export { ErrorReport as ErrorBoundary } from '../components/ErrorReport';

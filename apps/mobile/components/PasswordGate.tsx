import { color, semantic } from '@cricket/tokens';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ApiError, getSession, signIn } from '../lib/api';

/**
 * The landing gate.
 *
 * **This screen is not the security.** The bundle ships to the browser and the
 * repo is public, so anyone can read the API shape and call it directly. What
 * actually protects the OpenAI spend is the server refusing every `/api` route
 * without a valid session cookie — see apps/server/src/auth.ts.
 *
 * This is the polite front door on top of that lock.
 */
export function PasswordGate({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [who, setWho] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getSession()
      .then((s) => {
        if (!cancelled) setAuthenticated(s.authenticated);
      })
      .catch(() => {
        // Server unreachable — show the gate rather than letting the app
        // through, so a network failure never looks like a granted session.
        if (!cancelled) setAuthenticated(false);
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const submit = async () => {
    if (!password || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const session = await signIn(password, who);
      setAuthenticated(session.authenticated);
      setPassword('');
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 401
          ? 'That is not the password.'
          : 'Could not reach the server.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (checking) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: semantic.screen,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator color={color.chalk400} />
      </SafeAreaView>
    );
  }

  if (authenticated) return <>{children}</>;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: semantic.screen }}>
      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24 }}>
        <Text
          style={{
            color: color.chalk100,
            fontFamily: 'Archivo_700Bold',
            fontSize: 32,
            letterSpacing: -0.8,
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
          Private while it is being built. Ask Yash for the password.
        </Text>

        <Text
          style={{
            color: color.chalk400,
            fontFamily: 'IBMPlexMono_500Medium',
            fontSize: 10,
            letterSpacing: 1.2,
            marginBottom: 6,
          }}
        >
          YOUR NAME (OPTIONAL)
        </Text>
        <TextInput
          value={who}
          onChangeText={setWho}
          placeholder="so the log knows who decided"
          placeholderTextColor={color.ink500}
          autoCapitalize="none"
          accessibilityLabel="Your name"
          style={{
            backgroundColor: semantic.card,
            borderWidth: 1,
            borderColor: color.ink500,
            borderRadius: 10,
            paddingHorizontal: 14,
            minHeight: 48,
            color: color.chalk100,
            fontFamily: 'InterTight_400Regular',
            fontSize: 15,
            marginBottom: 16,
          }}
        />

        <Text
          style={{
            color: color.chalk400,
            fontFamily: 'IBMPlexMono_500Medium',
            fontSize: 10,
            letterSpacing: 1.2,
            marginBottom: 6,
          }}
        >
          PASSWORD
        </Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={submit}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="go"
          accessibilityLabel="Password"
          style={{
            backgroundColor: semantic.card,
            borderWidth: 1,
            borderColor: error ? semantic.warning : color.ink500,
            borderRadius: 10,
            paddingHorizontal: 14,
            minHeight: 48,
            color: color.chalk100,
            fontFamily: 'InterTight_400Regular',
            fontSize: 15,
          }}
        />

        {error && (
          <Text
            style={{
              color: semantic.warning,
              fontFamily: 'InterTight_400Regular',
              fontSize: 13,
              marginTop: 8,
            }}
          >
            {error}
          </Text>
        )}

        <Pressable
          onPress={submit}
          disabled={!password || submitting}
          accessibilityRole="button"
          accessibilityLabel="Enter"
          style={{
            marginTop: 20,
            minHeight: 52,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: password ? semantic.accent : color.ink700,
          }}
        >
          <Text
            style={{
              color: password ? color.chalk100 : color.chalk400,
              fontFamily: 'InterTight_600SemiBold',
              fontSize: 16,
            }}
          >
            {submitting ? 'Checking…' : 'Enter'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

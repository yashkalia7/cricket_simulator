import { Archivo_700Bold } from '@expo-google-fonts/archivo';
import { IBMPlexMono_400Regular, IBMPlexMono_500Medium } from '@expo-google-fonts/ibm-plex-mono';
import {
  InterTight_400Regular,
  InterTight_500Medium,
  InterTight_600SemiBold,
} from '@expo-google-fonts/inter-tight';
import { fontFamily } from '@cricket/tokens';
import type { FontSource } from 'expo-font';

/**
 * The three families of §5: Archivo (display), Inter Tight (body), IBM Plex
 * Mono (data).
 *
 * Display is Archivo **Bold at normal width**, not Archivo Expanded. See
 * docs/DECISIONS.md D-004 — the expanded width simply is not available to a
 * React Native app through @expo-google-fonts, and pretending otherwise would
 * have meant a font name that silently never resolves.
 */
export const FONT_MAP: Readonly<Record<string, FontSource>> = {
  [fontFamily.display]: Archivo_700Bold,
  [fontFamily.body]: InterTight_400Regular,
  [fontFamily.bodyMedium]: InterTight_500Medium,
  [fontFamily.bodySemiBold]: InterTight_600SemiBold,
  [fontFamily.mono]: IBMPlexMono_400Regular,
  [fontFamily.monoMedium]: IBMPlexMono_500Medium,
};

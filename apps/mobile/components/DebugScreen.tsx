import {
  color,
  fontFamily,
  fontSize,
  layout,
  motion,
  radius,
  semantic,
  space,
} from '@cricket/tokens';
import { DOMAIN_SCHEMA_VERSION } from '@cricket/domain';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FONT_MAP } from '../lib/fonts';

/**
 * M0 debug screen — the token and type audit.
 *
 * Acceptance criterion for M0 is that this renders every token swatch and all
 * three fonts at display/body/mono sizes **on a physical mid-range Android**.
 *
 * Deliberate design: swatches are coloured with NativeWind classes
 * (`bg-leather`) but *labelled* from the imported token object. If the Tailwind
 * wiring in tailwind.config.js is broken, a swatch renders untinted next to a
 * label claiming `#A32B2B` — the failure is visible rather than plausible.
 */

const RAW_SWATCHES = [
  { token: 'ink900', className: 'bg-ink900', hex: color.ink900, role: 'screen ground' },
  { token: 'ink800', className: 'bg-ink800', hex: color.ink800, role: 'raised surface' },
  { token: 'ink700', className: 'bg-ink700', hex: color.ink700, role: 'card' },
  { token: 'ink500', className: 'bg-ink500', hex: color.ink500, role: 'hairline / divider' },
  { token: 'chalk100', className: 'bg-chalk100', hex: color.chalk100, role: 'primary text' },
  { token: 'chalk400', className: 'bg-chalk400', hex: color.chalk400, role: 'secondary text' },
  { token: 'leather', className: 'bg-leather', hex: color.leather, role: 'primary accent' },
  { token: 'sodium', className: 'bg-sodium', hex: color.sodium, role: 'violations, warnings' },
  { token: 'turf', className: 'bg-turf', hex: color.turf, role: 'legal / confirmed' },
] as const;

const SEMANTIC_SWATCHES = [
  { token: 'screen', className: 'bg-screen', hex: semantic.screen },
  { token: 'surface', className: 'bg-surface', hex: semantic.surface },
  { token: 'card', className: 'bg-card', hex: semantic.card },
  { token: 'hairline', className: 'bg-hairline', hex: semantic.hairline },
  { token: 'textPrimary', className: 'bg-textPrimary', hex: semantic.textPrimary },
  { token: 'textSecondary', className: 'bg-textSecondary', hex: semantic.textSecondary },
  { token: 'accent', className: 'bg-accent', hex: semantic.accent },
  { token: 'warning', className: 'bg-warning', hex: semantic.warning },
  { token: 'legal', className: 'bg-legal', hex: semantic.legal },
] as const;

const SPACE_STEPS = [
  { step: '1', className: 'w-1', value: space[1] },
  { step: '2', className: 'w-2', value: space[2] },
  { step: '3', className: 'w-3', value: space[3] },
  { step: '4', className: 'w-4', value: space[4] },
  { step: '6', className: 'w-6', value: space[6] },
  { step: '8', className: 'w-8', value: space[8] },
] as const;

const RADIUS_STEPS = [
  { step: 'sm', className: 'rounded-sm', value: radius.sm },
  { step: 'md', className: 'rounded-md', value: radius.md },
  { step: 'lg', className: 'rounded-lg', value: radius.lg },
  { step: 'pill', className: 'rounded-pill', value: radius.pill },
] as const;

const FONT_SPECIMENS = [
  {
    name: 'Archivo — display',
    className: 'font-display',
    sample: 'Deep Backward Square Leg',
  },
  {
    name: 'Inter Tight — body',
    className: 'font-body',
    sample: 'He is set and swinging through the line.',
  },
  {
    name: 'IBM Plex Mono — data',
    className: 'font-mono',
    sample: '19.1  19.2  19.3  ·  0123456789',
  },
] as const;

const SIZE_STEPS = [
  { name: 'hero', className: 'text-hero', value: fontSize.hero },
  { name: 'h1', className: 'text-h1', value: fontSize.h1 },
  { name: 'h2', className: 'text-h2', value: fontSize.h2 },
  { name: 'h3', className: 'text-h3', value: fontSize.h3 },
  { name: 'body', className: 'text-body', value: fontSize.body },
  { name: 'small', className: 'text-small', value: fontSize.small },
  { name: 'caption', className: 'text-caption', value: fontSize.caption },
  { name: 'micro', className: 'text-micro', value: fontSize.micro },
] as const;

function SectionHeading({ children }: { children: string }) {
  return (
    <Text
      accessibilityRole="header"
      className="font-mono-medium text-micro tracking-label text-chalk400 mt-8 mb-3 uppercase"
    >
      {children}
    </Text>
  );
}

function Note({ children }: { children: string }) {
  return <Text className="font-body text-caption text-chalk400 mb-3">{children}</Text>;
}

export default function DebugScreen() {
  return (
    // Styled with `style` rather than `className`: SafeAreaView comes from a
    // third-party package, and the screen background is the one thing that must
    // not depend on the NativeWind wiring this screen exists to test.
    <SafeAreaView style={{ flex: 1, backgroundColor: semantic.screen }}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-8"
        accessibilityLabel="Design token and typography audit"
      >
        <Text className="font-display text-h1 text-chalk100 mt-6">Token audit</Text>
        <Text className="font-body text-small text-chalk400 mt-1">
          M0 · every swatch, every family, every step. Judge this on a physical mid-range Android,
          not the simulator.
        </Text>

        {/* ---------------------------------------------------------------- */}
        <SectionHeading>The hero</SectionHeading>
        <Note>
          {`${fontSize.hero}pt display. Scores are typographic events, not labels. Tabular figures always on.`}
        </Note>
        <View className="bg-card rounded-lg p-4 flex-row items-baseline">
          <Text
            className="font-display text-hero text-chalk100"
            style={{ fontVariant: ['tabular-nums'] }}
            accessibilityLabel="147 for 4"
          >
            147
          </Text>
          <Text
            className="font-display text-hero text-chalk400"
            style={{ fontVariant: ['tabular-nums'] }}
          >
            /4
          </Text>
        </View>

        {/* ---------------------------------------------------------------- */}
        <SectionHeading>D-004 · display is Archivo Bold, not Expanded</SectionHeading>
        <Note>
          §5 asks for Archivo Expanded here. It is not shippable — @expo-google-fonts/archivo has no
          width axis, and React Native cannot set one at runtime. This is the fallback §3
          prescribes, recorded rather than left to drift. Judge whether the hero still carries the
          screen at normal width; if not, see OQ-002.
        </Note>
        <View className="bg-card rounded-md p-4">
          <Text className="font-display text-h2 text-chalk100">HANDS 147/4</Text>
          <Text className="font-mono text-micro text-chalk400 mt-2">
            {`${fontFamily.display} · normal width`}
          </Text>
        </View>

        {/* ---------------------------------------------------------------- */}
        <SectionHeading>Families</SectionHeading>
        {FONT_SPECIMENS.map((specimen) => (
          <View key={specimen.name} className="mb-4">
            <Text className="font-mono text-micro text-chalk400 mb-1">{specimen.name}</Text>
            <Text className={`${specimen.className} text-h3 text-chalk100`}>{specimen.sample}</Text>
            <Text className={`${specimen.className} text-body text-chalk100`}>
              {specimen.sample}
            </Text>
            <Text className={`${specimen.className} text-caption text-chalk400`}>
              {specimen.sample}
            </Text>
          </View>
        ))}

        {/* ---------------------------------------------------------------- */}
        <SectionHeading>Size scale</SectionHeading>
        {SIZE_STEPS.map((step) => (
          <View key={step.name} className="flex-row items-baseline mb-2">
            <Text className="font-mono text-micro text-chalk400 w-20">
              {`${step.name} ${step.value}`}
            </Text>
            <Text className={`${step.className} font-display text-chalk100 flex-1`}>147/4</Text>
          </View>
        ))}

        {/* ---------------------------------------------------------------- */}
        <SectionHeading>Colour — raw</SectionHeading>
        {RAW_SWATCHES.map((swatch) => (
          <View
            key={swatch.token}
            className="flex-row items-center mb-2"
            accessible
            accessibilityLabel={`${swatch.token}, ${swatch.hex}, ${swatch.role}`}
          >
            <View
              className={`${swatch.className} rounded-sm border-hairline border-ink500`}
              style={{ width: 44, height: 44 }}
            />
            <View className="ml-3 flex-1">
              <Text className="font-body-medium text-small text-chalk100">{swatch.token}</Text>
              <Text className="font-mono text-micro text-chalk400">
                {`${swatch.hex} · ${swatch.role}`}
              </Text>
            </View>
          </View>
        ))}

        {/* ---------------------------------------------------------------- */}
        <SectionHeading>Colour — semantic</SectionHeading>
        <Note>Components reach for these, so the role is visible at the call site.</Note>
        {SEMANTIC_SWATCHES.map((swatch) => (
          <View
            key={swatch.token}
            className="flex-row items-center mb-2"
            accessible
            accessibilityLabel={`${swatch.token}, ${swatch.hex}`}
          >
            <View
              className={`${swatch.className} rounded-sm border-hairline border-ink500`}
              style={{ width: 44, height: 44 }}
            />
            <View className="ml-3 flex-1">
              <Text className="font-body-medium text-small text-chalk100">{swatch.token}</Text>
              <Text className="font-mono text-micro text-chalk400">{swatch.hex}</Text>
            </View>
          </View>
        ))}

        {/* ---------------------------------------------------------------- */}
        <SectionHeading>Space</SectionHeading>
        {SPACE_STEPS.map((step) => (
          <View
            key={step.step}
            className="flex-row items-center mb-2"
            accessible
            accessibilityLabel={`space ${step.step}, ${step.value} points`}
          >
            <Text className="font-mono text-micro text-chalk400 w-20">
              {`${step.step} · ${step.value}pt`}
            </Text>
            <View className={`${step.className} bg-leather h-4 rounded-sm`} />
          </View>
        ))}

        {/* ---------------------------------------------------------------- */}
        <SectionHeading>Radius</SectionHeading>
        <View className="flex-row flex-wrap">
          {RADIUS_STEPS.map((step) => (
            <View key={step.step} className="mr-4 mb-3 items-center">
              <View
                className={`${step.className} bg-ink700 border-hairline border-ink500`}
                style={{ width: 64, height: 44 }}
              />
              <Text className="font-mono text-micro text-chalk400 mt-1">
                {`${step.step} · ${step.value}`}
              </Text>
            </View>
          ))}
        </View>

        {/* ---------------------------------------------------------------- */}
        <SectionHeading>Touch target</SectionHeading>
        <Note>
          Minimum 44pt. Fielder markers get a hit area this size regardless of their visual size.
        </Note>
        <View
          className="bg-ink700 border-hairline border-leather items-center justify-center rounded-sm"
          style={{ width: layout.minTouchTarget, height: layout.minTouchTarget }}
          accessible
          accessibilityLabel={`Minimum touch target, ${layout.minTouchTarget} points square`}
        >
          <Text className="font-mono text-micro text-chalk400">{layout.minTouchTarget}</Text>
        </View>

        {/* ---------------------------------------------------------------- */}
        <SectionHeading>Motion constants</SectionHeading>
        <Note>
          Values only — nothing animates on this screen. Every one of these must be gated on
          isReduceMotionEnabled before it runs.
        </Note>
        <View className="bg-card rounded-md p-3">
          <Text className="font-mono text-micro text-chalk400">
            {`card entry     ${motion.cardEntry.durationMs}ms  bezier(${motion.cardEntry.bezier.join(',')})`}
          </Text>
          <Text className="font-mono text-micro text-chalk400">
            {`fielder drag   spring damping ${motion.fielderDrag.damping} stiffness ${motion.fielderDrag.stiffness}`}
          </Text>
          <Text className="font-mono text-micro text-chalk400">
            {`violation      ${motion.restrictionViolation.durationMs}ms, no bounce`}
          </Text>
        </View>

        {/* ---------------------------------------------------------------- */}
        <SectionHeading>Wiring</SectionHeading>
        <View className="bg-card rounded-md p-3">
          <Text className="font-mono text-micro text-chalk400">
            {`@cricket/domain  schemaVersion ${DOMAIN_SCHEMA_VERSION}`}
          </Text>
          <Text className="font-mono text-micro text-chalk400">
            {`@cricket/tokens  display ${fontFamily.display}`}
          </Text>
          <Text className="font-mono text-micro text-chalk400">
            {`fonts registered ${Object.keys(FONT_MAP).length}`}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

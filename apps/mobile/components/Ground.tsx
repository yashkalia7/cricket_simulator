import {
  INNER_CIRCLE_RADIUS_M,
  PITCH_CENTRE,
  PITCH_LENGTH_M,
  isInsideCircle,
  worldToScreen,
  type FieldSetting,
  type GroundState,
  type Handedness,
  type Vec2,
  type Viewport,
  type Violation,
} from '@cricket/domain';
import { clampToBoundary, nearestCanonicalPosition, screenToWorld } from '@cricket/domain';
import { color, layout, semantic } from '@cricket/tokens';
import { Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  Line,
  RadialGradient,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

import { POSITION_SHORT } from '../lib/labels';

/**
 * The 2D top-down ground (BUILD.md §4 M4).
 *
 * The primary interaction surface on both platforms — §4's reversal from the
 * original spec, because on a phone orbiting a camera while dragging a fielder
 * is two gestures fighting each other.
 *
 * All geometry comes from `@cricket/domain`, so this renderer and the web one
 * agree pixel-for-pixel.
 */

interface Props {
  field: FieldSetting;
  ground: GroundState;
  handedness: Handedness;
  violations: readonly Violation[];
  size: number;
  activeFielderId?: string | null;
  /** Omit to render a static field. */
  onMoveFielder?: (fielderId: string, to: Vec2) => void;
  onActiveChange?: (fielderId: string | null) => void;
}

export function Ground({
  field,
  ground,
  handedness,
  violations,
  size,
  activeFielderId,
  onMoveFielder,
  onActiveChange,
}: Props) {
  const spanM = Math.max(ground.straightM, ground.squareM) * 2.06;
  const viewport: Viewport = {
    width: size,
    height: size,
    spanM,
    mirrored: handedness === 'LHB',
  };

  const project = (p: Vec2) => worldToScreen(p, viewport);
  const scale = size / spanM;

  const offending = new Set(violations.flatMap((v) => v.offendingFielderIds));

  const centre = project(PITCH_CENTRE);
  const strikerEnd = project({ x: 0, y: 0 });
  const bowlerEnd = project({ x: 0, y: PITCH_LENGTH_M });

  /**
   * The inner circle is a **capsule** — two semicircles joined by straight
   * lines (§6). A rounded rectangle whose corner radius equals the semicircle
   * radius is exactly that shape, so no path arithmetic is needed.
   */
  const capsuleTopLeft = project({
    x: -INNER_CIRCLE_RADIUS_M,
    y: PITCH_LENGTH_M + INNER_CIRCLE_RADIUS_M,
  });
  const capsuleWidth = 2 * INNER_CIRCLE_RADIUS_M * scale;
  const capsuleHeight = (PITCH_LENGTH_M + 2 * INNER_CIRCLE_RADIUS_M) * scale;

  /** Off side sits on +x for a right-hander, and mirrors with the batter. */
  const offSideOnRight = handedness === 'RHB';

  const draggable = onMoveFielder !== undefined;

  /**
   * Drag (§4 M4).
   *
   * The gesture callbacks are worklets — they run on the UI thread, which is
   * the whole point (§5: a fielder drag crossing the bridge per frame is the
   * single most likely place this app feels cheap). Only the hit-test and the
   * committed position hop back to JS via `runOnJS`.
   *
   * Fielders are found by proximity rather than by attaching a gesture to each
   * marker, so the effective hit area is the 44pt minimum regardless of how
   * small the dot is drawn (§5).
   */
  const pickFielderAt = (sx: number, sy: number): string | null => {
    let best: string | null = null;
    let bestDistance = layout.minTouchTarget / 2;
    for (const fielder of field.fielders) {
      const at = project(fielder.at);
      const d = Math.hypot(at.x - sx, at.y - sy);
      if (d < bestDistance) {
        bestDistance = d;
        best = fielder.id;
      }
    }
    return best;
  };

  const beginDrag = (sx: number, sy: number) => {
    onActiveChange?.(pickFielderAt(sx, sy));
  };

  const moveTo = (sx: number, sy: number) => {
    if (!activeFielderId || !onMoveFielder) return;
    // Constrain to inside the boundary — a fielder cannot stand off the field.
    const world = clampToBoundary(screenToWorld({ x: sx, y: sy }, viewport), ground);
    onMoveFielder(activeFielderId, world);
  };

  const endDrag = () => onActiveChange?.(null);

  const pan = Gesture.Pan()
    .onBegin((event) => {
      'worklet';
      runOnJS(beginDrag)(event.x, event.y);
    })
    .onUpdate((event) => {
      'worklet';
      runOnJS(moveTo)(event.x, event.y);
    })
    .onFinalize(() => {
      'worklet';
      runOnJS(endDrag)();
    });

  const active = field.fielders.find((f) => f.id === activeFielderId);
  const activeLabel = active ? nearestCanonicalPosition(active.at).description : null;

  const svg = (
    <View
      style={{ width: size, height: size }}
      accessible
      accessibilityLabel={`Field diagram. ${field.fielders.length} fielders. ${
        violations.length === 0 ? 'Field is legal.' : violations.map((v) => v.message).join('. ')
      }`}
    >
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id="turf" cx="50%" cy="46%" r="62%">
            <Stop offset="0%" stopColor="#16352A" />
            <Stop offset="70%" stopColor="#102A21" />
            <Stop offset="100%" stopColor="#0A1D17" />
          </RadialGradient>
        </Defs>

        {/* Outfield */}
        <Ellipse
          cx={centre.x}
          cy={centre.y}
          rx={ground.squareM * scale}
          ry={ground.straightM * scale}
          fill="url(#turf)"
        />

        {/* The rope */}
        <Ellipse
          cx={centre.x}
          cy={centre.y}
          rx={ground.squareM * scale}
          ry={ground.straightM * scale}
          fill="none"
          stroke={color.chalk100}
          strokeWidth={1.5}
          opacity={0.5}
        />

        {/* Inner circle — capsule, not a circle */}
        <Rect
          x={capsuleTopLeft.x}
          y={capsuleTopLeft.y}
          width={capsuleWidth}
          height={capsuleHeight}
          rx={INNER_CIRCLE_RADIUS_M * scale}
          ry={INNER_CIRCLE_RADIUS_M * scale}
          fill="#ffffff"
          fillOpacity={0.03}
          stroke={color.chalk100}
          strokeWidth={1}
          strokeDasharray="4 6"
          opacity={0.4}
        />

        {/* Square-of-the-wicket line — where "behind square" begins */}
        <Line
          x1={centre.x - ground.squareM * scale * 0.98}
          y1={strikerEnd.y}
          x2={centre.x + ground.squareM * scale * 0.98}
          y2={strikerEnd.y}
          stroke={color.chalk400}
          strokeWidth={0.75}
          strokeDasharray="2 8"
          opacity={0.28}
        />

        {/* Pitch */}
        <Rect
          x={strikerEnd.x - 1.65 * scale}
          y={bowlerEnd.y}
          width={3.3 * scale}
          height={PITCH_LENGTH_M * scale}
          fill="#B9A47C"
          opacity={0.3}
          rx={1}
        />

        {/* Creases */}
        {[strikerEnd, bowlerEnd].map((end, i) => (
          <Line
            key={i}
            x1={end.x - 2.1 * scale}
            y1={end.y}
            x2={end.x + 2.1 * scale}
            y2={end.y}
            stroke={color.chalk100}
            strokeWidth={1}
            opacity={0.65}
          />
        ))}

        {/* Striker — the origin of the whole coordinate system */}
        <Circle
          cx={strikerEnd.x}
          cy={strikerEnd.y}
          r={4.5}
          fill={semantic.accent}
          stroke={semantic.screen}
          strokeWidth={1.5}
        />

        {/* Side markers, so the mirror for a left-hander is legible */}
        <SvgText
          x={offSideOnRight ? size - 12 : 12}
          y={strikerEnd.y + 4}
          fontSize={9}
          fill={color.chalk400}
          opacity={0.5}
          textAnchor={offSideOnRight ? 'end' : 'start'}
        >
          OFF
        </SvgText>
        <SvgText
          x={offSideOnRight ? 12 : size - 12}
          y={strikerEnd.y + 4}
          fontSize={9}
          fill={color.chalk400}
          opacity={0.5}
          textAnchor={offSideOnRight ? 'start' : 'end'}
        >
          LEG
        </SvgText>

        {/* Fielders */}
        {field.fielders.map((fielder) => {
          const at = project(fielder.at);
          const illegal = offending.has(fielder.id);
          const active = activeFielderId === fielder.id;
          const inside = isInsideCircle(fielder.at);
          const isKeeper = fielder.role === 'keeper';

          // Keep the label off the marker and inside the frame.
          const labelAbove = at.y > size * 0.42;
          const labelY = labelAbove ? at.y - 11 : at.y + 17;

          const fill = illegal
            ? semantic.warning
            : isKeeper
              ? color.sodium
              : inside
                ? color.chalk100
                : color.chalk400;

          return (
            <G key={fielder.id}>
              {illegal && (
                <Circle
                  cx={at.x}
                  cy={at.y}
                  r={13}
                  fill="none"
                  stroke={semantic.warning}
                  strokeWidth={2}
                  opacity={0.9}
                />
              )}
              {active && (
                <Circle cx={at.x} cy={at.y} r={16} fill={semantic.accent} opacity={0.22} />
              )}
              <Circle
                cx={at.x}
                cy={at.y}
                r={active ? 8 : 6}
                fill={fill}
                stroke={semantic.screen}
                strokeWidth={1.5}
              />
              {/* Dark halo so labels stay legible over the turf */}
              <SvgText
                x={at.x}
                y={labelY}
                fontSize={9.5}
                fill={semantic.screen}
                stroke={semantic.screen}
                strokeWidth={3}
                textAnchor="middle"
              >
                {POSITION_SHORT[fielder.positionId] ?? ''}
              </SvgText>
              <SvgText
                x={at.x}
                y={labelY}
                fontSize={9.5}
                fill={illegal ? semantic.warning : color.chalk400}
                textAnchor="middle"
              >
                {POSITION_SHORT[fielder.positionId] ?? ''}
              </SvgText>
            </G>
          );
        })}
      </Svg>

      {/* Live label for the fielder under the finger — snaps to the *name*,
          never to the coordinate (§6). */}
      {activeLabel && (
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 6,
            alignItems: 'center',
          }}
          pointerEvents="none"
        >
          <View
            style={{
              backgroundColor: semantic.surface,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: color.ink500,
              paddingHorizontal: 12,
              paddingVertical: 6,
            }}
          >
            <Text
              style={{
                color: color.chalk100,
                fontFamily: 'IBMPlexMono_500Medium',
                fontSize: 12,
              }}
            >
              {activeLabel}
            </Text>
          </View>
        </View>
      )}
    </View>
  );

  return draggable ? <GestureDetector gesture={pan}>{svg}</GestureDetector> : svg;
}

import DebugScreen from '../components/DebugScreen';
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- bisect switch, see below
import MinimalProbe from '../components/MinimalProbe';

/*
 * BISECT SWITCH — temporary, delete once M0 boots on a device.
 *
 * To split a runtime crash in half, change the returned component below to
 * <MinimalProbe />. It renders with no NativeWind, no tokens and no workspace
 * imports, so:
 *
 *   probe renders  → app/_layout.tsx is fine; the fault is in DebugScreen
 *   probe crashes  → the fault is in app/_layout.tsx (fonts / gesture handler /
 *                    router), and DebugScreen is innocent
 */
export default function Index() {
  return <DebugScreen />;
}

// Prints the full stack on the device instead of a truncated one-liner.
// Temporary — delete once M0 boots cleanly.
export { ErrorReport as ErrorBoundary } from '../components/ErrorReport';

import { DEFAULT_DRAFT, type ScenarioDraft } from '@cricket/domain';
import { create } from 'zustand';

export type UserRole = 'BATTER' | 'BOWLER';

/**
 * The situation the user is building, and which side of the ball they are on.
 *
 * Held in a store rather than route params because the builder is several
 * screens and the draft has to survive going back and forth without being
 * re-encoded into a URL each time.
 */
interface DraftState {
  role: UserRole;
  draft: ScenarioDraft;
  setRole: (role: UserRole) => void;
  patch: (partial: Partial<ScenarioDraft>) => void;
  reset: () => void;
}

export const useDraft = create<DraftState>((set) => ({
  role: 'BOWLER',
  draft: DEFAULT_DRAFT,
  setRole: (role) => set({ role }),
  patch: (partial) => set((s) => ({ draft: { ...s.draft, ...partial } })),
  reset: () => set({ draft: DEFAULT_DRAFT }),
}));

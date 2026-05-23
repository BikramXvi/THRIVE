// ─────────────────────────────────────────────
// Active Workout Store (Zustand)
// Manages the in-progress workout session state.
// This is NOT persisted to Supabase until
// the workout is marked as complete.
// ─────────────────────────────────────────────

import { create } from 'zustand';

interface LoggedSet {
  exerciseId: string;
  setNumber:  number;
  weightKg:   number | null;
  reps:       number | null;
  rpe:        number | null;
  loggedAt:   string;
}

interface ActiveWorkoutState {
  sessionId:       string | null;
  workoutName:     string | null;
  startedAt:       string | null;
  currentExIndex:  number;
  sets:            LoggedSet[];
  isRestTimerActive: boolean;
  restSecondsLeft: number;
  isActive:        boolean;

  startWorkout: (sessionId: string, name: string) => void;
  logSet:       (set: LoggedSet) => void;
  nextExercise: () => void;
  startRest:    (seconds: number) => void;
  tickRest:     () => void;
  endWorkout:   () => void;
}

export const useWorkoutStore = create<ActiveWorkoutState>((set) => ({
  sessionId:         null,
  workoutName:       null,
  startedAt:         null,
  currentExIndex:    0,
  sets:              [],
  isRestTimerActive: false,
  restSecondsLeft:   0,
  isActive:          false,

  startWorkout: (sessionId, name) =>
    set({
      sessionId,
      workoutName: name,
      startedAt:   new Date().toISOString(),
      sets:        [],
      currentExIndex: 0,
      isActive:    true,
    }),

  logSet: (newSet) =>
    set((state) => ({ sets: [...state.sets, newSet] })),

  nextExercise: () =>
    set((state) => ({ currentExIndex: state.currentExIndex + 1 })),

  startRest: (seconds) =>
    set({ isRestTimerActive: true, restSecondsLeft: seconds }),

  tickRest: () =>
    set((state) => {
      const next = state.restSecondsLeft - 1;
      if (next <= 0) return { isRestTimerActive: false, restSecondsLeft: 0 };
      return { restSecondsLeft: next };
    }),

  endWorkout: () =>
    set({
      sessionId:         null,
      workoutName:       null,
      startedAt:         null,
      currentExIndex:    0,
      sets:              [],
      isRestTimerActive: false,
      restSecondsLeft:   0,
      isActive:          false,
    }),
}));
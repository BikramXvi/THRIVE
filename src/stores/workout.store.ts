import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface ActiveExercise {
  id:            string;
  name:          string;
  muscle:        string;
  category:      string;
  defaultSets:   number;
  defaultReps:   number;
  defaultWeight: number;
}

interface LoggedSet {
  id:         string;
  exerciseId: string;
  setNumber:  number;
  weightKg:   number | null;
  reps:       number;
  rpe:        number | null;
  loggedAt:   string;
  done:       boolean;
  pr:         boolean;
  weight:     string;
  repsStr:    string;
}

interface WorkoutExerciseState {
  exercise: ActiveExercise;
  sets:     LoggedSet[];
  notes:    string;
}

interface ActiveWorkoutState {
  isActive:     boolean;
  sessionId:    string | null;
  programId:    string | null;
  programName:  string;
  startedAt:    string | null;
  exercises:    WorkoutExerciseState[];
  currentExIdx: number;

  isRestTimerActive: boolean;
  restSecondsLeft:   number;

  startWorkout: (programId: string, programName: string, exercises: ActiveExercise[]) => void;
  updateSet:    (exIdx: number, setIdx: number, field: 'weight' | 'reps', value: string) => void;
  logSet:       (exIdx: number, setIdx: number) => void;
  addSet:       (exIdx: number) => void;
  removeSet:    (exIdx: number, setIdx: number) => void;
  setCurrentEx: (idx: number) => void;
  updateNotes:  (exIdx: number, notes: string) => void;
  startRest:    (seconds: number) => void;
  tickRest:     () => void;
  endWorkout:   () => void;
}

export const useWorkoutStore = create<ActiveWorkoutState>()(
  persist(
    (set, get) => ({
      isActive:     false,
      sessionId:    null,
      programId:    null,
      programName:  '',
      startedAt:    null,
      exercises:    [],
      currentExIdx: 0,

      isRestTimerActive: false,
      restSecondsLeft:   0,

      startWorkout: (programId, programName, exList) => {
        const exercises = exList.map((ex) => ({
          exercise: ex,
          sets: Array.from({ length: ex.defaultSets }, (_, i) => ({
            id:         `set-${i}-${Date.now()}-${ex.id}`,
            exerciseId: ex.id,
            setNumber:  i + 1,
            weightKg:   ex.defaultWeight > 0 ? ex.defaultWeight : null,
            reps:       ex.defaultReps,
            rpe:        null,
            loggedAt:   '',
            done:       false,
            pr:         false,
            weight:     ex.defaultWeight > 0 ? ex.defaultWeight.toString() : '',
            repsStr:    ex.defaultReps.toString(),
          })),
          notes: '',
        }));

        set({
          isActive:     true,
          programId,
          programName,
          startedAt:    new Date().toISOString(),
          exercises,
          currentExIdx: 0,
        });
      },

      updateSet: (exIdx, setIdx, field, value) => {
        const exercises = [...get().exercises];
        const sets      = [...exercises[exIdx].sets];
        if (field === 'weight') {
          sets[setIdx] = { ...sets[setIdx], weight: value };
        } else {
          sets[setIdx] = { ...sets[setIdx], repsStr: value };
        }
        exercises[exIdx] = { ...exercises[exIdx], sets };
        set({ exercises });
      },

      logSet: (exIdx, setIdx) => {
        const exercises  = [...get().exercises];
        const sets       = [...exercises[exIdx].sets];
        sets[setIdx]     = { ...sets[setIdx], done: true, loggedAt: new Date().toISOString() };
        exercises[exIdx] = { ...exercises[exIdx], sets };
        set({ exercises });
      },

      addSet: (exIdx) => {
        const exercises = [...get().exercises];
        const ex        = exercises[exIdx];
        const lastSet   = ex.sets[ex.sets.length - 1];
        const newSet: LoggedSet = {
          id:         `set-${Date.now()}`,
          exerciseId: ex.exercise.id,
          setNumber:  ex.sets.length + 1,
          weightKg:   null,
          reps:       0,
          rpe:        null,
          loggedAt:   '',
          done:       false,
          pr:         false,
          weight:     lastSet?.weight  ?? '',
          repsStr:    lastSet?.repsStr ?? ex.exercise.defaultReps.toString(),
        };
        exercises[exIdx] = { ...ex, sets: [...ex.sets, newSet] };
        set({ exercises });
      },

      removeSet: (exIdx, setIdx) => {
        const exercises  = [...get().exercises];
        exercises[exIdx] = {
          ...exercises[exIdx],
          sets: exercises[exIdx].sets.filter((_, i) => i !== setIdx),
        };
        set({ exercises });
      },

      setCurrentEx: (idx) => set({ currentExIdx: idx }),

      updateNotes: (exIdx, notes) => {
        const exercises  = [...get().exercises];
        exercises[exIdx] = { ...exercises[exIdx], notes };
        set({ exercises });
      },

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
          isActive:          false,
          sessionId:         null,
          programId:         null,
          programName:       '',
          startedAt:         null,
          exercises:         [],
          currentExIdx:      0,
          isRestTimerActive: false,
          restSecondsLeft:   0,
        }),
    }),
    {
      name:    'thrive-active-workout',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
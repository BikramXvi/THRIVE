import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  TextInput,
  Modal,
  Vibration,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius } from '../../constants/theme';

interface Exercise {
  id:           string;
  name:         string;
  muscle:       string;
  category:     string;
  defaultSets:  number;
  defaultReps:  number;
  defaultWeight: number;
}

interface LoggedSet {
  id:       string;
  weight:   string;
  reps:     string;
  done:     boolean;
  pr:       boolean;
}

interface WorkoutExercise {
  exercise: Exercise;
  sets:     LoggedSet[];
  notes:    string;
}

const PUSH_DAY_A: Exercise[] = [
  { id: 'e1', name: 'Bench Press',        muscle: 'Chest',     category: 'push', defaultSets: 4, defaultReps: 8,  defaultWeight: 80  },
  { id: 'e2', name: 'Incline DB Press',   muscle: 'Chest',     category: 'push', defaultSets: 3, defaultReps: 10, defaultWeight: 30  },
  { id: 'e3', name: 'Overhead Press',     muscle: 'Shoulders', category: 'push', defaultSets: 3, defaultReps: 8,  defaultWeight: 50  },
  { id: 'e4', name: 'Lateral Raise',      muscle: 'Shoulders', category: 'push', defaultSets: 3, defaultReps: 15, defaultWeight: 12  },
  { id: 'e5', name: 'Tricep Pushdown',    muscle: 'Triceps',   category: 'push', defaultSets: 3, defaultReps: 12, defaultWeight: 25  },
  { id: 'e6', name: 'Overhead Extension', muscle: 'Triceps',   category: 'push', defaultSets: 3, defaultReps: 12, defaultWeight: 20  },
];

const REST_PRESETS = [30, 60, 90, 120, 180];

const MUSCLE_COLOR: Record<string, string> = {
  Chest:     Colors.ACCENT,
  Shoulders: Colors.BLUE,
  Triceps:   Colors.ORANGE,
  Back:      Colors.TEAL,
  Biceps:    Colors.PURPLE,
  Legs:      Colors.RED,
};

function createSets(count: number, weight: number, reps: number): LoggedSet[] {
  return Array.from({ length: count }, (_, i) => ({
    id:     `set-${i}-${Date.now()}`,
    weight: weight.toString(),
    reps:   reps.toString(),
    done:   false,
    pr:     false,
  }));
}

function initWorkout(exercises: Exercise[]): WorkoutExercise[] {
  return exercises.map((ex) => ({
    exercise: ex,
    sets:     createSets(ex.defaultSets, ex.defaultWeight, ex.defaultReps),
    notes:    '',
  }));
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

interface RestTimerProps {
  visible:    boolean;
  onClose:    () => void;
  onFinish:   () => void;
}

function RestTimer({ visible, onClose, onFinish }: RestTimerProps) {
  const [seconds,    setSeconds]    = useState(90);
  const [totalSecs,  setTotalSecs]  = useState(90);
  const [running,    setRunning]    = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!visible) return;
    setSeconds(90);
    setTotalSecs(90);
    setRunning(true);
  }, [visible]);

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          Vibration.vibrate([0, 400, 200, 400]);
          onFinish();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  function setPreset(secs: number) {
    setSeconds(secs);
    setTotalSecs(secs);
    setRunning(true);
  }

  const pct = totalSecs > 0 ? seconds / totalSecs : 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={timerStyles.overlay}>
        <View style={timerStyles.sheet}>
          <View style={timerStyles.handle} />

          <Text style={timerStyles.label}>Rest timer</Text>

          {/* Big timer */}
          <View style={timerStyles.timerWrap}>
            <View style={timerStyles.timerRingOuter}>
              <View style={[timerStyles.timerRingFill, {
                borderColor: seconds < 10 ? Colors.RED : Colors.ACCENT,
                opacity: pct,
              }]} />
              <View style={timerStyles.timerRingTrack} />
              <Text style={[timerStyles.timerNum, {
                color: seconds < 10 ? Colors.RED : Colors.TEXT_PRIMARY,
              }]}>
                {formatTime(seconds)}
              </Text>
            </View>
          </View>

          {/* Presets */}
          <View style={timerStyles.presets}>
            {REST_PRESETS.map((s) => (
              <TouchableOpacity
                key={s}
                style={[
                  timerStyles.presetBtn,
                  totalSecs === s && timerStyles.presetBtnActive,
                ]}
                onPress={() => setPreset(s)}
              >
                <Text style={[
                  timerStyles.presetText,
                  totalSecs === s && timerStyles.presetTextActive,
                ]}>
                  {s < 60 ? `${s}s` : `${s / 60}m`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Controls */}
          <View style={timerStyles.controls}>
            <TouchableOpacity
              style={timerStyles.controlBtn}
              onPress={() => setRunning((r) => !r)}
            >
              <Ionicons
                name={running ? 'pause' : 'play'}
                size={20}
                color={Colors.TEXT_PRIMARY}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={timerStyles.skipBtn}
              onPress={onClose}
            >
              <Text style={timerStyles.skipText}>Skip rest</Text>
              <Ionicons name="arrow-forward" size={14} color={Colors.BG_BASE} />
            </TouchableOpacity>
            <TouchableOpacity
              style={timerStyles.controlBtn}
              onPress={() => setSeconds(totalSecs)}
            >
              <Ionicons name="refresh" size={20} color={Colors.TEXT_PRIMARY} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

interface PRBannerProps {
  visible:  boolean;
  exercise: string;
  weight:   string;
  reps:     string;
  onClose:  () => void;
}

function PRBanner({ visible, exercise, weight, reps, onClose }: PRBannerProps) {
  useEffect(() => {
    if (visible) {
      const t = setTimeout(onClose, 3000);
      return () => clearTimeout(t);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={prStyles.banner}>
      <Ionicons name="trophy" size={16} color={Colors.BG_BASE} />
      <View style={prStyles.bannerText}>
        <Text style={prStyles.bannerTitle}>New personal record!</Text>
        <Text style={prStyles.bannerSub}>{exercise} — {weight}kg × {reps} reps</Text>
      </View>
      <TouchableOpacity onPress={onClose}>
        <Ionicons name="close" size={16} color={Colors.BG_BASE} />
      </TouchableOpacity>
    </View>
  );
}

export function ActiveWorkoutScreen() {
  const [workout,       setWorkout]       = useState<WorkoutExercise[]>(initWorkout(PUSH_DAY_A));
  const [currentExIdx,  setCurrentExIdx]  = useState(0);
  const [elapsedSecs,   setElapsedSecs]   = useState(0);
  const [showTimer,     setShowTimer]     = useState(false);
  const [showPR,        setShowPR]        = useState(false);
  const [prData,        setPRData]        = useState({ exercise: '', weight: '', reps: '' });
  const [showComplete,  setShowComplete]  = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsedSecs((s) => s + 1);
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const currentEx   = workout[currentExIdx];
  const totalSets   = workout.reduce((s, w) => s + w.sets.length, 0);
  const doneSets    = workout.reduce((s, w) => s + w.sets.filter((set) => set.done).length, 0);
  const progressPct = totalSets > 0 ? doneSets / totalSets : 0;

  const totalVolume = workout.reduce((total, w) =>
    total + w.sets
      .filter((s) => s.done)
      .reduce((sv, s) => sv + (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0), 0)
  , 0);

  function updateSet(
    exIdx:  number,
    setIdx: number,
    field:  'weight' | 'reps',
    value:  string
  ) {
    setWorkout((prev) => {
      const next = [...prev];
      next[exIdx] = {
        ...next[exIdx],
        sets: next[exIdx].sets.map((s, i) =>
          i === setIdx ? { ...s, [field]: value } : s
        ),
      };
      return next;
    });
  }

  function logSet(exIdx: number, setIdx: number) {
    const set = workout[exIdx].sets[setIdx];
    if (!set.weight || !set.reps) return;

    const isPR = parseFloat(set.weight) >= 100;

    setWorkout((prev) => {
      const next = [...prev];
      next[exIdx] = {
        ...next[exIdx],
        sets: next[exIdx].sets.map((s, i) =>
          i === setIdx ? { ...s, done: true, pr: isPR } : s
        ),
      };
      return next;
    });

    if (isPR) {
      setPRData({
        exercise: workout[exIdx].exercise.name,
        weight:   set.weight,
        reps:     set.reps,
      });
      setShowPR(true);
      Vibration.vibrate([0, 100, 50, 200]);
    }

    setShowTimer(true);
  }

  function addSet(exIdx: number) {
    const ex = workout[exIdx];
    const lastSet = ex.sets[ex.sets.length - 1];
    setWorkout((prev) => {
      const next = [...prev];
      next[exIdx] = {
        ...next[exIdx],
        sets: [
          ...next[exIdx].sets,
          {
            id:     `set-${Date.now()}`,
            weight: lastSet?.weight ?? ex.exercise.defaultWeight.toString(),
            reps:   lastSet?.reps   ?? ex.exercise.defaultReps.toString(),
            done:   false,
            pr:     false,
          },
        ],
      };
      return next;
    });
  }

  function removeSet(exIdx: number, setIdx: number) {
    setWorkout((prev) => {
      const next = [...prev];
      next[exIdx] = {
        ...next[exIdx],
        sets: next[exIdx].sets.filter((_, i) => i !== setIdx),
      };
      return next;
    });
  }

  const allDone = workout.every((w) => w.sets.every((s) => s.done));

  return (
    <View style={styles.root}>

      {/* PR Banner */}
      <PRBanner
        visible={showPR}
        exercise={prData.exercise}
        weight={prData.weight}
        reps={prData.reps}
        onClose={() => setShowPR(false)}
      />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.workoutName}>Push day A</Text>
          <View style={styles.headerMeta}>
            <Ionicons name="time-outline" size={12} color={Colors.TEXT_TERTIARY} />
            <Text style={styles.headerTime}>{formatTime(elapsedSecs)}</Text>
            <View style={styles.headerDot} />
            <Text style={styles.headerSets}>{doneSets}/{totalSets} sets</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.finishBtn}
          onPress={() => setShowComplete(true)}
        >
          <Text style={styles.finishText}>Finish</Text>
        </TouchableOpacity>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, {
          width: `${Math.round(progressPct * 100)}%` as any,
        }]} />
      </View>

      {/* Exercise tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.exTabs}
      >
        {workout.map((w, i) => {
          const exDone = w.sets.every((s) => s.done);
          const exActive = i === currentExIdx;
          return (
            <TouchableOpacity
              key={w.exercise.id}
              style={[
                styles.exTab,
                exActive && styles.exTabActive,
                exDone   && styles.exTabDone,
              ]}
              onPress={() => setCurrentExIdx(i)}
            >
              {exDone && (
                <Ionicons name="checkmark" size={10} color={Colors.BG_BASE} />
              )}
              <Text style={[
                styles.exTabText,
                exActive && styles.exTabTextActive,
                exDone   && styles.exTabTextDone,
              ]}>
                {w.exercise.name.split(' ')[0]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Current exercise header */}
        <View style={styles.exHeader}>
          <View>
            <Text style={styles.exName}>{currentEx.exercise.name}</Text>
            <View style={styles.exMeta}>
              <View style={[styles.muscleDot, {
                backgroundColor: MUSCLE_COLOR[currentEx.exercise.muscle] ?? Colors.ACCENT,
              }]} />
              <Text style={styles.exMuscle}>{currentEx.exercise.muscle}</Text>
              <Text style={styles.exCategory}>· {currentEx.exercise.category}</Text>
            </View>
          </View>
          <View style={styles.exNav}>
            <TouchableOpacity
              style={[styles.exNavBtn, currentExIdx === 0 && styles.exNavBtnDisabled]}
              onPress={() => setCurrentExIdx((i) => Math.max(0, i - 1))}
              disabled={currentExIdx === 0}
            >
              <Ionicons name="chevron-back" size={16} color={
                currentExIdx === 0 ? Colors.TEXT_TERTIARY : Colors.TEXT_PRIMARY
              } />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.exNavBtn, currentExIdx === workout.length - 1 && styles.exNavBtnDisabled]}
              onPress={() => setCurrentExIdx((i) => Math.min(workout.length - 1, i + 1))}
              disabled={currentExIdx === workout.length - 1}
            >
              <Ionicons name="chevron-forward" size={16} color={
                currentExIdx === workout.length - 1 ? Colors.TEXT_TERTIARY : Colors.TEXT_PRIMARY
              } />
            </TouchableOpacity>
          </View>
        </View>

        {/* Previous session reference */}
        <View style={styles.prevSession}>
          <Ionicons name="time-outline" size={12} color={Colors.TEXT_TERTIARY} />
          <Text style={styles.prevSessionText}>
            Last session: {currentEx.exercise.defaultWeight}kg × {currentEx.exercise.defaultReps} reps
          </Text>
        </View>

        {/* Set column headers */}
        <View style={styles.setHeaders}>
          <Text style={styles.setHeaderNum}>SET</Text>
          <Text style={styles.setHeaderWeight}>KG</Text>
          <Text style={styles.setHeaderReps}>REPS</Text>
          <Text style={styles.setHeaderAction}>LOG</Text>
        </View>

        {/* Sets */}
        {currentEx.sets.map((set, setIdx) => (
          <View
            key={set.id}
            style={[
              styles.setRow,
              set.done && styles.setRowDone,
              set.pr   && styles.setRowPR,
            ]}
          >
            <View style={styles.setNumWrap}>
              <Text style={styles.setNum}>{setIdx + 1}</Text>
              {set.pr && (
                <Ionicons name="trophy" size={10} color={Colors.ACCENT} />
              )}
            </View>

            <TextInput
              style={[styles.setInput, set.done && styles.setInputDone]}
              value={set.weight}
              onChangeText={(v) => updateSet(currentExIdx, setIdx, 'weight', v)}
              keyboardType="numeric"
              selectTextOnFocus
              editable={!set.done}
            />

            <TextInput
              style={[styles.setInput, set.done && styles.setInputDone]}
              value={set.reps}
              onChangeText={(v) => updateSet(currentExIdx, setIdx, 'reps', v)}
              keyboardType="numeric"
              selectTextOnFocus
              editable={!set.done}
            />

            <TouchableOpacity
              style={[
                styles.setLogBtn,
                set.done && styles.setLogBtnDone,
              ]}
              onPress={() => set.done
                ? removeSet(currentExIdx, setIdx)
                : logSet(currentExIdx, setIdx)
              }
            >
              <Ionicons
                name={set.done ? 'checkmark' : 'checkmark-outline'}
                size={16}
                color={set.done ? Colors.BG_BASE : Colors.TEXT_TERTIARY}
              />
            </TouchableOpacity>
          </View>
        ))}

        {/* Add set */}
        <TouchableOpacity
          style={styles.addSetBtn}
          onPress={() => addSet(currentExIdx)}
        >
          <Ionicons name="add" size={14} color={Colors.TEXT_TERTIARY} />
          <Text style={styles.addSetText}>Add set</Text>
        </TouchableOpacity>

        {/* Notes */}
        <View style={styles.notesWrap}>
          <TextInput
            style={styles.notesInput}
            placeholder="Notes for this exercise..."
            placeholderTextColor={Colors.TEXT_TERTIARY}
            value={currentEx.notes}
            onChangeText={(v) => {
              setWorkout((prev) => {
                const next = [...prev];
                next[currentExIdx] = { ...next[currentExIdx], notes: v };
                return next;
              });
            }}
            multiline
          />
        </View>

        {/* Volume summary */}
        <View style={styles.volumeRow}>
          <View style={styles.volumeItem}>
            <Text style={styles.volumeValue}>{doneSets}</Text>
            <Text style={styles.volumeLabel}>Sets done</Text>
          </View>
          <View style={styles.volumeSep} />
          <View style={styles.volumeItem}>
            <Text style={[styles.volumeValue, { color: Colors.ACCENT }]}>
              {totalVolume.toLocaleString()}
            </Text>
            <Text style={styles.volumeLabel}>kg volume</Text>
          </View>
          <View style={styles.volumeSep} />
          <View style={styles.volumeItem}>
            <Text style={[styles.volumeValue, { color: Colors.BLUE }]}>
              {formatTime(elapsedSecs)}
            </Text>
            <Text style={styles.volumeLabel}>Duration</Text>
          </View>
        </View>

      </ScrollView>

      {/* Rest timer */}
      <RestTimer
        visible={showTimer}
        onClose={() => setShowTimer(false)}
        onFinish={() => setShowTimer(false)}
      />

      {/* Workout complete modal */}
      <Modal
        visible={showComplete}
        transparent
        animationType="fade"
        onRequestClose={() => setShowComplete(false)}
      >
        <View style={completeStyles.overlay}>
          <View style={completeStyles.sheet}>
            <Ionicons name="trophy" size={40} color={Colors.ACCENT} />
            <Text style={completeStyles.title}>Workout complete</Text>
            <Text style={completeStyles.sub}>Push day A</Text>

            <View style={completeStyles.stats}>
              <View style={completeStyles.statItem}>
                <Text style={completeStyles.statValue}>{formatTime(elapsedSecs)}</Text>
                <Text style={completeStyles.statLabel}>Duration</Text>
              </View>
              <View style={completeStyles.statSep} />
              <View style={completeStyles.statItem}>
                <Text style={[completeStyles.statValue, { color: Colors.ACCENT }]}>
                  {totalVolume.toLocaleString()}kg
                </Text>
                <Text style={completeStyles.statLabel}>Volume</Text>
              </View>
              <View style={completeStyles.statSep} />
              <View style={completeStyles.statItem}>
                <Text style={[completeStyles.statValue, { color: Colors.BLUE }]}>
                  {doneSets}
                </Text>
                <Text style={completeStyles.statLabel}>Sets</Text>
              </View>
            </View>

            <TouchableOpacity
              style={completeStyles.saveBtn}
              onPress={() => setShowComplete(false)}
            >
              <Text style={completeStyles.saveBtnText}>Save workout</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={completeStyles.discardBtn}
              onPress={() => setShowComplete(false)}
            >
              <Text style={completeStyles.discardText}>Discard</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex:            1,
    backgroundColor: Colors.BG_BASE,
  },

  // Header
  header: {
    flexDirection:     'row',
    justifyContent:    'space-between',
    alignItems:        'center',
    paddingHorizontal: Spacing.S5,
    paddingTop:        56,
    paddingBottom:     Spacing.S3,
  },
  headerLeft: {
    gap: 3,
  },
  workoutName: {
    fontSize:     20,
    fontWeight:   '700',
    color:        Colors.TEXT_PRIMARY,
    letterSpacing: -0.5,
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           5,
  },
  headerTime: {
    fontSize:   12,
    color:      Colors.TEXT_TERTIARY,
    fontFamily: 'monospace',
  },
  headerDot: {
    width:           3,
    height:          3,
    borderRadius:    1.5,
    backgroundColor: Colors.TEXT_TERTIARY,
  },
  headerSets: {
    fontSize: 12,
    color:    Colors.TEXT_TERTIARY,
  },
  finishBtn: {
    backgroundColor:   Colors.ACCENT,
    borderRadius:      Radius.FULL,
    paddingHorizontal: 20,
    paddingVertical:   10,
  },
  finishText: {
    fontSize:   13,
    fontWeight: '700',
    color:      Colors.BG_BASE,
  },

  // Progress
  progressBar: {
    height:          3,
    backgroundColor: Colors.BG_SURFACE_2,
  },
  progressFill: {
    height:          '100%',
    backgroundColor: Colors.ACCENT,
  },

  // Exercise tabs
  exTabs: {
    paddingHorizontal: Spacing.S5,
    paddingVertical:   Spacing.S3,
    gap:               6,
  },
  exTab: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               4,
    paddingHorizontal: 12,
    paddingVertical:   6,
    borderRadius:      Radius.FULL,
    backgroundColor:   Colors.BG_SURFACE,
    borderWidth:       StyleSheet.hairlineWidth,
    borderColor:       Colors.BORDER,
  },
  exTabActive: {
    backgroundColor: Colors.BG_SURFACE_2,
    borderColor:     Colors.BORDER_2,
  },
  exTabDone: {
    backgroundColor: Colors.ACCENT,
    borderColor:     Colors.ACCENT,
  },
  exTabText: {
    fontSize:   11,
    color:      Colors.TEXT_TERTIARY,
    fontWeight: '500',
  },
  exTabTextActive: {
    color: Colors.TEXT_PRIMARY,
  },
  exTabTextDone: {
    color: Colors.BG_BASE,
  },

  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.S5,
    paddingBottom:     40,
  },

  // Exercise header
  exHeader: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'flex-start',
    marginBottom:   Spacing.S2,
    marginTop:      Spacing.S2,
  },
  exName: {
    fontSize:     22,
    fontWeight:   '700',
    color:        Colors.TEXT_PRIMARY,
    letterSpacing: -0.5,
    marginBottom:  4,
  },
  exMeta: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           6,
  },
  muscleDot: {
    width:        6,
    height:       6,
    borderRadius: 3,
  },
  exMuscle: {
    fontSize:   12,
    color:      Colors.TEXT_SECONDARY,
    fontWeight: '500',
  },
  exCategory: {
    fontSize: 12,
    color:    Colors.TEXT_TERTIARY,
  },
  exNav: {
    flexDirection: 'row',
    gap:           4,
  },
  exNavBtn: {
    width:           32,
    height:          32,
    borderRadius:    10,
    backgroundColor: Colors.BG_SURFACE,
    borderWidth:     StyleSheet.hairlineWidth,
    borderColor:     Colors.BORDER,
    alignItems:      'center',
    justifyContent:  'center',
  },
  exNavBtnDisabled: {
    opacity: 0.4,
  },

  // Previous session
  prevSession: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             5,
    marginBottom:    Spacing.S4,
    paddingVertical: Spacing.S2,
    paddingHorizontal: Spacing.S3,
    backgroundColor: Colors.BG_SURFACE,
    borderRadius:    Radius.SM,
    alignSelf:       'flex-start',
    borderWidth:     StyleSheet.hairlineWidth,
    borderColor:     Colors.BORDER,
  },
  prevSessionText: {
    fontSize:   11,
    color:      Colors.TEXT_TERTIARY,
    fontFamily: 'monospace',
  },

  // Set headers
  setHeaders: {
    flexDirection: 'row',
    alignItems:    'center',
    marginBottom:  Spacing.S2,
    paddingHorizontal: 4,
  },
  setHeaderNum: {
    width:         40,
    fontSize:      10,
    fontWeight:    '600',
    color:         Colors.TEXT_TERTIARY,
    letterSpacing: 0.1,
  },
  setHeaderWeight: {
    flex:          1,
    fontSize:      10,
    fontWeight:    '600',
    color:         Colors.TEXT_TERTIARY,
    letterSpacing: 0.1,
    textAlign:     'center',
  },
  setHeaderReps: {
    flex:          1,
    fontSize:      10,
    fontWeight:    '600',
    color:         Colors.TEXT_TERTIARY,
    letterSpacing: 0.1,
    textAlign:     'center',
  },
  setHeaderAction: {
    width:         48,
    fontSize:      10,
    fontWeight:    '600',
    color:         Colors.TEXT_TERTIARY,
    letterSpacing: 0.1,
    textAlign:     'center',
  },

  // Set rows
  setRow: {
    flexDirection:   'row',
    alignItems:      'center',
    marginBottom:    Spacing.S2,
    paddingVertical: Spacing.S2,
    paddingHorizontal: 4,
    borderRadius:    Radius.SM,
    gap:             8,
  },
  setRowDone: {
    backgroundColor: Colors.ACCENT + '08',
  },
  setRowPR: {
    backgroundColor: Colors.ACCENT + '15',
    borderWidth:     StyleSheet.hairlineWidth,
    borderColor:     Colors.ACCENT + '40',
  },
  setNumWrap: {
    width:          40,
    flexDirection:  'row',
    alignItems:     'center',
    gap:            4,
  },
  setNum: {
    fontSize:   14,
    fontWeight: '600',
    color:      Colors.TEXT_TERTIARY,
    fontFamily: 'monospace',
  },
  setInput: {
    flex:            1,
    height:          44,
    backgroundColor: Colors.BG_SURFACE_2,
    borderRadius:    Radius.SM,
    borderWidth:     StyleSheet.hairlineWidth,
    borderColor:     Colors.BORDER,
    textAlign:       'center',
    fontSize:        18,
    fontWeight:      '700',
    color:           Colors.TEXT_PRIMARY,
    fontFamily:      'monospace',
  },
  setInputDone: {
    backgroundColor: Colors.BG_SURFACE,
    color:           Colors.TEXT_TERTIARY,
    borderColor:     'transparent',
  },
  setLogBtn: {
    width:           48,
    height:          44,
    borderRadius:    Radius.SM,
    backgroundColor: Colors.BG_SURFACE_2,
    borderWidth:     StyleSheet.hairlineWidth,
    borderColor:     Colors.BORDER,
    alignItems:      'center',
    justifyContent:  'center',
  },
  setLogBtnDone: {
    backgroundColor: Colors.ACCENT,
    borderColor:     Colors.ACCENT,
  },

  // Add set
  addSetBtn: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            6,
    paddingVertical: Spacing.S3,
    marginTop:      Spacing.S2,
    borderRadius:   Radius.SM,
    borderWidth:    StyleSheet.hairlineWidth,
    borderColor:    Colors.BORDER,
    borderStyle:    'dashed',
  },
  addSetText: {
    fontSize:   13,
    color:      Colors.TEXT_TERTIARY,
    fontWeight: '500',
  },

  // Notes
  notesWrap: {
    marginTop: Spacing.S4,
  },
  notesInput: {
    backgroundColor:   Colors.BG_SURFACE,
    borderRadius:      Radius.MD,
    padding:           Spacing.S3,
    fontSize:          13,
    color:             Colors.TEXT_PRIMARY,
    borderWidth:       StyleSheet.hairlineWidth,
    borderColor:       Colors.BORDER,
    minHeight:         48,
  },

  // Volume row
  volumeRow: {
    flexDirection:   'row',
    marginTop:       Spacing.S5,
    backgroundColor: Colors.BG_SURFACE,
    borderRadius:    Radius.LG,
    borderWidth:     StyleSheet.hairlineWidth,
    borderColor:     Colors.BORDER,
    overflow:        'hidden',
  },
  volumeItem: {
    flex:           1,
    alignItems:     'center',
    paddingVertical: Spacing.S3,
    gap:            3,
  },
  volumeSep: {
    width:           StyleSheet.hairlineWidth,
    backgroundColor: Colors.BORDER,
    marginVertical:  Spacing.S2,
  },
  volumeValue: {
    fontSize:     18,
    fontWeight:   '700',
    color:        Colors.TEXT_PRIMARY,
    letterSpacing: -0.5,
    fontFamily:   'monospace',
  },
  volumeLabel: {
    fontSize:      9,
    color:         Colors.TEXT_TERTIARY,
    fontWeight:    '500',
    textTransform: 'uppercase',
    letterSpacing: 0.05,
  },
});

const timerStyles = StyleSheet.create({
  overlay: {
    flex:            1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent:  'flex-end',
  },
  sheet: {
    backgroundColor: Colors.BG_SURFACE,
    borderTopLeftRadius:  Radius.XL,
    borderTopRightRadius: Radius.XL,
    padding:         Spacing.S6,
    alignItems:      'center',
    gap:             Spacing.S4,
  },
  handle: {
    width:           40,
    height:          4,
    borderRadius:    2,
    backgroundColor: Colors.BG_SURFACE_3,
    marginBottom:    Spacing.S2,
  },
  label: {
    fontSize:      11,
    fontWeight:    '600',
    color:         Colors.TEXT_TERTIARY,
    textTransform: 'uppercase',
    letterSpacing: 0.1,
  },
  timerWrap: {
    alignItems:     'center',
    justifyContent: 'center',
    marginVertical: Spacing.S4,
  },
  timerRingOuter: {
    width:          160,
    height:         160,
    borderRadius:   80,
    alignItems:     'center',
    justifyContent: 'center',
    position:       'relative',
  },
  timerRingFill: {
    position:     'absolute',
    width:        160,
    height:       160,
    borderRadius: 80,
    borderWidth:  10,
  },
  timerRingTrack: {
    position:        'absolute',
    width:           160,
    height:          160,
    borderRadius:    80,
    borderWidth:     10,
    borderColor:     Colors.BG_SURFACE_3,
    opacity:         0.4,
  },
  timerNum: {
    fontSize:     48,
    fontWeight:   '700',
    fontFamily:   'monospace',
    letterSpacing: -2,
  },
  presets: {
    flexDirection: 'row',
    gap:           8,
  },
  presetBtn: {
    paddingHorizontal: 14,
    paddingVertical:   8,
    borderRadius:      Radius.FULL,
    backgroundColor:   Colors.BG_SURFACE_2,
    borderWidth:       StyleSheet.hairlineWidth,
    borderColor:       Colors.BORDER,
  },
  presetBtnActive: {
    backgroundColor: Colors.ACCENT_DIM,
    borderColor:     Colors.ACCENT,
  },
  presetText: {
    fontSize:   12,
    color:      Colors.TEXT_SECONDARY,
    fontWeight: '500',
  },
  presetTextActive: {
    color: Colors.ACCENT,
  },
  controls: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.S4,
    width:         '100%',
    justifyContent: 'center',
  },
  controlBtn: {
    width:           48,
    height:          48,
    borderRadius:    24,
    backgroundColor: Colors.BG_SURFACE_2,
    borderWidth:     StyleSheet.hairlineWidth,
    borderColor:     Colors.BORDER,
    alignItems:      'center',
    justifyContent:  'center',
  },
  skipBtn: {
    flex:            1,
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             6,
    backgroundColor: Colors.ACCENT,
    borderRadius:    Radius.FULL,
    paddingVertical: 14,
  },
  skipText: {
    fontSize:   14,
    fontWeight: '700',
    color:      Colors.BG_BASE,
  },
});

const prStyles = StyleSheet.create({
  banner: {
    position:          'absolute',
    top:               100,
    left:              Spacing.S5,
    right:             Spacing.S5,
    zIndex:            100,
    flexDirection:     'row',
    alignItems:        'center',
    gap:               Spacing.S3,
    backgroundColor:   Colors.ACCENT,
    borderRadius:      Radius.LG,
    paddingHorizontal: Spacing.S4,
    paddingVertical:   Spacing.S3,
  },
  bannerText: {
    flex: 1,
    gap:  2,
  },
  bannerTitle: {
    fontSize:   13,
    fontWeight: '700',
    color:      Colors.BG_BASE,
  },
  bannerSub: {
    fontSize: 11,
    color:    Colors.BG_BASE + 'cc',
  },
});

const completeStyles = StyleSheet.create({
  overlay: {
    flex:            1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    alignItems:      'center',
    justifyContent:  'center',
    padding:         Spacing.S5,
  },
  sheet: {
    backgroundColor: Colors.BG_SURFACE,
    borderRadius:    Radius.XL,
    padding:         Spacing.S6,
    alignItems:      'center',
    gap:             Spacing.S4,
    width:           '100%',
  },
  title: {
    fontSize:     24,
    fontWeight:   '700',
    color:        Colors.TEXT_PRIMARY,
    letterSpacing: -0.5,
  },
  sub: {
    fontSize:    14,
    color:       Colors.TEXT_SECONDARY,
    marginTop:   -Spacing.S2,
  },
  stats: {
    flexDirection:   'row',
    backgroundColor: Colors.BG_SURFACE_2,
    borderRadius:    Radius.LG,
    overflow:        'hidden',
    width:           '100%',
    borderWidth:     StyleSheet.hairlineWidth,
    borderColor:     Colors.BORDER,
  },
  statItem: {
    flex:           1,
    alignItems:     'center',
    paddingVertical: Spacing.S4,
    gap:            4,
  },
  statSep: {
    width:           StyleSheet.hairlineWidth,
    backgroundColor: Colors.BORDER,
    marginVertical:  Spacing.S3,
  },
  statValue: {
    fontSize:     20,
    fontWeight:   '700',
    color:        Colors.TEXT_PRIMARY,
    letterSpacing: -0.5,
    fontFamily:   'monospace',
  },
  statLabel: {
    fontSize:      9,
    color:         Colors.TEXT_TERTIARY,
    textTransform: 'uppercase',
    letterSpacing: 0.05,
    fontWeight:    '500',
  },
  saveBtn: {
    backgroundColor: Colors.ACCENT,
    borderRadius:    Radius.FULL,
    paddingVertical: 14,
    width:           '100%',
    alignItems:      'center',
  },
  saveBtnText: {
    fontSize:   15,
    fontWeight: '700',
    color:      Colors.BG_BASE,
  },
  discardBtn: {
    paddingVertical: 8,
  },
  discardText: {
    fontSize: 14,
    color:    Colors.TEXT_TERTIARY,
  },
});
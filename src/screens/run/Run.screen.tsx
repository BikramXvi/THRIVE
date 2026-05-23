import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius } from '../../constants/theme';

type RunState = 'idle' | 'running' | 'paused';
type ActivityType = 'run' | 'walk' | 'hike' | 'cycle';

interface Split {
  km:       number;
  pace:     string;
  duration: number;
}

interface RunRecord {
  id:       string;
  date:     string;
  type:     ActivityType;
  distance: number;
  duration: number;
  pace:     string;
  calories: number;
  elevation: number;
}

const ACTIVITY_TYPES: {
  id:    ActivityType;
  label: string;
  icon:  keyof typeof Ionicons.glyphMap;
  color: string;
}[] = [
  { id: 'run',   label: 'Run',   icon: 'walk-outline',    color: Colors.ACCENT },
  { id: 'walk',  label: 'Walk',  icon: 'footsteps-outline', color: Colors.BLUE  },
  { id: 'hike',  label: 'Hike',  icon: 'trail-sign-outline', color: Colors.TEAL },
  { id: 'cycle', label: 'Cycle', icon: 'bicycle-outline',  color: Colors.ORANGE},
];

const RUN_HISTORY: RunRecord[] = [
  { id: 'r1', date: 'Today',     type: 'run',   distance: 0,   duration: 0,    pace: '--',    calories: 0,   elevation: 0   },
  { id: 'r2', date: 'Yesterday', type: 'run',   distance: 6.2, duration: 1824, pace: '4:54',  calories: 412, elevation: 48  },
  { id: 'r3', date: 'Mon',       type: 'walk',  distance: 3.1, duration: 2280, pace: '12:15', calories: 180, elevation: 12  },
  { id: 'r4', date: 'Sat',       type: 'run',   distance: 10,  duration: 3060, pace: '5:06',  calories: 680, elevation: 95  },
  { id: 'r5', date: 'Fri',       type: 'hike',  distance: 8.4, duration: 7200, pace: '--',    calories: 820, elevation: 540 },
  { id: 'r6', date: 'Thu',       type: 'run',   distance: 5,   duration: 1500, pace: '5:00',  calories: 340, elevation: 32  },
];

const WEEK_KM = [0, 6.2, 3.1, 0, 10, 8.4, 5];
const WEEK_DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const WEEK_MAX = Math.max(...WEEK_KM);

const PERSONAL_BESTS = [
  { label: 'Fastest 1K',  value: '4:12', icon: 'flash-outline'    as keyof typeof Ionicons.glyphMap, color: Colors.ACCENT },
  { label: 'Fastest 5K',  value: '24:38', icon: 'trophy-outline'  as keyof typeof Ionicons.glyphMap, color: Colors.BLUE   },
  { label: 'Longest run', value: '21.1K', icon: 'map-outline'     as keyof typeof Ionicons.glyphMap, color: Colors.TEAL   },
  { label: 'Best pace',   value: '4:05',  icon: 'speedometer-outline' as keyof typeof Ionicons.glyphMap, color: Colors.ORANGE },
];

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatPace(distanceKm: number, seconds: number): string {
  if (distanceKm === 0) return '--:--';
  const secsPerKm = seconds / distanceKm;
  const m = Math.floor(secsPerKm / 60);
  const s = Math.round(secsPerKm % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(2)}km`;
}

export function RunScreen() {
  const [runState,      setRunState]      = useState<RunState>('idle');
  const [activityType,  setActivityType]  = useState<ActivityType>('run');
  const [elapsedSecs,   setElapsedSecs]   = useState(0);
  const [distanceKm,    setDistanceKm]    = useState(0);
  const [splits,        setSplits]        = useState<Split[]>([]);
  const [lastSplitKm,   setLastSplitKm]   = useState(0);
  const [calories,      setCalories]      = useState(0);
  const [showHistory,   setShowHistory]   = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (runState === 'running') {
      intervalRef.current = setInterval(() => {
        setElapsedSecs((s) => s + 1);
        setDistanceKm((d) => {
          const newD = d + 0.0014;
          setCalories(Math.round(newD * 65));
          return newD;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [runState]);

  useEffect(() => {
    const nextSplitKm = Math.floor(distanceKm) + 1;
    if (distanceKm >= lastSplitKm + 1 && distanceKm > 0) {
      const splitKm = Math.floor(distanceKm);
      setSplits((prev) => [
        ...prev,
        {
          km:       splitKm,
          pace:     formatPace(1, elapsedSecs - (prev.length > 0 ? prev.reduce((s, p) => s + p.duration, 0) : 0)),
          duration: elapsedSecs,
        },
      ]);
      setLastSplitKm(distanceKm);
    }
  }, [distanceKm]);

  function startRun() {
    setRunState('running');
    setElapsedSecs(0);
    setDistanceKm(0);
    setSplits([]);
    setLastSplitKm(0);
    setCalories(0);
  }

  function pauseRun() {
    setRunState('paused');
  }

  function resumeRun() {
    setRunState('running');
  }

  function endRun() {
    setRunState('idle');
  }

  const currentActivity = ACTIVITY_TYPES.find((a) => a.id === activityType)!;
  const pace = formatPace(distanceKm, elapsedSecs);
  const totalWeekKm = WEEK_KM.reduce((s, k) => s + k, 0);

  if (runState !== 'idle') {
    return (
      <View style={styles.root}>

        {/* Live tracker header */}
        <View style={styles.liveHeader}>
          <View style={styles.liveHeaderLeft}>
            <View style={[styles.liveDot, runState === 'running' && styles.liveDotActive]} />
            <Text style={styles.liveLabel}>
              {runState === 'running' ? 'Live' : 'Paused'}
            </Text>
          </View>
          <TouchableOpacity style={styles.endBtn} onPress={endRun}>
            <Text style={styles.endBtnText}>End</Text>
          </TouchableOpacity>
        </View>

        {/* Map placeholder */}
        <View style={styles.mapArea}>
          <View style={styles.mapGrid} />
          <View style={styles.mapContent}>
            <View style={styles.mapRoute}>
              <View style={styles.mapRouteLine} />
              <View style={styles.mapDot} />
            </View>
            <View style={styles.mapLocationBadge}>
              <Ionicons name="location" size={12} color={Colors.ACCENT} />
              <Text style={styles.mapLocationText}>Kathmandu</Text>
            </View>
          </View>
        </View>

        {/* Live stats */}
        <View style={styles.liveStats}>
          <View style={styles.liveStatPrimary}>
            <Text style={styles.liveDistance}>
              {distanceKm.toFixed(2)}
            </Text>
            <Text style={styles.liveDistanceUnit}>km</Text>
          </View>

          <View style={styles.liveStatRow}>
            <View style={styles.liveStat}>
              <Text style={styles.liveStatValue}>{formatTime(elapsedSecs)}</Text>
              <Text style={styles.liveStatLabel}>Duration</Text>
            </View>
            <View style={styles.liveStatSep} />
            <View style={styles.liveStat}>
              <Text style={[styles.liveStatValue, { color: Colors.ACCENT }]}>{pace}</Text>
              <Text style={styles.liveStatLabel}>Pace /km</Text>
            </View>
            <View style={styles.liveStatSep} />
            <View style={styles.liveStat}>
              <Text style={[styles.liveStatValue, { color: Colors.ORANGE }]}>{calories}</Text>
              <Text style={styles.liveStatLabel}>kcal</Text>
            </View>
          </View>
        </View>

        {/* Splits */}
        {splits.length > 0 && (
          <View style={styles.splitsWrap}>
            <Text style={styles.splitsTitle}>Splits</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.splitsRow}>
                {splits.map((split) => (
                  <View key={split.km} style={styles.splitChip}>
                    <Text style={styles.splitKm}>KM {split.km}</Text>
                    <Text style={styles.splitPace}>{split.pace}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Controls */}
        <View style={styles.liveControls}>
          <TouchableOpacity style={styles.controlSecondary}>
            <Ionicons name="flag-outline" size={20} color={Colors.TEXT_SECONDARY} />
          </TouchableOpacity>

          {runState === 'running' ? (
            <TouchableOpacity style={styles.controlPrimary} onPress={pauseRun}>
              <Ionicons name="pause" size={28} color={Colors.BG_BASE} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.controlPrimary} onPress={resumeRun}>
              <Ionicons name="play" size={28} color={Colors.BG_BASE} />
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.controlSecondary}>
            <Ionicons name="musical-notes-outline" size={20} color={Colors.TEXT_SECONDARY} />
          </TouchableOpacity>
        </View>

      </View>
    );
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Ready to move?</Text>
          <Text style={styles.title}>Run</Text>
        </View>
        <TouchableOpacity
          style={styles.historyBtn}
          onPress={() => setShowHistory((s) => !s)}
        >
          <Ionicons name="time-outline" size={16} color={Colors.TEXT_SECONDARY} />
          <Text style={styles.historyBtnText}>History</Text>
        </TouchableOpacity>
      </View>

      {/* Activity type selector */}
      <View style={styles.activityRow}>
        {ACTIVITY_TYPES.map((a) => (
          <TouchableOpacity
            key={a.id}
            style={[
              styles.activityBtn,
              activityType === a.id && styles.activityBtnActive,
              activityType === a.id && { borderColor: a.color + '60' },
            ]}
            onPress={() => setActivityType(a.id)}
          >
            <Ionicons
              name={a.icon}
              size={20}
              color={activityType === a.id ? a.color : Colors.TEXT_TERTIARY}
            />
            <Text style={[
              styles.activityLabel,
              activityType === a.id && { color: a.color },
            ]}>
              {a.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Start button */}
      <TouchableOpacity
        style={[styles.startRunCard, { backgroundColor: currentActivity.color }]}
        activeOpacity={0.85}
        onPress={startRun}
      >
        <View style={styles.startRunInner}>
          <View style={styles.startRunPlayBtn}>
            <Ionicons name="play" size={32} color={currentActivity.color} />
          </View>
          <Text style={styles.startRunText}>Start {currentActivity.label}</Text>
          <Text style={styles.startRunSub}>GPS · pace · splits · map</Text>
        </View>
      </TouchableOpacity>

      {/* Weekly summary */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardEyebrow}>This week</Text>
          <Text style={styles.cardValue}>
            <Text style={{ color: Colors.ACCENT }}>{totalWeekKm.toFixed(1)}</Text>
            <Text style={styles.cardUnit}> km</Text>
          </Text>
        </View>

        {/* Bar chart */}
        <View style={styles.weekChart}>
          {WEEK_KM.map((km, i) => {
            const isToday = i === new Date().getDay();
            const heightPct = WEEK_MAX > 0 ? km / WEEK_MAX : 0;
            return (
              <View key={i} style={styles.weekBarCol}>
                <View style={styles.weekBarTrack}>
                  <View style={[
                    styles.weekBarFill,
                    {
                      height:          `${Math.round(heightPct * 100)}%` as any,
                      backgroundColor: isToday ? Colors.ACCENT : Colors.BG_SURFACE_3,
                      opacity:         km === 0 ? 0.3 : isToday ? 1 : 0.6,
                    },
                  ]} />
                </View>
                <Text style={[
                  styles.weekBarLabel,
                  isToday && { color: Colors.ACCENT, fontWeight: '600' },
                ]}>
                  {WEEK_DAYS[i]}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Week stats row */}
        <View style={styles.weekStatsRow}>
          <View style={styles.weekStatItem}>
            <Text style={styles.weekStatValue}>5</Text>
            <Text style={styles.weekStatLabel}>Activities</Text>
          </View>
          <View style={styles.weekStatSep} />
          <View style={styles.weekStatItem}>
            <Text style={[styles.weekStatValue, { color: Colors.ORANGE }]}>2,432</Text>
            <Text style={styles.weekStatLabel}>kcal</Text>
          </View>
          <View style={styles.weekStatSep} />
          <View style={styles.weekStatItem}>
            <Text style={[styles.weekStatValue, { color: Colors.TEAL }]}>695</Text>
            <Text style={styles.weekStatLabel}>m elevation</Text>
          </View>
        </View>
      </View>

      {/* Personal bests */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionEyebrow}>Personal bests</Text>
      </View>
      <View style={styles.pbGrid}>
        {PERSONAL_BESTS.map((pb) => (
          <View key={pb.label} style={styles.pbCard}>
            <Ionicons name={pb.icon} size={16} color={pb.color} />
            <Text style={[styles.pbValue, { color: pb.color }]}>{pb.value}</Text>
            <Text style={styles.pbLabel}>{pb.label}</Text>
          </View>
        ))}
      </View>

      {/* Recent activities */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionEyebrow}>Recent</Text>
        <TouchableOpacity>
          <Text style={styles.seeAll}>See all</Text>
        </TouchableOpacity>
      </View>

      {RUN_HISTORY.filter((r) => r.distance > 0).map((run) => {
        const activity = ACTIVITY_TYPES.find((a) => a.id === run.type)!;
        return (
          <Pressable key={run.id} style={styles.runRow}>
            <View style={[styles.runIcon, { backgroundColor: activity.color + '15' }]}>
              <Ionicons name={activity.icon} size={18} color={activity.color} />
            </View>
            <View style={styles.runInfo}>
              <View style={styles.runInfoTop}>
                <Text style={styles.runType}>{activity.label}</Text>
                <Text style={styles.runDate}>{run.date}</Text>
              </View>
              <View style={styles.runStats}>
                <Text style={styles.runDist}>{run.distance}km</Text>
                <View style={styles.runStatDot} />
                <Text style={styles.runMeta}>{formatTime(run.duration)}</Text>
                {run.pace !== '--' && (
                  <>
                    <View style={styles.runStatDot} />
                    <Text style={styles.runMeta}>{run.pace}/km</Text>
                  </>
                )}
                {run.elevation > 0 && (
                  <>
                    <View style={styles.runStatDot} />
                    <Ionicons name="trending-up-outline" size={11} color={Colors.TEXT_TERTIARY} />
                    <Text style={styles.runMeta}>{run.elevation}m</Text>
                  </>
                )}
              </View>
            </View>
            <Text style={styles.runCals}>{run.calories} kcal</Text>
          </Pressable>
        );
      })}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex:            1,
    backgroundColor: Colors.BG_BASE,
  },
  scroll: {
    paddingTop:    56,
    paddingBottom: 48,
  },

  // Header
  header: {
    flexDirection:     'row',
    justifyContent:    'space-between',
    alignItems:        'flex-start',
    paddingHorizontal: Spacing.S5,
    marginBottom:      Spacing.S5,
  },
  eyebrow: {
    fontSize:      12,
    color:         Colors.TEXT_TERTIARY,
    fontWeight:    '500',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom:  3,
  },
  title: {
    fontSize:     30,
    fontWeight:   '700',
    color:        Colors.TEXT_PRIMARY,
    letterSpacing: -1,
  },
  historyBtn: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             5,
    paddingVertical: 8,
  },
  historyBtnText: {
    fontSize:   13,
    color:      Colors.TEXT_SECONDARY,
    fontWeight: '500',
  },

  // Activity selector
  activityRow: {
    flexDirection:     'row',
    paddingHorizontal: Spacing.S5,
    gap:               8,
    marginBottom:      Spacing.S4,
  },
  activityBtn: {
    flex:            1,
    alignItems:      'center',
    paddingVertical: Spacing.S3,
    gap:             5,
    backgroundColor: Colors.BG_SURFACE,
    borderRadius:    Radius.MD,
    borderWidth:     StyleSheet.hairlineWidth,
    borderColor:     Colors.BORDER,
  },
  activityBtnActive: {
    backgroundColor: Colors.BG_SURFACE_2,
    borderWidth:     1.5,
  },
  activityLabel: {
    fontSize:   10,
    color:      Colors.TEXT_TERTIARY,
    fontWeight: '500',
  },

  // Start button
  startRunCard: {
    marginHorizontal: Spacing.S5,
    marginBottom:     Spacing.S5,
    borderRadius:     Radius.LG,
    padding:          Spacing.S6,
    alignItems:       'center',
  },
  startRunInner: {
    alignItems: 'center',
    gap:        Spacing.S3,
  },
  startRunPlayBtn: {
    width:           80,
    height:          80,
    borderRadius:    40,
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignItems:      'center',
    justifyContent:  'center',
    marginBottom:    Spacing.S2,
  },
  startRunText: {
    fontSize:     22,
    fontWeight:   '700',
    color:        Colors.BG_BASE,
    letterSpacing: -0.5,
  },
  startRunSub: {
    fontSize:   12,
    color:      Colors.BG_BASE + 'aa',
    fontWeight: '500',
  },

  // Card
  card: {
    marginHorizontal: Spacing.S5,
    marginBottom:     Spacing.S5,
    backgroundColor:  Colors.BG_SURFACE,
    borderRadius:     Radius.LG,
    padding:          Spacing.S4,
    borderWidth:      StyleSheet.hairlineWidth,
    borderColor:      Colors.BORDER,
  },
  cardHeader: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    marginBottom:   Spacing.S4,
  },
  cardEyebrow: {
    fontSize:      11,
    fontWeight:    '600',
    color:         Colors.TEXT_TERTIARY,
    textTransform: 'uppercase',
    letterSpacing: 0.1,
  },
  cardValue: {
    fontSize:     20,
    fontWeight:   '700',
    color:        Colors.TEXT_PRIMARY,
    letterSpacing: -0.5,
  },
  cardUnit: {
    fontSize:   14,
    color:      Colors.TEXT_TERTIARY,
    fontWeight: '400',
  },

  // Week chart
  weekChart: {
    flexDirection: 'row',
    height:        64,
    gap:           4,
    alignItems:    'flex-end',
    marginBottom:  Spacing.S4,
  },
  weekBarCol: {
    flex:      1,
    alignItems: 'center',
    gap:        5,
  },
  weekBarTrack: {
    flex:           1,
    width:          '100%',
    justifyContent: 'flex-end',
  },
  weekBarFill: {
    width:        '100%',
    borderRadius: 3,
    minHeight:    3,
  },
  weekBarLabel: {
    fontSize:  9,
    color:     Colors.TEXT_TERTIARY,
    fontWeight: '500',
  },

  // Week stats
  weekStatsRow: {
    flexDirection:   'row',
    borderTopWidth:  StyleSheet.hairlineWidth,
    borderTopColor:  Colors.BORDER,
    paddingTop:      Spacing.S3,
  },
  weekStatItem: {
    flex:       1,
    alignItems: 'center',
    gap:        3,
  },
  weekStatSep: {
    width:           StyleSheet.hairlineWidth,
    backgroundColor: Colors.BORDER,
    marginVertical:  4,
  },
  weekStatValue: {
    fontSize:     16,
    fontWeight:   '700',
    color:        Colors.TEXT_PRIMARY,
    letterSpacing: -0.3,
  },
  weekStatLabel: {
    fontSize:      9,
    color:         Colors.TEXT_TERTIARY,
    fontWeight:    '500',
    textTransform: 'uppercase',
    letterSpacing: 0.05,
  },

  // Section headers
  sectionHeader: {
    flexDirection:     'row',
    justifyContent:    'space-between',
    alignItems:        'center',
    paddingHorizontal: Spacing.S5,
    marginBottom:      Spacing.S3,
  },
  sectionEyebrow: {
    fontSize:      11,
    fontWeight:    '600',
    color:         Colors.TEXT_TERTIARY,
    textTransform: 'uppercase',
    letterSpacing: 0.1,
  },
  seeAll: {
    fontSize:   12,
    color:      Colors.ACCENT,
    fontWeight: '500',
  },

  // Personal bests
  pbGrid: {
    flexDirection:     'row',
    paddingHorizontal: Spacing.S5,
    gap:               8,
    marginBottom:      Spacing.S5,
  },
  pbCard: {
    flex:            1,
    backgroundColor: Colors.BG_SURFACE,
    borderRadius:    Radius.MD,
    padding:         Spacing.S3,
    alignItems:      'center',
    gap:             4,
    borderWidth:     StyleSheet.hairlineWidth,
    borderColor:     Colors.BORDER,
  },
  pbValue: {
    fontSize:     16,
    fontWeight:   '700',
    letterSpacing: -0.3,
  },
  pbLabel: {
    fontSize:      9,
    color:         Colors.TEXT_TERTIARY,
    fontWeight:    '500',
    textTransform: 'uppercase',
    letterSpacing: 0.05,
    textAlign:     'center',
  },

  // Run history rows
  runRow: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: Spacing.S5,
    paddingVertical:   Spacing.S3,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.BORDER,
    gap:               Spacing.S3,
  },
  runIcon: {
    width:          40,
    height:         40,
    borderRadius:   12,
    alignItems:     'center',
    justifyContent: 'center',
  },
  runInfo: {
    flex: 1,
    gap:  3,
  },
  runInfoTop: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
  },
  runType: {
    fontSize:   14,
    fontWeight: '500',
    color:      Colors.TEXT_PRIMARY,
  },
  runDate: {
    fontSize: 11,
    color:    Colors.TEXT_TERTIARY,
  },
  runStats: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           5,
  },
  runDist: {
    fontSize:   13,
    fontWeight: '600',
    color:      Colors.ACCENT,
    fontFamily: 'monospace',
  },
  runStatDot: {
    width:           3,
    height:          3,
    borderRadius:    1.5,
    backgroundColor: Colors.TEXT_TERTIARY,
  },
  runMeta: {
    fontSize:   11,
    color:      Colors.TEXT_TERTIARY,
    fontFamily: 'monospace',
  },
  runCals: {
    fontSize:   11,
    color:      Colors.TEXT_TERTIARY,
    fontWeight: '500',
  },

  // Live tracker styles
  liveHeader: {
    flexDirection:     'row',
    justifyContent:    'space-between',
    alignItems:        'center',
    paddingHorizontal: Spacing.S5,
    paddingTop:        56,
    paddingBottom:     Spacing.S3,
  },
  liveHeaderLeft: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           6,
  },
  liveDot: {
    width:           8,
    height:          8,
    borderRadius:    4,
    backgroundColor: Colors.TEXT_TERTIARY,
  },
  liveDotActive: {
    backgroundColor: Colors.RED,
  },
  liveLabel: {
    fontSize:   13,
    fontWeight: '600',
    color:      Colors.TEXT_PRIMARY,
  },
  endBtn: {
    paddingHorizontal: 20,
    paddingVertical:   8,
    borderRadius:      Radius.FULL,
    backgroundColor:   Colors.RED_DIM,
    borderWidth:       StyleSheet.hairlineWidth,
    borderColor:       Colors.RED + '40',
  },
  endBtnText: {
    fontSize:   13,
    fontWeight: '600',
    color:      Colors.RED,
  },

  // Map area
  mapArea: {
    height:          220,
    marginHorizontal: Spacing.S5,
    borderRadius:    Radius.LG,
    overflow:        'hidden',
    backgroundColor: Colors.BG_SURFACE,
    borderWidth:     StyleSheet.hairlineWidth,
    borderColor:     Colors.BORDER,
    marginBottom:    Spacing.S4,
    position:        'relative',
  },
  mapGrid: {
    position:   'absolute',
    inset:       0,
    opacity:     0.15,
  },
  mapContent: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
  },
  mapRoute: {
    alignItems: 'center',
    gap:        4,
  },
  mapRouteLine: {
    width:           2,
    height:          80,
    backgroundColor: Colors.ACCENT,
    borderRadius:    1,
    opacity:         0.6,
  },
  mapDot: {
    width:           14,
    height:          14,
    borderRadius:    7,
    backgroundColor: Colors.ACCENT,
    borderWidth:     3,
    borderColor:     Colors.BG_BASE,
  },
  mapLocationBadge: {
    position:          'absolute',
    bottom:            12,
    right:             12,
    flexDirection:     'row',
    alignItems:        'center',
    gap:               4,
    backgroundColor:   Colors.BG_SURFACE_2,
    borderRadius:      Radius.FULL,
    paddingHorizontal: 10,
    paddingVertical:   5,
    borderWidth:       StyleSheet.hairlineWidth,
    borderColor:       Colors.BORDER,
  },
  mapLocationText: {
    fontSize:   11,
    color:      Colors.TEXT_SECONDARY,
    fontWeight: '500',
  },

  // Live stats
  liveStats: {
    paddingHorizontal: Spacing.S5,
    marginBottom:      Spacing.S4,
    alignItems:        'center',
    gap:               Spacing.S4,
  },
  liveStatPrimary: {
    flexDirection: 'row',
    alignItems:    'baseline',
    gap:           6,
  },
  liveDistance: {
    fontSize:     64,
    fontWeight:   '700',
    color:        Colors.TEXT_PRIMARY,
    letterSpacing: -3,
    fontFamily:   'monospace',
    lineHeight:   68,
  },
  liveDistanceUnit: {
    fontSize:   22,
    color:      Colors.TEXT_SECONDARY,
    fontWeight: '400',
  },
  liveStatRow: {
    flexDirection:   'row',
    width:           '100%',
    backgroundColor: Colors.BG_SURFACE,
    borderRadius:    Radius.LG,
    borderWidth:     StyleSheet.hairlineWidth,
    borderColor:     Colors.BORDER,
    overflow:        'hidden',
  },
  liveStat: {
    flex:           1,
    alignItems:     'center',
    paddingVertical: Spacing.S3,
    gap:            3,
  },
  liveStatSep: {
    width:           StyleSheet.hairlineWidth,
    backgroundColor: Colors.BORDER,
    marginVertical:  Spacing.S2,
  },
  liveStatValue: {
    fontSize:     18,
    fontWeight:   '700',
    color:        Colors.TEXT_PRIMARY,
    letterSpacing: -0.5,
    fontFamily:   'monospace',
  },
  liveStatLabel: {
    fontSize:      9,
    color:         Colors.TEXT_TERTIARY,
    fontWeight:    '500',
    textTransform: 'uppercase',
    letterSpacing: 0.05,
  },

  // Splits
  splitsWrap: {
    paddingHorizontal: Spacing.S5,
    marginBottom:      Spacing.S4,
  },
  splitsTitle: {
    fontSize:      11,
    fontWeight:    '600',
    color:         Colors.TEXT_TERTIARY,
    textTransform: 'uppercase',
    letterSpacing: 0.1,
    marginBottom:  Spacing.S2,
  },
  splitsRow: {
    flexDirection: 'row',
    gap:           8,
  },
  splitChip: {
    backgroundColor:   Colors.BG_SURFACE,
    borderRadius:      Radius.MD,
    paddingHorizontal: 14,
    paddingVertical:   Spacing.S2,
    alignItems:        'center',
    gap:               2,
    borderWidth:       StyleSheet.hairlineWidth,
    borderColor:       Colors.BORDER,
  },
  splitKm: {
    fontSize:      9,
    color:         Colors.TEXT_TERTIARY,
    fontWeight:    '600',
    textTransform: 'uppercase',
    letterSpacing: 0.08,
  },
  splitPace: {
    fontSize:   14,
    fontWeight: '700',
    color:      Colors.ACCENT,
    fontFamily: 'monospace',
  },

  // Live controls
  liveControls: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'center',
    gap:               Spacing.S6,
    paddingHorizontal: Spacing.S5,
    paddingBottom:     48,
    paddingTop:        Spacing.S4,
  },
  controlPrimary: {
    width:           72,
    height:          72,
    borderRadius:    36,
    backgroundColor: Colors.ACCENT,
    alignItems:      'center',
    justifyContent:  'center',
  },
  controlSecondary: {
    width:           48,
    height:          48,
    borderRadius:    24,
    backgroundColor: Colors.BG_SURFACE,
    borderWidth:     StyleSheet.hairlineWidth,
    borderColor:     Colors.BORDER,
    alignItems:      'center',
    justifyContent:  'center',
  },
});
import { useState, useEffect, useRef } from 'react';
import { runService } from '../../services/run.service';
import type { RunSessionRow } from '../../services/run.service';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { supabase } from '../../lib/supabase';
import { useUIStore } from '../../stores/ui.store';
import { Colors, Spacing, Radius } from '../../constants/theme';
import { useSafeTop } from '../../hooks/useSafeTop';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';

type RunState    = 'idle' | 'running' | 'paused';
type ActivityType = 'run' | 'walk' | 'hike' | 'cycle';

interface Split {
  km:       number;
  pace:     string;
  duration: number;
}

interface Coordinate {
  latitude:  number;
  longitude: number;
  altitude:  number | null;
}

const ACTIVITY_TYPES: {
  id:    ActivityType;
  label: string;
  icon:  keyof typeof Ionicons.glyphMap;
  color: string;
}[] = [
  { id: 'run',   label: 'Run',   icon: 'walk-outline',       color: Colors.ACCENT },
  { id: 'walk',  label: 'Walk',  icon: 'footsteps-outline',  color: Colors.BLUE   },
  { id: 'hike',  label: 'Hike',  icon: 'trail-sign-outline', color: Colors.TEAL   },
  { id: 'cycle', label: 'Cycle', icon: 'bicycle-outline',    color: Colors.ORANGE },
];

const PERSONAL_BESTS = [
  { label: 'Fastest 1K',  value: '4:12',  icon: 'flash-outline'       as keyof typeof Ionicons.glyphMap, color: Colors.ACCENT },
  { label: 'Fastest 5K',  value: '24:38', icon: 'trophy-outline'      as keyof typeof Ionicons.glyphMap, color: Colors.BLUE   },
  { label: 'Longest run', value: '21.1K', icon: 'map-outline'         as keyof typeof Ionicons.glyphMap, color: Colors.TEAL   },
  { label: 'Best pace',   value: '4:05',  icon: 'speedometer-outline' as keyof typeof Ionicons.glyphMap, color: Colors.ORANGE },
];

const WEEK_DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatPace(distanceKm: number, seconds: number): string {
  if (distanceKm < 0.01) return '--:--';
  const secsPerKm = seconds / distanceKm;
  const m = Math.floor(secsPerKm / 60);
  const s = Math.round(secsPerKm % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function haversineDistance(a: Coordinate, b: Coordinate): number {
  const R    = 6371000; // meters
  const lat1 = (a.latitude  * Math.PI) / 180;
  const lat2 = (b.latitude  * Math.PI) / 180;
  const dLat = ((b.latitude  - a.latitude)  * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const x    = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
               Math.cos(lat1) * Math.cos(lat2) *
               Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export function RunScreen() {
  const safeTop = useSafeTop();

  // Data state
  const [userId,      setUserId]      = useState<string | null>(null);
  const [runHistory,  setRunHistory]  = useState<RunSessionRow[]>([]);
  const [weekKm,      setWeekKm]      = useState([0,0,0,0,0,0,0]);
  const [loadingHist, setLoadingHist] = useState(true);

  // Run state
  const [runState,      setRunState]      = useState<RunState>('idle');
  const [activityType,  setActivityType]  = useState<ActivityType>('run');
  const [elapsedSecs,   setElapsedSecs]   = useState(0);
  const [distanceM,     setDistanceM]     = useState(0);
  const [splits,        setSplits]        = useState<Split[]>([]);
  const [calories,      setCalories]      = useState(0);
  const [elevationGain, setElevationGain] = useState(0);
  const [currentLocation, setCurrentLocation] = useState<Coordinate | null>(null);
  const [locationError,   setLocationError]   = useState<string | null>(null);
  const [gpsReady,        setGpsReady]        = useState(false);

  const intervalRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const locationRef      = useRef<Location.LocationSubscription | null>(null);
  const lastLocationRef  = useRef<Coordinate | null>(null);
  const lastSplitMRef    = useRef(0);
  const routeRef         = useRef<Coordinate[]>([]);
  const startTimeRef     = useRef<string>('');

  // Load data on focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );



  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const [histRes, weekRes] = await Promise.all([
      runService.getSessions(user.id, 10),
      runService.getWeeklyKm(user.id),
    ]);

    if (histRes.data)  setRunHistory(histRes.data);
    if (weekRes.data)  setWeekKm(weekRes.data);
    setLoadingHist(false);
  }

  // Timer
  useEffect(() => {
    if (runState === 'running') {
      intervalRef.current = setInterval(() => {
        setElapsedSecs((s) => s + 1);
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [runState]);

  async function requestLocationPermission(): Promise<boolean> {
    if (Platform.OS === 'web') {
      // Web uses browser geolocation
      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const coord: Coordinate = {
              latitude:  pos.coords.latitude,
              longitude: pos.coords.longitude,
              altitude:  pos.coords.altitude,
            };
            setCurrentLocation(coord);
            lastLocationRef.current = coord;
            setGpsReady(true);
            resolve(true);
          },
          (err) => {
            setLocationError('Location access denied. Enable location in browser settings.');
            resolve(false);
          },
          { enableHighAccuracy: true }
        );
      });
    }

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setLocationError('Location permission denied. Enable it in Settings.');
      return false;
    }
    return true;
  }

  async function startLocationTracking() {
    if (Platform.OS === 'web') {
      // Web geolocation watchPosition
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const coord: Coordinate = {
            latitude:  pos.coords.latitude,
            longitude: pos.coords.longitude,
            altitude:  pos.coords.altitude,
          };
          handleLocationUpdate(coord);
        },
        (err) => console.error('GPS error:', err),
        { enableHighAccuracy: true, maximumAge: 0 }
      );
      // Store watchId for cleanup
      (locationRef as any).current = { remove: () => navigator.geolocation.clearWatch(watchId) };
      return;
    }

    const subscription = await Location.watchPositionAsync(
      {
        accuracy:          Location.Accuracy.BestForNavigation,
        timeInterval:      1000,
        distanceInterval:  5,
      },
      (loc) => {
        const coord: Coordinate = {
          latitude:  loc.coords.latitude,
          longitude: loc.coords.longitude,
          altitude:  loc.coords.altitude,
        };
        handleLocationUpdate(coord);
      }
    );
    locationRef.current = subscription;
  }

  function handleLocationUpdate(coord: Coordinate) {
    setCurrentLocation(coord);
    routeRef.current.push(coord);

    if (lastLocationRef.current) {
      const dist = haversineDistance(lastLocationRef.current, coord);

      // Filter GPS noise -- ignore jumps over 50m in 1 second
      if (dist < 50) {
        setDistanceM((prev) => {
          const newDist = prev + dist;
          setCalories(Math.round((newDist / 1000) * 65));

          // Check for splits
          const newKm = Math.floor(newDist / 1000);
          const lastKm = Math.floor(lastSplitMRef.current / 1000);
          if (newKm > lastKm && newKm > 0) {
            setElapsedSecs((secs) => {
              setSplits((prev) => [
                ...prev,
                {
                  km:       newKm,
                  pace:     formatPace(newKm, secs),
                  duration: secs,
                },
              ]);
              return secs;
            });
            lastSplitMRef.current = newDist;
          }

          return newDist;
        });

        // Elevation gain
        if (coord.altitude && lastLocationRef.current.altitude) {
          const elevDiff = coord.altitude - lastLocationRef.current.altitude;
          if (elevDiff > 0) {
            setElevationGain((prev) => prev + elevDiff);
          }
        }
      }
    }

    lastLocationRef.current = coord;
  }

  function stopLocationTracking() {
    if (locationRef.current) {
      locationRef.current.remove();
      locationRef.current = null;
    }
  }

  async function startRun() {
    setLocationError(null);
    const granted = await requestLocationPermission();
    if (!granted) return;

    startTimeRef.current = new Date().toISOString();
    setElapsedSecs(0);
    setDistanceM(0);
    setSplits([]);
    setCalories(0);
    setElevationGain(0);
    routeRef.current = [];
    lastLocationRef.current = null;
    lastSplitMRef.current = 0;

    await startLocationTracking();
    setRunState('running');
  }

  function pauseRun() {
    setRunState('paused');
    stopLocationTracking();
  }

  async function resumeRun() {
    await startLocationTracking();
    setRunState('running');
  }

  async function endRun() {
    stopLocationTracking();
    setRunState('idle');

    if (distanceM > 50 && userId) {
      const avgPace = distanceM > 0
        ? Math.round(elapsedSecs / (distanceM / 1000))
        : null;

      const { error } = await runService.saveSession({
        userId,
        activityType,
        distanceM:       Math.round(distanceM),
        durationSeconds: elapsedSecs,
        avgPaceSpm:      avgPace,
        caloriesBurned:  calories,
        splits,
      });

      if (error) {
        useUIStore.getState().showToast('Could not save run', 'error');
      } else {
        useUIStore.getState().showToast(
          `${activityType.charAt(0).toUpperCase() + activityType.slice(1)} saved! ${(distanceM / 1000).toFixed(2)}km`,
          'success'
        );
        loadData();
      }
    }
  }

  const distanceKm      = distanceM / 1000;
  const pace            = formatPace(distanceKm, elapsedSecs);
  const totalWeekKm     = weekKm.reduce((s: number, k) => s + k, 0);
  const weekMax         = Math.max(...weekKm, 1);
  const currentActivity = ACTIVITY_TYPES.find((a) => a.id === activityType)!;

  // ── Active run view ──────────────────────────────────────────────────────────
  if (runState !== 'idle') {
    return (
      <ScrollView style={styles.root}>

        {/* Header */}
        <View style={[styles.liveHeader, { paddingTop: safeTop }]}>
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
{/* Map area */}
{/* Map area */}
<View style={styles.mapArea}>
  {/* Dark grid background */}
  <View style={styles.mapGridBg} />

  {/* GPS status */}
  <View style={styles.mapTopBadge}>
    <View style={[styles.gpsStatusDot, { backgroundColor: currentLocation ? Colors.ACCENT : Colors.ORANGE }]} />
    <Text style={styles.gpsStatusText}>
      {currentLocation
        ? `GPS · ${currentLocation.latitude.toFixed(4)}, ${currentLocation.longitude.toFixed(4)}`
        : 'Acquiring GPS...'
      }
    </Text>
  </View>

  {/* Route visualization */}
  <View style={styles.mapCenter}>
    {routeRef.current.length > 1 ? (
      <View style={styles.routeContainer}>
        {routeRef.current.slice(-50).map((coord, i) => {
          const arr   = routeRef.current.slice(-50);
          const first = arr[0];
          const last  = arr[arr.length - 1];
          const latRange = Math.max(Math.abs(last.latitude  - first.latitude),  0.0001);
          const lonRange = Math.max(Math.abs(last.longitude - first.longitude), 0.0001);
          const x = ((coord.longitude - first.longitude) / lonRange) * 200 + 100;
          const y = ((coord.latitude  - first.latitude)  / latRange) * 100 + 50;
          const isCurrent = i === arr.length - 1;
          return (
            <View
              key={i}
              style={[
                styles.routePoint,
                {
                  left:   x,
                  top:    y,
                  width:  isCurrent ? 12 : 4,
                  height: isCurrent ? 12 : 4,
                  borderRadius: isCurrent ? 6 : 2,
                  backgroundColor: isCurrent ? Colors.ACCENT : Colors.ACCENT + '60',
                  shadowColor:     isCurrent ? Colors.ACCENT : 'transparent',
                  shadowRadius:    isCurrent ? 8 : 0,
                  shadowOpacity:   isCurrent ? 1 : 0,
                },
              ]}
            />
          );
        })}
      </View>
    ) : (
      <View style={styles.mapPlaceholder}>
        <Ionicons name="map-outline" size={36} color={Colors.TEXT_TERTIARY} style={{ opacity: 0.3 }} />
        <Text style={styles.mapPlaceholderText}>
          {currentLocation ? 'Start moving to see your route' : 'Waiting for GPS...'}
        </Text>
        <Text style={styles.mapPlaceholderSub}>
          Full map on mobile app
        </Text>
      </View>
    )}
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
            <View style={styles.liveStatSep} />
            <View style={styles.liveStat}>
              <Text style={[styles.liveStatValue, { color: Colors.TEAL }]}>
                {Math.round(elevationGain)}m
              </Text>
              <Text style={styles.liveStatLabel}>Elevation</Text>
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

          <TouchableOpacity style={styles.controlSecondary} onPress={endRun}>
            <Ionicons name="stop-outline" size={20} color={Colors.RED} />
          </TouchableOpacity>
        </View>

      </ScrollView>
    );
  }

  // ── Idle view ────────────────────────────────────────────────────────────────
  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.scroll, { paddingTop: safeTop }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Ready to move?</Text>
          <Text style={styles.title}>Run</Text>
        </View>
      </View>

      {/* Location error */}
      {locationError && (
        <View style={styles.locationError}>
          <Ionicons name="warning-outline" size={14} color={Colors.ORANGE} />
          <Text style={styles.locationErrorText}>{locationError}</Text>
        </View>
      )}

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
          <Text style={styles.startRunSub}>GPS · pace · splits · elevation</Text>
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

        <View style={styles.weekChart}>
          {weekKm.map((km, i) => {
            const isToday  = i === (new Date().getDay() + 6) % 7;
            const heightPct = weekMax > 0 ? km / weekMax : 0;
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

        <View style={styles.weekStatsRow}>
          <View style={styles.weekStatItem}>
            <Text style={styles.weekStatValue}>{runHistory.length}</Text>
            <Text style={styles.weekStatLabel}>Activities</Text>
          </View>
          <View style={styles.weekStatSep} />
          <View style={styles.weekStatItem}>
            <Text style={[styles.weekStatValue, { color: Colors.ORANGE }]}>
              {runHistory.reduce((s, r) => s + (r.calories_burned ?? 0), 0).toLocaleString()}
            </Text>
            <Text style={styles.weekStatLabel}>kcal</Text>
          </View>
          <View style={styles.weekStatSep} />
          <View style={styles.weekStatItem}>
            <Text style={[styles.weekStatValue, { color: Colors.TEAL }]}>
              {Math.round(runHistory.reduce((s, r) => s + 0, 0))}m
            </Text>
            <Text style={styles.weekStatLabel}>elevation</Text>
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
      </View>

      {runHistory.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="walk-outline" size={32} color={Colors.TEXT_TERTIARY} />
          <Text style={styles.emptyText}>No activities yet</Text>
          <Text style={styles.emptySub}>Start your first run above</Text>
        </View>
      ) : (
        runHistory.map((run) => {
          const activity = ACTIVITY_TYPES.find((a) => a.id === run.activity_type) ?? ACTIVITY_TYPES[0];
          return (
            <Pressable key={run.id} style={styles.runRow}>
              <View style={[styles.runIcon, { backgroundColor: activity.color + '15' }]}>
                <Ionicons name={activity.icon} size={18} color={activity.color} />
              </View>
              <View style={styles.runInfo}>
                <View style={styles.runInfoTop}>
                  <Text style={styles.runType}>{activity.label}</Text>
                  <Text style={styles.runDate}>
                    {new Date(run.started_at).toLocaleDateString('en-NP')}
                  </Text>
                </View>
                <View style={styles.runStats}>
                  <Text style={styles.runDist}>
                    {(run.distance_m / 1000).toFixed(2)}km
                  </Text>
                  <View style={styles.runStatDot} />
                  <Text style={styles.runMeta}>{formatTime(run.duration_seconds)}</Text>
                  {run.avg_pace_spm && (
                    <>
                      <View style={styles.runStatDot} />
                      <Text style={styles.runMeta}>
                        {formatPace(run.distance_m / 1000, run.duration_seconds)}/km
                      </Text>
                    </>
                  )}
                </View>
              </View>
              <Text style={styles.runCals}>{run.calories_burned ?? 0} kcal</Text>
            </Pressable>
          );
        })
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex:            1,
    backgroundColor: Colors.BG_BASE,
  },
  scroll: {
    paddingBottom: 100,
  },
  header: {
    flexDirection:     'row',
    justifyContent:    'space-between',
    alignItems:        'flex-start',
    paddingHorizontal: Spacing.S5,
    marginBottom:      Spacing.S4,
  },
  eyebrow: {
    fontSize:      11,
    fontWeight:    '600',
    color:         Colors.TEXT_TERTIARY,
    textTransform: 'uppercase',
    letterSpacing: 0.1,
    marginBottom:  2,
  },
  title: {
    fontSize:     28,
    fontWeight:   '700',
    color:        Colors.TEXT_PRIMARY,
    letterSpacing: -0.8,
  },
  locationError: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               6,
    marginHorizontal:  Spacing.S5,
    marginBottom:      Spacing.S3,
    backgroundColor:   Colors.ORANGE + '15',
    borderRadius:      Radius.MD,
    padding:           Spacing.S3,
    borderWidth:       StyleSheet.hairlineWidth,
    borderColor:       Colors.ORANGE + '40',
  },
  locationErrorText: {
    fontSize: 12,
    color:    Colors.ORANGE,
    flex:     1,
  },
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
    backgroundColor: Colors.BG_SURFACE,
    borderRadius:    Radius.MD,
    borderWidth:     StyleSheet.hairlineWidth,
    borderColor:     Colors.BORDER,
    gap:             4,
  },
  activityBtnActive: {
    backgroundColor: Colors.BG_SURFACE_2,
  },
  activityLabel: {
    fontSize:   10,
    fontWeight: '500',
    color:      Colors.TEXT_TERTIARY,
  },
  startRunCard: {
    marginHorizontal: Spacing.S5,
    borderRadius:     Radius.LG,
    marginBottom:     Spacing.S5,
    overflow:         'hidden',
  },
  startRunInner: {
    alignItems:      'center',
    paddingVertical: Spacing.S8,
    gap:             Spacing.S2,
  },
  startRunPlayBtn: {
    width:           72,
    height:          72,
    borderRadius:    36,
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignItems:      'center',
    justifyContent:  'center',
    marginBottom:    Spacing.S2,
  },
  startRunText: {
    fontSize:   22,
    fontWeight: '700',
    color:      Colors.BG_BASE,
    letterSpacing: -0.5,
  },
  startRunSub: {
    fontSize:  13,
    color:     Colors.BG_BASE + 'aa',
    fontWeight: '400',
  },
  card: {
    marginHorizontal: Spacing.S5,
    marginBottom:     Spacing.S4,
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
    fontSize:   20,
    fontWeight: '700',
    color:      Colors.TEXT_PRIMARY,
  },
  cardUnit: {
    fontSize:   14,
    color:      Colors.TEXT_TERTIARY,
    fontWeight: '400',
  },
  mapGridBg: {
    position:        'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: Colors.BG_SURFACE,
    opacity:         1,
  },
  mapTopBadge: {
    position:          'absolute',
    top:               Spacing.S3,
    alignSelf:         'center',
    flexDirection:     'row',
    alignItems:        'center',
    gap:               6,
    backgroundColor:   Colors.BG_SURFACE_2,
    borderRadius:      Radius.FULL,
    paddingHorizontal: Spacing.S4,
    paddingVertical:   6,
    borderWidth:       StyleSheet.hairlineWidth,
    borderColor:       Colors.BORDER_2,
    zIndex:            10,
  },
  gpsStatusDot: {
    width:        6,
    height:       6,
    borderRadius: 3,
  },
  gpsStatusText: {
    fontSize:   11,
    color:      Colors.TEXT_SECONDARY,
    fontWeight: '500',
  },
  mapCenter: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
  },
  routeContainer: {
    width:    400,
    height:   200,
    position: 'relative',
  },
  routePoint: {
    position: 'absolute',
  },
  mapPlaceholder: {
    alignItems: 'center',
    gap:        Spacing.S2,
  },
  mapPlaceholderText: {
    fontSize:  12,
    color:     Colors.TEXT_TERTIARY,
    marginTop: Spacing.S2,
  },
  mapPlaceholderSub: {
    fontSize: 10,
    color:    Colors.TEXT_TERTIARY,
    opacity:  0.6,
  },
  weekChart: {
    flexDirection: 'row',
    height:        64,
    gap:           6,
    alignItems:    'flex-end',
    marginBottom:  Spacing.S3,
  },
  weekBarCol: {
    flex:       1,
    alignItems: 'center',
    gap:        4,
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
    fontSize:   9,
    color:      Colors.TEXT_TERTIARY,
    fontWeight: '500',
  },
  weekStatsRow: {
    flexDirection:   'row',
    backgroundColor: Colors.BG_SURFACE_2,
    borderRadius:    Radius.MD,
    overflow:        'hidden',
    borderWidth:     StyleSheet.hairlineWidth,
    borderColor:     Colors.BORDER,
  },
  weekStatItem: {
    flex:            1,
    alignItems:      'center',
    paddingVertical: Spacing.S3,
    gap:             2,
  },
  weekStatSep: {
    width:           StyleSheet.hairlineWidth,
    backgroundColor: Colors.BORDER,
    marginVertical:  Spacing.S2,
  },
  weekStatValue: {
    fontSize:     16,
    fontWeight:   '700',
    color:        Colors.ACCENT,
    letterSpacing: -0.3,
  },
  weekStatLabel: {
    fontSize:      9,
    color:         Colors.TEXT_TERTIARY,
    fontWeight:    '500',
    textTransform: 'uppercase',
  },
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
  pbGrid: {
    flexDirection:     'row',
    paddingHorizontal: Spacing.S5,
    gap:               8,
    marginBottom:      Spacing.S5,
  },
  pbCard: {
    flex:            1,
    alignItems:      'center',
    backgroundColor: Colors.BG_SURFACE,
    borderRadius:    Radius.MD,
    padding:         Spacing.S3,
    borderWidth:     StyleSheet.hairlineWidth,
    borderColor:     Colors.BORDER,
    gap:             4,
  },
  pbValue: {
    fontSize:     16,
    fontWeight:   '700',
    letterSpacing: -0.3,
  },
  pbLabel: {
    fontSize:   9,
    color:      Colors.TEXT_TERTIARY,
    fontWeight: '500',
    textAlign:  'center',
  },
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
  },
  runType: {
    fontSize:   13,
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
  },
  runStatDot: {
    width:           3,
    height:          3,
    borderRadius:    1.5,
    backgroundColor: Colors.TEXT_TERTIARY,
  },
  runMeta: {
    fontSize: 11,
    color:    Colors.TEXT_TERTIARY,
  },
  runCals: {
    fontSize:   12,
    color:      Colors.TEXT_TERTIARY,
    fontWeight: '500',
  },
  emptyWrap: {
    alignItems:      'center',
    paddingVertical: Spacing.S8,
    gap:             Spacing.S2,
  },
  emptyText: {
    fontSize:   14,
    fontWeight: '500',
    color:      Colors.TEXT_PRIMARY,
  },
  emptySub: {
    fontSize:  12,
    color:     Colors.TEXT_TERTIARY,
  },

  // Live tracker styles
  liveHeader: {
    flexDirection:     'row',
    justifyContent:    'space-between',
    alignItems:        'center',
    paddingHorizontal: Spacing.S5,
    paddingBottom:     Spacing.S3,
  },
  liveHeaderLeft: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           8,
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
    paddingHorizontal: Spacing.S4,
    paddingVertical:   Spacing.S2,
    backgroundColor:   Colors.RED_DIM,
    borderRadius:      Radius.FULL,
    borderWidth:       StyleSheet.hairlineWidth,
    borderColor:       Colors.RED + '40',
  },
  endBtnText: {
    fontSize:   13,
    fontWeight: '600',
    color:      Colors.RED,
  },
  mapArea: {
    height:          220,
    backgroundColor: Colors.BG_SURFACE,
    position:        'relative',
    overflow:        'hidden',
  },
  mapGrid: {
    position:   'absolute',
    top:        0,
    left:       0,
    right:      0,
    bottom:     0,
    opacity:    0.05,
  },
  mapContent: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
  },
  gpsInfoWrap: {
    alignItems: 'center',
    gap:        Spacing.S3,
  },
  gpsInfoBadge: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               5,
    backgroundColor:   Colors.ACCENT + '20',
    borderRadius:      Radius.FULL,
    paddingHorizontal: Spacing.S3,
    paddingVertical:   5,
    borderWidth:       StyleSheet.hairlineWidth,
    borderColor:       Colors.ACCENT + '40',
  },
  gpsInfoText: {
    fontSize:   11,
    color:      Colors.ACCENT,
    fontWeight: '500',
  },
  gpsSearchText: {
    fontSize:   13,
    color:      Colors.TEXT_TERTIARY,
  },
  routeVisual: {
    flexDirection: 'row',
    gap:           4,
    flexWrap:      'wrap',
    justifyContent: 'center',
    paddingHorizontal: Spacing.S5,
  },
  routeDot: {
    width:           6,
    height:          6,
    borderRadius:    3,
    backgroundColor: Colors.ACCENT,
    opacity:         0.5,
  },
  routeDotCurrent: {
    width:           10,
    height:          10,
    borderRadius:    5,
    opacity:         1,
  },
  liveStats: {
    paddingHorizontal: Spacing.S5,
    paddingVertical:   Spacing.S4,
    gap:               Spacing.S4,
  },
  liveStatPrimary: {
    flexDirection:  'row',
    alignItems:     'flex-end',
    justifyContent: 'center',
    gap:            4,
  },
  liveDistance: {
    fontSize:     72,
    fontWeight:   '700',
    color:        Colors.TEXT_PRIMARY,
    letterSpacing: -3,
    fontFamily:   'monospace',
    lineHeight:   76,
  },
  liveDistanceUnit: {
    fontSize:   24,
    color:      Colors.TEXT_TERTIARY,
    fontWeight: '400',
    paddingBottom: 10,
  },
  liveStatRow: {
    flexDirection:   'row',
    backgroundColor: Colors.BG_SURFACE,
    borderRadius:    Radius.LG,
    overflow:        'hidden',
    borderWidth:     StyleSheet.hairlineWidth,
    borderColor:     Colors.BORDER,
  },
  liveStat: {
    flex:            1,
    alignItems:      'center',
    paddingVertical: Spacing.S3,
    gap:             3,
  },
  liveStatSep: {
    width:           StyleSheet.hairlineWidth,
    backgroundColor: Colors.BORDER,
    marginVertical:  Spacing.S2,
  },
  liveStatValue: {
    fontSize:     16,
    fontWeight:   '700',
    color:        Colors.TEXT_PRIMARY,
    letterSpacing: -0.3,
    fontFamily:   'monospace',
  },
  liveStatLabel: {
    fontSize:      9,
    color:         Colors.TEXT_TERTIARY,
    fontWeight:    '500',
    textTransform: 'uppercase',
  },
  splitsWrap: {
    paddingHorizontal: Spacing.S5,
    marginBottom:      Spacing.S3,
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
    alignItems:        'center',
    backgroundColor:   Colors.BG_SURFACE,
    borderRadius:      Radius.MD,
    paddingHorizontal: Spacing.S3,
    paddingVertical:   Spacing.S2,
    borderWidth:       StyleSheet.hairlineWidth,
    borderColor:       Colors.BORDER,
    minWidth:          60,
  },
  splitKm: {
    fontSize:   9,
    color:      Colors.TEXT_TERTIARY,
    fontWeight: '600',
  },
  splitPace: {
    fontSize:   13,
    fontWeight: '700',
    color:      Colors.ACCENT,
    fontFamily: 'monospace',
  },
  liveControls: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             Spacing.S5,
    paddingVertical: Spacing.S6,
    paddingBottom:   10
  },
  controlPrimary: {
    width:           80,
    height:          80,
    borderRadius:    40,
    backgroundColor: Colors.ACCENT,
    alignItems:      'center',
    justifyContent:  'center',
  },
  controlSecondary: {
    width:           52,
    height:          52,
    borderRadius:    26,
    backgroundColor: Colors.BG_SURFACE,
    borderWidth:     StyleSheet.hairlineWidth,
    borderColor:     Colors.BORDER,
    alignItems:      'center',
    justifyContent:  'center',
  },
  historyBtn: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               4,
    paddingHorizontal: Spacing.S3,
    paddingVertical:   Spacing.S2,
    backgroundColor:   Colors.BG_SURFACE,
    borderRadius:      Radius.FULL,
    borderWidth:       StyleSheet.hairlineWidth,
    borderColor:       Colors.BORDER,
  },
  historyBtnText: {
    fontSize:   12,
    color:      Colors.TEXT_SECONDARY,
    fontWeight: '500',
  },
});
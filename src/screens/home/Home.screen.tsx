import { useEffect, useState } from 'react';
import { HomeSkeleton } from '../../components/home/HomeSkeleton';
import { ErrorState } from '../../components/common/ErrorState';
import { useSafeTop } from '../../hooks/useSafeTop';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { Colors, Spacing, Radius } from '../../constants/theme';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../../navigation/TabNavigator';

type HomeNav = NativeStackNavigationProp<HomeStackParamList>;

interface UserProfile {
  display_name: string | null;
  username:     string;
  tier:         string;
}

interface EditableStat {
  id:      string;
  label:   string;
  value:   string;
  unit:    string;
  color:   string;
  icon:    keyof typeof Ionicons.glyphMap;
  target:  string;
  pct:     number;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 5)  return 'Still up,';
  if (h < 12) return 'Good morning,';
  if (h < 17) return 'Good afternoon,';
  if (h < 21) return 'Good evening,';
  return 'Good night,';
}

function getDays(): { label: string; done: boolean; today: boolean }[] {
  const names = ['Su','Mo','Tu','We','Th','Fr','Sa'];
  const today = new Date().getDay();
  const done  = [true, true, true, true, true, false, false];
  return names.map((label, i) => ({
    label,
    done:  done[i],
    today: i === today,
  }));
}

const DEFAULT_STATS: EditableStat[] = [
  {
    id:     'calories',
    label:  'Calories',
    value:  '1,847',
    unit:   'kcal',
    color:  Colors.ACCENT,
    icon:   'flame-outline',
    target: '2,400',
    pct:    0.77,
  },
  {
    id:     'protein',
    label:  'Protein',
    value:  '112',
    unit:   'g',
    color:  Colors.BLUE,
    icon:   'fish-outline',
    target: '160g',
    pct:    0.70,
  },
  {
    id:     'distance',
    label:  'Distance',
    value:  '4.2',
    unit:   'km',
    color:  Colors.TEAL,
    icon:   'walk-outline',
    target: '8km',
    pct:    0.52,
  },
  {
    id:     'sleep',
    label:  'Sleep',
    value:  '7.5',
    unit:   'h',
    color:  Colors.PURPLE,
    icon:   'moon-outline',
    target: '8h',
    pct:    0.94,
  },
];

const WEEK_CHART = [3200, 4100, 2800, 5200, 3900, 1847, 0];
const WEEK_DAYS  = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const CHART_MAX  = Math.max(...WEEK_CHART);

interface StatCardProps {
  stat:     EditableStat;
  onEdit:   () => void;
  compact?: boolean;
}

function StatCard({ stat, onEdit, compact }: StatCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.statCard,
        compact && styles.statCardCompact,
        pressed && styles.statCardPressed,
      ]}
      onLongPress={onEdit}
    >
      <View style={styles.statCardTop}>
        <View style={[styles.statIconWrap, { backgroundColor: stat.color + '15' }]}>
          <Ionicons name={stat.icon} size={14} color={stat.color} />
        </View>
        <TouchableOpacity onPress={onEdit} hitSlop={8}>
          <Ionicons name="ellipsis-horizontal" size={14} color={Colors.TEXT_TERTIARY} />
        </TouchableOpacity>
      </View>
      <Text style={[styles.statValue, { color: stat.color }]}>
        {stat.value}
        <Text style={styles.statUnit}> {stat.unit}</Text>
      </Text>
      <Text style={styles.statLabel}>{stat.label}</Text>
      <View style={styles.statBar}>
        <View style={[styles.statBarFill, {
          width:           `${Math.round(stat.pct * 100)}%` as any,
          backgroundColor: stat.color,
        }]} />
      </View>
      <Text style={styles.statTarget}>of {stat.target}</Text>
    </Pressable>
  );
}

interface WeekChartProps {
  data:     number[];
  days:     string[];
  maxVal:   number;
  todayIdx: number;
}

function WeekChart({ data, days, maxVal, todayIdx }: WeekChartProps) {
  return (
    <View style={styles.chartWrap}>
      <View style={styles.chartBars}>
        {data.map((val, i) => {
          const heightPct = maxVal > 0 ? val / maxVal : 0;
          const isToday   = i === todayIdx;
          const isEmpty   = val === 0;
          return (
            <View key={i} style={styles.chartBarCol}>
              <View style={styles.chartBarTrack}>
                <View style={[
                  styles.chartBarFill,
                  {
                    height:          `${Math.round(heightPct * 100)}%` as any,
                    backgroundColor: isToday
                      ? Colors.ACCENT
                      : isEmpty
                        ? Colors.BG_SURFACE_3
                        : Colors.BG_SURFACE_3,
                    borderColor: isToday ? Colors.ACCENT : 'transparent',
                    opacity:     isEmpty ? 0.3 : isToday ? 1 : 0.55,
                  },
                ]} />
              </View>
              <Text style={[
                styles.chartDayLabel,
                isToday && { color: Colors.ACCENT, fontWeight: '600' },
              ]}>
                {days[i]}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const TODAY_WORKOUTS = [
  {
    id:       '1',
    name:     'Push day A',
    meta:     '8 exercises · 52 min',
    icon:     'barbell-outline' as keyof typeof Ionicons.glyphMap,
    color:    Colors.ACCENT,
    done:     false,
  },
  {
    id:       '2',
    name:     'Morning run',
    meta:     '5 km · easy pace',
    icon:     'walk-outline' as keyof typeof Ionicons.glyphMap,
    color:    Colors.BLUE,
    done:     false,
  },
];

export function HomeScreen() {
  const navigation     = useNavigation<HomeNav>();
  const safeTop        = useSafeTop();
  const [profile,      setProfile]      = useState<UserProfile | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [stats,        setStats]        = useState<EditableStat[]>(DEFAULT_STATS);
  const [editingStatId, setEditingStatId] = useState<string | null>(null);
  const [workouts,     setWorkouts]     = useState(TODAY_WORKOUTS);
  const todayIdx = (new Date().getDay() + 6) % 7;

  useEffect(() => { loadProfile(); }, []);

  async function loadProfile() {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error: dbError } = await supabase
        .from('users')
        .select('display_name, username, tier')
        .eq('id', user.id)
        .single();
  
      // PGRST116 means no row found -- not a real error
      if (dbError && dbError.code !== 'PGRST116') throw dbError;
      if (data) setProfile(data as UserProfile);
    } catch (err) {
      setError('Could not load your profile.');
    } finally {
      setLoading(false);
    }
  }


  function toggleWorkout(id: string) {
    setWorkouts((prev) =>
      prev.map((w) => w.id === id ? { ...w, done: !w.done } : w)
    );
  }

  const firstName = profile?.display_name?.split(' ')[0]
    ?? profile?.username
    ?? 'Athlete';

  const days = getDays();

  if (loading) return <HomeSkeleton />;

  if (error) return (
    <View style={{ flex: 1, backgroundColor: Colors.BG_BASE, paddingTop: safeTop }}>
      <ErrorState message={error} onRetry={loadProfile} />
    </View>
  );

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.name}>{firstName}</Text>
        </View>
        <TouchableOpacity style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(profile?.display_name ?? profile?.username ?? 'A')[0].toUpperCase()}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Streak row — Strava style */}
      <View style={styles.streakRow}>
        <View style={styles.streakLeft}>
          <Ionicons name="flame" size={16} color={Colors.ORANGE} />
          <Text style={styles.streakText}>
            <Text style={styles.streakNum}>21</Text> day streak
          </Text>
        </View>
        <View style={styles.streakDots}>
          {days.map((d, i) => (
            <View key={i} style={styles.streakDotWrap}>
              <View style={[
                styles.streakDot,
                d.done  && styles.streakDotDone,
                d.today && !d.done && styles.streakDotToday,
              ]} />
              <Text style={[
                styles.streakDotLabel,
                d.today && styles.streakDotLabelActive,
              ]}>
                {d.label}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Stats grid — editable */}
      <View style={styles.statsHeader}>
        <Text style={styles.sectionEyebrow}>Today</Text>
        <TouchableOpacity style={styles.editHint}>
          <Ionicons name="options-outline" size={14} color={Colors.TEXT_TERTIARY} />
          <Text style={styles.editHintText}>Hold to edit</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsGrid}>
        {stats.map((stat) => (
          <StatCard
            key={stat.id}
            stat={stat}
            onEdit={() => setEditingStatId(
              editingStatId === stat.id ? null : stat.id
            )}
          />
        ))}
      </View>

      {/* Edit panel */}
      {editingStatId && (
        <View style={styles.editPanel}>
          <Text style={styles.editPanelTitle}>
            Editing — {stats.find((s) => s.id === editingStatId)?.label}
          </Text>
          <View style={styles.editPanelOptions}>
            {['calories','protein','distance','sleep','steps','water','weight','hrv'].map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[
                  styles.editPanelChip,
                  editingStatId === opt && styles.editPanelChipActive,
                ]}
                onPress={() => {
                  setStats((prev) => prev.map((s) =>
                    s.id === editingStatId ? { ...s, id: opt, label: opt.charAt(0).toUpperCase() + opt.slice(1) } : s
                  ));
                  setEditingStatId(null);
                }}
              >
                <Text style={styles.editPanelChipText}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={styles.editPanelClose}
            onPress={() => setEditingStatId(null)}
          >
            <Text style={styles.editPanelCloseText}>Done</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Weekly calorie chart — Strava style */}
      <View style={styles.sectionGap}>
        <View style={styles.statsHeader}>
          <Text style={styles.sectionEyebrow}>This week</Text>
          <Text style={styles.sectionMeta}>kcal / day</Text>
        </View>
        <WeekChart
          data={WEEK_CHART}
          days={WEEK_DAYS}
          maxVal={CHART_MAX}
          todayIdx={todayIdx}
        />
        <View style={styles.weekSummaryRow}>
          <View style={styles.weekSummaryItem}>
            <Text style={styles.weekSummaryValue}>4</Text>
            <Text style={styles.weekSummaryLabel}>workouts</Text>
          </View>
          <View style={styles.weekSummarySep} />
          <View style={styles.weekSummaryItem}>
            <Text style={[styles.weekSummaryValue, { color: Colors.BLUE }]}>38.2</Text>
            <Text style={styles.weekSummaryLabel}>km total</Text>
          </View>
          <View style={styles.weekSummarySep} />
          <View style={styles.weekSummaryItem}>
            <Text style={[styles.weekSummaryValue, { color: Colors.TEAL }]}>7.2h</Text>
            <Text style={styles.weekSummaryLabel}>avg sleep</Text>
          </View>
          <View style={styles.weekSummarySep} />
          <View style={styles.weekSummaryItem}>
            <Text style={[styles.weekSummaryValue, { color: Colors.PURPLE }]}>142g</Text>
            <Text style={styles.weekSummaryLabel}>avg protein</Text>
          </View>
        </View>
      </View>

      {/* Today's plan */}
      <View style={styles.sectionGap}>
        <View style={styles.statsHeader}>
          <Text style={styles.sectionEyebrow}>Today's plan</Text>
          <TouchableOpacity>
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>

        {workouts.map((w) => (
          <TouchableOpacity
            key={w.id}
            style={[styles.planRow, w.done && styles.planRowDone]}
            activeOpacity={0.75}
            onPress={() => toggleWorkout(w.id)}
          >
            <View style={[styles.planCheck, w.done && styles.planCheckDone]}>
              {w.done && (
                <Ionicons name="checkmark" size={12} color={Colors.BG_BASE} />
              )}
            </View>
            <View style={[styles.planIcon, { backgroundColor: w.color + '15' }]}>
              <Ionicons name={w.icon} size={16} color={w.done ? Colors.TEXT_TERTIARY : w.color} />
            </View>
            <View style={styles.planInfo}>
              <Text style={[styles.planName, w.done && styles.planNameDone]}>
                {w.name}
              </Text>
              <Text style={styles.planMeta}>{w.meta}</Text>
            </View>
            {!w.done && (
              <View style={styles.planStartBtn}>
                <Text style={styles.planStartText}>Start</Text>
                <Ionicons name="arrow-forward" size={12} color={Colors.BG_BASE} />
              </View>
            )}
            {w.done && (
              <Text style={styles.planDoneLabel}>Done</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* AI Coach strip */}
      <TouchableOpacity style={styles.kaiStrip} activeOpacity={0.8} onPress={() => navigation.navigate('AICoach')}>
        <View style={styles.kaiLeft}>
          <View style={styles.kaiIconWrap}>
            <Ionicons name="sparkles" size={16} color={Colors.PURPLE} />
          </View>
          <View>
            <Text style={styles.kaiTitle}>Ask Kai</Text>
            <Text style={styles.kaiSub}>Your AI coach has 3 insights today</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={16} color={Colors.TEXT_TERTIARY} />
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.BG_BASE,
  },
  scroll: {
    paddingTop:    56,
    paddingBottom: 48,
  },

  // Header
  header: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'flex-start',
    paddingHorizontal: Spacing.S5,
    marginBottom:   Spacing.S5,
  },
  headerLeft: {
    gap: 2,
  },
  greeting: {
    fontSize:    12,
    color:       Colors.TEXT_TERTIARY,
    letterSpacing: 0.3,
    fontWeight:  '500',
    textTransform: 'uppercase',
  },
  name: {
    fontSize:    30,
    fontWeight:  '700',
    color:       Colors.TEXT_PRIMARY,
    letterSpacing: -1,
    lineHeight:  34,
  },
  avatar: {
    width:           38,
    height:          38,
    borderRadius:    19,
    backgroundColor: Colors.BG_SURFACE_2,
    borderWidth:     1,
    borderColor:     Colors.BORDER_2,
    alignItems:      'center',
    justifyContent:  'center',
  },
  avatarText: {
    fontSize:   13,
    fontWeight: '600',
    color:      Colors.TEXT_PRIMARY,
  },

  // Streak — Strava style
  streakRow: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: Spacing.S5,
    marginBottom:      Spacing.S4,
  },
  streakLeft: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           5,
  },
  streakText: {
    fontSize:  12,
    color:     Colors.TEXT_SECONDARY,
    fontWeight: '400',
  },
  streakNum: {
    fontSize:   12,
    fontWeight: '700',
    color:      Colors.TEXT_PRIMARY,
  },
  streakDots: {
    flexDirection: 'row',
    gap:           6,
  },
  streakDotWrap: {
    alignItems: 'center',
    gap:        4,
  },
  streakDot: {
    width:        18,
    height:       18,
    borderRadius: 5,
    backgroundColor: Colors.BG_SURFACE_3,
  },
  streakDotDone: {
    backgroundColor: Colors.ACCENT,
  },
  streakDotToday: {
    backgroundColor: 'transparent',
    borderWidth:     1.5,
    borderColor:     Colors.ACCENT,
  },
  streakDotLabel: {
    fontSize:  8,
    color:     Colors.TEXT_TERTIARY,
    fontWeight: '500',
  },
  streakDotLabelActive: {
    color: Colors.ACCENT,
  },

  // Divider
  divider: {
    height:            StyleSheet.hairlineWidth,
    backgroundColor:   Colors.BORDER,
    marginHorizontal:  Spacing.S5,
    marginBottom:      Spacing.S5,
  },

  // Section headers
  statsHeader: {
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
  sectionMeta: {
    fontSize: 11,
    color:    Colors.TEXT_TERTIARY,
  },
  seeAll: {
    fontSize:   12,
    color:      Colors.ACCENT,
    fontWeight: '500',
  },
  editHint: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           4,
  },
  editHintText: {
    fontSize: 11,
    color:    Colors.TEXT_TERTIARY,
  },

  // Stats grid
  statsGrid: {
    flexDirection:     'row',
    flexWrap:          'wrap',
    paddingHorizontal: Spacing.S5,
    gap:               8,
    marginBottom:      Spacing.S5,
  },
  statCard: {
    width:           '47.5%',
    backgroundColor: Colors.BG_SURFACE,
    borderRadius:    Radius.LG,
    padding:         Spacing.S4,
    borderWidth:     StyleSheet.hairlineWidth,
    borderColor:     Colors.BORDER,
    gap:             4,
  },
  statCardCompact: {
    width: '30%',
  },
  statCardPressed: {
    backgroundColor: Colors.BG_SURFACE_2,
  },
  statCardTop: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    marginBottom:   4,
  },
  statIconWrap: {
    width:         26,
    height:        26,
    borderRadius:  8,
    alignItems:    'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize:     26,
    fontWeight:   '700',
    letterSpacing: -0.8,
    lineHeight:   30,
  },
  statUnit: {
    fontSize:   13,
    fontWeight: '400',
    color:      Colors.TEXT_TERTIARY,
  },
  statLabel: {
    fontSize:   11,
    color:      Colors.TEXT_TERTIARY,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.05,
  },
  statBar: {
    height:          3,
    backgroundColor: Colors.BG_SURFACE_3,
    borderRadius:    2,
    overflow:        'hidden',
    marginTop:       6,
  },
  statBarFill: {
    height:       '100%',
    borderRadius: 2,
  },
  statTarget: {
    fontSize: 10,
    color:    Colors.TEXT_TERTIARY,
  },

  // Edit panel
  editPanel: {
    marginHorizontal:  Spacing.S5,
    marginTop:         -Spacing.S2,
    marginBottom:      Spacing.S4,
    backgroundColor:   Colors.BG_SURFACE_2,
    borderRadius:      Radius.LG,
    padding:           Spacing.S4,
    borderWidth:       StyleSheet.hairlineWidth,
    borderColor:       Colors.BORDER_2,
  },
  editPanelTitle: {
    fontSize:    12,
    fontWeight:  '600',
    color:       Colors.TEXT_SECONDARY,
    marginBottom: Spacing.S3,
  },
  editPanelOptions: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           6,
    marginBottom:  Spacing.S3,
  },
  editPanelChip: {
    paddingHorizontal: 12,
    paddingVertical:   6,
    borderRadius:      Radius.FULL,
    backgroundColor:   Colors.BG_SURFACE_3,
    borderWidth:       StyleSheet.hairlineWidth,
    borderColor:       Colors.BORDER,
  },
  editPanelChipActive: {
    backgroundColor: Colors.ACCENT_DIM,
    borderColor:     Colors.ACCENT,
  },
  editPanelChipText: {
    fontSize:   12,
    color:      Colors.TEXT_SECONDARY,
    fontWeight: '500',
  },
  editPanelClose: {
    alignSelf:       'flex-end',
    paddingVertical: 6,
  },
  editPanelCloseText: {
    fontSize:   13,
    color:      Colors.ACCENT,
    fontWeight: '600',
  },

  // Weekly chart
  sectionGap: {
    marginBottom: Spacing.S6,
  },
  chartWrap: {
    paddingHorizontal: Spacing.S5,
    marginBottom:      Spacing.S3,
  },
  chartBars: {
    flexDirection: 'row',
    height:        80,
    gap:           6,
    alignItems:    'flex-end',
  },
  chartBarCol: {
    flex:      1,
    alignItems: 'center',
    gap:        6,
  },
  chartBarTrack: {
    flex:            1,
    width:           '100%',
    justifyContent:  'flex-end',
  },
  chartBarFill: {
    width:        '100%',
    borderRadius: 4,
    minHeight:    4,
    borderWidth:  1.5,
  },
  chartDayLabel: {
    fontSize:  9,
    color:     Colors.TEXT_TERTIARY,
    fontWeight: '500',
  },

  // Week summary
  weekSummaryRow: {
    flexDirection:     'row',
    paddingHorizontal: Spacing.S5,
    backgroundColor:   Colors.BG_SURFACE,
    marginHorizontal:  Spacing.S5,
    borderRadius:      Radius.MD,
    borderWidth:       StyleSheet.hairlineWidth,
    borderColor:       Colors.BORDER,
    overflow:          'hidden',
  },
  weekSummaryItem: {
    flex:           1,
    paddingVertical: Spacing.S3,
    alignItems:     'center',
    gap:            2,
  },
  weekSummarySep: {
    width:             StyleSheet.hairlineWidth,
    backgroundColor:   Colors.BORDER,
    marginVertical:    Spacing.S2,
  },
  weekSummaryValue: {
    fontSize:     16,
    fontWeight:   '700',
    color:        Colors.ACCENT,
    letterSpacing: -0.3,
  },
  weekSummaryLabel: {
    fontSize:      9,
    color:         Colors.TEXT_TERTIARY,
    fontWeight:    '500',
    textTransform: 'uppercase',
    letterSpacing: 0.05,
  },

  // Plan rows — Strava style
  planRow: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: Spacing.S5,
    paddingVertical:   Spacing.S3,
    gap:               Spacing.S3,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.BORDER,
  },
  planRowDone: {
    opacity: 0.5,
  },
  planCheck: {
    width:         20,
    height:        20,
    borderRadius:  10,
    borderWidth:   1.5,
    borderColor:   Colors.BORDER_2,
    alignItems:    'center',
    justifyContent: 'center',
  },
  planCheckDone: {
    backgroundColor: Colors.ACCENT,
    borderColor:     Colors.ACCENT,
  },
  planIcon: {
    width:         36,
    height:        36,
    borderRadius:  10,
    alignItems:    'center',
    justifyContent: 'center',
  },
  planInfo: {
    flex: 1,
    gap:  2,
  },
  planName: {
    fontSize:   14,
    fontWeight: '500',
    color:      Colors.TEXT_PRIMARY,
  },
  planNameDone: {
    textDecorationLine: 'line-through',
    color:              Colors.TEXT_TERTIARY,
  },
  planMeta: {
    fontSize: 11,
    color:    Colors.TEXT_TERTIARY,
  },
  planStartBtn: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             4,
    backgroundColor: Colors.ACCENT,
    borderRadius:    Radius.FULL,
    paddingHorizontal: 12,
    paddingVertical:  6,
  },
  planStartText: {
    fontSize:   11,
    fontWeight: '600',
    color:      Colors.BG_BASE,
  },
  planDoneLabel: {
    fontSize:   11,
    color:      Colors.TEXT_TERTIARY,
    fontWeight: '500',
  },

  // Kai strip
  kaiStrip: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    marginHorizontal:  Spacing.S5,
    marginTop:         Spacing.S2,
    paddingHorizontal: Spacing.S4,
    paddingVertical:   Spacing.S3,
    backgroundColor:   Colors.PURPLE + '10',
    borderRadius:      Radius.LG,
    borderWidth:       StyleSheet.hairlineWidth,
    borderColor:       Colors.PURPLE + '30',
  },
  kaiLeft: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.S3,
  },
  kaiIconWrap: {
    width:           34,
    height:          34,
    borderRadius:    10,
    backgroundColor: Colors.PURPLE + '20',
    alignItems:      'center',
    justifyContent:  'center',
  },
  kaiTitle: {
    fontSize:   13,
    fontWeight: '600',
    color:      Colors.TEXT_PRIMARY,
    marginBottom: 1,
  },
  kaiSub: {
    fontSize: 11,
    color:    Colors.TEXT_SECONDARY,
  },
});
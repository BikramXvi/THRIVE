import { useState, useEffect } from 'react';
import { SleepSheet } from '../../navigation/TabNavigator';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { sleepService } from '../../services/sleep.service';
import type { SleepLogRow } from '../../services/sleep.service';
import { Colors, Spacing, Radius } from '../../constants/theme';
import { useSafeTop } from '../../hooks/useSafeTop';

const WEEK_DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

const QUALITY_LABELS: Record<number, string> = {
  1: 'Poor',
  2: 'Fair',
  3: 'Good',
  4: 'Great',
  5: 'Perfect',
};

const QUALITY_COLORS: Record<number, string> = {
  1: Colors.RED,
  2: Colors.ORANGE,
  3: Colors.BLUE,
  4: Colors.TEAL,
  5: Colors.ACCENT,
};

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('en-NP', {
    hour:   '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (dateStr === today.toISOString().split('T')[0]) return 'Today';
  if (dateStr === yesterday.toISOString().split('T')[0]) return 'Yesterday';

  return date.toLocaleDateString('en-NP', {
    weekday: 'short',
    month:   'short',
    day:     'numeric',
  });
}

function getWeeklyData(logs: SleepLogRow[]): number[] {
  const result = [0, 0, 0, 0, 0, 0, 0];
  const today  = new Date();

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const log     = logs.find((l) => l.date === dateStr);
    const dayIdx  = 6 - i;
    result[dayIdx] = log ? Math.round((log.duration_minutes / 60) * 10) / 10 : 0;
  }

  return result;
}

export function SleepScreen() {
  const safeTop = useSafeTop();
  const [showLogModal, setShowLogModal] = useState(false);
  const [logs,    setLogs]    = useState<SleepLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId,  setUserId]  = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const { data } = await sleepService.getRecentLogs(user.id, 14);
    if (data) setLogs(data);
    setLoading(false);
  }

  const weeklyData = getWeeklyData(logs);
  const maxHours   = Math.max(...weeklyData, 8);
  const avgHours   = weeklyData.filter((h) => h > 0).length > 0
    ? weeklyData.filter((h) => h > 0).reduce((s: number, h) => s + h, 0) /
      weeklyData.filter((h) => h > 0).length
    : 0;

  const todayLog    = logs[0]?.date === new Date().toISOString().split('T')[0] ? logs[0] : null;
  const todayHours  = todayLog ? Math.round((todayLog.duration_minutes / 60) * 10) / 10 : 0;
  const todayQuality = todayLog?.quality_rating ?? 0;

  const goalHours  = 8;
  const goalPct    = Math.min(todayHours / goalHours, 1);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.BG_BASE, paddingTop: safeTop }}>
        <View style={{ padding: Spacing.S5 }}>
          <Text style={{ color: Colors.TEXT_TERTIARY, fontSize: 13 }}>Loading sleep data...</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.scroll, { paddingTop: safeTop }]}
      showsVerticalScrollIndicator={false}
    >
{/* Header */}
<View style={styles.header}>
  <View>
    <Text style={styles.eyebrow}>Sleep</Text>
    <Text style={styles.heading}>Recovery tracker</Text>
  </View>
  <TouchableOpacity
    style={styles.logBtn}
    onPress={() => setShowLogModal(true)}
  >
    <Ionicons name="add" size={16} color={Colors.BG_BASE} />
    <Text style={styles.logBtnText}>Log sleep</Text>
  </TouchableOpacity>
</View>

      {/* Tonight card */}
      <View style={styles.tonightCard}>
        <View style={styles.tonightLeft}>
          <Text style={styles.tonightLabel}>Last night</Text>
          <Text style={styles.tonightHours}>
            {todayHours > 0 ? `${todayHours}` : '--'}
            <Text style={styles.tonightUnit}>h</Text>
          </Text>
          {todayLog && (
            <Text style={styles.tonightMeta}>
              {formatTime(todayLog.bedtime)} → {formatTime(todayLog.wake_time)}
            </Text>
          )}
          {!todayLog && (
            <Text style={styles.tonightMeta}>Log your sleep via the + button</Text>
          )}
        </View>

        <View style={styles.tonightRight}>
          {/* Goal ring */}
          <View style={styles.ringWrap}>
            <View style={[styles.ringFill, {
              borderColor: todayHours >= goalHours ? Colors.TEAL : Colors.PURPLE,
              opacity:     Math.max(goalPct, 0.15),
            }]} />
            <View style={styles.ringTrack} />
            <View style={styles.ringCenter}>
              <Text style={[styles.ringPct, {
                color: todayHours >= goalHours ? Colors.TEAL : Colors.PURPLE,
              }]}>
                {Math.round(goalPct * 100)}%
              </Text>
              <Text style={styles.ringGoal}>of {goalHours}h</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Weekly chart */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>This week</Text>
          <Text style={styles.cardMeta}>
            Avg {avgHours > 0 ? avgHours.toFixed(1) : '--'}h / night
          </Text>
        </View>

        <View style={styles.chartWrap}>
          <View style={styles.chartBars}>
            {weeklyData.map((hours, i) => {
              const heightPct = maxHours > 0 ? hours / maxHours : 0;
              const isToday   = i === 6;
              const isEmpty   = hours === 0;
              const isGood    = hours >= 7;

              return (
                <View key={i} style={styles.chartBarCol}>
                  {hours > 0 && (
                    <Text style={styles.chartBarLabel}>{hours}h</Text>
                  )}
                  <View style={styles.chartBarTrack}>
                    <View style={[
                      styles.chartBarFill,
                      {
                        height:          `${Math.round(heightPct * 100)}%` as any,
                        backgroundColor: isToday
                          ? Colors.PURPLE
                          : isGood
                            ? Colors.TEAL
                            : isEmpty
                              ? Colors.BG_SURFACE_3
                              : Colors.ORANGE,
                        opacity: isEmpty ? 0.3 : 1,
                      },
                    ]} />
                  </View>
                  <Text style={[
                    styles.chartDayLabel,
                    isToday && { color: Colors.PURPLE, fontWeight: '600' },
                  ]}>
                    {WEEK_DAYS[i]}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Goal line */}
          <View style={[styles.goalLine, {
            bottom: `${Math.round((goalHours / maxHours) * 100)}%` as any,
          }]}>
            <View style={styles.goalLineDash} />
            <Text style={styles.goalLineLabel}>{goalHours}h goal</Text>
          </View>
        </View>

        {/* Weekly summary */}
        <View style={styles.weekSummary}>
          <View style={styles.weekSummaryItem}>
            <Text style={[styles.weekSummaryValue, { color: Colors.TEAL }]}>
              {weeklyData.filter((h) => h >= 7).length}
            </Text>
            <Text style={styles.weekSummaryLabel}>Good nights</Text>
          </View>
          <View style={styles.weekSummarySep} />
          <View style={styles.weekSummaryItem}>
            <Text style={[styles.weekSummaryValue, { color: Colors.PURPLE }]}>
              {avgHours > 0 ? avgHours.toFixed(1) : '--'}h
            </Text>
            <Text style={styles.weekSummaryLabel}>Average</Text>
          </View>
          <View style={styles.weekSummarySep} />
          <View style={styles.weekSummaryItem}>
            <Text style={[styles.weekSummaryValue, { color: Colors.ORANGE }]}>
              {weeklyData.filter((h) => h > 0 && h < 6).length}
            </Text>
            <Text style={styles.weekSummaryLabel}>Short nights</Text>
          </View>
        </View>
      </View>

      {/* Sleep log history */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Sleep history</Text>

        {logs.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="moon-outline" size={32} color={Colors.TEXT_TERTIARY} />
            <Text style={styles.emptyText}>No sleep logged yet</Text>
            <Text style={styles.emptySub}>
              Tap the + button to log your sleep
            </Text>
          </View>
        ) : (
          logs.map((log, i) => {
            const hours   = Math.round((log.duration_minutes / 60) * 10) / 10;
            const quality = log.quality_rating ?? 0;
            const color   = quality > 0 ? (QUALITY_COLORS[quality] ?? Colors.TEAL) : Colors.TEXT_TERTIARY;
            const isGood  = hours >= 7;

            return (
              <View
                key={log.id}
                style={[
                  styles.logRow,
                  i < logs.length - 1 && styles.logRowBorder,
                ]}
              >
                <View style={[styles.logIconWrap, {
                  backgroundColor: isGood ? Colors.TEAL + '15' : Colors.PURPLE + '15',
                }]}>
                  <Ionicons
                    name="moon"
                    size={16}
                    color={isGood ? Colors.TEAL : Colors.PURPLE}
                  />
                </View>

                <View style={styles.logInfo}>
                  <Text style={styles.logDate}>{formatDate(log.date)}</Text>
                  <Text style={styles.logTime}>
                    {formatTime(log.bedtime)} → {formatTime(log.wake_time)}
                  </Text>
                </View>

                <View style={styles.logRight}>
                  <Text style={[styles.logHours, {
                    color: isGood ? Colors.TEAL : Colors.PURPLE,
                  }]}>
                    {formatDuration(log.duration_minutes)}
                  </Text>
                  {quality > 0 && (
                    <Text style={[styles.logQuality, { color }]}>
                      {QUALITY_LABELS[quality]}
                    </Text>
                  )}
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* Tips */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Sleep tips</Text>
        <View style={styles.tipsList}>
          {[
            { icon: 'sunny-outline',       tip: 'Get morning sunlight within 30 min of waking' },
            { icon: 'cafe-outline',         tip: 'Avoid caffeine after 2pm for better sleep quality' },
            { icon: 'phone-portrait-outline', tip: 'Put your phone away 1 hour before bed' },
            { icon: 'thermometer-outline',  tip: 'Keep your room cool -- 18-20°C is optimal' },
          ].map((item, i) => (
            <View key={i} style={styles.tipRow}>
              <View style={styles.tipIcon}>
                <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={14} color={Colors.TEAL} />
              </View>
              <Text style={styles.tipText}>{item.tip}</Text>
            </View>
          ))}
        </View>
      </View>

      <SleepSheet
  visible={showLogModal}
  onClose={() => {
    setShowLogModal(false);
    loadData();
  }}
/>

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

  // Header
  header: {
    flexDirection:     'row',
    justifyContent:    'space-between',
    alignItems:        'flex-start',
    paddingHorizontal: Spacing.S5,
    marginBottom:      Spacing.S5,
  },
  eyebrow: {
    fontSize:      11,
    fontWeight:    '600',
    color:         Colors.TEXT_TERTIARY,
    textTransform: 'uppercase',
    letterSpacing: 0.1,
    marginBottom:  2,
  },
  heading: {
    fontSize:     24,
    fontWeight:   '700',
    color:        Colors.TEXT_PRIMARY,
    letterSpacing: -0.5,
  },
  qualityBadge: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               5,
    paddingHorizontal: Spacing.S3,
    paddingVertical:   6,
    borderRadius:      Radius.FULL,
    borderWidth:       StyleSheet.hairlineWidth,
    borderColor:       Colors.BORDER,
  },
  qualityBadgeText: {
    fontSize:   12,
    fontWeight: '600',
  },

  // Tonight card
  tonightCard: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    marginHorizontal:  Spacing.S5,
    marginBottom:      Spacing.S4,
    backgroundColor:   Colors.PURPLE + '10',
    borderRadius:      Radius.LG,
    padding:           Spacing.S5,
    borderWidth:       StyleSheet.hairlineWidth,
    borderColor:       Colors.PURPLE + '30',
  },
  tonightLeft: {
    gap: 4,
  },
  tonightLabel: {
    fontSize:      11,
    fontWeight:    '600',
    color:         Colors.TEXT_TERTIARY,
    textTransform: 'uppercase',
    letterSpacing: 0.1,
  },
  tonightHours: {
    fontSize:     48,
    fontWeight:   '700',
    color:        Colors.PURPLE,
    letterSpacing: -2,
    lineHeight:   52,
  },
  tonightUnit: {
    fontSize:   24,
    fontWeight: '400',
    color:      Colors.TEXT_SECONDARY,
  },
  tonightMeta: {
    fontSize: 12,
    color:    Colors.TEXT_TERTIARY,
  },
  tonightRight: {
    alignItems:     'center',
    justifyContent: 'center',
  },

  // Ring
  ringWrap: {
    width:          88,
    height:         88,
    alignItems:     'center',
    justifyContent: 'center',
    position:       'relative',
  },
  ringFill: {
    position:     'absolute',
    width:        88,
    height:       88,
    borderRadius: 44,
    borderWidth:  8,
  },
  ringTrack: {
    position:        'absolute',
    width:           88,
    height:          88,
    borderRadius:    44,
    borderWidth:     8,
    borderColor:     Colors.BG_SURFACE_3,
    opacity:         0.4,
  },
  ringCenter: {
    alignItems: 'center',
    gap:        1,
  },
  ringPct: {
    fontSize:   16,
    fontWeight: '700',
  },
  ringGoal: {
    fontSize: 9,
    color:    Colors.TEXT_TERTIARY,
  },

  // Card
  card: {
    marginHorizontal:  Spacing.S5,
    marginBottom:      Spacing.S4,
    backgroundColor:   Colors.BG_SURFACE,
    borderRadius:      Radius.LG,
    padding:           Spacing.S4,
    borderWidth:       StyleSheet.hairlineWidth,
    borderColor:       Colors.BORDER,
  },
  cardHeader: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    marginBottom:   Spacing.S4,
  },
  cardTitle: {
    fontSize:      11,
    fontWeight:    '600',
    color:         Colors.TEXT_TERTIARY,
    textTransform: 'uppercase',
    letterSpacing: 0.1,
    marginBottom:  Spacing.S4,
  },
  cardMeta: {
    fontSize: 12,
    color:    Colors.TEXT_TERTIARY,
  },

  // Chart
  chartWrap: {
    position:     'relative',
    marginBottom: Spacing.S4,
  },
  chartBars: {
    flexDirection: 'row',
    height:        100,
    gap:           6,
    alignItems:    'flex-end',
  },
  chartBarCol: {
    flex:       1,
    alignItems: 'center',
    gap:        4,
  },
  chartBarLabel: {
    fontSize:   8,
    color:      Colors.TEXT_TERTIARY,
    fontWeight: '500',
  },
  logBtn: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               4,
    backgroundColor:   Colors.TEAL,
    borderRadius:      Radius.FULL,
    paddingHorizontal: Spacing.S4,
    paddingVertical:   Spacing.S2,
  },
  logBtnText: {
    fontSize:   13,
    fontWeight: '600',
    color:      Colors.BG_BASE,
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
  },
  chartDayLabel: {
    fontSize:   9,
    color:      Colors.TEXT_TERTIARY,
    fontWeight: '500',
  },
  goalLine: {
    position:       'absolute',
    left:           0,
    right:          0,
    flexDirection:  'row',
    alignItems:     'center',
    gap:            4,
  },
  goalLineDash: {
    flex:            1,
    height:          1,
    backgroundColor: Colors.TEAL,
    opacity:         0.4,
  },
  goalLineLabel: {
    fontSize:   9,
    color:      Colors.TEAL,
    fontWeight: '500',
  },

  // Week summary
  weekSummary: {
    flexDirection:   'row',
    backgroundColor: Colors.BG_SURFACE_2,
    borderRadius:    Radius.MD,
    overflow:        'hidden',
    borderWidth:     StyleSheet.hairlineWidth,
    borderColor:     Colors.BORDER,
  },
  weekSummaryItem: {
    flex:           1,
    alignItems:     'center',
    paddingVertical: Spacing.S3,
    gap:            2,
  },
  weekSummarySep: {
    width:           StyleSheet.hairlineWidth,
    backgroundColor: Colors.BORDER,
    marginVertical:  Spacing.S2,
  },
  weekSummaryValue: {
    fontSize:     16,
    fontWeight:   '700',
    letterSpacing: -0.3,
  },
  weekSummaryLabel: {
    fontSize:      9,
    color:         Colors.TEXT_TERTIARY,
    fontWeight:    '500',
    textTransform: 'uppercase',
    letterSpacing: 0.05,
  },

  // Log history
  logRow: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            Spacing.S3,
    paddingVertical: Spacing.S3,
  },
  logRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.BORDER,
  },
  logIconWrap: {
    width:          38,
    height:         38,
    borderRadius:   11,
    alignItems:     'center',
    justifyContent: 'center',
  },
  logInfo: {
    flex: 1,
    gap:  2,
  },
  logDate: {
    fontSize:   13,
    fontWeight: '500',
    color:      Colors.TEXT_PRIMARY,
  },
  logTime: {
    fontSize: 11,
    color:    Colors.TEXT_TERTIARY,
  },
  logRight: {
    alignItems: 'flex-end',
    gap:        2,
  },
  logHours: {
    fontSize:   15,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  logQuality: {
    fontSize:   10,
    fontWeight: '500',
  },

  // Empty
  emptyWrap: {
    alignItems:     'center',
    paddingVertical: Spacing.S6,
    gap:            Spacing.S2,
  },
  emptyText: {
    fontSize:   14,
    fontWeight: '500',
    color:      Colors.TEXT_PRIMARY,
  },
  emptySub: {
    fontSize:  12,
    color:     Colors.TEXT_TERTIARY,
    textAlign: 'center',
  },

  // Tips
  tipsList: {
    gap: Spacing.S3,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems:    'flex-start',
    gap:           Spacing.S3,
  },
  tipIcon: {
    width:           28,
    height:          28,
    borderRadius:    8,
    backgroundColor: Colors.TEAL + '15',
    alignItems:      'center',
    justifyContent:  'center',
    marginTop:       1,
  },
  tipText: {
    flex:      1,
    fontSize:  13,
    color:     Colors.TEXT_SECONDARY,
    lineHeight: 19,
  },
});
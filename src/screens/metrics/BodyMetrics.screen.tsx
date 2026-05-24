import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { Colors, Spacing, Radius } from '../../constants/theme';
import { useSafeTop } from '../../hooks/useSafeTop';
import { useUIStore } from '../../stores/ui.store';

interface BodyMetricRow {
  id:           string;
  user_id:      string;
  weight_kg:    number | null;
  body_fat_pct: number | null;
  waist_cm:     number | null;
  notes:        string | null;
  logged_at:    string;
  date:         string;
}

function formatDate(dateStr: string): string {
  const date      = new Date(dateStr);
  const today     = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (dateStr === today.toISOString().split('T')[0])     return 'Today';
  if (dateStr === yesterday.toISOString().split('T')[0]) return 'Yesterday';

  return date.toLocaleDateString('en-NP', {
    weekday: 'short',
    month:   'short',
    day:     'numeric',
  });
}

function getWeeklyWeights(logs: BodyMetricRow[]): number[] {
  const result = [0, 0, 0, 0, 0, 0, 0];
  const today  = new Date();

  for (let i = 6; i >= 0; i--) {
    const date    = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const log     = logs.find((l) => l.date === dateStr);
    const dayIdx  = 6 - i;
    result[dayIdx] = log?.weight_kg ?? 0;
  }

  return result;
}

const WEEK_DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

export function BodyMetricsScreen() {
  const safeTop = useSafeTop();
  const [logs,         setLogs]         = useState<BodyMetricRow[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [userId,       setUserId]       = useState<string | null>(null);
  const [showModal,    setShowModal]    = useState(false);
  const [weight,       setWeight]       = useState('');
  const [bodyFat,      setBodyFat]      = useState('');
  const [waist,        setWaist]        = useState('');
  const [notes,        setNotes]        = useState('');
  const [saving,       setSaving]       = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const { data } = await supabase
      .from('body_metrics')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(30);

    if (data) setLogs((data ?? []) as unknown as BodyMetricRow[]);
    setLoading(false);
  }

  async function saveMetrics() {
    if (!userId || !weight) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('body_metrics').insert({
        user_id:      userId,
        weight_kg:    parseFloat(weight)  || null,
        body_fat_pct: parseFloat(bodyFat) || null,
        waist_cm:     parseFloat(waist)   || null,
        notes:        notes.trim()        || null,
        logged_at:    new Date().toISOString(),
        date:         new Date().toISOString().split('T')[0],
      } as any);

      if (error) throw error;

      useUIStore.getState().showToast('Metrics saved!', 'success');
      setShowModal(false);
      setWeight('');
      setBodyFat('');
      setWaist('');
      setNotes('');
      loadData();
    } catch (err) {
      useUIStore.getState().showToast('Could not save metrics', 'error');
    } finally {
      setSaving(false);
    }
  }

  const weeklyWeights = getWeeklyWeights(logs);
  const maxWeight     = Math.max(...weeklyWeights.filter((w) => w > 0), 1);
  const minWeight     = Math.min(...weeklyWeights.filter((w) => w > 0), maxWeight);
  const latestLog     = logs[0];
  const prevLog       = logs[1];

  const weightChange = latestLog?.weight_kg && prevLog?.weight_kg
    ? Math.round((latestLog.weight_kg - prevLog.weight_kg) * 10) / 10
    : null;

  const startWeight = logs[logs.length - 1]?.weight_kg ?? null;
  const totalChange = latestLog?.weight_kg && startWeight
    ? Math.round((latestLog.weight_kg - startWeight) * 10) / 10
    : null;

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.BG_BASE, paddingTop: safeTop }}>
        <View style={{ padding: Spacing.S5 }}>
          <Text style={{ color: Colors.TEXT_TERTIARY, fontSize: 13 }}>Loading metrics...</Text>
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
          <Text style={styles.eyebrow}>Body</Text>
          <Text style={styles.heading}>Metrics tracker</Text>
        </View>
        <TouchableOpacity
          style={styles.logBtn}
          onPress={() => setShowModal(true)}
        >
          <Ionicons name="add" size={16} color={Colors.BG_BASE} />
          <Text style={styles.logBtnText}>Log metrics</Text>
        </TouchableOpacity>
      </View>

      {/* Current weight card */}
      <View style={styles.currentCard}>
        <View style={styles.currentLeft}>
          <Text style={styles.currentLabel}>Current weight</Text>
          <Text style={styles.currentValue}>
            {latestLog?.weight_kg ?? '--'}
            <Text style={styles.currentUnit}> kg</Text>
          </Text>
          {weightChange !== null && (
            <View style={styles.changeRow}>
              <Ionicons
                name={weightChange > 0 ? 'trending-up' : weightChange < 0 ? 'trending-down' : 'remove'}
                size={14}
                color={weightChange > 0 ? Colors.RED : weightChange < 0 ? Colors.TEAL : Colors.TEXT_TERTIARY}
              />
              <Text style={[styles.changeText, {
                color: weightChange > 0 ? Colors.RED : weightChange < 0 ? Colors.TEAL : Colors.TEXT_TERTIARY,
              }]}>
                {weightChange > 0 ? '+' : ''}{weightChange}kg since last log
              </Text>
            </View>
          )}
          {!latestLog && (
            <Text style={styles.currentMeta}>No metrics logged yet</Text>
          )}
        </View>

        <View style={styles.currentRight}>
          {latestLog?.body_fat_pct && (
            <View style={styles.metricPill}>
              <Text style={styles.metricPillValue}>{latestLog.body_fat_pct}%</Text>
              <Text style={styles.metricPillLabel}>Body fat</Text>
            </View>
          )}
          {latestLog?.waist_cm && (
            <View style={styles.metricPill}>
              <Text style={styles.metricPillValue}>{latestLog.waist_cm}cm</Text>
              <Text style={styles.metricPillLabel}>Waist</Text>
            </View>
          )}
        </View>
      </View>

      {/* Weight chart */}
      {weeklyWeights.some((w) => w > 0) && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>This week</Text>
            {totalChange !== null && (
              <Text style={[styles.cardMeta, {
                color: totalChange > 0 ? Colors.RED : totalChange < 0 ? Colors.TEAL : Colors.TEXT_TERTIARY,
              }]}>
                {totalChange > 0 ? '+' : ''}{totalChange}kg total
              </Text>
            )}
          </View>

          <View style={styles.chartBars}>
            {weeklyWeights.map((w, i) => {
              const range     = maxWeight - minWeight || 1;
              const heightPct = w > 0 ? 0.3 + ((w - minWeight) / range) * 0.7 : 0;
              const isToday   = i === 6;
              const isEmpty   = w === 0;

              return (
                <View key={i} style={styles.chartBarCol}>
                  {w > 0 && (
                    <Text style={styles.chartBarLabel}>{w}kg</Text>
                  )}
                  <View style={styles.chartBarTrack}>
                    <View style={[
                      styles.chartBarFill,
                      {
                        height:          `${Math.round(heightPct * 100)}%` as any,
                        backgroundColor: isToday ? Colors.BLUE : Colors.BG_SURFACE_3,
                        opacity:         isEmpty ? 0.3 : 1,
                      },
                    ]} />
                  </View>
                  <Text style={[
                    styles.chartDayLabel,
                    isToday && { color: Colors.BLUE, fontWeight: '600' },
                  ]}>
                    {WEEK_DAYS[i]}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Stats summary */}
      {logs.length > 0 && (
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: Colors.BLUE }]}>
              {latestLog?.weight_kg ?? '--'}kg
            </Text>
            <Text style={styles.statLabel}>Current</Text>
          </View>
          <View style={styles.statSep} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: Colors.TEAL }]}>
              {startWeight ?? '--'}kg
            </Text>
            <Text style={styles.statLabel}>Starting</Text>
          </View>
          <View style={styles.statSep} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, {
              color: totalChange
                ? totalChange < 0 ? Colors.TEAL : Colors.RED
                : Colors.TEXT_TERTIARY,
            }]}>
              {totalChange !== null ? `${totalChange > 0 ? '+' : ''}${totalChange}kg` : '--'}
            </Text>
            <Text style={styles.statLabel}>Total change</Text>
          </View>
          <View style={styles.statSep} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: Colors.PURPLE }]}>
              {logs.length}
            </Text>
            <Text style={styles.statLabel}>Logs</Text>
          </View>
        </View>
      )}

      {/* History */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>History</Text>

        {logs.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="scale-outline" size={32} color={Colors.TEXT_TERTIARY} />
            <Text style={styles.emptyText}>No metrics logged yet</Text>
            <Text style={styles.emptySub}>
              Tap Log metrics to start tracking your progress
            </Text>
          </View>
        ) : (
          logs.map((log, i) => (
            <View
              key={log.id}
              style={[
                styles.logRow,
                i < logs.length - 1 && styles.logRowBorder,
              ]}
            >
              <View style={styles.logIconWrap}>
                <Ionicons name="scale-outline" size={16} color={Colors.BLUE} />
              </View>
              <View style={styles.logInfo}>
                <Text style={styles.logDate}>{formatDate(log.date)}</Text>
                {log.notes && (
                  <Text style={styles.logNotes}>{log.notes}</Text>
                )}
                <View style={styles.logMetaRow}>
                  {log.body_fat_pct && (
                    <Text style={styles.logMeta}>{log.body_fat_pct}% fat</Text>
                  )}
                  {log.waist_cm && (
                    <Text style={styles.logMeta}>{log.waist_cm}cm waist</Text>
                  )}
                </View>
              </View>
              <Text style={[styles.logWeight, { color: Colors.BLUE }]}>
                {log.weight_kg}kg
              </Text>
            </View>
          ))
        )}
      </View>

      {/* Log modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={modalStyles.overlay}>
          <View style={modalStyles.sheet}>
            <View style={modalStyles.handle} />
            <Text style={modalStyles.title}>Log metrics</Text>

            <View style={modalStyles.field}>
              <Text style={modalStyles.fieldLabel}>Weight (kg) *</Text>
              <TextInput
                style={modalStyles.fieldInput}
                value={weight}
                onChangeText={setWeight}
                placeholder="72.5"
                placeholderTextColor={Colors.TEXT_TERTIARY}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={modalStyles.twoCol}>
              <View style={[modalStyles.field, { flex: 1 }]}>
                <Text style={modalStyles.fieldLabel}>Body fat %</Text>
                <TextInput
                  style={modalStyles.fieldInput}
                  value={bodyFat}
                  onChangeText={setBodyFat}
                  placeholder="18.5"
                  placeholderTextColor={Colors.TEXT_TERTIARY}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={[modalStyles.field, { flex: 1 }]}>
                <Text style={modalStyles.fieldLabel}>Waist (cm)</Text>
                <TextInput
                  style={modalStyles.fieldInput}
                  value={waist}
                  onChangeText={setWaist}
                  placeholder="82"
                  placeholderTextColor={Colors.TEXT_TERTIARY}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <View style={modalStyles.field}>
              <Text style={modalStyles.fieldLabel}>Notes (optional)</Text>
              <TextInput
                style={[modalStyles.fieldInput, { height: 80, textAlignVertical: 'top', paddingTop: 12 }]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Morning weight, after workout..."
                placeholderTextColor={Colors.TEXT_TERTIARY}
                multiline
              />
            </View>

            <TouchableOpacity
              style={[modalStyles.saveBtn, (!weight || saving) && { opacity: 0.5 }]}
              onPress={saveMetrics}
              disabled={!weight || saving}
            >
              <Text style={modalStyles.saveBtnText}>
                {saving ? 'Saving...' : 'Save metrics'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={modalStyles.cancelBtn}
              onPress={() => setShowModal(false)}
            >
              <Text style={modalStyles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
  logBtn: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               4,
    backgroundColor:   Colors.BLUE,
    borderRadius:      Radius.FULL,
    paddingHorizontal: Spacing.S4,
    paddingVertical:   Spacing.S2,
  },
  logBtnText: {
    fontSize:   13,
    fontWeight: '600',
    color:      Colors.BG_BASE,
  },
  currentCard: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    marginHorizontal:  Spacing.S5,
    marginBottom:      Spacing.S4,
    backgroundColor:   Colors.BLUE + '10',
    borderRadius:      Radius.LG,
    padding:           Spacing.S5,
    borderWidth:       StyleSheet.hairlineWidth,
    borderColor:       Colors.BLUE + '30',
  },
  currentLeft: {
    gap: 4,
  },
  currentLabel: {
    fontSize:      11,
    fontWeight:    '600',
    color:         Colors.TEXT_TERTIARY,
    textTransform: 'uppercase',
    letterSpacing: 0.1,
  },
  currentValue: {
    fontSize:     48,
    fontWeight:   '700',
    color:        Colors.BLUE,
    letterSpacing: -2,
    lineHeight:   52,
  },
  currentUnit: {
    fontSize:   20,
    fontWeight: '400',
    color:      Colors.TEXT_SECONDARY,
  },
  currentMeta: {
    fontSize: 12,
    color:    Colors.TEXT_TERTIARY,
  },
  changeRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           4,
  },
  changeText: {
    fontSize:   12,
    fontWeight: '500',
  },
  currentRight: {
    gap: 8,
  },
  metricPill: {
    alignItems:        'center',
    backgroundColor:   Colors.BG_SURFACE,
    borderRadius:      Radius.MD,
    paddingHorizontal: Spacing.S3,
    paddingVertical:   Spacing.S2,
    borderWidth:       StyleSheet.hairlineWidth,
    borderColor:       Colors.BORDER,
    minWidth:          64,
  },
  metricPillValue: {
    fontSize:   16,
    fontWeight: '700',
    color:      Colors.TEXT_PRIMARY,
  },
  metricPillLabel: {
    fontSize:   9,
    color:      Colors.TEXT_TERTIARY,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
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
    fontSize:   12,
    fontWeight: '600',
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
  chartBarTrack: {
    flex:           1,
    width:          '100%',
    justifyContent: 'flex-end',
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
  statsRow: {
    flexDirection:     'row',
    marginHorizontal:  Spacing.S5,
    marginBottom:      Spacing.S4,
    backgroundColor:   Colors.BG_SURFACE,
    borderRadius:      Radius.LG,
    borderWidth:       StyleSheet.hairlineWidth,
    borderColor:       Colors.BORDER,
    overflow:          'hidden',
  },
  statItem: {
    flex:            1,
    alignItems:      'center',
    paddingVertical: Spacing.S3,
    gap:             3,
  },
  statSep: {
    width:           StyleSheet.hairlineWidth,
    backgroundColor: Colors.BORDER,
    marginVertical:  Spacing.S2,
  },
  statValue: {
    fontSize:     16,
    fontWeight:   '700',
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize:      9,
    color:         Colors.TEXT_TERTIARY,
    fontWeight:    '500',
    textTransform: 'uppercase',
    letterSpacing: 0.05,
  },
  logRow: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             Spacing.S3,
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
    backgroundColor: Colors.BLUE + '15',
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
  logNotes: {
    fontSize: 11,
    color:    Colors.TEXT_TERTIARY,
  },
  logMetaRow: {
    flexDirection: 'row',
    gap:           8,
  },
  logMeta: {
    fontSize:   11,
    color:      Colors.TEXT_TERTIARY,
  },
  logWeight: {
    fontSize:     18,
    fontWeight:   '700',
    letterSpacing: -0.3,
  },
  emptyWrap: {
    alignItems:      'center',
    paddingVertical: Spacing.S6,
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
    textAlign: 'center',
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex:            1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent:  'flex-end',
  },
  sheet: {
    backgroundColor:      Colors.BG_SURFACE,
    borderTopLeftRadius:  Radius.XL,
    borderTopRightRadius: Radius.XL,
    padding:              Spacing.S6,
    gap:                  Spacing.S4,
  },
  handle: {
    width:           40,
    height:          4,
    borderRadius:    2,
    backgroundColor: Colors.BG_SURFACE_3,
    alignSelf:       'center',
    marginBottom:    Spacing.S2,
  },
  title: {
    fontSize:     20,
    fontWeight:   '700',
    color:        Colors.TEXT_PRIMARY,
    letterSpacing: -0.5,
  },
  field: {
    gap: 8,
  },
  fieldLabel: {
    fontSize:      11,
    fontWeight:    '600',
    color:         Colors.TEXT_TERTIARY,
    textTransform: 'uppercase',
    letterSpacing: 0.08,
  },
  fieldInput: {
    height:            52,
    backgroundColor:   Colors.BG_SURFACE_2,
    borderRadius:      Radius.MD,
    paddingHorizontal: Spacing.S4,
    fontSize:          18,
    fontWeight:        '600',
    color:             Colors.TEXT_PRIMARY,
    borderWidth:       StyleSheet.hairlineWidth,
    borderColor:       Colors.BORDER,
  },
  twoCol: {
    flexDirection: 'row',
    gap:           Spacing.S3,
  },
  saveBtn: {
    height:          56,
    backgroundColor: Colors.BLUE,
    borderRadius:    Radius.FULL,
    alignItems:      'center',
    justifyContent:  'center',
  },
  saveBtnText: {
    fontSize:   16,
    fontWeight: '700',
    color:      Colors.BG_BASE,
  },
  cancelBtn: {
    alignItems:      'center',
    paddingVertical: Spacing.S2,
  },
  cancelText: {
    fontSize:   14,
    color:      Colors.TEXT_TERTIARY,
    fontWeight: '500',
  },
});
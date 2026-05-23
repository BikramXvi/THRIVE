import { View, StyleSheet, ScrollView } from 'react-native';
import { Skeleton } from '../common/Skeleton';
import { Colors, Spacing, Radius } from '../../constants/theme';

export function HomeSkeleton() {
  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.scroll}
      scrollEnabled={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Skeleton width={80}  height={12} />
          <Skeleton width={140} height={28} style={{ marginTop: 6 }} />
        </View>
        <Skeleton width={40} height={40} radius={20} />
      </View>

      {/* Summary card */}
      <View style={styles.card}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Skeleton width={50} height={22} />
            <Skeleton width={60} height={10} style={{ marginTop: 4 }} />
            <Skeleton width='80%' height={3} style={{ marginTop: 6 }} radius={2} />
          </View>
          <Skeleton width={1} height={40} />
          <View style={styles.summaryItem}>
            <Skeleton width={40} height={22} />
            <Skeleton width={55} height={10} style={{ marginTop: 4 }} />
            <Skeleton width='80%' height={3} style={{ marginTop: 6 }} radius={2} />
          </View>
          <Skeleton width={1} height={40} />
          <View style={styles.summaryItem}>
            <Skeleton width={45} height={22} />
            <Skeleton width={45} height={10} style={{ marginTop: 4 }} />
            <Skeleton width='80%' height={3} style={{ marginTop: 6 }} radius={2} />
          </View>
        </View>
      </View>

      {/* Streak card */}
      <View style={[styles.card, styles.streakCard]}>
        <View style={styles.streakLeft}>
          <Skeleton width={32} height={32} radius={16} />
          <View style={{ gap: 4 }}>
            <Skeleton width={60} height={24} />
            <Skeleton width={80} height={10} />
          </View>
        </View>
        <View style={styles.streakDays}>
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} width={24} height={24} radius={6} />
          ))}
        </View>
      </View>

      {/* Quick actions */}
      <Skeleton width={100} height={11} style={{ marginBottom: Spacing.S3 }} />
      <View style={styles.qaRow}>
        {Array.from({ length: 4 }).map((_, i) => (
          <View key={i} style={styles.qaItem}>
            <Skeleton width={40} height={40} radius={12} />
            <Skeleton width={40} height={10} style={{ marginTop: 4 }} />
          </View>
        ))}
      </View>

      {/* Plan section */}
      <Skeleton width={100} height={11} style={{ marginBottom: Spacing.S3, marginTop: Spacing.S4 }} />
      <View style={styles.planCard}>
        <Skeleton width={38} height={38} radius={10} />
        <View style={{ flex: 1, gap: 5 }}>
          <Skeleton width={120} height={14} />
          <Skeleton width={160} height={11} />
        </View>
        <Skeleton width={52} height={32} radius={Radius.SM} />
      </View>
      <View style={[styles.planCard, { marginTop: Spacing.S2 }]}>
        <Skeleton width={38} height={38} radius={10} />
        <View style={{ flex: 1, gap: 5 }}>
          <Skeleton width={100} height={14} />
          <Skeleton width={130} height={11} />
        </View>
        <Skeleton width={52} height={32} radius={Radius.SM} />
      </View>
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
    paddingHorizontal: Spacing.S5,
  },
  header: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'flex-start',
    marginBottom:   Spacing.S6,
  },
  headerLeft: {
    gap: 2,
  },
  card: {
    backgroundColor: Colors.BG_SURFACE,
    borderRadius:    Radius.LG,
    padding:         Spacing.S4,
    borderWidth:     StyleSheet.hairlineWidth,
    borderColor:     Colors.BORDER,
    marginBottom:    Spacing.S4,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.S4,
  },
  summaryItem: {
    flex:       1,
    alignItems: 'center',
  },
  streakCard: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
  },
  streakLeft: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.S3,
  },
  streakDays: {
    flexDirection: 'row',
    gap:           4,
  },
  qaRow: {
    flexDirection: 'row',
    gap:           Spacing.S2,
    marginBottom:  Spacing.S2,
  },
  qaItem: {
    flex:       1,
    alignItems: 'center',
    padding:    Spacing.S3,
    backgroundColor: Colors.BG_SURFACE,
    borderRadius: Radius.MD,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.BORDER,
  },
  planCard: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             Spacing.S3,
    backgroundColor: Colors.BG_SURFACE,
    borderRadius:    Radius.MD,
    padding:         Spacing.S4,
    borderWidth:     StyleSheet.hairlineWidth,
    borderColor:     Colors.BORDER,
  },
});
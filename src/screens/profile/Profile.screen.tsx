import { useState, useEffect } from 'react';
import { workoutService } from '../../services/workout.service';
import { runService } from '../../services/run.service';
import type { WorkoutSessionRow } from '../../services/workout.service';
import type { RunSessionRow } from '../../services/run.service';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../../navigation/TabNavigator';
import { useUIStore } from '../../stores/ui.store';
import type { ProfileStackParamList } from '../../navigation/TabNavigator';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { userService } from '../../services/user.service';
import type { LifetimeStats } from '../../services/user.service';
import { Colors, Spacing, Radius } from '../../constants/theme';

interface UserProfile {
  display_name: string | null;
  username:     string;
  email:        string;
  tier:         string;
  goal:         string | null;
  fitness_level: string | null;
  created_at:   string;
}

const BADGES = [
  { id: 'b1',  icon: 'flame',        color: Colors.ORANGE, label: '21 day streak',  earned: true  },
  { id: 'b2',  icon: 'walk',         color: Colors.BLUE,   label: 'First 10K',      earned: true  },
  { id: 'b3',  icon: 'barbell',      color: Colors.ACCENT, label: '100 workouts',   earned: true  },
  { id: 'b4',  icon: 'trophy',       color: Colors.PURPLE, label: 'PR crusher',     earned: true  },
  { id: 'b5',  icon: 'moon',         color: Colors.TEAL,   label: 'Sleep champ',    earned: true  },
  { id: 'b6',  icon: 'nutrition',    color: Colors.ORANGE, label: '30 day log',     earned: false },
  { id: 'b7',  icon: 'bicycle',      color: Colors.BLUE,   label: 'First cycle',    earned: false },
  { id: 'b8',  icon: 'heart',        color: Colors.RED,    label: 'Heart warrior',  earned: false },
] as const;

const ACTIVITY_FEED = [
  { id: 'a1', type: 'workout', name: 'Push day A',    meta: 'Today · 52 min · 3,420kg',   icon: 'barbell-outline'  as keyof typeof Ionicons.glyphMap, color: Colors.ACCENT, kudos: 12 },
  { id: 'a2', type: 'run',     name: 'Morning run',   meta: 'Yesterday · 6.2km · 4:54/km', icon: 'walk-outline'    as keyof typeof Ionicons.glyphMap, color: Colors.BLUE,   kudos: 8  },
  { id: 'a3', type: 'workout', name: 'Pull day A',    meta: 'Mon · 48 min · 2,840kg',      icon: 'barbell-outline' as keyof typeof Ionicons.glyphMap, color: Colors.ACCENT, kudos: 5  },
  { id: 'a4', type: 'hike',    name: 'Shivapuri hike',meta: 'Sat · 8.4km · 540m elev',     icon: 'trail-sign-outline' as keyof typeof Ionicons.glyphMap, color: Colors.TEAL, kudos: 24 },
];

const SETTINGS_SECTIONS = [
  {
    title: 'Account',
    items: [
      { id: 'profile',  label: 'Edit profile',       icon: 'person-outline'        as keyof typeof Ionicons.glyphMap, type: 'nav'    },
      { id: 'password', label: 'Change password',    icon: 'lock-closed-outline'   as keyof typeof Ionicons.glyphMap, type: 'nav'    },
      { id: 'plan',     label: 'Subscription plan',  icon: 'card-outline'          as keyof typeof Ionicons.glyphMap, type: 'nav', badge: 'Pro' },
    ],
  },
  {
    title: 'Preferences',
    items: [
      { id: 'units',    label: 'Units',              icon: 'scale-outline'         as keyof typeof Ionicons.glyphMap, type: 'nav', value: 'Metric' },
      { id: 'language', label: 'Language',           icon: 'language-outline'      as keyof typeof Ionicons.glyphMap, type: 'nav', value: 'Nepali' },
      { id: 'darkmode', label: 'Dark mode',          icon: 'moon-outline'          as keyof typeof Ionicons.glyphMap, type: 'toggle' },
      { id: 'notifs',   label: 'Notifications',      icon: 'notifications-outline' as keyof typeof Ionicons.glyphMap, type: 'nav'    },
    ],
  },
  {
    title: 'Integrations',
    items: [
      { id: 'health',   label: 'Apple Health',       icon: 'heart-outline'         as keyof typeof Ionicons.glyphMap, type: 'toggle' },
      { id: 'garmin',   label: 'Garmin Connect',     icon: 'watch-outline'         as keyof typeof Ionicons.glyphMap, type: 'nav', badge: 'v2' },
      { id: 'strava',   label: 'Strava export',      icon: 'share-outline'         as keyof typeof Ionicons.glyphMap, type: 'nav'    },
    ],
  },
  {
    title: 'Support',
    items: [
      { id: 'feedback', label: 'Send feedback',      icon: 'chatbubble-outline'    as keyof typeof Ionicons.glyphMap, type: 'nav'    },
      { id: 'privacy',  label: 'Privacy policy',     icon: 'shield-outline'        as keyof typeof Ionicons.glyphMap, type: 'nav'    },
      { id: 'export',   label: 'Export my data',     icon: 'download-outline'      as keyof typeof Ionicons.glyphMap, type: 'nav'    },
    ],
  },
];

type Tab = 'activity' | 'badges' | 'stats';
type ProfileNav = NativeStackNavigationProp<ProfileStackParamList>;

const GOAL_LABELS: Record<string, string> = {
  lose_weight:    'Lose weight',
  build_muscle:   'Build muscle',
  run_faster:     'Run faster',
  flexibility:    'Flexibility',
  general_health: 'General health',
};

const LEVEL_LABELS: Record<string, string> = {
  beginner:     'Beginner',
  intermediate: 'Intermediate',
  advanced:     'Advanced',
};

export function ProfileScreen() {
  const navigation = useNavigation<ProfileNav>();
  const [profile,       setProfile]       = useState<UserProfile | null>(null);
  const [activityFeed, setActivityFeed] = useState(ACTIVITY_FEED);
  const [lifetimeStats, setLifetimeStats] = useState<LifetimeStats>({
    totalWorkouts: 0,
    totalKmRun:    0,
    totalSets:     0,
    totalVolumeKg: 0,
    avgSleepHours: 0,
    currentStreak: 0,
  });
  const [activeTab,  setActiveTab]  = useState<Tab>('activity');
  const [darkMode,   setDarkMode]   = useState(true);
  const [healthSync, setHealthSync] = useState(false);

  useEffect(() => { loadProfile(); }, []);

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
  
    const [profileRes, statsRes, streakRes, workoutsRes, runsRes] = await Promise.all([
      supabase
        .from('users')
        .select('display_name, username, tier, goal, fitness_level, created_at')
        .eq('id', user.id)
        .single(),
      userService.getLifetimeStats(user.id),
      workoutService.getStreak(user.id),
      workoutService.getRecentSessions(user.id, 5),
      runService.getSessions(user.id, 5),
    ]);
  
    if (profileRes.data) setProfile({ ...profileRes.data as any, email: user.email ?? '' });
    if (statsRes.data) setLifetimeStats({
      ...statsRes.data,
      currentStreak: streakRes.data ?? 0,
    });
  
    // Build real activity feed
    const workoutActivities = ((workoutsRes.data ?? []) as WorkoutSessionRow[]).map((w) => ({
      id:    w.id,
      type:  'workout' as const,
      name:  w.name,
      meta:  `${new Date(w.started_at).toLocaleDateString('en-NP')} · ${
        w.duration_seconds ? Math.round(w.duration_seconds / 60) + ' min' : '--'
      } · ${Math.round(w.total_volume_kg ?? 0).toLocaleString()}kg`,
      icon:  'barbell-outline' as keyof typeof Ionicons.glyphMap,
      color: Colors.ACCENT,
      kudos: 0,
    }));
  
    const runActivities = ((runsRes.data ?? []) as RunSessionRow[]).map((r) => ({
      id:    r.id,
      type:  'run' as const,
      name:  r.activity_type.charAt(0).toUpperCase() + r.activity_type.slice(1),
      meta:  `${new Date(r.started_at).toLocaleDateString('en-NP')} · ${(r.distance_m / 1000).toFixed(2)}km`,
      icon:  'walk-outline' as keyof typeof Ionicons.glyphMap,
      color: Colors.BLUE,
      kudos: 0,
    }));
  
    const combined = [...workoutActivities, ...runActivities]
      .sort((a, b) => 0)
      .slice(0, 6);
  
    if (combined.length > 0) setActivityFeed(combined);
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  const firstName    = profile?.display_name?.split(' ')[0] ?? profile?.username ?? 'Athlete';
  const memberSince  = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-NP', { month: 'long', year: 'numeric' })
    : 'Today';

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(profile?.display_name ?? profile?.username ?? 'A')[0].toUpperCase()}
            </Text>
          </View>
          <TouchableOpacity style={styles.avatarEdit}>
            <Ionicons name="camera-outline" size={12} color={Colors.TEXT_PRIMARY} />
          </TouchableOpacity>
        </View>

        <Text style={styles.profileName}>{firstName}</Text>
        <Text style={styles.profileHandle}>
          @{profile?.username ?? 'athlete'} · Kathmandu
        </Text>

        <View style={styles.profileChips}>
          {profile?.tier && (
            <View style={[styles.chip, { backgroundColor: Colors.ACCENT_DIM, borderColor: Colors.ACCENT + '40' }]}>
              <Text style={[styles.chipText, { color: Colors.ACCENT }]}>
                {profile.tier.charAt(0).toUpperCase() + profile.tier.slice(1)}
              </Text>
            </View>
          )}
          {profile?.goal && (
            <View style={styles.chip}>
              <Text style={styles.chipText}>{GOAL_LABELS[profile.goal] ?? profile.goal}</Text>
            </View>
          )}
          {profile?.fitness_level && (
            <View style={styles.chip}>
              <Text style={styles.chipText}>{LEVEL_LABELS[profile.fitness_level] ?? profile.fitness_level}</Text>
            </View>
          )}
        </View>

        <Text style={styles.memberSince}>Member since {memberSince}</Text>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: Colors.ACCENT }]}>{lifetimeStats.totalWorkouts}</Text>
          <Text style={styles.statLabel}>Workouts</Text>
        </View>
        <View style={styles.statSep} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: Colors.BLUE }]}>{lifetimeStats.totalKmRun}</Text>
          <Text style={styles.statLabel}>km run</Text>
        </View>
        <View style={styles.statSep} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: Colors.ORANGE }]}>{lifetimeStats.currentStreak}</Text>
          <Text style={styles.statLabel}>Streak</Text>
        </View>
        <View style={styles.statSep} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: Colors.TEAL }]}>{lifetimeStats.totalVolumeKg.toLocaleString()}</Text>
          <Text style={styles.statLabel}>kg lifted</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['activity', 'badges', 'stats'] as Tab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[
              styles.tabText,
              activeTab === tab && styles.tabTextActive,
            ]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Activity tab */}
      {activeTab === 'activity' && (
  <View style={styles.tabContent}>
    {activityFeed.length === 0 ? (
      <View style={{ padding: Spacing.S6, alignItems: 'center' }}>
        <Text style={{ color: Colors.TEXT_TERTIARY, fontSize: 13 }}>
          No activity yet. Complete a workout or run to see it here.
        </Text>
      </View>
    ) : (
      activityFeed.map((activity) => (
        <View key={activity.id} style={styles.activityRow}>
          <View style={[styles.activityIcon, { backgroundColor: activity.color + '15' }]}>
            <Ionicons name={activity.icon} size={18} color={activity.color} />
          </View>
          <View style={styles.activityInfo}>
            <Text style={styles.activityName}>{activity.name}</Text>
            <Text style={styles.activityMeta}>{activity.meta}</Text>
          </View>
          <TouchableOpacity style={styles.kudosBtn}>
            <Ionicons name="heart-outline" size={14} color={Colors.RED} />
            <Text style={styles.kudosCount}>{activity.kudos}</Text>
          </TouchableOpacity>
        </View>
      ))
    )}
  </View>
)}



      {/* Badges tab */}
      {activeTab === 'badges' && (
        <View style={styles.badgesGrid}>
          {BADGES.map((badge) => (
            <View
              key={badge.id}
              style={[
                styles.badgeItem,
                !badge.earned && styles.badgeItemLocked,
              ]}
            >
              <View style={[
                styles.badgeIcon,
                { backgroundColor: badge.earned ? badge.color + '20' : Colors.BG_SURFACE_3 },
              ]}>
                <Ionicons
                  name={badge.icon as keyof typeof Ionicons.glyphMap}
                  size={24}
                  color={badge.earned ? badge.color : Colors.TEXT_TERTIARY}
                />
                {!badge.earned && (
                  <View style={styles.badgeLock}>
                    <Ionicons name="lock-closed" size={10} color={Colors.TEXT_TERTIARY} />
                  </View>
                )}
              </View>
              <Text style={[
                styles.badgeLabel,
                !badge.earned && styles.badgeLabelLocked,
              ]}>
                {badge.label}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Stats tab */}
      {activeTab === 'stats' && (
        <View style={styles.tabContent}>
          <View style={styles.statsCard}>
            <Text style={styles.statsCardTitle}>Lifetime totals</Text>
            <View style={styles.statsCardGrid}>
              <View style={styles.statsCardItem}>
                <Text style={[styles.statsCardValue, { color: Colors.ACCENT }]}>{lifetimeStats.totalWorkouts}</Text>
                <Text style={styles.statsCardLabel}>Total workouts</Text>
              </View>
              <View style={styles.statsCardItem}>
                <Text style={[styles.statsCardValue, { color: Colors.BLUE }]}>{lifetimeStats.totalKmRun}km</Text>
                <Text style={styles.statsCardLabel}>Total distance</Text>
              </View>
              <View style={styles.statsCardItem}>
                <Text style={[styles.statsCardValue, { color: Colors.ORANGE }]}>{lifetimeStats.totalSets.toLocaleString()}</Text>
                <Text style={styles.statsCardLabel}>Total sets</Text>
              </View>
              <View style={styles.statsCardItem}>
                <Text style={[styles.statsCardValue, { color: Colors.PURPLE }]}>{lifetimeStats.totalVolumeKg.toLocaleString()}kg</Text>
                <Text style={styles.statsCardLabel}>kg lifted</Text>
              </View>
              <View style={styles.statsCardItem}>
                <Text style={[styles.statsCardValue, { color: Colors.TEAL }]}>{lifetimeStats.avgSleepHours}h</Text>
                <Text style={styles.statsCardLabel}>Avg sleep</Text>
              </View>
            </View>
          </View>

          <View style={styles.statsCard}>
            <Text style={styles.statsCardTitle}>Best month</Text>
            <View style={styles.bestMonthRow}>
              <Ionicons name="trophy" size={24} color={Colors.ACCENT} />
              <View>
                <Text style={styles.bestMonthValue}>March 2026</Text>
                <Text style={styles.bestMonthMeta}>22 workouts · 68km run · 42 day streak</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Settings */}
{/* Settings */}
{/* Settings */}
<View style={styles.settingsDivider} />

{SETTINGS_SECTIONS.map((section) => (
  <View key={section.title} style={styles.settingsSection}>
    <Text style={styles.settingsSectionTitle}>{section.title}</Text>
    <View style={styles.settingsCard}>
      {section.items.map((item, i) => (
        <TouchableOpacity
          key={item.id}
          style={[
            styles.settingsRow,
            i < section.items.length - 1 && styles.settingsRowBorder,
          ]}
          onPress={() => {
            if (item.id === 'profile')  return navigation.navigate('EditProfile');
            if (item.id === 'password') return useUIStore.getState().showToast('Password reset email sent!', 'success');
            if (item.id === 'plan')     return useUIStore.getState().showToast('Payments coming in v2', 'info');
            if (item.id === 'units')    return useUIStore.getState().showToast('Metric units only for now', 'info');
            if (item.id === 'language') return useUIStore.getState().showToast('Nepali language coming soon', 'info');
            if (item.id === 'notifs')   return useUIStore.getState().showToast('Notifications coming soon', 'info');
            if (item.id === 'health')   return useUIStore.getState().showToast('Apple Health coming in v2', 'info');
            if (item.id === 'garmin')   return useUIStore.getState().showToast('Garmin Connect coming in v2', 'info');
            if (item.id === 'strava')   return useUIStore.getState().showToast('Strava export coming soon', 'info');
            if (item.id === 'feedback') return useUIStore.getState().showToast('Send feedback coming soon', 'info');
            if (item.id === 'privacy')  return useUIStore.getState().showToast('Privacy policy coming soon', 'info');
            if (item.id === 'export')   return useUIStore.getState().showToast('Data export coming soon', 'info');
          }}
        >
          <View style={styles.settingsRowLeft}>
            <View style={styles.settingsIconWrap}>
              <Ionicons name={item.icon} size={16} color={Colors.TEXT_SECONDARY} />
            </View>
            <Text style={styles.settingsLabel}>{item.label}</Text>
          </View>
          <View style={styles.settingsRowRight}>
            {'value' in item && item.value && (
              <Text style={styles.settingsValue}>{item.value}</Text>
            )}
            {'badge' in item && item.badge && (
              <View style={styles.settingsBadge}>
                <Text style={styles.settingsBadgeText}>{item.badge}</Text>
              </View>
            )}
            {item.type === 'toggle' && (
              <Switch
                value={item.id === 'darkmode' ? darkMode : healthSync}
                onValueChange={(v) => {
                  if (item.id === 'darkmode') setDarkMode(v);
                  if (item.id === 'health')   setHealthSync(v);
                }}
                trackColor={{ false: Colors.BG_SURFACE_3, true: Colors.ACCENT }}
                thumbColor={Colors.BG_BASE}
              />
            )}
            {item.type === 'nav' && (
              <Ionicons name="chevron-forward" size={14} color={Colors.TEXT_TERTIARY} />
            )}
          </View>
        </TouchableOpacity>
      ))}
    </View>
  </View>
))}

{/* Sign out */}
<TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
  <Ionicons name="log-out-outline" size={16} color={Colors.RED} />
  <Text style={styles.signOutText}>Sign out</Text>
</TouchableOpacity>

<Text style={styles.version}>Thrive v1.0.0 · Made in Nepal 🇳🇵</Text>

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

  // Profile header
  profileHeader: {
    alignItems:        'center',
    paddingHorizontal: Spacing.S5,
    marginBottom:      Spacing.S5,
    gap:               Spacing.S2,
  },
  avatarWrap: {
    position:     'relative',
    marginBottom: Spacing.S2,
  },
  avatar: {
    width:           80,
    height:          80,
    borderRadius:    40,
    backgroundColor: Colors.BG_SURFACE_2,
    borderWidth:     2,
    borderColor:     Colors.ACCENT,
    alignItems:      'center',
    justifyContent:  'center',
  },
  avatarText: {
    fontSize:   28,
    fontWeight: '700',
    color:      Colors.ACCENT,
  },
  avatarEdit: {
    position:        'absolute',
    bottom:          0,
    right:           0,
    width:           26,
    height:          26,
    borderRadius:    13,
    backgroundColor: Colors.BG_SURFACE_2,
    borderWidth:     1.5,
    borderColor:     Colors.BG_BASE,
    alignItems:      'center',
    justifyContent:  'center',
  },
  profileName: {
    fontSize:     24,
    fontWeight:   '700',
    color:        Colors.TEXT_PRIMARY,
    letterSpacing: -0.5,
  },
  profileHandle: {
    fontSize: 13,
    color:    Colors.TEXT_TERTIARY,
  },
  profileChips: {
    flexDirection:  'row',
    gap:            6,
    flexWrap:       'wrap',
    justifyContent: 'center',
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical:   4,
    borderRadius:      Radius.FULL,
    backgroundColor:   Colors.BG_SURFACE_2,
    borderWidth:       StyleSheet.hairlineWidth,
    borderColor:       Colors.BORDER,
  },
  chipText: {
    fontSize:   11,
    color:      Colors.TEXT_SECONDARY,
    fontWeight: '500',
  },
  memberSince: {
    fontSize: 11,
    color:    Colors.TEXT_TERTIARY,
  },

  // Stats row
  statsRow: {
    flexDirection:     'row',
    marginHorizontal:  Spacing.S5,
    marginBottom:      Spacing.S5,
    backgroundColor:   Colors.BG_SURFACE,
    borderRadius:      Radius.LG,
    borderWidth:       StyleSheet.hairlineWidth,
    borderColor:       Colors.BORDER,
    overflow:          'hidden',
  },
  statItem: {
    flex:           1,
    alignItems:     'center',
    paddingVertical: Spacing.S4,
    gap:            3,
  },
  statSep: {
    width:           StyleSheet.hairlineWidth,
    backgroundColor: Colors.BORDER,
    marginVertical:  Spacing.S3,
  },
  statValue: {
    fontSize:     20,
    fontWeight:   '700',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize:      9,
    color:         Colors.TEXT_TERTIARY,
    fontWeight:    '500',
    textTransform: 'uppercase',
    letterSpacing: 0.05,
  },

  // Tabs
  tabs: {
    flexDirection:     'row',
    marginHorizontal:  Spacing.S5,
    marginBottom:      Spacing.S4,
    backgroundColor:   Colors.BG_SURFACE,
    borderRadius:      Radius.FULL,
    padding:           3,
    borderWidth:       StyleSheet.hairlineWidth,
    borderColor:       Colors.BORDER,
  },
  tab: {
    flex:           1,
    paddingVertical: 8,
    alignItems:     'center',
    borderRadius:   Radius.FULL,
  },
  tabActive: {
    backgroundColor: Colors.BG_BASE,
  },
  tabText: {
    fontSize:   12,
    fontWeight: '500',
    color:      Colors.TEXT_TERTIARY,
  },
  tabTextActive: {
    color:      Colors.TEXT_PRIMARY,
    fontWeight: '600',
  },

  // Tab content
  tabContent: {
    marginBottom: Spacing.S4,
  },

  // Activity feed
  activityRow: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: Spacing.S5,
    paddingVertical:   Spacing.S3,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.BORDER,
    gap:               Spacing.S3,
  },
  activityIcon: {
    width:          40,
    height:         40,
    borderRadius:   12,
    alignItems:     'center',
    justifyContent: 'center',
  },
  activityInfo: {
    flex: 1,
    gap:  2,
  },
  activityName: {
    fontSize:   14,
    fontWeight: '500',
    color:      Colors.TEXT_PRIMARY,
  },
  activityMeta: {
    fontSize: 11,
    color:    Colors.TEXT_TERTIARY,
  },
  kudosBtn: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius:  Radius.FULL,
    backgroundColor: Colors.RED + '10',
    borderWidth:   StyleSheet.hairlineWidth,
    borderColor:   Colors.RED + '30',
  },
  kudosCount: {
    fontSize:   11,
    color:      Colors.RED,
    fontWeight: '600',
  },

  // Badges
  badgesGrid: {
    flexDirection:     'row',
    flexWrap:          'wrap',
    paddingHorizontal: Spacing.S5,
    gap:               12,
    marginBottom:      Spacing.S4,
  },
  badgeItem: {
    width:      '21%',
    alignItems: 'center',
    gap:        6,
  },
  badgeItemLocked: {
    opacity: 0.4,
  },
  badgeIcon: {
    width:          56,
    height:         56,
    borderRadius:   16,
    alignItems:     'center',
    justifyContent: 'center',
    position:       'relative',
  },
  badgeLock: {
    position:        'absolute',
    bottom:          -2,
    right:           -2,
    width:           18,
    height:          18,
    borderRadius:    9,
    backgroundColor: Colors.BG_SURFACE_2,
    borderWidth:     1.5,
    borderColor:     Colors.BG_BASE,
    alignItems:      'center',
    justifyContent:  'center',
  },
  badgeLabel: {
    fontSize:   9,
    color:      Colors.TEXT_SECONDARY,
    fontWeight: '500',
    textAlign:  'center',
    lineHeight: 13,
  },
  badgeLabelLocked: {
    color: Colors.TEXT_TERTIARY,
  },

  // Stats tab
  statsCard: {
    marginHorizontal:  Spacing.S5,
    marginBottom:      Spacing.S3,
    backgroundColor:   Colors.BG_SURFACE,
    borderRadius:      Radius.LG,
    padding:           Spacing.S4,
    borderWidth:       StyleSheet.hairlineWidth,
    borderColor:       Colors.BORDER,
  },
  statsCardTitle: {
    fontSize:      11,
    fontWeight:    '600',
    color:         Colors.TEXT_TERTIARY,
    textTransform: 'uppercase',
    letterSpacing: 0.1,
    marginBottom:  Spacing.S4,
  },
  statsCardGrid: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           Spacing.S4,
  },
  statsCardItem: {
    width: '45%',
    gap:   3,
  },
  statsCardValue: {
    fontSize:     22,
    fontWeight:   '700',
    letterSpacing: -0.5,
  },
  statsCardLabel: {
    fontSize:   11,
    color:      Colors.TEXT_TERTIARY,
    fontWeight: '500',
  },
  bestMonthRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.S3,
  },
  bestMonthValue: {
    fontSize:   16,
    fontWeight: '600',
    color:      Colors.TEXT_PRIMARY,
    marginBottom: 2,
  },
  bestMonthMeta: {
    fontSize: 12,
    color:    Colors.TEXT_TERTIARY,
  },

  // Settings
  settingsDivider: {
    height:          8,
    backgroundColor: Colors.BG_SURFACE,
    marginVertical:  Spacing.S5,
    borderTopWidth:  StyleSheet.hairlineWidth,
    borderTopColor:  Colors.BORDER,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.BORDER,
  },
  settingsSection: {
    marginBottom: Spacing.S5,
    paddingHorizontal: Spacing.S5,
  },
  settingsSectionTitle: {
    fontSize:      11,
    fontWeight:    '600',
    color:         Colors.TEXT_TERTIARY,
    textTransform: 'uppercase',
    letterSpacing: 0.1,
    marginBottom:  Spacing.S2,
  },
  settingsCard: {
    backgroundColor: Colors.BG_SURFACE,
    borderRadius:    Radius.LG,
    borderWidth:     StyleSheet.hairlineWidth,
    borderColor:     Colors.BORDER,
    overflow:        'hidden',
  },
  settingsRow: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: Spacing.S4,
    paddingVertical:   Spacing.S3,
  },
  settingsRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.BORDER,
  },
  settingsRowLeft: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.S3,
  },
  settingsIconWrap: {
    width:          32,
    height:         32,
    borderRadius:   10,
    backgroundColor: Colors.BG_SURFACE_2,
    alignItems:     'center',
    justifyContent: 'center',
  },
  settingsLabel: {
    fontSize:   14,
    color:      Colors.TEXT_PRIMARY,
    fontWeight: '400',
  },
  settingsRowRight: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.S2,
  },
  settingsValue: {
    fontSize:   13,
    color:      Colors.TEXT_TERTIARY,
  },
  settingsBadge: {
    paddingHorizontal: 8,
    paddingVertical:   3,
    borderRadius:      Radius.FULL,
    backgroundColor:   Colors.ACCENT_DIM,
    borderWidth:       StyleSheet.hairlineWidth,
    borderColor:       Colors.ACCENT + '40',
  },
  settingsBadgeText: {
    fontSize:   10,
    color:      Colors.ACCENT,
    fontWeight: '600',
  },

  // Sign out
  signOutBtn: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            8,
    marginHorizontal: Spacing.S5,
    marginBottom:   Spacing.S4,
    paddingVertical: 14,
    borderRadius:   Radius.LG,
    backgroundColor: Colors.RED_DIM,
    borderWidth:    StyleSheet.hairlineWidth,
    borderColor:    Colors.RED + '30',
  },
  signOutText: {
    fontSize:   14,
    fontWeight: '600',
    color:      Colors.RED,
  },

  // Version
  version: {
    textAlign:     'center',
    fontSize:      11,
    color:         Colors.TEXT_TERTIARY,
    paddingBottom: Spacing.S4,
  },
});
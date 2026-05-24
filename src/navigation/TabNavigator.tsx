import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SleepScreen } from '../screens/sleep/Sleep.screen';
import { BodyMetricsScreen } from '../screens/metrics/BodyMetrics.screen';
import { EditProfileScreen } from '../screens/profile/EditProfile.screen';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState, useRef } from 'react';
import { Colors, Spacing, Radius } from '../constants/theme';
import { HomeScreen } from '../screens/home/Home.screen';
import { WorkoutListScreen } from '../screens/workout/WorkoutList.screen';
import { ActiveWorkoutScreen } from '../screens/workout/ActiveWorkout.screen';
import { DietScreen as DietScreenComponent } from '../screens/diet/Diet.screen';
import { RunScreen as RunScreenComponent } from '../screens/run/Run.screen';
import { ProfileScreen as ProfileScreenComponent } from '../screens/profile/Profile.screen';
import { AICoachScreen } from '../screens/ai/AICoach.screen';
import { supabase } from '../lib/supabase';
import { CommonActions } from '@react-navigation/native';
import { navigate, navigationRef } from '../lib/navigation';
import { useUIStore } from '../stores/ui.store';

export type TabParamList = {
  Home:    undefined;
  Train:   undefined;
  Diet:    undefined;
  Run:     undefined;
  Profile: undefined;
};

export type TrainStackParamList = {
  WorkoutList:   undefined;
  ActiveWorkout: {
    programId:   string;
    programName: string;
    exercises:   string[]; 
    resume?: boolean;
  } | undefined;
};

export type HomeStackParamList = {
  Sleep: undefined;
  HomeMain: undefined;
  AICoach:  undefined;
  BodyMetrics: undefined;
  EditProfile: undefined;
};

export type ProfileStackParamList = {
  ProfileMain: undefined;
  EditProfile: undefined;
};

const Tab   = createBottomTabNavigator<TabParamList>();
const Train = createNativeStackNavigator<TrainStackParamList>();
const Home  = createNativeStackNavigator<HomeStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

function TrainNavigator() {
  return (
    <Train.Navigator screenOptions={{ headerShown: false }}>
      <Train.Screen name="WorkoutList"   component={WorkoutListScreen} />
      <Train.Screen name="ActiveWorkout" component={ActiveWorkoutScreen} />
    </Train.Navigator>
  );
}

function HomeNavigator() {
  return (
    <Home.Navigator screenOptions={{ headerShown: false }}>
      <Home.Screen name="HomeMain" component={HomeScreen} />
      <Home.Screen name="AICoach"  component={AICoachScreen} />
      <Home.Screen name="Sleep"    component={SleepScreen} />
      <Home.Screen name="BodyMetrics" component={BodyMetricsScreen} />
      <Home.Screen name="EditProfile" component={EditProfileScreen} />
    </Home.Navigator>
  );
}

function ProfileNavigator() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="ProfileMain" component={ProfileScreen}     />
      <ProfileStack.Screen name="EditProfile" component={EditProfileScreen} />
    </ProfileStack.Navigator>
  );
}

function DietScreen()    { return <DietScreenComponent />;    }
function RunScreen()     { return <RunScreenComponent />;     }
function ProfileScreen() { return <ProfileScreenComponent />; }

// ─── Sleep log bottom sheet ───────────────────────────────────────────────────
interface SleepSheetProps {
  visible:  boolean;
  onClose:  () => void;
}

export function SleepSheet({ visible, onClose }: SleepSheetProps) {
  const [bedtime,  setBedtime]  = useState('22:00');
  const [wakeTime, setWakeTime] = useState('06:00');
  const [quality,  setQuality]  = useState(4);
  const [notes,    setNotes]    = useState('');
  const [saving,   setSaving]   = useState(false);

  function calcDuration(): number {
    const [bh, bm] = bedtime.split(':').map(Number);
    const [wh, wm] = wakeTime.split(':').map(Number);
    let mins = (wh * 60 + wm) - (bh * 60 + bm);
    if (mins < 0) mins += 24 * 60;
    return mins;
  }

  const durationMins = calcDuration();
  const durationStr  = `${Math.floor(durationMins / 60)}h ${durationMins % 60}m`;

  async function save() {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today    = new Date();
      const bedDate  = new Date(today);
      const wakeDate = new Date(today);

      const [bh, bm] = bedtime.split(':').map(Number);
      const [wh, wm] = wakeTime.split(':').map(Number);

      bedDate.setHours(bh, bm, 0, 0);
      wakeDate.setHours(wh, wm, 0, 0);
      if (wakeDate <= bedDate) wakeDate.setDate(wakeDate.getDate() + 1);

      await supabase.from('sleep_logs').insert({
        user_id:          user.id,
        bedtime:          bedDate.toISOString(),
        wake_time:        wakeDate.toISOString(),
        duration_minutes: durationMins,
        quality_rating:   quality,
        notes:            notes || null,
        source:           'manual',
        date:             today.toISOString().split('T')[0],
      } as any);

      useUIStore.getState().showToast('Sleep logged successfully', 'success');
      onClose();
    } catch (err) {
      console.error('Sleep save error:', err);
      useUIStore.getState().showToast('Could not save sleep log', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={sheetStyles.overlay} onPress={onClose}>
        <Pressable style={sheetStyles.sheet} onPress={() => {}}>
          <View style={sheetStyles.handle} />
          <Text style={sheetStyles.title}>Log sleep</Text>

          <View style={sheetStyles.timeRow}>
            <View style={sheetStyles.timeItem}>
              <Text style={sheetStyles.timeLabel}>Bedtime</Text>
              <TextInput
                style={sheetStyles.timeInput}
                value={bedtime}
                onChangeText={setBedtime}
                placeholder="22:00"
                placeholderTextColor={Colors.TEXT_TERTIARY}
                keyboardType="numbers-and-punctuation"
              />
            </View>
            <Ionicons name="arrow-forward" size={16} color={Colors.TEXT_TERTIARY} />
            <View style={sheetStyles.timeItem}>
              <Text style={sheetStyles.timeLabel}>Wake time</Text>
              <TextInput
                style={sheetStyles.timeInput}
                value={wakeTime}
                onChangeText={setWakeTime}
                placeholder="06:00"
                placeholderTextColor={Colors.TEXT_TERTIARY}
                keyboardType="numbers-and-punctuation"
              />
            </View>
          </View>

          <View style={sheetStyles.durationRow}>
            <Ionicons name="moon-outline" size={14} color={Colors.TEAL} />
            <Text style={sheetStyles.durationText}>
              Duration: <Text style={{ color: Colors.TEAL }}>{durationStr}</Text>
            </Text>
          </View>

          <Text style={sheetStyles.qualityLabel}>Sleep quality</Text>
          <View style={sheetStyles.qualityRow}>
            {[1, 2, 3, 4, 5].map((q) => (
              <TouchableOpacity
                key={q}
                style={[
                  sheetStyles.qualityBtn,
                  quality === q && sheetStyles.qualityBtnActive,
                ]}
                onPress={() => setQuality(q)}
              >
                <Text style={[
                  sheetStyles.qualityBtnText,
                  quality === q && sheetStyles.qualityBtnTextActive,
                ]}>
                  {q}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={sheetStyles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Notes (optional)..."
            placeholderTextColor={Colors.TEXT_TERTIARY}
            multiline
          />

          <TouchableOpacity
            style={[sheetStyles.saveBtn, saving && { opacity: 0.6 }]}
            onPress={save}
            disabled={saving}
          >
            <Text style={sheetStyles.saveBtnText}>
              {saving ? 'Saving...' : 'Save sleep log'}
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Weight log bottom sheet ──────────────────────────────────────────────────
interface WeightSheetProps {
  visible: boolean;
  onClose: () => void;
}

function WeightSheet({ visible, onClose }: WeightSheetProps) {
  const [weight, setWeight] = useState('');
  const [notes,  setNotes]  = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!weight) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('body_metrics').insert({
        user_id:   user.id,
        weight_kg: parseFloat(weight),
        notes:     notes || null,
        date:      new Date().toISOString().split('T')[0],
        logged_at: new Date().toISOString(),
      } as any);

      useUIStore.getState().showToast(`Weight logged: ${weight}kg`, 'success'); // ADD THIS
      setWeight('');
      setNotes('');
      onClose();
    } catch (err) {
      console.error('Weight save error:', err);
      useUIStore.getState().showToast('Could not save weight', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={sheetStyles.overlay} onPress={onClose}>
        <Pressable style={sheetStyles.sheet} onPress={() => {}}>
          <View style={sheetStyles.handle} />
          <Text style={sheetStyles.title}>Log weight</Text>

          <View style={sheetStyles.weightInputWrap}>
            <TextInput
              style={sheetStyles.weightInput}
              value={weight}
              onChangeText={setWeight}
              placeholder="0.0"
              placeholderTextColor={Colors.TEXT_TERTIARY}
              keyboardType="decimal-pad"
              autoFocus
            />
            <Text style={sheetStyles.weightUnit}>kg</Text>
          </View>

          <TextInput
            style={sheetStyles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Notes (optional)..."
            placeholderTextColor={Colors.TEXT_TERTIARY}
            multiline
          />

          <TouchableOpacity
            style={[
              sheetStyles.saveBtn,
              (!weight || saving) && { opacity: 0.4 },
            ]}
            onPress={save}
            disabled={!weight || saving}
          >
            <Text style={sheetStyles.saveBtnText}>
              {saving ? 'Saving...' : 'Save weight'}
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── FAB ─────────────────────────────────────────────────────────────────────
function FAB() {
  const [open,       setOpen]       = useState(false);
  const [showSleep,  setShowSleep]  = useState(false);
  const [showWeight, setShowWeight] = useState(false);

  function handleAction(id: string) {
    setOpen(false);
    setTimeout(() => {
      switch (id) {
        case 'workout':
          navigate('Train');
          break;
        case 'run':
          navigate('Run');
          break;
        case 'weight':
          navigate('BodyMetrics');
          break;
        case 'food':
          navigate('Diet');
          break;
        case 'sleep':
          setShowSleep(true);
          break;
        case 'weight':
          setShowWeight(true);
          break;
          case 'kai':
            navigate('Home');
            setTimeout(() => {
              if (navigationRef.isReady()) {
                navigationRef.dispatch(
                  CommonActions.navigate('AICoach')
                );
              }
            }, 300);
            break;
      }
    }, 200);
  }

  return (
    <>
      <SleepSheet
        visible={showSleep}
        onClose={() => setShowSleep(false)}
      />
      <WeightSheet
        visible={showWeight}
        onClose={() => setShowWeight(false)}
      />

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={fabStyles.backdrop} onPress={() => setOpen(false)}>
          <View style={fabStyles.actionsContainer}>
            {FAB_ACTIONS.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={fabStyles.actionRow}
                onPress={() => handleAction(action.id)}
              >
                <View style={fabStyles.actionLabelWrap}>
                  <Text style={fabStyles.actionLabel}>{action.label}</Text>
                </View>
                <View style={[
                  fabStyles.actionIcon,
                  { backgroundColor: action.color + '20' },
                ]}>
                  <Ionicons name={action.icon} size={18} color={action.color} />
                </View>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={fabStyles.fabClose}
              onPress={() => setOpen(false)}
            >
              <Ionicons name="close" size={26} color={Colors.BG_BASE} />
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      <TouchableOpacity
        style={fabStyles.fab}
        onPress={() => setOpen(true)}
        activeOpacity={0.9}
      >
        <Ionicons name="add" size={28} color={Colors.BG_BASE} />
      </TouchableOpacity>
    </>
  );
}

const FAB_ACTIONS: {
  id:    string;
  label: string;
  icon:  keyof typeof Ionicons.glyphMap;
  color: string;
}[] = [
  { id: 'workout', label: 'Log Workout',    icon: 'barbell-outline',   color: Colors.ACCENT  },
  { id: 'run',     label: 'Start Run',      icon: 'walk-outline',      color: Colors.BLUE    },
  { id: 'food',    label: 'Log Food',       icon: 'nutrition-outline', color: Colors.ORANGE  },
  { id: 'sleep',   label: 'Log Sleep',  icon: 'moon-outline',      color: Colors.TEAL    },
  { id: 'weight',  label: 'Log Weight',     icon: 'scale-outline',     color: Colors.PURPLE  },
  { id: 'kai',     label: 'Ask Kai',        icon: 'sparkles-outline',  color: Colors.PURPLE  },
];

export function TabNavigator() {
  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown:             false,
          tabBarStyle:             styles.tabBar,
          tabBarActiveTintColor:   Colors.ACCENT,
          tabBarInactiveTintColor: Colors.TEXT_TERTIARY,
          tabBarLabelStyle:        styles.tabLabel,
          tabBarIcon: ({ color }) => {
            const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
              Home:    'home-outline',
              Train:   'barbell-outline',
              Diet:    'nutrition-outline',
              Run:     'walk-outline',
              Profile: 'person-outline',
            };
            return (
              <Ionicons name={icons[route.name]} size={22} color={color} />
            );
          },
        })}
      >
        <Tab.Screen name="Home"    component={HomeNavigator}  />
        <Tab.Screen name="Train"   component={TrainNavigator} />
        <Tab.Screen name="Diet"    component={DietScreen}     />
        <Tab.Screen name="Run"     component={RunScreen}      />
        <Tab.Screen name="Profile" component={ProfileNavigator}  />
      </Tab.Navigator>

      <FAB />
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.BG_SURFACE,
    borderTopColor:  Colors.BORDER,
    borderTopWidth:  StyleSheet.hairlineWidth,
    height:          84,
    paddingBottom:   28,
    paddingTop:      8,
  },
  tabLabel: {
    fontSize:   10,
    fontWeight: '500',
  },
});

const fabStyles = StyleSheet.create({
  fab: {
    position:        'absolute',
    bottom:          96,
    right:           Spacing.S5,
    width:           54,
    height:          54,
    borderRadius:    27,
    backgroundColor: Colors.ACCENT,
    alignItems:      'center',
    justifyContent:  'center',
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 4 },
    shadowOpacity:   0.3,
    shadowRadius:    8,
    elevation:       8,
    zIndex:          100,
  },
  backdrop: {
    flex:            1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent:  'flex-end',
    alignItems:      'flex-end',
  },
  actionsContainer: {
    alignItems:    'flex-end',
    paddingRight:  Spacing.S5,
    paddingBottom: 100,
    gap:           10,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.S3,
  },
  actionLabelWrap: {
    backgroundColor:   Colors.BG_SURFACE,
    paddingHorizontal: Spacing.S4,
    paddingVertical:   Spacing.S2,
    borderRadius:      Radius.MD,
    borderWidth:       StyleSheet.hairlineWidth,
    borderColor:       Colors.BORDER_2,
  },
  actionLabel: {
    fontSize:   13,
    fontWeight: '600',
    color:      Colors.TEXT_PRIMARY,
  },
  actionIcon: {
    width:          44,
    height:         44,
    borderRadius:   22,
    alignItems:     'center',
    justifyContent: 'center',
    borderWidth:    StyleSheet.hairlineWidth,
    borderColor:    Colors.BORDER,
  },
  fabClose: {
    width:           54,
    height:          54,
    borderRadius:    27,
    backgroundColor: Colors.RED,
    alignItems:      'center',
    justifyContent:  'center',
    marginTop:       4,
  },
});

const sheetStyles = StyleSheet.create({
  overlay: {
    flex:            1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent:  'flex-end',
  },
  sheet: {
    backgroundColor:    Colors.BG_SURFACE,
    borderTopLeftRadius:  Radius.XL,
    borderTopRightRadius: Radius.XL,
    padding:            Spacing.S6,
    gap:                Spacing.S4,
    paddingBottom:      48,
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
  timeRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.S3,
  },
  timeItem: {
    flex: 1,
    gap:  6,
  },
  timeLabel: {
    fontSize:      11,
    fontWeight:    '600',
    color:         Colors.TEXT_TERTIARY,
    textTransform: 'uppercase',
    letterSpacing: 0.08,
  },
  timeInput: {
    backgroundColor:   Colors.BG_SURFACE_2,
    borderRadius:      Radius.MD,
    paddingHorizontal: Spacing.S4,
    paddingVertical:   Spacing.S3,
    fontSize:          22,
    fontWeight:        '700',
    color:             Colors.TEXT_PRIMARY,
    borderWidth:       StyleSheet.hairlineWidth,
    borderColor:       Colors.BORDER,
    textAlign:         'center',
    fontFamily:        'monospace',
  },
  durationRow: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             6,
    backgroundColor: Colors.TEAL + '10',
    borderRadius:    Radius.MD,
    paddingHorizontal: Spacing.S3,
    paddingVertical:   Spacing.S2,
    borderWidth:     StyleSheet.hairlineWidth,
    borderColor:     Colors.TEAL + '25',
  },
  durationText: {
    fontSize:   13,
    color:      Colors.TEXT_SECONDARY,
    fontWeight: '500',
  },
  qualityLabel: {
    fontSize:      11,
    fontWeight:    '600',
    color:         Colors.TEXT_TERTIARY,
    textTransform: 'uppercase',
    letterSpacing: 0.08,
  },
  qualityRow: {
    flexDirection: 'row',
    gap:           8,
  },
  qualityBtn: {
    flex:            1,
    height:          44,
    borderRadius:    Radius.MD,
    backgroundColor: Colors.BG_SURFACE_2,
    borderWidth:     StyleSheet.hairlineWidth,
    borderColor:     Colors.BORDER,
    alignItems:      'center',
    justifyContent:  'center',
  },
  qualityBtnActive: {
    backgroundColor: Colors.TEAL + '20',
    borderColor:     Colors.TEAL,
  },
  qualityBtnText: {
    fontSize:   16,
    fontWeight: '600',
    color:      Colors.TEXT_TERTIARY,
  },
  qualityBtnTextActive: {
    color: Colors.TEAL,
  },
  notesInput: {
    backgroundColor:   Colors.BG_SURFACE_2,
    borderRadius:      Radius.MD,
    paddingHorizontal: Spacing.S4,
    paddingVertical:   Spacing.S3,
    fontSize:          14,
    color:             Colors.TEXT_PRIMARY,
    borderWidth:       StyleSheet.hairlineWidth,
    borderColor:       Colors.BORDER,
    minHeight:         48,
  },
  saveBtn: {
    backgroundColor: Colors.ACCENT,
    borderRadius:    Radius.FULL,
    paddingVertical: 14,
    alignItems:      'center',
  },
  saveBtnText: {
    fontSize:   15,
    fontWeight: '700',
    color:      Colors.BG_BASE,
  },
  weightInputWrap: {
    flexDirection:  'row',
    alignItems:     'baseline',
    justifyContent: 'center',
    gap:            8,
  },
  weightInput: {
    fontSize:     56,
    fontWeight:   '700',
    color:        Colors.TEXT_PRIMARY,
    letterSpacing: -2,
    fontFamily:   'monospace',
    textAlign:    'center',
    minWidth:     120,
  },
  weightUnit: {
    fontSize:   24,
    color:      Colors.TEXT_SECONDARY,
    fontWeight: '400',
  },
});
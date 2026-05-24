import { useEffect, useState } from 'react';
import { workoutService } from '../../services/workout.service';
import type { ExerciseRow } from '../../services/workout.service';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Spacing, Radius } from '../../constants/theme';
import type { TrainStackParamList } from '../../navigation/TabNavigator';
import { supabase } from '../../lib/supabase';
import { useWorkoutStore } from '../../stores/workout.store';

type TrainNav = NativeStackNavigationProp<TrainStackParamList>;
type Category = 'all' | 'strength' | 'cardio' | 'yoga' | 'hiit';

interface Program {
  id:          string;
  name:        string;
  category:    Category;
  days:        number;
  duration:    string;
  difficulty:  'Beginner' | 'Intermediate' | 'Advanced';
  exercises:   number;
  icon:        keyof typeof Ionicons.glyphMap;
  color:       string;
  description: string;
  tags:        string[];
}

interface Exercise {
  id:     string;
  name:   string;
  sets:   string;
  reps:   string;
  muscle: string;
  icon:   keyof typeof Ionicons.glyphMap;
}

const PROGRAMS: Program[] = [
  {
    id:          'ppl',
    name:        'Push Pull Legs',
    category:    'strength',
    days:        6,
    duration:    '8 weeks',
    difficulty:  'Intermediate',
    exercises:   48,
    icon:        'barbell-outline',
    color:       Colors.ACCENT,
    description: 'Classic 6-day PPL split for maximum hypertrophy and strength.',
    tags:        ['Hypertrophy', 'Strength', 'Gym'],
  },
  {
    id:          'fullbody',
    name:        'Full Body 3x',
    category:    'strength',
    days:        3,
    duration:    '6 weeks',
    difficulty:  'Beginner',
    exercises:   24,
    icon:        'body-outline',
    color:       Colors.BLUE,
    description: 'Compound-focused full body training, 3 days per week.',
    tags:        ['Beginner', 'Compound', 'Gym'],
  },
  {
    id:          'hiit30',
    name:        'HIIT 30',
    category:    'hiit',
    days:        4,
    duration:    '4 weeks',
    difficulty:  'Intermediate',
    exercises:   20,
    icon:        'flash-outline',
    color:       Colors.ORANGE,
    description: '30-minute high intensity sessions. No equipment needed.',
    tags:        ['Fat loss', 'No equipment', 'Home'],
  },
  {
    id:          'yoga28',
    name:        'Yoga Flow 28',
    category:    'yoga',
    days:        5,
    duration:    '4 weeks',
    difficulty:  'Beginner',
    exercises:   28,
    icon:        'leaf-outline',
    color:       Colors.TEAL,
    description: 'Daily yoga flows for flexibility, mobility, and recovery.',
    tags:        ['Flexibility', 'Recovery', 'Mindfulness'],
  },
  {
    id:          'upperlower',
    name:        'Upper Lower Split',
    category:    'strength',
    days:        4,
    duration:    '8 weeks',
    difficulty:  'Intermediate',
    exercises:   32,
    icon:        'barbell-outline',
    color:       Colors.PURPLE,
    description: '4-day upper/lower split. Great for strength and size.',
    tags:        ['Strength', 'Hypertrophy', 'Gym'],
  },
  {
    id:          'couch5k',
    name:        'Couch to 5K',
    category:    'cardio',
    days:        3,
    duration:    '9 weeks',
    difficulty:  'Beginner',
    exercises:   27,
    icon:        'walk-outline',
    color:       Colors.BLUE,
    description: 'Go from zero to running 5km without stopping.',
    tags:        ['Running', 'Beginner', 'Outdoors'],
  },
];

const QUICK_WORKOUTS: Exercise[] = [
  { id: '1', name: 'Bench Press',    sets: '4', reps: '8',  muscle: 'Chest',     icon: 'barbell-outline' },
  { id: '2', name: 'Squat',          sets: '4', reps: '6',  muscle: 'Legs',      icon: 'barbell-outline' },
  { id: '3', name: 'Deadlift',       sets: '3', reps: '5',  muscle: 'Back',      icon: 'barbell-outline' },
  { id: '4', name: 'Pull Up',        sets: '3', reps: '10', muscle: 'Back',      icon: 'body-outline'    },
  { id: '5', name: 'Overhead Press', sets: '3', reps: '8',  muscle: 'Shoulders', icon: 'barbell-outline' },
];

const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'all',      label: 'All'      },
  { id: 'strength', label: 'Strength' },
  { id: 'hiit',     label: 'HIIT'     },
  { id: 'cardio',   label: 'Cardio'   },
  { id: 'yoga',     label: 'Yoga'     },
];

const DIFFICULTY_COLOR: Record<string, string> = {
  Beginner:     Colors.TEAL,
  Intermediate: Colors.ORANGE,
  Advanced:     Colors.RED,
};

export function WorkoutListScreen() {
  const navigation = useNavigation<TrainNav>();
  const [activeCategory,  setActiveCategory]  = useState<Category>('all');
  const [expandedId,      setExpandedId]      = useState<string | null>(null);
  const [exercises,       setExercises]       = useState<ExerciseRow[]>([]);
  const [loadingEx,       setLoadingEx]       = useState(true);
  const [searchQuery,     setSearchQuery]     = useState('');
  const { isActive, programName } = useWorkoutStore();
  const [lastSession,     setLastSession]     = useState<{
    name:      string;
    programId: string;
  } | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    loadExercises();
  }, [activeCategory]);

  useEffect(() => {
    loadLastSession();
  }, []);

  async function loadLastSession() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const { data } = await workoutService.getRecentSessions(user.id, 1);
    if (data && data.length > 0) {
      setLastSession({
        name:      data[0].name,
        programId: 'ppl',
      });
    }
  }

  async function loadExercises() {
    setLoadingEx(true);
    const { data } = await workoutService.getExercises(
      activeCategory === 'all' ? undefined : activeCategory,
      searchQuery
    );
    if (data) setExercises(data);
    setLoadingEx(false);
  }

  const filtered = PROGRAMS.filter(
    (p) => activeCategory === 'all' || p.category === activeCategory
  );

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Ready to train?</Text>
          <Text style={styles.title}>Programs</Text>
        </View>
        <TouchableOpacity
          style={styles.logBtn}
          onPress={() => navigation.navigate('ActiveWorkout')}
        >
          <Ionicons name="add" size={18} color={Colors.ACCENT} />
          <Text style={styles.logBtnText}>Log workout</Text>
        </TouchableOpacity>
      </View>

{/* Quick start */}
{isActive ? (
  <TouchableOpacity
    style={styles.quickStartCard}
    activeOpacity={0.85}
    onPress={() => navigation.navigate('ActiveWorkout')}  // ✅ NO PARAMS – resumes from store
  >
    <View style={styles.quickStartLeft}>
      <Text style={styles.quickStartEyebrow}>Workout in progress</Text>
      <Text style={styles.quickStartName}>{programName}</Text>
      <Text style={styles.quickStartMeta}>Tap to resume</Text>
      <View style={styles.quickStartProgress}>
        <View style={styles.quickStartBar}>
          <View style={[styles.quickStartFill, { width: '50%' }]} />
        </View>
        <Text style={styles.quickStartPct}>In progress</Text>
      </View>
    </View>
    <View style={styles.quickStartRight}>
      <View style={styles.quickStartPlayBtn}>
        <Ionicons name="play" size={20} color={Colors.BG_BASE} />
      </View>
    </View>
  </TouchableOpacity>
) : lastSession ? (
  <TouchableOpacity
    style={styles.quickStartCard}
    activeOpacity={0.85}
    onPress={() => navigation.navigate('ActiveWorkout', {
      programId: lastSession.programId,
      programName: lastSession.name,
      exercises: [],
    })}
  >
    <View style={styles.quickStartLeft}>
      <Text style={styles.quickStartEyebrow}>Last workout</Text>
      <Text style={styles.quickStartName}>{lastSession.name}</Text>
      <Text style={styles.quickStartMeta}>Tap to repeat</Text>
    </View>
    <View style={styles.quickStartRight}>
      <View style={styles.quickStartPlayBtn}>
        <Ionicons name="play" size={20} color={Colors.BG_BASE} />
      </View>
    </View>
  </TouchableOpacity>
) : (
  <TouchableOpacity
    style={styles.quickStartCard}
    activeOpacity={0.85}
    onPress={() => navigation.navigate('ActiveWorkout', {
      programId: 'ppl',
      programName: 'Push day A',
      exercises: [],
    })}
  >
    <View style={styles.quickStartLeft}>
      <Text style={styles.quickStartEyebrow}>Quick start</Text>
      <Text style={styles.quickStartName}>Push day A</Text>
      <Text style={styles.quickStartMeta}>PPL · Full body · 6 exercises</Text>
      <View style={styles.quickStartProgress}>
        <View style={styles.quickStartBar}>
          <View style={[styles.quickStartFill, { width: '0%' }]} />
        </View>
        <Text style={styles.quickStartPct}>Tap to start</Text>
      </View>
    </View>
    <View style={styles.quickStartRight}>
      <View style={styles.quickStartPlayBtn}>
        <Ionicons name="play" size={20} color={Colors.BG_BASE} />
      </View>
    </View>
  </TouchableOpacity>
)}

      {/* Category filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.filterChip,
              activeCategory === cat.id && styles.filterChipActive,
            ]}
            onPress={() => setActiveCategory(cat.id)}
          >
            <Text style={[
              styles.filterChipText,
              activeCategory === cat.id && styles.filterChipTextActive,
            ]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Programs count */}
      <View style={styles.sectionLabel}>
        <Text style={styles.eyebrowSm}>{filtered.length} programs</Text>
      </View>

      {/* Programs list */}
      {filtered.map((program) => {
        const isExpanded = expandedId === program.id;
        return (
          <Pressable
            key={program.id}
            style={[styles.programCard, isExpanded && styles.programCardExpanded]}
            onPress={() => setExpandedId(isExpanded ? null : program.id)}
          >
            <View style={styles.programCardTop}>
              <View style={[styles.programIcon, { backgroundColor: program.color + '15' }]}>
                <Ionicons name={program.icon} size={20} color={program.color} />
              </View>
              <View style={styles.programInfo}>
                <Text style={styles.programName}>{program.name}</Text>
                <View style={styles.programMeta}>
                  <Text style={styles.programMetaText}>
                    {program.days}d/wk · {program.duration} · {program.exercises} exercises
                  </Text>
                </View>
              </View>
              <View style={styles.programRight}>
                <View style={[
                  styles.difficultyBadge,
                  { backgroundColor: DIFFICULTY_COLOR[program.difficulty] + '15' },
                ]}>
                  <Text style={[
                    styles.difficultyText,
                    { color: DIFFICULTY_COLOR[program.difficulty] },
                  ]}>
                    {program.difficulty}
                  </Text>
                </View>
                <Ionicons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={14}
                  color={Colors.TEXT_TERTIARY}
                  style={{ marginTop: 6 }}
                />
              </View>
            </View>

            {isExpanded && (
              <View style={styles.programDetail}>
                <View style={styles.programDivider} />
                <Text style={styles.programDesc}>{program.description}</Text>
                <View style={styles.tagsRow}>
                  {program.tags.map((tag) => (
                    <View key={tag} style={styles.tag}>
                      <Text style={styles.tagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
                <TouchableOpacity
                  style={styles.startProgramBtn}
                  onPress={() => navigation.navigate('ActiveWorkout', {
                    programId:   program.id,
                    programName: program.name,
                    exercises:   [],
                  })}
                >
                  <Text style={styles.startProgramText}>Start program</Text>
                  <Ionicons name="arrow-forward" size={14} color={Colors.BG_BASE} />
                </TouchableOpacity>
              </View>
            )}
          </Pressable>
        );
      })}

      {/* Quick exercises */}
{/* Quick exercises */}
<View style={styles.sectionGap}>
  <View style={styles.sectionHeaderRow}>
    <Text style={styles.eyebrowSm}>Exercise library</Text>
    <TouchableOpacity>
      <Text style={styles.seeAll}>{exercises.length} exercises</Text>
    </TouchableOpacity>
  </View>

  {/* Search bar */}
  <View style={styles.searchWrap}>
    <Ionicons name="search-outline" size={14} color={Colors.TEXT_TERTIARY} />
    <TextInput
      style={styles.searchInput}
      value={searchQuery}
      onChangeText={(v) => {
        setSearchQuery(v);
        loadExercises();
      }}
      placeholder="Search exercises..."
      placeholderTextColor={Colors.TEXT_TERTIARY}
    />
    {searchQuery.length > 0 && (
      <TouchableOpacity onPress={() => {
        setSearchQuery('');
        loadExercises();
      }}>
        <Ionicons name="close-circle" size={14} color={Colors.TEXT_TERTIARY} />
      </TouchableOpacity>
    )}
  </View>

  {loadingEx ? (
    <View style={{ padding: Spacing.S5, alignItems: 'center' }}>
      <Text style={{ color: Colors.TEXT_TERTIARY, fontSize: 13 }}>Loading...</Text>
    </View>
  ) : exercises.length === 0 ? (
    <View style={{ padding: Spacing.S5, alignItems: 'center' }}>
      <Text style={{ color: Colors.TEXT_TERTIARY, fontSize: 13 }}>No exercises found</Text>
    </View>
  ) : (
    exercises.slice(0, 15).map((ex, i) => (
      <View
        key={ex.id}
        style={[
          styles.exRow,
          i === Math.min(exercises.length, 15) - 1 && styles.exRowLast,
        ]}
      >
        <View style={styles.exNumWrap}>
          <Text style={styles.exNum}>{String(i + 1).padStart(2, '0')}</Text>
        </View>
        <View style={styles.exInfo}>
          <Text style={styles.exName}>{ex.name}</Text>
          <Text style={styles.exMeta}>
            {ex.muscle_group.join(', ')} · {ex.difficulty ?? 'beginner'}
          </Text>
          {ex.name_ne && (
            <Text style={styles.exNameNe}>{ex.name_ne}</Text>
          )}
        </View>
        <View style={styles.exRight}>
          <Text style={styles.exCategory}>{ex.category}</Text>
          <TouchableOpacity
            style={styles.exLogBtn}
            onPress={() => navigation.navigate('ActiveWorkout')}
          >
            <Ionicons name="add" size={14} color={Colors.ACCENT} />
          </TouchableOpacity>
        </View>
      </View>
    ))
  )}
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
  },
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
  logBtn: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               5,
    backgroundColor:   Colors.ACCENT_DIM,
    borderRadius:      Radius.FULL,
    paddingHorizontal: 14,
    paddingVertical:   8,
    borderWidth:       StyleSheet.hairlineWidth,
    borderColor:       Colors.ACCENT + '40',
  },
  logBtnText: {
    fontSize:   12,
    fontWeight: '600',
    color:      Colors.ACCENT,
  },
  quickStartCard: {
    flexDirection:    'row',
    alignItems:       'center',
    marginHorizontal: Spacing.S5,
    marginBottom:     Spacing.S5,
    backgroundColor:  Colors.ACCENT,
    borderRadius:     Radius.LG,
    padding:          Spacing.S4,
  },
  quickStartLeft: {
    flex: 1,
    gap:  3,
  },
  quickStartEyebrow: {
    fontSize:      10,
    fontWeight:    '600',
    color:         Colors.BG_BASE + 'aa',
    textTransform: 'uppercase',
    letterSpacing: 0.1,
  },
  quickStartName: {
    fontSize:     22,
    fontWeight:   '700',
    color:        Colors.BG_BASE,
    letterSpacing: -0.5,
  },
  quickStartMeta: {
    fontSize: 12,
    color:    Colors.BG_BASE + 'bb',
  },
  quickStartProgress: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           8,
    marginTop:     8,
  },
  quickStartBar: {
    flex:            1,
    height:          3,
    backgroundColor: Colors.BG_BASE + '30',
    borderRadius:    2,
    overflow:        'hidden',
  },
  quickStartFill: {
    height:          '100%',
    backgroundColor: Colors.BG_BASE,
    borderRadius:    2,
  },
  quickStartPct: {
    fontSize:   11,
    color:      Colors.BG_BASE + 'cc',
    fontWeight: '500',
  },
  quickStartRight: {
    paddingLeft: Spacing.S3,
  },
  quickStartPlayBtn: {
    width:           52,
    height:          52,
    borderRadius:    26,
    backgroundColor: Colors.BG_BASE + '25',
    alignItems:      'center',
    justifyContent:  'center',
  },
  filterRow: {
    paddingHorizontal: Spacing.S5,
    gap:               8,
    marginBottom:      Spacing.S4,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical:   8,
    borderRadius:      Radius.FULL,
    backgroundColor:   Colors.BG_SURFACE,
    borderWidth:       StyleSheet.hairlineWidth,
    borderColor:       Colors.BORDER,
  },
  filterChipActive: {
    backgroundColor: Colors.ACCENT,
    borderColor:     Colors.ACCENT,
  },
  filterChipText: {
    fontSize:   13,
    color:      Colors.TEXT_SECONDARY,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: Colors.BG_BASE,
  },
  sectionLabel: {
    paddingHorizontal: Spacing.S5,
    marginBottom:      Spacing.S3,
  },
  eyebrowSm: {
    fontSize:      11,
    fontWeight:    '600',
    color:         Colors.TEXT_TERTIARY,
    textTransform: 'uppercase',
    letterSpacing: 0.1,
  },
  sectionHeaderRow: {
    flexDirection:     'row',
    justifyContent:    'space-between',
    alignItems:        'center',
    paddingHorizontal: Spacing.S5,
    marginBottom:      Spacing.S2,
  },
  seeAll: {
    fontSize:   12,
    color:      Colors.ACCENT,
    fontWeight: '500',
  },
  programCard: {
    marginHorizontal: Spacing.S5,
    marginBottom:     Spacing.S2,
    backgroundColor:  Colors.BG_SURFACE,
    borderRadius:     Radius.LG,
    borderWidth:      StyleSheet.hairlineWidth,
    borderColor:      Colors.BORDER,
    overflow:         'hidden',
  },
  programCardExpanded: {
    borderColor: Colors.BORDER_2,
  },
  programCardTop: {
    flexDirection: 'row',
    alignItems:    'center',
    padding:       Spacing.S4,
    gap:           Spacing.S3,
  },
  programIcon: {
    width:          44,
    height:         44,
    borderRadius:   12,
    alignItems:     'center',
    justifyContent: 'center',
  },
  programInfo: {
    flex: 1,
    gap:  3,
  },
  programName: {
    fontSize:   15,
    fontWeight: '600',
    color:      Colors.TEXT_PRIMARY,
  },
  programMeta: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           6,
  },
  programMetaText: {
    fontSize: 12,
    color:    Colors.TEXT_TERTIARY,
  },
  programRight: {
    alignItems: 'flex-end',
    gap:        4,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical:   3,
    borderRadius:      Radius.FULL,
  },
  difficultyText: {
    fontSize:   10,
    fontWeight: '600',
  },
  programDetail: {
    paddingHorizontal: Spacing.S4,
    paddingBottom:     Spacing.S4,
  },
  programDivider: {
    height:          StyleSheet.hairlineWidth,
    backgroundColor: Colors.BORDER,
    marginBottom:    Spacing.S3,
  },
  programDesc: {
    fontSize:    13,
    color:       Colors.TEXT_SECONDARY,
    lineHeight:  20,
    marginBottom: Spacing.S3,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           6,
    marginBottom:  Spacing.S4,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical:   4,
    borderRadius:      Radius.FULL,
    backgroundColor:   Colors.BG_SURFACE_2,
    borderWidth:       StyleSheet.hairlineWidth,
    borderColor:       Colors.BORDER,
  },
  tagText: {
    fontSize:   11,
    color:      Colors.TEXT_SECONDARY,
    fontWeight: '500',
  },
  startProgramBtn: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             6,
    backgroundColor: Colors.ACCENT,
    borderRadius:    Radius.FULL,
    paddingVertical: 12,
  },
  startProgramText: {
    fontSize:   14,
    fontWeight: '600',
    color:      Colors.BG_BASE,
  },
  sectionGap: {
    marginTop: Spacing.S6,
  },
  searchWrap: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               Spacing.S2,
    marginHorizontal:  Spacing.S5,
    marginBottom:      Spacing.S3,
    backgroundColor:   Colors.BG_SURFACE,
    borderRadius:      Radius.LG,
    paddingHorizontal: Spacing.S4,
    paddingVertical:   Spacing.S3,
    borderWidth:       StyleSheet.hairlineWidth,
    borderColor:       Colors.BORDER,
  },
  searchInput: {
    flex:     1,
    fontSize: 13,
    color:    Colors.TEXT_PRIMARY,
  },
  exNumWrap: {
    width: 28,
  },
  exRight: {
    alignItems: 'center',
    gap:        4,
  },
  exCategory: {
    fontSize:      9,
    color:         Colors.TEXT_TERTIARY,
    fontWeight:    '500',
    textTransform: 'uppercase',
    letterSpacing: 0.05,
  },
  exNameNe: {
    fontSize:   11,
    color:      Colors.ACCENT,
    fontWeight: '500',
  },
  exRow: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: Spacing.S5,
    paddingVertical:   Spacing.S3,
    gap:               Spacing.S3,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.BORDER,
  },
  exRowLast: {
    borderBottomWidth: 0,
  },
  exNum: {
    fontSize:   12,
    fontWeight: '600',
    color:      Colors.TEXT_TERTIARY,
    fontFamily: 'monospace',
    width:      24,
  },
  exInfo: {
    flex: 1,
    gap:  2,
  },
  exName: {
    fontSize:   14,
    fontWeight: '500',
    color:      Colors.TEXT_PRIMARY,
  },
  exMeta: {
    fontSize: 11,
    color:    Colors.TEXT_TERTIARY,
  },
  exSets: {
    fontSize:   13,
    color:      Colors.TEXT_SECONDARY,
    fontWeight: '500',
    fontFamily: 'monospace',
  },
  exLogBtn: {
    width:           32,
    height:          32,
    borderRadius:    10,
    backgroundColor: Colors.ACCENT_DIM,
    borderWidth:     StyleSheet.hairlineWidth,
    borderColor:     Colors.ACCENT + '40',
    alignItems:      'center',
    justifyContent:  'center',
  },
});
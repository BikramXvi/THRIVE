import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { Colors, Spacing, Radius, Sizing } from '../../constants/theme';
import { useSafeTop } from '../../hooks/useSafeTop';
import { useUIStore } from '../../stores/ui.store';

const GOAL_OPTIONS = [
  { value: 'lose_weight',    label: 'Lose weight'        },
  { value: 'build_muscle',   label: 'Build muscle'       },
  { value: 'run_faster',     label: 'Run faster'         },
  { value: 'flexibility',    label: 'Flexibility'        },
  { value: 'general_health', label: 'General health'     },
];

const LEVEL_OPTIONS = [
  { value: 'beginner',     label: 'Beginner'     },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced',     label: 'Advanced'     },
];

export function EditProfileScreen() {
  const navigation = useNavigation();
  const safeTop    = useSafeTop();

  const [displayName,   setDisplayName]   = useState('');
  const [username,      setUsername]      = useState('');
  const [heightCm,      setHeightCm]      = useState('');
  const [weightKg,      setWeightKg]      = useState('');
  const [goal,          setGoal]          = useState('');
  const [fitnessLevel,  setFitnessLevel]  = useState('');
  const [saving,        setSaving]        = useState(false);
  const [loading,       setLoading]       = useState(true);

  useEffect(() => { loadProfile(); }, []);

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('users')
      .select('display_name, username, height_cm, weight_kg, goal, fitness_level')
      .eq('id', user.id)
      .single();

    if (data) {
      const d = data as any;
      setDisplayName(d.display_name ?? '');
      setUsername(d.username ?? '');
      setHeightCm(d.height_cm?.toString() ?? '');
      setWeightKg(d.weight_kg?.toString() ?? '');
      setGoal(d.goal ?? '');
      setFitnessLevel(d.fitness_level ?? '');
    }
    setLoading(false);
  }

  async function save() {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from('users').update({
        display_name:  displayName.trim() || null,
        username:      username.trim(),
        height_cm:     parseFloat(heightCm) || null,
        weight_kg:     parseFloat(weightKg) || null,
        goal:          goal || null,
        fitness_level: fitnessLevel || null,
        updated_at:    new Date().toISOString(),
      } as any).eq('id', user.id);

      if (error) throw error;

      useUIStore.getState().showToast('Profile updated!', 'success');
      navigation.goBack();
    } catch (err) {
      useUIStore.getState().showToast('Could not save profile', 'error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.BG_BASE, paddingTop: safeTop }}>
        <Text style={{ color: Colors.TEXT_TERTIARY, padding: Spacing.S5 }}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.BG_BASE }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: safeTop }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit profile</Text>
        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          onPress={save}
          disabled={saving}
        >
          <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Personal info */}
        <Text style={styles.sectionTitle}>Personal info</Text>
        <View style={styles.card}>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Display name</Text>
            <TextInput
              style={styles.fieldInput}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Your name"
              placeholderTextColor={Colors.TEXT_TERTIARY}
              autoCapitalize="words"
            />
          </View>
          <View style={[styles.field, styles.fieldBorder]}>
            <Text style={styles.fieldLabel}>Username</Text>
            <TextInput
              style={styles.fieldInput}
              value={username}
              onChangeText={setUsername}
              placeholder="username"
              placeholderTextColor={Colors.TEXT_TERTIARY}
              autoCapitalize="none"
            />
          </View>
        </View>

        {/* Body stats */}
        <Text style={styles.sectionTitle}>Body stats</Text>
        <View style={styles.card}>
          <View style={styles.twoCol}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>Height (cm)</Text>
              <TextInput
                style={styles.fieldInput}
                value={heightCm}
                onChangeText={setHeightCm}
                placeholder="175"
                placeholderTextColor={Colors.TEXT_TERTIARY}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>Weight (kg)</Text>
              <TextInput
                style={styles.fieldInput}
                value={weightKg}
                onChangeText={setWeightKg}
                placeholder="72"
                placeholderTextColor={Colors.TEXT_TERTIARY}
                keyboardType="decimal-pad"
              />
            </View>
          </View>
        </View>

        {/* Goal */}
        <Text style={styles.sectionTitle}>Goal</Text>
        <View style={styles.optionsGrid}>
          {GOAL_OPTIONS.map((g) => (
            <TouchableOpacity
              key={g.value}
              style={[styles.optionBtn, goal === g.value && styles.optionBtnActive]}
              onPress={() => setGoal(g.value)}
            >
              <Text style={[styles.optionText, goal === g.value && styles.optionTextActive]}>
                {g.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Fitness level */}
        <Text style={styles.sectionTitle}>Fitness level</Text>
        <View style={styles.optionsGrid}>
          {LEVEL_OPTIONS.map((l) => (
            <TouchableOpacity
              key={l.value}
              style={[styles.optionBtn, fitnessLevel === l.value && styles.optionBtnActive]}
              onPress={() => setFitnessLevel(l.value)}
            >
              <Text style={[styles.optionText, fitnessLevel === l.value && styles.optionTextActive]}>
                {l.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: Spacing.S5,
    paddingBottom:     Spacing.S3,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.BORDER,
  },
  backBtn: {
    width:  36,
    height: 36,
    alignItems:     'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize:     16,
    fontWeight:   '600',
    color:        Colors.TEXT_PRIMARY,
    letterSpacing: -0.3,
  },
  saveBtn: {
    backgroundColor:   Colors.ACCENT,
    borderRadius:      Radius.FULL,
    paddingHorizontal: Spacing.S4,
    paddingVertical:   Spacing.S2,
  },
  saveBtnText: {
    fontSize:   13,
    fontWeight: '700',
    color:      Colors.BG_BASE,
  },
  scroll: {
    padding:       Spacing.S5,
    paddingBottom: 48,
    gap:           Spacing.S3,
  },
  sectionTitle: {
    fontSize:      11,
    fontWeight:    '600',
    color:         Colors.TEXT_TERTIARY,
    textTransform: 'uppercase',
    letterSpacing: 0.1,
    marginTop:     Spacing.S3,
  },
  card: {
    backgroundColor: Colors.BG_SURFACE,
    borderRadius:    Radius.LG,
    borderWidth:     StyleSheet.hairlineWidth,
    borderColor:     Colors.BORDER,
    overflow:        'hidden',
  },
  field: {
    padding: Spacing.S4,
    gap:     6,
  },
  fieldBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.BORDER,
  },
  fieldLabel: {
    fontSize:      11,
    fontWeight:    '600',
    color:         Colors.TEXT_TERTIARY,
    textTransform: 'uppercase',
    letterSpacing: 0.08,
  },
  fieldInput: {
    fontSize:   16,
    color:      Colors.TEXT_PRIMARY,
    fontWeight: '400',
    paddingVertical: 4,
  },
  twoCol: {
    flexDirection: 'row',
    gap:           Spacing.S3,
    padding:       Spacing.S4,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           8,
  },
  optionBtn: {
    paddingHorizontal: Spacing.S4,
    paddingVertical:   Spacing.S2,
    borderRadius:      Radius.FULL,
    backgroundColor:   Colors.BG_SURFACE,
    borderWidth:       StyleSheet.hairlineWidth,
    borderColor:       Colors.BORDER,
  },
  optionBtnActive: {
    backgroundColor: Colors.ACCENT_DIM,
    borderColor:     Colors.ACCENT + '50',
  },
  optionText: {
    fontSize:   13,
    fontWeight: '500',
    color:      Colors.TEXT_SECONDARY,
  },
  optionTextActive: {
    color: Colors.ACCENT,
  },
});
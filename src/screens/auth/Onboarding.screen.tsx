import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { Colors, Spacing, Radius, Sizing } from '../../constants/theme';
import type { Goal } from '../../types/common.types';

// ─── Types ───────────────────────────────────────────────────────────────────

type Step = 'goal' | 'level' | 'body' | 'activity' | 'done';

type FitnessLevel = 'beginner' | 'intermediate' | 'advanced';

type ActivityLevel =
  | 'sedentary'
  | 'lightly_active'
  | 'moderately_active'
  | 'very_active';

// ─── Data ────────────────────────────────────────────────────────────────────

const GOALS: { value: Goal; label: string; sub: string }[] = [
  { value: 'lose_weight',    label: 'Lose weight',         sub: 'Burn fat, get lean'          },
  { value: 'build_muscle',   label: 'Build muscle',         sub: 'Gain size and strength'      },
  { value: 'run_faster',     label: 'Run faster / further', sub: 'Improve endurance and pace'  },
  { value: 'flexibility',    label: 'Improve flexibility',  sub: 'Yoga, mobility, recovery'    },
  { value: 'general_health', label: 'General health',       sub: 'Stay active and feel good'   },
];

const LEVELS: { value: FitnessLevel; label: string; sub: string }[] = [
  { value: 'beginner',     label: 'Beginner',     sub: 'New to working out'         },
  { value: 'intermediate', label: 'Intermediate', sub: 'Training for 1+ year'       },
  { value: 'advanced',     label: 'Advanced',     sub: 'Serious athlete, 3+ years'  },
];

const ACTIVITY_LEVELS: { value: ActivityLevel; label: string; sub: string }[] = [
  { value: 'sedentary',         label: 'Sedentary',         sub: 'Desk job, little movement'        },
  { value: 'lightly_active',    label: 'Lightly active',    sub: 'Light exercise 1-3 days/week'     },
  { value: 'moderately_active', label: 'Moderately active', sub: 'Moderate exercise 3-5 days/week'  },
  { value: 'very_active',       label: 'Very active',       sub: 'Hard exercise 6-7 days/week'      },
];

const STEPS: Step[] = ['goal', 'level', 'body', 'activity'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function calculateTDEE(
  weightKg:      number,
  heightCm:      number,
  ageYears:      number,
  gender:        string,
  activityLevel: ActivityLevel,
): number {
  const bmr = gender === 'female'
    ? 10 * weightKg + 6.25 * heightCm - 5 * ageYears - 161
    : 10 * weightKg + 6.25 * heightCm - 5 * ageYears + 5;

  const multipliers: Record<ActivityLevel, number> = {
    sedentary:         1.2,
    lightly_active:    1.375,
    moderately_active: 1.55,
    very_active:       1.725,
  };

  return Math.round(bmr * multipliers[activityLevel]);
}

// ─── Sub components ───────────────────────────────────────────────────────────

interface OptionProps {
  label:    string;
  sub:      string;
  selected: boolean;
  onPress:  () => void;
}

function Option({ label, sub, selected, onPress }: OptionProps) {
  return (
    <TouchableOpacity
      style={[styles.option, selected && styles.optionSelected]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.optionText}>
        <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
          {label}
        </Text>
        <Text style={styles.optionSub}>{sub}</Text>
      </View>
      <View style={[styles.check, selected && styles.checkSelected]}>
        {selected && <Text style={styles.checkMark}>✓</Text>}
      </View>
    </TouchableOpacity>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function OnboardingScreen() {
  const [step,          setStep]          = useState<Step>('goal');
  const [goal,          setGoal]          = useState<Goal | null>(null);
  const [level,         setLevel]         = useState<FitnessLevel | null>(null);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | null>(null);
  const [displayName,   setDisplayName]   = useState('');
  const [age,           setAge]           = useState('');
  const [heightCm,      setHeightCm]      = useState('');
  const [weightKg,      setWeightKg]      = useState('');
  const [gender,        setGender]        = useState<'male' | 'female' | 'other'>('male');
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState('');

  const currentStepIdx = STEPS.indexOf(step);
  const totalSteps     = STEPS.length;

  function canProceed(): boolean {
    switch (step) {
      case 'goal':     return goal !== null;
      case 'level':    return level !== null;
      case 'body':     return (
        displayName.trim().length > 0 &&
        age.trim().length > 0 &&
        heightCm.trim().length > 0 &&
        weightKg.trim().length > 0
      );
      case 'activity': return activityLevel !== null;
      default:         return false;
    }
  }

  function nextStep() {
    const steps: Step[] = ['goal', 'level', 'body', 'activity'];
    const idx = steps.indexOf(step);
    if (idx < steps.length - 1) {
      setStep(steps[idx + 1]);
    } else {
      finish();
    }
  }

  function prevStep() {
    const steps: Step[] = ['goal', 'level', 'body', 'activity'];
    const idx = steps.indexOf(step);
    if (idx > 0) setStep(steps[idx - 1]);
  }

  async function finish() {
    if (!goal || !level || !activityLevel) return;
    setSaving(true);
    setError('');
  
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
  
      const ageNum    = parseInt(age)        || 25;
      const heightNum = parseFloat(heightCm) || 170;
      const weightNum = parseFloat(weightKg) || 70;
      const tdee      = calculateTDEE(weightNum, heightNum, ageNum, gender, activityLevel);
  
      const { error: upsertError } = await supabase.from('users').upsert({
        id:             user.id,
        email:          user.email ?? '',
        username:       user.email?.split('@')[0] ?? 'user',
        display_name:   displayName.trim() || null,
        goal,
        fitness_level:  level,
        activity_level: activityLevel,
        height_cm:      heightNum,
        weight_kg:      weightNum,
        language:       'ne',
        units:          'metric',
        tier:           'free',
        timezone:       'Asia/Kathmandu',
        onboarded_at:   new Date().toISOString(),
      } as any);
  
      if (upsertError) throw upsertError;
  
      // Force RootNavigator to re-check onboarding status
      // by refreshing the session -- this triggers onAuthStateChange
      await supabase.auth.refreshSession();
  
    } catch (err) {
      console.error('Onboarding save error:', err);
      setError('Could not save your profile. Please try again.');
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Progress bar */}
        <View style={styles.progressRow}>
          {STEPS.map((s, i) => (
            <View
              key={s}
              style={[
                styles.progressStep,
                i <= currentStepIdx && styles.progressStepDone,
              ]}
            />
          ))}
        </View>

        <Text style={styles.eyebrow}>
          Step {currentStepIdx + 1} of {totalSteps}
        </Text>

        {/* ── Step 1: Goal ── */}
        {step === 'goal' && (
          <>
            <Text style={styles.heading}>
              What is your{'\n'}
              <Text style={styles.headingAccent}>main goal?</Text>
            </Text>
            <Text style={styles.sub}>
              Kai will build your perfect plan from day one.
            </Text>
            <View style={styles.options}>
              {GOALS.map((g) => (
                <Option
                  key={g.value}
                  label={g.label}
                  sub={g.sub}
                  selected={goal === g.value}
                  onPress={() => setGoal(g.value)}
                />
              ))}
            </View>
          </>
        )}

        {/* ── Step 2: Fitness level ── */}
        {step === 'level' && (
          <>
            <Text style={styles.heading}>
              Your fitness{'\n'}
              <Text style={styles.headingAccent}>level?</Text>
            </Text>
            <Text style={styles.sub}>
              This adjusts your workout difficulty and recommendations.
            </Text>
            <View style={styles.options}>
              {LEVELS.map((l) => (
                <Option
                  key={l.value}
                  label={l.label}
                  sub={l.sub}
                  selected={level === l.value}
                  onPress={() => setLevel(l.value)}
                />
              ))}
            </View>
          </>
        )}

        {/* ── Step 3: Body stats ── */}
        {step === 'body' && (
          <>
            <Text style={styles.heading}>
              About{'\n'}
              <Text style={styles.headingAccent}>you</Text>
            </Text>
            <Text style={styles.sub}>
              Used to calculate your calorie targets and personalise your plan.
            </Text>

            <View style={styles.fields}>
              {/* Name */}
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Your name</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="e.g. Arun"
                  placeholderTextColor={Colors.TEXT_TERTIARY}
                  autoCapitalize="words"
                />
              </View>

              {/* Gender */}
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Gender</Text>
                <View style={styles.genderRow}>
                  {(['male', 'female', 'other'] as const).map((g) => (
                    <TouchableOpacity
                      key={g}
                      style={[
                        styles.genderBtn,
                        gender === g && styles.genderBtnActive,
                      ]}
                      onPress={() => setGender(g)}
                    >
                      <Text style={[
                        styles.genderBtnText,
                        gender === g && styles.genderBtnTextActive,
                      ]}>
                        {g.charAt(0).toUpperCase() + g.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Age */}
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Age</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={age}
                  onChangeText={setAge}
                  placeholder="e.g. 24"
                  placeholderTextColor={Colors.TEXT_TERTIARY}
                  keyboardType="number-pad"
                />
              </View>

              {/* Height and weight row */}
              <View style={styles.twoCol}>
                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Height (cm)</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={heightCm}
                    onChangeText={setHeightCm}
                    placeholder="e.g. 175"
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
                    placeholder="e.g. 72"
                    placeholderTextColor={Colors.TEXT_TERTIARY}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
            </View>
          </>
        )}

        {/* ── Step 4: Activity level ── */}
        {step === 'activity' && (
          <>
            <Text style={styles.heading}>
              How active{'\n'}
              <Text style={styles.headingAccent}>are you?</Text>
            </Text>
            <Text style={styles.sub}>
              This sets your daily calorie target. Be honest -- it matters.
            </Text>
            <View style={styles.options}>
              {ACTIVITY_LEVELS.map((a) => (
                <Option
                  key={a.value}
                  label={a.label}
                  sub={a.sub}
                  selected={activityLevel === a.value}
                  onPress={() => setActivityLevel(a.value)}
                />
              ))}
            </View>

            {/* TDEE preview */}
            {activityLevel && weightKg && heightCm && age && (
              <View style={styles.tdeePreview}>
                <Text style={styles.tdeeLabel}>Your estimated daily calories</Text>
                <Text style={styles.tdeeValue}>
                  {calculateTDEE(
                    parseFloat(weightKg) || 70,
                    parseFloat(heightCm) || 170,
                    parseInt(age)        || 25,
                    gender,
                    activityLevel,
                  ).toLocaleString()}
                  <Text style={styles.tdeeUnit}> kcal</Text>
                </Text>
                <Text style={styles.tdeeSub}>
                  Kai will adjust this based on your progress over time.
                </Text>
              </View>
            )}
          </>
        )}

        {/* Error */}
        {error.length > 0 && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Navigation buttons */}
        <View style={styles.footer}>
          {currentStepIdx > 0 && (
            <TouchableOpacity style={styles.backBtn} onPress={prevStep}>
              <Text style={styles.backBtnText}>Back</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.cta,
              !canProceed() && styles.ctaDisabled,
            ]}
            onPress={nextStep}
            disabled={!canProceed() || saving}
          >
            <Text style={styles.ctaText}>
              {saving
                ? 'Setting up...'
                : step === 'activity'
                  ? 'Start training'
                  : 'Continue'}
            </Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex:            1,
    backgroundColor: Colors.BG_BASE,
  },
  scroll: {
    paddingHorizontal: Spacing.S5,
    paddingTop:        60,
    paddingBottom:     48,
  },

  // Progress
  progressRow: {
    flexDirection: 'row',
    gap:           6,
    marginBottom:  Spacing.S5,
  },
  progressStep: {
    flex:            1,
    height:          3,
    borderRadius:    2,
    backgroundColor: Colors.BG_SURFACE_3,
  },
  progressStepDone: {
    backgroundColor: Colors.ACCENT,
  },

  // Header
  eyebrow: {
    fontSize:      11,
    fontWeight:    '500',
    color:         Colors.TEXT_TERTIARY,
    textTransform: 'uppercase',
    letterSpacing: 0.1,
    marginBottom:  Spacing.S3,
  },
  heading: {
    fontSize:     32,
    fontWeight:   '700',
    color:        Colors.TEXT_PRIMARY,
    letterSpacing: -1,
    lineHeight:   38,
    marginBottom:  Spacing.S2,
  },
  headingAccent: {
    color: Colors.ACCENT,
  },
  sub: {
    fontSize:    13,
    color:       Colors.TEXT_SECONDARY,
    lineHeight:  20,
    marginBottom: Spacing.S6,
  },

  // Options
  options: {
    gap: 10,
  },
  option: {
    flexDirection:  'row',
    alignItems:     'center',
    padding:        Spacing.S4,
    backgroundColor: Colors.BG_SURFACE,
    borderRadius:   Radius.MD,
    borderWidth:    StyleSheet.hairlineWidth,
    borderColor:    Colors.BORDER,
    gap:            Spacing.S3,
  },
  optionSelected: {
    backgroundColor: Colors.ACCENT_DIM,
    borderColor:     Colors.ACCENT + '50',
  },
  optionText: {
    flex: 1,
    gap:  3,
  },
  optionLabel: {
    fontSize:   14,
    fontWeight: '500',
    color:      Colors.TEXT_PRIMARY,
  },
  optionLabelSelected: {
    color: Colors.ACCENT,
  },
  optionSub: {
    fontSize: 12,
    color:    Colors.TEXT_TERTIARY,
  },
  check: {
    width:           20,
    height:          20,
    borderRadius:    10,
    borderWidth:     1.5,
    borderColor:     Colors.BORDER_2,
    alignItems:      'center',
    justifyContent:  'center',
  },
  checkSelected: {
    backgroundColor: Colors.ACCENT,
    borderColor:     Colors.ACCENT,
  },
  checkMark: {
    fontSize:   11,
    fontWeight: '700',
    color:      Colors.BG_BASE,
  },

  // Body stats fields
  fields: {
    gap: Spacing.S4,
  },
  field: {
    gap: 6,
  },
  fieldLabel: {
    fontSize:      11,
    fontWeight:    '600',
    color:         Colors.TEXT_TERTIARY,
    textTransform: 'uppercase',
    letterSpacing: 0.08,
  },
  fieldInput: {
    height:            Sizing.INPUT_HEIGHT,
    backgroundColor:   Colors.BG_SURFACE_2,
    borderRadius:      Radius.MD,
    paddingHorizontal: Spacing.S4,
    fontSize:          16,
    color:             Colors.TEXT_PRIMARY,
    borderWidth:       StyleSheet.hairlineWidth,
    borderColor:       Colors.BORDER,
  },
  twoCol: {
    flexDirection: 'row',
    gap:           Spacing.S3,
  },

  // Gender
  genderRow: {
    flexDirection: 'row',
    gap:           8,
  },
  genderBtn: {
    flex:            1,
    height:          Sizing.INPUT_HEIGHT,
    borderRadius:    Radius.MD,
    backgroundColor: Colors.BG_SURFACE_2,
    borderWidth:     StyleSheet.hairlineWidth,
    borderColor:     Colors.BORDER,
    alignItems:      'center',
    justifyContent:  'center',
  },
  genderBtnActive: {
    backgroundColor: Colors.ACCENT_DIM,
    borderColor:     Colors.ACCENT + '50',
  },
  genderBtnText: {
    fontSize:   14,
    fontWeight: '500',
    color:      Colors.TEXT_TERTIARY,
  },
  genderBtnTextActive: {
    color: Colors.ACCENT,
  },

  // TDEE preview
  tdeePreview: {
    marginTop:         Spacing.S5,
    backgroundColor:   Colors.ACCENT_DIM,
    borderRadius:      Radius.LG,
    padding:           Spacing.S4,
    borderWidth:       StyleSheet.hairlineWidth,
    borderColor:       Colors.ACCENT + '30',
    alignItems:        'center',
    gap:               4,
  },
  tdeeLabel: {
    fontSize:      11,
    fontWeight:    '600',
    color:         Colors.TEXT_TERTIARY,
    textTransform: 'uppercase',
    letterSpacing: 0.08,
  },
  tdeeValue: {
    fontSize:     36,
    fontWeight:   '700',
    color:        Colors.ACCENT,
    letterSpacing: -1,
  },
  tdeeUnit: {
    fontSize:   18,
    color:      Colors.TEXT_SECONDARY,
    fontWeight: '400',
  },
  tdeeSub: {
    fontSize:  11,
    color:     Colors.TEXT_TERTIARY,
    textAlign: 'center',
  },

  // Error
  errorBox: {
    marginTop:         Spacing.S4,
    backgroundColor:   Colors.RED_DIM,
    borderRadius:      Radius.MD,
    padding:           Spacing.S3,
    borderWidth:       StyleSheet.hairlineWidth,
    borderColor:       Colors.RED + '30',
  },
  errorText: {
    fontSize:   13,
    color:      Colors.RED,
  },

  // Footer buttons
  footer: {
    marginTop: Spacing.S6,
    gap:       Spacing.S3,
  },
  cta: {
    height:          Sizing.CTA_HEIGHT,
    backgroundColor: Colors.ACCENT,
    borderRadius:    Radius.FULL,
    alignItems:      'center',
    justifyContent:  'center',
  },
  ctaDisabled: {
    opacity: 0.4,
  },
  ctaText: {
    fontSize:   16,
    fontWeight: '700',
    color:      Colors.BG_BASE,
    letterSpacing: -0.3,
  },
  backBtn: {
    alignItems:      'center',
    justifyContent:  'center',
    paddingVertical: Spacing.S3,
  },
  backBtnText: {
    fontSize:   14,
    color:      Colors.TEXT_SECONDARY,
    fontWeight: '500',
  },
});
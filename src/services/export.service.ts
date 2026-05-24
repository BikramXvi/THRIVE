import { supabase } from '../lib/supabase';

export interface UserContext {
  profile: {
    name:          string;
    goal:          string;
    fitnessLevel:  string;
    heightCm:      number | null;
    weightKg:      number | null;
    activityLevel: string | null;
    tdee:          number | null;
    memberSince:   string;
  };
  last7Days: {
    workouts:        WorkoutSummary[];
    totalVolume:     number;
    avgCalories:     number;
    avgProtein:      number;
    avgSleep:        number;
    totalKmRun:      number;
    streak:          number;
  };
  thisWeek: {
    workoutCount:    number;
    caloriesByDay:   number[];
    sleepByDay:      number[];
    kmByDay:         number[];
  };
  personalRecords: PersonalRecord[];
  recentMeals:     MealSummary[];
  bodyMetrics: {
    current:  number | null;
    starting: number | null;
    change:   number | null;
  };
}

interface WorkoutSummary {
  name:            string;
  date:            string;
  durationMinutes: number;
  volumeKg:        number;
  totalSets:       number;
}

interface PersonalRecord {
  exercise: string;
  value:    number;
  unit:     string;
  date:     string;
}

interface MealSummary {
  name:     string;
  calories: number;
  protein:  number;
  date:     string;
}

export const exportService = {
  async getUserContext(userId: string): Promise<UserContext> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

    const [
      profileRes,
      workoutsRes,
      mealsRes,
      sleepRes,
      runsRes,
      bodyRes,
      prsRes,
    ] = await Promise.all([
      supabase
        .from('users')
        .select('display_name, username, goal, fitness_level, activity_level, height_cm, weight_kg, created_at')
        .eq('id', userId)
        .single(),
      supabase
        .from('workout_sessions')
        .select('name, started_at, duration_seconds, total_volume_kg, total_sets')
        .eq('user_id', userId)
        .gte('started_at', sevenDaysAgo.toISOString())
        .order('started_at', { ascending: false }),
      supabase
        .from('meal_logs')
        .select('calories, protein_g, carbs_g, fat_g, date, food_items(name)')
        .eq('user_id', userId)
        .gte('date', sevenDaysAgoStr)
        .order('date', { ascending: false }),
      supabase
        .from('sleep_logs')
        .select('duration_minutes, date, quality_rating')
        .eq('user_id', userId)
        .gte('date', sevenDaysAgoStr),
      supabase
        .from('run_sessions')
        .select('distance_m, duration_seconds, started_at')
        .eq('user_id', userId)
        .gte('started_at', sevenDaysAgo.toISOString()),
      supabase
        .from('body_metrics')
        .select('weight_kg, date')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(30),
      supabase
        .from('personal_records')
        .select('record_type, value, unit, achieved_at, exercises(name)')
        .eq('user_id', userId)
        .order('achieved_at', { ascending: false })
        .limit(10),
    ]);

    const profile  = (profileRes.data  ?? {}) as any;
    const workouts = (workoutsRes.data  ?? []) as any[];
    const meals    = (mealsRes.data     ?? []) as any[];
    const sleepLogs = (sleepRes.data    ?? []) as any[];
    const runs     = (runsRes.data      ?? []) as any[];
    const body     = (bodyRes.data      ?? []) as any[];
    const prs      = (prsRes.data       ?? []) as any[];

    // Calculate TDEE
    let tdee: number | null = null;
    if (profile.weight_kg && profile.height_cm) {
      const age = 25;
      const bmr = 10 * profile.weight_kg + 6.25 * profile.height_cm - 5 * age + 5;
      const multipliers: Record<string, number> = {
        sedentary:         1.2,
        lightly_active:    1.375,
        moderately_active: 1.55,
        very_active:       1.725,
      };
      tdee = Math.round(bmr * (multipliers[profile.activity_level] ?? 1.375));
    }

    // Workout summaries
    const workoutSummaries: WorkoutSummary[] = workouts.map((w) => ({
      name:            w.name,
      date:            new Date(w.started_at).toLocaleDateString('en-NP'),
      durationMinutes: Math.round((w.duration_seconds ?? 0) / 60),
      volumeKg:        Math.round(w.total_volume_kg ?? 0),
      totalSets:       w.total_sets ?? 0,
    }));

    // Avg calories and protein
    const mealsByDate: Record<string, { calories: number; protein: number }> = {};
    meals.forEach((m) => {
      if (!mealsByDate[m.date]) mealsByDate[m.date] = { calories: 0, protein: 0 };
      mealsByDate[m.date].calories += m.calories ?? 0;
      mealsByDate[m.date].protein  += m.protein_g ?? 0;
    });
    const mealDays    = Object.values(mealsByDate);
    const avgCalories = mealDays.length > 0
      ? Math.round(mealDays.reduce((s, d) => s + d.calories, 0) / mealDays.length)
      : 0;
    const avgProtein  = mealDays.length > 0
      ? Math.round(mealDays.reduce((s, d) => s + d.protein, 0) / mealDays.length)
      : 0;

    // Avg sleep
    const avgSleep = sleepLogs.length > 0
      ? Math.round((sleepLogs.reduce((s: number, l: any) => s + l.duration_minutes, 0) / sleepLogs.length / 60) * 10) / 10
      : 0;

    // Total km
    const totalKmRun = Math.round(
      runs.reduce((s: number, r: any) => s + (r.distance_m ?? 0), 0) / 1000 * 10
    ) / 10;

    // Body metrics
    const currentWeight  = body[0]?.weight_kg ?? null;
    const startingWeight = body[body.length - 1]?.weight_kg ?? null;
    const weightChange   = currentWeight && startingWeight
      ? Math.round((currentWeight - startingWeight) * 10) / 10
      : null;

    // Recent meals
    const recentMeals: MealSummary[] = meals.slice(0, 10).map((m) => ({
      name:     (m.food_items as any)?.name ?? 'Unknown',
      calories: m.calories ?? 0,
      protein:  Math.round(m.protein_g ?? 0),
      date:     m.date,
    }));

    // Personal records
    const personalRecords: PersonalRecord[] = prs.map((pr) => ({
      exercise: (pr.exercises as any)?.name ?? 'Unknown',
      value:    pr.value,
      unit:     pr.unit,
      date:     new Date(pr.achieved_at).toLocaleDateString('en-NP'),
    }));

    return {
      profile: {
        name:          profile.display_name ?? profile.username ?? 'Athlete',
        goal:          profile.goal ?? 'general_health',
        fitnessLevel:  profile.fitness_level ?? 'beginner',
        heightCm:      profile.height_cm ?? null,
        weightKg:      profile.weight_kg ?? null,
        activityLevel: profile.activity_level ?? null,
        tdee,
        memberSince:   profile.created_at
          ? new Date(profile.created_at).toLocaleDateString('en-NP')
          : 'Unknown',
      },
      last7Days: {
        workouts:    workoutSummaries,
        totalVolume: workouts.reduce((s: number, w: any) => s + (w.total_volume_kg ?? 0), 0),
        avgCalories,
        avgProtein,
        avgSleep,
        totalKmRun,
        streak:      0,
      },
      thisWeek: {
        workoutCount:  workouts.length,
        caloriesByDay: Object.values(mealsByDate).map((d) => d.calories),
        sleepByDay:    sleepLogs.map((l: any) => Math.round(l.duration_minutes / 60 * 10) / 10),
        kmByDay:       runs.map((r: any) => Math.round(r.distance_m / 1000 * 10) / 10),
      },
      personalRecords,
      recentMeals,
      bodyMetrics: {
        current:  currentWeight,
        starting: startingWeight,
        change:   weightChange,
      },
    };
  },

  buildKaiPrompt(context: UserContext, language: string = 'en'): string {
    const goalLabels: Record<string, string> = {
      lose_weight:    'Lose weight',
      build_muscle:   'Build muscle',
      run_faster:     'Run faster',
      flexibility:    'Improve flexibility',
      general_health: 'General health',
    };

    const proteinTarget = context.profile.weightKg
      ? Math.round(context.profile.weightKg * 2)
      : 160;

    return `You are Kai, a professional fitness and nutrition coach inside Thrive, a fitness app built for Nepal.

${language === 'ne' ? 'Always respond in Nepali (नेपाली).' : 'Respond in English. Use Nepali words naturally when relevant (like food names).'}

Be direct, evidence-based, and motivating. No generic advice -- everything must be specific to this user's actual data.

=== USER PROFILE ===
Name: ${context.profile.name}
Goal: ${goalLabels[context.profile.goal] ?? context.profile.goal}
Fitness level: ${context.profile.fitnessLevel}
Height: ${context.profile.heightCm ?? '--'}cm
Weight: ${context.profile.weightKg ?? '--'}kg
TDEE (maintenance calories): ${context.profile.tdee ?? '--'} kcal/day
Member since: ${context.profile.memberSince}

=== LAST 7 DAYS ===
Workouts completed: ${context.last7Days.workouts.length}
${context.last7Days.workouts.map((w) => `  - ${w.name} on ${w.date}: ${w.durationMinutes} min, ${w.volumeKg}kg volume, ${w.totalSets} sets`).join('\n')}

Average daily calories: ${context.last7Days.avgCalories} kcal (TDEE: ${context.profile.tdee ?? '--'}, ${
  context.profile.tdee && context.last7Days.avgCalories
    ? context.last7Days.avgCalories > context.profile.tdee
      ? `surplus of ${context.last7Days.avgCalories - context.profile.tdee} kcal`
      : `deficit of ${context.profile.tdee - context.last7Days.avgCalories} kcal`
    : 'unknown'
})
Average daily protein: ${context.last7Days.avgProtein}g (target: ${proteinTarget}g)
Average sleep: ${context.last7Days.avgSleep}h per night
Total km run: ${context.last7Days.totalKmRun}km

=== BODY METRICS ===
Current weight: ${context.bodyMetrics.current ?? '--'}kg
Starting weight: ${context.bodyMetrics.starting ?? '--'}kg
Total change: ${context.bodyMetrics.change !== null ? `${context.bodyMetrics.change > 0 ? '+' : ''}${context.bodyMetrics.change}kg` : '--'}

=== PERSONAL RECORDS ===
${context.personalRecords.length > 0
  ? context.personalRecords.map((pr) => `  - ${pr.exercise}: ${pr.value}${pr.unit} on ${pr.date}`).join('\n')
  : '  No personal records yet'}

=== RECENT MEALS ===
${context.recentMeals.length > 0
  ? context.recentMeals.slice(0, 5).map((m) => `  - ${m.name}: ${m.calories} kcal, ${m.protein}g protein (${m.date})`).join('\n')
  : '  No meals logged recently'}

=== HARD RULES ===
- Never recommend below 1200 kcal/day
- Never recommend more than 1kg/week weight loss
- Always refer to a doctor for injuries or medical issues
- Suggest Nepali foods when recommending nutrition (dal bhat, momo, chiura, gundruk, etc.)
- When generating workout plans, use exercises from: Push Pull Legs, HIIT, Yoga, Cardio, Full Body
- Be specific with numbers -- sets, reps, weights, calories, grams
- Keep responses concise and actionable`;
  },

  async exportToJSON(userId: string): Promise<string> {
    const context = await this.getUserContext(userId);
    return JSON.stringify(context, null, 2);
  },

  async exportToText(userId: string): Promise<string> {
    const context = await this.getUserContext(userId);
    return this.buildKaiPrompt(context);
  },
};
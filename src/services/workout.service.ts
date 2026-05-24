import { supabase } from '../lib/supabase';
import type { ServiceResult } from '../types/common.types';

export interface ExerciseRow {
  id:           string;
  name:         string;
  name_ne:      string | null;
  category:     string;
  muscle_group: string[];
  equipment:    string[];
  difficulty:   string;
  instructions: string | null;
}

export interface WorkoutSessionRow {
  id:               string;
  name:             string;
  started_at:       string;
  completed_at:     string | null;
  duration_seconds: number | null;
  total_volume_kg:  number | null;
  total_sets:       number;
  calories_burned:  number | null;
}



export const workoutService = {
  async getExercises(
    category?: string,
    search?:   string
  ): Promise<ServiceResult<ExerciseRow[]>> {
    try {
      let q = supabase
        .from('exercises')
        .select('*')
        .order('name', { ascending: true })
        .limit(100);

      if (category && category !== 'all') {
        q = q.eq('category', category);
      }

      if (search?.trim()) {
        q = q.ilike('name', `%${search}%`);
      }

      const { data, error } = await q;
      if (error) return { data: null, error: { code: error.code, message: error.message } };
      return { data: data as ExerciseRow[], error: null };
    } catch (err) {
      return { data: null, error: { code: 'UNKNOWN', message: 'Could not load exercises', details: err } };
    }
  },

  async getRecentSessions(userId: string, limit = 10): Promise<ServiceResult<WorkoutSessionRow[]>> {
    try {
      const { data, error } = await supabase
        .from('workout_sessions')
        .select('*')
        .eq('user_id', userId)
        .not('completed_at', 'is', null)
        .order('started_at', { ascending: false })
        .limit(limit);

      if (error) return { data: null, error: { code: error.code, message: error.message } };
      return { data: data as WorkoutSessionRow[], error: null };
    } catch (err) {
      return { data: null, error: { code: 'UNKNOWN', message: 'Could not load sessions', details: err } };
    }
  },

  async saveSession(params: {
    userId:          string;
    name:            string;
    startedAt:       string;
    durationSeconds: number;
    totalVolumeKg:   number;
    totalSets:       number;
    caloriesBurned:  number;
  }): Promise<ServiceResult<string>> {
    try {
      const { data, error } = await supabase
        .from('workout_sessions')
        .insert({
          user_id:          params.userId,
          name:             params.name,
          started_at:       params.startedAt,
          completed_at:     new Date().toISOString(),
          duration_seconds: params.durationSeconds,
          total_volume_kg:  params.totalVolumeKg,
          total_sets:       params.totalSets,
          calories_burned:  params.caloriesBurned,
          is_public:        false,
        } as any)
        .select('id')
        .single();

      if (error) return { data: null, error: { code: error.code, message: error.message } };
      return { data: (data as any).id, error: null };
    } catch (err) {
      return { data: null, error: { code: 'UNKNOWN', message: 'Could not save session', details: err } };
    }
  },

  async getWeeklyWorkoutCount(userId: string): Promise<ServiceResult<number>> {
    try {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const { count, error } = await supabase
        .from('workout_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .not('completed_at', 'is', null)
        .gte('started_at', weekAgo.toISOString());

      if (error) return { data: null, error: { code: error.code, message: error.message } };
      return { data: count ?? 0, error: null };
    } catch (err) {
      return { data: null, error: { code: 'UNKNOWN', message: 'Could not get count', details: err } };
    }
  },

  async getStreak(userId: string): Promise<ServiceResult<number>> {
    try {
      const { data, error } = await supabase
        .from('workout_sessions')
        .select('started_at')
        .eq('user_id', userId)
        .not('completed_at', 'is', null)
        .order('started_at', { ascending: false })
        .limit(100);

      if (error) return { data: null, error: { code: error.code, message: error.message } };
      if (!data || data.length === 0) return { data: 0, error: null };

      const dates = [...new Set(
        data.map((s) => s.started_at.split('T')[0])
      )].sort().reverse();

      let streak  = 0;
      let current = new Date();
      current.setHours(0, 0, 0, 0);

      for (const dateStr of dates) {
        const date = new Date(dateStr);
        const diff = Math.round(
          (current.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (diff <= 1) {
          streak++;
          current = date;
        } else {
          break;
        }
      }

      return { data: streak, error: null };
    } catch (err) {
      return { data: null, error: { code: 'UNKNOWN', message: 'Could not get streak', details: err } };
    }
  },


  async saveWorkoutSets(
    sets: {
      sessionId: string;
      exerciseId: string;
      setNumber: number;
      weightKg: number | null;
      reps: number | null;
      durationSeconds: number | null;
      rpe: number | null;
      isWarmup: boolean;
      isPr: boolean;
      loggedAt: string;
    }[]
  ): Promise<ServiceResult<void>> {
    try {
      const { error } = await supabase
        .from('workout_sets')
        .insert(
          sets.map((s) => ({
            session_id: s.sessionId,
            exercise_id: s.exerciseId,
            set_number: s.setNumber,
            weight_kg: s.weightKg,
            reps: s.reps,
            duration_seconds: s.durationSeconds,
            rpe: s.rpe,
            is_warmup: s.isWarmup,
            is_pr: s.isPr,
            logged_at: s.loggedAt,
          }))
        );
      if (error) return { data: null, error: { code: error.code, message: error.message } };
      return { data: undefined, error: null };
    } catch (err) {
      return { data: null, error: { code: 'UNKNOWN', message: 'Could not save sets', details: err } };
    }
  }
};
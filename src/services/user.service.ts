import { supabase } from '../lib/supabase';
import type { ServiceResult } from '../types/common.types';

export interface LifetimeStats {
  totalWorkouts: number;
  totalKmRun:    number;
  totalSets:     number;
  totalVolumeKg: number;
  avgSleepHours: number;
  currentStreak: number;
}

export const userService = {
  async getLifetimeStats(userId: string): Promise<ServiceResult<LifetimeStats>> {
    try {
      const [workoutsRes, runsRes, sleepRes] = await Promise.all([
        supabase
          .from('workout_sessions')
          .select('total_sets, total_volume_kg')
          .eq('user_id', userId)
          .not('completed_at', 'is', null),
        supabase
          .from('run_sessions')
          .select('distance_m')
          .eq('user_id', userId),
        supabase
          .from('sleep_logs')
          .select('duration_minutes')
          .eq('user_id', userId)
          .limit(30),
      ]);

      const workouts  = (workoutsRes.data ?? []) as { total_sets: number; total_volume_kg: number }[];
      const runs      = (runsRes.data    ?? []) as { distance_m: number }[];
      const sleepLogs = (sleepRes.data   ?? []) as { duration_minutes: number }[];

      const totalWorkouts = workouts.length;
      const totalSets     = workouts.reduce((s: number, w) => s + (w.total_sets      ?? 0), 0);
      const totalVolumeKg = workouts.reduce((s: number, w) => s + (w.total_volume_kg ?? 0), 0);
      const totalKmRun    = runs.reduce((s: number, r) => s + (r.distance_m ?? 0), 0) / 1000;
      const avgSleepMins  = sleepLogs.length > 0
        ? sleepLogs.reduce((s: number, sl) => s + (sl.duration_minutes ?? 0), 0) / sleepLogs.length
        : 0;

      return {
        data: {
          totalWorkouts,
          totalKmRun:    Math.round(totalKmRun    * 10) / 10,
          totalSets,
          totalVolumeKg: Math.round(totalVolumeKg),
          avgSleepHours: Math.round((avgSleepMins / 60) * 10) / 10,
          currentStreak: 0,
        },
        error: null,
      };
    } catch (err) {
      return { data: null, error: { code: 'UNKNOWN', message: 'Could not load stats', details: err } };
    }
  },

  async getTodayNutrition(userId: string): Promise<ServiceResult<{
    calories: number;
    protein:  number;
    carbs:    number;
    fat:      number;
  }>> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('meal_logs')
        .select('calories, protein_g, carbs_g, fat_g')
        .eq('user_id', userId)
        .eq('date', today);

      if (error) return { data: null, error: { code: error.code, message: error.message } };

      const rows   = (data ?? []) as { calories: number; protein_g: number; carbs_g: number; fat_g: number }[];
      const totals = rows.reduce(
        (acc: { calories: number; protein: number; carbs: number; fat: number }, row) => ({
          calories: acc.calories + (row.calories  ?? 0),
          protein:  acc.protein  + (row.protein_g ?? 0),
          carbs:    acc.carbs    + (row.carbs_g   ?? 0),
          fat:      acc.fat      + (row.fat_g     ?? 0),
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      );

      return { data: totals, error: null };
    } catch (err) {
      return { data: null, error: { code: 'UNKNOWN', message: 'Could not load nutrition', details: err } };
    }
  },

  async getTodaySleep(userId: string): Promise<ServiceResult<number>> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('sleep_logs')
        .select('duration_minutes')
        .eq('user_id', userId)
        .eq('date', today)
        .single();

      if (error && (error as any).code !== 'PGRST116') {
        return { data: null, error: { code: (error as any).code, message: error.message } };
      }

      const row   = data as { duration_minutes: number } | null;
      const hours = row ? Math.round((row.duration_minutes / 60) * 10) / 10 : 0;
      return { data: hours, error: null };
    } catch (err) {
      return { data: null, error: { code: 'UNKNOWN', message: 'Could not load sleep', details: err } };
    }
  },

  async getWeeklyCalories(userId: string): Promise<ServiceResult<number[]>> {
    try {
      const days: number[] = [];
      const today = new Date();

      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        const { data } = await supabase
          .from('meal_logs')
          .select('calories')
          .eq('user_id', userId)
          .eq('date', dateStr);

        const rows  = (data ?? []) as { calories: number }[];
        const total = rows.reduce((s: number, r) => s + (r.calories ?? 0), 0);
        days.push(total);
      }

      return { data: days, error: null };
    } catch (err) {
      return { data: null, error: { code: 'UNKNOWN', message: 'Could not load weekly calories', details: err } };
    }
  },
};
import { supabase } from '../lib/supabase';
import type { ServiceResult } from '../types/common.types';

export interface RunSessionRow {
  id:               string;
  user_id:          string;
  activity_type:    string;
  distance_m:       number;
  duration_seconds: number;
  avg_pace_spm:     number | null;
  avg_hr_bpm:       number | null;
  calories_burned:  number | null;
  elevation_gain_m: number | null;
  splits:           unknown | null;
  started_at:       string;
  is_public:        boolean;
}

export const runService = {
  async getSessions(userId: string, limit = 10): Promise<ServiceResult<RunSessionRow[]>> {
    try {
      const { data, error } = await supabase
        .from('run_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('started_at', { ascending: false })
        .limit(limit);

      if (error) return { data: null, error: { code: error.code, message: error.message } };
      return { data: (data ?? []) as unknown as RunSessionRow[], error: null };
    } catch (err) {
      return { data: null, error: { code: 'UNKNOWN', message: 'Could not load runs', details: err } };
    }
  },

  async saveSession(params: {
    userId:          string;
    activityType:    string;
    distanceM:       number;
    durationSeconds: number;
    avgPaceSpm:      number | null;
    caloriesBurned:  number;
    splits:          unknown[];
  }): Promise<ServiceResult<string>> {
    try {
      const { data, error } = await supabase
        .from('run_sessions')
        .insert({
          user_id:          params.userId,
          activity_type:    params.activityType,
          distance_m:       params.distanceM,
          duration_seconds: params.durationSeconds,
          avg_pace_spm:     params.avgPaceSpm,
          calories_burned:  params.caloriesBurned,
          splits:           params.splits,
          started_at:       new Date().toISOString(),
          is_public:        false,
        } as any)
        .select('id')
        .single();

      if (error) return { data: null, error: { code: error.code, message: error.message } };
      return { data: (data as any).id, error: null };
    } catch (err) {
      return { data: null, error: { code: 'UNKNOWN', message: 'Could not save run', details: err } };
    }
  },

  async getWeeklyKm(userId: string): Promise<ServiceResult<number[]>> {
    try {
      const result: number[] = [];
      const today = new Date();

      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(date);
        end.setHours(23, 59, 59, 999);

        const { data } = await supabase
          .from('run_sessions')
          .select('distance_m')
          .eq('user_id', userId)
          .gte('started_at', start.toISOString())
          .lte('started_at', end.toISOString());

        const rows  = (data ?? []) as { distance_m: number }[];
        const total = rows.reduce((s: number, r) => s + (r.distance_m ?? 0), 0) / 1000;
        result.push(Math.round(total * 10) / 10);
      }

      return { data: result, error: null };
    } catch (err) {
      return { data: null, error: { code: 'UNKNOWN', message: 'Could not load weekly km', details: err } };
    }
  },

  async getPersonalBests(userId: string): Promise<ServiceResult<{
    fastest1k:  number | null;
    fastest5k:  number | null;
    longestRun: number | null;
    bestPace:   number | null;
  }>> {
    try {
      const { data } = await supabase
        .from('run_sessions')
        .select('distance_m, duration_seconds, avg_pace_spm')
        .eq('user_id', userId)
        .eq('activity_type', 'run');

      const rows = (data ?? []) as {
        distance_m:       number;
        duration_seconds: number;
        avg_pace_spm:     number | null;
      }[];

      const longestRun = rows.length > 0
        ? Math.max(...rows.map((r) => r.distance_m)) / 1000
        : null;

      const pacedRows = rows.filter((r) => r.avg_pace_spm !== null);
      const bestPace  = pacedRows.length > 0
        ? Math.min(...pacedRows.map((r) => r.avg_pace_spm!))
        : null;

      return {
        data: {
          fastest1k:  null,
          fastest5k:  null,
          longestRun: longestRun ? Math.round(longestRun * 10) / 10 : null,
          bestPace,
        },
        error: null,
      };
    } catch (err) {
      return { data: null, error: { code: 'UNKNOWN', message: 'Could not load PBs', details: err } };
    }
  },
};
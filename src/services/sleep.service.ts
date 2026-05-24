import { supabase } from '../lib/supabase';
import type { ServiceResult } from '../types/common.types';

export interface SleepLogRow {
  id:               string;
  user_id:          string;
  bedtime:          string;
  wake_time:        string;
  duration_minutes: number;
  quality_rating:   number | null;
  notes:            string | null;
  source:           string;
  date:             string;
  created_at:       string;
}

export const sleepService = {
  async getRecentLogs(userId: string, limit = 14): Promise<ServiceResult<SleepLogRow[]>> {
    try {
      const { data, error } = await supabase
        .from('sleep_logs')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(limit);

      if (error) return { data: null, error: { code: error.code, message: error.message } };
      return { data: (data ?? []) as unknown as SleepLogRow[], error: null };
    } catch (err) {
      return { data: null, error: { code: 'UNKNOWN', message: 'Could not load sleep logs', details: err } };
    }
  },

  async getWeeklyAvg(userId: string): Promise<ServiceResult<number>> {
    try {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const { data } = await supabase
        .from('sleep_logs')
        .select('duration_minutes')
        .eq('user_id', userId)
        .gte('date', weekAgo.toISOString().split('T')[0]);

      const rows = (data ?? []) as { duration_minutes: number }[];
      if (rows.length === 0) return { data: 0, error: null };

      const avg = rows.reduce((s, r) => s + r.duration_minutes, 0) / rows.length;
      return { data: Math.round((avg / 60) * 10) / 10, error: null };
    } catch (err) {
      return { data: null, error: { code: 'UNKNOWN', message: 'Could not load sleep avg', details: err } };
    }
  },
};
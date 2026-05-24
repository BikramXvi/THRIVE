import { supabase } from '../lib/supabase';
import type { ServiceResult } from '../types/common.types';

export interface FoodItemRow {
  id:                string;
  name:              string;
  name_ne:           string | null;
  is_nepali:         boolean;
  calories_per_100g: number;
  protein_per_100g:  number | null;
  carbs_per_100g:    number | null;
  fat_per_100g:      number | null;
  fibre_per_100g:    number | null;
  serving_size:      number | null;
  serving_unit:      string | null;
}

export interface MealLogRow {
  id:           string;
  food_item_id: string;
  meal_type:    string;
  serving_size: number;
  serving_unit: string;
  calories:     number;
  protein_g:    number | null;
  carbs_g:      number | null;
  fat_g:        number | null;
  fibre_g:      number | null;
  logged_at:    string;
  food_items:   FoodItemRow;
}

export const dietService = {
  async searchFoods(
    query:      string,
    nepaliOnly: boolean = false
  ): Promise<ServiceResult<FoodItemRow[]>> {
    try {
      let q = supabase
        .from('food_items')
        .select('*')
        .order('is_nepali', { ascending: false })
        .limit(30);

      if (query.trim()) q = q.ilike('name', `%${query}%`);
      if (nepaliOnly)   q = q.eq('is_nepali', true);

      const { data, error } = await q;
      if (error) return { data: null, error: { code: error.code, message: error.message } };
      return { data: (data ?? []) as unknown as FoodItemRow[], error: null };
    } catch (err) {
      return { data: null, error: { code: 'UNKNOWN', message: 'Search failed', details: err } };
    }
  },

  async getTodayLogs(userId: string): Promise<ServiceResult<MealLogRow[]>> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('meal_logs')
        .select('*, food_items(*)')
        .eq('user_id', userId)
        .eq('date', today)
        .order('logged_at', { ascending: true });

      if (error) return { data: null, error: { code: error.code, message: error.message } };
      return { data: (data ?? []) as unknown as MealLogRow[], error: null };
    } catch (err) {
      return { data: null, error: { code: 'UNKNOWN', message: 'Could not load logs', details: err } };
    }
  },

  async logFood(params: {
    userId:      string;
    foodItemId:  string;
    mealType:    string;
    servingSize: number;
    servingUnit: string;
    food:        FoodItemRow;
  }): Promise<ServiceResult<void>> {
    try {
      const { userId, foodItemId, mealType, servingSize, servingUnit, food } = params;
      const multiplier = servingSize / 100;

      const { error } = await supabase.from('meal_logs').insert({
        user_id:      userId,
        food_item_id: foodItemId,
        meal_type:    mealType,
        serving_size: servingSize,
        serving_unit: servingUnit,
        calories:     Math.round(food.calories_per_100g * multiplier),
        protein_g:    food.protein_per_100g  ? Math.round(food.protein_per_100g  * multiplier * 10) / 10 : null,
        carbs_g:      food.carbs_per_100g    ? Math.round(food.carbs_per_100g    * multiplier * 10) / 10 : null,
        fat_g:        food.fat_per_100g      ? Math.round(food.fat_per_100g      * multiplier * 10) / 10 : null,
        fibre_g:      food.fibre_per_100g    ? Math.round(food.fibre_per_100g    * multiplier * 10) / 10 : null,
        logged_at:    new Date().toISOString(),
        date:         new Date().toISOString().split('T')[0],
      } as any);

      if (error) return { data: null, error: { code: error.code, message: error.message } };
      return { data: undefined, error: null };
    } catch (err) {
      return { data: null, error: { code: 'UNKNOWN', message: 'Could not log food', details: err } };
    }
  },

  async deleteLog(logId: string): Promise<ServiceResult<void>> {
    try {
      const { error } = await supabase
        .from('meal_logs')
        .delete()
        .eq('id', logId);

      if (error) return { data: null, error: { code: error.code, message: error.message } };
      return { data: undefined, error: null };
    } catch (err) {
      return { data: null, error: { code: 'UNKNOWN', message: 'Could not delete log', details: err } };
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
      return { data: null, error: { code: 'UNKNOWN', message: 'Could not load weekly data', details: err } };
    }
  },
};
// ─────────────────────────────────────────────
// Shared TypeScript Types
// ─────────────────────────────────────────────

// Standard service return type -- never throw, always return
export type ServiceResult<T> =
  | { data: T; error: null }
  | { data: null; error: AppError };

// Standard app error
export interface AppError {
  code: string;
  message: string;
  details?: unknown;
}

// User subscription tiers
export type Tier = 'free' | 'pro' | 'elite';

// User fitness goal
export type Goal =
  | 'lose_weight'
  | 'build_muscle'
  | 'run_faster'
  | 'flexibility'
  | 'general_health';

// User fitness level
export type FitnessLevel = 'beginner' | 'intermediate' | 'advanced';

// Meal types
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

// Activity types for runs
export type ActivityType = 'run' | 'walk' | 'hike' | 'cycle';

// Exercise categories
export type ExerciseCategory =
  | 'push'
  | 'pull'
  | 'legs'
  | 'yoga'
  | 'hiit'
  | 'cardio'
  | 'other';

// Personal record types
export type PRType =
  | 'max_weight'
  | 'max_reps'
  | 'max_volume'
  | 'max_distance'
  | 'fastest_pace';

// Data source for health sync
export type HealthSource =
  | 'manual'
  | 'apple_health'
  | 'google_health'
  | 'garmin';

// Supported languages
export type Language = 'ne' | 'en';

// Units
export type Units = 'metric' | 'imperial';

// Pagination cursor
export interface PaginationCursor {
  page: number;
  limit: number;
  total?: number;
}
-- FitNepal initial schema
-- Run: supabase db push

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users
CREATE TABLE public.users (
  id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           text UNIQUE NOT NULL,
  username        text UNIQUE NOT NULL,
  display_name    text,
  avatar_url      text,
  date_of_birth   date,
  gender          text CHECK (gender IN ('male','female','other','prefer_not_to_say')),
  height_cm       numeric(5,1),
  weight_kg       numeric(5,1),
  goal            text CHECK (goal IN ('lose_weight','build_muscle','run_faster','flexibility','general_health')),
  fitness_level   text CHECK (fitness_level IN ('beginner','intermediate','advanced')),
  activity_level  text CHECK (activity_level IN ('sedentary','lightly_active','moderately_active','very_active')),
  equipment       text[] DEFAULT '{}',
  language        text DEFAULT 'ne' CHECK (language IN ('ne','en')),
  units           text DEFAULT 'metric' CHECK (units IN ('metric','imperial')),
  tier            text DEFAULT 'free' CHECK (tier IN ('free','pro','elite')),
  timezone        text DEFAULT 'Asia/Kathmandu',
  onboarded_at    timestamptz,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_select_own" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_insert_own" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "users_update_own" ON public.users FOR UPDATE USING (auth.uid() = id);

-- Exercises
CREATE TABLE public.exercises (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  name_ne         text,
  category        text CHECK (category IN ('push','pull','legs','yoga','hiit','cardio','other')),
  muscle_group    text[] NOT NULL DEFAULT '{}',
  equipment       text[] DEFAULT '{}',
  difficulty      text CHECK (difficulty IN ('beginner','intermediate','advanced')),
  instructions    text,
  instructions_ne text,
  video_url       text,
  thumbnail_url   text,
  is_custom       boolean DEFAULT false,
  created_by      uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exercises_readable_by_all" ON public.exercises FOR SELECT USING (true);
CREATE POLICY "exercises_insert_custom" ON public.exercises FOR INSERT WITH CHECK (auth.uid() = created_by AND is_custom = true);
CREATE INDEX ON public.exercises USING gin(to_tsvector('english', name));
CREATE INDEX ON public.exercises (category);

-- Workout sessions
CREATE TABLE public.workout_sessions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name             text NOT NULL,
  notes            text,
  started_at       timestamptz NOT NULL,
  completed_at     timestamptz,
  duration_seconds integer,
  total_volume_kg  numeric(10,2),
  total_sets       integer DEFAULT 0,
  calories_burned  integer,
  rpe_average      numeric(3,1),
  is_public        boolean DEFAULT false,
  created_at       timestamptz DEFAULT now()
);

ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sessions_owner_full" ON public.workout_sessions USING (auth.uid() = user_id);
CREATE POLICY "sessions_public_readable" ON public.workout_sessions FOR SELECT USING (is_public = true OR auth.uid() = user_id);
CREATE INDEX ON public.workout_sessions (user_id, started_at DESC);

-- Workout sets
CREATE TABLE public.workout_sets (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id       uuid NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  exercise_id      uuid NOT NULL REFERENCES public.exercises(id) ON DELETE RESTRICT,
  set_number       integer NOT NULL,
  weight_kg        numeric(6,2),
  reps             integer,
  duration_seconds integer,
  rpe              integer CHECK (rpe BETWEEN 1 AND 10),
  is_warmup        boolean DEFAULT false,
  is_pr            boolean DEFAULT false,
  logged_at        timestamptz DEFAULT now()
);

ALTER TABLE public.workout_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sets_owner_via_session" ON public.workout_sets
  USING (EXISTS (SELECT 1 FROM public.workout_sessions ws WHERE ws.id = session_id AND ws.user_id = auth.uid()));
CREATE INDEX ON public.workout_sets (session_id);
CREATE INDEX ON public.workout_sets (exercise_id);

-- Food items
CREATE TABLE public.food_items (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name              text NOT NULL,
  name_ne           text,
  brand             text,
  barcode           text UNIQUE,
  is_nepali         boolean DEFAULT false,
  calories_per_100g integer NOT NULL,
  protein_per_100g  numeric(6,2),
  carbs_per_100g    numeric(6,2),
  fat_per_100g      numeric(6,2),
  fibre_per_100g    numeric(6,2),
  serving_size      numeric(8,2),
  serving_unit      text,
  is_verified       boolean DEFAULT false,
  submitted_by      uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at        timestamptz DEFAULT now()
);

ALTER TABLE public.food_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "food_readable_by_all" ON public.food_items FOR SELECT USING (true);
CREATE INDEX ON public.food_items USING gin(to_tsvector('english', name));
CREATE INDEX ON public.food_items (barcode) WHERE barcode IS NOT NULL;
CREATE INDEX ON public.food_items (is_nepali) WHERE is_nepali = true;

-- Meal logs
CREATE TABLE public.meal_logs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  food_item_id uuid NOT NULL REFERENCES public.food_items(id) ON DELETE RESTRICT,
  meal_type    text NOT NULL CHECK (meal_type IN ('breakfast','lunch','dinner','snack')),
  serving_size numeric(8,2) NOT NULL,
  serving_unit text NOT NULL,
  calories     integer NOT NULL,
  protein_g    numeric(6,2),
  carbs_g      numeric(6,2),
  fat_g        numeric(6,2),
  fibre_g      numeric(6,2),
  logged_at    timestamptz DEFAULT now(),
  date         date NOT NULL DEFAULT CURRENT_DATE
);

ALTER TABLE public.meal_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "meals_owner_full" ON public.meal_logs USING (auth.uid() = user_id);
CREATE INDEX ON public.meal_logs (user_id, date DESC);

-- Run sessions
CREATE TABLE public.run_sessions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  activity_type    text DEFAULT 'run' CHECK (activity_type IN ('run','walk','hike','cycle')),
  distance_m       numeric(10,2) NOT NULL,
  duration_seconds integer NOT NULL,
  avg_pace_spm     integer,
  avg_hr_bpm       integer,
  calories_burned  integer,
  elevation_gain_m numeric(8,2),
  route_geojson    jsonb,
  splits           jsonb,
  started_at       timestamptz NOT NULL,
  is_public        boolean DEFAULT false,
  created_at       timestamptz DEFAULT now()
);

ALTER TABLE public.run_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "runs_owner_full" ON public.run_sessions USING (auth.uid() = user_id);
CREATE POLICY "runs_public_readable" ON public.run_sessions FOR SELECT USING (is_public = true OR auth.uid() = user_id);
CREATE INDEX ON public.run_sessions (user_id, started_at DESC);

-- Sleep logs
CREATE TABLE public.sleep_logs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  bedtime          timestamptz NOT NULL,
  wake_time        timestamptz NOT NULL,
  duration_minutes integer NOT NULL,
  quality_rating   integer CHECK (quality_rating BETWEEN 1 AND 5),
  notes            text,
  source           text DEFAULT 'manual',
  date             date NOT NULL DEFAULT CURRENT_DATE,
  created_at       timestamptz DEFAULT now()
);

ALTER TABLE public.sleep_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sleep_owner_full" ON public.sleep_logs USING (auth.uid() = user_id);
CREATE INDEX ON public.sleep_logs (user_id, date DESC);

-- Body metrics
CREATE TABLE public.body_metrics (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  weight_kg    numeric(5,2),
  body_fat_pct numeric(4,2),
  waist_cm     numeric(5,2),
  notes        text,
  logged_at    timestamptz DEFAULT now(),
  date         date NOT NULL DEFAULT CURRENT_DATE
);

ALTER TABLE public.body_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "body_owner_full" ON public.body_metrics USING (auth.uid() = user_id);
CREATE INDEX ON public.body_metrics (user_id, date DESC);

-- Personal records
CREATE TABLE public.personal_records (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  exercise_id uuid NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  record_type text NOT NULL CHECK (record_type IN ('max_weight','max_reps','max_volume','max_distance','fastest_pace')),
  value       numeric(10,3) NOT NULL,
  unit        text NOT NULL,
  achieved_at timestamptz NOT NULL,
  session_id  uuid REFERENCES public.workout_sessions(id) ON DELETE SET NULL,
  UNIQUE (user_id, exercise_id, record_type)
);

ALTER TABLE public.personal_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prs_owner_full" ON public.personal_records USING (auth.uid() = user_id);
CREATE INDEX ON public.personal_records (user_id, exercise_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
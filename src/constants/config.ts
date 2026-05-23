// ─────────────────────────────────────────────
// App Configuration
// All environment variables and feature flags.
// ─────────────────────────────────────────────

export const Config = {
    // Supabase
    SUPABASE_URL:      process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
    SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  
    // Anthropic AI
    ANTHROPIC_API_KEY: process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '',
    AI_MODEL_HEAVY:    'claude-sonnet-4-5',
    AI_MODEL_LIGHT:    'claude-haiku-4-5-20251001',
    AI_MAX_TOKENS:     1024,
  
    // App
    APP_NAME:          'FitNepal',
    APP_VERSION:       '1.0.0',
    DEFAULT_LANGUAGE:  'ne',
    DEFAULT_TIMEZONE:  'Asia/Kathmandu',
    DEFAULT_CURRENCY:  'NPR',
  
    // Limits per tier
    AI_REQUESTS_FREE:  5,
    AI_REQUESTS_PRO:   50,
    GPS_RUNS_FREE:     5,
  
    // Supabase Storage buckets
    BUCKET_AVATARS:    'avatars',
    BUCKET_PROGRESS:   'progress-photos',
    BUCKET_MEDIA:      'media',
  
    // Feature flags (flip to true as features are built)
    FEATURE_AI_COACH:      true,
    FEATURE_GPS_RUNS:      true,
    FEATURE_HEALTH_SYNC:   false,  // v2
    FEATURE_SOCIAL:        false,  // v2
    FEATURE_CONSULTATIONS: false,  // v3
    FEATURE_GYM_PARTNERS:  false,  // v3
  } as const;
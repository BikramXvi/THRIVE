// ─────────────────────────────────────────────
// TanStack Query Key Factory
// Always import from here. Never use inline strings.
// ─────────────────────────────────────────────

export const queryKeys = {
    // Auth
    session: ['session'] as const,
  
    // User
    user: {
      all:     ['user'] as const,
      profile: (userId: string) => ['user', userId, 'profile'] as const,
      metrics: (userId: string) => ['user', userId, 'metrics'] as const,
      streak:  (userId: string) => ['user', userId, 'streak'] as const,
    },
  
    // Workouts
    workouts: {
      all:       ['workouts'] as const,
      list:      (userId: string) => ['workouts', userId, 'list'] as const,
      detail:    (sessionId: string) => ['workouts', 'detail', sessionId] as const,
      programs:  ['workouts', 'programs'] as const,
      exercises: ['workouts', 'exercises'] as const,
      prs:       (userId: string) => ['workouts', userId, 'prs'] as const,
      history:   (userId: string, exerciseId: string) =>
                   ['workouts', userId, 'history', exerciseId] as const,
    },
  
    // Diet
    diet: {
      all:      ['diet'] as const,
      log:      (userId: string, date: string) => ['diet', userId, 'log', date] as const,
      weekly:   (userId: string) => ['diet', userId, 'weekly'] as const,
      food:     (foodId: string) => ['diet', 'food', foodId] as const,
      search:   (query: string) => ['diet', 'search', query] as const,
    },
  
    // Runs
    runs: {
      all:    ['runs'] as const,
      list:   (userId: string) => ['runs', userId, 'list'] as const,
      detail: (runId: string) => ['runs', 'detail', runId] as const,
      pbs:    (userId: string) => ['runs', userId, 'pbs'] as const,
    },
  
    // Sleep
    sleep: {
      all:    ['sleep'] as const,
      list:   (userId: string) => ['sleep', userId, 'list'] as const,
      weekly: (userId: string) => ['sleep', userId, 'weekly'] as const,
    },
  
    // Body metrics
    body: {
      all:     ['body'] as const,
      metrics: (userId: string) => ['body', userId, 'metrics'] as const,
      photos:  (userId: string) => ['body', userId, 'photos'] as const,
    },
  
    // AI
    ai: {
      conversations: (userId: string) => ['ai', userId, 'conversations'] as const,
      weeklyReport:  (userId: string) => ['ai', userId, 'weekly-report'] as const,
    },
  
    // Social
    social: {
      feed:      (userId: string) => ['social', userId, 'feed'] as const,
      followers: (userId: string) => ['social', userId, 'followers'] as const,
      following: (userId: string) => ['social', userId, 'following'] as const,
    },
  
    // Subscription
    subscription: (userId: string) => ['subscription', userId] as const,
  } as const;
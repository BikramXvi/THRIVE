// ─────────────────────────────────────────────
// FitNepal Design System Tokens
// Single source of truth for all visual values.
// Never hardcode colors or spacing in components.
// ─────────────────────────────────────────────

// Colors
export const Colors = {
    // Backgrounds
    BG_BASE:      '#0a0a0b',
    BG_SURFACE:   '#111114',
    BG_SURFACE_2: '#18181d',
    BG_SURFACE_3: '#1f1f26',
  
    // Text
    TEXT_PRIMARY:   '#f0eff4',
    TEXT_SECONDARY: '#8e8d9a',
    TEXT_TERTIARY:  '#4e4d5a',
  
    // Brand accent
    ACCENT:      '#c8f53a',
    ACCENT_DIM:  'rgba(200,245,58,0.12)',
    ACCENT_2:    '#a8e020',
  
    // Semantic
    RED:         '#ff4d6a',
    RED_DIM:     'rgba(255,77,106,0.12)',
    ORANGE:      '#ff9500',
    ORANGE_DIM:  'rgba(255,149,0,0.12)',
    BLUE:        '#4d9fff',
    BLUE_DIM:    'rgba(77,159,255,0.12)',
    TEAL:        '#2dd9b0',
    TEAL_DIM:    'rgba(45,217,176,0.12)',
    PURPLE:      '#b87bff',
    PURPLE_DIM:  'rgba(184,123,255,0.12)',
  
    // Borders
    BORDER:      'rgba(255,255,255,0.07)',
    BORDER_2:    'rgba(255,255,255,0.12)',
  } as const;
  
  // Typography
  export const Fonts = {
    DISPLAY: 'Syne',
    BODY:    'DMSans',
    MONO:    'JetBrainsMono',
  } as const;
  
  // Spacing (8pt grid)
  export const Spacing = {
    S1:  4,
    S2:  8,
    S3:  12,
    S4:  16,
    S5:  20,   // standard screen horizontal padding
    S6:  24,
    S8:  32,
    S10: 40,
    S12: 48,
  } as const;
  
  // Border radius
  export const Radius = {
    SM:   10,
    MD:   16,
    LG:   22,
    XL:   32,
    FULL: 999,
  } as const;
  
  // Component sizing
  export const Sizing = {
    TOUCH_MIN:       44,   // minimum touch target (Apple HIG)
    CTA_HEIGHT:      56,   // primary call-to-action button
    SECONDARY_BTN:   44,
    INPUT_HEIGHT:    48,
    BOTTOM_NAV:      64,
    SCREEN_PADDING:  20,   // horizontal padding on all screens
  } as const;
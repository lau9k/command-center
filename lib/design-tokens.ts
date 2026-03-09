// ─── Design Tokens ───────────────────────────────────────────────────────────
// Single source of truth for all visual constants. Import from here instead of
// hard-coding hex values in components.

// ─── Color Palette ───────────────────────────────────────────────────────────

export const colors = {
  // Backgrounds (dark-first)
  bg: {
    primary: '#0A0A0A',
    secondary: '#141414',
    tertiary: '#1E1E1E',
  },

  // Light-mode overrides
  bgLight: {
    primary: '#FAFAFA',
    secondary: '#FFFFFF',
    tertiary: '#F5F5F5',
  },

  // Borders
  border: '#2A2A2A',
  borderHover: '#3A3A3A',
  borderLight: '#E5E5E5',

  // Text
  text: {
    primary: '#F5F5F5',
    secondary: '#A0A0A0',
    tertiary: '#666666',
  },
  textLight: {
    primary: '#171717',
    secondary: '#636363',
    tertiary: '#6B6B6B',
  },

  // Accent colors (semantic)
  accent: {
    blue: '#3B82F6',
    green: '#22C55E',
    red: '#EF4444',
    yellow: '#EAB308',
    purple: '#A855F7',
    orange: '#F97316',
  },

  // Platform brand colors
  platform: {
    linkedin: '#0A66C2',
    twitter: '#1DA1F2',
    youtube: '#FF0000',
    instagram: '#E1306C',
    tiktok: '#00F2EA',
    telegram: '#0088CC',
  },

  // Project / entity status
  status: {
    active: '#22C55E',
    paused: '#EAB308',
    completed: '#3B82F6',
    archived: '#6B7280',
    backburner: '#6B7280',
  },

  // Card-specific (kept for backward compat; prefer CSS vars in components)
  card: {
    bg: '#141414',
    hover: '#1A1A1A',
    border: '#2A2A2A',
    radius: '8px',
    padding: '16px',
  },
} as const;

// ─── Spacing Scale (px) ─────────────────────────────────────────────────────

export const spacing = {
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  6: '24px',
  8: '32px',
  12: '48px',
} as const;

// ─── Border Radius ──────────────────────────────────────────────────────────

export const radius = {
  sm: '6px',
  md: '8px',
  lg: '12px',
} as const;

// ─── Font Sizes ─────────────────────────────────────────────────────────────

export const fontSize = {
  xs: '12px',
  sm: '14px',
  base: '16px',
  lg: '18px',
  xl: '24px',
  '2xl': '32px',
} as const;

// ─── Typography Presets ─────────────────────────────────────────────────────

export const typography = {
  h1: { size: '24px', weight: '600', lineHeight: '1.2' },
  h2: { size: '18px', weight: '600', lineHeight: '1.3' },
  h3: { size: '16px', weight: '600', lineHeight: '1.4' },
  body: { size: '14px', weight: '400', lineHeight: '1.5' },
  caption: { size: '12px', weight: '400', lineHeight: '1.4' },
} as const;

// ─── Shadows ────────────────────────────────────────────────────────────────

export const shadow = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
} as const;

// ─── Tailwind class mappings ────────────────────────────────────────────────
// Centralised badge / status classes so every module uses the same colours.
// IMPORTANT: these must be static string literals (no interpolation) so that
// Tailwind's JIT scanner can detect them.

/** Project/entity status → Tailwind badge classes (bg + text) */
export const statusBadgeClass: Record<string, string> = {
  active: "bg-[#22C55E]/20 text-[#22C55E]",
  paused: "bg-[#EAB308]/20 text-[#EAB308]",
  completed: "bg-[#3B82F6]/20 text-[#3B82F6]",
  archived: "bg-[#6B7280]/20 text-[#6B7280]",
  backburner: "bg-[#6B7280]/20 text-[#6B7280]",
  // Content post statuses
  draft: "bg-[#666666]/20 text-muted-foreground",
  ready: "bg-[#EAB308]/20 text-[#EAB308]",
  scheduled: "bg-[#3B82F6]/20 text-[#3B82F6]",
  published: "bg-[#22C55E]/20 text-[#22C55E]",
  failed: "bg-[#EF4444]/20 text-[#EF4444]",
};

/** Activity type → icon colour class */
export const activityTypeColor: Record<string, string> = {
  task: "text-[#3B82F6]",
  content: "text-[#A855F7]",
  contact: "text-[#22C55E]",
};

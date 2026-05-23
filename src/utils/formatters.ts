// ─────────────────────────────────────────────
// Formatters
// Consistent display formatting across the app.
// ─────────────────────────────────────────────

import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';

// Currency (NPR)
export function formatNPR(amount: number): string {
  return `NPR ${amount.toLocaleString('en-NP')}`;
}

// Date display
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  if (isToday(date))     return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'dd MMM yyyy');
}

// Relative time (e.g. "2 hours ago")
export function formatRelativeTime(dateString: string): string {
  return formatDistanceToNow(new Date(dateString), { addSuffix: true });
}

// Weight display with units
export function formatWeight(kg: number, units: 'metric' | 'imperial' = 'metric'): string {
  if (units === 'imperial') return `${(kg * 2.205).toFixed(1)} lbs`;
  return `${kg} kg`;
}

// Calorie display
export function formatCalories(kcal: number): string {
  return `${kcal.toLocaleString()} kcal`;
}

// Sleep duration
export function formatSleepDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// Volume (total kg lifted in a session)
export function formatVolume(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`;
  return `${kg.toLocaleString()} kg`;
}

// Heart rate zone label
export function hrZoneLabel(bpm: number, maxHR: number): string {
  const pct = (bpm / maxHR) * 100;
  if (pct < 60) return 'Rest';
  if (pct < 70) return 'Easy';
  if (pct < 80) return 'Moderate';
  if (pct < 90) return 'Hard';
  return 'Max';
}
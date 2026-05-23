// ─────────────────────────────────────────────
// Fitness Calculations
// Pure functions. No side effects. Fully typed.
// ─────────────────────────────────────────────

// TDEE (Total Daily Energy Expenditure) using Mifflin-St Jeor
export function calculateTDEE(params: {
    weightKg:      number;
    heightCm:      number;
    ageYears:      number;
    gender:        'male' | 'female' | 'other';
    activityLevel: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active';
  }): number {
    const { weightKg, heightCm, ageYears, gender, activityLevel } = params;
  
    // BMR
    const bmr = gender === 'female'
      ? 10 * weightKg + 6.25 * heightCm - 5 * ageYears - 161
      : 10 * weightKg + 6.25 * heightCm - 5 * ageYears + 5;
  
    const multipliers = {
      sedentary:        1.2,
      lightly_active:   1.375,
      moderately_active: 1.55,
      very_active:      1.725,
    };
  
    return Math.round(bmr * multipliers[activityLevel]);
  }
  
  // Protein target (2g per kg for muscle building, 1.6g for general)
  export function calculateProteinTarget(weightKg: number, goal: string): number {
    const multiplier = goal === 'build_muscle' ? 2.0 : 1.6;
    return Math.round(weightKg * multiplier);
  }
  
  // BMI
  export function calculateBMI(weightKg: number, heightCm: number): number {
    const heightM = heightCm / 100;
    return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
  }
  
  // Age from date of birth
  export function calculateAge(dateOfBirth: string): number {
    const today = new Date();
    const birth = new Date(dateOfBirth);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age -= 1;
    }
    return age;
  }
  
  // Pace: seconds per metre to min/km string
  export function formatPace(secondsPerMetre: number): string {
    const secondsPerKm = secondsPerMetre * 1000;
    const minutes = Math.floor(secondsPerKm / 60);
    const seconds = Math.round(secondsPerKm % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
  
  // Distance in metres to formatted string
  export function formatDistance(metres: number): string {
    if (metres >= 1000) return `${(metres / 1000).toFixed(2)} km`;
    return `${metres.toFixed(0)} m`;
  }
  
  // Duration in seconds to HH:MM:SS or MM:SS
  export function formatDuration(totalSeconds: number): string {
    const hours   = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
  
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
  
  // Estimated calories burned during workout (MET-based approximation)
  export function estimateWorkoutCalories(
    durationMinutes: number,
    weightKg: number,
    intensity: 'light' | 'moderate' | 'vigorous' = 'moderate'
  ): number {
    const met = { light: 3.5, moderate: 5.5, vigorous: 8.0 }[intensity];
    return Math.round((met * weightKg * durationMinutes) / 60);
  }
  
  // Weekly volume load (total kg lifted)
  export function calculateVolume(weightKg: number, reps: number): number {
    return weightKg * reps;
  }
import { create } from 'zustand';

export interface DailyFitness {
  date: string;
  steps: number;
  activeCalories: number;
  restingHeartRate?: number;
  sleepHours?: number;
  workoutMinutes?: number;
}

export interface HealthSummary {
  todaySteps: number;
  weeklySteps: number[];
  todayCalories: number;
  avgHeartRate?: number;
  avgSleep?: number;
  lastWorkout?: string;
  weeklyData: DailyFitness[];
}

interface FitnessStore {
  summary: HealthSummary | null;
  loading: boolean;
  error: string | null;
  setSummary: (summary: HealthSummary) => void;
  setLoading: (v: boolean) => void;
  setError: (e: string | null) => void;
}

export const useFitnessStore = create<FitnessStore>((set) => ({
  summary: null,
  loading: false,
  error: null,
  setSummary: (summary) => set({ summary }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));

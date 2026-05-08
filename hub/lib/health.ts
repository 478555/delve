import { Platform } from 'react-native';
import { useFitnessStore, HealthSummary, DailyFitness } from '../store/useFitnessStore';

// react-native-health only works on real iOS devices with HealthKit
// On Android or simulator, we return mock data for development
let AppleHealthKit: any = null;

if (Platform.OS === 'ios') {
  try {
    AppleHealthKit = require('react-native-health').default;
  } catch {
    // HealthKit not available (simulator or missing entitlement)
  }
}

const PERMISSIONS = {
  permissions: {
    read: [
      'StepCount',
      'ActiveEnergyBurned',
      'HeartRate',
      'SleepAnalysis',
      'Workout',
    ],
    write: ['Workout'],
  },
};

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

export async function initHealth(): Promise<boolean> {
  if (!AppleHealthKit) return false;
  return new Promise(resolve => {
    AppleHealthKit.initHealthKit(PERMISSIONS, (err: any) => {
      resolve(!err);
    });
  });
}

export async function fetchHealthData(): Promise<void> {
  const store = useFitnessStore.getState();
  store.setLoading(true);
  store.setError(null);

  if (!AppleHealthKit) {
    // Mock data for development
    store.setSummary(getMockData());
    store.setLoading(false);
    return;
  }

  try {
    const weeklyData: DailyFitness[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = formatDate(daysAgo(i));
      weeklyData.push({ date, steps: 0, activeCalories: 0 });
    }

    const stepsPromise = new Promise<number[]>(resolve => {
      AppleHealthKit.getDailyStepCountSamples(
        { startDate: daysAgo(7).toISOString(), endDate: new Date().toISOString() },
        (err: any, results: any[]) => {
          if (err || !results) { resolve([]); return; }
          resolve(results.map(r => r.value));
        }
      );
    });

    const caloriesPromise = new Promise<number>(resolve => {
      AppleHealthKit.getActiveEnergyBurned(
        { startDate: daysAgo(1).toISOString(), endDate: new Date().toISOString() },
        (err: any, results: any[]) => {
          if (err || !results || results.length === 0) { resolve(0); return; }
          resolve(results.reduce((s, r) => s + r.value, 0));
        }
      );
    });

    const heartRatePromise = new Promise<number | undefined>(resolve => {
      AppleHealthKit.getHeartRateSamples(
        { startDate: daysAgo(7).toISOString(), endDate: new Date().toISOString(), limit: 50 },
        (err: any, results: any[]) => {
          if (err || !results || results.length === 0) { resolve(undefined); return; }
          const avg = results.reduce((s, r) => s + r.value, 0) / results.length;
          resolve(Math.round(avg));
        }
      );
    });

    const sleepPromise = new Promise<number | undefined>(resolve => {
      AppleHealthKit.getSleepSamples(
        { startDate: daysAgo(2).toISOString(), endDate: new Date().toISOString() },
        (err: any, results: any[]) => {
          if (err || !results || results.length === 0) { resolve(undefined); return; }
          const asleep = results.filter(r => r.value === 'ASLEEP');
          if (asleep.length === 0) { resolve(undefined); return; }
          const totalMs = asleep.reduce((s: number, r: any) => {
            return s + (new Date(r.endDate).getTime() - new Date(r.startDate).getTime());
          }, 0);
          resolve(Math.round((totalMs / 3600000) * 10) / 10);
        }
      );
    });

    const [stepsArr, calories, heartRate, sleep] = await Promise.all([
      stepsPromise, caloriesPromise, heartRatePromise, sleepPromise,
    ]);

    const weeklySteps = stepsArr.slice(-7);
    const todaySteps = weeklySteps[weeklySteps.length - 1] ?? 0;

    const summary: HealthSummary = {
      todaySteps,
      weeklySteps,
      todayCalories: Math.round(calories),
      avgHeartRate: heartRate,
      avgSleep: sleep,
      weeklyData,
    };

    store.setSummary(summary);
  } catch (e: any) {
    store.setError(e.message ?? 'Health data unavailable');
    store.setSummary(getMockData());
  } finally {
    store.setLoading(false);
  }
}

function getMockData(): HealthSummary {
  const today = new Date();
  const weeklyData: DailyFitness[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    return {
      date: formatDate(d),
      steps: 4000 + Math.floor(Math.random() * 8000),
      activeCalories: 200 + Math.floor(Math.random() * 400),
      sleepHours: 5.5 + Math.random() * 3,
      restingHeartRate: 55 + Math.floor(Math.random() * 20),
    };
  });
  return {
    todaySteps: weeklyData[6].steps,
    weeklySteps: weeklyData.map(d => d.steps),
    todayCalories: weeklyData[6].activeCalories,
    avgHeartRate: 67,
    avgSleep: 7.1,
    weeklyData,
  };
}

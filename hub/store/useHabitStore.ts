import { create } from 'zustand';
import { getDb, generateId } from '../lib/db';

export interface Habit {
  id: string;
  name: string;
  icon: string;
  color: string;
  frequency: 'daily' | 'weekly';
  active: boolean;
  createdAt: string;
}

export interface HabitLog {
  id: string;
  habitId: string;
  date: string;
  completed: boolean;
}

export interface Goal {
  id: string;
  title: string;
  description?: string;
  deadline?: string;
  progress: number;
  completed: boolean;
  createdAt: string;
}

interface HabitStore {
  habits: Habit[];
  logs: HabitLog[];
  goals: Goal[];
  loading: boolean;
  load: () => Promise<void>;
  addHabit: (name: string, icon?: string, color?: string) => Promise<void>;
  removeHabit: (id: string) => Promise<void>;
  toggleLog: (habitId: string, date: string) => Promise<void>;
  isCompleted: (habitId: string, date: string) => boolean;
  getStreak: (habitId: string) => number;
  addGoal: (title: string, description?: string, deadline?: string) => Promise<void>;
  updateGoalProgress: (id: string, progress: number) => Promise<void>;
  removeGoal: (id: string) => Promise<void>;
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

export const useHabitStore = create<HabitStore>((set, get) => ({
  habits: [],
  logs: [],
  goals: [],
  loading: false,

  load: async () => {
    set({ loading: true });
    const db = await getDb();
    const habits = await db.getAllAsync<any>('SELECT * FROM habits WHERE active = 1 ORDER BY created_at ASC');
    const logs = await db.getAllAsync<any>('SELECT * FROM habit_logs ORDER BY date DESC');
    const goals = await db.getAllAsync<any>('SELECT * FROM goals ORDER BY created_at DESC');
    set({
      habits: habits.map(h => ({
        id: h.id, name: h.name, icon: h.icon, color: h.color,
        frequency: h.frequency, active: !!h.active, createdAt: h.created_at,
      })),
      logs: logs.map(l => ({
        id: l.id, habitId: l.habit_id, date: l.date, completed: !!l.completed,
      })),
      goals: goals.map(g => ({
        id: g.id, title: g.title, description: g.description, deadline: g.deadline,
        progress: g.progress, completed: !!g.completed, createdAt: g.created_at,
      })),
      loading: false,
    });
  },

  addHabit: async (name, icon = '⭐', color = '#7c6af7') => {
    const db = await getDb();
    const habit: Habit = {
      id: generateId(), name, icon, color, frequency: 'daily', active: true,
      createdAt: new Date().toISOString(),
    };
    await db.runAsync(
      'INSERT INTO habits (id, name, icon, color, frequency) VALUES (?, ?, ?, ?, ?)',
      [habit.id, habit.name, habit.icon, habit.color, habit.frequency]
    );
    set({ habits: [...get().habits, habit] });
  },

  removeHabit: async (id) => {
    const db = await getDb();
    await db.runAsync('UPDATE habits SET active = 0 WHERE id = ?', [id]);
    set({ habits: get().habits.filter(h => h.id !== id) });
  },

  toggleLog: async (habitId, date) => {
    const existing = get().logs.find(l => l.habitId === habitId && l.date === date);
    const db = await getDb();
    if (existing) {
      await db.runAsync('DELETE FROM habit_logs WHERE id = ?', [existing.id]);
      set({ logs: get().logs.filter(l => l.id !== existing.id) });
    } else {
      const log: HabitLog = { id: generateId(), habitId, date, completed: true };
      await db.runAsync(
        'INSERT INTO habit_logs (id, habit_id, date, completed) VALUES (?, ?, ?, ?)',
        [log.id, log.habitId, log.date, 1]
      );
      set({ logs: [log, ...get().logs] });
    }
  },

  isCompleted: (habitId, date) => {
    return get().logs.some(l => l.habitId === habitId && l.date === date);
  },

  getStreak: (habitId) => {
    const logs = get().logs.filter(l => l.habitId === habitId && l.completed);
    if (logs.length === 0) return 0;
    const dates = [...new Set(logs.map(l => l.date))].sort().reverse();
    let streak = 0;
    let cursor = new Date();
    for (const date of dates) {
      const cursorStr = cursor.toISOString().split('T')[0];
      if (date === cursorStr) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  },

  addGoal: async (title, description, deadline) => {
    const db = await getDb();
    const goal: Goal = {
      id: generateId(), title, description, deadline,
      progress: 0, completed: false, createdAt: new Date().toISOString(),
    };
    await db.runAsync(
      'INSERT INTO goals (id, title, description, deadline, progress) VALUES (?, ?, ?, ?, ?)',
      [goal.id, goal.title, goal.description ?? null, goal.deadline ?? null, 0]
    );
    set({ goals: [goal, ...get().goals] });
  },

  updateGoalProgress: async (id, progress) => {
    const db = await getDb();
    const completed = progress >= 100 ? 1 : 0;
    await db.runAsync('UPDATE goals SET progress = ?, completed = ? WHERE id = ?', [progress, completed, id]);
    set({
      goals: get().goals.map(g => g.id === id ? { ...g, progress, completed: !!completed } : g),
    });
  },

  removeGoal: async (id) => {
    const db = await getDb();
    await db.runAsync('DELETE FROM goals WHERE id = ?', [id]);
    set({ goals: get().goals.filter(g => g.id !== id) });
  },
}));

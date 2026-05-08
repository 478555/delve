import { create } from 'zustand';
import { getDb, generateId } from '../lib/db';

export type Priority = 1 | 2 | 3;

export interface Task {
  id: string;
  title: string;
  notes?: string;
  dueDate?: string;
  priority: Priority;
  completed: boolean;
  reminderId?: string;
  createdAt: string;
}

interface TaskStore {
  tasks: Task[];
  loading: boolean;
  load: () => Promise<void>;
  add: (title: string, opts?: Partial<Omit<Task, 'id' | 'title' | 'createdAt'>>) => Promise<void>;
  toggle: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  update: (id: string, data: Partial<Task>) => Promise<void>;
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  loading: false,

  load: async () => {
    set({ loading: true });
    const db = await getDb();
    const rows = await db.getAllAsync<any>('SELECT * FROM tasks ORDER BY completed ASC, due_date ASC, created_at DESC');
    set({
      tasks: rows.map(r => ({
        id: r.id,
        title: r.title,
        notes: r.notes,
        dueDate: r.due_date,
        priority: r.priority as Priority,
        completed: !!r.completed,
        reminderId: r.reminder_id,
        createdAt: r.created_at,
      })),
      loading: false,
    });
  },

  add: async (title, opts = {}) => {
    const db = await getDb();
    const task: Task = {
      id: generateId(),
      title,
      notes: opts.notes,
      dueDate: opts.dueDate,
      priority: opts.priority ?? 1,
      completed: false,
      reminderId: opts.reminderId,
      createdAt: new Date().toISOString(),
    };
    await db.runAsync(
      'INSERT INTO tasks (id, title, notes, due_date, priority, reminder_id) VALUES (?, ?, ?, ?, ?, ?)',
      [task.id, task.title, task.notes ?? null, task.dueDate ?? null, task.priority, task.reminderId ?? null]
    );
    set({ tasks: [task, ...get().tasks] });
  },

  toggle: async (id) => {
    const task = get().tasks.find(t => t.id === id);
    if (!task) return;
    const db = await getDb();
    const completed = !task.completed;
    await db.runAsync('UPDATE tasks SET completed = ? WHERE id = ?', [completed ? 1 : 0, id]);
    set({ tasks: get().tasks.map(t => t.id === id ? { ...t, completed } : t) });
  },

  remove: async (id) => {
    const db = await getDb();
    await db.runAsync('DELETE FROM tasks WHERE id = ?', [id]);
    set({ tasks: get().tasks.filter(t => t.id !== id) });
  },

  update: async (id, data) => {
    const db = await getDb();
    if (data.title !== undefined) await db.runAsync('UPDATE tasks SET title = ? WHERE id = ?', [data.title, id]);
    if (data.notes !== undefined) await db.runAsync('UPDATE tasks SET notes = ? WHERE id = ?', [data.notes, id]);
    if (data.dueDate !== undefined) await db.runAsync('UPDATE tasks SET due_date = ? WHERE id = ?', [data.dueDate, id]);
    if (data.priority !== undefined) await db.runAsync('UPDATE tasks SET priority = ? WHERE id = ?', [data.priority, id]);
    set({ tasks: get().tasks.map(t => t.id === id ? { ...t, ...data } : t) });
  },
}));

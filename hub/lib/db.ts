import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync('hub.db');
    await initSchema(db);
  }
  return db;
}

async function initSchema(db: SQLite.SQLiteDatabase) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      notes TEXT,
      due_date TEXT,
      priority INTEGER DEFAULT 1,
      completed INTEGER DEFAULT 0,
      reminder_id TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS habits (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT DEFAULT '⭐',
      frequency TEXT DEFAULT 'daily',
      color TEXT DEFAULT '#7c6af7',
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS habit_logs (
      id TEXT PRIMARY KEY,
      habit_id TEXT NOT NULL,
      date TEXT NOT NULL,
      completed INTEGER DEFAULT 1,
      FOREIGN KEY (habit_id) REFERENCES habits(id)
    );

    CREATE TABLE IF NOT EXISTS goals (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      deadline TEXT,
      progress INTEGER DEFAULT 0,
      completed INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

export function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

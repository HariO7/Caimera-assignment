import BetterSqlite3 from 'better-sqlite3';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_DIR = path.join(__dirname, '../../data');
const DB_PATH = path.join(DB_DIR, 'quiz.db');

// Ensure data directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const db: BetterSqlite3.Database = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Schema initialization
db.exec(`
  CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    expression TEXT NOT NULL,
    answer REAL NOT NULL,
    difficulty INTEGER DEFAULT 1,
    created_at INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS game_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    current_question_id INTEGER REFERENCES questions(id),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'answered')),
    winner_id TEXT,
    winner_name TEXT,
    updated_at INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS user_scores (
    user_id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    wins INTEGER DEFAULT 0,
    total_attempts INTEGER DEFAULT 0,
    last_win_at INTEGER,
    joined_at INTEGER DEFAULT (unixepoch())
  );

  -- Ensure exactly one game_state row exists
  INSERT OR IGNORE INTO game_state (id, status) VALUES (1, 'active');
`);

export default db;
export { DB_PATH };

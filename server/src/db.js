// SQLite-backed store for the shared hero registry, mail, and clans.
// One flat file (data.sqlite, gitignored) - fine for local/dev use, matching
// this server's "small" scope (see CONVERSION_PLAN.md's Phase 5 #14-16/#26-27
// entries). No auth: any client can PUT/act as any hero name, same trust
// model as arEntry's own "no password field" decision.
import Database from 'better-sqlite3'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const dir = path.dirname(fileURLToPath(import.meta.url))
const dbPath = process.env.DRAGON_COURT_DB ?? path.join(dir, '..', 'data.sqlite')

export const db = new Database(dbPath)
db.pragma('journal_mode = WAL')

db.exec(`
  CREATE TABLE IF NOT EXISTS heroes (
    name TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    clan TEXT,
    level INTEGER NOT NULL,
    save_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS mail (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipient TEXT NOT NULL,
    sender TEXT NOT NULL,
    label TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS clans (
    name TEXT PRIMARY KEY,
    leader TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`)

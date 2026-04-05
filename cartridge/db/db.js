// db/db.js
// SQLite connection using sql.js — pure WASM, zero native compilation.
// Handles initialization, schema migrations, and persisting the DB file to disk.

'use strict';

const path = require('path');
const fs   = require('fs');

let _db = null; // sql.js Database instance

/**
 * Returns the path to the database file.
 * Uses Electron's app.getPath('userData') when available, falls back to ./resources/data/.
 */
function getDbPath() {
  try {
    const { app } = require('electron');
    return path.join(app.getPath('userData'), 'library.db');
  } catch {
    // Running outside Electron (tests)
    const dir = path.join(__dirname, '..', 'resources', 'data');
    fs.mkdirSync(dir, { recursive: true });
    return path.join(dir, 'library.db');
  }
}

/**
 * Initializes sql.js, loads or creates the database file, runs migrations.
 * Must be called once at app startup before any queries.
 *
 * @returns {Promise<void>}
 */
async function init() {
  if (_db) return; // Already initialized

  const initSqlJs = require('sql.js');
  const SQL = await initSqlJs();

  const dbPath = getDbPath();

  // Load existing DB file if present, otherwise create fresh
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    _db = new SQL.Database(fileBuffer);
  } else {
    _db = new SQL.Database();
  }

  runMigrations();
  persist(); // Write initial file to disk
}

/**
 * Runs all schema migrations in order.
 * Using IF NOT EXISTS makes every migration idempotent.
 */
function runMigrations() {
  _db.run(`
    CREATE TABLE IF NOT EXISTS games (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      system      TEXT NOT NULL,
      core        TEXT,
      rom_path    TEXT NOT NULL,
      boxart      TEXT,
      crc32       TEXT,
      year        INTEGER,
      play_time   INTEGER DEFAULT 0,
      last_played TEXT,
      added_at    TEXT NOT NULL
    );
  `);

  // Safe additive column migrations
  try { _db.run(`ALTER TABLE games ADD COLUMN crc32 TEXT`); } catch {}
  try { _db.run(`ALTER TABLE games ADD COLUMN label TEXT`); } catch {}
  try { _db.run(`ALTER TABLE games ADD COLUMN native INTEGER DEFAULT 0`); } catch {}

  // Migration: make 'core' nullable for N64 native games.
  // SQLite can't ALTER COLUMN, so we check if the old NOT NULL constraint
  // is still present and rebuild the table if so.
  const tableInfo = _db.exec(`PRAGMA table_info(games)`);
  if (tableInfo.length > 0) {
    const cols = tableInfo[0].values; // [cid, name, type, notnull, dflt, pk]
    const coreCol = cols.find(c => c[1] === 'core');
    if (coreCol && coreCol[3] === 1) { // notnull === 1
      _db.run(`
        CREATE TABLE games_new (
          id          TEXT PRIMARY KEY,
          name        TEXT NOT NULL,
          system      TEXT NOT NULL,
          core        TEXT,
          rom_path    TEXT NOT NULL,
          boxart      TEXT,
          crc32       TEXT,
          year        INTEGER,
          play_time   INTEGER DEFAULT 0,
          last_played TEXT,
          added_at    TEXT NOT NULL,
          label       TEXT,
          native      INTEGER DEFAULT 0
        );
      `);
      _db.run(`INSERT INTO games_new SELECT id, name, system, core, rom_path, boxart, crc32, year, play_time, last_played, added_at, NULL, 0 FROM games;`);
      _db.run(`DROP TABLE games;`);
      _db.run(`ALTER TABLE games_new RENAME TO games;`);
    }
  }

  _db.run(`
    CREATE TABLE IF NOT EXISTS save_states (
      id          TEXT PRIMARY KEY,
      game_id     TEXT REFERENCES games(id) ON DELETE CASCADE,
      slot        INTEGER NOT NULL,
      path        TEXT NOT NULL,
      screenshot  TEXT,
      created_at  TEXT NOT NULL
    );
  `);
}

/**
 * Persists the in-memory database to disk.
 * Call after any write operation.
 */
function persist() {
  const dbPath = getDbPath();
  const data   = _db.export();
  const buffer = Buffer.from(data);
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  fs.writeFileSync(dbPath, buffer);
}

/**
 * Returns the raw sql.js Database instance.
 * Prefer using the typed query functions in db/library.js and db/saves.js.
 *
 * @returns {import('sql.js').Database}
 */
function getDb() {
  if (!_db) throw new Error('Database not initialized — call db.init() first.');
  return _db;
}

module.exports = { init, getDb, persist };

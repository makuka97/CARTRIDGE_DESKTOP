// db/library.js
// Typed query functions for the games table.
// All functions return plain JS objects — no sql.js internals leak out.
// Call db.persist() after any write to flush to disk.

'use strict';

const { getDb, persist } = require('./db');

/**
 * Inserts a new game row.
 *
 * @param {{ id: string, name: string, system: string, core: string,
 *           rom_path: string, boxart?: string, year?: number }} game
 * @returns {string} The inserted row's id
 */
function insertGame(game) {
  const db = getDb();

  db.run(
    `INSERT INTO games (id, name, system, core, rom_path, boxart, year, native, added_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      game.id,
      game.name,
      game.system,
      game.core    ?? null,
      game.rom_path,
      game.boxart  ?? null,
      game.year    ?? null,
      game.native  ? 1 : 0,
      new Date().toISOString(),
    ]
  );

  persist();
  return game.id;
}

/**
 * Returns all games ordered by system then name.
 *
 * @returns {GameRow[]}
 */
function getAllGames() {
  const db   = getDb();
  const stmt = db.prepare(
    `SELECT * FROM games ORDER BY system ASC, name ASC`
  );

  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

/**
 * Returns all games for a given system, ordered by name.
 *
 * @param {string} system
 * @returns {GameRow[]}
 */
function getGamesBySystem(system) {
  const db   = getDb();
  const stmt = db.prepare(
    `SELECT * FROM games WHERE system = ? ORDER BY name ASC`
  );

  stmt.bind([system]);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

/**
 * Looks up a game by its ROM file path.
 * Used by the importer to detect duplicates.
 *
 * @param {string} romPath
 * @returns {GameRow | null}
 */
function getGameByRomPath(romPath) {
  const db   = getDb();
  const stmt = db.prepare(
    `SELECT * FROM games WHERE rom_path = ? LIMIT 1`
  );

  stmt.bind([romPath]);
  const row = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();
  return row;
}

/**
 * Updates the boxart path for a game.
 *
 * @param {string} id
 * @param {string} boxartPath
 */
function updateBoxart(id, boxartPath, crc32 = null) {
  const db = getDb();
  try {
    db.run(`UPDATE games SET boxart = ?, crc32 = COALESCE(?, crc32) WHERE id = ?`,
      [boxartPath, crc32, id]);
  } catch {
    // crc32 column may not exist on older DBs — fall back
    db.run(`UPDATE games SET boxart = ? WHERE id = ?`, [boxartPath, id]);
  }
  persist();
}

/**
 * Updates scraped metadata fields (name, year).
 *
 * @param {string} id
 * @param {{ name?: string, year?: number }} meta
 */
function updateMeta(id, meta) {
  const db = getDb();
  if (meta.name) db.run(`UPDATE games SET name = ? WHERE id = ?`,  [meta.name, id]);
  if (meta.year) db.run(`UPDATE games SET year = ? WHERE id = ?`,  [meta.year, id]);
  persist();
}

/**
 * Updates the play_time and last_played fields after a session ends.
 *
 * @param {string} id
 * @param {number} secondsPlayed
 */
function recordPlaySession(id, secondsPlayed) {
  const db = getDb();
  db.run(
    `UPDATE games
     SET play_time   = play_time + ?,
         last_played = ?
     WHERE id = ?`,
    [secondsPlayed, new Date().toISOString(), id]
  );
  persist();
}

/**
 * Deletes a game and its associated save states.
 *
 * @param {string} id
 */
function deleteGame(id) {
  const db = getDb();
  db.run(`DELETE FROM save_states WHERE game_id = ?`, [id]);
  db.run(`DELETE FROM games WHERE id = ?`, [id]);
  persist();
}

/**
 * @typedef {{ id: string, name: string, system: string, core: string,
 *             rom_path: string, boxart: string|null, year: number|null,
 *             play_time: number, last_played: string|null,
 *             added_at: string }} GameRow
 */

function getGame(id) {
  const db = getDb();
  return db.prepare('SELECT * FROM games WHERE id = ?').get(id) ?? null;
}

module.exports = {
  insertGame,
  getAllGames,
  getGamesBySystem,
  getGameByRomPath,
  getGame,
  updateBoxart,
  updateMeta,
  recordPlaySession,
  deleteGame,
};

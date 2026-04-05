// db/saves.js
// Typed query functions for the save_states table.

'use strict';

const { getDb, persist } = require('./db');

/**
 * Inserts or replaces a save state record for a given game + slot.
 *
 * @param {{ id: string, game_id: string, slot: number,
 *           path: string, screenshot?: string }} save
 */
function upsertSave(save) {
  const db = getDb();

  db.run(
    `INSERT INTO save_states (id, game_id, slot, path, screenshot, created_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       path       = excluded.path,
       screenshot = excluded.screenshot,
       created_at = excluded.created_at`,
    [
      save.id,
      save.game_id,
      save.slot,
      save.path,
      save.screenshot ?? null,
      new Date().toISOString(),
    ]
  );

  persist();
}

/**
 * Returns the save state for a given game and slot, or null if none exists.
 *
 * @param {string} gameId
 * @param {number} slot
 * @returns {SaveRow | null}
 */
function getSave(gameId, slot) {
  const db   = getDb();
  const stmt = db.prepare(
    `SELECT * FROM save_states WHERE game_id = ? AND slot = ? LIMIT 1`
  );

  stmt.bind([gameId, slot]);
  const row = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();
  return row;
}

/**
 * Returns all save states for a game, ordered by slot.
 *
 * @param {string} gameId
 * @returns {SaveRow[]}
 */
function getSavesForGame(gameId) {
  const db   = getDb();
  const stmt = db.prepare(
    `SELECT * FROM save_states WHERE game_id = ? ORDER BY slot ASC`
  );

  stmt.bind([gameId]);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

/**
 * Deletes a specific save state.
 *
 * @param {string} gameId
 * @param {number} slot
 */
function deleteSave(gameId, slot) {
  const db = getDb();
  db.run(
    `DELETE FROM save_states WHERE game_id = ? AND slot = ?`,
    [gameId, slot]
  );
  persist();
}

/**
 * @typedef {{ id: string, game_id: string, slot: number,
 *             path: string, screenshot: string|null,
 *             created_at: string }} SaveRow
 */

module.exports = { upsertSave, getSave, getSavesForGame, deleteSave };

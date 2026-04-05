// rom/importer.js
// Handles the full ROM import pipeline:
//   detect → check duplicate → copy to library → insert DB row → return game object

'use strict';

const path = require('path');
const fs   = require('fs');
const { detect }          = require('./detector');
const { insertGame, getGameByRomPath } = require('../db/library');

function getRomDir(system) {
  let base;
  try {
    const { app } = require('electron');
    base = path.join(app.getPath('userData'), 'roms', system);
  } catch {
    base = path.join(__dirname, '..', 'resources', 'data', 'roms', system);
  }
  fs.mkdirSync(base, { recursive: true });
  return base;
}

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

function nameFromFilename(filename) {
  let name = path.basename(filename, path.extname(filename));
  name = name.replace(/\s*[\(\[][^\)\]]*[\)\]]/g, '').trim();
  name = name.replace(/[_-]+/g, ' ').trim();
  name = name.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1));
  return name || path.basename(filename);
}

async function importRom(filePath) {
  const filename = path.basename(filePath);

  const detected = detect(filename);
  if (!detected) {
    const ext = path.extname(filename) || '(no extension)';
    return { error: 'unsupported', ext };
  }

  const romDir   = getRomDir(detected.system);
  const destPath = path.join(romDir, filename);

  const existing = getGameByRomPath(destPath);
  if (existing) {
    return { game: existing, duplicate: true };
  }

  await fs.promises.copyFile(filePath, destPath);

  const game = {
    id:       generateId(),
    name:     nameFromFilename(filename),
    system:   detected.system,
    core:     detected.core ?? null,
    native:   detected.native ?? false,
    rom_path: destPath,
  };

  insertGame(game);
  return { game: { ...game, label: detected.label } };
}

module.exports = { importRom, nameFromFilename };

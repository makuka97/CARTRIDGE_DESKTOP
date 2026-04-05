// main/preload.js
// Exposes a safe, typed IPC bridge to the renderer via contextBridge.
// IMPORTANT: Only 'electron' can be required here — the preload runs in a
// sandboxed context where Node built-ins and local modules are not available.

'use strict';

const { contextBridge, ipcRenderer } = require('electron');

// Expose the app root path so the renderer can locate emulator/data/
contextBridge.exposeInMainWorld('__appPath',
  ipcRenderer.sendSync('app:getPath')
);

// Expose the mupen64plus directory so the renderer can read InputAutoCfg.ini
contextBridge.exposeInMainWorld('__mupenDir',
  ipcRenderer.sendSync('app:getMupenDir')
);

// ── Detector (inlined — cannot require() local modules in sandboxed preload) ──

const EXTENSION_MAP = {
  nes:  { system: 'nes',       core: 'fceumm.wasm',          label: 'Nintendo NES',      emoji: '🎮' },
  smc:  { system: 'snes',      core: 'snes9x.wasm',          label: 'Super Nintendo',    emoji: '🎮' },
  snes: { system: 'snes',      core: 'snes9x.wasm',          label: 'Super Nintendo',    emoji: '🎮' },
  sfc:  { system: 'snes',      core: 'snes9x.wasm',          label: 'Super Nintendo',    emoji: '🎮' },
  gb:   { system: 'gb',        core: 'mgba.wasm',            label: 'Game Boy',          emoji: '🕹️' },
  gbc:  { system: 'gbc',       core: 'mgba.wasm',            label: 'Game Boy Color',    emoji: '🕹️' },
  gba:  { system: 'gba',       core: 'mgba.wasm',            label: 'Game Boy Advance',  emoji: '🕹️' },
  md:   { system: 'genesis',   core: 'genesis_plus_gx.wasm', label: 'Sega Genesis',      emoji: '🎯' },
  gen:  { system: 'genesis',   core: 'genesis_plus_gx.wasm', label: 'Sega Genesis',      emoji: '🎯' },
  smd:  { system: 'genesis',   core: 'genesis_plus_gx.wasm', label: 'Sega Genesis',      emoji: '🎯' },
  bin:  { system: 'genesis',   core: 'genesis_plus_gx.wasm', label: 'Sega Genesis',      emoji: '🎯' },
  // Nintendo
  nes:  { system: 'nes',      core: 'fceumm.wasm',           label: 'Nintendo NES',          emoji: '🎮' },
  smc:  { system: 'snes',     core: 'snes9x.wasm',           label: 'Super Nintendo',         emoji: '🎮' },
  snes: { system: 'snes',     core: 'snes9x.wasm',           label: 'Super Nintendo',         emoji: '🎮' },
  sfc:  { system: 'snes',     core: 'snes9x.wasm',           label: 'Super Nintendo',         emoji: '🎮' },
  gb:   { system: 'gb',       core: 'mgba.wasm',             label: 'Game Boy',               emoji: '🕹️' },
  gbc:  { system: 'gbc',      core: 'mgba.wasm',             label: 'Game Boy Color',         emoji: '🕹️' },
  gba:  { system: 'gba',      core: 'mgba.wasm',             label: 'Game Boy Advance',       emoji: '🕹️' },
  vb:   { system: 'vb',       core: 'beetle_vb.wasm',        label: 'Virtual Boy',            emoji: '🕹️' },
  // Sega
  sms:  { system: 'segaMS',   core: 'smsplus.wasm',          label: 'Sega Master System',     emoji: '🎮' },
  sg:   { system: 'segaMS',   core: 'smsplus.wasm',          label: 'Sega Master System',     emoji: '🎮' },
  gg:   { system: 'segaGG',   core: 'genesis_plus_gx.wasm',  label: 'Sega Game Gear',         emoji: '🕹️' },
  md:   { system: 'genesis',  core: 'genesis_plus_gx.wasm',  label: 'Sega Genesis',           emoji: '🎮' },
  gen:  { system: 'genesis',  core: 'genesis_plus_gx.wasm',  label: 'Sega Genesis',           emoji: '🎮' },
  smd:  { system: 'genesis',  core: 'genesis_plus_gx.wasm',  label: 'Sega Genesis',           emoji: '🎮' },
  bin:  { system: 'genesis',  core: 'genesis_plus_gx.wasm',  label: 'Sega Genesis',           emoji: '🎮' },
  cue:  { system: 'segaCD',   core: 'genesis_plus_gx.wasm',  label: 'Sega CD',                emoji: '💿' },
  chd:  { system: 'segaCD',   core: 'genesis_plus_gx.wasm',  label: 'Sega CD',                emoji: '💿' },
  // Atari
  a26:  { system: 'atari2600', core: 'stella.wasm',          label: 'Atari 2600',             emoji: '👾' },
  a78:  { system: 'atari7800', core: 'prosystem.wasm',       label: 'Atari 7800',             emoji: '👾' },
  lnx:  { system: 'lynx',     core: 'handy.wasm',            label: 'Atari Lynx',             emoji: '🕹️' },
  lyx:  { system: 'lynx',     core: 'handy.wasm',            label: 'Atari Lynx',             emoji: '🕹️' },
  // NEC
  pce:  { system: 'pce',      core: 'mednafen_pce.wasm',     label: 'TurboGrafx-16',          emoji: '🎮' },
  pcx:  { system: 'pce',      core: 'mednafen_pce.wasm',     label: 'TurboGrafx-16',          emoji: '🎮' },
  // SNK
  ngp:  { system: 'ngp',      core: 'mednafen_ngp.wasm',     label: 'Neo Geo Pocket',         emoji: '🕹️' },
  ngc:  { system: 'ngp',      core: 'mednafen_ngp.wasm',     label: 'Neo Geo Pocket Color',   emoji: '🕹️' },
  // Bandai
  ws:   { system: 'ws',       core: 'mednafen_wswan.wasm',   label: 'WonderSwan',             emoji: '🕹️' },
  wsc:  { system: 'ws',       core: 'mednafen_wswan.wasm',   label: 'WonderSwan Color',       emoji: '🕹️' },
  // Coleco
  col:  { system: 'coleco',   core: 'gearcoleco.wasm',       label: 'ColecoVision',           emoji: '👾' },
  cv:   { system: 'coleco',   core: 'gearcoleco.wasm',       label: 'ColecoVision',           emoji: '👾' },
  // Native — N64
  n64:  { system: 'n64', core: null, native: 'mupen64plus',  label: 'Nintendo 64',            emoji: '🎮' },
  z64:  { system: 'n64', core: null, native: 'mupen64plus',  label: 'Nintendo 64',            emoji: '🎮' },
  v64:  { system: 'n64', core: null, native: 'mupen64plus',  label: 'Nintendo 64',            emoji: '🎮' },
  // Native — GameCube / Wii
  iso:  { system: 'gcn', core: null, native: 'dolphin',      label: 'GameCube',               emoji: '🎮' },
  gcm:  { system: 'gcn', core: null, native: 'dolphin',      label: 'GameCube',               emoji: '🎮' },
  gcz:  { system: 'gcn', core: null, native: 'dolphin',      label: 'GameCube',               emoji: '🎮' },
  rvz:  { system: 'gcn', core: null, native: 'dolphin',      label: 'GameCube',               emoji: '🎮' },
  wbfs: { system: 'wii', core: null, native: 'dolphin',      label: 'Nintendo Wii',           emoji: '🕹️' },
  wad:  { system: 'wii', core: null, native: 'dolphin',      label: 'Nintendo Wii',           emoji: '🕹️' },
};

const SYSTEM_ORDER = [
  'nes', 'snes', 'n64', 'gcn', 'wii',
  'gba', 'gbc', 'gb', 'vb',
  'segaMS', 'segaGG', 'genesis', 'segaCD',
  'pce', 'ngp', 'ws', 'coleco', 'lynx',
  'atari2600', 'atari7800',
];

const SYSTEM_COLORS = {
  nes:       'var(--color-nes)',
  snes:      'var(--color-snes)',
  n64:       'var(--color-n64)',
  gcn:       'var(--color-gcn)',
  wii:       'var(--color-wii)',
  gba:       'var(--color-gba)',
  gbc:       'var(--color-gb)',
  gb:        'var(--color-gb)',
  vb:        'var(--color-vb)',
  segaMS:    'var(--color-sega)',
  segaGG:    'var(--color-sega)',
  genesis:   'var(--color-genesis)',
  segaCD:    'var(--color-genesis)',
  pce:       'var(--color-pce)',
  ngp:       'var(--color-ngp)',
  ws:        'var(--color-ws)',
  coleco:    'var(--color-atari)',
  lynx:      'var(--color-atari)',
  atari2600: 'var(--color-atari)',
  atari7800: 'var(--color-atari)',
};

function detect(filename) {
  if (!filename || typeof filename !== 'string') return null;
  const ext = filename.split('.').pop()?.toLowerCase();
  if (!ext) return null;
  return EXTENSION_MAP[ext] ?? null;
}

function systemColor(system) {
  return SYSTEM_COLORS[system] ?? 'var(--color-text-muted)';
}

function sortSystems(systems) {
  return [...systems].sort((a, b) => {
    const ia = SYSTEM_ORDER.indexOf(a);
    const ib = SYSTEM_ORDER.indexOf(b);
    return (ia === -1 ? Infinity : ia) - (ib === -1 ? Infinity : ib);
  });
}

// ── Expose to renderer ────────────────────────────────────────────────────────

contextBridge.exposeInMainWorld('detector', { detect, systemColor, sortSystems });

contextBridge.exposeInMainWorld('api', {
  importRom:        (filePath) => ipcRenderer.invoke('rom:import', filePath),
  getAllGames:       ()        => ipcRenderer.invoke('db:getAllGames'),
  getGamesBySystem: (sys)     => ipcRenderer.invoke('db:getBySystem', sys),
  deleteGames:      (ids)     => ipcRenderer.invoke('db:deleteGames', ids),
  launchGame:       (payload) => ipcRenderer.invoke('game:launch', payload),
  exitGame:         ()        => ipcRenderer.invoke('game:exit'),
  onGameExited: (cb) => {
    ipcRenderer.on('game:exited', (_event, data) => cb(data));
  },
  saveState:        (payload) => ipcRenderer.invoke('game:saveState', payload),
  loadState:        (payload) => ipcRenderer.invoke('game:loadState', payload),
  getInputMap:      ()        => ipcRenderer.invoke('input:getMap'),
  setInputMap:      (map)     => ipcRenderer.invoke('input:setMap', map),
  onMetaUpdated: (cb) => {
    ipcRenderer.on('game:metaUpdated', (_event, data) => cb(data));
  },
  getScraperCredentials:   ()      => ipcRenderer.invoke('scraper:getCredentials'),
  setScraperCredentials:   (creds) => ipcRenderer.invoke('scraper:setCredentials', creds),
  clearScraperCredentials: ()      => ipcRenderer.invoke('scraper:clearCredentials'),
  scrapeAll:               ()      => ipcRenderer.invoke('scraper:scrapeAll'),

  readTextFile:     (filePath) => ipcRenderer.invoke('fs:readTextFile', filePath),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow:    () => ipcRenderer.send('window:close'),

  getGameSaveDir:   (gameId)              => ipcRenderer.invoke('game:getSaveDir', gameId),
  getSaveFiles:     (gameId)              => ipcRenderer.invoke('game:getSaveFiles', gameId),
  showSaveDialog:   (defaultName)         => ipcRenderer.invoke('game:showSaveDialog', defaultName),
  showLoadDialog:   ()                    => ipcRenderer.invoke('game:showLoadDialog'),
  writeState:       (filePath, base64)    => ipcRenderer.invoke('game:writeState', filePath, base64),
  readState:        (filePath)            => ipcRenderer.invoke('game:readState', filePath),
});

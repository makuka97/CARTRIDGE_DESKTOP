// rom/detector.js
'use strict';

const EXTENSION_MAP = {
  // ── Nintendo ──────────────────────────────────────────────────────────────
  nes:  { system: 'nes',     core: 'fceumm.wasm',           label: 'Nintendo NES' },
  smc:  { system: 'snes',    core: 'snes9x.wasm',           label: 'Super Nintendo' },
  snes: { system: 'snes',    core: 'snes9x.wasm',           label: 'Super Nintendo' },
  sfc:  { system: 'snes',    core: 'snes9x.wasm',           label: 'Super Nintendo' },
  gb:   { system: 'gb',      core: 'mgba.wasm',             label: 'Game Boy' },
  gbc:  { system: 'gbc',     core: 'mgba.wasm',             label: 'Game Boy Color' },
  gba:  { system: 'gba',     core: 'mgba.wasm',             label: 'Game Boy Advance' },
  vb:   { system: 'vb',      core: 'beetle_vb.wasm',        label: 'Virtual Boy' },
  // ── Sega ─────────────────────────────────────────────────────────────────
  sms:  { system: 'segaMS',  core: 'smsplus.wasm',          label: 'Sega Master System' },
  sg:   { system: 'segaMS',  core: 'smsplus.wasm',          label: 'Sega Master System' },
  gg:   { system: 'segaGG',  core: 'genesis_plus_gx.wasm',  label: 'Sega Game Gear' },
  md:   { system: 'genesis', core: 'genesis_plus_gx.wasm',  label: 'Sega Genesis' },
  gen:  { system: 'genesis', core: 'genesis_plus_gx.wasm',  label: 'Sega Genesis' },
  smd:  { system: 'genesis', core: 'genesis_plus_gx.wasm',  label: 'Sega Genesis' },
  bin:  { system: 'genesis', core: 'genesis_plus_gx.wasm',  label: 'Sega Genesis' },
  cue:  { system: 'segaCD',  core: 'genesis_plus_gx.wasm',  label: 'Sega CD' },
  chd:  { system: 'segaCD',  core: 'genesis_plus_gx.wasm',  label: 'Sega CD' },
  // ── Atari ─────────────────────────────────────────────────────────────────
  a26:  { system: 'atari2600',  core: 'stella.wasm',         label: 'Atari 2600' },
  a78:  { system: 'atari7800',  core: 'prosystem.wasm',      label: 'Atari 7800' },
  lnx:  { system: 'lynx',      core: 'handy.wasm',          label: 'Atari Lynx' },
  lyx:  { system: 'lynx',      core: 'handy.wasm',          label: 'Atari Lynx' },
  // ── NEC ──────────────────────────────────────────────────────────────────
  pce:  { system: 'pce',        core: 'mednafen_pce.wasm',   label: 'TurboGrafx-16' },
  pcx:  { system: 'pce',        core: 'mednafen_pce.wasm',   label: 'TurboGrafx-16' },
  // ── SNK ──────────────────────────────────────────────────────────────────
  ngp:  { system: 'ngp',        core: 'mednafen_ngp.wasm',   label: 'Neo Geo Pocket' },
  ngc:  { system: 'ngp',        core: 'mednafen_ngp.wasm',   label: 'Neo Geo Pocket Color' },
  // ── Bandai ───────────────────────────────────────────────────────────────
  ws:   { system: 'ws',         core: 'mednafen_wswan.wasm', label: 'WonderSwan' },
  wsc:  { system: 'ws',         core: 'mednafen_wswan.wasm', label: 'WonderSwan Color' },
  // ── Coleco ───────────────────────────────────────────────────────────────
  col:  { system: 'coleco',     core: 'gearcoleco.wasm',     label: 'ColecoVision' },
  cv:   { system: 'coleco',     core: 'gearcoleco.wasm',     label: 'ColecoVision' },
  // ── Native subprocesses ───────────────────────────────────────────────────
  n64:  { system: 'n64', core: null, native: 'mupen64plus', label: 'Nintendo 64' },
  z64:  { system: 'n64', core: null, native: 'mupen64plus', label: 'Nintendo 64' },
  v64:  { system: 'n64', core: null, native: 'mupen64plus', label: 'Nintendo 64' },
  iso:  { system: 'gcn', core: null, native: 'dolphin',     label: 'GameCube' },
  gcm:  { system: 'gcn', core: null, native: 'dolphin',     label: 'GameCube' },
  gcz:  { system: 'gcn', core: null, native: 'dolphin',     label: 'GameCube' },
  rvz:  { system: 'gcn', core: null, native: 'dolphin',     label: 'GameCube' },
  wbfs: { system: 'wii', core: null, native: 'dolphin',     label: 'Nintendo Wii' },
  wad:  { system: 'wii', core: null, native: 'dolphin',     label: 'Nintendo Wii' },
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

module.exports = { detect, systemColor, sortSystems, EXTENSION_MAP, SYSTEM_ORDER };

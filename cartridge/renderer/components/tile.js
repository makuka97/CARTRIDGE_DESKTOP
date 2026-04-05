// renderer/components/tile.js
// Creates and returns a game tile DOM element.

'use strict';

// Clean SVG icons per system — no emojis
const SYSTEM_ICONS = {
  nes:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="17" cy="12" r="2"/><circle cx="14" cy="12" r="2" fill="currentColor" stroke="none" opacity="0.3"/><rect x="4" y="10" width="4" height="4" rx="1"/></svg>`,
  snes:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="5" width="20" height="14" rx="3"/><circle cx="17" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="14" cy="9" r="1.5" fill="currentColor" stroke="none"/><circle cx="20" cy="9" r="1.5" fill="currentColor" stroke="none"/><circle cx="17" cy="6" r="1.5" fill="currentColor" stroke="none"/><rect x="4" y="10" width="5" height="3" rx="1"/></svg>`,
  gba:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="3" width="16" height="18" rx="4"/><rect x="7" y="9" width="10" height="7" rx="1"/><circle cx="16" cy="17" r="1.2" fill="currentColor" stroke="none"/><circle cx="14" cy="19" r="1.2" fill="currentColor" stroke="none"/></svg>`,
  gbc:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="5" y="2" width="14" height="20" rx="3"/><rect x="7" y="6" width="10" height="8" rx="1"/><circle cx="15" cy="17" r="1.2" fill="currentColor" stroke="none"/><circle cx="13" cy="19" r="1.2" fill="currentColor" stroke="none"/></svg>`,
  gb:        `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="5" y="2" width="14" height="20" rx="3"/><rect x="7" y="6" width="10" height="8" rx="1"/><circle cx="15" cy="17" r="1.2" fill="currentColor" stroke="none"/><circle cx="13" cy="19" r="1.2" fill="currentColor" stroke="none"/></svg>`,
  genesis:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="7" width="20" height="10" rx="2"/><path d="M8 12h2M14 12h2"/><circle cx="18" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="16" cy="10" r="1.5" fill="currentColor" stroke="none"/></svg>`,
  atari2600: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="6" width="18" height="12" rx="2"/><line x1="12" y1="6" x2="12" y2="18"/><line x1="7" y1="9" x2="7" y2="15"/><line x1="17" y1="9" x2="17" y2="15"/></svg>`,
  atari7800: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="6" width="18" height="12" rx="2"/><line x1="12" y1="6" x2="12" y2="18"/><line x1="7" y1="9" x2="7" y2="15"/><line x1="17" y1="9" x2="17" y2="15"/></svg>`,
};

const DEFAULT_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="16" cy="12" r="2"/><rect x="4" y="10" width="4" height="4" rx="1"/></svg>`;

export function createTile(game) {
  const tile = document.createElement('div');
  tile.className  = 'tile';
  tile.dataset.id = game.id;
  tile.setAttribute('role', 'button');
  tile.setAttribute('tabindex', '0');
  tile.setAttribute('aria-label', game.name);

  // Art area
  const artEl = document.createElement('div');
  artEl.className = 'tile__art--placeholder';

  if (game.boxart) {
    const img = document.createElement('img');
    img.className = 'tile__art';
    const src = game.boxart.startsWith('cartridge://')
      ? game.boxart
      : 'cartridge://local/' + game.boxart.replace(/\\/g, '/');
    img.src       = src;
    img.alt       = game.name;
    img.loading   = 'lazy';
    img.onerror   = () => img.replaceWith(makePlaceholder(game));
    artEl.appendChild(img);
  } else {
    artEl.appendChild(makePlaceholder(game));
  }

  // Info area
  const info = document.createElement('div');
  info.className = 'tile__info';

  const name = document.createElement('div');
  name.className   = 'tile__name';
  name.textContent = game.name;

  const system = document.createElement('div');
  system.className   = 'tile__system';
  system.textContent = game.label ?? game.system?.toUpperCase() ?? '';

  info.appendChild(name);
  info.appendChild(system);
  tile.appendChild(artEl);
  tile.appendChild(info);

  tile.addEventListener('click', () => {
    if (game.native === 'mupen64plus') {
      showN64LaunchModal(game);
    } else if (game.native === 'dolphin') {
      showDolphinLaunchModal(game);
    } else {
      tile.dispatchEvent(new CustomEvent('game:launch', {
        bubbles: true,
        detail: { gameId: game.id, romPath: game.rom_path, core: game.core, native: false }
      }));
    }
  });

  tile.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') tile.click();
  });

  return tile;
}

function makePlaceholder(game) {
  const el = document.createElement('div');
  el.className = 'tile__art--placeholder';

  const icon = document.createElement('div');
  icon.className = 'tile__icon';
  icon.innerHTML = SYSTEM_ICONS[game.system] ?? DEFAULT_ICON;
  icon.style.color = `var(--color-${
    game.system === 'atari2600' || game.system === 'atari7800' ? 'atari' : game.system
  }, var(--color-text-muted))`;

  el.appendChild(icon);
  return el;
}

// ── N64 launch modal ─────────────────────────────────────────────────────────

// SDL keycode → readable key name
const SDL_KEY_NAMES = {
  8:'Backspace',9:'Tab',13:'Enter',27:'Esc',32:'Space',
  96:'`',97:'A',98:'B',99:'C',100:'D',101:'E',102:'F',
  103:'G',104:'H',105:'I',106:'J',107:'K',108:'L',
  109:'M',110:'N',111:'O',112:'P',113:'Q',114:'R',
  115:'S',116:'T',117:'U',118:'V',119:'W',120:'X',
  121:'Y',122:'Z',
  48:'0',49:'1',50:'2',51:'3',52:'4',
  53:'5',54:'6',55:'7',56:'8',57:'9',
  273:'↑',274:'↓',275:'→',276:'←',
  282:'F1',283:'F2',284:'F3',285:'F4',286:'F5',
  287:'F6',288:'F7',289:'F8',290:'F9',291:'F10',
  292:'F11',293:'F12',
  304:'LShift',305:'RShift',306:'LCtrl',307:'RCtrl',
  308:'LAlt',309:'RAlt',
  44:',',46:'.',47:'/',59:';',61:'=',91:'[',93:']',
};

function sdlKeyName(code) {
  return SDL_KEY_NAMES[code] ?? `key${code}`;
}

function parseKeyboardMappings(iniText) {
  const lines = iniText.split('\n');
  let inKb    = false;
  const map   = {};
  for (const raw of lines) {
    const line = raw.trim();
    if (line === '[Keyboard]') { inKb = true; continue; }
    if (inKb && line.startsWith('[')) break;
    if (!inKb || !line.includes('=')) continue;
    const [rawKey, rawVal] = line.split('=').map(s => s.trim());
    const single = rawVal.match(/^key\((\d+)\)$/);
    if (single) { map[rawKey] = sdlKeyName(parseInt(single[1])); continue; }
    const pair = rawVal.match(/^key\((\d+),(\d+)\)$/);
    if (pair) map[rawKey] = `${sdlKeyName(parseInt(pair[1]))} / ${sdlKeyName(parseInt(pair[2]))}`;
  }
  return map;
}

const N64_BUTTON_ORDER = [
  { key: 'X Axis',      label: 'Analog ←/→' },
  { key: 'Y Axis',      label: 'Analog ↑/↓' },
  { key: 'A Button',    label: 'A Button'    },
  { key: 'B Button',    label: 'B Button'    },
  { key: 'Z Trig',      label: 'Z Trigger'   },
  { key: 'Start',       label: 'Start'       },
  { key: 'L Trig',      label: 'L Trigger'   },
  { key: 'R Trig',      label: 'R Trigger'   },
  { key: 'DPad U',      label: 'D-Pad ↑'    },
  { key: 'DPad D',      label: 'D-Pad ↓'    },
  { key: 'DPad L',      label: 'D-Pad ←'    },
  { key: 'DPad R',      label: 'D-Pad →'    },
  { key: 'C Button U',  label: 'C ↑'         },
  { key: 'C Button D',  label: 'C ↓'         },
  { key: 'C Button L',  label: 'C ←'         },
  { key: 'C Button R',  label: 'C →'         },
];

async function loadKeyMappings() {
  try {
    const iniPath = window.__mupenDir + '/InputAutoCfg.ini';
    const text    = await window.api.readTextFile(iniPath);
    return parseKeyboardMappings(text);
  } catch { return null; }
}

async function showN64LaunchModal(game) {
  document.getElementById('n64-modal')?.remove();

  const mappings = await loadKeyMappings();

  // Build game controls rows
  let gameControlsHtml = '';
  if (mappings && Object.keys(mappings).length > 0) {
    const rows = N64_BUTTON_ORDER
      .filter(b => mappings[b.key])
      .map(b => `
        <div class="n64-modal__row">
          <span class="n64-modal__btn-label">${b.label}</span>
          <span class="n64-modal__arrow">→</span>
          <kbd>${mappings[b.key]}</kbd>
        </div>`).join('');
    gameControlsHtml = `<div class="n64-modal__controls">${rows}</div>`;
  } else {
    // Fallback hardcoded defaults
    gameControlsHtml = `
      <div class="n64-modal__controls">
        <div class="n64-modal__row"><span class="n64-modal__btn-label">Analog stick</span><span class="n64-modal__arrow">→</span><kbd>W A S D</kbd></div>
        <div class="n64-modal__row"><span class="n64-modal__btn-label">A Button</span><span class="n64-modal__arrow">→</span><kbd>LShift</kbd></div>
        <div class="n64-modal__row"><span class="n64-modal__btn-label">B Button</span><span class="n64-modal__arrow">→</span><kbd>LCtrl</kbd></div>
        <div class="n64-modal__row"><span class="n64-modal__btn-label">Z Trigger</span><span class="n64-modal__arrow">→</span><kbd>Z</kbd></div>
        <div class="n64-modal__row"><span class="n64-modal__btn-label">Start</span><span class="n64-modal__arrow">→</span><kbd>Enter</kbd></div>
        <div class="n64-modal__row"><span class="n64-modal__btn-label">C Buttons</span><span class="n64-modal__arrow">→</span><kbd>I J K L</kbd></div>
        <div class="n64-modal__row"><span class="n64-modal__btn-label">D-Pad</span><span class="n64-modal__arrow">→</span><kbd>Arrow keys</kbd></div>
        <div class="n64-modal__row"><span class="n64-modal__btn-label">L / R</span><span class="n64-modal__arrow">→</span><kbd>X</kbd> / <kbd>C</kbd></div>
      </div>`;
  }

  const overlay = document.createElement('div');
  overlay.id = 'n64-modal';
  overlay.className = 'n64-modal-overlay';
  overlay.innerHTML = `
    <div class="n64-modal">
      <div class="n64-modal__header">
        <div class="n64-modal__title">${game.name}</div>
        <div class="n64-modal__badge">Nintendo 64</div>
      </div>

      <div class="n64-modal__section-label">🎮 Game Controls (Keyboard)</div>
      ${gameControlsHtml}

      <div class="n64-modal__section-label">⌨️ Emulator Shortcuts</div>
      <div class="n64-modal__controls n64-modal__controls--shortcuts">
        <div class="n64-modal__row"><span class="n64-modal__btn-label">Save state</span><span class="n64-modal__arrow">→</span><kbd>F5</kbd></div>
        <div class="n64-modal__row"><span class="n64-modal__btn-label">Load state</span><span class="n64-modal__arrow">→</span><kbd>F7</kbd></div>
        <div class="n64-modal__row"><span class="n64-modal__btn-label">Select slot</span><span class="n64-modal__arrow">→</span><kbd>0 – 9</kbd></div>
        <div class="n64-modal__row"><span class="n64-modal__btn-label">Pause</span><span class="n64-modal__arrow">→</span><kbd>P</kbd></div>
        <div class="n64-modal__row"><span class="n64-modal__btn-label">Speed up</span><span class="n64-modal__arrow">→</span><kbd>F</kbd></div>
        <div class="n64-modal__row"><span class="n64-modal__btn-label">Quit game</span><span class="n64-modal__arrow">→</span><kbd>Esc</kbd></div>
      </div>

      <div class="n64-modal__note">Bluetooth / USB controllers are detected automatically.</div>

      <div class="n64-modal__actions">
        <button class="n64-modal__cancel">Cancel</button>
        <button class="n64-modal__launch">▶ Launch Game</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.querySelector('.n64-modal__launch').addEventListener('click', () => {
    overlay.remove();
    document.dispatchEvent(new CustomEvent('game:launch', {
      bubbles: true,
      detail: { gameId: game.id, romPath: game.rom_path, core: null, native: true }
    }));
  });

  overlay.querySelector('.n64-modal__cancel').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  const onKey = (e) => {
    if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', onKey); }
    if (e.key === 'Enter')  { overlay.querySelector('.n64-modal__launch').click(); document.removeEventListener('keydown', onKey); }
  };
  document.addEventListener('keydown', onKey);
}

// ── Dolphin (GameCube/Wii) launch modal ──────────────────────────────────────

function showDolphinLaunchModal(game) {
  document.getElementById('n64-modal')?.remove();

  const isWii    = game.system === 'wii';
  const label    = isWii ? 'Nintendo Wii' : 'GameCube';
  const badgeClr = isWii ? 'var(--color-wii)' : 'var(--color-gcn)';

  const overlay = document.createElement('div');
  overlay.id = 'n64-modal';
  overlay.className = 'n64-modal-overlay';

  overlay.innerHTML = `
    <div class="n64-modal">

      <div class="n64-modal__header">
        <div class="n64-modal__title">${game.name}</div>
        <div class="n64-modal__badge" style="background:${badgeClr}">${label}</div>
      </div>

      <div class="n64-modal__tabs">
        <button class="n64-tab n64-tab--active" data-tab="controller">Controller</button>
        <button class="n64-tab" data-tab="hotkeys">Hotkeys</button>
      </div>

      <!-- CONTROLLER TAB -->
      <div class="n64-tab-panel" id="n64-tab-controller">
        <div class="n64-modal__hint">Default keyboard layout — plug in a controller for the best experience</div>
        <svg viewBox="0 0 480 220" width="100%" class="n64-controller-svg">

          <!-- Controller body — GCN oval shape -->
          <ellipse cx="240" cy="130" rx="195" ry="80" fill="var(--color-bg-elevated,#eee)" stroke="var(--color-border,#ccc)" stroke-width="1.5"/>
          <!-- Center grip bump -->
          <ellipse cx="240" cy="145" rx="55" ry="38" fill="var(--color-bg-surface,#f0f0f0)" stroke="var(--color-border,#ccc)" stroke-width="1"/>

          <!-- ── LEFT SIDE: D-pad + L trigger ── -->
          <!-- D-pad cross -->
          <rect x="92" y="118" width="32" height="10" rx="3" fill="var(--color-bg-overlay,#ddd)" stroke="var(--color-border-strong,#bbb)" stroke-width="1"/>
          <rect x="103" y="107" width="10" height="32" rx="3" fill="var(--color-bg-overlay,#ddd)" stroke="var(--color-border-strong,#bbb)" stroke-width="1"/>
          <text x="108" y="111" text-anchor="middle" font-size="6.5" fill="var(--color-text-muted,#999)" font-family="monospace">↑</text>
          <text x="108" y="134" text-anchor="middle" font-size="6.5" fill="var(--color-text-muted,#999)" font-family="monospace">↓</text>
          <text x="93"  y="126" text-anchor="middle" font-size="6.5" fill="var(--color-text-muted,#999)" font-family="monospace">←</text>
          <text x="123" y="126" text-anchor="middle" font-size="6.5" fill="var(--color-text-muted,#999)" font-family="monospace">→</text>
          <text x="108" y="148" text-anchor="middle" font-size="7.5" fill="var(--color-text-secondary,#666)">D-Pad</text>

          <!-- L trigger -->
          <rect x="70" y="68" width="52" height="12" rx="4" fill="#555" stroke="#333" stroke-width="1"/>
          <text x="96"  y="77" text-anchor="middle" font-size="7" fill="#fff" font-family="monospace">L-Shift</text>
          <text x="96"  y="65" text-anchor="middle" font-size="7.5" fill="var(--color-text-secondary,#666)">L</text>

          <!-- ── CENTER: Start ── -->
          <ellipse cx="240" cy="118" rx="10" ry="10" fill="#222" stroke="#111" stroke-width="1"/>
          <text x="240" y="121" text-anchor="middle" font-size="6" fill="#fff" font-family="sans-serif">START</text>
          <text x="240" y="107" text-anchor="middle" font-size="7.5" fill="var(--color-text-secondary,#666)">Enter</text>

          <!-- ── LEFT ANALOG STICK (WASD) ── -->
          <circle cx="172" cy="112" r="16" fill="var(--color-bg-overlay,#ddd)" stroke="var(--color-border,#bbb)" stroke-width="1.5"/>
          <circle cx="172" cy="112" r="8"  fill="var(--color-bg-base,#fff)"    stroke="var(--color-border,#bbb)" stroke-width="1"/>
          <text x="172" y="93"  text-anchor="middle" font-size="7" fill="var(--color-text-muted,#999)" font-family="monospace">W</text>
          <text x="172" y="134" text-anchor="middle" font-size="7" fill="var(--color-text-muted,#999)" font-family="monospace">S</text>
          <text x="151" y="115" text-anchor="middle" font-size="7" fill="var(--color-text-muted,#999)" font-family="monospace">A</text>
          <text x="193" y="115" text-anchor="middle" font-size="7" fill="var(--color-text-muted,#999)" font-family="monospace">D</text>
          <text x="172" y="145" text-anchor="middle" font-size="7.5" fill="var(--color-text-secondary,#666)">L-Stick</text>

          <!-- ── RIGHT ANALOG C-STICK (arrow keys) ── -->
          <circle cx="282" cy="145" r="13" fill="#e6c619" stroke="#c9a800" stroke-width="1.5"/>
          <circle cx="282" cy="145" r="6"  fill="#d4b200" stroke="#c9a800" stroke-width="1"/>
          <text x="282" y="128" text-anchor="middle" font-size="7" fill="#7a5500" font-family="monospace">↑</text>
          <text x="282" y="165" text-anchor="middle" font-size="7" fill="#7a5500" font-family="monospace">↓</text>
          <text x="264" y="148" text-anchor="middle" font-size="7" fill="#7a5500" font-family="monospace">←</text>
          <text x="300" y="148" text-anchor="middle" font-size="7" fill="#7a5500" font-family="monospace">→</text>
          <text x="282" y="168" text-anchor="middle" font-size="7.5" fill="var(--color-text-secondary,#666)">C-Stick</text>

          <!-- ── RIGHT FACE BUTTONS ── -->
          <!-- A — green, largest -->
          <circle cx="370" cy="125" r="14" fill="#1a9e3f" stroke="#0f7a2c" stroke-width="1"/>
          <text x="370" y="128" text-anchor="middle" font-size="9" fill="#fff" font-weight="bold" font-family="sans-serif">A</text>
          <text x="370" y="108" text-anchor="middle" font-size="7" fill="var(--color-text-muted,#999)" font-family="monospace">Space</text>

          <!-- B — red -->
          <circle cx="348" cy="143" r="10" fill="#d63a1a" stroke="#b02a10" stroke-width="1"/>
          <text x="348" y="147" text-anchor="middle" font-size="8" fill="#fff" font-weight="bold" font-family="sans-serif">B</text>
          <text x="340" y="160" text-anchor="middle" font-size="7" fill="var(--color-text-muted,#999)" font-family="monospace">L-Alt</text>

          <!-- X — grey -->
          <circle cx="388" cy="107" r="10" fill="var(--color-bg-overlay,#ddd)" stroke="var(--color-border-strong,#bbb)" stroke-width="1"/>
          <text x="388" y="111" text-anchor="middle" font-size="8" fill="var(--color-text-primary,#222)" font-weight="bold" font-family="sans-serif">X</text>
          <text x="400" y="100" text-anchor="middle" font-size="7" fill="var(--color-text-muted,#999)" font-family="monospace">Z</text>

          <!-- Y — grey -->
          <circle cx="354" cy="107" r="10" fill="var(--color-bg-overlay,#ddd)" stroke="var(--color-border-strong,#bbb)" stroke-width="1"/>
          <text x="354" y="111" text-anchor="middle" font-size="8" fill="var(--color-text-primary,#222)" font-weight="bold" font-family="sans-serif">Y</text>
          <text x="342" y="100" text-anchor="middle" font-size="7" fill="var(--color-text-muted,#999)" font-family="monospace">X</text>

          <!-- R trigger -->
          <rect x="358" y="68" width="52" height="12" rx="4" fill="#555" stroke="#333" stroke-width="1"/>
          <text x="384" y="77" text-anchor="middle" font-size="7" fill="#fff" font-family="monospace">L-Ctrl</text>
          <text x="384" y="65" text-anchor="middle" font-size="7.5" fill="var(--color-text-secondary,#666)">R</text>

          <!-- Z trigger (shoulder) -->
          <rect x="295" y="62" width="36" height="10" rx="3" fill="#777" stroke="#555" stroke-width="1"/>
          <text x="313" y="70" text-anchor="middle" font-size="6.5" fill="#fff" font-family="monospace">L-Win</text>
          <text x="313" y="58" text-anchor="middle" font-size="7.5" fill="var(--color-text-secondary,#666)">Z</text>

          <text x="240" y="22" text-anchor="middle" font-size="10" font-weight="500" fill="var(--color-text-primary,#111)">Keyboard Controls (Dolphin defaults)</text>
        </svg>
      </div>

      <!-- HOTKEYS TAB -->
      <div class="n64-tab-panel" id="n64-tab-hotkeys" style="display:none">
        <div class="n64-modal__hotkeys">
          <div class="n64-hk-group">
            <div class="n64-hk-title">Emulator</div>
            <div class="n64-hk-row"><kbd>Esc</kbd><span>Stop game</span></div>
            <div class="n64-hk-row"><kbd>F10</kbd><span>Pause / Resume</span></div>
            <div class="n64-hk-row"><kbd>Alt+F4</kbd><span>Quit Dolphin</span></div>
            <div class="n64-hk-row"><kbd>F11</kbd><span>Fullscreen toggle</span></div>
          </div>
          <div class="n64-hk-group">
            <div class="n64-hk-title">Save states</div>
            <div class="n64-hk-row"><kbd>F1–F8</kbd><span>Load slot 1–8</span></div>
            <div class="n64-hk-row"><kbd>Shift+F1–F8</kbd><span>Save slot 1–8</span></div>
            <div class="n64-hk-row"><kbd>F9</kbd><span>Screenshot</span></div>
          </div>
        </div>
        <div class="n64-modal__hint" style="margin-top:12px">
          Dolphin has a full settings menu — use <strong>Options → Controller Settings</strong> to configure any controller.
        </div>
      </div>

      <div class="n64-modal__actions">
        <button class="n64-modal__cancel">Cancel</button>
        <button class="n64-modal__launch">Launch Game</button>
      </div>

    </div>
  `;

  document.body.appendChild(overlay);

  overlay.querySelectorAll('.n64-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      overlay.querySelectorAll('.n64-tab').forEach(t => t.classList.remove('n64-tab--active'));
      tab.classList.add('n64-tab--active');
      overlay.querySelectorAll('.n64-tab-panel').forEach(p => p.style.display = 'none');
      overlay.querySelector(`#n64-tab-${tab.dataset.tab}`).style.display = '';
    });
  });

  overlay.querySelector('.n64-modal__launch').addEventListener('click', () => {
    overlay.remove();
    document.dispatchEvent(new CustomEvent('game:launch', {
      bubbles: true,
      detail: { gameId: game.id, romPath: game.rom_path, core: null, native: 'dolphin' }
    }));
  });

  overlay.querySelector('.n64-modal__cancel').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  const onKey = (e) => {
    if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', onKey); }
    if (e.key === 'Enter')  { overlay.querySelector('.n64-modal__launch').click(); document.removeEventListener('keydown', onKey); }
  };
  document.addEventListener('keydown', onKey);
}

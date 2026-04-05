// input/gamepad.js
// Gamepad API wrapper — hot-plug detection, polling, and button state.
// EmulatorJS handles its own controller input natively, so this module
// is used for CARTRIDGE-level shortcuts (save state, load state, exit).

'use strict';

const POLL_INTERVAL_MS = 100; // How often to check controller buttons

// CARTRIDGE shortcut button combos (using standard gamepad layout)
// These fire when held together for one poll cycle.
const SHORTCUTS = {
  // Select + Start = exit to library
  exit:      [8, 9],   // Select + Start
  // Select + R1 = save state
  saveState: [8, 5],   // Select + RB
  // Select + L1 = load state
  loadState: [8, 4],   // Select + LB
};

let _pollTimer   = null;
let _lastButtons = {}; // gamepad index → button bitmask

/**
 * Starts polling for gamepad shortcut combos.
 * @param {{ onExit, onSaveState, onLoadState }} handlers
 */
function startPolling(handlers) {
  stopPolling();

  window.addEventListener('gamepadconnected',    _onConnect);
  window.addEventListener('gamepaddisconnected', _onDisconnect);

  _pollTimer = setInterval(() => _poll(handlers), POLL_INTERVAL_MS);
}

/**
 * Stops polling and removes event listeners.
 */
function stopPolling() {
  clearInterval(_pollTimer);
  _pollTimer = null;
  _lastButtons = {};
  window.removeEventListener('gamepadconnected',    _onConnect);
  window.removeEventListener('gamepaddisconnected', _onDisconnect);
}

function _onConnect(e) {
  console.info(`[gamepad] Connected: ${e.gamepad.id}`);
}

function _onDisconnect(e) {
  console.info(`[gamepad] Disconnected: ${e.gamepad.id}`);
  delete _lastButtons[e.gamepad.index];
}

function _poll(handlers) {
  const gamepads = navigator.getGamepads();

  for (const gp of gamepads) {
    if (!gp) continue;

    const pressed = new Set(
      gp.buttons
        .map((b, i) => (b.pressed ? i : -1))
        .filter(i => i !== -1)
    );

    // Check each shortcut — fire only on fresh press (not held)
    const prev = _lastButtons[gp.index] ?? new Set();

    for (const [action, combo] of Object.entries(SHORTCUTS)) {
      const allPressed  = combo.every(i => pressed.has(i));
      const wasPressed  = combo.every(i => prev.has(i));

      if (allPressed && !wasPressed) {
        handlers[action]?.();
      }
    }

    _lastButtons[gp.index] = pressed;
  }
}

export { startPolling, stopPolling };

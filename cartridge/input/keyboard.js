// input/keyboard.js
// Keyboard shortcut handler for CARTRIDGE-level in-game actions.
// Reads bindings from keyMap.js — fully remappable by the user.

'use strict';

import { getMap } from './keyMap.js';

let _handler = null;

/**
 * Starts listening for keyboard shortcuts.
 * @param {{ onExit, onSaveState, onLoadState }} handlers
 */
function startListening(handlers) {
  stopListening();

  _handler = (e) => {
    const map = getMap();

    if (e.key === map.saveState) {
      e.preventDefault();
      handlers.onSaveState?.();
    } else if (e.key === map.loadState) {
      e.preventDefault();
      handlers.onLoadState?.();
    } else if (e.key === map.exit) {
      e.preventDefault();
      handlers.onExit?.();
    } else if (e.key === 'F11') {
      e.preventDefault();
      handlers.onFullscreen?.();
    }
  };

  window.addEventListener('keydown', _handler);
}

/**
 * Stops listening for shortcuts.
 */
function stopListening() {
  if (_handler) {
    window.removeEventListener('keydown', _handler);
    _handler = null;
  }
}

export { startListening, stopListening };

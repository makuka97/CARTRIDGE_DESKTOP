// input/keyMap.js
// Manages the CARTRIDGE keyboard shortcut map.
// Default bindings live here. User remaps are persisted via the IPC input:setMap API.

'use strict';

// Default shortcut bindings — action → key
const DEFAULT_MAP = {
  saveState: 'F5',
  loadState: 'F9',
  exit:      'Escape',
};

// Human-readable labels for each action
const ACTION_LABELS = {
  saveState: 'Save State',
  loadState: 'Load State',
  exit:      'Exit to Library',
};

let _currentMap = { ...DEFAULT_MAP };

/**
 * Loads the key map from the main process (persisted in DB).
 * Falls back to defaults if nothing is stored.
 * @returns {Promise<void>}
 */
async function loadMap() {
  try {
    const stored = await window.api.getInputMap();
    if (stored && Object.keys(stored).length > 0) {
      _currentMap = { ...DEFAULT_MAP, ...stored };
    }
  } catch {
    _currentMap = { ...DEFAULT_MAP };
  }
}

/**
 * Saves the current key map to the main process.
 * @returns {Promise<void>}
 */
async function saveMap() {
  await window.api.setInputMap(_currentMap);
}

/**
 * Returns the current key map.
 * @returns {Record<string, string>}
 */
function getMap() {
  return { ..._currentMap };
}

/**
 * Updates a single binding.
 * @param {string} action
 * @param {string} key
 */
function setBinding(action, key) {
  _currentMap[action] = key;
}

/**
 * Resets all bindings to defaults.
 */
function resetToDefaults() {
  _currentMap = { ...DEFAULT_MAP };
}

/**
 * Returns human-readable label for an action.
 * @param {string} action
 * @returns {string}
 */
function getLabel(action) {
  return ACTION_LABELS[action] ?? action;
}

/**
 * Returns all actions in display order.
 * @returns {string[]}
 */
function getActions() {
  return Object.keys(DEFAULT_MAP);
}

export { loadMap, saveMap, getMap, setBinding, resetToDefaults, getLabel, getActions, DEFAULT_MAP };

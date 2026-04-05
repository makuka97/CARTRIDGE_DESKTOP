// main/window.js
// BrowserWindow configuration — frameless, minimum 1280x800.
// Uses a custom 'cartridge://' protocol instead of webSecurity:false
// so the app runs without administrator privileges.

'use strict';

const { BrowserWindow, protocol, net } = require('electron');
const path = require('path');
const url  = require('url');
const fs   = require('fs');

/**
 * Registers the cartridge:// protocol for serving local files.
 * This replaces webSecurity:false — files are served safely via protocol handler.
 * Must be called before app.whenReady().
 */
function registerProtocol() {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: 'cartridge',
      privileges: {
        standard:       true,
        secure:         true,
        supportFetchAPI: true,
        bypassCSP:      true,
        stream:         true,
      }
    }
  ]);
}

/**
 * Handles cartridge:// requests by reading from the local filesystem.
 * cartridge://local/path/to/file → reads that absolute path from disk
 */
function handleProtocol() {
  protocol.handle('cartridge', (request) => {
    const filePath = decodeURIComponent(
      request.url.replace('cartridge://local/', '')
    );
    // Normalize Windows paths
    const normalized = filePath.replace(/\//g, path.sep);
    return net.fetch(url.pathToFileURL(normalized).toString());
  });
}

/**
 * Creates and returns the main application window.
 * @returns {BrowserWindow}
 */
function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 640,

    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#1a1d2e',

    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // No webSecurity:false — protocol handler makes this unnecessary
    },

    show: false,
  });

  win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

  win.once('ready-to-show', () => win.show());

  return win;
}

module.exports = { createWindow, registerProtocol, handleProtocol };

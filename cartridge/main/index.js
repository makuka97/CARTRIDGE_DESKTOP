// main/index.js
// Application entry point.

'use strict';

const { app } = require('electron');
const { createWindow, registerProtocol, handleProtocol } = require('./window');
const { registerHandlers } = require('./ipc');

// Must be called before app is ready
registerProtocol();
registerHandlers();

app.whenReady().then(async () => {
  // Register file protocol handler
  handleProtocol();

  // COOP/COEP headers enable SharedArrayBuffer (needed for N64 threaded core)
  const { session } = require('electron');
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Cross-Origin-Opener-Policy':   ['same-origin'],
        'Cross-Origin-Embedder-Policy': ['require-corp'],
      }
    });
  });

  // Initialize database
  await require('../db/db').init();

  createWindow();

  app.on('activate', () => {
    const { BrowserWindow } = require('electron');
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

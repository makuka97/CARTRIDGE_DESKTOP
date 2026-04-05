// main/ipc.js
// Registers all ipcMain handlers.

'use strict';

const { ipcMain, BrowserWindow, app } = require('electron');
const path = require('path');
const fs   = require('fs');

function getCredsPath() {
  return path.join(app.getPath('userData'), 'scraper-creds.json');
}

function getScraperCredentials() {
  try {
    const raw = fs.readFileSync(getCredsPath(), 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function registerHandlers() {

  // ── Window controls ───────────────────────────────────────────────────────
  ipcMain.on('window:minimize', (e) => BrowserWindow.fromWebContents(e.sender)?.minimize());
  ipcMain.on('window:maximize', (e) => {
    const win = BrowserWindow.fromWebContents(e.sender);
    if (!win) return;
    win.isMaximized() ? win.unmaximize() : win.maximize();
  });
  ipcMain.on('window:close', (e) => BrowserWindow.fromWebContents(e.sender)?.close());

  // ── App root path ─────────────────────────────────────────────────────────
  ipcMain.on('app:getPath', (e) => {
    e.returnValue = path.resolve(__dirname, '..');
  });

  ipcMain.on('app:getMupenDir', (e) => {
    const bin = getMupenBinPath();
    e.returnValue = bin ? path.dirname(bin) : null;
  });

  // ── File reading (for InputAutoCfg.ini etc) ───────────────────────────────
  ipcMain.handle('fs:readTextFile', (_event, filePath) => {
    try { return fs.readFileSync(filePath, 'utf8'); }
    catch { return null; }
  });

  // ── ROM import ────────────────────────────────────────────────────────────
  ipcMain.handle('rom:import', async (event, filePath) => {
    const { importRom } = require('../rom/importer');
    const result = await importRom(filePath);

    if (result.game && !result.duplicate) {
      // Create save folder for this game immediately on import
      const saveDir = path.join(app.getPath('userData'), 'saves', result.game.id);
      fs.mkdirSync(saveDir, { recursive: true });

      const { scrape } = require('../rom/scraper');
      const creds = getScraperCredentials();
      if (creds) {
        console.info(`[ipc] Scraping "${result.game.name}" via SteamGridDB`);
        scrape(result.game, creds, (updates) => {
          const { updateBoxart, updateMeta } = require('../db/library');
          if (updates.boxart) updateBoxart(updates.id, updates.boxart, updates.crc32 ?? null);
          if (updates.name || updates.year) updateMeta(updates.id, updates);
          const win = BrowserWindow.fromWebContents(event.sender);
          win?.webContents.send('game:metaUpdated', updates);
        });
      } else {
        console.info('[ipc] No scraper credentials set — open Settings to add them');
      }
    }

    return result;
  });

  // ── Scraper credentials ───────────────────────────────────────────────────
  ipcMain.handle('scraper:getCredentials', () => getScraperCredentials());

  ipcMain.handle('scraper:setCredentials', (_event, { apiKey }) => {
    fs.writeFileSync(getCredsPath(), JSON.stringify({ apiKey }));
    return { ok: true };
  });

  ipcMain.handle('scraper:clearCredentials', () => {
    try { fs.unlinkSync(getCredsPath()); } catch {}
    return { ok: true };
  });

  // Bulk scrape all games missing art — respects 1200ms rate limit
  ipcMain.handle('scraper:scrapeAll', async (event) => {
    const creds = getScraperCredentials();
    if (!creds) return { ok: false, error: 'No API key configured' };
    const { getAllGames, updateBoxart, updateMeta } = require('../db/library');
    const { scrape } = require('../rom/scraper');
    const missing = getAllGames().filter(g => !g.boxart);
    console.info(`[ipc] Scraping ${missing.length} games missing art...`);
    const win = BrowserWindow.fromWebContents(event.sender);
    for (const game of missing) {
      await new Promise(resolve => {
        const timer = setTimeout(resolve, 10000);
        scrape(game, creds, (updates) => {
          clearTimeout(timer);
          if (updates.boxart) updateBoxart(updates.id, updates.boxart, updates.crc32 ?? null);
          if (updates.name || updates.year) updateMeta(updates.id, updates);
          // Notify renderer to update this tile
          win?.webContents.send('game:metaUpdated', updates);
          resolve();
        });
      });
      await new Promise(r => setTimeout(r, 500));
    }
    return { ok: true, scraped: missing.length };
  });

  // ── Library queries ───────────────────────────────────────────────────────
  ipcMain.handle('db:getAllGames', () => {
    const { getAllGames } = require('../db/library');
    return getAllGames();
  });

  ipcMain.handle('db:getBySystem', (_event, system) => {
    const { getGamesBySystem } = require('../db/library');
    return getGamesBySystem(system);
  });

  ipcMain.handle('db:deleteGames', (_event, ids) => {
    const { deleteGame } = require('../db/library');
    for (const id of ids) {
      deleteGame(id);
      // Wipe the save folder for this game
      try {
        const saveDir = path.join(app.getPath('userData'), 'saves', id);
        if (fs.existsSync(saveDir)) fs.rmSync(saveDir, { recursive: true });
      } catch {}
    }
    return { ok: true, deleted: ids.length };
  });

  // ── Game session ──────────────────────────────────────────────────────────
  ipcMain.handle('game:launch', async (event, { gameId, romPath, core, native }) => {
    if (native) {
      const { spawn } = require('child_process');
      const win = BrowserWindow.fromWebContents(event.sender);

      if (native === 'dolphin') {
        // ── Dolphin (GameCube / Wii) ────────────────────────────────────────
        const dolphinBin = getDolphinBinPath();
        if (!dolphinBin) {
          return { error: 'Dolphin not found. Download Dolphin and place Dolphin.exe in native/dolphin-win/' };
        }

        console.log('[dolphin] launching:', dolphinBin, '--exec', romPath);

        const proc = spawn(dolphinBin, ['--exec', romPath], {
          cwd:      path.dirname(dolphinBin),
          detached: true,
          shell:    false,
          stdio:    'ignore',
        });
        proc.unref();

        proc.on('error', (err) => {
          console.error('[dolphin] spawn error:', err.message);
          win?.webContents.send('game:exited', { error: err.message });
        });
        proc.on('exit', (code) => {
          console.log('[dolphin] exited with code:', code);
          win?.webContents.send('game:exited', {});
        });

        return { ok: true, pid: proc.pid };

      } else {
        // ── Mupen64Plus (N64) ───────────────────────────────────────────────
        const mupenBin = getMupenBinPath();
        if (!mupenBin) {
          return { error: 'mupen64plus not found. Run npm run download-cores.' };
        }

        const mupenDir = path.dirname(mupenBin);
        const args = [
          '--windowed',
          '--resolution', '1024x768',
          '--emumode', '2',
          '--plugindir', mupenDir,
          '--datadir',  mupenDir,
          romPath,
        ];

        console.log('[mupen] launching:', mupenBin, args.join(' '));

        const proc = spawn(mupenBin, args, {
          cwd:      mupenDir,
          detached: true,
          shell:    false,
          stdio:    'ignore',
        });
        proc.unref();

        proc.on('error', (err) => {
          console.error('[mupen] spawn error:', err.message);
          win?.webContents.send('game:exited', { error: err.message });
        });
        proc.on('exit', (code) => {
          console.log('[mupen] exited with code:', code);
          win?.webContents.send('game:exited', {});
        });

        return { ok: true, pid: proc.pid };
      }

    } else {
      return { ok: true };
    }
  });

  ipcMain.handle('game:exit',      () => ({ ok: true }));
  ipcMain.handle('game:saveState', () => ({ error: 'not_implemented' }));
  ipcMain.handle('game:loadState', () => ({ error: 'not_implemented' }));

  // Check if a game has any save files in the shared saves folder
  ipcMain.handle('game:getSaveFiles', async (_event, gameId) => {
    try {
      const { getGame } = require('../db/library');
      const game = getGame(gameId);
      const saveDir = path.join(app.getPath('userData'), 'saves');
      if (!fs.existsSync(saveDir)) return [];
      // Find state files that match this game's ROM name
      const romBase = game?.rom_path
        ? path.basename(game.rom_path).replace(/\.[^.]+$/, '')
        : null;
      return fs.readdirSync(saveDir)
        .filter(f => f.endsWith('.state') && (!romBase || f.startsWith(romBase)))
        .map(f => path.join(saveDir, f));
    } catch { return []; }
  });
  ipcMain.handle('game:getSaveDir', (_event, gameId) => {
    const saveDir = path.join(app.getPath('userData'), 'saves', gameId);
    fs.mkdirSync(saveDir, { recursive: true });
    return saveDir;
  });

  // Native save dialog — opens directly to the game's save folder
  // Native save dialog — shared saves folder
  ipcMain.handle('game:showSaveDialog', async (_event, defaultName) => {
    const { dialog } = require('electron');
    const saveDir = path.join(app.getPath('userData'), 'saves');
    fs.mkdirSync(saveDir, { recursive: true });
    const result = await dialog.showSaveDialog({
      title: 'Save State',
      defaultPath: path.join(saveDir, defaultName || 'save.state'),
      filters: [{ name: 'Save State', extensions: ['state'] }],
      properties: ['dontAddToRecent'],
    });
    return result.canceled ? null : result.filePath;
  });

  // Native load dialog — always opens to saves folder showing all save files
  ipcMain.handle('game:showLoadDialog', async (_event) => {
    const { dialog } = require('electron');
    const saveDir = path.join(app.getPath('userData'), 'saves');
    fs.mkdirSync(saveDir, { recursive: true });

    // Use a dummy filename in defaultPath to force Windows to open the folder
    const result = await dialog.showOpenDialog({
      title: 'Load Save State',
      defaultPath: path.join(saveDir, 'open.state'),
      filters: [{ name: 'Save State', extensions: ['state'] }],
      properties: ['openFile'],
    });
    return result.canceled ? null : result.filePaths[0];
  });

  // Write state data to a file path
  ipcMain.handle('game:writeState', (_event, filePath, base64) => {
    try {
      const buffer = Buffer.from(base64, 'base64');
      fs.writeFileSync(filePath, buffer);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  // Read state data from a file path
  ipcMain.handle('game:readState', (_event, filePath) => {
    try {
      if (!fs.existsSync(filePath)) return null;
      return fs.readFileSync(filePath).toString('base64');
    } catch {
      return null;
    }
  });


  ipcMain.handle('input:getMap', () => ({}));
  ipcMain.handle('input:setMap', () => ({ ok: true }));
}

function getAutoSavePath(gameId) {
  return path.join(app.getPath('userData'), 'autosaves', `${gameId}.state`);
}

function getMupenBinPath() {
  const { app } = require('electron');
  const base = app.isPackaged
    ? path.join(process.resourcesPath, 'mupen64plus')
    : path.join(__dirname, '..', 'native', `mupen64plus-${process.platform === 'win32' ? 'win' : process.platform === 'darwin' ? 'mac' : 'linux'}`);

  const bin = process.platform === 'win32'
    ? path.join(base, 'mupen64plus-ui-console.exe')
    : path.join(base, 'mupen64plus');

  try { fs.accessSync(bin, fs.constants.X_OK); return bin; } catch { return null; }
}

function getDolphinBinPath() {
  const { app } = require('electron');
  const base = app.isPackaged
    ? path.join(process.resourcesPath, 'dolphin')
    : path.join(__dirname, '..', 'native', `dolphin-${process.platform === 'win32' ? 'win' : process.platform === 'darwin' ? 'mac' : 'linux'}`);

  const bin = process.platform === 'win32'
    ? path.join(base, 'Dolphin.exe')
    : process.platform === 'darwin'
    ? path.join(base, 'Dolphin.app', 'Contents', 'MacOS', 'Dolphin')
    : path.join(base, 'dolphin-emu');

  try { fs.accessSync(bin, fs.constants.X_OK); return bin; } catch { return null; }
}

module.exports = { registerHandlers };

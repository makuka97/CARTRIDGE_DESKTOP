// rom/scraper.js
// Fetches box art from SteamGridDB — free API key, no account required beyond signup.
// Searches by game name, downloads the best matching grid image.

'use strict';

const https = require('https');
const fs    = require('fs');
const path  = require('path');

// SteamGridDB platform IDs for retro systems
const PLATFORM_IDS = {
  nes:       '49',
  snes:      '35',
  gba:       '12',
  gbc:       '12',
  gb:        '12',
  genesis:   '36',
  atari2600: '75',
  atari7800: '75',
};

// ── Main scrape function ──────────────────────────────────────────────────────

/**
 * Scrapes box art for a game from SteamGridDB.
 * @param {{ id, name, system, rom_path }} game
 * @param {{ apiKey: string }} credentials
 * @param {Function} onComplete — called with { id, boxart }
 */
async function scrape(game, credentials, onComplete) {
  try {
    if (!credentials?.apiKey) {
      console.warn('[scraper] No SteamGridDB API key configured');
      return;
    }

    console.info(`[scraper] Searching SteamGridDB for: "${game.name}"`);

    // Step 1: Search for the game by name
    const searchName = cleanName(game.name);
    const searchUrl  = `https://www.steamgriddb.com/api/v2/search/autocomplete/${encodeURIComponent(searchName)}`;
    const searchData = await httpsGetJson(searchUrl, credentials.apiKey);

    if (!searchData?.data?.length) {
      console.info(`[scraper] No results for: "${game.name}"`);
      return;
    }

    const gameResult = searchData.data[0];
    const sgdbId     = gameResult.id;
    console.info(`[scraper] Found: "${gameResult.name}" (id: ${sgdbId})`);

    // Step 2: Get grids (box art) for this game
    const gridsUrl  = `https://www.steamgriddb.com/api/v2/grids/game/${sgdbId}?dimensions=600x900,342x482,660x930&mime=png,jpg`;
    const gridsData = await httpsGetJson(gridsUrl, credentials.apiKey);

    if (!gridsData?.data?.length) {
      console.info(`[scraper] No grid art found for: "${game.name}"`);
      return;
    }

    // Pick the first (highest rated) image
    const grid    = gridsData.data[0];
    const imgUrl  = grid.url;
    const format  = imgUrl.split('.').pop().split('?')[0] || 'jpg';

    // Step 3: Download and cache
    const boxartPath = await downloadBoxArt(imgUrl, game.id, format);
    console.info(`[scraper] Art saved for "${game.name}": ${boxartPath}`);
    onComplete({ id: game.id, boxart: boxartPath });

  } catch (err) {
    console.warn(`[scraper] Failed for "${game.name}":`, err.message);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function cleanName(name) {
  // Strip region tags like (USA), (Rev 1), [!] etc.
  return name
    .replace(/\s*\(.*?\)/g, '')
    .replace(/\s*\[.*?\]/g, '')
    .trim();
}

function httpsGetJson(url, apiKey) {
  return new Promise((resolve, reject) => {
    const opts = {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'User-Agent': 'CARTRIDGE/0.3.0',
      }
    };
    https.get(url, opts, (res) => {
      if (res.statusCode === 401) return reject(new Error('Invalid API key'));
      if (res.statusCode === 429) return reject(new Error('Rate limit hit'));
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Failed to parse response')); }
      });
    }).on('error', reject);
  });
}

function getBoxartDir() {
  let base;
  try {
    const { app } = require('electron');
    base = path.join(app.getPath('userData'), 'boxart');
  } catch {
    base = path.join(__dirname, '..', 'resources', 'data', 'boxart');
  }
  fs.mkdirSync(base, { recursive: true });
  return base;
}

async function downloadBoxArt(url, gameId, format) {
  const dir      = getBoxartDir();
  const filePath = path.join(dir, `${gameId}.${format}`);
  if (fs.existsSync(filePath)) {
    console.info(`[scraper] Cache hit for ${gameId}`);
    return filePath;
  }
  await downloadFile(url, filePath);
  return filePath;
}

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    https.get(url, { headers: { 'User-Agent': 'CARTRIDGE/0.3.0' } }, (res) => {
      // Follow redirects
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        fs.unlinkSync(destPath);
        return downloadFile(res.headers.location, destPath).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        try { fs.unlinkSync(destPath); } catch {}
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', (err) => {
      try { fs.unlinkSync(destPath); } catch {}
      reject(err);
    });
  });
}

module.exports = { scrape };

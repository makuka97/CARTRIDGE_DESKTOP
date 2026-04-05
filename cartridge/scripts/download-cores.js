// scripts/download-cores.js
// Downloads EmulatorJS runtime + cores for offline use.
// N64: mupen64plus must be placed manually — see instructions printed below.
// Run once:  node scripts/download-cores.js

'use strict';

const https        = require('https');
const fs           = require('fs');
const path         = require('path');

const BASE_URL = 'https://cdn.emulatorjs.org/stable/data';
const OUT_DIR  = path.join(__dirname, '..', 'emulator', 'data');

const FILES = [
  'loader.js',
  'emulator.min.js',
  'emulator.min.css',
  'localization/en-US.json',
  'compression/extract7z.js',
  'cores/reports/fceumm.json',
  'cores/reports/snes9x.json',
  'cores/reports/mgba.json',
  'cores/reports/genesis_plus_gx.json',
  'cores/reports/stella2014.json',
  'cores/reports/prosystem.json',
  'cores/reports/smsplus.json',
  'cores/reports/handy.json',
  'cores/reports/beetle_vb.json',
  'cores/reports/mednafen_pce.json',
  'cores/reports/mednafen_ngp.json',
  'cores/reports/mednafen_wswan.json',
  'cores/reports/gearcoleco.json',
  'cores/fceumm-wasm.data',
  'cores/fceumm-legacy-wasm.data',
  'cores/snes9x-wasm.data',
  'cores/snes9x-legacy-wasm.data',
  'cores/mgba-wasm.data',
  'cores/mgba-legacy-wasm.data',
  'cores/genesis_plus_gx-wasm.data',
  'cores/genesis_plus_gx-legacy-wasm.data',
  'cores/stella2014-wasm.data',
  'cores/stella2014-legacy-wasm.data',
  'cores/prosystem-wasm.data',
  'cores/prosystem-legacy-wasm.data',

  // ── Sega Master System — smsplus ──────────────────────────────────────────
  'cores/smsplus-wasm.data',
  'cores/smsplus-legacy-wasm.data',

  // ── Atari Lynx — handy ────────────────────────────────────────────────────
  'cores/handy-wasm.data',
  'cores/handy-legacy-wasm.data',

  // ── Virtual Boy — beetle_vb ───────────────────────────────────────────────
  'cores/beetle_vb-wasm.data',
  'cores/beetle_vb-legacy-wasm.data',

  // ── TurboGrafx-16 / PC Engine — mednafen_pce ──────────────────────────────
  'cores/mednafen_pce-wasm.data',
  'cores/mednafen_pce-legacy-wasm.data',

  // ── Neo Geo Pocket — mednafen_ngp ─────────────────────────────────────────
  'cores/mednafen_ngp-wasm.data',
  'cores/mednafen_ngp-legacy-wasm.data',

  // ── WonderSwan — mednafen_wswan ───────────────────────────────────────────
  'cores/mednafen_wswan-wasm.data',
  'cores/mednafen_wswan-legacy-wasm.data',

  // ── ColecoVision — gearcoleco ─────────────────────────────────────────────
  'cores/gearcoleco-wasm.data',
  'cores/gearcoleco-legacy-wasm.data',
];

function downloadFile(url, destPath) {
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    const request = (u) => {
      https.get(u, { headers: { 'User-Agent': 'CARTRIDGE/0.4' } }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          file.close();
          fs.truncateSync(destPath, 0);
          return request(res.headers.location);
        }
        if (res.statusCode !== 200) {
          file.close();
          try { fs.unlinkSync(destPath); } catch {}
          return reject(new Error(`HTTP ${res.statusCode}`));
        }
        res.pipe(file);
        file.on('finish', () => file.close(resolve));
        file.on('error', reject);
      }).on('error', (err) => {
        try { fs.unlinkSync(destPath); } catch {}
        reject(err);
      });
    };
    request(url);
  });
}

function printMupenInstructions() {
  const dest = path.join(__dirname, '..', 'native', 'mupen64plus-win');
  const bin  = path.join(dest, 'mupen64plus-ui-console.exe');

  console.log('\n── Mupen64Plus (N64 native core) ─────────────────────');

  if (fs.existsSync(bin)) {
    console.log(`  ✓ found  mupen64plus-ui-console.exe`);
    return;
  }

  console.log(`
  N64 requires mupen64plus — one-time manual setup:

  1. Download:
     https://github.com/mupen64plus/mupen64plus-core/releases/download/2.6.0/mupen64plus-bundle-win64-2.6.0.zip

  2. Extract the zip — you'll get a folder with these files inside:
       mupen64plus-ui-console.exe
       mupen64plus.dll
       mupen64plus-audio-sdl.dll
       mupen64plus-input-sdl.dll  (etc.)

  3. Copy ALL those files into:
       ${dest}

  4. Re-run:  npm run download-cores
     You should then see:  ✓ found  mupen64plus-ui-console.exe
  `);
}

async function main() {
  console.log('CARTRIDGE — Downloading EmulatorJS cores\n');
  console.log(`Destination: ${OUT_DIR}\n`);

  let downloaded = 0, skipped = 0, failed = 0;

  for (const file of FILES) {
    const url      = `${BASE_URL}/${file}`;
    const destPath = path.join(OUT_DIR, file);

    if (fs.existsSync(destPath)) {
      console.log(`  ✓ skip   ${file}`);
      skipped++;
      continue;
    }

    process.stdout.write(`  ↓ fetch  ${file} ... `);
    try {
      await downloadFile(url, destPath);
      const size = (fs.statSync(destPath).size / 1024).toFixed(0);
      console.log(`done (${size} KB)`);
      downloaded++;
    } catch (err) {
      console.log(`FAILED — ${err.message}`);
      failed++;
    }
  }

  console.log(`\n─────────────────────────────────`);
  console.log(`Downloaded: ${downloaded}  Skipped: ${skipped}  Failed: ${failed}`);

  if (failed > 0) {
    console.log('\n⚠  Some files failed. Re-run to retry.');
    process.exit(1);
  }

  console.log('\n✓  EmulatorJS cores ready.');
  printMupenInstructions();
  console.log('\n✓  All done.');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });

// Dolphin instructions (auto-download not feasible — official site only)
function printDolphinInstructions() {
  const dest = path.join(__dirname, '..', 'native', 'dolphin-win');
  const bin  = path.join(dest, 'Dolphin.exe');

  console.log('\n── Dolphin (GameCube / Wii) ───────────────────────────');

  if (fs.existsSync(bin)) {
    console.log('  ✓ found  Dolphin.exe');
    return;
  }

  console.log(`
  GameCube & Wii require Dolphin — one-time manual setup:

  1. Download the latest Dolphin Windows x64 from:
     https://dolphin-emu.org/download/

  2. Extract the zip — you will get a folder containing:
       Dolphin.exe  (and various DLLs)

  3. Copy ALL those files into:
       ${dest}

  4. Re-run:  npm run download-cores
     You should then see:  ✓ found  Dolphin.exe
  `);
}

printDolphinInstructions();

// scripts/test-scraper.js
// Standalone test — run this to verify your ScreenScraper credentials work.
// Usage:  node scripts/test-scraper.js <username> <password>

'use strict';

const https = require('https');
const path  = require('path');
const fs    = require('fs');

const username = process.argv[2];
const password = process.argv[3];

if (!username || !password) {
  console.log('Usage: node scripts/test-scraper.js <username> <password>');
  console.log('Example: node scripts/test-scraper.js myuser mypass123');
  process.exit(1);
}

console.log(`\nTesting ScreenScraper credentials for: ${username}\n`);

// Test 1: Check credentials with a simple server info call
const infoUrl = `https://api.screenscraper.fr/api2/ssuserInfos.php?devid=${encodeURIComponent(username)}&devpassword=${encodeURIComponent(password)}&softname=cartridge&ssid=${encodeURIComponent(username)}&sspassword=${encodeURIComponent(password)}&output=xml`;

console.log('Step 1: Verifying credentials...');

https.get(infoUrl, { headers: { 'User-Agent': 'CARTRIDGE/0.2' } }, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    if (data.includes('<ssid>')) {
      console.log('✓ Credentials valid!\n');
    } else if (data.includes('bad login') || data.includes('wronguser')) {
      console.log('✕ Invalid username or password');
      console.log('  → Check your credentials at screenscraper.fr');
      process.exit(1);
    } else if (data.includes('errno')) {
      const err = data.match(/<errno>([^<]+)/)?.[1];
      console.log(`✕ API error: ${err}`);
      process.exit(1);
    } else {
      console.log('? Unexpected response:');
      console.log(data.slice(0, 300));
    }

    // Test 2: Try scraping a known game
    console.log('Step 2: Scraping Sonic The Hedgehog 2 (Genesis)...');

    const gameUrl = `https://api.screenscraper.fr/api2/jeuInfos.php?devid=${encodeURIComponent(username)}&devpassword=${encodeURIComponent(password)}&softname=cartridge&ssid=${encodeURIComponent(username)}&sspassword=${encodeURIComponent(password)}&systemeid=1&romnom=Sonic%20The%20Hedgehog%202%20(World).md&output=xml`;

    https.get(gameUrl, { headers: { 'User-Agent': 'CARTRIDGE/0.2' } }, (res2) => {
      let data2 = '';
      res2.on('data', chunk => data2 += chunk);
      res2.on('end', () => {
        if (data2.includes('<jeu ')) {
          const name = data2.match(/<nom region="us">([^<]+)/)?.[1]
                    || data2.match(/<nom [^>]*>([^<]+)/)?.[1];
          const boxUrl = data2.match(/type="box-2D"[^>]*region="us"[^>]*>([^<]+)/)?.[1]
                      || data2.match(/type="box-2D"[^>]*>([^<]+)/)?.[1];
          console.log(`✓ Game found: ${name}`);
          console.log(`✓ Box art URL: ${boxUrl ? 'found' : 'not found'}`);
          console.log('\n✓ Scraper is working! Box art will appear when you drop ROMs.');

          // Save credentials to the userData location
          const credsPath = path.join(__dirname, '..', 'resources', 'data', 'scraper-creds.json');
          const dir = path.dirname(credsPath);
          fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(credsPath, JSON.stringify({ username, password }));
          console.log(`\nCredentials saved to: ${credsPath}`);
          console.log('Restart CARTRIDGE and drop a ROM to test.');

        } else if (data2.includes('errno')) {
          const err = data2.match(/<errno>([^<]+)/)?.[1];
          console.log(`✕ Game lookup error: ${err}`);
        } else {
          console.log('? No game data returned');
          console.log(data2.slice(0, 300));
        }
      });
    }).on('error', (err) => {
      console.log(`✕ Network error: ${err.message}`);
    });
  });
}).on('error', (err) => {
  console.log(`✕ Network error: ${err.message}`);
});

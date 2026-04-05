# CARTRIDGE — Changelog

---

## v0.4.0 — March 2026

### New Features

**Box Art Scraper**
- Automatic cover art fetching powered by SteamGridDB
- Art is downloaded on ROM import and cached locally — fully offline after first fetch
- Go to Settings → enter your free SteamGridDB API key → art appears on every tile
- "Scrape All Missing Art" button retroactively fetches art for your entire library
- Art is cached by game ID — same ROM never downloaded twice

**Save State File System**
- Save and load states now use EmulatorJS's native file system — reliable across all cores
- Each system (NES, SNES, GBA, Genesis, Atari) handles save states correctly
- Save dialog opens to your saves folder — organize files however you like
- Load dialog opens to the same folder — pick any save file you've created

### Improvements
- DevTools removed from production build — clean window with no debug panels
- Library tiles display box art thumbnails pulled from local cache
- Settings UI updated — single API key field replaces username/password fields
- Scraper uses CRC32 hash for accurate ROM identification (where supported)

### Supported Systems
- NES (.nes)
- SNES (.smc, .snes, .sfc)
- Game Boy Advance (.gba)
- Game Boy Color (.gbc)
- Game Boy (.gb)
- Sega Genesis (.md, .gen, .smd, .bin)
- Atari 2600 (.a26)
- Atari 7800 (.a78)

---

## v0.2.0 — Early 2026

### New Features
- Drag-and-drop ROM import (batch supported)
- Auto-detect system from file extension
- Game library with search and system filter
- Fullscreen on game launch (F11 toggle)
- ESC exits to library
- Keyboard remapping
- Bluetooth/USB controller support
- Multi-select delete (saves deleted with ROMs)
- Custom cartridge:// protocol (no admin rights needed)
- Windows installer — per-user, no UAC prompt

---

## v0.1.0 — Initial Release

- Basic EmulatorJS integration
- NES, SNES, GBA support
- Simple ROM library

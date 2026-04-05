# Building CARTRIDGE

## Development

```bash
npm install
npm run download-cores
npm start
```

## Building a distributable installer

### Windows (.exe installer)
```bash
npm install
npm run build
```
Output: `dist/CARTRIDGE Setup 0.4.0.exe`

### macOS (.dmg)
```bash
npm install
npm run build:mac
```
Output: `dist/CARTRIDGE-0.4.0.dmg`

### Linux (.AppImage)
```bash
npm install
npm run build:linux
```
Output: `dist/CARTRIDGE-0.4.0.AppImage`

## What the installer includes
- The full CARTRIDGE app
- All EmulatorJS cores (NES, SNES, GBA, GBC, GB, Genesis, Atari 2600/7800)
- No internet connection required after install
- Box art cache is stored in AppData — not bundled with the app

## Setup after install
1. Launch CARTRIDGE
2. Drag and drop ROMs into the library
3. Open Settings → enter your free SteamGridDB API key for box art
4. Get a free API key at: https://www.steamgriddb.com/profile/preferences/api

## First-time build notes
- electron-builder downloads Electron binaries (~150MB) on first build
- Subsequent builds are fast
- The `dist/` folder is gitignored

## App icon
Before building, generate icon.png from assets/icon.svg:
```bash
npx svgexport assets/icon.svg assets/icon.png 256:256
```
Or use any image editor to export the SVG as a 256x256 PNG.
electron-builder converts PNG → ICO automatically for Windows.

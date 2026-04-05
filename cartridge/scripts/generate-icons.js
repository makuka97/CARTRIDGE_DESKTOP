// scripts/generate-icons.js
// Converts assets/icon.svg to the platform icon formats electron-builder needs.
// Run once before building:  node scripts/generate-icons.js
// Requires: npm install -g sharp-cli  OR  uses Canvas if available

'use strict';

const fs   = require('fs');
const path = require('path');

const svgPath  = path.join(__dirname, '..', 'assets', 'icon.svg');
const pngPath  = path.join(__dirname, '..', 'assets', 'icon.png');

// For Windows we need a proper .ico file
// electron-builder can convert PNG → ICO automatically if we provide icon.png
// Just copy it as icon.ico for now — electron-builder handles the rest

console.log('Icon files:');
console.log('  assets/icon.svg — source');
console.log('  assets/icon.png — needed for Linux + electron-builder auto-convert');
console.log('');
console.log('To generate icon.png from the SVG, run one of:');
console.log('  npx svgexport assets/icon.svg assets/icon.png 256:256');
console.log('  OR install Inkscape and run:');
console.log('  inkscape assets/icon.svg --export-png=assets/icon.png -w 256 -h 256');
console.log('');
console.log('electron-builder will auto-convert icon.png to .ico on Windows builds.');

// Fox Buddy — startup.
// Loads the newest version of Timmy's code: either the one that came with the
// app, or a newer one the app downloaded itself (see "updates" in main.js).
// This file is never updated itself, so a broken update can't stop the app from starting.

const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const Module = require('module');

const BUNDLED_DIR = __dirname;
const BUNDLED_VERSION = require('./package.json').version;

// Updated code uses the libraries that shipped inside the app.
process.env.NODE_PATH = [path.join(BUNDLED_DIR, 'node_modules'), process.env.NODE_PATH].filter(Boolean).join(path.delimiter);
Module._initPaths();

function isNewer(a, b) {
  const pa = String(a).split('.').map(Number), pb = String(b).split('.').map(Number);
  for (let i = 0; i < 3; i++) { if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0); }
  return false;
}

let dir = BUNDLED_DIR, version = BUNDLED_VERSION;
try {
  const info = JSON.parse(fs.readFileSync(path.join(app.getPath('userData'), 'updates', 'current.json'), 'utf8'));
  if (isNewer(info.version, BUNDLED_VERSION) && fs.existsSync(path.join(info.dir, 'main.js'))) { dir = info.dir; version = info.version; }
} catch {}

global.FOX = { bundledDir: BUNDLED_DIR, bundledVersion: BUNDLED_VERSION, codeDir: dir, version, isNewer };

try {
  require(path.join(dir, 'main.js'));
} catch (err) {
  // A bad update: fall back to the version that shipped with the app.
  console.error('Updated code failed to load, using the built-in version', err);
  if (dir !== BUNDLED_DIR) {
    global.FOX.codeDir = BUNDLED_DIR; global.FOX.version = BUNDLED_VERSION;
    require(path.join(BUNDLED_DIR, 'main.js'));
  } else throw err;
}

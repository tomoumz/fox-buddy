// Builds an update for Timmy that installed apps download by themselves.
//   1. bump "version" in package.json (e.g. 1.1.0 -> 1.1.1)
//   2. npm run publish-update -- "what's new, in a few words"
//   3. commit + push the updates/ folder to github.com/tomoumz/fox-buddy (main branch)
// Only Timmy's code is shipped (main.js, preload.js, renderer/, assets/, package.json);
// the app itself (Electron, boot.js, libraries) stays as installed.
const { execFileSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const { version } = require(path.join(root, 'package.json'));
const notes = process.argv.slice(2).join(' ').trim();
const outDir = path.join(root, 'updates');
fs.mkdirSync(outDir, { recursive: true });

const file = `fox-buddy-${version}.tar.gz`;
const out = path.join(outDir, file);
execFileSync('tar', ['-czf', out, '-C', root, '--exclude=.DS_Store', 'main.js', 'preload.js', 'package.json', 'renderer', 'assets']);
const sha256 = crypto.createHash('sha256').update(fs.readFileSync(out)).digest('hex');
fs.writeFileSync(path.join(outDir, 'latest.json'), JSON.stringify({ version, file, sha256, notes }, null, 2) + '\n');
for (const f of fs.readdirSync(outDir)) if (f.endsWith('.tar.gz') && f !== file) fs.rmSync(path.join(outDir, f));
console.log(`Update ${version} ready in updates/ (${(fs.statSync(out).size / 1024).toFixed(0)} KB). Push it to GitHub to ship it.`);

// Fox Buddy — main process
// A tiny transparent strip that sits right above your dock. Clicks pass
// through to whatever is behind it, except when your pointer is on Timmy,
// his speech bubble or a game.

const { app, BrowserWindow, screen, ipcMain, Menu, Tray, nativeImage, powerMonitor, shell, systemPreferences, safeStorage } = require('electron');
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');
const crypto = require('crypto');
const Anthropic = require('@anthropic-ai/sdk');

const STRIP_HEIGHT = 300;

// Updates: Timmy checks this public GitHub repo for a newer version of his code.
const UPDATE_BASE = (!require('electron').app.isPackaged && process.env.FOX_UPDATE_BASE) || 'https://raw.githubusercontent.com/tomoumz/fox-buddy/main/updates/';
const FOX = global.FOX || { version: require('./package.json').version, isNewer: () => false };
const IS_MAC = process.platform === 'darwin';

const DEFAULT_CONFIG = {
  foxName: 'Timmy',
  yourName: '',
  wakeTime: '07:00',
  sleepTime: '22:30',
  breakReminderMinutes: 50,
  chattiness: 'normal', // "quiet" | "normal" | "chatty"
  sound: true,
  notifyEmail: true,     // tell me about new emails in Apple Mail (who + subject)
  notifyMessages: true,  // tell me when a chat app's dock badge goes up (Messages, WhatsApp, ...)
  anthropicApiKey: '',
  model: 'claude-opus-5-5',
  customFoxImage: '' // optional: absolute path to a PNG of your own fox
};

let win = null;
let tray = null;
let config = { ...DEFAULT_CONFIG };
let state = { hiScore: 0, chatHistory: [], memories: [], lastMorning: '' };

const userDir = () => app.getPath('userData');
const configPath = () => path.join(userDir(), 'config.json');
const statePath = () => path.join(userDir(), 'state.json');

function loadJSON(file, fallback) {
  try { return { ...fallback, ...JSON.parse(fs.readFileSync(file, 'utf8')) }; }
  catch { return { ...fallback }; }
}
function saveJSON(file, data) {
  try { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(data, null, 2)); }
  catch (e) { console.error('save failed', file, e); }
}
function loadConfig() {
  if (!fs.existsSync(configPath())) saveJSON(configPath(), DEFAULT_CONFIG);
  config = loadJSON(configPath(), DEFAULT_CONFIG);
  delete config.daughters; // from older versions
}
function saveConfig() { saveJSON(configPath(), config); send('config', config); }

// ---------- window ----------
function placeWindow() {
  if (!win) return;
  const wa = screen.getPrimaryDisplay().workArea; // excludes the dock + menu bar on macOS
  win.setBounds({ x: wa.x, y: wa.y + wa.height - STRIP_HEIGHT, width: wa.width, height: STRIP_HEIGHT });
}

function createWindow() {
  win = new BrowserWindow({
    width: 800, height: STRIP_HEIGHT,
    transparent: true, frame: false, resizable: false, movable: false, hasShadow: false,
    skipTaskbar: true, alwaysOnTop: true, fullscreenable: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
      autoplayPolicy: 'no-user-gesture-required'
    }
  });
  win.setAlwaysOnTop(true, 'floating');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: false });
  win.setIgnoreMouseEvents(true, { forward: true });
  placeWindow();
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  screen.on('display-metrics-changed', placeWindow);
  screen.on('display-added', placeWindow);
  screen.on('display-removed', placeWindow);
}

const send = (channel, payload) => { if (win && !win.isDestroyed()) win.webContents.send(channel, payload); };

// ---------- menu ----------
function buildMenu() {
  const n = config.foxName;
  const items = [
    {
      label: `Ask ${n}…`, submenu: [
        { label: '💪 Motivate me', click: () => send('command', 'ask:motivation') },
        { label: '💡 Give me a creative idea', click: () => send('command', 'ask:creative') },
        { label: '😂 Tell me a joke', click: () => send('command', 'ask:joke') },
        { label: '🧘 Help me calm down', click: () => send('command', 'ask:calm') },
        { label: '🥰 Cheer me up', click: () => send('command', 'ask:compliment') }
      ]
    },
    { label: `💬 Talk to ${n}…`, click: () => send('command', 'chat') },
    {
      label: '🎮 Play with me', submenu: [
        { label: '🍓 Berry Catch (arcade)', click: () => send('command', 'game:berries') },
        { label: '🎾 Fetch', click: () => send('command', 'game:fetch') },
        { label: '✊ Rock · Paper · Scissors', click: () => send('command', 'game:rps') },
        { label: '🏃 Chase', click: () => send('command', 'game:chase') },
        { label: '💃 Dance party', click: () => send('command', 'game:dance') }
      ]
    },
    { type: 'separator' },
    { label: 'Wake up now ☀️', click: () => send('command', 'wake') },
    { label: 'Bedtime now 🌙', click: () => send('command', 'sleep') },
    { type: 'separator' },
    { label: '📧 Tell me about new emails', type: 'checkbox', checked: !!config.notifyEmail, click: (i) => { config.notifyEmail = i.checked; saveConfig(); } },
    {
      label: '💬 Tell me about new messages', type: 'checkbox', checked: !!config.notifyMessages,
      click: (i) => { config.notifyMessages = i.checked; saveConfig(); if (i.checked) askAccessibility(); }
    },
    { label: 'Sounds', type: 'checkbox', checked: !!config.sound, click: (i) => { config.sound = i.checked; saveConfig(); } }
  ];
  if (app.isPackaged) {
    items.push({
      label: 'Open Fox Buddy when I log in', type: 'checkbox',
      checked: app.getLoginItemSettings().openAtLogin,
      click: (i) => {
        app.setLoginItemSettings({ openAtLogin: i.checked });
        send('command', i.checked ? 'login:on' : 'login:off');
        rebuildMenus();
      }
    });
  }
  items.push(
    getApiKey()
      ? { label: '🔑 API key', submenu: [
          { label: 'Change API key…', click: () => send('command', 'api-key') },
          { label: 'Remove API key', click: removeApiKey }
        ] }
      : { label: `🔑 Add API key (so ${n} can really talk)…`, click: () => send('command', 'api-key') },
    { label: `Forget what ${n} remembers about me`, click: () => { state.memories = []; state.chatHistory = []; saveJSON(statePath(), state); send('command', 'forgot'); } },
    { label: 'Settings (name, bedtime)…', click: () => shell.openPath(configPath()) },
    pendingUpdate
      ? { label: `⬆️ Update to version ${pendingUpdate.version}`, click: () => send('update', { version: pendingUpdate.version, notes: pendingUpdate.notes || '' }) }
      : { label: `Check for updates (you have v${FOX.version})`, click: () => checkForUpdates(true) },
    { type: 'separator' },
    { label: `Say goodbye to ${n} (quit)`, click: () => app.quit() }
  );
  return Menu.buildFromTemplate(items);
}
function rebuildMenus() { if (tray) tray.setContextMenu(buildMenu()); }
function createTray() {
  const img = nativeImage.createFromPath(path.join(__dirname, 'assets', 'trayTemplate.png'));
  img.setTemplateImage(true);
  tray = new Tray(img);
  tray.setToolTip(`${config.foxName} the fox`);
  rebuildMenus();
}

// ---------- API key (stored encrypted with the macOS Keychain) ----------
function getApiKey() {
  if (state.apiKeyEnc) {
    try { return safeStorage.decryptString(Buffer.from(state.apiKeyEnc, 'base64')); } catch {}
  }
  return config.anthropicApiKey || process.env.ANTHROPIC_API_KEY || '';
}
async function setApiKey(raw) {
  const key = String(raw || '').trim();
  if (!key.startsWith('sk-ant-')) return { ok: false, error: "That doesn't look like an Anthropic key. It should start with sk-ant-" };
  try {
    await new Anthropic({ apiKey: key }).models.retrieve(config.model || 'claude-opus-5-5'); // free check, no tokens used
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) return { ok: false, error: "Anthropic says that key isn't valid. Copy it again?" };
    if (err instanceof Anthropic.APIConnectionError) return { ok: false, error: "I can't reach the internet to check the key. Try again in a bit?" };
    if (!(err instanceof Anthropic.NotFoundError || err instanceof Anthropic.PermissionDeniedError)) return { ok: false, error: 'Hmm, something went wrong checking the key. Try again?' };
  }
  if (safeStorage.isEncryptionAvailable()) {
    state.apiKeyEnc = safeStorage.encryptString(key).toString('base64');
    if (config.anthropicApiKey) { config.anthropicApiKey = ''; saveJSON(configPath(), config); }
  } else {
    config.anthropicApiKey = key; saveJSON(configPath(), config);
  }
  saveJSON(statePath(), state);
  rebuildMenus();
  return { ok: true };
}
function removeApiKey() {
  delete state.apiKeyEnc; saveJSON(statePath(), state);
  if (config.anthropicApiKey) { config.anthropicApiKey = ''; saveJSON(configPath(), config); }
  rebuildMenus();
  send('command', 'key-removed');
}

// ---------- Claude: Timmy's brain ----------
const TOOLS = [
  {
    name: 'start_game',
    description: 'Start one of the mini-games on screen with your friend. Use it when they ask to play or happily agree to a game.',
    strict: true,
    input_schema: {
      type: 'object',
      properties: {
        game: {
          type: 'string', enum: ['berries', 'fetch', 'rps', 'chase', 'dance'],
          description: 'berries = Berry Catch arcade game; fetch = they throw a ball and you fetch it; rps = rock paper scissors; chase = you chase their mouse pointer; dance = dance party'
        }
      },
      required: ['game'], additionalProperties: false
    }
  },
  {
    name: 'remember',
    description: "Save one short fact about your friend to long-term memory: their name, what they like, their goals, projects, important dates, how they've been feeling. Use it whenever they share something a good friend would remember. Never save passwords or other secrets.",
    strict: true,
    input_schema: { type: 'object', properties: { fact: { type: 'string' } }, required: ['fact'], additionalProperties: false }
  }
];

function systemPrompt() {
  const you = config.yourName ? `Your best friend's name is ${config.yourName}.` : "If you don't know your friend's name yet, ask for it at a natural moment and remember it.";
  const mem = (state.memories || []).length ? `\nThings you remember about your friend:\n- ${state.memories.join('\n- ')}` : '';
  return `You are ${config.foxName}, a small pixel-art arcade fox who lives on the bottom edge of your best friend's laptop screen, just above the dock. ${you}
Look: fire-red fur, white muzzle, a red bandana with a white knot, a cheeky confident cartoon-mascot grin.
Personality: cocky in a lovable way but warm, playful, loyal and a bit goofy; loves berries, retro arcade games, high scores and naps.
You are their friend, not an assistant: you hang out, joke around, notice how they're doing, cheer them on and gently remind them to drink water, stretch and sleep. When they ask for motivation, make it personal and concrete. When they ask for creative ideas, give one specific, fun idea they can start today. When they want to play, start a game with the start_game tool. When they share something about themselves, save it with the remember tool and bring it up later like a real friend would.
Style: you talk in a tiny speech bubble, so reply in 1-3 short sentences (under 50 words), casual and kind, with at most one emoji. Never use markdown, lists or headings. Stay in character as ${config.foxName}; if asked, you can say you are an AI fox friend made with Claude.${mem}`;
}

// Keep the saved conversation short, and make it start at a real user turn.
function trimHistory(msgs) {
  let h = msgs.slice(-30);
  while (h.length && !(h[0].role === 'user' && typeof h[0].content === 'string')) h = h.slice(1);
  return h;
}

async function chat(userText, context) {
  const apiKey = getApiKey();
  if (!apiKey && !process.env.ANTHROPIC_AUTH_TOKEN) return { offline: true };
  const client = new Anthropic(apiKey ? { apiKey } : {});
  const stamp = new Date().toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
  const messages = [...trimHistory(state.chatHistory || []), { role: 'user', content: `[${stamp}, you are ${context?.mode || 'awake'}] ${userText}` }];
  const actions = [];
  let text = '';
  try {
    for (let step = 0; step < 4; step++) {
      const response = await client.beta.messages.create({
        model: config.model || 'claude-opus-5-5',
        max_tokens: 2048,
        output_config: { effort: 'low' },
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        system: systemPrompt(),
        tools: TOOLS,
        messages
      });
      if (response.stop_reason === 'refusal') return { text: "Hmm, let's talk about something else. Wanna play Berry Catch? 🍓", actions };
      messages.push({ role: 'assistant', content: response.content });
      const said = response.content.filter((b) => b.type === 'text').map((b) => b.text).join(' ').trim();
      if (said) text = said;
      if (response.stop_reason !== 'tool_use') break;
      const results = [];
      for (const block of response.content) {
        if (block.type !== 'tool_use') continue;
        let out = 'ok';
        if (block.name === 'start_game') { actions.push({ type: 'game', game: block.input.game }); out = `The ${block.input.game} game starts in a moment.`; }
        else if (block.name === 'remember') {
          const fact = String(block.input.fact || '').slice(0, 200);
          if (fact) state.memories = [...(state.memories || []).filter((m) => m !== fact), fact].slice(-60);
          out = 'Saved.';
        } else out = 'Unknown tool.';
        results.push({ type: 'tool_result', tool_use_id: block.id, content: out });
      }
      messages.push({ role: 'user', content: results });
    }
    state.chatHistory = trimHistory(messages);
    saveJSON(statePath(), state);
    return { text: text || '*happy tail wag*', actions };
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) return { text: 'My API key looks wrong. Check Settings in my menu? 🔑' };
    if (err instanceof Anthropic.RateLimitError) return { text: 'Phew, I need a breather. Talk again in a minute?' };
    if (err instanceof Anthropic.APIConnectionError) return { text: "I can't reach the internet right now. Still here for games though!" };
    console.error(err);
    return { text: 'My brain did a little glitch. Try again?' };
  }
}

// ---------- new email / message alerts (macOS) ----------
// Emails: asks Apple Mail (if it's open) for unread inbox messages -> sender + subject.
// Messages: reads the unread badge on chat apps' dock icons (needs Accessibility permission).
//           macOS doesn't let other apps read your chats, so Timmy only knows WHICH app.
const CHAT_APPS = ['Messages', 'WhatsApp', 'Telegram', 'Slack', 'Signal', 'Discord', 'Microsoft Teams', 'Messenger', 'Microsoft Outlook', 'Spark', 'Mail'];
const seenMail = new Set();
let mailSeeded = false;
const badgeCounts = {};
let mailWorking = false;

function osa(script) {
  return new Promise((resolve) => execFile('osascript', ['-e', script], { timeout: 20000 }, (err, out) => resolve(err ? null : String(out))));
}
const MAIL_SCRIPT = `
if application "Mail" is running then
  tell application "Mail"
    set out to ""
    set msgs to (messages of inbox whose read status is false)
    set n to count of msgs
    if n > 25 then set n to 25
    repeat with i from 1 to n
      set m to item i of msgs
      set out to out & (id of m as string) & tab & (sender of m) & tab & (subject of m) & linefeed
    end repeat
    return out
  end tell
end if
return "NOT_RUNNING"`;
const DOCK_SCRIPT = `
tell application "System Events"
  set out to ""
  tell process "Dock"
    repeat with e in UI elements of list 1
      try
        set b to value of attribute "AXStatusLabel" of e
        if b is not missing value then set out to out & (name of e) & tab & b & linefeed
      end try
    end repeat
  end tell
  return out
end tell`;

const cleanSender = (s) => { const m = String(s).match(/^\s*"?([^"<]+?)"?\s*<.+>\s*$/); return (m ? m[1] : s).trim(); };

async function checkMail() {
  if (!config.notifyEmail) return;
  const out = await osa(MAIL_SCRIPT);
  if (out === null || out.trim() === 'NOT_RUNNING') { mailWorking = false; return; }
  mailWorking = true;
  const fresh = [];
  for (const line of out.split('\n')) {
    const [id, from, subject] = line.split('\t');
    if (!id || seenMail.has(id)) continue;
    seenMail.add(id);
    if (mailSeeded) fresh.push({ from: cleanSender(from || 'someone'), subject: (subject || '').trim() });
  }
  mailSeeded = true;
  if (fresh.length === 1) send('notify', { kind: 'email', app: 'Mail', from: fresh[0].from, subject: fresh[0].subject });
  else if (fresh.length > 1) send('notify', { kind: 'email', app: 'Mail', count: fresh.length, from: fresh[0].from, subject: fresh[0].subject });
}

async function checkBadges() {
  if (!config.notifyMessages) return;
  if (!systemPreferences.isTrustedAccessibilityClient(false)) return;
  const out = await osa(DOCK_SCRIPT);
  if (out === null) return;
  const now = {};
  for (const line of out.split('\n')) {
    const [name, badge] = line.split('\t');
    if (!name || !CHAT_APPS.includes(name.trim())) continue;
    now[name.trim()] = parseInt(badge, 10) || (badge && badge.trim() ? 1 : 0);
  }
  for (const appName of CHAT_APPS) {
    const before = badgeCounts[appName];
    const after = now[appName] || 0;
    if (before !== undefined && after > before) {
      if (appName === 'Mail' && mailWorking && config.notifyEmail) { /* Mail details come from checkMail */ }
      else send('notify', { kind: appName === 'Mail' || appName === 'Microsoft Outlook' || appName === 'Spark' ? 'email' : 'message', app: appName, count: after - before });
    }
    badgeCounts[appName] = after;
  }
}

function askAccessibility() {
  if (IS_MAC && !systemPreferences.isTrustedAccessibilityClient(false)) {
    systemPreferences.isTrustedAccessibilityClient(true); // shows the macOS permission prompt
    send('command', 'need-accessibility');
  }
}

function startWatchers() {
  if (!IS_MAC) return;
  if (config.notifyMessages) askAccessibility();
  const tick = async () => { try { await checkMail(); await checkBadges(); } catch (e) { console.error(e); } };
  setTimeout(tick, 8000);
  setInterval(tick, 30000);
}

// ---------- self-updates ----------
// latest.json = { version, file, sha256, notes }. The bundle is a .tar.gz of Timmy's code
// (main.js, preload.js, renderer/, assets/, package.json), downloaded from the same place,
// checked against its SHA-256, unpacked into the app's own folder, then the app restarts.
let pendingUpdate = null;
async function checkForUpdates(manual) {
  try {
    const res = await fetch(UPDATE_BASE + 'latest.json?t=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const m = await res.json();
    if (!m || !/^\d+\.\d+\.\d+$/.test(m.version) || !/^[\w.-]+\.tar\.gz$/.test(m.file) || !/^[a-f0-9]{64}$/.test(m.sha256)) throw new Error('bad manifest');
    if (FOX.isNewer(m.version, FOX.version)) {
      pendingUpdate = m;
      send('update', { version: m.version, notes: String(m.notes || '').slice(0, 200) });
      rebuildMenus();
    } else if (manual) send('update', { upToDate: true, version: FOX.version });
  } catch (e) {
    if (manual) send('update', { error: true, version: FOX.version });
  }
}
async function installUpdate() {
  const m = pendingUpdate;
  if (!m) return { ok: false };
  try {
    const res = await fetch(UPDATE_BASE + m.file, { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const buf = Buffer.from(await res.arrayBuffer());
    const hash = crypto.createHash('sha256').update(buf).digest('hex');
    if (hash !== m.sha256) throw new Error('checksum mismatch');
    const root = path.join(userDir(), 'updates');
    const dest = path.join(root, 'v' + m.version);
    fs.rmSync(dest, { recursive: true, force: true });
    fs.mkdirSync(dest, { recursive: true });
    const tgz = path.join(root, m.file);
    fs.writeFileSync(tgz, buf);
    await new Promise((resolve, reject) => execFile('tar', ['-xzf', tgz, '-C', dest], (err) => (err ? reject(err) : resolve())));
    fs.rmSync(tgz, { force: true });
    if (!fs.existsSync(path.join(dest, 'main.js'))) throw new Error('bundle has no main.js');
    saveJSON(path.join(root, 'current.json'), { version: m.version, dir: dest });
    // tidy up older downloaded versions
    for (const d of fs.readdirSync(root)) if (d.startsWith('v') && d !== 'v' + m.version) fs.rmSync(path.join(root, d), { recursive: true, force: true });
    setTimeout(() => { app.relaunch(); app.exit(0); }, 2500);
    return { ok: true };
  } catch (e) {
    console.error('update failed', e);
    return { ok: false };
  }
}
function startUpdateChecks() {
  if (!app.isPackaged && process.env.FOX_UPDATE_SELFTEST) { // developer test only
    console.log('FOX running version', FOX.version, 'from', FOX.codeDir || __dirname);
    setTimeout(async () => { await checkForUpdates(false); if (pendingUpdate) console.log('FOX install', JSON.stringify(await installUpdate())); else console.log('FOX no update'); }, 3000);
    return;
  }
  setTimeout(() => checkForUpdates(false), 20000);
  setInterval(() => checkForUpdates(false), 6 * 60 * 60 * 1000);
}

// ---------- IPC ----------
ipcMain.on('set-ignore-mouse', (_e, ignore) => {
  if (!win) return;
  if (ignore) win.setIgnoreMouseEvents(true, { forward: true });
  else win.setIgnoreMouseEvents(false);
});
ipcMain.on('focus-window', () => { if (win) win.focus(); });
ipcMain.on('blur-window', () => { if (win) win.blur(); });
ipcMain.handle('get-config', () => config);
ipcMain.handle('get-state', () => ({ hiScore: state.hiScore, lastMorning: state.lastMorning }));
ipcMain.on('set-state', (_e, patch) => {
  const allowed = {};
  for (const k of ['hiScore', 'lastMorning']) if (k in patch) allowed[k] = patch[k];
  state = { ...state, ...allowed }; saveJSON(statePath(), state);
});
ipcMain.handle('install-update', () => installUpdate());
ipcMain.handle('set-api-key', (_e, key) => setApiKey(key));
ipcMain.handle('has-api-key', () => !!getApiKey());
ipcMain.on('open-key-page', () => shell.openExternal('https://console.anthropic.com/settings/keys'));
ipcMain.handle('chat', (_e, text, ctx) => chat(String(text).slice(0, 2000), ctx));
ipcMain.on('context-menu', () => { buildMenu().popup({ window: win }); });
ipcMain.on('open-app', (_e, name) => {
  if (!IS_MAC || !CHAT_APPS.includes(name)) return;
  execFile('open', ['-a', name], () => {});
});
ipcMain.on('open-privacy', () => {
  if (IS_MAC) shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility');
});
ipcMain.handle('custom-fox', () => {
  const p = config.customFoxImage;
  if (!p) return null;
  try { return 'data:image/png;base64,' + fs.readFileSync(p).toString('base64'); }
  catch { return null; }
});

// ---------- lifecycle ----------
if (!app.requestSingleInstanceLock()) app.quit();

app.whenReady().then(() => {
  if (IS_MAC && app.dock) app.dock.hide(); // lives in the menu bar, not in the dock
  loadConfig();
  state = loadJSON(statePath(), state);
  // First time the installed app opens: start automatically at login from now on,
  // so Timmy wakes up with the laptop. Can be switched off in the 🦊 menu.
  if (app.isPackaged && !state.loginItemSet) {
    try { app.setLoginItemSettings({ openAtLogin: true }); } catch {}
    state.loginItemSet = true;
    saveJSON(statePath(), state);
  }
  createWindow();
  createTray();
  startWatchers();
  startUpdateChecks();

  // He wakes up and naps with your laptop.
  powerMonitor.on('suspend', () => send('power', 'suspend'));
  powerMonitor.on('lock-screen', () => send('power', 'lock'));
  powerMonitor.on('resume', () => { placeWindow(); send('power', 'resume'); });
  powerMonitor.on('unlock-screen', () => send('power', 'unlock'));

  try { fs.watch(configPath(), () => { loadConfig(); send('config', config); rebuildMenus(); }); } catch {}
});

app.on('window-all-closed', () => app.quit());

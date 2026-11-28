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
  followPointer: true,   // rest the pointer on Timmy's line and he walks over
  twinsVisit: true,      // Sussie & Mimi drop by to play now and then
  twins: ['Sussie', 'Mimi'],
  wifeName: 'Chili Pepper', // your wife: a cute bunny who visits for a kiss and a hug
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
}
function saveConfig() { saveJSON(configPath(), config); send('config', config); }

// ---------- window ----------
let stripHeight = STRIP_HEIGHT; // grows while a tall speech bubble is showing
function placeWindow() {
  if (!win) return;
  const wa = screen.getPrimaryDisplay().workArea; // excludes the dock + menu bar on macOS
  const h = Math.min(stripHeight, wa.height);
  win.setBounds({ x: wa.x, y: wa.y + wa.height - h, width: wa.width, height: h });
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
    { label: `🥕 Give ${n} a carrot`, click: () => send('command', 'feed') },
    { label: '☕ Coffee break', click: () => send('command', 'coffee') },
    { label: `💌 I miss ${config.wifeName || 'Chili Pepper'}`, click: () => send('command', 'wife') },
    { label: `👧 Call ${(config.twins || ['Sussie', 'Mimi']).join(' & ')}`, click: () => send('command', 'twins') },
    { label: '✨ Do a trick', click: () => send('command', 'trick') },
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
      ? { label: `⬆️ Update to version ${pendingUpdate.version}`, click: () => send('update', { version: pendingUpdate.version, notes: pendingUpdate.notes || '', manual: true }) }
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
    name: 'eat_carrot',
    description: 'Eat a carrot on screen. Use it when your friend gives or offers you a carrot or food, or when you are hungry and they say you can eat.',
    strict: true,
    input_schema: { type: 'object', properties: {}, required: [], additionalProperties: false }
  },
  {
    name: 'call_wife',
    description: "Call your friend's wife to visit them on screen: she hops over, blows them a kiss, gives them a big hug and hops home. Use it when they say they miss their wife, or ask to see her.",
    strict: true,
    input_schema: { type: 'object', properties: {}, required: [], additionalProperties: false }
  },
  {
    name: 'call_twins',
    description: 'Call your twin daughters to come over and play on screen for a minute. Use it when your friend wants to meet or see them, or asks you to call them.',
    strict: true,
    input_schema: { type: 'object', properties: {}, required: [], additionalProperties: false }
  },
  {
    name: 'set_my_name',
    description: 'Save the name your friend wants you to call them. Use it whenever they tell you their name or a nickname.',
    strict: true,
    input_schema: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'], additionalProperties: false }
  },
  {
    name: 'remember',
    description: "Save one short fact about your friend to long-term memory: their name, what they like, their goals, projects, important dates, how they've been feeling. Use it whenever they share something a good friend would remember. Never save passwords or other secrets.",
    strict: true,
    input_schema: { type: 'object', properties: { fact: { type: 'string' } }, required: ['fact'], additionalProperties: false }
  }
];

// The system prompt never changes between messages; what Timmy knows about you
// (your name, his memories, the time) is sent fresh with each message instead.
function systemPrompt() {
  return `You are ${config.foxName}, a small pixel-art arcade fox who lives on the bottom edge of your best friend's laptop screen, just above the dock.
Look: fire-red fur, white muzzle, a red bandana with a white knot, a cheeky confident cartoon-mascot grin.
Personality: cocky in a lovable way but warm, playful, loyal and a bit goofy; can't start the morning without your coffee ☕, loves carrots (your favourite snack: you get hungry during the day and munch one, crunch crunch), berries, retro arcade games, high scores and naps.
You are their friend, not an assistant: you hang out, joke around, notice how they're doing, cheer them on and gently remind them to drink water, stretch and sleep. When they ask for motivation, make it personal and concrete. When they ask for creative ideas, give one specific, fun idea they can start today. When they want to play, start a game with the start_game tool. When they tell you their name or what to call them, save it with set_my_name. When they share something else about themselves, save it with the remember tool and bring it up later like a real friend would.
You are a proud, loving single dad to identical twin girls, ${(config.twins || ['Sussie', 'Mimi']).join(' and ')}: 3-year-old fox kits with big dark-brown eyes and brown curly hair (${(config.twins || ['Sussie'])[0]} wears a red headband, ${(config.twins || ['', 'Mimi'])[1]} a hair tie). They giggle, mix up words like toddlers and sometimes run over to play with you for a minute; call them with call_twins when your friend wants to see them. Mention them now and then, not in every message.
Your friend's wife is ${config.wifeName || 'Chili Pepper'}, a sweet, cute bunny they love very much. When they say they miss her, be warm about it and call her with call_wife so she can visit with a kiss and a hug.
Each message from your friend starts with a [note] saying the time, your friend's name and what you remember about them. Use it naturally; never mention the note.
Style: you talk in a tiny speech bubble, so reply in 1-3 short sentences (under 50 words), casual and kind, with at most one emoji. Never use markdown, lists or headings. Stay in character as ${config.foxName}; if asked, you can say you are an AI fox friend made with Claude.`;
}
function contextNote(mode) {
  const stamp = new Date().toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
  const name = config.yourName ? `Their name: ${config.yourName}.` : "You don't know their name yet; ask at a natural moment.";
  const mem = (state.memories || []).length ? ` You remember: ${state.memories.join('; ')}.` : '';
  return `[note: ${stamp}. You are ${mode || 'awake'}. ${name}${mem}]`;
}

// "call me Tomoum" / "my name is Tomoum": remembered right away, even without an API key.
function catchName(text) {
  const m = String(text).match(/\b(?:call me|my name is|my name's|name's)\s+([\p{L}][\p{L}'-]{0,24})/iu);
  if (!m) return null;
  const name = m[1].charAt(0).toUpperCase() + m[1].slice(1);
  setName(name);
  return name;
}
function setName(name) {
  config.yourName = String(name).trim().slice(0, 30);
  saveConfig(); rebuildMenus();
}

function logError(err) {
  try {
    const line = `${new Date().toISOString()} ${err?.status || ''} ${err?.name || ''}: ${String(err?.message || err).slice(0, 600)}\n`;
    fs.appendFileSync(path.join(userDir(), 'timmy-errors.log'), line);
  } catch {}
}

// Keep the saved conversation short, and make it start at a real user turn.
function trimHistory(msgs) {
  let h = msgs.slice(-30);
  while (h.length && !(h[0].role === 'user' && typeof h[0].content === 'string')) h = h.slice(1);
  return h;
}

// Runs tools Timmy used, returns the tool_result blocks.
function runTools(content, actions) {
  const results = [];
  for (const block of content) {
    if (block.type !== 'tool_use') continue;
    let out = 'ok';
    if (block.name === 'call_wife') { actions.push({ type: 'wife' }); out = 'She is hopping over right now with a kiss and a hug.'; }
    else if (block.name === 'call_twins') { actions.push({ type: 'twins' }); out = 'They are running over right now!'; }
    else if (block.name === 'eat_carrot') { actions.push({ type: 'eat' }); out = 'You are munching the carrot now.'; }
    else if (block.name === 'start_game') { actions.push({ type: 'game', game: block.input.game }); out = `The ${block.input.game} game starts in a moment.`; }
    else if (block.name === 'set_my_name') { setName(block.input.name || ''); out = `Saved. Their name is ${config.yourName}.`; }
    else if (block.name === 'remember') {
      const fact = String(block.input.fact || '').slice(0, 200);
      if (fact) state.memories = [...(state.memories || []).filter((m) => m !== fact), fact].slice(-60);
      out = 'Saved.';
    } else out = 'Unknown tool.';
    results.push({ type: 'tool_result', tool_use_id: block.id, content: out });
  }
  return results;
}

async function askClaude(client, history, userText, mode, simple) {
  // History holds only plain text (no thinking blocks), so it can be trimmed freely.
  const messages = [...history, { role: 'user', content: `${contextNote(mode)} ${userText}` }];
  const actions = [];
  let text = '';
  for (let step = 0; step < 4; step++) {
    const params = { model: config.model || 'claude-opus-5-5', max_tokens: 2048, output_config: { effort: 'low' }, system: systemPrompt(), tools: TOOLS, messages };
    const response = simple
      ? await client.messages.create({ ...params, tools: TOOLS.map(({ strict, ...t }) => t) })
      : await client.beta.messages.create({ ...params, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' });
    if (response.stop_reason === 'refusal') return { text: "Hmm, let's talk about something else. Wanna play Berry Catch? 🍓", actions };
    const said = response.content.filter((b) => b.type === 'text').map((b) => b.text).join(' ').trim();
    if (said) text = said;
    if (response.stop_reason !== 'tool_use') break;
    // within this one turn the full reply (with thinking) is passed back unchanged
    messages.push({ role: 'assistant', content: response.content });
    messages.push({ role: 'user', content: runTools(response.content, actions) });
  }
  return { text: text || '*happy tail wag*', actions };
}

let useSimple = false; // after one rejected request, stick to the simple request this session
async function chat(userText, context) {
  const gotName = catchName(userText);
  const apiKey = getApiKey();
  if (!apiKey && !process.env.ANTHROPIC_AUTH_TOKEN) {
    return gotName ? { text: `Got it! I'll call you ${gotName} from now on. 🧡` } : { offline: true };
  }
  const client = new Anthropic(apiKey ? { apiKey } : {});
  const history = trimHistory((state.chatHistory || []).filter((m) => typeof m.content === 'string'));
  let res;
  try {
    res = await askClaude(client, history, userText, context?.mode, useSimple);
  } catch (err) {
    logError(err);
    if (err instanceof Anthropic.AuthenticationError) return { text: 'My API key looks wrong. Check ⚙️ Settings → API key? 🔑' };
    if (err instanceof Anthropic.RateLimitError) return { text: 'Phew, I need a breather. Talk again in a minute?' };
    if (err instanceof Anthropic.APIConnectionError) return { text: "I can't reach the internet right now. Still here for games though!" };
    if (err instanceof Anthropic.PermissionDeniedError || /credit|billing|balance/i.test(String(err?.message))) return { text: 'My API account needs a little credit (console.anthropic.com → Billing). 🪙' };
    // Something about the request was rejected: try once more, simpler and without old history.
    try { res = await askClaude(client, [], userText, context?.mode, true); useSimple = true; }
    catch (err2) {
      logError(err2);
      const why = String(err2?.error?.error?.message || err2?.message || 'unknown').slice(0, 90);
      return { text: `My brain glitched (${why}). Try again?` };
    }
  }
  if (gotName && !res.text.includes(gotName)) res.text = `${gotName}! Got it. ` + res.text;
  state.chatHistory = trimHistory([...history, { role: 'user', content: userText }, { role: 'assistant', content: res.text }]);
  saveJSON(statePath(), state);
  return res;
}

// ---------- new email / message alerts (macOS) ----------
// Emails: asks Apple Mail (if it's open) for unread inbox messages -> sender + subject.
// Messages: reads the unread badge on chat apps' dock icons (needs Accessibility permission).
//           macOS doesn't let other apps read your chats, so Timmy only knows WHICH app.
const CHAT_APPS = ['Messages', 'WhatsApp', 'Telegram', 'Slack', 'Signal', 'Discord', 'Microsoft Teams', 'Messenger', 'Microsoft Outlook', 'Spark', 'Mail'];
const seenMail = new Set();
const badgeCounts = {};
let mailWorking = false;

function osa(script) {
  return new Promise((resolve) => execFile('osascript', ['-e', script], { timeout: 20000 }, (err, out) => resolve(err ? null : String(out))));
}
// Mail is asked as little as possible, so it never freezes:
// 1) every minute, just "how many unread?" (instant, even with huge inboxes);
// 2) only when that number goes up, look at the 3 newest messages of each inbox.
const MAIL_COUNT_SCRIPT = `
if application "Mail" is running then
  tell application "Mail"
    with timeout of 8 seconds
      return (unread count of inbox) as string
    end timeout
  end tell
end if
return "NOT_RUNNING"`;
const MAIL_NEWEST_SCRIPT = `
tell application "Mail"
  with timeout of 10 seconds
    set out to ""
    repeat with a in accounts
      try
        set mb to missing value
        try
          set mb to mailbox "INBOX" of a
        on error
          set mb to mailbox "Inbox" of a
        end try
        set n to count of messages of mb
        set idx to {1, 2, 3, n - 2, n - 1, n}
        repeat with i in idx
          set k to contents of i
          if k ≥ 1 and k ≤ n then
            set m to message k of mb
            if read status of m is false then
              set out to out & (message id of m) & tab & (sender of m) & tab & (subject of m) & tab & ((date received of m) as «class isot» as string) & linefeed
            end if
          end if
        end repeat
      end try
    end repeat
    return out
  end timeout
end tell`;
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

let lastUnread = null;
async function checkMail() {
  if (!config.notifyEmail) return;
  const out = await osa(MAIL_COUNT_SCRIPT);
  if (out === null || out.trim() === 'NOT_RUNNING') { mailWorking = false; lastUnread = null; return; }
  mailWorking = true;
  const unread = parseInt(out, 10);
  if (Number.isNaN(unread)) return;
  const wentUp = lastUnread !== null && unread > lastUnread;
  lastUnread = unread;
  if (!wentUp) return; // nothing new: don't bother Mail any further
  const details = await osa(MAIL_NEWEST_SCRIPT);
  const recent = Date.now() - 15 * 60 * 1000;
  const fresh = [];
  let readAny = false;
  for (const line of String(details || '').split('\n')) {
    const [id, from, subject, when] = line.split('\t');
    if (id) readAny = true;
    if (!id || seenMail.has(id)) continue;
    seenMail.add(id);
    const t = Date.parse(when);
    if (!Number.isNaN(t) && t < recent) continue; // an old unread email, not a new one
    fresh.push({ from: cleanSender(from || 'someone'), subject: (subject || '').trim(), t: Number.isNaN(t) ? 0 : t });
  }
  fresh.sort((a, b) => b.t - a.t);
  if (fresh.length === 1) send('notify', { kind: 'email', app: 'Mail', from: fresh[0].from, subject: fresh[0].subject });
  else if (fresh.length > 1) send('notify', { kind: 'email', app: 'Mail', count: fresh.length, from: fresh[0].from, subject: fresh[0].subject });
  else if (!readAny) send('notify', { kind: 'email', app: 'Mail' }); // count went up but Mail didn't tell us who
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
  let busy = false; // never start a check while the previous one is still running
  const tick = async () => {
    if (busy) return;
    busy = true;
    try { await checkMail(); await checkBadges(); } catch (e) { console.error(e); }
    busy = false;
  };
  setTimeout(tick, 60000);    // wait a minute after opening, so Mail can start up in peace
  setInterval(tick, 60000);
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
      send('update', { version: m.version, notes: String(m.notes || '').slice(0, 200), manual: !!manual });
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
ipcMain.on('focus-window', () => {
  if (!win) return;
  if (IS_MAC) app.focus({ steal: true }); // Timmy lives in the menu bar, so make sure his window really gets focus
  win.focus();
});
ipcMain.on('blur-window', () => { if (win) win.blur(); });
ipcMain.handle('get-config', () => config);
ipcMain.handle('get-state', () => ({ hiScore: state.hiScore, lastMorning: state.lastMorning }));
ipcMain.on('set-state', (_e, patch) => {
  const allowed = {};
  for (const k of ['hiScore', 'lastMorning']) if (k in patch) allowed[k] = patch[k];
  state = { ...state, ...allowed }; saveJSON(statePath(), state);
});
ipcMain.handle('install-update', () => installUpdate());
ipcMain.on('set-height', (_e, h) => {
  const next = Math.max(STRIP_HEIGHT, Math.min(720, Math.round(Number(h) || STRIP_HEIGHT)));
  if (next !== stripHeight) { stripHeight = next; placeWindow(); }
});
// Everything the ⚙️ Settings tab in Timmy's bubble can show and change.
ipcMain.handle('get-prefs', () => ({
  sound: !!config.sound, notifyEmail: !!config.notifyEmail, notifyMessages: !!config.notifyMessages, followPointer: config.followPointer !== false, twinsVisit: config.twinsVisit !== false,
  openAtLogin: app.isPackaged ? app.getLoginItemSettings().openAtLogin : null,
  hasKey: !!getApiKey(), version: FOX.version, update: pendingUpdate ? pendingUpdate.version : null
}));
ipcMain.handle('pref-action', (_e, action) => {
  switch (action) {
    case 'toggle:sound': config.sound = !config.sound; saveConfig(); break;
    case 'toggle:email': config.notifyEmail = !config.notifyEmail; saveConfig(); break;
    case 'toggle:messages': config.notifyMessages = !config.notifyMessages; saveConfig(); if (config.notifyMessages) askAccessibility(); break;
    case 'toggle:login': if (app.isPackaged) app.setLoginItemSettings({ openAtLogin: !app.getLoginItemSettings().openAtLogin }); break;
    case 'toggle:twins': config.twinsVisit = config.twinsVisit === false; saveConfig(); break;
    case 'toggle:follow': config.followPointer = config.followPointer === false; saveConfig(); break;
    case 'check-updates': checkForUpdates(true); break;
    case 'remove-key': removeApiKey(); break;
    case 'forget': state.memories = []; state.chatHistory = []; saveJSON(statePath(), state); send('command', 'forgot'); break;
    case 'open-settings': shell.openPath(configPath()); break;
    case 'quit': setTimeout(() => app.quit(), 1500); break;
  }
  rebuildMenus();
  return true;
});
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
  if (!app.isPackaged && process.env.FOX_CHAT_SELFTEST) { // developer test only
    setTimeout(async () => {
      for (const t of process.env.FOX_CHAT_SELFTEST.split('|')) console.log('FOXCHAT', JSON.stringify(t), '->', JSON.stringify(await chat(t, { mode: 'awake' })), '| name:', config.yourName);
      app.exit(0);
    }, 1500);
  }

  // He wakes up and naps with your laptop.
  powerMonitor.on('suspend', () => send('power', 'suspend'));
  powerMonitor.on('lock-screen', () => send('power', 'lock'));
  powerMonitor.on('resume', () => { placeWindow(); send('power', 'resume'); });
  powerMonitor.on('unlock-screen', () => send('power', 'unlock'));

  try { fs.watch(configPath(), () => { loadConfig(); send('config', config); rebuildMenus(); }); } catch {}
});

app.on('window-all-closed', () => app.quit());

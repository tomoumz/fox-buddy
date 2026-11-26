// Fox Buddy — the little world above your dock.
(async () => {
  // When opened in a plain browser (for previews) there is no Electron bridge.
  const api = window.fox || {
    setIgnoreMouse() {}, focus() {}, blur() {}, contextMenu() {}, setState() {}, openApp() {}, openPrivacy() {}, openKeyPage() {}, installUpdate: async () => ({ ok: false }), setHeight() {}, getPrefs: async () => ({ sound: false, notifyEmail: true, notifyMessages: true, followPointer: true, openAtLogin: true, hasKey: false, version: '1.3.0', update: null }), prefAction: async () => true, setApiKey: async () => ({ ok: false, error: 'preview' }), hasApiKey: async () => false,
    on(ch, fn) { (window.__foxHandlers = window.__foxHandlers || {})[ch] = fn; },
    getConfig: async () => ({ foxName: 'Timmy', yourName: '', wakeTime: '07:00', sleepTime: '22:30', breakReminderMinutes: 50, chattiness: 'normal', sound: false }),
    getState: async () => ({ hiScore: 0, lastMorning: '' }),
    chat: async () => ({ offline: true }),
    customFox: async () => null
  };
  const { drawCarrotIcon, drawDad, drawHeart, drawBerry, drawBall, drawStarburst, outline } = window.Sprites;
  const L = window.Lines;

  let cfg = await api.getConfig();
  let st = await api.getState();

  // ---------- canvas ----------
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, GROUND = 0;
  function resize() {
    const dpr = window.devicePixelRatio || 1;
    W = window.innerWidth; H = window.innerHeight; GROUND = H - 4;
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
  }
  resize();
  window.addEventListener('resize', resize);

  const S = 3; // pixel scale — "small fun size"
  // sprite grids + 1px border on each side for the comic outline
  const DAD = { w: 46 * S, h: 36 * S };
  const dadOff = Object.assign(document.createElement('canvas'), { width: 46, height: 36 });
  const starOff = Object.assign(document.createElement('canvas'), { width: 48, height: 48 });
  const dadG = dadOff.getContext('2d', { willReadFrequently: true });
  const starG = starOff.getContext('2d');

  let customImg = null;
  async function loadCustom() {
    const url = await api.customFox();
    customImg = null;
    if (url) { const img = new Image(); img.onload = () => { customImg = img; }; img.src = url; }
  }
  loadCustom();

  // ---------- helpers ----------
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const youName = () => cfg.yourName || 'buddy';
  const fill = (s, other) => s.replace(/\{you\}/g, youName()).replace(/\{fox\}/g, cfg.foxName)
;
  const todayKey = () => new Date().toDateString();
  const hm = (s) => { const [h, m] = String(s).split(':').map(Number); return (h || 0) * 60 + (m || 0); };
  const nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
  function isSleepTime() {
    const n = nowMin(), w = hm(cfg.wakeTime), s = hm(cfg.sleepTime);
    return s > w ? (n >= s || n < w) : (n >= s && n < w);
  }
  const dayPart = () => { const h = new Date().getHours(); return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'; };

  // ---------- sound (tiny chiptune synth) ----------
  let actx = null;
  function tone(freq, dur, { type = 'square', vol = 0.035, when = 0, slide = null } = {}) {
    if (!cfg.sound) return;
    try {
      actx = actx || new AudioContext();
      const t = actx.currentTime + when;
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(actx.destination); o.start(t); o.stop(t + dur + 0.02);
    } catch {}
  }
  const sfx = {
    blip: (kid) => tone(kid ? rand(900, 1200) : rand(420, 620), 0.03, { vol: 0.02 }),
    coin: () => { tone(988, 0.07); tone(1319, 0.25, { when: 0.07 }); },
    jump: () => tone(280, 0.16, { slide: 760 }),
    hurt: () => tone(220, 0.25, { type: 'sawtooth', slide: 70, vol: 0.03 }),
    fanfare: () => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, 0.14, { when: i * 0.11 })),
    lullaby: () => [784, 659, 784, 659, 698, 587, 523].forEach((f, i) => tone(f, 0.35, { when: i * 0.38, type: 'triangle', vol: 0.05 })),
    slurp: () => { tone(300, 0.25, { type: 'triangle', vol: 0.04, slide: 520 }); tone(520, 0.12, { type: 'triangle', vol: 0.03, when: 0.25, slide: 260 }); },
    crunch: () => { tone(140, 0.05, { type: 'sawtooth', vol: 0.03 }); tone(95, 0.06, { type: 'sawtooth', vol: 0.03, when: 0.06 }); tone(180, 0.04, { type: 'square', vol: 0.02, when: 0.13 }); },
    win: () => [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, 0.1, { when: i * 0.07 })),
    dance: () => { const n = [523, 523, 784, 659, 698, 587, 659, 523]; for (let k = 0; k < 3; k++) n.forEach((f, i) => tone(f, 0.12, { when: k * 1.6 + i * 0.2 })); }
  };

  // ---------- Timmy ----------
  const dad = { star: 0, hunger: 30, carrotBites: null, coffee: 0, x: W * 0.62, jump: 0, vy: 0, dir: -1, kind: 'stand', target: null, speed: 60, frame: 0, ft: 0, eyes: 'open',
    blink: false, mouth: false, wag: 0, breath: false, carrying: false, emote: 0 };
  let mode = 'awake'; // awake | sleep | nap | coffee | eating | berries | fetch | chase | dance
  let hungryAsked = 0;
  let manualSleepUntil = 0, stayUpUntil = 0, lateWarned = 0;
  let thinkT = 3, chatterT = 40, breakT = (cfg.breakReminderMinutes || 50) * 60;
  const particles = [];

  function burst(kind, x, y, n = 1, text) {
    for (let k = 0; k < n; k++) particles.push({ kind, x: x + rand(-10, 10), y, vx: rand(-20, 20), vy: kind === 'crumb' ? rand(20, 70) : rand(-60, -30), life: kind === 'z' ? 3 : 1.6, t: 0, text });
  }

  // ---------- speech bubbles ----------
  const bubbleRoot = document.getElementById('bubbles');
  const bubbles = new Map(); // speaker -> {el, text, shown, t, life}
  function say(who, text, { buttons = null, life = null, kid = false, custom = null, menu = false } = {}) {
    const speaker = dad;
    shut(who);
    const el = document.createElement('div');
    el.className = 'bubble' + (menu || (buttons && buttons.length > 3) ? ' menu' : '');
    const name = cfg.foxName;
    el.innerHTML = `<span class="who"></span><span class="txt"></span>`;
    el.querySelector('.who').textContent = name;
    if (buttons) {
      const row = document.createElement('div'); row.className = 'btns';
      buttons.forEach(([label, fn]) => { const b = document.createElement('button'); b.textContent = label; b.onclick = (e) => { e.stopPropagation(); fn(); }; row.appendChild(b); });
      el.appendChild(row);
    }
    if (custom) custom(el);
    bubbleRoot.appendChild(el);
    const full = fill(text);
    const b = { interactive: !!(buttons || custom), el, speaker, full, shown: 0, t: 0, life: life || (buttons || custom ? 60 : Math.max(4, full.length * 0.07 + 2.5)), kid: who !== 'dad' };
    bubbles.set(who, b);
    return b;
  }
  function shut(who) { const b = bubbles.get(who); if (b) { b.el.remove(); bubbles.delete(who); } }
  function speakerTop() {
    return GROUND - (dad.kind === 'sleep' ? 50 : DAD.h - 8) - dad.jump;
  }
  // Make Timmy's strip of screen taller while a big bubble is showing, so nothing gets cut off.
  let wantH = 0, heightT = 0;
  function fitWindow(dt) {
    heightT -= dt;
    let need = 300;
    for (const [, b] of bubbles) need = Math.max(need, H - b.el.getBoundingClientRect().top + 16);
    if (chatOpen || keyOpen) need = Math.max(need, 340);
    need = Math.ceil(need / 20) * 20;
    if (need > H + 2 || (need < H - 2 && heightT <= 0)) {
      if (need !== wantH) { wantH = need; api.setHeight(need); }
      heightT = 1.5; // wait a moment before shrinking again
    }
  }
  function updateBubbles(dt) {
    for (const [who, b] of bubbles) {
      b.t += dt;
      if (b.shown < b.full.length) {
        const before = Math.floor(b.shown);
        b.shown = Math.min(b.full.length, b.shown + dt * 40);
        if (Math.floor(b.shown) !== before && before % 2 === 0 && b.full[before] !== ' ') sfx.blip(b.kid);
        b.el.querySelector('.txt').textContent = b.full.slice(0, Math.floor(b.shown));
      }
      b.speaker.mouth = b.shown < b.full.length && Math.floor(b.t * 8) % 2 === 0;
      const half = (b.el.offsetWidth || 200) / 2 + 6;
      b.el.style.left = clamp(b.speaker.x, half, W - half) + 'px';
      b.el.style.bottom = (H - speakerTop(b.speaker) + 14) + 'px';
      if (b.t > b.life) { b.speaker.mouth = false; shut(who); }
    }
  }

  // ---------- day & night ----------
  // Lines queued for a scene are dropped if the scene changes (e.g. a game starts).
  let scene = 0;
  const later = (fn, ms) => { const sc = scene; setTimeout(() => { if (sc === scene) fn(); }, ms); };
  function wakeUp(kind = 'morning') {
    scene++;
    mode = 'awake';
    dad.kind = 'stretch'; dad.eyes = 'closed';
    later(() => { if (mode === 'awake') { dad.kind = 'stand'; dad.eyes = 'open'; } }, 1600);
    dad.star = 1.4;
    if (kind === 'morning') {
      dad.hunger = Math.max(dad.hunger, 68); // wakes up ready for breakfast
      st.lastMorning = todayKey(); api.setState({ lastMorning: st.lastMorning });
      sfx.fanfare();
      later(() => drinkCoffee(), 1700);
    } else if (kind === 'back') {
      later(() => say('dad', pick(L.welcomeBack)), 700);
    } else if (kind === 'first') {
      st.lastMorning = todayKey(); api.setState({ lastMorning: st.lastMorning });
      sfx.fanfare();
      later(() => say('dad', L.firstLaunch[0]), 800);
      later(() => say('dad', L.firstLaunch[1]), 7500);
      later(async () => { if (!(await api.hasApiKey())) say('dad', 'One more thing: want me to REALLY talk with you? Add an API key. It takes one minute!', { buttons: [['🔑 Add API key', openKeyPrompt], ['Maybe later', () => shut('dad')]] }); }, 15000);
    }
    breakT = (cfg.breakReminderMinutes || 50) * 60;
    chatterT = rand(60, 120);
  }
  function goToSleep(kind = 'night') {
    endGame(true);
    scene++;
    mode = kind === 'nap' ? 'nap' : 'sleep';
    dad.coffee = 0; dad.carrotBites = null;
    if (kind !== 'nap') {
      say('dad', pick(L.goodnight), { life: 6 });
      sfx.lullaby();
    }
    later(() => {
      if (mode !== 'sleep' && mode !== 'nap') return;
      dad.kind = 'sleep'; dad.target = null;
    }, kind === 'nap' ? 300 : 3500);
  }

  // ---------- interaction / click-through ----------
  let mouse = { x: -1, y: -1, inside: false, stillSince: 0 };
  let pointerGoal = null;
  let ignoring = true;
  let drag = null;
  const chatBox = document.getElementById('chat');
  const chatInput = document.getElementById('chatInput');
  const hud = document.getElementById('hud');

  function dadRect() {
    if (customImg) { const w = DAD.h * customImg.width / customImg.height; return { x: dad.x - w / 2, y: GROUND - DAD.h - dad.jump, w, h: DAD.h }; }
    const h = dad.kind === 'sleep' ? 45 : DAD.h - 6;
    return { x: dad.x - DAD.w / 2 + 6, y: GROUND - h - dad.jump, w: DAD.w - 12, h };
  }
  const inR = (r, x, y) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  function hitAt(x, y) {
    if (inR(dadRect(), x, y)) return 'dad';
    if (fetchBall && Math.hypot(fetchBall.x - x, fetchBall.y - y) < 22) return 'ball';
    return null;
  }
  function overUI(x, y) {
    const el = document.elementFromPoint(x, y);
    return !!(el && el.closest && el.closest('.bubble, #chat'));
  }
  function refreshIgnore() {
    const want = !(chatOpen || keyOpen || drag || mode === 'berries' || mode === 'chase' || (mouse.inside && (hitAt(mouse.x, mouse.y) || overUI(mouse.x, mouse.y))));
    if (want !== ignoring) { ignoring = want; api.setIgnoreMouse(want); document.body.style.cursor = want ? '' : 'pointer'; }
  }

  window.addEventListener('mousemove', (e) => {
    if (Math.abs(e.clientX - mouse.x) > 3 || Math.abs(e.clientY - mouse.y) > 3) mouse.stillSince = performance.now();
    mouse = { x: e.clientX, y: e.clientY, inside: true, stillSince: mouse.stillSince };
    if (drag) {
      if (Math.abs(e.clientX - drag.sx) > 4) drag.moved = true;
      if (drag.moved) { dad.x = clamp(e.clientX, 40, W - 40); dad.jump = 18; dad.eyes = 'happy'; dad.target = null; }
    }
    refreshIgnore();
  });
  document.addEventListener('mouseleave', () => { mouse.inside = false; refreshIgnore(); });

  let lastDadClick = 0;
  canvas.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    const hit = hitAt(e.clientX, e.clientY);
    if (hit === 'dad' && mode !== 'berries' && mode !== 'chase') drag = { sx: e.clientX, moved: false };
    else if (hit === 'ball') throwBall();
  });
  window.addEventListener('mouseup', (e) => {
    if (!drag) return;
    const d = drag; drag = null;
    if (d.moved) { dad.eyes = 'open'; say('dad', pick(['Wheee!', 'Again! That was fun!', 'Nice new spot. I like it here.'])); sfx.jump(); }
    else {
      const t = performance.now();
      if (t - lastDadClick < 350) { openChat(); lastDadClick = 0; }
      else { lastDadClick = t; setTimeout(() => { if (lastDadClick === t) clickDad(); }, 360); }
    }
    refreshIgnore();
  });
  window.addEventListener('contextmenu', (e) => { e.preventDefault(); api.contextMenu(); });

  function pokeDad() {
    if (mode === 'sleep') {
      say('dad', pick(L.sleepTalk), { life: 4 });
      burst('z', dad.x + 30, GROUND - 60, 2);
      if (!isSleepTime()) { stayUpUntil = 0; wakeUp('back'); }
      return;
    }
    if (mode === 'nap') { wakeUp('back'); return; }
    if (mode === 'berries') return;
    dad.vy = 260; sfx.jump();
    if (Math.random() < 0.35) dad.star = 1.4;
    burst('heart', dad.x, GROUND - DAD.h, 2);
    if (Math.random() < 0.15) burst('text', dad.x, GROUND - DAD.h - 10, 1, '1UP');
    say('dad', pick(L.poke));
  }
  // One click on Timmy: he hops and asks what you'd like.
  function clickDad() {
    if (mode === 'sleep' || mode === 'nap' || mode === 'berries' || mode === 'chase') return pokeDad();
    dad.vy = 200; sfx.jump(); burst('heart', dad.x, GROUND - DAD.h, 1);
    openAskMenu();
  }
  // Timmy's menu: everything he can do, in four tabs.
  const TABS = [['play', '🎮 Play'], ['ask', '💬 Ask'], ['timmy', '🦊 Timmy'], ['settings', '⚙️ Settings']];
  async function menuItems(tab) {
    if (tab === 'play') return [
      ['🍓 Berry Catch', () => startGame('berries')], ['🎾 Fetch', () => startGame('fetch')], ['✊ Rock Paper Scissors', () => startGame('rps')],
      ['🏃 Chase', () => startGame('chase')], ['💃 Dance party', () => startGame('dance')]
    ];
    if (tab === 'ask') return [
      ['💪 Motivate me', () => askFor('motivation')], ['💡 Creative idea', () => askFor('creative')], ['😂 Tell a joke', () => askFor('joke')],
      ['🧘 Calm me down', () => askFor('calm')], ['🥰 Cheer me up', () => askFor('compliment')], ['💬 Let\'s talk', openChat]
    ];
    if (tab === 'timmy') return [
      ['🥕 Feed a carrot', () => eatCarrot(true)], ['☕ Coffee break', () => { shut('dad'); drinkCoffee(); }], ['✨ Do a trick', doTrick],
      ['👋 Say hi', () => { dad.vy = 240; say('dad', pick(L.keyword[0][1])); }], ['🌙 Bedtime', () => { manualSleepUntil = Date.now() + 2 * 60 * 60 * 1000; goToSleep('night'); }]
    ];
    const p = await api.getPrefs();
    const onoff = (v) => (v ? 'ON ✅' : 'OFF');
    const toggle = (action) => async () => { await api.prefAction(action); openMainMenu('settings'); };
    const items = [
      [`🔊 Sounds: ${onoff(p.sound)}`, toggle('toggle:sound')],
      [`📧 Email alerts: ${onoff(p.notifyEmail)}`, toggle('toggle:email')],
      [`💬 Message alerts: ${onoff(p.notifyMessages)}`, toggle('toggle:messages')],
      [`🐾 Come to my pointer: ${onoff(p.followPointer)}`, toggle('toggle:follow')]
    ];
    if (p.openAtLogin !== null) items.push([`🚀 Open at login: ${onoff(p.openAtLogin)}`, toggle('toggle:login')]);
    items.push(p.hasKey ? ['🔑 Change API key', openKeyPrompt] : ['🔑 Add API key', openKeyPrompt]);
    if (p.hasKey) items.push(['🗝️ Remove API key', async () => { await api.prefAction('remove-key'); }]);
    items.push(
      [p.update ? `⬆️ Update to v${p.update}` : `⬆️ Check updates (v${p.version})`, async () => { shut('dad'); await api.prefAction('check-updates'); }],
      ['🧽 Forget my memories', async () => { await api.prefAction('forget'); }],
      ['📝 More settings', async () => { await api.prefAction('open-settings'); shut('dad'); }],
      ['👋 Quit Timmy', async () => { say('dad', 'Bye bye! See you soon! 👋', { life: 3 }); await api.prefAction('quit'); }]
    );
    return items;
  }
  let menuTab = 'ask';
  async function openMainMenu(tab) {
    if (mode === 'sleep' || mode === 'nap') wakeUp('quiet');
    scene++; // drop any queued small talk so it can't cover the menu
    menuTab = tab || menuTab;
    const items = await menuItems(menuTab);
    say('dad', menuTab === 'play' ? L.games.playMenu : pick(L.askMenu), { menu: true, life: 90, custom: (el) => {
      const tabs = document.createElement('div'); tabs.className = 'tabs';
      for (const [id, label] of TABS) {
        const t = document.createElement('button'); t.textContent = label; if (id === menuTab) t.className = 'on';
        t.onclick = (e) => { e.stopPropagation(); openMainMenu(id); };
        tabs.appendChild(t);
      }
      el.appendChild(tabs);
      const grid = document.createElement('div'); grid.className = 'btns grid' + (menuTab === 'settings' ? ' two' : '');
      for (const [label, fn] of items) {
        const b = document.createElement('button'); b.textContent = label;
        b.onclick = (e) => { e.stopPropagation(); fn(); };
        grid.appendChild(b);
      }
      el.appendChild(grid);
    } });
  }
  const openAskMenu = () => openMainMenu('ask');
  const openPlayMenu = () => openMainMenu('play');
  function doTrick() {
    if (mode === 'sleep' || mode === 'nap') wakeUp('quiet');
    scene++;
    dad.vy = 380; dad.star = 1.4; dad.dir *= -1; sfx.win();
    setTimeout(() => { dad.dir *= -1; }, 300);
    burst('text', dad.x, GROUND - DAD.h - 10, 1, 'TA-DA!'); burst('heart', dad.x, GROUND - DAD.h, 2);
    say('dad', pick(['Backflip! ...okay, a front-hop. Still counts! ✨', 'Ta-da! The famous Timmy Twirl! 🌪️', 'Did you see that?! Ten out of ten! 🏆']));
  }

  // What to ask Claude for each button (when an API key is set); otherwise use the built-in lines.
  const ASK = {
    motivation: { pool: 'motivation', prompt: 'Give me a quick, personal motivational boost for right now. Use what you know about me.' },
    creative: { pool: 'creative', prompt: 'Give me one fun, specific creative idea or mini-project I could do today. Surprise me.' },
    joke: { pool: 'jokes', prompt: 'Tell me a short, clean, genuinely funny joke.' },
    calm: { pool: 'calm', prompt: "I'm a bit stressed. Help me calm down with something short and kind I can do right now." },
    compliment: { pool: 'compliments', prompt: 'Cheer me up with something warm and genuine, like a best friend would.' }
  };
  async function askFor(kind) {
    const a = ASK[kind];
    const res = await talk(a.prompt);
    if (!res) say('dad', pick(L[a.pool]), { buttons: [['Another!', () => askFor(kind)], ['Thanks 🧡', () => shut('dad')]] });
    else if (res.text) say('dad', res.text, { buttons: [['Another!', () => askFor(kind)], ['Thanks 🧡', () => shut('dad')]] });
    if (kind === 'joke') dad.eyes = 'happy', setTimeout(() => (dad.eyes = 'open'), 1500);
  }
  // Sends a message to Claude. Returns null when there is no API key (offline).
  async function talk(text) {
    scene++;
    const thinking = say('dad', '...', { life: 40 });
    let dots = 0; const iv = setInterval(() => { dots = (dots + 1) % 4; if (bubbles.get('dad') === thinking) { thinking.full = '.'.repeat(dots + 1); thinking.shown = thinking.full.length; thinking.el.querySelector('.txt').textContent = thinking.full; } }, 350);
    dad.eyes = 'happy';
    let res;
    try { res = await api.chat(text, { mode }); } catch { res = { text: 'My brain did a little glitch. Try again?' }; }
    clearInterval(iv); dad.eyes = 'open';
    if (bubbles.get('dad') === thinking) shut('dad');
    if (!res || res.offline) return null;
    for (const act of res.actions || []) {
      if (act.type === 'game') setTimeout(() => startGame(act.game), 2500);
      if (act.type === 'eat') setTimeout(() => eatCarrot(true), 2500);
    }
    if (res.text) dad.wag = 1;
    return res;
  }

  // ---------- API key ----------
  let keyOpen = false;
  const keyBox = document.getElementById('keybox');
  const keyInput = document.getElementById('keyInput');
  function openKeyPrompt() {
    if (mode === 'sleep' || mode === 'nap') wakeUp('quiet');
    scene++; closeChat();
    say('dad', "Give me an Anthropic API key and I can really talk with you, remember things about you and come up with ideas just for you! 🔑", { life: 120, buttons: [['Get a key (opens website)', () => api.openKeyPage()]] });
    keyOpen = true; keyBox.style.display = 'block';
    keyBox.style.bottom = '6px';
    keyBox.style.left = clamp(dad.x + (dad.x > W / 2 ? -330 : 330), 170, W - 170) + 'px';
    api.focus(); setTimeout(() => keyInput.focus(), 30);
    refreshIgnore();
  }
  function closeKeyPrompt() { keyOpen = false; keyBox.style.display = 'none'; keyInput.value = ''; api.blur(); refreshIgnore(); }
  keyInput.addEventListener('keydown', async (e) => {
    if (e.key === 'Escape') { closeKeyPrompt(); shut('dad'); return; }
    if (e.key !== 'Enter') return;
    const key = keyInput.value;
    closeKeyPrompt();
    if (!key.trim()) return;
    say('dad', 'Checking your key... 🔍', { life: 30 });
    const res = await api.setApiKey(key);
    if (res.ok) {
      sfx.win(); dad.vy = 300; dad.star = 1.4; burst('heart', dad.x, GROUND - DAD.h, 3);
      say('dad', "IT WORKS! 🎉 Now I can really talk with you. Click me and ask me anything, best friend!");
    } else {
      sfx.hurt();
      say('dad', res.error, { buttons: [['Try again', openKeyPrompt], ['Later', () => shut('dad')]] });
    }
  });

  // ---------- morning coffee ☕ ----------
  function drinkCoffee() {
    if (mode !== 'awake') return;
    mode = 'coffee'; dad.target = null; dad.kind = 'sit'; dad.coffee = 1; dad.eyes = 'closed';
    say('dad', pick(L.coffeeStart), { life: 3 });
    const steam = setInterval(() => { if (!dad.coffee) return clearInterval(steam); burst('steam', dad.x + dad.dir * (dad.coffee === 2 ? 38 : 32), GROUND - DAD.h + (dad.coffee === 2 ? 30 : 45), 1); }, 450);
    const sip = (n) => {
      dad.coffee = 2; dad.eyes = 'closed'; sfx.slurp();
      burst('text', dad.x + dad.dir * 30, GROUND - DAD.h - 4, 1, 'SLURP');
      later(() => { dad.coffee = 1; dad.eyes = n < 3 ? 'open' : 'happy'; }, 1100);
    };
    later(() => sip(1), 2200);
    later(() => sip(2), 4400);
    later(() => sip(3), 6600);
    later(() => {
      dad.coffee = 0; mode = 'awake'; dad.kind = 'stand'; dad.eyes = 'open';
      dad.vy = 280; dad.star = 1.4; sfx.coin();
      burst('text', dad.x, GROUND - DAD.h - 10, 1, '+100 AWAKE');
      say('dad', pick(L.coffeeDone) + ' ' + pick(L.morning));
    }, 8600);
  }

  // ---------- snack time 🥕 ----------
  function eatCarrot(fromYou) {
    if (mode === 'sleep' || mode === 'nap') wakeUp('quiet');
    if (mode !== 'awake') { if (fromYou) say('dad', "Ooh, a carrot! I'll eat it right after this. 🥕"); return; }
    scene++;
    const sc = scene;
    mode = 'eating'; dad.target = null; dad.kind = 'sit'; dad.carrotBites = 0;
    say('dad', fromYou ? pick(L.carrotGift) : pick(L.carrotSelf), { life: 4 });
    let bites = 0;
    const iv = setInterval(() => {
      if (scene !== sc || mode !== 'eating') { clearInterval(iv); dad.carrotBites = null; return; }
      bites++;
      dad.carrotBites = bites; dad.eyes = bites % 2 ? 'closed' : 'happy';
      sfx.crunch();
      burst('crumb', dad.x + dad.dir * 55, GROUND - DAD.h + 50, 4);
      burst('text', dad.x + dad.dir * 30, GROUND - DAD.h - 4, 1, 'CRUNCH');
      if (bites >= 4) {
        clearInterval(iv);
        dad.carrotBites = null; dad.hunger = 0; mode = 'awake'; dad.kind = 'stand'; dad.eyes = 'happy';
        dad.vy = 240; dad.star = 1.2; sfx.coin();
        burst('heart', dad.x, GROUND - DAD.h, 3);
        say('dad', pick(L.fullTummy));
        setTimeout(() => { if (dad.eyes === 'happy') dad.eyes = 'open'; }, 1500);
      }
    }, 1000);
  }
  function askForCarrot() {
    hungryAsked = Date.now();
    dad.kind = 'sit';
    say('dad', pick(L.hungry), { life: 90, buttons: [['🥕 Give a carrot', () => eatCarrot(true)], ['Later', () => { shut('dad'); say('dad', 'Okay... *tummy rumbles quietly*', { life: 3 }); }]] });
  }

  // ---------- chat ----------
  let chatOpen = false;
  function openChat() {
    if (mode === 'sleep') { say('dad', 'zzz... (it\'s sleepy time — talk tomorrow? 🌙)'); return; }
    if (mode === 'nap') wakeUp('back');
    chatOpen = true; chatBox.style.display = 'block';
    chatBox.style.left = clamp(dad.x, 150, W - 150) + 'px';
    chatBox.style.bottom = (H - speakerTop(dad) + 14) + 'px';
    shut('dad');
    api.focus(); setTimeout(() => chatInput.focus(), 30);
    refreshIgnore();
  }
  function closeChat() { chatOpen = false; chatBox.style.display = 'none'; chatInput.value = ''; api.blur(); refreshIgnore(); }
  chatInput.addEventListener('keydown', async (e) => {
    if (e.key === 'Escape') return closeChat();
    if (e.key !== 'Enter') return;
    const text = chatInput.value.trim();
    closeChat();
    if (!text) return;
    const res = await talk(text);
    if (res && res.text) say('dad', res.text);
    else if (!res) {
      if (/carrot|hungry|food|eat|snack/i.test(text)) return eatCarrot(true);
      if (/play|game|bored/i.test(text)) return openPlayMenu();
      if (/motivat|lazy|procrastinat|give up|can't do/i.test(text)) return askFor('motivation');
      if (/idea|creative|inspir/i.test(text)) return askFor('creative');
      if (/joke|funny|laugh/i.test(text)) return askFor('joke');
      if (/stress|anxious|calm|overwhelm|panic/i.test(text)) return askFor('calm');
      const kw = L.keyword.find(([re]) => re.test(text));
      if (kw) say('dad', pick(kw[1]));
      else say('dad', "I'd love to really chat! Add an API key and I'll talk back properly.", { buttons: [['🔑 Add API key', openKeyPrompt], ['Later', () => shut('dad')]] });
    }
  });

  // ---------- games ----------
  let game = null;
  let fetchBall = null;
  function endGame(silent) {
    if (!game) return;
    const g = game; game = null; hud.style.display = 'none';
    if (g.kind === 'berries') { api.blur(); }
    fetchBall = null; dad.carrying = false;
    if (mode !== 'sleep' && mode !== 'nap') mode = 'awake';
    dad.speed = 60;
    if (!silent && g.onEnd) g.onEnd();
    refreshIgnore();
  }
  function startGame(kind) {
    if (mode === 'sleep' || mode === 'nap') { wakeUp('quiet'); }
    endGame(true); closeChat();
    scene++;
    if (mode === 'eating' || mode === 'coffee') mode = 'awake';
    dad.carrotBites = null; dad.coffee = 0;
    dad.kind = 'stand'; dad.eyes = 'open';
    if (kind === 'berries') {
      mode = 'berries';
      game = { kind, t: 30, score: 0, items: [], spawn: 0, stun: 0 };
      hud.style.display = 'block';
      say('dad', L.games.berriesIntro, { life: 4 });
      api.focus();
      game.onEnd = () => {
        const best = game_score > (st.hiScore || 0);
        if (best) { st.hiScore = game_score; api.setState({ hiScore: game_score }); sfx.win(); dad.star = 1.4; burst('text', dad.x, GROUND - DAD.h - 10, 1, 'HI-SCORE!'); }
        say('dad', L.games.berriesEnd(game_score, st.hiScore, best), { buttons: [['Play again', () => startGame('berries')], ['Done', () => shut('dad')]] });
      };
    } else if (kind === 'fetch') {
      mode = 'fetch';
      game = { kind, idle: 0, throws: 0 };
      fetchBall = { x: dad.x + dad.dir * 50, y: GROUND - 8, vx: 0, vy: 0, rest: true };
      say('dad', L.games.fetchIntro);
      game.onEnd = () => say('dad', 'Best. Game. Ever. My legs are tired though. 😅');
    } else if (kind === 'rps') {
      rpsRound();
    } else if (kind === 'chase') {
      mode = 'chase';
      game = { kind, t: 20, score: 0, cool: 1.5 };
      hud.style.display = 'block';
      say('dad', L.games.chaseIntro, { life: 4 });
      api.focus();
      game.onEnd = () => {
        const n = game_score;
        say('dad', n === 0 ? "You're too fast! Zero catches. Rematch?" : `I caught you ${n} time${n === 1 ? '' : 's'}! 😎 Rematch?`, { buttons: [['Rematch!', () => startGame('chase')], ['Done', () => shut('dad')]] });
      };
    } else if (kind === 'dance') {
      mode = 'dance';
      game = { kind, t: 5 };
      say('dad', L.games.dance, { life: 3 });
      sfx.dance();
      game.onEnd = () => say('dad', 'Woo! We should start a band. "The Curly Tails."');
    }
    refreshIgnore();
  }
  let game_score = 0;
  function rpsRound() {
    const opts = [['✊ Rock', 0], ['✋ Paper', 1], ['✌️ Scissors', 2]];
    say('dad', L.games.rpsIntro, {
      buttons: opts.map(([label, v]) => [label, () => {
        const mine = Math.floor(Math.random() * 3);
        const names = ['rock ✊', 'paper ✋', 'scissors ✌️'];
        const res = (v - mine + 3) % 3; // 0 draw, 1 you win, 2 fox wins
        const line = res === 0 ? `I picked ${names[mine]} too! Great minds!` : res === 1 ? `I picked ${names[mine]}... you win! 🏆` : `I picked ${names[mine]}! Fox wins! 🦊`;
        if (res === 1) { sfx.coin(); burst('heart', dad.x, GROUND - DAD.h, 2); } else if (res === 2) { dad.vy = 240; sfx.jump(); }
        say('dad', line, { buttons: [['Again', rpsRound], ['Done', () => shut('dad')]] });
      }])
    });
  }
  function throwBall() {
    if (!fetchBall || dad.carrying || !game) return;
    game.throws++; game.idle = 0;
    const dir = mouse.x < W / 2 ? 1 : -1;
    fetchBall.vx = dir * rand(260, 520); fetchBall.vy = -rand(280, 380); fetchBall.rest = false;
    sfx.jump(); say('dad', pick(['Ooh ooh ooh!', 'I got it! I GOT IT!', 'Ball!!!']), { life: 2 });
  }
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && game) endGame();
    if (game && game.kind === 'berries') {
      if (e.key === 'ArrowLeft') game.key = -1;
      if (e.key === 'ArrowRight') game.key = 1;
    }
  });
  window.addEventListener('keyup', (e) => { if (game && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) game.key = 0; });

  function updateGame(dt) {
    if (!game) return;
    if (game.kind === 'berries') {
      game.t -= dt;
      game_score = game.score;
      hud.innerHTML = `SCORE ${String(game.score).padStart(6, '0')}   <span class="hi">HI ${String(Math.max(st.hiScore || 0, game.score)).padStart(6, '0')}</span>   TIME ${Math.max(0, Math.ceil(game.t))}\n<span style="font-size:9px;letter-spacing:1px">MOVE MOUSE / ← →  ·  ESC TO QUIT</span>`;
      if (game.stun > 0) game.stun -= dt;
      else {
        const goal = game.key ? dad.x + game.key * 400 : (mouse.inside ? mouse.x : dad.x);
        const dx = goal - dad.x;
        if (Math.abs(dx) > 4) { dad.x += Math.sign(dx) * Math.min(Math.abs(dx), 520 * dt); dad.dir = Math.sign(dx); dad.kind = 'walk'; } else dad.kind = 'stand';
        dad.x = clamp(dad.x, 50, W - 50);
      }
      game.spawn -= dt;
      if (game.spawn <= 0 && game.t > 0.5) {
        game.spawn = rand(0.35, 0.75);
        const roll = Math.random();
        const type = roll < 0.12 ? 'cone' : roll < 0.22 ? 'gold' : 'berry';
        game.items.push({ type, x: clamp(dad.x + rand(-420, 420), 30, W - 30), y: -20, vy: rand(80, 140) + (30 - game.t) * 3 });
      }
      for (const it of game.items) {
        it.y += it.vy * dt;
        const mouthY = GROUND - DAD.h + 40;
        if (!it.done && it.y > mouthY - 20 && it.y < mouthY + 30 && Math.abs(it.x - (dad.x + dad.dir * 30)) < 42) {
          it.done = true;
          if (it.type === 'cone') { game.stun = 0.9; game.score = Math.max(0, game.score - 20); sfx.hurt(); burst('text', dad.x, mouthY - 30, 1, 'OUCH -20'); dad.eyes = 'closed'; setTimeout(() => (dad.eyes = 'open'), 800); }
          else { const v = { berry: 10, gold: 50 }[it.type]; game.score += v; sfx.coin(); burst('text', it.x, mouthY - 30, 1, '+' + v); if (it.type === 'gold') { burst('heart', dad.x, mouthY - 20, 2); dad.star = 1.4; } }
        }
        if (it.y > GROUND + 10) it.done = true;
      }
      game.items = game.items.filter((i) => !i.done);
      if (game.t <= 0) endGame();
    } else if (game.kind === 'fetch') {
      const b = fetchBall;
      game.idle += dt;
      if (!b.rest && !dad.carrying) {
        b.vy += 900 * dt; b.x += b.vx * dt; b.y += b.vy * dt;
        if (b.x < 20 || b.x > W - 20) { b.vx *= -0.7; b.x = clamp(b.x, 20, W - 20); }
        if (b.y > GROUND - 8) { b.y = GROUND - 8; b.vy *= -0.5; b.vx *= 0.75; tone(180, 0.04, { vol: 0.02 }); if (Math.abs(b.vy) < 40) { b.vy = 0; } }
        if (b.vy === 0 && Math.abs(b.vx) < 15) { b.vx = 0; }
        dad.target = b.x; dad.speed = 210;
        if (Math.abs(dad.x - b.x) < 30 && b.y > GROUND - 40) { dad.carrying = true; sfx.coin(); }
      } else if (dad.carrying) {
        const home = mouse.inside ? clamp(mouse.x, 60, W - 60) : W / 2;
        dad.target = home;
        b.x = dad.x + dad.dir * 52; b.y = GROUND - 52 - dad.jump;
        if (Math.abs(dad.x - home) < 12) {
          dad.carrying = false; b.rest = true; b.vx = b.vy = 0; b.y = GROUND - 8; b.x = dad.x + dad.dir * 50;
          dad.target = null; dad.wag = 1; burst('heart', dad.x, GROUND - DAD.h, 1);
          say('dad', pick(['Again? Again?! Click the ball!', 'Got it! *proud wag*', 'Throw it farther this time!']));
          game.idle = 0;
        }
      }
      if (game.idle > 40) endGame();
    } else if (game.kind === 'chase') {
      game.t -= dt; game.cool -= dt; game_score = game.score;
      hud.innerHTML = `CAUGHT ${game.score}   TIME ${Math.max(0, Math.ceil(game.t))}\n<span style="font-size:9px;letter-spacing:1px">KEEP YOUR POINTER AWAY FROM ME · ESC TO QUIT</span>`;
      if (mouse.inside) { dad.target = clamp(mouse.x, 50, W - 50); dad.speed = 230 + (20 - game.t) * 6; }
      if (game.cool <= 0 && mouse.inside && Math.abs(dad.x - mouse.x) < 32 && mouse.y > GROUND - DAD.h - 20) {
        game.score++; game.cool = 1.2; sfx.coin(); dad.vy = 240; dad.star = 1;
        burst('text', dad.x, GROUND - DAD.h - 10, 1, 'GOTCHA!');
      }
      if (game.t <= 0) endGame();
    } else if (game.kind === 'dance') {
      game.t -= dt;
      const beat = Math.floor(game.t * 2.5);
      if (beat !== game.beat) {
        game.beat = beat;
        const who = dad;
        who.vy = 200; who.dir *= -1;
        burst('note', who.x, GROUND - 70, 1);
      }
      if (game.t <= 0) endGame();
    }
  }

  // ---------- commands from the tray / right-click menu ----------
  api.on('command', (cmd) => {
    if (cmd === 'chat') openChat();
    else if (cmd === 'hi') { if (mode === 'sleep' || mode === 'nap') wakeUp('back'); else { dad.vy = 240; say('dad', pick(L.keyword[0][1])); } }
    else if (cmd === 'wake') { manualSleepUntil = 0; stayUpUntil = isSleepTime() ? Date.now() + 60 * 60 * 1000 : 0; wakeUp(st.lastMorning === todayKey() ? 'back' : 'morning'); }
    else if (cmd === 'sleep') { manualSleepUntil = Date.now() + 2 * 60 * 60 * 1000; goToSleep('night'); }
    else if (cmd.startsWith('game:')) startGame(cmd.slice(5));
    else if (cmd.startsWith('ask:')) { if (mode === 'sleep' || mode === 'nap') wakeUp('quiet'); askFor(cmd.slice(4)); }
    else if (cmd === 'feed') eatCarrot(true);
    else if (cmd === 'coffee') { if (mode === 'sleep' || mode === 'nap') wakeUp('quiet'); drinkCoffee(); }
    else if (cmd === 'trick') doTrick();
    else if (cmd === 'menu') openMainMenu();
    else if (cmd === 'api-key') openKeyPrompt();
    else if (cmd === 'key-removed') say('dad', 'Key removed. I\'ll use my built-in lines for now. 🦊');
    else if (cmd === 'forgot') say('dad', "Okay, fresh start! Hi, I'm Timmy. Nice to meet you... again. 🦊");
    else if (cmd === 'need-accessibility') say('dad', "To tell you about new messages, I need permission: System Settings → Privacy & Security → Accessibility → switch on Fox Buddy.", { buttons: [['Open Settings', () => { api.openPrivacy(); shut('dad'); }], ['Later', () => shut('dad')]] });
    else if (cmd === 'login:on') say('dad', "Yay! I'll be here every time you open your laptop. ☀️");
    else if (cmd === 'login:off') say('dad', "Okay! I won't pop up on my own. Open Fox Buddy from Applications whenever you miss us. 🦊");
  });
  api.on('config', (c) => { cfg = c; loadCustom(); });
  // Updates: Timmy offers to update himself.
  api.on('update', (u) => {
    if (u.upToDate) return say('dad', `I'm all up to date! Version ${u.version}. 😎`);
    if (u.error) return say('dad', "I couldn't check for updates right now. Is the internet on?");
    if (mode === 'sleep' || mode === 'nap') return; // he'll mention it in the menu instead
    scene++;
    dad.vy = 260; dad.star = 1.4; sfx.fanfare();
    burst('text', dad.x, GROUND - DAD.h - 10, 1, 'NEW!');
    say('dad', `I've got an update! Version ${u.version}${u.notes ? ': ' + u.notes : ''} Update now? It takes a few seconds.`, { life: 120, buttons: [
      ['⬆️ Update now', async () => {
        say('dad', 'Updating... brb! 🛠️', { life: 30 });
        const r = await api.installUpdate();
        say('dad', r && r.ok ? 'Done! Restarting with my new tricks... 🦊✨' : "Hmm, the update didn't work. I'll try again later.", { life: 10 });
      }],
      ['Later', () => shut('dad')]
    ] });
  });

  // New email / message: Timmy hops up and tells you.
  api.on('notify', (n) => {
    if (mode === 'sleep' && isSleepTime()) return; // don't wake him (or you) at night
    if (mode === 'nap') return;                    // laptop locked: nobody's there to see it
    const who = n.from ? ` from ${n.from}` : '';
    let text;
    if (n.kind === 'email') {
      text = n.count > 1 ? `📬 ${n.count} new emails, ${'{you}'}! The latest is${who}: "${n.subject || 'no subject'}". Wanna check?`
        : n.subject !== undefined ? `📬 Psst, {you}! New email${who}: "${n.subject || 'no subject'}". Wanna check it?`
        : `📬 You've got new email in ${n.app}! Wanna check it?`;
    } else {
      text = `💬 Ding! ${n.count > 1 ? n.count + ' new messages' : 'A new message'} in ${n.app}. Someone wants to talk to you!`;
    }
    if (mode === 'sleep') wakeUp('quiet');
    scene++;
    dad.vy = 280; dad.star = 1.2; sfx.coin();
    burst('text', dad.x, GROUND - DAD.h - 10, 1, n.kind === 'email' ? 'MAIL!' : 'MSG!');
    say('dad', text, { life: 25, buttons: [['Open ' + n.app, () => { api.openApp(n.app); shut('dad'); }], ['Later', () => shut('dad')]] });
  });
  api.on('power', (ev) => {
    if (ev === 'suspend' || ev === 'lock') { if (mode !== 'sleep') goToSleep('nap'); }
    else if (ev === 'resume' || ev === 'unlock') {
      if (isSleepTime() && Date.now() > stayUpUntil) { if (mode !== 'sleep') { mode = 'sleep'; dad.kind = 'sleep'; } say('dad', '*opens one eye* ...it\'s really late, {you}. zzz', { life: 4 }); return; }
      if (mode === 'sleep' || mode === 'nap' || mode === 'awake') wakeUp(st.lastMorning === todayKey() ? 'back' : 'morning');
    }
  });

  // ---------- brain ----------
  function think(dt) {
    // schedule
    const night = isSleepTime() && Date.now() > stayUpUntil;
    if (mode === 'sleep' && !night && Date.now() > manualSleepUntil) wakeUp(st.lastMorning === todayKey() ? 'back' : 'morning');
    if ((mode === 'awake') && night) {
      if (!lateWarned) { lateWarned = Date.now(); say('dad', pick(L.lateNight)); }
      else if (Date.now() - lateWarned > 10 * 60 * 1000) { lateWarned = 0; goToSleep('night'); }
    }
    if (!night) lateWarned = 0;

    if (mode !== 'awake') return;

    // tummy: about 1 point every 2 minutes awake; hungry at 70
    dad.hunger = Math.min(100, dad.hunger + dt / 120);
    if (dad.hunger >= 95 && !game) { eatCarrot(false); return; }
    if (dad.hunger >= 70 && !bubbles.size && !game && Date.now() - hungryAsked > 15 * 60 * 1000) askForCarrot();

    // stay put while his menu (or any question) is open
    const busy = [...bubbles.values()].some((b) => b.interactive);
    // 🐾 rest your pointer on his line for a second and he trots over
    if (cfg.followPointer !== false && !busy && mouse.inside && !drag && mouse.y > GROUND - DAD.h - 10 &&
        performance.now() - mouse.stillSince > 900 && Math.abs(mouse.x - dad.x) > 45 && pointerGoal === null) {
      pointerGoal = mouse.x;
      dad.target = clamp(mouse.x - Math.sign(mouse.x - dad.x) * 42, 50, W - 50); dad.speed = 120;
      thinkT = rand(8, 14);
    }
    if (pointerGoal !== null && dad.target === null) {
      dad.dir = Math.sign(pointerGoal - dad.x) || dad.dir; dad.speed = 60;
      dad.vy = 160; dad.eyes = 'happy'; setTimeout(() => { if (dad.eyes === 'happy') dad.eyes = 'open'; }, 900);
      if (Math.random() < 0.3 && !bubbles.size) say('dad', pick(['Here I am! 🐾', 'You called? 🦊', '*sniff sniff* What did you find?', 'Reporting for duty!']), { life: 2.5 });
      pointerGoal = null;
    }
    if (busy) { if (dad.kind === 'walk' && pointerGoal === null) dad.target = null; return; }
    // wandering
    thinkT -= dt;
    if (thinkT <= 0) {
      thinkT = rand(4, 12);
      const r = Math.random();
      if (r < 0.45) { dad.target = clamp(dad.x + rand(-350, 350), 70, W - 70); dad.speed = 60; }
      else if (r < 0.6) { dad.kind = 'sit'; dad.target = null; }
      else { dad.kind = 'stand'; dad.target = null; }
    }
    // chatter
    chatterT -= dt;
    if (chatterT <= 0) {
      const base = { quiet: 720, normal: 300, chatty: 120 }[cfg.chattiness] || 300;
      chatterT = rand(base * 0.7, base * 1.3);
      if (!bubbles.size) {
        { const pool = L.idle.concat(dayPart() === 'afternoon' ? L.afternoon : dayPart() === 'evening' ? L.evening : []); say('dad', pick(pool)); }
      }
    }
    // break reminders
    breakT -= dt;
    if (breakT <= 0) { breakT = (cfg.breakReminderMinutes || 50) * 60; say('dad', pick(L.breakReminder), { life: 10 }); dad.kind = 'stretch'; setTimeout(() => { if (dad.kind === 'stretch') dad.kind = 'stand'; }, 2500); }

  }

  function move(e, dt) {
    if (e.target != null && e.kind !== 'sleep') {
      const dx = e.target - e.x;
      if (Math.abs(dx) < 3) { e.target = null; if (e.kind === 'walk') e.kind = 'stand'; }
      else { e.dir = Math.sign(dx); e.x += e.dir * Math.min(Math.abs(dx), e.speed * dt); e.kind = 'walk'; }
    } else if (e.kind === 'walk' && !(game && game.kind === 'berries' && e === dad)) e.kind = 'stand';
    // jump physics
    if (e.vy || e.jump > 0) { e.jump += e.vy * dt; e.vy -= 900 * dt; if (e.jump <= 0) { e.jump = 0; e.vy = 0; } }
    if (e === dad) {
      if (dad.star > 0) dad.star -= dt;
    }
    if (drag && e === dad) return;
    // animation clock
    e.ft += dt * (e.kind === 'walk' ? (e.speed > 100 ? 12 : 7) : 1.2);
    e.frame = Math.floor(e.ft) % 4;
    e.breath = Math.floor(e.ft * (e.kind === 'sleep' ? 0.6 : 1)) % 2 === 0;
    e.wag = e.kind === 'sleep' ? 0 : [0, -1, 0, 1][Math.floor(e.ft * 2) % 4];
    if (e.kind !== 'sleep' && Math.random() < dt * 0.35) { e.blink = true; setTimeout(() => (e.blink = false), 140); }
  }

  // ---------- render ----------
  function blit(off, g, drawFn, pose, cx, w, h, jump, dir) {
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, off.width, off.height);
    g.setTransform(1, 0, 0, 1, 1, 1);
    drawFn(g, pose);
    g.setTransform(1, 0, 0, 1, 0, 0);
    outline(g, off.width, off.height);
    const x = Math.round(cx - w / 2), y = Math.round(GROUND - h - jump);
    ctx.save();
    if (dir < 0) { ctx.translate(x + w, y); ctx.scale(-1, 1); ctx.drawImage(off, 0, 0, w, h); }
    else ctx.drawImage(off, x, y, w, h);
    ctx.restore();
  }
  function shadow(cx, w, jump) {
    ctx.fillStyle = `rgba(0,0,0,${0.22 - Math.min(jump, 60) / 400})`;
    const sw = w * (1 - Math.min(jump, 60) / 160);
    ctx.fillRect(Math.round(cx - sw / 2), GROUND - 2, Math.round(sw), 4);
  }
  function drawDadEntity() {
    if (dad.star > 0) {
      const k = Math.min(1, (1.4 - dad.star) * 6) * Math.min(1, dad.star * 2);
      starG.clearRect(0, 0, 48, 48);
      drawStarburst(starG, 48, performance.now() / 900);
      const size = 48 * S * (0.6 + 0.4 * k);
      ctx.globalAlpha = Math.min(1, k);
      ctx.drawImage(starOff, Math.round(dad.x - size / 2), Math.round(GROUND - DAD.h / 2 - dad.jump - size / 2), size, size);
      ctx.globalAlpha = 1;
    }
    shadow(dad.x, DAD.w * 0.7, dad.jump);
    if (customImg) {
      const h = dad.kind === 'sleep' ? DAD.h * 0.8 : DAD.h;
      const w = h * customImg.width / customImg.height;
      const bob = dad.kind === 'walk' ? (dad.frame % 2) * 3 : dad.breath ? 2 : 0;
      const x = dad.x - w / 2, y = GROUND - h - dad.jump - bob;
      ctx.save(); ctx.imageSmoothingEnabled = true;
      if (dad.dir < 0) { ctx.translate(x + w, y); ctx.scale(-1, 1); ctx.drawImage(customImg, 0, 0, w, h); } else ctx.drawImage(customImg, x, y, w, h);
      ctx.restore(); ctx.imageSmoothingEnabled = false;
      return;
    }
    blit(dadOff, dadG, drawDad, dad, dad.x, DAD.w, DAD.h, dad.jump, dad.dir);
  }
  function render() {
    ctx.clearRect(0, 0, W, H);
    drawDadEntity();
    if (dad.hunger >= 70 && mode === 'awake' && dad.kind !== 'sleep') { // little "I'm hungry" carrot bobbing over his head
      const bob = Math.sin(performance.now() / 300) * 3;
      ctx.globalAlpha = 0.9;
      drawCarrotIcon(ctx, Math.round(dad.x - dad.dir * 40 - 7), Math.round(GROUND - DAD.h + 8 + bob), 3);
      ctx.globalAlpha = 1;
    }
    if (fetchBall) drawBall(ctx, Math.round(fetchBall.x - 7), Math.round(fetchBall.y - 7), 3);
    if (game && game.kind === 'berries') {
      for (const it of game.items) {
        const x = Math.round(it.x - 9), y = Math.round(it.y - 9);
        if (it.type === 'berry' || it.type === 'gold') drawBerry(ctx, x, y, 3, it.type === 'gold');
        else { ctx.fillStyle = '#7a4a24'; ctx.fillRect(x, y + 3, 15, 12); ctx.fillStyle = '#a86b3c'; ctx.fillRect(x + 3, y, 9, 18); ctx.fillStyle = '#5a3418'; ctx.fillRect(x + 3, y + 6, 9, 3); }
      }
    }
    for (const p of particles) {
      const a = 1 - p.t / p.life;
      ctx.globalAlpha = Math.max(0, a);
      if (p.kind === 'heart') drawHeart(ctx, Math.round(p.x), Math.round(p.y), 2);
      else if (p.kind === 'z') { ctx.fillStyle = '#ffffff'; ctx.font = `bold ${12 + p.t * 6}px ui-monospace, Menlo, monospace`; ctx.strokeStyle = '#2b1b17'; ctx.lineWidth = 3; ctx.strokeText('Z', p.x, p.y); ctx.fillText('Z', p.x, p.y); }
      else if (p.kind === 'steam') { ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillRect(Math.round(p.x + Math.sin(p.t * 6) * 3), Math.round(p.y), 4, 4); }
      else if (p.kind === 'crumb') { ctx.fillStyle = Math.random() < 0.5 ? '#ff6a2a' : '#c43d0c'; ctx.fillRect(Math.round(p.x), Math.round(p.y), 5, 5); }
      else if (p.kind === 'note') { ctx.fillStyle = '#ffd23f'; ctx.font = 'bold 18px ui-monospace, Menlo, monospace'; ctx.strokeStyle = '#2b1b17'; ctx.lineWidth = 3; ctx.strokeText('♪', p.x, p.y); ctx.fillText('♪', p.x, p.y); }
      else if (p.kind === 'text') { ctx.font = 'bold 13px ui-monospace, Menlo, monospace'; ctx.strokeStyle = '#2b1b17'; ctx.lineWidth = 4; ctx.strokeText(p.text, p.x - 16, p.y); ctx.fillStyle = '#ffd23f'; ctx.fillText(p.text, p.x - 16, p.y); }
      ctx.globalAlpha = 1;
    }
  }

  // ---------- loop ----------
  let last = performance.now(), zT = 0;
  function frame(t) {
    const dt = Math.min(0.05, (t - last) / 1000); last = t;
    think(dt);
    updateGame(dt);
    move(dad, dt);
    if (dad.kind === 'sleep') { zT -= dt; if (zT <= 0) { zT = 1.6; burst('z', dad.x + 30, GROUND - 55, 1); } }
    for (const p of particles) { p.t += dt; p.x += p.vx * dt * (p.kind === 'z' ? 0.5 : 1); p.y += p.vy * dt; if (p.kind === 'z') p.x += Math.sin(p.t * 3) * 0.4; }
    for (let i = particles.length - 1; i >= 0; i--) if (particles[i].t > particles[i].life) particles.splice(i, 1);
    updateBubbles(dt);
    fitWindow(dt);
    render();
    requestAnimationFrame(frame);
  }

  // ---------- start ----------
  if (isSleepTime()) {
    mode = 'sleep'; dad.kind = 'sleep';
  } else if (!st.lastMorning) wakeUp('first');
  else wakeUp(st.lastMorning === todayKey() ? 'back' : 'morning');
  requestAnimationFrame(frame);

  // preview hook (used only for screenshots in a browser)
  window.__fox = { dad, say, openMainMenu, doTrick, eatCarrot, askForCarrot, drinkCoffee, openAskMenu, openPlayMenu, askFor, startGame, goToSleep, wakeUp, get mode() { return mode; }, get game() { return game; } };
})();

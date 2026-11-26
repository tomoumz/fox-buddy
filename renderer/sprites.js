// Pixel-art sprites in the style of the fox&carrots fox: fire-red fur, white
// muzzle, cocky brows, red bandana with a white knot and a thick dark comic
// outline. Drawn tiny, scaled up crunchy.

const PAL = {
  O: '#f22414',   // fox red (sampled from the logo)
  L: '#ff5a3c',   // highlight
  D: '#cb1e10',   // shade
  C: '#ededed',   // white muzzle / inner ear / tail tip
  K: '#210200',   // outline brown-black
  W: '#ffffff',
  P: '#ff8fa3',   // blush
  M: '#5a0a05',   // open mouth
  T: '#ff7b8a',   // tongue
  B: '#8f0d05',   // bandana (deep red so it pops against his fur)
  Y: '#ffc408',   // starburst yellow
  R: '#ff6a2a',   // carrot
  R2: '#c43d0c',  // carrot ridges
  G: '#3a9d23',   // carrot leaves
  Cf: '#5b3416',  // coffee
  Mg: '#2ec4b6',  // mug stripe
  Y2: '#ffe27a'
};

function px(g) {
  return (x, y, w, h, c) => { g.fillStyle = PAL[c] || c; g.fillRect(x, y, w, h); };
}

// Comic outline: every empty pixel touching the sprite becomes outline colour.
function outline(g, w, h) {
  const img = g.getImageData(0, 0, w, h), d = img.data;
  const a = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? 0 : d[(y * w + x) * 4 + 3];
  const mark = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (a(x, y) > 0) continue;
    if (a(x - 1, y) > 128 || a(x + 1, y) > 128 || a(x, y - 1) > 128 || a(x, y + 1) > 128) mark.push((y * w + x) * 4);
  }
  for (const i of mark) { d[i] = 0x21; d[i + 1] = 0x02; d[i + 2] = 0x00; d[i + 3] = 255; }
  g.putImageData(img, 0, 0);
}

// ---------------- DAD (content grid 44 x 34) ----------------
// pose: { kind: 'stand'|'walk'|'sleep'|'stretch'|'sit', frame, eyes, mouth, wag, blink, breath }
function drawDad(g, pose) {
  const r = px(g);
  const f = pose.frame || 0;
  if (pose.kind === 'sleep') return drawDadSleep(r, pose);

  const walking = pose.kind === 'walk';
  const stretch = pose.kind === 'stretch';
  const sit = pose.kind === 'sit';
  const b = walking ? (f % 2) : (pose.breath ? 1 : 0);
  const w = pose.wag || 0;

  // big bushy tail with white tip
  const ty = sit ? 6 : 0;
  r(8, 17 + ty, 3, 4, 'O');
  r(3, 13 + w + ty, 7, 7, 'O');
  r(4, 14 + w + ty, 5, 1, 'L');
  r(2, 19 + w + ty, 2, 1, 'O');
  r(1, 11 + w + ty, 4, 5, 'O');
  r(0, 10 + w + ty, 3, 3, 'C');

  // legs
  const lift = (i) => (walking ? ((f + i) % 2) : 0);
  const legs = sit ? [[11, 0], [15, 0], [21, 0], [24, 0]] : [[10, 0], [14, 1], [20, 1], [24, 0]];
  legs.forEach(([x, phase], i) => {
    const l = lift(phase);
    const fx = stretch && i >= 2 ? x + 2 : x;
    const top = sit && i < 2 ? 29 : 26;
    const h = 6 - l - (top - 26);
    r(fx, top, 3, h, i < 2 ? 'D' : 'O');
    r(fx, top + h - 2, 3, 2, 'K');
  });

  // body
  const by = sit ? 21 : 17;
  r(9, by + b, 17, 9, 'O');
  r(11, by + b, 13, 1, 'L');
  r(10, by + 8 + b, 15, 1, 'D');
  r(14, by + 5 + b, 10, 3, 'C');

  const hy = (stretch ? 4 : 0) + (sit ? 2 : 0) + b;
  // ears with white insides (front ear taller, like the logo)
  r(22, 3 + hy, 4, 6, 'O'); r(23, 1 + hy, 2, 2, 'O'); r(23, 4 + hy, 2, 4, 'C');
  r(29, 2 + hy, 4, 7, 'O'); r(30, 0 + hy, 2, 2, 'O'); r(30, 3 + hy, 2, 5, 'C');
  // skull + spiky tufts
  r(21, 8 + hy, 13, 10, 'O');
  r(26, 5 + hy, 1, 3, 'O'); r(27, 4 + hy, 1, 4, 'O'); r(28, 6 + hy, 1, 2, 'O');
  r(19, 13 + hy, 2, 1, 'O'); r(20, 11 + hy, 1, 2, 'O'); r(20, 15 + hy, 1, 2, 'O');
  r(23, 8 + hy, 7, 1, 'L');
  // white muzzle (cheeks through snout)
  r(24, 14 + hy, 11, 4, 'C');
  r(33, 10 + hy, 4, 1, 'O');
  r(33, 11 + hy, 6, 5, 'C');
  r(30, 13 + hy, 3, 1, 'C');
  // nose: big, dark, shiny
  r(38, 10 + hy, 3, 3, 'K'); r(39, 10 + hy, 1, 1, 'L');
  r(36, 13 + hy, 1, 1, 'K'); // whisker dot
  // eye: white with pupil, cocky brow slanting toward the snout
  const eyes = pose.blink ? 'closed' : (pose.eyes || 'open');
  if (eyes === 'open') { r(28, 9 + hy, 4, 3, 'W'); r(30, 10 + hy, 2, 2, 'K'); }
  else if (eyes === 'closed') { r(28, 10 + hy, 4, 1, 'K'); }
  else if (eyes === 'happy') { r(28, 10 + hy, 1, 1, 'K'); r(29, 9 + hy, 2, 1, 'K'); r(31, 10 + hy, 1, 1, 'K'); }
  else if (eyes === 'wink') { r(28, 10 + hy, 4, 1, 'K'); r(29, 9 + hy, 2, 1, 'K'); }
  r(27, 7 + hy, 2, 1, 'K'); r(29, 8 + hy, 3, 1, 'K');
  // mouth: cheeky smirk, or open when talking
  if (pose.mouth) {
    r(29, 15 + hy, 7, 3, 'M'); r(30, 17 + hy, 4, 1, 'T'); r(30, 15 + hy, 5, 1, 'W');
  } else {
    r(29, 15 + hy, 1, 1, 'K'); r(30, 16 + hy, 6, 1, 'K'); // grin
    r(31, 15 + hy, 4, 1, 'W'); // teeth peeking
  }
  // snack time: a carrot that gets shorter with every bite (carrotBites 0..3)
  if (pose.carrotBites != null && pose.carrotBites < 4) {
    // bitten end in his mouth, leafy top sticking out in front
    const len = 8 - pose.carrotBites * 2, x0 = 41 - len;
    r(x0, 15 + hy, len, 3, 'R'); r(x0, 16 + hy, 1, 1, 'R2');
    if (len > 2) r(x0 + 2, 15 + hy, 1, 3, 'R2'); if (len > 5) r(x0 + 5, 15 + hy, 1, 3, 'R2');
    r(41, 14 + hy, 1, 1, 'G'); r(42, 13 + hy, 1, 2, 'G'); r(42, 16 + hy, 2, 1, 'G'); r(43, 14 + hy, 1, 2, 'G');
  }
  // morning coffee mug: held low (coffee 1) or at his mouth for a sip (coffee 2)
  if (pose.coffee) {
    const my = pose.coffee === 2 ? 13 + hy : 18 + hy, mx = pose.coffee === 2 ? 34 : 32;
    r(mx, my, 5, 6, 'W'); r(mx, my, 5, 1, 'Cf'); r(mx + 1, my + 3, 3, 1, 'Mg');
    r(mx - 1, my + 1, 1, 3, 'W'); // handle
  }
  // red bandana with white knot
  const sy = 17 + hy - (stretch ? 2 : 0);
  r(20, sy, 9, 3, 'B');
  r(20, sy + 1, 9, 1, 'K');
  r(21, sy, 2, 1, 'L');
  r(walking && f % 2 ? 25 : 26, sy + 3, 2, 2, 'W'); r(27, sy + 2, 1, 1, 'W');
}

function drawDadSleep(r, pose) {
  const b = pose.breath ? 1 : 0;
  r(9, 21 - b, 22, 11 + b, 'O');
  r(11, 20 - b, 18, 1, 'O');
  r(12, 21 - b, 14, 1, 'L');
  r(9, 31, 22, 1, 'D');
  // tail wrapped around front
  r(5, 27, 24, 5, 'O');
  r(6, 28, 20, 1, 'L');
  r(2, 26, 5, 6, 'C');
  r(1, 28, 1, 3, 'C');
  // head tucked in
  r(24, 20 - b, 11, 10 + b, 'O');
  r(25, 17 - b, 3, 3, 'O'); r(26, 18 - b, 1, 2, 'C');
  r(30, 17 - b, 3, 3, 'O'); r(31, 18 - b, 1, 2, 'C');
  r(26, 25, 9, 4, 'C');
  r(34, 23, 4, 4, 'C');
  r(37, 23, 2, 2, 'K');
  r(28, 23, 3, 1, 'K'); // closed eye
  r(27, 22, 4, 1, 'D');
  r(21, 24, 3, 5, 'B'); r(22, 29, 2, 1, 'W');
}

// ---------- yellow starburst (the logo's background) ----------
function drawStarburst(g, size, spin) {
  const c = size / 2, pts = 9;
  g.fillStyle = PAL.Y;
  g.beginPath();
  for (let i = 0; i < pts * 2; i++) {
    const ang = spin + (i / (pts * 2)) * Math.PI * 2;
    const rad = i % 2 ? c * 0.55 : c * (0.92 + 0.08 * Math.sin(i * 1.7));
    g.lineTo(c + Math.cos(ang) * rad, c + Math.sin(ang) * rad);
  }
  g.closePath(); g.fill();
}

// ---------- tiny props ----------
function drawHeart(g, x, y, s, c = '#ff4d6d') {
  const r = (a, b, w, h) => { g.fillStyle = c; g.fillRect(x + a * s, y + b * s, w * s, h * s); };
  r(1, 0, 2, 1); r(4, 0, 2, 1); r(0, 1, 7, 2); r(1, 3, 5, 1); r(2, 4, 3, 1); r(3, 5, 1, 1);
}
function drawBerry(g, x, y, s, gold) {
  const r = (a, b, w, h, c) => { g.fillStyle = c; g.fillRect(x + a * s, y + b * s, w * s, h * s); };
  const c1 = gold ? '#ffd23f' : '#e63946', c2 = gold ? '#fff3b0' : '#ff8a8a';
  r(1, 1, 4, 5, c1); r(0, 2, 6, 3, c1); r(1, 2, 1, 1, c2); r(2, 0, 2, 1, '#3a9d23'); r(3, -1, 1, 1, '#3a9d23');
}
function drawCarrotIcon(g, x, y, s) {
  const r = (a, b, w, h, c) => { g.fillStyle = PAL[c]; g.fillRect(x + a * s, y + b * s, w * s, h * s); };
  r(1, -3, 1, 3, 'G'); r(3, -3, 1, 3, 'G'); r(2, -4, 1, 4, 'G');
  r(0, 0, 5, 2, 'R'); r(1, 2, 3, 2, 'R'); r(2, 4, 1, 2, 'R'); r(1, 1, 3, 1, 'R2');
}
function drawBall(g, x, y, s) {
  const r = (a, b, w, h, c) => { g.fillStyle = c; g.fillRect(x + a * s, y + b * s, w * s, h * s); };
  r(1, 0, 3, 5, '#c6f432'); r(0, 1, 5, 3, '#c6f432'); r(1, 1, 1, 3, '#ffffff'); r(3, 1, 1, 3, '#ffffff');
}

window.Sprites = { drawCarrotIcon, drawDad, drawHeart, drawBerry, drawBall, drawStarburst, outline, PAL };

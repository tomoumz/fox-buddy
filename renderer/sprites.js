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

  if (sit) {
    // SITTING: tail curled on the ground, haunches tucked at the back,
    // upright chest right under his head, front legs straight down.
    r(3, 28, 12, 4, 'O'); r(5, 28, 8, 1, 'L'); r(0, 27, 4, 5, 'C'); r(1, 26, 2, 1, 'C');   // tail
    r(11, 20, 13, 12, 'O'); r(12, 19, 10, 1, 'O'); r(10, 23, 1, 8, 'O'); r(13, 20, 8, 1, 'L'); // haunch
    r(11, 31, 13, 1, 'D'); r(15, 23, 4, 1, 'D'); r(14, 24, 1, 1, 'D'); r(13, 25, 1, 5, 'D');      // rounded thigh line
    r(14, 30, 7, 2, 'K');                                                                        // back paw
    r(21, 16 + b, 9, 16 - b, 'O');                                                               // upright chest
    r(23, 19 + b, 7, 8 - b, 'C'); r(24, 18 + b, 5, 1, 'C');                                      // big white chest
    r(24, 26, 1, 6, 'D'); r(25, 26, 3, 6, 'O'); r(28, 26, 1, 6, 'D'); r(29, 26, 3, 6, 'O');      // front legs
    r(25, 30, 3, 2, 'K'); r(29, 30, 3, 2, 'K');                                                  // socks
  } else {
  // big bushy tail with white tip
  r(8, 17, 3, 4, 'O');
  r(3, 13 + w, 7, 7, 'O');
  r(4, 14 + w, 5, 1, 'L');
  r(2, 19 + w, 2, 1, 'O');
  r(1, 11 + w, 4, 5, 'O');
  r(0, 10 + w, 3, 3, 'C');

  // legs
  const lift = (i) => (walking ? ((f + i) % 2) : 0);
  const legs = [[10, 0], [14, 1], [20, 1], [24, 0]];
  legs.forEach(([x, phase], i) => {
    const l = lift(phase);
    const fx = stretch && i >= 2 ? x + 2 : x;
    const h = 6 - l;
    r(fx, 26, 3, h, i < 2 ? 'D' : 'O');
    r(fx, 26 + h - 2, 3, 2, 'K');
  });

  // body
  r(9, 17 + b, 17, 9, 'O');
  r(11, 17 + b, 13, 1, 'L');
  r(10, 25 + b, 15, 1, 'D');
  r(14, 22 + b, 10, 3, 'C');
  }

  const hy = (stretch ? 4 : 0) + (sit ? 3 : 0) + b;
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

// ---------------- TWINS (content grid 22 x 23) ----------------
// Sussie & Mimi: identical 3-year-old twins with big dark-brown eyes and a puff
// of brown curls. The only difference: Sussie's red headband, Mimi's hair tie.
const KIDPAL = { hair: '#4a220e', hair2: '#9a5526', hair3: '#c98a4b', eye: '#3a1a0a', red: '#8e0a1f', shine: '#ff6b81' };
function kidPx(g) { const r0 = px(g); return (x, y, w, h, c) => r0(x, y + 3, w, h, KIDPAL[c] || c); }
function ring(r, x, y, c, mid) { r(x, y, 3, 1, c); r(x, y + 2, 3, 1, c); r(x, y + 1, 1, 1, c); r(x + 2, y + 1, 1, 1, c); r(x + 1, y + 1, 1, 1, mid); }

function drawKit(g, pose) {
  const r = kidPx(g);
  const f = pose.frame || 0;
  const walking = pose.kind === 'walk';
  const b = walking ? (f % 2) : (pose.breath ? 1 : 0);
  const w = pose.wag || 0;
  // tail
  r(3, 11, 2, 2, 'O'); r(1, 9 + w, 3, 3, 'O'); r(0, 8 + w, 2, 2, 'C');
  // legs
  const l1 = walking ? f % 2 : 0, l2 = walking ? (f + 1) % 2 : 0;
  r(5, 16, 2, 3 - l1, 'D'); r(5, 18 - l1, 2, 1, 'K');
  r(10, 16, 2, 3 - l2, 'O'); r(10, 18 - l2, 2, 1, 'K');
  // body
  r(4, 11 + b, 9, 5, 'O'); r(5, 11 + b, 6, 1, 'L'); r(7, 14 + b, 5, 2, 'C');
  // big toddler head with white muzzle like dad
  const hy = b;
  r(10, 4 + hy, 9, 8, 'O'); r(11, 9 + hy, 7, 3, 'C'); r(18, 7 + hy, 3, 3, 'C'); r(20, 7 + hy, 1, 1, 'K');
  // high curly puff bun
  ring(r, 11, -3 + hy, 'hair2', 'hair'); ring(r, 14, -4 + hy, 'hair', 'hair3'); ring(r, 16, -2 + hy, 'hair2', 'hair');
  ring(r, 12, -1 + hy, 'hair', 'hair3'); ring(r, 10, 0 + hy, 'hair', 'hair2'); ring(r, 15, 0 + hy, 'hair2', 'hair');
  r(13, 2 + hy, 3, 2, 'hair'); r(14, 3 + hy, 1, 1, 'hair3');
  // ears poking out beside the bun
  r(9, 2 + hy, 2, 3, 'O'); r(9, 3 + hy, 1, 1, 'C'); r(9, 2 + hy, 1, 1, 'K');
  r(18, 2 + hy, 2, 3, 'O'); r(19, 3 + hy, 1, 1, 'C'); r(19, 2 + hy, 1, 1, 'K');
  // ringlets by the cheek + a wisp on the forehead
  r(10, 5 + hy, 1, 1, 'hair'); r(9, 6 + hy, 1, 2, 'hair2'); r(10, 8 + hy, 1, 1, 'hair'); r(16, 4 + hy, 1, 1, 'hair2');
  // the only difference between them
  if (pose.acc === 'headband') { r(11, 3 + hy, 7, 2, 'red'); r(12, 3 + hy, 2, 1, 'shine'); r(16, 3 + hy, 1, 1, 'shine'); }
  else r(13, 2 + hy, 3, 1, 'K');
  // big, soft dark-brown eyes
  const eyes = pose.blink ? 'closed' : (pose.eyes || 'open');
  if (eyes === 'open') { r(14, 5 + hy, 3, 3, 'W'); r(15, 5 + hy, 2, 3, 'eye'); r(15, 5 + hy, 1, 1, 'W'); r(14, 4 + hy, 3, 1, 'K'); r(17, 4 + hy, 1, 1, 'K'); }
  else if (eyes === 'happy') { r(14, 6 + hy, 1, 1, 'K'); r(15, 5 + hy, 2, 1, 'K'); r(17, 6 + hy, 1, 1, 'K'); }
  else { r(14, 6 + hy, 3, 1, 'K'); r(17, 5 + hy, 1, 1, 'K'); }
  r(13, 10 + hy, 1, 1, 'P');
  if (pose.mouth) r(17, 11 + hy, 3, 1, 'M'); else { r(17, 11 + hy, 2, 1, 'K'); r(16, 10 + hy, 1, 1, 'K'); }
}

// ---------------- CHILI PEPPER (content grid 26 x 32) ----------------
// A cute white bunny: long ears with pink insides, big lashy eyes, rosy cheeks,
// red lips and a little red chili-pepper clip on her ears.
const BUNPAL = { F: '#ffffff', F2: '#ece3ea', E: '#ff9fb8', eye: '#2a1420', lip: '#e0254a', chili: '#e01e1e', chili2: '#ff5a4a', stem: '#3a9d23', blush: '#ffb3c6' };
function bunPx(g) { const r0 = px(g); return (x, y, w, h, c) => r0(x, y, w, h, BUNPAL[c] || c); }
// pose.kind: 'stand' | 'walk' (hopping) | 'kiss' | 'hug'
function drawBunny(g, pose) {
  const r = bunPx(g);
  const air = pose.jump > 2;
  const b = pose.breath ? 1 : 0;
  // fluffy tail
  r(3, 20, 4, 4, 'F2'); r(2, 21, 1, 2, 'F2');
  // feet: tucked when hopping
  if (air) { r(6, 26, 7, 3, 'F'); r(13, 27, 5, 2, 'F'); }
  else { r(4, 28, 8, 3, 'F'); r(4, 30, 8, 1, 'F2'); r(13, 29, 5, 2, 'F'); }
  // round body + belly
  r(6, 17 + b, 13, 11 - b, 'F'); r(7, 16 + b, 10, 1, 'F'); r(6, 27, 13, 1, 'F2'); r(11, 20 + b, 7, 6, 'F2');
  // head
  const hy = b;
  r(11, 8 + hy, 11, 10, 'F'); r(12, 7 + hy, 8, 1, 'F'); r(21, 12 + hy, 3, 5, 'F');
  // long ears (flowing back while hopping)
  if (air) { r(5, 5 + hy, 8, 3, 'F'); r(6, 6 + hy, 6, 1, 'E'); r(4, 9 + hy, 8, 2, 'F'); r(5, 9 + hy, 5, 1, 'E'); }
  else {
    r(12, 0 + hy, 3, 8, 'F'); r(13, 1 + hy, 1, 6, 'E');
    r(16, 1 + hy, 3, 7, 'F'); r(17, 2 + hy, 1, 5, 'E'); r(19, 0 + hy, 1, 2, 'F');
  }
  // chili-pepper hair clip
  r(14, 7 + hy, 4, 2, 'chili'); r(18, 8 + hy, 1, 1, 'chili'); r(15, 7 + hy, 2, 1, 'chili2'); r(13, 7 + hy, 1, 1, 'stem'); r(12, 6 + hy, 1, 1, 'stem');
  // nose, cheek, lips
  r(23, 12 + hy, 1, 1, 'E');
  r(18, 14 + hy, 2, 1, 'blush');
  if (pose.kind === 'kiss') { r(22, 15 + hy, 2, 2, 'lip'); r(23, 15 + hy, 1, 1, 'chili2'); }
  else if (pose.mouth) { r(21, 15 + hy, 2, 2, 'lip'); }
  else { r(21, 15 + hy, 2, 1, 'lip'); }
  // big eyes with lashes (closed for kisses and hugs)
  const closed = pose.blink || pose.kind === 'kiss' || pose.kind === 'hug';
  if (closed) { r(17, 12 + hy, 3, 1, 'eye'); r(20, 11 + hy, 1, 1, 'eye'); }
  else { r(17, 10 + hy, 3, 3, 'eye'); r(17, 10 + hy, 1, 1, 'W'); r(18, 12 + hy, 1, 1, 'W'); r(20, 9 + hy, 1, 1, 'eye'); r(17, 9 + hy, 3, 1, 'eye'); }
  // arms
  if (pose.kind === 'hug') { r(17, 16 + hy, 5, 2, 'F'); r(21, 13 + hy, 2, 4, 'F'); r(8, 15 + hy, 2, 4, 'F'); r(6, 13 + hy, 3, 2, 'F'); }  // arms wide open
  else if (pose.kind === 'kiss') { r(18, 17 + hy, 3, 2, 'F'); r(21, 15 + hy, 2, 2, 'F'); }                                                     // hand to lips
  else { r(15, 19 + hy, 2, 5, 'F2'); }
}
// a big pixel kiss mark 💋
function drawLips(g, x, y, s, color = '#e0254a') {
  const rr = (a, b, w, h, c) => { g.fillStyle = c; g.fillRect(x + a * s, y + b * s, w * s, h * s); };
  rr(1, 0, 3, 1, color); rr(6, 0, 3, 1, color); rr(0, 1, 10, 2, color); rr(4, 1, 2, 1, '#ff7a90');
  rr(0, 3, 10, 1, '#9e1030'); rr(1, 4, 8, 2, color); rr(3, 6, 4, 1, color); rr(2, 4, 2, 1, '#ff7a90');
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

window.Sprites = { drawBunny, drawLips, drawKit, drawCarrotIcon, drawDad, drawHeart, drawBerry, drawBall, drawStarburst, outline, PAL };

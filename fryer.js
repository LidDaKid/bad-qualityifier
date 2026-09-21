(() => {
'use strict';

// Everything is fried at this size or smaller — big photos just make the damage harder to see.
const MAX_SIDE = 1280;

const SLIDERS = [
  { group: 'colors' },
  { id: 'sat',   label: 'saturation', min: 0,    max: 600, def: 100 },
  { id: 'con',   label: 'contrast',   min: 0,    max: 400, def: 100 },
  { id: 'bri',   label: 'brightness', min: -100, max: 100, def: 0 },
  { id: 'hue',   label: 'hue',        min: 0,    max: 360, def: 0 },
  { id: 'fry',   label: 'fry',        min: 0,    max: 100, def: 0 },
  { id: 'post',  label: 'posterize',  min: 0,    max: 100, def: 0 },
  { id: 'sol',   label: 'solarize',   min: 0,    max: 100, def: 0 },
  { group: 'crunch' },
  { id: 'pix',   label: 'pixels',     min: 1,    max: 64,  def: 1 },
  { id: 'jpg',   label: 'jpeg',       min: 0,    max: 100, def: 0 },
  { id: 'pass',  label: 'passes',     min: 1,    max: 30,  def: 1, needs: 'jpg' },
  { id: 'chunk', label: 'chunky',     min: 1,    max: 8,   def: 1, needs: 'jpg' },
  { id: 'sharp', label: 'sharpen',    min: 0,    max: 100, def: 0 },
  { id: 'noise', label: 'noise',      min: 0,    max: 100, def: 0 },
];

const PRESETS = {
  'crispy':     { sat: 190, con: 140, sharp: 30, noise: 8, jpg: 45, pass: 2 },
  'deep fried': { sat: 330, con: 190, bri: 8, fry: 60, sharp: 60, noise: 25, jpg: 82, pass: 6 },
  'nuked':      { sat: 600, con: 320, fry: 100, post: 55, sharp: 100, noise: 50, jpg: 100, pass: 14, chunk: 2 },
  'flip phone': { sat: 85, con: 115, bri: 6, pix: 4, noise: 18, jpg: 72, pass: 3, chunk: 2 },
  'cursed':     { sat: 260, con: 160, hue: 180, sol: 65, post: 40, jpg: 60, pass: 4 },
  '8-bit':      { sat: 150, con: 120, pix: 12, post: 78 },
};

// Sliders that feed the pixel stage. If none of these moved, the jpeg stage reuses the last result.
const PRE_KEYS = ['pix', 'sharp', 'sat', 'con', 'bri', 'hue', 'fry', 'post', 'sol', 'noise'];

const $ = s => document.querySelector(s);
const stage = $('#stage'), fileInput = $('#file'), toast = $('#toast');
const out = $('#out'), octx = out.getContext('2d');
const orig = $('#orig'), gctx = orig.getContext('2d');
const small = document.createElement('canvas'), sctx = small.getContext('2d', { willReadFrequently: true });
const pre = document.createElement('canvas'), pctx = pre.getContext('2d');
const tmp = document.createElement('canvas'), tctx = tmp.getContext('2d');

const vals = {}, rows = {};
let hasImage = false, hasAlpha = false, baseName = 'image', preKey = '';

// ---------- controls ----------

function paint(id) {
  const { input, output, spec } = rows[id];
  input.value = vals[id];
  output.textContent = vals[id];
  input.style.setProperty('--p', (vals[id] - spec.min) / (spec.max - spec.min) * 100 + '%');
  for (const r of Object.values(rows)) {
    if (r.spec.needs === id) r.row.classList.toggle('off', !vals[id]);
  }
}

function setVals(over = {}) {
  for (const s of SLIDERS) {
    if (!s.id) continue;
    vals[s.id] = over[s.id] ?? s.def;
    paint(s.id);
  }
  requestRender();
}

function markPreset(btn) {
  for (const b of $('#presets').children) b.classList.toggle('on', b === btn);
}

function buildControls() {
  const presets = $('#presets'), sliders = $('#sliders');
  const button = (text, cls, fn) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = text;
    b.className = cls;
    b.addEventListener('click', () => fn(b));
    presets.append(b);
  };
  for (const [name, over] of Object.entries(PRESETS)) {
    button(name, '', b => { setVals(over); markPreset(b); });
  }
  button('random', 'alt', () => { setVals(randomVals()); markPreset(null); });
  button('reset', 'alt', () => { setVals(); markPreset(null); });

  for (const s of SLIDERS) {
    if (s.group) {
      const h = document.createElement('h2');
      h.textContent = s.group;
      sliders.append(h);
      continue;
    }
    const row = document.createElement('label');
    row.className = 'sl';
    const name = document.createElement('span');
    name.textContent = s.label;
    const output = document.createElement('output');
    const input = document.createElement('input');
    Object.assign(input, { type: 'range', min: s.min, max: s.max, step: 1 });
    row.append(name, output, input);
    sliders.append(row);
    rows[s.id] = { row, input, output, spec: s };

    input.addEventListener('input', () => {
      vals[s.id] = +input.value;
      paint(s.id);
      markPreset(null);
      requestRender();
    });
    row.addEventListener('dblclick', e => {
      e.preventDefault();
      vals[s.id] = s.def;
      paint(s.id);
      markPreset(null);
      requestRender();
    });
  }
  setVals();
}

function randomVals() {
  const r = (a, b) => Math.round(a + Math.random() * (b - a));
  const maybe = (p, a, b) => Math.random() < p ? r(a, b) : undefined;
  return {
    sat: r(120, 520), con: r(100, 280), bri: r(-15, 25),
    hue: maybe(.35, 0, 360), fry: maybe(.6, 20, 100),
    post: maybe(.3, 20, 80), sol: maybe(.2, 30, 90),
    pix: maybe(.35, 2, 12),
    jpg: r(40, 100), pass: r(1, 12), chunk: maybe(.3, 2, 4),
    sharp: r(0, 80), noise: r(0, 45),
  };
}

// ---------- the fryer ----------

function mul3(a, b) {
  const m = new Array(9);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
    m[r * 3 + c] = a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c];
  }
  return m;
}

// hue → saturation → fry tint → contrast/brightness, folded into one 3x4 matrix
function colorMatrix(v) {
  const a = v.hue * Math.PI / 180, cs = Math.cos(a), sn = Math.sin(a);
  const hue = [
    .213 + cs * .787 - sn * .213, .715 - cs * .715 - sn * .715, .072 - cs * .072 + sn * .928,
    .213 - cs * .213 + sn * .143, .715 + cs * .285 + sn * .140, .072 - cs * .072 - sn * .283,
    .213 - cs * .213 - sn * .787, .715 - cs * .715 + sn * .715, .072 + cs * .928 + sn * .072,
  ];
  const s = v.sat / 100, t = 1 - s, lr = .2126, lg = .7152, lb = .0722;
  const sat = [
    lr * t + s, lg * t, lb * t,
    lr * t, lg * t + s, lb * t,
    lr * t, lg * t, lb * t + s,
  ];
  const m = mul3(sat, hue);
  const f = v.fry / 100, tint = [1 + .55 * f, 1 + .08 * f, 1 - .7 * f];
  const c = v.con / 100, k = 128 * (1 - c) + v.bri * 1.6;
  const o = [];
  for (let r = 0; r < 3; r++) o.push(c * tint[r] * m[r * 3], c * tint[r] * m[r * 3 + 1], c * tint[r] * m[r * 3 + 2], k);
  return o;
}

function toneLut(v) {
  const lut = new Uint8ClampedArray(256);
  const cut = v.sol ? 255 - v.sol * 2.1 : 256;  // solarize: flip everything brighter than this
  const levels = v.post ? Math.round(2 + (1 - v.post / 100) ** 2 * 22) : 0;
  for (let i = 0; i < 256; i++) {
    let x = i >= cut ? 255 - i : i;
    if (levels) x = Math.round(x / 255 * (levels - 1)) / (levels - 1) * 255;
    lut[i] = x;
  }
  return lut;
}

function sharpen(img, amt) {
  const { data, width: w, height: h } = img;
  const a = (amt / 100) ** 1.5 * 6;  // 6 is way past sensible, on purpose
  const c = 1 + 4 * a;
  const s = new Uint8ClampedArray(data);
  for (let y = 0; y < h; y++) {
    const yc = y * w, yu = (y > 0 ? y - 1 : y) * w, yd = (y < h - 1 ? y + 1 : y) * w;
    for (let x = 0; x < w; x++) {
      const xl = x > 0 ? x - 1 : x, xr = x < w - 1 ? x + 1 : x;
      const i = (yc + x) * 4, u = (yu + x) * 4, d = (yd + x) * 4, l = (yc + xl) * 4, r = (yc + xr) * 4;
      data[i]     = c * s[i]     - a * (s[u]     + s[d]     + s[l]     + s[r]);
      data[i + 1] = c * s[i + 1] - a * (s[u + 1] + s[d + 1] + s[l + 1] + s[r + 1]);
      data[i + 2] = c * s[i + 2] - a * (s[u + 2] + s[d + 2] + s[l + 2] + s[r + 2]);
    }
  }
}

function grade(img, v) {
  const d = img.data, m = colorMatrix(v), lut = toneLut(v), n = v.noise * 1.3;
  let seed = 0x9e3779b9;  // fixed seed so the grain holds still while other sliders move
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    let R = m[0] * r + m[1] * g + m[2]  * b + m[3];
    let G = m[4] * r + m[5] * g + m[6]  * b + m[7];
    let B = m[8] * r + m[9] * g + m[10] * b + m[11];
    R = lut[R < 0 ? 0 : R > 255 ? 255 : R | 0];
    G = lut[G < 0 ? 0 : G > 255 ? 255 : G | 0];
    B = lut[B < 0 ? 0 : B > 255 ? 255 : B | 0];
    if (n) {
      seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
      R += ((seed & 255) - 127.5) / 127.5 * n;
      G += ((seed >>> 8 & 255) - 127.5) / 127.5 * n;
      B += ((seed >>> 16 & 255) - 127.5) / 127.5 * n;
    }
    d[i] = R; d[i + 1] = G; d[i + 2] = B;
  }
}

// shrink → sharpen → colors → noise, then blow back up with hard pixel edges
function buildPre(v, W, H) {
  const sw = Math.max(1, Math.round(W / v.pix)), sh = Math.max(1, Math.round(H / v.pix));
  small.width = sw; small.height = sh;
  sctx.imageSmoothingQuality = 'high';
  sctx.drawImage(orig, 0, 0, sw, sh);
  const img = sctx.getImageData(0, 0, sw, sh);
  if (v.sharp) sharpen(img, v.sharp);
  grade(img, v);
  sctx.putImageData(img, 0, 0);
  pre.width = W; pre.height = H;
  pctx.imageSmoothingEnabled = false;
  pctx.drawImage(small, 0, 0, W, H);
}

async function jpegify(from, v, W, H) {
  const q = .5 * (1 - v.jpg / 100) ** 1.5;
  const w = Math.max(16, Math.round(W / v.chunk)), h = Math.max(16, Math.round(H / v.chunk));
  let cur = from;
  for (let i = 0; i < v.pass; i++) {
    // Re-saving on the same 8x8 grid stops doing damage after a pass or two, so slide the grid each time.
    const dx = i * 3 % 8, dy = i * 5 % 8;
    tmp.width = w + 8; tmp.height = h + 8;
    tctx.drawImage(cur, 0, 0, w + 8, h + 8);  // fills the margin so no black border bleeds in
    tctx.drawImage(cur, dx, dy, w, h);
    const blob = await new Promise(res => tmp.toBlob(res, 'image/jpeg', q));
    if (!blob) break;
    const bmp = await createImageBitmap(blob, dx, dy, w, h);
    if (cur !== from) cur.close();
    cur = bmp;
  }
  return cur;
}

async function render() {
  const v = { ...vals }, W = orig.width, H = orig.height;
  const key = PRE_KEYS.map(k => v[k]).join();
  if (key !== preKey) { buildPre(v, W, H); preKey = key; }

  const final = v.jpg ? await jpegify(pre, v, W, H) : pre;
  octx.globalCompositeOperation = 'copy';
  octx.imageSmoothingQuality = 'low';
  octx.drawImage(final, 0, 0, W, H);
  if (hasAlpha && final !== pre) {
    // jpeg has no see-through, so cut the original shape back out
    octx.globalCompositeOperation = 'destination-in';
    octx.drawImage(pre, 0, 0);
  }
  if (final !== pre) final.close();
}

let running = false, dirty = false;
function requestRender() {
  if (!hasImage) return;
  dirty = true;
  if (!running) pump();
}
async function pump() {
  running = true;
  stage.dataset.busy = '';
  try {
    while (dirty) { dirty = false; await render(); }
  } finally {
    running = false;
    delete stage.dataset.busy;
  }
}

// ---------- getting images in ----------

function decode(blob) {
  return createImageBitmap(blob).catch(() => new Promise((res, rej) => {
    const img = new Image(), url = URL.createObjectURL(blob);
    img.onload = () => { URL.revokeObjectURL(url); res(img); };
    img.onerror = () => { URL.revokeObjectURL(url); rej(); };
    img.src = url;
  }));
}

let toastTimer;
function say(text) {
  toast.textContent = text;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 2200);
}

async function load(blob, name) {
  let pic;
  try { pic = await decode(blob); } catch { say("can't open that one"); return; }
  const pw = pic.naturalWidth || pic.width, ph = pic.naturalHeight || pic.height;
  if (!pw || !ph) { say("can't open that one"); return; }
  const k = Math.min(1, MAX_SIDE / Math.max(pw, ph));
  const W = Math.max(1, Math.round(pw * k)), H = Math.max(1, Math.round(ph * k));
  orig.width = out.width = W;
  orig.height = out.height = H;
  gctx.imageSmoothingQuality = 'high';
  gctx.drawImage(pic, 0, 0, W, H);
  if (pic.close) pic.close();

  const a = gctx.getImageData(0, 0, W, H).data;
  hasAlpha = false;
  for (let i = 3; i < a.length; i += 4) if (a[i] < 255) { hasAlpha = true; break; }

  baseName = (name || 'image').replace(/\.[^.]*$/, '') || 'image';
  preKey = '';
  hasImage = true;
  document.body.classList.add('has-img');
  for (const id of ['peek', 'copy', 'save']) $('#' + id).disabled = false;
  requestRender();
}

const firstImage = files => [...files].find(f => f.type.startsWith('image/'));

$('#open').addEventListener('click', () => fileInput.click());
$('#drop').addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => {
  const f = fileInput.files[0];
  if (f) load(f, f.name);
  fileInput.value = '';
});

addEventListener('paste', e => {
  const f = firstImage(e.clipboardData.files);
  if (f) { e.preventDefault(); load(f, 'pasted'); }
});

let dragDepth = 0;
const setDragging = on => document.body.classList.toggle('dragging', on);
addEventListener('dragenter', e => { e.preventDefault(); dragDepth++; setDragging(true); });
addEventListener('dragleave', () => { if (--dragDepth <= 0) { dragDepth = 0; setDragging(false); } });
addEventListener('dragover', e => e.preventDefault());
addEventListener('drop', e => {
  e.preventDefault();
  dragDepth = 0;
  setDragging(false);
  const f = firstImage(e.dataTransfer.files);
  if (f) load(f, f.name);
  else say("can't open that one");
});

// ---------- getting images out ----------

// hold the button (or the picture itself) to see the original
const peekBtn = $('#peek');
const peek = on => { stage.classList.toggle('peek', on); peekBtn.classList.toggle('held', on); };
for (const el of [peekBtn, out, orig]) {
  el.addEventListener('pointerdown', e => {
    if (!hasImage) return;
    el.setPointerCapture(e.pointerId);
    peek(true);
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) el.addEventListener(type, () => peek(false));
  el.addEventListener('contextmenu', e => e.preventDefault());
}
peekBtn.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') peek(true); });
peekBtn.addEventListener('keyup', () => peek(false));
peekBtn.addEventListener('blur', () => peek(false));

function flash(btn, text) {
  const was = btn.dataset.label || (btn.dataset.label = btn.textContent);
  btn.textContent = text;
  setTimeout(() => { btn.textContent = was; }, 1100);
}

const saveBtn = $('#save');
saveBtn.addEventListener('click', () => {
  const png = hasAlpha;  // jpg can't do see-through
  out.toBlob(blob => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${baseName}_fried.${png ? 'png' : 'jpg'}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
    flash(saveBtn, 'saved');
  }, png ? 'image/png' : 'image/jpeg', .92);
});

const copyBtn = $('#copy');
if (!navigator.clipboard || !window.ClipboardItem) copyBtn.hidden = true;
copyBtn.addEventListener('click', async () => {
  try {
    const png = new Promise(res => out.toBlob(res, 'image/png'));
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
    flash(copyBtn, 'copied');
  } catch {
    say("couldn't copy");
  }
});

buildControls();
})();

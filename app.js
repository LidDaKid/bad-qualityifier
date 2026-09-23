(() => {
'use strict';

const FULL = 1280, QUICK = 720, THUMB = 132, SAVE = 2560;

// [id, label, min, max, default, needs?]  |  {colors}/{color} rows  |  {toggles}
const SECTIONS = [
  ['adjust', [
    ['exposure', 'exposure', -100, 100, 0],
    ['brilliance', 'brilliance', -100, 100, 0],
    ['highlights', 'highlights', -100, 100, 0],
    ['shadows', 'shadows', -100, 100, 0],
    ['con', 'contrast', -100, 100, 0],
    ['bri', 'brightness', -100, 100, 0],
    ['black', 'black point', -100, 100, 0],
    ['sat', 'saturation', -100, 400, 0],
    ['vib', 'vibrance', -100, 100, 0],
    ['warm', 'warmth', -100, 100, 0],
    ['tint', 'tint', -100, 100, 0],
    ['sharp', 'sharpness', 0, 100, 0],
    ['def', 'definition', 0, 100, 0],
    ['nr', 'noise reduction', 0, 100, 0],
    ['vig', 'vignette', -100, 100, 0],
  ]],
  ['color', [
    ['hue', 'hue', -180, 180, 0],
    ['fade', 'fade', 0, 100, 0],
    ['sepia', 'sepia', 0, 100, 0],
    ['invert', 'invert', 0, 100, 0],
    ['post', 'posterize', 0, 100, 0],
    ['sol', 'solarize', 0, 100, 0],
    ['thresh', 'threshold', 0, 100, 0],
    ['duo', 'duotone', 0, 100, 0],
    { id: 'duoc', label: 'duotone colors', colors: ['#1a0b2e', '#ff3d9a'] },
    ['splash', 'color splash', 0, 100, 0],
    ['splashhue', 'keep hue', 0, 360, 330, 'splash'],
  ]],
  ['fry', [
    ['fry', 'fry', 0, 100, 0],
    ['pix', 'pixels', 1, 64, 1],
    ['jpg', 'jpeg', 0, 100, 0],
    ['pass', 'passes', 1, 30, 1, 'jpg'],
    ['chunk', 'chunky', 1, 8, 1, 'jpg'],
    ['noise', 'noise', 0, 100, 0],
    ['grain', 'grain', 0, 100, 0],
  ]],
  ['blur', [
    ['blur', 'blur', 0, 100, 0],
    ['motion', 'motion blur', 0, 100, 0],
    ['angle', 'angle', 0, 180, 0, 'motion'],
    ['zoom', 'zoom blur', 0, 100, 0],
    ['spin', 'spin blur', 0, 100, 0],
    ['tilt', 'tilt shift', 0, 100, 0],
    ['focus', 'focus', 0, 100, 50, 'tilt'],
    ['soft', 'soft focus', 0, 100, 0],
  ]],
  ['light', [
    ['glow', 'glow', 0, 100, 0],
    ['leak', 'light leak', 0, 100, 0],
    ['leakhue', 'leak hue', 0, 360, 20, 'leak'],
    ['flare', 'lens flare', 0, 100, 0],
    ['flarepos', 'flare spot', 0, 100, 30, 'flare'],
    ['wash', 'wash', 0, 100, 0],
    ['washhue', 'wash hue', 0, 360, 300, 'wash'],
  ]],
  ['glitch', [
    ['rgb', 'rgb shift', 0, 100, 0],
    ['aber', 'aberration', 0, 100, 0],
    ['vhs', 'vhs', 0, 100, 0],
    ['scan', 'scanlines', 0, 100, 0],
    ['slices', 'slices', 0, 100, 0],
    ['blocks', 'blocks', 0, 100, 0],
    ['sort', 'pixel sort', 0, 100, 0],
  ]],
  ['art', [
    ['edges', 'edges', 0, 100, 0],
    ['outline', 'outline', 0, 100, 0],
    ['emboss', 'emboss', 0, 100, 0],
    ['oil', 'oil paint', 0, 100, 0],
    ['half', 'halftone', 0, 100, 0],
    ['led', 'led', 0, 100, 0],
    ['dither', 'dither', 0, 100, 0],
  ]],
  ['warp', [
    ['bulge', 'bulge', -100, 100, 0],
    ['swirl', 'swirl', -100, 100, 0],
    ['fish', 'fisheye', -100, 100, 0],
    ['wave', 'wave', 0, 100, 0],
    ['ripple', 'ripple', 0, 100, 0],
    ['stretch', 'stretch', -100, 100, 0],
    ['kaleido', 'kaleidoscope', 0, 100, 0],
    { toggles: [['mirrorH', 'mirror left'], ['mirrorV', 'mirror top']] },
  ]],
  ['frame', [
    ['border', 'border', 0, 100, 0],
    { id: 'bcolor', label: 'border color', color: '#ffffff' },
    ['corners', 'corners', 0, 100, 0],
    { toggles: [['polaroid', 'polaroid'], ['date', 'date stamp']] },
  ]],
];

const PRESETS = [
  ['original', {}],
  ['vivid', { sat: 35, con: 15, vib: 20, shadows: 10, highlights: -5 }],
  ['vivid warm', { sat: 35, con: 15, vib: 20, warm: 30 }],
  ['vivid cool', { sat: 35, con: 15, vib: 20, warm: -30 }],
  ['dramatic', { con: 35, shadows: -25, highlights: -20, sat: -10, black: 15 }],
  ['dramatic warm', { con: 35, shadows: -25, highlights: -20, sat: -10, black: 15, warm: 35 }],
  ['dramatic cool', { con: 35, shadows: -25, highlights: -20, sat: -10, black: 15, warm: -35 }],
  ['mono', { sat: -100, con: 10 }],
  ['silvertone', { sat: -100, con: 5, fade: 25, bri: 5 }],
  ['noir', { sat: -100, con: 45, black: 30, shadows: -20, vig: 35 }],
  // instagram, as close as sliders get
  ['clarendon', { con: 12, sat: 35, highlights: 10, wash: 12, washhue: 205 }],
  ['gingham', { bri: 6, hue: -10, fade: 30, con: -12, sat: -15, wash: 22, washhue: 240 }],
  ['moon', { sat: -100, con: 8, bri: 12, fade: 20 }],
  ['lark', { con: -10, bri: 12, sat: 10, warm: -8, highlights: 10 }],
  ['reyes', { sepia: 22, bri: 12, con: -14, sat: -25, fade: 20, warm: 10 }],
  ['juno', { sepia: 15, con: 15, bri: 12, sat: 60, warm: 12, wash: 10, washhue: 205 }],
  ['slumber', { sat: -34, bri: 6, warm: 20, wash: 25, washhue: 40, fade: 12, con: -5 }],
  ['crema', { sepia: 30, con: 22, bri: 14, sat: -10, hue: -2, warm: 8 }],
  ['ludwig', { sepia: 20, con: 5, bri: 5, sat: 70, wash: 8, washhue: 210 }],
  ['aden', { hue: -20, con: -10, sat: -15, bri: 22, fade: 15, wash: 12, washhue: 350 }],
  ['perpetua', { con: 10, bri: 25, sat: 10, wash: 30, washhue: 195 }],
  ['amaro', { sepia: 20, con: 10, bri: 20, sat: 30, vig: 15, glow: 10 }],
  ['mayfair', { con: 10, sat: 10, warm: 15, vig: 20, bri: 6, glow: 8 }],
  ['rise', { bri: 8, sepia: 20, con: -10, sat: -10, warm: 15, glow: 25, vig: 15 }],
  ['hudson', { bri: 20, con: -10, sat: 10, warm: -20, vig: 35, wash: 15, washhue: 215 }],
  ['valencia', { con: 8, bri: 10, sepia: 8, warm: 12, fade: 15, wash: 10, washhue: 320 }],
  ['x-pro ii', { sepia: 30, sat: 40, con: 25, vig: 55, warm: 10 }],
  ['sierra', { sepia: 25, con: -10, sat: -10, bri: 5, vig: 30, warm: 10, fade: 15 }],
  ['willow', { sat: -60, con: -5, bri: -8, vig: 25, fade: 10 }],
  ['lo-fi', { sat: 15, con: 45, vig: 45, black: 10 }],
  ['inkwell', { sat: -100, sepia: 30, con: 10, bri: 10 }],
  ['hefe', { sepia: 15, con: 15, bri: 8, sat: 25, vig: 40 }],
  ['nashville', { sepia: 20, con: 20, bri: 5, sat: 20, fade: 25, wash: 30, washhue: 15, warm: 15 }],
  ['stinson', { con: -25, sat: -15, bri: 15, wash: 15, washhue: 10, fade: 15 }],
  ['earlybird', { con: -10, sepia: 25, warm: 20, vig: 40, bri: 5, glow: 8 }],
  ['brannan', { sepia: 40, con: 40, wash: 20, washhue: 285, bri: 5 }],
  ['sutro', { sat: -30, con: 20, bri: -10, vig: 55, sepia: 20, hue: -5 }],
  ['toaster', { con: 40, bri: -8, warm: 35, vig: 40, wash: 25, washhue: 25, glow: 15 }],
  ['walden', { bri: 12, hue: -10, sepia: 30, sat: 60, wash: 15, washhue: 225 }],
  ['1977', { con: 10, bri: 12, sat: 30, wash: 35, washhue: 320, fade: 10 }],
  ['kelvin', { warm: 50, sat: 30, con: 15, bri: 10, wash: 35, washhue: 30, glow: 10 }],
  ['maven', { sepia: 25, bri: -5, con: -5, sat: 50, warm: -5, wash: 10, washhue: 270 }],
  // instagram's city ones
  ['rio de janeiro', { warm: 30, sat: 35, con: 10, bri: 8, highlights: 10, wash: 10, washhue: 30 }],
  ['tokyo', { sat: -100, con: 20, bri: 5, wash: 12, washhue: 210 }],
  ['oslo', { sat: -20, con: 20, warm: -25, shadows: -10, wash: 10, washhue: 215 }],
  ['melbourne', { fade: 20, warm: 20, con: -8, sat: -10, bri: 6 }],
  ['jakarta', { con: 25, sat: 20, warm: -15, shadows: -20, vig: 25 }],
  ['abu dhabi', { warm: 30, fade: 25, con: -10, sat: -5, bri: 8 }],
  ['buenos aires', { warm: 20, sat: 30, con: 15, tint: 15, wash: 12, washhue: 340 }],
  ['new york', { con: 30, sat: -30, warm: -15, black: 15, vig: 20 }],
  ['jaipur', { bri: 12, sat: 35, warm: 15, wash: 15, washhue: 320, con: 8 }],
  ['cairo', { sepia: 25, warm: 25, fade: 20, con: -5, sat: -5 }],
  ['lagos', { sat: 40, con: 20, warm: 25, glow: 8 }],
  ['los angeles', { bri: 15, fade: 25, con: -15, sat: 10, warm: 10, wash: 12, washhue: 300 }],
  ['paris', { fade: 30, sat: -10, wash: 25, washhue: 330, con: -10, bri: 8 }],
  ['sydney', { bri: 8, con: 12, sat: 20, warm: -20, wash: 10, washhue: 200 }],
  ['fade', { fade: 45, sat: -15, con: -10, warm: 10 }],
  ['film', { grain: 30, fade: 20, con: 12, sat: -8, warm: 15, vig: 25, highlights: -10 }],
  ['golden', { warm: 50, sat: 15, bri: 8, glow: 25, highlights: 10 }],
  ['moody', { sat: -30, con: 20, shadows: -30, black: 20, warm: -15, tint: 15, vig: 40 }],
  ['pastel', { fade: 35, sat: 20, bri: 15, con: -20, wash: 25, washhue: 300 }],
  ['90s', { warm: 20, sat: 10, grain: 25, fade: 15, con: 10, date: 1, vig: 15 }],
  ['disposable', { bri: 10, con: 25, sat: 15, grain: 35, vig: 45, warm: 15, date: 1, highlights: 20 }],
  ['polaroid', { polaroid: 1, fade: 25, warm: 10, sat: -5, grain: 15, vig: 20, bcolor: '#f3efe4' }],
  ['dream', { glow: 50, soft: 45, bri: 8, sat: 10, fade: 15 }],
  ['emo', { sat: -40, con: 15, duo: 35, duoc: ['#0a0210', '#ff3d9a'], vig: 35, grain: 20, fade: 10 }],
  ['crispy', { sat: 90, con: 30, sharp: 30, noise: 8, jpg: 45, pass: 2 }],
  ['deep fried', { sat: 230, con: 55, bri: 8, fry: 60, sharp: 60, noise: 25, jpg: 82, pass: 6 }],
  ['nuked', { sat: 400, con: 100, fry: 100, post: 55, sharp: 100, noise: 50, jpg: 100, pass: 14, chunk: 2 }],
  ['flip phone', { sat: -15, con: 10, bri: 6, pix: 4, noise: 18, jpg: 72, pass: 3, chunk: 2 }],
  ['cursed', { sat: 160, con: 40, hue: 180, sol: 65, post: 40, jpg: 60, pass: 4 }],
  ['8-bit', { sat: 50, con: 15, pix: 12, post: 78 }],
  ['gameboy', { sat: -100, pix: 6, dither: 100, duo: 100, duoc: ['#0f380f', '#9bbc0f'], con: 15 }],
  ['vhs', { vhs: 60, scan: 35, noise: 12, sat: -10, con: 10, fade: 15, blur: 8, jpg: 30, pass: 2 }],
  ['glitch', { rgb: 35, slices: 45, blocks: 30, scan: 20, con: 15, sat: 25 }],
  ['bad signal', { rgb: 20, vhs: 40, sort: 35, noise: 25, scan: 40, pix: 2, jpg: 55, pass: 3 }],
  ['neon', { edges: 100, sat: 200, con: 20, glow: 60, hue: -20, bri: 10 }],
  ['comic', { post: 60, outline: 90, sat: 40, con: 20 }],
  ['sketch', { edges: 100, invert: 100, sat: -100, con: 30 }],
  ['oil', { oil: 70, sat: 20, con: 10 }],
  ['newspaper', { sat: -100, half: 55, con: 20 }],
  ['thermal', { duo: 100, duoc: ['#12005e', '#ffe14d'], con: 25, blur: 5 }],
  ['x-ray', { invert: 100, sat: -100, con: 20, glow: 30 }],
  ['fisheye', { fish: 70, vig: 30 }],
  ['kaleido', { kaleido: 45, sat: 30 }],
  ['mirror', { mirrorH: 1 }],
  ['drunk', { swirl: 25, wave: 30, rgb: 20, blur: 6, sat: 20 }],
  ['bulge', { bulge: 70 }],
  ['pinch', { bulge: -60 }],
];

// sliders "random" is allowed to touch (the rest look like mistakes when rolled blind)
const FUN = ['sat', 'con', 'hue', 'fry', 'post', 'sol', 'pix', 'jpg', 'pass', 'noise', 'grain', 'glow', 'leak', 'rgb', 'vhs',
  'scan', 'slices', 'sort', 'edges', 'outline', 'half', 'dither', 'bulge', 'swirl', 'fish', 'wave', 'kaleido', 'vig', 'blur', 'zoom'];

const $ = s => document.querySelector(s);
const stage = $('#stage'), frameEl = $('.frame'), fileInput = $('#file'), toast = $('#toast');
const out = $('#out'), octx = out.getContext('2d');
const orig = $('#orig'), gctx = orig.getContext('2d');
const P1 = new FX.Pipeline(), P2 = new FX.Pipeline();

const DEF = {}, vals = {}, rows = {}, secOf = {}, secEls = {}, thumbs = {};
let pristine = null, hasAlpha = false, baseName = 'image', outAlpha = false;
const xf = { rot: 0, flipH: false, flipV: false, crop: null };
const sources = new Map();

const copyVal = x => Array.isArray(x) ? [...x] : x;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const merged = over => { const v = {}; for (const k in DEF) v[k] = copyVal(over[k] ?? DEF[k]); return v; };
const fmt = (n, spec) => spec.min < 0 && n > 0 ? '+' + n : String(n);

// ---------- controls ----------

function paint(id) {
  const r = rows[id];
  if (r.kind === 'slider') {
    const { input, output, spec } = r;
    input.value = vals[id];
    output.textContent = fmt(vals[id], spec);
    const span = spec.max - spec.min, z = (Math.max(spec.min, 0) - spec.min) / span, p = (vals[id] - spec.min) / span;
    input.style.setProperty('--a', Math.min(z, p) * 100 + '%');
    input.style.setProperty('--b', Math.max(z, p) * 100 + '%');
    for (const o of Object.values(rows)) if (o.spec && o.spec.needs === id) o.row.classList.toggle('off', !vals[id]);
  } else if (r.kind === 'toggle') {
    r.btn.classList.toggle('on', !!vals[id]);
  } else {
    r.inputs.forEach((inp, i) => { inp.value = Array.isArray(vals[id]) ? vals[id][i] : vals[id]; });
  }
}

function paintAll() { for (const id in rows) paint(id); counts(); }

function counts() {
  for (const [sid, el] of Object.entries(secEls)) {
    const n = el.ids.filter(id => !same(vals[id], DEF[id])).length;
    el.count.textContent = n || '';
    el.reset.hidden = !n;
  }
}

function setVals(over = {}) {
  for (const k in DEF) vals[k] = copyVal(over[k] ?? DEF[k]);
  paintAll();
  // unfold every section this look touched, so the sliders behind it are right there
  for (const el of Object.values(secEls)) if (el.count.textContent) el.sec.classList.add('open');
  requestRender(false);
}

function changed(id, quick) {
  paint(id);
  counts();
  markPreset(null);
  requestRender(quick);
}

function buildControls() {
  const host = $('#sections');
  const open = new Set(JSON.parse(localStorage.getItem('bq-open') || '["adjust"]'));
  for (const [sid, specs] of SECTIONS) {
    const sec = document.createElement('section');
    sec.className = 'sec' + (open.has(sid) ? ' open' : '');
    const head = document.createElement('div'); head.className = 'sec-h';
    const tog = document.createElement('button'); tog.type = 'button'; tog.className = 'sec-t';
    tog.innerHTML = `<span class="n">${sid}</span><output></output>`;
    const reset = document.createElement('button'); reset.type = 'button'; reset.className = 'sec-r'; reset.textContent = 'reset'; reset.hidden = true;
    head.append(tog, reset);
    const body = document.createElement('div'); body.className = 'sec-b';
    sec.append(head, body);
    host.append(sec);
    const ids = [];
    secEls[sid] = { sec, count: tog.querySelector('output'), reset, ids };

    tog.addEventListener('click', () => {
      sec.classList.toggle('open');
      const cur = [...document.querySelectorAll('.sec.open')].map(s => s.querySelector('.n').textContent);
      localStorage.setItem('bq-open', JSON.stringify(cur));
    });
    reset.addEventListener('click', () => {
      for (const id of ids) { vals[id] = copyVal(DEF[id]); paint(id); }
      counts(); markPreset(null); requestRender(false);
    });

    for (const s of specs) {
      if (Array.isArray(s)) {
        const [id, label, min, max, def, needs] = s;
        const spec = { min, max, def, needs };
        DEF[id] = def; ids.push(id); secOf[id] = sid;
        const row = document.createElement('label'); row.className = 'sl';
        const name = document.createElement('span'); name.textContent = label;
        const output = document.createElement('output');
        output.title = 'type a number';
        const input = document.createElement('input');
        Object.assign(input, { type: 'range', min, max, step: 1 });
        row.append(name, output, input); body.append(row);
        rows[id] = { kind: 'slider', row, input, output, spec };
        input.addEventListener('input', () => { vals[id] = +input.value; changed(id, true); });
        input.addEventListener('change', () => requestRender(false));
        row.addEventListener('dblclick', e => { e.preventDefault(); vals[id] = def; changed(id, false); });
        // click the number to type one
        output.addEventListener('click', e => {
          e.preventDefault();
          const box = document.createElement('input');
          Object.assign(box, { type: 'number', min, max, value: vals[id], className: 'num' });
          output.replaceWith(box); box.focus(); box.select();
          const done = () => {
            const n = Math.round(+box.value);
            if (box.value !== '' && !Number.isNaN(n)) { vals[id] = Math.max(min, Math.min(max, n)); }
            box.replaceWith(output); changed(id, false);
          };
          box.addEventListener('blur', done);
          box.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === 'Escape') box.blur(); });
        });
      } else if (s.toggles) {
        const wrap = document.createElement('div'); wrap.className = 'tgs';
        for (const [id, label] of s.toggles) {
          DEF[id] = 0; ids.push(id); secOf[id] = sid;
          const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'tg'; btn.textContent = label;
          wrap.append(btn);
          rows[id] = { kind: 'toggle', btn };
          btn.addEventListener('click', () => { vals[id] = vals[id] ? 0 : 1; changed(id, false); });
        }
        body.append(wrap);
      } else {
        const id = s.id, defs = s.colors || [s.color];
        DEF[id] = s.colors ? [...s.colors] : s.color; ids.push(id); secOf[id] = sid;
        const row = document.createElement('div'); row.className = 'sl colors';
        const name = document.createElement('span'); name.textContent = s.label;
        const wrap = document.createElement('span'); wrap.className = 'sw';
        const inputs = defs.map((c, i) => {
          const inp = document.createElement('input'); inp.type = 'color'; inp.value = c;
          inp.addEventListener('input', () => {
            if (s.colors) vals[id][i] = inp.value; else vals[id] = inp.value;
            counts(); markPreset(null); requestRender(true);
          });
          wrap.append(inp);
          return inp;
        });
        row.append(name, wrap); body.append(row);
        rows[id] = { kind: 'color', inputs };
      }
    }
  }
  for (const k in DEF) vals[k] = copyVal(DEF[k]);
  paintAll();
}

// her own saved looks live in localStorage, and sit right after "original" in the strip
let LOOKS = [];
try { LOOKS = JSON.parse(localStorage.getItem('bq-looks') || '[]'); } catch { LOOKS = []; }
const saveLooks = () => { try { localStorage.setItem('bq-looks', JSON.stringify(LOOKS)); } catch { say("couldn't save that here"); } };
const allPresets = () => [PRESETS[0], ...LOOKS, ...PRESETS.slice(1)];
const presetVals = name => allPresets().find(p => p[0] === name)[1];

function filterButton(name, mine) {
  const b = document.createElement('button'); b.type = 'button'; b.className = 'filt' + (mine ? ' mine' : ''); b.dataset.name = name;
  const c = document.createElement('canvas'); c.width = c.height = 1;
  const l = document.createElement('span'); l.textContent = name;
  b.append(c, l);
  thumbs[name] = c;
  b.addEventListener('click', () => { setVals(presetVals(name)); markPreset(name); });
  if (mine) {
    const x = document.createElement('i'); x.className = 'x'; x.textContent = 'x';
    x.addEventListener('click', e => {
      e.stopPropagation();
      if (!confirm(`delete "${name}"?`)) return;
      LOOKS = LOOKS.filter(p => p[0] !== name);
      saveLooks();
      b.remove(); delete thumbs[name];
    });
    b.append(x);
  }
  return b;
}
function buildFilters() {
  const strip = $('#filters');
  strip.replaceChildren(...allPresets().map(([name]) => filterButton(name, LOOKS.some(p => p[0] === name))));
}
function markPreset(name) {
  for (const b of $('#filters').children) b.classList.toggle('on', b.dataset.name === name);
}

// look <-> short text, only the sliders that moved: "sat=230,con=55,duoc=1a0b2e.ff3d9a"
function encodeLook(v) {
  const parts = [];
  for (const k in DEF) {
    if (same(v[k], DEF[k])) continue;
    const x = v[k];
    parts.push(k + '=' + (Array.isArray(x) ? x.map(c => c.slice(1)).join('.') : typeof x === 'string' ? x.slice(1) : x));
  }
  return parts.join(',');
}
function decodeLook(s) {
  const v = {}, HEX = /^[0-9a-f]{6}$/i;
  for (const part of s.split(',')) {
    const [k, raw = ''] = part.split('=');
    if (!(k in DEF)) continue;
    const d = DEF[k], r = rows[k];
    if (Array.isArray(d)) { const cs = raw.split('.'); if (cs.length === d.length && cs.every(c => HEX.test(c))) v[k] = cs.map(c => '#' + c.toLowerCase()); }
    else if (typeof d === 'string') { if (HEX.test(raw)) v[k] = '#' + raw.toLowerCase(); }
    else if (r.kind === 'toggle') v[k] = raw === '1' ? 1 : 0;
    else { const n = Math.round(+raw); if (!Number.isNaN(n)) v[k] = Math.max(r.spec.min, Math.min(r.spec.max, n)); }
  }
  return v;
}

const lookForm = $('#lookform'), lookName = $('#lookname');
let suggestedName = '';
$('#savelook').addEventListener('click', () => {
  if (!encodeLook(vals)) { say('move something first'); return; }
  lookForm.hidden = false;
  lookName.value = suggestedName || '';
  lookName.focus(); lookName.select();
});
$('#lookcancel').addEventListener('click', () => { lookForm.hidden = true; });
lookForm.addEventListener('submit', async e => {
  e.preventDefault();
  const name = lookName.value.trim().toLowerCase();
  if (!name) return;
  if (PRESETS.some(p => p[0] === name)) { say('that name is taken'); return; }
  const over = decodeLook(encodeLook(vals));
  const old = LOOKS.find(p => p[0] === name);
  if (old) old[1] = over; else LOOKS.unshift([name, over]);
  saveLooks();
  lookForm.hidden = true;
  if (!old) {
    const b = filterButton(name, true);
    $('#filters').children[0].after(b);
  }
  markPreset(name);
  if (pristine) await renderThumb(name, over);
});

$('#copylink').addEventListener('click', async () => {
  const on = document.querySelector('.filt.on'), name = on && on.classList.contains('mine') ? on.dataset.name : '';
  const url = location.href.split('#')[0] + '#look=' + encodeURIComponent(name) + '|' + encodeLook(vals);
  try { await navigator.clipboard.writeText(url); flash($('#copylink'), 'copied'); }
  catch { say("couldn't copy"); }
});
function applyHash() {
  const m = location.hash.match(/^#look=([^|]*)\|(.*)$/);
  if (!m) return;
  suggestedName = decodeURIComponent(m[1]);
  setVals(decodeLook(m[2]));
  markPreset(null);
  try { history.replaceState(null, '', location.pathname + location.search); } catch { /* file:// can be picky */ }
}

function randomVals() {
  const r = (a, b) => Math.round(a + Math.random() * (b - a));
  const bases = PRESETS.filter(p => p[0] !== 'original');
  const v = { ...bases[r(0, bases.length - 1)][1] };
  const pool = [...FUN];
  for (let i = 0; i < r(2, 4); i++) {
    const id = pool.splice(r(0, pool.length - 1), 1)[0], sp = rows[id].spec;
    // stay off the far ends — three maxed-out effects on top of each other is just a gray square
    v[id] = id === 'pix' ? r(2, 12) : id === 'pass' ? r(1, 8) : sp.min < 0 ? r(-sp.max * .7, sp.max * .7) : r(sp.max * .15, sp.max * .7);
  }
  if (v.jpg && !v.pass) v.pass = r(1, 8);
  return v;
}

// ---------- source picture (rotate / flip / crop live here) ----------

const dims = () => xf.rot % 2 ? [pristine.height, pristine.width] : [pristine.width, pristine.height];
const cropRect = () => { const [w, h] = dims(); return xf.crop || { x: 0, y: 0, w, h }; };

function makeSource(maxSide, ignoreCrop) {
  const [rw, rh] = dims(), cr = ignoreCrop ? { x: 0, y: 0, w: rw, h: rh } : cropRect();
  const k = Math.min(1, maxSide / Math.max(cr.w, cr.h));
  const W = Math.max(1, Math.round(cr.w * k)), H = Math.max(1, Math.round(cr.h * k));
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d', { willReadFrequently: true });
  x.imageSmoothingQuality = 'high';
  x.scale(W / cr.w, H / cr.h);
  x.translate(-cr.x, -cr.y);
  if (xf.flipV) { x.translate(0, rh); x.scale(1, -1); }
  if (xf.flipH) { x.translate(rw, 0); x.scale(-1, 1); }
  const pw = pristine.width, ph = pristine.height;
  if (xf.rot === 1) { x.translate(ph, 0); x.rotate(Math.PI / 2); }
  else if (xf.rot === 2) { x.translate(pw, ph); x.rotate(Math.PI); }
  else if (xf.rot === 3) { x.translate(0, pw); x.rotate(-Math.PI / 2); }
  x.drawImage(pristine, 0, 0);
  return c;
}
function source(maxSide) {
  if (!sources.has(maxSide)) sources.set(maxSide, makeSource(maxSide));
  return sources.get(maxSide);
}
function sourceChanged() {
  sources.clear();
  const s = source(FULL);
  orig.width = s.width; orig.height = s.height;
  gctx.drawImage(s, 0, 0);
  requestRender(false);
  refreshThumbs();
}

function transform(op) {
  const [rw, rh] = dims();
  const c = xf.crop;
  if (op === 'rot') {
    xf.rot = (xf.rot + 1) % 4;
    if (c) xf.crop = { x: rh - c.y - c.h, y: c.x, w: c.h, h: c.w };
  } else if (op === 'flipH') {
    xf.flipH = !xf.flipH;
    if (c) xf.crop = { ...c, x: rw - c.x - c.w };
  } else {
    xf.flipV = !xf.flipV;
    if (c) xf.crop = { ...c, y: rh - c.y - c.h };
  }
  sourceChanged();
}

// ---------- rendering ----------

let running = false, want = null, fullTimer = 0;
function requestRender(quick) {
  if (!pristine) return;
  want = quick ? 'quick' : 'full';
  clearTimeout(fullTimer);
  if (quick) fullTimer = setTimeout(() => requestRender(false), 350);
  else fullTimer = 0;
  if (!running) pump();
}
async function pump() {
  running = true;
  stage.dataset.busy = '';
  try {
    while (want) {
      const mode = want; want = null;
      const fin = await P1.run(source(mode === 'quick' ? QUICK : FULL), vals, { alpha: hasAlpha });
      out.width = fin.width; out.height = fin.height;
      octx.drawImage(fin, 0, 0);
      outAlpha = P1.alpha;
    }
  } catch (e) {
    console.error(e);
    say('something broke');
  } finally {
    running = false;
    delete stage.dataset.busy;
  }
}
const whenIdle = () => new Promise(res => {
  const tick = () => (!running && !want && !fullTimer && !thumbBusy) ? res() : setTimeout(tick, 50);
  tick();
});

let thumbToken = 0, thumbBusy = false, tiny = null, thumbChain = Promise.resolve();
// thumbnails share one pipeline, so they queue up one after another
function renderThumb(name, over) {
  thumbChain = thumbChain.then(async () => {
    if (!tiny || !thumbs[name]) return;
    const fin = await P2.run(tiny, merged(over), { alpha: hasAlpha, thumb: true });
    const c = thumbs[name];
    if (!c) return;
    c.width = fin.width; c.height = fin.height;
    c.getContext('2d').drawImage(fin, 0, 0);
  }).catch(e => console.error(e));
  return thumbChain;
}
async function refreshThumbs() {
  const my = ++thumbToken;
  thumbBusy = true;
  tiny = makeSource(THUMB);
  for (const [name, over] of allPresets()) {
    if (my !== thumbToken) return;
    await renderThumb(name, over);
    await new Promise(r => setTimeout(r, 0));
  }
  if (my === thumbToken) thumbBusy = false;
}

// ---------- getting pictures in ----------

function decode(blob) {
  const viaImg = () => new Promise((res, rej) => {
    const img = new Image(), url = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
      c.getContext('2d').drawImage(img, 0, 0);
      res(c);
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(); };
    img.src = url;
  });
  return createImageBitmap(blob, { imageOrientation: 'from-image' }).catch(() => createImageBitmap(blob)).catch(viaImg);
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
  if (!pic.width || !pic.height) { say("can't open that one"); return; }
  if (crop.on) exitCrop();
  if (pristine && pristine.close) pristine.close();
  pristine = pic;
  Object.assign(xf, { rot: 0, flipH: false, flipV: false, crop: null });
  sources.clear();
  const a = source(FULL).getContext('2d').getImageData(0, 0, source(FULL).width, source(FULL).height).data;
  hasAlpha = false;
  for (let i = 3; i < a.length; i += 4) if (a[i] < 255) { hasAlpha = true; break; }
  baseName = (name || 'image').replace(/\.[^.]*$/, '') || 'image';
  document.body.classList.add('has-img');
  for (const id of ['peek', 'copy', 'save', 'crop', 'rot', 'fliph', 'flipv']) $('#' + id).disabled = false;
  sourceChanged();
}

const firstImage = files => [...files].find(f => f.type.startsWith('image/'));
$('#open').addEventListener('click', () => fileInput.click());
$('#drop').addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => { const f = fileInput.files[0]; if (f) load(f, f.name); fileInput.value = ''; });
addEventListener('paste', e => { const f = firstImage(e.clipboardData.files); if (f) { e.preventDefault(); load(f, 'pasted'); } });

let dragDepth = 0;
const setDragging = on => document.body.classList.toggle('dragging', on);
addEventListener('dragenter', e => { e.preventDefault(); dragDepth++; setDragging(true); });
addEventListener('dragleave', () => { if (--dragDepth <= 0) { dragDepth = 0; setDragging(false); } });
addEventListener('dragover', e => e.preventDefault());
addEventListener('drop', e => {
  e.preventDefault(); dragDepth = 0; setDragging(false);
  const f = firstImage(e.dataTransfer.files);
  if (f) load(f, f.name); else say("can't open that one");
});

// ---------- camera ----------

const camui = $('#camui'), video = $('#video');
let stream = null, facing = 'user';
async function openCam() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing, width: { ideal: 1920 } }, audio: false });
    video.srcObject = stream;
    camui.hidden = false;
  } catch { say('no camera'); }
}
function closeCam() {
  if (stream) stream.getTracks().forEach(t => t.stop());
  stream = null; video.srcObject = null; camui.hidden = true;
}
if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) $('#cam').hidden = true;
$('#cam').addEventListener('click', openCam);
$('#camclose').addEventListener('click', closeCam);
$('#camflip').addEventListener('click', () => { facing = facing === 'user' ? 'environment' : 'user'; closeCam(); openCam(); });
$('#snap').addEventListener('click', () => {
  const w = video.videoWidth, h = video.videoHeight;
  if (!w) return;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d');
  if (facing === 'user') { x.translate(w, 0); x.scale(-1, 1); }
  x.drawImage(video, 0, 0);
  c.toBlob(b => load(b, 'camera'), 'image/png');
  closeCam();
});

// ---------- crop ----------

const crop = { on: false, rect: null, ar: 0, drag: null, box: null };
const cropc = $('#cropc'), cctx = cropc.getContext('2d');
const HANDLE = 18;

function enterCrop() {
  crop.on = true;
  document.body.classList.add('cropping');
  const full = makeSource(FULL, true);
  orig.width = full.width; orig.height = full.height;
  gctx.drawImage(full, 0, 0);
  stage.classList.add('peek');
  crop.rect = { ...cropRect() };
  cropc.hidden = false;
  layoutCrop(); drawCrop();
}
function exitCrop() {
  crop.on = false;
  document.body.classList.remove('cropping');
  stage.classList.remove('peek');
  cropc.hidden = true;
  const s = source(FULL);
  orig.width = s.width; orig.height = s.height;
  gctx.drawImage(s, 0, 0);
}
function layoutCrop() {
  const fr = frameEl.getBoundingClientRect(), [rw, rh] = dims();
  const s = Math.min(fr.width / rw, fr.height / rh), dw = rw * s, dh = rh * s;
  crop.box = { ox: (fr.width - dw) / 2, oy: (fr.height - dh) / 2, s, w: fr.width, h: fr.height };
  const dpr = devicePixelRatio || 1;
  cropc.width = Math.round(fr.width * dpr); cropc.height = Math.round(fr.height * dpr);
  cropc.style.width = fr.width + 'px'; cropc.style.height = fr.height + 'px';
  cctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
const toScreen = r => ({ x: crop.box.ox + r.x * crop.box.s, y: crop.box.oy + r.y * crop.box.s, w: r.w * crop.box.s, h: r.h * crop.box.s });
function drawCrop() {
  const { w, h } = crop.box, r = toScreen(crop.rect);
  cctx.clearRect(0, 0, w, h);
  cctx.fillStyle = 'rgba(0,0,0,.6)'; cctx.fillRect(0, 0, w, h);
  cctx.clearRect(r.x, r.y, r.w, r.h);
  cctx.strokeStyle = '#ff3d9a'; cctx.lineWidth = 2; cctx.strokeRect(r.x, r.y, r.w, r.h);
  cctx.strokeStyle = 'rgba(255,255,255,.25)'; cctx.lineWidth = 1;
  for (let i = 1; i < 3; i++) {
    cctx.beginPath(); cctx.moveTo(r.x + r.w * i / 3, r.y); cctx.lineTo(r.x + r.w * i / 3, r.y + r.h); cctx.stroke();
    cctx.beginPath(); cctx.moveTo(r.x, r.y + r.h * i / 3); cctx.lineTo(r.x + r.w, r.y + r.h * i / 3); cctx.stroke();
  }
  cctx.fillStyle = '#c6ff3d';
  for (const [cx, cy] of corners(r)) cctx.fillRect(cx - 7, cy - 7, 14, 14);
}
const corners = r => [[r.x, r.y], [r.x + r.w, r.y], [r.x, r.y + r.h], [r.x + r.w, r.y + r.h]];

function fitAspect(rect) {
  const [rw, rh] = dims(), ar = crop.ar;
  if (!ar) return rect;
  let w = rect.w, h = w / ar;
  if (h > rect.h) { h = rect.h; w = h * ar; }
  if (w > rw) { w = rw; h = w / ar; }
  if (h > rh) { h = rh; w = h * ar; }
  const cx = rect.x + rect.w / 2, cy = rect.y + rect.h / 2;
  let x = cx - w / 2, y = cy - h / 2;
  x = Math.max(0, Math.min(rw - w, x)); y = Math.max(0, Math.min(rh - h, y));
  return { x, y, w, h };
}

cropc.addEventListener('pointerdown', e => {
  const r = toScreen(crop.rect), px = e.offsetX, py = e.offsetY;
  const hit = corners(r).findIndex(([cx, cy]) => Math.abs(cx - px) < HANDLE && Math.abs(cy - py) < HANDLE);
  let mode = null;
  if (hit >= 0) mode = ['nw', 'ne', 'sw', 'se'][hit];
  else if (px > r.x && px < r.x + r.w && py > r.y && py < r.y + r.h) mode = 'move';
  if (!mode) return;
  crop.drag = { mode, px, py, start: { ...crop.rect } };
  cropc.setPointerCapture(e.pointerId);
});
cropc.addEventListener('pointermove', e => {
  const d = crop.drag;
  if (!d) return;
  const [rw, rh] = dims(), s = crop.box.s;
  const dx = (e.offsetX - d.px) / s, dy = (e.offsetY - d.py) / s, st = d.start, MIN = 16;
  let r;
  if (d.mode === 'move') {
    r = { ...st, x: Math.max(0, Math.min(rw - st.w, st.x + dx)), y: Math.max(0, Math.min(rh - st.h, st.y + dy)) };
  } else {
    // the corner across from the one being dragged stays put
    const ax = d.mode[1] === 'w' ? st.x + st.w : st.x, ay = d.mode[0] === 'n' ? st.y + st.h : st.y;
    let mx = d.mode[1] === 'w' ? st.x + dx : st.x + st.w + dx, my = d.mode[0] === 'n' ? st.y + dy : st.y + st.h + dy;
    mx = Math.max(0, Math.min(rw, mx)); my = Math.max(0, Math.min(rh, my));
    let w = Math.max(MIN, Math.abs(mx - ax)), h = Math.max(MIN, Math.abs(my - ay));
    if (crop.ar) {
      if (w / h > crop.ar) w = h * crop.ar; else h = w / crop.ar;
      // shrink if the locked shape runs off the picture
      const roomW = d.mode[1] === 'w' ? ax : rw - ax, roomH = d.mode[0] === 'n' ? ay : rh - ay;
      if (w > roomW) { w = roomW; h = w / crop.ar; }
      if (h > roomH) { h = roomH; w = h * crop.ar; }
    }
    r = { x: d.mode[1] === 'w' ? ax - w : ax, y: d.mode[0] === 'n' ? ay - h : ay, w, h };
  }
  crop.rect = r;
  drawCrop();
});
const endDrag = () => { crop.drag = null; };
cropc.addEventListener('pointerup', endDrag);
cropc.addEventListener('pointercancel', endDrag);

for (const b of $('#cropbar').querySelectorAll('[data-ar]')) {
  b.addEventListener('click', () => {
    for (const o of $('#cropbar').querySelectorAll('[data-ar]')) o.classList.toggle('on', o === b);
    crop.ar = +b.dataset.ar;
    crop.rect = fitAspect(crop.rect);
    drawCrop();
  });
}
$('#cropreset').addEventListener('click', () => { const [w, h] = dims(); crop.rect = fitAspect({ x: 0, y: 0, w, h }); drawCrop(); });
$('#cropcancel').addEventListener('click', exitCrop);
$('#cropdone').addEventListener('click', () => {
  const [rw, rh] = dims(), r = crop.rect;
  const x = Math.round(r.x), y = Math.round(r.y), w = Math.round(r.w), h = Math.round(r.h);
  xf.crop = (x === 0 && y === 0 && w === rw && h === rh) ? null : { x, y, w, h };
  exitCrop();
  sourceChanged();
});
$('#crop').addEventListener('click', () => { if (crop.on) exitCrop(); else enterCrop(); });
$('#rot').addEventListener('click', () => { if (!crop.on) transform('rot'); });
$('#fliph').addEventListener('click', () => { if (!crop.on) transform('flipH'); });
$('#flipv').addEventListener('click', () => { if (!crop.on) transform('flipV'); });
addEventListener('resize', () => { if (crop.on) { layoutCrop(); drawCrop(); } });

// ---------- getting pictures out ----------

const peekBtn = $('#peek');
const peek = on => { if (crop.on) return; stage.classList.toggle('peek', on); peekBtn.classList.toggle('held', on); };
for (const el of [peekBtn, out, orig]) {
  el.addEventListener('pointerdown', e => { if (!pristine || crop.on) return; el.setPointerCapture(e.pointerId); peek(true); });
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
let saving = false;
saveBtn.addEventListener('click', async () => {
  if (saving) return;
  saving = true;
  saveBtn.textContent = 'saving';
  stage.dataset.busy = '';
  const P3 = new FX.Pipeline();
  try {
    const fin = await P3.run(makeSource(SAVE), vals, { alpha: hasAlpha });
    const png = P3.alpha;  // jpg can't do see-through
    const blob = await new Promise(res => fin.toBlob(res, png ? 'image/png' : 'image/jpeg', .92));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${baseName}_fried.${png ? 'png' : 'jpg'}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
    flash(saveBtn, 'saved');
  } catch (e) {
    console.error(e);
    saveBtn.textContent = saveBtn.dataset.label || 'save';
    say("couldn't save");
  } finally {
    P3.release();
    saving = false;
    if (!running) delete stage.dataset.busy;
  }
});

const copyBtn = $('#copy');
if (!navigator.clipboard || !window.ClipboardItem) copyBtn.hidden = true;
copyBtn.addEventListener('click', async () => {
  try {
    const png = new Promise(res => out.toBlob(res, 'image/png'));
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
    flash(copyBtn, 'copied');
  } catch { say("couldn't copy"); }
});

$('#random').addEventListener('click', () => { setVals(randomVals()); markPreset(null); });
const resetBtn = $('#reset');
resetBtn.addEventListener('click', () => { setVals(); markPreset('original'); });
// double-click reset also undoes crop / rotate / flips
resetBtn.addEventListener('dblclick', () => {
  if (!pristine) return;
  Object.assign(xf, { rot: 0, flipH: false, flipV: false, crop: null });
  if (crop.on) exitCrop();
  sourceChanged();
});

buildControls();
buildFilters();
markPreset('original');
applyHash();
addEventListener('hashchange', applyHash);
if (document.fonts && document.fonts.load) document.fonts.load('12px Silkscreen');

// for the test script
window.__bq = { whenIdle, vals, xf, load, encodeLook, get looks() { return LOOKS; }, get out() { return out; }, get orig() { return orig; }, get alpha() { return outAlpha; } };
})();

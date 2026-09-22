// The whole picture pipeline. Nothing in here touches the page.
// Every size (blur radius, block size...) is relative to the picture, so a save at 2x looks like the preview.
'use strict';
const FX = (() => {

const clamp = (x, a, b) => x < a ? a : x > b ? b : x;
const mk = () => document.createElement('canvas');
const HAS_FILTER = typeof mk().getContext('2d').filter === 'string';

// small seeded random so glitches hold still while other sliders move
function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
const hex = h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const hsl = (h, s, l, a = 1) => `hsla(${h},${s}%,${l}%,${a})`;

function mul3(a, b) {
  const m = new Array(9);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
    m[r * 3 + c] = a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c];
  }
  return m;
}

// ---------- color ----------

// hue -> saturation -> sepia -> warmth/tint/fry multipliers, folded into one 3x3
function colorMatrix(v) {
  const a = v.hue * Math.PI / 180, cs = Math.cos(a), sn = Math.sin(a);
  const hueM = [
    .213 + cs * .787 - sn * .213, .715 - cs * .715 - sn * .715, .072 - cs * .072 + sn * .928,
    .213 - cs * .213 + sn * .143, .715 + cs * .285 + sn * .140, .072 - cs * .072 - sn * .283,
    .213 - cs * .213 - sn * .787, .715 - cs * .715 + sn * .715, .072 + cs * .928 + sn * .072,
  ];
  const s = Math.max(0, 1 + v.sat / 100), t = 1 - s, lr = .2126, lg = .7152, lb = .0722;
  const satM = [lr * t + s, lg * t, lb * t, lr * t, lg * t + s, lb * t, lr * t, lg * t, lb * t + s];
  let m = mul3(satM, hueM);
  if (v.sepia) {
    const p = v.sepia / 100, q = 1 - p;
    m = mul3([.393 * p + q, .769 * p, .189 * p, .349 * p, .686 * p + q, .168 * p, .272 * p, .534 * p, .131 * p + q], m);
  }
  const w = v.warm / 100, g = v.tint / 100, f = v.fry / 100;
  const d = [(1 + .3 * w) * (1 + .1 * g) * (1 + .55 * f), (1 - .25 * g) * (1 + .08 * f), (1 - .3 * w) * (1 + .1 * g) * (1 - .7 * f)];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) m[r * 3 + c] *= d[r];
  return m;
}

// exposure -> brightness -> contrast -> black point -> fade -> solarize -> posterize -> invert, per channel
function toneLut(v) {
  const lut = new Uint8ClampedArray(256);
  const ex = Math.pow(2, v.exposure / 50), br = v.bri * .9;
  const c = v.con >= 0 ? 1 + v.con / 100 * 1.8 : 1 + v.con / 100 * .9;
  const bp = v.black / 100, fd = v.fade / 100, inv = v.invert / 100;
  const cut = v.sol ? 255 - v.sol * 2.1 : 256;
  const levels = v.post ? Math.round(2 + (1 - v.post / 100) ** 2 * 22) : 0;
  for (let i = 0; i < 256; i++) {
    let x = i * ex + br;
    x = (x - 128) * c + 128;
    if (bp > 0) x = (x - 102 * bp) / (1 - .4 * bp);
    else if (bp < 0) x = x * (1 + .4 * bp) - 102 * bp;
    x = clamp(x, 0, 255);
    if (fd) x = x * (1 - .35 * fd) + 46 * fd;
    if (x >= cut) x = 255 - x;
    if (levels) x = Math.round(x / 255 * (levels - 1)) / (levels - 1) * 255;
    if (inv) x += inv * (255 - 2 * x);
    lut[i] = x;
  }
  return lut;
}

const COLOR_KEYS = ['exposure', 'brilliance', 'highlights', 'shadows', 'con', 'bri', 'black', 'sat', 'vib', 'warm', 'tint',
  'hue', 'fade', 'sepia', 'invert', 'post', 'sol', 'thresh', 'duo', 'splash', 'fry', 'noise', 'grain'];

function colorPass(img, v) {
  const d = img.data, m = colorMatrix(v), lut = toneLut(v);
  const sh = v.shadows / 100, hl = v.highlights / 100, bl = v.brilliance / 100, vb = v.vib / 100;
  const lumaAdj = sh || hl || bl;
  const th = v.thresh ? v.thresh / 100 * 255 : 0;
  const duo = v.duo / 100, c1 = duo ? hex(v.duoc[0]) : null, c2 = duo ? hex(v.duoc[1]) : null;
  const spl = v.splash / 100, keep = v.splashhue;
  const gr = v.grain * 1.1, nz = v.noise * 1.3;
  let seed = 0x9e3779b9;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    let R = m[0] * r + m[1] * g + m[2] * b, G = m[3] * r + m[4] * g + m[5] * b, B = m[6] * r + m[7] * g + m[8] * b;
    if (lumaAdj) {
      const L = clamp((.2126 * R + .7152 * G + .0722 * B) / 255, 0, 1), o = 1 - L;
      const add = sh * 96 * o * o + hl * 96 * L * L + bl * (80 * o * o - 40 * L * L);
      R += add; G += add; B += add;
    }
    if (vb) {
      const mx = Math.max(R, G, B), mn = Math.min(R, G, B), sv = mx > 1 ? (mx - mn) / mx : 0;
      const k = vb > 0 ? 1 + vb * (1 - sv) * 1.3 : 1 + vb * .9, av = (R + G + B) / 3;
      R = av + (R - av) * k; G = av + (G - av) * k; B = av + (B - av) * k;
    }
    R = lut[R < 0 ? 0 : R > 255 ? 255 : R | 0];
    G = lut[G < 0 ? 0 : G > 255 ? 255 : G | 0];
    B = lut[B < 0 ? 0 : B > 255 ? 255 : B | 0];
    if (th) { R = G = B = (.2126 * R + .7152 * G + .0722 * B) < th ? 0 : 255; }
    if (duo) {
      const L = (.2126 * R + .7152 * G + .0722 * B) / 255;
      R += (c1[0] + (c2[0] - c1[0]) * L - R) * duo;
      G += (c1[1] + (c2[1] - c1[1]) * L - G) * duo;
      B += (c1[2] + (c2[2] - c1[2]) * L - B) * duo;
    }
    if (spl) {
      const mx = Math.max(R, G, B), mn = Math.min(R, G, B), ch = mx - mn;
      let h = 0;
      if (ch > 0) {
        h = mx === R ? ((G - B) / ch) % 6 : mx === G ? (B - R) / ch + 2 : (R - G) / ch + 4;
        h *= 60; if (h < 0) h += 360;
      }
      let dist = Math.abs(h - keep); if (dist > 180) dist = 360 - dist;
      const kill = (dist < 22 ? 0 : dist > 48 ? 1 : (dist - 22) / 26) * spl;
      const L = .2126 * R + .7152 * G + .0722 * B;
      R += (L - R) * kill; G += (L - G) * kill; B += (L - B) * kill;
    }
    if (gr || nz) {
      seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
      if (gr) { const n = ((seed & 255) - 127.5) / 127.5 * gr; R += n; G += n; B += n; }
      if (nz) {
        R += ((seed >>> 8 & 255) - 127.5) / 127.5 * nz;
        G += ((seed >>> 16 & 255) - 127.5) / 127.5 * nz;
        B += ((seed >>> 24 & 255) - 127.5) / 127.5 * nz;
      }
    }
    d[i] = R; d[i + 1] = G; d[i + 2] = B;
  }
}

// ---------- blur ----------

const padA = mk(), padB = mk();

// gaussian blur of src into dx (same size). Edges get a stretched copy underneath so they don't fade to nothing.
function blurTo(dx, src, r) {
  const w = src.width, h = src.height;
  dx.globalCompositeOperation = 'copy';
  if (r < .3) { dx.drawImage(src, 0, 0); dx.globalCompositeOperation = 'source-over'; return; }
  if (HAS_FILTER) {
    const pad = Math.ceil(r * 2.5);
    padA.width = padB.width = w + 2 * pad; padA.height = padB.height = h + 2 * pad;
    const ax = padA.getContext('2d'), bx = padB.getContext('2d');
    ax.drawImage(src, 0, 0, w, h, 0, 0, padA.width, padA.height);
    ax.drawImage(src, pad, pad);
    bx.filter = `blur(${r}px)`;
    bx.drawImage(padA, 0, 0);
    bx.filter = 'none';
    dx.drawImage(padB, pad, pad, w, h, 0, 0, w, h);
  } else {
    const img = src.getContext('2d').getImageData(0, 0, w, h);
    boxBlur(img, r);
    dx.putImageData(img, 0, 0);
  }
  dx.globalCompositeOperation = 'source-over';
}

// fallback for browsers without ctx.filter: three box blurs ~ one gaussian
function boxBlur(img, sigma) {
  const { data, width: w, height: h } = img;
  const n = 3, wi = Math.sqrt(12 * sigma * sigma / n + 1);
  let wl = Math.floor(wi); if (wl % 2 === 0) wl--;
  const wu = wl + 2, m = Math.round((12 * sigma * sigma - n * wl * wl - 4 * n * wl - 3 * n) / (-4 * wl - 4));
  const tmp = new Uint8ClampedArray(data.length);
  for (let i = 0; i < n; i++) {
    const r = Math.max(0, ((i < m ? wl : wu) - 1) / 2);
    boxPass(data, tmp, w, h, Math.min(r, (w - 1) >> 1), 4, 4 * w);
    boxPass(tmp, data, h, w, Math.min(r, (h - 1) >> 1), 4 * w, 4);
  }
}
// one 1-D box pass along a line of `len` pixels, `stride` bytes apart, for `lines` lines `lstride` apart
function boxPass(s, d, len, lines, r, stride, lstride) {
  const k = 1 / (2 * r + 1);
  for (let ln = 0; ln < lines; ln++) for (let c = 0; c < 4; c++) {
    const base = ln * lstride + c;
    let acc = 0;
    for (let j = -r; j <= r; j++) acc += s[base + clamp(j, 0, len - 1) * stride];
    for (let x = 0; x < len; x++) {
      d[base + x * stride] = acc * k;
      acc += s[base + clamp(x + r + 1, 0, len - 1) * stride] - s[base + clamp(x - r, 0, len - 1) * stride];
    }
  }
}

// ---------- per-pixel passes ----------

// bends the picture: every output pixel looks up where it came from
function warp(src, dx, v) {
  const W = src.width, H = src.height;
  const s = src.getContext('2d').getImageData(0, 0, W, H).data;
  const out = dx.createImageData(W, H), d = out.data;
  const cx = W / 2, cy = H / 2, rn = Math.min(cx, cy);
  const st = v.stretch / 100, kx = st > 0 ? 1 / (1 + st * .75) : 1, ky = st < 0 ? 1 / (1 - st * .75) : 1;
  const mh = v.mirrorH, mv = v.mirrorV;
  const kn = v.kaleido ? Math.round(2 + v.kaleido / 100 * 10) : 0, seg = kn ? Math.PI * 2 / kn : 0;
  const fi = v.fish / 100 * .8;
  const bu = v.bulge / 100, be = bu >= 0 ? 1 + 1.5 * bu : 1 / (1 - 1.5 * bu), Rb = rn * .95;
  const sw = v.swirl / 100 * Math.PI * 2, Rs = rn * 1.1;
  const wa = v.wave / 100 * .08 * rn, wk = Math.PI * 2 / (rn * .5);
  const ra = v.ripple / 100 * .05 * rn, rk = Math.PI * 2 / (rn * .12);
  const radial = fi || bu || sw || ra;
  let i = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++, i += 4) {
    let px = (x + .5 - cx) * kx, py = (y + .5 - cy) * ky;
    if (mh) px = -Math.abs(px);
    if (mv) py = -Math.abs(py);
    if (kn) {
      const r = Math.hypot(px, py);
      let a = Math.atan2(py, px);
      a = ((a % seg) + seg) % seg;
      if (a > seg / 2) a = seg - a;
      px = r * Math.cos(a); py = r * Math.sin(a);
    }
    if (radial) {
      const r = Math.hypot(px, py);
      if (r > 1e-6) {
        let rs = r;
        if (fi) { const q = r / rn; rs *= Math.max(0, 1 + fi * (q * q - 1)); }
        if (bu && rs < Rb) rs = Rb * Math.pow(rs / Rb, be);
        if (ra) rs = Math.max(0, rs + ra * Math.sin(r * rk));
        if (sw && r < Rs) {
          const q = 1 - r / Rs, a = Math.atan2(py, px) + sw * q * q;
          px = rs * Math.cos(a); py = rs * Math.sin(a);
        } else { px *= rs / r; py *= rs / r; }
      }
    }
    if (wa) px += wa * Math.sin((y + .5) * wk);
    const fx = clamp(cx + px - .5, 0, W - 1), fy = clamp(cy + py - .5, 0, H - 1);
    const x0 = fx | 0, y0 = fy | 0, x1 = x0 < W - 1 ? x0 + 1 : x0, y1 = y0 < H - 1 ? y0 + 1 : y0;
    const tx = fx - x0, ty = fy - y0;
    const i00 = (y0 * W + x0) * 4, i10 = (y0 * W + x1) * 4, i01 = (y1 * W + x0) * 4, i11 = (y1 * W + x1) * 4;
    const w00 = (1 - tx) * (1 - ty), w10 = tx * (1 - ty), w01 = (1 - tx) * ty, w11 = tx * ty;
    d[i]     = s[i00] * w00 + s[i10] * w10 + s[i01] * w01 + s[i11] * w11;
    d[i + 1] = s[i00 + 1] * w00 + s[i10 + 1] * w10 + s[i01 + 1] * w01 + s[i11 + 1] * w11;
    d[i + 2] = s[i00 + 2] * w00 + s[i10 + 2] * w10 + s[i01 + 2] * w01 + s[i11 + 2] * w11;
    d[i + 3] = s[i00 + 3] * w00 + s[i10 + 3] * w10 + s[i01 + 3] * w01 + s[i11 + 3] * w11;
  }
  dx.putImageData(out, 0, 0);
}

// sharpness = tiny 3x3 unsharp, definition = the same idea with a big blurred copy
function sharpenPass(img, sharp, def, bd) {
  const { data, width: w, height: h } = img;
  const a = sharp ? (sharp / 100) ** 1.5 * 6 : 0, c = 1 + 4 * a, k = def / 100 * 1.5;
  const s = new Uint8ClampedArray(data);
  for (let y = 0; y < h; y++) {
    const yc = y * w, yu = (y > 0 ? y - 1 : y) * w, yd = (y < h - 1 ? y + 1 : y) * w;
    for (let x = 0; x < w; x++) {
      const xl = x > 0 ? x - 1 : x, xr = x < w - 1 ? x + 1 : x;
      const i = (yc + x) * 4, u = (yu + x) * 4, d = (yd + x) * 4, l = (yc + xl) * 4, r = (yc + xr) * 4;
      for (let ch = 0; ch < 3; ch++) {
        let val = s[i + ch];
        if (a) val = c * val - a * (s[u + ch] + s[d + ch] + s[l + ch] + s[r + ch]);
        if (k) val += k * (s[i + ch] - bd[i + ch]);
        data[i + ch] = val;
      }
    }
  }
}

// edges (white lines on black), outline (ink lines over the picture), emboss — one sobel for all three
function edgePass(img, v) {
  const { data, width: w, height: h } = img;
  const L = new Float32Array(w * h);
  for (let i = 0, j = 0; j < L.length; i += 4, j++) L[j] = .2126 * data[i] + .7152 * data[i + 1] + .0722 * data[i + 2];
  const e = v.edges / 100, o = v.outline / 100, em = v.emboss / 100;
  for (let y = 0; y < h; y++) {
    const yc = y * w, yu = (y > 0 ? y - 1 : y) * w, yd = (y < h - 1 ? y + 1 : y) * w;
    for (let x = 0; x < w; x++) {
      const xl = x > 0 ? x - 1 : x, xr = x < w - 1 ? x + 1 : x;
      const tl = L[yu + xl], t = L[yu + x], tr = L[yu + xr], l = L[yc + xl], r = L[yc + xr], bl = L[yd + xl], b = L[yd + x], br = L[yd + xr];
      const gx = (tr + 2 * r + br) - (tl + 2 * l + bl), gy = (bl + 2 * b + br) - (tl + 2 * t + tr);
      const mag = Math.min(1, Math.sqrt(gx * gx + gy * gy) / 255 * .8);
      const emb = 128 + (-2 * tl - t - l + r + b + 2 * br) * .5;
      const i = (yc + x) * 4;
      for (let ch = 0; ch < 3; ch++) {
        let val = data[i + ch];
        if (o) val *= Math.max(0, 1 - o * mag * 1.5);
        if (e) val += (mag * 255 - val) * e;
        if (em) val += (emb - val) * em;
        data[i + ch] = val;
      }
    }
  }
}

// classic oil paint: most common brightness bucket in the window wins
function oilPass(img, r, levels = 20) {
  const { data, width: w, height: h } = img;
  const src = new Uint8ClampedArray(data);
  const cnt = new Int32Array(levels), sr = new Int32Array(levels), sg = new Int32Array(levels), sb = new Int32Array(levels);
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - r), y1 = Math.min(h - 1, y + r);
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - r), x1 = Math.min(w - 1, x + r);
      cnt.fill(0); sr.fill(0); sg.fill(0); sb.fill(0);
      for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) {
        const j = (yy * w + xx) * 4, R = src[j], G = src[j + 1], B = src[j + 2];
        const lv = (R + G + B) * levels / 768 | 0;
        cnt[lv]++; sr[lv] += R; sg[lv] += G; sb[lv] += B;
      }
      let best = 0;
      for (let k = 1; k < levels; k++) if (cnt[k] > cnt[best]) best = k;
      const i = (y * w + x) * 4;
      data[i] = sr[best] / cnt[best]; data[i + 1] = sg[best] / cnt[best]; data[i + 2] = sb[best] / cnt[best];
    }
  }
}

// floyd-steinberg down to a few levels per channel
function ditherPass(img, v) {
  const { data, width: w, height: h } = img;
  const levels = Math.max(2, Math.round(8 - v.dither / 100 * 6)), step = 255 / (levels - 1);
  const buf = new Float32Array(data);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    for (let ch = 0; ch < 3; ch++) {
      const old = clamp(buf[i + ch], 0, 255), nw = Math.round(old / step) * step, err = old - nw;
      data[i + ch] = nw;
      if (x + 1 < w) buf[i + 4 + ch] += err * 7 / 16;
      if (y + 1 < h) {
        if (x > 0) buf[i + 4 * w - 4 + ch] += err * 3 / 16;
        buf[i + 4 * w + ch] += err * 5 / 16;
        if (x + 1 < w) buf[i + 4 * w + 4 + ch] += err / 16;
      }
    }
  }
}

// pixel sort: bright runs in each row get sorted by brightness, which smears them sideways
function sortPass(img, t) {
  const { data, width: w, height: h } = img;
  const px = new Uint32Array(data.buffer);
  const lo = 255 * (1 - t * .92), L = new Float32Array(w);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) { const i = (row + x) * 4; L[x] = .2126 * data[i] + .7152 * data[i + 1] + .0722 * data[i + 2]; }
    let x = 0;
    while (x < w) {
      if (L[x] < lo) { x++; continue; }
      let e = x; while (e < w && L[e] >= lo) e++;
      if (e - x > 1) {
        const order = []; for (let k = x; k < e; k++) order.push(k);
        order.sort((a, b) => L[a] - L[b]);
        const vals = new Uint32Array(order.length);
        for (let k = 0; k < order.length; k++) vals[k] = px[row + order[k]];
        px.set(vals, row + x);
      }
      x = e;
    }
  }
}

function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

// ---------- the pipeline ----------

const NAMES = ['a', 's', 'm', 't', 't2', 'u', 'q', 'p', 'j', 'f'];

class Pipeline {
  constructor() {
    this.c = {}; this.x = {};
    for (const n of NAMES) {
      this.c[n] = mk();
      this.x[n] = this.c[n].getContext('2d', { willReadFrequently: n === 's' || n === 'a' || n === 't' });
    }
    this.alpha = false;
  }
  // a clean scratch canvas at this size
  size(n, w, h) {
    const c = this.c[n], x = this.x[n];
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
    if (HAS_FILTER) x.filter = 'none';
    x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
    x.clearRect(0, 0, w, h);
    return x;
  }
  release() { for (const n of NAMES) { this.c[n].width = this.c[n].height = 1; } }
  copyBack(n) {
    const sx = this.x.s;
    sx.globalCompositeOperation = 'copy'; sx.drawImage(this.c[n], 0, 0); sx.globalCompositeOperation = 'source-over';
  }

  async run(src, v, o = {}) {
    const W = src.width, H = src.height, u = Math.min(W, H) / 720;
    const t = k => v[k] / 100;

    // warp on the full-size source
    let cur = src;
    if (v.bulge || v.swirl || v.fish || v.wave || v.ripple || v.stretch || v.kaleido || v.mirrorH || v.mirrorV) {
      warp(src, this.size('a', W, H), v);
      cur = this.c.a;
    }

    // shrink for pixels; everything after this runs on the small picture
    const p = Math.max(1, Math.round(v.pix * u));
    const w = Math.max(1, Math.round(W / p)), h = Math.max(1, Math.round(H / p));
    const sx = this.size('s', w, h), S = this.c.s;
    sx.drawImage(cur, 0, 0, w, h);
    const us = Math.min(w, h) / 720, short = Math.min(w, h);
    if (o.alpha) { this.size('m', w, h).drawImage(S, 0, 0); }

    this.blurStage(v, w, h, short, t);
    if (COLOR_KEYS.some(k => v[k])) {
      const img = sx.getImageData(0, 0, w, h);
      colorPass(img, v);
      sx.putImageData(img, 0, 0);
    }
    if (v.nr) {
      blurTo(this.size('t', w, h), S, 1.5 * us + .5);
      sx.globalAlpha = .85 * t('nr'); sx.drawImage(this.c.t, 0, 0); sx.globalAlpha = 1;
    }
    if (v.sharp || v.def) {
      let bd = null;
      if (v.def) { blurTo(this.size('t', w, h), S, .02 * short); bd = this.x.t.getImageData(0, 0, w, h).data; }
      const img = sx.getImageData(0, 0, w, h);
      sharpenPass(img, v.sharp, v.def, bd);
      sx.putImageData(img, 0, 0);
    }
    this.artStage(v, w, h, us, t);
    this.lightStage(v, w, h, short, t);
    this.glitchStage(v, w, h, us, t);
    if (o.alpha) {
      sx.globalCompositeOperation = 'destination-in'; sx.drawImage(this.c.m, 0, 0); sx.globalCompositeOperation = 'source-over';
    }

    // back up to full size with hard pixel edges
    const px = this.size('p', W, H);
    px.imageSmoothingEnabled = p === 1;
    px.drawImage(S, 0, 0, W, H);

    let fin = this.c.p;
    if (v.jpg) fin = await this.jpeg(this.c.p, v, W, H, u, o);
    return this.frame(fin, v, W, H, o.alpha);
  }

  // draw the picture n times, each a little further along; alpha 1/(k+1) makes them average out
  smear(w, h, n, place) {
    const tx = this.size('t', w, h);
    for (let k = 0; k < n; k++) {
      tx.setTransform(1, 0, 0, 1, 0, 0); tx.globalAlpha = 1 / (k + 1);
      place(tx, k);
      tx.drawImage(this.c.s, 0, 0);
    }
    tx.setTransform(1, 0, 0, 1, 0, 0); tx.globalAlpha = 1;
    this.copyBack('t');
  }

  blurStage(v, w, h, short, t) {
    const sx = this.x.s, S = this.c.s, cx = w / 2, cy = h / 2, n = 13;
    const alt = k => (k % 2 ? 1 : -1) * Math.ceil(k / 2);
    if (v.blur) { blurTo(this.size('t', w, h), S, t('blur') * .05 * short); this.copyBack('t'); }
    if (v.motion) {
      const len = t('motion') * .15 * short, a = v.angle * Math.PI / 180, cs = Math.cos(a), sn = Math.sin(a), step = len / (n - 1);
      this.smear(w, h, n, (tx, k) => tx.translate(alt(k) * step * cs, alt(k) * step * sn));
    }
    if (v.zoom) {
      const k1 = t('zoom') * .35 / (n - 1);
      this.smear(w, h, n, (tx, k) => { const s = 1 + k * k1; tx.translate(cx - cx * s, cy - cy * s); tx.scale(s, s); });
    }
    if (v.spin) {
      const step = t('spin') * .35 / (n - 1);
      this.smear(w, h, n, (tx, k) => { tx.translate(cx, cy); tx.rotate(alt(k) * step); tx.translate(-cx, -cy); });
    }
    if (v.tilt) {
      const tx = this.size('t', w, h);
      blurTo(tx, S, t('tilt') * .05 * short);
      const y0 = v.focus / 100 * h, band = .16 * h, fe = .18 * h, span = 2 * (band + fe);
      const g = tx.createLinearGradient(0, y0 - band - fe, 0, y0 + band + fe);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(fe / span, '#000'); g.addColorStop(1 - fe / span, '#000'); g.addColorStop(1, 'rgba(0,0,0,0)');
      tx.globalCompositeOperation = 'destination-out'; tx.fillStyle = g; tx.fillRect(0, 0, w, h);
      tx.globalCompositeOperation = 'source-over';
      sx.drawImage(this.c.t, 0, 0);
    }
    if (v.soft) {
      blurTo(this.size('t', w, h), S, .03 * short * (.5 + t('soft') * .5));
      sx.globalAlpha = t('soft') * .85; sx.drawImage(this.c.t, 0, 0); sx.globalAlpha = 1;
    }
  }

  artStage(v, w, h, us, t) {
    const sx = this.x.s;
    if (v.edges || v.outline || v.emboss) {
      const img = sx.getImageData(0, 0, w, h); edgePass(img, v); sx.putImageData(img, 0, 0);
    }
    if (v.oil) {
      const img = sx.getImageData(0, 0, w, h); oilPass(img, Math.max(1, Math.round((1 + t('oil') * 3) * us))); sx.putImageData(img, 0, 0);
    }
    if (v.half) this.dots(w, h, us, t('half'), false);
    if (v.led) this.dots(w, h, us, t('led'), true);
    if (v.dither) {
      const img = sx.getImageData(0, 0, w, h); ditherPass(img, v); sx.putImageData(img, 0, 0);
    }
  }

  // halftone (black dots on paper) or led (colored dots on black)
  dots(w, h, us, t, led) {
    const cell = Math.max(3, Math.round((3 + t * 14) * us));
    const cols = Math.ceil(w / cell), rows = Math.ceil(h / cell);
    const tx = this.size('t', cols, rows);
    tx.drawImage(this.c.s, 0, 0, cols, rows);
    const d = tx.getImageData(0, 0, cols, rows).data, sx = this.x.s;
    sx.fillStyle = led ? '#000' : '#fff'; sx.fillRect(0, 0, w, h);
    if (!led) { sx.fillStyle = '#000'; sx.beginPath(); }
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const i = (r * cols + c) * 4, cx = c * cell + cell / 2, cy = r * cell + cell / 2;
      if (led) {
        sx.fillStyle = `rgb(${d[i]},${d[i + 1]},${d[i + 2]})`;
        sx.beginPath(); sx.arc(cx, cy, cell * .42, 0, 7); sx.fill();
      } else {
        const L = (.2126 * d[i] + .7152 * d[i + 1] + .0722 * d[i + 2]) / 255;
        const rad = Math.min(cell * .72, cell * .6 * (1 - L));
        if (rad > .3) { sx.moveTo(cx + rad, cy); sx.arc(cx, cy, rad, 0, 7); }
      }
    }
    if (!led) sx.fill();
  }

  lightStage(v, w, h, short, t) {
    const sx = this.x.s, S = this.c.s;
    if (v.glow) {
      blurTo(this.size('t', w, h), S, .04 * short * (.3 + .7 * t('glow')));
      sx.globalCompositeOperation = 'screen'; sx.globalAlpha = t('glow'); sx.drawImage(this.c.t, 0, 0);
      sx.globalAlpha = 1; sx.globalCompositeOperation = 'source-over';
    }
    if (v.leak) {
      sx.globalCompositeOperation = 'screen'; sx.globalAlpha = t('leak');
      const blob = (x, y, r, hue) => {
        const g = sx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, hsl(hue, 100, 60)); g.addColorStop(.5, hsl(hue, 100, 50, .5)); g.addColorStop(1, hsl(hue, 100, 50, 0));
        sx.fillStyle = g; sx.fillRect(0, 0, w, h);
      };
      blob(w * .88, h * .12, short * .75, v.leakhue);
      blob(w * .05, h * .65, short * .5, v.leakhue + 35);
      sx.globalAlpha = 1; sx.globalCompositeOperation = 'source-over';
    }
    if (v.flare) {
      const q = v.flarepos / 100, fx = w * (.12 + .76 * q), fy = h * (.12 + .76 * q), cx = w / 2, cy = h / 2;
      sx.globalCompositeOperation = 'screen'; sx.globalAlpha = t('flare');
      let g = sx.createRadialGradient(fx, fy, 0, fx, fy, short * .14);
      g.addColorStop(0, '#fff'); g.addColorStop(.3, 'rgba(255,240,200,.7)'); g.addColorStop(1, 'rgba(255,200,120,0)');
      sx.fillStyle = g; sx.fillRect(0, 0, w, h);
      g = sx.createRadialGradient(fx, fy, short * .2, fx, fy, short * .3);
      g.addColorStop(0, 'rgba(255,120,200,0)'); g.addColorStop(.5, 'rgba(255,120,200,.35)'); g.addColorStop(1, 'rgba(120,200,255,0)');
      sx.fillStyle = g; sx.fillRect(0, 0, w, h);
      g = sx.createLinearGradient(0, fy, w, fy);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      sx.fillStyle = g; sx.fillRect(0, fy - short * .012, w, short * .024);
      for (const [k, hue, r] of [[-.45, 190, .05], [-.9, 300, .08], [1.5, 120, .04], [-1.4, 40, .03]]) {
        const gx = cx + (fx - cx) * k, gy = cy + (fy - cy) * k;
        g = sx.createRadialGradient(gx, gy, 0, gx, gy, short * r);
        g.addColorStop(0, hsl(hue, 100, 70, .5)); g.addColorStop(1, hsl(hue, 100, 70, 0));
        sx.fillStyle = g; sx.fillRect(0, 0, w, h);
      }
      sx.globalAlpha = 1; sx.globalCompositeOperation = 'source-over';
    }
    if (v.wash) {
      const g = sx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, hsl(v.washhue, 90, 60)); g.addColorStop(1, hsl(v.washhue + 70, 90, 60));
      sx.globalCompositeOperation = 'soft-light'; sx.globalAlpha = t('wash');
      sx.fillStyle = g; sx.fillRect(0, 0, w, h);
      sx.globalAlpha = 1; sx.globalCompositeOperation = 'source-over';
    }
    if (v.vig) {
      const R = Math.hypot(w, h) / 2, col = v.vig > 0 ? '0,0,0' : '255,255,255';
      const g = sx.createRadialGradient(w / 2, h / 2, R * .35, w / 2, h / 2, R * 1.05);
      g.addColorStop(0, `rgba(${col},0)`); g.addColorStop(1, `rgba(${col},1)`);
      sx.globalAlpha = Math.abs(t('vig')) * .9; sx.fillStyle = g; sx.fillRect(0, 0, w, h); sx.globalAlpha = 1;
    }
  }

  // splits the picture into r/g/b layers and lets `draw` put each back however it likes
  channels(w, h, draw) {
    const S = this.c.s, tx = this.size('t', w, h), t2x = this.size('t2', w, h);
    tx.fillStyle = '#000'; tx.fillRect(0, 0, w, h);
    for (let c = 0; c < 3; c++) {
      t2x.globalCompositeOperation = 'source-over';
      t2x.fillStyle = '#000'; t2x.fillRect(0, 0, w, h); t2x.drawImage(S, 0, 0);
      t2x.globalCompositeOperation = 'multiply'; t2x.fillStyle = ['#f00', '#0f0', '#00f'][c]; t2x.fillRect(0, 0, w, h);
      tx.globalCompositeOperation = 'lighter';
      draw(tx, c, this.c.t2);
      tx.globalAlpha = 1; tx.setTransform(1, 0, 0, 1, 0, 0);
    }
    tx.globalCompositeOperation = 'destination-in'; tx.drawImage(S, 0, 0);
    tx.globalCompositeOperation = 'source-over';
    this.copyBack('t');
  }

  glitchStage(v, w, h, us, t) {
    const sx = this.x.s, S = this.c.s, cx = w / 2, cy = h / 2;
    if (v.rgb) {
      const off = t('rgb') * .04 * w;
      this.channels(w, h, (tx, c, ch) => tx.drawImage(ch, c === 0 ? -off : c === 2 ? off : 0, 0));
    }
    if (v.aber) {
      const k = t('aber') * .06;
      this.channels(w, h, (tx, c, ch) => { const s = c === 0 ? 1 + k : c === 2 ? 1 - k : 1; tx.drawImage(ch, cx - cx * s, cy - cy * s, w * s, h * s); });
    }
    if (v.vhs) {
      const q = t('vhs'), sm = (1 + 10 * q) * us;
      this.channels(w, h, (tx, c, ch) => {
        if (c === 1) { tx.drawImage(ch, 0, 0); return; }
        const ux = this.size('u', w, h), dir = c === 0 ? -1 : 1;
        for (let i = 0; i < 5; i++) { ux.globalAlpha = 1 / (i + 1); ux.drawImage(ch, dir * i * sm / 4, 0); }
        tx.drawImage(this.c.u, 0, 0);
      });
      this.size('u', w, h).drawImage(S, 0, 0);
      const y0 = h * .62, bh = h * .05 * (.5 + q);
      sx.drawImage(this.c.u, 0, y0, w, bh, w * .05 * q, y0, w, bh);
      sx.fillStyle = `rgba(255,255,255,${.18 * q})`; sx.fillRect(0, y0, w, bh * .3);
      const r = rng(99);
      for (let k = 0; k < 8 * q; k++) {
        const y = r() * h, hh = Math.max(1, Math.round((1 + r() * 3) * us));
        sx.drawImage(this.c.u, 0, y, w, hh, (r() - .5) * w * .04 * q, y, w, hh);
      }
    }
    if (v.scan) {
      const gap = Math.max(2, Math.round(3 * us)), qx = this.size('q', 1, gap);
      qx.fillStyle = '#000'; qx.fillRect(0, 0, 1, Math.max(1, Math.round(gap / 3)));
      sx.globalAlpha = t('scan') * .6; sx.fillStyle = sx.createPattern(this.c.q, 'repeat'); sx.fillRect(0, 0, w, h); sx.globalAlpha = 1;
    }
    if (v.slices) {
      this.size('u', w, h).drawImage(S, 0, 0);
      const r = rng(7), q = t('slices');
      for (let k = 0; k < q * 40; k++) {
        const y = r() * h, hh = Math.max(1, (2 + r() * 40) * us);
        sx.drawImage(this.c.u, 0, y, w, hh, (r() - .5) * 2 * q * .25 * w, y, w, hh);
      }
    }
    if (v.blocks) {
      this.size('u', w, h).drawImage(S, 0, 0);
      const r = rng(13), q = t('blocks');
      for (let k = 0; k < q * 30; k++) {
        const bw = (.05 + r() * .25) * w, bh = (.03 + r() * .15) * h, x = r() * (w - bw), y = r() * (h - bh);
        sx.drawImage(this.c.u, x, y, bw, bh, x + (r() - .5) * .12 * w * q, y + (r() - .5) * .06 * h * q, bw, bh);
      }
    }
    if (v.sort) {
      const img = sx.getImageData(0, 0, w, h); sortPass(img, t('sort')); sx.putImageData(img, 0, 0);
    }
  }

  async jpeg(src, v, W, H, u, o) {
    const q = .5 * (1 - v.jpg / 100) ** 1.5;
    const c = Math.max(1, v.chunk * u);
    const w = Math.max(16, Math.round(W / c)), h = Math.max(16, Math.round(H / c));
    const passes = o.thumb ? Math.min(v.pass, 2) : v.pass;
    const tx = this.size('t2', w + 8, h + 8), T = this.c.t2;
    let cur = src;
    for (let i = 0; i < passes; i++) {
      // re-saving on the same 8x8 grid stops doing damage after a pass or two, so slide the grid each time
      const dx = i * 3 % 8, dy = i * 5 % 8;
      tx.drawImage(cur, 0, 0, w + 8, h + 8);
      tx.drawImage(cur, dx, dy, w, h);
      const blob = await new Promise(res => T.toBlob(res, 'image/jpeg', q));
      if (!blob) break;
      const bmp = await createImageBitmap(blob, dx, dy, w, h);
      if (cur !== src) cur.close();
      cur = bmp;
    }
    const jx = this.size('j', W, H);
    jx.imageSmoothingQuality = 'low';
    jx.drawImage(cur, 0, 0, W, H);
    if (cur !== src) cur.close();
    if (o.alpha) { jx.globalCompositeOperation = 'destination-in'; jx.drawImage(src, 0, 0); jx.globalCompositeOperation = 'source-over'; }
    return this.c.j;
  }

  frame(src, v, W, H, alpha) {
    const mn = Math.min(W, H), b = Math.round(v.border / 100 * .1 * mn), pol = v.polaroid;
    const pad = b + (pol ? Math.round(.06 * mn) : 0), padB = b + (pol ? Math.round(.26 * mn) : 0);
    const W2 = W + 2 * pad, H2 = H + pad + padB, rad = v.corners / 100 * .3 * mn;
    const fx = this.size('f', W2, H2);
    if (pad || padB) {
      fx.fillStyle = v.bcolor;
      if (rad && !pol) { roundRect(fx, 0, 0, W2, H2, rad + pad); fx.fill(); } else fx.fillRect(0, 0, W2, H2);
    }
    fx.save();
    if (rad) { roundRect(fx, pad, pad, W, H, rad); fx.clip(); }
    fx.drawImage(src, pad, pad);
    fx.restore();
    if (v.date) {
      const d = new Date(), txt = `${d.getMonth() + 1} ${d.getDate()} '${String(d.getFullYear()).slice(2)}`;
      fx.font = `${Math.round(.045 * mn)}px Silkscreen, "Courier New", monospace`;
      fx.textAlign = 'right'; fx.textBaseline = 'bottom';
      fx.shadowColor = 'rgba(255,110,0,.95)'; fx.shadowBlur = .012 * mn;
      fx.fillStyle = '#ffb040'; fx.fillText(txt, pad + W - .04 * mn, pad + H - .035 * mn);
      fx.shadowBlur = 0;
    }
    this.alpha = !!alpha || rad > 0;
    return this.c.f;
  }
}

return { Pipeline, HAS_FILTER };
})();

(function () {
'use strict';
const RS = window.RS = window.RS || {};
const BASE = 'ocr/';
const OFF = [2, 1, 0];
class Img {
constructor(px, w, h) { this.px = px; this.w = w; this.h = h; }
c(x, y, ch) {
const w = this.w, h = this.h;
if (x < 0) x = 0; if (y < 0) y = 0; if (x > w - 1) x = w - 1; if (y > h - 1) y = h - 1;
const x0 = x | 0, y0 = y | 0, x1 = Math.min(x0 + 1, w - 1), y1 = Math.min(y0 + 1, h - 1), fx = x - x0, fy = y - y0, o = OFF[ch], p = this.px;
const a = p[(y0 * w + x0) * 4 + o], b = p[(y0 * w + x1) * 4 + o], d = p[(y1 * w + x0) * 4 + o], e = p[(y1 * w + x1) * 4 + o];
return (a * (1 - fx) + b * fx) * (1 - fy) + (d * (1 - fx) + e * fx) * fy;
}
ruota90() {
const w = this.w, h = this.h, s = new Uint32Array(this.px.buffer, this.px.byteOffset, w * h), q = new Uint32Array(w * h);
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) q[x * h + (h - 1 - y)] = s[y * w + x];
return new Img(new Uint8ClampedArray(q.buffer), h, w);
}
ruota180() {
const n = this.w * this.h, s = new Uint32Array(this.px.buffer, this.px.byteOffset, n), q = new Uint32Array(n);
for (let i = 0; i < n; i++) q[n - 1 - i] = s[i];
return new Img(new Uint8ClampedArray(q.buffer), this.w, this.h);
}
raddrizza(gradi) {
const r = gradi * Math.PI / 180, cs = Math.cos(r), sn = Math.sin(r), w = this.w, h = this.h;
const nw = Math.ceil(Math.abs(w * cs) + Math.abs(h * sn)), nh = Math.ceil(Math.abs(w * sn) + Math.abs(h * cs));
const q = new Uint8ClampedArray(nw * nh * 4), cx = (w - 1) / 2, cy = (h - 1) / 2, ncx = (nw - 1) / 2, ncy = (nh - 1) / 2, f = this.coloreBordo();
for (let y = 0; y < nh; y++) {
const dy = y - ncy;
for (let x = 0; x < nw; x++) {
const dx = x - ncx, sx = cx + dx * cs - dy * sn, sy = cy + dx * sn + dy * cs, i = (y * nw + x) * 4;
if (sx < 0 || sy < 0 || sx > w - 1 || sy > h - 1) { q[i] = f[0]; q[i + 1] = f[1]; q[i + 2] = f[2]; q[i + 3] = 255; continue; }
q[i] = Math.floor(this.c(sx, sy, 2) + 0.5); q[i + 1] = Math.floor(this.c(sx, sy, 1) + 0.5); q[i + 2] = Math.floor(this.c(sx, sy, 0) + 0.5); q[i + 3] = 255;
}
}
return new Img(q, nw, nh);
}
coloreBordo() {
let r = 0, g = 0, b = 0, n = 0; const p = this.px, w = this.w, h = this.h;
for (let x = 0; x < w; x += 8) for (let k = 0; k < 2; k++) { const i = ((k === 0 ? 0 : h - 1) * w + x) * 4; r += p[i]; g += p[i + 1]; b += p[i + 2]; n++; }
return n === 0 ? [128, 128, 128] : [Math.floor(r / n), Math.floor(g / n), Math.floor(b / n)];
}
ritaglia(x0, y0, x1, y1) {
const nw = x1 - x0, nh = y1 - y0, q = new Uint8ClampedArray(nw * nh * 4);
for (let y = 0; y < nh; y++) q.set(this.px.subarray(((y + y0) * this.w + x0) * 4, ((y + y0) * this.w + x0 + nw) * 4), y * nw * 4);
return new Img(q, nw, nh);
}
}
const lung = q => Math.hypot(q.ux, q.uy), alt = q => Math.hypot(q.vx, q.vy);
let pronto = null, det, rec, ori, dict;
function caricaScript(src) {
return new Promise((ok, ko) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => ko(new Error('motore di lettura non caricato')); document.head.appendChild(s); });
}
function carica() {
if (pronto) return pronto;
pronto = (async () => {
if (!window.ort) await caricaScript(BASE + 'ort.wasm.min.js');
const ort = window.ort;
ort.env.wasm.wasmPaths = new URL(BASE, location.href).href;
ort.env.wasm.numThreads = 1;
ort.env.wasm.proxy = false;
ort.env.logLevel = 'error';
const opz = { executionProviders: ['wasm'], graphOptimizationLevel: 'all', logSeverityLevel: 3 };
const scarica = async n => new Uint8Array(await (await fetch(BASE + n)).arrayBuffer());
det = await ort.InferenceSession.create(await scarica('det.onnx'), opz);
rec = await ort.InferenceSession.create(await scarica('rec.onnx'), opz);
try { ori = await ort.InferenceSession.create(await scarica('ori.onnx'), opz); } catch (e) { ori = null; }
dict = (await (await fetch(BASE + 'rec_dict.txt')).text()).split('\n');
while (dict.length && dict[dict.length - 1] === '') dict.pop();
})();
pronto.catch(() => { pronto = null; });
return pronto;
}
async function esegui(s, dati, forma) {
const ort = window.ort, t = new ort.Tensor('float32', dati, forma);
const out = await s.run({ [s.inputNames[0]]: t });
return out[s.outputNames[0]];
}
let ultimaPausa = 0;
const canale = typeof MessageChannel === 'function' ? new MessageChannel() : null, attese = [];
if (canale) canale.port1.onmessage = () => { const f = attese.shift(); if (f) f(); };
const respira = () => {
const ora = performance.now();
if (ora - ultimaPausa < 50) return Promise.resolve();
ultimaPausa = ora;
return new Promise(r => { if (canale) { attese.push(r); canale.port2.postMessage(0); } else setTimeout(r, 0); });
};
const MEAN = [0.485, 0.456, 0.406], STD = [0.229, 0.224, 0.225];
const LATO_DET = 960, SOGLIA = 0.3, SOGLIA_BOX = 0.6;
function claheLum(L, w, h) {
const NT = 8, tw = Math.max(8, Math.floor(w / NT)), th = Math.max(8, Math.floor(h / NT));
const nx = Math.max(1, Math.floor(w / tw)), ny = Math.max(1, Math.floor(h / th)), lut = [];
for (let ty = 0; ty < ny; ty++) for (let tx = 0; tx < nx; tx++) {
const x0 = Math.floor(tx * w / nx), x1 = Math.floor((tx + 1) * w / nx), y0 = Math.floor(ty * h / ny), y1 = Math.floor((ty + 1) * h / ny);
const hg = new Float32Array(256); let n = 0;
for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { hg[Math.max(0, Math.min(255, L[y * w + x] | 0))]++; n++; }
const lim = Math.max(1, n * 3 / 256); let ecc = 0;
for (let i = 0; i < 256; i++) if (hg[i] > lim) { ecc += hg[i] - lim; hg[i] = lim; }
const add = ecc / 256, l = new Float32Array(256); let s = 0;
for (let i = 0; i < 256; i++) { s += hg[i] + add; l[i] = s * 255 / Math.max(1, n); }
lut[ty * nx + tx] = l;
}
const o = new Float32Array(L.length);
for (let y = 0; y < h; y++) {
const gy = (y + 0.5) * ny / h - 0.5; let a0 = Math.floor(gy); const fy = gy - a0, a1 = Math.min(ny - 1, a0 + 1); a0 = Math.max(0, a0);
for (let x = 0; x < w; x++) {
const gx = (x + 0.5) * nx / w - 0.5; let b0 = Math.floor(gx); const fx = gx - b0, b1 = Math.min(nx - 1, b0 + 1); b0 = Math.max(0, b0);
const v = Math.max(0, Math.min(255, L[y * w + x] | 0));
o[y * w + x] = (lut[a0 * nx + b0][v] * (1 - fx) + lut[a0 * nx + b1][v] * fx) * (1 - fy) + (lut[a1 * nx + b0][v] * (1 - fx) + lut[a1 * nx + b1][v] * fx) * fy;
}
}
return o;
}
async function rileva(im) {
const sc = LATO_DET / Math.max(im.w, im.h);
const rw = Math.max(32, Math.round(im.w * sc / 32) * 32), rh = Math.max(32, Math.round(im.h * sc / 32) * 32);
const kx = im.w / rw, ky = im.h / rh, pl = rh * rw;
const ns = Math.max(kx, ky) > 1.3 ? 2 : 1;
const rgb = new Float32Array(3 * pl), lum = new Float32Array(pl);
for (let y = 0; y < rh; y++) for (let x = 0; x < rw; x++) {
const i = y * rw + x; let b = 0, g = 0, r = 0;
for (let ay = 0; ay < ns; ay++) for (let ax = 0; ax < ns; ax++) {
const sx = (x + (ax + 0.5) / ns) * kx - 0.5, sy = (y + (ay + 0.5) / ns) * ky - 0.5;
b += im.c(sx, sy, 0); g += im.c(sx, sy, 1); r += im.c(sx, sy, 2);
}
const d = ns * ns; b /= d; g /= d; r /= d;
rgb[i] = b; rgb[pl + i] = g; rgb[2 * pl + i] = r; lum[i] = 0.114 * b + 0.587 * g + 0.299 * r;
}
const nuova = claheLum(lum, rw, rh), t = new Float32Array(3 * pl);
for (let i = 0; i < pl; i++) {
const gain = Math.max(0.5, Math.min(4, nuova[i] / Math.max(4, lum[i])));
for (let c = 0; c < 3; c++) t[c * pl + i] = (Math.min(255, rgb[c * pl + i] * gain) / 255 - MEAN[c]) / STD[c];
}
await respira();
const p = (await esegui(det, t, [1, 3, rh, rw])).data;
await respira();
const on = new Uint8Array(pl), lab = new Int32Array(pl), coda = new Int32Array(pl), out = [];
for (let i = 0; i < pl; i++) on[i] = p[i] > SOGLIA ? 1 : 0;
let n = 0;
for (let s = 0; s < pl; s++) {
if (!on[s] || lab[s] !== 0) continue;
n++;
let qa = 0, qb = 0; coda[qb++] = s; lab[s] = n;
let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0, sp = 0;
while (qa < qb) {
const i = coda[qa++], x = i % rw, y = (i / rw) | 0;
sx += x; sy += y; sxx += x * x; syy += y * y; sxy += x * y; sp += p[i];
for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
const xx = x + dx, yy = y + dy;
if (xx < 0 || yy < 0 || xx >= rw || yy >= rh) continue;
const j = yy * rw + xx;
if (on[j] && lab[j] === 0) { lab[j] = n; coda[qb++] = j; }
}
}
const cnt = qb;
if (cnt < 12) continue;
if (sp / cnt < SOGLIA_BOX) continue;
const mx = sx / cnt, my = sy / cnt, cxx = sxx / cnt - mx * mx, cyy = syy / cnt - my * my, cxy = sxy / cnt - mx * my;
const th = 0.5 * Math.atan2(2 * cxy, cxx - cyy);
let ux = Math.cos(th), uy = Math.sin(th), vx = -uy, vy = ux;
let a0 = 1e9, a1 = -1e9, b0 = 1e9, b1 = -1e9;
for (let k = 0; k < cnt; k++) {
const i = coda[k], x = i % rw - mx, y = ((i / rw) | 0) - my, a = x * ux + y * uy, b = x * vx + y * vy;
if (a < a0) a0 = a; if (a > a1) a1 = a; if (b < b0) b0 = b; if (b > b1) b1 = b;
}
a0 -= 0.5; a1 += 0.5; b0 -= 0.5; b1 += 0.5;
const L = a1 - a0, H = b1 - b0;
if (Math.min(L, H) < 3) continue;
const d = L * H * 1.5 / (2 * (L + H));
a0 -= d; a1 += d; b0 -= d; b1 += d;
if (Math.min(a1 - a0, b1 - b0) < 5) continue;
if (ux < 0) { ux = -ux; uy = -uy; let t0 = a0; a0 = -a1; a1 = -t0; t0 = b0; b0 = -b1; b1 = -t0; }
vx = -uy; vy = ux;
const px0 = mx + a0 * ux + b0 * vx, py0 = my + a0 * uy + b0 * vy;
out.push({ x0: (px0 + 0.5) * kx - 0.5, y0: (py0 + 0.5) * ky - 0.5, ux: (a1 - a0) * ux * kx, uy: (a1 - a0) * uy * ky, vx: (b1 - b0) * vx * kx, vy: (b1 - b0) * vy * ky, score: sp / cnt });
if (out.length >= 400) break;
}
return out;
}
async function capovolta(im, q) {
const W = 160, H = 80, t = new Float32Array(3 * W * H);
ritaglio(im, q, W, H, t, W, false, true);
const o = (await esegui(ori, t, [1, 3, H, W])).data;
return o[1] > o[0] && o[1] > 0.85;
}
function ritaglio(im, q, Wc, H, t, Wt, capov, imagenet) {
const pl = H * Wt, passo = Math.max(alt(q) / H, lung(q) / Wc), ns = passo > 1.4 ? 2 : 1, v = new Float32Array(3 * H * Wc);
for (let y = 0; y < H; y++) for (let x = 0; x < Wc; x++) {
let b = 0, g = 0, r = 0;
for (let ay = 0; ay < ns; ay++) for (let ax = 0; ax < ns; ax++) {
let fx = (x + (ax + 0.5) / ns) / Wc, fy = (y + (ay + 0.5) / ns) / H;
if (capov) { fx = 1 - fx; fy = 1 - fy; }
const sx = q.x0 + fx * q.ux + fy * q.vx, sy = q.y0 + fx * q.uy + fy * q.vy;
b += im.c(sx, sy, 0); g += im.c(sx, sy, 1); r += im.c(sx, sy, 2);
}
const d = ns * ns * 255, i = (y * Wc + x) * 3;
v[i] = b / d; v[i + 1] = g / d; v[i + 2] = r / d;
}
let lo = 0, sca = 1;
if (!imagenet) {
const hg = new Int32Array(256), n = H * Wc;
for (let i = 0; i < n; i++) hg[Math.min(255, ((0.114 * v[i * 3] + 0.587 * v[i * 3 + 1] + 0.299 * v[i * 3 + 2]) * 255) | 0)]++;
let a = 0, s = 0; while (a < 255 && s + hg[a] < n * 0.02) s += hg[a++];
let e = 255; s = 0; while (e > 0 && s + hg[e] < n * 0.02) s += hg[e--];
const rng = (e - a) / 255;
if (rng > 0.08 && rng < 0.75) { lo = a / 255; sca = 1 / rng; }
}
for (let y = 0; y < H; y++) for (let x = 0; x < Wc; x++) {
const i = y * Wt + x, j = (y * Wc + x) * 3;
for (let c = 0; c < 3; c++) {
let w = v[j + c];
if (sca !== 1) w = Math.max(0, Math.min(1, (w - lo) * sca));
t[c * pl + i] = imagenet ? (w - MEAN[c]) / STD[c] : (w - 0.5) / 0.5;
}
}
}
async function leggiUna(im, q, largo) {
const L = lung(q), A = alt(q);
if (L < 2 || A < 2) return null;
const H = 48, Wc = Math.max(8, Math.min(1600, Math.ceil(largo * H * L / A))), Wt = Math.max(320, Wc), t = new Float32Array(3 * H * Wt);
ritaglio(im, q, Wc, H, t, Wt, false, false);
const ot = await esegui(rec, t, [1, 3, H, Wt]), o = ot.data, T = ot.dims[1], C = ot.dims[2];
let sb = '', somma = 0, n = 0, prima = -1;
for (let k = 0; k < T; k++) {
let best = 0, bv = -1;
for (let c = 0; c < C; c++) { const v = o[k * C + c]; if (v > bv) { bv = v; best = c; } }
if (best !== 0 && best !== prima) { sb += best - 1 < dict.length ? dict[best - 1] : ' '; somma += bv; n++; }
prima = best;
}
const x0 = q.x0, y0 = q.y0, x1 = q.x0 + q.ux, y1 = q.y0 + q.uy, x2 = x1 + q.vx, y2 = y1 + q.vy, x3 = q.x0 + q.vx, y3 = q.y0 + q.vy;
const rx = Math.min(x0, x1, x2, x3), ry = Math.min(y0, y1, y2, y3);
return { testo: sb.trim(), conf: n > 0 ? somma / n : 0, x: rx, y: ry, w: Math.max(x0, x1, x2, x3) - rx, h: Math.max(y0, y1, y2, y3) - ry, ang: Math.atan2(q.uy, q.ux) * 180 / Math.PI };
}
async function leggiRiga(im, q) {
let r = await leggiUna(im, q, 1);
if (!r) return r;
const mrz = r.testo.indexOf('<') >= 0 || (r.testo.length >= 8 && r.testo === r.testo.toUpperCase() && r.testo.indexOf(' ') < 0 && lung(q) > alt(q) * 10);
if (r.conf >= 0.95 && !mrz) return r;
const w = await leggiUna(im, q, 1.5), ax = q.vx * 0.12, ay = q.vy * 0.12;
const h = await leggiUna(im, { x0: q.x0 - ax, y0: q.y0 - ay, ux: q.ux, uy: q.uy, vx: q.vx + 2 * ax, vy: q.vy + 2 * ay }, 1);
for (const x of [w, h]) {
if (!x) continue;
const meglio = mrz ? (x.conf > r.conf - 0.06 && x.testo.length > r.testo.length) || x.conf > r.conf + 0.05 : x.conf > r.conf + 0.01;
if (meglio) { x.x = r.x; x.y = r.y; x.w = r.w; x.h = r.h; x.ang = r.ang; r = x; }
}
return r;
}
async function leggiTutte(im, q) {
const out = [];
for (const k of q) { const r = await leggiRiga(im, k); if (r && r.testo.trim()) out.push(r); await respira(); }
ordina(out);
return unisci(out);
}
function fiducia(l) { let s = 0, n = 0; for (const r of l) { const k = r.testo.length; s += r.conf * k; n += k; } return n === 0 ? 0 : s / n; }
function sembraCapovolto(l) {
let giu = 0, su = 0;
for (const r of l) for (const c of r.testo) { if ('>∀⊥↓ʎɐ'.indexOf(c) >= 0) giu++; else if (c === '<') su++; }
return giu > 4 && giu > su;
}
function unisci(l) {
const o = [];
for (const r of l) {
const a = o.length ? o[o.length - 1] : null;
if (a) {
const ca = a.y + a.h / 2, cb = r.y + r.h / 2, hm = Math.min(a.h, r.h), hM = Math.max(a.h, r.h), gap = r.x - (a.x + a.w);
if (Math.abs(ca - cb) < hm * 0.45 && hM < hm * 1.7 && gap > -hm * 0.3 && gap < hm * 1.6 && Math.abs(a.ang - r.ang) < 6) {
const la = a.testo.length, lb = r.testo.length;
a.conf = (a.conf * la + r.conf * lb) / Math.max(1, la + lb);
a.testo = a.testo + ' ' + r.testo;
const x1 = Math.max(a.x + a.w, r.x + r.w), y0 = Math.min(a.y, r.y), y1 = Math.max(a.y + a.h, r.y + r.h);
a.w = x1 - a.x; a.y = y0; a.h = y1 - y0;
continue;
}
}
o.push(r);
}
return o;
}
function inclinazione(q) {
const v = []; let tot = 0;
for (const k of q) {
if (lung(k) < alt(k) * 2.5) continue;
const a = Math.atan2(k.uy, k.ux) * 180 / Math.PI;
if (Math.abs(a) > 45) continue;
v.push([a, lung(k)]); tot += lung(k);
}
if (v.length < 2) return 0;
v.sort((a, b) => a[0] - b[0]);
let s = 0; for (const x of v) { s += x[1]; if (s >= tot / 2) return x[0]; }
return 0;
}
function zonaTesto(im, q) {
if (q.length < 2) return null;
let a = 1e9, b = 1e9, c = -1e9, d = -1e9, altMed = 0;
for (const k of q) {
const xs = [k.x0, k.x0 + k.ux, k.x0 + k.vx, k.x0 + k.ux + k.vx], ys = [k.y0, k.y0 + k.uy, k.y0 + k.vy, k.y0 + k.uy + k.vy];
for (let i = 0; i < 4; i++) { a = Math.min(a, xs[i]); c = Math.max(c, xs[i]); b = Math.min(b, ys[i]); d = Math.max(d, ys[i]); }
altMed += alt(k);
}
altMed /= q.length;
const mar = Math.max(altMed * 2, Math.max(c - a, d - b) * 0.06);
const x0 = Math.max(0, (a - mar) | 0), y0 = Math.max(0, (b - mar) | 0), x1 = Math.min(im.w, (c + mar) | 0), y1 = Math.min(im.h, (d + mar) | 0);
if (x1 - x0 < 64 || y1 - y0 < 64) return null;
if (Math.max(x1 - x0, y1 - y0) > Math.max(im.w, im.h) * 0.75) return null;
return im.ritaglia(x0, y0, x1, y1);
}
function ordina(l) {
l.sort((a, b) => (a.y + a.h / 2) - (b.y + b.h / 2));
for (let i = 1; i < l.length; i++) for (let j = i; j > 0; j--) {
const a = l[j - 1], b = l[j], ca = a.y + a.h / 2, cb = b.y + b.h / 2, m = Math.min(a.h, b.h) * 0.5;
if (Math.abs(ca - cb) < m && b.x < a.x) { l[j - 1] = b; l[j] = a; } else break;
}
}
async function leggiImg(im) {
let q = await rileva(im);
let vert = 0; for (const k of q) if (Math.abs(k.uy) > Math.abs(k.ux) && lung(k) > alt(k) * 1.5) vert++;
if (q.length >= 3 && vert * 2 > q.length) { im = im.ruota90(); q = await rileva(im); }
const inc = inclinazione(q);
if (Math.abs(inc) > 1.2) { im = im.raddrizza(inc); q = await rileva(im); }
const zona = zonaTesto(im, q);
if (zona) { im = zona; q = await rileva(im); }
if (ori && q.length) {
const ordi = q.slice().sort((a, b) => lung(b) - lung(a));
let si = 0, no = 0;
for (let i = 0; i < Math.min(9, ordi.length); i++) { if (await capovolta(im, ordi[i])) si++; else no++; }
if (si > no) { im = im.ruota180(); q = await rileva(im); }
}
let out = await leggiTutte(im, q);
const f = fiducia(out);
if (f < 0.9 || sembraCapovolto(out)) {
const giro = im.ruota180(), alt2 = await leggiTutte(giro, await rileva(giro));
if (fiducia(alt2) > f + 0.03) out = alt2;
}
return out;
}
async function pixel(src) {
const img = new Image(), temporaneo = src instanceof Blob ? URL.createObjectURL(src) : null;
try { await new Promise((ok, ko) => { img.onload = ok; img.onerror = () => ko(new Error('foto non leggibile')); img.src = temporaneo || src; }); }
finally { if (temporaneo) URL.revokeObjectURL(temporaneo); }
const k = Math.min(1, 2000 / Math.max(img.naturalWidth, img.naturalHeight));
const w = Math.max(1, Math.round(img.naturalWidth * k)), h = Math.max(1, Math.round(img.naturalHeight * k));
const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
const g = cv.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0, w, h);
return new Img(new Uint8ClampedArray(g.getImageData(0, 0, w, h).data), w, h);
}
RS.ocrWeb = {
disponibile() {
return !window.RilsinAndroid && /^https?:$/.test(location.protocol) && typeof WebAssembly === 'object';
},
carica,
async leggi(src) {
await carica();
const im = await pixel(src);
const l = await leggiImg(im);
return { w: im.w, h: im.h, righe: l.map(r => ({ t: r.testo, c: Math.round(r.conf * 1000) / 1000, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.w), h: Math.round(r.h) })) };
}
};
})();

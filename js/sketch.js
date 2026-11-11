(function (RS) {
'use strict';
const dist = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
function semplifica(pts, tol) {
if (!pts || pts.length < 3) return (pts || []).slice();
tol = tol || 0.05;
const primo = 0, ultimo = pts.length - 1;
const tieni = new Array(pts.length).fill(false);
tieni[primo] = tieni[ultimo] = true;
(function dividi(i, j) {
if (j <= i + 1) return;
const a = pts[i], b = pts[j];
const dx = b.x - a.x, dy = b.y - a.y;
const len = Math.hypot(dx, dy);
let peggio = -1, idx = -1;
for (let k = i + 1; k < j; k++) {
const p = pts[k];
const d = len < 1e-9 ? dist(p, a)
: Math.abs(dy * p.x - dx * p.y + b.x * a.y - b.y * a.x) / len;
if (d > peggio) { peggio = d; idx = k; }
}
if (peggio > tol) { tieni[idx] = true; dividi(i, idx); dividi(idx, j); }
})(primo, ultimo);
return pts.filter((p, i) => tieni[i]);
}
function metriche(pts) {
let L = 0;
for (let i = 1; i < pts.length; i++) L += dist(pts[i - 1], pts[i]);
const a = pts[0], b = pts[pts.length - 1];
let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
pts.forEach(p => {
minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
});
const bw = maxX - minX, bh = maxY - minY;
const diag = Math.hypot(bw, bh) || 1;
return {
L, capi: dist(a, b), bw, bh, diag,
cx: (minX + maxX) / 2, cy: (minY + maxY) / 2,
minX, minY, maxX, maxY,
chiuso: dist(a, b) < diag * 0.28 && L > diag * 1.6,
rettilineita: L > 1e-9 ? dist(a, b) / L : 1
};
}
function rettangoloMinimo(pts) {
const perc = (arr, q) => {
const a = arr.slice().sort((x, y) => x - y);
const i = Math.min(a.length - 1, Math.max(0, Math.round((a.length - 1) * q)));
return a[i];
};
let best = null;
for (let g = 0; g < 90; g += 2) {
const r = g * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
const xs = [], ys = [];
for (const p of pts) { xs.push(p.x * c + p.y * s); ys.push(-p.x * s + p.y * c); }
const x0 = perc(xs, 0.04), x1 = perc(xs, 0.96);
const y0 = perc(ys, 0.04), y1 = perc(ys, 0.96);
const w = Math.max(1e-6, x1 - x0), h = Math.max(1e-6, y1 - y0), area = w * h;
if (!best || area < best.area) {
const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
best = { area, w, h, gradi: g, cx: mx * c - my * s, cy: mx * s + my * c };
}
}
if (best.h > best.w) {
const t = best.w; best.w = best.h; best.h = t;
best.gradi = (best.gradi + 90) % 180;
}
return best;
}
function riconosci(el) {
const pts = (el && el.pts) || [];
if (pts.length < 2) return { tipo: null, nome: '', alternative: [] };
const m = metriche(pts);
if (!m.chiuso) {
if (m.rettilineita > 0.93) {
return { tipo: 'road', nome: 'un tratto di strada dritto',
alternative: ['road', 'skid', 'measure', 'band'] };
}
return { tipo: 'roadway', nome: 'una strada curva',
alternative: ['roadway', 'skid', 'zebrapath'] };
}
const r = rettangoloMinimo(pts);
let area2 = 0;
for (let i = 0, n = pts.length; i < n; i++) {
const a = pts[i], b = pts[(i + 1) % n];
area2 += a.x * b.y - b.x * a.y;
}
const areaTratto = Math.abs(area2) / 2;
const riempimento = r.area > 1e-9 ? areaTratto / r.area : 0;
const squadrato = riempimento > 0.80;
const proporzione = r.h > 1e-9 ? r.w / r.h : 99;
if (squadrato && proporzione >= 1.7 && proporzione <= 4.2) {
return { tipo: 'vehicle', nome: 'un veicolo',
alternative: ['vehicle', 'building', 'parking', 'area'] };
}
if (squadrato) {
return { tipo: 'building', nome: 'un edificio',
alternative: ['building', 'vehicle', 'parking', 'area'] };
}
return { tipo: 'area', nome: "un'area", alternative: ['area', 'island', 'building'] };
}
const NOMI = {
road: 'Tratto di strada', roadway: 'Strada curva', skid: 'Traccia di frenata',
measure: 'Quota', band: 'Marciapiede', zebrapath: 'Zebrata curva',
vehicle: 'Veicolo', building: 'Edificio', area: 'Area', island: 'Isola', parking: 'Stalli sosta'
};
function converti(el, tipo, modo) {
const S = RS.scene;
let pts = (el.pts || []).map(p => ({ x: p.x, y: p.y }));
if (pts.length < 2) return null;
const preciso = (modo === 'preciso');
let m = metriche(pts);
let r = rettangoloMinimo(pts);
const arr = (n) => +(n.toFixed(2));
if (preciso) {
pts = semplifica(pts, Math.max(0.15, m.diag * 0.02));
m = metriche(pts); r = rettangoloMinimo(pts);
}
const ang = (g) => preciso ? angoloNotevole(g, 15) : arr(g);
const lun = (v) => preciso ? Math.max(0.5, arrotonda(v, 0.5)) : arr(v);
let nuovo = null;
switch (tipo) {
case 'road':
nuovo = { type: 'road', x: arr((pts[0].x + pts[pts.length-1].x) / 2),
y: arr((pts[0].y + pts[pts.length-1].y) / 2),
rot: ang(Math.atan2(pts[pts.length-1].y - pts[0].y, pts[pts.length-1].x - pts[0].x) * 180 / Math.PI),
len: lun(Math.max(2, m.capi)), wid: 7, lanes: 2, line: 'disc', edge: 'cont', color: '#9aa0a6' };
break;
case 'roadway':
nuovo = { type: 'roadway', pts, width: 7, color: '#9aa0a6', line: 'disc', edge: 'cont' };
break;
case 'zebrapath':
nuovo = { type: 'zebrapath', pts, width: 3, color: '#9aa0a6' };
break;
case 'skid':
nuovo = { type: 'skid', pts, width: 0.18, color: '#202020' };
break;
case 'measure':
nuovo = { type: 'measure', pts: [pts[0], pts[pts.length - 1]], color: '#c0392b' };
break;
case 'band':
nuovo = { type: 'band', sub: 'sidewalk', x: arr(m.cx), y: arr(m.cy),
rot: ang(Math.atan2(pts[pts.length-1].y - pts[0].y, pts[pts.length-1].x - pts[0].x) * 180 / Math.PI),
len: lun(Math.max(1, m.capi)), wid: 1.5, color: '#cfcabb' };
break;
case 'vehicle': {
let L = Math.max(1.5, r.w), W = Math.max(0.8, r.h), kind = 'car', col = '#2f6fed';
if (preciso) {
const v = veicoloVicino(L, W);
if (v) { L = v.len; W = v.wid; kind = v.kind; col = v.color; }
}
nuovo = { type: 'vehicle', kind, x: arr(r.cx), y: arr(r.cy), rot: ang(r.gradi),
len: arr(L), wid: arr(W), label: '', color: col };
break;
}
case 'building':
nuovo = { type: 'building', x: arr(r.cx), y: arr(r.cy), rot: ang(r.gradi),
w: lun(Math.max(1, r.w)), h: lun(Math.max(1, r.h)), color: '#cfc3a8' };
break;
case 'parking':
nuovo = { type: 'parking', x: arr(r.cx), y: arr(r.cy), rot: arr(r.gradi),
w: arr(Math.max(2, r.w)), h: arr(Math.max(2, r.h)), color: '#9aa0a6' };
break;
case 'island':
nuovo = { type: 'island', shape: 'ovale', x: arr(r.cx), y: arr(r.cy), rot: arr(r.gradi),
w: arr(Math.max(1, r.w)), h: arr(Math.max(1, r.h)), color: '#7fae6a' };
break;
case 'area':
default:
nuovo = { type: 'area', sub: 'piazzale', x: arr(m.cx), y: arr(m.cy), rot: 0,
w: arr(Math.max(1, m.bw)), h: arr(Math.max(1, m.bh)), color: '#9aa0a6' };
break;
}
const creato = S.add(nuovo, false);
S.remove([el.id]);
S.snapshot();
S.select(creato.id);
return creato;
}
function arrotonda(v, passo) { return Math.round(v / passo) * passo; }
function angoloNotevole(gradi, passo) {
passo = passo || 15;
let g = arrotonda(gradi, passo) % 360;
if (g < 0) g += 360;
return g;
}
function veicoloVicino(len, wid) {
const V = (RS.catalog && RS.catalog.VEICOLI) || [];
if (!V.length) return null;
const prop = wid > 1e-6 ? len / wid : 2.4;
const preferenza = { car: 0, moto: 0.18, van: 0.2, ape: 0.3, bike: 0.3,
monopattino: 0.35, tract: 0.35, truck: 0.32,
trailer: 0.4, bus: 0.42, artic: 0.45, roadtrain: 0.5 };
if (prop >= 1.85 && prop <= 2.75) {
const auto = V.find(v => v.id === 'autovettura');
if (auto) return auto;
}
let best = null, bestD = 1e9;
for (const v of V) {
const pv = v.len / v.wid;
const d = Math.abs(pv - prop) * 3 + (preferenza[v.kind] != null ? preferenza[v.kind] : 0.3);
if (d < bestD) { bestD = d; best = v; }
}
return best;
}
let K = 0.15;
const LARG_STRADA = 7, GRIGIO = '#9aa0a6';
const PENNE = [['auto', 'Auto'], ['strada', 'Strada'], ['veicolo', 'Veicolo'], ['frenata', 'Frenata'], ['punto', 'Punto fisso'], ['modifica', 'Modifica']];
const ALTRE = [['moto', 'Moto'], ['bici', 'Bici'], ['pedone', 'Pedone'], ['urto', 'Urto'], ['freccia', 'Freccia'], ['tracce', 'Tracce'],
['strisce', 'Strisce'], ['edificio', 'Edificio'], ['area', 'Area'], ['testo', 'Testo'], ['libero', 'Libero']];
const NOME_PENNA = {}; PENNE.concat(ALTRE).forEach(x => { NOME_PENNA[x[0]] = x[1]; });
const CAT = { veicolo: 'autovettura', moto: 'motociclo', bici: 'velocipede', autocarro: 'autocarro' };
const A_TOCCO = { punto: 1, urto: 1, pedone: 1, testo: 1 };
const aSchermo = p => ({ x: p.x / K, y: p.y / K });
const aMondo = p => ({ x: +(p.x * K).toFixed(2), y: +(p.y * K).toFixed(2) });
const spuntone = () => Math.max(12 / K, 60), vicinanza = () => Math.max(5.5 / K, 44), finestra = () => Math.max(12 / K, 64);
function ricampiona(p, s) {
const o = [p[0]]; let res = 0;
for (let i = 1; i < p.length; i++) {
const a = p[i - 1], b = p[i], l = dist(a, b); if (!l) continue;
let t = s - res;
while (t <= l) { o.push({ x: a.x + (b.x - a.x) * t / l, y: a.y + (b.y - a.y) * t / l }); t += s; }
res = (res + l) % s;
}
const u = p[p.length - 1]; if (dist(o[o.length - 1], u) > s / 3) o.push(u);
return o;
}
function liscia(p, g) {
let q = p;
for (let k = 0; k < g; k++) q = q.map((c, i, A) => (i === 0 || i === A.length - 1) ? c : { x: (A[i - 1].x + 2 * c.x + A[i + 1].x) / 4, y: (A[i - 1].y + 2 * c.y + A[i + 1].y) / 4 });
return q;
}
function scarto(p, a, b) {
const l = dist(a, b) || 1; let m = 0;
p.forEach(c => { const v = Math.abs((b.x - a.x) * (a.y - c.y) - (a.x - c.x) * (b.y - a.y)) / l; if (v > m) m = v; });
return m;
}
function dirSnap(g) { const n = ((g % 360) + 360) % 360, q = Math.round(n / 90) * 90; return Math.abs(n - q) <= 8 ? q : Math.round(n / 5) * 5; }
function dritto(a, b, assi) {
let g = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI; if (assi) g = dirSnap(g);
g = g * Math.PI / 180;
const r = dist(a, b), cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
return [{ x: cx - Math.cos(g) * r / 2, y: cy - Math.sin(g) * r / 2 }, { x: cx + Math.cos(g) * r / 2, y: cy + Math.sin(g) * r / 2 }];
}
function angoli(q, w, lim) {
const c = []; let best = -1, bv = 0;
for (let i = w; i < q.length - w; i++) {
const a = q[i - w], m = q[i], b = q[i + w];
let t = Math.abs(Math.atan2(b.y - m.y, b.x - m.x) - Math.atan2(m.y - a.y, m.x - a.x)) * 180 / Math.PI; if (t > 180) t = 360 - t;
if (t > lim) { if (t > bv) { bv = t; best = i; } } else if (best >= 0) { c.push(best); best = -1; bv = 0; }
}
if (best >= 0) c.push(best);
return c;
}
function cerchio(a, b, c) {
const D = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y)); if (Math.abs(D) < 1e-6) return null;
const s = q => q.x * q.x + q.y * q.y;
const x = (s(a) * (b.y - c.y) + s(b) * (c.y - a.y) + s(c) * (a.y - b.y)) / D, y = (s(a) * (c.x - b.x) + s(b) * (a.x - c.x) + s(c) * (b.x - a.x)) / D;
return { x, y, r: Math.hypot(a.x - x, a.y - y) };
}
function arco(q, tol) {
const a = q[0], b = q[q.length - 1], m = q[q.length >> 1], c = cerchio(a, m, b);
if (!c || c.r > 5000) return null;
if (q.some(p => Math.abs(dist(p, c) - c.r) > tol)) return null;
const a0 = Math.atan2(a.y - c.y, a.x - c.x), am = Math.atan2(m.y - c.y, m.x - c.x), a1 = Math.atan2(b.y - c.y, b.x - c.x), T = 2 * Math.PI;
const nrm = x => { while (x < 0) x += T; while (x >= T) x -= T; return x; };
let sw = nrm(a1 - a0); if (nrm(am - a0) > sw) sw -= T;
const o = []; for (let i = 0; i <= 24; i++) { const t = a0 + sw * i / 24; o.push({ x: c.x + c.r * Math.cos(t), y: c.y + c.r * Math.sin(t) }); }
return o;
}
function rdp(p, t) {
if (p.length < 3) return p.slice();
const a = p[0], b = p[p.length - 1], l = dist(a, b) || 1; let m = -1, k = -1;
for (let i = 1; i < p.length - 1; i++) { const v = Math.abs((b.x - a.x) * (a.y - p[i].y) - (a.x - p[i].x) * (b.y - a.y)) / l; if (v > m) { m = v; k = i; } }
if (m <= t) return [a, b];
return rdp(p.slice(0, k + 1), t).slice(0, -1).concat(rdp(p.slice(k), t));
}
function chaikin(p, n) {
let q = p;
for (let k = 0; k < n; k++) {
const o = [q[0]];
for (let i = 0; i < q.length - 1; i++) { const a = q[i], b = q[i + 1]; o.push({ x: .75 * a.x + .25 * b.x, y: .75 * a.y + .25 * b.y }, { x: .25 * a.x + .75 * b.x, y: .25 * a.y + .75 * b.y }); }
o.push(q[q.length - 1]); q = o;
}
return q;
}
function pezzo(q, assi) {
const a = q[0], b = q[q.length - 1], c = dist(a, b);
if (scarto(q, a, b) <= Math.max(9, .05 * c)) return { k: 'dritto', p: dritto(a, b, assi) };
const ar = arco(q, Math.max(7, .04 * c)); if (ar) return { k: 'arco', p: ar };
return { k: 'curva', p: chaikin(rdp(q, Math.max(10, .05 * c)), 3) };
}
function regolarizza(raw, assi) {
const q = liscia(ricampiona(raw, 6), 3), t = [0].concat(angoli(q, 5, 50), [q.length - 1]), parti = [];
for (let i = 0; i < t.length - 1; i++) { const s = q.slice(t[i], t[i + 1] + 1); if (s.length >= 2 && dist(s[0], s[s.length - 1]) >= 18) parti.push(pezzo(s, assi)); }
if (!parti.length) return dritto(q[0], q[q.length - 1], assi);
if (parti.length > 1 && parti.every(x => x.k === 'dritto')) {
const o = [q[0]]; let cur = q[0];
parti.forEach(x => {
const [u, v] = x.p; let g = Math.atan2(v.y - u.y, v.x - u.x) * 180 / Math.PI; if (assi) g = dirSnap(g);
g = g * Math.PI / 180; const L = dist(u, v);
cur = { x: cur.x + Math.cos(g) * L, y: cur.y + Math.sin(g) * L }; o.push(cur);
});
return o;
}
let u = []; parti.forEach(x => { u = u.concat(u.length ? x.p.slice(1) : x.p); });
return u;
}
function info(p) {
let L = 0; for (let i = 1; i < p.length; i++) L += dist(p[i - 1], p[i]);
const xs = p.map(q => q.x), ys = p.map(q => q.y), a = Math.min(...xs), b = Math.max(...xs), c = Math.min(...ys), e = Math.max(...ys), dg = Math.hypot(b - a, e - c) || 1;
return { L, cx: (a + b) / 2, cy: (c + e) / 2, dg, chiuso: dist(p[0], p[p.length - 1]) < dg * .3 && L > dg * 1.6 };
}
function forma(p) {
let best = null;
for (let g = 0; g < 180; g += 3) {
const r = g * Math.PI / 180, c = Math.cos(r), s = Math.sin(r); let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
p.forEach(q => { const u = q.x * c + q.y * s, v = -q.x * s + q.y * c; if (u < x0) x0 = u; if (u > x1) x1 = u; if (v < y0) y0 = v; if (v > y1) y1 = v; });
const w = x1 - x0, h = y1 - y0;
if (!best || w * h < best.a) { const mx = (x0 + x1) / 2, my = (y0 + y1) / 2; best = { a: w * h, w, h, g, cx: mx * c - my * s, cy: mx * s + my * c }; }
}
if (best.h > best.w) { const t = best.w; best.w = best.h; best.h = t; best.g = (best.g + 90) % 180; }
let ar = 0; for (let i = 0, n = p.length; i < n; i++) { const a = p[i], b = p[(i + 1) % n]; ar += a.x * b.y - b.x * a.y; }
best.pieno = Math.abs(ar) / 2 / Math.max(1, best.a); best.asp = best.w / Math.max(1, best.h);
return best;
}
function interseca(a, b, c, e) {
const r = { x: b.x - a.x, y: b.y - a.y }, s = { x: e.x - c.x, y: e.y - c.y }, den = r.x * s.y - r.y * s.x;
if (Math.abs(den) < 1e-6) return null;
const t = ((c.x - a.x) * s.y - (c.y - a.y) * s.x) / den, u = ((c.x - a.x) * r.y - (c.y - a.y) * r.x) / den;
return { t, u, x: a.x + r.x * t, y: a.y + r.y * t };
}
function lung(p) { let L = 0; for (let i = 1; i < p.length; i++) L += dist(p[i - 1], p[i]); return L; }
function taglia(p, s0, s1) {
const o = []; let s = 0;
for (let i = 1; i < p.length; i++) {
const a = p[i - 1], b = p[i], l = dist(a, b); if (!l) continue;
const e = s + l;
if (e >= s0 && s <= s1) {
const t0 = Math.max(0, (s0 - s) / l), t1 = Math.min(1, (s1 - s) / l), u = { x: a.x + (b.x - a.x) * t0, y: a.y + (b.y - a.y) * t0 }, v = { x: a.x + (b.x - a.x) * t1, y: a.y + (b.y - a.y) * t1 };
if (!o.length) o.push(u);
if (dist(o[o.length - 1], v) > .01) o.push(v);
}
s = e;
}
return o.length > 1 ? o : p;
}
function incontri(A, B) {
const o = []; let s = 0;
for (let h = 1; h < A.length; h++) {
const l = dist(A[h - 1], A[h]);
for (let k = 1; k < B.length; k++) { const X = interseca(A[h - 1], A[h], B[k - 1], B[k]); if (X && X.t >= -.01 && X.t <= 1.01 && X.u >= -.01 && X.u <= 1.01) o.push({ x: X.x, y: X.y, s: s + l * X.t }); }
s += l;
}
return o;
}
function versoFine(p) { const L = lung(p), q = taglia(p, Math.max(0, L - 24), L), a = q[0], b = q[q.length - 1], l = dist(a, b) || 1; return { x: (b.x - a.x) / l, y: (b.y - a.y) / l }; }
function versoInizio(p) { const L = lung(p), q = taglia(p, 0, Math.min(L, 24)), a = q[0], b = q[q.length - 1], l = dist(a, b) || 1; return { x: (b.x - a.x) / l, y: (b.y - a.y) / l }; }
function strade() {
const o = [];
RS.scene.elements.forEach(e => {
if (e.type === 'road') {
const r = (e.rot || 0) * Math.PI / 180, c = Math.cos(r) * e.len / 2, s = Math.sin(r) * e.len / 2;
o.push({ el: e, pts: [aSchermo({ x: e.x - c, y: e.y - s }), aSchermo({ x: e.x + c, y: e.y + s })], mezza: (e.wid || LARG_STRADA) / 2 / K, libera: !e.inc });
} else if (e.type === 'roadway' && e.pts && e.pts.length > 1) {
o.push({ el: e, pts: e.pts.map(aSchermo), mezza: (e.width || LARG_STRADA) / 2 / K, libera: !e.inc });
}
});
return o;
}
function suStrada(c, lista) {
let best = null;
(lista || strade()).forEach(r => {
for (let i = 1; i < r.pts.length; i++) {
const a = r.pts[i - 1], b = r.pts[i], dx = b.x - a.x, dy = b.y - a.y, l = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((c.x - a.x) * dx + (c.y - a.y) * dy) / l));
const q = { x: a.x + dx * t, y: a.y + dy * t }, v = dist(c, q);
if (!best || v < best.v) best = { v, q, a, b, r };
}
});
return best;
}
function incroci(lista) {
const o = [], st = lista || strade();
for (let i = 0; i < st.length; i++) for (let j = i + 1; j < st.length; j++) {
const A = st[i].pts, B = st[j].pts;
incontri(A, B).forEach(c => {
const capo = [A[0], A[A.length - 1], B[0], B[B.length - 1]].some(e => dist(e, c) < 8);
if (!o.some(v => dist(v, c) < 12)) o.push({ x: c.x, y: c.y, tipo: capo ? 'T' : 'X' });
});
}
return o;
}
function aggancia(r, st) {
if (r.length !== 2) return r;
const a = r[0], b = r[1], len = dist(a, b), sp = spuntone(); let best = null;
st.forEach(q => {
for (let i = 1; i < q.pts.length; i++) {
const X = interseca(a, b, q.pts[i - 1], q.pts[i]);
if (!X || X.u < -.02 || X.u > 1.02) continue;
const mar = sp / len; if (X.t < -mar || X.t > 1 + mar) continue;
const cen = Math.abs(X.t - .5);
if (!best || cen < best.cen) best = { cen, X, p: q.pts[i - 1], q: q.pts[i] };
}
});
if (!best) return r;
const X = best.X, ga = Math.atan2(best.q.y - best.p.y, best.q.x - best.p.x), gr = Math.atan2(b.y - a.y, b.x - a.x);
const dif = Math.abs(((gr - ga) * 180 / Math.PI % 180 + 180) % 180);
let dir = { x: Math.cos(gr), y: Math.sin(gr) };
if (Math.abs(dif - 90) <= 14) { const s = Math.cos(gr - (ga + Math.PI / 2)) >= 0 ? 1 : -1, gn = ga + s * Math.PI / 2; dir = { x: Math.cos(gn), y: Math.sin(gn) }; }
const da = X.t * len, db = (1 - X.t) * len;
return [{ x: X.x - dir.x * da, y: X.y - dir.y * da }, { x: X.x + dir.x * db, y: X.y + dir.y * db }];
}
function allunga(r, st) {
const v0 = vicinanza();
const raggio = (p, ini) => {
const e = ini ? p[0] : p[p.length - 1]; let v = ini ? versoInizio(p) : versoFine(p); if (ini) v = { x: -v.x, y: -v.y };
const far = { x: e.x + v.x * v0, y: e.y + v.y * v0 }; let best = null;
st.forEach(q => { for (let i = 1; i < q.pts.length; i++) { const X = interseca(e, far, q.pts[i - 1], q.pts[i]); if (X && X.t > 0 && X.t <= 1 && X.t * v0 > 2 && X.u >= -.01 && X.u <= 1.01 && (!best || X.t < best.t)) best = X; } });
return best;
};
const a = raggio(r, true), b = raggio(r, false), o = r.slice();
if (a) o.unshift({ x: a.x, y: a.y });
if (b) o.push({ x: b.x, y: b.y });
return o;
}
function spunta(p, altre) {
const L = lung(p), sp = spuntone(); let s0 = 0, s1 = L;
altre.forEach(q => incontri(p, q).forEach(c => { if (c.s <= L - c.s) { if (c.s <= sp && c.s > s0) s0 = c.s; } else if (L - c.s <= sp && c.s < s1) s1 = c.s; }));
if (s1 - s0 < 40) return p;
if (s0 <= .01 && s1 >= L - .01) return p;
return taglia(p, s0, s1);
}
function sfoltisci(r, st) {
const L = lung(r), passo = 6, tocca = (s, s2) => {
const q = taglia(r, Math.min(s, s2), Math.max(s, s2)), a = q[0], b = q[q.length - 1], c = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, o = suStrada(c, st);
if (!o || o.v >= o.r.mezza) return false;
const lu = dist(a, b) || 1, lo = dist(o.a, o.b) || 1, co = Math.abs((b.x - a.x) * (o.b.x - o.a.x) + (b.y - a.y) * (o.b.y - o.a.y)) / (lu * lo);
return co > Math.cos(15 * Math.PI / 180);
};
let s0 = 0, s1 = L;
while (s0 + passo < L && tocca(s0, s0 + passo)) s0 += passo;
while (s1 - passo > s0 && tocca(s1 - passo, s1)) s1 -= passo;
if (s0 === 0 && s1 === L) return r;
if ((s1 - s0) * K < 8 || s1 - s0 < 50) return null;
return taglia(r, s0, s1);
}
function assegna(item, pts) {
const e = item.el;
if (e.type === 'road') {
const a = aMondo(pts[0]), b = aMondo(pts[pts.length - 1]);
e.x = +((a.x + b.x) / 2).toFixed(2); e.y = +((a.y + b.y) / 2).toFixed(2); e.len = +Math.hypot(b.x - a.x, b.y - a.y).toFixed(2);
} else e.pts = pts.map(aMondo);
item.pts = pts;
}
const zSotto = () => RS.scene.elements.reduce((z, e) => Math.min(z, e.z || 0), 0) - 1;
function nuovaStrada(pts, nomeVia) {
let e;
if (pts.length === 2) {
const a = aMondo(pts[0]), b = aMondo(pts[1]);
e = { type: 'road', x: +((a.x + b.x) / 2).toFixed(2), y: +((a.y + b.y) / 2).toFixed(2), rot: +(Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI).toFixed(2),
len: +Math.hypot(b.x - a.x, b.y - a.y).toFixed(2), wid: LARG_STRADA, lanes: 2, line: 'disc', edge: 'cont', color: GRIGIO };
} else e = { type: 'roadway', pts: pts.map(aMondo), width: LARG_STRADA, color: GRIGIO, line: 'disc', edge: 'cont' };
if (nomeVia) e.nomeVia = nomeVia;
e.z = zSotto();
return RS.scene.add(e, false);
}
function togli(id) {
const S = RS.scene; S.elements = S.elements.filter(e => e.id !== id); S.selection = S.selection.filter(x => x !== id);
}
function unisci(r, st) {
const LR = lung(r), vic = vicinanza(), fin = finestra();
for (const item of st) {
if (!item.libera) continue;
for (let fa = 0; fa < 2; fa++) for (let fb = 0; fb < 2; fb++) {
const A = fa ? item.pts.slice().reverse() : item.pts, B = fb ? r.slice().reverse() : r, LA = lung(A);
if (LA < 30 || LR < 30) continue;
const e = A[A.length - 1], b = B[0];
const coda = taglia(A, Math.max(0, LA - fin), LA), testa = taglia(B, 0, Math.min(LR, fin)), cc = incontri(coda, testa)[0];
const va = versoFine(A), vb = versoInizio(B), co = va.x * vb.x + va.y * vb.y;
const ib = suStrada(b, [{ pts: A }]);
let sb = 0; if (ib) { for (let i = 1; i < A.length; i++) { if (A[i - 1] === ib.a) { sb += dist(ib.a, ib.q); break; } sb += dist(A[i - 1], A[i]); } }
const sopra = ib && ib.v < item.mezza * 1.1 && LA - sb > 2 && (LA - sb) * K < 30 && co > Math.cos(40 * Math.PI / 180) && !(suStrada(B[B.length - 1], [{ pts: A }]).v < item.mezza);
const capi = dist(e, b) < vic || cc;
if (!(capi || sopra)) continue;
if (co < (sopra && !capi ? Math.cos(40 * Math.PI / 180) : Math.cos(135 * Math.PI / 180))) continue;
const fineA = sopra && !capi ? sb : LA;
const tr = Math.min(Math.max(6 / K, 50), fineA / 3, LR / 3), A2 = taglia(A, 0, fineA - tr), B2 = taglia(B, tr, LR), u = A2[A2.length - 1], w = B2[0];
const ct = sopra && !capi ? ib.q : cc ? { x: cc.x, y: cc.y } : { x: (e.x + b.x) / 2, y: (e.y + b.y) / 2 }, mid = [];
for (let k = 1; k < 8; k++) { const t = k / 8; mid.push({ x: (1 - t) * (1 - t) * u.x + 2 * t * (1 - t) * ct.x + t * t * w.x, y: (1 - t) * (1 - t) * u.y + 2 * t * (1 - t) * ct.y + t * t * w.y }); }
const nomeVia = item.el.nomeVia; togli(item.el.id); nuovaStrada(A2.concat(mid, B2), nomeVia);
return true;
}
}
return false;
}
function prolunga(r, st) {
const q = ricampiona(r, 4); if (q.length < 4) return null;
const LR = lung(q), parallelo = Math.cos(20 * Math.PI / 180);
let best = null;
st.forEach(item => {
if (!item.libera || lung(item.pts) < 20) return;
let sopra = 0;
for (let i = 1; i < q.length; i++) {
const m = { x: (q[i - 1].x + q[i].x) / 2, y: (q[i - 1].y + q[i].y) / 2 }, o = suStrada(m, [item]);
if (!o || o.v > item.mezza * 1.1) continue;
const lu = dist(q[i - 1], q[i]) || 1, lo = dist(o.a, o.b) || 1;
if (Math.abs((q[i].x - q[i - 1].x) * (o.b.x - o.a.x) + (q[i].y - q[i - 1].y) * (o.b.y - o.a.y)) / (lu * lo) > parallelo) sopra += lu;
}
if (!best || sopra > best.sopra) best = { item, sopra };
});
if (!best || best.sopra < Math.max(30, LR * 0.2)) return null;
const it = best.item, A = it.pts, LA = lung(A), P0 = A[0], P1 = A[A.length - 1], v0 = versoInizio(A), v1 = versoFine(A), tol = it.mezza * 1.25;
const dove = p => {
const a0 = (p.x - P0.x) * v0.x + (p.y - P0.y) * v0.y;
if (a0 < 0) return { k: Math.abs((p.x - P0.x) * v0.y - (p.y - P0.y) * v0.x) < tol ? 'prima' : 'fuori', s: a0 };
const a1 = (p.x - P1.x) * v1.x + (p.y - P1.y) * v1.y;
if (a1 > 0) return { k: Math.abs((p.x - P1.x) * v1.y - (p.y - P1.y) * v1.x) < tol ? 'dopo' : 'fuori', s: a1 };
const o = suStrada(p, [it]); return { k: o && o.v < tol ? 'su' : 'fuori', s: 0 };
};
const pos = q.map(dove);
let prima = 0, dopo = 0;
pos.forEach(x => { if (x.k === 'prima') prima = Math.min(prima, x.s); if (x.k === 'dopo') dopo = Math.max(dopo, x.s); });
let fuori = 0; for (let i = 1; i < q.length; i++) if (pos[i].k === 'fuori') fuori += dist(q[i - 1], q[i]);
if (prima > -12 && dopo < 12) return fuori > 30 ? null : { gia: true };
let resto = null;
const ultimoIn = pos.map(x => x.k).lastIndexOf('dopo'), primoIn = pos.map(x => x.k).indexOf('prima');
const coda = ultimoIn >= 0 ? q.slice(ultimoIn + 1) : [], testa = primoIn >= 0 ? q.slice(0, primoIn) : [];
if (ultimoIn >= 0 && coda.length > 2 && coda.every((x, i) => pos[ultimoIn + 1 + i].k === 'fuori') && lung(coda) > 30) resto = { capo: 1, pts: coda };
else if (primoIn > 0 && testa.length > 2 && testa.every((x, i) => pos[i].k === 'fuori') && lung(testa) > 30) resto = { capo: 0, pts: testa.slice().reverse() };
const n0 = prima < -12 ? { x: P0.x + v0.x * prima, y: P0.y + v0.y * prima } : null;
const n1 = dopo > 12 ? { x: P1.x + v1.x * dopo, y: P1.y + v1.y * dopo } : null;
let nuovi;
if (it.el.type === 'road') nuovi = [n0 || P0, n1 || P1];
else nuovi = (n0 ? [n0] : []).concat(A, n1 ? [n1] : []);
assegna(it, nuovi);
if (resto) {
const capo = resto.capo ? nuovi[nuovi.length - 1] : nuovi[0];
return { fatto: true, resto: [capo].concat(resto.pts) };
}
return { fatto: true };
}
function freccia(p) {
const q = ricampiona(p, 4); if (q.length < 12) return null;
const L = lung(q), a = q[0], c = q[Math.floor(q.length * .5)], l0 = dist(a, c) || 1, ux = (c.x - a.x) / l0, uy = (c.y - a.y) / l0; let tip = -1, bestS = -1;
q.forEach((k, i) => { const s = (k.x - a.x) * ux + (k.y - a.y) * uy; if (s > bestS) { bestS = s; tip = i; } });
const T = q[tip], e = q[q.length - 1], coda = lung(q.slice(tip));
if (coda < 10 || coda > L * .42) return null;
const v1 = q[Math.max(0, tip - 6)], gi = Math.atan2(T.y - v1.y, T.x - v1.x), gt = Math.atan2(e.y - T.y, e.x - T.x);
let dg = Math.abs(gi - gt) * 180 / Math.PI; if (dg > 180) dg = 360 - dg;
if (dg < 110) return null;
return { a, b: T, g: Math.atan2(T.y - a.y, T.x - a.x) * 180 / Math.PI };
}
function giri(q, g) {
const r = g * Math.PI / 180, cc = Math.cos(r), ss = Math.sin(r); let ext = q[0].x * cc + q[0].y * ss, dir = 0, n = 0;
q.forEach(k => {
const u = k.x * cc + k.y * ss;
if (dir === 0) { if (Math.abs(u - ext) > 8) { dir = u > ext ? 1 : -1; ext = u; } }
else if (dir > 0) { if (u > ext) ext = u; else if (ext - u > 8) { dir = -1; n++; ext = u; } }
else { if (u < ext) ext = u; else if (u - ext > 8) { dir = 1; n++; ext = u; } }
});
return n;
}
function zigzag(p) { const f = forma(p), q = ricampiona(p, 4); return Math.max(giri(q, f.g), giri(q, f.g + 90)) >= 3 && lung(q) >= 2 * f.w; }
const veicoliS = () => RS.scene.elements.filter(e => e.type === 'vehicle').map(e => ({ el: e, x: e.x / K, y: e.y / K }));
function vicinoVeicolo(c, r) { let b = null, v = r; veicoliS().forEach(k => { const x = dist(k, c); if (x < v) { v = x; b = k; } }); return b; }
function capisci(p) {
const fr = info(p).chiuso ? null : freccia(p); if (fr) return { t: 'freccia', fr };
const st = strade();
if (zigzag(p)) {
const m0 = info(p), r0 = suStrada({ x: m0.cx, y: m0.cy }, st);
if (r0 && r0.v < r0.r.mezza + 10) return { t: 'strisce' };
return { t: 'libero', dubbio: ['libero', 'strada', 'tracce'] };
}
const m = info(p);
if (m.chiuso) {
const f = forma(p), c = { x: f.cx, y: f.cy }; let vic = null;
incroci(st).forEach(x => { const v = dist(x, c); if (!vic || v < vic.v) vic = { v, x }; });
if (f.asp < 1.45 && f.pieno < .87 && vic && vic.v < Math.max(44, f.w * .6)) return { t: 'rotatoria' };
const r = suStrada(c, st), su = r && r.v < r.r.mezza + 10, metri = f.w * K;
const mezzo = f.asp >= 3.2 && metri < 8 ? 'moto' : 'veicolo';
const largoVeicolo = f.h * K <= 4.5;
if (largoVeicolo && metri <= 20 && f.pieno >= .55 && altroVeicolo(f)) return { t: mezzo };
if (su && f.pieno < .6) return { t: 'tracce' };
if (su && metri <= 20) return largoVeicolo ? { t: mezzo } : { t: 'area' };
if (largoVeicolo && metri < 14 && f.asp >= 1.35 && f.pieno >= .62) return { t: mezzo };
if (f.pieno >= .75) return { t: 'edificio' };
return { t: 'area' };
}
const a = p[0], b = p[p.length - 1], rg = Math.max(3 / K, 36);
if (veicoliS().some(k => dist(k, a) < rg || dist(k, b) < rg)) return { t: 'frenata' };
const ch = dist(a, b);
if (ch < 48) return { t: 'libero', dubbio: ['frenata', 'strada', 'libero'] };
if (st.length) {
let tot = 0, n = 0; ricampiona(p, 12).forEach(q => { const r = suStrada(q, st); if (r) { tot += r.v; n++; } });
const r = suStrada({ x: m.cx, y: m.cy }, st);
if (n && r && tot / n < r.r.mezza * .45 && ch * K < 32) return { t: 'libero', dubbio: ['frenata', 'strada', 'libero'] };
}
return { t: 'strada' };
}
function sagoma(x, y, rot, l, w) {
const r = (rot || 0) * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
return [[1, 1], [-1, 1], [-1, -1], [1, -1]].map(k => ({ x: x + k[0] * l / 2 * c - k[1] * w / 2 * s, y: y + k[0] * l / 2 * s + k[1] * w / 2 * c }));
}
function sovrapposte(A, B, marg) {
return ![A, B].some(P => P.some((a, i) => {
const b = P[(i + 1) % P.length], nx = -(b.y - a.y), ny = b.x - a.x, l = Math.hypot(nx, ny) || 1;
const pro = Q => Q.map(q => (q.x * nx + q.y * ny) / l), pa = pro(A), pb = pro(B);
return Math.min(...pa) - Math.max(...pb) > marg || Math.min(...pb) - Math.max(...pa) > marg;
}));
}
function altroVeicolo(f) {
const R = sagoma(f.cx * K, f.cy * K, f.g, f.w * K, f.h * K), marg = Math.max(.5, 8 * K), c = { x: f.cx * K, y: f.cy * K }; let best = null, bd = 1e9;
RS.scene.elements.filter(e => e.type === 'vehicle').forEach(v => {
const D = v.disegno || {}, P = sagoma(v.x, v.y, v.rot, Math.max(v.len, D.l || 0), Math.max(v.wid, D.w || 0));
if (sovrapposte(R, P, marg) && dist(v, c) < bd) { bd = dist(v, c); best = v; }
});
return best;
}
function accosta(e, v) {
let dx = v.x - e.x, dy = v.y - e.y, d = Math.hypot(dx, dy);
if (d < .01) { const r = (e.rot || 0) * Math.PI / 180; dx = Math.cos(r); dy = Math.sin(r); d = 1; }
const ux = dx / d, uy = dy / d, A = sagoma(v.x, v.y, v.rot, v.len, v.wid), tocca = () => sovrapposte(sagoma(e.x, e.y, e.rot, e.len, e.wid), A, 0);
if (tocca()) { for (let i = 0; i < 600 && tocca(); i++) { e.x -= ux * .05; e.y -= uy * .05; } }
else { for (let i = 0; i < 800 && !tocca(); i++) { e.x += ux * .05; e.y += uy * .05; } e.x -= ux * .05; e.y -= uy * .05; }
e.x = +e.x.toFixed(2); e.y = +e.y.toFixed(2);
const r = -(v.rot || 0) * Math.PI / 180, c = Math.cos(r), s = Math.sin(r), dentro = (x, y) => { const a = x - v.x, b = y - v.y; return Math.abs(a * c - b * s) <= v.len / 2 && Math.abs(a * s + b * c) <= v.wid / 2; };
let t = 0; while (t < 30 && dentro(v.x - ux * t, v.y - uy * t)) t += .05;
return { x: v.x - ux * t, y: v.y - uy * t };
}
let contatto = null;
function creaVeicolo(p, tipo) {
const f = forma(p), c = { x: f.cx, y: f.cy }, rs = suStrada(c), def = RS.catalog.veicoloById(CAT[tipo]);
const nome = tipo === 'moto' ? 'Moto' : tipo === 'bici' ? 'Bici' : 'Veicolo', lt = RS.tools.nextVehicleLabel(), altro = altroVeicolo(f);
const e = { type: 'vehicle', kind: def.kind, catId: def.id, len: def.len, wid: def.wid, color: def.color, label: lt,
x: +(f.cx * K).toFixed(2), y: +(f.cy * K).toFixed(2), rot: dirSnap(f.g), disegno: { l: +(f.w * K).toFixed(2), w: +(f.h * K).toFixed(2) } };
let msg = nome + ' ' + lt;
if (altro) {
contatto = { p: accosta(e, altro), a: altro.label, b: lt };
msg += ' a contatto con ' + altro.label;
} else if (rs && rs.v < rs.r.mezza + 14) {
const dx = rs.b.x - rs.a.x, dy = rs.b.y - rs.a.y, gr = Math.atan2(dy, dx) * 180 / Math.PI, sc = ((e.rot - gr) % 180 + 180) % 180;
if (Math.min(sc, 180 - sc) <= 15) {
e.rot = +gr.toFixed(2);
if (rs.v <= rs.r.mezza) {
const l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l, sg = ((c.x - rs.q.x) * nx + (c.y - rs.q.y) * ny) >= 0 ? 1 : -1, corsia = rs.r.mezza / 2;
e.x = +((rs.q.x + nx * sg * corsia) * K).toFixed(2); e.y = +((rs.q.y + ny * sg * corsia) * K).toFixed(2);
}
msg += ', allineato alla corsia';
}
}
e.rilpts = RS.elements.makeRilpts(e, 1); e.spigoli = true; e.freccia = !(RS.scene.meta && RS.scene.meta.frecce === false);
RS.scene.add(e, false);
return msg;
}
function simbolo(q, o) { return RS.scene.add(Object.assign({ type: 'symbol', x: +(q.x * K).toFixed(2), y: +(q.y * K).toFixed(2), rot: 0 }, o), false); }
const URTO = { sym: 'impact', size: 1.6, color: '#d11', catId: 'urto', nome: "Punto d'urto" };
const PEDONE = { sym: 'pedone', size: 0.5, color: '#1b4f9c', catId: 'pedone', nome: 'Pedone' };
function applica(p, t, x) {
const S = RS.scene;
if (t === 'strada') {
let st = strade(); const n0 = incroci(st).length; let r = regolarizza(p, true);
const pr = prolunga(r, st);
if (pr && pr.gia) return 'Qui c\'è già una strada: tratto non aggiunto';
if (pr && pr.fatto && !pr.resto) return 'Strada allungata';
if (pr && pr.resto) { r = regolarizza(pr.resto, true); st = strade(); if (unisci(r, st)) return 'Strada allungata e proseguita con una curva'; }
if (unisci(r, st)) return 'Strada prolungata: pezzi uniti in uno solo';
r = sfoltisci(r, st);
if (!r) return 'Qui c\'è già una strada: tratto non aggiunto';
r = spunta(allunga(aggancia(r, st), st), st.map(q => q.pts));
st.forEach(q => { if (q.libera) { const n = spunta(q.pts, [r]); if (n !== q.pts) assegna(q, n); } });
nuovaStrada(r);
const ic = incroci();
if (ic.length > n0) return ic[ic.length - 1].tipo === 'T' ? 'Incrocio a T' : 'Incrocio a 4 bracci';
return 'Strada';
}
if (t === 'veicolo' || t === 'moto' || t === 'bici') return creaVeicolo(p, t);
if (t === 'freccia') {
const fa = x || freccia(p) || { a: p[0], b: p[p.length - 1], g: Math.atan2(p[p.length - 1].y - p[0].y, p[p.length - 1].x - p[0].x) * 180 / Math.PI };
const vv = vicinoVeicolo(fa.a, Math.max(4 / K, 40));
if (vv) {
const v = vv.el, rs = suStrada(vv); let g = fa.g;
if (rs && rs.v < rs.r.mezza + 14) { const gr = Math.atan2(rs.b.y - rs.a.y, rs.b.x - rs.a.x) * 180 / Math.PI, dd = Math.abs(((g - gr) % 360 + 540) % 360 - 180); g = dd <= 90 ? gr : gr + 180; }
else g = Math.round(g / 15) * 15;
v.rot = +(((g % 360) + 360) % 360).toFixed(2); v.direzione = true; v.freccia = true;
const vecchia = S.elements.find(e => e.type === 'arrow' && e.diVeicolo === v.id); if (vecchia) togli(vecchia.id);
return 'Veicolo ' + v.label + ': direzione di marcia';
}
S.add({ type: 'arrow', color: '#222', pts: [aMondo(fa.a), aMondo(fa.b)] }, false);
return 'Direzione di marcia';
}
if (t === 'strisce') {
const m = info(p), rz = suStrada({ x: m.cx, y: m.cy });
if (rz && rz.v < rz.r.mezza + 14) {
S.add({ type: 'crosswalk', sub: 'ped', x: +(rz.q.x * K).toFixed(2), y: +(rz.q.y * K).toFixed(2), rot: +(Math.atan2(rz.b.y - rz.a.y, rz.b.x - rz.a.x) * 180 / Math.PI + 90).toFixed(2), len: +(rz.r.mezza * 2 * K).toFixed(2), wid: 3, color: '#ffffff' }, false);
return 'Strisce pedonali';
}
S.add({ type: 'sketch', pts: semplifica(p, 2).map(aMondo), width: .12, color: '#3a3a3a' }, false);
return 'Le strisce vanno disegnate sopra una strada';
}
if (t === 'tracce') {
if (info(p).chiuso) { const f = forma(p); simbolo({ x: f.cx, y: f.cy }, { sym: 'debris', size: +Math.max(.8, (f.w + f.h) / 2 * K).toFixed(2), color: '#7a5a20', catId: 'frammenti', nome: 'Frammenti' }); }
else S.add({ type: 'skid', pts: regolarizza(p, false).map(aMondo), width: .14, color: '#5a3a10', dashed: true }, false);
return 'Tracce sull\'asfalto';
}
if (t === 'frenata') {
const fr = regolarizza(p, false), a = fr[0], b = fr[fr.length - 1]; let vf = null, bk = Math.max(5.5 / K, 44);
veicoliS().forEach(k => { if (dist(k, a) < bk) { bk = dist(k, a); vf = { k, fine: 0 }; } if (dist(k, b) < bk) { bk = dist(k, b); vf = { k, fine: 1 }; } });
if (vf) { const q = { x: vf.k.x, y: vf.k.y }; if (vf.fine) fr[fr.length - 1] = q; else fr[0] = q; }
S.add(Object.assign({ type: 'skid', pts: fr.map(aMondo), width: .18, color: '#202020' }, vf ? { diVeicolo: vf.k.el.id } : {}), false);
return 'Frenata' + (vf ? ' del veicolo ' + vf.k.el.label : '');
}
if (t === 'edificio') {
const f = forma(p), g9 = Math.round(f.g / 90) * 90, g = Math.abs(f.g - g9) <= 8 ? g9 : f.g;
S.add({ type: 'building', x: +(f.cx * K).toFixed(2), y: +(f.cy * K).toFixed(2), rot: g % 360, w: +Math.max(2, f.w * K).toFixed(2), h: +Math.max(2, f.h * K).toFixed(2), color: '#cfc3a8', z: zSotto() }, false);
return 'Edificio';
}
if (t === 'rotatoria') return creaRotatoria(p);
if (t === 'area') {
const f = forma(p);
S.add({ type: 'area', sub: 'piazzale', x: +(f.cx * K).toFixed(2), y: +(f.cy * K).toFixed(2), rot: f.g, w: +Math.max(1, f.w * K).toFixed(2), h: +Math.max(1, f.h * K).toFixed(2), color: GRIGIO, z: zSotto() }, false);
return 'Area';
}
S.add({ type: 'sketch', pts: semplifica(p, 2).map(aMondo), width: .12, color: '#3a3a3a' }, false);
return 'Tratto libero';
}
function creaRotatoria(p) {
const S = RS.scene, f = forma(p), c0 = { x: f.cx, y: f.cy }, st = strade(); let be = null, bv = 1e9;
incroci(st).forEach(x => { const v = dist(x, c0); if (v < bv) { bv = v; be = x; } });
if (!be) return 'Area';
const cx = be.x * K, cy = be.y * K, size = Math.min(60, Math.max(26, (f.w + f.h) / 2 * K)), angs = [], lens = [];
st.forEach(q => {
const r = suStrada(be, [q]); if (!q.libera || !r || r.v > 12) return;
[q.pts[0], q.pts[q.pts.length - 1]].forEach(e => {
const dx = e.x * K - cx, dy = e.y * K - cy, d = Math.hypot(dx, dy);
if (d > size / 2 + 2) { angs.push(+(((Math.atan2(dy, dx) * 180 / Math.PI) + 360) % 360).toFixed(1)); lens.push(+Math.max(6, d - size / 2).toFixed(1)); }
});
togli(q.el.id);
});
const rot = RS.incroci.rotatoriaNuova({ x: +cx.toFixed(2), y: +cy.toFixed(2) }, { size, bracciAng: angs.length ? angs : [0, 90, 180, 270] });
if (angs.length) rot.bracci.forEach((b, i) => { b.len = lens[i]; });
rot.z = zSotto();
S.add(rot, false);
return 'Rotatoria';
}
function angoloVicino(q) {
let sul = null, bd = Math.max(2 / K, 16);
RS.scene.elements.filter(e => e.type === 'building').forEach(e => {
const r = (e.rot || 0) * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
[[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(k => {
const u = k[0] * e.w / 2, v = k[1] * e.h / 2, a = { x: (e.x + u * c - v * s) / K, y: (e.y + u * s + v * c) / K };
if (dist(a, q) < bd) { bd = dist(a, q); sul = a; }
});
});
return sul;
}
const auto = {
penna: 'auto', altre: false, corto: null, ultimo: null,
el(id) { return document.getElementById(id); },
mostra(si) {
const b = this.el('skBar'), e = this.el('skEsito'); if (!b || !e) return;
b.hidden = !si; e.hidden = !si;
this.el('skX').onclick = () => { e.hidden = true; };
if (!si) this.togliProvv();
const st = this.el('stage'); if (st) st.classList.toggle('sk-on', si);
if (!si) this.modifica = false;
if (si && !this._aperta) { this.penna = 'auto'; this.altre = false; this.corto = null; this.ultimo = null; this.barra(); this.testo('Penna Auto: traccia, oppure tocca la tavola'); this.bottoni(); }
this._aperta = si;
},
barra() {
const box = this.el('skBar'); box.innerHTML = '';
const una = x => {
const b = document.createElement('button'); b.type = 'button'; b.textContent = x[1]; b.className = 'sk-p' + (this.penna === x[0] ? ' on' : '');
b.onclick = () => {
if (x[0] === 'modifica') return this.inModifica();
const daModifica = this.modifica;
this.penna = x[0]; this.corto = null; this.altre = false; this.modifica = false;
if (daModifica) RS.ui.startSchizzo();
this.barra(); this.testo(A_TOCCO[x[0]] ? 'Tocca il punto sulla tavola' : 'Penna ' + x[1]); this.bottoni();
};
box.appendChild(b);
};
PENNE.forEach(una);
const altra = ALTRE.find(x => x[0] === this.penna);
if (altra && !this.altre) una(altra);
const alt = document.createElement('button'); alt.type = 'button'; alt.className = 'sk-p sk-alt'; alt.textContent = this.altre ? 'Chiudi ▴' : 'Altro ▾';
alt.onclick = () => { this.altre = !this.altre; this.barra(); }; box.appendChild(alt);
if (this.altre) {
const riga = document.createElement('div'); riga.className = 'sk-altre'; box.appendChild(riga); ALTRE.forEach(x => { una(x); riga.appendChild(box.lastChild); });
const S = RS.scene, si = !(S.meta && S.meta.frecce === false), fb = document.createElement('button');
fb.type = 'button'; fb.className = 'sk-p sk-tgl' + (si ? ' on' : ''); fb.textContent = si ? '➜ Frecce: sì' : '➜ Frecce: no';
fb.onclick = () => {
const nuovo = !si;
this.azione(() => { S.meta = S.meta || {}; S.meta.frecce = nuovo; S.elements.forEach(v => { if (v.type === 'vehicle') v.freccia = nuovo; }); });
this.barra(); this.testo(nuovo ? 'Frecce di marcia mostrate su tutti i veicoli' : 'Frecce di marcia tolte da tutti i veicoli (ognuna si rimette dalle proprietà)');
};
riga.appendChild(fb);
}
if (RS.ui.spazioSopra) RS.ui.spazioSopra();
},
esci() {
this.modifica = false;
RS.tools.fine(true);
if (RS.ui.mostraStrumento) RS.ui.mostraStrumento(RS.tools.active);
},
inModifica() {
this.togliProvv(); this.modifica = true; this.penna = 'modifica'; this.altre = false;
RS.tools.toSelect();
this.barra();
this.testo('Modifica: tocca un oggetto per spostarlo, girarlo o cambiarlo. Scegli una penna per tornare a disegnare.'); this.bottoni();
},
testo(t) { this.el('skEsito').hidden = false; this.el('skT').textContent = t; this.el('skErr').textContent = ''; },
bottoni(lista) {
const box = this.el('skB'); box.innerHTML = '';
(lista || []).forEach(x => {
if (x.campo) { box.appendChild(x.campo); return; }
const b = document.createElement('button'); b.type = 'button'; b.textContent = x.t; b.className = 'sk-b' + (x.forte ? ' forte' : ''); b.onclick = x.f; box.appendChild(b);
});
},
azione(fn) {
const S = RS.scene, h = S._hpos, msg = fn();
S._hist = S._hist.slice(0, h + 1); S._hpos = h;
S.selection = []; S.render(); S.snapshot(); S.emit('change'); S.emit('select');
return msg;
},
esito(msg, soloAnnulla) {
this.testo(msg);
if (RS.ui && RS.ui.vibra) RS.ui.vibra('25');
const v = [{ t: 'Annulla', f: () => this.annulla() }], ct = contatto;
if (ct) v.unshift({ t: 'Metti il punto d\'urto', forte: true, f: () => {
contatto = null;
this.esito(this.azione(() => { RS.scene.add(Object.assign({ type: 'symbol', x: +ct.p.x.toFixed(2), y: +ct.p.y.toFixed(2), rot: 0 }, URTO), false); return 'Punto d\'urto fra ' + ct.a + ' e ' + ct.b; }), true);
} });
contatto = null;
if (!soloAnnulla) v.push({ t: 'È altro', f: () => { this.testo('Che cos\'è?'); this.scegli(['strada', 'veicolo', 'moto', 'bici', 'frenata', 'tracce', 'edificio', 'area', 'libero']); } });
this.bottoni(v);
},
annulla() {
const S = RS.scene; S.undo(); this.ultimo = null; this.corto = null;
const mb = S.meta && S.meta.base;
if (mb) ['aId', 'bId'].forEach(k => { if (mb[k] && !S.get(mb[k])) delete mb[k]; });
this.testo('Annullato'); this.bottoni();
},
scegli(lista) {
const v = lista.map((t, i) => ({ t: NOME_PENNA[t], forte: i === 0, f: () => {
if (!this.ultimo) return;
if (this.ultimo.provv) this.togliProvv(); else RS.scene.undo();
K = this.ultimo.K; const p = this.ultimo.p; this.ultimo.provv = false;
this.esito(this.azione(() => applica(p, t)));
} }));
if (this.ultimo && this.ultimo.provv) v.push({ t: 'Niente', f: () => { this.togliProvv(); this.ultimo = null; this.testo('Tratto tolto'); this.bottoni(); } });
this.bottoni(v);
},
provv(p) {
this.togliProvv();
const n = document.createElementNS('http://www.w3.org/2000/svg', 'path');
n.setAttribute('class', 'preview sk-provv'); n.setAttribute('fill', 'none'); n.setAttribute('stroke', '#d0342c'); n.setAttribute('stroke-width', .14);
n.setAttribute('stroke-dasharray', '.5 .35'); n.setAttribute('stroke-linecap', 'round');
n.setAttribute('d', p.map((q, i) => (i ? 'L' : 'M') + (q.x * K) + ' ' + (q.y * K)).join(' '));
RS.scene.gOverlay.appendChild(n); this._provv = n;
},
togliProvv() { if (this._provv) { this._provv.remove(); this._provv = null; } },
tratto(ptsMondo) {
const S = RS.scene, w = S.svg.getBoundingClientRect().width || 800;
K = S.view.w / w;
this.togliProvv();
const p = ptsMondo.map(aSchermo), tc = p.length < 4 || info(p).L < 24;
if (tc || A_TOCCO[this.penna]) { this.tocco(p[p.length - 1]); return null; }
if (this.penna === 'auto' && this.corto && Date.now() - this.corto.t < 4000) {
const ix = incontri(this.corto.p, p)[0];
const Lp = info(p).L, ix2 = ix && incontri(p, this.corto.p)[0];
if (ix && Lp < 140 && Lp * K < 25 && ix.s > this.corto.L * .12 && ix.s < this.corto.L * .88 && ix2.s > Lp * .12 && ix2.s < Lp * .88) {
if (this.corto.fatto) S.undo();
this.corto = null; this.ultimo = null;
this.esito(this.azione(() => {
simbolo(ix, URTO);
const vic = S.elements.filter(e => e.type === 'vehicle' && e.label && dist(e, { x: ix.x * K, y: ix.y * K }) < 8).map(e => e.label);
return 'Punto d\'urto' + (vic.length > 1 ? ' fra ' + vic.slice(0, -1).join(', ') + ' e ' + vic[vic.length - 1] : vic.length ? ' del veicolo ' + vic[0] : '');
}), true);
return { t: 'urto' };
}
}
this.ultimo = { p, K };
const Lc = info(p).L;
this.corto = Lc < 140 && Lc * K < 25 && !info(p).chiuso ? { p, t: Date.now(), L: Lc } : null;
const u = this.penna === 'auto' ? capisci(p) : { t: this.penna };
if (this.corto) this.corto.fatto = !u.dubbio;
if (u.dubbio) {
this.ultimo.provv = true; this.provv(p);
this.testo('Non sono sicuro: che cos\'è?'); this.scegli(u.dubbio);
return u;
}
this.esito(this.azione(() => applica(p, u.t, u.fr)));
return u;
},
tocco(q) {
const urtoQui = () => this.esito(this.azione(() => { simbolo(q, URTO); return 'Punto d\'urto'; }), true);
const pedoneQui = () => this.esito(this.azione(() => {
const p = simbolo(q, PEDONE), S = RS.scene;
let n = 0; S.elements.forEach(e => { if (e.type === 'surveypt' && e.n > n) n = e.n; });
S.add({ type: 'surveypt', x: p.x, y: p.y, n: n + 1, descr: 'pedone', size: 0.7, diSimbolo: p.id }, false);
return 'Pedone, punto P' + (n + 1) + ' per le misure';
}), true);
if (this.penna === 'punto') return this.chiediLettera(q);
if (this.penna === 'urto') return urtoQui();
if (this.penna === 'pedone') return pedoneQui();
if (this.penna === 'testo') return this.chiediNota(q);
if (this.penna !== 'auto') return;
const niente = { t: 'Niente', f: () => { this.testo('Penna Auto'); this.bottoni(); } };
const punto = { t: 'Punto fisso', f: () => this.chiediLettera(q) };
const nota = { t: 'Testo', f: () => this.chiediNota(q) };
const v = vicinoVeicolo(q, Math.max(18, 2.4 / K));
if (v) return this.chiediVeicolo(v.el);
const qui = e => { const b = RS.elements.bounds(e); return b && q.x * K >= b.x - .5 && q.x * K <= b.x + b.w + .5 && q.y * K >= b.y - .5 && q.y * K <= b.y + b.h + .5; };
const linea = e => { const P = e.pts.map(aSchermo); return P.some((a, i) => { if (!i) return false; const b = P[i - 1], dx = a.x - b.x, dy = a.y - b.y, t = Math.max(0, Math.min(1, ((q.x - b.x) * dx + (q.y - b.y) * dy) / (dx * dx + dy * dy || 1))); return dist(q, { x: b.x + dx * t, y: b.y + dy * t }) < 14; }); };
const fisso = RS.scene.elements.slice().reverse().find(e => !e.inc && (['sketch', 'skid', 'arrow'].indexOf(e.type) >= 0 ? linea(e) : ['symbol', 'building', 'text', 'crosswalk', 'area'].indexOf(e.type) >= 0 && qui(e)));
if (fisso) {
RS.scene.select([fisso.id]);
const nome = fisso.nome || NOMI[fisso.type] || ({ text: 'Testo', crosswalk: 'Strisce pedonali', arrow: 'Freccia', sketch: 'Tratto', symbol: 'Simbolo' })[fisso.type] || 'Oggetto';
this.testo(nome + ' · per spostarlo tienilo premuto e trascina');
const rf = suStrada(q), via = rf && rf.v < rf.r.mezza && rf.r.libera ? [{ t: 'Nome della via', f: () => this.chiediVia(rf.r.el.id) }] : [];
return this.bottoni([{ t: 'Elimina', forte: true, f: () => this.esito(this.azione(() => { RS.scene.elements.filter(e => e.diSimbolo === fisso.id).forEach(e => togli(e.id)); togli(fisso.id); return 'Eliminato'; }), true) }].concat(via, [punto, nota, niente]));
}
const r = suStrada(q);
this.testo('Che cosa metti qui?');
if (r && r.v < r.r.mezza) {
const l = [punto, { t: 'Urto', f: urtoQui }, { t: 'Pedone', f: pedoneQui }, nota, niente];
if (r.r.libera) { l.unshift({ t: 'Nome della via', forte: true, f: () => this.chiediVia(r.r.el.id) }); l.splice(l.length - 1, 0, { t: 'Elimina strada', f: () => this.esito(this.azione(() => { togli(r.r.el.id); return 'Strada eliminata'; }), true) }); }
else if (r.r.el.inc) l.splice(l.length - 1, 0, { t: 'Elimina incrocio', f: () => this.esito(this.azione(() => { togli(r.r.el.inc); return 'Eliminato'; }), true) });
return this.bottoni(l);
}
this.bottoni([Object.assign({ forte: true }, punto), { t: 'Pedone', f: pedoneQui }, nota, niente]);
},
campo(ph, lung, val) {
const c = document.createElement('input'); c.placeholder = ph; c.className = 'sk-in'; c.setAttribute('aria-label', ph); if (lung) c.maxLength = lung; if (val) c.value = val;
c.oninput = () => { this.el('skErr').textContent = ''; };
return c;
},
chiediLettera(q) {
const S = RS.scene, sul = angoloVicino(q), pos = sul || q, usate = S.elements.filter(e => e.letter).map(e => String(e.letter).toUpperCase());
const metti = l => this.esito(this.azione(() => {
const e = simbolo(pos, { sym: 'caposaldo', size: 0.6, color: '#b00', catId: 'caposaldo', nome: 'Caposaldo', letter: l });
S.meta = S.meta || {};
const mb = S.meta.base = S.meta.base || {};
if (!mb.aId || !S.get(mb.aId)) mb.aId = e.id; else if (!mb.bId || !S.get(mb.bId)) mb.bId = e.id;
const a = S.get(mb.aId), b = mb.bId && S.get(mb.bId);
return 'Punto fisso ' + l + (sul ? ', sull\'angolo dell\'edificio' : '') + (b && b.id === e.id ? ': base ' + a.letter + '–' + b.letter : '');
}), true);
this.testo('Punto fisso' + (sul ? ' sull\'angolo dell\'edificio' : '') + ': scegli la lettera');
const c = this.campo('altra', 2);
c.classList.add('corto'); c.style.textTransform = 'uppercase';
const v = 'ABCDEFGH'.split('').filter(l => usate.indexOf(l) < 0).map((l, i) => ({ t: l, forte: i === 0, f: () => metti(l) }));
v.push({ campo: c }, { t: 'OK', f: () => {
const l = (c.value || '').trim().toUpperCase();
if (!/^[A-Z]{1,2}$/.test(l)) { this.el('skErr').textContent = 'Scrivi una lettera, per esempio K'; return; }
if (usate.indexOf(l) >= 0) { this.el('skErr').textContent = 'La lettera ' + l + ' è già usata da un altro punto fisso'; return; }
metti(l);
} }, { t: 'Lascia stare', f: () => { this.testo('Nessun punto aggiunto'); this.bottoni(); } });
this.bottoni(v);
},
chiediVia(id) {
const e0 = RS.scene.get(id); this.testo('Nome della via');
const c = this.campo('Via Roma', 60, e0 && e0.nomeVia || '');
this.bottoni([{ campo: c }, { t: 'OK', forte: true, f: () => {
const v = (c.value || '').trim();
if (!v) { this.el('skErr').textContent = 'Scrivi il nome della via'; return; }
this.azione(() => { const e = RS.scene.get(id); if (e) e.nomeVia = v; });
RS.ui.localitaDalleVie();
this.esito('Nell\'intestazione: ' + ((RS.scene.meta && RS.scene.meta.localita) || v), true);
} }, { t: 'Lascia stare', f: () => { this.testo('Penna Auto'); this.bottoni(); } }]);
c.focus();
},
chiediNota(q) {
this.testo('Testo sulla tavola');
const c = this.campo('Scrivi qui', 80);
this.bottoni([{ campo: c }, { t: 'OK', forte: true, f: () => {
const v = (c.value || '').trim();
if (!v) { this.el('skErr').textContent = 'Scrivi il testo'; return; }
this.esito(this.azione(() => { RS.scene.add({ type: 'text', x: +(q.x * K).toFixed(2), y: +(q.y * K).toFixed(2), rot: 0, text: v, size: 1.2, color: '#111111' }, false); return 'Testo'; }), true);
} }, { t: 'Lascia stare', f: () => { this.testo('Penna Auto'); this.bottoni(); } }]);
c.focus();
},
chiediVeicolo(v0) {
const id = v0.id, S = RS.scene;
S.select([id]);
this.testo('Veicolo ' + v0.label + ' · per spostarlo tienilo premuto e trascina');
const cambia = (tipo, nome) => ({ t: nome, f: () => this.esito(this.azione(() => {
const v = S.get(id), def = RS.catalog.veicoloById(CAT[tipo]);
v.kind = def.kind; v.catId = def.id; v.len = def.len; v.wid = def.wid; v.color = def.color;
v.rilpts = RS.elements.makeRilpts(v, 1); v.spigoli = true;
return 'Veicolo ' + v.label + ': ' + def.nome.toLowerCase();
}), true) });
this.bottoni([{ t: 'Gira', forte: true, f: () => this.esito(this.azione(() => {
const v = S.get(id); v.rot = ((v.rot || 0) + 180) % 360; v.direzione = true; v.freccia = true;
const fr = S.elements.find(e => e.type === 'arrow' && e.diVeicolo === id); if (fr) togli(fr.id);
return 'Veicolo ' + v.label + ' girato';
}), true) }, cambia('veicolo', 'Auto'), cambia('moto', 'Moto'), cambia('bici', 'Bici'), cambia('autocarro', 'Autocarro'),
{ t: '👤 Dati', f: () => { if (RS.coinvolti && RS.coinvolti.apriVeicolo) RS.coinvolti.apriVeicolo(S.get(id) && S.get(id).label); } },
{ t: 'Elimina', f: () => this.esito(this.azione(() => {
const v = S.get(id), fr = S.elements.find(e => e.type === 'arrow' && e.diVeicolo === id), lt = v.label;
if (fr) togli(fr.id);
togli(id); return 'Veicolo ' + lt + ' eliminato';
}), true) }]);
},
fine() {
const S = RS.scene, E = S.elements, caps = E.filter(e => e.letter), veic = E.filter(e => e.type === 'vehicle');
const man = [];
if (caps.length < 2) man.push('Mancano punti fissi: ne servono almeno 2, ce ne sono ' + caps.length);
if (!veic.length) man.push('Nessun veicolo sulla tavola');
veic.forEach(v => { if (!v.direzione) man.push('Veicolo ' + v.label + ': controlla il verso della freccia (Gira se è al contrario)'); });
if (!String((S.meta && S.meta.localita) || '').trim()) man.push('Nessuna via ha un nome');
const righe = veic.filter(v => v.rilpts && v.rilpts.length).map(v => {
const ns = v.rilpts.map(p => p.n).sort((a, b) => a - b);
return 'Veicolo ' + v.label + ': punti ' + v.label + ns[0] + (ns.length > 1 ? '–' + v.label + ns[ns.length - 1] : '');
});
const pp = E.filter(e => e.type === 'surveypt').sort((a, b) => a.n - b.n);
if (pp.length) righe.push('Punti ' + pp.map(p => 'P' + p.n + (p.descr ? ' (' + p.descr + ')' : '')).join(', '));
const extra = [], nf = E.filter(e => e.type === 'skid').length, nu = E.filter(e => e.type === 'symbol' && e.sym === 'impact').length;
if (nf) extra.push(nf === 1 ? 'la frenata (inizio e fine)' : nf + ' frenate (inizio e fine)');
if (nu) extra.push(nu === 1 ? 'il punto d\'urto' : nu + ' punti d\'urto');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let h = man.length ? '<div class="sk-man"><b>Da completare</b><ul>' + man.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul></div>' : '<div class="sk-ok">Tutto a posto per iniziare a misurare</div>';
h += '<div class="sk-lista"><b>Misure da prendere, un punto fisso alla volta</b>' + (caps.length ? '<div>Punti fissi: ' + esc(caps.map(c => c.letter).join(', ')) + '</div>' : '') +
(righe.length ? '<ul>' + righe.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>' : '<div>Ancora nessun punto da misurare</div>') +
(extra.length ? '<div>Da misurare con Triangola: ' + esc(extra.join(' e ')) + '</div>' : '') + '</div>';
const cond = RS.ui.puoCondividere();
RS.ui.scelta({ titolo: 'Schizzo finito: e ora?', html: h, opzioni: [
{ k: 'guidate', t: '▶ Passa alle misure', d: 'Misure guidate, una alla volta a caratteri grandi', primario: true },
{ k: 'foto', t: '📷 Foto guidate', d: 'Una foto alla volta, dal generale al particolare' },
{ k: 'modifica', t: '✋ Modifica il disegno', d: 'Sposta, gira e sistema gli oggetti, poi torna qui' },
{ k: 'pc', t: cond ? '📤 Porta sul PC' : '💾 Salva per il PC', d: cond ? 'Condividi la tavola e completala in ufficio' : 'Salva la tavola e completala in ufficio' },
{ k: 'esci', t: '✓ Chiudi lo schizzo', d: 'Torna a Seleziona' }
] }).then(k => {
if (k === 'modifica') return this.inModifica();
if (!k) return;
this.esci();
if (k === 'guidate') RS.ui.misureGuidate();
else if (k === 'foto') RS.fotoGuidate.apri();
else if (k === 'pc') { if (cond) RS.ui.condividiTavola(); else RS.ui.action('salva'); }
});
}
};
RS.sketch = { semplifica, riconosci, converti, metriche, NOMI, auto, aiuti: { capisci, regolarizza, incroci, strade, applica, veicolo: creaVeicolo } };
})(window.RS = window.RS || {});

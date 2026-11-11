(function (RS) {
'use strict';
const rad = d => d * Math.PI / 180;
const r3 = v => Math.round(v * 1000) / 1000;
const r2 = v => Math.round(v * 100) / 100;
const dir = a => ({ x: Math.cos(rad(a)), y: Math.sin(rad(a)) });
const norm = a => ((a % 360) + 360) % 360;
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const SEZ_P = { cA: 1, cB: 1, corsia: 3.5, spart: 0, banch: 0.25, marc: 0 };
const SEZ_S = { cA: 1, cB: 1, corsia: 3.0, spart: 0, banch: 0.25, marc: 0 };
const largh = s => r2((s.cA + s.cB) * s.corsia + (s.cA && s.cB ? (+s.spart || 0) : 0) + 2 * (+s.banch || 0));
const ARMS = { x: [0, 90, 180, 270], t: [0, 180, 90], y: [90, 305, 235], x45: [0, 180, 55, 235], l: [0, 90],
penta: [270, 342, 54, 126, 198], esa: [0, 60, 120, 180, 240, 300], tob: [0, 180, 60], imm: [0, 180, 150],
pc: [0, 180, 90], pl: [0, 180] };
const BARRIERE = [['abbassate', 'con barriere abbassate'], ['alzate', 'con barriere alzate'], ['', 'senza barriere']];
const REGOLE = { nessuna: 'Nessuna segnaletica', destra: 'Precedenza a destra', stop: 'STOP', precedenza: 'Dare precedenza', semaforo: 'Semaforo' };
const STATI = [['', 'non indicato'], ['rosso', 'rosso'], ['giallo', 'giallo'], ['verde', 'verde'], ['lampeggiante', 'giallo lampeggiante'], ['spento', 'spento']];
const registro = e => e && ((e.type === 'incrocio' && Array.isArray(e.bracci)) || (e.type === 'roundabout' && Array.isArray(e.bracci) && e.bracci.length));
function daModello(p, def) {
const s = def.sez && def.cA == null ? Object.assign({}, def.sez)
: def.cA != null ? { cA: def.cA, cB: def.cB, corsia: def.corsia, spart: def.spart || 0, banch: def.banch || 0.25, marc: def.marc || 0 }
: { cA: 1, cB: 1, corsia: r2(((def.wid || 7) - 0.5) / 2), spart: 0, banch: 0.25, marc: 0 };
delete s.frecce;
const bracci = def.kind === 'sf'
? [{ ang: 0, len: 16 }, { ang: 180, len: 16 }, { ang: 90, len: 16, off: -5 }, { ang: 270, len: 16, off: -5 }]
: (ARMS[def.kind] || [0]).map(a => ({ ang: norm(a), len: 16 }));
let pr = [0];
for (let i = 0; i < bracci.length && pr.length < 2; i++)
for (let j = i + 1; j < bracci.length; j++)
if (Math.abs(Math.abs(bracci[i].ang - bracci[j].ang) - 180) < 2) { pr = [i, j]; break; }
bracci.forEach((b, i) => { b.ruolo = pr.indexOf(i) >= 0 ? 'principale' : 'secondaria'; });
if (def.lenS) bracci.forEach(b => { if (b.ruolo === 'secondaria') b.len = def.lenS; });
(def.canal || []).forEach(i => { if (bracci[i]) bracci[i].canal = 20; });
const sS = def.sezS ? Object.assign({}, def.sezS) : Object.assign({}, s); delete sS.frecce;
const c = { type: 'incrocio', x: p.x, y: p.y, rot: 0, raggio: def.raggio || 5, color: '#9aa0a6',
sezP: Object.assign({}, s), sezS: sS, bracci,
regola: Object.assign({ tipo: 'nessuna', su: 'secondaria', linee: true, cartelli: true, strisce: false }, def.regola || {}) };
if (def.kind === 'pc') { c.accesso = true; c.cancello = true; }
if (def.kind === 'pl') c.pl = { binari: def.binari || 1, barriere: def.barriere != null ? def.barriere : 'abbassate' };
return c;
}
function rotatoriaNuova(p, def) {
const angs = def.bracciAng || [0, 90, 180, 270];
const r = { type: 'roundabout', x: p.x, y: p.y, rot: 0, size: def.mini ? (def.size || 18) : Math.max(def.size || 20, 26), ring: def.ring || 7, fascia: 1.5,
color: def.color || '#9aa0a6', bracci: angs.map(a => ({ ang: a, len: def.lenB || 18 })), brWid: def.brWid || 7,
gocce: true, precedenza: true, frecce: true, corsie: def.corsie || 1 };
if (def.mini) r.mini = true;
return r;
}
function bracciGeo(c) {
const rot = c.type === 'roundabout' ? 0 : (c.rot || 0);
const sezR = { cA: 1, cB: 1, corsia: r2(((+c.brWid || 7) - 0.5) / 2), spart: 0, banch: 0.25, marc: +c.brMarc || 0 };
return (c.bracci || []).map((b, i) => {
const s = c.type === 'roundabout' ? sezR : Object.assign({}, b.ruolo === 'principale' ? SEZ_P : SEZ_S, b.ruolo === 'principale' ? c.sezP : c.sezS);
const A = rot + (+b.ang || 0), u = dir(A), n = { x: -u.y, y: u.x }, p = dir(A - 90), off = +b.off || 0;
return { b, i, s, A, u, n, o: { x: c.x + p.x * off, y: c.y + p.y * off }, wid: largh(s), len: Math.max(4, +b.len || 16) };
});
}
function bocca(G, i, R) { return boccaBase(G, i) + R * 0.9 + 0.5; }
function boccaBase(G, i) {
const a = G[i], hw = a.wid / 2;
let m = hw;
[-1, 1].forEach(s => {
const P0 = { x: a.o.x + a.n.x * s * hw, y: a.o.y + a.n.y * s * hw }, iv = [];
G.forEach((g, j) => {
if (j === i) return;
const W = g.wid / 2 + (+g.s.marc || 0), dx = P0.x - g.o.x, dy = P0.y - g.o.y;
const L0 = dx * g.n.x + dy * g.n.y, Lu = a.u.x * g.n.x + a.u.y * g.n.y;
const A0 = dx * g.u.x + dy * g.u.y, Au = a.u.x * g.u.x + a.u.y * g.u.y;
let lo = -1e9, hi = 1e9;
if (Math.abs(Lu) < 1e-9) { if (Math.abs(L0) > W) return; }
else { const t1 = (-W - L0) / Lu, t2 = (W - L0) / Lu; lo = Math.min(t1, t2); hi = Math.max(t1, t2); }
if (Math.abs(Au) < 1e-9) { if (A0 < 0) return; }
else if (Au > 0) lo = Math.max(lo, -A0 / Au); else hi = Math.min(hi, -A0 / Au);
if (hi > lo) iv.push([lo, hi]);
});
let r = 0, ancora = true;
while (ancora) { ancora = false; iv.forEach(([lo, hi]) => { if (lo <= r + 1e-6 && hi > r + 1e-6) { r = hi; ancora = true; } }); }
m = Math.max(m, Math.min(r, 200));
});
return m;
}
function allunga(c, G) {
const R = Math.max(0, +c.raggio || 0), rg = c.regola || {};
const S0 = G.map((g, i) => bocca(G, i, R));
G.forEach((g, i) => {
const serve = S0[i] + (rg.strisce ? 4.5 : 0.6) + (rg.tipo === 'stop' ? 6 : rg.tipo && rg.tipo !== 'nessuna' && rg.tipo !== 'destra' ? 3 : 1.5);
g.len = Math.max(g.len, Math.ceil(serve));
if (c.pl) g.len = Math.max(g.len, Math.ceil(fasciaBinari(c) + 9));
});
G.forEach((g, i) => {
if (!(+g.b.canal > 0)) return;
const j = destraDi(G, i); if (j < 0) return;
const th = rad(angolo(G[i].A, G[j].A)), t = canale(g.b) / Math.tan(th / 2);
g.len = Math.max(g.len, Math.ceil(G[j].wid / 2 + t + 3));
G[j].len = Math.max(G[j].len, Math.ceil(g.wid / 2 + t + 3));
});
return S0;
}
const angolo = (a, b) => Math.abs(((b - a) % 360 + 540) % 360 - 180);
const canale = b => Math.max(10, +b.canal || 20);
function destraDi(G, i) {
let best = -1, min = 1e9;
G.forEach((h, j) => { if (j === i) return; const d = norm(G[i].A - h.A); if (d > 20 && d < 170 && d < min) { min = d; best = j; } });
return best;
}
const fasciaBinari = c => (c.pl && +c.pl.binari === 2 ? 4.5 : 2.2);
const marginiStrada = road => RS.elements.margini ? RS.elements.margini(road) : { su: +road.banch || 0, giu: +road.banch || 0 };
function corsieEntranti(g, road) {
const off = (road.x - g.o.x) * g.n.x + (road.y - g.o.y) * g.n.y, hw = road.wid / 2, mg = marginiStrada(road), banch = mg.su;
const n = Math.max(1, road.cA + road.cB), spart = road.cA && road.cB ? (+road.spart || 0) : 0;
const cr = (road.wid - mg.su - mg.giu - spart) / n, yTop = off - hw + banch;
return { off, hw, yTop, yC: yTop + road.cB * cr, cr };
}
function genera(c) {
const out = [], G = bracciGeo(c), col = c.color || '#9aa0a6';
let zk = 0;
const add = (key, o) => { out.push(Object.assign(o, { id: c.id + '-' + key, inc: c.id, z: (c.z || 0) - 0.9 + (zk++) * 0.0005 })); return o; };
const P = (g, d, y) => ({ x: r3(g.o.x + g.u.x * d + g.n.x * y), y: r3(g.o.y + g.u.y * d + g.n.y * y) });
const strada = (g, key, da, a, extra) => {
const L = a - da, q = P(g, da + L / 2, (extra && extra._off) || 0), s = g.s;
const acc = c.accesso && g.b.ruolo === 'secondaria' ? { line: 'none', edge: 'none' } : {};
const o = Object.assign({ type: 'road', x: q.x, y: q.y, rot: r3(g.A), len: r2(L), wid: g.wid, cA: s.cA, cB: s.cB,
corsia: s.corsia, spart: s.spart || 0, banch: s.banch, marc: s.marc || 0, lanes: s.cA + s.cB, line: 'disc', color: col }, acc, extra || {});
delete o._off;
return add(key, o);
};
if (c.type === 'roundabout') { rotatoria(c, G, add, P, strada); return out; }
const R = Math.max(0, +c.raggio || 0), S0 = allunga(c, G), strade = new Array(G.length);
const unito = {}, semplice = g => !(g.b.svolta && +g.b.svolta.acc > 0) && !(+g.b.off);
G.forEach((g, i) => G.forEach((h, j) => {
if (j <= i || unito[i] != null || unito[j] != null || !semplice(g) || !semplice(h) || g.b.ruolo !== h.b.ruolo) return;
if (Math.abs(Math.abs(((h.A - g.A) % 360 + 540) % 360 - 180) - 180) < 0.5) { unito[i] = j; unito[j] = -1; }
}));
const dietro = G.map(() => 0), ord = G.map((g, i) => i).sort((a, b) => norm(G[a].A) - norm(G[b].A));
if (ord.length > 1) ord.forEach((i, k) => {
const j = ord[(k + 1) % ord.length], gi = G[i], gj = G[j];
if (norm(gj.A - gi.A) <= 181 || +gi.b.off || +gj.b.off) return;
dietro[i] = Math.max(dietro[i], gj.wid / 2); dietro[j] = Math.max(dietro[j], gi.wid / 2);
const mi = +gi.s.marc || 0, mj = +gj.s.marc || 0;
if (mi > 0 && mj > 0) {
const q = { x: c.x - gi.u.x * (gj.wid / 2 + mj / 2) - gj.u.x * (gi.wid / 2 + mi / 2), y: c.y - gi.u.y * (gj.wid / 2 + mj / 2) - gj.u.y * (gi.wid / 2 + mi / 2) };
add('m' + i, { type: 'band', sub: 'marc', x: r3(q.x), y: r3(q.y), rot: r3(gi.A), len: r2(mj + 0.02), wid: r2(mi + 0.02), color: '#d8d2c4' });
}
});
const immette = G.map(() => null);
G.forEach((g, j) => {
if (unito[j] != null || +g.b.off || (g.b.svolta && +g.b.svolta.acc > 0)) return;
G.forEach((m, i) => {
if (unito[i] == null || unito[i] === -1) return;
const cu = g.u.x * m.n.x + g.u.y * m.n.y, cn = g.n.x * m.n.x + g.n.y * m.n.y;
if (Math.abs(cu) >= Math.sin(rad(60)) || Math.abs(cu) < 0.05) return;
const a = (0.5 + (g.wid / 2) * Math.abs(cn)) / Math.abs(cu);
if (a < g.len - 3 && (!immette[j] || a > immette[j].a)) immette[j] = { a, m, sg: Math.sign(cu) };
});
});
G.forEach((g, i) => {
const sv = g.b.svolta;
if (unito[i] === -1) return;
if (immette[i]) {
strade[i] = strada(g, 'b' + i, 0, g.len, { mascheraDa: r2(immette[i].a) });
strade[i].z = (c.z || 0) - 0.92;
return;
}
if (unito[i] != null) {
const j = unito[i], h = G[j], tutta = strada(g, 'b' + i, -h.len, g.len);
strade[i] = tutta;
strade[j] = Object.assign({}, tutta, { cA: tutta.cB, cB: tutta.cA });
return;
}
if (!(sv && +sv.acc > 0)) { strade[i] = strada(g, 'b' + i, -dietro[i], g.len); return; }
const s = g.s, w = Math.max(2.5, +sv.wid || 3), acc = +sv.acc, racc = Math.max(5, +sv.racc || 20);
const sx = (sv.lato || 'sx') === 'sx', x1 = S0[i] + acc, x2 = x1 + racc, L = Math.max(g.len, x2 + 4);
const wI = r2(g.wid + w), nI = s.cA + s.cB + 1, offY = sx ? 0 : -w / 2;
const cI = r2((wI - 2 * s.banch - (s.cA && s.cB ? (+s.spart || 0) : 0)) / nI);
const dentro = strada(g, 'b' + i, 0, x1, { wid: wI, cB: s.cB + 1, lanes: nI, corsia: cI, _off: offY });
strade[i] = dentro;
strada(g, 'o' + i, x1, L);
const k = corsieEntranti(g, dentro), q = P(g, x1 + racc / 2, 0);
const fuori = g.s, crF = (g.wid - 2 * fuori.banch - (fuori.cA && fuori.cB ? (+fuori.spart || 0) : 0)) / Math.max(1, fuori.cA + fuori.cB);
add('v' + i, { type: 'svasatura', x: q.x, y: q.y, rot: r3(g.A), len: r2(racc), w0: wI, w1: g.wid, off0: offY,
yc0: r2(k.yC), yc1: r2(-g.wid / 2 + fuori.banch + fuori.cB * crF), cI, sx, banch: s.banch, color: col });
const dist = S0[i] + ((c.regola && c.regola.strisce) ? 5 : 0.6) + Math.min(6, acc * 0.3);
for (let j = 0; j <= s.cB; j++) {
const svolta = sx ? j === s.cB : j === 0, y = k.yTop + (j + 0.5) * k.cr, p = P(g, dist, y);
add('f' + i + '_' + j, { type: 'symbol', sym: 'freccia_terra', catId: 'freccterra', nome: 'Freccia a terra', size: r2(Math.min(4, k.cr * 1.1)),
color: '#ffffff', dir: svolta ? (sx ? 'sx' : 'dx') : 'dritto', x: p.x, y: p.y, rot: r3(g.A - 90) });
}
});
const racc = [], isoleFatte = [];
if (RS.raccordi && RS.raccordi.fraDue) {
if (R > 0) for (let i = 0; i < strade.length; i++)
for (let j = i + 1; j < strade.length; j++)
RS.raccordi.fraDue(strade[i], strade[j], R).forEach(r => {
if (sottoAltre(r, strade, [strade[i].id, strade[j].id])) return;
if (!racc.some(q => Math.hypot(q.x - r.x, q.y - r.y) < 0.3)) racc.push(r);
});
const isole = isoleFatte;
G.forEach((g, i) => {
if (!(+g.b.canal > 0)) return;
const j = destraDi(G, i); if (j < 0 || !strade[i] || !strade[j]) return;
const mezzo = G[i].A - norm(G[i].A - G[j].A) / 2;
let best = null, dmin = 1e9;
RS.raccordi.fraDue(strade[i], strade[j], canale(g.b)).forEach(r => {
const d = angolo(Math.atan2(r.y - c.y, r.x - c.x) * 180 / Math.PI, mezzo);
if (d < dmin) { dmin = d; best = r; }
});
if (!best || dmin > 60) return;
for (let k = racc.length - 1; k >= 0; k--) if (Math.hypot(racc[k].x - best.x, racc[k].y - best.y) < 0.5) racc.splice(k, 1);
racc.push(best); isole.push({ i, r: best, cede: !(g.b.ruolo === 'principale' && G[j].b.ruolo === 'secondaria') });
});
racc.forEach((r, k) => { delete r.auto; r.color = col; add('r' + k, r); });
isole.forEach(o => isola(o.i, o.r, add, o.cede, c.isolaFondo));
}
const tagli = [];
const svolte = new Set(isoleFatte.map(o => o.r));
regolazione(c, G, S0, strade, add, P, racc.filter(r => !svolte.has(r)), tagli);
if (!c.pl && !c.accesso) nucleo(c, G, add, P, tagli, strade, unito, immette);
nomiVie(c, G, add, P, 0, i => boccaBase(G, i), strade);
if (c.pl) passaggioLivello(c, G, strade, add, P);
if (c.accesso && c.cancello !== false) G.forEach((g, i) => {
if (g.b.ruolo !== 'secondaria') return;
const q = P(g, g.len - 0.3, 0);
add('k' + i, { type: 'band', sub: 'recinzione', x: q.x, y: q.y, rot: r3(g.A + 90), len: r2(g.wid + 0.6), wid: 0.2, color: '#555555' });
});
return out;
}
function sottoAltre(r, strade, esclusi) {
const e1 = dir(r.rot), e2 = dir(r.rot + r.ang), bl = Math.hypot(e1.x + e2.x, e1.y + e2.y) || 1;
const q = { x: r.x + (e1.x + e2.x) / bl * 0.6, y: r.y + (e1.y + e2.y) / bl * 0.6 };
return strade.some(s => {
if (!s || esclusi.indexOf(s.id) >= 0) return false;
const u = dir(s.rot || 0), dx = q.x - s.x, dy = q.y - s.y;
return Math.abs(dx * u.x + dy * u.y) <= s.len / 2 && Math.abs(-dx * u.y + dy * u.x) <= s.wid / 2;
});
}
function nucleo(c, G, add, P, fine, strade, unito, immette) {
const pts = [], tagli = [];
G.forEach(g => { pts.push(P(g, 0, -g.wid / 2), P(g, 0, g.wid / 2)); });
G.forEach((g, i) => {
const road = strade[i]; if (!road) return;
if (unito && unito[i] != null && fine[i] == null) return;
const im = immette && immette[i], a0 = im ? im.a : 0;
const k = corsieEntranti(g, road), d = fine[i] != null ? fine[i] : boccaBase(G, i);
const mr = marginiStrada(road), ya = k.off - k.hw + mr.su + 0.15, yb = k.off + k.hw - mr.giu - 0.15;
if (d > a0 && yb > ya) tagli.push([P(g, a0, ya), P(g, d, ya), P(g, d, yb), P(g, a0, yb)]);
if (im) {
const m = im.m, lat = p => ((p.x - m.o.x) * m.n.x + (p.y - m.o.y) * m.n.y) * im.sg;
const q = taglia([P(g, 0, -g.wid / 2), P(g, a0, -g.wid / 2), P(g, a0, g.wid / 2), P(g, 0, g.wid / 2)], p => lat(p) - 0.5);
if (q.length >= 3) tagli.push(q);
}
});
(fine.extra || []).forEach(t => tagli.push(t));
const rel = p => ({ x: r3(p.x - c.x), y: r3(p.y - c.y) });
const o = add('n', { type: 'nucleo', x: c.x, y: c.y, poli: involucro(pts).map(rel), tagli: tagli.map(t => t.map(rel)), color: c.color || '#9aa0a6' });
o.z = (c.z || 0) - 0.95;
}
function nomiVie(c, G, add, P, R0, bocca, strade) {
G.forEach((g, i) => {
const t = String(g.b.nome || '').trim(); if (!t) return;
const road = strade && strade[i], off = road ? corsieEntranti(g, road).off : 0;
const a = R0 + Math.max(bocca(i) + 6, g.len * 0.6), lat = off + g.wid / 2 + (+g.s.marc || 0) + 1.3;
let rot = norm(g.A); if (rot > 90 && rot <= 270) rot -= 180;
const q = P(g, a, lat);
add('tn' + i, { type: 'text', x: q.x, y: q.y, rot: r3(rot), text: t, size: 1.2, color: '#333333' });
});
}
const nomiDi = c => (c.bracci || []).map(b => String(b.nome || '').trim()).filter((t, k, a) => t && a.indexOf(t) === k);
function compilaLocalita(c) {
const S = RS.scene, m = S.meta = S.meta || {}, nomi = nomiDi(c);
if (!nomi.length) return;
const t = c.type === 'roundabout' ? 'Rotatoria fra ' + nomi.join(', ') : nomi.join(' incrocio ');
if (!String(m.localita || '').trim() || m.localita === m._locAuto) { m.localita = t; m._locAuto = t; }
}
function taglia(poli, f) {
const out = [];
poli.forEach((p, k) => {
const q = poli[(k + 1) % poli.length], fp = f(p), fq = f(q);
if (fp >= 0) out.push(p);
if ((fp >= 0) !== (fq >= 0)) { const t = fp / (fp - fq); out.push({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t }); }
});
return out;
}
function involucro(P) {
const p = P.slice().sort((a, b) => a.x - b.x || a.y - b.y), cr = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
if (p.length < 3) return p;
const lo = [], hi = [];
p.forEach(q => { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); });
p.slice().reverse().forEach(q => { while (hi.length >= 2 && cr(hi[hi.length - 2], hi[hi.length - 1], q) <= 0) hi.pop(); hi.push(q); });
return lo.slice(0, -1).concat(hi.slice(0, -1));
}
function isola(i, r, add, cede, fondo) {
const th = Math.abs(rad(r.ang)), R = r.R, w = 4.5, m = 0.6;
const e1 = dir(r.rot), e2 = dir(r.rot + r.ang), bl = Math.hypot(e1.x + e2.x, e1.y + e2.y) || 1;
const b = { x: (e1.x + e2.x) / bl, y: (e1.y + e2.y) / bl }, C = { x: r.x, y: r.y };
const dm = R / Math.sin(th / 2) - R, L = (dm - w) / Math.cos(th / 2);
if (L < 2.5) return;
const nrm = e => { const k = b.x * e.x + b.y * e.y, x = b.x - e.x * k, y = b.y - e.y * k, l = Math.hypot(x, y) || 1; return { x: x / l, y: y / l }; };
const n1 = nrm(e1), n2 = nrm(e2), d0 = m / Math.sin(th / 2);
const V0 = { x: C.x + b.x * d0, y: C.y + b.y * d0 };
const V1 = { x: C.x + e1.x * L + n1.x * m, y: C.y + e1.y * L + n1.y * m }, V2 = { x: C.x + e2.x * L + n2.x * m, y: C.y + e2.y * L + n2.y * m };
const B = { x: (V1.x + V2.x) / 2, y: (V1.y + V2.y) / 2 }, h = Math.hypot(B.x - V0.x, B.y - V0.y), wb = Math.hypot(V2.x - V1.x, V2.y - V1.y);
add('i' + i, { type: 'island', shape: 'triangolo', x: r3((V0.x + B.x) / 2), y: r3((V0.y + B.y) / 2), rot: r3(Math.atan2(-b.x, b.y) * 180 / Math.PI),
w: r2(wb), h: r2(h), color: '#7fae6a', fondo: fondo || 'verde' });
if (!cede) return;
const dO = R / Math.sin(th / 2), O = { x: C.x + b.x * dO, y: C.y + b.y * dO };
const vx = V2.x - O.x, vy = V2.y - O.y, vl = Math.hypot(vx, vy) || 1, v = { x: vx / vl, y: vy / vl };
const lung = vl - R - 0.3; if (lung < 1.5) return;
const a = { x: V2.x - v.x * 0.15, y: V2.y - v.y * 0.15 };
add('d' + i, { type: 'mark', style: 'give', x: r3(a.x - v.x * lung / 2), y: r3(a.y - v.y * lung / 2), rot: r3(Math.atan2(v.y, v.x) * 180 / Math.PI), len: r2(lung), color: '#ffffff' });
const s = { x: V2.x - e2.x * 1.2 + n2.x * 0.8, y: V2.y - e2.y * 1.2 + n2.y * 0.8 };
add('e' + i, { type: 'symbol', sym: 'precedenza', catId: 'segprec', nome: 'Dare precedenza', size: 0.9, color: '#c00', x: r3(s.x), y: r3(s.y) });
}
function passaggioLivello(c, G, strade, add, P) {
const pl = c.pl, n = +pl.binari === 2 ? 2 : 1, A = (c.rot || 0) + 90, u = dir(A);
const lungo = G.reduce((m, g) => Math.max(m, g.wid), 7) + 26;
for (let k = 0; k < n; k++) {
const s = n === 2 ? (k ? 2.25 : -2.25) : 0, d = dir(A + 90);
add('t' + k, { type: 'band', sub: 'rails', x: r3(c.x + d.x * s), y: r3(c.y + d.y * s), rot: r3(A), len: lungo, wid: 1.5, color: '#888' });
}
const fb = fasciaBinari(c);
G.forEach((g, i) => {
const road = strade[i]; if (!road) return;
const k = corsieEntranti(g, road), band = k.yC - k.yTop, mezzo = (k.yTop + k.yC) / 2, yS = k.off - k.hw - (+road.marc || 0) - 0.8;
const dB = fb + 2.5, dL = dB + 1.2;
if (pl.barriere === 'abbassate' || pl.barriere === 'alzate') {
const y0 = k.off - k.hw - 0.3, lb = pl.barriere === 'abbassate' ? r2(k.yC + 0.2 - y0) : 0.6, q = P(g, dB, y0 + lb / 2);
add('s' + i, { type: 'band', sub: 'sbarra', x: q.x, y: q.y, rot: r3(g.A + 90), len: lb, wid: 0.22, color: '#c00' });
} else {
const q = P(g, dL + 0.6, yS);
add('c' + i, { type: 'symbol', sym: 'passlivello', catId: 'passliv', nome: 'Passaggio a livello', size: 1.0, color: '#c00', x: q.x, y: q.y });
}
const q = P(g, dL, mezzo);
add('l' + i, { type: 'stopline', x: q.x, y: q.y, rot: r3(g.A + 90), len: r2(band), color: '#ffffff', scritta: '' });
});
}
function bordoA(g, k, d, racc) {
const yE = k.off - k.hw, out = { bordo: yE, striscia: k.yTop };
(racc || []).forEach(r => {
const vx = r.x - g.o.x, vy = r.y - g.o.y, lungo = vx * g.u.x + vy * g.u.y, lat = vx * g.n.x + vy * g.n.y;
if (Math.abs(lat - yE) > 0.3 || lungo <= 0 || !RS.elements.geometriaRaccordo) return;
const Gr = RS.elements.geometriaRaccordo(r), a = rad(r.rot || 0), cs = Math.cos(a), sn = Math.sin(a);
const Ox = r.x + Gr.O.x * cs - Gr.O.y * sn, Oy = r.y + Gr.O.x * sn + Gr.O.y * cs;
const Oa = (Ox - g.o.x) * g.u.x + (Oy - g.o.y) * g.u.y, Ol = (Ox - g.o.x) * g.n.x + (Oy - g.o.y) * g.n.y;
if (Ol <= yE && lungo <= d + 0.01 && d < Oa) out.fine = Math.max(out.fine || 0, Oa);
if (Ol > yE || d >= Oa || Oa - d >= Gr.R) return;
const t = (d - Oa) * (d - Oa), b = Ol + Math.sqrt(Gr.R * Gr.R - t);
let s = k.yTop;
if (RS.elements.strisciaRaccordo) {
const St = RS.elements.strisciaRaccordo(r, Gr), Qx = r.x + St.Q.x * cs - St.Q.y * sn, Qy = r.y + St.Q.x * sn + St.Q.y * cs;
const Qa = (Qx - g.o.x) * g.u.x + (Qy - g.o.y) * g.u.y, Ql = (Qx - g.o.x) * g.n.x + (Qy - g.o.y) * g.n.y, tq = (d - Qa) * (d - Qa);
if (d < Qa && St.r * St.r > tq) s = Ql + Math.sqrt(St.r * St.r - tq);
}
if (b < out.bordo) { out.bordo = b; out.striscia = Math.min(k.yTop, s); out.O = { a: Oa, l: Ol }; }
});
return out;
}
function regolazione(c, G, S0, strade, add, P, racc, tagli) {
const rg = c.regola || {}, tipo = rg.tipo || 'nessuna', su = rg.su === 'principale' ? 'principale' : 'secondaria';
G.forEach((g, i) => {
const road = strade[i], k = corsieEntranti(g, road), band = k.yC - k.yTop;
let d = Math.min(S0[i] + 0.6, boccaBase(G, i) + 1);
if (rg.strisce) {
const q = P(g, S0[i] + 2, k.off);
add('p' + i, { type: 'crosswalk', sub: 'ped', x: q.x, y: q.y, rot: r3(g.A + 90), len: road.wid, wid: 3, color: '#ffffff' });
d = S0[i] + 4.5;
}
if (tipo === 'nessuna' || tipo === 'destra') return;
const tocca = tipo === 'semaforo' || g.b.ruolo === su;
const yA = Math.min(k.yTop, bordoA(g, k, d + 0.25, racc).striscia) - 0.05, yB = Math.min(k.yTop, bordoA(g, k, d - 0.25, racc).striscia) - 0.05;
const y0 = tipo === 'precedenza' ? Math.max(yA, yB) + 0.1 : Math.min(yA, yB), mezzo = (y0 + k.yC) / 2;
if (tocca && rg.linee !== false) {
const q = P(g, d, mezzo), lung = k.yC - y0;
tagli[i] = d;
const Lc = Math.min(c.mezzCont != null ? +c.mezzCont : 12, g.len - d - 1.5);
if (Lc > 1 && road.cA && road.cB && !(+road.spart > 0)) {
const a0 = d + 0.25, q = P(g, a0 + Lc / 2, k.yC);
add('z' + i, { type: 'mark', style: 'cont', x: q.x, y: q.y, rot: r3(g.A), len: r2(Lc), color: '#ffffff' });
(tagli.extra = tagli.extra || []).push([P(g, a0, k.yC - 0.3), P(g, a0 + Lc, k.yC - 0.3), P(g, a0 + Lc, k.yC + 0.3), P(g, a0, k.yC + 0.3)]);
}
if (tipo === 'precedenza') add('l' + i, { type: 'mark', style: 'give', x: q.x, y: q.y, rot: r3(g.A + 90), len: r2(lung), color: '#ffffff' });
else add('l' + i, { type: 'stopline', x: q.x, y: q.y, rot: r3(g.A + 90), len: r2(lung), color: '#ffffff', scritta: tipo === 'stop' ? 'STOP' : '',
tw: r2(band), tx: r2((k.yTop + k.yC) / 2 - mezzo), ta: r3(yA - y0), tb: r3(yB - y0) });
}
if (rg.cartelli === false) return;
const bc = bordoA(g, k, d + 0.8, racc), fuori = (+road.marc || 0) + 0.9;
let q;
if (bc.O) {
const va = d + 0.8 - bc.O.a, vl = bc.bordo - bc.O.l, vn = Math.hypot(va, vl) || 1;
q = P(g, d + 0.8 - va / vn * fuori, bc.bordo - vl / vn * fuori);
} else if (bc.fine) q = P(g, bc.fine + 0.8, k.off - k.hw - fuori);
else q = P(g, d + 0.8, bc.bordo - fuori);
if (tipo === 'semaforo')
add('c' + i, { type: 'symbol', sym: 'semaforo', catId: 'semaforo', nome: 'Semaforo', size: 0.9, color: '#222', stato: g.b.stato != null ? g.b.stato : (rg.stato || ''), x: q.x, y: q.y });
else if (tocca && tipo === 'stop')
add('c' + i, { type: 'symbol', sym: 'stop', catId: 'segstop', nome: 'Segnale STOP', size: 0.9, color: '#c00', x: q.x, y: q.y });
else if (tocca)
add('c' + i, { type: 'symbol', sym: 'precedenza', catId: 'segprec', nome: 'Dare precedenza', size: 0.9, color: '#c00', x: q.x, y: q.y });
else
add('c' + i, { type: 'symbol', sym: 'dirprec', catId: 'dirprec', nome: 'Diritto di precedenza', size: 0.9, color: '#f6c400', x: q.x, y: q.y });
});
}
function rotatoria(c, G, add, P, strada) {
const R = (c.size || 20) / 2, forma = formaIsola(c);
let kz = 0;
const sopra = o => { o.z = (c.z || 0) + 0.05 + (kz++) * 0.0005; return o; };
const bypass = [];
G.forEach((g, i) => {
if (!g.b.bypass) return;
const j = destraDi(G, i); if (j < 0) return;
const bp = geoBypass(c, g, G[j], R); if (!bp) return;
g.len = Math.max(g.len, Math.ceil(bp.aI - R + 4)); G[j].len = Math.max(G[j].len, Math.ceil(bp.aJ - R + 4));
bypass.push({ i, j, bp });
});
G.forEach((g, i) => {
const hw = g.wid / 2, banch = g.s.banch || 0.25, rf = raccordoIngresso(c, hw);
const af = Math.sqrt(Math.max(0, (R + rf) * (R + rf) - (hw + rf) * (hw + rf)));
strada(g, 'b' + i, R - 0.8, R + g.len);
const gw = forma !== 'nessuna' ? r2(Math.min(2.4, g.wid * 0.32)) : 0, gl = r2(Math.min(12, Math.max(4, g.len * 0.55)));
if (gw) {
const q = P(g, R + 0.6 + gl / 2, 0);
sopra(add('g' + i, { type: 'island', shape: forma, x: q.x, y: q.y, rot: r3(g.A + 90), w: gw, h: gl, color: '#7fae6a', fondo: c.isolaFondo || 'verde' }));
}
if (c.strisce) {
const aC = R + 5 + 1.25, isolaLi = gw && R + 0.6 + gl >= aC + 1.25;
const pezzi = isolaLi ? [[-hw, -gw / 2 - 0.3], [gw / 2 + 0.3, hw]] : [[-hw, hw]];
pezzi.forEach(([y0, y1], k) => {
const q = P(g, aC, (y0 + y1) / 2);
sopra(add('p' + i + '_' + k, { type: 'crosswalk', sub: 'ped', x: q.x, y: q.y, rot: r3(g.A + 90), len: r2(y1 - y0), wid: 2.5, color: '#ffffff' }));
});
}
if (c.precedenza === false) return;
const yTop = -hw + banch, yEnd = gw ? -gw / 2 - 0.1 : 0, aL = Math.sqrt(Math.max(0, R * R - yEnd * yEnd)) + 0.4;
const q = P(g, aL, (yTop + yEnd) / 2);
sopra(add('l' + i, { type: 'mark', style: 'give', x: q.x, y: q.y, rot: r3(g.A + 90), len: r2(yEnd - yTop), color: '#ffffff' }));
const yS = -hw - (+g.s.marc || 0) - 0.9, a = P(g, Math.max(R + 1.8, af + 0.8), yS), b = P(g, Math.max(R + 3.2, af + 2.2), yS);
sopra(add('c' + i, { type: 'symbol', sym: 'precedenza', catId: 'segprec', nome: 'Dare precedenza', size: 0.9, color: '#c00', x: a.x, y: a.y }));
sopra(add('k' + i, { type: 'symbol', sym: 'rotatoria_seg', catId: 'rotatseg', nome: 'Segnale di rotatoria', size: 0.9, color: '#1d5fbf', x: b.x, y: b.y }));
});
bypass.forEach(({ i, j, bp }) => {
const L1 = R + G[i].len - bp.aI, L2 = R + G[j].len - bp.aJ;
const e = { type: 'curva', rot: r3(bp.rot), tratti: [{ t: 'r', len: r2(L1) }, { t: 'c', R: r2(bp.Rb), ang: r2(bp.th), verso: 'dx' }, { t: 'r', len: r2(L2) }],
sez: { cA: 1, cB: 0, corsia: bp.w - 0.5, spart: 0, banch: 0.25, marc: 0 }, line: 'none', edge: 'cont', guard: '', color: c.color || '#9aa0a6' };
if (!RS.curve) return;
const ini = RS.curve.geo(e).inizio, w = RS.curve.mondo({ x: 0, y: 0, rot: e.rot }, ini);
const S0 = P(G[i], R + G[i].len, bp.oi);
e.x = r3(S0.x - w.x); e.y = r3(S0.y - w.y);
add('y' + i, e);
});
nomiVie(c, G, (k, o) => sopra(add(k, o)), P, R, () => 2, null);
}
function geoBypass(c, gi, gj, R) {
const w = 4, gap = 1.5, oi = -(gi.wid / 2 + gap + w / 2), oj = gj.wid / 2 + gap + w / 2;
const ui = gi.u, uj = gj.u, ni = gi.n, nj = gj.n, di = { x: -ui.x, y: -ui.y };
const rx = oj * nj.x - oi * ni.x, ry = oj * nj.y - oi * ni.y, det = ui.x * (-uj.y) - ui.y * (-uj.x);
if (Math.abs(det) < 1e-6) return null;
const aX = (rx * (-uj.y) - ry * (-uj.x)) / det, bX = (ui.x * ry - ui.y * rx) / det;
const th = Math.atan2(di.x * uj.y - di.y * uj.x, di.x * uj.x + di.y * uj.y);
if (!(th > 0.2 && th < Math.PI - 0.2)) return null;
const rf = raccordoIngresso(c, gi.wid / 2), oltre = h => Math.sqrt(Math.max(0, (R + rf) * (R + rf) - (h + rf) * (h + rf))) + 3;
let t = Math.max(oltre(gi.wid / 2) - aX, oltre(gj.wid / 2) - bX, 3);
const dx = { x: -di.y, y: di.x };
const distanza = tt => { const Rb = tt / Math.tan(th / 2), Ti = { x: (aX + tt) * ui.x + oi * ni.x, y: (aX + tt) * ui.y + oi * ni.y };
return Math.hypot(Ti.x + dx.x * Rb, Ti.y + dx.y * Rb) - Rb - w / 2; };
for (let k = 0; k < 200 && distanza(t) < R + 4; k++) t += 0.5;
const Rb = t / Math.tan(th / 2), aI = aX + t, aJ = bX + t;
return { w, oi, aI, aJ, Rb, th: th * 180 / Math.PI, rot: Math.atan2(di.y, di.x) * 180 / Math.PI };
}
const FORME_ISOLA = [['goccia', 'a goccia'], ['triangolo', 'triangolari'], ['ovale', 'ovali'], ['nessuna', 'nessuna']];
const FONDI_ISOLA = [['verde', 'verde (rialzata)'], ['pavimentata', 'pavimentata (rialzata)'], ['zebrata', 'zebrata (a raso)']];
const formaIsola = c => c.isola || (c.gocce === false ? 'nessuna' : 'goccia');
const raccordoIngresso = (c, hw) => Math.max(1, Math.min(+c.rIng || 6, (c.size || 20) / 2));
const GEN = 5;
const firma = c => JSON.stringify([GEN, c.x, c.y, c.rot, c.z, c.raggio, c.color, c.sezP, c.sezS, c.bracci, c.regola,
c.size, c.ring, c.brWid, c.brMarc, c.gocce, c.precedenza, c.accesso, c.cancello, c.pl, c.mod, c.isola, c.isolaFondo, c.rIng, c.mezzCont, c.strisce]);
const MODIFICABILE = e => e.type === 'symbol' || e.type === 'island' || e.type === 'text' || e.type === 'crosswalk' || e.type === 'stopline' || e.type === 'mark' ||
(e.type === 'band' && (e.sub === 'sbarra' || e.sub === 'recinzione'));
const FISSE = { id: 1, inc: 1, z: 1, _b: 1, x: 1, y: 1, rot: 1 };
const chiave = (c, e) => e.id.slice(c.id.length + 1);
const base = e => { const b = JSON.parse(JSON.stringify(e)); delete b._b; return b; };
const giro = c => rad(c.type === 'roundabout' ? 0 : (c.rot || 0));
function registraModifiche(c, figli) {
const mod = Object.assign({}, c.mod || {}), a = giro(c), cs = Math.cos(a), sn = Math.sin(a);
let cambiato = false;
figli.forEach(e => {
const b = e._b; if (!b || !MODIFICABILE(e)) return;
const k = chiave(c, e), m = Object.assign({ t: e.type }, mod[k] || {});
let diff = false;
const dx = (+e.x || 0) - (+b.x || 0), dy = (+e.y || 0) - (+b.y || 0);
if (Math.abs(dx) > 1e-4 || Math.abs(dy) > 1e-4) { m.dx = r3((m.dx || 0) + dx * cs + dy * sn); m.dy = r3((m.dy || 0) - dx * sn + dy * cs); diff = true; }
if (Math.abs((+e.rot || 0) - (+b.rot || 0)) > 1e-4) { m.drot = r3((m.drot || 0) + (+e.rot || 0) - (+b.rot || 0)); diff = true; }
Object.keys(e).forEach(p => { if (!FISSE[p] && p[0] !== '_' && JSON.stringify(e[p]) !== JSON.stringify(b[p])) { m.p = Object.assign({}, m.p, { [p]: e[p] }); diff = true; } });
Object.keys(b).forEach(p => { if (!FISSE[p] && p[0] !== '_' && !(p in e)) { m.p = Object.assign({}, m.p, { [p]: null }); diff = true; } });
if (diff) { mod[k] = m; e._b = base(e); cambiato = true; }
});
(c._k || []).forEach(k => { if (!(mod[k] && mod[k].via) && !figli.some(e => chiave(c, e) === k)) { mod[k] = { via: true }; cambiato = true; } });
if (cambiato) c.mod = mod;
return cambiato;
}
function applicaModifiche(c, lista) {
const mod = c.mod || {}, a = giro(c), cs = Math.cos(a), sn = Math.sin(a);
return lista.filter(o => {
if (!MODIFICABILE(o)) return true;
const m = mod[chiave(c, o)];
if (m && m.via) return false;
if (m && (!m.t || m.t === o.type)) {
if (m.dx || m.dy) { o.x = r3((+o.x || 0) + (m.dx || 0) * cs - (m.dy || 0) * sn); o.y = r3((+o.y || 0) + (m.dx || 0) * sn + (m.dy || 0) * cs); }
if (m.drot) o.rot = r3((+o.rot || 0) + m.drot);
if (m.p) Object.keys(m.p).forEach(p => { if (m.p[p] === null) delete o[p]; else o[p] = m.p[p]; });
}
o._b = base(o);
return true;
});
}
const numeroModifiche = c => Object.keys(c.mod || {}).length;
function ripristina(c) {
const S = RS.scene;
S.elements = S.elements.filter(e => e.inc !== c.id);
delete c.mod; delete c._k; c._firma = null;
}
function aggiorna(S) {
const regs = S.elements.filter(registro), ids = new Set(regs.map(c => c.id));
if (S.elements.some(e => e.inc && !ids.has(e.inc))) S.elements = S.elements.filter(e => !e.inc || ids.has(e.inc));
regs.forEach(c => {
const figli = S.elements.filter(e => e.inc === c.id);
figli.forEach(e => { if (e.id.indexOf(c.id + '-') !== 0) { delete e.inc; delete e._b; } });
const miei = figli.filter(e => e.inc === c.id);
const prima = firma(c);
if (c._firma && miei.length && registraModifiche(c, miei) && c._firma === prima) { c._firma = firma(c); return; }
const f = firma(c);
if (c._firma === f && miei.length) return;
const nuovi = genera(c);
c._k = nuovi.filter(MODIFICABILE).map(o => chiave(c, o));
S.elements = S.elements.filter(e => e.inc !== c.id).concat(applicaModifiche(c, nuovi));
c._firma = f;
});
}
const regista = (e, tutto) => (e && e.inc && (tutto || !MODIFICABILE(e)) && RS.scene.get(e.inc)) || e;
function bounds(c) {
const fig = RS.scene.elements.filter(e => e.inc === c.id);
if (!fig.length) return { x: c.x - 3, y: c.y - 3, w: 6, h: 6 };
let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
fig.forEach(e => { const b = RS.elements.bounds(e); if (!b) return; x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.w); y1 = Math.max(y1, b.y + b.h); });
return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}
function estremi(c) {
const R = c.type === 'roundabout' ? (c.size || 20) / 2 : 0, G = bracciGeo(c);
if (c.type === 'incrocio') allunga(c, G);
return G.map(g => {
const sv = g.b.svolta, L = sv && +sv.acc > 0 && c.type === 'incrocio' ? Math.max(g.len, bocca(G, g.i, +c.raggio || 0) + (+sv.acc) + Math.max(5, +sv.racc || 20) + 4) : g.len;
return { i: g.i, x: g.o.x + g.u.x * (L + R), y: g.o.y + g.u.y * (L + R) };
});
}
function trascinaBraccio(c, i, w) {
const b = c.bracci[i]; if (!b) return;
const R = c.type === 'roundabout' ? (c.size || 20) / 2 : 0, rot = c.type === 'roundabout' ? 0 : (c.rot || 0);
let a = norm(Math.atan2(w.y - c.y, w.x - c.x) * 180 / Math.PI - rot);
const vicino = Math.round(a / 15) * 15; if (Math.abs(vicino - a) <= 3) a = vicino;
b.ang = norm(Math.round(a));
b.len = Math.max(4, Math.round((Math.hypot(w.x - c.x, w.y - c.y) - R) * 2) / 2);
}
function angoloLibero(c) {
const a = c.bracci.map(b => norm(+b.ang || 0)).sort((x, y) => x - y);
if (!a.length) return 0;
let best = 0, ang = 0;
a.forEach((x, k) => { const y = k + 1 < a.length ? a[k + 1] : a[0] + 360, gap = y - x; if (gap > best) { best = gap; ang = x + gap / 2; } });
return norm(Math.round(ang));
}
function descrizione(c) {
if (c.type !== 'incrocio') return '';
if (c.pl) return 'Passaggio a livello ' + ((BARRIERE.find(b => b[0] === (c.pl.barriere || '')) || BARRIERE[2])[1]) + (+c.pl.binari === 2 ? ', due binari' : '');
const rg = c.regola || {}, su = rg.su === 'principale' ? 'principale' : 'secondaria';
if (c.accesso && (!rg.tipo || rg.tipo === 'nessuna')) return 'Accesso da passo carrabile';
switch (rg.tipo) {
case 'destra': return 'Incrocio con precedenza a destra';
case 'stop': return 'Incrocio regolato da STOP sulla strada ' + su;
case 'precedenza': return 'Incrocio regolato da «dare precedenza» sulla strada ' + su;
case 'semaforo': return 'Incrocio regolato da semaforo';
default: return '';
}
}
function vociLegenda() {
const SIMB = { destra: { sym: 'cartello', cod: 'p:incrocio', color: '#c8102e' }, stop: { sym: 'stop', color: '#c00' },
precedenza: { sym: 'precedenza', color: '#c00' }, semaforo: { sym: 'semaforo', color: '#222' } };
const viste = {}, PL = { sym: 'passlivello', color: '#c00' };
return RS.scene.elements.filter(e => e.type === 'incrocio' && ((e.regola && SIMB[e.regola.tipo]) || e.pl)).map(e => {
const t = descrizione(e); if (viste[t]) return null; viste[t] = 1;
const s = e.pl ? PL : SIMB[e.regola.tipo];
return { key: 'inc:' + t, ref: Object.assign({ type: 'symbol', size: 0.9 }, s), c: s.color, t };
}).filter(Boolean);
}
const numIn = (attr, v, step, min) => `<input type="number" ${attr} value="${v}" step="${step || 0.5}"${min != null ? ` min="${min}"` : ''}>`;
const selIn = (attr, v, opts) => `<select ${attr}>${opts.map(o => `<option value="${esc(o[0])}"${String(o[0]) === String(v) ? ' selected' : ''}>${esc(o[1])}</option>`).join('')}</select>`;
function sezioneHtml(chi, s, titolo) {
s = Object.assign({}, chi === 'P' ? SEZ_P : SEZ_S, s);
return `<div class="inc-sez"><div class="inc-sez-t">${titolo} <span class="muted">· carreggiata ${String(largh(s)).replace('.', ',')} m</span></div>
      <div class="inc-griglia">
        <label>Corsie ${RS.FRECCIA ? RS.FRECCIA.avanti : '→'}${numIn(`data-is="${chi}:cA"`, s.cA, 1, 0)}</label>
        <label>Corsie ${RS.FRECCIA ? RS.FRECCIA.indietro : '←'}${numIn(`data-is="${chi}:cB"`, s.cB, 1, 0)}</label>
        <label>Corsia (m)${numIn(`data-is="${chi}:corsia"`, s.corsia, 0.1, 2)}</label>
        <label>Banchina (m)${numIn(`data-is="${chi}:banch"`, s.banch, 0.05, 0)}</label>
        <label>Marciapiede (m)${numIn(`data-is="${chi}:marc"`, s.marc || 0, 0.1, 0)}</label>
        <label>Spartitraffico (m)${numIn(`data-is="${chi}:spart"`, s.spart || 0, 0.1, 0)}</label>
      </div></div>`;
}
function segnaliHtml(c) {
const n = numeroModifiche(c);
return `<div class="mis-hint aiuto">Segnali, linee di arresto e strisce pedonali si modificano uno per uno: clic sul segnale, poi spostalo, ruotalo, cambialo nelle proprietà o cancellalo (Canc). Le modifiche restano anche se cambi l'incrocio.</div>
      ${n ? `<div class="pbtns"><button class="pbtn" data-iact="ripristina" title="Rimette segnali, linee e strisce come li fa l'incrocio">↺ Ripristina segnali e strisce (${n} ${n === 1 ? 'modifica' : 'modifiche'})</button></div>` : ''}`;
}
function pannello(c) {
const rg = c.regola || {}, sem = rg.tipo === 'semaforo';
const righe = c.bracci.map((b, i) => {
const sv = b.svolta || null;
return `<div class="inc-br">
          <span class="inc-n">${i + 1}</span>
          <label>Angolo°${numIn(`data-ib="${i}:ang"`, b.ang, 1)}</label>
          <label>Lungh. (m)${numIn(`data-ib="${i}:len"`, b.len, 0.5, 4)}</label>
          <button class="iconbtn danger" data-ibdel="${i}" title="Togli il braccio ${i + 1}"${c.bracci.length <= 2 ? ' disabled' : ''}>🗑</button>
          <label class="inc-wide">Nome della via<input type="text" data-ib="${i}:nome" value="${esc(b.nome || '')}" placeholder="es. Via Roma"></label>
          <label class="inc-wide">Strada${selIn(`data-ib="${i}:ruolo"`, b.ruolo || 'secondaria', [['principale', 'principale'], ['secondaria', 'secondaria']])}</label>
          ${c.pl ? "" : `<label class="inc-wide">Corsia di svolta${selIn(`data-ib="${i}:svolta"`, sv ? sv.lato : '', [['', 'nessuna'], ['sx', 'a sinistra'], ['dx', 'a destra']])}</label>`}
          ${sv ? `<div class="inc-sv"><label>Accumulo (m)${numIn(`data-ib="${i}:acc"`, sv.acc, 1, 5)}</label><label>Svasatura (m)${numIn(`data-ib="${i}:racc"`, sv.racc, 1, 5)}</label><label>Larghezza (m)${numIn(`data-ib="${i}:wid"`, sv.wid, 0.1, 2.5)}</label></div>` : ''}
          ${c.pl || c.accesso ? '' : `<label class="inc-wide">Svolta a destra${selIn(`data-ib="${i}:canal"`, +b.canal > 0 ? '1' : '', [['', 'normale'], ['1', 'con isola (canalizzata)']])}</label>
          ${+b.canal > 0 ? `<div class="inc-sv"><label>Raggio della svolta (m)${numIn(`data-ib="${i}:canalR"`, b.canal, 1, 10)}</label></div>` : ''}`}
          ${sem ? `<label class="inc-wide">Semaforo${selIn(`data-ib="${i}:stato"`, b.stato != null ? b.stato : (rg.stato || ''), STATI)}</label>` : ''}
        </div>`;
}).join('');
return `<div class="inc-pan">
      <div class="inc-griglia">
        ${c.pl ? '' : `<label>Raggio raccordi (m)${numIn('data-ip="raggio"', c.raggio, 0.5, 0)}</label>`}
        <label>Rotazione°${numIn('data-ip="rot"', r2(c.rot || 0), 1)}</label>
      </div>
      <div class="inc-sez-t" style="margin-top:10px">Bracci <span class="muted">· trascina i numeri sul disegno</span></div>
      ${righe}
      <div class="pbtns"><button class="pbtn" data-iact="add">＋ Braccio</button><button class="pbtn" data-iact="sciogli" title="Torna a tratti di strada separati, da modificare uno per uno">Sciogli in strade</button></div>
      ${segnaliHtml(c)}
      ${c.bracci.some(b => +b.canal > 0) ? `<div class="inc-griglia"><label class="inc-wide">Fondo delle isole di svolta${selIn('data-ip="isolaFondo"', c.isolaFondo || 'verde', FONDI_ISOLA)}</label></div>` : ''}
      ${sezioneHtml('P', c.sezP, c.pl ? 'Strada' : 'Strada principale')}
      ${c.pl ? '' : sezioneHtml('S', c.sezS, c.accesso ? 'Accesso (passo carrabile)' : 'Strada secondaria')}
      ${c.accesso ? `<label class="inc-chk"><input type="checkbox" data-ip="cancello"${c.cancello !== false ? ' checked' : ''}> Cancello in fondo all'accesso</label>` : ''}
      ${c.pl ? `<div class="inc-sez"><div class="inc-sez-t">Passaggio a livello</div>
        <div class="inc-griglia">
          <label>Binari${selIn('data-ipl="binari"', +c.pl.binari === 2 ? 2 : 1, [[1, 'uno'], [2, 'due']])}</label>
          <label>Barriere${selIn('data-ipl="barriere"', c.pl.barriere || '', BARRIERE)}</label>
        </div>
        <div class="mis-hint aiuto">In legenda e nell'atto: «${esc(descrizione(c))}».</div></div>` : ''}
      <div class="inc-sez"${c.pl ? ' hidden' : ''}><div class="inc-sez-t">Regolazione dell'incrocio</div>
        <div class="inc-griglia">
          <label class="inc-wide">Regolazione${selIn('data-ir="tipo"', rg.tipo || 'nessuna', Object.keys(REGOLE).map(k => [k, REGOLE[k]]))}</label>
          ${rg.tipo === 'stop' || rg.tipo === 'precedenza' ? `<label class="inc-wide">Sulla strada${selIn('data-ir="su"', rg.su || 'secondaria', [['secondaria', 'secondaria'], ['principale', 'principale']])}</label>` : ''}
        </div>
        ${rg.tipo && rg.tipo !== 'nessuna' && rg.tipo !== 'destra' ? `<label class="inc-chk"><input type="checkbox" data-ir="linee"${rg.linee !== false ? ' checked' : ''}> Linee di arresto e scritte a terra</label>
        <label class="inc-chk"><input type="checkbox" data-ir="cartelli"${rg.cartelli !== false ? ' checked' : ''}> Cartelli a destra di ogni braccio</label>` : ''}
        ${rg.tipo && rg.tipo !== 'nessuna' && rg.tipo !== 'destra' && rg.linee !== false ? `<div class="inc-griglia"><label class="inc-wide">Mezzeria continua prima della linea (m)${numIn('data-ip="mezzCont"', c.mezzCont != null ? c.mezzCont : 12, 1, 0)}</label></div>` : ''}
        <label class="inc-chk"><input type="checkbox" data-ir="strisce"${rg.strisce ? ' checked' : ''}> Strisce pedonali su tutti i bracci</label>
        ${rg.tipo && rg.tipo !== 'nessuna' ? `<div class="mis-hint aiuto">In legenda e nell'atto: «${esc(descrizione(c))}».</div>` : ''}
      </div>
    </div>`;
}
function pannelloRotatoria(c) {
const br = c.bracci || [];
return `<div class="inc-pan">
      <div class="inc-griglia">
        <label class="inc-wide">Tipo${selIn('data-ip="mini"', c.mini ? '1' : '', [['', 'Rotatoria'], ['1', 'Mini-rotatoria (isola sormontabile)']])}</label>
        ${c.mini ? '' : `<label>Fascia sormontabile (m)${numIn('data-ip="fascia"', c.fascia || 0, 0.1, 0)}</label>`}
        ${c.mini ? '' : `<label>Corsie nell'anello${selIn('data-ip="corsie"', +c.corsie === 2 ? 2 : c.corsie == null ? '' : 1, (c.corsie == null ? [['', 'come disegnata']] : []).concat([[1, 'una'], [2, 'due']]))}</label>`}
        <label>Larghezza bracci (m)${numIn('data-ip="brWid"', c.brWid || 7, 0.1, 3)}</label>
      </div>
      <div class="inc-sez-t" style="margin-top:10px">Bracci <span class="muted">· trascina i numeri sul disegno</span></div>
      ${br.map((b, i) => `<div class="inc-br"><span class="inc-n">${i + 1}</span>
          <label>Angolo°${numIn(`data-ib="${i}:ang"`, b.ang, 1)}</label>
          <label>Lungh. (m)${numIn(`data-ib="${i}:len"`, b.len, 0.5, 4)}</label>
          <button class="iconbtn danger" data-ibdel="${i}" title="Togli il braccio ${i + 1}">🗑</button>
          <label class="inc-wide">Nome della via<input type="text" data-ib="${i}:nome" value="${esc(b.nome || '')}" placeholder="es. Via Roma"></label>
          <label class="inc-chk inc-wide"><input type="checkbox" data-ib="${i}:bypass"${b.bypass ? ' checked' : ''}> Svolta a destra diretta (bypass)</label></div>`).join('') || '<div class="muted">Nessun braccio: la rotatoria è disegnata da sola.</div>'}
      <div class="pbtns"><button class="pbtn" data-iact="add">＋ Braccio</button></div>
      ${segnaliHtml(c)}
      <div class="inc-sez"><div class="inc-sez-t">Isole</div>
        <div class="inc-griglia">
          <label>Agli ingressi${selIn('data-ip="isola"', formaIsola(c), FORME_ISOLA)}</label>
          <label>Fondo${selIn('data-ip="isolaFondo"', c.isolaFondo || 'verde', FONDI_ISOLA)}</label>
          ${c.mini ? '' : `<label>Isola centrale${selIn('data-ip="centro"', c.centro || 'verde', FONDI_ISOLA)}</label>`}
          <label>Raccordo ingressi (m)${numIn('data-ip="rIng"', +c.rIng || 6, 0.5, 1)}</label>
        </div></div>
      <label class="inc-chk"><input type="checkbox" data-ip="strisce"${c.strisce ? ' checked' : ''}> Strisce pedonali sui bracci (a 5 m dall'anello)</label>
      <label class="inc-chk"><input type="checkbox" data-ip="frecce"${c.frecce ? ' checked' : ''}> Frecce del senso di marcia</label>
      <label class="inc-chk"><input type="checkbox" data-ip="precedenza"${c.precedenza !== false ? ' checked' : ''}> «Dare precedenza» agli ingressi, con i cartelli</label>
    </div>`;
}
function lega(root, c) {
c.bracci = c.bracci || [];
const S = RS.scene, fatto = (ridisegna) => { S.render(); S.snapshot(); if (RS.ui) { RS.ui.renderLegend && RS.ui.renderLegend(); if (ridisegna) setTimeout(() => RS.ui.renderProps(), 0); } };
const val = inp => inp.type === 'checkbox' ? inp.checked : inp.type === 'number' ? parseFloat(inp.value) : inp.value;
root.querySelectorAll('[data-ip]').forEach(inp => inp.addEventListener('change', () => {
const k = inp.dataset.ip, v = val(inp);
if (typeof v === 'number' && isNaN(v)) return;
if (k === 'mini') { c.mini = v === '1'; if (c.mini) { c.size = Math.min(c.size || 20, 22); c.ring = Math.min(c.ring || 6, 6); } }
else if (k === 'corsie') {
if (v === '') return;
c.corsie = +v;
if (c.corsie === 2) { c.ring = Math.max(+c.ring || 7, 9); c.size = Math.max(+c.size || 26, 40); }
}
else c[k] = v;
fatto(k === 'mini' || k === 'corsie');
}));
root.querySelectorAll('[data-ib]').forEach(inp => inp.addEventListener('change', () => {
const [i, k] = inp.dataset.ib.split(':'), b = c.bracci[+i]; if (!b) return;
let v = val(inp); if (typeof v === 'number' && isNaN(v)) return;
if (k === 'ang') b.ang = norm(v);
else if (k === 'len') b.len = Math.max(4, v);
else if (k === 'svolta') { b.svolta = v ? Object.assign({ acc: 30, racc: 20, wid: 3 }, b.svolta || {}, { lato: v }) : null; if (!v) delete b.svolta; }
else if (k === 'acc' || k === 'racc' || k === 'wid') { if (b.svolta) b.svolta[k] = v; }
else if (k === 'canal') { if (v) b.canal = 20; else delete b.canal; }
else if (k === 'canalR') b.canal = Math.max(10, v);
else if (k === 'nome') { b.nome = String(v || '').trim(); compilaLocalita(c); }
else b[k] = v;
fatto(k === 'svolta' || k === 'ruolo' || k === 'canal');
}));
root.querySelectorAll('[data-ipl]').forEach(inp => inp.addEventListener('change', () => {
c.pl = Object.assign({}, c.pl, { [inp.dataset.ipl]: inp.dataset.ipl === 'binari' ? +inp.value : inp.value });
fatto(true);
}));
root.querySelectorAll('[data-is]').forEach(inp => inp.addEventListener('change', () => {
const [chi, k] = inp.dataset.is.split(':'), v = val(inp); if (isNaN(v)) return;
const key = chi === 'P' ? 'sezP' : 'sezS';
c[key] = Object.assign({}, chi === 'P' ? SEZ_P : SEZ_S, c[key], { [k]: (k === 'cA' || k === 'cB') ? Math.max(0, Math.round(v)) : v });
fatto(true);
}));
root.querySelectorAll('[data-ir]').forEach(inp => inp.addEventListener('change', () => {
c.regola = Object.assign({ tipo: 'nessuna', su: 'secondaria', linee: true, cartelli: true, strisce: false }, c.regola || {});
c.regola[inp.dataset.ir] = val(inp);
fatto(true);
}));
root.querySelectorAll('[data-ibdel]').forEach(b => b.onclick = () => {
if (c.type === 'incrocio' && c.bracci.length <= 2) return;
c.bracci.splice(+b.dataset.ibdel, 1); fatto(true);
});
root.querySelectorAll('[data-iact]').forEach(b => b.onclick = () => {
if (b.dataset.iact === 'add') {
c.bracci.push(c.type === 'roundabout' ? { ang: angoloLibero(c), len: 18 } : { ang: angoloLibero(c), len: 16, ruolo: 'secondaria' });
fatto(true);
} else if (b.dataset.iact === 'sciogli') sciogli(c);
else if (b.dataset.iact === 'ripristina') { ripristina(c); fatto(true); }
});
}
function sciogli(c) {
const S = RS.scene, figli = S.elements.filter(e => e.inc === c.id);
const strade = figli.filter(e => e.type === 'road').map(e => e.id).join('|');
figli.forEach(e => {
delete e.inc;
if (e.type === 'raccordo') e.auto = strade;
});
S.elements = S.elements.filter(e => e !== c);
S.render(); S.snapshot(); S.select(figli.filter(e => e.type === 'road').map(e => e.id));
if (RS.ui) RS.ui.toast('Incrocio sciolto in ' + figli.length + ' elementi: ora si modificano uno per uno (Ctrl+Z per tornare indietro)', 5000);
}
RS.incroci = { daModello, rotatoriaNuova, aggiorna, registro, regista, bounds, estremi, trascinaBraccio, descrizione, vociLegenda,
pannello, pannelloRotatoria, lega, genera, bracciGeo };
})(window.RS = window.RS || {});

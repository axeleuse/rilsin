(function (RS) {
'use strict';
const dot = (a, b) => a.x * b.x + a.y * b.y;
const cross = (a, b) => a.x * b.y - a.y * b.x;
const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
const add = (a, b, k) => ({ x: a.x + b.x * k, y: a.y + b.y * k });
function togli(lista) {
const S = RS.scene, via = new Set(lista.map(e => e.id));
S.elements = S.elements.filter(e => !via.has(e.id));
S.selection = S.selection.filter(id => !via.has(id));
}
function asse(e) {
const r = (e.rot || 0) * Math.PI / 180;
return { c: { x: e.x, y: e.y }, d: { x: Math.cos(r), y: Math.sin(r) }, n: { x: -Math.sin(r), y: Math.cos(r) }, hl: e.len / 2, hw: e.wid / 2 };
}
function scostamento(e) {
const es = e.edge || 'cont', ew = es === 'wide' ? 0.18 : 0.1;
const s = RS.elements.sezione ? RS.elements.sezione(e) : null;
if (s) return Math.max(s.banch, ew / 2 + 0.05);
return 0.12 + (ew - 0.1) / 2;
}
function fraDue(A, B, R) {
const a = asse(A), b = asse(B), den = cross(a.d, b.d);
if (Math.abs(den) < Math.sin(20 * Math.PI / 180)) return [];
const cb = sub(b.c, a.c), sA = cross(cb, b.d) / den, sB = cross(cb, a.d) / den;
if (Math.abs(sA) > a.hl + b.hw + 0.5 || Math.abs(sB) > b.hl + a.hw + 0.5) return [];
const out = [];
[-1, 1].forEach(gA => [-1, 1].forEach(gB => {
const pA = add(a.c, a.n, gA * a.hw), pB = add(b.c, b.n, gB * b.hw);
const s1 = cross(sub(pB, pA), b.d) / den, C = add(pA, a.d, s1);
const k1 = Math.sign(dot(a.d, b.n)) * gB, k2 = Math.sign(dot(b.d, a.n)) * gA;
const u1 = { x: a.d.x * k1, y: a.d.y * k1 }, u2 = { x: b.d.x * k2, y: b.d.y * k2 };
const cA = dot(sub(C, a.c), a.d), cB = dot(sub(C, b.c), b.d);
const liberoA = k1 > 0 ? a.hl - cA : a.hl + cA, liberoB = k2 > 0 ? b.hl - cB : b.hl + cB;
if (liberoA < 0.6 || liberoB < 0.6) return;
if (Math.abs(cA) > a.hl + 0.3 || Math.abs(cB) > b.hl + 0.3) return;
const ang = Math.atan2(cross(u1, u2), dot(u1, u2)), th = Math.abs(ang);
if (th < 25 * Math.PI / 180 || th > 155 * Math.PI / 180) return;
let r = R, t = r / Math.tan(th / 2);
const tMax = Math.min(liberoA, liberoB) - 0.3;
if (t > tMax) { r = tMax * Math.tan(th / 2); t = tMax; }
if (r < 0.8) return;
const lA = RS.elements.latiMarc(A), lB = RS.elements.latiMarc(B);
const marc = Math.max(gA > 0 ? lA.dx : lA.sx, gB > 0 ? lB.dx : lB.sx);
out.push({ type: 'raccordo', x: +C.x.toFixed(3), y: +C.y.toFixed(3), rot: +(Math.atan2(u1.y, u1.x) * 180 / Math.PI).toFixed(3),
ang: +(ang * 180 / Math.PI).toFixed(3), R: Math.round(r * 100) / 100, marc,
doff: Math.round((scostamento(A) + scostamento(B)) / 2 * 100) / 100, d1: Math.round(scostamento(A) * 100) / 100, d2: Math.round(scostamento(B) * 100) / 100,
edge: (A.edge === 'none' || B.edge === 'none') ? 'none' : (A.edge || 'cont'),
color: A.color || '#9aa0a6', z: Math.max(A.z || 0, B.z || 0) + 0.5, auto: [A.id, B.id].sort().join('|') });
}));
return out;
}
RS.raccordi = {
fraDue,
genera(R, ids) {
const S = RS.scene;
const strade = S.elements.filter(e => e.type === 'road' && !e.inc && (!ids || ids.indexOf(e.id) >= 0));
const tocca = new Set(strade.map(e => e.id));
const vecchi = S.elements.filter(e => e.type === 'raccordo' && e.auto && e.auto.split('|').some(id => tocca.has(id)));
if (vecchi.length) togli(vecchi);
const nuovi = [];
for (let i = 0; i < strade.length; i++)
for (let j = i + 1; j < strade.length; j++)
fraDue(strade[i], strade[j], R).forEach(r => {
if (!nuovi.some(q => Math.hypot(q.x - r.x, q.y - r.y) < 0.3)) nuovi.push(r);
});
togli(S.elements.filter(e => e.type === 'raccordo' && e.auto && nuovi.some(r => Math.hypot(r.x - e.x, r.y - e.y) < 0.3)));
nuovi.forEach(r => S.add(r, false));
S.render();
return nuovi.length;
},
comando() {
const ui = RS.ui;
if (!RS.scene.elements.some(e => e.type === 'road' && !e.inc)) { ui.toast(RS.scene.elements.some(e => e.type === 'incrocio') ? 'Gli incroci inseriti dalla tavolozza si raccordano da soli: il raggio è nelle loro proprietà' : 'Nessuna strada diritta nel disegno', 4000); return; }
ui.scelta({
titolo: 'Raccorda gli incroci',
testo: 'Arrotonda gli angoli dove si incontrano le strade diritte: asfalto, striscia di margine e marciapiede girano in curva. Raggio del raccordo:',
opzioni: [
{ k: '3', t: 'Stretto — 3 m', d: 'centro storico, accessi' },
{ k: '6', t: 'Normale — 6 m', d: 'incroci urbani', primario: true },
{ k: '10', t: 'Ampio — 10 m', d: 'strade extraurbane, mezzi pesanti' },
{ k: '0', t: 'Togli i raccordi automatici', d: 'angoli di nuovo vivi', pericolo: true }
]
}).then(k => {
if (k == null) return;
const S = RS.scene;
if (k === '0') {
const v = S.elements.filter(e => e.type === 'raccordo' && e.auto);
if (v.length) { togli(v); S.render(); S.snapshot(); }
ui.toast(v.length ? 'Raccordi tolti: ' + v.length : 'Nessun raccordo automatico', 3000);
return;
}
const n = this.genera(+k);
S.snapshot();
ui.toast(n ? 'Raccordi inseriti: ' + n + ' (raggio ' + k + ' m; ridotto dove la strada è corta)' : 'Nessun incrocio fra strade diritte da raccordare', 4000);
});
}
};
})(window.RS = window.RS || {});

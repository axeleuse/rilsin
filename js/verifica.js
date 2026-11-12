(function (RS) {
'use strict';
const escH = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const m2 = v => Number(v).toFixed(2).replace('.', ',');
const cm = v => Math.round(Math.abs(v) * 100) + ' cm';
const tolMisura = d => 0.05 + 0.01 * d;
const tolDisegno = d => 0.10 + 0.02 * d;
function punti() {
const cap = {}, tgt = {};
RS.scene.elements.forEach(e => {
if (e.letter) cap[String(e.letter).toUpperCase()] = { x: e.x, y: e.y };
if (e.type === 'surveypt' && e.n != null) tgt['P' + e.n] = { x: e.x, y: e.y };
});
veicoliMisurati().forEach(e => {
const r = (e.rot || 0) * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
e.rilpts.forEach(p0 => {
const p = RS.elements.locale ? RS.elements.locale(e, p0.lx, p0.ly) : p0;
tgt[String(e.label).toUpperCase() + p0.n] = { x: e.x + p.lx * c - p.ly * s, y: e.y + p.lx * s + p.ly * c };
});
});
return { cap, tgt };
}
function veicoliMisurati() {
const per = {}, rilevata = v => !v.fase || v.fase === 'quiete';
RS.scene.elements.filter(e => e.type === 'vehicle' && e.label && e.rilpts && e.rilpts.length).forEach(v => {
const L = String(v.label).toUpperCase();
if (!per[L] || (rilevata(v) && !rilevata(per[L]))) per[L] = v;
});
return Object.keys(per).map(k => per[k]);
}
const RX = /^\s*([A-Za-z]{1,3}\d*)\s*(?:→|->|–|—|-)\s*([A-Za-z]{1,3}\d*)\b/;
function osservazioni() {
const S = RS.scene, out = [];
(S.misure || []).forEach((m, i) => {
const v = (m.val === '' || m.val == null) ? NaN : Number(m.val);
const k = RX.exec(m.descr || '');
if (!k || !isFinite(v) || /ascissa|ordinata/i.test(m.descr)) return;
out.push({ da: k[1].toUpperCase(), a: k[2].toUpperCase(), d: v, rif: 'M' + (i + 1), registro: true });
});
let q = 0;
S.elements.filter(e => e.type === 'measure').forEach(e => {
q++;
const k = RX.exec(e.note || '');
if (!k || /ascissa|ordinata/i.test(e.note)) return;
const P = RS.elements.resolvePts(e);
const v = (e.valore != null && e.valore !== '') ? Number(e.valore) : Math.hypot(P[1].x - P[0].x, P[1].y - P[0].y);
out.push({ da: k[1].toUpperCase(), a: k[2].toUpperCase(), d: v, rif: 'Q' + q, registro: false });
});
return out;
}
function intersezioni(a, b) {
const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy);
if (L < 1e-6) return [];
if (L > a.d + b.d || L < Math.abs(a.d - b.d)) {
const t = (a.d + (L - a.d - b.d) / 2) / L;
return [{ x: a.x + dx * t, y: a.y + dy * t }];
}
const t = (a.d * a.d - b.d * b.d + L * L) / (2 * L), h = Math.sqrt(Math.max(0, a.d * a.d - t * t));
const mx = a.x + dx * t / L, my = a.y + dy * t / L;
return [{ x: mx - dy * h / L, y: my + dx * h / L }, { x: mx + dy * h / L, y: my - dx * h / L }];
}
function affina(oss, p) {
let x = p.x, y = p.y;
for (let it = 0; it < 50; it++) {
let a11 = 0, a12 = 0, a22 = 0, b1 = 0, b2 = 0;
oss.forEach(o => {
const dx = x - o.x, dy = y - o.y, r = Math.hypot(dx, dy) || 1e-9, jx = dx / r, jy = dy / r, s = r - o.d;
a11 += jx * jx; a12 += jx * jy; a22 += jy * jy; b1 += jx * s; b2 += jy * s;
});
const det = a11 * a22 - a12 * a12;
if (Math.abs(det) < 1e-12) break;
const sx = -(a22 * b1 - a12 * b2) / det, sy = -(a11 * b2 - a12 * b1) / det;
x += sx; y += sy;
if (Math.hypot(sx, sy) < 1e-8) break;
}
const scarti = oss.map(o => Math.hypot(x - o.x, y - o.y) - o.d);
return { x, y, scarti, costo: scarti.reduce((s, r) => s + r * r, 0) };
}
function stima(oss, vicino) {
const partenze = [];
for (let i = 0; i < oss.length; i++) for (let j = i + 1; j < oss.length; j++) intersezioni(oss[i], oss[j]).forEach(p => partenze.push(p));
if (!partenze.length) partenze.push({ x: oss.reduce((s, o) => s + o.x, 0) / oss.length, y: oss.reduce((s, o) => s + o.y, 0) / oss.length });
let best = null;
partenze.forEach(p => {
const r = affina(oss, p);
const dist = vicino ? Math.hypot(r.x - vicino.x, r.y - vicino.y) : 0;
const voto = r.costo + (vicino ? dist * 1e-6 : 0);
if (!best || voto < best.voto - 1e-9) best = Object.assign(r, { voto });
});
return best;
}
function qualitaTriangolo(L, dA, dB, nomi) {
nomi = nomi || ['A', 'B'];
if (!(L > 0) || !(dA > 0) || !(dB > 0)) return null;
const c = Math.max(-1, Math.min(1, (dA * dA + dB * dB - L * L) / (2 * dA * dB)));
const ang = Math.acos(c) * 180 / Math.PI, rA = dA / L, rB = dB / L;
const volte = r => r.toFixed(1).replace('.', ',');
const note = [];
if (L < 2 || L > 10) note.push('la base di ' + m2(L) + ' m è fuori dai 2–10 m consigliati');
let liv, testo;
if (ang < 30 || ang > 150) { liv = 'schiacciato'; testo = 'angolo nel punto ' + Math.round(ang) + '°: un piccolo errore di misura sposta molto il punto'; }
else {
const fuori = [[nomi[0], rA], [nomi[1], rB]].filter(x => x[1] < 0.7 || x[1] > 2);
if (fuori.length) { liv = 'accettabile'; testo = fuori.map(x => 'la distanza da ' + x[0] + ' è ' + volte(x[1]) + ' volte la base').join(', ') + ' (il metodo dice fra 0,7 e 2)'; }
else if (Math.abs(rA - 1) <= 0.15 && Math.abs(rB - 1) <= 0.15) { liv = 'ottimo'; testo = 'quasi equilatero, angolo nel punto ' + Math.round(ang) + '°'; }
else { liv = 'buono'; testo = 'angolo nel punto ' + Math.round(ang) + '° · distanze ' + volte(rA) + ' e ' + volte(rB) + ' volte la base'; }
}
if (note.length && liv !== 'schiacciato') liv = liv === 'ottimo' || liv === 'buono' ? 'accettabile' : liv;
return { liv, ang, testo: testo + (note.length ? '; ' + note.join(', ') : '') };
}
const RANGO = { ottimo: 0, buono: 1, accettabile: 2, schiacciato: 3 };
function basePerPunto(P) {
const caps = RS.scene.elements.filter(e => e.letter);
let best = null;
for (let i = 0; i < caps.length; i++) for (let j = i + 1; j < caps.length; j++) {
const A = caps[i], B = caps[j], L = Math.hypot(B.x - A.x, B.y - A.y);
const q = qualitaTriangolo(L, Math.hypot(P.x - A.x, P.y - A.y), Math.hypot(P.x - B.x, P.y - B.y), [A.letter, B.letter]);
if (!q) continue;
const voto = RANGO[q.liv] * 1000 + Math.abs(q.ang - 90);
if (!best || voto < best.voto) best = { A, B, q, voto };
}
return best;
}
const RXORD = /^\s*([A-Za-z]{1,3}\d*)\s*\(ordinata\)/i;
const valoreQuota = q => (q.valore != null && q.valore !== '') ? Number(q.valore) : (() => { const P = RS.elements.resolvePts(q); return Math.hypot(P[1].x - P[0].x, P[1].y - P[0].y); })();
function versoCapisaldi(cap, base, da, a) {
if (cap[da] && cap[a] && base.indexOf(a) >= 0 && base.indexOf(da) < 0) return [a, da];
return [da, a];
}
function puntiRilevati() {
const S = RS.scene, cap = {}, out = {};
S.elements.forEach(e => { if (e.letter) cap[String(e.letter).toUpperCase()] = e; });
const mb = S.meta && S.meta.base, bA = mb && S.get(mb.aId), bB = mb && S.get(mb.bId);
const base = (bA && bB) ? [String(bA.letter).toUpperCase(), String(bB.letter).toUpperCase()] : [];
const prendi = T => out[T] || (out[T] = { T, dist: [], asc: null, ord: null });
const verso = (da, a) => versoCapisaldi(cap, base, da, a);
S.elements.filter(e => e.type === 'measure').forEach(q => {
const n = q.note || '';
let k = RXORD.exec(n);
if (k) { prendi(k[1].toUpperCase()).ord = { q, v: valoreQuota(q) }; return; }
k = RX.exec(n); if (!k) return;
const [da, a] = verso(k[1].toUpperCase(), k[2].toUpperCase());
if (!cap[da] || (base.indexOf(da) >= 0 && base.indexOf(a) >= 0)) return;
if (/ascissa/i.test(n)) { prendi(a).asc = { q, da, v: q.ril && q.ril.asc != null ? Number(q.ril.asc) : valoreQuota(q) }; return; }
const p = prendi(a);
if (!p.dist.some(x => x.da === da)) p.dist.push({ da, q, v: valoreQuota(q) });
});
(S.misure || []).forEach((m, i) => {
const k = RX.exec(m.descr || '');
if (!k || m.val === '' || m.val == null || /ascissa|ordinata/i.test(m.descr)) return;
const [da, a] = verso(k[1].toUpperCase(), k[2].toUpperCase());
if (!cap[da] || (base.indexOf(da) >= 0 && base.indexOf(a) >= 0)) return;
const p = prendi(a), x = p.dist.find(d => d.da === da), r = { da, riga: i, v: Number(m.val) };
if (x) Object.assign(x, r, { q: x.q }); else p.dist.push(r);
});
const esiti = controllaMisure().esiti;
return Object.keys(out).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).map(T => {
const p = out[T];
p.dist.sort((a, b) => a.da.localeCompare(b.da));
p.metodo = p.ord ? 'ortogonali' : 'distanze';
p.el = cap[T] || S.elements.find(e => e.type === 'surveypt' && 'P' + e.n === T) || null;
p.veicolo = !p.el ? veicoliMisurati().concat(S.elements.filter(e => e.type === 'vehicle')).find(e => e.label && T.indexOf(String(e.label).toUpperCase()) === 0 && /^\d+$/.test(T.slice(String(e.label).length))) || null : null;
const err = esiti.find(x => x.punto === T && x.livello === 'errore');
if (err) p.qualita = { liv: 'errore', testo: err.testo };
else if (p.metodo === 'ortogonali') {
const lunga = ordinataLunga(p);
p.qualita = !p.asc ? { liv: 'incompleto', testo: 'manca l\'ascissa' }
: lunga && !p.dist.length ? { liv: 'accettabile', testo: lunga + ': prendi una distanza di controllo' }
: { liv: p.dist.length ? 'ottimo' : 'buono', testo: p.dist.length ? 'con la distanza di controllo' : '' };
} else if (p.dist.length < 2) p.qualita = { liv: 'incompleto', testo: 'serve almeno un\'altra distanza' };
else {
const a = cap[p.dist[0].da], b = cap[p.dist[1].da];
p.qualita = qualitaTriangolo(Math.hypot(b.x - a.x, b.y - a.y), p.dist[0].v, p.dist[1].v, [p.dist[0].da, p.dist[1].da]) || { liv: 'buono', testo: '' };
if (p.dist.length >= 3) p.qualita = { liv: p.qualita.liv === 'schiacciato' ? 'accettabile' : 'ottimo', testo: p.dist.length + ' distanze che tornano fra loro' };
}
return p;
});
}
function ascissaDi(T) {
const q = RS.scene.elements.find(e => { if (e.type !== 'measure' || !/ascissa/i.test(e.note || '')) return false; const k = RX.exec(e.note); return k && k[2].toUpperCase() === T; });
return q ? { q, da: RX.exec(q.note)[1].toUpperCase(), v: q.ril && q.ril.asc != null ? Number(q.ril.asc) : valoreQuota(q) } : null;
}
function ordinataLunga(p) {
if (!p.ord) return '';
const S = RS.scene, A = S.elements.find(e => e.letter && String(e.letter).toUpperCase() === (p.asc && p.asc.da));
const rB = p.asc && p.asc.q.ril && S.get(p.asc.q.ril.B);
const L = (A && rB) ? Math.hypot(rB.x - A.x, rB.y - A.y) : 0;
const soglia = Math.min(3, L ? L / 2 : 3);
return p.ord.v > soglia + 1e-9 ? 'ordinata di ' + m2(p.ord.v) + ' m, oltre ' + m2(soglia) + ' m' : '';
}
function posizioneDa(p) {
const S = RS.scene, cap = {};
S.elements.forEach(e => { if (e.letter) cap[String(e.letter).toUpperCase()] = e; });
const vicino = p.el ? { x: p.el.x, y: p.el.y } : (p.ord ? RS.elements.resolvePts(p.ord.q)[1] : (p.dist[0] && p.dist[0].q ? RS.elements.resolvePts(p.dist[0].q)[1] : null));
if (p.metodo === 'ortogonali') {
if (!p.asc) return null;
const A = cap[p.asc.da]; if (!A) return null;
const ril = p.asc.q.ril || {}, Bc = ril.B && S.get(ril.B);
let ux, uy;
if (Bc) { const L = Math.hypot(Bc.x - A.x, Bc.y - A.y) || 1; ux = (Bc.x - A.x) / L; uy = (Bc.y - A.y) / L; }
else { const P = RS.elements.resolvePts(p.asc.q), L = Math.hypot(P[1].x - P[0].x, P[1].y - P[0].y) || 1; ux = (P[1].x - P[0].x) / L; uy = (P[1].y - P[0].y) / L; }
const F = { x: A.x + p.asc.v * ux, y: A.y + p.asc.v * uy };
let lato = p.ord.q.ril && p.ord.q.ril.lato;
if (!lato) { const O = RS.elements.resolvePts(p.ord.q); lato = (ux * (O[1].y - O[0].y) - uy * (O[1].x - O[0].x)) >= 0 ? 1 : -1; }
return { F, P: { x: F.x - lato * p.ord.v * uy, y: F.y + lato * p.ord.v * ux }, A };
}
const oss = p.dist.filter(d => cap[d.da]).map(d => ({ x: cap[d.da].x, y: cap[d.da].y, d: d.v }));
if (oss.length < 2) return null;
const s = stima(oss, vicino);
return s ? { P: { x: s.x, y: s.y } } : null;
}
function ricalcolaPunto(T) {
const S = RS.scene, p = puntiRilevati().find(x => x.T === T); if (!p) return false;
const pos = posizioneDa(p); if (!pos) return false;
const P = pos.P, r2 = v => Math.round(v * 100) / 100;
if (p.el) {
p.el.x = r2(P.x); p.el.y = r2(P.y);
const sim = p.el.type === 'surveypt' && p.el.diSimbolo ? S.get(p.el.diSimbolo) : null;
if (sim && !sim.locked) { sim.x = p.el.x; sim.y = p.el.y; }
}
p.dist.forEach(d => { if (d.q && d.q.pts && d.q.pts[1] && d.q.pts[1].aid == null) d.q.pts[1] = { x: P.x, y: P.y }; });
if (pos.F) {
if (p.asc.q.pts) p.asc.q.pts = [{ x: pos.A.x, y: pos.A.y }, { x: pos.F.x, y: pos.F.y }];
if (p.ord.q.pts) p.ord.q.pts = [{ x: pos.F.x, y: pos.F.y }, { x: P.x, y: P.y }];
}
return true;
}
function correggiMisura(T, chiave, v) {
const S = RS.scene, p = puntiRilevati().find(x => x.T === T); if (!p || !isFinite(v)) return false;
if (chiave === 'asc' && p.asc) { p.asc.q.ril = Object.assign({}, p.asc.q.ril, { asc: v }); p.asc.q.valore = Math.abs(v); }
else if (chiave === 'ord' && p.ord) { if (!(v >= 0)) return false; p.ord.q.valore = v; }
else {
const d = p.dist.find(x => x.da === chiave); if (!d || !(v > 0)) return false;
if (d.riga != null && S.misure[d.riga]) S.misure[d.riga].val = v;
if (d.q) d.q.valore = v;
}
ricalcolaPunto(T);
S.render(); S.snapshot();
return true;
}
function eliminaPunto(T) {
const S = RS.scene;
const p = puntiRilevati().find(x => x.T === T) || { dist: [], el: S.elements.find(e => e.type === 'surveypt' && 'P' + e.n === T) || null };
const ids = [p.asc && p.asc.q, p.ord && p.ord.q].concat(p.dist.map(d => d.q)).filter(Boolean).map(q => q.id);
if (p.el && p.el.type === 'surveypt') ids.push(p.el.id);
const vuote = (S.misure || []).map((m, i) => { const k = RX.exec(m.descr || ''); return k && k[2].toUpperCase() === T && (m.val === '' || m.val == null) && !/\(base\)/i.test(m.descr) ? i : -1; }).filter(i => i >= 0);
const righe = p.dist.filter(d => d.riga != null).map(d => d.riga).concat(vuote).sort((a, b) => b - a);
righe.forEach(i => S.misure.splice(i, 1));
if (ids.length) S.remove(ids); else { S.render(); S.snapshot(); }
}
function schedaRilievo() {
const S = RS.scene, cap = {}, mis = S.misure || [];
S.elements.forEach(e => { if (e.letter) cap[String(e.letter).toUpperCase()] = e; });
const mb = (S.meta && S.meta.base) || {}, bA = S.get(mb.aId), bB = S.get(mb.bId);
const base = bA && bB && bA !== bB ? [String(bA.letter).toUpperCase(), String(bB.letter).toUpperCase()] : [];
const P = {}; puntiRilevati().forEach(p => { P[p.T] = p; });
const righe = new Set(), quote = new Set();
if (base.length) mis.forEach((m, i) => {
const k = /^\s*([A-Za-z]{1,3})\s*(?:→|->)\s*([A-Za-z]{1,3})\s*\(base\)/i.exec(m.descr || '');
if (k && [k[1].toUpperCase(), k[2].toUpperCase()].sort().join() === base.slice().sort().join()) righe.add(i);
});
const vuote = {};
mis.forEach((m, i) => {
const k = RX.exec(m.descr || '');
if (!k || !(m.val === '' || m.val == null) || /ascissa|ordinata/i.test(m.descr)) return;
const [da, a] = versoCapisaldi(cap, base, k[1].toUpperCase(), k[2].toUpperCase());
if (!cap[da] || (base.indexOf(da) >= 0 && base.indexOf(a) >= 0)) return;
(vuote[a] = vuote[a] || []).push({ da, riga: i });
});
const voce = (T, extra) => {
const p = P[T] || { T, dist: [], asc: null, ord: null, metodo: 'distanze', qualita: null };
delete P[T];
p.vuote = (vuote[T] || []).filter(v => !p.dist.some(d => d.da === v.da));
delete vuote[T];
const prese = p.dist.map(d => d.da).concat(p.vuote.map(v => v.da));
p.mancanti = [];
if (p.metodo === 'ortogonali') {
if (p.qualita && p.qualita.liv === 'accettabile' && !prese.length) {
const altro = base.find(L => L !== (p.asc && p.asc.da)) || base[0];
if (altro && altro !== T) p.mancanti.push(altro);
}
} else base.forEach(L => { if (L !== T && prese.length + p.mancanti.length < 2 && prese.indexOf(L) < 0) p.mancanti.push(L); });
p.dist.forEach(d => { if (d.riga != null) righe.add(d.riga); if (d.q) quote.add(d.q.id); });
p.vuote.forEach(v => righe.add(v.riga));
if (p.asc) quote.add(p.asc.q.id);
if (p.ord) quote.add(p.ord.q.id);
if (!p.qualita) p.qualita = { liv: 'da misurare', testo: '' };
else if (p.qualita.liv === 'incompleto' && (p.vuote.length || p.mancanti.length)) p.qualita = { liv: 'da misurare', testo: p.qualita.testo };
return Object.assign(p, extra);
};
const gruppi = [];
veicoliMisurati().sort((a, b) => String(a.label).localeCompare(String(b.label))).forEach(v => {
const L = String(v.label).toUpperCase();
gruppi.push({ tipo: 'veicolo', titolo: 'Veicolo ' + v.label + (v.fase === 'quiete' ? ' (quiete)' : ''), el: v,
punti: v.rilpts.slice().sort((a, b) => a.n - b.n).map(r => voce(L + r.n, { veicolo: v, nome: 'spigolo ' + r.n })) });
});
const pp = S.elements.filter(e => e.type === 'surveypt' && e.n != null).sort((a, b) => a.n - b.n);
if (pp.length) gruppi.push({ tipo: 'punti', titolo: 'Punti', punti: pp.map(e => voce('P' + e.n, { el: e, nome: e.descr || '' })) });
const altriCap = Object.keys(cap).filter(L => base.indexOf(L) < 0).sort();
if (base.length && altriCap.length) gruppi.push({ tipo: 'capisaldi', titolo: 'Capisaldi aggiunti', punti: altriCap.map(L => voce(L, { el: cap[L], nome: cap[L].descr || 'caposaldo' })) });
const resto = Object.keys(P).concat(Object.keys(vuote).filter(T => !P[T])).filter((T, i, a) => a.indexOf(T) === i)
.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
if (resto.length) gruppi.push({ tipo: 'altri', titolo: 'Senza un punto sul disegno', punti: resto.map(T => voce(T, { nome: '' })) });
const tutti = [].concat.apply([], gruppi.map(g => g.punti));
const daPrendere = [];
tutti.forEach(p => { p.vuote.forEach(v => daPrendere.push({ T: p.T, da: v.da, riga: v.riga })); p.mancanti.forEach(L => daPrendere.push({ T: p.T, da: L })); });
return { base, gruppi, daPrendere, usate: { righe, quote } };
}
function descriviCambio(x) {
return x.tipo === 'veicolo'
? `${x.nome}: spostato di ${m2(x.sp)} m e ruotato di ${Number(x.dRot).toFixed(1).replace('.', ',')}° (${x.punti === 1 ? '1 punto misurato: solo spostato, l\'orientamento resta quello disegnato' : x.punti + ' punti misurati, scarto medio ' + cm(x.scarto)})` +
(x.punti > 1 && x.scarto > 0.15 ? ' — ⚠ i punti misurati non si adattano bene alla sagoma: controlla lunghezza, larghezza e numerazione dei punti' : '')
: `${x.nome}: spostato di ${m2(x.sp)} m`;
}
function controllaMisure() {
const { cap, tgt } = punti(), oss = osservazioni(), esiti = [];
const nome = o => o.da + '→' + o.a;
const conRif = o => nome(o) + ' (' + o.rif + ')';
const coppie = {};
oss.forEach(o => { const k = [o.da, o.a].sort().join('|'); (coppie[k] = coppie[k] || []).push(o); });
Object.keys(coppie).forEach(k => {
const g = coppie[k]; if (g.length < 2) return;
const min = Math.min.apply(null, g.map(o => o.d)), max = Math.max.apply(null, g.map(o => o.d));
if (max - min > tolMisura(max)) esiti.push({ livello: 'errore', punto: g[0].a, ripeti: { da: g[0].da, a: g[0].a, rif: (g.find(o => o.registro) || g[0]).rif },
testo: `La misura ${nome(g[0])} è registrata con valori diversi: ${g.map(o => o.rif + ' = ' + m2(o.d) + ' m').join(', ')}. Ripetila e correggi il valore sbagliato.` });
});
const perPunto = {};
Object.keys(coppie).forEach(k => {
const g = coppie[k].slice().sort((a, b) => (b.registro - a.registro));
let o = g[0];
if (!cap[o.da] && cap[o.a]) o = Object.assign({}, o, { da: o.a, a: o.da });
if (!cap[o.da]) return;
(perPunto[o.a] = perPunto[o.a] || []).push(Object.assign({}, o, { x: cap[o.da].x, y: cap[o.da].y }));
});
const ortog = {};
RS.scene.elements.filter(e => e.type === 'measure').forEach(q => {
const k = RXORD.exec(q.note || ''); if (!k) return;
const T = k[1].toUpperCase(); ortog[T] = RS.elements.resolvePts(q)[1];
if (!perPunto[T]) {
const lunga = ordinataLunga({ ord: { v: valoreQuota(q) }, asc: ascissaDi(T) });
if (lunga) esiti.push({ livello: 'avviso', punto: T, testo: `Punto ${T}: ${lunga}. Un piccolo errore nell'angolo retto sposta molto il punto: prendi una distanza di controllo da un caposaldo, oppure triangolalo.` });
}
});
let sovrabbondanti = 0, controllati = 0;
Object.keys(perPunto).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).forEach(T => {
const g = perPunto[T], disegnato = tgt[T] || cap[T] || null;
controllati++;
if (g.length >= 3 && !cap[T]) {
sovrabbondanti++;
const tutte = stima(g, disegnato);
const fuori = g.filter((o, i) => Math.abs(tutte.scarti[i]) > tolMisura(o.d));
if (fuori.length) {
const peggio = Math.max.apply(null, tutte.scarti.map(Math.abs));
const prove = g.map((o, i) => {
const altre = g.filter((x, j) => j !== i), s = stima(altre, disegnato);
const altreOk = s.scarti.every((r, j) => Math.abs(r) <= tolMisura(altre[j].d));
return { o, altreOk, scarto: Math.hypot(s.x - o.x, s.y - o.y) - o.d,
lontano: disegnato ? Math.hypot(s.x - disegnato.x, s.y - disegnato.y) : 0 };
});
if (g.length >= 4) {
const ok = prove.filter(p => p.altreOk).sort((a, b) => Math.abs(b.scarto) - Math.abs(a.scarto));
if (ok.length === 1 || (ok.length && Math.abs(ok[0].scarto) > 2 * Math.abs((ok[1] || { scarto: 0 }).scarto))) {
const p = ok[0];
esiti.push({ livello: 'errore', punto: T, ripeti: { da: p.o.da, a: T, rif: p.o.rif }, testo: `Punto ${T}: la misura ${conRif(p.o)} non torna con le altre ${g.length - 1} ` +
`(scarto ${cm(p.scarto)}): senza di lei il punto quadra. Ripeti questa misura; con le altre risulterebbe ${m2(p.o.d + p.scarto)} m.` });
} else esiti.push({ livello: 'errore', punto: T, testo: `Punto ${T}: le ${g.length} distanze non individuano lo stesso punto (scarto fino a ${cm(peggio)}) e più di una sembra errata. Ripeti le misure di ${T}.` });
} else {
const ord = prove.slice().sort((a, b) => disegnato ? a.lontano - b.lontano : Math.abs(b.scarto) - Math.abs(a.scarto));
const p = ord[0];
esiti.push({ livello: 'errore', punto: T, ripeti: { da: p.o.da, a: T, rif: p.o.rif }, testo: `Punto ${T}: le tre distanze non tornano (scarto fino a ${cm(peggio)}), quindi una è sbagliata. ` +
`La più probabile è ${conRif(p.o)}: con le altre due risulterebbe ${m2(p.o.d + p.scarto)} m. Ripetila; per esserne certi prendi anche una quarta distanza.` });
}
}
}
if (g.length === 2 && !cap[T] && !ortog[T]) {
const [a, b] = g, base = Math.hypot(b.x - a.x, b.y - a.y);
const q = base > 0.01 ? qualitaTriangolo(base, a.d, b.d, [a.da, b.da]) : null;
if (q && q.liv === 'schiacciato') esiti.push({ livello: 'avviso', punto: T,
testo: `Punto ${T}: il triangolo con la base ${a.da}–${b.da} è troppo schiacciato (${q.testo}). Meglio misurarlo da un'altra base o aggiungere una terza distanza.` });
else if (q && q.liv === 'accettabile') esiti.push({ livello: 'info', punto: T,
testo: `Punto ${T}, base ${a.da}–${b.da}: ${q.testo}.` });
}
if (ortog[T]) g.forEach(o => {
const P = ortog[T], atteso = Math.hypot(P.x - o.x, P.y - o.y);
if (Math.abs(atteso - o.d) > tolMisura(o.d)) esiti.push({ livello: 'errore', punto: T,
testo: `Punto ${T}: la distanza di controllo ${conRif(o)} di ${m2(o.d)} m non torna con ascissa e ordinata, che danno ${m2(atteso)} m (scarto ${cm(o.d - atteso)}). Ripeti le misure di ${T}.` });
});
if (disegnato) g.filter(o => o.registro).forEach(o => {
const sulDisegno = Math.hypot(disegnato.x - o.x, disegnato.y - o.y);
if (Math.abs(sulDisegno - o.d) > tolDisegno(o.d)) esiti.push({ livello: 'info', punto: T,
testo: `${nome(o)}: misurata ${m2(o.d)} m (${o.rif}), sul disegno ${m2(sulDisegno)} m. Il disegno va avvicinato alla misura: lo fa «Allinea il disegno» nel Rilievo dei punti.` });
});
});
const ordine = { errore: 0, avviso: 1, info: 2 };
esiti.sort((a, b) => ordine[a.livello] - ordine[b.livello] || String(a.punto).localeCompare(String(b.punto), undefined, { numeric: true }));
return { esiti, controllati, sovrabbondanti, misure: oss.length };
}
function distanzePerPunto(oss, cap) {
const coppie = {}, per = {};
oss.forEach(o => { const k = [o.da, o.a].sort().join('|'); (coppie[k] = coppie[k] || []).push(o); });
Object.keys(coppie).forEach(k => {
let o = coppie[k].slice().sort((a, b) => (b.registro - a.registro))[0];
if (!cap[o.da] && cap[o.a]) o = Object.assign({}, o, { da: o.a, a: o.da });
if (!cap[o.da]) return;
(per[o.a] = per[o.a] || []).push(o);
});
return per;
}
function pianoAllineamento() {
const S = RS.scene, { cap, tgt } = punti(), oss = osservazioni(), per = distanzePerPunto(oss, cap);
const cambi = [], scartati = [];
const b = (S.meta && S.meta.base) || {}, A = S.get(b.aId), B = S.get(b.bId);
const noti = {};
if (A && B && A !== B) {
const LA = String(A.letter).toUpperCase(), LB = String(B.letter).toUpperCase();
noti[LA] = cap[LA]; noti[LB] = cap[LB];
const v = baseMisurataFra(LA, LB), L = Math.hypot(B.x - A.x, B.y - A.y);
if (v && L > 0.001 && Math.abs(v - L) > 0.01) {
noti[LB] = { x: A.x + (B.x - A.x) / L * v, y: A.y + (B.y - A.y) / L * v };
cambi.push({ tipo: 'caposaldo', nome: 'Caposaldo ' + B.letter + ' (base ' + A.letter + '–' + B.letter + ' misurata ' + m2(v) + ' m, sul disegno ' + m2(L) + ' m)',
sp: Math.abs(v - L), el: B, nuovo: noti[LB] });
}
}
else Object.keys(cap).forEach(k => { noti[k] = cap[k]; });
const posizione = (T, disegnato) => {
const g = (per[T] || []).filter(o => noti[o.da]).map(o => Object.assign({}, o, { x: noti[o.da].x, y: noti[o.da].y }));
if (g.length < 2) return null;
const s = stima(g, disegnato);
if (s.scarti.some((r, i) => Math.abs(r) > tolMisura(g[i].d))) return { incoerente: true };
return { x: s.x, y: s.y, n: g.length };
};
for (let giro = 0; giro < 5; giro++) {
let nuovi = 0;
Object.keys(cap).filter(k => !noti[k]).forEach(k => {
const p = posizione(k, cap[k]);
if (!p) return;
if (p.incoerente) { if (scartati.indexOf(k) < 0) scartati.push(k); return; }
noti[k] = { x: p.x, y: p.y }; nuovi++;
const e = S.elements.find(x => x.letter && String(x.letter).toUpperCase() === k);
const sp = Math.hypot(p.x - e.x, p.y - e.y);
if (sp > 0.01) cambi.push({ tipo: 'caposaldo', nome: 'Caposaldo ' + k, sp, el: e, nuovo: { x: p.x, y: p.y } });
});
if (!nuovi) break;
}
const ortog = new Set();
S.elements.filter(e => e.type === 'measure').forEach(q => {
const k = RXORD.exec(q.note || ''); if (!k) return;
const T = k[1].toUpperCase(), asc = ascissaDi(T); if (!asc) return;
const Ae = S.elements.find(x => x.letter && String(x.letter).toUpperCase() === asc.da);
const Be = asc.q.ril && S.get(asc.q.ril.B);
if (!Ae || !Be) return;
const pA = noti[asc.da] || Ae, Lb = String(Be.letter).toUpperCase(), pB = noti[Lb] || Be;
const L = Math.hypot(pB.x - pA.x, pB.y - pA.y); if (L < 0.001) return;
const ux = (pB.x - pA.x) / L, uy = (pB.y - pA.y) / L, lato = (q.ril && q.ril.lato) || 1, o = valoreQuota(q);
const P = { x: pA.x + asc.v * ux - lato * o * uy, y: pA.y + asc.v * uy + lato * o * ux };
ortog.add(T);
const e = S.elements.find(x => (x.letter && String(x.letter).toUpperCase() === T) || (x.type === 'surveypt' && 'P' + x.n === T));
if (!e) return;
const sp = Math.hypot(P.x - e.x, P.y - e.y);
if (sp > 0.01) cambi.push({ tipo: 'ortogonale', T, nome: (e.letter ? 'Caposaldo ' : 'Punto ') + T, sp, el: e, nuovo: P });
});
S.elements.filter(e => e.type === 'surveypt' && e.n != null && !ortog.has('P' + e.n)).forEach(e => {
const T = 'P' + e.n, p = posizione(T, { x: e.x, y: e.y });
if (!p) return;
if (p.incoerente) { scartati.push(T); return; }
const sp = Math.hypot(p.x - e.x, p.y - e.y);
if (sp > 0.01) cambi.push({ tipo: 'punto', nome: 'Punto ' + T, sp, el: e, nuovo: { x: p.x, y: p.y } });
});
veicoliMisurati().forEach(v => {
const L = String(v.label).toUpperCase(), coppie = [];
v.rilpts.forEach(p => {
const T = L + p.n, q = posizione(T, tgt[T]);
if (!q) return;
if (q.incoerente) { scartati.push(T); return; }
const pl = RS.elements.locale ? RS.elements.locale(v, p.lx, p.ly) : p;
coppie.push({ l: { x: pl.lx, y: pl.ly }, w: q });
});
if (!coppie.length) return;
let rot = (v.rot || 0) * Math.PI / 180, x, y;
if (coppie.length === 1) {
const c = coppie[0], cs = Math.cos(rot), sn = Math.sin(rot);
x = c.w.x - (c.l.x * cs - c.l.y * sn); y = c.w.y - (c.l.x * sn + c.l.y * cs);
} else {
const n = coppie.length, lc = { x: 0, y: 0 }, wc = { x: 0, y: 0 };
coppie.forEach(c => { lc.x += c.l.x / n; lc.y += c.l.y / n; wc.x += c.w.x / n; wc.y += c.w.y / n; });
let sx = 0, sy = 0;
coppie.forEach(c => {
const px = c.l.x - lc.x, py = c.l.y - lc.y, qx = c.w.x - wc.x, qy = c.w.y - wc.y;
sx += px * qx + py * qy; sy += px * qy - py * qx;
});
rot = Math.atan2(sy, sx);
const cs = Math.cos(rot), sn = Math.sin(rot);
x = wc.x - (lc.x * cs - lc.y * sn); y = wc.y - (lc.x * sn + lc.y * cs);
}
const cs = Math.cos(rot), sn = Math.sin(rot);
const scarto = Math.sqrt(coppie.reduce((s, c) => {
const wx = x + c.l.x * cs - c.l.y * sn, wy = y + c.l.x * sn + c.l.y * cs;
return s + (wx - c.w.x) ** 2 + (wy - c.w.y) ** 2;
}, 0) / coppie.length);
let gradi = rot * 180 / Math.PI; gradi = ((gradi % 360) + 360) % 360;
const dRot = ((gradi - (v.rot || 0) + 540) % 360) - 180, sp = Math.hypot(x - v.x, y - v.y);
if (sp > 0.01 || Math.abs(dRot) > 0.2)
cambi.push({ tipo: 'veicolo', nome: 'Veicolo ' + v.label, sp, dRot, punti: coppie.length, scarto, el: v, nuovo: { x, y, rot: gradi } });
});
return { cambi, scartati, ortog: Array.from(ortog) };
}
function baseMisurataFra(LA, LB) {
const r = (RS.scene.misure || []).find(m => {
const k = /^\s*([A-Za-z]{1,3})\s*(?:→|->)\s*([A-Za-z]{1,3})\s*\(base\)/i.exec(m.descr || '');
if (!k || m.val === '' || m.val == null) return false;
const a = k[1].toUpperCase(), b = k[2].toUpperCase();
return (a === LA && b === LB) || (a === LB && b === LA);
});
return r && Number(r.val) > 0 ? Number(r.val) : 0;
}
function applicaAllineamento(piano) {
const S = RS.scene;
const seguiQuote = (vecchio, nuovo) => S.elements.filter(e => e.type === 'measure' && e.pts).forEach(q => q.pts.forEach(p => {
if (p.aid == null && Math.hypot(p.x - vecchio.x, p.y - vecchio.y) < 0.02) { p.x = nuovo.x; p.y = nuovo.y; }
}));
piano.cambi.forEach(c => {
const e = c.el, prima = { x: e.x, y: e.y };
e.x = Math.round(c.nuovo.x * 1000) / 1000; e.y = Math.round(c.nuovo.y * 1000) / 1000;
if (c.nuovo.rot != null) e.rot = Math.round(c.nuovo.rot * 10) / 10;
if (c.tipo !== 'veicolo') seguiQuote(prima, e);
});
if (piano.cambi.length) (piano.ortog || []).forEach(T => ricalcolaPunto(T));
S.render(); S.snapshot(); S.emit('change');
}
function voci() {
const S = RS.scene, els = S.elements, m = S.meta || {}, mis = S.misure || [];
const veicoli = els.filter(e => e.type === 'vehicle' && !e.fase || e.type === 'vehicle' && e.fase === 'quiete');
const caps = els.filter(e => e.letter);
const conValore = mis.filter(x => x.val !== '' && x.val != null);
const testo = (m.note || '').toLowerCase();
const base = (() => {
const b = m.base || {}, A = S.get(b.aId), B = S.get(b.bId);
return A && B && A !== B ? Math.hypot(B.x - A.x, B.y - A.y) : null;
})();
const ctrl = controllaMisure();
const { tgt } = punti(), oss = osservazioni(), quante = {};
oss.forEach(o => { quante[o.a] = (quante[o.a] || 0) + 1; quante[o.da] = (quante[o.da] || 0) + 1; });
S.elements.filter(e => e.type === 'measure').map(e => e.note).concat(conValore.map(x => x.descr))
.forEach(t => { const k = /^\s*([A-Za-z]{1,3}\d*)\s*\(ordinata\)/i.exec(t || ''); if (k) quante[k[1].toUpperCase()] = (quante[k[1].toUpperCase()] || 0) + 2; });
const scoperti = Object.keys(tgt).filter(k => (quante[k] || 0) < 2);
const na = 'na';
const st = c => c ? 'ok' : 'manca';
return [
{ sez: 'Intestazione', k: 'luogo', t: 'Luogo, data e ora del sinistro', s: st(m.localita && m.data), h: 'Dati e misure → Intestazione' },
{ sez: 'Intestazione', k: 'operatore', t: 'Operatore che esegue il rilievo', s: st(m.operatore), h: 'Dati e misure → Intestazione' },
{ sez: 'Intestazione', k: 'meteo', t: 'Condizioni meteo e del fondo', s: st(m.condizioni), h: 'Dati e misure → Intestazione' },
{ sez: 'Intestazione', k: 'gps', t: 'Coordinate del luogo', s: st(m.coordinate), h: 'Dati e misure → Intestazione → Rileva con il GPS' },
{ sez: 'Capisaldi e base', k: 'capisaldi', t: 'Almeno due capisaldi fissi e riconoscibili', s: st(caps.length >= 2), h: 'Tavolozza → Misure e note → Caposaldo' },
{ sez: 'Capisaldi e base', k: 'base', t: 'Base fra 2 e 10 m, misurata sul posto', s: base == null ? 'manca' : st(base >= 2 && base <= 10 && mis.some(x => /\(base\)/.test(x.descr || '') && x.val !== '' && x.val != null)),
h: base == null ? 'Scegli la base in Rilievo dei punti' :'Base sul disegno ' + m2(base) + ' m: scrivi quella misurata in cima al pannello Triangola' },
{ sez: 'Capisaldi e base', k: 'capidescr', t: 'Capisaldi descritti (spigolo, palo, civico…) nella legenda o nelle note', s: 'mano' },
{ sez: 'Sede stradale', k: 'strada', t: 'Sede stradale disegnata', s: st(els.some(e => e.type === 'road' || e.type === 'roadway' || e.type === 'curva' || e.type === 'roundabout')), h: 'Tavolozza → Strade' },
{ sez: 'Sede stradale', k: 'larghezze', t: 'Larghezze di carreggiata, corsie, marciapiedi e banchine', s: st(mis.some(x => /largh/i.test(x.descr || '') && x.val !== '' && x.val != null) || els.some(e => e.type === 'measure' && /largh/i.test(e.note || ''))),
h: 'Registra una misura con «larghezza» nella descrizione' },
{ sez: 'Sede stradale', k: 'segnaletica', t: 'Segnaletica orizzontale e verticale presente sul posto', s: 'mano' },
{ sez: 'Veicoli e tracce', k: 'lettere', t: 'Ogni veicolo ha la sua lettera', s: veicoli.length ? st(veicoli.every(v => v.label)) : na },
{ sez: 'Veicoli e tracce', k: 'puntiv', t: 'Punti di massimo ingombro numerati su ogni veicolo', s: veicoli.length ? st(veicoli.every(v => v.rilpts && v.rilpts.length)) : na, h: 'Proprietà del veicolo → Numera punti rilievo' },
{ sez: 'Veicoli e tracce', k: 'duemisure', t: 'Ogni punto rilevato ha almeno due misure', s: Object.keys(tgt).length ? st(!scoperti.length) : na,
h: scoperti.length ? 'Senza due misure: ' + scoperti.slice(0, 8).join(', ') + (scoperti.length > 8 ? '…' : '') + ' — Rilievo dei punti' : '' },
{ sez: 'Veicoli e tracce', k: 'urto', t: 'Punto d\'urto, con gli elementi da cui è stato individuato', s: st(els.some(e => e.type === 'symbol' && e.sym === 'impact')), h: 'Tavolozza → Sinistro → Punto d\'urto' },
{ sez: 'Veicoli e tracce', k: 'tracce', t: 'Tracce di frenata e scarrocciamento (inizio, fine, prima e dopo l\'urto) o loro assenza', s: els.some(e => e.type === 'skid') ? 'ok' : 'mano' },
{ sez: 'Veicoli e tracce', k: 'detriti', t: 'Detriti, liquidi e oggetti dispersi', s: 'mano' },
{ sez: 'Misure', k: 'registro', t: 'Nessuna misura del registro senza valore', s: mis.length ? st(conValore.length === mis.length) : na,
h: mis.length && conValore.length < mis.length ? (mis.length - conValore.length) + (mis.length - conValore.length === 1 ? ' misura ancora senza valore' : ' misure ancora senza valore') + ' — Rilievo dei punti o Altre misure' : '' },
{ sez: 'Misure', k: 'coerenza', t: 'Misure coerenti fra loro', s: ctrl.controllati ? st(!ctrl.esiti.some(x => x.livello === 'errore')) : na, h: 'Le misure che non tornano sono segnate in Rilievo dei punti' },
{ sez: 'Disegno e documenti', k: 'nord', t: 'Orientamento (freccia Nord)', s: st(els.some(e => e.type === 'north') || S.printOptions().nord !== false) },
{ sez: 'Disegno e documenti', k: 'legenda', t: 'Legenda sul disegno (obbligatoria)', s: st(els.some(e => e.type === 'legend')), h: 'Dati e misure → Altre misure → Legenda' },
{ sez: 'Disegno e documenti', k: 'metodo', t: 'Metodo di rilievo annotato (triangolazione o perpendicolari)', s: /triangol|perpendicol|ortogonal/.test(testo) ? 'ok' : 'mano', h: 'Scrivilo nelle Note dell\'intestazione' },
{ sez: 'Disegno e documenti', k: 'soccorsi', t: 'Annotato se il rilievo è prima o dopo i soccorsi', s: /soccors|118|ambulanz/.test(testo) ? 'ok' : 'mano', h: 'Scrivilo nelle Note dell\'intestazione' },
{ sez: 'Disegno e documenti', k: 'foto', t: 'Fotografie scattate (d\'insieme e di dettaglio)', s: st(RS.fascicolo && RS.fascicolo.model && (RS.fascicolo.model.photos || []).length) },
{ sez: 'Disegno e documenti', k: 'gesso', t: 'Demarcazioni a gesso e numeri visibili prima delle foto', s: 'mano' },
{ sez: 'Disegno e documenti', k: 'chiuso', t: 'Rilievo chiuso a lavoro finito (le stampe perdono la filigrana BOZZA)', s: st(m.chiusura), h: 'Pulsante «Chiudi il rilievo» in cima a questa scheda' }
];
}
const SESSIONE = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const basi = new WeakMap(), permessi = new WeakMap();
const operatore = () => (RS.storage && RS.storage.operatore && RS.storage.operatore()) || 'operatore non indicato';
const quando = iso => { const d = new Date(iso); return d.toLocaleDateString('it-IT') + ' alle ' + d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }); };
function impronta(o) {
const s = JSON.stringify(o, (k, v) => (k && k.charAt(0) === '_') ? undefined : v) || '';
let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
return (h >>> 0).toString(36) + s.length.toString(36);
}
const NOMI_TIPO = { road: 'strada', roadway: 'carreggiata', roundabout: 'rotatoria', crosswalk: 'attraversamento', band: 'bordo stradale',
building: 'edificio', area: 'area', island: 'isola', mark: 'segnaletica', skid: 'traccia', path: 'percorso', measure: 'quota',
angle: 'angolo', arrow: 'freccia', text: 'testo', legend: 'legenda', measuretable: 'tabella misure', north: 'freccia Nord', incrocio: 'incrocio', curva: 'curva', svasatura: 'corsia di svolta',
graphscale: 'scala grafica', image: 'sfondo', foto: 'segnaposto foto', sketch: 'schizzo', parking: 'parcheggio', ramp: 'corsia' };
function nomeEl(e) {
if (e.type === 'vehicle') return 'veicolo ' + ((RS.elements.siglaFase && RS.elements.siglaFase(e)) || e.label || '');
if (e.letter) return 'caposaldo ' + e.letter;
if (e.type === 'surveypt') return 'punto P' + e.n;
if (e.type === 'measure') return 'quota' + (e.note ? ' ' + e.note : '');
if (e.type === 'symbol') return (e.nome || e.sym || 'simbolo').toLowerCase() + (e.label ? ' ' + e.label : '');
if (e.type === 'text') return 'testo «' + String(e.text || '').slice(0, 20) + '»';
return NOMI_TIPO[e.type] || e.type;
}
function statoAttuale() {
const S = RS.scene, el = {};
S.elements.filter(e => !e.inc).forEach(e => { const c = Object.assign({}, e); delete c.z; el[e.id] = { h: impronta(c), n: nomeEl(e) }; });
return { el, mis: (S.misure || []).map(m => [m.descr || '', m.val === '' || m.val == null ? '' : String(m.val)]), calc: impronta(S.calcoli || null) };
}
function elenco(nomi) { return nomi.slice(0, 6).join(', ') + (nomi.length > 6 ? ' e altri ' + (nomi.length - 6) : ''); }
function differenze(a, b) {
const parti = [], agg = [], tol = [], mod = [];
Object.keys(b.el).forEach(id => { if (!a.el[id]) agg.push(b.el[id].n); else if (a.el[id].h !== b.el[id].h) mod.push(b.el[id].n); });
Object.keys(a.el).forEach(id => { if (!b.el[id]) tol.push(a.el[id].n); });
if (agg.length) parti.push('aggiunti: ' + elenco(agg));
if (tol.length) parti.push('tolti: ' + elenco(tol));
if (mod.length) parti.push('modificati: ' + elenco(mod));
const mis = [];
const n = Math.max(a.mis.length, b.mis.length);
for (let i = 0; i < n; i++) {
const x = a.mis[i], y = b.mis[i], rif = 'M' + (i + 1);
if (!x) mis.push(rif + ' aggiunta'); else if (!y) mis.push(rif + ' tolta');
else if (x[0] !== y[0] || x[1] !== y[1]) mis.push(rif + (x[1] !== y[1] ? ' (' + (x[1] ? m2(x[1]) : '—') + ' → ' + (y[1] ? m2(y[1]) : '—') + ' m)' : ' (descrizione)'));
}
if (mis.length) parti.push('misure del registro: ' + elenco(mis));
if (a.calc !== b.calc) parti.push('calcoli di ricostruzione modificati');
return parti.join('; ');
}
function registra() {
const S = RS.scene, m = S.meta;
if (!m || !m.chiusura) return;
if (!basi.has(m)) { basi.set(m, statoAttuale()); return; }
const cosa = differenze(basi.get(m), statoAttuale());
m.registro = m.registro || [];
let r = m.registro.find(x => x.tipo === 'modifica' && x.sessione === SESSIONE && x.dopo === m.chiusura.il);
if (!cosa) { if (r) m.registro.splice(m.registro.indexOf(r), 1); return; }
if (!r) { r = { tipo: 'modifica', sessione: SESSIONE, dopo: m.chiusura.il }; m.registro.push(r); }
r.il = new Date().toISOString(); r.da = operatore(); r.cosa = cosa;
}
function dopoModifica() {
const S = RS.scene, m = S.meta;
if (!m || !m.chiusura || permessi.get(m) || !RS.ui || !RS.ui.scelta) return;
permessi.set(m, 'chiedo');
RS.ui.scelta({
titolo: 'Rilievo chiuso',
testo: 'Questo rilievo è stato chiuso il ' + quando(m.chiusura.il) + ' da ' + m.chiusura.da + '. Puoi modificarlo, ma la modifica resterà scritta nel registro della tavola con data e autore.',
opzioni: [{ k: 'si', t: 'Modifica e registra', d: 'La modifica compare negli atti come successiva alla chiusura', primario: true }]
}).then(k => {
if (k === 'si') { permessi.set(m, true); return; }
permessi.delete(m);
S.undo();
if (RS.ui) RS.ui.toast('Modifica annullata: il rilievo resta com\'era alla chiusura');
});
}
function aggancia() {
const S = RS.scene; if (!S || S._agganciataChiusura) return;
S._agganciataChiusura = true;
const orig = S.snapshot;
S.snapshot = function (iniziale) { const r = orig.apply(this, arguments); if (!iniziale) dopoModifica(); return r; };
let t = null;
S.on('change', () => { clearTimeout(t); t = setTimeout(registra, 300); });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', aggancia); else setTimeout(aggancia, 0);
function statoPerAtti() {
const m = RS.scene.meta || {};
if (!m.chiusura) return '';
const storia = (m.registro || []).filter(x => x.tipo === 'chiusura' || (x.tipo === 'modifica' && x.cosa))
.slice().sort((a, b) => String(a.il).localeCompare(String(b.il)));
const dopoUltima = storia.filter(x => x.tipo === 'modifica' && x.dopo === m.chiusura.il).length;
return `<div style="margin-top:14px;font-size:11.5px;border:1px solid #999;padding:6px 9px">
        <b>Rilievo chiuso</b> il ${escH(quando(m.chiusura.il))} da ${escH(m.chiusura.da)}${dopoUltima ? '' : '; nessuna modifica successiva'}.
        ${storia.length > 1 || dopoUltima ? `<br><b>Registro:</b>${storia.map(x => `<br>· ${escH(quando(x.il))}, ${escH(x.da)} — ${x.tipo === 'chiusura' ? 'chiusura del rilievo' : 'modifica: ' + escH(x.cosa)}`).join('')}` : ''}
      </div>`;
}
const verifica = {
controllaMisure, voci, stima, pianoAllineamento, applicaAllineamento, statoPerAtti,
qualitaTriangolo, basePerPunto, veicoliMisurati, puntiRilevati, ricalcolaPunto, correggiMisura, eliminaPunto, ordinataLunga,
schedaRilievo, descriviCambio,
chiuso() { return !!(RS.scene.meta && RS.scene.meta.chiusura); },
chiudi(box) {
const S = RS.scene, c = controllaMisure(), V = voci();
const errori = c.esiti.filter(x => x.livello === 'errore').length, mancano = V.filter(v => v.s === 'manca').length;
const fai = () => {
const m = S.meta, il = new Date().toISOString(), da = operatore();
m.chiusura = { il, da };
m.registro = m.registro || [];
m.registro.push({ tipo: 'chiusura', il, da });
basi.set(m, statoAttuale()); permessi.delete(m);
S.emit('change');
if (RS.ui) RS.ui.toast('Rilievo chiuso: le stampe non portano più la filigrana BOZZA. Ricorda di salvare.');
if (box) this.render(box);
};
if (!errori && !mancano) { fai(); return; }
RS.ui.scelta({
titolo: 'Chiudere il rilievo?',
testo: (errori ? errori + (errori === 1 ? ' problema nelle misure' : ' problemi nelle misure') : '') + (errori && mancano ? ' e ' : '') +
(mancano ? mancano + (mancano === 1 ? ' voce mancante' : ' voci mancanti') + ' nella lista di controllo' : '') + '. Conviene risolverli prima di chiudere.',
opzioni: [{ k: 'si', t: 'Chiudi comunque', d: 'Potrai sempre modificarlo: le modifiche saranno registrate', pericolo: true }]
}).then(k => { if (k === 'si') fai(); });
},
render(box) {
if (!box) return;
const S = RS.scene, fatte = (S.meta && S.meta.verifiche) || {};
const c = controllaMisure(), V = voci(), sch = schedaRilievo(), piano = pianoAllineamento();
const errori = c.esiti.filter(x => x.livello === 'errore').length, da = sch.daPrendere.length;
const parti = [];
if (da) parti.push(da + (da === 1 ? ' misura da prendere' : ' misure da prendere'));
if (errori) parti.push(errori + (errori === 1 ? ' misura che non torna' : ' misure che non tornano'));
if (piano.cambi.length) parti.push('disegno da allineare alle misure');
const misHtml = `<div class="ver-mis${parti.length ? ' warn' : c.controllati ? ' ok' : ''}">
          <span>${parti.length ? '⚠ ' + escH(parti.join(' · ')) : c.controllati ? '✓ Le misure tornano e il disegno le rispetta' : 'Nessun punto ancora misurato dai capisaldi'}</span>
          <button class="mini" data-vai-rilievo>Rilievo dei punti →</button></div>`;
const fatto = v => v.s === 'ok' || (v.s === 'mano' && fatte[v.k]);
const ok = V.filter(fatto).length, tot = V.filter(v => v.s !== 'na').length;
const lista = arr => {
let sez = '', h = '';
arr.forEach(v => {
if (v.sez !== sez) { sez = v.sez; h += `<div class="ver-sez">${escH(sez)}</div>`; }
const f = fatto(v);
const segno = v.s === 'na' ? '<span class="ver-st na">—</span>'
: v.s === 'mano' ? `<input type="checkbox" data-ver="${v.k}"${fatte[v.k] ? ' checked' : ''} title="Spunta quando è fatto">`
: `<span class="ver-st ${f ? 'ok' : 'ko'}">${f ? '✓' : '✗'}</span>`;
const aiuto = v.h && !f && v.s !== 'na' ? `<small>${escH(v.h)}</small>` : '';
h += `<label class="ver-voce${f ? ' fatto' : ''}${v.s === 'na' ? ' na' : ''}">${segno}<span class="ver-t">${escH(v.t)}${aiuto}</span>` +
`${v.s === 'mano' ? '<span class="ver-man">a mano</span>' : ''}</label>`;
});
return h;
};
const daFare = V.filter(v => !fatto(v) && v.s !== 'na'), aPosto = V.filter(v => fatto(v) || v.s === 'na');
const mt = S.meta || {}, modifiche = (mt.registro || []).filter(x => x.tipo === 'modifica' && x.cosa && mt.chiusura && x.dopo === mt.chiusura.il);
const statoHtml = mt.chiusura
? `<div class="ver-stato chiuso"><b>🔒 Rilievo chiuso</b> il ${escH(quando(mt.chiusura.il))} da ${escH(mt.chiusura.da)}.
             ${modifiche.length ? `<div class="ver-reg">Modifiche successive:${modifiche.map(x => `<div>· ${escH(quando(x.il))}, ${escH(x.da)} — ${escH(x.cosa)}</div>`).join('')}</div>` : '<div class="ver-reg">Nessuna modifica dopo la chiusura.</div>'}
             <div class="modal-actions" style="margin-top:8px"><button class="mini" data-chiudi>🔒 Chiudi di nuovo</button>
             <span class="mis-hint" style="margin:0">La tavola attuale diventa la nuova versione definitiva; il registro resta.</span></div></div>`
: `<div class="ver-stato"><b>Rilievo aperto</b>: le stampe portano la filigrana BOZZA finché non lo chiudi.
             <div class="modal-actions" style="margin-top:8px"><button class="mini" data-chiudi style="background:var(--accent);border-color:var(--accent);color:#fff">🔒 Chiudi il rilievo</button>
             <span class="mis-hint" style="margin:0">A lavoro finito: dopo, ogni modifica resta registrata con data e autore.</span></div></div>`;
box.innerHTML =
`${statoHtml}
         <div class="mis-step">
           <div class="mis-step-h">Misure</div>
           ${misHtml}
         </div>
         <div class="mis-step">
           <div class="mis-step-h">Lista di controllo <span class="cnt">${ok}/${tot}</span></div>
           <div class="ver-lista">${daFare.length ? lista(daFare) : '<div class="ver-esito ver-ok"><span>✓</span><div>Tutte le voci sono a posto.</div></div>'}</div>
           ${aPosto.length ? `<details class="ver-fatte"${this._fatteAperte ? ' open' : ''}><summary>Già a posto (${aPosto.length})</summary><div class="ver-lista">${lista(aPosto)}</div></details>` : ''}
           <div class="mis-hint">Le voci con ✓/✗ si aggiornano da sole dal disegno; quelle «a mano» le spunti tu (metodo Protospataro).</div>
         </div>`;
const ch = box.querySelector('[data-chiudi]');
if (ch) ch.onclick = () => this.chiudi(box);
const vai = box.querySelector('[data-vai-rilievo]');
if (vai) vai.onclick = () => { if (RS.ui) RS.ui.showDataTab('triang'); };
const det = box.querySelector('.ver-fatte');
if (det) det.addEventListener('toggle', () => { this._fatteAperte = det.open; });
box.querySelectorAll('[data-ver]').forEach(cb => cb.onchange = () => {
S.meta.verifiche = S.meta.verifiche || {};
if (cb.checked) S.meta.verifiche[cb.dataset.ver] = true; else delete S.meta.verifiche[cb.dataset.ver];
S.emit('change');
this.render(box);
});
}
};
RS.verifica = verifica;
})(window.RS = window.RS || {});

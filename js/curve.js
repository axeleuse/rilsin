(function (RS) {
'use strict';
const NS = 'http://www.w3.org/2000/svg';
const rad = d => d * Math.PI / 180;
const r2 = v => Math.round(v * 100) / 100;
const r3 = v => Math.round(v * 1000) / 1000;
const it = (v, d) => Number(v).toFixed(d == null ? 1 : d).replace('.', ',');
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const SEZ = { cA: 1, cB: 1, corsia: 3.5, spart: 0, banch: 0.5, marc: 0 };
const sezione = e => Object.assign({}, SEZ, e.sez || {});
const largh = s => r2((s.cA + s.cB) * s.corsia + (s.cA && s.cB ? (+s.spart || 0) : 0) + 2 * (+s.banch || 0));
const GUARD = [['', 'nessuno'], ['est', "sul lato esterno"], ['int', "sul lato interno"], ['both', 'su entrambi i lati']];
const raggioDa = (c, f) => (c > 0 && f > 0) ? c * c / (8 * f) + f / 2 : 0;
const cache = new Map();
function geo(e) {
const s = sezione(e), k = JSON.stringify([e.tratti, s, e.guard]);
if (cache.has(k)) return cache.get(k);
const wid = largh(s), hw = wid / 2, lm = RS.elements.latiMarc(s), marc = Math.max(lm.dx, lm.sx), minR = hw + marc + 0.5;
let x = 0, y = 0, h = 0, stretto = 0;
const P = [{ x, y, h }], archi = [];
(e.tratti || []).forEach((t, k) => {
if (t.t === 'c') {
const A = Math.min(350, Math.max(1, Math.abs(+t.ang || 90))), sg = t.verso === 'sx' ? -1 : 1;
let R = Math.max(1, +t.R || 10);
if (R < minR) { stretto = Math.max(stretto, minR); R = minR; }
const cx = x - sg * R * Math.sin(h), cy = y + sg * R * Math.cos(h);
const n = Math.max(2, Math.ceil(A / 2)), dh = sg * rad(A) / n, i0 = P.length - 1;
let phi = Math.atan2(y - cy, x - cx);
for (let i = 1; i <= n; i++) { phi += dh; h += dh; x = cx + R * Math.cos(phi); y = cy + R * Math.sin(phi); P.push({ x, y, h }); }
archi.push({ k, R, A, sg, cx, cy, i0, i1: P.length - 1 });
} else {
const L = Math.max(0, +t.len || 0); if (L <= 0) return;
const n = Math.max(1, Math.ceil(L / 5));
for (let i = 1; i <= n; i++) { x += Math.cos(h) * L / n; y += Math.sin(h) * L / n; P.push({ x, y, h }); }
}
});
const est = archi.length ? -archi[0].sg : -1;
const lati = { est: [est], int: [-est], both: [-1, 1] }[e.guard] || [];
const fuori = hw + marc + (lati.length ? 0.8 : 0.2);
let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
[-fuori, fuori].forEach(o => P.forEach(p => {
const qx = p.x - Math.sin(p.h) * o, qy = p.y + Math.cos(p.h) * o;
x0 = Math.min(x0, qx); y0 = Math.min(y0, qy); x1 = Math.max(x1, qx); y1 = Math.max(y1, qy);
}));
const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
P.forEach(p => { p.x -= cx; p.y -= cy; });
archi.forEach(a => { a.cx -= cx; a.cy -= cy; });
let svil = 0; for (let i = 1; i < P.length; i++) svil += Math.hypot(P[i].x - P[i - 1].x, P[i].y - P[i - 1].y);
const g = { P, archi, s, wid, hw, marc, mDx: lm.dx, mSx: lm.sx, lati, w: x1 - x0, h: y1 - y0, svil, stretto, inizio: { x: -cx, y: -cy } };
if (cache.size > 60) cache.clear();
cache.set(k, g);
return g;
}
const off = (P, o) => P.map(p => ({ x: p.x - Math.sin(p.h) * o, y: p.y + Math.cos(p.h) * o }));
const linD = Q => 'M' + Q.map(p => r3(p.x) + ' ' + r3(p.y)).join(' L');
const fascia = (P, a, b) => linD(off(P, a).concat(off(P, b).reverse())) + ' Z';
const dim = e => { const g = geo(e); return { w: g.w, h: g.h }; };
function mondo(e, p) {
const r = rad(e.rot || 0), c = Math.cos(r), s = Math.sin(r);
return { x: e.x + p.x * c - p.y * s, y: e.y + p.x * s + p.y * c };
}
function mk(tag, a, parent) {
const n = document.createElementNS(NS, tag);
for (const k in a) if (a[k] != null) n.setAttribute(k, a[k]);
if (parent) parent.appendChild(n);
return n;
}
function linea(par, P, y, style, w) {
if (!style || style === 'none') return;
const wl = w || 0.1, o = 0.13, dash = '1.5 1.5';
const una = (yy, tr) => mk('path', { d: linD(off(P, yy)), fill: 'none', stroke: '#fff', 'stroke-width': wl, 'stroke-dasharray': tr ? dash : null }, par);
if (style === 'double') { una(y - o); una(y + o); }
else if (style === 'ddisc') { una(y - o, 1); una(y + o, 1); }
else if (style === 'mixed') { una(y - o); una(y + o, 1); }
else una(y, style !== 'cont');
}
function disegna(g, e) {
const G = geo(e), P = G.P, s = G.s, hw = G.hw, col = e.color || '#9aa0a6';
if (P.length < 2) return;
if (G.marc > 0) {
const sp = mk('g', { mask: e.id ? `url(#rms_${e.id})` : null }, g);
[[-hw - G.mSx, -hw, -hw - 0.06, G.mSx], [hw, hw + G.mDx, hw + 0.06, G.mDx]].forEach(([a, b, yk, m]) => {
if (!(m > 0)) return;
const d = fascia(P, a, b);
mk('path', { d, fill: '#d8d2c4' }, sp);
mk('path', { d, fill: 'url(#patAsfalto)', opacity: 0.35 }, sp);
mk('path', { d: linD(off(P, yk)), fill: 'none', stroke: '#7d776b', 'stroke-width': 0.12 }, sp);
});
}
const asf = fascia(P, -hw, hw);
mk('path', { d: asf, fill: col }, g);
mk('path', { d: asf, fill: 'url(#patAsfalto)' }, g);
const marks = mk('g', { mask: e.id ? `url(#rm_${e.id})` : null }, g);
if (!(G.marc > 0)) mk('path', { d: asf, fill: 'none', stroke: '#6b7178', 'stroke-width': 0.05 }, marks);
else [[-hw, G.mSx], [hw, G.mDx]].forEach(([y, m]) => {
if (!(m > 0)) mk('path', { d: linD(off(P, y)), fill: 'none', stroke: '#6b7178', 'stroke-width': 0.05 }, marks);
});
const banch = Math.max(0, +s.banch || 0), spart = s.cA && s.cB ? Math.max(0, +s.spart || 0) : 0;
const yL0 = -hw + banch, yC = yL0 + s.cB * s.corsia, yLA = yC + spart, yF = yLA + s.cA * s.corsia;
const es = e.edge || 'cont';
if (es !== 'none') {
const ew = es === 'wide' ? 0.18 : 0.1, tr = es === 'disc';
[Math.max(yL0, -hw + ew / 2 + 0.05), Math.min(yF, hw - ew / 2 - 0.05)].forEach(y => linea(marks, P, y, tr ? 'disc' : 'cont', ew));
}
for (let i = 1; i < s.cB; i++) linea(marks, P, yL0 + i * s.corsia, 'disc');
for (let i = 1; i < s.cA; i++) linea(marks, P, yLA + i * s.corsia, 'disc');
if (s.cA && s.cB) {
if (spart > 0) {
const d = fascia(P, yC, yLA);
mk('path', { d, fill: '#cfc8b6', stroke: '#8a8478', 'stroke-width': 0.06 }, marks);
if (spart > 1.2) mk('path', { d: fascia(P, yC + 0.3, yLA - 0.3), fill: '#a9bf8e' }, marks);
if (es !== 'none') { linea(marks, P, yC - 0.17, 'cont'); linea(marks, P, yLA + 0.17, 'cont'); }
} else linea(marks, P, yC, e.line || 'disc');
}
G.lati.forEach(sg => {
const d = linD(off(P, sg * (hw + (sg > 0 ? G.mDx : G.mSx) + 0.45)));
mk('path', { d, fill: 'none', stroke: '#555', 'stroke-width': 0.14 }, g);
mk('path', { d, fill: 'none', stroke: '#555', 'stroke-width': 0.4, 'stroke-dasharray': '0.07 0.93' }, g);
});
if (e.scriviR) G.archi.forEach(a => {
const m = P[Math.round((a.i0 + a.i1) / 2)], dx = m.x - a.cx, dy = m.y - a.cy, l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l;
const vicino = a.R <= 60, fs = Math.max(1, Math.min(1.6, a.R / 25));
const da = vicino ? { x: a.cx, y: a.cy } : { x: m.x - ux * (hw + G.marc + 6), y: m.y - uy * (hw + G.marc + 6) };
mk('path', { d: `M${r3(da.x)} ${r3(da.y)} L${r3(m.x)} ${r3(m.y)}`, fill: 'none', stroke: '#1d4f91', 'stroke-width': 0.08, 'stroke-dasharray': '0.6 0.3' }, g);
if (vicino) mk('circle', { cx: r3(a.cx), cy: r3(a.cy), r: 0.18, fill: '#1d4f91' }, g);
const t = { x: m.x - ux * (hw + G.marc + 2.2 + fs), y: m.y - uy * (hw + G.marc + 2.2 + fs) };
const tx = mk('text', { x: r3(t.x), y: r3(t.y), 'font-size': fs, 'text-anchor': 'middle', dy: '0.35em', fill: '#1d4f91',
'font-weight': 700, 'paint-order': 'stroke', stroke: '#fff', 'stroke-width': fs * 0.18, transform: `rotate(${-(e.rot || 0)} ${r3(t.x)} ${r3(t.y)})` }, g);
tx.textContent = 'R = ' + it(a.R) + ' m';
});
if (String(e.nomeVia || '').trim()) {
let k = 1, cum = 0; for (; k < P.length - 1; k++) { cum += Math.hypot(P[k].x - P[k - 1].x, P[k].y - P[k - 1].y); if (cum >= G.svil / 2) break; }
if (e.viaPos) {
let mi = 0, md = Infinity; P.forEach((q, i) => { const d = Math.hypot(q.x - e.viaPos.x, q.y - e.viaPos.y); if (d < md) { md = d; mi = i; } });
const h = P[mi].h * 180 / Math.PI;
RS.elements.etichettaVia(g, e.nomeVia, e.viaPos, h, h + (e.rot || 0));
} else {
const m = P[k], o = -hw / 2, h = m.h * 180 / Math.PI;
RS.elements.etichettaVia(g, e.nomeVia, { x: m.x - Math.sin(m.h) * o, y: m.y + Math.cos(m.h) * o }, h, h + (e.rot || 0));
}
}
}
function forma(e, pre, inf) {
const G = geo(e);
return mk('path', { d: linD(G.P), fill: 'none', stroke: '#000', 'stroke-width': G.wid + inf * 2, 'stroke-linejoin': 'round',
transform: `${pre || ''} translate(${e.x} ${e.y}) rotate(${e.rot || 0})` });
}
function nuova(p, def) {
const s = def.sez ? Object.assign({}, def.sez) : Object.assign({}, SEZ);
delete s.frecce;
return { type: 'curva', x: p.x, y: p.y, rot: def.rot || 0, tratti: JSON.parse(JSON.stringify(def.tratti || [{ t: 'c', R: 20, ang: 90, verso: 'dx' }])),
sez: s, line: def.line || 'disc', edge: 'cont', guard: def.guard || '', scriviR: false, color: def.color || '#9aa0a6' };
}
const sviluppo = e => geo(e).svil;
function descrizioni() {
const out = [];
RS.scene.elements.filter(e => e.type === 'curva' && e.scriviR).forEach(e => (e.tratti || []).forEach(t => {
if (t.t !== 'c') return;
const m = t.mis && t.mis.corda > 0 && t.mis.freccia > 0 ? ' (ricavato da corda ' + it(t.mis.corda, 2) + ' m e freccia ' + it(t.mis.freccia, 2) + ' m)' : '';
out.push('raggio ' + it(+t.R, 2) + ' m' + m + ', deviazione ' + Math.round(+t.ang) + '° a ' + (t.verso === 'sx' ? 'sinistra' : 'destra'));
}));
return out.filter((t, k, a) => a.indexOf(t) === k);
}
const numIn = (attr, v, step, min) => `<input type="number" ${attr} value="${v}" step="${step || 0.5}"${min != null ? ` min="${min}"` : ''}>`;
const selIn = (attr, v, opts) => `<select ${attr}>${opts.map(o => `<option value="${esc(o[0])}"${String(o[0]) === String(v) ? ' selected' : ''}>${esc(o[1])}</option>`).join('')}</select>`;
function pannello(e) {
const G = geo(e), s = G.s, tr = e.tratti || [];
const lmP = RS.elements.latiMarc(s), latoM = lmP.dx > 0 && lmP.sx > 0 ? 'entrambi' : lmP.dx > 0 ? 'dx' : lmP.sx > 0 ? 'sx' : 'nessuno';
let nc = 0;
const righe = tr.map((t, k) => {
const curva = t.t === 'c', n = curva ? ++nc : 0;
return `<div class="inc-br">
        <span class="inc-n">${k + 1}</span>
        ${curva ? `<label>Raggio (m)${numIn(`data-ct="${k}:R"`, r2(+t.R || 10), 0.5, 1)}</label>
          <label>Angolo°${numIn(`data-ct="${k}:ang"`, Math.round(+t.ang || 90), 1, 1)}</label>`
: `<label class="inc-due">Rettifilo, lungh. (m)${numIn(`data-ct="${k}:len"`, r2(+t.len || 0), 0.5, 0)}</label>`}
        <button class="iconbtn danger" data-ctdel="${k}" title="Togli il tratto ${k + 1}"${tr.length <= 1 ? ' disabled' : ''}>🗑</button>
        ${curva ? `<label class="inc-wide">Curva ${n} verso${selIn(`data-ct="${k}:verso"`, t.verso === 'sx' ? 'sx' : 'dx', [['dx', 'destra'], ['sx', 'sinistra']])}</label>` : ''}
      </div>`;
}).join('');
const archi = tr.map((t, k) => ({ t, k })).filter(o => o.t.t === 'c');
const m = e._mis || {}, Rm = raggioDa(+m.corda, +m.freccia);
return `<div class="inc-pan">
      <div class="inc-griglia">
        <label>Rotazione°${numIn('data-cp="rot"', r2(e.rot || 0), 1)}</label>
        <label>Sviluppo<input disabled value="${it(G.svil, 2)} m"></label>
      </div>
      <div class="inc-sez-t" style="margin-top:10px">Tracciato <span class="muted">· dall'inizio alla fine, nell'ordine</span></div>
      ${righe}
      <div class="pbtns"><button class="pbtn" data-cact="r">＋ Rettifilo</button><button class="pbtn" data-cact="c">＋ Curva</button></div>
      ${G.stretto ? `<div class="mis-hint">⚠ Con questa carreggiata il raggio non può essere minore di ${it(G.stretto)} m: la curva è disegnata con ${it(G.stretto)} m.</div>` : ''}
      ${archi.length ? `<div class="inc-sez"><div class="inc-sez-t">Raggio da corda e freccia <span class="muted">· misurate sul bordo o sulla mezzeria</span></div>
        <div class="inc-griglia">
          <label>Corda (m)${numIn('data-cm="corda"', m.corda != null ? m.corda : '', 0.01, 0)}</label>
          <label>Freccia (m)${numIn('data-cm="freccia"', m.freccia != null ? m.freccia : '', 0.01, 0)}</label>
          ${archi.length > 1 ? `<label class="inc-wide">Per la curva${selIn('data-cm="k"', m.k != null ? m.k : archi[0].k, archi.map((o, i) => [o.k, 'curva ' + (i + 1)]))}</label>` : ''}
        </div>
        <div class="mis-hint${Rm ? ' esito' : ''}">${Rm ? `R = c² / 8f + f / 2 = <b>${it(Rm, 2)} m</b>` : 'Scrivi la corda (distanza fra due punti del bordo) e la freccia (distanza della curva dal centro della corda).'}</div>
        ${Rm ? `<div class="pbtns"><button class="pbtn" data-cact="usaR">Usa questo raggio</button></div>` : ''}
      </div>` : ''}
      <label class="inc-chk"><input type="checkbox" data-cp="scriviR"${e.scriviR ? ' checked' : ''}> Scrivi il raggio sul disegno (e nell'atto)</label>
      <div class="inc-sez"><div class="inc-sez-t">Carreggiata <span class="muted">· ${it(G.wid, 2)} m</span></div>
        <div class="inc-griglia">
          <label>Corsie ${RS.FRECCIA ? RS.FRECCIA.avanti : '→'}${numIn('data-cs="cA"', s.cA, 1, 0)}</label>
          <label>Corsie ${RS.FRECCIA ? RS.FRECCIA.indietro : '←'}${numIn('data-cs="cB"', s.cB, 1, 0)}</label>
          <label>Corsia (m)${numIn('data-cs="corsia"', s.corsia, 0.1, 2)}</label>
          <label>Banchina (m)${numIn('data-cs="banch"', s.banch, 0.05, 0)}</label>
          <label>Spartitraffico (m)${numIn('data-cs="spart"', s.spart || 0, 0.1, 0)}</label>
          <label class="inc-wide">Striscia centrale${selIn('data-cp="line"', e.line || 'disc', [['disc', 'tratteggiata'], ['cont', 'continua'], ['double', 'doppia continua'], ['mixed', 'continua e tratteggiata'], ['none', 'nessuna']])}</label>
          <label class="inc-wide">Strisce di margine${selIn('data-cp="edge"', e.edge || 'cont', [['cont', 'continue'], ['disc', 'tratteggiate'], ['wide', 'continue larghe'], ['none', 'nessuna']])}</label>
          <label class="inc-wide">Guard-rail${selIn('data-cp="guard"', e.guard || '', GUARD)}</label>
        </div>
      </div>
      <div class="inc-sez"><div class="inc-sez-t">Marciapiedi <span class="muted">· destra e sinistra guardando verso la fine del tracciato</span></div>
        <div class="inc-griglia">
          <label class="inc-wide">Marciapiede${selIn('data-cmarc="marcLati"', latoM, [['nessuno', 'nessuno'], ['entrambi', 'su entrambi i lati'], ['dx', 'solo a destra'], ['sx', 'solo a sinistra']])}</label>
          ${lmP.sx > 0 ? `<label>Sinistra (m)${numIn('data-cmarc="marcSx"', r2(lmP.sx), 0.05, 0)}</label>` : ''}
          ${lmP.dx > 0 ? `<label>Destra (m)${numIn('data-cmarc="marcDx"', r2(lmP.dx), 0.05, 0)}</label>` : ''}
        </div>
      </div>
    </div>`;
}
function lega(root, e) {
const S = RS.scene;
const cambia = (fn, ridisegna) => {
const a = mondo(e, geo(e).inizio);
fn();
const b = mondo(e, geo(e).inizio);
e.x = r3(e.x + a.x - b.x); e.y = r3(e.y + a.y - b.y);
S.render(); S.snapshot();
if (RS.ui && ridisegna) setTimeout(() => RS.ui.renderProps(), 0);
};
const num = inp => parseFloat(inp.value);
root.querySelectorAll('[data-ct]').forEach(inp => inp.addEventListener('change', () => {
const [k, f] = inp.dataset.ct.split(':'), t = e.tratti[+k]; if (!t) return;
if (f === 'verso') { cambia(() => { t.verso = inp.value; }, false); return; }
const v = num(inp); if (isNaN(v)) return;
cambia(() => { t[f] = f === 'len' ? Math.max(0, v) : f === 'R' ? Math.max(1, v) : Math.min(350, Math.max(1, v)); if (f === 'R') delete t.mis; }, true);
}));
root.querySelectorAll('[data-cs]').forEach(inp => inp.addEventListener('change', () => {
const k = inp.dataset.cs, v = num(inp); if (isNaN(v)) return;
cambia(() => { e.sez = Object.assign({}, SEZ, e.sez, { [k]: (k === 'cA' || k === 'cB') ? Math.max(0, Math.round(v)) : Math.max(0, v) }); }, true);
}));
root.querySelectorAll('[data-cmarc]').forEach(inp => inp.addEventListener('change', () => {
const k = inp.dataset.cmarc, v = k === 'marcLati' ? inp.value : num(inp); if (k !== 'marcLati' && isNaN(v)) return;
cambia(() => { e.sez = Object.assign({}, SEZ, e.sez); RS.elements.impostaMarc(e.sez, k, v); }, true);
}));
root.querySelectorAll('[data-cp]').forEach(inp => inp.addEventListener('change', () => {
const k = inp.dataset.cp;
if (k === 'rot') { const v = num(inp); if (isNaN(v)) return; e.rot = ((v % 360) + 360) % 360; S.render(); S.snapshot(); return; }
cambia(() => { e[k] = inp.type === 'checkbox' ? inp.checked : inp.value; }, k === 'guard');
}));
root.querySelectorAll('[data-cm]').forEach(inp => inp.addEventListener('change', () => {
const v = num(inp);
e._mis = Object.assign({}, e._mis, { [inp.dataset.cm]: isNaN(v) ? null : v });
if (RS.ui) setTimeout(() => RS.ui.renderProps(), 0);
}));
root.querySelectorAll('[data-ctdel]').forEach(b => b.onclick = () => {
if (e.tratti.length <= 1) return;
cambia(() => { e.tratti.splice(+b.dataset.ctdel, 1); }, true);
});
root.querySelectorAll('[data-cact]').forEach(b => b.onclick = () => {
const a = b.dataset.cact;
if (a === 'r') cambia(() => { e.tratti.push({ t: 'r', len: 10 }); }, true);
else if (a === 'c') cambia(() => { e.tratti.push({ t: 'c', R: 20, ang: 45, verso: 'dx' }); }, true);
else if (a === 'usaR') {
const m = e._mis || {}, R = raggioDa(+m.corda, +m.freccia), archi = e.tratti.filter(t => t.t === 'c');
const t = (m.k != null && e.tratti[+m.k] && e.tratti[+m.k].t === 'c') ? e.tratti[+m.k] : archi[0];
if (!R || !t) return;
cambia(() => { t.R = r2(R); t.mis = { corda: +m.corda, freccia: +m.freccia }; e.scriviR = true; }, true);
if (RS.ui) RS.ui.toast('Raggio ' + it(R, 2) + ' m: scritto sul disegno e nell\'atto', 3500);
}
});
}
RS.curve = { geo, dim, disegna, forma, nuova, sviluppo, descrizioni, pannello, lega, raggioDa, mondo };
})(window.RS = window.RS || {});

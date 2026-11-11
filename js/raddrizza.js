(function (RS) {
'use strict';
const el = id => document.getElementById(id);
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const virgola = (v, d) => (Math.round(v * Math.pow(10, d == null ? 2 : d)) / Math.pow(10, d == null ? 2 : d)).toFixed(d == null ? 2 : d).replace('.', ',');
const numero = s => parseFloat(String(s == null ? '' : s).replace(',', '.'));
function risolvi(A, b) {
const n = b.length;
for (let i = 0; i < n; i++) {
let m = i;
for (let r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(A[m][i])) m = r;
[A[i], A[m]] = [A[m], A[i]]; [b[i], b[m]] = [b[m], b[i]];
if (Math.abs(A[i][i]) < 1e-12) return null;
for (let r = i + 1; r < n; r++) {
const f = A[r][i] / A[i][i];
for (let c = i; c < n; c++) A[r][c] -= f * A[i][c];
b[r] -= f * b[i];
}
}
const x = new Array(n);
for (let i = n - 1; i >= 0; i--) { let s = b[i]; for (let c = i + 1; c < n; c++) s -= A[i][c] * x[c]; x[i] = s / A[i][i]; }
return x;
}
function omografia(s, d) {
const A = [], b = [];
for (let i = 0; i < 4; i++) {
const [x, y] = s[i], [u, v] = d[i];
A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
}
const h = risolvi(A, b);
return h && h.every(isFinite) ? h.concat([1]) : null;
}
function applica(h, x, y) { const w = h[6] * x + h[7] * y + h[8]; return [(h[0] * x + h[1] * y + h[2]) / w, (h[3] * x + h[4] * y + h[5]) / w, w]; }
function area(p) { let a = 0; for (let i = 0; i < p.length; i++) { const q = p[(i + 1) % p.length]; a += p[i][0] * q[1] - q[0] * p[i][1]; } return a / 2; }
function convesso(p) {
let s = 0;
for (let i = 0; i < 4; i++) {
const a = p[i], b = p[(i + 1) % 4], c = p[(i + 2) % 4];
const z = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
if (Math.abs(z) < 1e-9) return false;
if (!s) s = Math.sign(z); else if (Math.sign(z) !== s) return false;
}
return true;
}
function campiona(d, W, H, x, y, o) {
const x0 = Math.floor(x), y0 = Math.floor(y);
if (x0 < 0 || y0 < 0 || x0 >= W - 1 || y0 >= H - 1) return false;
const fx = x - x0, fy = y - y0, i = (y0 * W + x0) * 4, j = i + W * 4;
for (let k = 0; k < 3; k++) o[k] = (d[i + k] * (1 - fx) + d[i + 4 + k] * fx) * (1 - fy) + (d[j + k] * (1 - fx) + d[j + 4 + k] * fx) * fy;
return true;
}
function calcola(fonte, pts, L, W, maxPx) {
if (!(L > 0) || !(W > 0) || !convesso(pts)) return null;
const sg = area(pts) >= 0 ? 1 : -1;
const R = [[0, 0], [L, 0], [L, sg * W], [0, sg * W]];
const r2p = omografia(R, pts), p2r = omografia(pts, R);
if (!r2p || !p2r) return null;
const cx = (pts[0][0] + pts[1][0] + pts[2][0] + pts[3][0]) / 4, cy = (pts[0][1] + pts[1][1] + pts[2][1] + pts[3][1]) / 4;
const wp = Math.sign(applica(p2r, cx, cy)[2]), wr = Math.sign(applica(r2p, L / 2, sg * W / 2)[2]);
const D = Math.max(8, Math.min(30, 4 * Math.max(L, W)));
const lim = { x0: -D, x1: L + D, y0: Math.min(0, sg * W) - D, y1: Math.max(0, sg * W) + D };
let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
const FW = fonte.width, FH = fonte.height;
for (let i = 0; i <= 40; i++) for (let j = 0; j <= 40; j++) {
const q = applica(p2r, FW * i / 40, FH * j / 40);
if (Math.sign(q[2]) !== wp) continue;
const X = Math.max(lim.x0, Math.min(lim.x1, q[0])), Y = Math.max(lim.y0, Math.min(lim.y1, q[1]));
x0 = Math.min(x0, X); x1 = Math.max(x1, X); y0 = Math.min(y0, Y); y1 = Math.max(y1, Y);
}
if (!(x1 > x0) || !(y1 > y0)) return null;
const bw = x1 - x0, bh = y1 - y0, s = Math.min(200, (maxPx || 1400) / bw, (maxPx || 1400) / bh);
const cw = Math.max(1, Math.ceil(bw * s)), ch = Math.max(1, Math.ceil(bh * s));
const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
const cx2 = cv.getContext('2d'), out = cx2.createImageData(cw, ch), od = out.data;
const src = fonte.getContext('2d').getImageData(0, 0, FW, FH).data, c = [0, 0, 0];
for (let v = 0; v < ch; v++) {
const Y = y0 + (v + 0.5) / s;
for (let u = 0; u < cw; u++) {
const q = applica(r2p, x0 + (u + 0.5) / s, Y), k = (v * cw + u) * 4;
if (Math.sign(q[2]) === wr && campiona(src, FW, FH, q[0], q[1], c)) { od[k] = c[0]; od[k + 1] = c[1]; od[k + 2] = c[2]; od[k + 3] = 255; }
else { const t = ((u >> 4) + (v >> 4)) & 1; od[k] = od[k + 1] = od[k + 2] = t ? 226 : 238; od[k + 3] = 255; }
}
}
cx2.putImageData(out, 0, 0);
return { cv, s, x0, y0, bw, bh, sg, L, W, r2p, p2r };
}
function incertezza(pts, L, W, sg, pa, pb, d) {
const R = [[0, 0], [L, 0], [L, sg * W], [0, sg * W]];
const dist = h => { if (!h) return NaN; const a = applica(h, pa[0], pa[1]), b = applica(h, pb[0], pb[1]); return Math.hypot(b[0] - a[0], b[1] - a[1]); };
const d0 = dist(omografia(pts, R));
let somma = 0;
for (let i = 0; i < 4; i++) {
let peggio = 0;
[[d, 0], [-d, 0], [0, d], [0, -d]].forEach(o => {
const q = pts.map((p, j) => j === i ? [p[0] + o[0], p[1] + o[1]] : p);
const v = dist(omografia(q, R));
if (isFinite(v)) peggio = Math.max(peggio, Math.abs(v - d0));
});
somma += peggio * peggio;
}
return Math.sqrt(somma);
}
const passoClic = F => Math.max(1.5, F.width / 600);
const aPixel = (V, X, Y) => [(X - V.x0) * V.s, (Y - V.y0) * V.s];
const aMetri = (V, u, v) => [V.x0 + u / V.s, V.y0 + v / V.s];
function caricaFonte(href) {
return new Promise((ok, ko) => {
if (!href) { ko(new Error('foto senza immagine')); return; }
const im = new Image();
im.onload = () => {
const k = Math.min(1, 1800 / Math.max(im.naturalWidth, im.naturalHeight));
const cv = document.createElement('canvas'); cv.width = Math.round(im.naturalWidth * k); cv.height = Math.round(im.naturalHeight * k);
cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
ok(cv);
};
im.onerror = () => ko(new Error('immagine non leggibile'));
im.src = href;
});
}
function decora(ctx, V, dati, opz) {
opz = opz || {};
const passo = V.s >= 8 ? 1 : 5, lw = Math.max(1, V.s / 60);
if (opz.griglia !== false) {
ctx.strokeStyle = 'rgba(255,255,255,.38)'; ctx.lineWidth = lw;
for (let X = Math.ceil(V.x0 / passo) * passo; X <= V.x0 + V.bw; X += passo) { const u = (X - V.x0) * V.s; ctx.beginPath(); ctx.moveTo(u, 0); ctx.lineTo(u, V.cv.height); ctx.stroke(); }
for (let Y = Math.ceil(V.y0 / passo) * passo; Y <= V.y0 + V.bh; Y += passo) { const v = (Y - V.y0) * V.s; ctx.beginPath(); ctx.moveTo(0, v); ctx.lineTo(V.cv.width, v); ctx.stroke(); }
}
ctx.strokeStyle = '#ffcc33'; ctx.lineWidth = lw * 2;
ctx.beginPath(); [[0, 0], [V.L, 0], [V.L, V.sg * V.W], [0, V.sg * V.W]].forEach((p, i) => { const q = aPixel(V, p[0], p[1]); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); });
ctx.closePath(); ctx.stroke();
const fs = Math.max(12, Math.min(28, V.cv.width / 45));
const etichetta = (t, x, y, sfondo) => {
ctx.font = `bold ${fs}px Arial, sans-serif`; ctx.textBaseline = 'middle';
const w = ctx.measureText(t).width + fs * 0.6;
ctx.fillStyle = sfondo || 'rgba(20,20,20,.78)'; ctx.fillRect(x, y - fs * 0.7, w, fs * 1.4);
ctx.fillStyle = '#fff'; ctx.fillText(t, x + fs * 0.3, y);
};
(dati.misure || []).forEach((m, i) => {
const a = aPixel(V, m.a[0], m.a[1]), b = aPixel(V, m.b[0], m.b[1]);
ctx.strokeStyle = '#e8432e'; ctx.lineWidth = lw * 2.5;
ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
[a, b].forEach(p => { ctx.fillStyle = '#e8432e'; ctx.beginPath(); ctx.arc(p[0], p[1], lw * 4, 0, 7); ctx.fill(); });
const f = [0.5, 0.3, 0.7][i % 3];
etichetta((i + 1) + ') ' + virgola(m.val) + ' m', a[0] + (b[0] - a[0]) * f + lw * 6, a[1] + (b[1] - a[1]) * f);
});
if (opz.parziale) { const p = aPixel(V, opz.parziale[0], opz.parziale[1]); ctx.fillStyle = '#e8432e'; ctx.beginPath(); ctx.arc(p[0], p[1], lw * 4, 0, 7); ctx.fill(); }
const ag = dati.aggancio || {};
['a', 'b'].forEach(k => {
if (!ag[k] || ag[k].X == null) return;
const p = aPixel(V, ag[k].X, ag[k].Y);
ctx.strokeStyle = '#1466b8'; ctx.lineWidth = lw * 2.5;
ctx.beginPath(); ctx.arc(p[0], p[1], lw * 7, 0, 7); ctx.stroke();
ctx.beginPath(); ctx.moveTo(p[0] - lw * 10, p[1]); ctx.lineTo(p[0] + lw * 10, p[1]); ctx.moveTo(p[0], p[1] - lw * 10); ctx.lineTo(p[0], p[1] + lw * 10); ctx.stroke();
etichetta(ag[k].lettera || k.toUpperCase(), p[0] + lw * 9, p[1] - lw * 9, 'rgba(20,70,140,.85)');
});
const lb = passo === 1 ? 5 : 10, bx = fs, by = V.cv.height - fs * 1.4;
ctx.fillStyle = 'rgba(20,20,20,.72)'; ctx.fillRect(bx - fs * 0.4, by - fs * 0.9, lb * V.s + fs * 3.6, fs * 1.7);
ctx.fillStyle = '#fff'; ctx.fillRect(bx, by - lw * 2, lb * V.s, lw * 4);
ctx.font = `bold ${fs * 0.8}px Arial, sans-serif`; ctx.textBaseline = 'middle'; ctx.fillText(lb + ' m', bx + lb * V.s + fs * 0.4, by);
}
function fotoConPunti(fonte, pts, maxW) {
const k = Math.min(1, (maxW || 900) / fonte.width), cv = document.createElement('canvas');
cv.width = Math.round(fonte.width * k); cv.height = Math.round(fonte.height * k);
const c = cv.getContext('2d'); c.drawImage(fonte, 0, 0, cv.width, cv.height);
disegnaPunti(c, pts.map(p => [p[0] * k, p[1] * k]), Math.max(8, cv.width / 70));
return cv;
}
function disegnaPunti(c, P, r) {
c.strokeStyle = '#ffcc33'; c.lineWidth = Math.max(2, r / 4);
c.beginPath(); P.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); c.stroke();
P.forEach((p, i) => {
c.fillStyle = '#ffcc33'; c.beginPath(); c.arc(p[0], p[1], r, 0, 7); c.fill();
c.strokeStyle = '#5a4300'; c.lineWidth = Math.max(1, r / 8); c.stroke();
c.fillStyle = '#2a1f00'; c.font = `bold ${Math.round(r * 1.25)}px Arial, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
c.fillText(String(i + 1), p[0], p[1] + 0.5); c.textAlign = 'left';
});
}
const RIFERIMENTI = [
['stallo', 'Stallo di sosta', 5.0, 2.5], ['riquadro', 'Riquadro o metro rigido (1 × 1 m)', 1, 1],
['zebra', 'Striscia dell\'attraversamento pedonale', 2.5, 0.5], ['altro', 'Altro rettangolo misurato', null, null]
];
const capisaldi = () => RS.scene.elements.filter(e => e.type === 'symbol' && e.letter).sort((a, b) => String(a.letter).localeCompare(String(b.letter)));
const nomeFonte = e => e.type === 'foto' ? 'Foto ' + (e.n || '') + (e.descr ? ' — ' + e.descr : '') : 'Immagine di sfondo';
function confrontoAggancio(dati) {
const ag = dati.aggancio || {}, S = RS.scene;
if (!ag.a || !ag.b || ag.a.X == null || ag.b.X == null) return null;
const A = S.get(ag.a.id), B = S.get(ag.b.id);
if (!A || !B || A === B) return null;
const disegno = Math.hypot(B.x - A.x, B.y - A.y), foto = Math.hypot(ag.b.X - ag.a.X, ag.b.Y - ag.a.Y);
return { A, B, disegno, foto, scarto: foto - disegno, perc: disegno > 0 ? (foto - disegno) / disegno * 100 : 0 };
}
async function tavola(e, numero) {
const r = e.radd, fonte = await caricaFonte(e.href);
const pts = r.pts.map(p => [p[0] * fonte.width, p[1] * fonte.height]);
const V = calcola(fonte, pts, r.L, r.W, 1100); if (!V) return '';
const c = V.cv.getContext('2d'); decora(c, V, r);
const orig = fotoConPunti(fonte, pts, 900).toDataURL('image/jpeg', 0.85), vista = V.cv.toDataURL('image/jpeg', 0.85);
const ag = confrontoAggancio(r);
const inc = m => { const pa = applica(V.r2p, m.a[0], m.a[1]), pb = applica(V.r2p, m.b[0], m.b[1]); return incertezza(pts, r.L, r.W, V.sg, pa, pb, passoClic(fonte)); };
const righe = (r.misure || []).map((m, i) => `<tr><td>${i + 1}</td><td>${esc(m.descr || '')}</td><td class="num">${virgola(m.val)} m</td><td class="num">± ${virgola(inc(m))} m</td>
        <td class="num">${m.nastro ? virgola(m.nastro) + ' m' : '—'}</td><td class="num">${m.nastro ? (m.val - m.nastro >= 0 ? '+' : '') + virgola(m.val - m.nastro) + ' m' : '—'}</td></tr>`).join('');
return `<div class="radd-tav">
      <h2>RADDRIZZAMENTO FOTOGRAFICO${numero ? ' N. ' + numero : ''}</h2>
      <p class="radd-fonte">${esc(nomeFonte(e))}</p>
      <div class="radd-img"><figure><img src="${orig}"><figcaption>Fotografia originale con il riferimento a terra (vertici 1–4).</figcaption></figure>
        <figure><img src="${vista}"><figcaption>Vista dall'alto raddrizzata, in scala (griglia di ${V.s >= 8 ? '1 m' : '5 m'}).</figcaption></figure></div>
      <table class="radd-t"><tr><th colspan="2">Riferimento</th></tr>
        <tr><td>Oggetto a terra</td><td>${esc(r.tipo || 'rettangolo misurato')}</td></tr>
        <tr><td>Lato 1–2 × lato 1–4</td><td>${virgola(r.L)} m × ${virgola(r.W)} m (misurati sul posto)</td></tr>
        ${ag ? `<tr><td>Aggancio al rilievo</td><td>capisaldi ${esc(ag.A.letter)}–${esc(ag.B.letter)}: ${virgola(ag.disegno)} m nel rilievo, ${virgola(ag.foto)} m sulla vista (scarto ${ag.scarto >= 0 ? '+' : ''}${virgola(ag.scarto)} m, ${virgola(ag.perc, 1)}%)</td></tr>` : ''}
      </table>
      ${righe ? `<table class="radd-t"><tr><th>N.</th><th>Misura ricavata</th><th>Dalla foto</th><th>Incertezza</th><th>A nastro</th><th>Scarto</th></tr>${righe}</table>` : ''}
      <p class="radd-nota">Il raddrizzamento vale solo per i punti che giacciono sul piano stradale; gli oggetti in altezza risultano deformati.
        Le misure ricavate sono di ausilio e vanno confrontate con quelle rilevate direttamente sul posto; la precisione diminuisce
        allontanandosi dal riferimento e ai bordi della fotografia.</p></div>`;
}
const CSS_TAVOLA = `.radd-tav h2{font-size:15px;letter-spacing:.6px;margin:0 0 2px}
    .radd-fonte{margin:0 0 8px;color:#333}
    .radd-img{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px;align-items:start}
    .radd-img figure{margin:0}.radd-img img{width:100%;border:1px solid #999}
    .radd-img figcaption{font-size:11px;color:#333;margin-top:3px}
    .radd-t{width:100%;border-collapse:collapse;margin-top:10px;font-size:12px}
    .radd-t th{background:#eee;text-align:left;padding:4px 6px;border:1px solid #bbb}
    .radd-t td{padding:4px 6px;border:1px solid #bbb;vertical-align:top}.radd-t .num{text-align:right;white-space:nowrap}
    .radd-nota{font-size:11px;color:#333;margin-top:10px;text-align:justify}
    .radd-tav + .radd-tav{break-before:page}`;
let st = null;
function finestra() {
let m = el('raddModal');
if (m) return m;
m = document.createElement('div'); m.id = 'raddModal'; m.className = 'modal'; m.hidden = true;
m.innerHTML = `<div class="modal-box radd-box">
      <div class="modal-head"><span id="raddTitolo">📐 Raddrizzamento fotografico</span>
        <button class="modal-x" data-radd="chiudi" title="Chiudi senza salvare">✕</button></div>
      <div class="modal-body radd-body">
        <div class="radd-col">
          <div class="radd-tit">1. Riferimento a terra sulla foto</div>
          <div class="radd-hint">Trascina i punti <b>1–4</b> sui vertici, nell'ordine attorno al rettangolo. Rotellina o ＋/− per ingrandire, trascina il vuoto per spostarti.</div>
          <div class="radd-tela"><canvas id="raddFoto"></canvas>
            <div class="radd-zoom"><button class="mini" data-radd="zin" title="Ingrandisci">＋</button><button class="mini" data-radd="zout" title="Riduci">−</button><button class="mini" data-radd="zfit" title="Adatta">⤢</button></div></div>
          <div class="radd-campi">
            <label>Oggetto<select id="raddTipo">${RIFERIMENTI.map(r => `<option value="${r[0]}">${esc(r[1])}</option>`).join('')}</select></label>
            <label>Lato 1–2 (m)<input id="raddL" inputmode="decimal"></label>
            <label>Lato 1–4 (m)<input id="raddW" inputmode="decimal"></label>
          </div>
          <div class="radd-hint">Le misure del riferimento vanno <b>prese sul posto</b>: quelle proposte sono solo un punto di partenza.</div>
          <div class="radd-avvisi" id="raddAvvisi"></div>
        </div>
        <div class="radd-col">
          <div class="radd-tit">2. Vista dall'alto in scala</div>
          <div class="radd-modi">
            <label><input type="radio" name="raddModo" value="misura" checked> Misura (clic su due punti)</label>
            <label><input type="radio" name="raddModo" value="aggA"> Indica il caposaldo <select id="raddCapA"></select></label>
            <label><input type="radio" name="raddModo" value="aggB"> e il caposaldo <select id="raddCapB"></select></label>
          </div>
          <div class="radd-tela"><canvas id="raddVista"></canvas></div>
          <div class="radd-aggancio" id="raddAgg"></div>
          <div class="radd-misure" id="raddMisure"></div>
        </div>
      </div>
      <div class="modal-actions radd-azioni">
        <button class="mini primario" data-radd="salva">💾 Salva</button>
        <button class="mini" data-radd="elenco">＋ Aggiungi all'elenco misure</button>
        <button class="mini" data-radd="sfondo">🗺 Inserisci nel disegno in scala</button>
        <button class="mini" data-radd="stampa">🖨 Tavola del raddrizzamento</button>
        <button class="mini pericolo" data-radd="togli">Togli il raddrizzamento</button>
      </div></div>`;
document.body.appendChild(m);
m.addEventListener('click', ev => { const b = ev.target.closest('[data-radd]'); if (b) azione(b.dataset.radd); });
el('raddTipo').addEventListener('change', () => {
const r = RIFERIMENTI.find(x => x[0] === el('raddTipo').value);
if (r && r[2]) { el('raddL').value = virgola(r[2]); el('raddW').value = virgola(r[3]); }
st.dati.tipo = r ? r[1] : ''; ricalcola();
});
['raddL', 'raddW'].forEach(id => el(id).addEventListener('change', ricalcola));
['raddCapA', 'raddCapB'].forEach((id, i) => el(id).addEventListener('change', () => {
const k = i ? 'b' : 'a', c = RS.scene.get(el(id).value);
st.dati.aggancio = st.dati.aggancio || {};
st.dati.aggancio[k] = Object.assign({}, st.dati.aggancio[k], { id: c ? c.id : null, lettera: c ? c.letter : '' });
ridisegnaVista(); mostraAggancio();
}));
eventiFoto(el('raddFoto')); eventiVista(el('raddVista'));
return m;
}
function vistaFoto() {
const cv = el('raddFoto'), F = st.fonte;
const k = cv.width / F.width * st.z;
return { k, img2c: p => [(p[0] - st.ox) * k, (p[1] - st.oy) * k], c2img: q => [q[0] / k + st.ox, q[1] / k + st.oy] };
}
function adatta() {
const cv = el('raddFoto'), F = st.fonte, box = cv.parentElement.getBoundingClientRect();
const maxH = Math.max(260, window.innerHeight * 0.52), w = Math.max(280, Math.min(box.width || 600, maxH * F.width / F.height));
cv.width = Math.round(w * (window.devicePixelRatio || 1)); cv.height = Math.round(cv.width * F.height / F.width);
cv.style.width = w + 'px'; cv.style.height = (w * F.height / F.width) + 'px';
st.z = 1; st.ox = 0; st.oy = 0;
}
function limitaVista() {
const F = st.fonte, vw = F.width / st.z, vh = F.height / st.z;
st.ox = Math.max(0, Math.min(F.width - vw, st.ox)); st.oy = Math.max(0, Math.min(F.height - vh, st.oy));
}
function zoom(f, cx, cy) {
const V = vistaFoto(), cv = el('raddFoto');
const p = V.c2img([cx == null ? cv.width / 2 : cx, cy == null ? cv.height / 2 : cy]);
st.z = Math.max(1, Math.min(12, st.z * f));
const k = cv.width / st.fonte.width * st.z;
st.ox = p[0] - (cx == null ? cv.width / 2 : cx) / k; st.oy = p[1] - (cy == null ? cv.height / 2 : cy) / k;
limitaVista(); ridisegnaFoto();
}
function ridisegnaFoto() {
const cv = el('raddFoto'), c = cv.getContext('2d'), F = st.fonte, V = vistaFoto();
c.fillStyle = '#222'; c.fillRect(0, 0, cv.width, cv.height);
c.drawImage(F, st.ox, st.oy, F.width / st.z, F.height / st.z, 0, 0, cv.width, cv.height);
const r = Math.max(9, cv.width / 60);
disegnaPunti(c, st.pts.map(V.img2c), r);
if (st.drag >= 0) {
const p = st.pts[st.drag], q = V.img2c(p), R = Math.min(cv.width, cv.height) * 0.2, mag = 3;
const lx = q[0] < cv.width / 2 ? cv.width - R - 8 : R + 8, ly = R + 8;
c.save(); c.beginPath(); c.arc(lx, ly, R, 0, 7); c.clip();
const sw = 2 * R / (V.k * mag);
c.drawImage(F, p[0] - sw / 2, p[1] - sw / 2, sw, sw, lx - R, ly - R, 2 * R, 2 * R);
c.strokeStyle = '#ffcc33'; c.lineWidth = 1.5;
c.beginPath(); c.moveTo(lx - R, ly); c.lineTo(lx + R, ly); c.moveTo(lx, ly - R); c.lineTo(lx, ly + R); c.stroke();
c.restore();
c.strokeStyle = '#fff'; c.lineWidth = 3; c.beginPath(); c.arc(lx, ly, R, 0, 7); c.stroke();
}
}
function puntoCanvas(cv, ev) { const r = cv.getBoundingClientRect(); return [(ev.clientX - r.left) * cv.width / r.width, (ev.clientY - r.top) * cv.height / r.height]; }
function eventiFoto(cv) {
let pan = null;
cv.addEventListener('pointerdown', ev => {
if (!st) return;
const q = puntoCanvas(cv, ev), V = vistaFoto(), r = Math.max(18, cv.width / 30);
st.drag = st.pts.findIndex(p => { const c = V.img2c(p); return Math.hypot(c[0] - q[0], c[1] - q[1]) < r; });
if (st.drag < 0) pan = { q, ox: st.ox, oy: st.oy };
cv.setPointerCapture(ev.pointerId); ev.preventDefault();
});
cv.addEventListener('pointermove', ev => {
if (!st) return;
const q = puntoCanvas(cv, ev), V = vistaFoto();
if (st.drag >= 0) {
const p = V.c2img(q);
st.pts[st.drag] = [Math.max(0, Math.min(st.fonte.width, p[0])), Math.max(0, Math.min(st.fonte.height, p[1]))];
ridisegnaFoto();
} else if (pan) {
st.ox = pan.ox - (q[0] - pan.q[0]) / V.k; st.oy = pan.oy - (q[1] - pan.q[1]) / V.k; limitaVista(); ridisegnaFoto();
}
});
const fine = () => { if (!st) return; const mosso = st.drag >= 0; st.drag = -1; pan = null; ridisegnaFoto(); if (mosso) ricalcola(); };
cv.addEventListener('pointerup', fine); cv.addEventListener('pointercancel', fine);
cv.addEventListener('wheel', ev => { if (!st) return; ev.preventDefault(); const q = puntoCanvas(cv, ev); zoom(ev.deltaY < 0 ? 1.25 : 0.8, q[0], q[1]); }, { passive: false });
}
function eventiVista(cv) {
cv.addEventListener('pointerdown', ev => {
if (!st || !st.V) return;
const q = puntoCanvas(cv, ev), P = aMetri(st.V, q[0], q[1]);
const modo = (document.querySelector('input[name="raddModo"]:checked') || {}).value || 'misura';
if (modo === 'misura') {
if (!st.parziale) { st.parziale = P; ridisegnaVista(); return; }
const a = st.parziale; st.parziale = null;
const val = Math.round(Math.hypot(P[0] - a[0], P[1] - a[1]) * 100) / 100;
if (val < 0.05) { ridisegnaVista(); return; }
st.dati.misure = st.dati.misure || [];
st.dati.misure.push({ a, b: P, val, descr: 'Misura ' + (st.dati.misure.length + 1) + ' da foto' + (st.e.n ? ' n. ' + st.e.n : '') });
ridisegnaVista(); mostraMisure();
} else {
const k = modo === 'aggA' ? 'a' : 'b', sel = el(modo === 'aggA' ? 'raddCapA' : 'raddCapB'), c = RS.scene.get(sel.value);
if (!c) { RS.ui.toast('Scegli prima il caposaldo nel menu', 3000); return; }
st.dati.aggancio = st.dati.aggancio || {};
st.dati.aggancio[k] = { id: c.id, lettera: c.letter, X: P[0], Y: P[1] };
ridisegnaVista(); mostraAggancio();
}
});
}
function ridisegnaVista() {
const cv = el('raddVista'), c = cv.getContext('2d');
if (!st.V) { cv.width = 400; cv.height = 200; c.fillStyle = '#eee'; c.fillRect(0, 0, 400, 200); c.fillStyle = '#555'; c.font = '14px Arial'; c.fillText('Completa il riferimento per vedere la vista.', 20, 100); return; }
if (cv.width !== st.V.cv.width || cv.height !== st.V.cv.height) { cv.width = st.V.cv.width; cv.height = st.V.cv.height; }
c.drawImage(st.V.cv, 0, 0); decora(c, st.V, st.dati, { parziale: st.parziale });
}
function ricalcola() {
const L = numero(el('raddL').value), W = numero(el('raddW').value);
st.dati.L = L; st.dati.W = W;
const avvisi = [];
if (!(L > 0) || !(W > 0)) avvisi.push('Scrivi le due misure del riferimento, in metri.');
else if (!convesso(st.pts)) avvisi.push('I punti 1–4 non formano un quadrilatero: vanno messi nell\'ordine, girando attorno al rettangolo.');
st.V = avvisi.length ? null : calcola(st.fonte, st.pts, L, W, 1400);
if (!avvisi.length && !st.V) avvisi.push('Con questi punti la vista non si può calcolare: controlla che i vertici siano a terra e ben separati.');
const lati = st.pts.map((p, i) => Math.hypot(st.pts[(i + 1) % 4][0] - p[0], st.pts[(i + 1) % 4][1] - p[1]));
if (st.V && Math.min.apply(null, lati) < Math.max(25, st.fonte.width * 0.03)) avvisi.push('Il riferimento è piccolo nella foto: ingrandisci e posiziona i punti con cura, oppure usa un riferimento più grande.');
el('raddAvvisi').innerHTML = avvisi.map(a => `<div class="radd-avv">⚠ ${esc(a)}</div>`).join('');
if (st.V && st.Vprec && st.dati.misure) st.dati.misure.forEach(m => {
const pa = applica(st.Vprec.r2p, m.a[0], m.a[1]), pb = applica(st.Vprec.r2p, m.b[0], m.b[1]);
const a = applica(st.V.p2r, pa[0], pa[1]), b = applica(st.V.p2r, pb[0], pb[1]);
m.a = [a[0], a[1]]; m.b = [b[0], b[1]]; m.val = Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) * 100) / 100;
});
if (st.V && st.Vprec && st.dati.aggancio) ['a', 'b'].forEach(k => {
const g = st.dati.aggancio[k]; if (!g || g.X == null) return;
const p = applica(st.Vprec.r2p, g.X, g.Y), q = applica(st.V.p2r, p[0], p[1]); g.X = q[0]; g.Y = q[1];
});
if (st.V) st.Vprec = st.V;
ridisegnaVista(); mostraMisure(); mostraAggancio();
}
function mostraMisure() {
const box = el('raddMisure'), M = st.dati.misure || [];
if (!M.length) { box.innerHTML = '<div class="radd-hint">Nessuna misura: clicca l\'inizio e la fine di ciò che vuoi misurare sulla vista.</div>'; return; }
const diag = Math.hypot(st.dati.L || 0, st.dati.W || 0), cx = (st.dati.L || 0) / 2, cy = (st.V ? st.V.sg : 1) * (st.dati.W || 0) / 2;
box.innerHTML = M.map((m, i) => {
const lontano = Math.max(Math.hypot(m.a[0] - cx, m.a[1] - cy), Math.hypot(m.b[0] - cx, m.b[1] - cy)) > 3 * diag;
const sc = m.nastro ? m.val - m.nastro : null;
if (st.V) {
const pa = applica(st.V.r2p, m.a[0], m.a[1]), pb = applica(st.V.r2p, m.b[0], m.b[1]);
m.inc = Math.round(incertezza(st.pts, st.dati.L, st.dati.W, st.V.sg, pa, pb, passoClic(st.fonte)) * 100) / 100;
}
const incerta = m.inc != null && m.inc > Math.max(0.05, m.val * 0.03);
return `<div class="radd-mis">
        <span class="n">${i + 1})</span><input data-rm="descr" data-i="${i}" value="${esc(m.descr)}">
        <b>${virgola(m.val)} m</b>${m.inc != null ? `<span class="${incerta ? 'warn' : 'ok'}" title="Di quanto cambia la misura spostando i vertici del riferimento di un clic (circa 2 pixel)">± ${virgola(m.inc)} m</span>` : ''}
        <label>a nastro <input data-rm="nastro" data-i="${i}" inputmode="decimal" placeholder="—" value="${m.nastro ? virgola(m.nastro) : ''}"></label>
        ${sc != null ? `<span class="${Math.abs(sc) > Math.max(0.1, m.nastro * 0.03) ? 'warn' : 'ok'}">scarto ${sc >= 0 ? '+' : ''}${virgola(sc)} m</span>` : ''}
        ${m.inElenco ? '<span class="ok">nell\'elenco</span>' : ''}
        <button class="mini" data-rm="via" data-i="${i}" title="Togli">✕</button>
        ${incerta ? '<div class="radd-avv">⚠ Misura poco precisa: ingrandisci la foto e rimetti con cura i vertici, oppure usa un riferimento più grande o più vicino.</div>'
: lontano ? '<div class="radd-avv">⚠ Lontana dal riferimento: la precisione è ridotta.</div>' : ''}</div>`;
}).join('');
box.querySelectorAll('[data-rm]').forEach(x => {
const i = +x.dataset.i, k = x.dataset.rm;
if (k === 'via') x.onclick = () => { M.splice(i, 1); ridisegnaVista(); mostraMisure(); };
else x.onchange = () => { if (k === 'descr') M[i].descr = x.value; else { const v = numero(x.value); M[i].nastro = v > 0 ? v : null; mostraMisure(); } };
});
}
function mostraAggancio() {
const box = el('raddAgg'), c = confrontoAggancio(st.dati);
if (!capisaldi().length) { box.innerHTML = '<div class="radd-hint">Per agganciare la vista al rilievo servono due capisaldi nel disegno, visibili anche nella foto.</div>'; return; }
box.innerHTML = c ? `<div class="radd-hint">Capisaldi <b>${esc(c.A.letter)}–${esc(c.B.letter)}</b>: ${virgola(c.disegno)} m nel rilievo, ${virgola(c.foto)} m sulla vista
        — <span class="${Math.abs(c.perc) > 3 ? 'warn' : 'ok'}">scarto ${c.scarto >= 0 ? '+' : ''}${virgola(c.scarto)} m (${virgola(c.perc, 1)}%)</span>. Inserendo la vista nel disegno, i due capisaldi coincidono.</div>`
: '<div class="radd-hint">Facoltativo: scegli due capisaldi e indicali sulla vista; la vista si inserirà nel disegno già al suo posto e l\'app confronterà le distanze.</div>';
}
function azione(k) {
if (!st) return;
const S = RS.scene, ui = RS.ui;
if (k === 'zin') { zoom(1.4); return; }
if (k === 'zout') { zoom(1 / 1.4); return; }
if (k === 'zfit') { st.z = 1; st.ox = 0; st.oy = 0; ridisegnaFoto(); return; }
if (k === 'chiudi') { chiudi(); return; }
if (k === 'togli') {
if (!confirm('Togliere il raddrizzamento da questa foto? La foto resta com\'è; le misure già aggiunte all\'elenco restano.')) return;
delete st.e.radd; S.snapshot(); S.emit('change'); chiudi(); ui.renderProps(); ui.toast('Raddrizzamento tolto'); return;
}
if (!st.V) { ui.toast('Prima completa il riferimento (punti e misure)', 3000); return; }
salva();
if (k === 'salva') { chiudi(); ui.toast('Raddrizzamento salvato con la foto'); return; }
if (k === 'elenco') {
const nuove = (st.dati.misure || []).filter(m => !m.inElenco);
if (!nuove.length) { ui.toast('Nessuna misura nuova da aggiungere', 3000); return; }
S.misure = S.misure || [];
nuove.forEach(m => { S.misure.push({ descr: m.descr + ' (da raddrizzamento fotografico' + (m.inc != null ? ', ± ' + virgola(m.inc) + ' m' : '') + ')', val: m.val, radd: st.e.id }); m.inElenco = true; });
salva(); S.emit('change'); mostraMisure();
ui.toast(nuove.length + (nuove.length === 1 ? ' misura aggiunta' : ' misure aggiunte') + ' all\'elenco, con la nota «da raddrizzamento fotografico»', 4000);
return;
}
if (k === 'sfondo') { inserisci(); return; }
if (k === 'stampa') {
const w = window.open('', '_blank'); if (!w) { alert('Consenti le finestre popup per stampare la tavola.'); return; }
w.document.write('<p style="font:14px Arial;padding:20px">Preparazione della tavola…</p>');
tavola(st.e).then(html => {
w.document.open();
w.document.write(`<!DOCTYPE html><html lang="it"><head><meta charset="utf-8"><title>Raddrizzamento fotografico</title><style>
          @page{size:A4 portrait;margin:14mm}body{font:12.5px/1.45 "Times New Roman",Georgia,serif;color:#111}${CSS_TAVOLA}
          .noprint{text-align:center;margin:8px}button{padding:8px 16px}@media print{.noprint{display:none}}</style></head><body>
          <div class="noprint"><button onclick="try{opener.RilsinAndroid.stampa()}catch(e){window.print()}">🖨 Stampa / Salva PDF</button></div>${html}</body></html>`);
w.document.close();
});
}
}
function salva() {
const F = st.fonte;
st.e.radd = {
pts: st.pts.map(p => [p[0] / F.width, p[1] / F.height]), L: st.dati.L, W: st.dati.W, tipo: st.dati.tipo || '',
misure: (st.dati.misure || []).map(m => Object.assign({}, m)), aggancio: st.dati.aggancio ? JSON.parse(JSON.stringify(st.dati.aggancio)) : null
};
RS.scene.snapshot(); RS.scene.emit('change');
}
function chiudi() { const m = el('raddModal'); if (m) m.hidden = true; document.removeEventListener('keydown', tasti); st = null; }
function tasti(ev) { if (ev.key === 'Escape') chiudi(); }
function inserisci() {
const S = RS.scene, V = calcola(st.fonte, st.pts, st.dati.L, st.dati.W, 1600); if (!V) return;
const href = V.cv.toDataURL('image/jpeg', 0.85), w = V.bw, h = V.bh;
const c = confrontoAggancio(st.dati);
let x, y, rot = 0;
const loc = (X, Y) => [X - V.x0 - w / 2, Y - V.y0 - h / 2];
if (c) {
const ag = st.dati.aggancio;
rot = Math.atan2(c.B.y - c.A.y, c.B.x - c.A.x) - Math.atan2(ag.b.Y - ag.a.Y, ag.b.X - ag.a.X);
const la = loc(ag.a.X, ag.a.Y), co = Math.cos(rot), si = Math.sin(rot);
x = c.A.x - (la[0] * co - la[1] * si); y = c.A.y - (la[0] * si + la[1] * co);
} else { const v = S.view; x = v.x + v.w / 2; y = v.y + v.h / 2; }
const vecchia = S.elements.find(e => e.type === 'image' && e.raddDa === st.e.id);
const dati = { type: 'image', href, x, y, rot: rot * 180 / Math.PI, w, h, opacity: 0.75, locked: false, z: -1000, raddDa: st.e.id };
let e;
if (vecchia) { Object.assign(vecchia, dati); e = vecchia; S.render(); S.snapshot(); }
else e = S.add(dati);
chiudi(); S.select(e.id);
RS.ui.toast(c ? 'Vista inserita in scala, con i capisaldi ' + c.A.letter + ' e ' + c.B.letter + ' al loro posto' : 'Vista inserita in scala al centro della vista: spostala e ruotala sul rilievo, poi «Blocca sfondo»', 5000);
}
RS.raddrizza = {
calcola, omografia, applica, convesso, tavola, CSS_TAVOLA, confrontoAggancio,
fonti() { return RS.scene.elements.filter(e => (e.type === 'foto' || e.type === 'image') && e.radd && e.href); },
async tavole() {
const f = this.fonti().sort((a, b) => (a.n || 0) - (b.n || 0)), out = [];
for (let i = 0; i < f.length; i++) out.push(await tavola(f[i], f.length > 1 ? i + 1 : 0));
return out.join('');
},
apri(e) {
if (!e || !e.href) { RS.ui.toast('Questa foto non ha un\'immagine', 3000); return; }
caricaFonte(e.href).then(fonte => {
const m = finestra();
st = { e, fonte, drag: -1, z: 1, ox: 0, oy: 0, parziale: null, V: null, Vprec: null,
dati: e.radd ? JSON.parse(JSON.stringify(e.radd)) : { L: 5, W: 2.5, tipo: RIFERIMENTI[0][1], misure: [], aggancio: null } };
const W0 = fonte.width, H0 = fonte.height;
st.pts = e.radd ? e.radd.pts.map(p => [p[0] * W0, p[1] * H0])
: [[W0 * 0.36, H0 * 0.78], [W0 * 0.64, H0 * 0.78], [W0 * 0.6, H0 * 0.58], [W0 * 0.4, H0 * 0.58]];
el('raddTitolo').textContent = '📐 Raddrizzamento fotografico — ' + nomeFonte(e);
const rif = RIFERIMENTI.find(r => r[1] === st.dati.tipo) || RIFERIMENTI[RIFERIMENTI.length - 1];
el('raddTipo').value = rif[0]; el('raddL').value = virgola(st.dati.L); el('raddW').value = virgola(st.dati.W);
const caps = capisaldi(), opz = '<option value="">—</option>' + caps.map(c => `<option value="${esc(c.id)}">${esc(c.letter)}</option>`).join('');
el('raddCapA').innerHTML = opz; el('raddCapB').innerHTML = opz;
const ag = st.dati.aggancio || {};
if (ag.a && ag.a.id) el('raddCapA').value = ag.a.id;
if (ag.b && ag.b.id) el('raddCapB').value = ag.b.id;
if (!el('raddCapA').value && caps[0]) { el('raddCapA').value = caps[0].id; }
if (!el('raddCapB').value && caps[1]) { el('raddCapB').value = caps[1].id; }
m.hidden = false;
document.addEventListener('keydown', tasti);
requestAnimationFrame(() => { adatta(); ridisegnaFoto(); ricalcola(); });
}).catch(err => RS.ui.toast('Impossibile aprire la foto: ' + err.message, 4000));
},
comando() {
const S = RS.scene, ui = RS.ui;
const sel = S.selection.length === 1 ? S.get(S.selection[0]) : null;
if (sel && (sel.type === 'foto' || sel.type === 'image') && !sel.raddDa && !sel.geo && sel.href) { this.apri(sel); return; }
const foto = S.elements.filter(e => e.type === 'foto' && e.href).sort((a, b) => (a.n || 0) - (b.n || 0)).slice(0, 8);
ui.scelta({
titolo: 'Raddrizzamento fotografico',
testo: 'Scegli la fotografia scattata in obliquo che mostra a terra un rettangolo di misure note (stallo, riquadro, metro rigido).',
opzioni: foto.map(f => ({ k: f.id, t: 'Foto ' + (f.n || ''), d: f.descr || (f.radd ? 'già raddrizzata' : '') }))
.concat([{ k: '+', t: '📷 Nuova foto dal dispositivo', d: 'Diventa un segnaposto foto al centro della vista', primario: !foto.length }])
}).then(k => {
if (!k) return;
if (k !== '+') { this.apri(S.get(k)); return; }
const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
inp.onchange = () => {
const f = inp.files && inp.files[0]; if (!f) return;
const r = new FileReader();
r.onload = () => {
const im = new Image();
im.onload = () => {
const k2 = Math.min(1, 1600 / Math.max(im.naturalWidth, im.naturalHeight)), cv = document.createElement('canvas');
cv.width = Math.round(im.naturalWidth * k2); cv.height = Math.round(im.naturalHeight * k2);
cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
const v = S.view, n = S.elements.filter(e => e.type === 'foto').reduce((a, e) => Math.max(a, e.n || 0), 0) + 1;
const e = S.add({ type: 'foto', x: v.x + v.w / 2, y: v.y + v.h / 2, n, descr: '', href: cv.toDataURL('image/jpeg', 0.82), size: 0.9 });
S.select(e.id); this.apri(e);
};
im.src = r.result;
};
r.readAsDataURL(f);
};
inp.click();
});
}
};
})(window.RS = window.RS || {});

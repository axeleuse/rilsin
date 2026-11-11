(function (RS) {
'use strict';
const FONT_DISEGNO = 'Arial, Helvetica, sans-serif';
const exportUtil = {
download(blob, name) {
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url; a.download = name; document.body.appendChild(a); a.click();
setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 500);
},
buildSvg(opts) {
opts = opts || {};
const s = RS.scene;
const b = s.contentBounds() || { x: 0, y: 0, w: s.world.w, h: s.world.h };
const m = opts.margin != null ? opts.margin : 2;
const R = opts.riquadro;
const bx = R ? R.x : b.x - m, by = R ? R.y : b.y - m, w = R ? R.w : b.w + m * 2, h = R ? R.h : b.h + m * 2;
const NS = 'http://www.w3.org/2000/svg';
const parts = [];
parts.push(`<svg xmlns="${NS}" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="${bx} ${by} ${w} ${h}" font-family="${FONT_DISEGNO}" ${opts.sizeAttr || ''}>`);
parts.push(`<defs>${s.defs.innerHTML}${s.defsDyn ? s.defsDyn.innerHTML : ''}</defs>`);
parts.push(`<rect x="${bx}" y="${by}" width="${w}" height="${h}" fill="#ffffff"/>`);
if (opts.grid) parts.push(`<g opacity="0.5">${s.gGrid.innerHTML}</g>`);
const haScalaGrafica = s.elements.some(e => e.type === 'graphscale' && (!RS.layers || RS.layers.visible(e)));
const poS = s.printOptions ? s.printOptions() : {};
const minS = (!opts.miniatura && poS.simboli !== false && !s.fuoriScala) ? 0.0035 * (s.scaleDenom || 100) : 0;
let contenuto = s.gElements.innerHTML;
if (opts.bn || minS) {
RS.bn = !!opts.bn; RS.minSimbolo = minS;
try { s.render(true); if (opts.bn) stradeTecniche(s.gElements); contenuto = s.gElements.innerHTML; }
finally { RS.bn = false; RS.minSimbolo = 0; s.render(true); }
} else if (haScalaGrafica) { s.render(true); contenuto = s.gElements.innerHTML; }
parts.push(`<g>${contenuto}</g>`);
if (!opts.senzaCornice) parts.push(`<rect x="${bx+0.1}" y="${by+0.1}" width="${w-0.2}" height="${h-0.2}" fill="none" stroke="#222" stroke-width="0.08"/>`);
parts.push('</svg>');
const svg = parts.join('\n');
return { svg: opts.bn ? inGrigio(svg) : svg, bx, by, w, h, contentW: b.w };
},
exportSVG() {
const tv = this.buildTavola({ bn: RS.scene.printOptions().bn });
const blob = new Blob([tv.sized], { type: 'image/svg+xml' });
this.download(blob, (docTitle() || 'scena') + '.svg');
},
exportPNG() {
const tv = this.buildTavola({ bn: RS.scene.printOptions().bn });
const dpi = 250, W = Math.round(tv.PW / 25.4 * dpi), H = Math.round(tv.PH / 25.4 * dpi);
const sized = tv.svg.replace('<svg ', `<svg width="${W}" height="${H}" `);
const img = new Image();
const blob = new Blob([sized], { type: 'image/svg+xml' });
const url = URL.createObjectURL(blob);
img.onload = () => {
const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
const ctx = cv.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0,0,W,H);
ctx.drawImage(img, 0, 0);
cv.toBlob(bl => { this.download(bl, (docTitle() || 'scena') + '.png'); URL.revokeObjectURL(url); }, 'image/png');
};
img.onerror = () => { alert('Errore nella generazione PNG.'); URL.revokeObjectURL(url); };
img.src = url;
},
thumbDataURL(maxPx) {
maxPx = maxPx || 200;
return new Promise(resolve => {
try {
const r = this.buildSvg({ miniatura: true });
const scale = Math.min(maxPx / Math.max(r.w, 0.01), maxPx / Math.max(r.h, 0.01));
const W = Math.max(1, Math.round(r.w * scale)), H = Math.max(1, Math.round(r.h * scale));
const sized = r.svg.replace('<svg ', `<svg width="${W}" height="${H}" `);
const blob = new Blob([sized], { type: 'image/svg+xml' });
const url = URL.createObjectURL(blob);
const img = new Image();
const done = v => { try { URL.revokeObjectURL(url); } catch (e) {} resolve(v); };
img.onload = () => {
try {
const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
const ctx = cv.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
ctx.drawImage(img, 0, 0);
done(cv.toDataURL('image/png'));
} catch (e) { done(''); }
};
img.onerror = () => done('');
img.src = url;
} catch (e) { resolve(''); }
});
},
a4Plan() {
const T = this.pianoTavola();
return { denom: T.denom, landscape: T.landscape, note: T.note };
},
pianoTavola(meno) {
const s = RS.scene, b = (s.boundsDisegno ? s.boundsDisegno() : s.contentBounds()) || { x: 0, y: 0, w: s.world.w, h: s.world.h };
const cw = b.w + 4, ch = b.h + 4;
const po = s.printOptions ? s.printOptions() : {};
const o = po.orient || 'auto', force = (o === 'portrait' || o === 'landscape') ? o : null;
const geo = land => {
const PW = land ? 271 : 184, PH = (land ? 184 : 271) - (meno || 0), testa = 9;
const Ly = disposizione(land, s, po, s.meta || {}, PW, PH, testa), { ax, ay, Aw, Ah } = Ly;
return { landscape: land, PW, PH, testa, ax, ay, Aw, Ah, Ly, Dmin: Math.max(cw * 1000 / (Aw - 4), ch * 1000 / (Ah - 4)) };
};
const L = geo(true), P = geo(false), cand = force ? [force === 'landscape' ? L : P] : [L, P];
let g, denom, tagliata = false;
if (s.fuoriScala) { g = cand.reduce((a, c) => c.Dmin < a.Dmin ? c : a); denom = g.Dmin; }
else {
const sel = s.scaleDenom || 100;
g = cand.find(c => sel >= c.Dmin);
if (g) denom = sel;
else if (po.scalaFissa) {
g = cand.reduce((a, c) => c.Dmin < a.Dmin ? c : a); denom = sel; tagliata = true;
} else {
const NICE = [50, 100, 150, 200, 250, 300, 400, 500, 750, 1000, 1500, 2000, 2500, 5000, 10000];
let best = null;
cand.forEach(c => { const d = NICE.find(n => n >= c.Dmin) || NICE[NICE.length - 1]; if (!best || d < best.d) best = { c, d }; });
g = best.c; denom = best.d;
}
}
const note = s.fuoriScala ? 'A4 ' + (g.landscape ? 'orizzontale' : 'verticale') + ' — DISEGNO NON IN SCALA (schizzo).'
: `A4 ${g.landscape ? 'orizzontale' : 'verticale'} — scala 1:${denom}` + (denom !== s.scaleDenom ? ` (adattata per stare in A4; scala scelta 1:${s.scaleDenom}. Per tenerla: «Mantieni sempre la scala scelta»)` : '') +
(tagliata ? ' — alla scala scelta il disegno è più grande del foglio: le parti fuori dalla cornice tratteggiata non si stampano' : '') + (force ? ' — orientamento forzato' : '') + '.';
return Object.assign(g, { denom, note, adattata: denom !== s.scaleDenom, tagliata, centro: { x: b.x + b.w / 2, y: b.y + b.h / 2 } });
},
buildTavola(opz) {
opz = opz || {};
const s = RS.scene, T = this.pianoTavola(opz.meno || 0), D = T.denom, k = 1000 / D;
const po = s.printOptions ? s.printOptions() : {}, meta = s.meta || {};
const f = v => +(+v).toFixed(2);
const old = s.scaleDenom; if (!s.fuoriScala) s.scaleDenom = D;
let r;
const aw = T.Aw / k, ah = T.Ah / k, cc = T.centro || { x: 0, y: 0 };
const riquadro = s.fuoriScala ? null : { x: cc.x - aw / 2, y: cc.y - ah / 2, w: aw, h: ah };
try { r = this.buildSvg({ footer: false, margin: 2, bn: !!opz.bn, senzaFiligrana: true, senzaCornice: true, riquadro }); }
finally { s.scaleDenom = old; ridisegnaSeScala(s); }
const dw = r.w * k, dh = r.h * k, dx = T.ax + (T.Aw - dw) / 2, dy = T.ay + (T.Ah - dh) / 2;
const { PW, PH, testa } = T;
const out = [], C = '#111';
const t = (x, y, size, txt, x2) => out.push(`<text x="${f(x)}" y="${f(y)}" font-size="${size}"${x2 || ''}${/fill=/.test(x2 || '') ? '' : ` fill="${C}"`}>${esc(txt)}</text>`);
const ln = (x1, y1, x2, y2, sw, extra) => out.push(`<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${C}" stroke-width="${sw}"${extra || ''}/>`);
const wrap = (txt, w, size) => {
const max = Math.max(8, Math.floor(w / (size * 0.5))), righe = []; let cur = '';
String(txt).split(/\s+/).forEach(p => { if ((cur + ' ' + p).trim().length > max && cur) { righe.push(cur); cur = p; } else cur = (cur + ' ' + p).trim(); });
if (cur) righe.push(cur); return righe;
};
out.push(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${PW} ${PH}" font-family="${FONT_DISEGNO}">`);
out.push(`<rect width="${PW}" height="${PH}" fill="#ffffff"/>`);
out.push(r.svg.replace('<svg ', `<svg x="${f(dx)}" y="${f(dy)}" width="${f(dw)}" height="${f(dh)}" `));
if (s.elements.some(e => e.type === 'image' && e.fonte === 'Google Maps' && (!RS.layers || RS.layers.visible(e))))
t(T.ax + 2, T.ay + T.Ah - 2, 2.2, 'Sfondo: immagini © Google (Google Maps)');
const bozza = (po.bozza || (RS.verifica && !RS.verifica.chiuso()));
if (bozza && !opz.senzaFiligrana) {
const cx = T.ax + T.Aw / 2, cy = T.ay + T.Ah / 2, fs = Math.min(T.Aw, T.Ah) * 0.22;
out.push(`<text x="${f(cx)}" y="${f(cy)}" font-size="${f(fs)}" font-weight="bold" fill="#c00" opacity="0.14" text-anchor="middle" dy="0.35em" letter-spacing="${f(fs * 0.12)}" transform="rotate(-32 ${f(cx)} ${f(cy)})">BOZZA</text>`);
}
out.push(`<rect x="0.25" y="0.25" width="${PW - 0.5}" height="${PH - 0.5}" fill="none" stroke="${C}" stroke-width="0.5"/>`);
ln(0, testa, PW, testa, 0.35);
const titolo = po.titolo || (s.fuoriScala ? 'SCHIZZO PLANIMETRICO DEL CAMPO DEL SINISTRO' : 'PLANIMETRIA DEL CAMPO DEL SINISTRO');
t(3, 6, 3.6, titolo, ' font-weight="bold" letter-spacing="0.15"');
t(PW - 3, 6, 2.7, 'Allegato al verbale di rilievi' + (meta.numero && po.numero !== false ? ' n. ' + meta.numero + ' di prot.' : ''), ' text-anchor="end"');
const Ly = T.Ly, P = Ly.pann;
const disegnaRiquadro = (quale, x, y, w, h) => {
const X = x + 3, W = w - 6;
if (quale === 'firme') {
t(x + w / 2, y + 4.5, 2.6, 'I VERBALIZZANTI', ' text-anchor="middle" font-weight="bold"');
ln(X + 4, y + 10.5, X + W - 4, y + 10.5, 0.2, ' stroke-dasharray="0.6 0.8"');
ln(X + 4, y + 15, X + W - 4, y + 15, 0.2, ' stroke-dasharray="0.6 0.8"');
} else if (quale === 'scala') {
const nordSulDisegno = s.elements.some(e => e.type === 'north' && (!RS.layers || RS.layers.visible(e)));
const nord = po.nord !== false && !nordSulDisegno;
if (nord) {
const nx = x + w - 8, ny = y + 8;
out.push(`<path d="M${nx} ${ny - 4.5} L${nx + 1.9} ${ny + 2.4} L${nx} ${ny + 0.9} L${nx - 1.9} ${ny + 2.4} Z" fill="${C}"/>`);
t(nx, ny - 5.3, 2.6, 'N', ' text-anchor="middle" font-weight="bold"');
}
if (s.fuoriScala) { t(X, y + 5.5, 3.2, 'NON IN SCALA', ' font-weight="bold" fill="#b00"'); t(X, y + 10, 2.3, 'schizzo proporzionato, valgono le misure'); }
else if (po.scala !== false) {
t(X, y + 5.2, 3.2, 'Scala 1:' + D, ' font-weight="bold"');
if (!s.elements.some(e => e.type === 'graphscale' && (!RS.layers || RS.layers.visible(e)))) {
const disp = W - (nord ? 14 : 2), NICE = [0.5, 1, 2, 2.5, 5, 10, 20, 25, 50, 100, 200, 500];
let seg = NICE[0]; NICE.forEach(v => { if (v * k * 5 <= disp) seg = v; });
for (let i = 0; i < 5; i++) out.push(`<rect x="${f(X + i * seg * k)}" y="${f(y + 8.2)}" width="${f(seg * k)}" height="1.3" fill="${i % 2 ? '#fff' : C}" stroke="${C}" stroke-width="0.15"/>`);
t(X, y + 12.4, 2, '0', ' text-anchor="middle"');
t(X + 5 * seg * k, y + 12.4, 2, String(+(seg * 5).toFixed(2)).replace('.', ',') + ' m', ' text-anchor="middle"');
}
}
} else if (quale === 'dati') {
righeDatiRilievo(po, meta, W).forEach((d, i) => { const yy = y + 3.6 + i * 3.1; if (d[0]) t(X, yy, 2.1, d[0], ' fill="#444"'); t(X + 17, yy, 2.3, d[1]); });
} else if (quale === 'comando') {
const c = righeComandoTav(po, meta, W), hC = altezzaRiquadro('comando', po, meta, W), yC = y + Math.max(0, (h - hC) / 2);
if (c.logoOk) {
const logo = RS.logoCC || (typeof location !== 'undefined' ? new URL('logocc.png', location.href).href : 'logocc.png');
out.push(`<image href="${logo}" xlink:href="${logo}" x="${f(X)}" y="${f(yC + (hC - c.lw) / 2)}" width="${c.lw}" height="${c.lw}" preserveAspectRatio="xMidYMid meet"/>`);
}
const yc0 = yC + (hC - c.righe.length * 3.2) / 2 + 2.4;
c.righe.forEach((r2, i) => t(X + c.lw + 2, yc0 + i * 3.2, r2[1] ? 2.6 : 2.4, r2[0], r2[1] ? ' font-weight="bold"' : ''));
}
};
const disegnaLegenda = (x, y0, w, y1) => {
const LX = x + 3, LW = w - 6; let ly = y0 + 4.5, pieno = false;
t(LX, ly, 2.9, 'LEGENDA', ' font-weight="bold" letter-spacing="0.2"'); ly += 4.6;
legendaTavola(s).forEach(sez => {
if (pieno) return;
if (ly + 3 > y1 - 2) { pieno = true; return; }
t(LX, ly, 2.6, sez.t, ' font-weight="bold"'); ly += 3.5;
sez.r.forEach(rr => aCapoMm(rr, LW - 2, 2.5).forEach((riga, i) => {
if (pieno) return;
if (ly > y1 - 2.5) { t(LX + 1, ly, 2.5, '…'); pieno = true; return; }
t(LX + (i ? 3 : 1), ly, 2.5, riga); ly += 3.3;
}));
ly += 1.6;
});
};
const pila = (x, w, y1) => {
const hs = Ly.ordine.map(kk => kk === 'scala' ? 14 : kk === 'firme' ? 17 : altezzaRiquadro(kk, po, meta, w - 6));
let y = y1 - hs.reduce((a, b) => a + b, 0); const inizio = y;
Ly.ordine.forEach((kk, i) => { ln(x, y, x + w, y, 0.25); disegnaRiquadro(kk, x, y, w, hs[i]); y += hs[i]; });
return inizio;
};
if (P.tipo === 'colonna') {
const xl = Ly.pos === 'sinistra' ? P.x + P.w : P.x; ln(xl, P.y, xl, PH, 0.35);
const yTop = pila(P.x, P.w, P.y + P.h);
if (Ly.legenda) disegnaLegenda(P.x, P.y, P.w, yTop);
} else if (P.tipo === 'fascia') {
const yb = Ly.pos === 'alto' ? P.y + P.h : P.y; ln(0, yb, PW, yb, 0.35);
const xr = PW * 0.55; ln(xr, P.y, xr, P.y + P.h, 0.35);
pila(xr, PW - xr, P.y + P.h);
disegnaLegenda(0, P.y, xr, P.y + P.h);
} else {
const yb = Ly.pos === 'alto' ? P.y + P.h : P.y; ln(0, yb, PW, yb, 0.35);
P.celle.forEach((c, i) => { if (i) ln(c.x, P.y, c.x, P.y + P.h, 0.25); disegnaRiquadro(c.k, c.x, P.y + 0.5, c.w, P.h - 1); });
}
out.push('</svg>');
const svg = opz.bn ? inGrigio(out.join('\n')) : out.join('\n');
return { svg, sized: svg.replace('<svg ', `<svg width="${PW}mm" height="${PH}mm" `), landscape: T.landscape, denom: D, note: T.note, PW, PH };
},
previewSvg() {
const s = RS.scene, tv = this.buildTavola({ bn: s.printOptions().bn });
return { svg: tv.svg, landscape: tv.landscape, note: tv.note };
},
planimetriaPdf() {
return new Promise((ok, ko) => {
try {
const s = RS.scene, tv = this.buildTavola({ bn: s.printOptions().bn }), dpi = 200;
const W = Math.round(tv.PW / 25.4 * dpi), H = Math.round(tv.PH / 25.4 * dpi);
const url = URL.createObjectURL(new Blob([tv.svg.replace('<svg ', `<svg width="${W}" height="${H}" `)], { type: 'image/svg+xml' }));
const img = new Image();
img.onload = () => {
try {
const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); g.drawImage(img, 0, 0, W, H);
const b = atob(cv.toDataURL('image/jpeg', 0.92).split(',')[1]), dati = new Uint8Array(b.length);
for (let i = 0; i < b.length; i++) dati[i] = b.charCodeAt(i);
URL.revokeObjectURL(url);
const D = RS.pdf.documento(), MM = 72 / 25.4;
if (tv.landscape) { D.P.w = 841.89; D.P.h = 595.28; }
const pw = tv.landscape ? 297 : 210, ph = tv.landscape ? 210 : 297;
D.immagine({ dati, w: W, h: H }, (pw - tv.PW) / 2 * MM, (ph - tv.PH) / 2 * MM, tv.PW * MM, tv.PH * MM);
ok(D.fine({ titolo: 'Planimetria del campo del sinistro' }));
} catch (e) { URL.revokeObjectURL(url); ko(e); }
};
img.onerror = () => { URL.revokeObjectURL(url); ko(new Error('immagine del foglio non disegnabile')); };
img.src = url;
} catch (e) { ko(e); }
});
},
print() {
const s = RS.scene;
if (RS.ios) {
if (RS.ui && RS.ui.toast) RS.ui.toast('Preparo il PDF della planimetria…', 2500);
this.planimetriaPdf().then(u => {
const nome = 'Planimetria ' + ((docTitle() || 'sinistro').replace(/[\\/:*?"<>|]+/g, ' ').trim()) + '.pdf';
this.download(new Blob([u], { type: 'application/pdf' }), nome);
}).catch(e => { if (RS.ui && RS.ui.toast) RS.ui.toast('PDF non riuscito: ' + (e && e.message || e), 5000); });
return;
}
const tv = this.buildTavola({ bn: s.printOptions().bn }), landscape = tv.landscape, sized = tv.sized;
const win = window.open('', '_blank');
if (!win) { alert('Consenti i popup per stampare.'); return; }
const orient = landscape ? 'landscape' : 'portrait';
win.document.write(`<!DOCTYPE html><html lang="it"><head><meta charset="utf-8">
        <title>Stampa — ${esc(docTitle())}</title>
        <style>
          @page{size:A4 ${orient};margin:8mm}
          html,body{margin:0;padding:0}
          .sheet{display:flex;justify-content:center;align-items:flex-start;padding:4mm}
          svg{max-width:100%;max-height:273mm;height:auto}
        </style></head><body>
        <div class="sheet">${sized}</div>
        <script>window.onload=function(){setTimeout(function(){try{opener.RilsinAndroid.stampa()}catch(e){window.print()}},250);};<\/script>
        </body></html>`);
win.document.close();
}
};
function grigio(r, g, b) { const y = Math.round(0.299*r + 0.587*g + 0.114*b); return [y, y, y]; }
function inGrigio(svg) {
return svg
.replace(/\bid="([^"]+)"/g, 'id="bn_$1"')
.replace(/url\(#([^)]+)\)/g, 'url(#bn_$1)')
.replace(/(?<![(\w])#([0-9a-f]{6}|[0-9a-f]{3})(?![\w-])/gi, (m, h) => {
if (h.length === 3) h = h.split('').map(c => c + c).join('');
const y = grigio(parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16))[0];
return '#' + y.toString(16).padStart(2, '0').repeat(3);
})
.replace(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(,\s*[\d.]+\s*)?\)/gi, (m, r, g, b, a) => {
const y = grigio(+r, +g, +b)[0];
return a ? `rgba(${y},${y},${y}${a})` : `rgb(${y},${y},${y})`;
});
}
exportUtil.inGrigio = inGrigio;
const STRADE = ['road', 'raccordo', 'roadway', 'curva', 'nucleo', 'ramp', 'roundabout', 'svasatura'], SEGNI = ['mark', 'stopline', 'crosswalk', 'zebrapath'];
function rgbDi(c) {
c = String(c || '').trim().toLowerCase();
if (!c || c === 'none' || c.indexOf('url(') === 0 || c === 'transparent') return null;
if (c === 'white') return [255, 255, 255];
if (c === 'black') return [0, 0, 0];
let m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(c);
if (m) { let h = m[1]; if (h.length === 3) h = h.split('').map(x => x + x).join(''); return [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16)); }
m = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(c);
return m ? [+m[1], +m[2], +m[3]] : null;
}
const chiaro = c => { const v = rgbDi(c); return !!v && v[0] > 225 && v[1] > 225 && v[2] > 225; };
const fondo = c => { const v = rgbDi(c); return !!v && !chiaro(c) && !(v[1] > v[0] + 15 && v[1] > v[2] + 15); };
function stradeTecniche(root) {
const NS = 'http://www.w3.org/2000/svg', FORME = 'rect,path,circle,ellipse,polygon,polyline,line';
const sel = t => t.map(x => '.el-' + x).join(',');
const contorni = document.createElementNS(NS, 'g');
contorni.setAttribute('class', 'bn-contorni');
const piena = n => n.tagName !== 'line' && fondo(n.getAttribute('fill'));
const tratto = n => !piena(n) && fondo(n.getAttribute('stroke')) && parseFloat(n.getAttribute('stroke-width')) >= 1;
const strade = root.querySelectorAll(sel(STRADE));
strade.forEach(g => {
const c = g.cloneNode(true);
c.querySelectorAll(FORME + ',text').forEach(n => {
if (n.tagName === 'text' || !(piena(n) || tratto(n))) { n.remove(); return; }
const largo = tratto(n) ? parseFloat(n.getAttribute('stroke-width')) + 0.16 : 0.16;
if (piena(n)) n.setAttribute('fill', '#000');
n.setAttribute('stroke', '#000'); n.setAttribute('stroke-width', String(largo));
n.removeAttribute('stroke-dasharray'); n.removeAttribute('vector-effect'); n.removeAttribute('opacity');
});
contorni.appendChild(c);
g.querySelectorAll(FORME).forEach(n => {
if (piena(n)) n.setAttribute('fill', '#fff');
else if (chiaro(n.getAttribute('fill'))) n.setAttribute('fill', '#000');
if (tratto(n)) n.setAttribute('stroke', '#fff');
else if (chiaro(n.getAttribute('stroke'))) n.setAttribute('stroke', '#000');
});
});
root.querySelectorAll(sel(SEGNI)).forEach(g => g.querySelectorAll(FORME + ',text').forEach(n => {
if (chiaro(n.getAttribute('fill'))) n.setAttribute('fill', '#000');
if (chiaro(n.getAttribute('stroke'))) n.setAttribute('stroke', '#000');
}));
if (strade.length) strade[0].parentNode.insertBefore(contorni, strade[0]);
}
exportUtil.stradeTecniche = stradeTecniche;
function ridisegnaSeScala(s) {
if (s.elements.some(e => e.type === 'graphscale')) s.render(true);
}
function legendaTavola(s, grezza) {
const vis = e => !RS.layers || RS.layers.visible(e), els = s.elements.filter(vis), sez = [];
const V = (k, t) => ({ k, t });
const it2 = v => Number(v).toFixed(2).replace('.', ',');
const caps = els.filter(e => e.letter).sort((a, b) => String(a.letter).localeCompare(String(b.letter)));
if (caps.length) {
const r = caps.map(c => V('cap:' + c.letter, c.letter + ' \u2014 ' + (c.descr || (c.nome && c.nome !== 'Caposaldo' ? c.nome : 'caposaldo'))));
(s.misure || []).forEach(x => {
const k = /^\s*([A-Za-z]{1,3})\s*(?:\u2192|->)\s*([A-Za-z]{1,3})\s*\(base\)/i.exec(x.descr || '');
if (k && x.val !== '' && x.val != null) r.push(V('base', 'Base ' + k[1].toUpperCase() + '\u2013' + k[2].toUpperCase() + ': m ' + it2(x.val)));
});
const metodi = new Set((RS.verifica && RS.verifica.puntiRilevati ? RS.verifica.puntiRilevati() : []).map(p => p.metodo === 'ortogonali' ? 'coordinate ortogonali' : 'triangolazione'));
if (metodi.size) r.push(V('metodo', 'Metodo: ' + [...metodi].join(' e ')));
sez.push({ t: 'Capisaldi e base di misura', r });
}
const strada = [];
if (RS.incroci) els.filter(e => e.type === 'incrocio').map(e => RS.incroci.descrizione(e)).filter((t, k, a) => t && a.indexOf(t) === k).forEach(t => strada.push(V('str:' + t, t)));
if (RS.curve) RS.curve.descrizioni().forEach(t => strada.push(V('curva:' + t, 'Curva: ' + t)));
if (strada.length) sez.push({ t: 'Strada', r: strada });
const veic = els.filter(e => e.type === 'vehicle');
if (veic.length) {
const r = [], viste = {};
veic.slice().sort((a, b) => String(a.label || '~').localeCompare(String(b.label || '~'), undefined, { numeric: true })).forEach(v => {
const L = v.label || '?';
if (!viste[L]) {
viste[L] = true;
const q = veic.find(x => (x.label || '?') === L && (!x.fase || x.fase === 'quiete')) || v;
const tipo = (RS.catalog.veicoloById(q.catId) || {}).nome || 'veicolo';
r.push(V('veic:' + L, L + ' \u2014 ' + [q.modello || tipo, q.targa ? String(q.targa).toUpperCase() : ''].filter(Boolean).join(' ') + (q.fase === 'quiete' ? ' (quiete)' : '')));
}
if (v.fase && v.fase !== 'quiete' && RS.elements.siglaFase) { const sg = RS.elements.siglaFase(v); r.push(V('fase:' + sg, sg + ' \u2014 ' + (RS.elements.nomeFase(v.fase) || '').toLowerCase())); }
});
sez.push({ t: 'Veicoli', r });
}
const altri = [];
els.filter(e => e.type === 'surveypt').sort((a, b) => (a.n || 0) - (b.n || 0)).forEach(e => altri.push(V('P:' + e.n, 'P' + e.n + ' \u2014 ' + (e.descr || 'punto di rilievo'))));
const nomiTracce = {};
els.filter(e => e.type === 'skid').forEach(e => { const n = e.stile === 'solco' ? 'solco / abrasione' : e.dashed ? 'scarrocciamento' : 'traccia di frenata'; nomiTracce[n] = 1; });
Object.keys(nomiTracce).forEach(n => altri.push(V('tr:' + n, n)));
const simboli = {};
els.filter(e => e.type === 'symbol' && !e.letter && !e.inc && e.nome).forEach(e => { simboli[e.nome] = 1; });
Object.keys(simboli).forEach(n => altri.push(V('sim:' + n, n.charAt(0).toLowerCase() + n.slice(1))));
if (els.some(e => e.type === 'measure')) altri.push(V('quote', 'quote in metri'));
if (altri.length) sez.push({ t: 'Elementi rilevati', r: altri });
if (grezza) return sez;
const L = (s.meta && s.meta.legenda) || {}, no = L.no || {}, nomi = L.nomi || {};
const fatta = sez.map(x => ({ t: x.t, r: x.r.filter(v => !no[v.k]).map(v => String(nomi[v.k] || '').trim() || v.t) })).filter(x => x.r.length);
const agg = (L.agg || []).map(t => String(t || '').trim()).filter(Boolean);
if (agg.length) fatta.push({ t: 'Altro', r: agg });
return fatta;
}
exportUtil.legendaTavola = legendaTavola;
const RIQUADRI = ['comando', 'dati', 'scala', 'firme'];
const NOMI_RIQUADRI = { comando: 'Comando e logo', dati: 'Dati del rilievo', scala: 'Scala e Nord', firme: 'Firme dei verbalizzanti' };
function ordineRiquadri(po) {
const o = Array.isArray(po && po.ordine) ? po.ordine.filter((k, i, a) => RIQUADRI.indexOf(k) >= 0 && a.indexOf(k) === i) : [];
RIQUADRI.forEach(k => { if (o.indexOf(k) < 0) o.push(k); });
return o;
}
function aCapoMm(txt, w, size) {
const max = Math.max(8, Math.floor(w / (size * 0.5))), righe = []; let cur = '';
String(txt).split(/\s+/).forEach(p => { if ((cur + ' ' + p).trim().length > max && cur) { righe.push(cur); cur = p; } else cur = (cur + ' ' + p).trim(); });
if (cur) righe.push(cur); return righe;
}
function inBozza(po) { return !!(po.bozza || (RS.verifica && !RS.verifica.chiuso())); }
function righeDatiRilievo(po, meta, W) {
const dati = [], viaT = viaSenzaComune(meta), comT = nomeComune(meta);
if (viaT) dati.push(['Luogo', viaT]);
if (comT) dati.push(['Comune', comT]);
if (po.data !== false) dati.push(['Data e ora', meta.data || new Date().toLocaleDateString('it-IT')]);
if (po.numero !== false && meta.numero) dati.push(['Prot. n.', meta.numero]);
if (po.operatore !== false && meta.operatore) dati.push(['Rilevatore', meta.operatore]);
if (po.coordinate !== false && meta.coordinate) dati.push(['Coordinate', meta.coordinate]);
if (po.condizioni && meta.condizioni) dati.push(['Condizioni', meta.condizioni]);
if (po.condizioni && meta.luce) dati.push(['Luce', meta.luce]);
dati.push(['Stato', inBozza(po) ? 'BOZZA (rilievo non chiuso)' : 'DEFINITIVO']);
const r = []; dati.forEach(d => aCapoMm(d[1], W - 17, 2.3).forEach((rr, i) => r.push([i ? '' : d[0], rr])));
return r;
}
function righeComandoTav(po, meta, W) {
const logoOk = po.logo !== false, lw = logoOk ? 12 : 0;
const cmd = [po.comando !== false ? meta.comando : '', po.comando !== false ? meta.comando2 : '', po.stazione !== false ? meta.stazione : ''].filter(Boolean);
const righe = []; cmd.forEach((c, i) => aCapoMm(c, W - lw - 2, i ? 2.4 : 2.6).forEach(rr => righe.push([rr, i === 0])));
return { logoOk, lw, righe };
}
function altezzaRiquadro(k, po, meta, W) {
if (k === 'comando') { const c = righeComandoTav(po, meta, W); return Math.max(c.lw + 3, c.righe.length * 3.2 + 3); }
if (k === 'dati') return righeDatiRilievo(po, meta, W).length * 3.1 + 2.5;
if (k === 'scala') return 14;
return 17;
}
function disposizione(land, s, po, meta, PW, PH, testa) {
const legenda = po.legenda !== false, scelta = po.disposizione || 'auto';
const pos = scelta !== 'auto' ? scelta : (land && legenda ? 'destra' : 'basso');
const ordine = ordineRiquadri(po);
if (pos === 'destra' || pos === 'sinistra') {
const CW = 74, x = pos === 'sinistra' ? 0 : PW - CW;
return { pos, legenda, ordine, ax: pos === 'sinistra' ? CW : 0, ay: testa, Aw: PW - CW, Ah: PH - testa,
pann: { tipo: 'colonna', x, y: testa, w: CW, h: PH - testa } };
}
let Hs, celle = null;
if (legenda) Hs = land ? 62 : 72;
else {
const PESO = { comando: 0.31, dati: 0.31, scala: 0.19, firme: 0.19 };
let x = 0; celle = ordine.map(k => { const w = PW * PESO[k], c = { k, x, w, h: altezzaRiquadro(k, po, meta, w - 6) }; x += w; return c; });
Hs = Math.max(22, ...celle.map(c => c.h)) + 1;
}
const y = pos === 'alto' ? testa : PH - Hs;
return { pos, legenda, ordine, ax: 0, ay: pos === 'alto' ? testa + Hs : testa, Aw: PW, Ah: PH - testa - Hs,
pann: { tipo: legenda ? 'fascia' : 'fila', x: 0, y, w: PW, h: Hs, celle } };
}
function righeComando(m) { return [m.comando, m.comando2, m.stazione].map(x => String(x || '').trim()).filter(Boolean); }
exportUtil.ordineRiquadri = ordineRiquadri; exportUtil.NOMI_RIQUADRI = NOMI_RIQUADRI;
function nomeComune(m) { return String(m.comune || '').trim().replace(/^(?:del\s+)?comune\s+di\s+/i, '').trim(); }
function viaSenzaComune(m) {
const v = String(m.localita || '').trim(), c = nomeComune(m).replace(/\s*\([^)]*\)\s*$/, '');
if (!v || !c) return v;
const e = c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), sigla = '(?:\\s*\\([A-Za-z]{2}\\))?', prima = '(?:(?:del\\s+)?comune\\s+di\\s+)?';
if (new RegExp('^' + prima + e + sigla + '$', 'i').test(v)) return '';
return v.replace(new RegExp('(?:\\s*[,;:–—-]\\s*|\\s*\\(\\s*|\\s+(?=(?:del\\s+)?comune\\s+di\\s))' + prima + e + sigla + '\\)?\\.?$', 'i'), '')
.replace(new RegExp('^' + prima + e + sigla + '\\s*[,;:–—-]\\s*', 'i'), '').trim();
}
function fraseLuogo(via, fmt) {
if (/^rotatoria\b/i.test(via)) return ' nella ' + fmt(via.charAt(0).toLowerCase() + via.slice(1));
if (/^autostrada\b/i.test(via)) return " sull'" + fmt(via.charAt(0).toLowerCase() + via.slice(1));
if (/^(?:s\.?\s?[spr]\.?(?=[\s\d]|$)|a\s?\d|strada\b|tangenziale\b|raccordo\b)/i.test(via)) return ' sulla ' + fmt(via);
if (/^(?:via|viale|v\.le|piazza|p\.za|p\.zza|piazzale|corso|c\.so|largo|vicolo|vico|lungomare|lungolago|lungotevere|circonvallazione|borgo|contrada|traversa|salita|rampa)\b/i.test(via)) return ' in ' + fmt(via);
return ' in località ' + fmt(via);
}
function clip(s, n) { s = String(s); return s.length > n ? s.slice(0, n-1) + '…' : s; }
function docTitle() { return (RS.storage.currentName) || 'Planimetria del sinistro'; }
function esc(s) { return String(s == null ? '' : s).replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c])); }
function attoData() {
const s = RS.scene, m = s.meta || {};
const meas = [];
let q = 1, f = 1;
const it2 = v => Number(v).toFixed(2).replace('.', ',');
const usateQ = new Set(), usateM = new Set();
const caps = s.elements.filter(e => e.letter), capDi = L => caps.find(c => String(c.letter).toUpperCase() === L);
const mb = m.base || {}, oA = s.get(mb.aId) || caps[0], oB = (s.get(mb.bId) !== oA && s.get(mb.bId)) || caps.find(c => c !== oA);
const sist = oA && oB && Math.hypot(oB.x - oA.x, oB.y - oA.y) > 0.01 ? (() => {
const L = Math.hypot(oB.x - oA.x, oB.y - oA.y), ux = (oB.x - oA.x) / L, uy = (oB.y - oA.y) / L;
return p => ({ x: (p.x - oA.x) * ux + (p.y - oA.y) * uy, y: (p.x - oA.x) * uy - (p.y - oA.y) * ux });
})() : null;
const capNome = c => c ? c.letter + (c.descr ? ' (' + c.descr + ')' : (c.nome && c.nome !== 'Caposaldo' ? ' (' + c.nome + ')' : '')) : '';
const basi = [], punti = [];
(s.misure || []).forEach((x, i) => {
const k = /^\s*([A-Za-z]{1,3})\s*(?:→|->)\s*([A-Za-z]{1,3})\s*\(base\)/i.exec(x.descr || '');
if (!k || x.val === '' || x.val == null) return;
usateM.add(i);
meas.push(['Base', 'fra i capisaldi ' + capNome(capDi(k[1].toUpperCase())) + ' e ' + capNome(capDi(k[2].toUpperCase())), [k[1].toUpperCase() + '–' + k[2].toUpperCase() + ' ' + it2(x.val) + ' m']]);
basi.push([k[1].toUpperCase(), k[2].toUpperCase(), x.val]);
});
(RS.verifica && RS.verifica.puntiRilevati ? RS.verifica.puntiRilevati() : []).forEach(p => {
const righe = [];
let come;
p.dist.forEach(d => { if (d.q) usateQ.add(d.q.id); if (d.riga != null) usateM.add(d.riga); });
if (p.metodo === 'ortogonali') {
usateQ.add(p.ord.q.id); if (p.asc) usateQ.add(p.asc.q.id);
const B = p.asc && p.asc.q.ril && s.get(p.asc.q.ril.B), da = p.asc ? p.asc.da : '?';
come = 'coordinate ortogonali dalla base ' + da + (B ? '–' + B.letter : '');
if (p.asc) righe.push('ascissa ' + (p.asc.v < 0 ? '−' + it2(-p.asc.v) + ' m (prima di ' + da + ')' : it2(p.asc.v) + ' m da ' + da + (B ? ' verso ' + B.letter : '')));
let lato = p.ord.q.ril && p.ord.q.ril.lato;
if (!lato && p.asc) {
const a = RS.elements.resolvePts(p.asc.q), o = RS.elements.resolvePts(p.ord.q);
lato = ((a[1].x - a[0].x) * (o[1].y - o[0].y) - (a[1].y - a[0].y) * (o[1].x - o[0].x)) >= 0 ? 1 : -1;
}
righe.push('ordinata ' + it2(p.ord.v) + ' m' + (p.ord.v > 0.004 && lato ? (lato > 0 ? ' a destra' : ' a sinistra') : ''));
p.dist.forEach(d => righe.push('controllo da ' + d.da + ' ' + it2(d.v) + ' m'));
} else {
come = p.dist.length >= 2 ? 'triangolazione dalla base ' + p.dist[0].da + '–' + p.dist[1].da + (p.dist.length > 2 ? ' (con ' + (p.dist.length - 2) + ' di controllo)' : '') : 'distanza da caposaldo';
p.dist.forEach(d => righe.push('da ' + d.da + ' ' + it2(d.v) + ' m'));
}
const cosa = p.el && p.el.letter ? 'caposaldo ' + p.T + (p.el.descr ? ' (' + p.el.descr + ')' : '')
: p.el && p.el.type === 'surveypt' ? (p.el.descr || '')
: p.veicolo ? 'punto ' + p.T.slice(String(p.veicolo.label).length) + ' del veicolo ' + p.veicolo.label : '';
const pos = p.el ? p.el : null;
const coord = pos && sist ? (() => { const c = sist(pos); return 'coordinate (' + it2(c.x) + ' ; ' + it2(c.y) + ') m'; })() : '';
meas.push([p.T, [cosa, come, coord].filter(Boolean).join(' · '), righe]);
punti.push({ p, orto: p.metodo === 'ortogonali' ? righe.filter(r => !/^controllo/.test(r)) : null });
});
const inizioAltre = meas.length;
(s.misure || []).forEach((x, i) => { if (!usateM.has(i)) meas.push(['M' + (i + 1), x.descr || 'misura', [x.val === '' || x.val == null ? '—' : it2(x.val) + ' m']]); });
s.elements.filter(e => e.type === 'measure').forEach(e => { q++; if (usateQ.has(e.id)) return; const v = (e.valore!=null&&e.valore!=='')?Number(e.valore):edist(e.pts[0], e.pts[1]); meas.push(['Q' + (q - 1), e.note || 'quota', [it2(v) + ' m']]); });
s.elements.filter(e => e.type === 'skid').forEach(e => meas.push(['F' + (f++), e.note || (e.stile === 'solco' ? 'solco / abrasione' : e.dashed ? 'scarrocciamento' : 'traccia di frenata') + (e.veicolo ? ' del veicolo ' + e.veicolo : '') + ', lunghezza', [it2(eplen(e)) + ' m']]));
const fineAltre = meas.length;
s.elements.filter(e => e.type === 'surveypt' && !meas.some(r => r[0] === 'P' + e.n)).forEach(e => {
const c = sist ? sist(e) : e;
meas.push(['P' + e.n, e.descr || 'punto di rilievo', ['(' + it2(c.x) + ' ; ' + it2(c.y) + ')']]);
});
const sezioni = [];
const td = v => `<td class="val">${v || '—'}</td>`;
const usoLett = {}; punti.forEach(x => x.p.dist.forEach(d => { usoLett[d.da] = (usoLett[d.da] || 0) + 1; }));
const perUso = Object.keys(usoLett).sort((a, b) => usoLett[b] - usoLett[a]);
const cA = oA ? String(oA.letter).toUpperCase() : (perUso[0] || 'A'), cB = oB ? String(oB.letter).toUpperCase() : (perUso.find(l => l !== cA) || 'B');
const descrCap = c => c.descr || (c.nome && c.nome !== 'Caposaldo' ? c.nome : '');
const nomeSpigolo = (v, n) => {
const p = (v.rilpts || []).find(r => String(r.n) === String(n)); if (!p) return 'punto ' + n;
const fx = p.lx / ((v.len || 4) / 2), fy = p.ly / ((v.wid || 1.8) / 2);
const lon = fx > 0.6 ? 'anteriore' : fx < -0.6 ? 'posteriore' : '', lat = fy < -0.6 ? 'sinistro' : fy > 0.6 ? 'destro' : '';
if (lon && lat) return 'spigolo ' + lon + ' ' + lat;
if (lat) return 'fiancata ' + (fy < 0 ? 'sinistra' : 'destra') + (Math.abs(fx) < 0.25 ? ', al centro' : fx > 0 ? ', parte anteriore' : ', parte posteriore');
if (lon) return 'estremità ' + lon;
return 'punto ' + n;
};
const riga = x => {
const v = {}, altre = [];
if (x.orto) x.p.dist.forEach(d => altre.push('controllo da ' + d.da + ' ' + it2(d.v) + ' m'));
else x.p.dist.forEach(d => { if ((d.da === cA || d.da === cB) && !v[d.da]) v[d.da] = it2(d.v) + ' m'; else altre.push('da ' + d.da + ' ' + it2(d.v) + ' m'); });
return { v, altre };
};
const rigaPunto = (r, conAltre) => `<tr><td class="rif">${esc(r.x.T)}</td><td>${esc(r.x.cosa)}</td>` +
(r.x.orto ? `<td class="val" colspan="2" style="text-align:left">${r.x.orto.map(esc).join('<br>')}</td>` : td(r.v[cA]) + td(r.v[cB])) +
(conAltre ? `<td>${r.altre.map(esc).join('<br>') || '—'}</td>` : '') + '</tr>';
const testaPunti = (etichetta, conAltre) => `<colgroup><col style="width:10%"><col><col style="width:15%"><col style="width:15%">${conAltre ? '<col style="width:24%">' : ''}</colgroup>
        <thead><tr><th>Punto</th><th>${etichetta}</th><th class="num">Da ${esc(cA)}</th><th class="num">Da ${esc(cB)}</th>${conAltre ? '<th>Altre misure</th>' : ''}</tr></thead>`;
const tabPunti = (lista, etichetta) => {
const rr = lista.map(x => Object.assign({ x }, riga(x)));
const conAltre = rr.some(r => r.altre.length || r.x.orto);
return `<table>${testaPunti(etichetta, conAltre)}<tbody>` + rr.map(r => rigaPunto(r, conAltre)).join('') + '</tbody></table>';
};
const tabSemplice = (righe) => `<table><colgroup><col style="width:10%"><col><col style="width:18%"></colgroup>
      <thead><tr><th>Rif.</th><th>Descrizione</th><th class="num">Misura</th></tr></thead><tbody>` +
righe.map(r => `<tr><td class="rif">${esc(r[0])}</td><td>${esc(r[1])}</td><td class="val">${esc(r[2])}</td></tr>`).join('') + '</tbody></table>';
const aggiunti = new Set(punti.filter(x => x.p.el && x.p.el.letter).map(x => x.p.el.id));
const perVeicolo = {};
punti.forEach(x => {
const p = x.p;
if (p.veicolo) {
const n = p.T.slice(String(p.veicolo.label).length);
x.T = p.T; x.cosa = nomeSpigolo(p.veicolo, n);
(perVeicolo[p.veicolo.label] = perVeicolo[p.veicolo.label] || { v: p.veicolo, lista: [] }).lista.push(x);
} else {
x.T = p.T;
x.cosa = p.el && p.el.letter ? 'caposaldo aggiunto' + (descrCap(p.el) ? ': ' + descrCap(p.el) : '') : (p.el && p.el.descr) || 'punto di rilievo';
}
});
Object.keys(perVeicolo).forEach(L => perVeicolo[L].lista.sort((a, b) => String(a.T).localeCompare(String(b.T), undefined, { numeric: true })));
const altri = punti.filter(x => !x.p.veicolo).sort((a, b) => String(a.T).localeCompare(String(b.T), undefined, { numeric: true }));
const senzaMisure = s.elements.filter(e => e.type === 'surveypt' && !punti.some(x => x.T === 'P' + e.n));
senzaMisure.forEach(e => altri.push({ T: 'P' + e.n, cosa: (e.descr || 'punto di rilievo') + ' (posizione indicata sulla planimetria)', p: { dist: [] }, orto: null }));
altri.sort((a, b) => String(a.T).localeCompare(String(b.T), undefined, { numeric: true }));
if (altri.length) sezioni.push(['Altri punti rilevati', tabPunti(altri, 'Descrizione')]);
const rAltre = meas.slice(inizioAltre, fineAltre).map(r => [r[0], r[1], r[2].join(' ')]);
if (rAltre.length) sezioni.push(['Tracce e altre misure', tabSemplice(rAltre)]);
const info = [];
if (m.numero) info.push('<b>Prot. n.</b> ' + esc(m.numero));
if (m.localita) info.push('<b>Località:</b> ' + esc(m.localita));
if (m.data) info.push('<b>Data:</b> ' + esc(m.data));
if (m.operatore) info.push('<b>Rilevatore:</b> ' + esc(m.operatore));
if (m.coordinate) info.push('<b>Coordinate:</b> ' + esc(m.coordinate));
if (RS.incroci) s.elements.filter(e => e.type === 'incrocio').map(e => RS.incroci.descrizione(e)).filter((t, k, a) => t && a.indexOf(t) === k)
.forEach(t => info.push('<b>Intersezione:</b> ' + esc(t)));
if (RS.curve) RS.curve.descrizioni().forEach(t => info.push('<b>Curva:</b> ' + esc(t)));
const visti = {}, veic = [];
s.elements.filter(e => e.type === 'vehicle').forEach(e => {
const k = e.label || e.id;
if (visti[k]) { e.danni && e.danni.forEach(z => { if (visti[k].danni.indexOf(z) < 0) visti[k].danni.push(z); }); return; }
visti[k] = { e, danni: (e.danni || []).slice() }; veic.push(visti[k]);
});
veic.forEach(v => { const q = s.elements.find(x => x.type === 'vehicle' && (x.label || x.id) === (v.e.label || v.e.id) && (!x.fase || x.fase === 'quiete')); if (q) v.e = q; });
veic.sort((a, b) => String(a.e.label || '~').localeCompare(String(b.e.label || '~'), undefined, { numeric: true }));
const nomeZona = z => { const d = (RS.elements.DANNI || []).find(x => x[0] === z); return d ? d[1].toLowerCase() : z; };
const POSA = { fiancosx: 'sul fianco sinistro', fiancodx: 'sul fianco destro', tetto: 'capovolto' };
const vehRows = veic.map(v => {
const e = v.e, tipo = (RS.catalog.veicoloById(e.catId) || {}).nome || 'Veicolo';
const descr = [e.modello ? esc(e.modello) : '', '<span class="muted2">' + esc(tipo) + (POSA[e.posa] ? ', ' + POSA[e.posa] : '') + '</span>'].filter(Boolean).join('<br>');
return `<tr><td class="rif">${esc(e.label || '—')}</td><td>${descr}</td><td>${esc(e.targa ? String(e.targa).toUpperCase() : '—')}</td>` +
`<td>${esc(e.conducente || '—')}</td><td>${v.danni.length ? esc(v.danni.map(nomeZona).join(', ')) : '—'}</td></tr>`;
}).join('');
const logo = RS.logoCC || (typeof location !== 'undefined' ? new URL('logocc.png', location.href).href : 'logocc.png');
const fogliV = veic.map(v => ({ v, rr: ((perVeicolo[v.e.label] || {}).lista || []).map(x => Object.assign({ x }, riga(x))) }));
const conAltreV = fogliV.some(g => g.rr.some(r => r.altre.length || r.x.orto)), nCol = conAltreV ? 5 : 4;
const tabVeicoli = !veic.length ? '' : `<table class="tveic">${testaPunti('Posizione sul veicolo', conAltreV)}` + fogliV.map(g => {
const e = g.v.e, tipo = ((RS.catalog.veicoloById(e.catId) || {}).nome || 'veicolo').toLowerCase();
const dati = [e.modello ? e.modello + ' (' + tipo + ')' : tipo, e.targa ? 'targa ' + String(e.targa).toUpperCase() : '',
e.conducente ? 'conducente ' + e.conducente : '', g.v.danni.length ? 'danni: ' + g.v.danni.map(nomeZona).join(', ') : '',
POSA[e.posa] || '', e.fase && e.fase !== 'quiete' ? 'posizione: ' + (RS.elements.nomeFase(e.fase) || e.fase).toLowerCase() : ''].filter(Boolean).join(', ');
return `<tbody class="gveic"><tr class="sub"><td colspan="${nCol}"><b>Veicolo ${esc(e.label || '—')}</b> — ${esc(dati)}</td></tr>` +
(g.rr.length ? g.rr.map(r => rigaPunto(r, conAltreV)).join('') : `<tr><td></td><td colspan="${nCol - 1}" class="muted2">nessun punto rilevato</td></tr>`) + '</tbody>';
}).join('') + '</table>';
const capVerbale = caps.filter(c => !aggiunti.has(c.id)).map(c => ({ L: String(c.letter).toUpperCase(), d: descrCap(c) }));
const metodi = [...new Set(punti.map(x => x.p.metodo === 'ortogonali' ? 'delle coordinate ortogonali' : 'delle triangolazioni'))];
const sezVerbale = (tabVeicoli ? [['Posizione dei veicoli', tabVeicoli]] : []).concat(sezioni);
const emblema = RS.emblema || (typeof location !== 'undefined' ? new URL('emblema.png', location.href).href : 'emblema.png');
return { m, vehRows, info, logo, emblema, capVerbale, basi: basi.map(b => ({ a: b[0], b: b[1], v: it2(b[2]) })), metodi, sezVerbale };
}
const ATTO_CSS =
`body{font:12.5px/1.45 "Times New Roman",Georgia,serif;color:#111}
     header{display:flex;align-items:center;gap:16px;border-bottom:2px solid #111;padding-bottom:10px;margin-bottom:16px}
     header img{height:60px;width:auto;flex:0 0 auto}
     .htxt{min-width:0}
     h1{font-size:16px;margin:0;letter-spacing:.5px}
     .sub{color:#222;font-size:12.5px;margin-top:3px;line-height:1.4}
     .sub .cmd{font-weight:bold}
     .info{margin:0 0 16px;font-size:12px;color:#222}
     .info span{display:inline-block;margin-right:22px}
     table{width:100%;border-collapse:collapse;margin:3px 0 6px;table-layout:fixed}
     thead{display:table-header-group}
     th,td{border:1px solid #999;padding:3px 7px;text-align:left;font-size:11.5px;line-height:1.35;vertical-align:top;word-wrap:break-word;overflow-wrap:anywhere}
     th{background:#e9e9e9;white-space:nowrap;font-size:11px;letter-spacing:.3px}
     tr.sub td{background:#efefef !important;padding-top:4px;page-break-after:avoid}
     tbody.gveic{break-inside:avoid;page-break-inside:avoid}
     col.crif{width:16%}col.cval{width:26%}
     tr{page-break-inside:avoid}
     tbody tr:nth-of-type(even) td{background:#f7f7f7}
     td.rif{font-weight:bold;white-space:nowrap}
     td.val{white-space:nowrap;text-align:right}
     .muted{color:#666;text-align:center}
     .muted2{color:#555;font-size:11px}
     .sez{font-size:13.5px;font-weight:bold;letter-spacing:.4px;border-bottom:1px solid #111;padding-bottom:3px;margin:20px 0 6px;page-break-after:avoid}
     .sez-d{font-weight:normal;letter-spacing:0;font-size:12.5px}
     .lettera{text-align:center}
     .lettera img{height:54px;width:auto;margin-bottom:4px}
     .emblfall{font-weight:bold;letter-spacing:2px;font-size:15px;margin-bottom:6px}
     .intest{font-weight:bold;line-height:1.45;font-size:13.5px}
     .lettera .hr{border:none;border-top:1.5px solid #111;margin:8px 0 0}
     .vprot{text-align:left;margin-top:5px;font-size:12.5px}
     .ogg{margin:5px 0 2px;text-align:justify}
     h1.vt{text-align:center;font-size:15px;letter-spacing:1.5px;margin:10px 0 6px}
     .vtx{text-align:justify;margin:4px 0;line-height:1.5}
     .vp{font-weight:bold;font-size:12.5px;margin:10px 0 3px;page-break-after:avoid}
     .fine{letter-spacing:-.5px}
     .vchiudi{margin-top:10px;line-height:1.6}
     .vfirme{display:flex;justify-content:flex-end;margin-top:8px;page-break-inside:avoid}
     .vfirme .box{width:75mm;text-align:center}
     .vfirme .tit{font-weight:bold;letter-spacing:.5px}
     .vfirme .riga{border-bottom:1px dotted #111;height:10mm}
     th.num{text-align:right}
     .note{margin-top:14px;font-size:12px;text-align:justify}
     .sign{margin-top:46px;text-align:right;font-size:12.5px}
     .sign .box{display:inline-block;text-align:center;min-width:70mm}
     .sign .line{margin-top:16mm;border-top:1px solid #111;padding-top:3px}`;
const FILIGRANA = '<div style="position:fixed;top:42%;left:0;right:0;text-align:center;font:bold 120px Arial,Helvetica,sans-serif;' +
'color:rgba(204,0,0,.13);transform:rotate(-32deg);pointer-events:none;z-index:9;letter-spacing:12px">BOZZA</div>';
const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
const FINE = '<span class="fine">----//</span>';
function attoBody(d, word, opz) {
const m = d.m, b = x => '<b>' + esc(x) + '</b>';
const bozza = !(opz && opz.senzaFiligrana) && RS.verifica && !RS.verifica.chiuso();
const prot = m.numero ? 'N. ' + esc(m.numero) + ' di prot.' : '';
const intest = righeComando(m).map(esc).join('<br>');
const header = word
? `<div style="text-align:center">
           <img src="${d.emblema}" width="66" height="61" style="width:66px;height:61px"/><br>
           <span style="font-weight:bold;font-size:13.5px;line-height:1.5">${intest}</span>
           <div style="border-bottom:1.5px solid #111;margin:9px 0 0"></div></div>
         ${prot ? `<p style="text-align:left;margin:6px 0 0">${prot}</p>` : ''}`
: `<div class="lettera">
           <img src="${d.emblema}" alt="" onerror="this.style.display='none';var t=this.nextElementSibling;if(t)t.style.display='block'">
           <div class="emblfall" style="display:none">REPUBBLICA ITALIANA</div>
           <div class="intest">${intest}</div><hr class="hr"></div>
         ${prot ? `<div class="vprot">${prot}</div>` : ''}`;
const leggi = t => {
const x = /(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\D+(\d{1,2})[:.](\d{2}))?/.exec(t || '');
return x ? { g: x[1].padStart(2, '0'), me: x[2].padStart(2, '0'), a: x[3], ora: x[4] ? x[4].padStart(2, '0') + ':' + x[5] : '' } : null;
};
const giorno = x => x ? x.g + '/' + x.me + '/' + x.a : '';
const sin = leggi(m.data), ini = leggi(m.inizioRilievi), fin = leggi(m.fineRilievi);
const dataBreve = sin ? giorno(sin) : (m.data || '');
const oggi = new Date(), p2 = v => String(v).padStart(2, '0');
const quando = `L'anno ${b(oggi.getFullYear())}, addì ${b(oggi.getDate())} del mese di ${b(MESI[oggi.getMonth()])}, ` +
`alle ore ${b(p2(oggi.getHours()) + ':' + p2(oggi.getMinutes()))}, presso il Comando in intestazione`;
const via = viaSenzaComune(m), comune = nomeComune(m);
const dove = (via ? fraseLuogo(via, b) + (comune ? ` del comune di ${b(comune)}` : '') : (comune ? ` nel comune di ${b(comune)}` : ''));
const piu = /,| e /.test(m.operatore || '');
const chi = m.operatore ? (piu ? ', i sottoscritti ' : ', il sottoscritto ') + b(m.operatore) : ', i sottoscritti ______________________';
const metodo = d.metodi.length ? ' con il metodo ' + d.metodi.join(' e ') : '';
const apertura = `<p class="vtx">${quando}${chi}, in servizio presso il Comando medesimo, ${m.operatore && !piu ? 'dà' : 'danno'} atto di aver proceduto` +
`${ini ? ' il giorno ' + b(giorno(ini)) : ''} ai rilievi planimetrici del campo del sinistro stradale${dataBreve ? ' avvenuto il ' + b(dataBreve) + (sin && sin.ora ? ' alle ore ' + b(sin.ora) : '') : ''}${dove}${metodo}, ` +
`come di seguito riportato. Tutte le misure sono espresse in metri.${FINE}</p>`;
const extra = d.info.filter(x => /Coordinate|Intersezione|Curva/.test(x));
const luogo = extra.length ? `<p class="vtx">${extra.join('; ')}.${FINE}</p>` : '';
let n = 0;
const par = (tit, dett) => `<div class="vp">${++n}) ${esc(tit).toUpperCase()}${dett ? `<span class="sez-d"> — ${esc(dett)}</span>` : ''}</div>`;
let corpo = '';
if (d.capVerbale.length) {
corpo += par('Capisaldi e base di misura') + `<p class="vtx">Sono stati assunti quali capisaldi: ` +
d.capVerbale.map(c => `<b>${esc(c.L)}</b>) ${esc(c.d || 'caposaldo')}`).join('; ') + '.' +
d.basi.map(x => ` La base di misura ${esc(x.a)}–${esc(x.b)} è di m <b>${x.v}</b>.`).join('') + FINE + '</p>';
}
d.sezVerbale.forEach(x => { corpo += par(x[0], x[2]) + x[1]; });
if (!d.sezVerbale.length && !d.capVerbale.length) corpo += '<p class="muted">Nessuna misura registrata.</p>';
if (m.note) corpo += par('Annotazioni') + `<p class="vtx">${esc(m.note)}${FINE}</p>`;
const vuoto = '______';
const giornoDi = x => ' del giorno ' + (x ? b(giorno(x)) : vuoto);
const stessoGiorno = ini && fin && giorno(ini) === giorno(fin);
const inizio = `alle ore ${ini && ini.ora ? b(ini.ora) : vuoto}` + (stessoGiorno ? '' : giornoDi(ini));
const conclusi = `alle ore ${fin && fin.ora ? b(fin.ora) : vuoto}` + giornoDi(fin);
const nFoto = RS.fascicolo && RS.fascicolo.model && RS.fascicolo.model.photos ? RS.fascicolo.model.photos.length : 0;
const conPlan = RS.scene.elements.length > 0;
const chiusura = `<p class="vtx vchiudi">I rilevamenti hanno avuto inizio ${inizio} e si sono conclusi ${conclusi}.${FINE}<br>` +
(nFoto ? `Si dà atto che si è proceduto ai rilievi fotografici con nr. ${b(String(nFoto))} fotogrammi.${FINE}<br>` : '') +
`Il presente verbale è composto da n. <span class="nfogli">______ fogli</span>${conPlan ? ' e dalla planimetria allegata' : ''}.${FINE}<br>` +
`Fatto, letto e sottoscritto in data e luogo di cui sopra.</p>`;
const firme = `<div class="vfirme"><div class="box"><div class="tit">I VERBALIZZANTI</div><div class="riga"></div><div class="riga"></div></div></div>`;
const ogg = `<p class="ogg"><b>OGGETTO:</b> rilievi planimetrici del sinistro stradale avvenuto${dataBreve ? ' il ' + esc(dataBreve) : ''}${via ? fraseLuogo(via, esc) : ''}.</p>`;
const pag = (opz && opz.pagina) || { w: 174, h: 259 };
const corpoVerbale = `${header}
      ${ogg}<h1 class="vt">VERBALE DI RILIEVI PLANIMETRICI</h1>
      ${apertura}${luogo}${corpo}
      ${RS.recon && !(opz && opz.senzaCalcoli) ? RS.recon.perAtto(word) : ''}
      ${chiusura}${firme}`;
return `${bozza ? (word ? '<p style="color:#b00;font-weight:bold;text-align:center;letter-spacing:2px">BOZZA — rilievo non ancora chiuso</p>' : FILIGRANA) : ''}` +
(word ? corpoVerbale : `<div class="verbale" data-pw="${pag.w}" data-ph="${pag.h}">${corpoVerbale}</div>`);
}
const CONTA_FOGLI = `<script>window.addEventListener('load',function(){
    document.querySelectorAll('.verbale').forEach(function(v){
      var pw=+v.getAttribute('data-pw'),H=(+v.getAttribute('data-ph'))*96/25.4,vec=v.style.width;
      v.style.width=pw+'mm';
      var t0=v.getBoundingClientRect().top,bl=[],add=function(el,o){var r=el.getBoundingClientRect();if(r.height>0)bl.push(Object.assign({t:r.top-t0,b:r.bottom-t0},o||{}));};
      Array.prototype.forEach.call(v.children,function(c){
        if(getComputedStyle(c).position==='fixed')return;
        if(c.tagName==='TABLE'){var th=c.tHead?c.tHead.getBoundingClientRect().height:0;if(c.tHead)add(c.tHead,{at:true,lega:true});
          Array.prototype.forEach.call(c.tBodies,function(tb){
            if(tb.classList.contains("gveic")&&tb.getBoundingClientRect().height<=H){add(tb,{at:true,th:th});return;}
            Array.prototype.forEach.call(tb.rows,function(r){add(r,{at:true,th:th,lega:r.classList.contains("sub")});});});}
        else add(c,{at:/vp|vfirme|lettera|vt|vprot/.test(c.className),lega:/(^| )vp( |$)/.test(c.className)});
      });
      var fine=H,sh=0;
      for(var i=0;i<bl.length;i++){var k=bl[i],b=k.b+sh;if(b<=fine)continue;
        if(k.at&&k.b-k.t<=H){var j=i;while(j>0&&bl[j-1].lega&&bl[j-1].t+sh>=fine-H)j--;
          sh+=fine-(bl[j].t+sh)+(j===i&&k.th?k.th:0);fine+=H;}
        else{while(b>fine)fine+=H;}}
      var ult=bl.length?bl[bl.length-1].b+sh:0;
      v.style.width=vec;
      var n=Math.max(1,Math.ceil(ult/H-0.002));
      v.querySelectorAll('.nfogli').forEach(function(s){s.textContent=n+(n===1?' foglio':' fogli');});
    });
  });<\/script>`;
exportUtil.righeComando = righeComando; exportUtil.nomeComune = nomeComune; exportUtil.viaSenzaComune = viaSenzaComune;
exportUtil.attoMisure = function () {
const d = attoData();
const win = window.open('', '_blank');
if (!win) { alert('Consenti i popup per generare l\'atto.'); return; }
win.document.write(`<!DOCTYPE html><html lang="it"><head><meta charset="utf-8"><title>Verbale di rilievi planimetrici</title>
      <style>@page{size:A4 portrait;margin:18mm 18mm 20mm;
          @bottom-left{content:${cssTesto(d.m.numero ? 'N. ' + d.m.numero + ' di prot.' : '')};font:9pt "Times New Roman",serif}
          @bottom-right{content:"foglio " counter(page) " di " counter(pages);font:9pt "Times New Roman",serif}}${ATTO_CSS}
        .noprint{text-align:center;margin:6px}button{padding:8px 16px;cursor:pointer}
        @media print{.noprint{display:none}}</style></head><body>
      <div class="noprint"><button onclick="try{opener.RilsinAndroid.stampa()}catch(e){window.print()}">🖨 Stampa / Salva PDF</button></div>
      ${attoBody(d)}
      ${CONTA_FOGLI}
      </body></html>`);
win.document.close();
};
exportUtil.attoMisureWord = function () {
const d = attoData();
const mso = '<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->';
const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" lang="it"><head><meta charset="utf-8"><title>Verbale di rilievi planimetrici</title>${mso}
      <style>@page WordSection1{size:210mm 297mm;margin:18mm}div.WordSection1{page:WordSection1}${ATTO_CSS}</style></head>
      <body><div class="WordSection1">${attoBody(d, true)}</div></body></html>`;
const blob = new Blob(['﻿' + html], { type: 'application/msword' });
const base = (RS.storage && RS.storage.currentName) ? String(RS.storage.currentName).slice(0, 30).replace(/[^\w\-]+/g, '_') : 'atto';
this.download(blob, 'atto-delle-misure-' + base + '.doc');
};
exportUtil.allegatoFoto = function () {
const s = RS.scene, m = s.meta || {};
const fotos = s.elements.filter(e => e.type === 'foto').sort((a, b) => (a.n||0) - (b.n||0));
if (!fotos.length) { alert('Nessuna foto: aggiungi segnaposti fotografici con il pulsante 📷 Foto.'); return; }
const cells = fotos.map(f => `<figure><div class="ph"><span class="num">${f.n}</span>${f.href ? `<img src="${f.href}">` : '<div class="noimg">— senza immagine —</div>'}</div><figcaption><b>Foto ${f.n}</b>${f.descr ? ' — ' + esc(f.descr) : ''}</figcaption></figure>`).join('');
const logo = RS.logoCC || (typeof location !== 'undefined' ? new URL('logocc.png', location.href).href : 'logocc.png');
const win = window.open('', '_blank');
if (!win) { alert('Consenti i popup per generare l\'allegato.'); return; }
win.document.write(`<!DOCTYPE html><html lang="it"><head><meta charset="utf-8"><title>Allegato fotografico</title>
      <style>
        @page{size:A4 portrait;margin:16mm}
        body{font:12.5px/1.5 "Times New Roman",Georgia,serif;color:#111}
        header{display:flex;align-items:center;gap:14px;border-bottom:2px solid #111;padding-bottom:8px;margin-bottom:14px}
        header img{height:56px}
        h1{font-size:15px;margin:0}
        .sub{color:#333;font-size:12px;margin-top:2px}
        .grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
        figure{margin:0;page-break-inside:avoid}
        .ph{position:relative;border:1px solid #999;background:#f3f3f3;aspect-ratio:4/3;display:flex;align-items:center;justify-content:center;overflow:hidden}
        .ph img{width:100%;height:100%;object-fit:cover}
        .num{position:absolute;top:6px;left:6px;background:#1466b8;color:#fff;font-weight:bold;
          border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:13px}
        .noimg{color:#888;font-size:12px}
        figcaption{font-size:12px;margin-top:5px}
        .noprint{text-align:center;margin:6px}button{padding:8px 16px;cursor:pointer}
        @media print{.noprint{display:none}}
      </style></head><body>
      <div class="noprint"><button onclick="try{opener.RilsinAndroid.stampa()}catch(e){window.print()}">🖨 Stampa / Salva PDF</button></div>
      <header>${logo ? `<img src="${logo}">` : ''}<div>
        <h1>ALLEGATO FOTOGRAFICO</h1>
        <div class="sub">${righeComando(m).map(esc).join(' — ')}${[viaSenzaComune(m), nomeComune(m)].filter(Boolean).map((x, i) => (i ? ', ' : ' · ') + esc(x)).join('')}</div></div></header>
      <div class="grid">${cells}</div>
      </body></html>`);
win.document.close();
};
function ambito(css, pref) {
return css.replace(/([^{}]+)\{/g, (m, sel) => {
const s = sel.trim(); if (!s || s.charAt(0) === '@') return m;
return s.split(',').map(x => {
x = x.trim();
return (x === 'body' || x === 'html') ? pref : (x === '*' ? pref + ' *' : pref + ' ' + x);
}).join(',') + '{';
});
}
const cssTesto = s => '"' + String(s).replace(/["\\]/g, '\\$&').replace(/[\r\n]+/g, ' ') + '"';
exportUtil.partiFascicolo = function () {
const s = RS.scene, f = RS.fascicolo && RS.fascicolo.model;
const calc = RS.recon ? RS.recon.perAtto(false) : '';
const nMis = (s.misure || []).length + s.elements.filter(e => e.type === 'measure' || e.type === 'skid' || e.type === 'surveypt').length;
return {
plan: { ok: s.elements.length > 0, nome: 'Planimetria', det: s.fuoriScala ? 'schizzo non in scala' : null },
atto: { ok: true, nome: 'Verbale di rilievi planimetrici', det: nMis + (nMis === 1 ? ' misura' : ' misure') },
calcoli: { ok: !!calc, nome: 'Calcoli di ricostruzione cinematica', det: calc ? 'ausilio tecnico' : 'nessun calcolo da allegare' },
foto: { ok: !!(f && f.photos && f.photos.length), nome: 'Fascicolo fotografico', det: f && f.photos ? f.photos.length + (f.photos.length === 1 ? ' fotografia' : ' fotografie') : '0 fotografie' },
radd: (() => { const n = RS.raddrizza ? RS.raddrizza.fonti().length : 0;
return { ok: n > 0, nome: 'Raddrizzamento fotografico', det: n + (n === 1 ? ' foto raddrizzata' : ' foto raddrizzate') + ', misure di ausilio' }; })()
};
};
exportUtil.fascicoloCompletoHtml = async function (scelte) {
const s = RS.scene, m = s.meta || {}, P = this.partiFascicolo();
const vuole = k => P[k].ok && (k === 'radd' ? !!(scelte && scelte.radd === true) : (!scelte || scelte[k] !== false));
const sezioni = [], indice = [];
let stileFoto = '';
if (vuole('plan')) {
const tv = this.buildTavola({ bn: s.printOptions().bn, meno: 9, senzaFiligrana: true });
const plan = { denom: tv.denom, landscape: tv.landscape }, svg = tv.sized;
indice.push({ k: 'plan', t: P.plan.nome, d: (s.fuoriScala ? 'schizzo non in scala' : 'in scala 1:' + plan.denom) + ', A4 ' + (plan.landscape ? 'orizzontale' : 'verticale') });
sezioni.push({ k: 'plan', html: `<section class="s-sec s-plan" style="page:${plan.landscape ? 'planO' : 'planV'}">
          <div class="alleg">ALLEGATO ${indice.length} — PLANIMETRIA${s.fuoriScala ? ' (NON IN SCALA)' : ''}</div>
          <div class="plan-foglio">${svg}</div></section>` });
}
if (vuole('atto')) {
indice.push({ k: 'atto', t: P.atto.nome, d: P.atto.det + (attoData().vehRows ? ' e veicoli coinvolti' : '') });
sezioni.push({ k: 'atto', html: `<section class="s-sec s-atto"><div class="alleg">ALLEGATO ${indice.length}</div>${attoBody(attoData(), false, { senzaCalcoli: true, senzaFiligrana: true, pagina: { w: 178, h: 256 } })}</section>` });
}
if (vuole('calcoli')) {
indice.push({ k: 'calcoli', t: P.calcoli.nome, d: 'ausilio tecnico, risultati a intervallo' });
sezioni.push({ k: 'calcoli', html: `<section class="s-sec s-atto"><div class="alleg">ALLEGATO ${indice.length}</div>${RS.recon.perAtto(false)}
          <div class="sign"><div class="box"><div class="line">L'operatore</div></div></div></section>` });
}
if (vuole('foto')) {
await RS.fascicolo.load();
const f = RS.fascicolo._parti({ numeri: false });
stileFoto = ambito(f.style, '.s-foto');
indice.push({ k: 'foto', t: P.foto.nome, d: P.foto.det });
sezioni.push({ k: 'foto', html: `<section class="s-sec s-foto"><div class="alleg">ALLEGATO ${indice.length}</div>${f.cover}${f.pages}</section>` });
}
if (vuole('radd')) {
indice.push({ k: 'radd', t: P.radd.nome, d: P.radd.det });
sezioni.push({ k: 'radd', html: `<section class="s-sec s-radd"><div class="alleg">ALLEGATO ${indice.length}</div>${await RS.raddrizza.tavole()}</section>` });
}
const d = attoData();
const righe = [
['Protocollo', m.numero], ['Luogo', viaSenzaComune(m)], ['Comune', nomeComune(m)], ['Data e ora', m.data], ['Coordinate', m.coordinate],
['Condizioni meteo', m.condizioni], ['Condizioni di luce', m.luce], ['Operatore', m.operatore]
].filter(x => x[1]);
const fronte = `<section class="s-front">
        <header>${d.logo ? `<img src="${d.logo}">` : ''}<div class="htxt">
          ${righeComando(m).map((r, i) => `<div${i ? '' : ' class="cmd"'}>${esc(r)}</div>`).join('')}</div></header>
        <h1>RILIEVO DEL SINISTRO STRADALE</h1>
        ${righe.length ? `<table class="dati">${righe.map(x => `<tr><td class="lab">${x[0]}</td><td>${esc(x[1])}</td></tr>`).join('')}</table>` : ''}
        <h2>Contenuto</h2>
        <table class="indice">${indice.map((x, i) => `<tr><td class="n">${i + 1}</td><td><b>${esc(x.t)}</b><br><span>${esc(x.d)}</span></td></tr>`).join('')}</table>
        <p class="nota">Le pagine sono numerate progressivamente a piè di pagina.</p>
        <div class="sign"><div class="box"><div class="line">L'operatore</div></div></div>
      </section>`;
const piede = ['RILSIN', m.numero ? 'Prot. ' + m.numero : '', m.localita || ''].filter(Boolean).join(' · ');
const css = `
      @page{size:A4 portrait;margin:16mm;
        @bottom-left{content:${cssTesto(piede)};font:8.5pt "Times New Roman",serif;color:#555}
        @bottom-right{content:"Pag. " counter(page) " di " counter(pages);font:8.5pt "Times New Roman",serif;color:#555}}
      @page planO{size:A4 landscape;margin:8mm 8mm 9mm}
      @page planV{size:A4 portrait;margin:8mm 8mm 9mm}
      html,body{margin:0;padding:0}
      body{font:12.5px/1.5 "Times New Roman",Georgia,serif;color:#111}
      .s-sec{break-before:page}
      .alleg{font:9.5px/1.3 Arial,Helvetica,sans-serif;letter-spacing:.6px;color:#555;text-align:right;margin-bottom:6px}
      .s-plan .alleg{text-align:left;margin-bottom:2mm}
      .plan-foglio{display:flex;justify-content:center}
      .s-front header{display:flex;align-items:center;gap:16px;border-bottom:2px solid #111;padding-bottom:10px}
      .s-front header img{height:64px}
      .s-front .cmd{font-weight:bold;font-size:14px}
      .s-front h1{text-align:center;font-size:21px;letter-spacing:1.5px;margin:22mm 0 11mm}
      .s-front .dati{margin:0 auto 11mm;border-collapse:collapse;min-width:120mm}
      .s-front .dati td{padding:3px 10px;font-size:13px;vertical-align:top}
      .s-front .dati .lab{font-weight:bold;width:40mm}
      .s-front h2{font-size:14px;letter-spacing:.6px;border-bottom:1px solid #111;padding-bottom:3px;margin:0 0 6px}
      .s-front .indice{width:100%;border-collapse:collapse}
      .s-front .indice td{padding:7px 8px;border-bottom:1px solid #ccc;vertical-align:top;font-size:13px}
      .s-front .indice td span{color:#444;font-size:12px}
      .s-front .indice .n{width:10mm;font-weight:bold;font-size:15px;color:#1a3a6b}
      .s-front .nota{font-size:11.5px;color:#333;margin-top:6mm;text-align:justify}
      .s-front .sign,.s-sec .sign{margin-top:14mm;text-align:right;break-inside:avoid}
      .s-front .sign .box,.s-sec .sign .box{display:inline-block;min-width:70mm;text-align:center}
      .s-front .sign .line,.s-sec .sign .line{margin-top:16mm;border-top:1px solid #111;padding-top:3px}
      .noprint{text-align:center;margin:8px;font:13px Arial,sans-serif}button{padding:8px 16px;cursor:pointer}
      @media print{.noprint{display:none}}
      ${ambito(ATTO_CSS, '.s-atto')}
      ${stileFoto}
      ${RS.raddrizza ? ambito(RS.raddrizza.CSS_TAVOLA, '.s-radd') : ''}
      .s-foto .cover{min-height:250mm}`;
return `<!DOCTYPE html><html lang="it"><head><meta charset="utf-8"><title>Fascicolo completo — ${esc(docTitle())}</title>
      <style>${css}</style></head><body>
      <div class="noprint"><button onclick="try{opener.RilsinAndroid.stampa()}catch(e){window.print()}">🖨 Stampa / Salva PDF</button>
        <div style="margin-top:6px;color:#555">Nella finestra di stampa scegli «Salva come PDF» per avere un unico file.</div></div>
      ${RS.verifica && !RS.verifica.chiuso() ? FILIGRANA : ''}${fronte}${sezioni.map(x => x.html).join('')}
      ${CONTA_FOGLI}
      </body></html>`;
};
exportUtil.fascicoloCompleto = function (scelte) {
const win = window.open('', '_blank');
if (!win) { alert('Consenti i popup per generare il fascicolo completo.'); return Promise.resolve(); }
win.document.write('<p style="font:14px Arial,sans-serif;padding:20px">Preparazione del fascicolo completo…</p>');
return this.fascicoloCompletoHtml(scelte).then(html => { win.document.open(); win.document.write(html); win.document.close(); })
.catch(err => { win.document.body.innerHTML = '<p style="font:14px Arial,sans-serif;padding:20px">Non è stato possibile comporre il fascicolo: ' + esc(err && err.message || err) + '</p>'; });
};
function edist(a, b) { return Math.hypot(b.x-a.x, b.y-a.y); }
function eplen(e) { let d = 0; for (let i = 1; i < e.pts.length; i++) d += edist(e.pts[i-1], e.pts[i]); return d; }
RS.exportUtil = exportUtil;
})(window.RS = window.RS || {});

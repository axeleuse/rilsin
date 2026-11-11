(function () {
'use strict';
const RS = window.RS = window.RS || {};
const W_R = [250,333,408,500,500,833,778,180,333,333,500,564,250,333,250,278,500,500,500,500,500,500,500,500,500,500,278,278,564,564,564,444,921,722,667,667,722,611,556,722,722,333,389,722,611,889,722,722,556,722,667,556,611,722,722,944,722,722,611,333,278,333,469,500,333,444,500,444,500,444,333,500,500,278,278,500,278,778,500,500,500,500,333,389,278,500,500,722,500,500,444,480,200,480,541,500,500,778,333,500,444,1000,500,500,333,1000,556,333,889,778,611,778,778,333,333,444,444,350,500,1000,333,980,389,333,722,778,444,722,250,333,500,500,500,500,200,500,333,760,276,500,564,0,760,500,400,549,300,300,333,576,453,333,333,300,310,500,750,750,750,444,722,722,722,722,722,722,889,667,611,611,611,611,333,333,333,333,722,722,722,722,722,722,722,564,722,722,722,722,722,722,556,500,444,444,444,444,444,444,667,444,444,444,444,444,278,278,278,278,500,500,500,500,500,500,500,549,500,500,500,500,500,500,500,500];
const W_B = [250,333,555,500,500,1000,833,278,333,333,500,570,250,333,250,278,500,500,500,500,500,500,500,500,500,500,333,333,570,570,570,500,930,722,667,722,722,667,611,778,778,389,500,778,667,944,722,778,611,778,722,556,667,722,722,1000,722,722,667,333,278,333,581,500,333,500,556,444,556,444,333,500,556,278,333,556,278,833,556,500,556,556,444,389,333,556,500,722,500,500,444,394,220,394,520,500,500,778,333,500,500,1000,500,500,333,1000,556,333,1000,778,667,778,778,333,333,500,500,350,500,1000,333,1000,389,333,722,778,444,722,250,333,500,500,500,500,220,500,333,747,300,500,570,0,747,500,400,549,300,300,333,576,540,333,333,300,330,500,750,750,750,500,722,722,722,722,722,722,1000,722,667,667,667,667,389,389,389,389,722,722,778,778,778,778,778,570,778,722,722,722,722,722,611,556,500,500,500,500,500,500,722,444,444,444,444,444,278,278,278,278,500,556,500,500,500,500,500,549,500,556,556,556,556,500,556,500];
const BYTE = new Map();
(function () {
let dec = null; try { dec = new TextDecoder('windows-1252'); } catch (e) {}
for (let b = 32; b < 256; b++) BYTE.set(dec ? dec.decode(new Uint8Array([b])) : String.fromCharCode(b), b);
})();
const SOST = { '☐': '[  ]', '‐': '-', '‑': '-', '−': '-', '′': '\'', '″': '"', ' ': ' ' };
function byteDi(s) {
s = String(s == null ? '' : s).replace(/[☐‐‑−′″ ]/g, c => SOST[c]).replace(/[\r\n\t]+/g, ' ');
const r = [];
for (const ch of s) { const b = BYTE.get(ch); r.push(b != null ? b : 63); }
return r;
}
const larghezza = (s, b, sz) => byteDi(s).reduce((t, x) => t + (b ? W_B : W_R)[x - 32], 0) * sz / 1000;
function strPdf(s) {
return '(' + byteDi(s).map(b => b === 40 || b === 41 || b === 92 ? '\\' + String.fromCharCode(b) : b < 127 ? String.fromCharCode(b) : '\\' + b.toString(8)).join('') + ')';
}
const n = v => (Math.round(v * 100) / 100).toString();
const MM = 72 / 25.4;
function documento(opz) {
opz = opz || {};
const P = { w: 595.28, h: 841.89, ml: 16 * MM, mr: 16 * MM, mt: 15 * MM, mb: 17 * MM };
P.lw = P.w - P.ml - P.mr;
const pagine = []; let pag = null, immagine = null;
const D = {
P, y: 0,
pagina() { pag = []; pagine.push(pag); D.y = P.mt; },
resto() { return P.h - P.mb - D.y; },
spazio(h) { if (h > D.resto()) D.pagina(); },
larghezza,
testo(x, y, s, b, sz) { pag.push('BT /F' + (b ? 2 : 1) + ' ' + n(sz) + ' Tf ' + n(x) + ' ' + n(P.h - y) + ' Td ' + strPdf(s) + ' Tj ET'); },
linea(x1, y1, x2, y2, sp, grigio) { pag.push((grigio != null ? n(grigio) + ' G ' : '0 G ') + n(sp || 0.75) + ' w ' + n(x1) + ' ' + n(P.h - y1) + ' m ' + n(x2) + ' ' + n(P.h - y2) + ' l S'); },
tratteggio(x1, y, x2) { pag.push('0 G 0.6 w [1 2] 0 d ' + n(x1) + ' ' + n(P.h - y) + ' m ' + n(x2) + ' ' + n(P.h - y) + ' l S [] 0 d'); },
riquadro(x, y, w, h, fondo, bordo) {
if (fondo != null) pag.push(n(fondo) + ' g ' + n(x) + ' ' + n(P.h - y - h) + ' ' + n(w) + ' ' + n(h) + ' re f 0 g');
if (bordo != null) pag.push(n(bordo) + ' G 0.6 w ' + n(x) + ' ' + n(P.h - y - h) + ' ' + n(w) + ' ' + n(h) + ' re S 0 G');
},
immagine(img, x, y, w, h) { if (!img) return; immagine = img; pag.push('q ' + n(w) + ' 0 0 ' + n(h) + ' ' + n(x) + ' ' + n(P.h - y - h) + ' cm /Im1 Do Q'); },
righe(parti, sz, larg) {
const parole = []; let cur = null;
parti.forEach(p => String(p.t == null ? '' : p.t).split(/(\s+)/).forEach(pz => {
if (!pz) return;
if (/^\s+$/.test(pz)) { cur = null; return; }
if (!cur) { cur = { seg: [], w: 0 }; parole.push(cur); }
cur.seg.push({ t: pz, b: !!p.b }); cur.w += larghezza(pz, p.b, sz);
}));
const sp = 250 * sz / 1000, out = []; let riga = [], lr = 0;
parole.forEach(w => {
if (riga.length && lr + sp + w.w > larg) { out.push({ parole: riga, w: lr }); riga = []; lr = 0; }
lr += (riga.length ? sp : 0) + w.w; riga.push(w);
});
if (riga.length) out.push({ parole: riga, w: lr });
return out;
},
paragrafo(parti, o) {
o = o || {};
const sz = o.sz || 10, ld = o.ld || sz * 1.42, x0 = o.x != null ? o.x : P.ml, larg = o.w || P.lw;
const rr = D.righe(parti, sz, larg);
rr.forEach((r, i) => {
D.spazio(ld);
const ultima = i === rr.length - 1, nsp = r.parole.length - 1;
const tw = o.allinea === 'giustifica' && !ultima && nsp > 0 ? (larg - r.w) / nsp : 0;
const x = o.allinea === 'centro' ? x0 + (larg - r.w) / 2 : o.allinea === 'dx' ? x0 + larg - r.w : x0;
const base = D.y + sz * 0.95;
let s = 'BT ' + n(x) + ' ' + n(P.h - base) + ' Td ' + n(tw) + ' Tw';
let font = null;
r.parole.forEach((w, k) => w.seg.forEach((g, j) => {
const f = g.b ? 2 : 1;
if (f !== font) { s += ' /F' + f + ' ' + n(sz) + ' Tf'; font = f; }
s += ' ' + strPdf(g.t + (j === w.seg.length - 1 && k < nsp ? ' ' : '')) + ' Tj';
}));
pag.push(s + ' 0 Tw ET');
D.y += ld;
});
D.y += o.dopo != null ? o.dopo : 0;
},
altezzaTabella(righe, sz, w1) {
const ld = sz * 1.3, pad = 3;
return righe.reduce((t, r) => t + Math.max(D.righe([{ t: r[0], b: true }], sz, w1 - 2 * pad - 2).length, D.righe([{ t: r[1] }], sz, P.lw - w1 - 2 * pad - 2).length) * ld + 2 * pad, 0);
},
tabella(righe, o) {
o = o || {};
const sz = o.sz || 9.5, ld = sz * 1.3, pad = 3, w1 = P.lw * 0.3, w2 = P.lw - w1;
righe.forEach(r => {
const a = D.righe([{ t: r[0], b: true }], sz, w1 - 2 * pad - 2), b = D.righe([{ t: r[1] }], sz, w2 - 2 * pad - 2);
const h = Math.max(a.length, b.length) * ld + 2 * pad;
D.spazio(h);
D.riquadro(P.ml, D.y, w1, h, 0.93, 0.55); D.riquadro(P.ml + w1, D.y, w2, h, null, 0.55);
const y0 = D.y;
D.y = y0 + pad - 1; D.paragrafo([{ t: r[0], b: true }], { sz, ld, x: P.ml + pad, w: w1 - 2 * pad - 2 });
D.y = y0 + pad - 1; D.paragrafo([{ t: r[1] }], { sz, ld, x: P.ml + w1 + pad, w: w2 - 2 * pad - 2 });
D.y = y0 + h;
});
},
fine(info) {
const ogg = [], parti = [];
const testo = s => { const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i) & 255; return u; };
const nuovo = () => { ogg.push(null); return ogg.length; };
const cat = nuovo(), radice = nuovo(), f1 = nuovo(), f2 = nuovo(), im = immagine ? nuovo() : 0;
const idPag = pagine.map(() => [nuovo(), nuovo()]);
const inf = nuovo();
ogg[cat - 1] = [testo('<< /Type /Catalog /Pages ' + radice + ' 0 R >>')];
ogg[radice - 1] = [testo('<< /Type /Pages /Count ' + pagine.length + ' /Kids [' + idPag.map(x => x[0] + ' 0 R').join(' ') + '] >>')];
ogg[f1 - 1] = [testo('<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman /Encoding /WinAnsiEncoding >>')];
ogg[f2 - 1] = [testo('<< /Type /Font /Subtype /Type1 /BaseFont /Times-Bold /Encoding /WinAnsiEncoding >>')];
if (im) ogg[im - 1] = [testo('<< /Type /XObject /Subtype /Image /Width ' + immagine.w + ' /Height ' + immagine.h + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + immagine.dati.length + ' >>\nstream\n'), immagine.dati, testo('\nendstream')];
pagine.forEach((p, i) => {
const c = p.join('\n');
ogg[idPag[i][0] - 1] = [testo('<< /Type /Page /Parent ' + radice + ' 0 R /MediaBox [0 0 ' + n(P.w) + ' ' + n(P.h) + '] /Resources << /Font << /F1 ' + f1 + ' 0 R /F2 ' + f2 + ' 0 R >>' + (im ? ' /XObject << /Im1 ' + im + ' 0 R >>' : '') + ' >> /Contents ' + idPag[i][1] + ' 0 R >>')];
ogg[idPag[i][1] - 1] = [testo('<< /Length ' + c.length + ' >>\nstream\n' + c + '\nendstream')];
});
ogg[inf - 1] = [testo('<< /Title ' + strPdf((info && info.titolo) || 'Documento') + ' /Producer (RILSIN) /Creator (RILSIN) >>')];
parti.push(testo('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n'));
let pos = parti[0].length; const off = [];
ogg.forEach((o, i) => {
off.push(pos);
const t = [testo((i + 1) + ' 0 obj\n')].concat(o, [testo('\nendobj\n')]);
t.forEach(x => { parti.push(x); pos += x.length; });
});
const xref = 'xref\n0 ' + (ogg.length + 1) + '\n0000000000 65535 f \n' + off.map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('');
parti.push(testo(xref + 'trailer\n<< /Size ' + (ogg.length + 1) + ' /Root ' + cat + ' 0 R /Info ' + inf + ' 0 R >>\nstartxref\n' + pos + '\n%%EOF\n'));
const tot = parti.reduce((t, x) => t + x.length, 0), u = new Uint8Array(tot);
let k = 0; parti.forEach(x => { u.set(x, k); k += x.length; });
return u;
}
};
D.pagina();
return D;
}
function jpeg(src, max) {
return new Promise(ok => {
if (!src) return ok(null);
const i = new Image();
i.onload = () => {
try {
const s = Math.min(1, (max || 400) / Math.max(i.naturalWidth, i.naturalHeight));
const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(i.naturalWidth * s)); c.height = Math.max(1, Math.round(i.naturalHeight * s));
const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(i, 0, 0, c.width, c.height);
const b = atob(c.toDataURL('image/jpeg', 0.9).split(',')[1]), u = new Uint8Array(b.length);
for (let k = 0; k < b.length; k++) u[k] = b.charCodeAt(k);
ok({ dati: u, w: c.width, h: c.height });
} catch (e) { ok(null); }
};
i.onerror = () => ok(null);
i.src = src;
});
}
function base64(u) { let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); }
RS.pdf = { documento, jpeg, base64, larghezza };
})();

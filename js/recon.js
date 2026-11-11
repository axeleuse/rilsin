(function (RS) {
'use strict';
const el = id => document.getElementById(id);
const G = 9.81;
const FONDI = [
['Asfalto asciutto', 0.70, 0.80], ['Asfalto bagnato', 0.45, 0.60], ['Asfalto liscio / usurato', 0.40, 0.55],
['Pavé / basolato', 0.45, 0.60], ['Sterrato / ghiaia', 0.45, 0.65], ['Erba', 0.35, 0.55],
['Neve compatta', 0.20, 0.30], ['Ghiaccio', 0.05, 0.15]
];
const num = v => { if (v == null || v === '') return null; const x = parseFloat(String(v).replace(',', '.')); return isFinite(x) ? x : null; };
const it = (v, d) => Number(v).toLocaleString('it-IT', { minimumFractionDigits: d, maximumFractionDigits: d });
const giu = (v, d) => { const k = Math.pow(10, d || 0); return Math.floor(v * k + 1e-9) / k; };
const su  = (v, d) => { const k = Math.pow(10, d || 0); return Math.ceil(v * k - 1e-9) / k; };
const forchetta = (a, b, d, unita) => {
const x = giu(a, d), y = su(b, d);
return (x === y ? 'circa ' + it(x, d) : 'tra ' + it(x, d) + ' e ' + it(y, d)) + ' ' + unita;
};
const escH = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function lunghezza(e) {
let d = 0;
for (let i = 1; i < (e.pts || []).length; i++) d += Math.hypot(e.pts[i].x - e.pts[i - 1].x, e.pts[i].y - e.pts[i - 1].y);
return d;
}
function tracce() {
return RS.scene.elements.filter(e => e.type === 'skid').map((e, i) => ({
id: e.id, rif: 'F' + (i + 1), nome: e.note || (e.stile === 'solco' ? 'solco / abrasione' : e.dashed ? 'scarrocciamento' : 'traccia di frenata'), len: lunghezza(e)
}));
}
const SEZ = ['frenata', 'arresto', 'urto', 'urto2d', 'curva', 'pedone', 'evit'];
const MU_PEDONE = [0.45, 0.75];
const angolo = g => ((g % 360) + 360) % 360;
function coppiaUrto() {
const veic = RS.scene.elements.filter(e => e.type === 'vehicle' && e.label);
const lettere = [...new Set(veic.map(v => v.label))].sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
const pronti = lettere.map(l => {
const urto = veic.find(v => v.label === l && v.fase === 'urto');
const quiete = veic.find(v => v.label === l && v.fase === 'quiete') || veic.find(v => v.label === l && !v.fase);
return urto && quiete ? { label: l, urto, quiete } : null;
}).filter(Boolean);
return pronti.length >= 2 ? pronti.slice(0, 2) : null;
}
function proiezioneDisegno() {
const els = RS.scene.elements, urto = els.find(e => e.type === 'symbol' && e.sym === 'impact');
const ped = els.filter(e => e.type === 'symbol' && (e.sym === 'pedone' || e.sym === 'cadavere'));
if (!urto || !ped.length) return null;
return Math.min.apply(null, ped.map(p => Math.hypot(p.x - urto.x, p.y - urto.y)));
}
function vuoto() {
return { frenata: { fondo: 0, eta: 100, i: 0, vf: 0 }, arresto: { fondo: 0, t: 1 }, urto: {}, curva: { fondo: 0 },
urto2d: { fondo: 0 }, pedone: { muMin: MU_PEDONE[0], muMax: MU_PEDONE[1], h: 0 }, evit: { fondo: 0, t: 1 }, allega: true };
}
function dati() {
const S = RS.scene;
if (!S.calcoli || typeof S.calcoli !== 'object') S.calcoli = vuoto();
const v = vuoto();
SEZ.forEach(k => { S.calcoli[k] = Object.assign({}, v[k], S.calcoli[k] || {}); });
if (S.calcoli.allega == null) S.calcoli.allega = true;
return S.calcoli;
}
function aderenza(c) {
const f = FONDI[c.fondo];
let a = num(c.muMin), b = num(c.muMax);
if (a == null && f) a = f[1];
if (b == null && f) b = f[2];
if (a == null || b == null || a <= 0 || b <= 0) return null;
if (a > b) { const t = a; a = b; b = t; }
const delFondo = f && Math.abs(a - f[1]) < 1e-9 && Math.abs(b - f[2]) < 1e-9;
return { min: a, max: b, testo: it(a, 2) + ' – ' + it(b, 2) + (delFondo ? ' (' + f[0].toLowerCase() + ', valori indicativi)' : ' (valori indicati dall\'operatore)') };
}
function calcola(C) {
const R = {};
const f = C.frenata || {}, d = num(f.d), mu = aderenza(f);
if (d != null && d > 0 && mu) {
const i = num(f.i) || 0, eta = (num(f.eta) == null ? 100 : num(f.eta)) / 100, vf = Math.max(0, num(f.vf) || 0), vfm = vf / 3.6;
const vel = m => { const k = m * eta + i / 100; return k > 0 ? Math.sqrt(vfm * vfm + 2 * G * d * k) : null; };
const a = vel(mu.min), b = vel(mu.max);
const rif = (f.tracce && f.tracce.length) ? ' (' + f.tracce.map(id => { const t = tracce().find(x => x.id === id); return t ? t.rif : ''; }).filter(Boolean).join(' + ') + ' del disegno)' : '';
const voci = [
['Lunghezza della traccia (d)', it(d, 2) + ' m' + rif],
['Aderenza (μ)', mu.testo],
['Pendenza (i)', i === 0 ? '0 %' : (i > 0 ? '+' : '') + it(i, 1) + ' % (' + (i > 0 ? 'salita' : 'discesa') + ')'],
['Efficienza della frenata (η)', it(eta * 100, 0) + ' %'],
['Velocità alla fine della traccia (v_f)', vf > 0 ? it(vf, 0) + ' km/h (per esempio al momento dell\'urto)' : '0 km/h (veicolo fermo alla fine della traccia)']
];
if (a == null || b == null) {
R.frenata = { ok: false, dati: voci, esito: 'Con questa pendenza in discesa l\'aderenza indicata non basterebbe ad arrestare il veicolo: verificare i dati.' };
} else {
R.frenata = { ok: true, dati: voci, formula: 'v₀ = √( v_f² + 2 · g · d · (μ · η ± i) )',
esito: 'Velocità all\'inizio della traccia: ' + forchetta(a * 3.6, b * 3.6, 0, 'km/h'),
breve: forchetta(a * 3.6, b * 3.6, 0, 'km/h') };
}
}
const s = C.arresto || {}, v = num(s.v), mu2 = aderenza(s), t = num(s.t);
if (v != null && v > 0 && mu2 && t != null && t >= 0) {
const vm = v / 3.6, sr = vm * t;
const sfCorto = vm * vm / (2 * G * mu2.max), sfLungo = vm * vm / (2 * G * mu2.min);
R.arresto = { ok: true,
dati: [['Velocità (v)', it(v, 0) + ' km/h'], ['Aderenza (μ)', mu2.testo], ['Tempo di reazione (t)', it(t, 1) + ' s']],
formula: 'spazio d\'arresto = v · t + v² / (2 · g · μ)',
esito: 'Spazio d\'arresto: ' + forchetta(sr + sfCorto, sr + sfLungo, 1, 'm') +
' (reazione ' + it(su(sr, 1), 1) + ' m + frenata ' + forchetta(sfCorto, sfLungo, 1, 'm').replace(/^tra /, 'da ').replace(' e ', ' a ') + ')',
breve: forchetta(sr + sfCorto, sr + sfLungo, 1, 'm') };
}
const u = C.urto || {}, m1 = num(u.m1), v1 = num(u.v1), m2 = num(u.m2), v2 = num(u.v2);
if (m1 > 0 && m2 > 0 && v1 != null && v2 != null) {
const u1 = v1 / 3.6, u2 = v2 / 3.6, vc = (m1 * u1 + m2 * u2) / (m1 + m2);
const diss = 0.5 * m1 * u1 * u1 + 0.5 * m2 * u2 * u2 - 0.5 * (m1 + m2) * vc * vc;
R.urto = { ok: true,
dati: [['Veicolo 1', it(m1, 0) + ' kg a ' + it(v1, 0) + ' km/h'], ['Veicolo 2', it(m2, 0) + ' kg a ' + it(v2, 0) + ' km/h']],
formula: 'v_comune = (m₁·v₁ + m₂·v₂) / (m₁ + m₂)',
esito: 'Velocità comune dopo l\'urto: ' + it(vc * 3.6, 1) + ' km/h · energia dissipata: ' + it(diss / 1000, 1) + ' kJ',
breve: it(vc * 3.6, 1) + ' km/h' };
}
const c = C.curva || {}, Rr = num(c.R), mu4 = aderenza(c);
if (Rr > 0 && mu4) {
const a = Math.sqrt(G * Rr * mu4.min), b = Math.sqrt(G * Rr * mu4.max);
R.curva = { ok: true,
dati: [['Raggio della curva (R)', it(Rr, 1) + ' m'], ['Aderenza trasversale (μ)', mu4.testo]],
formula: 'v = √( g · R · μ )',
esito: 'Velocità critica: ' + forchetta(a * 3.6, b * 3.6, 0, 'km/h'),
breve: forchetta(a * 3.6, b * 3.6, 0, 'km/h') };
}
const w = C.urto2d || {}, M1 = num(w.m1), M2 = num(w.m2);
const A1 = num(w.a1), A2 = num(w.a2), B1 = num(w.b1), B2 = num(w.b2), D1 = num(w.d1), D2 = num(w.d2), mu5 = aderenza(w);
if (M1 > 0 && M2 > 0 && [A1, A2, B1, B2, D1, D2].every(x => x != null) && D1 >= 0 && D2 >= 0 && mu5) {
const rad = x => x * Math.PI / 180, det = Math.sin(rad(A2) - rad(A1));
const n1 = w.n1 || '1', n2 = w.n2 || '2';
const risolvi = m => {
const u1 = Math.sqrt(2 * G * D1 * m), u2 = Math.sqrt(2 * G * D2 * m);
const Px = M1 * u1 * Math.cos(rad(B1)) + M2 * u2 * Math.cos(rad(B2)), Py = M1 * u1 * Math.sin(rad(B1)) + M2 * u2 * Math.sin(rad(B2));
return { u1, u2, v1: (Px * Math.sin(rad(A2)) - Py * Math.cos(rad(A2))) / (M1 * det), v2: (Py * Math.cos(rad(A1)) - Px * Math.sin(rad(A1))) / (M2 * det) };
};
const lo = risolvi(mu5.min), hi = risolvi(mu5.max);
const voci = [
['Veicolo ' + n1, it(M1, 0) + ' kg · direzione prima dell\'urto ' + it(A1, 0) + '° · dopo ' + it(B1, 0) + '° · spostamento fino alla quiete ' + it(D1, 2) + ' m'],
['Veicolo ' + n2, it(M2, 0) + ' kg · direzione prima dell\'urto ' + it(A2, 0) + '° · dopo ' + it(B2, 0) + '° · spostamento fino alla quiete ' + it(D2, 2) + ' m'],
['Aderenza dopo l\'urto (μ)', mu5.testo],
['Velocità dopo l\'urto (v′)', 'veicolo ' + n1 + ' ' + forchetta(lo.u1 * 3.6, hi.u1 * 3.6, 0, 'km/h') + ' · veicolo ' + n2 + ' ' + forchetta(lo.u2 * 3.6, hi.u2 * 3.6, 0, 'km/h')],
['Angoli', 'in gradi, misurati da destra del disegno in senso antiorario (0° verso destra, 90° verso l\'alto)']
];
if (Math.abs(det) < Math.sin(15 * Math.PI / 180)) {
R.urto2d = { ok: false, dati: voci, esito: 'Le direzioni dei due veicoli prima dell\'urto sono quasi parallele (differenza sotto 15°): il calcolo in due dimensioni non è affidabile. Usare l\'urto sulla stessa retta.' };
} else if (lo.v1 < 0 || lo.v2 < 0 || hi.v1 < 0 || hi.v2 < 0) {
R.urto2d = { ok: false, dati: voci, esito: 'Con questi angoli una delle velocità risulta negativa: le direzioni prima e dopo l\'urto non sono coerenti fra loro. Verificare gli angoli.' };
} else {
R.urto2d = { ok: true, dati: voci,
formula: 'm₁·v₁ + m₂·v₂ = m₁·v₁′ + m₂·v₂′ (lungo i due assi) ; v′ = √( 2 · g · μ · d′ )',
esito: 'Velocità al momento dell\'urto: veicolo ' + n1 + ' ' + forchetta(Math.min(lo.v1, hi.v1) * 3.6, Math.max(lo.v1, hi.v1) * 3.6, 0, 'km/h') +
'; veicolo ' + n2 + ' ' + forchetta(Math.min(lo.v2, hi.v2) * 3.6, Math.max(lo.v2, hi.v2) * 3.6, 0, 'km/h') };
}
}
const p = C.pedone || {}, sp = num(p.s), hp = Math.max(0, num(p.h) || 0);
let mp = aderenza(p);
if (sp > 0 && mp) {
if (Math.abs(mp.min - MU_PEDONE[0]) < 1e-9 && Math.abs(mp.max - MU_PEDONE[1]) < 1e-9)
mp = Object.assign({}, mp, { testo: it(mp.min, 2) + ' – ' + it(mp.max, 2) + ' (corpo del pedone sull\'asfalto, valori indicativi)' });
const vmin = m => { const k = sp - m * hp; return k > 0 ? Math.sqrt(2 * m * G * k / (1 + m * m)) : null; };
const vmax = m => { const k = sp - m * hp; return k > 0 ? Math.sqrt(2 * m * G * k) : null; };
const a = vmin(mp.min), b = vmax(mp.max);
const voci = [['Distanza di proiezione (s)', it(sp, 2) + ' m (dal punto d\'urto alla quiete del pedone)'], ['Aderenza del corpo (μ)', mp.testo],
['Altezza del baricentro all\'urto (h)', hp ? it(hp, 2) + ' m' : 'trascurata']];
if (a == null || b == null) R.pedone = { ok: false, dati: voci, esito: 'La distanza di proiezione è troppo corta rispetto all\'altezza indicata: verificare i dati.' };
else R.pedone = { ok: true, dati: voci,
formula: 'v_min = √( 2·μ·g·(s − μ·h) / (1 + μ²) ) ; v_max = √( 2·μ·g·(s − μ·h) )',
esito: 'Velocità del veicolo all\'urto: ' + forchetta(a * 3.6, b * 3.6, 0, 'km/h') + ' (intervallo di Searle)' };
}
const e = C.evit || {}, ve = num(e.v), De = num(e.D), te = num(e.t), lim = num(e.lim), mu7 = aderenza(e);
if (ve > 0 && De > 0 && te != null && te >= 0 && mu7) {
const arresto = (vk, m) => { const vm = vk / 3.6; return vm * te + vm * vm / (2 * G * m); };
const residua = (vk, m) => { const vm = vk / 3.6, libero = De - vm * te; if (libero <= 0) return vk; const q = vm * vm - 2 * G * m * libero; return q > 0 ? Math.sqrt(q) * 3.6 : 0; };
const vMaxArresto = m => 3.6 * G * m * (-te + Math.sqrt(te * te + 2 * De / (G * m)));
const giudizio = (vk, chi) => {
const corto = arresto(vk, mu7.max), lungo = arresto(vk, mu7.min);
const spazio = forchetta(corto, lungo, 1, 'm');
if (lungo <= De) return `A ${it(vk, 0)} km/h (${chi}) lo spazio d'arresto è ${spazio}: il veicolo poteva fermarsi prima del punto d'urto.`;
const f = forchetta(residua(vk, mu7.max), residua(vk, mu7.min), 0, 'km/h');
const vr = /^circa/.test(f) ? 'a ' + f : 'a una velocità ' + f;
if (corto > De) return `A ${it(vk, 0)} km/h (${chi}) lo spazio d'arresto è ${spazio}, più dei ${it(De, 1)} m disponibili: l'urto non era evitabile frenando e sarebbe avvenuto ${vr}.`;
return `A ${it(vk, 0)} km/h (${chi}) lo spazio d'arresto è ${spazio}, a cavallo dei ${it(De, 1)} m disponibili: l'esito dipende dall'aderenza reale (urto evitato oppure avvenuto ${vr}).`;
};
const frasi = [giudizio(ve, 'velocità stimata')];
if (lim > 0 && Math.abs(lim - ve) > 0.5) frasi.push(giudizio(lim, 'limite di velocità'));
frasi.push('Velocità massima che consentiva l\'arresto entro la distanza disponibile: ' + forchetta(vMaxArresto(mu7.min), vMaxArresto(mu7.max), 0, 'km/h') + '.');
if (De <= (ve / 3.6) * te) frasi.unshift(`Il pericolo è diventato percepibile a ${it(De, 1)} m, meno dello spazio percorso nel solo tempo di reazione (${it(su((ve / 3.6) * te, 1), 1)} m).`);
R.evit = { ok: true,
dati: [['Velocità stimata del veicolo', it(ve, 0) + ' km/h'], ['Limite di velocità', lim > 0 ? it(lim, 0) + ' km/h' : 'non indicato'],
['Distanza di avvistamento (D)', it(De, 1) + ' m (dal punto in cui il pericolo era percepibile al punto d\'urto)'],
['Tempo di reazione (t)', it(te, 1) + ' s'], ['Aderenza (μ)', mu7.testo]],
formula: 'spazio d\'arresto = v·t + v²/(2·g·μ) ; v_residua = √( v² − 2·g·μ·(D − v·t) ) ; v_max = g·μ·( √(t² + 2·D/(g·μ)) − t )',
esito: frasi.join(' ') };
}
return R;
}
const TITOLI = { frenata: 'Velocità dalla traccia di frenata', arresto: 'Spazio d\'arresto', urto: 'Urto — quantità di moto (1D)', curva: 'Velocità critica in curva',
urto2d: 'Urto in due dimensioni (incrocio)', pedone: 'Investimento di pedone — distanza di proiezione (Searle)', evit: 'Analisi tempo e spazio (evitabilità)' };
const AVVERTENZA = 'Calcoli a titolo di ausilio tecnico, eseguiti con formule standard di infortunistica stradale (g = 9,81 m/s²). ' +
'I coefficienti di aderenza sono indicativi e dipendono da veicolo, pneumatici e stato reale del fondo: per questo i risultati ' +
'sono espressi come intervallo. Gli esiti vanno valutati dall\'operatore e non sostituiscono l\'accertamento tecnico.';
function foglio(R, word) {
const chiavi = SEZ.filter(k => R[k]);
if (!chiavi.length) return '';
const td = 'border:1px solid #999;padding:5px 9px;font-size:12px;vertical-align:top';
const blocchi = chiavi.map(k => {
const r = R[k];
const righe = (r.dati || []).map(x => `<tr><td style="${td};width:42%">${escH(x[0])}</td><td style="${td}">${escH(x[1])}</td></tr>`).join('');
return `<table style="width:100%;border-collapse:collapse;margin:10px 0 4px;page-break-inside:avoid">
          <colgroup><col style="width:42%"><col></colgroup>
          <tr><td colspan="2" style="${td};background:#e9e9e9;font-weight:bold">${escH(TITOLI[k])}</td></tr>
          ${righe}
          ${r.formula ? `<tr><td style="${td}">Formula</td><td style="${td};font-family:'Times New Roman',serif">${escH(r.formula)}</td></tr>` : ''}
          <tr><td style="${td};font-weight:bold">Esito</td><td style="${td};font-weight:bold">${escH(r.esito)}</td></tr>
        </table>`;
}).join('');
return `<div style="margin-top:22px${word ? '' : ';page-break-inside:auto'}">
        <div style="font-size:13.5px;font-weight:bold;letter-spacing:.4px;border-bottom:1px solid #111;padding-bottom:3px">CALCOLI DI RICOSTRUZIONE CINEMATICA</div>
        ${blocchi}
        <p style="font-size:11px;color:#333;text-align:justify;margin-top:8px">${escH(AVVERTENZA)}</p>
      </div>`;
}
const recon = {
FONDI, calcola, vuoto,
perAtto(word) {
const C = RS.scene.calcoli;
if (!C || C.allega === false) return '';
return foglio(calcola(dati()), word);
},
open() {
const C = dati();
const f = C.frenata, tr = tracce();
if (f.tracce && f.tracce.length) {
const prese = f.tracce.map(id => tr.find(t => t.id === id)).filter(Boolean);
if (prese.length === f.tracce.length) f.d = +prese.reduce((s, t) => s + t.len, 0).toFixed(2);
else f.tracce = null;
}
const fondi = (sel) => FONDI.map((x, i) => `<option value="${i}"${+sel === i ? ' selected' : ''}>${x[0]}</option>`).join('');
const mu = (k, c) => {
const a = aderenza(c) || { min: '', max: '' };
return `<div class="rec-row"><label>Fondo</label><select data-k="${k}.fondo">${fondi(c.fondo)}</select></div>
          <div class="rec-row"><label>Aderenza μ (min – max)</label><span class="rec-mu">
            <input data-k="${k}.muMin" type="number" step="0.01" min="0" value="${a.min}">
            <input data-k="${k}.muMax" type="number" step="0.01" min="0" value="${a.max}"></span></div>`;
};
const val = (v) => (v == null ? '' : escH(v));
const coppia = coppiaUrto(), proiez = proiezioneDisegno();
const scelte = tr.map(t => `<option value="${t.id}"${f.tracce && f.tracce.length === 1 && f.tracce[0] === t.id ? ' selected' : ''}>${t.rif} · ${escH(t.nome)} · ${it(t.len, 2)} m</option>`).join('') +
(tr.length > 1 ? `<option value="*"${f.tracce && f.tracce.length > 1 ? ' selected' : ''}>Tutte le tracce (${tr.map(t => t.rif).join(' + ')}) · ${it(tr.reduce((s, t) => s + t.len, 0), 2)} m</option>` : '');
el('reconBody').innerHTML =
`<div class="rec-grid">
          <div class="rec-card">
            <h4>Velocità dalla frenata</h4>
            ${tr.length ? `<div class="rec-row"><label>Traccia dal disegno</label><select id="rcTr"><option value="">— scrivo la lunghezza —</option>${scelte}</select></div>` : ''}
            <div class="rec-row"><label>Lunghezza della traccia d (m)</label><input data-k="frenata.d" type="number" step="0.01" min="0" placeholder="es. 18" value="${val(f.d)}"></div>
            ${mu('frenata', f)}
            <div class="rec-row"><label>Pendenza i (%)</label><input data-k="frenata.i" type="number" step="0.1" value="${val(f.i)}"></div>
            <div class="rec-row"><label>Efficienza frenata η (%)</label><input data-k="frenata.eta" type="number" step="1" min="1" max="100" value="${val(f.eta)}"></div>
            <div class="rec-row"><label>Velocità a fine traccia (km/h)</label><input data-k="frenata.vf" type="number" step="1" min="0" value="${val(f.vf)}"></div>
            <div class="rec-out" id="out_frenata">—</div>
            <div class="rec-note">Pendenza: + in salita, − in discesa. Velocità a fine traccia: 0 se il veicolo si è fermato; se la traccia finisce nel punto d'urto, la velocità a cui è avvenuto l'urto.</div>
          </div>

          <div class="rec-card">
            <h4>Spazio d'arresto</h4>
            <div class="rec-row"><label>Velocità v (km/h)</label><input data-k="arresto.v" type="number" step="1" min="0" placeholder="es. 50" value="${val(C.arresto.v)}"></div>
            ${mu('arresto', C.arresto)}
            <div class="rec-row"><label>Tempo di reazione (s)</label><input data-k="arresto.t" type="number" step="0.1" min="0" value="${val(C.arresto.t)}"></div>
            <div class="rec-out" id="out_arresto">—</div>
            <div class="rec-note">Spazio di reazione (v·t) più spazio di frenata (v²/2gμ).</div>
          </div>

          <div class="rec-card">
            <h4>Urto — quantità di moto (1D)</h4>
            <div class="rec-row2">
              <div><label>m₁ (kg)</label><input data-k="urto.m1" type="number" step="10" placeholder="1200" value="${val(C.urto.m1)}"></div>
              <div><label>v₁ (km/h)</label><input data-k="urto.v1" type="number" step="1" placeholder="50" value="${val(C.urto.v1)}"></div>
            </div>
            <div class="rec-row2">
              <div><label>m₂ (kg)</label><input data-k="urto.m2" type="number" step="10" placeholder="1500" value="${val(C.urto.m2)}"></div>
              <div><label>v₂ (km/h)</label><input data-k="urto.v2" type="number" step="1" placeholder="0" value="${val(C.urto.v2)}"></div>
            </div>
            <div class="rec-out" id="out_urto">—</div>
            <div class="rec-note">Urto anelastico sulla stessa retta: velocità comune dopo l'urto ed energia dissipata. Velocità negativa se il veicolo viaggiava in verso opposto.</div>
          </div>

          <div class="rec-card">
            <h4>Urto in due dimensioni (incrocio)</h4>
            ${coppia ? `<div class="pbtns" style="margin:0 0 6px"><button class="mini" id="rc2dDis">↧ Dal disegno (${escH(coppia[0].label)} e ${escH(coppia[1].label)})</button></div>` : ''}
            <div class="rec-row2">
              <div><label>Veicolo 1: massa (kg)</label><input data-k="urto2d.m1" type="number" step="10" placeholder="1200" value="${val(C.urto2d.m1)}"></div>
              <div><label>Veicolo 2: massa (kg)</label><input data-k="urto2d.m2" type="number" step="10" placeholder="1500" value="${val(C.urto2d.m2)}"></div>
            </div>
            <div class="rec-row2">
              <div><label>1: direzione prima (°)</label><input data-k="urto2d.a1" type="number" step="1" placeholder="0" value="${val(C.urto2d.a1)}"></div>
              <div><label>2: direzione prima (°)</label><input data-k="urto2d.a2" type="number" step="1" placeholder="90" value="${val(C.urto2d.a2)}"></div>
            </div>
            <div class="rec-row2">
              <div><label>1: direzione dopo (°)</label><input data-k="urto2d.b1" type="number" step="1" placeholder="30" value="${val(C.urto2d.b1)}"></div>
              <div><label>2: direzione dopo (°)</label><input data-k="urto2d.b2" type="number" step="1" placeholder="60" value="${val(C.urto2d.b2)}"></div>
            </div>
            <div class="rec-row2">
              <div><label>1: spostamento dopo (m)</label><input data-k="urto2d.d1" type="number" step="0.1" min="0" placeholder="8" value="${val(C.urto2d.d1)}"></div>
              <div><label>2: spostamento dopo (m)</label><input data-k="urto2d.d2" type="number" step="0.1" min="0" placeholder="6" value="${val(C.urto2d.d2)}"></div>
            </div>
            ${mu('urto2d', C.urto2d)}
            <div class="rec-out" id="out_urto2d">—</div>
            <div class="rec-note">Angoli in gradi da destra del disegno, in senso antiorario (0° verso destra, 90° verso l'alto). Spostamento: dal punto d'urto alla quiete. Con il disegno: posizione «Urto» e posizione di quiete di ciascun veicolo (Dinamica).</div>
          </div>

          <div class="rec-card">
            <h4>Velocità critica in curva</h4>
            <div class="rec-row"><label>Raggio curva R (m)</label><input data-k="curva.R" type="number" step="1" min="0" placeholder="40" value="${val(C.curva.R)}"></div>
            ${mu('curva', C.curva)}
            <div class="rec-out" id="out_curva">—</div>
            <div class="rec-note">v = √(g·R·μ): velocità oltre la quale il veicolo tende a sbandare.</div>
          </div>

          <div class="rec-card">
            <h4>Investimento di pedone</h4>
            ${proiez != null ? `<div class="pbtns" style="margin:0 0 6px"><button class="mini" id="rcPedDis">↧ Dal disegno (${it(proiez, 2)} m)</button></div>` : ''}
            <div class="rec-row"><label>Distanza di proiezione s (m)</label><input data-k="pedone.s" type="number" step="0.1" min="0" placeholder="es. 14" value="${val(C.pedone.s)}"></div>
            <div class="rec-row"><label>Aderenza μ del corpo (min – max)</label><span class="rec-mu">
              <input data-k="pedone.muMin" type="number" step="0.01" min="0" value="${val(C.pedone.muMin)}">
              <input data-k="pedone.muMax" type="number" step="0.01" min="0" value="${val(C.pedone.muMax)}"></span></div>
            <div class="rec-row"><label>Altezza baricentro h (m)</label><input data-k="pedone.h" type="number" step="0.05" min="0" value="${val(C.pedone.h)}"></div>
            <div class="rec-out" id="out_pedone">—</div>
            <div class="rec-note">Formula di Searle: dalla distanza fra punto d'urto e posizione di quiete del pedone. Il risultato è un intervallo ampio per natura; h = 0 trascura l'altezza (in genere 0,9–1,1 m per un adulto).</div>
          </div>

          <div class="rec-card">
            <h4>Analisi tempo e spazio (evitabilità)</h4>
            <div class="rec-row"><label>Velocità stimata v (km/h)</label><input data-k="evit.v" type="number" step="1" min="0" placeholder="es. 70" value="${val(C.evit.v)}"></div>
            <div class="rec-row"><label>Limite di velocità (km/h)</label><input data-k="evit.lim" type="number" step="10" min="0" placeholder="es. 50" value="${val(C.evit.lim)}"></div>
            <div class="rec-row"><label>Distanza di avvistamento D (m)</label><input data-k="evit.D" type="number" step="0.5" min="0" placeholder="es. 35" value="${val(C.evit.D)}"></div>
            <div class="rec-row"><label>Tempo di reazione (s)</label><input data-k="evit.t" type="number" step="0.1" min="0" value="${val(C.evit.t)}"></div>
            ${mu('evit', C.evit)}
            <div class="rec-out" id="out_evit">—</div>
            <div class="rec-note">D: distanza fra il punto in cui il pericolo era percepibile e il punto d'urto. Confronta lo spazio d'arresto alla velocità stimata e al limite; indica la velocità che avrebbe consentito di fermarsi.</div>
          </div>
        </div>
        <div class="rec-azioni">
          <label class="rec-allega"><input type="checkbox" id="rcAllega"${C.allega !== false ? ' checked' : ''}> Allega questi calcoli all'atto delle misure</label>
          <button class="mini" id="rcStampa">🖨 Stampa i calcoli</button>
        </div>
        <div class="rec-warn">⚠ ${escH(AVVERTENZA)}</div>`;
const body = el('reconBody');
body.oninput = (ev) => this._leggi(ev);
body.onchange = (ev) => this._leggi(ev);
el('rcStampa').onclick = () => this.stampa();
if (el('rc2dDis')) el('rc2dDis').onclick = () => {
const cp = coppiaUrto(); if (!cp) return;
const u = C.urto2d;
cp.forEach((v, i) => {
const n = i + 1;
u['a' + n] = Math.round(angolo(-(v.urto.rot || 0)));
u['b' + n] = Math.round(angolo(Math.atan2(-(v.quiete.y - v.urto.y), v.quiete.x - v.urto.x) * 180 / Math.PI));
u['d' + n] = +Math.hypot(v.quiete.x - v.urto.x, v.quiete.y - v.urto.y).toFixed(2);
u['n' + n] = v.label;
});
RS.scene.emit('change'); this.open();
if (RS.ui) RS.ui.toast('Angoli e spostamenti presi dal disegno: inserisci le masse');
};
if (el('rcPedDis')) el('rcPedDis').onclick = () => {
C.pedone.s = +proiezioneDisegno().toFixed(2); RS.scene.emit('change'); this.open();
};
el('reconModal').hidden = false;
this.compute();
},
close() { el('reconModal').hidden = true; },
_leggi(ev) {
const C = dati(), t = ev.target;
if (t.id === 'rcAllega') { C.allega = t.checked; RS.scene.emit('change'); return; }
if (t.id === 'rcTr') {
const tr = tracce();
const scelte = t.value === '*' ? tr : tr.filter(x => x.id === t.value);
if (scelte.length) {
C.frenata.tracce = scelte.map(x => x.id);
C.frenata.d = +scelte.reduce((s, x) => s + x.len, 0).toFixed(2);
const campo = el('reconBody').querySelector('[data-k="frenata.d"]'); if (campo) campo.value = C.frenata.d;
} else C.frenata.tracce = null;
this.compute(); RS.scene.emit('change'); return;
}
const k = t.dataset && t.dataset.k; if (!k) return;
const [sez, campo] = k.split('.');
if (campo === 'fondo') {
C[sez].fondo = +t.value; C[sez].muMin = FONDI[+t.value][1]; C[sez].muMax = FONDI[+t.value][2];
const card = t.closest('.rec-card');
card.querySelector(`[data-k="${sez}.muMin"]`).value = C[sez].muMin;
card.querySelector(`[data-k="${sez}.muMax"]`).value = C[sez].muMax;
} else {
C[sez][campo] = t.value === '' ? null : num(t.value);
if (sez === 'frenata' && campo === 'd') { C.frenata.tracce = null; const s = el('rcTr'); if (s) s.value = ''; }
}
this.compute();
RS.scene.emit('change');
},
compute() {
const R = calcola(dati());
SEZ.forEach(k => {
const o = el('out_' + k); if (!o) return;
const r = R[k];
o.classList.toggle('rec-err', !!(r && !r.ok));
o.innerHTML = r ? escH(r.esito).replace(/(tra [^)]+?(km\/h|m)|circa [^)]+?(km\/h|m)|[\d.,]+ km\/h|[\d.,]+ kJ)/g, '<b>$1</b>') : '—';
});
},
stampa() {
const R = calcola(dati());
const corpo = foglio(R, false);
if (!corpo) { if (RS.ui) RS.ui.toast('Nessun calcolo completo da stampare'); return; }
const m = RS.scene.meta || {};
const info = [m.numero ? 'Prot. n. ' + m.numero : '', m.localita || '', m.data ? 'Data: ' + m.data : ''].filter(Boolean).join(' · ');
const win = window.open('', '_blank');
if (!win) { alert('Consenti i popup per stampare i calcoli.'); return; }
win.document.write(`<!DOCTYPE html><html lang="it"><head><meta charset="utf-8"><title>Calcoli di ricostruzione</title>
        <style>@page{size:A4 portrait;margin:16mm}body{font:12.5px/1.5 "Times New Roman",Georgia,serif;color:#111}
        .noprint{text-align:center;margin-bottom:10px}@media print{.noprint{display:none}}</style></head><body>
        <div class="noprint"><button onclick="try{opener.RilsinAndroid.stampa()}catch(e){window.print()}">🖨 Stampa / Salva PDF</button></div>
        ${RS.verifica && !RS.verifica.chiuso() ? '<div style="position:fixed;top:42%;left:0;right:0;text-align:center;font:bold 120px Arial,sans-serif;color:rgba(204,0,0,.13);transform:rotate(-32deg);pointer-events:none;letter-spacing:12px">BOZZA</div>' : ''}
        ${RS.exportUtil.righeComando(m).map((r, i) => `<div${i ? '' : ' style="font-weight:bold"'}>${escH(r)}</div>`).join('')}
        ${info ? `<div style="margin:6px 0 4px;font-size:12px">${escH(info)}</div>` : ''}
        ${corpo}
        <div style="margin-top:40px;text-align:right"><div style="display:inline-block;min-width:70mm;text-align:center;border-top:1px solid #111;padding-top:3px;margin-top:14mm">L'operatore</div></div>
        </body></html>`);
win.document.close();
}
};
RS.recon = recon;
})(window.RS = window.RS || {});

(function () {
'use strict';
const el = id => document.getElementById(id);
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const S = () => RS.scene;
const uid = () => 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const p2 = v => String(v).padStart(2, '0');
const LETTERE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const URL_PORTALE = 'https://www.ilportaledellautomobilista.it/web/portale-automobilista/ext/verifica-copertura-rc';
const VERIFICHE = {
rca: { t: 'Copertura RCA', ic: '🛡', ente: 'Portale dell\'Automobilista (Ministero dei Trasporti)', url: URL_PORTALE },
revisione: { t: 'Revisione', ic: '🔧', ente: 'Portale dell\'Automobilista (Ministero dei Trasporti)', url: 'https://www.ilportaledellautomobilista.it/interrogazionistoricorevisioni/spa/' },
rubato: { t: 'Rubato o smarrito', ic: '🚨', ente: 'Ministero dell\'Interno (Polizia Criminale)', url: 'https://www.crimnet.dcpc.interno.gov.it/crimnet/ricerca-targhe-telai-rubati-smarriti' },
classe: { t: 'Classe ambientale e CO2', ic: '🌿', ente: 'Portale dell\'Automobilista (Ministero dei Trasporti)', url: 'https://www.ilportaledellautomobilista.it/web/portale-automobilista/ext/verifica-classe-ambientale-veicolo' }
};
const TUTTE = Object.keys(VERIFICHE);
const TITOLI = {};
const titoloVer = k => (VERIFICHE[k] || { t: TITOLI[k] || k }).t;
const NOMI_DOC = { libretto: 'Carta di circolazione', patente: 'Patente', documento: 'Documento d\'identità', docprop: 'Documento del proprietario', assicurazione: 'Documento assicurativo' };
const MESI_CF = 'ABCDEHLMPRST', OMO = 'LMNPQRSTUV';
const DISP = [1, 0, 5, 7, 9, 13, 15, 17, 19, 21, 2, 4, 18, 20, 11, 3, 6, 8, 12, 14, 16, 10, 22, 25, 24, 23];
function carControllo(c) {
let s = 0;
for (let i = 0; i < 15; i++) {
const ch = c[i], v = /\d/.test(ch) ? +ch : ch.charCodeAt(0) - 65;
s += i % 2 === 0 ? DISP[v] : v;
}
return String.fromCharCode(65 + s % 26);
}
let comuni = null;
function comune(cod) {
if (!comuni) {
comuni = new Map();
String(RS.COMUNI_CF || '').split('|').forEach(r => { const i = r.lastIndexOf(':'); if (i > 4) comuni.set(r.slice(0, 4), { nome: r.slice(4, i), sigla: r.slice(i + 1) }); });
}
return comuni.get(cod);
}
function leggiCF(v) {
const c = String(v || '').toUpperCase().replace(/\s/g, '');
if (!c) return null;
if (c.length !== 16) return { ok: false, errore: c.length < 16 ? 'Mancano ' + (16 - c.length) + (16 - c.length === 1 ? ' carattere' : ' caratteri') : 'Troppi caratteri: sono 16' };
if (!/^[A-Z]{6}[0-9LMNPQRSTUV]{2}[ABCDEHLMPRST][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]$/.test(c))
return { ok: false, errore: 'Formato non valido: 6 lettere, 2 cifre, 1 lettera, 2 cifre, 1 lettera, 3 cifre, 1 lettera' };
if (carControllo(c) !== c[15]) return { ok: false, errore: 'L\'ultimo carattere (di controllo) non torna: c\'è un errore in uno dei 16 caratteri' };
const num = s => s.split('').map(ch => /\d/.test(ch) ? ch : String(OMO.indexOf(ch))).join('');
const aa = +num(c.slice(6, 8)), mm = MESI_CF.indexOf(c[8]) + 1;
let gg = +num(c.slice(9, 11));
const sesso = gg > 40 ? 'F' : 'M';
if (gg > 40) gg -= 40;
if (gg < 1 || gg > 31) return { ok: false, errore: 'Il giorno di nascita non è valido' };
const anno = (aa > new Date().getFullYear() % 100 ? 1900 : 2000) + aa;
const cod = c[11] + num(c.slice(12, 15)), cm = comune(cod);
return { ok: true, cf: c, nascita: p2(gg) + '/' + p2(mm) + '/' + anno, sesso, luogo: cm ? cm.nome + ' (' + cm.sigla + ')' : '', estero: cod[0] === 'Z', codice: cod };
}
function leggiTarga(v) {
const t = String(v || '').toUpperCase().replace(/[\s\-.]/g, '');
if (!t) return null;
if (/^[A-Z]{2}\d{3}[A-Z]{2}$/.test(t)) return { ok: true, t };
if (/^[A-Z]{2}\d{5}$/.test(t)) return { ok: true, t, nota: 'targa da moto' };
if (/^X[A-Z0-9]{5}$/.test(t)) return { ok: true, t, nota: 'targa da ciclomotore' };
return { ok: false, t, errore: 'Non è nel formato delle targhe italiane attuali (va bene se è estera o vecchia)' };
}
const TIPI = [['auto', 'Autovettura'], ['moto', 'Motociclo'], ['ciclomotore', 'Ciclomotore'], ['autocarro', 'Autocarro'], ['bus', 'Autobus'], ['bici', 'Velocipede'], ['monopattino', 'Monopattino'], ['altro', 'Altro']];
const nomeTipo = k => (TIPI.find(t => t[0] === k) || [0, 'Veicolo'])[1];
const senzaPatente = v => v.tipo === 'bici' || v.tipo === 'monopattino';
const ESITI = [['', '—'], ['illeso', 'Illeso'], ['ferito', 'Ferito'], ['deceduto', 'Deceduto'], ['non noto', 'Non noto']];
function dati() {
const m = S().meta = S().meta || {};
const c = m.coinvolti = m.coinvolti || {};
c.veicoli = c.veicoli || []; c.pedoni = c.pedoni || []; c.testimoni = c.testimoni || [];
return c;
}
const veicoliDisegnati = () => {
const per = new Map();
S().elements.forEach(e => {
if (e.type !== 'vehicle' || !e.label || e.inc) return;
const L = String(e.label).trim(), x = per.get(L);
if (!x || (x.fase && x.fase !== 'quiete' && (!e.fase || e.fase === 'quiete'))) per.set(L, e);
});
return Array.from(per.values());
};
function veicoloVuoto(v) {
const pieno = o => o && Object.keys(o).some(k => k !== 'id' && o[k] !== '' && o[k] != null && !(typeof o[k] === 'object' && !Object.keys(o[k]).length));
const F = RS.fascicolo, doc = F && F.documenti ? F.documenti().some(p => String(p.guida || '').indexOf('doc:' + v.lettera) === 0) : false;
return !v.targa && !v.marca && !v.telaio && !v.immatricolazione && !v.euro && !v.co2 &&!pieno(v.revisione) && (!v.tipo || v.tipo === 'auto') && !pieno(v.conducente) && !pieno(v.proprietario) && !pieno(v.patente) && !pieno(v.ass) &&
!(v.passeggeri || []).length && !(v.verifiche && Object.keys(v.verifiche).length) && !doc;
}
function tipoDaKind(k) {
k = String(k || '');
if (/moto|scooter/.test(k)) return 'moto';
if (/bici|bike/.test(k)) return 'bici';
if (/monopatt/.test(k)) return 'monopattino';
if (/camion|autocarro|furgone|truck|van/.test(k)) return 'autocarro';
if (/bus/.test(k)) return 'bus';
return 'auto';
}
function nuovoVeicolo(lettera, e) {
return { id: uid(), lettera, tipo: e ? tipoDaKind(e.kind) : 'auto', targa: e && e.targa ? String(e.targa).toUpperCase().replace(/\s/g, '') : '', marca: (e && e.modello) || '', telaio: '',
conducente: { id: uid(), nominativo: (e && e.conducente) || '' }, propUguale: true, proprietario: { id: uid() },
patente: {}, ass: {}, passeggeri: [] };
}
function importaDisegno() {
const c = dati(), dis = veicoliDisegnati(), sulDisegno = new Set(dis.map(e => String(e.label).trim()));
if (sulDisegno.size) c.veicoli = c.veicoli.filter(v => sulDisegno.has(v.lettera) || !veicoloVuoto(v));
const ci = new Set(c.veicoli.map(v => v.lettera));
dis.forEach(e => { const L = String(e.label).trim(); if (!ci.has(L)) { c.veicoli.push(nuovoVeicolo(L, e)); ci.add(L); } });
dis.forEach(e => {
const v = c.veicoli.find(x => x.lettera === String(e.label).trim()); if (!v) return;
if (!v.targa && e.targa) v.targa = String(e.targa).toUpperCase().replace(/\s/g, '');
if (!v.marca && e.modello) v.marca = String(e.modello).trim();
v.conducente = v.conducente || { id: uid() };
if (!v.conducente.nominativo && e.conducente) v.conducente.nominativo = String(e.conducente).trim();
if ((!v.tipo || v.tipo === 'auto') && veicoloVuoto(Object.assign({}, v, { targa: '', marca: '', conducente: {} }))) v.tipo = tipoDaKind(e.kind);
});
c.veicoli.sort((a, b) => String(a.lettera).localeCompare(String(b.lettera)));
}
function sincronizza() {
const m = S().meta, c = m && m.coinvolti; if (!c || !c.veicoli) return false;
let cambiato = false;
veicoliDisegnati().forEach(e => {
const v = c.veicoli.find(x => x.lettera === e.label); if (!v) return;
const t = leggiTarga(v.targa), nuovi = { targa: t ? t.t : '', modello: v.marca || '', conducente: (v.conducente && v.conducente.nominativo) || '' };
Object.keys(nuovi).forEach(k => { if (nuovi[k] && e[k] !== nuovi[k]) { e[k] = nuovi[k]; cambiato = true; } });
});
if (cambiato) S().render();
return cambiato;
}
let tSalva = null;
function salva(subito) {
clearTimeout(tSalva);
const f = () => { sincronizza(); S().emit('change'); };
if (subito) f(); else tSalva = setTimeout(f, 500);
}
function feriti() {
const c = dati(), l = []; let ignoti = 0;
const vedi = (p, ruolo) => {
if (!p) return;
if (p.esito === 'ferito' || p.esito === 'deceduto') l.push({ chi: p.nominativo || '', ruolo, esito: p.esito });
else if (!p.esito || p.esito === 'non noto') ignoti++;
};
c.veicoli.forEach(v => {
vedi(v.conducente, 'conducente del veicolo ' + v.lettera);
(v.passeggeri || []).forEach(p => vedi(p, 'passeggero del veicolo ' + v.lettera));
});
c.pedoni.forEach((p, i) => vedi(p, 'pedone' + (c.pedoni.length > 1 ? ' ' + (i + 1) : '')));
return { l, ignoti };
}
function mancaPersona(p, ruolo) {
const l = [];
if (!p || !(p.nominativo || '').trim()) l.push('cognome e nome' + (ruolo ? ' del ' + ruolo : ''));
else if (!p.cf && !p.nascita) l.push('codice fiscale o data di nascita' + (ruolo ? ' del ' + ruolo : ''));
return l;
}
function mancaVeicolo(v) {
const l = [];
if (v.tipo !== 'bici' && v.tipo !== 'monopattino' && !v.targa) l.push('targa');
if (!v.marca) l.push('marca e modello');
l.push(...mancaPersona(v.conducente, 'conducente'));
if (!senzaPatente(v) && !(v.patente && v.patente.numero)) l.push('patente');
if (!senzaPatente(v) && !(v.ass && v.ass.compagnia)) l.push('compagnia di assicurazione');
if (!senzaPatente(v) && !(v.ass && v.ass.polizza)) l.push('numero di polizza');
if (!v.propUguale && !(v.proprietario && (v.proprietario.nominativo || '').trim())) l.push('proprietario');
return l;
}
function riassunto() {
const c = dati(); let manca = 0;
c.veicoli.forEach(v => { manca += mancaVeicolo(v).length; });
c.pedoni.forEach(p => { manca += mancaPersona(p).length; });
return { veicoli: c.veicoli.length, pedoni: c.pedoni.length, testimoni: c.testimoni.length, manca };
}
const getP = (o, p) => p.split('.').reduce((a, k) => (a == null ? undefined : a[k]), o);
function setP(o, p, v) { const k = p.split('.'), u = k.pop(); const t = k.reduce((a, x) => (a[x] = a[x] || {}), o); t[u] = v; }
const ORA2 = new Date().getFullYear() % 100;
const titolo = s => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim().replace(/(^|[\s'’\-])(\S)/g, (m, a, b) => a + b.toUpperCase());
function dataIt(g, m, a, nascita) {
a = String(a); if (a.length === 2) a = String((nascita && +a > ORA2 ? 1900 : 2000) + +a);
if (+g < 1 || +g > 31 || +m < 1 || +m > 12) return '';
return p2(+g) + '/' + p2(+m) + '/' + a;
}
const cifreData = s => String(s).replace(/[Oo]/g, '0').replace(/[Il|]/g, '1');
function trovaData(s, nascita) {
const x = /(\d{1,2})\s*[\/.\-]\s*(\d{1,2})\s*[\/.\-]\s*(\d{4}|\d{2})(?!\d)/.exec(cifreData(s));
return x ? dataIt(x[1], x[2], x[3], nascita) : '';
}
const IN_LETTERA = { '0': 'O', '1': 'I', '2': 'Z', '4': 'A', '5': 'S', '6': 'G', '7': 'T', '8': 'B' };
const IN_CIFRA = { O: '0', D: '0', Q: '0', I: '1', J: '1', Z: '2', B: '8', G: '6', A: '4' };
const POS_LETTERA = [0, 1, 2, 3, 4, 5, 8, 11, 15], POS_CIFRA = [6, 7, 9, 10, 12, 13, 14];
function correggiCF(s) {
const c = s.split('');
let cambi = 0;
POS_LETTERA.forEach(i => { if (IN_LETTERA[c[i]]) { c[i] = IN_LETTERA[c[i]]; cambi++; } });
const w = POS_LETTERA.filter(i => c[i] === 'W');
if (w.length && w.length + cambi <= 3) { const d = c.slice(); w.forEach(i => { d[i] = 'M'; }); const r = leggiCF(d.join('')); if (r && r.ok && (r.luogo || r.estero) && !(leggiCF(c.join('')) || {}).ok) { cambi += w.length; w.forEach(i => { c[i] = 'M'; }); } }
POS_CIFRA.forEach(i => { if (IN_CIFRA[c[i]]) { c[i] = IN_CIFRA[c[i]]; cambi++; } });
if (cambi > 3 || POS_CIFRA.filter(i => /\d/.test(s[i])).length < 4) return null;
const dubbi = POS_CIFRA.filter(i => 'STL'.indexOf(c[i]) >= 0).slice(0, 5);
for (let k = 0; k < (1 << dubbi.length); k++) {
const d = c.slice();
let piu = 0;
dubbi.forEach((i, j) => { if (k & (1 << j)) { d[i] = { S: '5', T: '7', L: '1' }[d[i]]; piu++; } });
if (cambi + piu > 3) continue;
const r = leggiCF(d.join(''));
if (r && r.ok && (r.luogo || r.estero)) return r;
}
return null;
}
function trovaCF(righe) {
for (const r of righe) {
const w = r.t.toUpperCase().split(/[^A-Z0-9]+/).filter(Boolean);
for (let i = 0; i < w.length; i++) {
let s = '';
for (let j = i; j < Math.min(w.length, i + 3); j++) {
s += w[j];
if (s.length === 16) { const x = correggiCF(s); if (x) return Object.assign(x, { conf: r.c }); }
if (s.length >= 16) break;
}
if (w[i].length > 16 && w[i].length <= 19) for (let k = 0; k + 16 <= w[i].length; k++) { const x = correggiCF(w[i].slice(k, k + 16)); if (x) return Object.assign(x, { conf: r.c }); }
}
}
return null;
}
function trovaTarga(righe) {
for (const r of righe) {
const s = r.t.toUpperCase().replace(/[^A-Z0-9 ]/g, ' ');
const x = /\b([A-Z0-9]{2})\s?([A-Z0-9]{3})\s?([A-Z0-9]{2})\b/g; let m;
while ((m = x.exec(s))) {
const fix = (t, cifre) => t.split('').map(ch => cifre ? (IN_CIFRA[ch] || ch) : (IN_LETTERA[ch] || ch)).join('');
const t = fix(m[1], false) + fix(m[2], true) + fix(m[3], false);
if (/^[A-Z]{2}\d{3}[A-Z]{2}$/.test(t)) return { v: t, conf: r.c };
}
}
return null;
}
function cifraMrz(s) {
let t = 0;
for (let i = 0; i < s.length; i++) { const ch = s[i]; const v = ch === '<' ? 0 : /\d/.test(ch) ? +ch : ch.charCodeAt(0) - 55; t += v * [7, 3, 1][i % 3]; }
return String(t % 10);
}
function leggiMrz(righe) {
const L = righe.map(r => ({ t: r.t.toUpperCase().replace(/\s/g, '').replace(/[«‹(]/g, '<'), c: r.c }));
const o = {};
L.forEach(r => {
const d = /([0-9OBSIZG]{6})([0-9OBSIZG])([MFW<])([0-9OBSIZG]{6})([0-9OBSIZG])([A-Z]{3})/.exec(r.t);
if (d && d[3] === 'W') d[3] = 'M';
if (d && !o.nascita) {
const z = s => s.replace(/O/g, '0').replace(/B/g, '8').replace(/S/g, '5').replace(/I/g, '1').replace(/Z/g, '2').replace(/G/g, '6');
const n = z(d[1]), s = z(d[4]);
if (cifraMrz(n) === z(d[2])) o.nascita = { v: dataIt(n.slice(4, 6), n.slice(2, 4), n.slice(0, 2), true), conf: 1 };
if (cifraMrz(s) === z(d[5])) o.scadenza = { v: dataIt(s.slice(4, 6), s.slice(2, 4), s.slice(0, 2), false), conf: 1 };
if (d[3] !== '<') o.sesso = { v: d[3], conf: 1 };
}
const n = /^[ACIP][A-Z<]([A-Z]{3})([A-Z0-9<]{9})(\d)/.exec(r.t);
if (n && cifraMrz(n[2]) === n[3]) o.numero = { v: n[2].replace(/</g, ''), conf: 1, tipo: n[0][0] === 'P' ? 'PASS' : 'CI' };
const nm = /^([A-Z]+(?:<[A-Z]+)*)<<([A-Z]+(?:<[A-Z]+)*)/.exec(r.t);
if (nm && !/^[ACIP][A-Z<][A-Z]{3}[A-Z0-9<]{9}\d/.test(r.t) && !o.nominativo) o.nominativo = { v: titolo(nm[1].replace(/</g, ' ') + ' ' + nm[2].replace(/</g, ' ')), conf: r.c };
});
return o;
}
function leggiPatente(righe) {
const f = {};
const etichette = s => {
const t = ' ' + s.replace(/^\s*[Il|]\s*([.,])/, '1$1').replace(/(\d)(4\s?[abcdABCD]\s*[.,:])/g, '$1 $2') + ' ';
const re = /\s(4\s?[abcdABCD]|[1-9])\s*[.,:]\s*/g; const pos = []; let m;
while ((m = re.exec(t))) pos.push({ k: m[1].replace(/\s/g, '').toLowerCase(), da: m.index + m[0].length, a: m.index });
if (!pos.length) { const m0 = /^\s(4\s?[abcd]|[1-9])\s+(?=[A-Z0-9])/i.exec(t); if (m0) pos.push({ k: m0[1].replace(/\s/g, '').toLowerCase(), da: m0[0].length, a: 0 }); }
return { t, pos };
};
righe.forEach((r, ir) => {
const { t, pos } = etichette(r.t);
pos.forEach((p, i) => {
let v = t.slice(p.da, i + 1 < pos.length ? pos[i + 1].a : t.length).trim();
if (!v && i === pos.length - 1 && righe[ir + 1] && !etichette(righe[ir + 1].t).pos.length) v = righe[ir + 1].t.trim();
if (v && !f[p.k]) f[p.k] = { v, conf: r.c };
});
});
if (!((f['1'] && f['2']) || f['5'])) return null;
const o = {};
if (f['1'] || f['2']) o.nominativo = { v: titolo(lettere([f['1'] && f['1'].v, f['2'] && f['2'].v].filter(Boolean).join(' '))), conf: Math.min(f['1'] ? f['1'].conf : 1, f['2'] ? f['2'].conf : 1) };
if (f['3']) {
const d = trovaData(f['3'].v, true); if (d) o.nascita = { v: d, conf: f['3'].conf };
const l = lettere(f['3'].v.replace(/^[\dOIl\/.\-\s]+/, '').trim()); if (l) o.luogo = { v: l.replace(/^(.*?)\s*\(\s*([A-Z]{2})\s*\)?$/i, (x, a, b) => titolo(a) + ' (' + b.toUpperCase() + ')'), conf: f['3'].conf };
}
if (f['4b']) { const d = trovaData(f['4b'].v); if (d) o.scadenza = { v: d, conf: f['4b'].conf }; }
if (f['4c']) o.ente = { v: f['4c'].v.toUpperCase(), conf: f['4c'].conf };
if (f['5']) o.numero = { v: f['5'].v.toUpperCase().replace(/\s/g, ''), conf: f['5'].conf };
if (f['9']) {
const cc = f['9'].v.toUpperCase().replace(/[^A-Z0-9]/g, '').match(/AM|A1|A2|C1E|C1|D1E|D1|BE|CE|DE|B1|A|B|C|D/g);
o.categorie = { v: cc && cc.length ? cc.join('/') : f['9'].v.toUpperCase().replace(/\s/g, ''), conf: f['9'].conf };
}
return o;
}
function lettere(s) {
return String(s || '').replace(/[A-Za-zÀ-ÿ0-9]+/g, w => (w.match(/[A-Za-zÀ-ÿ]/g) || []).length >= 2 && (w.match(/\d/g) || []).length <= 2 ? w.replace(/0/g, 'O').replace(/1/g, 'I').replace(/5/g, 'S').replace(/8/g, 'B') : w);
}
function leggiLibretto(righe) {
const o = {}, testo = righe.map(r => r.t).join('\n');
const campo = cod => {
const re = new RegExp('[(\\[]\\s*' + cod + '\\s*[)\\]]\\s*([^\\n(\\[]+)', 'i'), m = re.exec(testo);
if (!m) return null;
const r = righe.find(x => x.t.indexOf(m[1].trim()) >= 0);
return { v: m[1].trim(), conf: r ? r.c : 0.8 };
};
const a = campo('A'), t = a ? leggiTarga(a.v) : null;
if (t && t.ok) o.targa = { v: t.t, conf: a.conf }; else { const tt = trovaTarga(righe); if (tt) o.targa = tt; }
const bm = /[(\[]\s*B\s*[)\]]\s*([\dOIl]{1,2}\s*[\/.\-]\s*[\dOIl]{1,2}\s*[\/.\-]\s*[\dOIl]{2,4})/i.exec(testo), b8 = /[(\[]\s*B\s*[)\]]\s*(\d{2})(\d{2})(\d{4})\b/.exec(testo);
if (bm) { const dd = trovaData(bm[1]); if (dd) o.immatricolazione = { v: dd, conf: 0.95 }; }
else if (b8) { const dd = dataIt(b8[1], b8[2], b8[3]); if (dd) o.immatricolazione = { v: dd, conf: 0.85 }; }
const d1 = campo('[DO0]\\.?\\s?1'), d3 = campo('[DO0]\\.?\\s?3');
if (d1 || d3) o.marca = { v: titolo([d1 && d1.v, d3 && d3.v].filter(Boolean).join(' ')), conf: Math.min(d1 ? d1.conf : 1, d3 ? d3.conf : 1) };
const c1 = campo('C\\.?\\s?[12]\\.?\\s?1'), c2 = campo('C\\.?\\s?[12]\\.?\\s?2'), c3 = campo('C\\.?\\s?[12]\\.?\\s?3');
if (c1) o.proprietario = { v: titolo([c1.v, c2 && c2.v].filter(Boolean).join(' ')), conf: Math.min(c1.conf, c2 ? c2.conf : 1) };
if (c3) o.residenza = { v: titolo(c3.v), conf: c3.conf };
const vin = telaio(testo, campo('E'));
if (vin) o.telaio = vin;
return o;
}
function telaio(testo, campoE) {
const pulito = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/O/g, '0').replace(/I/g, '1').replace(/Q/g, '0');
const valido = v => /^[A-HJ-NPR-Z0-9]{17}$/.test(v) && (v.match(/\d/g) || []).length >= 4 && (v.match(/[A-Z]/g) || []).length >= 2;
if (campoE) { const v = pulito(campoE.v).slice(0, 17); if (valido(v)) return { v, conf: campoE.conf }; }
const parole = String(testo || '').toUpperCase().split(/[\s()[\]:;,]+/).filter(Boolean);
for (let i = 0; i < parole.length; i++) {
if (pulito(parole[i]).length < 8) continue;
let s = '';
for (let k = i; k < Math.min(parole.length, i + 2); k++) {
if (k > i && /\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}/.test(parole[k])) break;
s += parole[k]; const p = pulito(s);
if (p.length === 17 && valido(p)) return { v: p, conf: 0.85 };
if (p.length === 18 && p[0] === 'E' && valido(p.slice(1))) return { v: p.slice(1), conf: 0.85 };
if (p.length > 18) break;
}
}
return null;
}
const COMPAGNIE = ['Allianz Direct', 'Allianz', 'Generali', 'Genertel', 'Alleanza', 'UnipolSai', 'Unipol', 'Linear', 'AXA', 'Quixa', 'Zurich Connect', 'Zurich', 'Reale Mutua', 'Italiana Assicurazioni', 'Cattolica', 'Groupama', 'Sara Assicurazioni', 'Vittoria', 'HDI', 'ITAS', 'Verti', 'Genialloyd', 'Prima', 'ConTe', 'Direct Line', 'Helvetia', 'Bene Assicurazioni', 'Nobis', 'Elba', 'Tua Assicurazioni', 'Arca', 'Amissima', 'Net Insurance', 'Aviva', 'Mapfre', 'Admiral', 'Ergo', 'Revo', 'Assimoco', 'Crédit Agricole', 'Intesa Sanpaolo', 'BCC Assicurazioni', 'Poste Assicura', 'Lloyd\'s'];
function leggiAssicurazione(righe) {
const o = {}, testo = righe.map(r => r.t).join('\n'), su = testo.toUpperCase();
for (const c of COMPAGNIE) {
const i = su.indexOf(c.toUpperCase());
if (i >= 0) { const r = righe.find(x => x.t.toUpperCase().indexOf(c.toUpperCase()) >= 0); o.compagnia = { v: c, conf: r ? r.c : 0.9 }; break; }
}
const ETP = /(?:P[O0][LIF1!][IL1!]?Z{1,2}A|CONTRATTO|CERTIFICATO)\D{0,14}?([A-Z0-9][A-Z0-9\/\-.]{4,})/i;
for (let i = 0; i < righe.length && !o.polizza; i++) {
const due = righe[i].t + ' ' + (righe[i + 1] ? righe[i + 1].t : '') + ' ' + (righe[i + 2] ? righe[i + 2].t : '');
for (const t of [righe[i].t, due]) {
const m = ETP.exec(t);
if (m && /\d{3}/.test(m[1]) && !/^\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}$/.test(m[1])) { o.polizza = { v: m[1].toUpperCase(), conf: righe[i].c }; break; }
}
}
const dopoAl = t => { const m = /(?:FINO\s+AL|\bAL)\s*[:.]?\s*([\dOIl]{1,2}\s*[\/.\-]\s*[\dOIl]{1,2}\s*[\/.\-]\s*[\dOIl]{2,4})/i.exec(t); return m ? trovaData(m[1]) : ''; };
for (const r of righe) { if (/SCAD/i.test(r.t)) { const d = trovaData(r.t.replace(/^.*?SCAD\w*/i, '')); if (d) { o.scadenza = { v: d, conf: r.c }; break; } } }
if (!o.scadenza) for (const r of righe) { const d = dopoAl(r.t); if (d) { o.scadenza = { v: d, conf: r.c }; break; } }
const t = trovaTarga(righe); if (t) o.targa = t;
return o;
}
function leggiIdentita(righe) {
const o = {}, U = righe.map(r => r.t.toUpperCase());
const ETICHETTA = /^(?:[\s\/|.,:-]|COGNOME|SURNAME|NOME|NAME|GIVEN|NAMES|LUOGO|PLACE|E|AND|DATA|DATE|DI|OF|NASCITA|BIRTH|SESSO|SEX|STATURA|HEIGHT|CITTADINANZA|NATIONALITY|EMISSIONE|ISSUING|DATE OF ISSUE|SCADENZA|EXPIRY|FIRMA|SIGNATURE|DEL|TITOLARE|HOLDER'?S?|COMUNE|MUNICIPALITY|INDIRIZZO|RESIDENZA|RESIDENCE|ADDRESS)+$/;
const dopo = re => {
for (let i = 0; i < U.length - 1; i++) {
if (!re.test(U[i])) continue;
for (let k = i + 1; k < Math.min(U.length, i + 4); k++) if (!ETICHETTA.test(U[k].replace(/\s+/g, ' ').trim())) return { v: righe[k].t, conf: righe[k].c };
return null;
}
return null;
};
const stessa = re => {
for (let i = 0; i < U.length; i++) {
const m = re.exec(U[i].replace(/\s+/g, ' ').trim()); if (!m || !m[1]) continue;
const v = m[1].trim();
if (/^[\/|]/.test(v) || ETICHETTA.test(v) || /GENITORI|PARENT/.test(U[i])) continue;
return { v, conf: righe[i].c, i };
}
return null;
};
const c2 = stessa(/^COGNOME\s*[.:]?\s+(.+)$/), n2 = stessa(/^NOME\s*[.:]?\s+(.+)$/);
if (c2 && n2) o.nominativo = { v: titolo(lettere(c2.v + ' ' + n2.v)), conf: Math.min(c2.conf, n2.conf) };
const cg = !o.nominativo && dopo(/\bCOGNOME\b|\bSURNAME\b/), nm = !o.nominativo && dopo(/(^|[^O])\bNOME\b|\bNAME\b(?!.*SUR)/);
if (cg && nm && cg.v !== nm.v) o.nominativo = { v: titolo(cg.v + ' ' + nm.v), conf: Math.min(cg.conf, nm.conf) };
const ln = dopo(/LUOGO E DATA DI NASCITA|PLACE AND DATE OF BIRTH/);
if (ln) {
const d = trovaData(ln.v, true); if (d) o.nascita = { v: d, conf: ln.conf };
const l = ln.v.replace(/\d{1,2}\s*[\/.\-]\s*\d{1,2}\s*[\/.\-]\s*\d{2,4}/, '').trim(); if (l) o.luogo = { v: l.replace(/^(.*?)\s*\(\s*([A-Z]{2})\s*\)?$/i, (x, a, b) => titolo(a) + ' (' + b.toUpperCase() + ')'), conf: ln.conf };
}
const provincia = s => s.replace(/\(\s*([a-z]{2})\s*\)?/gi, (x, b) => '(' + b.toUpperCase() + ')');
const indirizzo = parti => parti.map(s => provincia(titolo(lettere(String(s).trim().replace(/\s*,\s*(?=\d)/, ' '))))).join(', ');
const nt = stessa(/^NAT[OA]\s+IL\s*[.:]?\s*(.+)$/);
if (nt) {
if (!o.nascita) { const d = trovaData(nt.v, true); if (d) o.nascita = { v: d, conf: nt.conf }; }
const luogoDa = (s, c) => { const m = /(?:^|\s)A\s+([A-Z][A-Z' .]+?(?:\(\s*[A-Z]{2}\s*\)?)?)\s*$/.exec(s); return m ? { v: provincia(titolo(lettere(m[1].trim()))), conf: c } : null; };
if (!o.luogo) o.luogo = luogoDa(U[nt.i].replace(/^.*?\d{4}/, ' '), nt.conf) || undefined;
for (let k = nt.i + 1; !o.luogo && k < Math.min(U.length, nt.i + 4); k++) o.luogo = luogoDa(U[k].trim(), righe[k].c) || undefined;
if (!o.luogo) delete o.luogo;
}
const FINE = /CODICE|FISCAL|ESTREMI|ATTO|CERTIFICATE|GENITORI|PARENTS|<</;
for (let i = 0; i < U.length && !o.residenza; i++) {
if (!/INDIRIZZO DI RESIDENZA|\bRESIDENCE\b/.test(U[i])) continue;
const parti = [], conf = [];
const resto = U[i].replace(/^.*\bRESIDEN(?:CE|ZA)\b/, '').replace(/^[\s\/|.,:-]+/, '');
if (resto && !/RESIDEN|ADDRESS/.test(resto)) { parti.push(righe[i].t.slice(righe[i].t.length - resto.length)); conf.push(righe[i].c); }
for (let k = i + 1; k < Math.min(U.length, i + 5) && parti.length < 2; k++) {
const u = U[k].replace(/\s+/g, ' ').trim();
if (!u || ETICHETTA.test(u)) continue;
if (FINE.test(u) || /^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/.test(u.replace(/\s/g, ''))) break;
parti.push(righe[k].t); conf.push(righe[k].c);
}
if (parti.length) o.residenza = { v: indirizzo(parti), conf: Math.min(...conf) };
}
if (!o.residenza) {
const rc = stessa(/^RESIDENZA\s*[.:]?\s+(.+)$/);
if (rc) {
const TIPO = /^(VIA|VIALE|V\.LE|PIAZZA|P\.ZZA|PIAZZALE|P\.LE|CORSO|C\.SO|LARGO|VICOLO|STRADA|LOC|LOCALIT|FRAZ|CONTRADA|C\.DA|BORGO|SALITA|LUNGO)/;
let via = null;
for (let k = rc.i + 1; k < Math.min(U.length, rc.i + 3) && !via; k++) { const m = /^VIA\s*[.:]?\s+(.+)$/.exec(U[k].replace(/\s+/g, ' ').trim()); if (m) via = TIPO.test(m[1]) ? m[1] : 'VIA ' + m[1]; }
o.residenza = { v: indirizzo(via ? [via, rc.v] : [rc.v]), conf: rc.conf };
}
}
const cm = dopo(/COMUNE DI|MUNICIPALITY/);
if (cm && /^[A-Za-zÀ-ÿ' .\-]{2,}$/.test(cm.v.trim())) o.ente = { v: 'Comune di ' + titolo(lettere(cm.v.replace(/^\s*COMUNE\s+DI\s+/i, '').trim())), conf: cm.conf };
if (!o.ente) for (let i = 0; i < U.length; i++) { const m = /^([A-Z][A-Z' ]{2,}?)\s*,?\s+L[IÌ]['`]?\s*[,.]?\s*\d/.exec(U[i].trim()); if (m) { o.ente = { v: 'Comune di ' + titolo(lettere(m[1].trim())), conf: righe[i].c }; break; } }
if (/SCADENZA|EXPIRY|VALID[AO]\s+FINO/.test(U.join(' '))) {
const date = [];
righe.forEach(r => (r.t.match(/\d{1,2}\s*[\/.\-]\s*\d{1,2}\s*[\/.\-]\s*\d{4}/g) || []).forEach(x => { const d = trovaData(x), D = d && inData(d); if (D) date.push({ d, D, c: r.c }); }));
if (date.length >= 2) { const m = date.reduce((a, b) => (b.D > a.D ? b : a)); o.scadenza = { v: m.d, conf: m.c }; }
}
for (const r of righe) { const m = /\b([A-Z]{2}\d{5}[A-Z]{2})\b/.exec(r.t.toUpperCase()); if (m) { o.numero = { v: m[1], conf: r.c, tipo: 'CI' }; break; } }
if (!o.numero) for (const r of righe) { const m = /\b([A-Z]{2})\s?(\d{7})\b/.exec(r.t.toUpperCase()); if (m) { o.numero = { v: m[1] + m[2], conf: r.c, tipo: 'CI' }; break; } }
return o;
}
function proposte(tipo, righe, perVeicolo) {
const P = [], pre = tipo === 'docprop' ? 'proprietario.' : perVeicolo ? 'conducente.' : '';
const add = (p, lab, x) => { if (x && x.v) P.push({ p, lab, v: x.v, conf: x.conf == null ? 1 : x.conf }); };
const cf = trovaCF(righe);
if (tipo === 'libretto') {
const l = leggiLibretto(righe);
add('targa', 'Targa', l.targa); add('marca', 'Marca e modello', l.marca); add('telaio', 'Telaio', l.telaio); add('immatricolazione', 'Prima immatricolazione', l.immatricolazione);
add('proprietario.nominativo', 'Proprietario', l.proprietario);
add('proprietario.residenza', 'Residenza del proprietario', l.residenza);
return P;
}
if (tipo === 'assicurazione') {
const a = leggiAssicurazione(righe);
add('ass.compagnia', 'Compagnia', a.compagnia); add('ass.polizza', 'Polizza n.', a.polizza); add('ass.scadenza', 'Scadenza', a.scadenza);
if (a.targa) P.push({ p: '', lab: 'Targa sul documento', v: a.targa.v, conf: a.targa.conf, solo: true });
return P;
}
const pt = leggiPatente(righe), mz = leggiMrz(righe), id = leggiIdentita(righe);
const u = (...l) => l.find(x => x && x.v);
const nomCF = x => {
if (!x || !x.v || !cf || cfTornaColNome(cf.cf, x.v)) return x;
const prova = x.v.replace(/W/g, 'M').replace(/w/g, 'm');
return cfTornaColNome(cf.cf, prova) ? { v: prova, conf: x.conf } : x;
};
add(pre + 'nominativo', 'Cognome e nome', nomCF(u(mz.nominativo, pt && pt.nominativo, id.nominativo)));
if (cf) { add(pre + 'cf', 'Codice fiscale', { v: cf.cf, conf: 1 }); }
add(pre + 'nascita', 'Data di nascita', u(mz.nascita, pt && pt.nascita, id.nascita, cf && { v: cf.nascita, conf: 1 }));
add(pre + 'luogo', 'Luogo di nascita', u(cf && cf.luogo && { v: cf.luogo, conf: 1 }, pt && pt.luogo, id.luogo));
add(pre + 'sesso', 'Sesso', u(mz.sesso, cf && { v: cf.sesso, conf: 1 }));
add(pre + 'residenza', 'Residenza', id.residenza);
if (tipo === 'docprop') return P;
if (pt && (tipo === 'patente' || !mz.numero)) {
if (perVeicolo) {
add('patente.numero', 'Patente n.', pt.numero); add('patente.categorie', 'Categorie', pt.categorie);
add('patente.ente', 'Rilasciata da', pt.ente); add('patente.scadenza', 'Scadenza patente', pt.scadenza);
} else if (pt.numero) {
add(pre + 'docTipo', 'Documento', { v: 'PAT', conf: 1 }); add(pre + 'docNumero', 'Numero documento', pt.numero);
add(pre + 'docEnte', 'Rilasciato da', pt.ente); add(pre + 'docScadenza', 'Scadenza documento', pt.scadenza);
}
} else {
const n = u(mz.numero, id.numero);
if (n) { add(pre + 'docTipo', 'Documento', { v: n.tipo || 'CI', conf: 1 }); add(pre + 'docNumero', 'Numero documento', n); }
add(pre + 'docEnte', 'Rilasciato da', id.ente);
add(pre + 'docScadenza', 'Scadenza documento', u(mz.scadenza, id.scadenza));
}
return P;
}
const pulisci = s => String(s || '').replace(/\s+/g, ' ').trim();
function valorePortale(x, re, ok) {
ok = ok || (() => true);
const eti = c => c && c.length < 45 && !/\d/.test(c.replace(/co\s*2/ig, ''));
for (const t of x.tabelle || []) for (let i = 0; i < t.length; i++) {
const r = (t[i] || []).map(pulisci), giu = (t[i + 1] || []).map(pulisci);
const k = r.findIndex(c => re.test(c) && eti(c)); if (k < 0) continue;
const cand = [];
if (r.length > 1 && r.every(eti) && giu.length === r.length) cand.push(giu[k]);
cand.push(r[k + 1], giu[k]);
const v = cand.find(c => c && !re.test(c) && ok(c)); if (v) return v;
}
const righe = String(x.testo || '').split('\n').map(pulisci).filter(Boolean);
for (let i = 0; i < righe.length; i++) {
const m = re.exec(righe[i]); if (!m) continue;
const dopo = righe[i].slice(m.index + m[0].length).replace(/^[\s:.\-–]+/, '');
if (dopo && ok(dopo)) return dopo;
if (righe[i].length < 45 && righe[i + 1] && ok(righe[i + 1])) return righe[i + 1];
}
return '';
}
const inData = s => { const m = /(\d{2})\/(\d{2})\/(\d{4})/.exec(s || ''); return m ? new Date(+m[3], +m[2] - 1, +m[1]) : null; };
const CAPTCHA_KO = /(captcha|codice di (controllo|sicurezza)|caratteri)[^\n]{0,80}(errat|non (è |e' )?(valid|corrett))|(errat|non valid|non corrett)[^\n]{0,60}(captcha|codice|caratteri)/i;
function esitoPortale(servizio, x, targa) {
if (!x) return null;
if (CAPTCHA_KO.test(String(x.testo || '')) || CAPTCHA_KO.test(String(x.risultato || ''))) return { stato: 'captcha' };
const r = risultatoPortale(servizio, x, targa);
if (r) return r;
if (CAPTCHA_KO.test(String(x.avviso || ''))) return { stato: 'captcha' };
return null;
}
function risultatoPortale(servizio, x, targa) {
const T = String(x.testo || '') + '\n' + String(x.risultato || '') + '\n' + (CAPTCHA_KO.test(String(x.avviso || '')) ? '' : String(x.avviso || ''));
if (/chiamata\s+fallita|si\s+prega\s+di\s+riprovare/i.test(T)) return { stato: 'riprova' };
const esito = (riga, dati, prop) => ({ stato: 'esito', riga, dati: dati || {}, prop: prop || [] });
if (servizio === 'rca') {
if (/non\s+(risulta|è|e')\s+(coperto|assicurat)|nessuna\s+copertura|non\s+coperto|non\s+risulta(no)?\s+(copertur|polizz|dati|assicura)|targa\s+(non\s+(trovata|presente|valida)|inesistente)|nessun\s+(dato|risultato)/i.test(T))
return esito('✗ NON risulta coperto da assicurazione RCA', { coperto: false });
const comp = valorePortale(x, /compagnia|impresa(\s+di)?\s+assicura/i, v => v.length > 2 && !/scadenza|copertura|^data|targa|tipo veicolo/i.test(v));
const scad = trovaData(valorePortale(x, /scadenza/i, v => !!trovaData(v)));
if (!comp && !scad) return null;
const cop = valorePortale(x, /copertura/i, v => /^(s[iì]|no)\b|attiv|valid|copert|scadut/i.test(v));
let coperto = cop ? !/^no\b|non|scadut/i.test(cop) : true, riga;
const ds = inData(scad), oggi = new Date(); oggi.setHours(0, 0, 0, 0);
if (ds && ds < oggi) coperto = false;
riga = (coperto ? '✓ Coperto' : '⚠ Copertura scaduta') + (comp ? ' · ' + comp : '') + (scad ? ' · scadenza ' + scad : '');
const sin = inData(trovaData((S().meta || {}).data || ''));
if (ds && sin && sin > ds) {
const gg = Math.round((sin - ds) / 86400000);
riga += gg <= 15 ? ' · al giorno del sinistro scaduta da ' + gg + (gg === 1 ? ' giorno' : ' giorni') + ': entro i 15 di tolleranza (art. 170-bis Cod. ass.)'
: ' · ⚠ al giorno del sinistro scaduta da ' + gg + ' giorni';
}
const pol = valorePortale(x, /(?:n(?:umero|\.|°)?\s*(?:di\s+)?)?polizza|contratto/i, v => /\d{3}/.test(v) && v.length <= 30 && !trovaData(v));
const polizza = pol ? pol.split(/\s+/)[0].toUpperCase() : '';
if (polizza) riga += ' · polizza n. ' + polizza;
const prop = [];
if (comp) prop.push({ p: 'ass.compagnia', lab: 'Compagnia', v: comp, conf: 1 });
if (polizza) prop.push({ p: 'ass.polizza', lab: 'Polizza n.', v: polizza, conf: 1 });
if (scad) prop.push({ p: 'ass.scadenza', lab: 'Scadenza', v: scad, conf: 1 });
return esito(riga, { coperto, compagnia: comp, scadenza: scad, polizza }, prop);
}
if (servizio === 'revisione') {
if (/nessun[ao]?\s+(revisione|risultato|dato)|non\s+(sono\s+)?(presenti|stat[ei]\s+trovat)|non\s+risultano/i.test(T))
return esito('Nessuna revisione registrata dopo il 1° giugno 2018', { data: '' });
let migliore = null;
for (const t of x.tabelle || []) {
const h = (t[0] || []).map(c => pulisci(c).toLowerCase());
const iE = h.findIndex(c => /esito/.test(c)), iK = h.findIndex(c => /km|chilometr/.test(c));
t.slice(1).forEach(r => {
const cel = r.map(pulisci), dt = cel.map(c => trovaData(c)).find(Boolean); if (!dt) return;
const d = inData(dt); if (!d) return;
if (!migliore || d > migliore.d) migliore = { d, data: dt, esito: iE >= 0 ? cel[iE] : (cel.find(c => /regolare|ripetere|sospes/i.test(c)) || ''), km: iK >= 0 ? cel[iK] : '' };
});
}
if (!migliore) {
const dt = valorePortale(x, /data\s+(della\s+|ultima\s+)?revisione|revisione\s+del|data\s+esecuzione/i, v => !!trovaData(v));
if (!dt) return null;
migliore = { d: inData(trovaData(dt)), data: trovaData(dt), esito: valorePortale(x, /^esito/i, v => v.length < 40), km: valorePortale(x, /km|chilometr/i, v => /^\d[\d.]*$/.test(v)) };
}
let riga = 'Ultima revisione il ' + migliore.data + (migliore.esito ? ' · esito ' + migliore.esito : '') + (migliore.km ? ' · ' + migliore.km + ' km' : '');
const anni = migliore.d ? (Date.now() - migliore.d) / (365.25 * 86400000) : 0;
riga = (/ripetere|sospes|negativ/i.test(migliore.esito) || anni > 2 ? '⚠ ' : '✓ ') + riga + (anni > 2 ? ' (più di 2 anni fa: controlla se è scaduta)' : '');
const prop = [{ p: 'revisione.data', lab: 'Ultima revisione', v: migliore.data, conf: 1 }];
if (migliore.esito) prop.push({ p: 'revisione.esito', lab: 'Esito della revisione', v: titolo(migliore.esito), conf: 1 });
if (migliore.km) prop.push({ p: 'revisione.km', lab: 'Km alla revisione', v: migliore.km, conf: 1 });
return esito(riga, { data: migliore.data, esito: migliore.esito, km: migliore.km }, prop);
}
if (servizio === 'rubato') {
const R = String(x.risultato || '') || T;
if (/non\s+(risulta|è|e')\s+(presente|rubat|smarrit|tra|nell|in\s+archivio|oggetto|segnalat|censit|registrat)|non\s+risulta(?!\s+(ancora\s+)?ritrovat)|non\s+ha\s+(trovato|prodotto)|nessun[ao]?\s+(risultat|veicol|dat[oi]|riscontr|corrispondenz|informazion|segnalazion|esito)|non\s+(sono\s+)?(stat[ioe]\s+)?(trovat|rilevat|reperit)|non\s+(è\s+)?present|dati\s+non\s+(trovat|present|disponibil)|esito\s+negativo|non\s+rubat/i.test(R))
return esito('✓ Non risulta rubato né smarrito', { rubato: false });
const t = String(targa || '').toUpperCase(), inTab = (x.tabelle || []).some(tb => tb.some(r => r.some(c => t && pulisci(c).toUpperCase().replace(/\s/g, '') === t)));
if (inTab || /(risulta|segnalat[oa]|denunciat[oa])[^\n]{0,40}(rubat|furto|smarrit)|data\s+(del\s+|della\s+)?(furto|denuncia|smarrimento)|esito\s+positivo/i.test(R))
return esito('⚠ RISULTA nella banca dati dei veicoli rubati o smarriti: approfondisci subito con la Centrale', { rubato: true });
const testo = pulisci(x.risultato);
if (testo.length > 3) return esito('⚠ Risposta del sito da leggere: «' + (testo.length > 220 ? testo.slice(0, 220) + '…' : testo) + '»', { rubato: null, risposta: testo.slice(0, 600) });
return null;
}
if (servizio === 'classe') {
if (/non\s+(è\s+stat[oa]\s+)?(trovat|present|risulta)|nessun[ao]?\s+(risultat|veicol|dat[oi])|targa\s+(non\s+valida|inesistente|errata)|dati\s+non\s+disponibil/i.test(T))
return esito('Classe ambientale non trovata per questa targa', { euro: '', co2: '' });
const reEuro = /\beuro\s*([0-6])(\s*[A-Z](?:[\s-]*(?:TEMP|ISC(?:-FCM)?|FCM))?)?\b/i;
const cel = valorePortale(x, /classe\s+ambientale|categoria\s+euro|classe\s+euro|direttiva/i, v => reEuro.test(v) || /^[0-6][A-Z]?$/i.test(v));
const me = reEuro.exec(cel) || reEuro.exec(T.split('\n').filter(r => !/verifica\s+la\s+classe|categoria\s+euro\)/i.test(r)).join('\n'));
const euro = me ? 'Euro ' + me[1] + (me[2] ? me[2].replace(/\s+/g, '').toUpperCase() : '') : (/^[0-6][A-Z]?$/i.test(cel) ? 'Euro ' + cel.toUpperCase() : '');
const c2 = valorePortale(x, /emissioni(\s+di)?\s+co\s*2|co\s*2|emission[ie]/i, v => /\d/.test(v.replace(/co\s*2/ig, '')) && !/euro/i.test(v));
const mc = /(\d{1,3}(?:[.,]\d+)?)/.exec(String(c2 || '').replace(/co\s*2/ig, ''));
const co2 = mc ? mc[1].replace('.', ',') : '';
if (!euro && !co2) return null;
const prop = [];
if (euro) prop.push({ p: 'euro', lab: 'Classe ambientale', v: euro, conf: 1 });
if (co2) prop.push({ p: 'co2', lab: 'CO2 (g/km)', v: co2, conf: 1 });
return esito('✓ ' + [euro ? 'Classe ambientale ' + euro : '', co2 ? 'CO2 ' + co2 + ' g/km' : ''].filter(Boolean).join(' · '), { euro, co2 }, prop);
}
return null;
}
const senzaAccenti = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
function codiceNome(s, isNome) {
const t = senzaAccenti(s).replace(/[^A-Z]/g, ''), c = t.replace(/[AEIOU]/g, ''), v = t.replace(/[^AEIOU]/g, '');
if (isNome && c.length >= 4) return c[0] + c[2] + c[3];
return (c + v + 'XXX').slice(0, 3);
}
function cfTornaColNome(cf, nominativo) {
const p = senzaAccenti(nominativo).split(/[\s']+/).filter(Boolean); if (p.length < 2) return true;
for (let i = 1; i < p.length; i++) {
const a = p.slice(0, i).join(''), b = p.slice(i).join('');
if (codiceNome(a) + codiceNome(b, true) === cf.slice(0, 6) || codiceNome(b) + codiceNome(a, true) === cf.slice(0, 6)) return true;
}
return false;
}
function giornoSinistro() { const d = inData(trovaData((S().meta || {}).data || '')); if (d) return { d, nome: 'al giorno del sinistro' }; const o = new Date(); o.setHours(0, 0, 0, 0); return { d: o, nome: 'a oggi' }; }
const giorniFra = (a, b) => Math.round((b - a) / 86400000);
function controlliPersona(p, chi) {
const o = []; if (!p) return o;
const r = leggiCF(p.cf);
if (r && r.ok) {
if (p.nominativo && !cfTornaColNome(r.cf, p.nominativo)) o.push({ ok: false, t: chi + ': il codice fiscale non corrisponde a cognome e nome scritti' });
else if (p.nominativo) o.push({ ok: true, t: chi + ': codice fiscale coerente con cognome e nome' });
const dn = trovaData(p.nascita || '', true);
if (dn && dn !== r.nascita) o.push({ ok: false, t: chi + ': il codice fiscale dice nato/a il ' + r.nascita + ', la scheda il ' + dn });
if (p.sesso && p.sesso !== r.sesso) o.push({ ok: false, t: chi + ': il codice fiscale indica sesso ' + r.sesso + ', la scheda ' + p.sesso });
if (p.luogo && r.luogo && senzaAccenti(p.luogo).split(/[\s(]/)[0] !== senzaAccenti(r.luogo).split(/[\s(]/)[0]) o.push({ ok: false, t: chi + ': il codice fiscale indica ' + r.luogo + ', la scheda ' + p.luogo });
} else if (r) o.push({ ok: false, t: chi + ': codice fiscale non valido' });
const ds = inData(trovaData(p.docScadenza || ''));
if (ds && p.docNumero) { const G = giornoSinistro(), gg = giorniFra(ds, G.d); o.push(gg > 0 ? { ok: false, t: chi + ': documento scaduto da ' + gg + (gg === 1 ? ' giorno ' : ' giorni ') + G.nome } : { ok: true, t: chi + ': documento valido ' + G.nome }); }
return o;
}
const WMI = { ZFA: 'S', ZFC: 'S', ZAR: 'S', ZLA: 'S', ZAC: 'S', ZAM: 'S', VF3: 'S', VF7: 'S', VR3: 'S', VR7: 'S', W0L: 'S', W0V: 'S', VXK: 'S', VXE: 'S', WVW: 'V', WV1: 'V', WV2: 'V', WAU: 'V', VSS: 'V', TMB: 'V', WP0: 'V', WBA: 'B', WBS: 'B', WBY: 'B', WMW: 'B', WDB: 'M', WDD: 'M', WDC: 'M', W1K: 'M', WME: 'M', WF0: 'F', KMH: 'H', TMA: 'H', KNA: 'H', U5Y: 'H', VF1: 'R', UU1: 'R', VSK: 'R', SJN: 'R', JTD: 'T', SB1: 'T', VNK: 'T', JMZ: 'Z', YV1: 'O', ZAP: 'G', ZD4: 'G', ZGU: 'G', ZDM: 'D', JHM: 'A', JH2: 'A', JYA: 'Y', JS1: 'U', TSM: 'U', JKA: 'K' };
const MARCHE = [[/FIAT|ALFA|LANCIA|ABARTH|JEEP|MASERATI|PEUGEOT|CITRO|OPEL|\bDS\b|CHRYSLER|DODGE/, 'S'], [/VOLKSWAGEN|\bVW\b|AUDI|SEAT|CUPRA|SKODA|PORSCHE/, 'V'], [/BMW|MINI/, 'B'], [/MERCEDES|SMART/, 'M'], [/FORD/, 'F'], [/HYUNDAI|KIA/, 'H'], [/RENAULT|DACIA|NISSAN/, 'R'], [/TOYOTA|LEXUS/, 'T'], [/MAZDA/, 'Z'], [/VOLVO/, 'O'], [/PIAGGIO|VESPA|APRILIA|GUZZI|GILERA/, 'G'], [/DUCATI/, 'D'], [/HONDA/, 'A'], [/YAMAHA/, 'Y'], [/SUZUKI/, 'U'], [/KAWASAKI/, 'K']];
const fineMese = (d, anni) => new Date(d.getFullYear() + anni, d.getMonth() + 1, 0);
function controlliVeicolo(v) {
const o = [], G = giornoSinistro(), np = senzaPatente(v), it = d => d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
const tg = leggiTarga(v.targa);
if (tg && tg.ok) {
if (tg.nota === 'targa da moto' && v.tipo && v.tipo !== 'moto') o.push({ ok: false, t: 'La targa ha il formato delle moto, la scheda dice ' + nomeTipo(v.tipo).toLowerCase() });
else if (tg.nota === 'targa da ciclomotore' && v.tipo && v.tipo !== 'ciclomotore') o.push({ ok: false, t: 'La targa ha il formato dei ciclomotori, la scheda dice ' + nomeTipo(v.tipo).toLowerCase() });
else if (!tg.nota && (v.tipo === 'moto' || v.tipo === 'ciclomotore')) o.push({ ok: false, t: 'La targa ha il formato delle auto, la scheda dice ' + nomeTipo(v.tipo).toLowerCase() });
}
const tl = String(v.telaio || '').toUpperCase().replace(/\s/g, '');
if (tl) {
if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(tl)) { if (tl.length === 17 || !/^[A-Z0-9]+$/.test(tl)) o.push({ ok: false, t: 'Il telaio contiene caratteri che non si usano (I, O, Q)' }); else if (tl.length > 17) o.push({ ok: false, t: 'Il telaio ha più di 17 caratteri' }); }
else {
const gr = WMI[tl.slice(0, 3)], m = MARCHE.find(x => x[0].test(senzaAccenti(v.marca)));
if (gr && m && gr !== m[1]) o.push({ ok: false, t: 'L\'inizio del telaio (' + tl.slice(0, 3) + ') non è di solito del gruppo di ' + v.marca + ': controlla marca e telaio' });
else if (gr && m) o.push({ ok: true, t: 'Telaio coerente con la marca' });
}
}
if (!np) {
const sc = inData(trovaData((v.ass && v.ass.scadenza) || ''));
if (sc) {
const gg = giorniFra(sc, G.d);
if (gg > 15) o.push({ ok: false, t: 'Assicurazione scaduta da ' + gg + ' giorni ' + G.nome + ' (oltre i 15 di tolleranza, art. 170-bis Cod. ass.)' });
else if (gg > 0) o.push({ ok: false, t: 'Assicurazione scaduta da ' + gg + (gg === 1 ? ' giorno ' : ' giorni ') + G.nome + ': entro i 15 di tolleranza (art. 170-bis Cod. ass.)' });
else o.push({ ok: true, t: 'Assicurazione in corso ' + G.nome + ' secondo la scadenza scritta' });
}
const pa = v.patente || {}, sp = inData(trovaData(pa.scadenza || ''));
if (sp) { const gg = giorniFra(sp, G.d); o.push(gg > 0 ? { ok: false, t: 'Patente scaduta da ' + gg + (gg === 1 ? ' giorno ' : ' giorni ') + G.nome } : { ok: true, t: 'Patente valida ' + G.nome }); }
const cat = String(pa.categorie || '').toUpperCase().split(/[^A-Z0-9]+/).filter(Boolean);
if (cat.length) {
const ha = (...l) => l.some(x => cat.indexOf(x) >= 0);
if (v.tipo === 'auto' && !ha('B', 'C', 'C1', 'D', 'D1', 'BE', 'CE', 'DE')) o.push({ ok: false, t: 'Patente senza categoria B: serve per un\'autovettura' });
else if (v.tipo === 'autocarro' && !ha('B', 'C', 'C1', 'CE')) o.push({ ok: false, t: 'Patente senza categoria B o C: serve per un autocarro' });
else if (v.tipo === 'bus' && !ha('D', 'D1', 'DE')) o.push({ ok: false, t: 'Patente senza categoria D: serve per un autobus' });
else if (v.tipo === 'moto' && !ha('A', 'A1', 'A2')) o.push({ ok: false, t: 'Patente senza categoria A: con la sola B si guidano in Italia moto fino a 125 cc (art. 116 CdS), controlla la cilindrata' });
else if (v.tipo && v.tipo !== 'altro') o.push({ ok: true, t: 'Categoria di patente adatta al tipo di veicolo' });
}
if (v.tipo === 'auto' || v.tipo === 'moto' || v.tipo === 'ciclomotore' || v.tipo === 'autocarro') {
const rv = inData(trovaData((v.revisione && v.revisione.data) || '')), im = inData(trovaData(v.immatricolazione || ''));
const nota = v.tipo === 'autocarro' ? ' (oltre 3,5 t è annuale)' : '';
if (rv) {
const lim = fineMese(rv, 2), gg = giorniFra(lim, G.d);
o.push(gg > 0 ? { ok: false, t: 'Revisione scaduta il ' + it(lim) + ': ' + gg + ' giorni ' + G.nome + nota } : { ok: true, t: 'Revisione valida fino al ' + it(lim) + nota });
if (/ripetere|sospes|negativ/i.test((v.revisione && v.revisione.esito) || '')) o.push({ ok: false, t: 'L\'ultima revisione ha esito «' + v.revisione.esito + '»' });
} else if (im) {
const lim = fineMese(im, 4), gg = giorniFra(lim, G.d);
o.push(gg > 0 ? { ok: false, t: 'Immatricolato il ' + it(im) + ': la prima revisione andava fatta entro il ' + it(lim) + '. Nessuna revisione scritta in scheda' + nota } : { ok: true, t: 'Prima revisione non ancora dovuta (entro il ' + it(lim) + ')' + nota });
}
}
}
o.push(...controlliPersona(v.conducente, 'Conducente'));
if (!v.propUguale) o.push(...controlliPersona(v.proprietario, 'Proprietario'));
return o;
}
const C = {
vista: 'lista', obj: null, ctx: null,
init() {
if (el('coinvolti')) return;
const d = document.createElement('div'); d.id = 'coinvolti'; d.className = 'cv'; d.hidden = true;
d.innerHTML = '<div class="cv-bar"><button class="cv-b" data-cv="indietro">‹ <span id="cvIndT">Chiudi</span></button><b id="cvTit">Coinvolti</b></div><div class="cv-body" id="cvBody"></div>';
document.body.appendChild(d);
d.addEventListener('click', ev => this.clic(ev));
d.addEventListener('input', ev => this.scrivi(ev));
d.addEventListener('change', ev => this.scrivi(ev, true));
},
apriVeicolo(L) {
this.apri();
const v = dati().veicoli.find(x => x.lettera === String(L || '').trim());
if (v) this.veicolo(v.id);
},
apri() {
this.init(); importaDisegno(); sincronizza();
if (RS.home && RS.home.hide) RS.home.hide(true);
el('coinvolti').hidden = false;
this.lista();
},
chiudi() { el('coinvolti').hidden = true; salva(true); if (RS.procedura) RS.procedura.chip(); },
aperto() { const d = el('coinvolti'); return !!(d && !d.hidden); },
indietro() {
const fo = el('cvFoto'); if (fo) { fo.remove(); return; }
if (this.vista === 'lista') { this.chiudi(); return; }
if (this.vista === 'persona' && this.ctx && this.ctx.veicolo) { this.veicolo(this.ctx.veicolo); return; }
this.lista();
},
passi() {
if (!RS.procedura || !RS.procedura.attiva()) return '';
return '<div class="cv-proc">Procedura guidata · passo 1 di 5</div><div class="cv-passi"><i class="cur"></i><i></i><i></i><i></i><i></i></div>';
},
lista() {
this.vista = 'lista'; this.obj = null; this.ctx = null;
el('cvTit').textContent = 'Coinvolti'; el('cvIndT').textContent = 'Chiudi';
const c = dati(), disegnate = new Set(veicoliDisegnati().map(e => String(e.label).trim()));
const badge = l => l.length ? `<span class="cv-ko">mancano ${l.length}</span>` : '<span class="cv-ok">completo</span>';
const veic = c.veicoli.map(v => {
const t = leggiTarga(v.targa), np = (v.passeggeri || []).length;
const fuori = disegnate.size && !disegnate.has(v.lettera);
return `<button class="cv-row" data-cv="veicolo:${v.id}"><span class="cv-let">${esc(v.lettera)}</span><span class="cv-txt">
          <span class="cv-t">${esc([t ? t.t : '', v.marca].filter(Boolean).join(' · ') || nomeTipo(v.tipo))}</span>
          ${fuori ? '<span class="cv-d ko">⚠ non c\'è un veicolo ' + esc(v.lettera) + ' sul disegno: aprilo e cambia la lettera, o eliminalo</span>' : ''}
          <span class="cv-d">${esc((v.conducente && v.conducente.nominativo) || 'conducente da scrivere')}${np ? ' · ' + np + (np === 1 ? ' passeggero' : ' passeggeri') : ''}</span></span>${badge(mancaVeicolo(v))}</button>`;
}).join('');
const pers = (g, ic, nome) => c[g].map(p => `<button class="cv-row" data-cv="persona:${g}:${p.id}"><span class="cv-let">${ic}</span><span class="cv-txt">
          <span class="cv-t">${esc(p.nominativo || nome)}</span><span class="cv-d">${esc(nome)}${p.telefono ? ' · ' + esc(p.telefono) : ''}</span></span>${g === 'pedoni' ? badge(mancaPersona(p)) : ''}</button>`).join('');
const proc = RS.procedura && RS.procedura.attiva();
el('cvBody').innerHTML = this.passi() +
`<p class="cv-intro">Per ogni coinvolto fotografa i documenti (restano nella sua scheda, non vanno nel fascicolo fotografico) e completa la scheda. Le lettere dei veicoli sono quelle del disegno.</p>
        <div class="cv-sez">Veicoli</div>${veic || '<p class="cv-vuoto">Nessun veicolo: aggiungilo qui o disegnalo.</p>'}
        ${c.pedoni.length ? '<div class="cv-sez">Pedoni</div>' + pers('pedoni', '🚶', 'Pedone') : ''}
        ${c.testimoni.length ? '<div class="cv-sez">Testimoni</div>' + pers('testimoni', '👁', 'Testimone') : ''}
        <div class="cv-bott"><button class="cv-b" data-cv="+veicolo">+ Veicolo</button><button class="cv-b" data-cv="+pedoni">+ Pedone</button><button class="cv-b" data-cv="+testimoni">+ Testimone</button></div>
        <div class="cv-sez">Documenti</div>
        <div class="cv-bott"><button class="cv-b" data-cv="scambio">🔁 Scambio dati tra le parti (stampa o e-mail)</button></div>
        ${proc ? '<button class="cv-b forte cv-avanti" data-cv="avanti">▶ Avanti: disegno</button>' : '<button class="cv-b forte cv-avanti" data-cv="indietro">✓ Fatto</button>'}`;
el('cvBody').scrollTop = 0;
},
f(lab, p, opz) {
opz = opz || {};
const v = getP(this.obj, p) || '';
const letto = this.obj && this.letti[this.obj.id] && this.letti[this.obj.id].has(p);
if (letto && !opz.sel) opz = Object.assign({ cls: 'letto' }, opz);
if (opz.sel) return `<label class="cv-f"><span>${lab}</span><select data-p="${p}">${opz.sel.map(o => `<option value="${esc(o[0])}"${o[0] === v ? ' selected' : ''}>${esc(o[1])}</option>`).join('')}</select></label>`;
return `<label class="cv-f"><span>${lab}${opz.cls ? ' <em class="cv-letto-t">letto: controlla</em>' : ''}</span><input data-p="${p}" value="${esc(v)}"${opz.cls ? ` class="${opz.cls}"` : ''}${opz.ph ? ` placeholder="${esc(opz.ph)}"` : ''}${opz.maiusc ? ' autocapitalize="characters"' : ''}${opz.tel ? ' inputmode="tel"' : ''}${opz.mail ? ' type="email" inputmode="email" autocapitalize="off" autocomplete="off"' : ''}${opz.max ? ` maxlength="${opz.max}"` : ''}></label>` +
(opz.esito ? `<div class="cv-esito" data-esito="${p}"></div>` : '');
},
fotoDoc(tipo, nome) {
const k = this.chiaveDoc(tipo), n = this.contaDoc(k);
return `<button class="cv-b${n ? ' fatto' : ''}" data-doc="${tipo}">📷 ${esc(nome)}${n ? ' ✓' : ''}</button>`;
},
chiaveDoc(tipo) { return 'doc:' + (this.ctx && this.ctx.chiave) + ':' + tipo; },
contaDoc(k) { const F = RS.fascicolo; return F && F.documenti ? F.documenti(k).length : 0; },
galleria() {
const F = RS.fascicolo; if (!F || !F.documenti || !this.ctx) return '';
const pre = 'doc:' + this.ctx.chiave + ':';
const l = F.documenti().filter(p => String(p.guida || '').indexOf(pre) === 0);
if (!l.length) return '';
return '<div class="cv-sez">Foto dei documenti</div><p class="cv-nota">Restano in questa scheda e nella tavola: non vanno nel fascicolo fotografico.</p><div class="cv-docs">' + l.map(p => {
const tipo = String(p.guida).slice(pre.length);
return `<div class="cv-doc"><button class="cv-doc-img" data-cv="docapri:${esc(p.id)}">${/^data:image\//.test(p.src || '') ? `<img src="${esc(p.src)}" alt="">` : '…'}</button><span>${esc(NOMI_DOC[tipo] || 'Documento')}</span><button class="cv-doc-x" data-cv="docvia:${esc(p.id)}" aria-label="Elimina la foto">✕</button></div>`;
}).join('') + '</div>';
},
apriFotoDoc(id) {
const p = (RS.fascicolo.documenti() || []).find(x => x.id === id); if (!p || !/^data:image\//.test(p.src || '')) return;
const o = document.createElement('div'); o.id = 'cvFoto'; o.className = 'cv-foto';
const img = document.createElement('img'); img.src = p.src; img.alt = p.descr || '';
const t = document.createElement('div'); t.className = 'cv-foto-t'; t.textContent = (p.descr || '') + '  ·  tocca per chiudere';
o.appendChild(img); o.appendChild(t); o.addEventListener('click', () => o.remove());
document.body.appendChild(o);
},
verificheHtml(v) {
const vv = v.verifiche || {}, tg = leggiTarga(v.targa);
const quando = o => { const d = new Date(o.ora); return isNaN(d) ? '' : d.toLocaleDateString('it-IT') + ' ' + d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }); };
return '<div class="cv-sez">Verifiche sulle banche dati</div>' +
'<button class="cv-b forte cv-vertutto" data-cv="vertutto">🔎 Verifica tutto sui siti pubblici: copertura RCA, revisione, rubato, classe ambientale</button>' +
'<p class="cv-nota">Si aprono i siti ufficiali uno dopo l\'altro con la targa già scritta: scrivi solo il codice di controllo di ciascuno. Compagnia, scadenza, revisione e classe ambientale vanno da sole nella scheda.</p>' +
'<div class="cv-bott">' + Object.keys(VERIFICHE).map(k => `<button class="cv-b${vv[k] ? ' fatto' : ''}" data-cv="ver:${k}">${VERIFICHE[k].ic} ${esc(VERIFICHE[k].t)}</button>`).join('') + '</div>' +
Object.keys(VERIFICHE).concat(Object.keys(TITOLI)).filter(k => vv[k]).map(k => {
const o = vv[k], altra = o.targa && tg && tg.t !== o.targa;
return `<div class="cv-ver${/^[⚠✗]/.test(o.riga || '') || altra ? ' ko' : ''}"><small>${esc(titoloVer(k))} · ${esc(quando(o))} · targa ${esc(o.targa || '')}${o.fonte ? ' · ' + esc(o.fonte) : ''}</small>${esc(o.riga || '')}${altra ? '<small>⚠ fatta su un\'altra targa: ripetila</small>' : ''}</div>`;
}).join('');
},
lettereLibere(v) {
const altre = new Set(dati().veicoli.filter(x => x !== v && !veicoloVuoto(x)).map(x => x.lettera)), dis = new Set(veicoliDisegnati().map(e => String(e.label).trim()));
const l = LETTERE.split('').filter(L => L === v.lettera || !altre.has(L));
return l.sort((a, b) => (dis.has(b) - dis.has(a)) || a.localeCompare(b)).map(L => [L, L + (dis.has(L) ? ' · sul disegno' : '')]);
},
persona(pre, ruolo, opz) {
opz = opz || {};
return this.f('Cognome e nome' + (opz.ditta ? ' (o ragione sociale)' : ''), pre + 'nominativo') +
(opz.ditta && this.obj.propDitta ? '' : this.f('Codice fiscale', pre + 'cf', { maiusc: true, max: 16, esito: true, ph: 'RSSMRA80A01F205X' }) +
`<div class="cv-due">${this.f('Data di nascita', pre + 'nascita', { ph: 'gg/mm/aaaa' })}${this.f('Sesso', pre + 'sesso', { sel: [['', '—'], ['M', 'M'], ['F', 'F']] })}</div>` +
this.f('Luogo di nascita', pre + 'luogo')) +
this.f('Residenza (via, numero, comune)', pre + 'residenza') +
this.f('Telefono', pre + 'telefono', { tel: true }) +
this.f('E-mail (per lo scambio dati)', pre + 'email', { mail: true, esito: true, ph: 'nome@esempio.it' }) +
(opz.ditta ? '' : `<div class="cv-due">${this.f('Documento', pre + 'docTipo', { sel: [['', '—'], ['CI', 'Carta d\'identità'], ['PAT', 'Patente'], ['PASS', 'Passaporto'], ['PS', 'Permesso di soggiorno'], ['ALTRO', 'Altro']] })}${this.f('Numero', pre + 'docNumero', { maiusc: true })}</div>` +
`<div class="cv-due">${this.f('Rilasciato da', pre + 'docEnte', { ph: 'Comune di …' })}${this.f('Scadenza', pre + 'docScadenza', { ph: 'gg/mm/aaaa' })}</div>`) +
(opz.esito ? this.f('Esito', pre + 'esito', { sel: ESITI }) : '');
},
veicolo(id) {
const v = dati().veicoli.find(x => x.id === id); if (!v) return this.lista();
this.vista = 'veicolo'; this.obj = v; this.ctx = { chiave: v.lettera, veicolo: v.id };
el('cvTit').textContent = 'Veicolo ' + v.lettera; el('cvIndT').textContent = 'Elenco';
const np = senzaPatente(v);
const pass = (v.passeggeri || []).map((p, i) => `<button class="cv-row" data-cv="pass:${p.id}"><span class="cv-let">${i + 1}</span><span class="cv-txt"><span class="cv-t">${esc(p.nominativo || 'Passeggero')}</span><span class="cv-d">${esc([p.posto, p.esito].filter(Boolean).join(' · ') || 'passeggero')}</span></span></button>`).join('');
const manca = mancaVeicolo(v);
el('cvBody').innerHTML = this.passi() +
'<div class="cv-manca" id="cvManca"></div><div id="cvControlli"></div>' +
`<div class="cv-sez">Veicolo</div>
        <div class="cv-bott">${this.fotoDoc('libretto', 'Carta di circolazione')}</div>
        <div class="cv-due">${this.f('Lettera (come sul disegno)', 'lettera', { sel: this.lettereLibere(v) })}${this.f('Tipo', 'tipo', { sel: TIPI })}</div>
        ${this.f('Targa', 'targa', { maiusc: true, esito: true, ph: 'AB123CD' })}${this.f('Marca e modello', 'marca', { ph: 'Fiat Panda' })}
        <div class="cv-due">${this.f('Telaio', 'telaio', { maiusc: true, max: 17 })}${this.f('Prima immatricolazione', 'immatricolazione', { ph: 'gg/mm/aaaa' })}</div>
        ${np ? '' : `<div class="cv-due">${this.f('Classe ambientale', 'euro', { ph: 'Euro 6' })}${this.f('CO2 (g/km)', 'co2', { tel: true })}</div>`}
        <div class="cv-sez">Conducente</div>
        <div class="cv-bott">${np ? '' : this.fotoDoc('patente', 'Patente')}${this.fotoDoc('documento', 'Documento d\'identità')}</div>
        ${this.persona('conducente.', 'conducente', { esito: true })}
        ${np ? '' : `<div class="cv-due">${this.f('Patente n.', 'patente.numero', { maiusc: true })}${this.f('Categorie', 'patente.categorie', { maiusc: true, ph: 'B' })}</div>
        <div class="cv-due">${this.f('Rilasciata da', 'patente.ente', { ph: 'MIT-UCO' })}${this.f('Scadenza', 'patente.scadenza', { ph: 'gg/mm/aaaa' })}</div>`}
        <div class="cv-sez">Proprietario</div>
        <label class="cv-chk"><input type="checkbox" data-p="propUguale"${v.propUguale ? ' checked' : ''}> È il conducente</label>
        ${v.propUguale ? '' : `<div class="cv-bott">${this.fotoDoc('libretto', 'Carta di circolazione')}${this.fotoDoc('docprop', 'Documento del proprietario')}</div>` + this.persona('proprietario.', 'proprietario', { ditta: true })}
        ${np ? '' : `<div class="cv-sez">Assicurazione</div>
        <div class="cv-bott">${this.fotoDoc('assicurazione', 'Documento assicurativo')}</div>
        ${this.f('Compagnia', 'ass.compagnia')}
        <div class="cv-due">${this.f('Polizza n.', 'ass.polizza', { maiusc: true })}${this.f('Scadenza', 'ass.scadenza', { ph: 'gg/mm/aaaa' })}</div>
        ${this.f('Agenzia (se nota)', 'ass.agenzia')}
        <div class="cv-sez">Revisione</div>
        <div class="cv-due">${this.f('Ultima revisione', 'revisione.data', { ph: 'gg/mm/aaaa' })}${this.f('Esito', 'revisione.esito', { ph: 'Regolare' })}</div>
        ${this.f('Km alla revisione', 'revisione.km', { tel: true })}`}
        ${np ? '' : this.verificheHtml(v)}
        <div class="cv-sez">Passeggeri</div>${pass || '<p class="cv-vuoto">Nessun passeggero.</p>'}
        <div class="cv-bott"><button class="cv-b" data-cv="+pass">+ Passeggero</button></div>
        ${this.galleria()}
        <div class="cv-bott" style="margin-top:22px"><button class="cv-b pericolo" data-cv="elimina">Elimina il veicolo ${esc(v.lettera)} dall'elenco</button></div>
        <button class="cv-b forte cv-avanti" data-cv="indietro">✓ Fatto</button>`;
this.esiti(); el('cvBody').scrollTop = 0;
},
personaVista(gruppo, id, veicoloId) {
let p, nome, chiave;
if (veicoloId) { const v = dati().veicoli.find(x => x.id === veicoloId); p = v && (v.passeggeri || []).find(x => x.id === id); nome = 'Passeggero del veicolo ' + (v && v.lettera); chiave = (v && v.lettera) + '-pass-' + id; }
else { p = dati()[gruppo].find(x => x.id === id); nome = gruppo === 'pedoni' ? 'Pedone' : 'Testimone'; chiave = (gruppo === 'pedoni' ? 'ped-' : 'test-') + id; }
if (!p) return this.lista();
this.vista = 'persona'; this.obj = p; this.ctx = { chiave, gruppo, veicolo: veicoloId || null };
el('cvTit').textContent = nome; el('cvIndT').textContent = veicoloId ? 'Veicolo' : 'Elenco';
el('cvBody').innerHTML = this.passi() + '<div id="cvControlli"></div>' +
`<div class="cv-bott">${this.fotoDoc('documento', 'Documento d\'identità')}</div>
        ${this.persona('', '', { esito: gruppo !== 'testimoni' })}
        ${veicoloId ? this.f('Posto occupato', 'posto', { sel: [['', '—'], ['anteriore destro', 'Anteriore destro'], ['posteriore sinistro', 'Posteriore sinistro'], ['posteriore centrale', 'Posteriore centrale'], ['posteriore destro', 'Posteriore destro'], ['trasportato', 'Trasportato (moto)'], ['altro', 'Altro']] }) : ''}
        ${gruppo === 'testimoni' ? this.f('Che cosa ha visto (in breve)', 'note') : ''}
        ${this.galleria()}
        <div class="cv-bott" style="margin-top:22px"><button class="cv-b pericolo" data-cv="elimina">Elimina dall'elenco</button></div>
        <button class="cv-b forte cv-avanti" data-cv="indietro">✓ Fatto</button>`;
this.esiti(); el('cvBody').scrollTop = 0;
},
esiti() {
const mc = el('cvManca');
if (mc && this.vista === 'veicolo') {
const l = mancaVeicolo(this.obj);
mc.className = 'cv-manca' + (l.length ? '' : ' ok');
mc.textContent = l.length ? 'Manca: ' + l.join(', ') : '✓ Scheda completa';
}
const cc = el('cvControlli');
if (cc && this.obj) {
const l = this.vista === 'veicolo' ? controlliVeicolo(this.obj) : controlliPersona(this.obj, 'Persona');
const ko = l.filter(x => !x.ok), si = l.filter(x => x.ok);
cc.innerHTML = !l.length ? '' : ko.map(x => `<div class="cv-ver ko">⚠ ${esc(x.t)}</div>`).join('') +
(si.length ? `<details class="cv-letto"><summary>✓ ${si.length} ${si.length === 1 ? 'controllo a posto' : 'controlli a posto'}</summary>${si.map(x => esc(x.t)).join('<br>')}</details>` : '');
}
document.querySelectorAll('#cvBody [data-esito]').forEach(d => {
const p = d.dataset.esito, v = getP(this.obj, p);
let r = null;
if (/(^|\.)cf$/.test(p)) {
r = leggiCF(v);
if (r && r.ok) r.testo = '✓ Nato/a il ' + r.nascita + (r.luogo ? ' a ' + r.luogo : r.estero ? ' all\'estero (codice ' + r.codice + ')' : ' (comune ' + r.codice + ' non in elenco: scrivilo)') + ' · sesso ' + r.sesso;
} else if (/(^|\.)email$/.test(p)) {
const a = String(v || '').trim();
r = a ? (/^[^\s@<>()",;]+@[^\s@<>()",;]+\.[a-z]{2,}$/i.test(a) ? { ok: true, testo: '✓ per l\'invio dello scambio dati' } : { ok: false, errore: 'Indirizzo non valido' }) : null;
} else if (p === 'targa') {
r = leggiTarga(v);
if (r && r.ok) r.testo = '✓ ' + r.t + (r.nota ? ' · ' + r.nota : '');
}
d.className = 'cv-esito' + (r ? (r.ok ? ' ok' : ' ko') : '');
d.textContent = r ? (r.ok ? r.testo : '⚠ ' + r.errore) : '';
});
},
scrivi(ev, fine) {
const t = ev.target, p = t.dataset && t.dataset.p; if (!p || !this.obj) return;
let v = t.type === 'checkbox' ? t.checked : t.value;
if (t.getAttribute('autocapitalize') === 'characters' && typeof v === 'string') { const pos = t.selectionStart; v = v.toUpperCase(); if (t.value !== v) { t.value = v; try { t.setSelectionRange(pos, pos); } catch (e) {} } }
if (p === 'targa' && fine) { const r = leggiTarga(v); if (r && r.ok) { v = r.t; t.value = v; } }
if (p === 'lettera') {
const prima = this.obj.lettera;
if (!v || v === prima || dati().veicoli.some(x => x !== this.obj && x.lettera === v && !veicoloVuoto(x))) return;
const c = dati(); c.veicoli = c.veicoli.filter(x => x === this.obj || x.lettera !== v);
const F = RS.fascicolo;
if (F && F.documenti) {
F.documenti().forEach(d => {
const g = String(d.guida || '');
if (g.indexOf('doc:' + prima + ':') === 0 || g.indexOf('doc:' + prima + '-pass-') === 0) d.guida = 'doc:' + v + g.slice(4 + prima.length);
});
F.save();
}
this.obj.lettera = v;
dati().veicoli.sort((a, b) => String(a.lettera).localeCompare(String(b.lettera)));
salva(true); return this.veicolo(this.obj.id);
}
setP(this.obj, p, v);
const sl = this.letti[this.obj.id]; if (sl && sl.delete(p)) t.classList.remove('letto');
if (/(^|\.)cf$/.test(p)) {
const r = leggiCF(v), pre = p.slice(0, -2);
if (r && r.ok) [['nascita', r.nascita], ['luogo', r.luogo], ['sesso', r.sesso]].forEach(([k, x]) => {
if (!x || getP(this.obj, pre + k)) return;
setP(this.obj, pre + k, x);
const i = document.querySelector(`#cvBody [data-p="${pre + k}"]`); if (i) { i.value = x; i.classList.add('auto'); }
});
}
this.esiti();
if (p === 'propUguale' || p === 'tipo') { salva(true); return this.veicolo(this.obj.id); }
salva(fine);
},
clic(ev) {
const d = ev.target.closest('[data-doc]');
if (d) return this.scattaDoc(d.dataset.doc, d.textContent.replace(/[📷✓]/g, '').trim());
const b = ev.target.closest('[data-cv]'); if (!b) return;
const a = b.dataset.cv, c = dati();
if (a === 'indietro') return this.indietro();
if (a === 'avanti') { this.chiudi(); return RS.procedura.vai(2); }
if (a === 'scambio') return this.scambioDati();
if (a === 'vertutto') return this.verificaTutto();
if (a.startsWith('ver:')) return this.verifica(a.slice(4));
if (a.startsWith('docapri:')) return this.apriFotoDoc(a.slice(8));
if (a.startsWith('docvia:')) {
const id = a.slice(7);
return RS.ui.scelta({ titolo: 'Eliminare la foto del documento?', testo: 'La foto si toglie dalla scheda e dalla tavola. I dati scritti restano.', opzioni: [{ k: 'si', t: 'Elimina la foto', pericolo: true }] }).then(k => {
if (k !== 'si') return;
RS.fascicolo.togliDocumento(id);
if (this.vista === 'veicolo') this.veicolo(this.obj.id); else this.personaVista(this.ctx.gruppo, this.obj.id, this.ctx.veicolo);
});
}
if (a.startsWith('veicolo:')) return this.veicolo(a.slice(8));
if (a.startsWith('persona:')) { const [, g, id] = a.split(':'); return this.personaVista(g, id); }
if (a.startsWith('pass:')) return this.personaVista(null, a.slice(5), this.obj.id);
if (a === '+veicolo') {
const usate = new Set(c.veicoli.map(v => v.lettera)), l = LETTERE.split('').find(x => !usate.has(x)) || '?';
const v = nuovoVeicolo(l); c.veicoli.push(v); salva(true); return this.veicolo(v.id);
}
if (a === '+pedoni' || a === '+testimoni') { const g = a.slice(1), p = { id: uid() }; c[g].push(p); salva(true); return this.personaVista(g, p.id); }
if (a === '+pass') { const p = { id: uid() }; (this.obj.passeggeri = this.obj.passeggeri || []).push(p); salva(true); return this.personaVista(null, p.id, this.obj.id); }
if (a === 'elimina') {
const o = this.obj, ctx = this.ctx;
RS.ui.scelta({ titolo: 'Eliminare dall\'elenco?', testo: 'Si tolgono i dati scritti in questa scheda e le foto dei suoi documenti. Il disegno e il fascicolo fotografico non cambiano.',
opzioni: [{ k: 'si', t: 'Elimina', pericolo: true }] }).then(k => {
if (k !== 'si') return;
const F = RS.fascicolo;
if (F && F.documenti) {
const pre = ['doc:' + ctx.chiave + ':'].concat(this.vista === 'veicolo' ? ['doc:' + ctx.chiave + '-pass-'] : []);
F.documenti().filter(p => pre.some(x => String(p.guida || '').indexOf(x) === 0)).forEach(p => F.togliDocumento(p.id));
}
if (this.vista === 'veicolo') c.veicoli = c.veicoli.filter(v => v !== o);
else if (ctx.veicolo) { const v = c.veicoli.find(x => x.id === ctx.veicolo); if (v) v.passeggeri = v.passeggeri.filter(p => p !== o); salva(true); return this.veicolo(ctx.veicolo); }
else c[ctx.gruppo] = c[ctx.gruppo].filter(p => p !== o);
salva(true); this.lista();
});
}
},
descrDoc(tipo) {
const o = this.obj, v = this.vista === 'veicolo' ? o : null;
const chi = v ? (v.conducente && v.conducente.nominativo) : o.nominativo;
const di = v ? 'Veicolo ' + v.lettera : (this.ctx.veicolo ? 'Passeggero del veicolo ' + ((dati().veicoli.find(x => x.id === this.ctx.veicolo) || {}).lettera || '') : this.ctx.gruppo === 'pedoni' ? 'Pedone' : 'Testimone');
const cosa = { libretto: 'carta di circolazione', patente: 'patente di guida del conducente', documento: v ? 'documento d\'identità del conducente' : 'documento d\'identità', docprop: 'documento d\'identità del proprietario', assicurazione: 'documento assicurativo' }[tipo] || 'documento';
const nome = tipo === 'docprop' && v ? v.proprietario && v.proprietario.nominativo : chi;
return di + ': ' + cosa + (nome && tipo !== 'libretto' && tipo !== 'assicurazione' ? ' ' + nome : '') + '.';
},
scattaDoc(tipo) {
const guida = this.chiaveDoc(tipo), descr = this.descrDoc(tipo), vista = this.vista, obj = this.obj;
const fatto = src => {
if (!src) return;
RS.fascicolo.aggiungiDocumento(src, descr, guida);
if (RS.ui.vibra) RS.ui.vibra('50');
RS.ui.toast('Foto del documento nella scheda (non nel fascicolo)', 2500);
if (this.aperto() && this.obj === obj) { if (vista === 'veicolo') this.veicolo(obj.id); else this.personaVista(this.ctx.gruppo, obj.id, this.ctx.veicolo); }
if (window.RilsinAndroid && RilsinAndroid.leggiDocumento && (!RilsinAndroid.puoLeggere || RilsinAndroid.puoLeggere())) {
this._lettura = { tipo, obj, vista, guida, ctx: Object.assign({}, this.ctx) };
RS.ui.toast('📖 Leggo il documento…', 30000);
RilsinAndroid.leggiDocumento();
} else if (RS.ocrWeb && RS.ocrWeb.disponibile()) {
const L = this._lettura = { tipo, obj, vista, guida, ctx: Object.assign({}, this.ctx) };
RS.ui.toast('📖 Leggo il documento… (qualche secondo)', 90000);
RS.ocrWeb.leggi(src).then(d => { if (this._lettura === L) this.testoLetto(d, null); })
.catch(() => { if (this._lettura === L) this.testoLetto(null, 'Lettura del documento non riuscita: la foto è nella scheda, scrivi i dati a mano.'); });
}
};
const A = window.RilsinAndroid;
const prendi = k => {
if (A && RS.fotoGuidate && (k === 'galleria' ? A.scegliDocumento : (A.scattaDocumento || A.scattaFoto))) {
RS.fotoGuidate._dest = { arrivata: s => { RS.fotoGuidate._dest = null; fatto(s); }, annullata: m => { RS.fotoGuidate._dest = null; if (m) RS.ui.toast(m, 4000); } };
if (k === 'galleria') A.scegliDocumento(); else if (A.scattaDocumento) A.scattaDocumento(); else A.scattaFoto();
return;
}
const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*';
if (k === 'foto') i.setAttribute('capture', 'environment');
i.onchange = e => { const f = e.target.files[0]; if (f) RS.fascicolo.riduci(f, 2000, .9, fatto); };
i.click();
};
const telefono = !!A || (window.matchMedia && matchMedia('(pointer: coarse)').matches);
if (!telefono) return prendi('file');
RS.ui.scelta({ titolo: NOMI_DOC[tipo] || 'Documento', testo: 'Documento intero, dritto, da vicino e senza riflessi del flash.', opzioni: [
{ k: 'foto', t: '📷 Scatta una foto', primario: true },
{ k: 'galleria', t: '🖼 Prendi dalla galleria', d: 'Una foto o una scansione già nel telefono' }] }).then(k => { if (k) prendi(k); });
},
letti: {},
testoLetto(dati, err) {
const L = this._lettura; this._lettura = null;
if (!L) return;
if (err) { RS.ui.toast(err, 6000); return; }
RS.ui.toast('Documento letto', 1200);
const righe = ((dati && dati.righe) || []).filter(r => r && r.t);
this.proponi(L, righe);
},
proponi(L, righe) {
const obj = L.obj, P = proposte(L.tipo, righe, L.vista === 'veicolo');
const tutto = righe.length ? '<details class="cv-letto"><summary>Tutto il testo letto (' + righe.length + ' righe)</summary>' + righe.map(r => esc(r.t)).join('<br>') + '</details>' : '';
if (!P.length) {
RS.ui.scelta({ titolo: 'Documento letto', html: '<p class="scelta-testo">Non ho riconosciuto dati da inserire. La foto è nella scheda: scrivi i dati a mano, oppure rifai la foto più da vicino, dritta e senza riflessi.</p>' + tutto, opzioni: [] });
return;
}
const DOC = { CI: 'Carta d\'identità', PAT: 'Patente', PASS: 'Passaporto' };
const html = '<p class="scelta-testo">Controlla ogni dato con il documento in mano; ⚠ indica una lettura incerta.</p>' + P.map((x, i) => {
const vis = /docTipo$/.test(x.p) ? (DOC[x.v] || x.v) : x.v;
if (x.solo) {
const t = leggiTarga(obj.targa), diversa = t && t.t !== x.v;
return `<div class="cv-prop solo"><span><small>${esc(x.lab)}</small><b>${esc(vis)}</b>${diversa ? '<small class="ko">⚠ diversa dalla targa della scheda (' + esc(t.t) + ')</small>' : ''}</span></div>`;
}
const ora = getP(obj, x.p), uguale = ora && String(ora).toUpperCase() === String(x.v).toUpperCase();
return `<label class="cv-prop"><input type="checkbox" data-prop="${i}"${!ora || uguale ? ' checked' : ''}><span><small>${esc(x.lab)}${x.conf < 0.9 ? ' ⚠' : ''}</small><b>${esc(vis)}</b>${ora && !uguale ? '<small>ora: ' + esc(/docTipo$/.test(x.p) ? (DOC[ora] || ora) : ora) + '</small>' : ''}</span></label>`;
}).join('') + tutto;
RS.ui.scelta({ titolo: 'Dati letti dal documento', html, opzioni: [{ k: 'ok', t: '✓ Inserisci i dati scelti', primario: true }] }).then(k => {
if (k !== 'ok') return;
const scelti = Array.from(document.querySelectorAll('#sceltaModal [data-prop]')).filter(i => i.checked).map(i => P[+i.dataset.prop]);
if (!scelti.length) return;
scelti.forEach(x => setP(obj, x.p, x.v));
if (scelti.some(x => x.p === 'proprietario.nominativo')) {
const c = String((obj.conducente && obj.conducente.nominativo) || '').toUpperCase(), pr = String(getP(obj, 'proprietario.nominativo') || '').toUpperCase();
obj.propUguale = !!c && c === pr;
}
const s = this.letti[obj.id] = this.letti[obj.id] || new Set();
scelti.forEach(x => s.add(x.p));
salva(true);
if (this.aperto() && this.obj === obj) {
if (L.vista === 'veicolo') this.veicolo(obj.id); else this.personaVista(L.ctx.gruppo, obj.id, L.ctx.veicolo);
const F = RS.fascicolo, d = this.descrDoc(L.tipo);
if (F && F.documenti) { let n = 0; F.documenti(L.guida).forEach(p => { if (p.descr !== d) { p.descr = d; n++; } }); if (n) F.save(); }
}
RS.ui.toast(scelti.length + (scelti.length === 1 ? ' dato inserito' : ' dati inseriti') + ': i campi letti hanno il bordo giallo', 3500);
});
},
verificaTutto() {
const v = this.obj; if (!v) return;
if (window.RilsinAndroid && RilsinAndroid.verificaInApp) return this.verificaInApp(v, TUTTE);
if (!(window.RilsinAndroid && RilsinAndroid.verificaVeicolo)) return this.verifica('rca');
this._giro = { obj: v, esiti: [], coda: TUTTE.slice(1) };
this.verifica('rca', true);
},
verifica(servizio, inGiro, obj) {
const v = obj || this.obj, V = VERIFICHE[servizio]; if (!v || !V) return;
const t = leggiTarga(v.targa), targa = t ? t.t : String(v.targa || '').toUpperCase().replace(/[\s\-.]/g, '');
if (!targa) { this._giro = null; RS.ui.toast('Scrivi prima la targa', 3000); const i = document.querySelector('#cvBody [data-p="targa"]'); if (i) i.focus(); return; }
if (!inGiro && window.RilsinAndroid && RilsinAndroid.verificaInApp) return this.verificaInApp(v, [servizio]);
if (window.RilsinAndroid && RilsinAndroid.verificaVeicolo) {
if (!inGiro) this._giro = { obj: v, esiti: [], coda: [] };
this._verifica = { servizio, obj: v, targa, esito: null };
RilsinAndroid.verificaVeicolo(servizio, targa, ({ moto: 'M', ciclomotore: 'C' })[v.tipo] || 'A');
return;
}
RS.ui.scelta({ titolo: V.t + ' · ' + targa, testo: 'Si apre il sito del ' + V.ente + ' in un\'altra scheda (serve internet). La targa ' + targa + ' è copiata: incollala, scrivi il codice di controllo e cerca, poi riporta qui il risultato. Nell\'app per Android il sito si apre dentro RILSIN con la targa già scritta e il risultato si legge da solo.',
opzioni: [{ k: 'ok', t: '🌐 Apri il sito', primario: true }] }).then(k => {
if (k !== 'ok') return;
if (navigator.clipboard) navigator.clipboard.writeText(targa).catch(() => {});
window.open(V.url, '_blank', 'noopener');
});
},
letturaPortale(json, avviso) {
const V = this._verifica; if (!V) return '';
let x = json;
if (typeof x === 'string') { try { x = JSON.parse(x); } catch (e) { return ''; } }
if (!x || typeof x !== 'object') return '';
const r = this._esitoPagina(V, x, avviso);
if (!r) return '';
if (r.stato === 'captcha') return '⚠ Codice di controllo sbagliato: riscrivilo';
if (r.stato === 'riprova') return '⚠ Codice da riscrivere: il sito non ha risposto, riprova';
V.esito = r;
return r.riga;
},
verificaInApp(v, servizi) {
const t = leggiTarga(v.targa), targa = t ? t.t : String(v.targa || '').toUpperCase().replace(/[\s\-.]/g, '');
if (!targa) { RS.ui.toast('Scrivi prima la targa', 3000); const i = document.querySelector('#cvBody [data-p="targa"]'); if (i) i.focus(); return; }
if (this._inApp) this._vaChiudi(true);
const tipo = ({ moto: 'M', ciclomotore: 'C' })[v.tipo] || 'A';
const A = this._inApp = { obj: v, targa, tipo, card: {}, timer: [] };
servizi.forEach(s => { A.card[s] = { stato: 'carico', img: '', msg: '', V: { servizio: s, obj: v, targa, esito: null } }; });
let m = el('verApp');
if (!m) {
m = document.createElement('div'); m.id = 'verApp'; m.className = 'modal'; m.hidden = true;
m.innerHTML = '<div class="modal-box va-box"><div class="modal-head"><b id="vaTit"></b><button class="modal-x" data-va="chiudi" title="Chiudi">✕</button></div><div class="modal-body" id="vaBody"></div></div>';
document.body.appendChild(m);
m.addEventListener('click', ev => {
const b = ev.target.closest('[data-va]'); if (!b || !this._inApp) return;
const k = b.dataset.va, s = b.dataset.s;
if (k === 'chiudi') this._vaChiudi();
else if (k === 'invia') this._vaInvia();
else if (k === 'nuovo') this._vaNuovo(s);
else if (k === 'sito') this._vaSito(s);
});
m.addEventListener('keydown', ev => {
if (ev.key !== 'Enter' || !ev.target.classList.contains('va-in')) return;
ev.preventDefault();
const vuoti = [...m.querySelectorAll('.va-in')].filter(i => !i.disabled && !i.closest('[hidden]') && !i.value.trim());
if (vuoti.length) vuoti[0].focus(); else this._vaInvia();
});
}
el('vaTit').textContent = 'Verifiche · targa ' + targa + ' · veicolo ' + v.lettera;
el('vaBody').innerHTML = '<p class="va-nota">Scrivi i caratteri di ogni immagine e premi <b>Verifica</b>. Il codice lo leggi e lo scrivi tu: RILSIN lo passa al sito ufficiale così com\'è.</p>' +
servizi.map(s => { const V = VERIFICHE[s]; return `<div class="va-card" data-card="${s}">
          <div class="va-tit"><span>${V.ic} ${esc(V.t)}</span><small class="va-st"></small></div>
          <div class="va-cod" hidden><img class="va-img" alt="Codice di controllo del sito"><button class="va-nuovo" data-va="nuovo" data-s="${s}" title="Un'altra immagine">↻</button></div>
          <input class="va-in" data-s="${s}" hidden autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" maxlength="12" enterkeyhint="go" placeholder="Caratteri dell'immagine">
          <div class="va-msg" hidden></div><div class="va-esito" hidden></div>
          <button class="cv-link va-sito" data-va="sito" data-s="${s}">Apri la pagina del sito</button></div>`; }).join('') +
'<div class="va-azioni"><button class="cv-b va-vai" data-va="invia">🔎 Verifica</button><button class="cv-b" data-va="chiudi">Fatto</button></div>';
m.hidden = false;
servizi.forEach(s => this._vaCarta(s));
try { RilsinAndroid.verificaInApp(servizi.join(','), targa, tipo); } catch (e) {}
A.timer.push(setTimeout(() => { if (this._inApp !== A) return; Object.keys(A.card).forEach(s => { const c = A.card[s]; if (c.stato === 'carico') { c.msg = 'Il sito non risponde ancora: attendi, oppure apri la pagina del sito.'; this._vaCarta(s); } }); }, 25000));
},
statoSito(servizio, json, avviso) {
const A = this._inApp, c = A && A.card[servizio]; if (!c) return;
let x = json;
if (typeof x === 'string') { try { x = JSON.parse(x); } catch (e) { return; } }
if (!x || typeof x !== 'object' || c.stato === 'fatto' || c.stato === 'sito') return;
const r = this._esitoPagina(c.V, x, avviso), dopo = c.inviato ? Date.now() - c.inviato : 0;
const img = /^data:image\/(png|jpeg|gif);base64,[A-Za-z0-9+/=]+$/.test(x.captcha || '') ? x.captcha : '';
if (r && r.stato === 'esito') {
c.V.esito = r; c.stato = 'fatto'; c.msg = '';
if (RS.ui.vibra) RS.ui.vibra(/^[⚠✗]/.test(r.riga) ? '60,80,60,80,60' : '50');
} else if (r && r.stato === 'captcha' && (!c.inviato || dopo > 2500)) {
c.stato = 'codice'; c.inviato = 0; c.msg = '⚠ Il sito dice che il codice è sbagliato: scrivi quello della nuova immagine.';
} else if (r && r.stato === 'riprova' && c.stato === 'attesa') {
c.stato = 'codice'; c.inviato = 0; c.msg = '⚠ Il sito non ha risposto: chiedi un\'altra immagine (↻) e riscrivi il codice.';
} else if (c.stato === 'attesa' && img && c.imgInviata && img !== c.imgInviata && dopo > 8000) {
c.stato = 'codice'; c.inviato = 0; c.msg = '⚠ Il sito ha dato un\'immagine nuova: forse il codice non era giusto. Scrivi il nuovo.';
}
if (img && img !== c.img) {
c.img = img;
if (c.stato === 'carico') { c.stato = 'codice'; c.msg = ''; }
if (c.stato === 'codice' && c.nuovo) { c.nuovo = false; c.msg = ''; }
}
this._vaCarta(servizio);
this._vaFineSeTutto();
},
_vaCarta(s) {
const A = this._inApp, c = A && A.card[s], n = c && document.querySelector('#vaBody [data-card="' + s + '"]'); if (!n) return;
const ST = { carico: 'carico il sito…', codice: 'scrivi il codice', attesa: 'ricerca in corso…', fatto: 'fatto', sito: 'aperta la pagina del sito' };
n.className = 'va-card ' + c.stato;
n.querySelector('.va-st').textContent = ST[c.stato] || '';
const cod = n.querySelector('.va-cod'), im = n.querySelector('.va-img'), inp = n.querySelector('.va-in');
cod.hidden = !(c.stato === 'codice' && c.img); inp.hidden = cod.hidden;
if (c.img && im.getAttribute('src') !== c.img) im.src = c.img;
const msg = n.querySelector('.va-msg'); msg.hidden = !c.msg; msg.textContent = c.msg || '';
const es = n.querySelector('.va-esito'), r = c.V.esito;
es.hidden = !(c.stato === 'fatto' && r); es.textContent = r ? r.riga : '';
es.className = 'va-esito' + (r && /^[⚠✗]/.test(r.riga) ? ' ko' : ' ok');
n.querySelector('.va-sito').hidden = c.stato === 'fatto';
const vai = document.querySelector('#vaBody .va-vai');
if (vai) vai.disabled = !Object.values(A.card).some(k => k.stato === 'codice');
},
_vaInvia() {
const A = this._inApp; if (!A) return;
let n = 0;
Object.keys(A.card).forEach(s => {
const c = A.card[s], inp = document.querySelector('#vaBody .va-in[data-s="' + s + '"]');
if (c.stato !== 'codice' || !inp) return;
const cod = inp.value.replace(/\s+/g, '');
if (!/^[A-Za-z0-9]{1,12}$/.test(cod)) return;
try { RilsinAndroid.codiceVerifica(s, cod); } catch (e) { return; }
inp.value = ''; c.stato = 'attesa'; c.inviato = Date.now(); c.imgInviata = c.img; c.msg = ''; n++;
A.timer.push(setTimeout(() => {
if (this._inApp !== A || c.stato !== 'attesa' || Date.now() - c.inviato < 19000) return;
c.stato = 'codice'; c.inviato = 0; c.msg = 'Nessuna risposta dal sito: riscrivi il codice, chiedi un\'altra immagine (↻) o apri la pagina del sito.'; this._vaCarta(s);
}, 20000));
this._vaCarta(s);
});
if (!n) { RS.ui.toast('Scrivi i caratteri dell\'immagine', 2500); const i = [...document.querySelectorAll('#vaBody .va-in')].find(x => !x.hidden); if (i) i.focus(); }
},
_vaNuovo(s) {
const A = this._inApp, c = A && A.card[s]; if (!c) return;
c.nuovo = true; c.msg = 'Carico un\'altra immagine…'; this._vaCarta(s);
try { RilsinAndroid.nuovoCodice(s); } catch (e) {}
},
_vaSito(s) {
const A = this._inApp, c = A && A.card[s]; if (!c) return;
c.stato = 'sito'; c.msg = ''; this._vaCarta(s);
this._verifica = { servizio: s, obj: A.obj, targa: A.targa, esito: null, pannello: true };
try { RilsinAndroid.verificaVeicolo(s, A.targa, A.tipo); } catch (e) {}
},
_vaFineSeTutto() {
const A = this._inApp; if (!A || A.fine) return;
if (!Object.values(A.card).every(c => c.stato === 'fatto')) return;
A.fine = true;
A.timer.push(setTimeout(() => { if (this._inApp === A) this._vaChiudi(); }, 2500));
},
_vaChiudi(senzaRiepilogo) {
const A = this._inApp; if (!A) return;
this._inApp = null;
A.timer.forEach(t => clearTimeout(t));
try { RilsinAndroid.chiudiVerificheInApp(); } catch (e) {}
const m = el('verApp'); if (m) m.hidden = true;
const v = A.obj, G = { obj: v, esiti: [], coda: [] };
Object.values(A.card).forEach(c => { if (c.V.esito) this._registra(G, c.V); });
if (this.aperto() && this.obj === v && this.vista === 'veicolo') this.veicolo(v.id);
if (senzaRiepilogo) return;
if (!G.esiti.length) { RS.ui.toast('Nessuna verifica completata', 3000); return; }
this.riepilogoVerifiche(G);
},
_esitoPagina(V, x, avviso) {
const righe = String(x.testo || '').split('\n').map(pulisci).filter(Boolean), base = V.base = V.base || new Set();
const chiaveRiga = r => '§' + r.map(pulisci).join('|');
if (!x.inviato) {
righe.forEach(r => base.add(r)); (x.tabelle || []).forEach(t => t.forEach(r => base.add(chiaveRiga(r))));
return null;
}
const y = { testo: righe.filter(r => !base.has(r)).join('\n'), avviso: avviso || '', risultato: x.risultato || '',
tabelle: (x.tabelle || []).map(t => t.filter(r => !base.has(chiaveRiga(r)))).filter(t => t.length) };
return esitoPortale(V.servizio, y, V.targa);
},
_registra(G, V) {
const v = V.obj, r = V.esito;
(v.verifiche = v.verifiche || {})[V.servizio] = Object.assign({ ora: new Date().toISOString(), targa: V.targa }, r.dati, { riga: r.riga });
const scritti = [], diversi = [], s = this.letti[v.id] = this.letti[v.id] || new Set();
r.prop.forEach(x => {
const ora = getP(v, x.p);
if (ora == null || String(ora).trim() === '') { setP(v, x.p, x.v); s.add(x.p); scritti.push(x); }
else if (String(ora).trim().toUpperCase() !== String(x.v).trim().toUpperCase()) diversi.push(Object.assign({ ora }, x));
});
G.esiti.push({ servizio: V.servizio, targa: V.targa, riga: r.riga, scritti, diversi });
salva(true);
},
fineVerifica() {
const V = this._verifica; this._verifica = null;
if (!V) return;
if (V.pannello) {
const c = this._inApp && this._inApp.card[V.servizio];
if (c) { if (V.esito) { c.V.esito = V.esito; c.stato = 'fatto'; } else c.stato = c.img ? 'codice' : 'carico'; this._vaCarta(V.servizio); this._vaFineSeTutto(); }
return;
}
const G = this._giro || { obj: V.obj, esiti: [], coda: [] }; this._giro = G;
const v = V.obj, rifai = () => { if (this.aperto() && this.obj === v && this.vista === 'veicolo') this.veicolo(v.id); };
if (V.esito) {
const r = V.esito;
this._registra(G, V);
if (RS.ui.vibra) RS.ui.vibra(/^[⚠✗]/.test(r.riga) ? '60,80,60,80,60' : '50');
} else {
G.esiti.push({ servizio: V.servizio, targa: V.targa, riga: 'Nessun risultato letto (verifica interrotta o risultato non riconosciuto)', nessuno: true, scritti: [], diversi: [] });
G.coda = [];
}
rifai();
if (G.coda.length) { const prossima = G.coda.shift(); setTimeout(() => this.verifica(prossima, true, v), 500); return; }
this._giro = null;
this.riepilogoVerifiche(G);
},
riepilogoVerifiche(G) {
const v = G.obj, rifai = () => { if (this.aperto() && this.obj === v && this.vista === 'veicolo') this.veicolo(v.id); };
if (G.esiti.length === 1 && G.esiti[0].nessuno) { RS.ui.toast('Nessun risultato letto: se l\'hai visto sul sito, scrivilo a mano', 4500); return; }
const diversi = [].concat(...G.esiti.map(e => e.diversi));
const manca = G.esiti.some(e => e.servizio === 'rca' && !e.nessuno && !/^✗/.test(e.riga)) && !String((v.ass && v.ass.polizza) || '').trim();
const html = G.esiti.map(e => `<div class="cv-ver${/^[⚠✗]/.test(e.riga) || e.nessuno ? ' ko' : ''}"><small>${esc(titoloVer(e.servizio))} · targa ${esc(e.targa)}</small>${esc(e.riga)}` +
(e.scritti.length ? `<small>✓ scritti nella scheda: ${esc(e.scritti.map(x => x.lab.toLowerCase()).join(', '))}</small>` : '') + '</div>').join('') +
(diversi.length ? '<p class="scelta-testo">Questi campi erano già scritti con un valore diverso e non li ho toccati:</p>' + diversi.map(x =>
`<div class="cv-prop solo"><span><small>${esc(x.lab)}</small><b>${esc(x.v)}</b><small>nella scheda: ${esc(x.ora)}</small></span></div>`).join('') : '') +
(manca ? '<p class="cv-nota">Il portale dà compagnia e scadenza, non il numero di polizza: fotografa il documento assicurativo (anche il certificato digitale sul telefono della parte o la mail della compagnia) oppure scrivilo.</p>' : '');
const opzioni = [];
if (diversi.length) opzioni.push({ k: 'usa', t: 'Usa i dati dei siti anche per quei campi' });
if (manca) opzioni.push({ k: 'foto', t: '📷 Fotografa il documento assicurativo', primario: true }, { k: 'scrivi', t: '✏ Scrivi il numero di polizza' });
RS.ui.scelta({ titolo: 'Verifiche · veicolo ' + v.lettera, html, opzioni }).then(k => {
if (k === 'foto' || k === 'scrivi') {
if (!(this.aperto() && this.obj === v && this.vista === 'veicolo')) this.veicolo(v.id);
if (k === 'foto') return this.scattaDoc('assicurazione', 'Documento assicurativo');
const i = document.querySelector('#cvBody [data-p="ass.polizza"]'); if (i) { i.scrollIntoView({ block: 'center' }); i.focus(); }
return;
}
if (k !== 'usa') return;
const s = this.letti[v.id] = this.letti[v.id] || new Set();
diversi.forEach(x => { setP(v, x.p, x.v); s.add(x.p); });
salva(true); rifai();
});
},
scambioDati() {
importaDisegno();
const c = dati();
if (!c.veicoli.length && !c.pedoni.length) { RS.ui.toast('Nessun coinvolto: aggiungi prima veicoli o pedoni', 4000); return; }
const VOCI = [['nascita', 'Data e luogo di nascita', false], ['residenza', 'Residenza', true], ['telefono', 'Telefono ed e-mail', false], ['patente', 'Patente del conducente', true], ['documento', 'Documento d\'identità', false], ['passeggeri', 'Nomi dei passeggeri', true], ['testimoni', 'Testimoni', true]];
let scelte = {};
try { scelte = JSON.parse(localStorage.getItem('rilsin:scambio') || '{}'); } catch (e) {}
const fe = feriti();
const avviso = fe.ignoti ? `<div class="cv-manca">Esito (illeso, ferito…) non indicato per ${fe.ignoti === 1 ? 'una persona' : fe.ignoti + ' persone'}${fe.l.length ? '' : ': la voce «Persone ferite» resta da completare a penna'}.</div>` : '';
const html = '<p class="scelta-testo">Una copia per ogni conducente e pedone, con i dati di tutti i veicoli: targa, proprietario, conducente e assicurazione, e se ci sono feriti. Scegli che cos\'altro mettere.</p>' + avviso +
VOCI.map(v => `<label class="scelta-chk"><input type="checkbox" data-voce="${v[0]}"${(v[0] in scelte ? scelte[v[0]] : v[2]) ? ' checked' : ''}> ${esc(v[1])}</label>`).join('');
RS.ui.scelta({ titolo: 'Atto di scambio dati', html, opzioni: [
{ k: 'ok', t: '📄 Prepara il documento', d: 'Da stampare o salvare in PDF', primario: true },
{ k: 'firme', t: '✍ Firme per ricevuta sullo schermo', d: 'Ogni parte firma con il dito: la firma, con data e ora, va nel documento' },
{ k: 'mail', t: '✉ Invia per e-mail alle parti', d: 'Un messaggio per ciascuno, dalla tua app di posta' }] }).then(k => {
if (k !== 'ok' && k !== 'mail' && k !== 'firme') return;
const o = {};
document.querySelectorAll('#sceltaModal [data-voce]').forEach(i => { o[i.dataset.voce] = i.checked; });
try { localStorage.setItem('rilsin:scambio', JSON.stringify(o)); } catch (e) {}
if (k === 'ok') this.documentoScambio(o); else if (k === 'firme') this.firmeScambio(o); else this.mailScambio(o);
});
},
firmaValida(chiave, chi) {
const f = (dati().firme || {})[chiave];
return f && f.img && String(f.chi || '') === String(chi || '') ? f : null;
},
firmeScambio(o) {
const M = this.scambioModello(o, String), c = dati();
const op = String((M.m && M.m.operatore) || '').trim();
const voci = M.dest.map(d => ({ chiave: d.ruolo, chi: d.chi, ruolo: d.ruolo }))
.concat([{ chiave: 'operatore', chi: op, ruolo: 'operatore che consegna' }]);
const ora = s => new Date(s).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
RS.ui.scelta({
titolo: '✍ Firme per ricevuta',
testo: 'Tocca una parte quando le consegni la copia: firma con il dito, e la firma con data e ora entra nel documento al posto della riga «Per ricevuta». Chi non firma qui firma a penna sul foglio stampato.',
opzioni: voci.map((v, i) => {
const f = this.firmaValida(v.chiave, v.chi);
return { k: 'f' + i, t: (f ? '✓ ' : '✍ ') + (v.chi || 'nome non scritto'), d: v.ruolo + (f ? ' · firmato il ' + ora(f.quando) + ' (tocca per rifarla)' : '') };
}).concat([{ k: 'doc', t: '📄 Prepara il documento', d: 'con le firme raccolte', primario: true }])
}).then(async k => {
if (!k) return;
if (k === 'doc') return this.documentoScambio(o);
const v = voci[+k.slice(1)]; if (!v) return;
const img = await this.firmaPad(v.chiave === 'operatore' ? 'Firma dell\'operatore' : 'Firma per ricevuta',
(v.chi || '') + (v.chiave === 'operatore' ? '' : (v.chi ? ', ' : '') + v.ruolo));
if (img) { c.firme = c.firme || {}; c.firme[v.chiave] = { img, chi: v.chi || '', quando: new Date().toISOString() }; salva(true); RS.ui.toast('✓ Firma registrata'); }
this.firmeScambio(o);
});
},
firmaPad(titolo, sotto) {
return new Promise(fine => {
const v = document.createElement('div'); v.className = 'firma-velo';
v.innerHTML = `<div class="firma-box" role="dialog" aria-modal="true">
            <div class="firma-tit">${esc(titolo)}</div>${sotto ? `<div class="firma-sotto">${esc(sotto)}</div>` : ''}
            <canvas class="firma-tela" aria-label="Spazio per la firma"></canvas>
            <div class="firma-nota">Firma qui sopra con il dito</div>
            <div class="firma-tasti"><button type="button" data-f="pulisci">Cancella</button><button type="button" data-f="annulla">Annulla</button><button type="button" class="primario" data-f="ok">✓ Conferma</button></div>
          </div>`;
document.body.appendChild(v);
const cv = v.querySelector('canvas'), ctx = cv.getContext('2d'), dpr = Math.min(2, window.devicePixelRatio || 1);
let tratti = 0, giu = null, minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
const pulisci = () => {
const r = cv.getBoundingClientRect();
cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, r.width, r.height);
ctx.lineWidth = 3.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#0b1f5c';
tratti = 0; minX = minY = 1e9; maxX = maxY = -1e9;
};
pulisci();
const pt = ev => { const r = cv.getBoundingClientRect(), p = { x: ev.clientX - r.left, y: ev.clientY - r.top };
minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y); return p; };
cv.addEventListener('pointerdown', ev => {
ev.preventDefault(); try { cv.setPointerCapture(ev.pointerId); } catch (e) {}
giu = pt(ev); ctx.beginPath(); ctx.moveTo(giu.x, giu.y); ctx.lineTo(giu.x + 0.1, giu.y + 0.1); ctx.stroke(); tratti++;
});
cv.addEventListener('pointermove', ev => {
if (!giu) return; ev.preventDefault();
const p = pt(ev); ctx.beginPath(); ctx.moveTo(giu.x, giu.y); ctx.lineTo(p.x, p.y); ctx.stroke(); giu = p;
});
const su = () => { giu = null; };
cv.addEventListener('pointerup', su); cv.addEventListener('pointercancel', su);
const chiudi = r => { v.remove(); fine(r); };
v.addEventListener('click', ev => {
const b = ev.target.closest('[data-f]'); if (!b) return;
if (b.dataset.f === 'pulisci') return pulisci();
if (b.dataset.f === 'annulla') return chiudi(null);
if (!tratti || maxX - minX < 15) { RS.ui.toast('Manca la firma'); return; }
const m = 8, x = Math.max(0, minX - m), y = Math.max(0, minY - m);
const w = Math.min(cv.width / dpr - x, maxX - minX + 2 * m), h = Math.min(cv.height / dpr - y, maxY - minY + 2 * m);
const k = Math.min(1, 480 / w), out = document.createElement('canvas');
out.width = Math.max(1, Math.round(w * k)); out.height = Math.max(1, Math.round(h * k));
const o2 = out.getContext('2d'); o2.fillStyle = '#fff'; o2.fillRect(0, 0, out.width, out.height);
o2.drawImage(cv, x * dpr, y * dpr, w * dpr, h * dpr, 0, 0, out.width, out.height);
chiudi(out.toDataURL('image/png'));
});
});
},
scambioModello(o, e) {
const c = dati(), m = S().meta || {}, E = RS.exportUtil;
const leggi = t => { const x = /(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\D+(\d{1,2})[:.](\d{2}))?/.exec(t || ''); return x ? { g: p2(x[1]) + '/' + p2(x[2]) + '/' + x[3], ora: x[4] ? p2(x[4]) + ':' + x[5] : '' } : null; };
const persona = p => {
if (!p) return '—';
const r = [e(p.nominativo || '—')];
if (o.nascita && (p.nascita || p.luogo)) r.push((p.sesso === 'F' ? 'nata' : 'nato') + (p.luogo ? ' a ' + e(p.luogo) : '') + (p.nascita ? ' il ' + e(p.nascita) : ''));
if (o.residenza && p.residenza) r.push('residente in ' + e(p.residenza));
if (o.telefono && p.telefono) r.push('tel. ' + e(p.telefono));
if (o.telefono && p.email) r.push('e-mail ' + e(p.email));
if (o.documento && p.docNumero) r.push(e({ CI: 'carta d\'identità', PAT: 'patente', PASS: 'passaporto', PS: 'permesso di soggiorno' }[p.docTipo] || 'documento') + ' n. ' + e(p.docNumero) +
(p.docEnte ? (/^(CI|PAT)$/.test(p.docTipo) ? ' rilasciata da ' : ' rilasciato da ') + e(p.docEnte) : '') + (p.docScadenza ? ' (scadenza ' + e(p.docScadenza) + ')' : ''));
return r.join(', ');
};
const veicoli = c.veicoli.map(v => {
const t = leggiTarga(v.targa), pat = v.patente || {}, a = v.ass || {};
const patTxt = o.patente && pat.numero ? 'patente n. ' + e(pat.numero) + (pat.categorie ? ', cat. ' + e(pat.categorie) : '') + (pat.ente ? ', rilasciata da ' + e(pat.ente) : '') + (pat.scadenza ? ', scad. ' + e(pat.scadenza) : '') : '';
const ass = senzaPatente(v) ? '' : [a.compagnia ? e(a.compagnia) : '', a.polizza ? 'polizza n. ' + e(a.polizza) : '', a.scadenza ? 'scadenza ' + e(a.scadenza) : '', a.agenzia ? 'agenzia ' + e(a.agenzia) : ''].filter(Boolean).join(', ') || 'non rilevata';
return { titolo: 'Veicolo ' + e(v.lettera) + ' — ' + e(nomeTipo(v.tipo).toLowerCase()) + (v.marca ? ' ' + e(v.marca) : '') + (t ? ' targa ' + e(t.t) : ''),
righe: [['Proprietario', v.propUguale ? e((v.conducente && v.conducente.nominativo) || '—') + ' (è il conducente)' : persona(v.proprietario)],
['Conducente', persona(v.conducente) + (patTxt ? '; ' + patTxt : '')],
['Assicurazione RCA', ass], ['Passeggeri', o.passeggeri && (v.passeggeri || []).length ? v.passeggeri.map(p => e(p.nominativo || '—')).join('; ') : '']].filter(x => x[1]) };
});
const pedoni = c.pedoni.map((p, i) => ({ titolo: 'Pedone' + (c.pedoni.length > 1 ? ' ' + (i + 1) : ''), righe: [['Generalità', persona(p)]] }));
const testimoni = o.testimoni && c.testimoni.length ? [{ titolo: 'Testimoni', righe: c.testimoni.map((p, i) => ['Testimone ' + (i + 1), persona(p)]) }] : [];
const dest = c.veicoli.map(v => ({ chi: (v.conducente && v.conducente.nominativo) || '', ruolo: 'conducente del veicolo ' + v.lettera, email: (v.conducente && v.conducente.email) || '' }))
.concat(c.pedoni.map((p, i) => ({ chi: p.nominativo || '', ruolo: 'pedone' + (c.pedoni.length > 1 ? ' ' + (i + 1) : ''), email: p.email || '' })));
const proprietari = c.veicoli.filter(v => !v.propUguale && v.proprietario && v.proprietario.nominativo)
.map(v => ({ chi: v.proprietario.nominativo, ruolo: 'proprietario del veicolo ' + v.lettera, email: v.proprietario.email || '' }));
const fe = feriti();
const nomi = l => l.map(x => e(x.chi || '—') + ' (' + x.ruolo + ')').join('; ');
const fer = fe.l.filter(x => x.esito === 'ferito'), dec = fe.l.filter(x => x.esito === 'deceduto');
const ferTxt = fer.length ? 'sì — ' + nomi(fer) : (fe.ignoti ? '' : 'nessuna');
return { m, E, sin: leggi(m.data), via: E.viaSenzaComune(m), com: E.nomeComune(m), intest: E.righeComando(m).map(e), prot: m.numero ? e(m.numero) : '',
blocchi: veicoli.concat(pedoni, testimoni), dest, proprietari, ferTxt, decTxt: dec.length ? nomi(dec) : '' };
},
documentoScambio(o) {
const M = this.scambioModello(o, esc);
const emblema = RS.emblema || new URL('emblema.png', location.href).href;
const tab = b => `<div class="blocco"><div class="bt">${b.titolo}</div><table>${b.righe.map(x => `<tr><th>${x[0]}</th><td>${x[1]}</td></tr>`).join('')}</table></div>`;
const prot = M.prot ? '<div class="prot">N. ' + M.prot + ' di prot.</div>' : '';
const quando = M.sin ? ' avvenuto il <b>' + M.sin.g + '</b>' + (M.sin.ora ? ' alle ore <b>' + M.sin.ora + '</b>' : '') : '';
const dove = M.via ? ' in <b>' + esc(M.via) + '</b>' + (M.com ? ' del comune di <b>' + esc(M.com) + '</b>' : '') : (M.com ? ' nel comune di <b>' + esc(M.com) + '</b>' : '');
const feriti = '<p class="tx"><b>Persone ferite:</b> ' + (M.ferTxt || '☐ no &nbsp; ☐ sì ____________________________________') + '.' + (M.decTxt ? ' <b>Persone decedute:</b> ' + M.decTxt + '.' : '') + '</p>';
const opNome = String((M.m && M.m.operatore) || '').trim(), fOp = this.firmaValida('operatore', opNome);
const dataOra = s => { const t = new Date(s); return { g: t.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }), h: t.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) }; };
const firmaImg = f => f ? `<img class="firma" src="${esc(f.img)}" alt="firma">` : '<div class="riga"></div>';
const consegna = d => { const f = this.firmaValida(d.ruolo, d.chi); if (!f) return 'il ____/____/________ alle ore ____:____'; const x = dataOra(f.quando); return 'il <b>' + x.g + '</b> alle ore <b>' + x.h + '</b>'; };
const pagina = d => `<section class="pag">
        <div class="lettera"><img src="${emblema}" alt="" onerror="this.style.display='none'"><div class="intest">${M.intest.join('<br>')}</div><hr></div>${prot}
        <h1>DATI DELLE PARTI COINVOLTE NEL SINISTRO STRADALE</h1>
        <p class="tx">Sinistro stradale${quando}${dove}, rilevato da personale di questo Comando. Si rilasciano alla parte i dati dei veicoli e delle persone coinvolte, utili per la denuncia del sinistro all'impresa di assicurazione.</p>
        ${feriti}
        ${M.blocchi.map(tab).join('')}
        <p class="tx">Copia consegnata a <b>${esc(d.chi || '______________________________')}</b>, ${esc(d.ruolo)}, ${consegna(d)}.</p>
        <div class="firme"><div class="box"><div class="tit">Per ricevuta</div>${firmaImg(this.firmaValida(d.ruolo, d.chi))}</div><div class="box"><div class="tit">L'operatore</div>${firmaImg(fOp)}${fOp && opNome ? `<div class="nome">${esc(opNome)}</div>` : ''}</div></div>
      </section>`;
const win = window.open('', '_blank');
if (!win) { alert('Consenti i popup per preparare il documento.'); return; }
win.document.write(`<!DOCTYPE html><html lang="it"><head><meta charset="utf-8"><title>Dati delle parti coinvolte</title>
        <style>@page{size:A4 portrait;margin:16mm 16mm 18mm}
        body{font:12.5px/1.45 "Times New Roman",Georgia,serif;color:#111;margin:0}
        .pag{page-break-after:always;max-width:180mm;margin:0 auto 10mm}.pag:last-child{page-break-after:auto}
        .lettera{text-align:center}.lettera img{height:54px;width:auto;margin-bottom:4px}.intest{font-weight:bold;font-size:13.5px;line-height:1.45}
        .lettera hr{border:none;border-top:1.5px solid #111;margin:8px 0 0}.prot{margin-top:5px}
        h1{text-align:center;font-size:14.5px;letter-spacing:1px;margin:12px 0 8px}
        .tx{text-align:justify;margin:6px 0}
        .blocco{margin:10px 0;page-break-inside:avoid}.bt{font-weight:bold;border-bottom:1px solid #111;padding-bottom:2px;margin-bottom:3px}
        table{width:100%;border-collapse:collapse}th,td{border:1px solid #999;padding:3px 7px;text-align:left;vertical-align:top;font-size:12px}
        th{width:30%;background:#eee;font-weight:bold}
        .firme{display:flex;justify-content:space-between;gap:20mm;margin-top:14mm;page-break-inside:avoid}.firme .box{flex:1;text-align:center}
        .firme .tit{font-weight:bold}.firme .riga{border-bottom:1px dotted #111;height:12mm}
        .firme img.firma{display:block;margin:2mm auto 0;height:15mm;max-width:100%;object-fit:contain;border-bottom:1px dotted #111}.firme .nome{font-size:11px;margin-top:1mm}
        .noprint{text-align:center;margin:6px}button{padding:8px 16px;cursor:pointer}@media print{.noprint{display:none}}</style></head><body>
        <div class="noprint"><button onclick="try{opener.RilsinAndroid.stampa()}catch(e){window.print()}">🖨 Stampa / Salva PDF</button></div>
        ${(M.dest.length ? M.dest : [{ chi: '', ruolo: 'parte coinvolta' }]).map(pagina).join('')}
        </body></html>`);
win.document.close();
},
testoScambio(o, d) {
const M = this.scambioModello(o, String);
const r = ['Gentile ' + (d.chi || 'Signore/Signora') + ',', ''];
r.push('si trasmette in allegato il documento «Dati delle parti coinvolte nel sinistro stradale»' + (M.prot ? ' (prot. n. ' + M.prot + ')' : '') + ' relativo al sinistro' +
(M.sin ? ' avvenuto il ' + M.sin.g + (M.sin.ora ? ' alle ore ' + M.sin.ora : '') : '') +
(M.via ? ' in ' + M.via + (M.com ? ', comune di ' + M.com : '') : (M.com ? ' nel comune di ' + M.com : '')) +
', in cui Lei risulta ' + (d.ruolo || 'parte coinvolta') + '.');
r.push('', 'Il documento riporta i dati dei veicoli e delle persone coinvolte, utili per la denuncia del sinistro alla Sua impresa di assicurazione.');
r.push('', 'Distinti saluti.', '');
M.intest.forEach(x => r.push(x));
return r.join('\n');
},
oggettoScambio(o) {
const M = this.scambioModello(o, String);
return 'Sinistro stradale' + (M.sin ? ' del ' + M.sin.g : '') + ' - dati delle parti coinvolte' + (M.prot ? ' (prot. n. ' + M.prot + ')' : '');
},
nomePdfScambio(d) {
const M = this.scambioModello({}, String), g = M.sin ? M.sin.g.split('/').reverse().join('-') : '';
return ('Scambio-dati-sinistro' + (g ? '-' + g : '') + (d && d.chi ? '-' + d.chi : '')).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9-]+/g, '-').replace(/-+/g, '-').replace(/-$/, '').slice(0, 80) + '.pdf';
},
pdfScambio(o, d, invio) {
const M = this.scambioModello(o, String), PDF = RS.pdf;
const src = RS.emblema || new URL('emblema.png', location.href).href;
const senza = RS.loghi && RS.loghi.nessuno('emblema');
return (senza ? Promise.resolve(null) : PDF.jpeg(src, 300)).then(img => {
const D = PDF.documento(), P = D.P;
if (img) { const h = 40, w = h * img.w / img.h; D.immagine(img, (P.w - w) / 2, D.y, w, h); D.y += h + 4; }
M.intest.forEach(x => D.paragrafo([{ t: x, b: true }], { sz: 10.5, ld: 14, allinea: 'centro' }));
D.y += 5; D.linea(P.ml, D.y, P.w - P.mr, D.y, 1.1); D.y += 5;
if (M.prot) D.paragrafo([{ t: 'N. ' + M.prot + ' di prot.' }], { sz: 9.5, dopo: 2 });
D.y += 6;
D.paragrafo([{ t: 'DATI DELLE PARTI COINVOLTE NEL SINISTRO STRADALE', b: true }], { sz: 11, allinea: 'centro', dopo: 6 });
const intro = [{ t: 'Sinistro stradale' }];
if (M.sin) { intro.push({ t: ' avvenuto il ' }, { t: M.sin.g, b: true }); if (M.sin.ora) intro.push({ t: ' alle ore ' }, { t: M.sin.ora, b: true }); }
if (M.via) { intro.push({ t: ' in ' }, { t: M.via, b: true }); if (M.com) intro.push({ t: ' del comune di ' }, { t: M.com, b: true }); }
else if (M.com) intro.push({ t: ' nel comune di ' }, { t: M.com, b: true });
intro.push({ t: ', rilevato da personale di questo Comando. Si ' + (invio ? 'trasmettono' : 'rilasciano') + ' alla parte i dati dei veicoli e delle persone coinvolte, utili per la denuncia del sinistro all\'impresa di assicurazione.' });
const par = { sz: 9.5, ld: 13.2, allinea: 'giustifica', dopo: 4 };
D.paragrafo(intro, par);
const fer = [{ t: 'Persone ferite:', b: true }, { t: ' ' + (M.ferTxt || (invio ? 'non accertate al momento della trasmissione' : '[  ] no   [  ] sì  ______________________________')) + '.' }];
if (M.decTxt) fer.push({ t: ' Persone decedute:', b: true }, { t: ' ' + M.decTxt + '.' });
D.paragrafo(fer, par);
M.blocchi.forEach(bl => {
const h = 17 + D.altezzaTabella(bl.righe, 9, P.lw * 0.3);
if (h > D.resto() && h < P.h - P.mt - P.mb) D.pagina();
D.y += 4;
D.paragrafo([{ t: bl.titolo, b: true }], { sz: 9.5, ld: 12 });
D.linea(P.ml, D.y + 1, P.w - P.mr, D.y + 1, 0.8); D.y += 3;
D.tabella(bl.righe, { sz: 9 });
});
D.y += 8;
const ora = new Date(), g = ora.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }), hh = ora.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
if (invio) {
D.paragrafo([{ t: 'Copia trasmessa a mezzo posta elettronica a ' }, { t: d.chi || '—', b: true }, { t: ', ' + d.ruolo + ', all\'indirizzo ' }, { t: d.email || '—', b: true },
{ t: ', il ' + g + ' alle ore ' + hh + '. Il documento, trasmesso per via telematica, non reca la firma del destinatario per ricevuta.' }], par);
D.spazio(60); D.y += 20;
const x = P.ml + P.lw * 0.55, w = P.lw * 0.45;
D.paragrafo([{ t: 'L\'operatore', b: true }], { sz: 9.5, x, w, allinea: 'centro' });
const op = String((M.m && M.m.operatore) || '').trim();
if (op) D.paragrafo([{ t: op }], { sz: 9.5, x, w, allinea: 'centro' });
} else {
D.paragrafo([{ t: 'Copia consegnata a ' }, { t: d.chi || '______________________________', b: true }, { t: ', ' + d.ruolo + ', il ____/____/________ alle ore ____:____.' }], par);
D.spazio(70); D.y += 24;
const w = P.lw * 0.4;
[[P.ml, 'Per ricevuta'], [P.w - P.mr - w, 'L\'operatore']].forEach(([x, tt]) => { const y0 = D.y; D.paragrafo([{ t: tt, b: true }], { sz: 9.5, x, w, allinea: 'centro' }); D.tratteggio(x, y0 + 45, x + w); D.y = y0; });
D.y += 50;
}
return D.fine({ titolo: 'Dati delle parti coinvolte nel sinistro stradale' });
});
},
mailScambio(o) {
const M = this.scambioModello(o, String), tutti = M.dest.concat(M.proprietari);
const valida = a => /^[^\s@<>()",;]+@[^\s@<>()",;]+\.[a-z]{2,}$/i.test(String(a || '').trim());
const tel = !!(window.RilsinAndroid && RilsinAndroid.inviaMailPdf);
const html = '<p class="scelta-testo">Tocca una parte: si apre la tua app di posta con il messaggio già scritto e l\'atto in PDF ' +
(tel ? 'allegato' : 'salvato nella cartella Download (sul PC va allegato a mano)') + '; lo invii tu. Nel PDF la chiusura indica la trasmissione per posta elettronica, senza firma per ricevuta.</p>' +
tutti.map((d, i) => valida(d.email)
? `<button class="scelta-opt" data-mail="${i}"><b>✉ ${esc(d.chi || '—')}</b><small>${esc(d.ruolo)} · ${esc(d.email.trim())}</small></button>`
: `<div class="cv-prop solo"><span><small>${esc(d.ruolo)}</small><b>${esc(d.chi || '—')}</b><small class="ko">${d.email ? 'e-mail non valida: ' + esc(d.email) : 'manca l\'e-mail: scrivila nella sua scheda'}</small></span></div>`).join('');
RS.ui.scelta({ titolo: 'Invia lo scambio dati per e-mail', html, opzioni: [] });
const box = document.getElementById('sceltaModal');
if (box) box.querySelectorAll('[data-mail]').forEach(b => b.addEventListener('click', ev => {
ev.stopPropagation();
const d = Object.assign({}, tutti[+b.dataset.mail]); d.email = d.email.trim();
const s = b.querySelector('small'); if (s) s.textContent = d.ruolo + ' · ' + d.email + ' · preparo il PDF…';
this.pdfScambio(o, d, true).then(u => {
this.apriMail(d.email, this.oggettoScambio(o), this.testoScambio(o, d), this.nomePdfScambio(d), u);
b.classList.add('fatto'); if (s) s.textContent = d.ruolo + ' · ' + d.email + ' · e-mail aperta';
}).catch(() => { if (s) s.textContent = d.ruolo + ' · ' + d.email + ' · PDF non riuscito'; RS.ui.toast('PDF non riuscito', 4000); });
}));
},
apriMail(a, oggetto, testo, nomeFile, pdf) {
if (window.RilsinAndroid && RilsinAndroid.inviaMailPdf) { RilsinAndroid.inviaMailPdf(a, oggetto, testo, nomeFile, RS.pdf.base64(pdf)); return; }
if (pdf && RS.exportUtil && RS.exportUtil.download) RS.exportUtil.download(new Blob([pdf], { type: 'application/pdf' }), nomeFile);
const l = document.createElement('a');
l.href = 'mailto:' + encodeURIComponent(a) + '?subject=' + encodeURIComponent(oggetto) + '&body=' + encodeURIComponent(testo.replace(/\n/g, '\r\n'));
document.body.appendChild(l); l.click(); l.remove();
if (pdf) RS.ui.toast('Il PDF «' + nomeFile + '» è nella cartella Download: allegalo al messaggio', 7000);
}
};
const PASSI = [
{ t: 'Dati dei coinvolti', d: 'Veicoli, conducenti, assicurazioni, passeggeri, pedoni e testimoni, con le foto dei documenti' },
{ t: 'Disegno', d: 'Schizzo col dito: strade, veicoli A, B… e tracce' },
{ t: 'Misure', d: 'Le misure guidate, una alla volta, con l\'esito' },
{ t: 'Foto', d: 'Le foto guidate, dal generale al particolare' },
{ t: 'Atti', d: 'Controllo di che cosa manca, verbale, scambio dati, fascicolo e planimetria' }
];
const P = {
attiva() { const p = S().meta && S().meta.procedura; return !!(p && p.attiva); },
passo() { const p = S().meta && S().meta.procedura; return (p && p.passo) || 1; },
nuova() {
RS.ui.confermaSostituzione('creare una nuova tavola').then(ok => {
if (!ok) return;
RS.ui.nuovaTavola();
if (RS.home && RS.home.hide) RS.home.hide(true);
this.avvia();
});
},
avvia() { S().meta.procedura = { attiva: true, passo: 1 }; salva(true); this.chip(); this.vai(1); },
stop() { if (S().meta) delete S().meta.procedura; salva(true); this.chip(); RS.ui.toast('Procedura chiusa: si continua liberamente', 3000); },
stato(n) {
if (n === 1) { const r = riassunto(); return r.veicoli + r.pedoni ? (r.manca ? '⚠ ' + r.manca + (r.manca === 1 ? ' dato mancante' : ' dati mancanti') : '✓ completi') : 'da fare'; }
if (n === 2) { const v = veicoliDisegnati().length; return v ? '✓ ' + v + (v === 1 ? ' veicolo disegnato' : ' veicoli disegnati') : 'da fare'; }
if (n === 4) { const F = RS.fascicolo, k = F && F.model && F.model.photos ? F.model.photos.length : 0; return k ? '✓ ' + k + ' foto' : 'da fare'; }
return '';
},
pannello() {
const cur = this.passo();
const html = '<div class="cv-passi">' + PASSI.map((x, i) => `<i class="${i + 1 < cur ? 'ok' : i + 1 === cur ? 'cur' : ''}"></i>`).join('') + '</div>';
RS.ui.scelta({ titolo: 'Procedura guidata', html, opzioni: PASSI.map((x, i) => {
const st = this.stato(i + 1);
return { k: String(i + 1), t: (i + 1) + ' · ' + x.t, d: x.d + (st ? ' — ' + st : ''), primario: i + 1 === cur };
}).concat(this.attiva() ? [{ k: 'stop', t: 'Chiudi la procedura', d: 'Il lavoro resta; si prosegue senza i passi' }] : []) }).then(k => {
if (!k) return;
if (k === 'stop') return this.stop();
if (!this.attiva()) S().meta.procedura = { attiva: true, passo: +k };
this.vai(+k);
});
},
vai(n) {
const p = S().meta.procedura || (S().meta.procedura = { attiva: true });
p.passo = n; salva(true); this.chip();
if (RS.home && RS.home.h && !RS.home.h.hidden) RS.home.hide(true);
if (n === 1) return C.apri();
if (n === 2) { if (C.aperto()) C.chiudi(); RS.ui.startSchizzo(); RS.ui.toast('Passo 2: disegna strade e veicoli. Le lettere A, B… sono quelle dei dati. Poi «Fine»', 5000); return; }
if (n === 3) return RS.ui.misureGuidate();
if (n === 4) return RS.fotoGuidate.apri();
if (n === 5) return this.atti();
},
atti() {
const manca = RS.ui.vociMancanti ? RS.ui.vociMancanti() : [], r = riassunto();
const righe = [];
if (r.manca) righe.push('Dati dei coinvolti: ' + r.manca + (r.manca === 1 ? ' dato mancante' : ' dati mancanti'));
manca.forEach(v => righe.push(v.t || v.k));
const html = righe.length ? '<div class="cv-manca">Prima di lasciare il luogo controlla:<ul>' + righe.slice(0, 8).map(x => '<li>' + esc(x) + '</li>').join('') + '</ul></div>' : '<div class="cv-manca ok">✓ Non manca niente</div>';
RS.ui.scelta({ titolo: this.attiva() ? 'Passo 5 · Atti' : 'Atti', html, opzioni: [
{ k: 'verbale', t: '📄 Verbale di rilievi', d: 'Con misure, veicoli e conducenti', primario: true },
{ k: 'scambio', t: '🔁 Scambio dati tra le parti', d: 'Una copia per ogni conducente e pedone, da stampare o da inviare per e-mail' },
{ k: 'fascicolo', t: '📷 Fascicolo fotografico', d: 'Foto del luogo e dei veicoli, con le didascalie' },
{ k: 'stampa', t: '🖨 Planimetria in scala', d: 'Stampa o PDF' },
{ k: 'completo', t: '📚 Fascicolo completo', d: 'Verbale, planimetria e foto in un unico PDF' },
{ k: 'controllo', t: '✔ Controllo e chiusura', d: 'Le voci del controllo una per una' }
] }).then(k => {
if (k === 'verbale') RS.ui.action('atto');
else if (k === 'scambio') C.scambioDati();
else if (k === 'fascicolo') RS.fascicolo.open('editor');
else if (k === 'stampa') RS.ui.action('stampa');
else if (k === 'completo') RS.ui.action('completo');
else if (k === 'controllo') RS.ui.action('verifica');
});
},
finito(cosa) {
if (!this.attiva()) return;
const prossimo = { misure: 4, foto: 5 }[cosa]; if (!prossimo) return;
setTimeout(() => {
if (document.querySelector('#sceltaModal:not([hidden])')) return;
RS.ui.scelta({ titolo: 'Procedura guidata', testo: 'Prossimo passo (' + prossimo + ' di 5): ' + PASSI[prossimo - 1].t.toLowerCase() + '. Puoi anche tornare a un passo precedente.',
opzioni: [{ k: 'avanti', t: '▶ Avanti: ' + PASSI[prossimo - 1].t, primario: true }, { k: 'passi', t: 'Tutti i passi' }] }).then(k => {
if (k === 'avanti') this.vai(prossimo); else if (k === 'passi') this.pannello();
});
}, 300);
},
chip() {
const b = el('stProc'); if (!b) return;
const on = this.attiva();
b.hidden = !on;
if (on) b.textContent = '▸ Procedura · ' + this.passo() + ' di 5';
}
};
RS.coinvolti = {
apri: () => C.apri(), apriVeicolo: L => C.apriVeicolo(L), chiudi: () => C.chiudi(), aperto: () => C.aperto(), indietro: () => C.indietro(),
scambioDati: () => C.scambioDati(), documento: o => C.documentoScambio(o || {}), testoScambio: (o, d) => C.testoScambio(o || {}, d || { ruolo: 'parte' }), pdfScambio: (o, d, invio) => C.pdfScambio(o || {}, d || { ruolo: 'parte' }, invio), riassunto, sincronizza,
testoLetto: (d, e) => C.testoLetto(d, e), proposte, correggiCF, leggiMrz,
controlliVeicolo, controlliPersona, letturaPortale: (j, a) => C.letturaPortale(j, a), fineVerifica: () => C.fineVerifica(), statoSito: (s, j, a) => C.statoSito(s, j, a), verificaInApp: (v, l) => C.verificaInApp(v, l), chiudiPannelloVerifiche: () => C._vaChiudi(true), esitoPortale, VERIFICHE,
leggiCF, leggiTarga, carControllo,
datiVeicolo: L => { try { const v = dati().veicoli.find(x => String(x.lettera) === String(L)); return v ? { targa: v.targa || '', marca: v.marca || '' } : null; } catch (e) { return null; } }
};
RS.procedura = P;
document.addEventListener('DOMContentLoaded', () => {
const b = el('stProc'); if (b) b.addEventListener('click', () => P.pannello());
setInterval(() => P.chip(), 2000);
setTimeout(() => { if (S() && S().on) S().on('change', () => sincronizza()); }, 0);
});
})();

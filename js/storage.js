(function (RS) {
'use strict';
const KEY = 'scenasinistro:tavole';
const AUTO = 'scenasinistro:autosave';
const VERS = 'scenasinistro:versions';
const IMG = 'scenasinistro:img:';
const REF = 'rsimg:';
const MAX_VER = 12;
const hashCache = new Map();
function impronta(s) {
let h = hashCache.get(s);
if (h) return h;
let a = 0x811c9dc5, b = 0x01000193;
for (let i = 0; i < s.length; i++) {
const c = s.charCodeAt(i);
a = Math.imul(a ^ c, 0x01000193) >>> 0;
b = Math.imul(b ^ c, 0x0100019b) >>> 0;
}
h = a.toString(36) + b.toString(36) + s.length.toString(36);
if (hashCache.size > 60) hashCache.clear();
hashCache.set(s, h);
return h;
}
const isImg = (v) => typeof v === 'string' && v.length > 2000 && v.slice(0, 11) === 'data:image/';
const CP1252 = { 0x20AC: 0x80, 0x201A: 0x82, 0x0192: 0x83, 0x201E: 0x84, 0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87, 0x02C6: 0x88,
0x2030: 0x89, 0x0160: 0x8A, 0x2039: 0x8B, 0x0152: 0x8C, 0x017D: 0x8E, 0x2018: 0x91, 0x2019: 0x92, 0x201C: 0x93, 0x201D: 0x94,
0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97, 0x02DC: 0x98, 0x2122: 0x99, 0x0161: 0x9A, 0x203A: 0x9B, 0x0153: 0x9C, 0x017E: 0x9E, 0x0178: 0x9F };
const cc = (...n) => String.fromCharCode(...n);
const SEGNO_ROTTO = new RegExp('[' + cc(0xC2) + '-' + cc(0xF4) + '][' + cc(0x80) + '-' + cc(0xBF) +
cc(0x152, 0x153, 0x160, 0x161, 0x178, 0x17D, 0x17E, 0x192, 0x2C6, 0x2DC) + cc(0x2013) + '-' + cc(0x203A) + cc(0x20AC, 0x2122) + ']');
const utf8 = (typeof TextDecoder !== 'undefined') ? new TextDecoder('utf-8', { fatal: true }) : null;
function riparaTesto(s) {
if (!utf8 || typeof s !== 'string' || s.length > 20000 || s.slice(0, 5) === 'data:' || !SEGNO_ROTTO.test(s)) return s;
for (let giro = 0; giro < 4 && SEGNO_ROTTO.test(s); giro++) {
const b = new Uint8Array(s.length);
for (let i = 0; i < s.length; i++) {
const c = s.charCodeAt(i), v = c < 256 ? c : CP1252[c];
if (v == null) return s;
b[i] = v;
}
let t; try { t = utf8.decode(b); } catch (e) { return s; }
if (t === s) break;
s = t;
}
return s;
}
function riparaTesti(o) {
if (typeof o === 'string') return riparaTesto(o);
if (Array.isArray(o)) { for (let i = 0; i < o.length; i++) o[i] = riparaTesti(o[i]); return o; }
if (o && typeof o === 'object') { Object.keys(o).forEach(k => { o[k] = riparaTesti(o[k]); }); }
return o;
}
const DATA_IMG = /^data:image\/(png|jpe?g|gif|webp|bmp|svg\+xml);base64,[A-Za-z0-9+\/=\r\n]*$/i;
function pulisciDati(o) {
if (typeof o === 'string') {
if (/^\s*data:/i.test(o)) return DATA_IMG.test(o) ? o : '';
return /[<>"]/.test(o) ? o.replace(/</g, '‹').replace(/>/g, '›').replace(/"/g, '”') : o;
}
if (Array.isArray(o)) { for (let i = 0; i < o.length; i++) o[i] = pulisciDati(o[i]); return o; }
if (o && typeof o === 'object') Object.keys(o).forEach(k => { o[k] = pulisciDati(o[k]); });
return o;
}
function alleggerisci(doc) {
if (!doc || !Array.isArray(doc.elements)) return doc;
const out = Object.assign({}, doc);
out.elements = doc.elements.map(e => {
if (!e || !isImg(e.href)) return e;
const h = impronta(e.href);
const k = IMG + h;
if (localStorage.getItem(k) == null) scrivi(k, e.href);
return Object.assign({}, e, { href: REF + h });
});
return out;
}
function completa(doc) {
if (!doc || !Array.isArray(doc.elements)) return doc;
let tocca = false;
const els = doc.elements.map(e => {
if (!e || typeof e.href !== 'string' || e.href.indexOf(REF) !== 0) return e;
tocca = true;
const img = localStorage.getItem(IMG + e.href.slice(REF.length));
return Object.assign({}, e, { href: img || '' });
});
return tocca ? Object.assign({}, doc, { elements: els }) : doc;
}
function pulisciImmagini() {
try {
const usate = new Set();
[AUTO, VERS, KEY].forEach(k => {
const s = localStorage.getItem(k) || '';
const re = /rsimg:([0-9a-z]+)/g; let m;
while ((m = re.exec(s))) usate.add(m[1]);
});
const via = [];
for (let i = 0; i < localStorage.length; i++) {
const k = localStorage.key(i);
if (k && k.indexOf(IMG) === 0 && !usate.has(k.slice(IMG.length))) via.push(k);
}
via.forEach(k => localStorage.removeItem(k));
} catch (e) {}
}
const pieno = (e) => e && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || e.code === 22 || e.code === 1014);
function liberaSpazio() {
try {
const v = JSON.parse(localStorage.getItem(VERS) || '[]');
if (!v.length) return false;
const resto = v.slice(0, Math.floor(v.length / 2));
if (resto.length) localStorage.setItem(VERS, JSON.stringify(resto)); else localStorage.removeItem(VERS);
pulisciImmagini();
return true;
} catch (e) { return false; }
}
function scrivi(k, valore) {
for (let tentativo = 0; tentativo < 5; tentativo++) {
try { localStorage.setItem(k, valore); return; }
catch (e) {
if (!pieno(e)) throw e;
if (k === VERS || !liberaSpazio()) throw e;
}
}
localStorage.setItem(k, valore);
}
const TIPO_FILE = [{ description: 'Tavola RILSIN', accept: { 'application/json': ['.json'] } }];
const MAX_RECENTI = 8;
const nomeFile = s => String(s).replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim().slice(0, 120) || 'Tavola';
function dbRecenti() {
return new Promise((ok, ko) => {
const r = indexedDB.open('rilsin-file', 2);
r.onupgradeneeded = () => {
const d = r.result;
if (!d.objectStoreNames.contains('recenti')) d.createObjectStore('recenti');
if (!d.objectStoreNames.contains('versioni')) d.createObjectStore('versioni');
};
r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error);
});
}
async function dbLeggi(store, k) {
const d = await dbRecenti();
try { return await new Promise((ok, ko) => { const q = d.transaction(store).objectStore(store).get(k); q.onsuccess = () => ok(q.result); q.onerror = () => ko(q.error); }); }
finally { d.close(); }
}
async function dbScrivi(store, k, v) {
const d = await dbRecenti();
try { await new Promise((ok, ko) => { const t = d.transaction(store, 'readwrite'); if (v === undefined) t.objectStore(store).delete(k); else t.objectStore(store).put(v, k); t.oncomplete = ok; t.onerror = () => ko(t.error); }); }
finally { d.close(); }
}
const MAX_VERSIONI = 20, MAX_BYTE_VERSIONI = 80e6;
async function conservaVersione(id, testo, quando) {
if (!id || !testo) return;
let info = {};
try { const d = JSON.parse(testo); info = { nome: d.nome || '', da: d.salvataDa || '', n: (d.elements || []).length }; } catch (e) { return; }
try {
const prima = (await dbLeggi('versioni', id)) || [];
if (prima.length && prima[0].testo === testo) return;
let elenco = [Object.assign({ quando: quando || Date.now(), testo }, info)].concat(prima).slice(0, MAX_VERSIONI);
let tot = 0; elenco = elenco.filter(v => (tot += v.testo.length) <= MAX_BYTE_VERSIONI || v === elenco[0]);
await dbScrivi('versioni', id, elenco);
} catch (e) {}
}
function postazione() {
try {
let p = localStorage.getItem('rilsin:postazione');
if (!p) { p = 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); localStorage.setItem('rilsin:postazione', p); }
return p;
} catch (e) { return ''; }
}
const buildPiuNuova = d => !!(d && Number(d.build) > (RS.BUILD || 0));
const chiHaSalvato = d => (d && d.salvataDa && d.salvataDa !== 'Postazione' ? d.salvataDa : '') ||
(d && d.meta && d.meta.operatore) || 'un\'altra postazione';
async function fileRecenti() {
try {
const d = await dbRecenti();
const v = await new Promise((ok, ko) => { const q = d.transaction('recenti').objectStore('recenti').get('elenco'); q.onsuccess = () => ok(q.result || []); q.onerror = () => ko(q.error); });
d.close(); return v;
} catch (e) { return []; }
}
async function ricordaFile(h, id, nome) {
try {
const prima = await fileRecenti(), elenco = [{ h, id, nome, quando: Date.now() }];
for (const r of prima) {
if (elenco.length >= MAX_RECENTI) break;
let stesso; try { stesso = await r.h.isSameEntry(h); } catch (e) { stesso = r.id === id && !!r.h && r.h.name === h.name; }
if (!stesso) elenco.push(r);
}
const d = await dbRecenti();
await new Promise((ok, ko) => { const t = d.transaction('recenti', 'readwrite'); t.objectStore('recenti').put(elenco, 'elenco'); t.oncomplete = ok; t.onerror = () => ko(t.error); });
d.close();
} catch (e) {}
}
async function permesso(h) {
try {
if ((await h.queryPermission({ mode: 'readwrite' })) === 'granted') return true;
return (await h.requestPermission({ mode: 'readwrite' })) === 'granted';
} catch (e) { return false; }
}
const MAX_BOZZE = 5, GIORNI_BOZZE = 7;
const nuovaBozza = () => 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
function dbBozze() {
return new Promise((ok, ko) => {
if (!window.indexedDB) { ko(new Error('memoria del browser non disponibile')); return; }
const r = indexedDB.open('rilsin-bozze', 1);
r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains('bozze')) r.result.createObjectStore('bozze'); };
r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error);
});
}
async function bozzeOp(modo, fn) {
const d = await dbBozze();
try {
return await new Promise((ok, ko) => {
const t = d.transaction('bozze', modo), st = t.objectStore('bozze'); let esito;
esito = fn(st); t.oncomplete = () => ok(esito && 'result' in esito ? esito.result : esito); t.onerror = () => ko(t.error);
});
} finally { d.close(); }
}
async function bozzeRecenti() {
let tutte;
try { tutte = (await bozzeOp('readonly', st => st.getAll())) || []; } catch (e) { return []; }
tutte.sort((a, b) => String(b.autoAt).localeCompare(String(a.autoAt)));
const limite = Date.now() - GIORNI_BOZZE * 86400000;
const via = tutte.filter((b, i) => i >= MAX_BOZZE || new Date(b.autoAt).getTime() < limite);
if (via.length) { try { await bozzeOp('readwrite', st => via.forEach(b => st.delete(b.id))); } catch (e) {} }
return tutte.filter(b => via.indexOf(b) < 0);
}
function fotoDi(f) { return f ? (Array.isArray(f.photos) ? f.photos : []).concat(Array.isArray(f.documenti) ? f.documenti : []) : []; }
function nCoinvolti(d) { const c = d && d.meta && d.meta.coinvolti; return c ? ['veicoli', 'pedoni', 'testimoni'].reduce((s, k) => s + ((c[k] || []).length), 0) : 0; }
async function bozzaDaParte(testo) {
let d; try { d = JSON.parse(testo); } catch (e) { return; }
const nFoto = d.fascicolo && d.fascicolo.photos ? d.fascicolo.photos.length : 0;
if (!d || d.autoSalvata || (!(d.elements || []).length && !nFoto && !nCoinvolti(d))) return;
const doc = completa(riparaTesti(d));
const tutte = fotoDi(doc.fascicolo);
const ids = tutte.filter(p => !p.src).map(p => p.id);
if (ids.length && RS.fascicolo && RS.fascicolo.fotoComplete) {
try { const m = await RS.fascicolo.fotoComplete(ids); tutte.forEach(p => { if (!p.src && m.has(p.id)) p.src = m.get(p.id); }); } catch (e) {}
}
const id = d.bozzaId || nuovaBozza();
try {
await bozzeOp('readwrite', st => st.put({ id, autoAt: d.autoAt || new Date().toISOString(), nome: d.autoNome || d.nome || '',
n: (d.elements || []).length, foto: nFoto, doc }, id));
await bozzeRecenti();
} catch (e) {}
}
function agganciaBozze() {
const S = RS.scene; if (!S || S._agganciataBozze) return;
S._agganciataBozze = true;
const cambia = (nuovoId, doc) => {
if (RS.ui && RS.ui._ready) {
let prima = null; try { prima = localStorage.getItem(AUTO); } catch (e) {}
const m = prima && /"bozzaId":"([^"]+)"/.exec(prima);
const stessa = (m && m[1] === nuovoId) || (doc && doc.autoAt && prima && prima.indexOf('"autoAt":"' + doc.autoAt + '"') >= 0);
if (prima && !stessa) bozzaDaParte(prima);
}
storage._bozzaId = nuovoId;
};
const load = S.load, clear = S.clear;
S.load = function (doc) { cambia((doc && doc.bozzaId) || nuovaBozza(), doc); return load.apply(this, arguments); };
S.clear = function () { cambia(nuovaBozza()); return clear.apply(this, arguments); };
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', agganciaBozze); else setTimeout(agganciaBozze, 0);
const GIORNI_DATI = 30, PREAVVISO = 5, GIORNO = 86400000;
const PERSONE_VEICOLO = ['conducente', 'proprietario', 'propUguale', 'propDitta', 'patente', 'ass', 'passeggeri'];
const conDati = v => v != null && v !== '' && v !== false && !(Array.isArray(v) && !v.length) &&
!(typeof v === 'object' && !Array.isArray(v) && !Object.keys(v).some(k => k !== 'id' && conDati(v[k])));
function haDatiPersonali(d) {
if (!d) return false;
const c = d.meta && d.meta.coinvolti, f = d.fascicolo;
if (f && ((f.documenti || []).length || (f.photos || []).some(p => p && /^doc:/.test(p.guida || '')))) return true;
if ((d.elements || []).some(e => e && e.type === 'vehicle' && e.conducente)) return true;
if (!c) return false;
if ((c.pedoni || []).length || (c.testimoni || []).length || (c.firme && Object.keys(c.firme).length)) return true;
return (c.veicoli || []).some(v => v && PERSONE_VEICOLO.some(k => k !== 'propUguale' && conDati(v[k])));
}
function togliDatiPersonali(d, quando) {
if (!haDatiPersonali(d)) return false;
const c = d.meta && d.meta.coinvolti, f = d.fascicolo;
if (c) {
(c.veicoli || []).forEach(v => { if (v) PERSONE_VEICOLO.forEach(k => { delete v[k]; }); });
c.pedoni = []; c.testimoni = []; delete c.firme;
}
if (f) { delete f.documenti; if (Array.isArray(f.photos)) f.photos = f.photos.filter(p => !(p && /^doc:/.test(p.guida || ''))); }
(d.elements || []).forEach(e => { if (e && e.type === 'vehicle') delete e.conducente; });
d.meta = d.meta || {};
d.meta.datiPersonaliTolti = quando || new Date().toISOString();
delete d.meta.conservaFino;
return true;
}
function inizioPrivacy() {
try {
let s = localStorage.getItem('rilsin:privacyDal');
if (!s) { s = new Date().toISOString(); localStorage.setItem('rilsin:privacyDal', s); }
return new Date(s).getTime() || Date.now();
} catch (e) { return Date.now(); }
}
function scadenzaDati(d, ultimaModifica) {
const t = new Date(ultimaModifica || 0).getTime() || 0;
const fino = new Date((d && d.meta && d.meta.conservaFino) || 0).getTime() || 0;
return Math.max(t + GIORNI_DATI * GIORNO, fino, inizioPrivacy() + GIORNI_DATI * GIORNO);
}
const scaduta = (d, ultima, ora) => haDatiPersonali(d) && scadenzaDati(d, ultima) <= ora;
const modificataIl = d => (d && (d.autoAt || d.salvataIl)) || 0;
function avvisa(cosa, err) { if (RS.ui && RS.ui.avvisoSalvataggio) RS.ui.avvisoSalvataggio(cosa, err); }
function tuttoBene(cosa) { if (RS.ui && RS.ui.salvataggioRiuscito) RS.ui.salvataggioRiuscito(cosa); }
const storage = {
autosave() {
try {
const doc = RS.scene.toJSON();
const fascVuoto = !RS.fascicolo || RS.fascicolo.vuotoDiFatto(doc.fascicolo || { photos: [] });
if ((!doc.elements || !doc.elements.length) && fascVuoto && !nCoinvolti(doc)) {
const prec = localStorage.getItem(AUTO);
if (prec && (/"elements":\[\s*\{/.test(prec) || /"(?:photos|documenti)":\[\s*\{/.test(prec) || /"(?:veicoli|pedoni|testimoni)":\[\s*\{/.test(prec))) return true;
}
doc.autoAt = new Date().toISOString();
doc.autoNome = this.currentName || '';
doc.autoId = this.currentId || '';
doc.bozzaId = this._bozzaId || (this._bozzaId = nuovaBozza());
doc.autoSalvata = !!(RS.ui && RS.ui._ready && !RS.ui._dirty);
scrivi(AUTO, JSON.stringify(alleggerisci(doc)));
tuttoBene('bozza');
if (RS.home && RS.home.aggiornaMiniatura && doc.elements && doc.elements.length) RS.home.aggiornaMiniatura(doc.bozzaId);
return true;
} catch (e) {
avvisa('bozza', e);
return false;
}
},
autosaveNow() { return this.autosave(); },
async bozzeRecenti() {
const a = this.getAutosave(), attuale = a && a.bozzaId;
return (await bozzeRecenti()).filter(b => b.id !== attuale);
},
async eliminaBozza(id) {
try { await bozzeOp('readwrite', st => st.delete(id)); return true; } catch (e) { return false; }
},
async riprendiBozzaDaParte(id) {
let b; try { b = await bozzeOp('readonly', st => st.get(id)); } catch (e) { return false; }
if (!b || !b.doc) return false;
const doc = Object.assign({}, b.doc, { bozzaId: id });
RS.scene.load(doc);
this.currentName = doc.autoNome || doc.nome || '';
if (doc.autoId) this.currentId = doc.autoId; else delete this.currentId;
this.staccaFile && this.staccaFile();
try { await bozzeOp('readwrite', st => st.delete(id)); } catch (e) {}
if (RS.ui) RS.ui._dirty = true;
this.autosave();
return true;
},
async togliBozza(id) { try { await bozzeOp('readwrite', st => st.delete(id)); } catch (e) {} },
metteDaParte: bozzaDaParte,
nCoinvolti(d) { return nCoinvolti(d); },
GIORNI_DATI, haDatiPersonali, togliDatiPersonali, scadenzaDati, inizioPrivacy,
inScadenza(ora) {
ora = ora || Date.now();
const out = [], vedi = (d, chi) => {
if (!haDatiPersonali(d)) return;
const sc = scadenzaDati(d, modificataIl(d));
if (sc > ora && sc - ora <= PREAVVISO * GIORNO) out.push({ chi, id: d.id || '', bozzaId: d.bozzaId || '', nome: d.autoNome || d.nome || 'Disegno senza nome', scade: sc });
};
try { const s = localStorage.getItem(AUTO); if (s) vedi(JSON.parse(s), 'bozza'); } catch (e) {}
this.list().forEach(d => vedi(d, 'tavola'));
return out;
},
contaConDati() {
let n = 0;
try { const s = localStorage.getItem(AUTO); if (s && haDatiPersonali(JSON.parse(s))) n++; } catch (e) {}
return n + this.list().filter(haDatiPersonali).length;
},
prolungaDati(voci) {
const fino = new Date(Date.now() + GIORNI_DATI * GIORNO).toISOString();
const tocca = d => voci.some(v => (v.id && d.id === v.id) || (v.bozzaId && d.bozzaId === v.bozzaId));
try {
const s = localStorage.getItem(AUTO);
if (s) { const d = JSON.parse(s); if (tocca(d)) { d.meta = d.meta || {}; d.meta.conservaFino = fino; scrivi(AUTO, JSON.stringify(d)); } }
} catch (e) {}
try { const l = this.list(); let si = false; l.forEach(d => { if (tocca(d)) { d.meta = d.meta || {}; d.meta.conservaFino = fino; si = true; } }); if (si) this._writeList(l); } catch (e) {}
const S = RS.scene;
if (S && S.meta && voci.some(v => (v.bozzaId && v.bozzaId === this._bozzaId) || (v.id && v.id === this.currentId))) S.meta.conservaFino = fino;
},
async togliDati(opz) {
opz = opz || {};
const ora = Date.now(), quando = new Date(ora).toISOString(), S = RS.scene;
const idPersone = new Set();
if (opz.tavola && S && S.meta && S.meta.coinvolti) {
const c = S.meta.coinvolti;
(c.veicoli || []).forEach(v => { if (v) { idPersone.add(v.id); if (v.conducente && v.conducente.id) idPersone.add(v.conducente.id); } });
(c.pedoni || []).concat(c.testimoni || []).forEach(p => p && p.id && idPersone.add(p.id));
}
const rif = { id: this.currentId || '', bozzaId: this._bozzaId || '' };
const stessa = d => !!d && ((rif.id && (d.id === rif.id || d.autoId === rif.id)) || (rif.bozzaId && d.bozzaId === rif.bozzaId) ||
(idPersone.size && ((d.meta && d.meta.coinvolti && d.meta.coinvolti.veicoli) || []).concat((d.meta && d.meta.coinvolti && d.meta.coinvolti.pedoni) || []).some(x => x && idPersone.has(x.id))));
const inizio = inizioPrivacy();
const scegli = (d, ultima) => opz.tutto ? haDatiPersonali(d) : opz.tavola ? stessa(d) && haDatiPersonali(d) : scaduta(d, ultima, ora);
let n = 0;
if (S && S.meta && (opz.tutto || opz.tavola || (RS.ui && RS.ui._ready && scegli(S.toJSON(), (this.getAutosave() || {}).autoAt || quando)))) {
const vivo = { meta: S.meta, fascicolo: S.fascicolo, elements: S.elements };
if (togliDatiPersonali(vivo, quando)) {
n++;
if (RS.fascicolo && RS.fascicolo.model === S.fascicolo && RS.fascicolo.renderList && RS.fascicolo.scr && !RS.fascicolo.scr.hidden) RS.fascicolo.renderList();
if (S.emit) S.emit('change');
this.autosave();
}
}
try {
const s = localStorage.getItem(AUTO);
if (s) { const d = JSON.parse(s); if (scegli(d, d.autoAt) && togliDatiPersonali(d, quando)) { scrivi(AUTO, JSON.stringify(d)); n++; } }
} catch (e) {}
try {
const v = this.versions(); let si = false;
v.forEach(x => { if (x && x.doc && scegli(x.doc, x.ts) && togliDatiPersonali(x.doc, quando)) { si = true; n++; } });
if (si) localStorage.setItem(VERS, JSON.stringify(v));
} catch (e) {}
try {
const l = this.list(); let si = false;
l.forEach(d => { if (scegli(d, d.salvataIl || d.autoAt || inizio) && togliDatiPersonali(d, quando)) { si = true; n++; } });
if (si) this._writeList(l);
} catch (e) {}
if (opz.tutto) {
try {
const s = localStorage.getItem('scenasinistro:fascicolo');
if (s) { const f = JSON.parse(s); if (togliDatiPersonali({ fascicolo: f }, quando)) { localStorage.setItem('scenasinistro:fascicolo', JSON.stringify(f)); n++; } }
} catch (e) {}
}
pulisciImmagini();
try {
const tutte = (await bozzeOp('readonly', st => st.getAll())) || [];
const via = tutte.filter(b => b && b.doc && scegli(b.doc, b.autoAt) && togliDatiPersonali(b.doc, quando));
if (via.length) { await bozzeOp('readwrite', st => via.forEach(b => st.put(b, b.id))); n += via.length; }
} catch (e) {}
try {
const db = await dbRecenti();
let chiavi = [];
try { chiavi = await new Promise((ok, ko) => { const q = db.transaction('versioni').objectStore('versioni').getAllKeys(); q.onsuccess = () => ok(q.result || []); q.onerror = () => ko(q.error); }); }
finally { db.close(); }
for (const k of chiavi) {
const elenco = (await dbLeggi('versioni', k)) || []; let si = false;
elenco.forEach(v => {
let d; try { d = JSON.parse(v.testo); } catch (e) { return; }
if (scegli(d, v.quando) && togliDatiPersonali(d, quando)) { v.testo = JSON.stringify(d); si = true; n++; }
});
if (si) await dbScrivi('versioni', k, elenco);
}
} catch (e) {}
if (RS.fascicolo && RS.fascicolo.pulisciArchivioFoto) { try { await RS.fascicolo.pulisciArchivioFoto(); } catch (e) {} }
if (window.RilsinAndroid && RilsinAndroid.pulisciDocumentiGalleria && !opz.tavola) {
const prima = opz.tutto ? ora + 60000 : (ora >= inizio + GIORNI_DATI * GIORNO ? ora - GIORNI_DATI * GIORNO : 0);
if (prima > 0) { try { RilsinAndroid.pulisciDocumentiGalleria(String(Math.floor(prima))); } catch (e) {} }
}
try { localStorage.setItem('rilsin:privacyControllo', quando); } catch (e) {}
return n;
},
getAutosave() { try { const s = localStorage.getItem(AUTO); return s ? completa(riparaTesti(JSON.parse(s))) : null; } catch (e) { return null; } },
clearAutosave() { try { localStorage.removeItem(AUTO); localStorage.removeItem('rilsin:bozzaMini'); pulisciImmagini(); } catch (e) {} },
versions() { try { return JSON.parse(localStorage.getItem(VERS) || '[]'); } catch (e) { return []; } },
pushVersion(force) {
const now = Date.now();
if (!force && this._lastVer && now - this._lastVer < 90000) return;
this._lastVer = now;
let arr;
try { arr = this.versions(); arr.unshift({ ts: now, doc: alleggerisci(RS.scene.toJSON()) }); }
catch (e) { return; }
arr = arr.slice(0, MAX_VER);
while (arr.length) {
try { localStorage.setItem(VERS, JSON.stringify(arr)); break; }
catch (e) { if (!pieno(e)) break; arr = arr.slice(0, arr.length - 1); }
}
if (!arr.length) { try { localStorage.removeItem(VERS); } catch (e) {} }
pulisciImmagini();
},
restoreVersion(i) { const v = this.versions()[i]; if (v) { RS.scene.load(completa(riparaTesti(v.doc))); return true; } return false; },
saveTemplate() {
try {
const s = RS.scene;
const m = s.meta || {};
localStorage.setItem('scenasinistro:template', JSON.stringify({ meta: { comando: m.comando || '', comando2: m.comando2 || '', stazione: m.stazione || '' }, scaleDenom: s.scaleDenom, printOpts: s.printOpts }));
return true;
} catch (e) { return false; }
},
template() { try { const t = localStorage.getItem('scenasinistro:template'); return t ? JSON.parse(t) : null; } catch (e) { return null; } },
list() {
try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
catch (e) { return []; }
},
_writeList(arr) { scrivi(KEY, JSON.stringify(arr)); },
save(nome) {
const doc = RS.scene.toJSON();
doc.nome = nome || ('Tavola ' + new Date().toLocaleString('it-IT'));
doc.id = this.currentId || ('t' + Date.now());
doc.salvataDa = this.operatore();
doc.salvataIl = new Date().toISOString();
const arr = this.list();
const leggera = alleggerisci(doc);
const i = arr.findIndex(t => t.id === doc.id);
if (i >= 0) arr[i] = leggera; else arr.push(leggera);
this._writeList(arr);
pulisciImmagini();
this.currentId = doc.id;
tuttoBene('tavola');
return doc;
},
saveAs(nome) { delete this.currentId; return this.save(nome); },
open(id) {
const t = this.list().find(x => x.id === id);
if (!t) return false;
RS.scene.load(completa(riparaTesti(t))); this.currentId = id; return true;
},
delete(id) {
try { this._writeList(this.list().filter(t => t.id !== id)); pulisciImmagini(); } catch (e) {}
if (this.currentId === id) delete this.currentId;
},
idFotoUsate() {
const usate = new Set();
const fasc = RS.scene && RS.scene.fascicolo;
fotoDi(fasc).forEach(p => p && p.id && usate.add(p.id));
try {
[AUTO, VERS, KEY, 'scenasinistro:fascicolo'].forEach(k => {
const s = localStorage.getItem(k) || '';
const re = /"id":"([A-Za-z0-9_-]+)"/g; let m;
while ((m = re.exec(s))) usate.add(m[1]);
});
} catch (e) {}
return usate;
},
occupazione() {
let tot = 0;
try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); tot += k.length + (localStorage.getItem(k) || '').length; } } catch (e) {}
return tot;
},
apiBase() { return 'api.ashx'; },
operatore() {
try {
if (localStorage.getItem('rilsin:operatore:scelto') === '1') {
const n = localStorage.getItem('rilsin:operatore');
if (n) return n;
}
const auto = this._nomeAuto || localStorage.getItem('rilsin:operatore:auto');
if (auto) return auto;
const vecchio = localStorage.getItem('rilsin:operatore');
if (vecchio && vecchio !== RS.AUTORE) return vecchio;
} catch (e) {}
return 'Postazione';
},
setOperatore(n) {
try {
n = (n || '').trim();
if (n) { localStorage.setItem('rilsin:operatore', n); localStorage.setItem('rilsin:operatore:scelto', '1'); }
else { localStorage.removeItem('rilsin:operatore'); localStorage.removeItem('rilsin:operatore:scelto'); }
} catch (e) {}
},
leggiPostazione() {
if (!this.useServer()) return Promise.resolve(null);
return fetch(this.apiBase() + '?op=whoami', { cache: 'no-store' })
.then(r => r.ok ? r.json() : null)
.then(w => {
if (w && w.utente) {
this._nomeAuto = w.utente + (w.pc ? ' (' + w.pc + ')' : '');
try { localStorage.setItem('rilsin:operatore:auto', this._nomeAuto); } catch (e) {}
}
return w;
}).catch(() => null);
},
useServer() {
if (location.protocol === 'file:') return false;
if (/(^|\.)github\.io$/i.test(location.hostname)) return false;
const m = document.querySelector('meta[name="rilsin-archive"]');
const mode = m ? (m.getAttribute('content') || '').toLowerCase() : 'auto';
if (mode === 'server') return true;
if (mode === 'local') return false;
return /^https?:$/.test(location.protocol) &&
!/^(localhost|127\.0\.0\.1|::1)$/.test(location.hostname);
},
listRemote() {
return fetch(this.apiBase() + '?op=list', { cache: 'no-store' })
.then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }).then(riparaTesti);
},
openRemote(id) {
return fetch(this.apiBase() + '?op=load&id=' + encodeURIComponent(id), { cache: 'no-store' })
.then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }).then(riparaTesti)
.then(doc => { RS.scene.load(doc); this.currentId = id; this.currentName = doc.nome || ''; return doc; });
},
saveRemote(nome, opz) {
opz = opz || {};
const doc = RS.scene.toJSON();
doc.nome = nome || ('Tavola ' + new Date().toLocaleString('it-IT'));
doc.id = this.currentId || doc.id || ('t' + Date.now());
doc.salvataDa = this.operatore();
if (doc.fascicolo && Array.isArray(doc.fascicolo.photos)) {
const rif = p => { const o = { id: p.id, descr: p.descr || '' }; if (p.guida) o.guida = p.guida; if (p.ora) o.ora = p.ora; return o; };
doc.fascicolo = Object.assign({}, doc.fascicolo, { photos: doc.fascicolo.photos.map(rif) });
if (Array.isArray(doc.fascicolo.documenti)) doc.fascicolo.documenti = doc.fascicolo.documenti.map(rif);
}
const thumbP = (RS.exportUtil && RS.exportUtil.thumbDataURL) ? RS.exportUtil.thumbDataURL(200) : Promise.resolve('');
return this.inviaFoto().then(() => thumbP).then(thumb => {
if (thumb) doc.thumb = thumb;
return fetch(this.apiBase() + '?op=save&user=' + encodeURIComponent(this.operatore()) + (opz.forza ? '&force=1' : ''), {
method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(doc)
});
}).then(r => {
if (r.status === 409) {
return r.json().catch(() => ({})).then(j => {
const e = new Error('tavola in uso da ' + (j.by || 'un\'altra postazione'));
e.codice = 'in_uso'; e.da = j.by || ''; throw e;
});
}
if (!r.ok) throw new Error('HTTP ' + r.status);
return r.json();
}).then(res => { this.currentId = (res && res.id) || doc.id; return doc; });
},
inviaFoto() {
const F = RS.fascicolo;
const fasc = RS.scene.fascicolo;
const ids = fotoDi(fasc).map(p => p.id).filter(Boolean);
if (!ids.length || !F) return Promise.resolve();
const blocchi = [];
for (let i = 0; i < ids.length; i += 60) blocchi.push(ids.slice(i, i + 60));
return Promise.all(blocchi.map(b => fetch(this.apiBase() + '?op=fotomancanti&ids=' + b.join(','), { cache: 'no-store' })
.then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })))
.then(liste => [].concat.apply([], liste))
.then(mancanti => {
if (!mancanti.length) return;
return F.fotoComplete(mancanti).then(mappa => mancanti.reduce((p, id) => p.then(() => {
const src = mappa.get(id);
if (!src) return;
return fetch(src).then(r => r.blob()).then(img => fetch(this.apiBase() + '?op=fotosave&id=' + encodeURIComponent(id), {
method: 'POST', headers: { 'Content-Type': img.type || 'application/octet-stream' }, body: img
})).then(r => { if (!r.ok) throw new Error('invio foto non riuscito (HTTP ' + r.status + ')'); });
}), Promise.resolve()));
});
},
scaricaFoto(id) {
return fetch(this.apiBase() + '?op=foto&id=' + encodeURIComponent(id), { cache: 'no-store' })
.then(r => r.ok ? r.blob() : null)
.then(b => b && /^image\/(jpeg|png)$/.test(b.type) ? new Promise(res => {
const fr = new FileReader();
fr.onload = () => res(fr.result); fr.onerror = () => res(null);
fr.readAsDataURL(b);
}) : null)
.then(t => (t && t.indexOf('data:image/') === 0) ? t : null)
.catch(() => null);
},
deleteRemote(id) {
return fetch(this.apiBase() + '?op=delete&id=' + encodeURIComponent(id), { cache: 'no-store' })
.then(r => r.ok);
},
versionsRemote(id) {
return fetch(this.apiBase() + '?op=versions&id=' + encodeURIComponent(id), { cache: 'no-store' })
.then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }).then(riparaTesti);
},
loadVersionRemote(id, ver) {
return fetch(this.apiBase() + '?op=loadver&id=' + encodeURIComponent(id) + '&ver=' + encodeURIComponent(ver), { cache: 'no-store' })
.then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }).then(riparaTesti);
},
lockRemote(id, forza) {
return fetch(this.apiBase() + '?op=lock&id=' + encodeURIComponent(id) + '&user=' + encodeURIComponent(this.operatore()) + (forza ? '&force=1' : ''), { cache: 'no-store' })
.then(r => r.json());
},
unlockRemote(id) {
if (!id) return Promise.resolve();
const u = this.apiBase() + '?op=unlock&id=' + encodeURIComponent(id) + '&user=' + encodeURIComponent(this.operatore());
try { if (navigator.sendBeacon && navigator.sendBeacon(u)) return Promise.resolve(); } catch (e) {}
return fetch(u, { cache: 'no-store', keepalive: true }).catch(() => {});
},
exportFile() {
return this.docCompleto().then(doc => RS.exportUtil.download(
new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' }), (doc.nome || this.currentName || 'scena') + '.json'));
},
docCompleto() {
const doc = RS.scene.toJSON();
doc.build = RS.BUILD;
const fasc = doc.fascicolo;
if (!fasc || !fotoDi(fasc).length || !RS.fascicolo) return Promise.resolve(doc);
return RS.fascicolo.fotoComplete(fotoDi(fasc).map(p => p.id)).then(mappa => {
const intera = p => Object.assign({}, p, { src: p.src || mappa.get(p.id) || '' });
doc.fascicolo = Object.assign({}, fasc, { photos: (fasc.photos || []).map(intera) });
if (Array.isArray(fasc.documenti)) doc.fascicolo.documenti = fasc.documenti.map(intera);
return doc;
});
},
tavolaCompleta(t) {
const doc = completa(riparaTesti(JSON.parse(JSON.stringify(t))));
doc.build = doc.build || RS.BUILD;
const fasc = doc.fascicolo;
if (!fasc || !fotoDi(fasc).length || !RS.fascicolo) return Promise.resolve(doc);
return RS.fascicolo.fotoComplete(fotoDi(fasc).map(p => p.id)).then(mappa => {
const intera = p => Object.assign({}, p, { src: p.src || mappa.get(p.id) || '' });
doc.fascicolo = Object.assign({}, fasc, { photos: (fasc.photos || []).map(intera) });
if (Array.isArray(fasc.documenti)) doc.fascicolo.documenti = fasc.documenti.map(intera);
return doc;
});
},
fileDisponibile() {
if (window.RilsinAndroid || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '')) return false;
return !this.useServer() && typeof window.showSaveFilePicker === 'function' && typeof window.showOpenFilePicker === 'function';
},
fileAperto: null,
_fileMod: 0,
async salvaSuFile(nuovo, opz) {
opz = opz || {};
let h = nuovo ? null : this.fileAperto, ricollegato = false;
if (!h && !nuovo && this.currentId) { const r = (await fileRecenti()).find(x => x.id === this.currentId); if (r) { h = r.h; ricollegato = true; } }
if (h && !(await permesso(h))) h = null;
let prima = null;
if (h) {
try { const f = await h.getFile(); if (f.size) prima = { testo: await f.text(), mod: f.lastModified }; } catch (e) {}
let d = null; if (prima) try { d = JSON.parse(prima.testo); } catch (e) {}
if (buildPiuNuova(d)) {
const e = new Error('il file «' + h.name + '» è stato salvato con la build ' + d.build + ', questo PC ha la ' + RS.BUILD);
e.codice = 'build'; e.build = d.build; e.file = h.name; throw e;
}
if (prima && !opz.forza) {
const altrove = !!(d && d.postazione && d.postazione !== postazione());
const nostro = this._scritto != null && prima.testo === this._scritto;
const cambiato = !nostro && (ricollegato ? altrove : (this._fileMod && prima.mod > this._fileMod + 1000));
if (cambiato) {
const e = new Error('il file «' + h.name + '» è stato salvato da ' + chiHaSalvato(d) + ' dopo che l\'hai aperto');
e.codice = 'cambiato'; e.da = chiHaSalvato(d); e.quando = prima.mod; e.file = h.name; throw e;
}
}
}
if (!h) {
const base = nomeFile(this.currentName || ((RS.ui && RS.ui.nomeProposto) ? RS.ui.nomeProposto() : 'Sinistro ' + new Date().toLocaleDateString('it-IT')).replace(/\//g, '-'));
try { h = await window.showSaveFilePicker({ id: 'rilsin', suggestedName: base + '.json', types: TIPO_FILE }); }
catch (e) { if (e && e.name === 'AbortError') e.annullato = true; throw e; }
if (nuovo || !this.currentId) this.currentId = 't' + Date.now();
this.currentName = h.name.replace(/\.json$/i, '');
prima = null;
}
const doc = await this.docCompleto();
doc.id = this.currentId; doc.nome = this.currentName; doc.salvataDa = this.operatore(); doc.postazione = postazione();
const testo = JSON.stringify(doc);
if (prima && prima.testo !== testo) await conservaVersione(doc.id, prima.testo, prima.mod);
let errore = null;
for (let tent = 0; tent < 3; tent++) {
try {
const w = await h.createWritable();
try { await w.write(testo); await w.close(); }
catch (e) { try { await w.abort(); } catch (e2) {} throw e; }
errore = null; break;
} catch (e) { errore = e; await new Promise(r => setTimeout(r, 800 * (tent + 1))); }
}
if (errore) {
const e = new Error('il file «' + h.name + '» non si è potuto scrivere (' + ((errore && (errore.message || errore.name)) || errore) + ')');
e.codice = 'scrittura'; e.file = h.name; throw e;
}
try {
const f = await h.getFile();
if (f.size !== new Blob([testo]).size) {
const e = new Error('il file «' + h.name + '» sul disco non corrisponde a quello salvato'); e.codice = 'scrittura'; e.file = h.name; throw e;
}
} catch (e) { if (e && e.codice) throw e; }
this._scritto = testo;
this.fileAperto = h; this.buildFile = 0;
try { this._fileMod = (await h.getFile()).lastModified; } catch (e) { this._fileMod = Date.now(); }
await ricordaFile(h, doc.id, doc.nome);
return h.name;
},
async leggiFile(h, soloLettura) {
if (!h) [h] = await window.showOpenFilePicker({ id: 'rilsin', types: TIPO_FILE });
else if (!soloLettura && !(await permesso(h))) throw new Error('permesso negato per «' + h.name + '»');
const f = await h.getFile();
const doc = completa(riparaTesti(JSON.parse(await f.text())));
if (!doc || (!doc.elements && !doc.fascicolo)) throw new Error('«' + h.name + '» non è una tavola di RILSIN');
return { h, doc, mod: f.lastModified, da: chiHaSalvato(doc), build: buildPiuNuova(doc) ? doc.build : 0,
collega: !!(doc.postazione && doc.postazione !== postazione() && Date.now() - f.lastModified < 30 * 60000) };
},
async apriLetto(l, copia) {
RS.scene.load(l.doc);
this._scritto = null;
const nome = l.doc.nome || l.h.name.replace(/\.json$/i, '');
if (copia) {
this.currentId = 't' + Date.now(); this.currentName = nome + ' (copia)'; this.fileAperto = null; this._fileMod = 0; this.buildFile = 0;
return l.h.name;
}
this.currentId = l.doc.id || ('t' + Date.now()); this.currentName = nome;
this.fileAperto = l.h; this._fileMod = l.mod; this.buildFile = l.build || 0;
await ricordaFile(l.h, this.currentId, this.currentName);
return l.h.name;
},
async apriDaFile(h) { return this.apriLetto(await this.leggiFile(h)); },
fileRecenti: () => fileRecenti(),
staccaFile() { this._scritto = null; this.fileAperto = null; this._fileMod = 0; this.buildFile = 0; },
buildFile: 0,
async tavoleConVersioni() {
try {
const d = await dbRecenti();
const chiavi = await new Promise((ok, ko) => { const q = d.transaction('versioni').objectStore('versioni').getAllKeys(); q.onsuccess = () => ok(q.result || []); q.onerror = () => ko(q.error); });
d.close();
const out = [];
for (const id of chiavi) { const v = (await dbLeggi('versioni', id)) || []; if (v.length) out.push({ id, nome: v[0].nome || id, n: v.length, ultima: v[0].quando }); }
return out.sort((a, b) => b.ultima - a.ultima);
} catch (e) { return []; }
},
versioniDi(id) { return dbLeggi('versioni', id).then(v => v || []).catch(() => []); },
apriVersione(id, v) {
const doc = completa(riparaTesti(JSON.parse(v.testo)));
RS.scene.load(doc);
if (this.currentId !== id) { this.fileAperto = null; this._fileMod = 0; this.buildFile = 0; }
this.currentId = id; this.currentName = doc.nome || this.currentName;
},
importFile(file, cb) {
const r = new FileReader();
r.onload = () => {
try {
const doc = JSON.parse(r.result); RS.scene.load(doc); cb && cb(true);
if (buildPiuNuova(doc) && RS.ui) RS.ui.toast('⚠ Tavola salvata con RILSIN build ' + doc.build + ', qui c\'è la ' + RS.BUILD + ': aggiorna l\'app prima di modificarla', 9000);
}
catch (e) { alert('File non valido: ' + e.message); cb && cb(false); }
};
r.readAsText(file);
}
};
let CRC = null;
function crc32(u8) {
if (!CRC) {
CRC = new Uint32Array(256);
for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; CRC[n] = c >>> 0; }
}
let c = 0xFFFFFFFF;
for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 0xFF] ^ (c >>> 8);
return (c ^ 0xFFFFFFFF) >>> 0;
}
const flusso = (u8, trasf) => new Response(new Blob([u8]).stream().pipeThrough(trasf)).arrayBuffer().then(b => new Uint8Array(b));
const oraDos = d => ({ t: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
d: ((Math.max(1980, d.getFullYear()) - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate() });
async function creaZip(file) {
if (file.length > 65535) throw new Error('troppi file per un solo .zip (' + file.length + ')');
const enc = new TextEncoder(), parti = [], centrale = [];
const comprimi = typeof CompressionStream === 'function';
let off = 0;
for (const f of file) {
const nome = enc.encode(f.nome), crc = crc32(f.dati), { t, d } = oraDos(f.data || new Date());
let dati = f.dati, metodo = 0;
if (comprimi && /\.json$/i.test(f.nome)) {
try { const z = await flusso(f.dati, new CompressionStream('deflate-raw')); if (z.length < dati.length) { dati = z; metodo = 8; } } catch (e) {}
}
if (off + dati.length > 0xFFFFFFFF) throw new Error('copia oltre i 4 GB: troppo grande per un solo .zip');
const lh = new DataView(new ArrayBuffer(30));
lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, metodo, true);
lh.setUint16(10, t, true); lh.setUint16(12, d, true); lh.setUint32(14, crc, true);
lh.setUint32(18, dati.length, true); lh.setUint32(22, f.dati.length, true); lh.setUint16(26, nome.length, true);
parti.push(new Blob([lh.buffer, nome, dati]));
const ch = new DataView(new ArrayBuffer(46));
ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true);
ch.setUint16(10, metodo, true); ch.setUint16(12, t, true); ch.setUint16(14, d, true); ch.setUint32(16, crc, true);
ch.setUint32(20, dati.length, true); ch.setUint32(24, f.dati.length, true); ch.setUint16(28, nome.length, true);
ch.setUint32(42, off, true);
centrale.push(ch.buffer, nome);
off += 30 + nome.length + dati.length;
}
const dimC = centrale.reduce((s, p) => s + p.byteLength, 0);
const fine = new DataView(new ArrayBuffer(22));
fine.setUint32(0, 0x06054b50, true); fine.setUint16(8, file.length, true); fine.setUint16(10, file.length, true);
fine.setUint32(12, dimC, true); fine.setUint32(16, off, true);
return new Blob(parti.concat(centrale, [fine.buffer]), { type: 'application/zip' });
}
async function leggiZip(blob) {
const buf = new Uint8Array(await blob.arrayBuffer()), dv = new DataView(buf.buffer);
let e = -1;
for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { e = i; break; }
if (e < 0) throw new Error('il file non è un .zip');
const n = dv.getUint16(e + 10, true); let p = dv.getUint32(e + 16, true);
if (n === 0xFFFF || p === 0xFFFFFFFF) throw new Error('copia troppo grande (formato zip64 non gestito)');
const dec = new TextDecoder(), voci = [];
for (let k = 0; k < n; k++) {
if (dv.getUint32(p, true) !== 0x02014b50) throw new Error('indice del .zip danneggiato');
const flag = dv.getUint16(p + 8, true), metodo = dv.getUint16(p + 10, true), dimZ = dv.getUint32(p + 20, true);
const ln = dv.getUint16(p + 28, true), lx = dv.getUint16(p + 30, true), lc = dv.getUint16(p + 32, true), loc = dv.getUint32(p + 42, true);
const nb = buf.subarray(p + 46, p + 46 + ln);
const nome = ((flag & 0x0800) ? dec.decode(nb) : String.fromCharCode.apply(null, nb)).replace(/\\/g, '/');
p += 46 + ln + lx + lc;
if (/\/$/.test(nome)) continue;
const inizio = loc + 30 + dv.getUint16(loc + 26, true) + dv.getUint16(loc + 28, true), z = buf.subarray(inizio, inizio + dimZ);
voci.push({ nome, dati: () => metodo === 0 ? Promise.resolve(z)
: metodo === 8 ? flusso(z, new DecompressionStream('deflate-raw'))
: Promise.reject(new Error('compressione non gestita (' + metodo + ') per ' + nome)) });
}
return voci;
}
storage.creaZip = creaZip;
storage.leggiZip = leggiZip;
storage.riparaTesti = riparaTesti;
storage.pulisciDati = pulisciDati;
RS.storage = storage;
})(window.RS = window.RS || {});

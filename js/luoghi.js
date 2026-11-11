(function (RS) {
'use strict';
const el = id => document.getElementById(id);
const escH = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const TIPI_LUOGO = { road: 1, raccordo: 1, roadway: 1, roundabout: 1, crosswalk: 1, stopline: 1, band: 1, area: 1, island: 1,
parking: 1, mark: 1, building: 1, ramp: 1, zebrapath: 1, image: 1, north: 1, incrocio: 1, curva: 1 };
function simboloDelLuogo(e) {
if (e.type !== 'symbol') return false;
const C = RS.catalog, fisso = id => [].concat(C.SEGNALETICA, C.FISSI).some(d => d.id === id);
return e.letter != null || fisso(e.catId) || (!e.catId && ['palo', 'albero', 'semaforo', 'segnale', 'tombino', 'idrante'].indexOf(e.sym) >= 0);
}
const delLuogo = e => TIPI_LUOGO[e.type] || simboloDelLuogo(e);
let dbP = null;
function db() {
if (dbP) return dbP;
dbP = new Promise((ok, ko) => {
if (!window.indexedDB) { ko(new Error('archivio del dispositivo non disponibile')); return; }
const r = indexedDB.open('rilsin-luoghi', 1);
r.onupgradeneeded = () => { r.result.createObjectStore('luoghi', { keyPath: 'id' }); };
r.onsuccess = () => { r.result.onversionchange = () => r.result.close(); ok(r.result); };
r.onerror = () => ko(r.error);
r.onblocked = () => ko(new Error('archivio del dispositivo occupato'));
setTimeout(() => ko(new Error('archivio del dispositivo: tempo scaduto')), 6000);
});
dbP.catch(() => { dbP = null; });
return dbP;
}
function locale(modo, fn) {
return db().then(d => new Promise((ok, ko) => {
const tx = d.transaction('luoghi', modo), st = tx.objectStore('luoghi');
let out; const r = fn(st); if (r) r.onsuccess = () => { out = r.result; };
tx.oncomplete = () => ok(out); tx.onerror = () => ko(tx.error); tx.onabort = () => ko(tx.error);
}));
}
const server = () => !!(RS.storage && RS.storage.useServer && RS.storage.useServer());
const api = q => (RS.storage && RS.storage.apiBase ? RS.storage.apiBase() : 'api.ashx') + '?' + q;
const json = r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); };
const ripara = o => (RS.storage && RS.storage.riparaTesti) ? RS.storage.riparaTesti(o) : o;
const riassunto = l => ({ id: l.id, nome: l.nome, localita: l.localita, coordinate: l.coordinate, gps: l.gps, savedAt: l.savedAt,
salvatoDa: l.salvatoDa, count: (l.elements || []).length, thumb: l.thumb, file: l.fileH ? l.fileH.name : '' });
const suFile = () => !server() && !!(RS.storage && RS.storage.fileDisponibile && RS.storage.fileDisponibile());
const TIPO_LUOGO = [{ description: 'Luogo RILSIN', accept: { 'application/json': ['.json'] } }];
const nomeFile = s => String(s || 'Luogo').replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim().slice(0, 100) || 'Luogo';
const testoLuogo = l => { const c = Object.assign({ tipo: 'rilsin-luogo' }, l); delete c.fileH; return JSON.stringify(c); };
async function scriviFile(h, testo) {
let err = null;
for (let t = 0; t < 3; t++) {
try { const w = await h.createWritable(); try { await w.write(testo); await w.close(); } catch (e) { try { await w.abort(); } catch (e2) {} throw e; } return; }
catch (e) { err = e; await new Promise(r => setTimeout(r, 800 * (t + 1))); }
}
throw new Error("il file «" + h.name + "» non si è potuto scrivere (" + ((err && (err.message || err.name)) || err) + ")");
}
async function leggiFile(h) {
const l = ripara(JSON.parse(await (await h.getFile()).text()));
if (!l || l.tipo !== 'rilsin-luogo' || !Array.isArray(l.elements)) return null;
delete l.tipo; l.fileH = h; return l;
}
function distanza(a, b) {
if (!a || !b || a.lat == null || b.lat == null) return null;
const R = 6371000, r = x => x * Math.PI / 180;
const dLat = r(b.lat - a.lat), dLon = r(b.lon - a.lon);
const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLon / 2) ** 2;
return 2 * R * Math.asin(Math.sqrt(h));
}
const luoghi = {
distanza,
elenco() {
if (server()) return fetch(api('op=luoghi'), { cache: 'no-store' }).then(json).then(ripara);
return locale('readonly', st => st.getAll()).then(a => (a || []).map(riassunto));
},
carica(id) {
if (server()) return fetch(api('op=luogo&id=' + encodeURIComponent(id)), { cache: 'no-store' }).then(json).then(ripara);
return locale('readonly', st => st.get(id));
},
salva(l) {
if (server()) return fetch(api('op=luogosave'), { method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(l) }).then(json);
return locale('readwrite', st => st.put(l)).then(() => ({ ok: true, id: l.id }));
},
elimina(id) {
if (server()) return fetch(api('op=luogodel&id=' + encodeURIComponent(id)), { cache: 'no-store' }).then(json);
return locale('readwrite', st => st.delete(id));
},
daTavola(nome) {
const S = RS.scene, m = S.meta || {};
const elementi = JSON.parse(JSON.stringify(S.elements.filter(e => delLuogo(e) && !e.inc)))
.map(e => { delete e.gid; return e; });
const lettere = new Set(S.elements.filter(e => e.letter).map(e => String(e.letter).toUpperCase()));
const RX = /^\s*([A-Za-z]{1,3})\s*(?:→|->|–|-)\s*([A-Za-z]{1,3})\b/;
const misure = (S.misure || []).filter(x => {
const k = RX.exec(x.descr || '');
return (k && lettere.has(k[1].toUpperCase()) && lettere.has(k[2].toUpperCase())) || /largh|corsi|marciapied|banchin/i.test(x.descr || '');
}).map(x => ({ descr: x.descr, val: x.val }));
const b = m.base || {}, A = S.get(b.aId), B = S.get(b.bId);
return {
id: 'l' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
nome: nome || m.localita || 'Luogo senza nome',
localita: m.localita || '', comune: m.comune || '', coordinate: m.coordinate || '', gps: m.gps ? { lat: m.gps.lat, lon: m.gps.lon } : null,
scaleDenom: S.scaleDenom, base: A && B ? { a: A.letter, b: B.letter } : null,
elements: elementi, misure, savedAt: new Date().toISOString(),
salvatoDa: RS.storage && RS.storage.operatore ? RS.storage.operatore() : ''
};
},
applica(l) {
const S = RS.scene, vuota = !S.elements.length;
const usate = new Set(S.elements.filter(e => e.letter).map(e => String(e.letter).toUpperCase()));
const nuovaLettera = () => { for (let i = 0; i < 26 * 27; i++) { const t = i < 26 ? String.fromCharCode(65 + i) : String.fromCharCode(64 + Math.floor(i / 26)) + String.fromCharCode(65 + i % 26); if (!usate.has(t)) { usate.add(t); return t; } } return '?'; };
const lettere = {};
const zMin = S.elements.reduce((z, e) => Math.min(z, e.z || 0), 0);
const ids = {}, n = (l.elements || []).length;
(l.elements || []).forEach((e0, i) => {
const e = JSON.parse(JSON.stringify(e0)), vecchio = e.id;
delete e.id;
if (!vuota) e.z = zMin - n + i;
if (e.letter != null) {
const L = String(e.letter).toUpperCase();
lettere[L] = usate.has(L) && !vuota ? nuovaLettera() : (usate.add(L), L);
e.letter = lettere[L];
}
ids[vecchio] = S.add(e, false).id;
});
S.elements.forEach(e => (e.pts || []).forEach(p => { if (p.aid != null && ids[p.aid]) p.aid = ids[p.aid]; }));
const rinomina = t => String(t).replace(/^\s*([A-Za-z]{1,3})(\s*(?:→|->|–|-)\s*)([A-Za-z]{1,3})\b/, (m, a, s, b) => (lettere[a.toUpperCase()] || a) + s + (lettere[b.toUpperCase()] || b));
S.misure = S.misure || [];
(l.misure || []).forEach(x => { const d = rinomina(x.descr); if (!S.misure.some(y => y.descr === d)) S.misure.push({ descr: d, val: x.val }); });
const nuovi = new Set(Object.values(ids));
S.elements.forEach(e => { if (nuovi.has(e.id) && e.type === 'measure' && e.note) e.note = rinomina(e.note); });
const m = S.meta = S.meta || {};
if (l.base && lettere[String(l.base.a).toUpperCase()] && (!m.base || !S.get(m.base.aId))) {
const trova = L => S.elements.find(e => e.letter === lettere[String(L).toUpperCase()]);
const A = trova(l.base.a), B = trova(l.base.b);
if (A && B) m.base = { aId: A.id, bId: B.id };
}
if (!m.localita && l.localita) m.localita = l.localita;
if (!m.comune && l.comune) m.comune = l.comune;
if (!m.coordinate && l.coordinate) { m.coordinate = l.coordinate; if (l.gps) m.gps = Object.assign({}, l.gps); }
if (vuota && l.scaleDenom) S.scaleDenom = l.scaleDenom;
S.render(); S.snapshot(); if (vuota) S.fit();
S.emit('change'); S.emit('view');
const cambiate = Object.keys(lettere).filter(k => lettere[k] !== k);
return { oggetti: n, lettere: cambiate.map(k => k + '→' + lettere[k]) };
},
async apri() {
const m = el('luoghiModal'), body = el('luoghiBody');
m.hidden = false;
m.onclick = ev => { if (ev.target === m || ev.target.closest('[data-act="luoghi-close"]')) this.chiudi(); };
body.innerHTML = '<div class="mis-hint">Caricamento della libreria…</div>';
let lista = [];
try { lista = await this.elenco(); } catch (err) { body.innerHTML = `<div class="ver-esito ver-avviso"><span>⚠</span><div>Libreria non disponibile: ${escH(err.message)}</div></div>`; return; }
const S = RS.scene, qui = S.meta && S.meta.gps;
lista.forEach(x => { x._d = distanza(qui, x.gps); });
lista.sort((a, b) => (a._d == null) - (b._d == null) || (a._d || 0) - (b._d || 0) || String(a.nome).localeCompare(String(b.nome)));
this._ultimaLista = lista;
const file = suFile();
const dove = server() ? 'La libreria è nell\'archivio condiviso, comune a tutte le postazioni.'
: file ? 'Il luogo diventa un file nella cartella che scegli: mettilo nella cartella condivisa dei luoghi, così serve a tutto il comando.'
: 'La libreria è in questo dispositivo: per passare un luogo a un altro, esportalo (⬇) e importalo là.';
const strade = S.elements.filter(delLuogo).length;
const dist = d => d == null ? '' : d < 1000 ? ' · a ' + Math.round(d) + ' m' : ' · a ' + (d / 1000).toFixed(1).replace('.', ',') + ' km';
body.innerHTML =
`<div class="mis-step">
           <div class="mis-step-h"><span class="mis-step-n">1</span> Salva il luogo della tavola aperta</div>
           <div class="gps-row"><input id="lgNome" placeholder="Nome del luogo (es. Via Roma incrocio Via Po)" value="${escH((S.meta && S.meta.localita) || '')}">
             <button class="mini" id="lgSalva"${strade ? '' : ' disabled'}>${file ? '💾 Salva nella cartella…' : '💾 Salva nella libreria'}</button></div>
           <div class="mis-hint">${strade ? `Si salvano ${strade} oggetti fissi (strade, segnaletica, arredo, capisaldi con la base) e le misure fra capisaldi e le larghezze; veicoli, tracce e misure del sinistro restano fuori.` : 'La tavola non ha ancora strade, segnaletica o capisaldi da salvare.'}
             ${dove}</div>
         </div>
         <div class="mis-step">
           <div class="mis-step-h"><span class="mis-step-n">2</span> Parti da un luogo salvato <span class="cnt">${lista.length}</span></div>
           ${file ? '<div class="mis-hint" style="margin-top:0">Qui i luoghi già usati su questo PC. Quelli salvati dai colleghi si aprono la prima volta con «Apri un luogo dalla cartella», poi restano in elenco.</div>' : ''}
           ${qui ? '' : '<div class="mis-hint" style="margin-top:0">Rilevando la posizione (Dati e misure → Intestazione → GPS) i luoghi si ordinano per distanza.</div>'}
           <div class="lg-lista">${lista.length ? lista.map(x => `
             <div class="lg-voce">
               ${x.thumb ? `<img src="${escH(x.thumb)}" alt="">` : '<div class="lg-vuota">🗺</div>'}
               <div class="lg-t"><b>${escH(x.nome)}</b>
                 <small>${escH([x.localita && x.localita !== x.nome ? x.localita : '', x.count + ' oggetti', x.savedAt ? new Date(x.savedAt).toLocaleDateString('it-IT') : '', x.salvatoDa].filter(Boolean).join(' · '))}${dist(x._d)}</small>
                 ${file ? `<small>${x.file ? '📁 ' + escH(x.file) : '⚠ solo in questo browser: salvalo nella cartella per gli altri'}</small>` : ''}</div>
               <div class="lg-az">
                 <button class="mini" data-lg-usa="${escH(x.id)}" style="background:var(--accent);border-color:var(--accent);color:#fff">Usa</button>
                 ${file ? (x.file ? '' : `<button class="mini" data-lg-cart="${escH(x.id)}" title="Salvalo come file nella cartella condivisa">📁</button>`)
: `<button class="mini" data-lg-esp="${escH(x.id)}" title="Esporta in un file, da importare su un altro dispositivo">⬇</button>`}
                 <button class="mini danger" data-lg-del="${escH(x.id)}" title="${file && x.file ? 'Togli dall\'elenco di questo PC (il file resta nella cartella)' : 'Elimina dalla libreria'}">🗑</button>
               </div>
             </div>`).join('') : '<div class="mis-hint">Nessun luogo ancora salvato.</div>'}</div>
           <div class="modal-actions" style="margin-top:10px"><button class="mini" id="lgImporta">${file ? '📂 Apri un luogo dalla cartella…' : '⬆ Importa un luogo da file'}</button></div>
         </div>`;
el('lgSalva').onclick = () => this._salvaDaFinestra();
el('lgImporta').onclick = () => file ? this._apriDaCartella() : this._importa();
body.querySelectorAll('[data-lg-usa]').forEach(b => b.onclick = () => this._usa(b.dataset.lgUsa));
body.querySelectorAll('[data-lg-esp]').forEach(b => b.onclick = () => this._esporta(b.dataset.lgEsp));
body.querySelectorAll('[data-lg-cart]').forEach(b => b.onclick = () => this._inCartella(b.dataset.lgCart));
body.querySelectorAll('[data-lg-del]').forEach(b => b.onclick = () => this._elimina(b.dataset.lgDel, lista.find(x => x.id === b.dataset.lgDel)));
},
chiudi() { el('luoghiModal').hidden = true; },
async _salvaDaFinestra() {
const l = this.daTavola((el('lgNome').value || '').trim());
try {
const h = suFile() ? await window.showSaveFilePicker({ id: 'rilsin-luoghi', suggestedName: 'Luogo - ' + nomeFile(l.nome) + '.json', types: TIPO_LUOGO }) : null;
if (RS.exportUtil && RS.exportUtil.thumbDataURL) {
const S = RS.scene, tutti = S.elements;
S.elements = tutti.filter(delLuogo); S.render(true);
try { l.thumb = await RS.exportUtil.thumbDataURL(160); } finally { S.elements = tutti; S.render(true); }
}
if (h) {
await scriviFile(h, testoLuogo(l));
l.fileH = h;
await this.salva(l);
if (RS.ui) RS.ui.toast('Luogo «' + l.nome + '» salvato nel file «' + h.name + '»');
} else {
await this.salva(l);
if (RS.ui) RS.ui.toast('Luogo «' + l.nome + '» salvato nella libreria');
}
this.apri();
} catch (err) { if (!err || err.name !== 'AbortError') alert('Il luogo non è stato salvato: ' + (err && err.message || err)); }
},
async _apriDaCartella() {
let hs; try { hs = await window.showOpenFilePicker({ id: 'rilsin-luoghi', multiple: true, types: TIPO_LUOGO }); } catch (e) { return; }
const presi = [], scartati = [];
const elenco = await this.elenco().catch(() => []);
for (const h of hs) {
try {
const l = await leggiFile(h);
if (!l) { scartati.push(h.name); continue; }
const gia = elenco.find(x => x.id === l.id);
l.id = gia ? gia.id : (l.id || 'l' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6));
await this.salva(l); presi.push(l.nome);
} catch (e) { scartati.push(h.name); }
}
if (RS.ui && presi.length) RS.ui.toast(presi.length === 1 ? 'Luogo «' + presi[0] + '» aggiunto all\'elenco' : presi.length + ' luoghi aggiunti all\'elenco');
if (scartati.length) alert('Non sono luoghi di RILSIN: ' + scartati.join(', '));
this.apri();
},
async _inCartella(id) {
const x = (this._ultimaLista || []).find(y => y.id === id);
try {
const h = await window.showSaveFilePicker({ id: 'rilsin-luoghi', suggestedName: 'Luogo - ' + nomeFile(x ? x.nome : 'Luogo') + '.json', types: TIPO_LUOGO });
const l = await this.carica(id); if (!l) return;
await scriviFile(h, testoLuogo(l));
l.fileH = h; await this.salva(l);
if (RS.ui) RS.ui.toast('Luogo «' + l.nome + '» salvato nel file «' + h.name + '»');
this.apri();
} catch (err) { if (!err || err.name !== 'AbortError') alert('Il luogo non è stato salvato: ' + (err && err.message || err)); }
},
async _usa(id) {
let l; try { l = await this.carica(id); } catch (err) { alert('Luogo non disponibile: ' + err.message); return; }
if (!l) return;
if (l.fileH) {
try {
let p = await l.fileH.queryPermission({ mode: 'read' });
if (p !== 'granted') p = await l.fileH.requestPermission({ mode: 'read' });
if (p === 'granted') { const f = await leggiFile(l.fileH); if (f) { f.id = l.id; await this.salva(f); l = f; } }
} catch (e) {}
}
if (RS.storage && RS.storage.pulisciDati) RS.storage.pulisciDati(l);
const S = RS.scene;
if (S.elements.length && RS.ui && RS.ui.scelta) {
const k = await RS.ui.scelta({
titolo: 'Usa il luogo «' + l.nome + '»',
testo: 'La tavola aperta non è vuota.',
opzioni: [
{ k: 'nuova', t: 'Nuova tavola da questo luogo', d: 'Si chiede prima se salvare il lavoro aperto', primario: true },
{ k: 'aggiungi', t: 'Aggiungi sotto il disegno attuale', d: 'I capisaldi con una lettera già usata prendono quella libera successiva' }
]
});
if (!k) return;
if (k === 'nuova') {
const ok = await RS.ui.confermaSostituzione('creare una nuova tavola dal luogo');
if (!ok) return;
RS.ui.nuovaTavola();
}
}
const r = this.applica(l);
this.chiudi();
if (RS.ui) RS.ui.toast('Luogo «' + l.nome + '»: ' + r.oggetti + ' oggetti' + (r.lettere.length ? ' — capisaldi rinominati ' + r.lettere.join(', ') : ''));
},
async _esporta(id) {
const l = await this.carica(id); if (!l) return;
const blob = new Blob([JSON.stringify(Object.assign({ tipo: 'rilsin-luogo' }, l))], { type: 'application/json' });
const nome = 'luogo-' + String(l.nome || 'senza-nome').slice(0, 40).replace(/[^\w-]+/g, '_') + '.json';
if (RS.exportUtil && RS.exportUtil.download) RS.exportUtil.download(blob, nome);
},
_importa() {
const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json';
inp.onchange = () => {
const f = inp.files && inp.files[0]; if (!f) return;
const r = new FileReader();
r.onload = async () => {
try {
const l = JSON.parse(String(r.result));
if (l.tipo !== 'rilsin-luogo' || !Array.isArray(l.elements)) throw new Error('il file non è un luogo di RILSIN');
delete l.tipo;
l.id = l.id || ('l' + Date.now().toString(36));
await this.salva(l);
if (RS.ui) RS.ui.toast('Luogo «' + l.nome + '» importato');
this.apri();
} catch (err) { alert('Importazione non riuscita: ' + err.message); }
};
r.readAsText(f);
};
inp.click();
},
async _elimina(id, x) {
const soloElenco = suFile() && x && x.file;
if (!confirm(soloElenco ? 'Togliere «' + x.nome + '» dall\'elenco di questo PC?\n\nIl file «' + x.file + '» resta nella cartella: si può riaprire quando serve.'
: 'Eliminare dalla libreria il luogo «' + ((x && x.nome) || id) + '»?' + (server() ? '\n\nNell\'archivio condiviso resta fra gli eliminati.' : ''))) return;
try { await this.elimina(id); this.apri(); } catch (err) { alert('Eliminazione non riuscita: ' + err.message); }
},
async proponiVicino(lat, lon) {
const S = RS.scene;
if (S.elements.some(delLuogo) || !RS.ui || !RS.ui.scelta) return;
let lista; try { lista = await this.elenco(); } catch (e) { return; }
const vicini = lista.map(x => Object.assign(x, { _d: distanza({ lat, lon }, x.gps) }))
.filter(x => x._d != null && x._d <= 150).sort((a, b) => a._d - b._d);
if (!vicini.length) return;
const k = await RS.ui.scelta({
titolo: 'Luogo già disegnato qui vicino',
testo: 'Nella libreria c\'è un luogo a ' + Math.round(vicini[0]._d) + ' m da qui. Vuoi partire da quel disegno?',
opzioni: vicini.slice(0, 3).map((x, i) => ({ k: x.id, t: x.nome, d: 'a ' + Math.round(x._d) + ' m · ' + x.count + ' oggetti', primario: i === 0 }))
});
if (k) this._usa(k);
}
};
RS.luoghi = luoghi;
})(window.RS = window.RS || {});

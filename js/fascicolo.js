(function (RS) {
'use strict';
const el = (id) => document.getElementById(id);
const KEY = 'scenasinistro:fascicolo';
const nuovoId = () => 'p' + Date.now() + Math.random().toString(36).slice(2, 6);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, c =>
({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const QUALIFICHE = ['IL COMANDANTE', 'IL COMANDANTE INT.', 'IL COMANDANTE in S.V.'];
const PRESET_DESCR = [
'Il presente fascicolo raccoglie la documentazione fotografica dello stato dei luoghi e della posizione dei veicoli coinvolti nel sinistro stradale.',
'Rilievo fotografico eseguito sul luogo del sinistro dal personale operante, a integrazione del rilievo planimetrico.',
'Documentazione fotografica dei danni riportati dai veicoli, delle tracce e dei detriti presenti sulla sede stradale.',
'Immagini acquisite durante il sopralluogo, a corredo degli atti relativi al sinistro stradale.'
];
const PRESET_DETT = [
'Le fotografie sono numerate progressivamente e descritte nella relativa didascalia.',
'Vedere didascalia di ciascuna fotografia.',
'Vedute d\'insieme della scena, particolari dei veicoli, delle tracce e della segnaletica.',
'Ripresa dei punti d\'urto, delle posizioni di quiete dei veicoli e dei detriti presenti.',
'Stato del fondo stradale, condizioni di visibilità e segnaletica orizzontale e verticale.'
];
function blank() {
return { comando: '', oggetto: '', descrizione: '', dettaglio: '', redattore: '', luogo: '', data: '',
qualifica: 'IL COMANDANTE', firmatario: '', perPage: 2, photos: [], documenti: [] };
}
const tutteLeFoto = m => (m.photos || []).concat(m.documenti || []);
const DB_NOME = 'rilsin', DB_FOTO = 'foto';
let dbAperto = null;
function apriDb() {
if (dbAperto) return dbAperto;
dbAperto = new Promise((ok, ko) => {
if (!window.indexedDB) { ko(new Error('archivio delle foto non disponibile')); return; }
const attesa = setTimeout(() => ko(new Error('archivio delle foto non risponde')), 6000);
let req;
try { req = indexedDB.open(DB_NOME, 1); } catch (e) { clearTimeout(attesa); ko(e); return; }
req.onupgradeneeded = () => {
const db = req.result;
if (!db.objectStoreNames.contains(DB_FOTO)) db.createObjectStore(DB_FOTO);
};
req.onsuccess = () => {
clearTimeout(attesa);
const db = req.result;
db.onversionchange = () => { try { db.close(); } catch (e) {} dbAperto = null; };
db.onclose = () => { dbAperto = null; };
ok(db);
};
req.onerror = () => { clearTimeout(attesa); ko(req.error || new Error('archivio delle foto non disponibile')); };
req.onblocked = () => { clearTimeout(attesa); ko(new Error('archivio delle foto occupato')); };
});
dbAperto.catch(() => { dbAperto = null; });
return dbAperto;
}
function operazione(modo, fn) {
return apriDb().then(db => new Promise((ok, ko) => {
let t;
try { t = db.transaction(DB_FOTO, modo); }
catch (e) { dbAperto = null; ko(e); return; }
let esito;
try { esito = fn(t.objectStore(DB_FOTO)); } catch (e) { ko(e); return; }
t.oncomplete = () => ok(esito);
t.onerror = () => ko(t.error || new Error('archivio delle foto: errore'));
t.onabort = () => ko(t.error || new Error('archivio delle foto: scrittura annullata'));
}));
}
function fotoLeggi(ids) {
return operazione('readonly', st => {
const richieste = ids.map(id => ({ id, r: st.get(id) }));
return { get mappa() { const m = new Map(); richieste.forEach(x => { if (typeof x.r.result === 'string') m.set(x.id, x.r.result); }); return m; } };
}).then(x => x.mappa);
}
function fotoScrivi(foto) { return operazione('readwrite', st => { foto.forEach(p => st.put(p.src, p.id)); }); }
function fotoPulisci(usate) {
return operazione('readwrite', st => {
const r = st.openKeyCursor ? st.openKeyCursor() : st.openCursor();
r.onsuccess = () => {
const c = r.result; if (!c) return;
if (!usate().has(c.key)) st.delete(c.key);
c.continue();
};
});
}
const F = {
aggiungiFoto(src, descr, guida) { this.model.photos.push({ id: nuovoId(), src, descr: descr || '', guida: guida || undefined }); this.save(); if (this.renderList && this.scr && !this.scr.hidden) this.renderList(); },
aggiungiDocumento(src, descr, guida) { const m = this.model; (m.documenti = m.documenti || []).push({ id: nuovoId(), src, descr: descr || '', guida: guida || undefined, ora: new Date().toISOString() }); this.save(); },
documenti(guida) { const l = this.model.documenti || []; return guida ? l.filter(p => p.guida === guida) : l; },
togliDocumento(id) { const m = this.model; m.documenti = (m.documenti || []).filter(p => p.id !== id); this.save(); },
tutteLeFoto,
riduci(file, maxPx, quality, cb) { downscale(file, maxPx, quality, cb); },
get model() { return RS.scene.fascicolo || (RS.scene.fascicolo = blank()); },
set model(v) { RS.scene.fascicolo = v; },
init() {
this.scr = el('fascicolo');
this.fPhotos = document.createElement('input');
this.fPhotos.type = 'file'; this.fPhotos.accept = 'image/*'; this.fPhotos.multiple = true; this.fPhotos.hidden = true;
this.fPhotos.addEventListener('change', e => { this.addPhotos(e.target.files); e.target.value = ''; });
document.body.appendChild(this.fPhotos);
},
_inArchivio: new Set(),
_coda: Promise.resolve(),
vuoto() { return blank(); },
daDocumento(f) {
const m = Object.assign(blank(), f || {});
const norm = l => (Array.isArray(l) ? l : []).filter(Boolean).map(p => Object.assign({ descr: '' }, p, { id: p.id || nuovoId() }));
m.photos = norm(m.photos); m.documenti = norm(m.documenti);
const doc = m.photos.filter(p => /^doc:/.test(p.guida || ''));
if (doc.length) { m.photos = m.photos.filter(p => doc.indexOf(p) < 0); m.documenti = m.documenti.concat(doc); }
this._inArchivio = new Set();
if (tutteLeFoto(m).some(p => p.src)) setTimeout(() => this._conservaPoiSegnala(), 0);
return m;
},
perSalvare() {
const m = this.model;
const rif = p => {
const o = (this._inArchivio.has(p.id) || !p.src) ? { id: p.id, descr: p.descr || '' } : { id: p.id, descr: p.descr || '', src: p.src };
if (p.guida) o.guida = p.guida;
if (p.ora) o.ora = p.ora;
return o;
};
const r = Object.assign({}, m, { photos: (m.photos || []).map(rif) });
if (m.documenti && m.documenti.length) r.documenti = m.documenti.map(rif); else delete r.documenti;
return r;
},
vuotoDiFatto(m) {
m = m || this.model;
return !(m.photos && m.photos.length) && !(m.documenti && m.documenti.length) && !m.oggetto && !m.descrizione && !m.dettaglio && !m.redattore;
},
fotoComplete(ids) {
const mappa = new Map();
tutteLeFoto(this.model).forEach(p => { if (p.src && ids.indexOf(p.id) >= 0) mappa.set(p.id, p.src); });
let resto = ids.filter(id => !mappa.has(id));
if (!resto.length) return Promise.resolve(mappa);
return fotoLeggi(resto).catch(() => new Map()).then(daDisp => {
daDisp.forEach((v, k) => { mappa.set(k, v); this._inArchivio.add(k); });
resto = resto.filter(id => !mappa.has(id));
if (!resto.length || !RS.storage || !RS.storage.useServer()) return mappa;
return resto.reduce((pr, id) => pr.then(() => RS.storage.scaricaFoto(id).then(src => { if (src) mappa.set(id, src); })), Promise.resolve())
.then(() => {
const scaricate = resto.filter(id => mappa.has(id)).map(id => ({ id, src: mappa.get(id) }));
if (!scaricate.length) return mappa;
return fotoScrivi(scaricate).then(() => scaricate.forEach(p => this._inArchivio.add(p.id))).catch(() => {}).then(() => mappa);
});
});
},
load() {
const m = this.model;
const tutte = tutteLeFoto(m), manca = tutte.filter(p => !p.src).map(p => p.id);
const lettura = manca.length
? this.fotoComplete(manca).then(mappa => { tutte.forEach(p => { if (!p.src && mappa.has(p.id)) p.src = mappa.get(p.id); }); })
: Promise.resolve();
return lettura.then(() => { this._fotoNonLette = m.photos.filter(p => !p.src).length; });
},
save() { return this._conservaPoiSegnala(); },
_conservaPoiSegnala() {
this._coda = this._coda.then(() => this._conserva()).catch(() => {})
.then(() => { if (RS.scene && RS.scene.emit) RS.scene.emit('change'); });
return this._coda;
},
_conserva() {
const tutte = tutteLeFoto(this.model);
const fotoUsate = () => (RS.storage && RS.storage.idFotoUsate) ? RS.storage.idFotoUsate() : new Set(tutte.map(p => p.id));
const pulisci = () => fotoPulisci(fotoUsate).catch(() => {});
const presenti = new Set(tutte.map(p => p.id));
this._inArchivio.forEach(id => { if (!presenti.has(id)) this._inArchivio.delete(id); });
const nuove = tutte.filter(p => p.src && !this._inArchivio.has(p.id));
if (!nuove.length) return pulisci();
return fotoScrivi(nuove)
.then(() => { nuove.forEach(p => this._inArchivio.add(p.id)); return pulisci(); })
.catch(e => { this._erroreArchivio = e; });
},
_autosave() { clearTimeout(this._t); this._t = setTimeout(() => this.save(), 800); },
_proponiVecchio() {
let vecchio = null;
try { const s = localStorage.getItem(KEY); vecchio = s ? JSON.parse(s) : null; } catch (e) {}
if (!vecchio || this.vuotoDiFatto(Object.assign(blank(), vecchio)) || !this.vuotoDiFatto()) return Promise.resolve();
const n = (vecchio.photos || []).length;
const ok = confirm('C\'è un fascicolo fotografico creato prima dell\'aggiornamento' +
(vecchio.oggetto ? ' («' + vecchio.oggetto + '»)' : '') + ', con ' + n + ' foto.\n\n' +
'Ora ogni tavola ha il suo fascicolo. Vuoi collegarlo a questa tavola?\n\n' +
'OK = collegalo qui    Annulla = lascialo da parte (te lo richiederò)');
if (!ok) return Promise.resolve();
RS.scene.fascicolo = this.daDocumento(vecchio);
return this.load().then(() => this.save()).then(() => {
if (RS.storage.autosaveNow()) { try { localStorage.removeItem(KEY); } catch (e) {} }
});
},
open(from) {
this._from = (from === 'editor') ? 'editor' : 'menu';
try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {}); } catch (e) {}
return this._proponiVecchio().then(() => this.load()).then(() => {
if (!this.model.comando) {
const m = (RS.scene && RS.scene.meta) || {};
this.model.comando = [m.comando, m.comando2, m.stazione].filter(Boolean).join('\n');
}
if (!this.model.data) this.model.data = new Date().toISOString().slice(0, 10);
if (QUALIFICHE.indexOf(this.model.qualifica) < 0) this.model.qualifica = 'IL COMANDANTE';
this.build();
this.scr.hidden = false;
requestAnimationFrame(() => this.scr.classList.add('show'));
if (this._fotoNonLette) {
const n = this._fotoNonLette;
setTimeout(() => alert((n === 1 ? '1 foto del fascicolo non è stata trovata' : n + ' foto del fascicolo non sono state trovate') +
' né su questo dispositivo né nell\'archivio condiviso.\n\nChiudi e riapri il fascicolo. Se il riquadro resta vuoto, reinserisci la foto dall\'originale.'), 400);
}
});
},
close() {
this.save();
this.scr.classList.remove('show');
setTimeout(() => { this.scr.hidden = true; }, 250);
},
build() {
const m = this.model;
const presetSel = (forK, list) =>
`<select class="fsc-preset" data-preset="${forK}" title="Aggiungi una voce predefinita al testo (poi modificabile)">
           <option value="">➕ Inserisci voce predefinita…</option>
           ${list.map(o => `<option>${esc(o)}</option>`).join('')}
         </select>`;
this.scr.innerHTML =
`<div class="fsc-bar">
           <button class="fsc-b ghost" data-fsc="back">${this._from === 'editor' ? '‹ Torna al disegno' : '‹ Menu'}</button>
           <span class="fsc-title">📷 Fascicolo fotografico</span>
           <span class="fsc-sp"></span>
           <button class="fsc-b" data-fsc="word">📄 Word</button>
           <button class="fsc-b primary" data-fsc="gen">🖨 Genera PDF</button>
         </div>
         <div class="fsc-scroll">
          <div class="fsc-page">

           <div class="fsc-card">
             <div class="fsc-h">Copertina (frontespizio)</div>
             <label class="fsc-f"><span>Intestazione — Comando</span>
               <textarea data-k="comando" rows="4" placeholder="LEGIONE CARABINIERI ...&#10;Comando Provinciale di ...&#10;Compagnia di ...&#10;Stazione di ...">${esc(m.comando)}</textarea></label>
             <label class="fsc-f"><span>Oggetto</span>
               <input data-k="oggetto" value="${esc(m.oggetto)}" placeholder="Rilievo fotografico del sinistro stradale ..."></label>
             <label class="fsc-f"><span>Descrizione contenuto</span>
               <textarea data-k="descrizione" rows="3" placeholder="Breve descrizione del contenuto del fascicolo...">${esc(m.descrizione)}</textarea>
               ${presetSel('descrizione', PRESET_DESCR)}</label>
             <label class="fsc-f"><span>Dettaglio fotografie</span>
               <textarea data-k="dettaglio" rows="2" placeholder="Come sono organizzate le fotografie del fascicolo...">${esc(m.dettaglio)}</textarea>
               ${presetSel('dettaglio', PRESET_DETT)}</label>
             <div class="fsc-row">
               <label class="fsc-f"><span>Autore</span>
                 <input data-k="redattore" value="${esc(m.redattore)}" placeholder="Grado, Cognome Nome"></label>
               <label class="fsc-f"><span>Luogo di compilazione</span>
                 <input data-k="luogo" value="${esc(m.luogo)}" placeholder="Comune (Prov.)"></label>
               <label class="fsc-f sm"><span>Data</span>
                 <input type="date" data-k="data" value="${esc(m.data)}"></label>
             </div>
             <div class="fsc-row">
               <label class="fsc-f"><span>Qualifica</span>
                 <select data-k="qualifica">
                   ${QUALIFICHE.map(q => `<option${m.qualifica === q ? ' selected' : ''}>${q}</option>`).join('')}
                 </select></label>
               <label class="fsc-f"><span>Nome e Cognome</span>
                 <input data-k="firmatario" value="${esc(m.firmatario)}" placeholder="Nome Cognome"></label>
             </div>
             <label class="fsc-f sm"><span>Foto per pagina</span>
               <select data-k="perPage">
                 <option value="2"${m.perPage != 1 ? ' selected' : ''}>2 per pagina</option>
                 <option value="1"${m.perPage == 1 ? ' selected' : ''}>1 per pagina</option>
               </select></label>
           </div>

           <div class="fsc-card">
             <div class="fsc-h">Foto <span class="fsc-count" id="fscCount"></span>
               <button class="fsc-b primary sm" data-fsc="add" style="float:right">➕ Aggiungi foto</button>
               <button class="fsc-b primary sm" data-fsc="guidate" style="float:right;margin-right:6px">📷 Foto guidate</button></div>
             <div class="fsc-hint">Trascina per riordinare, oppure usa le frecce. Scrivi la descrizione sotto ogni foto.</div>
             <div id="fscList" class="fsc-list"></div>
           </div>

          </div>
         </div>`;
this.scr.querySelectorAll('[data-fsc]').forEach(b => b.onclick = () => this.act(b.dataset.fsc));
this.scr.querySelectorAll('[data-k]').forEach(inp => {
const upd = () => { this.model[inp.dataset.k] = inp.value; this._autosave(); };
inp.addEventListener('input', upd); inp.addEventListener('change', upd);
});
this.scr.querySelectorAll('.fsc-preset').forEach(sel => {
sel.addEventListener('change', () => {
const k = sel.dataset.preset, val = sel.value;
if (val) {
const ta = this.scr.querySelector('textarea[data-k="' + k + '"]');
if (ta) {
const cur = (ta.value || '').replace(/\s+$/, '');
ta.value = cur ? (cur + '\n' + val) : val;
this.model[k] = ta.value; this._autosave();
ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length);
}
}
sel.value = '';
});
});
this.renderList();
},
act(a) {
if (a === 'back' || a === 'menu') {
if (this._from !== 'editor' && RS.home) RS.home.showMenu(true);
this.close();
return;
}
if (a === 'add') { this.fPhotos.click(); return; }
if (a === 'guidate') { RS.fotoGuidate.apri(); return; }
if (a === 'gen') { this.generate(); return; }
if (a === 'word') { this.exportWord(); return; }
},
renderList() {
const list = el('fscList'); if (!list) return;
const ph = this.model.photos;
el('fscCount').textContent = ph.length ? '· ' + ph.length : '';
if (!ph.length) { list.innerHTML = '<div class="fsc-empty">Nessuna foto. Premi “➕ Aggiungi foto”.</div>'; return; }
list.innerHTML = ph.map((p, i) =>
`<div class="fsc-item" draggable="true" data-i="${i}">
           <div class="fsc-drag" title="Trascina per spostare">⋮⋮</div>
           <div class="fsc-num">${i + 1}</div>
           <div class="fsc-thumb">${p.src ? `<img src="${p.src}">` : '—'}</div>
           <div class="fsc-cap">
             <textarea data-cap="${i}" rows="3" placeholder="Descrizione della foto ${i + 1}…">${esc(p.descr)}</textarea>
           </div>
           <div class="fsc-ord">
             <button class="fsc-mini" data-mv="up" data-i="${i}" ${i === 0 ? 'disabled' : ''} title="Sposta su">▲</button>
             <button class="fsc-mini" data-mv="down" data-i="${i}" ${i === ph.length - 1 ? 'disabled' : ''} title="Sposta giù">▼</button>
             <button class="fsc-mini del" data-del="${i}" title="Elimina">✕</button>
           </div>
         </div>`).join('');
list.querySelectorAll('[data-cap]').forEach(t =>
t.addEventListener('input', () => { this.model.photos[+t.dataset.cap].descr = t.value; this._autosave(); }));
list.querySelectorAll('[data-mv]').forEach(b =>
b.onclick = () => this.move(+b.dataset.i, b.dataset.mv === 'up' ? -1 : 1));
list.querySelectorAll('[data-del]').forEach(b =>
b.onclick = () => { if (confirm('Eliminare questa foto dal fascicolo?')) { this.model.photos.splice(+b.dataset.del, 1); this.save(); this.renderList(); } });
list.querySelectorAll('.fsc-item').forEach(it => {
it.addEventListener('dragstart', e => { this._drag = +it.dataset.i; it.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; });
it.addEventListener('dragend', () => { it.classList.remove('dragging'); list.querySelectorAll('.over').forEach(n => n.classList.remove('over')); });
it.addEventListener('dragover', e => { e.preventDefault(); it.classList.add('over'); });
it.addEventListener('dragleave', () => it.classList.remove('over'));
it.addEventListener('drop', e => {
e.preventDefault(); it.classList.remove('over');
const from = this._drag, to = +it.dataset.i;
if (from == null || from === to) return;
const arr = this.model.photos; const [x] = arr.splice(from, 1); arr.splice(to, 0, x);
this._drag = null; this.save(); this.renderList();
});
});
},
move(i, dir) {
const j = i + dir, arr = this.model.photos;
if (j < 0 || j >= arr.length) return;
const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
this.save(); this.renderList();
},
addPhotos(files) {
const arr = Array.from(files || []);
let done = 0;
arr.forEach(f => downscale(f, 1400, 0.82, src => {
this.model.photos.push({ id: nuovoId(), src, descr: '' });
if (++done === arr.length) { this.save(); this.renderList(); }
}));
},
generate() {
const win = window.open('', '_blank');
if (!win) { alert('Consenti i popup per generare il fascicolo.'); return; }
win.document.write(this._html('print'));
win.document.close();
},
exportWord() {
const blob = new Blob(['﻿' + this._html('word')], { type: 'application/msword' });
const name = 'fascicolo-fotografico' + (this.model.oggetto ? '-' + this.model.oggetto.slice(0, 24).replace(/[^\w-]+/g, '_') : '') + '.doc';
if (RS.exportUtil && RS.exportUtil.download) RS.exportUtil.download(blob, name);
else { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); }
},
_html(mode) {
if (mode === 'word') return this._wordHtml();
const p = this._parti();
return `<!DOCTYPE html><html lang="it"><head><meta charset="utf-8"><title>Fascicolo fotografico</title>
        <style>@page{size:A4 portrait;margin:16mm}${p.style}
          .noprint{text-align:center;padding:10px}button{padding:8px 16px;cursor:pointer;font:inherit}
          @media print{.noprint{display:none}}</style></head><body>
        <div class="noprint"><button onclick="try{opener.RilsinAndroid.stampa()}catch(e){window.print()}">🖨 Stampa / Salva PDF</button></div>
        ${p.cover}${p.pages}</body></html>`;
},
_parti(opz) {
const numeri = !(opz && opz.numeri === false);
const m = this.model;
const emblema = RS.emblema || (typeof location !== 'undefined' ? new URL('emblema.png', location.href).href : 'emblema.png');
const dataFmt = m.data ? new Date(m.data + 'T00:00:00').toLocaleDateString('it-IT') : '';
const per = Number(m.perPage) === 1 ? 1 : 2;
const groups = [];
for (let i = 0; i < m.photos.length; i += per) groups.push(m.photos.slice(i, i + per));
const totPag = 1 + groups.length;
const cover =
`<section class="cover">
           <div class="lettera">
             <img src="${emblema}" alt="" onerror="this.style.display='none';var t=this.nextElementSibling;if(t)t.style.display='block'">
             <div class="emblfall" style="display:none">REPUBBLICA ITALIANA</div>
             <div class="intest">${esc(m.comando)}</div>
             <hr class="hr">
           </div>
           <h1 class="tit">Fascicolo fotografico</h1>
           <table class="voci">
             <tr><td class="lab">OGGETTO:</td><td class="val">${esc(m.oggetto)}</td></tr>
             <tr><td class="lab">Descrizione contenuto:</td><td class="val">${esc(m.descrizione)}</td></tr>
             <tr><td class="lab">Dettaglio fotografie:</td><td class="val">${m.dettaglio ? esc(m.dettaglio) : 'Vedere didascalia'}</td></tr>
             <tr><td class="lab">Autore:</td><td class="val">${esc(m.redattore)}</td></tr>
             <tr><td class="lab">Luogo di compilazione:</td><td class="val">${esc(m.luogo)}</td></tr>
             <tr><td class="lab">Data:</td><td class="val">${esc(dataFmt)}</td></tr>
           </table>
           <div class="chiusura">
             <p class="ruolo">${esc(m.qualifica || 'IL COMANDANTE')}</p>
             ${m.firmatario ? `<p class="nome">${esc(m.firmatario)}</p>` : ''}
           </div>
         </section>`;
const pages = groups.map((grp, gi) => {
const items = grp.map((p, k) => {
const n = gi * per + k + 1;
return `<div class="fitem ${per === 1 ? 'one' : 'two'}">
               <div class="frame"><span class="num">${n}</span>${p.src ? `<img src="${p.src}">` : '<span class="noimg">— senza immagine —</span>'}</div>
               <div class="cap"><b>Foto ${n}</b>${p.descr ? ' — ' + esc(p.descr) : ''}</div>
             </div>`;
}).join('');
return `<section class="fpage">
             <div class="fhead"><span>FASCICOLO FOTOGRAFICO${m.oggetto ? ' — ' + esc(m.oggetto) : ''}</span><span>${numeri ? `Pag. ${gi + 2} di ${totPag}` : `Foto ${gi * per + 1}${grp.length > 1 ? '–' + (gi * per + grp.length) : ''} di ${m.photos.length}`}</span></div>
             <div class="fbody">${items}</div>
           </section>`;
}).join('');
const style =
`*{box-sizing:border-box}
         body{font:12.5px/1.55 "Times New Roman",Georgia,serif;color:#111;margin:0}
         .cover{min-height:262mm;display:flex;flex-direction:column}
         .lettera{text-align:center}
         .lettera img{height:64px;width:auto;margin-bottom:6px}
         .emblfall{font-weight:bold;letter-spacing:2px;font-size:15px;margin-bottom:6px}
         .intest{font-weight:bold;line-height:1.55;white-space:pre-line;font-size:13.5px}
         .hr{border:none;border-top:1.5px solid #111;margin:10px 0 0}
         .tit{text-align:center;font-size:19px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;margin:26mm 0 20mm}
         .voci{width:155mm;margin:0 auto;border-collapse:collapse}
         .voci td{padding:0 0 9mm;vertical-align:top;font-size:13px;line-height:1.55}
         .voci .lab{width:50mm;font-weight:bold;padding-right:6mm;white-space:nowrap}
         .voci .val{white-space:pre-line;text-align:justify}
         .chiusura{margin-top:auto;padding-top:16mm;text-align:center;font-size:13px}
         .chiusura .ruolo{font-weight:bold;margin:0 0 2mm}
         .chiusura .nome{margin:0}
         .fpage{page-break-before:always}
         .fhead{display:flex;justify-content:space-between;font-size:10px;color:#444;border-bottom:1px solid #999;padding-bottom:4px;margin-bottom:7mm}
         .fitem{page-break-inside:avoid;margin-bottom:9mm}
         .fitem .frame{position:relative;border:1px solid #333;background:#f4f4f4;text-align:center}
         .fitem.one .frame{height:206mm;line-height:206mm}
         .fitem.two .frame{height:108mm;line-height:108mm}
         .fitem .frame img{max-width:100%;max-height:100%;vertical-align:middle}
         .fitem .num{position:absolute;top:6px;left:6px;background:#1466b8;color:#fff;font-weight:bold;border-radius:50%;width:24px;height:24px;line-height:24px;font-size:13px;z-index:2}
         .fitem .cap{font-size:12px;margin-top:3mm;text-align:justify;line-height:1.45}
         .noimg{color:#888;line-height:normal}`;
return { cover, pages, style, foto: m.photos.length };
},
_wordHtml() {
const m = this.model;
const embl = RS.emblema || (typeof location !== 'undefined' ? new URL('emblema.png', location.href).href : 'emblema.png');
const dataFmt = m.data ? new Date(m.data + 'T00:00:00').toLocaleDateString('it-IT') : '';
const per = Number(m.perPage) === 1 ? 1 : 2;
const groups = [];
for (let i = 0; i < m.photos.length; i += per) groups.push(m.photos.slice(i, i + per));
const totPag = 1 + groups.length;
const nl = s => esc(s).replace(/\n/g, '<br>');
const voci = [
['OGGETTO:', nl(m.oggetto)],
['Descrizione contenuto:', nl(m.descrizione)],
['Dettaglio fotografie:', m.dettaglio ? nl(m.dettaglio) : 'Vedere didascalia'],
['Autore:', nl(m.redattore)],
['Luogo di compilazione:', nl(m.luogo)],
['Data:', esc(dataFmt)]
];
const vociRows = voci.map(v => `<tr>
          <td style="width:52mm;font-weight:bold;vertical-align:top;padding:0 6mm 8mm 0;font-size:13px">${v[0]}</td>
          <td style="vertical-align:top;padding:0 0 8mm 0;font-size:13px;text-align:justify">${v[1]}</td></tr>`).join('');
const cover = `
        <div style="text-align:center">
          <img src="${embl}" width="66" height="61" style="width:66px;height:61px"/><br>
          <span style="font-weight:bold;font-size:13.5px;line-height:1.5">${nl(m.comando)}</span>
          <div style="border-bottom:1.5px solid #111;margin:9px 0 0"></div>
        </div>
        <h1 style="text-align:center;font-size:19px;font-weight:bold;letter-spacing:1px;margin:22mm 0 16mm 0">FASCICOLO FOTOGRAFICO</h1>
        <table style="width:155mm;margin:0 auto;border-collapse:collapse">${vociRows}</table>
        <div style="text-align:center;margin-top:24mm;font-size:13px">
          <div style="font-weight:bold">${esc(m.qualifica || 'IL COMANDANTE')}</div>
          ${m.firmatario ? `<div style="margin-top:2mm">${esc(m.firmatario)}</div>` : ''}
        </div>`;
const imgW = per === 1 ? 640 : 560;
const pagesHtml = groups.map((grp, gi) => {
const items = grp.map((p, k) => {
const n = gi * per + k + 1;
const img = p.src
? `<img src="${p.src}" width="${imgW}" style="width:${imgW}px;height:auto"/>`
: '<span style="color:#888;font-style:italic">— senza immagine —</span>';
return `<table style="width:100%;border-collapse:collapse;page-break-inside:avoid;margin-bottom:8mm">
              <tr><td style="text-align:center;border:1px solid #333;padding:6px">${img}</td></tr>
              <tr><td style="font-size:12px;padding-top:3px;text-align:justify"><b>Foto ${n}</b>${p.descr ? ' — ' + esc(p.descr) : ''}</td></tr>
            </table>`;
}).join('');
return `<div style="page-break-before:always">&nbsp;</div>
          <table style="width:100%;border-collapse:collapse;margin-bottom:6mm">
            <tr><td style="font-size:10px;color:#444;border-bottom:1px solid #999;padding-bottom:4px">FASCICOLO FOTOGRAFICO${m.oggetto ? ' — ' + esc(m.oggetto) : ''}</td>
                <td style="font-size:10px;color:#444;border-bottom:1px solid #999;padding-bottom:4px;text-align:right;white-space:nowrap">Pag. ${gi + 2} di ${totPag}</td></tr>
          </table>${items}`;
}).join('');
const mso = '<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->';
return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>Fascicolo fotografico</title>${mso}
        <style>@page WordSection1{size:210mm 297mm;margin:16mm}div.WordSection1{page:WordSection1}
          body{font:12.5px/1.55 "Times New Roman",Georgia,serif;color:#111}
          table{border-collapse:collapse}</style></head>
        <body><div class="WordSection1">${cover}${pagesHtml}</div></body></html>`;
}
};
function downscale(file, maxPx, quality, cb) {
const r = new FileReader();
r.onload = () => {
const img = new Image();
img.onload = () => {
let { width: w, height: h } = img;
const sc = Math.min(1, maxPx / Math.max(w, h));
w = Math.round(w * sc); h = Math.round(h * sc);
const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
cv.getContext('2d').drawImage(img, 0, 0, w, h);
cb(cv.toDataURL('image/jpeg', quality));
};
img.onerror = () => cb('');
img.src = r.result;
};
r.readAsDataURL(file);
}
const rad = g => g * Math.PI / 180;
const verso = (p, g, d) => ({ x: p.x + Math.cos(rad(g)) * d, y: p.y + Math.sin(rad(g)) * d });
const gradi = (a, b) => Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
const NON_TOCCARE = 'Prima della foto non toccare nulla.';
function capiStrada(e) {
if (e.type === 'road') { const a = verso(e, e.rot || 0, -e.len / 2), b = verso(e, e.rot || 0, e.len / 2); return [a, b]; }
return e.pts && e.pts.length > 1 ? [e.pts[0], e.pts[e.pts.length - 1]] : [];
}
function distSegmenti(q, P) {
let m = 1e9;
for (let i = 1; i < P.length; i++) {
const a = P[i - 1], b = P[i], dx = b.x - a.x, dy = b.y - a.y, t = Math.max(0, Math.min(1, ((q.x - a.x) * dx + (q.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
m = Math.min(m, Math.hypot(q.x - a.x - dx * t, q.y - a.y - dy * t));
}
return m;
}
function centroScena(E) {
const P = []; E.forEach(e => { if (e.x != null) P.push(e); (e.pts || []).forEach(q => P.push(q)); });
if (!P.length) return { x: 0, y: 0 };
const xs = P.map(q => q.x), ys = P.map(q => q.y);
return { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 };
}
function arrivi(E, c) {
const out = [], assi = E.filter(e => (e.type === 'road' || e.type === 'roadway') && !e.inc);
assi.forEach(e => capiStrada(e).forEach(q => {
const suAltra = assi.some(o => o !== e && distSegmenti(q, (() => { const k = capiStrada(o); return o.pts || k; })()) < 5);
if (!suAltra) out.push({ p: q, nome: e.nomeVia || '' });
}));
E.filter(e => (e.type === 'incrocio' || e.type === 'roundabout') && Array.isArray(e.bracci)).forEach(e => {
const base = e.type === 'roundabout' ? (e.size || 26) / 2 : 0;
e.bracci.forEach(b => out.push({ p: verso(e, (e.type === 'roundabout' ? 0 : (e.rot || 0)) + (+b.ang || 0), base + (+b.len || 16)), nome: b.nome || '' }));
});
return out.filter((a, i) => !out.slice(0, i).some(b => Math.hypot(a.p.x - b.p.x, a.p.y - b.p.y) < 6)).slice(0, 6).map(a => {
const dx = a.p.x - c.x, dy = a.p.y - c.y;
return Object.assign(a, { lato: Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'sinistro' : 'destro') : (dy < 0 ? 'in alto' : 'in basso') });
});
}
function passiFoto(E) {
E = E || RS.scene.elements;
const P = [], c = centroScena(E), passo = (k, g, t, come, d, cam, fuoco) => P.push({ k, g, t, c: come, d, cam, fuoco });
const ver = E.filter(e => e.type === 'vehicle' && e.label && (!e.fase || e.fase === 'quiete'));
const skid = E.filter(e => e.type === 'skid' && e.pts && e.pts.length > 1);
const sim = e => e.type === 'symbol' && !e.inc;
const G1 = 'Vedute d\'insieme', ar = arrivi(E, c);
if (ar.length) ar.forEach((a, i) => {
passo('ins' + i, G1, (a.nome ? 'Arrivando da ' + a.nome + ', lato ' : 'Dal lato ') + a.lato + ' del disegno', 'Da lontano, a filo strada, con tutta la scena al centro. Includi un riferimento che non si sposta.',
'Veduta d\'insieme ' + (a.nome ? 'da ' + a.nome + ', lato ' : 'dal lato ') + a.lato + ' della planimetria.', { x: a.p.x, y: a.p.y, a: gradi(a.p, c) });
});
else [['nord', 'in alto', -90], ['est', 'destro', 0], ['sud', 'in basso', 90], ['ovest', 'sinistro', 180]].forEach((l, i) => {
const q = verso(c, l[2], 25);
passo('ins' + i, G1, 'La scena dal lato ' + l[1], 'Da lontano, con tutta la scena al centro. Includi un riferimento che non si sposta.', 'Veduta d\'insieme della scena.', { x: q.x, y: q.y, a: l[2] + 180 });
});
const G2 = 'Luogo';
passo('seg', G2, 'Segnaletica', 'Cartelli, semafori e strisce, così come li vede chi arriva.', 'Segnaletica verticale e orizzontale presente sul luogo.');
passo('fondo', G2, 'Fondo stradale e visibilità', 'Stato dell\'asfalto (asciutto, bagnato, buche) e condizioni di luce.', 'Stato del fondo stradale e condizioni di visibilità.');
E.filter(e => e.letter).forEach(q => passo('cap' + q.letter, G2, 'Punto fisso ' + q.letter, 'Il punto con ciò che lo circonda, così si può ritrovare anche dopo.', 'Punto fisso ' + q.letter + ' usato per le misure.', { x: q.x + 4, y: q.y + 4, a: -135 }, q.id));
ver.forEach(v => {
const tr = skid.find(s => Math.hypot(s.pts[0].x - v.x, s.pts[0].y - v.y) < 6 || Math.hypot(s.pts[s.pts.length - 1].x - v.x, s.pts[s.pts.length - 1].y - v.y) < 6);
const lontano = tr ? (Math.hypot(tr.pts[0].x - v.x, tr.pts[0].y - v.y) < 6 ? tr.pts[tr.pts.length - 1] : tr.pts[0]) : verso(v, v.rot || 0, -18);
passo('vis' + v.label, 'Visuale dei conducenti', 'Che cosa vedeva chi guidava il veicolo ' + v.label,
'Nel suo senso di marcia, all\'altezza degli occhi di chi guida' + (tr ? ', da dove inizia la frenata.' : '.'),
'Visuale nel senso di marcia del veicolo ' + v.label + '.', { x: lontano.x, y: lontano.y, a: gradi(lontano, v) }, v.id);
});
const G4 = 'Tracce e urto';
if (ver.length > 1) { const q = verso(c, -45, 14); passo('rec', G4, 'I veicoli fra loro', 'Da una distanza media, con tutti i mezzi nella stessa inquadratura.', 'Posizione reciproca dei veicoli.', { x: q.x, y: q.y, a: 135 }); }
skid.forEach((s, i) => {
const n = i + 1, a = s.pts[0], b = s.pts[s.pts.length - 1], g = gradi(a, b), m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, l = verso(m, g + 90, 5);
passo('fr' + n + 'a', G4, 'Traccia ' + n + ': lungo la traccia', 'Dall\'inizio verso la fine, per mostrare la direzione.', 'Traccia ' + n + ' sul fondo stradale, vista nella sua direzione.', { x: a.x, y: a.y, a: g }, s.id);
passo('fr' + n + 'b', G4, 'Traccia ' + n + ': di fianco, con il metro', 'Di lato, prima senza e poi con il metro, con l\'inizio e la fine segnati a terra.', 'Traccia ' + n + ', vista laterale con riferimento metrico.', { x: l.x, y: l.y, a: g - 90 }, s.id);
});
E.filter(e => sim(e) && e.sym === 'impact').forEach((u, i) => passo('urto' + i, G4, 'Punto d\'urto', 'Da vicino, poi un po\' più largo. Riprendi i detriti, il terriccio o i liquidi che lo indicano.',
'Punto d\'urto, individuato da detriti e tracce sul fondo stradale.', { x: u.x + 4, y: u.y + 4, a: -135 }, u.id));
passo('detr', G4, 'Detriti e parti staccate', 'Prima dove si trovano rispetto ai veicoli, poi da vicino con il metro.', 'Detriti e parti staccate sul fondo stradale.');
const G5 = 'Persone', corpi = E.filter(e => sim(e) && (e.sym === 'cadavere' || e.sym === 'persona'));
const CAUTELA = 'Solo quanto serve agli atti: prima la posizione rispetto a strada e veicoli, poi la sagoma. ' + NON_TOCCARE + ' Copri il corpo appena possibile.';
corpi.forEach((u, i) => passo('corpo' + i, G5, u.sym === 'cadavere' ? 'Cadavere: posizione' : (u.nome || 'Persona a terra') + ': posizione', CAUTELA,
(u.sym === 'cadavere' ? 'Posizione del cadavere' : 'Posizione della persona a terra') + ' sulla sede stradale.', { x: u.x + 5, y: u.y + 5, a: -135 }, u.id));
if (!E.some(e => sim(e) && e.sym === 'cadavere')) passo('corpo', G5, 'Solo se c\'è una persona deceduta', 'Se non c\'è, salta questa foto. ' + CAUTELA, 'Posizione del cadavere sulla sede stradale.');
(ver.length ? ver : [{ label: '', kind: 'car', x: c.x, y: c.y, rot: 0, len: 4.3, wid: 1.8 }]).forEach(v => {
const L = v.label, nome = L ? 'Veicolo ' + L : 'Veicolo', G = nome, g = v.rot || 0, k = v.kind;
const dueRuote = k === 'moto' || k === 'bike' || k === 'monopattino', motore = k !== 'bike' && k !== 'monopattino';
const cam = (ang, d) => { const q = verso(v, g + ang, d); return { x: q.x, y: q.y, a: g + ang + 180 }; };
const f = (id, t, come, d, ca) => passo('v' + L + id, G, nome + ': ' + t, come, nome + ', ' + d + '.', ca, v.id);
f('pos', 'posizione di quiete', 'Da abbastanza lontano da vedere il mezzo e un riferimento fisso insieme.', 'posizione di quiete', cam(135, v.len / 2 + 7));
f('dav', 'davanti', 'Tieni la macchina parallela al lato.', 'parte anteriore', cam(0, v.len / 2 + 4));
f('die', 'dietro', 'Tieni la macchina parallela al lato.', 'parte posteriore', cam(180, v.len / 2 + 4));
f('sin', 'lato sinistro', 'Tutto il fianco, parallelo al lato.', 'lato sinistro', cam(-90, v.wid / 2 + 5));
f('des', 'lato destro', 'Tutto il fianco, parallelo al lato.', 'lato destro', cam(90, v.wid / 2 + 5));
if (k !== 'bike' && k !== 'monopattino') f('tar', 'targa', 'Da vicino, leggibile, senza riflessi.', 'targa', cam(180, v.len / 2 + 2));
f('dan', 'danni', 'Prima una foto che faccia capire dove sono, poi il dettaglio.', 'danni riportati', cam(45, v.len / 2 + 3));
f('dam', 'danni con il metro', 'Il dettaglio con il metro accanto.', 'danni con riferimento metrico', cam(45, v.len / 2 + 2));
if (!dueRuote) {
f('abi', 'interno', 'L\'abitacolo dalle portiere, un lato e l\'altro. ' + NON_TOCCARE, 'interno dell\'abitacolo');
f('km', 'chilometri', 'Il contachilometri, leggibile. Se il quadro è spento, scrivilo nella didascalia.', 'chilometri indicati dal contachilometri');
f('mar', 'marcia inserita', 'La leva del cambio o il selettore, così come sono. ' + NON_TOCCARE, 'rapporto del cambio inserito');
f('rit', 'sistemi di ritenuta', 'Cinture (allacciate, tese o no), seggiolini per bambini, airbag aperti. ' + NON_TOCCARE, 'sistemi di ritenuta e airbag');
} else {
if (motore) f('km', 'chilometri', 'Il contachilometri, leggibile. Se il quadro è spento, scrivilo nella didascalia.', 'chilometri indicati dal contachilometri');
if (motore) f('mar', 'marcia inserita', 'La leva del cambio così com\'è, se si vede. ' + NON_TOCCARE, 'rapporto del cambio inserito');
f('cas', 'casco', 'Il casco, dove si trova e com\'è ridotto, con il cinturino.', 'casco di protezione');
}
});
return P;
}
function piantina(s, E) {
const pts = [], add = (x, y) => pts.push([x, y]), SV = [];
const strade = E.filter(e => e.type === 'road' || e.type === 'roadway');
strade.forEach(e => (e.type === 'road' ? capiStrada(e) : e.pts).forEach(q => add(q.x, q.y)));
E.filter(e => e.type === 'vehicle' || e.type === 'building' || e.letter || e.type === 'roundabout').forEach(e => add(e.x, e.y));
E.filter(e => e.type === 'skid').forEach(e => (e.pts || []).forEach(q => add(q.x, q.y)));
if (s.cam) add(s.cam.x, s.cam.y);
if (!pts.length) add(0, 0);
const xs = pts.map(q => q[0]), ys = pts.map(q => q[1]), m = 7;
let x0 = Math.min(...xs) - m, x1 = Math.max(...xs) + m, y0 = Math.min(...ys) - m, y1 = Math.max(...ys) + m;
if (x1 - x0 < 30) { const t = (x0 + x1) / 2; x0 = t - 15; x1 = t + 15; }
if (y1 - y0 < 16) { const t = (y0 + y1) / 2; y0 = t - 8; y1 = t + 8; }
const fs = Math.max(x1 - x0, y1 - y0) * .045;
E.filter(e => e.type === 'roundabout').forEach(e => SV.push(`<circle cx="${e.x}" cy="${e.y}" r="${(e.size || 26) / 2}" fill="#9aa0a6"/>`));
strade.forEach(e => {
const P = e.type === 'road' ? capiStrada(e) : e.pts;
SV.push(`<path d="${P.map((q, i) => (i ? 'L' : 'M') + q.x + ' ' + q.y).join(' ')}" fill="none" stroke="#9aa0a6" stroke-width="${e.wid || e.width || 7}" stroke-linejoin="round"/>`);
});
E.filter(e => e.type === 'building').forEach(e => SV.push(`<rect x="${-e.w / 2}" y="${-e.h / 2}" width="${e.w}" height="${e.h}" fill="#cfc3a8" stroke="#7d715a" stroke-width="${fs * .08}" transform="translate(${e.x} ${e.y}) rotate(${e.rot || 0})"/>`));
E.filter(e => e.type === 'skid').forEach(e => SV.push(`<path d="${e.pts.map((q, i) => (i ? 'L' : 'M') + q.x + ' ' + q.y).join(' ')}" fill="none" stroke="${s.fuoco === e.id ? '#d0342c' : '#202020'}" stroke-width="${fs * .22}"/>`));
E.filter(e => e.type === 'vehicle' && (!e.fase || e.fase === 'quiete')).forEach(e => {
const su = s.fuoco === e.id;
SV.push(`<g transform="translate(${e.x} ${e.y}) rotate(${e.rot || 0})"><rect x="${-e.len / 2}" y="${-e.wid / 2}" width="${e.len}" height="${e.wid}" rx=".3" fill="${su ? '#d0342c' : '#2f6fed'}"/></g><text x="${e.x}" y="${e.y - e.wid / 2 - fs * .3}" font-size="${fs}" text-anchor="middle" fill="#123a8c">${esc(e.label || '')}</text>`);
});
E.filter(e => e.letter).forEach(e => { const r = fs * .42; SV.push(`<path d="M${e.x} ${e.y - r}L${e.x + r} ${e.y}L${e.x} ${e.y + r}L${e.x - r} ${e.y}Z" fill="${s.fuoco === e.id ? '#d0342c' : '#b00'}"/><text x="${e.x + r * 1.2}" y="${e.y - r * .6}" font-size="${fs}" fill="#b00">${esc(e.letter)}</text>`); });
E.filter(e => e.type === 'symbol' && (e.sym === 'impact' || e.sym === 'cadavere' || e.sym === 'persona') && !e.inc).forEach(e => { const r = fs * .4; SV.push(`<path d="M${e.x - r} ${e.y - r}L${e.x + r} ${e.y + r}M${e.x + r} ${e.y - r}L${e.x - r} ${e.y + r}" stroke="#d0342c" stroke-width="${fs * .2}"/>`); });
if (s.cam) {
const L = Math.max(x1 - x0, y1 - y0) * .2, a = verso(s.cam, s.cam.a - 24, L), b = verso(s.cam, s.cam.a + 24, L);
SV.push(`<path d="M${s.cam.x} ${s.cam.y}L${a.x} ${a.y}L${b.x} ${b.y}Z" fill="#5b7cfa66" stroke="#3a5be0" stroke-width="${fs * .08}"/><circle cx="${s.cam.x}" cy="${s.cam.y}" r="${fs * .55}" fill="#3a5be0" stroke="#fff" stroke-width="${fs * .16}"/>`);
}
return `<svg class="fg-svg" viewBox="${x0} ${y0} ${x1 - x0} ${y1 - y0}" role="img" aria-label="Piantina: da dove scattare">${SV.join('')}</svg>`;
}
const G = {
P: [], i: -1, attesa: false,
apri() {
const parti = () => {
this.P = passiFoto();
const fatti = this.fatti();
const pr = this.P.findIndex(s => !fatti[s.k]);
this.i = Object.keys(fatti).length ? (pr < 0 ? this.P.length : pr) : -1;
this.attesa = false; this.dids = {};
let v = el('fgVelo');
if (!v) {
v = document.createElement('div'); v.id = 'fgVelo'; v.className = 'gm-velo fg-velo';
document.body.appendChild(v);
v.addEventListener('click', e => { const b = e.target.closest('[data-fg]'); if (b) this.tasto(b.dataset.fg); });
v.addEventListener('change', e => { if (e.target.id === 'fgVai') { this.memo(); this.i = +e.target.value; this.mostra(); } });
this.fScatta = this.inputFile(true); this.fGalleria = this.inputFile(false);
}
v.hidden = false;
this.mostra();
};
if (F.scr && F.scr.hidden !== false) return F.open('editor').then(parti);
parti();
},
inputFile(camera) {
const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; i.hidden = true;
if (camera) i.setAttribute('capture', 'environment');
i.addEventListener('change', e => { const f = e.target.files[0]; e.target.value = ''; if (f) { this.attesa = true; this.mostra(); downscale(f, 1400, .82, src => this.arrivata(src)); } });
document.body.appendChild(i);
return i;
},
fatti() { const o = {}; (F.model.photos || []).forEach(p => { if (p.guida) o[p.guida] = (o[p.guida] || 0) + 1; }); return o; },
memo() { const t = el('fgDid'); if (t && this.P[this.i]) this.dids[this.P[this.i].k] = t.value; },
chiudi() { this.memo(); const v = el('fgVelo'); if (v) v.hidden = true; F.save(); if (F.renderList) F.renderList(); if (RS.procedura) RS.procedura.finito('foto'); },
tasto(k) {
const s = this.P[this.i];
if (k === 'x') return this.chiudi();
if (k === 'via') { this.i = 0; return this.mostra(); }
if (k === 'salta') { this.memo(); this.i++; return this.mostra(); }
if (k === 'ind') { this.memo(); if (this.i > 0) this.i--; return this.mostra(); }
if (!s) return;
const t = el('fgDid'), e = el('fgErr');
if (!(t.value || '').trim()) { e.textContent = 'Scrivi una didascalia'; return; }
this.memo();
if (k === 'scatta') {
if (window.RilsinAndroid && RilsinAndroid.scattaFoto) { this.attesa = true; this.mostra(); RilsinAndroid.scattaFoto(); }
else this.fScatta.click();
} else if (k === 'galleria') this.fGalleria.click();
},
arrivata(src) {
const v = el('fgVelo'), s = this.P[this.i];
if (!v || v.hidden || !s) { if (RS.ui && RS.ui.toast) RS.ui.toast('Foto salvata nel telefono (cartella RILSIN): aggiungila dal fascicolo', 6000); return; }
const arr = F.model.photos, ordine = {}; this.P.forEach((p, n) => { ordine[p.k] = n; });
let pos = -1, primo = -1;
arr.forEach((p, n) => { if (p.guida && ordine[p.guida] != null) { if (primo < 0) primo = n; if (ordine[p.guida] <= this.i) pos = n; } });
const dove = pos >= 0 ? pos + 1 : primo >= 0 ? primo : arr.length;
arr.splice(dove, 0, { id: nuovoId(), src, descr: (this.dids[s.k] != null ? this.dids[s.k] : s.d).trim(), guida: s.k });
F.save();
if (RS.ui && RS.ui.vibra) RS.ui.vibra('50');
this.attesa = false; this.i++;
this.mostra();
},
annullata(msg) { this.attesa = false; this.mostra(); if (msg) { const e = el('fgErr'); if (e) e.textContent = msg; } },
mostra() {
const v = el('fgVelo'); if (!v) return;
const n = (F.model.photos || []).filter(p => p.guida).length, tot = this.P.length, manca = this.P.filter(s => !this.fatti()[s.k]).length, testa = (t, q) => `<div class="gm-top"><span>${esc(t)}</span><span>${esc(q)}</span><button class="gm-x" data-fg="x" aria-label="Chiudi">✕</button></div>`;
const fatti = this.fatti();
if (this.i < 0) {
v.innerHTML = `<div class="gm-box fg-box">${testa('Foto guidate', tot + ' passi')}
          <div class="fg-tit">Dal generale al particolare</div>
          <p class="fg-come">Prima si segna e si misura, poi si fotografa: così punti e tracce si vedono nelle foto. Se pioggia, traffico o soccorsi possono cancellare le tracce, fotografa subito.</p>
          <p class="fg-come">Ogni passo dice che cosa inquadrare e da dove, e prepara la didascalia. Quello che non serve si salta.${window.RilsinAndroid ? ' Le foto restano in RILSIN e nel telefono, nella cartella RILSIN.' : ''}</p>
          <button class="fg-b forte" data-fg="via">Inizia</button></div>`;
return;
}
if (this.i >= tot) {
const manca = this.P.map((s, k) => ({ s, k })).filter(x => !fatti[x.s.k]);
v.innerHTML = `<div class="gm-box fg-box">${testa('Foto guidate', n + ' foto')}
          <div class="fg-tit">Percorso finito</div>
          <p class="fg-come">Le foto sono nel fascicolo, in quest'ordine e con la loro didascalia. Si possono riordinare e modificare.</p>
          ${manca.length ? `<label class="fg-et">Saltate (${manca.length}): tocca per farne una<select id="fgVai"><option value="${tot}">Scegli…</option>${manca.map(x => `<option value="${x.k}">${esc(x.s.t)}</option>`).join('')}</select></label>` : ''}
          <div class="fg-tasti"><button class="fg-b forte" data-fg="x">Chiudi</button><button class="fg-b" data-fg="ind">Indietro</button></div></div>`;
return;
}
const s = this.P[this.i], gia = fatti[s.k] || 0, did = this.dids[s.k] != null ? this.dids[s.k] : s.d;
v.innerHTML = `<div class="gm-box fg-box">${testa(s.g, (n === 1 ? '1 fatta' : n + ' fatte') + ' · ' + (manca ? 'ne mancano ' + manca : 'nessuna da fare'))}
        <div class="gm-barra"><i style="width:${Math.round(this.i / tot * 100)}%"></i></div>
        <div class="fg-tit">${esc(s.t)}${gia ? ` <span class="fg-gia">✓ ${gia === 1 ? 'fatta' : gia + ' fatte'}</span>` : ''}</div>
        ${s.cam ? piantina(s, RS.scene.elements) : ''}
        <p class="fg-come">${esc(s.c)}</p>
        <label class="fg-et">Didascalia per il fascicolo<textarea id="fgDid" rows="2">${esc(did)}</textarea></label>
        <div id="fgErr" class="sk-err"></div>
        ${this.attesa ? '<div class="fg-come">Attendo la foto…</div>' : `<button class="fg-b forte" data-fg="scatta">📷 ${gia ? 'Scatta un\'altra' : 'Scatta'}</button>
        <div class="fg-tasti"><button class="fg-b" data-fg="galleria">Dalla galleria</button><button class="fg-b" data-fg="salta">Salta</button><button class="fg-b" data-fg="ind">Indietro</button></div>`}
        <label class="fg-et">Vai a<select id="fgVai">${this.P.map((p, k) => `<option value="${k}"${k === this.i ? ' selected' : ''}>${fatti[p.k] ? '✓ ' : ''}${esc(p.t)}</option>`).join('')}</select></label></div>`;
}
};
RS.fotoGuidate = { apri: () => G.apri(), chiudi: () => G.chiudi(), passi: passiFoto, _dest: null,
arrivata: s => { const d = RS.fotoGuidate._dest; return d ? d.arrivata(s) : G.arrivata(s); },
annullata: m => { const d = RS.fotoGuidate._dest; return d ? d.annullata(m) : G.annullata(m); } };
RS.fascicolo = F;
})(window.RS = window.RS || {});

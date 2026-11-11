(function (RS) {
'use strict';
const $ = (s, r) => (r || document).querySelector(s);
const el = id => document.getElementById(id);
RS.FRECCIA = {
avanti: '<svg class="frc" viewBox="0 0 14 10" role="img" aria-label="verso la fine"><path d="M1 5h11M8 1.5L12 5 8 8.5"/></svg>',
indietro: '<svg class="frc" viewBox="0 0 14 10" role="img" aria-label="verso l\'inizio"><path d="M13 5H2M6 1.5L2 5l4 3.5"/></svg>'
};
const FRC = RS.FRECCIA;
const ui = {
curTab: 'veicoli',
init() {
if (RS.storage.fileDisponibile && RS.storage.fileDisponibile()) document.querySelectorAll('.solo-browser').forEach(b => b.remove());
if (!this.puoCondividere()) document.querySelectorAll('.solo-condividi').forEach(b => b.remove());
if (!(RS.segnala && RS.segnala.disponibile())) document.querySelectorAll('.solo-segnala').forEach(b => b.remove());
this.buildTabs();
this.buildItems();
this.wireToolbar();
this.wireScene();
this.wireModal();
this.wireArchive();
this.wireGuida();
this.initTelefono();
const scrim = el('mobScrim');
if (scrim) scrim.addEventListener('click', () => this.mobClose());
this.initMinimap();
this.initTela();
this.initIncolla();
this.initSuggerimenti();
this.renderProps();
this.renderLegend();
this.updateStatus();
document.querySelectorAll('[data-act="foglio"]').forEach(b => b.classList.toggle('on', RS.scene.mostraFoglio));
document.querySelectorAll('[data-act="griglia"]').forEach(b => b.classList.toggle('on', !!RS.scene.grid.show));
document.querySelectorAll('[data-act="snap"]').forEach(b => b.classList.toggle('on', !!RS.scene.grid.snap));
try {
if (localStorage.getItem('rilsin:minimap') === '1') {
this.mm.hidden = false;
const b = document.querySelector('[data-act="minimappa"]'); if (b) b.classList.add('on');
this.updateMinimap();
}
} catch (e) {}
this.maybeCoach();
if (/^https?:$/.test(location.protocol)) {
const ping = () => fetch('api.ashx?op=ping', { cache: 'no-store' }).catch(() => {});
ping(); setInterval(ping, 4000);
window.addEventListener('pagehide', () => { try { navigator.sendBeacon('api.ashx?op=bye'); } catch (e) {} });
}
},
buildTabs() {
const wrap = el('palTabs'); wrap.innerHTML = '';
RS.catalog.PALETTE.forEach(cat => {
const b = document.createElement('div');
b.className = 'pal-tab' + (cat.id === this.curTab ? ' on' : '');
b.textContent = cat.nome; b.dataset.tab = cat.id;
b.onclick = () => { this.curTab = cat.id; this.buildTabs(); this.buildItems(); };
wrap.appendChild(b);
});
},
buildItems() {
const wrap = el('palItems'); wrap.innerHTML = '';
const q = (this._filter || '').trim().toLowerCase();
const addItem = (cat, def) => {
const it = document.createElement('div');
it.className = 'pal-item'; it.dataset.id = def.id;
it.innerHTML = makeIcon(cat.type, def) + `<span>${def.etichetta || def.nome}</span>`;
it.onclick = () => {
this.pickPalette(cat, def, it);
if (this.isMobile && this.isMobile()) this.mobClose();
};
wrap.appendChild(it);
};
if (q) {
RS.catalog.PALETTE.forEach(cat => {
const hits = cat.items.filter(d => [d.etichetta, d.nome, d.cerca].join(' ').toLowerCase().includes(q));
if (!hits.length) return;
const hdr = document.createElement('div');
hdr.className = 'pal-section'; hdr.textContent = cat.nome;
wrap.appendChild(hdr);
hits.forEach(def => addItem(cat, def));
});
if (!wrap.childElementCount) wrap.innerHTML = '<div class="pal-section">Nessun risultato</div>';
return;
}
const cat = RS.catalog.PALETTE.find(c => c.id === this.curTab);
let lastSec = null;
cat.items.forEach(def => {
if (def.sec && def.sec !== lastSec) {
lastSec = def.sec;
const hdr = document.createElement('div');
hdr.className = 'pal-section'; hdr.textContent = def.sec;
wrap.appendChild(hdr);
}
addItem(cat, def);
});
},
pickPalette(cat, def, node) {
document.querySelectorAll('.pal-item.active').forEach(n => n.classList.remove('active'));
if (node) node.classList.add('active');
this._recenti = [{ cat: cat.id, def: def.id }].concat((this._recenti || []).filter(r => r.def !== def.id)).slice(0, 5);
try { localStorage.setItem('rilsin:recenti', JSON.stringify(this._recenti)); } catch (e) {}
const HINTS = {
place: 'Clicca sulla tavola per inserire',
placeTool: 'Clicca sulla tavola per inserire',
poly: 'Clicca i punti del tracciato · doppio clic o Invio per terminare',
drag2: 'Premi e trascina dal primo al secondo punto',
drag: 'Premi e trascina per disegnare',
text: 'Clicca dove inserire il testo'
};
let mode;
if (cat.type === 'vehicle') { mode = 'place'; RS.tools.setTool({ mode, kind: 'vehicle', def }); }
else {
const t = def.tool;
const placeTool = ['roundabout', 'legend', 'measuretable', 'north', 'graphscale', 'junction', 'curve'];
if (t === 'symbol') { mode = 'place'; RS.tools.setTool({ mode, kind: 'symbol', def }); }
else if (t === 'skid' || t === 'path' || t === 'roadpath' || t === 'zebrapath' || t === 'angle') { mode = 'poly'; RS.tools.setTool({ mode, tool: t, def }); }
else if (t === 'freehand') { mode = 'freehand'; RS.tools.setTool({ mode, tool: t, def }); }
else if (t === 'measure' || t === 'arrow') { mode = 'drag2'; RS.tools.setTool({ mode, tool: t, def }); }
else if (t === 'text') { mode = 'text'; RS.tools.setTool({ mode, def }); }
else if (placeTool.indexOf(t) >= 0) { mode = 'placeTool'; RS.tools.setTool({ mode, tool: t, def }); }
else { mode = 'drag'; RS.tools.setTool({ mode, tool: t, def }); }
}
if (def.tool === 'angle') this.toast('Clicca: vertice, poi i due lati dell\'angolo');
else if (HINTS[mode]) this.toast(def.nome + ' — ' + HINTS[mode]);
},
wireToolbar() {
document.querySelectorAll('.topbar [data-act], .mobbar [data-act]').forEach(btn => {
btn.onclick = () => this.action(btn.dataset.act, btn);
});
document.querySelectorAll('.mob-menu [data-act]').forEach(btn => {
btn.onclick = () => {
const a = btn.dataset.act;
this.mobClose();
const orig = document.querySelector('.topbar [data-act="' + a + '"]');
this.action(a, orig || btn);
};
});
const RESTA = ['griglia', 'foglio', 'snap', 'righelli', 'minimappa'];
document.querySelectorAll('.topbar .tb-menu').forEach(m => {
m.addEventListener('click', ev => {
const b = ev.target.closest('[data-act]');
if (b && RESTA.indexOf(b.dataset.act) >= 0) return;
m.hidden = true;
});
});
document.addEventListener('mousedown', ev => {
document.querySelectorAll('.topbar .tb-menu:not([hidden])').forEach(m => {
if (!m.parentNode.contains(ev.target)) m.hidden = true;
});
});
el('scala').onchange = e => {
if (e.target.value === 'nis') { RS.scene.fuoriScala = true; }
else { RS.scene.fuoriScala = false; RS.scene.scaleDenom = +e.target.value; }
RS.scene.render(); this.updateStatus();
};
const scMob = el('scalaMob');
if (scMob) scMob.onchange = () => { const s = el('scala'); s.value = scMob.value; s.onchange({ target: s }); };
el('fileOpen').onchange = e => {
const f = e.target.files[0];
if (!f) return;
this.confermaSostituzione('importare «' + f.name + '»').then(ok => {
if (!ok) { e.target.value = ''; return; }
RS.storage.importFile(f, riuscito => {
e.target.value = '';
if (!riuscito) return;
this._releaseLock(); this._uscitaSolaLettura();
delete RS.storage.currentId; RS.storage.staccaFile();
RS.storage.currentName = f.name.replace(/\.json$/i, '');
this._dirty = true; document.title = '● RILSIN — rilievo sinistri'; this.updateStatus();
this.toast('Importato: ' + f.name + ' — premi Salva per ' + (RS.storage.fileDisponibile() ? 'salvarlo in un file' : 'metterlo nell\'archivio'));
});
});
};
el('imgOpen').onchange = e => {
if (e.target.files[0]) { this.loadImageFile(e.target.files[0]); e.target.value = ''; }
};
el('palSearch').addEventListener('input', e => { this._filter = e.target.value; this.buildItems(); });
el('fotoOpen').onchange = e => { if (e.target.files[0]) { this.loadFotoFile(e.target.files[0]); e.target.value = ''; } };
},
loadFotoFile(file) {
const r = new FileReader();
r.onload = () => {
const img = new Image();
img.onload = () => {
const max = 1000, sc = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
const w = Math.round(img.naturalWidth*sc), h = Math.round(img.naturalHeight*sc);
const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
cv.getContext('2d').drawImage(img, 0, 0, w, h);
let href; try { href = cv.toDataURL('image/jpeg', 0.72); } catch (e2) { href = r.result; }
if (this._replaceFotoId) {
const el2 = RS.scene.get(this._replaceFotoId); this._replaceFotoId = null;
if (el2) { el2.href = href; RS.scene.render(); RS.scene.snapshot(); this.renderProps(); this.toast('Foto sostituita'); }
} else {
this._pendingFoto = href;
RS.tools.setTool({ mode: 'placeTool', tool: 'foto', def: {} });
this.toast('Clicca sul disegno dove collocare il segnaposto foto');
}
};
img.src = r.result;
};
r.readAsDataURL(file);
},
importImage() { el('imgOpen').click(); },
loadImageFile(file) {
const r = new FileReader();
r.onload = () => { const img = new Image(); img.onload = () => this.placeBackground(img); img.src = r.result; };
r.readAsDataURL(file);
},
placeBackground(img) {
const max = 2000, nw = img.naturalWidth, nh = img.naturalHeight;
const sc = Math.min(1, max / Math.max(nw, nh)), cw = Math.round(nw*sc), ch = Math.round(nh*sc);
const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
cv.getContext('2d').drawImage(img, 0, 0, cw, ch);
let href; try { href = cv.toDataURL('image/jpeg', 0.88); } catch (e) { href = img.src; }
const S = RS.scene, gmaps = this._sfondoGmaps; this._sfondoGmaps = false;
const Wm = S.view.w * 0.8, Hm = Wm * (ch / cw);
const cx = S.view.x + S.view.w/2, cy = S.view.y + S.view.h/2;
const dati = { type: 'image', href, x: cx, y: cy, rot: 0, w: Wm, h: Hm, opacity: 0.7, locked: false, z: -1000 };
if (gmaps) dati.fonte = 'Google Maps';
const e = S.add(dati);
S.select(e.id);
if (gmaps) {
if (!S.elements.some(x => x.type === 'north')) S.add({ type: 'north', x: S.view.x + S.view.w * 0.92, y: S.view.y + S.view.h * 0.1, rot: 0, size: Math.max(2, Math.round(S.view.w / 25)) });
S.select(e.id);
RS.tools.startCalibrate(e.id);
this.toast('Calibra la scala: clicca i due estremi della barra della scala di Google Maps' + (this.isMobile() ? '' : ' (in basso a destra)') + ' e scrivi la sua lunghezza, per esempio 20 m', 9000);
return;
}
this.toast('Sfondo inserito — usa “📐 Calibra scala” nelle proprietà', 4000);
},
ritagliaSfondo(e) {
const S = RS.scene;
if (!e || e.type !== 'image' || !e.href) return;
const img = new Image();
if (!/^data:/.test(e.href)) img.crossOrigin = 'anonymous';
img.onerror = () => this.toast('Non riesco a leggere questa immagine', 4000);
img.onload = () => {
const nw = img.naturalWidth, nh = img.naturalHeight;
let ov = el('ritaglioOv'); if (ov) ov.remove();
ov = document.createElement('div'); ov.id = 'ritaglioOv'; ov.className = 'fs-overlay rit-ov';
ov.innerHTML = `<div class="fs-modal rit-modal" role="dialog" aria-modal="true">
            <div class="rit-t">✂ Ritaglia lo sfondo</div>
            <div class="rit-sub">Trascina gli angoli o i lati del riquadro; trascinalo dal centro per spostarlo. La parte scura viene tolta, il resto rimane al suo posto sulla tavola e in scala.</div>
            <div class="rit-wrap"><div class="rit-area"><img alt="" draggable="false"><div class="rit-box">
              ${['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].map(k => `<span class="rit-h rit-${k}" data-h="${k}"></span>`).join('')}</div></div></div>
            <div class="fs-act">
              <button class="mini" data-r="tutto">Tutta</button>
              <span style="flex:1"></span>
              <button class="mini" data-r="annulla">Annulla</button>
              <button class="mini fs-ok" data-r="ok">✂ Ritaglia</button>
            </div></div>`;
document.body.appendChild(ov);
const area = ov.querySelector('.rit-area'), im = area.querySelector('img'), box = area.querySelector('.rit-box');
im.src = img.src;
const r = { u0: 0.05, v0: 0.05, u1: 0.95, v1: 0.95 };
const MIN = 0.04;
const disegna = () => {
box.style.left = (r.u0 * 100) + '%'; box.style.top = (r.v0 * 100) + '%';
box.style.width = ((r.u1 - r.u0) * 100) + '%'; box.style.height = ((r.v1 - r.v0) * 100) + '%';
};
const adatta = () => {
const maxW = Math.min(area.parentNode.clientWidth - 28, 900), maxH = Math.max(160, Math.round(window.innerHeight * 0.58));
const k = Math.min(maxW / nw, maxH / nh);
area.style.width = Math.round(nw * k) + 'px'; area.style.height = Math.round(nh * k) + 'px';
};
adatta(); disegna();
const onRes = () => adatta(); window.addEventListener('resize', onRes);
let drag = null;
area.addEventListener('pointerdown', ev => {
const h = ev.target.closest('[data-h]'), dentro = ev.target.closest('.rit-box');
const b = area.getBoundingClientRect();
const u = (ev.clientX - b.left) / b.width, v = (ev.clientY - b.top) / b.height;
drag = { h: h ? h.dataset.h : (dentro ? 'm' : 'nuovo'), u, v, r0: Object.assign({}, r), w: b.width, hh: b.height, l: b.left, t: b.top };
if (drag.h === 'nuovo') { r.u0 = r.u1 = Math.min(1, Math.max(0, u)); r.v0 = r.v1 = Math.min(1, Math.max(0, v)); drag.r0 = Object.assign({}, r); drag.h = 'se'; }
try { area.setPointerCapture(ev.pointerId); } catch (err) {}
ev.preventDefault();
});
area.addEventListener('pointermove', ev => {
if (!drag) return;
const u = (ev.clientX - drag.l) / drag.w, v = (ev.clientY - drag.t) / drag.hh;
const du = u - drag.u, dv = v - drag.v, o = drag.r0, c = x => Math.min(1, Math.max(0, x));
if (drag.h === 'm') {
const w = o.u1 - o.u0, hh = o.v1 - o.v0;
r.u0 = Math.min(1 - w, Math.max(0, o.u0 + du)); r.u1 = r.u0 + w;
r.v0 = Math.min(1 - hh, Math.max(0, o.v0 + dv)); r.v1 = r.v0 + hh;
} else {
if (/w/.test(drag.h)) r.u0 = Math.min(c(o.u0 + du), r.u1 - MIN);
if (/e/.test(drag.h)) r.u1 = Math.max(c(o.u1 + du), r.u0 + MIN);
if (/n/.test(drag.h)) r.v0 = Math.min(c(o.v0 + dv), r.v1 - MIN);
if (/s/.test(drag.h)) r.v1 = Math.max(c(o.v1 + dv), r.v0 + MIN);
}
disegna(); ev.preventDefault();
});
const fine = () => { drag = null; };
area.addEventListener('pointerup', fine); area.addEventListener('pointercancel', fine);
const chiudi = () => { window.removeEventListener('resize', onRes); ov.remove(); };
ov.addEventListener('click', ev => {
const b = ev.target.closest('[data-r]'); if (!b) return;
if (b.dataset.r === 'annulla') { chiudi(); return; }
if (b.dataset.r === 'tutto') { r.u0 = 0; r.v0 = 0; r.u1 = 1; r.v1 = 1; disegna(); return; }
if (r.u0 <= 0.001 && r.v0 <= 0.001 && r.u1 >= 0.999 && r.v1 >= 0.999) { chiudi(); this.toast('Nessun ritaglio: l\'immagine resta intera', 2500); return; }
const sx = Math.round(r.u0 * nw), sy = Math.round(r.v0 * nh), sw = Math.max(1, Math.round((r.u1 - r.u0) * nw)), sh = Math.max(1, Math.round((r.v1 - r.v0) * nh));
const cv = document.createElement('canvas'); cv.width = sw; cv.height = sh;
cv.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
let href;
try { href = /^data:image\/png/.test(e.href) ? cv.toDataURL('image/png') : cv.toDataURL('image/jpeg', 0.9); }
catch (err) { chiudi(); this.toast('Questa immagine non si può ritagliare (proviene da un altro sito)', 5000); return; }
const fu = sw / nw, fv = sh / nh;
const lx = ((sx + sw / 2) / nw - 0.5) * e.w, ly = ((sy + sh / 2) / nh - 0.5) * e.h;
const a = (e.rot || 0) * Math.PI / 180;
e.x += lx * Math.cos(a) - ly * Math.sin(a);
e.y += lx * Math.sin(a) + ly * Math.cos(a);
e.w *= fu; e.h *= fv; e.href = href; e.ritagliata = true;
chiudi();
S.render(); S.snapshot(); S.select([e.id]); this.renderProps();
this.toast('✓ Sfondo ritagliato (Annulla per tornare indietro)', 3500);
});
};
img.src = e.href;
},
immagineCondivisa(dataUrl) {
const gmaps = this._sfondoGmaps;
const m = el('sceltaModal');
if (m && !m.hidden) { const a = m.querySelector('.scelta-annulla'); if (a) a.click(); }
const img = new Image();
img.onerror = () => this.toast('RILSIN non riesce a leggere questa immagine', 4000);
img.onload = () => this._tavolaPerCondivisa().then(ok => {
if (!ok) return null;
return gmaps ? 'gmaps' : this.scelta({
titolo: 'Immagine ricevuta',
testo: 'Diventa lo sfondo della tavola. Da dove viene?',
opzioni: [
{ k: 'gmaps', t: '🗺 Da Google Maps', d: 'Si calibra subito sulla barra della scala di Google', primario: true },
{ k: 'altra', t: '🖼 Un\'altra immagine', d: 'Sfondo da calibrare su una distanza nota' }]
});
}).then(k => {
if (!k) return;
this._sfondoGmaps = k === 'gmaps';
this.placeBackground(img);
});
img.src = dataUrl;
},
_tavolaPerCondivisa() {
const H = RS.home;
if (H.w && !H.w.hidden) { H.w.classList.remove('show'); H.w.hidden = true; }
if (!H.h || H.h.hidden) return Promise.resolve(true);
const a = RS.scene.elements.length ? null : RS.storage.getAutosave();
if (!a || !a.elements || !a.elements.length) { H.hide(true); return Promise.resolve(true); }
return this.scelta({
titolo: 'C\'è un disegno lasciato in sospeso',
testo: 'Dove metto l\'immagine ricevuta?',
opzioni: [
{ k: 'riprendi', t: 'Sul disegno in sospeso', d: 'Torna sulla tavola com\'era', primario: true },
{ k: 'nuova', t: 'Su una nuova tavola', d: 'Il disegno in sospeso va fra le bozze recenti' }]
}).then(k => {
if (!k) return false;
H.hide(true);
if (k === 'riprendi') this.riprendiBozza(); else this.nuovaTavola();
return true;
});
},
incollaImmagine() {
if (!navigator.clipboard || !navigator.clipboard.read) { this.toast('Premi Ctrl+V sulla tavola per incollare la cattura', 4000); return; }
navigator.clipboard.read().then(voci => {
for (const v of voci) { const t = v.types.find(x => x.indexOf('image/') === 0); if (t) return v.getType(t); }
throw new Error('vuoto');
}).then(b => this.loadImageFile(b))
.catch(() => this.toast('Negli appunti non c\'è un\'immagine: fai prima la cattura (Win+Maiusc+S), poi riprova o premi Ctrl+V', 5000));
},
daGoogleMaps() {
const pos = RS.ortofoto && RS.ortofoto.posizioneTavola();
const url = pos ? `https://www.google.com/maps/@${pos.lat.toFixed(6)},${pos.lon.toFixed(6)},140m/data=!3m1!1e3`
: 'https://www.google.com/maps/@41.9,12.5,6z/data=!3m1!1e3';
const app = !!(window.RilsinAndroid && RilsinAndroid.apriMappa), tel = app || this.isMobile();
if (app) RilsinAndroid.apriMappa(url); else window.open(url, '_blank', 'noopener');
this._sfondoGmaps = true;
const dove = pos ? 'Google Maps si è aperto sul luogo: passa alla vista satellite (pulsante dei livelli) se non lo è già.'
: 'Google Maps si è aperto: cerca il luogo e passa alla vista satellite.';
this.scelta({
titolo: 'Foto aerea da Google Maps',
testo: tel
? dove + ' Tieni il Nord in alto (non ruotare la mappa) e fai lo screenshot del telefono (di solito accensione + volume giù) mentre si vede la barra della scala: nell\'app compare quando allarghi o stringi con due dita, oppure sempre con Impostazioni → Mostra la scala sulla mappa. ' +
(app ? 'Poi tocca Condividi sullo screenshot e scegli RILSIN: arriva qui da solo, pronto per la scala. Se preferisci, torna qui e sceglilo dalla galleria.' : 'Poi torna qui e scegli lo screenshot.')
: dove + ' Tieni il Nord in alto (non ruotare la mappa), fai la cattura con Win+Maiusc+S includendo la barra della scala in basso a destra, poi torna qui.',
opzioni: tel ? [
{ k: 'file', t: '🖼 Scegli lo screenshot', d: app ? 'dalla galleria, se non l\'hai condiviso con RILSIN' : 'dalla galleria del telefono', primario: true },
{ k: 'incolla', t: '📋 Incolla un\'immagine copiata', d: 'se l\'hai copiata invece di salvarla' }
] : [
{ k: 'incolla', t: '📋 Incolla la cattura', d: 'oppure premi Ctrl+V sulla tavola', primario: true },
{ k: 'file', t: '🖼 Scegli un\'immagine salvata', d: 'se hai salvato la cattura come file' }
]
}).then(k => {
if (k === 'incolla') this.incollaImmagine();
else if (k === 'file') this.importImage();
else if (!this._incollaInCorso) this._sfondoGmaps = false;
this._incollaInCorso = false;
});
},
initSuggerimenti() {
const tip = document.createElement('div');
tip.id = 'tbTip'; tip.hidden = true; tip.setAttribute('role', 'tooltip');
document.body.appendChild(tip);
let t = null, cur = null;
const nascondi = () => { clearTimeout(t); t = null; cur = null; tip.hidden = true; };
const mostra = b => {
const et = b.querySelector('span:not(.caret)'), t = SUGGERIMENTI[b.dataset.act];
const nome = t ? t[0] : ((et && et.textContent.trim()) || b.dataset.tip), desc = t ? t[1] : (b.dataset.tip !== nome ? b.dataset.tip : '');
tip.innerHTML = `<b>${escAttr(nome)}</b>` + (desc ? `<span>${escAttr(desc)}</span>` : '');
tip.hidden = false;
const r = b.getBoundingClientRect(), w = tip.offsetWidth;
tip.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2)) + 'px';
tip.style.top = (r.bottom + 8) + 'px';
};
document.querySelectorAll('.topbar .tb[title]').forEach(b => {
if (b.closest('.tb-menu')) return;
b.dataset.tip = b.getAttribute('title');
if (!b.hasAttribute('aria-label')) b.setAttribute('aria-label', b.dataset.tip);
b.removeAttribute('title');
b.addEventListener('pointerenter', ev => {
if (ev.pointerType !== 'mouse' || cur === b) return;
cur = b; clearTimeout(t);
t = setTimeout(() => mostra(b), tip.hidden ? 350 : 0);
});
b.addEventListener('pointerleave', () => { clearTimeout(t); cur = null; t = setTimeout(() => { tip.hidden = true; }, 120); });
b.addEventListener('pointerdown', nascondi);
});
window.addEventListener('blur', nascondi);
},
initIncolla() {
document.addEventListener('paste', ev => {
const t = ev.target;
if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
const voci = (ev.clipboardData && ev.clipboardData.items) ? Array.from(ev.clipboardData.items) : [];
const v = voci.find(x => x.kind === 'file' && x.type.indexOf('image/') === 0); if (!v) return;
ev.preventDefault();
const m = el('sceltaModal');
if (m && !m.hidden) { this._incollaInCorso = true; const a = m.querySelector('.scelta-annulla'); if (a) a.click(); }
this.loadImageFile(v.getAsFile());
});
},
action(act, btn) {
const S = RS.scene;
switch (act) {
case 'home': RS.home.showMenu(); break;
case 'nuovo':
this.confermaSostituzione('creare una nuova tavola').then(ok => {
if (!ok) return;
this.nuovaTavola(); this.toast('Nuova tavola');
});
break;
case 'salva': {
this.salva();
break;
}
case 'salva-come': this.salvaCome(); break;
case 'condividi': this.condividiTavola(); break;
case 'esporta-json': RS.storage.exportFile().then(() => this.toast('Tavola esportata: aprila sul PC con Apri')).catch(e => this.toast('Esportazione non riuscita: ' + (e && e.message || e))); break;
case 'apri': this.openDialog(); break;
case 'dati': this.openData(); break;
case 'verifica': this._dataTab = 'verifica'; this.openData(); break;
case 'atto': RS.exportUtil.attoMisure(); break;
case 'completo': this.apriCompleto(); break;
case 'luoghi': RS.luoghi.apri(); break;
case 'atto-word': RS.exportUtil.attoMisureWord(); this.toast('Atto delle misure esportato in Word (.doc)'); break;
case 'fascicolo': RS.fascicolo.open('editor'); break;
case 'coinvolti': RS.coinvolti.apri(); break;
case 'aiuti': {
const on = document.body.classList.toggle('aiuti');
try { localStorage.setItem('rilsin:aiuti', on ? '1' : '0'); } catch (e) {}
document.querySelectorAll('[data-act="aiuti"]').forEach(b => b.classList.toggle('on', on));
break;
}
case 'scambio': RS.coinvolti.scambioDati(); break;
case 'atti': RS.procedura.atti(); break;
case 'recon': RS.recon.open(); break;
case 'foto': this._replaceFotoId = null; el('fotoOpen').click(); break;
case 'panorama': if (RS.panorama) RS.panorama.comando(); break;
case 'sfondo': {
const img = RS.scene.elements.find(x => x.type === 'image');
if (img) {
RS.scene.select([img.id]);
this.toast(img.locked ? '🔒 Sfondo selezionato (bloccato)' : 'Sfondo selezionato', 6000, [
{ t: img.locked ? '🔓 Sblocca' : '🔒 Blocca', fn: () => { img.locked = !img.locked; S.render(); S.snapshot(); if (img.locked) S.select([]); else S.select([img.id]); this.toast(img.locked ? '🔒 Sfondo bloccato' : '🔓 Sfondo sbloccato: ora si sposta', 2500); } },
{ t: '✂ Ritaglia', fn: () => this.ritagliaSfondo(img) }]);
break;
}
this.scelta({
titolo: 'Foto aerea di sfondo',
testo: 'Da dove prendo la foto aerea?',
opzioni: [
{ k: 'geo', t: '🛰 Dal Geoportale Nazionale', d: 'Con la posizione GPS: già in scala e con il Nord in alto (serve internet)', primario: true },
{ k: 'gmaps', t: '🗺 Da Google Maps', d: 'Apre la vista satellite sul luogo: fai la cattura dello schermo, la incolli qui e calibri la scala (immagini più recenti)' },
{ k: 'file', t: '🖼 Immagine dal dispositivo', d: 'Un\'immagine salvata: poi va calibrata la scala (funziona anche senza rete)' },
{ k: 'incolla', t: '📋 Incolla un\'immagine copiata', d: 'Anche con Ctrl+V sulla tavola' }
]
}).then(k => { if (k === 'geo') RS.ortofoto.apri(); else if (k === 'gmaps') this.daGoogleMaps(); else if (k === 'file') this.importImage(); else if (k === 'incolla') this.incollaImmagine(); });
break;
}
case 'ortofoto': RS.ortofoto.apri(); break;
case 'raccorda': RS.raccordi.comando(); break;
case 'raddrizza': RS.raddrizza.comando(); break;
case 'undo': S.undo(); break;
case 'redo': S.redo(); break;
case 'zoom-in': S.zoomStep(1/1.2); break;
case 'zoom-out': S.zoomStep(1.2); break;
case 'fit': S.fit(true); break;
case 'adatta-foglio': { const F = S.foglio(); if (F) S.focusRect(F, 1, true); else S.fit(true); break; }
case 'pan': this.togglePan(btn); break;
case 'schizzo': this.startSchizzo(btn); break;
case 'misure': if (!this._dataTab) this._dataTab = RS.scene.meta && RS.scene.meta.localita ? 'triang' : 'intest'; this.openData(); break;
case 'orient': this.toggleOrient(btn); break;
case 'mob-palette': this.mobPanel('palette'); break;
case 'mob-props': this.mobPanel('props'); break;
case 'mob-menu': this.mobMenu(); break;
case 'fine-strumento': RS.tools.fine(); break;
case 'griglia': S.grid.show = !S.grid.show; btn.classList.toggle('on', S.grid.show); S.drawGrid(); break;
case 'foglio': {
S.mostraFoglio = !S.mostraFoglio;
try { localStorage.setItem('rilsin:foglio', S.mostraFoglio ? '1' : '0'); } catch (e) {}
document.querySelectorAll('[data-act="foglio"]').forEach(b => b.classList.toggle('on', S.mostraFoglio));
S.drawGrid(); S.drawFoglio();
this.toast(S.mostraFoglio ? 'Area di stampa visibile' : 'Area di stampa nascosta (la stampa non cambia)', 2500);
break;
}
case 'snap': S.grid.snap = !S.grid.snap; btn.classList.toggle('on', S.grid.snap); break;
case 'righelli': RS.rulers.toggle(btn); break;
case 'livelli': RS.layers.toggle(btn); break;
case 'atto-menu': case 'vista-menu': case 'altro-menu': {
const m = el(act.replace('-menu', 'Menu'));
if (!m) break;
const apri = m.hidden;
document.querySelectorAll('.topbar .tb-menu').forEach(x => { x.hidden = true; });
m.hidden = !apri;
break;
}
case 'testo': {
const SIZES = ['ui-sm', '', 'ui-lg'], NOMI = ['piccolo', 'normale', 'grande'];
const cur = document.body.classList.contains('ui-sm') ? 0 : (document.body.classList.contains('ui-lg') ? 2 : 1);
const next = (cur + 1) % 3;
document.body.classList.remove('ui-sm', 'ui-lg');
if (SIZES[next]) document.body.classList.add(SIZES[next]);
try { localStorage.setItem('scenasinistro:testo', SIZES[next]); } catch (e) {}
this.toast('Testo interfaccia: ' + NOMI[next]); break;
}
case 'info': this.openInfo(); break;
case 'segnala': if (RS.segnala) RS.segnala.apri(); break;
case 'guida': this.openGuida(); break;
case 'minimappa': this.toggleMinimap(btn); break;
case 'present': this.togglePresent(btn); break;
case 'righello': this.startRuler(btn); break;
case 'triangola': this.startTriangulate(); break;
case 'sole': {
const on = document.body.classList.toggle('sole');
try { localStorage.setItem('scenasinistro:sole', on ? '1' : '0'); } catch (e) {}
if (on && document.body.classList.contains('notte')) {
document.body.classList.remove('notte'); try { localStorage.setItem('scenasinistro:notte', '0'); } catch (e) {}
document.querySelectorAll('[data-act="notte"]').forEach(b => b.classList.remove('on'));
}
document.querySelectorAll('[data-act="sole"]').forEach(b => b.classList.toggle('on', on));
this.toast(on ? 'Pieno sole: alto contrasto' : 'Pieno sole spento'); break;
}
case 'notte': {
const on = document.body.classList.toggle('notte');
try { localStorage.setItem('scenasinistro:notte', on ? '1' : '0'); } catch (e) {}
if (on && document.body.classList.contains('sole')) {
document.body.classList.remove('sole'); try { localStorage.setItem('scenasinistro:sole', '0'); } catch (e) {}
document.querySelectorAll('[data-act="sole"]').forEach(b => b.classList.remove('on'));
}
document.querySelectorAll('[data-act="notte"]').forEach(b => b.classList.toggle('on', on));
this.toast(on ? 'Modalità notte: schermo attenuato' : 'Modalità notte spenta'); break;
}
case 'aspetto': {
const B = document.body.classList, ora = B.contains('sole') ? 'sole' : B.contains('notte') ? 'notte' : B.contains('light') ? 'chiaro' : 'scuro';
const voce = (k, t, d) => ({ k, t: (k === ora ? '✓ ' : '') + t, d, primario: k === ora });
this.scelta({ titolo: '🎨 Aspetto', testo: 'Come si vede l\'app. La scelta resta su questo dispositivo.', opzioni: [
voce('scuro', '🌑 Scuro', 'l\'aspetto normale'),
voce('chiaro', '⬜ Chiaro', 'colori chiari, per l\'ufficio'),
voce('sole', '☀️ Pieno sole', 'bianco e nero ad alto contrasto, per leggere lo schermo all\'aperto'),
voce('notte', '🌙 Notte', 'tavola, foto e documenti attenuati, per non abbagliare di notte')] }).then(k => {
if (!k) return;
B.toggle('light', k === 'chiaro'); B.toggle('sole', k === 'sole'); B.toggle('notte', k === 'notte');
try {
localStorage.setItem('scenasinistro:tema', k === 'chiaro' ? 'light' : 'dark');
localStorage.setItem('scenasinistro:sole', k === 'sole' ? '1' : '0');
localStorage.setItem('scenasinistro:notte', k === 'notte' ? '1' : '0');
} catch (e) {}
if (RS.rulers && RS.rulers.enabled) { RS.rulers.drawTicks(); RS.rulers.drawGuides(); }
this.toast({ scuro: 'Aspetto scuro', chiaro: 'Aspetto chiaro', sole: 'Pieno sole: alto contrasto', notte: 'Modalità notte: schermo attenuato' }[k]);
});
break;
}
case 'tema': {
const light = document.body.classList.toggle('light');
try { localStorage.setItem('scenasinistro:tema', light ? 'light' : 'dark'); } catch (e) {}
if (RS.rulers && RS.rulers.enabled) { RS.rulers.drawTicks(); RS.rulers.drawGuides(); }
this.toast(light ? 'Tema chiaro' : 'Tema scuro'); break;
}
case 'esporta-png': RS.exportUtil.exportPNG(); break;
case 'esporta-svg': RS.exportUtil.exportSVG(); break;
case 'stampa': this.openPrint(); break;
}
},
markClean() {
this._dirty = false; document.title = 'RILSIN — Rilievo planimetrico dei sinistri stradali';
if (this._ready && RS.storage && RS.storage.autosave) RS.storage.autosave();
},
nuovaTavola() {
const S = RS.scene;
this._releaseLock(); this._uscitaSolaLettura();
S.clear(); delete RS.storage.currentId; RS.storage.currentName = ''; RS.storage.staccaFile(); S.meta = {}; S.applyMetaDefaults();
this.applyTemplate(); RS.storage.clearAutosave(); this.markClean(); this.updateStatus();
S.gOverlay.querySelectorAll('.preview').forEach(n => n.remove());
this._tvChiusa = false; this.aggiornaVuota();
},
applyTemplate() {
const t = RS.storage.template(); if (!t) return;
const S = RS.scene;
const tm = t.meta || {};
S.meta = {}; if (tm.comando) S.meta.comando = tm.comando; if (tm.comando2) S.meta.comando2 = tm.comando2; if (tm.stazione) S.meta.stazione = tm.stazione;
S.applyMetaDefaults();
if (t.scaleDenom) S.scaleDenom = t.scaleDenom;
S.printOpts = Object.assign({}, t.printOpts || {});
S.emit('view');
},
openDialog() {
if (RS.storage.useServer()) return this.openDialogServer();
if (RS.storage.fileDisponibile()) return this._apriFileDialog();
return this._apriDalBrowser();
},
async _apriDalBrowser() {
const ST = RS.storage, list = ST.list(), vers = ST.versions();
const quando = t => t.salvataIl ? quandoBreve(t.salvataIl) : '';
const ordinate = list.map((t, i) => ({ t, i })).sort((a, b) => String(b.t.salvataIl || '').localeCompare(String(a.t.salvataIl || '')) || b.i - a.i);
const MOSTRA = 10;
const voce = x => ({ k: 't' + x.i, t: '🕘 ' + (x.t.nome || 'Tavola senza nome'),
d: [quando(x.t), (x.t.elements || []).length + ' oggetti'].filter(Boolean).join(' · ') });
const tutte = this._apriTutte || ordinate.length > MOSTRA; this._apriTutte = false;
const testoRicerca = t => {
const m = t.meta || {}, c = m.coinvolti || {};
const persone = (c.veicoli || []).map(v => [v.targa, v.marca, v.conducente && v.conducente.nominativo, v.proprietario && v.proprietario.nominativo].join(' '))
.concat((c.pedoni || []).map(p => p.nominativo));
return [t.nome, m.localita, m.comune, m.data, m.numero].concat(persone).filter(Boolean).join(' ');
};
const testi = {}; ordinate.forEach(x => { testi['t' + x.i] = testoRicerca(x.t); });
const k = await this.scelta({
titolo: 'Apri tavola',
testo: list.length ? 'Le tavole salvate in questo dispositivo, oppure un file ricevuto.'
: 'In questo dispositivo non ci sono tavole salvate: puoi aprire un file ricevuto (.json).',
cerca: ordinate.length > 5 ? { segnaposto: 'Cerca per nome, via, data, targa o persona', testi } : null,
opzioni: (tutte ? ordinate : ordinate.slice(0, MOSTRA)).map(voce)
.concat(!tutte && ordinate.length > MOSTRA ? [{ k: 'tutte', t: '📋 Tutte le tavole (' + ordinate.length + ')…' }] : [])
.concat(vers.length ? [{ k: 'versioni', t: '⏪ Versioni precedenti…', d: 'le copie di sicurezza automatiche del disegno' }] : [])
.concat([{ k: 'importa', t: '📂 Importa da file…', d: 'una tavola ricevuta (.json), con le sue foto', primario: !list.length }])
.concat(list.length ? [{ k: 'copia', t: '💾 Copia di sicurezza di tutte le tavole', d: 'un solo file .zip con tavole e foto: conservalo fuori dal telefono (Salva su File, Drive, PC)' }] : [])
.concat([{ k: 'ripristina', t: '♻ Ripristina da una copia di sicurezza…', d: 'le tavole di un file .zip fatto con «Copia di sicurezza»' }])
});
if (!k) return;
if (k === 'importa') { el('fileOpen').click(); return; }
if (k === 'copia') return this.copiaTavole();
if (k === 'ripristina') return this.ripristinaTavole();
if (k === 'tutte') { this._apriTutte = true; return this._apriDalBrowser(); }
if (k === 'versioni') {
const kv = await this.scelta({
titolo: 'Versioni precedenti',
testo: 'Copie di sicurezza prese da sole mentre disegnavi: si apre al posto della tavola aperta.',
opzioni: vers.map((v, i) => ({ k: 'v' + i, t: '⏪ ' + new Date(v.ts).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
d: ((v.doc && v.doc.nome) ? '«' + v.doc.nome + '» · ' : '') + ((v.doc && v.doc.elements) || []).length + ' oggetti' }))
});
if (!kv) return;
const vi = +kv.slice(1);
if (await this.confermaSostituzione('ripristinare la versione del ' + new Date(vers[vi].ts).toLocaleString('it-IT')) && ST.restoreVersion(vi))
this.toast('Ripristinata la versione del ' + new Date(vers[vi].ts).toLocaleString('it-IT'));
return;
}
const t = list[+k.slice(1)]; if (!t) return;
if (!(await this.confermaSostituzione('aprire «' + t.nome + '»'))) return;
ST.open(t.id); ST.currentName = t.nome; ST.staccaFile();
this.markClean(); this.updateStatus(); this.toast('Aperta: ' + t.nome);
},
async copiaTavole() {
const ST = RS.storage, list = ST.list();
if (!list.length) { this.toast('Non ci sono tavole salvate in questo dispositivo'); return; }
try {
this.toast('Preparo la copia di sicurezza…', 30000);
const enc = new TextEncoder(), file = [];
for (const t of list) {
const doc = await ST.tavolaCompleta(t);
const nome = String(t.nome || 'Tavola').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '-').trim().slice(0, 60) || 'Tavola';
file.push({ nome: 'tavole/' + nome + ' (' + t.id + ').json', dati: enc.encode(JSON.stringify(doc)), data: t.salvataIl ? new Date(t.salvataIl) : new Date() });
}
const zip = await ST.creaZip(file), nomeZip = 'tavole-rilsin-' + new Date().toISOString().slice(0, 10) + '.zip';
RS.exportUtil.download(zip, nomeZip);
try { localStorage.setItem('rilsin:ultimaCopia', new Date().toISOString()); } catch (e) {}
this.toast('Copia di sicurezza pronta: ' + list.length + (list.length === 1 ? ' tavola' : ' tavole') + ' nel file ' + nomeZip + '. Conservala fuori dal telefono.', 7000);
} catch (e) { this.toast('Copia non riuscita: ' + (e && e.message || e)); }
},
statoCopia() {
const ST = RS.storage;
let list = [];
try { list = ST.useServer() ? [] : ST.list(); } catch (e) {}
let quando = null; try { quando = localStorage.getItem('rilsin:ultimaCopia'); } catch (e) {}
const recente = list.reduce((m, t) => String(t.salvataIl || '') > m ? String(t.salvataIl || '') : m, '');
return { tavole: list.length, quando, cambiate: !!recente && (!quando || recente > quando) };
},
serveCopia() {
const ST = RS.storage;
if (ST.useServer() || ST.fileDisponibile()) return false;
const s = this.statoCopia(); if (!s.tavole || !s.cambiate) return false;
const ora = Date.now(), SETTE = 7 * 864e5;
if (s.quando && ora - Date.parse(s.quando) < SETTE) return false;
let ultimo = 0; try { ultimo = +localStorage.getItem('rilsin:promemoriaCopia') || 0; } catch (e) {}
if (ora - ultimo < 864e5) return false;
try { localStorage.setItem('rilsin:promemoriaCopia', String(ora)); } catch (e) {}
return true;
},
async ripristinaTavole() {
const ST = RS.storage;
const f = await new Promise(ok => { const i = document.createElement('input'); i.type = 'file'; i.accept = '.zip,application/zip'; i.onchange = () => ok(i.files && i.files[0]); i.click(); });
if (!f) return;
const docs = [];
try {
const voci = (await ST.leggiZip(f)).filter(v => /^(tavole\/)?[^/]+\.json$/i.test(v.nome));
const dec = new TextDecoder();
for (const v of voci) { try { const d = JSON.parse(dec.decode(await v.dati())); if (d && Array.isArray(d.elements)) docs.push(d); } catch (e) {} }
} catch (e) { this.toast('File non valido: ' + (e && e.message || e)); return; }
if (!docs.length) { this.toast('Il file non contiene tavole di RILSIN: fai la copia con «Copia di sicurezza di tutte le tavole»', 6000); return; }
const presenti = new Set(ST.list().map(t => t.id));
const nuove = docs.filter(d => !d.id || !presenti.has(d.id)), gia = docs.length - nuove.length;
if (!nuove.length) { this.toast('Le ' + docs.length + ' tavole della copia sono già tutte in questo dispositivo', 5000); return; }
const k = await this.scelta({ titolo: 'Ripristina da una copia di sicurezza',
testo: 'Nella copia ci sono ' + docs.length + (docs.length === 1 ? ' tavola' : ' tavole') + ': ' + nuove.length + ' da ripristinare' + (gia ? ', ' + gia + (gia === 1 ? ' già presente in questo dispositivo (resta com\'è)' : ' già presenti in questo dispositivo (restano come sono)') : '') + '.',
opzioni: [{ k: 'ok', t: '♻ Ripristina ' + nuove.length + (nuove.length === 1 ? ' tavola' : ' tavole'), primario: true }] });
if (k !== 'ok') return;
if (!(await this.confermaSostituzione('ripristinare le tavole'))) return;
let fatte = 0, errori = 0, ultima = null;
for (const d of nuove) {
try {
RS.scene.load(d);
if (RS.fascicolo && RS.fascicolo.save) await RS.fascicolo.save();
ST.currentId = d.id || ('t' + Date.now() + '-' + fatte);
ultima = ST.save(d.nome || 'Tavola ripristinata'); fatte++;
} catch (e) { errori++; }
}
if (ultima) ST.currentName = ultima.nome;
ST.staccaFile && ST.staccaFile();
this.markClean(); this.updateStatus();
this.toast('Ripristinate ' + fatte + (fatte === 1 ? ' tavola' : ' tavole') + (errori ? ' (' + errori + ' non riuscite: memoria piena?)' : '') + '. Si trovano in Apri.', 7000);
},
openDialogServer() { this.openArchive(); },
wireArchive() {
const m = el('archiveModal'); if (!m) return;
m.addEventListener('click', e => {
if (e.target === m) return this.closeArchive();
const t = e.target.closest('[data-act],[data-arch-open],[data-arch-del],[data-arch-ver],[data-arch-vrestore],[data-arch-back],[data-arch-restore],[data-arch-purge],[data-arch-recupera]');
if (!t) return;
if (t.dataset.act === 'arch-close') return this.closeArchive();
if (t.dataset.act === 'arch-import') { this.closeArchive(); el('fileOpen').click(); return; }
if (t.dataset.act === 'arch-op') return this._archSetOperatore();
if (t.dataset.act === 'arch-back') return this.openArchive();
if (t.dataset.act === 'arch-trash') return this._archTrash();
if (t.dataset.act === 'arch-backup') return this._archBackup();
if (t.dataset.act === 'arch-ripristina') return this._archRipristinaCopia();
if (t.dataset.act === 'arch-purge-all') return this._archPurge(null);
if (t.dataset.archRestore) return this._archRestoreTrash(t.dataset.archRestore);
if (t.dataset.archPurge) return this._archPurge(t.dataset.archPurge);
if (t.dataset.archRecupera) return this._archRecupera(t.dataset.archRecupera);
if (t.dataset.archOpen) return this._archOpen(t.dataset.archOpen);
if (t.dataset.archDel) return this._archDel(t.dataset.archDel);
if (t.dataset.archVer) return this._archVersions(t.dataset.archVer);
if (t.dataset.archVrestore) { const p = t.dataset.archVrestore.split('|'); return this._archRestore(p[0], p[1]); }
});
window.addEventListener('beforeunload', () => this._releaseLock());
},
closeArchive() { const m = el('archiveModal'); if (m) m.hidden = true; },
openArchive() {
const m = el('archiveModal'), body = el('archiveBody');
body.innerHTML = '<div class="arch-empty">Carico l\'archivio condiviso…</div>';
m.hidden = false;
RS.storage.listRemote()
.then(list => this.renderArchive(list))
.catch(e => { body.innerHTML = '<div class="arch-empty">Archivio non raggiungibile:<br>' + escAttr(e.message) + '</div>'; });
},
renderArchive(list) {
const body = el('archiveBody'), op = RS.storage.operatore();
if (list) this._archList = list;
const q = (this._archQ || '').trim().toLowerCase();
const ord = this._archOrd || 'data';
const head =
`<div class="arch-bar">
           <div class="arch-op">Postazione: <button class="arch-op-btn" data-act="arch-op" title="Cambia il nome mostrato agli altri operatori">${escAttr(op)}</button></div>
           <button class="arch-imp" data-act="arch-trash" title="Tavole eliminate: si possono ripristinare">🗑 Cestino</button>
           <button class="arch-imp" data-act="arch-backup" title="Scarica una copia di sicurezza di tutto l'archivio">💾 Copia di sicurezza</button>
           <button class="arch-imp" data-act="arch-ripristina" title="Ripristina l'archivio da una copia di sicurezza (automatica o .zip)">♻ Ripristina copia</button>
           <button class="arch-imp" data-act="arch-import">⬆ Importa .json</button>
         </div>
         <div class="arch-tools">
           <input id="archQ" class="arch-search" placeholder="🔍 Cerca per nome, n. protocollo, località, data, operatore…" value="${escAttr(this._archQ || '')}">
           <select id="archOrd" class="arch-sort" title="Ordina le tavole">
             <option value="data"${ord==='data'?' selected':''}>Più recenti</option>
             <option value="datav"${ord==='datav'?' selected':''}>Più vecchie</option>
             <option value="nome"${ord==='nome'?' selected':''}>Nome (A→Z)</option>
             <option value="nomed"${ord==='nomed'?' selected':''}>Nome (Z→A)</option>
           </select>
         </div>
         <div class="arch-copie" id="archCopie"></div>`;
let elenco = (this._archList || []).slice();
const dataIt = (v) => { const d = v ? new Date(v) : null; return (d && !isNaN(d)) ? d.toLocaleDateString('it-IT') : ''; };
const cercabile = (t) => [t.nome, t.numero, t.localita, t.data, dataIt(t.data), t.operatore, t.salvataDa]
.filter(Boolean).join(' · ').toLowerCase();
if (q) elenco = elenco.filter(t => cercabile(t).includes(q));
const ts = x => x.savedAt ? new Date(x.savedAt).getTime() : 0;
elenco.sort((a, b) =>
ord === 'nome'  ? String(a.nome||'').localeCompare(String(b.nome||''), 'it') :
ord === 'nomed' ? String(b.nome||'').localeCompare(String(a.nome||''), 'it') :
ord === 'datav' ? ts(a) - ts(b) : ts(b) - ts(a));
if (!(this._archList || []).length) { body.innerHTML = head + '<div class="arch-empty">Nessuna tavola nell\'archivio condiviso.</div>'; this._wireArchTools(); return; }
if (!elenco.length) { body.innerHTML = head + `<div class="arch-empty">Nessuna tavola corrisponde a «${escAttr(this._archQ)}».</div>`; this._wireArchTools(); return; }
const cards = elenco.map(t => {
if (t.danneggiata) {
return `<div class="arch-card danneggiata">
              <div class="arch-thwrap"><div class="arch-th arch-th-empty">⚠ file danneggiato</div></div>
              <div class="arch-name">Tavola illeggibile (${escAttr(t.id)})</div>
              <div class="arch-sub">${t.versions > 1 ? 'si può recuperare dall\'ultima delle ' + t.versions + ' versioni salvate' : (t.versions === 1 ? 'si può recuperare dalla versione salvata in precedenza' : 'nessuna versione da cui recuperarla')}</div>
              <div class="arch-acts">
                ${t.versions ? `<button class="arch-open" data-arch-recupera="${escAttr(t.id)}">♻ Recupera</button>` : ''}
              </div>
            </div>`;
}
const when = t.savedAt ? new Date(t.savedAt).toLocaleString('it-IT') : '';
const chi = t.salvataDa ? 'salvata da ' + t.salvataDa : '';
const rif = [t.numero ? 'Prot. ' + t.numero : '', t.localita || ''].filter(Boolean).join(' · ');
const cnt = [(t.count != null) ? t.count + ' ogg.' : '', t.foto ? t.foto + ' foto' : ''].filter(Boolean).join(' · ');
const mine = !!t.lockUser && (t.lockMine != null ? !!t.lockMine : t.lockUser === op);
const locked = !!t.lockUser && !mine;
const thumb = t.thumb
? `<img class="arch-th" src="${escAttr(t.thumb)}" alt="">`
: '<div class="arch-th arch-th-empty">nessuna anteprima</div>';
const badge = locked
? `<div class="arch-lock" title="In uso da ${escAttr(t.lockUser)} dal ${t.lockAt ? new Date(t.lockAt).toLocaleString('it-IT') : ''}">🔒 In uso: ${escAttr(t.lockUser)}</div>`
: (mine ? '<div class="arch-lock mine">✎ Aperta da te</div>' : '');
const vbtn = t.versions ? `<button class="arch-mini" data-arch-ver="${escAttr(t.id)}">🕘 ${t.versions} versioni</button>` : '';
return `<div class="arch-card${locked ? ' locked' : ''}">
            <div class="arch-thwrap">${thumb}${badge}</div>
            <div class="arch-name">${escAttr(t.nome)}</div>
            ${rif ? `<div class="arch-rif">${escAttr(rif)}</div>` : ''}
            <div class="arch-sub">${escAttr([cnt, when].filter(Boolean).join(' · '))}</div>
            ${chi ? `<div class="arch-chi">${escAttr(chi)}</div>` : ''}
            <div class="arch-acts">
              <button class="arch-open" data-arch-open="${escAttr(t.id)}">Apri</button>
              ${vbtn}
              <button class="arch-del" data-arch-del="${escAttr(t.id)}" title="Elimina dall'archivio">🗑</button>
            </div>
          </div>`;
}).join('');
body.innerHTML = head + `<div class="arch-grid">${cards}</div>`;
this._wireArchTools();
},
_archCopie() {
const scrivi = () => {
const box = el('archCopie'); if (!box) return;
const c = this._copieStato;
if (!c) { box.textContent = ''; return; }
let t;
if (c.inCorso) t = 'copia di sicurezza di oggi in corso…';
else if (c.ultima) {
const d = new Date(c.ultima.quando), oggi = new Date().toDateString() === d.toDateString();
t = 'ultima copia di sicurezza automatica: ' + (oggi ? 'oggi alle ' + d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString('it-IT')) +
' (' + String(c.ultima.mb).replace('.', ',') + ' MB) · ' + c.conservate + ' conservate, una al giorno';
} else t = 'nessuna copia di sicurezza automatica ancora: la prima si fa al prossimo avvio con l\'archivio non vuoto';
box.innerHTML = '🛡 ' + escAttr(t) + (c.cartella ? `<span class="arch-copie-dir" title="${escAttr(c.cartella)}">in ${escAttr(c.cartella)}</span>` : '');
};
scrivi();
if (this._copieAt && Date.now() - this._copieAt < 20000) return;
this._copieAt = Date.now();
fetch('api.ashx?op=copie', { cache: 'no-store' }).then(r => r.ok ? r.json() : null)
.then(c => { if (c) { this._copieStato = c; scrivi(); } }).catch(() => {});
},
_wireArchTools() {
this._archCopie();
const q = el('archQ'), o = el('archOrd');
if (q) {
q.oninput = () => { this._archQ = q.value; const p = q.selectionStart; this.renderArchive();
const n = el('archQ'); if (n) { n.focus(); try { n.setSelectionRange(p, p); } catch (e) {} } };
}
if (o) o.onchange = () => { this._archOrd = o.value; this.renderArchive(); };
},
_archTrash() {
const body = el('archiveBody');
body.innerHTML = '<div class="arch-empty">Carico il cestino…</div>';
fetch(RS.storage.apiBase() + '?op=trash', { cache: 'no-store' })
.then(r => r.json()).then(RS.storage.riparaTesti)
.then(list => {
const head =
`<div class="arch-bar">
               <button class="arch-imp" data-act="arch-back">‹ Torna all'archivio</button>
               ${list.length ? '<button class="arch-imp danger" data-act="arch-purge-all" title="Elimina definitivamente tutto il contenuto del cestino">🗑 Svuota cestino</button>' : ''}
             </div>
             <div class="arch-note">Le tavole eliminate restano qui e possono essere ripristinate. Si perdono solo svuotando il cestino.</div>`;
if (!list.length) { body.innerHTML = head + '<div class="arch-empty">Il cestino è vuoto.</div>'; return; }
const cards = list.map(t => {
const when = t.deletedAt ? new Date(t.deletedAt).toLocaleString('it-IT') : '';
const thumb = t.thumb ? `<img class="arch-th" src="${escAttr(t.thumb)}" alt="">`
: '<div class="arch-th arch-th-empty">nessuna anteprima</div>';
return `<div class="arch-card">
                <div class="arch-thwrap">${thumb}</div>
                <div class="arch-name">${escAttr(t.nome)}</div>
                <div class="arch-sub">${escAttr((t.count != null ? t.count + ' ogg. · ' : '') + 'eliminata il ' + when)}</div>
                <div class="arch-acts">
                  <button class="arch-open" data-arch-restore="${escAttr(t.id)}">↩ Ripristina</button>
                  <button class="arch-del" data-arch-purge="${escAttr(t.id)}" title="Elimina definitivamente">🗑</button>
                </div>
              </div>`;
}).join('');
body.innerHTML = head + `<div class="arch-grid">${cards}</div>`;
})
.catch(e => { body.innerHTML = '<div class="arch-empty">Cestino non raggiungibile:<br>' + escAttr(e.message) + '</div>'; });
},
async _archRipristinaCopia() {
try { const r = await fetch(RS.storage.apiBase() + '?op=copie', { cache: 'no-store' }); if (r.ok) this._copieStato = await r.json(); } catch (e) {}
const c = this._copieStato || {};
const giorno = n => { const m = /(\d{4})-(\d{2})-(\d{2})/.exec(n); return m ? m[3] + '/' + m[2] + '/' + m[1] : n; };
const k = await this.scelta({
titolo: 'Ripristina da una copia di sicurezza',
testo: 'Le tavole contenute nella copia rientrano nell\'archivio. Se una esiste già, la versione attuale viene conservata ' +
'nella sua cronologia, da cui puoi recuperarla. Le tavole che nella copia non ci sono restano come sono.',
opzioni: (c.elenco || []).slice(0, 7).map((n, i) => ({ k: 'copia:' + n, t: '🛡 Copia automatica del ' + giorno(n), d: i === 0 ? 'la più recente' : '', primario: i === 0 }))
.concat([{ k: 'zip', t: '📦 Da un file .zip…', d: 'una copia scaricata con «Copia di sicurezza», o una copia automatica delle versioni precedenti' }])
});
if (!k) return;
const api = RS.storage.apiBase();
const fallito = e => alert('Il ripristino non è riuscito (' + e.message + ').\n\nLe tavole eventualmente già rientrate restano nell\'archivio, ' +
'e quelle che hanno sostituito sono nella loro cronologia delle versioni.');
if (k.indexOf('copia:') === 0) {
this.toast('Ripristino in corso…');
try {
const r = await fetch(api + '?op=ripristinacopia&nome=' + encodeURIComponent(k.slice(6)), { cache: 'no-store' });
const j = await r.json(); if (!r.ok || j.error) throw new Error(j.error || ('HTTP ' + r.status));
this.toast('Ripristinate ' + (j.ripristinate || 0) + ' tavole dalla copia del ' + giorno(k)); this.openArchive();
} catch (e) { fallito(e); }
return;
}
const inp = document.createElement('input');
inp.type = 'file'; inp.accept = '.zip,application/zip';
inp.onchange = async () => {
const f = inp.files && inp.files[0]; if (!f) return;
this.toast('Ripristino in corso…');
try {
const voci = await RS.storage.leggiZip(f);
let tavole = 0, fatti = 0;
for (const v of voci) {
const r = await fetch(api + '?op=ripristinafile&p=' + encodeURIComponent(v.nome), { method: 'POST', body: await v.dati() });
const j = await r.json(); if (!r.ok || j.error) throw new Error(j.error || ('HTTP ' + r.status));
if (j.esito === 'tavola') tavole++;
if (++fatti % 50 === 0) this.toast('Ripristino: ' + fatti + ' file su ' + voci.length + '…');
}
if (!fatti || (!tavole && !voci.some(v => /\.json$/i.test(v.nome)))) throw new Error('il file non sembra una copia di sicurezza di RILSIN');
this.toast('Ripristinate ' + tavole + ' tavole dalla copia di sicurezza'); this.openArchive();
} catch (e) { fallito(e); }
};
inp.click();
},
_archRecupera(id) {
if (!confirm('Recuperare la tavola dall\'ultima versione salvata leggibile?\n\n' +
'Le modifiche fatte dopo quella versione non ci sono. Il file danneggiato non viene cancellato: ' +
'resta nella cartella «danneggiati» dell\'archivio.')) return;
fetch(RS.storage.apiBase() + '?op=recupera&id=' + encodeURIComponent(id), { cache: 'no-store' })
.then(r => r.json().then(j => { if (!r.ok || j.error) throw new Error(j.error || ('HTTP ' + r.status)); return j; }))
.then(() => { this.toast('Tavola recuperata dall\'ultima versione'); this.openArchive(); })
.catch(e => alert('Recupero non riuscito: ' + e.message));
},
_archRestoreTrash(id) {
fetch(RS.storage.apiBase() + '?op=restore&id=' + encodeURIComponent(id), { cache: 'no-store' })
.then(r => r.json())
.then(() => { this.toast('Tavola ripristinata nell\'archivio'); this._archTrash(); })
.catch(e => this.toast('Errore ripristino: ' + e.message));
},
_archPurge(id) {
const tutto = !id;
const msg = tutto
? '⚠ Svuotare il cestino?\n\nLe tavole e le loro versioni saranno eliminate DEFINITIVAMENTE.\nL\'operazione non è annullabile.'
: '⚠ Eliminare DEFINITIVAMENTE questa tavola?\n\nSpariranno anche tutte le sue versioni.\nL\'operazione non è annullabile.';
if (!confirm(msg)) return;
fetch(RS.storage.apiBase() + '?op=purge' + (id ? '&id=' + encodeURIComponent(id) : ''), { cache: 'no-store' })
.then(r => r.json())
.then(() => { this.toast(tutto ? 'Cestino svuotato' : 'Tavola eliminata definitivamente'); this._archTrash(); })
.catch(e => this.toast('Errore: ' + e.message));
},
async _archBackup() {
const api = RS.storage.apiBase();
try {
this.toast('Preparo la copia di sicurezza…');
const r = await fetch(api + '?op=elencoarchivio', { cache: 'no-store' });
if (!r.ok) throw new Error('HTTP ' + r.status);
const elenco = await r.json();
if (!elenco.length) { this.toast('L\'archivio è vuoto: non c\'è niente da copiare'); return; }
const file = [];
for (let i = 0; i < elenco.length; i++) {
const f = elenco[i];
const rf = await fetch(api + '?op=filearchivio&p=' + encodeURIComponent(f.p), { cache: 'no-store' });
if (!rf.ok) continue;
file.push({ nome: f.p, dati: new Uint8Array(await rf.arrayBuffer()), data: f.t ? new Date(f.t) : new Date() });
if (i % 50 === 49) this.toast('Copia di sicurezza: ' + (i + 1) + ' file su ' + elenco.length + '…');
}
const zip = await RS.storage.creaZip(file);
const nome = 'archivio-rilsin-' + new Date().toISOString().slice(0, 10) + '.zip';
RS.exportUtil.download(zip, nome);
this.toast('Copia di sicurezza scaricata: ' + nome + ' (' + file.length + ' file)');
} catch (e) { this.toast('Impossibile creare la copia: ' + e.message); }
},
_archSetOperatore() {
const n = prompt('Nome dell\'operatore, mostrato ai colleghi quando hai una tavola aperta.\n' +
'Lascia vuoto per usare utente e PC di Windows:', RS.storage.operatore());
if (n == null) return;
RS.storage.setOperatore(n);
this.openArchive();
},
_archOpen(id) {
const t = (this._archList || []).find(x => x.id === id), nome = t ? t.nome : id;
this.confermaSostituzione('aprire «' + nome + '»').then(ok => ok ? this._prendiBlocco(id, nome) : null).then(modo => {
if (!modo) return;
return RS.storage.openRemote(id).then(doc => {
RS.storage.currentName = t ? t.nome : '';
this.markClean(); this.closeArchive();
if (modo === 'ro') { this._entraSolaLettura(this._ultimoBlocco); this.toast('Aperta in sola lettura: ' + nome); }
else { this._uscitaSolaLettura(); this._acquireLock(id); this.toast('Aperta: ' + nome); }
return this._controllaFascicolo(id, doc);
});
}).catch(e => this.toast('Impossibile aprire: ' + e.message));
},
_prendiBlocco(id, nome) {
this._ultimoBlocco = '';
return RS.storage.lockRemote(id).then(r => {
if (!r || !r.locked) return 'rw';
this._ultimoBlocco = r.by || 'un collega';
const dalle = r.at ? new Date(r.at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : '';
return this.scelta({
titolo: '🔒 Tavola in uso',
testo: '«' + nome + '» è aperta in questo momento da ' + this._ultimoBlocco + (dalle ? ' (dalle ' + dalle + ')' : '') + '.',
opzioni: [
{ k: 'ro', t: 'Apri in sola lettura', d: 'La consulti, la stampi e produci i documenti senza toccare il lavoro del collega. Se la modifichi potrai salvarla solo come nuova tavola.', primario: true },
{ k: 'forza', t: 'Prendi il controllo', d: 'Da adesso la modifichi tu. Il collega viene avvisato e non potrà più salvarla sopra: le sue modifiche non ancora salvate restano solo sul suo PC.', pericolo: true }
]
}).then(k => {
if (k === 'ro') return 'ro';
if (k === 'forza') return RS.storage.lockRemote(id, true).then(() => 'rw');
return null;
});
}).catch(() => 'rw');
},
_controllaFascicolo(id, doc) {
if (!doc || Object.prototype.hasOwnProperty.call(doc, 'fascicolo')) return Promise.resolve(false);
return fetch(RS.storage.apiBase() + '?op=fascicoloprecedente&id=' + encodeURIComponent(id), { cache: 'no-store' })
.then(r => r.ok ? r.json() : null)
.then(j => {
if (!j || !j.ver) return false;
return RS.storage.loadVersionRemote(id, j.ver).then(v => {
if (!v || !v.fascicolo || RS.storage.currentId !== id) return false;
RS.scene.fascicolo = RS.fascicolo.daDocumento(v.fascicolo);
RS.scene.emit('change');
const n = (v.fascicolo.photos || []).length;
const quando = v.savedAt ? new Date(v.savedAt).toLocaleString('it-IT') : '';
setTimeout(() => alert('Fascicolo fotografico recuperato.\n\n' +
'L\'ultimo salvataggio di questa tavola è stato fatto da una postazione con una versione precedente di RILSIN, ' +
'che non conosce il fascicolo e lo ha tolto. È stato ripreso dalla versione' + (quando ? ' del ' + quando : '') +
(n ? ', con ' + n + ' foto' : '') + '.\n\n' +
'Premi Salva per rimetterlo nell\'archivio, e fai riavviare RILSIN sulle altre postazioni perché prendano la versione aggiornata.'), 300);
return true;
});
}).catch(() => false);
},
_entraSolaLettura(da) {
this._solaLettura = { by: da || 'un collega' };
let b = el('badgeSolaLettura');
if (!b) {
b = document.createElement('div');
b.id = 'badgeSolaLettura'; b.className = 'badge-ro';
document.body.appendChild(b);
b.addEventListener('click', ev => { if (ev.target.closest('[data-ro="controllo"]')) this._prendiControllo(); });
}
b.innerHTML = `<span>🔒 <b>Sola lettura</b> — la tavola è in uso da ${escAttr(this._solaLettura.by)}</span>
        <button data-ro="controllo">Prendi il controllo</button>`;
b.hidden = false;
},
_uscitaSolaLettura() {
this._solaLettura = null;
const b = el('badgeSolaLettura'); if (b) b.hidden = true;
},
_prendiControllo() {
const id = RS.storage.currentId; if (!id) return;
const nome = RS.storage.currentName || id;
if (!confirm('Prendere il controllo di «' + nome + '»?\n\n' +
'Viene ricaricata l\'ultima versione salvata nell\'archivio e da quel momento la modifichi tu. ' +
(this._solaLettura ? this._solaLettura.by : 'Il collega') + ' verrà avvisato e non potrà più salvarla sopra.\n\n' +
'Le modifiche che hai fatto qui in sola lettura andranno perse: se ti servono, annulla e usa Salva per conservarle come nuova tavola.')) return;
RS.storage.lockRemote(id, true)
.then(() => RS.storage.openRemote(id))
.then(doc => { RS.storage.currentName = nome; this.markClean(); this._uscitaSolaLettura(); this._acquireLock(id); this.toast('Ora la tavola è tua: ' + nome); return this._controllaFascicolo(id, doc); })
.catch(e => this.toast('Impossibile prendere il controllo: ' + e.message));
},
nomeProposto() {
const m = RS.scene.meta || {};
const d = /(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(m.data || '');
const data = d ? String(d[1]).padStart(2, '0') + '/' + String(d[2]).padStart(2, '0') + '/' + d[3] : new Date().toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
let luogo = '';
try { luogo = RS.exportUtil && RS.exportUtil.viaSenzaComune ? RS.exportUtil.viaSenzaComune(m) : String(m.localita || ''); } catch (e) {}
if (!luogo) luogo = String(m.comune || '').trim();
luogo = luogo.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 50);
return 'Sinistro ' + data + (luogo ? ' ' + luogo : '');
},
salva() {
const ST = RS.storage;
if (ST.fileDisponibile()) return this._salvaFile(false);
if (!ST.useServer()) return this._salvaNelBrowser();
const nome = prompt('Nome della tavola:', ST.currentName || this.nomeProposto());
if (nome == null) return Promise.resolve(false);
ST.currentName = nome;
ST.pushVersion(true);
if (ST.useServer()) {
const p = (this._solaLettura && ST.currentId) ? this._sceltaSalvataggio(nome, this._solaLettura.by, true) : this._salvaServer(nome, {});
return Promise.resolve(p).then(() => !this._dirty);
}
try {
const d = ST.save(nome); ST.currentId = d.id;
this.markClean(); this.toast('Salvata: ' + nome);
return Promise.resolve(true);
} catch (e) { this.avvisoSalvataggio('tavola', e); return Promise.resolve(false); }
},
puoCondividere() {
if (window.RilsinAndroid && RilsinAndroid.condividi) return true;
try { return !!(navigator.canShare && navigator.canShare({ files: [new File(['{}'], 't.json', { type: 'application/json' })] })); }
catch (e) { return false; }
},
async condividiTavola() {
const ST = RS.storage;
let doc;
try { doc = await ST.docCompleto(); } catch (e) { this.toast('Condivisione non riuscita: ' + (e && e.message || e)); return; }
const nome = String(doc.nome || ST.currentName || 'Tavola').replace(/[\\/:*?"<>|]+/g, '-').trim().slice(0, 100) + '.json';
const blob = new Blob([JSON.stringify(doc)], { type: 'application/json' });
if (window.RilsinAndroid && RilsinAndroid.condividi) {
const fr = new FileReader();
fr.onload = () => RilsinAndroid.condividi(nome, String(fr.result).split(',')[1]);
fr.readAsDataURL(blob);
return;
}
try { await navigator.share({ files: [new File([blob], nome, { type: 'application/json' })], title: nome }); }
catch (e) { if (!e || e.name !== 'AbortError') this.toast('Condivisione non riuscita: usa «Esporta la tavola»'); }
},
async _salvaNelBrowser(nuova) {
const ST = RS.storage, prima = { id: ST.currentId, nome: ST.currentName };
let nome = ST.currentName;
if (nuova || !ST.currentId || !nome) {
const base = ST.currentName || this.nomeProposto();
nome = await this.chiediTesto({
titolo: nuova ? 'Salva come nuova tavola' : 'Salva la tavola',
etichetta: 'Nome', valore: nuova && ST.currentId ? base + ' (copia)' : base,
conferma: 'Salva',
nota: 'Resta in questo dispositivo. Per portarla in ufficio: Altro → ' + (this.puoCondividere() ? 'Condividi la tavola.' : 'Esporta la tavola.')
});
if (nome == null) return false;
}
ST.pushVersion(true);
if (nuova) delete ST.currentId;
try {
const d = ST.save(nome); ST.currentId = d.id; ST.currentName = nome;
this.markClean(); this.updateStatus();
this.vibra(30);
if (this.serveCopia()) {
const s = this.statoCopia();
this.toast('✓ Tavola salvata: ' + nome + '. Ultima copia di sicurezza: ' + (s.quando ? quandoBreve(s.quando) : 'mai') +
'. Conserva le tavole anche fuori dal telefono.', 9000, [{ t: '💾 Fai la copia', fn: () => this.copiaTavole() }]);
} else this.toast('✓ ' + (nuova ? 'Salvata come nuova tavola: ' : 'Tavola salvata nel dispositivo: ') + nome, 2800);
return true;
} catch (e) {
if (nuova) { if (prima.id) ST.currentId = prima.id; ST.currentName = prima.nome; }
this.avvisoSalvataggio('tavola', e);
return false;
}
},
async _salvaFile(nuovo, forza) {
const ST = RS.storage;
ST.pushVersion(true);
try {
const nome = await ST.salvaSuFile(nuovo, { forza: !!forza });
this.markClean(); this.updateStatus();
this.toast('Salvata nel file «' + nome + '»');
return true;
} catch (e) {
if (e && e.annullato) return false;
if (e && e.codice === 'scrittura') {
const k = await this.scelta({
titolo: '⚠ Salvataggio non riuscito',
testo: 'Non sono riuscito a scrivere «' + e.file + '»: forse il file è occupato in questo momento (antivirus, copia in corso, aperto su un altro PC) oppure la cartella di rete non risponde. ' +
'Il disegno non è perso: resta aperto, e nel browser c\'è la copia di riserva.',
opzioni: [
{ k: 'riprova', t: 'Riprova', d: 'Fra qualche secondo il file di solito si libera.', primario: true },
{ k: 'nuovo', t: 'Salva come nuovo file', d: 'Con la finestra «Salva con nome», anche in un\'altra cartella.' }
]
});
if (k === 'riprova') return this._salvaFile(false, forza);
if (k === 'nuovo') return this._salvaFile(true);
return false;
}
if (e && e.codice === 'cambiato') {
const k = await this.scelta({
titolo: '⚠ Il file è cambiato da quando l\'hai aperto',
testo: 'L\'ha salvato ' + e.da + ' ' + quandoBreve(e.quando) + ' («' + e.file + '»). ' +
'Se lo sovrascrivi, la sua versione resta recuperabile da Apri → Versioni precedenti, ma solo su questo PC.',
opzioni: [
{ k: 'nuovo', t: 'Salva come nuovo file', d: 'Il tuo lavoro va in un file a parte: il suo resta com\'è.', primario: true },
{ k: 'forza', t: 'Sovrascrivi comunque', d: 'La tua versione prende il posto della sua.', pericolo: true }
]
});
if (k === 'nuovo') return this._salvaFile(true);
if (k === 'forza') return this._salvaFile(false, true);
return false;
}
if (e && e.codice === 'build') {
const k = await this.scelta({
titolo: '🔒 Salvataggio fermato',
testo: '«' + e.file + '» è stato salvato con RILSIN build ' + e.build + ', questo PC ha la build ' + RS.BUILD +
': sovrascrivendolo si potrebbero perdere dati che questa versione non conosce. Aggiorna RILSIN (chiudi la finestra e riaprila dal collegamento) oppure salva il tuo lavoro in un file nuovo.',
opzioni: [{ k: 'nuovo', t: 'Salva come nuovo file', d: 'Il file del collega resta com\'è.', primario: true }]
});
return k === 'nuovo' ? this._salvaFile(true) : false;
}
alert('Salvataggio non riuscito: ' + (e && e.message || e) + '\n\nIl disegno non è perso: resta aperto, e nel browser c\'è la copia di riserva. ' +
'Riprova, oppure usa «Salva come» per salvarlo in un\'altra cartella.');
return false;
}
},
async _apriFileDialog() {
const ST = RS.storage;
if (!(await this.confermaSostituzione('aprire un\'altra tavola'))) return;
const rec = await ST.fileRecenti(), locali = ST.list(), conVersioni = await ST.tavoleConVersioni();
const k = await this.scelta({
titolo: 'Apri tavola',
testo: rec.length ? 'Una tavola usata di recente, oppure un altro file (anche di un collega, nella cartella condivisa).'
: 'Scegli il file della tavola, per esempio nella cartella condivisa.',
opzioni: rec.map((r, i) => ({ k: 'r' + i, t: '🕘 ' + r.nome, d: r.h.name + ' · ' + quandoBreve(r.quando) }))
.concat([{ k: 'altro', t: '📂 Apri un altro file…', d: 'con la finestra «Apri» di Windows', primario: !rec.length }])
.concat(conVersioni.length ? [{ k: 'versioni', t: '⏪ Versioni precedenti…', d: 'com\'erano le tavole prima degli ultimi salvataggi, conservate su questo PC' }] : [])
.concat(locali.length ? [{ k: 'browser', t: '🗂 Tavole salvate nel browser', d: locali.length + ' salvate con le versioni precedenti di RILSIN, in questo browser' }] : [])
});
if (!k) return;
if (k === 'browser') { this._dirty = false; return this._apriDalBrowser(); }
if (k === 'versioni') return this._apriVersioneFile(conVersioni);
try {
await this._apriLetto(await ST.leggiFile(k === 'altro' ? null : rec[+k.slice(1)].h));
} catch (e) {
if (!(e && e.name === 'AbortError')) alert('Impossibile aprire la tavola: ' + (e && e.message || e));
}
},
async apriFileDaWindows(h) {
const ST = RS.storage;
if (!h || !ST.fileDisponibile()) return;
if (RS.home && RS.home.hide) RS.home.hide(true);
if (!(await this.confermaSostituzione('aprire «' + h.name + '»'))) return;
try { await this._apriLetto(await ST.leggiFile(h, true)); }
catch (e) { alert('Impossibile aprire «' + h.name + '»: ' + (e && e.message || e)); }
},
async _apriLetto(l) {
const ST = RS.storage;
{
let copia = false;
if (l.build) {
const b = await this.scelta({
titolo: '⟳ Tavola salvata con una versione più nuova',
testo: '«' + l.h.name + '» è stata salvata con RILSIN build ' + l.build + ' da ' + l.da + ', ' + quandoBreve(l.mod) +
'. Questo PC ha la build ' + RS.BUILD + ': potrebbe non conoscere alcuni dati della tavola e perderli salvando.',
opzioni: [
{ k: 'aggiorna', t: 'Aggiorna RILSIN', d: 'Ricarica l\'app: se nella cartella c\'è già la versione nuova, si aggiorna subito. Se resta vecchia, va aggiornata la copia di questo PC.', primario: true },
{ k: 'consulta', t: 'Apri solo per consultare', d: 'Puoi guardarla e stamparla; Salva è fermato, Salva come resta possibile.' }
]
});
if (!b) return;
if (b === 'aggiorna') { this._dirty = false; location.reload(); return; }
}
if (l.collega) {
const min = Math.max(1, Math.round((Date.now() - l.mod) / 60000));
const c = await this.scelta({
titolo: '👥 Tavola di un collega',
testo: '«' + l.h.name + '» è stata salvata ' + min + (min === 1 ? ' minuto' : ' minuti') + ' fa da ' + l.da +
', da un altro PC: potrebbe averla ancora aperta. Se la modificate in due, al salvataggio RILSIN avvisa chi salva per secondo.',
opzioni: [
{ k: 'apri', t: 'Apri comunque', d: 'Ti accordi con il collega su chi la modifica.', primario: true },
{ k: 'copia', t: 'Apri una copia', d: 'Lavori su una tavola a parte, che salverai come nuovo file: la sua non si tocca.' }
]
});
if (!c) return;
copia = c === 'copia';
}
const nome = await ST.apriLetto(l, copia);
await new Promise(r => setTimeout(r, 0));
if (RS.fascicolo && RS.fascicolo._coda) await RS.fascicolo._coda;
RS.scene.fit(); this.markClean(); this.updateStatus(); this.renderProps(); this.renderLegend();
this.toast(copia ? 'Aperta una copia di «' + nome + '»: con Salva scegli dove metterla' : 'Aperta: ' + nome);
}
},
async _apriVersioneFile(tavole) {
const ST = RS.storage;
let id = tavole[0].id;
if (tavole.length > 1) {
const ki = await this.scelta({
titolo: '⏪ Versioni precedenti',
testo: 'Di quale tavola? (Le versioni sono conservate su questo PC, nel browser.)',
opzioni: tavole.slice(0, 15).map((t, i) => ({ k: 'i' + i, t: t.nome, d: t.n + (t.n === 1 ? ' versione' : ' versioni') + ' · l\'ultima ' + quandoBreve(t.ultima) }))
});
if (!ki) return;
id = tavole[+ki.slice(1)].id;
}
const vv = await ST.versioniDi(id);
if (!vv.length) return this.toast('Nessuna versione conservata per questa tavola');
const kv = await this.scelta({
titolo: '⏪ ' + (vv[0].nome || 'Versioni precedenti'),
testo: 'Com\'era il file prima dei salvataggi successivi, dalla più recente. Si apre al posto della tavola aperta: il file non cambia finché non salvi.',
opzioni: vv.map((v, i) => ({ k: 'v' + i, t: quandoBreve(v.quando), d: (v.da ? 'salvata da ' + v.da + ' · ' : '') + v.n + (v.n === 1 ? ' oggetto' : ' oggetti') }))
});
if (!kv) return;
try {
ST.apriVersione(id, vv[+kv.slice(1)]);
await new Promise(r => setTimeout(r, 0));
if (RS.fascicolo && RS.fascicolo._coda) await RS.fascicolo._coda;
RS.scene.fit(); this.updateStatus(); this.renderProps(); this.renderLegend();
this._dirty = true; document.title = '● RILSIN — rilievo sinistri';
this.toast('Versione del ' + quandoBreve(vv[+kv.slice(1)].quando) + ' aperta: salva per tenerla', 6000);
} catch (e) { alert('Impossibile aprire la versione: ' + (e && e.message || e)); }
},
confermaSostituzione(azione) {
if (!this._dirty) return Promise.resolve(true);
const nome = RS.storage.currentName ? ' «' + RS.storage.currentName + '»' : '';
return this.scelta({
titolo: '✎ Modifiche non salvate',
testo: 'La tavola aperta' + nome + ' ha modifiche non salvate, nel disegno o nel fascicolo fotografico. Che cosa vuoi fare prima di ' + azione + '?',
opzioni: [
{ k: 'salva', t: 'Salva prima', d: 'Salvi la tavola aperta, poi si prosegue.', primario: true },
{ k: 'perdi', t: 'Prosegui senza salvare', d: 'Le modifiche non salvate, comprese le foto aggiunte al fascicolo, andranno perse.', pericolo: true }
]
}).then(k => {
if (k === 'salva') return this.salva();
return k === 'perdi';
});
},
salvaCome() {
const ST = RS.storage;
if (ST.fileDisponibile()) return this._salvaFile(true);
if (!ST.useServer()) return this._salvaNelBrowser(true);
const base = ST.currentName || this.nomeProposto();
const n = prompt('Nome della nuova tavola:' + (ST.currentId ? '\n(la tavola aperta resta com\'è nell\'archivio)' : ''),
ST.currentId ? base + ' (copia)' : base);
if (n == null || !n.trim()) return;
const prima = { id: ST.currentId, nome: ST.currentName };
ST.pushVersion(true);
delete ST.currentId;
if (ST.useServer()) {
this._salvaServer(n.trim(), {}).then(() => {
if (!ST.currentId) { if (prima.id) ST.currentId = prima.id; ST.currentName = prima.nome; }
});
} else {
try {
const d = ST.save(n.trim()); ST.currentId = d.id; ST.currentName = n.trim();
this.markClean(); this.toast('Salvata come nuova tavola: ' + n.trim());
} catch (e) {
if (prima.id) ST.currentId = prima.id; ST.currentName = prima.nome;
this.avvisoSalvataggio('tavola', e);
}
}
},
_salvaServer(nome, opz) {
this.toast('Salvataggio sul server…');
return RS.storage.saveRemote(nome, opz).then(d => {
RS.storage.currentId = d.id; RS.storage.currentName = nome;
this.markClean(); this.salvataggioRiuscito('server');
this._uscitaSolaLettura();
if (this._lockId !== d.id) this._acquireLock(d.id);
this.toast('Salvata nell\'archivio condiviso: ' + nome);
}).catch(e => {
if (e && e.codice === 'in_uso') return this._sceltaSalvataggio(nome, e.da, false);
this.avvisoSalvataggio('server', e);
});
},
_sceltaSalvataggio(nome, da, giaSaputo) {
return this.scelta({
titolo: '🔒 Tavola in uso',
testo: (giaSaputo ? 'Hai aperto «' + nome + '» in sola lettura' : '«' + nome + '» è stata aperta nel frattempo') +
': ora è in uso da ' + (da || 'un collega') + '.',
opzioni: [
{ k: 'nuova', t: 'Salva come nuova tavola', d: 'Il tuo lavoro va in una tavola a parte, con lo stesso fascicolo: nessuno perde nulla.', primario: true },
{ k: 'forza', t: 'Sovrascrivi comunque', d: 'La tua versione prende il posto della sua. Quella precedente resta recuperabile dalla cronologia delle versioni.', pericolo: true }
]
}).then(k => {
if (k === 'nuova') {
const n = prompt('Nome della nuova tavola:', nome + ' (copia)');
if (n == null) return;
delete RS.storage.currentId;
this._lockId = null;
return this._salvaServer(n, {});
}
if (k === 'forza') return this._salvaServer(nome, { forza: true });
});
},
scelta(opz) {
return new Promise(fine => {
let m = el('sceltaModal');
if (!m) {
m = document.createElement('div'); m.id = 'sceltaModal'; m.className = 'scelta-velo';
document.body.appendChild(m);
}
m.innerHTML = `<div class="scelta-box" role="dialog" aria-modal="true">
            <div class="scelta-tit">${escAttr(opz.titolo || '')}</div>
            ${opz.html || `<p class="scelta-testo">${escAttr(opz.testo || '')}</p>`}
            ${opz.cerca ? `<input class="scelta-campo scelta-cerca" type="search" placeholder="${escAttr(opz.cerca.segnaposto || 'Cerca…')}" aria-label="Cerca">` : ''}
            ${(opz.opzioni || []).map(o => `<button class="scelta-opt${o.primario ? ' primario' : ''}${o.pericolo ? ' pericolo' : ''}" data-k="${escAttr(o.k)}">
                <b>${escAttr(o.t)}</b>${o.d ? `<small>${escAttr(o.d)}</small>` : ''}</button>`).join('')}
            <button class="scelta-annulla" data-k="">Annulla</button>
          </div>`;
m.hidden = false;
const chiudi = (k) => { m.hidden = true; document.removeEventListener('keydown', esc); fine(k || null); };
const esc = (ev) => { if (ev.key === 'Escape') chiudi(null); };
document.addEventListener('keydown', esc);
m.onclick = (ev) => {
if (ev.target === m) { chiudi(null); return; }
const b = ev.target.closest('[data-k]'); if (b) chiudi(b.dataset.k);
};
const cerca = m.querySelector('.scelta-cerca');
if (cerca) {
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const testi = opz.cerca.testi || {};
cerca.oninput = () => {
const parole = norm(cerca.value).split(/\s+/).filter(Boolean);
m.querySelectorAll('.scelta-opt').forEach(b => {
const t = testi[b.dataset.k]; if (t == null) return;
b.hidden = parole.length > 0 && !parole.every(p => norm(t).indexOf(p) >= 0);
});
};
}
const primo = m.querySelector('.scelta-opt.primario') || m.querySelector('.scelta-opt');
if (primo && !cerca) primo.focus();
});
},
chiediTesto(opz) {
return new Promise(fine => {
let m = el('sceltaModal');
if (!m) {
m = document.createElement('div'); m.id = 'sceltaModal'; m.className = 'scelta-velo';
document.body.appendChild(m);
}
m.innerHTML = `<div class="scelta-box" role="dialog" aria-modal="true">
            <div class="scelta-tit">${escAttr(opz.titolo || '')}</div>
            ${opz.testo ? `<p class="scelta-testo">${escAttr(opz.testo)}</p>` : ''}
            <label class="scelta-etich">${escAttr(opz.etichetta || 'Nome')}
              <input class="scelta-campo" value="${escAttr(opz.valore || '')}" placeholder="${escAttr(opz.segnaposto || '')}"></label>
            <button class="scelta-opt primario" data-k="ok"><b>${escAttr(opz.conferma || 'OK')}</b>${opz.nota ? `<small>${escAttr(opz.nota)}</small>` : ''}</button>
            <button class="scelta-annulla" data-k="">Annulla</button>
          </div>`;
m.hidden = false;
const campo = m.querySelector('.scelta-campo');
const chiudi = (v) => { m.hidden = true; document.removeEventListener('keydown', tasti); fine(v); };
const conferma = () => { const v = campo.value.trim(); if (!v) { campo.focus(); campo.classList.add('vuoto'); return; } chiudi(v); };
const tasti = (ev) => { if (ev.key === 'Escape') chiudi(null); else if (ev.key === 'Enter' && document.activeElement === campo) { ev.preventDefault(); conferma(); } };
document.addEventListener('keydown', tasti);
campo.oninput = () => campo.classList.remove('vuoto');
m.onclick = (ev) => {
if (ev.target === m) { chiudi(null); return; }
const b = ev.target.closest('[data-k]'); if (!b) return;
if (b.dataset.k === 'ok') conferma(); else chiudi(null);
};
setTimeout(() => { campo.focus(); campo.select(); }, 30);
});
},
_archDel(id) {
const t = (this._archList || []).find(x => x.id === id);
if (!confirm('Eliminare "' + (t ? t.nome : id) + '" dall\'archivio condiviso?\n\nLa tavola finisce nel Cestino: potrai ripristinarla da lì.')) return;
RS.storage.deleteRemote(id)
.then(() => { this.toast('Spostata nel cestino — puoi ripristinarla da 🗑 Cestino'); this.openArchive(); })
.catch(e => this.toast('Errore: ' + e.message));
},
_archVersions(id) {
const body = el('archiveBody'), t = (this._archList || []).find(x => x.id === id);
body.innerHTML = '<div class="arch-empty">Carico la cronologia…</div>';
RS.storage.versionsRemote(id).then(vers => {
const head = `<div class="arch-bar"><button class="arch-imp" data-act="arch-back">← Archivio</button>
          <div class="arch-op">Versioni di “${escAttr(t ? t.nome : id)}”</div></div>`;
if (!vers.length) { body.innerHTML = head + '<div class="arch-empty">Nessuna versione precedente. Le versioni si creano ad ogni salvataggio.</div>'; return; }
const rows = vers.map(v => {
const when = v.savedAt ? new Date(v.savedAt).toLocaleString('it-IT') : verLabel(v.ver);
return `<div class="arch-vrow">
             <div class="arch-vinfo"><b>${escAttr(when)}</b><span>${escAttr([v.count != null ? v.count + ' ogg.' : '', v.salvataDa ? 'salvata da ' + v.salvataDa : ''].filter(Boolean).join(' · '))}</span></div>
             <button class="arch-open" data-arch-vrestore="${escAttr(id)}|${escAttr(v.ver)}">Ripristina</button>
           </div>`;
}).join('');
body.innerHTML = head + `<div class="arch-vlist">${rows}</div>`;
}).catch(e => this.toast('Errore cronologia: ' + e.message));
},
_archRestore(id, ver) {
const t = (this._archList || []).find(x => x.id === id);
this.confermaSostituzione('aprire questa versione').then(ok => ok ? this._prendiBlocco(id, t ? t.nome : id) : null).then(modo => {
if (!modo) return;
return RS.storage.loadVersionRemote(id, ver).then(doc => {
RS.scene.load(doc);
RS.storage.currentId = id; RS.storage.currentName = doc.nome || '';
this.markClean(); this.closeArchive();
if (modo === 'ro') { this._entraSolaLettura(this._ultimoBlocco); this.toast('Versione aperta in sola lettura: per conservarla salvala come nuova tavola'); }
else { this._uscitaSolaLettura(); this._acquireLock(id); this.toast('Versione ripristinata — premi Salva per confermarla come attuale'); }
});
}).catch(e => this.toast('Errore ripristino: ' + e.message));
},
_acquireLock(id) {
if (this._lockId && this._lockId !== id) RS.storage.unlockRemote(this._lockId);
if (this._lockHb) clearInterval(this._lockHb);
this._lockId = id;
this._lockHb = setInterval(() => this._rinnovaBlocco(), 5 * 60 * 1000);
},
_rinnovaBlocco() {
if (!this._lockId) return;
RS.storage.lockRemote(this._lockId).then(r => { if (r && r.locked) this._bloccoPerso(r.by); }).catch(() => {});
},
_bloccoPerso(da) {
if (this._lockHb) { clearInterval(this._lockHb); this._lockHb = null; }
this._lockId = null;
this._entraSolaLettura(da);
alert((da || 'Un collega') + ' ha preso il controllo di questa tavola.\n\n' +
'Le modifiche che hai fatto dopo l\'ultimo salvataggio NON sono nell\'archivio. ' +
'Per conservarle premi Salva: ti verrà proposto di salvarle come nuova tavola.');
},
_releaseLock() {
if (this._lockId) { RS.storage.unlockRemote(this._lockId); this._lockId = null; }
if (this._lockHb) { clearInterval(this._lockHb); this._lockHb = null; }
},
initMinimap() {
this.mm = el('minimap'); if (!this.mm) return;
const nav = ev => { if (ev.buttons || ev.type === 'mousedown') this._mmNav(ev); };
this.mm.addEventListener('mousedown', nav);
this.mm.addEventListener('mousemove', nav);
RS.scene.on('view', () => this.updateMinimap());
RS.scene.on('change', () => this.updateMinimap());
},
toggleMinimap(btn) {
const on = this.mm.hidden;
this.mm.hidden = !on;
if (btn) btn.classList.toggle('on', on);
try { localStorage.setItem('rilsin:minimap', on ? '1' : '0'); } catch (e) {}
if (on) this.updateMinimap();
},
updateMinimap() {
const S = RS.scene, wrap = this.mm; if (!wrap || wrap.hidden) return;
let b = S.contentBounds() || { x: 0, y: 0, w: S.world.w, h: S.world.h };
const pad = Math.max(b.w, b.h) * 0.08 + 1;
b = { x: b.x - pad, y: b.y - pad, w: b.w + 2 * pad, h: b.h + 2 * pad };
const NS = 'http://www.w3.org/2000/svg';
const svg = document.createElementNS(NS, 'svg');
svg.setAttribute('viewBox', `${b.x} ${b.y} ${b.w} ${b.h}`);
svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
const bg = document.createElementNS(NS, 'rect');
bg.setAttribute('x', b.x); bg.setAttribute('y', b.y); bg.setAttribute('width', b.w); bg.setAttribute('height', b.h);
bg.setAttribute('fill', '#f4f1e8'); svg.appendChild(bg);
svg.appendChild(S.gElements.cloneNode(true));
const v = S.view, vr = document.createElementNS(NS, 'rect');
vr.setAttribute('x', v.x); vr.setAttribute('y', v.y); vr.setAttribute('width', v.w); vr.setAttribute('height', v.h);
vr.setAttribute('class', 'mm-view'); svg.appendChild(vr);
const old = wrap.querySelector('svg'); if (old) old.remove();
wrap.appendChild(svg);
this._mmSvg = svg;
},
_mmNav(ev) {
const svg = this._mmSvg; if (!svg) return;
ev.preventDefault();
const pt = svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY;
const w = pt.matrixTransform(svg.getScreenCTM().inverse());
const S = RS.scene, v = S.view;
S.view = { x: w.x - v.w / 2, y: w.y - v.h / 2, w: v.w, h: v.h };
S._applyView();
},
mobPanel(which, force) {
const pal = el('palette'), pro = el('props'), scrim = el('mobScrim');
if (!pal || !pro) return;
const target = which === 'props' ? pro : pal;
const altro  = which === 'props' ? pal : pro;
const apri = (force != null) ? force : !target.classList.contains('mob-open');
const mm = el('mobMenu'); if (mm) mm.hidden = true;
altro.classList.remove('mob-open');
target.classList.toggle('mob-open', apri);
if (scrim) scrim.hidden = !apri;
const b = document.querySelector('[data-act="mob-' + (which === 'props' ? 'props' : 'palette') + '"]');
document.querySelectorAll('.mobbtn').forEach(x => x.classList.remove('on'));
if (b && apri) b.classList.add('on');
},
mobClose() {
['palette', 'props'].forEach(id => { const n = el(id); if (n) n.classList.remove('mob-open'); });
const s = el('mobScrim'); if (s) s.hidden = true;
const m = el('mobMenu'); if (m) m.hidden = true;
document.querySelectorAll('.mobbtn').forEach(x => x.classList.remove('on'));
},
initTelefono() {
let acceso = false, lock = null;
const vis = id => { const n = el(id); return !!(n && !n.hidden); };
setInterval(() => {
const serve = !document.hidden && (vis('skBar') || vis('gmVelo') || vis('fgVelo'));
if (serve === acceso) return;
acceso = serve;
if (window.RilsinAndroid && RilsinAndroid.schermoAcceso) { try { RilsinAndroid.schermoAcceso(serve); } catch (e) {} return; }
try {
if (serve && navigator.wakeLock) navigator.wakeLock.request('screen').then(l => { if (acceso) lock = l; else l.release(); }).catch(() => {});
else if (!serve && lock) { lock.release(); lock = null; }
} catch (e) {}
}, 1500);
},
vibra(schema) {
try {
if (window.RilsinAndroid && RilsinAndroid.vibra) RilsinAndroid.vibra(String(schema));
else if (navigator.vibrate) navigator.vibrate(String(schema).split(',').map(Number));
} catch (e) {}
},
tastoIndietro() {
const vis = id => { const n = el(id); return !!(n && !n.hidden); };
const sc = el('sceltaModal');
if (sc && !sc.hidden) { const a = sc.querySelector('.scelta-annulla'); if (a) a.click(); else sc.hidden = true; return 'si'; }
if (RS.menuContesto && RS.menuContesto._box) { RS.menuContesto.chiudi(); return 'si'; }
if (vis('firstSetup')) { const s = el('fsSkip'); if (s) s.click(); return 'si'; }
if (vis('panoRipresa') && RS.panorama) { RS.panorama.chiudiRipresa(); return 'si'; }
if (vis('panoViewer') && RS.panorama) { RS.panorama.chiudi(); return 'si'; }
if (vis('ritaglioOv')) { const a = el('ritaglioOv').querySelector('[data-r="annulla"]'); if (a) a.click(); return 'si'; }
if (vis('coach')) { this.coachEnd(); return 'si'; }
const mod = Array.from(document.querySelectorAll('.modal')).filter(m => !m.hidden).pop();
if (mod) { const x = mod.querySelector('.modal-x'); if (x) x.click(); if (!mod.hidden) mod.hidden = true; return 'si'; }
if (vis('fgVelo') && RS.fotoGuidate) { RS.fotoGuidate.chiudi(); return 'si'; }
if (vis('gmVelo')) { this._gmTasto('chiudi'); return 'si'; }
if (vis('mobScrim') || vis('mobMenu')) { this.mobClose(); return 'si'; }
const menu = document.querySelector('.tb-menu:not([hidden])'); if (menu) { menu.hidden = true; return 'si'; }
if (vis('triPanel')) { if (this._triClosePanel) this._triClosePanel(); el('triPanel').hidden = true; return 'si'; }
if (vis('layersPanel')) { el('layersPanel').hidden = true; return 'si'; }
if (RS.coinvolti && RS.coinvolti.aperto()) { RS.coinvolti.indietro(); return 'si'; }
if (vis('fascicolo') && RS.fascicolo) { RS.fascicolo.act('back'); return 'si'; }
if (vis('home')) {
this.scelta({ titolo: 'Uscire da RILSIN?', testo: 'Il disegno aperto resta salvato nel telefono: alla prossima apertura lo ritrovi.',
opzioni: [{ k: 'esci', t: 'Esci', primario: true }] })
.then(k => { if (k === 'esci' && window.RilsinAndroid && RilsinAndroid.esci) RilsinAndroid.esci(); });
return 'si';
}
const T = RS.tools, sk = RS.sketch && RS.sketch.auto;
if ((sk && sk._aperta) || (T && T.active && T.active.mode && T.active.mode !== 'select')) { T.fine(); return 'si'; }
if (RS.scene.selection && RS.scene.selection.length) { RS.scene.select([]); return 'si'; }
if (RS.home) RS.home.showMenu();
return 'si';
},
mobMenu() {
const m = el('mobMenu'), s = el('mobScrim');
if (!m) return;
const apri = m.hidden;
['palette', 'props'].forEach(id => { const n = el(id); if (n) n.classList.remove('mob-open'); });
m.hidden = !apri;
if (s) s.hidden = !apri;
document.querySelectorAll('.mobbtn').forEach(x => x.classList.remove('on'));
const b = document.querySelector('[data-act="mob-menu"]');
if (b && apri) b.classList.add('on');
if (!apri) return;
m.querySelectorAll('[data-act]').forEach(x => {
const orig = document.querySelector('.topbar .tgl[data-act="' + x.dataset.act + '"]');
x.classList.toggle('on', !!(orig && orig.classList.contains('on')));
});
const sc = el('scalaMob'); if (sc) sc.value = el('scala').value;
m.scrollTop = 0;
},
isMobile() { return window.matchMedia('(max-width:820px), (max-height:500px)').matches; },
riprendiBozza() {
try {
const a = RS.storage.getAutosave();
const conFoto = a && a.fascicolo && a.fascicolo.photos && a.fascicolo.photos.length;
if (!a || ((!a.elements || !a.elements.length) && !conFoto && !RS.storage.nCoinvolti(a))) return false;
RS.scene.load(a);
if (a.bozzaId) RS.storage.togliBozza(a.bozzaId);
RS.storage.currentName = a.autoNome || a.nome || '';
if (a.autoId) RS.storage.currentId = a.autoId;
RS.scene.fit();
this._dirty = true;
setTimeout(() => this.toast('Ripreso il disegno lasciato in sospeso'), 700);
return true;
} catch (e) { return false; }
},
startSchizzo(btn) {
const def = RS.catalog.TRACCE.find(x => x.tool === 'freehand');
RS.tools.setTool({ mode: 'freehand', tool: 'freehand', def });
document.querySelectorAll('.pal-item.active').forEach(n => n.classList.remove('active'));
if (this.mobClose) this.mobClose();
},
localitaDalleVie() { localitaDalleVie(); },
toggleOrient(btn) {
const oriz = !document.body.classList.contains('oriz');
document.body.classList.toggle('oriz', oriz);
if (btn) btn.classList.toggle('on', oriz);
const verso = oriz ? 'landscape' : 'portrait';
try {
if (window.RilsinAndroid && RilsinAndroid.orientamento) RilsinAndroid.orientamento(verso);
else if (screen.orientation && screen.orientation.lock) screen.orientation.lock(verso).catch(() => {});
} catch (e) {}
this.toast(oriz ? 'Tavola in orizzontale' : 'Tavola in verticale');
setTimeout(() => { try { RS.scene.fit(); } catch (e) {} }, 350);
},
togglePan(btn) {
const on = !(RS.tools.active && RS.tools.active.mode === 'pan');
if (on) {
RS.tools.setTool({ mode: 'pan' });
document.querySelectorAll('.pal-item.active').forEach(n => n.classList.remove('active'));
this.toast('Sposta tavola: trascina per muoverti sul disegno (Esc per tornare a Seleziona)');
} else RS.tools.toSelect();
this.syncPanBtn();
},
syncPanBtn() {
const on = !!(RS.tools.active && RS.tools.active.mode === 'pan');
document.querySelectorAll('[data-act="pan"]').forEach(b => b.classList.toggle('on', on));
document.body.classList.toggle('panning', on);
},
togglePresent(btn) {
const on = document.body.classList.toggle('present');
if (btn) btn.classList.toggle('on', on);
this.toast(on ? 'Modalità presentazione: griglia e maniglie nascoste' : 'Modalità normale');
},
startRuler(btn) {
RS.tools.setTool({ mode: 'ruler' });
document.querySelectorAll('.pal-item.active').forEach(n => n.classList.remove('active'));
this.toast('Righello rapido: trascina da un punto all\'altro per misurare («Fine» o Esc per uscire)');
},
startTriangulate() {
const caps = RS.scene.elements.filter(e => e.letter);
if (caps.length < 2) { this.toast('Servono almeno due capisaldi sul disegno (tavolozza → Misure e note → Caposaldo)'); return; }
this._triC = { A: null };
this._triClosePanel();
RS.tools.setTool({ mode: 'triangulate' });
this.toast('Triangolazione: clicca il 1° caposaldo di riferimento');
},
triCanvasClick(cel, w) {
const sc = this._triScelta;
if (sc) {
const ppm = RS.scene.pxPerMeter(), vicino = w && sc.punti.map(p => Math.hypot(p.x - w.x, p.y - w.y)).map(d => d * ppm <= 22);
const i = vicino ? vicino.indexOf(true) : -1;
if (i >= 0) this._triPiazza(i);
else this.toast('Clicca uno dei due punti possibili, oppure premi Invio per quello proposto');
return;
}
if (!cel || !cel.letter) { this.toast('Clicca su un CAPOSALDO (rombo con lettera)'); return; }
const t = this._triC || (this._triC = { A: null });
if (!t.A) { t.A = cel; this.toast('Bene: caposaldo ' + cel.letter + '. Ora clicca il 2° caposaldo'); return; }
if (cel.id === t.A.id) { this.toast('Scegli un caposaldo DIVERSO dal primo'); return; }
t.B = cel;
this._triOpenPanel(t.A, t.B);
},
_triOpenPanel(A, B) {
const p = el('triPanel');
const bers = triBersagli();
let cosa = this._triCosa || 'punto';
if (cosa === 'spigolo' && !bers.length) cosa = 'punto';
const metodo = cosa === 'spigolo' ? 'dist' : (this._triMetodo || 'dist');
let bk = this._triBersaglio;
if (!bers.some(b => b.k === bk)) bk = (bers.find(b => !triMisurato(A.letter, b.k) || !triMisurato(B.letter, b.k)) || bers[0] || {}).k;
const a = escAttr(A.letter), b = escAttr(B.letter), dist = metodo === 'dist';
p.innerHTML =
`<div class="pop-head">📐 Rilievo dalla base ${a}–${b}</div>
         <div class="tri-row tri-base"><label>Base ${a}–${b} misurata sul posto (m) <span id="triBaseDis"></span></label>
           <input id="triBase" class="pop-input" type="number" step="0.01" min="0" inputmode="decimal" value="${baseMisurata(A, B) || ''}" placeholder="es. 6,20"></div>
         <div id="triBaseMsg" class="tri-msg info"></div>
         <div class="tri-cap">Che cosa rilevi</div>
         <div class="tri-seg" data-seg="cosa">
           <button data-v="punto" class="${cosa === 'punto' ? 'on' : ''}">Punto P${nextSurveyN()}</button>
           <button data-v="cap" class="${cosa === 'cap' ? 'on' : ''}">Caposaldo ${escAttr(prossimaLettera())}</button>
           <button data-v="spigolo" class="${cosa === 'spigolo' ? 'on' : ''}"${bers.length ? '' : ' disabled title="Numera prima i punti del veicolo: Proprietà del veicolo → Numera punti rilievo"'}>Spigolo veicolo</button>
         </div>
         ${cosa === 'spigolo' ? `<div class="tri-row"><label>Punto del veicolo</label><select id="triBers" class="pop-input">${bers.map(x =>
`<option value="${escAttr(x.k)}"${x.k === bk ? ' selected' : ''}>${escAttr(x.k)} — veicolo ${escAttr(x.label)}, punto ${x.n}${triMisurato(A.letter, x.k) && triMisurato(B.letter, x.k) ? ' ✓' : ''}</option>`).join('')}</select></div>` : ''}
         <div class="tri-cap">Metodo</div>
         <div class="tri-seg" data-seg="metodo">
           <button data-v="dist" class="${dist ? 'on' : ''}">Due distanze</button>
           <button data-v="ort" class="${dist ? '' : 'on'}"${cosa === 'spigolo' ? ' disabled title="Per gli spigoli dei veicoli servono le due distanze"' : ''}>Ascissa e ordinata</button>
         </div>
         <div class="tri-row"><label>${dist ? 'Distanza da ' + a : 'Ascissa da ' + a + ', lungo la base ' + a + '→' + b} (m)</label><input id="triCanA" class="pop-input" type="number" step="0.01" inputmode="decimal"></div>
         <div class="tri-row"><label>${dist ? 'Distanza da ' + b : 'Ordinata, perpendicolare alla base'} (m)</label><input id="triCanB" class="pop-input" type="number" step="0.01" min="0" inputmode="decimal"></div>
         ${dist ? '' : `<div class="tri-row"><label>Controllo: distanza da ${b} (m, facoltativa)</label><input id="triCtrl" class="pop-input" type="number" step="0.01" min="0" inputmode="decimal"></div>`}
         <div id="triQual" class="tri-qual" hidden></div>
         <div id="triCanMsg" class="tri-msg info"></div>
         <div class="tri-btns"><button class="pbtn" data-tri="ok" disabled>✓ Usa il proposto</button><button class="pbtn" data-tri="cancel">Annulla</button></div>`;
const primaVolta = p.hidden;
p.hidden = false;
if (primaVolta) {
const r = el('stage') ? el('stage').getBoundingClientRect() : { right: window.innerWidth, top: 84 };
p.style.left = Math.max(8, Math.round(r.right - 290 - 12)) + 'px'; p.style.top = Math.round(r.top + 12) + 'px';
}
p.querySelectorAll('.tri-seg button').forEach(bt => bt.onclick = () => {
const seg = bt.closest('[data-seg]').dataset.seg, scritti = [el('triCanA').value, el('triCanB').value];
if (seg === 'cosa') this._triCosa = bt.dataset.v; else this._triMetodo = bt.dataset.v;
const tieni = seg === 'cosa' && (bt.dataset.v !== 'spigolo' || metodo === 'dist');
this._triOpenPanel(A, B);
if (tieni) { el('triCanA').value = scritti[0]; el('triCanB').value = scritti[1]; this._triAggiorna(A, B); }
});
const sb = el('triBers'); if (sb) sb.onchange = () => { this._triBersaglio = sb.value; this._triAggiorna(A, B); };
const ib = el('triBase');
ib.addEventListener('change', () => this._triBase(A, B));
ib.addEventListener('keydown', ev => { if (ev.key === 'Enter') { ev.preventDefault(); this._triBase(A, B); el('triCanA').focus(); } });
this._triBaseInfo(A, B);
this._triBersaglio = bk;
p.querySelector('[data-tri="ok"]').onclick = () => { if (this._triScelta) this._triPiazza(this._triScelta.prop); };
p.querySelector('[data-tri="cancel"]').onclick = () => { this._triClosePanel(); this._triC = { A: null }; this.toast('Triangolazione annullata'); };
const inA = el('triCanA'); inA.focus();
[inA, el('triCanB'), el('triCtrl')].filter(Boolean).forEach(inp => {
inp.addEventListener('input', () => this._triAggiorna(A, B));
inp.addEventListener('keydown', ev => { if (ev.key === 'Enter') { ev.preventDefault(); if (this._triScelta) this._triPiazza(this._triScelta.prop); else this._triAggiorna(A, B); } });
});
this._triAggiorna(A, B);
},
_triBase(A, B) {
const S = RS.scene, v = parseFloat(el('triBase').value);
if (!(v > 0)) return this._triBaseInfo(A, B);
const r = impostaBase(A, B, v);
S.render(); S.snapshot();
this._triBaseInfo(A, B, r.spostato);
if (this._triScelta || el('triCanA').value) this._triAggiorna(A, B);
},
_triBaseInfo(A, B, spostato) {
const L = Math.hypot(B.x - A.x, B.y - A.y), v = baseMisurata(A, B), msg = el('triBaseMsg'), dis = el('triBaseDis');
const m2 = x => x.toFixed(2).replace('.', ',');
if (dis) dis.textContent = '· sul disegno ' + m2(L);
if (!msg) return;
let t, avviso = false;
if (!v) t = 'Scrivi la base misurata con la cordella: i punti si calcolano da quella.';
else if (Math.abs(v - L) <= 0.02) t = '✓ Base registrata' + (spostato ? ': caposaldo ' + spostato + ' portato a ' + m2(v) + ' m' : '') + '.';
else { avviso = true; t = '⚠ Sul disegno la base è ' + m2(L) + ' m, misurata ' + m2(v) + ' m: da entrambi i capisaldi dipendono già altre misure, quindi non li sposto. Controlla la base, oppure usa Dati e misure → Rilievo dei punti → Allinea il disegno.'; }
if (v && (v < 2 || v > 10)) { avviso = true; t += ' ⚠ Il metodo consiglia una base fra 2 e 10 m.'; }
msg.textContent = t; msg.classList.toggle('info', !avviso);
},
_triClosePanel() {
const p = el('triPanel'); if (p) p.hidden = true;
this._triScelta = null; this._triDisegna(null);
},
_triAggiorna(A, B) {
const msg = el('triCanMsg'), ok = document.querySelector('#triPanel [data-tri="ok"]');
const dA = parseFloat(el('triCanA').value), dB = parseFloat(el('triCanB').value);
const cosa = this._triCosa === 'spigolo' && !triBersagli().length ? 'punto' : (this._triCosa || 'punto');
const ort = cosa !== 'spigolo' && this._triMetodo === 'ort';
const qual = el('triQual');
const nessuno = testo => { this._triScelta = null; this._triDisegna(null); msg.innerHTML = testo; msg.classList.toggle('info', testo.indexOf('⚠') < 0); ok.disabled = true; if (qual) qual.hidden = true; };
const L = Math.hypot(B.x - A.x, B.y - A.y);
let punti, F = null;
if (ort) {
if (isNaN(dA) || isNaN(dB) || dB < 0) return nessuno('Scrivi ascissa e ordinata: i punti possibili compaiono sulla tavola.');
if (L < 0.01) return nessuno('⚠ I due capisaldi coincidono sul disegno: non c\'è una base.');
const ux = (B.x - A.x) / L, uy = (B.y - A.y) / L;
F = { x: A.x + dA * ux, y: A.y + dA * uy };
punti = dB < 0.005 ? [F] : [1, -1].map(s => ({ x: F.x - s * dB * uy, y: F.y + s * dB * ux }));
} else {
if (isNaN(dA) || isNaN(dB) || dA <= 0 || dB <= 0) return nessuno('Scrivi le due distanze: i punti possibili compaiono sulla tavola.');
if (dA + dB <= L) return nessuno(`⚠ Distanze troppo corte: la somma (${(dA + dB).toFixed(2).replace('.', ',')} m) non supera la base (${L.toFixed(2).replace('.', ',')} m).`);
if (Math.abs(dA - dB) >= L) return nessuno('⚠ Una distanza è troppo lunga rispetto all\'altra.');
punti = [false, true].map(dx => triangulate({ x: A.x, y: A.y }, { x: B.x, y: B.y }, dA, dB, dx));
if (!punti[0] || !punti[1]) return nessuno('⚠ Le distanze non si intersecano: ricontrolla.');
}
const scelta = punti.length > 1 ? triProposto(A, B, punti, this._triLati || {}) : { i: 0, motivo: 'sulla base' };
const ic = el('triCtrl'), ctrl = ort && ic ? parseFloat(ic.value) : NaN;
this._triScelta = { A, B, dA, dB, punti, F, ort, cosa, bersaglio: cosa === 'spigolo' ? this._triBersaglio : null, prop: scelta.i, motivo: scelta.motivo,
ctrl: ctrl > 0 ? ctrl : 0 };
this._triDisegna(this._triScelta);
ok.disabled = false; msg.classList.add('info');
msg.innerHTML = punti.length < 2 ? 'Il punto è sulla base: premi <b>Invio</b> per piazzarlo.'
: 'I due punti possibili sono sulla tavola: <b>clicca quello giusto</b>, oppure premi <b>Invio</b> per il ' +
'<b class="tri-prop">proposto</b>' + (scelta.motivo ? ' (' + scelta.motivo + ')' : '') + '.';
this._triQualita(this._triScelta, L);
},
_triQualita(sc, L) {
const box = el('triQual'); if (!box || !RS.verifica) return;
const P = sc.punti[sc.prop], m2 = x => x.toFixed(2).replace('.', ',');
let liv, tit, testo;
if (sc.ort) {
const soglia = Math.min(3, L / 2);
if (sc.ctrl) {
const atteso = Math.hypot(P.x - sc.B.x, P.y - sc.B.y), scarto = sc.ctrl - atteso;
const torna = Math.abs(scarto) <= 0.05 + 0.01 * sc.ctrl;
liv = torna ? 'buono' : 'schiacciato'; tit = torna ? 'Il controllo torna' : 'Il controllo non torna';
testo = 'attesa da ' + sc.B.letter + ' ' + m2(atteso) + ' m, scarto ' + Math.round(Math.abs(scarto) * 100) + ' cm' + (torna ? '' : ': ripeti ascissa, ordinata o la distanza di controllo');
} else if (sc.dB > soglia + 1e-9) {
liv = 'accettabile'; tit = 'Ordinata lunga';
testo = 'oltre ' + m2(soglia) + ' m un piccolo errore nell\'angolo retto sposta molto il punto: prendi la distanza di controllo, oppure triangola il punto';
} else { box.hidden = true; return; }
} else {
const q = RS.verifica.qualitaTriangolo(L, sc.dA, sc.dB, [sc.A.letter, sc.B.letter]);
if (!q) { box.hidden = true; return; }
liv = q.liv; tit = { ottimo: 'Triangolo ottimo', buono: 'Triangolo buono', accettabile: 'Triangolo accettabile', schiacciato: 'Triangolo schiacciato' }[q.liv];
testo = q.testo;
if (q.liv === 'accettabile' || q.liv === 'schiacciato') {
const alt = RS.verifica.basePerPunto(P), RANGO = { ottimo: 0, buono: 1, accettabile: 2, schiacciato: 3 };
if (alt && RANGO[alt.q.liv] < RANGO[q.liv] && !([alt.A.id, alt.B.id].indexOf(sc.A.id) >= 0 && [alt.A.id, alt.B.id].indexOf(sc.B.id) >= 0))
testo += '. Meglio misurarlo dalla base ' + alt.A.letter + '–' + alt.B.letter;
}
}
box.hidden = false;
box.className = 'tri-qual q-' + liv;
box.innerHTML = '<b>' + escAttr(tit) + '</b>' + escAttr(testo.charAt(0).toUpperCase() + testo.slice(1)) + '.';
},
_triDisegna(sc) {
const S = RS.scene, NS = 'http://www.w3.org/2000/svg';
let g = el('triAnteprima'); if (g) g.remove();
if (!sc) return;
g = document.createElementNS(NS, 'g'); g.id = 'triAnteprima'; S.gOverlay.parentNode.appendChild(g);
const ppm = S.pxPerMeter();
const nuovo = (t, a) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); g.appendChild(n); return n; };
const linea = { 'vector-effect': 'non-scaling-stroke', fill: 'none' };
const P = sc.punti[sc.prop];
if (sc.ort) {
const F = sc.F;
const L = Math.hypot(sc.B.x - sc.A.x, sc.B.y - sc.A.y), ux = (sc.B.x - sc.A.x) / L, uy = (sc.B.y - sc.A.y) / L;
const t0 = Math.min(0, sc.dA) - 1, t1 = Math.max(L, sc.dA) + 1;
nuovo('line', Object.assign({ x1: sc.A.x + t0 * ux, y1: sc.A.y + t0 * uy, x2: sc.A.x + t1 * ux, y2: sc.A.y + t1 * uy, stroke: '#888', 'stroke-width': 1.2, 'stroke-dasharray': '6 5', opacity: 0.8 }, linea));
nuovo('line', Object.assign({ x1: sc.A.x, y1: sc.A.y, x2: F.x, y2: F.y, stroke: '#2e7d32', 'stroke-width': 2.2 }, linea));
sc.punti.forEach((p, i) => nuovo('line', Object.assign({ x1: F.x, y1: F.y, x2: p.x, y2: p.y, stroke: i === sc.prop ? '#2e7d32' : '#888',
'stroke-width': i === sc.prop ? 2.2 : 1.3, 'stroke-dasharray': i === sc.prop ? '' : '5 4' }, linea)));
nuovo('circle', { cx: F.x, cy: F.y, r: 3.5 / ppm, fill: '#2e7d32' });
} else {
nuovo('circle', Object.assign({ cx: sc.A.x, cy: sc.A.y, r: sc.dA, stroke: '#c0392b', 'stroke-width': 1.3, 'stroke-dasharray': '6 5', opacity: 0.7 }, linea));
nuovo('circle', Object.assign({ cx: sc.B.x, cy: sc.B.y, r: sc.dB, stroke: '#7a3a9a', 'stroke-width': 1.3, 'stroke-dasharray': '6 5', opacity: 0.7 }, linea));
nuovo('line', Object.assign({ x1: sc.A.x, y1: sc.A.y, x2: P.x, y2: P.y, stroke: '#c0392b', 'stroke-width': 1.6 }, linea));
nuovo('line', Object.assign({ x1: sc.B.x, y1: sc.B.y, x2: P.x, y2: P.y, stroke: '#7a3a9a', 'stroke-width': 1.6 }, linea));
}
sc.punti.forEach((p, i) => {
const prop = i === sc.prop, col = prop ? '#16a34a' : '#777';
nuovo('circle', { cx: p.x, cy: p.y, r: 16 / ppm, fill: prop ? 'rgba(22,163,74,.2)' : 'rgba(120,120,120,.15)', stroke: col, 'stroke-width': prop ? 2.5 : 2,
'vector-effect': 'non-scaling-stroke', 'stroke-dasharray': prop ? '' : '4 3', style: 'cursor:pointer' });
nuovo('circle', { cx: p.x, cy: p.y, r: 4 / ppm, fill: col });
const fs = 12 / ppm, pad = 5 / ppm;
const t = nuovo('text', { x: p.x + 22 / ppm, y: p.y, 'font-size': fs, fill: '#fff', 'font-family': 'Arial, Helvetica, sans-serif', 'font-weight': 700, dy: '0.35em' });
t.textContent = prop ? '1 · proposto' + (sc.motivo ? ': ' + sc.motivo : '') : '2 · altro punto possibile';
const bb = t.getBBox(), r = document.createElementNS(NS, 'rect');
[['x', bb.x - pad], ['y', bb.y - pad * 0.6], ['width', bb.width + 2 * pad], ['height', bb.height + 1.2 * pad], ['rx', 4 / ppm], ['fill', prop ? '#16a34a' : '#5f6670']].forEach(([k, v]) => r.setAttribute(k, v));
g.insertBefore(r, t);
});
},
_triPiazza(i) {
const sc = this._triScelta; if (!sc) return;
const S = RS.scene, P = sc.punti[i];
let nome, elm = null, titolo;
if (sc.cosa === 'cap') {
nome = prossimaLettera();
const def = RS.catalog.FISSI.find(x => x.id === 'caposaldo') || {};
elm = S.add({ type: 'symbol', sym: 'caposaldo', catId: 'caposaldo', nome: def.nome || 'Caposaldo', x: round2(P.x), y: round2(P.y), rot: 0,
size: def.size || 0.6, color: def.color || '#b00', letter: nome }, false);
titolo = 'Caposaldo ' + nome;
} else if (sc.cosa === 'spigolo') {
nome = sc.bersaglio; titolo = 'Spigolo ' + nome;
} else {
const n = nextSurveyN(); nome = 'P' + n; titolo = 'Punto ' + nome;
elm = S.add({ type: 'surveypt', x: round2(P.x), y: round2(P.y), n, descr: '', size: 0.7 }, false);
}
const quota = (a, b, col, note, valore, ril) => S.add(Object.assign({ type: 'measure', pts: [{ x: a.x, y: a.y }, { x: b.x, y: b.y }], color: col, note, valore: round2(valore) },
ril ? { ril } : {}), false).id;
let mobili, ordId = null;
if (sc.ort) {
quota(sc.A, sc.F, '#2e7d32', sc.A.letter + '→' + nome + ' (ascissa)', Math.abs(sc.dA), { asc: round2(sc.dA), B: sc.B.id });
ordId = quota(sc.F, P, '#2e7d32', nome + ' (ordinata)', sc.dB, { lato: i === 0 ? 1 : -1 });
mobili = [ordId];
if (sc.ctrl) mobili.push(quota(sc.B, P, '#c0392b', sc.B.letter + '→' + nome, sc.ctrl));
} else mobili = [quota(sc.A, P, '#c0392b', sc.A.letter + '→' + nome, sc.dA), quota(sc.B, P, '#c0392b', sc.B.letter + '→' + nome, sc.dB)];
S.snapshot();
(this._triLati = this._triLati || {})[triBase(sc.A, sc.B)] = triLato(sc.A, sc.B, P);
this._triUltimo = { cosa: sc.cosa, titolo, elId: elm && elm.id, mobili, ordId, A: sc.A, B: sc.B, qui: P, altro: sc.punti[1 - i] || null };
if (sc.cosa === 'spigolo') {
const bers = triBersagli(), j = bers.findIndex(b => b.k === nome);
if (j >= 0 && bers[j + 1]) this._triBersaglio = bers[j + 1].k;
}
this._triClosePanel();
this._triC = { A: null };
this.toast('✓ ' + titolo + ' posizionato. Clicca altri due capisaldi per il punto seguente (Esc per uscire).', 7000, this._triAzioni(sc.cosa));
},
_triAzioni(cosa) {
const az = this._triUltimo && this._triUltimo.altro ? [{ t: '↔ Altro lato', fn: () => this._triAltroLato() }] : [];
if (cosa === 'spigolo') az.push({ t: 'Allinea al rilievo', fn: () => { RS.tools.toSelect(); this._dataTab = 'triang'; this.openData(); } });
return az;
},
_triAltroLato() {
const u = this._triUltimo, S = RS.scene; if (!u || !u.altro) return;
const ms = u.mobili.map(id => S.get(id));
if (ms.some(m => !m || !m.pts || !m.pts[1]) || (u.elId && !S.get(u.elId))) return this.toast('Il punto è stato modificato o eliminato: non si può più ribaltare');
const P = u.altro;
if (u.elId) { const e = S.get(u.elId); e.x = round2(P.x); e.y = round2(P.y); }
ms.forEach(m => { m.pts[1] = { x: P.x, y: P.y }; });
const qo = u.ordId && S.get(u.ordId); if (qo && qo.ril) qo.ril.lato = -(qo.ril.lato || 1);
u.altro = u.qui; u.qui = P;
this._triLati[triBase(u.A, u.B)] = triLato(u.A, u.B, P);
S.render(); S.snapshot();
this.toast(u.titolo + ' spostato sull\'altro lato della base', 5000, this._triAzioni(u.cosa));
},
openGuida() { const m = el('guidaModal'); if (m) m.hidden = false; },
closeGuida() { const m = el('guidaModal'); if (m) m.hidden = true; },
wireGuida() {
const m = el('guidaModal'); if (!m) return;
m.addEventListener('click', e => {
if (e.target === m) return this.closeGuida();
const x = e.target.closest('[data-act="guida-close"]');
if (x) return this.closeGuida();
const o = e.target.closest('[data-g]'); if (!o) return;
this.closeGuida();
if (o.dataset.g === 'coach') { setTimeout(() => this.startCoach(), 150); return; }
if (o.dataset.g === 'pdf') {
if (window.RilsinAndroid && RilsinAndroid.apriGuida) { RilsinAndroid.apriGuida(); return; }
try {
const a = document.createElement('a');
a.href = 'GUIDA_RILSIN.pdf'; a.target = '_blank'; a.rel = 'noopener';
document.body.appendChild(a); a.click(); a.remove();
} catch (e) {
const w = window.open('GUIDA_RILSIN.pdf', '_blank');
if (!w) this.toast('Consenti le finestre popup per aprire la guida PDF');
}
}
});
},
_coachStepsDef() {
return [
{ sel: null, t: 'Benvenuto in RILSIN',
p: 'Questa mini-guida mostra i comandi principali in pochi passi. In sintesi: scegli un oggetto dalla tavolozza a sinistra e clicca sulla tavola per posizionarlo; strade, tracce e quote si tracciano trascinando. Puoi rivedere questa guida quando vuoi dal pulsante «Guida» in alto.' },
{ sel: ['#palette .pal-search', '#palette'], t: '1) Tavolozza degli oggetti',
p: 'Le schede raccolgono tutto, diviso in gruppi: Veicoli, Strade (con le curve), Incroci, Segnaletica, Sinistro (urti, tracce, persone, macchie, detriti), Ambiente (edifici, verde, acqua), Arredo e Misure e note (capisaldi, quote, testo, Nord, scala, legenda). Cerca in alto, poi clicca l’oggetto e clicca sulla tavola per inserirlo.' },
{ sel: ['[data-act="sfondo"]', '#scala'], t: '2) Sfondo e scala',
p: 'Imposta la Scala in alto (es. 1:100). Con Sfondo scarichi dal Geoportale la foto aerea del luogo, già in scala e con il Nord in alto (serve internet e la posizione GPS), oppure importi un’immagine e la calibri su una distanza nota («📐 Calibra scala» nelle proprietà): così il disegno resta in scala reale.' },
{ sel: ['#props', '#props .props-head'], t: '3) Selezione e proprietà',
p: 'Clicca un oggetto per selezionarlo: a destra ne regoli le proprietà. Veicolo: misure reali, colore, lettera, posizione (su ruote, su un fianco o capovolto) e «🎯 Numera punti rilievo» sugli spigoli. Strada: larghezza, numero di corsie e tipo di striscia. Sul disegno usa le maniglie per ruotare (aggancio agli angoli e gradi) e ridimensionare; trascina per spostare.' },
{ sel: ['[data-act="righello"]', '[data-act="triangola"]'], t: '4) Misure e triangolazione',
p: 'Righello: misura al volo trascinando, senza creare una quota. Triangola: clicca due capisaldi e inserisci le due distanze rilevate sul posto → il punto si posiziona con le sue quote. In “Dati e misure → Rilievo dei punti” ogni punto numerato compare con le caselle delle misure da prendere: basta scrivere i valori, oppure usare «Misure guidate».' },
{ sel: ['[data-act="coinvolti"]', '[data-act="misure"]'], t: '5) Coinvolti, dati e misure',
p: 'Coinvolti: veicoli, conducenti, assicurazioni, passeggeri, pedoni e testimoni, anche dalle foto dei documenti. Dati e misure: intestazione del comando e quote. Nel menu «Atti» il verbale di rilievi e lo scambio dati tra le parti.' },
{ sel: ['[data-act="fascicolo"]', '[data-act="atto-menu"]'], t: '6) Fascicolo fotografico',
p: 'Schermata dedicata: aggiungi le foto, scrivi le descrizioni, riordina le immagini e stampa con l’intestazione del comando e il timbro del comandante.' },
{ sel: ['[data-act="altro-menu"]', '[data-act="recon"]'], t: '7) Ricostruzione cinematica',
p: 'Nel menu «Altro» (con schizzo, raddrizza, esportazioni, tema e guida). Calcoli di ausilio: velocità dallo spazio di frenata, spazio d’arresto, energie e velocità in curva. Ricorda: gli esiti vanno sempre verificati dall’operatore.' },
{ sel: ['[data-act="salva"]', '[data-act="apri"]'], t: '8) Archivio condiviso',
p: 'Salva: la tavola va nell’archivio comune a tutte le postazioni. Apri: la ritrovi con anteprima, cronologia delle versioni e blocco “in uso” per non sovrapporsi tra colleghi.' },
{ sel: ['[data-act="vista-menu"]', '[data-act="stampa"]'], t: '9) Vista e stampa',
p: 'Nel menu «Vista»: griglia, foglio di stampa, aggancio, righelli, livelli, minimappa e vista pulita per gli screenshot. Con Stampa produci la planimetria in scala reale (A4), a colori o in stile tecnico in bianco e nero; da «Altro» la esporti in PNG o SVG.' },
{ sel: ['[data-act="undo"]'], t: '10) Annulla, ripeti e sicurezza',
p: 'Ogni azione è annullabile (Annulla/Ripeti, Ctrl+Z / Ctrl+Y). C’è l’autosalvataggio: se chiudi per errore, al riavvio puoi “Riprendere il lavoro”. Buon lavoro!' }
];
},
startCoach() {
this._coachSteps = this._coachStepsDef();
this._coachI = 0; this._coachDone = false;
el('coachNext').onclick = () => { this._coachI++; if (this._coachI >= this._coachSteps.length) this.coachEnd(); else this.coachShow(); };
el('coachSkip').onclick = () => this.coachEnd();
el('coach').hidden = false;
this.coachShow();
},
maybeCoach() {
let done; try { done = localStorage.getItem('rilsin:coach'); } catch (e) { done = '1'; }
if (done) return;
const tryStart = () => {
if (this._coachDone) return;
const wel = el('welcome'), home = el('home');
if ((wel && !wel.hidden) || (home && !home.hidden)) { setTimeout(tryStart, 600); return; }
if ((RS.procedura && RS.procedura.attiva()) || (RS.coinvolti && RS.coinvolti.aperto())) { setTimeout(tryStart, 3000); return; }
this.startCoach();
};
setTimeout(tryStart, 800);
},
_coachAnchor(sels) {
for (const s of (sels || [])) {
const n = document.querySelector(s);
if (n && n.offsetParent !== null && n.getBoundingClientRect().width > 1) return n;
}
return null;
},
coachShow() {
const st = this._coachSteps[this._coachI];
const anchor = this._coachAnchor(st.sel);
el('coachTitle').textContent = st.t;
el('coachText').textContent = st.p;
el('coachStep').textContent = (this._coachI + 1) + ' / ' + this._coachSteps.length;
el('coachNext').textContent = (this._coachI === this._coachSteps.length - 1) ? 'Ho capito' : 'Avanti ▸';
const coach = el('coach'), ring = coach.querySelector('.coach-ring'), tip = coach.querySelector('.coach-tip');
const tw = 300, th = tip.offsetHeight || 170;
if (anchor) {
coach.classList.remove('no-anchor');
const r = anchor.getBoundingClientRect(), pad = 6;
ring.style.display = 'block';
ring.style.left = (r.left - pad) + 'px'; ring.style.top = (r.top - pad) + 'px';
ring.style.width = (r.width + pad * 2) + 'px'; ring.style.height = (r.height + pad * 2) + 'px';
let left = Math.min(r.left, window.innerWidth - tw - 14);
let top = r.bottom + 14;
if (top + th > window.innerHeight - 12) { top = Math.max(12, r.top); left = Math.min(r.right + 14, window.innerWidth - tw - 14); }
tip.style.left = Math.max(12, left) + 'px';
tip.style.top = Math.max(12, top) + 'px';
} else {
coach.classList.add('no-anchor');
ring.style.display = 'none';
tip.style.left = Math.round((window.innerWidth - tw) / 2) + 'px';
tip.style.top = '120px';
}
},
coachEnd() {
this._coachDone = true;
el('coach').hidden = true;
try { localStorage.setItem('rilsin:coach', '1'); } catch (e) {}
},
testaProps(e) {
let nome = tipoLabel(e), sub = '';
if (e.type === 'vehicle') {
const c = RS.catalog.veicoloById(e.catId);
if (e.label) nome = 'Veicolo ' + (RS.elements.siglaFase ? RS.elements.siglaFase(e) : e.label);
sub = [c && c.nome, e.targa && String(e.targa).toUpperCase()].filter(Boolean).join(' · ');
} else if (e.letter) { nome = 'Caposaldo ' + e.letter; }
else if (e.label) sub = e.label;
return `<div class="phead">${this.previewHTML(e)}<div class="phead-t"><b>${escAttr(nome)}</b>${sub ? `<small>${escAttr(sub)}</small>` : ''}</div></div>`;
},
previewHTML(e) {
try {
const node = RS.elements.render(e); if (!node) return '';
const b = RS.elements.bounds(e); if (!b) return '';
const pad = Math.max(b.w, b.h) * 0.15 + 0.3;
const vb = `${b.x - pad} ${b.y - pad} ${b.w + pad * 2} ${b.h + pad * 2}`;
const defs = RS.scene.defs.innerHTML + (RS.scene.defsDyn ? RS.scene.defsDyn.innerHTML : '');
return `<div class="prop-preview"><svg viewBox="${vb}" preserveAspectRatio="xMidYMid meet"><defs>${defs}</defs>${node.outerHTML}</svg></div>`;
} catch (err) { return ''; }
},
wireModal() {
const m = el('dataModal');
m.addEventListener('click', e => {
if (e.target === m) return this.closeData();
const b = e.target.closest('[data-act]');
if (b && b.dataset.act === 'dati-close') this.closeData();
});
RS.scene.on('change', () => {
if (el('dataModal').hidden) return;
this.refreshMeasures(); this.fillBaseSelects();
if (this._dataTab === 'triang') this._rpRidisegna();
if (this._dataTab === 'verifica' && RS.verifica && !(document.activeElement && document.activeElement.dataset && document.activeElement.dataset.ver))
RS.verifica.render(el('verBody'));
});
const pm = el('printModal');
pm.addEventListener('click', e => {
if (e.target === pm) return this.closePrint();
const b = e.target.closest('[data-act]');
if (b && b.dataset.act === 'stampa-close') this.closePrint();
});
const rm = el('reconModal');
rm.addEventListener('click', e => {
if (e.target === rm) return RS.recon.close();
const b = e.target.closest('[data-act]');
if (b && b.dataset.act === 'recon-close') RS.recon.close();
});
const im = el('infoModal');
if (im) im.addEventListener('click', e => {
if (e.target === im) return this.closeInfo();
const b = e.target.closest('[data-act]');
if (b && b.dataset.act === 'info-close') this.closeInfo();
});
},
openData() { this.renderData(); el('dataModal').hidden = false; },
closeData() { el('dataModal').hidden = true; },
openPrint() {
const S = RS.scene, po = S.printOptions(), meta = S.meta || {};
const DEP = { comando:'comando', stazione:'stazione', numero:'numero', operatore:'operatore', condizioni:'condizioni', coordinate:'coordinate' };
const chk = (k, lbl) => {
const dep = DEP[k], empty = dep && !(meta[dep] && String(meta[dep]).trim());
return `<label class="pchk${empty?' pchk-empty':''}" title="${empty?'Compila il campo in Dati e misure per stamparlo':''}">` +
`<input type="checkbox" data-po="${k}"${po[k]?' checked':''}${empty?' disabled':''}> ${lbl}` +
`${empty?' <span class="pchk-hint">(vuoto)</span>':''}</label>`;
};
const orv = po.orient || 'auto';
const oopt = (v, l) => `<option value="${v}"${orv===v?' selected':''}>${l}</option>`;
el('printBody').innerHTML =
`<h4>Foglio</h4>
         <div class="grid2" style="margin-bottom:14px">
           <div class="gfield"><label>Orientamento</label>
             <select id="poOrient">${oopt('auto','Automatico (consigliato)')}${oopt('portrait','Verticale')}${oopt('landscape','Orizzontale')}</select></div>
           <div class="gfield"><label>Stile</label>
             <select id="poStile"><option value="col"${po.bn ? '' : ' selected'}>A colori</option><option value="bn"${po.bn ? ' selected' : ''}>Tecnica in bianco e nero (per fotocopie)</option></select></div>
           <div class="gfield" style="grid-column:1/-1"><label>Titolo del cartiglio</label>
             <input id="poTitolo" value="${escAttr(po.titolo||'')}" placeholder="${escAttr(meta.localita || 'Planimetria del sinistro stradale')}"></div>
         </div>
         <h4>Cosa includere nel cartiglio</h4>
         <div class="pchk-grid">
           ${chk('comando','Comando (righe 1 e 2)')}
           ${chk('stazione','Comando (riga 3)')}
           ${chk('numero','N. protocollo')}
           ${chk('data','Data')}
           ${chk('operatore','Operatore')}
           ${chk('condizioni','Condizioni meteo')}
           ${chk('coordinate','Coordinate GPS')}
           ${chk('scala', S.elements.some(e => e.type === 'graphscale')
? 'Scala <span class="pchk-hint">(la barra è già sul disegno)</span>' : 'Scala e barra metrica')}
           ${S.elements.some(e => e.type === 'north')
? `<label class="pchk pchk-empty" title="La freccia Nord è già sul disegno: il cartiglio non ne aggiunge un'altra"><input type="checkbox" disabled> Freccia Nord <span class="pchk-hint">(già sul disegno)</span></label>`
: chk('nord','Freccia Nord')}
           ${chk('logo','Logo del Comando')}
           ${RS.verifica && !RS.verifica.chiuso()
? `<label class="pchk pchk-empty" title="Il rilievo non è chiuso: la filigrana c'è sempre. Si chiude da Dati e misure → Controllo e chiusura"><input type="checkbox" checked disabled> Filigrana “BOZZA” <span class="pchk-hint">(fino alla chiusura del rilievo)</span></label>`
: chk('bozza','Filigrana “BOZZA”')}
           ${chk('simboli','Simboli piccoli ingranditi (almeno 3,5 mm sul foglio)')}
         </div>
         <div class="sk-note">Le voci in grigio «(vuoto)» hanno il campo non compilato in <b>Dati e misure</b>: riempilo per poterle stampare. Il <b>titolo</b> vuoto usa la località dell'intestazione.</div>
         <h4 style="margin-top:16px">Anteprima del foglio</h4>
         <div class="pv-wrap"><div class="pv-page" id="poPage"></div></div>
         <div class="pv-note" id="poNote"></div>
         <div class="modal-actions" style="margin-top:16px">
           <button class="mini" data-po-act="print" style="background:var(--accent);border-color:var(--accent);color:#fff">🖨 Stampa ora</button>
           <button class="mini" data-po-act="reset">Ripristina tutto</button>
         </div>`;
el('printModal').hidden = false;
this.renderPrintPreview();
el('poTitolo').addEventListener('input', () => { S.printOpts = S.printOpts || {}; S.printOpts.titolo = el('poTitolo').value; this.renderPrintPreview(); });
el('poStile').addEventListener('change', () => {
S.printOpts = S.printOpts || {}; S.printOpts.bn = el('poStile').value === 'bn';
try { localStorage.setItem('rilsin:stampaBn', S.printOpts.bn ? '1' : '0'); } catch (e) {}
this.renderPrintPreview();
});
el('poOrient').addEventListener('change', () => { S.printOpts = S.printOpts || {}; S.printOpts.orient = el('poOrient').value; this.renderPrintPreview(); S._foglio = undefined; S.drawGrid(); S.drawFoglio(); });
el('printBody').querySelectorAll('[data-po]').forEach(inp => {
inp.addEventListener('change', () => {
S.printOpts = S.printOpts || {}; S.printOpts[inp.dataset.po] = inp.checked;
this.renderPrintPreview();
});
});
el('printBody').querySelectorAll('[data-po-act]').forEach(b => b.onclick = () => {
if (b.dataset.poAct === 'reset') { S.printOpts = {}; this.openPrint(); return; }
this.closePrint(); RS.exportUtil.print();
});
},
closePrint() { el('printModal').hidden = true; },
apriCompleto() {
const S = RS.scene, P = RS.exportUtil.partiFascicolo();
S.printOpts = S.printOpts || {};
const sc = S.printOpts.completo || {};
const ordine = ['plan', 'atto', 'calcoli', 'foto', 'radd'];
const SPENTO = { radd: 'nessuna foto raddrizzata (facoltativo: 📐 Raddrizza)', plan: 'la tavola è vuota', calcoli: 'nessun calcolo da allegare (Ricostruzione → «Allega all\'atto»)', foto: 'il fascicolo fotografico non ha foto' };
el('completoBody').innerHTML =
`<div class="mis-hint" style="margin-top:0">Un solo documento con frontespizio e indice, pagine numerate «Pag. X di Y». Scegli che cosa includere:</div>
         <div class="cmp-lista">${ordine.map(k => {
const p = P[k], on = p.ok && (k === 'radd' ? sc[k] === true : sc[k] !== false);
return `<label class="cmp-voce${p.ok ? '' : ' spento'}"><input type="checkbox" data-cmp="${k}"${on ? ' checked' : ''}${p.ok ? '' : ' disabled'}>
             <span><b>${escAttr(p.nome)}</b><small>${escAttr(p.ok ? (p.det || (k === 'plan' ? 'in scala, con cartiglio' : '')) : SPENTO[k])}</small></span></label>`;
}).join('')}</div>
         <div class="mis-hint">Il frontespizio con l'indice c'è sempre. La planimetria segue le opzioni di stampa (orientamento, bianco e nero, cartiglio).</div>
         <div class="modal-actions" style="margin-top:14px">
           <button class="mini" data-cmp-act="genera" style="background:var(--accent);border-color:var(--accent);color:#fff">📚 Genera il fascicolo</button>
           <button class="mini" data-cmp-act="annulla">Annulla</button>
         </div>`;
const m = el('completoModal');
m.hidden = false;
m.onclick = ev => {
if (ev.target === m || ev.target.closest('[data-act="completo-close"]') || ev.target.closest('[data-cmp-act="annulla"]')) { m.hidden = true; return; }
if (!ev.target.closest('[data-cmp-act="genera"]')) return;
const scelte = {};
m.querySelectorAll('[data-cmp]').forEach(cb => { scelte[cb.dataset.cmp] = cb.checked; });
if (!Object.keys(scelte).some(k => scelte[k] && P[k].ok)) { this.toast('Scegli almeno un allegato'); return; }
S.printOpts.completo = scelte;
m.hidden = true;
RS.exportUtil.fascicoloCompleto(scelte);
};
},
openInfo() {
const data = (RS.DATA_BUILD || '').split('-').reverse().join('/');
const nov = (RS.NOVITA || []).slice(0, 1).map(n => `<div class="nov-b"><b>Build ${n.build}</b> · ${escAttr(n.data.split('-').reverse().join('/'))}
          <ul>${n.voci.map(v => `<li>${escAttr(v)}</li>`).join('')}</ul></div>`).join('');
el('infoBody').innerHTML =
`<div class="info-head">
           <img class="info-logo" src="icon.svg" alt="">
           <div class="info-name">RILSIN</div>
           <div class="info-sub">Rilievo planimetrico dei sinistri stradali</div>
           <div class="info-tri"><span></span><span></span><span></span></div>
         </div>
         <div class="info-num">
           <div><small>Versione</small><b>${escAttr(RS.VERSION || '')}</b></div>
           <div><small>Build</small><b>${RS.BUILD || ''}</b></div>
           <div><small>Aggiornata il</small><b>${escAttr(data)}</b></div>
         </div>
         <div class="info-uso">In uso: ${escAttr(this.doveGira())}</div>
         <div class="info-voce"><span>ⓘ</span><div><b>Strumento di ausilio</b>RILSIN è uno strumento di ausilio realizzato da un
           operatore. Misure, calcoli ed elaborati vanno sempre
           verificati da chi li firma, e non sostituiscono il rilievo e la valutazione tecnica.</div></div>
         <div class="info-voce"><span>👤</span><div><b>Autore</b>${escAttr(RS.AUTORE || '')}, ${RS.ANNO || ''}. Ausilio alla
           restituzione grafica in scala della scena del sinistro stradale.</div></div>
         <div class="info-voce"><span>🔒</span><div><b>Uso</b>Si può usare liberamente per servizio. Per modificarlo o
           distribuirlo fuori dal reparto, sentire prima l'autore.</div></div>
         <div class="info-voce" id="infoMemVoce" hidden><span>💾</span><div><b>Memoria</b><span id="infoMem"></span></div></div>
         <div class="info-btns">
           <button class="mini" data-info="guida">📖 Guida</button>
           ${nov ? '<button class="mini" data-info="novita">✨ Novità di questa versione</button>' : ''}
           ${RS._reg ? '<button class="mini" data-info="aggiorna">🔄 Controlla aggiornamenti</button>' : ''}
         </div>
         ${RS.segnala && RS.segnala.disponibile() ? `<button class="info-segnala" data-info="segnala"><span class="is-ic">🐞</span>
           <span><b>Segnala un problema o un'idea</b><small>Un'e-mail già pronta a ${escAttr(RS.EMAIL_SEGNALAZIONI)}, con i dati tecnici</small></span><span class="is-go">›</span></button>` : ''}
         ${RS.caffe && RS.caffe.visibile() ? `<div class="info-sost">
           <div class="info-sost-t">Sostieni RILSIN</div>
           <div class="info-sost-d">RILSIN è gratuito, senza pubblicità e senza abbonamenti, e resterà così. È sviluppato nel tempo libero:
             se ti fa risparmiare tempo sul campo puoi aiutarlo in tre modi.</div>
           <ul class="info-sost-l">
             <li><span>💬</span>Segnala difetti e proposte: ogni build nasce dalle segnalazioni dei colleghi.</li>
             <li><span>🤝</span>Fallo conoscere a chi fa rilievi come te.</li>
             <li><span>☕</span>Se vuoi, offri un caffè all'autore. È del tutto facoltativo e non cambia nulla nell'app.</li>
           </ul>
           <button class="info-sost-b" data-info="caffe">☕ Offri un caffè</button>
         </div>` : ''}
         <div class="info-nov" id="infoNov" hidden>${nov}</div>
         <div class="info-piede"><b>${escAttr(RS.COPYRIGHT || '')}</b></div>`;
el('infoModal').hidden = false;
try {
const st = navigator.storage;
if (st && st.estimate) Promise.all([st.estimate(), st.persisted ? st.persisted().catch(() => null) : null]).then(([e, p]) => {
const v = el('infoMemVoce'), t = el('infoMem'); if (!v || !t || !e) return;
const mb = (e.usage || 0) / 1048576;
let s = 'Tavole, foto e app occupano ' + (mb < 1 ? 'meno di 1 MB' : mb.toFixed(mb < 10 ? 1 : 0).replace('.', ',') + ' MB') + ' in questo dispositivo.';
if (!window.RilsinAndroid && location.protocol === 'https:') s += p ? ' Protette: il browser non le cancella da sé.' : ' Il browser potrebbe cancellarle se il telefono resta senza spazio: esporta o condividi le tavole importanti.';
const cs = this.statoCopia();
if (cs.tavole) s += ' Ultima copia di sicurezza delle tavole: ' + (cs.quando ? quandoBreve(cs.quando) : 'mai') + ' (Apri, Copia di sicurezza).';
t.textContent = ' ' + s; v.hidden = false;
}).catch(() => {});
} catch (e) {}
el('infoBody').querySelectorAll('[data-info]').forEach(b => b.onclick = () => {
if (b.dataset.info === 'guida') { this.closeInfo(); this.openGuida(); return; }
if (b.dataset.info === 'caffe') { if (RS.caffe) RS.caffe.apri(); return; }
if (b.dataset.info === 'segnala') { this.closeInfo(); if (RS.segnala) RS.segnala.apri(); return; }
if (b.dataset.info === 'aggiorna') {
const reg = RS._reg; if (!reg) return;
this.toast('Controllo gli aggiornamenti…', 4000);
reg.update().then(() => {
if (reg.waiting) { RS._aggiornaProposto = false; this.closeInfo(); RS._proponiAggiornamento && RS._proponiAggiornamento(); }
else if (reg.installing) this.toast('⬇ Sto scaricando l\'aggiornamento: lascia l\'app aperta, poi compare «Aggiorna ora»', 6000);
else this.toast('Hai già l\'ultima versione (build ' + RS.BUILD + ')', 4000);
}).catch(() => this.toast('Non riesco a raggiungere il sito: controlla la connessione', 5000));
return;
}
const n = el('infoNov'); n.hidden = !n.hidden;
b.classList.toggle('on', !n.hidden);
if (!n.hidden) n.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
});
},
doveGira() {
const ua = navigator.userAgent, ST = RS.storage;
const dove = window.RilsinAndroid ? 'app Android'
: document.querySelector('meta[name="rilsin-campo"]') ? 'file unico da campo'
: 'browser ' + (/Edg\//.test(ua) ? 'Edge' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : '');
const tavole = ST.useServer() ? 'tavole nell\'archivio condiviso'
: ST.fileDisponibile() ? 'tavole salvate come file' : 'tavole salvate nel browser';
return dove.trim() + ' · ' + tavole;
},
closeInfo() { el('infoModal').hidden = true; },
maybeFirstSetup() {
let done; try { done = localStorage.getItem('rilsin:setup'); } catch (e) { done = '1'; }
if (done) return;
this.openFirstSetup(true);
},
openFirstSetup(first) {
const S = RS.scene;
const t = (RS.storage.template && RS.storage.template()) || {}, tm = t.meta || {};
const comando = (S.meta && S.meta.comando) || tm.comando || '';
const comando2 = (S.meta && S.meta.comando2) || tm.comando2 || '';
const stazione = (S.meta && S.meta.stazione) || tm.stazione || '';
let ov = el('firstSetup'); if (ov) ov.remove();
ov = document.createElement('div'); ov.id = 'firstSetup'; ov.className = 'fs-overlay';
ov.innerHTML =
`<div class="fs-modal" role="dialog" aria-modal="true">
           <div class="fs-head">
             <img src="icon.svg" alt="RILSIN">
             <div><div class="fs-t">${first ? 'Benvenuto in RILSIN' : 'Dati del Comando'}</div>
               <div class="fs-s">Imposta i dati del tuo Comando: verranno usati come predefiniti in ogni nuova tavola e nei documenti (atto, fascicolo, cartiglio). Potrai modificarli in seguito da «Dati &amp; misure».</div></div>
           </div>
           <label class="fs-f"><span>Timbro del Comando · 1ª riga</span>
             <input id="fsComando" value="${escAttr(comando)}" placeholder="es. LEGIONE CARABINIERI VENETO, POLIZIA LOCALE DI PADOVA"></label>
           <label class="fs-f"><span>Timbro del Comando · 2ª riga</span>
             <input id="fsComando2" value="${escAttr(comando2)}" placeholder="es. Compagnia di Padova"></label>
           <label class="fs-f"><span>Timbro del Comando · 3ª riga</span>
             <input id="fsStazione" value="${escAttr(stazione)}" placeholder="es. Stazione di Padova Prato / Nucleo Radiomobile"></label>
           ${RS.loghi ? RS.loghi.html() : ''}
           <div class="fs-act">
             <button class="mini" id="fsSkip">${first ? 'Salta per ora' : 'Annulla'}</button>
             <button class="mini fs-ok" id="fsSave">Salva e continua</button>
           </div>
         </div>`;
document.body.appendChild(ov);
if (RS.loghi) RS.loghi.collega(ov);
const finish = (save) => {
if (save) {
const c = (el('fsComando').value || '').trim(), c2 = (el('fsComando2').value || '').trim(), st = (el('fsStazione').value || '').trim();
S.meta = S.meta || {};
S.meta.comando = c; S.meta.comando2 = c2; S.meta.stazione = st;
if (RS.storage.saveTemplate) RS.storage.saveTemplate();
this.toast('Dati del Comando salvati come predefiniti');
}
try { localStorage.setItem('rilsin:setup', '1'); } catch (e) {}
ov.remove();
};
el('fsSave').onclick = () => finish(true);
el('fsSkip').onclick = () => finish(false);
ov.addEventListener('keydown', ev => {
if (ev.key === 'Enter') { ev.preventDefault(); finish(true); }
if (ev.key === 'Escape') { ev.preventDefault(); finish(false); }
});
setTimeout(() => { const i = el('fsComando'); if (i) { i.focus(); i.select(); } }, 30);
},
renderPrintPreview() {
const page = el('poPage'), note = el('poNote');
if (!page) return;
try {
const p = RS.exportUtil.previewSvg();
page.classList.toggle('land', !!p.landscape);
page.innerHTML = p.svg.replace('<svg ', '<svg preserveAspectRatio="xMidYMid meet" ');
const svg = page.querySelector('svg');
if (svg) { svg.removeAttribute('width'); svg.removeAttribute('height'); }
if (note) note.textContent = p.note;
} catch (e) {
page.innerHTML = '';
if (note) note.textContent = 'Anteprima non disponibile: ' + e.message;
}
},
renderData() {
RS.scene.applyMetaDefaults();
const meta = RS.scene.meta;
const F = (k, lbl, ph) => `<div class="gfield"><label>${lbl}</label><input data-meta="${k}" value="${escAttr(meta[k]||'')}" placeholder="${ph||''}"></div>`;
const METEO = ['', 'Sereno', 'Poco nuvoloso', 'Nuvoloso', 'Coperto', 'Nebbia', 'Foschia',
'Pioggia debole', 'Pioggia', 'Pioggia intensa / Temporale', 'Grandine', 'Neve', 'Nevischio',
'Strada bagnata', 'Ghiaccio / Gelo', 'Vento forte'];
const MS = (k, lbl, opts) => `<div class="gfield"><label>${lbl}</label><select data-meta="${k}">${
opts.map(o => `<option${o === (meta[k]||'') ? ' selected' : ''}>${o}</option>`).join('')}</select></div>`;
const head = `<h4>Intestazione del rilievo</h4><div class="grid2">
        ${F('comando','Timbro del Comando · 1ª riga','es. LEGIONE CARABINIERI VENETO, POLIZIA LOCALE DI PADOVA')}
        ${F('comando2','Timbro del Comando · 2ª riga','es. Compagnia di Padova')}
        ${F('stazione','Timbro del Comando · 3ª riga','es. Stazione di Padova Prato / Nucleo Radiomobile')}
        <div class="gfield full">${RS.loghi ? RS.loghi.html() : ''}</div>
        ${F('numero','N. protocollo / sinistro')}
        ${F('localita','Via o luogo del sinistro','es. Via Roma incrocio Via Po')}
        ${F('comune','Comune','es. Padova')}
        <div class="gfield full"><div class="mis-hint">Via o luogo senza il comune; nel campo Comune solo il nome («Padova», non «Comune di Padova»): nel verbale diventa «in Via Roma incrocio Via Po del comune di Padova».</div></div>
        ${F('data','Data e ora del sinistro','es. 29/10/2026 08:10')}
        ${['inizioRilievi', 'fineRilievi'].map((k, i) => `<div class="gfield"><label>${i ? 'Fine' : 'Inizio'} dei rilievi</label>
          <div class="gps-row"><input data-meta="${k}" id="meta_${k}" value="${escAttr(meta[k] || '')}" placeholder="gg/mm/aaaa hh:mm">
          <button class="mini" data-d="adesso" data-k="${k}" type="button" title="Scrive data e ora di adesso">🕑 Adesso</button></div></div>`).join('')}
        ${F('operatore','Operatore / Rilevatore')}
        ${MS('condizioni','Condizioni meteo', METEO)}
        <div class="gfield"><label>Condizioni di luce</label>
          <div class="gps-row"><input data-meta="luce" id="metaLuce" value="${escAttr(meta.luce || '')}" placeholder="dall'ora e dalla posizione">
          <button class="mini" data-d="luce" type="button" title="Giorno, crepuscolo o notte, calcolati dall'ora del sinistro e dalla posizione (senza internet)">☀ Calcola</button></div></div>
        <div class="gfield full"><label>Coordinate del luogo</label>
          <div class="gps-row"><input data-meta="coordinate" id="metaCoord" value="${escAttr(meta.coordinate||'')}" placeholder="es. N 45,40612° E 11,87652°">
          <button class="mini" data-d="gps" type="button">📍 Rileva con il GPS</button><button class="mini" data-d="ortofoto" type="button" title="Foto aerea del luogo dal Geoportale Nazionale, già in scala">🛰 Foto aerea</button></div>
          <div class="mis-hint" id="gpsMsg">Sul posto, con il telefono: la posizione va nel cartiglio e nell'atto. Si può anche scrivere a mano.</div></div>
        <div class="gfield full"><label>Note</label><textarea data-meta="note" placeholder="annotazioni, metodo di rilievo, presenza soccorritori...">${escAttr(meta.note||'')}</textarea></div>
      </div>
      <div class="modal-actions"><button class="mini" data-d="savetpl">💾 Salva come modello predefinito</button>
      <span class="mis-hint">Timbro del Comando, scala e opzioni di stampa verranno riproposti a ogni nuova tavola.</span></div>`;
meta.base || (meta.base = {});
const body = el('dataBody');
body.innerHTML =
`<div class="dtabs">
           <button class="dtab-btn" data-dtab="intest">📋 Intestazione</button>
           <button class="dtab-btn" data-dtab="triang">📐 Rilievo dei punti <span class="dtab-n" id="tabNRil"></span></button>
           <button class="dtab-btn" data-dtab="misure">📏 Altre misure</button>
           <button class="dtab-btn" data-dtab="verifica">✔ Controllo e chiusura</button>
         </div>

         <section class="dtab" data-tab="verifica"><div id="verBody"></div></section>

         <section class="dtab" data-tab="misure">
           <div class="mis-card">
             <div class="mis-add-row">
               <input id="mmDesc" placeholder="Che cosa hai misurato (es. larghezza carreggiata)">
               <div class="mis-val"><input id="mmVal" type="number" step="0.01" min="0" placeholder="valore"><span>m</span></div>
               <button class="btn-primary" data-d="mmadd">Aggiungi</button>
             </div>
             <div class="mis-chips"><span>Di solito servono:</span>${['larghezza carreggiata', 'larghezza corsia', 'larghezza marciapiede', 'larghezza banchina'].map(t => `<button class="mis-chip" data-chip="${t}">${t}</button>`).join('')}</div>
           </div>
           <div class="mis-step">
             <div class="mis-step-h">Misure <span id="measCount" class="cnt"></span></div>
             <div id="measWrap"></div>
           </div>
           <div class="rp-azioni">
             <button class="mini" data-d="newq">✏️ Disegna una quota</button>
             <button class="mini" data-d="addtab">＋ Tabella delle misure sul disegno</button>
             <button class="mini" data-d="addleg">＋ Legenda sul disegno</button>
           </div>
           <div class="mis-hint">Qui le misure che non servono a posizionare un punto: larghezze, distanze, tracce. Le distanze dai capisaldi sono nel Rilievo dei punti; atto e fascicolo nella barra, gruppo Documenti.</div>
         </section>

         <section class="dtab" data-tab="intest">${head}</section>

         <section class="dtab" data-tab="triang">
           <div class="rp-base">
             <div id="baseInfo" class="tri-baseinfo"></div>
             <details class="rp-cambia" id="rpCambia"><summary>Cambia base</summary>
               <div class="grid2">
                 <div class="gfield"><label>1° caposaldo (origine)</label><select id="baseA" data-baseid="aId"></select></div>
                 <div class="gfield"><label>2° caposaldo (direzione)</label><select id="baseB" data-baseid="bId"></select></div>
               </div>
               <div class="modal-actions"><button class="mini" data-d="addcap">➕ Aggiungi un caposaldo sul disegno</button></div>
               <div class="mis-hint">La base dà l'origine e la direzione delle coordinate nell'atto. La sua misura si scrive in cima al pannello Triangola.</div>
             </details>
           </div>
           <div class="rp-azioni">
             <button class="mini rp-gm" data-d="guidate" id="rpGuidate" title="Sul posto: una misura alla volta, a caratteri grandi, con il controllo immediato">▶ Misure guidate</button>
             <button class="mini" data-d="rilevapunto">📐 Rileva un punto sulla tavola</button>
           </div>
           <div id="puntiWrap"></div>
           <div id="allineaWrap"></div>
           <div class="mis-hint">Scrivi la misura nella sua casella: il punto si ricalcola. Le caselle tratteggiate sono le misure ancora da prendere; «＋ da…» aggiunge una distanza da un altro caposaldo, per controllo.</div>
         </section>`;
if (RS.loghi) RS.loghi.collega(body.querySelector('.lg-box'));
body.querySelectorAll('[data-meta]').forEach(inp => {
inp.addEventListener('input', () => { meta[inp.dataset.meta] = inp.value; });
});
body.querySelectorAll('[data-baseid]').forEach(sel => {
sel.addEventListener('change', () => { meta.base[sel.dataset.baseid] = sel.value; this.updateBaseInfo(); });
});
body.querySelectorAll('[data-d]').forEach(btn => btn.onclick = () => {
const S = RS.scene, act = btn.dataset.d;
if (act === 'adesso') {
const d = new Date(), p = n => String(n).padStart(2, '0');
const v = p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
meta[btn.dataset.k] = v; const inp = el('meta_' + btn.dataset.k); if (inp) inp.value = v;
S.emit('change'); return;
}
if (act === 'newq') { this.closeData(); const def = RS.catalog.TRACCE.find(x=>x.id==='misura'); RS.tools.setTool({ mode:'drag2', tool:'measure', def }); this.toast('Traccia la quota sul disegno'); }
if (act === 'addleg') { const a = S.add({ type:'legend', x: S.view.x+1, y: S.view.y+1, fs:0.6 }); S.select(a.id); this.closeData(); }
if (act === 'addtab') { const a = S.add({ type:'measuretable', x: S.view.x+1, y: S.view.y+5, fs:0.6 }); S.select(a.id); this.closeData(); }
if (act === 'mmadd') {
const val = parseFloat(el('mmVal').value), desc = (el('mmDesc').value || '').trim();
if (isNaN(val) && !desc) { this.toast('Inserisci un valore o una descrizione'); el('mmDesc').focus(); return; }
S.misure = S.misure || [];
S.misure.push({ descr: desc, val: isNaN(val) ? '' : val });
el('mmDesc').value = ''; el('mmVal').value = ''; el('mmDesc').focus();
S.render();
this.refreshMeasures();
}
if (act === 'savetpl') { RS.storage.saveTemplate(); this.toast('Modello salvato: verrà applicato alle nuove tavole'); }
if (act === 'guidate') { this.misureGuidate(); }
if (act === 'gps') { this.rilevaPosizione(); }
if (act === 'luce') {
const r = calcolaLuce(RS.scene.meta || {});
if (!r) { this.toast('Servono data e ora del sinistro (gg/mm/aaaa hh:mm) e le coordinate del luogo', 5000); }
else { RS.scene.meta.luce = r.testo; const i = el('metaLuce'); if (i) i.value = r.testo; RS.scene.emit('change'); this.toast('Condizioni di luce: ' + r.testo, 5000); }
}
if (act === 'ortofoto') { this.closeData && this.closeData(); RS.ortofoto.apri(); }
if (act === 'rilevapunto') { this.closeData(); this.startTriangulate(); }
if (act === 'addcap') {
this.closeData();
const def = RS.catalog.FISSI.find(x => x.id === 'caposaldo');
RS.tools.setTool({ mode: 'place', kind: 'symbol', def });
this.toast('Clicca sul disegno dove mettere il caposaldo');
}
});
body.querySelectorAll('[data-chip]').forEach(b => b.onclick = () => { el('mmDesc').value = b.dataset.chip; el('mmVal').focus(); });
['mmDesc', 'mmVal'].forEach(id => el(id).addEventListener('keydown', ev => {
if (ev.key === 'Enter') { ev.preventDefault(); body.querySelector('[data-d="mmadd"]').click(); }
}));
body.querySelectorAll('[data-dtab]').forEach(b => b.onclick = () => this.showDataTab(b.dataset.dtab));
this.showDataTab(this._dataTab || 'intest');
this.fillBaseSelects();
this.refreshMeasures();
this.renderPunti();
},
renderPunti() {
const wrap = el('puntiWrap'); if (!wrap || !RS.verifica) return;
const att = document.activeElement;
const fk = this._rpFocus || (att && wrap.contains(att) && att.dataset ? att.dataset.fk : null);
this._rpFocus = null;
const sch = RS.verifica.schedaRilievo(), n = sch.daPrendere.length;
const tn = el('tabNRil'); if (tn) tn.textContent = n || '';
const gb = el('rpGuidate'); if (gb) gb.textContent = '▶ Misure guidate' + (n ? ' · ' + n + ' da prendere' : '');
this.renderAllinea(sch);
if (!sch.gruppi.length) {
wrap.innerHTML = '<div class="meas-empty">Ancora nessun punto da rilevare.<br>Numera gli spigoli dei veicoli (proprietà del veicolo → «Numera punti rilievo») oppure usa <b>📐 Rileva un punto sulla tavola</b>.</div>';
return;
}
const v = x => (Math.round(x * 100) / 100).toString();
const caps = RS.scene.elements.filter(e => e.letter).map(e => String(e.letter).toUpperCase());
const campo = (T, k, val, et, t, extra) => `<label class="pm-mis${val == null ? ' vuota' : ''}" title="${escAttr(t)}">${escAttr(et)}` +
`<input type="number" step="0.01" data-pt="${escAttr(T)}" data-k="${escAttr(k)}" data-fk="${escAttr(T + '|' + k)}"${extra || ''} value="${val == null ? '' : v(val)}" placeholder="—"></label>`;
const PAROLA = { ottimo: 'ottimo', buono: 'buono', accettabile: 'accettabile', schiacciato: 'schiacciato', errore: 'non torna', incompleto: 'incompleto', 'da misurare': 'da misurare' };
let html = '<table class="measure punti"><tbody>';
sch.gruppi.forEach(g => {
html += `<tr class="mgroup"><td colspan="4">${escAttr(g.titolo)} <span class="mgroup-n">${g.punti.length}</span></td></tr>`;
g.punti.forEach(p => {
let misure = '';
if (p.metodo === 'ortogonali') {
const lato = p.ord.q.ril && p.ord.q.ril.lato ? (p.ord.q.ril.lato > 0 ? 'a dx' : 'a sx') : '';
misure = (p.asc ? campo(p.T, 'asc', p.asc.v, 'ascissa da ' + p.asc.da, 'Ascissa lungo la base, da ' + p.asc.da + ' (negativa = prima di ' + p.asc.da + ')') : '') +
campo(p.T, 'ord', p.ord.v, 'ordinata', 'Ordinata, perpendicolare alla base') + (lato ? `<span class="pm-lato">${lato}</span>` : '') +
p.dist.map(d => campo(p.T, d.da, d.v, 'controllo da ' + d.da, 'Distanza di controllo da ' + d.da)).join('');
} else misure = p.dist.map(d => campo(p.T, d.da, d.v, 'da ' + d.da, 'Distanza da ' + d.da)).join('');
misure += p.vuote.map(x => campo(p.T, x.da, null, 'da ' + x.da, 'Distanza da ' + x.da + ': da prendere', ` data-riga="${x.riga}"`)).join('');
misure += p.mancanti.map(L => campo(p.T, L, null, 'da ' + L, 'Distanza da ' + L + ': da prendere', ' data-nuova="1"')).join('');
const prese = p.dist.map(d => d.da).concat(p.vuote.map(x => x.da), p.mancanti);
const altri = caps.filter(L => L !== p.T && prese.indexOf(L) < 0);
if (altri.length && (p.dist.length || p.asc)) misure += `<select class="pm-piu" data-piu="${escAttr(p.T)}" title="Aggiungi una distanza da un altro caposaldo, per controllo"><option value="">＋ da…</option>${altri.map(L => `<option>${L}</option>`).join('')}</select>`;
const q = p.qualita, testo = q.liv === 'buono' || q.liv === 'ottimo' ? '' : q.testo;
const esito = `<span class="pm-q q-${q.liv.replace(' ', '-')}" title="${escAttr(q.testo || '')}">${PAROLA[q.liv] || q.liv}</span>${testo ? `<small class="pm-qt">${escAttr(testo)}</small>` : ''}`;
const nome = p.nome ? `<small>${escAttr(p.nome)}</small>` : '';
const haMisure = p.dist.length || p.asc || p.ord || p.vuote.length;
const elimina = (p.el && p.el.type === 'surveypt') || (!p.el && haMisure)
? `<button class="iconbtn danger" data-pdel="${escAttr(p.T)}" title="${p.el ? 'Elimina il punto e le sue misure' : 'Cancella le misure di ' + escAttr(p.T)}">🗑</button>` : '';
const mostra = p.el || p.veicolo || haMisure ? `<button class="iconbtn" data-pshow="${escAttr(p.T)}" title="Mostra sul disegno">👁</button>` : '';
html += `<tr><td class="mtag">${escAttr(p.T)}${nome}</td><td class="pm-misure">${misure}</td><td class="pm-esito">${esito}</td><td class="macts">${mostra}${elimina}</td></tr>`;
});
});
wrap.innerHTML = html + '</tbody></table>';
if (fk) { const f = [...wrap.querySelectorAll('[data-fk]')].find(x => x.dataset.fk === fk); if (f) f.focus(); }
const S = RS.scene;
wrap.querySelectorAll('input[data-pt]').forEach(inp => inp.addEventListener('change', () => {
const T = inp.dataset.pt, k = inp.dataset.k, val = parseFloat(String(inp.value).replace(',', '.'));
if (inp.dataset.riga != null || inp.dataset.nuova) {
if (!(val > 0)) { if (inp.value !== '') this.toast('Scrivi la distanza misurata, in metri'); this._rpRidisegna(); return; }
S.misure = S.misure || [];
const r = Math.round(val * 100) / 100;
if (inp.dataset.nuova) S.misure.push({ descr: k + '→' + T, val: r });
else if (S.misure[+inp.dataset.riga]) S.misure[+inp.dataset.riga].val = r;
S.render(); S.snapshot();
} else if (isNaN(val)) { this._rpRidisegna(); return; }
else if (RS.verifica.correggiMisura(T, k, val)) this.toast(T + ' ricalcolato con la misura corretta');
else this.toast('Valore non valido');
this.refreshMeasures(); this._rpRidisegna();
}));
wrap.querySelectorAll('[data-piu]').forEach(sel => sel.onchange = () => {
if (!sel.value) return;
S.misure = S.misure || [];
S.misure.push({ descr: sel.value + '→' + sel.dataset.piu, val: '' });
this._rpFocus = sel.dataset.piu + '|' + sel.value;
S.render(); S.snapshot(); this._rpRidisegna();
});
wrap.querySelectorAll('[data-pshow]').forEach(b => b.onclick = () => {
const p = [].concat.apply([], RS.verifica.schedaRilievo().gruppi.map(g => g.punti)).find(x => x.T === b.dataset.pshow); if (!p) return;
const ids = p.el ? [p.el.id] : p.veicolo ? [p.veicolo.id] : [p.ord && p.ord.q, p.asc && p.asc.q].concat(p.dist.map(d => d.q)).filter(Boolean).map(q => q.id);
if (!ids.length) { this.toast(p.T + ' non ha quote sul disegno: le sue misure sono nel registro'); return; }
S.select(ids); this.closeData();
});
wrap.querySelectorAll('[data-pdel]').forEach(b => b.onclick = () => {
const T = b.dataset.pdel, punto = /^P\d+$/.test(T);
if (!confirm(punto ? 'Eliminare il punto ' + T + ' con tutte le sue misure (quote sul disegno e righe del registro)?' : 'Cancellare le misure di ' + T + ' (quote sul disegno e righe del registro)?')) return;
RS.verifica.eliminaPunto(T); this.refreshMeasures(); this._rpRidisegna();
});
},
_rpRidisegna() {
clearTimeout(this._rpT);
this._rpT = setTimeout(() => { if (this._dataTab === 'triang' && !el('dataModal').hidden) this.renderPunti(); }, 0);
},
renderAllinea(sch) {
const box = el('allineaWrap'); if (!box || !RS.verifica) return;
const V = RS.verifica, piano = V.pianoAllineamento(), c = V.controllaMisure();
const elencati = new Set([].concat.apply([], sch.gruppi.map(g => g.punti.map(p => p.T))));
const sciolti = c.esiti.filter(x => x.livello === 'errore' && !elencati.has(x.punto));
let h = sciolti.map(x => `<div class="rp-avviso ko">⛔ ${escAttr(x.testo)}</div>`).join('');
if (piano.cambi.length) {
const nomi = piano.cambi.map(x => String(x.nome).split(' (')[0].replace(/^Punto /, '')), max = Math.max.apply(null, piano.cambi.map(x => x.sp));
h += `<div class="rp-avviso warn"><span>⚠ Il disegno non rispetta le misure di ${escAttr(nomi.join(', '))} (fino a ${max.toFixed(2).replace('.', ',')} m)</span>` +
`<button class="mini" data-allinea>📐 Allinea il disegno</button></div>` +
`<details class="rp-det"><summary>Che cosa cambia</summary>${piano.cambi.map(x => `<div>↦ ${escAttr(V.descriviCambio(x))}</div>`).join('')}` +
`<div class="mis-hint">Il 1° caposaldo della base resta fermo e il 2° va alla base misurata; i punti si ricalcolano dalle misure, i veicoli si spostano e ruotano senza deformarsi. Si annulla con Ctrl+Z.</div></details>`;
}
if (piano.scartati.length) h += `<div class="rp-avviso warn">⚠ Le misure di ${escAttr(piano.scartati.join(', '))} non tornano fra loro: correggile, poi il disegno si potrà allineare.</div>`;
box.innerHTML = h;
const ap = box.querySelector('[data-allinea]');
if (ap) ap.onclick = () => {
V.applicaAllineamento(piano);
this.toast('Disegno allineato alle misure: ' + piano.cambi.length + (piano.cambi.length === 1 ? ' oggetto spostato' : ' oggetti spostati') + ' (Ctrl+Z per annullare)');
this.renderPunti();
};
},
prepareMeasures(silenzioso) {
const S = RS.scene;
if (!S.elements.some(e => e.letter)) { this.toast('Aggiungi prima almeno un caposaldo'); return -1; }
S.misure = S.misure || [];
const sch = RS.verifica.schedaRilievo();
let added = 0;
const mb = S.meta.base || {}, A = S.get(mb.aId), B = S.get(mb.bId);
if (A && B && A !== B && !S.misure.some((m, i) => sch.usate.righe.has(i) && /\(base\)/i.test(m.descr || ''))) {
S.misure.push({ descr: A.letter + '→' + B.letter + ' (base)', val: '' }); added++;
}
sch.daPrendere.filter(x => x.riga == null).forEach(x => { S.misure.push({ descr: x.da + '→' + x.T, val: '' }); added++; });
if (added) S.render();
this.refreshMeasures();
if (!silenzioso) this.toast(added ? ('Preparate ' + added + ' misure da prendere') : 'Elenco già completo');
return added;
},
misureGuidate() {
const S = RS.scene;
S.misure = S.misure || [];
const vuota = m => m.val === '' || m.val == null;
const senza = S.elements.filter(e => e.type === 'vehicle' && e.label && (!e.fase || e.fase === 'quiete') && !(e.rilpts && e.rilpts.length));
if (senza.length) {
senza.forEach(e => { e.rilpts = RS.elements.makeRilpts(e, 1); e.spigoli = true; });
S.render(); S.snapshot(); S.emit('change');
this.toast('Punti numerati aggiunti ' + (senza.length === 1 ? 'al veicolo ' : 'ai veicoli ') + senza.map(e => e.label).join(', '), 3500);
}
const pronte = this.prepareMeasures(true);
const coda = S.misure.map((m, i) => ({ i, m })).filter(x => vuota(x.m) && gmParti(x.m.descr));
if (!coda.length) {
if (pronte >= 0) this.toast(RS.verifica.schedaRilievo().gruppi.length ? 'Nessuna misura da prendere: hanno già tutte un valore' : 'Prima numera gli spigoli dei veicoli o piazza un punto P: poi le misure si prendono qui');
return;
}
const mb = S.meta && S.meta.base || {}, lettera = id => { const c = S.get(id); return c ? String(c.letter).toUpperCase() : ''; };
const diBase = [lettera(mb.aId), lettera(mb.bId)];
const chiave = x => { const p = gmParti(x.m.descr), ib = diBase.indexOf(p.da);
return [p.base ? 0 : 1, ib >= 0 ? ib : 2, p.da, p.a]; };
coda.sort((x, y) => { const a = chiave(x), b = chiave(y);
return a[0] - b[0] || a[1] - b[1] || String(a[2]).localeCompare(b[2]) || String(a[3]).localeCompare(b[3], undefined, { numeric: true }); });
this._gm = { coda, pos: 0, testo: '', fatte: 0, saltate: 0, esito: null };
let v = el('gmVelo');
if (!v) {
v = document.createElement('div'); v.id = 'gmVelo'; v.className = 'gm-velo'; v.hidden = true;
document.body.appendChild(v);
v.addEventListener('click', ev => { const b = ev.target.closest('[data-gm]'); if (b) this._gmTasto(b.dataset.gm); });
document.addEventListener('keydown', ev => {
if (v.hidden || (el('sceltaModal') && !el('sceltaModal').hidden)) return;
const k = ev.key, mappa = { Enter: 'ok', Backspace: 'canc', Escape: 'chiudi', ',': ',', '.': ',' };
const t = /^[0-9]$/.test(k) ? k : mappa[k];
if (t) { ev.preventDefault(); ev.stopPropagation(); this._gmTasto(t); }
}, true);
}
v.hidden = false;
this._gmMostra();
},
_gmMostra() {
const g = this._gm, v = el('gmVelo'); if (!g || !v) return;
const fine = g.pos >= g.coda.length;
const esito = g.esito ? `<div class="gm-esito ${g.esito.ok ? 'ok' : 'ko'}">${g.esito.ok ? '✓' : '⚠'} ${escAttr(g.esito.testo)}</div>` : '';
if (fine) {
const c = RS.verifica ? RS.verifica.controllaMisure() : { esiti: [] }, err = c.esiti.filter(x => x.livello === 'errore').length;
v.innerHTML = `<div class="gm-box">
            <div class="gm-top"><span>Misure guidate</span><span>finito</span></div>
            <div class="gm-cosa"><div class="gm-ora">Giro completato</div><div class="gm-nome" style="font-size:26px">${g.fatte} ${g.fatte === 1 ? 'misura registrata' : 'misure registrate'}</div>
              <div class="gm-descr">${g.saltate ? g.saltate + (g.saltate === 1 ? ' saltata: resta vuota nel registro' : ' saltate: restano vuote nel registro') : 'nessuna saltata'}</div></div>
            ${esito}
            <div class="gm-esito ${err ? 'ko' : 'ok'}">${err ? '⚠ ' + err + (err === 1 ? ' misura che non torna: guardala nel rilievo dei punti prima di andare via' : ' misure che non tornano: guardale nel rilievo dei punti prima di andare via') : '✓ Le misure controllate tornano'}</div>
            <button class="gm-invio" data-gm="verifica">Torna al rilievo dei punti</button>
            <div class="gm-riga"><button class="gm-k gm-pic" data-gm="indietro">Indietro</button><button class="gm-k gm-pic" data-gm="chiudi">Chiudi</button></div>
          </div>`;
return;
}
const x = g.coda[g.pos], p = gmParti(x.m.descr);
const dopo = g.coda.slice(g.pos + 1, g.pos + 4).map(y => gmParti(y.m.descr).nome).join(' · ');
const prima = g.pos ? gmParti(g.coda[g.pos - 1].m.descr) : null;
let daQui = 0;
if (!p.base && (!prima || prima.base || prima.da !== p.da))
for (let j = g.pos; j < g.coda.length; j++) { const q = gmParti(g.coda[j].m.descr); if (q.base || q.da !== p.da) break; daQui++; }
const cambio = daQui ? `<div class="gm-cambio">📍 Nastro sul caposaldo <b>${escAttr(p.da)}</b>: ${daQui} ${daQui === 1 ? 'misura' : 'misure'} da qui, poi si passa al caposaldo seguente</div>` : '';
v.innerHTML = `<div class="gm-box gm-misura">
          <div class="gm-top"><span>Misure guidate</span><span>${g.pos + 1} di ${g.coda.length}</span><button class="gm-x" data-gm="chiudi" title="Chiudi (Esc)">✕</button></div>
          <div class="gm-barra"><i style="width:${Math.round(g.pos / g.coda.length * 100)}%"></i></div>
          ${cambio}
          <div class="gm-cosa"><div class="gm-ora">Ora misura</div><div class="gm-nome">${escAttr(p.nome)}</div><div class="gm-descr">${escAttr(p.descr)}</div></div>
          ${(() => { const m = gmMini(p); return m ? `<div class="gm-mini">${m}</div>` : ''; })()}
          <div class="gm-val"><span>${g.testo ? escAttr(g.testo) : '<em>0,00</em>'}</span><small>m</small></div>
          <div class="gm-tasti">${['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0'].map(t => `<button class="gm-k" data-gm="${t}">${t}</button>`).join('')}<button class="gm-k" data-gm="canc" title="Cancella">⌫</button></div>
          <button class="gm-invio" data-gm="ok">Invio · ${g.pos + 1 < g.coda.length ? 'misura seguente' : 'ultima misura'}</button>
          <div class="gm-riga"><button class="gm-k gm-pic" data-gm="salta">Salta</button><button class="gm-k gm-pic" data-gm="indietro"${g.pos ? '' : ' disabled'}>Indietro</button></div>
          ${esito}
          ${dopo ? `<div class="gm-dopo">Poi: ${escAttr(dopo)}</div>` : ''}
        </div>`;
},
_gmTasto(t) {
const g = this._gm; if (!g) return;
const S = RS.scene;
if (t === 'chiudi') {
el('gmVelo').hidden = true; this._gm = null;
this.refreshMeasures();
if (g.fatte) this.toast(g.fatte + (g.fatte === 1 ? ' misura registrata' : ' misure registrate') + ' nel registro');
if (RS.procedura) RS.procedura.finito('misure');
return;
}
if (t === 'verifica') { el('gmVelo').hidden = true; this._gm = null; this._dataTab = 'triang'; this.openData(); return; }
const fine = g.pos >= g.coda.length;
if (t === 'indietro') {
if (!g.pos) return;
g.pos--; const m = g.coda[g.pos].m;
g.testo = m.val === '' || m.val == null ? '' : String(m.val).replace('.', ',');
g.esito = null; return this._gmMostra();
}
if (fine) return;
if (/^[0-9]$/.test(t)) { if (g.testo.replace(',', '').length < 6 && !/,\d\d$/.test(g.testo)) g.testo += t; }
else if (t === ',') { if (g.testo.indexOf(',') < 0) g.testo = (g.testo || '0') + ','; }
else if (t === 'canc') g.testo = g.testo.slice(0, -1);
else if (t === 'salta') { g.saltate++; g.testo = ''; g.esito = null; g.pos++; this._gmPrepara(); }
else if (t === 'ok') {
const val = parseFloat(g.testo.replace(',', '.'));
if (!(val > 0)) { g.esito = { ok: false, testo: 'Scrivi la distanza misurata, in metri' }; return this._gmMostra(); }
const x = g.coda[g.pos], eraVuota = x.m.val === '' || x.m.val == null;
x.m.val = Math.round(val * 100) / 100;
if (eraVuota) g.fatte++;
S.render(); S.snapshot();
g.esito = gmControllo(gmParti(x.m.descr));
this.vibra(g.esito && !g.esito.ok ? '60,80,60,80,60' : '35');
g.pos++; this._gmPrepara();
}
this._gmMostra();
},
_gmPrepara() {
const g = this._gm, x = g.coda[g.pos];
g.testo = x && x.m.val !== '' && x.m.val != null ? String(x.m.val).replace('.', ',') : '';
},
showDataTab(name) {
this._dataTab = name;
const body = el('dataBody');
body.querySelectorAll('.dtab-btn').forEach(b => b.classList.toggle('on', b.dataset.dtab === name));
body.querySelectorAll('.dtab').forEach(d => { d.hidden = d.dataset.tab !== name; });
if (name === 'verifica' && RS.verifica) RS.verifica.render(el('verBody'));
if (name === 'triang') this.renderPunti();
},
rilevaPosizione() {
const msg = el('gpsMsg');
const dire = (t, cls) => { if (msg) { msg.textContent = t; msg.className = 'mis-hint' + (cls ? ' ' + cls : ''); } };
const fatto = (lat, lon, acc) => {
const g = (v, pos, neg) => (v >= 0 ? pos : neg) + ' ' + Math.abs(v).toFixed(5).replace('.', ',') + '°';
const txt = g(lat, 'N', 'S') + ' ' + g(lon, 'E', 'O');
RS.scene.meta.coordinate = txt;
RS.scene.meta.gps = { lat: +lat, lon: +lon, acc: Math.round(acc || 0), ora: new Date().toISOString() };
const inp = el('metaCoord'); if (inp) inp.value = txt;
if (!String(RS.scene.meta.luce || '').trim()) { const lu = calcolaLuce(RS.scene.meta); if (lu) { RS.scene.meta.luce = lu.testo; const il = el('metaLuce'); if (il) il.value = lu.testo; } }
RS.scene.emit('change');
dire('✓ Posizione rilevata' + (acc ? ' con precisione di circa ' + Math.round(acc) + ' m' : '') + '.' +
(acc > 50 ? ' È poco precisa: all\'aperto, con il GPS acceso, riprova dopo qualche secondo.' : ''), acc > 50 ? 'warn' : 'ok');
if (this._dopoGps) { const f = this._dopoGps; this._dopoGps = null; f(); }
else if (RS.luoghi) RS.luoghi.proponiVicino(+lat, +lon);
};
const errore = t => { this._gps = null; this._dopoGps = null; dire('⚠ ' + t + ' Puoi scrivere le coordinate a mano.', 'warn'); if (!msg) this.toast(t, 5000); };
const progresso = acc => {
const t = 'Ricerca della posizione… precisione attuale circa ' + Math.round(acc) + ' m, attendo un valore migliore (all\'aperto bastano pochi secondi).';
dire(t); if (!msg) this.toast(t, 2500);
};
const avviso = t => { dire(t, 'warn'); if (!msg) this.toast(t, 5000); };
if (this._gpsWatch != null && navigator.geolocation) { navigator.geolocation.clearWatch(this._gpsWatch); this._gpsWatch = null; }
this._gps = { fatto: (a, b, c) => { this._gps = null; fatto(a, b, c); }, errore, progresso, avviso };
dire('Ricerca della posizione in corso… (all\'aperto bastano pochi secondi)');
if (!msg) this.toast('Ricerca della posizione…', 2500);
if (window.RilsinAndroid && RilsinAndroid.posizione) { RilsinAndroid.posizione(); return; }
if (!navigator.geolocation) { errore('Questo dispositivo non fornisce la posizione.'); return; }
if (window.isSecureContext === false) { errore('Il browser dà la posizione solo alle pagine sicure (https): usa l\'app Android RILSIN o il file da campo.'); return; }
const inizio = Date.now(); let best = null;
const chiudi = () => { if (this._gpsWatch != null) navigator.geolocation.clearWatch(this._gpsWatch); this._gpsWatch = null; clearTimeout(this._gpsTimer); };
const usa = p => { chiudi(); if (this._gps) this._gps.fatto(p.coords.latitude, p.coords.longitude, p.coords.accuracy); };
this._gpsWatch = navigator.geolocation.watchPosition(p => {
if (!best || p.coords.accuracy < best.coords.accuracy) best = p;
const acc = best.coords.accuracy, t = Date.now() - inizio;
if (acc <= 20 || (t >= 12000 && acc <= 60)) usa(best); else if (this._gps) this._gps.progresso(acc);
}, e => {
if (best) { usa(best); return; }
chiudi();
if (this._gps) this._gps.errore(e.code === 1 ? 'Permesso di localizzazione negato: concedilo al browser per questa pagina e riprova.' : e.code === 3 ? 'Il GPS non ha risposto in tempo: spostati all\'aperto e riprova.' : 'Posizione non disponibile: controlla che la localizzazione sia attiva.');
}, { enableHighAccuracy: true, timeout: 45000, maximumAge: 0 });
this._gpsTimer = setTimeout(() => {
if (best) usa(best);
else { chiudi(); if (this._gps) this._gps.errore('Nessuna posizione dopo 45 secondi: spostati all\'aperto e riprova.'); }
}, 45000);
},
gpsRisposta(lat, lon, acc) { if (this._gps) this._gps.fatto(lat, lon, acc); },
gpsErrore(t) { if (this._gps) this._gps.errore(t); },
gpsProgresso(acc) { if (this._gps) this._gps.progresso(acc); },
gpsAvviso(t) { if (this._gps) this._gps.avviso(t); },
fillBaseSelects() {
const sA = el('baseA'), sB = el('baseB'); if (!sA || !sB) return;
const caps = RS.scene.elements.filter(e => e.letter), base = RS.scene.meta.base || (RS.scene.meta.base = {});
if (!caps.length) { sA.innerHTML = sB.innerHTML = '<option value="">(nessun caposaldo)</option>'; this.updateBaseInfo(); return; }
if (!base.aId || !caps.some(c => c.id === base.aId)) base.aId = caps[0].id;
if (!base.bId || !caps.some(c => c.id === base.bId)) base.bId = (caps[1] || caps[0]).id;
if (base.bId === base.aId && caps.length > 1) base.bId = caps.find(c => c.id !== base.aId).id;
const opts = sel => caps.map(c => `<option value="${c.id}"${c.id===sel?' selected':''}>Caposaldo ${escAttr(c.letter)}</option>`).join('');
sA.innerHTML = opts(base.aId); sB.innerHTML = opts(base.bId);
this.updateBaseInfo();
},
updateBaseInfo() {
const info = el('baseInfo'); if (!info) return;
const S = RS.scene, mb = S.meta.base || {}, A = S.get(mb.aId), B = S.get(mb.bId);
const cambia = el('rpCambia');
if (!A || !B || A === B) {
info.innerHTML = '⚠ Servono <b>due capisaldi diversi</b> sul disegno: usa “➕ Aggiungi un caposaldo”.';
info.className = 'tri-baseinfo warn';
if (cambia) cambia.open = true;
return;
}
const m2 = x => x.toFixed(2).replace('.', ','), L = Math.hypot(B.x - A.x, B.y - A.y), v = baseMisurata(A, B);
const nome = `Base <b>${escAttr(A.letter)}–${escAttr(B.letter)}</b>: `;
let t, ok;
if (!v) { t = `non ancora misurata (sul disegno ${m2(L)} m): scrivila in cima al pannello <b>Triangola</b> o prendila con le misure guidate.`; ok = false; }
else {
const torna = Math.abs(v - L) <= 0.02;
t = `misurata <b>${m2(v)} m</b> · sul disegno ${m2(L)} m ` + (torna ? '✓' : '— ⚠ il disegno non la rispetta: usa «Allinea il disegno» qui sotto');
ok = torna;
}
if (v && (v < 2 || v > 10)) { t += ' — ⚠ il metodo consiglia una base fra 2 e 10 m'; ok = false; }
info.innerHTML = nome + t;
info.className = 'tri-baseinfo' + (ok ? ' ok' : ' warn');
},
refreshMeasures() {
const wrap = el('measWrap'); if (!wrap) return;
const S = RS.scene, els = S.elements, mis = (S.misure = S.misure || []);
const usate = RS.verifica ? RS.verifica.schedaRilievo().usate : { righe: new Set(), quote: new Set() };
const geo = []; let q = 1, f = 1;
els.filter(e => e.type === 'measure').forEach(e => { const tag = 'Q' + (q++); if (!usate.quote.has(e.id)) geo.push({ e, tag, tipo: 'Quota', val: (e.valore!=null&&e.valore!=='')?Number(e.valore):dist(e.pts[0], e.pts[1]) }); });
els.filter(e => e.type === 'skid').forEach(e => geo.push({ e, tag: 'F'+(f++), tipo: e.dashed?'Scarroc.':'Frenata', val: polyLen(e) }));
els.filter(e => e.type === 'roadway').forEach(e => geo.push({ e, tag: 'S', tipo: 'Strada', val: polyLen(e) }));
const libere = mis.map((r, i) => i).filter(i => !usate.righe.has(i));
const cnt = el('measCount'); if (cnt) cnt.textContent = (libere.length + geo.length) ? '· ' + (libere.length + geo.length) : '';
if (!libere.length && !geo.length) {
wrap.innerHTML = `<div class="meas-empty">Ancora nessuna misura.<br>Scrivila qui sopra, oppure usa <b>✏️ Disegna una quota</b>.</div>`;
return;
}
let html = `<table class="measure"><thead><tr><th>Rif.</th><th>Valore</th><th>Che cosa</th><th></th></tr></thead><tbody>`;
if (libere.length) {
html += `<tr class="mgroup"><td colspan="4">✍️ Scritte qui <span class="mgroup-n">${libere.length}</span></td></tr>`;
libere.forEach(i => { const r = mis[i];
html += `<tr>
            <td class="mtag">M${i+1}</td>
            <td><div class="mis-val sm"><input data-mval="${i}" type="number" step="0.01" value="${r.val!=='' && r.val!=null ? r.val : ''}" placeholder="valore"><span>m</span></div></td>
            <td><input data-mdesc="${i}" value="${escAttr(r.descr||'')}" placeholder="descrizione…"></td>
            <td class="macts"><button class="iconbtn danger" data-mdel="${i}" title="Elimina">🗑</button></td></tr>`;
});
}
if (geo.length) {
html += `<tr class="mgroup"><td colspan="4">📐 Dal disegno <span class="mgroup-n">${geo.length}</span></td></tr>`;
geo.forEach(r => {
html += `<tr>
            <td class="mtag">${r.tag}</td>
            <td class="mval">${r.val.toFixed(2)} m <span class="mtipo">${r.tipo}</span></td>
            <td><input data-mid="${r.e.id}" value="${escAttr(r.e.note||'')}" placeholder="descrizione…"></td>
            <td class="macts">
              <button class="iconbtn" data-sel="${r.e.id}" title="Mostra sul disegno">👁</button>
              <button class="iconbtn danger" data-del="${r.e.id}" title="Elimina">🗑</button></td></tr>`;
});
}
html += `</tbody></table>`;
wrap.innerHTML = html;
wrap.querySelectorAll('[data-mval]').forEach(inp => {
inp.addEventListener('input', () => { const v = parseFloat(inp.value); mis[+inp.dataset.mval].val = isNaN(v) ? '' : v; });
inp.addEventListener('change', () => S.render());
});
wrap.querySelectorAll('[data-mdesc]').forEach(inp => {
inp.addEventListener('input', () => { mis[+inp.dataset.mdesc].descr = inp.value; });
inp.addEventListener('change', () => S.render());
});
wrap.querySelectorAll('[data-mdel]').forEach(b => b.onclick = () => { mis.splice(+b.dataset.mdel, 1); S.render(); this.refreshMeasures(); });
wrap.querySelectorAll('[data-mid]').forEach(inp => {
inp.addEventListener('input', () => { const e = S.get(inp.dataset.mid); if (e) e.note = inp.value; });
inp.addEventListener('change', () => { S.render(); S.snapshot(); });
});
wrap.querySelectorAll('[data-sel]').forEach(b => b.onclick = () => { S.select(b.dataset.sel); this.closeData(); });
wrap.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { S.remove(b.dataset.del); this.refreshMeasures(); });
},
wireScene() {
const S = RS.scene;
S.on('select', () => { this.renderProps(); this.updateStatus(); });
S.on('change', () => this.renderLegend());
S.on('tool', t => {
this.updateStatus();
this.syncPanBtn();
if (!t || t.mode === 'select') document.querySelectorAll('.pal-item.active').forEach(n => n.classList.remove('active'));
if (!t || t.mode !== 'triangulate') { this._triClosePanel(); this._triC = null; }
if (!t || t.mode !== 'ruler') RS.scene.gOverlay.querySelectorAll('.qm').forEach(n => n.remove());
this.mostraStrumento(t);
});
S.on('coord', p => { el('stCoord').textContent = 'x: ' + p.x.toFixed(2).replace('.', ',') + ' ; y: ' + p.y.toFixed(2).replace('.', ',') + ' m'; });
S.on('hint', msg => this.toast(msg));
S.on('view', () => this.updateStatus());
const fine = el('strumAttivo') && el('strumAttivo').querySelector('[data-act="fine-strumento"]');
if (fine) fine.onclick = () => RS.tools.fine();
},
mostraStrumento(t) {
const sk = RS.sketch && RS.sketch.auto, skMod = !!(sk && sk.modifica && (!t || t.mode === 'select'));
const attivo = !!(t && t.mode && t.mode !== 'select') || skMod;
const NOMI = { freehand: 'Schizzo a mano', triangulate: 'Triangolazione', ruler: 'Righello', pan: 'Sposta la tavola',
calibrate: 'Calibra la scala', text: 'Testo', poly: 'Tracciato', drag2: 'Quota', drag: 'Disegno' };
const nome = !attivo ? '' : skMod ? 'Schizzo · modifica' : (t.mode === 'freehand' || t.mode === 'triangulate' || t.mode === 'ruler' || t.mode === 'pan' || t.mode === 'calibrate')
? NOMI[t.mode] : (t.def && t.def.nome) || NOMI[t.mode] || 'Strumento';
const box = el('strumAttivo'); if (box) { box.hidden = !attivo; el('saNome').textContent = nome; }
document.querySelectorAll('.mobbar [data-act="fine-strumento"]').forEach(b => { b.hidden = !attivo; });
if (sk) sk.mostra(skMod || (attivo && t.mode === 'freehand'));
this.aggiornaVuota();
},
aggiornaVuota() {
const t = RS.tools && RS.tools.active, attivo = !!(t && t.mode && t.mode !== 'select');
el('tavolaVuota').hidden = RS.scene.elements.length > 0 || attivo || !!this._tvChiusa;
this.spazioSopra();
},
spazioSopra() {
const st = el('stage'); if (!st) return;
const box = [el('tavolaVuota'), el('skBar')].find(n => n && !n.hidden);
st.style.setProperty('--sopra', box ? (box.offsetHeight + 8) + 'px' : '0px');
},
comprimiSpiegazioni(root) {
if (!root) return;
root.querySelectorAll('.mis-hint:not(.aiuto):not(.warn):not(.ok):not(.esito):not([id])').forEach(h => {
const testo = h.textContent.trim();
if (testo && !/^[⚠✓✔]/.test(testo)) h.classList.add('aiuto');
});
},
renderProps() {
const body = el('propsBody');
if (body && !this._spOss && window.MutationObserver) {
this._spOss = new MutationObserver(() => this.comprimiSpiegazioni(body));
this._spOss.observe(body, { childList: true, subtree: true });
}
const sel = RS.scene.selection;
if (!sel.length) {
body.innerHTML = '<p class="muted">Nessun elemento selezionato.<br>Scegli un oggetto dalla tavolozza e clicca sulla tavola, oppure seleziona un elemento già presente.</p>';
return;
}
if (sel.length > 1) {
let extra = '';
if (sel.length === 2) extra = `<div class="pbtns"><button class="pbtn" data-b="quota">📐 Quota fra i due</button></div>`;
const rot = `<div class="fld"><label>Ruota tutto di (°)</label><div class="rot-sel"><input type="number" step="1" id="rotSel" placeholder="es. 30 o −12,5">` +
`<button class="pbtn" data-rs="vai">Ruota</button></div></div>` +
`<div class="pbtns"><button class="pbtn" data-rs="-1">↺ 1°</button><button class="pbtn" data-rs="1">↻ 1°</button>` +
`<button class="pbtn" data-rs="-15">↺ 15°</button><button class="pbtn" data-rs="15">↻ 15°</button><button class="pbtn" data-rs="90">↻ 90°</button></div>`;
body.innerHTML = `<p class="muted">${sel.length} elementi selezionati.</p>` + extra + section('Rotazione', rot, true, { k: 'rotsel' }) + alignButtons() + commonButtons();
const gira = deg => {
if (!deg || !isFinite(deg)) return;
this.ruotaElementi(sel.map(id => RS.scene.get(id)).filter(Boolean), deg);
RS.scene.render(); RS.scene.snapshot();
};
body.querySelectorAll('[data-rs]').forEach(b => b.onclick = () => {
if (b.dataset.rs !== 'vai') { gira(+b.dataset.rs); return; }
const inp = el('rotSel'); gira(parseFloat(String(inp.value).replace(',', '.').replace('−', '-')));
inp.value = '';
});
el('rotSel').onkeydown = ev => { if (ev.key === 'Enter') body.querySelector('[data-rs="vai"]').click(); };
bindButtons(body); return;
}
const e = RS.scene.get(sel[0]);
SEZ_TIPO = e.type;
body.innerHTML = this.testaProps(e)
+ section(e.type === 'vehicle' ? 'Misure e posizione' : 'Proprietà', fieldsFor(e, true), true, { k: 'main' })
+ commonButtons()
+ helpBlock();
const main = body.querySelector('.psec');
let dopo = main;
if (main) main.querySelectorAll(':scope > .psec-b > .psec').forEach(s => { dopo.after(s); dopo = s; });
ricordaSez(body);
bindFields(body, e);
if (RS.incroci && (e.type === 'incrocio' || e.type === 'roundabout')) RS.incroci.lega(body, e);
if (RS.curve && e.type === 'curva') RS.curve.lega(body, e);
bindButtons(body);
const hb = body.querySelector('.help-btn');
if (hb) hb.onclick = () => { const box = body.querySelector('.help-box'); box.hidden = !box.hidden; };
body.querySelectorAll('[data-rmpt]').forEach(btn => btn.onclick = () => {
const v = RS.scene.get(RS.scene.selection[0]); if (!v || !v.rilpts) return;
v.rilpts.splice(+btn.dataset.rmpt, 1);
if (!v.rilpts.length) { delete v.rilpts; delete v.spigoli; }
RS.scene.render(); RS.scene.snapshot(); this.renderProps();
});
body.querySelectorAll('[data-danno]').forEach(cb => cb.onchange = () => {
const v = RS.scene.get(RS.scene.selection[0]); if (!v) return;
const d = (v.danni || []).filter(k => k !== cb.dataset.danno);
if (cb.checked) d.push(cb.dataset.danno);
if (d.length) v.danni = d; else delete v.danni;
RS.scene.render(); RS.scene.snapshot();
});
body.querySelectorAll('[data-sk]').forEach(b => b.onclick = () => {
const el2 = RS.scene.get(RS.scene.selection[0]);
if (!el2 || el2.type !== 'sketch') return;
const nuovo = RS.sketch.converti(el2, b.dataset.sk);
if (nuovo) this.toast('Schizzo trasformato in ' + ((RS.sketch.NOMI[b.dataset.sk] || b.dataset.sk).toLowerCase()) + ' — regolane le misure qui a destra');
});
if (e.type === 'legend') this.wireLegendEditor(body, e);
body.querySelectorAll('[data-sty]').forEach(b => b.onclick = () => {
e.style = b.dataset.sty; RS.scene.render(); RS.scene.snapshot(); this.renderProps();
});
},
wireLegendEditor(body, e) {
const S = RS.scene;
body.querySelectorAll('[data-legkey]').forEach(cb => cb.onchange = () => {
e.hidden = e.hidden || [];
const k = cb.dataset.legkey, i = e.hidden.indexOf(k);
if (cb.checked) { if (i >= 0) e.hidden.splice(i, 1); }
else if (i < 0) e.hidden.push(k);
S.render(); S.snapshot();
});
body.querySelectorAll('[data-legname]').forEach(inp => {
inp.addEventListener('input', () => {
e.labels = e.labels || {};
const k = inp.dataset.legname, def = inp.dataset.legdef;
if (inp.value.trim() && inp.value !== def) e.labels[k] = inp.value; else delete e.labels[k];
S.render();
});
inp.addEventListener('change', () => S.snapshot());
});
body.querySelectorAll('[data-legtxt]').forEach(inp => {
inp.addEventListener('input', () => { e.extra[+inp.dataset.legtxt].t = inp.value; S.render(); });
inp.addEventListener('change', () => S.snapshot());
});
body.querySelectorAll('[data-legcolor]').forEach(inp => {
inp.addEventListener('input', () => { e.extra[+inp.dataset.legcolor].c = inp.value; S.render(); });
inp.addEventListener('change', () => S.snapshot());
});
body.querySelectorAll('[data-legdel]').forEach(b => b.onclick = () => {
e.extra.splice(+b.dataset.legdel, 1); S.render(); S.snapshot(); this.renderProps();
});
const add = body.querySelector('[data-legadd]');
if (add) add.onclick = () => {
const t = (el('legAddTxt').value || '').trim();
if (!t) { this.toast('Scrivi la voce da aggiungere'); el('legAddTxt').focus(); return; }
e.extra = e.extra || [];
e.extra.push({ c: el('legAddColor').value, t });
S.render(); S.snapshot(); this.renderProps();
};
const at = body.querySelector('#legAddTxt');
if (at) at.addEventListener('keydown', ev => { if (ev.key === 'Enter') { ev.preventDefault(); add.click(); } });
},
renderLegend() {
const box = el('legenda');
const els = RS.scene.elements;
if (!els.length) { box.innerHTML = '<p class="leg-empty">Nessun elemento.</p>'; return; }
const rows = [];
const vistiV = {};
els.filter(e => e.type === 'vehicle').sort((a,b)=> (a.label||'').localeCompare(b.label||''))
.forEach(e => {
if (e.label) { if (vistiV[e.label]) return; vistiV[e.label] = 1; }
const base = (e.label && els.find(v => v.type === 'vehicle' && v.label === e.label && (!v.fase || v.fase === 'quiete'))) || e;
const descr = (base.modello && String(base.modello).trim()) || catName(base);
rows.push(icona(e) + `<b>${escAttr(e.label || '')}</b> — ${escAttr(descr)}${base.targa ? ' (' + escAttr(String(base.targa).trim().toUpperCase()) + ')' : ''}`);
});
els.filter(e => e.letter).forEach(e => rows.push(icona(e) + `<b>${e.letter}</b> — Caposaldo`));
if (RS.incroci) RS.incroci.vociLegenda().forEach(r => rows.push(icona(r.ref) + escAttr(r.t)));
const seen = {};
els.filter(e => e.type === 'symbol' && !e.letter && !e.inc).forEach(e => {
if (seen[e.catId]) return; seen[e.catId] = 1;
rows.push(icona(e) + (e.nome || e.sym));
});
box.innerHTML = rows.length ? rows.map(r => `<div class="leg-row">${r}</div>`).join('') : '<p class="leg-empty">—</p>';
},
updateStatus() {
const S = RS.scene, t = RS.tools.active;
const names = { select:'Seleziona', place:'Inserisci', poly:'Disegna tracciato', drag:'Traccia', drag2:'Linea', text:'Testo', pan:'Sposta vista',
freehand:'Schizzo', triangulate:'Triangolazione', ruler:'Righello', calibrate:'Calibra la scala', placeTool:'Inserisci' };
let label = names[t.mode] || 'Seleziona';
if (t.def) label += ' · ' + t.def.nome;
el('stTool').textContent = 'Strumento: ' + label;
el('stScale').textContent = S.fuoriScala ? 'Fuori scala' : ('Scala 1:' + S.scaleDenom);
const selScala = el('scala'); if (selScala) selScala.value = S.fuoriScala ? 'nis' : String(S.scaleDenom);
el('stZoom').textContent = 'Vista: ' + S.view.w.toFixed(1).replace('.', ',') + ' m';
const n = S.selection.length;
el('stSel').textContent = n ? (n + ' selezionat' + (n>1?'i':'o')) : (S.elements.filter(x => !x.inc).length + ' oggetti');
const sf = el('stFile'), ST = RS.storage;
if (sf) {
const conFile = !!(ST && ST.fileDisponibile && ST.fileDisponibile());
sf.hidden = !conFile;
if (conFile) {
sf.textContent = ST.fileAperto ? '📄 ' + ST.fileAperto.name : '📄 non ancora salvata in un file';
if (ST.fileAperto && ST.buildFile) sf.textContent += ' · ⚠ build ' + RS.BUILD + ', la tavola è della ' + ST.buildFile;
sf.classList.toggle('warn', !!(ST.fileAperto && ST.buildFile));
sf.title = sf.textContent;
}
}
},
vociMancanti() {
if (!RS.verifica || !RS.verifica.voci) return [];
const fatte = (RS.scene.meta && RS.scene.meta.verifiche) || {};
try { return RS.verifica.voci().filter(v => v.k !== 'chiuso' && (v.s === 'manca' || (v.s === 'mano' && !fatte[v.k]))); }
catch (e) { return []; }
},
aggiornaPronto() {
const b = el('stRilievo'); if (!b) return;
if (!RS.scene.elements.length) { b.hidden = true; return; }
const n = this.vociMancanti().length;
b.hidden = false;
b.classList.toggle('ok', !n); b.classList.toggle('warn', !!n);
b.textContent = n ? '📋 Mancano ' + n + (n === 1 ? ' voce' : ' voci') : '✓ Pronto per lasciare il luogo';
b.title = 'Pronto per lasciare il luogo? Clic per vedere che cosa manca';
const p = el('prontoPop'); if (p && !p.hidden) this.apriPronto(true);
},
apriPronto(soloAggiorna) {
let p = el('prontoPop');
if (!p) {
p = document.createElement('div'); p.id = 'prontoPop'; p.className = 'pop-panel'; p.hidden = true;
document.body.appendChild(p);
document.addEventListener('pointerdown', ev => { if (!p.hidden && !p.contains(ev.target) && ev.target.id !== 'stRilievo') p.hidden = true; });
document.addEventListener('keydown', ev => { if (ev.key === 'Escape') p.hidden = true; });
}
if (!soloAggiorna && !p.hidden) { p.hidden = true; return; }
const V = this.vociMancanti();
p.innerHTML = `<div class="pop-head">Pronto per lasciare il luogo?</div>` +
(V.length ? `<div class="pronto-int">Prima di andare via controlla:</div><div class="pronto-lista">` +
V.map(v => `<div class="pronto-voce"><span>${v.s === 'mano' ? '☐' : '✗'}</span><div>${escAttr(v.t)}${v.h ? `<small>${escAttr(v.h)}</small>` : ''}${v.s === 'mano' ? '<small>da spuntare a mano nella lista</small>' : ''}</div></div>`).join('') + '</div>'
: '<div class="pronto-int">✓ Tutte le voci della lista di controllo sono a posto.</div>') +
`<div class="tri-btns"><button class="pbtn" data-pronto="lista">Apri la lista completa</button></div>`;
p.querySelector('[data-pronto="lista"]').onclick = () => { p.hidden = true; this._dataTab = 'verifica'; this.openData(); };
if (soloAggiorna) return;
p.hidden = false;
const r = el('stRilievo').getBoundingClientRect();
p.style.left = Math.max(8, Math.min(window.innerWidth - p.offsetWidth - 8, r.left)) + 'px';
p.style.top = Math.max(8, r.top - p.offsetHeight - 6) + 'px';
},
initTela() {
const S = RS.scene, svg = S.svg, stage = el('stage');
document.querySelectorAll('#zoomTela [data-act], .props-head [data-act]').forEach(b => b.addEventListener('click', () => this.action(b.dataset.act, b)));
el('barraRapida').addEventListener('click', ev => { const b = ev.target.closest('[data-br]'); if (b) this.azioneRapida(b.dataset.br, ev); });
el('tavolaVuota').addEventListener('click', ev => {
const b = ev.target.closest('[data-tv]'); if (!b) return;
if (b.dataset.tv === 'chiudi') { this._tvChiusa = true; this.aggiornaVuota(); }
else if (b.dataset.tv === 'schizzo') this.startSchizzo();
else if (b.dataset.tv === 'procedura') RS.procedura.avvia();
else if (b.dataset.tv === 'incrocio') { this.curTab = 'incroci'; this.buildTabs(); this.buildItems(); if (this.isMobile()) this.mobPanel('palette', true); this.toast('Scegli un incrocio, poi clicca sul disegno', 3000); }
else if (b.dataset.tv === 'geoportale') RS.ortofoto.apri();
else if (b.dataset.tv === 'gmaps') this.daGoogleMaps();
else if (b.dataset.tv === 'luogo') RS.luoghi.apri();
});
let cur = null, timer = null;
const nome = el('nomeHover');
const togli = () => { clearTimeout(timer); if (cur) cur.classList.remove('hov'); cur = null; nome.hidden = true; };
svg.addEventListener('pointermove', ev => {
const t = RS.tools.active;
if (ev.pointerType === 'touch' || ev.buttons || (t && t.mode !== 'select') || document.body.classList.contains('present')) { togli(); return; }
const n = ev.target.closest ? ev.target.closest('#gElements > [data-id]') : null;
const e = n ? S.get(n.dataset.id) : null;
if (!e || (e.locked && e.type === 'image') || S.selection.indexOf(e.id) >= 0) { togli(); return; }
const r = stage.getBoundingClientRect();
const metti = () => { nome.style.left = (ev.clientX - r.left + 14) + 'px'; nome.style.top = (ev.clientY - r.top + 18) + 'px'; };
if (n !== cur) {
togli(); cur = n; n.classList.add('hov');
timer = setTimeout(() => { nome.innerHTML = escAttr(nomeOggetto(e)) + '<small>clic per selezionare</small>'; nome.hidden = false; metti(); }, 350);
} else if (!nome.hidden) metti();
});
svg.addEventListener('pointerleave', togli);
svg.addEventListener('pointerdown', togli);
S.on('select', () => { togli(); this.aggiornaTela(); });
S.on('change', () => this.aggiornaTela());
let tp = null;
S.on('change', () => { clearTimeout(tp); tp = setTimeout(() => this.aggiornaPronto(), 700); });
el('stRilievo').addEventListener('click', () => this.apriPronto());
this.aggiornaPronto();
S.on('view', () => this.aggiornaTela());
window.addEventListener('resize', () => this.aggiornaTela());
this.aggiornaTela();
},
aggiornaTela() {
if (this._telaRaf) return;
const fai = () => {
if (!this._telaRaf) return;
cancelAnimationFrame(this._telaRaf.f); clearTimeout(this._telaRaf.t); this._telaRaf = null;
const S = RS.scene, ppm = S.pxPerMeter() || 20;
const L = [0.5, 1, 2, 5, 10, 20, 50, 100, 200].find(v => v * ppm >= 50) || 200;
el('scalaVista').style.setProperty('--sv', (L * ppm / 2).toFixed(1) + 'px');
el('svTesto').textContent = String(L).replace('.', ',') + ' m · vista ' + S.view.w.toFixed(1).replace('.', ',') + ' m';
const zi = el('ztInfo');
zi.textContent = S.fuoriScala ? 'fuori scala' : '1:' + S.scaleDenom;
S.svg.style.setProperty('--hv', (2.5 / ppm).toFixed(3) + 'px');
this.aggiornaVuota();
this.posizionaBarraRapida();
};
this._telaRaf = { f: requestAnimationFrame(fai), t: setTimeout(fai, 120) };
},
posizionaBarraRapida() {
const S = RS.scene, bar = el('barraRapida'), t = RS.tools.active;
const sel = S.selection.map(id => S.get(id)).filter(Boolean);
if (!sel.length || (t && t.mode !== 'select') || (RS.tools._op && RS.tools._op.kind !== 'pan')) { bar.hidden = true; return; }
let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
sel.forEach(e => { const b = RS.elements.bounds(e); if (!b) return; x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.w); y1 = Math.max(y1, b.y + b.h); });
if (x0 > x1) { bar.hidden = true; return; }
const m = S.svg.getScreenCTM(), sr = el('stage').getBoundingClientRect(), cr = S.svg.getBoundingClientRect();
if (!m) { bar.hidden = true; return; }
const pt = (x, y) => ({ x: m.a * x + m.c * y + m.e - sr.left, y: m.b * x + m.d * y + m.f - sr.top });
const a = pt(x0, y0), b = pt(x1, y1);
bar.hidden = false;
const bw = bar.offsetWidth || 240, bh = bar.offsetHeight || 38;
let top = Math.min(a.y, b.y) - bh - 46;
if (top < 8) top = Math.max(a.y, b.y) + 14;
top = Math.max(8, Math.min(cr.bottom - sr.top - bh - 8, top));
const cx = Math.max(bw / 2 + 8, Math.min(cr.right - sr.left - bw / 2 - 8, (a.x + b.x) / 2));
bar.style.left = cx + 'px'; bar.style.top = top + 'px';
},
azioneRapida(k, ev) {
const S = RS.scene, sel = S.selection.map(id => S.get(id)).filter(Boolean);
if (!sel.length) return;
if (k === 'duplica') { const b = document.querySelector('#propsBody [data-b="dup"]'); if (b) b.click(); return; }
if (k === 'elimina') { S.remove(sel.map(e => e.id)); return; }
if (k === 'avanti' || k === 'indietro') { sel.forEach(e => S.moveZ(e.id, k === 'avanti' ? 1 : -1)); return; }
if (k === 'altro') {
if (this.isMobile()) { this.mobPanel('props', true); return; }
const p = el('props'); p.classList.remove('lampo'); void p.offsetWidth; p.classList.add('lampo');
const f = el('propsBody').querySelector('input,select'); if (f) f.focus();
return;
}
const fisso = e => FISSI_ROT.indexOf(e.type) >= 0 || e.locked;
if (k === 'ruota') {
this.ruotaElementi(sel, ev && ev.shiftKey ? -15 : 15);
} else if (k === 'specchia') {
sel.forEach(e => { if (fisso(e)) return; if (e.pts) flipPts(e); else if (e.x != null) e.rot = (((e.rot || 0) + 180) % 360 + 360) % 360; });
}
S.render(); S.snapshot(); this.renderProps();
},
centroSelezione(sel) {
if (sel.length === 1) return center(sel[0]);
let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
sel.forEach(e => { const b = RS.elements.bounds(e); if (b) { x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.w); y1 = Math.max(y1, b.y + b.h); } });
return x0 > x1 ? { x: 0, y: 0 } : { x: (x0 + x1) / 2, y: (y0 + y1) / 2 };
},
ruotaElementi(sel, deg, c) {
c = c || this.centroSelezione(sel);
const r = deg * Math.PI / 180, co = Math.cos(r), si = Math.sin(r);
const giro = p => ({ x: +(c.x + (p.x - c.x) * co - (p.y - c.y) * si).toFixed(3), y: +(c.y + (p.x - c.x) * si + (p.y - c.y) * co).toFixed(3) });
const gradi = v => +((((v || 0) + deg) % 360 + 360) % 360).toFixed(1);
sel.forEach(e => {
if (FISSI_ROT.indexOf(e.type) >= 0 || e.locked) return;
if (e.pts) {
e.pts = e.pts.map(p => { if (p.aid != null) return p; return giro(p); });
if (e.type === 'roadway' || e.type === 'zebrapath') e.rot = gradi(e.rot);
} else if (e.x != null) {
if (sel.length > 1) { const q = giro(e); e.x = q.x; e.y = q.y; }
e.rot = gradi(e.rot);
}
});
},
toast(msg, ms, azioni) {
const h = el('hint'); h.textContent = msg; h.classList.add('show');
h.classList.toggle('con-azioni', !!(azioni && azioni.length));
h.classList.toggle('ok', /^✓/.test(String(msg)));
(azioni || []).forEach(a => {
const b = document.createElement('button'); b.className = 'hint-az'; b.textContent = a.t;
b.onclick = () => { h.classList.remove('show'); a.fn(); };
h.appendChild(b);
});
clearTimeout(this._t); this._t = setTimeout(() => h.classList.remove('show'), ms || 1600);
},
avvisoSalvataggio(cosa, err) {
const ora = Date.now();
this._avvisiChiusi = this._avvisiChiusi || {};
if (cosa === 'bozza' && this._avvisiChiusi.bozza && ora - this._avvisiChiusi.bozza < 180000) return;
const pieno = err && (err.name === 'QuotaExceededError' || err.code === 22 || err.code === 1014);
const dett = (err && err.message) ? ' (' + err.message + ')' : '';
const testi = {
bozza: pieno
? 'La memoria del dispositivo è piena: la copia di sicurezza automatica del disegno non si aggiorna più. Esporta subito la tavola in un file per non perdere il lavoro.'
: 'La copia di sicurezza automatica del disegno non è riuscita' + dett + '. Esporta la tavola in un file per non perdere il lavoro.',
tavola: pieno
? 'La tavola non è stata salvata: la memoria del dispositivo è piena. Esportala in un file .json; per fare spazio puoi eliminare le tavole vecchie da «Apri».'
: 'La tavola non è stata salvata' + dett + '. Esportala in un file .json per non perderla.',
server: 'Il salvataggio nell\'archivio condiviso non è riuscito' + dett + '. La tavola NON è nell\'archivio: riprova a salvare oppure esportala in un file .json.',
fascicolo: pieno
? 'Il fascicolo fotografico non entra più nella memoria del dispositivo: le ultime modifiche non sono conservate. Esportalo subito in Word.'
: 'Il fascicolo fotografico non è stato conservato' + dett + '. Esportalo in Word per non perderlo.'
};
let box = el('avvisoSalva');
if (!box) {
box = document.createElement('div');
box.id = 'avvisoSalva';
box.className = 'avviso-salva';
box.setAttribute('role', 'alert');
document.body.appendChild(box);
box.addEventListener('click', ev => {
const b = ev.target.closest('[data-avv]'); if (!b) return;
const k = box.dataset.cosa, a = b.dataset.avv;
if (a === 'esporta') {
if (k === 'fascicolo') { if (RS.fascicolo && RS.fascicolo.exportWord) RS.fascicolo.exportWord(); }
else RS.storage.exportFile();
this.toast('File esportato: conservalo nella cartella dei rilievi');
} else if (a === 'riprova') {
if (k === 'server' || k === 'tavola') this.action('salva', null);
else if (k === 'fascicolo') { if (RS.fascicolo) RS.fascicolo.save(); }
else if (RS.storage.autosave()) this.toast('Copia di sicurezza aggiornata');
} else if (a === 'chiudi') {
this._avvisiChiusi[k] = Date.now();
box.hidden = true;
}
});
}
const esporta = cosa === 'fascicolo' ? '📄 Esporta il fascicolo in Word' : '💾 Esporta la tavola (.json)';
box.dataset.cosa = cosa;
box.innerHTML = `<div class="avv-ic">⚠</div>
        <div class="avv-txt"><b>Salvataggio non riuscito</b><span>${escAttr(testi[cosa] || testi.bozza)}</span></div>
        <div class="avv-btn">
          <button data-avv="esporta" class="avv-primario">${esporta}</button>
          <button data-avv="riprova">Riprova</button>
          <button data-avv="chiudi" title="Nascondi l'avviso">✕</button>
        </div>`;
box.hidden = false;
},
salvataggioRiuscito(cosa) {
const box = el('avvisoSalva');
if (!box || box.hidden) return;
const k = box.dataset.cosa;
if (k === cosa || (cosa === 'tavola' && k === 'bozza')) box.hidden = true;
if (this._avvisiChiusi) delete this._avvisiChiusi[cosa];
}
};
const SUGGERIMENTI = {
home: ['Menu', 'Torna al menu iniziale'],
nuovo: ['Nuovo', 'Inizia una tavola nuova'],
salva: ['Salva', 'Salva la tavola aperta'],
'salva-come': ['Salva come', 'Salva una copia come tavola nuova: quella aperta resta com’è'],
apri: ['Apri', 'Apri una tavola salvata'],
dati: ['Dati e misure', 'Dati del rilievo, registro delle misure e verifica'],
'atto-menu': ['Atto delle misure', 'In PDF o in Word, oppure il fascicolo completo'],
fascicolo: ['Fascicolo foto', 'Il fascicolo fotografico'],
'vista-menu': ['Vista', 'Griglia, foglio di stampa, aggancio, righelli, livelli, minimappa'],
'altro-menu': ['Altro', 'Schizzo, raddrizza, calcoli, Salva come, esportazioni, aspetto, guida e informazioni'],
sfondo: ['Sfondo', 'Foto aerea dal Geoportale o da Google Maps, oppure un’immagine da calibrare'],
recon: ['Ricostruzione', 'Calcoli cinematici: frenata, urto, pedone, evitabilità'],
foto: ['Foto', 'Aggiunge un segnaposto fotografico sul disegno'],
raddrizza: ['Raddrizza', 'Da una foto in obliquo, la vista dall’alto in scala (facoltativo)'],
schizzo: ['Schizzo', 'Disegna col dito: l’app capisce strade, veicoli, frenate e crea gli oggetti'],
misure: ['Dati e misure', 'Intestazione, rilievo dei punti, altre misure, controllo e chiusura'],
righello: ['Righello', 'Misura al volo, senza lasciare una quota'],
triangola: ['Triangola', 'Clicca due capisaldi e inserisci le distanze'],
undo: ['Annulla', 'Annulla l’ultima modifica'],
redo: ['Ripeti', 'Rifà la modifica annullata'],
'zoom-in': ['Ingrandisci', ''],
'zoom-out': ['Riduci', ''],
fit: ['Adatta', 'Mostra tutto il disegno'],
pan: ['Sposta la vista', 'Trascina per muoverti sul disegno (anche tenendo premuta la barra spaziatrice)'],
orient: ['Ruota la vista', 'Tavola verticale oppure orizzontale'],
griglia: ['Griglia', 'Mostra o nasconde la quadrettatura'],
foglio: ['Foglio', 'Mostra o nasconde l’area di stampa (cornice del foglio A4)'],
snap: ['Snap', 'Aggancio alla griglia e ai punti degli oggetti'],
righelli: ['Righelli', 'Righelli ai bordi e guide trascinabili'],
livelli: ['Livelli', 'Mostra o nasconde gruppi di oggetti'],
minimappa: ['Minimappa', 'Piccola mappa per spostarsi sul disegno'],
present: ['Vista pulita', 'Nasconde griglia e maniglie, per le schermate'],
'esporta-png': ['PNG', 'Esporta la planimetria come immagine'],
'esporta-svg': ['SVG', 'Esporta la planimetria in vettoriale'],
stampa: ['Stampa', 'Stampa in scala sul foglio A4'],
testo: ['Dimensione del testo', 'Piccolo, normale o grande'],
guida: ['Guida rapida', 'Breve giro guidato dell’app'],
info: ['Informazioni', 'Informazioni sull’app e diritti'],
tema: ['Tema', 'Chiaro o scuro']
};
let SEZ = null, SEZ_TIPO = '';
function statoSez() {
if (!SEZ) { try { SEZ = JSON.parse(localStorage.getItem('rilsin:sezioni') || '{}') || {}; } catch (err) { SEZ = {}; } }
return SEZ;
}
function ricordaSez(root) {
root.querySelectorAll('details.psec[data-sez]>summary').forEach(s => s.addEventListener('click', () => setTimeout(() => {
const d = s.parentNode; statoSez()[d.dataset.sez] = d.open;
try { localStorage.setItem('rilsin:sezioni', JSON.stringify(SEZ)); } catch (err) {}
}, 0)));
}
function section(title, inner, open, o) {
o = o || {};
const k = SEZ_TIPO + ':' + (o.k || title), st = statoSez()[k];
return `<details class="psec" data-sez="${escAttr(k)}"${(st != null ? st : open) ? ' open' : ''}><summary><span class="psec-t">${title}</span>` +
(o.riass ? `<span class="psec-r">${o.riass}</span>` : '') + `</summary><div class="psec-b">${inner}</div></details>`;
}
const NORTH_STYLES = [
{ v: 'classica', svg: '<svg viewBox="0 0 30 30"><circle cx="15" cy="17" r="9" fill="#fff" stroke="#222"/><path d="M15 9 L18 17 L12 17 Z" fill="#222"/><path d="M15 25 L18 17 L12 17 Z" fill="#fff" stroke="#222" stroke-width="0.6"/><circle cx="15" cy="17" r="1.4" fill="#fff" stroke="#222" stroke-width="0.6"/><text x="15" y="6.5" font-size="6" text-anchor="middle" font-weight="700" fill="#222">N</text></svg>' },
{ v: 'freccia', svg: '<svg viewBox="0 0 30 30"><path d="M15 6 L21 26 L15 21 Z" fill="#222"/><path d="M15 6 L9 26 L15 21 Z" fill="#fff" stroke="#222"/><text x="15" y="5" font-size="6" text-anchor="middle" font-weight="700" fill="#222">N</text></svg>' },
{ v: 'stella', svg: '<svg viewBox="0 0 30 30"><path d="M15 3 L18 12 L27 15 L18 18 L15 27 L12 18 L3 15 L12 12 Z" fill="#222"/><text x="15" y="10" font-size="5" text-anchor="middle" font-weight="700" fill="#fff">N</text></svg>' }
];
const SCALE_STYLES = [
{ v: 'barra', svg: '<svg viewBox="0 0 40 16"><rect x="2" y="5" width="9" height="6" fill="#222"/><rect x="11" y="5" width="9" height="6" fill="#fff" stroke="#222"/><rect x="20" y="5" width="9" height="6" fill="#222"/><rect x="29" y="5" width="9" height="6" fill="#fff" stroke="#222"/></svg>' },
{ v: 'linea', svg: '<svg viewBox="0 0 40 16"><line x1="3" y1="10" x2="37" y2="10" stroke="#222" stroke-width="1"/><line x1="3" y1="4" x2="3" y2="10" stroke="#222"/><line x1="14.3" y1="4" x2="14.3" y2="10" stroke="#222"/><line x1="25.6" y1="4" x2="25.6" y2="10" stroke="#222"/><line x1="37" y1="4" x2="37" y2="10" stroke="#222"/></svg>' },
{ v: 'doppia', svg: '<svg viewBox="0 0 40 16"><rect x="2" y="5" width="9" height="3" fill="#222"/><rect x="11" y="5" width="9" height="3" fill="#fff" stroke="#222"/><rect x="20" y="5" width="9" height="3" fill="#222"/><rect x="29" y="5" width="9" height="3" fill="#fff" stroke="#222"/><rect x="2" y="8" width="9" height="3" fill="#fff" stroke="#222"/><rect x="11" y="8" width="9" height="3" fill="#222"/><rect x="20" y="8" width="9" height="3" fill="#fff" stroke="#222"/><rect x="29" y="8" width="9" height="3" fill="#222"/></svg>' }
];
function stylePicker(cur, opts) {
return '<div class="stylepick"><div class="stylepick-lbl">Stile</div><div class="stylepick-row">' +
opts.map(o => `<button class="sty-btn${o.v === cur ? ' on' : ''}" data-sty="${o.v}" title="${o.v}">${o.svg}</button>`).join('') +
'</div></div>';
}
function legendEditor(e) {
const auto = RS._legendAutoRows ? RS._legendAutoRows() : [];
const hidden = e.hidden || [], extra = e.extra || [];
let h = '<div class="leg-ed">';
const labels = e.labels || {};
h += '<div class="leg-ed-h">Voci automatiche <span class="muted">(spunta = mostra · testo modificabile)</span></div>';
if (!auto.length) h += '<div class="muted" style="margin:2px 0 6px">— nessuna —</div>';
auto.forEach(r => {
const on = hidden.indexOf(r.key) < 0;
const cur = (labels[r.key] != null && labels[r.key] !== '') ? labels[r.key] : r.t;
h += `<div class="leg-ed-row"><input type="checkbox" data-legkey="${escAttr(r.key)}"${on ? ' checked' : ''} title="Mostra / nascondi">` +
`<span class="leg-sw" style="background:${escAttr(r.c || '#888')}"></span>` +
`<input class="leg-ed-in" data-legname="${escAttr(r.key)}" data-legdef="${escAttr(r.t)}" value="${escAttr(cur)}" title="Modifica il nome (vuoto = nome automatico)"></div>`;
});
h += '<div class="leg-ed-h" style="margin-top:11px">Voci manuali</div>';
extra.forEach((x, i) => {
h += `<div class="leg-ed-row custom">` +
`<input type="color" data-legcolor="${i}" value="${toHex(x.c)}">` +
`<input class="leg-ed-in" data-legtxt="${i}" value="${escAttr(x.t || '')}" placeholder="descrizione…">` +
`<button class="iconbtn danger" data-legdel="${i}" title="Elimina">🗑</button></div>`;
});
h += `<div class="leg-ed-add">` +
`<input type="color" id="legAddColor" value="#888888">` +
`<input id="legAddTxt" class="leg-ed-in" placeholder="nuova voce…">` +
`<button class="mini" data-legadd>＋ Aggiungi</button></div>`;
h += '</div>';
return h;
}
function fieldsFor(e, noTipo) {
let h = noTipo ? '' : `<div class="muted" style="margin-bottom:8px">${tipoLabel(e)}</div>`;
if (e.inc && RS.scene.get(e.inc)) h += `<div class="mis-hint">Fa parte dell'incrocio: le modifiche (posizione, tipo, misure, cancellazione) restano anche se cambi l'incrocio. Per tornare a quello automatico: «Ripristina segnali e strisce» nelle proprietà dell'incrocio.</div>`;
if (e.type === 'sketch') {
const p = (RS.sketch && RS.sketch.riconosci) ? RS.sketch.riconosci(e) : { alternative: [] };
const NOMI = (RS.sketch && RS.sketch.NOMI) || {};
h += `<div class="mis-hint esito">Schizzo a mano libera${p.nome ? ': sembra <b>' + p.nome + '</b>' : ''}.
              Trasformalo nell'oggetto vero, disegnato in scala.</div>`;
if (p.tipo) h += `<div class="pbtns"><button class="pbtn sk-go" data-sk="${p.tipo}">✔ Trasforma in ${escAttr((NOMI[p.tipo] || p.tipo).toLowerCase())}</button></div>`;
const altre = (p.alternative || []).filter(t => t !== p.tipo);
if (altre.length) {
h += `<div class="muted" style="margin-top:8px">Oppure trasforma in:</div><div class="pbtns">` +
altre.map(t => `<button class="pbtn" data-sk="${t}">${escAttr(NOMI[t] || t)}</button>`).join('') + `</div>`;
}
h += colorFld(e.color);
return h;
}
if (e.pts) {
const auto = polyLen(e), overridden = (e.type === 'measure' && e.valore != null && e.valore !== '');
h += `<div class="fld"><label>${e.type==='measure'?'Sul disegno':'Lunghezza'}</label><input disabled value="${auto.toFixed(2)} m"></div>`;
if (e.type === 'roadway') {
h += textFld('Nome della via', 'nomeVia', e.nomeVia || '') + viaPosBtn(e);
h += numFld('Larghezza (m)', 'width', round(e.width||7), 0.1);
h += selFld('Striscia long.', 'line', e.line || 'disc',
[['disc','Tratteggiata'],['cont','Continua'],['double','Doppia continua'],['ddisc','Doppia tratteggiata'],['none','Nessuna']]);
h += selFld('Strisce di margine', 'edge', e.edge || 'cont',
[['cont','Continue'],['disc','Tratteggiate'],['wide','Continue larghe'],['none','Nessuna']]);
}
if (e.type === 'zebrapath') h += numFld('Larghezza (m)', 'width', round(e.width||3), 0.1);
if (e.type === 'roadway' || e.type === 'zebrapath') {
h += numFld('Rotazione °', 'rotpts', round(e.rot||0, 1), 5);
h += `<div class="pbtns"><button class="pbtn" data-b="rot-15">↺ −15°</button><button class="pbtn" data-b="rot+15">↻ +15°</button><button class="pbtn" data-b="rot+90">↻ 90°</button><button class="pbtn" data-b="rot-flip">⇄ Specchia</button></div>`;
}
else if (e.type === 'skid' || e.type === 'path')
h += numFld('Spessore (m)', 'width', e.width || 0.16, 0.02, 0.02, 2);
if (e.type === 'path') h += textFld('Veicolo', 'veicolo', e.veicolo || '');
if (e.type === 'measure') {
h += `<div class="fld"><label>Valore (m)</label><input type="number" step="0.01" data-k="valore" value="${overridden ? round(e.valore) : round(auto)}"></div>`;
h += `<div class="pbtns"><button class="pbtn${overridden?' danger':''}" data-b="valauto">↺ Usa la misura del disegno</button></div>`;
h += textFld('Descrizione', 'note', e.note || '');
h += `<div class="muted${overridden ? "" : " aiuto"}" style="margin-top:6px">${overridden ? '⚠ valore <b>impostato a mano</b> (diverso dal disegno).' : 'Digita un valore per <b>forzare</b> la quota a un valore diverso da quello del disegno.'}</div>`;
}
h += colorFld(e.color);
return h;
}
if (e.type === 'incrocio') return h + (RS.incroci ? RS.incroci.pannello(e) : '');
if (e.type === 'curva') return h + textFld('Nome della via', 'nomeVia', e.nomeVia || '') + viaPosBtn(e) + (RS.curve ? RS.curve.pannello(e) : '');
if (e.type !== 'text' && e.type !== 'vehicle' && e.type !== 'roundabout' && e.rot != null) h += numFld('Rotazione °', 'rot', round(e.rot,1), 1);
if (e.type === 'vehicle') {
h += `<div class="prow">${numFld('Lungh. (m)', 'len', round(e.len), 0.1)}${numFld('Largh. (m)', 'wid', round(e.wid), 0.1)}</div>`;
const tipico = RS.catalog.veicoloById(e.catId);
if (tipico && (Math.abs(tipico.len - e.len) > 0.005 || Math.abs(tipico.wid - e.wid) > 0.005))
h += `<div class="pbtns"><button class="pbtn" data-b="dimtipo">↺ Misure tipiche (${String(tipico.len).replace('.', ',')} × ${String(tipico.wid).replace('.', ',')} m)</button></div>`;
h += `<div class="prow">${numFld('Rotazione °', 'rot', round(e.rot || 0, 1), 1)}${textFld('Lettera', 'label', e.label || '')}</div>`;
const POSE = [['ruote','Su ruote'],['fiancosx','Su fianco sinistro'],['fiancodx','Su fianco destro'],['tetto','Capovolto (sul tetto)']];
let asp = selFld('Posizione', 'posa', e.posa || 'ruote', POSE);
if (e.kind !== 'trailer' && e.catId !== 'operatrice') asp += numFld('Sterzo ° (+ destra)', 'sterzo', round(e.sterzo || 0, 1), 5);
if (RS.elements.snodoInfo(e)) asp += numFld('Snodo ° (+ destra)', 'snodo', round(e.snodo || 0, 1), 5);
asp += chkFld('Freccia di marcia', 'freccia', !!e.freccia);
if (RS.elements.DUE_RUOTE[e.kind]) {
asp += chkFld('Contorno evidenziato', 'evidenzia', e.evidenzia !== false);
asp += chkFld('Conducente a bordo', 'pilota', !!e.pilota);
}
asp += colorFld(e.color);
const posa = POSE.find(p => p[0] === (e.posa || 'ruote'));
h += section('Aspetto', asp, false, { riass: `<i class="psec-col" style="background:${escAttr(toHex(e.color || '#333333'))}"></i>` +
escAttr(e.posa && e.posa !== 'ruote' ? posa[1].replace(/ \(.*\)$/, '').toLowerCase() : 'su ruote') });
h += section('Dati del veicolo',
textFld('Targa', 'targa', e.targa || '') + textFld('Marca e modello', 'modello', e.modello || '') +
textFld('Conducente', 'conducente', e.conducente || '') +
(e.label ? `<div class="pbtns"><button class="pbtn" data-b="coinvolto">👤 Scheda completa del veicolo ${escAttr(e.label)}: conducente, proprietario, assicurazione, documenti</button></div>` : '') +
`<div class="muted aiuto" style="margin-top:4px">Riportati nell'atto delle misure; targa e modello anche nella legenda. ${e.fase ? 'Valgono per tutte le posizioni di ' + escAttr(e.label || 'questo veicolo') + '.' : ''}</div>`,
!!(e.targa || e.modello || e.conducente), { riass: e.targa ? escAttr(String(e.targa).toUpperCase()) : (e.modello ? escAttr(e.modello) : 'da compilare') });
let din = selFld('Momento', 'fase', e.fase || '', [['', '— posizione unica —']].concat(RS.elements.FASI));
din += chkFld('Semitrasparente', 'trasp', !!e.trasp);
din += `<div class="pbtns"><button class="pbtn" data-b="fase-add">＋ Aggiungi un momento</button>` +
(e.fase && e.label ? `<button class="pbtn" data-b="fase-path">〰 Traccia la traiettoria</button>` : '') + `</div>`;
din += `<div class="muted aiuto" style="margin-top:4px">${e.fase && e.label
? `Sul disegno è <b>${escAttr(RS.elements.siglaFase(e))}</b>: le posizioni ricostruite di ${escAttr(e.label)} prendono gli apici (${escAttr(e.label)}′, ${escAttr(e.label)}″…) nell'ordine dei momenti; quella di quiete ha la sola lettera. ${escAttr(e.label)}1, ${escAttr(e.label)}2… restano i punti numerati (spigoli) del veicolo.`
: 'Crea una copia del veicolo per un momento precedente (percezione del pericolo, frenata, urto…), da trascinare al suo posto.'}</div>`;
h += section('Dinamica', din, !!e.fase, { riass: e.fase ? escAttr(RS.elements.nomeFase(e.fase).toLowerCase()) : 'posizione unica' });
const danni = e.danni || [];
h += section('Zona dei danni',
`<div class="danni-grid">` + RS.elements.DANNI.map(d =>
`<label class="pchk"><input type="checkbox" data-danno="${d[0]}"${danni.indexOf(d[0]) >= 0 ? ' checked' : ''}> ${d[1]}</label>`).join('') + `</div>`,
danni.length > 0, { riass: danni.length ? String(danni.length) : 'nessuna' });
if (e.rilpts && e.rilpts.length) {
let pt = `<div class="muted aiuto">Trascinali sul disegno per ridisporli (✕ per togliere):</div>`;
pt += `<div class="ptchips">` + e.rilpts.map((p, i) => `<span class="ptchip">${p.n}<button data-rmpt="${i}" title="Elimina punto">✕</button></span>`).join('') + `</div>`;
pt += `<div class="pbtns"><button class="pbtn" data-b="pointadd">＋ Punto</button><button class="pbtn" data-b="pointsregen">↺ Rigenera</button><button class="pbtn danger" data-b="points">Rimuovi tutti</button></div>`;
h += section('Punti di rilievo', pt, e.rilpts.length <= 6, { riass: String(e.rilpts.length) });
} else {
h += `<div class="pbtns"><button class="pbtn" data-b="points">🎯 Numera punti rilievo</button></div>`;
}
}
if (e.type === 'road') {
h += textFld('Nome della via', 'nomeVia', e.nomeVia || '') + viaPosBtn(e);
h += `<div class="prow">${numFld('Lungh. (m)', 'len', round(e.len), 0.1)}${numFld('Carreggiata (m)', 'wid', round(e.wid), 0.1)}</div>`;
const n0 = Math.max(1, e.lanes || 2), s = RS.elements.sezione(e) ||
{ cA: Math.ceil(n0 / 2), cB: Math.floor(n0 / 2), corsia: (e.wid - 0.5) / n0, spart: 0, banch: 0.25 };
let c = `<div class="prow">${numFld('Corsie ' + FRC.avanti, 'cA', s.cA, 1, 0, 0)}${numFld('Corsie ' + FRC.indietro, 'cB', s.cB, 1, 0, 0)}</div>`;
c += `<div class="prow">${numFld('Corsia (m)', 'corsia', round(s.corsia), 0.05, 0.5)}${numFld('Banchina (m)', 'banch', round(s.banch), 0.05, 0)}</div>`;
c += numFld('Spartitraffico (m)', 'spart', round(s.spart), 0.1, 0);
c += chkFld('Frecce di corsia', 'frecce', !!e.frecce);
c += `<div class="mis-hint">${FRC.avanti} verso la fine del tratto, ${FRC.indietro} verso l'inizio (si guida a destra). La carreggiata si ricalcola dalle corsie; il marciapiede sta fuori.</div>`;
h += section('Corsie e sezione', c, true, { riass: s.cA + ' + ' + s.cB + ' corsie' });
h += section('Marciapiedi', marciapiediHtml(e), true, { riass: riassMarc(e) });
h += selFld('Striscia centrale', 'line', e.line || 'disc',
[['disc','Tratteggiata'],['cont','Continua'],['double','Doppia continua'],['ddisc','Doppia tratteggiata'],['mixed','Continua + tratteg.'],['none','Nessuna']]);
h += selFld('Strisce di margine', 'edge', e.edge || 'cont',
[['cont','Continue'],['disc','Tratteggiate'],['wide','Continue larghe'],['none','Nessuna']]);
h += `<div class="pbtns"><button class="pbtn" data-b="raccorda">⌒ Raccorda gli incroci</button></div>`;
}
if (e.type === 'raccordo') {
h += `<div class="prow">${numFld('Raggio (m)', 'R', round(e.R), 0.5, 0.5)}${numFld('Marciap. (m)', 'marc', round(e.marc || 0), 0.1, 0)}</div>`;
h += selFld('Striscia di margine', 'edge', e.edge || 'cont',
[['cont','Continua'],['disc','Tratteggiata'],['wide','Continua larga'],['none','Nessuna']]);
h += `<div class="mis-hint">Arrotonda l'angolo fra due strade. Se sposti le strade, rifai «⌒ Raccorda gli incroci» (dalle proprietà di una strada): i raccordi automatici si ricalcolano.</div>`;
}
if (e.type === 'ramp') {
h += `<div class="prow">${numFld('Lungh. (m)', 'len', round(e.len), 0.5)}${numFld('Largh. (m)', 'wid', round(e.wid), 0.1)}</div>`;
h += selFld('Tipo di corsia', 'kind', e.kind || 'in', [['in','Immissione (accelerazione)'],['out','Uscita (decelerazione)']]);
}
if (e.type === 'crosswalk') h += `<div class="prow">${numFld('Largh. (m)', 'len', round(e.len), 0.1)}${numFld('Prof. (m)', 'wid', round(e.wid), 0.1)}</div>`;
if (e.type === 'stopline') h += numFld('Lungh. (m)', 'len', round(e.len), 0.1);
if (e.type === 'band') h += `<div class="prow">${numFld('Lungh. (m)', 'len', round(e.len), 0.1)}${numFld('Largh. (m)', 'wid', round(e.wid), 0.1)}</div>`;
if (e.type === 'mark') {
h += numFld('Lungh. (m)', 'len', round(e.len), 0.1);
h += selFld('Tipo', 'style', e.style, [['cont','Continua'],['disc','Tratteggiata'],['double','Doppia'],['edge','Margine'],['give','Dare preced.']]);
}
if (e.type === 'roundabout') h += `<div class="prow">${numFld('Diametro (m)', 'size', round(e.size), 0.5)}${numFld('Anello (m)', 'ring', round(e.ring), 0.5)}</div>`;
if (e.type === 'roundabout' && RS.incroci) h += RS.incroci.pannelloRotatoria(e);
if (e.type === 'island' || e.type === 'parking') h += `<div class="prow">${numFld('Largh. (m)', 'w', round(e.w), 0.1)}${numFld('Prof. (m)', 'h', round(e.h), 0.1)}</div>`;
if (e.type === 'island') h += selFld('Forma', 'shape', e.shape || 'ovale', [['ovale','Ovale'],['triangolo','Triangolare'],['goccia','A goccia']]);
if (e.type === 'island') h += selFld('Fondo', 'fondo', e.fondo || 'verde', [['verde','Verde (rialzata)'],['pavimentata','Pavimentata (rialzata)'],['zebrata','Zebrata (a raso)']]);
if (e.type === 'parking') h += selFld('Stalli', 'angolo', String(e.angolo == null ? 90 : e.angolo),
[['90','A pettine (90°)'],['60','A spina (60°)'],['45','A spina (45°)'],['0','In linea']]);
if (e.type === 'north') {
h += numFld('Dimens. (m)', 'size', round(e.size), 0.5);
h += stylePicker(e.style || 'classica', NORTH_STYLES);
}
if (e.type === 'graphscale') {
h += numFld('Lunghezza (m)', 'size', round(e.size), 1);
h += stylePicker(e.style || 'barra', SCALE_STYLES);
}
if (e.type === 'measuretable') {
h += numFld('Testo (m)', 'fs', round(e.fs || 0.6, 2), 0.05);
h += `<div class="muted aiuto" style="margin-top:6px">Si aggiorna in automatico dal contenuto della tavola.</div>`;
}
if (e.type === 'legend') {
h += numFld('Testo (m)', 'fs', round(e.fs || 0.6, 2), 0.05);
h += chkFld('Sagome al posto dei colori', 'sagome', e.sagome !== false);
h += legendEditor(e);
}
if (e.type === 'building') h += `<div class="prow">${numFld('Largh. (m)', 'w', round(e.w), 0.1)}${numFld('Prof. (m)', 'h', round(e.h), 0.1)}</div>`;
if (e.type === 'image') {
h += `<div class="prow">${numFld('Largh. (m)', 'w', round(e.w), 0.1)}${numFld('Alt. (m)', 'h', round(e.h), 0.1)}</div>`;
h += rngFld('Opacità', 'opacity', e.opacity != null ? e.opacity : 0.7, 0, 1, 0.05);
h += chkFld('Attenua (grigio chiaro)', 'attenua', !!e.attenua);
h += `<div class="pbtns sfondo-btns"><button class="pbtn${e.locked ? ' on' : ''}" data-b="sfondo-lock">${e.locked ? '🔓 Sblocca lo sfondo' : '🔒 Blocca lo sfondo'}</button><button class="pbtn" data-b="ritaglia">✂ Ritaglia</button></div>`;
if (e.geo) {
h += `<div class="pbtns"><button class="pbtn" data-b="ortofoto">🛰 Riscarica dal Geoportale</button><button class="pbtn" data-b="back">⬇ In fondo</button></div>`;
h += `<div class="muted" style="margin-top:6px">${escAttr(e.geo.fonte || 'Geoportale Nazionale')}: in scala (${String(round(e.w, 0))} × ${String(round(e.h, 0))} m) e Nord in alto, non va calibrata. Spostala sotto il disegno, poi blocca lo sfondo. Ortofoto del 2012: verifica lo stato dei luoghi.</div>`;
} else if (e.raddDa) {
const f = RS.scene.get(e.raddDa);
h += `<div class="pbtns">${f ? '<button class="pbtn" data-b="raddsorg">📐 Torna al raddrizzamento</button>' : ''}<button class="pbtn" data-b="back">⬇ In fondo</button></div>`;
h += `<div class="muted aiuto" style="margin-top:6px">Vista raddrizzata${f && f.n ? ' dalla foto ' + f.n : ''}: è già in scala, non va calibrata. Vale solo per il piano stradale. Allineala al rilievo, poi blocca lo sfondo.</div>`;
} else {
h += `<div class="pbtns"><button class="pbtn" data-b="calibra">📐 Calibra scala</button><button class="pbtn" data-b="raddrizza">📐 Raddrizza</button><button class="pbtn" data-b="back">⬇ In fondo</button></div>`;
h += `<div class="muted aiuto" style="margin-top:6px">Calibra: clicca due punti a distanza nota e digita i metri reali. Poi blocca lo sfondo e disegnaci sopra. Se l'immagine è una foto in obliquo, «Raddrizza» la porta in vista dall'alto.</div>`;
if (e.fonte === 'Google Maps') h += `<div class="muted aiuto" style="margin-top:6px">Da Google Maps: per la scala clicca i due estremi della barra della scala di Google e scrivi la sua lunghezza. Sulle stampe compare da sola la dicitura «Sfondo: immagini © Google».</div>`;
}
}
if (e.type === 'symbol') {
const varianti = RS.catalog.VARIANTI && RS.catalog.VARIANTI[e.sym];
if (varianti) h += selFld('Tipo', 'variante', e.catId || varianti[0], varianti.map(id => [id, RS.catalog.byId(id).nome]));
const cartelli = cartelliUsati();
if (!varianti && e.sym !== 'freccia_terra' && cartelli.some(c => c[0] === e.catId))
h += selFld('Cartello', 'cartello', e.catId, cartelli);
h += numFld('Dimens. (m)', 'size', round(e.size), 0.1);
if (e.letter != null) {
h += textFld('Caposaldo', 'letter', e.letter);
h += `<div class="mis-hint">Trascina il pallino accanto alla lettera per spostarla sul disegno.</div>`;
if (e.llx != null || e.lly != null)
h += `<div class="pbtns"><button class="pbtn" data-b="lblreset">↺ Riporta la lettera al suo posto</button></div>`;
}
else h += textFld('Etichetta', 'label', e.label || '');
if (e.sym === 'limite') h += textFld('Valore', 'text', e.text || '50');
if (e.sym === 'chilometrica') h += textFld('Progressiva', 'text', e.text || 'km 0+000');
if (e.sym === 'freccia_terra') h += selFld('Direzione', 'dir', e.dir || 'dritto', [['dritto','Dritto'],['dritto_sx','Dritto e sinistra'],['dritto_dx','Dritto e destra']]);
if (e.sym === 'obbligo') h += selFld('Direzione', 'dir', e.dir || 'dritto', [['dritto','Dritto'],['destra','A destra'],['sinistra','A sinistra']]);
if (e.sym === 'persona') {
h += selFld('Posizione', 'posa', e.posa || 'supina', RS.catalog.SIMBOLI.filter(d => d.sym === 'persona').map(d => [d.posa, d.nome]));
if (e.posa === 'moto' || e.posa === 'bici') h += `<div class="fld"><label>Colore casco</label><input type="color" data-k="casco" value="${toHex(e.casco || (e.posa === 'moto' ? '#c0392b' : '#f1c40f'))}"></div>`;
h += `<div class="mis-hint">Lunghezza = altezza della persona; la testa è verso la punta di rotazione.</div>`;
}
if (e.sym === 'cartello') {
const tutti = RS.catalog.SEGNALETICA.filter(d => d.sym === 'cartello');
h += selFld('Cartello', 'cod', e.cod, tutti.map(d => [d.cod, d.sec + ' — ' + d.nome]));
if (RS.cartelli.conTesto(e.cod)) h += textFld('Località', 'text', e.text || '');
if (String(e.cod).indexOf('p:') === 0) h += chkFld('Provvisorio (fondo giallo)', 'provv', !!e.provv);
}
if (e.sym === 'semaforo') h += selFld('Stato al sinistro', 'stato', e.stato || '',
[['','Non indicato'],['rosso','Rosso'],['giallo','Giallo'],['verde','Verde'],['lampeggiante','Giallo lampeggiante'],['spento','Spento / guasto']]);
}
if (e.type === 'foto') {
h += textFld('Descrizione', 'descr', e.descr || '');
h += numFld('Dimens. (m)', 'size', round(e.size||0.9), 0.1);
if (e.href) h += `<div class="foto-thumb"><img src="${e.href}" alt=""></div>`;
h += `<div class="pbtns"><button class="pbtn" data-b="fotoopen">🔍 Apri</button><button class="pbtn" data-b="fotorepl">🔄 Sostituisci</button></div>`;
if (e.href) {
h += `<div class="pbtns"><button class="pbtn" data-b="raddrizza">📐 Raddrizza foto</button></div>`;
h += `<div class="muted" style="margin-top:4px">${e.radd ? `Raddrizzata: riferimento ${String(round(e.radd.L, 2)).replace('.', ',')} × ${String(round(e.radd.W, 2)).replace('.', ',')} m, ${(e.radd.misure || []).length} misure.`
: 'Facoltativo: da una foto in obliquo ricava la vista dall\'alto in scala del piano stradale.'}</div>`;
}
}
if (e.type === 'panorama') {
h += textFld('Descrizione', 'descr', e.descr || '');
h += numFld('Dimens. (m)', 'size', round(e.size || 1.1), 0.1);
h += `<div class="pbtns"><button class="pbtn pbtn-pano" data-b="panoapri">🌐 Apri la panoramica</button><button class="pbtn" data-b="panorepl">🔄 Sostituisci</button></div>`;
h += `<div class="muted aiuto" style="margin-top:6px">Lo spicchio indica dove guarda il centro della foto: giralo (maniglia tonda o «Rotazione») verso quella direzione sulla tavola, così le viste estratte dicono da che parte guardano. Nella panoramica «Aggiungi questa vista al fascicolo» mette l'inquadratura fra le foto, con la didascalia.</div>`;
}
if (e.type === 'text') {
h += textFld('Testo', 'text', e.text || '');
h += `<div class="prow">${numFld('Dimens. (m)', 'size', round(e.size||0.8), 0.1)}${numFld('Rotazione °', 'rot', round(e.rot||0,1), 1)}</div>`;
}
const hasColor = ['symbol','road','band','building','island','roundabout','text','mark','arrow'];
if (hasColor.indexOf(e.type) >= 0) h += colorFld(e.color);
return h;
}
function helpBlock() {
return `<button class="help-btn">A cosa servono i campi</button>
      <div class="help-box" hidden>
        <b>Lunghezza / Larghezza / Dimensione</b>: ingombro reale dell'oggetto in metri
        (la lunghezza è la dimensione maggiore, lungo l'asse del veicolo).<br>
        <b>Rotazione</b>: orientamento in gradi.<br>
        <b>Etichetta / Lettera</b>: identificativo mostrato sull'oggetto.<br>
        <b>Colore</b>: colore di disegno.<br>
        Per <b>spostare</b> l'oggetto trascinalo sulla tavola; per <b>ruotarlo</b> o
        <b>ridimensionarlo</b> usa le maniglie attorno alla selezione.
      </div>`;
}
function commonButtons() {
const sel = RS.scene.selection, anyLocked = sel.some(id => (RS.scene.get(id)||{}).locked);
const inGroup = sel.some(id => (RS.scene.get(id)||{}).gid);
const b = (act, nome, svg, cls) => `<button class="pazb${cls ? ' ' + cls : ''}" data-b="${act}" title="${nome}" aria-label="${nome}"><svg viewBox="0 0 24 24">${svg}</svg></button>`;
return `<div class="pazioni">` +
b('dup', 'Duplica', '<rect x="8" y="8" width="12" height="12" rx="1.5"/><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8"/>') +
b('front', 'Porta avanti', '<path d="M12 19V5M6 11l6-6 6 6"/>') +
b('back', 'Porta indietro', '<path d="M12 5v14M6 13l6 6 6-6"/>') +
b('lock', anyLocked ? 'Sblocca' : 'Blocca', anyLocked
? '<rect x="5" y="11" width="14" height="9" rx="1.5"/><path d="M8 11V8a4 4 0 0 1 7.5-2"/>'
: '<rect x="5" y="11" width="14" height="9" rx="1.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>', anyLocked ? 'on' : '') +
(sel.length > 1 ? b('group', 'Raggruppa', '<rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/><path d="M15 3h6v6M3 15v6h6" stroke-dasharray="2 2"/>') : '') +
(inGroup ? b('ungroup', 'Separa il gruppo', '<rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/>') : '') +
`<span class="paz-sp"></span>` +
b('del', 'Elimina', '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>', 'danger') +
`</div>`;
}
function alignButtons() {
return `<div class="muted" style="margin-top:6px">Allinea / distribuisci</div>
      <div class="align-grid">
        <button class="pbtn" data-b="al-L" title="Sinistra">⇤</button>
        <button class="pbtn" data-b="al-C" title="Centro orizz.">↔</button>
        <button class="pbtn" data-b="al-R" title="Destra">⇥</button>
        <button class="pbtn" data-b="al-T" title="Alto">⤒</button>
        <button class="pbtn" data-b="al-M" title="Centro vert.">↕</button>
        <button class="pbtn" data-b="al-B" title="Basso">⤓</button>
        <button class="pbtn" data-b="dist-H" title="Distribuisci orizz.">⇹</button>
        <button class="pbtn" data-b="dist-V" title="Distribuisci vert.">⤢</button>
      </div>`;
}
function bindFields(root, e) {
root.querySelectorAll('[data-k]').forEach(inp => {
const k = inp.dataset.k;
const rinomina = (k === 'letter' && e.letter != null) || (k === 'label' && e.type === 'vehicle');
let vecchia = rinomina ? String(e[k] || '') : null;
const handler = (commit) => {
if (rinomina && commit) {
const nuova = String(inp.value || '').trim().toUpperCase();
if (nuova === vecchia.toUpperCase()) return;
if (k === 'letter' && nuova && RS.scene.elements.some(x => x !== e && x.letter && String(x.letter).toUpperCase() === nuova)) {
inp.value = vecchia; e.letter = vecchia; RS.scene.render();
RS.ui.toast('La lettera ' + nuova + ' è già di un altro caposaldo: scegline un\'altra'); return;
}
const n = rinominaRiferimenti(k === 'letter' ? 'cap' : 'veicolo', vecchia, nuova);
if (k === 'label') RS.scene.elements.forEach(x => { if (x !== e && x.type === 'vehicle' && vecchia && String(x.label || '').toUpperCase() === vecchia.toUpperCase()) x.label = nuova; });
e[k] = nuova; inp.value = nuova; vecchia = nuova;
RS.scene.render(); RS.scene.snapshot(); RS.ui.renderLegend();
if (n) RS.ui.toast('Lettera cambiata anche in ' + n + (n === 1 ? ' misura' : ' misure'));
return;
}
let v;
if (inp.type === 'checkbox') v = inp.checked;
else if (inp.type === 'number' || inp.type === 'range') { v = parseFloat(inp.value); if (isNaN(v)) return; }
else v = inp.value;
if (k === 'cartello') {
const d = RS.catalog.byId(v); if (!d) return;
e.sym = d.sym; e.catId = d.id; e.nome = d.nome; e.color = d.color;
if (d.cod) e.cod = d.cod; else delete e.cod;
if (d.sym !== 'semaforo') delete e.stato;
RS.scene.render();
if (commit) { RS.scene.snapshot(); RS.ui.renderLegend(); setTimeout(() => RS.ui.renderProps(), 0); }
return;
}
if (k === 'variante') {
const d = RS.catalog.byId(v); if (!d) return;
e.catId = d.id; e.nome = d.nome; e.color = d.color;
RS.scene.render();
if (commit) { RS.scene.snapshot(); RS.ui.renderLegend(); setTimeout(() => RS.ui.renderProps(), 0); }
return;
}
if (k === 'nomeVia') {
e.nomeVia = v; RS.scene.render();
if (commit) { e.nomeVia = String(v || '').trim(); localitaDalleVie(); RS.scene.render(); RS.scene.snapshot(); }
return;
}
if (k === 'marcLati' || k === 'marcDx' || k === 'marcSx') {
if (!commit) return;
RS.elements.impostaMarc(e, k, v);
RS.scene.render(); RS.scene.snapshot(); setTimeout(() => RS.ui.renderProps(), 0);
return;
}
if (k === 'rotpts') { rotatePts(e, v - (e.rot || 0)); e.rot = v; RS.scene.render(); if (commit) RS.scene.snapshot(); return; }
const sezK = e.type === 'road' && (RS.elements.SEZIONE_K[k] || k === 'wid');
if (sezK && RS.elements.SEZIONE_K[k]) RS.elements.avviaSezione(e);
e[k] = v;
if (sezK) { RS.elements.aggiornaSezione(e, k); if (commit) setTimeout(() => RS.ui.renderProps(), 0); }
if (k === 'cod' && e.sym === 'cartello') {
const d = RS.catalog.SEGNALETICA.find(x => x.cod === v);
if (d) { e.nome = d.nome; e.catId = d.id; }
if (commit) setTimeout(() => RS.ui.renderProps(), 0);
}
if (k === 'posa' && e.sym === 'persona') {
const d = RS.catalog.SIMBOLI.find(x => x.sym === 'persona' && x.posa === v);
if (d) { e.nome = d.nome; e.catId = d.id; }
}
if (e.type === 'vehicle' && e.label && (k === 'targa' || k === 'modello' || k === 'conducente'))
RS.scene.elements.forEach(x => { if (x !== e && x.type === 'vehicle' && x.label === e.label) x[k] = v; });
RS.scene.render();
if (commit) { RS.scene.snapshot(); RS.ui.renderLegend(); }
if (commit && k === 'fase') RS.ui.renderProps();
};
if (inp.type === 'number') {
inp.addEventListener('change', () => handler(true));
inp.addEventListener('keydown', ev => { if (ev.key === 'Enter') inp.blur(); });
inp.addEventListener('focus', () => inp.select());
} else {
inp.addEventListener('input', () => handler(false));
inp.addEventListener('change', () => handler(true));
}
});
}
function bindButtons(root) {
root.querySelectorAll('[data-b]').forEach(b => b.onclick = () => {
const S = RS.scene, sel = S.selection.slice(), act = b.dataset.b;
if (act === 'del') { S.remove(sel); return; }
if (act === 'front') { sel.forEach(id => S.moveZ(id, 1)); return; }
if (act === 'back') { sel.forEach(id => S.moveZ(id, -1)); return; }
if (act === 'lock') {
const anyLocked = sel.some(id => (S.get(id)||{}).locked);
sel.forEach(id => { const e = S.get(id); if (e) e.locked = !anyLocked; });
S.render(); S.snapshot(); RS.ui.renderProps(); return;
}
if (act === 'group') {
if (sel.length < 2) { RS.ui.toast('Seleziona almeno 2 oggetti'); return; }
const gid = 'g' + Date.now(); sel.forEach(id => { const e = S.get(id); if (e) e.gid = gid; });
S.snapshot(); RS.ui.renderProps(); RS.ui.toast('Oggetti raggruppati'); return;
}
if (act === 'ungroup') {
sel.forEach(id => { const e = S.get(id); if (e) delete e.gid; });
S.snapshot(); RS.ui.renderProps(); RS.ui.toast('Gruppo separato'); return;
}
if (act.indexOf('rot') === 0) {
const e = S.get(sel[0]); if (!e || !e.pts) return;
if (act === 'rot-flip') flipPts(e);
else {
const d = parseFloat(act.slice(3)); if (isNaN(d)) return;
rotatePts(e, d); e.rot = (((e.rot || 0) + d) % 360 + 360) % 360;
}
S.render(); S.snapshot(); RS.ui.renderProps(); return;
}
if (act.indexOf('al-') === 0) { alignSelection(act.slice(3)); return; }
if (act.indexOf('dist-') === 0) { distributeSelection(act.slice(5)); return; }
if (b.dataset.b === 'quota') {
const m = S.add({ type: 'measure', pts: [anchorCenter(S.get(sel[0])), anchorCenter(S.get(sel[1]))], color: '#c0392b' });
S.select(m.id); return;
}
if (act === 'fotoopen') {
const e = S.get(sel[0]);
if (e && e.href) { const w = window.open(); if (w) { const img = w.document.createElement('img'); img.style.maxWidth = '100%'; img.src = e.href; w.document.body.appendChild(img); } }
return;
}
if (act === 'fotorepl') { RS.ui._replaceFotoId = sel[0]; el('fotoOpen').click(); return; }
if (act === 'lblreset') {
const e = S.get(sel[0]); if (!e) return;
delete e.llx; delete e.lly;
S.render(); S.snapshot(); RS.ui.renderProps(); RS.ui.toast('Lettera riportata nella posizione predefinita'); return;
}
if (b.dataset.b === 'calibra') { RS.tools.startCalibrate(S.selection[0]); return; }
if (b.dataset.b === 'ritaglia') { RS.ui.ritagliaSfondo(S.get(S.selection[0])); return; }
if (b.dataset.b === 'panoapri') { if (RS.panorama) RS.panorama.apri(S.get(S.selection[0])); return; }
if (b.dataset.b === 'panorepl') { if (RS.panorama) RS.panorama.sostituisci(S.get(S.selection[0])); return; }
if (b.dataset.b === 'sfondo-lock') {
const s = S.get(S.selection[0]); if (!s) return;
s.locked = !s.locked; S.render(); S.snapshot();
if (s.locked) { S.select([]); RS.ui.toast('🔒 Sfondo bloccato: ora si disegna sopra senza spostarlo. Per sbloccarlo toccalo', 4500); }
else { S.select([s.id]); RS.ui.renderProps(); RS.ui.toast('🔓 Sfondo sbloccato: ora si sposta', 3000); }
return;
}
if (b.dataset.b === 'ortofoto') { RS.ortofoto.apri(); return; }
if (b.dataset.b === 'raccorda') { RS.raccordi.comando(); return; }
if (b.dataset.b === 'raddrizza') { RS.raddrizza.apri(S.get(S.selection[0])); return; }
if (b.dataset.b === 'raddsorg') { const im = S.get(S.selection[0]); if (im) RS.raddrizza.apri(S.get(im.raddDa)); return; }
if (b.dataset.b === 'valauto') {
const e = S.get(sel[0]); if (e) { delete e.valore; S.render(); S.snapshot(); RS.ui.renderProps(); RS.ui.toast('Valore ripristinato dalla misura del disegno'); }
return;
}
if (b.dataset.b === 'viaauto') { const e = S.get(sel[0]); if (e) { delete e.viaPos; S.render(); S.snapshot(); S.emit('select'); } return; }
if (b.dataset.b === 'coinvolto') { const e = S.get(sel[0]); if (e && RS.coinvolti) RS.coinvolti.apriVeicolo(e.label); return; }
if (b.dataset.b === 'points') {
const e = S.get(sel[0]); if (!e || e.type !== 'vehicle') return;
if (e.rilpts || e.spigoli) { delete e.rilpts; delete e.spigoli; delete e.spigoliBase; }
else { e.rilpts = RS.elements.makeRilpts(e, 1); e.spigoli = true; }
S.render(); S.snapshot(); RS.ui.renderProps(); return;
}
if (b.dataset.b === 'pointadd') {
const e = S.get(sel[0]); if (!e || e.type !== 'vehicle') return;
e.rilpts = e.rilpts || [];
const n = e.rilpts.reduce((m, p) => Math.max(m, p.n), 0) + 1;
e.rilpts.push({ lx: 0, ly: 0, n }); e.spigoli = true;
S.render(); S.snapshot(); RS.ui.renderProps();
RS.ui.toast('Punto ' + n + ' aggiunto al centro — trascinalo in posizione');
return;
}
if (b.dataset.b === 'pointsregen') {
const e = S.get(sel[0]); if (!e || e.type !== 'vehicle') return;
delete e.rilpts; e.rilpts = RS.elements.makeRilpts(e, 1); e.spigoli = true;
S.render(); S.snapshot(); RS.ui.renderProps(); return;
}
if (act === 'dimtipo') {
const e = S.get(sel[0]), t = e && RS.catalog.veicoloById(e.catId); if (!t) return;
const kx = t.len / e.len, ky = t.wid / e.wid;
if (e.rilpts) e.rilpts.forEach(p => { p.lx *= kx; p.ly *= ky; });
e.len = t.len; e.wid = t.wid;
S.render(); S.snapshot(); RS.ui.renderProps(); RS.ui.toast('Misure tipiche ripristinate'); return;
}
if (act === 'fase-add') {
const e = S.get(sel[0]); if (!e || e.type !== 'vehicle') return;
if (!e.label) { RS.ui.toast('Dai prima una lettera al veicolo (per esempio A)'); return; }
const ord = RS.elements.FASI.map(f => f[0]);
let avviso = '';
if (!e.fase) { e.fase = 'quiete'; avviso = e.label + ' è la posizione di quiete; '; }
const i = ord.indexOf(e.fase);
const c = JSON.parse(JSON.stringify(e)); delete c.id; delete c.z;
delete c.rilpts; delete c.spigoli; delete c.spigoliBase;
c.fase = i > 0 ? ord[i - 1] : 'intermedia'; c.trasp = true;
delete c.sterzo; delete c.snodo; delete c.posa;
if (c.fase !== 'urto') delete c.danni;
const r = (e.rot || 0) * Math.PI / 180, d = e.len * 1.15;
c.x = e.x - Math.cos(r) * d; c.y = e.y - Math.sin(r) * d;
const n = S.add(c, false);
S.snapshot(); S.select(n.id);
RS.ui.toast(avviso + 'aggiunta la posizione «' + RS.elements.nomeFase(c.fase).toLowerCase() + '»: trascinala al suo posto');
return;
}
if (act === 'fase-path') {
const e = S.get(sel[0]); if (!e || !e.label) return;
const pos = S.elements.filter(v => v.type === 'vehicle' && v.label === e.label && v.fase)
.sort(RS.elements.ordinePosizioni);
if (pos.length < 2) { RS.ui.toast('Servono almeno due momenti di ' + e.label + ': usa «Aggiungi un momento»'); return; }
const pts = pos.map(v => ({ x: v.x, y: v.y }));
const a = pts[pts.length - 2], z = pts[pts.length - 1], ult = pos[pos.length - 1];
const lz = Math.hypot(z.x - a.x, z.y - a.y), acc = ult.len / 2 + 0.25;
if (lz > acc + 0.5) pts[pts.length - 1] = { x: z.x - (z.x - a.x) / lz * acc, y: z.y - (z.y - a.y) / lz * acc };
S.elements = S.elements.filter(x => !(x.type === 'path' && x.dinamica === e.label));
const zMin = Math.min.apply(null, pos.map(v => v.z || 0)) - 0.5;
const p = S.add({ type: 'path', pts, color: pos[0].color || '#2f6fed', width: 0.1, dashed: true, arrow: true, dinamica: e.label, z: zMin }, false);
S.render(); S.snapshot(); S.select(p.id);
RS.ui.toast('Traiettoria di ' + e.label + ' tracciata: ' + pos.map(v => RS.elements.siglaFase(v)).join(' → '));
return;
}
if (b.dataset.b === 'dup') {
const newIds = [];
sel.forEach(id => {
const c = JSON.parse(JSON.stringify(S.get(id))); delete c.id;
if (c.pts) c.pts = c.pts.map(p => ({ x: p.x + 1, y: p.y + 1 }));
else { c.x += 1; c.y += 1; }
if (c.type === 'vehicle') c.label = '';
newIds.push(S.add(c, false).id);
});
S.snapshot(); S.select(newIds);
}
});
}
function numFld(label, k, v, step, min, dec) {
step = step || 0.1;
return `<div class="fld"><label>${label}</label><input type="number" data-k="${k}" value="${v}" step="${step}"${min!=null?` min="${min}"`:''}></div>`;
}
function calcolaLuce(meta) {
const m = /(\d{1,2})\/(\d{1,2})\/(\d{4})\D+(\d{1,2})[:.](\d{2})/.exec(String(meta.data || ''));
if (!m) return null;
let lat, lon;
if (meta.gps && isFinite(meta.gps.lat) && isFinite(meta.gps.lon)) { lat = +meta.gps.lat; lon = +meta.gps.lon; }
else {
const c = /([NS])\s*(\d+(?:[.,]\d+)?)\s*°?\s*([EOW])\s*(\d+(?:[.,]\d+)?)/i.exec(String(meta.coordinate || ''));
if (!c) return null;
lat = parseFloat(c[2].replace(',', '.')) * (/S/i.test(c[1]) ? -1 : 1);
lon = parseFloat(c[4].replace(',', '.')) * (/[OW]/i.test(c[3]) ? -1 : 1);
}
const t = new Date(+m[3], +m[2] - 1, +m[1], +m[4], +m[5]);
if (isNaN(t)) return null;
const rad = Math.PI / 180, d = t.getTime() / 86400000 + 2440587.5 - 2451545.0;
const g = (357.529 + 0.98560028 * d) % 360, q = (280.459 + 0.98564736 * d) % 360;
const L = q + 1.915 * Math.sin(g * rad) + 0.020 * Math.sin(2 * g * rad), e = 23.439 - 0.00000036 * d;
const ra = Math.atan2(Math.cos(e * rad) * Math.sin(L * rad), Math.cos(L * rad)) / rad;
const dec = Math.asin(Math.sin(e * rad) * Math.sin(L * rad)) / rad;
const gmst = ((18.697374558 + 24.06570982441908 * d) % 24 + 24) % 24;
const ha = ((gmst * 15 + lon - ra) % 360 + 540) % 360 - 180;
const alt = Math.asin(Math.sin(lat * rad) * Math.sin(dec * rad) + Math.cos(lat * rad) * Math.cos(dec * rad) * Math.cos(ha * rad)) / rad;
const az = (Math.atan2(Math.sin(ha * rad), Math.cos(ha * rad) * Math.sin(lat * rad) - Math.tan(dec * rad) * Math.cos(lat * rad)) / rad + 180 + 360) % 360;
const dir = ['Nord', 'Nord-Est', 'Est', 'Sud-Est', 'Sud', 'Sud-Ovest', 'Ovest', 'Nord-Ovest'][Math.round(az / 45) % 8];
let testo = alt >= 0 ? 'Giorno' : alt >= -6 ? 'Alba o crepuscolo' : 'Notte';
if (alt >= 0 && alt < 15) testo += ', sole basso a ' + dir + ' (' + Math.round(alt) + '°): possibile abbagliamento';
return { testo, alt, az };
}
RS.calcolaLuce = calcolaLuce;
function textFld(label, k, v) {
return `<div class="fld"><label>${label}</label><input type="text" data-k="${k}" value="${escAttr(v)}"></div>`;
}
function viaPosBtn(e) {
if (!String(e.nomeVia || '').trim()) return '';
return e.viaPos ? `<div class="pbtns"><button class="pbtn" data-b="viaauto">↺ Nome della via nella posizione automatica</button></div>`
: '<p class="muted" style="margin:2px 0 8px;font-size:11.5px">Per spostare il nome della via trascinalo sulla tavola (nello schizzo: tienilo premuto e trascina).</p>';
}
function colorFld(v) {
return `<div class="fld"><label>Colore</label><input type="color" data-k="color" value="${toHex(v||'#333333')}"></div>`;
}
function cartelliUsati() {
const t = (RS.catalog.PALETTE || []).find(p => p.id === 'segnal');
return t ? t.items.filter(d => d.sec === 'Cartelli più usati' && d.sym).map(d => [d.id, d.etichetta || d.nome]) : [];
}
function selFld(label, k, v, opts) {
const o = opts.map(p => `<option value="${p[0]}"${p[0]===v?' selected':''}>${p[1]}</option>`).join('');
return `<div class="fld"><label>${label}</label><select data-k="${k}">${o}</select></div>`;
}
function chkFld(label, k, checked) {
return `<div class="fld"><label>${label}</label><input type="checkbox" data-k="${k}"${checked?' checked':''}></div>`;
}
function rngFld(label, k, v, min, max, step) {
return `<div class="fld"><label>${label}</label><input type="range" data-k="${k}" value="${v}" min="${min}" max="${max}" step="${step}"></div>`;
}
function localitaDalleVie() {
const S = RS.scene, m = S.meta = S.meta || {}, nomi = [];
if (S.elements.some(x => (x.type === 'incrocio' || x.type === 'roundabout') && (x.bracci || []).some(b => String(b.nome || '').trim()))) return;
S.elements.forEach(x => { const t = String(x.nomeVia || '').trim(); if (t && !x.inc && nomi.indexOf(t) < 0) nomi.push(t); });
if (!nomi.length) return;
const t = nomi.join(' incrocio ');
if (!String(m.localita || '').trim() || m.localita === m._locAuto) { m.localita = t; m._locAuto = t; }
}
function latoMarc(o) {
const l = RS.elements.latiMarc(o);
return l.dx > 0 && l.sx > 0 ? 'entrambi' : l.dx > 0 ? 'dx' : l.sx > 0 ? 'sx' : 'nessuno';
}
function marciapiediHtml(o) {
const l = RS.elements.latiMarc(o), lato = latoMarc(o);
let c = selFld('Marciapiede', 'marcLati', lato,
[['nessuno', 'Nessuno'], ['entrambi', 'Su entrambi i lati'], ['dx', 'Solo a destra'], ['sx', 'Solo a sinistra']]);
if (lato !== 'nessuno') c += `<div class="prow">${l.sx > 0 ? numFld('Sinistra (m)', 'marcSx', round(l.sx), 0.05, 0) : ''}${l.dx > 0 ? numFld('Destra (m)', 'marcDx', round(l.dx), 0.05, 0) : ''}</div>`;
c += `<div class="mis-hint">Destra e sinistra guardando verso la fine del tratto (${FRC.avanti}). Le due larghezze possono essere diverse.</div>`;
return c;
}
function riassMarc(o) {
const l = RS.elements.latiMarc(o), m = v => String(round(v)).replace('.', ',');
return { nessuno: 'nessuno', entrambi: l.dx === l.sx ? m(l.dx) + ' m per lato' : m(l.sx) + ' + ' + m(l.dx) + ' m', dx: 'a destra', sx: 'a sinistra' }[latoMarc(o)];
}
const FISSI_ROT = ['legend', 'measuretable', 'graphscale', 'raccordo'];
function center(el) { const b = RS.elements.bounds(el); return b ? { x: b.x + b.w/2, y: b.y + b.h/2 } : { x: el.x||0, y: el.y||0 }; }
function rotatePts(e, deg) {
if (!e || !e.pts || !deg) return;
const c = center(e), r = deg * Math.PI / 180, co = Math.cos(r), si = Math.sin(r);
e.pts = e.pts.map(p => {
const dx = p.x - c.x, dy = p.y - c.y;
const q = { x: +(c.x + dx*co - dy*si).toFixed(3), y: +(c.y + dx*si + dy*co).toFixed(3) };
if (p.aid != null) { q.aid = p.aid; q.alx = p.alx; q.aly = p.aly; }
return q;
});
}
function flipPts(e) {
if (!e || !e.pts) return;
const c = center(e);
e.pts = e.pts.map(p => {
const q = { x: +(2*c.x - p.x).toFixed(3), y: p.y };
if (p.aid != null) { q.aid = p.aid; q.alx = p.alx; q.aly = p.aly; }
return q;
});
}
function moveEl(e, dx, dy) {
if (!dx && !dy) return;
if (e.pts) e.pts = e.pts.map(p => { const q = { x: p.x+dx, y: p.y+dy }; if (p.aid != null) { q.aid = p.aid; q.alx = p.alx; q.aly = p.aly; } return q; });
else { e.x = (e.x||0) + dx; e.y = (e.y||0) + dy; }
}
function alignSelection(mode) {
const S = RS.scene, items = S.selection.map(id => ({ e: S.get(id), b: RS.elements.bounds(S.get(id)) })).filter(x => x.e && x.b);
if (items.length < 2) return;
const minX = Math.min(...items.map(x => x.b.x)), maxX = Math.max(...items.map(x => x.b.x + x.b.w));
const minY = Math.min(...items.map(x => x.b.y)), maxY = Math.max(...items.map(x => x.b.y + x.b.h));
const cx = (minX+maxX)/2, cy = (minY+maxY)/2;
items.forEach(x => {
const b = x.b; let dx = 0, dy = 0;
if (mode === 'L') dx = minX - b.x;
else if (mode === 'R') dx = maxX - (b.x + b.w);
else if (mode === 'C') dx = cx - (b.x + b.w/2);
else if (mode === 'T') dy = minY - b.y;
else if (mode === 'B') dy = maxY - (b.y + b.h);
else if (mode === 'M') dy = cy - (b.y + b.h/2);
moveEl(x.e, round2(dx), round2(dy));
});
S.render(); S.snapshot();
}
function distributeSelection(axis) {
const S = RS.scene, items = S.selection.map(id => ({ e: S.get(id), b: RS.elements.bounds(S.get(id)) })).filter(x => x.e && x.b);
if (items.length < 3) { RS.ui.toast('Servono almeno 3 oggetti'); return; }
const key = axis === 'H' ? 'x' : 'y', sz = axis === 'H' ? 'w' : 'h';
items.sort((a, b) => (a.b[key] + a.b[sz]/2) - (b.b[key] + b.b[sz]/2));
const first = items[0].b[key] + items[0].b[sz]/2, last = items[items.length-1].b[key] + items[items.length-1].b[sz]/2;
const step = (last - first) / (items.length - 1);
items.forEach((x, i) => {
const target = first + step*i, cur = x.b[key] + x.b[sz]/2, d = round2(target - cur);
if (axis === 'H') moveEl(x.e, d, 0); else moveEl(x.e, 0, d);
});
S.render(); S.snapshot();
}
function anchorCenter(el) {
const c = center(el), p = { x: c.x, y: c.y };
if (el && el.x != null) { p.aid = el.id; p.alx = 0; p.aly = 0; }
return p;
}
const ICON_BG = `<rect x="0" y="0" width="46" height="34" rx="2" fill="#f4f1e8"/>`;
const ASFALTO = new Set(['crosswalk', 'stopline', 'mark', 'parking']);
const STATIC_ICONS = {
text: `<svg viewBox="0 0 46 34">${ICON_BG}<text x="23" y="26" font-size="26" text-anchor="middle" font-weight="700" fill="#333">T</text></svg>`,
legend: `<svg viewBox="0 0 46 34">${ICON_BG}<rect x="6" y="5" width="34" height="24" rx="1.5" fill="#fff" stroke="#888"/><rect x="6" y="5" width="34" height="6" fill="#444"/><rect x="9" y="14" width="5" height="4" fill="#2f6fed"/><rect x="9" y="21" width="5" height="4" fill="#1d8f5c"/><line x1="16" y1="16" x2="36" y2="16" stroke="#bbb"/><line x1="16" y1="23" x2="36" y2="23" stroke="#bbb"/></svg>`,
measuretable: `<svg viewBox="0 0 46 34">${ICON_BG}<rect x="6" y="5" width="34" height="24" rx="1.5" fill="#fff" stroke="#888"/><rect x="6" y="5" width="34" height="6" fill="#444"/><line x1="10" y1="16" x2="14" y2="16" stroke="#c0392b" stroke-width="1.4"/><line x1="18" y1="16" x2="36" y2="16" stroke="#bbb"/><line x1="10" y1="23" x2="14" y2="23" stroke="#c0392b" stroke-width="1.4"/><line x1="18" y1="23" x2="36" y2="23" stroke="#bbb"/></svg>`,
graphscale: `<svg viewBox="0 0 46 34">${ICON_BG}<rect x="6" y="14" width="8" height="6" fill="#222"/><rect x="14" y="14" width="8" height="6" fill="#fff" stroke="#222"/><rect x="22" y="14" width="8" height="6" fill="#222"/><rect x="30" y="14" width="8" height="6" fill="#fff" stroke="#222"/><text x="23" y="28" font-size="6" text-anchor="middle" fill="#333">m</text></svg>`,
angle: `<svg viewBox="0 0 46 34">${ICON_BG}<path d="M10 29 L10 6 M10 29 L36 29" stroke="#9a6bbf" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M10 17 A 12 12 0 0 0 22 29" stroke="#9a6bbf" stroke-width="2" fill="none"/></svg>`
};
const JARMS = {
x: [0,90,180,270], t: [0,180,90], y: [90,-55,-125],
x45: [0,180,55,235], l: [0,90], penta: [-90,-18,54,126,198],
esa: [0,60,120,180,240,300], tob: [0,180,60], imm: [0,180,150]
};
function junctionIcon(kind) {
if (kind === 'sf')
return `<svg viewBox="0 0 46 34">${ICON_BG}<rect x="4" y="14" width="38" height="6" fill="#9aa0a6"/><rect x="13" y="3" width="6" height="13" fill="#9aa0a6"/><rect x="27" y="18" width="6" height="13" fill="#9aa0a6"/></svg>`;
const arms = JARMS[kind] || JARMS.x, cx = 23, cy = 18, len = 15;
let s = '';
arms.forEach(a => {
const x2 = cx + Math.cos(a*Math.PI/180)*len, y2 = cy + Math.sin(a*Math.PI/180)*len;
s += `<line x1="${cx}" y1="${cy}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#9aa0a6" stroke-width="6" stroke-linecap="round"/>`;
});
return `<svg viewBox="0 0 46 34">${ICON_BG}${s}</svg>`;
}
function makeIcon(type, def) {
if (type !== 'vehicle' && def.icona) return `<svg viewBox="0 0 46 34">${ICON_BG}${def.icona}</svg>`;
if (type !== 'vehicle' && def.tool === 'junction') return junctionIcon(def.kind);
if (type !== 'vehicle' && STATIC_ICONS[def.tool]) return STATIC_ICONS[def.tool];
let e;
if (type === 'vehicle') e = { type:'vehicle', kind:def.kind, catId:def.id, x:0,y:0,rot:0, len:def.len, wid:def.wid, color:def.color, evidenzia:false };
else if (def.tool === 'symbol') e = { type:'symbol', sym:def.sym, x:0,y:0,rot:0, size:def.size||0.8, color:def.color, letter:def.letter, text:def.text, dir:def.dir, cod:def.cod, posa:def.posa };
else {
switch (def.tool) {
case 'road': e = def.sez
? Object.assign({ type:'road', x:0,y:0,rot:0, len: Math.max(9, def.wid * 1.6), wid: def.wid, lanes: def.lanes, color:def.color }, def.sez)
: { type:'road', x:0,y:0,rot:0, len:9, wid:6, lanes:2, color:def.color }; break;
case 'roadpath': e = { type:'roadway', pts:[{x:-4.5,y:1.6},{x:0,y:-1.8},{x:4.5,y:1.2}], width:5, color:def.color }; break;
case 'zebrapath': e = { type:'zebrapath', pts:[{x:-4.5,y:1.4},{x:0,y:-1.6},{x:4.5,y:1.0}], width:3, color:def.color }; break;
case 'ramp': e = { type:'ramp', x:0,y:0,rot:0, len:10, wid:3.4, kind:def.kind, color:def.color }; break;
case 'curve': e = def.tratti && RS.curve ? RS.curve.nuova({ x: 0, y: 0 }, def) : { type:'roadway', pts:def.pts, width:def.wid||7, color:def.color||'#9aa0a6' }; break;
case 'roundabout': e = { type:'roundabout', x:0,y:0, size:9, ring:3, color:def.color }; break;
case 'band': e = { type:'band', sub:def.sub, x:0,y:0,rot:0, len:Math.min(9, Math.max(2.6, (def.wid||1.5)*4)), wid:def.wid||1.5, color:def.color }; break;
case 'area': e = { type:'area', sub:def.sub, x:0,y:0,rot:0, w:9, h:6, color:def.color }; break;
case 'island': e = { type:'island', x:0,y:0,rot:0, w:7, h:4, shape:def.shape, color:def.color }; break;
case 'parking': e = { type:'parking', x:0,y:0,rot:0, w:9, h:4.5, angolo:def.angolo }; break;
case 'mark': e = { type:'mark', x:0,y:0,rot:0, len:8, style:def.style, color:def.color }; break;
case 'crosswalk': e = { type:'crosswalk', sub:def.sub, x:0,y:0,rot:0, len:7, wid:def.sub==='bike'?1.8:2.5, color:'#fff' }; break;
case 'stopline': e = { type:'stopline', x:0,y:0,rot:0, len:7, color:'#fff' }; break;
case 'building': e = { type:'building', x:0,y:0,rot:0, w:6, h:4, color:def.color }; break;
case 'freehand': e = { type:'sketch', width:0.35, color:def.color,
pts:[{x:-3.4,y:1.4},{x:-2.2,y:-0.6},{x:-0.6,y:1.2},{x:0.8,y:-1.3},{x:2.2,y:0.9},{x:3.4,y:-1.1}] }; break;
case 'skid': e = { type:'skid', pts:[{x:-3.5,y:1.2},{x:3.5,y:-1.2}], width:0.5, color:def.color, dashed:def.dashed, stile:def.stile }; break;
case 'path': e = { type:'path', pts:[{x:-3.5,y:1.5},{x:0,y:-1.5},{x:3.5,y:0.5}], width:0.4, color:def.color, dashed:true, arrow:true }; break;
case 'measure': e = { type:'measure', pts:[{x:-3.5,y:0},{x:3.5,y:0}], color:def.color, fs:1.4 }; break;
case 'arrow': e = { type:'arrow', pts:[{x:-3.5,y:0.6},{x:3.5,y:-0.6}], color:def.color }; break;
case 'north': e = { type:'north', x:0,y:0,rot:0, size:6 }; break;
default: e = { type:'symbol', sym:'object', x:0,y:0,rot:0,size:1,color:def.color };
}
}
const node = RS.elements.render(e);
if (!node) return '';
const b = Object.assign({}, RS.elements.bounds(e) || { x:-2,y:-2,w:4,h:4 });
if (e.type === 'road' && e.marc) { b.y -= e.marc; b.h += e.marc * 2; }
const m = Math.max(b.w, b.h) * 0.12 + 0.2;
const vx = b.x - m, vy = b.y - m, vw = b.w + 2*m, vh = b.h + 2*m;
const vb = `${vx.toFixed(2)} ${vy.toFixed(2)} ${vw.toFixed(2)} ${vh.toFixed(2)}`;
const defs = `<defs>${RS.scene.defs.innerHTML}</defs>`;
const bg = (ASFALTO.has(def.tool) || def.sym === 'freccia_terra') ? '#9aa0a6' : '#f4f1e8';
const back = `<rect x="${vx.toFixed(2)}" y="${vy.toFixed(2)}" width="${vw.toFixed(2)}" height="${vh.toFixed(2)}" rx="${(vw*0.03).toFixed(2)}" fill="${bg}"/>`;
return `<svg viewBox="${vb}">${defs}${back}${node.outerHTML}</svg>`;
}
function sw(c) { return `<span class="sw" style="background:${c||'#888'}"></span>`; }
function icona(e) { const s = RS.elements.miniaturaSvg ? RS.elements.miniaturaSvg(e, 34, 16) : ''; return s ? `<span class="leg-ico">${s}</span>` : sw(e.color); }
function catName(e) { const d = RS.catalog.veicoloById(e.catId); return d ? d.nome : 'Veicolo'; }
function verLabel(v) {
const m = /^(\d{4})(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)\d*$/.exec(v || '');
if (!m) return v || '';
const d = new Date(Date.UTC(+m[1], +m[2]-1, +m[3], +m[4], +m[5], +m[6]));
return d.toLocaleString('it-IT');
}
function nomeOggetto(e) {
if (e.type === 'vehicle') return (e.label ? e.label + ' · ' : '') + catName(e) + (e.modello ? ' — ' + e.modello : '');
if (e.type === 'symbol' && e.letter) return 'Caposaldo ' + e.letter;
if (e.type === 'foto') return 'Foto ' + (e.n || '') + (e.descr ? ' — ' + e.descr : '');
if (e.type === 'panorama') return 'Panoramica P' + (e.n || '') + (e.descr ? ' — ' + e.descr : '');
if (e.type === 'road' && e.cA != null) return 'Tratto strada · ' + (e.cA + e.cB) + ' corsie, ' + String(Math.round(e.wid * 100) / 100).replace('.', ',') + ' m';
return tipoLabel(e) + (e.label ? ' ' + e.label : '');
}
function tipoLabel(e) {
const L = { vehicle:'Veicolo', symbol: e.nome || 'Simbolo', road:'Tratto strada', raccordo:"Raccordo d'angolo", crosswalk:'Attraversamento pedonale',
stopline:'Linea di arresto', building:'Edificio / muro', skid:'Traccia', path:'Percorso veicolo',
measure:'Quota / misura', arrow:'Freccia', text:'Testo',
north:'Freccia Nord', graphscale:'Scala grafica', roundabout: e.mini ? 'Mini-rotatoria' : 'Rotatoria', incrocio: e.pl ? 'Passaggio a livello' : e.accesso ? 'Passo carrabile' : 'Incrocio', curva:'Curva', band:'Banchina / fascia',
river:'Canale / fiume', legend:'Legenda', title:'Cartiglio', foto:'Segnaposto foto', panorama:'Panoramica 360°', surveypt:'Punto di rilievo',
roadway:'Carreggiata curva', zebrapath:'Zebrata curva', area:'Superficie',
ramp: e.kind === 'out' ? 'Corsia di uscita' : 'Corsia di immissione' };
return L[e.type] || e.type;
}
function polyLen(e) { let d = 0; for (let i=1;i<e.pts.length;i++) d += Math.hypot(e.pts[i].x-e.pts[i-1].x, e.pts[i].y-e.pts[i-1].y); return d; }
function dist(a, b) { return Math.hypot(b.x-a.x, b.y-a.y); }
function round2(v) { return Math.round(v*100)/100; }
function nextSurveyN() { let m = 0; RS.scene.elements.forEach(e => { if (e.type === 'surveypt' && e.n > m) m = e.n; }); return m + 1; }
function triangulate(A, B, dA, dB, sideRight) {
const dx = B.x-A.x, dy = B.y-A.y, d = Math.hypot(dx, dy);
if (d === 0 || d > dA+dB || d < Math.abs(dA-dB)) return null;
const a = (dA*dA - dB*dB + d*d) / (2*d);
const hh = dA*dA - a*a; if (hh < 0) return null;
const h = Math.sqrt(hh);
const mx = A.x + a*dx/d, my = A.y + a*dy/d;
const ox = -dy/d*h, oy = dx/d*h, s = sideRight ? 1 : -1;
return { x: mx + s*ox, y: my + s*oy };
}
function triBase(A, B) { return [A.id, B.id].sort().join('|'); }
function triBersagli() {
const out = [];
RS.verifica.veicoliMisurati().forEach(v => {
const L = String(v.label).toUpperCase();
v.rilpts.slice().sort((a, b) => a.n - b.n).forEach(p => out.push({ k: L + p.n, label: L, n: p.n, vid: v.id }));
});
return out;
}
function gmParti(descr) {
const k = /^\s*([A-Za-z]{1,3})\s*(?:→|->)\s*([A-Za-z]{1,3})(\d*)\b(.*)$/.exec(descr || '');
if (!k || /ascissa|ordinata/i.test(descr)) return null;
const da = k[1].toUpperCase(), L = k[2].toUpperCase(), n = k[3], a = L + n, els = RS.scene.elements;
const caps = els.filter(e => e.letter).map(e => String(e.letter).toUpperCase());
if (caps.indexOf(da) < 0) return null;
const mb = RS.scene.meta.base || {}, bA = RS.scene.get(mb.aId), bB = RS.scene.get(mb.bId);
const coppiaBase = !!(bA && bB) && [String(bA.letter).toUpperCase(), String(bB.letter).toUpperCase()].sort().join() === [da, a].sort().join();
const base = /\(base\)/i.test(k[4]) || (!n && caps.indexOf(L) >= 0 && coppiaBase);
let descrizione;
if (base) descrizione = 'base: distanza fra i capisaldi ' + da + ' e ' + a;
else if (!n && caps.indexOf(L) >= 0) descrizione = 'dal caposaldo ' + da + ' al caposaldo aggiunto ' + a;
else if (L === 'P' && n && els.some(e => e.type === 'surveypt' && String(e.n) === n)) descrizione = 'dal caposaldo ' + da + ' al punto di rilievo ' + a;
else if (n && els.some(e => e.type === 'vehicle' && String(e.label || '').toUpperCase() === L)) descrizione = 'dal caposaldo ' + da + ' al punto ' + n + ' del veicolo ' + L;
else descrizione = 'dal caposaldo ' + da + ' a ' + a;
return { da, a, base, nome: da + ' → ' + a, descr: descrizione };
}
function gmMini(p) {
if (!p) return '';
const S = RS.scene, els = S.elements, NS = 'http://www.w3.org/2000/svg';
const cap = els.find(e => e.letter && String(e.letter).toUpperCase() === p.da); if (!cap) return '';
const m = /^([A-Z]{1,3})(\d*)$/.exec(p.a) || [], L = m[1], n = m[2];
let T = null, V = null;
if (n) {
V = els.find(e => e.type === 'vehicle' && String(e.label || '').toUpperCase() === L && (!e.fase || e.fase === 'quiete') && e.rilpts && e.rilpts.some(r => String(r.n) === n));
if (V) { const r = V.rilpts.find(x => String(x.n) === n), a = (V.rot || 0) * Math.PI / 180; T = { x: V.x + r.lx * Math.cos(a) - r.ly * Math.sin(a), y: V.y + r.lx * Math.sin(a) + r.ly * Math.cos(a) }; }
else { const sp = els.find(e => e.type === 'surveypt' && L === 'P' && String(e.n) === n); if (sp) T = { x: sp.x, y: sp.y }; }
} else { const c2 = els.find(e => e.letter && String(e.letter).toUpperCase() === L); if (c2) T = { x: c2.x, y: c2.y }; }
if (!T) return '';
const a = V ? (V.rot || 0) * Math.PI / 180 : 0;
const loc = V ? q => { const dx = q.x - V.x, dy = q.y - V.y; return { x: dx * Math.cos(a) + dy * Math.sin(a), y: -dx * Math.sin(a) + dy * Math.cos(a) }; } : q => ({ x: q.x, y: q.y });
const C = loc(cap), Tl = V ? (r => ({ x: r.lx, y: r.ly }))(V.rilpts.find(x => String(x.n) === n)) : loc(T);
let x0, x1, y0, y1;
if (V) {
const W = Math.max(V.len * 1.7, 7.5), H = W / 2.4;
x0 = -W / 2; x1 = W / 2; y0 = -H / 2; y1 = H / 2;
} else {
x0 = Math.min(C.x, Tl.x); x1 = Math.max(C.x, Tl.x); y0 = Math.min(C.y, Tl.y); y1 = Math.max(C.y, Tl.y);
const lato = Math.max(x1 - x0, y1 - y0, 4), pad = lato * 0.16; x0 -= pad; y0 -= pad; x1 += pad; y1 += pad;
const cxm = (x0 + x1) / 2, cym = (y0 + y1) / 2, W = Math.max(x1 - x0, (y1 - y0) * 2.4), H = Math.max(y1 - y0, W / 2.4);
x0 = cxm - W / 2; x1 = cxm + W / 2; y0 = cym - H / 2; y1 = cym + H / 2;
}
const dentro = q => q.x > x0 && q.x < x1 && q.y > y0 && q.y < y1;
const fs = Math.max(x1 - x0, y1 - y0) / 13, f = v => +v.toFixed(2);
const svg = document.createElementNS(NS, 'svg');
svg.setAttribute('viewBox', `${f(x0)} ${f(y0)} ${f(x1 - x0)} ${f(y1 - y0)}`); svg.setAttribute('class', 'gm-mini-svg');
if (V && RS.elements.render) { try { const g = RS.elements.render(Object.assign({}, V, { x: 0, y: 0, rot: 0, spigoli: false })); if (g) svg.appendChild(g); } catch (e) {} }
const mk = (tag, at) => { const e = document.createElementNS(NS, tag); Object.keys(at).forEach(k => e.setAttribute(k, at[k])); svg.appendChild(e); return e; };
const testo = (x, y, t, col, size) => { const e = mk('text', { x: f(x), y: f(y), 'font-size': f(size), 'font-weight': 700, fill: col, 'text-anchor': 'middle', dy: '0.35em', 'paint-order': 'stroke', stroke: '#fff', 'stroke-width': f(size * 0.18) }); e.textContent = t; };
mk('line', { x1: f(C.x), y1: f(C.y), x2: f(Tl.x), y2: f(Tl.y), stroke: '#1d4f91', 'stroke-width': f(fs * 0.12), 'stroke-dasharray': f(fs * 0.5) + ' ' + f(fs * 0.3) });
if (V) V.rilpts.forEach(r => {
if (String(r.n) === n) return;
mk('circle', { cx: f(r.lx), cy: f(r.ly), r: f(fs * 0.22), fill: '#fff', stroke: '#555', 'stroke-width': f(fs * 0.06) }); testo(r.lx, r.ly - fs * 0.62, String(r.n), '#444', fs * 0.72);
});
if (dentro(C)) {
mk('path', { d: `M${f(C.x)} ${f(C.y - fs * 0.5)} L${f(C.x + fs * 0.5)} ${f(C.y)} L${f(C.x)} ${f(C.y + fs * 0.5)} L${f(C.x - fs * 0.5)} ${f(C.y)} Z`, fill: '#fff', stroke: '#b00', 'stroke-width': f(fs * 0.12) });
testo(C.x, C.y - fs * 1.15, p.da, '#b00', fs * 1.05);
}
mk('circle', { cx: f(Tl.x), cy: f(Tl.y), r: f(fs * 0.42), fill: '#e01b24', stroke: '#fff', 'stroke-width': f(fs * 0.1) });
testo(Tl.x, Tl.y - fs * 1.05, p.a, '#e01b24', fs * 1.15);
let tit = '';
if (V) {
const sc = (RS.coinvolti && RS.coinvolti.datiVeicolo && RS.coinvolti.datiVeicolo(L)) || {};
const marca = String(V.modello || sc.marca || '').trim(), targa = String(V.targa || sc.targa || '').trim().toUpperCase();
tit = `<div class="gm-mini-tit"><b>Veicolo ${escAttr(L)}</b>${marca ? ' · ' + escAttr(marca) : ''}${targa ? ' · <span class="gm-targa">' + escAttr(targa) + '</span>' : ''}${!marca && !targa ? ' <i>(marca e targa non ancora scritte)</i>' : ''}</div>`;
}
let verso = '';
if (!dentro(C)) {
const g = Math.atan2(C.y - Tl.y, C.x - Tl.x) * 180 / Math.PI, fr = ['→', '↘', '↓', '↙', '←', '↖', '↑', '↗'][((Math.round(g / 45) % 8) + 8) % 8];
verso = `<div class="gm-verso">${fr} il caposaldo <b>${escAttr(p.da)}</b> è da questa parte${V ? ' del veicolo' : ''}</div>`;
}
return tit + svg.outerHTML + verso;
}
function gmControllo(p) {
if (!p || p.base || !RS.verifica) return null;
const problemi = RS.verifica.controllaMisure().esiti.filter(x => x.punto === p.a && x.livello !== 'info');
if (problemi.length) return { ok: false, testo: problemi[0].testo };
const n = (RS.scene.misure || []).filter(m => m.val !== '' && m.val != null && (gmParti(m.descr) || {}).a === p.a && !(gmParti(m.descr) || {}).base).length;
if (n >= 3) return { ok: true, testo: p.a + ': le ' + n + ' distanze tornano fra loro' };
if (n === 2) return { ok: true, testo: p.a + ': due distanze, il punto è determinato (con una terza si può verificare)' };
return null;
}
function triMisurato(L, k) {
const t = String(L).toUpperCase() + '→' + k;
const prima = s => String(s || '').trim().split(/\s/)[0].toUpperCase();
return RS.scene.elements.some(e => e.type === 'measure' && prima(e.note) === t) ||
(RS.scene.misure || []).some(m => prima(m.descr) === t && m.val !== '' && m.val != null);
}
function rinominaRiferimenti(tipo, da, a) {
da = String(da || '').trim().toUpperCase(); a = String(a || '').trim().toUpperCase();
if (!da || !a || da === a) return 0;
const cambia = tok => {
const T = tok.toUpperCase();
if (tipo === 'cap') return T === da ? a : tok;
const m = /^([A-Za-z]{1,3})(\d+)$/.exec(tok);
return m && m[1].toUpperCase() === da ? a + m[2] : tok;
};
const sistema = s => {
s = String(s || '');
let k = /^(\s*)([A-Za-z]{1,3}\d*)(\s*(?:→|->)\s*)([A-Za-z]{1,3}\d*)(.*)$/.exec(s);
if (k) return k[1] + cambia(k[2]) + k[3] + cambia(k[4]) + k[5];
k = /^(\s*)([A-Za-z]{1,3}\d*)(\s*\(ordinata\).*)$/i.exec(s);
return k ? k[1] + cambia(k[2]) + k[3] : s;
};
let n = 0;
RS.scene.elements.forEach(e => { if (e.type === 'measure' && e.note) { const t = sistema(e.note); if (t !== e.note) { e.note = t; n++; } } });
(RS.scene.misure || []).forEach(m => { const t = sistema(m.descr); if (t !== m.descr) { m.descr = t; n++; } });
return n;
}
function rigaBase(A, B) {
const k = [String(A.letter).toUpperCase(), String(B.letter).toUpperCase()];
return (RS.scene.misure || []).find(m => {
const r = /^\s*([A-Za-z]{1,3})\s*(?:→|->)\s*([A-Za-z]{1,3})\s*\(base\)/i.exec(m.descr || '');
return r && ((r[1].toUpperCase() === k[0] && r[2].toUpperCase() === k[1]) || (r[1].toUpperCase() === k[1] && r[2].toUpperCase() === k[0]));
}) || null;
}
function impostaBase(A, B, v) {
const S = RS.scene;
S.misure = S.misure || [];
const riga = rigaBase(A, B);
if (riga) riga.val = round2(v); else S.misure.push({ descr: A.letter + '→' + B.letter + ' (base)', val: round2(v) });
const mb = S.meta.base || (S.meta.base = {});
if (!S.get(mb.aId) || !S.get(mb.bId) || mb.aId === mb.bId) { mb.aId = A.id; mb.bId = B.id; }
let L = Math.hypot(B.x - A.x, B.y - A.y), spostato = null, bloccato = false;
if (Math.abs(v - L) > 0.02) {
const [fermo, mobile] = !capDipende(B, A) ? [A, B] : !capDipende(A, B) ? [B, A] : [null, null];
if (mobile) {
let ux = mobile.x - fermo.x, uy = mobile.y - fermo.y;
if (L < 0.001) { ux = 1; uy = 0; L = 1; }
mobile.x = round2(fermo.x + ux / L * v); mobile.y = round2(fermo.y + uy / L * v);
spostato = mobile.letter;
} else bloccato = true;
}
return { spostato, bloccato };
}
function baseMisurata(A, B) { const r = rigaBase(A, B); return r && r.val !== '' && r.val != null && Number(r.val) > 0 ? Number(r.val) : 0; }
function capDipende(X, Y) {
const L = String(X.letter).toUpperCase(), Ly = String(Y.letter).toUpperCase();
const coinvolge = s => {
const r = /^\s*([A-Za-z]{1,3}\d*)\s*(?:→|->)\s*([A-Za-z]{1,3}\d*)/.exec(s || ''); if (!r) return false;
const a = r[1].toUpperCase(), b = r[2].toUpperCase();
return (a === L || b === L) && !((a === L && b === Ly) || (a === Ly && b === L));
};
return RS.scene.elements.some(e => e.type === 'measure' && coinvolge(e.note)) ||
(RS.scene.misure || []).some(m => m.val !== '' && m.val != null && coinvolge(m.descr));
}
function prossimaLettera() {
const usate = RS.scene.elements.filter(e => e.letter).map(e => String(e.letter).toUpperCase());
for (let i = 0; i < 26; i++) { const L = String.fromCharCode(65 + i); if (!usate.includes(L)) return L; }
return 'Z';
}
function triLato(A, B, P) {
const [X, Y] = String(A.id) < String(B.id) ? [A, B] : [B, A];
return ((Y.x - X.x) * (P.y - X.y) - (Y.y - X.y) * (P.x - X.x)) > 0 ? 1 : -1;
}
function sullaStrada(p) {
return RS.scene.elements.some(e => {
if ((e.type === 'road' || e.type === 'ramp') && e.len && e.wid) {
const r = -(e.rot || 0) * Math.PI / 180, dx = p.x - e.x, dy = p.y - e.y;
const lx = dx * Math.cos(r) - dy * Math.sin(r), ly = dx * Math.sin(r) + dy * Math.cos(r);
return Math.abs(lx) <= e.len / 2 && Math.abs(ly) <= e.wid / 2;
}
if (e.type === 'roadway' && e.pts && e.pts.length > 1) {
const mezza = (e.width || 7) / 2;
for (let i = 1; i < e.pts.length; i++) {
const a = e.pts[i - 1], b = e.pts[i], vx = b.x - a.x, vy = b.y - a.y, l2 = vx * vx + vy * vy || 1;
const t = Math.max(0, Math.min(1, ((p.x - a.x) * vx + (p.y - a.y) * vy) / l2));
if (Math.hypot(p.x - (a.x + t * vx), p.y - (a.y + t * vy)) <= mezza) return true;
}
return false;
}
if (e.type === 'roundabout') return Math.hypot(p.x - e.x, p.y - e.y) <= (e.size || 20) / 2;
return false;
});
}
function triProposto(A, B, punti, lati) {
const k = triBase(A, B);
if (lati[k]) { const i = punti.findIndex(p => triLato(A, B, p) === lati[k]); if (i >= 0) return { i, motivo: 'stesso lato dell\'ultima volta' }; }
const strada = punti.map(sullaStrada);
if (strada[0] !== strada[1]) return { i: strada[0] ? 0 : 1, motivo: 'cade sulla strada' };
const rilevati = RS.scene.elements.filter(e => !e.letter && (e.type === 'vehicle' || e.type === 'skid' || e.type === 'path' ||
(e.type === 'symbol' && e.sym !== 'caposaldo') || e.type === 'surveypt'));
if (rilevati.length) {
const centri = rilevati.map(e => { const b = RS.elements.bounds(e); return b ? { x: b.x + b.w / 2, y: b.y + b.h / 2 } : { x: e.x || 0, y: e.y || 0 }; });
const d = punti.map(p => Math.min.apply(null, centri.map(c => Math.hypot(c.x - p.x, c.y - p.y))));
if (Math.abs(d[0] - d[1]) > 0.5) return { i: d[0] < d[1] ? 0 : 1, motivo: 'più vicino al disegno' };
}
return { i: 0, motivo: '' };
}
function round(v, d) { d = d==null?2:d; const f = Math.pow(10,d); return Math.round((v||0)*f)/f; }
function quandoBreve(t) {
const d = new Date(t), oggi = new Date(), ieri = new Date(Date.now() - 864e5);
const ora = ' alle ' + d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
if (d.toDateString() === oggi.toDateString()) return 'oggi' + ora;
if (d.toDateString() === ieri.toDateString()) return 'ieri' + ora;
return d.toLocaleDateString('it-IT') + ora;
}
function escAttr(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function toHex(c) {
if (/^#([0-9a-f]{6})$/i.test(c)) return c;
if (/^#([0-9a-f]{3})$/i.test(c)) return '#' + c.slice(1).split('').map(x=>x+x).join('');
const m = c && c.match && c.match(/\d+/g); if (m && m.length>=3) return '#' + m.slice(0,3).map(x=>(+x).toString(16).padStart(2,'0')).join('');
return '#333333';
}
ui.nomeOggetto = nomeOggetto;
RS.ui = ui;
})(window.RS = window.RS || {});

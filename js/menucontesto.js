(function (RS) {
'use strict';
const el = id => document.getElementById(id);
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const mc = {
_box: null, _toccoUltimo: false,
init() {
const svg = RS.scene.svg;
svg.addEventListener('pointerdown', e => { this._toccoUltimo = e.pointerType === 'touch' || e.pointerType === 'pen'; }, true);
svg.addEventListener('contextmenu', e => {
e.preventDefault();
if (this._toccoUltimo || (RS.ui.isMobile && RS.ui.isMobile())) return;
this.apri(e);
});
document.addEventListener('pointerdown', e => { if (this._box && !this._box.contains(e.target)) this.chiudi(); }, true);
window.addEventListener('keydown', e => { if (e.key === 'Escape' && this._box) { this.chiudi(); e.stopPropagation(); } }, true);
window.addEventListener('resize', () => this.chiudi());
RS.scene.on('view', () => this.chiudi());
try { const r = JSON.parse(localStorage.getItem('rilsin:recenti') || '[]'); if (Array.isArray(r)) RS.ui._recenti = r.slice(0, 5); } catch (e) {}
},
chiudi() { if (this._box) { this._box.remove(); this._box = null; } },
apri(ev) {
this.chiudi();
const S = RS.scene, T = RS.tools, w = T.worldFromEvent(ev);
const node = ev.target.closest && ev.target.closest('.el');
const cel0 = node && node.dataset.id ? S.get(node.dataset.id) : null;
const cel = cel0 && RS.incroci ? RS.incroci.regista(cel0) : cel0;
let voci;
if (T._poly) voci = this.vociDisegno(w);
else if (T.active.mode !== 'select') voci = this.vociStrumento();
else if (cel && !(cel.locked && cel.type === 'image')) {
const ids = cel.gid ? S.elements.filter(x => x.gid === cel.gid).map(x => x.id) : [cel.id];
if (!ids.every(id => S.isSelected(id))) S.select(ids);
voci = S.selection.length > 1 ? this.vociGruppo() : this.vociOggetto(S.get(S.selection[0]), w);
} else voci = this.vociVuoto(w, cel);
this.mostra(voci, ev.clientX, ev.clientY);
},
mostra(voci, x, y) {
const box = document.createElement('div');
box.className = 'cm'; box.setAttribute('role', 'menu');
voci.forEach(v => {
if (!v) return;
if (v.sep) { box.appendChild(Object.assign(document.createElement('div'), { className: 'cm-sep' })); return; }
if (v.sez) { const d = document.createElement('div'); d.className = 'cm-sez'; d.textContent = v.sez; box.appendChild(d); return; }
if (v.riga) {
const r = document.createElement('div'); r.className = 'cm-riga';
const l = document.createElement('span'); l.className = 'cm-ic'; l.textContent = v.ic || ''; r.appendChild(l);
const t = document.createElement('span'); t.className = 'cm-rt'; t.textContent = v.t; r.appendChild(t);
v.riga.forEach(b => {
const bt = document.createElement('button'); bt.type = 'button'; bt.className = 'cm-mini'; bt.textContent = b.t;
if (b.tip) bt.title = b.tip;
bt.onclick = () => { this.chiudi(); b.fn(); };
r.appendChild(bt);
});
box.appendChild(r); return;
}
const b = document.createElement('button');
b.type = 'button'; b.className = 'cm-voce' + (v.danger ? ' danger' : ''); b.setAttribute('role', 'menuitem');
b.innerHTML = `<span class="cm-ic">${esc(v.ic || '')}</span><span class="cm-t">${esc(v.t)}</span>${v.k ? `<span class="cm-k">${esc(v.k)}</span>` : ''}`;
b.onclick = () => { this.chiudi(); v.fn(); };
box.appendChild(b);
});
document.body.appendChild(box);
const r = box.getBoundingClientRect();
box.style.left = Math.max(6, Math.min(x, innerWidth - r.width - 6)) + 'px';
box.style.top = Math.max(6, Math.min(y, innerHeight - r.height - 6)) + 'px';
this._box = box;
const primo = box.querySelector('button'); if (primo) primo.focus({ preventScroll: true });
},
premi(sel) {
RS.ui.renderProps();
const b = el('propsBody').querySelector(sel);
if (b) b.click(); else RS.ui.toast('Comando non disponibile per questo oggetto');
},
campo(k) {
RS.ui.renderProps();
const p = el('props'); p.classList.remove('lampo'); void p.offsetWidth; p.classList.add('lampo');
const f = el('propsBody').querySelector('[data-k="' + k + '"]');
if (f) { f.scrollIntoView({ block: 'center' }); f.focus(); }
},
selezionati() { return RS.scene.selection.map(id => RS.scene.get(id)).filter(Boolean); },
ruota(deg) {
const sel = this.selezionati().filter(e => !e.locked); if (!sel.length) return;
RS.ui.ruotaElementi(sel, deg); RS.scene.render(); RS.scene.snapshot(); RS.ui.renderProps();
},
copia(taglia) {
const S = RS.scene, sel = this.selezionati(); if (!sel.length) return;
RS.tools._clip = sel.map(e => JSON.parse(JSON.stringify(e)));
if (taglia) S.remove(sel.map(e => e.id));
RS.ui.toast((taglia ? 'Tagliati ' : 'Copiati ') + sel.length + (sel.length === 1 ? ' oggetto' : ' oggetti'));
},
incolla(w) {
const S = RS.scene, clip = RS.tools._clip; if (!clip || !clip.length) return;
let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
clip.forEach(o => { const b = RS.elements.bounds(o); if (b) { x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.w); y1 = Math.max(y1, b.y + b.h); } });
const p = S.snap(w), dx = x0 > x1 ? 1 : p.x - (x0 + x1) / 2, dy = x0 > x1 ? 1 : p.y - (y0 + y1) / 2;
const nuovi = clip.map(o => {
const c = JSON.parse(JSON.stringify(o)); delete c.id; delete c.gid;
if (c.pts) c.pts = c.pts.map(q => { const n = { x: +(q.x + dx).toFixed(3), y: +(q.y + dy).toFixed(3) }; if (q.aid != null) { n.aid = q.aid; n.alx = q.alx; n.aly = q.aly; } return n; });
else { c.x = +((c.x || 0) + dx).toFixed(3); c.y = +((c.y || 0) + dy).toFixed(3); }
if (c.type === 'vehicle') c.label = '';
return S.add(c, false).id;
});
S.snapshot(); S.select(nuovi);
RS.ui.toast('Incollati ' + nuovi.length + (nuovi.length === 1 ? ' oggetto' : ' oggetti'));
},
inserisci(cat, def, w) {
const T = RS.tools;
RS.ui.pickPalette(cat, def, null);
const m = T.active.mode;
if (m === 'place') T.placeAt(w);
else if (m === 'placeTool') T.placeToolAt(w);
else if (m === 'text') T.placeText(w);
else if (m === 'poly') { T.polyClick(w); RS.ui.toast(def.nome + ': il primo punto è qui, clicca i successivi · doppio clic o Invio per finire'); }
else if (m === 'drag' || m === 'drag2') { T.dueClic(T.snapPoint(w)); RS.ui.toast(def.nome + ': parte da qui, clicca il punto d\'arrivo'); }
},
voceCatalogo(catId, defId) {
const cat = (RS.catalog.PALETTE || []).find(c => c.id === catId);
const def = cat && cat.items.find(d => d.id === defId);
return def ? { cat, def } : null;
},
quotaDa(a) {
const def = RS.catalog.TRACCE.find(x => x.id === 'misura'); if (!def) return;
RS.tools.setTool({ mode: 'drag2', tool: 'measure', def });
RS.tools.dueClic(a);
RS.ui.toast('Quota: clicca il secondo punto (Esc per annullare)', 3500);
},
vociVuoto(w, sfondo) {
const S = RS.scene, T = RS.tools, ui = RS.ui, p = S.snap(w);
const v = [{ sez: 'Inserisci qui' }];
const cap = this.voceCatalogo('annota', 'caposaldo') || (() => { const d = RS.catalog.byId('caposaldo'); const c = (RS.catalog.PALETTE || []).find(k => k.items.indexOf(d) >= 0); return d && c ? { cat: c, def: d } : null; })();
if (cap) v.push({ ic: '◆', t: 'Caposaldo', fn: () => this.inserisci(cap.cat, cap.def, w) });
v.push({ ic: '⊕', t: 'Punto di rilievo P', fn: () => {
let n = 0; S.elements.forEach(e => { if (e.type === 'surveypt' && e.n > n) n = e.n; });
const a = S.add({ type: 'surveypt', x: p.x, y: p.y, n: n + 1, descr: '', size: 0.7 });
S.select(a.id); ui.toast('Punto P' + (n + 1) + ' inserito: le misure si prendono in Dati e misure, Rilievo dei punti');
} });
v.push({ ic: '📷', t: 'Segnaposto foto', fn: () => { T.setTool({ mode: 'placeTool', tool: 'foto', def: {} }); T.placeToolAt(w); } });
v.push({ ic: 'T', t: 'Testo', fn: () => { const d = RS.catalog.byId('testo') || {}; T.setTool({ mode: 'text', def: d }); T.placeText(w); } });
const recenti = (ui._recenti || []).map(r => this.voceCatalogo(r.cat, r.def)).filter(Boolean)
.filter(r => r.def.id !== 'caposaldo' && r.def.id !== 'testo').slice(0, 4);
if (recenti.length) {
v.push({ sez: 'Ultimi usati' });
recenti.forEach(r => v.push({ ic: '↺', t: r.def.nome, fn: () => this.inserisci(r.cat, r.def, w) }));
}
v.push({ sep: true });
if (T._clip && T._clip.length) v.push({ ic: '📋', t: 'Incolla qui', k: 'Ctrl+V', fn: () => this.incolla(w) });
v.push({ ic: '📏', t: 'Quota da qui', fn: () => this.quotaDa(T.snapPoint(w)) });
v.push({ ic: '📐', t: 'Righello', fn: () => ui.startRuler() });
v.push({ ic: '△', t: 'Triangola', fn: () => ui.startTriangulate() });
v.push({ sep: true });
v.push({ ic: '▣', t: 'Seleziona tutto', k: 'Ctrl+A', fn: () => S.select(S.elements.filter(x => !(x.locked && x.type === 'image') && !x.inc).map(x => x.id)) });
v.push({ ic: '⤢', t: 'Adatta al disegno', fn: () => ui.action('fit') });
v.push({ ic: '▦', t: 'Vista', riga: [
{ t: S.grid.show ? 'Griglia ✓' : 'Griglia', fn: () => ui.action('griglia', document.querySelector('.topbar [data-act="griglia"]')) },
{ t: S.grid.snap ? 'Aggancio ✓' : 'Aggancio', fn: () => ui.action('snap', document.querySelector('.topbar [data-act="snap"]')) }
] });
if (sfondo) v.push({ sep: true }, { ic: '🔓', t: 'Sblocca lo sfondo', fn: () => { sfondo.locked = false; S.render(); S.snapshot(); S.select(sfondo.id); } });
return v;
},
vociOggetto(e, w) {
const S = RS.scene, ui = RS.ui, v = [{ sez: ui.nomeOggetto(e) }];
const fisso = ['legend', 'measuretable', 'graphscale', 'raccordo'].indexOf(e.type) >= 0;
v.push({ ic: '⧉', t: 'Duplica', k: 'Ctrl+D', fn: () => this.premi('[data-b="dup"]') });
v.push({ ic: '⎘', t: 'Copia', riga: [{ t: 'Copia', fn: () => this.copia(false) }, { t: 'Taglia', fn: () => this.copia(true) }] });
if (!fisso && !e.locked) {
v.push({ ic: '⟳', t: 'Ruota', riga: [{ t: '90°', fn: () => this.ruota(90) }, { t: '15°', fn: () => this.ruota(15) }, { t: '−15°', fn: () => this.ruota(-15) }] });
v.push({ ic: '⇋', t: 'Specchia', fn: () => ui.azioneRapida('specchia') });
}
v.push({ ic: '⬍', t: 'Livello', riga: [{ t: 'Avanti', fn: () => S.moveZ(e.id, 1) }, { t: 'Indietro', fn: () => S.moveZ(e.id, -1) }] });
v.push({ ic: e.locked ? '🔓' : '🔒', t: e.locked ? 'Sblocca' : 'Blocca', fn: () => this.premi('[data-b="lock"]') });
const propri = [];
if (e.type === 'vehicle') {
if (!e.rilpts) propri.push({ ic: '🎯', t: 'Numera i punti di rilievo', fn: () => this.premi('[data-b="points"]') });
propri.push({ ic: '➜', t: 'Aggiungi una posizione (dinamica)', fn: () => this.premi('[data-b="fase-add"]') });
}
if (e.type === 'road') propri.push({ ic: '⌒', t: 'Raccorda gli incroci', fn: () => RS.raccordi.comando() });
if (e.type === 'road' || e.type === 'roadway' || e.type === 'curva') propri.push({ ic: '🏷', t: 'Nome della via…', fn: () => this.campo('nomeVia') });
if (e.type === 'incrocio' || (e.type === 'roundabout' && e.bracci)) propri.push({ ic: '＋', t: 'Aggiungi un braccio', fn: () => this.premi('[data-iact="add"]') });
if (e.type === 'incrocio') propri.push({ ic: '✂', t: 'Sciogli in strade', fn: () => this.premi('[data-iact="sciogli"]') });
if (e.letter) propri.push({ ic: '△', t: 'Triangola da questo caposaldo', fn: () => { ui.startTriangulate(); if (RS.tools.active.mode === 'triangulate') ui.triCanvasClick(e, null); } });
if (e.type === 'image') propri.push({ ic: '📐', t: 'Calibra la scala', fn: () => RS.tools.startCalibrate(e.id) });
if (e.x != null && !fisso) propri.push({ ic: '📏', t: 'Quota da questo oggetto', fn: () => {
const b = RS.elements.bounds(e), c = b ? { x: b.x + b.w / 2, y: b.y + b.h / 2 } : { x: e.x, y: e.y };
this.quotaDa({ x: c.x, y: c.y, anchor: { id: e.id, lx: 0, ly: 0 } });
} });
if (propri.length) v.push({ sep: true }, ...propri);
v.push({ sep: true });
v.push({ ic: '⚙', t: 'Proprietà', fn: () => ui.azioneRapida('altro') });
v.push({ ic: '🗑', t: 'Elimina', k: 'Canc', danger: true, fn: () => S.remove([e.id]) });
return v;
},
vociGruppo() {
const S = RS.scene, n = S.selection.length, inGruppo = this.selezionati().some(e => e.gid);
const v = [{ sez: n + ' oggetti selezionati' }];
v.push({ ic: '⧉', t: 'Duplica', k: 'Ctrl+D', fn: () => this.premi('[data-b="dup"]') });
v.push({ ic: '⎘', t: 'Copia', riga: [{ t: 'Copia', fn: () => this.copia(false) }, { t: 'Taglia', fn: () => this.copia(true) }] });
v.push({ ic: '⟳', t: 'Ruota insieme', riga: [{ t: '90°', fn: () => this.ruota(90) }, { t: '15°', fn: () => this.ruota(15) }, { t: '−15°', fn: () => this.ruota(-15) }] });
v.push({ ic: '⇤', t: 'Allinea', riga: [
{ t: '⇤', tip: 'a sinistra', fn: () => this.premi('[data-b="al-L"]') }, { t: '↔', tip: 'al centro (orizzontale)', fn: () => this.premi('[data-b="al-C"]') },
{ t: '⇥', tip: 'a destra', fn: () => this.premi('[data-b="al-R"]') }, { t: '⤒', tip: 'in alto', fn: () => this.premi('[data-b="al-T"]') },
{ t: '↕', tip: 'al centro (verticale)', fn: () => this.premi('[data-b="al-M"]') }, { t: '⤓', tip: 'in basso', fn: () => this.premi('[data-b="al-B"]') }] });
v.push(inGruppo ? { ic: '▢', t: 'Separa il gruppo', fn: () => this.premi('[data-b="ungroup"]') }
: { ic: '▣', t: 'Raggruppa', fn: () => this.premi('[data-b="group"]') });
if (n === 2) v.push({ ic: '📏', t: 'Quota fra i due', fn: () => this.premi('[data-b="quota"]') });
v.push({ sep: true });
v.push({ ic: '🗑', t: 'Elimina tutti', k: 'Canc', danger: true, fn: () => S.remove(S.selection.slice()) });
return v;
},
vociDisegno(w) {
const T = RS.tools, n = T._poly ? T._poly.pts.length : 0;
return [
n >= 2 ? { ic: '✓', t: 'Fine tracciato', k: 'Invio', fn: () => T.commitPoly() } : null,
{ ic: '↶', t: 'Togli l\'ultimo punto', fn: () => T.togliUltimoPunto(w) },
{ sep: true },
{ ic: '✕', t: 'Annulla e torna a Seleziona', k: 'Esc', fn: () => { T.cancelPoly(); T.toSelect(); } }
];
},
vociStrumento() {
return [{ ic: '✓', t: 'Fine: torna a Seleziona', k: 'Esc', fn: () => RS.tools.fine() }];
}
};
RS.menuContesto = mc;
})(window.RS = window.RS || {});

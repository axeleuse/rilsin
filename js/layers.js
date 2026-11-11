(function (RS) {
'use strict';
const el = (id) => document.getElementById(id);
const SEGNI = new Set(['cartello', 'semaforo', 'stop', 'precedenza', 'divieto', 'limite',
'passlivello', 'disabile', 'freccia_terra', 'lavori']);
const ARREDO = new Set(['caposaldo', 'palo', 'albero', 'cono', 'delineatore', 'idrante',
'tombino', 'fermata', 'distributore', 'chilometrica', 'sos', 'telecamera']);
const DEFS = [
{ key: 'sfondo', nome: 'Sfondo (ortofoto)' },
{ key: 'strade', nome: 'Strade e superfici' },
{ key: 'segnaletica', nome: 'Segnaletica' },
{ key: 'veicoli', nome: 'Veicoli' },
{ key: 'sinistro', nome: 'Tracce e sinistro' },
{ key: 'arredo', nome: 'Arredo e capisaldi' },
{ key: 'quote', nome: 'Quote e misure' },
{ key: 'foto', nome: 'Foto' },
{ key: 'note', nome: 'Note e annotazioni' }
];
function layerOf(e) {
const t = e.type;
if (t === 'image') return 'sfondo';
if (t === 'vehicle') return 'veicoli';
if (t === 'measure' || t === 'angle') return 'quote';
if (t === 'foto') return 'foto';
if (t === 'skid' || t === 'path') return 'sinistro';
if (t === 'crosswalk' || t === 'stopline' || t === 'mark') return 'segnaletica';
if (t === 'road' || t === 'roadway' || t === 'curva' || t === 'nucleo' || t === 'roundabout' || t === 'band' || t === 'raccordo' || t === 'svasatura' || t === 'incrocio' ||
t === 'area' || t === 'island' || t === 'parking' || t === 'building') return 'strade';
if (t === 'surveypt') return 'arredo';
if (t === 'symbol') {
if (SEGNI.has(e.sym)) return 'segnaletica';
if (ARREDO.has(e.sym)) return 'arredo';
return 'sinistro';
}
return 'note';
}
const layers = {
DEFS, layerOf,
init() {
this.panel = el('layersPanel');
document.addEventListener('mousedown', (ev) => {
if (!this.panel || this.panel.hidden) return;
if (ev.target.closest('#layersPanel') || ev.target.closest('[data-act="livelli"]')) return;
this.close();
});
RS.scene.on('change', () => { if (this.panel && !this.panel.hidden) this.render(); });
},
state() {
const S = RS.scene;
if (!S.layers) S.layers = {};
DEFS.forEach(d => { if (S.layers[d.key] == null) S.layers[d.key] = true; });
return S.layers;
},
visible(e) { return this.state()[layerOf(e)] !== false; },
counts() {
const c = {};
DEFS.forEach(d => c[d.key] = 0);
(RS.scene.elements || []).forEach(e => { const k = layerOf(e); c[k] = (c[k] || 0) + 1; });
return c;
},
toggle(btn) { if (!this.panel) return; this.panel.hidden ? this.open(btn) : this.close(); },
open(btn) {
this.render();
this.panel.hidden = false;
if (btn) {
const r = btn.getBoundingClientRect();
this.panel.style.left = Math.max(8, Math.min(r.left, window.innerWidth - 250)) + 'px';
this.panel.style.top = (r.bottom + 6) + 'px';
}
if (btn) btn.classList.add('on');
},
close() {
if (!this.panel) return;
this.panel.hidden = true;
const b = document.querySelector('[data-act="livelli"]');
if (b) b.classList.remove('on');
},
set(key, on) {
this.state()[key] = !!on;
if (!on) {
const S = RS.scene;
const keep = S.selection.filter(id => { const e = S.get(id); return e && this.visible(e); });
if (keep.length !== S.selection.length) S.select(keep);
}
RS.scene.render();
this.render();
},
allOn() { DEFS.forEach(d => this.state()[d.key] = true); RS.scene.render(); this.render(); },
render() {
if (!this.panel) return;
const st = this.state(), c = this.counts();
const rows = DEFS.map(d =>
`<label class="lay-row${st[d.key] === false ? ' off' : ''}">
           <input type="checkbox" data-lay="${d.key}"${st[d.key] === false ? '' : ' checked'}>
           <span class="lay-nome">${d.nome}</span>
           <span class="lay-n">${c[d.key] || 0}</span>
         </label>`).join('');
this.panel.innerHTML =
`<div class="lay-head">Livelli <button class="lay-all" data-lay-all>Mostra tutti</button></div>
         ${rows}
         <div class="lay-hint">I livelli nascosti non compaiono in stampa né nelle esportazioni.</div>`;
this.panel.querySelectorAll('[data-lay]').forEach(inp =>
inp.onchange = () => this.set(inp.dataset.lay, inp.checked));
const all = this.panel.querySelector('[data-lay-all]');
if (all) all.onclick = () => this.allOn();
}
};
RS.layers = layers;
})(window.RS = window.RS || {});

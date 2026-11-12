(function (RS) {
'use strict';
const N = RS.svgNode;
const tools = {
active: { mode: 'select' },
_op: null,
_poly: null,
_space: false,
_shift: false,
init() {
const s = RS.scene, svg = s.svg;
svg.addEventListener('pointerdown', e => this.onDown(e));
svg.addEventListener('pointermove', e => this.onMove(e));
window.addEventListener('pointerup', e => this.onUp(e));
window.addEventListener('pointercancel', e => this.onAnnullato(e));
svg.addEventListener('dblclick', e => this.onDbl(e));
svg.addEventListener('wheel', e => this.onWheel(e), { passive: false });
svg.addEventListener('contextmenu', e => e.preventDefault());
window.addEventListener('keydown', e => this.onKey(e));
window.addEventListener('keyup', e => { if (e.code === 'Space') this._space = false; this._shift = e.shiftKey; });
s.on('view', () => this.drawSelection());
},
setTool(spec) {
this.cancelPoly();
if (this._dueClic) { this._dueClic = null; RS.scene.gOverlay.querySelectorAll('.preview').forEach(n => n.remove()); }
this.active = spec || { mode: 'select' };
const svg = RS.scene.svg;
svg.classList.remove('tool-place', 'tool-draw', 'tool-pan');
if (spec) {
if (spec.mode === 'place' || spec.mode === 'text') svg.classList.add('tool-place');
else if (spec.mode !== 'select') svg.classList.add('tool-draw');
}
RS.scene.emit('tool', this.active);
},
toSelect() { this.setTool({ mode: 'select' }); RS.scene.emit('tool', this.active); },
dueClic(a) {
if (this.active.mode !== 'drag' && this.active.mode !== 'drag2') return;
this._dueClic = { kind: 'newdrag', tool: this.active.tool, def: this.active.def, a, b: a, preview: null };
},
togliUltimoPunto(w) {
if (!this._poly) return;
this._poly.pts.pop();
if (!this._poly.pts.length) { this.cancelPoly(); return; }
this.polyPreview(w);
},
fine(forza) {
if (!forza && RS.sketch && RS.sketch.auto && RS.sketch.auto._aperta) { RS.sketch.auto.fine(); return; }
if (this._poly && this._poly.pts && this._poly.pts.length >= 2) this.commitPoly();
this.cancelPoly(); this.toSelect();
if (RS.ui && RS.ui._triClosePanel) RS.ui._triClosePanel();
},
worldFromEvent(e) { return RS.scene.toWorld(e.clientX, e.clientY); },
hs() { return 7 / RS.scene.pxPerMeter(); },
snapOn: true,
snapCandidates(escludi) {
const out = [];
RS.scene.elements.forEach(e => {
if (e.locked || e.type === 'image' || (escludi && escludi.has(e.id))) return;
const ps = RS.elements.snapPoints(e);
if (ps) ps.forEach((p, i) => { p.el = e; p.nome = nomeAggancio(e, i, ps.length); out.push(p); });
});
return out;
},
nearestSnap(w) {
if (!this.snapOn) return null;
const thr = 11 / RS.scene.pxPerMeter();
let best = null, bd = thr;
this.snapCandidates().forEach(c => { const dd = Math.hypot(c.x - w.x, c.y - w.y); if (dd < bd) { bd = dd; best = c; } });
return best;
},
snapPoint(w) {
const b = this.nearestSnap(w);
if (b) return { x: b.x, y: b.y, snapped: true, anchor: b.anchor };
const g = RS.scene.snap(w); return { x: g.x, y: g.y, snapped: false };
},
updateRuler(w) {
const ov = RS.scene.gOverlay; ov.querySelectorAll('.ruler').forEach(n => n.remove());
const sp = this.nearestSnap(w), cur = sp ? { x: sp.x, y: sp.y } : RS.scene.snap(w);
let from = null, label = null;
if (this._op && this._op.kind === 'newdrag') {
const op = this._op, a = op.a;
if (op.tool === 'building' || op.tool === 'island' || op.tool === 'parking') {
label = Math.abs(cur.x - a.x).toFixed(2) + ' × ' + Math.abs(cur.y - a.y).toFixed(2) + ' m';
} else from = a;
} else if (this._poly && this._poly.pts.length) {
from = this._poly.pts[this._poly.pts.length - 1];
} else return;
if (from) {
const d = Math.hypot(cur.x - from.x, cur.y - from.y);
let ang = Math.atan2(cur.y - from.y, cur.x - from.x) * 180/Math.PI;
ang = ((ang % 360) + 360) % 360;
label = d.toFixed(2) + ' m  ·  ' + ang.toFixed(0) + '°';
}
if (!label) return;
const px = RS.scene.pxPerMeter();
const fs = 13 / px, off = 16 / px;
if (from) {
const gl = N('line');
gl.setAttribute('x1', from.x); gl.setAttribute('y1', from.y);
gl.setAttribute('x2', cur.x); gl.setAttribute('y2', cur.y);
gl.setAttribute('class', 'ruler ov-guideline');
ov.appendChild(gl);
}
const t = N('text');
t.setAttribute('x', cur.x + off); t.setAttribute('y', cur.y - off);
t.setAttribute('class', 'ruler'); t.setAttribute('font-size', fs); t.setAttribute('fill', '#fff');
t.setAttribute('font-weight', '700'); t.textContent = label;
ov.appendChild(t);
try {
const bb = t.getBBox(), pad = fs * 0.38;
const r = N('rect');
r.setAttribute('x', bb.x - pad); r.setAttribute('y', bb.y - pad * 0.7);
r.setAttribute('width', bb.width + pad * 2); r.setAttribute('height', bb.height + pad * 1.4);
r.setAttribute('rx', pad); r.setAttribute('class', 'ruler ov-chip');
ov.insertBefore(r, t);
} catch (e) {}
},
updateSnapIndicator(w) {
const ov = RS.scene.gOverlay; ov.querySelectorAll('.ov-snap, .ov-snap-chip').forEach(n => n.remove());
const m = this.active.mode;
const drawing = this._poly || m === 'poly' || m === 'drag' || m === 'drag2' || m === 'place' ||
(this._op && this._op.kind === 'vertex');
if (!drawing) return;
const best = this.nearestSnap(w); if (!best) return;
const px = RS.scene.pxPerMeter(), r = 7 / px, c = 11 / px;
const halo = N('circle');
halo.setAttribute('cx', best.x); halo.setAttribute('cy', best.y); halo.setAttribute('r', r);
halo.setAttribute('class', 'ov-snap ov-snap-halo'); ov.appendChild(halo);
const ring = N('circle');
ring.setAttribute('cx', best.x); ring.setAttribute('cy', best.y); ring.setAttribute('r', r);
ring.setAttribute('class', 'ov-snap'); ov.appendChild(ring);
[[-c, 0, c, 0], [0, -c, 0, c]].forEach(([dx1, dy1, dx2, dy2]) => {
const l = N('line');
l.setAttribute('x1', best.x + dx1); l.setAttribute('y1', best.y + dy1);
l.setAttribute('x2', best.x + dx2); l.setAttribute('y2', best.y + dy2);
l.setAttribute('class', 'ov-snap'); ov.appendChild(l);
});
if (best.nome) chipOv(ov, best.x + 14 / px, best.y - 14 / px, best.nome, '#16a34a', 'ov-snap-chip');
},
agganciaSpostamento(op) {
const S = RS.scene, ppm = S.pxPerMeter(), ids = new Set(op.orig.map(o => o.id));
const miei = [];
ids.forEach(id => { const e = S.get(id); if (e) (RS.elements.snapPoints(e) || []).forEach(p => miei.push(p)); });
if (!miei.length) return null;
const altri = this.snapCandidates(ids), soglia = 11 / ppm;
let best = null;
miei.forEach(p => altri.forEach(c => { const d = Math.hypot(c.x - p.x, c.y - p.y); if (d < soglia && (!best || d < best.d)) best = { d, dx: c.x - p.x, dy: c.y - p.y, c }; }));
return best;
},
allineaSpostamento(op) {
const S = RS.scene, ppm = S.pxPerMeter(), ids = new Set(op.orig.map(o => o.id)), soglia = 6 / ppm;
let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
ids.forEach(id => { const b = RS.elements.bounds(S.get(id)); if (b) { x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.w); y1 = Math.max(y1, b.y + b.h); } });
if (x0 > x1) return null;
const xs = [x0, (x0 + x1) / 2, x1], ys = [y0, (y0 + y1) / 2, y1];
const rif = [];
S.elements.forEach(e => {
if (ids.has(e.id) || e.type === 'image' || e.type === 'road' || e.type === 'roadway' || e.type === 'curva' || e.type === 'raccordo' || e.type === 'legend' || e.type === 'measuretable' || e.type === 'graphscale') return;
if (e.letter) { rif.push({ x: e.x, y: e.y }); return; }
const b = RS.elements.bounds(e); if (b) rif.push({ x: b.x + b.w / 2, y: b.y + b.h / 2 });
});
let bx = null, by = null;
rif.forEach(r => {
xs.forEach(x => { const d = r.x - x; if (Math.abs(d) < soglia && (!bx || Math.abs(d) < Math.abs(bx.d))) bx = { d, x: r.x, r }; });
ys.forEach(y => { const d = r.y - y; if (Math.abs(d) < soglia && (!by || Math.abs(d) < Math.abs(by.d))) by = { d, y: r.y, r }; });
});
return (bx || by) ? { dx: bx ? bx.d : 0, dy: by ? by.d : 0, vx: bx, vy: by, box: { x0, y0, x1, y1 } } : null;
},
guideSpostamento(op, ag, al) {
const S = RS.scene, ov = S.gOverlay, ppm = S.pxPerMeter();
ov.querySelectorAll('.guida').forEach(n => n.remove());
const linea = (x1, y1, x2, y2, col, tratt) => { const l = N('line'); attr(l, { x1, y1, x2, y2, class: 'guida', stroke: col, 'stroke-width': 1.4, 'vector-effect': 'non-scaling-stroke', 'stroke-dasharray': tratt || '' }); ov.appendChild(l); };
const punto = (x, y, col) => { const c = N('circle'); attr(c, { cx: x, cy: y, r: 3 / ppm, class: 'guida', fill: col }); ov.appendChild(c); };
const quota = (a, b, testo, col, f, ox, oy) => { f = f == null ? 0.5 : f; linea(a.x, a.y, b.x, b.y, col, '5 3'); punto(a.x, a.y, col); punto(b.x, b.y, col);
chipOv(ov, a.x + (b.x - a.x) * f + (ox || 0), a.y + (b.y - a.y) * f + (oy || 0), testo, 'rgba(28,35,44,.9)', 'guida', true); };
const m = v => v.toFixed(2).replace('.', ',') + ' m';
if (ag) {
const c = N('circle'); attr(c, { cx: ag.c.x, cy: ag.c.y, r: 8 / ppm, class: 'guida', fill: 'none', stroke: '#16a34a', 'stroke-width': 2.2, 'vector-effect': 'non-scaling-stroke' }); ov.appendChild(c);
punto(ag.c.x, ag.c.y, '#16a34a');
chipOv(ov, ag.c.x + 12 / ppm, ag.c.y - 12 / ppm, 'agganciato: ' + ag.c.nome, '#16a34a', 'guida');
}
if (al) {
const V = S.view;
if (al.vx) linea(al.vx.x, Math.min(al.box.y0, al.vx.r.y) - V.h, al.vx.x, Math.max(al.box.y1, al.vx.r.y) + V.h, '#e0389b', '7 4');
if (al.vy) linea(Math.min(al.box.x0, al.vy.r.x) - V.w, al.vy.y, Math.max(al.box.x1, al.vy.r.x) + V.w, al.vy.y, '#e0389b', '7 4');
}
if (op.orig.length !== 1 || S.fuoriScala) return;
const e = S.get(op.orig[0].id);
if (!e || e.pts || e.x == null || ['road', 'raccordo', 'curva', 'image', 'legend', 'measuretable', 'graphscale', 'north', 'roundabout', 'incrocio', 'building', 'area', 'island', 'parking'].indexOf(e.type) >= 0) return;
const pts = (RS.elements.snapPoints(e) || []).filter(p => isFinite(p.x));
if (!pts.length) return;
let strada = null;
S.elements.forEach(r => {
if (r.type !== 'road') return;
const a = (r.rot || 0) * Math.PI / 180, ux = Math.cos(a), uy = Math.sin(a), dx = e.x - r.x, dy = e.y - r.y;
const u = dx * ux + dy * uy, v = -dx * uy + dy * ux;
if (Math.abs(u) > r.len / 2 || Math.abs(v) > r.wid / 2 + 4) return;
if (!strada || Math.abs(v) < Math.abs(strada.v)) strada = { r, ux, uy, u, v };
});
if (strada) {
const { r, ux, uy, u } = strada, hw = r.wid / 2;
const vs = pts.map(p => -(p.x - r.x) * uy + (p.y - r.y) * ux), vmin = Math.min(...vs), vmax = Math.max(...vs);
const P = (uu, vv) => ({ x: r.x + uu * ux - vv * uy, y: r.y + uu * uy + vv * ux });
if (vmin > -hw && vmax < hw) {
const sx = 36 / ppm * ux, sy = 36 / ppm * uy;
quota(P(u, -hw), P(u, vmin), m(vmin + hw), '#c0392b', 0.5, sx, sy);
quota(P(u, vmax), P(u, hw), m(hw - vmax), '#c0392b', 0.5, sx, sy);
} else if (vmax <= -hw) quota(P(u, vmax), P(u, -hw), m(-hw - vmax) + ' dal bordo', '#c0392b');
else if (vmin >= hw) quota(P(u, hw), P(u, vmin), m(vmin - hw) + ' dal bordo', '#c0392b');
}
let cap = null;
S.elements.forEach(c => { if (!c.letter || c.id === e.id) return; pts.forEach(p => { const d = Math.hypot(p.x - c.x, p.y - c.y); if (!cap || d < cap.d) cap = { d, c, p }; }); });
if (cap && cap.d < 40) quota({ x: cap.c.x, y: cap.c.y }, cap.p, m(cap.d) + ' dal caposaldo ' + cap.c.letter, '#7a3a9a', 0.3, 0, -14 / ppm);
},
onDown(e) {
if (e.pointerType === 'touch') {
if (e.isPrimary || !this._touches) { this._touches = {}; this._pinch = null; }
this._touches[e.pointerId] = { x: e.clientX, y: e.clientY };
const ids = Object.keys(this._touches);
if (ids.length === 2) {
const a = this._touches[ids[0]], b = this._touches[ids[1]];
this._pinch = {
dist: Math.hypot(b.x - a.x, b.y - a.y),
w: RS.scene.view.w,
cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2
};
this._op = null;
RS.scene.gOverlay.querySelectorAll('.preview').forEach(n => n.remove());
e.preventDefault();
return;
}
}
if (e.button === 1 || (e.button === 0 && this._space) || this.active.mode === 'pan') {
this._op = { kind: 'pan', sx: e.clientX, sy: e.clientY };
RS.scene.svg.classList.add('panning');
e.preventDefault(); return;
}
if (e.button === 2) { return; }
const w = this.worldFromEvent(e);
if (this._dueClic) { const op = this._dueClic; this._dueClic = null; this.commitDrag(op, w); return; }
const nv = e.target.closest && e.target.closest('.nome-via'), nvEl = nv && nv.closest('.el'), nvS = nvEl && nvEl.dataset.id && RS.scene.get(nvEl.dataset.id);
if (nvS && !nvS.locked && (this.active.mode === 'select' || this.active.mode === 'freehand')) {
const op = { kind: this.active.mode === 'select' ? 'via' : 'attesa', via: nvS.id, sx: w.x, sy: w.y, cx: e.clientX, cy: e.clientY, moved: false, schizzo: this.active.mode === 'freehand', orig: [] };
this._op = op;
if (op.kind === 'attesa') {
clearTimeout(this._tAttesa);
this._tAttesa = setTimeout(() => {
if (this._op !== op) return;
op.kind = 'via';
if (RS.ui && RS.ui.vibra) RS.ui.vibra('30');
if (RS.sketch && RS.sketch.auto && RS.sketch.auto.testo) RS.sketch.auto.testo('Trascina il nome della via');
}, 350);
}
e.preventDefault(); return;
}
const handle = e.target.closest && e.target.closest('[data-handle]');
if (handle && this.active.mode === 'select') {
this.startHandle(handle, w, e); return;
}
const rp = e.target.closest && e.target.closest('[data-rilpt]');
if (rp && this.active.mode === 'select') {
const host = rp.closest('.el');
if (host && host.dataset.id) {
this._op = { kind: 'rilpt', vid: host.dataset.id, i: +rp.dataset.rilpt };
return;
}
}
const m = this.active.mode;
if (m === 'calibrate') { this.calibrateClick(w); return; }
if (m === 'place') { this.placeAt(w); return; }
if (m === 'placeTool') { this.placeToolAt(w); return; }
if (m === 'text') { this.placeText(w); return; }
if (m === 'poly') { this.polyClick(w); return; }
if (m === 'freehand') {
const S = RS.scene;
if (handle && S.selection.length) { this.startHandle(handle, w, e); e.preventDefault(); return; }
if (rp) { const host = rp.closest('.el'); if (host && host.dataset.id) { this._op = { kind: 'rilpt', vid: host.dataset.id, i: +rp.dataset.rilpt }; e.preventDefault(); return; } }
const nd = e.target.closest && e.target.closest('.el'), sotto = nd && nd.dataset.id ? S.get(nd.dataset.id) : null;
const punto = sotto && (sotto.letter || sotto.type === 'surveypt');
if (sotto && !sotto.locked && !sotto.inc && punto) {
if (!S.isSelected(sotto.id)) S.select([sotto.id]);
this._op = { kind: 'move', sx: w.x, sy: w.y, moved: false, schizzo: true, orig: S.selection.map(i => snapshotEl(S.get(i))) };
e.preventDefault(); return;
}
if (sotto && !sotto.locked && !sotto.inc && S.isSelected(sotto.id)) {
const op = { kind: 'attesa', sx: w.x, sy: w.y, cx: e.clientX, cy: e.clientY, schizzo: true, orig: S.selection.map(i => snapshotEl(S.get(i))) };
this._op = op;
clearTimeout(this._tAttesa);
this._tAttesa = setTimeout(() => {
if (this._op !== op) return;
op.kind = 'move'; op.moved = false;
if (RS.ui && RS.ui.vibra) RS.ui.vibra('30');
if (RS.sketch && RS.sketch.auto && RS.sketch.auto.testo) RS.sketch.auto.testo('Trascina per spostarlo');
}, 350);
e.preventDefault(); return;
}
if (S.selection.length) S.select([]);
this._op = { kind: 'freehand', pts: [{ x: w.x, y: w.y }], node: null };
e.preventDefault(); return;
}
if (m === 'drag2' || m === 'drag') { this.startDrag(w, e); return; }
if (m === 'ruler') { this._op = { kind: 'ruler', a: this.snapPoint(w) }; return; }
if (m === 'triangulate') {
const node = e.target.closest && e.target.closest('.el');
const cel = (node && node.dataset.id) ? RS.scene.get(node.dataset.id) : null;
RS.ui.triCanvasClick(cel, w); return;
}
const node = e.target.closest && e.target.closest('.el');
const cel0 = (node && node.dataset.id) ? RS.scene.get(node.dataset.id) : null;
let cel = RS.incroci ? RS.incroci.regista(cel0) : cel0;
if (cel && cel.type === 'image') { const vic = this.oggettoVicino(e); if (vic) cel = vic; }
const tocco = e.pointerType && e.pointerType !== 'mouse';
if (cel && !(cel.locked && cel.type === 'image')) {
if (tocco && cel.type === 'image' && !RS.scene.isSelected(cel.id)) {
RS.scene.select([cel.id]);
if (RS.ui) RS.ui.toast('Sfondo selezionato: ora trascinalo per spostarlo', 3000);
return;
}
const ids = cel.gid ? RS.scene.elements.filter(x => x.gid === cel.gid).map(x => x.id) : [cel.id];
const allSel = ids.every(id => RS.scene.isSelected(id));
if (e.shiftKey) {
RS.scene.select(allSel ? RS.scene.selection.filter(id => ids.indexOf(id) < 0) : ids, !allSel);
if (allSel) return;
} else if (!allSel) {
RS.scene.select(ids);
}
if (!RS.scene.selection.some(id => (RS.scene.get(id) || {}).locked)) {
this._op = { kind: 'move', sx: w.x, sy: w.y, moved: false,
orig: RS.scene.selection.map(i => snapshotEl(RS.scene.get(i))) };
}
} else {
this._op = { kind: 'marquee', sx: w.x, sy: w.y, lx: w.x, ly: w.y, additive: e.shiftKey, node: null,
sfondo: cel && cel.type === 'image' && cel.locked && !RS.scene.selection.length ? cel.id : null };
}
},
oggettoVicino(e) {
if (!document.elementsFromPoint) return null;
const r = e.pointerType && e.pointerType !== 'mouse' ? [0, 12, 22] : [0, 6];
const S = RS.scene, svg = S.svg;
for (const d of r) {
const passi = d ? 8 : 1;
for (let k = 0; k < passi; k++) {
const a = k * Math.PI / 4, x = e.clientX + d * Math.cos(a), y = e.clientY + d * Math.sin(a);
for (const n of document.elementsFromPoint(x, y)) {
if (svg && !svg.contains(n)) continue;
const h = n.closest && n.closest('.el'), o = h && h.dataset.id ? S.get(h.dataset.id) : null;
if (!o || o.type === 'image') continue;
return RS.incroci ? RS.incroci.regista(o) : o;
}
}
}
return null;
},
applicaPizzico() {
const P = this._pinch, T = this._touches; if (!P || !T) return;
const ids = Object.keys(T); if (ids.length !== 2) return;
const a = T[ids[0]], b = T[ids[1]];
const d = Math.hypot(b.x - a.x, b.y - a.y);
if (!(d > 8 && P.dist > 8)) return;
const S = RS.scene, v = S.view;
const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
const prima = S.toWorld(P.cx, P.cy);
let nw = P.w * (P.dist / d);
nw = Math.max(1, Math.min(4000, nw));
if (!isFinite(nw) || !isFinite(prima.x) || !isFinite(prima.y)) return;
const k = nw / v.w;
S.view = { x: v.x, y: v.y, w: nw, h: v.h * k };
S._applyView();
const dopo = S.toWorld(cx, cy);
if (isFinite(dopo.x) && isFinite(dopo.y)) { S.view.x += prima.x - dopo.x; S.view.y += prima.y - dopo.y; }
S._applyView();
P.cx = cx; P.cy = cy;
},
onMove(e) {
if (e.pointerType === 'touch' && this._touches && this._touches[e.pointerId]) {
this._touches[e.pointerId] = { x: e.clientX, y: e.clientY };
const ids = Object.keys(this._touches);
if (this._pinch && ids.length === 2) {
if (!this._pinchRaf) this._pinchRaf = requestAnimationFrame(() => { this._pinchRaf = null; this.applicaPizzico(); });
e.preventDefault();
return;
}
}
const w = this.worldFromEvent(e);
RS.scene.emit('coord', w);
this.updateSnapIndicator(w);
this.updateRuler(w);
if (this.active.mode === 'calibrate' && this._calib && this._calib.p1) {
const ov = RS.scene.gOverlay; ov.querySelectorAll('.calib').forEach(n => n.remove());
const ln = N('line');
ln.setAttribute('x1', this._calib.p1.x); ln.setAttribute('y1', this._calib.p1.y);
ln.setAttribute('x2', w.x); ln.setAttribute('y2', w.y);
ln.setAttribute('class', 'calib'); ln.setAttribute('stroke', '#ff9d2e');
ln.setAttribute('stroke-width', '2'); ln.setAttribute('vector-effect', 'non-scaling-stroke');
ln.setAttribute('stroke-dasharray', '5 4');
ov.appendChild(ln);
}
const op = this._op;
if (this._poly) { this.polyPreview(w); }
if (this._dueClic) this.dragPreview(this._dueClic, w);
if (!op) return;
if (op.kind === 'pan') {
const ppm = RS.scene.pxPerMeter();
const dx = (e.clientX - op.sx) / ppm, dy = (e.clientY - op.sy) / ppm;
RS.scene.panBy(dx, dy); op.sx = e.clientX; op.sy = e.clientY; return;
}
if (op.kind === 'ruler') { this.drawQuickMeasure(op.a, this.snapPoint(w)); return; }
if (op.kind === 'via') {
const el = RS.scene.get(op.via); if (!el) return;
op.moved = true;
if (el.type === 'roadway' && el.pts && el.pts.length) el.viaPos = { x: +(w.x - el.pts[0].x).toFixed(2), y: +(w.y - el.pts[0].y).toFixed(2) };
else { const R = -(el.rot || 0) * Math.PI / 180, dx = w.x - el.x, dy = w.y - el.y; el.viaPos = { x: +(dx * Math.cos(R) - dy * Math.sin(R)).toFixed(2), y: +(dx * Math.sin(R) + dy * Math.cos(R)).toFixed(2) }; }
if (!this._rafVia) this._rafVia = requestAnimationFrame(() => { this._rafVia = 0; RS.scene.render(); });
return;
}
if (op.kind === 'attesa') {
if (Math.hypot(e.clientX - op.cx, e.clientY - op.cy) < 10) return;
clearTimeout(this._tAttesa);
RS.scene.select([]);
this._op = { kind: 'freehand', pts: [{ x: op.sx, y: op.sy }], node: null };
return this.onMove(e);
}
if (op.kind === 'move') {
let dx = w.x - op.sx, dy = w.y - op.sy;
op.moved = true;
if (!op.seguono) op.seguono = seguaci(op.orig);
const sposta = () => op.orig.concat(op.seguono).forEach(o => {
const el = RS.scene.get(o.id); if (!el) return;
if (o.pts) { el.pts = o.pts.map(p => { const q = { x: p.x + dx, y: p.y + dy }; if (p.aid != null) { q.aid = p.aid; q.alx = p.alx; q.aly = p.aly; } return q; }); }
else { el.x = o.x + dx; el.y = o.y + dy; }
});
sposta();
const ag = this.snapOn ? this.agganciaSpostamento(op) : null;
const al = ag ? null : this.allineaSpostamento(op);
if (ag) { dx += ag.dx; dy += ag.dy; sposta(); }
else if (al) { dx += al.dx; dy += al.dy; sposta(); }
RS.scene.render();
this.guideSpostamento(op, ag, al);
return;
}
if (op.kind === 'rotate') {
const el = RS.scene.get(op.id); if (!el) return;
let ang = Math.atan2(w.y - op.cy, w.x - op.cx) * 180 / Math.PI + 90;
ang = ((ang % 360) + 360) % 360;
if (this._shift) ang = Math.round(ang / 15) * 15;
else { const near = Math.round(ang / 45) * 45; if (Math.abs(near - ang) <= 3.5) ang = near; }
el.rot = Math.round(ang * 10) / 10; RS.scene.render();
this.showRotBadge(el); return;
}
if (op.kind === 'grot') {
let d = (Math.atan2(w.y - op.c.y, w.x - op.c.x) - op.a0) * 180 / Math.PI;
d = ((d % 360) + 540) % 360 - 180;
if (this._shift) d = Math.round(d / 15) * 15;
else { const near = Math.round(d / 45) * 45; d = Math.abs(near - d) <= 2 ? near : Math.round(d * 2) / 2; }
op.orig.forEach(o => {
const e = o.e;
if (o.x !== undefined) e.x = o.x;
if (o.y !== undefined) e.y = o.y;
if (o.rot === undefined) delete e.rot; else e.rot = o.rot;
if (o.pts) e.pts = o.pts.map(p => Object.assign({}, p));
});
RS.ui.ruotaElementi(op.orig.map(o => o.e), d, op.c);
op.deg = d; RS.scene.render();
this.showRotBadge({ x: op.c.x, y: op.c.y }, (d > 0 ? '+' : '') + String(d).replace('.', ',') + '°');
return;
}
if (op.kind === 'arco') {
const el = RS.scene.get(op.id); if (!el) return;
const loc = toLocal(w, op.cx, op.cy, op.rot), off = el.wid / 2 + (op.pad || 0);
let f = op.f0 / 2 - loc.y - off;
if (f < 0) f = Math.min(0, op.f0 / 2 - loc.y + off);
if (Math.abs(f) < 0.15) f = 0;
el.x = op.cx; el.y = op.cy; if (op.f0) el.arco = op.f0; else delete el.arco;
RS.elements.impostaArco(el, f);
RS.scene.render();
const fa = RS.elements.arcoDi(el);
this.showRotBadge({ x: el.x, y: el.y }, fa ? 'freccia ' + Math.abs(fa).toFixed(2).replace('.', ',') + ' m' : 'dritta');
return;
}
if (op.kind === 'resize') {
const el = RS.scene.get(op.id); if (!el) return;
const loc = toLocal(w, op.cx, op.cy, op.rot != null ? op.rot : (el.rot || 0));
const pad = op.pad || 0, sx = op.sx, sy = op.sy;
if (op.alCentro || (!sx && !sy)) {
let nw = sx || !sy ? Math.max(0.2, (Math.abs(loc.x) - pad) * 2) : op.w0, nh = sy || !sx ? Math.max(0.2, (Math.abs(loc.y) - pad) * 2) : op.h0;
if (op.lockAspect && op.w0 > 0 && op.h0 > 0) { const k = Math.max(nw / op.w0, nh / op.h0); nw = op.w0 * k; nh = op.h0 * k; }
applySize(el, nw, nh, op.lockAspect);
RS.scene.render(); return;
}
let nw = sx ? Math.max(0.2, sx * (loc.x - sx * pad) + op.w0 / 2) : op.w0;
let nh = sy ? Math.max(0.2, sy * (loc.y - sy * pad) + op.h0 / 2) : op.h0;
if (op.lockAspect && op.w0 > 0 && op.h0 > 0) { const k = Math.max(sx ? nw / op.w0 : 0, sy ? nh / op.h0 : 0) || 1; nw = op.w0 * k; nh = op.h0 * k; }
applySize(el, nw, nh, op.lockAspect);
const a = RS.elements.localSize(el);
const clx = sx ? sx * (a.w - op.w0) / 2 : 0, cly = sy ? sy * (a.h - op.h0) / 2 : 0;
const r = op.rot * Math.PI / 180;
el.x = op.cx + clx * Math.cos(r) - cly * Math.sin(r);
el.y = op.cy + clx * Math.sin(r) + cly * Math.cos(r);
RS.scene.render(); return;
}
if (op.kind === 'vertex') {
const el = RS.scene.get(op.id); if (!el) return;
el.pts[op.i] = mkPt(this.snapPoint(w)); RS.scene.render(); return;
}
if (op.kind === 'rilpt') {
const v = RS.scene.get(op.vid); if (!v || !v.rilpts || !v.rilpts[op.i]) return;
const loc = toLocal(w, v.x, v.y, v.rot || 0);
v.rilpts[op.i].lx = Math.round(loc.x*100)/100;
v.rilpts[op.i].ly = Math.round(loc.y*100)/100;
RS.scene.render(); return;
}
if (op.kind === 'braccio') {
const el = RS.scene.get(op.id); if (!el) return;
RS.incroci.trascinaBraccio(el, op.i, w); RS.scene.render(); return;
}
if (op.kind === 'lbl') {
const el = RS.scene.get(op.id); if (!el) return;
el.llx = Math.round((w.x - el.x) * 100) / 100;
el.lly = Math.round((w.y - el.y + (el.size||0.5)*0.35) * 100) / 100;
RS.scene.render(); return;
}
if (op.kind === 'freehand') {
const last = op.pts[op.pts.length - 1];
const min = RS.scene.view.w * 0.004;
if (Math.hypot(w.x - last.x, w.y - last.y) < min) return;
op.pts.push({ x: w.x, y: w.y });
const ov = RS.scene.gOverlay;
if (!op.node) {
op.node = N('path');
attr(op.node, { class: 'preview', fill: 'none', stroke: (this.active.def && this.active.def.color) || '#3a3a3a',
'stroke-width': (this.active.def && this.active.def.width) || 0.12,
'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
ov.appendChild(op.node);
}
op.node.setAttribute('d', op.pts.map((p, i) => (i ? 'L' : 'M') + p.x + ' ' + p.y).join(' '));
return;
}
if (op.kind === 'marquee') { this.marqueeMove(op, w); return; }
if (op.kind === 'newdrag') { this.dragPreview(op, w); }
},
marqueeMove(op, w) {
op.lx = w.x; op.ly = w.y;
const r = rectFromPts(op.sx, op.sy, w.x, w.y);
if (!op.node) { op.node = N('rect'); op.node.setAttribute('class', 'ov-marquee'); RS.scene.gOverlay.appendChild(op.node); }
op.node.setAttribute('x', r.x); op.node.setAttribute('y', r.y);
op.node.setAttribute('width', r.w); op.node.setAttribute('height', r.h);
},
onAnnullato(e) {
if (this._op && this._op.kind === 'attesa') { clearTimeout(this._tAttesa); this._op = null; }
if (this._op && this._op.kind === 'freehand') {
if (this._touches) delete this._touches[e.pointerId];
if (!this._touches || Object.keys(this._touches).length < 2) this._pinch = null;
if (this._op.node) this._op.node.remove();
this._op = null;
return;
}
this.onUp(e);
},
onUp(e) {
if (this._touches && this._touches[e.pointerId]) {
delete this._touches[e.pointerId];
if (Object.keys(this._touches).length < 2) this._pinch = null;
}
const op = this._op; this._op = null;
RS.scene.svg.classList.remove('panning');
if (RS.ui && RS.ui.aggiornaTela) setTimeout(() => RS.ui.aggiornaTela(), 0);
if (!op) return;
if (op.kind === 'freehand') {
if (op.node) op.node.remove();
RS.sketch.auto.tratto(op.pts);
return;
}
if (op.kind === 'via') {
if (op.moved) {
RS.scene.render(); RS.scene.snapshot();
if (op.schizzo && RS.sketch && RS.sketch.auto && RS.sketch.auto.testo) RS.sketch.auto.testo('Nome della via spostato');
if (!op.schizzo) { RS.scene.select([op.via]); RS.scene.emit('select'); }
} else if (op.schizzo) RS.sketch.auto.tratto([{ x: op.sx, y: op.sy }]);
else RS.scene.select([op.via]);
return;
}
if (op.kind === 'attesa') {
clearTimeout(this._tAttesa);
RS.sketch.auto.tratto([{ x: op.sx, y: op.sy }]);
return;
}
if (op.kind === 'move') {
RS.scene.gOverlay.querySelectorAll('.guida').forEach(n => n.remove());
this.drawSelection();
if (op.moved) RS.scene.snapshot();
if (op.schizzo && !op.moved && RS.sketch && RS.sketch.auto) RS.sketch.auto.tratto([{ x: op.sx, y: op.sy }]);
else if (op.schizzo && op.moved && RS.sketch && RS.sketch.auto && RS.sketch.auto.testo) RS.sketch.auto.testo('Spostato: trascina ancora o scegli una penna');
} else if (op.kind === 'rotate' || op.kind === 'grot' || op.kind === 'resize' || op.kind === 'vertex' || op.kind === 'rilpt' || op.kind === 'lbl' || op.kind === 'braccio' || op.kind === 'arco') {
if (op.kind === 'rotate' || op.kind === 'grot' || op.kind === 'arco') this.hideRotBadge();
RS.scene.snapshot();
RS.scene.emit('select');
} else if (op.kind === 'marquee') {
if (op.node) op.node.remove();
const r = rectFromPts(op.sx, op.sy, op.lx, op.ly);
if (r.w < 0.3 && r.h < 0.3) {
if (!op.additive) RS.scene.select([]);
if (op.sfondo && RS.ui) {
const S = RS.scene;
RS.ui.toast('🔒 Sfondo bloccato', 7000, [{ t: '🔓 Sblocca', fn: () => {
const s = S.get(op.sfondo); if (!s) return;
s.locked = false; S.render(); S.snapshot(); S.select([s.id]);
RS.ui.toast('Sfondo sbloccato e selezionato: ora si sposta. Bloccalo di nuovo quando è a posto', 4500);
} }]);
}
}
else {
const hits = RS.scene.elements.filter(el => { if (el.locked) return false; const b = RS.elements.bounds(el); return b && bbOverlap(b, r); }).map(el => (RS.incroci ? RS.incroci.regista(el, true) : el).id).filter((id, k, a) => a.indexOf(id) === k);
RS.scene.select(hits, op.additive);
}
} else if (op.kind === 'newdrag') {
this.commitDrag(op, this.worldFromEvent(e));
} else if (op.kind === 'ruler') {
clearTimeout(this._qmT);
this._qmT = setTimeout(() => { RS.scene.gOverlay.querySelectorAll('.qm').forEach(n => n.remove()); }, 6000);
}
},
drawQuickMeasure(a, b) {
const ov = RS.scene.gOverlay, px = RS.scene.pxPerMeter();
ov.querySelectorAll('.qm').forEach(n => n.remove());
const d = Math.hypot(b.x - a.x, b.y - a.y);
const line = N('line');
attr(line, { x1: a.x, y1: a.y, x2: b.x, y2: b.y, class: 'qm ov-ruler-line' });
ov.appendChild(line);
const ang = Math.atan2(b.y - a.y, b.x - a.x), tl = 8 / px, nx = -Math.sin(ang) * tl, ny = Math.cos(ang) * tl;
[[a.x, a.y], [b.x, b.y]].forEach(p => {
const tk = N('line'); attr(tk, { x1: p[0] - nx, y1: p[1] - ny, x2: p[0] + nx, y2: p[1] + ny, class: 'qm ov-ruler-line' }); ov.appendChild(tk);
});
const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, fs = 13 / px, off = 14 / px;
const t = N('text');
attr(t, { x: mx, y: my - off, class: 'qm', 'font-size': fs, fill: '#fff', 'font-weight': 700, 'text-anchor': 'middle' });
t.textContent = d.toFixed(2) + ' m';
ov.appendChild(t);
try {
const bb = t.getBBox(), pad = fs * 0.4, r = N('rect');
attr(r, { x: bb.x - pad, y: bb.y - pad * 0.7, width: bb.width + pad * 2, height: bb.height + pad * 1.4, rx: pad, class: 'qm ov-chip' });
ov.insertBefore(r, t);
} catch (e) {}
},
onDbl(e) {
if (this._poly) { this.commitPoly(); return; }
const node = e.target.closest && e.target.closest('.el-text');
if (node && node.dataset.id) {
const el = RS.scene.get(node.dataset.id);
const t = prompt('Testo:', el.text || '');
if (t != null) RS.scene.update(el.id, { text: t }, true);
}
},
onWheel(e) {
e.preventDefault();
const f = e.deltaY > 0 ? 1.12 : 1 / 1.12;
RS.scene.zoomAt(e.clientX, e.clientY, f);
},
onKey(e) {
if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
this._shift = e.shiftKey;
if (e.code === 'Space') { this._space = true; e.preventDefault(); }
if (e.key === 'Escape') { this.cancelPoly(); this.toSelect(); RS.scene.select([]); if (RS.ui && RS.ui._triClosePanel) RS.ui._triClosePanel(); }
if (e.key === 'Enter' && this._poly) { this.commitPoly(); }
if ((e.key === 'Delete' || e.key === 'Backspace') && RS.scene.selection.length) {
RS.scene.remove(RS.scene.selection); e.preventDefault();
}
if ((e.key === 'r' || e.key === 'R') && !e.ctrlKey && !e.metaKey && RS.scene.selection.length) {
RS.ui.ruotaElementi(RS.scene.selection.map(id => RS.scene.get(id)).filter(Boolean), e.shiftKey ? 15 : 90);
RS.scene.render(); RS.scene.snapshot(); RS.scene.emit('select'); e.preventDefault();
}
if (RS.scene.selection.length && e.key.startsWith('Arrow')) {
const d = e.shiftKey ? 1 : RS.scene.grid.step;
const dx = e.key === 'ArrowLeft' ? -d : e.key === 'ArrowRight' ? d : 0;
const dy = e.key === 'ArrowUp' ? -d : e.key === 'ArrowDown' ? d : 0;
const sel = RS.scene.selection.map(id => RS.scene.get(id)).filter(Boolean);
sel.concat(seguaci(sel).map(o => RS.scene.get(o.id))).forEach(el => {
if (el.pts) el.pts = el.pts.map(p => Object.assign({}, p, { x: p.x + dx, y: p.y + dy }));
else { el.x += dx; el.y += dy; } });
RS.scene.render(); RS.scene.snapshot(); e.preventDefault();
}
},
placeAt(w) {
const p = this.snapPoint(w);
const def = this.active.def;
let el;
if (this.active.kind === 'vehicle') {
el = { type: 'vehicle', kind: def.kind, x: p.x, y: p.y, rot: 0,
len: def.len, wid: def.wid, color: def.color, label: nextVehicleLabel() , catId: def.id };
if (!(RS.scene.meta && RS.scene.meta.frecce === false)) el.freccia = true;
el.rilpts = RS.elements.makeRilpts(el, 1); el.spigoli = true;
} else {
el = { type: 'symbol', sym: def.sym, x: p.x, y: p.y, rot: 0,
size: def.size, color: def.color, catId: def.id, nome: def.nome };
if (def.letter) el.letter = nextCaposaldoLetter();
if (def.text) el.text = def.text;
if (def.dir) el.dir = def.dir;
if (def.cod) el.cod = def.cod;
if (def.posa) el.posa = def.posa;
}
const added = RS.scene.add(el);
RS.scene.select(added.id);
this.toSelect();
},
startCalibrate(imgId) {
this.setTool({ mode: 'calibrate' });
this._calib = { imgId, p1: null };
RS.scene.emit('hint', 'Calibrazione: clicca il PRIMO punto di una distanza nota');
},
calibrateClick(w) {
const c = this._calib; if (!c) return;
if (!c.p1) {
c.p1 = { x: w.x, y: w.y };
RS.scene.emit('hint', 'Ora clicca il SECONDO punto');
return;
}
const p2 = { x: w.x, y: w.y };
const d = Math.hypot(p2.x - c.p1.x, p2.y - c.p1.y);
RS.scene.gOverlay.querySelectorAll('.calib').forEach(n => n.remove());
const ans = prompt('Distanza REALE tra i due punti, in metri:', '');
const D = parseFloat((ans || '').replace(',', '.'));
const el = RS.scene.get(c.imgId);
if (el && D > 0 && d > 0.001) {
const s = D / d;
el.x = c.p1.x + (el.x - c.p1.x) * s;
el.y = c.p1.y + (el.y - c.p1.y) * s;
el.w *= s; el.h *= s;
RS.scene.update(el.id, {}, true);
RS.scene.emit('hint', 'Scala calibrata (1 m reale = ' + (1/s).toFixed(2) + '× precedente)');
}
this._calib = null; this.toSelect(); if (el) RS.scene.select(el.id);
},
placeToolAt(w) {
const p = RS.scene.snap(w), t = this.active.tool, def = this.active.def || {};
if (t === 'junction') { this.placeJunction(p, def); return; }
if (t === 'curve') { this.placeCurve(p, def); return; }
if (t === 'panorama') { if (RS.panorama) RS.panorama.piazza(p); this.toSelect(); return; }
if (t === 'foto') {
let mx = 0; RS.scene.elements.forEach(o => { if (o.type === 'foto' && o.n > mx) mx = o.n; });
const a = RS.scene.add({ type: 'foto', x: p.x, y: p.y, n: mx + 1, descr: '', href: RS.ui._pendingFoto || '', size: 0.9 });
RS.ui._pendingFoto = null; RS.scene.select(a.id); this.toSelect(); return;
}
let el;
if (t === 'roundabout') { el = RS.incroci.rotatoriaNuova(p, def); el.z = RS.scene.elements.reduce((z, e) => Math.min(z, e.z || 0), 0) - 1; }
else if (t === 'legend') el = { type: 'legend', x: p.x, y: p.y, fs: def.fs || 0.6 };
else if (t === 'measuretable') el = { type: 'measuretable', x: p.x, y: p.y, fs: def.fs || 0.6 };
else if (t === 'north') el = { type: 'north', x: p.x, y: p.y, rot: 0, size: def.size || 3 };
else if (t === 'graphscale') el = { type: 'graphscale', x: p.x, y: p.y, size: def.size || 10 };
if (el) { const a = RS.scene.add(el); RS.scene.select(a.id); }
this.toSelect();
},
placeJunction(p, def) {
const S = RS.scene, c = RS.incroci.daModello(p, def);
c.z = S.elements.reduce((z, e) => Math.min(z, e.z || 0), 0) - 1;
const a = S.add(c, false);
S.snapshot(); S.select(a.id);
this.toSelect();
},
placeCurve(p, def) {
if (def.tratti && RS.curve) {
const S = RS.scene, c = RS.curve.nuova(p, def);
c.z = S.elements.reduce((z, e) => Math.min(z, e.z || 0), 0) - 1;
const a = S.add(c);
S.select(a.id); this.toSelect(); return;
}
const pts = (def.pts || []).map(q => ({ x: p.x + q.x, y: p.y + q.y }));
if (pts.length < 2) { this.toSelect(); return; }
const el = RS.scene.add({ type: 'roadway', pts, width: def.wid || 7, color: def.color || '#9aa0a6', line: 'disc' });
RS.scene.select(el.id);
this.toSelect();
},
placeText(w) {
const t = prompt('Testo da inserire:', '');
if (t == null || t === '') { this.toSelect(); return; }
const p = RS.scene.snap(w);
const el = RS.scene.add({ type: 'text', x: p.x, y: p.y, rot: 0, text: t, size: 0.8, color: '#111' });
RS.scene.select(el.id);
this.toSelect();
},
startDrag(w, e) {
const p = this.snapPoint(w);
this._op = { kind: 'newdrag', tool: this.active.tool, def: this.active.def, a: p, b: p, preview: null };
},
dragPreview(op, w) {
op.b = this.snapPoint(w);
const el = buildDragElement(op);
if (el && el.type === 'ramp') RS.elements.agganciaCorsia(el);
RS.scene.gOverlay.querySelectorAll('.preview').forEach(n => n.remove());
const node = RS.elements.render(el);
if (node) { node.classList.add('preview'); node.style.opacity = 0.6; RS.scene.gOverlay.appendChild(node); }
},
commitDrag(op, w) {
op.b = this.snapPoint(w);
RS.scene.gOverlay.querySelectorAll('.preview').forEach(n => n.remove());
const el = buildDragElement(op);
if (!el) return;
const len = Math.hypot(op.b.x - op.a.x, op.b.y - op.a.y);
const rectTool = op.tool === 'building' || op.tool === 'island' || op.tool === 'parking' || op.tool === 'area';
if (len < 0.3 && !rectTool) return;
const aggancio = el.type === 'ramp' && RS.elements.agganciaCorsia(el);
const added = RS.scene.add(el);
if (aggancio) RS.ui.toast('Corsia agganciata al bordo della strada, nel verso di marcia di quel lato', 3500);
RS.scene.select(added.id);
this.toSelect();
},
polyClick(w) {
const p = this.snapPoint(w);
if (!this._poly) {
this._poly = { tool: this.active.tool, def: this.active.def, pts: [mkPt(p)] };
} else {
this._poly.pts.push(mkPt(p));
}
if (this._poly.tool === 'angle' && this._poly.pts.length >= 3) this.commitPoly();
},
polyPreview(w) {
if (!this._poly) return;
RS.scene.gOverlay.querySelectorAll('.preview').forEach(n => n.remove());
const sp = this.snapPoint(w);
const pts = this._poly.pts.concat([{ x: sp.x, y: sp.y }]);
const el = polyElement(this._poly, pts);
const node = RS.elements.render(el);
node.classList.add('preview'); node.style.opacity = 0.7;
RS.scene.gOverlay.appendChild(node);
},
commitPoly() {
if (!this._poly) return;
const pl = this._poly; this._poly = null;
RS.scene.gOverlay.querySelectorAll('.preview').forEach(n => n.remove());
if (pl.pts.length < 2) return;
const pts = pl.pts.slice();
while (pts.length > 2 && Math.hypot(pts[pts.length-1].x - pts[pts.length-2].x, pts[pts.length-1].y - pts[pts.length-2].y) < 0.1) pts.pop();
const el = polyElement(pl, pts);
const added = RS.scene.add(el);
RS.scene.select(added.id);
this.toSelect();
},
cancelPoly() {
if (this._poly) { this._poly = null; RS.scene.gOverlay.querySelectorAll('.preview').forEach(n => n.remove()); }
},
startHandle(handle, w, e) {
const id = handle.dataset.id;
const type = handle.dataset.handle;
if (type === 'grot') {
const els = RS.scene.selection.map(i => RS.scene.get(i)).filter(Boolean);
const c = RS.ui.centroSelezione(els);
this._op = { kind: 'grot', c, deg: 0, a0: Math.atan2(w.y - c.y, w.x - c.x),
orig: els.map(o => ({ e: o, x: o.x, y: o.y, rot: o.rot, pts: o.pts && o.pts.map(p => Object.assign({}, p)) })) };
return;
}
const el = RS.scene.get(id); if (!el) return;
if (type === 'rot') {
this._op = { kind: 'rotate', id, cx: el.x, cy: el.y };
} else if (type === 'res') {
const ls = RS.elements.localSize(el);
const alCentro = e.altKey || !ANCORATI.has(el.type);
this._op = { kind: 'resize', id, cx: el.x, cy: el.y, rot: el.rot || 0, w0: ls.w, h0: ls.h,
sx: +handle.dataset.sx || 0, sy: +handle.dataset.sy || 0, alCentro,
lockAspect: e.shiftKey || el.type === 'symbol' || el.type === 'image', pad: this.hs() * 0.6 };
} else if (type === 'arco') {
this._op = { kind: 'arco', id, cx: el.x, cy: el.y, rot: el.rot || 0, f0: RS.elements.arcoDi(el), pad: this.hs() * 0.6 };
} else if (type === 'vtx') {
this._op = { kind: 'vertex', id, i: +handle.dataset.i };
} else if (type === 'lbl') {
this._op = { kind: 'lbl', id };
} else if (type === 'braccio') {
this._op = { kind: 'braccio', id, i: +handle.dataset.i };
}
},
drawSelection() {
const ov = RS.scene.gOverlay;
Array.from(ov.children).forEach(n => { if (!n.classList.contains('preview') && !n.classList.contains('guida')) n.remove(); });
const sel = RS.scene.selection;
if (!sel.length) return;
const h = this.hs();
const trascina = !!(this._op && this._op.kind === 'move');
const multi = sel.length > 1;
sel.forEach(id => {
const el = RS.scene.get(id); if (!el) return;
if (['legend', 'measuretable', 'graphscale', 'raccordo'].includes(el.type)) {
const b = RS.elements.bounds(el);
if (b) rect(ov, b.x, b.y, b.w, b.h, 'ov-box');
return;
}
if (['skid', 'path', 'measure', 'arrow', 'roadway', 'zebrapath', 'angle', 'sketch'].includes(el.type)) {
const b = RS.elements.bounds(el);
if (b) rect(ov, b.x, b.y, b.w, b.h, 'ov-box');
if (!el.locked && !trascina && !multi) RS.elements.resolvePts(el).forEach((p, i) => {
const r = N('rect');
attr(r, { x: p.x - h, y: p.y - h, width: h*2, height: h*2, class: 'ov-vh', 'data-handle':'vtx','data-id':id,'data-i':i });
ov.appendChild(r);
});
return;
}
const ls = RS.elements.localSize(el);
const g = N('g');
g.setAttribute('transform', `translate(${el.x} ${el.y}) rotate(${el.rot || 0})`);
const pad = h * 0.6, hw = ls.w/2 + pad, hh = ls.h/2 + pad;
rect(g, -hw, -hh, hw*2, hh*2, 'ov-box');
if (!el.locked && !trascina && !multi) {
const curvabile = el.type === 'band' && RS.elements.CURVABILI && RS.elements.CURVABILI.has(el.sub);
const lati = ANCORATI.has(el.type) && el.type !== 'image'
? (el.type === 'stopline' || el.type === 'mark' || curvabile ? [[1, 0], [-1, 0]] : [[1, 0], [-1, 0], [0, 1], [0, -1]]) : [];
if (curvabile) {
const fa = RS.elements.arcoDi(el), sg = fa < 0 ? -1 : 1, cy = -fa / 2 - sg * (el.wid / 2 + pad);
const r = N('circle'); attr(r, { cx: 0, cy, r: h * 1.15, class: 'ov-arco', 'data-handle': 'arco', 'data-id': id });
const tt = N('title'); tt.textContent = 'Trascina per curvare (le estremità restano ferme); riportala in linea per raddrizzare'; r.appendChild(tt);
g.appendChild(r);
const v = N('circle'); attr(v, { cx: 0, cy, r: h * 0.5, class: 'ov-arcov' }); g.appendChild(v);
}
if (el.type !== 'incrocio' && el.type !== 'curva') [[-1,-1],[1,-1],[1,1],[-1,1]].concat(lati).forEach(([sx, sy]) => {
const cx = sx * hw, cy = sy * hh, lato = !sx || !sy;
const r = N('rect');
attr(r, { x: cx-h, y: cy-h, width: h*2, height: h*2, class: 'ov-h', 'data-handle':'res','data-id':id, 'data-sx': sx, 'data-sy': sy });
g.appendChild(r);
const v = N('rect');
attr(v, lato ? { x: cx-h*(sy ? 0.6 : 0.3), y: cy-h*(sx ? 0.6 : 0.3), width: h*(sy ? 1.2 : 0.6), height: h*(sx ? 1.2 : 0.6), rx: h*0.3, class: 'ov-hv ov-hv-lato' }
: { x: cx-h*0.45, y: cy-h*0.45, width: h*0.9, height: h*0.9, class: 'ov-hv' });
g.appendChild(v);
});
const ry = -hh - h*3.6;
const ln = N('line'); attr(ln, { x1:0, y1:-hh, x2:0, y2:ry, class:'ov-line' }); g.appendChild(ln);
const rc = N('circle'); attr(rc, { cx:0, cy:ry, r:h*1.4, class:'ov-rot', 'data-handle':'rot','data-id':id }); g.appendChild(rc);
const rv = N('circle'); attr(rv, { cx:0, cy:ry, r:h*0.62, class:'ov-rotv' }); g.appendChild(rv);
}
ov.appendChild(g);
if (!el.locked && !trascina && !multi && RS.incroci && RS.incroci.registro(el)) RS.incroci.estremi(el).forEach(p => {
const c = N('circle');
attr(c, { cx: p.x, cy: p.y, r: h * 1.9, class: 'ov-braccio', 'data-handle': 'braccio', 'data-id': id, 'data-i': p.i });
const tt = N('title'); tt.textContent = 'Braccio ' + (p.i + 1) + ': trascina per cambiare angolo e lunghezza'; c.appendChild(tt);
ov.appendChild(c);
const t = N('text');
attr(t, { x: p.x, y: p.y, 'font-size': h * 2.2, class: 'ov-braccio-n', 'text-anchor': 'middle', dy: '0.35em' });
t.textContent = p.i + 1; ov.appendChild(t);
});
if (!el.locked && !trascina && !multi && el.sym === 'caposaldo' && el.letter) {
const off = RS.elements.capLetterOffset(el);
const lc = N('circle');
attr(lc, { cx: el.x + off.lx, cy: el.y + off.ly - (el.size||0.5)*0.35, r: h*1.5,
class: 'ov-lbl', 'data-handle':'lbl', 'data-id':id });
const tt = N('title'); tt.textContent = 'Trascina per spostare la lettera'; lc.appendChild(tt);
ov.appendChild(lc);
}
});
if (multi && !trascina) {
const els = sel.map(id => RS.scene.get(id)).filter(Boolean);
if (els.every(e => e.locked)) return;
let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
els.forEach(e => { const b = RS.elements.bounds(e); if (b) { x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.w); y1 = Math.max(y1, b.y + b.h); } });
if (x0 > x1) return;
const pad = h * 1.2, cx = (x0 + x1) / 2, top = y0 - pad, ry = top - h * 3.6;
rect(ov, x0 - pad, top, x1 - x0 + pad * 2, y1 - y0 + pad * 2, 'ov-box ov-gruppo');
const ln = N('line'); attr(ln, { x1: cx, y1: top, x2: cx, y2: ry, class: 'ov-line' }); ov.appendChild(ln);
const rc = N('circle'); attr(rc, { cx, cy: ry, r: h * 1.6, class: 'ov-rot', 'data-handle': 'grot', 'data-id': sel[0] });
const tt = N('title'); tt.textContent = 'Trascina per ruotare tutti gli oggetti selezionati (Maiusc: passi di 15°)'; rc.appendChild(tt);
ov.appendChild(rc);
const rv = N('circle'); attr(rv, { cx, cy: ry, r: h * 0.75, class: 'ov-rotv' }); ov.appendChild(rv);
}
},
showRotBadge(el, testo) {
const S = RS.scene, ov = S.gOverlay;
ov.querySelectorAll('.rot-badge').forEach(n => n.remove());
const fs = Math.max(0.5, S.view.w * 0.03);
const t = N('text');
attr(t, { x: el.x, y: el.y - S.view.w * 0.035, 'font-size': fs, fill: '#fff', 'text-anchor': 'middle',
dy: '0.35em', 'paint-order': 'stroke', stroke: '#111', 'stroke-width': fs * 0.34,
'stroke-linejoin': 'round', 'font-weight': 700, class: 'rot-badge' });
t.textContent = testo || (Math.round(el.rot) % 360 + 360) % 360 + '°';
ov.appendChild(t);
},
hideRotBadge() { RS.scene.gOverlay.querySelectorAll('.rot-badge').forEach(n => n.remove()); }
};
function buildDragElement(op) {
const a = op.a, b = op.b;
const cx = (a.x + b.x)/2, cy = (a.y + b.y)/2;
const len = Math.hypot(b.x - a.x, b.y - a.y);
const rot = Math.atan2(b.y - a.y, b.x - a.x) * 180/Math.PI;
const def = op.def || {};
switch (op.tool) {
case 'road':
return Object.assign({ type: 'road', x: cx, y: cy, rot, len: Math.max(len, 1), wid: def.wid || 7, lanes: def.lanes || 2, color: def.color || '#9aa0a6' }, def.sez || {});
case 'band':
return { type: 'band', sub: def.sub, x: cx, y: cy, rot, len: Math.max(len, 1), wid: def.wid || 1.5, color: def.color };
case 'ramp':
return Object.assign({ type: 'ramp', x: cx, y: cy, rot, len: Math.max(len, 3), wid: def.wid || 3.5,
kind: def.kind || 'in', color: def.color || '#9aa0a6' }, def.ram != null ? { ram: def.ram, cus: def.cus, rac: def.rac } : {});
case 'mark':
return { type: 'mark', x: cx, y: cy, rot, len: Math.max(len, 1), style: def.style, color: def.color || '#ffffff' };
case 'crosswalk':
return { type: 'crosswalk', sub: def.sub || 'ped', x: cx, y: cy, rot, len: Math.max(len, 1), wid: def.sub === 'bike' ? 1.8 : 2.5, color: '#ffffff' };
case 'stopline':
return { type: 'stopline', x: cx, y: cy, rot, len: Math.max(len, 1), color: '#ffffff' };
case 'island': {
const w = Math.abs(b.x - a.x) || 3, hgt = Math.abs(b.y - a.y) || 2;
return { type: 'island', x: (a.x+b.x)/2, y: (a.y+b.y)/2, rot: 0, w, h: hgt, shape: def.shape || 'ovale', color: def.color || '#7fae6a' };
}
case 'parking': {
const w = Math.abs(b.x - a.x) || 5, hgt = Math.abs(b.y - a.y) || 2.5;
return { type: 'parking', x: (a.x+b.x)/2, y: (a.y+b.y)/2, rot: 0, w, h: hgt, angolo: def.angolo != null ? def.angolo : 90 };
}
case 'building': {
const w = Math.abs(b.x - a.x) || 2, hgt = Math.abs(b.y - a.y) || 2;
return { type: 'building', x: (a.x+b.x)/2, y: (a.y+b.y)/2, rot: 0, w, h: hgt, color: def.color || '#cfc3a8' };
}
case 'area': {
const w = Math.abs(b.x - a.x) || 4, hgt = Math.abs(b.y - a.y) || 3;
return { type: 'area', sub: def.sub, x: (a.x+b.x)/2, y: (a.y+b.y)/2, rot: 0, w, h: hgt, color: def.color, z: -5 };
}
case 'measure':
return { type: 'measure', pts: [mkPt(a), mkPt(b)], color: def.color || '#c0392b' };
case 'arrow':
return { type: 'arrow', pts: [mkPt(a), mkPt(b)], color: def.color || '#222' };
}
return null;
}
function polyElement(pl, pts) {
const def = pl.def || {};
const P = pts.map(copyPt);
if (pl.tool === 'angle')
return { type: 'angle', pts: P, color: def.color || '#7a3a9a' };
if (pl.tool === 'roadpath')
return { type: 'roadway', pts: P, width: def.wid || 7, color: def.color || '#9aa0a6' };
if (pl.tool === 'zebrapath')
return { type: 'zebrapath', pts: P, width: def.wid || 3, color: def.color || '#9aa0a6', z: -4 };
if (pl.tool === 'path')
return { type: 'path', pts: P, width: def.width || 0.1, color: def.color || '#2f6fed', dashed: true, arrow: true };
const sk = { type: 'skid', pts: P, width: def.width || 0.16, color: def.color || '#202020', dashed: !!def.dashed };
if (def.stile) { sk.stile = def.stile; sk.note = def.nota || ''; }
return sk;
}
function snapshotEl(el) { return JSON.parse(JSON.stringify(el)); }
function seguaci(orig) {
const S = RS.scene, ids = new Set(orig.map(o => o.id)), out = [];
orig.forEach(o => {
if (o.type !== 'vehicle') return;
S.elements.forEach(e => {
if (ids.has(e.id) || e.locked) return;
const capi = e.type === 'skid' && e.pts && e.pts.length > 1 ? [e.pts[0], e.pts[e.pts.length - 1]] : [];
if (e.diVeicolo === o.id || capi.some(p => Math.hypot(p.x - o.x, p.y - o.y) < 0.4)) { ids.add(e.id); out.push(snapshotEl(e)); }
});
});
return out;
}
function toLocal(w, cx, cy, rotDeg) {
const r = -rotDeg * Math.PI/180, c = Math.cos(r), s = Math.sin(r);
const dx = w.x - cx, dy = w.y - cy;
return { x: dx*c - dy*s, y: dx*s + dy*c };
}
const ANCORATI = new Set(['road', 'crosswalk', 'band', 'ramp', 'building', 'island', 'parking', 'area', 'stopline', 'mark', 'image']);
function applySize(el, nw, nh, lock) {
if (el.type === 'vehicle') { el.len = nw; el.wid = nh; }
else if (el.type === 'image') { el.w = nw; el.h = nh; }
else if (el.type === 'band' && RS.elements.arcoDi(el)) { el.len = nw; el.wid = Math.max(0.05, nh - Math.abs(RS.elements.arcoDi(el))); }
else if (el.type === 'road' || el.type === 'crosswalk' || el.type === 'band' || el.type === 'ramp') { el.len = nw; el.wid = nh;
if (el.type === 'road') RS.elements.aggiornaSezione(el, 'wid'); }
else if (el.type === 'stopline' || el.type === 'mark') { el.len = nw; }
else if (el.type === 'building' || el.type === 'island' || el.type === 'parking' || el.type === 'area') { el.w = nw; el.h = nh; }
else if (el.type === 'roundabout' || el.type === 'north') { el.size = Math.max(nw, nh); }
else if (el.type === 'text') { el.size = nh; }
else { el.size = Math.max(nw, nh); }
}
function rect(parent, x, y, w, h, cls) {
const r = N('rect'); attr(r, { x, y, width: w, height: h, class: cls }); parent.appendChild(r); return r;
}
function attr(n, o) { for (const k in o) n.setAttribute(k, o[k]); }
function chipOv(ov, x, y, testo, fondo, cls, centrata) {
const ppm = RS.scene.pxPerMeter(), fs = 12 / ppm, pad = 5 / ppm;
const t = N('text');
attr(t, { x, y, class: cls, 'font-size': fs, fill: '#fff', 'font-family': 'Arial, Helvetica, sans-serif', 'font-weight': 700, 'text-anchor': centrata ? 'middle' : 'start', dy: '0.35em' });
t.textContent = testo; ov.appendChild(t);
try {
const bb = t.getBBox(), r = N('rect');
attr(r, { x: bb.x - pad, y: bb.y - pad * 0.6, width: bb.width + pad * 2, height: bb.height + pad * 1.2, rx: 3 / ppm, class: cls, fill: fondo });
ov.insertBefore(r, t);
} catch (e) {}
}
function nomeAggancio(e, i, n) {
if (e.type === 'vehicle') return i === n - 1 ? 'centro del veicolo ' + (e.label || '') : 'spigolo ' + (i + 1) + ' del veicolo ' + (e.label || '');
if (e.type === 'road') return i < 2 ? 'estremità dell\'asse della strada' : i === 2 ? 'centro della strada' : 'spigolo della carreggiata';
if (e.type === 'symbol') return e.letter ? 'caposaldo ' + e.letter : (e.nome || 'simbolo');
if (e.type === 'measure') return 'estremo della quota';
if (e.type === 'skid') return 'punto della traccia';
if (e.type === 'roadway') return 'vertice della carreggiata';
if (e.type === 'surveypt') return 'punto di rilievo ' + (e.n || '');
if (e.pts) return 'vertice';
return 'centro dell\'oggetto';
}
function mkPt(sp) {
const p = { x: sp.x, y: sp.y };
if (sp && sp.anchor && sp.anchor.id != null) { p.aid = sp.anchor.id; p.alx = sp.anchor.lx; p.aly = sp.anchor.ly; }
return p;
}
function copyPt(p) {
const q = { x: p.x, y: p.y };
if (p.aid != null) { q.aid = p.aid; q.alx = p.alx; q.aly = p.aly; }
return q;
}
function rectFromPts(x1, y1, x2, y2) {
return { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1) };
}
function bbOverlap(a, r) {
return a.x < r.x + r.w && a.x + a.w > r.x && a.y < r.y + r.h && a.y + a.h > r.y;
}
function nextVehicleLabel() {
const used = RS.scene.elements.filter(e => e.type === 'vehicle' && e.label).map(e => e.label);
let i = 0; while (used.indexOf(letterLabel(i)) >= 0) i++; return letterLabel(i);
}
function letterLabel(i) {
let s = ''; i++;
while (i > 0) { i--; s = String.fromCharCode(65 + (i % 26)) + s; i = Math.floor(i / 26); }
return s;
}
function nextCaposaldoLetter() {
const used = RS.scene.elements.filter(e => e.letter).map(e => e.letter);
for (let i = 0; i < 26; i++) { const L = String.fromCharCode(65+i); if (!used.includes(L)) return L; }
return 'A';
}
tools.nextVehicleLabel = nextVehicleLabel;
RS.tools = tools;
})(window.RS = window.RS || {});

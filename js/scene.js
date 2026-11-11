(function (RS) {
'use strict';
const SVGNS = 'http://www.w3.org/2000/svg';
const el = (id) => document.getElementById(id);
function clona(v) {
if (v === null || typeof v !== 'object') return v;
if (Array.isArray(v)) return v.map(clona);
const o = {};
for (const k in v) if (Object.prototype.hasOwnProperty.call(v, k) && v[k] !== undefined) o[k] = clona(v[k]);
return o;
}
const scene = {
svg: null, defs: null, defsDyn: null, gGrid: null, gElements: null, gOverlay: null,
meta: {},
misure: [],
printOpts: {},
world: { w: 60, h: 45 },
mostraFoglio: (() => { try { return localStorage.getItem('rilsin:foglio') !== '0'; } catch (e) { return true; } })(),
view: { x: -2, y: -2, w: 64, h: 48 },
scaleDenom: 100,
fuoriScala: false,
grid: { step: 1, show: true, snap: true },
guides: { v: [], h: [] },
elements: [],
selection: [],
seq: 1,
listeners: {},
_hist: [], _hpos: -1,
init() {
this.fascicolo = RS.fascicolo ? RS.fascicolo.vuoto() : { photos: [] };
this.svg = el('canvas');
this.defs = el('defs');
this.defsDyn = el('defsDyn');
this.gGrid = el('gGrid');
this.gElements = el('gElements');
this.gGuides = el('gGuides');
this.gOverlay = el('gOverlay');
this.applyMetaDefaults();
this._applyView();
this._buildDefs();
this.drawGrid();
this.snapshot(true);
window.addEventListener('resize', () => this.emit('view'));
},
on(name, fn) { (this.listeners[name] = this.listeners[name] || []).push(fn); },
emit(name, data) { (this.listeners[name] || []).forEach(f => f(data)); },
pxPerMeter() {
const m = this.svg.getScreenCTM();
return (m && m.a) ? m.a : (this.svg.clientWidth / this.view.w);
},
toWorld(clientX, clientY) {
const pt = this.svg.createSVGPoint();
pt.x = clientX; pt.y = clientY;
const p = pt.matrixTransform(this.svg.getScreenCTM().inverse());
return { x: p.x, y: p.y };
},
snap(p) {
let x = p.x, y = p.y;
if (this.grid.snap) { const s = this.grid.step; x = Math.round(x / s) * s; y = Math.round(y / s) * s; }
const g = this._snapGuide(p.x, 'v'); if (g != null) x = g;
const h = this._snapGuide(p.y, 'h'); if (h != null) y = h;
return { x, y };
},
snapVal(v) {
if (!this.grid.snap) return v;
const s = this.grid.step; return Math.round(v / s) * s;
},
_snapGuide(v, axis) {
const arr = this.guides && this.guides[axis]; if (!arr || !arr.length) return null;
const tol = 10 / (this.pxPerMeter() || 20);
let best = null, bd = tol;
arr.forEach(gv => { const d = Math.abs(gv - v); if (d <= bd) { bd = d; best = gv; } });
return best;
},
_applyView() {
const v = this.view;
if (![v.x, v.y, v.w, v.h].every(isFinite) || v.w <= 0 || v.h <= 0) {
if (this._vistaBuona) Object.assign(v, this._vistaBuona);
else return;
}
this._vistaBuona = { x: v.x, y: v.y, w: v.w, h: v.h };
this.svg.setAttribute('viewBox', `${v.x} ${v.y} ${v.w} ${v.h}`);
this.svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
this.drawGrid(); this.drawFoglio();
this.emit('view');
},
panBy(dxMeters, dyMeters) {
this.view.x -= dxMeters; this.view.y -= dyMeters; this._applyView();
},
zoomAt(clientX, clientY, factor) {
const before = this.toWorld(clientX, clientY);
this.view.w *= factor; this.view.h *= factor;
this.view.w = Math.min(Math.max(this.view.w, 3), 600);
this.view.h = this.view.w * (this.svg.clientHeight / this.svg.clientWidth || 0.75);
this._applyView();
const after = this.toWorld(clientX, clientY);
this.view.x += before.x - after.x;
this.view.y += before.y - after.y;
this._applyView();
},
zoomStep(f) {
const cx = this.view.x + this.view.w / 2, cy = this.view.y + this.view.h / 2;
let nw = Math.min(Math.max(this.view.w * f, 3), 600);
const nh = nw * (this.svg.clientHeight / this.svg.clientWidth || 0.75);
this.animateView({ x: cx - nw / 2, y: cy - nh / 2, w: nw, h: nh }, 180);
},
animateView(target, ms) {
if (this._animRaf) cancelAnimationFrame(this._animRaf);
if (typeof document !== 'undefined' && document.hidden) { this.view = target; this._applyView(); return; }
const from = { x: this.view.x, y: this.view.y, w: this.view.w, h: this.view.h };
const t0 = (performance || Date).now(); ms = ms || 260;
const ease = t => 1 - Math.pow(1 - t, 3);
const step = () => {
const k = Math.min(1, ((performance || Date).now() - t0) / ms), e = ease(k);
this.view = {
x: from.x + (target.x - from.x) * e, y: from.y + (target.y - from.y) * e,
w: from.w + (target.w - from.w) * e, h: from.h + (target.h - from.h) * e
};
this._applyView();
if (k < 1) this._animRaf = requestAnimationFrame(step); else this._animRaf = null;
};
this._animRaf = requestAnimationFrame(step);
},
fit(animate) {
let b = this.contentBounds();
if (!b) b = { x: 0, y: 0, w: this.world.w, h: this.world.h };
this.focusRect(b, 3, animate);
},
focusRect(b, pad, animate) {
pad = pad != null ? pad : Math.max(b.w, b.h) * 0.7 + 2;
const cw = this.svg.clientWidth, ch = this.svg.clientHeight;
const aspect = ch / cw;
let w = b.w + pad * 2, h = b.h + pad * 2;
if (h / w < aspect) h = w * aspect; else w = h / aspect;
const target = { x: b.x - (w - b.w) / 2, y: b.y - (h - b.h) / 2, w, h };
if (animate) this.animateView(target);
else { this.view = target; this._applyView(); }
},
boundsDisegno() {
const els = this.elements.filter(e => e.type !== 'image');
if (!els.length) return this.contentBounds();
let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
els.forEach(e => {
const bb = RS.elements.bounds(e); if (!bb) return;
minX = Math.min(minX, bb.x); minY = Math.min(minY, bb.y);
maxX = Math.max(maxX, bb.x + bb.w); maxY = Math.max(maxY, bb.y + bb.h);
});
return minX > maxX ? this.contentBounds() : { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
},
contentBounds() {
if (!this.elements.length) return null;
let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
this.elements.forEach(e => {
const bb = RS.elements.bounds(e);
if (!bb) return;
minX = Math.min(minX, bb.x); minY = Math.min(minY, bb.y);
maxX = Math.max(maxX, bb.x + bb.w); maxY = Math.max(maxY, bb.y + bb.h);
});
if (minX > maxX) return null;
return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
},
foglio() {
if (this._foglio !== undefined) return this._foglio;
const b = this.boundsDisegno();
if (!b || this.fuoriScala || !RS.exportUtil || !RS.exportUtil.pianoTavola) return (this._foglio = null);
const T = RS.exportUtil.pianoTavola();
const pw = T.Aw * T.denom / 1000, ph = T.Ah * T.denom / 1000, cx = b.x + b.w / 2, cy = b.y + b.h / 2;
return (this._foglio = { x: cx - pw / 2, y: cy - ph / 2, w: pw, h: ph, denom: T.denom, landscape: T.landscape, adattata: T.adattata, tagliata: T.tagliata });
},
drawGrid() {
const g = this.gGrid; if (!g) return;
if (this._gridRaf) return;
const fai = () => {
if (this._gridRaf) { cancelAnimationFrame(this._gridRaf.f); clearTimeout(this._gridRaf.t); }
this._gridRaf = null;
g.innerHTML = '';
const v = this.view, ppm = this.pxPerMeter() || 20, F = this.foglio();
const x0 = v.x - v.w, x1 = v.x + v.w * 2, y0 = v.y - v.h, y1 = v.y + v.h * 2;
const mk = (d, attrs) => { const p = document.createElementNS(SVGNS, 'path'); p.setAttribute('d', d); for (const k in attrs) p.setAttribute(k, attrs[k]); g.appendChild(p); return p; };
if (F && this.mostraFoglio) mk(`M${x0} ${y0}H${x1}V${y1}H${x0}Z M${F.x} ${F.y}V${F.y + F.h}H${F.x + F.w}V${F.y}Z`, { fill: '#1b2430', 'fill-opacity': 0.06, 'fill-rule': 'evenodd' });
if (!this.grid.show) return;
const passi = [this.grid.step, 1, 5, 25, 100].filter((s, i, a) => s >= this.grid.step && a.indexOf(s) === i).sort((a, b) => a - b);
const minore = passi.find(s => s * ppm >= 8) || passi[passi.length - 1];
const maggiore = minore < 5 ? 5 : minore * 5;
const righe = (s) => {
let d = '';
for (let x = Math.ceil(x0 / s) * s; x <= x1; x += s) d += `M${+x.toFixed(3)} ${y0}V${y1}`;
for (let y = Math.ceil(y0 / s) * s; y <= y1; y += s) d += `M${x0} ${+y.toFixed(3)}H${x1}`;
return d;
};
if (minore * ppm >= 8 && minore !== maggiore) mk(righe(minore), { fill: 'none', stroke: '#dde1e6', 'stroke-width': 1, 'vector-effect': 'non-scaling-stroke' });
mk(righe(maggiore), { fill: 'none', stroke: '#c5cbd3', 'stroke-width': 1, 'vector-effect': 'non-scaling-stroke' });
};
if (typeof requestAnimationFrame === 'undefined' || (typeof document !== 'undefined' && document.hidden)) fai();
else this._gridRaf = { f: requestAnimationFrame(fai), t: setTimeout(fai, 120) };
},
drawFoglio() {
const g = el('gFoglio'); if (!g) return;
g.innerHTML = '';
if (!this.mostraFoglio) return;
const F = this.foglio(); if (!F) return;
const r = document.createElementNS(SVGNS, 'rect');
[['x', F.x], ['y', F.y], ['width', F.w], ['height', F.h], ['fill', 'none'], ['stroke', '#5b6573'], ['stroke-width', 1.2],
['stroke-dasharray', '7 5'], ['vector-effect', 'non-scaling-stroke']].forEach(a => r.setAttribute(a[0], a[1]));
g.appendChild(r);
},
_buildDefs() {
this.defs.innerHTML =
'<marker id="arw" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto" markerUnits="strokeWidth">' +
'<path d="M0,0 L6,3 L0,6 L1.6,3 Z" fill="context-stroke"/></marker>' +
'<marker id="arwHead" markerWidth="5" markerHeight="5" refX="4.2" refY="2.5" orient="auto" markerUnits="strokeWidth">' +
'<path d="M0,0 L5,2.5 L0,5 Z" fill="currentColor"/></marker>' +
'<marker id="tick" markerWidth="4" markerHeight="6" refX="2" refY="3" orient="auto" markerUnits="strokeWidth">' +
'<path d="M2,0 L2,6" stroke="currentColor" stroke-width="1"/></marker>' +
'<pattern id="patGhiaia" width="0.5" height="0.5" patternUnits="userSpaceOnUse">' +
'<rect width="0.5" height="0.5" fill="#d8cba6"/>' +
'<circle cx="0.12" cy="0.13" r="0.05" fill="#b3a375"/>' +
'<circle cx="0.36" cy="0.34" r="0.045" fill="#b3a375"/></pattern>' +
'<pattern id="patEdificio" width="0.7" height="0.7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">' +
'<rect width="0.07" height="0.7" fill="#5a4d36" opacity="0.55"/></pattern>' +
'<pattern id="patZebra" width="0.8" height="0.8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">' +
'<rect width="0.28" height="0.8" fill="#ffffff"/></pattern>' +
'<pattern id="patAsfalto" width="0.6" height="0.6" patternUnits="userSpaceOnUse">' +
'<circle cx="0.14" cy="0.17" r="0.03" fill="#000" opacity="0.06"/>' +
'<circle cx="0.42" cy="0.38" r="0.028" fill="#000" opacity="0.05"/>' +
'<circle cx="0.30" cy="0.09" r="0.022" fill="#fff" opacity="0.05"/>' +
'<circle cx="0.52" cy="0.52" r="0.024" fill="#fff" opacity="0.045"/></pattern>' +
'<filter id="fltAttenua" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values="0"/>' +
'<feComponentTransfer><feFuncR type="linear" slope="0.55" intercept="0.42"/><feFuncG type="linear" slope="0.55" intercept="0.42"/>' +
'<feFuncB type="linear" slope="0.55" intercept="0.42"/></feComponentTransfer></filter>' +
'<filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">' +
'<feDropShadow dx="0.12" dy="0.16" stdDeviation="0.14" flood-color="#000" flood-opacity="0.32"/></filter>' +
'<filter id="sheetShadow" x="-8%" y="-8%" width="116%" height="116%">' +
'<feDropShadow dx="0" dy="0.5" stdDeviation="0.7" flood-color="#000" flood-opacity="0.45"/></filter>' +
'<pattern id="patDanni" width="0.22" height="0.22" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">' +
'<rect width="0.22" height="0.22" fill="rgba(255,255,255,.55)"/><rect width="0.08" height="0.22" fill="#8a0000"/></pattern>' +
'<pattern id="patDanniBN" width="0.14" height="0.14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">' +
'<rect width="0.14" height="0.14" fill="#ffffff"/><rect width="0.045" height="0.14" fill="#000000"/><rect width="0.14" height="0.045" fill="#000000"/></pattern>' +
RS.BN_TRAME.map((t, i) => `<pattern id="patBN${i}" width="${t.w}" height="${t.w}" patternUnits="userSpaceOnUse"${t.rot != null ? ` patternTransform="rotate(${t.rot})"` : ''}>${t.svg}</pattern>`).join('');
},
add(elem, record = true) {
if (this.elements.indexOf(elem) >= 0) return elem;
if (!elem.id || this.get(elem.id)) {
do { elem.id = 'e' + (this.seq++); } while (this.get(elem.id));
}
elem.z = elem.z != null ? elem.z : this.elements.length;
this.elements.push(elem);
this.render();
if (record) this.snapshot();
this.emit('change');
return elem;
},
get(id) { return this.elements.find(e => e.id === id); },
remove(ids) {
const set = new Set([].concat(ids));
this.elements = this.elements.filter(e => !set.has(e.id));
this.selection = this.selection.filter(id => !set.has(id));
this.render(); this.snapshot(); this.emit('change'); this.emit('select');
},
update(id, patch, record) {
const e = this.get(id); if (!e) return;
Object.assign(e, patch);
this.render();
if (record) this.snapshot();
this.emit('change');
},
moveZ(id, dir) {
const e = this.get(id); if (!e) return;
this.elements.sort((a, b) => a.z - b.z);
const i = this.elements.indexOf(e);
const j = dir > 0 ? Math.min(i + 1, this.elements.length - 1) : Math.max(i - 1, 0);
if (i === j) return;
this.elements.splice(i, 1); this.elements.splice(j, 0, e);
this.elements.forEach((x, k) => x.z = k);
this.render(); this.snapshot(); this.emit('change');
},
select(ids, additive) {
ids = ids == null ? [] : [].concat(ids);
this.selection = additive ? Array.from(new Set(this.selection.concat(ids))) : ids;
this.emit('select');
this.drawOverlay();
},
isSelected(id) { return this.selection.indexOf(id) >= 0; },
render(silenzioso) {
if (RS.incroci) RS.incroci.aggiorna(this);
this.elements.sort((a, b) => a.z - b.z);
this.buildRoadMasks();
const g = this.gElements; g.innerHTML = '';
const frag = document.createDocumentFragment();
this.elements.forEach(e => {
if (RS.layers && !RS.layers.visible(e)) return;
const node = RS.elements.render(e);
if (node) { node.dataset.id = e.id; frag.appendChild(node); }
});
g.appendChild(frag);
RS.elements.separaEtichette(g);
this._foglio = undefined; this.drawGrid(); this.drawFoglio();
this.drawOverlay();
if (silenzioso !== true) this.emit('change');
},
buildRoadMasks() {
const dyn = this.defsDyn; if (!dyn) return;
dyn.innerHTML = '';
const contrib = this.elements.filter(e => e.type === 'road' || e.type === 'roadway' || e.type === 'roundabout' || e.type === 'raccordo' || e.type === 'curva' || e.type === 'nucleo');
const targets = this.elements.filter(e => e.type === 'road' || e.type === 'roadway' || e.type === 'curva');
targets.forEach(e => {
const marc = e.type === 'road' ? Math.max(0, +e.marc || 0) : e.type === 'curva' ? Math.max(0, +(e.sez && e.sez.marc) || 0) : 0;
const pad = 2 + marc;
const b0 = RS.elements.bounds(e); if (!b0) return;
const b = { x: b0.x - marc, y: b0.y - marc, w: b0.w + marc*2, h: b0.h + marc*2 };
const others = contrib.filter(o => o !== e && overlap(b, RS.elements.bounds(o)));
const mask = document.createElementNS(SVGNS, 'mask');
mask.id = 'rm_' + e.id;
mask.setAttribute('maskUnits', 'userSpaceOnUse');
let pre = '', rx, ry, rw, rh;
if (e.type === 'road') {
pre = `rotate(${-(e.rot||0)}) translate(${-e.x} ${-e.y})`;
rx = -(e.len/2 + pad); ry = -(e.wid/2 + pad); rw = e.len + pad*2; rh = e.wid + pad*2;
} else if (e.type === 'curva') {
const d = RS.curve ? RS.curve.dim(e) : { w: 10, h: 10 };
pre = `rotate(${-(e.rot||0)}) translate(${-e.x} ${-e.y})`;
rx = -(d.w/2 + pad); ry = -(d.h/2 + pad); rw = d.w + pad*2; rh = d.h + pad*2;
} else {
rx = b.x - pad; ry = b.y - pad; rw = b.w + pad*2; rh = b.h + pad*2;
}
mask.setAttribute('x', rx); mask.setAttribute('y', ry);
mask.setAttribute('width', rw); mask.setAttribute('height', rh);
const wr = document.createElementNS(SVGNS, 'rect');
wr.setAttribute('x', rx); wr.setAttribute('y', ry);
wr.setAttribute('width', rw); wr.setAttribute('height', rh);
wr.setAttribute('fill', '#fff');
mask.appendChild(wr);
const fino = o => { const c = mezzoPiano(e, o); return s => { if (!s || !c) return s; const g = document.createElementNS(SVGNS, 'g'); g.setAttribute('clip-path', `url(#${c})`); g.appendChild(s); return g; }; };
others.forEach(o => { const s = fino(o)(RS.elements.roadMaskShape(o, pre)); if (s) mask.appendChild(s); });
dyn.appendChild(mask);
if (marc > 0) {
const mm = mask.cloneNode(false); mm.id = 'rms_' + e.id;
mm.appendChild(wr.cloneNode(false));
others.forEach(o => { const s = fino(o)(RS.elements.roadMaskShape(o, pre, true)); if (s) mm.appendChild(s); });
dyn.appendChild(mm);
}
});
function mezzoPiano(e, o) {
if (e.type !== 'road' && e.type !== 'roadway') return null;
if (e.inc && o.inc) return null;
let capi;
if (o.type === 'road') {
const r = (o.rot || 0) * Math.PI / 180, c = Math.cos(r) * o.len / 2, s = Math.sin(r) * o.len / 2;
const A = { x: o.x - c, y: o.y - s }, B = { x: o.x + c, y: o.y + s }; capi = [[A, B], [B, A]];
} else if (o.type === 'roadway' && o.pts && o.pts.length > 1) {
const p = o.pts; capi = [[p[0], p[p.length - 1]], [p[p.length - 1], p[0]]];
} else return null;
let rel;
if (e.type === 'road') {
const R = -(e.rot || 0) * Math.PI / 180, cs = Math.cos(R), sn = Math.sin(R);
rel = w => { const dx = w.x - e.x, dy = w.y - e.y, lx = dx * cs - dy * sn, ly = dx * sn + dy * cs; return { d: ly, dentro: Math.abs(ly) < e.wid / 2 + 0.6 && Math.abs(lx) < e.len / 2 + 0.6 }; };
} else {
const h = (e.width || 7) / 2;
rel = w => {
let best = null;
for (let i = 1; i < e.pts.length; i++) {
const a = e.pts[i - 1], b = e.pts[i], dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1, t = Math.max(0, Math.min(1, ((w.x - a.x) * dx + (w.y - a.y) * dy) / (l * l)));
const v = Math.hypot(w.x - a.x - dx * t, w.y - a.y - dy * t);
if (!best || v < best.v) best = { v, a, b, d: ((w.y - a.y) * dx - (w.x - a.x) * dy) / l };
}
return { d: best.d, dentro: best.v < h + 0.6, seg: best };
};
}
const r0 = rel(capi[0][0]), r1 = rel(capi[1][0]);
if (r0.dentro === r1.dentro) return null;
const [P, Q] = r0.dentro ? capi[0] : capi[1], rp = r0.dentro ? r0 : r1, rq = rel(Q);
if (rq.dentro || Math.abs(rq.d) < 0.5) return null;
const lato = rq.d > 0 ? 1 : -1, BIG = 2000, id = 'rc_' + e.id + '_' + o.id;
const cp = document.createElementNS(SVGNS, 'clipPath'); cp.id = id; cp.setAttribute('clipPathUnits', 'userSpaceOnUse');
if (e.type === 'road') {
const rc = document.createElementNS(SVGNS, 'rect');
rc.setAttribute('x', -BIG); rc.setAttribute('width', 2 * BIG); rc.setAttribute('y', lato > 0 ? 0 : -BIG); rc.setAttribute('height', BIG);
cp.appendChild(rc);
} else {
const s = rp.seg, l = Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y) || 1, ux = (s.b.x - s.a.x) / l, uy = (s.b.y - s.a.y) / l, nx = -uy * lato, ny = ux * lato;
const p1 = { x: s.a.x - ux * BIG, y: s.a.y - uy * BIG }, p2 = { x: s.b.x + ux * BIG, y: s.b.y + uy * BIG };
const pg = document.createElementNS(SVGNS, 'polygon');
pg.setAttribute('points', [p1, p2, { x: p2.x + nx * BIG, y: p2.y + ny * BIG }, { x: p1.x + nx * BIG, y: p1.y + ny * BIG }].map(q => q.x.toFixed(2) + ',' + q.y.toFixed(2)).join(' '));
cp.appendChild(pg);
}
dyn.appendChild(cp);
return id;
}
function overlap(a, c) {
if (!a || !c) return false;
const t = 0.5;
return a.x < c.x + c.w + t && a.x + a.w > c.x - t && a.y < c.y + c.h + t && a.y + a.h > c.y - t;
}
},
drawOverlay() { if (RS.tools && RS.tools.drawSelection) RS.tools.drawSelection(); },
serializeElements() { return clona(this.elements); },
snapshot(initial) {
const snap = this.serializeElements();
if (!initial) { this._hist = this._hist.slice(0, this._hpos + 1); }
this._hist.push(snap); this._hpos = this._hist.length - 1;
if (this._hist.length > 80) { this._hist.shift(); this._hpos--; }
},
undo() {
if (this._hpos <= 0) return;
this._hpos--; this.elements = clona(this._hist[this._hpos]);
this.selection = []; this.render(); this.emit('change'); this.emit('select');
},
redo() {
if (this._hpos >= this._hist.length - 1) return;
this._hpos++; this.elements = clona(this._hist[this._hpos]);
this.selection = []; this.render(); this.emit('change'); this.emit('select');
},
printOptions() {
let bn = false, scalaFissa = false;
try { bn = localStorage.getItem('rilsin:stampaBn') === '1'; scalaFissa = localStorage.getItem('rilsin:scalaFissa') === '1'; } catch (e) {}
return Object.assign({
titolo: '', orient: 'auto', comando: true, stazione: true, numero: true, data: true,
operatore: true, condizioni: false, coordinate: true, scala: true, nord: true, logo: true, bozza: false, bn, simboli: true, scalaFissa
}, this.printOpts || {});
},
applyMetaDefaults() {
this.meta = this.meta || {};
if (this.meta.comando == null) this.meta.comando = '';
if (this.meta.stazione == null) this.meta.stazione = '';
},
toJSON() {
return {
app: 'RILSIN', version: 1,
world: this.world, scaleDenom: this.scaleDenom, fuoriScala: this.fuoriScala,
grid: this.grid, guides: this.guides, layers: this.layers, meta: this.meta, misure: this.misure, printOpts: this.printOpts, elements: this.elements, seq: this.seq,
fascicolo: RS.fascicolo ? RS.fascicolo.perSalvare() : this.fascicolo,
calcoli: this.calcoli || null,
savedAt: new Date().toISOString()
};
},
load(doc) {
if (RS.storage && RS.storage.pulisciDati) RS.storage.pulisciDati(doc);
this.world = doc.world || this.world;
this.scaleDenom = doc.scaleDenom || 100;
this.fuoriScala = !!doc.fuoriScala;
this.grid = Object.assign({ step: 1, show: true, snap: true }, doc.grid || {});
this.guides = Object.assign({ v: [], h: [] }, doc.guides || {});
this.layers = Object.assign({}, doc.layers || {});
this.meta = doc.meta || {};
this.misure = doc.misure || [];
this.printOpts = doc.printOpts || {};
this.applyMetaDefaults();
this.elements = doc.elements || [];
let max = 0;
this.elements.forEach(e => { const m = /^e(\d+)$/.exec((e && e.id) || ''); if (m) max = Math.max(max, +m[1]); });
this.seq = Math.max(+doc.seq || 0, max + 1, this.elements.length + 1);
const visti = new Set();
this.elements.forEach(e => { if (!e) return; if (!e.id || visti.has(e.id)) e.id = 'e' + (this.seq++); visti.add(e.id); });
this.elements = this.elements.filter(Boolean);
this.fascicolo = RS.fascicolo ? RS.fascicolo.daDocumento(doc.fascicolo) : (doc.fascicolo || { photos: [] });
this.calcoli = doc.calcoli && typeof doc.calcoli === 'object' ? doc.calcoli : null;
this.selection = [];
this._hist = []; this._hpos = -1;
this.drawGrid(); this.fit(); this.render(); this.snapshot(true);
this.emit('change'); this.emit('select'); this.emit('view');
},
clear() {
this.elements = []; this.selection = []; this.seq = 1; this.misure = []; this.guides = { v: [], h: [] };
this.fascicolo = RS.fascicolo ? RS.fascicolo.vuoto() : { photos: [] };
this.calcoli = null;
this._hist = []; this._hpos = -1;
this.render(); this.snapshot(true); this.emit('change'); this.emit('select');
},
helper: { SVGNS }
};
RS.scene = scene;
RS.svgNode = (name) => document.createElementNS(SVGNS, name);
})(window.RS = window.RS || {});

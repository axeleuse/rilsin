(function (RS) {
'use strict';
const SVGNS = 'http://www.w3.org/2000/svg';
const el = (id) => document.getElementById(id);
const rulers = {
enabled: false,
_drag: null,
init() {
this.cTop = el('rulerTop');
this.cLeft = el('rulerLeft');
this.corner = el('rulerCorner');
if (!this.cTop) return;
this.cTop.addEventListener('pointerdown', e => this._startNew(e, 'v'));
this.cLeft.addEventListener('pointerdown', e => this._startNew(e, 'h'));
window.addEventListener('pointermove', e => this._move(e));
window.addEventListener('pointerup', () => this._end());
this.corner.addEventListener('click', () => this.clearGuides());
window.addEventListener('keydown', e => {
if (e.key === 'Escape' && this.enabled) this.toggle(document.querySelector('[data-act="righelli"]'));
});
RS.scene.on('view', () => { this.drawTicks(); this.drawGuides(); });
RS.scene.on('change', () => this.drawGuides());
window.addEventListener('resize', () => { this.drawTicks(); this.drawGuides(); });
},
toggle(btn) {
this.enabled = !this.enabled;
if (btn) btn.classList.toggle('on', this.enabled);
[this.cTop, this.cLeft, this.corner].forEach(n => { if (n) n.hidden = !this.enabled; });
document.getElementById('stage').classList.toggle('has-rulers', this.enabled);
if (this.enabled) { this.drawTicks(); this.drawGuides(); }
else { RS.scene.gGuides.innerHTML = ''; }
RS.ui && RS.ui.toast && RS.ui.toast(this.enabled ? 'Righelli attivi — trascina dal righello per creare una guida' : 'Righelli nascosti');
},
_rect() { return RS.scene.svg.getBoundingClientRect(); },
xToPx(worldX) { const r = this._rect(), v = RS.scene.view; return (worldX - v.x) / v.w * r.width; },
yToPx(worldY) { const r = this._rect(), v = RS.scene.view; return (worldY - v.y) / v.h * r.height; },
pxToX(clientX) { const r = this._rect(), v = RS.scene.view; return v.x + (clientX - r.left) / r.width * v.w; },
pxToY(clientY) { const r = this._rect(), v = RS.scene.view; return v.y + (clientY - r.top) / r.height * v.h; },
_niceStep(mPerPx) {
const target = 70 * mPerPx;
const steps = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500];
for (const s of steps) if (s >= target) return s;
return 1000;
},
drawTicks() {
if (!this.enabled) return;
const r = this._rect(), v = RS.scene.view;
const dpr = window.devicePixelRatio || 1;
const mPerPx = v.w / r.width;
const step = this._niceStep(mPerPx);
const css = getComputedStyle(document.documentElement);
const ink = (css.getPropertyValue('--rul-ink') || '#9aa4b2').trim();
const bg = (css.getPropertyValue('--rul-bg') || '#0b0f14').trim();
const wpx = r.width, hpx = 22;
this.cTop.width = wpx * dpr; this.cTop.height = hpx * dpr;
this.cTop.style.width = wpx + 'px'; this.cTop.style.height = hpx + 'px';
let c = this.cTop.getContext('2d'); c.scale(dpr, dpr);
c.fillStyle = bg; c.fillRect(0, 0, wpx, hpx);
c.fillStyle = ink; c.strokeStyle = ink; c.font = '9px system-ui,sans-serif'; c.textBaseline = 'alphabetic';
const x0 = Math.floor(v.x / step) * step, x1 = v.x + v.w;
for (let mx = x0; mx <= x1; mx += step) {
const px = this.xToPx(mx);
if (px < 0 || px > wpx) continue;
c.beginPath(); c.moveTo(px, hpx); c.lineTo(px, hpx - 8); c.stroke();
const lbl = this._fmt(mx);
c.fillText(lbl, px + 2, 9);
}
const lw = 22, lh = r.height;
this.cLeft.width = lw * dpr; this.cLeft.height = lh * dpr;
this.cLeft.style.width = lw + 'px'; this.cLeft.style.height = lh + 'px';
c = this.cLeft.getContext('2d'); c.scale(dpr, dpr);
c.fillStyle = bg; c.fillRect(0, 0, lw, lh);
c.fillStyle = ink; c.strokeStyle = ink; c.font = '9px system-ui,sans-serif';
const stepY = this._niceStep(v.h / r.height);
const y0 = Math.floor(v.y / stepY) * stepY, y1 = v.y + v.h;
for (let my = y0; my <= y1; my += stepY) {
const py = this.yToPx(my);
if (py < 0 || py > lh) continue;
c.beginPath(); c.moveTo(lw, py); c.lineTo(lw - 8, py); c.stroke();
c.save(); c.translate(9, py - 2); c.rotate(-Math.PI / 2);
c.fillText(this._fmt(my), 0, 0); c.restore();
}
},
_fmt(m) { const r = Math.round(m * 100) / 100; return (Math.abs(r) < 1e-6 ? 0 : r) + ''; },
drawGuides() {
const g = RS.scene.gGuides; if (!g) return;
g.innerHTML = '';
if (!this.enabled) return;
const v = RS.scene.view, gu = RS.scene.guides;
const y1 = v.y - v.h, y2 = v.y + 2 * v.h, x1 = v.x - v.w, x2 = v.x + 2 * v.w;
const hit = 10 / (RS.scene.pxPerMeter() || 20);
const mk = (axis, idx, val) => {
const grp = document.createElementNS(SVGNS, 'g');
grp.setAttribute('class', 'guide-grp');
const line = document.createElementNS(SVGNS, 'line');
const hitline = document.createElementNS(SVGNS, 'line');
if (axis === 'v') { setLine(line, val, y1, val, y2); setLine(hitline, val, y1, val, y2); }
else { setLine(line, x1, val, x2, val); setLine(hitline, x1, val, x2, val); }
line.setAttribute('stroke', '#1aa3ff'); line.setAttribute('stroke-width', 0.03);
line.setAttribute('stroke-dasharray', '0.35 0.25'); line.setAttribute('vector-effect', 'non-scaling-stroke');
line.style.strokeWidth = '1px';
hitline.setAttribute('stroke', 'transparent'); hitline.setAttribute('stroke-width', hit * 2);
hitline.style.cursor = axis === 'v' ? 'col-resize' : 'row-resize';
hitline.addEventListener('pointerdown', ev => this._startMove(ev, axis, idx));
hitline.addEventListener('dblclick', ev => { ev.stopPropagation(); this._remove(axis, idx); });
grp.appendChild(line); grp.appendChild(hitline);
g.appendChild(grp);
};
gu.v.forEach((val, i) => mk('v', i, val));
gu.h.forEach((val, i) => mk('h', i, val));
if (this._drag && this._drag.ghost != null) {
const l = document.createElementNS(SVGNS, 'line');
if (this._drag.axis === 'v') setLine(l, this._drag.ghost, y1, this._drag.ghost, y2);
else setLine(l, x1, this._drag.ghost, x2, this._drag.ghost);
l.setAttribute('stroke', '#1aa3ff'); l.style.strokeWidth = '1px';
l.setAttribute('vector-effect', 'non-scaling-stroke'); l.setAttribute('opacity', 0.7);
g.appendChild(l);
}
function setLine(n, a, b, c, d) { n.setAttribute('x1', a); n.setAttribute('y1', b); n.setAttribute('x2', c); n.setAttribute('y2', d); }
},
_startNew(e, axis) {
if (!this.enabled) return;
e.preventDefault();
const val = axis === 'v' ? this.pxToX(e.clientX) : this.pxToY(e.clientY);
this._drag = { axis, mode: 'new', ghost: RS.scene.snapVal(val) };
this.drawGuides();
},
_startMove(e, axis, idx) {
if (!this.enabled) return;
e.preventDefault(); e.stopPropagation();
this._drag = { axis, mode: 'move', idx, ghost: RS.scene.guides[axis][idx] };
this.drawGuides();
},
_move(e) {
if (!this._drag) return;
const d = this._drag;
const raw = d.axis === 'v' ? this.pxToX(e.clientX) : this.pxToY(e.clientY);
d.ghost = Math.round(RS.scene.snapVal(raw) * 100) / 100;
if (d.mode === 'move') RS.scene.guides[d.axis][d.idx] = d.ghost;
this.drawGuides();
},
_end() {
const d = this._drag; if (!d) return;
this._drag = null;
if (d.mode === 'new') {
RS.scene.guides[d.axis].push(d.ghost);
}
RS.scene.snapshot();
this.drawGuides();
},
_remove(axis, idx) { RS.scene.guides[axis].splice(idx, 1); RS.scene.snapshot(); this.drawGuides(); },
clearGuides() {
if (!RS.scene.guides.v.length && !RS.scene.guides.h.length) return;
RS.scene.guides = { v: [], h: [] }; RS.scene.snapshot(); this.drawGuides();
RS.ui && RS.ui.toast && RS.ui.toast('Guide cancellate');
}
};
RS.rulers = rulers;
})(window.RS = window.RS || {});

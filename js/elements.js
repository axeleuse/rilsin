(function (RS) {
'use strict';
const N = RS.svgNode;
function mk(tag, attrs, parent) {
const n = N(tag);
for (const k in attrs) n.setAttribute(k, attrs[k]);
if (parent) parent.appendChild(n);
return n;
}
function group(e) {
const g = N('g');
g.setAttribute('class', 'el el-' + e.type);
return g;
}
const HAIR = { 'vector-effect': 'non-scaling-stroke' };
const FASI = [
['percezione', 'Percezione del pericolo'], ['frenata', 'Inizio frenata'], ['intermedia', 'Posizione intermedia'],
['urto', 'Urto'], ['quiete', 'Quiete']
];
const ORDINE_FASE = {}; FASI.forEach((f, i) => { ORDINE_FASE[f[0]] = i; });
const DANNI = [
['ant', 'Anteriore'], ['antsx', 'Anteriore sinistra'], ['antdx', 'Anteriore destra'],
['sx', 'Fiancata sinistra'], ['dx', 'Fiancata destra'],
['post', 'Posteriore'], ['postsx', 'Posteriore sinistra'], ['postdx', 'Posteriore destra'], ['tetto', 'Tetto']
];
const nero = '#111';
RS.BN_TRAME = [
{ w: 0.30, rot: 45,  svg: `<rect width="0.09" height="0.30" fill="${nero}"/>` },
{ w: 0.30, rot: -45, svg: `<rect width="0.09" height="0.30" fill="${nero}"/>` },
{ w: 0.34, rot: 45,  svg: `<rect width="0.06" height="0.34" fill="${nero}"/><rect width="0.34" height="0.06" fill="${nero}"/>` },
{ w: 0.26, rot: 0,   svg: `<rect width="0.26" height="0.08" fill="${nero}"/>` },
{ w: 0.30, svg: `<circle cx="0.15" cy="0.15" r="0.06" fill="${nero}"/>` },
{ w: 0.26, rot: 0,   svg: `<rect width="0.08" height="0.26" fill="${nero}"/>` }
];
function tramaVeicolo(e) {
const chiavi = [];
RS.scene.elements.filter(v => v.type === 'vehicle').forEach(v => { const k = v.label || v.id; if (chiavi.indexOf(k) < 0) chiavi.push(k); });
chiavi.sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
return Math.max(0, chiavi.indexOf(e.label || e.id)) % RS.BN_TRAME.length;
}
const nomeFase = k => { const f = FASI.find(x => x[0] === k); return f ? f[1] : ''; };
const APICI = ['′', '″', '‴', '⁗'];
const ordinePosizioni = (a, b) => (ORDINE_FASE[a.fase] - ORDINE_FASE[b.fase]) || (parseInt(String(a.id).slice(1), 10) - parseInt(String(b.id).slice(1), 10));
function siglaFase(e) {
if (!e.label || !e.fase) return e.label || '';
const stessi = RS.scene.elements.filter(v => v.type === 'vehicle' && v.label === e.label && v.fase).sort(ordinePosizioni);
const quiete = stessi.filter(v => v.fase === 'quiete');
if (quiete.length === 1 && e === quiete[0]) return e.label;
const n = stessi.filter(v => !(quiete.length === 1 && v === quiete[0])).indexOf(e) + 1;
if (n < 1) return e.label;
return e.label + (APICI[n - 1] || '′' + n);
}
function drawDanni(g, e) {
if (!e.danni || !e.danni.length) return;
const L = e.len, W = e.wid, hl = L/2, hw = W/2, fl = L*0.24, fw = W*0.34;
const Z = {
ant: [hl - fl, -hw, fl, W], post: [-hl, -hw, fl, W],
antsx: [hl - L*0.3, -hw, L*0.3, W*0.5], antdx: [hl - L*0.3, 0, L*0.3, W*0.5],
postsx: [-hl, -hw, L*0.3, W*0.5], postdx: [-hl, 0, L*0.3, W*0.5],
sx: [-hl*0.55, -hw, L*0.55, fw], dx: [-hl*0.55, hw - fw, L*0.55, fw],
tetto: [-hl*0.5, -hw*0.68, L*0.45, W*0.68]
};
const fianco = e.posa === 'fiancosx' || e.posa === 'fiancodx' ? (e.posa === 'fiancodx' ? 1 : -1) : 0;
if (fianco) {
const fascia = (z0, z1) => { const a = -fianco*hw + fianco*z0*W, b = -fianco*hw + fianco*z1*W; return [Math.min(a, b), Math.abs(b - a)]; };
const [ty, th] = fascia(.78, 1), [my, mh] = fascia(.2, .72), [ay, ah] = fascia(0, 1);
Object.assign(Z, { tetto: [-hl*0.5, ty, L*0.6, th], sx: [-hl*0.55, my, L*0.55, mh], dx: [-hl*0.55, my, L*0.55, mh],
ant: [hl - fl, ay, fl, ah], post: [-hl, ay, fl, ah], antsx: [hl - L*0.3, ay, L*0.3, ah], antdx: [hl - L*0.3, ay, L*0.3, ah],
postsx: [-hl, ay, L*0.3, ah], postdx: [-hl, ay, L*0.3, ah] });
}
const capovolto = e.posa === 'tetto';
const scambia = k => capovolto ? k.replace(/sx$|dx$/, m => m === 'sx' ? 'dx' : 'sx') : k;
const nascosto = k => (fianco === 1 && k === 'dx') || (fianco === -1 && k === 'sx') || (capovolto && k === 'tetto');
e.danni.forEach(k0 => {
const k = scambia(k0), z = Z[k]; if (!z) return;
if (nascosto(k0)) {
mk('rect', { x: z[0], y: z[1], width: z[2], height: z[3], rx: Math.min(0.12, z[3]*0.2), fill: 'none', stroke: RS.bn ? nero : '#c81414',
'stroke-width': 0.06, 'stroke-dasharray': '0.25 0.15', class: 'danni' }, g);
return;
}
mk('rect', { x: z[0], y: z[1], width: z[2], height: z[3], rx: Math.min(0.12, z[3]*0.2), fill: RS.bn ? 'url(#patDanniBN)' : 'url(#patDanni)',
stroke: RS.bn ? nero : '#c81414', 'stroke-width': RS.bn ? 0.07 : 0.05, 'stroke-dasharray': '0.14 0.08', class: 'danni' }, g);
});
}
const coloreVeicolo = (e, def) => RS.bn ? '#f4f4f4' : (e.color || def);
const DUE_RUOTE = { moto: 1, bike: 1, monopattino: 1 };
function drawTramaBN(g, e) {
if (!RS.bn || DUE_RUOTE[e.kind]) return;
const r = (e.kind || 'car') === 'car' && (!e.posa || e.posa === 'ruote') ? Math.min(0.55, e.wid*0.3) : 0.15;
mk('rect', { x: -e.len/2, y: -e.wid/2, width: e.len, height: e.wid, rx: r, fill: `url(#patBN${tramaVeicolo(e)})`,
stroke: nero, 'stroke-width': 0.06, opacity: 0.7 }, g);
}
const GLASS = 'rgba(36,50,64,.82)', ROOFL = 'rgba(255,255,255,.16)',
TYRE = '#101012', LIGHT = 'rgba(255,244,205,.95)', TAIL = 'rgba(214,42,42,.92)';
const PROFILI = {
auto:       { zb: .16, zr: .50, tr: [-.84, .58], rw0: [-.60, .60], rw1: [-.40, .95], roofE: .06, zroof: .96, ws: [.40, .60], bon: [.90, .52], zf: .42 },
berlina:    { zb: .16, zr: .52, tr: [-.86, .60], rw0: [-.52, .62], rw1: [-.30, .95], roofE: .10, zroof: .96, ws: [.42, .60], bon: [.92, .52], zf: .42 },
utilitaria: { zb: .16, zr: .55, tr: [-.98, .62], rw0: [-.96, .64], rw1: [-.78, .95], roofE: .08, zroof: .97, ws: [.46, .62], bon: [.92, .55], zf: .45 },
suv:        { zb: .20, zr: .62, tr: [-.98, .66], rw0: [-.96, .70], rw1: [-.86, .98], roofE: .16, zroof: .99, ws: [.46, .68], bon: [.94, .64], zf: .52 },
monovolume: { zb: .16, zr: .60, tr: [-.98, .66], rw0: [-.97, .70], rw1: [-.90, .97], roofE: .18, zroof: .98, ws: [.68, .62], bon: [.94, .56], zf: .46 },
micro:      { zb: .16, zr: .60, tr: [-.98, .66], rw0: [-.96, .68], rw1: [-.82, .96], roofE: .20, zroof: .97, ws: [.60, .64], bon: [.92, .58], zf: .50 },
sw:         { zb: .16, zr: .56, tr: [-.98, .62], rw0: [-.97, .66], rw1: [-.9, .95], roofE: .08, zroof: .96, ws: [.42, .60], bon: [.92, .52], zf: .42 },
coupe:      { zb: .15, zr: .48, tr: [-.92, .54], rw0: [-.62, .58], rw1: [-.18, .86], roofE: .02, zroof: .88, ws: [.4, .56], bon: [.92, .48], zf: .38 },
cabrio:     { zb: .15, zr: .50, tr: [-.92, .56], rw0: [-.6, .58], rw1: [-.5, .6], roofE: .2, zroof: .61, ws: [.42, .6], bon: [.92, .5], zf: .4, aperto: true },
pickup:     { zb: .2, zr: .6, poly: [[-1, .2], [-1, .6], [-.14, .6], [-.12, .97], [.26, .97], [.48, .64], [.92, .58], [1, .48], [1, .2]],
vetri: [[-.08, .65], [-.07, .91], [.24, .91], [.42, .65]], zf: .48, cassone: true }
};
function drawOverturned(g, e) {
if (DUE_RUOTE[e.kind]) { drawTwoWheelDown(g, e); return; }
if (e.posa === 'tetto') { drawSottoscocca(g, e); return; }
drawFiancata(g, e);
}
function drawFiancata(g, e) {
const L = e.len, W = e.wid, hl = L/2, hw = W/2, col = coloreVeicolo(e, '#2f6fed'), kind = e.kind || 'car';
const r = e.posa === 'fiancodx' ? 1 : -1;
const X = fx => (fx * hl).toFixed(3), Y = z => (-r*hw + r*z*W).toFixed(3);
const P = pts => pts.map((p, i) => (i ? 'L' : 'M') + X(p[0]) + ' ' + Y(p[1])).join(' ') + ' Z';
const scocca = (pts, fill) => mk('path', { d: P(pts), fill: fill || col, stroke: '#0b0b0b', 'stroke-width': 0.05, 'stroke-linejoin': 'round' }, g);
const vetro = pts => mk('path', { d: P(pts), fill: GLASS, stroke: 'rgba(0,0,0,.35)', 'stroke-width': 0.02, 'stroke-linejoin': 'round' }, g);
const riga = (x1, z1, x2, z2, w) => mk('line', { x1: X(x1), y1: Y(z1), x2: X(x2), y2: Y(z2), stroke: 'rgba(0,0,0,.4)', 'stroke-width': w || 0.03 }, g);
const luce = (fx, z0, z1, c) => mk('rect', { x: Math.min(fx*hl, fx*hl + (fx > 0 ? -0.14 : 0.14)), y: Math.min(+Y(z0), +Y(z1)), width: 0.14, height: Math.abs(+Y(z1) - +Y(z0)), rx: 0.03, fill: c }, g);
const ruota = (fx, rr) => {
const cx = fx * hl, cy = +Y(rr / W);
mk('circle', { cx, cy, r: rr, fill: TYRE }, g);
mk('circle', { cx, cy, r: rr*0.58, fill: '#8b9097', stroke: '#2a2a2a', 'stroke-width': 0.02 }, g);
mk('circle', { cx, cy, r: rr*0.2, fill: '#3a3a3a' }, g);
};
const rr = Math.min(W*0.2, L*0.085, 0.45);
if (kind === 'car' || FORMA_AUTO[e.catId]) {
const p = PROFILI[FORMA_AUTO[e.catId] || 'auto'] || PROFILI.auto;
const ru0 = (SAGOME[FORMA_AUTO[e.catId] || 'auto'] || SAGOME.auto).ru;
if (p.poly) {
scocca(p.poly); vetro(p.vetri);
riga(-1, p.zr - 0.02, -.14, p.zr - 0.02, 0.05); riga(-.97, p.zb + 0.04, -.97, p.zr - 0.04);
luce(1, p.zf, p.zf + 0.08, LIGHT); luce(-1, p.zr - 0.12, p.zr - 0.02, TAIL);
ruota(ru0, rr); ruota(-ru0, rr);
return;
}
scocca([[-1, p.zb], [-1, p.zr], p.tr, p.rw0, p.rw1, [p.roofE, p.zroof], p.ws, p.bon, [1, p.zf], [1, p.zb]]);
if (p.aperto) {
mk('path', { d: `M${X(p.ws[0])} ${Y(p.ws[1])} L${X(p.ws[0] - .14)} ${Y(.9)}`, stroke: GLASS, 'stroke-width': 0.09, 'stroke-linecap': 'round' }, g);
[-.08, -.42].forEach(x => mk('path', { d: P([[x - .05, p.zroof - .01], [x - .05, .8], [x + .05, .8], [x + .05, p.zroof - .01]]), fill: '#3a3b3f', stroke: '#0b0b0b', 'stroke-width': 0.03 }, g));
riga(p.ws[0] - 0.04, p.zb + 0.06, p.ws[0] - 0.06, p.zroof - 0.04); riga(-.3, p.zb + 0.04, -.3, p.zroof - 0.04);
luce(1, p.zf, p.zf + 0.08, LIGHT); luce(-1, p.zr - 0.08, p.zr, TAIL);
ruota(ru0, rr); ruota(-ru0, rr);
return;
}
const zv = Math.min(p.rw0[1], p.ws[1]) + 0.03, zt = p.zroof - 0.07;
vetro([[p.rw0[0] + 0.06, zv], [p.rw1[0] + 0.04, zt], [p.roofE - 0.03, zt], [p.ws[0] - 0.07, zv]]);
const bp = (p.rw1[0] + p.roofE) / 2 + 0.04;
mk('line', { x1: X(bp), y1: Y(zv - 0.02), x2: X(bp), y2: Y(zt + 0.02), stroke: col, 'stroke-width': 0.08 }, g);
riga(bp, p.zb + 0.04, bp, zv - 0.02); riga(p.ws[0] - 0.02, p.zb + 0.06, p.ws[0] - 0.08, zv - 0.02);
if (p.rw0[0] < -0.8) riga(-0.94, p.zb + 0.04, -0.94, zv);
mk('rect', { x: X(bp - 0.18), y: Math.min(+Y(zv - 0.1), +Y(zv - 0.06)), width: 0.18, height: 0.05, rx: 0.02, fill: 'rgba(0,0,0,.45)' }, g);
mk('rect', { x: X(bp + 0.3), y: Math.min(+Y(zv - 0.1), +Y(zv - 0.06)), width: 0.18, height: 0.05, rx: 0.02, fill: 'rgba(0,0,0,.45)' }, g);
luce(1, p.zf, p.zf + 0.08, LIGHT); luce(-1, p.zr - 0.08, p.zr, TAIL);
const ru = (SAGOME[FORMA_AUTO[e.catId] || 'auto'] || SAGOME.auto).ru;
ruota(ru, rr); ruota(-ru, rr);
return;
}
if (kind === 'van') {
scocca([[-1, .14], [-1, .96], [-.97, .99], [.56, .99], [.84, .62], [.97, .55], [1, .45], [1, .14]]);
vetro([[.36, .62], [.38, .92], [.56, .92], [.8, .63]]);
riga(.34, .16, .34, .96); riga(-.1, .16, -.1, .96); riga(-.96, .16, -.96, .96);
if (e.catId === 'camper') { vetro([[-.72, .56], [-.72, .78], [-.4, .78], [-.4, .56]]); vetro([[-.2, .56], [-.2, .78], [.05, .78], [.05, .56]]); }
if (e.catId === 'ambulanza') {
const cx = -.35 * hl, cy = +Y(.6), s = Math.min(W*0.32, L*0.12);
mk('rect', { x: cx - s/2, y: cy - s/2, width: s, height: s, fill: '#fff' }, g);
mk('rect', { x: cx - s*0.12, y: cy - s*0.4, width: s*0.24, height: s*0.8, fill: '#d61f1f' }, g);
mk('rect', { x: cx - s*0.4, y: cy - s*0.12, width: s*0.8, height: s*0.24, fill: '#d61f1f' }, g);
}
luce(1, .45, .53, LIGHT); luce(-1, .5, .62, TAIL);
ruota(.62, rr); ruota(-.6, rr);
return;
}
if (kind === 'bus') {
const tram = e.catId === 'tram';
scocca([[-1, .12], [-1, .9], [-.97, .97], [.97, .97], [1, .88], [1, .12]]);
vetro([[.86, .5], [.9, .9], [.99, .86], [.99, .5]]);
for (let x = -.92; x < .8; x += .14) vetro([[x, .55], [x, .86], [x + .11, .86], [x + .11, .55]]);
[.72, -.05, -.75].forEach(x => { mk('rect', { x: X(x), y: Math.min(+Y(.14), +Y(.86)), width: L*0.04, height: Math.abs(+Y(.86) - +Y(.14)), fill: 'rgba(0,0,0,.22)', stroke: 'rgba(0,0,0,.4)', 'stroke-width': 0.02 }, g); });
if (tram) mk('rect', { x: X(-1), y: Math.min(+Y(.02), +Y(.12)), width: L, height: W*0.1, fill: '#555' }, g);
else { ruota(.7, rr); ruota(-.62, rr); if (e.catId === 'autosnodato') ruota(.05, rr); }
luce(1, .2, .3, LIGHT); luce(-1, .2, .32, TAIL);
return;
}
if (kind === 'combine') {
scocca([[-1, .22], [-1, .82], [-.2, .9], [.4, .9], [.42, .98], [.7, .98], [.72, .62], [.72, .22]]);
vetro([[.44, .66], [.45, .93], [.68, .93], [.7, .66]]);
scocca([[.72, .04], [.72, .4], [1, .3], [1, .04]], '#d8c24a');
mk('line', { x1: X(-.2), y1: Y(.86), x2: X(-.85), y2: Y(.98), stroke: '#444', 'stroke-width': W*0.06, 'stroke-linecap': 'round' }, g);
ruota(.42, Math.min(W*0.3, L*0.11)); ruota(-.7, Math.min(W*0.2, L*0.07));
return;
}
if (kind === 'quad') {
scocca([[-.9, .42], [-.9, .62], [-.2, .66], [.1, .78], [.5, .72], [.9, .6], [.95, .42]]);
mk('rect', { x: X(-.55), y: Math.min(+Y(.66), +Y(.76)), width: L*0.3, height: W*0.1, rx: 0.04, fill: '#1a1a1a' }, g);
mk('line', { x1: X(.3), y1: Y(.74), x2: X(.42), y2: Y(.98), stroke: '#111', 'stroke-width': 0.06, 'stroke-linecap': 'round' }, g);
ruota(-.62, Math.min(W*0.3, L*0.16)); ruota(.62, Math.min(W*0.3, L*0.16));
return;
}
if (kind === 'carrozzina') {
ruota(-.2, Math.min(W*0.32, L*0.3));
mk('path', { d: P([[-.75, .45], [-.75, .52], [.45, .52], [.45, .45]]), fill: col, stroke: '#0b0b0b', 'stroke-width': 0.03 }, g);
mk('path', { d: `M${X(-.7)} ${Y(.5)} L${X(-.8)} ${Y(1)} M${X(.4)} ${Y(.48)} L${X(.8)} ${Y(.12)} L${X(1)} ${Y(.12)}`, fill: 'none', stroke: '#333', 'stroke-width': 0.05, 'stroke-linecap': 'round' }, g);
mk('circle', { cx: X(.75), cy: +Y(.06), r: Math.min(0.06, W*0.06), fill: TYRE }, g);
return;
}
const cab = kind === 'artic' ? .52 : kind === 'roadtrain' ? .4 : kind === 'tract' ? 0 : .48;
if (kind === 'tract') {
scocca([[-.9, .3], [-.9, .98], [-.2, .98], [-.1, .62], [.95, .56], [1, .3]]);
vetro([[-.82, .64], [-.82, .92], [-.28, .92], [-.22, .64]]);
ruota(-.58, Math.min(W*0.42, L*0.2)); ruota(.66, Math.min(W*0.24, L*0.12));
return;
}
if (kind === 'ape') {
scocca([[-1, .2], [-1, .72], [.1, .72], [.1, .2]], '#c9b87f');
scocca([[.1, .2], [.1, .95], [.6, .95], [.95, .6], [1, .2]]);
vetro([[.18, .58], [.18, .88], [.55, .88], [.85, .6]]);
ruota(-.7, rr*0.8); ruota(.72, rr*0.8);
return;
}
if (e.catId === 'operatrice') {
mk('rect', { x: X(-1), y: Math.min(+Y(0), +Y(.26)), width: L*0.66, height: W*0.26, rx: W*0.12, fill: '#2a2a2a', stroke: '#0b0b0b', 'stroke-width': 0.04 }, g);
for (let x = -.88; x <= .24; x += .16) mk('circle', { cx: x*hl, cy: +Y(.13), r: W*0.08, fill: '#666', stroke: '#222', 'stroke-width': 0.02 }, g);
scocca([[-.98, .28], [-.98, .62], [.18, .62], [.18, .28]]);
scocca([[-.16, .62], [-.16, .98], [.12, .98], [.18, .62]]); vetro([[-.12, .66], [-.12, .92], [.08, .92], [.13, .66]]);
mk('path', { d: `M${X(.16)} ${Y(.5)} L${X(.52)} ${Y(.98)} L${X(.86)} ${Y(.42)}`, fill: 'none', stroke: col, 'stroke-width': W*0.09, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, g);
mk('path', { d: `M${X(.78)} ${Y(.46)} L${X(1)} ${Y(.38)} L${X(.98)} ${Y(.08)} L${X(.8)} ${Y(.16)} Z`, fill: '#4a4a4a', stroke: '#0b0b0b', 'stroke-width': 0.04 }, g);
return;
}
const cassone = e.catId === 'betoniera' ? '#b9a27a' : e.catId === 'carroattrezzi' ? '#9aa3ab' : '#dcd7c9';
const alto = e.catId === 'carroattrezzi' ? .42 : e.catId === 'motrice' ? .3 : 1;
if (kind !== 'trailer') {
const x0 = 1 - cab;
scocca([[x0, .18], [x0, 1], [.9, 1], [1, .84], [1, .18]]);
vetro([[x0 + .06, .6], [x0 + .06, .9], [.88, .9], [.96, .62]]);
riga(x0 + .04, .2, x0 + .04, .96); luce(1, .22, .32, LIGHT);
if (e.catId === 'cisterna') {
const y0 = +Y(.24), y1 = +Y(.96), yt = Math.min(y0, y1), ht = Math.abs(y1 - y0);
mk('rect', { x: X(-1), y: yt, width: (x0 - .04 + 1) * hl, height: ht, rx: ht * 0.45, fill: '#c9ced5', stroke: '#0b0b0b', 'stroke-width': 0.05 }, g);
for (let x = -.7; x < x0 - .2; x += .3) riga(x, .26, x, .94, 0.04);
mk('rect', { x: +X(-1) + 0.05, y: Math.min(+Y(.4), +Y(.6)), width: 0.1, height: W * 0.2, fill: '#f08a00' }, g);
} else if (alto > .3) {
const xe = kind === 'roadtrain' ? -.1 : -1;
scocca([[xe, .22], [xe, alto], [x0 - .04, alto], [x0 - .04, .22]], e.catId === 'vvf' ? col : cassone);
for (let x = xe + .1; x < x0 - .08; x += .12) riga(x, .24, x, alto - .02, 0.02);
if (e.catId === 'vvf') mk('line', { x1: X(xe + .04), y1: Y(.97), x2: X(.9), y2: Y(.97), stroke: '#d8dde2', 'stroke-width': W * 0.05 }, g);
} else mk('line', { x1: X(-1), y1: Y(.24), x2: X(x0), y2: Y(.24), stroke: '#333', 'stroke-width': 0.14 }, g);
if (e.catId === 'carroattrezzi') mk('line', { x1: X(-.2), y1: Y(.42), x2: X(-1), y2: Y(.62), stroke: '#333', 'stroke-width': W*0.08, 'stroke-linecap': 'round' }, g);
ruota(1 - cab*0.5, rr);
}
if (kind === 'artic' || kind === 'trailer' || kind === 'roadtrain') {
const xe = kind === 'artic' ? 1 - cab - .02 : kind === 'roadtrain' ? -.16 : .9;
const agri = e.catId === 'rimagri';
scocca([[-1, .22], [-1, agri ? .62 : 1], [xe, agri ? .62 : 1], [xe, .22]], agri ? col : '#dcd7c9');
for (let x = -.9; x < xe - .05; x += .12) riga(x, .24, x, agri ? .6 : .98, 0.02);
if (kind !== 'artic') mk('line', { x1: X(xe), y1: Y(.25), x2: X(xe + (kind === 'trailer' ? .1 : .06)), y2: Y(.25), stroke: '#0b0b0b', 'stroke-width': 0.08 }, g);
luce(-1, .26, .36, TAIL);
if (agri) ruota(-.15, Math.min(W*0.26, L*0.1)); else [-.86, -.74, -.62].forEach(x => ruota(x, rr));
} else luce(-1, .26, .36, TAIL);
if (kind === 'truck') { ruota(-.3, rr); ruota(-.62, rr); }
if (kind === 'artic') ruota(.55, rr);
if (kind === 'roadtrain') { ruota(.25, rr); ruota(-.32, rr); }
}
function drawSottoscocca(g, e) {
const L = e.len, W = e.wid, hl = L/2, hw = W/2, col = coloreVeicolo(e, '#2f6fed'), kind = e.kind || 'car';
const lungo = L > 6.5;
mk('rect', { x: -hl, y: -hw, width: L, height: W, rx: lungo ? 0.2 : Math.min(0.5, W*0.26), fill: col, stroke: '#0b0b0b', 'stroke-width': 0.05 }, g);
mk('rect', { x: -hl + 0.1, y: -hw + 0.1, width: L - 0.2, height: W - 0.2, rx: lungo ? 0.12 : Math.min(0.4, W*0.22), fill: '#3b3f45' }, g);
[-1, 1].forEach(s => {
mk('rect', { x: hl - 0.12, y: s > 0 ? hw - W*0.24 : -hw + W*0.06, width: 0.1, height: W*0.18, rx: 0.03, fill: LIGHT }, g);
mk('rect', { x: -hl + 0.02, y: s > 0 ? hw - W*0.24 : -hw + W*0.06, width: 0.1, height: W*0.18, rx: 0.03, fill: TAIL }, g);
});
const pneumatico = (px, py, wl, ww) => {
mk('rect', { x: px - wl/2, y: py - ww/2, width: wl, height: ww, rx: ww*0.3, fill: TYRE }, g);
for (let t = -wl/2 + wl*0.14; t < wl/2; t += wl*0.2) mk('line', { x1: px + t, y1: py - ww*0.4, x2: px + t, y2: py + ww*0.4, stroke: '#3a3a3a', 'stroke-width': 0.03 }, g);
};
if (lungo || kind === 'truck' || kind === 'bus') {
[-1, 1].forEach(s => mk('line', { x1: -hl + 0.3, y1: s*hw*0.32, x2: hl - 0.3, y2: s*hw*0.32, stroke: '#1d1f22', 'stroke-width': 0.16 }, g));
for (let x = -hl + 0.6; x < hl - 0.4; x += 1.3) mk('line', { x1: x, y1: -hw*0.32, x2: x, y2: hw*0.32, stroke: '#1d1f22', 'stroke-width': 0.08 }, g);
mk('rect', { x: hl - L*0.16, y: -hw*0.28, width: L*0.1, height: hw*0.56, rx: 0.06, fill: '#26282c' }, g);
mk('rect', { x: -hl*0.2, y: hw*0.4, width: L*0.1, height: hw*0.4, rx: 0.06, fill: '#555b63' }, g);
const assi = kind === 'bus' ? [hl*0.7, -hl*0.62] : kind === 'artic' ? [hl*0.8, hl*0.5, -hl*0.72, -hl*0.82, -hl*0.92]
: kind === 'roadtrain' ? [hl*0.82, hl*0.5, -hl*0.15, -hl*0.85] : kind === 'trailer' ? [-hl*0.6] : [hl*0.74, -hl*0.3, -hl*0.62];
assi.forEach((x, i) => {
mk('line', { x1: x, y1: -hw + 0.2, x2: x, y2: hw - 0.2, stroke: '#666', 'stroke-width': 0.1 }, g);
const doppia = i > 0 && kind !== 'bus';
[-1, 1].forEach(s => { pneumatico(x, s*(hw - W*0.13), L*0.06 + 0.4, W*0.16); if (doppia) pneumatico(x, s*(hw - W*0.3), L*0.06 + 0.4, W*0.14); });
});
mk('line', { x1: hl - L*0.12, y1: 0, x2: -hl*0.3, y2: 0, stroke: '#8a8f96', 'stroke-width': 0.08 }, g);
return;
}
const ru = (SAGOME[FORMA_AUTO[e.catId] || 'auto'] || SAGOME.auto).ru, ww = W*0.2, wl = L*0.15, off = hw - ww*0.16;
mk('rect', { x: hl*0.5, y: -hw*0.42, width: hl*0.36, height: hw*0.84, rx: 0.08, fill: '#26282c' }, g);
mk('rect', { x: hl*0.34, y: -hw*0.2, width: hl*0.18, height: hw*0.4, rx: 0.05, fill: '#2f3236' }, g);
mk('rect', { x: -hl*0.56, y: -hw*0.62, width: hl*0.34, height: hw*0.5, rx: 0.06, fill: '#555b63' }, g);
mk('path', { d: `M${hl*0.5} ${hw*0.22} L${-hl*0.1} ${hw*0.3} L${-hl*0.86} ${hw*0.34}`, fill: 'none', stroke: '#a3a8ae', 'stroke-width': 0.07, 'stroke-linejoin': 'round' }, g);
mk('ellipse', { cx: -hl*0.62, cy: hw*0.34, rx: hl*0.12, ry: hw*0.16, fill: '#8a8f96', stroke: '#555', 'stroke-width': 0.02 }, g);
mk('line', { x1: hl*0.34, y1: 0, x2: -hl*ru, y2: 0, stroke: '#6f747b', 'stroke-width': 0.06 }, g);
[ru, -ru].forEach(f => {
mk('line', { x1: f*hl, y1: -off, x2: f*hl, y2: off, stroke: '#666', 'stroke-width': 0.08 }, g);
[-1, 1].forEach(s => pneumatico(f*hl, s*off, wl, ww));
});
}
function drawTwoWheelDown(g, e) {
const L = e.len, W = e.wid, hl = L/2, hw = W/2, col = e.color || '#d23838', k = e.kind;
const r = e.posa === 'fiancodx' ? 1 : -1;
const Y = z => -r*hw + r*z*W;
const wr = k === 'monopattino' ? Math.min(0.1, W*0.22) : Math.min(k === 'bike' ? 0.33 : 0.3, W*0.4, L*0.16);
const cxF = hl - wr*1.02, cxR = -hl + wr*1.02, cy = Y(wr / W);
const tubo = (x1, z1, x2, z2, c, w) => mk('line', { x1, y1: Y(z1), x2, y2: Y(z2), stroke: c, 'stroke-width': w, 'stroke-linecap': 'round' }, g);
const ruota = (cx, sottile) => {
mk('circle', { cx, cy, r: wr, fill: 'none', stroke: TYRE, 'stroke-width': sottile ? wr*0.16 : wr*0.32 }, g);
mk('circle', { cx, cy, r: sottile ? wr*0.08 : wr*0.36, fill: sottile ? '#444' : '#8b9097', stroke: '#333', 'stroke-width': 0.015 }, g);
if (sottile) for (let a = 0; a < 6; a++) { const t = a * Math.PI / 6; mk('line', { x1: cx + Math.cos(t)*wr*0.85, y1: cy + Math.sin(t)*wr*0.85, x2: cx - Math.cos(t)*wr*0.85, y2: cy - Math.sin(t)*wr*0.85, stroke: '#777', 'stroke-width': 0.012 }, g); }
};
const zc = wr / W;
if (k === 'bike') {
ruota(cxR, true); ruota(cxF, true);
const bb = [-hl*0.05, zc + 0.05], sel = [-hl*0.22, Math.min(0.92, zc + 0.62)], man = [cxF - wr*0.3, Math.min(0.95, zc + 0.66)];
tubo(cxR, zc, bb[0], bb[1], col, 0.05); tubo(cxR, zc, sel[0], sel[1] - 0.06, col, 0.045);
tubo(bb[0], bb[1], sel[0], sel[1] - 0.06, col, 0.05); tubo(sel[0], sel[1] - 0.06, man[0], man[1] - 0.08, col, 0.05);
tubo(bb[0], bb[1], man[0], man[1] - 0.08, col, 0.055); tubo(man[0], man[1] - 0.08, cxF, zc, col, 0.045);
tubo(sel[0] - 0.12, sel[1], sel[0] + 0.1, sel[1], '#1a1a1a', 0.07);
tubo(man[0] - 0.05, man[1], man[0] + 0.12, man[1] - 0.02, '#1a1a1a', 0.05);
mk('circle', { cx: bb[0], cy: Y(bb[1]), r: 0.08, fill: '#333' }, g);
return;
}
if (k === 'monopattino') {
ruota(cxR); ruota(cxF);
mk('rect', { x: cxR, y: Math.min(Y(zc - 0.02), Y(zc + 0.12)), width: cxF - cxR, height: W*0.14, rx: 0.03, fill: col, stroke: '#0b0b0b', 'stroke-width': 0.02 }, g);
tubo(cxF, zc, cxF - 0.08, 0.95, '#2a2a2a', 0.05); tubo(cxF - 0.16, 0.95, cxF + 0.02, 0.95, '#2a2a2a', 0.05);
return;
}
ruota(cxR); ruota(cxF);
tubo(cxF, zc, cxF - wr*0.7, 0.86, '#2a2a2a', 0.06);
mk('path', { d: `M${cxR + wr*0.6} ${Y(zc + 0.1)} L${-hl*0.25} ${Y(0.42)} L${hl*0.32} ${Y(0.5)} L${cxF - wr*0.75} ${Y(0.78)} L${hl*0.05} ${Y(0.8)} L${-hl*0.2} ${Y(0.66)} L${-hl*0.62} ${Y(0.62)} Z`,
fill: col, stroke: '#0b0b0b', 'stroke-width': 0.035, 'stroke-linejoin': 'round' }, g);
mk('path', { d: `M${-hl*0.7} ${Y(0.62)} L${-hl*0.15} ${Y(0.66)} L${-hl*0.12} ${Y(0.74)} L${-hl*0.66} ${Y(0.72)} Z`, fill: '#1a1a1a' }, g);
mk('rect', { x: -hl*0.12, y: Math.min(Y(0.2), Y(0.44)), width: hl*0.32, height: W*0.24, rx: 0.04, fill: '#555b63' }, g);
tubo(-hl*0.05, 0.22, cxR - wr*0.1, 0.3, '#a3a8ae', 0.06);
tubo(cxF - wr*0.95, 0.9, cxF - wr*0.45, 0.94, '#1a1a1a', 0.05);
mk('circle', { cx: cxF - wr*0.55, cy: Y(0.74), r: Math.min(0.08, W*0.08), fill: LIGHT, stroke: '#333', 'stroke-width': 0.015 }, g);
}
const SAGOME = {
auto:       { r: 0.30, cF: 0.28, cB: -0.55, pF: 0.50, pB: -0.72, ru: 0.66 },
utilitaria: { r: 0.34, cF: 0.22, cB: -0.80, pF: 0.46, pB: -0.93, ru: 0.62 },
berlina:    { r: 0.25, cF: 0.16, cB: -0.42, pF: 0.42, pB: -0.56, ru: 0.66, baule: true },
suv:        { r: 0.17, cF: 0.30, cB: -0.80, pF: 0.52, pB: -0.92, ru: 0.66, barre: true },
monovolume: { r: 0.30, cF: 0.44, cB: -0.84, pF: 0.70, pB: -0.95, ru: 0.66 },
micro:      { r: 0.38, cF: 0.32, cB: -0.70, pF: 0.64, pB: -0.86, ru: 0.62 },
sw:         { r: 0.24, cF: 0.28, cB: -0.86, pF: 0.50, pB: -0.95, ru: 0.66, barre: true },
coupe:      { r: 0.32, cF: 0.14, cB: -0.36, pF: 0.44, pB: -0.68, ru: 0.66 },
cabrio:     { r: 0.30, cF: 0.24, cB: -0.50, pF: 0.46, pB: -0.60, ru: 0.66, aperto: true },
pickup:     { r: 0.16, cF: 0.30, cB: -0.14, pF: 0.52, pB: -0.22, ru: 0.66, cassone: true }
};
const FORMA_AUTO = { utilitaria: 'utilitaria', autovettura: 'auto', berlina: 'berlina', suv: 'suv', monovolume: 'monovolume',
taxi: 'auto', ffoo: 'auto', quadriciclo: 'micro', sw: 'sw', coupe: 'coupe', cabrio: 'cabrio', pickup: 'pickup' };
function snodoInfo(e) {
const L = e.len, hl = L/2;
if (e.kind === 'artic') return { px: hl - L*0.26 - 0.09 };
if (e.kind === 'roadtrain') return { px: -hl + ((L - L*0.2)*0.5 - 0.2) + 0.04 };
if (e.catId === 'autosnodato') return { px: hl - L*0.58 };
return null;
}
function locale(e, lx, ly) {
const s = e.snodo ? snodoInfo(e) : null;
if (!s || lx <= s.px) return { lx, ly };
const a = e.snodo * Math.PI/180, dx = lx - s.px;
return { lx: s.px + dx*Math.cos(a) - ly*Math.sin(a), ly: dx*Math.sin(a) + ly*Math.cos(a) };
}
function drawVehicleBody(g, e) {
if (e.posa && e.posa !== 'ruote') { drawOverturned(g, e); return; }
const L = e.len, W = e.wid, hl = L/2, hw = W/2;
const kind = e.kind || 'car';
const col = DUE_RUOTE[kind] ? (e.color || '#2f6fed') : coloreVeicolo(e, '#2f6fed');
const sterzo = +e.sterzo || 0;
const sn = e.snodo ? snodoInfo(e) : null;
const gAnt = sn ? mk('g', { transform: `rotate(${+e.snodo} ${sn.px} 0)` }) : g;
function wheel(px, py, wl, ww, sterza, dove) {
const r = mk('rect', { x: px - wl/2, y: py - ww/2, width: wl, height: ww, rx: ww*0.35, fill: TYRE }, dove || g);
if (sterza && sterzo) r.setAttribute('transform', `rotate(${sterzo} ${px} ${py})`);
}
function shellp(d, fill) { mk('path', { d, fill }, g); }
function lightsFB() {
mk('rect', { x: hl-0.14, y: -hw*0.66, width: 0.13, height: W*0.2, rx: 0.04, fill: LIGHT }, g);
mk('rect', { x: hl-0.14, y:  hw*0.46, width: 0.13, height: W*0.2, rx: 0.04, fill: LIGHT }, g);
mk('rect', { x: -hl+0.02, y: -hw*0.66, width: 0.11, height: W*0.2, rx: 0.03, fill: TAIL }, g);
mk('rect', { x: -hl+0.02, y:  hw*0.46, width: 0.11, height: W*0.2, rx: 0.03, fill: TAIL }, g);
}
function mirrors(x) {
mk('rect', { x: x, y: -(hw+0.07), width: 0.16, height: 0.1, rx: 0.03, fill: col, stroke: '#0b0b0b', 'stroke-width': 0.02 }, g);
mk('rect', { x: x, y:  hw-0.03, width: 0.16, height: 0.1, rx: 0.03, fill: col, stroke: '#0b0b0b', 'stroke-width': 0.02 }, g);
}
const sterzante = cx => sterzo ? mk('g', { transform: `rotate(${sterzo} ${cx} 0)` }, g) : g;
if (kind === 'bike') {
mk('rect', { x: -hl, y: -0.05, width: 0.60, height: 0.10, rx: 0.03, fill: '#222' }, g);
mk('line', { x1: -hl+0.5, y1: 0, x2: hl-0.44, y2: 0, stroke: col, 'stroke-width': 0.07, 'stroke-linecap': 'round' }, g);
const st = sterzante(hl-0.5);
mk('rect', { x: hl-0.60, y: -0.05, width: 0.60, height: 0.10, rx: 0.03, fill: '#222' }, st);
mk('line', { x1: hl-0.5, y1: -hw*0.9, x2: hl-0.5, y2: hw*0.9, stroke: '#222', 'stroke-width': 0.06, 'stroke-linecap': 'round' }, st);
mk('rect', { x: -hl+0.52, y: -W*0.24, width: L*0.16, height: W*0.48, rx: 0.05, fill: '#1a1a1a' }, g);
mk('circle', { cx: 0, cy: 0, r: W*0.14, fill: '#333' }, g);
if (e.catId === 'cargobike') {
mk('rect', { x: hl - 0.62 - L*0.3, y: -hw*0.92, width: L*0.3, height: W*0.92, rx: 0.06, fill: col, stroke: '#0b0b0b', 'stroke-width': 0.03 }, g);
mk('rect', { x: hl - 0.62 - L*0.3 + 0.06, y: -hw*0.92 + 0.06, width: L*0.3 - 0.12, height: W*0.92 - 0.12, rx: 0.04, fill: 'rgba(0,0,0,.25)' }, g);
}
return;
}
if (kind === 'monopattino') {
mk('rect', { x: -hl, y: -0.045, width: 0.24, height: 0.09, rx: 0.03, fill: '#111' }, g);
mk('rect', { x: -hl+0.18, y: -W*0.34, width: L-0.36, height: W*0.68, rx: 0.06, fill: col, stroke: '#0b0b0b', 'stroke-width': 0.03 }, g);
const st = sterzante(hl-0.12);
mk('rect', { x: hl-0.24, y: -0.045, width: 0.24, height: 0.09, rx: 0.03, fill: '#111' }, st);
mk('circle', { cx: hl-0.12, cy: 0, r: W*0.13, fill: '#333' }, st);
mk('rect', { x: hl-0.15, y: -hw*0.95, width: 0.09, height: hw*1.9, rx: 0.04, fill: '#222' }, st);
return;
}
if (kind === 'moto') {
mk('rect', { x: -hl, y: -W*0.17, width: 0.5, height: W*0.34, rx: 0.09, fill: '#111' }, g);
const st = sterzante(hl-0.58);
mk('rect', { x: hl-0.5, y: -W*0.17, width: 0.5, height: W*0.34, rx: 0.09, fill: '#111' }, st);
mk('rect', { x: -hl+0.42, y: -hw*0.92, width: L-0.84, height: W*0.92, rx: W*0.44, fill: col, stroke: '#0b0b0b', 'stroke-width': 0.04 }, g);
mk('rect', { x: -hl+0.58, y: -hw*0.5, width: L*0.34, height: W*0.5, rx: 0.08, fill: '#1a1a1a' }, g);
const st2 = sterzante(hl-0.58);
mk('rect', { x: hl-0.62, y: -hw*0.98, width: 0.09, height: hw*1.96, rx: 0.04, fill: '#111' }, st2);
mk('circle', { cx: hl-0.2, cy: 0, r: W*0.15, fill: LIGHT }, st2);
return;
}
if (kind === 'artic' || kind === 'roadtrain') {
const ww = W*0.16, cab = L * (kind === 'artic' ? 0.26 : 0.2);
wheel(-hl+L*0.12, -hw+ww*0.55, L*0.07, ww); wheel(-hl+L*0.12, hw-ww*0.55, L*0.07, ww);
if (kind === 'artic') {
mk('rect', { x: -hl, y: -hw, width: L-cab-0.18, height: W, rx: 0.08, fill: '#dcd7c9', stroke: '#0b0b0b', 'stroke-width': 0.05 }, g);
for (let x = -hl+0.8; x < hl-cab-0.6; x += 1.2) mk('line', { x1: x, y1: -hw+0.06, x2: x, y2: hw-0.06, stroke: 'rgba(0,0,0,.12)', 'stroke-width': 0.03 }, g);
} else {
const bL = (L-cab)*0.5 - 0.2;
mk('rect', { x: -hl, y: -hw, width: bL, height: W, rx: 0.06, fill: '#d2ccbc', stroke: '#0b0b0b', 'stroke-width': 0.05 }, g);
mk('line', { x1: -hl+bL, y1: 0, x2: -hl+bL+0.3, y2: 0, stroke: '#0b0b0b', 'stroke-width': 0.08 }, g);
mk('rect', { x: -hl+(L-cab)*0.5+0.08, y: -hw, width: bL, height: W, rx: 0.06, fill: '#dcd7c9', stroke: '#0b0b0b', 'stroke-width': 0.05 }, gAnt);
}
wheel(hl-L*0.10, -hw+ww*0.55, L*0.07, ww, true, gAnt); wheel(hl-L*0.10, hw-ww*0.55, L*0.07, ww, true, gAnt);
mk('rect', { x: hl-cab, y: -hw, width: cab, height: W, rx: 0.18, fill: col, stroke: '#0b0b0b', 'stroke-width': 0.05 }, gAnt);
mk('path', { d: `M${hl-cab+0.08} ${-hw*0.8} L${hl-0.14} ${-hw*0.6} L${hl-0.14} ${hw*0.6} L${hl-cab+0.08} ${hw*0.8} Z`, fill: GLASS }, gAnt);
if (sn) {
g.appendChild(gAnt);
mk('circle', { cx: sn.px, cy: 0, r: Math.min(0.22, W*0.09), fill: '#fff', stroke: '#0b0b0b', 'stroke-width': 0.04 }, g);
}
return;
}
if (kind === 'trailer') {
const ww = W*0.18;
if (e.catId === 'rimagri') {
const bl = L - 1.1;
wheel(-hl + bl*0.5, -hw + ww*0.5, L*0.16, ww); wheel(-hl + bl*0.5, hw - ww*0.5, L*0.16, ww);
mk('rect', { x: -hl, y: -hw*0.86, width: bl, height: W*0.86, rx: 0.06, fill: col, stroke: '#0b0b0b', 'stroke-width': 0.06 }, g);
mk('rect', { x: -hl + 0.12, y: -hw*0.86 + 0.12, width: bl - 0.24, height: W*0.86 - 0.24, fill: 'rgba(0,0,0,.28)' }, g);
for (let x = -hl + 0.5; x < -hl + bl - 0.3; x += 0.6) mk('line', { x1: x, y1: -hw*0.86, x2: x, y2: hw*0.86, stroke: 'rgba(0,0,0,.35)', 'stroke-width': 0.04 }, g);
mk('path', { d: `M${-hl + bl} ${-hw*0.6} L${hl - 0.08} 0 L${-hl + bl} ${hw*0.6}`, fill: 'none', stroke: '#222', 'stroke-width': 0.09, 'stroke-linejoin': 'round' }, g);
mk('circle', { cx: hl - 0.08, cy: 0, r: 0.08, fill: 'none', stroke: '#111', 'stroke-width': 0.04 }, g);
return;
}
wheel(-hl+L*0.2, -hw+ww*0.55, L*0.1, ww); wheel(-hl+L*0.2, hw-ww*0.55, L*0.1, ww);
mk('rect', { x: -hl, y: -hw, width: L-0.3, height: W, rx: 0.08, fill: '#dcd7c9', stroke: '#0b0b0b', 'stroke-width': 0.05 }, g);
mk('line', { x1: hl-0.3, y1: 0, x2: hl, y2: 0, stroke: '#0b0b0b', 'stroke-width': 0.08 }, g);
return;
}
if (kind === 'combine') {
const tw = L*0.14, bwid = W*0.62;
wheel(hl - tw - L*0.16, -bwid/2 - W*0.06, L*0.2, W*0.14); wheel(hl - tw - L*0.16, bwid/2 + W*0.06, L*0.2, W*0.14);
wheel(-hl + L*0.14, -bwid/2 + W*0.02, L*0.12, W*0.1, true); wheel(-hl + L*0.14, bwid/2 - W*0.02, L*0.12, W*0.1, true);
mk('rect', { x: hl - tw, y: -hw, width: tw, height: W, rx: 0.06, fill: '#d8c24a', stroke: '#0b0b0b', 'stroke-width': 0.05 }, g);
for (let y = -hw + 0.25; y < hw - 0.1; y += 0.3) mk('line', { x1: hl - tw + 0.05, y1: y, x2: hl - 0.03, y2: y, stroke: 'rgba(0,0,0,.35)', 'stroke-width': 0.03 }, g);
mk('line', { x1: hl - tw*0.55, y1: -hw + 0.05, x2: hl - tw*0.55, y2: hw - 0.05, stroke: '#7a6a20', 'stroke-width': 0.1 }, g);
mk('rect', { x: -hl, y: -bwid/2, width: L - tw - 0.1, height: bwid, rx: 0.2, fill: col, stroke: '#0b0b0b', 'stroke-width': 0.05 }, g);
mk('rect', { x: hl - tw - L*0.2, y: -bwid*0.36, width: L*0.16, height: bwid*0.72, rx: 0.1, fill: GLASS }, g);
mk('rect', { x: -hl*0.3, y: -bwid*0.4, width: L*0.22, height: bwid*0.8, rx: 0.08, fill: 'rgba(0,0,0,.28)', stroke: 'rgba(0,0,0,.4)', 'stroke-width': 0.03 }, g);
mk('line', { x1: -hl*0.1, y1: -bwid*0.4, x2: -hl*0.6, y2: -hw - 0.2, stroke: '#444', 'stroke-width': 0.18, 'stroke-linecap': 'round' }, g);
return;
}
if (kind === 'quad') {
const ww = W*0.26, wl = L*0.22;
const st = sterzo ? mk('g', { transform: `rotate(${sterzo} ${hl*0.62} 0)` }) : g;
wheel(-hl*0.62, -hw + ww/2, wl, ww); wheel(-hl*0.62, hw - ww/2, wl, ww);
wheel(hl*0.62, -hw + ww/2, wl, ww, true); wheel(hl*0.62, hw - ww/2, wl, ww, true);
mk('rect', { x: -hl*0.86, y: -hw*0.5, width: L*0.86, height: W*0.5, rx: 0.12, fill: col, stroke: '#0b0b0b', 'stroke-width': 0.04 }, g);
mk('rect', { x: hl*0.3, y: -hw*0.62, width: L*0.22, height: W*0.62, rx: 0.1, fill: col, stroke: '#0b0b0b', 'stroke-width': 0.04 }, g);
mk('rect', { x: -hl*0.5, y: -hw*0.24, width: L*0.34, height: W*0.24, rx: 0.08, fill: '#1a1a1a' }, g);
[-hl*0.82, hl*0.62].forEach(x => mk('rect', { x: x - 0.1, y: -hw*0.4, width: 0.2, height: W*0.4, fill: 'none', stroke: '#222', 'stroke-width': 0.03 }, g));
mk('rect', { x: hl*0.16, y: -hw*0.74, width: 0.08, height: W*0.74, rx: 0.04, fill: '#111' }, st);
if (st !== g) g.appendChild(st);
return;
}
if (kind === 'carrozzina') {
mk('rect', { x: -hl*0.7, y: -hw, width: L*0.6, height: W*0.14, rx: 0.05, fill: TYRE }, g);
mk('rect', { x: -hl*0.7, y: hw - W*0.14, width: L*0.6, height: W*0.14, rx: 0.05, fill: TYRE }, g);
mk('rect', { x: -hl*0.55, y: -hw*0.66, width: L*0.56, height: W*0.66, rx: 0.06, fill: col, stroke: '#0b0b0b', 'stroke-width': 0.03 }, g);
mk('rect', { x: -hl*0.72, y: -hw*0.66, width: L*0.1, height: W*0.66, rx: 0.04, fill: '#333' }, g);
mk('rect', { x: hl*0.55, y: -hw*0.5, width: L*0.14, height: W*0.5, rx: 0.04, fill: '#555' }, g);
[-1, 1].forEach(s => { mk('circle', { cx: hl*0.5, cy: s*hw*0.62, r: Math.min(0.07, W*0.06), fill: TYRE }, g);
mk('line', { x1: -hl*0.3, y1: s*hw*0.75, x2: hl*0.5, y2: s*hw*0.62, stroke: '#888', 'stroke-width': 0.03 }, g); });
return;
}
if (kind === 'ape') {
const ww = W*0.22;
wheel(hl-0.3, 0, 0.34, ww*0.9, true);
wheel(-hl+0.35, -hw+ww*0.5, 0.34, ww); wheel(-hl+0.35, hw-ww*0.5, 0.34, ww);
mk('rect', { x: -hl, y: -hw, width: L, height: W, rx: 0.16, fill: '#c9b87f', stroke: '#0b0b0b', 'stroke-width': 0.04 }, g);
mk('rect', { x: hl-L*0.42, y: -hw, width: L*0.42, height: W, rx: 0.16, fill: col, stroke: '#0b0b0b', 'stroke-width': 0.04 }, g);
shellp(`M${hl-L*0.34} ${-hw*0.7} L${hl-0.12} ${-hw*0.5} L${hl-0.12} ${hw*0.5} L${hl-L*0.34} ${hw*0.7} Z`, GLASS);
return;
}
if (kind === 'tract') {
const bw = W*0.42;
wheel(-hl*0.45, -(hw - W*0.15), L*0.30, W*0.34);
wheel(-hl*0.45,  (hw - W*0.15), L*0.30, W*0.34);
wheel(hl*0.66, -(hw*0.6), L*0.14, W*0.16, true);
wheel(hl*0.66,  (hw*0.6), L*0.14, W*0.16, true);
mk('rect', { x: -hl*0.7, y: -bw, width: L*0.62, height: bw*2, rx: 0.12, fill: col, stroke: '#0b0b0b', 'stroke-width': 0.05 }, g);
mk('rect', { x: hl*0.12, y: -bw*0.7, width: hl*0.72, height: bw*1.4, rx: 0.12, fill: col, stroke: '#0b0b0b', 'stroke-width': 0.04 }, g);
mk('rect', { x: -hl*0.66, y: -bw*0.94, width: L*0.34, height: bw*1.88, rx: 0.12, fill: ROOFL, stroke: 'rgba(0,0,0,.3)', 'stroke-width': 0.03 }, g);
mk('rect', { x: -hl*0.58, y: -bw*0.72, width: L*0.2, height: bw*1.44, rx: 0.08, fill: GLASS }, g);
mk('circle', { cx: hl*0.2, cy: -bw*0.9, r: Math.min(0.09, W*0.06), fill: '#1a1a1a' }, g);
return;
}
const ww = W*0.20, wl = L*0.15, off = hw - ww*0.16;
const B = (x, y, w, h, fill, rx, sw) => mk('rect', { x, y, width: w, height: h, rx: rx || 0.06, fill, stroke: '#0b0b0b', 'stroke-width': sw || 0.05 }, g);
const cabina = (cab) => {
B(hl-cab, -hw, cab, W, col, 0.16);
shellp(`M${hl-cab+0.06} ${-hw*0.82} L${hl-0.14} ${-hw*0.6} L${hl-0.14} ${hw*0.6} L${hl-cab+0.06} ${hw*0.82} Z`, GLASS);
mirrors(hl-cab-0.02);
};
const lampeggianti = (x, y1, y2, lw) => {
mk('rect', { x: x - lw/2, y: y1, width: lw, height: y2 - y1, rx: 0.04, fill: '#1d2b3a' }, g);
mk('rect', { x: x - lw/2 + 0.02, y: y1 + 0.02, width: lw - 0.04, height: (y2 - y1)*0.36, rx: 0.03, fill: '#2f7bff' }, g);
mk('rect', { x: x - lw/2 + 0.02, y: y2 - 0.02 - (y2 - y1)*0.36, width: lw - 0.04, height: (y2 - y1)*0.36, rx: 0.03, fill: '#2f7bff' }, g);
};
if (kind === 'truck') {
const cat = e.catId;
if (cat === 'operatrice') {
B(-hl, -hw, L*0.7, W*0.22, '#2a2a2a', 0.08); B(-hl, hw - W*0.22, L*0.7, W*0.22, '#2a2a2a', 0.08);
for (let x = -hl+0.15; x < -hl+L*0.7; x += 0.28) { mk('line', { x1: x, y1: -hw, x2: x, y2: -hw+W*0.22, stroke: '#555', 'stroke-width': 0.03 }, g); mk('line', { x1: x, y1: hw-W*0.22, x2: x, y2: hw, stroke: '#555', 'stroke-width': 0.03 }, g); }
B(-hl+L*0.06, -hw*0.78, L*0.58, W*0.78, col, 0.2);
B(-hl+L*0.36, -hw*0.74, L*0.22, W*0.36, GLASS, 0.06, 0.02);
mk('line', { x1: -hl+L*0.5, y1: hw*0.12, x2: hl-L*0.12, y2: hw*0.12, stroke: col, 'stroke-width': W*0.16, 'stroke-linecap': 'round' }, g);
mk('line', { x1: -hl+L*0.5, y1: hw*0.12, x2: hl-L*0.12, y2: hw*0.12, stroke: 'rgba(0,0,0,.35)', 'stroke-width': 0.03 }, g);
mk('path', { d: `M${hl-L*0.14} ${-hw*0.7} L${hl} ${-hw*0.85} L${hl} ${hw*0.85} L${hl-L*0.14} ${hw*0.7} Z`, fill: '#4a4a4a', stroke: '#0b0b0b', 'stroke-width': 0.05 }, g);
return;
}
wheel(hl*0.74, -off, wl*0.9, ww, true); wheel(hl*0.74, off, wl*0.9, ww, true);
wheel(-hl*0.30, -off, wl*0.9, ww); wheel(-hl*0.30, off, wl*0.9, ww);
wheel(-hl*0.62, -off, wl*0.9, ww); wheel(-hl*0.62, off, wl*0.9, ww);
const cab = L*0.24, bx = -hl, bw = L-cab-0.08;
if (cat === 'motrice') {
mk('line', { x1: -hl+0.1, y1: -hw*0.4, x2: hl-cab, y2: -hw*0.4, stroke: '#333', 'stroke-width': 0.12 }, g);
mk('line', { x1: -hl+0.1, y1: hw*0.4, x2: hl-cab, y2: hw*0.4, stroke: '#333', 'stroke-width': 0.12 }, g);
mk('circle', { cx: -hl*0.45, cy: 0, r: W*0.24, fill: '#8a8f96', stroke: '#0b0b0b', 'stroke-width': 0.05 }, g);
mk('path', { d: `M${-hl*0.45 - W*0.24} 0 L${-hl*0.45 + W*0.1} 0`, stroke: '#0b0b0b', 'stroke-width': 0.05 }, g);
} else if (cat === 'cisterna') {
B(bx, -hw*0.94, bw, W*0.94, '#c9ced5', W*0.45);
mk('rect', { x: bx + 0.2, y: -hw*0.2, width: bw - 0.4, height: hw*0.26, rx: 0.1, fill: 'rgba(255,255,255,.55)' }, g);
for (let x = bx + bw*0.2; x < bx + bw - 0.2; x += bw*0.2) mk('line', { x1: x, y1: -hw*0.92, x2: x, y2: hw*0.92, stroke: 'rgba(0,0,0,.25)', 'stroke-width': 0.05 }, g);
mk('line', { x1: bx + 0.4, y1: hw*0.5, x2: bx + bw - 0.4, y2: hw*0.5, stroke: '#6d737a', 'stroke-width': 0.1, 'stroke-dasharray': '0.18 0.1' }, g);
[0.25, 0.5, 0.75].forEach(f => mk('circle', { cx: bx + bw*f, cy: 0, r: W*0.08, fill: '#9aa0a8', stroke: '#555', 'stroke-width': 0.03 }, g));
mk('rect', { x: -hl + 0.02, y: -hw*0.34, width: 0.1, height: hw*0.68, fill: '#f08a00', stroke: '#111', 'stroke-width': 0.02 }, g);
} else if (cat === 'vvf') {
B(bx, -hw, bw, W, col, 0.08);
for (let x = bx + bw*0.25; x < bx + bw - 0.1; x += bw*0.25) mk('line', { x1: x, y1: -hw + 0.06, x2: x, y2: hw - 0.06, stroke: 'rgba(0,0,0,.25)', 'stroke-width': 0.03 }, g);
const sy = W*0.18, sx0 = bx + 0.15, sx1 = hl - cab*0.3;
[-1, 1].forEach(s => mk('line', { x1: sx0, y1: s*sy, x2: sx1, y2: s*sy, stroke: '#d8dde2', 'stroke-width': 0.08 }, g));
for (let x = sx0 + 0.1; x < sx1; x += 0.3) mk('line', { x1: x, y1: -sy, x2: x, y2: sy, stroke: '#d8dde2', 'stroke-width': 0.05 }, g);
mk('line', { x1: bx + 0.04, y1: -hw + 0.08, x2: bx + bw - 0.04, y2: -hw + 0.08, stroke: '#f6f6f6', 'stroke-width': 0.06 }, g);
mk('line', { x1: bx + 0.04, y1: hw - 0.08, x2: bx + bw - 0.04, y2: hw - 0.08, stroke: '#f6f6f6', 'stroke-width': 0.06 }, g);
cabina(cab); lampeggianti(hl - cab + 0.22, -hw*0.72, hw*0.72, 0.22); lampeggianti(-hl + 0.2, -hw*0.6, hw*0.6, 0.14);
return;
} else if (cat === 'betoniera') {
B(bx, -hw, bw, W, '#b9a27a', 0.04, 0.08);
mk('rect', { x: bx + 0.18, y: -hw + 0.18, width: bw - 0.36, height: W - 0.36, fill: '#9c8660', stroke: 'rgba(0,0,0,.35)', 'stroke-width': 0.04 }, g);
for (let x = bx + 0.5; x < bx + bw - 0.3; x += 0.55) mk('line', { x1: x, y1: -hw + 0.2, x2: x, y2: hw - 0.2, stroke: 'rgba(0,0,0,.2)', 'stroke-width': 0.04 }, g);
mk('circle', { cx: bx + 0.12, cy: -hw + 0.3, r: 0.1, fill: '#333' }, g); mk('circle', { cx: bx + 0.12, cy: hw - 0.3, r: 0.1, fill: '#333' }, g);
} else if (cat === 'carroattrezzi') {
B(bx, -hw, bw, W, '#9aa3ab', 0.04);
for (let y = -hw + 0.3; y < hw - 0.2; y += 0.35) mk('line', { x1: bx + 0.1, y1: y, x2: bx + bw - 0.1, y2: y, stroke: 'rgba(0,0,0,.18)', 'stroke-width': 0.03 }, g);
mk('line', { x1: bx + 0.06, y1: -hw + 0.06, x2: bx + bw - 0.06, y2: -hw + 0.06, stroke: '#f2b400', 'stroke-width': 0.08 }, g);
mk('line', { x1: bx + 0.06, y1: hw - 0.06, x2: bx + bw - 0.06, y2: hw - 0.06, stroke: '#f2b400', 'stroke-width': 0.08 }, g);
mk('line', { x1: bx + bw*0.45, y1: 0, x2: -hl - 0.05, y2: 0, stroke: '#333', 'stroke-width': W*0.12, 'stroke-linecap': 'round' }, g);
mk('circle', { cx: -hl + 0.05, cy: 0, r: W*0.08, fill: 'none', stroke: '#111', 'stroke-width': 0.05 }, g);
lampeggianti(hl - cab + 0.25, -hw*0.7, hw*0.7, 0.22);
} else {
B(bx, -hw, bw, W, '#dcd7c9', 0.06);
for (let x = -hl+0.6; x < hl-cab-0.3; x += 0.7) mk('line', { x1: x, y1: -hw+0.06, x2: x, y2: hw-0.06, stroke: 'rgba(0,0,0,.18)', 'stroke-width': 0.03 }, g);
}
cabina(cab);
return;
}
if (kind === 'bus') {
if (e.catId === 'tram') {
B(-hl, -hw, L, W, col, 0.5);
mk('rect', { x: -hl+0.3, y: -hw*0.7, width: L-0.6, height: W*0.7, rx: 0.2, fill: ROOFL }, g);
[hl, -hl].forEach(xe => { const s = Math.sign(xe);
shellp(`M${xe - s*0.7} ${-hw*0.78} L${xe - s*0.15} ${-hw*0.5} L${xe - s*0.15} ${hw*0.5} L${xe - s*0.7} ${hw*0.78} Z`, GLASS); });
for (let x = -hl+1.2; x < hl-1.2; x += 1.3) { mk('rect', { x, y: -hw+0.06, width: 0.9, height: 0.16, fill: GLASS }, g); mk('rect', { x, y: hw-0.22, width: 0.9, height: 0.16, fill: GLASS }, g); }
for (let i = 1; i < 3; i++) mk('line', { x1: -hl + L*i/3, y1: -hw, x2: -hl + L*i/3, y2: hw, stroke: 'rgba(0,0,0,.35)', 'stroke-width': 0.05 }, g);
const pc = 0, pw = W*0.34;
mk('path', { d: `M${pc - pw} 0 L${pc} ${-hw*0.5} L${pc + pw} 0 L${pc} ${hw*0.5} Z`, fill: 'none', stroke: '#222', 'stroke-width': 0.06 }, g);
mk('line', { x1: pc, y1: -hw*0.62, x2: pc, y2: hw*0.62, stroke: '#222', 'stroke-width': 0.1 }, g);
lightsFB();
return;
}
if (e.catId === 'autosnodato') {
const px = hl - L*0.58;
wheel(-hl*0.62, -off, wl, ww); wheel(-hl*0.62, off, wl, ww);
B(-hl, -hw, px - (-hl) - 0.35, W, col, 0.4);
mk('rect', { x: -hl+0.25, y: -hw*0.72, width: px - (-hl) - 0.8, height: W*0.72, rx: 0.25, fill: ROOFL }, g);
for (let x = -hl+0.6; x < px - 1; x += 1.1) { mk('rect', { x, y: -hw+0.06, width: 0.8, height: 0.18, fill: GLASS }, g); mk('rect', { x, y: hw-0.24, width: 0.8, height: 0.18, fill: GLASS }, g); }
mk('rect', { x: px - 0.4, y: -hw*0.92, width: 0.8, height: W*0.92, fill: '#2b2b2b' }, g);
for (let x = px - 0.35; x < px + 0.4; x += 0.12) mk('line', { x1: x, y1: -hw*0.9, x2: x, y2: hw*0.9, stroke: '#666', 'stroke-width': 0.03 }, g);
wheel(hl*0.7, -off, wl, ww, true, gAnt); wheel(hl*0.7, off, wl, ww, true, gAnt); wheel(px + 1.4, -off, wl, ww, false, gAnt); wheel(px + 1.4, off, wl, ww, false, gAnt);
mk('rect', { x: px + 0.35, y: -hw, width: hl - px - 0.35, height: W, rx: 0.4, fill: col, stroke: '#0b0b0b', 'stroke-width': 0.05 }, gAnt);
mk('rect', { x: px + 0.6, y: -hw*0.72, width: hl - px - 0.85, height: W*0.72, rx: 0.25, fill: ROOFL }, gAnt);
mk('path', { d: `M${hl-0.6} ${-hw*0.78} L${hl-0.12} ${-hw*0.55} L${hl-0.12} ${hw*0.55} L${hl-0.6} ${hw*0.78} Z`, fill: GLASS }, gAnt);
for (let x = px + 0.7; x < hl - 1; x += 1.1) { mk('rect', { x, y: -hw+0.06, width: 0.8, height: 0.18, fill: GLASS }, gAnt); mk('rect', { x, y: hw-0.24, width: 0.8, height: 0.18, fill: GLASS }, gAnt); }
if (gAnt !== g) g.appendChild(gAnt);
return;
}
wheel(hl*0.7, -off, wl, ww, true); wheel(hl*0.7, off, wl, ww, true);
wheel(-hl*0.62, -off, wl, ww); wheel(-hl*0.62, off, wl, ww);
mk('rect', { x: -hl, y: -hw, width: L, height: W, rx: 0.4, fill: col, stroke: '#0b0b0b', 'stroke-width': 0.05 }, g);
mk('rect', { x: -hl+0.25, y: -hw*0.72, width: L-0.5, height: W*0.72, rx: 0.25, fill: ROOFL }, g);
shellp(`M${hl-0.6} ${-hw*0.78} L${hl-0.12} ${-hw*0.55} L${hl-0.12} ${hw*0.55} L${hl-0.6} ${hw*0.78} Z`, GLASS);
for (let x = -hl+0.6; x < hl-1; x += 1.1) {
mk('rect', { x: x, y: -hw+0.06, width: 0.8, height: 0.18, fill: GLASS }, g);
mk('rect', { x: x, y:  hw-0.24, width: 0.8, height: 0.18, fill: GLASS }, g);
}
lightsFB();
return;
}
if (kind === 'van' && !FORMA_AUTO[e.catId]) {
wheel(hl*0.62, -off, wl, ww, true); wheel(hl*0.62, off, wl, ww, true);
wheel(-hl*0.6, -off, wl, ww); wheel(-hl*0.6, off, wl, ww);
mk('rect', { x: -hl, y: -hw, width: L, height: W, rx: 0.2, fill: col, stroke: '#0b0b0b', 'stroke-width': 0.05 }, g);
mk('rect', { x: hl-L*0.3, y: -hw*0.82, width: L*0.28, height: W*0.82, rx: 0.12, fill: ROOFL }, g);
shellp(`M${hl-L*0.3} ${-hw*0.82} L${hl-0.12} ${-hw*0.58} L${hl-0.12} ${hw*0.58} L${hl-L*0.3} ${hw*0.82} Z`, GLASS);
mk('line', { x1: hl-L*0.32, y1: -hw, x2: hl-L*0.32, y2: hw, stroke: 'rgba(0,0,0,.3)', 'stroke-width': 0.04 }, g);
mk('line', { x1: -hl+0.04, y1: 0, x2: -hl+0.5, y2: 0, stroke: 'rgba(0,0,0,.3)', 'stroke-width': 0.04 }, g);
if (e.catId === 'camper') {
mk('rect', { x: hl-L*0.36, y: -hw*0.9, width: L*0.1, height: W*0.9, rx: 0.1, fill: 'rgba(255,255,255,.35)', stroke: 'rgba(0,0,0,.25)', 'stroke-width': 0.03 }, g);
mk('rect', { x: -hl*0.2, y: -W*0.18, width: L*0.1, height: W*0.36, rx: 0.06, fill: 'rgba(255,255,255,.55)', stroke: 'rgba(0,0,0,.3)', 'stroke-width': 0.03 }, g);
mk('rect', { x: -hl*0.72, y: -W*0.15, width: L*0.08, height: W*0.3, rx: 0.06, fill: 'rgba(255,255,255,.55)', stroke: 'rgba(0,0,0,.3)', 'stroke-width': 0.03 }, g);
}
if (e.catId === 'ambulanza') {
const cs = Math.min(W*0.62, L*0.22), cx = -hl*0.2;
mk('rect', { x: cx - cs/2, y: -cs/2, width: cs, height: cs, rx: 0.05, fill: '#fff', stroke: 'rgba(0,0,0,.3)', 'stroke-width': 0.03 }, g);
mk('rect', { x: cx - cs*0.12, y: -cs*0.38, width: cs*0.24, height: cs*0.76, fill: '#d61f1f' }, g);
mk('rect', { x: cx - cs*0.38, y: -cs*0.12, width: cs*0.76, height: cs*0.24, fill: '#d61f1f' }, g);
lampeggianti(hl - L*0.33, -hw*0.75, hw*0.75, 0.2);
lampeggianti(-hl + 0.22, -hw*0.75, hw*0.75, 0.14);
}
lightsFB(); mirrors(hl-L*0.3-0.02);
return;
}
const sg = SAGOME[FORMA_AUTO[e.catId] || 'auto'];
const r = Math.min(0.6, W*sg.r);
wheel(hl*sg.ru, -off, wl, ww, true); wheel(hl*sg.ru, off, wl, ww, true);
wheel(-hl*sg.ru, -off, wl, ww); wheel(-hl*sg.ru, off, wl, ww);
mk('rect', { x: -hl, y: -hw, width: L, height: W, rx: r, ry: r, fill: col, stroke: '#0b0b0b', 'stroke-width': 0.05 }, g);
mk('rect', { x: -hl+0.12, y: -hw*0.42, width: L-0.24, height: W*0.2, rx: 0.1, fill: 'rgba(255,255,255,.10)' }, g);
const cF = hl*sg.cF, cB = hl*sg.cB, cW = hw*0.82;
if (sg.baule) {
mk('line', { x1: hl*0.5, y1: -hw*0.45, x2: hl*0.92, y2: -hw*0.4, stroke: 'rgba(0,0,0,.22)', 'stroke-width': 0.03 }, g);
mk('line', { x1: hl*0.5, y1: hw*0.45, x2: hl*0.92, y2: hw*0.4, stroke: 'rgba(0,0,0,.22)', 'stroke-width': 0.03 }, g);
mk('line', { x1: -hl*0.6, y1: -hw*0.78, x2: -hl*0.6, y2: hw*0.78, stroke: 'rgba(0,0,0,.3)', 'stroke-width': 0.035 }, g);
}
if (sg.aperto) {
mk('rect', { x: cB, y: -cW, width: cF-cB, height: cW*2, rx: 0.22, fill: '#2e2f33', stroke: 'rgba(0,0,0,.5)', 'stroke-width': 0.03 }, g);
const sx = cF - (cF - cB)*0.36, sl = (cF - cB)*0.26, sw = cW*0.7;
[-1, 1].forEach(s => mk('rect', { x: sx - sl/2, y: s > 0 ? cW*0.12 : -cW*0.12 - sw, width: sl, height: sw, rx: 0.08, fill: '#55575c' }, g));
mk('rect', { x: cB + 0.06, y: -cW*0.82, width: (cF - cB)*0.24, height: cW*1.64, rx: 0.08, fill: '#4a4c51' }, g);
mk('circle', { cx: sx + sl*0.85, cy: -cW*0.12 - sw/2, r: Math.min(0.18, sw*0.4), fill: 'none', stroke: '#111', 'stroke-width': 0.05 }, g);
mk('rect', { x: hl*sg.pB, y: -cW*0.9, width: cB - hl*sg.pB, height: cW*1.8, rx: 0.1, fill: '#1e1e20' }, g);
shellp(`M${cF} ${-cW} L${cF + 0.14} ${-hw*0.66} L${cF + 0.14} ${hw*0.66} L${cF} ${cW} Z`, GLASS);
} else {
mk('rect', { x: cB, y: -cW, width: cF-cB, height: cW*2, rx: 0.28, fill: ROOFL, stroke: 'rgba(0,0,0,.25)', 'stroke-width': 0.03 }, g);
shellp(`M${cF} ${-cW} L${hl*sg.pF} ${-hw*0.62} L${hl*sg.pF} ${hw*0.62} L${cF} ${cW} Z`, GLASS);
shellp(`M${cB} ${-cW} L${hl*sg.pB} ${-hw*0.62} L${hl*sg.pB} ${hw*0.62} L${cB} ${cW} Z`, GLASS);
}
if (sg.cassone) {
const x0 = -hl + 0.1, x1 = hl*sg.pB - 0.08;
mk('rect', { x: x0, y: -hw + 0.1, width: x1 - x0, height: W - 0.2, rx: 0.06, fill: 'rgba(0,0,0,.42)', stroke: 'rgba(0,0,0,.6)', 'stroke-width': 0.03 }, g);
for (let y = -hw + 0.28; y < hw - 0.2; y += 0.22) mk('line', { x1: x0 + 0.08, y1: y, x2: x1 - 0.08, y2: y, stroke: 'rgba(255,255,255,.14)', 'stroke-width': 0.04 }, g);
}
if (sg.barre) {
mk('line', { x1: cB + 0.15, y1: -cW*0.86, x2: cF - 0.15, y2: -cW*0.86, stroke: '#2a2a2a', 'stroke-width': 0.06 }, g);
mk('line', { x1: cB + 0.15, y1: cW*0.86, x2: cF - 0.15, y2: cW*0.86, stroke: '#2a2a2a', 'stroke-width': 0.06 }, g);
}
if (e.catId === 'taxi') {
const tx = (cF + cB)/2, tw = Math.min(0.55, (cF - cB)*0.35), th = W*0.5;
mk('rect', { x: tx - tw/2, y: -th/2, width: tw, height: th, rx: 0.05, fill: '#fff6c0', stroke: '#222', 'stroke-width': 0.03 }, g);
scritta(g, tx, 0, 'TAXI', Math.min(tw*0.42, th*0.3), '#222', 90);
}
if (e.catId === 'ffoo') {
lampeggianti((cF + cB)/2 + 0.15, -cW*0.92, cW*0.92, 0.24);
mk('line', { x1: -hl*0.85, y1: -hw + 0.07, x2: hl*0.85, y2: -hw + 0.07, stroke: '#d01818', 'stroke-width': 0.09 }, g);
mk('line', { x1: -hl*0.85, y1: hw - 0.07, x2: hl*0.85, y2: hw - 0.07, stroke: '#d01818', 'stroke-width': 0.09 }, g);
}
lightsFB(); mirrors(cF-0.06);
}
function drawPilota(g, e) {
const L = e.len, hl = L/2, k = e.kind;
const sx = k === 'moto' ? -hl + 0.58 + L*0.17 : k === 'bike' ? -hl + 0.52 + L*0.1 : -0.05;
const mx = k === 'moto' ? hl - 0.58 : k === 'bike' ? hl - 0.5 : hl - 0.12;
const sp = 0.22, pelle = '#3d3d3d';
[-1, 1].forEach(s => mk('line', { x1: sx + 0.02, y1: s*sp*0.8, x2: mx, y2: s*Math.min(sp*1.05, e.wid*0.48), stroke: pelle, 'stroke-width': 0.08, 'stroke-linecap': 'round' }, g));
mk('ellipse', { cx: sx, cy: 0, rx: 0.13, ry: sp, fill: '#4a4a4a', stroke: '#111', 'stroke-width': 0.03 }, g);
mk('circle', { cx: sx + 0.06, cy: 0, r: 0.12, fill: '#1c1c1c', stroke: '#fff', 'stroke-width': 0.02 }, g);
}
function scritta(g, x, y, str, fs, fill, giro) {
const gr = mk('g', { transform: `translate(${x} ${y})` }, g);
const t = N('text');
t.setAttribute('font-size', fs); t.setAttribute('text-anchor', 'middle'); t.setAttribute('dy', '0.35em');
t.setAttribute('fill', fill); t.setAttribute('font-weight', '700'); t.setAttribute('font-family', 'Arial,Helvetica,sans-serif');
t.setAttribute('transform', `rotate(${giro || 0})`);
t.textContent = str; gr.appendChild(t);
}
function patternPoints(e) {
const hl = e.len/2, hw = e.wid/2;
if (e.kind === 'moto' || e.kind === 'bike' || e.kind === 'monopattino') return [{ lx: hl, ly: 0 }, { lx: hl*0.35, ly: hw }, { lx: -hl, ly: 0 }];
if (e.len > 6.5) return [
{ lx: hl, ly: -hw }, { lx: hl, ly: hw }, { lx: 0, ly: hw },
{ lx: -hl, ly: hw }, { lx: -hl, ly: -hw }, { lx: 0, ly: -hw }];
return [{ lx: hl, ly: -hw }, { lx: hl, ly: hw }, { lx: -hl, ly: hw }, { lx: -hl, ly: -hw }];
}
function drawVehiclePoints(g, e) {
const pts = e.rilpts || patternPoints(e).map((p, i) => ({ lx: p.lx, ly: p.ly, n: (e.spigoliBase||1) + i }));
const rad = Math.max(0.24, e.wid*0.17);
pts.forEach((p0, i) => {
const p = Object.assign({}, p0, locale(e, p0.lx, p0.ly));
const gp = N('g'); gp.setAttribute('transform', `translate(${p.lx} ${p.ly})`);
gp.setAttribute('data-rilpt', i); gp.setAttribute('cursor', 'grab');
mk('circle', { cx: 0, cy: 0, r: rad, fill: '#fff', stroke: '#c00', 'stroke-width': rad*0.24 }, gp);
const t = N('text');
t.setAttribute('x', 0); t.setAttribute('y', 0); t.setAttribute('font-size', rad*1.3);
t.setAttribute('text-anchor', 'middle'); t.setAttribute('dy', '0.35em');
t.setAttribute('fill', '#c00'); t.setAttribute('font-weight', '700');
t.setAttribute('transform', `rotate(${-(e.rot||0)})`);
t.textContent = p.n;
gp.appendChild(t); g.appendChild(gp);
const r = (e.rot||0)*Math.PI/180;
ostacolo(t, (e.x||0) + p.lx*Math.cos(r) - p.ly*Math.sin(r), (e.y||0) + p.lx*Math.sin(r) + p.ly*Math.cos(r), rad);
});
}
const spec = l => l.map(p => [-p[0], p[1]]);
const BR_SUP = [[0.115, -0.31], [0.2, -0.17], [0.25, -0.03]], GB_SUP = [[0.055, 0.03], [0.085, 0.25], [0.105, 0.47]];
const BR_PRO = [[0.115, -0.31], [0.21, -0.4], [0.15, -0.52]], GB_PRO = [[0.055, 0.03], [0.075, 0.25], [0.085, 0.47]];
const POSE = {
supina: { braccia: [BR_SUP, spec(BR_SUP)], gambe: [GB_SUP, spec(GB_SUP)], busto: [-0.34, 0.04, 0.12, 0.095], testa: -0.42 },
prona:  { braccia: [BR_PRO, spec(BR_PRO)], gambe: [GB_PRO, spec(GB_PRO)], busto: [-0.34, 0.04, 0.12, 0.095], testa: -0.42 },
fianco: { braccia: [[[0.03, -0.3], [0.17, -0.22], [0.24, -0.1]], [[-0.01, -0.29], [0.07, -0.17], [0.16, -0.1]]],
gambe: [[[0.02, 0.02], [0.21, 0.15], [0.1, 0.37]], [[-0.02, 0.03], [0.13, 0.22], [0.02, 0.43]]],
busto: [-0.34, 0.04, 0.075, 0.065], testa: -0.42, profilo: true },
seduta: { braccia: [[[0.115, -0.06], [0.17, 0.06], [0.11, 0.17]], spec([[0.115, -0.06], [0.17, 0.06], [0.11, 0.17]])],
gambe: [[[0.055, 0.07], [0.12, 0.28], [0.08, 0.48]], spec([[0.055, 0.07], [0.12, 0.28], [0.08, 0.48]])],
busto: [-0.12, 0.08, 0.12, 0.1], testa: -0.13 }
};
function drawPersona(g, e) {
const H = e.size || 1.75, posa = e.posa || 'supina';
const P = POSE[posa] || POSE[posa === 'bici' ? 'prona' : 'supina'];
const col = e.color || '#2f4f7f', pelle = '#e2b48c', bordo = '#2a2a2a', scarpe = '#333';
const bambino = posa === 'bambino';
const k = v => +(v * H).toFixed(3);
const arto = (pts, w, c) => {
const d = 'M' + pts.map(p => `${k(p[0])} ${k(p[1])}`).join(' L');
mk('path', { d, fill: 'none', stroke: bordo, 'stroke-width': k(w) + k(0.024), 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
mk('path', { d, fill: 'none', stroke: c, 'stroke-width': k(w), 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
};
const calzoni = col === '#2f4f7f' ? '#3b4a5e' : col;
P.gambe.forEach(l => { arto(l, 0.1, calzoni); const f = l[2]; mk('circle', { cx: k(f[0]), cy: k(f[1] + 0.012), r: k(0.045), fill: scarpe }, g); });
P.braccia.forEach(l => { arto(l, 0.07, col); const m = l[2]; mk('circle', { cx: k(m[0]), cy: k(m[1]), r: k(0.032), fill: pelle, stroke: bordo, 'stroke-width': k(0.01) }, g); });
const [y0, y1, ls, la] = P.busto;
mk('path', { d: `M${k(-ls)} ${k(y0 + 0.05)} Q${k(-ls)} ${k(y0)} ${k(-ls + 0.05)} ${k(y0)} L${k(ls - 0.05)} ${k(y0)} Q${k(ls)} ${k(y0)} ${k(ls)} ${k(y0 + 0.05)}` +
` L${k(la)} ${k(y1)} Q0 ${k(y1 + 0.025)} ${k(-la)} ${k(y1)} Z`, fill: col, stroke: bordo, 'stroke-width': k(0.012), 'stroke-linejoin': 'round' }, g);
const rt = bambino ? 0.095 : 0.066, yt = P.testa;
if (posa === 'moto') {
mk('circle', { cx: 0, cy: k(yt), r: k(0.085), fill: e.casco || '#c0392b', stroke: bordo, 'stroke-width': k(0.012) }, g);
mk('path', { d: `M${k(-0.06)} ${k(yt - 0.035)} Q0 ${k(yt - 0.085)} ${k(0.06)} ${k(yt - 0.035)}`, fill: 'none', stroke: '#1b2733', 'stroke-width': k(0.03), 'stroke-linecap': 'round' }, g);
} else if (posa === 'bici') {
mk('ellipse', { cx: 0, cy: k(yt + 0.005), rx: k(0.07), ry: k(0.085), fill: e.casco || '#f1c40f', stroke: bordo, 'stroke-width': k(0.012) }, g);
[-0.03, 0, 0.03].forEach(x => mk('line', { x1: k(x), y1: k(yt - 0.05), x2: k(x), y2: k(yt + 0.04), stroke: bordo, 'stroke-width': k(0.01) }, g));
} else {
mk('circle', { cx: 0, cy: k(yt), r: k(rt), fill: pelle, stroke: bordo, 'stroke-width': k(0.012) }, g);
if (posa === 'prona') mk('circle', { cx: 0, cy: k(yt), r: k(rt * 0.86), fill: '#5a3d2b' }, g);
else if (posa === 'fianco') mk('path', { d: `M0 ${k(yt - rt)} A${k(rt)} ${k(rt)} 0 0 0 0 ${k(yt + rt)} Z`, fill: '#5a3d2b' }, g);
else { mk('path', { d: `M${k(-rt * 0.92)} ${k(yt - rt * 0.2)} A${k(rt)} ${k(rt)} 0 0 1 ${k(rt * 0.92)} ${k(yt - rt * 0.2)} Z`, fill: '#5a3d2b' }, g);
mk('circle', { cx: k(-rt * 0.35), cy: k(yt + rt * 0.1), r: k(rt * 0.1), fill: bordo }, g);
mk('circle', { cx: k(rt * 0.35), cy: k(yt + rt * 0.1), r: k(rt * 0.1), fill: bordo }, g); }
}
}
function drawSymbol(g, e) {
const s = e.size || 0.6, h = s / 2, col = e.color || '#333';
const sym = (e.sym === 'limite' && e.catId === 'zona30') ? 'zona30' : e.sym;
switch (sym) {
case 'impact':
{ let d = ''; const R = h, r = h * 0.42;
for (let i = 0; i < 16; i++) { const a = Math.PI * i / 8 - Math.PI/2; const rr = i % 2 ? r : R;
d += (i ? 'L' : 'M') + (Math.cos(a)*rr).toFixed(3) + ' ' + (Math.sin(a)*rr).toFixed(3) + ' '; }
mk('path', { d: d + 'Z', fill: col, stroke: '#600', 'stroke-width': 0.03 }, g);
mk('circle', { cx: 0, cy: 0, r: h*0.18, fill: '#fff' }, g);
} break;
case 'pedone': {
const H = s;
mk('circle', { cx: 0, cy: -H*0.52, r: H*0.19, fill: col }, g);
mk('rect', { x: -H*0.17, y: -H*0.30, width: H*0.34, height: H*0.40, rx: H*0.10, fill: col }, g);
mk('rect', { x: -H*0.29, y: -H*0.26, width: H*0.11, height: H*0.32, rx: H*0.055, fill: col }, g);
mk('rect', { x:  H*0.18, y: -H*0.26, width: H*0.11, height: H*0.32, rx: H*0.055, fill: col }, g);
mk('rect', { x: -H*0.15, y:  H*0.06, width: H*0.12, height: H*0.42, rx: H*0.06, fill: col }, g);
mk('rect', { x:  H*0.03, y:  H*0.06, width: H*0.12, height: H*0.42, rx: H*0.06, fill: col }, g);
break;
}
case 'cadavere': {
const H = e.size || 1.6;
mk('circle', { cx: 0, cy: -H*0.40, r: H*0.12, fill: col }, g);
mk('rect', { x: -H*0.13, y: -H*0.28, width: H*0.26, height: H*0.42, rx: H*0.10, fill: col }, g);
mk('path', { d: `M${-H*0.10} ${-H*0.16} L${-H*0.36} ${H*0.04}`, stroke: col, 'stroke-width': H*0.09, 'stroke-linecap': 'round' }, g);
mk('path', { d: `M${H*0.10} ${-H*0.16} L${H*0.36} ${H*0.04}`, stroke: col, 'stroke-width': H*0.09, 'stroke-linecap': 'round' }, g);
mk('path', { d: `M${-H*0.07} ${H*0.14} L${-H*0.13} ${H*0.46}`, stroke: col, 'stroke-width': H*0.10, 'stroke-linecap': 'round' }, g);
mk('path', { d: `M${H*0.07} ${H*0.14} L${H*0.13} ${H*0.46}`, stroke: col, 'stroke-width': H*0.10, 'stroke-linecap': 'round' }, g);
break;
}
case 'persona': drawPersona(g, e); break;
case 'blob':
mk('path', { d: blobPath(h), fill: col, opacity: 0.85 }, g); break;
case 'debris':
for (let i = 0; i < 7; i++) { const a = i*1.1, rr = h*(0.3+0.6*((i*7)%5)/5);
mk('circle', { cx: Math.cos(a)*rr, cy: Math.sin(a)*rr, r: h*0.12, fill: col }, g); }
break;
case 'object':
mk('rect', { x: -h*0.5, y: -h*0.5, width: s*0.5, height: s*0.5, fill: col, transform:'rotate(20)' }, g); break;
case 'hole':
mk('ellipse', { cx: 0, cy: 0, rx: h, ry: h*0.7, fill: col, stroke:'#000','stroke-width':0.03 }, g);
mk('ellipse', { cx: 0, cy: 0, rx: h*0.55, ry: h*0.4, fill: '#000', opacity:0.5 }, g);
break;
case 'caposaldo':
mk('path', { d: `M0 ${-h} L${h} 0 L0 ${h} L${-h} 0 Z`, fill: '#fff', stroke: col, 'stroke-width': 0.06 }, g);
mk('circle', { cx: 0, cy: 0, r: h*0.18, fill: col }, g);
break;
case 'palo':
mk('circle', { cx: 0, cy: 0, r: h, fill: '#fff', stroke: col, 'stroke-width': 0.06 }, g);
mk('circle', { cx: 0, cy: 0, r: h*0.35, fill: col }, g); break;
case 'semaforo': {
const st = e.stato || '', LUCI = [['rosso', '#e33', -h*0.5], ['giallo', '#fc3', 0], ['verde', '#3c6', h*0.5]];
mk('rect', { x: -h*0.5, y: -h, width: s*0.5, height: s, rx: 0.1, fill: '#222' }, g);
LUCI.forEach(([k, c, cy]) => {
const acceso = !st || st === k || (st === 'lampeggiante' && k === 'giallo');
if (st && acceso) mk('circle', { cx: 0, cy, r: h*0.34, fill: 'none', stroke: c, 'stroke-width': h*0.08,
'stroke-dasharray': st === 'lampeggiante' ? `${h*0.12} ${h*0.08}` : '' }, g);
mk('circle', { cx: 0, cy, r: h*0.2, fill: acceso ? c : '#4a4a4a', opacity: (st && !acceso) ? 0.8 : 1 }, g);
});
if (st === 'spento') mk('line', { x1: -h*0.6, y1: h*0.9, x2: h*0.6, y2: -h*0.9, stroke: '#888', 'stroke-width': h*0.08 }, g);
break;
}
case 'dirprec':
mk('path', { d: `M0 ${-h} L${h} 0 L0 ${h} L${-h} 0 Z`, fill: '#fff', stroke: '#222', 'stroke-width': 0.04 }, g);
mk('path', { d: `M0 ${-h*0.62} L${h*0.62} 0 L0 ${h*0.62} L${-h*0.62} 0 Z`, fill: '#f6c400' }, g); break;
case 'sorpasso': {
mk('circle', { cx: 0, cy: 0, r: h, fill: '#fff', stroke: '#c00', 'stroke-width': h*0.2 }, g);
const fr = mk('g', { transform: `rotate(${-(e.rot || 0)})` }, g);
const auto = (cx, c) => {
const q = mk('g', { transform: `translate(${cx} ${h*0.04}) scale(1.3)` }, fr), w = h*0.21;
mk('path', { d: `M${-w*0.72} ${-h*0.28} L${w*0.72} ${-h*0.28} L${w} ${-h*0.02} L${w} ${h*0.22} L${-w} ${h*0.22} L${-w} ${-h*0.02} Z`, fill: c }, q);
mk('rect', { x: -w*0.56, y: -h*0.22, width: w*1.12, height: h*0.14, rx: h*0.02, fill: '#fff' }, q);
mk('rect', { x: -w*0.95, y: h*0.2, width: w*0.42, height: h*0.14, rx: h*0.03, fill: c }, q);
mk('rect', { x: w*0.53, y: h*0.2, width: w*0.42, height: h*0.14, rx: h*0.03, fill: c }, q);
};
auto(-h*0.36, '#c00'); auto(h*0.36, '#111');
break;
}
case 'obbligo': {
mk('circle', { cx: 0, cy: 0, r: h, fill: '#1d5fbf', stroke: '#fff', 'stroke-width': h*0.08 }, g);
const giro = e.dir === 'destra' ? 90 : e.dir === 'sinistra' ? -90 : 0;
const fr = mk('g', { transform: `rotate(${giro})` }, g);
mk('path', { d: `M0 ${-h*0.62} L${h*0.36} ${-h*0.18} L${h*0.13} ${-h*0.18} L${h*0.13} ${h*0.6} L${-h*0.13} ${h*0.6} L${-h*0.13} ${-h*0.18} L${-h*0.36} ${-h*0.18} Z`, fill: '#fff' }, fr);
break;
}
case 'rotatoria_seg': {
mk('circle', { cx: 0, cy: 0, r: h, fill: '#1d5fbf', stroke: '#fff', 'stroke-width': h*0.08 }, g);
const R = h*0.5, P = a => [Math.cos(a)*R, -Math.sin(a)*R];
for (let i = 0; i < 3; i++) {
const a0 = (i*120 + 15) * Math.PI/180, a1 = (i*120 + 85) * Math.PI/180;
const [x0, y0] = P(a0), [x1, y1] = P(a1);
mk('path', { d: `M${x0} ${y0} A ${R} ${R} 0 0 0 ${x1} ${y1}`, fill: 'none', stroke: '#fff', 'stroke-width': h*0.15 }, g);
const tx = -Math.sin(a1), ty = -Math.cos(a1), nx = Math.cos(a1), ny = -Math.sin(a1), L2 = h*0.24, W2 = h*0.17;
mk('path', { d: `M${x1 + tx*L2} ${y1 + ty*L2} L${x1 + nx*W2} ${y1 + ny*W2} L${x1 - nx*W2} ${y1 - ny*W2} Z`, fill: '#fff' }, g);
}
break;
}
case 'attrav_seg': {
mk('rect', { x: -h, y: -h, width: s, height: s, rx: h*0.12, fill: '#1d5fbf' }, g);
const p = mk('g', { transform: `rotate(${-(e.rot || 0)})` }, g);
mk('path', { d: `M0 ${-h*0.8} L${h*0.84} ${h*0.68} L${-h*0.84} ${h*0.68} Z`, fill: '#fff' }, p);
for (let i = -2; i <= 2; i++) mk('rect', { x: i*h*0.2 - h*0.065, y: h*0.5, width: h*0.13, height: h*0.1, fill: '#111' }, p);
const tr = { fill: 'none', stroke: '#111', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
mk('circle', { cx: h*0.02, cy: -h*0.3, r: h*0.085, fill: '#111' }, p);
mk('path', Object.assign({ d: `M${h*0.0} ${-h*0.18} L${-h*0.06} ${h*0.1}`, 'stroke-width': h*0.12 }, tr), p);
mk('path', Object.assign({ d: `M${-h*0.06} ${h*0.1} L${-h*0.2} ${h*0.26} L${-h*0.28} ${h*0.42} M${-h*0.06} ${h*0.1} L${h*0.08} ${h*0.26} L${h*0.2} ${h*0.4}`, 'stroke-width': h*0.08 }, tr), p);
mk('path', Object.assign({ d: `M${-h*0.18} ${-h*0.02} L${-h*0.02} ${-h*0.12} L${h*0.16} ${h*0.0}`, 'stroke-width': h*0.065 }, tr), p);
break;
}
case 'zona30': {
const pn = mk('g', { transform: `rotate(${-(e.rot || 0)})` }, g);
mk('rect', { x: -h*0.78, y: -h, width: h*1.56, height: s, rx: h*0.1, fill: '#fff', stroke: '#111', 'stroke-width': h*0.06 }, pn);
const t = N('text'); t.setAttribute('x', 0); t.setAttribute('y', -h*0.62); t.setAttribute('font-size', h*0.34);
t.setAttribute('text-anchor', 'middle'); t.setAttribute('dy', '0.35em'); t.setAttribute('font-weight', '700');
t.setAttribute('font-family', 'Arial,Helvetica,sans-serif'); t.setAttribute('fill', '#111'); t.textContent = 'ZONA'; pn.appendChild(t);
mk('circle', { cx: 0, cy: h*0.22, r: h*0.6, fill: '#fff', stroke: '#c00', 'stroke-width': h*0.13 }, pn);
const n = N('text'); n.setAttribute('x', 0); n.setAttribute('y', h*0.24); n.setAttribute('font-size', h*0.56);
n.setAttribute('text-anchor', 'middle'); n.setAttribute('dy', '0.35em'); n.setAttribute('font-weight', '700');
n.setAttribute('font-family', 'Arial,Helvetica,sans-serif'); n.setAttribute('fill', '#111'); n.textContent = e.text || '30'; pn.appendChild(n);
break;
}
case 'terriccio': {
const P = [[0,0,.2],[.42,-.18,.13],[-.38,.22,.15],[.18,.46,.11],[-.2,-.44,.12],[.6,.28,.09],[-.62,-.12,.1],[.05,-.68,.08],[-.1,.7,.08],[.7,-.5,.07],[-.55,-.6,.07],[.5,.65,.07]];
P.forEach(p => mk('circle', { cx: p[0]*h, cy: p[1]*h, r: p[2]*h, fill: col }, g));
break;
}
case 'investimento':
mk('circle', { cx: 0, cy: 0, r: h, fill: '#fff', stroke: col, 'stroke-width': h*0.14 }, g);
mk('line', { x1: -h*0.7, y1: -h*0.7, x2: h*0.7, y2: h*0.7, stroke: col, 'stroke-width': h*0.12 }, g);
mk('line', { x1: h*0.7, y1: -h*0.7, x2: -h*0.7, y2: h*0.7, stroke: col, 'stroke-width': h*0.12 }, g);
mk('circle', { cx: 0, cy: 0, r: h*0.24, fill: col }, g);
break;
case 'macchia_c':
mk('path', { d: blobPath(h*0.82), fill: col, opacity: 0.8 }, g);
mk('circle', { cx: 0, cy: 0, r: h, fill: 'none', stroke: '#222', 'stroke-width': 0.035, 'stroke-dasharray': '0.12 0.07' }, g);
mk('line', { x1: -h, y1: 0, x2: h, y2: 0, stroke: '#222', 'stroke-width': 0.025 }, g);
mk('circle', { cx: 0, cy: 0, r: 0.04, fill: '#222' }, g);
break;
case 'macchia_r':
mk('path', { d: blobPath(h*0.8), fill: col, opacity: 0.8, transform: 'scale(1.25 0.8)' }, g);
mk('rect', { x: -h*1.1, y: -h*0.75, width: h*2.2, height: h*1.5, fill: 'none', stroke: '#222', 'stroke-width': 0.035, 'stroke-dasharray': '0.12 0.07' }, g);
[[-1.1,-.75],[1.1,-.75],[1.1,.75],[-1.1,.75]].forEach(p => mk('circle', { cx: p[0]*h, cy: p[1]*h, r: 0.045, fill: '#222' }, g));
break;
case 'segnale':
mk('path', { d: `M0 ${-h} L${h} ${h} L${-h} ${h} Z`, fill: '#fff', stroke: col, 'stroke-width': 0.1 }, g); break;
case 'albero':
mk('circle', { cx: 0, cy: 0, r: h, fill: col, opacity: 0.85 }, g);
mk('circle', { cx: 0, cy: 0, r: h*0.6, fill: '#1f5f1f', opacity: 0.5 }, g); break;
case 'idrante':
mk('rect', { x: -h*0.4, y: -h*0.6, width: s*0.4, height: s*0.9, rx: 0.06, fill: col }, g);
mk('circle', { cx: 0, cy: -h*0.6, r: h*0.25, fill: col }, g); break;
case 'tombino':
mk('rect', { x: -h, y: -h*0.8, width: s, height: s*0.8, fill: '#fff', stroke: col, 'stroke-width': 0.05 }, g);
for (let i=1;i<4;i++) mk('line',{x1:-h,y1:-h*0.8+i*s*0.8/4,x2:h,y2:-h*0.8+i*s*0.8/4,stroke:col,'stroke-width':0.03},g);
break;
case 'quiete':
mk('circle', { cx: 0, cy: 0, r: h, fill: 'none', stroke: col, 'stroke-width': 0.08, 'stroke-dasharray': '0.3 0.25' }, g);
mk('circle', { cx: 0, cy: 0, r: h*0.16, fill: col }, g);
break;
case 'animale':
mk('ellipse', { cx: 0, cy: 0, rx: h, ry: h*0.5, fill: col }, g);
mk('circle', { cx: h*0.85, cy: -h*0.1, r: h*0.28, fill: col }, g);
[-0.5,-0.1,0.3,0.7].forEach(fx => mk('line', { x1: h*fx, y1: h*0.4, x2: h*fx, y2: h*0.85, stroke: col, 'stroke-width': 0.08 }, g));
break;
case 'freccia_terra':
{ const l = e.size || 2, w2 = l*0.16, dir = e.dir || 'dritto';
const head = (tx, ty, ang) => {
const hl = l*0.22, hw = l*0.15, c = Math.cos(ang), s = Math.sin(ang), nx = -s, ny = c;
const bx = tx - c*hl, by = ty - s*hl;
mk('path', { d: `M${tx} ${ty} L${(bx+nx*hw).toFixed(3)} ${(by+ny*hw).toFixed(3)} L${(bx-nx*hw).toFixed(3)} ${(by-ny*hw).toFixed(3)} Z`, fill: col }, g);
};
if (dir === 'sx' || dir === 'dx') {
const sg = dir === 'dx' ? 1 : -1;
mk('path', { d: `M0 ${l*0.5} L0 ${-l*0.02} Q 0 ${-l*0.2} ${sg*l*0.18} ${-l*0.2} L ${sg*l*0.3} ${-l*0.2}`,
fill: 'none', stroke: col, 'stroke-width': w2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
head(sg*l*0.5, -l*0.2, sg > 0 ? 0 : Math.PI);
break;
}
mk('path', { d: `M0 ${l*0.5} L0 ${-l*0.26}`, fill: 'none', stroke: col, 'stroke-width': w2, 'stroke-linecap': 'round' }, g);
head(0, -l*0.5, -Math.PI/2);
if (dir === 'dritto_dx' || dir === 'dritto_sx') {
const sg = dir === 'dritto_dx' ? 1 : -1;
mk('path', { d: `M0 ${l*0.14} Q ${sg*l*0.02} ${-l*0.06} ${sg*l*0.22} ${-l*0.06} L ${sg*l*0.34} ${-l*0.06}`,
fill: 'none', stroke: col, 'stroke-width': w2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
head(sg*l*0.52, -l*0.06, sg > 0 ? 0 : Math.PI);
}
} break;
case 'cartello':
if (RS.cartelli) RS.cartelli.disegna(g, e); break;
case 'stop':
{ let d=''; for(let i=0;i<8;i++){const a=Math.PI/8+Math.PI*i/4; d+=(i?'L':'M')+(Math.cos(a)*h).toFixed(3)+' '+(Math.sin(a)*h).toFixed(3)+' ';}
mk('path', { d: d+'Z', fill: '#c00', stroke: '#fff', 'stroke-width': 0.06 }, g);
symText(g, 'STOP', h*0.5, '#fff', e.rot); } break;
case 'precedenza':
mk('path', { d: `M${-h} ${-h*0.85} L${h} ${-h*0.85} L0 ${h*0.9} Z`, fill: '#fff', stroke: '#c00', 'stroke-width': 0.12 }, g); break;
case 'divieto':
mk('circle', { cx: 0, cy: 0, r: h, fill: '#c00', stroke: '#fff', 'stroke-width': h*0.07 }, g);
mk('rect', { x: -h*0.66, y: -h*0.17, width: h*1.32, height: h*0.34, fill: '#fff', transform: `rotate(${-(e.rot || 0)})` }, g); break;
case 'limite':
mk('circle', { cx: 0, cy: 0, r: h, fill: '#fff', stroke: '#c00', 'stroke-width': 0.14 }, g);
symText(g, e.text || '50', h*0.9, '#111', e.rot); break;
case 'sos':
mk('rect', { x: -h * 0.62, y: -h, width: h * 1.24, height: s, rx: h * 0.22, fill: col, stroke: '#7a4a00', 'stroke-width': 0.04 }, g);
symText(g, 'SOS', h * 0.52, '#fff', e.rot); break;
case 'telecamera':
mk('rect', { x: -h * 0.95, y: -h * 0.45, width: h * 1.5, height: h * 0.9, rx: h * 0.15, fill: '#333' }, g);
mk('path', { d: `M${h * 0.55} ${-h * 0.3} L${h * 1.1} ${-h * 0.62} L${h * 1.1} ${h * 0.62} L${h * 0.55} ${h * 0.3} Z`, fill: '#5a5a5a' }, g);
mk('circle', { cx: -h * 0.5, cy: 0, r: h * 0.17, fill: '#9cd8ff' }, g); break;
case 'casco':
mk('path', { d: `M${-h} ${h * 0.1} a ${h} ${h} 0 0 1 ${s} 0 Z`, fill: col, stroke: '#7a1010', 'stroke-width': 0.04 }, g);
mk('path', { d: `M${-h} ${h * 0.1} L${h} ${h * 0.1}`, stroke: '#7a1010', 'stroke-width': 0.05 }, g);
mk('path', { d: `M${-h * 0.5} ${-h * 0.22} a ${h * 0.5} ${h * 0.5} 0 0 1 ${h} 0`, fill: 'none', stroke: '#fff', 'stroke-width': 0.05 }, g); break;
case 'targa':
mk('rect', { x: -h, y: -h * 0.34, width: s, height: h * 0.68, rx: h * 0.08, fill: '#fff', stroke: '#111', 'stroke-width': 0.05 }, g);
mk('rect', { x: -h, y: -h * 0.34, width: h * 0.24, height: h * 0.68, rx: h * 0.08, fill: '#1b3fa0' }, g);
mk('rect', { x: h * 0.76, y: -h * 0.34, width: h * 0.24, height: h * 0.68, rx: h * 0.08, fill: '#1b3fa0' }, g);
mk('line', { x1: -h * 0.5, y1: 0, x2: h * 0.62, y2: 0, stroke: '#111', 'stroke-width': 0.07, 'stroke-dasharray': '0.1 0.09' }, g); break;
case 'biciterra':
mk('circle', { cx: -h * 0.55, cy: 0, r: h * 0.36, fill: 'none', stroke: col, 'stroke-width': 0.07 }, g);
mk('circle', { cx: h * 0.55, cy: 0, r: h * 0.36, fill: 'none', stroke: col, 'stroke-width': 0.07 }, g);
mk('path', { d: `M${-h * 0.55} 0 L${-h * 0.08} ${-h * 0.3} L${h * 0.35} 0`, fill: 'none', stroke: col, 'stroke-width': 0.06 }, g);
mk('path', { d: `M${-h * 0.08} ${-h * 0.3} L${h * 0.2} ${-h * 0.33}`, fill: 'none', stroke: col, 'stroke-width': 0.06 }, g);
mk('path', { d: `M${h * 0.55} 0 L${h * 0.42} ${-h * 0.33}`, fill: 'none', stroke: col, 'stroke-width': 0.06 }, g); break;
case 'lavori': {
const T = (x, y) => `${(x*h).toFixed(3)} ${(y*h).toFixed(3)}`;
mk('path', { d: `M${T(0, -1)} L${T(1.06, 0.86)} L${T(-1.06, 0.86)} Z`, fill: '#d81f26', stroke: '#fff', 'stroke-width': h*0.05, 'stroke-linejoin': 'round' }, g);
mk('path', { d: `M${T(0, -0.6)} L${T(0.72, 0.66)} L${T(-0.72, 0.66)} Z`, fill: '#f2d024' }, g);
const nero = { fill: 'none', stroke: '#111', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
mk('path', { d: `M${T(0.06, 0.6)} Q${T(0.2, 0.36)} ${T(0.32, 0.46)} Q${T(0.42, 0.34)} ${T(0.52, 0.6)} Z`, fill: '#111' }, g);
mk('path', Object.assign({ d: `M${T(-0.36, 0.6)} L${T(-0.2, 0.3)} L${T(-0.08, 0.6)}`, 'stroke-width': h*0.1 }, nero), g);
mk('path', Object.assign({ d: `M${T(-0.2, 0.3)} L${T(-0.12, -0.02)}`, 'stroke-width': h*0.13 }, nero), g);
mk('circle', { cx: 0.0, cy: -h*0.13, r: h*0.09, fill: '#111' }, g);
mk('path', Object.assign({ d: `M${T(-0.1, 0.04)} L${T(0.14, 0.2)}`, 'stroke-width': h*0.075 }, nero), g);
mk('path', Object.assign({ d: `M${T(-0.02, -0.04)} L${T(0.3, 0.46)}`, 'stroke-width': h*0.045 }, nero), g);
mk('path', { d: `M${T(0.24, 0.42)} L${T(0.38, 0.4)} L${T(0.36, 0.54)} L${T(0.22, 0.52)} Z`, fill: '#111' }, g);
break;
}
case 'chilometrica':
mk('line', { x1: 0, y1: h*0.5, x2: 0, y2: h*1.0, stroke: col, 'stroke-width': 0.1 }, g);
mk('rect', { x: -h, y: -h*0.55, width: s, height: h*1.05, rx: h*0.14, fill: '#fff', stroke: col, 'stroke-width': 0.08 }, g);
symText(g, e.text || 'km 0+000', h*0.42, '#111', e.rot);
break;
case 'triangolo':
mk('path', { d: `M0 ${-h} L${h * 1.1} ${h * 0.85} L${-h * 1.1} ${h * 0.85} Z`, fill: col, stroke: '#fff', 'stroke-width': h * 0.06, 'stroke-linejoin': 'round' }, g);
mk('path', { d: `M0 ${-h * 0.45} L${h * 0.6} ${h * 0.55} L${-h * 0.6} ${h * 0.55} Z`, fill: '#fff' }, g);
break;
case 'freccialum': {
mk('rect', { x: -h, y: -h * 0.62, width: s, height: h * 1.24, rx: h * 0.12, fill: '#1c1c1c', stroke: col, 'stroke-width': h * 0.07 }, g);
const T = (x, y) => `${(x * h).toFixed(3)} ${(y * h).toFixed(3)}`;
mk('path', { d: `M${T(-0.72, -0.16)} L${T(0.18, -0.16)} L${T(0.18, -0.42)} L${T(0.74, 0)} L${T(0.18, 0.42)} L${T(0.18, 0.16)} L${T(-0.72, 0.16)} Z`, fill: col }, g);
for (let i = -2; i <= 2; i++) mk('circle', { cx: h * 0.3 * i, cy: -h * 0.48, r: h * 0.05, fill: col }, g);
break;
}
case 'pmv': {
const t = String(e.text || 'INCIDENTE');
mk('rect', { x: -h, y: -h * 0.34, width: s, height: h * 0.68, rx: h * 0.06, fill: '#111', stroke: '#555', 'stroke-width': h * 0.04 }, g);
symText(g, t, Math.min(h * 0.36, s * 1.55 / Math.max(4, t.length)), col, e.rot);
break;
}
case 'cono':
mk('circle', { cx: 0, cy: 0, r: h, fill: col }, g);
mk('circle', { cx: 0, cy: 0, r: h*0.6, fill: '#fff' }, g);
mk('circle', { cx: 0, cy: 0, r: h*0.3, fill: col }, g); break;
case 'delineatore':
mk('rect', { x: -h*0.4, y: -h, width: h*0.8, height: h*2, rx: h*0.3, fill: '#fff', stroke: col, 'stroke-width': 0.05 }, g);
mk('rect', { x: -h*0.4, y: -h*0.2, width: h*0.8, height: h*0.5, fill: col }, g); break;
case 'fermata': {
mk('rect', { x: -h, y: -h, width: s, height: s, rx: h*0.12, fill: '#fff', stroke: '#1d5fbf', 'stroke-width': h*0.12 }, g);
const b = mk('g', { transform: `rotate(${-(e.rot || 0)})` }, g);
mk('rect', { x: -h*0.62, y: -h*0.62, width: h*1.24, height: h*0.92, rx: h*0.14, fill: '#1d5fbf' }, b);
mk('rect', { x: -h*0.48, y: -h*0.48, width: h*0.96, height: h*0.36, rx: h*0.05, fill: '#fff' }, b);
mk('rect', { x: -h*0.5, y: h*0.3, width: h*0.24, height: h*0.24, rx: h*0.06, fill: '#1d5fbf' }, b);
mk('rect', { x: h*0.26, y: h*0.3, width: h*0.24, height: h*0.24, rx: h*0.06, fill: '#1d5fbf' }, b);
mk('circle', { cx: -h*0.36, cy: h*0.1, r: h*0.08, fill: '#ffd54a' }, b); mk('circle', { cx: h*0.36, cy: h*0.1, r: h*0.08, fill: '#ffd54a' }, b);
break;
}
case 'distributore':
mk('rect', { x: -h*0.62, y: -h, width: h*1.24, height: s, rx: h*0.2, fill: col, stroke: '#0b0b0b', 'stroke-width': 0.04 }, g);
mk('rect', { x: -h*0.4, y: -h*0.72, width: h*0.8, height: h*0.52, rx: 0.05, fill: '#fff' }, g);
mk('path', { d: `M${h*0.62} ${-h*0.35} q ${h*0.55} 0 ${h*0.55} ${h*0.45} L${h*1.17} ${h*0.65}`, fill: 'none', stroke: '#0b0b0b', 'stroke-width': 0.06 }, g);
break;
case 'passlivello': {
const braccio = (a, b, c) => mk('rect', { x: -h*1.05 + b, y: -h*0.17 + b, width: h*2.1 - 2*b, height: h*0.34 - 2*b, fill: c, transform: `rotate(${a})` }, g);
braccio(45, 0, '#c00'); braccio(-45, 0, '#c00');
braccio(45, h*0.07, '#fff'); braccio(-45, h*0.07, '#fff');
break;
}
case 'disabile':
mk('rect', { x: -h, y: -h, width: s, height: s, rx: h*0.18, fill: '#1466b8' }, g);
mk('circle', { cx: -h*0.08, cy: -h*0.5, r: h*0.15, fill: '#fff' }, g);
mk('circle', { cx: h*0.02, cy: h*0.22, r: h*0.42, fill: 'none', stroke: '#fff', 'stroke-width': h*0.13 }, g);
mk('path', { d: `M${-h*0.08} ${-h*0.28} L${0} ${h*0.18} L${h*0.42} ${h*0.18}`, fill: 'none', stroke: '#fff', 'stroke-width': h*0.14, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
break;
case 'panchina':
mk('rect', { x: -s, y: -h*0.55, width: s*2, height: h*1.1, rx: h*0.2, fill: col, stroke: '#3a2a15', 'stroke-width': 0.03 }, g);
mk('line', { x1: -s, y1: -h*0.55, x2: s, y2: -h*0.55, stroke: '#3a2a15', 'stroke-width': 0.06 }, g);
for (let i = 1; i < 6; i++) { const x = -s + s*2*i/6; mk('line', { x1: x, y1: -h*0.5, x2: x, y2: h*0.5, stroke: '#3a2a15', 'stroke-width': 0.02 }, g); }
break;
case 'cestino':
mk('circle', { cx: 0, cy: 0, r: h, fill: col, stroke: '#1f3f1f', 'stroke-width': 0.04 }, g);
mk('circle', { cx: 0, cy: 0, r: h*0.55, fill: '#12240f', opacity: 0.6 }, g);
break;
case 'fioriera':
mk('rect', { x: -h, y: -h, width: s, height: s, rx: h*0.16, fill: col, stroke: '#4a3320', 'stroke-width': 0.04 }, g);
mk('circle', { cx: 0, cy: 0, r: h*0.62, fill: '#4da05e' }, g);
mk('circle', { cx: -h*0.2, cy: -h*0.15, r: h*0.22, fill: '#3f8f4f' }, g);
break;
case 'paracarro':
mk('circle', { cx: 0, cy: 0, r: h, fill: col, stroke: '#7a1010', 'stroke-width': 0.03 }, g);
mk('circle', { cx: 0, cy: 0, r: h*0.5, fill: '#fff' }, g);
break;
case 'dissuasore':
mk('circle', { cx: 0, cy: 0, r: h, fill: '#333', stroke: '#000', 'stroke-width': 0.03 }, g);
mk('circle', { cx: 0, cy: 0, r: h*0.45, fill: '#ffd21a' }, g);
break;
default:
mk('circle', { cx: 0, cy: 0, r: h, fill: col }, g);
}
}
function symText(g, str, fs, fill, rot) {
const t = N('text');
t.setAttribute('x', 0); t.setAttribute('y', 0);
t.setAttribute('font-size', fs); t.setAttribute('text-anchor', 'middle');
t.setAttribute('dy', '0.35em'); t.setAttribute('fill', fill);
t.setAttribute('font-weight', '700');
t.setAttribute('transform', `rotate(${-(rot||0)})`);
t.textContent = str; g.appendChild(t);
}
function blobPath(h) {
let d = ''; const n = 9;
for (let i = 0; i < n; i++) {
const a = 2*Math.PI*i/n, rr = h*(0.7 + 0.5*((i*13)%7)/7);
d += (i ? 'L' : 'M') + (Math.cos(a)*rr).toFixed(3) + ' ' + (Math.sin(a)*rr).toFixed(3) + ' ';
}
return d + 'Z';
}
function laneLine(marks, x1, x2, y, style) {
if (style === 'none') return;
const wln = 0.1, off = 0.13;
if (style === 'double') {
mk('line', { x1, y1: y-off, x2, y2: y-off, stroke: '#fff', 'stroke-width': wln }, marks);
mk('line', { x1, y1: y+off, x2, y2: y+off, stroke: '#fff', 'stroke-width': wln }, marks);
return;
}
if (style === 'ddisc') {
mk('line', { x1, y1: y-off, x2, y2: y-off, stroke: '#fff', 'stroke-width': wln, 'stroke-dasharray': '1.5 1.5' }, marks);
mk('line', { x1, y1: y+off, x2, y2: y+off, stroke: '#fff', 'stroke-width': wln, 'stroke-dasharray': '1.5 1.5' }, marks);
return;
}
if (style === 'mixed') {
mk('line', { x1, y1: y-off, x2, y2: y-off, stroke: '#fff', 'stroke-width': wln }, marks);
mk('line', { x1, y1: y+off, x2, y2: y+off, stroke: '#fff', 'stroke-width': wln, 'stroke-dasharray': '1.5 1.5' }, marks);
return;
}
mk('line', { x1, y1: y, x2, y2: y, stroke: '#fff', 'stroke-width': wln, 'stroke-dasharray': style === 'cont' ? '' : '1.5 1.5' }, marks);
}
function edgeDash(style) {
if (style === 'disc') return '1.5 1.5';
if (style === 'wide') return '';
return '';
}
function edgeWidth(style) { return style === 'wide' ? 0.18 : 0.1; }
const SEZIONE_K = { cA: 1, cB: 1, corsia: 1, spart: 1, banch: 1, emerg: 1 };
function margini(o) {
const cA = Math.max(0, Math.round(+o.cA || 0)), cB = Math.max(0, Math.round(+o.cB || 0));
const banch = Math.max(0, o.banch != null ? +o.banch : 0.25), em = Math.max(0, +o.emerg || 0);
return { su: em > 0 && cB > 0 ? em : banch, giu: em > 0 && cA > 0 ? em : banch, banch, emerg: em };
}
function sezione(e) {
if (e.cA == null) return null;
const cA = Math.max(0, Math.round(+e.cA || 0)), cB = Math.max(0, Math.round(+e.cB || 0));
const n = Math.max(1, cA + cB), m = margini(e);
const spart = (cA && cB) ? Math.max(0, +e.spart || 0) : 0;
const corsia = Math.max(0.5, (e.wid - spart - m.su - m.giu) / n);
return { cA, cB, n, banch: m.banch, emerg: m.emerg, su: m.su, giu: m.giu, spart, corsia };
}
function avviaSezione(e) {
if (e.cA != null) return;
const n = Math.max(1, e.lanes || 2);
e.cA = Math.ceil(n / 2); e.cB = Math.floor(n / 2);
if (e.banch == null) e.banch = 0.25;
if (e.spart == null) e.spart = 0;
e.corsia = Math.round((e.wid - 2 * e.banch) / n * 100) / 100;
}
function aggiornaSezione(e, k) {
if (e.cA == null) return;
const s = sezione(e);
if (k === 'wid') { e.corsia = Math.round(s.corsia * 100) / 100; return; }
const corsia = Math.max(0.5, +e.corsia || 3.5);
e.wid = Math.round((s.n * corsia + s.spart + s.su + s.giu) * 100) / 100;
e.lanes = s.n;
}
function frecciaCorsia(par, x, y, lu, verso) {
const l = lu, w = Math.min(0.32, l * 0.07), hw = Math.min(0.55, l * 0.13), hl = l * 0.32;
const d = `M${-l/2} ${-w} L${l/2 - hl} ${-w} L${l/2 - hl} ${-hw} L${l/2} 0 L${l/2 - hl} ${hw} L${l/2 - hl} ${w} L${-l/2} ${w} Z`;
mk('path', { d, fill: '#fff', transform: `translate(${x} ${y})${verso < 0 ? ' rotate(180)' : ''}` }, par);
}
function drawRoadCorsie(g, e, s, marks) {
const L = e.len, W = e.wid, hl = L/2, hw = W/2;
const es = e.edge || 'cont', ew = edgeWidth(es), ed = edgeDash(es);
const yLane0 = -hw + s.su;
const yCentro = yLane0 + s.cB * s.corsia;
const yLaneA = yCentro + s.spart;
const yFine = yLaneA + s.cA * s.corsia;
if (es !== 'none') {
const yt = Math.max(yLane0, -hw + ew/2 + 0.05), yb = Math.min(yFine, hw - ew/2 - 0.05);
mk('line', { x1: -hl, y1: yt, x2: hl, y2: yt, stroke: '#fff', 'stroke-width': ew, 'stroke-dasharray': ed }, marks);
mk('line', { x1: -hl, y1: yb, x2: hl, y2: yb, stroke: '#fff', 'stroke-width': ew, 'stroke-dasharray': ed }, marks);
}
for (let i = 1; i < s.cB; i++) laneLine(marks, -hl, hl, yLane0 + i * s.corsia, 'disc');
for (let i = 1; i < s.cA; i++) laneLine(marks, -hl, hl, yLaneA + i * s.corsia, 'disc');
if (s.cA && s.cB) {
if (s.spart > 0) {
const tipo = e.spTipo || 'aiuola';
if (tipo === 'aiuola') {
mk('rect', { x: -hl, y: yCentro, width: L, height: s.spart, fill: '#cfc8b6', stroke: '#8a8478', 'stroke-width': 0.06 }, marks);
if (s.spart > 1.2) mk('rect', { x: -hl, y: yCentro + 0.3, width: L, height: s.spart - 0.6, fill: '#a9bf8e' }, marks);
if (es !== 'none') {
mk('line', { x1: -hl, y1: yCentro - 0.17, x2: hl, y2: yCentro - 0.17, stroke: '#fff', 'stroke-width': 0.1 }, marks);
mk('line', { x1: -hl, y1: yLaneA + 0.17, x2: hl, y2: yLaneA + 0.17, stroke: '#fff', 'stroke-width': 0.1 }, marks);
}
} else {
const yM = yCentro + s.spart / 2;
if (es !== 'none') {
mk('line', { x1: -hl, y1: yCentro + ew / 2, x2: hl, y2: yCentro + ew / 2, stroke: '#fff', 'stroke-width': ew }, marks);
mk('line', { x1: -hl, y1: yLaneA - ew / 2, x2: hl, y2: yLaneA - ew / 2, stroke: '#fff', 'stroke-width': ew }, marks);
}
barrieraCentrale(marks, tipo, -hl, hl, yM, Math.min(0.6, s.spart * 0.5));
}
} else {
laneLine(marks, -hl, hl, yCentro, e.line || 'disc');
}
}
if (e.frecce && L > 8) {
const lu = Math.min(4.5, L / 5), dx = hl - Math.min(6, L * 0.2) - lu / 2;
for (let i = 0; i < s.cB; i++) { const y = yLane0 + (i + 0.5) * s.corsia; frecciaCorsia(marks, -dx, y, lu, -1); if (L > 30) frecciaCorsia(marks, dx, y, lu, -1); }
for (let i = 0; i < s.cA; i++) { const y = yLaneA + (i + 0.5) * s.corsia; frecciaCorsia(marks, dx, y, lu, 1); if (L > 30) frecciaCorsia(marks, -dx, y, lu, 1); }
}
if (s.emerg > 0 && L >= 18) {
const lati = [];
if (s.cB > 0) lati.push((-hw + yLane0) / 2);
if (s.cA > 0) lati.push((yFine + hw) / 2);
lati.forEach(y => scrittaCorsia(marks, 'corsia di emergenza', 0, y, Math.min(0.7, s.emerg * 0.26), e.rot || 0));
}
}
function scrittaCorsia(par, testo, x, y, fs, rot) {
const r = (((rot || 0) % 360) + 360) % 360, a = r > 90 && r <= 270 ? 180 : 0;
const at = { x: +x.toFixed(3), y: +y.toFixed(3), 'font-size': fs, fill: '#fff', opacity: 0.8, 'text-anchor': 'middle', dy: '0.35em',
'font-style': 'italic', 'letter-spacing': fs * 0.05, class: 'scritta-corsia' };
if (a) at.transform = `rotate(180 ${at.x} ${at.y})`;
mk('text', at, par).textContent = testo;
}
function barrieraCentrale(par, tipo, x1, x2, y, w) {
const L = x2 - x1;
if (tipo === 'newjersey') {
mk('rect', { x: x1, y: y - w / 2, width: L, height: w, fill: '#dcdcdc', stroke: '#8f8f8f', 'stroke-width': 0.05 }, par);
mk('line', { x1, y1: y, x2, y2: y, stroke: '#b3b3b3', 'stroke-width': 0.06 }, par);
for (let x = x1 + 1.2; x < x2 - 0.05; x += 1.2) mk('line', { x1: x, y1: y - w / 2, x2: x, y2: y + w / 2, stroke: '#9a9a9a', 'stroke-width': 0.05 }, par);
return;
}
[-1, 1].forEach(k => mk('line', { x1, y1: y + k * w * 0.35, x2, y2: y + k * w * 0.35, stroke: '#555', 'stroke-width': 0.12 }, par));
for (let x = x1; x <= x2 + 0.001; x += 2) mk('line', { x1: x, y1: y - w * 0.35, x2: x, y2: y + w * 0.35, stroke: '#555', 'stroke-width': 0.08 }, par);
}
function latiMarc(o) {
const m = Math.max(0, +(o && o.marc) || 0);
return { dx: o && o.marcDx != null ? Math.max(0, +o.marcDx || 0) : m,
sx: o && o.marcSx != null ? Math.max(0, +o.marcSx || 0) : m };
}
function impostaMarc(o, k, v) {
const l = latiMarc(o), base = Math.max(l.dx, l.sx) || 1.5, r = x => Math.round(x * 100) / 100;
if (k === 'marcLati') {
l.dx = (v === 'entrambi' || v === 'dx') ? (l.dx || base) : 0;
l.sx = (v === 'entrambi' || v === 'sx') ? (l.sx || base) : 0;
} else l[k === 'marcDx' ? 'dx' : 'sx'] = Math.max(0, +v || 0);
if (l.dx === l.sx) { delete o.marcDx; delete o.marcSx; }
else { o.marcDx = r(l.dx); o.marcSx = r(l.sx); }
o.marc = r(Math.max(l.dx, l.sx));
}
function etichettaVia(g, testo, p, angolo, tot) {
const t = String(testo || '').trim(); if (!t) return;
const r = ((tot % 360) + 360) % 360, a = angolo + (r > 90 && r <= 270 ? 180 : 0), fs = 1.1;
const tx = mk('text', { x: +p.x.toFixed(3), y: +p.y.toFixed(3), 'font-size': fs, fill: '#fff', 'text-anchor': 'middle', dy: '0.27em',
'paint-order': 'stroke', stroke: '#2b3036', 'stroke-width': fs * 0.16, 'font-weight': 700, 'letter-spacing': fs * 0.04,
transform: `rotate(${+a.toFixed(2)} ${+p.x.toFixed(3)} ${+p.y.toFixed(3)})`, class: 'nome-via' }, g);
tx.textContent = t;
}
function postoVia(e, testo, cand, daLoc) {
const half = String(testo || '').trim().length * 1.1 * 0.31 + 0.6;
const altri = RS.scene.elements.filter(x => x !== e && !x.inc && (x.type === 'vehicle' || x.type === 'symbol' || x.type === 'road' || (x.type === 'roadway' && x.pts && x.pts.length > 1)));
const suTracciato = (w, x) => { const h = (x.width || 7) / 2 + 0.3; for (let i = 1; i < x.pts.length; i++) { const a = x.pts[i - 1], b = x.pts[i], dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy || 1, k = Math.max(0, Math.min(1, ((w.x - a.x) * dx + (w.y - a.y) * dy) / l2)); if (Math.hypot(w.x - a.x - dx * k, w.y - a.y - dy * k) < h) return true; } return false; };
const occupato = w => altri.some(x => {
if (x.type === 'road') {
const R = -(x.rot || 0) * Math.PI / 180, dx = w.x - x.x, dy = w.y - x.y, lx = dx * Math.cos(R) - dy * Math.sin(R), ly = dx * Math.sin(R) + dy * Math.cos(R);
return Math.abs(lx) < x.len / 2 + 0.3 && Math.abs(ly) < x.wid / 2 + 0.3;
}
if (x.type === 'roadway') return suTracciato(w, x);
const rr = x.type === 'vehicle' ? Math.max(x.len || 4, x.wid || 2) / 2 + 0.5 : (x.size || 1) / 2 + 0.5;
return Math.hypot(w.x - x.x, w.y - x.y) < rr;
});
for (const c of cand) {
const pts = [-1, -0.5, 0, 0.5, 1].map(s => daLoc({ x: c.p.x + c.u.x * half * s, y: c.p.y + c.u.y * half * s }));
if (!pts.some(occupato)) return c;
}
return cand[0];
}
function drawMarciapiedi(g, e) {
const lm = latiMarc(e); if (lm.dx <= 0 && lm.sx <= 0) return;
const L = e.len, hl = L/2, hw = e.wid/2;
const sp = N('g'); if (e.id) sp.setAttribute('mask', `url(#rms_${e.id})`);
[[-hw - lm.sx, -hw - 0.06, lm.sx], [hw, hw + 0.06, lm.dx]].forEach(([y, yk, m]) => {
if (m <= 0) return;
mk('rect', { x: -hl, y, width: L, height: m, fill: '#d8d2c4' }, sp);
mk('rect', { x: -hl, y, width: L, height: m, fill: 'url(#patAsfalto)', opacity: 0.35 }, sp);
mk('line', { x1: -hl, y1: yk, x2: hl, y2: yk, stroke: '#7d776b', 'stroke-width': 0.12 }, sp);
});
g.appendChild(sp);
}
function drawRoad(g, e) {
const L = e.len, W = e.wid, hl = L/2, hw = W/2;
drawMarciapiedi(g, e);
mk('rect', { x: -hl, y: -hw, width: L, height: W, fill: e.color || '#9aa0a6' }, g);
mk('rect', { x: -hl, y: -hw, width: L, height: W, fill: 'url(#patAsfalto)' }, g);
const marks = N('g'); if (e.id) marks.setAttribute('mask', `url(#rm_${e.id})`);
const lm = latiMarc(e);
if (!(lm.dx > 0) && !(lm.sx > 0)) {
if (e.inc) [-hw, hw].forEach(y => mk('line', { x1: -hl, y1: y, x2: hl, y2: y, stroke: '#6b7178', 'stroke-width': 0.05 }, marks));
else mk('rect', { x: -hl, y: -hw, width: L, height: W, fill: 'none', stroke: '#6b7178', 'stroke-width': 0.05 }, marks);
} else [[-hw, lm.sx], [hw, lm.dx]].forEach(([y, m]) => {
if (!(m > 0)) mk('line', { x1: -hl, y1: y, x2: hl, y2: y, stroke: '#6b7178', 'stroke-width': 0.05 }, marks);
});
const s = sezione(e);
const via = () => {
if (!String(e.nomeVia || '').trim()) return;
if (e.viaPos) { etichettaVia(g, e.nomeVia, e.viaPos, 0, e.rot || 0); return; }
const R = (e.rot || 0) * Math.PI / 180, c = Math.cos(R), s = Math.sin(R);
const daLoc = q => ({ x: e.x + q.x * c - q.y * s, y: e.y + q.x * s + q.y * c });
const yv = -hw / 2;
const cand = [0, -0.3, 0.3, -0.55, 0.55, -0.75, 0.75].filter(k => Math.abs(k * hl) + 3 < hl || k === 0).map(k => ({ p: { x: k * hl, y: yv }, u: { x: 1, y: 0 } }))
.concat([0, -0.4, 0.4].map(k => ({ p: { x: k * hl, y: -yv }, u: { x: 1, y: 0 } })));
const pc = postoVia(e, e.nomeVia, cand, daLoc);
etichettaVia(g, e.nomeVia, pc.p, 0, e.rot || 0);
};
if (s) { drawRoadCorsie(g, e, s, marks); g.appendChild(marks); via(); return; }
const es = e.edge || 'cont';
if (es !== 'none') {
const ew = edgeWidth(es), ed = edgeDash(es), yo = 0.12 + (ew - 0.1) / 2;
mk('line', { x1: -hl, y1: -hw+yo, x2: hl, y2: -hw+yo, stroke: '#fff', 'stroke-width': ew, 'stroke-dasharray': ed }, marks);
mk('line', { x1: -hl, y1: hw-yo, x2: hl, y2: hw-yo, stroke: '#fff', 'stroke-width': ew, 'stroke-dasharray': ed }, marks);
}
const lanes = Math.max(1, e.lanes || 2);
const style = e.line || 'disc';
for (let i = 1; i < lanes; i++) {
const y = -hw + (W * i / lanes);
const isCenter = (i === Math.round(lanes / 2));
laneLine(marks, -hl, hl, y, isCenter ? style : 'disc');
}
g.appendChild(marks); via();
}
function geometriaRaccordo(e) {
const a = (+e.ang || 90) * Math.PI / 180, th = Math.abs(a), sg = a >= 0 ? 1 : -1;
const R = Math.max(0.3, +e.R || 5), t = R / Math.tan(th / 2);
const u2 = { x: Math.cos(a), y: Math.sin(a) };
const bx = 1 + u2.x, by = u2.y, bl = Math.hypot(bx, by) || 1, dO = R / Math.sin(th / 2);
const O = { x: bx / bl * dO, y: by / bl * dO };
const T1 = { x: t, y: 0 }, T2 = { x: u2.x * t, y: u2.y * t };
const p2 = { x: -u2.y, y: u2.x }, k2 = (p2.x * O.x + p2.y * O.y) >= 0 ? 1 : -1;
const n1 = { x: 0, y: sg }, n2 = { x: p2.x * k2, y: p2.y * k2 };
return { a, th, sg, R, t, u2, O, T1, T2, n1, n2, sweep: sg > 0 ? 0 : 1 };
}
function suRaggio(G, P, r) { const dx = P.x - G.O.x, dy = P.y - G.O.y, l = Math.hypot(dx, dy) || 1; return { x: G.O.x + dx / l * r, y: G.O.y + dy / l * r }; }
function fmt(p) { return (+p.x.toFixed(3)) + ' ' + (+p.y.toFixed(3)); }
function asfaltoRaccordo(G) {
const o = 0.1, q = (p, n, k) => ({ x: p.x - n.x * k, y: p.y - n.y * k });
const C = { x: -(G.n1.x + G.n2.x) * o, y: -(G.n1.y + G.n2.y) * o };
return `M${fmt(C)} L${fmt(q(G.T1, G.n1, o))} L${fmt(G.T1)} A${G.R} ${G.R} 0 0 ${G.sweep} ${fmt(G.T2)} L${fmt(q(G.T2, G.n2, o))} Z`;
}
function puntiRaccordo(e) {
const G = geometriaRaccordo(e), m = Math.max(0, +e.marc || 0);
const r = (e.rot || 0) * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
const w = p => ({ x: e.x + p.x * c - p.y * s, y: e.y + p.x * s + p.y * c });
const pts = [{ x: 0, y: 0 }, G.T1, G.T2, suRaggio(G, { x: (G.T1.x + G.T2.x) / 2, y: (G.T1.y + G.T2.y) / 2 }, G.R)];
if (m > 0) pts.push(suRaggio(G, G.T1, Math.max(0, G.R - m)), suRaggio(G, G.T2, Math.max(0, G.R - m)));
return pts.map(w);
}
function formaRaccordo(e, quale) {
const G = geometriaRaccordo(e);
if (quale === 'marc') return asfaltoRaccordo(G);
const w = Math.max(e.doff != null ? +e.doff : 0.17, +e.d1 || 0, +e.d2 || 0) + 0.4, k = 0.3;
if (G.th < 60 * Math.PI / 180) {
const fascia = (u, n, L) => { const p = (a, b) => ({ x: u.x * a + n.x * b, y: u.y * a + n.y * b });
const q = [p(-0.5, k), p(L + 0.05, k), p(L + 0.05, -w), p(-0.5, -w)];
if (u.x * n.y - u.y * n.x < 0) q.reverse();
return 'M' + q.map(fmt).join(' L') + ' Z'; };
return fascia({ x: 1, y: 0 }, G.n1, G.T1.x) + ' ' + fascia(G.u2, G.n2, Math.hypot(G.T2.x, G.T2.y));
}
const P = [
{ x: G.T1.x, y: G.n1.y * k }, { x: G.T1.x, y: -G.n1.y * w },
{ x: -(G.n1.x + G.n2.x) * w, y: -(G.n1.y + G.n2.y) * w },
{ x: G.T2.x - G.n2.x * w, y: G.T2.y - G.n2.y * w }, { x: G.T2.x + G.n2.x * k, y: G.T2.y + G.n2.y * k },
{ x: (G.n1.x + G.n2.x) * k, y: (G.n1.y + G.n2.y) * k }
];
return 'M' + P.map(fmt).join(' L') + ' Z';
}
function drawRaccordo(g, e) {
const G = geometriaRaccordo(e), R = G.R, m = Math.max(0, +e.marc || 0);
if (m > 0) {
const ri = Math.max(0, R - m);
const d = ri > 0.05
? `M${fmt(G.T1)} A${R} ${R} 0 0 ${G.sweep} ${fmt(G.T2)} L${fmt(suRaggio(G, G.T2, ri))} A${ri} ${ri} 0 0 ${1 - G.sweep} ${fmt(suRaggio(G, G.T1, ri))} Z`
: `M${fmt(G.T1)} A${R} ${R} 0 0 ${G.sweep} ${fmt(G.T2)} L${fmt(G.O)} Z`;
mk('path', { d, fill: '#d8d2c4' }, g);
mk('path', { d, fill: 'url(#patAsfalto)', opacity: 0.35 }, g);
}
const dA = asfaltoRaccordo(G);
mk('path', { d: dA, fill: e.color || '#9aa0a6' }, g);
mk('path', { d: dA, fill: 'url(#patAsfalto)' }, g);
const rk = m > 0 ? Math.max(0.1, R - 0.06) : R;
const arco = `M${fmt(suRaggio(G, G.T1, rk))} A${rk} ${rk} 0 0 ${G.sweep} ${fmt(suRaggio(G, G.T2, rk))}`;
mk('path', { d: arco, fill: 'none', stroke: m > 0 ? '#7d776b' : '#6b7178', 'stroke-width': m > 0 ? 0.12 : 0.05 }, g);
const es = e.edge || 'cont';
if (es !== 'none') {
const S = strisciaRaccordo(e, G);
mk('path', { d: `M${fmt(S.p1)} A${S.r} ${S.r} 0 0 ${G.sweep} ${fmt(S.p2)}`, fill: 'none', stroke: '#fff',
'stroke-width': edgeWidth(es), 'stroke-dasharray': edgeDash(es) }, g);
}
}
function strisciaRaccordo(e, G) {
G = G || geometriaRaccordo(e);
const dm = e.doff != null ? +e.doff : 0.17, d1 = e.d1 != null ? +e.d1 : dm, d2 = e.d2 != null ? +e.d2 : dm;
const r = G.R + (d1 + d2) / 2, a1 = r - d1, a2 = r - d2;
const det = G.n1.x * G.n2.y - G.n1.y * G.n2.x;
if (Math.abs(det) < 1e-6) { const p1 = suRaggio(G, G.T1, G.R + dm), p2 = suRaggio(G, G.T2, G.R + dm); return { r: G.R + dm, p1, p2, Q: G.O }; }
const Q = { x: (a1 * G.n2.y - G.n1.y * a2) / det, y: (G.n1.x * a2 - a1 * G.n2.x) / det };
return { r: +r.toFixed(4), Q, p1: { x: Q.x - G.n1.x * r, y: Q.y - G.n1.y * r }, p2: { x: Q.x - G.n2.x * r, y: Q.y - G.n2.y * r } };
}
function drawCrosswalk(g, e) {
const L = e.len, W = e.wid, hl = L/2, hw = W/2;
mk('rect', { x: -hl, y: -hw, width: L, height: W, fill: 'none', stroke: 'none' }, g);
const bands = Math.max(2, Math.round(L / 0.8));
const bw = L / (bands * 2 - 1);
for (let i = 0; i < bands; i++) {
mk('rect', { x: -hl + i * bw * 2, y: -hw, width: bw, height: W, fill: e.color || '#fff', stroke: '#bbb', 'stroke-width': 0.02 }, g);
}
}
function drawStopline(g, e) {
const L = e.len, hl = L/2, ta = Math.max(0, +e.ta || 0), tb = Math.max(0, +e.tb || 0);
if (ta || tb) mk('path', { d: `M${-hl + ta} -0.25 L${hl} -0.25 L${hl} 0.25 L${-hl + tb} 0.25 Z`, fill: e.color || '#fff', stroke: '#bbb', 'stroke-width': 0.02 }, g);
else mk('rect', { x: -hl, y: -0.25, width: L, height: 0.5, fill: e.color || '#fff', stroke: '#bbb', 'stroke-width': 0.02 }, g);
if (e.scritta) {
const tw = Math.max(0.8, (+e.tw || L) * 0.8), h = Math.min(2.4, tw * 0.8), fs = 1;
const t = mk('text', { x: 0, y: 0, 'font-size': fs, fill: e.color || '#fff', 'font-weight': 700, 'text-anchor': 'middle',
dy: '0.27em', 'font-family': 'Arial, Helvetica, sans-serif', textLength: tw, lengthAdjust: 'spacingAndGlyphs',
transform: `translate(${+e.tx || 0} ${-(h / 2 + 0.8)}) rotate(180) scale(1 ${(h / 0.72).toFixed(3)})` }, g);
t.textContent = e.scritta;
}
}
function drawNucleo(g, e) {
const P = e.poli || []; if (P.length < 3) return;
const d = 'M' + P.map(q => q.x + ' ' + q.y).join(' L') + ' Z';
mk('path', { d, fill: e.color || '#9aa0a6' }, g);
mk('path', { d, fill: 'url(#patAsfalto)' }, g);
}
function boundsNucleo(e) {
const P = (e.poli || []).concat(...(e.tagli || []));
if (!P.length) return { x: e.x - 0.5, y: e.y - 0.5, w: 1, h: 1 };
const xs = P.map(q => e.x + q.x), ys = P.map(q => e.y + q.y), x = Math.min(...xs), y = Math.min(...ys);
return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}
function drawSvasatura(g, e) {
const L = e.len || 20, hl = L / 2, w0 = e.w0 || 10, w1 = e.w1 || 7, o0 = +e.off0 || 0, col = e.color || '#9aa0a6';
const a0 = o0 - w0 / 2, b0 = o0 + w0 / 2, a1 = -w1 / 2, b1 = w1 / 2;
const d = `M${-hl} ${a0} L${hl} ${a1} L${hl} ${b1} L${-hl} ${b0} Z`;
mk('path', { d, fill: col }, g);
mk('path', { d, fill: 'url(#patAsfalto)' }, g);
mk('path', { d: `M${-hl} ${a0} L${hl} ${a1} M${-hl} ${b0} L${hl} ${b1}`, fill: 'none', stroke: '#6b7178', 'stroke-width': 0.05 }, g);
const bi = (+e.banch || 0.25) + 0.06;
mk('path', { d: `M${-hl} ${a0 + bi} L${hl} ${a1 + bi} M${-hl} ${b0 - bi} L${hl} ${b1 - bi}`, fill: 'none', stroke: '#fff', 'stroke-width': 0.12 }, g);
if (e.sx) {
const yc = +e.yc0 || 0, ci = +e.cI || 3;
const z = `M${-hl} ${yc - ci} L${-hl} ${yc} L${hl} ${+e.yc1 || 0} Z`;
mk('path', { d: z, fill: col }, g);
mk('path', { d: z, fill: 'url(#patZebra)', stroke: '#fff', 'stroke-width': 0.12, 'stroke-linejoin': 'round' }, g);
} else {
mk('line', { x1: -hl, y1: +e.yc0 || 0, x2: hl, y2: +e.yc1 || 0, stroke: '#fff', 'stroke-width': 0.12, 'stroke-dasharray': '2 2' }, g);
}
}
let _ombraFiltro = null;
function ombraConFiltro() {
if (RS._ombraSemplice) return false;
if (_ombraFiltro === null) {
const ua = navigator.userAgent || '';
const safari = /AppleWebKit/.test(ua) && !/Chrome|Chromium|CriOS|Edg|Android/.test(ua);
_ombraFiltro = !(RS.ios || safari);
}
return _ombraFiltro;
}
function ombraSemplice(g, x, y, w, h, rx) {
mk('rect', { x: x + 0.12, y: y + 0.16, width: w, height: h, rx: rx || 0, fill: '#000', opacity: 0.2, 'class': 'ombra' }, g);
}
function drawBuilding(g, e) {
const W = e.w, H = e.h, hw = W/2, hh = H/2;
mk('rect', { x: -hw, y: -hh, width: W, height: H, fill: e.color || '#cfc3a8' }, g);
mk('rect', { x: -hw, y: -hh, width: W, height: H, fill: 'url(#patEdificio)' }, g);
mk('rect', { x: -hw, y: -hh, width: W, height: H, fill: 'none', stroke: '#3d3426', 'stroke-width': 0.22 }, g);
if (W > 1.2 && H > 1.2) mk('rect', { x: -hw + 0.35, y: -hh + 0.35, width: W - 0.7, height: H - 0.7, fill: 'none', stroke: '#3d3426', 'stroke-width': 0.06 }, g);
}
function drawSurveyPt(g, e) {
const s = e.size || 0.6, h = s/2;
mk('path', { d: `M${-h} 0 L${h} 0 M0 ${-h} L0 ${h}`, stroke: '#0a7', 'stroke-width': s*0.12 }, g);
mk('circle', { cx: 0, cy: 0, r: h*0.55, fill: '#fff', stroke: '#0a7', 'stroke-width': s*0.12 }, g);
const t = N('text');
t.setAttribute('x', h*1.1); t.setAttribute('y', -h*0.7); t.setAttribute('font-size', s*1.1);
t.setAttribute('fill', '#0a7'); t.setAttribute('font-weight', '700');
t.setAttribute('paint-order', 'stroke'); t.setAttribute('stroke', '#f4f1e8'); t.setAttribute('stroke-width', 0.06);
t.textContent = e.n != null ? e.n : '';
g.appendChild(t);
annotaNumero(t, e, h*1.1, -h*0.7, s*1.1, h);
}
function annotaNumero(t, e, lx, ly, fs, r) {
const x = e.x || 0, y = e.y || 0, hw = String(t.textContent).length*fs*0.32 + 0.04, hh = fs*0.5;
const cx = x + lx + hw, cy = y + ly - fs*0.35;
ostacolo(t.parentNode, x, y, r);
annota({ node: t, cx, cy, hw, hh, ux: 1, uy: 0, alt: altAnello(x, y, cx, cy, hh), sposta: spostaXY(t) });
}
function drawFoto(g, e) {
const s = e.size || 0.9, h = s/2, col = '#1466b8';
mk('circle', { cx: 0, cy: 0, r: h, fill: col, stroke: '#fff', 'stroke-width': s*0.09 }, g);
mk('rect', { x: -h*0.52, y: -h*0.16, width: s*0.52, height: h*0.62, rx: h*0.12, fill: '#fff' }, g);
mk('rect', { x: -h*0.18, y: -h*0.34, width: h*0.36, height: h*0.22, rx: h*0.05, fill: '#fff' }, g);
mk('circle', { cx: 0, cy: h*0.16, r: h*0.2, fill: col }, g);
const t = N('text');
t.setAttribute('x', h*1.05); t.setAttribute('y', -h*0.55); t.setAttribute('font-size', s*1.15);
t.setAttribute('fill', col); t.setAttribute('font-weight', '700');
t.setAttribute('paint-order', 'stroke'); t.setAttribute('stroke', '#f4f1e8'); t.setAttribute('stroke-width', 0.08);
t.textContent = e.n != null ? e.n : '';
g.appendChild(t);
annotaNumero(t, e, h*1.05, -h*0.55, s*1.15, h);
}
function drawPanorama(g, e) {
const s = e.size || 1.1, h = s / 2, col = '#7b3fb5', rot = e.rot || 0;
const sp = mk('g', { transform: `rotate(${rot})` }, g);
mk('path', { d: `M0 0L${h * 2.1} ${-h * 0.95}A${h * 2.3} ${h * 2.3} 0 0 1 ${h * 2.1} ${h * 0.95}Z`, fill: col, 'fill-opacity': .22, stroke: col, 'stroke-width': s * 0.04 }, sp);
mk('circle', { cx: 0, cy: 0, r: h, fill: col, stroke: '#fff', 'stroke-width': s * 0.09 }, g);
mk('circle', { cx: 0, cy: 0, r: h * 0.66, fill: 'none', stroke: '#fff', 'stroke-width': s * 0.05, 'stroke-dasharray': `${h * 0.5} ${h * 0.18}` }, g);
const c = N('text');
[['x', 0], ['y', 0], ['dy', '0.35em'], ['font-size', s * 0.36], ['fill', '#fff'], ['font-weight', '800'], ['text-anchor', 'middle']].forEach(([k, v]) => c.setAttribute(k, v));
c.textContent = '360'; g.appendChild(c);
const t = N('text');
t.setAttribute('x', h * 1.05); t.setAttribute('y', -h * 0.55); t.setAttribute('font-size', s * 1.0);
t.setAttribute('fill', col); t.setAttribute('font-weight', '700');
t.setAttribute('paint-order', 'stroke'); t.setAttribute('stroke', '#f4f1e8'); t.setAttribute('stroke-width', 0.08);
t.textContent = 'P' + (e.n != null ? e.n : '');
g.appendChild(t);
annotaNumero(t, e, h * 1.05, -h * 0.55, s * 1.0, h);
}
function drawImage(g, e) {
const W = e.w, H = e.h;
const im = N('image');
im.setAttribute('x', -W/2); im.setAttribute('y', -H/2);
im.setAttribute('width', W); im.setAttribute('height', H);
im.setAttribute('preserveAspectRatio', 'none');
im.setAttribute('opacity', e.opacity != null ? e.opacity : 0.7);
if (e.attenua) im.setAttribute('filter', 'url(#fltAttenua)');
im.setAttribute('href', e.href || '');
im.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', e.href || '');
g.appendChild(im);
}
function ptsToD(pts) { return pts.map((p, i) => (i ? 'L' : 'M') + p.x + ' ' + p.y).join(' '); }
function smoothD(pts) {
if (!pts || pts.length < 3) return ptsToD(pts || []);
let d = 'M' + pts[0].x + ' ' + pts[0].y;
for (let i = 0; i < pts.length - 1; i++) {
const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
d += ` C ${c1x.toFixed(3)} ${c1y.toFixed(3)} ${c2x.toFixed(3)} ${c2y.toFixed(3)} ${p2.x} ${p2.y}`;
}
return d;
}
function arrowHead(g, from, to, col, len) {
const ang = Math.atan2(to.y - from.y, to.x - from.x);
if (!isFinite(ang)) return;
const hw = len * 0.55;
const bx = to.x - Math.cos(ang)*len, by = to.y - Math.sin(ang)*len;
const nx = -Math.sin(ang), ny = Math.cos(ang);
mk('path', { d: `M${to.x} ${to.y} L${bx+nx*hw} ${by+ny*hw} L${bx-nx*hw} ${by-ny*hw} Z`, fill: col }, g);
}
function drawSketch(g, e) {
if (!e.pts || e.pts.length < 2) return;
mk('path', { d: ptsToD(e.pts), fill: 'none', stroke: e.color || '#3a3a3a',
'stroke-width': e.width || 0.08, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
}
function drawSkid(g, e) {
if (!e.pts || e.pts.length < 2) return;
const w = e.width || 0.16;
if (e.stile === 'solco') {
const col = e.color || '#5b5b5b';
mk('path', { d: ptsToD(e.pts), fill: 'none', stroke: 'rgba(255,255,255,.35)', 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
for (let i = 1; i < e.pts.length; i++) {
const a = e.pts[i-1], b = e.pts[i], L = Math.hypot(b.x - a.x, b.y - a.y); if (L < 1e-6) continue;
const ux = (b.x - a.x)/L, uy = (b.y - a.y)/L, nx = -uy, ny = ux, o = w*0.32;
[-o, o].forEach(d => mk('line', { x1: a.x + nx*d, y1: a.y + ny*d, x2: b.x + nx*d, y2: b.y + ny*d, stroke: col, 'stroke-width': w*0.12, 'stroke-linecap': 'round' }, g));
for (let t = w*0.4; t < L; t += w*0.7) {
const cx = a.x + ux*t, cy = a.y + uy*t;
mk('line', { x1: cx - nx*w*0.45 - ux*w*0.15, y1: cy - ny*w*0.45 - uy*w*0.15, x2: cx + nx*w*0.45 + ux*w*0.15, y2: cy + ny*w*0.45 + uy*w*0.15, stroke: col, 'stroke-width': w*0.09 }, g);
}
}
return;
}
mk('path', { d: ptsToD(e.pts), fill: 'none', stroke: e.color || '#202020',
'stroke-width': w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
'stroke-dasharray': e.dashed ? (w*1.6)+' '+(w*1.4) : '' }, g);
if (e.arrow) {
const pts = e.pts, n = pts.length, last = pts[n-1];
let j = n - 2;
while (j > 0 && Math.hypot(last.x - pts[j].x, last.y - pts[j].y) < 0.08) j--;
arrowHead(g, pts[j], last, e.color || '#2f6fed', Math.max(0.45, w*3.5));
}
if (e.type === 'path' && e.veicolo) {
const p0 = e.pts[0], p1 = e.pts[1] || p0;
const ang = Math.atan2(p1.y - p0.y, p1.x - p0.x);
const fs = Math.max(0.5, w * 5);
const off = fs * 0.9;
const t = N('text');
t.setAttribute('x', p0.x - Math.cos(ang) * off - Math.sin(ang) * off);
t.setAttribute('y', p0.y - Math.sin(ang) * off + Math.cos(ang) * off);
t.setAttribute('font-size', fs);
t.setAttribute('text-anchor', 'middle');
t.setAttribute('dy', '0.35em');
t.setAttribute('fill', e.color || '#2f6fed');
t.setAttribute('font-weight', '700');
t.setAttribute('paint-order', 'stroke');
t.setAttribute('stroke', '#f4f1e8'); t.setAttribute('stroke-width', fs * 0.22);
t.textContent = e.veicolo;
g.appendChild(t);
const cx = +t.getAttribute('x'), cy = +t.getAttribute('y'), hw = String(e.veicolo).length*fs*0.32 + 0.04;
annota({ node: t, cx, cy, hw, hh: fs*0.5, ux: 1, uy: 0, alt: altAnello(p0.x, p0.y, cx, cy, fs*0.5), sposta: spostaXY(t) });
}
}
function drawMeasure(g, e) {
if (!e.pts || e.pts.length < 2) return;
const P = RS.elements.resolvePts(e), a = P[0], b = P[1];
const col = e.color || '#c0392b';
const ln = mk('path', { d: `M${a.x} ${a.y} L${b.x} ${b.y}`, stroke: col, 'stroke-width': 0.05,
'marker-start': 'url(#tick)', 'marker-end': 'url(#tick)', color: col }, g);
ln.style.color = col;
const dist = Math.hypot(b.x - a.x, b.y - a.y);
const mx = (a.x + b.x)/2, my = (a.y + b.y)/2;
let ang = Math.atan2(b.y - a.y, b.x - a.x) * 180/Math.PI;
if (ang > 90 || ang < -90) ang += 180;
const fs = e.fs || 0.55;
const t = mk('text', { x: mx, y: my - 0.18, 'font-size': fs, fill: col, 'text-anchor': 'middle',
transform: `rotate(${ang} ${mx} ${my})`, 'paint-order': 'stroke', stroke: '#f4f1e8', 'stroke-width': fs*0.18 }, g);
const val = (e.valore != null && e.valore !== '') ? Number(e.valore) : dist;
t.textContent = metri(val) + ' m';
const r = ang * Math.PI/180, ux = Math.cos(r), uy = Math.sin(r), nx = Math.sin(r), ny = -Math.cos(r);
const o = 0.18 + fs*0.35, hw = t.textContent.length*fs*0.3 + 0.05, hh = fs*0.5 + 0.03;
const alt = [], passo = hw*1.2, lib = Math.max(0, dist/2 - hw);
[1, -1].forEach(lato => [0, 1, -1, 2, -2, 3, -3].forEach(k => {
if (lato === 1 && k === 0) return;
if (Math.abs(k*passo) > lib + 1e-9) return;
const sh = lato === 1 ? 0 : -2*o - fs*0.3;
alt.push([ux*k*passo + nx*sh, uy*k*passo + ny*sh]);
}));
annota({ node: t, cx: mx + nx*o, cy: my + ny*o, hw, hh, ux, uy, alt,
sposta: (dx, dy) => t.setAttribute('transform', `translate(${dx} ${dy}) ` + t.getAttribute('transform')) });
}
function drawAngle(g, e) {
if (!e.pts || e.pts.length < 2) return;
const p = RS.elements.resolvePts(e), V = p[0], col = e.color || '#7a3a9a';
mk('line', { x1: V.x, y1: V.y, x2: p[1].x, y2: p[1].y, stroke: col, 'stroke-width': 0.06 }, g);
if (p.length < 3) return;
mk('line', { x1: V.x, y1: V.y, x2: p[2].x, y2: p[2].y, stroke: col, 'stroke-width': 0.06 }, g);
const a1 = Math.atan2(p[1].y-V.y, p[1].x-V.x), a2 = Math.atan2(p[2].y-V.y, p[2].x-V.x);
let diff = ((a2 - a1) % (2*Math.PI) + 2*Math.PI) % (2*Math.PI);
const disp = diff > Math.PI ? 360 - diff*180/Math.PI : diff*180/Math.PI;
const r = Math.max(0.6, Math.min(2.5, 0.5*Math.min(dist(V, p[1]), dist(V, p[2]))));
const x1 = V.x+Math.cos(a1)*r, y1 = V.y+Math.sin(a1)*r, x2 = V.x+Math.cos(a2)*r, y2 = V.y+Math.sin(a2)*r;
const sweep = diff > Math.PI ? 0 : 1;
mk('path', { d: `M${x1} ${y1} A ${r} ${r} 0 0 ${sweep} ${x2} ${y2}`, fill: 'none', stroke: col, 'stroke-width': 0.06 }, g);
const mid = a1 + (sweep ? diff/2 : -(2*Math.PI-diff)/2);
const t = N('text');
t.setAttribute('x', V.x+Math.cos(mid)*(r+0.7)); t.setAttribute('y', V.y+Math.sin(mid)*(r+0.7));
t.setAttribute('font-size', 0.7); t.setAttribute('fill', col); t.setAttribute('text-anchor', 'middle');
t.setAttribute('paint-order', 'stroke'); t.setAttribute('stroke', '#f4f1e8'); t.setAttribute('stroke-width', 0.13);
t.textContent = disp.toFixed(1).replace('.', ',') + '°';
g.appendChild(t);
ostacolo(t, +t.getAttribute('x'), +t.getAttribute('y') - 0.25, t.textContent.length*0.7*0.3 + 0.04, 0.35);
}
function drawArrow(g, e) {
if (!e.pts || e.pts.length < 2) return;
const P = RS.elements.resolvePts(e), a = P[0], b = P[1], col = e.color || '#222';
const ang = Math.atan2(b.y-a.y, b.x-a.x), hd = 0.6;
const ex = b.x - Math.cos(ang)*hd*0.6, ey = b.y - Math.sin(ang)*hd*0.6;
mk('line', { x1: a.x, y1: a.y, x2: ex, y2: ey, stroke: col, 'stroke-width': 0.13, 'stroke-linecap': 'round' }, g);
arrowHead(g, a, b, col, hd);
}
function drawText(g, e) {
const fs = e.size || 0.8;
const t = mk('text', { x: 0, y: 0, 'font-size': fs, fill: e.color || '#111',
'text-anchor': 'middle', dy: '0.27em', 'paint-order': 'stroke',
stroke: '#f4f1e8', 'stroke-width': fs*0.14, 'font-weight': 600 }, g);
t.textContent = e.text || 'Testo';
}
function drawRoadway(g, e) {
if (!e.pts || e.pts.length < 2) return;
const w = e.width || 7, col = e.color || '#9aa0a6', d = smoothD(e.pts);
const maskId = e.id ? `url(#rm_${e.id})` : null;
const under = N('g'); if (maskId) under.setAttribute('mask', maskId);
mk('path', { d, fill: 'none', stroke: '#6b7178', 'stroke-width': w + 0.18, 'stroke-linecap': 'butt', 'stroke-linejoin': 'round' }, under);
g.appendChild(under);
mk('path', { d, fill: 'none', stroke: col, 'stroke-width': w, 'stroke-linecap': 'butt', 'stroke-linejoin': 'round' }, g);
const over = N('g'); if (maskId) over.setAttribute('mask', maskId);
const es = e.edge || 'cont';
if (es !== 'none') {
const ew = edgeWidth(es), ed = edgeDash(es), off = w/2 - 0.12;
mk('path', { d, fill: 'none', stroke: '#fff', 'stroke-width': w - 0.24 + ew, 'stroke-linecap': 'butt', 'stroke-linejoin': 'round', 'stroke-dasharray': ed }, over);
mk('path', { d, fill: 'none', stroke: col, 'stroke-width': w - 0.24 - ew, 'stroke-linecap': 'butt', 'stroke-linejoin': 'round' }, over);
}
const ls = e.line || 'disc';
if (ls === 'double') {
mk('path', { d, fill: 'none', stroke: '#fff', 'stroke-width': 0.28, 'stroke-linecap': 'butt' }, over);
mk('path', { d, fill: 'none', stroke: col, 'stroke-width': 0.08, 'stroke-linecap': 'butt' }, over);
} else if (ls === 'ddisc') {
mk('path', { d, fill: 'none', stroke: '#fff', 'stroke-width': 0.28, 'stroke-linecap': 'butt', 'stroke-dasharray': '1.6 1.6' }, over);
mk('path', { d, fill: 'none', stroke: col, 'stroke-width': 0.08, 'stroke-linecap': 'butt' }, over);
} else if (ls !== 'none') {
mk('path', { d, fill: 'none', stroke: '#fff', 'stroke-width': 0.1, 'stroke-linecap': 'butt', 'stroke-dasharray': ls === 'cont' ? '' : '1.6 1.6' }, over);
}
g.appendChild(over);
if (String(e.nomeVia || '').trim()) {
const Q = e.pts, P = [Q[0]];
if (Q.length < 3) P.push(Q[1]);
else for (let i = 0; i < Q.length - 1; i++) {
const p0 = Q[i - 1] || Q[i], p1 = Q[i], p2 = Q[i + 1], p3 = Q[i + 2] || p2;
const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 }, c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
for (let k = 1; k <= 16; k++) { const t = k / 16, u = 1 - t, a = u*u*u, b = 3*u*u*t, c = 3*u*t*t, d2 = t*t*t;
P.push({ x: a*p1.x + b*c1.x + c*c2.x + d2*p2.x, y: a*p1.y + b*c1.y + c*c2.y + d2*p2.y }); }
}
const lun = [];
let tot = 0; for (let i = 1; i < P.length; i++) { tot += Math.hypot(P[i].x - P[i-1].x, P[i].y - P[i-1].y); lun.push(tot); }
const cand = [0.5, 0.35, 0.65, 0.2, 0.8].map(f => {
let i = lun.findIndex(v => v >= tot * f); if (i < 0) i = lun.length - 1;
const a = P[i], b = P[i + 1] || P[i], l = Math.hypot(b.x - a.x, b.y - a.y) || 1, ux = (b.x - a.x) / l, uy = (b.y - a.y) / l;
const t = (tot * f - (i ? lun[i - 1] : 0)) / l, o = w / 4;
return { p: { x: a.x + (b.x - a.x) * t + uy * o, y: a.y + (b.y - a.y) * t - ux * o }, u: { x: ux, y: uy } };
});
let pc = postoVia(e, e.nomeVia, cand, q => q);
if (e.viaPos) {
const p = { x: Q[0].x + e.viaPos.x, y: Q[0].y + e.viaPos.y };
let mi = 0, md = Infinity; for (let i = 0; i < P.length - 1; i++) { const d = Math.hypot((P[i].x + P[i + 1].x) / 2 - p.x, (P[i].y + P[i + 1].y) / 2 - p.y); if (d < md) { md = d; mi = i; } }
const a = P[mi], b = P[mi + 1] || P[mi], l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
pc = { p, u: { x: (b.x - a.x) / l, y: (b.y - a.y) / l } };
}
const ang = Math.atan2(pc.u.y, pc.u.x) * 180 / Math.PI;
etichettaVia(g, e.nomeVia, pc.p, ang, ang);
}
}
function geoRampa(e) {
const L = Math.max(3, +e.len || 30), W = Math.max(1, +e.wid || 3.5), hl = L / 2, hw = W / 2;
const ram = Math.max(0, Math.min(30, +e.ram || 0)), t = Math.tan(ram * Math.PI / 180);
const cus = ram > 0 ? Math.max(0, Math.min(+e.cus || 0, L * 0.6)) : 0;
const rac = Math.max(0, Math.min(+e.rac || 0, L - cus));
const uN = -hl + cus, uT = hl - rac;
return { L, W, hl, hw, ram, t, cus, rac, uN, uT, sbalzo: cus * t };
}
function drawRamp(g, e) {
if (e.ram == null) return drawRampVecchia(g, e);
const G = geoRampa(e), { hl, hw, t, uN, uT } = G, col = e.color || '#9aa0a6';
const out = e.kind === 'out', X = u => out ? -u : u;
const P = pts => pts.map((p, i) => (i ? 'L' : 'M') + (+X(p[0]).toFixed(3)) + ' ' + (+p[1].toFixed(3))).join(' ');
const yi = u => -hw + (uN - u) * t, yo = u => hw + (uN - u) * t;
const ext = 0.08;
const asf = P([[-hl, yi(-hl)], [uN, -hw], [uN, -hw - ext], [hl, -hw - ext], [uT, hw], [uN, hw], [-hl, yo(-hl)]]) + ' Z';
mk('path', { d: asf, fill: col }, g);
mk('path', { d: asf, fill: 'url(#patAsfalto)' }, g);
const marks = N('g'); if (e.id) marks.setAttribute('mask', `url(#rm_${e.id})`);
if (G.cus > 0.5 && G.sbalzo > 0.3) {
const z = P([[-hl, -hw + 0.06], [uN, -hw + 0.06], [-hl, yi(-hl)]]) + ' Z';
mk('path', { d: z, fill: col }, marks);
mk('path', { d: z, fill: 'url(#patZebra)' }, marks);
mk('path', { d: P([[-hl, yi(-hl)], [uN, -hw]]), fill: 'none', stroke: '#fff', 'stroke-width': 0.12 }, marks);
}
mk('path', { d: P([[uN, -hw], [hl, -hw]]), fill: 'none', stroke: '#fff', 'stroke-width': 0.16, 'stroke-dasharray': '2.2 1.4' }, marks);
const m = 0.15;
mk('path', { d: P([[-hl, yo(-hl) - m], [uN, hw - m], [uT, hw - m], [hl, -hw]]), fill: 'none', stroke: '#fff', 'stroke-width': 0.12, 'stroke-linejoin': 'round' }, marks);
mk('path', { d: P([[-hl, yo(-hl)], [uN, hw], [uT, hw], [hl, -hw - ext]]), fill: 'none', stroke: '#6b7178', 'stroke-width': 0.05 }, marks);
const par = uT - uN;
if (par > 6) {
const lu = Math.min(4.5, par / 3), a0 = out ? uT : uN, a1 = out ? uN : uT;
const sg = out ? -1 : 1, ua = a0 + sg * (1 + lu / 2);
frecciaCorsia(marks, X(ua), 0, lu, 1);
const testo = out ? 'corsia di decelerazione' : 'corsia di accelerazione', fs = Math.min(0.7, G.W * 0.2);
const da = ua + sg * (lu / 2 + 1), lib = Math.abs(a1 - da), lt = testo.length * fs * 0.52;
if (e.scritta !== false && lib > lt + 1) scrittaCorsia(marks, testo, X((da + a1) / 2), 0, fs, e.rot || 0);
}
g.appendChild(marks);
}
function agganciaCorsia(e, strade) {
const R = r => r * Math.PI / 180;
let best = null;
(strade || RS.scene.elements).forEach(s => {
if (s.type !== 'road' || s === e) return;
const a = R(s.rot || 0), c = Math.cos(a), n = Math.sin(a);
const dx = e.x - s.x, dy = e.y - s.y, lx = dx * c + dy * n, ly = -dx * n + dy * c;
if (Math.abs(lx) > s.len / 2 + e.len / 2) return;
const sz = sezione(s), giu = sz ? s.wid / 2 - sz.giu : s.wid / 2 - 0.25, su = sz ? -s.wid / 2 + sz.su : -s.wid / 2 + 0.25;
const lato = ly >= 0 ? 1 : -1, bordo = lato > 0 ? giu : su;
const dist = Math.abs(ly - (bordo + lato * e.wid / 2));
let dr = (((e.rot || 0) - (s.rot || 0)) % 180 + 180) % 180; dr = Math.min(dr, 180 - dr);
if (dist > Math.max(6, e.wid * 2) || dr > 25) return;
if (!best || dist < best.dist) best = { s, lx, lato, bordo, dist };
});
if (!best) return false;
const { s, lx, lato, bordo } = best, a = R(s.rot || 0), c = Math.cos(a), n = Math.sin(a);
const ly = bordo + lato * e.wid / 2;
e.x = Math.round((s.x + lx * c - ly * n) * 1000) / 1000;
e.y = Math.round((s.y + lx * n + ly * c) * 1000) / 1000;
e.rot = ((s.rot || 0) + (lato > 0 ? 0 : 180)) % 360;
if (!(e.z > s.z)) e.z = (s.z || 0) + 0.01;
return true;
}
function drawRampVecchia(g, e) {
const L = e.len || 30, W = e.wid || 3.5, hl = L/2, hw = W/2;
const col = e.color || '#9aa0a6', inn = (e.kind || 'in') === 'in';
const x0 = inn ? -hl : hl, x1 = inn ? hl : -hl;
mk('path', { d: `M${x0} ${-hw} L${x1} ${-hw} L${x1} ${hw} Z`, fill: col }, g);
mk('path', { d: `M${x0} ${-hw} L${x1} ${-hw} L${x1} ${hw} Z`, fill: 'url(#patAsfalto)' }, g);
const marks = N('g'); if (e.id) marks.setAttribute('mask', `url(#rm_${e.id})`);
mk('line', { x1: -hl, y1: -hw, x2: hl, y2: -hw, stroke: '#fff', 'stroke-width': 0.16, 'stroke-dasharray': '2.2 1.4' }, marks);
mk('line', { x1: x0, y1: -hw, x2: x1, y2: hw, stroke: '#fff', 'stroke-width': 0.12 }, marks);
const ax = inn ? -hl*0.35 : hl*0.35, dir = inn ? 1 : -1;
mk('path', { d: `M${ax} ${0} L${ax + dir*1.6} 0 M${ax + dir*1.6} 0 L${ax + dir*0.9} ${-0.45} M${ax + dir*1.6} 0 L${ax + dir*0.9} ${0.45}`,
fill: 'none', stroke: '#fff', 'stroke-width': 0.12, 'stroke-linecap': 'round' }, marks);
g.appendChild(marks);
}
function drawZebraPath(g, e) {
if (!e.pts || e.pts.length < 2) return;
const w = e.width || 3, d = smoothD(e.pts);
const opt = { d, fill: 'none', 'stroke-linecap': 'butt', 'stroke-linejoin': 'round' };
mk('path', Object.assign({}, opt, { stroke: '#fff', 'stroke-width': w + 0.2 }), g);
mk('path', Object.assign({}, opt, { stroke: e.color || '#9aa0a6', 'stroke-width': w }), g);
mk('path', Object.assign({}, opt, { stroke: 'url(#patZebra)', 'stroke-width': w }), g);
}
function drawArea(g, e) {
const W = e.w, H = e.h, hw = W/2, hh = H/2, sub = e.sub;
if (sub === 'verde') { mk('rect', { x: -hw, y: -hh, width: W, height: H, fill: '#7fae6a', stroke: '#5f8f4c', 'stroke-width': 0.06 }, g); return; }
if (sub === 'ghiaia') { mk('rect', { x: -hw, y: -hh, width: W, height: H, fill: 'url(#patGhiaia)', stroke: '#b9a97f', 'stroke-width': 0.06 }, g); return; }
if (sub === 'zebra') {
mk('rect', { x: -hw, y: -hh, width: W, height: H, fill: e.color || '#9aa0a6', stroke: '#6b7178', 'stroke-width': 0.06 }, g);
mk('rect', { x: -hw, y: -hh, width: W, height: H, fill: 'url(#patZebra)', stroke: '#fff', 'stroke-width': 0.1 }, g);
return;
}
mk('rect', { x: -hw, y: -hh, width: W, height: H, fill: e.color || '#9aa0a6', stroke: '#7d848b', 'stroke-width': 0.06 }, g);
mk('rect', { x: -hw, y: -hh, width: W, height: H, fill: 'url(#patAsfalto)' }, g);
}
const CURVABILI = new Set(['guardrail', 'newjersey', 'antirumore', 'muro', 'siepe', 'recinzione', 'sidewalk', 'shoulder',
'median', 'ciclabile', 'rails', 'canale', 'ditch']);
const arcoDi = e => (e && e.type === 'band' && CURVABILI.has(e.sub) && Math.abs(+e.arco || 0) > 0.01) ? Math.max(-0.95, Math.min(0.95, +e.arco / (e.len / 2))) * (e.len / 2) : 0;
function arcoBand(e) {
const f = arcoDi(e), c = e.len / 2, s = Math.abs(f), sg = f < 0 ? -1 : 1;
const R = (c * c + s * s) / (2 * s), cy = -f / 2 + sg * R, Th = Math.asin(Math.min(1, c / R)), S = 2 * R * Th;
const at = d => { const t = -Th + d / R, sn = Math.sin(t), cs = Math.cos(t);
return { x: R * sn, y: cy - sg * R * cs, nx: -sg * sn, ny: cs }; };
return { S, at };
}
function drawBandArco(g, e) {
const A = arcoBand(e), W = e.wid, hw = W / 2, sub = e.sub, S = A.S, n = Math.max(16, Math.ceil(S / 0.4));
const linea = (d, a, b) => { let p = ''; const s0 = a == null ? 0 : a, s1 = b == null ? S : b, k = Math.max(2, Math.ceil((s1 - s0) / 0.4));
for (let i = 0; i <= k; i++) { const q = A.at(s0 + (s1 - s0) * i / k); p += (i ? 'L' : 'M') + (q.x + q.nx * d).toFixed(3) + ' ' + (q.y + q.ny * d).toFixed(3); } return p; };
const fascia = (d0, d1) => { let p = ''; for (let i = 0; i <= n; i++) { const q = A.at(S * i / n); p += (i ? 'L' : 'M') + (q.x + q.nx * d0).toFixed(3) + ' ' + (q.y + q.ny * d0).toFixed(3); }
for (let i = n; i >= 0; i--) { const q = A.at(S * i / n); p += 'L' + (q.x + q.nx * d1).toFixed(3) + ' ' + (q.y + q.ny * d1).toFixed(3); } return p + 'Z'; };
const traverso = (d, a, b, at) => { const q = A.at(d); return { x1: q.x + q.nx * a, y1: q.y + q.ny * a, x2: q.x + q.nx * b, y2: q.y + q.ny * b }; };
const ogni = (passo, da, fn) => { for (let d = da; d <= S + 0.001; d += passo) fn(d); };
if (sub === 'guardrail') {
mk('path', { d: linea(0), fill: 'none', stroke: e.color || '#555', 'stroke-width': Math.min(0.18, W) }, g);
ogni(1, 0, d => mk('line', Object.assign(traverso(d, -hw, hw), { stroke: e.color || '#555', 'stroke-width': 0.06 }), g));
return;
}
if (sub === 'recinzione') {
mk('path', { d: linea(0), fill: 'none', stroke: e.color || '#777', 'stroke-width': 0.06, 'stroke-dasharray': '0.5 0.25' }, g);
ogni(1.2, 0, d => { const q = A.at(d); mk('circle', { cx: q.x, cy: q.y, r: 0.09, fill: e.color || '#777' }, g); });
return;
}
const COL = { newjersey: ['#dcdcdc', '#8f8f8f'], antirumore: [e.color || '#4f7382', '#2f4650'], muro: [e.color || '#b9b3a8', '#6f6a60'],
siepe: [e.color || '#3f8f4f', '#2c6b39'], ciclabile: [e.color || '#b5563a', '#ffffff'], rails: ['#cfc9bb', '#999'], canale: [e.color || '#8fc7e8', '#5b93b5'] };
const [fill, bordo] = COL[sub] || [e.color || '#cfcabb', '#9a8f74'];
mk('path', { d: fascia(-hw, hw), fill, stroke: bordo, 'stroke-width': sub === 'ciclabile' ? 0.09 : 0.05, 'stroke-linejoin': 'round' }, g);
if (sub === 'newjersey') { mk('path', { d: linea(0), fill: 'none', stroke: '#b3b3b3', 'stroke-width': 0.06 }, g);
ogni(1.2, 1.2, d => mk('line', Object.assign(traverso(d, -hw, hw), { stroke: '#9a9a9a', 'stroke-width': 0.05 }), g)); }
else if (sub === 'antirumore') ogni(2, 0, d => mk('line', Object.assign(traverso(d, -hw - 0.04, hw + 0.04), { stroke: '#2f4650', 'stroke-width': 0.16 }), g));
else if (sub === 'muro') ogni(0.5, 0.3, d => mk('line', Object.assign(traverso(d, -hw, hw), { stroke: '#8a857a', 'stroke-width': 0.04 }), g));
else if (sub === 'siepe') ogni(0.5, 0.25, d => { const q = A.at(d); mk('circle', { cx: q.x, cy: q.y, r: hw * 0.78, fill: '#4da05e', opacity: 0.9 }, g); });
else if (sub === 'rails') { ogni(0.6, 0.3, d => mk('line', Object.assign(traverso(d, -hw, hw), { stroke: '#8a7a5a', 'stroke-width': 0.12 }), g));
[-hw + 0.25, hw - 0.25].forEach(o => mk('path', { d: linea(o), fill: 'none', stroke: '#666', 'stroke-width': 0.1 }, g)); }
else if (sub === 'canale') { [-hw, hw].forEach(o => mk('path', { d: linea(o), fill: 'none', stroke: '#6f8f5a', 'stroke-width': 0.12 }, g));
mk('path', { d: linea(0), fill: 'none', stroke: '#fff', 'stroke-width': 0.07, 'stroke-dasharray': '0.9 0.9', opacity: 0.75 }, g); }
else if (sub === 'sidewalk') ogni(1, 1, d => mk('line', Object.assign(traverso(d, -hw, hw), { stroke: 'rgba(0,0,0,.12)', 'stroke-width': 0.03 }), g));
else if (sub === 'ditch') mk('path', { d: linea(0), fill: 'none', stroke: '#7a6a40', 'stroke-width': 0.06, 'stroke-dasharray': '0.4 0.3' }, g);
}
function impostaArco(e, f) {
const max = e.len / 2 * 0.95, nf = Math.abs(+f || 0) < 0.01 ? 0 : Math.max(-max, Math.min(max, +f));
const prima = arcoDi(e), d = (prima - nf) / 2, r = (e.rot || 0) * Math.PI / 180;
e.x += -Math.sin(r) * d;
e.y += Math.cos(r) * d;
if (nf) e.arco = Math.round(nf * 1000) / 1000; else delete e.arco;
}
function drawBand(g, e) {
if (arcoDi(e)) return drawBandArco(g, e);
const L = e.len, W = e.wid, hl = L/2, hw = W/2, sub = e.sub;
if (sub === 'dosso') {
mk('rect', { x: -hl, y: -hw, width: L, height: W, fill: '#b9b9b9', stroke: '#888', 'stroke-width': 0.05 }, g);
for (let x = -hl + 0.35; x < hl - 0.1; x += 0.65) mk('path', { d: `M${x} ${-hw} L${x+0.32} 0 L${x} ${hw}`, fill: 'none', stroke: '#fff', 'stroke-width': 0.13 }, g);
return;
}
if (sub === 'piazzola') {
const t = Math.min(L * 0.25, 12), d = `M${-hl} ${-hw} L${hl} ${-hw} L${hl - t} ${hw} L${-hl + t} ${hw} Z`;
mk('path', { d, fill: e.color || '#9aa0a6' }, g);
mk('path', { d, fill: 'url(#patAsfalto)' }, g);
mk('path', { d: `M${-hl} ${-hw} L${-hl + t} ${hw} L${hl - t} ${hw} L${hl} ${-hw}`, fill: 'none', stroke: '#6b7178', 'stroke-width': 0.05 }, g);
mk('line', { x1: -hl, y1: -hw + 0.06, x2: hl, y2: -hw + 0.06, stroke: '#fff', 'stroke-width': 0.12, 'stroke-dasharray': '1.5 1.5' }, g);
if (L >= 14 && W >= 1.5) scrittaCorsia(g, 'piazzola di sosta', 0, 0.15, Math.min(0.7, W * 0.24), e.rot || 0);
return;
}
if (sub === 'antirumore') {
mk('rect', { x: -hl, y: -hw, width: L, height: W, fill: e.color || '#4f7382', stroke: '#2f4650', 'stroke-width': 0.04 }, g);
for (let x = -hl; x <= hl + 0.001; x += 2) mk('rect', { x: x - 0.08, y: -hw - 0.04, width: 0.16, height: W + 0.08, fill: '#2f4650' }, g);
return;
}
if (sub === 'attenuatore') {
const r = Math.min(hw, L / 4);
const d = `M${-hl + r} ${-hw} L${hl} ${-hw} L${hl} ${hw} L${-hl + r} ${hw} A${r} ${hw} 0 0 1 ${-hl + r} ${-hw} Z`;
mk('path', { d, fill: e.color || '#f2c200', stroke: '#111', 'stroke-width': 0.05 }, g);
for (let x = -hl + r * 0.9; x < hl - 0.3; x += Math.max(0.6, W * 0.9))
mk('path', { d: `M${x + W * 0.35} ${-hw * 0.75} L${x} 0 L${x + W * 0.35} ${hw * 0.75}`, fill: 'none', stroke: '#111', 'stroke-width': Math.min(0.12, W * 0.14), 'stroke-linejoin': 'round' }, g);
return;
}
if (sub === 'guardrail') {
mk('line', { x1: -hl, y1: 0, x2: hl, y2: 0, stroke: e.color || '#555', 'stroke-width': Math.min(0.18, W) }, g);
for (let x = -hl; x <= hl; x += 1) mk('line', { x1: x, y1: -hw, x2: x, y2: hw, stroke: e.color || '#555', 'stroke-width': 0.06 }, g);
return;
}
if (sub === 'newjersey') {
mk('rect', { x: -hl, y: -hw, width: L, height: W, fill: '#dcdcdc', stroke: '#8f8f8f', 'stroke-width': 0.05 }, g);
mk('line', { x1: -hl, y1: 0, x2: hl, y2: 0, stroke: '#b3b3b3', 'stroke-width': 0.06 }, g);
for (let x = -hl + 1.2; x < hl - 0.05; x += 1.2)
mk('line', { x1: x, y1: -hw, x2: x, y2: hw, stroke: '#9a9a9a', 'stroke-width': 0.05 }, g);
return;
}
if (sub === 'ciclabile') {
mk('rect', { x: -hl, y: -hw, width: L, height: W, fill: e.color || '#b5563a', stroke: '#ffffff', 'stroke-width': 0.09 }, g);
for (let x = -hl + 1.4; x < hl - 0.9; x += 3.2) {
mk('circle', { cx: x, cy: 0, r: W * 0.17, fill: 'none', stroke: '#fff', 'stroke-width': 0.07 }, g);
mk('circle', { cx: x + W * 0.46, cy: 0, r: W * 0.17, fill: 'none', stroke: '#fff', 'stroke-width': 0.07 }, g);
mk('path', { d: `M${x} 0 L${x + W * 0.22} ${-W * 0.22} L${x + W * 0.46} 0`, fill: 'none', stroke: '#fff', 'stroke-width': 0.06 }, g);
}
return;
}
if (sub === 'muro') {
mk('rect', { x: -hl, y: -hw, width: L, height: W, fill: e.color || '#b9b3a8', stroke: '#6f6a60', 'stroke-width': 0.06 }, g);
for (let x = -hl + 0.3; x < hl; x += 0.5)
mk('line', { x1: x, y1: -hw, x2: x + 0.22, y2: hw, stroke: '#8a857a', 'stroke-width': 0.04 }, g);
return;
}
if (sub === 'siepe') {
mk('rect', { x: -hl, y: -hw, width: L, height: W, fill: e.color || '#3f8f4f', stroke: '#2c6b39', 'stroke-width': 0.05 }, g);
for (let x = -hl + 0.25; x < hl; x += 0.5)
mk('circle', { cx: x, cy: 0, r: hw * 0.78, fill: '#4da05e', opacity: 0.9 }, g);
return;
}
if (sub === 'recinzione') {
mk('line', { x1: -hl, y1: 0, x2: hl, y2: 0, stroke: e.color || '#777', 'stroke-width': 0.06, 'stroke-dasharray': '0.5 0.25' }, g);
for (let x = -hl; x <= hl + 0.001; x += 1.2)
mk('circle', { cx: x, cy: 0, r: 0.09, fill: e.color || '#777' }, g);
return;
}
if (sub === 'canale') {
mk('rect', { x: -hl, y: -hw, width: L, height: W, fill: e.color || '#8fc7e8', stroke: '#5b93b5', 'stroke-width': 0.07 }, g);
mk('line', { x1: -hl, y1: -hw, x2: hl, y2: -hw, stroke: '#6f8f5a', 'stroke-width': 0.12 }, g);
mk('line', { x1: -hl, y1: hw, x2: hl, y2: hw, stroke: '#6f8f5a', 'stroke-width': 0.12 }, g);
for (let x = -hl + 0.6; x < hl - 0.2; x += 1.8)
mk('path', { d: `M${x} 0 q 0.45 ${-W*0.14} 0.9 0`, fill: 'none', stroke: '#ffffff', 'stroke-width': 0.07, opacity: 0.75 }, g);
return;
}
if (sub === 'sbarra') {
mk('rect', { x: -hl, y: -hw, width: L, height: W, fill: '#fff', stroke: '#333', 'stroke-width': 0.04 }, g);
for (let x = -hl, k = 0; x < hl - 0.01; x += 0.5, k++) if (k % 2 === 0) mk('rect', { x, y: -hw, width: Math.min(0.5, hl - x), height: W, fill: e.color || '#c00' }, g);
mk('circle', { cx: -hl, cy: 0, r: Math.max(0.18, W * 0.9), fill: '#444', stroke: '#fff', 'stroke-width': 0.05 }, g);
return;
}
if (sub === 'marc') {
mk('rect', { x: -hl, y: -hw, width: L, height: W, fill: e.color || '#d8d2c4' }, g);
mk('rect', { x: -hl, y: -hw, width: L, height: W, fill: 'url(#patAsfalto)', opacity: 0.35 }, g);
return;
}
if (sub === 'rails') {
mk('rect', { x: -hl, y: -hw, width: L, height: W, fill: '#cfc9bb', stroke: '#999', 'stroke-width': 0.03 }, g);
for (let x = -hl + 0.3; x < hl; x += 0.6) mk('line', { x1: x, y1: -hw, x2: x, y2: hw, stroke: '#8a7a5a', 'stroke-width': 0.12 }, g);
mk('line', { x1: -hl, y1: -hw + 0.25, x2: hl, y2: -hw + 0.25, stroke: '#666', 'stroke-width': 0.1 }, g);
mk('line', { x1: -hl, y1: hw - 0.25, x2: hl, y2: hw - 0.25, stroke: '#666', 'stroke-width': 0.1 }, g);
return;
}
mk('rect', { x: -hl, y: -hw, width: L, height: W, fill: e.color || '#cfcabb', stroke: '#9a8f74', 'stroke-width': 0.05 }, g);
if (sub === 'sidewalk') for (let x = -hl + 1; x < hl; x += 1) mk('line', { x1: x, y1: -hw, x2: x, y2: hw, stroke: 'rgba(0,0,0,.12)', 'stroke-width': 0.03 }, g);
if (sub === 'ditch') mk('line', { x1: -hl, y1: 0, x2: hl, y2: 0, stroke: '#7a6a40', 'stroke-width': 0.06, 'stroke-dasharray': '0.4 0.3' }, g);
}
function anelloConIngressi(g, e, R, col, bracci) {
const doff = 0.25, f3 = v => +v.toFixed(3), pt = p => f3(p.x) + ' ' + f3(p.y);
const polar = (r, a) => ({ x: r * Math.cos(a), y: r * Math.sin(a) });
const arco = (r, a0, a1) => `M${pt(polar(r, a0))} A${f3(r)} ${f3(r)} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${pt(polar(r, a1))}`;
const h = (+e.brWid || 7) / 2, rMax = Math.max(1, Math.min(+e.rIng || 6, R));
const afDi = rf => Math.sqrt(Math.max(0, (R + rf) * (R + rf) - (h + rf) * (h + rf)));
const delta = rf => Math.atan2(h + rf, afDi(rf));
const bocche = bracci.map(b => {
const A = ((((+b.ang || 0) % 360) + 360) % 360) * Math.PI / 180, u = { x: Math.cos(A), y: Math.sin(A) }, n = { x: -u.y, y: u.x };
return { A, u, n, h };
}).sort((a, b) => a.A - b.A);
bocche.forEach((k, i) => {
const nb = bocche.length;
const gap = s => nb < 2 ? Math.PI * 2 : s > 0 ? ((bocche[(i + 1) % nb].A - k.A) + Math.PI * 2) % (Math.PI * 2) || Math.PI * 2
: ((k.A - bocche[(i - 1 + nb) % nb].A) + Math.PI * 2) % (Math.PI * 2) || Math.PI * 2;
k.lato = {};
[-1, 1].forEach(s => {
const lim = gap(s) / 2 - 0.01;
let rf = rMax;
if (delta(rf) > lim) { let lo = 0.2, hi = rMax; for (let t = 0; t < 30; t++) { const m = (lo + hi) / 2; if (delta(m) > lim) hi = m; else lo = m; } rf = lo; }
k.lato[s] = { rf, af: afDi(rf), d: delta(rf) };
});
});
mk('circle', { cx: 0, cy: 0, r: R, fill: col }, g);
const curve = [];
bocche.forEach(k0 => [-1, 1].forEach(s => {
const k = Object.assign({}, k0, k0.lato[s]);
const P = (a, l) => ({ x: k.u.x * a + k.n.x * l * s, y: k.u.y * a + k.n.y * l * s });
const F = P(k.af, k.h + k.rf), T1 = P(k.af, k.h), T2 = { x: F.x * R / (R + k.rf), y: F.y * R / (R + k.rf) };
const th1 = Math.atan2(T1.y - F.y, T1.x - F.x), th2 = Math.atan2(T2.y - F.y, T2.x - F.x);
let dt = th2 - th1; while (dt > Math.PI) dt -= 2 * Math.PI; while (dt <= -Math.PI) dt += 2 * Math.PI;
const sw = dt > 0 ? 1 : 0, ri = R - 0.6, li = k.h - 0.45, aIn = Math.sqrt(Math.max(0, ri * ri - li * li));
const Pa = P(aIn, li), Pb = P(k.af, li), T2i = { x: T2.x * ri / R, y: T2.y * ri / R };
const aT = Math.atan2(T2.y, T2.x), aP = Math.atan2(Pa.y, Pa.x);
let da = aP - aT; while (da > Math.PI) da -= 2 * Math.PI; while (da <= -Math.PI) da += 2 * Math.PI;
const d = `M${pt(Pa)} L${pt(Pb)} L${pt(T1)} A${f3(k.rf)} ${f3(k.rf)} 0 0 ${sw} ${pt(T2)} L${pt(T2i)} A${f3(ri)} ${f3(ri)} 0 0 ${da > 0 ? 1 : 0} ${pt(Pa)} Z`;
mk('path', { d, fill: col }, g);
mk('path', { d, fill: 'url(#patAsfalto)' }, g);
const rs = k.rf + doff, S1 = { x: F.x + (T1.x - F.x) * rs / k.rf, y: F.y + (T1.y - F.y) * rs / k.rf }, S2 = { x: F.x + (T2.x - F.x) * rs / k.rf, y: F.y + (T2.y - F.y) * rs / k.rf };
curve.push({ bordo: `M${pt(T1)} A${f3(k.rf)} ${f3(k.rf)} 0 0 ${sw} ${pt(T2)}`, striscia: `M${pt(S1)} A${f3(rs)} ${f3(rs)} 0 0 ${sw} ${pt(S2)}` });
}));
mk('circle', { cx: 0, cy: 0, r: R, fill: 'url(#patAsfalto)' }, g);
const tratti = [];
bocche.forEach((k, i) => {
const nx = bocche[(i + 1) % bocche.length];
let a0 = k.A + k.lato[1].d, a1 = nx.A - nx.lato[-1].d + (i + 1 === bocche.length ? 2 * Math.PI : 0);
if (a1 - a0 > 0.01) tratti.push([a0, a1]);
});
tratti.forEach(([a0, a1]) => {
mk('path', { d: arco(R, a0, a1), fill: 'none', stroke: '#6b7178', 'stroke-width': 0.06 }, g);
mk('path', { d: arco(R - doff, a0, a1), fill: 'none', stroke: '#fff', 'stroke-width': 0.1 }, g);
});
curve.forEach(c => {
mk('path', { d: c.bordo, fill: 'none', stroke: '#6b7178', 'stroke-width': 0.06 }, g);
mk('path', { d: c.striscia, fill: 'none', stroke: '#fff', 'stroke-width': 0.1 }, g);
});
}
function drawRoundabout(g, e) {
const R = (e.size || 20) / 2, ring = Math.min(e.ring || 6, R - 1), ri = R - ring, col = e.color || '#9aa0a6';
const bracci = (e.bracci || []).filter(b => b);
if (!bracci.length) {
mk('circle', { cx: 0, cy: 0, r: R, fill: col, stroke: '#6b7178', 'stroke-width': 0.06 }, g);
mk('circle', { cx: 0, cy: 0, r: R, fill: 'none', stroke: '#fff', 'stroke-width': 0.09 }, g);
} else anelloConIngressi(g, e, R, col, bracci);
const fascia = e.mini ? ri : Math.min(Math.max(0, +e.fascia || 0), ri - 0.3), centro = e.centro || 'verde';
const isolaC = r => {
if (centro === 'pavimentata') { mk('circle', { cx: 0, cy: 0, r, fill: '#cfc8b6', stroke: '#8a8478', 'stroke-width': 0.1 }, g); mk('circle', { cx: 0, cy: 0, r, fill: 'url(#patAsfalto)', opacity: 0.4 }, g); }
else if (centro === 'zebrata') { mk('circle', { cx: 0, cy: 0, r, fill: col }, g); mk('circle', { cx: 0, cy: 0, r, fill: 'url(#patZebra)', stroke: '#fff', 'stroke-width': 0.15 }, g); }
else mk('circle', { cx: 0, cy: 0, r, fill: '#7fae6a', stroke: fascia > 0 ? '#8a8478' : '#fff', 'stroke-width': fascia > 0 ? 0.1 : 0.12 }, g);
};
if (fascia > 0) {
mk('circle', { cx: 0, cy: 0, r: ri, fill: '#cfc8b6', stroke: '#fff', 'stroke-width': 0.12 }, g);
mk('circle', { cx: 0, cy: 0, r: ri, fill: 'url(#patAsfalto)', opacity: 0.4 }, g);
if (ri - fascia > 0.2) isolaC(ri - fascia);
} else isolaC(ri);
if (+e.corsie !== 1) mk('circle', { cx: 0, cy: 0, r: R - ring * 0.5, fill: 'none', stroke: '#fff', 'stroke-width': +e.corsie === 2 ? 0.12 : 0.07, 'stroke-dasharray': +e.corsie === 2 ? '3 3' : '1 1' }, g);
if (e.frecce) {
const angs = (e.bracci || []).map(b => (((+b.ang || 0) % 360) + 360) % 360).sort((a, b) => a - b);
const mezzi = angs.length ? angs.map((a, k) => { const b = k + 1 < angs.length ? angs[k + 1] : angs[0] + 360; return (a + b) / 2; }) : [45, 135, 225, 315];
const rr = R - ring * 0.27, lu = Math.min(3, ring * 0.5);
mezzi.forEach(m => {
const t = m * Math.PI / 180, da = lu / rr / 2;
const p0 = [rr * Math.cos(t + da), rr * Math.sin(t + da)], p1 = [rr * Math.cos(t - da), rr * Math.sin(t - da)];
const tx = Math.sin(t - da), ty = -Math.cos(t - da), nx = -ty, ny = tx, hl = lu * 0.38, hw = lu * 0.22;
mk('path', { d: `M${p0[0].toFixed(3)} ${p0[1].toFixed(3)} A${rr} ${rr} 0 0 0 ${p1[0].toFixed(3)} ${p1[1].toFixed(3)}`, fill: 'none', stroke: '#fff', 'stroke-width': lu * 0.13 }, g);
const b = [p1[0] - tx * hl * 0.2, p1[1] - ty * hl * 0.2];
mk('path', { d: `M${(b[0] + tx * hl).toFixed(3)} ${(b[1] + ty * hl).toFixed(3)} L${(b[0] + nx * hw).toFixed(3)} ${(b[1] + ny * hw).toFixed(3)} L${(b[0] - nx * hw).toFixed(3)} ${(b[1] - ny * hw).toFixed(3)} Z`, fill: '#fff' }, g);
});
}
}
function drawIsland(g, e) {
const W = e.w || 3, H = e.h || 2, hw = W/2, hh = H/2;
const fondo = e.fondo || 'verde', col = fondo === 'pavimentata' ? '#cfc8b6' : fondo === 'zebrata' ? '#9aa0a6' : (e.color || '#7fae6a');
let d;
if (e.shape === 'triangolo') d = `M0 ${-hh} L${hw} ${hh} L${-hw} ${hh} Z`;
else if (e.shape === 'goccia') d = `M0 ${-hh} C ${hw} ${-hh*0.2} ${hw} ${hh} 0 ${hh} C ${-hw} ${hh} ${-hw} ${-hh*0.2} 0 ${-hh} Z`;
else d = `M${-hw} 0 A${hw} ${hh} 0 1 0 ${hw} 0 A${hw} ${hh} 0 1 0 ${-hw} 0 Z`;
mk('path', { d, fill: col, stroke: fondo === 'zebrata' ? 'none' : '#fff', 'stroke-width': 0.14, 'stroke-linejoin': 'round' }, g);
if (fondo === 'pavimentata') mk('path', { d, fill: 'url(#patAsfalto)', opacity: 0.4 }, g);
if (fondo === 'zebrata') {
mk('path', { d, fill: 'url(#patZebra)' }, g);
mk('path', { d, fill: 'none', stroke: '#fff', 'stroke-width': 0.15, 'stroke-linejoin': 'round' }, g);
}
}
function drawParking(g, e) {
const W = e.w, H = e.h, hw = W/2, hh = H/2;
mk('rect', { x: -hw, y: -hh, width: W, height: H, fill: 'rgba(255,255,255,.04)', stroke: '#fff', 'stroke-width': 0.1 }, g);
const ang = e.angolo == null ? 90 : +e.angolo;
if (ang <= 0) {
const n = Math.max(1, Math.round(W / 5));
for (let i = 1; i < n; i++) { const x = -hw + W * i / n; mk('line', { x1: x, y1: -hh, x2: x, y2: hh, stroke: '#fff', 'stroke-width': 0.1 }, g); }
return;
}
if (ang >= 89) {
const n = Math.max(1, Math.round(W / 2.5));
for (let i = 1; i < n; i++) { const x = -hw + W * i / n; mk('line', { x1: x, y1: -hh, x2: x, y2: hh, stroke: '#fff', 'stroke-width': 0.1 }, g); }
return;
}
const a = ang * Math.PI/180, passo = 2.5 / Math.sin(a), dx = H / Math.tan(a);
const cl = `pk_${e.id || 'x'}`;
const clip = mk('clipPath', { id: cl }, g);
mk('rect', { x: -hw, y: -hh, width: W, height: H }, clip);
const linee = mk('g', { 'clip-path': `url(#${cl})` }, g);
for (let x = -hw - dx; x < hw + passo; x += passo) mk('line', { x1: x, y1: hh, x2: x + dx, y2: -hh, stroke: '#fff', 'stroke-width': 0.1 }, linee);
}
function drawMark(g, e) {
const L = e.len, hl = L/2, col = e.color || '#fff', st = e.style;
if (st === 'double') { mk('line', { x1: -hl, y1: -0.1, x2: hl, y2: -0.1, stroke: col, 'stroke-width': 0.1 }, g);
mk('line', { x1: -hl, y1: 0.1, x2: hl, y2: 0.1, stroke: col, 'stroke-width': 0.1 }, g); return; }
if (st === 'give') {
const b = 0.5, h = 0.6, p = b * 1.5, n = Math.max(1, Math.floor((L + b * 0.5) / p)), x0 = -((n - 1) * p + b) / 2;
for (let k = 0; k < n; k++) { const x = x0 + k * p; mk('path', { d: `M${x.toFixed(3)} ${h / 2} L${(x + b).toFixed(3)} ${h / 2} L${(x + b / 2).toFixed(3)} ${-h / 2} Z`, fill: col }, g); }
return;
}
mk('line', { x1: -hl, y1: 0, x2: hl, y2: 0, stroke: col, 'stroke-width': 0.12, 'stroke-dasharray': st === 'disc' ? '2 2' : '' }, g);
}
function drawNorth(g, e) {
const s = e.size || 3, h = s / 2, st = e.style || 'classica';
if (st === 'freccia') {
mk('path', { d: `M0 ${-h} L${h*0.42} ${h} L0 ${h*0.5} Z`, fill: '#222' }, g);
mk('path', { d: `M0 ${-h} L${-h*0.42} ${h} L0 ${h*0.5} Z`, fill: '#fff', stroke: '#222', 'stroke-width': 0.05 }, g);
symText(g, 'N', h*0.55, '#222', e.rot);
const t = g.querySelector('text'); if (t) t.setAttribute('y', -h - h*0.22);
return;
}
if (st === 'stella') {
const R = h*0.95, r = h*0.34, pts = [];
for (let k = 0; k < 4; k++) {
const a = k*Math.PI/2 - Math.PI/2;
pts.push([Math.cos(a)*R, Math.sin(a)*R]);
const a2 = a + Math.PI/4;
pts.push([Math.cos(a2)*r, Math.sin(a2)*r]);
}
mk('path', { d: 'M' + pts.map(p => p[0].toFixed(3) + ' ' + p[1].toFixed(3)).join(' L') + ' Z',
fill: '#222', stroke: '#222', 'stroke-width': 0.03, 'stroke-linejoin': 'round' }, g);
symText(g, 'N', h*0.5, '#222', e.rot);
const t = g.querySelector('text'); if (t) t.setAttribute('y', -h - h*0.12);
return;
}
mk('circle', { cx: 0, cy: 0, r: h, fill: '#fff', stroke: '#222', 'stroke-width': 0.06 }, g);
const ax = h * 0.22;
mk('path', { d: `M0 ${-h*0.84} L${ax} 0 L${-ax} 0 Z`, fill: '#222' }, g);
mk('path', { d: `M0 ${h*0.84} L${ax} 0 L${-ax} 0 Z`, fill: '#fff', stroke: '#222', 'stroke-width': 0.045 }, g);
mk('circle', { cx: 0, cy: 0, r: h*0.11, fill: '#fff', stroke: '#222', 'stroke-width': 0.045 }, g);
symText(g, 'N', h*0.5, '#222', e.rot);
const t = g.querySelector('text'); if (t) t.setAttribute('y', -h - h*0.26);
}
function drawGraphScale(g, e) {
const len = e.size || 10, seg = niceSeg(len), n = Math.max(1, Math.round(len / seg));
const bh = Math.max(0.3, len * 0.05), fs = Math.max(0.4, len * 0.07), st = e.style || 'barra';
if (st === 'linea') {
mk('line', { x1: 0, y1: bh, x2: n*seg, y2: bh, stroke: '#222', 'stroke-width': 0.05 }, g);
for (let i = 0; i <= n; i++) mk('line', { x1: i*seg, y1: 0, x2: i*seg, y2: bh, stroke: '#222', 'stroke-width': 0.04 }, g);
} else if (st === 'doppia') {
const hb = bh/2;
for (let i = 0; i < n; i++) {
mk('rect', { x: i*seg, y: 0, width: seg, height: hb, fill: i%2 ? '#fff' : '#222', stroke: '#222', 'stroke-width': 0.02 }, g);
mk('rect', { x: i*seg, y: hb, width: seg, height: hb, fill: i%2 ? '#222' : '#fff', stroke: '#222', 'stroke-width': 0.02 }, g);
}
} else {
for (let i = 0; i < n; i++) mk('rect', { x: i*seg, y: 0, width: seg, height: bh, fill: i%2 ? '#fff' : '#222', stroke: '#222', 'stroke-width': 0.03 }, g);
}
for (let i = 0; i <= n; i++) txt(g, i*seg, -fs*0.35, numIt(i*seg), fs, '#222', 'middle');
txt(g, n*seg/2, bh + fs*1.25, (RS.scene && RS.scene.fuoriScala) ? 'metri (riferimento — fuori scala)' : ('metri  —  scala 1:' + (RS.scene ? RS.scene.scaleDenom : 100)), fs, '#222', 'middle');
}
function copiaMiniatura(e) {
const c = Object.assign({}, e, { x: 0, y: 0, rot: 0, id: null });
delete c.rilpts; c.spigoli = false; c.snodo = 0; c.evidenzia = false; c.llx = null; c.lly = null;
c.freccia = false; delete c.danni;
if (c.letter != null) c.letter = '';
return c;
}
function miniatura(e, bw, bh) {
const c = copiaMiniatura(e), node = RS.elements.render(c), b = RS.elements.bounds(c);
if (node) ETICH = ETICH.filter(o => !node.contains(o.node));
if (!node || !b || !(b.w > 0) || !(b.h > 0)) return null;
const k = Math.min(bw / b.w, bh / b.h), wrap = N('g');
wrap.setAttribute('transform', `translate(${bw/2 - (b.x + b.w/2)*k} ${bh/2 - (b.y + b.h/2)*k}) scale(${k})`);
wrap.appendChild(node);
return wrap;
}
function miniaturaSvg(e, pxW, pxH) {
const m = miniatura(e, pxW, pxH); if (!m) return '';
return `<svg viewBox="0 0 ${pxW} ${pxH}" width="${pxW}" height="${pxH}" aria-hidden="true">${m.outerHTML}</svg>`;
}
const LEG_ICONA = 2.2;
function senzaMinimi(fn) { const ms = RS.minSimbolo; RS.minSimbolo = 0; try { fn(); } finally { RS.minSimbolo = ms; } }
function scalaTesto(e) {
const fs = e.fs || 0.6, k = RS.minTesto && fs < RS.minTesto ? RS.minTesto / fs : 1;
return k > 1 ? ` scale(${k.toFixed(3)})` : '';
}
function drawLegend(g, e) {
const fs = e.fs || 0.6, rows = legendRows(e), mt = legendMetrics(e, rows);
panel(g, mt.w, mt.h, 'LEGENDA', fs);
const sagome = e.sagome !== false, pad = fs*0.7, rh = fs*1.6, sw = sagome ? fs*LEG_ICONA : fs*1.2;
rows.forEach((r, i) => {
const y = pad + rh*(i + 1) + fs*0.2;
const mini = sagome && r.ref ? miniatura(r.ref, sw, fs*1.15) : null;
if (mini) {
const gi = mk('g', { transform: `translate(${pad} ${y - fs*0.08})` }, g);
if (r.trasp) gi.setAttribute('opacity', 0.55);
gi.appendChild(mini);
} else {
const bn = RS.bn && r.trama != null, x0 = pad + (sw - fs*1.2) / 2;
mk('rect', { x: x0, y: y, width: fs*1.2, height: fs, fill: bn ? '#f4f4f4' : (r.c || '#888'), stroke: 'rgba(0,0,0,.4)', 'stroke-width': 0.02,
'stroke-dasharray': r.trasp ? '0.12 0.07' : '', opacity: r.trasp && !bn ? 0.5 : 1 }, g);
if (bn) mk('rect', { x: x0, y: y, width: fs*1.2, height: fs, fill: `url(#patBN${r.trama})`, opacity: 0.7, stroke: nero, 'stroke-width': 0.03 }, g);
}
txt(g, pad + sw + 0.3, y + fs*0.8, r.t, fs, '#111', 'start');
});
}
function drawMeasureTable(g, e) {
const fs = e.fs || 0.6, rows = measureRows(), mt = tableMetrics(e, rows);
panel(g, mt.w, mt.h, 'MISURE', fs);
const pad = fs*0.7, rh = fs*1.6;
rows.forEach((r, i) => {
const y = pad + rh*(i + 1) + fs;
txt(g, pad, y, r.k, fs, '#111', 'start', true);
txt(g, pad + fs*2.6, y, r.v, fs, '#111', 'start');
txt(g, mt.w - pad, y, r.d, fs*0.85, '#555', 'end');
});
if (!rows.length) txt(g, pad, pad + rh + fs, 'Nessuna quota inserita', fs*0.9, '#888', 'start');
}
function panel(g, w, h, title, fs) {
mk('rect', { x: 0, y: 0, width: w, height: h, fill: '#fff', stroke: '#222', 'stroke-width': 0.06 }, g);
mk('rect', { x: 0, y: 0, width: w, height: fs*1.5, fill: '#222' }, g);
txt(g, fs*0.6, fs*1.05, title, fs*0.95, '#fff', 'start', true);
}
function txt(g, x, y, str, fs, fill, anchor, bold) {
const t = N('text');
t.setAttribute('x', x); t.setAttribute('y', y); t.setAttribute('font-size', fs);
t.setAttribute('fill', fill); t.setAttribute('text-anchor', anchor || 'start');
if (bold) t.setAttribute('font-weight', '700');
t.textContent = str; g.appendChild(t); return t;
}
function vehName(e) { const d = RS.catalog.veicoloById(e.catId); return d ? d.nome : 'Veicolo'; }
function legendAutoRows() {
const els = RS.scene.elements, rows = [];
const visti = {};
els.filter(e => e.type === 'vehicle').sort((a, b) => String(a.label||'').localeCompare(String(b.label||''), undefined, { numeric: true }))
.forEach(e => {
const k = e.label || e.id;
if (!visti[k]) {
visti[k] = 1;
const base = els.find(v => v.type === 'vehicle' && (v.label || v.id) === k && !v.fase) || e;
const descr = (base.modello && String(base.modello).trim()) || vehName(base);
rows.push({ key: 'veh:' + k, ref: base, c: base.color, trama: tramaVeicolo(base),
t: (e.label ? e.label + ' — ' : '') + descr + (base.targa ? ' (' + String(base.targa).trim().toUpperCase() + ')' : '') });
if (e.label) els.filter(v => v.type === 'vehicle' && v.label === e.label && v.fase)
.sort(ordinePosizioni).map(v => ({ v, s: siglaFase(v) }))
.forEach(x => rows.push({ key: 'fase:' + x.v.id, ref: x.v, c: x.v.color, trama: tramaVeicolo(x.v), trasp: !!x.v.trasp,
t: x.s + ' — ' + nomeFase(x.v.fase).toLowerCase() }));
}
});
els.filter(e => e.letter).forEach(e => rows.push({ key: 'cap:' + e.letter, ref: e, c: e.color, t: e.letter + ' — Caposaldo' }));
if (RS.incroci) RS.incroci.vociLegenda().forEach(r => rows.push(r));
const seen = {};
els.filter(e => e.type === 'symbol' && !e.letter && !e.inc).forEach(e => {
const STATI = { rosso: 'rosso', giallo: 'giallo', verde: 'verde', lampeggiante: 'giallo lampeggiante', spento: 'spento' };
const k = (e.catId || e.sym) + (e.stato ? ':' + e.stato : ''); if (seen[k]) return; seen[k] = 1;
rows.push({ key: 'sym:' + k, ref: e, c: e.color, t: (e.nome || e.sym) + (e.stato && STATI[e.stato] ? ' (' + STATI[e.stato] + ')' : '') });
});
return rows;
}
function chiavePlanimetria(r) {
const k = String(r.key || '');
if (k.indexOf('veh:') === 0) return 'veic:' + k.slice(4);
if (k.indexOf('cap:') === 0) return k;
if (k.indexOf('fase:') === 0 && r.ref) return 'fase:' + siglaFase(r.ref);
if (k.indexOf('sym:') === 0 && r.ref && r.ref.nome) return 'sim:' + r.ref.nome;
if (r.t && !r.custom && !/^(veh|cap|fase|sym|x)\d*:/.test(k)) return 'str:' + r.t;
return '';
}
function legendRows(le) {
let rows = legendAutoRows();
const LP = (RS.scene && RS.scene.meta && RS.scene.meta.legenda) || null;
if (LP) {
const no = LP.no || {}, nomi = LP.nomi || {};
rows = rows.filter(r => !no[chiavePlanimetria(r)]);
rows.forEach(r => { const n = String(nomi[chiavePlanimetria(r)] || '').trim(); if (n) r.t = n; });
(LP.agg || []).map(t => String(t || '').trim()).filter(Boolean).forEach((t, i) => rows.push({ key: 'agg:' + i, c: '#b9b9b9', t, custom: true }));
}
if (le && le.hidden && le.hidden.length) rows = rows.filter(r => le.hidden.indexOf(r.key) < 0);
if (le && le.labels) rows.forEach(r => { const o = le.labels[r.key]; if (o != null && o !== '') r.t = o; });
if (le && le.extra) le.extra.forEach((x, i) => rows.push({ key: 'x' + i, c: x.c || '#888', t: x.t || '', custom: true }));
return rows;
}
RS._legendAutoRows = legendAutoRows; RS._legendRows = legendRows;
function measureRows() {
const els = RS.scene.elements, rows = []; let q = 1, f = 1, m = 1;
(RS.scene.misure || []).forEach(x => {
const v = (x.val == null || x.val === '') ? '' : (metri(x.val) + ' m');
rows.push({ k: 'M' + (m++), v: v, d: x.descr || 'misura' });
});
els.filter(e => e.type === 'measure').forEach(e => {
const v = (e.valore != null && e.valore !== '') ? Number(e.valore) : dist(e.pts[0], e.pts[1]);
rows.push({ k: 'Q' + (q++), v: metri(v) + ' m', d: e.note || 'quota' });
});
els.filter(e => e.type === 'skid').forEach(e => {
rows.push({ k: 'F' + (f++), v: metri(polyLength(e)) + ' m', d: e.note || (e.stile === 'solco' ? 'solco' : e.dashed ? 'scarrocciamento' : 'frenata') });
});
return rows;
}
function legendMetrics(e, rows) {
rows = rows || legendRows(e); const fs = e.fs || 0.6;
const maxch = Math.max(8, ...rows.map(r => r.t.length));
return { w: fs*0.7*2 + fs*(e.sagome !== false ? LEG_ICONA : 1.2) + 0.3 + maxch*fs*0.55, h: fs*0.7*2 + fs*1.6*(rows.length + 1) };
}
function tableMetrics(e, rows) {
rows = rows || measureRows(); const fs = e.fs || 0.6;
const maxd = Math.max(8, ...rows.map(r => r.d.length));
return { w: fs*0.7*2 + fs*2.6 + fs*4 + maxd*fs*0.5, h: fs*0.7*2 + fs*1.6*(Math.max(rows.length, 1) + 1) };
}
function polyLength(e) { let d = 0; for (let i = 1; i < e.pts.length; i++) d += dist(e.pts[i-1], e.pts[i]); return d; }
function dist(a, b) { return Math.hypot(b.x - a.x, b.y - a.y); }
function niceSeg(total) {
const target = total / 5, steps = [0.5, 1, 2, 2.5, 5, 10, 20, 25, 50, 100];
let best = steps[0]; for (const v of steps) if (Math.abs(v - target) < Math.abs(best - target)) best = v;
return best;
}
RS._legendMetrics = legendMetrics; RS._tableMetrics = tableMetrics;
const LABEL_CENTER = { vehicle: 1, building: 1, area: 1, parking: 1, island: 1 };
let ETICH = [];
function annota(o) { ETICH.push(o); }
function ostacolo(node, cx, cy, hw, hh) { annota({ node, cx, cy, hw, hh: hh == null ? hw : hh, ux: 1, uy: 0, fisso: true }); }
function altAnello(ax, ay, cx, cy, hh) {
const dx = cx - ax, dy = cy - ay, out = [];
const c = [[-dx, dy], [dx, -dy], [-dx, -dy], [0, -(Math.abs(dy) + hh*1.6)], [0, Math.abs(dy) + hh*1.6]];
[1, 1.8].forEach(k => (k === 1 ? c : [[dx, dy]].concat(c)).forEach(p => out.push([ax + p[0]*k - cx, ay + p[1]*k - cy])));
return out;
}
function spostaXY(t) {
return (dx, dy) => { t.setAttribute('x', +t.getAttribute('x') + dx); t.setAttribute('y', +t.getAttribute('y') + dy); };
}
function sovrapposte(a, b) {
const dx = b.cx - a.cx, dy = b.cy - a.cy;
const assi = [[a.ux, a.uy], [-a.uy, a.ux], [b.ux, b.uy], [-b.uy, b.ux]];
for (const [px, py] of assi) {
const ra = a.hw*Math.abs(a.ux*px + a.uy*py) + a.hh*Math.abs(-a.uy*px + a.ux*py);
const rb = b.hw*Math.abs(b.ux*px + b.uy*py) + b.hh*Math.abs(-b.uy*px + b.ux*py);
if (Math.abs(dx*px + dy*py) >= ra + rb) return false;
}
return true;
}
const metri = (v, d) => Number(v).toFixed(d == null ? 2 : d).replace('.', ',');
const numIt = v => String(+Number(v).toFixed(2)).replace('.', ',');
function drawFrecciaMarcia(g, e) {
const a = e.len / 2 + 0.4, b = e.len / 2 + Math.max(3.5, e.len * 0.95), h = Math.max(0.5, e.wid * 0.32), c = RS.bn ? '#000' : '#222';
const f = mk('g', { class: 'v-freccia', opacity: 0.5 }, g);
mk('path', { d: `M${a} 0H${b - h * 0.6}`, stroke: c, 'stroke-width': Math.max(0.12, e.wid * 0.08), fill: 'none', 'stroke-linecap': 'round' }, f);
mk('path', { d: `M${b} 0L${b - h * 1.4} ${-h}L${b - h * 1.4} ${h}Z`, fill: c }, f);
}
function drawLabel(g, e) {
if (!e.label) return;
const fs = Math.max(0.45, (e.type === 'vehicle') ? Math.min(e.wid, e.len) * 0.5 : (e.size || 0.6) * 0.9);
const t = N('text');
let oy = 0;
if (!LABEL_CENTER[e.type]) {
const half = e.size ? e.size / 2 : (RS.elements.localSize(e).h / 2);
oy = -(half + fs * 0.75);
}
t.setAttribute('x', 0); t.setAttribute('y', oy);
t.setAttribute('font-size', fs);
t.setAttribute('text-anchor', 'middle');
t.setAttribute('dy', '0.35em');
t.setAttribute('font-weight', '700');
t.setAttribute('transform', `rotate(${-(e.rot||0)})`);
t.textContent = e.type === 'vehicle' ? siglaFase(e) : e.label;
if (e.type === 'vehicle') {
t.setAttribute('font-size', fs * 0.82);
const n = t.textContent.length, alto = fs * 1.12, largo = Math.max(alto, n * fs * 0.52 + fs * 0.5);
const fondo = N('rect');
[['x', -largo / 2], ['y', oy - alto / 2], ['width', largo], ['height', alto], ['rx', alto / 2], ['fill', '#fff'],
['stroke', '#1b1f24'], ['stroke-width', fs * 0.09], ['transform', `rotate(${-(e.rot||0)})`], ['class', 'v-lettera']]
.forEach(([k, v]) => fondo.setAttribute(k, v));
g.appendChild(fondo);
t.setAttribute('fill', '#1b1f24');
t.setAttribute('y', oy + fs * 0.03);
} else {
t.setAttribute('fill', '#fff');
t.setAttribute('paint-order', 'stroke');
t.setAttribute('stroke', '#000'); t.setAttribute('stroke-width', fs * 0.12);
}
g.appendChild(t);
const hw = t.textContent.length*fs*0.32 + 0.04, hh = fs*0.5;
if (LABEL_CENTER[e.type]) ostacolo(t, e.x || 0, e.y || 0, hw, hh);
else {
const cx = e.x || 0, cy = (e.y || 0) + oy;
annota({ node: t, cx, cy, hw, hh, ux: 1, uy: 0, alt: altAnello(e.x || 0, e.y || 0, cx, cy, hh), sposta: spostaXY(t) });
}
}
RS.elements = {
render(e) {
const g = group(e);
const x = e.x || 0, y = e.y || 0, rot = e.rot || 0;
switch (e.type) {
case 'vehicle': {
g.setAttribute('transform', `translate(${x} ${y}) rotate(${rot})`);
let corpo = g;
if (e.trasp) {
corpo = mk('g', { opacity: 0.42 }, g);
mk('rect', { x: -e.len/2, y: -e.wid/2, width: e.len, height: e.wid, rx: Math.min(0.4, e.wid*0.25), fill: 'none',
stroke: RS.bn ? nero : (e.color || '#2f6fed'), 'stroke-width': 0.07, 'stroke-dasharray': '0.3 0.18' }, g);
} else if (ombraConFiltro()) g.setAttribute('filter', 'url(#softShadow)');
else ombraSemplice(g, -e.len/2, -e.wid/2, e.len, e.wid, Math.min(0.4, e.wid*0.25));
const sulleRuote = !e.posa || e.posa === 'ruote';
if (DUE_RUOTE[e.kind] && e.evidenzia !== false)
mk('ellipse', { cx: 0, cy: 0, rx: e.len/2 + 0.35, ry: e.wid/2 + 0.35, fill: 'rgba(255,255,255,.6)',
stroke: RS.bn ? nero : (e.color || '#d23838'), 'stroke-width': 0.06, 'stroke-dasharray': '0.18 0.1' }, corpo);
drawVehicleBody(corpo, e); drawTramaBN(corpo, e);
if (DUE_RUOTE[e.kind] && e.pilota && sulleRuote) drawPilota(corpo, e);
drawDanni(g, e); drawLabel(g, e);
if (e.freccia) drawFrecciaMarcia(g, e);
if (e.rilpts || e.spigoli) drawVehiclePoints(g, e);
break;
}
case 'symbol': {
const sz = e.size || 0.6, k = RS.minSimbolo && sz < RS.minSimbolo ? RS.minSimbolo / sz : 1;
g.setAttribute('transform', `translate(${x} ${y}) rotate(${rot})` + (k > 1 ? ` scale(${k.toFixed(3)})` : ''));
drawSymbol(g, e);
if (e.sym === 'caposaldo' && e.letter) { e._lbl = e.letter; }
if (e.letter && e.sym === 'caposaldo') drawCaposaldoLetter(g, e);
else drawLabel(g, e);
break;
}
case 'road':
g.setAttribute('transform', `translate(${x} ${y}) rotate(${rot})`); drawRoad(g, e); break;
case 'raccordo':
g.setAttribute('transform', `translate(${x} ${y}) rotate(${rot})`); drawRaccordo(g, e); break;
case 'crosswalk':
g.setAttribute('transform', `translate(${x} ${y}) rotate(${rot})`); drawCrosswalk(g, e); break;
case 'nucleo':
g.setAttribute('transform', `translate(${x} ${y})`); drawNucleo(g, e); break;
case 'curva':
g.setAttribute('transform', `translate(${x} ${y}) rotate(${rot})`); if (RS.curve) RS.curve.disegna(g, e); break;
case 'svasatura':
g.setAttribute('transform', `translate(${x} ${y}) rotate(${rot})`); drawSvasatura(g, e); break;
case 'stopline':
g.setAttribute('transform', `translate(${x} ${y}) rotate(${rot})`); drawStopline(g, e); break;
case 'building':
g.setAttribute('transform', `translate(${x} ${y}) rotate(${rot})`);
if (ombraConFiltro()) g.setAttribute('filter', 'url(#softShadow)');
else ombraSemplice(g, -e.w/2, -e.h/2, e.w, e.h, 0);
drawBuilding(g, e); drawLabel(g, e); break;
case 'image':
g.setAttribute('transform', `translate(${x} ${y}) rotate(${rot})`); drawImage(g, e); break;
case 'surveypt':
g.setAttribute('transform', `translate(${x} ${y})`); drawSurveyPt(g, e); break;
case 'foto':
g.setAttribute('transform', `translate(${x} ${y})`); drawFoto(g, e); break;
case 'panorama':
g.setAttribute('transform', `translate(${x} ${y})`); drawPanorama(g, e); break;
case 'roadway': drawRoadway(g, e); break;
case 'zebrapath': drawZebraPath(g, e); break;
case 'ramp':
g.setAttribute('transform', `translate(${x} ${y}) rotate(${rot})`); drawRamp(g, e); break;
case 'sketch': drawSketch(g, e); break;
case 'band':
g.setAttribute('transform', `translate(${x} ${y}) rotate(${rot})`); drawBand(g, e); break;
case 'area':
g.setAttribute('transform', `translate(${x} ${y}) rotate(${rot})`); drawArea(g, e); break;
case 'roundabout':
g.setAttribute('transform', `translate(${x} ${y})`); drawRoundabout(g, e); break;
case 'island':
g.setAttribute('transform', `translate(${x} ${y}) rotate(${rot})`); drawIsland(g, e); break;
case 'parking':
g.setAttribute('transform', `translate(${x} ${y}) rotate(${rot})`); drawParking(g, e); break;
case 'mark':
g.setAttribute('transform', `translate(${x} ${y}) rotate(${rot})`); drawMark(g, e); break;
case 'north':
g.setAttribute('transform', `translate(${x} ${y}) rotate(${rot})`); drawNorth(g, e); break;
case 'graphscale':
g.setAttribute('transform', `translate(${x} ${y})`); drawGraphScale(g, e); break;
case 'legend':
g.setAttribute('transform', `translate(${x} ${y})` + scalaTesto(e)); senzaMinimi(() => drawLegend(g, e)); break;
case 'measuretable':
g.setAttribute('transform', `translate(${x} ${y})` + scalaTesto(e)); senzaMinimi(() => drawMeasureTable(g, e)); break;
case 'skid': drawSkid(g, e); break;
case 'path': drawSkid(g, e); break;
case 'measure': drawMeasure(g, e); break;
case 'angle': drawAngle(g, e); break;
case 'arrow': drawArrow(g, e); break;
case 'text':
g.setAttribute('transform', `translate(${x} ${y}) rotate(${rot})`); drawText(g, e); break;
default: return null;
}
return g;
},
bounds(e) {
if (e.type === 'nucleo') return boundsNucleo(e);
if (e.type === 'incrocio') return RS.incroci ? RS.incroci.bounds(e) : null;
if (e.type === 'raccordo') {
const P = puntiRaccordo(e);
const xs = P.map(p => p.x), ys = P.map(p => p.y);
const x = Math.min.apply(null, xs), y = Math.min.apply(null, ys);
return { x, y, w: Math.max.apply(null, xs) - x, h: Math.max.apply(null, ys) - y };
}
if (e.type === 'skid' || e.type === 'path' || e.type === 'measure' || e.type === 'arrow' || e.type === 'roadway' || e.type === 'zebrapath' || e.type === 'angle' || e.type === 'sketch') {
if (!e.pts || !e.pts.length) return null;
const P = RS.elements.resolvePts(e);
let minX=1e9,minY=1e9,maxX=-1e9,maxY=-1e9;
P.forEach(p => { minX=Math.min(minX,p.x);minY=Math.min(minY,p.y);maxX=Math.max(maxX,p.x);maxY=Math.max(maxY,p.y); });
const m = (e.width||0.2)/2 + 0.1;
return { x:minX-m, y:minY-m, w:(maxX-minX)+2*m, h:(maxY-minY)+2*m };
}
if (e.type === 'legend') { const mt = legendMetrics(e); return { x: e.x, y: e.y, w: mt.w, h: mt.h }; }
if (e.type === 'measuretable') { const mt = tableMetrics(e); return { x: e.x, y: e.y, w: mt.w, h: mt.h }; }
if (e.type === 'graphscale') { const len = e.size||10, fs = Math.max(0.4,len*0.07); return { x: e.x, y: e.y - fs, w: len, h: Math.max(0.3,len*0.05) + fs*2.5 }; }
let w, h;
if (e.type === 'vehicle') { w = e.len; h = e.wid; }
else if (e.type === 'road' || e.type === 'crosswalk' || e.type === 'band' || e.type === 'ramp') { w = e.len; h = e.wid + Math.abs(arcoDi(e)); }
else if (e.type === 'svasatura') { w = e.len; h = Math.max(e.w0 || 0, e.w1 || 0) + Math.abs(+e.off0 || 0) * 2; }
else if (e.type === 'curva') { const d = RS.curve ? RS.curve.dim(e) : { w: 10, h: 10 }; w = d.w; h = d.h; }
else if (e.type === 'stopline' || e.type === 'mark') { w = e.len; h = 0.5; }
else if (e.type === 'building' || e.type === 'island' || e.type === 'parking' || e.type === 'image' || e.type === 'area') { w = e.w; h = e.h; }
else if (e.type === 'roundabout') { w = e.size; h = e.size; }
else if (e.type === 'north') { w = e.size; h = e.size; }
else if (e.type === 'text') { w = (e.text||'').length * (e.size||0.8)*0.55; h = (e.size||0.8); }
else { w = e.size || 0.6; h = e.size || 0.6; }
const rad = (e.rot||0)*Math.PI/180, c = Math.abs(Math.cos(rad)), s = Math.abs(Math.sin(rad));
const bw = w*c + h*s, bh = w*s + h*c;
return { x: (e.x||0) - bw/2, y: (e.y||0) - bh/2, w: bw, h: bh };
},
vehiclePointCount(e) { return patternPoints(e).length; },
snapPoints(e) {
if (e.pts) return RS.elements.resolvePts(e).map(p => ({ x: p.x, y: p.y }));
const out = [], id = e.id, rot = (e.rot||0)*Math.PI/180, c = Math.cos(rot), s = Math.sin(rot);
const toW = (lx, ly) => ({ x: (e.x||0) + lx*c - ly*s, y: (e.y||0) + lx*s + ly*c, anchor: { id, lx, ly } });
if (e.type === 'vehicle') {
patternPoints(e).forEach(p => { const q = locale(e, p.lx, p.ly); out.push(toW(q.lx, q.ly)); });
out.push(toW(0, 0));
} else if (e.type === 'road') {
const hl = e.len/2, hw = e.wid/2;
out.push(toW(-hl,0), toW(hl,0), toW(0,0), toW(hl,-hw), toW(hl,hw), toW(-hl,-hw), toW(-hl,hw));
} else if (e.x != null) {
out.push(toW(0, 0));
}
return out;
},
localSize(e) {
if (e.type === 'vehicle') return { w: e.len, h: e.wid };
if (e.type === 'road' || e.type === 'crosswalk' || e.type === 'band' || e.type === 'ramp') return { w: e.len, h: e.wid + Math.abs(arcoDi(e)) };
if (e.type === 'stopline' || e.type === 'mark') return { w: e.len, h: 0.5 };
if (e.type === 'building' || e.type === 'island' || e.type === 'parking' || e.type === 'image' || e.type === 'area') return { w: e.w, h: e.h };
if (e.type === 'roundabout' || e.type === 'north') return { w: e.size, h: e.size };
if (e.type === 'svasatura') return { w: e.len, h: Math.max(e.w0 || 0, e.w1 || 0) };
if (e.type === 'nucleo') { const b = boundsNucleo(e); return { w: b.w, h: b.h }; }
if (e.type === 'curva') return RS.curve ? RS.curve.dim(e) : { w: 10, h: 10 };
if (e.type === 'incrocio') { const m = (e.bracci || []).reduce((a, b) => Math.max(a, (+b.len || 16) + Math.abs(+b.off || 0)), 4) + 2; return { w: m * 2, h: m * 2 }; }
if (e.type === 'text') return { w: (e.text||'').length*(e.size||0.8)*0.55, h: (e.size||0.8) };
return { w: e.size || 0.6, h: e.size || 0.6 };
}
};
RS.elements.FASI = FASI; RS.elements.DANNI = DANNI;
RS.elements.miniaturaSvg = miniaturaSvg;
RS.elements.arcoDi = arcoDi; RS.elements.impostaArco = impostaArco; RS.elements.CURVABILI = CURVABILI;
RS.elements.sezione = sezione; RS.elements.margini = margini; RS.elements.agganciaCorsia = agganciaCorsia; RS.elements.geoRampa = geoRampa; RS.elements.barrieraCentrale = barrieraCentrale; RS.elements.avviaSezione = avviaSezione; RS.elements.aggiornaSezione = aggiornaSezione;
RS.elements.latiMarc = latiMarc; RS.elements.impostaMarc = impostaMarc; RS.elements.etichettaVia = etichettaVia;
RS.elements.SEZIONE_K = SEZIONE_K; RS.elements.geometriaRaccordo = geometriaRaccordo; RS.elements.strisciaRaccordo = strisciaRaccordo; RS.elements.puntiRaccordo = puntiRaccordo;
RS.elements.locale = locale; RS.elements.snodoInfo = snodoInfo; RS.elements.DUE_RUOTE = DUE_RUOTE;
RS.elements.siglaFase = siglaFase; RS.elements.ordinePosizioni = ordinePosizioni; RS.elements.nomeFase = nomeFase; RS.elements.ordineFase = k => ORDINE_FASE[k];
RS.elements.separaEtichette = function (radice) {
const tutte = ETICH.filter(o => o.node.isConnected && (!radice || radice.contains(o.node)));
ETICH = [];
const posate = tutte.filter(o => o.fisso);
tutte.filter(o => !o.fisso).forEach(o => {
let scelta = [0, 0];
for (const d of [[0, 0]].concat(o.alt || [])) {
const p = { cx: o.cx + d[0], cy: o.cy + d[1], hw: o.hw, hh: o.hh, ux: o.ux, uy: o.uy };
if (!posate.some(q => q.node !== o.node && sovrapposte(p, q))) { scelta = d; break; }
}
if (scelta[0] || scelta[1]) o.sposta(scelta[0], scelta[1]);
posate.push({ node: o.node, cx: o.cx + scelta[0], cy: o.cy + scelta[1], hw: o.hw, hh: o.hh, ux: o.ux, uy: o.uy });
});
};
RS.elements.capLetterOffset = function (e) {
const s = e.size || 0.5;
return { lx: (e.llx != null ? e.llx : s*0.9), ly: (e.lly != null ? e.lly : -s*0.7) };
};
RS.elements.makeRilpts = function (e, base) {
return patternPoints(e).map((p, i) => ({ lx: p.lx, ly: p.ly, n: base + i }));
};
RS.elements.resolvePt = function (pt) {
if (!pt) return { x: 0, y: 0 };
if (pt.aid == null) return { x: pt.x, y: pt.y };
const e = RS.scene.get(pt.aid);
if (!e || e.x == null) return { x: pt.x, y: pt.y };
const r = (e.rot||0)*Math.PI/180, c = Math.cos(r), s = Math.sin(r);
return { x: e.x + pt.alx*c - pt.aly*s, y: e.y + pt.alx*s + pt.aly*c };
};
RS.elements.resolvePts = function (e) { return (e.pts || []).map(p => RS.elements.resolvePt(p)); };
RS.elements.roadMaskShape = function (e, pre, marc) {
pre = pre || '';
const inf = marc ? 0 : 0.4;
if (e.type === 'raccordo') {
const p = N('path');
p.setAttribute('d', formaRaccordo(e, marc ? 'marc' : 'segni')); p.setAttribute('fill', '#000');
p.setAttribute('transform', `${pre} translate(${e.x} ${e.y}) rotate(${e.rot||0})`);
return p;
}
if (e.type === 'road') {
const da = !marc && +e.mascheraDa > 0 ? Math.min(+e.mascheraDa, e.len) : 0;
const r = N('rect');
r.setAttribute('x', -(e.len/2 + inf) + da); r.setAttribute('y', -(e.wid/2 + inf));
r.setAttribute('width', e.len + inf*2 - da); r.setAttribute('height', e.wid + inf*2);
r.setAttribute('fill', '#000');
r.setAttribute('transform', `${pre} translate(${e.x} ${e.y}) rotate(${e.rot||0})`);
return r;
}
if (e.type === 'roadway') {
if (!e.pts || e.pts.length < 2) return null;
const p = N('path');
p.setAttribute('d', smoothD(e.pts)); p.setAttribute('fill', 'none');
p.setAttribute('stroke', '#000'); p.setAttribute('stroke-width', (e.width||7) + inf*2);
p.setAttribute('stroke-linecap', 'butt'); p.setAttribute('stroke-linejoin', 'round');
if (pre) p.setAttribute('transform', pre);
return p;
}
if (e.type === 'nucleo') {
if (marc || !(e.tagli && e.tagli.length)) return null;
const p = N('path');
p.setAttribute('d', e.tagli.map(t => 'M' + t.map(q => q.x + ' ' + q.y).join(' L') + ' Z').join(' ')); p.setAttribute('fill', '#000');
p.setAttribute('transform', `${pre} translate(${e.x} ${e.y})`);
return p;
}
if (e.type === 'curva') return RS.curve ? RS.curve.forma(e, pre, inf) : null;
if (e.type === 'roundabout') {
const c = N('circle');
c.setAttribute('cx', 0); c.setAttribute('cy', 0); c.setAttribute('r', (e.size||20)/2 + inf);
c.setAttribute('fill', '#000');
c.setAttribute('transform', `${pre} translate(${e.x} ${e.y})`);
return c;
}
return null;
};
function drawCaposaldoLetter(g, e) {
const t = N('text');
const p = RS.elements.capLetterOffset(e);
t.setAttribute('x', p.lx); t.setAttribute('y', p.ly);
t.setAttribute('font-size', (e.size||0.5)*1.3);
t.setAttribute('fill', e.color || '#b00'); t.setAttribute('font-weight','700');
t.setAttribute('paint-order','stroke'); t.setAttribute('stroke','#f4f1e8'); t.setAttribute('stroke-width',0.06);
t.setAttribute('transform', `rotate(${-(e.rot||0)})`);
t.textContent = e.letter;
g.appendChild(t);
const fs = (e.size||0.5)*1.3, hw = String(e.letter).length*fs*0.32 + 0.04, hh = fs*0.5;
const x = e.x || 0, y = e.y || 0, cx = x + p.lx + hw, cy = y + p.ly - fs*0.35;
ostacolo(g, x, y, (e.size||0.5)/2);
if (e.llx != null || e.lly != null) ostacolo(t, cx, cy, hw, hh);
else annota({ node: t, cx, cy, hw, hh, ux: 1, uy: 0, alt: altAnello(x, y, cx, cy, hh), sposta: spostaXY(t) });
}
})(window.RS = window.RS || {});

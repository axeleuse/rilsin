(function (RS) {
'use strict';
const NS = 'http://www.w3.org/2000/svg';
function mk(tag, attrs, parent) {
const n = document.createElementNS(NS, tag);
for (const k in attrs) if (attrs[k] != null && attrs[k] !== '') n.setAttribute(k, attrs[k]);
if (parent) parent.appendChild(n);
return n;
}
const ROSSO = '#c8102e', BLU = '#1d5fbf', NERO = '#111', BIANCO = '#fff', GIALLO = '#f6c400';
const tratto = (d, w, col, p) => mk('path', { d, fill: 'none', stroke: col || NERO, 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, p);
const pieno = (d, col, p) => mk('path', { d, fill: col || NERO }, p);
function freccia(p, x0, y0, x1, y1, w, col) {
const a = Math.atan2(y1 - y0, x1 - x0), l = Math.hypot(x1 - x0, y1 - y0), hw = w * 1.9, hl = w * 2.2;
const g = mk('g', { transform: `translate(${x0} ${y0}) rotate(${a * 180 / Math.PI})` }, p);
pieno(`M0 ${-w/2} L${l - hl} ${-w/2} L${l - hl} ${-hw} L${l} 0 L${l - hl} ${hw} L${l - hl} ${w/2} L0 ${w/2} Z`, col, g);
}
function pedone(p, x, y, k, col) {
const g = mk('g', { transform: `translate(${x} ${y}) scale(${k})` }, p);
mk('circle', { cx: 0.04, cy: -0.8, r: 0.1, fill: col }, g);
tratto('M0.02 -0.66 L-0.04 -0.3', 0.17, col, g);
tratto('M-0.04 -0.3 L-0.2 -0.05 L-0.26 0.12', 0.12, col, g);
tratto('M-0.04 -0.3 L0.12 -0.06 L0.2 0.12', 0.12, col, g);
tratto('M0.02 -0.6 L-0.16 -0.42 L-0.2 -0.26', 0.09, col, g);
tratto('M0.02 -0.6 L0.16 -0.44 L0.24 -0.3', 0.09, col, g);
}
function bicicletta(p, x, y, k, col) {
const g = mk('g', { transform: `translate(${x} ${y}) scale(${k})` }, p);
const w = 0.07;
mk('circle', { cx: -0.32, cy: 0, r: 0.22, fill: 'none', stroke: col, 'stroke-width': w }, g);
mk('circle', { cx: 0.32, cy: 0, r: 0.22, fill: 'none', stroke: col, 'stroke-width': w }, g);
tratto('M-0.32 0 L-0.08 -0.3 L0.2 -0.3 L0.32 0 M-0.32 0 L0 0 L0.2 -0.3 M-0.08 -0.3 L0 0 M-0.14 -0.36 L-0.02 -0.36 M0.2 -0.3 L0.16 -0.42 L0.26 -0.42', w, col, g);
}
function autocarro(p, x, y, k, col) {
const g = mk('g', { transform: `translate(${x} ${y}) scale(${k})` }, p);
pieno('M-0.62 -0.36 L0.16 -0.36 L0.16 0.08 L-0.62 0.08 Z', col, g);
pieno('M0.2 -0.22 L0.44 -0.22 L0.6 -0.04 L0.6 0.08 L0.2 0.08 Z', col, g);
pieno('M0.27 -0.18 L0.42 -0.18 L0.52 -0.06 L0.27 -0.06 Z', BIANCO, g);
[-0.44, -0.2, 0.42].forEach(cx => mk('circle', { cx, cy: 0.12, r: 0.1, fill: col, stroke: BIANCO, 'stroke-width': 0.03 }, g));
}
function automobile(p, x, y, k, col) {
const g = mk('g', { transform: `translate(${x} ${y}) scale(${k})` }, p);
pieno('M-0.55 0.05 L-0.55 -0.12 L-0.4 -0.16 L-0.24 -0.34 L0.22 -0.34 L0.38 -0.16 L0.55 -0.12 L0.55 0.05 Z', col, g);
pieno('M-0.18 -0.29 L0.17 -0.29 L0.28 -0.17 L-0.3 -0.17 Z', BIANCO, g);
[-0.32, 0.32].forEach(cx => mk('circle', { cx, cy: 0.06, r: 0.11, fill: col, stroke: BIANCO, 'stroke-width': 0.03 }, g));
}
function animale(p, x, y, k, col, selvatico) {
const g = mk('g', { transform: `translate(${x} ${y}) scale(${k})` }, p);
if (selvatico) {
pieno('M-0.42 -0.1 Q-0.2 -0.26 0.18 -0.2 L0.3 -0.34 L0.42 -0.3 L0.34 -0.12 Q0.2 0.02 -0.08 0.02 Q-0.32 0.04 -0.42 -0.1 Z', col, g);
tratto('M-0.36 -0.02 L-0.58 0.18 M-0.24 0.02 L-0.44 0.26 M0.12 -0.02 L0.36 0.2 M0.2 -0.06 L0.46 0.08', 0.07, col, g);
tratto('M0.32 -0.34 L0.26 -0.56 L0.18 -0.62 M0.26 -0.5 L0.36 -0.6 M0.38 -0.32 L0.46 -0.52 L0.54 -0.58 M0.46 -0.48 L0.4 -0.6', 0.04, col, g);
} else {
pieno('M-0.5 -0.22 Q-0.5 -0.32 -0.38 -0.32 L0.26 -0.32 L0.42 -0.42 L0.56 -0.4 L0.6 -0.26 L0.46 -0.18 L0.4 0 L-0.46 0 Q-0.52 -0.06 -0.5 -0.22 Z', col, g);
tratto('M-0.4 -0.04 L-0.4 0.22 M-0.24 -0.04 L-0.24 0.22 M0.2 -0.04 L0.2 0.22 M0.34 -0.04 L0.34 0.22 M-0.5 -0.22 L-0.6 0.02', 0.07, col, g);
tratto('M0.44 -0.42 L0.4 -0.52 M0.52 -0.42 L0.58 -0.5', 0.035, col, g);
}
}
function barra(p) { mk('path', { d: 'M-0.6 -0.6 L0.6 0.6', stroke: ROSSO, 'stroke-width': 0.17, 'stroke-linecap': 'butt' }, p); }
function triangolo(p, fondo) {
mk('path', { d: 'M0 -1 L1.1 0.9 L-1.1 0.9 Z', fill: ROSSO, stroke: BIANCO, 'stroke-width': 0.05, 'stroke-linejoin': 'round' }, p);
mk('path', { d: 'M0 -0.62 L0.76 0.7 L-0.76 0.7 Z', fill: fondo || BIANCO }, p);
}
function disco(p, fondo, bordo) {
mk('circle', { cx: 0, cy: 0, r: 1, fill: bordo || ROSSO, stroke: BIANCO, 'stroke-width': 0.05 }, p);
mk('circle', { cx: 0, cy: 0, r: bordo === BLU ? 0.93 : 0.8, fill: fondo || BIANCO }, p);
}
function quadro(p, w, h, fondo, bordo) {
mk('rect', { x: -w/2, y: -h/2, width: w, height: h, rx: 0.1, fill: fondo, stroke: bordo || BIANCO, 'stroke-width': bordo ? 0.08 : 0.05 }, p);
}
function scritta(p, txt, fs, col, y) {
const t = mk('text', { x: 0, y: y || 0, 'font-size': fs, 'text-anchor': 'middle', dy: '0.35em', fill: col, 'font-weight': 700, 'font-family': 'Arial, Helvetica, sans-serif' }, p);
t.textContent = txt;
}
const PERICOLO = {
pericolo:      p => { pieno('M-0.07 -0.32 L0.07 -0.32 L0.05 0.2 L-0.05 0.2 Z', NERO, p); mk('circle', { cx: 0, cy: 0.38, r: 0.08, fill: NERO }, p); },
curva_dx:      p => tratto('M-0.14 0.56 L-0.14 0.12 Q-0.14 -0.2 0.22 -0.3', 0.17, NERO, p),
curva_sx:      p => tratto('M0.14 0.56 L0.14 0.12 Q0.14 -0.2 -0.22 -0.3', 0.17, NERO, p),
doppia_curva:  p => tratto('M-0.12 0.56 L-0.12 0.34 Q-0.12 0.12 0.1 0.04 Q0.26 -0.04 0.1 -0.34', 0.15, NERO, p),
incrocio:      p => { pieno('M-0.07 -0.34 L0.07 -0.34 L0.07 0.58 L-0.07 0.58 Z', NERO, p); pieno('M-0.44 0.06 L0.44 0.06 L0.44 0.2 L-0.44 0.2 Z', NERO, p); },
incrocio_prec: p => { pieno('M-0.09 -0.34 L0.09 -0.34 L0.09 0.58 L-0.09 0.58 Z', NERO, p); pieno('M-0.44 0.1 L0.44 0.1 L0.44 0.17 L-0.44 0.17 Z', NERO, p); },
strettoia:     p => { pieno('M-0.34 0.6 L-0.2 0.6 L-0.2 0.24 L-0.08 0.04 L-0.08 -0.3 L-0.2 -0.3 L-0.2 0 L-0.34 0.22 Z', NERO, p);
pieno('M0.34 0.6 L0.2 0.6 L0.2 0.24 L0.08 0.04 L0.08 -0.3 L0.2 -0.3 L0.2 0 L0.34 0.22 Z', NERO, p); },
dosso:         p => pieno('M-0.6 0.62 L-0.42 0.62 Q0 0.06 0.42 0.62 L0.6 0.62 L0.6 0.68 L-0.6 0.68 Z', NERO, p),
sdrucciolevole:p => { automobile(mk('g', { transform: 'rotate(-12)' }, p), 0, -0.02, 0.62, NERO);
tratto('M-0.3 0.6 Q-0.42 0.46 -0.28 0.36 Q-0.14 0.26 -0.24 0.14 M0.12 0.6 Q0 0.46 0.14 0.36 Q0.28 0.26 0.18 0.14', 0.06, NERO, p); },
pedoni:        p => { pieno('M-0.5 0.58 L0.5 0.58 L0.5 0.66 L-0.5 0.66 Z', NERO, p); pedone(p, 0, 0.5, 0.95, NERO); },
bambini:       p => { pedone(p, -0.2, 0.6, 0.85, NERO); pedone(p, 0.22, 0.6, 0.62, NERO); },
ciclisti:      p => bicicletta(p, 0, 0.36, 0.95, NERO),
animali:       p => animale(p, 0, 0.36, 1, NERO, false),
selvatici:     p => animale(p, 0, 0.36, 1, NERO, true),
semaforo:      p => { mk('rect', { x: -0.18, y: -0.36, width: 0.36, height: 0.94, rx: 0.08, fill: NERO }, p);
[['#e53935', -0.18], ['#fbc02d', 0.11], ['#43a047', 0.4]].forEach(([c, y]) => mk('circle', { cx: 0, cy: y, r: 0.11, fill: c }, p)); },
doppio_senso:  p => { freccia(p, -0.2, 0.6, -0.2, -0.3, 0.09, NERO); freccia(p, 0.2, -0.3, 0.2, 0.6, 0.09, NERO); },
pl_barriere:   p => { pieno('M-0.5 0.04 L0.5 0.04 L0.5 0.4 L-0.5 0.4 Z', NERO, p);
[-0.3, 0, 0.3].forEach(x => pieno(`M${x - 0.07} 0.08 L${x + 0.07} 0.08 L${x + 0.07} 0.36 L${x - 0.07} 0.36 Z`, BIANCO, p));
tratto('M-0.42 0.4 L-0.42 0.62 M0.42 0.4 L0.42 0.62', 0.07, NERO, p); },
banchina:      p => { pieno('M-0.5 0.6 L0.1 0.6 L0.1 -0.2 L-0.5 -0.2 Z', NERO, p); automobile(mk('g', { transform: 'rotate(25)' }, p), 0.18, 0.22, 0.42, NERO); }
};
const AGGIUSTA = {
curva_dx: [0.87, 0.09], curva_sx: [0.87, 0.09], bambini: [1, -0.08], animali: [0.71, 0.19], selvatici: [0.7, 0.19],
pl_barriere: [0.88, 0.08], banchina: [0.78, 0.18], doppio_senso: [0.98, 0.07], incrocio: [1, 0.05], sdrucciolevole: [0.98, 0.04],
doppia_curva: [1, 0.02], incrocio_prec: [1, 0.02]
};
const DIVIETO = {
transito:      () => {},
sosta:         p => barra(p),
fermata:       p => { barra(p); mk('path', { d: 'M0.6 -0.6 L-0.6 0.6', stroke: ROSSO, 'stroke-width': 0.17 }, p); },
svolta_dx:     p => { tratto('M-0.18 0.5 L-0.18 -0.06 Q-0.18 -0.22 0 -0.22 L0.12 -0.22', 0.13, NERO, p); freccia(p, 0.08, -0.22, 0.42, -0.22, 0.13, NERO); barra(p); },
svolta_sx:     p => { tratto('M0.18 0.5 L0.18 -0.06 Q0.18 -0.22 0 -0.22 L-0.12 -0.22', 0.13, NERO, p); freccia(p, -0.08, -0.22, -0.42, -0.22, 0.13, NERO); barra(p); },
inversione:    p => { tratto('M0.22 0.5 L0.22 -0.12 Q0.22 -0.4 0 -0.4 Q-0.22 -0.4 -0.22 -0.12 L-0.22 0.06', 0.12, NERO, p); freccia(p, -0.22, 0, -0.22, 0.42, 0.12, NERO); barra(p); },
autocarri:     p => autocarro(p, 0, 0.1, 1, NERO),
pedoni:        p => { pedone(p, 0, 0.42, 0.95, NERO); barra(p); },
biciclette:    p => bicicletta(p, 0, 0.12, 1, NERO),
veicoli:       p => { automobile(p, -0.02, 0.08, 0.95, NERO); }
};
const OBBLIGO = {
passaggio_dx:  p => freccia(p, -0.36, -0.36, 0.42, 0.42, 0.17, BIANCO),
passaggio_sx:  p => freccia(p, 0.36, -0.36, -0.42, 0.42, 0.17, BIANCO),
ciclabile:     p => bicicletta(p, 0, 0.12, 1.05, BIANCO),
pedonale:      p => { pedone(p, -0.18, 0.52, 0.95, BIANCO); pedone(p, 0.24, 0.52, 0.65, BIANCO); },
ciclopedonale: p => { tratto('M0 -0.84 L0 0.84', 0.05, BIANCO, p); bicicletta(p, -0.4, 0.1, 0.5, BIANCO); pedone(p, 0.42, 0.42, 0.8, BIANCO); },
fine_ciclabile:p => { bicicletta(p, 0, 0.12, 1.05, BIANCO); mk('path', { d: 'M-0.66 -0.66 L0.66 0.66', stroke: ROSSO, 'stroke-width': 0.14 }, p); },
diritto_dx:    p => { tratto('M-0.14 0.62 L-0.14 -0.06', 0.16, BIANCO, p); freccia(p, -0.14, 0, -0.14, -0.62, 0.16, BIANCO); tratto('M-0.14 0.16 Q-0.14 -0.02 0.12 -0.02', 0.16, BIANCO, p); freccia(p, 0.08, -0.02, 0.6, -0.02, 0.16, BIANCO); }
};
const INDICAZIONE = {
senso_unico:   (p, e) => { quadro(p, 2, 0.9, BLU); freccia(p, -0.78, 0, 0.82, 0, 0.18, BIANCO); },
senso_unico_f: p => { quadro(p, 1.7, 1.7, BLU); freccia(p, 0, 0.66, 0, -0.66, 0.24, BIANCO); },
parcheggio:    p => { quadro(p, 1.7, 1.7, BLU); scritta(p, 'P', 1.35, BIANCO, 0.06); },
senza_uscita:  p => { quadro(p, 1.7, 1.7, BLU); pieno('M-0.15 -0.2 L0.15 -0.2 L0.15 0.68 L-0.15 0.68 Z', BIANCO, p); pieno('M-0.5 -0.58 L0.5 -0.58 L0.5 -0.3 L-0.5 -0.3 Z', ROSSO, p); },
ospedale:      p => { quadro(p, 1.7, 1.7, BLU); scritta(p, 'H', 1.25, BIANCO, 0.06); },
centro:        (p, e) => { quadro(p, 2.4, 1.2, BIANCO, NERO); scritta(p, (e.text || 'CITTÀ').toUpperCase(), Math.min(0.42, 2.0 / Math.max(4, (e.text || 'CITTÀ').length) * 1.6), NERO, 0.02); },
fine_centro:   (p, e) => { quadro(p, 2.4, 1.2, BIANCO, NERO); scritta(p, (e.text || 'CITTÀ').toUpperCase(), Math.min(0.42, 2.0 / Math.max(4, (e.text || 'CITTÀ').length) * 1.6), NERO, 0.02);
mk('path', { d: 'M-1.1 0.52 L1.1 -0.52', stroke: ROSSO, 'stroke-width': 0.13 }, p); },
fine_dirprec:  p => { mk('path', { d: 'M0 -1 L1 0 L0 1 L-1 0 Z', fill: BIANCO, stroke: '#333', 'stroke-width': 0.05 }, p);
mk('path', { d: 'M0 -0.7 L0.7 0 L0 0.7 L-0.7 0 Z', fill: GIALLO }, p);
tratto('M-0.62 0.62 L0.62 -0.62', 0.09, '#333', p); tratto('M-0.48 0.6 L0.6 -0.48 M-0.6 0.48 L0.48 -0.6', 0.05, '#333', p); }
};
function famiglia(cod) {
const [f, c] = String(cod || '').split(':');
if (f === 'p' && PERICOLO[c]) return { f: 'p', c };
if (f === 'd' && DIVIETO[c]) return { f: 'd', c };
if (f === 'o' && OBBLIGO[c]) return { f: 'o', c };
if (f === 'i' && INDICAZIONE[c]) return { f: 'i', c };
return { f: 'p', c: 'pericolo' };
}
RS.cartelli = {
disegna(g, e) {
const h = (e.size || 0.9) / 2, k = famiglia(e.cod);
const dritto = !(k.f === 'i' && k.c === 'senso_unico');
const p = mk('g', { transform: `${dritto ? `rotate(${-(e.rot || 0)}) ` : ''}scale(${h})` }, g);
if (k.f === 'p') {
const giallo = e.provv ? GIALLO : BIANCO;
triangolo(p, giallo);
const agg = AGGIUSTA[k.c], q0 = agg ? mk('g', { transform: `translate(0 ${agg[1]}) scale(${agg[0]})` }, p) : p;
const q = mk('g', { transform: 'translate(0 0.05) scale(0.92)' }, q0);
PERICOLO[k.c](q, e);
} else if (k.f === 'd') {
const blu = k.c === 'sosta' || k.c === 'fermata';
disco(p, blu ? BLU : BIANCO, ROSSO);
DIVIETO[k.c](p, e);
} else if (k.f === 'o') {
disco(p, BLU, BLU);
mk('circle', { cx: 0, cy: 0, r: 0.96, fill: 'none', stroke: BIANCO, 'stroke-width': 0.05 }, p);
OBBLIGO[k.c](p, e);
} else {
INDICAZIONE[k.c](p, e);
}
},
conTesto(cod) { return cod === 'i:centro' || cod === 'i:fine_centro'; },
famiglia
};
})(window.RS = window.RS || {});

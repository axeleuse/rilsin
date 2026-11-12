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
const AUTO_BANCHINA = 'm -502.38703,440.76328 c -6.60391,0.69332 -13.41106,4.10043 -16.00756,7.54033 l -25.76174,44.83344 18.25205,-0.19405 15.56071,-28.91272 c 3.37314,-6.56905 10.1336,-8.51289 17.15917,-8.10719 33.81069,2.44637 67.24916,7.65036 100.24835,15.37175 6.82266,1.72468 12.56622,5.61319 13.80905,12.89238 l 6.22532,32.36237 17.30979,5.71207 -11.1177,-50.69103 c -1.64861,-4.64144 -8.40025,-10.72089 -15.50199,-12.82599 -20.6151,-5.27777 -40.67616,-9.28146 -60.21538,-12.24632 -19.53921,-2.96484 -38.63866,-4.92547 -57.22533,-5.84229 -0.92575,-0.0158 -1.79133,0.008 -2.73474,0.10725 z m -24.97527,58.23647 c -8.5953,0.457 -17.23943,1.2694 -25.86387,2.31855 -1.92833,-0.29664 -4.2287,3.61272 -5.00731,8.67404 l -0.41877,2.62495 40.67642,6.23042 c 1.29222,0.19884 2.13697,1.48396 1.93552,2.79347 l -0.63326,3.80719 c -0.20146,1.30956 -1.36585,2.25937 -2.65814,2.06065 l -40.5462,-6.23554 -1.24608,8.1353 40.15552,6.25085 c 1.28365,0.19751 2.3048,1.09528 2.16533,2.00189 l -0.41877,2.62495 c -0.13938,0.90665 -1.4051,1.47675 -2.68878,1.27928 l -40.15552,-6.25085 0.005,0.13024 c -0.77862,5.06144 0.14768,9.40395 2.07595,9.70055 l 204.96523,31.61165 c 1.92845,0.29664 4.09841,-3.60759 4.87711,-8.66895 l 0.12512,-0.13533 -39.36394,-6.02102 c -1.28379,-0.19747 -2.04435,-1.10558 -1.90489,-2.0121 l 0.41876,-2.62496 c 0.1395,-0.90656 1.14465,-1.46653 2.42835,-1.26906 l 39.2337,6.02611 1.37119,-8.27059 -39.23369,-6.02615 c -1.29225,-0.19876 -2.1318,-1.35372 -1.93041,-2.66324 l 0.49791,-3.93229 c 0.20143,-1.3096 1.50119,-2.1343 2.79348,-1.93554 l 39.10349,6.03123 0.41367,-2.75515 c 0.77862,-5.0614 -0.14755,-9.40394 -2.07596,-9.70055 -33.85547,-14.60572 -67.94873,-24.62234 -102.12261,-29.90598 -25.63044,-3.9627 -51.18776,-5.26488 -76.97366,-3.89402 z m 44.1057,23.83389 c 0.46635,-0.1209 0.92244,-0.13463 1.43249,-0.0562 l 56.5563,8.73793 c 2.04022,0.31378 3.49286,2.20369 3.16882,4.31018 l -2.39257,15.48414 c -0.32401,2.10648 -2.27005,3.48264 -4.31023,3.16882 l -56.55119,-8.60769 c -2.04019,-0.31387 -3.36776,-2.33903 -3.04371,-4.44555 l 2.39258,-15.4841 c 0.24305,-1.57984 1.34848,-2.74481 2.74751,-3.10755 z m -83.53859,24.92678 c -1.37975,0.26628 -2.44964,1.19541 -2.64282,2.4513 l -1.23076,8.52594 c -0.25761,1.67443 1.12364,3.08958 3.13307,3.39865 l 213.62654,32.96758 c 2.00935,0.30907 3.8227,-0.70292 4.08043,-2.37727 l 1.36098,-8.53107 c 0.25765,-1.67443 -1.13398,-3.35002 -3.1433,-3.65909 l -213.75166,-32.83221 c -0.50233,-0.0773 -0.97257,-0.0326 -1.43248,0.0562 z m 3.62078,19.16104 -3.21478,21.12469 c -0.62539,4.06579 2.0011,7.74474 6.06699,8.37022 l 24.93186,3.84801 c 4.06586,0.62557 7.8699,-2.13659 8.49532,-6.2023 l 3.2199,-20.99445 -39.49929,-6.14617 z m 163.23679,25.16171 -3.3501,20.99953 c -0.62544,4.06579 2.13134,7.73957 6.19722,8.36509 l 24.93187,3.84806 c 4.06571,0.62544 7.87498,-2.00631 8.50042,-6.07211 l 3.21478,-21.12469 -39.49419,-6.01588 z';
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
pl_barriere:   p => mk('path', { transform: 'matrix(0.0026768 0 0 0.0026768 -1.11628 -1.00906)', 'fill-rule': 'evenodd', fill: NERO,
d: 'M327.19 370.75L307.6 392.43V415.81H283.7V454.99H307.6V545.36H283.7V584.54H307.6V606.35H346.78V584.54H396.4V606.35H435.58V584.54H485.21V606.35H524.39V584.54H550.38V545.36H524.39V454.99H550.38V415.81H524.39V392.43L504.8 370.75L485.21 392.43V415.81H435.58V392.43L415.99 370.75L396.4 392.43V415.81H346.78V392.43ZM346.78 454.99H396.4V545.36H346.78ZM435.58 454.99H485.21V545.36H435.58Z' }, p),
banchina:      p => {
mk('path', { transform: 'matrix(0.0026768 0 0 0.0026768 1.25926 -1.22991)', 'fill-rule': 'evenodd', fill: NERO, d: AUTO_BANCHINA }, p);
pieno('M-0.556 0.386 L0.018 0.386 L0.018 0.482 L-0.556 0.482 Z', NERO, p);
[[0.071, 0.427, 0.037], [0.133, 0.479, 0.032], [0.207, 0.482, 0.026], [0.513, 0.565, 0.034], [0.366, 0.589, 0.032], [0.289, 0.573, 0.027],
[0.091, 0.543, 0.025], [0.043, 0.486, 0.018], [0.169, 0.547, 0.018], [0.232, 0.538, 0.023], [0.28, 0.481, 0.019], [0.34, 0.518, 0.022],
[0.441, 0.542, 0.019], [0.464, 0.618, 0.016], [0.553, 0.637, 0.016]].forEach(([cx, cy, r]) => mk('circle', { cx, cy, r, fill: NERO }, p));
}
};
const AGGIUSTA = {
curva_dx: [0.87, 0.09], curva_sx: [0.87, 0.09], bambini: [1, -0.08], animali: [0.71, 0.19], selvatici: [0.7, 0.19],
pl_barriere: [1 / 0.92, -0.05 / 0.92], banchina: [1 / 0.92, -0.05 / 0.92], doppio_senso: [0.98, 0.07], incrocio: [1, 0.05], sdrucciolevole: [0.98, 0.04],
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

(function (RS) {
'use strict';
const WMS = 'http://wms.pcn.minambiente.it/ogc?map=/ms_ogc/WMS_v1.3/raster/ortofoto_colore_12.map';
const STRATI = ['OI.ORTOIMMAGINI.2012.32', 'OI.ORTOIMMAGINI.2012.33'];
const FONTE = 'Geoportale Nazionale (MASE) - ortofoto a colori 2012';
function metriPerGrado(lat) {
const f = lat * Math.PI / 180;
return {
lat: 111132.92 - 559.82 * Math.cos(2 * f) + 1.175 * Math.cos(4 * f),
lon: 111412.84 * Math.cos(f) - 93.5 * Math.cos(3 * f)
};
}
function riquadro(lat, lon, lato) {
const m = metriPerGrado(lat), dLat = lato / 2 / m.lat, dLon = lato / 2 / m.lon;
return { minLat: lat - dLat, minLon: lon - dLon, maxLat: lat + dLat, maxLon: lon + dLon };
}
function url(strato, bb, px) {
const n = v => v.toFixed(7);
return WMS + '&SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=' + strato + '&STYLES=' +
'&CRS=EPSG:4326&BBOX=' + [n(bb.minLat), n(bb.minLon), n(bb.maxLat), n(bb.maxLon)].join(',') +
'&WIDTH=' + px + '&HEIGHT=' + px + '&FORMAT=image/jpeg';
}
function ordineStrati(lon) { return lon < 12 ? STRATI.slice() : STRATI.slice().reverse(); }
function leggiCoordinate(txt) {
const s = String(txt || '').replace(/,(\d)/g, '.$1');
const num = s.match(/-?\d+(?:\.\d+)?/g);
if (!num || num.length < 2) return null;
let lat = +num[0], lon = +num[1];
if (/\bS\b/.test(s)) lat = -Math.abs(lat);
if (/\b[OW]\b/.test(s)) lon = -Math.abs(lon);
if (!isFinite(lat) || !isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
return { lat, lon };
}
function posizioneTavola() {
const m = RS.scene.meta || {};
if (m.gps && isFinite(m.gps.lat) && isFinite(m.gps.lon)) return { lat: +m.gps.lat, lon: +m.gps.lon, acc: m.gps.acc };
return leggiCoordinate(m.coordinate);
}
function vuota(img) {
const cv = document.createElement('canvas'); cv.width = 24; cv.height = 24;
const cx = cv.getContext('2d'); cx.drawImage(img, 0, 0, 24, 24);
const d = cx.getImageData(0, 0, 24, 24).data;
let s = 0, s2 = 0, n = 0;
for (let i = 0; i < d.length; i += 4) { const y = (d[i] + d[i+1] + d[i+2]) / 3; s += y; s2 += y*y; n++; }
const media = s / n, dev = Math.sqrt(Math.max(0, s2 / n - media*media));
return dev < 4;
}
function caricaImmagine(blob) {
return new Promise((ok, ko) => {
const u = URL.createObjectURL(blob), img = new Image();
img.onload = () => { ok(img); setTimeout(() => URL.revokeObjectURL(u), 1000); };
img.onerror = () => { URL.revokeObjectURL(u); ko(new Error('immagine non valida')); };
img.src = u;
});
}
function conTempo(p, ms) {
return Promise.race([p, new Promise((_, ko) => setTimeout(() => ko(new Error('tempo scaduto')), ms))]);
}
function scarica(lat, lon, lato) {
const bb = riquadro(lat, lon, lato);
const px = Math.max(600, Math.min(1600, Math.round(lato / 0.12)));
const strati = ordineStrati(lon);
const prova = (i) => {
if (i >= strati.length) return Promise.reject(new Error('fuori copertura'));
return conTempo(fetch(url(strati[i], bb, px), { cache: 'no-store', mode: 'cors' }), 30000)
.then(r => {
const tipo = r.headers.get('Content-Type') || '';
if (!r.ok || tipo.indexOf('image') < 0) throw new Error('risposta non valida');
return r.blob();
})
.then(caricaImmagine)
.then(img => {
if (vuota(img)) return prova(i + 1);
const cv = document.createElement('canvas'); cv.width = img.naturalWidth; cv.height = img.naturalHeight;
cv.getContext('2d').drawImage(img, 0, 0);
return { href: cv.toDataURL('image/jpeg', 0.85), strato: strati[i], lato, px };
}, e => { if (e.message === 'tempo scaduto') throw e; return prova(i + 1); });
};
return prova(0);
}
function inserisci(r, pos) {
const S = RS.scene;
const nord = S.elements.find(e => e.type === 'north');
const rot = nord ? (+nord.rot || 0) : 0;
const geo = { lat: pos.lat, lon: pos.lon, lato: r.lato, strato: r.strato, fonte: FONTE, data: new Date().toISOString() };
const vecchia = S.elements.find(e => e.type === 'image' && e.geo);
let e;
if (vecchia) {
Object.assign(vecchia, { href: r.href, w: r.lato, h: r.lato, rot, geo, opacity: vecchia.opacity != null ? vecchia.opacity : 0.75 });
e = vecchia; S.render(); S.snapshot();
} else {
const v = S.view, cx = v.x + v.w / 2, cy = v.y + v.h / 2;
e = S.add({ type: 'image', href: r.href, x: cx, y: cy, rot, w: r.lato, h: r.lato, opacity: 0.75, locked: false, z: -1000, geo }, false);
if (!nord) S.add({ type: 'north', x: v.x + v.w * 0.92, y: v.y + v.h * 0.1, rot: 0, size: Math.max(2, Math.round(v.w / 25)) }, false);
S.snapshot();
}
S.select(e.id);
return e;
}
RS.ortofoto = {
FONTE, riquadro, url, leggiCoordinate, metriPerGrado, ordineStrati, scarica, posizioneTavola,
apri() {
const ui = RS.ui;
const pos = posizioneTavola();
if (!pos) {
ui.scelta({
titolo: 'Foto aerea dal Geoportale',
testo: 'Serve la posizione del luogo. Sul posto rilevala con il GPS; altrimenti scrivi le coordinate in Dati della tavola (es. N 45,40612° E 11,87652°).',
opzioni: [
{ k: 'gps', t: '📍 Rileva la posizione con il GPS', d: 'Poi scarica subito la foto aerea', primario: true },
{ k: 'dati', t: '✏ Scrivi le coordinate', d: 'Apre Dati della tavola' }
]
}).then(k => {
if (k === 'gps') { ui._dopoGps = () => this.apri(); ui.rilevaPosizione(); ui.toast('Ricerca della posizione…'); }
else if (k === 'dati') ui.openData();
});
return;
}
if (navigator.onLine === false) {
ui.toast('Nessuna connessione: la foto aerea dal Geoportale richiede internet. Senza rete usa «Immagine dal dispositivo» e Calibra scala.', 6000);
return;
}
ui.scelta({
titolo: 'Foto aerea dal Geoportale',
testo: 'Ortofoto del Geoportale Nazionale (2012) centrata in ' + pos.lat.toFixed(5).replace('.', ',') + '°, ' +
pos.lon.toFixed(5).replace('.', ',') + '°: arriva già in scala e con il Nord in alto. Quanta zona vuoi?',
opzioni: [
{ k: '80', t: 'Incrocio o tratto breve', d: 'riquadro di 80 × 80 m' },
{ k: '150', t: 'Zona del sinistro', d: 'riquadro di 150 × 150 m', primario: true },
{ k: '300', t: 'Zona ampia', d: 'riquadro di 300 × 300 m (meno dettagliata)' }
]
}).then(k => {
if (!k) return;
ui.toast('Scarico la foto aerea dal Geoportale…', 30000);
scarica(pos.lat, pos.lon, +k).then(r => {
inserisci(r, pos);
ui.toast('Foto aerea inserita in scala, Nord in alto. Spostala sotto il disegno, poi «Blocca sfondo». Ortofoto 2012: verifica lo stato dei luoghi.', 7000);
}).catch(e => {
const m = e.message === 'fuori copertura' ? 'Il Geoportale non ha la foto aerea per questo punto: controlla le coordinate.'
: 'Geoportale non raggiungibile (' + e.message + '). Serve internet; senza rete usa «Immagine dal dispositivo» e Calibra scala.';
ui.toast(m, 7000);
});
});
}
};
})(window.RS = window.RS || {});

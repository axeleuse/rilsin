(function (RS) {
'use strict';
const VEICOLI = [
{ id: 'utilitaria',   nome: 'Utilitaria',      len: 3.7,  wid: 1.6,  kind: 'car',      color: '#2f6fed' },
{ id: 'autovettura',  nome: 'Autovettura',     len: 4.3,  wid: 1.8,  kind: 'car',      color: '#2f6fed' },
{ id: 'berlina',      nome: 'Berlina',         len: 4.7,  wid: 1.85, kind: 'car',      color: '#2456b8' },
{ id: 'suv',          nome: 'SUV / fuoristrada', len: 4.6, wid: 1.9,  kind: 'car',      color: '#1d8f5c' },
{ id: 'sw',           nome: 'Station wagon',   len: 4.75, wid: 1.82, kind: 'car',      color: '#5b6b7a' },
{ id: 'coupe',        nome: 'Coupé',           len: 4.4,  wid: 1.82, kind: 'car',      color: '#b3202a' },
{ id: 'cabrio',       nome: 'Cabriolet',       len: 4.2,  wid: 1.78, kind: 'car',      color: '#e2b13c' },
{ id: 'pickup',       nome: 'Pick-up',         len: 5.3,  wid: 1.9,  kind: 'car',      color: '#6e7b52' },
{ id: 'monovolume',   nome: 'Monovolume',      len: 4.5,  wid: 1.85, kind: 'van',      color: '#2a9d8f' },
{ id: 'taxi',         nome: 'Taxi',            len: 4.5,  wid: 1.85, kind: 'car',      color: '#f0c000' },
{ id: 'ffoo',         nome: 'Veicolo FF.OO.',  len: 4.6,  wid: 1.9,  kind: 'car',      color: '#16407a' },
{ id: 'quadriciclo',  nome: 'Quadriciclo',     len: 2.9,  wid: 1.5,  kind: 'car',      color: '#9b59b6' },
{ id: 'camper',       nome: 'Camper',          len: 6.5,  wid: 2.3,  kind: 'van',      color: '#d9b38c' },
{ id: 'furgone',      nome: 'Furgone',         len: 5.4,  wid: 2.0,  kind: 'van',      color: '#e0a020' },
{ id: 'furgonegr',    nome: 'Furgone grande',  len: 6.8,  wid: 2.1,  kind: 'van',      color: '#c98a18' },
{ id: 'ambulanza',    nome: 'Ambulanza',       len: 5.8,  wid: 2.1,  kind: 'van',      color: '#e64545' },
{ id: 'autocarro',    nome: 'Autocarro',       len: 7.5,  wid: 2.5,  kind: 'truck',    color: '#c0532a' },
{ id: 'autocarro3',   nome: 'Autocarro 3 assi',len: 9.0,  wid: 2.55, kind: 'truck',    color: '#a8461f' },
{ id: 'betoniera',    nome: "Mezzo d'opera (betoniera)", len: 8.5,  wid: 2.55, kind: 'truck',    color: '#8a6d3b' },
{ id: 'cisterna',     nome: 'Autocisterna',    len: 10.0, wid: 2.55, kind: 'truck',    color: '#d0d4d9' },
{ id: 'vvf',          nome: 'Vigili del Fuoco',len: 8.0,  wid: 2.5,  kind: 'truck',    color: '#c8102e' },
{ id: 'operatrice',   nome: 'Macchina operatrice', len: 5.0,  wid: 2.3,  kind: 'truck',    color: '#e08a00' },
{ id: 'carroattrezzi',nome: 'Carro attrezzi',  len: 7.0,  wid: 2.4,  kind: 'truck',    color: '#d2691e' },
{ id: 'motrice',      nome: 'Motrice',         len: 6.0,  wid: 2.5,  kind: 'truck',    color: '#5a6470' },
{ id: 'rimorchio',    nome: 'Rimorchio',       len: 7.0,  wid: 2.5,  kind: 'trailer',  color: '#7a828c' },
{ id: 'autoartic',    nome: 'Autoarticolato',  len: 16.5, wid: 2.55, kind: 'artic',    color: '#555f6b' },
{ id: 'autotreno',    nome: 'Autotreno',       len: 18.75,wid: 2.55, kind: 'roadtrain',color: '#4a525c' },
{ id: 'autobus',      nome: 'Autobus',         len: 12.0, wid: 2.55, kind: 'bus',      color: '#7a52c4' },
{ id: 'autosnodato',  nome: 'Autobus snodato', len: 18.0, wid: 2.55, kind: 'bus',      color: '#6a45b0' },
{ id: 'tram',         nome: 'Tram',            len: 20.0, wid: 2.4,  kind: 'bus',      color: '#3a8fb0' },
{ id: 'trattore',     nome: 'Trattore agricolo', len: 4.2,  wid: 2.1,  kind: 'tract',    color: '#3a8a36' },
{ id: 'rimagri',      nome: 'Rimorchio agricolo', len: 5.5, wid: 2.3, kind: 'trailer', color: '#b5392b' },
{ id: 'mietitrebbia', nome: 'Mietitrebbia',    len: 9.0,  wid: 3.5,  kind: 'combine',  color: '#3f8f3a' },
{ id: 'quad',         nome: 'Quad',            len: 2.0,  wid: 1.2,  kind: 'quad',     color: '#c0392b' },
{ id: 'motociclo',    nome: 'Motociclo',       len: 2.1,  wid: 0.8,  kind: 'moto',     color: '#d23838' },
{ id: 'scooter',      nome: 'Scooter',         len: 1.95, wid: 0.75, kind: 'moto',     color: '#d2a038' },
{ id: 'ciclomotore',  nome: 'Ciclomotore',     len: 1.9,  wid: 0.7,  kind: 'moto',     color: '#cf7a1f' },
{ id: 'motocarro',    nome: 'Motocarro / Ape', len: 2.6,  wid: 1.4,  kind: 'ape',      color: '#3a9a6a' },
{ id: 'velocipede',   nome: 'Bicicletta (velocipede)', len: 1.8,  wid: 0.6,  kind: 'bike',     color: '#2aa3a3' },
{ id: 'cargobike',    nome: 'Cargo bike',      len: 2.6,  wid: 0.85, kind: 'bike',     color: '#2a7fa3' },
{ id: 'carrozzina',   nome: 'Carrozzina disabili', len: 1.1, wid: 0.66, kind: 'carrozzina', color: '#34495e' },
{ id: 'monopattino',  nome: 'Monopattino',     len: 1.1,  wid: 0.45, kind: 'monopattino',color: '#16a085' }
];
function sez(cA, cB, corsia, spart, banch, marc, frecce, extra) {
const s = Object.assign({ cA, cB, corsia, spart: spart || 0, banch: banch || 0, marc: marc || 0, frecce: !!frecce }, extra || {});
const em = +s.emerg || 0, su = em && cB ? em : s.banch, giu = em && cA ? em : s.banch;
return { sez: s, wid: Math.round(((cA + cB) * corsia + (cA && cB ? s.spart : 0) + su + giu) * 100) / 100, lanes: cA + cB };
}
const AUTO = { emerg: 3.0 };
const STRADE = [
Object.assign({ id: 'strada',     nome: 'Tratto rettilineo', sec: 'Carreggiata', tool: 'road', color: '#9aa0a6' }, sez(1, 1, 3.25, 0, 0.25)),
Object.assign({ id: 'strada_urb', nome: 'Urbana con marciapiedi', sec: 'Carreggiata', tool: 'road', color: '#9aa0a6' }, sez(1, 1, 3.0, 0, 0.25, 1.5)),
Object.assign({ id: 'strada_ext', nome: 'Extraurbana con banchine', sec: 'Carreggiata', tool: 'road', color: '#9aa0a6' }, sez(1, 1, 3.75, 0, 1.25)),
Object.assign({ id: 'strada_su',  nome: 'Senso unico a 2 corsie', sec: 'Carreggiata', tool: 'road', color: '#9aa0a6' }, sez(2, 0, 3.0, 0, 0.25, 1.5, true)),
Object.assign({ id: 'strada_4',   nome: '4 corsie con spartitraffico', sec: 'Carreggiata', tool: 'road', color: '#9aa0a6' }, sez(2, 2, 3.5, 2.0, 0.5, 0, true)),
{ id: 'stradacurva',nome: 'Strada curva / libera',sec: 'Carreggiata',tool:'roadpath',  wid: 7,  color: '#9aa0a6' },
Object.assign({ id: 'auto_2',  nome: 'Carreggiata autostradale a 2 corsie', sec: 'Autostrada', tool: 'road', color: '#9aa0a6' }, sez(2, 0, 3.75, 0, 0.7, 0, true, AUTO)),
Object.assign({ id: 'auto_3',  nome: 'Carreggiata autostradale a 3 corsie', sec: 'Autostrada', tool: 'road', color: '#9aa0a6' }, sez(3, 0, 3.75, 0, 0.7, 0, true, AUTO)),
Object.assign({ id: 'auto_22', nome: 'Autostrada 2+2 con new jersey', sec: 'Autostrada', tool: 'road', color: '#9aa0a6' }, sez(2, 2, 3.75, 2.0, 0.7, 0, true, Object.assign({ spTipo: 'newjersey' }, AUTO))),
Object.assign({ id: 'auto_33', nome: 'Autostrada 3+3 con guard-rail', sec: 'Autostrada', tool: 'road', color: '#9aa0a6' }, sez(3, 3, 3.75, 2.6, 0.7, 0, true, Object.assign({ spTipo: 'guardrail' }, AUTO))),
{ id: 'piazzola',   nome: 'Piazzola di sosta', sec: 'Autostrada', tool: 'band', sub: 'piazzola', wid: 3.0, color: '#9aa0a6' },
{ id: 'rotatoria',  nome: 'Rotatoria',         sec: 'Carreggiata', tool: 'roundabout',size: 20, ring: 6, color: '#9aa0a6' },
{ id: 'corsiaimm',  nome: 'Corsia di immissione (accelerazione)', sec: 'Carreggiata', tool: 'ramp', kind: 'in',  len: 60, wid: 3.75, ram: 8, cus: 18, rac: 20, color: '#9aa0a6' },
{ id: 'corsiausc',  nome: 'Corsia di uscita (decelerazione)', sec: 'Carreggiata', tool: 'ramp', kind: 'out', len: 60, wid: 3.75, ram: 8, cus: 18, rac: 20, color: '#9aa0a6' },
{ id: 'marciapiede',nome: 'Marciapiede',       sec: 'Bordi e marciapiedi', tool: 'band', sub: 'sidewalk', wid: 1.5, color: '#cfcabb' },
{ id: 'banchina',   nome: 'Banchina',          sec: 'Bordi e marciapiedi', tool: 'band', sub: 'shoulder', wid: 1.0, color: '#b8a98a' },
{ id: 'spartitraffico',nome:'Spartitraffico',  sec: 'Bordi e marciapiedi', tool: 'band', sub: 'median',   wid: 1.5, color: '#7fae6a' },
{ id: 'isola',      nome: 'Isola ovale',       sec: 'Bordi e marciapiedi', tool: 'island', shape: 'ovale',     color: '#7fae6a' },
{ id: 'isolatri',   nome: 'Isola triangolare', sec: 'Bordi e marciapiedi', tool: 'island', shape: 'triangolo', color: '#7fae6a' },
{ id: 'isolagoc',   nome: 'Isola a goccia',    sec: 'Bordi e marciapiedi', tool: 'island', shape: 'goccia',    color: '#7fae6a' },
{ id: 'parcheggio', nome: 'Stalli sosta',      sec: 'Bordi e marciapiedi', tool: 'parking',   color: '#9aa0a6' },
{ id: 'parchspina', nome: 'Stalli a spina (45°)', sec: 'Bordi e marciapiedi', tool: 'parking', angolo: 45, color: '#9aa0a6' },
{ id: 'parchlinea', nome: 'Stalli in linea',   sec: 'Bordi e marciapiedi', tool: 'parking', angolo: 0, color: '#9aa0a6' },
{ id: 'ciclabile',  nome: 'Pista ciclabile',   sec: 'Bordi e marciapiedi', tool: 'band', sub: 'ciclabile',wid: 1.5, color: '#b5563a' },
{ id: 'barriera',   nome: 'Guard-rail',        sec: 'Barriere e confini', tool: 'band', sub: 'guardrail',wid: 0.4, color: '#555' },
{ id: 'newjersey',  nome: 'New jersey',        sec: 'Barriere e confini', tool: 'band', sub: 'newjersey',wid: 0.6, color: '#dcdcdc' },
{ id: 'antirumore', nome: 'Barriera antirumore', sec: 'Barriere e confini', tool: 'band', sub: 'antirumore', wid: 0.3, color: '#4f7382' },
{ id: 'attenuatore',nome: "Attenuatore d'urto", sec: 'Barriere e confini', tool: 'band', sub: 'attenuatore', wid: 0.9, color: '#f2c200' },
{ id: 'muro',       nome: 'Muro',              sec: 'Barriere e confini', tool: 'band', sub: 'muro',     wid: 0.3, color: '#b9b3a8' },
{ id: 'siepe',      nome: 'Siepe',             sec: 'Barriere e confini', tool: 'band', sub: 'siepe',    wid: 0.8, color: '#3f8f4f' },
{ id: 'recinzione', nome: 'Recinzione',        sec: 'Barriere e confini', tool: 'band', sub: 'recinzione',wid: 0.2, color: '#777777' },
{ id: 'binari',     nome: 'Binari tram/treno', sec: 'Ferrovia · acqua · dossi', tool: 'band', sub: 'rails',    wid: 1.5, color: '#888' },
{ id: 'canale',     nome: 'Canale / fiume',    sec: 'Ferrovia · acqua · dossi', tool: 'band', sub: 'canale',   wid: 3.0, color: '#8fc7e8' },
{ id: 'fosso',      nome: 'Fosso / scarpata',  sec: 'Ferrovia · acqua · dossi', tool: 'band', sub: 'ditch',    wid: 1.5, color: '#b09a6a' },
{ id: 'dosso',      nome: 'Dosso rallentatore',  sec: 'Ferrovia · acqua · dossi', tool: 'band', sub: 'dosso',    wid: 0.9, color: '#b9b9b9' },
{ id: 'piazzale',   nome: 'Piazzale (asfalto)', sec: 'Superfici e aree', tool: 'area', sub: 'piazzale', color: '#9aa0a6' },
{ id: 'areaverde',  nome: 'Area verde',         sec: 'Superfici e aree', tool: 'area', sub: 'verde',    color: '#7fae6a' },
{ id: 'ghiaia',     nome: 'Ghiaia / sterrato',  sec: 'Superfici e aree', tool: 'area', sub: 'ghiaia',   color: '#d8cba6' },
{ id: 'zebrata',    nome: 'Area zebrata',       sec: 'Superfici e aree', tool: 'area', sub: 'zebra',    color: '#9aa0a6' },
{ id: 'zebracurva', nome: 'Zebrata curva',      sec: 'Superfici e aree', tool: 'zebrapath', wid: 3,     color: '#9aa0a6' },
{ id: 'cortile',    nome: 'Cortile / spiazzo',  sec: 'Superfici e aree', tool: 'area', sub: 'piazzale', color: '#b8bcc0' },
{ id: 'edificio',   nome: 'Edificio / muro',   sec: 'Edifici', tool: 'building',  color: '#cfc3a8' }
];
const SEZ_C = sez(1, 1, 3.25, 0, 0.25).sez;
const R_ = len => ({ t: 'r', len }), C_ = (R, ang, verso) => ({ t: 'c', R, ang, verso: verso || 'dx' });
const curva = (id, nome, tratti, extra) => Object.assign({ id, nome, tool: 'curve', wid: 7, color: '#9aa0a6', sez: SEZ_C, tratti }, extra || {});
const CURVE = [
curva('cur_mis', 'Curva a raggio misurato', [R_(10), C_(30, 60), R_(10)]),
curva('cur_dolce', 'Curva dolce', [R_(8), C_(30, 50), R_(8)]),
curva('cur_45', 'Curva a 45°', [R_(10), C_(20, 45), R_(10)]),
curva('cur_90', 'Curva a 90°', [R_(15), C_(13, 90), R_(10)]),
curva('cur_135', 'Curva a 135°', [R_(10), C_(10, 135), R_(10)]),
curva('cur_gomito', 'Curva a gomito', [R_(10), C_(6, 90), R_(10)]),
curva('cur_tornante', 'Tornante (180°)', [R_(12), C_(9, 180), R_(12)], { sez: sez(1, 1, 2.75, 0, 0.25).sez }),
curva('cur_esse', 'Curva a S', [R_(6), C_(12, 70), C_(12, 70, 'sx'), R_(6)]),
curva('cur_doppia', 'Doppia curva con rettifilo', [R_(6), C_(15, 60), R_(15), C_(15, 60, 'sx'), R_(6)]),
curva('cur_chicane', 'Chicane', [R_(8), C_(14, 22), C_(14, 22, 'sx'), R_(8)]),
curva('cur_raccordo', 'Curva di raccordo', [R_(12), C_(8, 90, 'sx'), R_(12)]),
curva('cur_ext', 'Curva extraurbana con guard-rail', [R_(10), C_(60, 60), R_(10)], { sez: sez(1, 1, 3.75, 0, 1.25).sez, guard: 'est', line: 'cont' }),
curva('cur_urb', 'Curva urbana con marciapiedi', [R_(8), C_(15, 90), R_(8)], { sez: sez(1, 1, 3.0, 0, 0.25, 1.5).sez }),
curva('cur_4', 'Curva a 4 corsie con spartitraffico', [R_(10), C_(80, 45), R_(10)], { sez: sez(2, 2, 3.5, 2.0, 0.5).sez }),
curva('cur_auto', 'Curva autostradale (2 corsie + emergenza)', [R_(15), C_(250, 20), R_(15)], { sez: sez(2, 0, 3.75, 0, 0.7, 0, false, AUTO).sez, guard: 'both' })
];
const ASF = '#9aa0a6', VERDE = '#7fae6a';
const IC = {
x4: `<rect x="2" y="11" width="42" height="12" fill="${ASF}"/><rect x="17" y="2" width="12" height="30" fill="${ASF}"/><rect x="2" y="16" width="15" height="2" fill="${VERDE}"/><rect x="29" y="16" width="15" height="2" fill="${VERDE}"/>`,
tc: `<rect x="2" y="7" width="42" height="7" fill="${ASF}"/><rect x="20" y="10" width="7" height="22" fill="${ASF}"/><path d="M27 14 Q27 24 36 24 L36 14Z M20 14 Q20 24 11 24 L11 14Z" fill="${ASF}"/><path d="M28.5 15.5 L28.5 21 L33.5 15.5Z M18.5 15.5 L18.5 21 L13.5 15.5Z" fill="${VERDE}"/>`,
xc: `<rect x="2" y="13" width="42" height="7" fill="${ASF}"/><rect x="20" y="2" width="7" height="30" fill="${ASF}"/><path d="M27 20 Q27 27 34 27 L34 20Z M20 20 Q20 27 13 27 L13 20Z M27 13 Q27 6 34 6 L34 13Z M20 13 Q20 6 13 6 L13 13Z" fill="${ASF}"/><path d="M28.3 21.3 L28.3 24.5 L31.5 21.3Z M18.7 21.3 L18.7 24.5 L15.5 21.3Z M28.3 11.7 L28.3 8.5 L31.5 11.7Z M18.7 11.7 L18.7 8.5 L15.5 11.7Z" fill="${VERDE}"/>`,
pc: `<rect x="2" y="2" width="42" height="9" fill="#e4dccb"/><rect x="2" y="11" width="42" height="4" fill="#d8d2c4"/><rect x="2" y="15" width="42" height="11" fill="${ASF}"/><rect x="2" y="26" width="42" height="4" fill="#d8d2c4"/><rect x="17" y="4" width="12" height="11" fill="#b8bcc0"/><line x1="16" y1="4.5" x2="30" y2="4.5" stroke="#555" stroke-width="1" stroke-dasharray="1.5 1"/>`,
pl: `<rect x="17" y="2" width="12" height="30" fill="${ASF}"/><rect x="2" y="13" width="42" height="8" fill="#cfc9bb"/><line x1="2" y1="14.5" x2="44" y2="14.5" stroke="#555" stroke-width="1"/><line x1="2" y1="19.5" x2="44" y2="19.5" stroke="#555" stroke-width="1"/><rect x="16" y="8" width="7" height="2" fill="#c00"/><rect x="23" y="24" width="7" height="2" fill="#c00"/>`,
sem: `<rect x="2" y="13" width="42" height="8" fill="${ASF}"/><rect x="19" y="2" width="8" height="30" fill="${ASF}"/><circle cx="15" cy="9" r="2.6" fill="#27ae60"/><circle cx="31" cy="25" r="2.6" fill="#27ae60"/><circle cx="31" cy="9" r="2.6" fill="#e74c3c"/><circle cx="15" cy="25" r="2.6" fill="#e74c3c"/>`,
stop: `<rect x="2" y="13" width="42" height="8" fill="${ASF}"/><rect x="19" y="2" width="8" height="30" fill="${ASF}"/><line x1="19" y1="11" x2="23" y2="11" stroke="#fff" stroke-width="1.4"/><line x1="23" y1="23" x2="27" y2="23" stroke="#fff" stroke-width="1.4"/><path d="M12 5 l2 -2 h3 l2 2 v3 l-2 2 h-3 l-2 -2z" fill="#c00"/>`,
tstop: `<rect x="2" y="9" width="42" height="8" fill="${ASF}"/><rect x="19" y="15" width="8" height="17" fill="${ASF}"/><line x1="23" y1="19" x2="27" y2="19" stroke="#fff" stroke-width="1.4"/><path d="M30 22 l2 -2 h3 l2 2 v3 l-2 2 h-3 l-2 -2z" fill="#c00"/>`,
rot3: `<rect x="2" y="14" width="42" height="6" fill="${ASF}"/><rect x="20" y="17" width="6" height="15" fill="${ASF}"/><circle cx="23" cy="17" r="10" fill="${ASF}"/><circle cx="23" cy="17" r="4.5" fill="${VERDE}"/>`,
rot5: `<g fill="${ASF}"><rect x="20" y="1" width="6" height="16"/><rect x="20" y="1" width="6" height="16" transform="rotate(72 23 17)"/><rect x="20" y="1" width="6" height="16" transform="rotate(144 23 17)"/><rect x="20" y="1" width="6" height="16" transform="rotate(216 23 17)"/><rect x="20" y="1" width="6" height="16" transform="rotate(288 23 17)"/></g><circle cx="23" cy="17" r="10" fill="${ASF}"/><circle cx="23" cy="17" r="4.5" fill="${VERDE}"/>`,
rot2: `<rect x="2" y="14" width="42" height="6" fill="${ASF}"/><rect x="20" y="1" width="6" height="32" fill="${ASF}"/><circle cx="23" cy="17" r="13" fill="${ASF}"/><circle cx="23" cy="17" r="9.5" fill="none" stroke="#fff" stroke-width="0.8" stroke-dasharray="2 1.5"/><circle cx="23" cy="17" r="6" fill="${VERDE}"/>`,
mini: `<rect x="2" y="14" width="42" height="6" fill="${ASF}"/><rect x="20" y="1" width="6" height="32" fill="${ASF}"/><circle cx="23" cy="17" r="8" fill="${ASF}"/><circle cx="23" cy="17" r="3.5" fill="#cfc8b6" stroke="#fff" stroke-width="0.6"/>`
};
const SEZ_URB = sez(1, 1, 3.0, 0, 0.25, 1.5);
const INCROCI = [
{ id: 'inc_x',   nome: 'Incrocio a croce', tool: 'junction', kind: 'x',   wid: 7 },
Object.assign({ id: 'inc_xu', nome: 'Incrocio urbano (marciapiedi)', tool: 'junction', kind: 'x', raggio: 6 }, SEZ_URB),
Object.assign({ id: 'inc_tu', nome: 'Incrocio a T urbano', tool: 'junction', kind: 't', raggio: 6 }, SEZ_URB),
{ id: 'inc_t',   nome: 'Incrocio a T',     tool: 'junction', kind: 't',   wid: 7 },
{ id: 'inc_y',   nome: 'Incrocio a Y',     tool: 'junction', kind: 'y',   wid: 7 },
{ id: 'inc_sf',  nome: 'Incrocio sfalsato',tool: 'junction', kind: 'sf',  wid: 7 },
{ id: 'inc_x45', nome: 'Incrocio obliquo', tool: 'junction', kind: 'x45', wid: 7 },
{ id: 'inc_5',   nome: 'Incrocio a 5 vie', tool: 'junction', kind: 'penta',wid: 7 },
{ id: 'inc_6',   nome: 'Incrocio a 6 vie', tool: 'junction', kind: 'esa', wid: 7 },
{ id: 'inc_tob', nome: 'T obliqua',        tool: 'junction', kind: 'tob', wid: 7 },
{ id: 'inc_imm', nome: 'Immissione',tool:'junction', kind: 'imm', wid: 7 },
Object.assign({ id: 'inc_x4', nome: 'Incrocio su strada a 4 corsie', tool: 'junction', kind: 'x', raggio: 8, icona: IC.x4,
sezS: sez(1, 1, 3.25, 0, 0.25).sez }, sez(2, 2, 3.5, 3.0, 0.5)),
Object.assign({ id: 'inc_l', nome: 'Incrocio ad angolo (L)', tool: 'junction', kind: 'l', raggio: 6 }, SEZ_URB),
Object.assign({ id: 'inc_sem', nome: 'Incrocio semaforico', tool: 'junction', kind: 'x', raggio: 6, icona: IC.sem,
regola: { tipo: 'semaforo', strisce: true } }, SEZ_URB),
{ id: 'inc_stop', nome: 'Incrocio con STOP', tool: 'junction', kind: 'x', wid: 7, icona: IC.stop, regola: { tipo: 'stop', su: 'secondaria' } },
{ id: 'inc_tstop', nome: 'Incrocio a T con STOP', tool: 'junction', kind: 't', wid: 7, icona: IC.tstop, regola: { tipo: 'stop', su: 'secondaria' } },
{ id: 'inc_tc', nome: 'T con svolte canalizzate', tool: 'junction', kind: 't', wid: 7, raggio: 5, canal: [1, 2], icona: IC.tc,
regola: { tipo: 'precedenza', su: 'secondaria' } },
{ id: 'inc_xc', nome: 'Incrocio canalizzato', tool: 'junction', kind: 'x', wid: 7, raggio: 5, canal: [0, 1, 2, 3], icona: IC.xc },
Object.assign({ id: 'inc_pc', nome: 'Passo carrabile', tool: 'junction', kind: 'pc', raggio: 1, lenS: 10, icona: IC.pc,
sezS: { cA: 1, cB: 0, corsia: 3.5, spart: 0, banch: 0, marc: 0 } }, SEZ_URB),
Object.assign({ id: 'inc_pl', nome: 'Passaggio a livello', tool: 'junction', kind: 'pl', icona: IC.pl, barriere: 'abbassate', binari: 1 }, sez(1, 1, 3.25, 0, 0.5)),
{ id: 'inc_rot', nome: 'Rotatoria',        tool: 'roundabout', size: 20, ring: 6, color: '#9aa0a6' },
{ id: 'inc_rot3', nome: 'Rotatoria a 3 bracci', tool: 'roundabout', size: 26, ring: 7, color: '#9aa0a6', bracciAng: [0, 90, 180], icona: IC.rot3 },
{ id: 'inc_rot5', nome: 'Rotatoria a 5 bracci', tool: 'roundabout', size: 32, ring: 7, color: '#9aa0a6', bracciAng: [270, 342, 54, 126, 198], icona: IC.rot5 },
{ id: 'inc_rot2', nome: 'Rotatoria a doppia corsia', tool: 'roundabout', size: 44, ring: 9.5, corsie: 2, brWid: 8, lenB: 22, color: '#9aa0a6', icona: IC.rot2 },
{ id: 'inc_mini', nome: 'Mini-rotatoria', tool: 'roundabout', size: 18, ring: 6, mini: true, color: '#9aa0a6', icona: IC.mini }
];
const SEGNALETICA = [
{ id: 'attraversam',nome: 'Attraversamento pedonale', sec: 'Orizzontale', tool: 'crosswalk', sub:'ped',  color: '#ffffff' },
{ id: 'attrbike',   nome: 'Attraversamento ciclabile', sec: 'Orizzontale', tool: 'crosswalk', sub:'bike', color: '#ffffff' },
{ id: 'arresto',    nome: 'Linea di arresto',  sec: 'Orizzontale', tool: 'stopline',  color: '#ffffff' },
{ id: 'mezzcont',   nome: 'Mezzeria continua', sec: 'Orizzontale', tool: 'mark', style:'cont',   color: '#ffffff' },
{ id: 'mezzdisc',   nome: 'Mezzeria tratteggiata', sec: 'Orizzontale', tool: 'mark', style:'disc',   color: '#ffffff' },
{ id: 'doppia',     nome: 'Doppia continua',   sec: 'Orizzontale', tool: 'mark', style:'double', color: '#ffffff' },
{ id: 'margine',    nome: 'Linea di margine',  sec: 'Orizzontale', tool: 'mark', style:'edge',   color: '#ffffff' },
{ id: 'precterra',  nome: 'Dare precedenza (a terra)', sec: 'Orizzontale',tool:'mark', style:'give',  color: '#ffffff' },
{ id: 'freccterra', nome: 'Freccia a terra',      sec: 'Orizzontale', tool: 'symbol', sym:'freccia_terra', size: 2.0, color: '#ffffff', dir: 'dritto' },
{ id: 'semaforo',   nome: 'Semaforo',          sec: 'Verticale', tool: 'symbol', sym:'semaforo',  size: 0.7, color: '#222' },
{ id: 'segstop',    nome: 'Segnale STOP',      sec: 'Verticale', tool: 'symbol', sym:'stop',      size: 0.9, color: '#c00' },
{ id: 'segprec',    nome: 'Dare precedenza',   sec: 'Verticale', tool: 'symbol', sym:'precedenza',size: 0.9, color: '#c00' },
{ id: 'segdiv',     nome: 'Senso vietato',     sec: 'Verticale', tool: 'symbol', sym:'divieto',   size: 0.9, color: '#c00' },
{ id: 'seglim',     nome: 'Limite di velocità', sec: 'Verticale', tool: 'symbol', sym:'limite',    size: 0.9, color: '#c00', text:'50' },
{ id: 'seglim130',  nome: 'Limite 130 km/h',   sec: 'Autostrada', tool: 'symbol', sym:'limite',  size: 0.9, color: '#c00', text:'130' },
{ id: 'seglim110',  nome: 'Limite 110 km/h',   sec: 'Autostrada', tool: 'symbol', sym:'limite',  size: 0.9, color: '#c00', text:'110' },
{ id: 'seglim90',   nome: 'Limite 90 km/h',    sec: 'Autostrada', tool: 'symbol', sym:'limite',  size: 0.9, color: '#c00', text:'90' },
{ id: 'zona30',     nome: 'Zona 30',           sec: 'Verticale', tool: 'symbol', sym:'zona30',    size: 1.0, color: '#c00', text:'30' },
{ id: 'passliv',    nome: 'Passaggio a livello',sec: 'Verticale',tool: 'symbol', sym:'passlivello',size: 1.0, color: '#c00' },
{ id: 'seglavori',  nome: 'Lavori in corso',   sec: 'Verticale', tool: 'symbol', sym:'lavori',    size: 0.9, color: '#c00' },
{ id: 'disabile',   nome: 'Stallo disabili',   sec: 'Verticale', tool: 'symbol', sym:'disabile',  size: 0.9, color: '#1466b8' },
{ id: 'dirprec',    nome: 'Diritto di precedenza', sec: 'Verticale', tool: 'symbol', sym:'dirprec', size: 0.9, color: '#f6c400' },
{ id: 'sorpasso',   nome: 'Divieto di sorpasso', sec: 'Verticale', tool: 'symbol', sym:'sorpasso',  size: 0.9, color: '#c00' },
{ id: 'obbligo',    nome: 'Direzione obbligatoria', sec: 'Verticale', tool: 'symbol', sym:'obbligo', size: 0.9, color: '#1d5fbf', dir: 'dritto' },
{ id: 'rotatseg',   nome: 'Segnale di rotatoria', sec: 'Verticale', tool: 'symbol', sym:'rotatoria_seg', size: 0.9, color: '#1d5fbf' },
{ id: 'attravseg',  nome: 'Segnale di attraversamento pedonale', sec: 'Verticale', tool: 'symbol', sym:'attrav_seg', size: 0.9, color: '#1d5fbf' }
].concat([
['p:pericolo', 'Altri pericoli'], ['p:curva_dx', 'Curva a destra'], ['p:curva_sx', 'Curva a sinistra'],
['p:doppia_curva', 'Doppia curva'], ['p:incrocio', 'Incrocio (precedenza a destra)'], ['p:incrocio_prec', 'Intersezione con diritto di precedenza'],
['p:strettoia', 'Strettoia'], ['p:dosso', 'Dosso'], ['p:sdrucciolevole', 'Strada sdrucciolevole'],
['p:pedoni', 'Attraversamento pedonale (pericolo)'], ['p:bambini', 'Bambini'], ['p:ciclisti', 'Attraversamento ciclabile (pericolo)'],
['p:animali', 'Animali domestici vaganti'], ['p:selvatici', 'Animali selvatici vaganti'], ['p:semaforo', 'Semaforo'],
['p:doppio_senso', 'Doppio senso di circolazione'], ['p:pl_barriere', 'Passaggio a livello con barriere'], ['p:banchina', 'Banchina pericolosa'],
['p:vento', 'Forte vento laterale'], ['p:massi', 'Caduta massi'],
['p:strettoia_dx', 'Strettoia asimmetrica a destra'], ['p:strettoia_sx', 'Strettoia asimmetrica a sinistra']
].map(([cod, nome]) => ({ id: 'c_' + cod.replace(':', '_'), nome, sec: 'Pericolo', tool: 'symbol', sym: 'cartello', cod, size: 0.9, color: '#c8102e' })),
[
['d:transito', 'Divieto di transito'], ['d:sosta', 'Divieto di sosta'], ['d:fermata', 'Divieto di fermata'],
['d:svolta_dx', 'Divieto di svolta a destra'], ['d:svolta_sx', 'Divieto di svolta a sinistra'], ['d:inversione', 'Divieto di inversione a U'],
['d:autocarri', 'Transito vietato agli autocarri'], ['d:pedoni', 'Transito vietato ai pedoni'], ['d:biciclette', 'Transito vietato alle biciclette'],
['d:veicoli', 'Transito vietato ai veicoli a motore'], ['d:sorpasso_pesanti', 'Divieto di sorpasso per mezzi pesanti (oltre 3,5 t)']
].map(([cod, nome]) => ({ id: 'c_' + cod.replace(':', '_'), nome, sec: 'Divieto', tool: 'symbol', sym: 'cartello', cod, size: 0.9, color: '#c8102e' })),
[
['o:passaggio_dx', 'Passaggio obbligatorio a destra'], ['o:passaggio_sx', 'Passaggio obbligatorio a sinistra'],
['o:diritto_dx', 'Direzioni consentite dritto e destra'], ['o:ciclabile', 'Pista ciclabile'], ['o:fine_ciclabile', 'Fine pista ciclabile'],
['o:pedonale', 'Percorso pedonale'], ['o:ciclopedonale', 'Percorso ciclopedonale']
].map(([cod, nome]) => ({ id: 'c_' + cod.replace(':', '_'), nome, sec: 'Obbligo', tool: 'symbol', sym: 'cartello', cod, size: 0.9, color: '#1d5fbf' })),
[
['i:senso_unico', 'Senso unico parallelo', 1.2], ['i:senso_unico_f', 'Senso unico frontale'], ['i:parcheggio', 'Parcheggio'],
['i:senza_uscita', 'Strada senza uscita'], ['i:ospedale', 'Ospedale'], ['i:centro', 'Inizio centro abitato', 1.4],
['i:fine_centro', 'Fine centro abitato', 1.4], ['i:fine_dirprec', 'Fine diritto di precedenza']
].map(([cod, nome, size]) => ({ id: 'c_' + cod.replace(':', '_'), nome, sec: 'Indicazione', tool: 'symbol', sym: 'cartello', cod, size: size || 0.9, color: '#1d5fbf' })),
[
['a:inizio_autostrada', 'Inizio autostrada', 1.2], ['a:fine_autostrada', 'Fine autostrada', 1.2],
['a:uscita', 'Preavviso di uscita', 1.6], ['a:distanza', 'Pannello di distanza', 1.0],
['a:galleria', 'Galleria', 1.0], ['a:piazzola', 'Piazzola di sosta', 1.0], ['a:piazzola_sos', 'Piazzola con SOS', 1.0],
['a:sos', 'Colonnina SOS', 0.9], ['a:telefono', 'Telefono', 0.9],
['a:ghiaccio', 'Pannello integrativo: per ghiaccio', 1.0], ['a:pioggia', 'Pannello integrativo: per pioggia', 1.0]
].map(([cod, nome, size]) => ({ id: 'c_' + cod.replace(':', '_'), nome, sec: 'Autostrada', tool: 'symbol', sym: 'cartello', cod, size, color: '#1f7a3a' })),
[
['a:corsia_chiusa_dx', 'Corsia di destra chiusa'], ['a:corsia_chiusa_sx', 'Corsia di sinistra chiusa'],
['a:corsie_disponibili', 'Corsie disponibili'], ['a:carreggiata_chiusa', 'Carreggiata chiusa (passaggio sull\'altra)'],
['a:rientro', 'Rientro in carreggiata'], ['a:variazione_corsie', 'Variazione corsie disponibili', 1.0],
['a:uscita_obbligatoria', 'Uscita obbligatoria'], ['a:coda', 'Coda']
].map(([cod, nome, size]) => ({ id: 'c_' + cod.replace(':', '_'), nome, sec: 'Cantiere', tool: 'symbol', sym: 'cartello', cod, size: size || 1.2, color: '#f6c400' })));
const TRACCE = [
{ id: 'schizzo',    nome: 'Schizzo a mano',    tool: 'freehand', color: '#3a3a3a', width: 0.12 },
{ id: 'frenata',    nome: 'Traccia di frenata', tool: 'skid',     color: '#202020', width: 0.18, dashed:false },
{ id: 'scarroc',    nome: 'Scarrocciamento',   tool: 'skid',     color: '#5a3a10', width: 0.14, dashed:true },
{ id: 'accel',      nome: 'Traccia di accelerazione', tool: 'skid',     color: '#404040', width: 0.12, dashed:true },
{ id: 'solco',      nome: 'Solco / abrasione', tool: 'skid',     color: '#5b5b5b', width: 0.22, stile: 'solco', nota: 'solco / abrasione' },
{ id: 'percorso',   nome: 'Percorso del veicolo', tool: 'path',     color: '#2f6fed', width: 0.10, dashed:true, arrow:true },
{ id: 'misura',     nome: 'Quota / misura',    tool: 'measure',  color: '#c0392b' },
{ id: 'angolo',     nome: 'Quota angolare',    tool: 'angle',    color: '#7a3a9a' },
{ id: 'freccia',    nome: 'Freccia di direzione', tool: 'arrow',    color: '#222' },
{ id: 'testo',      nome: 'Testo / nota',      tool: 'text',     color: '#111' }
];
const SIMBOLI = [
{ id: 'urto',       nome: "Punto d'urto",      tool: 'symbol', sym: 'impact',   size: 1.0, color: '#d11' },
{ id: 'investim',   nome: "Punto d'investimento", tool: 'symbol', sym: 'investimento', size: 1.0, color: '#d11' },
{ id: 'terriccio',  nome: 'Terriccio',         tool: 'symbol', sym: 'terriccio', size: 1.0, color: '#7a5a32' },
{ id: 'macchiac',   nome: 'Macchia nel cerchio', tool: 'symbol', sym: 'macchia_c', size: 1.2, color: '#9b1010' },
{ id: 'macchiar',   nome: 'Macchia nel rettangolo', tool: 'symbol', sym: 'macchia_r', size: 1.2, color: '#3a3a3a' },
{ id: 'quiete',     nome: 'Posizione di quiete', tool: 'symbol', sym: 'quiete',   size: 1.0, color: '#0a7' },
{ id: 'pedone',     nome: 'Pedone',            tool: 'symbol', sym: 'pedone',   size: 0.5, color: '#1b4f9c' },
{ id: 'cadavere',   nome: 'Cadavere',          tool: 'symbol', sym: 'cadavere', size: 1.7, color: '#222' },
{ id: 'pers_supina', nome: 'Persona supina',     tool: 'symbol', sym: 'persona', posa: 'supina',  size: 1.75, color: '#2f4f7f' },
{ id: 'pers_prona',  nome: 'Persona prona',      tool: 'symbol', sym: 'persona', posa: 'prona',   size: 1.75, color: '#2f4f7f' },
{ id: 'pers_fianco', nome: 'Persona sul fianco', tool: 'symbol', sym: 'persona', posa: 'fianco',  size: 1.6,  color: '#2f4f7f' },
{ id: 'pers_seduta', nome: 'Persona seduta a terra', tool: 'symbol', sym: 'persona', posa: 'seduta', size: 1.75, color: '#2f4f7f' },
{ id: 'pers_moto',   nome: 'Motociclista a terra', tool: 'symbol', sym: 'persona', posa: 'moto',  size: 1.75, color: '#262626' },
{ id: 'pers_bici',   nome: 'Ciclista a terra',   tool: 'symbol', sym: 'persona', posa: 'bici',    size: 1.75, color: '#1f7a4d' },
{ id: 'pers_bimbo',  nome: 'Bambino a terra',    tool: 'symbol', sym: 'persona', posa: 'bambino', size: 1.15, color: '#d35400' },
{ id: 'animale',    nome: 'Animale',           tool: 'symbol', sym: 'animale',  size: 1.0, color: '#6b4423' },
{ id: 'sangue',     nome: 'Macchia di sangue', tool: 'symbol', sym: 'blob',     size: 0.6, color: '#9b1010' },
{ id: 'olio',       nome: 'Olio / liquidi',    tool: 'symbol', sym: 'blob',     size: 0.6, color: '#3a3a3a' },
{ id: 'frammenti',  nome: 'Frammenti',         tool: 'symbol', sym: 'debris',   size: 0.8, color: '#7a5a20' },
{ id: 'vetri',      nome: 'Detriti di vetro',  tool: 'symbol', sym: 'debris',   size: 0.7, color: '#7aa6c2' },
{ id: 'partescocca',nome: 'Parte di veicolo',  tool: 'symbol', sym: 'object',   size: 0.8, color: '#666' },
{ id: 'liquidi',    nome: 'Liquido radiatore', tool: 'symbol', sym: 'blob',     size: 0.6, color: '#2f8f5f' },
{ id: 'detrito',    nome: 'Oggetto disperso',  tool: 'symbol', sym: 'object',   size: 0.5, color: '#555' },
{ id: 'buca',       nome: 'Buca / dissesto',   tool: 'symbol', sym: 'hole',     size: 0.6, color: '#333' },
{ id: 'biciterra',  nome: 'Bicicletta a terra',tool: 'symbol', sym: 'biciterra',size: 1.6, color: '#333' },
{ id: 'casco',      nome: 'Casco',             tool: 'symbol', sym: 'casco',    size: 0.45, color: '#c33' },
{ id: 'targa',      nome: 'Targa',             tool: 'symbol', sym: 'targa',    size: 0.5, color: '#222' }
];
const FISSI = [
{ id: 'caposaldo',  nome: 'Caposaldo',         tool: 'symbol', sym: 'caposaldo', size: 0.6, color: '#b00', letter:'A' },
{ id: 'palo',       nome: 'Palo / lampione',   tool: 'symbol', sym: 'palo',      size: 0.4, color: '#444' },
{ id: 'albero',     nome: 'Albero',            tool: 'symbol', sym: 'albero',    size: 1.2, color: '#2f7a2f' },
{ id: 'cono',       nome: 'Cono',              tool: 'symbol', sym: 'cono',      size: 0.4, color: '#e06010' },
{ id: 'delineatore',nome: 'Delineatore',       tool: 'symbol', sym: 'delineatore',size: 0.3, color: '#d33' },
{ id: 'idrante',    nome: 'Idrante',           tool: 'symbol', sym: 'idrante',   size: 0.4, color: '#c33' },
{ id: 'tombino',    nome: 'Tombino',           tool: 'symbol', sym: 'tombino',   size: 0.6, color: '#555' },
{ id: 'fermata',    nome: 'Fermata bus',       tool: 'symbol', sym: 'fermata',   size: 0.6, color: '#06c' },
{ id: 'distributore',nome: 'Distributore',     tool: 'symbol', sym: 'distributore',size: 1.2, color: '#e05a2b' },
{ id: 'chilometrica',nome: 'Progressiva chilometrica', tool:'symbol', sym: 'chilometrica',size: 1.6, color: '#1a6d2f', text: 'km 0+000' },
{ id: 'sos',        nome: 'Colonnina SOS',     tool: 'symbol', sym: 'sos',       size: 0.55, color: '#e08a00' },
{ id: 'triangolo',  nome: 'Triangolo di pericolo', tool: 'symbol', sym: 'triangolo', size: 0.7, color: '#d0141c' },
{ id: 'freccialum', nome: 'Freccia luminosa / carrello segnaletico', tool: 'symbol', sym: 'freccialum', size: 1.8, color: '#ffb000' },
{ id: 'pmv',        nome: 'Pannello a messaggio variabile', tool: 'symbol', sym: 'pmv', size: 2.4, color: '#ff9a1f', text: 'INCIDENTE' },
{ id: 'telecamera', nome: 'Telecamera / varco',tool: 'symbol', sym: 'telecamera',size: 0.55, color: '#333' },
{ id: 'paracarro',  nome: 'Paracarro / fittone',tool: 'symbol', sym: 'paracarro', size: 0.35, color: '#c33' },
{ id: 'dissuasore', nome: 'Dissuasore sosta',  tool: 'symbol', sym: 'dissuasore', size: 0.3,  color: '#333' },
{ id: 'panchina',   nome: 'Panchina',          tool: 'symbol', sym: 'panchina',   size: 0.6,  color: '#7a5a35' },
{ id: 'cestino',    nome: 'Cestino rifiuti',   tool: 'symbol', sym: 'cestino',    size: 0.4,  color: '#3a6b3a' },
{ id: 'fioriera',   nome: 'Fioriera',          tool: 'symbol', sym: 'fioriera',   size: 0.6,  color: '#8a6b45' }
];
const ANNOTA = [
{ id: 'legenda',    nome: 'Legenda',           tool: 'legend',      fs: 0.6 },
{ id: 'tabmisure',  nome: 'Tabella misure',    tool: 'measuretable',fs: 0.6 },
{ id: 'nord',       nome: 'Freccia Nord',      tool: 'north',       size: 3 },
{ id: 'scalagraf',  nome: 'Scala grafica',     tool: 'graphscale',  size: 10 }
];
const TUTTI = [].concat(VEICOLI, STRADE, CURVE, INCROCI, SEGNALETICA, TRACCE, SIMBOLI, FISSI, ANNOTA);
const VARIANTI = { blob: ['sangue', 'olio', 'liquidi'], debris: ['frammenti', 'vetri'] };
function scheda(gruppi) {
const out = [];
gruppi.forEach(([sec, voci]) => voci.forEach(v => {
const o = typeof v === 'string' ? { id: v } : v;
const d = TUTTI.find(x => x.id === o.id);
if (!d) return;
const voce = Object.assign({}, d, { sec });
if (o.etichetta) {
voce.etichetta = o.etichetta;
const varianti = d.sym === 'persona' ? SIMBOLI.filter(x => x.sym === 'persona') : (VARIANTI[d.sym] || []).map(id => TUTTI.find(x => x.id === id));
voce.cerca = varianti.filter(Boolean).map(x => x.nome).join(' ');
}
out.push(voce);
}));
return out;
}
const segn = sec => SEGNALETICA.filter(d => d.sec === sec).map(d => d.id);
const PALETTE = [
{ id: 'veicoli', nome: 'Veicoli', type: 'vehicle', items: scheda([
['Autovetture', ['utilitaria', 'autovettura', 'berlina', 'sw', 'suv', 'monovolume', 'coupe', 'cabrio', 'pickup', 'quadriciclo']],
['Servizio ed emergenza', ['taxi', 'ffoo', 'ambulanza', 'vvf', 'carroattrezzi']],
['Furgoni e camper', ['furgone', 'furgonegr', 'camper']],
['Mezzi pesanti', ['autocarro', 'autocarro3', 'cisterna', 'betoniera', 'motrice', 'rimorchio', 'autoartic', 'autotreno', 'operatrice']],
['Autobus e tram', ['autobus', 'autosnodato', 'tram']],
['Mezzi agricoli', ['trattore', 'rimagri', 'mietitrebbia']],
['Due ruote e mezzi leggeri', ['motociclo', 'scooter', 'ciclomotore', 'motocarro', 'quad', 'velocipede', 'cargobike', 'monopattino', 'carrozzina']]]) },
{ id: 'strade', nome: 'Strade', type: 'tool', items: scheda([
['Tratti di strada', ['strada', 'strada_urb', 'strada_ext', 'strada_su', 'strada_4', 'stradacurva']],
['Curve', ['cur_mis', 'cur_dolce', 'cur_45', 'cur_90', 'cur_135', 'cur_gomito', 'cur_tornante', 'cur_esse', 'cur_doppia', 'cur_chicane', 'cur_raccordo']],
['Autostrada', ['auto_2', 'auto_3', 'auto_22', 'auto_33', 'cur_auto', 'piazzola']],
['Curve con sezione completa', ['cur_ext', 'cur_urb', 'cur_4']],
['Corsie di immissione e uscita', ['corsiaimm', 'corsiausc']],
['Bordi, marciapiedi e isole', ['marciapiede', 'banchina', 'spartitraffico', 'ciclabile', 'isola', 'isolatri', 'isolagoc']],
['Sosta', ['parcheggio', 'parchspina', 'parchlinea']],
['Barriere stradali', ['barriera', 'newjersey', 'antirumore', 'attenuatore']],
['Zebrate e dossi', ['zebrata', 'zebracurva', 'dosso']]]) },
{ id: 'incroci', nome: 'Incroci', type: 'tool', items: scheda([
['A croce', ['inc_x', 'inc_xu', 'inc_x45', 'inc_sf', 'inc_x4']],
['A forma di T, di Y o di L', ['inc_t', 'inc_tu', 'inc_tob', 'inc_y', 'inc_imm', 'inc_l']],
['Già regolati', ['inc_sem', 'inc_stop', 'inc_tstop']],
['Svolte a destra con isola', ['inc_tc', 'inc_xc']],
['Accessi e ferrovia', ['inc_pc', 'inc_pl']],
['Più vie', ['inc_5', 'inc_6']],
['Rotatorie', ['inc_rot', 'inc_rot3', 'inc_rot5', 'inc_rot2', 'inc_mini']]]) },
{ id: 'segnal', nome: 'Segnaletica', type: 'tool', items: scheda([
['Cartelli più usati', ['semaforo', 'segstop', 'segprec', 'dirprec', 'seglim', 'segdiv', 'sorpasso', 'obbligo', 'attravseg', 'rotatseg', 'zona30', 'passliv', 'seglavori', 'disabile']],
['A terra', ['attraversam', 'attrbike', 'arresto', 'precterra', 'mezzcont', 'mezzdisc', 'doppia', 'margine', 'freccterra']],
['Autostrada', segn('Autostrada')], ['Cantieri e corsie', segn('Cantiere')],
['Pericolo', segn('Pericolo')], ['Divieto', segn('Divieto')], ['Obbligo', segn('Obbligo')], ['Indicazione', segn('Indicazione')]]) },
{ id: 'simboli', nome: 'Sinistro', type: 'tool', items: scheda([
['Punti del sinistro', ['urto', 'investim', 'quiete']],
['Tracce e movimento', ['frenata', 'scarroc', 'accel', 'solco', 'percorso', 'freccia']],
['Persone e animali', ['pedone', { id: 'pers_supina', etichetta: 'Persona a terra' }, 'cadavere', 'animale']],
['Macchie e liquidi', [{ id: 'sangue', etichetta: 'Macchia' }, 'macchiac', 'macchiar']],
['Detriti e oggetti a terra', [{ id: 'frammenti', etichetta: 'Detriti' }, 'partescocca', 'detrito', 'casco', 'targa', 'biciterra']],
['Fondo stradale', ['terriccio', 'buca']]]) },
{ id: 'ambiente', nome: 'Ambiente', type: 'tool', items: scheda([
['Edifici e recinzioni', ['edificio', 'muro', 'recinzione', 'siepe']],
['Verde', ['areaverde', 'albero', 'fioriera']],
['Piazzali e spiazzi', ['piazzale', 'cortile', 'ghiaia']],
['Acqua e ferrovia', ['canale', 'fosso', 'binari']]]) },
{ id: 'fissi', nome: 'Arredo', type: 'tool', items: scheda([
['Pali e impianti', ['palo', 'telecamera', 'sos', 'chilometrica', 'delineatore']],
['Segnalazione del sinistro e cantieri', ['triangolo', 'cono', 'freccialum', 'pmv']],
['Ostacoli e dissuasori', ['paracarro', 'dissuasore']],
['Servizi', ['fermata', 'distributore', 'idrante', 'tombino', 'panchina', 'cestino']]]) },
{ id: 'annota', nome: 'Misure e note', type: 'tool', items: scheda([
['Rilievo', ['caposaldo', 'misura', 'angolo']],
['Schizzo e testo', ['schizzo', 'testo']],
['Elementi della tavola', ['legenda', 'tabmisure', 'nord', 'scalagraf']]]) }
];
RS.catalog = { VEICOLI, STRADE, CURVE, INCROCI, SEGNALETICA, TRACCE, SIMBOLI, FISSI, ANNOTA, PALETTE, VARIANTI };
RS.catalog.veicoloById = function (id) { return VEICOLI.find(v => v.id === id); };
RS.catalog.byId = function (id) { return TUTTI.find(x => x.id === id); };
})(window.RS = window.RS || {});

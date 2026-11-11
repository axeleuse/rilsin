(function (RS) {
'use strict';
const SVGNS = 'http://www.w3.org/2000/svg';
const P = {
squadra: '<path d="M4 20V4l16 16z"/><path d="M8 16v-4l4 4z"/>',
righello: '<path d="M3 17L17 3l4 4L7 21z"/><path d="M7.5 12.5l2 2M10.5 9.5l2 2M13.5 6.5l2 2"/>',
lucchetto: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
aperto: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.6-1.8"/>',
foto: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
stampa: '<path d="M7 9V4h10v5"/><rect x="4" y="9" width="16" height="8" rx="1.5"/><path d="M8 17h8v4H8z"/>',
cestino: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>',
globo: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3.2 3 3.2 15 0 18M12 3c-3.2 3-3.2 15 0 18"/>',
disco: '<path d="M5 4h11l3 3v13H5z"/><path d="M8 4v5h7V4M8 20v-6h8v6"/>',
documento: '<path d="M14 3v5h5"/><path d="M6 3h8l5 5v13H6z"/><path d="M9 12h7M9 15h7M9 18h4"/>',
appunti: '<rect x="5" y="4" width="14" height="17" rx="1.5"/><path d="M9 2.5h6v3H9z"/><path d="M8.5 10h7M8.5 14h7M8.5 18h4"/>',
immagine: '<rect x="3" y="5" width="18" height="14" rx="1.5"/><circle cx="9" cy="10" r="1.6"/><path d="M3 17l5-4 4 3 3-2 6 4"/>',
mappa: '<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/>',
piu: '<path d="M12 5v14M5 12h14"/>',
forbici: '<circle cx="6" cy="7" r="2.5"/><circle cx="6" cy="17" r="2.5"/><path d="M8.2 8.4L20 18M8.2 15.6L20 6"/>',
bug: '<rect x="7" y="7" width="10" height="13" rx="5"/><path d="M12 9v11M9 4l1.5 3M15 4l-1.5 3M4 11h3M17 11h3M4 16h3M17 16h3"/>',
libri: '<path d="M4 4h4v16H4zM10 4h4v16h-4z"/><path d="M16 5.2l3.4-.9 3 15.4-3.4.9z"/>',
satellite: '<path d="M10 10l4 4"/><path d="M3.5 7.5l4-4 3.5 3.5-4 4zM13 17l4-4 3.5 3.5-4 4z"/><circle cx="12" cy="12" r="1.8"/><path d="M15 3.5a5.5 5.5 0 0 1 5.5 5.5"/>',
riavvolgi: '<path d="M11 6l-7 6 7 6zM20 6l-7 6 7 6z"/>',
cartella: '<path d="M3 6h6l2 2h10v11H3z"/>',
persona: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4.5 4-7 8-7s7 2.5 8 7"/>',
persone: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.8 3.3-6 6.5-6s5.7 2.2 6.5 6"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.3c2 .8 3.2 2.8 3.6 5.7"/>',
matita: '<path d="M4 20l1-5L16 4l4 4L9 19z"/><path d="M14 6l4 4"/>',
condividi: '<path d="M12 15V3M7 8l5-5 5 5"/><path d="M5 12v8h14v-8"/>',
libro: '<path d="M3 5c3-1 6-1 9 1 3-2 6-2 9-1v14c-3-1-6-1-9 1-3-2-6-2-9-1z"/><path d="M12 6v14"/>',
ricarica: '<path d="M20 12a8 8 0 0 1-14 5.3M4 12A8 8 0 0 1 18 6.7"/><path d="M18 3v4h-4M6 21v-4h4"/>',
tazza: '<path d="M4 9h12v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M16 11h1.5a2.5 2.5 0 0 1 0 5H16M8 3v3M12 3v3"/>',
occhio: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
aiuto: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7"/><circle cx="12" cy="17" r=".7" fill="currentColor"/>',
scudo: '<path d="M12 3l8 3v6c0 4.5-3.5 8-8 9-4.5-1-8-4.5-8-9V6z"/>',
aspetto: '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 0 0 18z" fill="currentColor"/>',
bersaglio: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><circle cx="12" cy="7.5" r=".7" fill="currentColor"/>',
segnaposto: '<path d="M12 21s7-6.5 7-12a7 7 0 0 0-14 0c0 5.5 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/>',
busta: '<rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="M3.5 6l8.5 7 8.5-7"/>',
lente: '<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5.5 5.5"/>',
magnete: '<path d="M6 4v7a6 6 0 0 0 12 0V4"/><path d="M6 4h4v6.5M18 4h-4v6.5"/>',
calcoli: '<rect x="5" y="3" width="14" height="18" rx="1.5"/><path d="M8 6.5h8v3H8z"/><path d="M8.5 13h.01M12 13h.01M15.5 13h.01M8.5 17h.01M12 17h.01M15.5 17h.01"/>',
orologio: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
muto: '<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M17 9.5l5 5M22 9.5l-5 5"/>',
voce: '<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>',
mano: '<path d="M10 11V5.5a1.5 1.5 0 0 1 3 0V11"/><path d="M13 11V4.5a1.5 1.5 0 0 1 3 0V11"/><path d="M16 11V6.5a1.5 1.5 0 0 1 3 0V13c0 4-2.5 7-6.5 7S7 17.5 7 14v-1.5l-2-2a1.5 1.5 0 0 1 2.1-2.1L10 11.5"/>',
testo: '<path d="M3 19L8 5l5 14M5 14h6"/><path d="M15 11.5a3 3 0 0 1 5.5 1.5V19M20.5 15.5c-3-.5-5.5.3-5.5 2 0 1.6 2.5 2 5.5.5"/>',
sole: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/>',
luna: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
livelli: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
ingranaggio: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="6.5"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
fumetto: '<path d="M4 5h16v11H9l-5 4z"/>',
bussola: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
pedone: '<circle cx="13" cy="4.5" r="1.8"/><path d="M11 21l2-6-2.5-2.5 1-5 3 2.5 3 1M10.5 8.5L7 11l-1 3M13 15l3 6"/>',
cuore: '<path d="M12 20s-8-5-8-10.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5C20 15 12 20 12 20z"/>',
divieto: '<circle cx="12" cy="12" r="9"/><path d="M7 12h10"/>',
novita: '<path d="M12 3l2 5.5 5.5 1.5-5.5 2-2 5.5-2-5.5-5.5-2 5.5-1.5z"/><path d="M19 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>',
chiave: '<path d="M15 4a5 5 0 0 0-4.6 7L4 17.4V20h2.6l6.4-6.4A5 5 0 0 0 20 9l-3 1-2-2 1-3z"/>',
cassetta: '<rect x="3" y="8" width="18" height="12" rx="1.5"/><path d="M9 8V5h6v3M3 13h18M10 13v2h4v-2"/>',
pacco: '<path d="M3 7.5L12 3l9 4.5v9L12 21l-9-4.5z"/><path d="M3 7.5l9 4.5 9-4.5M12 12v9"/>',
sirena: '<path d="M6 18v-5a6 6 0 0 1 12 0v5"/><path d="M4 18h16v3H4zM12 3v2M4.5 6l1.5 1.5M19.5 6L18 7.5"/>',
etichetta: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.3"/>',
schermo: '<path d="M3 5h18v11H3z"/><path d="M12 16v3M8 21h8"/>',
semaforo: '<rect x="8" y="2.5" width="8" height="19" rx="2"/><circle cx="12" cy="7" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="17" r="1.6"/>',
freccia: '<path d="M4 12h15M14 6l6 6-6 6"/>',
avviso: '<path d="M12 3.5L21.5 20h-19z"/><path d="M12 10v4.5"/><circle cx="12" cy="17.2" r=".7" fill="currentColor"/>',
spunta: '<circle cx="12" cy="12" r="9"/><path d="M7.5 12.5l3 3 6-6.5"/>',
chiaro: '<circle cx="12" cy="12" r="9"/>',
raddrizza: '<path d="M5 6l6-2v16l-6-2z" stroke-dasharray="2.2 1.8"/><path d="M14 4h7v16h-7z"/><path d="M9.5 12h6M13.5 10l2 2-2 2"/>',
laser: '<rect x="2.5" y="7.5" width="10" height="9" rx="1.6"/><circle cx="7.5" cy="12" r="1.6"/><path d="M12.5 12h9" stroke-dasharray="2 1.7"/><path d="M19.5 9.5l2 2.5-2 2.5"/>',
griglia: '<rect x="4" y="4" width="16" height="16" rx="1"/><path d="M4 10h16M4 15h16M10 4v16M15 4v16"/>',
foglio: '<rect x="5" y="3" width="14" height="18" rx="1" stroke-dasharray="3 2.2"/><path d="M8.5 9h7M8.5 12.5h7M8.5 16h4"/>',
righelli: '<path d="M3 3h18v4H7v14H3z"/><path d="M11 3v2M15 3v2M19 3v2M3 11h2M3 15h2M3 19h2"/>',
raccordo: '<path d="M4 20V13a9 9 0 0 1 9-9h7"/><path d="M8 20v-6a6 6 0 0 1 6-6h6" stroke-dasharray="2 2"/>'
};
const MAPPA = {
'📐': 'squadra', '📏': 'righello', '🔒': 'lucchetto', '🔐': 'lucchetto', '🔓': 'aperto', '📷': 'foto', '📸': 'foto',
'🖨': 'stampa', '🗑': 'cestino', '🌐': 'globo', '🌍': 'globo', '💾': 'disco', '📄': 'documento', '📝': 'documento',
'📑': 'documento', '📋': 'appunti', '🖼': 'immagine', '🗺': 'mappa', '➕': 'piu', '✂': 'forbici', '🐞': 'bug',
'📚': 'libri', '🛰': 'satellite', '⏪': 'riavvolgi', '📂': 'cartella', '📁': 'cartella', '👤': 'persona', '👥': 'persone',
'✍': 'matita', '✏': 'matita', '📤': 'condividi', '📖': 'libro', '🔄': 'ricarica', '🔁': 'ricarica', '♻': 'ricarica',
'☕': 'tazza', '👁': 'occhio', '❓': 'aiuto', '🛡': 'scudo', '🎨': 'aspetto', '🎯': 'bersaglio', 'ℹ': 'info',
'📍': 'segnaposto', '✉': 'busta', '🔍': 'lente', '🔎': 'lente', '🧲': 'magnete', '🧮': 'calcoli', '🕘': 'orologio',
'🕑': 'orologio', '🔇': 'muto', '🔊': 'voce', '✋': 'mano', '🔠': 'testo', '☀': 'sole', '🌙': 'luna', '🌑': 'luna',
'🗂': 'livelli', '⚙': 'ingranaggio', '💬': 'fumetto', '🧭': 'bussola', '🚶': 'pedone', '🤝': 'cuore', '⛔': 'divieto',
'✨': 'novita', '🔧': 'chiave', '🧰': 'cassetta', '📦': 'pacco', '🚨': 'sirena', '🏷': 'etichetta', '🖵': 'schermo',
'🚦': 'semaforo', '➡': 'freccia', '⚠': 'avviso', '✎': 'matita', '✔': 'spunta',
'⬜': 'chiaro', '▦': 'griglia', '▭': 'foglio', '▤': 'righelli', '⌒': 'raccordo', '🔦': 'laser', '🔲': 'raddrizza'
};
const fuga = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const RX = new RegExp('(' + Object.keys(MAPPA).map(fuga).join('|') + ')\\uFE0F?[ \\u00A0]?', 'gu');
const PROVA = new RegExp('(' + Object.keys(MAPPA).map(fuga).join('|') + ')', 'u');
function icona(nome, cls) {
const d = P[nome]; if (!d) return '';
return `<svg class="ico ico-${nome}${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${d}</svg>`;
}
function nodoIcona(nome) {
const s = document.createElementNS(SVGNS, 'svg');
s.setAttribute('class', 'ico ico-' + nome); s.setAttribute('viewBox', '0 0 24 24');
s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false');
s.innerHTML = P[nome];
return s;
}
const ESCLUSI = 'svg, select, option, textarea, script, style, [contenteditable], .no-ico';
function sostituisciTesto(t) {
const v = t.nodeValue; if (!v || !PROVA.test(v)) return;
const p = t.parentElement; if (!p || p.closest(ESCLUSI)) return;
const fr = document.createDocumentFragment();
let ultimo = 0; RX.lastIndex = 0; let m;
while ((m = RX.exec(v))) {
if (m.index > ultimo) fr.appendChild(document.createTextNode(v.slice(ultimo, m.index)));
const ic = nodoIcona(MAPPA[m[1]]);
if (/[  ]$/.test(m[0])) ic.classList.add('ico-sp');
fr.appendChild(ic);
ultimo = m.index + m[0].length;
}
if (ultimo < v.length) fr.appendChild(document.createTextNode(v.slice(ultimo)));
p.replaceChild(fr, t);
}
function tratta(n) {
if (!n) return;
if (n.nodeType === 3) return sostituisciTesto(n);
if (n.nodeType !== 1 || n.namespaceURI === SVGNS) return;
if (!PROVA.test(n.textContent || '')) return;
const w = document.createTreeWalker(n, NodeFilter.SHOW_TEXT, null), testi = [];
while (w.nextNode()) testi.push(w.currentNode);
testi.forEach(sostituisciTesto);
}
function avvia() {
tratta(document.body);
const ph = document.getElementById('palSearch');
if (ph) ph.placeholder = ph.placeholder.replace(RX, '');
if (!window.MutationObserver) return;
new MutationObserver(rr => {
for (const r of rr) {
if (r.target.namespaceURI === SVGNS) continue;
if (r.type === 'characterData') { tratta(r.target); continue; }
for (const n of r.addedNodes) if (n.namespaceURI !== SVGNS) tratta(n);
}
}).observe(document.body, { childList: true, subtree: true, characterData: true });
}
RS.icona = icona;
RS.icone = { tratta, nomi: Object.keys(P), MAPPA };
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', avvia); else avvia();
})(window.RS = window.RS || {});

(function (RS) {
'use strict';
const BOSCH_S = '02a6c0d0-0451-4000-b000-fb3210111989', BOSCH_C = '02a6c0d1-0451-4000-b000-fb3210111989';
const LEICA_S = '3ab10100-f831-4395-b29d-570977d5bf94';
const LEICA_MISURA = ['3ab10101', '3ab1010d'];
const BOSCH_AVVIO = [0xC0, 0x55, 0x02, 0x01, 0x00, 0x1A];
const el = id => document.getElementById(id);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const android = () => !!(window.RilsinAndroid && window.RilsinAndroid.laserCerca);
const ios = () => /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const L = RS.laser = {
stato: 'scollegato',
nome: '', tipo: '', ultimo: null, trovati: [], _dev: null, _avviso: '',
disponibile() { return android() || !!(navigator.bluetooth && window.isSecureContext); },
perche() {
if (this.disponibile()) return '';
if (ios()) return 'Su iPhone e iPad il Bluetooth non è raggiungibile da un\'app web (limite di Apple): il telemetro si collega con l\'app Android oppure con Chrome o Edge sul PC.';
if (navigator.bluetooth && !window.isSecureContext) return 'Il Bluetooth si usa solo dal sito https (https://axeleuse.github.io/rilsin/), con l\'app Android o con RILSIN aperto da questo computer (localhost): non da una cartella di rete.';
return 'Questo browser non ha il Bluetooth per le pagine web: usa Chrome o Edge (sul PC o su Android) oppure l\'app Android.';
},
decodifica(tipo, uuid, b) {
const f32 = off => new DataView(Uint8Array.from(b.slice(off, off + 4)).buffer).getFloat32(0, true);
let m = null;
if (tipo === 'bosch') {
if (b.length >= 11 && b[0] === 0xC0 && b[1] === 0x55 && b[2] === 0x10 && b[3] === 0x06) m = f32(7);
} else if (tipo === 'leica') {
const u = String(uuid || '').toLowerCase();
if (LEICA_MISURA.some(p => u.indexOf(p) === 0) && b.length >= 4) m = f32(0);
}
return m != null && isFinite(m) && m > 0.02 && m < 500 ? m : null;
},
dati(tipo, uuid, v) {
let b;
if (typeof v === 'string') { b = []; for (let i = 0; i + 1 < v.length; i += 2) b.push(parseInt(v.substr(i, 2), 16)); }
else b = Array.from(new Uint8Array(v.buffer, v.byteOffset, v.byteLength));
const m = this.decodifica(tipo, uuid, b);
if (m != null) this.ricevi(m);
},
ricevi(m) {
const v = Math.round(m * 1000) / 1000, cm = Math.round(m * 100) / 100;
this.ultimo = { v, t: Date.now() };
const testo = cm.toFixed(2).replace('.', ',');
if (RS.ui && RS.ui.misuraDaLaser && RS.ui.misuraDaLaser(cm)) return;
const a = document.activeElement;
if (a && a.tagName === 'INPUT' && (a.type === 'number' || a.inputMode === 'decimal') && !a.disabled && !a.readOnly) {
const box = a.closest('.dtab, .modal, .scelta-box, #props') || document.body;
const caselle = () => Array.from(box.querySelectorAll('input[type=number], input[inputmode=decimal]')).filter(x => x.offsetParent && !x.disabled && !x.readOnly);
const i = caselle().indexOf(a);
a.value = a.type === 'number' ? String(cm) : testo;
a.dispatchEvent(new Event('input', { bubbles: true }));
a.dispatchEvent(new Event('change', { bubbles: true }));
if (RS.ui && RS.ui.vibra) RS.ui.vibra('35');
setTimeout(() => { const d = caselle()[i + 1]; if (d) d.focus(); }, 60);
if (RS.ui) RS.ui.toast('🔦 ' + testo + ' m dal telemetro', 1500);
return;
}
if (RS.ui) RS.ui.toast('🔦 Misura ricevuta: ' + testo + ' m. Per registrarla apri le misure guidate, oppure tocca la casella e rimisura', 4500);
},
_stato(s, nome, avviso) {
this.stato = s; if (nome != null) this.nome = nome; this._avviso = avviso || '';
const c = el('stLaser');
if (c) { c.hidden = s !== 'collegato'; c.textContent = '🔦 ' + (this.nome || 'Telemetro'); c.title = 'Telemetro collegato: premi il tasto di misura sul telemetro. Clic per i dettagli o per scollegarlo'; c.onclick = () => this.apri(); }
if (RS.ui && RS.ui._gm && RS.ui._gmMostra) RS.ui._gmMostra();
this._ridisegna();
},
statoNativo(s, testo) {
if (s === 'collegato') {
this._stato('collegato', testo || this.nome);
if (RS.ui) RS.ui.toast('🔦 Telemetro collegato: premi il tasto di misura sul telemetro', 3500);
if (RS.ui && RS.ui.vibra) RS.ui.vibra('25');
setTimeout(() => { const m = el('laserModal'); if (m && this.stato === 'collegato') m.hidden = true; }, 1500);
return;
}
if (s === 'cerca') return this._stato('cerca', null, testo);
if (s === 'fine-ricerca') { if (this.stato === 'cerca') this._stato('scollegato', null, this.trovati.length ? '' : (testo || 'Nessun telemetro trovato.')); return; }
if (s === 'collega') return this._stato('collega', null, testo);
const era = this.stato === 'collegato';
this._stato('scollegato', null, testo);
if (era && RS.ui) RS.ui.toast('🔦 Telemetro scollegato' + (testo ? ': ' + testo : ''), 4000);
},
trovato(id, nome, tipo) {
if (this.trovati.some(d => d.id === id)) return;
this.trovati.push({ id, nome: nome || 'Telemetro', tipo });
this._ridisegna();
},
apri() {
let m = el('laserModal');
if (!m) {
m = document.createElement('div'); m.id = 'laserModal'; m.className = 'scelta-velo';
document.body.appendChild(m);
m.addEventListener('click', ev => {
if (ev.target === m) { m.hidden = true; return; }
const b = ev.target.closest('[data-lz]'); if (!b) return;
const k = b.dataset.lz;
if (k === 'chiudi') m.hidden = true;
else if (k === 'cerca') this.cerca();
else if (k === 'scollega') this.scollega();
else if (k.indexOf('dev:') === 0) this._collegaAndroid(k.slice(4));
});
}
m.hidden = false;
this._ridisegna();
},
_ridisegna() {
const m = el('laserModal'); if (!m || m.hidden) return;
const no = this.perche(), s = this.stato;
let corpo;
if (no) corpo = `<p class="scelta-testo">${esc(no)}</p>`;
else if (s === 'collegato') corpo = `<p class="scelta-testo">✓ <b>${esc(this.nome)}</b> collegato. Premi il tasto di misura sul telemetro: la misura entra nelle <b>misure guidate</b> (e si passa alla seguente) o nella casella selezionata.${this.ultimo ? ' Ultima misura: <b>' + this.ultimo.v.toFixed(3).replace('.', ',') + ' m</b>.' : ''}</p>
          <button class="scelta-opt pericolo" data-lz="scollega"><b>Scollega</b></button>`;
else {
const lista = this.trovati.map(d => `<button class="scelta-opt" data-lz="dev:${esc(d.id)}"><b>🔦 ${esc(d.nome)}</b><small>${d.tipo === 'bosch' ? 'Bosch' : d.tipo === 'leica' ? 'Leica DISTO' : 'Bluetooth'} · tocca per collegare</small></button>`).join('');
corpo = `<p class="scelta-testo">Per chi ha un telemetro laser con il Bluetooth: <b>Bosch GLM</b> «C» (GLM 50 C, 50-27 C, 100-25 C…) o <b>Leica DISTO</b>. Accendi il telemetro e il suo Bluetooth${ios() ? '' : ', tienilo vicino'}; sul Leica l'unità di misura deve essere il metro.</p>
          ${s === 'cerca' ? '<p class="scelta-testo"><b>Ricerca in corso…</b></p>' : ''}${s === 'collega' ? '<p class="scelta-testo"><b>Collegamento in corso…</b></p>' : ''}
          ${this._avviso ? `<p class="scelta-testo">⚠ ${esc(this._avviso)}</p>` : ''}
          ${lista}
          ${s === 'cerca' || s === 'collega' ? '' : `<button class="scelta-opt primario" data-lz="cerca"><b>${this.trovati.length ? 'Cerca di nuovo' : 'Cerca il telemetro'}</b></button>`}`;
}
m.innerHTML = `<div class="scelta-box" role="dialog" aria-modal="true"><div class="scelta-tit">🔦 Telemetro laser Bluetooth</div>${corpo}
        <button class="scelta-annulla" data-lz="chiudi">Chiudi</button></div>`;
},
cerca() {
if (this.perche()) return this._ridisegna();
this.trovati = [];
if (android()) { this._stato('cerca'); try { window.RilsinAndroid.laserCerca(); } catch (e) { this._stato('scollegato', null, 'Bluetooth non disponibile'); } return; }
this._collegaWeb();
},
_collegaAndroid(id) {
const d = this.trovati.find(x => x.id === id);
this._stato('collega', d ? d.nome : '');
try { window.RilsinAndroid.laserCollega(id); } catch (e) { this._stato('scollegato', null, 'Collegamento non riuscito'); }
},
async _collegaWeb() {
let dev;
try {
dev = await navigator.bluetooth.requestDevice({
filters: [{ services: [BOSCH_S] }, { services: [LEICA_S] }, { namePrefix: 'DISTO' }, { namePrefix: 'GLM' }],
optionalServices: [BOSCH_S, LEICA_S]
});
} catch (e) {
if (e && e.name !== 'NotFoundError') this._stato('scollegato', null, 'Bluetooth non disponibile: ' + (e.message || e.name));
return;
}
this._stato('collega', dev.name || 'Telemetro');
try {
if (this._dev && this._dev !== dev && this._dev.gatt.connected) this._dev.gatt.disconnect();
this._dev = dev;
dev.addEventListener('gattserverdisconnected', () => { if (this._dev === dev) this.statoNativo('scollegato', ''); });
const srv = await dev.gatt.connect();
let svc = null;
try { svc = await srv.getPrimaryService(BOSCH_S); } catch (e) { svc = null; }
if (svc) {
const ch = await svc.getCharacteristic(BOSCH_C);
ch.addEventListener('characteristicvaluechanged', ev => this.dati('bosch', BOSCH_C, ev.target.value));
await ch.startNotifications();
const cmd = Uint8Array.from(BOSCH_AVVIO);
if (ch.writeValueWithoutResponse) await ch.writeValueWithoutResponse(cmd); else await ch.writeValue(cmd);
this.tipo = 'bosch';
} else {
svc = await srv.getPrimaryService(LEICA_S);
const chs = await svc.getCharacteristics();
let n = 0;
for (const ch of chs) {
if (!(ch.properties.notify || ch.properties.indicate)) continue;
ch.addEventListener('characteristicvaluechanged', ev => this.dati('leica', ch.uuid, ev.target.value));
try { await ch.startNotifications(); n++; } catch (e) {  }
}
if (!n) throw new Error('nessuna misura da ascoltare');
this.tipo = 'leica';
}
this.statoNativo('collegato', dev.name || (this.tipo === 'bosch' ? 'Bosch GLM' : 'Leica DISTO'));
} catch (e) {
try { dev.gatt.disconnect(); } catch (x) {}
this._stato('scollegato', null, 'Telemetro non riconosciuto o non raggiungibile (' + (e.message || e.name) + '). Riprova vicino al telemetro acceso.');
}
},
scollega() {
if (android()) { try { window.RilsinAndroid.laserScollega(); } catch (e) {} }
if (this._dev) { const d = this._dev; this._dev = null; try { d.gatt.disconnect(); } catch (e) {} }
this._stato('scollegato', '');
},
_prova: { BOSCH_S, LEICA_S }
};
})(window.RS = window.RS || {});

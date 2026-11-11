(function () {
'use strict';
const RS = window.RS = window.RS || {};
const errori = [];
const annota = (msg, dove) => {
const f = String(dove || '').replace(/^.*\//, '').replace(/\?[^:]*/, '');
errori.push({ ora: new Date().toTimeString().slice(0, 8), msg: String(msg || '').slice(0, 200), f });
if (errori.length > 8) errori.shift();
};
window.addEventListener('error', e => annota(e.message, e.filename ? e.filename + ':' + e.lineno : ''));
window.addEventListener('unhandledrejection', e => { const r = e.reason; annota('Promessa rifiutata: ' + (r && r.message || r), r && r.stack ? (String(r.stack).split('\n')[1] || '') : ''); });
function dispositivo() {
const ua = navigator.userAgent || '';
const ios = /iP(hone|ad|od)/.exec(ua), iosV = /OS (\d+)_(\d+)/.exec(ua), and = /Android ([\d.]+)/.exec(ua);
const sis = ios ? (ios[0] + ' iOS ' + (iosV ? iosV[1] + '.' + iosV[2] : '?'))
: and ? 'Android ' + and[1] : /Windows NT 10/.test(ua) ? 'Windows 10/11' : /Mac OS X/.test(ua) ? 'Mac' : (navigator.platform || 'altro');
const ch = /CriOS\/(\d+)|Chrome\/(\d+)/.exec(ua), ed = /Edg\/(\d+)/.exec(ua), sa = /Version\/([\d.]+).*Safari/.exec(ua), ff = /Firefox\/(\d+)/.exec(ua);
const br = ed ? 'Edge ' + ed[1] : ch ? 'Chrome ' + (ch[1] || ch[2]) : sa ? 'Safari ' + sa[1] : ff ? 'Firefox ' + ff[1] : 'browser';
return sis + ' · ' + (window.RilsinAndroid ? 'app Android' : br);
}
async function testo(descr) {
let mem = '';
try { if (navigator.storage && navigator.storage.estimate) { const e = await navigator.storage.estimate(); mem = ((e.usage || 0) / 1048576).toFixed(1).replace('.', ',') + ' MB'; } } catch (e) {}
try { if (navigator.storage && navigator.storage.persisted && await navigator.storage.persisted()) mem += ' (protetta)'; } catch (e) {}
const S = RS.scene, ogg = S && S.elements ? S.elements.length : 0;
const righe = [
'Che cosa succede: ' + (descr || '(da scrivere)'),
'',
'Versione: ' + (RS.VERSION || '?') + ' build ' + (RS.BUILD || '?') + (RS.DATA_BUILD ? ' del ' + RS.DATA_BUILD.split('-').reverse().join('/') : ''),
'Dove gira: ' + (RS.ui && RS.ui.doveGira ? RS.ui.doveGira() : location.protocol),
'Dispositivo: ' + dispositivo(),
'Schermo: ' + innerWidth + '×' + innerHeight + ' (densità ' + (window.devicePixelRatio || 1) + ')' + (matchMedia('(display-mode: standalone)').matches || navigator.standalone ? ' · app installata' : ''),
'Memoria usata: ' + (mem || 'n/d'),
'Oggetti sulla tavola aperta: ' + ogg,
'Errori recenti: ' + (errori.length ? '' : 'nessuno')
].concat(errori.map(x => '  ' + x.ora + ' ' + x.msg + (x.f ? ' [' + x.f + ']' : '')));
return righe.join('\n');
}
const indirizzo = () => /^[^\s@<>()",;]+@[^\s@<>()",;]+\.[A-Za-z]{2,}$/.test(RS.EMAIL_SEGNALAZIONI || '') ? RS.EMAIL_SEGNALAZIONI : '';
RS.segnala = {
errori: () => errori.slice(),
testo,
disponibile: () => !!indirizzo(),
async apri() {
const ui = RS.ui, mail = indirizzo(); if (!ui || !ui.scelta || !mail) return;
let descr = '';
const html = '<p class="scelta-testo">Scrivi in breve che cosa è successo e che cosa stavi facendo, poi premi «Invia per e-mail»: si apre la tua app di posta con tutto già scritto, e basta premere Invia.</p>' +
'<textarea id="segnDescr" rows="4" style="width:100%;box-sizing:border-box;font:inherit;font-size:15px;padding:8px;border-radius:8px" placeholder="es. Nello schizzo, toccando l\'edificio, non si apre il menu"></textarea>' +
'<p class="scelta-testo" style="font-size:12px;opacity:.8">All\'e-mail si aggiungono versione, dispositivo, schermo, memoria ed eventuali errori dell\'app. Nessun dato delle tavole o dei coinvolti.</p>';
const p = ui.scelta({ titolo: '🐞 Segnala un problema', html,
opzioni: [{ k: 'mail', t: '✉ Invia per e-mail', d: 'a ' + mail + ': si apre la tua app di posta', primario: true }] });
setTimeout(() => { const a = document.getElementById('segnDescr'); if (a) { a.addEventListener('input', () => { descr = a.value.trim(); }); a.focus(); } }, 50);
if (await p !== 'mail') return;
const t = await testo(descr), oggetto = 'Segnalazione RILSIN build ' + (RS.BUILD || '?');
if (window.RilsinAndroid && RilsinAndroid.scriviMail) { RilsinAndroid.scriviMail(mail, oggetto, t); return; }
location.href = 'mailto:' + mail + '?subject=' + encodeURIComponent(oggetto) + '&body=' + encodeURIComponent(t);
}
};
})();

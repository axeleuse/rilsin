(function () {
'use strict';
const RS = window.RS = window.RS || {};
const ios = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
RS.ios = ios && !window.RilsinAndroid;
if (!RS.ios) return;
document.documentElement.classList.add('ios');
const apriVera = window.open.bind(window);
let riquadro = null;
function chiudi() { if (riquadro) { riquadro.remove(); riquadro = null; } }
function nuovoRiquadro() {
chiudi();
const box = document.createElement('div');
box.className = 'ios-doc';
box.innerHTML = '<div class="ios-doc-barra"><button class="ios-doc-b" data-ios="stampa">🖨 Stampa / PDF</button><button class="ios-doc-b" data-ios="chiudi">✕ Chiudi</button></div>';
const scorre = document.createElement('div');
scorre.className = 'ios-doc-scorre';
const fr = document.createElement('iframe');
fr.className = 'ios-doc-fr';
fr.setAttribute('title', 'Documento');
scorre.appendChild(fr);
box.appendChild(scorre);
document.body.appendChild(box);
box.addEventListener('click', ev => {
const b = ev.target.closest('[data-ios]'); if (!b) return;
if (b.dataset.ios === 'chiudi') chiudi();
else { try { fr.contentWindow.focus(); fr.contentWindow.print(); } catch (e) {} }
});
riquadro = box;
let giri = 0;
const adatta = () => {
if (!riquadro || riquadro !== box) return;
try {
const d = fr.contentDocument; if (!d || !d.documentElement) return;
let st = d.getElementById('ios-zoom');
if (!st) { st = d.createElement('style'); st.id = 'ios-zoom'; (d.head || d.documentElement).appendChild(st); }
st.textContent = '';
const schermo = Math.min(scorre.clientWidth || innerWidth, innerWidth);
const largo = Math.max(d.documentElement.scrollWidth, d.body ? d.body.scrollWidth : 0), k = largo > 0 ? Math.min(1, (schermo - 4) / largo) : 1;
st.textContent = 'html{-webkit-text-size-adjust:100%;text-size-adjust:100%}' + (k < 0.97 ? '@media screen{html{zoom:' + k.toFixed(3) + '}}' : '');
} catch (e) {}
if (++giri < 12) setTimeout(adatta, 250);
};
setTimeout(adatta, 150);
fr.addEventListener('load', () => { giri = 0; adatta(); });
const w = fr.contentWindow;
try { w.close = chiudi; } catch (e) {}
return w;
}
window.open = function (url, target, feat) {
const u = url == null ? '' : String(url);
if (u && u !== 'about:blank') return apriVera(url, target, feat);
return nuovoRiquadro();
};
document.addEventListener('keydown', e => { if (e.key === 'Escape' && riquadro) { chiudi(); e.stopPropagation(); } }, true);
function dopoCaricamento() {
const E = RS.exportUtil; if (!E || E._ios) return;
E._ios = true;
const scarica = E.download.bind(E);
E.download = function (blob, name) {
let f = null;
try { f = new File([blob], name, { type: blob.type || 'application/octet-stream' }); } catch (e) {}
if (!f || !navigator.canShare || !navigator.canShare({ files: [f] })) { scarica(blob, name); return; }
const attivo = navigator.userActivation ? navigator.userActivation.isActive : true;
if (!attivo) { fileProntoTocca(f); return; }
navigator.share({ files: [f], title: name }).catch(e => {
if (e && e.name === 'AbortError') return;
fileProntoTocca(f);
});
};
}
function fileProntoTocca(f) {
const v = document.createElement('div');
v.className = 'ios-file';
v.innerHTML = '<div class="ios-file-box"><div class="ios-file-t">📄 File pronto</div><div class="ios-file-n"></div>' +
'<div class="ios-file-h">Tocca il tasto e scegli «Salva su File» (oppure Mail, Drive, AirDrop).</div>' +
'<button class="ios-file-ok" type="button">📤 Salva o condividi</button><button class="ios-file-no" type="button">Annulla</button></div>';
v.querySelector('.ios-file-n').textContent = f.name;
document.body.appendChild(v);
const chiudi = () => v.remove();
v.querySelector('.ios-file-no').onclick = chiudi;
v.querySelector('.ios-file-ok').onclick = () => {
navigator.share({ files: [f], title: f.name }).then(chiudi).catch(e => {
if (e && e.name === 'AbortError') return;
chiudi(); if (RS.ui && RS.ui.toast) RS.ui.toast('Il telefono non ha permesso di salvare il file: riprova', 5000);
});
};
}
document.addEventListener('DOMContentLoaded', dopoCaricamento);
window.addEventListener('load', dopoCaricamento);
})();

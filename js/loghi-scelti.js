(function () {
'use strict';
const RS = window.RS = window.RS || {};
const CHIAVE = 'rilsin:logo:';
const VUOTO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const NOMI = { logoCC: 'Logo del Comando', emblema: 'Emblema dell\'intestazione' };
const DOVE = { logoCC: 'planimetria e cartiglio della tavola', emblema: 'in cima a verbale, fascicolo fotografico e scambio dati' };
const predefiniti = {};
const leggi = prop => { try { return localStorage.getItem(CHIAVE + prop) || ''; } catch (e) { return ''; } };
function applica() {
['logoCC', 'emblema'].forEach(prop => {
const v = leggi(prop);
if (v === 'nessuno') RS[prop] = VUOTO;
else if (/^data:image\/png;base64,/.test(v)) RS[prop] = v;
else if (predefiniti[prop]) RS[prop] = predefiniti[prop];
});
}
function daFile(file) {
return new Promise((ok, ko) => {
if (!file || !/^image\//.test(file.type || '')) { ko(new Error('Non è un\'immagine')); return; }
const url = URL.createObjectURL(file), img = new Image();
img.onload = () => {
try {
const k = Math.min(1, 800 / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
const w = Math.max(1, Math.round((img.naturalWidth || 1) * k)), h = Math.max(1, Math.round((img.naturalHeight || 1) * k));
const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
cv.getContext('2d').drawImage(img, 0, 0, w, h);
ok(cv.toDataURL('image/png'));
} catch (e) { ko(e); } finally { URL.revokeObjectURL(url); }
};
img.onerror = () => { URL.revokeObjectURL(url); ko(new Error('Immagine non leggibile')); };
img.src = url;
});
}
RS.loghi = {
VUOTO,
nessuno: prop => leggi(prop) === 'nessuno',
predefinito(prop, dati) { if (dati) predefiniti[prop] = dati; applica(); },
imposta(prop, valore) {
try {
if (!valore || valore === 'predefinito') localStorage.removeItem(CHIAVE + prop);
else localStorage.setItem(CHIAVE + prop, valore);
} catch (e) { if (RS.ui && RS.ui.toast) RS.ui.toast('Il logo non si può salvare: memoria del browser piena'); return false; }
if (!valore || valore === 'predefinito') RS[prop] = predefiniti[prop] || RS[prop];
applica();
return true;
},
html() {
return '<div class="lg-box"><div class="lg-t">Loghi negli atti</div>' +
'<div class="lg-n">Per un\'altra istituzione metti i tuoi loghi, oppure nessuno. Restano in questo dispositivo e valgono per tutti gli atti.</div>' +
['logoCC', 'emblema'].map(p => `<div class="lg-riga" data-lg="${p}">
          <div class="lg-img"><img alt=""></div>
          <div class="lg-tx"><b>${NOMI[p]}</b><small>${DOVE[p]}</small><small class="lg-stato"></small></div>
          <div class="lg-bt"><button class="mini" type="button" data-lga="cambia">Cambia…</button><button class="mini" type="button" data-lga="nessuno">Nessuno</button><button class="mini" type="button" data-lga="predefinito">Originale</button></div>
        </div>`).join('') + '</div>';
},
collega(radice) {
if (!radice) return;
const aggiorna = () => radice.querySelectorAll('[data-lg]').forEach(r => {
const p = r.dataset.lg, v = leggi(p), img = r.querySelector('img');
const src = v === 'nessuno' ? '' : (/^data:image\/png;base64,/.test(v) ? v : (predefiniti[p] || RS[p] || ''));
if (src) { img.src = src; img.hidden = false; } else { img.removeAttribute('src'); img.hidden = true; }
r.querySelector('.lg-stato').textContent = v === 'nessuno' ? 'nessun logo' : v ? 'logo scelto da te' : 'originale';
});
aggiorna();
radice.addEventListener('click', ev => {
const b = ev.target.closest('[data-lga]'); if (!b) return;
const p = b.closest('[data-lg]').dataset.lg, a = b.dataset.lga;
if (a === 'nessuno' || a === 'predefinito') { this.imposta(p, a); aggiorna(); return; }
const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/png,image/jpeg,image/webp,image/gif';
i.onchange = () => {
const f = i.files && i.files[0]; if (!f) return;
daFile(f).then(d => { if (this.imposta(p, d)) { aggiorna(); if (RS.ui && RS.ui.toast) RS.ui.toast(NOMI[p] + ' cambiato: vale per tutti gli atti'); } })
.catch(e => { if (RS.ui && RS.ui.toast) RS.ui.toast(String(e && e.message || e)); });
};
i.click();
});
},
_daFile: daFile
};
applica();
})();

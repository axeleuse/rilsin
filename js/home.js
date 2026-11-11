(function (RS) {
'use strict';
const el = (id) => document.getElementById(id);
const IC = {
riprendi: '<svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v4h4"/><path d="M12 8v4l3 2"/></svg>',
guida:    '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9.2 9.3a2.8 2.8 0 1 1 3.6 3q-.8.5-.8 1.6"/><circle cx="12" cy="17" r=".9" fill="currentColor" stroke="none"/></svg>',
nuovo:    '<svg viewBox="0 0 24 24"><path d="M14 3v5h5"/><path d="M6 3h8l5 5v13H6z"/><path d="M12 11.5v5M9.5 14h5"/></svg>',
procedura: '<svg viewBox="0 0 24 24"><circle cx="6" cy="6" r="2.2"/><circle cx="18" cy="12" r="2.2"/><circle cx="6" cy="18" r="2.2"/><path d="M8 6h4a4 4 0 0 1 4 4M16 14a4 4 0 0 1-4 4H8"/></svg>',
apri:     '<svg viewBox="0 0 24 24"><path d="M3 7h6l2 2h10v9H3z"/></svg>',
foto:     '<svg viewBox="0 0 24 24"><path d="M4 8h4l1.5-2h5L16 8h4v11H4z"/><circle cx="12" cy="13" r="3.2"/></svg>',
recon:    '<svg viewBox="0 0 24 24"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h2M12 11h2M8 15h2M12 15h2M8 18h6"/></svg>',
dati:     '<svg viewBox="0 0 24 24"><path d="M9 4h6v3H9z"/><path d="M6 5H5v16h14V5h-1"/><path d="M9 11h7M9 15h5"/></svg>',
luoghi:   '<svg viewBox="0 0 24 24"><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/></svg>'
};
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function descriviBozza(iso, nome, nOgg, nFoto) {
let quando = '';
if (iso) {
const d = new Date(iso), oggi = new Date(), ieri = new Date(Date.now() - 86400000);
const ora = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
quando = d.toDateString() === oggi.toDateString() ? 'oggi alle ' + ora
: d.toDateString() === ieri.toDateString() ? 'ieri alle ' + ora : 'il ' + d.toLocaleDateString('it-IT') + ' alle ' + ora;
}
return [nome ? '«' + nome + '»' : 'Non ancora salvato', quando,
[nOgg ? nOgg + (nOgg === 1 ? ' oggetto' : ' oggetti') : '', nFoto ? nFoto + ' foto' : ''].filter(Boolean).join(', ')].filter(Boolean).join(' · ');
}
function cards() {
const c = [];
const auto = RS.storage.getAutosave();
const nOgg = (auto && auto.elements) ? auto.elements.length : 0;
const nFoto = (auto && auto.fascicolo && auto.fascicolo.photos) ? auto.fascicolo.photos.length : 0;
const nCoinv = auto && RS.storage.nCoinvolti ? RS.storage.nCoinvolti(auto) : 0;
if (nOgg || nFoto || nCoinv) {
let mini = null;
try { const m = JSON.parse(localStorage.getItem('rilsin:bozzaMini') || 'null'); if (m && m.id && m.id === auto.bozzaId && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(m.img)) mini = m.img; } catch (e) {}
c.push({ act: 'riprendi', icon: IC.riprendi, mini, t: 'Riprendi il disegno lasciato in sospeso',
d: descriviBozza(auto.autoAt, auto.autoNome || auto.nome || '', nOgg, nFoto), hot: true, salvata: !!auto.autoSalvata });
}
c.push({ act: 'procedura', icon: IC.procedura, t: 'Procedura guidata',
d: 'Dati dei coinvolti, disegno, misure, foto e atti, un passo alla volta' });
c.push({ act: 'nuovo', icon: IC.nuovo, t: 'Genera disegno',
d: 'Crea la planimetria in scala della scena del sinistro' });
c.push({ act: 'apri', icon: IC.apri, t: 'Apri disegno',
d: 'Una tavola salvata, anche di un collega nella cartella condivisa' });
c.push({ act: 'luoghi', icon: IC.luoghi, t: 'Parti da un luogo salvato',
d: 'Incroci già disegnati, con strade, segnaletica e capisaldi' });
c.push({ act: 'foto', icon: IC.foto, t: 'Fascicolo fotografico',
d: 'Aggiungi le foto del sopralluogo e genera l’allegato' });
c.push({ act: 'recon', icon: IC.recon, t: 'Ricostruzione cinematica',
d: 'Velocità, spazio d’arresto, urto e velocità in curva' });
c.push({ act: 'dati', icon: IC.dati, t: 'Dati e misure',
d: 'Intestazione, rilievo dei punti, altre misure, controllo e chiusura' });
c.push({ act: 'guida', icon: IC.guida, t: 'Guida',
d: 'Mini-tutorial interattivo e manuale completo con FAQ (PDF)' });
return c;
}
const home = {
init() {
this.w = el('welcome');
this.h = el('home');
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const wc = el('welCred');
const ver = RS.versioneEstesa ? RS.versioneEstesa() : (RS.VERSION || '1.0');
if (wc) wc.innerHTML = '<span class="riga">Versione ' + esc(ver) + '</span><span class="riga">Powered by ' + esc(RS.AUTORE || '') + '</span>';
const sv = el('stVer');
if (sv) {
sv.textContent = 'RILSIN ' + ver + ' · Powered by ' + (RS.AUTORE || '');
sv.title = 'Informazioni e diritti';
sv.style.cursor = 'pointer';
sv.onclick = () => RS.ui.openInfo();
}
if (this.w) this.w.addEventListener('click', () => this.toMenu());
if (this.h) this.h.addEventListener('click', (e) => {
const card = e.target.closest('[data-home]');
if (card) this.pick(card.dataset.home);
});
window.addEventListener('keydown', (e) => {
if (e.key === 'Escape' && this.h && !this.h.hidden && !document.querySelector('.modal:not([hidden]), #sceltaModal:not([hidden])')) this.hide();
});
RS.scene.on('change', () => {
if ((this._attesa === 'apri' || this._attesa === 'luoghi') && this.h && !this.h.hidden && RS.scene.elements.length) { this._attesa = null; this.hide(); }
});
},
start() {
if (!this.w) return this.showMenu();
this.w.hidden = false; this.w.classList.add('show');
this.showMenu(true);
this._t = setTimeout(() => this.toMenu(), 4200);
},
toMenu() {
clearTimeout(this._t);
if (this.w && !this.w.hidden) {
this.w.classList.remove('show');
setTimeout(() => { this.w.hidden = true; }, 350);
}
if (this.h.hidden) this.showMenu();
if (RS.ui && RS.ui.maybeFirstSetup) setTimeout(() => RS.ui.maybeFirstSetup(), 500);
},
aggiornaMiniatura(bozzaId, forza) {
const S = RS.scene; if (!S || !S.gElements || !S.elements.length || !bozzaId) return;
const ora = Date.now(), dopo = 15000 - (ora - (this._miniT || 0));
if (this._miniIn) return;
if (!forza && dopo > 0) { clearTimeout(this._miniTimer); this._miniTimer = setTimeout(() => this.aggiornaMiniatura(bozzaId), dopo + 50); return; }
clearTimeout(this._miniTimer);
const b = S.contentBounds(); if (!b) return;
this._miniIn = true; this._miniT = ora;
const fine = () => { this._miniIn = false; };
try {
const pad = Math.max(b.w, b.h) * 0.06 + 1, R = 1.6;
let x = b.x - pad, y = b.y - pad, w = b.w + 2 * pad, h = b.h + 2 * pad;
if (w / h > R) { const nh = w / R; y -= (nh - h) / 2; h = nh; } else { const nw = h * R; x -= (nw - w) / 2; w = nw; }
const g = S.gElements.cloneNode(true);
g.querySelectorAll('image').forEach(n => n.remove());
const XS = new XMLSerializer(), W = 320, H = 200;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="${x} ${y} ${w} ${h}">` +
`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#f4f1e8"/>` +
(S.defs ? XS.serializeToString(S.defs) : '') + (S.defsDyn ? XS.serializeToString(S.defsDyn) : '') + XS.serializeToString(g) + '</svg>';
const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' })), img = new Image();
img.onload = () => {
try {
const c = document.createElement('canvas'); c.width = W; c.height = H;
c.getContext('2d').drawImage(img, 0, 0, W, H);
const dati = c.toDataURL('image/jpeg', 0.82);
localStorage.setItem('rilsin:bozzaMini', JSON.stringify({ id: bozzaId, img: dati }));
const ic = this.h && !this.h.hidden && this.h.querySelector('[data-home="riprendi"] .hc-ic');
if (ic) { ic.classList.add('hc-mini'); ic.innerHTML = `<img src="${dati}" alt="">`; }
} catch (e) {  }
URL.revokeObjectURL(url); fine();
};
img.onerror = () => { URL.revokeObjectURL(url); fine(); };
img.src = url;
} catch (e) { fine(); }
},
showMenu(subito) {
this.buildMenu(); this._attesa = null;
if (RS.scene && RS.scene.elements.length && RS.storage && RS.storage._bozzaId) this.aggiornaMiniatura(RS.storage._bozzaId, true);
this.h.hidden = false;
if (subito) { this.h.classList.add('subito', 'show'); requestAnimationFrame(() => this.h.classList.remove('subito')); }
else requestAnimationFrame(() => this.h.classList.add('show'));
},
hide(subito) {
if (!this.h) return;
clearTimeout(this._t);
if (subito) { this.h.classList.add('subito'); this.h.classList.remove('show'); this.h.hidden = true; this.h.classList.remove('subito'); }
else {
this.h.classList.remove('show');
setTimeout(() => { if (!this.h.classList.contains('show')) this.h.hidden = true; }, 300);
}
if (this.w) { this.w.hidden = true; this.w.classList.remove('show'); }
},
buildMenu() {
const cs = cards().map(c =>
`<button class="home-card${c.hot ? ' hot' : ''}" data-home="${c.act}">
           <span class="hc-ic${c.mini ? ' hc-mini' : ''}">${c.mini ? `<img src="${c.mini}" alt="">` : c.icon}</span>
           <span class="hc-txt">
             <span class="hc-t">${c.t}${c.hot ? '<span class="hc-badge">bozza</span>' : ''}</span>
             <span class="hc-d">${c.d}</span>
           </span>
           <span class="hc-go">›</span>
         </button>`).join('');
this.h.innerHTML =
`<div class="home-tricolor"><span></span><span></span><span></span></div>
         <div class="home-wrap">
           <header class="home-head">
             <img class="home-logo" src="icon.svg" alt="" onerror="this.style.display='none'">
             <div class="home-htxt">
               <div class="home-name">RILSIN</div>
               <div class="home-desc">Rilievo planimetrico dei sinistri stradali</div>
             </div>
           </header>
           <div class="home-div"></div>
           <div class="home-q">Cosa vuoi fare?</div>
           <div class="home-grid">${cs}</div>
           <div class="home-bozze" id="homeBozze" hidden></div>
           <footer class="home-foot">
             <span class="home-ver"><span class="riga">RILSIN versione ${RS.versioneEstesa ? RS.versioneEstesa() : (RS.VERSION || '1.0')}</span><span class="riga">Powered by ${RS.AUTORE || ''}</span></span>
             <span class="home-copy">${RS.COPYRIGHT || ''} · <button class="home-info" data-home="info">Informazioni e diritti</button></span>
             <div class="home-extra">
               ${RS.segnala && RS.segnala.disponibile() ? '<button class="home-segnala" data-home="segnala">🐞 Segnala un problema</button>' : ''}
               ${RS.caffe && RS.caffe.visibile() ? '<button class="home-caffe" data-home="caffe">☕ Sostieni RILSIN</button>' : ''}
             </div>
           </footer>
         </div>`;
this._bozzaSalvata = (cards().find(c => c.act === 'riprendi') || {}).salvata;
this.caricaBozze();
},
caricaBozze() {
if (!RS.storage.bozzeRecenti) return;
RS.storage.bozzeRecenti().then(elenco => {
const box = el('homeBozze'); if (!box) return;
if (!elenco.length) { box.hidden = true; box.innerHTML = ''; return; }
box.innerHTML = `<div class="home-bozze-t">Altre bozze non salvate <small>si tengono le ultime 5, per 7 giorni</small></div>` +
elenco.map(b => `<div class="home-bozza-r"><button class="home-bozza" data-home="bozza:${esc(b.id)}">
              <span class="hc-ic">${IC.nuovo}</span><span class="hc-txt"><span class="hc-d">${esc(descriviBozza(b.autoAt, b.nome, b.n, b.foto))}</span></span>
              <span class="hc-go">›</span></button><button class="home-bozza-x" data-home="bozzavia:${esc(b.id)}" title="Elimina questa bozza" aria-label="Elimina questa bozza">🗑</button></div>`).join('');
this._bozze = elenco;
box.hidden = false;
}).catch(() => {});
},
pick(act) {
const U = RS.ui;
if (act === 'riprendi') {
this.hide();
if (!U.riprendiBozza()) U.toast('Il disegno in sospeso non si può più riprendere');
return;
}
if (act === 'caffe') { RS.ui.openInfo(); setTimeout(() => { const s = document.querySelector('#infoBody .info-sost'); if (s) s.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, 60); return; }
if (act === 'segnala') { if (RS.segnala) RS.segnala.apri(); return; }
if (act.indexOf('bozzavia:') === 0) {
const id = act.slice(9), b = (this._bozze || []).find(x => x.id === id);
U.scelta({ titolo: 'Eliminare la bozza?', testo: (b ? descriviBozza(b.autoAt, b.nome, b.n, b.foto) + '. ' : '') + 'Non si potrà più riprendere. Le tavole salvate non vengono toccate.',
opzioni: [{ k: 'si', t: '🗑 Elimina la bozza', pericolo: true }] }).then(k => {
if (k !== 'si') return;
RS.storage.eliminaBozza(id).then(ok => { U.toast(ok ? 'Bozza eliminata' : 'Bozza non eliminata', 2500); this.caricaBozze(); });
});
return;
}
if (act.indexOf('bozza:') === 0) {
this.hide();
RS.storage.riprendiBozzaDaParte(act.slice(6)).then(ok => U.toast(ok ? 'Ripresa la bozza' : 'Questa bozza non si può più riprendere'));
return;
}
if ((act === 'nuovo' || act === 'apri' || act === 'luoghi') && !this._bozzaOk && !RS.scene.elements.length && !this._bozzaSalvata && this.h.querySelector('[data-home="riprendi"]')) {
U.scelta({
titolo: 'C\'è un disegno lasciato in sospeso',
testo: 'Non è stato salvato. Se inizi un altro lavoro resta fra le bozze recenti di questa pagina, per 7 giorni.',
opzioni: [
{ k: 'riprendi', t: 'Riprendi il disegno in sospeso', d: 'Torna sulla tavola com\'era', primario: true },
{ k: 'avanti', t: 'Inizia l\'altro lavoro', d: 'Il disegno in sospeso va fra le bozze recenti' }]
}).then(k => {
if (k === 'riprendi') this.pick('riprendi');
else if (k === 'avanti') { this._bozzaOk = true; this.pick(act); this._bozzaOk = false; }
});
return;
}
if (act === 'nuovo') { this.hide(); U.action('nuovo', null); return; }
if (act === 'procedura') { RS.procedura.nuova(); return; }
if (act === 'info') { RS.ui.openInfo(); return; }
if (act === 'foto') { RS.fascicolo.open('menu'); return; }
const apri = {
apri: () => U.action('apri', null),
luoghi: () => RS.luoghi.apri(),
recon: () => RS.recon.open(),
dati: () => U.action('dati', null),
guida: () => U.openGuida && U.openGuida()
}[act];
if (!apri) return;
this._attesa = act;
apri();
const fin = { dati: 'dataModal', guida: 'guidaModal' }[act];
if (fin && el(fin)) {
const m = el(fin), oss = new MutationObserver(() => {
if (!m.hidden) return;
oss.disconnect();
if (act === 'dati') this.hide();
else setTimeout(() => { if (document.querySelector('.coach:not([hidden])')) this.hide(); }, 400);
});
oss.observe(m, { attributes: true, attributeFilter: ['hidden'] });
}
}
};
RS.home = home;
})(window.RS = window.RS || {});

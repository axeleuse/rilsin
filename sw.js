/* RILSIN — funzionamento senza rete dell'app web (GitHub Pages: iPhone, iPad, telefoni senza l'app).
   Generato da _build/web.ps1: non modificare a mano nella cartella del sito.
   Tutti i file dell'app restano nel telefono; i siti esterni (Geoportale, siti delle verifiche,
   PayPal, Google Maps) passano sempre dalla rete e non vengono conservati.

   Aggiornamenti leggeri: ogni file ha la sua impronta (SHA-256 del contenuto). Tutti i file stanno in
   un'unica memoria «rilsin-file», con l'impronta nel nome: a una versione nuova si scaricano SOLO i
   file cambiati (di solito poche centinaia di KB) e quelli uguali non si duplicano mai. Così l'iPhone,
   che dà poco spazio ai siti, non resta senza posto a metà aggiornamento, e il download finisce in fretta. */
'use strict';
const VERSIONE = 'rilsin-269-f8caa3d562';
const FILE = [['index.html', '5108b252264fd312'], ['manifest.json', 'fc42862f1edc6b34'], ['icon.svg', '6e83f9dcb437566c'], ['icon-180.png', '12f5146c7f721fdd'], ['icon-192.png', 'e9ee6f167faf977c'], ['icon-512.png', '08f3bd147b5f15df'], ['emblema.png', '8095b9db9e3a9bf9'], ['logocc.png', '37296c1336d41acf'], ['GUIDA_RILSIN.pdf', '5e44bdbcac1cfd4f'], ['presentazione.html', 'ae834572ecdb863d'], ['vetrina.png', 'f295ff00507d914f'], ['css/style.css', 'b36f91cfb0e9bb78'], ['js/app.js', '126a154b8e6312ac'], ['js/cartelli.js', 'f3b1f6c942dbffe3'], ['js/catalog.js', 'e27b102c163290eb'], ['js/coinvolti.js', 'b675940154ad4953'], ['js/comuni.js', '808931ba5cc2994c'], ['js/curve.js', '7f099f9b866562e7'], ['js/elements.js', '20b423bde8e75671'], ['js/export.js', '192ae92786265af8'], ['js/fascicolo.js', '49cd04ef195e767d'], ['js/home.js', '6538b817d9b1e8e6'], ['js/icone.js', '3069e8cae986a7b1'], ['js/incroci.js', 'c0a741a4576b0c50'], ['js/ios.js', '89522b878adbc837'], ['js/laser.js', '5c0844c3daa5b4b5'], ['js/layers.js', '6b2cd3a6d3ee82da'], ['js/loghi.js', 'a0417c83057a9ff5'], ['js/loghi-scelti.js', '6bd6b4691debeb53'], ['js/luoghi.js', '367f7dec127b6034'], ['js/menucontesto.js', '8ae8a86ea1e7d7b5'], ['js/ocr-web.js', '438d309a960206e5'], ['js/ortofoto.js', '609d2a0b97d408e1'], ['js/overlays.js', 'f814e4fd0a6afdbd'], ['js/panorama.js', 'f65e219e930a4054'], ['js/pdf.js', '00baff5c76f89fb2'], ['js/raccordi.js', 'b43f1ab87300ee15'], ['js/raddrizza.js', '0b144e422e53717e'], ['js/recon.js', '1a1cbe13c824b975'], ['js/scene.js', 'ca4cd9c33a972575'], ['js/segnala.js', 'e7846b322e9c680f'], ['js/sketch.js', 'bc1f31eba24e8193'], ['js/storage.js', '25d164ad3f70acb2'], ['js/tools.js', 'fd4cc7a1a4a54092'], ['js/ui.js', 'a5aa83e08230fbab'], ['js/verifica.js', '945736ca7a199411'], ['ocr/det.onnx', 'a431985659dc9219'], ['ocr/ori.onnx', '94a6a0a0425f2b5f'], ['ocr/ort.wasm.min.js', 'e66568724f8848e5'], ['ocr/ort-wasm-simd-threaded.mjs', '745eb7c0ce6f18a6'], ['ocr/ort-wasm-simd-threaded.wasm', '207d02be4591c156'], ['ocr/rec.onnx', '7888113072263cb4'], ['ocr/rec_dict.txt', 'ccbcc45730b3fbbd']];                       // [[percorso, impronta], …]
const CACHE = 'rilsin-file';
const BASE = new URL('./', self.location).href;
const IMPRONTA = new Map(FILE);
const chiave = (p, h) => BASE + p + '?h=' + h;
const percorso = url => {
  const u = new URL(url), b = new URL(BASE);
  if (u.origin !== b.origin || u.pathname.indexOf(b.pathname) !== 0) return null;
  return u.pathname.slice(b.pathname.length) || 'index.html';
};
const impronta = async res => {
  const d = await crypto.subtle.digest('SHA-256', await res.clone().arrayBuffer());
  return Array.from(new Uint8Array(d)).map(x => x.toString(16).padStart(2, '0')).join('').slice(0, 16);
};

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    // memorie delle versioni di prima (una per versione): da lì si riprendono i file identici
    const vecchie = (await caches.keys()).filter(k => k.indexOf('rilsin-') === 0 && k !== CACHE);
    const metti = async (k, r) => {
      try { await c.put(k, r.clone()); }
      catch (err) {
        // spazio finito (iPhone): si libera la copia della versione vecchia e si riprova
        for (const n of vecchie) await caches.delete(n);
        vecchie.length = 0;
        await c.put(k, r);
      }
    };
    for (const [p, h] of FILE) {
      const k = chiave(p, h);
      if (await c.match(k)) continue;                          // già scaricato con un aggiornamento precedente
      let r = null;
      for (const n of vecchie) {                               // identico nella versione di prima: niente download
        const x = await (await caches.open(n)).match(BASE + p, { ignoreSearch: true });
        if (x && x.ok && await impronta(x) === h) { r = x; break; }
      }
      if (!r) { r = await fetch(k, { cache: 'no-cache' }); if (!r.ok) throw new Error(p + ': ' + r.status); }
      await metti(k, r);
    }
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    // restano solo i file di questa versione; le memorie per versione delle build precedenti si tolgono
    const tieni = new Set(FILE.map(([p, h]) => chiave(p, h)));
    const c = await caches.open(CACHE);
    for (const req of await c.keys()) if (!tieni.has(req.url)) await c.delete(req);
    for (const n of await caches.keys()) if (n.indexOf('rilsin-') === 0 && n !== CACHE) await caches.delete(n);
    await self.clients.claim();
  })());
});

// l'app chiede di passare alla versione nuova solo quando l'operatore preme «Aggiorna ora»;
// «versione» risponde con la versione di questo service worker (per le Informazioni)
self.addEventListener('message', e => {
  if (e.data === 'aggiorna') self.skipWaiting();
  else if (e.data === 'versione' && e.source) e.source.postMessage({ versione: VERSIONE });
});

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const p = percorso(r.url);
  if (p == null) return;                                      // siti esterni: sempre dalla rete
  // l'app si apre subito, anche senza rete; un file dell'app aperto da solo (la guida PDF) resta quel file
  const pp = (r.mode === 'navigate' && !IMPRONTA.has(p)) ? 'index.html' : p;
  const h = IMPRONTA.get(pp);
  if (!h) return;                                             // non è un file dell'app: rete
  e.respondWith(caches.open(CACHE).then(c => c.match(chiave(pp, h))).then(x => x || fetch(r)));
});

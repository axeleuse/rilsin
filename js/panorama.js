(function (RS) {
'use strict';
const GUIDA = 'pano';
const el = id => document.getElementById(id);
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const MAX_LATO = 4096;
function leggiGPano(buf) {
try {
const n = Math.min(buf.byteLength, 1 << 20), u8 = new Uint8Array(buf, 0, n);
let t = ''; for (let i = 0; i < n; i += 8192) t += String.fromCharCode.apply(null, u8.subarray(i, Math.min(n, i + 8192)));
if (t.indexOf('GPano') < 0) return null;
const v = k => { const m = new RegExp('GPano:' + k + '\\s*=\\s*"([^"]*)"').exec(t) || new RegExp('<GPano:' + k + '>([^<]*)<').exec(t); return m ? parseFloat(m[1]) : NaN; };
const fw = v('FullPanoWidthPixels'), fh = v('FullPanoHeightPixels'), cw = v('CroppedAreaImageWidthPixels'), ch = v('CroppedAreaImageHeightPixels'),
cl = v('CroppedAreaLeftPixels'), ct = v('CroppedAreaTopPixels'), hd = v('PoseHeadingDegrees');
const o = { heading: isFinite(hd) ? hd : null };
if (fw > 0 && fh > 0 && cw > 0 && ch > 0) Object.assign(o, { u0: (cl || 0) / fw, uw: cw / fw, v0: (ct || 0) / fh, vh: ch / fh });
return o;
} catch (e) { return null; }
}
function prepara(file) {
return new Promise((ok, ko) => {
const fr = new FileReader();
fr.onerror = () => ko(new Error('file non leggibile'));
fr.onload = () => {
const gp = leggiGPano(fr.result), url = URL.createObjectURL(file), img = new Image();
img.onerror = () => { URL.revokeObjectURL(url); ko(new Error('immagine non leggibile')); };
img.onload = () => {
const w0 = img.naturalWidth, h0 = img.naturalHeight, k = Math.min(1, MAX_LATO / Math.max(w0, h0)), w = Math.round(w0 * k), h = Math.round(h0 * k);
const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
cv.getContext('2d').drawImage(img, 0, 0, w, h);
URL.revokeObjectURL(url);
let src; try { src = cv.toDataURL('image/jpeg', 0.85); } catch (e) { ko(e); return; }
ok({ src, w, h, gp });
};
img.src = url;
};
fr.readAsArrayBuffer(file);
});
}
function copertura(p) {
if (p.gp && p.gp.uw) return Promise.resolve({ u0: p.gp.u0, uw: p.gp.uw, v0: p.gp.v0, vh: p.gp.vh });
const r = p.w / p.h;
if (Math.abs(r - 2) < 0.06) return Promise.resolve({ u0: 0, uw: 1, v0: 0, vh: 1 });
const striscia = gradi => { const vg = Math.min(170, gradi / r); return { u0: 0.5 - gradi / 720, uw: gradi / 360, v0: 0.5 - vg / 360, vh: vg / 180 }; };
if (r < 1.6) return Promise.resolve(striscia(Math.min(150, 50 * r)));
return RS.ui.scelta({
titolo: 'Quanto è ampio il panorama?',
testo: 'Non è una foto sferica a 360° (quelle sono larghe il doppio dell\'altezza): è un panorama «a striscia» del telefono. Scegli quanto giro hai fatto riprendendolo.',
opzioni: [
{ k: '360', t: 'Giro completo (360°)', d: 'Sei tornato al punto di partenza', primario: r >= 5 },
{ k: '240', t: 'Circa due terzi di giro (240°)', d: 'Il massimo del panorama di iPhone', primario: r >= 3 && r < 5 },
{ k: '180', t: 'Mezzo giro (180°)', primario: r < 3 },
{ k: '120', t: 'Un terzo di giro (120°)' }
]
}).then(k => k ? striscia(+k) : null);
}
const prossimoN = () => RS.scene.elements.reduce((m, e) => e.type === 'panorama' && e.n > m ? e.n : m, 0) + 1;
const tutte = () => RS.scene.elements.filter(e => e.type === 'panorama').sort((a, b) => (a.n || 0) - (b.n || 0));
function rotDaNord(heading) {
if (heading == null) return 0;
const nord = RS.scene.elements.find(e => e.type === 'north'), rn = nord ? (nord.rot || 0) : 0;
return Math.round(((-90 + rn + heading) % 360 + 360) % 360);
}
function verso(g) {
const nord = RS.scene.elements.find(e => e.type === 'north'); if (!nord) return '';
const b = ((g - (-90 + (nord.rot || 0))) % 360 + 360) % 360;
return ['Nord', 'Nord-Est', 'Est', 'Sud-Est', 'Sud', 'Sud-Ovest', 'Ovest', 'Nord-Ovest'][Math.round(b / 45) % 8];
}
function sceltaFile() {
return new Promise(ok => {
const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.hidden = true;
inp.onchange = () => { const f = inp.files && inp.files[0]; inp.remove(); ok(f || null); };
document.body.appendChild(inp); inp.click();
});
}
async function daFile(file) {
const U = RS.ui;
U.toast('Preparo la panoramica…', 8000);
const p = await prepara(file);
const c = await copertura(p);
if (!c) return null;
return { src: p.src, crop: c, heading: p.gp ? p.gp.heading : null };
}
const VS = 'attribute vec2 p;varying vec2 q;void main(){q=p;gl_Position=vec4(p,0.,1.);}';
const FS = 'precision highp float;uniform sampler2D tex;uniform float yaw,pitch,fy,asp;uniform vec4 crop;varying vec2 q;' +
'void main(){float t=tan(fy*.5);vec3 d=normalize(vec3(q.x*t*asp,q.y*t,1.));' +
'float cp=cos(pitch),sp=sin(pitch);d=vec3(d.x,d.y*cp+d.z*sp,-d.y*sp+d.z*cp);' +
'float cy=cos(yaw),sy=sin(yaw);d=vec3(d.x*cy+d.z*sy,d.y,-d.x*sy+d.z*cy);' +
'float lon=atan(d.x,d.z),lat=asin(clamp(d.y,-1.,1.));float u=lon/6.2831853+.5,v=.5-lat/3.1415927;' +
'float s=u-crop.x;s=s-floor(s);s=s/crop.y;float w=(v-crop.z)/crop.w;' +
'if(s>1.||w<0.||w>1.){gl_FragColor=vec4(.11,.12,.14,1.);return;}gl_FragColor=texture2D(tex,vec2(s,w));}';
function programma(gl) {
const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
gl.useProgram(pr);
const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
const a = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
const u = {}; ['tex', 'yaw', 'pitch', 'fy', 'asp', 'crop'].forEach(k => { u[k] = gl.getUniformLocation(pr, k); });
return u;
}
const RAD = Math.PI / 180;
const P = {
GUIDA,
tutte,
daFile,
leggiGPano,
async comando() {
const l = tutte(), U = RS.ui;
if (!l.length) return this.nuova();
const k = await U.scelta({ titolo: '🌐 Panoramiche a 360°', testo: 'Toccane una per guardarla, oppure aggiungine una nuova.',
opzioni: l.map(e => ({ k: e.id, t: '🌐 P' + e.n + (e.descr ? ' — ' + e.descr : ''), d: 'Apri la panoramica' }))
.concat([{ k: '+', t: '➕ Nuova panoramica', d: 'Scegli la foto a 360° o il panorama del telefono', primario: true }]) });
if (!k) return;
if (k === '+') return this.nuova();
const e = RS.scene.get(k); if (e) { RS.scene.select([e.id]); this.apri(e); }
},
async nuova() {
const U = RS.ui;
const scelta = await U.scelta({ titolo: '🌐 Nuova panoramica', html:
'<p class="scelta-testo">Scegli la foto a 360° della scena, già fatta con il telefono o con una fotocamera a 360°:</p>' +
'<ul class="pano-come"><li><b>Fotocamera a 360°</b>: la foto esportata nel telefono.</li>' +
'<li><b>Android</b>: «Photo Sphere» o «Panorama» della fotocamera (o un\'app gratuita per foto sferiche).</li>' +
'<li><b>iPhone</b>: «Pano» della fotocamera (un giro fino a 240°).</li></ul>' +
'<p class="scelta-testo" style="font-size:12px;opacity:.8">Fai la ripresa in piedi nel punto scelto, girando su te stesso senza spostarti. Resta solo nel dispositivo e nel file della tavola, come le altre foto.</p>',
opzioni: [{ k: 'file', t: '🖼 Scegli la panoramica', d: 'dalla galleria o dai file', primario: true }] });
if (scelta !== 'file') return;
const f = await sceltaFile(); if (!f) return;
let d; try { d = await daFile(f); } catch (e) { U.toast('Non riesco a leggere questa immagine', 4000); return; }
if (!d) return;
this._inAttesa = d;
RS.tools.setTool({ mode: 'placeTool', tool: 'panorama', def: {} });
U.toast('Tocca sulla tavola il punto da cui hai fatto la panoramica', 6000);
},
piazza(p) {
const d = this._inAttesa; this._inAttesa = null;
if (!d) return null;
const F = RS.fascicolo, n = prossimoN();
const fotoId = F.aggiungiDocumento(d.src, 'Panoramica P' + n, GUIDA);
const e = RS.scene.add({ type: 'panorama', x: +p.x.toFixed(2), y: +p.y.toFixed(2), rot: rotDaNord(d.heading), n, descr: '', fotoId, crop: d.crop, size: 1.1 });
RS.scene.select([e.id]);
RS.ui.toast('🌐 Panoramica P' + n + ' sulla tavola: giro lo spicchio verso dove guarda il centro della foto', 5000);
setTimeout(() => this.apri(e), 400);
return e;
},
async sostituisci(e) {
if (!e) return;
const f = await sceltaFile(); if (!f) return;
let d; try { d = await daFile(f); } catch (er) { RS.ui.toast('Non riesco a leggere questa immagine', 4000); return; }
if (!d) return;
const F = RS.fascicolo, vecchia = e.fotoId;
e.fotoId = F.aggiungiDocumento(d.src, 'Panoramica P' + e.n, GUIDA); e.crop = d.crop;
if (d.heading != null) e.rot = rotDaNord(d.heading);
if (vecchia) F.togliDocumento(vecchia);
RS.scene.render(); RS.scene.snapshot(); RS.ui.renderProps();
RS.ui.toast('Panoramica P' + e.n + ' sostituita', 2500);
},
immagine(e) {
const F = RS.fascicolo, p = (F.documenti(GUIDA) || []).find(x => x.id === e.fotoId);
if (p && p.src) return Promise.resolve(p.src);
return F.fotoComplete([e.fotoId]).then(m => m.get(e.fotoId) || '');
},
async apri(e) {
if (!e || e.type !== 'panorama') return;
const U = RS.ui, src = await this.immagine(e);
if (!src) { U.toast('L\'immagine di questa panoramica non è in questo dispositivo: usa «Sostituisci»', 5000); return; }
this.chiudi();
const ov = document.createElement('div'); ov.id = 'panoViewer'; ov.className = 'pano-ov';
ov.innerHTML = `<canvas class="pano-tela"></canvas>
        <div class="pano-top"><div class="pano-tit"><b>🌐 Panoramica P${e.n}</b><span>${esc(e.descr || '')}</span></div>
          <button class="pano-b" data-pv="chiudi" aria-label="Chiudi">✕</button></div>
        <div class="pano-dir" id="panoDir"></div>
        <div class="pano-bot">
          <button class="pano-b" data-pv="meno" aria-label="Allontana">−</button>
          <button class="pano-b" data-pv="piu" aria-label="Avvicina">+</button>
          <button class="pano-b pano-pri" data-pv="estrai">📷 Aggiungi questa vista al fascicolo</button>
        </div>`;
document.body.appendChild(ov);
const cv = ov.querySelector('canvas');
const gl = cv.getContext('webgl', { preserveDrawingBuffer: true, antialias: false }) || cv.getContext('experimental-webgl', { preserveDrawingBuffer: true });
const c0 = e.crop || { u0: 0, uw: 1 };
const st = this._v = { e, ov, cv, gl, yaw: (c0.u0 + c0.uw / 2 - .5) * 360 * RAD, pitch: 0,
fov: window.innerHeight > window.innerWidth ? 95 : 75, punti: new Map() };
if (!gl) {
cv.remove();
const box = document.createElement('div'); box.className = 'pano-piatta'; box.innerHTML = `<img src="${src}" alt="">`;
ov.insertBefore(box, ov.firstChild); ov.querySelector('[data-pv="estrai"]').remove(); ov.querySelectorAll('[data-pv="piu"],[data-pv="meno"]').forEach(b => b.remove());
} else {
try { st.u = programma(gl); } catch (er) { U.toast('Il visore non parte su questo dispositivo', 4000); this.chiudi(); return; }
const img = new Image();
img.onload = () => {
if (this._v !== st) return;
const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
st.pronta = true; this._disegna();
};
img.src = src;
this._gesti(st);
}
ov.addEventListener('click', ev => {
const b = ev.target.closest('[data-pv]'); if (!b) return;
const k = b.dataset.pv;
if (k === 'chiudi') this.chiudi();
else if (k === 'piu') { st.fov = Math.max(25, st.fov / 1.25); this._disegna(); }
else if (k === 'meno') { st.fov = Math.min(110, st.fov * 1.25); this._disegna(); }
else if (k === 'estrai') this.estrai();
});
st.tasti = ev => {
if (ev.key === 'Escape') { this.chiudi(); return; }
const passo = { ArrowLeft: [-5, 0], ArrowRight: [5, 0], ArrowUp: [0, 4], ArrowDown: [0, -4] }[ev.key];
if (passo) { st.yaw += passo[0] * RAD; st.pitch += passo[1] * RAD; this._disegna(); ev.preventDefault(); }
if (ev.key === '+') { st.fov = Math.max(25, st.fov / 1.15); this._disegna(); }
if (ev.key === '-') { st.fov = Math.min(110, st.fov * 1.15); this._disegna(); }
};
window.addEventListener('keydown', st.tasti);
st.ridim = () => this._disegna(); window.addEventListener('resize', st.ridim);
this._disegna();
if (RS.ui.vibra) RS.ui.vibra(20);
},
chiudi() {
const st = this._v; this._v = null;
if (!st) { const o = el('panoViewer'); if (o) o.remove(); return; }
window.removeEventListener('keydown', st.tasti); window.removeEventListener('resize', st.ridim);
try { const x = st.gl && st.gl.getExtension('WEBGL_lose_context'); if (x) x.loseContext(); } catch (e) {}
st.ov.remove();
},
_gesti(st) {
const cv = st.cv;
cv.addEventListener('pointerdown', ev => { try { cv.setPointerCapture(ev.pointerId); } catch (e) {} st.punti.set(ev.pointerId, { x: ev.clientX, y: ev.clientY }); st.pinch = null; });
cv.addEventListener('pointermove', ev => {
const pr = st.punti.get(ev.pointerId); if (!pr) return;
const ora = { x: ev.clientX, y: ev.clientY };
if (st.punti.size === 1) {
const k = st.fov * RAD / (cv.clientHeight || 1);
st.yaw -= (ora.x - pr.x) * k; st.pitch += (ora.y - pr.y) * k;
} else if (st.punti.size === 2) {
st.punti.set(ev.pointerId, ora);
const [a, b] = [...st.punti.values()], d = Math.hypot(b.x - a.x, b.y - a.y);
if (st.pinch) st.fov = Math.max(25, Math.min(110, st.fov * st.pinch / d));
st.pinch = d;
}
st.punti.set(ev.pointerId, ora); this._disegna(); ev.preventDefault();
});
const su = ev => { st.punti.delete(ev.pointerId); st.pinch = null; };
cv.addEventListener('pointerup', su); cv.addEventListener('pointercancel', su);
cv.addEventListener('wheel', ev => { st.fov = Math.max(25, Math.min(110, st.fov * (ev.deltaY > 0 ? 1.1 : 1 / 1.1))); this._disegna(); ev.preventDefault(); }, { passive: false });
},
_disegna(lw, lh) {
const st = this._v; if (!st || !st.gl) return;
const gl = st.gl, cv = st.cv, dpr = Math.min(2, window.devicePixelRatio || 1);
const w = lw || Math.round(cv.clientWidth * dpr), h = lh || Math.round(cv.clientHeight * dpr);
if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
const c = st.e.crop || { u0: 0, uw: 1, v0: 0, vh: 1 };
if (c.vh < .999) st.fov = Math.min(st.fov, Math.max(25, c.vh * 180 * .98));
const latMax = (0.5 - c.v0) * 180, latMin = (0.5 - c.v0 - c.vh) * 180, mezza = st.fov / 2;
const su = Math.min(89, latMax - mezza), giu = Math.max(-89, latMin + mezza);
st.pitch = Math.max(Math.min(giu, su) * RAD, Math.min(Math.max(giu, su) * RAD, st.pitch));
if (su < giu) st.pitch = (latMax + latMin) / 2 * RAD;
if (c.uw < 0.999) {
const oriz = Math.atan(Math.tan(mezza * RAD) * w / h) / RAD, centro = (c.u0 + c.uw / 2 - .5) * 360, mx = Math.max(0, c.uw * 180 - oriz);
st.yaw = Math.max((centro - mx) * RAD, Math.min((centro + mx) * RAD, st.yaw));
}
gl.viewport(0, 0, w, h);
if (st.pronta) {
gl.uniform1i(st.u.tex, 0); gl.uniform1f(st.u.yaw, st.yaw); gl.uniform1f(st.u.pitch, st.pitch);
gl.uniform1f(st.u.fy, st.fov * RAD); gl.uniform1f(st.u.asp, w / h); gl.uniform4f(st.u.crop, c.u0, c.uw, c.v0, c.vh);
gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
} else { gl.clearColor(.11, .12, .14, 1); gl.clear(gl.COLOR_BUFFER_BIT); }
const d = el('panoDir');
if (d) { const v = verso(this.direzione()); d.textContent = v ? 'Guardi verso ' + v : ''; d.hidden = !v; }
},
direzione() { const st = this._v; return st ? ((st.e.rot || 0) + st.yaw / RAD) : 0; },
estrai() {
const st = this._v; if (!st || !st.pronta) return;
const e = st.e, cv = st.cv, ww = cv.width, hh = cv.height;
const L = 1600, H = Math.round(L * Math.min(1.25, Math.max(.56, hh / ww)));
this._disegna(L, H);
let src; try { src = cv.toDataURL('image/jpeg', 0.9); } catch (er) { src = ''; }
cv.width = ww; cv.height = hh; this._disegna();
if (!src) { RS.ui.toast('Vista non salvata', 3000); return; }
const v = verso(this.direzione());
const descr = 'Vista dalla panoramica P' + e.n + (e.descr ? ' (' + e.descr + ')' : '') + (v ? ', verso ' + v : '');
RS.fascicolo.aggiungiFoto(src, descr);
RS.ui.toast('✓ Vista aggiunta al fascicolo fotografico: «' + descr + '»', 4000);
if (RS.ui.vibra) RS.ui.vibra(30);
}
};
RS.panorama = P;
})(window.RS = window.RS || {});

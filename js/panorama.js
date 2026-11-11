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
const BERSAGLI = (() => { const o = []; for (let k = 0; k < 16; k++) o.push({ yaw: k * 22.5, pitch: 0, riga: 0 }); for (let k = 0; k < 8; k++) o.push({ yaw: k * 45 + 22.5, pitch: -40, riga: 1 }); return o; })();
const SLOT_W = 432;
function matrice(a, b, g) {
const A = a * RAD, B = b * RAD, G = g * RAD, cA = Math.cos(A), sA = Math.sin(A), cB = Math.cos(B), sB = Math.sin(B), cG = Math.cos(G), sG = Math.sin(G);
return [[cA * cG - sA * sB * sG, -cB * sA, cG * sA * sB + cA * sG], [cG * sA + cA * sB * sG, cA * cB, sA * sG - cA * cG * sB], [-cB * sG, sB, cB * cG]];
}
const per = (M, v) => [M[0][0] * v[0] + M[0][1] * v[1] + M[0][2] * v[2], M[1][0] * v[0] + M[1][1] * v[1] + M[1][2] * v[2], M[2][0] * v[0] + M[2][1] * v[1] + M[2][2] * v[2]];
const pv = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const vett = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
function assi(o) {
const M = matrice(o.a, o.b, o.g), s = (o.ang || 0) * RAD;
return { destra: per(M, [Math.cos(s), -Math.sin(s), 0]), su: per(M, [Math.sin(s), Math.cos(s), 0]), avanti: per(M, [0, 0, -1]) };
}
const yawDi = v => Math.atan2(v[0], v[1]) / RAD;
const pitchDi = v => Math.asin(Math.max(-1, Math.min(1, v[2]))) / RAD;
const dirDa = (yaw, pitch) => [Math.cos(pitch * RAD) * Math.sin(yaw * RAD), Math.cos(pitch * RAD) * Math.cos(yaw * RAD), Math.sin(pitch * RAD)];
const angTra = (u, v) => Math.acos(Math.max(-1, Math.min(1, pv(u, v)))) / RAD;
function quat(m) {
const tr = m[0][0] + m[1][1] + m[2][2]; let w, x, y, z, s;
if (tr > 0) { s = Math.sqrt(tr + 1) * 2; w = .25 * s; x = (m[2][1] - m[1][2]) / s; y = (m[0][2] - m[2][0]) / s; z = (m[1][0] - m[0][1]) / s; }
else if (m[0][0] > m[1][1] && m[0][0] > m[2][2]) { s = Math.sqrt(1 + m[0][0] - m[1][1] - m[2][2]) * 2; w = (m[2][1] - m[1][2]) / s; x = .25 * s; y = (m[0][1] + m[1][0]) / s; z = (m[0][2] + m[2][0]) / s; }
else if (m[1][1] > m[2][2]) { s = Math.sqrt(1 + m[1][1] - m[0][0] - m[2][2]) * 2; w = (m[0][2] - m[2][0]) / s; x = (m[0][1] + m[1][0]) / s; y = .25 * s; z = (m[1][2] + m[2][1]) / s; }
else { s = Math.sqrt(1 + m[2][2] - m[0][0] - m[1][1]) * 2; w = (m[1][0] - m[0][1]) / s; x = (m[0][2] + m[2][0]) / s; y = (m[1][2] + m[2][1]) / s; z = .25 * s; }
return [x, y, z, w];
}
function grigia(cv, w) {
const h = Math.round(w * cv.height / cv.width), c = document.createElement('canvas'); c.width = w; c.height = h;
const x = c.getContext('2d'); x.drawImage(cv, 0, 0, w, h);
const d = x.getImageData(0, 0, w, h).data, px = new Float32Array(w * h);
for (let i = 0; i < w * h; i++) px[i] = d[i * 4] * .3 + d[i * 4 + 1] * .59 + d[i * 4 + 2] * .11;
return { w, h, px };
}
function confronta(A, B) {
const a = A.gr, b = B.gr, d = ((B.yaw - A.yaw) % 360 + 360) % 360;
if (d < 10 || d > 40) return null;
let best = null;
for (let fov = 28; fov <= 80; fov += 1) {
const ppg = a.w / fov, s = Math.round(d * ppg), dy = Math.round((B.pitch - A.pitch) * ppg);
if (s < 4 || a.w - s < 10) continue;
let sa = 0, sb = 0, saa = 0, sbb = 0, sab = 0, n = 0;
for (let y = 4; y < a.h - 4; y += 2) {
const yb = y + dy; if (yb < 0 || yb >= b.h) continue;
for (let x = s; x < a.w; x++) { const va = a.px[y * a.w + x], vb = b.px[yb * b.w + x - s]; sa += va; sb += vb; saa += va * va; sbb += vb * vb; sab += va * vb; n++; }
}
if (n < 200) continue;
const ma = sa / n, mb = sb / n, va = saa / n - ma * ma, vb = sbb / n - mb * mb;
if (va < 20 || vb < 20) continue;
const ncc = (sab / n - ma * mb) / Math.sqrt(va * vb);
if (!best || ncc > best.ncc) best = { ncc, fov };
}
return best && best.ncc > .55 ? best.fov : null;
}
function stimaFov(scatti, base) {
const or = scatti.filter(s => s.riga === 0).sort((x, y) => x.yaw - y.yaw), st = [];
for (let i = 0; i < or.length; i++) { const f = confronta(or[i], or[(i + 1) % or.length]); if (f) st.push(f); }
if (st.length < 2) return base;
st.sort((x, y) => x - y); return st[st.length >> 1];
}
const FS_UNIONE = 'precision highp float;uniform sampler2D atlas;uniform vec4 q[24];uniform vec4 slot[24];uniform int n;uniform float tx,ty,latT,latB;varying vec2 q0;' +
'vec3 ruota(vec4 r,vec3 v){vec3 t=2.*cross(r.xyz,v);return v+r.w*t+cross(r.xyz,t);}' +
'void main(){vec2 uv=q0*.5+.5;float lon=(uv.x-.5)*6.2831853,lat=mix(latB,latT,uv.y);' +
'vec3 d=vec3(cos(lat)*sin(lon),sin(lat),cos(lat)*cos(lon));vec3 acc=vec3(0.);float ws=0.;' +
'for(int i=0;i<24;i++){if(i>=n)break;vec3 c=ruota(q[i],d);if(c.z<=.02)continue;float nx=c.x/c.z/tx,ny=c.y/c.z/ty;' +
'if(abs(nx)>=1.||abs(ny)>=1.)continue;float w=(1.-nx*nx)*(1.-ny*ny);w*=w;' +
'vec2 t=slot[i].xy+vec2((nx*.5+.5)*slot[i].z,(.5-ny*.5)*slot[i].w);acc+=texture2D(atlas,t).rgb*w;ws+=w;}' +
'gl_FragColor=ws>0.?vec4(acc/ws,1.):vec4(.42,.43,.45,1.);}';
function unisci(r) {
const hf = r.hfov, tx = Math.tan(hf / 2 * RAD), ty = tx * r.slotH / SLOT_W, vf = 2 * Math.atan(ty) / RAD;
const r0 = r.scatti.filter(s => s.riga === 0), r1 = r.scatti.filter(s => s.riga === 1), alto = r0.length ? r0 : r.scatti, basso = r1.length >= 3 ? r1 : alto;
const top = Math.min(89.9, Math.min(...alto.map(s => s.pitch + vf / 2)) - 1), bot = Math.max(-89.9, Math.max(...basso.map(s => s.pitch - vf / 2)) + 1);
const W = 4096, H = Math.max(256, Math.round(W * (top - bot) / 360));
const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
const gl = cv.getContext('webgl', { preserveDrawingBuffer: true }) || cv.getContext('experimental-webgl', { preserveDrawingBuffer: true });
if (!gl) throw new Error('scheda grafica non disponibile');
const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, 'attribute vec2 p;varying vec2 q0;void main(){q0=p;gl_Position=vec4(p,0.,1.);}')); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS_UNIONE));
gl.linkProgram(pr); if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr)); gl.useProgram(pr);
const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
const ap = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(ap); gl.vertexAttribPointer(ap, 2, gl.FLOAT, false, 0, 0);
const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
[[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]].forEach(([k, v]) => gl.texParameteri(gl.TEXTURE_2D, k, v));
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, r.atlante);
const F = dirDa(r.yaw0, 0), Uv = [0, 0, 1], Rt = vett(F, Uv);
const qs = [], sl = [];
r.scatti.forEach(s => {
const m = [s.assi.destra, s.assi.su, s.assi.avanti].map(riga => [pv(riga, Rt), pv(riga, Uv), pv(riga, F)]);
qs.push(...quat(m));
const c = s.slot % r.col, rr = Math.floor(s.slot / r.col);
sl.push(c * SLOT_W / r.atlante.width, rr * r.slotH / r.atlante.height, SLOT_W / r.atlante.width, r.slotH / r.atlante.height);
});
const u = k => gl.getUniformLocation(pr, k);
gl.uniform1i(u('atlas'), 0); gl.uniform4fv(u('q'), new Float32Array(qs)); gl.uniform4fv(u('slot'), new Float32Array(sl)); gl.uniform1i(u('n'), r.scatti.length);
gl.uniform1f(u('tx'), tx); gl.uniform1f(u('ty'), ty); gl.uniform1f(u('latT'), top * RAD); gl.uniform1f(u('latB'), bot * RAD);
gl.viewport(0, 0, W, H); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
const src = cv.toDataURL('image/jpeg', 0.88);
try { const x = gl.getExtension('WEBGL_lose_context'); if (x) x.loseContext(); } catch (e) {}
return { src, crop: { u0: 0, uw: 1, v0: (90 - top) / 180, vh: (top - bot) / 180 } };
}
const P = {
GUIDA,
BERSAGLI, matrice, assi, quat, unisci, stimaFov,
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
const puo = this.ripresaPossibile();
const scelta = await U.scelta({ titolo: '🌐 Nuova panoramica', html:
'<p class="scelta-testo">In piedi nel punto scelto (per esempio dove era il conducente), girando su te stesso senza spostarti.</p>' +
(puo ? '<p class="scelta-testo"><b>Riprendi ora</b>: RILSIN apre la fotocamera e ti guida con dei pallini da centrare; scatta da solo e unisce le foto (circa un minuto).</p>' : '') +
'<p class="scelta-testo">Oppure scegli una panoramica già fatta:</p>' +
'<ul class="pano-come"><li><b>Fotocamera a 360°</b>: la foto esportata nel telefono (la qualità migliore).</li>' +
'<li><b>Android</b>: «Photo Sphere» o «Panorama» della fotocamera.</li>' +
'<li><b>iPhone</b>: «Pano» della fotocamera (fino a 240°).</li></ul>' +
'<p class="scelta-testo" style="font-size:12px;opacity:.8">Resta solo nel dispositivo e nel file della tavola, come le altre foto.</p>',
opzioni: (puo ? [{ k: 'ripresa', t: '📸 Riprendi ora con RILSIN', d: 'ripresa guidata, scatti automatici', primario: true }] : [])
.concat([{ k: 'file', t: '🖼 Scegli una panoramica già fatta', d: 'dalla galleria o dai file', primario: !puo }]) });
if (scelta === 'ripresa') { this.riprendi(); return; }
if (scelta !== 'file') return;
const f = await sceltaFile(); if (!f) return;
let d; try { d = await daFile(f); } catch (e) { U.toast('Non riesco a leggere questa immagine', 4000); return; }
if (!d) return;
this._inAttesa = d;
RS.tools.setTool({ mode: 'placeTool', tool: 'panorama', def: {} });
U.toast('Tocca sulla tavola il punto da cui hai fatto la panoramica', 6000);
},
ripresaPossibile() { return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && 'DeviceOrientationEvent' in window); },
riprendi() {
this.chiudiRipresa();
const ov = document.createElement('div'); ov.id = 'panoRipresa'; ov.className = 'pr-ov';
ov.innerHTML = `<video class="pr-video" playsinline muted autoplay></video><canvas class="pr-guida"></canvas>
        <div class="pr-mira"></div><div class="pr-flash"></div>
        <div class="pr-top"><div class="pr-tit"><b>🌐 Ripresa a 360°</b><span id="prStato">In piedi nel punto scelto</span></div>
          <button class="pano-b" data-pr="annulla" aria-label="Annulla">✕</button></div>
        <div class="pr-msg" id="prMsg">Tieni il telefono in verticale, all'altezza degli occhi. Gira su te stesso senza spostarti: i piedi restano fermi.</div>
        <div class="pr-bot"><button class="pano-b pano-pri" data-pr="inizia">▶ Inizia la ripresa</button><button class="pano-b" data-pr="fine" hidden>✓ Fine</button></div>`;
document.body.appendChild(ov);
const r = this._r = { ov, video: ov.querySelector('video'), guida: ov.querySelector('.pr-guida'), scatti: [], fatti: new Set(), hfov: 42, storia: [], o: null, oAss: null };
ov.addEventListener('click', ev => {
const b = ev.target.closest('[data-pr]'); if (!b) return;
if (b.dataset.pr === 'annulla') this.chiudiRipresa();
else if (b.dataset.pr === 'inizia') this._inizia(b);
else if (b.dataset.pr === 'fine') this._fine();
});
},
async _inizia(btn) {
const r = this._r; if (!r) return;
const msg = t => { const m = el('prMsg'); if (m) m.textContent = t; };
btn.disabled = true;
try {
if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function') {
try { r.permessoSensori = await DeviceOrientationEvent.requestPermission(); } catch (e) { r.permessoSensori = 'errore'; }
}
r.stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } } });
} catch (e) {
msg('La fotocamera non si apre (' + (e && e.name === 'NotAllowedError' ? 'permesso negato' : (e && e.message) || 'non disponibile') + '). Puoi sempre scegliere una panoramica già fatta.');
btn.disabled = false; return;
}
if (this._r !== r) { r.stream.getTracks().forEach(t => t.stop()); return; }
r.video.srcObject = r.stream;
try { await r.video.play(); } catch (e) {}
r.suOr = ev => { if (ev.alpha == null && ev.beta == null) return; r.o = { a: ev.alpha || 0, b: ev.beta || 0, g: ev.gamma || 0, ang: (screen.orientation && screen.orientation.angle) || window.orientation || 0, t: performance.now() }; };
r.suAss = ev => { if (ev.absolute && ev.alpha != null) r.oAss = { a: ev.alpha, b: ev.beta || 0, g: ev.gamma || 0, ang: (screen.orientation && screen.orientation.angle) || window.orientation || 0 }; };
window.addEventListener('deviceorientation', r.suOr);
window.addEventListener('deviceorientationabsolute', r.suAss);
btn.hidden = true;
msg('Inquadra il pallino bianco al centro del cerchio: lo scatto parte da solo quando il telefono è fermo.');
r.avvio = performance.now();
const giro = () => { if (this._r !== r) return; this._passo(); r.raf = requestAnimationFrame(giro); };
r.raf = requestAnimationFrame(giro);
},
_passo() {
const r = this._r, v = r.video, cv = r.guida, W = r.ov.clientWidth, H = r.ov.clientHeight, dpr = window.devicePixelRatio || 1;
if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
const msg = t => { const m = el('prMsg'); if (m && m.textContent !== t) m.textContent = t; };
if (!r.o) {
if (performance.now() - r.avvio > 2500) msg(r.permessoSensori && r.permessoSensori !== 'granted'
? 'Senza i sensori di movimento la ripresa non si può guidare: consenti «Movimento e orientamento» (su iPhone: Impostazioni, Safari) e riprova.'
: 'Questo dispositivo non manda i sensori di movimento: la ripresa guidata funziona su telefoni e tablet. Scegli una panoramica già fatta.');
return;
}
if (!v.videoWidth) return;
const A = assi(r.o);
if (r.yaw0 == null) r.yaw0 = yawDi(A.avanti);
if (r.heading == null && r.oAss) { const aa = assi(r.oAss); r.heading = (((yawDi(aa.avanti) - (yawDi(A.avanti) - r.yaw0)) % 360) + 360) % 360; }
const ora = performance.now(); r.storia.push({ t: ora, v: A.avanti }); while (r.storia.length && ora - r.storia[0].t > 380) r.storia.shift();
const fermo = r.storia.length > 4 && r.storia.every(s => angTra(s.v, A.avanti) < .9);
const k = Math.max(W / v.videoWidth, H / v.videoHeight), f = (v.videoWidth / 2) / Math.tan(r.hfov / 2 * RAD) * k;
const proietta = d => { const z = pv(d, A.avanti); if (z <= .05) return null; return { x: W / 2 + f * pv(d, A.destra) / z, y: H / 2 - f * pv(d, A.su) / z }; };
let vicino = null;
BERSAGLI.forEach((b, i) => {
const d = dirDa(r.yaw0 + b.yaw, b.pitch), fatto = r.fatti.has(i), p = proietta(d), ang = angTra(d, A.avanti);
if (!fatto && (!vicino || ang < vicino.ang)) vicino = { i, b, d, ang, p };
if (!p || p.x < -40 || p.x > W + 40 || p.y < -40 || p.y > H + 40) return;
ctx.beginPath(); ctx.arc(p.x, p.y, fatto ? 7 : 13, 0, 2 * Math.PI);
ctx.fillStyle = fatto ? 'rgba(47,191,113,.85)' : 'rgba(255,255,255,.95)'; ctx.fill();
ctx.lineWidth = 3; ctx.strokeStyle = fatto ? 'rgba(0,0,0,.25)' : 'rgba(123,63,181,.95)'; ctx.stroke();
});
const n = r.fatti.size, stato = el('prStato'); if (stato) stato.textContent = n + ' di ' + BERSAGLI.length + ' foto';
const fine = r.ov.querySelector('[data-pr="fine"]'); if (fine) fine.hidden = n < 4;
if (!vicino) { this._fine(); return; }
const suAtteso = (() => { const d = vicino.d, upp = [0, 0, 1], x = vett(d, upp), y = vett(x, d), l = Math.hypot(...y) || 1; return y.map(c => c / l); })();
const storto = angTra(A.su, suAtteso) > 12;
if (vicino.ang < 5 && !storto && fermo && ora - (r.ultimo || 0) > 450) { this._scatta(vicino, A); return; }
if (storto) msg('Tieni il telefono dritto, in verticale');
else if (vicino.ang < 5) msg('Fermo… scatto');
else if (!vicino.p || vicino.p.x < 0 || vicino.p.x > W || vicino.p.y < 0 || vicino.p.y > H) {
const dy = vicino.b.pitch - pitchDi(A.avanti), dx = ((r.yaw0 + vicino.b.yaw - yawDi(A.avanti)) % 360 + 540) % 360 - 180;
msg(Math.abs(dy) > Math.abs(dx) * 1.2 ? (dy < 0 ? '⬇ Abbassa il telefono verso l\'asfalto' : '⬆ Alza il telefono') : (dx > 0 ? 'Gira a destra ➡' : '⬅ Gira a sinistra'));
} else msg('Porta il pallino bianco al centro del cerchio');
},
_scatta(vic, A) {
const r = this._r, v = r.video;
if (!r.atlante) {
r.slotH = Math.round(SLOT_W * v.videoHeight / v.videoWidth);
r.col = Math.max(1, Math.floor(4096 / SLOT_W));
const righe = Math.ceil(BERSAGLI.length / r.col);
r.atlante = document.createElement('canvas'); r.atlante.width = r.col * SLOT_W; r.atlante.height = righe * r.slotH;
}
const slot = r.scatti.length, c = slot % r.col, rr = Math.floor(slot / r.col);
const x = r.atlante.getContext('2d'); x.drawImage(v, c * SLOT_W, rr * r.slotH, SLOT_W, r.slotH);
const pezzo = document.createElement('canvas'); pezzo.width = SLOT_W; pezzo.height = r.slotH;
pezzo.getContext('2d').drawImage(r.atlante, c * SLOT_W, rr * r.slotH, SLOT_W, r.slotH, 0, 0, SLOT_W, r.slotH);
r.scatti.push({ slot, assi: { destra: A.destra.slice(), su: A.su.slice(), avanti: A.avanti.slice() }, yaw: yawDi(A.avanti), pitch: pitchDi(A.avanti), riga: vic.b.riga, gr: grigia(pezzo, 96) });
r.fatti.add(vic.i); r.ultimo = performance.now(); r.storia = [];
r.hfov = stimaFov(r.scatti, r.hfov);
const fl = r.ov.querySelector('.pr-flash'); if (fl) { fl.classList.remove('on'); void fl.offsetWidth; fl.classList.add('on'); }
if (RS.ui && RS.ui.vibra) RS.ui.vibra(25);
},
async _fine() {
const r = this._r; if (!r || r.finito) return;
if (r.scatti.length < 4) { this.chiudiRipresa(); return; }
r.finito = true; cancelAnimationFrame(r.raf);
const m = el('prMsg'); if (m) m.textContent = 'Unisco le foto…';
await new Promise(ok => setTimeout(ok, 60));
let esito;
try { esito = unisci(r); } catch (e) { RS.ui.toast('Unione delle foto non riuscita: ' + ((e && e.message) || e), 6000); this.chiudiRipresa(); return; }
const heading = r.heading != null ? r.heading : null;
this.chiudiRipresa();
this._inAttesa = { src: esito.src, crop: esito.crop, heading };
RS.tools.setTool({ mode: 'placeTool', tool: 'panorama', def: {} });
RS.ui.toast('🌐 Panoramica pronta (' + r.scatti.length + ' foto): tocca sulla tavola il punto in cui ti trovavi', 7000);
},
chiudiRipresa() {
const r = this._r; this._r = null;
if (!r) { const o = el('panoRipresa'); if (o) o.remove(); return; }
cancelAnimationFrame(r.raf);
if (r.stream) r.stream.getTracks().forEach(t => t.stop());
if (r.suOr) window.removeEventListener('deviceorientation', r.suOr);
if (r.suAss) window.removeEventListener('deviceorientationabsolute', r.suAss);
r.ov.remove();
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

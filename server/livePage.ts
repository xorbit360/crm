// Página pública y liviana del Live Selling (fuera del bundle del CRM).
// Se sirve como HTML autónomo: reproductor YouTube/Vimeo + overlay tipo
// TikTok Live, comentarios simulados/reales, checkout COD y WhatsApp.

export function renderLivePage(slug: string | null): string {
  const safeSlug = JSON.stringify(String(slug || '').slice(0, 120));
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Live</title>
<style>
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  html, body { margin:0; padding:0; height:100%; background:#000; color:#fff; font-family: system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif; overflow:hidden; }
  #player-wrap { position:fixed; inset:0; background:#000; overflow:hidden; }
  #player-wrap iframe, #player-wrap > div { position:absolute; top:50%; left:50%; width:100vw; height:56.25vw; min-width:177.78vh; min-height:100vh; transform:translate(-50%,-50%); border:0; pointer-events:none; }
  #tap-layer { position:fixed; inset:0; z-index:5; }
  .topbar { position:fixed; top:0; left:0; right:0; z-index:20; display:flex; align-items:flex-start; gap:8px; padding:10px 10px 0; pointer-events:none; }
  .pill { display:inline-flex; align-items:center; gap:6px; border-radius:999px; padding:6px 10px; font-size:12px; font-weight:600; line-height:1; }
  .pill-live { background:#e11d48; color:#fff; letter-spacing:.04em; }
  .pill-live .dot { width:7px; height:7px; border-radius:50%; background:#fff; animation:blink 1.2s infinite; }
  @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.25} }
  .pill-label { background:#e898db; color:#1f1025; max-width:46vw; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .pill-viewers { background:rgba(0,0,0,.45); color:#fff; }
  .pill-pre { background:rgba(0,0,0,.45); color:#fde68a; font-weight:500; }
  .top-right { margin-left:auto; display:flex; flex-direction:column; align-items:flex-end; gap:6px; }
  #btn-sound { border:0; border-radius:999px; background:rgba(0,0,0,.55); color:#fff; font-size:12px; font-weight:700; padding:6px 11px; cursor:pointer; pointer-events:auto; align-items:center; justify-content:center; }
  #btn-unmute-big { position:fixed; left:50%; top:42%; transform:translate(-50%,-50%); z-index:30; border:0; border-radius:999px; background:rgba(0,0,0,.65); color:#fff; padding:14px 22px; font-size:16px; font-weight:700; cursor:pointer; display:none; }
  #comments { position:fixed; left:10px; right:10px; bottom:158px; z-index:15; height:205px; overflow:hidden; display:flex; flex-direction:column; justify-content:flex-end; gap:8px; -webkit-mask-image:linear-gradient(to bottom, transparent, #000 22%); mask-image:linear-gradient(to bottom, transparent, #000 22%); pointer-events:none; }
  .cmt { display:flex; gap:8px; align-items:flex-start; text-shadow:0 1px 2px rgba(0,0,0,.6); }
  .cmt .av { width:30px; height:30px; border-radius:50%; object-fit:cover; flex:none; background:#334155; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; color:#fff; overflow:hidden; }
  .cmt .who { font-size:12px; color:rgba(255,255,255,.75); font-weight:600; }
  .cmt .txt { font-size:13px; color:#fff; word-break:break-word; }
  #product-card { position:fixed; right:10px; bottom:158px; z-index:16; width:104px; background:#fff; color:#111827; border-radius:14px; padding:6px; box-shadow:0 8px 24px rgba(0,0,0,.35); display:none; }
  #product-card img { width:100%; height:84px; object-fit:cover; border-radius:10px; background:#f1f5f9; }
  #product-card .pname { font-size:11px; font-weight:600; margin-top:5px; line-height:1.25; max-height:28px; overflow:hidden; }
  #product-card .pprice { color:#e11d48; font-weight:800; font-size:14px; margin-top:2px; }
  #product-card .pcompare { color:#9ca3af; font-size:11px; text-decoration:line-through; }
  .bottombar { position:fixed; left:0; right:0; bottom:0; z-index:25; padding:10px; padding-bottom:calc(10px + env(safe-area-inset-bottom)); background:linear-gradient(to top, rgba(0,0,0,.72), rgba(0,0,0,0)); display:flex; align-items:center; gap:8px; }
  #comment-input { width:100%; min-width:0; border:0; border-radius:999px; padding:11px 14px; font-size:14px; background:rgba(255,255,255,.16); color:#fff; outline:none; }
  #comment-input::placeholder { color:rgba(255,255,255,.75); }
  .comment-wrap { position:relative; flex:1; min-width:0; }
  #comment-input.has-text { padding-right:46px; }
  #btn-send { position:absolute; right:5px; top:50%; transform:translateY(-50%); width:32px; height:32px; border-radius:50%; border:0; background:#e11d48; color:#fff; font-size:14px; cursor:pointer; align-items:center; justify-content:center; padding:0; }
  #btn-reg-submit { width:100%; border:0; border-radius:12px; padding:14px; font-size:15px; font-weight:800; color:#fff; background:#4db103; cursor:pointer; margin-top:12px; }
  #btn-reg-submit:disabled { opacity:.55; }
  .iconbtn { flex:none; width:42px; height:42px; border-radius:50%; border:0; font-size:18px; cursor:pointer; background:rgba(255,255,255,.16); color:#fff; }
  #btn-wa { background:#25D366; }
  #btn-wa svg { width:22px; height:22px; display:block; margin:auto; }
  #btn-buy { flex:none; border:0; border-radius:999px; padding:12px 18px; font-size:14px; font-weight:800; color:#fff; background:#e11d48; cursor:pointer; }
  .heart { position:fixed; z-index:40; pointer-events:none; animation:floatUp 1.3s ease-out forwards; }
  @keyframes floatUp { 0%{ transform:translate(0,0) scale(.7); opacity:0;} 12%{opacity:1;} 100%{ transform:translate(var(--dx,0px),-130px) scale(1.5); opacity:0;} }
  .sheet { position:fixed; inset:0; z-index:60; display:none; align-items:flex-end; justify-content:center; background:rgba(0,0,0,.55); }
  .sheet.open { display:flex; }
  .sheet-card { background:#fff; color:#111827; width:100%; max-width:520px; max-height:92vh; overflow:auto; border-radius:18px 18px 0 0; padding:18px; }
  .sheet-card h2 { margin:0 0 4px; font-size:19px; }
  .sheet-card .sub { color:#6b7280; font-size:13px; margin-bottom:12px; }
  .fld { margin-bottom:10px; }
  .fld label { display:block; font-size:12px; font-weight:600; color:#374151; margin-bottom:4px; }
  .fld input, .fld select { width:100%; border:1px solid #d1d5db; border-radius:10px; padding:10px 12px; font-size:14px; outline:none; }
  .row2 { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
  .totals { background:#f9fafb; border:1px solid #e5e7eb; border-radius:12px; padding:10px 12px; font-size:14px; }
  .totals .trow { display:flex; justify-content:space-between; padding:3px 0; }
  .totals .grand { font-weight:800; font-size:16px; border-top:1px solid #e5e7eb; margin-top:6px; padding-top:8px; }
  #btn-submit { width:100%; border:0; border-radius:12px; padding:14px; font-size:15px; font-weight:800; color:#fff; background:#111827; cursor:pointer; margin-top:12px; }
  #btn-submit:disabled { opacity:.55; }
  .err { color:#dc2626; font-size:13px; min-height:18px; }
  .closex { float:right; border:0; background:#f3f4f6; width:32px; height:32px; border-radius:50%; font-size:15px; cursor:pointer; }
  #toast { position:fixed; left:50%; bottom:120px; transform:translateX(-50%); z-index:80; background:rgba(17,24,39,.92); color:#fff; padding:10px 16px; border-radius:999px; font-size:13px; display:none; max-width:88vw; text-align:center; }
  #ended, #fatal { position:fixed; inset:0; z-index:70; display:none; align-items:center; justify-content:center; background:rgba(0,0,0,.82); font-size:22px; font-weight:800; text-align:center; padding:24px; }
  .prodline { display:flex; gap:10px; align-items:center; background:#f9fafb; border:1px solid #e5e7eb; border-radius:12px; padding:8px; margin-bottom:12px; }
  #product-card { cursor:pointer; }
  #catalog-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
  .cat-item { border:1px solid #e5e7eb; border-radius:14px; overflow:hidden; background:#fff; display:flex; flex-direction:column; }
  .cat-item img { width:100%; height:110px; object-fit:cover; background:#eef2f7; }
  .cat-ph { height:110px; display:flex; align-items:center; justify-content:center; font-size:34px; background:#eef2f7; }
  .cat-body { padding:9px; display:flex; flex-direction:column; gap:3px; flex:1; }
  .cat-name { font-size:13px; font-weight:700; line-height:1.3; }
  .cat-price { color:#e11d48; font-weight:800; font-size:15px; }
  .cat-compare { color:#9ca3af; font-size:12px; text-decoration:line-through; font-weight:600; }
  .cat-buy { margin-top:auto; border:0; border-radius:10px; padding:10px; font-size:13px; font-weight:800; color:#fff; background:#e11d48; cursor:pointer; }
  .payopt { display:flex; gap:10px; align-items:flex-start; border:1px solid #d1d5db; border-radius:12px; padding:10px 12px; cursor:pointer; }
  .payopt input { margin-top:3px; }
  .payopt .pt { font-weight:700; font-size:14px; }
  .payopt .pd { font-size:12px; color:#6b7280; margin-top:1px; }
  .payopt.sel { border-color:#111827; background:#f9fafb; }
  .prodline img { width:52px; height:52px; border-radius:10px; object-fit:cover; background:#eef2f7; }
  .qtywrap { display:flex; align-items:center; gap:8px; }
  .qtywrap button { width:32px; height:32px; border-radius:50%; border:1px solid #d1d5db; background:#fff; font-size:16px; cursor:pointer; }
</style>
</head>
<body>
  <div id="player-wrap"><div id="player-slot"></div></div>
  <div id="tap-layer"></div>

  <div class="topbar">
    <span class="pill pill-live"><span class="dot"></span>EN VIVO</span>
    <span class="pill pill-pre" id="disclosure" style="display:none"></span>
    <span class="pill pill-label" id="live-label" style="display:none"></span>
    <div class="top-right">
      <span class="pill pill-viewers">👁 <span id="viewers">–</span></span>
      <button id="btn-sound" title="Activar sonido" style="display:none">🔇 Activar sonido</button>
    </div>
  </div>
  <button id="btn-unmute-big">🔊 Toca para activar el sonido</button>

  <div id="product-card">
    <img id="pc-img" alt="">
    <div class="pname" id="pc-name"></div>
    <div class="pprice" id="pc-price"></div>
    <div class="pcompare" id="pc-compare"></div>
  </div>

  <div id="comments"></div>

  <div class="bottombar">
    <button id="btn-buy">COMPRAR</button>
    <div class="comment-wrap">
      <input id="comment-input" maxlength="500" placeholder="Deja tu comentario" autocomplete="off">
      <button id="btn-send" title="Enviar comentario" style="display:none">➤</button>
    </div>
    <button class="iconbtn" id="btn-wa" title="WhatsApp" style="display:none"><svg viewBox="0 0 24 24" fill="#ffffff" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg></button>
    <button class="iconbtn" id="btn-heart" title="Me gusta">🤍</button>
  </div>

  <div class="sheet" id="checkout">
    <div class="sheet-card">
      <button class="closex" id="co-close">✕</button>
      <h2>Finaliza tu pedido</h2>
      <div class="sub" id="co-sub">Pagas en efectivo al recibir. Sin pagos en línea.</div>
      <div class="prodline">
        <img id="co-img" alt="">
        <div style="flex:1;min-width:0">
          <div id="co-name" style="font-weight:700;font-size:14px"></div>
          <div id="co-price" style="color:#e11d48;font-weight:800"></div>
        </div>
        <div class="qtywrap">
          <button id="qty-minus" type="button">−</button>
          <strong id="qty-val">1</strong>
          <button id="qty-plus" type="button">+</button>
        </div>
      </div>
      <form id="co-form">
        <div class="fld"><label>Nombre y apellido *</label><input id="f-name" autocomplete="name" required></div>
        <div class="fld"><label>Número de WhatsApp *</label><input id="f-phone" inputmode="tel" autocomplete="tel" placeholder="3001234567" required></div>
        <div class="fld"><label>Dirección completa *</label><input id="f-address" autocomplete="street-address" required></div>
        <div class="row2">
          <div class="fld"><label>Departamento *</label><input id="f-dept" required></div>
          <div class="fld"><label>Ciudad / Municipio *</label><input id="f-city" required></div>
        </div>
        <div class="fld"><label>Correo electrónico</label><input id="f-email" type="email" autocomplete="email"></div>
        <div class="fld"><label>Cupón de descuento</label>
          <div style="display:flex;gap:8px"><input id="f-coupon" style="flex:1"><button type="button" id="btn-coupon" style="border:1px solid #d1d5db;background:#fff;border-radius:10px;padding:0 14px;cursor:pointer">Aplicar</button></div>
          <div id="coupon-msg" style="font-size:12px;color:#059669;margin-top:4px"></div>
        </div>
        <div class="fld"><label>¿Cómo quieres pagar?</label><div class="payopts" id="pay-opts"></div></div>
        <div class="totals">
          <div class="trow"><span>Subtotal</span><strong id="t-sub">$0</strong></div>
          <div class="trow"><span>Envío</span><strong id="t-ship">$0</strong></div>
          <div class="trow"><span>Descuento</span><strong id="t-disc">Se confirma con tu pedido</strong></div>
          <div class="trow grand"><span>Total estimado</span><span id="t-total">$0</span></div>
          <div style="font-size:12px;color:#6b7280" id="ship-note"></div>
        </div>
        <div class="err" id="co-err"></div>
        <button id="btn-submit" type="submit">COMPRAR AHORA</button>
      </form>
    </div>
  </div>

  <div class="sheet" id="register">
    <div class="sheet-card">
      <button class="closex" id="reg-close">✕</button>
      <h2>Regístrate</h2>
      <div class="sub">Déjanos tus datos y te contactamos por WhatsApp con toda la información.</div>
      <form id="reg-form">
        <div class="fld"><label>Nombre y apellido *</label><input id="r-name" autocomplete="name" required></div>
        <div class="fld"><label>Número de WhatsApp *</label><input id="r-phone" inputmode="tel" autocomplete="tel" placeholder="3001234567" required></div>
        <div class="fld"><label>Ciudad / Municipio</label><input id="r-city" autocomplete="address-level2"></div>
        <div class="err" id="reg-err"></div>
        <button id="btn-reg-submit" type="submit">Registrarme</button>
      </form>
    </div>
  </div>

  <div class="sheet" id="catalog">
    <div class="sheet-card">
      <button class="closex" id="cat-close">✕</button>
      <h2>Catálogo del live</h2>
      <div class="sub">Elige tu producto y compra sin salir del live.</div>
      <div id="catalog-grid"></div>
    </div>
  </div>

  <div class="sheet" id="reg-thanks">
    <div class="sheet-card" style="text-align:center">
      <div style="font-size:44px">✅</div>
      <h2>¡Ya quedaste registrado!</h2>
      <p class="sub">Te abrimos WhatsApp para darte toda la información. Si no se abrió, toca el botón verde de WhatsApp del live.</p>
      <button id="btn-reg-thanks-close" style="border:0;border-radius:12px;padding:13px 22px;font-weight:800;background:#111827;color:#fff;cursor:pointer">Seguir viendo</button>
    </div>
  </div>

  <div class="sheet" id="thanks">
    <div class="sheet-card" style="text-align:center">
      <div style="font-size:44px">✅</div>
      <h2>¡Pedido recibido!</h2>
      <p class="sub" id="thanks-detail"></p>
      <p style="font-weight:800;font-size:17px" id="thanks-pay">PAGAS EN EFECTIVO AL RECIBIR</p>
      <button id="btn-thanks-close" style="border:0;border-radius:12px;padding:13px 22px;font-weight:800;background:#111827;color:#fff;cursor:pointer">Seguir viendo</button>
    </div>
  </div>

  <div id="ended">✨ ¡Live terminado! ✨</div>
  <div id="fatal">Este live no está disponible por ahora.</div>
  <div id="toast"></div>

<script>
window.__LIVE_SLUG__ = ${safeSlug};
(function(){
  var $ = function(id){ return document.getElementById(id); };
  var slug = window.__LIVE_SLUG__ || '';
  if (!slug) {
    var parts = location.pathname.split('/').filter(Boolean);
    if (parts[0] === 'live' && parts[1]) slug = parts[1];
  }
  var cfg = null, landingId = '', fake = [], qty = 1, leadId = '', knownPhone = '', selected = null;
  var currentTimeSec = 0, lastTimeSec = 0, durationSec = 0, player = null, playerKind = '', endedHandled = false;

  function utm(){
    var out = {}, q = new URLSearchParams(location.search);
    q.forEach(function(v,k){ if (/^(utm_|fbclid|gclid|ttclid|wbraid|gbraid|aff)/.test(k)) out[k] = v; });
    try {
      var saved = JSON.parse(localStorage.getItem('xorbit_live_utm') || '{}');
      Object.keys(out).length && localStorage.setItem('xorbit_live_utm', JSON.stringify(out));
      return Object.keys(out).length ? out : saved;
    } catch(e){ return out; }
  }
  var UTM = utm();

  function stateKey(){ return 'xorbit_live_' + landingId; }
  function loadState(){
    try { return JSON.parse(localStorage.getItem(stateKey()) || '{}'); } catch(e){ return {}; }
  }
  function saveState(patch){
    try {
      var s = loadState();
      Object.keys(patch).forEach(function(k){ s[k] = patch[k]; });
      localStorage.setItem(stateKey(), JSON.stringify(s));
    } catch(e){}
  }
  function visitorId(){
    var s = loadState();
    if (s.visitorId) return s.visitorId;
    var id = 'v-' + Math.random().toString(36).slice(2,10) + Date.now().toString(36);
    saveState({ visitorId: id });
    return id;
  }
  function money(n){ return '$' + Math.round(Number(n)||0).toLocaleString('es-CO'); }
  function toast(msg){ var t=$('toast'); t.textContent=msg; t.style.display='block'; setTimeout(function(){ t.style.display='none'; }, 2600); }
  function post(path, body){
    return fetch(path, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(body||{}), keepalive:true })
      .then(function(r){ return r.json().catch(function(){ return {}; }).then(function(j){ if(!r.ok) throw new Error(j.error || 'Error'); return j; }); });
  }

  // ---------- Video ----------
  function resumePosition(){
    var s = loadState();
    if (s.videoId && cfg && s.videoId === cfg.videoId && Number(s.time) > 5) {
      try {
        if (playerKind === 'youtube' && player && player.seekTo) player.seekTo(Number(s.time), true);
        if (playerKind === 'vimeo' && player && player.setCurrentTime) player.setCurrentTime(Number(s.time)).catch(function(){});
      } catch(e){}
    }
  }
  function startTimePolling(){
    setInterval(function(){
      try {
        if (playerKind === 'youtube' && player && player.getCurrentTime) {
          currentTimeSec = player.getCurrentTime() || 0;
          if (player.getDuration) durationSec = player.getDuration() || 0;
        }
      } catch(e){}
      if (Math.abs(currentTimeSec - lastTimeSec) > 0.2) {
        lastTimeSec = currentTimeSec;
        saveState({ videoId: cfg ? cfg.videoId : '', time: Math.floor(currentTimeSec), visitorId: visitorId() });
      }
    }, 1200);
  }
  function onEnded(){
    if (endedHandled) return; endedHandled = true;
    if (cfg && cfg.allowLoop) {
      endedHandled = false;
      shownSeconds = {};
      try {
        if (playerKind === 'youtube' && player) { player.seekTo(0, true); player.playVideo(); }
        if (playerKind === 'vimeo' && player) { player.setCurrentTime(0).then(function(){ return player.play(); }).catch(function(){}); }
      } catch(e){}
    } else {
      $('ended').style.display = 'flex';
    }
  }
  // Autoplay CON sonido: se intenta primero sin silenciar. Si el navegador
  // bloquea el audio sin interacción previa (política estándar de Chrome,
  // Safari y navegadores móviles), se muestra el overlay y el primer toque
  // del visitante activa play + sonido. No se promete sonido automático
  // donde el navegador lo prohíbe.
  function showTapToSound(){ $('btn-unmute-big').style.display = 'block'; $('btn-sound').style.display = 'inline-flex'; }
  function hideTapToSound(){ $('btn-unmute-big').style.display = 'none'; $('btn-sound').style.display = 'none'; }
  // El aviso de sonido solo existe mientras el audio esta bloqueado o el
  // video esta en pausa: en cuanto el video suena, ambos controles
  // desaparecen y no vuelven mientras siga sonando (revision periodica).
  function refreshSoundUI(){
    try {
      if (playerKind === 'youtube' && player && player.getPlayerState) {
        var st = player.getPlayerState();
        var mutedYt = player.isMuted ? player.isMuted() : true;
        if (st === 1 && !mutedYt) hideTapToSound(); else if (st === 1 || st === 2) showTapToSound();
      }
      if (playerKind === 'vimeo' && player && player.getMuted) {
        player.getPaused().then(function(paused){
          return player.getMuted().then(function(m){ if (!paused && !m) hideTapToSound(); else showTapToSound(); });
        }).catch(function(){});
      }
    } catch(e){}
  }
  function verifySoundPlayback(){ setTimeout(refreshSoundUI, 1600); }
  function loadYouTube(id){
    playerKind = 'youtube';
    var tag = document.createElement('script'); tag.src = 'https://www.youtube.com/iframe_api'; document.head.appendChild(tag);
    window.onYouTubeIframeAPIReady = function(){
      player = new YT.Player('player-slot', {
        videoId: id,
        playerVars: { playsinline:1, controls:0, rel:0, disablekb:1, modestbranding:1, iv_load_policy:3, fs:0, autoplay:1 },
        events: {
          onReady: function(e){
            try { e.target.setVolume(85); } catch(_){}
            resumePosition();
            try { e.target.playVideo(); } catch(_){}
            verifySoundPlayback();
          },
          onStateChange: function(e){ if (e.data === 0) onEnded(); }
        }
      });
    };
  }
  function loadVimeo(id){
    playerKind = 'vimeo';
    var tag = document.createElement('script'); tag.src = 'https://player.vimeo.com/api/player.js';
    tag.onload = function(){
      player = new Vimeo.Player('player-slot', { id: isNaN(Number(id)) ? id : Number(id), muted:false, controls:false, playsinline:true, loop:false, autoplay:true, responsive:false });
      player.ready().then(function(){
        resumePosition();
        return player.setMuted(false).then(function(){ return player.setVolume(0.85); }).then(function(){ return player.play(); });
      }).then(function(){ hideTapToSound(); }).catch(function(){ showTapToSound(); });
      player.on('timeupdate', function(d){ currentTimeSec = d.seconds || 0; durationSec = d.duration || 0; });
      player.on('ended', onEnded);
    };
    document.head.appendChild(tag);
  }
  function unmute(){
    try {
      if (playerKind === 'youtube' && player) { player.unMute(); player.setVolume(85); player.playVideo(); }
      if (playerKind === 'vimeo' && player) { player.setMuted(false); player.setVolume(0.85); player.play(); }
    } catch(e){}
    hideTapToSound();
  }
  $('btn-unmute-big').addEventListener('click', unmute);
  $('btn-sound').addEventListener('click', unmute);

  // ---------- Espectadores simulados ----------
  function initViewers(){
    var s = loadState();
    var min = (cfg && cfg.viewersMin) || 40, max = (cfg && cfg.viewersMax) || 60;
    var eyes = (s.videoId === cfg.videoId && Number(s.eyes) > 0) ? Number(s.eyes) : (min + Math.floor(Math.random() * (max - min + 1)));
    function render(){ $('viewers').textContent = eyes; saveState({ eyes: eyes, videoId: cfg.videoId, visitorId: visitorId() }); }
    render();
    (function tick(){
      setTimeout(function(){
        var step = Math.ceil(Math.random()*5);
        if (Math.random() < 0.2) { if (eyes - step > 5) eyes -= step; } else { eyes += step; }
        render(); tick();
      }, 8000 + Math.floor(Math.random()*7000));
    })();
  }

  // ---------- Comentarios ----------
  var shownSeconds = {};
  function initials(name){
    return String(name||'?').trim().split(/\\s+/).slice(0,2).map(function(w){ return w[0] || ''; }).join('').toUpperCase() || '?';
  }
  function hue(name){ var h=0; for (var i=0;i<String(name).length;i++) h=(h*31 + String(name).charCodeAt(i))%360; return h; }
  function addComment(author, text, avatarUrl, own){
    var box = $('comments');
    var row = document.createElement('div'); row.className = 'cmt';
    var av = document.createElement('div'); av.className = 'av';
    if (avatarUrl) { var img = document.createElement('img'); img.src = avatarUrl; img.className='av'; img.alt=''; av.replaceWith(img); row.appendChild(img); }
    else { av.textContent = initials(author); av.style.background = 'hsl(' + hue(author) + ',55%,38%)'; row.appendChild(av); }
    var body = document.createElement('div');
    var who = document.createElement('div'); who.className='who'; who.textContent = author + (own ? ' (tú)' : '');
    var txt = document.createElement('div'); txt.className='txt'; txt.textContent = text;
    body.appendChild(who); body.appendChild(txt); row.appendChild(body);
    box.appendChild(row);
    while (box.children.length > 8) box.removeChild(box.firstChild);
  }
  function startFakeComments(){
    if (!fake.length || startFakeComments.started) return;
    startFakeComments.started = true;
    var ordered = fake.slice().sort(function(a,b){ return (a.second||0)-(b.second||0); });
    var nextIdx = 0;
    var lastShownAt = 0;
    function pushComment(c){
      if (!c) return;
      addComment(c.author, c.content, c.avatarUrl, false);
      lastShownAt = Date.now();
    }
    function nextComment(){
      var c = ordered[nextIdx % ordered.length];
      nextIdx++;
      return c;
    }
    ordered.slice(0, 3).forEach(function(c, i){
      setTimeout(function(){ pushComment(c); if (nextIdx < i + 1) nextIdx = i + 1; }, 350 + i*650);
    });
    nextIdx = Math.min(3, ordered.length);
    setInterval(function(){
      var now = Date.now();
      var t = Math.floor(currentTimeSec || 0);
      if (t < lastCountdownT - 2) shownSeconds = {};
      if (cfg.commentMode === 'countdown' && t > 0) {
        var due = [];
        ordered.forEach(function(c){
          if (c.second != null && c.second <= t && !shownSeconds[c.id]) due.push(c);
        });
        if (due.length) {
          due.forEach(function(c){ shownSeconds[c.id] = 1; });
          due.slice(-3).forEach(pushComment);
          lastCountdownT = t;
          return;
        }
      }
      lastCountdownT = t;
      if (now - lastShownAt >= 4200) pushComment(nextComment());
    }, 800);
  }
  var lastCountdownT = 0;

  function sendComment(){
    var input = $('comment-input');
    var text = input.value.trim();
    if (!text || !landingId) return;
    input.value = '';
    syncSendBtn();
    addComment('Tú', text, '', true);
    post('/api/public/live/' + landingId + '/comments', { visitorId: visitorId(), content: text, phone: knownPhone || undefined, utm: UTM })
      .catch(function(){ toast('No se pudo guardar tu comentario'); });
  }
  $('btn-send').addEventListener('click', sendComment);
  // El boton Enviar solo aparece mientras el visitante escribe (tipo TikTok).
  var commentInputEl = $('comment-input');
  function syncSendBtn(){ var has = !!commentInputEl.value.trim(); $('btn-send').style.display = has ? 'flex' : 'none'; commentInputEl.classList.toggle('has-text', has); }
  commentInputEl.addEventListener('input', syncSendBtn);
  $('comment-input').addEventListener('keydown', function(e){ if (e.key === 'Enter') sendComment(); });

  // ---------- Corazones ----------
  var lastHeart = 0;
  function spawnHeart(x, y, force){
    var now = Date.now(); if (!force && now - lastHeart < 200) return; lastHeart = now;
    var h = document.createElement('div'); h.className = 'heart'; h.textContent = '❤️';
    var size = 20 + Math.floor(Math.random()*16);
    h.style.fontSize = size + 'px'; h.style.left = x + 'px'; h.style.top = y + 'px';
    h.style.setProperty('--dx', (Math.floor(Math.random()*81)-40) + 'px');
    document.body.appendChild(h);
    setTimeout(function(){ h.remove(); }, 1400);
  }
  $('tap-layer').addEventListener('click', function(e){
    if ($('btn-unmute-big').style.display === 'block') unmute();
    spawnHeart(e.clientX, e.clientY);
  });
  // Corazon fijo a la derecha de la barra: dispara corazones flotantes
  // (ademas de los que nacen al tocar el video en el tap-layer).
  $('btn-heart').addEventListener('click', function(){
    var r = $('btn-heart').getBoundingClientRect();
    var cx = r.left + r.width / 2, cy = r.top;
    for (var i = 0; i < 4; i++) {
      (function(k){ setTimeout(function(){ spawnHeart(cx + (Math.floor(Math.random()*25)-12), cy - 6, true); }, k*90); })(i);
    }
  });

  // ---------- WhatsApp ----------
  function openWhatsApp(){
    if (!cfg) return;
    var url = '';
    if (cfg.whatsappLink) {
      url = cfg.whatsappLink;
    } else if (cfg.whatsappNumber) {
      var num = String(cfg.whatsappNumber).replace(/[^0-9]/g, '');
      if (num) url = 'https://wa.me/' + num + (cfg.whatsappText ? ('?text=' + encodeURIComponent(cfg.whatsappText)) : '');
    }
    if (!url) return;
    post('/api/public/live/' + landingId + '/whatsapp-click', { visitorId: visitorId(), utm: UTM }).catch(function(){});
    window.open(url, '_blank');
  }
  $('btn-wa').addEventListener('click', openWhatsApp);

  // ---------- Catalogo dentro del live ----------
  function catalogProducts(){
    var list = (cfg && Array.isArray(cfg.products)) ? cfg.products.slice() : [];
    if (cfg && cfg.productName) {
      var main = { name: cfg.productName, price: Number(cfg.productPrice)||0, comparePrice: cfg.productComparePrice == null ? null : Number(cfg.productComparePrice), imageUrl: cfg.productImageUrl || '' };
      var hasMain = list.some(function(p){ return p && p.name === main.name; });
      if (!hasMain) list.unshift(main);
    }
    return list;
  }
  function selectedPrice(){ return selected ? (Number(selected.price)||0) : (Number(cfg && cfg.productPrice)||0); }
  function renderCatalog(){
    var grid = $('catalog-grid'); grid.innerHTML = '';
    catalogProducts().forEach(function(prod){
      var box = document.createElement('div'); box.className = 'cat-item';
      if (prod.imageUrl) { var im = document.createElement('img'); im.src = prod.imageUrl; im.alt = ''; box.appendChild(im); }
      else { var ph = document.createElement('div'); ph.className = 'cat-ph'; ph.textContent = '🛍️'; box.appendChild(ph); }
      var body = document.createElement('div'); body.className = 'cat-body';
      var nm = document.createElement('div'); nm.className = 'cat-name'; nm.textContent = prod.name; body.appendChild(nm);
      var pr = document.createElement('div'); pr.className = 'cat-price'; pr.textContent = money(prod.price);
      if (prod.comparePrice) { var sp = document.createElement('span'); sp.className = 'cat-compare'; sp.textContent = ' ' + money(prod.comparePrice); pr.appendChild(sp); }
      body.appendChild(pr);
      var b = document.createElement('button'); b.type = 'button'; b.className = 'cat-buy'; b.textContent = 'COMPRAR';
      (function(pp){ b.addEventListener('click', function(){
        post('/api/public/live/' + landingId + '/checkout-click', { visitorId: visitorId(), utm: UTM }).catch(function(){});
        selectProduct(pp);
        $('catalog').classList.remove('open');
        $('checkout').classList.add('open');
      }); })(prod);
      body.appendChild(b);
      box.appendChild(body);
      grid.appendChild(box);
    });
  }
  function openCatalog(){ renderCatalog(); $('catalog').classList.add('open'); }
  function selectProduct(prod){
    selected = prod || null;
    qty = 1;
    $('co-name').textContent = selected ? selected.name : (cfg.productName || '');
    $('co-price').textContent = money(selectedPrice());
    var hasImg = !!(selected && selected.imageUrl) || !!(cfg && cfg.productImageUrl);
    $('co-img').style.display = hasImg ? '' : 'none';
    if (selected && selected.imageUrl) $('co-img').src = selected.imageUrl;
    else if (cfg && cfg.productImageUrl) $('co-img').src = cfg.productImageUrl;
    recalc();
  }
  $('cat-close').addEventListener('click', function(){ $('catalog').classList.remove('open'); });
  $('product-card').addEventListener('click', function(){
    if (catalogProducts().length) openCatalog();
    else $('checkout').classList.add('open');
  });

  // ---------- Pago ----------
  function paymentMethods(){ return (cfg && Array.isArray(cfg.paymentMethods) && cfg.paymentMethods.length) ? cfg.paymentMethods : ['cod', 'prepaid']; }
  function paintPaySelection(){
    var els = $('pay-opts').querySelectorAll('.payopt');
    Array.prototype.forEach.call(els, function(el){ el.classList.toggle('sel', !!el.querySelector('input:checked')); });
  }
  function renderPayment(){
    var box = $('pay-opts'); box.innerHTML = '';
    var methods = paymentMethods();
    var defs = [
      { id: 'cod', t: 'Pago contraentrega', d: 'Pagas en efectivo al recibir tu pedido.' },
      { id: 'prepaid', t: 'Pago anticipado', d: 'Recibes el link o los datos de pago por WhatsApp y aseguras tu pedido ya.' },
    ];
    defs.forEach(function(def, i){
      if (methods.indexOf(def.id) === -1) return;
      var label = document.createElement('label'); label.className = 'payopt' + (i === 0 ? ' sel' : '');
      var radio = document.createElement('input'); radio.type = 'radio'; radio.name = 'paymethod'; radio.value = def.id;
      if (i === 0 || methods.length === 1) radio.checked = true;
      var tx = document.createElement('div');
      var tt = document.createElement('div'); tt.className = 'pt'; tt.textContent = def.t; tx.appendChild(tt);
      var dd = document.createElement('div'); dd.className = 'pd'; dd.textContent = def.d; tx.appendChild(dd);
      label.appendChild(radio); label.appendChild(tx);
      label.addEventListener('click', function(){ setTimeout(paintPaySelection, 0); });
      box.appendChild(label);
    });
    $('co-sub').textContent = methods.indexOf('prepaid') !== -1
      ? 'Paga contraentrega o anticipado: el cobro anticipado se coordina por WhatsApp.'
      : 'Pagas en efectivo al recibir. Sin pagos en línea.';
  }
  function selectedPayment(){
    var r = $('pay-opts').querySelector('input[name=paymethod]:checked');
    return r ? r.value : paymentMethods()[0];
  }

  // ---------- Checkout ----------
  function recalc(){
    var sub = selectedPrice() * qty;
    var ship = Number(cfg.shippingPrice)||0;
    $('qty-val').textContent = qty;
    $('t-sub').textContent = money(sub);
    $('t-ship').textContent = ship > 0 ? money(ship) : 'GRATIS';
    $('t-total').textContent = money(sub + ship);
  }
  $('qty-minus').addEventListener('click', function(){ if (qty>1){ qty--; recalc(); } });
  $('qty-plus').addEventListener('click', function(){ if (qty<99){ qty++; recalc(); } });
  $('btn-buy').addEventListener('click', function(){
    if (!cfg || !landingId) return;
    post('/api/public/live/' + landingId + '/checkout-click', { visitorId: visitorId(), utm: UTM }).catch(function(){});
    if (cfg.checkoutMode === 'whatsapp') { openWhatsApp(); return; }
    if (cfg.checkoutMode === 'shopify' && cfg.shopifyUrl) { window.open(cfg.shopifyUrl, '_blank'); return; }
    // Landing sin producto (registro/captacion): el boton principal abre
    // el formulario de registro, no el checkout de compra.
    if (cfg.checkoutMode === 'crm' && !cfg.productName) { $('register').classList.add('open'); return; }
    $('checkout').classList.add('open');
  });
  $('co-close').addEventListener('click', function(){ $('checkout').classList.remove('open'); });
  $('btn-coupon').addEventListener('click', function(){
    $('coupon-msg').textContent = $('f-coupon').value.trim() ? 'Cupón agregado: el descuento se aplica y confirma con tu pedido.' : '';
  });

  function normalizePhone(raw){
    var d = String(raw||'').replace(/\\D/g,'');
    if (d.length === 10 && d[0] === '3') return '57' + d;
    if (d.length === 12 && d.indexOf('57') === 0 && d[2] === '3') return d;
    return '';
  }
  var leadTimer = null;
  $('f-phone').addEventListener('input', function(){
    clearTimeout(leadTimer);
    leadTimer = setTimeout(function(){
      var phone = normalizePhone($('f-phone').value);
      if (!phone || !landingId) return;
      knownPhone = phone;
      post('/api/public/live/' + landingId + '/leads', { visitorId: visitorId(), phone: phone, quantity: qty, productName: selected ? selected.name : (cfg && cfg.productName) || undefined, utm: UTM, leadId: leadId || undefined })
        .then(function(j){ if (j.leadId) { leadId = j.leadId; saveState({ leadId: leadId, phone: phone, visitorId: visitorId() }); } })
        .catch(function(){});
    }, 700);
  });

  $('co-form').addEventListener('submit', function(e){
    e.preventDefault();
    var err = $('co-err'); err.textContent = '';
    var phone = normalizePhone($('f-phone').value);
    var data = {
      visitorId: visitorId(), leadId: leadId || undefined, quantity: qty,
      couponCode: $('f-coupon').value.trim() || undefined,
      customerName: $('f-name').value.trim(), phone: phone,
      productName: selected ? selected.name : (cfg && cfg.productName) || undefined, paymentMethod: selectedPayment(),
      address: $('f-address').value.trim(), department: $('f-dept').value.trim(),
      city: $('f-city').value.trim(), email: $('f-email').value.trim() || undefined,
      utm: UTM
    };
    if (!data.customerName) { err.textContent = 'Escribe tu nombre y apellido.'; return; }
    if (!phone) { err.textContent = 'Escribe un WhatsApp colombiano válido (10 dígitos, ej. 3001234567).'; return; }
    if (!data.address || !data.department || !data.city) { err.textContent = 'Completa dirección, departamento y ciudad.'; return; }
    var btn = $('btn-submit'); btn.disabled = true; btn.textContent = 'Enviando…';
    post('/api/public/live/' + landingId + '/orders', data)
      .then(function(j){
        knownPhone = phone;
        saveState({ phone: phone, visitorId: visitorId() });
        $('checkout').classList.remove('open');
        var pm = j.paymentMethod || selectedPayment();
        if (pm === 'prepaid') {
          $('thanks-detail').textContent = 'Pedido ' + (j.orderRef || '') + ' · ' + (j.productName || '') + ' · Total: ' + money(j.total) + '. Elegiste pago anticipado: en unos minutos recibes por WhatsApp el link o los datos para pagar y asegurar tu pedido.';
          $('thanks-pay').textContent = 'PAGO ANTICIPADO: TE ENVIAMOS EL LINK DE PAGO POR WHATSAPP';
        } else {
          $('thanks-detail').textContent = 'Pedido ' + (j.orderRef || '') + ' · Total a pagar al recibir: ' + money(j.total) + '. Te contactaremos por WhatsApp para confirmar la entrega.';
          $('thanks-pay').textContent = 'PAGAS EN EFECTIVO AL RECIBIR';
        }
        $('thanks').classList.add('open');
      })
      .catch(function(ex){ err.textContent = ex.message || 'No se pudo enviar el pedido. Intenta de nuevo.'; })
      .finally(function(){ btn.disabled = false; btn.textContent = 'COMPRAR AHORA'; });
  });
  $('btn-thanks-close').addEventListener('click', function(){ $('thanks').classList.remove('open'); });

  // ---------- Registro (landing sin producto) ----------
  $('reg-close').addEventListener('click', function(){ $('register').classList.remove('open'); });
  $('btn-reg-thanks-close').addEventListener('click', function(){ $('reg-thanks').classList.remove('open'); });
  $('reg-form').addEventListener('submit', function(e){
    e.preventDefault();
    var err = $('reg-err'); err.textContent = '';
    var phone = normalizePhone($('r-phone').value);
    var name = $('r-name').value.trim();
    if (!name) { err.textContent = 'Escribe tu nombre y apellido.'; return; }
    if (!phone) { err.textContent = 'Escribe un WhatsApp colombiano válido (10 dígitos, ej. 3001234567).'; return; }
    var btn = $('btn-reg-submit'); btn.disabled = true; btn.textContent = 'Registrando…';
    post('/api/public/live/' + landingId + '/leads', { visitorId: visitorId(), leadId: leadId || undefined, name: name, phone: phone, city: $('r-city').value.trim() || undefined, utm: UTM })
      .then(function(j){
        if (j.leadId) leadId = j.leadId;
        knownPhone = phone;
        saveState({ leadId: leadId, phone: phone, visitorId: visitorId() });
        $('register').classList.remove('open');
        $('reg-thanks').classList.add('open');
        openWhatsApp();
      })
      .catch(function(ex){ err.textContent = ex.message || 'No se pudo registrar. Intenta de nuevo.'; })
      .finally(function(){ btn.disabled = false; btn.textContent = (cfg && cfg.buttonText) || 'Registrarme'; });
  });

  // ---------- Carga de configuración ----------
  var apiUrl = slug ? ('/api/public/live/' + encodeURIComponent(slug)) : '/api/public/live/by-host';
  fetch(apiUrl).then(function(r){ return r.json(); }).then(function(j){
    if (!j || !j.success) throw new Error('not-found');
    cfg = j.landing; landingId = cfg.id; fake = cfg.fakeComments || [];
    document.title = cfg.title || 'Live';
    if (cfg.liveLabel) { var l=$('live-label'); l.textContent = cfg.liveLabel; l.style.display=''; if (cfg.titleBackground) l.style.background = cfg.titleBackground; }
    if (cfg.showDisclosure && cfg.disclosureText) { var dEl = $('disclosure'); dEl.textContent = cfg.disclosureText; dEl.style.display = ''; }
    $('btn-buy').textContent = cfg.buttonText || 'COMPRAR';
    if (cfg.buttonColor) $('btn-buy').style.background = cfg.buttonColor;
    $('btn-reg-submit').textContent = cfg.buttonText || 'Registrarme';
    if (cfg.buttonColor) $('btn-reg-submit').style.background = cfg.buttonColor;
    if (cfg.whatsappNumber || cfg.whatsappLink) $('btn-wa').style.display = '';
    if (cfg.productName) {
      $('product-card').style.display = 'block';
      $('pc-name').textContent = cfg.productName;
      $('pc-price').textContent = money(cfg.productPrice);
      if (cfg.productComparePrice) $('pc-compare').textContent = money(cfg.productComparePrice); else $('pc-compare').style.display='none';
      if (cfg.productImageUrl) $('pc-img').src = cfg.productImageUrl; else $('pc-img').style.display='none';
      $('comments').style.bottom = '268px'; $('comments').style.right = '126px';
      $('co-name').textContent = cfg.productName;
      $('co-price').textContent = money(cfg.productPrice);
      if (cfg.productImageUrl) $('co-img').src = cfg.productImageUrl; else $('co-img').style.display='none';
    }
    renderPayment();
    if (catalogProducts().length > 1) $('pc-name').textContent = cfg.productName + ' · ver catálogo ›';
    $('ship-note').textContent = cfg.shippingText || '';
    var s = loadState(); if (s.phone) knownPhone = s.phone; if (s.leadId) leadId = s.leadId;
    visitorId();
    post('/api/public/live/' + landingId + '/pageview', { visitorId: visitorId(), utm: UTM }).catch(function(){});
    recalc();
    if (cfg.videoProvider === 'vimeo') loadVimeo(cfg.videoId); else loadYouTube(cfg.videoId);
    startTimePolling();
    initViewers();
    startFakeComments();
    setInterval(refreshSoundUI, 1500);
  }).catch(function(){ $('fatal').style.display = 'flex'; });
})();
</script>
</body>
</html>`;
}

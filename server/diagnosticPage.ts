// ============================================================================
// Página pública del Diagnóstico de Conversión de Xorbit 360.
// HTML liviano servido por el servidor (sin SPA): formulario, pantalla de
// progreso conectada al avance REAL del análisis en el servidor (polling),
// reporte con puntaje y fugas ordenadas por impacto, agenda y WhatsApp.
// Marca: fondo oscuro con acentos dorados, textos originales de Xorbit 360.
// ============================================================================

export function renderDiagnosticPage(): string {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Diagnóstico de Conversión gratis · Xorbit 360</title>
<meta name="description" content="Descubre en minutos qué le está costando ventas a tu tienda: puntaje de conversión, fugas detectadas con evidencia y recomendaciones claras. Gratis, por Xorbit 360." />
<style>
  :root{--bg:#0a0a0b;--panel:#131316;--panel2:#17171b;--line:#26262c;--gold:#d4a017;--gold2:#f2c94c;--txt:#f4f1ea;--mut:#9c978c;--red:#e5484d;--amber:#e8a13a;--green:#35b26f}
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:var(--bg);color:var(--txt);font-family:Inter,system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;line-height:1.5;-webkit-font-smoothing:antialiased}
  a{color:var(--gold2)}
  .wrap{max-width:880px;margin:0 auto;padding:20px 16px 110px}
  header.top{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 2px 22px}
  .brand{display:flex;align-items:center;gap:10px;font-weight:800;letter-spacing:.2px}
  .brand .mark{width:34px;height:34px;border-radius:9px;background:linear-gradient(135deg,var(--gold),#8a6508);display:flex;align-items:center;justify-content:center;color:#111;font-weight:900}
  .brand small{display:block;color:var(--mut);font-weight:600;font-size:11px;letter-spacing:.12em;text-transform:uppercase}
  .btn{display:inline-flex;align-items:center;gap:8px;background:var(--gold);color:#151310;border:0;border-radius:12px;padding:12px 18px;font-weight:800;font-size:15px;cursor:pointer;text-decoration:none;transition:.15s}
  .btn:hover{background:var(--gold2)}
  .btn:disabled{opacity:.55;cursor:not-allowed}
  .btn.ghost{background:transparent;color:var(--gold2);border:1px solid #4a3d14}
  .btn.wa{background:#22c064;color:#0b2417}
  .card{background:var(--panel);border:1px solid var(--line);border-radius:18px;padding:22px;margin-bottom:18px}
  h1{font-size:clamp(26px,5vw,40px);line-height:1.12;font-weight:900}
  h1 .hl{color:var(--gold2)}
  .sub{color:var(--mut);margin-top:10px;font-size:16px;max-width:640px}
  label{display:block;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--mut);margin:14px 0 6px}
  input,select{width:100%;background:var(--panel2);border:1px solid var(--line);border-radius:12px;color:var(--txt);padding:13px 14px;font-size:15px;outline:none}
  input:focus{border-color:var(--gold)}
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
  @media(max-width:640px){.grid2{grid-template-columns:1fr}}
  .note{font-size:13px;color:var(--mut);margin-top:12px}
  .err{display:none;background:#3a1416;border:1px solid #6e2126;color:#ffb4b8;border-radius:12px;padding:12px 14px;font-size:14px;margin-top:14px}
  /* Progreso */
  .steps{list-style:none;display:grid;gap:10px;margin-top:6px}
  .steps li{display:flex;gap:12px;align-items:flex-start;background:var(--panel2);border:1px solid var(--line);border-radius:14px;padding:13px 14px;color:var(--mut)}
  .steps li .ic{width:24px;height:24px;flex:0 0 24px;border-radius:50%;border:2px solid #3a3a41;display:flex;align-items:center;justify-content:center;font-size:13px}
  .steps li.active{color:var(--txt);border-color:#4a3d14}
  .steps li.active .ic{border-color:var(--gold);color:var(--gold2)}
  .steps li.done{color:var(--txt)}
  .steps li.done .ic{background:var(--green);border-color:var(--green);color:#08130c;font-weight:900}
  .spin{width:14px;height:14px;border-radius:50%;border:2px solid rgba(242,201,76,.25);border-top-color:var(--gold2);animation:sp 0.8s linear infinite}
  @keyframes sp{to{transform:rotate(360deg)}}
  .chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}
  .chip{display:inline-flex;align-items:center;gap:8px;background:#0f0f12;border:1px solid var(--line);border-radius:999px;padding:6px 12px 6px 7px;font-size:13px;color:var(--mut)}
  .chip img{width:16px;height:16px;border-radius:4px}
  .chip.ok{color:var(--txt);border-color:#2c4636}
  /* Reporte */
  .scoreRow{display:flex;gap:22px;align-items:center;flex-wrap:wrap}
  .ring{position:relative;width:168px;height:168px;flex:0 0 168px}
  .ring svg{transform:rotate(-90deg)}
  .ring .num{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
  .ring .num b{font-size:44px;line-height:1}
  .ring .num span{font-size:12px;color:var(--mut);letter-spacing:.1em;text-transform:uppercase}
  .grade{font-size:15px;color:var(--gold2);font-weight:800}
  .bars{display:grid;gap:12px;margin-top:8px}
  .bar label{display:flex;justify-content:space-between;margin:0 0 5px;text-transform:none;letter-spacing:0;font-size:13px;color:var(--txt)}
  .track{height:10px;background:#222228;border-radius:999px;overflow:hidden}
  .fill{height:100%;background:linear-gradient(90deg,var(--gold),var(--gold2));border-radius:999px}
  .pages{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
  @media(max-width:700px){.pages{grid-template-columns:1fr}}
  .pageCard{background:var(--panel2);border:1px solid var(--line);border-radius:14px;padding:14px}
  .pageCard b{font-size:22px}
  .finding{border:1px solid var(--line);border-left:4px solid var(--amber);background:var(--panel2);border-radius:14px;padding:16px;margin-bottom:12px}
  .finding.crit{border-left-color:var(--red)}
  .finding h4{font-size:16px;margin:6px 0 8px}
  .tags{display:flex;gap:6px;flex-wrap:wrap}
  .tag{font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;border-radius:999px;padding:3px 9px;border:1px solid var(--line);color:var(--mut)}
  .tag.sev-crit{background:#3a1416;color:#ff9d9d;border-color:#6e2126}
  .tag.sev-mej{background:#3a2c12;color:#ffd28a;border-color:#6b5316}
  .finding p{font-size:14px;color:#d8d3c8}
  .finding .lbl{font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--gold2);margin-top:10px}
  .waFloat{position:fixed;right:18px;bottom:18px;z-index:50;width:58px;height:58px;border-radius:50%;background:#22c064;display:none;align-items:center;justify-content:center;box-shadow:0 8px 24px rgba(0,0,0,.45);text-decoration:none}
  .waFloat svg{width:30px;height:30px;fill:#fff}
  .foot{color:var(--mut);font-size:12px;text-align:center;margin-top:8px}
  .hidden{display:none!important}
</style>
</head>
<body>
<div class="wrap">
  <header class="top">
    <div class="brand"><div class="mark">X</div><div>Xorbit 360<small>Diagnóstico de Conversión</small></div></div>
    <a class="btn ghost" href="#agenda" id="topAgenda">Agendar llamada</a>
  </header>

  <!-- 1. Formulario -->
  <section id="viewForm">
    <div class="card">
      <h1>Tu tienda puede estar <span class="hl">perdiendo ventas</span> sin que lo notes.</h1>
      <p class="sub">Pega la dirección de tu tienda y en pocos minutos recibes tu puntaje de conversión, las fugas que detectamos con evidencia real de tu página y qué corregir primero. Gratis y sin compromiso.</p>
      <form id="formDiag" autocomplete="off">
        <label for="storeUrl">La dirección de tu tienda o página de ventas</label>
        <input id="storeUrl" name="storeUrl" type="text" inputmode="url" placeholder="https://tutienda.com" required />
        <div class="grid2">
          <div><label for="name">Tu nombre</label><input id="name" name="name" type="text" placeholder="Ej: Laura" required /></div>
          <div><label for="whatsapp">Tu WhatsApp</label><input id="whatsapp" name="whatsapp" type="tel" placeholder="Ej: 3001234567" required /></div>
        </div>
        <div style="margin-top:20px"><button class="btn" id="btnAnalyze" type="submit">Analizar mi tienda gratis</button></div>
        <p class="note">Revisamos únicamente tu página pública (inicio y, si existen, tu colección y un producto). No necesitamos acceso a tu cuenta ni a tu panel. Tus datos solo se usan para mostrarte el resultado y, si lo pides, agendar tu llamada.</p>
        <div class="err" id="formError"></div>
      </form>
    </div>
    <div class="card">
      <h3 style="margin-bottom:8px">¿Qué revisa el diagnóstico?</h3>
      <p class="sub" style="font-size:14px">Velocidad y seguridad de carga, adaptación a celular, claridad de tu titular y de tu oferta, precios visibles, señales de confianza (envíos, devoluciones, garantía) y qué tan fácil es escribirte o comprarte por WhatsApp. Cada problema que encontremos llega con la evidencia: lo que vimos en tu página, no opiniones.</p>
    </div>
  </section>

  <!-- 2. Progreso -->
  <section id="viewProgress" class="hidden">
    <div class="card">
      <h2 style="font-size:22px;margin-bottom:4px">Analizando tu tienda</h2>
      <p class="sub" style="font-size:14px;margin-top:2px">Estamos revisando tu página de verdad; cada paso se marca cuando termina en el servidor.</p>
      <ul class="steps" id="stepsList">
        <li data-phase="capturing"><span class="ic"></span><span>Capturando las páginas de tu tienda</span></li>
        <li data-phase="measuring"><span class="ic"></span><span>Midiendo velocidad y rendimiento</span></li>
        <li data-phase="analyzing"><span class="ic"></span><span>Revisando cada sección: oferta, confianza y contacto</span></li>
        <li data-phase="scoring"><span class="ic"></span><span>Calculando tu puntaje de conversión</span></li>
        <li data-phase="ai"><span class="ic"></span><span>Redactando tu diagnóstico y recomendaciones</span></li>
      </ul>
      <div class="chips" id="pageChips"></div>
      <div class="err" id="progressError"></div>
    </div>
  </section>

  <!-- 3. Reporte -->
  <section id="viewReport" class="hidden">
    <div class="card">
      <p class="note" style="margin:0" id="reportMeta"></p>
      <h2 style="font-size:26px;margin:6px 0 16px" id="reportTitle"></h2>
      <div class="scoreRow">
        <div class="ring">
          <svg width="168" height="168" viewBox="0 0 168 168">
            <circle cx="84" cy="84" r="74" stroke="#26262c" stroke-width="12" fill="none"/>
            <circle id="ringFill" cx="84" cy="84" r="74" stroke="#d4a017" stroke-width="12" fill="none" stroke-linecap="round" stroke-dasharray="465" stroke-dashoffset="465"/>
          </svg>
          <div class="num"><b id="scoreNum">0</b><span>sobre 100</span></div>
        </div>
        <div style="flex:1;min-width:230px">
          <div class="grade" id="gradeText"></div>
          <p class="sub" style="font-size:14px;margin-top:6px" id="aiResumen"></p>
          <div class="bars" id="blockBars"></div>
        </div>
      </div>
    </div>

    <div class="card">
      <h3 style="margin-bottom:12px">Tus páginas, una por una</h3>
      <div class="pages" id="pageCards"></div>
      <p class="note" id="pagesNote"></p>
    </div>

    <div class="card">
      <h3 style="margin-bottom:4px">Esto es lo que te está costando ventas</h3>
      <p class="sub" style="font-size:14px;margin:2px 0 14px">Ordenado por impacto: empieza por la fuga número 1.</p>
      <div id="findingsList"></div>
      <p class="note" id="noFindings" class="hidden">No detectamos fugas importantes en lo que pudimos revisar. Mantén el ritmo y revisa de nuevo cuando cambies tu oferta.</p>
    </div>

    <div class="card" id="agenda">
      <h3 style="margin-bottom:6px">Agenda tu llamada de optimización</h3>
      <p class="sub" style="font-size:14px;margin-top:2px">En 20 minutos revisamos contigo estas fugas y te decimos exactamente qué cambiar primero. Sin costo y sin compromiso.</p>
      <form id="formAgenda" autocomplete="off">
        <div class="grid2">
          <div><label for="agDate">Fecha que prefieres</label><input id="agDate" type="date" required /></div>
          <div><label for="agTime">Hora (Colombia)</label><input id="agTime" type="time" required /></div>
        </div>
        <div style="margin-top:18px;display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn" id="btnSchedule" type="submit">Agendar mi llamada</button>
          <a class="btn wa hidden" id="waAfter" target="_blank" rel="noopener">Confirmar también por WhatsApp</a>
        </div>
        <div class="err" id="agendaError"></div>
        <p class="note hidden" id="agendaOk" style="color:var(--green);font-weight:700"></p>
      </form>
    </div>
    <p class="foot">Diagnóstico automático de Xorbit 360 sobre tu página pública · No reemplaza una auditoría manual completa.</p>
  </section>
</div>

<a class="waFloat" id="waFloat" target="_blank" rel="noopener" aria-label="Escríbenos por WhatsApp">
  <svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5.1-1.3A10 10 0 1 0 12 2zm0 18.2c-1.6 0-3.1-.4-4.4-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.6-6.1c-.3-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4 0-.5.2-.7l.5-.6c.1-.2.1-.4 0-.5l-.8-1.9c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.9.9-1.1 2.2-.2 3.9a11.6 11.6 0 0 0 4.5 4.2c1.7.8 2.4.9 3.2.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2 0-.1-.2-.2-.5-.3z"/></svg>
</a>

<script>
(function(){
  var $ = function(id){ return document.getElementById(id); };
  var state = { jobId:null, leadId:null, whatsappUrl:null, storeUrl:'', name:'', whatsapp:'' };
  var PHASES = ['capturing','measuring','analyzing','scoring','ai'];
  var PHASE_LABEL = { capturing:'Capturando las páginas de tu tienda', measuring:'Midiendo velocidad y rendimiento', analyzing:'Revisando cada sección: oferta, confianza y contacto', scoring:'Calculando tu puntaje de conversión', ai:'Redactando tu diagnóstico y recomendaciones' };

  fetch('/api/public/diagnostic/config').then(function(r){ return r.json(); }).then(function(j){
    if (j && j.whatsappUrl) { state.whatsappUrl = j.whatsappUrl; var f = $('waFloat'); f.href = j.whatsappUrl; f.style.display = 'flex'; }
  }).catch(function(){});

  function showErr(id, msg){ var e = $(id); e.textContent = msg; e.style.display = msg ? 'block' : 'none'; }

  function setSteps(step, pages){
    var idx = PHASES.indexOf(step);
    var lis = document.querySelectorAll('#stepsList li');
    lis.forEach(function(li, i){
      var ic = li.querySelector('.ic');
      li.classList.remove('active','done');
      ic.innerHTML = '';
      if (step === 'done' || i < idx) { li.classList.add('done'); ic.innerHTML = '✓'; }
      else if (i === idx) { li.classList.add('active'); ic.innerHTML = '<span class="spin"></span>'; }
    });
    if (pages && pages.length) {
      var chips = $('pageChips'); chips.innerHTML = '';
      pages.forEach(function(p){
        var d = document.createElement('span'); d.className = 'chip ok';
        var host = p.url.replace(/^https?:\\/\\//,'').split('/')[0];
        d.innerHTML = '<img src="https://' + host + '/favicon.ico" onerror="this.remove()" alt="">' + (p.kind==='home'?'Inicio':p.kind==='collection'?'Colección':'Producto') + ' · revisada';
        chips.appendChild(d);
      });
    }
  }

  function poll(){
    fetch('/api/public/diagnostic/jobs/' + state.jobId).then(function(r){ return r.json(); }).then(function(j){
      if (!j || !j.success) { showErr('progressError', (j && j.error) || 'El análisis se interrumpió. Inténtalo de nuevo.'); return; }
      setSteps(j.step, j.pages || []);
      if (j.step === 'done' && j.result) { state.leadId = j.leadId; renderReport(j.result); return; }
      if (j.step === 'error') { showErr('progressError', j.error || 'No pudimos analizar tu tienda.'); return; }
      setTimeout(poll, 900);
    }).catch(function(){ setTimeout(poll, 1500); });
  }

  $('formDiag').addEventListener('submit', function(ev){
    ev.preventDefault();
    showErr('formError','');
    state.storeUrl = $('storeUrl').value.trim();
    state.name = $('name').value.trim();
    state.whatsapp = $('whatsapp').value.trim();
    var btn = $('btnAnalyze'); btn.disabled = true; btn.textContent = 'Empezando…';
    fetch('/api/public/diagnostic/analyze', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ storeUrl: state.storeUrl, name: state.name, whatsapp: state.whatsapp }) })
      .then(function(r){ return r.json(); })
      .then(function(j){
        btn.disabled = false; btn.textContent = 'Analizar mi tienda gratis';
        if (!j || !j.success) { showErr('formError', (j && j.error) || 'Revisa los datos e inténtalo de nuevo.'); return; }
        state.jobId = j.jobId;
        $('viewForm').classList.add('hidden');
        $('viewReport').classList.add('hidden');
        $('viewProgress').classList.remove('hidden');
        setSteps('capturing', []);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        poll();
      })
      .catch(function(){ btn.disabled = false; btn.textContent = 'Analizar mi tienda gratis'; showErr('formError','Sin conexión. Revisa tu internet e inténtalo de nuevo.'); });
  });

  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]; }); }
  function fmtDate(iso){ try { return new Date(iso).toLocaleDateString('es-CO', { day:'numeric', month:'long', year:'numeric' }); } catch(e){ return ''; } }

  function renderReport(r){
    $('viewProgress').classList.add('hidden');
    $('viewReport').classList.remove('hidden');
    $('reportMeta').textContent = r.domain + ' · ' + fmtDate(r.analyzedAt);
    var n = r.findings.length;
    $('reportTitle').textContent = n ? ('Encontramos ' + n + ' problema' + (n === 1 ? '' : 's') + ' que te ' + (n === 1 ? 'cuesta' : 'cuestan') + ' ventas') : 'Tu tienda se ve sana en lo que revisamos';
    var CIRC = 465;
    $('ringFill').style.strokeDashoffset = String(Math.round(CIRC - (CIRC * Math.max(0, Math.min(100, r.score)) / 100)));
    $('scoreNum').textContent = r.score;
    $('gradeText').textContent = 'Calificación ' + r.grade + ' · ' + r.gradeLabel;
    $('aiResumen').textContent = r.aiResumen || '';
    var bars = $('blockBars'); bars.innerHTML = '';
    r.blocks.forEach(function(b){
      var d = document.createElement('div');
      d.innerHTML = '<label><span>' + esc(b.label) + '</span><b>' + b.score + '/100</b></label><div class="track"><div class="fill" style="width:' + b.score + '%"></div></div>';
      bars.appendChild(d);
    });
    var pc = $('pageCards'); pc.innerHTML = '';
    r.pageScores.forEach(function(p){
      var d = document.createElement('div'); d.className = 'pageCard';
      d.innerHTML = '<div style="font-size:12px;color:var(--mut);text-transform:uppercase;letter-spacing:.08em;font-weight:800">' + esc(p.label) + '</div><b>' + p.score + '</b><span style="color:var(--mut)"> /100</span><div style="font-size:12px;color:var(--mut);margin-top:6px;word-break:break-word">' + esc(p.note) + '</div>';
      pc.appendChild(d);
    });
    $('pagesNote').textContent = r.pagesNote || '';
    var fl = $('findingsList'); fl.innerHTML = '';
    $('noFindings').style.display = n ? 'none' : 'block';
    r.findings.forEach(function(f, i){
      var d = document.createElement('div'); d.className = 'finding' + (f.severity === 'critico' ? ' crit' : '');
      d.innerHTML =
        '<div class="tags"><span class="tag">Tu fuga de dinero #' + (i + 1) + '</span>' +
        '<span class="tag ' + (f.severity === 'critico' ? 'sev-crit' : 'sev-mej') + '">' + (f.severity === 'critico' ? 'Crítico' : 'Mejorable') + '</span>' +
        '<span class="tag">' + esc(f.category) + '</span></div>' +
        '<h4>' + esc(f.title) + '</h4>' +
        '<div class="lbl">Lo que vemos</div><p>' + esc(f.evidence) + '</p>' +
        '<div class="lbl">Por qué te cuesta ventas</div><p>' + esc(f.impact) + '</p>';
      fl.appendChild(d);
    });
    var today = new Date(); var iso = today.toISOString().slice(0,10);
    $('agDate').min = iso; if (!$('agDate').value) $('agDate').value = iso;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  $('formAgenda').addEventListener('submit', function(ev){
    ev.preventDefault();
    showErr('agendaError','');
    var btn = $('btnSchedule'); btn.disabled = true; btn.textContent = 'Agendando…';
    fetch('/api/public/diagnostic/schedule', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ leadId: state.leadId, name: state.name, whatsapp: state.whatsapp, preferredDate: $('agDate').value, preferredTime: $('agTime').value }) })
      .then(function(r){ return r.json(); })
      .then(function(j){
        btn.disabled = false; btn.textContent = 'Agendar mi llamada';
        if (!j || !j.success) { showErr('agendaError', (j && j.error) || 'No pudimos agendar. Inténtalo de nuevo.'); return; }
        var ok = $('agendaOk');
        ok.textContent = 'Listo: tu llamada quedó agendada. Te escribimos por WhatsApp para confirmar.';
        ok.classList.remove('hidden');
        if (state.whatsappUrl) { var b = $('waAfter'); b.href = state.whatsappUrl; b.classList.remove('hidden'); }
      })
      .catch(function(){ btn.disabled = false; btn.textContent = 'Agendar mi llamada'; showErr('agendaError','Sin conexión. Inténtalo de nuevo.'); });
  });
})();
</script>
</body>
</html>`;
}

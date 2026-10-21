/**
 * XORBIT 360 - Main Website Application Controller
 * xorbit360.com - 100% en Español
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Header scroll effect
  const siteHeader = document.querySelector('.site-header');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 30) {
      siteHeader.classList.add('scrolled');
    } else {
      siteHeader.classList.remove('scrolled');
    }
  });

  // 2. Mobile menu toggle with auto-close on link click and outside click
  const mobileToggle = document.getElementById('mobileMenuToggle');
  const navMenu = document.querySelector('.nav-menu');
  if (mobileToggle && navMenu) {
    mobileToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      navMenu.classList.toggle('active');
    });

    // Cerrar al hacer clic en cualquier enlace
    navMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('active');
      });
    });

    // Cerrar al hacer clic fuera del menú
    document.addEventListener('click', (e) => {
      if (!navMenu.contains(e.target) && !mobileToggle.contains(e.target)) {
        navMenu.classList.remove('active');
      }
    });
  }

  // 3. Strategic Pillars Tabs ("Captura", "Convierte", "Retén")
  const pillarTabs = document.querySelectorAll('.pillar-tab-card');
  const routingFlowDemo = document.getElementById('pillarRoutingFlow');

  const pillarVisualData = {
    captura: `
      <div class="routing-flow-demo">
        <div class="flow-node-card">
          <span style="font-size: 1.3rem;">🌐</span>
          <div>
            <div style="font-weight: 700; color: #fff;">Entrada Omnicanal Unificada</div>
            <div style="font-size: 0.78rem; color: #94a3b8;">WhatsApp • Tienda Shopify • Live en Landing • Redes</div>
          </div>
        </div>
        <div class="flow-connector"></div>
        <div class="flow-node-card" style="border-color: rgba(59, 130, 246, 0.5); background: rgba(59, 130, 246, 0.1);">
          <span style="font-size: 1.3rem;">🤖</span>
          <div>
            <div style="font-weight: 700; color: #60a5fa;">Calificación Automática con IA</div>
            <div style="font-size: 0.78rem; color: #bfdbfe;">Detecta intención de compra en menos de 2 segundos</div>
          </div>
        </div>
      </div>
    `,
    convierte: `
      <div class="routing-flow-demo">
        <div class="flow-node-card">
          <span style="font-size: 1.3rem;">💬</span>
          <div>
            <div style="font-weight: 700; color: #fff;">Prospecto con Alta Intención</div>
            <div style="font-size: 0.78rem; color: #94a3b8;">Cliente listo para compra inmediata</div>
          </div>
        </div>
        <div class="flow-connector"></div>
        <div class="flow-node-card" style="border-color: rgba(139, 92, 246, 0.5); background: rgba(139, 92, 246, 0.1);">
          <span style="font-size: 1.3rem;">⚡</span>
          <div>
            <div style="font-weight: 700; color: #c084fc;">Enrutamiento + Agente de Voz Telefónico</div>
            <div style="font-size: 0.78rem; color: #e9d5ff;">Asignación de asesor o confirmación telefónica automática</div>
          </div>
        </div>
        <div class="flow-connector"></div>
        <div class="flow-agents-row">
          <div class="flow-node-card" style="padding: 8px 14px; font-size: 0.78rem;">
            🛒 Pago Contra Entrega Sincronizado
          </div>
          <div class="flow-node-card" style="padding: 8px 14px; font-size: 0.78rem;">
            📞 Llamada de Voz IA con Dropi/Mastershop
          </div>
        </div>
      </div>
    `,
    reten: `
      <div class="routing-flow-demo">
        <div class="flow-node-card">
          <span style="font-size: 1.3rem;">📦</span>
          <div>
            <div style="font-weight: 700; color: #fff;">Pedido Entregado con Éxito</div>
            <div style="font-size: 0.78rem; color: #94a3b8;">Integración con 99envíos & Effix</div>
          </div>
        </div>
        <div class="flow-connector"></div>
        <div class="flow-node-card" style="border-color: rgba(16, 185, 129, 0.5); background: rgba(16, 185, 129, 0.1);">
          <span style="font-size: 1.3rem;">🔄</span>
          <div>
            <div style="font-weight: 700; color: #34d399;">Campaña de Recompra Automática</div>
            <div style="font-size: 0.78rem; color: #a7f3d0;">Oferta personalizada a los 15-20 días por WhatsApp</div>
          </div>
        </div>
      </div>
    `
  };

  pillarTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      pillarTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const pillarKey = tab.getAttribute('data-pillar');
      if (routingFlowDemo && pillarVisualData[pillarKey]) {
        routingFlowDemo.innerHTML = pillarVisualData[pillarKey];
      }
    });
  });

  // 4. FAQ Accordion
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const questionBtn = item.querySelector('.faq-question-btn');
    if (questionBtn) {
      questionBtn.addEventListener('click', () => {
        const isOpen = item.classList.contains('open');
        faqItems.forEach(f => f.classList.remove('open'));
        if (!isOpen) {
          item.classList.add('open');
        }
      });
    }
  });

  // 5. Conmutador de Facturación y Planes (Starter $19, Standard $33, Pro $69, Enterprise $319)
  const billingSwitch = document.getElementById('billingSwitch');
  const priceAmounts = document.querySelectorAll('.price-amount');
  const pricePeriods = document.querySelectorAll('.price-period');

  const pricingData = {
    monthly: [
      { amount: '19.00', period: '/mes' },
      { amount: '33.00', period: '/mes' },
      { amount: '69.00', period: '/mes' },
      { amount: '319.00', period: '/mes' }
    ],
    annual: [
      { amount: '15.20', period: '/mes (Facturado Anual -20%)' },
      { amount: '26.40', period: '/mes (Facturado Anual -20%)' },
      { amount: '55.20', period: '/mes (Facturado Anual -20%)' },
      { amount: '255.20', period: '/mes (Facturado Anual -20%)' }
    ]
  };

  if (billingSwitch) {
    billingSwitch.addEventListener('click', () => {
      billingSwitch.classList.toggle('active');
      const isAnnual = billingSwitch.classList.contains('active');
      const currentPlan = isAnnual ? pricingData.annual : pricingData.monthly;

      priceAmounts.forEach((el, index) => {
        if (currentPlan[index]) el.textContent = currentPlan[index].amount;
      });

      pricePeriods.forEach((el, index) => {
        if (currentPlan[index]) el.textContent = currentPlan[index].period;
      });
    });
  }

  // 7. Lead Modal ("Prueba Gratis" / "Habla con Ventas")
  const leadModal = document.getElementById('leadCaptureModal');
  const modalOpeners = document.querySelectorAll('.open-lead-modal');
  const modalClose = document.getElementById('closeLeadModal');
  const leadForm = document.getElementById('leadCaptureForm');

  modalOpeners.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (leadModal) leadModal.classList.add('active');
    });
  });

  if (modalClose && leadModal) {
    modalClose.addEventListener('click', () => {
      leadModal.classList.remove('active');
    });
  }

  if (leadModal) {
    leadModal.addEventListener('click', (e) => {
      if (e.target === leadModal) {
        leadModal.classList.remove('active');
      }
    });
  }

  if (leadForm) {
    leadForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const submitBtn = leadForm.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.innerHTML = '¡Acceso Concedido! Redirigiendo...';
        submitBtn.style.background = '#10b981';
      }
      setTimeout(() => {
        alert('¡Bienvenido a Xorbit 360! Un especialista se comunicará por WhatsApp de inmediato.');
        if (leadModal) leadModal.classList.remove('active');
      }, 1200);
    });
  }

  // 8. Floating Chat Widget Assistant (Xorbit Assistant)
  const floatingTrigger = document.getElementById('floatingChatTrigger');
  if (floatingTrigger) {
    floatingTrigger.addEventListener('click', () => {
      const crmSection = document.getElementById('crm-demo-section');
      if (crmSection) {
        crmSection.scrollIntoView({ behavior: 'smooth' });
        const tourModal = document.getElementById('crmInteractiveModal');
        if (tourModal) tourModal.classList.add('hidden');
      }
    });
  }
});

// 9. Pestañas de pilares del ecosistema
(function() {
  const tabs = document.querySelectorAll(".pillar-tab");
  if (!tabs.length) return;
  tabs.forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".pillar-tab").forEach(b => {
        b.classList.remove("active");
        b.setAttribute("aria-selected", "false");
      });
      document.querySelectorAll(".pillar-panel").forEach(p => p.classList.remove("active"));
      btn.classList.add("active");
      btn.setAttribute("aria-selected", "true");
      const panel = document.querySelector(`.pillar-panel[data-pillar="${btn.dataset.pillar}"]`);
      if (panel) panel.classList.add("active");
    });
  });
})();

// 10. Demos colapsables en móvil (página más rápida, el usuario elige ver)
(function() {
  if (window.innerWidth > 640) return;
  var demos = [
    { sel: '.crm-showcase-wrapper', label: 'Ver demo del CRM en vivo' },
    { sel: '.voice-simulator-card', label: 'Ver demo de llamada con IA' },
    { sel: '.live-selling-preview', label: 'Ver demo de Live Selling' },
    { sel: '.niche-detail-grid', label: 'Probar simulador de mi nicho' }
  ];
  demos.forEach(function(d) {
    var el = document.querySelector(d.sel);
    if (!el || el.dataset.mobileToggle) return;
    el.dataset.mobileToggle = '1';
    var btn = document.createElement('button');
    btn.className = 'mobile-demo-toggle';
    btn.type = 'button';
    var update = function(open) {
      el.style.display = open ? '' : 'none';
      btn.innerHTML = (open ? '&#9660; ' : '&#9654; ') + d.label;
      btn.classList.toggle('open', open);
    };
    btn.addEventListener('click', function() {
      update(el.style.display === 'none');
    });
    el.parentNode.insertBefore(btn, el);
    update(false);
  });
})();

// --- Registro: la ruta /register de la web pública lleva al formulario real
// del CRM conservando referido/plan, y el ?ref= de cualquier landing se
// propaga a los botones de registro (p. ej. enlaces de ferias/aliados).
(function () {
  try {
    var params = new URLSearchParams(window.location.search);
    var path = window.location.pathname.replace(/\/+$/, '');
    if (path === '/register' || path === '/registro') {
      var qs = params.toString();
      window.location.replace('https://crm.xorbit360.com/?view=register' + (qs ? '&' + qs : ''));
      return;
    }
    var ref = params.get('ref');
    if (ref) {
      document.querySelectorAll('a[href*="crm.xorbit360.com/?view=register"]').forEach(function (a) {
        try {
          var u = new URL(a.href);
          if (!u.searchParams.get('ref')) { u.searchParams.set('ref', ref); a.href = u.toString(); }
        } catch (e) {}
      });
    }
  } catch (e) {}
})();

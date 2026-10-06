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

  // 2. Mobile menu toggle
  const mobileToggle = document.getElementById('mobileMenuToggle');
  const navMenu = document.querySelector('.nav-menu');
  if (mobileToggle && navMenu) {
    mobileToggle.addEventListener('click', () => {
      navMenu.classList.toggle('active');
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

  // 6. Calculadora de Canales Adicionales ($3 USD / canal)
  const addonCheckboxes = document.querySelectorAll('.addon-channel-check');
  const totalChannelsDisplay = document.getElementById('totalChannelsAddonPrice');

  function calculateAddon() {
    let checkedCount = 0;
    addonCheckboxes.forEach(cb => {
      if (cb.checked) checkedCount++;
    });
    const extraTotal = checkedCount * 3;
    if (totalChannelsDisplay) {
      totalChannelsDisplay.textContent = extraTotal === 0 ? '+$0 USD' : `+$${extraTotal} USD / mes (${checkedCount} canales)`;
    }
  }

  addonCheckboxes.forEach(cb => {
    cb.addEventListener('change', calculateAddon);
  });

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

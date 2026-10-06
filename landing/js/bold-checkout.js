/**
 * Xorbit 360 - Integración Oficial Pasarela de Pagos Bold
 * Manejador del Modal de Checkout, cálculo de paquetes de IA y disparo de BoldCheckout
 */

(function () {
  'use strict';

  // Configuración de Paquetes de Recarga IA (No mensualidades, acceso total al ecosistema)
  const PACKAGES = {
    starter: {
      id: 'starter',
      name: 'Paquete Starter',
      conversations: 500,
      msgsPerConv: 25,
      priceUsd: 19,
      priceCop: 76000
    },
    standard: {
      id: 'standard',
      name: 'Paquete Standard',
      conversations: 1000,
      msgsPerConv: 40,
      priceUsd: 33,
      priceCop: 132000
    },
    pro: {
      id: 'pro',
      name: 'Paquete Pro',
      conversations: 3000,
      msgsPerConv: 50,
      priceUsd: 69,
      priceCop: 276000
    },
    enterprise: {
      id: 'enterprise',
      name: 'Paquete Enterprise',
      conversations: 20000,
      msgsPerConv: 65,
      priceUsd: 319,
      priceCop: 1276000
    }
  };

  const CHANNEL_ADDON_PRICE_USD = 3;
  const CHANNEL_ADDON_PRICE_COP = 12000;

  // Estado del Checkout actual
  let currentSelection = {
    packageId: 'pro',
    channelsExtraCount: 0,
    isSandbox: false
  };

  // Elementos DOM
  const modal = document.getElementById('boldCheckoutModal');
  const closeBtn = document.getElementById('closeBoldModal');
  const form = document.getElementById('boldCheckoutForm');
  const packageSelect = document.getElementById('checkoutPackageSelect');
  const channelsExtraInput = document.getElementById('checkoutExtraChannels');
  const sandboxCheckbox = document.getElementById('checkoutSandboxToggle');
  const payBtn = document.getElementById('btnSubmitBoldPayment');
  const payBtnAmountSpan = document.getElementById('boldBtnAmountText');
  const summaryConvSpan = document.getElementById('summaryConversationsText');
  const summaryMsgsSpan = document.getElementById('summaryMsgsText');
  const summaryTotalUsdSpan = document.getElementById('summaryTotalUsd');
  const summaryTotalCopSpan = document.getElementById('summaryTotalCop');

  if (!modal || !form) {
    console.warn('[Bold Checkout] Modal o formulario no encontrado en el DOM.');
    return;
  }

  // Formateador de moneda en pesos colombianos
  function formatCOP(num) {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(num);
  }

  // Actualizar totales y resumen visual
  function updateCalculations() {
    const pkg = PACKAGES[currentSelection.packageId] || PACKAGES.pro;
    const extraChannels = parseInt(currentSelection.channelsExtraCount, 10) || 0;

    const totalUsd = pkg.priceUsd + (extraChannels * CHANNEL_ADDON_PRICE_USD);
    const totalCop = pkg.priceCop + (extraChannels * CHANNEL_ADDON_PRICE_COP);

    if (summaryConvSpan) summaryConvSpan.textContent = pkg.conversations.toLocaleString() + ' conversaciones';
    if (summaryMsgsSpan) summaryMsgsSpan.textContent = pkg.msgsPerConv + ' msgs promedio/conv';
    if (summaryTotalUsdSpan) summaryTotalUsdSpan.textContent = `$${totalUsd}.00 USD`;
    if (summaryTotalCopSpan) summaryTotalCopSpan.textContent = formatCOP(totalCop);
    if (payBtnAmountSpan) payBtnAmountSpan.textContent = formatCOP(totalCop);
  }

  // Abrir Modal con paquete preseleccionado
  window.openBoldCheckout = function (packageId) {
    if (packageId && PACKAGES[packageId]) {
      currentSelection.packageId = packageId;
      if (packageSelect) packageSelect.value = packageId;
    }
    updateCalculations();
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  };

  // Cerrar Modal
  function closeCheckoutModal() {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }

  if (closeBtn) closeBtn.addEventListener('click', closeCheckoutModal);

  modal.addEventListener('click', function (e) {
    if (e.target === modal) closeCheckoutModal();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      closeCheckoutModal();
    }
  });

  // Event Listeners de los controles
  if (packageSelect) {
    packageSelect.addEventListener('change', function () {
      currentSelection.packageId = this.value;
      updateCalculations();
    });
  }

  if (channelsExtraInput) {
    channelsExtraInput.addEventListener('change', function () {
      currentSelection.channelsExtraCount = parseInt(this.value, 10) || 0;
      updateCalculations();
    });
  }

  if (sandboxCheckbox) {
    sandboxCheckbox.addEventListener('change', function () {
      currentSelection.isSandbox = this.checked;
      updateCalculations();
    });
  }

  // Interceptar botones de selección de paquetes en toda la página
  document.querySelectorAll('[data-buy-package]').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      const pkgKey = this.getAttribute('data-buy-package');
      window.openBoldCheckout(pkgKey);
    });
  });

  // Procesar pago con Bold
  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    const name = document.getElementById('custName').value.trim();
    const email = document.getElementById('custEmail').value.trim();
    const phone = document.getElementById('custPhone').value.trim();
    const docType = document.getElementById('custDocType').value;
    const docNumber = document.getElementById('custDocNumber').value.trim();

    if (!name || !email || !phone || !docNumber) {
      alert('Por favor completa todos los campos requeridos para procesar el pago de forma segura.');
      return;
    }

    const pkg = PACKAGES[currentSelection.packageId] || PACKAGES.pro;
    const extraChannels = parseInt(currentSelection.channelsExtraCount, 10) || 0;
    const totalCop = pkg.priceCop + (extraChannels * CHANNEL_ADDON_PRICE_COP);
    const totalUsd = pkg.priceUsd + (extraChannels * CHANNEL_ADDON_PRICE_USD);

    // Cambiar estado del botón a cargando
    const originalBtnHtml = payBtn.innerHTML;
    payBtn.disabled = true;
    payBtn.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; gap: 8px;">
        <span class="bold-spinner"></span>
        <span>Conectando con Pasarela Bold...</span>
      </div>
    `;

    try {
      // 1. Solicitar firma de integridad al backend seguro
      const response = await fetch('/api/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId: pkg.id,
          packageName: pkg.name,
          conversations: pkg.conversations,
          msgsPerConv: pkg.msgsPerConv,
          channelsCount: 1 + extraChannels,
          amountUsd: totalUsd,
          amountCop: totalCop,
          isSandbox: currentSelection.isSandbox,
          customer: {
            name: name,
            email: email,
            phone: phone,
            docType: docType,
            docNumber: docNumber
          }
        })
      });

      const paymentData = await response.json();

      if (!response.ok || !paymentData.success) {
        throw new Error(paymentData.error || 'Error al inicializar la pasarela de pagos.');
      }

      // Guardar en sessionStorage para confirmación post-redirección
      try {
        sessionStorage.setItem('xorbit_last_order', JSON.stringify({
          orderId: paymentData.orderId,
          packageId: pkg.id,
          packageName: pkg.name,
          conversations: pkg.conversations,
          msgsPerConv: pkg.msgsPerConv,
          amountUsd: totalUsd,
          amountCop: totalCop,
          customer: { name, email, phone, docType, docNumber }
        }));
      } catch (_) {}

      // 2. Verificar que la librería de Bold esté disponible
      if (typeof window.BoldCheckout !== 'function') {
        throw new Error('La pasarela de pagos Bold no ha terminado de cargar. Por favor espera unos segundos y vuelve a intentar.');
      }

      // 3. Instanciar BoldCheckout con la firma SHA-256 calculada
      const boldCheckout = new window.BoldCheckout({
        orderId: paymentData.orderId,
        currency: paymentData.currency,
        amount: paymentData.amount,
        apiKey: paymentData.apiKey,
        integritySignature: paymentData.integritySignature,
        description: paymentData.description,
        renderMode: 'embedded',
        redirectionUrl: paymentData.redirectionUrl
      });

      // 4. Desplegar la pasarela embebida de Bold
      boldCheckout.open();

      // Cerrar nuestro modal para dar paso a la pasarela
      closeCheckoutModal();

    } catch (err) {
      console.error('[Bold Checkout Error]', err);
      alert('Error al conectar con la pasarela: ' + err.message);
    } finally {
      payBtn.disabled = false;
      payBtn.innerHTML = originalBtnHtml;
    }
  });

  // Modal de Éxito / Confirmación de Pago
  const successModal = document.getElementById('paymentSuccessModal');
  const closeSuccessBtn = document.getElementById('closeSuccessModal');
  const dismissSuccessBtn = document.getElementById('btnDismissSuccess');
  const successOrderSpan = document.getElementById('successOrderRef');
  const successEmailSpan = document.getElementById('successCustomerEmail');
  const successPassSpan = document.getElementById('successCustomerPass');
  const btnCopyPass = document.getElementById('btnCopyPass');
  const btnGoToCrm = document.getElementById('btnGoToCrmSubdomain');

  if (btnCopyPass && successPassSpan) {
    btnCopyPass.addEventListener('click', function () {
      const pass = successPassSpan.textContent.trim();
      navigator.clipboard.writeText(pass).then(() => {
        btnCopyPass.textContent = '¡Copiado!';
        setTimeout(() => { btnCopyPass.textContent = 'Copiar'; }, 2500);
      });
    });
  }

  function openSuccessModal(orderId, customerInfo, appLoginUrl) {
    if (successOrderSpan) successOrderSpan.textContent = orderId || 'Completado';
    if (customerInfo && customerInfo.email && successEmailSpan) {
      successEmailSpan.textContent = customerInfo.email;
    }
    if (customerInfo && customerInfo.tempPassword && successPassSpan) {
      successPassSpan.textContent = customerInfo.tempPassword;
    }
    if (btnGoToCrm) {
      const emailParam = customerInfo?.email ? encodeURIComponent(customerInfo.email) : '';
      btnGoToCrm.href = appLoginUrl || `https://crm.xorbit360.com/?email=${emailParam}&auto_login=1&payment_status=completed&order=${encodeURIComponent(orderId || '')}`;
    }

    if (successModal) {
      successModal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeSuccessModal() {
    if (successModal) {
      successModal.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  if (closeSuccessBtn) closeSuccessBtn.addEventListener('click', closeSuccessModal);
  if (dismissSuccessBtn) dismissSuccessBtn.addEventListener('click', closeSuccessModal);
  if (successModal) {
    successModal.addEventListener('click', function (e) {
      if (e.target === successModal) closeSuccessModal();
    });
  }

  // Comprobar si se regresó de Bold con pago completado
  async function checkPaymentReturn() {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment_status');
    const orderId = urlParams.get('order') || urlParams.get('bold-order-id');

    if (paymentStatus === 'completed' || orderId) {
      // Limpiar URL sin recargar para estética limpia
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);

      let customerDetails = { email: 'tu@correo.com', tempPassword: 'Xorbit' + Math.floor(100000 + Math.random() * 900000) + '!' };
      let appLoginUrl = `https://crm.xorbit360.com/?payment_status=completed&order=${encodeURIComponent(orderId || '')}`;

      // Confirmar y registrar en Supabase
      try {
        let cached = {};
        try {
          cached = JSON.parse(sessionStorage.getItem('xorbit_last_order') || '{}');
        } catch (_) {}

        if (cached.customer?.email) {
          customerDetails.email = cached.customer.email;
        }

        const res = await fetch('/api/confirm-recharge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: orderId || cached.orderId,
            packageName: cached.packageName,
            conversations: cached.conversations,
            msgsPerConv: cached.msgsPerConv,
            amountUsd: cached.amountUsd,
            amountCop: cached.amountCop,
            customer: cached.customer
          })
        });

        const data = await res.json();
        if (data.customer) {
          customerDetails = data.customer;
        }
        if (data.appLoginUrl) {
          appLoginUrl = data.appLoginUrl;
        }
      } catch (err) {
        console.warn('[Bold Checkout] Error sincronizando con Supabase:', err);
      }

      openSuccessModal(orderId, customerDetails, appLoginUrl);
    }
  }

  // Inicializar cálculos y comprobar estado de retorno
  updateCalculations();
  checkPaymentReturn();

})();

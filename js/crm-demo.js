/**
 * XORBIT 360 - CRM & WhatsApp Bot Maqueta Interactiva
 * 100% en Español - Inspirado en Respond.io
 */

document.addEventListener('DOMContentLoaded', () => {
  // Datos interactivos de conversaciones simuladas (100% en español)
  const chatConversations = {
    carolina: {
      id: 'carolina',
      name: 'Carolina Morales',
      channel: 'whatsapp',
      channelName: 'WhatsApp Business',
      avatar: 'CM',
      phone: '+57 312 489 9021',
      stage: 'Prospecto Calificado',
      stageColor: '#f59e0b',
      email: 'carolina.morales@gmail.com',
      orderId: '#XOR-8921',
      orderTotal: '$89.00 USD',
      messages: [
        { sender: 'client', time: '10:14 AM', text: '¡Hola! Vi su catálogo en la tienda y me interesa el reloj Smartwatch Titanium. ¿Tienen entrega inmediata?' },
        { sender: 'ai-bot', time: '10:14 AM', text: '¡Hola Carolina! 👋 Sí, tenemos unidades disponibles con despacho prioritario hoy mismo. Además incluye garantía oficial de 12 meses. ¿Te gustaría apartarlo en color Negro Titanio o Plata?' },
        { sender: 'client', time: '10:15 AM', text: 'Me fascina el Negro Titanio. ¿Puedo pagar contra entrega al recibirlo en mi domicilio?' },
        { 
          sender: 'order-card', 
          time: '10:16 AM',
          title: 'Pedido Generado por Asistente IA',
          product: 'Smartwatch Titanium Pro (Negro Titanio)',
          qty: '1 Unidad',
          total: '$89.00 USD',
          shipping: 'Pago Contra Entrega Registrado'
        },
        { sender: 'ai-bot', time: '10:16 AM', text: '¡Excelente decisión! He reservado tu unidad y registrado tu pedido contra entrega. Te acabamos de enviar el comprobante de seguimiento por este chat.' }
      ]
    },
    carlos: {
      id: 'carlos',
      name: 'Carlos Mendoza',
      channel: 'instagram',
      channelName: 'Instagram Direct',
      avatar: 'CM',
      phone: '+52 55 4912 8820',
      stage: 'Nuevo Prospecto',
      stageColor: '#3b82f6',
      email: 'carlos.mendoza@outlook.com',
      orderId: '#XOR-8930',
      orderTotal: '$140.00 USD',
      messages: [
        { sender: 'client', time: '09:30 AM', text: 'Buenos días, ¿tienen lista de precios mayorista para tiendas de comercio electrónico?' },
        { sender: 'ai-bot', time: '09:31 AM', text: '¡Hola Carlos! Bienvenido a Xorbit. 📦 Claro que sí, aquí tienes nuestro catálogo mayorista interactivo sincronizado en tiempo real. ¿A partir de cuántas unidades deseas cotizar?' }
      ]
    },
    laura: {
      id: 'laura',
      name: 'Laura Gómez',
      channel: 'tiktok',
      channelName: 'TikTok Chat',
      avatar: 'LG',
      phone: '+57 300 781 1290',
      stage: 'Pendiente de Pago',
      stageColor: '#10b981',
      email: 'laura.gomez@gmail.com',
      orderId: '#XOR-8945',
      orderTotal: '$54.00 USD',
      messages: [
        { sender: 'client', time: '11:05 AM', text: '¡Estaba viendo el Live interactivo en la tienda! Comenté "COMPRO1" y me llegó este enlace directo. ¿Cómo realizo el pago?' },
        { sender: 'ai-bot', time: '11:05 AM', text: '¡Hola Laura! ⚡ Tu orden fue pre-generada desde el Live. Puedes pagar con tarjeta, transferencia o contra entrega en el enlace que te enviamos. ¡Quedan pocas unidades en inventario!' }
      ]
    },
    roberto: {
      id: 'roberto',
      name: 'Roberto Valenzuela',
      channel: 'voice',
      channelName: 'Llamada de Voz IA',
      avatar: 'RV',
      phone: '+1 786 542 9011',
      stage: 'Venta Cerrada',
      stageColor: '#10b981',
      email: 'roberto.val@miempresa.com',
      orderId: '#XOR-8902',
      orderTotal: '$320.00 USD',
      messages: [
        { sender: 'ai-bot', time: '08:45 AM', text: '📞 Llamada telefónica saliente realizada por Agente de Voz IA: "Hola Roberto, te llamamos para confirmar tu despacho de 3 kits de iluminación. ¿Dirección confirmada?" -> Cliente: "Sí, confirmado".' },
        { sender: 'client', time: '08:46 AM', text: '¡Muchas gracias por confirmar tan rápido! Excelente atención.' }
      ]
    }
  };

  // Referencias al DOM del Showcase
  const chatListItems = document.querySelectorAll('.crm-chat-item');
  const threadHeaderName = document.getElementById('threadCurrentName');
  const threadHeaderChannel = document.getElementById('threadCurrentChannel');
  const threadHeaderStage = document.getElementById('threadCurrentStage');
  const messagesContainer = document.getElementById('crmMessagesContainer');
  const contactDetailName = document.getElementById('contactDetailName');
  const contactDetailPhone = document.getElementById('contactDetailPhone');
  const contactDetailEmail = document.getElementById('contactDetailEmail');
  const contactDetailStage = document.getElementById('contactDetailStage');
  const contactDetailOrderId = document.getElementById('contactDetailOrderId');

  // Filtrado por canales
  const channelFilterBtns = document.querySelectorAll('.channel-pill-btn');
  channelFilterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      channelFilterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const channel = btn.getAttribute('data-channel');
      
      chatListItems.forEach(item => {
        if (channel === 'all' || item.getAttribute('data-channel') === channel) {
          item.style.display = 'flex';
        } else {
          item.style.display = 'none';
        }
      });
    });
  });

  // Renderizar conversación
  function renderConversation(contactKey) {
    const data = chatConversations[contactKey];
    if (!data) return;

    if (threadHeaderName) threadHeaderName.textContent = data.name;
    if (threadHeaderChannel) threadHeaderChannel.textContent = data.channelName;
    if (threadHeaderStage) {
      threadHeaderStage.textContent = data.stage;
      threadHeaderStage.style.backgroundColor = `${data.stageColor}25`;
      threadHeaderStage.style.color = data.stageColor;
    }

    if (contactDetailName) contactDetailName.textContent = data.name;
    if (contactDetailPhone) contactDetailPhone.textContent = data.phone;
    if (contactDetailEmail) contactDetailEmail.textContent = data.email;
    if (contactDetailStage) {
      contactDetailStage.textContent = data.stage;
      contactDetailStage.style.color = data.stageColor;
    }
    if (contactDetailOrderId) contactDetailOrderId.textContent = data.orderId;

    if (messagesContainer) {
      messagesContainer.innerHTML = `
        <div class="msg-date-divider">Hoy • Conversación cifrada con Xorbit AI Engine</div>
      `;

      data.messages.forEach(msg => {
        if (msg.sender === 'client') {
          const clientMsg = document.createElement('div');
          clientMsg.className = 'msg-bubble client';
          clientMsg.innerHTML = `
            <div>${msg.text}</div>
            <div style="font-size: 0.68rem; color: #94a3b8; text-align: right; margin-top: 4px;">${msg.time}</div>
          `;
          messagesContainer.appendChild(clientMsg);
        } else if (msg.sender === 'ai-bot') {
          const aiMsg = document.createElement('div');
          aiMsg.className = 'msg-bubble ai-bot';
          aiMsg.innerHTML = `
            <div class="ai-badge-header">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"/><circle cx="12" cy="12" r="3"/></svg>
              Asistente Inteligente Xorbit
            </div>
            <div>${msg.text}</div>
            <div style="font-size: 0.68rem; color: #bfdbfe; text-align: right; margin-top: 4px;">${msg.time} • Respuesta en 1 seg</div>
          `;
          messagesContainer.appendChild(aiMsg);
        } else if (msg.sender === 'order-card') {
          const orderCard = document.createElement('div');
          orderCard.className = 'msg-bubble order-card';
          orderCard.innerHTML = `
            <div class="order-card-header">
              <span>🛒 ${msg.title}</span>
              <span style="color: #10b981;">✓ Confirmado</span>
            </div>
            <div class="order-item-row">
              <span style="color: #94a3b8;">Producto:</span>
              <span style="font-weight: 600;">${msg.product}</span>
            </div>
            <div class="order-item-row">
              <span style="color: #94a3b8;">Cantidad:</span>
              <span>${msg.qty}</span>
            </div>
            <div class="order-item-row">
              <span style="color: #94a3b8;">Total a Pagar:</span>
              <span style="color: #38bdf8; font-weight: 700;">${msg.total}</span>
            </div>
            <div class="order-item-row" style="margin-top: 6px; padding-top: 6px; border-top: 1px dashed rgba(255,255,255,0.1);">
              <span style="font-size: 0.75rem; color: #34d399;">✓ ${msg.shipping}</span>
            </div>
          `;
          messagesContainer.appendChild(orderCard);
        }
      });

      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  // Click en ítem de la lista
  chatListItems.forEach(item => {
    item.addEventListener('click', () => {
      chatListItems.forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      const contactKey = item.getAttribute('data-contact');
      renderConversation(contactKey);
    });
  });

  // Modal central interactivo
  const tourModal = document.getElementById('crmInteractiveModal');
  const startTourBtn = document.getElementById('startTourBtn');
  if (startTourBtn && tourModal) {
    startTourBtn.addEventListener('click', () => {
      tourModal.classList.add('hidden');
    });
  }

  // Input de chat
  const chatInput = document.getElementById('crmChatInput');
  const chatSendBtn = document.getElementById('crmSendBtn');
  const aiAssistChip = document.getElementById('aiAssistQuickReply');

  function sendUserMessage() {
    if (!chatInput || !chatInput.value.trim()) return;
    const text = chatInput.value.trim();
    chatInput.value = '';

    const newBubble = document.createElement('div');
    newBubble.className = 'msg-bubble ai-bot';
    newBubble.innerHTML = `
      <div class="ai-badge-header">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"/><circle cx="12" cy="12" r="3"/></svg>
        Tú (Asesor / IA)
      </div>
      <div>${text}</div>
      <div style="font-size: 0.68rem; color: #bfdbfe; text-align: right; margin-top: 4px;">Ahora mismo</div>
    `;
    if (messagesContainer) {
      messagesContainer.appendChild(newBubble);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  if (chatSendBtn) chatSendBtn.addEventListener('click', sendUserMessage);
  if (chatInput) {
    chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sendUserMessage();
    });
  }

  if (aiAssistChip) {
    aiAssistChip.addEventListener('click', () => {
      if (chatInput) {
        chatInput.value = '¡Hola Carolina! Claro que sí, tu pedido ya está reservado y en preparación de despacho.';
        sendUserMessage();
      }
    });
  }

  // Inicializar con Carolina
  renderConversation('carolina');
});

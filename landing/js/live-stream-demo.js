/**
 * XORBIT 360 - Live Selling Pregrabado para Landing Page
 * Módulo: Video pregrabado incrustado que simula un directo con comentarios reales y checkout automático
 */

document.addEventListener('DOMContentLoaded', () => {
  const commentsContainer = document.getElementById('liveCommentsStream');
  const flashOrdersCounter = document.getElementById('flashOrdersCounter');
  const simulatedComments = [
    { user: 'Sofia Mendoza', text: '¡QUERO EL ROJO TALLA M! 🔥', keyword: true },
    { user: 'Andrés Paredes', text: '¿Tienen envíos contra entrega a Bogotá y Medellín?', keyword: false },
    { user: 'Camila Rojas', text: 'COMPRO 2 UNIDADES CON LA PROMO AHORA', keyword: true },
    { user: 'Valeria Guzmán', text: '¡Listo mi pedido, me llegó el enlace al WhatsApp al segundo!', keyword: false },
    { user: 'Jorge Herrera', text: 'QUIERO 1 EN NEGRO TITANIO CON DESCUENTO', keyword: true },
    { user: 'Daniela Torres', text: '¿El descuento se mantiene si pago al recibir?', keyword: false },
    { user: 'Mariana Bernal', text: 'COMPRAR COMBO COMPLETO 2X1', keyword: true }
  ];

  let orderCount = 84;
  let commentIndex = 0;

  function insertLiveComment() {
    if (!commentsContainer) return;

    const item = simulatedComments[commentIndex % simulatedComments.length];
    commentIndex++;

    const bubble = document.createElement('div');
    bubble.className = 'live-comment-bubble';
    
    if (item.keyword) {
      orderCount++;
      if (flashOrdersCounter) flashOrdersCounter.textContent = `${orderCount} pedidos en vivo`;
      
      bubble.innerHTML = `
        <div>
          <span style="font-weight: 700; color: #f8fafc;">${item.user}:</span>
          <span class="comment-highlight">${item.text}</span>
        </div>
        <span style="font-size: 0.7rem; background: rgba(16, 185, 129, 0.2); color: #34d399; padding: 2px 6px; border-radius: 4px;">Pedido Creado ⚡</span>
      `;
    } else {
      bubble.innerHTML = `
        <div>
          <span style="font-weight: 700; color: #cbd5e1;">${item.user}:</span>
          <span style="color: #94a3b8;">${item.text}</span>
        </div>
        <span style="font-size: 0.7rem; color: #64748b;">Respondido</span>
      `;
    }

    commentsContainer.appendChild(bubble);
    commentsContainer.scrollTop = commentsContainer.scrollHeight;

    // Mantener máximo 8 comentarios en pantalla
    if (commentsContainer.children.length > 8) {
      commentsContainer.removeChild(commentsContainer.children[0]);
    }
  }

  // Desplegar comentarios periódicamente
  setInterval(insertLiveComment, 3200);
});

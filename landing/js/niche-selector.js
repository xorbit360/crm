/**
 * XORBIT 360 - Selector Interactivo Multisectorial
 * xorbit360.com - Primera Plataforma Multisectorial
 */

document.addEventListener('DOMContentLoaded', () => {
  const nicheData = {
    ecommerce: {
      title: '🛒 E-Commerce (Venta de Productos y Pago Contra Entrega)',
      nicheName: 'E-Commerce & Dropshipping',
      prompt: 'Actúa como un cerrador de ventas de alto impacto para tienda de comercio electrónico. Tu misión es responder dudas sobre productos, recomendar combos, capturar pedidos contra entrega y enviar confirmación por WhatsApp.',
      rules: [
        'Validación automática de cobertura y transportadora (Dropi, Mastershop, Effix, 99envíos).',
        'Captura estructurada de nombre, teléfono, ciudad, dirección exacta y referencia.',
        'Generación de llamada telefónica automática con Agente de Voz IA para confirmar el despacho.'
      ],
      chatPreview: {
        customer: '¡Hola! Me interesa la chaqueta impermeable. ¿Hacen envíos contra entrega a Cali?',
        ai: '¡Hola! 👋 Sí, tenemos envíos contra entrega con pago al recibir en Cali (entrega en 24 a 48 hrs). ¿Qué talla prefieres (M, L o XL)? Te aparto la tuya con envío gratis hoy.'
      }
    },
    restaurante: {
      title: '🍕 Restaurante / Comida Rápida (Menú, Domicilios y Mesas)',
      nicheName: 'Restaurantes y Dark Kitchens',
      prompt: 'Eres el anfitrión virtual del restaurante. Muestra el menú interactivo, toma pedidos para entrega a domicilio o consumo en mesa, y emite la comanda automáticamente al Sistema POS.',
      rules: [
        'Presenta categorías de platos, opciones de salsas, adiciones y bebidas recomendadas.',
        'Cálculo automático de costo de domicilio según la zona o barrio.',
        'Impresión de comanda o notificación a cocina en tiempo real sincronizado con el ERP POS.'
      ],
      chatPreview: {
        customer: 'Buenas noches, ¿tienen servicio a domicilio? Quiero pedir una hamburguesa doble.',
        ai: '¡Buenas noches! 🍔 Claro que sí. La hamburguesa doble incluye papas rústicas. ¿Deseas añadir tocineta extra o bebida gaseosa? Por favor indícame tu dirección para calcular el tiempo de entrega.'
      }
    },
    hotel: {
      title: '🏨 Hotel / Hospedaje (Habitaciones y Reservas)',
      nicheName: 'Hotelería y Alojamientos',
      prompt: 'Eres el conserje virtual del hotel. Atiende consultas de tarifas, disponibilidad de habitaciones para fechas específicas, check-in, check-out y paquetes vacacionales.',
      rules: [
        'Solicita fechas de entrada y salida, así como número de adultos y niños.',
        'Muestra fotografías de las suites disponibles y servicios incluidos (desayuno, piscina, wifi).',
        'Genera enlace de pre-reserva o confirmación directa en el sistema.'
      ],
      chatPreview: {
        customer: 'Hola, ¿tienen habitación disponible para 2 personas del 15 al 18 de octubre?',
        ai: '¡Hola! Con gusto te colaboro 🏨. Para esas fechas tenemos disponible la Suite Junior con vista panorámica y desayuno buffet incluido por $75 USD la noche. ¿Te gustaría que te reserve la fecha ahora?'
      }
    },
    servicios: {
      title: '💼 Servicios / Consultoría (Citas y Asesorías)',
      nicheName: 'Consultorías, Agencias y Asesorías',
      prompt: 'Eres el asesor comercial de la firma. Califica el perfil de la empresa o cliente potencial, responde inquietudes sobre planes y agenda la sesión diagnóstica en el calendario.',
      rules: [
        'Filtro previo con preguntas clave (tamaño de equipo, objetivo comercial, presupuesto estimado).',
        'Sincronización con Google Calendar / CRM para bloqueo de horario disponible.',
        'Recordatorio automático 24h y 2h antes de la videollamada.'
      ],
      chatPreview: {
        customer: 'Hola, nos gustaría una consultoría para automatizar el área de ventas de nuestra empresa.',
        ai: '¡Excelente iniciativa! 💼 Para brindarte la mejor asesoría, ¿cuántas personas integran tu equipo comercial actualmente? Puedo agendarte una videollamada de 30 minutos con nuestro director este jueves.'
      }
    },
    salud: {
      title: '💅 Salud / Estética (Tratamientos y Citas)',
      nicheName: 'Clínicas, Spas y Centros de Estética',
      prompt: 'Eres la asistente clínica y de bienestar. Brinda información sobre tratamientos, recomendaciones de cuidado y agenda citas con el especialista médico o estético.',
      rules: [
        'Pregunta si es primera consulta o cita de seguimiento/control.',
        'Envía instrucciones previas (ej. ayuno, no maquillaje, ropa cómoda).',
        'Registro en el historial del paciente dentro del CRM.'
      ],
      chatPreview: {
        customer: 'Hola, quiero consultar el precio de la limpieza facial profunda y saber si tienen citas para el sábado.',
        ai: '¡Hola! 💆‍♀️ Con gusto. Nuestra limpieza facial profunda incluye microdermoabrasión e hidratación con ácido hialurónico ($35 USD). Tenemos espacio disponible el sábado a las 11:00 AM o 3:00 PM. ¿Cuál te queda mejor?'
      }
    },
    networkers: {
      title: '🚀 Networkers / Afiliados (Presentación y Cierre)',
      nicheName: 'Líderes de Redes y Marketing de Afiliados',
      prompt: 'Eres el asistente de prospección y escalado del equipo. Filtra contactos calificados, comparte el video de presentación del negocio y agenda llamada de cierre con el líder.',
      rules: [
        'Evalúa el nivel de compromiso y experiencia del prospecto.',
        'Envío secuencial de material audiovisual de alta conversión.',
        'Enrutamiento directo al WhatsApp privado del líder cuando el prospecto dice "ESTOY LISTO".'
      ],
      chatPreview: {
        customer: 'Vi tu publicación sobre cómo generar ingresos digitales con el modelo automatizado. ¿De qué se trata?',
        ai: '¡Hola! 🚀 Me alegra tu interés. Es un ecosistema probado donde comercializamos productos de alta demanda con IA. Dura solo 7 minutos este video explicativo: ¿Tienes tiempo de verlo ahora para responder tus dudas?'
      }
    },
    otro: {
      title: '🎯 Otro Tipo de Negocio',
      nicheName: 'Cualquier Modelo B2B / B2C',
      prompt: 'Asistente comercial personalizable para cualquier modelo de negocio, adaptado a tus políticas, catálogo y flujos específicos.',
      rules: [
        'Total flexibilidad para crear tus propias instrucciones y personalidad de marca.',
        'Sincronización con bases de datos, webhooks y ERP POS.',
        'Transferencia a agentes humanos cuando la consulta requiera atención personalizada.'
      ],
      chatPreview: {
        customer: 'Hola, quiero saber más sobre sus servicios empresariales.',
        ai: '¡Hola! Bienvenido. Con gusto te atiendo y te comparto información detallada sobre nuestros servicios para tu empresa. ¿En qué podemos ayudarte hoy?'
      }
    }
  };

  const nicheButtons = document.querySelectorAll('.niche-pill-btn');
  const nicheTitleEl = document.getElementById('nicheActiveTitle');
  const nichePromptEl = document.getElementById('nicheActivePrompt');
  const nicheRulesList = document.getElementById('nicheActiveRules');
  const nicheCustomerMsg = document.getElementById('nicheSimCustomer');
  const nicheAiMsg = document.getElementById('nicheSimAi');

  function updateNiche(key) {
    const data = nicheData[key];
    if (!data) return;

    if (nicheTitleEl) nicheTitleEl.textContent = data.title;
    if (nichePromptEl) nichePromptEl.textContent = `"${data.prompt}"`;

    if (nicheRulesList) {
      nicheRulesList.innerHTML = '';
      data.rules.forEach(rule => {
        const li = document.createElement('li');
        li.innerHTML = `<span class="bullet">✓</span> <span>${rule}</span>`;
        nicheRulesList.appendChild(li);
      });
    }

    if (nicheCustomerMsg) nicheCustomerMsg.textContent = data.chatPreview.customer;
    if (nicheAiMsg) nicheAiMsg.textContent = data.chatPreview.ai;
  }

  nicheButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      nicheButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const nicheKey = btn.getAttribute('data-niche');
      updateNiche(nicheKey);
    });
  });

  // Inicializar con E-Commerce
  updateNiche('ecommerce');
});

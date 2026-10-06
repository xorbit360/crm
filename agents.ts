export async function processWithAgents(params: {
  phone: string;
  senderName: string;
  text: string;
  history: any[];
  mediaInfo?: string;
  mediaBase64?: string | null;
  mediaMimeType?: string | null;
}, currentDB: any, executeAIInternal: Function) {
  const { phone, senderName, text, history, mediaInfo, mediaBase64, mediaMimeType } = params;

  // 1. Agente de Clasificación
  const classPrompt = `Eres el 'Agente de Clasificación' del WhatsApp Bot. Tu tarea es identificar la intención del usuario basándote en su mensaje reciente y un breve historial.
Opciones:
- MENU (quiere ver productos, catálogo, menú, precios, hacer un pedido)
- SOPORTE (dudas, quejas, horarios, preguntas frecuentes)
- SALUDO (sólo está saludando)
- OTRO (cualquier otra intención o charla general)

Mensaje del usuario: "${text}"
Historial reciente (últimos 3 mensajes): ${history.slice(-3).map((h:any)=>h.text).join(' | ')}

Responde ÚNICAMENTE con una sola palabra de la categoría: MENU, SOPORTE, SALUDO, o OTRO. Sin comillas ni texto adicional.`;

  let intent = "OTRO";
  try {
     const intentRaw = await executeAIInternal(classPrompt);
     intent = intentRaw.trim().toUpperCase().replace(/[^A-Z]/g, '');
     if (!['MENU', 'SOPORTE', 'SALUDO', 'OTRO'].includes(intent)) intent = 'OTRO';
  } catch(e) {
     intent = 'OTRO';
  }

  // 2. Agente de Recuperación de Contexto (Context Retrieval Tool/Agent)
  // Orquesta la memoria y extrae solo lo relevante según la intención.
  // "priorice el contenido del entrenamiento del usuario actual y sobreescriba cualquier memoria previa"
  
  let contextRetrieved = `[PROMPT PRINCIPAL Y ENTRENAMIENTO BASE - ESTA ES TU PERSONALIDAD Y REGLAS] (SOBREESCRIBE TODO LO DEMÁS):\n"${currentDB.botPrompt || ''}"\n\n`;
  
  if (intent === 'MENU') {
    let catalogStr = "";
    if (currentDB.products && Array.isArray(currentDB.products) && currentDB.products.length > 0) {
      catalogStr = `CATÁLOGO DE PRODUCTOS:\n` + currentDB.products.map((p: any) => `- ${p.name}: $${p.price || p.basePrice || 0} (${p.stock>0?'Disponible':'Agotado'})`).join('\n') + '\n';
    }
    const m = currentDB.active || {};
    let menuStr = "";
    if (m.entradas?.length || m.principios?.length || m.carnes?.length) {
      menuStr = `MENÚ DEL DÍA:\nEntradas: ${(m.entradas||[]).join(', ')}\nAcompañamientos: ${(m.principios||[]).join(', ')}\nPlatos Fuertes: ${(m.carnes||[]).join(', ')}\nPrecio: $${m.precio || 0}\n`;
    }
    contextRetrieved += `${catalogStr}${menuStr}\n`;
    contextRetrieved += `MÉTODOS DE PAGO: ${currentDB.paymentMethods?.join(', ') || 'Efectivo'}\nZONAS DE DOMICILIO: ${currentDB.deliveryZones?.map((z:any)=>`${z.zone} ($${z.cost})`).join(', ') || 'Consultar cobertura'}\n\n`;
  } else if (intent === 'SOPORTE' || intent === 'OTRO') {
    const faqsFormatted = (currentDB.faqsList && Array.isArray(currentDB.faqsList) && currentDB.faqsList.length > 0)
      ? currentDB.faqsList.map((f: any) => `Pregunta: ${f.question}\nRespuesta: ${f.answer}`).join('\n\n')
      : (currentDB.faqs || '');
    if (faqsFormatted) {
      contextRetrieved += `PREGUNTAS FRECUENTES (FAQS):\n${faqsFormatted}\n\n`;
    }
  }
  
  if (intent === 'SALUDO' || history.length === 0) {
     contextRetrieved += `REGLA DE SALUDO INICIAL: Si es la primera interacción, usa obligatoriamente este saludo: "${currentDB.customGreeting || 'Hola, ¿en qué te puedo ayudar?'}"\n\n`;
  }

  const isGenericName = !senderName || senderName === "Cliente WhatsApp" || senderName === "Cliente" || senderName === "Usuario" || senderName.includes("WhatsApp");
  const cleanSenderName = isGenericName ? "" : senderName;
  
  const chatCols = currentDB.chatColumnNames || {};
  const colNamesStr = `Columnas Kanban: - nuevo: "${chatCols.nuevo || 'Nuevo Mensaje'}" | - en_conversacion: "${chatCols.en_conversacion || 'En Conversación'}" | - entrega: "${chatCols.entrega || 'En Entrega'}"`;
  contextRetrieved += colNamesStr + '\n\n';

  // 3. Agente de Respuesta
  const responsePrompt = `=========================================
ERES EL 'AGENTE DE RESPUESTA FINAL' DE "${currentDB.businessName || 'Nuestra Empresa'}".
=========================================
DATOS DEL CLIENTE: 
- Nombre: ${cleanSenderName ? `"${cleanSenderName}"` : 'Nombre no especificado'}. Teléfono: +${phone}
- REGLA: Dirígete al cliente por su nombre SÓLO si es un nombre propio natural claro. NO inventes nombres ni uses apodos de conversaciones pasadas.

=========================================
CONTEXTO RECUPERADO Y ENTRENAMIENTO ACTUAL (MÁXIMA PRIORIDAD - ORQUESTADOR DE MEMORIA):
🚨 ADVERTENCIA: El siguiente contenido es tu configuración ACTUAL de entrenamiento. Sobreescribe por completo cualquier indicación contradictoria que encuentres en el historial. Asume este rol INMEDIATAMENTE.
${contextRetrieved}
=========================================
HISTORIAL DE LA CONVERSACIÓN CON ESTE CLIENTE (Últimos 10 mensajes):
${history.length > 0 ? history.slice(-10).map((h: any) => `${h.role === 'client' || h.sender === 'client' ? 'Cliente' : 'IA'}: ${h.text}`).join('\n') : 'Sin historial previo.'}

=========================================
NUEVO MENSAJE ENTRANTE DEL CLIENTE: "${text}"
${mediaInfo ? `DATOS ADICIONALES DEL MENSAJE (IMAGEN/AUDIO): ${mediaInfo}` : ''}

INSTRUCCIONES DE RESPUESTA Y FORMATO JSON OBLIGATORIO:
1. Responde ÚNICAMENTE utilizando la información del "CONTEXTO RECUPERADO". NO te inventes productos o datos.
2. Mantén respuestas concisas, amables y naturales (máximo 25-30 palabras por fragmento de mensaje).
3. Devuelve de manera OBLIGATORIA un objeto JSON strictly estructurado con:
   - "replies": [Arreglo de strings]. Tus respuestas al cliente cortas y separadas naturalmente.
   - "needsHuman": boolean. True si el cliente solicita ser atendido por un humano o si es necesario pausar la IA.
   - "orderDetails": Objeto con "customerName", "address", "phone", "items", "paymentMethod" SÓLO si el cliente ha confirmado su pedido/solicitud voluntariamente y ha dado sus datos completos. De lo contrario déjalo vacío.`;

  return await executeAIInternal(responsePrompt, mediaBase64, mediaMimeType);
}

// server/zernio/templates.ts
// Plantillas oficiales para WhatsApp Cloud API / Zernio
// Especializadas en Logística y Dropshipping Contra Entrega (Dropi, MasterShop, Effix)
// Cumple con Prompt 6:
// - template: { elements: [ { name, language, components } ] } para hilos existentes
// - templateName, templateLanguage, templateParams (array plano ordenado) para abrir hilos nuevos

export interface LogisticsTemplateParams {
  customerName: string;
  orderId: string;
  productName: string;
  totalPrice?: string | number;
  deliveryAddress?: string;
  city?: string;
  carrierName?: string; // Servientrega, Coordinadora, Interrapidísimo, Envia, TCC
  trackingNumber?: string;
  trackingUrl?: string;
  platform?: 'dropi' | 'mastershop' | 'effix' | 'personalizado';
  noveltyReason?: string;
}

export interface PreparedTemplate {
  templateName: string;
  templateLanguage: string;
  // Formato para abrir hilo nuevo (POST /v1/inbox/conversations)
  templateParams: string[];
  // Formato para hilo existente (POST /v1/inbox/conversations/{id}/messages)
  components: any[];
  previewText: string;
}

/**
 * 1. Plantilla Confirmación de Pedido Contra Entrega (Dropi / MasterShop / Effix)
 */
export function buildOrderConfirmationTemplate(params: LogisticsTemplateParams): PreparedTemplate {
  const name = params.customerName || 'Cliente';
  const order = params.orderId || '#PED-001';
  const product = params.productName || 'Producto';
  const total = typeof params.totalPrice === 'number' ? `$${params.totalPrice.toLocaleString('es-CO')}` : String(params.totalPrice || '$0');
  const address = params.deliveryAddress || 'Dirección registrada';
  const city = params.city || '';

  const templateParams = [name, order, product, total, address, city].filter(Boolean);

  const bodyParameters = [
    { type: 'text', text: name },
    { type: 'text', text: order },
    { type: 'text', text: product },
    { type: 'text', text: total },
    { type: 'text', text: address }
  ];
  if (city) {
    bodyParameters.push({ type: 'text', text: city });
  }

  const components = [
    {
      type: 'body',
      parameters: bodyParameters
    }
  ];

  const previewText = `¡Hola ${name}! 📦 Confirmamos tu pedido ${order} de ${product} por un total de ${total}. Te llegará a: ${address} ${city}. Recuerda que pagas en efectivo al recibir. ¿Deseas confirmar el despacho hoy mismo?`;

  return {
    templateName: 'confirmacion_pedido_logistica',
    templateLanguage: 'es',
    templateParams,
    components,
    previewText
  };
}

/**
 * 2. Plantilla Despacho & Guía de Envío (Dropi / MasterShop / Effix)
 */
export function buildDispatchGuideTemplate(params: LogisticsTemplateParams): PreparedTemplate {
  const name = params.customerName || 'Cliente';
  const order = params.orderId || '#PED-001';
  const carrier = params.carrierName || 'Transportadora Nacional';
  const guide = params.trackingNumber || 'PENDIENTE';
  const trackingUrl = params.trackingUrl || `https://rastreo.com/${guide}`;

  const templateParams = [name, order, carrier, guide, trackingUrl];

  const components = [
    {
      type: 'body',
      parameters: [
        { type: 'text', text: name },
        { type: 'text', text: order },
        { type: 'text', text: carrier },
        { type: 'text', text: guide }
      ]
    },
    {
      type: 'button',
      sub_type: 'url',
      index: 0,
      parameters: [
        { type: 'text', text: guide }
      ]
    }
  ];

  const previewText = `¡Buenas noticias ${name}! 🚚 Tu pedido ${order} ya fue despachado por ${carrier} con la guía #${guide}. Puedes rastrearlo aquí: ${trackingUrl}`;

  return {
    templateName: 'guia_despachada_logistica',
    templateLanguage: 'es',
    templateParams,
    components,
    previewText
  };
}

/**
 * 3. Plantilla Novedad en Entrega (Dropi / MasterShop / Effix)
 */
export function buildDeliveryNoveltyTemplate(params: LogisticsTemplateParams): PreparedTemplate {
  const name = params.customerName || 'Cliente';
  const order = params.orderId || '#PED-001';
  const carrier = params.carrierName || 'la transportadora';
  const reason = params.noveltyReason || 'No fue posible ubicar tu dirección o no había nadie en casa.';

  const templateParams = [name, order, carrier, reason];

  const components = [
    {
      type: 'body',
      parameters: [
        { type: 'text', text: name },
        { type: 'text', text: order },
        { type: 'text', text: carrier },
        { type: 'text', text: reason }
      ]
    }
  ];

  const previewText = `¡Hola ${name}! ⚠️ ${carrier} intentó entregar tu pedido ${order} pero reportó una novedad: "${reason}". Por favor responde a este mensaje confirmando tu dirección exacta o un teléfono alternativo para reprogramar la entrega de inmediato.`;

  return {
    templateName: 'novedad_entrega_logistica',
    templateLanguage: 'es',
    templateParams,
    components,
    previewText
  };
}

/**
 * 4. Plantilla Pedido Entregado & Confirmación Final
 */
export function buildOrderDeliveredTemplate(params: LogisticsTemplateParams): PreparedTemplate {
  const name = params.customerName || 'Cliente';
  const order = params.orderId || '#PED-001';
  const product = params.productName || 'tu producto';

  const templateParams = [name, order, product];

  const components = [
    {
      type: 'body',
      parameters: [
        { type: 'text', text: name },
        { type: 'text', text: order },
        { type: 'text', text: product }
      ]
    }
  ];

  const previewText = `¡Hola ${name}! 🎉 Nos confirma la transportadora que tu pedido ${order} (${product}) fue entregado con éxito. ¡Esperamos que lo disfrutes al máximo! ¿Todo llegó en perfecto estado?`;

  return {
    templateName: 'pedido_entregado_logistica',
    templateLanguage: 'es',
    templateParams,
    components,
    previewText
  };
}

/**
 * Convierte cualquier estructura de Meta Components en un array plano de variables ordenadas
 * (Header vars -> Body vars -> Dynamic URL buttons)
 */
export function flattenComponentsToParams(components: any[]): string[] {
  const flat: string[] = [];
  if (!Array.isArray(components)) return flat;

  // 1. Header
  const header = components.find(c => c.type === 'header');
  if (header?.parameters) {
    for (const p of header.parameters) {
      if (p.text) flat.push(String(p.text));
    }
  }

  // 2. Body
  const body = components.find(c => c.type === 'body');
  if (body?.parameters) {
    for (const p of body.parameters) {
      if (p.text) flat.push(String(p.text));
    }
  }

  // 3. Buttons (URL dinámica)
  const buttons = components.filter(c => c.type === 'button');
  for (const b of buttons) {
    if (b.parameters) {
      for (const p of b.parameters) {
        if (p.text) flat.push(String(p.text));
      }
    }
  }

  return flat;
}

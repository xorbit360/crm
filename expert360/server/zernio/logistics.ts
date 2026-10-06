// server/zernio/logistics.ts
// Integración de Notificaciones de Logística Automatizadas con Dropi, MasterShop y Effix
// Utiliza plantillas aprobadas oficiales de WhatsApp vía Zernio

import { enviarMensajeZernio, OutboundMessageResult } from './messaging';
import {
  buildOrderConfirmationTemplate,
  buildDispatchGuideTemplate,
  buildDeliveryNoveltyTemplate,
  buildOrderDeliveredTemplate,
  LogisticsTemplateParams
} from './templates';

export interface LogisticsOrderPayload {
  platform: 'dropi' | 'mastershop' | 'effix' | 'personalizado';
  orderId: string;
  customerName: string;
  customerPhone: string;
  productName: string;
  totalPrice: string | number;
  deliveryAddress?: string;
  city?: string;
  carrierName?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  noveltyReason?: string;
  accountId?: string;
}

/**
 * 1. Confirmación de Pedido Contra Entrega (Dropi / MasterShop / Effix)
 */
export async function notificarConfirmacionPedidoLogistica(order: LogisticsOrderPayload): Promise<OutboundMessageResult> {
  const prepared = buildOrderConfirmationTemplate({
    customerName: order.customerName,
    orderId: order.orderId,
    productName: order.productName,
    totalPrice: order.totalPrice,
    deliveryAddress: order.deliveryAddress,
    city: order.city,
    platform: order.platform
  });

  return enviarMensajeZernio({
    accountId: order.accountId,
    recipientPhone: order.customerPhone,
    platform: 'whatsapp',
    template: {
      name: prepared.templateName,
      language: prepared.templateLanguage,
      components: prepared.components,
      params: prepared.templateParams
    },
    text: prepared.previewText,
    orderId: order.orderId,
    platformSource: order.platform
  });
}

/**
 * 2. Notificación de Guía Despachada y Rastreo (Dropi / MasterShop / Effix)
 */
export async function notificarDespachoGuiaLogistica(order: LogisticsOrderPayload): Promise<OutboundMessageResult> {
  const prepared = buildDispatchGuideTemplate({
    customerName: order.customerName,
    orderId: order.orderId,
    productName: order.productName,
    carrierName: order.carrierName,
    trackingNumber: order.trackingNumber,
    trackingUrl: order.trackingUrl,
    platform: order.platform
  });

  return enviarMensajeZernio({
    accountId: order.accountId,
    recipientPhone: order.customerPhone,
    platform: 'whatsapp',
    template: {
      name: prepared.templateName,
      language: prepared.templateLanguage,
      components: prepared.components,
      params: prepared.templateParams
    },
    text: prepared.previewText,
    orderId: order.orderId,
    platformSource: order.platform
  });
}

/**
 * 3. Notificación de Novedad en Entrega (Dropi / MasterShop / Effix)
 */
export async function notificarNovedadLogistica(order: LogisticsOrderPayload): Promise<OutboundMessageResult> {
  const prepared = buildDeliveryNoveltyTemplate({
    customerName: order.customerName,
    orderId: order.orderId,
    productName: order.productName,
    carrierName: order.carrierName,
    noveltyReason: order.noveltyReason,
    platform: order.platform
  });

  return enviarMensajeZernio({
    accountId: order.accountId,
    recipientPhone: order.customerPhone,
    platform: 'whatsapp',
    template: {
      name: prepared.templateName,
      language: prepared.templateLanguage,
      components: prepared.components,
      params: prepared.templateParams
    },
    text: prepared.previewText,
    orderId: order.orderId,
    platformSource: order.platform
  });
}

/**
 * 4. Notificación de Pedido Entregado con Éxito (Dropi / MasterShop / Effix)
 */
export async function notificarPedidoEntregadoLogistica(order: LogisticsOrderPayload): Promise<OutboundMessageResult> {
  const prepared = buildOrderDeliveredTemplate({
    customerName: order.customerName,
    orderId: order.orderId,
    productName: order.productName,
    platform: order.platform
  });

  return enviarMensajeZernio({
    accountId: order.accountId,
    recipientPhone: order.customerPhone,
    platform: 'whatsapp',
    template: {
      name: prepared.templateName,
      language: prepared.templateLanguage,
      components: prepared.components,
      params: prepared.templateParams
    },
    text: prepared.previewText,
    orderId: order.orderId,
    platformSource: order.platform
  });
}

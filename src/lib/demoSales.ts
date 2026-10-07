export const DEMO_PRODUCT_NAME = 'Combo de Camisas Polo';
export const DEMO_PRODUCT_PRICE = 160000;

export const DEMO_SOURCES = [
  'WhatsApp',
  'Shopify',
  'Redes sociales',
  'Recompra',
  'Anuncios Meta',
  'TikTok',
  'Google'
] as const;

export const isPrincipalAdmin = (user?: { role?: string; email?: string } | null) =>
  ['superadmin', 'admin'].includes(user?.role || '') &&
  user?.email?.toLowerCase() === 'admin@xorbit360.com';

export const scopedStorageKey = (base: string, user?: { role?: string; email?: string } | null) =>
  isPrincipalAdmin(user) ? `${base}_admin_demo` : `${base}_${(user?.email || 'anonymous').toLowerCase()}`;

const demoNames = [
  'Laura Valentina Gómez', 'Andrés Felipe Rojas', 'Camila Torres', 'Juan David Martínez',
  'Mariana Cárdenas', 'Santiago Pérez', 'Daniela Restrepo', 'Nicolás Vargas',
  'Valentina Salazar', 'Sebastián Castro', 'Paula Andrea López', 'Mateo Herrera',
  'Natalia Ramírez', 'Felipe Moreno', 'Carolina Méndez', 'David Arias'
];

const demoCities = ['Bogotá', 'Medellín', 'Cali', 'Barranquilla', 'Cartagena', 'Bucaramanga', 'Pereira'];

export function buildAdminDemoOrders() {
  const sourceWeights = [28, 18, 14, 10, 12, 8, 10];
  const sourceFor = (index: number) => {
    let cursor = 0;
    const percentage = ((index * 37) % 100) + 1;
    for (let i = 0; i < sourceWeights.length; i++) {
      cursor += sourceWeights[i];
      if (percentage <= cursor) return DEMO_SOURCES[i];
    }
    return DEMO_SOURCES[0];
  };

  return Array.from({ length: 1250 }, (_, index) => {
    const status = index < 787 ? 'Entregado' : index < 1037 ? 'En camino' : index < 1187 ? 'Devuelto' : 'Cancelado';
    const customerIndex = index % demoNames.length;
    const day = String((index % 7) + 1).padStart(2, '0');
    return {
      id: `PED-XB-${String(index + 1).padStart(4, '0')}`,
      clientName: demoNames[customerIndex],
      phone: `+57 3${String(100000000 + index).slice(0, 9)}`,
      products: `1x ${DEMO_PRODUCT_NAME}`,
      total: DEMO_PRODUCT_PRICE,
      source: sourceFor(index),
      paymentStatus: status === 'Cancelado' ? 'Pendiente' : 'Pagado',
      shippingStatus: status,
      trackingCode: status === 'Cancelado' ? '' : `CO-XB-${String(500000 + index)}`,
      date: `2026-10-${day}`,
      confirmationStatus: (status === 'Cancelado' ? 'No Confirmado' : 'Confirmado') as 'Confirmado' | 'No Confirmado'
    };
  });
}

export function buildAdminDemoClients() {
  return demoNames.map((name, index) => {
    const orders = 70 + (index % 20);
    const returned = Math.round(orders * 0.12);
    const cancelled = Math.round(orders * 0.05);
    const delivered = orders - returned - cancelled;
    return {
      id: `CLI-XB-${String(index + 1).padStart(3, '0')}`,
      name,
      phone: `+57 3${String(100000000 + index).slice(0, 9)}`,
      city: demoCities[index % demoCities.length],
      department: index % 2 ? 'Antioquia' : 'Cundinamarca',
      product: DEMO_PRODUCT_NAME,
      campaign: DEMO_SOURCES[index % DEMO_SOURCES.length],
      isRecurring: index % 3 === 0,
      registrationDate: `2026-10-${String((index % 7) + 1).padStart(2, '0')}`,
      totalTicket: DEMO_PRODUCT_PRICE,
      totalOrdersCount: orders,
      deliveredCount: delivered,
      returnedCount: returned,
      cancelledCount: cancelled,
      logisticsRisk: (returned / orders > 0.12 ? 'medium' : 'low') as 'low' | 'medium' | 'high',
      notes: index % 3 === 0 ? 'Cliente recurrente con recompra confirmada este mes.' : 'Cliente activo del mes.',
      orderHistory: [{
        id: `PED-XB-${String(index + 1).padStart(4, '0')}`,
        product: DEMO_PRODUCT_NAME,
        total: DEMO_PRODUCT_PRICE,
        date: `2026-10-${String((index % 7) + 1).padStart(2, '0')}`,
        status: 'Entregado' as const
      }]
    };
  });
}

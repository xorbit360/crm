import React, { useState, useEffect } from 'react';
import { Search, Plus, Filter, ArrowDownToLine, ShoppingCart, RefreshCw, Truck, CheckCircle2, X, Trash2, Edit3, ShieldCheck, HelpCircle, Package, DollarSign, Calendar, Clock, AlertCircle, MessageSquare, Send, Smartphone } from 'lucide-react';

interface Order {
  id: string;
  clientName: string;
  phone: string;
  products: string;
  total: number;
  source: string;
  paymentStatus: string;
  shippingStatus: string;
  trackingCode: string;
  date: string;
  confirmationStatus?: 'Confirmado' | 'No Confirmado';
}

export default function PedidosView() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterShipping, setFilterShipping] = useState('ALL');
  const [filterPayment, setFilterPayment] = useState('ALL');
  const [activeConfirmationFilter, setActiveConfirmationFilter] = useState<'ALL' | 'Confirmado' | 'No Confirmado'>('ALL');

  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const [formClientName, setFormClientName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formProducts, setFormProducts] = useState('');
  const [formTotal, setFormTotal] = useState(0);
  const [formSource, setFormSource] = useState('WhatsApp Bot');
  const [formPayment, setFormPayment] = useState('Contra entrega');
  const [formShipping, setFormShipping] = useState('Creado en Dropi');
  const [formTracking, setFormTracking] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formConfirmationStatus, setFormConfirmationStatus] = useState<'Confirmado' | 'No Confirmado'>('Confirmado');

  // Dropi Sync States
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');

  // Logistics tracking states
  const [activeTracking, setActiveTracking] = useState<string | null>(null);

  // Meta Cloud API (Zernio) Template Modal States
  const [selectedTemplateOrder, setSelectedTemplateOrder] = useState<Order | null>(null);
  const [templateAction, setTemplateAction] = useState<'confirm' | 'dispatch' | 'novelty' | 'delivered'>('confirm');
  const [templateCustomReason, setTemplateCustomReason] = useState('Dirección errada o cliente no se encontraba en el domicilio');
  const [isSendingTemplate, setIsSendingTemplate] = useState(false);
  const [templateResult, setTemplateResult] = useState<{ success: boolean; msg: string } | null>(null);

  const handleSendWhatsAppLogisticsTemplate = async () => {
    if (!selectedTemplateOrder) return;
    setIsSendingTemplate(true);
    setTemplateResult(null);

    // Map source platform
    let platform: 'dropi' | 'mastershop' | 'effix' = 'dropi';
    const src = (selectedTemplateOrder.source || '').toLowerCase();
    if (src.includes('mastershop')) platform = 'mastershop';
    else if (src.includes('effix')) platform = 'effix';

    try {
      const res = await fetch('/api/zernio/logistics/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: templateAction,
          order: {
            platform,
            orderId: selectedTemplateOrder.id,
            customerName: selectedTemplateOrder.clientName,
            customerPhone: selectedTemplateOrder.phone,
            productName: selectedTemplateOrder.products,
            totalPrice: String(selectedTemplateOrder.total),
            trackingNumber: selectedTemplateOrder.trackingCode,
            carrierName: 'Servientrega',
            noveltyReason: templateCustomReason
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        setTemplateResult({
          success: true,
          msg: `✓ Plantilla de ${templateAction.toUpperCase()} enviada exitosamente al cliente por WhatsApp Cloud API Oficial.`
        });
      } else {
        setTemplateResult({
          success: false,
          msg: `Error: ${data.error || 'No se pudo despachar el mensaje'}`
        });
      }
    } catch (e: any) {
      setTemplateResult({
        success: false,
        msg: `Fallo de conexión: ${e.message}`
      });
    } finally {
      setIsSendingTemplate(false);
    }
  };

  // Load orders
  useEffect(() => {
    const stored = localStorage.getItem('crm_orders');
    if (stored) {
      try {
        setOrders(JSON.parse(stored));
      } catch (e) {
        initializeMockData();
      }
    } else {
      initializeMockData();
    }
  }, []);

  const initializeMockData = () => {
    const mock: Order[] = [
      {
        id: "PED-9021",
        clientName: "Carlos Ruiz",
        phone: "+57 315 888 9900",
        products: "1x Aspiradora Robot CleanMax",
        total: 350000,
        source: "WhatsApp Bot",
        paymentStatus: "Contra entrega",
        shippingStatus: "Entregado",
        trackingCode: "CO-DRP-1293812",
        date: "2026-07-03",
        confirmationStatus: "Confirmado"
      },
      {
        id: "PED-9022",
        clientName: "María Camila Restrepo",
        phone: "+57 300 123 4567",
        products: "1x Smartwatch Ultra X8",
        total: 120000,
        source: "WhatsApp Bot",
        paymentStatus: "Contra entrega",
        shippingStatus: "En camino",
        trackingCode: "CO-DRP-8823192",
        date: "2026-07-05",
        confirmationStatus: "Confirmado"
      },
      {
        id: "PED-9023",
        clientName: "Juan Pérez",
        phone: "+57 312 444 5566",
        products: "2x Auriculares Pro 4",
        total: 380000,
        source: "Instagram Direct",
        paymentStatus: "Pagado",
        shippingStatus: "Bodega Medellín",
        trackingCode: "CO-DRP-4491029",
        date: "2026-07-04",
        confirmationStatus: "Confirmado"
      },
      {
        id: "PED-9024",
        clientName: "Estefanía Gómez",
        phone: "+57 322 777 4433",
        products: "1x Licuadora Portátil ShakeGo",
        total: 85000,
        source: "TikTok Lead",
        paymentStatus: "Contra entrega",
        shippingStatus: "Creado en Dropi",
        trackingCode: "CO-DRP-7182934",
        date: "2026-07-05",
        confirmationStatus: "No Confirmado"
      },
      {
        id: "PED-9025",
        clientName: "Santiago Mendoza",
        phone: "+57 310 555 1122",
        products: "1x Auriculares Pro 4",
        total: 190000,
        source: "WhatsApp Bot",
        paymentStatus: "Contra entrega",
        shippingStatus: "Creado en Dropi",
        trackingCode: "CO-DRP-9923841",
        date: "2026-07-05",
        confirmationStatus: "No Confirmado"
      },
      {
        id: "PED-9026",
        clientName: "Diana Marcela Montoya",
        phone: "+57 320 666 4488",
        products: "1x Smartwatch Ultra X8",
        total: 120000,
        source: "WhatsApp Bot",
        paymentStatus: "Contra entrega",
        shippingStatus: "Creado en Dropi",
        trackingCode: "CO-DRP-3392810",
        date: "2026-07-05",
        confirmationStatus: "No Confirmado"
      }
    ];
    localStorage.setItem('crm_orders', JSON.stringify(mock));
    setOrders(mock);
  };

  const saveToStorage = (updated: Order[]) => {
    localStorage.setItem('crm_orders', JSON.stringify(updated));
    setOrders(updated);
  };

  const resetForm = () => {
    setFormClientName('');
    setFormPhone('');
    setFormProducts('');
    setFormTotal(0);
    setFormSource('WhatsApp Bot');
    setFormPayment('Contra entrega');
    setFormShipping('Creado en Dropi');
    setFormTracking('');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormConfirmationStatus('Confirmado');
    setSelectedOrderId(null);
    setIsEditMode(false);
  };

  const handleOpenCreate = () => {
    resetForm();
    setFormTracking(`CO-DRP-${Math.floor(1000000 + Math.random() * 9000000)}`);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (order: Order) => {
    setFormClientName(order.clientName);
    setFormPhone(order.phone || '');
    setFormProducts(order.products || '');
    setFormTotal(order.total);
    setFormSource(order.source);
    setFormPayment(order.paymentStatus);
    setFormShipping(order.shippingStatus);
    setFormTracking(order.trackingCode);
    setFormDate(order.date);
    setFormConfirmationStatus(order.confirmationStatus || 'Confirmado');
    setSelectedOrderId(order.id);
    setIsEditMode(true);
    setIsFormOpen(true);
  };

  const handleDeleteOrder = (id: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar este pedido?')) {
      const updated = orders.filter(o => o.id !== id);
      saveToStorage(updated);
    }
  };

  const handleSaveOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formClientName || !formProducts || !formTotal) {
      alert('Por favor completa todos los campos requeridos.');
      return;
    }

    if (isEditMode && selectedOrderId) {
      const updated = orders.map(o => o.id === selectedOrderId ? {
        ...o,
        clientName: formClientName,
        phone: formPhone,
        products: formProducts,
        total: Number(formTotal),
        source: formSource,
        paymentStatus: formPayment,
        shippingStatus: formShipping,
        trackingCode: formTracking,
        date: formDate,
        confirmationStatus: formConfirmationStatus
      } : o);
      saveToStorage(updated);
    } else {
      const newOrder: Order = {
        id: `PED-${Math.floor(9000 + Math.random() * 1000)}`,
        clientName: formClientName,
        phone: formPhone || '+57 300 000 0000',
        products: formProducts,
        total: Number(formTotal),
        source: formSource,
        paymentStatus: formPayment,
        shippingStatus: formShipping,
        trackingCode: formTracking || `CO-DRP-${Math.floor(1000000 + Math.random() * 9000000)}`,
        date: formDate || new Date().toISOString().split('T')[0],
        confirmationStatus: formConfirmationStatus
      };
      saveToStorage([...orders, newOrder]);
    }

    setIsFormOpen(false);
    resetForm();
  };

  // Dropi Sincronización API Simulation
  const handleDropiSync = () => {
    setIsSyncing(true);
    setSyncMessage('Conectando con la API de Dropi Latam...');

    setTimeout(() => {
      setSyncMessage('Autenticando credenciales de MasterShop/Dropi...');
      setTimeout(() => {
        setSyncMessage('Descargando guías de transporte actualizadas...');
        setTimeout(() => {
          // Update orders with simulated tracking statuses
          const updated = orders.map(o => {
            if (o.shippingStatus === 'Creado en Dropi') {
              return { ...o, shippingStatus: 'Bodega Medellín' };
            } else if (o.shippingStatus === 'Bodega Medellín') {
              return { ...o, shippingStatus: 'En camino' };
            } else if (o.shippingStatus === 'En camino' && Math.random() > 0.4) {
              return { ...o, shippingStatus: 'Entregado' };
            }
            return o;
          });
          saveToStorage(updated);
          setIsSyncing(false);
          setSyncMessage('');
          alert('📦 ¡Sincronización con Dropi Completada con Éxito! Las guías se han actualizado en tiempo real.');
        }, 1200);
      }, 1000);
    }, 1000);
  };

  // Filter orders
  const filteredOrders = orders.filter(o => {
    const clientNameStr = o.clientName || '';
    const productsStr = o.products || '';
    const trackingStr = o.trackingCode || '';
    const idStr = o.id || '';

    const matchesSearch = clientNameStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          productsStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          trackingStr.includes(searchTerm) ||
                          idStr.includes(searchTerm);

    const matchesShipping = filterShipping === 'ALL' || o.shippingStatus === filterShipping;
    const matchesPayment = filterPayment === 'ALL' || o.paymentStatus === filterPayment;

    const currentConfStatus = o.confirmationStatus || 'Confirmado';
    const matchesConfirmation = activeConfirmationFilter === 'ALL' || currentConfStatus === activeConfirmationFilter;

    return matchesSearch && matchesShipping && matchesPayment && matchesConfirmation;
  });

  // Quick Action to confirm an order
  const handleQuickConfirm = (id: string) => {
    const updated = orders.map(o => o.id === id ? { ...o, confirmationStatus: 'Confirmado' as const } : o);
    saveToStorage(updated);
  };

  // Calculate stats
  const totalOrdersCount = orders.length;
  const confirmedCount = orders.filter(o => (o.confirmationStatus || 'Confirmado') === 'Confirmado').length;
  const unconfirmedCount = orders.filter(o => (o.confirmationStatus || 'Confirmado') === 'No Confirmado').length;
  const totalSales = orders.reduce((sum, o) => sum + o.total, 0);
  const pendingShipments = orders.filter(o => o.shippingStatus !== 'Entregado').length;
  const syncRate = totalOrdersCount > 0 ? 100 : 0; // Simulated sync percentage

  return (
    <div className="space-y-6 animate-fade-in text-left">

      {/* Header Banner */}
      <div className="bg-[#0c0c0c] border border-gray-800 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-6 opacity-5">
          <ShoppingCart size={120} />
        </div>
        <div className="max-w-2xl relative z-10">
          <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-gold animate-pulse"></span>
            Gestor de Pedidos Automatizado (Dropi API)
          </h3>
          <p className="text-xs text-gray-400">
            Módulo oficial de logística integrado. Todos los pedidos pactados por el WhatsApp Bot se registran en este panel y se transmiten automáticamente a las APIs de Dropi, Effix o MasterShop para su despacho Contra Entrega.
          </p>
        </div>
      </div>

      {/* Metrics Board */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="panel p-5 rounded-xl border border-gray-800 bg-[#111] flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <ShoppingCart size={20} />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Total Pedidos</p>
            <p className="text-xl font-bold font-mono text-white mt-0.5">{totalOrdersCount}</p>
          </div>
        </div>

        <div className="panel p-5 rounded-xl border border-gray-800 bg-[#111] flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Pedidos Confirmados</p>
            <p className="text-xl font-bold font-mono text-green-400 mt-0.5">{confirmedCount}</p>
          </div>
        </div>

        <div className="panel p-5 rounded-xl border border-gray-800 bg-[#111] flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Clock size={20} />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Pedidos No Confirmados</p>
            <p className="text-xl font-bold font-mono text-amber-400 mt-0.5">{unconfirmedCount}</p>
          </div>
        </div>

        <div className="panel p-5 rounded-xl border border-gray-800 bg-[#111] flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <DollarSign size={20} />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Ventas Totales</p>
            <p className="text-lg font-bold font-mono text-white mt-0.5">
              {totalSales.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}
            </p>
          </div>
        </div>
      </div>

      {/* Confirmation Status Tabs */}
      <div className="flex border-b border-gray-800 gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin">
        {[
          { id: 'ALL', label: 'Todos los Pedidos', count: totalOrdersCount, color: 'border-gold/50 text-gold bg-gold/5', inactive: 'hover:text-gray-200 border-transparent text-gray-400 hover:bg-gray-900/40', icon: <ShoppingCart size={14} /> },
          { id: 'Confirmado', label: 'Pedidos Confirmados', count: confirmedCount, color: 'border-green-500/50 text-green-400 bg-green-500/5', inactive: 'hover:text-gray-200 border-transparent text-gray-400 hover:bg-gray-900/40', icon: <CheckCircle2 size={14} /> },
          { id: 'No Confirmado', label: 'Pedidos No Confirmados', count: unconfirmedCount, color: 'border-amber-500/50 text-amber-400 bg-amber-500/5', inactive: 'hover:text-gray-200 border-transparent text-gray-400 hover:bg-gray-900/40', icon: <Clock size={14} /> }
        ].map((tab) => {
          const isActive = activeConfirmationFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveConfirmationFilter(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-xs font-bold transition-all shrink-0 cursor-pointer ${
                isActive ? tab.color : tab.inactive
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.5 text-[10px] font-mono rounded-full ${
                isActive
                  ? 'bg-white/10 text-current'
                  : 'bg-[#1a1a1a] text-gray-500 border border-gray-800'
              }`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Sync State Loader */}
      {isSyncing && (
        <div className="bg-blue-950/20 border border-blue-500/20 rounded-xl p-4 flex items-center gap-3 text-xs text-blue-300">
          <RefreshCw size={16} className="animate-spin shrink-0 text-blue-400" />
          <div className="flex-1 text-left">
            <p className="font-bold">Sincronizando con Dropi en tiempo real...</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{syncMessage}</p>
          </div>
        </div>
      )}

      {/* Control Actions */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-[#111] p-4 rounded-xl border border-gray-800">
        <div className="flex-1 w-full relative">
          <Search size={16} className="text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por cliente, pedido, guía, producto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-black border border-gray-800 rounded-xl py-2 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-gold transition-colors"
          />
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <button
            onClick={handleDropiSync}
            disabled={isSyncing}
            className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-2 transition disabled:opacity-50"
          >
            <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} /> Sincronizar Dropi API
          </button>
          <button
            onClick={handleOpenCreate}
            className="bg-gold text-black hover:bg-yellow-400 text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-2 transition"
          >
            <Plus size={14} /> Registrar Pedido Manual
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#111] p-4 rounded-xl border border-gray-800/60 text-xs text-gray-400">
        <div>
          <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1.5">Filtrar por Estado de Envío</label>
          <select
            value={filterShipping}
            onChange={(e) => setFilterShipping(e.target.value)}
            className="w-full bg-black border border-gray-800 rounded-lg p-2 text-white focus:border-gold outline-none"
          >
            <option value="ALL">Todos los Envíos</option>
            <option value="Creado en Dropi">Creado en Dropi / Pendiente</option>
            <option value="Bodega Medellín">Bodega Medellín / Alistamiento</option>
            <option value="En camino">En camino / Tránsito</option>
            <option value="Entregado">Entregado / Completado</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1.5">Filtrar por Estado de Pago</label>
          <select
            value={filterPayment}
            onChange={(e) => setFilterPayment(e.target.value)}
            className="w-full bg-black border border-gray-800 rounded-lg p-2 text-white focus:border-gold outline-none"
          >
            <option value="ALL">Todas las formas de pago</option>
            <option value="Contra entrega">Contra Entrega / Pago al Recibir</option>
            <option value="Pagado">Pagado (Transferencia, Tarjeta)</option>
            <option value="Pendiente">Pendiente de Pago</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="panel bg-[#0c0c0c] rounded-xl border border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-800 bg-[#111] text-[10px] text-gray-500 uppercase font-bold">
                <th className="p-4">Pedido ID / Fecha</th>
                <th className="p-4">Cliente</th>
                <th className="p-4">Detalle Productos</th>
                <th className="p-4">Total</th>
                <th className="p-4">Canal</th>
                <th className="p-4">Confirmación</th>
                <th className="p-4">Pago</th>
                <th className="p-4">Estado Envío / Guía Dropi</th>
                <th className="p-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-850 text-xs">
              {filteredOrders.length > 0 ? (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-900/30 transition-colors">
                    <td className="p-4">
                      <div>
                        <span className="font-bold text-white text-sm block font-mono">{order.id}</span>
                        <span className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
                          <Calendar size={10} /> {order.date}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div>
                        <span className="font-bold text-gray-200 block">{order.clientName}</span>
                        <span className="text-[10px] text-gray-500 block font-mono">{order.phone}</span>
                      </div>
                    </td>
                    <td className="p-4 font-medium text-gray-300">{order.products}</td>
                    <td className="p-4 font-bold font-mono text-green-400">
                      {order.total.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}
                    </td>
                    <td className="p-4 text-gray-400 font-medium">{order.source}</td>
                    <td className="p-4">
                      {(() => {
                        const isConfirmed = (order.confirmationStatus || 'Confirmado') === 'Confirmado';
                        return (
                          <div className="flex flex-col gap-1.5 items-start">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                              isConfirmed
                                ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}>
                              {isConfirmed ? <CheckCircle2 size={10} className="shrink-0 animate-scale-up" /> : <Clock size={10} className="shrink-0 animate-pulse" />}
                              {isConfirmed ? 'Confirmado' : 'No Confirmado'}
                            </span>
                            {!isConfirmed && (
                              <button
                                onClick={() => handleQuickConfirm(order.id)}
                                className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold hover:underline flex items-center gap-0.5 cursor-pointer bg-transparent border-none p-0 mt-0.5 transition-colors"
                                title="Confirmar este pedido e iniciar despacho"
                              >
                                <CheckCircle2 size={10} /> Confirmar ahora
                              </button>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                        order.paymentStatus === 'Pagado'
                          ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                          : order.paymentStatus === 'Contra entrega'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {order.paymentStatus}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="space-y-1">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider block w-fit ${
                          order.shippingStatus === 'Entregado'
                            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                            : order.shippingStatus === 'En camino'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : 'bg-gray-800 text-gray-400 border border-gray-750'
                        }`}>
                          {order.shippingStatus}
                        </span>
                        <button
                          onClick={() => setActiveTracking(order.trackingCode)}
                          className="font-mono text-[10px] text-sky-400 hover:underline flex items-center gap-1 cursor-pointer bg-transparent border-none"
                        >
                          <Truck size={10} /> {order.trackingCode}
                        </button>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedTemplateOrder(order);
                            setTemplateResult(null);
                          }}
                          className="p-1.5 bg-emerald-950/25 hover:bg-emerald-900/40 text-emerald-400 rounded border border-emerald-800/30 transition shadow-sm"
                          title="Enviar Notificación Oficial WhatsApp (Meta API)"
                        >
                          <MessageSquare size={13} />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(order)}
                          className="p-1.5 bg-gray-800 hover:bg-gray-750 text-gray-400 hover:text-white rounded transition"
                          title="Editar"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteOrder(order.id)}
                          className="p-1.5 bg-red-950/20 hover:bg-red-900/20 text-red-400 hover:text-red-300 rounded border border-red-900/10 transition"
                          title="Eliminar"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-gray-500 italic bg-[#0f0f0f]/50">
                    No se encontraron pedidos con los filtros aplicados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE & EDIT FORM MODAL */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0c0c0c] border border-gray-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-scale-up relative">
            <button
              onClick={() => setIsFormOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white transition"
            >
              <X size={18} />
            </button>
            <div className="p-6 border-b border-gray-800 bg-[#111]">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShoppingCart size={18} className="text-gold" />
                {isEditMode ? 'Editar Pedido' : 'Registrar Pedido de Venta'}
              </h3>
              <p className="text-[10px] text-gray-400 mt-1">Vincula los pedidos acordados en el chatbot de WhatsApp directamente con tu proveedor o transportadora.</p>
            </div>

            <form onSubmit={handleSaveOrder} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar text-left">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Nombre del Cliente</label>
                  <input
                    type="text"
                    required
                    placeholder="ej. Carlos Ruiz"
                    value={formClientName}
                    onChange={(e) => setFormClientName(e.target.value)}
                    className="w-full bg-black border border-gray-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-gold"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Teléfono / WhatsApp</label>
                  <input
                    type="text"
                    required
                    placeholder="ej. +57 315 888 9900"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full bg-black border border-gray-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-gold"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Detalle Productos (Cantidad y Nombre)</label>
                <input
                  type="text"
                  required
                  placeholder="ej. 1x Aspiradora Robot CleanMax"
                  value={formProducts}
                  onChange={(e) => setFormProducts(e.target.value)}
                  className="w-full bg-black border border-gray-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-gold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Total Pedido (COP)</label>
                  <input
                    type="number"
                    required
                    placeholder="ej. 350000"
                    value={formTotal}
                    onChange={(e) => setFormTotal(Number(e.target.value))}
                    className="w-full bg-black border border-gray-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-gold"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Canal Origen</label>
                  <select
                    value={formSource}
                    onChange={(e) => setFormSource(e.target.value)}
                    className="w-full bg-black border border-gray-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-gold"
                  >
                    <option value="WhatsApp Bot">WhatsApp Bot</option>
                    <option value="Facebook Messenger">Facebook Messenger</option>
                    <option value="Instagram Direct">Instagram Direct</option>
                    <option value="TikTok Lead">TikTok Lead</option>
                    <option value="Manual / Oficina">Manual / Oficina</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Estado de Pago</label>
                  <select
                    value={formPayment}
                    onChange={(e) => setFormPayment(e.target.value)}
                    className="w-full bg-black border border-gray-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-gold"
                  >
                    <option value="Contra entrega">Contra entrega / Pago al recibir</option>
                    <option value="Pagado">Pagado</option>
                    <option value="Pendiente">Pendiente de pago</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Estado de Envío (Logística)</label>
                  <select
                    value={formShipping}
                    onChange={(e) => setFormShipping(e.target.value)}
                    className="w-full bg-black border border-gray-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-gold"
                  >
                    <option value="Creado en Dropi">Creado en Dropi</option>
                    <option value="Bodega Medellín">Bodega Medellín</option>
                    <option value="En camino">En camino / Tránsito</option>
                    <option value="Entregado">Entregado / Completado</option>
                    <option value="Cancelado">Cancelado</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Código de Rastreo (Dropi ID)</label>
                  <input
                    type="text"
                    placeholder="ej. CO-DRP-8823192"
                    value={formTracking}
                    onChange={(e) => setFormTracking(e.target.value)}
                    className="w-full bg-black border border-gray-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-gold font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Fecha de Pedido</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full bg-black border border-gray-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-gold"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Estado de Confirmación (Flujo de Ventas)</label>
                <select
                  value={formConfirmationStatus}
                  onChange={(e) => setFormConfirmationStatus(e.target.value as 'Confirmado' | 'No Confirmado')}
                  className="w-full bg-black border border-gray-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-gold"
                >
                  <option value="Confirmado">🟢 Confirmado (Listo para despacho / Dropi)</option>
                  <option value="No Confirmado">🟡 No Confirmado (Pendiente de validar dirección/llamada)</option>
                </select>
              </div>

              <div className="flex gap-2 pt-4 border-t border-gray-850">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="flex-1 bg-gray-900 hover:bg-gray-850 text-gray-400 hover:text-white transition font-bold py-2.5 rounded-lg text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gold text-black hover:bg-yellow-400 transition font-bold py-2.5 rounded-lg text-xs"
                >
                  {isEditMode ? 'Guardar Cambios' : 'Registrar Pedido'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TRACKING STEP DETAILS MODAL */}
      {activeTracking && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0c0c0c] border border-gray-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-scale-up relative">
            <button
              onClick={() => setActiveTracking(null)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white transition"
            >
              <X size={18} />
            </button>
            <div className="p-5 border-b border-gray-800 bg-[#111] text-left">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Truck size={16} className="text-gold" />
                Seguimiento de Guía: {activeTracking}
              </h3>
              <p className="text-[9px] text-gray-500 font-mono mt-0.5">Fulfillment API Dropi • Sincronizado</p>
            </div>

            <div className="p-6 space-y-6 text-left">
              <div className="relative border-l-2 border-gray-800 pl-6 space-y-6">

                {/* Step 4 */}
                <div className="relative">
                  <div className={`absolute -left-[31px] top-0 w-4 h-4 rounded-full border-2 bg-black flex items-center justify-center ${
                    orders.find(o => o.trackingCode === activeTracking)?.shippingStatus === 'Entregado'
                      ? 'border-green-500 bg-green-500/20 text-green-500'
                      : 'border-gray-800 text-gray-600'
                  }`}>
                    {orders.find(o => o.trackingCode === activeTracking)?.shippingStatus === 'Entregado' && <CheckCircle2 size={10} />}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Entregado al Cliente</h4>
                    <p className="text-[10px] text-gray-500 leading-normal mt-0.5">El destinatario pagó y recibió el paquete a la transportadora (Servientrega/Coordinadora).</p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="relative">
                  <div className={`absolute -left-[31px] top-0 w-4 h-4 rounded-full border-2 bg-black flex items-center justify-center ${
                    ['En camino', 'Entregado'].includes(orders.find(o => o.trackingCode === activeTracking)?.shippingStatus || '')
                      ? 'border-blue-500 bg-blue-500/20 text-blue-500'
                      : 'border-gray-800 text-gray-600'
                  }`}>
                    {['En camino', 'Entregado'].includes(orders.find(o => o.trackingCode === activeTracking)?.shippingStatus || '') && <CheckCircle2 size={10} />}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">En Camino / En Reparto</h4>
                    <p className="text-[10px] text-gray-500 leading-normal mt-0.5">El paquete está en el vehículo de Servientrega camino a la dirección de entrega.</p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="relative">
                  <div className={`absolute -left-[31px] top-0 w-4 h-4 rounded-full border-2 bg-black flex items-center justify-center ${
                    ['Bodega Medellín', 'En camino', 'Entregado'].includes(orders.find(o => o.trackingCode === activeTracking)?.shippingStatus || '')
                      ? 'border-blue-500 bg-blue-500/20 text-blue-500'
                      : 'border-gray-800 text-gray-600'
                  }`}>
                    {['Bodega Medellín', 'En camino', 'Entregado'].includes(orders.find(o => o.trackingCode === activeTracking)?.shippingStatus || '') && <CheckCircle2 size={10} />}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Despachado de Bodega Principal</h4>
                    <p className="text-[10px] text-gray-500 leading-normal mt-0.5">El proveedor en Medellín aprobó el stock y entregó la caja al centro de acopio logístico.</p>
                  </div>
                </div>

                {/* Step 1 */}
                <div className="relative">
                  <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full border-2 border-green-500 bg-green-500/20 text-green-500 flex items-center justify-center">
                    <CheckCircle2 size={10} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Guía Generada en Dropi</h4>
                    <p className="text-[10px] text-gray-500 leading-normal mt-0.5">Pedido creado y código de barras asignado para Pago Contra Entrega de manera exitosa.</p>
                  </div>
                </div>

              </div>

              <button
                onClick={() => setActiveTracking(null)}
                className="w-full bg-gray-950 hover:bg-gray-900 border border-gray-800 text-gray-300 font-bold py-2 rounded-xl text-xs transition mt-2"
              >
                Cerrar Detalle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Enviar Plantilla Oficial WhatsApp Meta (Zernio) */}
      {selectedTemplateOrder && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-scale-up">
            <div className="p-5 border-b border-zinc-850 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
                  <Smartphone size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">Disparar Notificación WhatsApp Oficial</h4>
                  <p className="text-[10px] text-zinc-400">Meta Cloud API • Pedido #{selectedTemplateOrder.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTemplateOrder(null)}
                className="text-zinc-500 hover:text-white p-1 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* Info Cliente */}
              <div className="bg-zinc-900/60 p-3 rounded-xl border border-zinc-800/80 flex items-center justify-between">
                <div>
                  <span className="font-bold text-white block">{selectedTemplateOrder.clientName}</span>
                  <span className="text-[11px] text-zinc-400 font-mono">{selectedTemplateOrder.phone}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-zinc-500 block uppercase">Origen</span>
                  <span className="text-xs font-bold text-amber-400">{selectedTemplateOrder.source}</span>
                </div>
              </div>

              {/* Selector de Plantilla */}
              <div>
                <label className="text-zinc-300 font-bold block mb-1.5">Seleccionar Tipo de Plantilla</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'confirm', label: '1. Confirmación de Pedido', desc: 'Validación de dirección y valor' },
                    { id: 'dispatch', label: '2. Despacho & Guía', desc: 'Envío de número de rastreo' },
                    { id: 'novelty', label: '3. Novedad en Entrega', desc: 'Alerta de entrega fallida' },
                    { id: 'delivered', label: '4. Pedido Entregado', desc: 'Cierre exitoso de venta' }
                  ].map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => setTemplateAction(tpl.id as any)}
                      className={`p-2.5 rounded-xl border text-left transition ${
                        templateAction === tpl.id
                          ? 'bg-emerald-500/10 border-emerald-500 text-emerald-300'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      <div className="font-bold text-xs">{tpl.label}</div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">{tpl.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {templateAction === 'novelty' && (
                <div>
                  <label className="text-zinc-300 font-bold block mb-1">Causa de la Novedad Reportada</label>
                  <input
                    type="text"
                    value={templateCustomReason}
                    onChange={(e) => setTemplateCustomReason(e.target.value)}
                    placeholder="Ej. Dirección errada o cliente no se encontraba en el domicilio"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white text-xs focus:border-emerald-500 outline-none"
                  />
                </div>
              )}

              {/* Burbuja Preview */}
              <div className="bg-emerald-950/20 border border-emerald-800/30 p-3.5 rounded-xl text-zinc-300 text-[11px] leading-relaxed">
                <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider block mb-1">
                  Mensaje Oficial Meta (Plantilla Aprobada)
                </span>
                {templateAction === 'confirm' && (
                  `¡Hola ${selectedTemplateOrder.clientName}! Hemos recibido tu pedido #${selectedTemplateOrder.id} de "${selectedTemplateOrder.products}" por valor de ${selectedTemplateOrder.total.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })} en modalidad contra entrega. Para despacharlo a tu dirección, por favor confirma respondiendo este mensaje.`
                )}
                {templateAction === 'dispatch' && (
                  `¡Buenas noticias ${selectedTemplateOrder.clientName}! Tu pedido #${selectedTemplateOrder.id} de "${selectedTemplateOrder.products}" ya fue despachado. Tu número de guía es ${selectedTemplateOrder.trackingCode || 'SER-PENDIENTE'}.`
                )}
                {templateAction === 'novelty' && (
                  `Hola ${selectedTemplateOrder.clientName}, la transportadora reportó una novedad con tu pedido #${selectedTemplateOrder.id}: "${templateCustomReason}". Por favor respóndenos para coordinar la entrega.`
                )}
                {templateAction === 'delivered' && (
                  `¡Hola ${selectedTemplateOrder.clientName}! La transportadora nos confirma que tu pedido #${selectedTemplateOrder.id} ha sido entregado con éxito. ¡Gracias por tu compra!`
                )}
              </div>

              {templateResult && (
                <div className={`p-3 rounded-xl border text-xs ${
                  templateResult.success
                    ? 'bg-green-500/10 border-green-500/30 text-green-300'
                    : 'bg-red-500/10 border-red-500/30 text-red-300'
                }`}>
                  {templateResult.msg}
                </div>
              )}
            </div>

            <div className="p-4 bg-zinc-900/50 border-t border-zinc-850 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedTemplateOrder(null)}
                className="px-4 py-2 text-xs font-bold text-zinc-400 hover:text-white"
              >
                Cerrar
              </button>
              <button
                type="button"
                disabled={isSendingTemplate}
                onClick={handleSendWhatsAppLogisticsTemplate}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5"
              >
                <Send size={13} />
                {isSendingTemplate ? 'Despachando a Meta...' : 'Enviar por WhatsApp'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

import React, { useState } from 'react';
import { 
  Mail, Send, Sparkles, Zap, Users, BarChart3, Clock, CheckCircle2, 
  Plus, Edit3, Trash2, Eye, ArrowUpRight, Filter, Download, Copy, RefreshCw, 
  Layers, ShoppingCart, Tag, AlertCircle, FileText, LayoutTemplate, MousePointer
} from 'lucide-react';

interface EmailCampaign {
  id: string;
  subject: string;
  listName: string;
  sentDate: string;
  status: 'Enviada' | 'Programada' | 'Borrador';
  sentCount: number;
  openRate: string;
  clickRate: string;
  revenue: string;
}

interface EmailFlow {
  id: string;
  name: string;
  trigger: string;
  emailsCount: number;
  status: 'Activo' | 'Pausado';
  subscribersInFlow: number;
  conversionRate: string;
}

export default function EmailMarketingView() {
  const [activeTab, setActiveTab] = useState<'disenador' | 'flujos' | 'campanas' | 'listas' | 'analitica'>('disenador');

  // AI Email Generator Form State
  const [productName, setProductName] = useState('Smartwatch Ultra X9 Contra Entrega');
  const [emailObjective, setEmailObjective] = useState<'carrito' | 'bienvenida' | 'promocion' | 'confirmacion_cod'>('carrito');
  const [discountPercent, setDiscountPercent] = useState('15%');
  const [isGenerating, setIsGenerating] = useState(false);

  // Generated Email Copy State
  const [generatedSubject, setGeneratedSubject] = useState('⏰ ¡Tu pedido no ha finalizado! Guarda tu 15% de descuento antes de medianoche');
  const [generatedPreheader, setPreheader] = useState('Completa tu envío Contra Entrega en 1 clic y paga al recibir en tu puerta.');
  const [generatedBody, setGeneratedBody] = useState(`¡Hola {primer_nombre}!

Notamos que dejaste el producto **Smartwatch Ultra X9** en tu carrito de compras.

Sabemos que a veces surgen imprevistos, por eso queremos facilitarte la decisión:

🔥 **Obtén un 15% DE DESCUENTO ADICIONAL + Envío Gratis pagando al recibir.**

👉 [Haz clic aquí para reclamar tu descuento y finalizar la orden]

Recuerda que no necesitas tarjeta de crédito; pagas directamente al mensajero cuando entregue el paquete en tu puerta.

*Oferta válida por las próximas 24 horas.*

Saludos,
El Equipo de Tienda Express`);

  // Campaigns List State
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([
    {
      id: 'camp_1',
      subject: '🔥 Venta Flash 24H: 40% OFF en Tecnología Contra Entrega',
      listName: 'Compradores Frecuentes (VIP)',
      sentDate: 'Ayer, 9:00 AM',
      status: 'Enviada',
      sentCount: 4850,
      openRate: '42.8%',
      clickRate: '14.2%',
      revenue: '$4,280.000 COP'
    },
    {
      id: 'camp_2',
      subject: '📦 Tu guía de rastreo para el pedido COD está lista',
      listName: 'Pedidos Recientes COD',
      sentDate: 'Hoy, 8:15 AM',
      status: 'Enviada',
      sentCount: 1240,
      openRate: '68.5%',
      clickRate: '38.1%',
      revenue: '$1,120.000 COP'
    },
    {
      id: 'camp_3',
      subject: '⚡ 3 Productos Ganadores que no te puedes perder este mes',
      listName: 'Suscriptores Generales',
      sentDate: 'Programada para Mañana',
      status: 'Programada',
      sentCount: 12500,
      openRate: '0.0%',
      clickRate: '0.0%',
      revenue: '$0 COP'
    }
  ]);

  // Automated Email Flows State
  const [flows, setFlows] = useState<EmailFlow[]>([
    {
      id: 'flow_1',
      name: 'Recuperación de Carrito Abandonado (3 Pasos)',
      trigger: 'Evento: Carrito abandonado sin pago en el checkout',
      emailsCount: 3,
      status: 'Activo',
      subscribersInFlow: 142,
      conversionRate: '18.4%'
    },
    {
      id: 'flow_2',
      name: 'Secuencia de Confirmación & Fidelización COD',
      trigger: 'Evento: Pedido realizado con opción Pago Contra Entrega',
      emailsCount: 2,
      status: 'Activo',
      subscribersInFlow: 380,
      conversionRate: '44.2%'
    },
    {
      id: 'flow_3',
      name: 'Bienvenida + Cupón de Primera Compra',
      trigger: 'Evento: Registro de email en formulario o pop-up',
      emailsCount: 1,
      status: 'Activo',
      subscribersInFlow: 890,
      conversionRate: '12.1%'
    }
  ]);

  // Handle AI Email Copy Generation
  const handleGenerateCopy = (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);

    setTimeout(() => {
      if (emailObjective === 'carrito') {
        setGeneratedSubject(`⏰ ${productName}: Tu carrito expire en breve + ${discountPercent} OFF`);
        setPreheader('Asegura tu reserva con envío gratis y pago al recibir en tu puerta.');
        setGeneratedBody(`¡Hola {primer_nombre}!

Tu carrito con **${productName}** te está esperando.

Aprovecha este cupón especial de **${discountPercent} DE DESCUENTO** exclusivo para ti.

👉 [Haz clic aquí para activar tu cupón y pagar Contra Entrega]

¡Gracias por elegirnos!`);
      } else if (emailObjective === 'confirmacion_cod') {
        setGeneratedSubject(`✅ ¡Pedido Confirmado! Tu ${productName} está en preparación`);
        setPreheader('Prepara el efectivo para cuando la transportadora llegue a tu domicilio.');
        setGeneratedBody(`¡Hola {primer_nombre}!

Queremos confirmarte que tu pedido de **${productName}** ha sido registrado con éxito.

📦 **Detalles de tu Entrega:**
- Método de Pago: **Pago Contra Entrega (Efectivo al recibir)**
- Tiempo estimado: **2 a 4 días hábiles**

Tan pronto la transportadora nos entregue tu número de guía, te lo enviaremos por este medio y por WhatsApp.

¡Gracias por tu confianza!`);
      } else {
        setGeneratedSubject(`🔥 ¡Súper Oferta de Lanzamiento en ${productName}!`);
        setPreheader('Lleva el tuyo antes de que se agote el stock disponible.');
        setGeneratedBody(`¡Hola {primer_nombre}!

Tenemos excelentes noticias. **${productName}** ya está disponible con un descuento especial del **${discountPercent}**.

👉 [Aprovechar la oferta antes de que finalice]`);
      }

      setIsGenerating(false);
    }, 1800);
  };

  return (
    <div className="p-4 sm:p-6 bg-[#0c0c0e] text-white min-h-screen space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-950 via-[#121216] to-pink-950 border border-purple-800/40 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/20 border border-purple-500/30 rounded-full text-purple-300 text-xs font-bold uppercase tracking-wider">
            <Mail size={14} className="text-pink-400 animate-pulse" /> Marketing Automático & Flujos de Email
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Módulo de Email Marketing
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 max-w-2xl">
            Diseña campañas de alto Open-Rate con IA, automatiza la recuperación de carritos y fideliza a tus compradores COD en piloto automático.
          </p>
        </div>

        <button 
          onClick={() => setActiveTab('disenador')}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-xs transition-colors flex items-center gap-2 shadow-lg shadow-purple-950 shrink-0"
        >
          <Sparkles size={16} /> Crear Email con IA (Gemini)
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-[#121215] border border-gray-800 rounded-2xl p-4 space-y-1">
          <span className="text-xs text-gray-400 font-medium flex items-center justify-between">
            Emails Enviados Este Mes <Send size={16} className="text-purple-400" />
          </span>
          <p className="text-2xl font-black text-white">18,590</p>
          <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
            <ArrowUpRight size={12} /> +24% vs mes anterior
          </span>
        </div>

        <div className="bg-[#121215] border border-gray-800 rounded-2xl p-4 space-y-1">
          <span className="text-xs text-gray-400 font-medium flex items-center justify-between">
            Tasa de Apertura (Open Rate) <Eye size={16} className="text-pink-400" />
          </span>
          <p className="text-2xl font-black text-pink-400">46.2%</p>
          <span className="text-[11px] text-gray-400">Promedio industria: 21%</span>
        </div>

        <div className="bg-[#121215] border border-gray-800 rounded-2xl p-4 space-y-1">
          <span className="text-xs text-gray-400 font-medium flex items-center justify-between">
            Clics en Enlaces (CTR) <MousePointer size={16} className="text-indigo-400" />
          </span>
          <p className="text-2xl font-black text-white">16.8%</p>
          <span className="text-[11px] text-gray-400">3.2k clics dirigidos a checkout</span>
        </div>

        <div className="bg-[#121215] border border-gray-800 rounded-2xl p-4 space-y-1">
          <span className="text-xs text-gray-400 font-medium flex items-center justify-between">
            Ingresos Atribuidos a Email <ShoppingCart size={16} className="text-emerald-400" />
          </span>
          <p className="text-2xl font-black text-emerald-400">$6,840.000 COP</p>
          <span className="text-[11px] text-gray-400">Retorno de inversión de 14x</span>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex space-x-2 border-b border-gray-800 pb-1 overflow-x-auto no-scrollbar">
        {[
          { id: 'disenador', label: '✨ Generator & Editor de Copy IA', icon: Sparkles },
          { id: 'flujos', label: '⚡ Flujos Automatizados (Drip)', icon: Zap },
          { id: 'campanas', label: '📧 Campañas Masivas', icon: Mail },
          { id: 'listas', label: '👥 Listas & Segmentación', icon: Users },
          { id: 'analitica', label: '📊 Reportes de Métricas', icon: BarChart3 }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2.5 px-4 rounded-xl font-bold text-xs flex items-center gap-2 transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-950'
                  : 'bg-[#141418] text-gray-400 hover:text-white border border-gray-800'
              }`}
            >
              <Icon size={15} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: GENERADOR DE COPY CON IA & EDITOR */}
      {activeTab === 'disenador' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* AI Form Inputs */}
          <div className="bg-[#121215] border border-gray-800 rounded-3xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-purple-400">
              <Sparkles size={20} />
              <h3 className="font-bold text-base text-white">Generador de Copywriter de Email (Gemini IA)</h3>
            </div>
            <p className="text-xs text-gray-400">
              Crea asuntos magnéticos, textos de alta persuasión y llamados a la acción diseñados específicamente para e-commerce.
            </p>

            <form onSubmit={handleGenerateCopy} className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Nombre del Producto / Oferta</label>
                <input 
                  type="text"
                  required
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#18181c] border border-gray-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Objetivo del Correo</label>
                <select 
                  value={emailObjective}
                  onChange={(e) => setEmailObjective(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-[#18181c] border border-gray-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="carrito">🛒 Recuperación de Carrito Abandonado</option>
                  <option value="confirmacion_cod">📦 Confirmación de Pedido Pago Contra Entrega</option>
                  <option value="promocion">🔥 Oferta Flash / Descuento Limitado</option>
                  <option value="bienvenida">👋 Correo de Bienvenida & Marca</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Incentivo o Descuento</label>
                <input 
                  type="text"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(e.target.value)}
                  placeholder="Ej: 15% OFF o Envío Gratis"
                  className="w-full px-3.5 py-2.5 bg-[#18181c] border border-gray-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <button 
                type="submit"
                disabled={isGenerating}
                className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-purple-950 flex items-center justify-center gap-2"
              >
                {isGenerating ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {isGenerating ? 'Generando Copy con IA...' : 'Generar Correo con IA'}
              </button>
            </form>
          </div>

          {/* Email Preview Container */}
          <div className="bg-[#121215] border border-gray-800 rounded-3xl p-6 space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <Eye size={18} className="text-purple-400" /> Vista Previa del Email
                </h3>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-bold">
                  Score Estimado: 98/100
                </span>
              </div>

              {/* Subject & Preheader */}
              <div className="bg-[#18181c] rounded-2xl p-4 border border-gray-800 space-y-2">
                <div>
                  <span className="text-[10px] text-gray-500 font-bold uppercase block">Asunto (Subject)</span>
                  <p className="text-xs font-bold text-white">{generatedSubject}</p>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 font-bold uppercase block">Texto de Vista Previa (Preheader)</span>
                  <p className="text-xs text-gray-400">{generatedPreheader}</p>
                </div>
              </div>

              {/* Email Body Sandbox */}
              <div className="bg-white rounded-2xl p-5 text-gray-900 shadow-inner font-sans text-xs leading-relaxed space-y-3 min-h-[220px]">
                <div className="whitespace-pre-wrap">{generatedBody}</div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-800">
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(generatedBody);
                  alert('¡Texto del correo copiado al portapapeles!');
                }}
                className="px-4 py-2 bg-[#18181c] hover:bg-[#202026] text-gray-300 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-gray-700"
              >
                <Copy size={14} /> Copiar Texto
              </button>
              <button 
                onClick={() => alert('¡Correo guardado en tu biblioteca de plantillas!')}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-950 flex items-center gap-1.5"
              >
                <CheckCircle2 size={14} /> Usar esta Plantilla
              </button>
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: FLUJOS AUTOMATIZADOS (DRIP) */}
      {activeTab === 'flujos' && (
        <div className="bg-[#121215] border border-gray-800 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white text-base">Secuencias de Email Automatizadas (Drip Campaigns)</h3>
              <p className="text-xs text-gray-400">Correos que se envían solos según la conducta del comprador en tu tienda.</p>
            </div>
            <button className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5">
              <Plus size={16} /> Nuevo Flujo
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {flows.map(f => (
              <div key={f.id} className="bg-[#18181c] border border-gray-800 rounded-2xl p-5 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {f.status}
                    </span>
                    <span className="text-xs text-gray-400 font-mono">{f.emailsCount} correos</span>
                  </div>

                  <h4 className="font-bold text-white text-base">{f.name}</h4>
                  <p className="text-xs text-gray-400 leading-relaxed">{f.trigger}</p>
                </div>

                <div className="pt-3 border-t border-gray-800 flex items-center justify-between text-xs">
                  <span className="text-gray-400">En flujo: <strong>{f.subscribersInFlow}</strong></span>
                  <span className="text-emerald-400 font-bold">Conv. {f.conversionRate}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: CAMPAÑAS MASIVAS */}
      {activeTab === 'campanas' && (
        <div className="bg-[#121215] border border-gray-800 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-base">Campañas de Correo Enviadas</h3>
            <button className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5">
              <Plus size={16} /> Crear Campaña
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-300">
              <thead className="bg-[#18181c] text-gray-400 font-bold uppercase text-[10px] border-b border-gray-800">
                <tr>
                  <th className="py-3 px-4">Asunto / Campaña</th>
                  <th className="py-3 px-4">Lista Destino</th>
                  <th className="py-3 px-4">Fecha</th>
                  <th className="py-3 px-4">Aperturas</th>
                  <th className="py-3 px-4">Clics</th>
                  <th className="py-3 px-4">Ventas Generadas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {campaigns.map(c => (
                  <tr key={c.id} className="hover:bg-[#18181c]/60">
                    <td className="py-3 px-4 font-bold text-white">{c.subject}</td>
                    <td className="py-3 px-4 text-purple-300 font-medium">{c.listName}</td>
                    <td className="py-3 px-4 text-gray-400">{c.sentDate}</td>
                    <td className="py-3 px-4 font-bold text-pink-400">{c.openRate}</td>
                    <td className="py-3 px-4 font-bold text-indigo-400">{c.clickRate}</td>
                    <td className="py-3 px-4 font-bold text-emerald-400">{c.revenue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: LISTAS & SEGMENTACIÓN */}
      {activeTab === 'listas' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          <div className="bg-[#121215] border border-gray-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-white text-base">Compradores COD Verificados</h4>
              <span className="text-xs bg-purple-500/20 text-purple-300 px-2.5 py-1 rounded-full font-bold">
                1,850 Contactos
              </span>
            </div>
            <p className="text-xs text-gray-400">Clientes que han completado al menos 1 pedido Contra Entrega sin cancelaciones.</p>
          </div>

          <div className="bg-[#121215] border border-gray-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-white text-base">Carritos Abandonados (Últimos 30 días)</h4>
              <span className="text-xs bg-amber-500/20 text-amber-300 px-2.5 py-1 rounded-full font-bold">
                620 Contactos
              </span>
            </div>
            <p className="text-xs text-gray-400">Usuarios que iniciaron el formulario de orden y no concretaron la compra.</p>
          </div>

        </div>
      )}

    </div>
  );
}

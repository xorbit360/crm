import React, { useState, useRef, useEffect } from 'react';
import { 
  BarChart3, TrendingUp, Package, MapPin, Map, Tag, AlertTriangle, 
  RefreshCcw, XCircle, Users, Bot, Sparkles, Send, MessageSquare, 
  ChevronRight, Brain, Truck, DollarSign, Clock, CheckCircle, Percent, ArrowUpDown
} from 'lucide-react';

// Simple bold parser
function parseBold(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="text-white font-semibold">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

// Elegant custom markdown formatter
function renderMarkdown(text: string) {
  const lines = text.split('\n');
  return (
    <div className="space-y-2 text-sm text-gray-200 leading-relaxed">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        
        // Headers
        if (trimmed.startsWith('### ')) {
          return <h4 key={idx} className="text-base font-bold text-white mt-4 mb-2">{trimmed.substring(4)}</h4>;
        }
        if (trimmed.startsWith('## ')) {
          return <h3 key={idx} className="text-lg font-bold text-white mt-5 mb-2">{trimmed.substring(3)}</h3>;
        }
        if (trimmed.startsWith('# ')) {
          return <h2 key={idx} className="text-xl font-bold text-gold mt-6 mb-3">{trimmed.substring(2)}</h2>;
        }
        
        // Bullet points
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          const content = trimmed.substring(2);
          return (
            <ul key={idx} className="list-disc list-inside ml-4 space-y-1">
              <li>{parseBold(content)}</li>
            </ul>
          );
        }
        
        // Ordered list
        const numMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
        if (numMatch) {
          const content = numMatch[2];
          return (
            <ol key={idx} className="list-decimal list-inside ml-4 space-y-1">
              <li>{parseBold(content)}</li>
            </ol>
          );
        }

        // Tables
        if (trimmed.startsWith('|') && trimmed.endsWith('|') && !trimmed.includes('---')) {
          const cells = trimmed.split('|').map(c => c.trim()).filter((_, i, arr) => i > 0 && i < arr.length - 1);
          return (
            <div key={idx} className="overflow-x-auto my-2">
              <table className="min-w-full border-collapse border border-gray-800 text-xs">
                <tbody>
                  <tr className="bg-gray-900/50">
                    {cells.map((cell, cellIdx) => (
                      <td key={cellIdx} className="border border-gray-800 px-3 py-1.5 font-medium text-gray-300">
                        {parseBold(cell)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          );
        }
        
        // Empty lines
        if (trimmed === '') {
          return <div key={idx} className="h-2" />;
        }
        
        // Standard paragraphs
        return <p key={idx}>{parseBold(line)}</p>;
      })}
    </div>
  );
}

export default function ReportesView({ businessType = 'E-Commerce (Venta de Productos)' }: { businessType?: string }) {
  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'consultor'>('consultor');

  let chatImprovementText = "Ajustar saludos, reducir respuestas demoradas, optimizar persuasión, recuperación de carritos y automatización de pedidos.";
  let processImprovementText = "Sincronización automática de stock con Dropi, optimización de logística de envíos y control de guías contra entrega.";

  if (businessType === 'Restaurante / Comida Rápida') {
    chatImprovementText = "Ajustar saludos, reducir respuestas demoradas, sugerir los mejores platos, facilitar reservaciones de mesas y agilizar la toma de pedidos.";
    processImprovementText = "Sincronización automática de pedidos con cocina, optimización de despachos para domiciliarios, y control en tiempo real de fletes y formas de pago.";
  } else if (businessType === 'Hotel / Hospedaje') {
    chatImprovementText = "Optimizar respuestas sobre disponibilidad, automatizar envío de tarifas de habitaciones, y agilizar la confirmación de check-in.";
    processImprovementText = "Sincronización del estado de limpieza de habitaciones, optimización de asignación de conserjería, y control centralizado de reservas.";
  } else if (businessType === 'Servicios / Consultoría') {
    chatImprovementText = "Ajustar flujos de agendamiento automático de citas, enviar recordatorios preventivos y calificar leads interesados.";
    processImprovementText = "Sincronización de agendas de consultores, optimización del seguimiento post-servicio y control de pasarelas de pago.";
  } else if (businessType === 'Salud / Estética') {
    chatImprovementText = "Sugerir tratamientos según la consulta del paciente, automatizar agendamientos de turnos y enviar confirmaciones de citas.";
    processImprovementText = "Control de stock de insumos médicos/estéticos, optimización de tiempos de sala de espera y gestión de expedientes clínicos.";
  } else if (businessType === 'Networkers / Afiliados') {
    chatImprovementText = "Ajustar invitaciones automatizadas a presentaciones de negocio, automatizar el seguimiento de prospectos y compartir recursos PDF/videos.";
    processImprovementText = "Sincronización del pipeline de prospectos, optimización de mentorías/duplicación y seguimiento de rangos/afiliaciones.";
  }

  
  // Carrier Recommendation States
  const [recCity, setRecCity] = useState('Bogotá D.C.');
  const [recCategory, setRecCategory] = useState('Electrónica');

  const carrierData = [
    { city: 'Bogotá D.C.', category: 'Electrónica', carrier: 'Coordinadora', rate: 96, time: '1.2 días', cost: 8500, risk: 'Bajo', attempts: '1.1' },
    { city: 'Bogotá D.C.', category: 'Electrónica', carrier: 'Servientrega', rate: 91, time: '1.5 días', cost: 9200, risk: 'Bajo', attempts: '1.3' },
    { city: 'Bogotá D.C.', category: 'Electrónica', carrier: 'Interrapidisimo', rate: 89, time: '1.4 días', cost: 8000, risk: 'Medio', attempts: '1.5' },
    { city: 'Bogotá D.C.', category: 'Electrónica', carrier: 'Envía', rate: 90, time: '1.6 días', cost: 8600, risk: 'Bajo', attempts: '1.4' },

    { city: 'Bogotá D.C.', category: 'Hogar', carrier: 'Coordinadora', rate: 93, time: '1.4 días', cost: 8900, risk: 'Bajo', attempts: '1.2' },
    { city: 'Bogotá D.C.', category: 'Hogar', carrier: 'Servientrega', rate: 94, time: '1.5 días', cost: 9200, risk: 'Bajo', attempts: '1.2' },
    { city: 'Bogotá D.C.', category: 'Hogar', carrier: 'Interrapidisimo', rate: 88, time: '1.8 días', cost: 8200, risk: 'Medio', attempts: '1.6' },
    { city: 'Bogotá D.C.', category: 'Hogar', carrier: 'Envía', rate: 91, time: '1.6 días', cost: 8700, risk: 'Bajo', attempts: '1.3' },

    { city: 'Bogotá D.C.', category: 'Belleza', carrier: 'Coordinadora', rate: 90, time: '1.5 días', cost: 8800, risk: 'Bajo', attempts: '1.3' },
    { city: 'Bogotá D.C.', category: 'Belleza', carrier: 'Servientrega', rate: 88, time: '1.7 días', cost: 9400, risk: 'Medio', attempts: '1.4' },
    { city: 'Bogotá D.C.', category: 'Belleza', carrier: 'Interrapidisimo', rate: 92, time: '1.3 días', cost: 7800, risk: 'Bajo', attempts: '1.2' },
    { city: 'Bogotá D.C.', category: 'Belleza', carrier: 'Envía', rate: 89, time: '1.5 días', cost: 8400, risk: 'Bajo', attempts: '1.3' },

    { city: 'Medellín (Antioquia)', category: 'Electrónica', carrier: 'Coordinadora', rate: 97, time: '1.1 días', cost: 8200, risk: 'Bajo', attempts: '1.05' },
    { city: 'Medellín (Antioquia)', category: 'Electrónica', carrier: 'Servientrega', rate: 92, time: '1.4 días', cost: 9000, risk: 'Bajo', attempts: '1.2' },
    { city: 'Medellín (Antioquia)', category: 'Electrónica', carrier: 'Interrapidisimo', rate: 90, time: '1.3 días', cost: 8300, risk: 'Bajo', attempts: '1.4' },
    { city: 'Medellín (Antioquia)', category: 'Electrónica', carrier: 'Envía', rate: 93, time: '1.2 días', cost: 8500, risk: 'Bajo', attempts: '1.1' },

    { city: 'Medellín (Antioquia)', category: 'Hogar', carrier: 'Coordinadora', rate: 95, time: '1.3 días', cost: 8800, risk: 'Bajo', attempts: '1.1' },
    { city: 'Medellín (Antioquia)', category: 'Hogar', carrier: 'Servientrega', rate: 91, time: '1.6 días', cost: 9100, risk: 'Bajo', attempts: '1.3' },
    { city: 'Medellín (Antioquia)', category: 'Hogar', carrier: 'Interrapidisimo', rate: 89, time: '1.5 días', cost: 8400, risk: 'Medio', attempts: '1.5' },
    { city: 'Medellín (Antioquia)', category: 'Hogar', carrier: 'Envía', rate: 92, time: '1.4 días', cost: 8600, risk: 'Bajo', attempts: '1.2' },

    { city: 'Medellín (Antioquia)', category: 'Belleza', carrier: 'Coordinadora', rate: 93, time: '1.2 días', cost: 8400, risk: 'Bajo', attempts: '1.1' },
    { city: 'Medellín (Antioquia)', category: 'Belleza', carrier: 'Servientrega', rate: 87, time: '1.7 días', cost: 9300, risk: 'Medio', attempts: '1.5' },
    { city: 'Medellín (Antioquia)', category: 'Belleza', carrier: 'Interrapidisimo', rate: 91, time: '1.4 días', cost: 8000, risk: 'Bajo', attempts: '1.3' },
    { city: 'Medellín (Antioquia)', category: 'Belleza', carrier: 'Envía', rate: 94, time: '1.1 días', cost: 8100, risk: 'Bajo', attempts: '1.1' },

    { city: 'Cali (Valle)', category: 'Electrónica', carrier: 'Coordinadora', rate: 92, time: '1.9 días', cost: 9300, risk: 'Bajo', attempts: '1.4' },
    { city: 'Cali (Valle)', category: 'Electrónica', carrier: 'Servientrega', rate: 94, time: '1.8 días', cost: 9600, risk: 'Bajo', attempts: '1.3' },
    { city: 'Cali (Valle)', category: 'Electrónica', carrier: 'Interrapidisimo', rate: 91, time: '2.1 días', cost: 9200, risk: 'Medio', attempts: '1.5' },
    { city: 'Cali (Valle)', category: 'Electrónica', carrier: 'Envía', rate: 88, time: '2.2_días', cost: 9400, risk: 'Medio', attempts: '1.6' },

    { city: 'Cali (Valle)', category: 'Hogar', carrier: 'Coordinadora', rate: 90, time: '2.1 días', cost: 9500, risk: 'Medio', attempts: '1.5' },
    { city: 'Cali (Valle)', category: 'Hogar', carrier: 'Servientrega', rate: 91, time: '2.0 días', cost: 9800, risk: 'Bajo', attempts: '1.4' },
    { city: 'Cali (Valle)', category: 'Hogar', carrier: 'Interrapidisimo', rate: 93, time: '1.9 días', cost: 9000, risk: 'Bajo', attempts: '1.2' },
    { city: 'Cali (Valle)', category: 'Hogar', carrier: 'Envía', rate: 87, time: '2.3 días', cost: 9600, risk: 'Alto', attempts: '1.7' },

    { city: 'Cali (Valle)', category: 'Belleza', carrier: 'Coordinadora', rate: 95, time: '1.8_días', cost: 9100, risk: 'Bajo', attempts: '1.2' },
    { city: 'Cali (Valle)', category: 'Belleza', carrier: 'Servientrega', rate: 89, time: '2.2 días', cost: 9700, risk: 'Medio', attempts: '1.5' },
    { city: 'Cali (Valle)', category: 'Belleza', carrier: 'Interrapidisimo', rate: 92, time: '1.9 días', cost: 8900, risk: 'Bajo', attempts: '1.3' },
    { city: 'Cali (Valle)', category: 'Belleza', carrier: 'Envía', rate: 91, time: '2.0 días', cost: 9200, risk: 'Bajo', attempts: '1.4' },

    { city: 'Barranquilla (Atlántico)', category: 'Electrónica', carrier: 'Coordinadora', rate: 88, time: '2.7 días', cost: 11200, risk: 'Medio', attempts: '1.6' },
    { city: 'Barranquilla (Atlántico)', category: 'Electrónica', carrier: 'Servientrega', rate: 91, time: '2.5_días', cost: 11500, risk: 'Bajo', attempts: '1.4' },
    { city: 'Barranquilla (Atlántico)', category: 'Electrónica', carrier: 'Interrapidisimo', rate: 85, time: '2.9_días', cost: 10800, risk: 'Alto', attempts: '1.8' },
    { city: 'Barranquilla (Atlántico)', category: 'Electrónica', carrier: 'Envía', rate: 87, time: '2.8_días', cost: 11000, risk: 'Medio', attempts: '1.7' },

    { city: 'Barranquilla (Atlántico)', category: 'Hogar', carrier: 'Coordinadora', rate: 86, time: '2.9 días', cost: 11500, risk: 'Alto', attempts: '1.8' },
    { city: 'Barranquilla (Atlántico)', category: 'Hogar', carrier: 'Servientrega', rate: 90, time: '2.7 días', cost: 11900, risk: 'Medio', attempts: '1.5' },
    { city: 'Barranquilla (Atlántico)', category: 'Hogar', carrier: 'Interrapidisimo', rate: 88, time: '2.8_días', cost: 11200, risk: 'Medio', attempts: '1.6' },
    { city: 'Barranquilla (Atlántico)', category: 'Hogar', carrier: 'Envía', rate: 89, time: '2.6_días', cost: 11400, risk: 'Medio', attempts: '1.5' },

    { city: 'Barranquilla (Atlántico)', category: 'Belleza', carrier: 'Coordinadora', rate: 91, time: '2.4 días', cost: 11000, risk: 'Bajo', attempts: '1.3' },
    { city: 'Barranquilla (Atlántico)', category: 'Belleza', carrier: 'Servientrega', rate: 88, time: '2.7 días', cost: 11600, risk: 'Medio', attempts: '1.5' },
    { city: 'Barranquilla (Atlántico)', category: 'Belleza', carrier: 'Interrapidisimo', rate: 90, time: '2.5 días', cost: 10500, risk: 'Bajo', attempts: '1.4' },
    { city: 'Barranquilla (Atlántico)', category: 'Belleza', carrier: 'Envía', rate: 89, time: '2.6_días', cost: 10900, risk: 'Medio', attempts: '1.5' },
  ];
  
  // AI Chat States
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto Scroll
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text) return;

    if (!textToSend) {
      setInputMessage('');
    }

    const newMessages = [...messages, { role: 'user' as const, text }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const response = await fetch('/api/reports/ai-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: text,
          history: messages,
        }),
      });

      if (!response.ok) {
        throw new Error('Error al conectar con la IA');
      }

      const data = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', text: data.text || 'Sin respuesta.' }]);
    } catch (error: any) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        text: '⚠️ Disculpa, en este momento no puedo procesar tu consulta. Verifica la conexión con el servidor o que la API Key de Gemini esté configurada.' 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const suggestionChips = [
    { text: '¿Cómo mejorar la conversión de chats a pedidos?', icon: <Sparkles size={14} className="text-emerald-400" /> },
    { text: '¿Cuáles son los productos más vendidos y su stock?', icon: <Package size={14} className="text-amber-400" /> },
    { text: 'Diagnóstico de las conversaciones de WhatsApp', icon: <MessageSquare size={14} className="text-blue-400" /> },
    { text: 'Ideas para reducir los carritos abandonados', icon: <RefreshCcw size={14} className="text-purple-400" /> },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-800 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
            <BarChart3 className="text-gold" /> KPIs y Reportes (AI + MCP)
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Análisis consolidado de tu operativa (Ventas, ROI, Devoluciones). La IA consulta tus inventarios internos y extrae métricas conectadas por Tokens/MCP (CRMs, Shopify, Meta, Dropi).
          </p>
        </div>

        {/* Submenu Tabs */}
        <div className="flex bg-black/40 border border-gray-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveSubTab('dashboard')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all ${
              activeSubTab === 'dashboard'
                ? 'bg-gold/10 text-gold shadow-md'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <BarChart3 size={14} />
            Métricas de Negocio
          </button>
          <button
            onClick={() => setActiveSubTab('consultor')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all relative ${
              activeSubTab === 'consultor'
                ? 'bg-gold/10 text-gold shadow-md'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Bot size={14} />
            Consultor IA
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
          </button>
        </div>
      </div>

      {activeSubTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Ventas Totales', value: '$45,230', icon: <TrendingUp size={20} className="text-emerald-400" /> },
              { label: 'Gastos Operativos', value: '$12,400', icon: <AlertTriangle size={20} className="text-amber-400" /> },
              { label: 'ROI Real (Retorno)', value: '264%', icon: <Sparkles size={20} className="text-gold" /> },
              { label: 'Devoluciones Tot.', value: '24', icon: <RefreshCcw size={20} className="text-red-400" /> },
              { label: 'Pedidos Entregados', value: '1,438', icon: <Package size={20} className="text-blue-400" /> },
              { label: 'Efectividad COD (Recaudo)', value: '91.8%', icon: <Percent size={20} className="text-green-400" /> },
              { label: 'Flete Promedio (Costo)', value: '$9,250', icon: <DollarSign size={20} className="text-blue-300" /> },
              { label: 'Tiempo de Entrega', value: '1.8 días', icon: <Clock size={20} className="text-amber-400" /> },
              { label: 'Entregas por Región (Top)', value: 'Antioquia', icon: <MapPin size={20} className="text-purple-400" /> },
              { label: 'Transportadora Top', value: 'Coordinadora', icon: <Map size={20} className="text-emerald-500" /> },
              { label: 'Asesores Activos', value: '3', icon: <Users size={20} className="text-blue-300" /> }
            ].map((stat, i) => (
              <div key={i} className="bg-[#1a1a1a] p-4 rounded-xl border border-gray-800 flex items-center gap-4">
                <div className="p-3 bg-gray-900 rounded-lg shrink-0">
                   {stat.icon}
                </div>
                <div>
                   <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{stat.label}</p>
                   <p className="text-xl font-bold font-display">{stat.value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             <div className="bg-[#1a1a1a] p-6 rounded-xl border border-gray-800">
                <h3 className="font-bold text-gray-100 mb-4 flex items-center gap-2"><Map size={18} className="text-gold" /> Entregas y Devoluciones por Región</h3>
                <div className="space-y-4">
                   <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-300">Bogotá D.C. (Servientrega)</span>
                        <div className="text-right">
                          <span className="font-bold text-white">45% Entregas</span>
                          <span className="text-red-400 ml-2">5% Dev.</span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-1.5"><div className="bg-gold h-1.5 rounded-full" style={{width: '45%'}}></div></div>
                   </div>
                   <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-300">Antioquia (Coordinadora)</span>
                        <div className="text-right">
                          <span className="font-bold text-white">25% Entregas</span>
                          <span className="text-red-400 ml-2">8% Dev.</span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-1.5"><div className="bg-gold h-1.5 rounded-full" style={{width: '25%'}}></div></div>
                   </div>
                   <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-300">Valle del Cauca (Interrapidisimo)</span>
                        <div className="text-right">
                          <span className="font-bold text-white">15% Entregas</span>
                          <span className="text-red-400 ml-2">12% Dev.</span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-1.5"><div className="bg-gold h-1.5 rounded-full" style={{width: '15%'}}></div></div>
                   </div>
                </div>
             </div>
             <div className="bg-[#1a1a1a] p-6 rounded-xl border border-gray-800">
                <h3 className="font-bold text-gray-100 mb-4 flex items-center gap-2"><Package size={18} className="text-gold" /> Rendimiento por Producto</h3>
                <div className="space-y-3">
                   {[
                     { name: 'Producto A', category: 'Electrónica', sales: 85, returns: 2, reason: 'Talla/Modelo incorrecto' },
                     { name: 'Producto B', category: 'Hogar', sales: 70, returns: 5, reason: 'Defecto de fábrica' },
                     { name: 'Producto C', category: 'Belleza', sales: 55, returns: 1, reason: 'No le gustó al cliente' }
                   ].map((prod, i) => (
                     <div key={i} className="flex flex-col p-3 bg-gray-900 rounded-lg border border-gray-800 gap-2">
                       <div className="flex items-center justify-between">
                         <div className="flex items-center gap-3">
                           <div className="w-10 h-10 bg-gray-800 rounded flex items-center justify-center text-xs text-gray-500">Img</div>
                           <div>
                             <p className="font-semibold text-sm text-gray-200">{prod.name}</p>
                             <p className="text-[10px] text-gray-500">{prod.category}</p>
                           </div>
                         </div>
                         <div className="text-right">
                           <span className="font-bold text-emerald-400 block">{prod.sales} ventas</span>
                           <span className="text-[10px] text-red-400 block">{prod.returns} devueltos</span>
                         </div>
                       </div>
                       <div className="text-[10px] text-gray-400 bg-black p-1.5 rounded border border-gray-800">
                         <span className="text-amber-500 font-bold">Razón princ. de dev.:</span> {prod.reason}
                       </div>
                     </div>
                   ))}
                </div>
             </div>
             <div className="bg-[#1a1a1a] p-6 rounded-xl border border-gray-800 lg:col-span-2">
                <h3 className="font-bold text-gray-100 mb-4 flex items-center gap-2"><Tag size={18} className="text-gold" /> Etiquetas de Clientes</h3>
                <div className="flex flex-wrap gap-2">
                   <span className="px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full text-xs">VIP (120)</span>
                   <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs">Mayoristas (45)</span>
                   <span className="px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full text-xs">Pago Pendiente (12)</span>
                </div>
             </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
             <div className="bg-[#1a1a1a] p-6 rounded-xl border border-gray-800">
                <h3 className="font-bold text-gray-100 mb-4 flex items-center gap-2"><Tag size={18} className="text-gold" /> Origen de la Venta</h3>
                <div className="space-y-4">
                   <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-300">Campaña de Anuncios (Ads)</span>
                        <span className="font-bold text-white">55%</span>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-1.5"><div className="bg-purple-500 h-1.5 rounded-full" style={{width: '55%'}}></div></div>
                   </div>
                   <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-300">Orgánico</span>
                        <span className="font-bold text-white">30%</span>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-1.5"><div className="bg-emerald-500 h-1.5 rounded-full" style={{width: '30%'}}></div></div>
                   </div>
                   <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-300">Plantilla de Fidelización</span>
                        <span className="font-bold text-white">15%</span>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-1.5"><div className="bg-blue-500 h-1.5 rounded-full" style={{width: '15%'}}></div></div>
                   </div>
                </div>
             </div>

             <div className="bg-[#1a1a1a] p-6 rounded-xl border border-gray-800">
                <h3 className="font-bold text-gray-100 mb-4 flex items-center gap-2"><Users size={18} className="text-gold" /> Demografía de Clientes</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-4">
                     <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Por Edad</h4>
                     <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-300">18 - 24 años</span>
                          <span className="font-bold text-white">20%</span>
                        </div>
                        <div className="w-full bg-gray-800 rounded-full h-1.5"><div className="bg-gold h-1.5 rounded-full" style={{width: '20%'}}></div></div>
                     </div>
                     <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-300">25 - 34 años</span>
                          <span className="font-bold text-white">45%</span>
                        </div>
                        <div className="w-full bg-gray-800 rounded-full h-1.5"><div className="bg-gold h-1.5 rounded-full" style={{width: '45%'}}></div></div>
                     </div>
                     <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-300">35+ años</span>
                          <span className="font-bold text-white">35%</span>
                        </div>
                        <div className="w-full bg-gray-800 rounded-full h-1.5"><div className="bg-gold h-1.5 rounded-full" style={{width: '35%'}}></div></div>
                     </div>
                  </div>
                  <div className="space-y-4">
                     <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Por Género</h4>
                     <div className="flex items-center gap-4 h-full pb-4">
                        <div className="flex-1 flex flex-col items-center gap-2">
                           <div className="relative w-16 h-16 rounded-full border-4 border-pink-500/20 flex items-center justify-center">
                              <span className="text-pink-400 font-bold">60%</span>
                           </div>
                           <span className="text-xs text-gray-400">Mujeres</span>
                        </div>
                        <div className="flex-1 flex flex-col items-center gap-2">
                           <div className="relative w-16 h-16 rounded-full border-4 border-blue-500/20 flex items-center justify-center">
                              <span className="text-blue-400 font-bold">40%</span>
                           </div>
                           <span className="text-xs text-gray-400">Hombres</span>
                        </div>
                     </div>
                  </div>
                </div>
             </div>
          </div>

          {/* Seccion Optimizador Inteligente de Transportadoras */}
          <div className="bg-[#1a1a1a] p-6 rounded-xl border border-gray-800 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-4">
              <div>
                <h3 className="font-bold text-gray-100 text-lg flex items-center gap-2">
                  <Truck className="text-gold animate-bounce" size={20} /> Optimizador Inteligente de Transportadoras (Ciudad + Producto)
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  Analiza la tasa de entrega efectiva, costos de flete, tiempos de tránsito y riesgo de devolución para tomar la mejor decisión de despacho.
                </p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex flex-col">
                  <span className="text-[10px] text-gray-500 font-bold uppercase mb-1">Ciudad de Destino</span>
                  <select
                    value={recCity}
                    onChange={(e) => setRecCity(e.target.value)}
                    className="bg-[#111] text-xs text-white border border-gray-800 rounded-lg px-3 py-2 focus:outline-none focus:border-gold"
                  >
                    <option value="Bogotá D.C.">Bogotá D.C.</option>
                    <option value="Medellín (Antioquia)">Medellín (Antioquia)</option>
                    <option value="Cali (Valle)">Cali (Valle)</option>
                    <option value="Barranquilla (Atlántico)">Barranquilla (Atlántico)</option>
                  </select>
                </div>

                <div className="flex flex-col">
                  <span className="text-[10px] text-gray-500 font-bold uppercase mb-1">Categoría del Producto</span>
                  <select
                    value={recCategory}
                    onChange={(e) => setRecCategory(e.target.value)}
                    className="bg-[#111] text-xs text-white border border-gray-800 rounded-lg px-3 py-2 focus:outline-none focus:border-gold"
                  >
                    <option value="Electrónica">Electrónica (Smartwatches, Audífonos)</option>
                    <option value="Hogar">Hogar (Organizadores, Cocina)</option>
                    <option value="Belleza">Belleza y Cuidado Personal</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Interactive calculation area */}
            {(() => {
              const matches = carrierData
                .filter(item => item.city === recCity && item.category === recCategory)
                .sort((a, b) => b.rate - a.rate);

              if (matches.length === 0) return null;

              const best = matches[0];

              return (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Destacado / Recomendacion Recomendada */}
                  <div className="lg:col-span-1 bg-gradient-to-b from-[#1c241d] to-[#121613] border border-emerald-900/30 rounded-2xl p-6 flex flex-col justify-between text-left relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl -mr-6 -mt-6"></div>
                    
                    <div className="space-y-4">
                      <span className="bg-emerald-500/10 text-emerald-400 text-[10px] uppercase font-bold px-2.5 py-1 rounded-full border border-emerald-500/20 tracking-wider">
                        ★ Transportadora Sugerida
                      </span>

                      <div>
                        <h4 className="text-2xl font-black text-white tracking-tight">{best.carrier}</h4>
                        <p className="text-xs text-gray-400 mt-1">
                          Es la transportadora líder para enviar <strong className="text-white">{recCategory.toLowerCase()}</strong> a <strong className="text-white">{recCity}</strong>.
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-2">
                        <div className="bg-black/40 p-3 rounded-xl border border-gray-800">
                          <span className="text-[10px] text-gray-500 font-bold block uppercase">Efectividad</span>
                          <span className="text-lg font-bold text-emerald-400">{best.rate}%</span>
                        </div>
                        <div className="bg-black/40 p-3 rounded-xl border border-gray-800">
                          <span className="text-[10px] text-gray-500 font-bold block uppercase">Tiempo TAT</span>
                          <span className="text-lg font-bold text-white">{best.time}</span>
                        </div>
                        <div className="bg-black/40 p-3 rounded-xl border border-gray-800">
                          <span className="text-[10px] text-gray-500 font-bold block uppercase">Costo Flete</span>
                          <span className="text-lg font-bold text-blue-300">${best.cost.toLocaleString()}</span>
                        </div>
                        <div className="bg-black/40 p-3 rounded-xl border border-gray-800">
                          <span className="text-[10px] text-gray-500 font-bold block uppercase">Intentos Prom.</span>
                          <span className="text-lg font-bold text-amber-400">{best.attempts}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-5 border-t border-emerald-900/10 mt-6 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-gray-500 font-bold block uppercase">Riesgo de Devolución</span>
                        <span className={`text-xs font-bold flex items-center gap-1.5 ${
                          best.risk === 'Bajo' ? 'text-emerald-400' : best.risk === 'Medio' ? 'text-amber-400' : 'text-red-400'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            best.risk === 'Bajo' ? 'bg-emerald-400' : best.risk === 'Medio' ? 'bg-amber-400' : 'bg-red-400'
                          }`}></span>
                          {best.risk}
                        </span>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                        <CheckCircle size={18} />
                      </div>
                    </div>

                  </div>

                  {/* Comparativa con otras transportadoras */}
                  <div className="lg:col-span-2 space-y-4">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                      <ArrowUpDown size={14} className="text-gold" /> Comparativa de Rendimiento (Ordenado por Efectividad)
                    </h4>

                    <div className="bg-black/40 rounded-xl border border-gray-800 overflow-hidden divide-y divide-gray-850">
                      {matches.map((item, idx) => {
                        const isWinner = idx === 0;
                        return (
                          <div key={idx} className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                            isWinner ? 'bg-emerald-500/5 hover:bg-emerald-500/10' : 'hover:bg-gray-900/40'
                          }`}>
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                                isWinner 
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                                  : 'bg-gray-800 text-gray-400'
                              }`}>
                                {idx + 1}
                              </div>
                              <div>
                                <span className="font-bold text-white text-sm flex items-center gap-2">
                                  {item.carrier}
                                  {isWinner && (
                                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.2 rounded font-bold border border-emerald-500/20">
                                      Recomendada
                                    </span>
                                  )}
                                </span>
                                <div className="flex items-center gap-4 text-[10px] text-gray-400 mt-1 font-mono">
                                  <span>Tránsito: <strong className="text-gray-200">{item.time}</strong></span>
                                  <span>Flete: <strong className="text-gray-200">${item.cost.toLocaleString()}</strong></span>
                                  <span>Intentos: <strong className="text-gray-200">{item.attempts}</strong></span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-4 shrink-0">
                              <div className="text-right">
                                <span className="text-xs text-gray-400 block font-semibold">Tasa de Entrega</span>
                                <span className={`text-base font-black ${isWinner ? 'text-emerald-400' : 'text-gray-200'}`}>{item.rate}%</span>
                              </div>
                              
                              <div className="w-16 bg-gray-800 rounded-full h-1.5">
                                <div 
                                  className={`h-1.5 rounded-full ${isWinner ? 'bg-emerald-400' : 'bg-gray-500'}`} 
                                  style={{ width: `${item.rate}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>
              );
            })()}
          </div>

          {/* Sección Informativa: KPIs recomendados que deberias vigilar */}
          <div className="bg-[#1a1a1a] p-6 rounded-xl border border-gray-800">
            <h3 className="font-bold text-gray-100 text-base flex items-center gap-2 mb-4">
              <Brain className="text-gold" size={18} /> ¿Qué otros KPIs te recomendamos monitorear? (Logística y Contra Entrega)
            </h3>
            <p className="text-xs text-gray-400 mb-5">
              En modelos de venta por chat con recaudo contra entrega (COD), la logística no es solo entregar; define tu rentabilidad real. Aquí están los indicadores críticos para tu negocio:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-black/30 border border-gray-850 p-4 rounded-xl space-y-2">
                <span className="p-1.5 bg-green-500/10 text-green-400 border border-green-500/20 rounded-lg inline-block text-xs font-bold">
                  % de Pedidos Novedosos
                </span>
                <h4 className="text-sm font-bold text-white">Tasa de Novedades</h4>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Porcentaje de pedidos con dirección errónea, cliente que no responde o reprogramados. Un asesor dedicado a resolver novedades en tiempo real puede salvar hasta un 40% de las ventas en riesgo de devolución.
                </p>
              </div>

              <div className="bg-black/30 border border-gray-850 p-4 rounded-xl space-y-2">
                <span className="p-1.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg inline-block text-xs font-bold">
                  Costo Logística Inversa
                </span>
                <h4 className="text-sm font-bold text-white">Flete de Devoluciones</h4>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Las transportadoras te cobran el flete de ida y un porcentaje (o tarifa plena) de regreso si el cliente rechaza el producto. Monitorea cuánto dinero estás perdiendo mensualmente por fletes de pedidos no entregados.
                </p>
              </div>

              <div className="bg-black/30 border border-gray-850 p-4 rounded-xl space-y-2">
                <span className="p-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg inline-block text-xs font-bold">
                  Plazo de Desembolso
                </span>
                <h4 className="text-sm font-bold text-white">Días de Flujo de Caja</h4>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  El tiempo que pasa desde que la transportadora recauda el efectivo del cliente hasta que te lo transfiere a tu cuenta bancaria. Un flujo lento de caja limita tu presupuesto diario para comprar inventario y pautar en Ads.
                </p>
              </div>

              <div className="bg-black/30 border border-gray-850 p-4 rounded-xl space-y-2">
                <span className="p-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg inline-block text-xs font-bold">
                  Tiempo de Reintento
                </span>
                <h4 className="text-sm font-bold text-white">Efectividad del Reintento</h4>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Cuántas entregas se concretan en el segundo o tercer intento del mensajero. Es vital que tu equipo de servicio al cliente contacte al comprador apenas falle el primer intento para agendar una hora segura.
                </p>
              </div>
            </div>
          </div>

        </div>
      )}

      {activeSubTab === 'consultor' && (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
          
          {/* Main Chat Interface */}
          <div className="xl:col-span-3 bg-[#111111] border border-gray-800 rounded-2xl flex flex-col h-[600px] overflow-hidden shadow-2xl relative">
            
            {/* Chat Header */}
            <div className="bg-[#161616] border-b border-gray-800 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center text-gold">
                  <Brain size={20} className="animate-pulse" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Mona IA - Consultor de Negocio</h3>
                  <p className="text-[10px] text-green-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block"></span>
                    Sincronizado con base de datos en tiempo real
                  </p>
                </div>
              </div>
            </div>

            {/* Message Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin scrollbar-thumb-gray-800">
              
              {/* Static Welcome Message */}
              <div className="flex gap-3 max-w-[85%]">
                <div className="w-8 h-8 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center text-gold shrink-0 self-start">
                  <Bot size={16} />
                </div>
                <div className="bg-gray-900/80 border border-gray-800/60 p-4 rounded-2xl text-sm leading-relaxed">
                  <p className="text-gray-200">
                    ¡Hola! Soy tu <strong>Consultor de Reportes y Procesos de La Mona</strong>.
                    Estoy conectado en tiempo real al sistema de pedidos, inventario, clientes y conversaciones recientes de WhatsApp.
                  </p>
                  <p className="text-gray-200 mt-2">
                    Puedo darte un diagnóstico detallado de tus ventas, alertarte sobre platos/productos sin stock o sugerirte mejoras específicas en la forma de atender y cerrar ventas en tus chats.
                  </p>
                  <p className="text-gray-300 mt-3 font-semibold text-xs text-gold flex items-center gap-1">
                    <Sparkles size={12} />
                    Prueba preguntándome:
                  </p>
                  <ul className="mt-1 space-y-1 text-xs text-gray-400 list-disc list-inside">
                    <li>"¿Cómo mejorar la conversión de chats a pedidos?"</li>
                    <li>"Dame un análisis de los pedidos de hoy"</li>
                    <li>"Sugerencias de procesos para los domiciliarios"</li>
                  </ul>
                </div>
              </div>

              {/* Chat messages */}
              {messages.map((msg, idx) => (
                <div 
                  key={idx} 
                  className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 self-start ${
                    msg.role === 'user' 
                      ? 'bg-gold text-black font-semibold text-xs' 
                      : 'bg-gold/10 border border-gold/20 text-gold'
                  }`}>
                    {msg.role === 'user' ? 'U' : <Bot size={16} />}
                  </div>
                  <div className={`p-4 rounded-2xl text-sm ${
                    msg.role === 'user'
                      ? 'bg-gold/10 border border-gold/30 text-gray-100 rounded-tr-none'
                      : 'bg-gray-900 border border-gray-800 text-gray-100 rounded-tl-none'
                  }`}>
                    {renderMarkdown(msg.text)}
                  </div>
                </div>
              ))}

              {/* Loading Indicator */}
              {loading && (
                <div className="flex gap-3 max-w-[85%]">
                  <div className="w-8 h-8 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center text-gold shrink-0">
                    <Bot size={16} className="animate-spin" />
                  </div>
                  <div className="bg-gray-900 border border-gray-800 p-4 rounded-2xl rounded-tl-none text-xs text-gray-400 flex items-center gap-2">
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-gold"></span>
                    </span>
                    Procesando reporte y analizando métricas de conversión...
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Suggested Chip List */}
            <div className="px-6 py-2 bg-[#121212] border-t border-gray-900 overflow-x-auto flex gap-2 whitespace-nowrap scrollbar-none">
              {suggestionChips.map((chip, i) => (
                <button
                  key={i}
                  disabled={loading}
                  onClick={() => handleSendMessage(chip.text)}
                  className="px-3 py-1.5 bg-[#181818] hover:bg-gray-900 border border-gray-800 hover:border-gray-700 text-[11px] text-gray-300 rounded-full flex items-center gap-2.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  {chip.icon}
                  {chip.text}
                  <ChevronRight size={10} className="text-gray-500" />
                </button>
              ))}
            </div>

            {/* Chat Input */}
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="bg-[#161616] border-t border-gray-800 p-4 flex gap-2"
            >
              <input
                type="text"
                disabled={loading}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Pregunta algo sobre tus ventas, stock, asesores o cómo mejorar procesos..."
                className="flex-1 bg-black border border-gray-800 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gold transition-colors disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={loading || !inputMessage.trim()}
                className="bg-gold hover:bg-gold-light text-black px-4 py-3 rounded-xl transition-all font-semibold text-sm flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <Send size={16} />
                <span className="hidden sm:inline">Preguntar</span>
              </button>
            </form>
          </div>

          {/* Guidelines Sidebar */}
          <div className="xl:col-span-1 space-y-4">
            <div className="bg-[#1a1a1a] p-5 rounded-2xl border border-gray-800">
              <h3 className="font-bold text-white text-sm flex items-center gap-2 mb-3">
                <Brain size={16} className="text-gold" />
                Objetivos de Optimización
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed mb-4">
                El consultor IA analiza tus datos de WhatsApp para sugerirte mejoras en dos frentes principales:
              </p>
              
              <div className="space-y-4">
                <div className="p-3 bg-gray-950/60 rounded-xl border border-gray-900">
                  <h4 className="text-xs font-bold text-white mb-1 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Mejora en Chats
                  </h4>
                  <p className="text-[11px] text-gray-500 leading-relaxed">
                    {chatImprovementText}
                  </p>
                </div>
                
                <div className="p-3 bg-gray-950/60 rounded-xl border border-gray-900">
                  <h4 className="text-xs font-bold text-white mb-1 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                    Mejora en Procesos
                  </h4>
                  <p className="text-[11px] text-gray-500 leading-relaxed">
                    {processImprovementText}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-[#1a1a1a]/40 p-4 rounded-xl border border-gray-800 text-center">
              <p className="text-[10px] text-gray-500">
                Tus datos de ventas se actualizan automáticamente cada vez que se concreta un pedido o se modifica el inventario.
              </p>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}

import React, { useState } from 'react';
import { 
  Users, BarChart3, Bot, Lightbulb, Image as ImageIcon, Megaphone, 
  Smartphone, Network, Link, GraduationCap, Package, Share2, 
  ShieldCheck, HelpCircle, Briefcase, TrendingUp, ShoppingCart, 
  Settings, CheckCircle, ClipboardCheck, Scale, Compass, Cpu, 
  Truck, ArrowRight, Sparkles, Radio 
} from 'lucide-react';

interface OrganigramaViewProps {
  onNavigateModule: (moduleId: string) => void;
  onNavigateWhatsappTab?: (tabId: string) => void;
}

interface SelectedNodeInfo {
  title: string;
  department: string;
  description: string;
  aiPower: string;
  suggestedPrompt: string;
  linkedModuleId?: string;
  linkedWhatsappTabId?: string;
  icon: React.ReactNode;
}

export default function OrganigramaView({ onNavigateModule, onNavigateWhatsappTab }: OrganigramaViewProps) {
  const [selectedNode, setSelectedNode] = useState<SelectedNodeInfo | null>({
    title: "Gerencia General",
    department: "Corporativo",
    description: "Lidera la dirección estratégica general, coordinando todas las áreas operativas, de marketing y tecnológicas para escalar el negocio.",
    aiPower: "Análisis unificado de reportes, métricas consolidadas en tiempo real y asistencia de Mona IA para toma de decisiones directivas.",
    suggestedPrompt: "Dame un diagnóstico del estado general del negocio y prioridades para esta semana",
    linkedModuleId: "dashboard",
    icon: <Briefcase className="text-gold" size={24} />
  });

  const nodeDetails: Record<string, SelectedNodeInfo> = {
    // ADMINISTRACION
    contabilidad: {
      title: "Contabilidad",
      department: "Administración",
      description: "Encargado de la facturación, ingresos, costos de productos y el balance general del negocio de dropshipping.",
      aiPower: "Generación automática de reportes financieros, cálculo automático de márgenes de ganancia e integración de reportes de pedidos.",
      suggestedPrompt: "¿Cuál es el margen de ganancia promedio de los pedidos completados hoy?",
      linkedModuleId: "whatsapp",
      linkedWhatsappTabId: "reportes",
      icon: <BarChart3 className="text-blue-400" size={24} />
    },
    legales: {
      title: "Legales y Cumplimiento",
      department: "Administración",
      description: "Monitoreo de políticas de retracto, términos y condiciones de comercio electrónico y cumplimiento normativo de pasarelas de pago.",
      aiPower: "Consultoría de contratos comerciales de dropshipping y redacción automática de políticas de devolución/garantías para landing pages.",
      suggestedPrompt: "Redacta una política de retracto y garantía transparente para nuestra tienda de comercio electrónico",
      linkedModuleId: "branding",
      icon: <Scale className="text-blue-400" size={24} />
    },
    rrhh: {
      title: "Recursos Humanos (RRHH)",
      department: "Administración",
      description: "Gestión de roles de personal, permisos de asesores de ventas, meseros, repartidores o administradores de tienda.",
      aiPower: "Asignación inteligente de cargas de trabajo de asesores y control centralizado de usuarios en la plataforma.",
      suggestedPrompt: "¿Cómo puedo configurar los permisos para que mis repartidores solo vean sus guías de despacho?",
      linkedModuleId: "usuarios",
      icon: <Users className="text-blue-400" size={24} />
    },

    // MARKETING
    audiovisual: {
      title: "Audiovisual y Creativos",
      department: "Marketing",
      description: "Generación de piezas gráficas, copys de venta persuasivos, guiones de video y multimedia atractiva para pautas publicitarias.",
      aiPower: "Generador de copys publicitarios de alto impacto estructurados en fórmulas de persuasión (AIDA, PAS) y catálogo multimedia.",
      suggestedPrompt: "Genera un copy persuasivo con el método AIDA para vender un producto tecnológico por TikTok Ads",
      linkedModuleId: "contenido",
      icon: <ImageIcon className="text-rose-400" size={24} />
    },
    estrategia: {
      title: "Estrategia",
      department: "Marketing",
      description: "Diseño conceptual de la identidad de la marca, definición del avatar de cliente ideal y análisis de brechas competitivas.",
      aiPower: "Generación del libro de marca, tono de comunicación, investigación automatizada de nichos de mercado y análisis de competencia.",
      suggestedPrompt: "¿Cuáles son las principales tendencias de consumo para el nicho de cocina en este momento?",
      linkedModuleId: "branding",
      icon: <Compass className="text-rose-400" size={24} />
    },
    ventas: {
      title: "Ventas masivas",
      department: "Marketing",
      description: "Lanzamiento de campañas de conversión, pauta en redes (Facebook/Instagram/TikTok) y retargeting masivo.",
      aiPower: "Creación y optimización de campañas de Ads conectadas, segmentación predictiva de audiencias y secuencias de retargeting.",
      suggestedPrompt: "Estructura una audiencia segmentada ideal para pautar productos de belleza premium",
      linkedModuleId: "ads",
      icon: <Megaphone className="text-rose-400" size={24} />
    },
    live_selling: {
      title: "Live Selling & Transmisión",
      department: "Marketing",
      description: "Transmisiones en vivo multi-plataforma (TikTok, Facebook, Instagram), producto fijado con oferta relámpago y captura de pedidos por comentarios estilo Xorbit Live.",
      aiPower: "Escaneo con IA de palabras clave de compra en comentarios en vivo, generación de órdenes y despacho automático de checkout por WhatsApp.",
      suggestedPrompt: "Prepara una sesión de Live Selling con ofertas relámpago de 5 minutos para liquidar stock",
      linkedModuleId: "live_selling",
      icon: <Radio className="text-red-400" size={24} />
    },

    // LOGISTICA
    atencion: {
      title: "Atención al Cliente",
      department: "Logística",
      description: "Soporte post-venta, resolución de dudas frecuentes, confirmaciones de dirección y retención de clientes.",
      aiPower: "Respuestas automáticas inteligentes con Mona IA entrenada con tus FAQs, y chat multiagente unificado de WhatsApp.",
      suggestedPrompt: "¿Cómo puedo entrenar al chatbot para responder automáticamente dudas sobre envíos demorados?",
      linkedModuleId: "whatsapp",
      linkedWhatsappTabId: "conversaciones",
      icon: <Smartphone className="text-amber-400" size={24} />
    },
    inventario: {
      title: "Inventario / Bodega",
      department: "Logística",
      description: "Sincronización de stock, catálogo de productos activos, control de variantes y disponibilidad en tiempo real.",
      aiPower: "Monitoreo inteligente de stock crítico, avisos de desabastecimiento automático y gestión del catálogo digital.",
      suggestedPrompt: "Muéstrame la lista de productos que tienen menos de 10 unidades en stock en este momento",
      linkedModuleId: "whatsapp",
      linkedWhatsappTabId: "catalogo",
      icon: <Package className="text-amber-400" size={24} />
    },
    despachos: {
      title: "Despachos y Guías",
      department: "Logística",
      description: "Empaque, despacho físico de productos, integración con transportadoras y generación de guías de envío.",
      aiPower: "Gestión unificada de estados de pedidos, novedades de reparto automáticas y alertas en WhatsApp de guías emitidas.",
      suggestedPrompt: "¿Cuántos pedidos tenemos pendientes de despacho hoy y cuáles presentan novedades?",
      linkedModuleId: "whatsapp",
      linkedWhatsappTabId: "pedidos",
      icon: <Truck className="text-amber-400" size={24} />
    },

    // PRODUCCION / IMPORTACION
    compras: {
      title: "Compras y Proveedores",
      department: "Producción / Importación",
      description: "Abastecimiento de insumos o productos al por mayor, negociación con proveedores directos y fabricantes locales.",
      aiPower: "Directorio interactivo de proveedores certificados, estimación de costos de importación y plantillas de cotización.",
      suggestedPrompt: "Muéstrame el listado de proveedores recomendados en el sector de hogar y sus datos de contacto",
      linkedModuleId: "proveedores",
      icon: <ClipboardCheck className="text-purple-400" size={24} />
    },
    importacion: {
      title: "Importación y Aduanas",
      department: "Producción / Importación",
      description: "Trámites aduaneros, cálculo de aranceles de importación aérea o marítima de mercancías desde China/EEUU.",
      aiPower: "Asesoría automatizada en partidas arancelarias, cálculo estimado de nacionalización y seguimiento de contenedores.",
      suggestedPrompt: "¿Qué documentos legales necesito típicamente para importar tecnología de consumo a Colombia?",
      linkedModuleId: "proveedores",
      icon: <Share2 className="text-purple-400" size={24} />
    },
    calidad: {
      title: "Control de Calidad",
      department: "Producción / Importación",
      description: "Verificación de defectos en lotes recibidos de proveedores, cumplimiento de estándares y satisfacción final.",
      aiPower: "Cuestionarios interactivos de verificación de calidad y listado de reporte de inconformidades de clientes.",
      suggestedPrompt: "Genera una plantilla de control de calidad para inspeccionar un lote de productos electrónicos",
      linkedModuleId: "branding",
      icon: <ShieldCheck className="text-purple-400" size={24} />
    },

    // TECNOLOGIA
    innovacion: {
      title: "Innovación y Academia",
      department: "Tecnología",
      description: "Capacitación continua en nuevas tendencias, aprendizaje de metodologías avanzadas de ventas y optimización de herramientas.",
      aiPower: "Acceso ilimitado a guías formativas interactivas paso a paso para entrenar a tu personal en el uso estratégico de IA.",
      suggestedPrompt: "Dame un plan de capacitación rápido de 15 minutos sobre cómo usar la IA para vender más",
      linkedModuleId: "entrenamiento",
      icon: <GraduationCap className="text-emerald-400" size={24} />
    },
    operaciones: {
      title: "Operaciones y Automatización",
      department: "Tecnología",
      description: "Integración técnica de sistemas, pasarelas de pago, Webhooks de WhatsApp, n8n y sincronización de bases de datos.",
      aiPower: "Configuración automatizada de disparadores, Webhooks en un clic y conexión de integraciones robustas de sistemas.",
      suggestedPrompt: "¿Cómo configuro un webhook para que cada pedido nuevo de WhatsApp se envíe automáticamente a mi planilla?",
      linkedModuleId: "automatizaciones",
      icon: <Network className="text-emerald-400" size={24} />
    }
  };

  const handleNodeClick = (key: string) => {
    const details = nodeDetails[key];
    if (details) {
      setSelectedNode(details);
    }
  };

  const executeAction = () => {
    if (!selectedNode) return;
    if (selectedNode.linkedModuleId) {
      onNavigateModule(selectedNode.linkedModuleId);
      if (selectedNode.linkedWhatsappTabId && onNavigateWhatsappTab) {
        onNavigateWhatsappTab(selectedNode.linkedWhatsappTabId);
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-[#111] border border-gray-800 p-6 rounded-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-gold/5 rounded-full blur-2xl pointer-events-none"></div>
        <div className="max-w-3xl">
          <span className="px-3 py-1 bg-gold/10 text-gold border border-gold/20 rounded-full text-xs font-semibold uppercase tracking-wider inline-flex items-center gap-1.5 mb-3">
            <Sparkles size={12} />
            Mapeador de Estructura de Empresa
          </span>
          <h3 className="text-xl font-bold text-white mb-2">Alineación Estratégica Organizacional</h3>
          <p className="text-gray-400 text-sm leading-relaxed">
            Hemos mapeado la estructura departamental óptima basada en tu organigrama de <strong>Gerencia General</strong>. 
            Haz clic en cualquiera de las divisiones del diagrama interactivo abajo para ver qué herramientas de Inteligencia Artificial la respaldan en esta plataforma.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
        
        {/* Diagram Area */}
        <div className="xl:col-span-3 bg-[#0d0d0d] border border-gray-800 rounded-2xl p-6 overflow-x-auto">
          <div className="min-w-[850px] space-y-6 text-center py-4">
            
            {/* CEO & General Manager */}
            <div className="flex flex-col items-center">
              <div 
                onClick={() => setSelectedNode({
                  title: "Gerencia General",
                  department: "Corporativo",
                  description: "Lidera la dirección estratégica general, coordinando todas las áreas operativas, de marketing y tecnológicas para escalar el negocio.",
                  aiPower: "Análisis unificado de reportes, métricas consolidadas en tiempo real y asistencia de Mona IA para toma de decisiones directivas.",
                  suggestedPrompt: "Dame un diagnóstico del estado general del negocio y prioridades para esta semana",
                  linkedModuleId: "dashboard",
                  icon: <Briefcase className="text-gold" size={24} />
                })}
                className={`px-8 py-3 rounded-xl border cursor-pointer transition-all ${
                  selectedNode?.title === "Gerencia General" 
                    ? 'bg-gold text-black border-gold font-bold shadow-[0_0_15px_rgba(212,175,55,0.4)] scale-105' 
                    : 'bg-red-950/20 text-red-400 border-red-500/30 hover:border-red-400/80 font-medium'
                }`}
              >
                <p className="text-[10px] uppercase tracking-wider opacity-85">C-Level</p>
                <p className="text-sm">CEO - GERENCIA GENERAL</p>
              </div>
              
              {/* Connecting line down */}
              <div className="w-0.5 h-6 bg-gray-800"></div>
            </div>

            {/* Department Horizontal Connector */}
            <div className="relative">
              <div className="absolute top-0 left-[10%] right-[10%] h-0.5 bg-gray-800"></div>
            </div>

            {/* Departments Row */}
            <div className="grid grid-cols-5 gap-4 relative pt-6">
              
              {/* Connecting vertical lines */}
              <div className="absolute -top-6 left-[10%] w-0.5 h-6 bg-gray-800"></div>
              <div className="absolute -top-6 left-[30%] w-0.5 h-6 bg-gray-800"></div>
              <div className="absolute -top-6 left-[50%] w-0.5 h-6 bg-gray-800"></div>
              <div className="absolute -top-6 left-[70%] w-0.5 h-6 bg-gray-800"></div>
              <div className="absolute -top-6 left-[90%] w-0.5 h-6 bg-gray-800"></div>

              {/* Department 1: ADMINISTRACION */}
              <div className="space-y-4">
                <div className="bg-gray-900 border border-blue-500/20 px-3 py-2 rounded-xl text-blue-400 font-bold text-xs uppercase tracking-wider">
                  Administración
                </div>
                <div className="space-y-2 flex flex-col items-center">
                  {[
                    { key: 'contabilidad', label: 'Contabilidad' },
                    { key: 'legales', label: 'Legales' },
                    { key: 'rrhh', label: 'RRHH' }
                  ].map(item => (
                    <button
                      key={item.key}
                      onClick={() => handleNodeClick(item.key)}
                      className={`w-full py-2.5 px-3 rounded-lg text-xs font-medium border transition-all text-center ${
                        selectedNode?.title.toLowerCase().includes(item.key.substring(0,4))
                          ? 'bg-blue-500/15 text-blue-300 border-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.3)] scale-102 font-semibold'
                          : 'bg-black/40 text-gray-400 border-gray-800 hover:border-gray-700 hover:text-gray-200'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Department 2: MARKETING */}
              <div className="space-y-4">
                <div className="bg-gray-900 border border-rose-500/20 px-3 py-2 rounded-xl text-rose-400 font-bold text-xs uppercase tracking-wider">
                  Marketing
                </div>
                <div className="space-y-2 flex flex-col items-center">
                  {[
                    { key: 'audiovisual', label: 'Audiovisual' },
                    { key: 'estrategia', label: 'Estrategia' },
                    { key: 'ventas', label: 'Ventas' },
                    { key: 'live_selling', label: 'Live Selling' }
                  ].map(item => (
                    <button
                      key={item.key}
                      onClick={() => handleNodeClick(item.key)}
                      className={`w-full py-2.5 px-3 rounded-lg text-xs font-medium border transition-all text-center ${
                        selectedNode?.title.toLowerCase().includes(item.key.substring(0,4))
                          ? 'bg-rose-500/15 text-rose-300 border-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.3)] scale-102 font-semibold'
                          : 'bg-black/40 text-gray-400 border-gray-800 hover:border-gray-700 hover:text-gray-200'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Department 3: LOGISTICA */}
              <div className="space-y-4">
                <div className="bg-gray-900 border border-amber-500/20 px-3 py-2 rounded-xl text-amber-400 font-bold text-xs uppercase tracking-wider">
                  Logística
                </div>
                <div className="space-y-2 flex flex-col items-center">
                  {[
                    { key: 'atencion', label: 'Atención al Cliente' },
                    { key: 'inventario', label: 'Inventario / Bodega' },
                    { key: 'despachos', label: 'Despachos' }
                  ].map(item => (
                    <button
                      key={item.key}
                      onClick={() => handleNodeClick(item.key)}
                      className={`w-full py-2.5 px-3 rounded-lg text-xs font-medium border transition-all text-center ${
                        selectedNode?.title.toLowerCase().includes(item.key.substring(0,4)) || (item.key === 'inventario' && selectedNode?.title.includes('Inventario'))
                          ? 'bg-amber-500/15 text-amber-300 border-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.3)] scale-102 font-semibold'
                          : 'bg-black/40 text-gray-400 border-gray-800 hover:border-gray-700 hover:text-gray-200'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Department 4: PRODUCCION / IMPORTACION */}
              <div className="space-y-4">
                <div className="bg-gray-900 border border-purple-500/20 px-3 py-2 rounded-xl text-purple-400 font-bold text-xs uppercase tracking-wider line-clamp-1">
                  Producción
                </div>
                <div className="space-y-2 flex flex-col items-center">
                  {[
                    { key: 'compras', label: 'Compras y Proveedores' },
                    { key: 'importacion', label: 'Importación y Aduanas' },
                    { key: 'calidad', label: 'Control de Calidad' }
                  ].map(item => (
                    <button
                      key={item.key}
                      onClick={() => handleNodeClick(item.key)}
                      className={`w-full py-2.5 px-3 rounded-lg text-xs font-medium border transition-all text-center ${
                        selectedNode?.title.toLowerCase().includes(item.key.substring(0,4)) || (item.key === 'compras' && selectedNode?.title.includes('Compras')) || (item.key === 'importacion' && selectedNode?.title.includes('Importación'))
                          ? 'bg-purple-500/15 text-purple-300 border-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.3)] scale-102 font-semibold'
                          : 'bg-black/40 text-gray-400 border-gray-800 hover:border-gray-700 hover:text-gray-200 text-ellipsis overflow-hidden whitespace-nowrap'
                      }`}
                      title={item.label}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Department 5: TECNOLOGIA */}
              <div className="space-y-4">
                <div className="bg-gray-900 border border-emerald-500/20 px-3 py-2 rounded-xl text-emerald-400 font-bold text-xs uppercase tracking-wider">
                  Tecnología
                </div>
                <div className="space-y-2 flex flex-col items-center">
                  {[
                    { key: 'innovacion', label: 'Innovación' },
                    { key: 'operaciones', label: 'Operaciones' }
                  ].map(item => (
                    <button
                      key={item.key}
                      onClick={() => handleNodeClick(item.key)}
                      className={`w-full py-2.5 px-3 rounded-lg text-xs font-medium border transition-all text-center ${
                        selectedNode?.title.toLowerCase().includes(item.key.substring(0,4)) || (item.key === 'innovacion' && selectedNode?.title.includes('Innovación'))
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.3)] scale-102 font-semibold'
                          : 'bg-black/40 text-gray-400 border-gray-800 hover:border-gray-700 hover:text-gray-200'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

            </div>

          </div>
        </div>

        {/* Selected Node Sidebar Detail */}
        <div className="xl:col-span-1 space-y-4">
          {selectedNode ? (
            <div className="bg-[#141414] border border-gray-800 rounded-2xl p-5 space-y-4 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gray-900 rounded-xl border border-gray-800">
                  {selectedNode.icon}
                </div>
                <div>
                  <span className="text-[10px] text-gold uppercase font-bold tracking-widest">{selectedNode.department}</span>
                  <h4 className="font-bold text-white text-base leading-tight">{selectedNode.title}</h4>
                </div>
              </div>

              <div className="border-t border-gray-900 pt-3 space-y-3">
                <div>
                  <h5 className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Función Operativa</h5>
                  <p className="text-xs text-gray-300 leading-relaxed mt-1">{selectedNode.description}</p>
                </div>

                <div>
                  <h5 className="text-[10px] text-gold uppercase tracking-wider font-semibold flex items-center gap-1">
                    <Bot size={11} /> Respaldado por IA
                  </h5>
                  <p className="text-xs text-gray-400 leading-relaxed mt-1 bg-yellow-500/5 p-2 rounded border border-yellow-500/10 italic">
                    {selectedNode.aiPower}
                  </p>
                </div>

                {selectedNode.linkedModuleId && (
                  <button
                    onClick={executeAction}
                    className="w-full mt-4 bg-gold hover:bg-gold/90 text-black font-semibold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_2px_10px_rgba(212,175,55,0.2)]"
                  >
                    Abrir Herramienta Sincronizada
                    <ArrowRight size={14} />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-[#141414] border border-gray-800 rounded-2xl p-6 text-center text-gray-500 text-xs">
              Selecciona un departamento o subdivisión en el diagrama para ver su integración con la IA y acceder a sus herramientas.
            </div>
          )}

          <div className="bg-[#1a1a1a]/40 p-4 rounded-xl border border-gray-800">
            <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Sugerencia</h5>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Mapea tus flujos de trabajo organizacionales para que Mona IA asista de manera diferenciada a cada empleado o automatice tareas repetitivas de cada área.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}

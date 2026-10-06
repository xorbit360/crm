import React from 'react';
import { 
  Bot, Mic, Send, Video, Sparkles, Lightbulb, Layout, Megaphone, Radio, 
  CheckCircle2, ChevronRight, Zap
} from 'lucide-react';
import type { ModuleId } from '../types';

interface ToolCard {
  id: ModuleId;
  title: string;
  category: string;
  description: string;
  icon: React.ReactNode;
  tags: string[];
}

interface HerramientasTarjetasViewProps {
  onSelectTool: (moduleId: ModuleId) => void;
  hiddenItems?: string[];
}

export default function HerramientasTarjetasView({ onSelectTool, hiddenItems = [] }: HerramientasTarjetasViewProps) {
  const tools: ToolCard[] = [
    {
      id: 'whatsapp' as ModuleId,
      title: 'WhatsApp Bot AI & CRM',
      category: 'Atención 24/7 & Conversiones',
      description: 'Chatbot inteligente entrenado para tu negocio, gestión centralizada de conversaciones, clientes, pedidos y campañas masivas.',
      icon: <Bot size={26} />,
      tags: ['Conversaciones', 'Clientes', 'Pedidos', 'Catálogo', 'Campañas Masivas']
    },
    {
      id: 'llamadas' as ModuleId,
      title: 'Llamadas IA & Agente de Voz',
      category: 'Confirmaciones & Cobros',
      description: 'Agente telefónico con inteligencia artificial para llamadas de confirmación de pedidos, gestión de novedades y campañas de voz.',
      icon: <Mic size={26} />,
      tags: ['Confirmación Pedidos', 'Novedades', 'Oficina', 'Campañas de Voz']
    },
    {
      id: 'email' as ModuleId,
      title: 'Email Marketing AI',
      category: 'Secuencias & Nutrición',
      description: 'Flujos automáticos de correos electrónicos persuasivos para recuperar carritos abandonados, bienvenida y ventas secundarias.',
      icon: <Send size={26} />,
      tags: ['Gestión Flujos Email', 'Retargeting', 'Nutrición de Leads']
    },
    {
      id: 'contenido' as ModuleId,
      title: 'Creación & Contenido UGC',
      category: 'Multimedia & Creativos Pro',
      description: 'Generador automático de creativos, clasificadores de contenido de conversión, clonador de vídeo UGC y editor de vídeo IA.',
      icon: <Video size={26} />,
      tags: ['UGC Creator', 'Analizador Creativos', 'Clonador Vídeo', 'Editor IA']
    },
    {
      id: 'branding' as ModuleId,
      title: 'Branding & Identidad Visual',
      category: 'Diseño Corporativo',
      description: 'Manuales de marca automáticos, entrevista de identidad visual, generación de paletas de color, tipografía y recursos gráficos.',
      icon: <Sparkles size={26} />,
      tags: ['Entrevista Marca', 'Identidad Visual', 'Manual de Marca', 'Recursos']
    },
    {
      id: 'mercado' as ModuleId,
      title: 'Estudio de Mercado & Nichos',
      category: 'Inteligencia de Negocio',
      description: 'Definición de público objetivo, análisis de competidores, tendencias de mercado, recomendador multi-IA y calculadora de precios.',
      icon: <Lightbulb size={26} />,
      tags: ['Público Objetivo', 'Nichos', 'Competidores', 'Calculadora Precios']
    },
    {
      id: 'landing' as ModuleId,
      title: 'Landing Pages & Funnels',
      category: 'Páginas de Aterrizaje',
      description: 'Plantillas de alta conversión para ofertas de comercio electrónico, editor interactivo y rastreador de visitas con mapa de calor.',
      icon: <Layout size={26} />,
      tags: ['Plantillas Conversión', 'Editor Visual', 'Rastreador Visitas']
    },
    {
      id: 'ads' as ModuleId,
      title: 'Gestión de Ads (Meta & TikTok)',
      category: 'Pauta Publicitaria IA',
      description: 'Traffiker virtual automatizado para creación y escalado de campañas publicitarias en Facebook, Instagram y TikTok Ads con alertas KPI.',
      icon: <Megaphone size={26} />,
      tags: ['Traffiker IA', 'Facebook/TikTok Ads', 'Métricas KPI', 'Alertas']
    },
    {
      id: 'live_selling' as ModuleId,
      title: 'Live Selling & Streaming',
      category: 'Ventas en Directo',
      description: 'Transmisiones en vivo multi-canal con producto fijado relámpago, carrito interactivo y escaneo de palabras clave en comentarios.',
      icon: <Radio size={26} />,
      tags: ['Transmisión Vivo', 'Checkout Interactivo', 'Comentarios IA']
    }
  ];

  const visibleTools = tools.filter(t => !hiddenItems.includes(t.id));

  return (
    <div className="space-y-6 animate-fade-in w-full pb-16">
      {/* Header Banner - High End Obsidian & Subtle Gold Theme */}
      <div className="p-6 sm:p-8 rounded-2xl border border-zinc-800 bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl -mr-24 -mt-24 pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1.5">
                <Zap size={12} className="text-amber-400" />
                <span>Suite de Herramientas IA</span>
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Herramientas de Crecimiento & Automatización
            </h1>
            <p className="text-zinc-400 text-sm mt-1.5 max-w-2xl leading-relaxed">
              Selecciona cualquier herramienta a lo ancho para desplegar de inmediato sus menús de configuración y operación.
            </p>
          </div>
        </div>
      </div>

      {/* Cards List - Ultra-sleek enterprise dark cards */}
      <div className="flex flex-col gap-3.5">
        {visibleTools.map((tool) => (
          <div
            key={tool.id}
            onClick={() => onSelectTool(tool.id)}
            className="w-full bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800/80 hover:border-amber-500/40 rounded-2xl p-5 sm:p-6 transition-all duration-200 flex flex-col lg:flex-row lg:items-center justify-between gap-5 group cursor-pointer shadow-lg hover:shadow-amber-500/5"
          >
            {/* Left Content */}
            <div className="flex items-start gap-4 sm:gap-5 flex-1 min-w-0">
              <div className="p-3.5 sm:p-4 rounded-xl bg-zinc-800/80 group-hover:bg-amber-500/10 text-zinc-300 group-hover:text-amber-400 border border-zinc-700/50 group-hover:border-amber-500/30 shrink-0 transition-all duration-200 shadow-md">
                {tool.icon}
              </div>

              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-amber-300 transition-colors">
                    {tool.title}
                  </h3>
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-zinc-800 text-amber-400/90 border border-amber-500/20">
                    {tool.category}
                  </span>
                </div>

                <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
                  {tool.description}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {tool.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="text-[11px] font-medium bg-zinc-950/80 text-zinc-400 px-2.5 py-0.5 rounded-md border border-zinc-800 flex items-center gap-1.5"
                    >
                      <CheckCircle2 size={11} className="text-amber-400/80" />
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Action Button */}
            <div className="flex items-center lg:justify-end shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-zinc-800/60">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectTool(tool.id);
                }}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-400/10 group-hover:scale-[1.02]"
              >
                <span>Abrir Herramienta</span>
                <ChevronRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

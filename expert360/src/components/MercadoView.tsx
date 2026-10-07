import React, { useState } from 'react';
import CalculadoraCOD from './CalculadoraCOD';
import MultiRecomendadorView from './MultiRecomendadorView';
import {
  Target,
  Search,
  BarChart,
  ArrowRight,
  TrendingUp,
  BarChart3,
  Lightbulb,
  AlertTriangle,
  Sparkles,
  Zap,
  ShieldCheck,
  Plus,
  Trash2,
  Flame,
  ShoppingBag,
  Eye,
  ExternalLink,
  Award,
  DollarSign,
  Globe,
  Play,
  Instagram,
  Facebook,
  MessageSquare,
  CheckCircle2,
  Sparkle
} from 'lucide-react';

interface MercadoViewProps {
  activeTab?: 'publico' | 'tendencias' | 'competidores' | 'ia_ideas' | 'productos_ganadores' | 'calculadora' | 'multi_recomendador';
}

export default function MercadoView({ activeTab = 'publico' }: MercadoViewProps) {
  // Competidores State
  const [competitors, setCompetitors] = useState([
    { id: 'comp-1', name: 'FreshAir Co.', url: 'freshair-co.com', price: '$49.99', strength: 'Fuerte presencia en Instagram y TikTok con UGC orgánico.', weakness: 'Envíos lentos (15 días desde China) y soporte deficiente.' },
    { id: 'comp-2', name: 'AromaTherapy Store', url: 'aromatherapy-store.com', price: '$39.00', strength: 'Descuentos por volumen y bundles de aceites esenciales.', weakness: 'Su web tiene baja velocidad de carga y no tiene opción contra entrega.' }
  ]);
  const [newCompName, setNewCompName] = useState('');
  const [newCompPrice, setNewCompPrice] = useState('$35.00');
  const [newCompStrength, setNewCompStrength] = useState('');

  // Ideas Generator State
  const [rawIdeaInput, setRawIdeaInput] = useState('');
  const [generatedIdeas, setGeneratedIdeas] = useState([
    { id: 'idea-1', product: 'Humidificador con Efecto de Llama de Fuego', score: 94, margins: 'Alto (72%)', viralPotential: 'Extremo (TikTok UGC)', barrier: 'Baja' },
    { id: 'idea-2', product: 'Proyector de Galaxia de Mesa Recargable', score: 88, margins: 'Medio (60%)', viralPotential: 'Alto', barrier: 'Baja' }
  ]);
  const [ratingLoading, setRatingLoading] = useState(false);

  // Winning Products State
  const [winningSearchQuery, setWinningSearchQuery] = useState('');
  const [winningSourceFilter, setWinningSourceFilter] = useState<'todos' | 'tiktok' | 'meta' | 'amazon' | 'local'>('todos');
  const [selectedProductForAI, setSelectedProductForAI] = useState<any | null>(null);
  const [selectedProductForAds, setSelectedProductForAds] = useState<any | null>(null);
  const [importedProducts, setImportedProducts] = useState<string[]>([]);
  const [importingId, setImportingId] = useState<string | null>(null);

  const winningProducts = [
    {
      id: 'win-1',
      name: 'Humidificador de Llama Volcánica ASMR',
      source: 'tiktok',
      sourceBadge: 'TikTok Viral & Meta Ads',
      sourceDetail: '8.5M Views | 42 Anuncios Activos',
      metrics: '8.5M Views | #TikTokMadeMeBuyIt',
      cost: 8.50,
      price: 34.99,
      margin: 75,
      engagement: 97,
      category: 'Hogar',
      imgUrl: 'https://images.unsplash.com/photo-1602928321679-560bb453f190?auto=format&fit=crop&w=400&q=80',
      description: 'Humidificador con luces LED de alta calidad que simulan una llama de fuego y erupción volcánica mediante expulsión rítmica de vapor en anillos. Perfecto para videos estéticos de ASMR y relajación.',
      hooks: [
        '¡El accesorio que transformará tu habitación en un spa de 5 estrellas en segundos!',
        'No compres ambientadores comunes antes de ver el efecto volcán de este dispositivo.',
        'La terapia de fuego frío que necesitas para tu escritorio.'
      ],
      videoScript: '0:00 - Mostrar los anillos de humo saliendo en cámara lenta con música ASMR.\n0:05 - Añadir unas gotas de aceite esencial y explicar el alivio del estrés.\n0:10 - Apagar la luz para mostrar el efecto de lava súper realista.\n0:15 - Llamado a la acción: "Consíguelo hoy con envío gratis y contra entrega en el link de abajo."',
      adSpy: {
        activeAdsCount: 42,
        platforms: ['Facebook', 'Instagram', 'Audience Network'],
        daysActive: 24,
        adCopy: '🔥 ¡EL HUMIDIFICADOR VIRAL DE TIKTOK YA EN COLOMBIA! 🌋 Transforma tu cuarto en un ambiente relajante con el efecto de fuego real y anillos de vapor terapéuticos. 📦 Pago Contra Entrega + Envío GRATIS hoy.',
        estimatedDailySpend: '$120 - $350 USD',
        estimatedDailyImpressions: '25,000 - 60,000'
      }
    },
    {
      id: 'win-2',
      name: 'Cepillo Secador de Aire Caliente 5-en-1',
      source: 'meta',
      sourceBadge: 'Meta Ads & Amazon Bestseller',
      sourceDetail: 'Amazon Rank #3 | 88 Anuncios Activos',
      metrics: '88 Anuncios Activos | Escalando en Meta',
      cost: 12.00,
      price: 49.99,
      margin: 76,
      engagement: 94,
      category: 'Belleza',
      imgUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=400&q=80',
      description: 'Estilizador multifuncional 5 en 1 para cabello que seca, alisa, ondula y da volumen utilizando un potente flujo de aire coanda, previniendo el daño por calor extremo.',
      hooks: [
        '¿Por qué gastar una fortuna en la peluquería si puedes tener el efecto de salón en casa?',
        'El único estilizador de aire que no quema ni daña tu cabello.',
        'Arréglate en solo 10 minutos por las mañanas.'
      ],
      videoScript: '0:00 - Mostrar el cabello mojado y encrespado, luego pasar el cepillo secador una vez.\n0:05 - Demostrar cómo se adhiere el cabello automáticamente para crear ondas perfectas.\n0:10 - Comparar el lado peinado con el lado sin arreglar.\n0:15 - Llamado a la acción: "Compra hoy con 40% de descuento en el botón."',
      adSpy: {
        activeAdsCount: 88,
        platforms: ['Facebook', 'Instagram'],
        daysActive: 31,
        adCopy: '✨ Dile adiós a las planchas tradicionales que queman tu cabello. El nuevo Multi-Styler 5-en-1 utiliza aire a presión para secar, ondular y alisar al mismo tiempo. 🥰 Resultados profesionales en minutos.',
        estimatedDailySpend: '$300 - $800 USD',
        estimatedDailyImpressions: '70,000 - 150,000'
      }
    },
    {
      id: 'win-3',
      name: 'Mini Impresora Térmica de Bolsillo',
      source: 'tiktok',
      sourceBadge: 'AliExpress Hot & TikTok',
      sourceDetail: '14k+ Ventas | 3.2M Views en TikTok',
      metrics: '3.2M Views | Tendencia Estudiantes',
      cost: 6.20,
      price: 24.99,
      margin: 75,
      engagement: 89,
      category: 'Tecnología',
      imgUrl: 'https://images.unsplash.com/photo-1562240020-ce31ccb0fa7d?auto=format&fit=crop&w=400&q=80',
      description: 'Impresora bluetooth portátil que no requiere tinta. Funciona con papel térmico autoadhesivo para imprimir notas de estudio, fotos instantáneas, etiquetas organizadoras y dibujos desde la app móvil.',
      hooks: [
        'La mini impresora portátil sin tinta que todos los estudiantes necesitan hoy.',
        'Cómo imprimir tus fotos de Instagram instantáneamente desde tu celular.',
        'La forma más estética de organizar tus apuntes de clase.'
      ],
      videoScript: '0:00 - Mostrar una mini impresora súper compacta en la palma de la mano.\n0:05 - Conectar al teléfono por bluetooth en un toque e imprimir una foto en blanco y negro.\n0:10 - Pegar la impresión en un cuaderno de apuntes de forma estética.\n0:15 - Llamado a la acción: "Unidades limitadas con descuento. Consigue la tuya ahora."',
      adSpy: {
        activeAdsCount: 15,
        platforms: ['Instagram', 'TikTok Ads'],
        daysActive: 12,
        adCopy: '📸 ¡Imprime tus mejores recuerdos al instante y sin gastar en tinta! Conecta tu celular por Bluetooth y empieza a imprimir fotos, notas de estudio o etiquetas adhesivas en segundos. 🖤 Compacta y recargable.',
        estimatedDailySpend: '$50 - $150 USD',
        estimatedDailyImpressions: '12,000 - 30,000'
      }
    },
    {
      id: 'win-4',
      name: 'Proyector de Estrellas Astronauta Smart',
      source: 'meta',
      sourceBadge: 'Meta Ads & TikTok Viral',
      sourceDetail: '65 Anuncios Activos | 12M Views',
      metrics: '65 Anuncios Activos | Escena Gamer / Infantil',
      cost: 11.50,
      price: 39.99,
      margin: 71,
      engagement: 95,
      category: 'Hogar',
      imgUrl: 'https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?auto=format&fit=crop&w=400&q=80',
      description: 'Lámpara de proyección de nebulosas galácticas y estrellas con diseño único de astronauta. La cabeza magnética es ajustable en 360 grados, incluye control remoto y temporizador.',
      hooks: [
        'He comprado más de 10 luces led y este astronauta es con diferencia la mejor de todas.',
        'Regala el universo entero a tus hijos con este proyector inteligente.',
        'El accesorio definitivo que le faltaba a tu setup gamer.'
      ],
      videoScript: '0:00 - Encender el astronauta en una habitación completamente oscura.\n0:05 - Mostrar las nebulosas de colores moviéndose por el techo y las paredes.\n0:10 - Mostrar cómo se ajusta magnéticamente la cabeza del astronauta para apuntar a cualquier lado.\n0:15 - Llamado a la acción: "Pídelo hoy y págalo en casa al recibir."',
      adSpy: {
        activeAdsCount: 65,
        platforms: ['Facebook', 'Instagram', 'TikTok'],
        daysActive: 45,
        adCopy: '🌌 ¡Lleva el espacio exterior directamente a tu habitación! El proyector Astronauta crea galaxias ultra realistas y estrellas brillantes para relajarte o decorar tus espacios. 🚀 Cabeza magnética ajustable y control remoto.',
        estimatedDailySpend: '$250 - $600 USD',
        estimatedDailyImpressions: '50,000 - 120,000'
      }
    },
    {
      id: 'win-5',
      name: 'Licuadora Portátil de Alta Potencia USB',
      source: 'amazon',
      sourceBadge: 'Amazon Bestseller & Dropi Hot',
      sourceDetail: 'Rank #12 Cocina | 5.2k Pedidos Locales',
      metrics: 'Top #12 Cocina | Alta Rotación',
      cost: 5.80,
      price: 29.99,
      margin: 80,
      engagement: 91,
      category: 'Cocina',
      imgUrl: 'https://images.unsplash.com/photo-1578643463396-0997cb5328c1?auto=format&fit=crop&w=400&q=80',
      description: 'Vaso licuadora portátil de alta velocidad recargable por USB. Cuenta con 6 cuchillas de acero inoxidable 3D para triturar hielo y frutas congeladas de manera eficiente en cualquier lugar.',
      hooks: [
        'La licuadora portátil que tritura hielo y cabe en tu portavasos.',
        'Ya no tienes excusas para no desayunar saludable camino al gimnasio.',
        'Este termo se convierte en licuadora en solo 20 segundos.'
      ],
      videoScript: '0:00 - Echar cubos de hielo, fresas congeladas y leche en el termo.\n0:05 - Presionar el botón dos veces y mostrar el poder de trituración instantáneo.\n0:10 - Beber directamente del termo deportivo sin verter en otro vaso.\n0:15 - Llamado a la acción: "Consigue un 50% de descuento en tu compra hoy mismo."',
      adSpy: {
        activeAdsCount: 28,
        platforms: ['Facebook', 'Instagram'],
        daysActive: 19,
        adCopy: '🥤 ¡Tus batidos favoritos frescos en cualquier lugar! La licuadora portátil recargable USB es potente, tritura hielo y frutas congeladas en segundos. ⚡ Ideal para oficina, gimnasio o paseos. Pago contra entrega.',
        estimatedDailySpend: '$90 - $220 USD',
        estimatedDailyImpressions: '20,000 - 45,000'
      }
    },
    {
      id: 'win-6',
      name: 'Soporte de Teléfono con Rastreo IA 360°',
      source: 'local',
      sourceBadge: 'Tendencia Local Dropshipping',
      sourceDetail: '3.1k Pedidos Dropi | Alta Conversión',
      metrics: '3.1k Pedidos Dropi | Ideal UGC Creators',
      cost: 9.00,
      price: 37.99,
      margin: 76,
      engagement: 93,
      category: 'Tecnología',
      imgUrl: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&w=400&q=80',
      description: 'Soporte inteligente para celular que rota 360° siguiendo automáticamente el rostro o cuerpo del usuario gracias a su cámara y chip de Inteligencia Artificial integrado. No requiere Bluetooth ni app.',
      hooks: [
        'Tu propio camarógrafo inteligente por menos de 40 dólares.',
        'Si grabas contenido sola en casa, necesitas este soporte inteligente.',
        'El gadget secreto que mejoró la calidad de todos mis videos en TikTok.'
      ],
      videoScript: '0:00 - Grabar a alguien caminando de un lado a otro mientras el soporte del teléfono gira solo siguiéndola.\n0:05 - Mostrar que no hay nadie detrás de la cámara y que funciona de forma independiente.\n0:10 - Explicar que no requiere descargar apps ni emparejar por bluetooth.\n0:15 - Llamado a la acción: "Dale un salto de calidad a tus videos. Cómpralo con envío gratis."',
      adSpy: {
        activeAdsCount: 31,
        platforms: ['Facebook', 'Instagram', 'TikTok Ads'],
        daysActive: 15,
        adCopy: '🤳 ¡Tu camarógrafo personal de bolsillo! El soporte inteligente con seguimiento facial IA te sigue automáticamente a donde te muevas en 360°. 🎥 Ideal para TikToks, Reels, transmisiones en vivo o videollamadas.',
        estimatedDailySpend: '$150 - $400 USD',
        estimatedDailyImpressions: '35,000 - 85,000'
      }
    }
  ];

  const handleImportToCatalog = (productId: string) => {
    setImportingId(productId);
    setTimeout(() => {
      setImportedProducts(prev => [...prev, productId]);
      setImportingId(null);
    }, 1000);
  };

  const handleAddCompetitor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompName.trim()) return;
    setCompetitors(prev => [
      ...prev,
      {
        id: `comp-${Date.now()}`,
        name: newCompName,
        url: `${newCompName.toLowerCase().replace(/\s+/g, '')}.com`,
        price: newCompPrice,
        strength: newCompStrength || 'Sin analizar',
        weakness: 'Envíos y empaques genéricos, oportunidad de mejora en marca propia.'
      }
    ]);
    setNewCompName('');
    setNewCompStrength('');
  };

  const handleRateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawIdeaInput.trim()) return;

    setRatingLoading(true);
    setTimeout(() => {
      const generatedScore = Math.floor(Math.random() * 20) + 78; // Scores from 78 to 98
      setGeneratedIdeas(prev => [
        {
          id: `idea-${Date.now()}`,
          product: rawIdeaInput,
          score: generatedScore,
          margins: 'Excelente (68%-75%)',
          viralPotential: generatedScore > 90 ? 'Extremo (UGC Orgánico)' : 'Alto',
          barrier: 'Muy baja (Producto disponible en AliExpress / Dropi)'
        },
        ...prev
      ]);
      setRawIdeaInput('');
      setRatingLoading(false);
    }, 1200);
  };

  return (
    <div className="animate-fade-in space-y-6 text-gray-200">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-gray-800 pb-4">
        <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500">
          <BarChart3 size={22} />
        </div>
        <div>
          <h2 className="text-2xl font-display font-bold text-white">Investigación de Mercado AI</h2>
          <p className="text-xs text-gray-500 uppercase tracking-widest mt-0.5">Analiza audiencias, tendencias de consumo, competencia e ideas ganadoras de dropshipping</p>
        </div>
      </div>

      {/* Render sub-tabs */}
      {activeTab === 'publico' && (
        <div className="space-y-6 animate-fade-in">
          {/* Progress bar info */}
          <div className="panel p-6 rounded-2xl flex items-center gap-4 bg-orange-500/5 border border-orange-500/10">
            <div className="flex-1">
              <div className="flex justify-between items-end mb-2">
                <span className="text-sm font-semibold text-orange-400">Estado de la Investigación del Público</span>
                <span className="text-xs text-gray-500 font-mono">100% Completado</span>
              </div>
              <div className="w-full h-1.5 bg-gray-900 rounded-full overflow-hidden">
                <div className="w-full h-full bg-gradient-to-r from-orange-600 to-orange-400 rounded-full"></div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="panel p-6 rounded-2xl space-y-4">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Target size={18} className="text-orange-500" /> Segmento 1: Comprador Impulsivo (Estética del Hogar)
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Usuarios de redes sociales (principalmente mujeres de 22 a 45 años) obsesionadas con la decoración estética de habitaciones, el autocuidado y las tendencias de "Home Wellness" de Pinterest y TikTok.
              </p>

              <div className="space-y-2 pt-2">
                <p className="text-xs font-semibold text-orange-400">🔴 Puntos de Dolor principales:</p>
                <ul className="text-xs text-gray-400 space-y-1.5 list-disc pl-4">
                  <li>Ambiente de casa aburrido, frío o seco.</li>
                  <li>Dificultad para encontrar accesorios de lujo a precios razonables.</li>
                  <li>Inseguridad al comprar en tiendas genéricas sin soporte local.</li>
                </ul>
              </div>

              <div className="bg-orange-500/5 border border-orange-500/10 p-4 rounded-xl text-xs space-y-1">
                <p className="font-bold text-orange-400">🔥 Gancho de Retención UGC Sugerido:</p>
                <p className="text-gray-300">"El accesorio secreto de $30 USD que hace que mi habitación parezca un hotel de 5 estrellas..."</p>
              </div>
            </div>

            <div className="panel p-6 rounded-2xl space-y-4">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Target size={18} className="text-blue-400" /> Segmento 2: Oficinista / Home Office (Productividad & Relax)
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Profesionales y emprendedores que trabajan desde casa y buscan crear un espacio óptimo, relajante y estimulante para evitar la fatiga mental y mantener el enfoque.
              </p>

              <div className="space-y-2 pt-2">
                <p className="text-xs font-semibold text-blue-400">🔴 Puntos de Dolor principales:</p>
                <ul className="text-xs text-gray-400 space-y-1.5 list-disc pl-4">
                  <li>Estrés acumulado por largas jornadas de trabajo sentado.</li>
                  <li>Sequedad en los ojos y garganta debido al aire acondicionado.</li>
                  <li>Falta de concentración a media tarde.</li>
                </ul>
              </div>

              <div className="bg-blue-500/5 border border-blue-500/10 p-4 rounded-xl text-xs space-y-1">
                <p className="font-bold text-blue-400">🔥 Gancho de Retención UGC Sugerido:</p>
                <p className="text-gray-300">"Si trabajas desde casa y no tienes esto en tu escritorio, estás saboteando tu productividad..."</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'tendencias' && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* Interest Score card 1 */}
            <div className="panel p-6 rounded-2xl bg-black/40 border border-gray-800 flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-orange-400 font-bold uppercase tracking-wider">Tendencias de Búsqueda</span>
                <h4 className="text-base font-bold text-white mt-1">Decoración Estética</h4>
                <p className="text-xs text-gray-500 mt-2">Volumen de búsquedas en TikTok e Instagram en los últimos 30 días.</p>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-900 flex items-end justify-between">
                <div>
                  <span className="text-2xl font-bold text-white">+24.5%</span>
                  <span className="text-[9px] text-emerald-400 font-bold ml-1.5">▲ CRECIENDO</span>
                </div>
                <div className="w-16 h-8 bg-orange-500/10 rounded border border-orange-500/20 flex items-center justify-center text-xs font-mono font-bold text-orange-400">
                  92/100
                </div>
              </div>
            </div>

            {/* Interest Score card 2 */}
            <div className="panel p-6 rounded-2xl bg-black/40 border border-gray-800 flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">Demanda Dropshipping</span>
                <h4 className="text-base font-bold text-white mt-1">Humidificadores Ultrasónicos</h4>
                <p className="text-xs text-gray-500 mt-2">Interés acumulado en importaciones y plataformas dropshipping locales.</p>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-900 flex items-end justify-between">
                <div>
                  <span className="text-2xl font-bold text-white">+18.2%</span>
                  <span className="text-[9px] text-emerald-400 font-bold ml-1.5">▲ ESTABLE</span>
                </div>
                <div className="w-16 h-8 bg-blue-500/10 rounded border border-blue-500/20 flex items-center justify-center text-xs font-mono font-bold text-blue-400">
                  85/100
                </div>
              </div>
            </div>

            {/* Interest Score card 3 */}
            <div className="panel p-6 rounded-2xl bg-black/40 border border-gray-800 flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">Moda Bienestar</span>
                <h4 className="text-base font-bold text-white mt-1">Aceites Esenciales / Aromas</h4>
                <p className="text-xs text-gray-500 mt-2">Productos recurrentes para aumentar el valor del ticket promedio (Upsell).</p>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-900 flex items-end justify-between">
                <div>
                  <span className="text-2xl font-bold text-white">+31.0%</span>
                  <span className="text-[9px] text-blue-400 font-bold ml-1.5">▲ EXTREMO</span>
                </div>
                <div className="w-16 h-8 bg-blue-500/10 rounded border border-blue-500/20 flex items-center justify-center text-xs font-mono font-bold text-blue-400">
                  96/100
                </div>
              </div>
            </div>
          </div>

          {/* Graphical Trends Representation */}
          <div className="panel p-6 rounded-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Análisis de Volumen Histórico de Ventas</h3>
            <p className="text-xs text-gray-400">Comparativa trimestral estimada de pedidos dropshipping (Bogotá, Medellín, Cali).</p>

            <div className="space-y-3 pt-2">
              {[
                { label: 'Q1 2026 (Realizado)', value: '75%', color: 'from-orange-600 to-orange-400', count: '14,200 pedidos' },
                { label: 'Q2 2026 (En Proceso)', value: '88%', color: 'from-orange-500 to-yellow-400', count: '18,500 pedidos' },
                { label: 'Q3 2026 (Sugerido / Proyectado)', value: '95%', color: 'from-yellow-400 to-emerald-400', count: '24,000 pedidos (Est.)' }
              ].map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-gray-300">{item.label}</span>
                    <span className="text-gray-400">{item.count}</span>
                  </div>
                  <div className="w-full h-3 bg-gray-950 rounded-full overflow-hidden border border-gray-800">
                    <div
                      className={`h-full bg-gradient-to-r ${item.color} rounded-full transition-all duration-1000`}
                      style={{ width: item.value }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'competidores' && (
        <div className="space-y-6 animate-fade-in">
          {/* Competitor Add Form and SWOT list */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="panel p-6 rounded-2xl bg-black/40 border border-gray-800 space-y-4 h-fit">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Plus className="text-orange-500" size={15} /> Añadir Competidor Comercial
              </h3>
              <p className="text-xs text-gray-400">Registra tus competidores directos para analizar sus debilidades y estructurar una estrategia superior.</p>

              <form onSubmit={handleAddCompetitor} className="space-y-3 pt-2">
                <div>
                  <label className="block text-[10px] text-gray-500 font-bold uppercase mb-1">Nombre Comercial:</label>
                  <input
                    type="text"
                    required
                    value={newCompName}
                    onChange={(e) => setNewCompName(e.target.value)}
                    placeholder="ej. Mistify Store"
                    className="w-full bg-black border border-gray-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-gray-500 font-bold uppercase mb-1">Precio Promedio de Venta:</label>
                  <input
                    type="text"
                    value={newCompPrice}
                    onChange={(e) => setNewCompPrice(e.target.value)}
                    className="w-full bg-black border border-gray-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-gray-500 font-bold uppercase mb-1">Puntos Fuertes (Strength):</label>
                  <textarea
                    value={newCompStrength}
                    onChange={(e) => setNewCompStrength(e.target.value)}
                    placeholder="ej. Excelente branding y empaque personalizado..."
                    className="w-full h-16 bg-black border border-gray-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-orange-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-orange-500 hover:bg-orange-400 text-black font-bold text-xs rounded-xl transition"
                >
                  Registrar Competidor
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-bold text-white">Análisis de Brecha de Mercado</h3>
                <span className="text-[10px] text-gray-500">Registrados: {competitors.length}</span>
              </div>

              <div className="space-y-4">
                {competitors.map((c) => (
                  <div key={c.id} className="panel p-5 rounded-2xl bg-black border border-gray-800 hover:border-gray-700 transition space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-white text-sm">{c.name}</h4>
                        <span className="text-[10px] text-gray-500 font-mono">{c.url}</span>
                      </div>
                      <div className="bg-gray-900 border border-gray-800 px-3 py-1 rounded text-xs font-bold text-orange-400">
                        {c.price}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1.5 border-t border-gray-900 text-xs">
                      <div className="space-y-1">
                        <p className="font-bold text-emerald-400">✅ Fortaleza Competitiva:</p>
                        <p className="text-gray-400 leading-relaxed text-[11px]">{c.strength}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="font-bold text-red-400">❌ Debilidad (Nuestra Oportunidad):</p>
                        <p className="text-gray-400 leading-relaxed text-[11px]">{c.weakness}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'ia_ideas' && (
        <div className="space-y-6 animate-fade-in">
          {/* Idea Input evaluator */}
          <div className="panel p-6 rounded-2xl bg-[#0a0a0a] border border-gray-800 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Lightbulb className="text-yellow-400 animate-pulse" size={18} /> Evaluador de Productos Ganadores IA
            </h3>
            <p className="text-xs text-gray-400">
              Ingresa una idea de producto dropshipping de AliExpress, Dropi o MasterShop y nuestra Inteligencia Artificial calificará el potencial de venta basándose en márgenes, saturación del mercado y nivel de viralidad.
            </p>

            <form onSubmit={handleRateProduct} className="flex gap-2.5 pt-2">
              <input
                type="text"
                required
                value={rawIdeaInput}
                onChange={(e) => setRawIdeaInput(e.target.value)}
                placeholder="ej. Mini aspiradora inalámbrica recargable para escritorios y autos..."
                className="flex-1 bg-black border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500"
              />
              <button
                type="submit"
                disabled={ratingLoading}
                className="px-6 py-2.5 bg-orange-500 hover:bg-orange-400 text-black font-bold text-xs rounded-xl transition flex items-center gap-1.5 shrink-0"
              >
                {ratingLoading ? (
                  <>
                    <TrendingUp size={13} className="animate-spin" /> Evaluando...
                  </>
                ) : (
                  <>
                    <Zap size={13} /> Calificar Producto
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Rated product list */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Historial de Productos Calificados</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {generatedIdeas.map((idea) => (
                <div
                  key={idea.id}
                  className="panel p-5 rounded-2xl bg-black border border-gray-800 hover:border-gray-700 transition relative overflow-hidden flex flex-col justify-between"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 rounded-full blur-2xl pointer-events-none"></div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-start gap-3">
                      <h4 className="font-bold text-white text-sm">{idea.product}</h4>
                      <div className="text-center px-2 py-1 rounded bg-orange-500/10 border border-orange-500/25 shrink-0">
                        <p className="text-[9px] text-orange-400 uppercase font-mono leading-none">SCORE</p>
                        <p className="text-base font-bold text-orange-400 font-sans mt-0.5">{idea.score}%</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-[10px] bg-gray-950/60 p-2.5 rounded-lg border border-gray-900 font-semibold mt-4">
                      <div>
                        <span className="text-gray-500 uppercase block text-[8px]">Márgenes:</span>
                        <span className="text-emerald-400 block mt-0.5">{idea.margins}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 uppercase block text-[8px]">Viral UGC:</span>
                        <span className="text-blue-400 block mt-0.5">{idea.viralPotential}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 uppercase block text-[8px]">Barrera Entrada:</span>
                        <span className="text-gray-300 block mt-0.5">{idea.barrier}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-[10px] text-gray-500 mt-4 pt-3 border-t border-gray-900/60">
                    <ShieldCheck size={12} className="text-emerald-500" />
                    <span>Listo para lanzar campañas de prueba en Ads</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'productos_ganadores' && (
        <div className="space-y-6 animate-fade-in text-gray-200">
          {/* Top KPI Panel */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="panel p-4 rounded-xl bg-black/40 border border-gray-800 flex flex-col justify-between">
              <span className="text-[10px] text-orange-400 font-bold uppercase tracking-wider">Productos Escaneados</span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-xl font-bold text-white">14,820</span>
                <span className="text-[10px] text-emerald-400 font-bold">▲ +12% HOY</span>
              </div>
            </div>
            <div className="panel p-4 rounded-xl bg-black/40 border border-gray-800 flex flex-col justify-between">
              <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">Fuentes de Datos</span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-xl font-bold text-white">TikTok, Meta, AMZ</span>
                <span className="text-[10px] text-emerald-400 font-bold">ACTIVO</span>
              </div>
            </div>
            <div className="panel p-4 rounded-xl bg-black/40 border border-gray-800 flex flex-col justify-between">
              <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">Volumen Estimado Dropshipping</span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-xl font-bold text-white">$42,500 USD</span>
                <span className="text-[10px] text-blue-400 font-bold">Últimas 24h</span>
              </div>
            </div>
            <div className="panel p-4 rounded-xl bg-black/40 border border-gray-800 flex flex-col justify-between">
              <span className="text-[10px] text-yellow-400 font-bold uppercase tracking-wider">Nicho Más Caliente</span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-xl font-bold text-white">Estética & Bienestar</span>
                <span className="text-[10px] text-yellow-400 font-bold">ALTA DEMANDA</span>
              </div>
            </div>
          </div>

          {/* Search and Filters Control bar */}
          <div className="panel p-5 rounded-2xl bg-[#0a0a0a] border border-gray-800 space-y-4">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Flame className="text-orange-500 animate-pulse" size={18} /> Buscador de Productos Ganadores Inteligente
                </h3>
                <p className="text-xs text-gray-400">
                  Explora productos virales y con campañas escalando actualmente en redes sociales listos para vender en dropshipping.
                </p>
              </div>

              {/* Search Bar */}
              <div className="relative w-full md:w-80">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  placeholder="Buscar producto..."
                  value={winningSearchQuery}
                  onChange={(e) => setWinningSearchQuery(e.target.value)}
                  className="w-full bg-black border border-gray-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            {/* Source selector */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-900/60">
              <span className="text-[10px] text-gray-500 font-bold uppercase self-center mr-2">Filtrar por origen:</span>
              {[
                { id: 'todos', label: 'Todos', icon: <Globe size={12} /> },
                { id: 'tiktok', label: 'TikTok Virals', icon: <Sparkle size={12} className="text-teal-400" /> },
                { id: 'meta', label: 'Meta Ads Library', icon: <Facebook size={12} className="text-blue-400" /> },
                { id: 'amazon', label: 'Amazon BestSellers', icon: <ShoppingBag size={12} className="text-yellow-500" /> },
                { id: 'local', label: 'Proveedores Locales', icon: <Award size={12} className="text-orange-500" /> },
              ].map(src => (
                <button
                  key={src.id}
                  onClick={() => setWinningSourceFilter(src.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                    winningSourceFilter === src.id
                      ? 'bg-orange-500 text-black'
                      : 'bg-black border border-gray-800 text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {src.icon}
                  {src.label}
                </button>
              ))}
            </div>
          </div>

          {/* Winning Products Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {winningProducts
              .filter(p => {
                const matchesSearch = p.name.toLowerCase().includes(winningSearchQuery.toLowerCase()) || p.description.toLowerCase().includes(winningSearchQuery.toLowerCase());
                const matchesSource = winningSourceFilter === 'todos' || p.source === winningSourceFilter;
                return matchesSearch && matchesSource;
              })
              .map(product => {
                const isImported = importedProducts.includes(product.id);
                const isImporting = importingId === product.id;

                return (
                  <div
                    key={product.id}
                    className="panel p-0 rounded-2xl border border-gray-800 bg-black/40 hover:border-gray-700 transition duration-300 flex flex-col overflow-hidden relative"
                  >
                    {/* Product Image & Viral Index tag */}
                    <div className="relative h-48 w-full bg-gray-950 overflow-hidden">
                      <img
                        src={product.imgUrl}
                        alt={product.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover opacity-80 hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/80 border border-gray-800 text-[10px] font-bold text-gray-300 flex items-center gap-1.5 backdrop-blur-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        {product.sourceBadge}
                      </div>

                      <div className="absolute top-3 right-3 px-2 py-1 rounded bg-orange-500/10 border border-orange-500/30 text-center backdrop-blur-sm">
                        <p className="text-[8px] text-orange-400 font-bold uppercase leading-none font-mono">VIRAL INDEX</p>
                        <p className="text-xs font-bold text-orange-400 mt-0.5">{product.engagement}/100</p>
                      </div>

                      <div className="absolute bottom-3 left-3 bg-black/80 px-2 py-0.5 rounded text-[10px] font-mono text-gray-400 border border-gray-900">
                        {product.category}
                      </div>
                    </div>

                    {/* Body Info */}
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        <h4 className="font-bold text-white text-base leading-snug">{product.name}</h4>
                        <p className="text-xs text-gray-400 leading-relaxed line-clamp-2">{product.description}</p>
                      </div>

                      {/* Metrics Row */}
                      <div className="grid grid-cols-3 gap-2 bg-black/80 p-2.5 rounded-lg border border-gray-900 text-center text-[10px]">
                        <div>
                          <span className="text-gray-500 uppercase block text-[8px] font-mono">Costo</span>
                          <span className="text-gray-300 font-bold block mt-0.5">${product.cost.toFixed(2)} USD</span>
                        </div>
                        <div>
                          <span className="text-gray-500 uppercase block text-[8px] font-mono">P. Sugerido</span>
                          <span className="text-orange-400 font-bold block mt-0.5">${product.price.toFixed(2)} USD</span>
                        </div>
                        <div>
                          <span className="text-gray-500 uppercase block text-[8px] font-mono">Margen</span>
                          <span className="text-emerald-400 font-bold block mt-0.5">+{product.margin}%</span>
                        </div>
                      </div>

                      {/* Secondary Metrics / Source summary */}
                      <div className="text-[10px] font-mono text-gray-500 bg-gray-950/40 px-3 py-1.5 rounded-md flex items-center justify-between">
                        <span className="text-gray-400">{product.sourceDetail}</span>
                      </div>

                      {/* Button CTAs */}
                      <div className="space-y-2 pt-2 border-t border-gray-900">
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => setSelectedProductForAds(product)}
                            className="py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 font-semibold text-[10px] rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Facebook size={12} /> Meta Ads Spy
                          </button>
                          <button
                            onClick={() => setSelectedProductForAI(product)}
                            className="py-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/20 font-semibold text-[10px] rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Sparkles size={12} /> Estrategia UGC
                          </button>
                        </div>

                        <button
                          onClick={() => handleImportToCatalog(product.id)}
                          disabled={isImported || isImporting}
                          className={`w-full py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                            isImported
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-default'
                              : isImporting
                              ? 'bg-orange-500/40 text-black cursor-wait'
                              : 'bg-orange-500 hover:bg-orange-400 text-black hover:-translate-y-0.5 cursor-pointer'
                          }`}
                        >
                          {isImported ? (
                            <>
                              <CheckCircle2 size={13} className="text-emerald-400" /> Producto Importado
                            </>
                          ) : isImporting ? (
                            <>
                              <TrendingUp size={13} className="animate-spin" /> Importando...
                            </>
                          ) : (
                            <>
                              <ShoppingBag size={13} /> Importar a mi Catálogo
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

            {winningProducts.filter(p => {
              const matchesSearch = p.name.toLowerCase().includes(winningSearchQuery.toLowerCase()) || p.description.toLowerCase().includes(winningSearchQuery.toLowerCase());
              const matchesSource = winningSourceFilter === 'todos' || p.source === winningSourceFilter;
              return matchesSearch && matchesSource;
            }).length === 0 && (
              <div className="col-span-full py-12 text-center text-gray-500 font-medium">
                No se encontraron productos ganadores que coincidan con la búsqueda o filtro.
              </div>
            )}
          </div>

          {/* AI Strategy & Copywriting Drawer Overlay */}
          {selectedProductForAI && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
              <div className="w-full max-w-2xl bg-black border border-gray-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
                <div className="p-6 border-b border-gray-800 bg-gradient-to-r from-orange-900/20 to-transparent flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500">
                      <Sparkles size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-base">Estrategia de Ventas UGC (Sugerido por IA)</h4>
                      <p className="text-[10px] text-gray-400 uppercase tracking-widest">{selectedProductForAI.name}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedProductForAI(null)}
                    className="text-gray-400 hover:text-white p-2 hover:bg-gray-900 rounded-lg transition"
                  >
                    ✕
                  </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-6 text-sm leading-relaxed">
                  {/* Hook Copy ideas */}
                  <div className="space-y-2">
                    <h5 className="font-bold text-orange-400 text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkle size={12} /> Ganchos de Retención de 3 Segundos (TikTok / Reels)
                    </h5>
                    <div className="space-y-2.5">
                      {selectedProductForAI.hooks.map((hook: string, index: number) => (
                        <div key={index} className="p-3 bg-gray-900/50 border border-gray-800 rounded-xl text-xs text-gray-300 relative group flex justify-between items-center">
                          <span>"{hook}"</span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(hook);
                              alert('Copiado al portapapeles');
                            }}
                            className="text-[9px] text-orange-400 hover:text-orange-300 hover:underline font-bold shrink-0 ml-2"
                          >
                            Copiar
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Demographic target strategy */}
                  <div className="space-y-2">
                    <h5 className="font-bold text-blue-400 text-xs uppercase tracking-wider">Público Objetivo Recomendado</h5>
                    <div className="p-4 bg-gray-950 rounded-xl border border-gray-900 text-xs space-y-2 text-gray-300">
                      <p><span className="font-bold text-white">🟢 Target Principal:</span> Mujeres y hombres de 18-35 años, interesados en tendencias de redes sociales, gadgets estéticos, decoración del hogar u oficina, bienestar, belleza o creación de contenido.</p>
                      <p><span className="font-bold text-white">🟢 Estrategia de Segmentación en Facebook Ads:</span> Deja el público abierto (Broad) o segmenta por intereses relacionados (e.g., "Decoración de Interiores", "Compras Online", "TikTok") y deja que el creativo UGC filtre el público ideal.</p>
                    </div>
                  </div>

                  {/* Complete Script for UGC Video */}
                  <div className="space-y-2">
                    <h5 className="font-bold text-blue-400 text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <Play size={12} /> Guión y Estructura del Video UGC Viral
                    </h5>
                    <div className="p-4 bg-gray-900/60 border border-gray-800 rounded-xl text-xs font-mono text-gray-300 whitespace-pre-wrap leading-loose">
                      {selectedProductForAI.videoScript}
                    </div>
                  </div>
                </div>

                <div className="p-4 border-t border-gray-900 bg-gray-950 flex justify-end">
                  <button
                    onClick={() => setSelectedProductForAI(null)}
                    className="px-5 py-2 bg-orange-500 hover:bg-orange-400 text-black text-xs font-bold rounded-xl transition"
                  >
                    Entendido, Cerrar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Meta Ads Library Spy Overlay */}
          {selectedProductForAds && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
              <div className="w-full max-w-xl bg-[#0f1115] border border-gray-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
                <div className="p-5 border-b border-gray-800 bg-blue-600/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                      <Facebook size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">Biblioteca de Anuncios Meta - AdSpy Pro</h4>
                      <p className="text-[10px] text-gray-400 uppercase tracking-widest">{selectedProductForAds.name}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedProductForAds(null)}
                    className="text-gray-400 hover:text-white p-2 hover:bg-gray-900 rounded-lg transition"
                  >
                    ✕
                  </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-5 text-xs text-gray-300 font-sans">
                  {/* Meta Ad Overview Card */}
                  <div className="p-4 rounded-xl bg-black border border-gray-800 space-y-4">
                    <div className="flex justify-between items-center pb-2.5 border-b border-gray-900 text-[10px] font-mono text-gray-400">
                      <span className="text-emerald-400 font-bold flex items-center gap-1">● Anuncio Activo</span>
                      <span>Activo desde hace {selectedProductForAds.adSpy.daysActive} días</span>
                    </div>

                    <div className="space-y-1.5">
                      <p className="font-bold text-white">Texto del Anuncio (Ad Copy):</p>
                      <div className="p-3 bg-gray-900 rounded-lg border border-gray-800 text-gray-300 leading-relaxed">
                        {selectedProductForAds.adSpy.adCopy}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-1.5 text-[10px] font-semibold">
                      <div className="space-y-0.5">
                        <span className="text-gray-500">Impresiones diarias estimadas:</span>
                        <span className="text-white block font-mono">{selectedProductForAds.adSpy.estimatedDailyImpressions}</span>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-gray-500">Inversión diaria estimada:</span>
                        <span className="text-white block font-mono">{selectedProductForAds.adSpy.estimatedDailySpend}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-gray-500 font-mono pt-2 border-t border-gray-900">
                      <span>Plataformas: {selectedProductForAds.adSpy.platforms.join(', ')}</span>
                      <span className="text-blue-400 font-bold">{selectedProductForAds.adSpy.activeAdsCount} anuncios similares activos</span>
                    </div>
                  </div>

                  {/* Ad Creative Player Simulation */}
                  <div className="space-y-2">
                    <p className="font-bold text-white">Vista Previa del Creativo:</p>
                    <div className="relative rounded-xl overflow-hidden border border-gray-800 aspect-video bg-gray-950 flex flex-col items-center justify-center text-center p-6">
                      <div className="absolute inset-0 opacity-40 bg-cover bg-center" style={{ backgroundImage: `url(${selectedProductForAds.imgUrl})` }}></div>
                      <div className="relative z-10 w-12 h-12 rounded-full bg-blue-500/20 border border-blue-500 flex items-center justify-center text-blue-400 animate-pulse cursor-pointer">
                        <Play size={20} className="ml-0.5" />
                      </div>
                      <p className="relative z-10 mt-3 text-[11px] font-bold text-white font-mono bg-black/80 px-2.5 py-1 rounded-full border border-gray-800">
                        Previsualizar video creativo (.MP4)
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 border-t border-gray-900 bg-gray-950 flex justify-end gap-2">
                  <button
                    onClick={() => {
                      alert('Descarga de video creativo iniciada con éxito. El video se descargará en formato MP4 en su dispositivo.');
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                  >
                    Descargar Creativo
                  </button>
                  <button
                    onClick={() => setSelectedProductForAds(null)}
                    className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-gray-300 text-xs font-bold rounded-xl transition border border-gray-800"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      {activeTab === "calculadora" && <CalculadoraCOD />}
      {activeTab === "multi_recomendador" && <MultiRecomendadorView />}
    </div>
  );
}

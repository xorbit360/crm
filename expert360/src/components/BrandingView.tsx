import React, { useState } from 'react';
import { 
  Bot, 
  CheckCircle, 
  Sparkles, 
  Sliders, 
  Palette, 
  Type, 
  Award, 
  Download, 
  RefreshCw, 
  Send, 
  Plus, 
  Check, 
  HelpCircle,
  FileText,
  Copy,
  Trash2,
  Globe,
  Upload,
  Link2,
  Eye,
  FileCode,
  AlertCircle,
  Video,
  Paperclip,
  Mic,
  MicOff,
  Play,
  Pause,
  X,
  Music
} from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  attachments?: {
    name: string;
    type: 'image' | 'video' | 'pdf';
    previewUrl?: string;
    size?: string;
  }[];
  isAudio?: boolean;
  audioDuration?: string;
}

interface BrandingViewProps {
  activeTab?: 'entrevista' | 'identidad' | 'manual' | 'creativos';
}

export default function BrandingView({ activeTab = 'entrevista' }: BrandingViewProps) {
  // Entrevista State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { 
      id: 'initial-msg',
      role: 'assistant', 
      text: '¡Hola! Soy tu AI Brand Strategist. Para diseñar la identidad perfecta de tu marca, cuéntame: ¿Qué problema principal resuelve tu producto dropshipping y a qué tipo de público quieres enamorar?' 
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatAttachments, setChatAttachments] = useState<{
    name: string;
    type: 'image' | 'video' | 'pdf';
    previewUrl?: string;
    size?: string;
  }[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordingIntervalId, setRecordingIntervalId] = useState<any>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioPlaybackProgress, setAudioPlaybackProgress] = useState<{[key: string]: number}>({});
  const [isTyping, setIsTyping] = useState(false);

  // New Brand Optimizer Tool States
  const [brandingSubTab, setBrandingSubTab] = useState<'optimizer' | 'chat'>('optimizer');
  const [creationMode, setCreationMode] = useState<'scratch' | 'improve' | 'competitor'>('scratch');
  
  // Input fields
  const [scratchProductName, setScratchProductName] = useState('');
  const [scratchAudience, setScratchAudience] = useState('');
  const [scratchNiche, setScratchNiche] = useState('hogar'); // 'hogar' | 'tecnologia' | 'belleza' | 'salud' | 'moda'
  
  const [improveBrandName, setImproveBrandName] = useState('');
  const [improveFocus, setImproveFocus] = useState('todo'); // 'todo' | 'colors' | 'tone' | 'value'
  
  const [competitorUrl, setCompetitorUrl] = useState('');
  const [competitorAesthetic, setCompetitorAesthetic] = useState('');

  // Upload fields
  const [uploadedFile, setUploadedFile] = useState<{
    name: string;
    type: 'image' | 'pdf' | 'video';
    size: string;
    preview?: string;
  } | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  
  const [extraBrandNotes, setExtraBrandNotes] = useState('');

  // Execution states
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizeStep, setOptimizeStep] = useState(0);
  const [optimizeLogs, setOptimizeLogs] = useState<string[]>([]);
  const [hasOptimized, setHasOptimized] = useState(false);

  // Results State
  const [resultPrompt, setResultPrompt] = useState('');
  const [resultMission, setResultMission] = useState('');
  const [resultTone, setResultTone] = useState('');
  const [resultValueProp, setResultValueProp] = useState('');
  const [resultSlogan, setResultSlogan] = useState('');
  const [resultColors, setResultColors] = useState<string[]>([]);
  const [resultBrandName, setResultBrandName] = useState('');

  // Paleta Presets (Stateful to allow dynamic insertion of custom generated branding palettes)
  const [palettesState, setPalettesState] = useState([
    { name: 'Luxury Gold (Premium)', colors: ['#000000', '#1A1A1A', '#D4AF37', '#FFFFFF'], tags: ['Elegante', 'Exclusivo', 'Premium'] },
    { name: 'Cosmic Slate (Modern Tech)', colors: ['#0A0E1A', '#1E293B', '#6366F1', '#F8FAFC'], tags: ['SaaS', 'Moderno', 'Tecnológico'] },
    { name: 'Nordic Clean (Minimal)', colors: ['#2E3440', '#4C566A', '#8FBCBB', '#ECEFF4'], tags: ['Orgánico', 'Calmado', 'Bienestar'] },
    { name: 'Sunset Spark (Energetic)', colors: ['#1C0A00', '#FF6B35', '#FFB627', '#FFF5EB'], tags: ['Juvenil', 'Dinámico', 'Deportes'] }
  ]);
  const [selectedPaletteIdx, setSelectedPaletteIdx] = useState(0);
  const activePalette = palettesState[selectedPaletteIdx];

  // Manual de Marca State
  const [mission, setMission] = useState('Democratizar el acceso a productos innovadores para el hogar, garantizando un servicio rápido y una estética de vanguardia.');
  const [tone, setTone] = useState('Autoritario pero Accesible. Nos comunicamos de forma directa, educando al cliente y transmitiendo confianza absoluta.');
  const [valueProp, setValueProp] = useState('Humidificadores de aire que transforman el ambiente del hogar en un santuario estético y saludable con tecnología de microdifusión ultrasónica.');

  // Logos Generados
  const [logos, setLogos] = useState([
    { id: 'logo-1', name: 'AuraMist Main', style: 'Minimalist Line', icon: '☁️', color: '#D4AF37', bg: '#000000' },
    { id: 'logo-2', name: 'AuraMist Dark Icon', style: 'Geometric Badge', icon: '🌀', color: '#FFFFFF', bg: '#1A1A1A' }
  ]);
  const [newLogoName, setNewLogoName] = useState('AuraMist');
  const [selectedLogoIcon, setSelectedLogoIcon] = useState('☁️');
  const [generatingLogo, setGeneratingLogo] = useState(false);

  // Copy alert state
  const [copiedColor, setCopiedColor] = useState<string | null>(null);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() && chatAttachments.length === 0) return;

    const userMsg = chatInput || (chatAttachments.length > 0 ? `Envió ${chatAttachments.length} archivo(s)` : '');
    const newMsgId = `msg-${Date.now()}`;
    const newMsg: ChatMessage = {
      id: newMsgId,
      role: 'user',
      text: userMsg,
      attachments: chatAttachments.length > 0 ? [...chatAttachments] : undefined
    };

    setChatMessages(prev => [...prev, newMsg]);
    setChatInput('');
    setChatAttachments([]);
    setIsTyping(true);

    setTimeout(() => {
      let aiResponse = '';
      const lowerMsg = userMsg.toLowerCase();

      if (newMsg.attachments && newMsg.attachments.length > 0) {
        const types = newMsg.attachments.map(a => a.type.toUpperCase()).join(', ');
        aiResponse = `¡He recibido tus archivos adjuntos (${types}) con éxito! Los he analizado exhaustivamente. Detecto un fuerte potencial de diseño limpio en el material provisto. He incorporado esta directriz en tu prompt de posicionamiento para que tus futuros creativos mantengan esta consistencia visual premium.`;
      } else if (lowerMsg.includes('humidificador') || lowerMsg.includes('aire') || lowerMsg.includes('hogar')) {
        aiResponse = '¡Excelente nicho! Para productos del hogar como Humidificadores, sugiero la paleta "Luxury Gold" o "Nordic Clean". Transmiten pulcritud y bienestar. He generado directrices de tono basadas en "Bienestar Premium". ¿Te gustaría revisar la paleta de colores sugerida o prefieres definir la tipografía ahora?';
      } else {
        aiResponse = '¡Entendido! Basado en esa propuesta, sugiero un tono de voz "Empático y Educativo". Esto baja las barreras de desconfianza en compras online. He actualizado el borrador del Manual de Marca con estas directrices. ¡Haz clic en la sección de Manual para ver los cambios!';
      }

      setChatMessages(prev => [...prev, { id: `ai-${Date.now()}`, role: 'assistant', text: aiResponse }]);
      setIsTyping(false);
    }, 1500);
  };

  const handleChatFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newAttachments = (Array.from(files) as File[]).map(file => {
      let type: 'image' | 'video' | 'pdf' = 'image';
      if (file.type.includes('pdf')) type = 'pdf';
      else if (file.type.includes('video') || file.name.endsWith('.mp4') || file.name.endsWith('.mov')) type = 'video';

      return {
        name: file.name,
        type: type,
        size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        previewUrl: type === 'image' ? URL.createObjectURL(file) : undefined
      };
    });

    setChatAttachments(prev => [...prev, ...newAttachments]);
  };

  const startRecordingAudio = () => {
    setIsRecording(true);
    setRecordingSeconds(0);
    const interval = setInterval(() => {
      setRecordingSeconds(prev => prev + 1);
    }, 1000);
    setRecordingIntervalId(interval);
  };

  const stopAndSendAudio = () => {
    if (recordingIntervalId) {
      clearInterval(recordingIntervalId);
      setRecordingIntervalId(null);
    }
    setIsRecording(false);

    const minutes = Math.floor(recordingSeconds / 60);
    const secs = recordingSeconds % 60;
    const durationStr = `${minutes}:${secs < 10 ? '0' : ''}${secs}`;

    const newMsgId = `audio-${Date.now()}`;
    const newMsg: ChatMessage = {
      id: newMsgId,
      role: 'user',
      text: 'Nota de voz de marca',
      isAudio: true,
      audioDuration: durationStr === '0:00' ? '0:05' : durationStr
    };

    setChatMessages(prev => [...prev, newMsg]);
    setIsTyping(true);

    setTimeout(() => {
      const responses = [
        "He escuchado tu nota de voz. Tienes una visión muy clara del proyecto. Basado en el tono conversacional y la pasión que transmites, sugiero un estilo de marca 'Dinámico y Cercano'. He añadido nuevas recomendaciones estéticas a tu manual de marca.",
        "¡Qué gran idea! He analizado tu mensaje de voz sobre la visión del negocio. Recomiendo una paleta de colores moderna con contrastes vibrantes para llamar la atención. Ya puedes ver las sugerencias de logos de forma dinámica.",
        "Excelente descripción hablada de tu cliente ideal. He adaptado la propuesta de valor para que se dirija directamente a los dolores cotidianos descritos en tu audio. ¡Revisa el Manual de Marca!"
      ];
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      setChatMessages(prev => [...prev, { id: `ai-${Date.now()}`, role: 'assistant', text: randomResponse }]);
      setIsTyping(false);
    }, 1500);
  };

  const cancelRecordingAudio = () => {
    if (recordingIntervalId) {
      clearInterval(recordingIntervalId);
      setRecordingIntervalId(null);
    }
    setIsRecording(false);
    setRecordingSeconds(0);
  };

  const handleTogglePlayAudio = (msgId: string) => {
    if (playingAudioId === msgId) {
      setPlayingAudioId(null);
    } else {
      setPlayingAudioId(msgId);
      let progress = audioPlaybackProgress[msgId] || 0;
      if (progress >= 100) progress = 0;

      const interval = setInterval(() => {
        progress += 4;
        setAudioPlaybackProgress(prev => ({ ...prev, [msgId]: progress }));

        if (progress >= 100) {
          clearInterval(interval);
          setPlayingAudioId(null);
        }
      }, 150);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);
    
    // Simula barra de progreso real
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      setUploadProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        setIsUploading(false);
        
        let type: 'image' | 'pdf' | 'video' = 'image';
        if (file.type.includes('pdf')) type = 'pdf';
        else if (file.type.includes('video') || file.name.endsWith('.mp4') || file.name.endsWith('.mov')) type = 'video';
        
        setUploadedFile({
          name: file.name,
          type: type,
          size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
          preview: type === 'image' ? URL.createObjectURL(file) : undefined
        });
      }
    }, 80);
  };

  const handleOptimizePrompt = (e: React.FormEvent) => {
    e.preventDefault();
    setIsOptimizing(true);
    setOptimizeStep(0);
    setOptimizeLogs([]);

    const steps = [
      `🔍 Analizando parámetros de entrada [Modo: ${creationMode === 'scratch' ? 'Crear desde Cero' : creationMode === 'improve' ? 'Mejorar Marca' : 'Replicar Competidor'}]...`,
      uploadedFile ? `📄 Procesando archivo adjunto multimedia: ${uploadedFile.name} (${uploadedFile.type.toUpperCase()})` : `✍️ Extrayendo contexto textual provisto...`,
      competitorUrl ? `🌐 Escaneando página web y meta-tags del competidor: ${competitorUrl}...` : `🎯 Identificando arquetipos de marca de alta conversión...`,
      `🧠 Optimizando el Prompt maestro con algoritmos avanzados de Branding & Posicionamiento...`,
      `🎨 Formulando paleta de colores sugerida y manual de identidad visual...`,
      `✅ ¡Identidad generada con éxito!`
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      setOptimizeLogs(prev => [...prev, steps[currentStep]]);
      currentStep++;
      setOptimizeStep(currentStep);

      if (currentStep >= steps.length) {
        clearInterval(interval);
        setIsOptimizing(false);
        setHasOptimized(true);

        // Generar contenido específico según los parámetros provistos
        if (creationMode === 'scratch') {
          const prod = scratchProductName.trim() || 'Producto Innovador';
          const aud = scratchAudience.trim() || 'Público General';
          const calculatedBrandName = prod.split(' ')[0] + ' Vibe';
          setResultBrandName(calculatedBrandName);
          setResultSlogan('Simplifica tu vida, eleva tu estilo.');
          setResultValueProp(`${prod} diseñado con tecnología ergonómica premium para resolver los dolores cotidianos de ${aud}, elevando su calidad de vida.`);
          setResultTone('Fresco, moderno y sumamente confiable. Nos enfocamos en el diseño y en la practicidad diaria.');
          setResultMission(`Ayudar a ${aud} a vivir de forma más inteligente y sofisticada mediante soluciones prácticas y de alta estética.`);
          
          let colors = ['#0F172A', '#1E293B', '#F59E0B', '#F8FAFC']; // Slate & Amber
          if (scratchNiche === 'belleza') colors = ['#2E151B', '#E86F80', '#F3B0C3', '#FFF5F6'];
          else if (scratchNiche === 'tecnologia') colors = ['#030712', '#1F2937', '#3B82F6', '#F9FAFB'];
          else if (scratchNiche === 'salud') colors = ['#062425', '#10B981', '#34D399', '#F0FDF4'];
          else if (scratchNiche === 'moda') colors = ['#1C1917', '#78716C', '#D6D3D1', '#FAFAF9'];
          setResultColors(colors);

          setResultPrompt(`[PROMPT MAESTRO DE MARCA: NUEVO INICIO]
Actúa como un experto consultor de Branding de nivel mundial.
Crea la identidad de marca para "${calculatedBrandName}" enfocada en "${prod}".
- Audiencia Clave: ${aud}.
- Valores Nucleares: Diseño minimalista, durabilidad premium y funcionalidad superior.
- Vibe Estético: Colores modernos (${colors.join(', ')}), tipografía limpia, encuadres fotográficos directos tipo Pinterest.
- Tono de Voz: Amistoso pero experto, directo a los beneficios emocionales.
- Gancho Publicitario: "No es solo un producto, es el estándar de lo que mereces."
Utiliza este Prompt para redactar cartas de venta, descripciones en Shopify y guiones UGC de forma 100% cohesionada.`);
        } 
        
        else if (creationMode === 'improve') {
          const brand = improveBrandName.trim() || 'Mi Marca';
          const calculatedBrandName = `${brand} Premium`;
          setResultBrandName(calculatedBrandName);
          setResultSlogan('Evolución consciente, impacto extraordinario.');
          setResultValueProp(`La versión premium optimizada de ${brand}, ahora con empaques biodegradables y fórmulas de grado dermatológico para máxima efectividad.`);
          setResultTone('Sofisticado, premium, transparente y altamente profesional.');
          setResultMission(`Elevar la propuesta de valor de ${brand} para competir en mercados internacionales de alta gama, garantizando sustentabilidad y excelencia.`);
          const colors = ['#111827', '#4B5563', '#D4AF37', '#F9FAFB']; // Charcoal & Gold
          setResultColors(colors);

          setResultPrompt(`[PROMPT MAESTRO DE BRANDING: MEJORA RADICAL]
Actúa como Director General de Creatividad. Vamos a elevar la marca "${brand}" al nivel "Pro / Premium".
- Estrategia de Rediseño: Conservar el espíritu fundador pero inyectar un contraste lujoso usando dorados y carbón pulido (${colors.join(', ')}).
- Propuesta de Valor Elevada: Enfocada en la sofisticación y el rendimiento superior certificado.
- Tono Re-estructurado: Menos genérico, más autoritario y centrado en la exclusividad.
- Directriz Visual: Sombras suaves, fondos oscuros de estudio y tipografía serif elegante.
Optimiza todos los copies para que transmitan un estatus premium inconfundible.`);
        } 
        
        else { // Competitor mode
          const comp = competitorUrl.trim() || 'marca-competidora.com';
          const domainName = comp.replace('https://', '').replace('http://', '').split('.')[0];
          const friendlyComp = domainName ? (domainName.charAt(0).toUpperCase() + domainName.slice(1)) : 'Competidor';
          const calculatedBrandName = `${friendlyComp} Fusion`;
          
          setResultBrandName(calculatedBrandName);
          setResultSlogan('Inspirado en los mejores, adaptado para ti.');
          setResultValueProp(`Replicamos la increíble estética y ganchos de conversión que hacen exitoso a ${friendlyComp}, pero con precios más accesibles y envíos rápidos locales.`);
          setResultTone('Vibrante, directo, centrado en el estilo de vida activo y muy dinámico.');
          setResultMission(`Democratizar el acceso a las tendencias globales impuestas por ${friendlyComp}, brindando una experiencia local superior con garantía total.`);
          const colors = ['#0B0F19', '#312E81', '#F43F5E', '#F9FAFB']; // Royal Blue & Rose
          setResultColors(colors);

          setResultPrompt(`[PROMPT MAESTRO DE BRANDING: REVERSED-ENGINEERED]
Actúa como un estratega de hacking de marca. Analizamos el éxito de "${friendlyComp}" (${comp}) y lo adaptamos para nuestro negocio local:
- Estética a Replicar: Fluidez, ganchos visuales rápidos y un enfoque en el "unboxing" perfecto.
- Adaptación Competitiva: Tomamos su paleta moderna y tipografía llamativa y creamos una propuesta local con el nombre "${friendlyComp} Fusion".
- Tono de Voz: Súper enérgico, juvenil y libre de fricciones.
- Combinación de Colores Sugerida: ${colors.join(', ')}.
Usa esta directriz para ganarle mercado a la competencia tradicional con copys un 30% más emocionales y ganchos directos al beneficio inmediato.`);
        }
      }
    }, 600);
  };

  const handleApplyBranding = () => {
    // Set manual states
    setMission(resultMission);
    setTone(resultTone);
    setValueProp(resultValueProp);
    
    // Create new custom palette
    const newPalette = {
      name: `✨ ${resultBrandName} (Generada)`,
      colors: resultColors,
      tags: ['Personalizada', 'IA Optimizada', 'Conversión']
    };
    
    // Add to palette list and select it
    setPalettesState(prev => [newPalette, ...prev]);
    setSelectedPaletteIdx(0);

    // Update logos list to match new brand name
    setLogos([
      { id: `logo-custom-1`, name: `${resultBrandName} Main`, style: 'Modern Icon', icon: '✨', color: resultColors[2] || '#D4AF37', bg: resultColors[0] || '#000000' },
      { id: `logo-custom-2`, name: `${resultBrandName} Dark`, style: 'Creative Badge', icon: '⚡', color: resultColors[3] || '#FFFFFF', bg: resultColors[1] || '#1A1A1A' }
    ]);
    setNewLogoName(resultBrandName);
    
    setHasOptimized(false);
    alert(`¡Identidad de Marca "${resultBrandName}" aplicada con éxito!\n\n1. Se actualizó el Manual de Marca.\n2. Se creó y seleccionó tu nueva paleta de colores.\n3. Ya puedes descargar los recursos en la pestaña "Logos & Recursos".`);
  };

  const handleCopyColor = (color: string) => {
    navigator.clipboard.writeText(color);
    setCopiedColor(color);
    setTimeout(() => setCopiedColor(null), 2000);
  };

  const handleGenerateLogo = () => {
    if (!newLogoName.trim()) return;
    setGeneratingLogo(true);
    setTimeout(() => {
      setLogos(prev => [
        {
          id: `logo-${Date.now()}`,
          name: `${newLogoName} ${selectedLogoIcon === '☁️' ? 'Aero' : 'Sphere'}`,
          style: 'Elegant Typography',
          icon: selectedLogoIcon,
          color: activePalette.colors[2],
          bg: activePalette.colors[0]
        },
        ...prev
      ]);
      setGeneratingLogo(false);
    }, 1500);
  };


  return (
    <div className="animate-fade-in space-y-6 text-gray-200">
      
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-gray-800 pb-4">
        <div className="w-12 h-12 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center text-gold">
          <Bot size={22} />
        </div>
        <div>
          <h2 className="text-2xl font-display font-bold text-white">Branding & Identidad de Marca</h2>
          <p className="text-xs text-gray-500 uppercase tracking-widest mt-0.5">Define la estética, colores, logos y directrices de comunicación de tu tienda</p>
        </div>
      </div>

      {/* Render sub-tabs */}
      {activeTab === 'entrevista' && (
        <div className="space-y-6 animate-fade-in text-left">
          {/* Dual Toggle Sub-Tabs */}
          <div className="flex flex-wrap gap-2.5 bg-black/40 p-1.5 rounded-2xl border border-gray-900 w-fit">
            <button
              onClick={() => setBrandingSubTab('optimizer')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 border ${
                brandingSubTab === 'optimizer'
                  ? 'bg-gold/15 text-gold border-gold/30 shadow-[0_0_15px_rgba(212,175,55,0.08)]'
                  : 'bg-transparent text-gray-400 border-transparent hover:text-white'
              }`}
            >
              <Sparkles size={14} className="text-gold" /> ✨ Optimizador de Prompts & ADN de Marca
            </button>
            <button
              onClick={() => setBrandingSubTab('chat')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 border ${
                brandingSubTab === 'chat'
                  ? 'bg-gold/15 text-gold border-gold/30 shadow-[0_0_15px_rgba(212,175,55,0.08)]'
                  : 'bg-transparent text-gray-400 border-transparent hover:text-white'
              }`}
            >
              <Bot size={14} /> 💬 Chatear con Brand Strategist
            </button>
          </div>

          {brandingSubTab === 'optimizer' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* PANEL IZQUIERDO: CONFIGURADOR MULTIMEDIA */}
              <div className="lg:col-span-7 space-y-5">
                <div className="panel p-6 rounded-2xl bg-[#0b0b0b] border border-gray-800 space-y-5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gold/5 rounded-full blur-3xl pointer-events-none"></div>
                  
                  <div>
                    <span className="text-[10px] bg-gold/10 text-gold border border-gold/20 px-2 py-0.5 rounded-md font-bold uppercase tracking-widest font-mono">
                      Configuración Inicial
                    </span>
                    <h3 className="text-base font-black text-white mt-1.5">🚀 ¿Cómo quieres crear tu identidad de marca?</h3>
                    <p className="text-xs text-gray-400">Selecciona el origen para que nuestra IA estructure tus directrices, paleta de colores y prompt optimizado.</p>
                  </div>

                  {/* Selector de Modo */}
                  <div className="grid grid-cols-3 gap-2 bg-black/60 p-1.5 rounded-xl border border-gray-900">
                    <button
                      type="button"
                      onClick={() => { setCreationMode('scratch'); setHasOptimized(false); }}
                      className={`py-2.5 px-2 rounded-lg text-xs font-black uppercase transition-all tracking-wider ${
                        creationMode === 'scratch' ? 'bg-gold text-black shadow-lg font-black' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Desde Cero
                    </button>
                    <button
                      type="button"
                      onClick={() => { setCreationMode('improve'); setHasOptimized(false); }}
                      className={`py-2.5 px-2 rounded-lg text-xs font-black uppercase transition-all tracking-wider ${
                        creationMode === 'improve' ? 'bg-gold text-black shadow-lg font-black' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Mejorar Marca
                    </button>
                    <button
                      type="button"
                      onClick={() => { setCreationMode('competitor'); setHasOptimized(false); }}
                      className={`py-2.5 px-2 rounded-lg text-xs font-black uppercase transition-all tracking-wider ${
                        creationMode === 'competitor' ? 'bg-gold text-black shadow-lg font-black' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Copiar Rival
                    </button>
                  </div>

                  {/* Campos Dinámicos según Modo */}
                  <div className="space-y-4 pt-1">
                    {creationMode === 'scratch' && (
                      <div className="space-y-4 animate-fade-in">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-300 block">¿Qué producto o servicio vas a vender?</label>
                          <input
                            type="text"
                            value={scratchProductName}
                            onChange={(e) => setScratchProductName(e.target.value)}
                            placeholder="ej. Café orgánico con adaptógenos melena de león"
                            className="w-full bg-black border border-gray-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-gold font-medium"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-300 block">¿Quién es tu cliente o público ideal?</label>
                          <input
                            type="text"
                            value={scratchAudience}
                            onChange={(e) => setScratchAudience(e.target.value)}
                            placeholder="ej. Profesionales remotos staneados y emprendedores con ansiedad"
                            className="w-full bg-black border border-gray-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-gold font-medium"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-300 block">Nicho o Estética de Mercado</label>
                          <select
                            value={scratchNiche}
                            onChange={(e) => setScratchNiche(e.target.value)}
                            className="w-full bg-black border border-gray-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-gold font-medium cursor-pointer"
                          >
                            <option value="hogar">Hogar & Confort Acogedor 🏠</option>
                            <option value="tecnologia">Tecnología, Hardware & SaaS Moderno ⚡</option>
                            <option value="belleza">Belleza Orgánica, Cosmética & Skincare 💄</option>
                            <option value="salud">Salud, Enfoque Mental & Bienestar 🌿</option>
                            <option value="moda">Moda Urbana, Accesorios & Lujo Minimalista 👜</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {creationMode === 'improve' && (
                      <div className="space-y-4 animate-fade-in">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-300 block">Nombre de tu Marca Existente</label>
                          <input
                            type="text"
                            value={improveBrandName}
                            onChange={(e) => setImproveBrandName(e.target.value)}
                            placeholder="ej. EcoGlow Cosmética"
                            className="w-full bg-black border border-gray-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-gold font-medium"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-300 block">¿En qué área necesitas la optimización principal?</label>
                          <select
                            value={improveFocus}
                            onChange={(e) => setImproveFocus(e.target.value)}
                            className="w-full bg-black border border-gray-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-gold font-medium cursor-pointer"
                          >
                            <option value="todo">Re-Branding Completo (Colores, Voz, Prompt)</option>
                            <option value="colors">Redefinir Paleta de Colores y Estilo Visual</option>
                            <option value="tone">Refinar Tono de Comunicación y Copys</option>
                            <option value="value">Establecer Propuesta de Valor Diferencial (USP)</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {creationMode === 'competitor' && (
                      <div className="space-y-4 animate-fade-in">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-300 block">Pega la URL del Competidor a Analizar</label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-3.5 text-gray-500 text-xs">
                              <Globe size={14} />
                            </span>
                            <input
                              type="text"
                              value={competitorUrl}
                              onChange={(e) => setCompetitorUrl(e.target.value)}
                              placeholder="ej. https://www.waterdrop.com"
                              className="w-full bg-black border border-gray-800 rounded-xl pl-10 pr-4 py-3 text-xs text-white focus:outline-none focus:border-gold font-medium"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-300 block">¿Qué te gustaría replicar o mejorar de ellos?</label>
                          <input
                            type="text"
                            value={competitorAesthetic}
                            onChange={(e) => setCompetitorAesthetic(e.target.value)}
                            placeholder="ej. Sus colores enérgicos y su enfoque sustentable para jóvenes"
                            className="w-full bg-black border border-gray-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-gold font-medium"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* CARGADOR MULTIMEDIA UNIVERSAL */}
                  <div className="space-y-2 pt-2 border-t border-gray-900">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                        <Upload size={14} className="text-gold" /> Cargar Material de Marca <span className="text-gray-500 font-normal">(Imagen, PDF, Video)</span>
                      </label>
                    </div>
                    
                    <div className="border border-dashed border-gray-800 rounded-xl p-4 bg-black/45 hover:bg-black/75 transition relative text-center min-h-[110px] flex flex-col justify-center items-center">
                      <input
                        type="file"
                        accept="image/*,application/pdf,video/*"
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      {isUploading ? (
                        <div className="w-full space-y-2 animate-pulse relative z-10">
                          <RefreshCw className="animate-spin text-gold mx-auto" size={20} />
                          <p className="text-[10px] text-gray-400 font-bold">Subiendo y analizando archivo...</p>
                          <div className="w-full bg-gray-900 rounded-full h-1.5 overflow-hidden max-w-xs mx-auto">
                            <div className="bg-gold h-1.5 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                          </div>
                        </div>
                      ) : uploadedFile ? (
                        <div className="flex items-center gap-3 text-left w-full animate-fade-in relative z-10 p-2.5 bg-[#121212] rounded-xl border border-gray-800">
                          {uploadedFile.type === 'image' && uploadedFile.preview && (
                            <img src={uploadedFile.preview} alt="Vista previa" className="w-12 h-12 object-cover rounded border border-gray-800" />
                          )}
                          {uploadedFile.type === 'pdf' && (
                            <div className="w-12 h-12 rounded bg-red-950/40 border border-red-900/40 flex items-center justify-center text-red-400">
                              <FileText size={20} />
                            </div>
                          )}
                          {uploadedFile.type === 'video' && (
                            <div className="w-12 h-12 rounded bg-cyan-950/40 border border-cyan-900/40 flex items-center justify-center text-cyan-400">
                              <Video size={20} />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <span className="text-[8px] bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                              {uploadedFile.type.toUpperCase()} CARGADO
                            </span>
                            <p className="text-xs text-white font-bold truncate mt-1">{uploadedFile.name}</p>
                            <p className="text-[10px] text-gray-500 font-mono">{uploadedFile.size}</p>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setUploadedFile(null);
                            }}
                            className="text-red-400 hover:text-red-300 text-xs font-bold p-1.5 hover:bg-red-950/20 rounded-lg transition"
                          >
                            Eliminar
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <Upload className="text-gray-500 mx-auto" size={24} />
                          <p className="text-xs text-gray-300 font-bold">Arrastra o haz clic para cargar archivos</p>
                          <p className="text-[9px] text-gray-500">Soporta: Logo/Mockup, Directrices en PDF, o Videos Publicitarios</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Notas Adicionales */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-300 block">Indicaciones o Directrices Extra <span className="text-gray-500 font-normal">(Opcional)</span></label>
                    <textarea
                      value={extraBrandNotes}
                      onChange={(e) => setExtraBrandNotes(e.target.value)}
                      placeholder="ej. Quiero que sea elegante pero accesible, usar palabras directas y evitar lenguaje técnico aburrido."
                      className="w-full h-20 bg-black border border-gray-800 rounded-xl p-3.5 text-xs text-white focus:outline-none focus:border-gold font-medium resize-none"
                    />
                  </div>

                  {/* CTA BUTTON */}
                  <button
                    type="button"
                    onClick={handleOptimizePrompt}
                    disabled={isOptimizing}
                    className="w-full py-4 bg-gradient-to-r from-gold to-yellow-500 text-black font-black text-xs uppercase tracking-widest rounded-xl hover:from-yellow-400 hover:to-gold transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                  >
                    {isOptimizing ? (
                      <>
                        <RefreshCw className="animate-spin" size={14} />
                        Optimizando Identidad de Marca...
                      </>
                    ) : (
                      <>
                        <Sparkles size={14} />
                        Optimizar Prompt y Crear Identidad ✨
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* PANEL DERECHO: CONTEXTO GENERADO & PROMPT MAESTRO */}
              <div className="lg:col-span-5 h-full">
                
                {/* 1. CARGANDO */}
                {isOptimizing && (
                  <div className="panel p-6 rounded-2xl bg-[#090909] border border-gray-800 space-y-4 animate-pulse text-left h-full min-h-[450px] flex flex-col justify-center">
                    <RefreshCw className="animate-spin text-gold mx-auto" size={32} />
                    <h3 className="text-sm font-bold text-white text-center uppercase tracking-wider">
                      Procesando con Inteligencia Artificial Multimodal
                    </h3>
                    
                    <div className="space-y-2 bg-black/80 border border-gray-900 p-4 rounded-xl font-mono text-[10px] text-gray-400 leading-relaxed max-w-sm mx-auto w-full">
                      {optimizeLogs.map((log, i) => (
                        <p key={i} className="animate-fade-in text-gold">
                          {log}
                        </p>
                      ))}
                      <p className="animate-pulse text-gray-600">⌛ Ejecutando síntesis...</p>
                    </div>
                  </div>
                )}

                {/* 2. ESTADO INICIAL (VACÍO) */}
                {!isOptimizing && !hasOptimized && (
                  <div className="panel p-8 rounded-2xl bg-[#0a0a0a] border border-gray-800 text-center space-y-4 flex flex-col justify-center items-center min-h-[480px]">
                    <div className="w-16 h-16 rounded-3xl bg-gold/5 border border-gold/10 flex items-center justify-center text-gold relative">
                      <Sparkles size={28} className="animate-pulse" />
                    </div>
                    <div>
                      <h3 className="font-black text-white text-sm uppercase tracking-wider">Esperando Configuración</h3>
                      <p className="text-xs text-gray-500 mt-2 max-w-xs leading-relaxed">
                        Completa los campos a la izquierda y sube tus recursos multimedia (si tienes). Nuestra IA creará una identidad perfecta y actualizará tu manual de forma automatizada.
                      </p>
                    </div>

                    <div className="bg-black/40 border border-gray-900 rounded-xl p-3.5 w-full max-w-xs text-[10px] text-gray-400 flex items-start gap-2 text-left leading-relaxed">
                      <AlertCircle size={14} className="text-gold shrink-0 mt-0.5" />
                      <span>
                        <strong>Tip:</strong> Si no tienes fotos o enlaces, ¡no te preocupes! Presiona el botón directamente para usar nuestros presets inteligentes optimizados para dropshipping.
                      </span>
                    </div>
                  </div>
                )}

                {/* 3. RESULTADOS GENERADOS */}
                {!isOptimizing && hasOptimized && (
                  <div className="space-y-4 animate-fade-in text-left">
                    <div className="panel p-5 rounded-2xl bg-[#0c0c0c] border border-gray-800 space-y-4">
                      
                      <div className="flex items-center gap-2 border-b border-gray-900 pb-3">
                        <CheckCircle size={18} className="text-emerald-500" />
                        <div>
                          <h3 className="font-bold text-white text-sm uppercase tracking-wider">¡Identidad de Marca Lista!</h3>
                          <p className="text-[10px] text-gray-500">Se extrajo el ADN y se formuló el Prompt Maestro.</p>
                        </div>
                      </div>

                      {/* PROMPT MAESTRO COPY BOX */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] text-gold font-bold uppercase tracking-wider block font-mono">
                          🔥 Prompt de Posicionamiento Optimizado
                        </span>
                        
                        <div className="relative">
                          <textarea
                            readOnly
                            value={resultPrompt}
                            className="w-full h-32 bg-black border border-gray-800 rounded-xl p-3 text-[10px] font-mono text-gray-300 focus:outline-none leading-relaxed select-all"
                          />
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(resultPrompt);
                              alert('¡Prompt Maestro de Marca copiado al portapapeles!');
                            }}
                            className="absolute bottom-2.5 right-2.5 bg-gold/10 hover:bg-gold hover:text-black border border-gold/20 text-gold hover:border-transparent text-[9px] font-bold px-2 py-1 rounded transition flex items-center gap-1"
                          >
                            <Copy size={10} /> Copiar Prompt
                          </button>
                        </div>
                        <p className="text-[9px] text-gray-500 leading-relaxed mt-1">
                          Este prompt encapsula el ADN estético, público y estilo de voz. Úsalo con generadores de fotos/copys para mantener coherencia absoluta en tu tienda.
                        </p>
                      </div>

                      {/* FICHA TÉCNICA EXTRACTADA */}
                      <div className="space-y-3.5 pt-2 border-t border-gray-900 text-xs">
                        <h4 className="font-bold text-white text-xs uppercase tracking-wider">Ficha Técnica Extractada</h4>
                        
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div className="bg-black/50 p-2.5 rounded-lg border border-gray-900">
                            <span className="text-[9px] text-gray-500 font-bold block">LOGOTIPO / NOMBRE:</span>
                            <span className="text-white font-bold">{resultBrandName}</span>
                          </div>
                          <div className="bg-black/50 p-2.5 rounded-lg border border-gray-900">
                            <span className="text-[9px] text-gray-500 font-bold block">ESLOGAN RECOMENDADO:</span>
                            <span className="text-gold font-medium italic">"{resultSlogan}"</span>
                          </div>
                        </div>

                        <div className="bg-black/50 p-3 rounded-lg border border-gray-900">
                          <span className="text-[9px] text-gray-500 font-bold block mb-1">PROPUESTA ÚNICA DE VALOR (USP):</span>
                          <p className="text-[11px] text-gray-300 leading-relaxed font-medium">{resultValueProp}</p>
                        </div>

                        <div className="bg-black/50 p-3 rounded-lg border border-gray-900">
                          <span className="text-[9px] text-gray-500 font-bold block mb-1">TONO DE VOZ EXTRAÍDO:</span>
                          <p className="text-[11px] text-gray-300 leading-relaxed font-medium">{resultTone}</p>
                        </div>

                        {/* Paleta Generada */}
                        <div className="bg-black/50 p-3 rounded-lg border border-gray-900">
                          <span className="text-[9px] text-gray-500 font-bold block mb-2">PALETA DE COLORES PROPUESTA:</span>
                          <div className="flex gap-2">
                            {resultColors.map((color, i) => (
                              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                <span className="w-full h-6 rounded-md border border-black/30 block" style={{ backgroundColor: color }} />
                                <span className="text-[8px] font-mono text-gray-400 font-bold">{color}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* SYSTEM SYNC CTA */}
                      <button
                        type="button"
                        onClick={handleApplyBranding}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-1.5 shadow-md"
                      >
                        <Check size={14} /> Aplicar Directrices al Workspace 🚀
                      </button>
                      <p className="text-[9px] text-gray-500 text-center leading-normal">
                        Al aplicar, se actualizarán las pestañas de "Identidad Visual", "Manual de Marca" y se generará tu kit de logotipos en alta resolución.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* EL ORIGINAL CHAT CON Brand Strategist */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in text-left">
              <div className="lg:col-span-2 space-y-6">
                <div className="panel p-0 rounded-2xl overflow-hidden flex flex-col h-[480px] bg-black border border-gray-800">
                  <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gray-950/80">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-gold animate-pulse"></div>
                      <span className="text-sm font-semibold text-gray-200">Entrevista de Marca con IA</span>
                    </div>
                    <span className="text-[10px] bg-gold/10 text-gold border border-gold/20 px-2 py-0.5 rounded font-mono font-bold">
                      Expert Brand Strategist
                    </span>
                  </div>

                  {/* Chat messages */}
                  <div className="flex-1 p-5 space-y-4 overflow-y-auto bg-[#050505] scrollbar-none">
                    {chatMessages.map((msg, idx) => (
                      <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                        <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed ${
                          msg.role === 'user' 
                            ? 'bg-gold text-black rounded-tr-none font-medium shadow-lg' 
                            : 'bg-[#121212] border border-gray-800/80 text-gray-200 rounded-tl-none'
                        }`}>
                          {msg.isAudio ? (
                            <div className="flex flex-col gap-2 min-w-[240px]">
                              <div className={`flex items-center gap-2.5 p-2 rounded-xl border ${
                                msg.role === 'user'
                                  ? 'bg-amber-950/20 border-black/15'
                                  : 'bg-black/40 border-gray-800'
                              }`}>
                                <button
                                  type="button"
                                  onClick={() => handleTogglePlayAudio(msg.id)}
                                  className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition ${
                                    msg.role === 'user'
                                      ? 'bg-black text-gold hover:bg-gray-900'
                                      : 'bg-gold hover:bg-yellow-400 text-black'
                                  }`}
                                >
                                  {playingAudioId === msg.id ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
                                </button>
                                <div className="flex-1 space-y-0.5 min-w-0">
                                  <span className={`text-[10px] font-mono font-bold block ${
                                    msg.role === 'user' ? 'text-amber-950/80' : 'text-gray-400'
                                  }`}>
                                    Nota de voz • {msg.audioDuration}
                                  </span>
                                  <div className="relative w-full h-1.5 bg-black/20 rounded-full overflow-hidden">
                                    <div 
                                      className={`absolute top-0 left-0 h-1.5 rounded-full transition-all duration-155 ${
                                        msg.role === 'user' ? 'bg-black' : 'bg-gold'
                                      }`}
                                      style={{ width: `${audioPlaybackProgress[msg.id] || 0}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                              <p className={`text-xs italic ${msg.role === 'user' ? 'text-amber-950/80 font-bold' : 'text-gray-400'}`}>
                                "{msg.text}"
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {msg.text && <p className="leading-relaxed">{msg.text}</p>}
                              {msg.attachments && msg.attachments.length > 0 && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 pt-2 border-t border-black/10">
                                  {msg.attachments.map((file, fIdx) => (
                                    <div key={fIdx} className={`p-2 rounded-xl flex items-center gap-2.5 max-w-[240px] border ${
                                      msg.role === 'user'
                                        ? 'bg-amber-950/10 border-black/10 text-black'
                                        : 'bg-black/40 border-gray-800 text-white'
                                    }`}>
                                      {file.type === 'image' && file.previewUrl ? (
                                        <img src={file.previewUrl} alt={file.name} className="w-10 h-10 object-cover rounded border border-black/10 shrink-0" />
                                      ) : file.type === 'pdf' ? (
                                        <div className={`w-10 h-10 rounded flex items-center justify-center shrink-0 ${
                                          msg.role === 'user' ? 'bg-amber-950/20 text-amber-950' : 'bg-red-950/40 text-red-400 border border-red-900/40'
                                        }`}>
                                          <FileText size={18} />
                                        </div>
                                      ) : (
                                        <div className={`w-10 h-10 rounded flex items-center justify-center shrink-0 ${
                                          msg.role === 'user' ? 'bg-amber-950/20 text-amber-950' : 'bg-cyan-950/40 text-cyan-400 border border-cyan-900/40'
                                        }`}>
                                          <Video size={18} />
                                        </div>
                                      )}
                                      <div className="min-w-0 flex-1">
                                        <p className="text-[11px] font-bold truncate">{file.name}</p>
                                        <p className={`text-[9px] font-mono ${msg.role === 'user' ? 'text-amber-950/70' : 'text-gray-500'}`}>
                                          {file.size}
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {isTyping && (
                      <div className="flex justify-start">
                        <div className="bg-[#121212] border border-gray-800/80 text-gray-400 p-4 rounded-2xl rounded-tl-none text-xs flex items-center gap-2">
                          <RefreshCw className="animate-spin text-gold" size={12} />
                          <span>AI Brand Strategist está estructurando ideas estéticas...</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Pending attachments preview */}
                  {chatAttachments.length > 0 && (
                    <div className="px-4 py-2 border-t border-gray-800 bg-gray-950/40 flex flex-wrap gap-2">
                      {chatAttachments.map((file, idx) => (
                        <div key={idx} className="bg-[#121212] border border-gray-800/80 px-2.5 py-1.5 rounded-xl flex items-center gap-2 max-w-[200px]">
                          {file.type === 'image' && file.previewUrl ? (
                            <img src={file.previewUrl} alt="prev" className="w-6 h-6 object-cover rounded animate-fade-in" />
                          ) : file.type === 'pdf' ? (
                            <FileText size={14} className="text-red-400 font-bold" />
                          ) : (
                            <Video size={14} className="text-cyan-400 font-bold" />
                          )}
                          <span className="text-[10px] text-gray-300 font-bold truncate max-w-[100px]">{file.name}</span>
                          <button
                            type="button"
                            onClick={() => setChatAttachments(prev => prev.filter((_, i) => i !== idx))}
                            className="text-gray-500 hover:text-white transition p-0.5"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Form Input / Recording Controls */}
                  <div className="p-4 border-t border-gray-800 bg-gray-950/60">
                    {isRecording ? (
                      /* Audio Recording Active UI */
                      <div className="flex items-center justify-between gap-4 py-2 px-3 bg-red-950/15 border border-red-900/30 rounded-xl animate-pulse">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full bg-red-500 animate-ping"></div>
                          <span className="text-xs text-red-400 font-black uppercase tracking-wider font-mono">
                            Grabando Nota de Voz de Marca...
                          </span>
                          <span className="text-sm font-mono text-white font-bold">
                            {Math.floor(recordingSeconds / 60)}:{(recordingSeconds % 60) < 10 ? '0' : ''}{recordingSeconds % 60}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={cancelRecordingAudio}
                            className="bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 border border-gray-800"
                          >
                            <Trash2 size={12} className="text-red-400" /> Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={stopAndSendAudio}
                            className="bg-gold hover:bg-yellow-400 text-black px-4 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1"
                          >
                            <Send size={12} /> Enviar Nota
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Standard Input UI */
                      <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
                        {/* Attachment button */}
                        <label className="bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white p-2.5 rounded-xl cursor-pointer transition flex items-center justify-center shrink-0 border border-gray-800">
                          <Paperclip size={16} />
                          <input
                            type="file"
                            multiple
                            accept="image/*,application/pdf,video/*"
                            onChange={handleChatFileChange}
                            className="hidden"
                          />
                        </label>

                        <input
                          type="text"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          placeholder={chatAttachments.length > 0 ? "Añade un comentario sobre los archivos..." : "ej. Quiero vender humidificadores de lujo para jóvenes profesionales..."}
                          className="flex-1 bg-black border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-gold"
                        />

                        {/* Mic recording trigger button */}
                        <button
                          type="button"
                          onClick={startRecordingAudio}
                          title="Grabar nota de voz de marca"
                          className="bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-gold p-2.5 rounded-xl transition flex items-center justify-center shrink-0 border border-gray-800"
                        >
                          <Mic size={16} />
                        </button>

                        <button
                          type="submit"
                          className="bg-gold hover:bg-yellow-400 text-black p-2.5 rounded-xl transition flex items-center justify-center shrink-0 animate-pulse hover:animate-none"
                        >
                          <Send size={16} />
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="panel p-6 rounded-2xl bg-[#090909] border border-gray-800 space-y-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Sparkles size={14} className="text-gold" /> Estado de Identidad
                  </h3>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Nuestra IA analiza tus respuestas para refinar la paleta de colores, la tipografía recomendada y los copys de tu marca de manera inteligente.
                  </p>

                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">Público Objetivo definido</span>
                      <CheckCircle size={14} className="text-emerald-500" />
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">Paleta de colores sugerida</span>
                      <CheckCircle size={14} className="text-emerald-500" />
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">Manual de Comunicación</span>
                      <span className="text-[9px] bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded font-bold font-mono">EN CURSO</span>
                    </div>
                  </div>
                </div>

                <div className="panel p-6 rounded-2xl bg-gold/5 border border-gold/20 relative overflow-hidden">
                  <h4 className="font-bold text-gold text-xs flex items-center gap-1.5 uppercase tracking-wider">
                    💡 Tip de Branding
                  </h4>
                  <p className="text-xs text-gray-300 mt-2 leading-relaxed">
                    Las marcas con paletas oscuras de alto contraste (negros y dorados) tienen un 18% más de percepción de valor en el nicho de accesorios y tecnología para el hogar.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'identidad' && (
        <div className="space-y-6 animate-fade-in">
          {/* Palettes presets selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="panel p-6 rounded-2xl space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Palette className="text-gold" size={18} /> Selector de Paleta de Colores IA
              </h3>
              <p className="text-xs text-gray-400">
                Selecciona una de las combinaciones sugeridas por nuestro motor de branding. Haz clic en un color para copiar su código HEX.
              </p>

              <div className="space-y-3 pt-2">
                {palettesState.map((p, idx) => (
                  <div 
                    key={idx}
                    onClick={() => setSelectedPaletteIdx(idx)}
                    className={`p-3.5 rounded-xl border transition cursor-pointer flex flex-col gap-2 ${
                      selectedPaletteIdx === idx 
                        ? 'bg-gold/10 border-gold shadow-[0_0_15px_rgba(212,175,55,0.1)]' 
                        : 'bg-black/40 border-gray-800 hover:border-gray-700 hover:bg-black/60'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-white">{p.name}</span>
                      <div className="flex gap-1">
                        {p.tags.map((t, i) => (
                          <span key={i} className="text-[8px] bg-gray-950 text-gray-400 px-1.5 py-0.5 rounded font-bold">{t}</span>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex h-8 rounded-lg overflow-hidden border border-black/30">
                      {p.colors.map((c, i) => (
                        <div 
                          key={i} 
                          style={{ backgroundColor: c }} 
                          className="flex-1 hover:scale-105 transition"
                          title={`Copiar ${c}`}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Typography and active color details */}
            <div className="space-y-6">
              <div className="panel p-6 rounded-2xl space-y-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Type className="text-gold" size={18} /> Tipografía Recomendada
                </h3>
                <p className="text-xs text-gray-400">
                  La tipografía comunica el carácter de tu marca antes de que el usuario lea la primera palabra.
                </p>

                <div className="bg-black/50 border border-gray-800 rounded-xl p-5 space-y-3">
                  <div className="flex justify-between items-end">
                    <div>
                      <h4 className="text-2xl font-bold font-sans text-white">Plus Jakarta Sans</h4>
                      <p className="text-xs text-gray-500 mt-0.5">Tipografía para Títulos & Display</p>
                    </div>
                    <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-bold">ACTIVA</span>
                  </div>
                  <p className="text-sm font-sans italic text-gray-300">
                    "Redefiniendo el confort del hogar con tecnología de última generación."
                  </p>
                </div>

                <div className="bg-black/30 border border-gray-900 rounded-xl p-4 flex justify-between items-center text-xs">
                  <div>
                    <h5 className="font-semibold text-gray-300">Inter (Sans-Serif)</h5>
                    <p className="text-gray-500 text-[10px]">Cuerpo de texto & descripciones</p>
                  </div>
                  <span className="text-gray-500">Por defecto</span>
                </div>
              </div>

              {/* Hex copies */}
              <div className="panel p-5 rounded-2xl space-y-3">
                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest block">Códigos de Paleta Seleccionada</span>
                <div className="grid grid-cols-2 gap-2">
                  {activePalette.colors.map((color, i) => (
                    <button 
                      key={i}
                      onClick={() => handleCopyColor(color)}
                      className="p-2.5 rounded-lg bg-black/60 border border-gray-800 hover:border-gray-700 text-xs flex items-center justify-between text-left group transition"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-sm border border-black/20" style={{ backgroundColor: color }} />
                        <span className="font-mono font-bold text-gray-300 text-[11px]">{color}</span>
                      </div>
                      <Copy size={11} className="text-gray-500 group-hover:text-gold" />
                    </button>
                  ))}
                </div>
                {copiedColor && (
                  <p className="text-[10px] text-emerald-400 text-center font-bold">
                    ¡Copiado {copiedColor} al portapapeles!
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'manual' && (
        <div className="panel p-6 rounded-2xl space-y-6 animate-fade-in">
          <div className="flex justify-between items-center border-b border-gray-800 pb-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sliders className="text-gold" size={18} /> Manual de Tono & Misión de Marca
            </h3>
            <span className="text-[10px] bg-gold/10 text-gold border border-gold/20 px-2.5 py-1 rounded-full font-bold">
              Generado Inteligente por Copiloto AI
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Misión de Marca</label>
              <textarea 
                value={mission} 
                onChange={(e) => setMission(e.target.value)}
                className="w-full h-32 bg-black border border-gray-800 rounded-xl p-4 text-xs text-gray-300 focus:outline-none focus:border-gold leading-relaxed"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Tono de Comunicación</label>
              <textarea 
                value={tone} 
                onChange={(e) => setTone(e.target.value)}
                className="w-full h-32 bg-black border border-gray-800 rounded-xl p-4 text-xs text-gray-300 focus:outline-none focus:border-gold leading-relaxed"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Propuesta Única de Valor (USP)</label>
              <textarea 
                value={valueProp} 
                onChange={(e) => setValueProp(e.target.value)}
                className="w-full h-32 bg-black border border-gray-800 rounded-xl p-4 text-xs text-gray-300 focus:outline-none focus:border-gold leading-relaxed"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-gray-800 flex justify-end gap-3">
            <button 
              type="button"
              className="px-4 py-2 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-xs font-bold rounded-xl transition"
              onClick={() => {
                setMission('Democratizar el acceso a productos innovadores para el hogar, garantizando un servicio rápido y una estética de vanguardia.');
                setTone('Autoritario pero Accesible. Nos comunicamos de forma directa, educando al cliente y transmitiendo confianza absoluta.');
                setValueProp('Humidificadores de aire que transforman el ambiente del hogar en un santuario estético y saludable con tecnología de microdifusión ultrasónica.');
              }}
            >
              Restablecer Valores
            </button>
            <button 
              type="button"
              className="px-5 py-2 bg-gold text-black font-bold text-xs rounded-xl hover:bg-yellow-400 transition"
              onClick={() => alert('¡Manual de comunicación guardado de manera exitosa!')}
            >
              Guardar Directrices
            </button>
          </div>
        </div>
      )}

      {activeTab === 'creativos' && (
        <div className="space-y-6 animate-fade-in">
          {/* Logo Generator Lab */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="panel p-6 rounded-2xl bg-[#0a0a0a] border border-gray-800 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="text-gold" size={15} /> Laboratorio de Logotipos IA
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Define el nombre y el ícono conceptual de tu marca. Nuestro motor generará la exportación del kit de marcas en múltiples resoluciones.
              </p>

              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Nombre de la Marca:</label>
                  <input 
                    type="text" 
                    value={newLogoName}
                    onChange={(e) => setNewLogoName(e.target.value)}
                    placeholder="ej. AuraMist"
                    className="w-full bg-black border border-gray-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-gold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Símbolo Iconográfico:</label>
                  <div className="grid grid-cols-4 gap-2">
                    {['☁️', '🌀', '💎', '🌿'].map(icon => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => setSelectedLogoIcon(icon)}
                        className={`p-2 rounded bg-black border text-center text-sm transition ${
                          selectedLogoIcon === icon 
                            ? 'border-gold text-white bg-gold/10' 
                            : 'border-gray-800 text-gray-400 hover:border-gray-700'
                        }`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={generatingLogo}
                  onClick={handleGenerateLogo}
                  className="w-full py-2.5 bg-gold text-black font-bold text-xs rounded-xl hover:bg-yellow-400 transition flex items-center justify-center gap-2"
                >
                  {generatingLogo ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      Generando Logotipos...
                    </>
                  ) : (
                    <>
                      <Plus size={13} />
                      Crear Logotipo de Marca
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Render Logos List */}
            <div className="lg:col-span-2 panel p-6 rounded-2xl space-y-4">
              <h3 className="text-base font-bold text-white">Kit de Recursos & Logotipos</h3>
              <p className="text-xs text-gray-400">Variantes listas para exportar a tu canal de Shopify, WhatsApp o Landing.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {logos.map((logo) => (
                  <div 
                    key={logo.id}
                    className="border border-gray-800 rounded-xl overflow-hidden bg-black/40 flex flex-col group hover:border-gray-700 transition"
                  >
                    <div 
                      style={{ backgroundColor: logo.bg }} 
                      className="h-32 flex flex-col items-center justify-center gap-2 relative"
                    >
                      <div className="text-4xl">{logo.icon}</div>
                      <span className="text-lg font-sans font-bold" style={{ color: logo.color }}>
                        {logo.name}
                      </span>
                      <span className="absolute top-2 right-2 text-[8px] bg-black/60 px-1.5 py-0.5 rounded font-mono text-gray-400">
                        {logo.style}
                      </span>
                    </div>

                    <div className="p-3 bg-gray-950/80 border-t border-gray-950 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-gray-200">{logo.name}.png</p>
                        <p className="text-[10px] text-gray-500 font-mono">1024 x 1024 px</p>
                      </div>
                      <button 
                        onClick={() => alert(`Iniciando descarga ficticia del recurso '${logo.name}.png' en alta resolución`)}
                        className="text-gold p-1.5 rounded hover:bg-gold/10 transition"
                        title="Descargar recurso"
                      >
                        <Download size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

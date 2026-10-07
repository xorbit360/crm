import React, { useState, useRef } from 'react';
import {
  Bot, Send, Paperclip, Mic, Image as ImageIcon, FileText, X, Plus,
  Calendar, Clock, ChevronDown, ChevronRight, Sparkles, Smartphone, Tv,
  Globe, Layers, Activity, Upload, Play, Film, Check, Trash2, Filter,
  MoreVertical, MessageSquare, User, ArrowRight, RefreshCw, Volume2,
  FolderClosed, File as FileIcon, Share2, Eye, Sliders, Search, Video, MonitorPlay,
  Wand2, Scissors, Type, Download, BarChart2, ShieldCheck, Cpu, PlayCircle
} from 'lucide-react';

interface ContenidoViewProps {
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'agent';
  agentName?: string;
  text: string;
  timestamp: string;
  attachments?: {
    name: string;
    type: 'audio' | 'image' | 'document';
    url?: string;
    size?: string;
  }[];
}

interface Agent {
  id: string;
  name: string;
  title: string;
  role: string;
  badge: string;
  color: string;
  description: string;
}

interface KanbanCard {
  id: string;
  title: string;
  type: 'Reel' | 'Short' | 'Post' | 'Carrusel' | 'Video';
  tag: 'Native' | 'TOFU' | 'MOFU' | 'BOFU';
  date: string;
  column: 'ideas' | 'haciendo' | 'grabar' | 'grabado' | 'programado';
}

export default function ContenidoView({ activeTab: propActiveTab, setActiveTab: propSetActiveTab }: ContenidoViewProps = {}) {
  // Navigation & Menu State
  const [internalActiveMenu, setInternalActiveMenu] = useState<string>('crear');
  const activeMenu = propActiveTab || internalActiveMenu;
  const setActiveMenu = (menu: string) => {
    setInternalActiveMenu(menu);
    if (propSetActiveTab) propSetActiveTab(menu);
  };

  const [topHeaderTab, setTopHeaderTab] = useState<'mission' | 'content' | 'seo' | 'sales' | 'operations'>('content');

  // Pinned Agents List
  const agents: Agent[] = [
    { id: 'director', name: 'Director', title: 'Coordinador General', role: 'Director de Estrategia de Contenido', badge: 'D', color: 'bg-amber-600', description: 'Estrategia global, visión de marca y calendario editorial.' },
    { id: 'short_form', name: 'Short Form', title: 'Reels • Shorts • Stories', role: 'Especialista en Guiones Virales', badge: 'S', color: 'bg-blue-600', description: 'Ganchos de 3 segundos, guiones de retención y tendencias TikTok.' },
    { id: 'youtube', name: 'YouTube', title: 'Análisis • Guiones • Long-Form', role: 'Especialista en YouTube SEO', badge: 'Y', color: 'bg-red-600', description: 'Títulos con alto CTR, miniaturas persuasivas y estructura long-form.' },
    { id: 'tendencias', name: 'Tendencias', title: 'Analista Tendencias', role: 'Investigador de Audio & Hooks', badge: 'T', color: 'bg-cyan-600', description: 'Identificación de audios virales, formatos en auge y noticias.' },
    { id: 'anuncios', name: 'Anuncios', title: 'Gestor Campañas', role: 'Copywriter de Meta Ads & TikTok Ads', badge: 'A', color: 'bg-blue-600', description: 'Creativos UGC de alta conversión, ofertas irresistibles y retargeting.' },
    { id: 'sops', name: 'SOPs', title: 'Procesos y Documentación', role: 'Especialista en Flujos de Trabajo', badge: 'P', color: 'bg-emerald-600', description: 'Guías paso a paso, plantillas de producción y checklists.' },
    { id: 'delegacion', name: 'Delegación', title: 'Detector Cuellos', role: 'Auditor de Producción', badge: 'G', color: 'bg-orange-600', description: 'Optimización de tiempos de grabación, edición y publicación.' },
    { id: 'reporting', name: 'Reporting', title: 'Generador Reportes', role: 'Analista de Rendimiento', badge: 'R', color: 'bg-blue-600', description: 'Métricas de alcance, engagement, conversiones y ROI.' }
  ];

  const [selectedAgentId, setSelectedAgentId] = useState<string>('director');
  const activeAgent = agents.find(a => a.id === selectedAgentId) || agents[0];

  // Chat Interactivo / VaultAI State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'msg_welcome',
      sender: 'agent',
      agentName: 'Director - Coordinador General',
      text: '¡Hola! Soy tu Director General de Contenido en Xorbit 360. ¿Qué deseas crear hoy? Puedo ayudarte a estructurar un plan de Reels, redactar copies persuasivos o auditar tus estrategias multicanal. Adjunta audios, imágenes o documentos si lo requieres.',
      timestamp: 'Ahora'
    }
  ]);

  const [chatInputText, setChatInputText] = useState<string>('');
  const [pendingAttachments, setPendingAttachments] = useState<{
    file: File;
    name: string;
    type: 'audio' | 'image' | 'document';
    previewUrl?: string;
  }[]>([]);

  const [isRecordingAudio, setIsRecordingAudio] = useState<boolean>(false);
  const [audioRecordingTimer, setAudioRecordingTimer] = useState<number>(0);
  const audioIntervalRef = useRef<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeUploadType, setActiveUploadType] = useState<'audio' | 'image' | 'document'>('image');

  // Handle File Upload for Chat Attachments
  const handleOpenAttachmentDialog = (type: 'audio' | 'image' | 'document') => {
    setActiveUploadType(type);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      if (type === 'audio') fileInputRef.current.accept = 'audio/*';
      else if (type === 'image') fileInputRef.current.accept = 'image/*';
      else fileInputRef.current.accept = '.pdf,.doc,.docx,.txt,.csv,.xlsx';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newPending: typeof pendingAttachments = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      let type: 'audio' | 'image' | 'document' = activeUploadType;
      if (f.type.startsWith('image/')) type = 'image';
      else if (f.type.startsWith('audio/')) type = 'audio';
      else if (f.type.startsWith('application/') || f.type.startsWith('text/')) type = 'document';

      const previewUrl = type === 'image' ? URL.createObjectURL(f) : undefined;
      newPending.push({
        file: f,
        name: f.name,
        type,
        previewUrl
      });
    }

    setPendingAttachments(prev => [...prev, ...newPending]);
  };

  const removePendingAttachment = (index: number) => {
    setPendingAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Toggle Audio Recording simulation
  const toggleRecordAudio = () => {
    if (isRecordingAudio) {
      clearInterval(audioIntervalRef.current);
      setIsRecordingAudio(false);
      setPendingAttachments(prev => [
        ...prev,
        {
          file: new File([], `Nota_de_Voz_${Date.now()}.mp3`),
          name: `Nota_de_Voz_${audioRecordingTimer}s.mp3`,
          type: 'audio'
        }
      ]);
      setAudioRecordingTimer(0);
    } else {
      setIsRecordingAudio(true);
      setAudioRecordingTimer(0);
      audioIntervalRef.current = setInterval(() => {
        setAudioRecordingTimer(prev => prev + 1);
      }, 1000);
    }
  };

  // Send Chat Message
  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInputText.trim() && pendingAttachments.length === 0) return;

    const userMsg: ChatMessage = {
      id: 'msg_' + Date.now(),
      sender: 'user',
      text: chatInputText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      attachments: pendingAttachments.map(a => ({
        name: a.name,
        type: a.type,
        url: a.previewUrl,
        size: `${Math.round(a.file.size / 1024 || 120)} KB`
      }))
    };

    setChatMessages(prev => [...prev, userMsg]);
    setChatInputText('');
    setPendingAttachments([]);

    // AI Response Simulation
    setTimeout(() => {
      let responseText = `[Respuesta de ${activeAgent.name}]: He analizado tu solicitud`;
      if (userMsg.attachments && userMsg.attachments.length > 0) {
        responseText += ` junto con los ${userMsg.attachments.length} archivo(s) adjunto(s) (${userMsg.attachments.map(a => a.name).join(', ')}).`;
      } else {
        responseText += `.`;
      }
      responseText += `\n\nBasado en nuestro marco de contenido en Xorbit 360, aquí está la propuesta estructurada:\n\n1. **Gancho de Impacto:** "¿Sabías que el 80% de tus ventas provienen de solo 2 tipos de contenidos?"\n2. **Estructura del Script:** Problema -> Solución con Demo -> Oferta Irresistible.\n3. **Call to Action:** Comenta "SISTEMA" para recibir la guía completa en tu inbox.`;

      const aiMsg: ChatMessage = {
        id: 'msg_ai_' + Date.now(),
        sender: 'agent',
        agentName: `${activeAgent.name} - ${activeAgent.title}`,
        text: responseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages(prev => [...prev, aiMsg]);
    }, 1000);
  };

  // Kanban Pipeline State
  const [kanbanCards, setKanbanCards] = useState<KanbanCard[]>([
    { id: 'k1', title: '3 formas de construir IA en tu negocio', type: 'Reel', tag: 'Native', date: '2026-05-28', column: 'grabar' },
    { id: 'k2', title: 'Automatizaciones sueltas vs Sistema Integrado', type: 'Reel', tag: 'Native', date: '2026-05-27', column: 'grabar' }
  ]);

  // Modal State
  const [showAddCardModal, setShowAddCardModal] = useState<boolean>(false);
  const [newCardTitle, setNewCardTitle] = useState<string>('');
  const [newCardType, setNewCardType] = useState<'Reel' | 'Short' | 'Post' | 'Carrusel' | 'Video'>('Reel');
  const [newCardTag, setNewCardTag] = useState<'Native' | 'TOFU' | 'MOFU' | 'BOFU'>('Native');
  const [newCardColumn, setNewCardColumn] = useState<'ideas' | 'haciendo' | 'grabar' | 'grabado' | 'programado'>('ideas');

  const handleAddKanbanCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCardTitle.trim()) return;

    const newC: KanbanCard = {
      id: 'k_' + Date.now(),
      title: newCardTitle.trim(),
      type: newCardType,
      tag: newCardTag,
      date: new Date().toISOString().split('T')[0],
      column: newCardColumn
    };

    setKanbanCards(prev => [...prev, newC]);
    setNewCardTitle('');
    setShowAddCardModal(false);
  };

  // Analizador State
  const [analizeUrl, setAnalizeUrl] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  const handleRunAnalysis = (e: React.FormEvent) => {
    e.preventDefault();
    if (!analizeUrl.trim()) return;
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      setAnalysisResult({
        hookScore: 94,
        retentionScore: 88,
        ctrEstimate: '3.8%',
        viralPotential: 'Alto (Top 5%)',
        breakdown: [
          { time: '0s - 3s', title: 'Gancho Visual & Pregunta Directa', description: 'Capta la atención con problema de alta demanda.', status: 'Excelente' },
          { time: '3s - 15s', title: 'Demostración de Producto UGC', description: 'Muestra el resultado final sin rodeos.', status: 'Muy Bueno' },
          { time: '15s - 30s', title: 'Prueba Social y Descuento', description: 'Testimonios reales con llamada a la acción clara.', status: 'Excelente' }
        ],
        recommendations: [
          'Añadir subtítulos de alto contraste amarillo/blanco en los primeros 2 segundos.',
          'Incluir sonido de tendencia en Meta Ads para subir el CTR en un 18%.',
          'Utilizar un cierre con gatillo mental de escasez (código válido por 24 horas).'
        ]
      });
    }, 1200);
  };

  // Clonador State
  const [cloneVideoUrl, setCloneVideoUrl] = useState<string>('');
  const [isCloning, setIsCloning] = useState<boolean>(false);
  const [clonedScript, setClonedScript] = useState<any>(null);

  const handleRunCloner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cloneVideoUrl.trim()) return;
    setIsCloning(true);
    setTimeout(() => {
      setIsCloning(false);
      setClonedScript({
        originalTitle: 'Reel UGC Ganador importado',
        hookCloned: 'Si estás gastando más de $50 USD al día en anuncios y no vendes, deja de hacer esto...',
        bodyCloned: 'El problema no es tu presupuesto, es la falta de un bot conversacional con IA que cierre las ventas en caliente mientras el cliente está interesado.',
        ctaCloned: 'Escribe LA PALABRA "SISTEMA" abajo y te envío la plantilla exacta.',
        variations: [
          'Variación A (Enfoque Ecommerce): "3 errores costosos al vender por Instagram..."',
          'Variación B (Enfoque Servicios): "Cómo conseguimos 40 citas semanales sin llamadas en frío..."',
          'Variación C (Enfoque Cursos): "Lo que nadie te dice de lanzar tu academia online en 2026..."'
        ]
      });
    }, 1200);
  };

  // Video Editor State
  const [editorProgress, setEditorProgress] = useState<number>(0);
  const [isExportingVideo, setIsExportingVideo] = useState<boolean>(false);
  const [videoSettings, setVideoSettings] = useState({
    autoCutSilences: true,
    autoCaptions: true,
    aiVoiceover: false,
    audioEnhancer: true,
    aspectRatio: '9:16'
  });

  const handleExportVideo = () => {
    setIsExportingVideo(true);
    setEditorProgress(0);
    const interval = setInterval(() => {
      setEditorProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsExportingVideo(false);
          return 100;
        }
        return prev + 20;
      });
    }, 400);
  };

  // View flags
  const isChatView = activeMenu === 'crear' || activeMenu === 'chat_interactivo';
  const isAnalizarView = activeMenu === 'analizar';
  const isClonadorView = activeMenu === 'clonador';
  const isPlanificadorView = activeMenu === 'planificador' || activeMenu === 'dashboard' || activeMenu === 'ideas';
  const isEditorVideoView = activeMenu === 'editor_video';

  return (
    <div className="min-h-screen bg-[#0b0c10] text-gray-100 flex flex-col font-sans select-none">

      {/* Hidden File Input for Attachments */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        multiple
      />

      {/* TOP HEADER NAVIGATION BAR */}
      <header className="bg-[#12131a] border-b border-gray-800/80 px-4 py-2.5 flex items-center justify-between gap-4 shrink-0 shadow-md">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 via-blue-600 to-cyan-500 flex items-center justify-center font-black text-white text-base shadow-md">
              E
            </div>
            <span className="font-extrabold text-lg text-white tracking-tight">Expert<span className="text-blue-400"> 360</span></span>
          </div>

          <nav className="hidden md:flex items-center gap-1 bg-[#181922] p-1 rounded-xl border border-gray-800">
            {[
              { id: 'mission', label: 'Mission Control', icon: Activity },
              { id: 'content', label: 'Content', icon: Layers },
              { id: 'seo', label: 'SEO', icon: Globe },
              { id: 'sales', label: 'Sales', icon: Sparkles },
              { id: 'operations', label: 'Operations', icon: Sliders }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = topHeaderTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setTopHeaderTab(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-400 hover:text-white hover:bg-[#20212d]'
                  }`}
                >
                  <Icon size={14} /> {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] font-semibold text-gray-400 bg-[#181922] px-3 py-1 rounded-full border border-gray-800">
            Workspace: <strong className="text-blue-300">Xorbit 360 AI</strong>
          </span>
        </div>
      </header>

      {/* MAIN LAYOUT WITH SIDEBAR + WORKSPACE */}
      <div className="flex-1 flex overflow-hidden">

        {/* LEFT SIDEBAR */}
        <aside className="w-64 bg-[#111218] border-r border-gray-800/80 flex flex-col justify-between shrink-0 overflow-y-auto">
          <div className="p-3 space-y-4">

            {/* VaultAI Conversaciones */}
            <div className="space-y-1">
              <button
                onClick={() => setActiveMenu('crear')}
                className={`w-full p-3 rounded-2xl border text-left transition-all flex items-center justify-between group ${
                  isChatView
                    ? 'bg-gradient-to-r from-blue-950/80 to-blue-950/80 border-blue-600 text-white shadow-lg shadow-blue-950/40'
                    : 'bg-[#181924] border-blue-900/40 hover:border-blue-600/70 text-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-600/30 border border-blue-500/50 flex items-center justify-center text-blue-300 group-hover:scale-105 transition-transform">
                    <Bot size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-white">VaultAI</h3>
                    <p className="text-[10px] text-blue-300 font-medium">Conversaciones & Chat</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-blue-400 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            {/* CONTENT TOOLS MENU SECTION */}
            <div className="space-y-1">
              <div className="px-2 py-1 flex items-center justify-between text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                <span>HERRAMIENTAS IA</span>
                <ChevronDown size={12} />
              </div>

              {[
                { id: 'crear', label: 'Creación & VaultAI', icon: MessageSquare },
                { id: 'analizar', label: 'Creativos Pro (Analizador)', icon: Search },
                { id: 'clonador', label: 'Clonador Vídeo UGC', icon: Video },
                { id: 'planificador', label: 'Planificador Automático', icon: Calendar },
                { id: 'editor_video', label: 'Editor de Video IA', icon: MonitorPlay },
                { id: 'linkedin', label: 'LinkedIn Grid', icon: Globe },
                { id: 'instagram', label: 'Instagram Reels', icon: Smartphone },
                { id: 'youtube', label: 'YouTube Studio', icon: Tv },
                { id: 'content_lab', label: 'Content Lab', icon: Layers }
              ].map(item => {
                const Icon = item.icon;
                const isCur = activeMenu === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveMenu(item.id)}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all ${
                      isCur
                        ? 'bg-blue-600/20 text-blue-300 border border-blue-500/40 font-bold'
                        : 'text-gray-400 hover:text-white hover:bg-[#181922]'
                    }`}
                  >
                    <Icon size={16} className={isCur ? 'text-blue-400' : 'text-gray-400'} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* PINNED AGENTS SECTION */}
            <div className="space-y-1.5 pt-2 border-t border-gray-800/80">
              <div className="px-2 py-1 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                AGENTES DE CONTENIDO
              </div>

              <div className="space-y-1">
                {agents.map(agent => {
                  const isSelected = selectedAgentId === agent.id;
                  return (
                    <button
                      key={agent.id}
                      onClick={() => {
                        setSelectedAgentId(agent.id);
                        if (!isChatView) {
                          setActiveMenu('crear');
                        }
                      }}
                      className={`w-full p-2 rounded-xl text-left flex items-start gap-2.5 transition-all ${
                        isSelected
                          ? 'bg-[#1e1f2b] border border-blue-800/60 text-white'
                          : 'hover:bg-[#181922] text-gray-400'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-lg ${agent.color} text-white font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5 shadow-sm`}>
                        {agent.badge}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-xs text-white leading-tight truncate">{agent.name}</h4>
                        <p className="text-[10px] text-gray-500 truncate leading-tight">{agent.title}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          {/* SIDEBAR FOOTER */}
          <div className="p-3 border-t border-gray-800/80 text-[11px] text-gray-500 font-mono">
            Xorbit 360 v0.1
          </div>
        </aside>

        {/* MAIN WORKSPACE CONTENT AREA */}
        <main className="flex-1 bg-[#0b0c10] overflow-y-auto flex flex-col">

          {/* TOOL 1: CREACIÓN & VAULTAI CHAT */}
          {isChatView && (
            <div className="flex-1 flex flex-col h-full bg-[#0e0f15]">

              {/* Agent Active Top Bar */}
              <div className="bg-[#13141c] border-b border-gray-800/80 px-6 py-3.5 flex items-center justify-between gap-4 shrink-0 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl ${activeAgent.color} text-white font-black text-sm flex items-center justify-center shadow-md`}>
                    {activeAgent.badge}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-bold text-white text-sm">{activeAgent.name}</h2>
                      <span className="text-[10px] bg-blue-950 text-blue-300 border border-blue-800/50 px-2 py-0.5 rounded-full font-semibold">
                        Agente Activo
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">{activeAgent.role} • {activeAgent.title}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setChatMessages([])}
                    className="px-3 py-1.5 bg-[#1a1b24] hover:bg-[#222330] text-gray-400 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-gray-800"
                  >
                    <RefreshCw size={13} /> Limpiar Chat
                  </button>
                </div>
              </div>

              {/* Chat Thread Messages */}
              <div className="flex-1 p-6 overflow-y-auto space-y-4">
                {chatMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3 opacity-60">
                    <Bot size={40} className="text-blue-400" />
                    <h3 className="font-bold text-white text-base">Inicia una nueva conversación con {activeAgent.name}</h3>
                    <p className="text-xs text-gray-400 max-w-sm">Escribe tu instrucción o adjunta notas de voz, imágenes y documentos para analizar.</p>
                  </div>
                ) : (
                  chatMessages.map(msg => (
                    <div
                      key={msg.id}
                      className={`flex flex-col max-w-3xl ${
                        msg.sender === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1 px-1">
                        <span className="font-bold text-xs text-gray-300">
                          {msg.sender === 'user' ? 'Tú' : msg.agentName || activeAgent.name}
                        </span>
                        <span className="text-[10px] text-gray-500">{msg.timestamp}</span>
                      </div>

                      <div
                        className={`p-4 rounded-2xl text-xs leading-relaxed space-y-3 shadow-md ${
                          msg.sender === 'user'
                            ? 'bg-blue-600 text-white rounded-tr-none'
                            : 'bg-[#151620] border border-gray-800 text-gray-200 rounded-tl-none'
                        }`}
                      >
                        <p className="whitespace-pre-line">{msg.text}</p>

                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="space-y-2 pt-2 border-t border-white/20">
                            {msg.attachments.map((att, idx) => (
                              <div key={idx} className="flex items-center gap-2 bg-black/30 p-2 rounded-xl text-[11px] font-mono">
                                {att.type === 'audio' && <Mic size={14} className="text-blue-300" />}
                                {att.type === 'image' && <ImageIcon size={14} className="text-cyan-300" />}
                                {att.type === 'document' && <FileText size={14} className="text-amber-300" />}
                                <span className="truncate max-w-xs">{att.name}</span>
                                {att.size && <span className="opacity-70">({att.size})</span>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Pending Attachments Preview Strip */}
              {pendingAttachments.length > 0 && (
                <div className="px-6 py-2 bg-[#13141c] border-t border-gray-800/80 flex items-center gap-2 overflow-x-auto">
                  <span className="text-[11px] font-bold text-blue-400 shrink-0">Adjuntos listos:</span>
                  {pendingAttachments.map((att, index) => (
                    <div key={index} className="flex items-center gap-2 bg-[#1c1d28] border border-blue-800/50 px-3 py-1.5 rounded-xl text-xs text-white shrink-0">
                      {att.type === 'audio' && <Mic size={14} className="text-blue-400" />}
                      {att.type === 'image' && <ImageIcon size={14} className="text-cyan-400" />}
                      {att.type === 'document' && <FileText size={14} className="text-amber-400" />}
                      <span className="truncate max-w-[120px] font-mono text-[11px]">{att.name}</span>
                      <button onClick={() => removePendingAttachment(index)} className="text-gray-400 hover:text-white">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Chat Input Toolbar Bar */}
              <div className="p-4 bg-[#12131b] border-t border-gray-800/80 shrink-0">
                <form onSubmit={handleSendMessage} className="space-y-3">
                  <div className="relative bg-[#181924] border border-gray-700/80 rounded-2xl p-2.5 shadow-inner focus-within:border-blue-500 transition-colors">
                    <textarea
                      rows={2}
                      value={chatInputText}
                      onChange={(e) => setChatInputText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder={`Escribe un mensaje, prompt o instrucción para ${activeAgent.name}...`}
                      className="w-full bg-transparent text-xs text-white placeholder-gray-500 focus:outline-none resize-none px-2 py-1"
                    />

                    <div className="flex items-center justify-between pt-2 border-t border-gray-800/60">
                      <div className="flex items-center gap-1.5">

                        <button
                          type="button"
                          onClick={toggleRecordAudio}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                            isRecordingAudio
                              ? 'bg-red-600 text-white animate-pulse'
                              : 'bg-[#20212e] text-gray-300 hover:text-white hover:bg-blue-950/60 border border-gray-700/60'
                          }`}
                        >
                          <Mic size={14} className={isRecordingAudio ? 'text-white' : 'text-blue-400'} />
                          {isRecordingAudio ? `Grabando ${audioRecordingTimer}s...` : 'Audio'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenAttachmentDialog('image')}
                          className="px-3 py-1.5 bg-[#20212e] hover:bg-blue-950/60 text-gray-300 hover:text-white border border-gray-700/60 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                        >
                          <ImageIcon size={14} className="text-cyan-400" />
                          Imágenes
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenAttachmentDialog('document')}
                          className="px-3 py-1.5 bg-[#20212e] hover:bg-blue-950/60 text-gray-300 hover:text-white border border-gray-700/60 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                        >
                          <FileText size={14} className="text-amber-400" />
                          Documentos
                        </button>

                      </div>

                      <button
                        type="submit"
                        className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-950 transition-all shrink-0"
                      >
                        <Send size={14} /> Enviar
                      </button>
                    </div>
                  </div>
                </form>
              </div>

            </div>
          )}

          {/* TOOL 2: CREATIVOS PRO (ANALIZADOR DE ANUNCIOS Y CONTENIDO VIRAL) */}
          {isAnalizarView && (
            <div className="p-4 sm:p-6 space-y-6 w-full">
              <div>
                <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800/50 uppercase tracking-wider">
                  Creativos Pro IA
                </span>
                <h1 className="text-2xl font-black text-white mt-2">Analizador de Anuncios y Contenido Viral</h1>
                <p className="text-xs text-gray-400">Pega la URL de cualquier Reel, TikTok o Meta Ad para analizar su retención, ganchos y CTR estimado.</p>
              </div>

              {/* Analyzer Form */}
              <div className="bg-[#12131a] border border-gray-800 rounded-2xl p-6 shadow-xl space-y-4">
                <form onSubmit={handleRunAnalysis} className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-3.5 text-gray-500" size={18} />
                    <input
                      type="url"
                      required
                      value={analizeUrl}
                      onChange={(e) => setAnalizeUrl(e.target.value)}
                      placeholder="https://www.instagram.com/reel/C... o URL del video del anuncio"
                      className="w-full pl-10 pr-4 py-3 bg-[#181922] border border-gray-700/80 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isAnalyzing}
                    className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-cyan-950 transition-all shrink-0"
                  >
                    {isAnalyzing ? <RefreshCw className="animate-spin" size={16} /> : <Wand2 size={16} />}
                    {isAnalyzing ? 'Analizando con IA...' : 'Analizar Creativo'}
                  </button>
                </form>
              </div>

              {/* Results Cards */}
              {analysisResult && (
                <div className="space-y-6 animate-fade-in">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-[#12131a] border border-gray-800 p-4 rounded-2xl">
                      <p className="text-[11px] font-bold text-gray-400">Score de Gancho (0-3s)</p>
                      <p className="text-2xl font-black text-emerald-400 mt-1">{analysisResult.hookScore}/100</p>
                    </div>
                    <div className="bg-[#12131a] border border-gray-800 p-4 rounded-2xl">
                      <p className="text-[11px] font-bold text-gray-400">Retención Estimada</p>
                      <p className="text-2xl font-black text-cyan-400 mt-1">{analysisResult.retentionScore}%</p>
                    </div>
                    <div className="bg-[#12131a] border border-gray-800 p-4 rounded-2xl">
                      <p className="text-[11px] font-bold text-gray-400">CTR Proyectado</p>
                      <p className="text-2xl font-black text-blue-400 mt-1">{analysisResult.ctrEstimate}</p>
                    </div>
                    <div className="bg-[#12131a] border border-gray-800 p-4 rounded-2xl">
                      <p className="text-[11px] font-bold text-gray-400">Potencial Viral</p>
                      <p className="text-2xl font-black text-amber-400 mt-1">{analysisResult.viralPotential}</p>
                    </div>
                  </div>

                  <div className="bg-[#12131a] border border-gray-800 rounded-2xl p-6 space-y-4">
                    <h3 className="font-bold text-sm text-white">Desglose Técnico del Guion y Escenas</h3>
                    <div className="space-y-3">
                      {analysisResult.breakdown.map((item: any, idx: number) => (
                        <div key={idx} className="bg-[#181922] border border-gray-800 p-4 rounded-xl flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-950 text-blue-300 border border-blue-800/50">
                              {item.time}
                            </span>
                            <h4 className="font-bold text-xs text-white">{item.title}</h4>
                            <p className="text-xs text-gray-400">{item.description}</p>
                          </div>
                          <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-800/40">
                            {item.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-[#12131a] border border-blue-900/40 rounded-2xl p-6 space-y-3">
                    <h3 className="font-bold text-sm text-blue-300 flex items-center gap-2">
                      <Sparkles size={16} /> Recomendaciones de Optimización de Conversión
                    </h3>
                    <ul className="space-y-2">
                      {analysisResult.recommendations.map((rec: string, idx: number) => (
                        <li key={idx} className="text-xs text-gray-300 flex items-start gap-2 bg-[#181922] p-3 rounded-xl border border-gray-800">
                          <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TOOL 3: CLONADOR DE VIDEO UGC */}
          {isClonadorView && (
            <div className="p-4 sm:p-6 space-y-6 w-full">
              <div>
                <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-blue-950 text-blue-300 border border-blue-800/50 uppercase tracking-wider">
                  UGC Generator
                </span>
                <h1 className="text-2xl font-black text-white mt-2">Clonador de Video UGC e Identificación de Patrones</h1>
                <p className="text-xs text-gray-400">Importa cualquier video explicativo o anuncio ganador y genera 3 variaciones replicables para tu marca.</p>
              </div>

              <div className="bg-[#12131a] border border-gray-800 rounded-2xl p-6 shadow-xl space-y-4">
                <form onSubmit={handleRunCloner} className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Video className="absolute left-3.5 top-3.5 text-gray-500" size={18} />
                    <input
                      type="url"
                      required
                      value={cloneVideoUrl}
                      onChange={(e) => setCloneVideoUrl(e.target.value)}
                      placeholder="Pega la URL del Reel/TikTok a clonar (ej. https://tiktok.com/@...)"
                      className="w-full pl-10 pr-4 py-3 bg-[#181922] border border-gray-700/80 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isCloning}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-950 transition-all shrink-0"
                  >
                    {isCloning ? <RefreshCw className="animate-spin" size={16} /> : <PlayCircle size={16} />}
                    {isCloning ? 'Extrayendo Estructura...' : 'Clonar Guion UGC'}
                  </button>
                </form>
              </div>

              {clonedScript && (
                <div className="space-y-6 animate-fade-in">
                  <div className="bg-[#12131a] border border-gray-800 rounded-2xl p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                      <h3 className="font-bold text-sm text-white">Estructura Extraída del Video</h3>
                      <span className="text-[11px] text-emerald-400 font-bold bg-emerald-950 px-2.5 py-0.5 rounded-full border border-emerald-800">
                        Listo para grabar
                      </span>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div className="bg-[#181922] p-3.5 rounded-xl border border-gray-800 space-y-1">
                        <span className="text-[10px] font-bold text-blue-400 uppercase">Gancho Clonado (0s - 3s)</span>
                        <p className="text-white font-semibold">{clonedScript.hookCloned}</p>
                      </div>

                      <div className="bg-[#181922] p-3.5 rounded-xl border border-gray-800 space-y-1">
                        <span className="text-[10px] font-bold text-cyan-400 uppercase">Cuerpo / Demostración</span>
                        <p className="text-gray-300">{clonedScript.bodyCloned}</p>
                      </div>

                      <div className="bg-[#181922] p-3.5 rounded-xl border border-gray-800 space-y-1">
                        <span className="text-[10px] font-bold text-emerald-400 uppercase">Call To Action (CTA)</span>
                        <p className="text-white font-semibold">{clonedScript.ctaCloned}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#12131a] border border-blue-900/40 rounded-2xl p-6 space-y-3">
                    <h3 className="font-bold text-sm text-blue-300 flex items-center gap-2">
                      <Sparkles size={16} /> Variaciones Personalizadas Creadas por IA
                    </h3>
                    <div className="space-y-2">
                      {clonedScript.variations.map((v: string, idx: number) => (
                        <div key={idx} className="bg-[#181922] p-3.5 rounded-xl border border-gray-800 text-xs text-gray-200 flex items-center justify-between gap-3">
                          <span>{v}</span>
                          <button
                            onClick={() => {
                              setKanbanCards(prev => [...prev, {
                                id: 'k_' + Date.now(),
                                title: v,
                                type: 'Reel',
                                tag: 'Native',
                                date: new Date().toISOString().split('T')[0],
                                column: 'grabar'
                              }]);
                              alert('¡Guion añadido al Planificador de Contenidos!');
                            }}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shrink-0 text-[11px]"
                          >
                            + Guardar en Planificador
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TOOL 4: PLANIFICADOR AUTOMÁTICO & PIPELINE KANBAN */}
          {isPlanificadorView && (
            <div className="p-6 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-black text-white capitalize">Planificador Automático de Contenidos</h1>
                  <p className="text-xs text-gray-400">Gestiona el flujo de ideas, grabación y publicaciones en tus canales de redes sociales.</p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    onClick={() => setShowAddCardModal(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-blue-950 transition-all"
                  >
                    <Plus size={15} /> Subir contenido
                  </button>

                  <button
                    onClick={() => setActiveMenu('clonador')}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-950 transition-all"
                  >
                    <Play size={15} /> Clonar Reel
                  </button>

                  <button
                    onClick={() => setActiveMenu('crear')}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-blue-950 transition-all"
                  >
                    <Sparkles size={15} /> Generar Reels con VaultAI
                  </button>
                </div>
              </div>

              {/* Calendario semanal */}
              <div className="space-y-3 bg-[#12131a] p-4 rounded-2xl border border-gray-800">
                <h3 className="font-bold text-xs text-gray-300 uppercase tracking-wider">Calendario semanal</h3>
                <h4 className="text-sm font-extrabold text-white">Programados para subir</h4>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
                  {[
                    { day: 'Lun', date: '15' },
                    { day: 'Mar', date: '16' },
                    { day: 'Mié', date: '17' },
                    { day: 'Jue', date: '18' },
                    { day: 'Vie', date: '19' }
                  ].map((d, i) => (
                    <div key={i} className="bg-[#181922] border border-gray-800 rounded-xl p-3 h-20 flex justify-between items-start text-xs hover:border-blue-800 transition-colors">
                      <span className="font-bold text-gray-300">{d.day}</span>
                      <span className="font-mono text-gray-500 text-sm">{d.date}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pipeline Kanban Board Section */}
              <div className="space-y-3 bg-[#12131a] p-5 rounded-2xl border border-gray-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-xs text-gray-300 uppercase tracking-wider">Pipeline</h3>
                    <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                      Pipeline <span className="bg-[#1e1f2b] text-blue-300 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-blue-800/50">Borradores ({kanbanCards.length})</span>
                    </h4>
                  </div>

                  <button
                    onClick={() => setShowAddCardModal(true)}
                    className="p-2 bg-[#181922] hover:bg-[#20212e] text-blue-400 rounded-xl text-xs font-bold border border-gray-800"
                  >
                    + Nueva Idea
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 pt-2 overflow-x-auto">

                  {/* Column 1: Idea generada */}
                  <div className="bg-[#161720] border border-gray-800/80 rounded-2xl p-3 space-y-3 min-h-[220px]">
                    <div className="flex items-center justify-between font-bold text-xs text-white">
                      <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500"></span> Idea generada</span>
                      <span className="text-gray-500">0</span>
                    </div>
                    <div className="border border-dashed border-gray-800 rounded-xl p-6 text-center text-[11px] text-gray-500">
                      Arrastra ideas aquí
                    </div>
                  </div>

                  {/* Column 2: Haciendo */}
                  <div className="bg-[#161720] border border-gray-800/80 rounded-2xl p-3 space-y-3 min-h-[220px]">
                    <div className="flex items-center justify-between font-bold text-xs text-white">
                      <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Haciendo</span>
                      <span className="text-gray-500">0</span>
                    </div>
                    <div className="border border-dashed border-gray-800 rounded-xl p-6 text-center text-[11px] text-gray-500">
                      Arrastra ideas aquí
                    </div>
                  </div>

                  {/* Column 3: Para Grabar */}
                  <div className="bg-[#161720] border border-blue-900/40 rounded-2xl p-3 space-y-3 min-h-[220px]">
                    <div className="flex items-center justify-between font-bold text-xs text-white">
                      <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Para Grabar</span>
                      <span className="text-blue-400 font-bold">{kanbanCards.length}</span>
                    </div>

                    <div className="space-y-2.5">
                      {kanbanCards.map(card => (
                        <div key={card.id} className="bg-[#1c1d28] border border-blue-800/50 hover:border-blue-500 rounded-xl p-3 space-y-2 shadow-sm text-xs cursor-pointer group">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-950 text-blue-300 border border-blue-800/50">
                              {card.type}
                            </span>
                            <span className="text-white font-bold leading-tight line-clamp-2">{card.title}</span>
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-gray-400 pt-1">
                            <span className="px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/40 font-mono">
                              {card.tag}
                            </span>
                            <span>{card.date}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Column 4: Grabado */}
                  <div className="bg-[#161720] border border-gray-800/80 rounded-2xl p-3 space-y-3 min-h-[220px]">
                    <div className="flex items-center justify-between font-bold text-xs text-white">
                      <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-cyan-500"></span> Grabado</span>
                      <span className="text-gray-500">0</span>
                    </div>
                    <div className="border border-dashed border-gray-800 rounded-xl p-6 text-center text-[11px] text-gray-500">
                      Arrastra ideas aquí
                    </div>
                  </div>

                  {/* Column 5: Programado */}
                  <div className="bg-[#161720] border border-gray-800/80 rounded-2xl p-3 space-y-3 min-h-[220px]">
                    <div className="flex items-center justify-between font-bold text-xs text-white">
                      <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Programado</span>
                      <span className="text-gray-500">0</span>
                    </div>
                    <div className="border border-dashed border-gray-800 rounded-xl p-6 text-center text-[11px] text-gray-500">
                      Arrastra ideas aquí
                    </div>
                  </div>

                </div>
              </div>
            </div>
          )}

          {/* TOOL 5: EDITOR DE VIDEO IA */}
          {isEditorVideoView && (
            <div className="p-4 sm:p-6 space-y-6 w-full">
              <div>
                <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-blue-950 text-blue-300 border border-blue-800/50 uppercase tracking-wider">
                  Video Studio IA
                </span>
                <h1 className="text-2xl font-black text-white mt-2">Editor de Video e IA Enhancer</h1>
                <p className="text-xs text-gray-400">Genera subtítulos automáticos estilo TikTok, recorta silencios y renderiza en formato 9:16 sin esfuerzo.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Video Preview Canvas */}
                <div className="lg:col-span-2 bg-[#12131a] border border-gray-800 rounded-2xl p-6 flex flex-col items-center justify-center space-y-4">
                  <div className="w-64 h-[420px] bg-black border border-blue-900/50 rounded-2xl overflow-hidden relative shadow-2xl flex flex-col items-center justify-center text-center p-4">
                    <Film size={48} className="text-blue-500 animate-pulse mb-3" />
                    <p className="text-xs font-bold text-white">Vista Previa 9:16 (Vertical)</p>
                    <p className="text-[10px] text-gray-400 mt-1">Subtítulos dinámicos activados</p>

                    {/* Animated Fake Subtitle overlay */}
                    <div className="absolute bottom-12 left-4 right-4 bg-black/80 backdrop-blur-md p-2.5 rounded-xl border border-blue-500/50 text-center">
                      <span className="text-xs font-black text-amber-300 uppercase tracking-wide animate-pulse">
                        "¡EL RESULTADO ES INCREÍBLE!"
                      </span>
                    </div>
                  </div>

                  {/* Render Progress Bar */}
                  {isExportingVideo && (
                    <div className="w-full space-y-2">
                      <div className="flex justify-between text-xs font-bold text-blue-300">
                        <span>Exportando y Renderizando Video...</span>
                        <span>{editorProgress}%</span>
                      </div>
                      <div className="w-full bg-gray-900 h-2.5 rounded-full overflow-hidden border border-gray-800">
                        <div className="bg-gradient-to-r from-blue-500 to-blue-500 h-full transition-all duration-300" style={{ width: `${editorProgress}%` }}></div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Video Tools Controls */}
                <div className="bg-[#12131a] border border-gray-800 rounded-2xl p-6 space-y-5">
                  <h3 className="font-bold text-sm text-white border-b border-gray-800 pb-3">Ajustes Inteligentes de IA</h3>

                  <div className="space-y-3 text-xs">
                    <label className="flex items-center justify-between p-3 bg-[#181922] border border-gray-800 rounded-xl cursor-pointer">
                      <span className="font-semibold text-gray-200 flex items-center gap-2">
                        <Scissors size={15} className="text-blue-400" /> Recorte automático de silencios
                      </span>
                      <input
                        type="checkbox"
                        checked={videoSettings.autoCutSilences}
                        onChange={(e) => setVideoSettings(prev => ({ ...prev, autoCutSilences: e.target.checked }))}
                        className="rounded accent-blue-600"
                      />
                    </label>

                    <label className="flex items-center justify-between p-3 bg-[#181922] border border-gray-800 rounded-xl cursor-pointer">
                      <span className="font-semibold text-gray-200 flex items-center gap-2">
                        <Type size={15} className="text-amber-400" /> Subtítulos animados (Estilo Hormozi)
                      </span>
                      <input
                        type="checkbox"
                        checked={videoSettings.autoCaptions}
                        onChange={(e) => setVideoSettings(prev => ({ ...prev, autoCaptions: e.target.checked }))}
                        className="rounded accent-blue-600"
                      />
                    </label>

                    <label className="flex items-center justify-between p-3 bg-[#181922] border border-gray-800 rounded-xl cursor-pointer">
                      <span className="font-semibold text-gray-200 flex items-center gap-2">
                        <Volume2 size={15} className="text-cyan-400" /> Limpieza de ruido de fondo IA
                      </span>
                      <input
                        type="checkbox"
                        checked={videoSettings.audioEnhancer}
                        onChange={(e) => setVideoSettings(prev => ({ ...prev, audioEnhancer: e.target.checked }))}
                        className="rounded accent-blue-600"
                      />
                    </label>
                  </div>

                  <button
                    onClick={handleExportVideo}
                    disabled={isExportingVideo}
                    className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-blue-600 hover:from-blue-500 hover:to-blue-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-950 transition-all"
                  >
                    <Download size={16} />
                    {isExportingVideo ? 'Procesando Video...' : 'Exportar Video Procesado'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* OTHER SOCIAL NETWORKS VIEWS */}
          {!isChatView && !isAnalizarView && !isClonadorView && !isPlanificadorView && !isEditorVideoView && (
            <div className="p-6 space-y-6">
              <div>
                <h1 className="text-2xl font-black text-white capitalize">{activeMenu.replace('_', ' ')}</h1>
                <p className="text-xs text-gray-400">Planifica, clona y programa tu parrilla de contenidos en minutos.</p>
              </div>

              <div className="bg-[#12131a] border border-gray-800 rounded-2xl p-8 text-center space-y-4">
                <Smartphone size={36} className="text-blue-400 mx-auto" />
                <h3 className="font-bold text-white text-base">Canal {activeMenu.toUpperCase()} Configurado</h3>
                <p className="text-xs text-gray-400 max-w-md mx-auto">Conectado con Xorbit 360 AI. Puedes programar o analizar tus publicaciones directamente desde aquí.</p>
                <button
                  onClick={() => setActiveMenu('crear')}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md"
                >
                  Abrir VaultAI para Crear Contenido
                </button>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* MODAL TO ADD NEW KANBAN CARD / IDEA */}
      {showAddCardModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#12131a] border border-gray-800 rounded-2xl max-w-md w-full p-6 space-y-4 relative shadow-2xl">
            <button
              onClick={() => setShowAddCardModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X size={18} />
            </button>

            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <Plus size={18} className="text-blue-400" /> Crear Nuevo Contenido / Reel
            </h3>

            <form onSubmit={handleAddKanbanCard} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Título / Gancho del Contenido</label>
                <input
                  type="text"
                  required
                  value={newCardTitle}
                  onChange={(e) => setNewCardTitle(e.target.value)}
                  placeholder="Ej: 3 secretos para escalar tu tienda de Dropshipping"
                  className="w-full px-3.5 py-2.5 bg-[#181922] border border-gray-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">Formato</label>
                  <select
                    value={newCardType}
                    onChange={(e) => setNewCardType(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-[#181922] border border-gray-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="Reel">Reel</option>
                    <option value="Short">Short</option>
                    <option value="Post">Post</option>
                    <option value="Carrusel">Carrusel</option>
                    <option value="Video">Video Long-Form</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">Etiqueta</label>
                  <select
                    value={newCardTag}
                    onChange={(e) => setNewCardTag(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-[#181922] border border-gray-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="Native">Native</option>
                    <option value="TOFU">TOFU (Atracción)</option>
                    <option value="MOFU">MOFU (Nutrición)</option>
                    <option value="BOFU">BOFU (Ventas)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Columna de Estado</label>
                <select
                  value={newCardColumn}
                  onChange={(e) => setNewCardColumn(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-[#181922] border border-gray-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="ideas">Idea generada</option>
                  <option value="haciendo">Haciendo</option>
                  <option value="grabar">Para Grabar</option>
                  <option value="grabado">Grabado</option>
                  <option value="programado">Programado</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCardModal(false)}
                  className="px-4 py-2 bg-[#181922] text-gray-300 hover:text-white rounded-xl text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-950"
                >
                  Guardar Idea
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

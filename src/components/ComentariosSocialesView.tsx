import React, { useEffect, useState } from 'react';
import {
  MessageSquare,
  Send,
  Sparkles,
  Facebook,
  Instagram,
  Video,
  Check,
  RefreshCw,
  AlertCircle,
  Filter,
  Bot,
  Settings,
  Zap,
  Plus,
  UserCircle,
  Smile,
  Trash2,
  Clock,
  HelpCircle
} from 'lucide-react';

interface Comment {
  id: string;
  authorName: string;
  authorAvatar: string;
  platform: 'facebook' | 'instagram' | 'tiktok';
  postTitle: string;
  postImage?: string;
  text: string;
  timestamp: string;
  status: 'pendiente' | 'respondido_ia' | 'respondido_manual';
  replyText?: string;
  aiSuggestedReply?: string;
}

export default function ComentariosSocialesView() {
  // Social API connection simulated states (syncs with WhatsappView metadata)
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(true);
  const [autoReplyPrompt, setAutoReplyPrompt] = useState(
    "Eres un asistente de e-commerce experto. Responde de forma cálida y profesional, en español de Colombia. Sé breve. Si preguntan precio, indícalo y ofrece pago contra entrega. Invita siempre a que den clic al link de la bio o escriban al WhatsApp para completar el pedido."
  );

  // Initial comments list (Colombian E-commerce Context)
  const [comments, setComments] = useState<Comment[]>([
    {
      id: 'c-1',
      authorName: 'Camila Restrepo',
      authorAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=80&h=80&q=80',
      platform: 'instagram',
      postTitle: '⌚ Smartwatch Ultra T900 - ¡Llegó el más pedido!',
      postImage: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=150&q=80',
      text: '¿Hola, tiene disponibilidad en color negro y cuánto cuesta con envío a Cali?',
      timestamp: 'Hace 5 minutos',
      status: 'pendiente',
      aiSuggestedReply: '¡Hola Camila! Claro que sí, tenemos disponibilidad en color negro. El Smartwatch Ultra tiene un valor de $149,900 COP. Lo mejor de todo es que el envío a Cali es completamente GRATIS y puedes pagar al recibir en casa (Pago Contra Entrega). Escríbenos al WhatsApp para apartar el tuyo de inmediato. 📦👇'
    },
    {
      id: 'c-2',
      authorName: 'Carlos Mario Giraldo',
      authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&h=80&q=80',
      platform: 'facebook',
      postTitle: '🔥 Oferta Loca: Paga 1 y Lleva 2 Audífonos Pro',
      postImage: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=150&q=80',
      text: '¿Es confiable? ¿Tienen pago contra entrega en Medellín o toca pagar antes?',
      timestamp: 'Hace 23 minutos',
      status: 'respondido_ia',
      replyText: '¡Hola Carlos! Totalmente confiable. Manejamos Pago Contra Entrega en Medellín y en todo el país. No tienes que pagar nada por adelantado, cancelas en efectivo al mensajero cuando te entregue el producto. El envío es totalmente gratis. ¡Haz clic en nuestro link para pedir por WhatsApp!'
    },
    {
      id: 'c-3',
      authorName: 'Yurani Gomez',
      authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&h=80&q=80',
      platform: 'tiktok',
      postTitle: '📦 Abriendo el contenedor de MasterShop - Stock Listo',
      text: '¿Venden al por mayor para negocio de dropshipping en Bogotá?',
      timestamp: 'Hace 1 hora',
      status: 'pendiente',
      aiSuggestedReply: '¡Hola Yurani! ¡Qué super oportunidad! Sí, vendemos al por mayor y estamos completamente integrados con Dropi y MasterShop para despachos automáticos en Bogotá y todo el territorio colombiano. Te daremos tarifas preferenciales de flete y stock garantizado. Por favor, escríbenos directamente al WhatsApp para pasarte el catálogo mayorista.'
    },
    {
      id: 'c-4',
      authorName: 'Andrés Felipe',
      authorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=80&h=80&q=80',
      platform: 'instagram',
      postTitle: '⌚ Smartwatch Ultra T900 - ¡Llegó el más pedido!',
      postImage: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=150&q=80',
      text: 'Tienen garantía si el reloj llega con algún golpe?',
      timestamp: 'Hace 2 horas',
      status: 'respondido_manual',
      replyText: 'Hola Andrés, totalmente. Tienes 30 días de garantía por defectos de fábrica o daños en el transporte. Nos encargamos de todo el proceso sin costos adicionales.'
    }
  ]);

  // Cargar comentarios reales recibidos por el webhook (Instagram/Facebook/
  // TikTok) y mantenerlos visibles junto a los datos de demostración.
  useEffect(() => {
    let active = true;
    const loadSocialComments = async () => {
      try {
        const response = await fetch('/api/backoffice/social-comments', { credentials: 'include' });
        if (!response.ok) return;
        const state: any = await response.json();
        const incoming = Array.isArray(state?.socialComments) ? state.socialComments : [];
        if (!active || incoming.length === 0) return;
        const mapped: Comment[] = incoming.map((item: any) => ({
          id: String(item.id || `social-${Date.now()}`),
          authorName: item.authorName || 'Usuario de red social',
          authorAvatar: item.authorAvatar || '',
          platform: ['facebook', 'instagram', 'tiktok'].includes(String(item.platform).toLowerCase())
            ? String(item.platform).toLowerCase() as Comment['platform'] : 'instagram',
          postTitle: item.postTitle || 'Publicación de Instagram',
          postImage: item.postImage,
          text: item.text || '',
          timestamp: item.timestamp ? new Date(item.timestamp).toLocaleString('es-CO') : 'Reciente',
          status: item.status === 'respondido_ia' || item.status === 'respondido_manual' ? item.status : 'pendiente',
          replyText: item.replyText,
          aiSuggestedReply: item.aiSuggestedReply
        }));
        setComments(previous => {
          const existing = new Set(previous.map(comment => comment.id));
          return [...mapped.filter(comment => !existing.has(comment.id)), ...previous];
        });
        setSelectedCommentId(previous => previous || mapped[0]?.id || '');
      } catch (error) {
        console.warn('[Comentarios Redes] No se pudo cargar la bandeja:', error);
      }
    };
    loadSocialComments();
    const events = new EventSource('/api/realtime/events');
    let refreshTimer: number | undefined;
    const refreshFromWebhook = () => {
      if (refreshTimer) window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(loadSocialComments, 80);
    };
    events.addEventListener('state_changed', refreshFromWebhook);
    return () => {
      active = false;
      if (refreshTimer) window.clearTimeout(refreshTimer);
      events.removeEventListener('state_changed', refreshFromWebhook);
      events.close();
    };
  }, []);

  // UI state filters
  const [platformFilter, setPlatformFilter] = useState<'all' | 'facebook' | 'instagram' | 'tiktok'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pendiente' | 'respondido'>('all');
  const [selectedCommentId, setSelectedCommentId] = useState<string>('c-1');
  const [replyInput, setReplyInput] = useState('');
  const [generatingAIId, setGeneratingAIId] = useState<string | null>(null);

  // Simulator state
  const [simName, setSimName] = useState('');
  const [simText, setSimText] = useState('');
  const [simPlatform, setSimPlatform] = useState<'facebook' | 'instagram' | 'tiktok'>('instagram');
  const [simPost, setSimPost] = useState('⌚ Smartwatch Ultra T900 - ¡Llegó el más pedido!');
  const [showSimulator, setShowSimulator] = useState(false);

  // Quick templates
  const quickTemplates = [
    { title: 'Pago Contra Entrega', text: '¡Hola! Sí, manejamos Pago Contra Entrega en todo el país. Pagas en efectivo al recibir el paquete, ¡con envío gratis!' },
    { title: 'Precio & Link', text: '¡Hola! Este espectacular artículo tiene un valor de $149,900 COP. Compra segura dando clic en el enlace de nuestro perfil.' },
    { title: 'Asesor WhatsApp', text: '¡Hola! Para brindarte una atención personalizada y procesar tu orden de inmediato, escríbenos a nuestro WhatsApp dando clic en el link de la bio.' },
  ];

  // Filters calculation
  const filteredComments = comments.filter(c => {
    const platformMatch = platformFilter === 'all' || c.platform === platformFilter;
    const statusMatch = statusFilter === 'all' ||
                        (statusFilter === 'pendiente' && c.status === 'pendiente') ||
                        (statusFilter === 'respondido' && c.status !== 'pendiente');
    return platformMatch && statusMatch;
  });

  const selectedComment = comments.find(c => c.id === selectedCommentId) || comments[0];

  const handleSendReply = (status: 'respondido_ia' | 'respondido_manual') => {
    if (!replyInput.trim()) return;

    setComments(prev => prev.map(c => {
      if (c.id === selectedCommentId) {
        return {
          ...c,
          status,
          replyText: replyInput
        };
      }
      return c;
    }));

    setReplyInput('');
    alert('Respuesta publicada con éxito en la red social.');
  };

  const handleGenerateAISuggestion = () => {
    if (!selectedComment) return;
    setGeneratingAIId(selectedComment.id);

    // Simulate AI generation using the prompt and the comment text
    setTimeout(() => {
      const generated = `¡Hola ${selectedComment.authorName}! Qué alegría saludarte. ${
        selectedComment.text.toLowerCase().includes('precio') || selectedComment.text.toLowerCase().includes('cuánto') || selectedComment.text.toLowerCase().includes('cuesta')
          ? 'Este producto tiene un súper precio de preventa de $149,900 COP.'
          : 'Claro que sí, está disponible para entrega inmediata.'
      } Contamos con envío GRATIS y Pago Contra Entrega para toda Colombia a través de Dropi. 📦🇨🇴 Haz clic en el link de nuestro perfil para finalizar tu compra por WhatsApp. ¡Te esperamos!`;

      setComments(prev => prev.map(c => {
        if (c.id === selectedComment.id) {
          return {
            ...c,
            aiSuggestedReply: generated
          };
        }
        return c;
      }));

      setReplyInput(generated);
      setGeneratingAIId(null);
    }, 1200);
  };

  const handleSimulateIncoming = (e: React.FormEvent) => {
    e.preventDefault();
    if (!simName.trim() || !simText.trim()) return;

    const newCommentId = `c-sim-${Date.now()}`;
    const newComment: Comment = {
      id: newCommentId,
      authorName: simName,
      authorAvatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(simName)}&background=random&color=fff`,
      platform: simPlatform,
      postTitle: simPost,
      text: simText,
      timestamp: 'Ahora mismo',
      status: 'pendiente',
      aiSuggestedReply: `¡Hola ${simName}! Muchas gracias por tu interés en ${simPost}. Claro que sí, lo manejamos con envío gratis y pago contra entrega 100% confiable. ¿Te gustaría agendar tu pedido por WhatsApp hoy mismo? 👇✨`
    };

    setComments(prev => [newComment, ...prev]);
    setSelectedCommentId(newCommentId);
    setSimName('');
    setSimText('');
    setShowSimulator(false);

    // Play a smooth visual notification
    alert(`🔔 Nuevo comentario simulado en ${simPlatform.toUpperCase()} de ${simName}`);
  };

  // Helper counters
  const pendingCount = comments.filter(c => c.status === 'pendiente').length;
  const facebookPending = comments.filter(c => c.platform === 'facebook' && c.status === 'pendiente').length;
  const instagramPending = comments.filter(c => c.platform === 'instagram' && c.status === 'pendiente').length;
  const tiktokPending = comments.filter(c => c.platform === 'tiktok' && c.status === 'pendiente').length;

  return (
    <div className="space-y-6 animate-fade-in text-gray-200 text-left">

      {/* Top Header Row */}
      <div className="bg-[#0c0c0c] border border-gray-800 rounded-2xl p-6 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
          <MessageSquare size={120} />
        </div>
        <div className="max-w-2xl relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>
            <h3 className="text-lg font-bold text-white">Bandeja Omnicanal de Comentarios de Redes Sociales</h3>
          </div>
          <p className="text-sm text-gray-400">
            Responde los comentarios públicos de tus anuncios y posts orgánicos en Facebook, Instagram y TikTok. Genera respuestas automáticas o personalizadas con IA para dirigir clientes calificados hacia tu canal de WhatsApp o página de ventas.
          </p>
        </div>

        <button
          onClick={() => setShowSimulator(true)}
          className="relative z-10 bg-gold hover:bg-yellow-400 text-black font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-gold/10 shrink-0 self-start md:self-center"
        >
          <Plus size={14} /> Crear Comentario de Prueba
        </button>
      </div>

      {/* API Configuration & Rules (Collapsible Drawer/Section) */}
      <div className="bg-[#090909] border border-gray-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <Settings size={16} className="text-gold" /> Configuración de Respuestas Automáticas con IA
          </h4>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={autoReplyEnabled}
              onChange={() => setAutoReplyEnabled(!autoReplyEnabled)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-gray-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-300 after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
            <span className="ml-2 text-xs font-medium text-gray-300">{autoReplyEnabled ? 'Auto-IA Activo' : 'Auto-IA Pausado'}</span>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-2">
            <label className="block text-[11px] text-gray-400 font-bold uppercase tracking-wider">Instrucciones del Copiloto IA de Comentarios</label>
            <textarea
              value={autoReplyPrompt}
              onChange={(e) => setAutoReplyPrompt(e.target.value)}
              rows={3}
              placeholder="Instrucciones para generar respuestas..."
              className="w-full bg-[#111] border border-gray-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-gold resize-none leading-relaxed"
            />
          </div>

          <div className="bg-[#0c0c0c] border border-gray-800/80 p-4 rounded-xl space-y-2 flex flex-col justify-center">
            <h5 className="text-xs font-bold text-white flex items-center gap-1.5"><Zap size={14} className="text-gold" /> Métricas de Conversión</h5>
            <div className="grid grid-cols-2 gap-2 text-center pt-1">
              <div className="bg-black/40 p-2 rounded border border-gray-900">
                <p className="text-xs text-gray-500 font-medium font-mono">Comments</p>
                <p className="text-lg font-bold text-white font-mono mt-0.5">{comments.length}</p>
              </div>
              <div className="bg-black/40 p-2 rounded border border-gray-900">
                <p className="text-xs text-gray-500 font-medium font-mono">Pendientes</p>
                <p className="text-lg font-bold text-emerald-400 font-mono mt-0.5">{pendingCount}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Connection Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Side: Filter and Feed */}
        <div className="lg:col-span-5 space-y-4 flex flex-col h-[580px]">

          {/* Feed Filter Panel */}
          <div className="bg-[#090909] border border-gray-800 p-3 rounded-2xl flex items-center justify-between gap-2 flex-wrap shrink-0">
            {/* Platform Selection Buttons */}
            <div className="flex gap-1 bg-black p-1 rounded-xl border border-gray-950">
              <button
                onClick={() => setPlatformFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${platformFilter === 'all' ? 'bg-zinc-800 text-white font-semibold border border-zinc-700' : 'text-gray-400 hover:text-white'}`}
              >
                Todos ({comments.length})
              </button>
              <button
                onClick={() => setPlatformFilter('facebook')}
                className={`px-2 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${platformFilter === 'facebook' ? 'bg-zinc-800 text-zinc-200 border border-zinc-700' : 'text-gray-400 hover:text-white'}`}
              >
                <Facebook size={12} /> ({facebookPending})
              </button>
              <button
                onClick={() => setPlatformFilter('instagram')}
                className={`px-2 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${platformFilter === 'instagram' ? 'bg-zinc-800 text-zinc-200 border border-zinc-700' : 'text-gray-400 hover:text-white'}`}
              >
                <Instagram size={12} /> ({instagramPending})
              </button>
              <button
                onClick={() => setPlatformFilter('tiktok')}
                className={`px-2 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${platformFilter === 'tiktok' ? 'bg-zinc-800 text-zinc-200 border border-zinc-700' : 'text-gray-400 hover:text-white'}`}
              >
                <Video size={12} /> ({tiktokPending})
              </button>
            </div>

            {/* Status Selector */}
            <div className="flex items-center gap-1.5 bg-black p-1 rounded-xl border border-gray-950">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-lg ${statusFilter === 'all' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'}`}
              >
                Todo
              </button>
              <button
                onClick={() => setStatusFilter('pendiente')}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-lg ${statusFilter === 'pendiente' ? 'bg-zinc-800 text-white border border-zinc-700' : 'text-gray-500 hover:text-gray-300'}`}
              >
                Pendiente
              </button>
              <button
                onClick={() => setStatusFilter('respondido')}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-lg ${statusFilter === 'respondido' ? 'bg-zinc-800 text-white border border-zinc-700' : 'text-gray-500 hover:text-gray-300'}`}
              >
                Respondido
              </button>
            </div>
          </div>

          {/* Feed Content Area */}
          <div className="bg-[#090909] border border-gray-800 rounded-2xl flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
            {filteredComments.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-gray-500">
                <AlertCircle size={32} className="text-gray-600 mb-2" />
                <p className="text-xs">No hay comentarios en este filtro.</p>
              </div>
            ) : (
              filteredComments.map((item) => {
                const isSelected = selectedCommentId === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedCommentId(item.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer relative ${
                      isSelected
                        ? 'bg-gold/5 border-gold shadow-[0_0_12px_rgba(212,175,55,0.08)]'
                        : 'bg-[#0e0e0e] border-gray-800/80 hover:border-gray-700 hover:bg-[#121212]'
                    }`}
                  >
                    {/* Platform indicator badge */}
                    <div className="absolute top-3 right-3 flex items-center gap-1.5">
                      {item.platform === 'facebook' && <span className="p-1 rounded bg-zinc-900 text-zinc-400 border border-zinc-800"><Facebook size={12} /></span>}
                      {item.platform === 'instagram' && <span className="p-1 rounded bg-zinc-900 text-zinc-400 border border-zinc-800"><Instagram size={12} /></span>}
                      {item.platform === 'tiktok' && <span className="p-1 rounded bg-zinc-900 text-zinc-400 border border-zinc-800"><Video size={12} /></span>}
                    </div>

                    <div className="flex gap-3 items-start pr-8">
                      <img
                        src={item.authorAvatar}
                        alt={item.authorName}
                        className="w-8 h-8 rounded-full border border-gray-800 mt-0.5 shrink-0"
                      />
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-white truncate max-w-[150px]">{item.authorName}</span>
                          <span className="text-[9px] text-gray-500 shrink-0">{item.timestamp}</span>
                        </div>
                        <p className="text-[10px] text-gray-400 font-semibold font-mono truncate max-w-[200px]">{item.postTitle}</p>
                        <p className="text-xs text-gray-300 leading-relaxed line-clamp-2 pt-1">
                          "{item.text}"
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-gray-900 text-[10px]">
                      <span className="text-gray-500 font-mono">ID: {item.id}</span>

                      {item.status === 'pendiente' && (
                        <span className="text-[10px] bg-zinc-900 text-zinc-300 px-2 py-0.5 rounded font-medium border border-zinc-800">Pendiente</span>
                      )}
                      {item.status === 'respondido_ia' && (
                        <span className="text-[10px] bg-zinc-900 text-emerald-400 px-2 py-0.5 rounded font-medium border border-zinc-800 flex items-center gap-1"><Bot size={10} /> Respondido IA</span>
                      )}
                      {item.status === 'respondido_manual' && (
                        <span className="text-[10px] bg-zinc-900 text-zinc-300 px-2 py-0.5 rounded font-medium border border-zinc-800">Respondido Manual</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Conversation Workspace & Action Panel */}
        <div className="lg:col-span-7 bg-[#090909] border border-gray-800 rounded-2xl p-6 h-[580px] flex flex-col justify-between">
          {selectedComment ? (
            <div className="flex-1 flex flex-col justify-between h-full space-y-4">

              {/* Upper Section: Comment Details & Origin */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={selectedComment.authorAvatar}
                      alt={selectedComment.authorName}
                      className="w-10 h-10 rounded-full border border-gray-800 shrink-0"
                    />
                    <div>
                      <h4 className="font-bold text-white text-sm">{selectedComment.authorName}</h4>
                      <div className="flex items-center gap-1.5 text-[10px] text-gray-500 mt-0.5">
                        <span className="capitalize font-semibold text-gray-400">{selectedComment.platform} comment</span>
                        <span>•</span>
                        <span>{selectedComment.timestamp}</span>
                      </div>
                    </div>
                  </div>

                  <span className="text-[10px] bg-gray-900 text-gray-400 px-2.5 py-1 rounded-full border border-gray-800 font-mono font-medium">
                    ORIGEN: POST ORGÁNICO
                  </span>
                </div>

                {/* Original Post reference */}
                <div className="bg-[#0e0e0e] border border-gray-850 p-3 rounded-xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {selectedComment.postImage && (
                      <img
                        src={selectedComment.postImage}
                        alt="Post visual"
                        className="w-10 h-10 object-cover rounded border border-gray-950 shrink-0"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">Post de Referencia</p>
                      <p className="text-xs font-bold text-white truncate">{selectedComment.postTitle}</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-gold cursor-pointer hover:underline flex items-center gap-1 shrink-0 font-medium">Ver Publicación</span>
                </div>

                {/* Comment Bubble representation */}
                <div className="bg-[#111] border border-gray-800 p-4 rounded-xl relative">
                  <div className="absolute top-2 left-2 text-[10px] font-mono text-gray-600">PREGUNTA DEL CLIENTE:</div>
                  <p className="text-sm text-gray-200 mt-3 italic pl-1 leading-relaxed">
                    "{selectedComment.text}"
                  </p>
                </div>

                {/* Reply display if already replied */}
                {selectedComment.replyText && (
                  <div className="bg-emerald-950/20 border border-emerald-500/20 p-4 rounded-xl space-y-2">
                    <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                      <Check size={12} /> RESPUESTA ENVIADA:
                    </p>
                    <p className="text-xs text-gray-300 leading-relaxed font-sans pl-1">
                      {selectedComment.replyText}
                    </p>
                  </div>
                )}
              </div>

              {/* Lower Section: Action area (Input box + Copilot) */}
              <div className="space-y-4">

                {/* AI suggestion panel */}
                {!selectedComment.replyText && (
                  <div className="bg-gradient-to-r from-blue-950/20 to-blue-950/20 border border-blue-500/20 rounded-xl p-4 space-y-2 relative">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-bold text-white flex items-center gap-1.5 text-blue-300">
                        <Sparkles size={14} className="text-blue-400" /> Copiloto AI Generador de Respuestas
                      </h5>
                      <button
                        type="button"
                        disabled={generatingAIId !== null}
                        onClick={handleGenerateAISuggestion}
                        className="text-[10px] bg-blue-600 hover:bg-blue-500 text-white font-bold px-2.5 py-1 rounded transition flex items-center gap-1 shrink-0 shadow-sm shadow-blue-600/10"
                      >
                        {generatingAIId ? <RefreshCw size={10} className="animate-spin" /> : <RefreshCw size={10} />}
                        Generar Sugerencia
                      </button>
                    </div>

                    {selectedComment.aiSuggestedReply ? (
                      <div className="space-y-2 animate-fade-in">
                        <p className="text-xs text-gray-300 bg-black/30 p-2.5 rounded-lg leading-relaxed border border-blue-950 font-sans">
                          {selectedComment.aiSuggestedReply}
                        </p>
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => setReplyInput(selectedComment.aiSuggestedReply || '')}
                            className="text-[10px] text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1"
                          >
                            Usar esta respuesta
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[10px] text-gray-500">
                        Haz clic en Generar Sugerencia para que la IA lea tu base de entrenamiento y redacte la respuesta perfecta en segundos.
                      </p>
                    )}
                  </div>
                )}

                {/* Quick select templates */}
                {!selectedComment.replyText && (
                  <div className="space-y-1.5">
                    <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">Plantillas Rápidas de un Clic</p>
                    <div className="flex flex-wrap gap-1.5">
                      {quickTemplates.map((tpl, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setReplyInput(tpl.text)}
                          className="text-[10px] bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-400 rounded-lg px-2.5 py-1 transition"
                        >
                          {tpl.title}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Input area */}
                <div className="space-y-2">
                  {selectedComment.replyText ? (
                    <div className="text-center p-4 bg-gray-900/40 border border-gray-850 rounded-xl text-gray-400 text-xs">
                      Esta conversación ya ha sido respondida. Puedes redactar una nueva respuesta si deseas actualizarla.
                      <button
                        type="button"
                        onClick={() => {
                          setComments(prev => prev.map(c => c.id === selectedCommentId ? { ...c, replyText: undefined } : c));
                        }}
                        className="text-gold hover:underline block mt-2 mx-auto font-bold"
                      >
                        Volver a Responder
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <textarea
                        value={replyInput}
                        onChange={(e) => setReplyInput(e.target.value)}
                        placeholder="Redactar respuesta pública al cliente..."
                        rows={3}
                        className="w-full bg-[#111] border border-gray-800 rounded-xl p-3 pr-12 text-xs text-white focus:outline-none focus:border-gold resize-none leading-relaxed"
                      />
                      <div className="absolute bottom-2.5 right-2 flex gap-1">
                        <button
                          onClick={() => handleSendReply('respondido_manual')}
                          className="bg-gold hover:bg-yellow-400 text-black p-2 rounded-xl transition flex items-center justify-center shadow-lg shadow-gold/10"
                          title="Enviar como respuesta manual"
                        >
                          <Send size={14} />
                        </button>
                      </div>
                    </div>
                  )}

                  {!selectedComment.replyText && (
                    <div className="flex items-center justify-between text-[10px] text-gray-500">
                      <span className="flex items-center gap-1"><Clock size={11} /> Tu respuesta se publicará en tiempo real en la red social del cliente</span>
                      <button
                        type="button"
                        onClick={() => handleSendReply('respondido_ia')}
                        className="text-gold hover:underline font-bold flex items-center gap-1"
                      >
                        <Bot size={11} /> Publicar con IA
                      </button>
                    </div>
                  )}
                </div>

              </div>

            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center text-gray-500">
              <MessageSquare size={48} className="text-gray-600 mb-2" />
              Selecciona un comentario para ver el workspace completo.
            </div>
          )}
        </div>

      </div>

      {/* Test Comment Modal Backdrop */}
      {showSimulator && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-[#0a0a0a] border border-gray-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl relative text-left">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Plus size={16} className="text-gold" /> Crear Comentario de Prueba
              </h3>
              <button
                onClick={() => setShowSimulator(false)}
                className="text-gray-500 hover:text-white transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSimulateIncoming} className="space-y-4">
              <div>
                <label className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1.5">Red Social de Destino</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSimPlatform('facebook')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1.5 ${simPlatform === 'facebook' ? 'bg-blue-600/10 border-blue-500/40 text-blue-400' : 'bg-transparent border-gray-850 text-gray-400'}`}
                  >
                    <Facebook size={16} /> Facebook
                  </button>
                  <button
                    type="button"
                    onClick={() => setSimPlatform('instagram')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1.5 ${simPlatform === 'instagram' ? 'bg-blue-600/10 border-blue-500/40 text-blue-400' : 'bg-transparent border-gray-850 text-gray-400'}`}
                  >
                    <Instagram size={16} /> Instagram
                  </button>
                  <button
                    type="button"
                    onClick={() => setSimPlatform('tiktok')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1.5 ${simPlatform === 'tiktok' ? 'bg-blue-600/10 border-blue-500/40 text-blue-400' : 'bg-transparent border-gray-850 text-gray-400'}`}
                  >
                    <Video size={16} /> TikTok
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Nombre del Cliente</label>
                <input
                  type="text"
                  required
                  value={simName}
                  onChange={(e) => setSimName(e.target.value)}
                  placeholder="Ej. Mateo Restrepo"
                  className="w-full bg-[#111] border border-gray-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-gold"
                />
              </div>

              <div>
                <label className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Publicación</label>
                <select
                  value={simPost}
                  onChange={(e) => setSimPost(e.target.value)}
                  className="w-full bg-[#111] border border-gray-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-gold"
                >
                  <option value="⌚ Smartwatch Ultra T900 - ¡Llegó el más pedido!">⌚ Smartwatch Ultra T900 - ¡Llegó el más pedido!</option>
                  <option value="🔥 Oferta Loca: Paga 1 y Lleva 2 Audífonos Pro">🔥 Oferta Loca: Paga 1 y Lleva 2 Audífonos Pro</option>
                  <option value="📦 Abriendo el contenedor de MasterShop - Stock Listo">📦 Abriendo el contenedor de MasterShop - Stock Listo</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Comentario del Cliente</label>
                <textarea
                  required
                  value={simText}
                  onChange={(e) => setSimText(e.target.value)}
                  placeholder="Ej. ¿Cuánto vale con envío a Medellín?"
                  rows={3}
                  className="w-full bg-[#111] border border-gray-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-gold resize-none"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSimulator(false)}
                  className="flex-1 py-2.5 border border-gray-850 hover:bg-gray-900 text-gray-400 rounded-xl text-xs font-bold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-gold hover:bg-yellow-400 text-black rounded-xl text-xs font-bold transition"
                >
                  Crear Comentario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

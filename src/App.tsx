import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Bot, Lightbulb, Image as ImageIcon, Layout, Megaphone, Smartphone, Settings as SettingsIcon, Menu, X, ArrowRight, ShieldCheck, ChevronRight, Network, Link, Paperclip, Mic, FileImage, Video, FileAudio, Users, Share2, LogOut, GraduationCap, Package, ShoppingCart, BarChart3, HeartHandshake, Send, Calendar, QrCode, Database, MessageCircle, MessageSquare, FileText, Zap, TrendingUp, Sparkles, Flame, Search, Calculator, MonitorPlay, Eye, Bell, CheckCircle, Sun, Moon, PanelLeft, PanelLeftClose, FolderKanban, Terminal, Globe, Radio, CreditCard } from 'lucide-react';
import type { ModuleId, AppState } from './types';
import { translations, FlagES, FlagUK, Language, Theme } from './lib/i18n';
import { getCachedWhiteLabel, fetchWhiteLabelConfig, WhiteLabelConfig } from './lib/whitelabel';

import BrandingView from './components/BrandingView';
import MercadoView from './components/MercadoView';
import ContenidoView from './components/ContenidoView';
import AdsView from './components/AdsView';
import WhatsappView from './components/WhatsappView';
import { RecargasView } from './components/RecargasView';
import AutomatizacionesView from './components/AutomatizacionesView';
import DashboardMetrics from './components/DashboardMetrics';
import ComunidadView from './components/ComunidadView';
import UsuariosView from './components/UsuariosView';
import LoginView from './components/LoginView';
import RegisterView from './components/RegisterView';
import EntrenamientoView from './components/EntrenamientoView';
import ProveedoresView from './components/ProveedoresView';
import LandingView from './components/LandingView';
import IntegracionesView from './components/IntegracionesView';
import OrganigramaView from './components/OrganigramaView';
import EditorVideo from './components/EditorVideo';
import LlamadasView from './components/LlamadasView';
import EmailMarketingView from './components/EmailMarketingView';
import ConfiguracionGeneralView from './components/ConfiguracionGeneralView';
import ProyectosView from './components/ProyectosView';
import LiveSellingView from './components/LiveSellingView';
import HerramientasTarjetasView from './components/HerramientasTarjetasView';

export default function App() {
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem('app_lang') as Language) || 'es');
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('app_theme') as Theme) || 'dark');
  const [showNotifications, setShowNotifications] = useState(false);
  const [whiteLabel, setWhiteLabel] = useState<WhiteLabelConfig>(getCachedWhiteLabel());

  const t = translations[language];

  useEffect(() => {
    fetchWhiteLabelConfig().then(cfg => {
      if (cfg) setWhiteLabel(cfg);
    });

    const handleUpdate = (e: any) => {
      if (e.detail) setWhiteLabel(e.detail);
    };
    window.addEventListener('whitelabel-updated', handleUpdate);
    return () => window.removeEventListener('whitelabel-updated', handleUpdate);
  }, []);

  useEffect(() => {
    if (whiteLabel.brandName) {
      document.title = `${whiteLabel.brandName} | Marketing & Ventas AI`;
    }
  }, [whiteLabel.brandName]);

  useEffect(() => {
    localStorage.setItem('app_theme', theme);
    if (theme === 'light') {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    }
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('app_lang', language);
  }, [language]);

  const [currentView, setCurrentView] = useState<'login' | 'register' | 'app'>(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.has('ref') || window.location.pathname.includes('/join/')) return 'register';
      const emailParam = searchParams.get('email');
      const autoLogin = searchParams.get('auto_login');
      const paymentStatus = searchParams.get('payment_status');
      if (emailParam && (autoLogin === '1' || autoLogin === 'true' || paymentStatus === 'completed')) {
        return 'app';
      }
      const cached = localStorage.getItem('xorbit_user');
      if (cached) return 'app';
    } catch (_) {}
    return 'login';
  });
  const [activeWhatsappTab, setActiveWhatsappTab] = useState('conversaciones');
  const [activeLlamadasTab, setActiveLlamadasTab] = useState('campanas');
  const [activeEmailTab, setActiveEmailTab] = useState('flujos');
  const [activeContenidoTab, setActiveContenidoTab] = useState<'crear' | 'planificador' | 'clonador' | 'analizar' | 'editor_video'>('crear');
  const [activeBrandingTab, setActiveBrandingTab] = useState<'entrevista' | 'identidad' | 'manual' | 'creativos'>('entrevista');
  const [activeMercadoTab, setActiveMercadoTab] = useState<'publico' | 'tendencias' | 'competidores' | 'ia_ideas' | 'productos_ganadores' | 'calculadora' | 'multi_recomendador'>('publico');
  const [activeLandingTab, setActiveLandingTab] = useState<'plantillas' | 'rastreador'>('plantillas');
  const [activeAdsTab, setActiveAdsTab] = useState<'traffiker' | 'metricas'>('traffiker');
  const [dashboardTab, setDashboardTab] = useState<'metrics' | 'organigrama'>('organigrama');
  const [recommenderChatSession, setRecommenderChatSession] = useState<{
    recommenderId: string;
    currentQuestionIdx: number;
    answers: { [qId: string]: string };
  } | null>(null);
  
  const [user, setUser] = useState<{name: string, role: string, email: string, plan?: string, username?: string, phone?: string} | null>(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const emailParam = searchParams.get('email');
      const autoLogin = searchParams.get('auto_login');
      const paymentStatus = searchParams.get('payment_status');
      if (emailParam && (autoLogin === '1' || autoLogin === 'true' || paymentStatus === 'completed')) {
        const u = {
          name: searchParams.get('name') || emailParam.split('@')[0],
          email: emailParam,
          role: 'droshipper',
          plan: 'Paquete Pro',
          username: (searchParams.get('name') || emailParam.split('@')[0]).toLowerCase().replace(/[^a-zA-Z0-9_-]/g, ''),
          phone: searchParams.get('phone') || ''
        };
        localStorage.setItem('xorbit_user', JSON.stringify(u));
        return u;
      }
      const cached = localStorage.getItem('xorbit_user');
      if (cached) return JSON.parse(cached);
    } catch (_) {}
    return null;
  });

  useEffect(() => {
    const userEmail = user?.email;
    const userPlan = user?.plan;
    if (userEmail && !userPlan) {
      let isMounted = true;
      (async () => {
        try {
          const cleanEmail = encodeURIComponent(userEmail.trim());
          const res = await fetch(`/api/comunidad/user-plan/${cleanEmail}`);
          if (res.ok) {
            const data = await res.json();
            if (isMounted && data && data.plan) {
              setUser(prev => (prev && prev.email === userEmail ? { ...prev, plan: data.plan } : prev));
              return;
            }
          }
        } catch (err: any) {
          // Gracefully fallback on network or URL resolution limits
          console.warn("User plan check note:", err?.message || err);
        }
        if (isMounted) {
          setUser(prev => (prev && prev.email === userEmail && !prev.plan ? { ...prev, plan: 'Gratuito' } : prev));
        }
      })();
      return () => {
        isMounted = false;
      };
    }
  }, [user?.email, user?.plan]);

  const [activeModule, setActiveModule] = useState<ModuleId | 'dashboard'>('herramientas');
  const isInsideTool = ['whatsapp', 'llamadas', 'email', 'contenido', 'branding', 'mercado', 'landing', 'ads', 'live_selling'].includes(activeModule);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['herramientas', 'configuracion']);

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => 
      prev.includes(groupName) ? prev.filter(g => g !== groupName) : [...prev, groupName]
    );
  };
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [hiddenItems, setHiddenItems] = useState<string[]>([]); // Tracks hidden modules and submodules
  const [isEditingSidebar, setIsEditingSidebar] = useState(false);

  const toggleVisibility = (id: string) => {
    setHiddenItems(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleNicheChange = React.useCallback((niche: string) => {
    setHiddenItems(prev => {
      const currentHidden = [...prev];
      let newHidden = currentHidden.filter(id => !['pedidos', 'citas', 'catalogo'].includes(id));
      if (niche === 'Restaurante / Comida Rápida') {
        newHidden.push('citas', 'catalogo');
      } else if (niche === 'Networkers / Afiliados' || niche === 'Servicios / Consultoría' || niche === 'Salud / Estética') {
        newHidden.push('pedidos', 'catalogo');
      } else if (niche === 'E-Commerce (Venta de Productos)') {
        newHidden.push('citas');
      } else if (niche === 'Hotel / Hospedaje') {
        newHidden.push('pedidos', 'catalogo');
      }
      
      // Only update if there's an actual difference to prevent infinite loops
      if (currentHidden.length === newHidden.length && currentHidden.every(v => newHidden.includes(v))) {
        return prev;
      }
      return newHidden;
    });
  }, []);
  const [chatOpen, setChatOpen] = useState(false);

  // Auto-close sidebar on mobile load
  useEffect(() => {
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  }, []);
  const [appState, setAppState] = useState<AppState>({
    companyName: '',
    niche: '',
    productDescription: '',
    marketInsights: [],
    contents: []
  });
  
type ChatMessage = {
  role: 'user'|'assistant';
  text: string;
  attachment?: {
    type: 'image' | 'video' | 'audio' | 'document';
    url: string;
    name: string;
  };
  isSetupForm?: 'whatsapp' | 'business' | 'integration' | 'custom';
};

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'assistant', text: '¡Hola! Soy tu Agente Expert 360°, tu Mentor & Copiloto IA. 🚀\n\nEstoy aquí para ayudarte a configurar y escalar tu negocio paso a paso. ¿Qué quieres configurar o lanzar hoy?\n\n• "Quiero configurar mi Bot de WhatsApp para automatizar respuestas"\n• "Ayúdame a estructurar una Landing Page de ventas"\n• "Lanzar campaña en Meta Ads"' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [pendingAttachment, setPendingAttachment] = useState<ChatMessage['attachment'] | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.lang = 'es-ES';
      recognition.interimResults = false;
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setChatInput(transcript);
        setIsListening(false);
        // Process the transcript directly
        processVoiceCommand(transcript);
      };
      
      recognition.onend = () => {
        setIsListening(false);
      };
      
      recognitionRef.current = recognition;
    }
  }, []);

  const getNextModule = (text: string): { module: ModuleId | 'dashboard', response: string, formType?: ChatMessage['isSetupForm'] } => {
      const lowerInput = text.toLowerCase();

      // Check for live chat workspace customization (e.g., "ocultar módulo llamadas" or "mostrar whatsapp")
      if (lowerInput.includes('ocultar') || lowerInput.includes('oculta') || lowerInput.includes('quitar') || lowerInput.includes('quita')) {
        if (lowerInput.includes('llamada') || lowerInput.includes('voz')) {
          toggleVisibility('llamadas');
          return { module: activeModule, response: '✅ ¡Hecho! He ocultado el módulo de **Llamadas e IA de Voz** de tu barra lateral.' };
        }
        if (lowerInput.includes('email')) {
          toggleVisibility('email');
          return { module: activeModule, response: '✅ ¡Hecho! He ocultado el módulo de **Email Marketing** de tu barra lateral.' };
        }
        if (lowerInput.includes('comunidad')) {
          toggleVisibility('comunidad');
          return { module: activeModule, response: '✅ ¡Hecho! He ocultado el módulo de **Comunidad** de tu barra lateral.' };
        }
        if (lowerInput.includes('entrenamiento') || lowerInput.includes('universidad')) {
          toggleVisibility('entrenamiento');
          return { module: activeModule, response: '✅ ¡Hecho! He ocultado el módulo de **Universidad & Entrenamiento** de tu barra lateral.' };
        }
      }

      if (lowerInput.includes('mostrar') || lowerInput.includes('muestra') || lowerInput.includes('activar') || lowerInput.includes('activa')) {
        if (lowerInput.includes('llamada') || lowerInput.includes('voz')) {
          setHiddenItems(prev => prev.filter(i => i !== 'llamadas'));
          return { module: activeModule, response: '✅ ¡Hecho! He vuelto a activar el módulo de **Llamadas e IA de Voz** en tu barra lateral.' };
        }
      }
      
      if (lowerInput.includes('configurar negocio') || lowerInput.includes('personalizar negocio') || lowerInput.includes('propósito') || lowerInput.includes('tipo de negocio')) {
        return { module: activeModule, response: 'Iniciando asistente de configuración de negocio...', formType: 'business' };
      }

      if (lowerInput.includes('configurar whatsapp') || lowerInput.includes('asistente de whatsapp')) {
        return { module: activeModule, response: 'Iniciando configuración rápida del Bot de WhatsApp...', formType: 'whatsapp' };
      }

      if (lowerInput.includes('hacer una integración') || lowerInput.includes('configurar integración')) {
        return { module: activeModule, response: 'Iniciando configuración rápida de integración...', formType: 'integration' };
      }

      const foundModule = allModules.find(m => lowerInput.includes(m.label.toLowerCase()));
      
      if (foundModule) {
          return { module: foundModule.id, response: `¡Claro! Te llevo al módulo de ${foundModule.label}.` };
      } 
      
      if (lowerInput.includes('automatizar') || lowerInput.includes('flujo') || lowerInput.includes('tarea')) {
          return { module: 'automatizaciones', response: 'Vamos al módulo de Automatizaciones para configurar tus flujos.' };
      } 
      
      if (lowerInput.includes('whatsapp') || lowerInput.includes('chatbot') || lowerInput.includes('bot')) {
          return { module: 'whatsapp', response: 'Llevándote al módulo de WhatsApp Bot para configurar tus reglas y prompts.' };
      } 
      
      if (lowerInput.includes('landing') || lowerInput.includes('página')) {
          return { module: 'landing', response: 'Llevándote al constructor de Landing Pages.' };
      } 
      
      if (lowerInput.includes('contenido') || lowerInput.includes('publicación')) {
          return { module: 'contenido', response: 'Vamos a crear contenido increíble en el módulo de Contenido.' };
      }
      
      if (lowerInput.includes('video') || lowerInput.includes('editar')) {
          return { module: 'contenido', response: 'Llevándote al Editor de Video.' };
      }

      if (lowerInput.includes('mcp') || lowerInput.includes('api') || lowerInput.includes('webhook')) {
          return { module: 'mcp_api', response: 'Llevándote al módulo de MCP y API para gestionar endpoints, claves y webhooks.' };
      }

      if (lowerInput.includes('dominio') || lowerInput.includes('marca blanca') || lowerInput.includes('whitelabel')) {
          return { module: 'dominio', response: 'Llevándote a la gestión de Dominio Personalizado y Marca Propia.' };
      }

      return { module: activeModule, response: 'Entendido. ¿En qué más puedo ayudarte hoy?' };
  };

  const processVoiceCommand = (text: string) => {
    const { module: nextModule, response: aiResponseText, formType } = getNextModule(text);

    setChatMessages(prev => [...prev, {
       role: 'user', 
       text: text
    }, {
       role: 'assistant', 
       text: aiResponseText,
       isSetupForm: formType
    }]);
    setActiveModule(nextModule);
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const configModules = [
    { id: 'configuracion_general' as ModuleId, label: t.configuracionGeneral, icon: <SettingsIcon size={18} /> },
    { id: 'mcp_api' as ModuleId, label: t.mcp_api || 'MCP y API', icon: <Terminal size={18} /> },
    { id: 'dominio' as ModuleId, label: t.dominio || 'Dominio Personalizado', icon: <Globe size={18} /> },
    { id: 'usuarios' as ModuleId, label: t.usuarios, icon: <Users size={18} />, reqRole: ['superadmin', 'admin'] },
    { id: 'automatizaciones' as ModuleId, label: t.automatizaciones, icon: <Network size={18} /> },
    { id: 'integraciones' as ModuleId, label: t.integraciones, icon: <Link size={18} /> },
  ];

  const mainModules = [
    { id: 'branding' as ModuleId, label: t.branding, icon: <Bot size={18} /> },
    { id: 'mercado' as ModuleId, label: t.mercado, icon: <Lightbulb size={18} /> },
    { id: 'contenido' as ModuleId, label: t.contenido, icon: <ImageIcon size={18} /> },
    { id: 'landing' as ModuleId, label: t.landing, icon: <Layout size={18} /> },
    { id: 'ads' as ModuleId, label: t.ads, icon: <Megaphone size={18} /> },
    { id: 'live_selling' as ModuleId, label: t.live_selling || 'Live Selling', icon: <Radio size={18} className="text-red-400" /> },
    { id: 'whatsapp' as ModuleId, label: t.whatsapp, icon: <Smartphone size={18} /> },
    { id: 'comunidad' as ModuleId, label: t.comunidad, icon: <Share2 size={18} /> },
    { id: 'entrenamiento' as ModuleId, label: t.entrenamiento, icon: <GraduationCap size={18} /> },
    { id: 'proveedores' as ModuleId, label: t.proveedores, icon: <Package size={18} /> },
    { id: 'llamadas' as ModuleId, label: t.llamadas, icon: <Mic size={18} /> },
    { id: 'email' as ModuleId, label: t.email, icon: <Send size={18} /> },
  ];

  const allModules = [...mainModules, ...configModules];

  // Filtramos módulos según el rol del usuario (ej. Droshipper no ve Usuarios y Roles)
  const filteredMainModules = mainModules.filter((m: any) => !m.reqRole || (user && m.reqRole.includes(user.role)));
  const filteredConfigModules = configModules.filter((m: any) => !m.reqRole || (user && m.reqRole.includes(user.role)));
  const modules = [...filteredMainModules, ...filteredConfigModules];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    let type: 'image' | 'video' | 'audio' | 'document' = 'document';
    if (file.type.startsWith('image/')) type = 'image';
    else if (file.type.startsWith('video/')) type = 'video';
    else if (file.type.startsWith('audio/')) type = 'audio';

    const url = URL.createObjectURL(file);
    setPendingAttachment({ type, url, name: file.name });
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() && !pendingAttachment) return;
    
    const userMsgText = chatInput;
    const newChat: ChatMessage[] = [...chatMessages, { role: 'user' as const, text: userMsgText, attachment: pendingAttachment }];
    setChatMessages(newChat);
    setChatInput('');
    setPendingAttachment(undefined);
    
    // Simulate AI thinking and filling modules or processing multi-recommender questionnaire
    setTimeout(() => {
      // 1. Is there an active recommender questionnaire session?
      if (recommenderChatSession) {
        const storedRecs = localStorage.getItem('crm_multi_recommenders');
        let recommendersList: any[] = [];
        if (storedRecs) {
          try { recommendersList = JSON.parse(storedRecs); } catch(err) {}
        }
        
        const rec = recommendersList.find(r => r.id === recommenderChatSession.recommenderId);
        if (rec && rec.questions && rec.questions.length > 0) {
          const qIdx = recommenderChatSession.currentQuestionIdx;
          const currentQuestion = rec.questions[qIdx];
          const inputLower = userMsgText.toLowerCase().trim();
          
          // Match input to option
          let matchedOpt = currentQuestion.options.find((opt: any, oIdx: number) => {
            const numStr = (oIdx + 1).toString();
            return inputLower === numStr || 
                   inputLower.startsWith(numStr + ".") || 
                   inputLower.startsWith(numStr + ")") ||
                   inputLower.includes("opción " + numStr) || 
                   inputLower.includes("opcion " + numStr);
          });
          
          if (!matchedOpt) {
            matchedOpt = currentQuestion.options.find((opt: any) => {
              const words = opt.text.toLowerCase().replace(/[^a-záéíóúñ\s]/g, '').split(/\s+/).filter((w: string) => w.length > 2);
              return words.some((word: string) => inputLower.includes(word));
            });
          }
          
          if (!matchedOpt) {
            matchedOpt = currentQuestion.options.find((opt: any) => opt.text.toLowerCase().includes(inputLower) || inputLower.includes(opt.text.toLowerCase()));
          }
          
          if (matchedOpt) {
            const newAnswers = { ...recommenderChatSession.answers, [currentQuestion.id]: matchedOpt.id };
            const nextIdx = qIdx + 1;
            
            if (nextIdx < rec.questions.length) {
              // Ask next question
              const nextQuestion = rec.questions[nextIdx];
              setRecommenderChatSession({
                ...recommenderChatSession,
                currentQuestionIdx: nextIdx,
                answers: newAnswers
              });
              
              setChatMessages(prev => [...prev, {
                role: 'assistant',
                text: `¡Entendido! Selección registrada: **"${matchedOpt.text}"**.\n\nSiguiente pregunta:\n\n👉 **${nextQuestion.text}**\n\nResponde indicando el número:\n${nextQuestion.options.map((opt: any, oIdx: number) => `${oIdx + 1}. **${opt.text}**`).join('\n')}`
              }]);
            } else {
              // End of session! Evaluate rule
              setRecommenderChatSession(null);
              
              let matchedProduct: any = null;
              let isExactMatch = false;
              for (const rule of rec.rules) {
                const conditionEntries = Object.entries(rule.conditions);
                if (conditionEntries.length === 0) continue;
                const allMet = conditionEntries.every(([qId, optId]) => newAnswers[qId] === optId);
                if (allMet) {
                  const storedProds = localStorage.getItem('crm_products');
                  if (storedProds) {
                    try {
                      const parsedProds = JSON.parse(storedProds);
                      matchedProduct = parsedProds.find((p: any) => p.id === rule.recommendProductId);
                      if (matchedProduct) {
                        isExactMatch = true;
                      }
                    } catch(err) {}
                  }
                  break;
                }
              }
              
              if (isExactMatch && matchedProduct) {
                setChatMessages(prev => [...prev, {
                  role: 'assistant',
                  text: `🎉 **¡Recomendación Inteligente Generada!**\n\nAnalizando tus respuestas, el producto ideal en nuestro catálogo es:\n\n📦 **${matchedProduct.name}**\n💵 **Precio:** $${matchedProduct.price.toLocaleString()} COP\n\n💡 **Razón:** ${matchedProduct.matchReason || 'Está formulado especialmente para cumplir con las especificaciones de tu perfil.'}\n\n📝 **Descripción:** ${matchedProduct.description}\n\n*¿Te gustaría que te ayude a crear una orden de compra contra entrega ahora mismo?*`
                }]);
              } else {
                setChatMessages(prev => [...prev, {
                  role: 'assistant',
                  text: `⚠️ **No se encontró ningún producto que coincida exactamente con las condiciones de tus respuestas.**\n\nPor favor, te sugerimos **verificar las reglas de asignación configuradas** en el panel de administración del multirecomendador para asegurar que todas las combinaciones de respuestas posibles estén correctamente vinculadas a un producto del catálogo.`
                }]);
              }
            }
          } else {
            // Did not match any option
            setChatMessages(prev => [...prev, {
              role: 'assistant',
              text: `Hmm, no estoy seguro de cuál opción elegiste. Por favor responde indicando el número (ej. **1** o **2**) o escribiendo la opción correcta:\n\n👉 **${currentQuestion.text}**\n\n${currentQuestion.options.map((opt: any, oIdx: number) => `${oIdx + 1}. **${opt.text}**`).join('\n')}`
            }]);
          }
          return;
        }
      }

      // 2. If NO active session, check if input matches any multi-recommender keyword
      const storedRecs = localStorage.getItem('crm_multi_recommenders');
      let matchedRec: any = null;
      if (storedRecs) {
        try {
          const recommendersList = JSON.parse(storedRecs);
          matchedRec = recommendersList.find((r: any) => {
            const kw = r.keyword.toLowerCase();
            return userMsgText.toLowerCase().includes(kw);
          });
        } catch(err) {}
      }
      
      if (matchedRec && matchedRec.questions && matchedRec.questions.length > 0) {
        setRecommenderChatSession({
          recommenderId: matchedRec.id,
          currentQuestionIdx: 0,
          answers: {}
        });
        
        setChatMessages(prev => [...prev, {
          role: 'assistant',
          text: `👋 ¡Hola! He detectado tu interés en **${matchedRec.name}**.\n\nPara asesorarte de manera experta y recomendarte la variante ideal del inventario, por favor responde esta primera pregunta:\n\n👉 **${matchedRec.questions[0].text}**\n\nResponde con el número de tu opción (ej. **1**):\n${matchedRec.questions[0].options.map((opt: any, oIdx: number) => `${oIdx + 1}. **${opt.text}**`).join('\n')}`
        }]);
        return;
      }

      // 3. Fallback to normal navigation / assistance
      const { module: nextModule, response: aiResponseText, formType } = getNextModule(userMsgText);
      setChatMessages(prev => [...prev, {
         role: 'assistant', 
         text: aiResponseText,
         isSetupForm: formType
      }]);
      setActiveModule(nextModule);
    }, 1000);
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem('xorbit_user');
    } catch (_) {}
    setUser(null);
    setCurrentView('login');
  };

  if (!user || currentView === 'login') {
    return (
      <LoginView 
        onLogin={(loggedInUser) => { 
          setUser(loggedInUser); 
          setCurrentView('app'); 
        }} 
        onGoToRegister={() => {
          window.open('https://xorbit360.com', '_blank');
        }} 
      />
    );
  }

  if (currentView === 'register') {
    const searchParams = new URLSearchParams(window.location.search);
    const initialRef = searchParams.get('ref') || '';
    return (
      <RegisterView 
        initialReferral={initialRef}
        onRegisterSuccess={(registeredUser) => { 
          setUser(registeredUser); 
          setCurrentView('app'); 
          setActiveModule('dashboard'); if (window.innerWidth < 768) setIsSidebarOpen(false); 
        }} 
        onGoToLogin={() => setCurrentView('login')} 
      />
    );
  }

  return (
    <div className="flex h-screen bg-black text-gray-100 overflow-hidden font-sans">
      
      {/* Sidebar Mobile Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-20 md:hidden" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed z-30 md:relative flex-shrink-0 w-64 h-full panel border-r transition-all duration-300 ${isSidebarOpen ? 'translate-x-0 md:ml-0' : '-translate-x-full md:-ml-64'} flex flex-col`}>
        <div className="p-6 border-b border-gray-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 overflow-hidden flex-1 mr-2">
            {whiteLabel.logoUrl ? (
              <img 
                src={whiteLabel.logoUrl} 
                alt="Logo" 
                className="w-8 h-8 rounded object-contain bg-black/40 border border-gold/30 p-0.5 shrink-0 shadow-md shadow-gold/10" 
              />
            ) : (
              <div className="w-8 h-8 rounded bg-gold flex items-center justify-center font-bold text-black font-display shadow-lg shadow-gold/20 shrink-0">
                {whiteLabel.brandName ? whiteLabel.brandName.charAt(0).toUpperCase() : 'E'}
              </div>
            )}
            <div className="overflow-hidden min-w-0">
              <h1 className="font-bold text-base text-gold leading-tight truncate">
                {whiteLabel.brandName || 'Expert 360°'}
              </h1>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest truncate">
                {whiteLabel.tagline || 'Marketing & Ventas AI'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button className="text-gray-400 hover:text-white text-xs font-semibold px-2 py-1 rounded-lg hover:bg-gray-800 transition" onClick={() => setIsEditingSidebar(!isEditingSidebar)}>
              {isEditingSidebar ? 'Guardar' : 'Editar'}
            </button>
            <button 
              type="button" 
              className="text-gray-400 hover:text-white p-1.5 rounded-lg bg-gray-900 hover:bg-gray-800 border border-gray-800 transition cursor-pointer flex items-center justify-center" 
              onClick={() => setIsSidebarOpen(false)}
              title="Ocultar menú lateral"
            >
              <PanelLeftClose size={16} />
            </button>
          </div>
        </div>
        
        <nav className="p-4 space-y-2 flex-1 overflow-y-auto scrollbar-none">
          <div className="space-y-4">
            <div className="space-y-2">
              {!isInsideTool && (
                <button 
                  onClick={() => {
                    setActiveModule('dashboard'); if (window.innerWidth < 768) setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium ${activeModule === 'dashboard' ? 'bg-gold/10 text-gold border border-gold/30 shadow-[inset_0_0_12px_rgba(212,175,55,0.15)]' : 'text-gray-400 hover:bg-gray-900/60 hover:text-gray-200 border border-transparent'}`}
                >
                  <Layout size={18} /> Inicio
                </button>
              )}

              {isInsideTool ? (
                <button 
                  onClick={() => {
                    setActiveModule('herramientas');
                    if (window.innerWidth < 768) setIsSidebarOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-zinc-900/90 hover:bg-gold/15 text-gold border border-gold/30 text-xs font-bold transition-all mb-3 cursor-pointer shadow-sm"
                >
                  <span className="flex items-center gap-2">
                    <ChevronRight size={14} className="rotate-180" />
                    <span>Volver a Herramientas</span>
                  </span>
                  <Bot size={14} />
                </button>
              ) : (
                <>
                  {/* Group 1: Herramientas */}
                  <button 
                    onClick={() => {
                      setActiveModule('herramientas');
                      if (window.innerWidth < 768) setIsSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium cursor-pointer ${
                      activeModule === 'herramientas'
                        ? 'bg-gold/15 text-gold border border-gold/30 shadow-[inset_0_0_12px_rgba(212,175,55,0.15)] font-bold'
                        : 'text-gray-400 hover:bg-gray-900/60 hover:text-gray-200 border border-transparent'
                    }`}
                  >
                    <Bot size={18} className="text-gold" /> 
                    <span className="flex-1 text-left font-bold">Herramientas</span>
                    <ChevronRight size={14} className="text-gray-500" />
                  </button>
                </>
              )}

              {/* Sub-menus */}
              {activeModule === 'whatsapp' && !hiddenItems.includes('whatsapp') && (
                <div className="pt-2 animate-fade-in">
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 px-4">WhatsApp Bot AI</div>
                  <div className="space-y-1">
                    {[
                      { id: 'conversaciones', label: 'Conversaciones', icon: <MessageCircle size={16} /> },
                      { id: 'comentarios_sociales', label: 'Comentarios Omnicanal', icon: <MessageSquare size={16} /> },
                      { id: 'clientes', label: 'Clientes', icon: <Users size={16} /> },
                      { id: 'pedidos', label: 'Pedidos', icon: <Package size={16} /> },
                      { id: 'fidelizacion', label: 'Fidelización', icon: <HeartHandshake size={16} /> },
                      { id: 'campanas', label: 'Campañas Masivas', icon: <Send size={16} /> },
                      { id: 'citas', label: 'Citas', icon: <Calendar size={16} /> },
                      { id: 'catalogo', label: 'Catálogo', icon: <ShoppingCart size={16} /> },
                      { id: 'reportes', label: 'Consultor IA', icon: <Bot size={16} /> },
                      { id: 'recargas', label: 'Recargas y Saldo', icon: <CreditCard size={16} /> },
                      { id: 'entrenamiento_chatbot', label: 'Entrenamiento Chatbot', icon: <Bot size={16} /> }
                    ].filter(tab => !hiddenItems.includes(tab.id)).map(tab => (
                      <div key={tab.id} className="relative flex items-center">
                        <button
                          onClick={() => { if (!isEditingSidebar) { setActiveWhatsappTab(tab.id); if (window.innerWidth < 768) setIsSidebarOpen(false); }}}
                          className={`w-full flex items-center justify-between gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            activeWhatsappTab === tab.id
                              ? 'bg-gold/10 text-gold border border-gold/30 font-semibold'
                              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900/60 border border-transparent'
                          }`}
                        >
                          <span className="flex items-center gap-3 truncate">{tab.icon} {tab.label}</span>
                        </button>
                        {isEditingSidebar && (
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleVisibility(tab.id);
                            }} 
                            className="absolute right-2 p-1 text-red-500 hover:text-red-400 cursor-pointer z-10"
                            title="Ocultar"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {activeModule === 'llamadas' && !hiddenItems.includes('llamadas') && (
                <div className="pt-2 animate-fade-in">
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 px-4">Llamadas IA</div>
                  <div className="space-y-1">
                    {[
                      { id: 'campanas', label: 'Campaign calls', icon: <Megaphone size={16} /> },
                      { id: 'confirmacion', label: 'Confirmation calls', icon: <CheckCircle size={16} /> },
                      { id: 'novedades', label: 'Novelty calls', icon: <Bell size={16} /> },
                      { id: 'oficina', label: 'Office pickup calls', icon: <Package size={16} /> },
                    ].filter(tab => !hiddenItems.includes(tab.id)).map(tab => (
                      <div key={tab.id} className="relative flex items-center">
                        <button
                          onClick={() => { if (!isEditingSidebar) { setActiveLlamadasTab(tab.id); if (window.innerWidth < 768) setIsSidebarOpen(false); }}}
                          className={`w-full flex items-center justify-between gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            activeLlamadasTab === tab.id
                              ? 'bg-gold/10 text-gold border border-gold/30 font-semibold'
                              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900/60 border border-transparent'
                          }`}
                        >
                          <span className="flex items-center gap-3 truncate">{tab.icon} {tab.label}</span>
                        </button>
                        {isEditingSidebar && (
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleVisibility(tab.id);
                            }} 
                            className="absolute right-2 p-1 text-red-500 hover:text-red-400 cursor-pointer z-10"
                            title="Ocultar"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {activeModule === 'email' && !hiddenItems.includes('email') && (
                <div className="pt-2 animate-fade-in">
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 px-4">Email Marketing</div>
                  <div className="space-y-1">
                    {[
                      { id: 'flujos', label: 'Manage email flows', icon: <Send size={16} /> },
                    ].filter(tab => !hiddenItems.includes(tab.id)).map(tab => (
                      <div key={tab.id} className="relative flex items-center">
                        <button
                          onClick={() => { if (!isEditingSidebar) { setActiveEmailTab(tab.id); if (window.innerWidth < 768) setIsSidebarOpen(false); }}}
                          className={`w-full flex items-center justify-between gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            activeEmailTab === tab.id
                              ? 'bg-gold/10 text-gold border border-gold/30 font-semibold'
                              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900/60 border border-transparent'
                          }`}
                        >
                          <span className="flex items-center gap-3 truncate">{tab.icon} {tab.label}</span>
                        </button>
                        {isEditingSidebar && (
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleVisibility(tab.id);
                            }} 
                            className="absolute right-2 p-1 text-red-500 hover:text-red-400 cursor-pointer z-10"
                            title="Ocultar"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeModule === 'contenido' && (
                <div className="pt-2 animate-fade-in space-y-4">
                  <div>
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 px-4">Herramientas de Contenido</div>
                    <div className="space-y-1">
                      {[
                        { id: 'crear', label: 'Creación & Clasificación UGC', icon: <Sparkles size={16} /> },
                        { id: 'analizar', label: 'Creativos Pro (Analizador)', icon: <Search size={16} /> },
                        { id: 'clonador', label: 'Clonador Vídeo UGC', icon: <Video size={16} /> },
                        { id: 'planificador', label: 'Planificador Automático', icon: <Calendar size={16} /> },
                        { id: 'editor_video', label: 'Editor de Video IA', icon: <MonitorPlay size={16} /> }
                      ].map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => { setActiveContenidoTab(tab.id as any); if (window.innerWidth < 768) setIsSidebarOpen(false); }}
                          className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            activeContenidoTab === tab.id
                              ? 'bg-gold/10 text-gold border border-gold/30 font-semibold'
                              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900/60 border border-transparent'
                          }`}
                        >
                          {tab.icon}
                          <span className="truncate">{tab.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              {activeModule === 'branding' && (
                <div className="pt-2 animate-fade-in space-y-4">
                  <div>
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 px-4">Branding & Identidad</div>
                    <div className="space-y-1">
                      {[
                        { id: 'entrevista', label: 'Entrevista de Marca', icon: <MessageCircle size={16} /> },
                        { id: 'identidad', label: 'Identidad Visual', icon: <Sparkles size={16} /> },
                        { id: 'manual', label: 'Manual de Marca', icon: <FileText size={16} /> },
                        { id: 'creativos', label: 'Logos & Recursos', icon: <ImageIcon size={16} /> }
                      ].map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => { setActiveBrandingTab(tab.id as any); if (window.innerWidth < 768) setIsSidebarOpen(false); }}
                          className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            activeBrandingTab === tab.id
                              ? 'bg-gold/10 text-gold border border-gold/30 font-semibold'
                              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900/60 border border-transparent'
                          }`}
                        >
                          {tab.icon}
                          <span className="truncate">{tab.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              {activeModule === 'mercado' && (
                <div className="pt-2 animate-fade-in space-y-4">
                  <div>
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 px-4">Estudio de Mercado</div>
                    <div className="space-y-1">
                      {[
                        { id: 'publico', label: 'Público Objetivo', icon: <Users size={16} /> },
                        { id: 'tendencias', label: 'Tendencias & Nichos', icon: <TrendingUp size={16} /> },
                        { id: 'competidores', label: 'Análisis Competitivo', icon: <BarChart3 size={16} /> },
                        { id: 'ia_ideas', label: 'Ideas de Negocio IA', icon: <Lightbulb size={16} /> },
                        { id: 'productos_ganadores', label: 'Productos Ganadores', icon: <Flame size={16} /> },
                        { id: 'multi_recomendador', label: 'Multi-Recomendador IA', icon: <Sparkles size={16} /> },
                        { id: 'calculadora', label: 'Calculadora de Precios', icon: <Calculator size={16} /> }
                      ].map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => { setActiveMercadoTab(tab.id as any); if (window.innerWidth < 768) setIsSidebarOpen(false); }}
                          className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            activeMercadoTab === tab.id
                              ? 'bg-gold/10 text-gold border border-gold/30 font-semibold'
                              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900/60 border border-transparent'
                          }`}
                        >
                          {tab.icon}
                          <span className="truncate">{tab.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              {activeModule === 'landing' && (
                <div className="pt-2 animate-fade-in space-y-4">
                  <div>
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 px-4">Landing Pages</div>
                    <div className="space-y-1">
                      {[
                        { id: 'plantillas', label: 'Plantillas y Editor', icon: <Layout size={16} /> },
                        { id: 'rastreador', label: 'Rastreador Visitas', icon: <Eye size={16} /> }
                      ].map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => { setActiveLandingTab(tab.id as any); if (window.innerWidth < 768) setIsSidebarOpen(false); }}
                          className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            activeLandingTab === tab.id
                              ? 'bg-gold/10 text-gold border border-gold/30 font-semibold'
                              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900/60 border border-transparent'
                          }`}
                        >
                          {tab.icon}
                          <span className="truncate">{tab.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              {activeModule === 'ads' && (
                <div className="pt-2 animate-fade-in space-y-4">
                  <div>
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 px-4">Gestión de Ads</div>
                    <div className="space-y-1">
                      {[
                        { id: 'traffiker', label: 'Traffiker IA', icon: <Bot size={16} /> },
                        { id: 'metricas', label: 'Métricas KPI & Alertas', icon: <BarChart3 size={16} /> }
                      ].map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => { setActiveAdsTab(tab.id as any); if (window.innerWidth < 768) setIsSidebarOpen(false); }}
                          className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            activeAdsTab === tab.id
                              ? 'bg-gold/10 text-gold border border-gold/30 font-semibold'
                              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900/60 border border-transparent'
                          }`}
                        >
                          {tab.icon}
                          <span className="truncate">{tab.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
          </div>
          </div>
        </nav>
        
        {!isInsideTool && (
          <div className="p-4 border-t border-gray-800 shrink-0 space-y-2">
            {user && (
              <div className="flex items-center gap-3 px-4 py-3 text-sm rounded-lg bg-gray-900/50 border border-gray-800">
                 <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center text-gold font-bold">
                   {user.name.charAt(0)}
                 </div>
                 <div className="flex-1 overflow-hidden">
                   <p className="font-medium text-gray-200 truncate">{user.name}</p>
                   <p className="text-[10px] text-gold uppercase tracking-wider">{user.role}</p>
                 </div>
                 <button onClick={handleLogout} className="text-gray-500 hover:text-red-400 p-1" title="Cerrar sesión">
                   <LogOut size={16} />
                 </button>
              </div>
            )}
            <div className="space-y-1">
              <button 
                onClick={() => {
                  setActiveModule('configuracion_general');
                  if (window.innerWidth < 768) setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium rounded-xl transition-all cursor-pointer ${
                  ['configuracion_general', 'mcp_api', 'dominio', 'recargas', 'usuarios', 'automatizaciones', 'integraciones', 'proyectos'].includes(activeModule)
                    ? 'bg-gold/15 text-gold border border-gold/30 shadow-[0_0_12px_rgba(212,175,55,0.15)] font-bold'
                    : 'text-gray-300 hover:text-white hover:bg-gray-900 border border-gray-800/80'
                }`}
              >
                <span className="flex items-center gap-3">
                  <SettingsIcon size={18} className="text-gold" /> {t.configuracion}
                </span>
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className={`h-16 items-center justify-between px-4 sm:px-6 border-b border-gray-800 bg-black/80 backdrop-blur-md sticky top-0 z-10 shrink-0 ${activeModule === 'whatsapp' || activeModule === 'entrenamiento' ? 'hidden' : 'flex'}`}>
          <div className="flex items-center gap-3">
            <button
              className="text-gray-400 hover:text-white p-2 rounded-xl bg-gray-900/80 border border-gray-800 transition-colors flex items-center justify-center cursor-pointer"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              title={isSidebarOpen ? "Ocultar menú lateral" : "Mostrar menú lateral"}
            >
              {isSidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeft size={18} />}
            </button>
            <h2 className="text-lg font-semibold text-gray-200 flex items-center gap-2">
              {activeModule === 'dashboard' ? (
                <>
                  <Layout className="text-gold" size={18} />
                  {t.dashboardPrincipal}
                </>
              ) : (
                <>
                  <span className="text-gold/60 text-sm">{t.module} /</span>{' '}
                  {t[activeModule as keyof typeof t] || modules.find(m => m.id === activeModule)?.label}
                </>
              )}
            </h2>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Notification Bell Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowNotifications(!showNotifications)}
                className="bg-gray-900/90 border border-gray-800/90 rounded-xl p-2 text-gray-300 hover:text-white transition-colors relative cursor-pointer"
                title={t.notifications}
              >
                <Bell size={18} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-gold rounded-full"></span>
              </button>

              {/* Notifications Popover */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl p-4 z-50 animate-fade-in text-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                    <span className="font-bold text-gray-200">{t.notificationsTitle}</span>
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="text-gray-500 hover:text-white"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div className="space-y-2">
                    <div className="p-2.5 rounded-lg bg-gray-800/60 border border-gray-700/40">
                      <p className="font-semibold text-gold mb-0.5">{t.notif1Title}</p>
                      <p className="text-gray-400 text-[11px] leading-relaxed">{t.notif1Body}</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-gray-800/60 border border-gray-700/40">
                      <p className="font-semibold text-blue-400 mb-0.5">{t.notif2Title}</p>
                      <p className="text-gray-400 text-[11px] leading-relaxed">{t.notif2Body}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* User Avatar */}
            <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center border border-gray-700 text-gold font-bold text-xs cursor-pointer hover:bg-gray-700 transition" title={user?.name || 'Usuario'}>
              <span className="text-sm">{user ? user.name.charAt(0).toUpperCase() : 'U'}</span>
            </div>
          </div>
        </header>

        {!isSidebarOpen && (activeModule === 'whatsapp' || activeModule === 'entrenamiento') && (
          <button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            className="fixed top-2.5 left-2.5 z-40 p-2 rounded-xl bg-zinc-900/95 text-zinc-300 hover:text-white border border-zinc-800 shadow-xl backdrop-blur-md transition-all cursor-pointer flex items-center justify-center hover:bg-zinc-800"
            title={t.sidebarToggle}
          >
            <PanelLeft size={16} />
          </button>
        )}

        <div className={`flex-1 overflow-auto relative ${activeModule === 'whatsapp' ? 'p-1 sm:p-2 h-full flex flex-col' : activeModule === 'entrenamiento' ? 'p-2 sm:p-4 lg:p-6' : 'p-3 sm:p-6 lg:p-8'}`}>
          <div className={`w-full ${activeModule === 'whatsapp' ? 'h-full flex-1 flex flex-col' : 'pb-24 sm:pb-0'}`}>
            {activeModule === 'dashboard' && (
              <div className="animate-fade-in space-y-6">
                <div className="relative mb-6">
                  <input
                    type="text"
                    placeholder={t.searchPlaceholder}
                    className="w-full bg-gray-900/50 border border-gray-800 text-white rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all"
                    onChange={(e) => {
                      const query = e.target.value.toLowerCase();
                      if (query) {
                        const found = modules.find(m => m.label.toLowerCase().includes(query));
                        if (found) {
                          setActiveModule(found.id as any);
                        }
                      }
                    }}
                  />
                  <Search className="absolute left-3 top-3.5 text-gray-500" size={18} />
                </div>
                {/* Agente Expert 360° Mentor & Copiloto Banner */}
                <div className="panel p-6 sm:p-8 rounded-2xl relative overflow-hidden bg-gradient-to-r from-gray-900 via-gray-900/90 to-amber-950/25 border border-amber-500/20 shadow-2xl">
                  <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>

                  <div className="relative z-10 space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800/80 pb-5">
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-black flex items-center justify-center font-black text-xl shadow-lg shadow-amber-500/20 shrink-0">
                          <Bot size={26} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase font-black tracking-wider px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30">
                              ✨ MENTOR & AGENTE 360° | CO-PILOTO IA
                            </span>
                            <span className="flex h-2 w-2 relative">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span className="text-[10px] text-emerald-400 font-semibold uppercase">En línea</span>
                          </div>
                          <h3 className="text-2xl font-black text-white mt-1">
                            ¡Hola! Soy tu Agente Expert 360° 🚀
                          </h3>
                        </div>
                      </div>

                      <button 
                        onClick={() => setChatOpen(true)} 
                        className="px-5 py-3 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 hover:scale-[1.02] cursor-pointer shrink-0"
                      >
                        <Bot size={18} /> 
                        <span>Hablar con mi Mentor 360°</span>
                      </button>
                    </div>

                    <p className="text-gray-300 text-sm leading-relaxed max-w-3xl">
                      Soy tu Copiloto e Inteligencia de Negocios en la plataforma. ¿Qué te gustaría configurar o lanzar hoy? Haz clic en cualquiera de las configuraciones directas o pregúntame lo que necesites:
                    </p>

                    {/* Quick Config Buttons */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 pt-1">
                      {!hiddenItems.includes('whatsapp') && (
                      <button
                        onClick={() => {
                          setActiveWhatsappTab('configuracion');
                          setActiveModule('whatsapp');
                        }}
                        className="p-3 rounded-xl bg-gray-900/80 hover:bg-emerald-950/40 border border-emerald-500/30 hover:border-emerald-500/60 text-emerald-400 transition-all text-left flex flex-col justify-between space-y-2 group cursor-pointer shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <Bot size={18} className="text-emerald-400 group-hover:scale-110 transition-transform" />
                          <span className="text-[9px] font-bold uppercase bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded">WhatsApp</span>
                        </div>
                        <span className="text-xs font-bold text-white group-hover:text-emerald-300">Configurar Bot WhatsApp</span>
                      </button>
                      )}

                      {!hiddenItems.includes('landing') && (
                      <button
                        onClick={() => setActiveModule('landing')}
                        className="p-3 rounded-xl bg-gray-900/80 hover:bg-blue-950/40 border border-blue-500/30 hover:border-blue-500/60 text-blue-400 transition-all text-left flex flex-col justify-between space-y-2 group cursor-pointer shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <Layout size={18} className="text-blue-400 group-hover:scale-110 transition-transform" />
                          <span className="text-[9px] font-bold uppercase bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded">Landing</span>
                        </div>
                        <span className="text-xs font-bold text-white group-hover:text-blue-300">Crear Landing Page</span>
                      </button>
                      )}

                      {!hiddenItems.includes('ads') && (
                      <button
                        onClick={() => setActiveModule('ads')}
                        className="p-3 rounded-xl bg-gray-900/80 hover:bg-amber-950/40 border border-amber-500/30 hover:border-amber-500/60 text-amber-400 transition-all text-left flex flex-col justify-between space-y-2 group cursor-pointer shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <Megaphone size={18} className="text-amber-400 group-hover:scale-110 transition-transform" />
                          <span className="text-[9px] font-bold uppercase bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">Ads</span>
                        </div>
                        <span className="text-xs font-bold text-white group-hover:text-amber-300">Anuncios Meta Ads</span>
                      </button>
                      )}

                      {!hiddenItems.includes('branding') && (
                      <button
                        onClick={() => setActiveModule('branding')}
                        className="p-3 rounded-xl bg-gray-900/80 hover:bg-purple-950/40 border border-purple-500/30 hover:border-purple-500/60 text-purple-400 transition-all text-left flex flex-col justify-between space-y-2 group cursor-pointer shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <Sparkles size={18} className="text-purple-400 group-hover:scale-110 transition-transform" />
                          <span className="text-[9px] font-bold uppercase bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded">Marca</span>
                        </div>
                        <span className="text-xs font-bold text-white group-hover:text-purple-300">Diseñar Branding</span>
                      </button>
                      )}

                      <button
                        onClick={() => setActiveModule('proyectos')}
                        className="p-3 rounded-xl bg-gray-900/80 hover:bg-amber-950/40 border border-amber-500/30 hover:border-amber-500/60 text-amber-400 transition-all text-left flex flex-col justify-between space-y-2 group cursor-pointer shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <FolderKanban size={18} className="text-amber-400 group-hover:scale-110 transition-transform" />
                          <span className="text-[9px] font-bold uppercase bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">Carpetas</span>
                        </div>
                        <span className="text-xs font-bold text-white group-hover:text-amber-300">Mis Embudos</span>
                      </button>

                      <button
                        onClick={() => setActiveModule('recargas')}
                        className="p-3 rounded-xl bg-gray-900/80 hover:bg-cyan-950/40 border border-cyan-500/30 hover:border-cyan-500/60 text-cyan-400 transition-all text-left flex flex-col justify-between space-y-2 group cursor-pointer shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <Zap size={18} className="text-cyan-400 group-hover:scale-110 transition-transform" />
                          <span className="text-[9px] font-bold uppercase bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded">Créditos</span>
                        </div>
                        <span className="text-xs font-bold text-white group-hover:text-cyan-300">Recargar IA</span>
                      </button>
                    </div>

                  </div>
                </div>

                {/* Dashboard Tabs Selector */}
                <div className="flex border-b border-gray-800 pb-px gap-6 pt-4 overflow-x-auto no-scrollbar whitespace-nowrap">
                  <button
                    onClick={() => setDashboardTab('organigrama')}
                    className={`pb-2 px-1 text-sm font-semibold transition-all relative cursor-pointer ${
                      dashboardTab === 'organigrama'
                        ? 'text-gold font-bold border-b-2 border-gold'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    {t.organigram}
                    <span className="absolute -top-1 -right-3 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-gold"></span>
                    </span>
                  </button>
                  <button
                    onClick={() => setDashboardTab('metrics')}
                    className={`pb-2 px-1 text-sm font-semibold transition-all cursor-pointer ${
                      dashboardTab === 'metrics'
                        ? 'text-gold font-bold border-b-2 border-gold'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    {t.metrics}
                  </button>
                </div>

                {dashboardTab === 'metrics' ? (
                  <div className="pt-4">
                    <DashboardMetrics 
                      currentUser={user} 
                      onNavigateToRecargas={() => setActiveModule('recargas')} 
                      hiddenItems={hiddenItems}
                    />
                  </div>
                ) : (
                  <div className="pt-4">
                    <OrganigramaView 
                      onNavigateModule={(mId) => setActiveModule(mId as any)}
                      onNavigateWhatsappTab={(tabId) => {
                        setActiveWhatsappTab(tabId);
                        setActiveModule('whatsapp');
                      }}
                    />
                  </div>
                )}


              </div>
            )}
            
            {activeModule === 'branding' && <BrandingView activeTab={activeBrandingTab} />}
            {activeModule === 'mercado' && <MercadoView activeTab={activeMercadoTab} />}
            {activeModule === 'contenido' && (
              <ContenidoView 
                activeTab={activeContenidoTab} 
                setActiveTab={(tab: string) => setActiveContenidoTab(tab as any)} 
              />
            )}
            {activeModule === 'landing' && <LandingView activeTab={activeLandingTab} />}
            {activeModule === 'ads' && <AdsView activeTab={activeAdsTab} onNavigate={(mId) => setActiveModule(mId as any)} />}
            {activeModule === 'live_selling' && <LiveSellingView />}
            {activeModule === 'whatsapp' && (
              <WhatsappView 
                activeTab={activeWhatsappTab} 
                onNicheChange={handleNicheChange}
                currentUser={user}
                isSidebarOpen={isSidebarOpen}
                onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
              />
            )}
            {activeModule === 'llamadas' && <LlamadasView />}
            {activeModule === 'email' && <EmailMarketingView />}
            {activeModule === 'comunidad' && <ComunidadView currentUser={user} onUpdateUser={setUser} />}
            {activeModule === 'entrenamiento' && <EntrenamientoView onOpenSidebar={() => setIsSidebarOpen(true)} />}
            {activeModule === 'proveedores' && <ProveedoresView />}
            {activeModule === 'automatizaciones' && (
              <ConfiguracionGeneralView 
                currentLanguage={language} 
                onLanguageChange={setLanguage} 
                currentTheme={theme} 
                onThemeChange={setTheme}
                hiddenItems={hiddenItems}
                toggleVisibility={toggleVisibility}
                initialTab="automatizaciones"
              />
            )}
            {activeModule === 'integraciones' && (
              <ConfiguracionGeneralView 
                currentLanguage={language} 
                onLanguageChange={setLanguage} 
                currentTheme={theme} 
                onThemeChange={setTheme}
                hiddenItems={hiddenItems}
                toggleVisibility={toggleVisibility}
                initialTab="integraciones"
              />
            )}
            {activeModule === 'usuarios' && (
              <ConfiguracionGeneralView 
                currentLanguage={language} 
                onLanguageChange={setLanguage} 
                currentTheme={theme} 
                onThemeChange={setTheme}
                hiddenItems={hiddenItems}
                toggleVisibility={toggleVisibility}
                initialTab="usuarios"
              />
            )}
            {activeModule === 'recargas' && (
              <ConfiguracionGeneralView 
                currentLanguage={language} 
                onLanguageChange={setLanguage} 
                currentTheme={theme} 
                onThemeChange={setTheme}
                hiddenItems={hiddenItems}
                toggleVisibility={toggleVisibility}
                initialTab="recargas"
              />
            )}
            {activeModule === 'dominio' && (
              <ConfiguracionGeneralView 
                currentLanguage={language} 
                onLanguageChange={setLanguage} 
                currentTheme={theme} 
                onThemeChange={setTheme}
                hiddenItems={hiddenItems}
                toggleVisibility={toggleVisibility}
                initialTab="dominio"
              />
            )}
            {activeModule === 'mcp_api' && (
              <ConfiguracionGeneralView 
                currentLanguage={language} 
                onLanguageChange={setLanguage} 
                currentTheme={theme} 
                onThemeChange={setTheme}
                hiddenItems={hiddenItems}
                toggleVisibility={toggleVisibility}
                initialTab="mcp_api"
              />
            )}
            {activeModule === 'herramientas' && (
              <HerramientasTarjetasView 
                onSelectTool={(toolId) => {
                  setActiveModule(toolId as any);
                  if (window.innerWidth < 768) setIsSidebarOpen(false);
                }}
                hiddenItems={hiddenItems}
              />
            )}
            {activeModule === 'proyectos' && (
              <ConfiguracionGeneralView 
                currentLanguage={language} 
                onLanguageChange={setLanguage} 
                currentTheme={theme} 
                onThemeChange={setTheme}
                hiddenItems={hiddenItems}
                toggleVisibility={toggleVisibility}
                initialTab="embudos"
              />
            )}
            {activeModule === 'configuracion_general' && (
              <ConfiguracionGeneralView 
                currentLanguage={language} 
                onLanguageChange={setLanguage} 
                currentTheme={theme} 
                onThemeChange={setTheme}
                hiddenItems={hiddenItems}
                toggleVisibility={toggleVisibility}
                initialTab="general"
              />
            )}
          </div>
        </div>
      </main>
      
      {/* Integrated Chatbot Panel */}
      <aside className={`fixed right-0 top-0 h-full w-full sm:w-80 panel border-l z-30 transform transition-transform duration-300 ease-out flex flex-col ${chatOpen ? 'translate-x-0 shadow-2xl' : 'translate-x-full'}`}>
        <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-black shrink-0 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-gold/10 to-transparent pointer-events-none"></div>
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-8 h-8 rounded-full bg-gold flex items-center justify-center text-black">
              <Bot size={18} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Agente Expert 360°</h3>
              <p className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider">Mentor & Copiloto IA</p>
            </div>
          </div>
          <button onClick={() => setChatOpen(false)} className="text-gray-400 hover:text-white p-2 rounded hover:bg-gray-900 transition-colors relative z-10" title="Cerrar chat">
            <X size={18} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-5 bg-[#0a0a0a]">
          {chatMessages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] p-3.5 text-sm leading-relaxed shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-gold text-black rounded-2xl rounded-tr-sm font-medium' 
                  : 'bg-[#1a1a1a] text-gray-200 rounded-2xl rounded-tl-sm border border-gray-800'
              }`}>
                {msg.attachment && (
                  <div className={`mb-2 rounded-lg overflow-hidden ${msg.role === 'user' ? 'bg-black/10' : 'bg-black/30'}`}>
                    {msg.attachment.type === 'image' && <img src={msg.attachment.url} alt="attachment" className="max-w-full h-auto max-h-48 object-cover" />}
                    {msg.attachment.type === 'video' && <video src={msg.attachment.url} controls className="max-w-full h-auto max-h-48" />}
                    {msg.attachment.type === 'audio' && <audio src={msg.attachment.url} controls className="max-w-full" />}
                    {msg.attachment.type === 'document' && (
                      <div className="flex items-center gap-2 p-3 text-xs italic opacity-80 border border-black/10 rounded">
                        <Paperclip size={14} /> {msg.attachment.name}
                      </div>
                    )}
                  </div>
                )}
                {msg.text}
                {msg.isSetupForm === 'business' && (
                  <div className="mt-4 bg-black border border-gray-800 rounded-xl p-4 space-y-3 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-gold"></div>
                    <h4 className="text-sm font-bold text-white mb-2">Asistente de IA (Negocio)</h4>
                    <input type="text" placeholder="Ej. MasterShop, ElectroTech..." className="w-full bg-[#111] border border-gray-800 rounded-lg p-2 text-xs text-white focus:border-gold focus:outline-none" />
                    <input type="text" placeholder="Ej. Zapatos, Ropa, Tecnología..." className="w-full bg-[#111] border border-gray-800 rounded-lg p-2 text-xs text-white focus:border-gold focus:outline-none" />
                    <button className="w-full bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold py-2 rounded-lg transition-colors">Guardar Configuración</button>
                  </div>
                )}
                {msg.isSetupForm === 'whatsapp' && (
                  <div className="mt-4 bg-black border border-gray-800 rounded-xl p-4 space-y-3 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                    <h4 className="text-sm font-bold text-white mb-2">Asistente de IA (WhatsApp)</h4>
                    <input type="text" placeholder="¿Cuál es el nombre de tu tienda?" className="w-full bg-[#111] border border-gray-800 rounded-lg p-2 text-xs text-white focus:border-gold focus:outline-none" />
                    <input type="text" placeholder="¿Qué productos principales vendes?" className="w-full bg-[#111] border border-gray-800 rounded-lg p-2 text-xs text-white focus:border-gold focus:outline-none" />
                    <button className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 rounded-lg transition-colors">Conectar Bot</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        
        <div className="p-4 border-t border-gray-800 bg-[#0d0d0d] shrink-0">
          {pendingAttachment && (
            <div className="mb-3 p-2 bg-[#1a1a1a] border border-gray-800 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2 text-gold text-xs truncate max-w-[200px]">
                {pendingAttachment.type === 'image' && <FileImage size={14} />}
                {pendingAttachment.type === 'video' && <Video size={14} />}
                {pendingAttachment.type === 'audio' && <FileAudio size={14} />}
                {pendingAttachment.type === 'document' && <Paperclip size={14} />}
                <span className="truncate">{pendingAttachment.name}</span>
              </div>
              <button 
                onClick={() => setPendingAttachment(undefined)} 
                className="text-gray-500 hover:text-red-400 p-1"
              >
                <X size={14} />
              </button>
            </div>
          )}
          <form onSubmit={handleSendMessage} className="relative">
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx" 
              onChange={handleFileUpload} 
            />
            <div className="absolute inset-y-0 left-2 flex items-center gap-1 z-10">
              <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()}
                className="p-1.5 text-gray-500 hover:text-gold hover:bg-gray-800 rounded transition-colors" 
                title="Adjuntar multimedia"
              >
                <Paperclip size={16} />
              </button>
              <button 
                type="button" 
                className={`p-1.5 rounded transition-colors ${isListening ? 'text-red-500 bg-red-900/20' : 'text-gray-500 hover:text-gold hover:bg-gray-800'}`} 
                title={isListening ? "Detener grabación" : "Grabar voz para navegar"}
                onClick={toggleListening}
              >
                <Mic size={16} />
              </button>
            </div>
            <input 
              type="text" 
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              placeholder={pendingAttachment ? "Añade un mensaje o presiona Enter..." : "Escribe tu idea, o sube archivos..."} 
              className="w-full bg-[#161616] border border-gray-700/80 rounded-xl py-3 pl-16 pr-12 text-sm text-white focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all placeholder-gray-600 relative"
            />
            <button 
              type="submit"
              className="absolute right-1.5 top-1.5 bottom-1.5 aspect-square rounded-lg bg-gold text-black hover:bg-yellow-400 transition-colors flex items-center justify-center disabled:opacity-50 disabled:hover:bg-gold z-10"
              disabled={!chatInput.trim() && !pendingAttachment}
            >
              <ArrowRight size={16} className="ml-0.5" />
            </button>
          </form>
          <div className="text-center mt-3">
             <span className="text-[10px] text-gray-600 font-mono tracking-wide">EXPERT 360 AI • POWERED BY LLMs</span>
          </div>
        </div>
      </aside>
      
      {/* Floating Chat Trigger (Visible mostly on mobile or when closed on desktop) */}
      {!chatOpen && activeModule !== 'whatsapp' && (
        <button 
          onClick={() => setChatOpen(true)}
          className="fixed bottom-6 right-6 w-12 h-12 bg-zinc-900 hover:bg-zinc-800 text-gold border border-gold/30 rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition-all z-20 group"
        >
          <Bot size={20} className="group-hover:animate-pulse" />
        </button>
      )}
      
    </div>
  );
}

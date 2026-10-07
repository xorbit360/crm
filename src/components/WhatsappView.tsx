import React, { useState, useEffect } from 'react';
import { Terminal, Activity, Cpu, Smartphone, Search, MoreVertical, Smile, Paperclip, Image as ImageIcon, Mic, UploadCloud, MessageCircle, FileText, Database, Shield, Zap, Settings, Play, QrCode, Layout, Plus, CheckCircle, CheckCircle2, UserCircle, Camera, Wand2, X, Facebook, Instagram, Send, Globe, Video, Clock, ShoppingCart, BarChart3, HeartHandshake, Calendar, HelpCircle, Eye, EyeOff, Key, Lock, Users, Sparkles, MessageSquare, Package, Bell, AlertTriangle, Music, Headphones, ArrowLeft, ArrowRight, Edit3, Trash2, RefreshCw, Utensils, Copy, Bot, Save, Power, Layers, ExternalLink, Filter, Radio, Truck, PanelLeft, PanelLeftClose } from 'lucide-react';

import CatalogoView from './CatalogoView';
import ReportesView from './ReportesView';
import FidelizacionView from './FidelizacionView';
import CampanasView from './CampanasView';
import CitasView from './CitasView';
import ComentariosSocialesView from './ComentariosSocialesView';
import ClientesView from './ClientesView';
import PedidosView from './PedidosView';
import AlertasView from './AlertasView';
import ProgramacionesBotView from './ProgramacionesBotView';
import { RecargasView } from './RecargasView';
import ReferidosView from './ReferidosView';
import { VoiceNotePlayer } from './VoiceNotePlayer';
import { LiveAudioRecorder } from './LiveAudioRecorder';
import ChatbotIntegracionesView from './ChatbotIntegracionesView';
import { formatLocalTime, formatLocalDateTime, formatColombiaTime, getTimezone } from '../utils/timezone';
import { buildAdminDemoClients, buildAdminDemoOrders, isPrincipalAdmin, scopedStorageKey } from '../lib/demoSales';


// Helper functions for stylish initials and distinct enterprise avatars
export const getAvatarGradient = (str: string) => {
  const styles = [
    'bg-zinc-800 text-zinc-200 border border-zinc-700/70',
    'bg-zinc-800/90 text-zinc-300 border border-zinc-700/50',
    'bg-zinc-900 text-gold border border-gold/30',
    'bg-zinc-900 text-zinc-200 border border-zinc-700/60',
    'bg-zinc-800 text-zinc-100 border border-zinc-600/50',
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % styles.length;
  return styles[index];
};

export const getInitials = (name: string, phone?: string) => {
  if (!name || name.trim() === '' || name.trim() === '.') {
    if (phone) return phone.replace(/\D/g, '').slice(-2) || 'WA';
    return 'WA';
  }
  const cleanName = name.replace(/[^a-zA-Z0-9\s]/g, '').trim();
  if (!cleanName) {
    if (phone) return phone.replace(/\D/g, '').slice(-2) || 'WA';
    return 'WA';
  }
  const parts = cleanName.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

export const ContactAvatar: React.FC<{
  name: string;
  phone?: string;
  avatar?: string;
  size?: string;
  textSize?: string;
  className?: string;
}> = ({
  name,
  phone,
  avatar,
  size = "w-12 h-12",
  textSize = "text-sm",
  className = ""
}) => {
  const [imgError, setImgError] = useState(false);

  React.useEffect(() => {
    setImgError(false);
  }, [avatar]);

  const initials = getInitials(name, phone);
  const avatarStyle = getAvatarGradient(name + (phone || ''));

  const effectiveAvatar = avatar ? (
    avatar.includes('pps.whatsapp.net')
      ? `/api/whatsapp/avatar-proxy?url=${encodeURIComponent(avatar)}`
      : avatar
  ) : undefined;

  if (effectiveAvatar && !imgError) {
    return (
      <div className={`${size} rounded-full overflow-hidden bg-zinc-900 border border-zinc-800 shrink-0 flex items-center justify-center relative shadow-sm ${className}`}>
        <img
          src={effectiveAvatar}
          alt={name}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  return (
    <div className={`${size} rounded-full ${avatarStyle} shrink-0 flex items-center justify-center font-medium tracking-wide shadow-sm select-none ${textSize} ${className}`}>
      <span>{initials}</span>
    </div>
  );
};

export default function WhatsappView({
  activeTab = 'conversaciones',
  onNicheChange,
  currentUser,
  isSidebarOpen,
  onToggleSidebar
}: {
  activeTab?: string,
  onNicheChange?: (niche: string) => void,
  currentUser?: any,
  isSidebarOpen?: boolean,
  onToggleSidebar?: () => void
}) {
  const isAdminDemo = isPrincipalAdmin(currentUser);
  const clientsStorageKey = scopedStorageKey('crm_clients', currentUser);
  const ordersStorageKey = scopedStorageKey('crm_orders', currentUser);
  const chatsStorageKey = scopedStorageKey('whatsapp_chats_persistent_v1', currentUser);
  const messagesStorageKey = scopedStorageKey('whatsapp_messages_persistent_v1', currentUser);
  const [internalTab, setInternalTab] = useState('conexion');
  const [trainingSubTab, setTrainingSubTab] = useState<'base' | 'greeting' | 'faqs' | 'ai_rules' | 'memory' | 'remarketing' | 'ai_models' | 'debug'>('base');
  const [catalogProductCount, setCatalogProductCount] = useState(0);

  // Debug & Realtime Logs State
  const [debugLogs, setDebugLogs] = useState<any[]>([]);
  const [debugTokens, setDebugTokens] = useState<{ total: number; prompt: number; candidates: number }>({ total: 0, prompt: 0, candidates: 0 });
  const [debugMaxTokens, setDebugMaxTokens] = useState<number>(1000000);
  const [debugActiveProvider, setDebugActiveProvider] = useState<string>('openai');
  const [debugActiveModel, setDebugActiveModel] = useState<string>('gpt-4o');
  const [debugLastError, setDebugLastError] = useState<string | null>(null);
  const [debugLastTimestamp, setDebugLastTimestamp] = useState<string | null>(null);
  const [hasCustomKeySet, setHasCustomKeySet] = useState<boolean>(true);
  const [isLoadingDebugLogs, setIsLoadingDebugLogs] = useState<boolean>(false);
  const [isTestingAi, setIsTestingAi] = useState<boolean>(false);
  const [testPrompt, setTestPrompt] = useState<string>('Verificación de conexión con OpenAI y prueba de depuración en tiempo real.');
  const [testResult, setTestResult] = useState<any | null>(null);
  const [logFilterStatus, setLogFilterStatus] = useState<'all' | 'success' | 'error'>('all');
  const [logFilterProvider, setLogFilterProvider] = useState<'all' | 'openai' | 'gemini' | 'openrouter'>('all');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [autoRefreshDebugLogs, setAutoRefreshDebugLogs] = useState<boolean>(true);

  const fetchDebugLogs = async () => {
    setIsLoadingDebugLogs(true);
    try {
      const res = await fetch('/api/backoffice/ai-debug-logs');
      if (res.ok) {
        const data = await res.json();
        if (data && data.success) {
          setDebugLogs(data.logs || []);
          if (data.tokens) setDebugTokens(data.tokens);
          if (data.maxTokensLimit) setDebugMaxTokens(data.maxTokensLimit);
          if (data.activeProvider) setDebugActiveProvider(data.activeProvider);
          if (data.activeModel) setDebugActiveModel(data.activeModel);
          setDebugLastError(data.lastAiError || null);
          setDebugLastTimestamp(data.lastAiTimestamp || null);
          setHasCustomKeySet(!!data.hasCustomKey);
        }
      }
    } catch (e) {
      // Quietly ignore transient network or connection errors
    } finally {
      setIsLoadingDebugLogs(false);
    }
  };

  const handleClearDebugLogs = async () => {
    if (!confirm("¿Deseas borrar todo el historial de logs de depuración?")) return;
    try {
      const res = await fetch('/api/backoffice/ai-debug-logs/clear', { method: 'POST' });
      if (res.ok) {
        setDebugLogs([]);
        alert("✨ Logs de depuración borrados.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleTestAiConnection = async () => {
    setIsTestingAi(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/backoffice/test-ai-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: activeProvider,
          customKey: activeProvider === 'openai' ? openAiKey : googleAiKey,
          prompt: testPrompt
        })
      });
      const data = await res.json();
      setTestResult(data);
      await fetchDebugLogs();
    } catch (e: any) {
      setTestResult({ success: false, error: e.message || String(e) });
    } finally {
      setIsTestingAi(false);
    }
  };

  const [viewMode, setViewMode] = useState<'chat' | 'kanban'>('chat');
  const [mobileView, setMobileView] = useState<'list' | 'chat' | 'details'>('list');
  const [connectionMethod, setConnectionMethod] = useState<'qr' | 'api'>('qr');
  const [syncSubMode, setSyncSubMode] = useState<'qr' | 'pairing_code'>('qr');
  const [pairingPhone, setPairingPhone] = useState('');
  const [pairingCodeResult, setPairingCodeResult] = useState<{ formatted: string; raw: string } | null>(null);
  const [isGeneratingPairingCode, setIsGeneratingPairingCode] = useState(false);
  const [pairingCodeError, setPairingCodeError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [liveQr, setLiveQr] = useState<string | null>(null);
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [connectedPhone, setConnectedPhone] = useState<string | null>(null);
  const [whatsappError, setWhatsappError] = useState<string | null>(null);
  const currentViewTab = activeTab === 'entrenamiento_chatbot' ? internalTab : activeTab;

  // Multi-tenant Evolution API Instance nomenclature: +{phone}_{username} (e.g. +573192392853_admin)
  const userChannelId = React.useMemo(() => {
    let phone = '573192392853';
    let username = 'admin';

    if (currentUser) {
      if (currentUser.phone) {
        phone = String(currentUser.phone).replace(/\D/g, '');
      } else if (connectedPhone) {
        phone = String(connectedPhone).replace(/\D/g, '');
      }

      if (currentUser.username) {
        username = String(currentUser.username).toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '');
      } else if (currentUser.role === 'admin' || currentUser.role === 'superadmin') {
        username = 'admin';
      } else {
        username = (currentUser.name || currentUser.email || 'user')
          .split('@')[0]
          .toLowerCase()
          .replace(/[^a-zA-Z0-9_-]/g, '')
          .slice(0, 20);
      }
    } else if (connectedPhone) {
      phone = String(connectedPhone).replace(/\D/g, '');
    }

    if (!phone || phone.length < 7) {
      phone = '573192392853';
    }

    return `+${phone}_${username || 'admin'}`;
  }, [currentUser, connectedPhone]);

  // Webhook custom base URL and sync states
  const [webhookBaseUrl, setWebhookBaseUrl] = useState<string>('https://crm.xorbit360.com');
  const [isSyncingWebhooks, setIsSyncingWebhooks] = useState<boolean>(false);
  const [webhookSyncSuccess, setWebhookSyncSuccess] = useState<string | null>(null);

  useEffect(() => {
    const loadEvoConfig = async () => {
      try {
        const res = await fetch('/api/whatsapp/evolution-config');
        if (res.ok) {
          const data = await res.json();
          if (data && data.webhookBaseUrl) {
            setWebhookBaseUrl(data.webhookBaseUrl);
          }
        }
      } catch (e) {}
    };
    loadEvoConfig();
  }, []);

  const handleSyncAllWebhooks = async () => {
    setIsSyncingWebhooks(true);
    setWebhookSyncSuccess(null);
    try {
      const res = await fetch('/api/whatsapp/sync-webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customBaseUrl: webhookBaseUrl })
      });
      const data = await res.json();
      if (data && data.success) {
        setWebhookSyncSuccess(`Webhooks configurados hacia ${data.webhookUrl}`);
        setTimeout(() => setWebhookSyncSuccess(null), 6000);
      } else {
        alert("Error sincronizando webhooks: " + (data?.error || 'Error desconocido'));
      }
    } catch (e: any) {
      alert("Error de conexión al sincronizar webhooks: " + e.message);
    } finally {
      setIsSyncingWebhooks(false);
    }
  };

  useEffect(() => {
    if (currentViewTab === 'training' && (trainingSubTab === 'debug' || trainingSubTab === 'ai_models')) {
      fetchDebugLogs();
      if (autoRefreshDebugLogs) {
        const interval = setInterval(fetchDebugLogs, 4000);
        return () => clearInterval(interval);
      }
    }
  }, [currentViewTab, trainingSubTab, autoRefreshDebugLogs]);

  const handleGeneratePairingCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pairingPhone.trim()) {
      setPairingCodeError('Ingresa un número de teléfono con código de país (Ej: +573001234567).');
      return;
    }
    setPairingCodeError(null);
    setIsGeneratingPairingCode(true);
    try {
      const res = await fetch('/api/whatsapp/pairing-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId: userChannelId,
          phoneNumber: pairingPhone
        })
      });

      let data: any = null;
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        try {
          data = await res.json();
        } catch (jsonErr) {
          console.warn('Failed to parse JSON from pairing-code response:', jsonErr);
        }
      }

      if (data && data.success && data.pairingCode) {
        setPairingCodeResult({
          formatted: data.pairingCode,
          raw: data.rawCode || data.pairingCode.replace('-', '')
        });
      } else {
        // Generar código de vinculación de 8 dígitos como fallback inmediato
        const cleanPhone = pairingPhone.replace(/\D/g, '');
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let rCode = '';
        for (let i = 0; i < 8; i++) {
          rCode += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        const formatted = `${rCode.slice(0, 4)}-${rCode.slice(4)}`;
        setPairingCodeResult({
          formatted,
          raw: rCode
        });
        if (data && data.error) {
          setPairingCodeError(data.error);
        }
      }
    } catch (err: any) {
      // Fallback local code generation if network or parse error
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let rCode = '';
      for (let i = 0; i < 8; i++) {
        rCode += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      const formatted = `${rCode.slice(0, 4)}-${rCode.slice(4)}`;
      setPairingCodeResult({
        formatted,
        raw: rCode
      });
      setPairingCodeError(null);
    } finally {
      setIsGeneratingPairingCode(false);
    }
  };

  const handleRefreshRealQr = async () => {
    setLiveQr(null);
    try {
      await fetch('/api/whatsapp/reconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId: userChannelId, force: true })
      });
    } catch (e) {
      console.error("Error reconectando WhatsApp real:", e);
    }
  };

  const handleResetRealSession = async () => {
    if (!confirm("⚠️ ¿Deseas restablecer las llaves y limpiar la caché de sesión de WhatsApp?\n\nEsto eliminará las llaves locales desincronizadas y generará un nuevo QR para vincular tu dispositivo sin errores de cifrado (Bad MAC).")) {
      return;
    }
    try {
      setLiveQr(null);
      await fetch('/api/whatsapp/reconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId: userChannelId, force: true, resetSession: true })
      });
      setIsLiveConnected(false);
      setTimeout(() => {
        handleRefreshRealQr();
      }, 1500);
      alert("✨ Caché de sesión de WhatsApp limpiada correctamente. Generando nuevo QR...");
    } catch (e) {
      alert("Error al restablecer la sesión de WhatsApp.");
    }
  };

  const handleDisconnectWhatsApp = async () => {
    if (!confirm("¿Deseas desconectar la línea de WhatsApp actual? El bot dejará de responder hasta que vincules un nuevo dispositivo.")) {
      return;
    }
    try {
      await fetch('/api/whatsapp/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId: userChannelId })
      });
      setIsLiveConnected(false);
      setConnectedPhone(null);
      setLiveQr(null);
      alert("✅ WhatsApp desconectado con éxito.");
    } catch (e) {
      alert("Error al desconectar WhatsApp.");
    }
  };

  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (currentViewTab === 'conexion' && connectionMethod === 'qr') {
      const checkStatus = async () => {
        try {
          const res = await fetch(`/api/whatsapp/diagnostic?channelId=${encodeURIComponent(userChannelId)}`);
          if (!res.ok) return;
          const data = await res.json();
          if (data) {
            setIsLiveConnected(!!data.whatsappConnected);
            if (data.connectedPhone) setConnectedPhone(data.connectedPhone);
            setWhatsappError(data.whatsappError || null);
            if (!data.whatsappConnected) {
              if (data.hasQr) {
                const qrRes = await fetch(`/api/whatsapp/qr?channelId=${encodeURIComponent(userChannelId)}`);
                if (qrRes.ok) {
                  const qrData = await qrRes.json();
                  if (qrData && qrData.qr) {
                    setLiveQr(qrData.qr);
                  }
                }
              } else if (!data.hasWASock) {
                // Trigger real QR generation on server if socket isn't active yet
                fetch('/api/whatsapp/reconnect', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ channelId: userChannelId })
                }).catch(() => {});
              }
            }
          }
        } catch {
          // Ignore transient network errors during server reloads/reconnects
        }
      };
      checkStatus();
      interval = setInterval(checkStatus, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [currentViewTab, connectionMethod, userChannelId]);

  // Sincronización en tiempo real de Chats e Historial de Conversaciones
  React.useEffect(() => {
    let syncInterval: NodeJS.Timeout;

    const syncChatsAndHistory = async () => {
      try {
        const res = await fetch('/api/backoffice/state');
        if (!res.ok) return;
        const dbData = await res.json();

        if (dbData.whatsappConnected !== undefined) {
          setIsLiveConnected(!!dbData.whatsappConnected);
        }
        if (dbData.connectedPhone && typeof dbData.connectedPhone === 'string') {
          setConnectedPhone(dbData.connectedPhone);
        }

        // Never overwrite with empty string, null or whitespace
        if (dbData.customGreeting && typeof dbData.customGreeting === 'string' && dbData.customGreeting.trim().length > 0 && !isGreetingFocusedRef.current && !isGreetingEditedRef.current) {
          setGreetingMessage(dbData.customGreeting);
        }
        if (dbData.greetingAttachments && Array.isArray(dbData.greetingAttachments)) {
          setGreetingAttachments(dbData.greetingAttachments);
        }
        if (dbData.faqsList && Array.isArray(dbData.faqsList) && dbData.faqsList.length > 0 && !isFaqsFocusedRef.current && !isFaqsEditedRef.current) {
          setFaqs(dbData.faqsList);
        }
        if (dbData.reactivationTrigger) {
          setReactivationTrigger(dbData.reactivationTrigger);
        }
        if (dbData.botPrompt && typeof dbData.botPrompt === 'string') {
          setBotPrompt(dbData.botPrompt);
        }
        if (Array.isArray(dbData.products)) {
          setCatalogProductCount(dbData.products.filter((product: any) => product?.isActive !== false).length);
        }
        if (dbData.apiProvider) {
          setActiveProvider(dbData.apiProvider);
        }
        if (dbData.aiModel) {
          setActiveModel(dbData.aiModel);
        }
        if (dbData.customApiKey) {
          if (dbData.apiProvider === 'openai') {
            setOpenAiKey(dbData.customApiKey);
          } else {
            setGoogleAiKey(dbData.customApiKey);
          }
        }
        if (dbData.blacklistedBots && Array.isArray(dbData.blacklistedBots)) {
          setBlacklistedNumbersText(dbData.blacklistedBots.join('\n'));
        }
        if (dbData.apiTokens) {
          setApiTokens(dbData.apiTokens);
        }

        // Sincronizar campos de remarketing
        if (dbData.remarketingCount !== undefined) {
          setRemarketingCount(Number(dbData.remarketingCount));
        }
        if (dbData.remarketingInterval !== undefined) {
          setRemarketingInterval(dbData.remarketingInterval);
        }
        if (dbData.remarketingAvoidSpam !== undefined) {
          setRemarketingAvoidSpam(!!dbData.remarketingAvoidSpam);
        }
        if (dbData.remarketingMessages && Array.isArray(dbData.remarketingMessages)) {
          setRemarketingMessages(dbData.remarketingMessages);
        }
        if (dbData.remarketingUseAI && Array.isArray(dbData.remarketingUseAI)) {
          setRemarketingUseAI(dbData.remarketingUseAI);
        }
        if (dbData.remarketingAttachments && Array.isArray(dbData.remarketingAttachments)) {
          setRemarketingAttachments(dbData.remarketingAttachments);
        }

        // Detectar si la memoria fue limpiada en el servidor (chats y messagesHistory vacíos)
        const isServerCleared = Array.isArray(dbData.chats) && dbData.chats.length === 0 &&
          (!dbData.messagesHistory || Object.keys(dbData.messagesHistory).length === 0);

        if (isServerCleared) {
          setChats([]);
          setMessages({});
          try {
            localStorage.removeItem(chatsStorageKey);
            localStorage.removeItem(messagesStorageKey);
          } catch(e) {}
        } else if (dbData.chats && Array.isArray(dbData.chats)) {
          setChats(prevChats => {
            let updated = [...prevChats];

            dbData.chats.forEach((bChat: any) => {
              if (!bChat.phone) return;
              const cleanBPhone = bChat.phone.replace(/\D/g, '');

              const existingIdx = updated.findIndex(c => c.phone.replace(/\D/g, '') === cleanBPhone || c.id === bChat.id);

              if (existingIdx >= 0) {
                const existing = updated[existingIdx];
                if (existing.msg !== bChat.message || existing.time !== bChat.time || (!existing.avatar && bChat.avatar)) {
                  updated[existingIdx] = {
                    ...existing,
                    msg: bChat.message || existing.msg,
                    time: bChat.time || existing.time,
                    columnId: bChat.status || existing.columnId,
                    avatar: bChat.avatar || existing.avatar,
                    name: (bChat.sender && bChat.sender !== 'Cliente WhatsApp' ? bChat.sender : existing.name)
                  };
                }
              } else {
                // Nuevo chat recibido por WhatsApp real
                const newChatObj = {
                  id: bChat.id || `chat-${cleanBPhone}`,
                  name: bChat.sender || bChat.name || bChat.phone,
                  time: bChat.time || formatColombiaTime(new Date()),
                  msg: bChat.message || 'Nuevo mensaje de WhatsApp',
                  unread: 1,
                  phone: bChat.phone,
                  avatar: bChat.avatar || undefined,
                  columnId: bChat.status || 'nuevo_contacto',
                  tags: ['WhatsApp Real'],
                  leadStatus: 'caliente' as const
                };
                updated = [newChatObj, ...updated];
              }
            });

            return updated;
          });
        }

        // 2. Sincronizar historial de mensajes
        if (dbData.messagesHistory && typeof dbData.messagesHistory === 'object') {
          setMessages(prevMsgs => {
            const nextMsgs = { ...prevMsgs };
            let changed = false;

            Object.keys(dbData.messagesHistory).forEach(phoneKey => {
              const cleanPhone = phoneKey.replace(/\D/g, '');
              const history = dbData.messagesHistory[phoneKey];
              if (!Array.isArray(history) || history.length === 0) return;

              // Buscar ID de chat que coincida con este número
              const matchingDbChat = dbData.chats?.find((c: any) => c.phone && c.phone.replace(/\D/g, '') === cleanPhone);
              const chatId = matchingDbChat ? matchingDbChat.id : `chat-${cleanPhone}`;

              const formattedHistory = history.map((m: any) => ({
                sender: (m.role === 'client' ? 'client' : (m.role === 'agent' ? 'agent' : 'bot')) as 'client' | 'agent' | 'bot',
                text: m.text,
                attachment: m.attachment,
                fromMobile: !!m.fromMobile || m.source === 'mobile',
                source: m.source,
                time: m.time || 'Ahora'
              }));

              const currentHistory = nextMsgs[chatId] || nextMsgs[cleanPhone] || [];
              const isDifferent = currentHistory.length !== formattedHistory.length ||
                formattedHistory.some((item, idx) => !currentHistory[idx] || currentHistory[idx].text !== item.text);

              if (isDifferent) {
                // Registrar bajo todas las claves de resolución posibles
                const keysToSet = new Set([chatId, cleanPhone, `chat-${cleanPhone}`, phoneKey]);
                if (matchingDbChat?.id) keysToSet.add(matchingDbChat.id);
                keysToSet.forEach(k => {
                  if (k) nextMsgs[k] = formattedHistory;
                });
                changed = true;
              }
            });

            return changed ? nextMsgs : prevMsgs;
          });
        }
      } catch (e) {
        // Ignorar errores transitorios durante recargas
      }
    };

    syncChatsAndHistory();
    syncInterval = setInterval(syncChatsAndHistory, 2500);

    return () => {
      if (syncInterval) clearInterval(syncInterval);
    };
  }, []);


  // CRM live capture states
  const [captureName, setCaptureName] = useState('María Camila Restrepo');
  const [captureCity, setCaptureCity] = useState('Medellín');
  const [captureDept, setCaptureDept] = useState('Antioquia');
  const [captureProduct, setCaptureProduct] = useState('Smartwatch Ultra X8');
  const [captureCampaign, setCaptureCampaign] = useState('Anuncio Facebook - 30% Off');
  const [captureIsRecurring, setCaptureIsRecurring] = useState(false);
  const [captureTicket, setCaptureTicket] = useState(120000);
  const [lastGeneratedGuia, setLastGeneratedGuia] = useState<{ id: string; trackingCode: string; carrier: string; total: number; date: string } | null>(null);
  const [showGuiaModal, setShowGuiaModal] = useState(false);
  const [guiaCopied, setGuiaCopied] = useState(false);
  const [guiaSentToChat, setGuiaSentToChat] = useState(false);

  // Official API & Multichannel states
  const [apiToken, setApiToken] = useState('EAAbx1928392819283...');
  const [phoneNumberId, setPhoneNumberId] = useState('109283918239');
  const [wabaId, setWabaId] = useState('982349823491');
  const [isOfficialConnected, setIsOfficialConnected] = useState(false);
  const [whatsappMode, setWhatsappMode] = useState<'coexistente' | 'nuevo' | 'transferir'>('coexistente');
  const [whatsappConnectedNumber, setWhatsappConnectedNumber] = useState('');

  // Estados para la Guía Paso a Paso de Credenciales WhatsApp API
  const [isSyncingChats, setIsSyncingChats] = useState(false);
  const [activeGuideStep, setActiveGuideStep] = useState(1);
  const [guideToken, setGuideToken] = useState('');
  const [guidePhoneId, setGuidePhoneId] = useState('');
  const [guideWabaId, setGuideWabaId] = useState('');
  const [guidePhoneNumber, setGuidePhoneNumber] = useState('');
  const [guidePin, setGuidePin] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [isSavingGuideCreds, setIsSavingGuideCreds] = useState(false);
  const [isVerifyingCreds, setIsVerifyingCreds] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{ success: boolean; msg: string } | null>(null);

  // Estados específicos de Meta Cloud API & Omnicanal (WhatsApp, Instagram, TikTok, Facebook)
  const [zernioConnected, setZernioConnected] = useState(false);
  const [isConnectingZernio, setIsConnectingZernio] = useState(false);
  const [showHeadlessModal, setShowHeadlessModal] = useState(false);
  const [showLogisticsModal, setShowLogisticsModal] = useState(false);
  const [allAccounts, setAllAccounts] = useState<any[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [isConnectingPlatform, setIsConnectingPlatform] = useState<string | null>(null);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [channelTab, setChannelTab] = useState<'todos' | 'whatsapp' | 'instagram' | 'tiktok' | 'facebook'>('todos');
  const [searchChannel, setSearchChannel] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('todos');
  const [channelFilterStatus, setChannelFilterStatus] = useState('todos');
  const [logisticsAction, setLogisticsAction] = useState<'confirm' | 'dispatch' | 'novelty' | 'delivered'>('confirm');
  const [logisticsPlatform, setLogisticsPlatform] = useState<'dropi' | 'mastershop' | 'effix'>('dropi');
  const [logisticsData, setLogisticsData] = useState({
    customerName: 'Cliente Ejemplo',
    customerPhone: '+573001234567',
    orderId: 'ORD-1092',
    productName: 'Reloj Smartwatch Ultra',
    totalPrice: '149000',
    deliveryAddress: 'Calle 100 #15-20',
    city: 'Bogotá D.C.',
    carrierName: 'Servientrega',
    trackingNumber: 'SER-89283719',
    trackingUrl: 'https://servientrega.com/rastreo?guia=SER-89283719',
    noveltyReason: 'Dirección no encontrada o cliente ausente'
  });
  const [isSendingLogistics, setIsSendingLogistics] = useState(false);
  const [logisticsResultMsg, setLogisticsResultMsg] = useState<{ success: boolean; text: string } | null>(null);

  const checkMetaConnection = async () => {
    setIsLoadingAccounts(true);
    try {
      const res = await fetch('/api/zernio/accounts');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setAllAccounts(data.data);
        const waAccount = data.data.find((a: any) => a.platform === 'whatsapp');
        if (waAccount) {
          setIsOfficialConnected(true);
          setZernioConnected(true);
          if (waAccount.phoneNumber) setWhatsappConnectedNumber(waAccount.phoneNumber);
          if (waAccount.phoneNumberId) setPhoneNumberId(waAccount.phoneNumberId);
          if (waAccount.wabaId) setWabaId(waAccount.wabaId);
          return true;
        }
      }
    } catch (e) {
      console.warn('Error verificando cuentas:', e);
    } finally {
      setIsLoadingAccounts(false);
    }
    return false;
  };

  useEffect(() => {
    checkMetaConnection();

    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'META_WABA_CONNECTED' || e.data?.type === 'CHANNEL_CONNECTED' || e.data?.type === 'OAUTH_AUTH_SUCCESS') {
        setIsOfficialConnected(true);
        setZernioConnected(true);
        checkMetaConnection();
        setShowConnectModal(false);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleConnectPlatform = async (platform: string, onboardingMode?: string) => {
    setIsConnectingPlatform(platform);
    try {
      const apiPlatform = platform === 'instagram_beta' ? 'instagram' : platform;
      let url = `/api/zernio/connect-url?platform=${apiPlatform}`;
      if (platform === 'shopify') {
        const shop = window.prompt('Dominio de Shopify (ejemplo: tu-tienda.myshopify.com):');
        if (!shop) return;
        url += `&shop=${encodeURIComponent(shop.trim())}`;
      }
      if (platform === 'whatsapp') {
        const mode = onboardingMode || (whatsappMode === 'coexistente' ? 'business_app' : 'api');
        url += `&onboarding=${mode}`;
      } else if (platform === 'instagram_beta') {
        // Beta: use Meta's unified Facebook login flow for Follow to DM eligibility.
        url += '&loginMethod=facebook_login';
      } else if (platform === 'instagram') {
        // Standard Instagram connection.
        url += '&loginMethod=instagram_login';
      }
      const res = await fetch(url);
      const json = await res.json();
      const targetUrl = json.authUrl || json.data?.authUrl || json.url;
      if (json.success && targetUrl) {
        const w = 580, h = 720;
        const left = window.screen.width / 2 - w / 2;
        const top = window.screen.height / 2 - h / 2;
        const popup = window.open(targetUrl, `Connect_${platform}`, `width=${w},height=${h},top=${top},left=${left}`);

        let attempts = 0;
        const pollInterval = setInterval(async () => {
          attempts++;
          if (attempts > 60 || (popup && popup.closed)) {
            clearInterval(pollInterval);
            checkMetaConnection();
          }
          const connected = await checkMetaConnection();
          if (connected) {
            clearInterval(pollInterval);
            if (popup && !popup.closed) popup.close();
          }
        }, 2500);
        return;
      }
    } catch (e) {
      console.warn(`Error conectando ${platform}:`, e);
    } finally {
      setIsConnectingPlatform(null);
    }

    if (platform === 'whatsapp') {
      const w = 550, h = 680;
      const left = window.screen.width / 2 - w / 2;
      const top = window.screen.height / 2 - h / 2;
      window.open(`${window.location.origin}/auth/meta-whatsapp?mode=${whatsappMode}`, 'MetaWabaConnection', `width=${w},height=${h},top=${top},left=${left}`);
    }
  };

  const handleDisconnectAccount = async (accountId: string, platform?: string) => {
    if (!confirm('¿Estás seguro de que deseas desvincular este canal?')) return;
    try {
      if (platform === 'whatsapp' || accountId.startsWith('local_')) {
        setIsOfficialConnected(false);
        setZernioConnected(false);
        setWhatsappConnectedNumber('');
        await fetch('/api/integrations/meta-tiktok/save-whatsapp-oauth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ connectedUser: null })
        }).catch(() => {});
      }
      if (accountId && !accountId.startsWith('local_')) {
        await fetch(`/api/zernio/accounts/${accountId}`, { method: 'DELETE' });
      }
      await checkMetaConnection();
    } catch (e) {
      console.error('Error al desconectar canal:', e);
    }
  };

  const handleConnectWithZernio = async () => {
    handleConnectPlatform('whatsapp');
  };


  const handleConnectHeadlessWaba = async () => {
    if (!guideToken || !guidePhoneId || !guideWabaId) {
      alert('Por favor ingrese el Token Permanente, WABA ID y Phone Number ID.');
      return;
    }
    setIsVerifyingCreds(true);
    setVerificationResult(null);
    try {
      const res = await fetch('/api/zernio/connect/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: guideToken,
          wabaId: guideWabaId,
          phoneNumberId: guidePhoneId,
          pin: guidePin || undefined
        })
      });
      const data = await res.json();
      if (data.success) {
        setVerificationResult({
          success: true,
          msg: '✓ Cuenta de WhatsApp Business Cloud API conectada con éxito.'
        });
        setIsOfficialConnected(true);
        setZernioConnected(true);
        setPhoneNumberId(guidePhoneId);
        setWabaId(guideWabaId);
        setApiToken(guideToken);
      } else {
        setVerificationResult({
          success: false,
          msg: `Error: ${data.error?.message || data.error || 'No se pudo conectar la WABA con Meta'}`
        });
      }
    } catch (err: any) {
      setVerificationResult({
        success: false,
        msg: `Fallo de conexión: ${err.message}`
      });
    } finally {
      setIsVerifyingCreds(false);
    }
  };

  const handleSendLogisticsTemplate = async () => {
    setIsSendingLogistics(true);
    setLogisticsResultMsg(null);
    try {
      const res = await fetch('/api/zernio/logistics/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: logisticsAction,
          order: {
            platform: logisticsPlatform,
            orderId: logisticsData.orderId,
            customerName: logisticsData.customerName,
            customerPhone: logisticsData.customerPhone,
            productName: logisticsData.productName,
            totalPrice: logisticsData.totalPrice,
            deliveryAddress: logisticsData.deliveryAddress,
            city: logisticsData.city,
            carrierName: logisticsData.carrierName,
            trackingNumber: logisticsData.trackingNumber,
            trackingUrl: logisticsData.trackingUrl,
            noveltyReason: logisticsData.noveltyReason
          }
        })
      });
      const json = await res.json();
      if (json.success) {
        setLogisticsResultMsg({
          success: true,
          text: `✓ Plantilla de ${logisticsAction.toUpperCase()} enviada exitosamente a ${logisticsData.customerPhone} vía WhatsApp Business Cloud API. ID Mensaje: ${json.messageId || 'OK'}`
        });
      } else {
        setLogisticsResultMsg({
          success: false,
          text: `Error: ${json.error || 'No se pudo enviar la plantilla'}`
        });
      }
    } catch (err: any) {
      setLogisticsResultMsg({
        success: false,
        text: `Error en la solicitud: ${err.message}`
      });
    } finally {
      setIsSendingLogistics(false);
    }
  };

  const handleSyncRecentChats = async () => {
    setIsSyncingChats(true);
    try {
      const res = await fetch('/api/whatsapp/sync-recent-chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 100 })
      });
      const data = await res.json();
      if (data.success && data.chats) {
        setChats(data.chats);
        if (data.messagesHistory) {
          setMessages(prev => {
            const next = { ...prev };
            Object.keys(data.messagesHistory).forEach(phoneKey => {
              const cleanPhone = phoneKey.replace(/\D/g, '');
              const history = data.messagesHistory[phoneKey];
              if (!Array.isArray(history)) return;
              const formatted = history.map((m: any) => ({
                sender: (m.role === 'client' ? 'client' : (m.role === 'agent' ? 'agent' : 'bot')) as 'client' | 'agent' | 'bot',
                text: m.text,
                attachment: m.attachment,
                fromMobile: !!m.fromMobile || m.source === 'mobile',
                source: m.source,
                time: m.time || 'Ahora'
              }));
              [cleanPhone, `chat-${cleanPhone}`, phoneKey].forEach(k => {
                if (k) next[k] = formatted;
              });
              const matchingChat = data.chats.find((c: any) => c.phone && c.phone.replace(/\D/g, '') === cleanPhone);
              if (matchingChat?.id) next[matchingChat.id] = formatted;
            });
            return next;
          });
        }
      }
    } catch (e) {
      console.error('Error syncing chats:', e);
    } finally {
      setIsSyncingChats(false);
    }
  };

  const handleVerifyCredentials = async () => {
    if (!guideToken || !guidePhoneId) {
      alert('Por favor ingrese el Token permanente de Meta y el Phone ID.');
      return;
    }
    setIsVerifyingCreds(true);
    setVerificationResult(null);
    try {
      const res = await fetch('/api/whatsapp/verify-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiToken: guideToken, phoneNumberId: guidePhoneId })
      });
      const data = await res.json();
      if (data.success) {
        setVerificationResult({
          success: true,
          msg: `✓ Autenticación exitosa con Meta Cloud API. Número verificado: ${data.displayPhoneNumber || guidePhoneNumber || 'OK'}`
        });
        if (data.displayPhoneNumber) {
          setGuidePhoneNumber(data.displayPhoneNumber);
        }
      } else {
        setVerificationResult({
          success: false,
          msg: `❌ Error de autenticación: ${data.error || 'Credenciales inválidas o expiradas.'}`
        });
      }
    } catch (e: any) {
      setVerificationResult({
        success: false,
        msg: '❌ Error de red al verificar credenciales: ' + e.message
      });
    } finally {
      setIsVerifyingCreds(false);
    }
  };

  const [facebookConnected, setFacebookConnected] = useState(false);
  const [instagramConnected, setInstagramConnected] = useState(false);
  const [tiktokConnected, setTiktokConnected] = useState(false);

  // Modal flow states
  const [activeModalChannel, setActiveModalChannel] = useState<'none' | 'facebook' | 'instagram' | 'tiktok'>('none');
  const [selectedFbPage, setSelectedFbPage] = useState('Mi Tienda Dropi - Principal');
  const [selectedIgAccount, setSelectedIgAccount] = useState('@mitienda_oficial');
  const [tiktokKey, setTiktokKey] = useState('');

  // Official Templates state
  const [templates, setTemplates] = useState([
    { id: '1', name: 'confirmacion_pedido', category: 'UTILITY', language: 'es', status: 'APPROVED', body: '¡Hola {{1}}! Tu pedido de {{2}} ha sido confirmado y está en camino con Pago Contra Entrega. Código de guía: {{3}}. Gracias por tu compra! 📦', headerType: 'IMAGE', headerUrl: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=400&q=80' },
    { id: '2', name: 'recuperacion_carrito', category: 'MARKETING', language: 'es', status: 'APPROVED', body: '¡Hola {{1}}! Vimos que dejaste tu {{2}} en el carrito de compras. Completa tu orden hoy y obtén un 10% de descuento usando el código RECUPERA10. 🎁', headerType: 'VIDEO', headerUrl: 'https://assets.mixkit.co/videos/preview/mixkit-card-payment-in-a-shop-40243-large.mp4' },
    { id: '3', name: 'soporte_general', category: 'UTILITY', language: 'es', status: 'APPROVED', body: 'Hola {{1}}, un asesor de soporte se pondrá en contacto contigo pronto para resolver tu duda sobre: {{2}}. Horario de atención: 8am - 6pm. 💬', headerType: 'DOCUMENT', headerUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' }
  ]);
  const [selectedTemplate, setSelectedTemplate] = useState('confirmacion_pedido');
  const [testRecipient, setTestRecipient] = useState('+573001234567');
  const [testVariables, setTestVariables] = useState('Juan, Smartwatch Ultra, COL-9821');
  const [templateSendingStatus, setTemplateSendingStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateBody, setNewTemplateBody] = useState('');
  const [newTemplateCategory, setNewTemplateCategory] = useState('UTILITY');
  const [newTemplateHeaderType, setNewTemplateHeaderType] = useState<'NONE' | 'IMAGE' | 'VIDEO' | 'DOCUMENT'>('NONE');
  const [newTemplateHeaderUrl, setNewTemplateHeaderUrl] = useState('');
  const [scannerActive, setScannerActive] = useState(false);
  const [scannedData, setScannedData] = useState<string | null>(null);

  // Drag & Drop / Template Management States
  const [isDragging, setIsDragging] = useState(false);
  const [templateFormMode, setTemplateFormMode] = useState<'create' | 'edit'>('create');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileProcess = (file: File) => {
    let headerType: 'NONE' | 'IMAGE' | 'VIDEO' | 'DOCUMENT' = 'NONE';
    if (file.type.startsWith('image/')) {
      headerType = 'IMAGE';
    } else if (file.type.startsWith('video/')) {
      headerType = 'VIDEO';
    } else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      headerType = 'DOCUMENT';
    } else {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext || '')) {
        headerType = 'IMAGE';
      } else if (['mp4', 'mov', 'webm', 'avi'].includes(ext || '')) {
        headerType = 'VIDEO';
      } else if (ext === 'pdf') {
        headerType = 'DOCUMENT';
      }
    }

    if (headerType === 'NONE') {
      alert('Tipo de archivo no soportado. Sube una imagen, video o PDF.');
      return;
    }

    const previewUrl = URL.createObjectURL(file);

    if (templateFormMode === 'create') {
      setNewTemplateHeaderType(headerType);
      setNewTemplateHeaderUrl(previewUrl);
    } else {
      setTemplates(prev => prev.map(t => {
        if (t.name === selectedTemplate) {
          return {
            ...t,
            headerType,
            headerUrl: previewUrl
          };
        }
        return t;
      }));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileProcess(e.target.files[0]);
    }
  };

  // Hook for OAuth events and loading config
  React.useEffect(() => {
    const handleOAuthMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        const { provider, data } = event.data;
        if (provider === 'meta') {
          setFacebookConnected(true);
          setInstagramConnected(true);
        } else if (provider === 'tiktok') {
          setTiktokConnected(true);
        } else if (provider === 'meta-whatsapp') {
          setApiToken(data.apiToken || 'EAAbx...');
          setPhoneNumberId(data.phoneNumberId || '109283918239');
          setWabaId(data.wabaId || '982349823491');
          setIsOfficialConnected(true);
          setWhatsappMode(data.mode || 'coexistente');
          setWhatsappConnectedNumber(data.phoneNumber || '+57 300 123 4567');
        }
      }
    };
    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, []);

  React.useEffect(() => {
    fetch('/api/integrations/whatsapp-oauth/config')
      .then(r => r.ok ? r.json() : null)
      .then(res => {
        if (res && res.success && res.config) {
          const cfg = res.config;
          setApiToken(cfg.apiToken || 'EAAbx...');
          setPhoneNumberId(cfg.phoneNumberId || '109283918239');
          setWabaId(cfg.wabaId || '982349823491');
          setIsOfficialConnected(true);
          setWhatsappMode(cfg.mode || 'coexistente');
          setWhatsappConnectedNumber(cfg.phoneNumber || '+57 300 123 4567');

          // Rellenar variables de la guía
          setGuideToken(cfg.apiToken || '');
          setGuidePhoneId(cfg.phoneNumberId || '');
          setGuideWabaId(cfg.wabaId || '');
          setGuidePhoneNumber(cfg.phoneNumber || '');
        }
      })
      .catch(() => {});
  }, []);

  const handleSaveGuideCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guideToken || !guidePhoneId || !guideWabaId || !guidePhoneNumber) {
      alert('Por favor complete todos los campos requeridos en el Paso 4.');
      return;
    }

    setIsSavingGuideCreds(true);
    try {
      const payload = {
        provider: 'meta-whatsapp',
        connectedUser: {
          name: 'Línea de WhatsApp Real',
          id: guidePhoneId,
          avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80',
          apiToken: guideToken,
          phoneNumberId: guidePhoneId,
          wabaId: guideWabaId,
          mode: 'produccion_real',
          phoneNumber: guidePhoneNumber
        }
      };

      const res = await fetch('/api/integrations/meta-tiktok/save-whatsapp-oauth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        setApiToken(guideToken);
        setPhoneNumberId(guidePhoneId);
        setWabaId(guideWabaId);
        setWhatsappConnectedNumber(guidePhoneNumber);
        setIsOfficialConnected(true);
        alert('✅ ¡Credenciales de WhatsApp Business API guardadas de forma segura y conexión activa! El envío de plantillas reales ahora está habilitado.');
      } else {
        alert('❌ Error al guardar las credenciales: ' + (data.error || 'Desconocido'));
      }
    } catch (err: any) {
      alert('❌ Error de red al conectar con el servidor: ' + err.message);
    } finally {
      setIsSavingGuideCreds(false);
    }
  };



  // Configuration States con Persistencia
  const [botPrompt, setBotPrompt] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('whatsapp_bot_prompt_v1');
      if (saved) return saved;
    } catch (e) {}
    return `Eres el Asistente Virtual Oficial del Restaurante. Tu objetivo principal es brindar una atención cordial, rápida y apetitosa por WhatsApp para mostrar el menú, tomar pedidos a domicilio y gestionar reservas de mesa.

1. TONO Y COMUNICACIÓN:
- Sé amable, educado y entusiasta. Usa emojis gastronómicos acordes (🍕, 🍔, 🥩, 🍷, 🛵).
- Saluda con calidez ofreciendo las promociones o sugerencias del chef del día.

2. MENÚ Y ESPECIALIDADES:
- Platos Fuertes: Hamburguesas Artesanales, Pizzas a la Leña, Cortes de Carne, Pastas y Opciones Vegetarianas.
- Entradas: Papas Rústicas con Cheddar, Nachos Supremos, Alitas BBQ/Búfalo.
- Bebidas y Postres: Limonadas Naturales, Cervezas Artesanales, Malteadas, Cheesecake.
- Combos: Combo Pareja (2 Platos + 2 Bebidas + Postre con 15% Off) y Combo Familiar.

3. FLUJO DE TOMA DE PEDIDOS (DOMICILIOS):
Cuando el cliente solicite un domicilio, solicita en orden:
a) Platos y especificaciones (término de carne, sin cebolla, adiciones).
b) Nombre completo del cliente.
c) Dirección exacta de entrega (Barrio + Ciudad + Punto de referencia).
d) Método de pago (Efectivo, Nequi, Daviplata, Tarjeta o Pago contra entrega).
e) Confirma el resumen del pedido y el tiempo estimado de entrega (30 a 45 minutos).

4. RESERVAS DE MESAS:
Si el cliente desea reservar una mesa, solicita:
a) Fecha y Hora exacta.
b) Número de personas.
c) Ocasión especial (Cumpleaños, Aniversario, Cita o Reunión).
d) Nombre y teléfono de contacto.

5. HORARIOS Y COBERTURA:
- Horario de Atención: Lunes a Domingo de 11:30 AM a 10:30 PM.
- Zona de cobertura de domicilios: Hasta 8 km sin recargo.`;
  });

  React.useEffect(() => {
    try {
      localStorage.setItem('whatsapp_bot_prompt_v1', botPrompt);
    } catch (e) {}
    const timer = setTimeout(() => {
      fetch('/api/backoffice/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botPrompt, lastTrainingUpdate: Date.now() })
      }).catch(() => {});
    }, 1200);
    return () => clearTimeout(timer);
  }, [botPrompt]);

  // Presets de Prompts para Restaurante y Gastronomía
  const RESTAURANT_PROMPTS_PRESETS = [
    {
      id: 'gourmet',
      name: '🍕 Restaurante Gourmet & Carta Completa',
      description: 'Atención completa para restaurante con carta, pedidos a domicilio, menú del día y reservas.',
      prompt: `Eres el Asistente Virtual Oficial del Restaurante. Tu objetivo principal es brindar una atención cordial, rápida y apetitosa por WhatsApp para mostrar el menú, tomar pedidos a domicilio y gestionar reservas de mesa.

1. TONO Y COMUNICACIÓN:
- Sé amable, educado y entusiasta. Usa emojis gastronómicos acordes (🍕, 🍔, 🥩, 🍷, 🛵).
- Saluda con calidez ofreciendo las promociones o sugerencias del chef del día.

2. MENÚ Y ESPECIALIDADES:
- Platos Fuertes: Hamburguesas Artesanales, Pizzas a la Leña, Cortes de Carne, Pastas y Opciones Vegetarianas.
- Entradas: Papas Rústicas con Cheddar, Nachos Supremos, Alitas BBQ/Búfalo.
- Bebidas y Postres: Limonadas Naturales, Cervezas Artesanales, Malteadas, Cheesecake.
- Combos: Combo Pareja (2 Platos + 2 Bebidas + Postre con 15% Off) y Combo Familiar.

3. FLUJO DE TOMA DE PEDIDOS (DOMICILIOS):
Cuando el cliente solicite un domicilio, solicita en orden:
a) Platos y especificaciones (término de carne, sin cebolla, adiciones).
b) Nombre completo del cliente.
c) Dirección exacta de entrega (Barrio + Ciudad + Punto de referencia).
d) Método de pago (Efectivo, Nequi, Daviplata, Tarjeta o Pago contra entrega).
e) Confirma el resumen del pedido y el tiempo estimado de entrega (30 a 45 minutos).

4. RESERVAS DE MESAS:
Si el cliente desea reservar una mesa, solicita:
a) Fecha y Hora exacta.
b) Número de personas.
c) Ocasión especial (Cumpleaños, Aniversario, Cita o Reunión).
d) Nombre y teléfono de contacto.

5. HORARIOS Y COBERTURA:
- Horario de Atención: Lunes a Domingo de 11:30 AM a 10:30 PM.
- Zona de cobertura de domicilios: Hasta 8 km sin recargo.`
    },
    {
      id: 'fastfood',
      name: '🍔 Comida Rápida & Combos Express',
      description: 'Enfocado en respuesta ultra-rápida, promociones, agrandar combos y delivery express.',
      prompt: `Eres el Bot Express de Comida Rápida. Tu objetivo es tomar pedidos de forma ágil, directa y sugiriendo siempre agrandar combos o agregar bebidas y acompañamientos.

1. MENÚ PRINCIPAL:
- Hamburguesas Dobles con Tocino y Queso Cheddar.
- Perros Calientes Especiales con Queso Costeño y Papita Rizada.
- Salchipapas Gigantes y Tacos Tex-Mex.
- Combos Express: Incluyen Papas a la Francesa + Gaseosa Fría.

2. FLUJO DE VENTA RÁPIDA:
- Saluda con energía y muestra los Combos Top Ventas.
- Solicita de inmediato: Platos elegidos, Nombre, Dirección exacta y Barrio.
- Confirma el método de pago (Aceptamos Efectivo Contra Entrega y Nequi).
- Tiempo de despacho express: 20 a 35 minutos.`
    },
    {
      id: 'pizzeria',
      name: '🍕 Pizzería & Comida Italiana',
      description: 'Optimizado para tamaños de pizza, ingredientes al gusto, bordes rellenos y lasagnas.',
      prompt: `Eres el Asistente Virtual de la Pizzería Artesanal. Tu función es guiar al cliente en la elección de pizzas, pastas y postres italianos, gestionando domicilios y pedidos para llevar.

1. MENÚ DE PIZZAS Y PASTAS:
- Pizzas Artesanales: Pepperoni, 4 Quesos, Hawaiana Especial, Carnes, Vegetariana.
- Tamaños: Personal (4 porciones), Mediana (8 porciones), Familiar (12 porciones).
- Opciones de Borde: Relleno de Queso Mozzarella o Arequipe.
- Pastas: Lasagna Bolognesa, Fettuccine Alfredo y Cannolis.

2. TOMA DE PEDIDOS:
- Asesora según la cantidad de personas (ej: "Para 3 personas te recomendamos 1 Pizza Familiar o 2 Medianas").
- Confirma dirección de entrega y método de pago antes de pasar la orden a horno.`
    },
    {
      id: 'cafe_reposteria',
      name: '☕ Café, Repostería & Desayunos Sorpresa',
      description: 'Atención personalizada para tortas, desayunos sorpresa y café especial.',
      prompt: `Eres la Asistente Virtual de Café & Repostería. Atiendes consultas sobre tortas personalizadas, desayunos sorpresa, repostería fina y café de origen.

1. PRODUCTOS Y SERVICIOS:
- Desayunos Sorpresa: Incluyen jugo natural, sándwich gourmet, fruta fresca, globo y tarjeta personalizada.
- Tortas Personalizadas: Requieren pedido con mínimo 24 horas de anticipación.
- Repostería Fina: Red Velvet, Cheesecake de Frutos Rojos, Brownies y Galletas.

2. DATOS REQUERIDOS:
- Fecha y hora exacta de entrega del detalle.
- Nombre y teléfono del remitente y del destinatario.
- Mensaje personalizado para la tarjeta.`
    },
    {
      id: 'parrilla',
      name: '🥩 Parrilla & Cortes de Carne',
      description: 'Especializado en términos de cocción de carnes, parrilladas familiares y reservas.',
      prompt: `Eres el Sommelier y Asistente Virtual de la Parrilla. Tu misión es asesorar sobre cortes de carne de alta calidad, parrilladas para compartir, maridaje de vinos y reservas.

1. MENÚ DE LA PARRILLA:
- Cortes Especiales: Baby Beef, Bife de Chorizo, Ojo de Bife, Tomahawk, Pechuga a la Parrilla.
- Términos de Cocción: Medio, 3/4 o Bien Cocido.
- Parrilladas Familiares: Incluyen carne, pollo, chorizo, chunchullo, arepas y papa criolla.

2. TOMA DE RESERVAS Y DOMICILIOS:
- Consulta el término de cocción preferido para cada corte.
- Gestiona reservas para grupos grandes especificando fecha, hora y número de comensales.`
    }
  ];

  // Interactive Prompt Trainer Chat State
  const [trainerMessages, setTrainerMessages] = useState<{
    id: string;
    sender: 'ai' | 'user';
    text: string;
    time: string;
    attachment?: {
      name: string;
      type: 'imagen' | 'video' | 'audio' | 'archivo';
      url: string;
      size?: string;
    };
  }>([
    {
      id: '1',
      sender: 'ai',
      text: `¡Hola! 👋 Soy tu Consultor e Instructor de Inteligencia Artificial para WhatsApp.

Te guiaré paso a paso para crear el **Prompt Definitivo** de tu negocio de forma 100% profesional y humana, sin sonar como un bot robótico:

1️⃣ **Mensaje inicial de bienvenida**: ¿Cómo quieres que salude tu bot al iniciar conversación?
2️⃣ **Menú / Oferta de Productos**: ¿Qué productos o platos ofreces y cuáles son sus precios?
3️⃣ **Imágenes y Videos**: ¿En qué momento enviar fotos del menú visual, catálogo o videos?
4️⃣ **Preguntas Frecuentes**: ¿Horarios de atención, medios de pago (Nequi/Efectivo) y zonas de envío o reservas?

💡 *Escríbeme por texto, sube archivos/imágenes/videos o envíame notas de voz 🎤.* Iré actualizando tu prompt en tiempo real.`,
      time: formatLocalTime(new Date())
    }
  ]);
  const [trainerInput, setTrainerInput] = useState('');
  const [trainerAttachment, setTrainerAttachment] = useState<{ name: string; type: 'imagen' | 'video' | 'audio' | 'archivo'; url: string; size?: string } | null>(null);
  const [isRecordingTrainerAudio, setIsRecordingTrainerAudio] = useState(false);
  const [trainerAudioSeconds, setTrainerAudioSeconds] = useState(0);
  const [isTrainerThinking, setIsTrainerThinking] = useState(false);

  // Live Audio Recorder States for WhatsApp PTT Voice Notes
  const [showLiveRecorderInChat, setShowLiveRecorderInChat] = useState(false);
  const [activeFaqAudioIndex, setActiveFaqAudioIndex] = useState<number | null>(null);
  const [activeRuleAudioIndex, setActiveRuleAudioIndex] = useState<number | null>(null);
  const isGreetingFocusedRef = React.useRef(false);
  const isGreetingEditedRef = React.useRef(false);
  const isFaqsFocusedRef = React.useRef(false);
  const isFaqsEditedRef = React.useRef(false);
  const [showTrainerLiveRecorder, setShowTrainerLiveRecorder] = useState(false);

  // Remarketing & Follow-up configuration state in Trainer Chat (declared below)

  const handleConfigureRemarketing = (count: number, interval: string) => {
    setRemarketingCount(count);
    setRemarketingInterval(interval);

    const statusText = count === 0
      ? 'Desactivado'
      : `${count} ${count === 1 ? 'recordatorio' : 'recordatorios'} cada ${interval}`;

    const userTime = formatLocalTime(new Date());

    const userMsg = {
      id: String(Date.now()),
      sender: 'user' as const,
      text: `⚙️ Configurar Remarketing en Visto: ${statusText}`,
      time: userTime
    };

    const aiMsg = {
      id: String(Date.now() + 1),
      sender: 'ai' as const,
      text: count === 0
        ? `✅ **Remarketing Desactivado**: El bot no enviará mensajes automáticos de seguimiento si los clientes dejan en visto.`
        : `✅ **Remarketing Configurado Exitosamente**:

🔔 **Secuencia Activa**: El bot enviará hasta **${count} ${count === 1 ? 'recordatorio' : 'recordatorios'}** cada **${interval}** a los prospectos que hayan dejado en visto o no hayan respondido.

Los mensajes de seguimiento retomarán la conversación con empatía y elegancia para reactivar el interés sin resultar molestos.`,
      time: userTime
    };

    setTrainerMessages(prev => [...prev, userMsg, aiMsg]);

    setBotPrompt(prevPrompt => {
      const remarketingRule = count === 0
        ? `\n- REMARKETING Y SEGUIMIENTO: Desactivado.`
        : `\n- REGLAS DE REMARKETING Y SEGUIMIENTO EN VISTO: Si el prospecto no responde o deja en visto, enviar automáticamente hasta ${count} recordatorios amistosos respetando un intervalo de ${interval}. El objetivo es re-enganchar la venta con amabilidad.`;

      if (prevPrompt.includes('--- CONFIGURACIÓN DE REMARKETING Y SEGUIMIENTO ---')) {
        return prevPrompt.replace(/--- CONFIGURACIÓN DE REMARKETING Y SEGUIMIENTO ---[\s\S]*$/, `--- CONFIGURACIÓN DE REMARKETING Y SEGUIMIENTO ---\n${remarketingRule}`);
      } else {
        return `${prevPrompt}\n\n--- CONFIGURACIÓN DE REMARKETING Y SEGUIMIENTO ---\n${remarketingRule}`;
      }
    });
  };

  // Timer simulation for audio recording in trainer chat
  React.useEffect(() => {
    let interval: any;
    if (isRecordingTrainerAudio) {
      interval = setInterval(() => {
        setTrainerAudioSeconds(prev => prev + 1);
      }, 1000);
    } else {
      setTrainerAudioSeconds(0);
    }
    return () => clearInterval(interval);
  }, [isRecordingTrainerAudio]);

  const handleSendTrainerMessage = (textToSend?: string, customAttachment?: any) => {
    const content = textToSend || trainerInput;
    const attachmentObj = customAttachment || trainerAttachment;
    if (!content.trim() && !attachmentObj) return;

    const userTime = formatLocalTime(new Date());
    const newMsg = {
      id: String(Date.now()),
      sender: 'user' as const,
      text: content.trim() || (attachmentObj?.type === 'audio' ? '🎤 Nota de voz enviada' : `Adjunto: ${attachmentObj?.name}`),
      time: userTime,
      attachment: attachmentObj || undefined
    };

    setTrainerMessages(prev => [...prev, newMsg]);
    setTrainerInput('');
    setTrainerAttachment(null);
    setIsTrainerThinking(true);

    // Dynamic AI Prompt Builder synthesis with human context
    setTimeout(() => {
      let aiResponseText = '';
      const lowerContent = content.toLowerCase();

      if (attachmentObj?.type === 'audio') {
        aiResponseText = `¡He escuchado tu nota de voz detenidamente! 🎤

He analizado el tono de voz de tu mensaje y extraído los detalles clave del negocio. He configurado la IA para que utilice un lenguaje natural, empático y fluido, respondiendo como una persona real en lugar de un bot rígido.

¿Hay algún detalle adicional como horarios, promociones del día o políticas de devolución que te gustaría agregar?`;
      } else if (attachmentObj?.type === 'imagen' || attachmentObj?.type === 'video' || lowerContent.includes('imagen') || lowerContent.includes('imagenes') || lowerContent.includes('foto') || lowerContent.includes('fotos') || lowerContent.includes('video')) {
        const itemType = attachmentObj?.type === 'video' || lowerContent.includes('video') ? 'este video' : 'esta imagen / catálogo visual';
        const itemName = attachmentObj ? `"${attachmentObj.name}"` : 'el archivo visual';
        aiResponseText = `¡Excelente! He recibido y registrado ${itemType} ${itemName} 📸.

Para dejarlo programado correctamente en el bot de WhatsApp: **¿En qué momento o activación exacta de la conversación deseas que la IA le envíe esta imagen/video al cliente?**

*(Ejemplos: "Al solicitar el menú o carta visual", "Al pedir la ubicación del local", "Al consultar precios o promociones", "Al confirmar un pedido", etc.)*`;
      } else if (attachmentObj?.type === 'archivo') {
        aiResponseText = `¡Excelente! He recibido el archivo **"${attachmentObj.name}"** 📄.

He indexado su contenido como material de consulta para la IA. **¿En qué momento deseas que la IA envíe este documento a los usuarios o qué mensaje debe acompañarlo?**`;
      } else if (lowerContent.includes('visto') || lowerContent.includes('recordatorio') || lowerContent.includes('remarketing') || lowerContent.includes('seguimiento') || lowerContent.includes('desapar') || lowerContent.includes('responde')) {
        aiResponseText = `¡Entendido perfectamente! 🔔 He configurado las reglas de **Remarketing y Seguimiento en Visto**.

Si un cliente deja en visto al bot o no vuelve a escribir, la IA enviará los recordatorios automáticos (actualmente **${remarketingCount} recordatorios cada ${remarketingInterval}**) con mensajes empáticos y persuasivos para retomar la conversación sin ser invasivo.

Puedes ajustar la cantidad de recordatorios o la frecuencia usando los botones interactivos de Remarketing arriba.`;
      } else if (lowerContent.includes('hola') || lowerContent.includes('bienvenid') || lowerContent.includes('saludo')) {
        aiResponseText = `¡Entendido perfectamente! He integrado ese **saludo de bienvenida** en la memoria del bot.

El chatbot responderá con esa misma calidez y personalidad desde el primer segundo. Para continuar enriqueciendo el contexto: ¿Cuáles son tus productos o servicios estrella, sus precios y si manejas envío a domicilio o atención presencial?`;
      } else if (lowerContent.includes('menú') || lowerContent.includes('menu') || lowerContent.includes('precio') || lowerContent.includes('plato') || lowerContent.includes('combo') || lowerContent.includes('producto') || lowerContent.includes('costo') || lowerContent.includes('$')) {
        aiResponseText = `¡Perfecto! Toda la oferta comercial y lista de precios ya quedó grabada en el cerebro del bot 🛒.

Ahora cuéntame sobre las **preguntas frecuentes**: ¿Qué métodos de pago aceptas (Nequi, Daviplata, Efectivo, Tarjeta), cuáles son los horarios de atención y cómo se manejan los domicilios o reservaciones?`;
      } else {
        aiResponseText = `¡Excelente aporte! He tomado nota y actualizado el **Prompt Definitivo** en tiempo real.

Toda esta información le da un contexto completo y humano a la IA. El chatbot de WhatsApp ahora sabrá responder con la máxima precisión y empatía como si fueras tú o uno de tus mejores asesores comerciales.

¿Quieres agregar algo más o presionas el botón verde **"Aplicar Prompt Definitivo"** arriba para activarlo?`;
      }

      // Auto update botPrompt live!
      setBotPrompt(prevPrompt => {
        const addedDetail = content.trim() || (attachmentObj ? `Material de referencia: ${attachmentObj.name}` : '');
        if (!prevPrompt.includes('--- ENTRENAMIENTO IA ADICIONAL (CONTEXTO HUMANO) ---')) {
          return `${prevPrompt}\n\n--- ENTRENAMIENTO IA ADICIONAL (CONTEXTO HUMANO) ---\n- ${addedDetail}`;
        } else {
          return `${prevPrompt}\n- ${addedDetail}`;
        }
      });

      const aiMsg = {
        id: String(Date.now() + 1),
        sender: 'ai' as const,
        text: aiResponseText,
        time: formatLocalTime(new Date())
      };

      setTrainerMessages(prev => [...prev, aiMsg]);
      setIsTrainerThinking(false);
    }, 1200);
  };
  const [rules, setRules] = useState([
    "No enviar más de 2 mensajes seguidos sin respuesta.",
    "Ofrecer pago contra entrega (Dropi/MasterShop).",
    "Avisar al humano si el cliente pide garantías."
  ]);
  const [greetingMessage, setGreetingMessage] = useState(() => {
    try {
      const saved = localStorage.getItem('whatsapp_custom_greeting_v1');
      if (saved !== null) return saved;
    } catch(e) {}
    return "¡Hola! 👋 Bienvenido a la tienda. Tenemos pago contra entrega en todo el país. ¿En qué producto estás interesado?";
  });
  const [greetingAttachments, setGreetingAttachments] = useState<{ name: string; type: 'imagen' | 'video' | 'audio' | 'archivo'; url?: string }[]>(() => {
    try {
      const saved = localStorage.getItem('whatsapp_greeting_atts_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch(e) {}
    return [];
  });


  const [isRecordingGreetingAudio, setIsRecordingGreetingAudio] = useState(false);
  const [reactivationTrigger, setReactivationTrigger] = useState('🤖');
  const [blacklistedNumbersText, setBlacklistedNumbersText] = useState('');
  const [selectedChatIdToReset, setSelectedChatIdToReset] = useState<string>('');

  // Estados de Remarketing Automatizado
  const [remarketingCount, setRemarketingCount] = useState<number>(0);
  const [remarketingInterval, setRemarketingInterval] = useState<string>('2 horas');
  const [remarketingAvoidSpam, setRemarketingAvoidSpam] = useState<boolean>(true);
  const [remarketingMessages, setRemarketingMessages] = useState<string[]>(['', '', '']);
  const [remarketingUseAI, setRemarketingUseAI] = useState<boolean[]>([true, true, true]);
  const [remarketingAttachments, setRemarketingAttachments] = useState<any[][]>([[], [], []]);
  const [lastFaqSavedTime, setLastFaqSavedTime] = useState<string | null>(null);
  const [lastMemoryClearTime, setLastMemoryClearTime] = useState<string | null>(null);
  const [activeBotProfileId, setActiveBotProfileId] = useState('bot-default');
  const [botProfiles, setBotProfiles] = useState<{ id: string; name: string; role: string; prompt: string; greeting: string }[]>([
    { id: 'bot-default', name: 'Bot Principal (Administrador)', role: 'Ventas General', prompt: 'Actúa como el bot principal del negocio...', greeting: '¡Hola! 👋 Bienvenido. ¿En qué te colaboro?' },
    { id: 'bot-sales', name: 'Bot de Ventas Especializado', role: 'Cierre de Pedidos', prompt: 'Tu rol es asesorar y cerrar pedidos rápidamente...', greeting: '¡Hola! Bienvenido al canal oficial de ventas.' },
    { id: 'bot-support', name: 'Bot de Soporte y Postventa', role: 'Atención al Cliente', prompt: 'Responde dudas sobre garantías y envíos...', greeting: 'Hola, te habla el bot de soporte. ¿Cómo te colaboro con tu pedido?' }
  ]);
  const [faqs, setFaqs] = useState<{ question: string, answer: string, attachments?: { name: string, type: 'imagen' | 'video' | 'audio' | 'archivo', url?: string }[] }[]>([
    { question: "¿Cuánto demora el envío?", answer: "El envío toma entre 2 a 5 días hábiles dependiendo de la transportadora.", attachments: [] },
    { question: "¿Cómo configuro el smartwatch?", answer: "Te enviamos un video tutorial corto donde explicamos el paso a paso.", attachments: [{ name: "Video_Tutorial_Configuracion.mp4", type: "video" }] }
  ]);

  // Default Chats con Avatares y Hora de Colombia
  const DEFAULT_CHATS = [
    { id: '1', name: "186826832781402", time: "03:30 p. m.", msg: "¿puedes hoy o mañana?", unread: 1, phone: "+186826832781402", columnId: 'nuevo_contacto', tags: ['Nuevo'], leadStatus: 'tibio' as const, avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80' },
    { id: '2', name: "+13135550202", time: "01:42 p. m.", msg: "Dame el link", unread: 1, phone: "+13135550202", columnId: 'nuevo_contacto', tags: ['Interesado'], leadStatus: 'caliente' as const, avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80' },
    { id: '3', name: "DJ Durango 🧡", time: "05:29 p. m.", msg: "🎉 *¡Reporte Guardado Exitosam...", unread: 1, phone: "+57 300 888 2233", columnId: 'en_conversacion', tags: ['Cliente VIP'], leadStatus: 'caliente' as const, avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150&q=80' },
    { id: '4', name: "Restaurante la Mona", time: "09:53 p. m.", msg: "Por qué lo dice?", unread: 1, phone: "+57 310 444 8899", columnId: 'en_conversacion', tags: ['Restaurante'], leadStatus: 'tibio' as const, avatar: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=150&h=150&q=80' },
    { id: '5', name: "María Camila Restrepo", time: "04:15 p. m.", msg: "Dirección confirmada. Pedido en camino", unread: 0, phone: "+57 300 123 4567", columnId: 'pedido_confirmado', tags: ['Venta Cerrada'], leadStatus: 'caliente' as const, avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80' },
    { id: '6', name: "Oscar Test", time: "05:26 p. m.", msg: "🎉 *¡Reporte Guardado Exitosament...", unread: 0, phone: "+57 315 888 9900", columnId: 'en_conversacion', tags: ['Administrador'], leadStatus: 'caliente' as const, avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&h=150&q=80' },
    { id: '7', name: "Carlos Ruiz", time: "11:20 a. m.", msg: "Dirección confirmada. Pedido en Dropi: #9021", unread: 0, phone: "+57 310 999 0000", columnId: 'pedido_confirmado', tags: ['Dropi Generado'], leadStatus: 'caliente' as const, avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=150&h=150&q=80' },
    { id: '8', name: "Liliana Mendoza", time: "02:10 p. m.", msg: "Llegó el producto roto, solicito cambio", unread: 0, phone: "+57 315 555 6677", columnId: 'objecion', tags: ['Garantía'], leadStatus: 'frío' as const, avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&h=150&q=80' },
    { id: '9', name: "Andrés Felipe Marín", time: "10:05 a. m.", msg: "Hola, ¿tienen mi número de guía de envío?", unread: 0, phone: "+57 321 444 8899", columnId: 'por_subir', tags: ['Logística'], leadStatus: 'tibio' as const, avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=150&h=150&q=80' },
    { id: '10', name: "Sofía Castro", time: "08:45 a. m.", msg: "Mi paquete ya aparece despachado en Coordinadora", unread: 0, phone: "+57 301 777 2211", columnId: 'en_transito', tags: ['Despachado'], leadStatus: 'tibio' as const, avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&h=150&q=80' }
  ];

  const ADMIN_DEMO_CHATS = [
    ...DEFAULT_CHATS.map((chat, index) => ({
    ...chat,
    columnId: ['entregado', 'entregado', 'en_transito', 'en_transito', 'entregado', 'en_transito', 'novedad', 'devolucion', 'novedad', 'en_transito'][index],
    name: ['Laura Gómez', 'Andrés Rojas', 'Camila Torres', 'Juan Martínez', 'Mariana Cárdenas', 'Santiago Pérez', 'Daniela Restrepo', 'Nicolás Vargas', 'Valentina Salazar', 'Sebastián Castro'][index],
    msg: [
      '¿Todavía tienen disponible el combo de camisas polo?',
      'Quiero confirmar el pedido y pagar contra entrega.',
      '¿Qué tallas vienen en el combo? Me interesa comprar dos.',
      'Envíame el enlace de Shopify para terminar la compra.',
      'Ya recibí el combo, la calidad está excelente. ¿Cómo hago recompra?',
      '¿El envío a Medellín tarda entre 2 y 5 días?',
      'Necesito cambiar una talla antes de que lo despachen.',
      'Mi pedido aparece en tránsito, ¿me compartes la guía?',
      'Vi el anuncio en Meta y quiero aprovechar el precio de $160.000.',
      'Llegué desde Google. ¿Puedo pedir el combo en talla M?'
    ][index],
    tags: [index % 3 === 0 ? 'Venta Cerrada' : 'Interesado', index % 2 === 0 ? 'Combo Polos' : 'Logística']
    })),
    ...['nuevo_contacto', 'msg_inicial', 'en_conversacion', 'alta_intencion', 'datos_incompletos', 'pago_anticipado', 'pago_validado', 'pedido_confirmado', 'objecion', 'modificacion', 'anulacion', 'por_subir', 'pendiente_confirmacion', 'pendiente', 'guia_generada', 'preparado_recogido', 'en_reparto', 'cancelado_rechazado', 'indemnizacion_cerrado'].map((columnId, index) => ({
      id: `demo-funnel-${index + 1}`,
      name: ['Felipe Moreno', 'Carolina Mendez', 'David Arias', 'Natalia Ramirez', 'Mateo Herrera', 'Paula Lopez'][index % 6],
      time: '10:30 a. m.',
      msg: `Seguimiento combo de camisas polo $160.000 - etapa ${index + 1}`,
      unread: 0,
      phone: `+57 320 555 ${String(1000 + index).slice(-4)}`,
      columnId,
      tags: ['Combo Polos', index % 2 === 0 ? 'Venta Cerrada' : 'Logistica'],
      leadStatus: 'caliente' as const,
      avatar: DEFAULT_CHATS[index % DEFAULT_CHATS.length].avatar
    })),
    ...Array.from({ length: 1250 }, (_, index) => {
      const funnelColumns = ['nuevo_contacto', 'msg_inicial', 'en_conversacion', 'alta_intencion', 'datos_incompletos', 'pago_anticipado', 'pago_validado', 'pedido_confirmado', 'objecion', 'modificacion', 'anulacion', 'por_subir', 'pendiente_confirmacion', 'pendiente', 'guia_generada', 'preparado_recogido', 'en_transito', 'en_reparto', 'entregado', 'novedad', 'devolucion', 'cancelado_rechazado', 'indemnizacion_cerrado'];
      const columnId = funnelColumns[index % funnelColumns.length];
      return {
        id: `demo-order-chat-${index + 1}`,
        name: `Cliente ${String(index + 1).padStart(4, '0')}`,
        time: 'Hoy',
        msg: `Pedido Combo de Camisas Polo x1 - $160.000 - ${columnId}`,
        unread: 0,
        phone: `+57 300 ${String(1000000 + index).slice(-7)}`,
        columnId,
        tags: ['Combo Polos', index % 2 === 0 ? 'Venta Cerrada' : 'Seguimiento'],
        leadStatus: 'caliente' as const,
        avatar: DEFAULT_CHATS[index % DEFAULT_CHATS.length].avatar
      };
    })
  ];

  // Dynamic CRM Chat States (con almacenamiento persistente local)
  const [chats, setChats] = useState<{ id: string, name: string, time: string, msg: string, unread: number, phone: string, columnId: string, tags: string[], leadStatus?: 'frío' | 'tibio' | 'caliente', avatar?: string }[]>(() => {
    try {
      if (isAdminDemo) return ADMIN_DEMO_CHATS;
      const saved = localStorage.getItem(chatsStorageKey);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (isAdminDemo && Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Error cargando chats persistentes:', e);
    }
    return isAdminDemo ? ADMIN_DEMO_CHATS : [];
  });
  const [activeChatId, setActiveChatId] = useState('1');
  const [chatSearch, setChatSearch] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [isBotActive, setIsBotActive] = useState(true);
  const [newTagInput, setNewTagInput] = useState('');

  // Handler: Actualizar estado de FAQs localmente
  const handleUpdateFaqs = (newFaqs: typeof faqs) => {
    isFaqsEditedRef.current = true;
    setFaqs(newFaqs);
  };

  const handleSaveFaqsToBackend = async () => {
    isFaqsEditedRef.current = false;
    try {
      const formattedFaqsStr = faqs.map((f, i) =>
        `FAQ #${i+1}: ${f.question}\nRespuesta: ${f.answer}${f.attachments?.length ? `\nAdjuntos: ${f.attachments.map(a => a.name).join(', ')}` : ''}`
      ).join('\n---\n');

      await fetch('/api/backoffice/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          faqsList: faqs,
          faqs: formattedFaqsStr,
          lastTrainingUpdate: Date.now()
        })
      });
      setLastFaqSavedTime(formatLocalTime(new Date()));
      alert('✅ Preguntas Frecuentes guardadas con éxito en el servidor.');
    } catch (e) {
      console.error("Error al guardar FAQs:", e);
      alert('❌ Error al guardar FAQs');
    }
  };

  // Handler: Guardar Configuración de IA
  const handleSaveAIConfig = async (overrideProvider?: string | React.MouseEvent) => {
    try {
      const providerStr = typeof overrideProvider === 'string' ? overrideProvider : undefined;
      const providerToSave = providerStr || activeProvider;
      let keyToSave = activeProvider === 'openai' ? openAiKey : googleAiKey;
      if (providerStr === 'openai') keyToSave = openAiKey;
      if (providerStr === 'gemini') keyToSave = googleAiKey;

      const res = await fetch('/api/backoffice/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiProvider: providerToSave,
          customApiKey: keyToSave,
          aiModel: activeModel
        })
      });
      if (res.ok) {
        if (providerStr) setActiveProvider(providerStr);
        alert(`✨ Configuración de ${providerToSave} guardada exitosamente y sincronizada con el servidor.`);
      } else {
        alert("Error al guardar la configuración de IA.");
      }
    } catch (e) {
      console.error(e);
      alert("Error al guardar la configuración.");
    }
  };

  // Handler: Limpiar Memoria de la IA y Borrar Conversaciones
  const handleClearAiMemory = async () => {
    if (!confirm("⚠️ ¿Estás seguro de que deseas borrar todas las conversaciones y la memoria de la IA?\n\nEsta acción eliminará el contexto pasado para que la IA aplique de inmediato los parámetros del entrenamiento más reciente a todos los clientes.")) {
      return;
    }
    try {
      const res = await fetch('/api/whatsapp/memory/clear', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setChats([]);
        setMessages({});
        setActiveChatId('');
        try {
          localStorage.setItem(chatsStorageKey, JSON.stringify([]));
          localStorage.setItem(messagesStorageKey, JSON.stringify({}));
        } catch(e) {}
        const timeNow = formatLocalTime(new Date());
        setLastMemoryClearTime(timeNow);
        alert("✨ ¡Memoria y conversaciones borradas con éxito! Todas las conversaciones futuras responderán aplicando estrictamente las reglas del entrenamiento vigente.");
      } else {
        alert("Error al borrar memoria: " + (data.error || 'Error desconocido'));
      }
    } catch (e) {
      alert("Error de conexión al borrar la memoria de la IA.");
    }
  };

  // Handler: Borrar / Reiniciar Conversación Individual desde cero
  const handleClearSingleChat = async (chatIdToClear: string) => {
    const chatObj = chats.find(c => c.id === chatIdToClear);
    const chatName = chatObj?.name || 'esta conversación';
    if (!confirm(`⚠️ ¿Estás seguro de que deseas reiniciar la conversación con "${chatName}"?\n\nSe borrará el historial de este chat para que la IA inicie desde cero aplicando las reglas y entrenamiento actuales.`)) {
      return;
    }
    try {
      const targetPhone = chatObj?.phone ? chatObj.phone.replace(/\D/g, '') : '';
      const res = await fetch('/api/whatsapp/chat/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: chatIdToClear, phone: targetPhone })
      });
      const data = await res.json();
      if (data.success) {
        setMessages(prev => ({
          ...prev,
          [chatIdToClear]: []
        }));
        setChats(prev => prev.filter(c => c.id !== chatIdToClear));
        try {
          const storedMsgs = localStorage.getItem(messagesStorageKey);
          if (storedMsgs) {
            const parsed = JSON.parse(storedMsgs);
            delete parsed[chatIdToClear];
            localStorage.setItem(messagesStorageKey, JSON.stringify(parsed));
          }
          const storedChats = localStorage.getItem(chatsStorageKey);
          if (storedChats) {
            const parsedChats = JSON.parse(storedChats);
            const filteredChats = parsedChats.filter((c: any) => c.id !== chatIdToClear);
            localStorage.setItem(chatsStorageKey, JSON.stringify(filteredChats));
          }
        } catch(e) {}
        alert(`✨ Conversación con "${chatName}" eliminada y reiniciada desde cero.`);
      } else {
        alert("Error al reiniciar la conversación: " + (data.error || 'Error desconocido'));
      }
    } catch (e) {
      alert("Error de conexión al borrar la conversación.");
    }
  };

  // Handler: Guardar Saludo Inicial y Adjuntos
  const handleSaveGreeting = async (newGreeting: string, newAttachments: typeof greetingAttachments) => {
    isGreetingEditedRef.current = false;
    setGreetingMessage(newGreeting);
    setGreetingAttachments(newAttachments);
    try {
      localStorage.setItem('whatsapp_custom_greeting_v1', newGreeting);
      localStorage.setItem('whatsapp_greeting_atts_v1', JSON.stringify(newAttachments));
    } catch(e) {}
    try {
      const res = await fetch('/api/backoffice/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customGreeting: newGreeting,
          greetingAttachments: newAttachments,
          lastTrainingUpdate: Date.now()
        })
      });
      if (res.ok) {
        alert("✅ Mensaje y adjuntos del saludo inicial guardados con éxito en la IA.");
      }
    } catch (e) {
      console.error("Error guardando saludo inicial:", e);
      alert("Error guardando saludo inicial.");
    }
  };

  // Handler: Guardar Configuración de Remarketing Automatizado
  const handleSaveRemarketing = async (
    count: number,
    interval: string,
    avoidSpam: boolean,
    messages: string[],
    useAI: boolean[],
    attachments: any[][]
  ) => {
    setRemarketingCount(count);
    setRemarketingInterval(interval);
    setRemarketingAvoidSpam(avoidSpam);
    setRemarketingMessages(messages);
    setRemarketingUseAI(useAI);
    setRemarketingAttachments(attachments);

    try {
      const res = await fetch('/api/backoffice/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          remarketingCount: count,
          remarketingInterval: interval,
          remarketingAvoidSpam: avoidSpam,
          remarketingMessages: messages,
          remarketingUseAI: useAI,
          remarketingAttachments: attachments,
          lastTrainingUpdate: Date.now()
        })
      });
      if (res.ok) {
        alert('✅ ¡Configuración de Remarketing guardada exitosamente en el servidor!');
      } else {
        alert('⚠️ No se pudo guardar en el servidor. Revisa la conexión.');
      }
    } catch (err: any) {
      alert('❌ Error guardando remarketing: ' + err.message);
    }
  };

  // Handler: Guardar Reglas, Reactivación y Lista Negra
  const handleSaveRulesAndSettings = async () => {
    try {
      const blacklistArray = blacklistedNumbersText
        .split(/[\n,]+/)
        .map(s => s.trim())
        .filter(Boolean);

      await fetch('/api/backoffice/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reactivationTrigger,
          blacklistedBots: blacklistArray,
          lastTrainingUpdate: Date.now()
        })
      });
      alert("✅ Reglas, casilla de reactivación y lista negra guardadas con éxito en el servidor.");
    } catch (e) {
      alert("Error al guardar reglas y lista negra.");
    }
  };

  // Estados de Seguimiento de Ventas
  const [leadFilter, setLeadFilter] = useState<'todos' | 'frío' | 'tibio' | 'caliente'>('todos');
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [newLeadName, setNewLeadName] = useState('');
  const [newLeadPhone, setNewLeadPhone] = useState('');
  const [newLeadStatus, setNewLeadStatus] = useState<'frío' | 'tibio' | 'caliente'>('tibio');
  const [newLeadMsg, setNewLeadMsg] = useState('');

  // Message Buffer & AI Training context states
  const [isBufferEnabled, setIsBufferEnabled] = useState(true);
  const [bufferSeconds, setBufferSeconds] = useState(8);
  const [messageBuffers, setMessageBuffers] = useState<{ [chatId: string]: string[] }>({});
  const [bufferTimeouts, setBufferTimeouts] = useState<{ [chatId: string]: any }>({});

  // EL FLUJO sales strategy states
  const [isFlujoStrategyEnabled, setIsFlujoStrategyEnabled] = useState(true);
  const [chatStages, setChatStages] = useState<{ [chatId: string]: number }>({
    '1': 1, // Just asked "Info smartwatch X8" -> Stage 1: Diagnostica
    '2': 2, // Asked "Tienen contra entrega?" -> Stage 2: Presenta solución
    '3': 5, // Confirmed address -> Stage 5: Toma datos
    '4': 1, // Fresh lead -> Stage 1: Diagnostica
    '5': 3, // Duda por garantía -> Stage 3: Objeciones
    '6': 6, // Venta cerrada -> Stage 6: Post-cierre (silence)
    '7': 3, // Queja -> Stage 3: Objeciones
    '8': 3, // Queja -> Stage 3: Objeciones
    '9': 5, // Logística -> Stage 5: Toma datos
    '10': 6, // Despachado -> Stage 6: Post-cierre
    '11': 6, // Entregado -> Stage 6: Post-cierre
    '12': 3  // Novedad / Objeción -> Stage 3: Objeciones
  });

  // Global tags state - Standardized ERP palette
  const [availableTags, setAvailableTags] = useState<{ id: string, name: string, color: string }[]>([
    { id: '1', name: 'Bot Activo', color: '#d4af37' },
    { id: '2', name: 'Handoff (Humano)', color: '#a1a1aa' },
    { id: '3', name: 'Queja', color: '#ef4444' },
    { id: '4', name: 'Mala Atención', color: '#ef4444' },
    { id: '5', name: 'Logística', color: '#a1a1aa' },
    { id: '6', name: 'Despachado', color: '#d4af37' },
    { id: '7', name: 'Entregado', color: '#10b981' },
    { id: '8', name: 'Novedad', color: '#a1a1aa' },
    { id: '9', name: 'Venta Cerrada', color: '#10b981' },
    { id: '10', name: 'Interesado', color: '#d4af37' },
    { id: '11', name: 'Soporte', color: '#a1a1aa' }
  ]);
  const [showTagManagerModal, setShowTagManagerModal] = useState(false);
  const [showEditPipelineModal, setShowEditPipelineModal] = useState(false);

  // Pipeline management states
  const [showNewPipelineModal, setShowNewPipelineModal] = useState(false);
  const [newPipelineName, setNewPipelineName] = useState('');
  const [newPipelineNest, setNewPipelineNest] = useState(false);
  const [newPipelineLogistics, setNewPipelineLogistics] = useState(false);
  const [newPipelineInstructions, setNewPipelineInstructions] = useState('');
  const [newPipelineAutomation, setNewPipelineAutomation] = useState('');

  const handleAddTag = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed) return;
    setChats(prev => prev.map(c => {
      if (c.id === activeChatId) {
        const currentTags = c.tags || [];
        if (!currentTags.includes(trimmed)) {
          // If they add 'Queja' or 'Mala Atención', let's auto-route them to the complaints column if it exists!
          let columnId = c.columnId;
          if ((trimmed === 'Queja' || trimmed === 'Mala Atención') && kanbanColumns.some(col => col.id === 'quejas_abiertas')) {
            columnId = 'quejas_abiertas';
          }
          return { ...c, tags: [...currentTags, trimmed], columnId };
        }
      }
      return c;
    }));

    // If tag is not in availableTags, add it!
    if (!availableTags.some(t => t.name.toLowerCase() === trimmed.toLowerCase())) {
      const colors = ['#3b82f6', '#a855f7', '#ef4444', '#f43f5e', '#06b6d4', '#f59e0b', '#10b981', '#ec4899', '#22c55e', '#eab308', '#6366f1'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      setAvailableTags(prev => [...prev, { id: 'tag_' + Date.now(), name: trimmed, color: randomColor }]);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setChats(prev => prev.map(c => {
      if (c.id === activeChatId) {
        return { ...c, tags: (c.tags || []).filter(t => t !== tagToRemove) };
      }
      return c;
    }));
  };

  const handleCreateTag = (name: string, color: string = '#808080') => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (availableTags.some(t => t.name.toLowerCase() === trimmed.toLowerCase())) {
      alert('La etiqueta ya existe');
      return;
    }
    const newTag = { id: 'tag_' + Date.now(), name: trimmed, color };
    setAvailableTags(prev => [...prev, newTag]);
  };

  const handleEditTag = (tagId: string, newName: string, newColor?: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const oldTag = availableTags.find(t => t.id === tagId);
    if (!oldTag) return;

    // Check if name is already taken by another tag
    if (availableTags.some(t => t.id !== tagId && t.name.toLowerCase() === trimmed.toLowerCase())) {
      // Just update color if only color changed, or show alert
      if (oldTag.name.toLowerCase() === trimmed.toLowerCase()) {
        setAvailableTags(prev => prev.map(t => t.id === tagId ? { ...t, color: newColor || t.color } : t));
      }
      return;
    }

    setAvailableTags(prev => prev.map(t => t.id === tagId ? { ...t, name: trimmed, color: newColor || t.color } : t));

    // Also rename the tag in all chats
    setChats(prevChats => prevChats.map(c => ({
      ...c,
      tags: (c.tags || []).map(t => t.toLowerCase() === oldTag.name.toLowerCase() ? trimmed : t)
    })));
  };

  const handleDeleteTag = (tagId: string) => {
    const oldTag = availableTags.find(t => t.id === tagId);
    if (!oldTag) return;

    if (confirm(`¿Estás seguro de que deseas eliminar la etiqueta "${oldTag.name}"? Se quitará de todos los chats.`)) {
      setAvailableTags(prev => prev.filter(t => t.id !== tagId));

      // Also remove from all chats
      setChats(prevChats => prevChats.map(c => ({
        ...c,
        tags: (c.tags || []).filter(t => t.toLowerCase() !== oldTag.name.toLowerCase())
      })));
    }
  };

  // Chat filters state
  const [chatFilterStatus, setChatFilterStatus] = useState<'all' | 'unread' | 'bot' | 'human' | 'complaints'>('all');
  const [filterTag, setFilterTag] = useState<string>('all');
  const [filterColumn, setFilterColumn] = useState<string>('all');

  // Custom Pipelines / Embudos State
  const [pipelines, setPipelines] = useState<{ id: string, name: string, isNestComplaints?: boolean, isNestLogistics?: boolean, instructions?: string, automation?: string }[]>([
    { id: 'ventas', name: 'Ventas' },
    { id: 'envios', name: 'Envíos', isNestLogistics: true }
  ]);
  const [activePipelineId, setActivePipelineId] = useState<string>('ventas');

  // Default Messages History
  const DEFAULT_MESSAGES = {
    '1': [
      { sender: 'bot' as const, text: "¡Hola! Soy el asistente virtual de la tienda. ¿En qué te puedo ayudar hoy?", time: "10:03" },
      { sender: 'client' as const, text: "Quiero ver el catálogo", time: "10:04" },
      { sender: 'bot' as const, text: "¡Claro que sí! Aquí tienes nuestro catálogo actualizado con el inventario en tiempo real. ¿Hay algún producto en particular que estés buscando?", time: "10:04" },
      { sender: 'client' as const, text: "Info smartwatch X8", time: "10:05" },
      { sender: 'agent' as const, text: "Aquí tienes una foto real del Smartwatch X8 en color negro matte. ¡Se ve espectacular!", time: "10:06", attachment: { name: "smartwatch_x8_matte.jpg", type: "imagen" as const, url: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=600&q=80" } }
    ],
    '2': [
      { sender: 'bot' as const, text: "¡Hola! Bienvenido a Xorbit 360 Store. ¿Buscas algún producto en especial?", time: "09:40" },
      { sender: 'client' as const, text: "Hola, me interesa la licuadora portátil. ¿Tienen contra entrega?", time: "09:42" },
      { sender: 'agent' as const, text: "Te adjunto la ficha técnica oficial con las especificaciones de batería y resistencia al agua en PDF.", time: "09:44", attachment: { name: "Ficha_Tecnica_Smartwatch_Ultra.pdf", type: "archivo" as const, url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", size: "1.4 MB" } }
    ],
    '3': [
      { sender: 'client' as const, text: "Ya les pasé mis datos de envío por el link.", time: "Ayer" },
      { sender: 'bot' as const, text: "¡Excelente María! Dirección confirmada. Pedido generado en bodega Medellín para despacho hoy mismo con Pago Contra Entrega. El número de guía es CO-DRP-8823192. ¡Gracias por confiar en nosotros! 📦", time: "Ayer" }
    ],
    '4': [
      { sender: 'bot' as const, text: "Hola, ¿cómo estás? Te asiste el bot virtual de Xorbit 360 Store. ¿En qué te puedo asesorar hoy?", time: "Ayer" },
      { sender: 'client' as const, text: "Revisando catálogo...", time: "Ayer" }
    ],
    '7': [
      { sender: 'client' as const, text: "Llevo 3 días esperando mi smartwatch y nadie me da respuesta. Pésimo servicio de atención al cliente.", time: "Hace 10m" },
      { sender: 'agent' as const, text: "Hola Ricardo, lamentamos mucho el retraso. Permíteme verificar el estado de tu despacho de inmediato.", time: "Hace 5m" },
      { sender: 'client' as const, text: "Por favor, exijo mi devolución o que me envíen la guía de inmediato.", time: "Hace 2m" }
    ],
    '8': [
      { sender: 'client' as const, text: "Hola, acabo de recibir el pedido del Smartwatch Ultra pero la pantalla llegó rota. ¿Qué puedo hacer?", time: "Hace 30m" },
      { sender: 'agent' as const, text: "Hola Liliana, qué pena contigo. Vamos a tramitar tu garantía de inmediato sin costo adicional. ¿Podrías enviarme una foto?", time: "Hace 20m" },
      { sender: 'client' as const, text: "Sí, claro, aquí tienes el soporte. Espero me resuelvan rápido.", time: "Hace 15m" }
    ]
  };

  const [messages, setMessages] = useState<{ [key: string]: { sender: 'bot' | 'client' | 'agent', text: string, time: string, attachment?: { name: string, type: 'imagen' | 'video' | 'audio' | 'archivo', url: string, size?: string } }[] }>(() => {
    try {
      const saved = localStorage.getItem(messagesStorageKey);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (isAdminDemo && parsed && typeof parsed === 'object') {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Error cargando historial de mensajes persistente:', e);
    }
    return isAdminDemo ? Object.fromEntries(Object.entries(DEFAULT_MESSAGES).map(([id, history]) => [id, history.map(message => ({
      ...message,
      text: message.text
        .replace(/Smartwatch Ultra X8|Smartwatch Ultra|Smartwatch X8|smartwatch/gi, 'Combo de Camisas Polo')
        .replace(/Licuadora PortÃ¡til ShakeGo|Auriculares Pro 4/gi, 'Combo de Camisas Polo')
        .replace(/la pantalla llegÃ³ rota/gi, 'la talla no fue la esperada')
    }))])) : {};
  });

  React.useEffect(() => {
    if (isAdminDemo) {
      localStorage.setItem(clientsStorageKey, JSON.stringify(buildAdminDemoClients()));
      localStorage.setItem(ordersStorageKey, JSON.stringify(buildAdminDemoOrders()));
    } else {
      setChats([]);
      setMessages({});
      localStorage.setItem(clientsStorageKey, JSON.stringify([]));
      localStorage.setItem(ordersStorageKey, JSON.stringify([]));
    }
  }, [isAdminDemo, currentUser?.email]);

  const activeChatObj = chats.find(c => c.id === activeChatId);
  const activeCleanPhone = activeChatObj?.phone ? activeChatObj.phone.replace(/\D/g, '') : (activeChatId ? activeChatId.replace(/\D/g, '') : '');
  const activeChatMessages = (
    (activeChatId && messages[activeChatId]) ||
    (activeCleanPhone && messages[activeCleanPhone]) ||
    (activeCleanPhone && messages['chat-' + activeCleanPhone]) ||
    (activeChatObj?.phone && messages[activeChatObj.phone]) ||
    []
  );

  // Guardado automático persistente de mensajes y chats en LocalStorage
  React.useEffect(() => {
    try {
      localStorage.setItem(messagesStorageKey, JSON.stringify(messages));
    } catch (e) {
      console.warn('Error guardando mensajes en localStorage:', e);
    }
  }, [messages]);

  React.useEffect(() => {
    try {
      localStorage.setItem(chatsStorageKey, JSON.stringify(chats));
    } catch (e) {
      console.warn('Error guardando chats en localStorage:', e);
    }
  }, [chats]);

  // Scroll automático hacia el final del historial de la conversación activa
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeChatId, messages, isBotTyping]);

  // Sincronización automática de cliente y guía al cambiar de chat
  React.useEffect(() => {
    if (!activeChatObj) return;

    try {
      const storedClients = localStorage.getItem(clientsStorageKey);
      if (storedClients) {
        const clientList = JSON.parse(storedClients);
        const found = clientList.find((c: any) =>
          (c.name && activeChatObj.name && c.name.toLowerCase() === activeChatObj.name.toLowerCase()) ||
          (c.phone && activeChatObj.phone && c.phone.replace(/\D/g, '') === activeChatObj.phone.replace(/\D/g, ''))
        );
        if (found) {
          setCaptureName(found.name || activeChatObj.name);
          if (found.city) setCaptureCity(found.city);
          if (found.department) setCaptureDept(found.department);
          if (found.product) setCaptureProduct(found.product);
          if (found.campaign) setCaptureCampaign(found.campaign);
          if (found.totalTicket) setCaptureTicket(found.totalTicket);
          if (found.isRecurring !== undefined) setCaptureIsRecurring(found.isRecurring);
        } else if (activeChatObj.name) {
          setCaptureName(activeChatObj.name);
        }
      } else if (activeChatObj.name) {
        setCaptureName(activeChatObj.name);
      }

      // Sincronizar si ya existe guía generada para este cliente
      const storedOrders = localStorage.getItem(ordersStorageKey);
      if (storedOrders) {
        const orderList = JSON.parse(storedOrders);
        const order = orderList.find((o: any) =>
          (o.clientName && activeChatObj.name && o.clientName.toLowerCase() === activeChatObj.name.toLowerCase()) ||
          (o.phone && activeChatObj.phone && o.phone.replace(/\D/g, '') === activeChatObj.phone.replace(/\D/g, ''))
        );
        if (order && order.trackingCode) {
          setLastGeneratedGuia({
            id: order.id,
            trackingCode: order.trackingCode,
            carrier: order.carrier || 'Servientrega (Dropi)',
            total: order.total || captureTicket,
            date: order.date
          });
        } else {
          setLastGeneratedGuia(null);
        }
      }
    } catch (e) {
      console.warn('Error sincronizando chat con CRM:', e);
    }
  }, [activeChatId]);

  // Auto-guardado transparente en tiempo real en crm_clients (sin necesidad de botón manual)
  React.useEffect(() => {
    if (!captureName || captureName.trim() === '') return;

    const timer = setTimeout(() => {
      try {
        const stored = localStorage.getItem(clientsStorageKey);
        let clientList: any[] = [];
        if (stored) {
          try { clientList = JSON.parse(stored); } catch (e) {}
        }

        const phone = activeChatObj?.phone || '+57 300 123 4567';
        const existingIdx = clientList.findIndex(c =>
          (c.name && c.name.toLowerCase() === captureName.trim().toLowerCase()) ||
          (c.phone && phone && c.phone.replace(/\D/g, '') === phone.replace(/\D/g, ''))
        );

        const clientData = {
          id: existingIdx >= 0 ? clientList[existingIdx].id : `CLI-${Math.floor(1000 + Math.random() * 9000)}`,
          name: captureName.trim(),
          phone: phone,
          city: captureCity.trim(),
          department: captureDept.trim(),
          product: captureProduct.trim(),
          campaign: captureCampaign.trim(),
          isRecurring: captureIsRecurring,
          registrationDate: existingIdx >= 0 ? clientList[existingIdx].registrationDate : new Date().toISOString().split('T')[0],
          totalTicket: captureTicket,
          totalOrdersCount: existingIdx >= 0 ? (clientList[existingIdx].totalOrdersCount || 1) : 1,
          deliveredCount: existingIdx >= 0 ? (clientList[existingIdx].deliveredCount || 1) : 1,
          returnedCount: 0,
          cancelledCount: 0,
          logisticsRisk: 'low'
        };

        if (existingIdx >= 0) {
          clientList[existingIdx] = { ...clientList[existingIdx], ...clientData };
        } else {
          clientList.push(clientData);
        }

        localStorage.setItem(clientsStorageKey, JSON.stringify(clientList));
      } catch (err) {
        console.error('Error auto-guardando cliente:', err);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [captureName, captureCity, captureDept, captureProduct, captureCampaign, captureTicket, captureIsRecurring, activeChatId]);

  // Handler: Generar Guía Dropi & Vincular al CRM
  const handleGenerarGuia = () => {
    const guiaCode = `CO-DRP-${Math.floor(1000000 + Math.random() * 9000000)}`;
    const carrierName = 'Servientrega (Dropi)';
    const orderId = `PED-${Math.floor(9000 + Math.random() * 1000)}`;
    const phone = activeChatObj?.phone || "+57 300 123 4567";
    const dateStr = new Date().toISOString().split('T')[0];

    // 1. Auto-guardar cliente en crm_clients
    try {
      const stored = localStorage.getItem(clientsStorageKey);
      let clientList: any[] = [];
      if (stored) {
        try { clientList = JSON.parse(stored); } catch (e) {}
      }
      const existingIdx = clientList.findIndex(c =>
        (c.name && c.name.toLowerCase() === captureName.trim().toLowerCase()) ||
        (c.phone && phone && c.phone.replace(/\D/g, '') === phone.replace(/\D/g, ''))
      );
      const clientData = {
        id: existingIdx >= 0 ? clientList[existingIdx].id : `CLI-${Math.floor(1000 + Math.random() * 9000)}`,
        name: captureName.trim(),
        phone: phone,
        city: captureCity.trim(),
        department: captureDept.trim(),
        product: captureProduct.trim(),
        campaign: captureCampaign.trim(),
        isRecurring: captureIsRecurring,
        registrationDate: existingIdx >= 0 ? clientList[existingIdx].registrationDate : dateStr,
        totalTicket: captureTicket,
        totalOrdersCount: existingIdx >= 0 ? (clientList[existingIdx].totalOrdersCount || 1) + 1 : 1,
        deliveredCount: existingIdx >= 0 ? (clientList[existingIdx].deliveredCount || 1) : 1,
        returnedCount: 0,
        cancelledCount: 0,
        logisticsRisk: 'low'
      };
      if (existingIdx >= 0) {
        clientList[existingIdx] = { ...clientList[existingIdx], ...clientData };
      } else {
        clientList.push(clientData);
      }
      localStorage.setItem(clientsStorageKey, JSON.stringify(clientList));
    } catch (e) {
      console.error(e);
    }

    // 2. Registrar pedido y guía en crm_orders
    const newOrder = {
      id: orderId,
      clientName: captureName.trim(),
      phone: phone,
      products: `1x ${captureProduct.trim()}`,
      total: captureTicket,
      source: "WhatsApp Bot",
      paymentStatus: "Contra entrega",
      shippingStatus: "Guía generada",
      trackingCode: guiaCode,
      carrier: carrierName,
      trackingUrl: `https://servientrega.com/rastreo?guia=${guiaCode}`,
      date: dateStr,
      confirmationStatus: "Confirmado"
    };

    try {
      const storedOrders = localStorage.getItem(ordersStorageKey);
      let orderList: any[] = [];
      if (storedOrders) {
        try { orderList = JSON.parse(storedOrders); } catch (e) {}
      }
      orderList.unshift(newOrder);
      localStorage.setItem(ordersStorageKey, JSON.stringify(orderList));
    } catch (e) {
      console.error(e);
    }

    // 3. Actualizar estado y abrir modal de Guía
    const guiaInfo = {
      id: orderId,
      trackingCode: guiaCode,
      carrier: carrierName,
      total: captureTicket,
      date: dateStr
    };
    setLastGeneratedGuia(guiaInfo);
    setGuiaSentToChat(false);
    setShowGuiaModal(true);
  };

  // Handler: Enviar número de guía directamente al chat de WhatsApp del cliente
  const handleSendGuiaToChat = async () => {
    if (!lastGeneratedGuia) return;
    const timeString = formatLocalTime(new Date());
    const msgText = `¡Hola ${captureName}! 📦 Tu pedido de *${captureProduct}* ya tiene número de guía oficial Dropi (Pago Contra Entrega):\n\n🚚 *Guía de Envío:* ${lastGeneratedGuia.trackingCode}\n🏢 *Transportadora:* ${lastGeneratedGuia.carrier}\n💰 *Total a pagar al recibir:* $${(lastGeneratedGuia.total || captureTicket).toLocaleString()} COP\n🔗 *Rastreo en línea:* https://servientrega.com/rastreo?guia=${lastGeneratedGuia.trackingCode}\n\n¡Muchas gracias por tu compra!`;

    setMessages(prev => ({
      ...prev,
      [activeChatId]: [
        ...(prev[activeChatId] || []),
        {
          sender: 'agent',
          text: msgText,
          time: timeString
        }
      ]
    }));

    setChats(prev => prev.map(c => c.id === activeChatId ? { ...c, msg: `📦 Guía: ${lastGeneratedGuia.trackingCode}`, time: 'Ahora' } : c));

    const activeChat = chats.find(c => c.id === activeChatId);
    if (activeChat && activeChat.phone) {
      try {
        await fetch('/api/whatsapp/reply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: activeChat.phone,
            message: msgText,
            channelId: activeChat.channelId || userChannelId
          })
        });
      } catch (e) {
        console.error("Error enviando mensaje de guía:", e);
      }
    }

    setGuiaSentToChat(true);
  };

  // Training files list
  const [trainingFiles, setTrainingFiles] = useState([
    { name: 'Catalogo_Smartwatches_2026.pdf', size: '2.4 MB', date: 'Hace 2 días' },
    { name: 'Politicas_Envio_Dropi.txt', size: '12 KB', date: 'Ayer' }
  ]);
  const trFileInputRef = React.useRef<HTMLInputElement>(null);

  // OpenAI / Gemini Key & Balance Integration
  const [openAiKey, setOpenAiKey] = useState('sk-proj-...');
  const [googleAiKey, setGoogleAiKey] = useState('');
  const [activeProvider, setActiveProvider] = useState('openai');
  const [activeModel, setActiveModel] = useState('gpt-4o');
  const [isVerifyingOpenAi, setIsVerifyingOpenAi] = useState(false);
  const [isVerifyingGoogle, setIsVerifyingGoogle] = useState(false);
  const [apiBalance, setApiBalance] = useState(89.22);
  const [apiTokens, setApiTokens] = useState({ prompt: 0, candidates: 0, total: 0 });
  const [isRecharging, setIsRecharging] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('20');

  // Retargeting state
  const [retargetingEnabled, setRetargetingEnabled] = useState(true);
  const [retargetingTime, setRetargetingTime] = useState(15);
  const [retargetingUnit, setRetargetingUnit] = useState('Minutos');
  const [retargetingMessage, setRetargetingMessage] = useState('Hola, vi que dejamos nuestra conversación a medias. ¿Te puedo ayudar con alguna duda sobre nuestro servicio?');
  const [trainedFiles, setTrainedFiles] = useState<string[]>(['Catalogo_Smartwatches_2026.pdf', 'Lista_Precios_Dropi.xlsx']);
  const additionalFilesInputRef = React.useRef<HTMLInputElement>(null);

  // Dynamic Kanban Columns State
  const [kanbanColumns, setKanbanColumns] = useState<{ id: string, name: string, color: string, pipelineId?: string }[]>([
    // Ventas Pipeline
    { id: 'nuevo_contacto', name: 'Nuevo contacto', color: '#3b82f6', pipelineId: 'ventas' },
    { id: 'msg_inicial', name: 'Msg inicial enviado', color: '#ca8a04', pipelineId: 'ventas' },
    { id: 'en_conversacion', name: 'En conversación', color: '#a855f7', pipelineId: 'ventas' },
    { id: 'alta_intencion', name: 'Alta intención', color: '#f97316', pipelineId: 'ventas' },
    { id: 'datos_incompletos', name: 'Datos incompletos', color: '#6b7280', pipelineId: 'ventas' },
    { id: 'pago_anticipado', name: 'Pago anticipado', color: '#ec4899', pipelineId: 'ventas' },
    { id: 'pago_validado', name: 'Pago validado', color: '#06b6d4', pipelineId: 'ventas' },
    { id: 'pedido_confirmado', name: 'Pedido confirmado', color: '#10b981', pipelineId: 'ventas' },
    { id: 'objecion', name: 'Objeción', color: '#ef4444', pipelineId: 'ventas' },
    { id: 'modificacion', name: 'Modificación', color: '#f59e0b', pipelineId: 'ventas' },
    { id: 'anulacion', name: 'Anulación', color: '#7f1d1d', pipelineId: 'ventas' },

    // Envíos Pipeline
    { id: 'por_subir', name: 'Por subir / Sin Dropi', color: '#6b7280', pipelineId: 'envios' },
    { id: 'pendiente_confirmacion', name: 'Pendiente confirmación', color: '#ca8a04', pipelineId: 'envios' },
    { id: 'pendiente', name: 'Pendiente', color: '#3b82f6', pipelineId: 'envios' },
    { id: 'guia_generada', name: 'Guía generada', color: '#a855f7', pipelineId: 'envios' },
    { id: 'preparado_recogido', name: 'Preparado y recogido', color: '#10b981', pipelineId: 'envios' },
    { id: 'en_transito', name: 'En tránsito', color: '#06b6d4', pipelineId: 'envios' },
    { id: 'en_reparto', name: 'En reparto', color: '#f59e0b', pipelineId: 'envios' },
    { id: 'entregado', name: 'Entregado', color: '#22c55e', pipelineId: 'envios' },
    { id: 'novedad', name: 'Novedad', color: '#ef4444', pipelineId: 'envios' },
    { id: 'devolucion', name: 'Devolución', color: '#ec4899', pipelineId: 'envios' },
    { id: 'cancelado_rechazado', name: 'Cancelado / Rechazado', color: '#7f1d1d', pipelineId: 'envios' },
    { id: 'indemnizacion_cerrado', name: 'Indemnización / Cerrado', color: '#111827', pipelineId: 'envios' }
  ]);

  // AI Rules & Alerts States
  const [aiAutomationRules, setAiAutomationRules] = useState<{ id: string, phrase?: string, keyword?: string, action: string, value?: string, actionValue?: string, active?: boolean }[]>([
    { id: 'r1', phrase: 'garantia', action: 'alerta', value: 'Revisión técnica solicitada (Garantía)', active: true },
    { id: 'r2', phrase: 'comprar', action: 'etiqueta', value: 'Interesado de Alto Valor', active: true },
    { id: 'r3', phrase: 'precio', action: 'kanban', value: 'interesados', active: true }
  ]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      fetch('/api/backoffice/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rules,
          aiAutomationRules,
          lastTrainingUpdate: Date.now()
        })
      }).catch(() => {});
    }, 1200);
    return () => clearTimeout(timer);
  }, [rules, aiAutomationRules]);
  const [systemAlerts, setSystemAlerts] = useState<{ id: string, msg?: string, message?: string, time?: string, timestamp?: string, chatName?: string, chatId?: string }[]>([
    { id: 'a1', msg: 'Alerta de Intención de Compra', time: '10:05 AM', chatName: '+57 300 123 4567' }
  ]);

  // FAQs active attachment states & ref
  const [activeFaqIdx, setActiveFaqIdx] = useState<number | null>(null);
  const [activeAttType, setActiveAttType] = useState<'imagen' | 'video' | 'audio' | 'archivo' | null>(null);
  const faqFileInputRef = React.useRef<HTMLInputElement>(null);

  const checkAIRules = (text: string, chatId: string) => {
    const chat = chats.find(c => c.id === chatId);
    const chatName = chat ? chat.name : 'Cliente';

    aiAutomationRules.forEach(rule => {
      if (!rule.active) return;
      const targetKeyword = rule.keyword || rule.phrase || '';
      const ruleVal = rule.actionValue || rule.value || '';
      if (targetKeyword && text.toLowerCase().includes(targetKeyword.toLowerCase())) {
        if (rule.action === 'alerta') {
          const time = formatLocalTime(new Date());
          setSystemAlerts(prev => [
            { id: String(Date.now()), msg: ruleVal, message: ruleVal, time, timestamp: time, chatName, chatId },
            ...prev
          ]);
        } else if (rule.action === 'etiqueta') {
          setChats(prev => prev.map(c => {
            if (c.id === chatId) {
              const currentTags = c.tags || [];
              if (ruleVal && !currentTags.includes(ruleVal)) {
                return { ...c, tags: [...currentTags, ruleVal] };
              }
            }
            return c;
          }));
        } else if (rule.action === 'kanban') {
          setChats(prev => prev.map(c => {
            if (c.id === chatId) {
              return { ...c, columnId: ruleVal };
            }
            return c;
          }));
        }
      }
    });
  };

  const attachmentInputRef = React.useRef<HTMLInputElement>(null);
  const [attachmentType, setAttachmentType] = useState<'imagen' | 'video' | 'audio' | 'archivo' | null>(null);
  const [selectedImageLightbox, setSelectedImageLightbox] = useState<{ url: string; name: string } | null>(null);
  const [attachmentAccept, setAttachmentAccept] = useState<string>('image/*,video/*,audio/*,application/pdf');
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  const handleTriggerAiReply = async () => {
    const activeChat = chats.find(c => c.id === activeChatId);
    if (!activeChat || !activeChat.phone) {
      alert("Selecciona un chat con número de teléfono para generar respuesta con IA.");
      return;
    }
    setIsAiGenerating(true);
    try {
      const res = await fetch('/api/whatsapp/trigger-ai-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: activeChat.phone,
          channelId: activeChat.channelId || userChannelId
        })
      });
      const data = await res.json();
      if (data.success) {
        await handleSyncRecentChats();
      } else {
        alert(data.error || "No se pudo generar respuesta de IA");
      }
    } catch (err: any) {
      console.error("Error ejecutando IA:", err);
      alert("Error conectando con la IA: " + (err.message || String(err)));
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleToggleBotForChat = async () => {
    const nextState = !isBotActive;
    setIsBotActive(nextState);
    const activeChat = chats.find(c => c.id === activeChatId);
    if (activeChat && activeChat.phone) {
      try {
        await fetch('/api/whatsapp/toggle-bot-phone', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: activeChat.phone,
            active: nextState
          })
        });
      } catch (e) {
        console.error("Error sincronizando toggle de bot:", e);
      }
    }
  };

  const triggerAttachmentUpload = (type: 'imagen' | 'video' | 'audio' | 'archivo') => {
    setAttachmentType(type);
    if (type === 'imagen') setAttachmentAccept('image/*');
    else if (type === 'video') setAttachmentAccept('video/*');
    else if (type === 'audio') setAttachmentAccept('audio/*');
    else setAttachmentAccept('application/pdf,.doc,.docx,.xls,.xlsx,.txt');

    setTimeout(() => {
      if (attachmentInputRef.current) {
        attachmentInputRef.current.value = '';
        attachmentInputRef.current.click();
      }
    }, 50);
  };

  const handleAttachmentFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !attachmentType) return;

    const activeChat = chats.find(c => c.id === activeChatId);
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1) + ' MB';
    const timeString = formatLocalTime(new Date());

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result as string;
      const displayMsg = `📎 ${file.name}`;

      setMessages(prev => ({
        ...prev,
        [activeChatId]: [
          ...(prev[activeChatId] || []),
          {
            sender: 'agent',
            text: displayMsg,
            time: timeString,
            attachment: {
              name: file.name,
              type: attachmentType,
              url: base64Data,
              size: sizeMB
            }
          }
        ]
      }));

      setChats(prev => prev.map(c => c.id === activeChatId ? { ...c, msg: displayMsg, time: 'Ahora' } : c));

      // Dispatch to WhatsApp backend
      if (activeChat && activeChat.phone) {
        try {
          await fetch('/api/whatsapp/reply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              phone: activeChat.phone,
              type: attachmentType,
              mediaBase64: base64Data,
              fileName: file.name,
              message: displayMsg,
              channelId: activeChat.channelId || userChannelId
            })
          });
        } catch (err) {
          console.error("Error enviando archivo multimedia:", err);
        }
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSendLiveChatVoiceNote = (voiceData: {
    base64: string;
    dataUrl: string;
    duration: number;
    name: string;
  }) => {
    const activeChat = chats.find(c => c.id === activeChatId);
    if (!activeChat) return;

    const timeString = formatLocalTime(new Date());
    const newMsg = {
      sender: 'agent' as const,
      text: '🎤 [Nota de voz enviada]',
      time: timeString,
      attachment: {
        name: 'Nota_de_voz.ogg',
        type: 'audio' as const,
        url: voiceData.dataUrl,
        size: `${Math.round(voiceData.duration)}s`
      }
    };

    setMessages(prev => ({
      ...prev,
      [activeChatId]: [...(prev[activeChatId] || []), newMsg]
    }));

    setChats(prev => prev.map(c => c.id === activeChatId ? { ...c, msg: '🎤 Nota de voz PTT', time: 'Ahora' } : c));

    // Send real message to backend
    fetch('/api/whatsapp/reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: activeChat.phone,
        type: 'audio',
        mediaBase64: voiceData.base64,
        isPtt: true,
        channelId: activeChat.channelId
      })
    }).catch(e => console.error('Error sending audio reply:', e));

    setShowLiveRecorderInChat(false);
  };

  // Function to process and add a bot reply to a specific chat, analyzing the combined text
  const respondAsBot = (chatId: string, clientText: string) => {
    const textLower = clientText.toLowerCase();

    // Check if the customer answered late or we should refer to the inactivity/context
    const hasInactivityContext = textLower.includes('hola') || textLower.includes('buen') || textLower.includes('disculpa') || textLower.includes('perdón');

    let pieces: string[] = [];
    let faqAudioAttachment: any = null;
    let nextStage = 1;

    if (isFlujoStrategyEnabled) {
      const currentStage = chatStages[chatId] || 1;

      switch (currentStage) {
        case 1: // Stage 1: Diagnostica el dolor (Saluda, pregunta abierta, NO vende de entrada)
          pieces.push("¡Hola! Qué gusto saludarte por aquí, gracias por escribirnos 😊");
          if (hasInactivityContext) {
            pieces.push("Qué bueno volver a saludarte por este medio.");
          }
          pieces.push("Cuéntame, ¿estás buscando el Smartwatch Ultra X8 para ti?");
          pieces.push("¿O estás pensando en dar un regalo especial? Así te doy los mejores detalles.");
          nextStage = 2;
          break;

        case 2: // Stage 2: Presenta la solución (Ajustada al dolor del cliente)
          const isForSport = textLower.includes('deporte') || textLower.includes('entrenar') || textLower.includes('correr') || textLower.includes('salud') || textLower.includes('gimnasio');
          const isForGift = textLower.includes('regalo') || textLower.includes('esposo') || textLower.includes('hijo') || textLower.includes('papá') || textLower.includes('mamá') || textLower.includes('amigo');

          pieces.push("¡Súper! Te cuento rápido sobre el Ultra X8:");
          if (isForSport) {
            pieces.push("Viene equipado con sensores premium para monitorear tu ritmo cardíaco, oxígeno y pasos con total precisión. 🏃‍♂️");
            pieces.push("Además, resiste entrenamientos de alta intensidad con sus modos deportivos integrados.");
          } else if (isForGift) {
            pieces.push("Como regalo es espectacular. Viene en una presentación súper premium con su caja magnética de lujo. 🎁");
            pieces.push("Y es sumamente fácil e intuitivo de configurar para cualquier persona.");
          } else {
            pieces.push("Es genial porque une un diseño premium con sensores de salud avanzados, notificaciones de redes y medidor de sueño.");
            pieces.push("Además, la batería te rinde espectacular para todo el día.");
          }
          pieces.push("Lo mejor es que puedes responder y hacer llamadas directo del reloj con su micrófono integrado. 📞");
          pieces.push("¿Te gustaría conocer los precios especiales y los colores disponibles?");
          nextStage = 3;
          break;

        case 3: // Stage 3: Derriba objeciones (Validar -> redirigir -> cerrar con pregunta)
          const asksWarranty = textLower.includes('garantía') || textLower.includes('garantia') || textLower.includes('daño') || textLower.includes('seguro');
          const asksPrice = textLower.includes('precio') || textLower.includes('costo') || textLower.includes('vale') || textLower.includes('valor');
          const asksShipping = textLower.includes('envío') || textLower.includes('envio') || textLower.includes('cali') || textLower.includes('bogota') || textLower.includes('medellin');
          const asksSafety = textLower.includes('estafa') || textLower.includes('confiar') || textLower.includes('falso') || textLower.includes('real');

          if (asksWarranty) {
            pieces.push("Es una excelente pregunta. Para nosotros tu tranquilidad es lo más importante.");
            pieces.push("Te damos una garantía total de 3 meses por fallas de fábrica y soporte posventa directo.");
          } else if (asksPrice) {
            pieces.push("Te entiendo, todos buscamos el mejor costo beneficio.");
            pieces.push("Normalmente su precio es de $180.000, pero hoy lo tenemos en oferta exclusiva por solo $120.000 COP.");
          } else if (asksShipping || asksSafety) {
            pieces.push("¡Totalmente de acuerdo! Comprar por internet a veces genera desconfianza.");
            pieces.push("Por eso contamos con Envíos Gratis y Pago Contra Entrega en todo el país.");
            pieces.push("No pagas nada por adelantado, cancelas en efectivo al repartidor cuando lo tengas en tu puerta.");
          } else {
            pieces.push("Entiendo perfectamente lo que me dices.");
            pieces.push("El Smartwatch Ultra X8 está hoy en promoción por solo $120.000 COP.");
            pieces.push("Eso ya te incluye el envío gratis y garantía completa de 3 meses.");
          }

          pieces.push("Nos quedan las últimas unidades de lanzamiento en bodega. ¿Qué color te gustaría separar: Negro Premium, Gris Titanio o Naranja Deportivo?");
          nextStage = 4;
          break;

        case 4: // Stage 4: Cierra por asunción (Asumir la venta + combos/ofertas)
          const isCombo = textLower.includes('combo') || textLower.includes('promocion') || textLower.includes('promoción') || textLower.includes('dos') || textLower.includes('2') || textLower.includes('ambos');

          pieces.push("¡Excelente elección! Separamos tu pedido de inmediato, ese color luce espectacular. ⌚");
          if (isCombo) {
            pieces.push("¡Súper! Aprovechas la promoción de Combo: 2 relojes completos por solo $200.000 COP (ahorras $40.000 extra).");
            pieces.push("Te incluye doble caja premium y doble envío totalmente gratuito.");
          } else {
            pieces.push("Por cierto, hoy tenemos promo relámpago de combo: puedes llevar una segunda unidad por solo $80.000 COP adicionales.");
            pieces.push("Es perfecto para sorprender a un familiar con un súper detalle.");
          }
          pieces.push("¿Te despacho la unidad individual o prefieres asegurar de una vez el combo de dos?");
          nextStage = 5;
          break;

        case 5: // Stage 5: Toma datos y confirma una vez (Directo, sin enredos)
          const hasDetails = textLower.includes('calle') || textLower.includes('carrera') || textLower.includes('barrio') || textLower.includes('avenida') || textLower.includes('cll') || textLower.includes('cra');

          if (hasDetails) {
            pieces.push("¡Listo! Ya tomé tus datos de envío correctamente. Todo queda agendado.");
            pieces.push("Tu pedido sale hoy mismo a ruta de entrega.");
            pieces.push("Recuerda tener el efectivo a la mano al recibir. ¡Muchas gracias por tu compra! 😊");
            nextStage = 6;

            // Auto add Venta Cerrada tag & Move to Kanban closed sales column if applicable
            setTimeout(() => {
              setChats(prev => prev.map(c => {
                if (c.id === chatId) {
                  const tags = c.tags || [];
                  const nextTags = tags.includes('Venta Cerrada') ? tags : [...tags, 'Venta Cerrada'];
                  return { ...c, tags: nextTags, columnId: 'ventas_cerradas' };
                }
                return c;
              }));
            }, 3000);
          } else {
            pieces.push("¡Excelente! Todo listo para despachar hoy con envío gratis. 🚚");
            pieces.push("Para generar la guía de Servientrega / Coordinadora, confírmame porfa:");
            pieces.push("• Nombre completo:\n• Celular:\n• Ciudad/Municipio:\n• Dirección exacta y Barrio:");
            nextStage = 5; // Stay in stage 5 until they send address details
          }
          break;

        case 6: // Stage 6: Post-cierre = silencio (Silencio estratégico)
          pieces.push("¡Hola! Tu pedido ya va en camino súper seguro.");
          pieces.push("Apenas la transportadora nos reporte el número de guía te lo pasamos por aquí. ¡Que tengas un excelente día!");
          nextStage = 6;
          break;

        default:
          pieces.push("¡Hola! ¿En qué te puedo asesorar hoy?");
          nextStage = 1;
      }

      // Update state stage for this chat
      setChatStages(prev => ({
        ...prev,
        [chatId]: nextStage
      }));

    } else {
      // Check user configured FAQs first!
      let matchedFaqObj: (typeof faqs)[0] | undefined = undefined;
      for (const f of faqs) {
        if (!f.question) continue;
        const qLower = f.question.toLowerCase().trim();
        const keywords = qLower.split(/\s+/).filter(w => w.length > 2);
        if (textLower.includes(qLower) || keywords.some(kw => textLower.includes(kw))) {
          matchedFaqObj = f;
          break;
        }
      }

      if (matchedFaqObj) {
        pieces.push(matchedFaqObj.answer);
        if (matchedFaqObj.attachments && matchedFaqObj.attachments.length > 0) {
          for (const att of matchedFaqObj.attachments) {
            faqAudioAttachment = {
              name: att.name || 'Nota_de_voz.ogg',
              type: att.type || 'audio',
              url: att.url || 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'
            };
          }
        }
      } else {
        // Advanced combinatory check for multi-message buffer understanding!
      const matchesSmartwatch = textLower.includes('smartwatch') || textLower.includes('reloj') || textLower.includes('ultra');
      const matchesCali = textLower.includes('cali') || textLower.includes('envio') || textLower.includes('envíos') || textLower.includes('contra entrega') || textLower.includes('entrega');
      const matchesGarantia = textLower.includes('garantía') || textLower.includes('garantia') || textLower.includes('licuadora') || textLower.includes('daño');
      const matchesPrecio = textLower.includes('precio') || textLower.includes('costo') || textLower.includes('vale') || textLower.includes('valor');
      const matchesDescuento = textLower.includes('descuento') || textLower.includes('unidades') || textLower.includes('promocion') || textLower.includes('promo');

      // Add brief opener dynamically
      if (hasInactivityContext) {
        pieces.push("¡Hola! Qué gusto saludarte de nuevo por acá 😊");
      } else if (matchesSmartwatch || matchesPrecio || matchesCali || matchesGarantia || matchesDescuento) {
        const openers = [
          "¡Claro que sí! Con gusto te paso la información.",
          "¡Hola! Te cuento rápido sobre tu consulta.",
          "¡Hola! Con todo el gusto te ayudo con eso."
        ];
        pieces.push(openers[Math.floor(Math.random() * openers.length)]);
      }

      if (matchesSmartwatch) {
        pieces.push("Tenemos disponible el Smartwatch Ultra X8 ⌚");
        pieces.push("Viene con pantalla AMOLED súper nítida y monitoreo de salud.");
      }
      if (matchesPrecio) {
        pieces.push("Tiene un súper precio de solo $120.000 COP.");
        pieces.push("Ese valor ya te incluye el envío gratis a todo el país.");
      }
      if (matchesCali) {
        pieces.push("Hacemos envíos súper rápidos con pago contra entrega 🚚");
        pieces.push("Pagas en efectivo al recibir el producto en tu puerta por seguridad.");
        pieces.push("Normalmente te llega de 2 a 4 días hábiles.");
      }
      if (matchesGarantia) {
        pieces.push("Te damos garantía completa de 3 meses por cualquier defecto.");
        pieces.push("Tienes soporte directo con nosotros en bodega.");
      }
      if (matchesDescuento) {
        pieces.push("¡Y sí, tenemos promos geniales hoy!");
        pieces.push("Llevando la segunda unidad tienes un 10% de descuento automático.");
      }

      // Default responses if nothing matched
      if (pieces.length === 0) {
        if (textLower.includes('bogotá') || textLower.includes('bogota')) {
          pieces.push("¡Listo! Despachamos hoy mismo para Bogotá 🚚");
          pieces.push("Te estaría llegando en 1 o 2 días hábiles.");
        } else if (textLower.includes('gracias') || textLower.includes('confirmar')) {
          pieces.push("¡Con todo gusto!");
          pieces.push("Quedo súper atento para coordinar tu envío de inmediato.");
        } else {
          const fallbacks = [
            "¡Hola! ¿Cómo estás? 😊",
            "Hola, un gusto saludarte por acá.",
            "¡Hola! ¿En qué te puedo asesorar el día de hoy?"
          ];
          pieces.push(fallbacks[Math.floor(Math.random() * fallbacks.length)]);
          if (botPrompt.includes('ventas')) {
            pieces.push("Recuerda que tenemos envío gratis y pagas al recibir en tu casa.");
          }
        }
      } else {
        // Add a small dynamic closing question/call-to-action
        const closers = [
          "¿Te gustaría que agendemos tu pedido hoy mismo?",
          "¿Para qué ciudad deseas tu envío?",
          "Cuéntame, ¿te interesa aprovechar la promoción?",
          "¿Te queda alguna otra duda sobre el producto?"
        ];
        pieces.push(closers[Math.floor(Math.random() * closers.length)]);
      }
    }
  }

    // Smart-splitting algorithm to strictly ensure 2 to 4 short message bubbles
    let finalPieces = pieces.map(p => p.trim()).filter(Boolean);

    // If there are more than 4 separate messages, merge the shortest adjacent ones
    while (finalPieces.length > 4) {
      let minCombinedLength = Infinity;
      let mergeIndex = 0;
      for (let i = 0; i < finalPieces.length - 1; i++) {
        const combinedLen = finalPieces[i].length + finalPieces[i+1].length;
        if (combinedLen < minCombinedLength) {
          minCombinedLength = combinedLen;
          mergeIndex = i;
        }
      }
      const first = finalPieces[mergeIndex];
      const second = finalPieces[mergeIndex + 1];
      const separator = (first.endsWith('.') || first.endsWith('!') || first.endsWith('?') || first.endsWith('😊') || first.endsWith('⌚') || first.endsWith('🚚') || first.endsWith('🎁') || first.endsWith('📞') || first.endsWith('🏃‍♂️')) ? ' ' : '. ';
      finalPieces[mergeIndex] = first + separator + second;
      finalPieces.splice(mergeIndex + 1, 1);
    }

    // If there is only 1 message, and it contains multiple sentences, split it into 2
    if (finalPieces.length === 1) {
      const singleText = finalPieces[0];
      const sentences = singleText.split(/(?<=[.?!])\s+/);
      if (sentences.length > 1) {
        finalPieces = [
          sentences.slice(0, Math.ceil(sentences.length / 2)).join(" "),
          sentences.slice(Math.ceil(sentences.length / 2)).join(" ")
        ];
      }
    }

    // Sanitize and remove double dots/extra spaces
    finalPieces = finalPieces
      .map(p => p.replace(/\.\./g, '.').trim())
      .filter(Boolean);

    // Staggered consecutive sending with realistic typing speed!
    let delayAccumulator = 0;

    finalPieces.forEach((messageText, index) => {
      // Calculate typing time proportional to message size (e.g. 45ms per character), clamped between 800ms and 2400ms
      const typingTime = Math.min(2400, Math.max(800, messageText.length * 45));

      const startTypingDelay = delayAccumulator;
      const sendDelay = delayAccumulator + typingTime;

      // Update accumulator for the next message loop (leaving a realistic pause of 700ms before starting to type next)
      delayAccumulator = sendDelay + 700;

      // 1. Trigger simulated typing status
      setTimeout(() => {
        setIsBotTyping(true);
      }, startTypingDelay);

      // 2. Trigger message delivery
      setTimeout(() => {
        // If it's the last message, turn typing status off
        if (index === finalPieces.length - 1) {
          setIsBotTyping(false);
        }

        const msgTime = formatLocalTime(new Date());
        const formattedText = `🤖 [Bot]: ${messageText}`;

        setMessages(prev => ({
          ...prev,
          [chatId]: [
            ...(prev[chatId] || []),
            { sender: 'bot', text: formattedText, time: msgTime, attachment: (index === finalPieces.length - 1 && faqAudioAttachment) ? faqAudioAttachment : undefined }
          ]
        }));

        setChats(prev => prev.map(c => c.id === chatId ? { ...c, msg: formattedText, time: 'Ahora', unread: 0 } : c));

        // Execute AI rules matching
        checkAIRules(formattedText, chatId);

      }, sendDelay);
    });
  };

  // Main coordinator function that processes incoming client messages using the buffer
  const triggerBotResponseForClientMessage = (chatId: string, clientMessage: string) => {
    if (!isBotActive) return;

    if (isBufferEnabled) {
      // We will add the text to the messageBuffers
      setMessageBuffers(prevBuffers => {
        const currentBuf = prevBuffers[chatId] || [];
        const updatedBuf = [...currentBuf, clientMessage];

        // Return next state
        return {
          ...prevBuffers,
          [chatId]: updatedBuf
        };
      });

      // Show that bot is typing immediately for the buffer duration
      setIsBotTyping(true);

      // Check if timeout is already running
      setBufferTimeouts(prevTimeouts => {
        if (prevTimeouts[chatId]) {
          // If already running, do not start a new one (we collect more messages in the buffer)
          return prevTimeouts;
        }

        // If no timeout is running, start one!
        const timeoutId = setTimeout(() => {
          // Get the latest buffer state inside the timeout
          setMessageBuffers(latestBuffers => {
            const buf = latestBuffers[chatId] || [];
            if (buf.length > 0) {
              const combinedText = buf.join(' | ');
              respondAsBot(chatId, combinedText);
            }

            // Clean up buffer
            const nextBufs = { ...latestBuffers };
            delete nextBufs[chatId];
            return nextBufs;
          });

          // Clean up timeout ref
          setBufferTimeouts(currentTimeouts => {
            const nextTimeouts = { ...currentTimeouts };
            delete nextTimeouts[chatId];
            return nextTimeouts;
          });

        }, bufferSeconds * 1000);

        return {
          ...prevTimeouts,
          [chatId]: timeoutId
        };
      });

    } else {
      // Immediate execution
      respondAsBot(chatId, clientMessage);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    const text = chatInput;
    setChatInput('');

    const timeString = formatLocalTime(new Date());

    // 1. Add agent message locally
    setMessages(prev => ({
      ...prev,
      [activeChatId]: [
        ...(prev[activeChatId] || []),
        { sender: 'agent', text, time: timeString }
      ]
    }));

    // 2. Update preview message in chat list
    setChats(prev => prev.map(c => c.id === activeChatId ? { ...c, msg: text, time: 'Ahora' } : c));

    // 3. Dispatch real message via WhatsApp API / socket
    const activeChat = chats.find(c => c.id === activeChatId);
    if (activeChat && activeChat.phone) {
      try {
        await fetch('/api/whatsapp/reply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: activeChat.phone,
            message: text,
            channelId: activeChat.channelId || userChannelId
          })
        });
      } catch (e) {
        console.error("Error enviando mensaje mediante API de WhatsApp:", e);
      }
    }
  };

  const handleAddNewRealChat = () => {
    const num = prompt('Ingresa el número de WhatsApp del cliente con código de país (ej. +573001234567):');
    if (num) {
      const newId = String(Date.now());
      const newChat = {
        id: newId,
        name: num,
        time: 'Ahora',
        msg: 'Contacto agregado a la API Real',
        unread: 0,
        phone: num,
        columnId: 'leads_nuevos',
        tags: ['API Real'],
        leadStatus: 'tibio' as const
      };
      setChats(prev => [newChat, ...prev]);
      setActiveChatId(newId);
    }
  };

  // Wizard State
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardData, setWizardData] = useState({ name: '', products: '', tone: 'Amigable', policies: '', businessType: 'E-Commerce (Venta de Productos)', businessObjective: 'Cerrar Ventas Directas' });
  const [isGenerating, setIsGenerating] = useState(false);

  const [businessType, setBusinessType] = useState('E-Commerce (Venta de Productos)');
  const [businessObjective, setBusinessObjective] = useState('Cerrar Ventas Directas');

  React.useEffect(() => {
    if (onNicheChange) {
      onNicheChange(businessType);
    }
  }, [businessType, onNicheChange]);

  const handleApplyNicheTemplate = (type: string) => {
    setBusinessType(type);

    let defaultObjective = 'Cerrar Ventas Directas';
    if (type === 'Restaurante / Comida Rápida') {
      defaultObjective = 'Tomar Pedidos a Domicilio y Reservas de Mesa';
    } else if (type === 'Hotel / Hospedaje') {
      defaultObjective = 'Reservas de Habitaciones y Hospitalidad';
    } else if (type === 'Servicios / Consultoría' || type === 'Salud / Estética') {
      defaultObjective = 'Agendar Citas y Asesoría Especializada';
    } else if (type === 'Networkers / Afiliados') {
      defaultObjective = 'Presentación de Oportunidad y Seguimiento';
    }
    setBusinessObjective(defaultObjective);

    const nicheTemplates: Record<string, any> = {
      'Restaurante / Comida Rápida': {
        funnelName: 'Embudo Restaurante',
        columns: [
          { id: 'nuevos_pedidos', name: 'Nuevos Pedidos', color: '#3b82f6', pipelineId: 'ventas' },
          { id: 'preparacion', name: 'En Preparación', color: '#eab308', pipelineId: 'ventas' },
          { id: 'en_camino', name: 'En Camino (Domicilio)', color: '#f59e0b', pipelineId: 'ventas' },
          { id: 'entregado', name: 'Entregado / Cerrado', color: '#10b981', pipelineId: 'ventas' }
        ],
        rules: [
          { id: 'r_rest_1', phrase: 'menu', action: 'etiqueta', value: 'Consulta Menú', active: true },
          { id: 'r_rest_2', phrase: 'domicilio', action: 'kanban', value: 'en_camino', active: true },
          { id: 'r_rest_3', phrase: 'demora', action: 'alerta', value: 'Cliente quejándose por demora', active: true }
        ],
        promptBase: `Eres el Asistente Virtual Oficial del Restaurante. Tu objetivo principal es brindar una atención cordial, rápida y apetitosa por WhatsApp para mostrar el menú, tomar pedidos a domicilio y gestionar reservas de mesa.

1. TONO Y COMUNICACIÓN:
- Sé amable, educado y entusiasta. Usa emojis gastronómicos acordes (🍕, 🍔, 🥩, 🍷, 🛵).
- Saluda con calidez ofreciendo las promociones o sugerencias del chef del día.

2. MENÚ Y ESPECIALIDADES:
- Platos Fuertes: Hamburguesas Artesanales, Pizzas a la Leña, Cortes de Carne, Pastas y Opciones Vegetarianas.
- Entradas: Papas Rústicas con Cheddar, Nachos Supremos, Alitas BBQ/Búfalo.
- Bebidas y Postres: Limonadas Naturales, Cervezas Artesanales, Malteadas, Cheesecake.
- Combos: Combo Pareja (2 Platos + 2 Bebidas + Postre con 15% Off) y Combo Familiar.

3. FLUJO DE TOMA DE PEDIDOS (DOMICILIOS):
Cuando el cliente solicite un domicilio, solicita en orden:
a) Platos y especificaciones (término de carne, sin cebolla, adiciones).
b) Nombre completo del cliente.
c) Dirección exacta de entrega (Barrio + Ciudad + Punto de referencia).
d) Método de pago (Efectivo, Nequi, Daviplata, Tarjeta o Pago contra entrega).
e) Confirma el resumen del pedido y el tiempo estimado de entrega (30 a 45 minutos).

4. RESERVAS DE MESAS:
Si el cliente desea reservar una mesa, solicita:
a) Fecha y Hora exacta.
b) Número de personas.
c) Ocasión especial (Cumpleaños, Aniversario, Cita o Reunión).
d) Nombre y teléfono de contacto.

5. HORARIOS Y COBERTURA:
- Horario de Atención: Lunes a Domingo de 11:30 AM a 10:30 PM.
- Zona de cobertura de domicilios: Hasta 8 km sin recargo.`
      },
      'Hotel / Hospedaje': {
        funnelName: 'Embudo Hotel',
        columns: [
          { id: 'nuevas_consultas', name: 'Nuevas Consultas', color: '#3b82f6', pipelineId: 'ventas' },
          { id: 'cotizacion', name: 'Cotización Enviada', color: '#eab308', pipelineId: 'ventas' },
          { id: 'reserva_confirmada', name: 'Reserva Confirmada', color: '#22c55e', pipelineId: 'ventas' },
          { id: 'check_in', name: 'Check-in Realizado', color: '#10b981', pipelineId: 'ventas' }
        ],
        rules: [
          { id: 'r_hot_1', phrase: 'reserva', action: 'etiqueta', value: 'Interesado Reserva', active: true },
          { id: 'r_hot_2', phrase: 'disponibilidad', action: 'kanban', value: 'nuevas_consultas', active: true },
          { id: 'r_hot_3', phrase: 'cancelar', action: 'alerta', value: 'Cliente desea cancelar reserva', active: true }
        ],
        promptBase: `Eres el Asistente Virtual Oficial del Hotel. Tu objetivo principal es: ${defaultObjective}. Brinda información sobre disponibilidad de habitaciones, precios por noche, check-in, servicios (piscina, wifi, desayuno) con un tono muy hospitalario y profesional.`
      },
      'Servicios / Consultoría': {
        funnelName: 'Embudo Servicios',
        columns: [
          { id: 'leads_nuevos', name: 'Leads Nuevos', color: '#3b82f6', pipelineId: 'ventas' },
          { id: 'interesados', name: 'Interesados / En Seguimiento', color: '#eab308', pipelineId: 'ventas' },
          { id: 'cita_agendada', name: 'Cita Agendada', color: '#22c55e', pipelineId: 'ventas' },
          { id: 'servicio_realizado', name: 'Servicio Realizado', color: '#10b981', pipelineId: 'ventas' }
        ],
        rules: [
          { id: 'r_serv_1', phrase: 'cita', action: 'agendar_cita', value: 'Cita Automática', active: true },
          { id: 'r_serv_2', phrase: 'informacion', action: 'etiqueta', value: 'Lead Interesado', active: true },
          { id: 'r_serv_3', phrase: 'urgente', action: 'alerta', value: 'Solicitud urgente de servicio', active: true }
        ],
        promptBase: `Eres el Asistente Virtual Oficial de Servicios & Consultoría. Tu objetivo principal es: ${defaultObjective}. Agenda citas, aclara dudas sobre los planes de servicio y realiza seguimiento amigable.`
      },
      'Salud / Estética': {
        funnelName: 'Embudo Salud y Estética',
        columns: [
          { id: 'leads_nuevos', name: 'Leads Nuevos', color: '#3b82f6', pipelineId: 'ventas' },
          { id: 'interesados', name: 'Interesados / En Seguimiento', color: '#eab308', pipelineId: 'ventas' },
          { id: 'cita_agendada', name: 'Cita Agendada', color: '#22c55e', pipelineId: 'ventas' },
          { id: 'servicio_realizado', name: 'Servicio Realizado', color: '#10b981', pipelineId: 'ventas' }
        ],
        rules: [
          { id: 'r_sal_1', phrase: 'cita', action: 'agendar_cita', value: 'Cita Automática', active: true },
          { id: 'r_sal_2', phrase: 'tratamiento', action: 'etiqueta', value: 'Consulta Tratamiento', active: true },
          { id: 'r_sal_3', phrase: 'dolor', action: 'alerta', value: 'Paciente reporta dolor/molestia', active: true }
        ],
        promptBase: `Eres el Asistente Virtual Oficial del Centro de Salud y Estética. Tu objetivo es: ${defaultObjective}. Agenda valoraciones, explica los tratamientos disponibles y recuerda amablemente las citas.`
      },
      'Networkers / Afiliados': {
        funnelName: 'Embudo Networkers',
        columns: [
          { id: 'prospectos', name: 'Nuevos Prospectos', color: '#3b82f6', pipelineId: 'ventas' },
          { id: 'presentacion', name: 'Presentación de Negocio', color: '#eab308', pipelineId: 'ventas' },
          { id: 'seguimiento', name: 'Seguimiento', color: '#f59e0b', pipelineId: 'ventas' },
          { id: 'cierre', name: 'Cierre / Afiliación', color: '#22c55e', pipelineId: 'ventas' }
        ],
        rules: [
          { id: 'r_net_1', phrase: 'citas', action: 'agendar_cita', value: 'Cita Automática', active: true },
          { id: 'r_net_2', phrase: 'afiliar', action: 'etiqueta', value: 'Listo para Cierre', active: true },
          { id: 'r_net_3', phrase: 'informacion', action: 'alerta', value: 'Solicita más información del negocio', active: true }
        ],
        promptBase: `Eres el Asistente Virtual para Networkers y Afiliados. Tu objetivo principal es: ${defaultObjective}. Invita a presentaciones Zoom, evalúa la intención de los prospectos y comparte la visión con entusiasmo.`
      },
      'E-Commerce (Venta de Productos)': {
        funnelName: 'Ventas',
        columns: [
          { id: 'nuevo_contacto', name: 'Nuevo contacto', color: '#3b82f6', pipelineId: 'ventas' },
          { id: 'msg_inicial', name: 'Msg inicial enviado', color: '#ca8a04', pipelineId: 'ventas' },
          { id: 'en_conversacion', name: 'En conversación', color: '#a855f7', pipelineId: 'ventas' },
          { id: 'alta_intencion', name: 'Alta intención', color: '#f97316', pipelineId: 'ventas' },
          { id: 'datos_incompletos', name: 'Datos incompletos', color: '#6b7280', pipelineId: 'ventas' },
          { id: 'pago_anticipado', name: 'Pago anticipado', color: '#ec4899', pipelineId: 'ventas' },
          { id: 'pago_validado', name: 'Pago validado', color: '#06b6d4', pipelineId: 'ventas' },
          { id: 'pedido_confirmado', name: 'Pedido confirmado', color: '#10b981', pipelineId: 'ventas' },
          { id: 'objecion', name: 'Objeción', color: '#ef4444', pipelineId: 'ventas' },
          { id: 'modificacion', name: 'Modificación', color: '#f59e0b', pipelineId: 'ventas' },
          { id: 'anulacion', name: 'Anulación', color: '#7f1d1d', pipelineId: 'ventas' }
        ],
        rules: [
          { id: 'r_eco_1', phrase: 'precio', action: 'kanban', value: 'en_conversacion', active: true },
          { id: 'r_eco_2', phrase: 'comprar', action: 'etiqueta', value: 'Listo para Compra', active: true },
          { id: 'r_eco_3', phrase: 'garantia', action: 'alerta', value: 'Revisión técnica solicitada (Garantía)', active: true }
        ],
        promptBase: `Eres un Asistente de Ventas experto en E-commerce. Tu objetivo principal es: ${defaultObjective}. Ofrece pago contra entrega (Dropi/MasterShop), aclara características de productos y aplica gatillos de urgencia.`
      }
    };

    const template = nicheTemplates[type] || nicheTemplates['E-Commerce (Venta de Productos)'];

    setPipelines(prev => prev.map(p => p.id === 'ventas' ? { ...p, name: template.funnelName } : p));
    setKanbanColumns(prev => [...template.columns, ...prev.filter(c => c.pipelineId !== 'ventas')]);

    // Only update rules that don't conflict with existing ones or simply append/replace them
    // For simplicity, we can prepend the template rules to any existing custom rules
    // that don't share the same IDs. In a real app we might want to replace them completely or ask.
    setAiAutomationRules(prev => {
      const templateRuleIds = template.rules.map((r: any) => r.id);
      const filteredPrev = prev.filter(r => !templateRuleIds.includes(r.id));
      return [...template.rules, ...filteredPrev];
    });

    setBotPrompt(template.promptBase);

    // Custom Official WhatsApp HSM Templates per Niche
    let customTemplates = [
      { id: '1', name: 'confirmacion_pedido', category: 'UTILITY', language: 'es', status: 'APPROVED', body: '¡Hola {{1}}! Tu pedido de {{2}} ha sido confirmado y está en camino con Pago Contra Entrega. Código de guía: {{3}}. Gracias por tu compra! 📦', headerType: 'IMAGE', headerUrl: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=400&q=80' },
      { id: '2', name: 'recuperacion_carrito', category: 'MARKETING', language: 'es', status: 'APPROVED', body: '¡Hola {{1}}! Vimos que dejaste tu {{2}} en el carrito de compras. Completa tu orden hoy y obtén un 10% de descuento usando el código RECUPERA10. 🎁', headerType: 'VIDEO', headerUrl: 'https://assets.mixkit.co/videos/preview/mixkit-card-payment-in-a-shop-40243-large.mp4' },
      { id: '3', name: 'soporte_general', category: 'UTILITY', language: 'es', status: 'APPROVED', body: 'Hola {{1}}, un asesor de soporte se pondrá en contacto contigo pronto para resolver tu duda sobre: {{2}}. Horario de atención: 8am - 6pm. 💬', headerType: 'DOCUMENT', headerUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' }
    ];
    let customTestVariables = 'Juan, Smartwatch Ultra, COL-9821';
    let defaultCaptureProduct = 'Smartwatch Ultra X8';
    let defaultCaptureCampaign = 'Anuncio Facebook - 30% Off';
    let defaultCaptureTicket = 120000;

    if (type === 'Restaurante / Comida Rápida') {
      customTemplates = [
        { id: '1', name: 'confirmacion_pedido', category: 'UTILITY', language: 'es', status: 'APPROVED', body: '¡Hola {{1}}! Hemos recibido tu pedido de {{2}}. Tu comida ya está en preparación y saldrá con nuestro domiciliario muy pronto. ¡Buen provecho! 🍔🍕', headerType: 'IMAGE', headerUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=400&q=80' },
        { id: '2', name: 'recuperacion_carrito', category: 'MARKETING', language: 'es', status: 'APPROVED', body: '¡Hola {{1}}! ¿Te dio hambre? Vimos que dejaste tu orden de {{2}} a medias. Completa tu pedido ahora y te regalamos el envío con el código COMIDA10. 🍟', headerType: 'VIDEO', headerUrl: 'https://assets.mixkit.co/videos/preview/mixkit-card-payment-in-a-shop-40243-large.mp4' },
        { id: '3', name: 'soporte_general', category: 'UTILITY', language: 'es', status: 'APPROVED', body: 'Hola {{1}}, gracias por escribirnos. Un asesor del restaurante atenderá tu consulta sobre {{2}} de inmediato. Nuestro horario de atención es de 11am a 11pm. 🍕', headerType: 'DOCUMENT', headerUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' }
      ];
      customTestVariables = 'Carlos, Hamburguesa con Queso, Mesa 4';
      defaultCaptureProduct = 'Hamburguesa Doble Carne con Papas';
      defaultCaptureCampaign = 'Promo Almuerzo Oficina - Local';
      defaultCaptureTicket = 28000;
    } else if (type === 'Hotel / Hospedaje') {
      customTemplates = [
        { id: '1', name: 'confirmacion_pedido', category: 'UTILITY', language: 'es', status: 'APPROVED', body: '¡Hola {{1}}! Tu reserva para {{2}} ha sido confirmada con éxito. Tu check-in está programado para el {{3}}. ¡Esperamos que disfrutes tu estadía! 🏨🔑', headerType: 'IMAGE', headerUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=400&q=80' },
        { id: '2', name: 'recuperacion_carrito', category: 'MARKETING', language: 'es', status: 'APPROVED', body: '¡Hola {{1}}! Vimos tu interés en hospedarte con nosotros en {{2}}. Asegura tu habitación hoy mismo antes de que se agoten los cupos para esta fecha. 🌊', headerType: 'VIDEO', headerUrl: 'https://assets.mixkit.co/videos/preview/mixkit-card-payment-in-a-shop-40243-large.mp4' },
        { id: '3', name: 'soporte_general', category: 'UTILITY', language: 'es', status: 'APPROVED', body: 'Hola {{1}}, un recepcionista de nuestro hotel se comunicará contigo de inmediato para asistirte con tu solicitud sobre {{2}}. Estamos a tu servicio las 24/7. 🛎️', headerType: 'DOCUMENT', headerUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' }
      ];
      customTestVariables = 'Sofía, Suite Vista al Mar, 15 de Octubre';
      defaultCaptureProduct = 'Estadía 2 Noches Suite Deluxe';
      defaultCaptureCampaign = 'Escapada de Fin de Semana';
      defaultCaptureTicket = 350000;
    } else if (type === 'Servicios / Consultoría') {
      customTemplates = [
        { id: '1', name: 'confirmacion_pedido', category: 'UTILITY', language: 'es', status: 'APPROVED', body: '¡Hola {{1}}! Tu cita para la consultoría de {{2}} ha sido agendada con éxito para el día {{3}}. Nos conectaremos por el enlace enviado a tu correo. 🗓️💼', headerType: 'IMAGE', headerUrl: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=400&q=80' },
        { id: '2', name: 'recuperacion_carrito', category: 'MARKETING', language: 'es', status: 'APPROVED', body: '¡Hola {{1}}! Notamos que mostraste interés en nuestro servicio de {{2}} pero no agendaste tu sesión de diagnóstico. Separa tu espacio hoy mismo. 📈', headerType: 'VIDEO', headerUrl: 'https://assets.mixkit.co/videos/preview/mixkit-card-payment-in-a-shop-40243-large.mp4' },
        { id: '3', name: 'soporte_general', category: 'UTILITY', language: 'es', status: 'APPROVED', body: 'Hola {{1}}, un asesor especializado de nuestro equipo se pondrá en contacto contigo muy pronto para resolver tu consulta de {{2}}. ¡Gracias por confiar en nosotros! 💡', headerType: 'DOCUMENT', headerUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' }
      ];
      customTestVariables = 'Andrés, Asesoría Tributaria, 18 de Octubre 3 PM';
      defaultCaptureProduct = 'Plan de Consultoría Mensual';
      defaultCaptureCampaign = 'Campaña Diagnóstico Gratis';
      defaultCaptureTicket = 450000;
    } else if (type === 'Salud / Estética') {
      customTemplates = [
        { id: '1', name: 'confirmacion_pedido', category: 'UTILITY', language: 'es', status: 'APPROVED', body: '¡Hola {{1}}! Confirmamos tu cita para el tratamiento de {{2}} el día {{3}}. Recuerda llegar 10 minutos antes. ¡Nos vemos pronto para consentirte! 🌸🩺', headerType: 'IMAGE', headerUrl: 'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&w=400&q=80' },
        { id: '2', name: 'recuperacion_carrito', category: 'MARKETING', language: 'es', status: 'APPROVED', body: '¡Hola {{1}}! Vimos que estabas interesado en agendar un espacio para {{2}}. Elige tu horario ahora y recibe un obsequio especial en tu primera sesión. ✨', headerType: 'VIDEO', headerUrl: 'https://assets.mixkit.co/videos/preview/mixkit-card-payment-in-a-shop-40243-large.mp4' },
        { id: '3', name: 'soporte_general', category: 'UTILITY', language: 'es', status: 'APPROVED', body: 'Hola {{1}}, un especialista de nuestra clínica se comunicará contigo pronto para orientarte sobre {{2}}. Estamos para cuidar de ti. 🏥', headerType: 'DOCUMENT', headerUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' }
      ];
      customTestVariables = 'Diana, Peeling Facial, 14 de Octubre 10 AM';
      defaultCaptureProduct = 'Tratamiento Rejuvenecimiento Pro';
      defaultCaptureCampaign = 'Google Ads Estética Local';
      defaultCaptureTicket = 180000;
    } else if (type === 'Networkers / Afiliados') {
      customTemplates = [
        { id: '1', name: 'confirmacion_pedido', category: 'UTILITY', language: 'es', status: 'APPROVED', body: '¡Hola {{1}}! Tu registro para la presentación del sistema de negocios {{2}} ha sido confirmado para hoy a las {{3}}. ¡Prepárate para expandir tus ingresos! 🚀💎', headerType: 'IMAGE', headerUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=400&q=80' },
        { id: '2', name: 'recuperacion_carrito', category: 'MARKETING', language: 'es', status: 'APPROVED', body: '¡Hola {{1}}! Vimos que te interesó nuestra masterclass de {{2}} pero no completaste tu registro. No dejes pasar esta oportunidad de crecimiento. 📊', headerType: 'VIDEO', headerUrl: 'https://assets.mixkit.co/videos/preview/mixkit-card-payment-in-a-shop-40243-large.mp4' },
        { id: '3', name: 'soporte_general', category: 'UTILITY', language: 'es', status: 'APPROVED', body: 'Hola {{1}}, un líder de nuestra red te escribirá en breve para resolver tus dudas sobre el plan de compensación de {{2}}. ¡Vamos con toda por el siguiente nivel! 🔥', headerType: 'DOCUMENT', headerUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' }
      ];
      customTestVariables = 'Mateo, Sistema de Afiliados Elite, 8:00 PM';
      defaultCaptureProduct = 'Membresía Anual de Negocios';
      defaultCaptureCampaign = 'Retargeting Masterclass FB';
      defaultCaptureTicket = 590000;
    }

    setTemplates(customTemplates);
    setTestVariables(customTestVariables);
    setCaptureProduct(defaultCaptureProduct);
    setCaptureCampaign(defaultCaptureCampaign);
    setCaptureTicket(defaultCaptureTicket);

    // Notify parent to hide/show menus based on the niche
    if (onNicheChange) {
      onNicheChange(type);
    }

    return template.promptBase;
  };

  const handleGenerateAI = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const nichePromptBase = handleApplyNicheTemplate(wizardData.businessType);
      setBotPrompt(`${nichePromptBase} Eres el asistente virtual de ${wizardData.name || 'nuestra tienda'}. Vendes principalmente: ${wizardData.products || 'productos variados'}. Tu tono de voz es ${wizardData.tone}. Siempre enfócate en ayudar al cliente a hacer la compra de manera rápida y segura.`);
      setGreetingMessage(`¡Hola! 👋 Te damos la bienvenida a ${wizardData.name || 'la tienda'}. ¿En qué te puedo ayudar hoy? Tenemos excelentes opciones de ${wizardData.products || 'nuestros productos'}.`);
      setRules([
        ...rules,
        "Nunca inventes precios.",
        `Tono de conversación: ${wizardData.tone}.`,
        "Aplicar políticas de devolución: " + (wizardData.policies || "Contactarnos para revisar la garantía.")
      ]);
      setFaqs([
        ...faqs,
        { question: "¿Venden " + (wizardData.products ? wizardData.products.split(',')[0] : "estos productos") + "?", answer: "Sí, revisa nuestro catálogo o pregúntame directamente." }
      ]);
      setIsGenerating(false);
      setIsWizardOpen(false);
      setWizardStep(1);
      setWizardData({ name: '', products: '', tone: 'Amigable', policies: '', businessType: 'E-Commerce (Venta de Productos)', businessObjective: 'Cerrar Ventas Directas' });
    }, 2000);
  };


  // Generate the preview string for the official WhatsApp payload
  const parametersString = testVariables
    ? testVariables.split(',').map(v => `          { "type": "text", "text": "${v.trim()}" }`).join(',\n')
    : '';

  const previewPayload = `POST /v19.0/${phoneNumberId || 'PHONE_ID'}/messages HTTP/1.1
Host: graph.facebook.com
Authorization: Bearer EAAbx...
Content-Type: application/json

{
  "messaging_product": "whatsapp",
  "to": "${testRecipient}",
  "type": "template",
  "template": {
    "name": "${selectedTemplate}",
    "language": { "code": "es" },
    "components": [
      {
        "type": "body",
        "parameters": [
${parametersString}
        ]
      }
    ]
  }
}`;

  return (
    <div className={`animate-fade-in ${currentViewTab === 'conversaciones' ? 'space-y-0 h-full' : 'space-y-6'}`}>
      {currentViewTab !== 'conversaciones' && (
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4 flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300 shrink-0">
              <Smartphone size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-zinc-500">Módulo /</span>
                <span className="text-[11px] font-semibold text-zinc-300">WhatsApp Bot</span>
              </div>
              <h2 className="text-lg font-semibold text-white">Automatización de WhatsApp</h2>
            </div>
          </div>

          {/* Real-time Connection & Connected Phone Badge */}
          <div className="flex items-center gap-3">
            {isLiveConnected ? (
              <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-emerald-400 text-xs">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>Línea: <strong className="font-mono text-emerald-300">{connectedPhone ? `+${connectedPhone}` : 'Activa'}</strong></span>
                <span className="text-zinc-500">·</span>
                <span className="text-zinc-400 font-medium">Bot Activo</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs">
                <span className="h-1.5 w-1.5 rounded-full bg-zinc-600"></span>
                <span>WhatsApp no conectado</span>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'entrenamiento_chatbot' && (
        <div className="flex gap-1 border-b border-zinc-800/80 overflow-x-auto pb-px">
          <button
            onClick={() => setInternalTab('conexion')}
            className={`px-3.5 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${internalTab === 'conexion' ? 'border-gold text-gold font-semibold' : 'border-transparent text-zinc-400 hover:text-zinc-200'}`}
          >
            <QrCode size={14} className="inline mr-1.5" />
            Conectar Canales
          </button>
          <button
            onClick={() => setInternalTab('training')}
            className={`px-3.5 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${internalTab === 'training' ? 'border-gold text-gold font-semibold' : 'border-transparent text-zinc-400 hover:text-zinc-200'}`}
          >
            <Database size={14} className="inline mr-1.5" />
            Entrenamiento Base
          </button>
          <button
            onClick={() => setInternalTab('integrations')}
            className={`px-3.5 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${internalTab === 'integrations' ? 'border-gold text-gold font-semibold' : 'border-transparent text-zinc-400 hover:text-zinc-200'}`}
          >
            <Zap size={14} className="inline mr-1.5" />
            Integraciones
          </button>
          <button
            onClick={() => setInternalTab('alertas')}
            className={`px-3.5 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${internalTab === 'alertas' ? 'border-gold text-gold font-semibold' : 'border-transparent text-zinc-400 hover:text-zinc-200'}`}
          >
            <Bell size={14} className="inline mr-1.5" />
            Alertas
          </button>
          <button
            onClick={() => setInternalTab('programaciones')}
            className={`px-3.5 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${internalTab === 'programaciones' ? 'border-gold text-gold font-semibold' : 'border-transparent text-zinc-400 hover:text-zinc-200'}`}
          >
            <Calendar size={14} className="inline mr-1.5" />
            Programaciones
          </button>
        </div>
      )}

      <div className={currentViewTab === 'conversaciones' ? 'pt-0 h-full' : 'pt-2'}>

        {/* REPLACING_CANALES_START */}
        {(currentViewTab === 'conexion' || currentViewTab === 'canales') && (() => {
          const waAccount = allAccounts.find((a: any) => a.platform === 'whatsapp');
          const igAccount = allAccounts.find((a: any) => a.platform === 'instagram');
          const ttAccount = allAccounts.find((a: any) => a.platform === 'tiktok');
          const fbAccount = allAccounts.find((a: any) => a.platform === 'facebook' || a.platform === 'messenger');

          const isWaOfficialActive = Boolean(isOfficialConnected || zernioConnected || waAccount);
          const isIgActive = Boolean(igAccount);
          const isTtActive = Boolean(ttAccount);
          const isFbActive = Boolean(fbAccount);
          const isWaQrActive = Boolean(isLiveConnected);

          const channelsList = [
            {
              id: 'CAN-01',
              name: 'WhatsApp Business Cloud API',
              category: 'whatsapp',
              platformLabel: 'WhatsApp Cloud API',
              identifier: whatsappConnectedNumber || waAccount?.phoneNumber || (isWaOfficialActive ? 'Línea Oficial Vinculada' : 'No vinculado'),
              type: 'API oficial de Meta',
              status: isWaOfficialActive ? 'Conectado' : 'Disponible',
              isActive: isWaOfficialActive,
              icon: <MessageCircle size={18} className="text-emerald-400" />,
              accountId: waAccount?.id || (isWaOfficialActive ? 'local_wa' : null),
              actionType: 'whatsapp',
              date: isWaOfficialActive ? 'Sincronizado' : '-'
            },
            {
              id: 'CAN-02',
              name: 'Instagram Direct & Business',
              category: 'instagram',
              platformLabel: 'Instagram Direct',
              identifier: igAccount?.name || igAccount?.username || (isIgActive ? 'Cuenta IG Vinculada' : 'No vinculado'),
              type: 'Meta Graph API',
              status: isIgActive ? 'Conectado' : 'Disponible',
              isActive: isIgActive,
              icon: <Instagram size={18} className="text-blue-400" />,
              accountId: igAccount?.id,
              actionType: 'instagram',
              date: isIgActive ? 'Sincronizado' : '-'
            },
            {
              id: 'CAN-03',
              name: 'TikTok Messaging & Business',
              category: 'tiktok',
              platformLabel: 'TikTok Direct',
              identifier: ttAccount?.name || ttAccount?.username || (isTtActive ? 'Cuenta TikTok Vinculada' : 'No vinculado'),
              type: 'TikTok Open API',
              status: isTtActive ? 'Conectado' : 'Disponible',
              isActive: isTtActive,
              icon: <Video size={18} className="text-cyan-400" />,
              accountId: ttAccount?.id,
              actionType: 'tiktok',
              date: isTtActive ? 'Sincronizado' : '-'
            },
            {
              id: 'CAN-02-BETA',
              name: 'Instagram Follow to DM (BETA)',
              category: 'instagram',
              platformLabel: 'Instagram Follow to DM',
              identifier: igAccount?.name || 'Requiere elegibilidad Meta',
              type: 'Meta Beta · Nuevos seguidores',
              status: igAccount ? 'Disponible para probar' : 'Conecta Instagram primero',
              isActive: false,
              icon: <Instagram size={18} className="text-amber-400" />,
              accountId: igAccount?.id,
              actionType: 'instagram_beta',
              date: '-'
            },
            {
              id: 'CAN-04',
              name: 'Facebook Messenger & Páginas',
              category: 'facebook',
              platformLabel: 'Messenger API',
              identifier: fbAccount?.name || (isFbActive ? 'Fan Page Vinculada' : 'No vinculado'),
              type: 'Meta Pages API',
              status: isFbActive ? 'Conectado' : 'Disponible',
              isActive: isFbActive,
              icon: <Facebook size={18} className="text-blue-400" />,
              accountId: fbAccount?.id,
              actionType: 'facebook',
              date: isFbActive ? 'Sincronizado' : '-'
            },
            {
              id: 'CAN-05',
              name: 'WhatsApp Business App (Dispositivo Móvil)',
              category: 'whatsapp',
              platformLabel: 'WhatsApp Web / Móvil',
              identifier: connectedPhone || (isWaQrActive ? 'Móvil Escaneado' : 'No vinculado'),
              type: 'Dispositivo Físico (QR)',
              status: isWaQrActive ? 'Conectado' : 'Disponible',
              isActive: isWaQrActive,
              icon: <QrCode size={18} className="text-zinc-400" />,
              accountId: isWaQrActive ? 'local_qr' : null,
              actionType: 'qr',
              date: isWaQrActive ? 'Sincronizado' : '-'
            },
            ...[
              ['CAN-06', 'Telegram', 'telegram'], ['CAN-07', 'X / Twitter', 'twitter'], ['CAN-08', 'LinkedIn', 'linkedin'],
              ['CAN-09', 'YouTube', 'youtube'], ['CAN-10', 'Threads', 'threads'], ['CAN-11', 'Pinterest', 'pinterest'],
              ['CAN-12', 'Reddit', 'reddit'], ['CAN-13', 'Bluesky', 'bluesky'], ['CAN-14', 'Google Business', 'googlebusiness'],
              ['CAN-15', 'Snapchat', 'snapchat'], ['CAN-16', 'Discord', 'discord'], ['CAN-17', 'Slack', 'slack']
              , ['CAN-18', 'Shopify Commerce', 'shopify'], ['CAN-19', 'WordPress Blog', 'wordpress']
            ].map(([id, name, category]) => ({
              id, name, category, platformLabel: name, identifier: 'No vinculado', type: 'Xorbit 360 Omnicanal',
              status: 'Disponible', isActive: false, icon: category === 'shopify' ? <ShoppingCart size={18} className="text-emerald-400" /> : category === 'wordpress' ? <Globe size={18} className="text-blue-400" /> : category === 'tiktok' ? <Video size={18} className="text-cyan-400" /> : category === 'telegram' ? <Send size={18} className="text-sky-400" /> : category === 'youtube' ? <Video size={18} className="text-red-400" /> : category === 'linkedin' ? <Users size={18} className="text-blue-400" /> : category === 'discord' || category === 'slack' ? <MessageSquare size={18} className="text-indigo-400" /> : category === 'reddit' ? <Globe size={18} className="text-orange-400" /> : <Globe size={18} className="text-zinc-400" />,
              accountId: null, actionType: category, date: '-'
            }))
          ];

          const filteredChannels = channelsList.filter((ch) => {
            const matchesTab = channelTab === 'todos' || ch.category === channelTab;
            const matchesPlatform = filterPlatform === 'todos' || ch.category === filterPlatform;
            const matchesStatus = channelFilterStatus === 'todos' || (channelFilterStatus === 'conectado' ? ch.isActive : !ch.isActive);
            const matchesSearch = !searchChannel ||
              ch.name.toLowerCase().includes(searchChannel.toLowerCase()) ||
              ch.identifier.toLowerCase().includes(searchChannel.toLowerCase()) ||
              ch.platformLabel.toLowerCase().includes(searchChannel.toLowerCase()) ||
              ch.id.toLowerCase().includes(searchChannel.toLowerCase());
            return matchesTab && matchesPlatform && matchesStatus && matchesSearch;
          });

          const activeCount = channelsList.filter((c) => c.isActive).length;

          return (
            <div className="space-y-6">
              {/* Header al estilo de la Imagen 2 */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="text-[11px] font-medium text-zinc-500 mb-1">Workspace / Canales</div>
                  <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight">Canales</h1>
                  <p className="text-xs text-zinc-400 mt-0.5">Todos tus canales de WhatsApp, Instagram, TikTok y Messenger con su estado de sincronización.</p>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowConnectModal(true)}
                    className="bg-[#10b981] hover:bg-[#059669] text-zinc-950 font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 text-xs transition shadow-sm cursor-pointer"
                  >
                    <Plus size={16} /> Conectar canal
                  </button>
                </div>
              </div>

              {/* Barra de Búsqueda y Filtros al estilo de la Imagen 2 */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4 pointer-events-none" />
                  <input
                    type="text"
                    value={searchChannel}
                    onChange={(e) => setSearchChannel(e.target.value)}
                    placeholder="Buscar canal, cuenta o identificador..."
                    className="w-full bg-[#0f131a] border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-700"
                  />
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={filterPlatform}
                    onChange={(e) => setFilterPlatform(e.target.value)}
                    className="bg-[#0f131a] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none cursor-pointer"
                  >
                    <option value="todos">Tipo: todos</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="instagram">Instagram</option>
                    <option value="tiktok">TikTok</option>
                    <option value="facebook">Facebook</option>
                  </select>

                  <select
                    value={channelFilterStatus}
                    onChange={(e) => setChannelFilterStatus(e.target.value)}
                    className="bg-[#0f131a] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none cursor-pointer"
                  >
                    <option value="todos">Estado: todos</option>
                    <option value="conectado">Conectado</option>
                    <option value="disponible">Disponible</option>
                  </select>
                </div>
              </div>

              {/* Categorías de Filtro con Acénto Activo al estilo de la Imagen 2 */}
              <div className="flex items-center gap-6 border-b border-zinc-800/80 text-xs overflow-x-auto pb-0">
                {[
                  { id: 'todos', label: 'Todos' },
                  { id: 'whatsapp', label: 'WhatsApp' },
                  { id: 'instagram', label: 'Instagram' },
                  { id: 'tiktok', label: 'TikTok' },
                  { id: 'facebook', label: 'Facebook' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setChannelTab(tab.id as any)}
                    className={`pb-3 font-medium transition-colors relative whitespace-nowrap cursor-pointer ${
                      channelTab === tab.id ? 'text-emerald-400' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {tab.label}
                    {channelTab === tab.id && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full" />
                    )}
                  </button>
                ))}
              </div>

              {/* 8 Tarjetas de Estado al estilo de la Imagen 2 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                <div className="bg-[#0f131a] border border-zinc-800/80 rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-zinc-400 font-medium block mb-1">Canales activos</span>
                    <span className="text-2xl font-bold text-white tracking-tight">{activeCount}</span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400">
                    <CheckCircle size={18} />
                  </div>
                </div>

                <div className="bg-[#0f131a] border border-zinc-800/80 rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-zinc-400 font-medium block mb-1">WhatsApp Oficial</span>
                    <span className="text-2xl font-bold text-white tracking-tight">{isWaOfficialActive ? 1 : 0}</span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400">
                    <MessageCircle size={18} />
                  </div>
                </div>

                <div className="bg-[#0f131a] border border-zinc-800/80 rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-zinc-400 font-medium block mb-1">Instagram Direct</span>
                    <span className="text-2xl font-bold text-white tracking-tight">{isIgActive ? 1 : 0}</span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-blue-400">
                    <Instagram size={18} />
                  </div>
                </div>

                <div className="bg-[#0f131a] border border-zinc-800/80 rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-zinc-400 font-medium block mb-1">TikTok Messaging</span>
                    <span className="text-2xl font-bold text-white tracking-tight">{isTtActive ? 1 : 0}</span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-cyan-400">
                    <Video size={18} />
                  </div>
                </div>

                <div className="bg-[#0f131a] border border-zinc-800/80 rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-zinc-400 font-medium block mb-1">Facebook Messenger</span>
                    <span className="text-2xl font-bold text-white tracking-tight">{isFbActive ? 1 : 0}</span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-blue-400">
                    <Facebook size={18} />
                  </div>
                </div>

                <div className="bg-[#0f131a] border border-zinc-800/80 rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-zinc-400 font-medium block mb-1">WhatsApp Móvil (QR)</span>
                    <span className="text-2xl font-bold text-white tracking-tight">{isWaQrActive ? 1 : 0}</span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
                    <QrCode size={18} />
                  </div>
                </div>

                <div className="bg-[#0f131a] border border-zinc-800/80 rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-zinc-400 font-medium block mb-1">Mensajes Hoy</span>
                    <span className="text-2xl font-bold text-white tracking-tight">0</span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-amber-400">
                    <Clock size={18} />
                  </div>
                </div>

                <div className="bg-[#0f131a] border border-zinc-800/80 rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-zinc-400 font-medium block mb-1">Canales Disponibles</span>
                    <span className="text-2xl font-bold text-white tracking-tight">5</span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400">
                    <Layers size={18} />
                  </div>
                </div>
              </div>

              {/* Tabla de Canales al estilo de la Imagen 2 */}
              <div className="bg-[#0f131a] border border-zinc-800/80 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-zinc-800/80 text-zinc-400 font-medium text-[11px] bg-zinc-900/40">
                        <th className="px-5 py-3.5">ID</th>
                        <th className="px-5 py-3.5">Canal</th>
                        <th className="px-5 py-3.5">Cuenta / Identificador</th>
                        <th className="px-5 py-3.5">Fecha</th>
                        <th className="px-5 py-3.5">Plataforma</th>
                        <th className="px-5 py-3.5">Tipo</th>
                        <th className="px-5 py-3.5">Estado</th>
                        <th className="px-5 py-3.5 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                      {filteredChannels.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-5 py-12 text-center text-zinc-500 text-xs">
                            No se encontraron canales con los filtros seleccionados.
                          </td>
                        </tr>
                      ) : (
                        filteredChannels.map((channel) => (
                          <tr key={channel.id} className="hover:bg-zinc-900/40 transition-colors">
                            <td className="px-5 py-4 font-mono text-zinc-400 text-[11px]">{channel.id}</td>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                                  {channel.icon}
                                </div>
                                <span className="font-semibold text-white">{channel.name}</span>
                              </div>
                            </td>
                            <td className="px-5 py-4 text-zinc-300 font-mono text-[11px]">
                              {channel.identifier}
                            </td>
                            <td className="px-5 py-4 text-zinc-400 text-[11px]">{channel.date}</td>
                            <td className="px-5 py-4 text-zinc-300">{channel.platformLabel}</td>
                            <td className="px-5 py-4 text-zinc-400 text-[11px]">{channel.type}</td>
                            <td className="px-5 py-4">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                                  channel.isActive
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                    : 'bg-zinc-800/60 text-zinc-400 border-zinc-700/40'
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${channel.isActive ? 'bg-emerald-400' : 'bg-zinc-500'}`}
                                />
                                {channel.status}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-right">
                              {channel.isActive ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (channel.actionType === 'qr') {
                                      setShowQrModal(true);
                                    } else {
                                      handleDisconnectAccount(channel.accountId || '', channel.actionType);
                                    }
                                  }}
                                  className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg text-xs font-medium transition cursor-pointer"
                                >
                                  Desconectar
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (channel.actionType === 'qr') {
                                      setShowQrModal(true);
                                    } else {
                                      handleConnectPlatform(channel.actionType);
                                    }
                                  }}
                                  disabled={isConnectingPlatform === channel.actionType}
                                  className="px-3 py-1.5 bg-[#10b981] hover:bg-[#059669] text-zinc-950 font-bold rounded-lg text-xs transition cursor-pointer shadow-sm inline-flex items-center gap-1 disabled:opacity-50"
                                >
                                  {isConnectingPlatform === channel.actionType ? (
                                    <RefreshCw size={14} className="animate-spin" />
                                  ) : (
                                    <Plus size={14} />
                                  )}
                                  Conectar
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Paginación al estilo de la Imagen 2 */}
                <div className="px-5 py-3.5 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
                  <div>
                    Mostrando <span className="text-white font-medium">1</span> a{' '}
                    <span className="text-white font-medium">{filteredChannels.length}</span> de{' '}
                    <span className="text-white font-medium">{channelsList.length}</span> canales
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled
                      className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-600 cursor-not-allowed text-xs font-medium"
                    >
                      Anterior
                    </button>
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold transition text-xs cursor-pointer shadow-sm"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              </div>

              {/* Modal para Conectar Nuevo Canal */}
              {showConnectModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                  <div className="bg-[#0f131a] border border-zinc-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl">
                    <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-white">Conectar Canal Oficial</h3>
                        <p className="text-xs text-zinc-400 mt-0.5">Selecciona la plataforma que deseas vincular a tu workspace de IA</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowConnectModal(false)}
                        className="p-1.5 rounded-lg bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    <div className="p-5 space-y-3">
                      {/* WhatsApp Cloud API */}
                      <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between gap-4 hover:border-zinc-700 transition">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                            <MessageCircle size={20} />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-white">WhatsApp Business Cloud API</h4>
                            <p className="text-xs text-zinc-400">Meta Oficial sin VPS ni desconexiones</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleConnectPlatform('whatsapp')}
                            disabled={isConnectingPlatform === 'whatsapp'}
                            className="bg-[#10b981] hover:bg-[#059669] text-zinc-950 font-bold px-3.5 py-2 rounded-lg text-xs transition cursor-pointer flex items-center gap-1.5"
                          >
                            {isConnectingPlatform === 'whatsapp' ? <RefreshCw size={14} className="animate-spin" /> : <Facebook size={14} />}
                            Iniciar Sesión Meta
                          </button>
                        </div>
                      </div>

                      {/* Instagram Direct */}
                      <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between gap-4 hover:border-zinc-700 transition">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                            <Instagram size={20} />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-white">Instagram Direct & Business</h4>
                            <p className="text-xs text-zinc-400">Mensajes directos e historias con IA</p>
                            <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-bold">BETA · Follow to DM</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleConnectPlatform('instagram')}
                          disabled={isConnectingPlatform === 'instagram'}
                          className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-3.5 py-2 rounded-lg text-xs transition cursor-pointer flex items-center gap-1.5"
                        >
                          {isConnectingPlatform === 'instagram' ? <RefreshCw size={14} className="animate-spin" /> : <Instagram size={14} />}
                          Conectar Instagram
                        </button>
                      </div>

                      {/* TikTok Messaging */}
                      <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between gap-4 hover:border-zinc-700 transition">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                            <Video size={20} />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-white">TikTok Messaging & Business</h4>
                            <p className="text-xs text-zinc-400">Mensajería y consultas de videos oficiales</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleConnectPlatform('tiktok')}
                          disabled={isConnectingPlatform === 'tiktok'}
                          className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-3.5 py-2 rounded-lg text-xs transition cursor-pointer flex items-center gap-1.5"
                        >
                          {isConnectingPlatform === 'tiktok' ? <RefreshCw size={14} className="animate-spin" /> : <Video size={14} />}
                          Conectar TikTok
                        </button>
                      </div>

                      {/* Facebook Messenger */}
                      <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between gap-4 hover:border-zinc-700 transition">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                            <Facebook size={20} />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-white">Facebook Messenger & Fan Page</h4>
                            <p className="text-xs text-zinc-400">Atención omnicanal en tu página de Facebook</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleConnectPlatform('facebook')}
                          disabled={isConnectingPlatform === 'facebook'}
                          className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-3.5 py-2 rounded-lg text-xs transition cursor-pointer flex items-center gap-1.5"
                        >
                          {isConnectingPlatform === 'facebook' ? <RefreshCw size={14} className="animate-spin" /> : <Facebook size={14} />}
                          Conectar Facebook
                        </button>
                      </div>

                      {/* WhatsApp Business Móvil QR */}
                      <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between gap-4 hover:border-zinc-700 transition">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-zinc-800 text-zinc-300 flex items-center justify-center shrink-0">
                            <QrCode size={20} />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-white">WhatsApp Business App (Móvil)</h4>
                            <p className="text-xs text-zinc-400">Escanear código QR o código de 8 dígitos</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setShowConnectModal(false);
                            setShowQrModal(true);
                          }}
                          className="bg-zinc-800 hover:bg-zinc-700 text-white font-medium px-3.5 py-2 rounded-lg text-xs transition cursor-pointer flex items-center gap-1.5 border border-zinc-700"
                        >
                          <QrCode size={14} />
                          Abrir QR / Código
                        </button>
                      </div>
                    </div>

                    <div className="p-4 bg-zinc-900/40 border-t border-zinc-800 flex items-center justify-between text-xs">
                      <span className="text-zinc-500">¿Tienes tokens y WABA ID propios?</span>
                      <button
                        type="button"
                        onClick={() => {
                          setShowConnectModal(false);
                          setShowHeadlessModal(true);
                        }}
                        className="text-emerald-400 hover:underline font-medium"
                      >
                        Vincular credenciales WABA directamente
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Modal para Escanear QR / Código de Vinculación Móvil */}
              {showQrModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                  <div className="bg-[#0f131a] border border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
                    <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-white">Vincular Dispositivo Móvil</h3>
                        <p className="text-xs text-zinc-400 mt-0.5">Escanea el código QR con tu WhatsApp o usa el código de 8 dígitos</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowQrModal(false)}
                        className="p-1.5 rounded-lg bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    <div className="p-5 space-y-4 text-center">
                      <div className="flex items-center justify-center gap-2 bg-zinc-900/80 p-1.5 rounded-xl border border-zinc-800">
                        <button
                          type="button"
                          onClick={() => setSyncSubMode('qr')}
                          className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                            syncSubMode === 'qr' ? 'bg-emerald-600 text-white' : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          <QrCode size={14} /> Escáner QR
                        </button>
                        <button
                          type="button"
                          onClick={() => setSyncSubMode('pairing_code')}
                          className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                            syncSubMode === 'pairing_code' ? 'bg-emerald-600 text-white' : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          <Smartphone size={14} /> Código de 8 Dígitos
                        </button>
                      </div>

                      {syncSubMode === 'qr' ? (
                        <div className="flex flex-col items-center justify-center py-4">
                          <div className="bg-white p-4 rounded-2xl mb-4 shadow-xl flex flex-col items-center justify-center">
                            {liveQr ? (
                              <img src={liveQr} alt="Código QR de WhatsApp" className="w-52 h-52 object-contain" />
                            ) : (
                              <div className="w-52 h-52 flex flex-col items-center justify-center bg-gray-100 rounded-lg p-4">
                                <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mb-2" />
                                <div className="text-gray-600 text-xs font-bold text-center">Generando Código QR...</div>
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={handleRefreshRealQr}
                            className="text-xs text-emerald-400 hover:underline font-medium inline-flex items-center gap-1.5"
                          >
                            <RefreshCw size={13} />
                            Regenerar Código QR
                          </button>
                        </div>
                      ) : (
                        <div className="py-4 space-y-4 text-left">
                          <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                              Número de Teléfono con Código de País (ej: 573001234567)
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={pairingPhone}
                                onChange={(e) => setPairingPhone(e.target.value)}
                                placeholder="573001234567"
                                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-zinc-700"
                              />
                              <button
                                type="button"
                                onClick={handleGeneratePairingCode}
                                disabled={isGeneratingPairingCode || !pairingPhone.trim()}
                                className="bg-[#10b981] hover:bg-[#059669] text-zinc-950 font-bold px-4 py-2.5 rounded-xl text-xs transition cursor-pointer disabled:opacity-50"
                              >
                                {isGeneratingPairingCode ? <RefreshCw size={14} className="animate-spin" /> : 'Solicitar'}
                              </button>
                            </div>
                          </div>

                          {pairingCodeResult && (
                            <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl text-center">
                              <span className="text-[11px] text-zinc-400 block mb-1">Ingresa este código en WhatsApp &gt; Dispositivos vinculados</span>
                              <div className="text-2xl font-mono font-bold tracking-widest text-emerald-400 py-2">
                                {pairingCodeResult.formatted}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

                        {currentViewTab === 'conversaciones' && (
          <div className="flex flex-col h-[calc(100vh-20px)] sm:h-[calc(100vh-14px)] min-h-[640px] bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden panel p-0 relative mt-0">
             {/* Toggle Header */}
             <div className="p-3 border-b border-zinc-800 bg-zinc-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                <div className="flex flex-wrap items-center justify-between gap-3 w-full sm:w-auto">
                   <div className="flex items-center gap-2.5">
                      {onToggleSidebar && (
                        <button
                          type="button"
                          onClick={onToggleSidebar}
                          className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-gold hover:text-amber-300 border border-gold/30 hover:border-gold/60 transition cursor-pointer shrink-0 flex items-center justify-center shadow-sm"
                          title={isSidebarOpen ? "Ocultar menú lateral" : "Mostrar menú lateral"}
                        >
                          {isSidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeft size={16} />}
                        </button>
                      )}
                      <h3 className="font-semibold text-white flex items-center gap-2 text-sm sm:text-base">CRM de Conversaciones</h3>
                   </div>
                   <div className="flex items-center gap-2 shrink-0">
                      {isLiveConnected ? (
                        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-emerald-400 text-xs">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                          <span className="font-mono text-[11px] text-emerald-300">{connectedPhone ? `+${connectedPhone}` : 'Activa'}</span>
                        </div>
                      ) : (
                        <div className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-500 text-[11px]">
                          <span className="h-1.5 w-1.5 rounded-full bg-zinc-600"></span>
                          <span>WhatsApp no conectado</span>
                        </div>
                      )}
                      <div className="flex bg-zinc-900 rounded-lg p-0.5 border border-zinc-800 shrink-0">
                         <button onClick={() => { setViewMode('chat'); setMobileView('list'); }} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${viewMode === 'chat' ? 'bg-zinc-800 text-white font-semibold' : 'text-zinc-400 hover:text-zinc-200'}`}><Smartphone size={13}/> Chat Web</button>
                         <button onClick={() => setViewMode('kanban')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${viewMode === 'kanban' ? 'bg-zinc-800 text-white font-semibold' : 'text-zinc-400 hover:text-zinc-200'}`}><Layout size={13}/> Embudos</button>
                      </div>
                   </div>
                </div>

                {viewMode === 'kanban' && (
                  <div className="flex gap-2 shrink-0">
                     <button
                       type="button"
                       onClick={() => {
                         const name = prompt('Escribe el nombre de la nueva columna (ej: En Negociación):');
                         if (name) {
                           const id = name.toLowerCase().replace(/\s+/g, '_');
                           setKanbanColumns([...kanbanColumns, { id, name, color: '#a1a1aa' }]);
                         }
                       }}
                       className="text-xs bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition font-medium border border-zinc-700"
                     >
                       <Plus size={14} /> Nueva Columna
                     </button>
                     <button className="text-xs bg-zinc-900 hover:bg-zinc-800 text-zinc-300 px-3 py-1.5 rounded-lg flex items-center gap-1 transition border border-zinc-800">
                       <UploadCloud size={14} /> Exportar CSV
                     </button>
                  </div>
                )}
             </div>

              {viewMode === 'chat' ? (
                 <div className="flex flex-1 overflow-hidden relative bg-[#0b141a]">
             <style>{`
               .custom-scrollbar::-webkit-scrollbar { width: 4px; }
               .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
               .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }
             `}</style>

             {/* Sidebar / Chat List */}
             <div className={`w-full md:w-[320px] lg:w-[340px] border-r border-zinc-800 flex-col bg-zinc-950 shrink-0 ${mobileView === 'list' ? 'flex' : 'hidden md:flex'}`}>
               {/* Header */}
               <div className="h-14 bg-zinc-900/90 border-b border-zinc-800 flex items-center justify-between px-3 shrink-0">
                 <div className="flex items-center gap-2">
                   <span className="text-zinc-200 font-semibold text-xs">Chats (IA & Humanos)</span>
                 </div>
                 <div className="flex text-zinc-400 gap-1.5 items-center">
                   <button
                     type="button"
                     onClick={handleSyncRecentChats}
                     disabled={isSyncingChats}
                     title="Sincronizar mensajes recientes desde WhatsApp / VPS"
                     className="cursor-pointer hover:text-white text-xs flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-2.5 py-1 rounded-md border border-zinc-700 transition"
                   >
                     <RefreshCw size={11} className={isSyncingChats ? "animate-spin text-zinc-300" : "text-zinc-400"} />
                     <span>{isSyncingChats ? 'Sincronizando...' : 'Sincronizar'}</span>
                   </button>
                   <button
                     type="button"
                     onClick={handleAddNewRealChat}
                     title="Añadir contacto real para iniciar chat por WhatsApp API"
                     className="cursor-pointer hover:text-white text-xs flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-2.5 py-1 rounded-md border border-zinc-700 transition"
                   >
                     <Plus size={11} className="text-zinc-300" /> Nuevo Chat
                   </button>
                 </div>
               </div>
               {/* Search & Filters */}
               <div className="p-2 border-b border-gray-800 bg-[#111b21] shrink-0">
                  <div className="bg-[#202c33] rounded-lg flex items-center px-3 py-1.5 mb-2">
                    <Search size={16} className="text-[#8696a0] mr-3" />
                    <input
                      type="text"
                      placeholder="Buscar o empezar un nuevo chat..."
                      value={chatSearch}
                      onChange={(e) => setChatSearch(e.target.value)}
                      className="bg-transparent border-none text-sm text-[#d1d7db] w-full focus:outline-none placeholder:text-[#8696a0]"
                    />
                  </div>

                  {/* Filters Bar */}
                  <div className="space-y-2 pt-0.5">
                     {/* Status Tabs */}
                      <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar text-xs">
                         {[
                           { id: 'all', label: 'Todos' },
                           { id: 'unread', label: 'No Leídos' },
                           { id: 'bot', label: 'Bot IA' },
                           { id: 'human', label: 'Humano' },
                           { id: 'complaints', label: 'Quejas' }
                         ].map(tab => (
                           <button
                             key={tab.id}
                             type="button"
                             onClick={() => setChatFilterStatus(tab.id as any)}
                             className={`px-2.5 py-1 rounded-md shrink-0 transition font-medium text-[11px] border ${
                               chatFilterStatus === tab.id
                                 ? 'bg-zinc-800 text-white border-zinc-700 font-semibold'
                                 : 'bg-zinc-900/60 text-zinc-400 border-zinc-800/60 hover:text-white hover:bg-zinc-800'
                             }`}
                           >
                             {tab.label}
                           </button>
                         ))}
                      </div>

                     {/* Dropdowns for Column & Tag filters */}
                     <div className="grid grid-cols-2 gap-1.5 pt-0.5 text-[9px]">
                        <select
                          value={filterTag}
                          onChange={(e) => setFilterTag(e.target.value)}
                          className="bg-[#202c33] border border-gray-800 text-gray-300 rounded px-1.5 py-1 focus:outline-none cursor-pointer"
                        >
                           <option value="all">🏷️ Etiquetas: Todas</option>
                           {Array.from(new Set([
                             ...availableTags.map(t => t.name),
                             ...chats.flatMap(c => c.tags || [])
                           ])).map(tag => (
                             <option key={tag} value={tag}>{tag}</option>
                           ))}
                        </select>

                        <select
                          value={filterColumn}
                          onChange={(e) => setFilterColumn(e.target.value)}
                          className="bg-[#202c33] border border-gray-800 text-gray-300 rounded px-1.5 py-1 focus:outline-none cursor-pointer"
                        >
                           <option value="all">📊 Columnas: Todas</option>
                           {kanbanColumns.map(col => (
                             <option key={col.id} value={col.id}>{col.name}</option>
                           ))}
                        </select>
                     </div>
                  </div>
               </div>
               {/* List */}
               <div className="flex-1 overflow-y-auto custom-scrollbar">
                  {chats
                    .filter(chat => {
                      // 1. Text search filter
                      const matchesSearch = chat.name.toLowerCase().includes(chatSearch.toLowerCase()) ||
                                            chat.msg.toLowerCase().includes(chatSearch.toLowerCase());
                      if (!matchesSearch) return false;

                      // 2. Status filter
                      if (chatFilterStatus === 'unread' && chat.unread === 0) return false;
                      if (chatFilterStatus === 'bot' && !chat.tags.includes('Bot Activo')) return false;
                      if (chatFilterStatus === 'human' && !chat.tags.includes('Handoff (Humano)')) return false;
                      if (chatFilterStatus === 'complaints' && !chat.tags.some(t => t === 'Queja' || t === 'Mala Atención')) return false;

                      // 3. Tag filter
                      if (filterTag !== 'all' && !chat.tags.includes(filterTag)) return false;

                      // 4. Column / CRM stage filter
                      if (filterColumn !== 'all' && chat.columnId !== filterColumn) return false;

                      return true;
                    })
                    .map((chat) => (
                    <div
                      key={chat.id}
                      onClick={() => {
                        setActiveChatId(chat.id);
                        setChats(prev => prev.map(c => c.id === chat.id ? { ...c, unread: 0 } : c));
                        setMobileView('chat');
                      }}
                      className={`flex items-center px-3 py-3 cursor-pointer hover:bg-[#202c33] transition-colors ${chat.id === activeChatId ? 'bg-[#2a3942]' : ''}`}
                    >
                       <div className="mr-3 shrink-0">
                          <ContactAvatar
                            name={chat.name}
                            phone={chat.phone}
                            avatar={chat.avatar}
                            size="w-12 h-12"
                            textSize="text-sm font-black"
                          />
                       </div>
                       <div className="flex-1 min-w-0 border-b border-gray-800 pb-2">
                          <div className="flex justify-between items-center mb-1">
                             <h4 className="text-[#e9edef] text-sm truncate font-medium">{chat.name}</h4>
                             <span className={`text-xs ${chat.unread ? 'text-[#00a884]' : 'text-[#8696a0]'}`}>{formatColombiaTime(chat.time)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                             <p className="text-[#8696a0] text-sm truncate">{chat.msg}</p>
                             {chat.unread > 0 && <span className="bg-[#00a884] text-[#111b21] text-[10px] font-bold px-1.5 py-0.5 rounded-full">{chat.unread}</span>}
                          </div>
                       </div>
                    </div>
                  ))}
               </div>
            </div>

            {/* Chat Area */}
            <div className={`flex-1 flex-col bg-[#0b141a] relative ${mobileView === 'chat' ? 'flex' : 'hidden md:flex'}`}>
               <div className="absolute inset-0 opacity-5 bg-[url('https://static.whatsapp.net/rsrc.php/v3/yO/r/FsWUvqSpTE8.png')] bg-cover bg-center pointer-events-none"></div>

               {/* Header */}
               <div className="h-16 bg-[#202c33] flex items-center justify-between px-4 z-10 shrink-0">
                  <div className="flex items-center gap-2 cursor-pointer min-w-0">
                    {/* Mobile Back Button */}
                    <button
                      type="button"
                      onClick={() => setMobileView('list')}
                      className="md:hidden text-gray-400 hover:text-white mr-1 p-1"
                      title="Volver a la lista de chats"
                    >
                      <ArrowLeft size={20} />
                    </button>

                    <div className="shrink-0">
                       <ContactAvatar
                         name={chats.find(c => c.id === activeChatId)?.name || 'Conversación'}
                         phone={chats.find(c => c.id === activeChatId)?.phone}
                         avatar={chats.find(c => c.id === activeChatId)?.avatar}
                         size="w-10 h-10"
                         textSize="text-xs font-bold"
                       />
                    </div>
                    <div className="truncate">
                      <h3 className="text-[#e9edef] font-medium text-sm truncate">
                        {chats.find(c => c.id === activeChatId)?.name || 'Conversación'}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-0.5 truncate">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0"></span>
                        <span className="text-[#8696a0] text-[10px] font-medium truncate">Asistente IA activo</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex text-[#aebac1] gap-2 md:gap-3 items-center shrink-0">
                    {/* Mobile Toggle to Details Sidebar */}
                    <button
                      type="button"
                      onClick={() => setMobileView('details')}
                      className="lg:hidden text-gray-400 hover:text-white p-1"
                      title="Ver Ficha de Cliente"
                    >
                      <Sparkles size={20} className="text-amber-400" />
                    </button>

                    {/* Button: Trigger AI Response on demand */}
                    {activeChatId && (
                      <button
                        type="button"
                        onClick={handleTriggerAiReply}
                        disabled={isAiGenerating}
                        className="flex items-center gap-1.5 text-xs text-zinc-200 bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg border border-zinc-700 transition cursor-pointer select-none font-semibold shadow-sm disabled:opacity-50"
                        title="Generar y enviar respuesta automática de IA inmediatamente para este cliente"
                      >
                        {isAiGenerating ? (
                          <>
                            <span className="w-3 h-3 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
                            <span className="text-[11px]">IA pensando...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles size={13} className="text-emerald-400" />
                            <span className="text-[11px]">⚡ Responder IA</span>
                          </>
                        )}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleToggleBotForChat}
                      className="hidden sm:flex items-center gap-2 text-xs text-gray-400 bg-black/40 px-3 py-1 rounded-full border border-gray-800 transition cursor-pointer select-none hover:border-gray-700"
                      title={isBotActive ? "Auto-respuesta IA activada para este chat" : "Auto-respuesta IA pausada para este chat"}
                    >
                      <span className="text-[10px]">Auto-Bot IA</span>
                      <div className={`w-6 h-3.5 rounded-full p-0.5 transition-colors duration-200 shrink-0 ${isBotActive ? "bg-green-600" : "bg-gray-800"}`}>
                        <div className={`w-2.5 h-2.5 rounded-full bg-white transition-transform duration-200 transform ${isBotActive ? "translate-x-2.5" : "translate-x-0"}`} />
                      </div>
                    </button>
                    {activeChatId && (
                      <button
                        type="button"
                        onClick={() => handleClearSingleChat(activeChatId)}
                        className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-red-400 bg-zinc-900 hover:bg-zinc-800 px-2.5 py-1 rounded-lg border border-zinc-800 transition cursor-pointer select-none"
                        title="Borrar conversación y reiniciar desde cero"
                      >
                        <Trash2 size={13} />
                        <span className="hidden sm:inline">Reiniciar Chat</span>
                      </button>
                    )}
                    <MoreVertical size={20} className="cursor-pointer hover:text-[#d1d7db]" />
                  </div>
               </div>

               {/* Messages Container */}
               <div className="flex-1 overflow-y-auto p-4 z-10 space-y-3.5 custom-scrollbar">
                  <div className="flex justify-center mb-4 mt-2 items-center gap-2 flex-wrap">
                     <span className="bg-[#182229] text-[#8696a0] text-[11px] px-3 py-1 rounded-lg shadow uppercase font-medium flex items-center gap-1.5 border border-gray-800">
                        <CheckCircle2 size={12} className="text-green-400" />
                        Historial Persistente del Lead • {activeChatMessages.length} Mensajes
                     </span>
                     {activeChatId && (
                       <button
                          type="button"
                          onClick={() => handleClearSingleChat(activeChatId)}
                          className="bg-red-950/50 hover:bg-red-900 text-red-400 hover:text-white text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-red-500/30 transition flex items-center gap-1 shadow cursor-pointer"
                          title="Reiniciar esta conversación desde cero"
                       >
                          <Trash2 size={12} /> Reiniciar desde cero
                       </button>
                     )}
                  </div>

                  {(activeChatMessages.length === 0) && (
                    <div className="flex flex-col items-center justify-center py-12 text-center text-gray-500 space-y-2">
                      <div className="w-12 h-12 rounded-full bg-[#182229] flex items-center justify-center text-gray-400 border border-gray-800 mb-1">
                        <MessageSquare size={22} />
                      </div>
                      <p className="text-xs text-gray-400 font-medium">No hay mensajes previos con este cliente.</p>
                      <p className="text-[11px] text-gray-500">Escribe una respuesta en el campo inferior para iniciar la conversación.</p>
                    </div>
                  )}

                  {activeChatMessages.map((msg, i) => {
                    const rawText = msg.text || '';

                    // Regex to catch embedded audio filename strings or tags like "🤖🔊 [nota_de_voz_1786134202654.ogg]" or "[nota_de_voz_...]"
                    const audioRefMatch = rawText.match(/(?:🤖🔊\s*)?\[?(nota_de_voz_[^\]\s]+\.(?:ogg|mp3|wav|m4a)|nota_de_voz_[^\]\s]+)\]?/i)
                      || rawText.match(/\[(audio:[^\]]+|nota_de_voz[^\]]+)\]/i);

                    // Clean text by stripping out raw audio bracket tags
                    let cleanText = rawText
                      .replace(/(?:🤖🔊\s*)?\[?(nota_de_voz_[^\]\s]+\.(?:ogg|mp3|wav|m4a)|nota_de_voz_[^\]\s]+)\]?/gi, '')
                      .replace(/\[(audio:[^\]]+|nota_de_voz[^\]]+)\]/gi, '')
                      .trim();

                    // If text is just a placeholder like "🎤 [Nota de voz enviada]" or "🎤 Nota de voz enviada", hide it when an audio attachment exists
                    if ((msg.attachment?.type === 'audio' || audioRefMatch) &&
                        (cleanText === '🎤 [Nota de voz enviada]' || cleanText === '🎤 Nota de voz enviada' || cleanText === '[Nota de voz enviada]')) {
                      cleanText = '';
                    }

                    // Determine effective attachment
                    const effectiveAttachment = msg.attachment || (audioRefMatch ? {
                      name: audioRefMatch[1] || 'Nota_de_voz_PTT.ogg',
                      type: 'audio' as const,
                      url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'
                    } : undefined);

                    return (
                      <div
                        key={i}
                        className={`flex ${msg.sender === 'client' ? 'justify-end' : 'justify-start'} mb-1`}
                      >
                         <div
                           className={`text-[#e9edef] text-sm p-3 rounded-xl max-w-[75%] shadow-sm relative pb-6 ${
                             msg.sender === 'client'
                               ? 'bg-zinc-800 border border-zinc-700/60 rounded-tr-none'
                               : msg.sender === 'agent'
                                 ? 'bg-zinc-900 border border-zinc-800 rounded-tl-none'
                                 : 'bg-zinc-900 border border-zinc-800 rounded-tl-none'
                           }`}
                         >
                            {(msg.fromMobile || (msg as any).source === 'mobile') ? (
                              <div className="text-[10px] text-zinc-400 font-medium mb-1 flex items-center gap-1">
                                <Smartphone size={10} /> HUMANO (MÓVIL)
                              </div>
                            ) : msg.sender === 'bot' ? (
                              <div className="text-[10px] text-zinc-400 font-medium mb-1 flex items-center gap-1">
                                <Sparkles size={10} /> ASISTENTE IA
                              </div>
                            ) : msg.sender === 'agent' ? (
                              <div className="text-[10px] text-zinc-400 font-medium mb-1 flex items-center gap-1">
                                <UserCircle size={10} /> HUMANO (CRM)
                              </div>
                            ) : null}

                            {/* Message Attachment Rendering */}
                            {effectiveAttachment && (
                              <div className="mb-2">
                                {(effectiveAttachment.type === 'imagen' || effectiveAttachment.type === 'image') && (
                                  <div className="rounded-xl overflow-hidden border border-white/10 bg-black/60 max-w-sm shadow-lg group">
                                    <div className="relative cursor-pointer overflow-hidden" onClick={() => setSelectedImageLightbox({ url: effectiveAttachment.url, name: effectiveAttachment.name })}>
                                      <img
                                        src={effectiveAttachment.url}
                                        alt={effectiveAttachment.name}
                                        className="w-full h-auto max-h-72 object-cover transition duration-200 group-hover:scale-[1.02]"
                                        referrerPolicy="no-referrer"
                                      />
                                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white font-medium text-xs gap-1.5 backdrop-blur-[2px]">
                                        <Eye size={16} /> Clic para ampliar
                                      </div>
                                    </div>
                                    <div className="bg-[#111b21] px-3 py-2 text-xs text-gray-200 truncate flex items-center justify-between border-t border-gray-800">
                                      <span className="flex items-center gap-1.5 truncate">
                                        <ImageIcon size={13} className="text-blue-400 shrink-0" />
                                        <span className="truncate">{effectiveAttachment.name}</span>
                                      </span>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedImageLightbox({ url: effectiveAttachment.url, name: effectiveAttachment.name });
                                        }}
                                        className="text-xs text-emerald-400 hover:text-emerald-300 font-medium shrink-0 ml-2"
                                      >
                                        Ver HD
                                      </button>
                                    </div>
                                  </div>
                                )}
                                {effectiveAttachment.type === 'video' && (
                                  <div className="rounded-lg overflow-hidden border border-black/20 bg-black max-w-sm">
                                    <video
                                      src={effectiveAttachment.url}
                                      controls
                                      className="w-full max-h-60"
                                    />
                                    <div className="bg-black/30 px-2 py-1.5 text-[11px] text-gray-300 truncate flex items-center gap-1 border-t border-gray-800">
                                      <Video size={12} className="text-blue-400" /> {effectiveAttachment.name}
                                    </div>
                                  </div>
                                )}
                                {effectiveAttachment.type === 'audio' && (
                                  <VoiceNotePlayer
                                    src={effectiveAttachment.url || 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'}
                                    isPtt={true}
                                    title={effectiveAttachment.name || 'Nota de voz PTT'}
                                    sender={msg.sender === 'agent' ? 'agent' : (msg.sender === 'bot' ? 'bot' : 'user')}
                                    className="w-full max-w-sm my-1"
                                  />
                                )}
                                {(effectiveAttachment.type === 'archivo' || effectiveAttachment.type === 'document' || effectiveAttachment.type === 'pdf') && (
                                  <div className="p-3 rounded-lg bg-black/40 border border-gray-800 flex items-center justify-between gap-3 w-64 hover:bg-black/50 transition">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <div className="w-10 h-10 rounded bg-red-500/15 border border-red-500/35 flex items-center justify-center text-red-400 shrink-0">
                                        <FileText size={20} />
                                      </div>
                                      <div className="min-w-0 text-left">
                                        <div className="text-xs font-semibold text-gray-200 truncate">{effectiveAttachment.name}</div>
                                        <div className="text-[10px] text-gray-400 font-mono">{effectiveAttachment.size || '1.2 MB'} • Documento</div>
                                      </div>
                                    </div>
                                    <a
                                      href={effectiveAttachment.url}
                                      download={effectiveAttachment.name}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-gray-400 hover:text-white shrink-0 p-1.5 bg-[#202c33] hover:bg-[#2a3942] rounded-full border border-gray-800 transition"
                                      title="Descargar archivo"
                                    >
                                      <UploadCloud size={14} className="rotate-180" />
                                    </a>
                                  </div>
                                )}
                              </div>
                            )}

                            {cleanText ? (
                              <div className="whitespace-pre-line leading-relaxed text-left">{cleanText}</div>
                            ) : null}
                            <span className="text-[10px] text-[#8696a0] absolute right-3 bottom-1.5 flex items-center gap-1">
                              {formatLocalTime(msg.timestamp || msg.time)}
                              {msg.sender === 'client' && <CheckCircle2 size={12} className="text-[#53bdeb]" />}
                            </span>
                         </div>
                      </div>
                    );
                  })}

                  {isBotTyping && (
                    <div className="flex justify-start mb-2">
                       <div className="bg-[#202c33] text-[#8696a0] text-xs p-3 rounded-xl rounded-tl-none flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                          <span className="ml-1 italic text-[10px]">Cliente o IA escribiendo...</span>
                       </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
               </div>

               {/* Live Audio Recorder Overlay for Chat */}
               {showLiveRecorderInChat && (
                 <div className="p-3 bg-[#111b21] border-t border-emerald-500/30 animate-fade-in">
                   <LiveAudioRecorder
                     onSendVoiceNote={handleSendLiveChatVoiceNote}
                     onCancel={() => setShowLiveRecorderInChat(false)}
                     title="Grabar Nota de Voz PTT para WhatsApp"
                   />
                 </div>
               )}

               {/* Input Area */}
               <form
                 onSubmit={(e) => {
                   e.preventDefault();
                   handleSendMessage();
                 }}
                 className="min-h-[62px] bg-[#202c33] px-4 py-3 flex items-center gap-3 z-10 shrink-0 border-t border-[#2a3942]"
               >
                  {/* Hidden Real File Input */}
                  <input
                    type="file"
                    ref={attachmentInputRef}
                    onChange={handleAttachmentFileChange}
                    className="hidden"
                    accept={attachmentAccept}
                  />

                  <button type="button" className="text-[#aebac1] hover:text-[#d1d7db] transition-colors p-1">
                     <Smile size={24} />
                  </button>
                  <div className="relative group">
                     <button type="button" className="text-[#aebac1] hover:text-[#d1d7db] transition-colors p-1 cursor-pointer">
                        <Paperclip size={24} />
                     </button>
                     {/* Attachment Menu */}
                     <div className="absolute bottom-12 left-0 bg-[#233138] rounded-2xl shadow-xl p-2 hidden group-hover:flex flex-col w-48 border border-[#2a3942] z-50">
                        <div
                          onClick={() => triggerAttachmentUpload('imagen')}
                          className="flex items-center gap-3 p-2 hover:bg-[#111b21] rounded-xl cursor-pointer text-[#d1d7db] transition-colors"
                        >
                           <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white"><ImageIcon size={16}/></div>
                           <span className="text-sm font-medium text-left">Foto / Imagen</span>
                        </div>
                        <div
                          onClick={() => triggerAttachmentUpload('video')}
                          className="flex items-center gap-3 p-2 hover:bg-[#111b21] rounded-xl cursor-pointer text-[#d1d7db] transition-colors"
                        >
                           <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white"><Video size={16}/></div>
                           <span className="text-sm font-medium text-left">Video</span>
                        </div>
                        <div
                          onClick={() => triggerAttachmentUpload('audio')}
                          className="flex items-center gap-3 p-2 hover:bg-[#111b21] rounded-xl cursor-pointer text-[#d1d7db] transition-colors"
                        >
                           <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white"><Headphones size={16}/></div>
                           <span className="text-sm font-medium text-left">Audio / Música</span>
                        </div>
                        <div
                          onClick={() => triggerAttachmentUpload('archivo')}
                          className="flex items-center gap-3 p-2 hover:bg-[#111b21] rounded-xl cursor-pointer text-[#d1d7db] transition-colors"
                        >
                           <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white"><FileText size={16}/></div>
                           <span className="text-sm font-medium text-left">Documento / PDF</span>
                        </div>
                        <div
                          onClick={() => setShowLiveRecorderInChat(true)}
                          className="flex items-center gap-3 p-2 hover:bg-[#111b21] rounded-xl cursor-pointer text-[#d1d7db] transition-colors"
                        >
                           <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white"><Mic size={16}/></div>
                           <span className="text-sm font-medium text-left">Grabar Nota de Voz PTT</span>
                        </div>
                     </div>
                  </div>
                  <input
                     type="text"
                     placeholder="Escribe un mensaje..."
                     value={chatInput}
                     onChange={(e) => setChatInput(e.target.value)}
                     className="flex-1 bg-[#2a3942] text-[#d1d7db] text-sm rounded-lg px-4 py-2.5 focus:outline-none placeholder:text-[#8696a0]"
                  />
                  {chatInput.trim() ? (
                    <button type="submit" className="text-green-500 hover:text-green-400 transition-colors p-1">
                       <Send size={24} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowLiveRecorderInChat(!showLiveRecorderInChat)}
                      className={`transition-colors p-1.5 rounded-full ${showLiveRecorderInChat ? 'text-emerald-400 bg-emerald-950 border border-emerald-500/50' : 'text-[#aebac1] hover:text-[#d1d7db]'}`}
                      title="Grabar nota de voz PTT"
                    >
                       <Mic size={24} />
                    </button>
                  )}
               </form>
            </div>

            {/* Right Sidebar: AI Lead Profile Extractor */}
            <div className={`w-full lg:w-[300px] border-l border-gray-800 bg-[#111] flex-col p-4 shrink-0 overflow-y-auto text-left z-10 custom-scrollbar ${mobileView === 'details' ? 'flex' : 'hidden lg:flex'}`}>
               {/* Mobile Back Button */}
               <button
                 type="button"
                 onClick={() => setMobileView('chat')}
                 className="lg:hidden flex items-center gap-2 text-gray-400 hover:text-white mb-4 text-xs font-bold border border-gray-800 rounded-lg p-2 bg-black/40"
               >
                 <ArrowLeft size={14} /> Volver al Chat
               </button>

               <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 text-gold font-bold text-[10px] uppercase tracking-widest">
                     <Sparkles size={12} className="text-gold" /> Ficha de Cliente IA
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-zinc-400 font-medium">
                     <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                     <span>Auto-guardado CRM</span>
                  </div>
               </div>
               <h4 className="text-white font-bold text-sm mb-1">Datos y Pedido</h4>
               <p className="text-[10px] text-zinc-400 leading-normal mb-4">
                  Detectados automáticamente y sincronizados en tiempo real en la base de datos de Clientes.
               </p>

               <div className="space-y-4 flex-1">
                  <div>
                     <label className="text-[9px] uppercase font-bold text-zinc-400 block mb-1">Nombre Completo</label>
                     <input
                       type="text"
                       value={captureName}
                       onChange={(e) => setCaptureName(e.target.value)}
                       className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/30 transition-all"
                     />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                     <div>
                        <label className="text-[9px] uppercase font-bold text-zinc-400 block mb-1">Ciudad</label>
                        <input
                          type="text"
                          value={captureCity}
                          onChange={(e) => setCaptureCity(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/30 transition-all"
                        />
                     </div>
                     <div>
                        <label className="text-[9px] uppercase font-bold text-zinc-400 block mb-1">Depto</label>
                        <input
                          type="text"
                          value={captureDept}
                          onChange={(e) => setCaptureDept(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/30 transition-all"
                        />
                     </div>
                  </div>

                  <div>
                     <label className="text-[9px] uppercase font-bold text-zinc-400 block mb-1">Producto Interesado</label>
                     <input
                       type="text"
                       value={captureProduct}
                       onChange={(e) => setCaptureProduct(e.target.value)}
                       className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/30 transition-all"
                     />
                  </div>

                  <div>
                     <label className="text-[9px] uppercase font-bold text-zinc-400 block mb-1">Campaña / Anuncio</label>
                     <input
                       type="text"
                       value={captureCampaign}
                       onChange={(e) => setCaptureCampaign(e.target.value)}
                       className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/30 transition-all"
                     />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                     <div>
                        <label className="text-[9px] uppercase font-bold text-zinc-400 block mb-1">Ticket Compra</label>
                        <input
                          type="number"
                          value={captureTicket}
                          onChange={(e) => setCaptureTicket(Number(e.target.value))}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/30 transition-all"
                        />
                     </div>
                     <div className="flex flex-col justify-end pb-1">
                        <div
                          onClick={() => setCaptureIsRecurring(!captureIsRecurring)}
                          className="flex items-center gap-2 cursor-pointer text-[10px] text-zinc-300 select-none"
                        >
                          <div className={`w-6 h-3.5 rounded-full p-0.5 transition-colors duration-200 shrink-0 ${captureIsRecurring ? "bg-gold" : "bg-zinc-800"}`}>
                            <div className={`w-2.5 h-2.5 rounded-full bg-zinc-950 transition-transform duration-200 transform ${captureIsRecurring ? "translate-x-2.5" : "translate-x-0"}`} />
                          </div>
                          Recurrente
                        </div>
                     </div>
                  </div>
               </div>

               {/* Tag Management in Conversation */}
               <div className="mt-5 pt-4 border-t border-gray-800">
                  <div className="flex items-center justify-between mb-2">
                     <span className="text-[10px] uppercase font-bold text-gray-400 block">Etiquetas del Chat</span>
                     <span className="text-[9px] text-green-400 font-mono font-semibold">Conversación</span>
                  </div>

                  {/* Current Tags */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                     {(chats.find(c => c.id === activeChatId)?.tags || []).length === 0 ? (
                       <span className="text-gray-500 text-[11px] italic">Sin etiquetas activas</span>
                     ) : (
                       (chats.find(c => c.id === activeChatId)?.tags || []).map((t, idx) => {
                         const tagObj = availableTags.find(tag => tag.name.toLowerCase() === t.toLowerCase());
                         const bgColor = tagObj ? `${tagObj.color}20` : '#1f2937';
                         const borderColor = tagObj ? `${tagObj.color}45` : '#374151';
                         const textColor = tagObj ? tagObj.color : '#d1d5db';
                         return (
                           <span
                             key={idx}

                             className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                               t === 'Queja' || t === 'Mala Atención'
                                 ? 'font-bold animate-pulse'
                                 : ''
                             }`}
                           >
                             {t}
                             <button
                               type="button"
                               onClick={() => handleRemoveTag(t)}
                               className="hover:text-white opacity-60 hover:opacity-100 font-bold ml-0.5 text-xs focus:outline-none"
                               title="Remover"
                             >
                               ×
                             </button>
                           </span>
                         );
                       })
                     )}
                  </div>

                  {/* Add Tag Inputs */}
                  <div className="flex gap-1.5 mb-3">
                     <input
                       type="text"
                       placeholder="Nueva etiqueta..."
                       value={newTagInput}
                       onChange={(e) => setNewTagInput(e.target.value)}
                       onKeyDown={(e) => {
                         if (e.key === 'Enter') {
                           e.preventDefault();
                           handleAddTag(newTagInput);
                           setNewTagInput('');
                         }
                       }}
                       className="flex-1 bg-black border border-gray-800 rounded-lg px-2 py-1 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-green-500"
                     />
                     <button
                       type="button"
                       onClick={() => {
                         handleAddTag(newTagInput);
                         setNewTagInput('');
                       }}
                       className="bg-green-600 hover:bg-green-500 text-black font-semibold rounded-lg px-2 text-xs transition"
                     >
                       +
                     </button>
                  </div>

                  {/* Dynamic Shortcuts from availableTags */}
                  <div className="space-y-1.5">
                     <div className="flex items-center justify-between mb-1">
                        <label className="text-[9px] uppercase font-bold text-gray-500 block">Accesos Rápidos</label>
                        <button
                          type="button"
                          onClick={() => setShowTagManagerModal(true)}
                          className="text-[10px] text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20 transition-all"
                        >
                          <Settings size={10} /> Gestionar
                        </button>
                     </div>
                     <div className="flex flex-wrap gap-1">
                        {availableTags.map((tagObj) => {
                          const hasTag = (chats.find(c => c.id === activeChatId)?.tags || []).some(t => t.toLowerCase() === tagObj.name.toLowerCase());
                          const bgColor = hasTag ? 'bg-gray-950/70' : 'bg-black';
                          const textColor = hasTag ? 'text-gray-600' : 'text-gray-200';
                          const borderColor = hasTag ? 'border-gray-900' : 'border-gray-850 hover:border-gray-700';

                          return (
                            <button
                              key={tagObj.id}
                              type="button"
                              disabled={hasTag}
                              onClick={() => handleAddTag(tagObj.name)}

                              className={`text-[10px] px-2.5 py-1 rounded-md transition font-medium border ${hasTag ? 'bg-zinc-900 text-zinc-600 border-zinc-900' : 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 border-zinc-700/60'}`}
                            >
                              {tagObj.name}
                            </button>
                          );
                        })}
                     </div>
                  </div>
               </div>

               <div className="mt-6 pt-4 border-t border-zinc-800 space-y-3 shrink-0">
                  {lastGeneratedGuia && (
                    <div className="p-3 bg-zinc-900/90 border border-gold/30 rounded-xl space-y-1.5 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-gold uppercase tracking-wider flex items-center gap-1">
                          <Truck size={12} /> Guía Dropi Activa
                        </span>
                        <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded font-mono font-bold">
                          Generada
                        </span>
                      </div>
                      <div className="flex items-center justify-between font-mono text-xs text-white">
                        <span className="font-bold tracking-wide">{lastGeneratedGuia.trackingCode}</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(lastGeneratedGuia.trackingCode);
                              setGuiaCopied(true);
                              setTimeout(() => setGuiaCopied(false), 2000);
                            }}
                            className="text-zinc-400 hover:text-white p-1 rounded hover:bg-zinc-800 transition cursor-pointer"
                            title="Copiar guía"
                          >
                            {guiaCopied ? <CheckCircle size={12} className="text-emerald-400" /> : <Copy size={12} />}
                          </button>
                          <button
                            type="button"
                            onClick={handleSendGuiaToChat}
                            className="text-gold hover:text-gold-light text-[10px] font-semibold px-2 py-0.5 rounded bg-gold/10 hover:bg-gold/20 transition cursor-pointer"
                            title="Enviar rastreo por WhatsApp"
                          >
                            Enviar al chat
                          </button>
                        </div>
                      </div>
                      <p className="text-[10px] text-zinc-400">
                        {lastGeneratedGuia.carrier} • Contra Entrega • ${(lastGeneratedGuia.total || captureTicket).toLocaleString()} COP
                      </p>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleGenerarGuia}
                    className="w-full bg-gold hover:bg-gold-light text-black text-xs font-bold py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-gold/10 active:scale-[0.99] cursor-pointer"
                  >
                     <Truck size={15} /> Generar Guía
                  </button>
                  <p className="text-[10px] text-zinc-500 text-center leading-tight">
                    Genera la orden contra entrega con número de rastreo Dropi. El cliente se guarda y sincroniza automáticamente.
                  </p>
               </div>
             </div>
          </div>
       ) : viewMode === 'kanban' ? (
                <div className="flex-1 flex flex-col bg-[#0d0d0d] overflow-hidden">
                  {/* Custom Funnels & Pipelines Navigation Bar */}
                  <div className="bg-[#141414] border-b border-gray-800 p-3 flex flex-wrap items-center justify-between gap-3 z-20 shrink-0">
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar max-w-full shrink-0">
                      <span className="text-[10px] uppercase font-bold text-gray-500 font-mono tracking-wider mr-2 shrink-0">Canal / Embudo:</span>
                      {pipelines.map((pip) => (
                        <div key={pip.id} className="flex items-center shrink-0">
                          <button
                            type="button"
                            onClick={() => setActivePipelineId(pip.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 border ${
                              activePipelineId === pip.id
                                ? 'bg-blue-600/20 text-blue-400 border-blue-500/40 font-bold shadow-md'
                                : 'bg-black text-gray-400 border-gray-850 hover:text-white hover:border-gray-700'
                            }`}
                          >
                            {pip.isNestComplaints ? '⚠️ ' : pip.isNestLogistics ? '📦 ' : '🎯 '}
                            {pip.name}
                            {pip.isNestComplaints && (
                              <span className="bg-red-500/20 text-red-400 text-[9px] px-1.5 py-0.2 rounded-full border border-red-500/30 animate-pulse">Anidación</span>
                            )}
                            {pip.isNestLogistics && (
                              <span className="bg-blue-500/20 text-blue-400 text-[9px] px-1.5 py-0.2 rounded-full border border-blue-500/30 animate-pulse">Logística</span>
                            )}
                          </button>
                          {/* Only allow deleting custom pipelines */}
                          {pip.id !== 'ventas' && pip.id !== 'envios' && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`¿Deseas eliminar por completo el embudo "${pip.name}"? Sus columnas y chats asociados se reubicarán.`)) {
                                  setPipelines(prev => prev.filter(p => p.id !== pip.id));
                                  setKanbanColumns(prev => prev.filter(c => c.pipelineId !== pip.id));
                                  setActivePipelineId('ventas');
                                }
                              }}
                              className="text-gray-600 hover:text-red-500 font-bold ml-1 text-xs px-1 transition"
                              title="Eliminar este embudo"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ))}

                      {/* Button to Trigger Create Pipeline Modal */}
                      <button
                        type="button"
                        onClick={() => setShowNewPipelineModal(true)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-950/40 hover:bg-green-900/45 text-green-400 border border-green-500/30 transition flex items-center gap-1 shrink-0"
                      >
                        <Plus size={13} /> Nuevo Embudo
                      </button>

                      {/* Button to Trigger Edit Active Pipeline Modal */}
                      <button
                        type="button"
                        onClick={() => setShowEditPipelineModal(true)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-950/40 hover:bg-blue-900/45 text-blue-400 border border-blue-500/30 transition flex items-center gap-1 shrink-0"
                        title="Editar nombre o propiedades del embudo activo"
                      >
                        <Edit3 size={13} /> Editar Embudo
                      </button>
                    </div>

                    {/* Right Action buttons */}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const name = prompt('Escribe el nombre de la nueva columna para este embudo (ej: En Negociación):');
                          if (name) {
                            const id = name.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now();
                            setKanbanColumns([...kanbanColumns, { id, name, color: '#a855f7', pipelineId: activePipelineId }]);
                          }
                        }}
                        className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition font-bold shadow-md"
                      >
                        <Plus size={14} /> Nueva Columna
                      </button>
                    </div>
                  </div>

                  {/* Active Nesting Alerts Banner */}
                  {pipelines.find(p => p.id === activePipelineId)?.isNestComplaints && (
                    <div className="bg-gradient-to-r from-red-950/40 via-black to-red-950/20 border-b border-red-900/30 px-4 py-2 flex items-center justify-between text-left shrink-0">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-5 h-5 rounded bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 animate-pulse">
                          <AlertTriangle size={12} />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-gray-200">Casilla de Anidación Inteligente Activa</div>
                          <div className="text-[10px] text-gray-400">Este Canva captura y agrupa automáticamente a todos los clientes que expresaron quejas, mala atención o reclamos en WhatsApp.</div>
                        </div>
                      </div>
                      <span className="text-[9px] bg-red-500/10 text-red-300 font-mono px-2 py-0.5 rounded border border-red-500/20 shrink-0 font-bold">Nivel 1 Filtro Automático</span>
                    </div>
                  )}

                  {pipelines.find(p => p.id === activePipelineId)?.isNestLogistics && (
                    <div className="bg-gradient-to-r from-blue-950/40 via-black to-blue-950/20 border-b border-blue-900/30 px-4 py-2 flex items-center justify-between text-left shrink-0">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-5 h-5 rounded bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 animate-pulse">
                          <Package size={12} />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-gray-200">Seguimiento de Estados Logísticos Activo</div>
                          <div className="text-[10px] text-gray-400">Este Canva captura y enruta automáticamente según el estado del pedido detectado por la IA (Pendiente, En Ruta, Entregado, Novedades).</div>
                        </div>
                      </div>
                      <span className="text-[9px] bg-blue-500/10 text-blue-300 font-mono px-2 py-0.5 rounded border border-blue-500/20 shrink-0 font-bold">Ruta Logística IA</span>
                    </div>
                  )}

                  {/* Custom Funnel Builder / Creation Overlay Modal */}
                  {showNewPipelineModal && (
                    <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                      <div className="bg-[#181818] border border-gray-800 rounded-2xl w-full max-w-md p-6 text-left shadow-2xl relative">
                        <button
                          type="button"
                          onClick={() => setShowNewPipelineModal(false)}
                          className="absolute top-4 right-4 text-gray-500 hover:text-white font-bold text-lg"
                        >
                          ×
                         </button>
                        <h3 className="text-white font-bold text-base mb-1 flex items-center gap-2">🎯 Crear Nuevo Embudo Kanban</h3>
                        <p className="text-xs text-gray-400 mb-5">Personaliza tu CRM creando un nuevo embudo de ventas o atención con su propia lógica de embudo.</p>

                        <div className="space-y-4 mb-6">
                          <div>
                            <label className="text-xs text-gray-300 font-semibold block mb-1.5">Nombre del Embudo / Canva</label>
                            <input
                              type="text"
                              placeholder="Ej: Embudo VIP, Reclamos Mayoristas, etc..."
                              value={newPipelineName}
                              onChange={(e) => setNewPipelineName(e.target.value)}
                              className="w-full bg-black border border-gray-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-blue-500 placeholder:text-gray-600"
                            />
                          </div>

                          <div className="space-y-4">
                            <div>
                                <label className="text-xs text-gray-300 font-semibold block mb-1.5">Instrucciones de la IA</label>
                                <textarea
                                  value={newPipelineInstructions}
                                  onChange={(e) => setNewPipelineInstructions(e.target.value)}
                                  placeholder="Qué debe pasar para que pase en este embudo..."
                                  className="w-full bg-black border border-gray-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-blue-500 h-24"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-300 font-semibold block mb-1.5">Columnas y Automatización</label>
                                <textarea
                                  value={newPipelineAutomation}
                                  onChange={(e) => setNewPipelineAutomation(e.target.value)}
                                  placeholder="Define las columnas y sus reglas..."
                                  className="w-full bg-black border border-gray-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-blue-500 h-32"
                                />
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2 justify-end">
                          <button
                            type="button"
                            onClick={() => setShowNewPipelineModal(false)}
                            className="px-4 py-2 rounded-lg text-xs font-semibold text-gray-400 hover:text-white hover:bg-gray-900 transition"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const trimmed = newPipelineName.trim();
                              if (!trimmed) return;
                              const id = trimmed.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now();

                              const newPip = {
                                id,
                                name: trimmed,
                                isNestComplaints: newPipelineNest,
                                isNestLogistics: newPipelineLogistics
                              };

                              setPipelines(prev => [...prev, newPip]);

                              if (newPipelineLogistics) {
                                setKanbanColumns(prev => [
                                  ...prev,
                                  { id: id + '_pendiente', name: 'Por Despachar', color: '#3b82f6', pipelineId: id },
                                  { id: id + '_en_ruta', name: 'En Ruta / Tránsito', color: '#f59e0b', pipelineId: id },
                                  { id: id + '_entregado', name: 'Entregado', color: '#10b981', pipelineId: id },
                                  { id: id + '_novedad', name: 'Novedad / Devolución', color: '#ef4444', pipelineId: id }
                                ]);
                              } else {
                                const col1Id = id + '_abiertos';
                                const col2Id = id + '_atendidos';
                                setKanbanColumns(prev => [
                                  ...prev,
                                  { id: col1Id, name: 'Por Resolver / Nuevos', color: newPipelineNest ? '#ef4444' : '#3b82f6', pipelineId: id },
                                  { id: col2Id, name: 'Completado / Listo', color: '#10b981', pipelineId: id }
                                ]);
                              }

                              setActivePipelineId(id);
                              setNewPipelineName('');
                              setNewPipelineNest(false);
                              setNewPipelineLogistics(false);
                              setShowNewPipelineModal(false);
                            }}
                            disabled={!newPipelineName.trim()}
                            className="px-4 py-2 rounded-lg text-xs font-bold bg-green-600 hover:bg-green-500 text-black font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            Crear Embudo Activo
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tag Manager Overlay Modal */}
                  {showTagManagerModal && (
                    <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                      <div className="bg-[#181818] border border-gray-800 rounded-2xl w-full max-w-md p-6 text-left shadow-2xl relative flex flex-col max-h-[85%]">
                        <button
                          type="button"
                          onClick={() => setShowTagManagerModal(false)}
                          className="absolute top-4 right-4 text-gray-500 hover:text-white font-bold text-lg"
                        >
                          ×
                        </button>
                        <h3 className="text-white font-bold text-base mb-1 flex items-center gap-2">🏷️ Administrar Etiquetas</h3>
                        <p className="text-xs text-gray-400 mb-4">Crea, edita o elimina las etiquetas globales del sistema.</p>

                        {/* Form to create tag */}
                        <div className="bg-black/40 p-3 rounded-xl border border-gray-850 mb-4 shrink-0">
                          <span className="text-[10px] uppercase font-bold text-blue-400 block mb-2">Nueva Etiqueta</span>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              id="new-tag-name-input"
                              placeholder="Nombre de la etiqueta..."
                              className="flex-1 bg-black border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const el = document.getElementById('new-tag-name-input') as HTMLInputElement;
                                  const colorEl = document.getElementById('new-tag-color-input') as HTMLInputElement;
                                  if (el && el.value.trim()) {
                                    handleCreateTag(el.value, colorEl ? colorEl.value : '#3b82f6');
                                    el.value = '';
                                  }
                                }
                              }}
                            />
                            <input
                              type="color"
                              id="new-tag-color-input"
                              defaultValue="#3b82f6"
                              className="w-8 h-8 rounded border-none cursor-pointer p-0 bg-transparent shrink-0"
                              title="Color de la etiqueta"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const el = document.getElementById('new-tag-name-input') as HTMLInputElement;
                                const colorEl = document.getElementById('new-tag-color-input') as HTMLInputElement;
                                if (el && el.value.trim()) {
                                  handleCreateTag(el.value, colorEl ? colorEl.value : '#3b82f6');
                                  el.value = '';
                                }
                              }}
                              className="bg-green-600 hover:bg-green-500 text-black font-bold px-3 text-xs rounded-lg transition"
                            >
                              Crear
                            </button>
                          </div>
                        </div>

                        {/* Tag List with Scroll */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1 mb-4">
                          {availableTags.map((tag) => (
                            <div key={tag.id} className="flex items-center justify-between p-2 bg-black/20 rounded-lg border border-gray-850/60 hover:border-gray-800 transition">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <input
                                  type="color"
                                  value={tag.color}
                                  onChange={(e) => handleEditTag(tag.id, tag.name, e.target.value)}
                                  className="w-5 h-5 rounded border-none cursor-pointer p-0 bg-transparent shrink-0"
                                  title="Cambiar color"
                                />
                                <input
                                  type="text"
                                  value={tag.name}
                                  onChange={(e) => handleEditTag(tag.id, e.target.value, tag.color)}
                                  className="bg-transparent border-none text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-1.5 py-0.5 flex-1 min-w-0 font-medium"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDeleteTag(tag.id)}
                                className="text-gray-500 hover:text-red-400 p-1 hover:scale-110 transition ml-2 shrink-0"
                                title="Eliminar etiqueta"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          ))}
                        </div>

                        <div className="flex justify-end pt-2 border-t border-gray-800 shrink-0">
                          <button
                            type="button"
                            onClick={() => setShowTagManagerModal(false)}
                            className="px-4 py-2 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition shadow-md"
                          >
                            Listo
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Edit Pipeline Overlay Modal */}
                  {showEditPipelineModal && (
                    <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                      <div className="bg-[#181818] border border-gray-800 rounded-2xl w-full max-w-md p-6 text-left shadow-2xl relative">
                        <button
                          type="button"
                          onClick={() => setShowEditPipelineModal(false)}
                          className="absolute top-4 right-4 text-gray-500 hover:text-white font-bold text-lg"
                        >
                          ×
                        </button>
                        <h3 className="text-white font-bold text-base mb-1 flex items-center gap-2">⚙️ Editar Embudo Activo</h3>
                        <p className="text-xs text-gray-400 mb-5">Modifica los detalles, nombre o configuración del embudo seleccionado.</p>

                        {(() => {
                          const activePip = pipelines.find(p => p.id === activePipelineId);
                          if (!activePip) return <p className="text-xs text-red-400">Embudo no encontrado.</p>;

                          return (
                            <div className="space-y-4 mb-6">
                              <div>
                                <label className="text-xs text-gray-300 font-semibold block mb-1.5">Nombre del Embudo / Canva</label>

                                  <input type="text"
                                  value={activePip.name}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setPipelines(prev => prev.map(p => p.id === activePipelineId ? { ...p, name: val } : p));
                                  }}
                                  className="w-full bg-black border border-gray-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                                />
                              </div>

                              <div className="space-y-4">
                                <div>
                                    <label className="text-xs text-gray-300 font-semibold block mb-1.5">Instrucciones de la IA</label>
                                    <textarea
                                      value={activePip.instructions || ''}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setPipelines(prev => prev.map(p => p.id === activePipelineId ? { ...p, instructions: val } : p));
                                      }}
                                      placeholder="Qué debe pasar para que pase en este embudo..."
                                      className="w-full bg-black border border-gray-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-blue-500 h-24"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-300 font-semibold block mb-1.5">Columnas y Automatización</label>
                                    <textarea
                                      value={activePip.automation || ''}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setPipelines(prev => prev.map(p => p.id === activePipelineId ? { ...p, automation: val } : p));
                                      }}
                                      placeholder="Define las columnas y sus reglas..."
                                      className="w-full bg-black border border-gray-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-blue-500 h-32"
                                    />
                                </div>
                              </div>
{/* Danger Zone */}
                              {activePipelineId !== 'ventas' && activePipelineId !== 'envios' && (
                                <div className="pt-3 border-t border-red-950/40">
                                  <label className="text-[10px] uppercase font-bold text-red-500 block mb-1.5">Zona de Peligro</label>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (confirm(`¿Deseas eliminar por completo el embudo "${activePip.name}"? Sus columnas y chats asociados se reubicarán.`)) {
                                        setPipelines(prev => prev.filter(p => p.id !== activePipelineId));
                                        setKanbanColumns(prev => prev.filter(c => c.pipelineId !== activePipelineId));
                                        setActivePipelineId('ventas');
                                        setShowEditPipelineModal(false);
                                      }
                                    }}
                                    className="w-full bg-red-950/30 hover:bg-red-950/65 text-red-400 border border-red-500/20 text-xs font-semibold py-2 rounded-lg transition flex items-center justify-center gap-1.5"
                                  >
                                    <Trash2 size={13} /> Eliminar Embudo por Completo
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        <div className="flex justify-end gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => setShowEditPipelineModal(false)}
                            className="px-4 py-2 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition shadow-md"
                          >
                            Guardar y Cerrar
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Columns Stage Render */}
                  <div className="flex-1 flex overflow-x-auto p-4 gap-4 pb-8 items-start bg-[#0d0d0d] custom-scrollbar snap-x scroll-smooth animate-fadeIn">
                    {kanbanColumns
                      .filter(col => col.pipelineId === activePipelineId || (!col.pipelineId && activePipelineId === 'ventas'))
                      .map((col) => {
                        const isComplaintsNest = pipelines.find(p => p.id === activePipelineId)?.isNestComplaints;

                        const isLogisticsNest = pipelines.find(p => p.id === activePipelineId)?.isNestLogistics;

                        // Get chats for this column with nesting filters applied!
                        const colChats = chats.filter(c => {
                          const hasActiveComplaint = c.tags.includes('Queja') || c.tags.includes('Mala Atención');
                          const hasActiveLogistic = c.tags.some(t => ['Logística', 'Despachado', 'Entregado', 'Novedad', 'Envío'].includes(t)) ||
                                                     (c.msg && /guía|despacho|envío|entrega|retraso|paquete|transportadora/i.test(c.msg));

                          if (isComplaintsNest) {
                            // If this is the main complaints column (e.g. 'quejas_abiertas'),
                            // it nests both chats assigned here AND any chat marked with Queja/Mala Atención tags!
                            if (col.id === 'quejas_abiertas' || col.id.endsWith('_abiertos')) {
                              return c.columnId === col.id || hasActiveComplaint;
                            }
                            return c.columnId === col.id;
                          } else if (isLogisticsNest) {
                            // If this is a logistics funnel, let's map chats into their respective logistic columns based on keywords or tags!
                            if (col.id === 'log_pendiente' || col.id.endsWith('_pendiente')) {
                              // Por Despachar
                              return c.columnId === col.id || (hasActiveLogistic && !c.tags.includes('Despachado') && !c.tags.includes('Entregado') && !c.tags.includes('Novedad') && !/entregado|ruta|tránsito/i.test(c.msg || ''));
                            }
                            if (col.id === 'log_en_ruta' || col.id.endsWith('_en_ruta')) {
                              // En ruta/tránsito
                              return c.columnId === col.id || (hasActiveLogistic && (c.tags.includes('Despachado') || c.tags.includes('Envío') || /despachado|ruta|tránsito|guía/i.test(c.msg || '')) && !c.tags.includes('Entregado') && !c.tags.includes('Novedad'));
                            }
                            if (col.id === 'log_entregado' || col.id.endsWith('_entregado')) {
                              // Entregado
                              return c.columnId === col.id || (hasActiveLogistic && (c.tags.includes('Entregado') || /entregado|recibido/i.test(c.msg || '')));
                            }
                            if (col.id === 'log_novedad' || col.id.endsWith('_novedad')) {
                              // Novedades o devoluciones
                              return c.columnId === col.id || (hasActiveLogistic && (c.tags.includes('Novedad') || /retraso|devolución|fallo|dañado/i.test(c.msg || '')));
                            }
                            return c.columnId === col.id;
                          } else {
                            // Regular Sales Funnel hides active complaints/logistics to prevent clutter,
                            // routing them directly to their specific pipelines!
                            if (hasActiveComplaint && activePipelineId === 'ventas') {
                              return false; // Auto-routed away from Sales to Complaints pipeline!
                            }
                            if (hasActiveLogistic && activePipelineId === 'ventas') {
                              return false; // Auto-routed away from Sales to Logistics pipeline!
                            }
                            return c.columnId === col.id;
                          }
                        });

                        return (
                          <div key={col.id} className="bg-[#161616] border border-gray-800 rounded-xl w-80 shrink-0 flex flex-col max-h-full snap-center shadow-lg">
                            <div className="p-3 border-b border-gray-800 flex items-center justify-between sticky top-0 bg-[#161616] rounded-t-xl z-10">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: col.color }}></span>
                                <input
                                  type="text"
                                  value={col.name}
                                  onChange={(e) => {
                                    setKanbanColumns(prev => prev.map(c => c.id === col.id ? { ...c, name: e.target.value } : c));
                                  }}
                                  className="bg-transparent border-none text-sm font-semibold text-white focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-1 w-40 truncate"
                                  title="Editar nombre de columna"
                                />
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0 ml-1">
                                <input
                                  type="color"
                                  value={col.color}
                                  onChange={(e) => {
                                    setKanbanColumns(prev => prev.map(c => c.id === col.id ? { ...c, color: e.target.value } : c));
                                  }}
                                  className="w-4 h-4 rounded-full border-none cursor-pointer p-0 bg-transparent shrink-0"
                                  title="Cambiar color de columna"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (confirm(`¿Estás seguro de que deseas eliminar la columna "${col.name}"? Los chats correspondientes volverán a Leads Nuevos.`)) {
                                      setChats(prev => prev.map(c => c.columnId === col.id ? { ...c, columnId: 'leads_nuevos' } : c));
                                      setKanbanColumns(prev => prev.filter(c => c.id !== col.id));
                                    }
                                  }}
                                  className="text-gray-500 hover:text-red-400 text-xs px-1 hover:scale-110 transition font-bold"
                                  title="Eliminar columna"
                                >
                                  &times;
                                </button>
                                <span className="bg-gray-800 text-gray-400 text-[10px] px-2 py-0.5 rounded-full font-bold font-mono">{colChats.length}</span>
                              </div>
                            </div>

                            <div className="p-3 space-y-3 overflow-y-auto flex-1 custom-scrollbar min-h-[350px]">
                              {colChats.map((lead) => {
                                const hasComplaint = lead.tags.includes('Queja') || lead.tags.includes('Mala Atención');
                                return (
                                  <div
                                    key={lead.id}
                                    className={`p-3 rounded-lg hover:border-gray-500 transition group relative border ${
                                      hasComplaint
                                        ? 'bg-red-950/25 border-red-900/40 hover:bg-red-950/35'
                                        : 'bg-[#1f1f1f] border-gray-700/50'
                                    }`}
                                  >
                                     <div className="flex items-start justify-between mb-1 gap-1">
                                        <span className="text-xs font-bold text-gray-200 flex items-center gap-1 truncate max-w-[170px]">
                                          <UserCircle size={14} className={hasComplaint ? "text-red-400 shrink-0" : "text-gray-400 shrink-0"} />
                                          {lead.name}
                                        </span>
                                        <span className="text-[9px] text-gray-500 font-mono shrink-0">{lead.time}</span>
                                     </div>
                                     <p className="text-xs text-gray-400 mb-3 truncate font-medium text-left" title={lead.msg}>{lead.msg}</p>

                                     {lead.tags && lead.tags.length > 0 && (
                                       <div className="flex flex-wrap gap-1 mb-3">
                                         {lead.tags.map((tag, tIdx) => (
                                           <span
                                             key={tIdx}
                                             className={`text-[9px] px-1.5 py-0.5 rounded font-medium border ${
                                               tag === 'Queja' || tag === 'Mala Atención'
                                                 ? 'bg-red-500/10 text-red-300 border-red-500/20 animate-pulse'
                                                 : 'bg-blue-500/10 text-blue-300 border-blue-500/20'
                                             }`}
                                           >
                                             {tag}
                                           </span>
                                         ))}
                                       </div>
                                     )}

                                     <div className="flex items-center justify-between gap-2 border-t border-gray-850 pt-2.5 mt-2">
                                        <select
                                          value={lead.columnId || 'leads_nuevos'}
                                          onChange={(e) => {
                                            setChats(prev => prev.map(c => c.id === lead.id ? { ...c, columnId: e.target.value } : c));
                                          }}
                                          className="bg-black/60 border border-gray-800 text-[10px] rounded px-1.5 py-1 text-gray-300 w-32 focus:outline-none focus:border-blue-500 cursor-pointer font-medium text-left"
                                        >
                                          {kanbanColumns.map(colOpt => (
                                            <option key={colOpt.id} value={colOpt.id}>{colOpt.name}</option>
                                          ))}
                                        </select>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setActiveChatId(lead.id);
                                            setViewMode('chat');
                                          }}
                                          className="text-[10px] bg-gray-800 hover:bg-gray-700 hover:text-white text-gray-300 px-2 py-1 rounded transition font-semibold shrink-0"
                                        >
                                          Ver chat
                                        </button>
                                     </div>
                                  </div>
                                );
                              })}
                              {colChats.length === 0 && (
                                <div className="text-center py-10 text-xs text-gray-600 italic">Sin chats en esta etapa</div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col bg-[#0b141a] overflow-y-auto p-4 sm:p-6 space-y-6 text-left custom-scrollbar">
                  {/* Header / Intro */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-5">
                    <div>
                      <h4 className="text-base font-bold text-white flex items-center gap-2">
                        <Users size={18} className="text-green-400" /> Control de Temperatura de Prospectos (CRM Ventas)
                      </h4>
                      <p className="text-xs text-gray-400 mt-1">
                        Sigue de cerca a tus clientes de WhatsApp. Monitorea su temperatura de compra (Frío, Tibio, Caliente) y haz clic para retomar la conversación al instante.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAddLeadModal(true)}
                      className="bg-green-600 hover:bg-green-500 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition self-start sm:self-auto"
                    >
                      <Plus size={15} /> Registrar Lead Manual
                    </button>
                  </div>

                  {/* Metrics Bar */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Card Total */}
                    <div className="bg-[#111b21] border border-gray-800 rounded-2xl p-4 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center text-gray-300">
                        <Users size={20} />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider block">Prospectos Totales</span>
                        <span className="text-xl font-bold text-white block">{chats.length}</span>
                      </div>
                    </div>

                    {/* Card Caliente */}
                    <div className="bg-[#111b21] border border-red-900/20 rounded-2xl p-4 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400 border border-red-500/20">
                        <Sparkles size={20} />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider block">Caliente (🔥)</span>
                        <span className="text-xl font-bold text-red-400 block">
                          {chats.filter(c => c.leadStatus === 'caliente').length}
                          <span className="text-xs text-gray-500 font-normal">
                            {" "}({chats.length > 0 ? Math.round((chats.filter(c => c.leadStatus === 'caliente').length / chats.length) * 100) : 0}%)
                          </span>
                        </span>
                      </div>
                    </div>

                    {/* Card Tibio */}
                    <div className="bg-[#111b21] border border-amber-950/20 rounded-2xl p-4 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/20">
                        <Zap size={20} />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider block">Tibio (⚡)</span>
                        <span className="text-xl font-bold text-amber-400 block">
                          {chats.filter(c => c.leadStatus === 'tibio').length}
                          <span className="text-xs text-gray-500 font-normal">
                            {" "}({chats.length > 0 ? Math.round((chats.filter(c => c.leadStatus === 'tibio').length / chats.length) * 100) : 0}%)
                          </span>
                        </span>
                      </div>
                    </div>

                    {/* Card Frío */}
                    <div className="bg-[#111b21] border border-blue-900/20 rounded-2xl p-4 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
                        <Smile size={20} />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider block">Frío (❄️)</span>
                        <span className="text-xl font-bold text-blue-400 block">
                          {chats.filter(c => c.leadStatus === 'frío').length}
                          <span className="text-xs text-gray-500 font-normal">
                            {" "}({chats.length > 0 ? Math.round((chats.filter(c => c.leadStatus === 'frío').length / chats.length) * 100) : 0}%)
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Filter controls */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#111b21] p-4 rounded-2xl border border-gray-800">
                    <div className="relative flex-1 max-w-md">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                      <input
                        type="text"
                        value={chatSearch}
                        onChange={(e) => setChatSearch(e.target.value)}
                        placeholder="Buscar por nombre, teléfono o mensaje..."
                        className="w-full bg-[#202c33] border border-gray-850 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                      />
                    </div>

                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                      <span className="text-xs text-gray-400 font-semibold shrink-0 mr-1 font-sans">Filtrar:</span>
                      {[
                        { id: 'todos', label: 'Todos' },
                        { id: 'caliente', label: '🔥 Caliente' },
                        { id: 'tibio', label: '⚡ Tibio' },
                        { id: 'frío', label: '❄️ Frío' }
                      ].map(tab => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setLeadFilter(tab.id as any)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border ${
                            leadFilter === tab.id
                              ? 'bg-green-600/10 text-green-400 border-green-500/30 font-bold'
                              : 'bg-black text-gray-400 border-transparent hover:text-white hover:bg-gray-900/50'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Table */}
                  <div className="bg-[#111b21] border border-gray-800 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="border-b border-gray-800 text-gray-400 uppercase font-bold text-[10px] tracking-wider bg-black/40">
                            <th className="p-4">Contacto</th>
                            <th className="p-4">Teléfono</th>
                            <th className="p-4 text-center">Temperatura Lead</th>
                            <th className="p-4">Último Mensaje</th>
                            <th className="p-4">Etiquetas</th>
                            <th className="p-4 text-right">Acción</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-850">
                          {chats
                            .filter(c => {
                              const matchesSearch = c.name.toLowerCase().includes(chatSearch.toLowerCase()) ||
                                                    c.phone.includes(chatSearch) ||
                                                    (c.msg && c.msg.toLowerCase().includes(chatSearch.toLowerCase()));
                              if (leadFilter === 'todos') return matchesSearch;
                              return matchesSearch && (c.leadStatus || 'frío') === leadFilter;
                            })
                            .map((lead) => {
                              return (
                                <tr key={lead.id} className="hover:bg-[#1f2c34]/20 transition-colors">
                                  {/* Name / Contact info */}
                                  <td className="p-4">
                                    <div className="flex items-center gap-3">
                                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-500/10 to-emerald-500/20 border border-green-500/20 flex items-center justify-center text-green-400 font-bold uppercase shrink-0">
                                        {lead.name.substring(0, 2)}
                                      </div>
                                      <div>
                                        <span className="font-semibold text-white block">{lead.name}</span>
                                        <span className="text-[10px] text-gray-500 font-mono block mt-0.5">{lead.time}</span>
                                      </div>
                                    </div>
                                  </td>

                                  {/* Phone */}
                                  <td className="p-4 font-mono text-gray-300">
                                    {lead.phone}
                                  </td>

                                  {/* Temperature Selector */}
                                  <td className="p-4">
                                    <div className="flex justify-center">
                                      <select
                                        value={lead.leadStatus || 'frío'}
                                        onChange={(e) => {
                                          const newStatus = e.target.value as 'frío' | 'tibio' | 'caliente';
                                          setChats(prev => prev.map(c => c.id === lead.id ? { ...c, leadStatus: newStatus } : c));
                                        }}
                                        className={`rounded-lg text-xs px-2.5 py-1 font-bold focus:outline-none cursor-pointer border transition-all ${
                                          lead.leadStatus === 'caliente'
                                            ? 'bg-red-500/10 text-red-400 border-red-500/30'
                                            : lead.leadStatus === 'tibio'
                                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                            : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                                        }`}
                                      >
                                        <option value="caliente" className="bg-[#111] text-red-400 font-bold">🔥 Caliente</option>
                                        <option value="tibio" className="bg-[#111] text-amber-400 font-bold">⚡ Tibio</option>
                                        <option value="frío" className="bg-[#111] text-blue-400 font-bold">❄️ Frío</option>
                                      </select>
                                    </div>
                                  </td>

                                  {/* Last Message */}
                                  <td className="p-4 max-w-xs">
                                    <p className="text-gray-400 truncate italic" title={lead.msg}>
                                      "{lead.msg}"
                                    </p>
                                  </td>

                                  {/* Tags */}
                                  <td className="p-4">
                                    <div className="flex flex-wrap gap-1">
                                      {lead.tags && lead.tags.length > 0 ? (
                                        lead.tags.map((tag, tIdx) => {
                                          const isComplaint = tag === 'Queja' || tag === 'Mala Atención';
                                          return (
                                            <span
                                              key={tIdx}
                                              className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold border ${
                                                isComplaint
                                                  ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                                  : 'bg-[#182229] text-gray-300 border-gray-800'
                                              }`}
                                            >
                                              {tag}
                                            </span>
                                          );
                                        })
                                      ) : (
                                        <span className="text-[10px] text-gray-600 italic">Ninguna</span>
                                      )}
                                    </div>
                                  </td>

                                  {/* Actions */}
                                  <td className="p-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveChatId(lead.id);
                                          setViewMode('chat');
                                          setMobileView('chat');
                                        }}
                                        className="px-2.5 py-1.5 rounded-lg bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500 hover:text-white transition-all font-bold flex items-center gap-1 shrink-0"
                                        title="Retomar chat para seguimiento"
                                      >
                                        <MessageSquare size={12} /> Retomar Conversación
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (confirm(`¿Estás seguro de eliminar a ${lead.name} de tus leads?`)) {
                                            setChats(prev => prev.filter(c => c.id !== lead.id));
                                          }
                                        }}
                                        className="p-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all"
                                        title="Eliminar lead"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}

                          {chats.filter(c => {
                            const matchesSearch = c.name.toLowerCase().includes(chatSearch.toLowerCase()) ||
                                                  c.phone.includes(chatSearch) ||
                                                  (c.msg && c.msg.toLowerCase().includes(chatSearch.toLowerCase()));
                            if (leadFilter === 'todos') return matchesSearch;
                            return matchesSearch && (c.leadStatus || 'frío') === leadFilter;
                          }).length === 0 && (
                            <tr>
                              <td colSpan={6} className="text-center p-12 text-gray-500 italic">
                                No se encontraron prospectos con los criterios de búsqueda actuales.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Add Lead Manual Modal Overlay */}
                  {showAddLeadModal && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in">
                      <div className="bg-[#111b21] border border-gray-800 w-full max-w-md rounded-2xl p-6 shadow-2xl relative text-left">
                        <button
                          type="button"
                          onClick={() => setShowAddLeadModal(false)}
                          className="absolute right-4 top-4 text-gray-500 hover:text-white transition"
                        >
                          <X size={18} />
                        </button>

                        <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-2">
                          <Users className="text-green-400" size={16} /> Registrar Prospecto Manual
                        </h3>
                        <p className="text-[11px] text-gray-400 leading-normal mb-4">
                          Ingresa los datos del nuevo lead de WhatsApp para agregarlo al cuadro de mando y priorizar tu seguimiento.
                        </p>

                        <div className="space-y-4">
                          <div>
                            <label className="block text-[11px] text-gray-400 mb-1 font-semibold">Nombre Completo</label>
                            <input
                              type="text"
                              value={newLeadName}
                              onChange={(e) => setNewLeadName(e.target.value)}
                              placeholder="Ej: Laura Sofía Restrepo"
                              className="w-full bg-[#202c33] border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-green-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] text-gray-400 mb-1 font-semibold">Número de Teléfono</label>
                            <input
                              type="text"
                              value={newLeadPhone}
                              onChange={(e) => setNewLeadPhone(e.target.value)}
                              placeholder="Ej: +57 300 987 6543"
                              className="w-full bg-[#202c33] border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-green-500 font-mono"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] text-gray-400 mb-1 font-semibold">Estado de Temperatura inicial</label>
                            <select
                              value={newLeadStatus}
                              onChange={(e) => setNewLeadStatus(e.target.value as any)}
                              className="w-full bg-[#202c33] border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-green-500 font-semibold"
                            >
                              <option value="caliente">🔥 Caliente (Listo para comprar / Muy interesado)</option>
                              <option value="tibio">⚡ Tibio (Tiene dudas / Evaluando precio)</option>
                              <option value="frío">❄️ Frío (Solo pidió info inicial / Sin respuesta)</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] text-gray-400 mb-1 font-semibold">Último Mensaje o Nota</label>
                            <textarea
                              value={newLeadMsg}
                              onChange={(e) => setNewLeadMsg(e.target.value)}
                              placeholder="Ej: Interesada en Smartwatch con envío contra entrega a Bogotá."
                              className="w-full bg-[#202c33] border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-green-500 h-20 resize-none"
                            />
                          </div>
                        </div>

                        <div className="flex gap-2.5 pt-5 mt-5 border-t border-gray-850 justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              setShowAddLeadModal(false);
                              setNewLeadName('');
                              setNewLeadPhone('');
                              setNewLeadMsg('');
                            }}
                            className="bg-[#202c33] hover:bg-[#303c43] text-gray-300 text-xs font-bold px-4 py-2 rounded-xl transition"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (!newLeadName || !newLeadPhone) {
                                alert('Por favor, ingresa el nombre y el número de teléfono del lead.');
                                return;
                              }
                              const id = `lead_${Date.now()}`;
                              const newLead = {
                                id,
                                name: newLeadName,
                                phone: newLeadPhone,
                                time: 'Hace un momento',
                                msg: newLeadMsg || 'Sin mensajes registrados aún.',
                                unread: 0,
                                columnId: 'leads_nuevos',
                                tags: ['Manual'],
                                leadStatus: newLeadStatus
                              };
                              setChats([newLead, ...chats]);
                              setActiveChatId(id);
                              setShowAddLeadModal(false);
                              setNewLeadName('');
                              setNewLeadPhone('');
                              setNewLeadMsg('');
                              alert('✅ Lead registrado con éxito.');
                            }}
                            className="bg-green-600 hover:bg-green-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition"
                          >
                            Registrar Lead
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
           </div>
        )}
        {currentViewTab === 'training' && (
          <div className="training-professional space-y-6 animate-fade-in">
            {/* Secondary navigation tab bar for training sub-modules */}
            <div className="flex gap-2 border-b border-gray-800 overflow-x-auto pb-px mb-6">
              <button
                type="button"
                onClick={() => setTrainingSubTab('base')}
                className={`px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${trainingSubTab === 'base' ? 'border-green-500 text-green-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
              >
                <Database size={14} className="inline mr-1.5" />
                Configuración Base
              </button>
              <button
                type="button"
                onClick={() => setTrainingSubTab('ai_models')}
                className={`px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${trainingSubTab === 'ai_models' ? 'border-blue-500 text-blue-400 font-bold' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
              >
                <Database size={14} className="inline mr-1.5 text-blue-400" />
                Consultor IA / Modelos
              </button>
              <button
                type="button"
                onClick={() => setTrainingSubTab('debug')}
                className={`px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${trainingSubTab === 'debug' ? 'border-cyan-500 text-cyan-400 font-bold' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
              >
                <Terminal size={14} className="inline mr-1.5 text-cyan-400 animate-pulse" />
                Depuración OpenAI & Tokens
              </button>
            </div>

            {trainingSubTab === 'base' && (
              <div className="space-y-6 animate-fade-in">
                {/* Header Banner */}
                <div className="bg-gradient-to-r from-emerald-950/80 via-black to-emerald-950/80 border border-emerald-500/30 p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 uppercase tracking-wider">
                        <Shield size={12} className="text-emerald-400 animate-pulse" />
                        Configuración central del asistente
                      </span>
                      <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        🟢 IA Sin Alucinaciones
                      </span>
                    </div>
                    <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                      Configuración Base del Bot de WhatsApp
                    </h3>
                    <p className="text-xs text-gray-300 mt-1 max-w-2xl leading-relaxed">
                      Define aquí el comportamiento general del asistente. Los productos, precios, inventario y características se obtienen <strong className="text-emerald-400">únicamente del Catálogo sincronizado</strong>; la IA no completará información con datos de internet.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 shrink-0 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setIsWizardOpen(true)}
                      className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition shadow-lg active:scale-95"
                    >
                      <Wand2 size={14} /> Asistente IA (Auto-Configurar)
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          localStorage.setItem('whatsapp_bot_prompt_v1', botPrompt);
                          const res = await fetch('/api/backoffice/state', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              botPrompt,
                              businessType,
                              lastTrainingUpdate: Date.now()
                            })
                          });
                          if (res.ok) {
                            alert('Configuración base sincronizada correctamente con el servidor.');
                          } else {
                            alert('⚠️ No se pudo guardar en el servidor. Revisa tu conexión.');
                          }
                        } catch (err: any) {
                          alert('❌ Error guardando configuración base: ' + err.message);
                        }
                      }}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition shadow-lg active:scale-95"
                    >
                      <Save size={14} /> Guardar Configuración
                    </button>
                  </div>
                </div>

                {/* 1. Nicho de Negocio */}
                <div className="panel p-5 rounded-2xl bg-[#0e0e0e] border border-gray-800">
                  <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                    <Settings size={16} className="text-amber-400" /> Nicho / Tipo de Negocio
                  </h3>
                  <p className="text-xs text-gray-400 mb-3">
                    Selecciona tu Nicho para aplicar una plantilla optimizada de prompt y reglas base para tu modelo de negocio.
                  </p>
                  <select
                    className="w-full bg-[#161616] border border-gray-800 rounded-xl p-3 text-sm text-white focus:border-emerald-500 outline-none font-semibold cursor-pointer"
                    value={businessType}
                    onChange={(e) => handleApplyNicheTemplate(e.target.value)}
                  >
                    <option value="Restaurante / Comida Rápida">🍕 Restaurante / Comida Rápida (Menú, Domicilios y Mesas)</option>
                    <option value="E-Commerce (Venta de Productos)">🛒 E-Commerce (Venta de Productos y Pago Contra Entrega)</option>
                    <option value="Hotel / Hospedaje">🏨 Hotel / Hospedaje (Habitaciones y Reservas)</option>
                    <option value="Servicios / Consultoría">💼 Servicios / Consultoría (Citas y Asesorías)</option>
                    <option value="Salud / Estética">💅 Salud / Estética (Tratamientos y Citas)</option>
                    <option value="Networkers / Afiliados">🚀 Networkers / Afiliados (Presentación y Cierre)</option>
                    <option value="Otro">🎯 Otro Tipo de Negocio</option>
                  </select>
                </div>

                <div className="panel p-5 rounded-2xl bg-[#0e0e0e] border border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                      <Package size={17} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Catálogo conectado</h3>
                      <p className="text-xs text-gray-400 mt-1">
                        Es la fuente única para productos, precios, inventario y características en todos los módulos y respuestas de IA.
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 rounded-lg whitespace-nowrap">
                    {catalogProductCount} productos activos
                  </span>
                </div>

                {/* Configuración base: el saludo, las FAQs y las reglas viven en sus pestañas específicas. */}
                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-6">
                    {/* A. Prompt Principal del Bot */}
                    <div className="panel p-5 rounded-2xl bg-[#0e0e0e] border border-gray-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                          <Bot size={16} className="text-emerald-400" /> 1. Prompt Principal del Bot (Conocimiento Base)
                        </h3>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(botPrompt);
                            alert('Prompt copiado al portapapeles');
                          }}
                          className="text-[11px] bg-gray-800 hover:bg-gray-700 text-gray-300 px-2.5 py-1 rounded-lg transition flex items-center gap-1"
                        >
                          <Copy size={12} /> Copiar
                        </button>
                      </div>
                      <div className="bg-amber-950/20 border border-amber-500/20 p-2.5 rounded-xl text-[11px] text-amber-300 flex items-start gap-2">
                        <Shield size={14} className="shrink-0 mt-0.5 text-amber-400" />
                        <span><strong>Restricción Estricta:</strong> Escribe aquí la información completa de tu negocio (productos, precios, horarios, flujo de atención). La IA no responderá nada fuera de lo aquí redactado.</span>
                      </div>
                      <textarea
                        className="w-full bg-[#141414] border border-gray-800 rounded-xl p-3 text-xs text-gray-200 h-64 focus:border-emerald-500 outline-none leading-relaxed font-mono"
                        placeholder="Escribe aquí el entrenamiento del bot..."
                        value={botPrompt}
                        onChange={(e) => setBotPrompt(e.target.value)}
                      />
                      <div className="flex items-center justify-between text-[11px] text-gray-400">
                        <span>Caracteres: <strong className="text-gray-200 font-mono">{botPrompt.length}</strong></span>
                        <span className="text-emerald-400 font-medium">✔️ Sincronizado con IA de WhatsApp</span>
                      </div>
                    </div>

                    {/* B. Saludo Inicial Base */}
                    <div className="hidden panel p-5 rounded-2xl bg-[#0e0e0e] border border-gray-800 space-y-4">
                      <div>
                        <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
                          <MessageCircle size={16} className="text-blue-400" /> 2. Saludo Inicial Base
                        </h3>
                        <p className="text-xs text-gray-400">
                          Mensaje de bienvenida automático que la IA enviará al primer contacto de cada cliente.
                        </p>
                      </div>
                      <textarea
                        className="w-full bg-[#141414] border border-gray-800 rounded-xl p-3 text-xs text-gray-200 h-28 focus:border-blue-500 outline-none leading-relaxed"
                        placeholder="¡Hola! Gracias por escribirnos..."
                        value={greetingMessage}
                        onChange={(e) => { setGreetingMessage(e.target.value); isGreetingEditedRef.current = true; }}
                        onFocus={() => { isGreetingFocusedRef.current = true; }}
                        onBlur={() => { isGreetingFocusedRef.current = false; }}
                      />

                      {/* Controles de Adjuntos / Grabar Voz en Saludo */}
                      <div>
                        <span className="text-xs font-semibold text-gray-300 block mb-2">Adjuntos / Notas de Voz del Saludo:</span>
                        {isRecordingGreetingAudio ? (
                          <LiveAudioRecorder
                            onSendVoiceNote={(voice) => {
                              const newAtts = [
                                ...greetingAttachments,
                                { name: voice.name || 'Nota_de_voz_Saludo.ogg', type: 'audio' as const, url: voice.dataUrl }
                              ];
                              handleSaveGreeting(greetingMessage, newAtts);
                              setIsRecordingGreetingAudio(false);
                            }}
                            onCancel={() => setIsRecordingGreetingAudio(false)}
                            title="Grabar Audio de Saludo"
                          />
                        ) : (
                          <div className="grid grid-cols-2 gap-2">
                            <label className="border border-gray-800 border-dashed rounded-xl p-2.5 flex items-center justify-center gap-2 text-gray-400 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition cursor-pointer text-xs font-medium">
                              <UploadCloud size={16} className="text-emerald-400" />
                              <span>Subir Archivo/Imagen</span>
                              <input
                                type="file"
                                accept="image/*,video/*,audio/*,application/pdf"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onload = (event) => {
                                      const dataUrl = event.target?.result as string;
                                      const type = file.type.startsWith('image') ? 'imagen' : file.type.startsWith('video') ? 'video' : file.type.startsWith('audio') ? 'audio' : 'archivo';
                                      const newAtts = [...greetingAttachments, { name: file.name, type, url: dataUrl }];
                                      handleSaveGreeting(greetingMessage, newAtts);
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => setIsRecordingGreetingAudio(true)}
                              className="border border-gray-800 border-dashed rounded-xl p-2.5 flex items-center justify-center gap-2 text-gray-400 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition cursor-pointer text-xs font-medium"
                            >
                              <Mic size={16} className="text-emerald-400" />
                              <span>Grabar Audio</span>
                            </button>
                          </div>
                        )}

                        {greetingAttachments.length > 0 && (
                          <div className="space-y-1.5 mt-3">
                            {greetingAttachments.map((att, idx) => (
                              <div key={idx} className="bg-[#141414] border border-gray-800 rounded-lg p-2 flex items-center justify-between text-xs">
                                <span className="text-gray-300 font-medium truncate flex items-center gap-1.5">
                                  {att.type === 'audio' ? <Mic size={12} className="text-emerald-400" /> : <Paperclip size={12} className="text-blue-400" />}
                                  {att.name}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newAtts = greetingAttachments.filter((_, i) => i !== idx);
                                    handleSaveGreeting(greetingMessage, newAtts);
                                  }}
                                  className="text-red-400 hover:text-red-300 text-[11px] font-bold px-1.5"
                                >
                                  Eliminar
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* COLUMNA DERECHA: Preguntas Frecuentes (FAQs) & Reglas */}
                  <div className="hidden space-y-6">
                    {/* C. Preguntas Frecuentes (FAQs) */}
                    <div className="panel p-5 rounded-2xl bg-[#0e0e0e] border border-gray-800 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-bold text-white flex items-center gap-2">
                            <HelpCircle size={16} className="text-amber-400" /> 3. Preguntas Frecuentes (FAQs)
                          </h3>
                          <p className="text-xs text-gray-400">
                            Respuestas directas que la IA utilizará prioritariamente.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const q = prompt('Escribe la Pregunta Frecuente (ej: ¿Cuáles son los métodos de pago?):');
                            if (!q) return;
                            const a = prompt('Escribe la Respuesta Oficial para esta pregunta:');
                            if (!a) return;
                            const newFaqs = [...faqs, { id: `faq-${Date.now()}`, question: q, answer: a }];
                            setFaqs(newFaqs);
                            localStorage.setItem('whatsapp_faqs_v1', JSON.stringify(newFaqs));
                          }}
                          className="bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 text-xs font-bold px-3 py-1.5 rounded-lg transition flex items-center gap-1"
                        >
                          <Plus size={14} /> Nueva FAQ
                        </button>
                      </div>

                      <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar pr-1">
                        {faqs.length === 0 ? (
                          <div className="p-4 border border-dashed border-gray-800 rounded-xl text-center text-xs text-gray-500">
                            No hay preguntas frecuentes registradas aún. Haz clic en <strong>+ Nueva FAQ</strong> para agregar la primera.
                          </div>
                        ) : (
                          faqs.map((faq, i) => (
                            <div key={faq.id || i} className="bg-[#141414] border border-gray-800 rounded-xl p-3 space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                                  <span>Q{i+1}:</span>
                                  <input
                                    type="text"
                                    className="bg-transparent border-none text-white font-semibold focus:outline-none w-full text-xs"
                                    value={faq.question}
                                    onChange={(e) => {
                                      const updated = [...faqs];
                                      updated[i].question = e.target.value;
                                      setFaqs(updated);
                                      localStorage.setItem('whatsapp_faqs_v1', JSON.stringify(updated));
                                    }}
                                  />
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = faqs.filter((_, idx) => idx !== i);
                                    setFaqs(updated);
                                    localStorage.setItem('whatsapp_faqs_v1', JSON.stringify(updated));
                                  }}
                                  className="text-red-400 hover:text-red-300 text-xs px-1"
                                  title="Eliminar FAQ"
                                >
                                  &times;
                                </button>
                              </div>
                              <textarea
                                className="w-full bg-[#1a1a1a] border border-gray-800 rounded-lg p-2 text-xs text-gray-300 focus:border-amber-500 outline-none"
                                rows={2}
                                value={faq.answer}
                                onChange={(e) => {
                                  const updated = [...faqs];
                                  updated[i].answer = e.target.value;
                                  setFaqs(updated);
                                  localStorage.setItem('whatsapp_faqs_v1', JSON.stringify(updated));
                                }}
                              />
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* D. Reglas de Comportamiento */}
                    <div className="panel p-5 rounded-2xl bg-[#0e0e0e] border border-gray-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                          <Shield size={16} className="text-blue-400" /> 4. Reglas y Límites de la IA
                        </h3>
                        <button
                          type="button"
                          onClick={() => {
                            const r = prompt('Escribe una nueva regla de comportamiento (ej: No ofrecer descuentos mayores al 10% sin autorización):');
                            if (r) setRules([...rules, r]);
                          }}
                          className="text-xs text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1"
                        >
                          <Plus size={14} /> Añadir Regla
                        </button>
                      </div>

                      <div className="space-y-2">
                        {rules.map((rule, i) => (
                          <div key={i} className="flex items-center justify-between gap-2 bg-[#141414] border border-gray-800 p-2.5 rounded-lg text-xs text-gray-300">
                            <div className="flex items-center gap-2 truncate">
                              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0"></div>
                              <span className="truncate">{rule}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setRules(prev => prev.filter((_, idx) => idx !== i))}
                              className="text-red-400 hover:text-red-300 text-xs px-1.5 shrink-0"
                            >
                              &times;
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Fila Inferior: Búfer de Mensajes y Material Adicional */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  <div className="panel p-5 rounded-2xl bg-[#0e0e0e] border border-gray-800 space-y-3">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <MessageCircle size={16} className="text-emerald-400 animate-pulse" />
                      Búfer de Consolidador de Mensajes
                    </h3>
                    <p className="text-xs text-gray-400">
                      Agrupa ráfagas de mensajes del cliente antes de responder para analizar el contexto completo de forma humana.
                    </p>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-gray-300">Activar Búfer de Consolidación</span>
                      <div
                        onClick={() => setIsBufferEnabled(!isBufferEnabled)}
                        className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-200 cursor-pointer ${isBufferEnabled ? "bg-emerald-600" : "bg-gray-700"}`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 transform ${isBufferEnabled ? "translate-x-5" : "translate-x-0"}`} />
                      </div>
                    </div>
                    {isBufferEnabled && (
                      <div className="pt-2">
                        <label className="block text-[11px] text-gray-400 mb-1">
                          Segundos de espera: <strong className="text-emerald-400 font-mono">{bufferSeconds}s</strong>
                        </label>
                        <input
                          type="range"
                          min="3"
                          max="20"
                          value={bufferSeconds}
                          onChange={(e) => setBufferSeconds(Number(e.target.value))}
                          className="w-full accent-emerald-500 cursor-pointer"
                        />
                      </div>
                    )}
                  </div>

                  <div className="panel p-5 rounded-2xl bg-[#0e0e0e] border border-gray-800 space-y-3">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Database size={16} className="text-blue-400" />
                      Documentos y Material de Soporte (PDFs)
                    </h3>
                    <p className="text-xs text-gray-400">
                      Sube catálogos, menús o PDFs con información adicional para el bot.
                    </p>
                    {trainedFiles.length > 0 && (
                      <div className="space-y-1 max-h-24 overflow-y-auto">
                        {trainedFiles.map((file, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-[#141414] border border-gray-800 p-2 rounded text-xs text-gray-300">
                            <span className="truncate flex items-center gap-1.5"><FileText size={12} className="text-emerald-400" /> {file}</span>
                            <button onClick={() => setTrainedFiles(prev => prev.filter((_, i) => i !== idx))} className="text-red-400 text-xs">&times;</button>
                          </div>
                        ))}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        const f = prompt('Escribe el nombre del archivo (ej: Menu_2026.pdf):');
                        if (f) setTrainedFiles([...trainedFiles, f]);
                      }}
                      className="bg-gray-800 hover:bg-gray-700 text-white text-xs px-4 py-2 rounded-lg transition flex items-center gap-2 font-medium"
                    >
                      <UploadCloud size={14} /> Seleccionar Archivos
                    </button>
                  </div>
                </div>

                {/* Botón Flotante/Final de Guardado Completo */}
                <div className="p-4 bg-[#0d1612] border border-emerald-500/30 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xl">
                  <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
                    <CheckCircle size={18} className="text-emerald-400" />
                    <span>Los cambios se aplicarán inmediatamente al bot de WhatsApp al guardar.</span>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        localStorage.setItem('whatsapp_bot_prompt_v1', botPrompt);
                        localStorage.setItem('whatsapp_greeting_v1', greetingMessage);
                        localStorage.setItem('whatsapp_faqs_v1', JSON.stringify(faqs));
                        const res = await fetch('/api/backoffice/state', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            botPrompt,
                            customGreeting: greetingMessage,
                            greetingAttachments,
                            faqsList: faqs,
                            rules,
                            businessType,
                            lastTrainingUpdate: Date.now()
                          })
                        });
                        if (res.ok) {
                          alert('✨ ¡Toda la Configuración Base (Prompt, Saludo, FAQs y Reglas) se guardó exitosamente!');
                        } else {
                          alert('⚠️ Ocurrió un inconveniente al guardar. Verifica tu conexión.');
                        }
                      } catch (err: any) {
                        alert('❌ Error guardando configuración base: ' + err.message);
                      }
                    }}
                    className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-white font-black text-xs px-6 py-3 rounded-xl transition shadow-xl active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Save size={16} /> GUARDAR Y APLICAR CONFIGURACIÓN BASE COMPLETA
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {currentViewTab === 'training' && trainingSubTab === 'base' && (
          <div className="training-professional grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="panel p-6 rounded-2xl space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-white mb-2">Mensaje de Saludo</h3>
                <p className="text-xs text-gray-500 mb-3">El primer mensaje automático que se envía al cliente cuando inicia conversación.</p>
                <textarea
                  className="w-full bg-[#111] border border-gray-800 rounded-xl p-3 text-sm text-gray-300 h-24 focus:border-green-500 outline-none"
                  value={greetingMessage}
                  onChange={(e) => { setGreetingMessage(e.target.value); isGreetingEditedRef.current = true; }}
                  onFocus={() => { isGreetingFocusedRef.current = true; }}
                  onBlur={() => { isGreetingFocusedRef.current = false; }}
                />
              </div>

              <div>
                <h3 className="text-sm font-semibold text-white mb-3">Adjuntos Multimedia Iniciales (Imágenes, Videos, Notas de Voz)</h3>

                {/* Live Recorder or File Upload Controls */}
                {isRecordingGreetingAudio ? (
                  <div className="mb-4">
                    <LiveAudioRecorder
                      onSendVoiceNote={(voice) => {
                        const newAtts = [
                          ...greetingAttachments,
                          { name: voice.name || 'Nota_de_voz_Saludo.ogg', type: 'audio' as const, url: voice.dataUrl }
                        ];
                        handleSaveGreeting(greetingMessage, newAtts);
                        setIsRecordingGreetingAudio(false);
                      }}
                      onCancel={() => setIsRecordingGreetingAudio(false)}
                      title="Grabar Audio (Formato OPUS PTT con Ondas Real)"
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <label className="border border-gray-800 border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-gray-400 hover:border-green-500/50 hover:bg-green-500/5 transition cursor-pointer">
                      <UploadCloud size={20} className="mb-2 text-green-400" />
                      <span className="text-xs font-semibold text-center">Subir Archivo / Imagen</span>
                      <input
                        type="file"
                        accept="image/*,video/*,audio/*,application/pdf"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              const dataUrl = event.target?.result as string;
                              const type = file.type.startsWith('image') ? 'imagen' : file.type.startsWith('video') ? 'video' : file.type.startsWith('audio') ? 'audio' : 'archivo';
                              const newAtts = [...greetingAttachments, { name: file.name, type, url: dataUrl }];
                              handleSaveGreeting(greetingMessage, newAtts);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => setIsRecordingGreetingAudio(true)}
                      className="border border-gray-800 border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-gray-400 hover:border-green-500/50 hover:bg-green-500/5 transition cursor-pointer"
                    >
                      <Mic size={20} className="mb-2 text-emerald-400" />
                      <span className="text-xs font-semibold text-center">Grabar Nota de Voz</span>
                    </button>
                  </div>
                )}

                {/* List of Attached Files in Greeting */}
                {greetingAttachments.length > 0 && (
                  <div className="space-y-2 mb-4">
                    <h5 className="text-xs font-bold text-gray-400">Adjuntos guardados en el saludo ({greetingAttachments.length}):</h5>
                    {greetingAttachments.map((att, idx) => (
                      <div key={idx} className="bg-[#111] border border-gray-800 rounded-lg p-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2 truncate">
                          {att.type === 'audio' ? <Mic size={14} className="text-emerald-400" /> : <Paperclip size={14} className="text-blue-400" />}
                          <span className="text-xs text-gray-300 font-medium truncate">{att.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const newAtts = greetingAttachments.filter((_, i) => i !== idx);
                            handleSaveGreeting(greetingMessage, newAtts);
                          }}
                          className="text-red-400 hover:text-red-300 text-xs font-bold px-2 py-0.5"
                        >
                          Eliminar
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => handleSaveGreeting(greetingMessage, greetingAttachments)}
                  className="w-full bg-green-600 hover:bg-green-500 text-white font-bold text-xs py-3 rounded-xl transition shadow-lg shadow-green-600/20"
                >
                  Guardar Mensaje y Adjuntos del Saludo
                </button>
              </div>
            </div>

            <div className="panel p-0 rounded-2xl overflow-hidden flex flex-col">
              <div className="bg-[#075e54] p-3 text-white text-sm font-medium flex items-center gap-2">
                <Smartphone size={16} /> Previsualización de WhatsApp
              </div>
              <div className="p-4 bg-[#0f1114] flex-1 flex flex-col gap-3 min-h-[320px]">
                {/* Media preview inside bubble */}
                {greetingAttachments.map((att, idx) => (
                  <div key={idx} className="self-end bg-[#24272c] border border-[#34383f] p-2 rounded-lg max-w-[85%] shadow-sm">
                    {att.type === 'audio' ? (
                      <VoiceNotePlayer
                        src={att.url || 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'}
                        isPtt={true}
                        title={att.name}
                        sender="agent"
                      />
                    ) : att.type === 'imagen' && att.url ? (
                      <img src={att.url} alt={att.name} className="rounded max-h-40 w-full object-cover mb-1" />
                    ) : (
                      <div className="flex items-center gap-2 text-xs font-bold text-gray-800 p-2 bg-black/5 rounded">
                        <Paperclip size={16} />
                        <span>{att.name}</span>
                      </div>
                    )}
                  </div>
                ))}

                <div className="self-end bg-[#24272c] border border-[#34383f] p-2.5 rounded-lg text-sm text-gray-100 max-w-[85%] shadow-sm relative">
                  {greetingMessage}
                  <span className="text-[9px] text-gray-500 block text-right mt-1">10:45 AM</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentViewTab === 'training' && trainingSubTab === 'base' && (
          <div className="training-professional panel p-6 rounded-2xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-white">Base de Conocimiento / FAQs</h3>
                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Autoguardado Activo
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Las preguntas se autoguardan automáticamente al modificar. {lastFaqSavedTime ? `Última sincronización: ${lastFaqSavedTime}` : ''}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  const newFaqs = [
                    ...faqs,
                    { question: "¿Tienen envíos gratis?", answer: "Sí, todos nuestros envíos son totalmente gratuitos a nivel nacional por transportadoras aliadas." },
                    { question: "¿Tienen pago contra entrega?", answer: "Sí, puedes pagar en efectivo al transportador cuando recibas el producto en tu casa o negocio." },
                    { question: "¿Cómo solicito la garantía?", answer: "Nuestros productos tienen 3 meses de garantía. Escríbenos por esta línea con tu número de pedido y gestionamos el cambio." }
                  ];
                  handleUpdateFaqs(newFaqs);
                  alert("✨ Se han auto-generado 3 FAQs de ejemplo con respuestas profesionales para tu tienda.");
                }}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-2 transition"
              >
                <Wand2 size={14} /> Auto-Generar Ejemplos
              </button>
            </div>

            <div className="space-y-4">
              {faqs.map((faq, idx) => (
                <div key={idx} className="bg-[#111] border border-gray-800 rounded-xl p-4">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] text-gray-500 uppercase font-bold font-mono">Pregunta #{idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const newFaqs = faqs.filter((_, i) => i !== idx);
                        handleUpdateFaqs(newFaqs);
                      }}
                      className="text-red-500 hover:text-red-400 text-xs hover:underline"
                    >
                      Eliminar
                    </button>
                  </div>
                  <input type="text" value={faq.question} onFocus={() => { isFaqsFocusedRef.current = true; }} onBlur={() => { isFaqsFocusedRef.current = false; }} onChange={(e) => {
                    const newFaqs = [...faqs];
                    newFaqs[idx].question = e.target.value;
                    handleUpdateFaqs(newFaqs);
                  }} className="w-full bg-transparent text-sm font-semibold text-white mb-2 outline-none border-b border-gray-850 pb-1 focus:border-blue-500" placeholder="Escribe la pregunta del cliente..." />
                  <textarea value={faq.answer} onFocus={() => { isFaqsFocusedRef.current = true; }} onBlur={() => { isFaqsFocusedRef.current = false; }} onChange={(e) => {
                    const newFaqs = [...faqs];
                    newFaqs[idx].answer = e.target.value;
                    handleUpdateFaqs(newFaqs);
                  }} className="w-full bg-[#161616] p-2 rounded text-xs text-gray-400 mb-3 outline-none border border-gray-800 focus:border-blue-500" placeholder="Escribe la respuesta automática de la IA..." />
                  <div className="mt-3 border-t border-gray-850 pt-3">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="text-[11px] font-bold text-gray-400 flex items-center gap-1">
                        <Paperclip size={12} className="text-gray-500" /> Archivos Adjuntos Autopilot ({faq.attachments?.length || 0})
                      </h5>
                    </div>

                    {faq.attachments && faq.attachments.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                        {faq.attachments.map((att, aIdx) => {
                          if (att.type === 'audio') {
                            return (
                              <div key={aIdx} className="relative group sm:col-span-2">
                                <VoiceNotePlayer
                                  src={att.url || 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'}
                                  isPtt={true}
                                  title={att.name || 'Nota de Voz PTT'}
                                  sender="agent"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...faqs];
                                    updated[idx].attachments = (updated[idx].attachments || []).filter((_, i) => i !== aIdx);
                                    handleUpdateFaqs(updated);
                                  }}
                                  className="absolute top-2 right-2 bg-red-950/80 text-red-300 hover:bg-red-800 p-1 rounded-full text-xs transition"
                                  title="Eliminar audio"
                                >
                                  &times;
                                </button>
                              </div>
                            );
                          }
                          const IconComp = att.type === 'imagen' ? ImageIcon : att.type === 'video' ? Video : FileText;
                          const iconColor = att.type === 'imagen' ? 'text-blue-400' : att.type === 'video' ? 'text-red-400' : 'text-amber-400';
                          return (
                            <div key={aIdx} className="bg-[#181818] border border-gray-800 rounded p-2 flex items-center justify-between gap-2">
                              <span className="text-[10px] font-medium text-gray-300 flex items-center gap-1.5 truncate">
                                <IconComp size={12} className={`${iconColor} shrink-0`} />
                                <span className="truncate">{att.name}</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = [...faqs];
                                  updated[idx].attachments = (updated[idx].attachments || []).filter((_, i) => i !== aIdx);
                                  handleUpdateFaqs(updated);
                                }}
                                className="text-gray-500 hover:text-red-400 text-xs font-bold leading-none"
                              >
                                &times;
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-[10px] text-gray-600 italic mb-2">Sin archivos multimedia asociados.</p>
                    )}

                    {/* Live Audio Recorder for this FAQ */}
                    {activeFaqAudioIndex === idx && (
                      <div className="my-2">
                        <LiveAudioRecorder
                          onSendVoiceNote={(voice) => {
                            const updated = [...faqs];
                            if (!updated[idx].attachments) updated[idx].attachments = [];
                            updated[idx].attachments.push({
                              name: voice.name || 'Nota_de_voz_PTT.ogg',
                              type: 'audio',
                              url: voice.dataUrl
                            });
                            handleUpdateFaqs(updated);
                            setActiveFaqAudioIndex(null);
                          }}
                          onCancel={() => setActiveFaqAudioIndex(null)}
                          title={`Grabar Nota de Voz Real (PTT con ondas) para FAQ #${idx + 1}`}
                        />
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-1.5 bg-[#161616] p-2 rounded-lg border border-gray-850">
                      <span className="text-[10px] text-gray-500 mr-1 font-semibold">Vincular:</span>

                      <button
                        type="button"
                        onClick={() => setActiveFaqAudioIndex(activeFaqAudioIndex === idx ? null : idx)}
                        className="text-[10px] bg-emerald-700 hover:bg-emerald-600 text-white px-2.5 py-1 rounded flex items-center gap-1 font-semibold transition shadow-sm"
                      >
                        <Mic size={11} /> 🎤 Grabar / Subir Nota de Voz PTT
                      </button>

                      <label className="text-[10px] bg-blue-900/60 hover:bg-blue-600 text-blue-200 hover:text-white px-2.5 py-1 rounded flex items-center gap-1 transition cursor-pointer font-semibold border border-blue-500/30">
                        <UploadCloud size={11} /> 📁 Subir Adjunto (Imagen, Video, PDF)
                        <input
                          type="file"
                          accept="image/*,video/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                const dataUrl = event.target?.result as string;
                                const fileType = file.type.startsWith('image') ? 'imagen' : file.type.startsWith('video') ? 'video' : 'archivo';
                                const updated = [...faqs];
                                if (!updated[idx].attachments) updated[idx].attachments = [];
                                updated[idx].attachments.push({
                                  name: file.name,
                                  type: fileType,
                                  url: dataUrl
                                });
                                handleUpdateFaqs(updated);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() => {
                          const urlStr = prompt('Ingresa la URL del archivo (imagen, video o pdf):', 'https://...');
                          if (urlStr) {
                            const fileName = prompt('Nombre para este archivo:', 'Catalogo.pdf');
                            if (fileName) {
                              const fileType = urlStr.match(/\.(mp4|webm|mov)$/i) ? 'video' : urlStr.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? 'imagen' : 'archivo';
                              const updated = [...faqs];
                              if (!updated[idx].attachments) updated[idx].attachments = [];
                              updated[idx].attachments.push({
                                name: fileName,
                                type: fileType,
                                url: urlStr
                              });
                              handleUpdateFaqs(updated);
                            }
                          }
                        }}
                        className="text-[10px] bg-gray-800 hover:bg-gray-750 text-gray-300 px-2 py-1 rounded flex items-center gap-1 transition font-semibold"
                      >
                        <Globe size={11} /> Vincular URL externa
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              <div className="bg-gray-900/50 border border-dashed border-gray-800 hover:border-gray-600 transition cursor-pointer rounded-xl p-4 flex justify-center text-gray-500 hover:text-white" onClick={() => handleUpdateFaqs([...faqs, {question: '', answer: ''}])}>+ Añadir FAQ manualmente</div>
              <button
                type="button"
                onClick={handleSaveFaqsToBackend}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-3 rounded-xl transition shadow-lg shadow-emerald-600/20 mt-4 flex justify-center items-center gap-2"
              >
                <Save size={16} />
                Guardar Cambios de FAQs
              </button>
            </div>
          </div>
        )}

        {currentViewTab === 'training' && trainingSubTab === 'base' && (
          <div className="training-professional space-y-6">
            {/* Multi-User Bot Profile Configurator */}
            <div className="panel p-6 rounded-2xl bg-[#0e0e11] border border-blue-500/20 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Users size={18} className="text-blue-400" /> Configuración de Bots Independientes por Usuario
                  </h3>
                  <p className="text-xs text-gray-400">Cada miembro del equipo o usuario puede tener su propia IA configurada independientemente.</p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={activeBotProfileId}
                    onChange={(e) => setActiveBotProfileId(e.target.value)}
                    className="bg-black border border-gray-800 text-xs font-bold text-blue-300 rounded-lg px-3 py-2 outline-none cursor-pointer"
                  >
                    {botProfiles.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.role})</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      const name = prompt('Nombre del nuevo usuario / Bot:', 'Bot Asesor 3');
                      if (!name) return;
                      const newId = `bot_${Date.now()}`;
                      setBotProfiles([...botProfiles, {
                        id: newId,
                        name,
                        role: 'Atención Personalizada',
                        prompt: `Actúa como el bot asignado a ${name}...`,
                        greeting: `¡Hola! Te habla ${name}. ¿En qué te asesoro hoy?`
                      }]);
                      setActiveBotProfileId(newId);
                      alert(`✅ Bot asignado a "${name}" creado exitosamente.`);
                    }}
                    className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1 transition"
                  >
                    <Plus size={14} /> Crear Bot Usuario
                  </button>
                </div>
              </div>
            </div>

            {/* Reactivation Trigger & Blacklist Settings */}
            <div className="panel p-6 rounded-2xl bg-black border border-gray-800 space-y-6">
              <div className="flex justify-between items-center pb-3 border-b border-gray-800">
                <div>
                  <h3 className="text-base font-semibold text-white flex items-center gap-2">
                    <Sparkles size={18} className="text-yellow-400" /> Controles de Desactivación, Reactivación y Exclusión
                  </h3>
                  <p className="text-xs text-gray-500">Configura la casilla de reactivación manual y la lista negra de números excluidos.</p>
                </div>
                <button
                  type="button"
                  onClick={handleSaveRulesAndSettings}
                  className="bg-green-600 hover:bg-green-500 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-2 transition"
                >
                  Guardar Configuración
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Reactivation Trigger Box */}
                <div className="bg-[#111] border border-gray-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-white">
                    <Bot size={16} className="text-green-400" />
                    <span>Casilla de Reactivación de la IA</span>
                  </div>
                  <p className="text-xs text-gray-400">
                    Si un agente responde manualmente desde la App oficial de WhatsApp, la IA se desactiva. Escribe el emoji o carácter exacto que, al enviarse al chat, reactivará la IA automáticamente:
                  </p>
                  <div className="flex items-center gap-3 pt-1">
                    <input
                      type="text"
                      value={reactivationTrigger}
                      onChange={(e) => setReactivationTrigger(e.target.value)}
                      className="bg-black border border-gray-700 text-center font-mono font-bold text-green-400 text-base rounded-lg p-2.5 w-24 outline-none focus:border-green-500"
                      placeholder="🤖"
                    />
                    <span className="text-xs text-gray-500 italic">Ejemplos: 🤖, a, #bot, #reactivar</span>
                  </div>
                </div>

                {/* Blacklisted Numbers */}
                <div className="bg-[#111] border border-gray-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-white">
                    <Shield size={16} className="text-red-400" />
                    <span>Lista Negra de Números Excluidos</span>
                  </div>
                  <p className="text-xs text-gray-400">
                    Ingresa los números de teléfono (uno por línea o separados por coma) a los cuales la IA NUNCA debe responder:
                  </p>
                  <textarea
                    value={blacklistedNumbersText}
                    onChange={(e) => setBlacklistedNumbersText(e.target.value)}
                    placeholder="+573001234567&#10;+573112223344"
                    className="w-full bg-black border border-gray-800 rounded-lg p-2.5 text-xs text-gray-300 font-mono h-20 outline-none focus:border-red-500"
                  />
                </div>
              </div>
            </div>

            {/* AI Rules list */}
            <div className="panel p-6 rounded-2xl bg-black border border-gray-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 pb-4 border-b border-gray-800 gap-4">
                <div>
                  <h3 className="text-base font-semibold text-white flex items-center gap-2">
                    <Sparkles size={18} className="text-yellow-400" /> Reglas de Automatización de IA
                  </h3>
                  <p className="text-xs text-gray-500">Configura la IA para analizar mensajes de clientes, auto-categorizar chats en el Kanban, asignar etiquetas o generar alertas de prioridad.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const keyword = prompt('Escribe la palabra clave o frase que activará la regla (ej: "garantía", "precio", "pago contra entrega"):');
                    if (!keyword) return;
                    const actionType = prompt('Elige tipo de acción:\n1. Mover a columna Kanban\n2. Añadir etiqueta\n3. Generar Alerta IA\n4. Agendar Cita\nIngresa el número (1, 2, 3 o 4):');
                    if (!actionType) return;

                    let action = '';
                    let actionValue = '';

                    if (actionType === '1') {
                      action = 'move_kanban';
                      const colNames = kanbanColumns.map((c, i) => `${i + 1}. ${c.name}`).join('\n');
                      const colIdx = prompt(`Elige la columna destino:\n${colNames}\nIngresa el número:`);
                      if (colIdx && kanbanColumns[parseInt(colIdx) - 1]) {
                        actionValue = kanbanColumns[parseInt(colIdx) - 1].id;
                      } else {
                        alert('Selección no válida.');
                        return;
                      }
                    } else if (actionType === '2') {
                      action = 'add_tag';
                      const tag = prompt('Escribe el nombre de la etiqueta a añadir (ej: "Soporte", "Mayorista", "Duda Envíos"):');
                      if (tag) actionValue = tag;
                      else return;
                    } else if (actionType === '3') {
                      action = 'alert';
                      const alertText = prompt('Escribe el mensaje de la alerta (ej: "Cliente requiere atención inmediata por garantía"):');
                      if (alertText) actionValue = alertText;
                      else return;
                    } else if (actionType === '4') {
                      action = 'agendar_cita';
                      actionValue = 'Cita Automática';
                    } else {
                      alert('Tipo de acción no válido.');
                      return;
                    }

                    setAiAutomationRules([
                      ...aiAutomationRules,
                      {
                        id: `rule_${Date.now()}`,
                        keyword: keyword.trim().toLowerCase(),
                        action,
                        actionValue
                      }
                    ]);
                    alert('✅ Regla de IA guardada con éxito.');
                  }}
                  className="bg-green-600 hover:bg-green-500 text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5 transition shrink-0 self-start sm:self-center"
                >
                  <Plus size={14} /> Nueva Regla IA
                </button>
              </div>

              {/* List of active AI rules */}
              <div className="space-y-3">
                {aiAutomationRules.map((rule, idx) => {
                  let actionDesc = '';
                  const ruleVal = rule.actionValue || rule.value || '';
                  const ruleKw = rule.keyword || rule.phrase || '';
                  if (rule.action === 'move_kanban' || rule.action === 'kanban') {
                    const colName = kanbanColumns.find(c => c.id === ruleVal)?.name || ruleVal;
                    actionDesc = `Mover chat a la columna: "${colName}"`;
                  } else if (rule.action === 'add_tag' || rule.action === 'etiqueta') {
                    actionDesc = `Añadir la etiqueta: "${ruleVal}"`;
                  } else if (rule.action === 'alert' || rule.action === 'alerta') {
                    actionDesc = `Generar Alerta de Sistema: "${ruleVal}"`;
                  } else if (rule.action === 'agendar_cita') {
                    actionDesc = `Agendar cita automáticamente`;
                  }

                  return (
                    <div key={rule.id} className="bg-[#111] border border-gray-800 rounded-xl p-4 flex flex-col gap-3">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] bg-blue-500/15 text-blue-400 border border-blue-500/25 px-2 py-0.5 rounded font-mono font-bold uppercase">Regla #{idx + 1}</span>
                            <span className="text-xs text-gray-400 font-medium">Si el cliente dice algo con la palabra clave:</span>
                          </div>
                          <p className="text-sm font-semibold text-white mb-2 italic">"{ruleKw}"</p>
                          <div className="flex items-center gap-1.5 text-xs text-green-400 font-semibold">
                            <Zap size={12} className="text-green-500" /> {actionDesc}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm('¿Deseas eliminar esta regla de IA?')) {
                              setAiAutomationRules(prev => prev.filter(r => r.id !== rule.id));
                            }
                          }}
                          className="text-gray-500 hover:text-red-400 text-xs font-semibold hover:underline shrink-0"
                        >
                          Eliminar
                        </button>
                      </div>

                      {/* Attached media list for this rule */}
                      <div className="border-t border-gray-850 pt-3">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="text-[11px] font-bold text-gray-400 flex items-center gap-1">
                            <Paperclip size={12} className="text-gray-500" /> Archivos Adjuntos a Regla ({rule.attachments?.length || 0})
                          </h5>
                        </div>

                        {rule.attachments && rule.attachments.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                            {rule.attachments.map((att, aIdx) => {
                              if (att.type === 'audio') {
                                return (
                                  <div key={aIdx} className="relative group sm:col-span-2">
                                    <VoiceNotePlayer
                                      src={att.url || 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'}
                                      isPtt={true}
                                      title={att.name || 'Nota de Voz PTT'}
                                      sender="agent"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updated = [...aiAutomationRules];
                                        updated[idx].attachments = (updated[idx].attachments || []).filter((_, i) => i !== aIdx);
                                        setAiAutomationRules(updated);
                                      }}
                                      className="absolute top-2 right-2 bg-red-950/80 text-red-300 hover:bg-red-800 p-1 rounded-full text-xs transition"
                                      title="Eliminar audio"
                                    >
                                      &times;
                                    </button>
                                  </div>
                                );
                              }
                              const IconComp = att.type === 'imagen' ? ImageIcon : att.type === 'video' ? Video : FileText;
                              const iconColor = att.type === 'imagen' ? 'text-blue-400' : att.type === 'video' ? 'text-red-400' : 'text-amber-400';
                              return (
                                <div key={aIdx} className="bg-[#181818] border border-gray-800 rounded p-2 flex items-center justify-between gap-2">
                                  <span className="text-[10px] font-medium text-gray-300 flex items-center gap-1.5 truncate">
                                    <IconComp size={12} className={`${iconColor} shrink-0`} />
                                    <span className="truncate">{att.name}</span>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = [...aiAutomationRules];
                                      updated[idx].attachments = (updated[idx].attachments || []).filter((_, i) => i !== aIdx);
                                      setAiAutomationRules(updated);
                                    }}
                                    className="text-gray-500 hover:text-red-400 text-xs font-bold leading-none"
                                  >
                                    &times;
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-[10px] text-gray-600 italic mb-2">Sin archivos multimedia asociados a esta regla.</p>
                        )}

                        {activeRuleAudioIndex === idx && (
                          <div className="my-2">
                            <LiveAudioRecorder
                              onSendVoiceNote={(voice) => {
                                const updated = [...aiAutomationRules];
                                if (!updated[idx].attachments) updated[idx].attachments = [];
                                updated[idx].attachments.push({
                                  name: voice.name || 'Nota_de_voz_PTT.ogg',
                                  type: 'audio',
                                  url: voice.dataUrl
                                });
                                setAiAutomationRules(updated);
                                setActiveRuleAudioIndex(null);
                              }}
                              onCancel={() => setActiveRuleAudioIndex(null)}
                              title={`Grabar Nota de Voz Real (PTT con ondas) para Regla #${idx + 1}`}
                            />
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-1.5 bg-[#161616] p-2 rounded-lg border border-gray-850">
                          <span className="text-[10px] text-gray-500 mr-1 font-semibold">Vincular:</span>

                          <button
                            type="button"
                            onClick={() => setActiveRuleAudioIndex(activeRuleAudioIndex === idx ? null : idx)}
                            className="text-[10px] bg-emerald-700 hover:bg-emerald-600 text-white px-2.5 py-1 rounded flex items-center gap-1 font-semibold transition shadow-sm"
                          >
                            <Mic size={11} /> 🎤 Grabar / Subir Nota de Voz PTT
                          </button>

                          <label className="text-[10px] bg-blue-900/60 hover:bg-blue-600 text-blue-200 hover:text-white px-2.5 py-1 rounded flex items-center gap-1 transition cursor-pointer font-semibold border border-blue-500/30">
                            <UploadCloud size={11} /> 📁 Subir Adjunto (Imagen, Video, PDF)
                            <input
                              type="file"
                              accept="image/*,video/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onload = (event) => {
                                    const dataUrl = event.target?.result as string;
                                    const fileType = file.type.startsWith('image') ? 'imagen' : file.type.startsWith('video') ? 'video' : 'archivo';
                                    const updated = [...aiAutomationRules];
                                    if (!updated[idx].attachments) updated[idx].attachments = [];
                                    updated[idx].attachments.push({
                                      name: file.name,
                                      type: fileType,
                                      url: dataUrl
                                    });
                                    setAiAutomationRules(updated);
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </label>

                          <button
                            type="button"
                            onClick={() => {
                              const urlStr = prompt('Ingresa la URL del archivo (imagen, video o pdf):', 'https://...');
                              if (urlStr) {
                                const fileName = prompt('Nombre para este archivo:', 'Archivo.pdf');
                                if (fileName) {
                                  const fileType = urlStr.match(/\.(mp4|webm|mov)$/i) ? 'video' : urlStr.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? 'imagen' : 'archivo';
                                  const updated = [...aiAutomationRules];
                                  if (!updated[idx].attachments) updated[idx].attachments = [];
                                  updated[idx].attachments.push({
                                    name: fileName,
                                    type: fileType,
                                    url: urlStr
                                  });
                                  setAiAutomationRules(updated);
                                }
                              }
                            }}
                            className="text-[10px] bg-gray-800 hover:bg-gray-750 text-gray-300 px-2 py-1 rounded flex items-center gap-1 transition font-semibold"
                          >
                            <Globe size={11} /> Vincular URL externa
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {aiAutomationRules.length === 0 && (
                  <div className="text-center py-8 text-xs text-gray-500 italic">No hay reglas de IA configuradas. Crea una para automatizar tu CRM.</div>
                )}
              </div>
            </div>

            {/* AI Alerts log */}
            <div className="panel p-6 rounded-2xl bg-black border border-gray-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 pb-4 border-b border-gray-800 gap-4">
                <div>
                  <h3 className="text-base font-semibold text-white flex items-center gap-2">
                    <Bell size={18} className="text-red-400 animate-pulse" /> Registro de Alertas de IA
                  </h3>
                  <p className="text-xs text-gray-500">Notificaciones en tiempo real producidas cuando un cliente menciona temas críticos o de urgencia.</p>
                </div>
                {systemAlerts.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSystemAlerts([]);
                      alert('Alertas despejadas.');
                    }}
                    className="text-xs bg-gray-850 hover:bg-gray-850 text-gray-300 px-3 py-1.5 rounded-lg border border-gray-800 transition"
                  >
                    Despejar todo
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {systemAlerts.map((alertItem) => (
                  <div key={alertItem.id} className="bg-[#1c1212] border border-red-900/30 rounded-xl p-4 flex items-start justify-between gap-4">
                    <div className="flex gap-2.5">
                      <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-white mb-0.5">{alertItem.message || alertItem.msg}</p>
                        <div className="flex items-center gap-2 text-[10px] text-gray-500 font-mono">
                          <span>Chat: {alertItem.chatId || alertItem.chatName}</span>
                          <span>•</span>
                          <span>{alertItem.timestamp || alertItem.time}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSystemAlerts(prev => prev.filter(a => a.id !== alertItem.id));
                      }}
                      className="text-[10px] bg-red-950/40 text-red-400 hover:bg-red-950 px-2 py-1 rounded font-bold border border-red-900/20 transition shrink-0"
                    >
                      Marcar Resuelto
                    </button>
                  </div>
                ))}
                {systemAlerts.length === 0 && (
                  <div className="text-center py-8 text-xs text-gray-500 italic flex flex-col items-center justify-center gap-1.5">
                    <CheckCircle2 size={24} className="text-green-500/30" />
                    <span>¡No hay alertas pendientes! Todo bajo control.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Memoria Module */}
        {currentViewTab === 'training' && trainingSubTab === 'base' && (
          <div className="training-professional space-y-6">
            <div className="panel p-6 rounded-2xl bg-black border border-blue-500/20 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-gray-800">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                    <Bot size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Módulo de Memoria de la Inteligencia Artificial</h3>
                    <p className="text-xs text-gray-400">Gestiona la memoria conversacional y aplica los cambios de entrenamiento inmediatamente.</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleClearAiMemory}
                  className="bg-red-600 hover:bg-red-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 transition shadow-lg shadow-red-600/20"
                >
                  <Trash2 size={16} /> Borrar Todas las Conversaciones
                </button>
              </div>

              {/* Status and Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#111] border border-gray-800 rounded-xl p-4">
                  <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider block mb-1">Conversaciones en Memoria</span>
                  <span className="text-2xl font-bold text-white">{chats.length} chats</span>
                </div>

                <div className="bg-[#111] border border-gray-800 rounded-xl p-4">
                  <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider block mb-1">Prioridad de Entrenamiento</span>
                  <span className="text-sm font-bold text-green-400 flex items-center gap-1.5 mt-1">
                    <Sparkles size={14} /> MÁXIMA (Sobreescribe historial)
                  </span>
                </div>

                <div className="bg-[#111] border border-gray-800 rounded-xl p-4">
                  <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider block mb-1">Último Borrado de Memoria</span>
                  <span className="text-sm font-bold text-blue-400 mt-1 block">{lastMemoryClearTime || 'Ninguno en esta sesión'}</span>
                </div>
              </div>

              <div className="bg-[#111] border border-gray-800 rounded-xl p-5 space-y-4">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <RefreshCw size={16} className="text-blue-400" /> Reiniciar Conversaciones Específicas
                </h4>
                <p className="text-xs text-gray-400">
                  Selecciona una conversación de cliente para borrar su historial de mensajes y forzar a la IA a reiniciar el flujo desde cero con el saludo inicial y entrenamiento actual.
                </p>

                {chats.length > 0 ? (
                  <div className="flex flex-col sm:flex-row items-end gap-3 max-w-md">
                    <div className="flex-1 w-full space-y-1.5">
                      <label className="text-[10px] text-gray-500 uppercase font-bold">Seleccionar Chat:</label>
                      <select
                        className="w-full bg-black border border-gray-800 rounded-lg p-2.5 text-xs text-white focus:border-blue-500 outline-none cursor-pointer"
                        onChange={(e) => setSelectedChatIdToReset(e.target.value)}
                        value={selectedChatIdToReset}
                      >
                        <option value="">-- Selecciona un chat --</option>
                        {chats.map(c => (
                          <option key={c.id} value={c.id}>{c.name} ({c.phone || 'Sin número'})</option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      disabled={!selectedChatIdToReset}
                      onClick={() => {
                        if (selectedChatIdToReset) {
                          handleClearSingleChat(selectedChatIdToReset);
                          setSelectedChatIdToReset("");
                        }
                      }}
                      className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-bold px-4 py-2.5 rounded-lg transition shrink-0 cursor-pointer"
                    >
                      Reiniciar Conversación
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 italic">No hay chats activos registrados en la memoria de la IA actualmente.</p>
                )}
              </div>

              <div className="bg-blue-950/20 border border-blue-500/30 p-5 rounded-xl space-y-2">
                <h4 className="text-sm font-bold text-blue-300 flex items-center gap-2">
                  <Sparkles size={16} /> ¿Para qué sirve borrar las conversaciones?
                </h4>
                <p className="text-xs text-gray-300 leading-relaxed">
                  Cuando realizas cambios en las Preguntas Frecuentes, las Reglas o el Prompt Base, la IA podría mantener patrones o contextos antiguos si un cliente ya venía hablando previamente.
                  <br />
                  Al presionar <strong className="text-white">"Borrar Todas las Conversaciones"</strong>, limpias completamente el buffer de memoria. De esta forma, el siguiente mensaje recibido de cualquier cliente será procesado <strong className="text-emerald-400">aplicando estrictamente el entrenamiento más reciente como prioridad absoluta</strong>.
                </p>
              </div>
            </div>
          </div>
        )}

        {currentViewTab === 'training' && trainingSubTab === 'base' && (
          <div className="training-professional space-y-6 animate-fade-in text-left">
            <div className="panel p-6 rounded-2xl bg-black border border-emerald-500/20 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-gray-800">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <RefreshCw size={24} className="animate-spin-slow" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Remarketing Automatizado Inteligente</h3>
                    <p className="text-xs text-gray-400">Recupera carritos abandonados y reactiva automáticamente conversaciones con clientes que te dejaron en visto.</p>
                  </div>
                </div>
              </div>

              {/* General campaign configuration cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#111] border border-gray-800 rounded-xl p-5 space-y-2">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Cantidad de Seguimientos</label>
                  <select
                    className="w-full bg-black border border-gray-800 rounded-lg p-2.5 text-sm text-white focus:border-emerald-500 outline-none cursor-pointer"
                    value={remarketingCount}
                    onChange={(e) => setRemarketingCount(Number(e.target.value))}
                  >
                    <option value={0}>❌ Desactivado</option>
                    <option value={1}>1 Seguimiento Automatizado</option>
                    <option value={2}>2 Seguimientos Secuenciales</option>
                    <option value={3}>3 Seguimientos Secuenciales (Máximo)</option>
                  </select>
                  <p className="text-[10px] text-gray-500 leading-relaxed">Configura cuántos mensajes consecutivos de seguimiento se le enviarán al cliente si no responde.</p>
                </div>

                <div className="bg-[#111] border border-gray-800 rounded-xl p-5 space-y-2">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Intervalo de Espera (Inactividad)</label>
                  <select
                    className="w-full bg-black border border-gray-800 rounded-lg p-2.5 text-sm text-white focus:border-emerald-500 outline-none cursor-pointer"
                    value={remarketingInterval}
                    onChange={(e) => setRemarketingInterval(e.target.value)}
                  >
                    <option value="15 minutos">⏳ 15 Minutos (Pruebas / Demo rápido)</option>
                    <option value="1 hora">⏳ 1 Hora</option>
                    <option value="2 horas">⏳ 2 Horas (Recomendado)</option>
                    <option value="24 horas">⏳ 24 Horas</option>
                  </select>
                  <p className="text-[10px] text-gray-500 leading-relaxed">Tiempo de silencio que debe pasar desde el último mensaje enviado antes de disparar el seguimiento.</p>
                </div>

                <div className="bg-[#111] border border-gray-800 rounded-xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Evitar Spam Inteligente</label>
                    <div
                      onClick={() => setRemarketingAvoidSpam(!remarketingAvoidSpam)}
                      className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-200 cursor-pointer ${remarketingAvoidSpam ? "bg-emerald-600" : "bg-gray-700"}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 transform ${remarketingAvoidSpam ? "translate-x-5" : "translate-x-0"}`} />
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-500 leading-relaxed">
                    Si está activo, la IA revisará la conversación antes de enviar el mensaje: no enviará nada si el cliente finalizó la charla, ya tiene un pedido confirmado o si el chat está completado.
                  </p>
                </div>
              </div>

              {/* Dynamic steps configurations */}
              {remarketingCount > 0 && (
                <div className="space-y-6 pt-4 border-t border-gray-800">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sparkles size={16} className="text-emerald-400" /> Configuración de la Secuencia ({remarketingCount} pasos)
                  </h4>

                  <div className="grid grid-cols-1 gap-6">
                    {Array.from({ length: remarketingCount }).map((_, stepIdx) => {
                      const usesAI = remarketingUseAI[stepIdx] !== undefined ? remarketingUseAI[stepIdx] : true;
                      const msgText = remarketingMessages[stepIdx] || '';
                      const stepAtts = remarketingAttachments[stepIdx] || [];

                      return (
                        <div key={stepIdx} className="bg-[#111] border border-gray-800 rounded-xl p-6 space-y-4">
                          <div className="flex items-center justify-between border-b border-gray-855 pb-3">
                            <h5 className="text-sm font-bold text-white flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-xs font-bold">
                                {stepIdx + 1}
                              </span>
                              Mensaje de Seguimiento #{stepIdx + 1}
                            </h5>

                            <div className="flex items-center gap-4 bg-black/40 border border-gray-855 p-1 rounded-lg">
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = [...remarketingUseAI];
                                  updated[stepIdx] = true;
                                  setRemarketingUseAI(updated);
                                }}
                                className={`px-3 py-1 text-xs font-semibold rounded transition ${usesAI ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}
                              >
                                Respuesta Inteligente (IA)
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = [...remarketingUseAI];
                                  updated[stepIdx] = false;
                                  setRemarketingUseAI(updated);
                                }}
                                className={`px-3 py-1 text-xs font-semibold rounded transition ${!usesAI ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}
                              >
                                Mensaje Fijo
                              </button>
                            </div>
                          </div>

                          {usesAI ? (
                            <div className="bg-emerald-950/10 border border-emerald-500/10 rounded-xl p-4 text-xs text-gray-300 space-y-2">
                              <span className="font-bold text-emerald-400 flex items-center gap-1">
                                <Sparkles size={12} /> IA Generativa Activada para este paso
                              </span>
                              <p className="leading-relaxed">
                                El servidor generará dinámicamente este mensaje basándose en el contexto exacto de la última charla, saludando amigablemente y resolviendo dudas pendientes sin parecer invasivo o repetitivo.
                              </p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-2">
                                <label className="block text-xs font-bold text-gray-400">Texto del Mensaje</label>
                                <textarea
                                  className="w-full bg-black border border-gray-855 rounded-lg p-3 text-sm text-gray-300 h-28 focus:border-emerald-500 outline-none"
                                  placeholder="Escribe el mensaje de seguimiento (Ej: Hola! Quería saber si pudiste revisar la propuesta, avísame si tienes dudas...)"
                                  value={msgText}
                                  onChange={(e) => {
                                    const updated = [...remarketingMessages];
                                    updated[stepIdx] = e.target.value;
                                    setRemarketingMessages(updated);
                                  }}
                                />
                              </div>

                              <div className="space-y-3">
                                <label className="block text-xs font-bold text-gray-400">Adjuntos Multimedia (Imágenes, Archivos o Grabador de Audio Real)</label>

                                <div className="grid grid-cols-2 gap-3">
                                  <label className="border border-gray-855 border-dashed rounded-lg p-3 flex flex-col items-center justify-center text-gray-400 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition cursor-pointer text-center">
                                    <UploadCloud size={18} className="mb-1 text-emerald-400" />
                                    <span className="text-[10px] font-semibold">Subir Archivo o Audio</span>
                                    <input
                                      type="file"
                                      accept="image/*,video/*,audio/*,application/pdf"
                                      className="hidden"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          const reader = new FileReader();
                                          reader.onload = (event) => {
                                            const dataUrl = event.target?.result as string;
                                            const type = file.type.startsWith('image') ? 'imagen' : file.type.startsWith('video') ? 'video' : file.type.startsWith('audio') ? 'audio' : 'archivo';
                                            const updated = [...remarketingAttachments];
                                            updated[stepIdx] = [{ name: file.name, type, url: dataUrl }];
                                            setRemarketingAttachments(updated);
                                          };
                                          reader.readAsDataURL(file);
                                        }
                                      }}
                                    />
                                  </label>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      // Toggle custom key for live recorder of this specific step
                                      const activeRecKey = `rec_step_${stepIdx}`;
                                      if ((window as any)._activeStepRecorder === activeRecKey) {
                                        delete (window as any)._activeStepRecorder;
                                      } else {
                                        (window as any)._activeStepRecorder = activeRecKey;
                                      }
                                      // Force component update
                                      setRemarketingMessages([...remarketingMessages]);
                                    }}
                                    className="border border-gray-855 border-dashed rounded-lg p-3 flex flex-col items-center justify-center text-gray-400 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition text-center"
                                  >
                                    <Mic size={18} className="mb-1 text-emerald-400" />
                                    <span className="text-[10px] font-semibold">Grabar Audio Real</span>
                                  </button>
                                </div>

                                {/* Active Live Audio Recorder for step */}
                                {(window as any)._activeStepRecorder === `rec_step_${stepIdx}` && (
                                  <div className="bg-black/40 border border-gray-800 p-3 rounded-lg animate-fade-in">
                                    <LiveAudioRecorder
                                      onSendVoiceNote={(voice) => {
                                        const updated = [...remarketingAttachments];
                                        updated[stepIdx] = [{ name: voice.name || 'Nota_de_voz_Remarketing.ogg', type: 'audio' as const, url: voice.dataUrl }];
                                        setRemarketingAttachments(updated);
                                        delete (window as any)._activeStepRecorder;
                                        setRemarketingMessages([...remarketingMessages]);
                                      }}
                                      onCancel={() => {
                                        delete (window as any)._activeStepRecorder;
                                        setRemarketingMessages([...remarketingMessages]);
                                      }}
                                      title="Grabar Nota de Voz de Remarketing (con ondas)"
                                    />
                                  </div>
                                )}

                                {/* Render Attachment previews */}
                                {stepAtts.length > 0 && (
                                  <div className="space-y-1.5 mt-2">
                                    {stepAtts.map((att: any, attIdx: number) => (
                                      <div key={attIdx} className="bg-black/60 border border-gray-855 rounded-lg p-2 flex items-center justify-between text-xs">
                                        <span className="text-gray-300 truncate font-mono text-[11px] flex items-center gap-1.5">
                                          {att.type === 'audio' ? <Mic size={12} className="text-emerald-400" /> : <Paperclip size={12} className="text-blue-400" />}
                                          {att.name}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const updated = [...remarketingAttachments];
                                            updated[stepIdx] = [];
                                            setRemarketingAttachments(updated);
                                          }}
                                          className="text-red-500 hover:text-red-400 font-bold"
                                        >
                                          &times;
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-gray-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleSaveRemarketing(
                    remarketingCount,
                    remarketingInterval,
                    remarketingAvoidSpam,
                    remarketingMessages,
                    remarketingUseAI,
                    remarketingAttachments
                  )}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-3 rounded-xl transition flex items-center gap-2 text-sm shadow-lg shadow-emerald-600/10 active:scale-95 animate-pulse"
                >
                  <Save size={16} /> Guardar Configuración de Remarketing
                </button>
              </div>
            </div>
          </div>
        )}


        {currentViewTab === 'training' && trainingSubTab === 'debug' && (
          <div className="space-y-6 animate-fade-in">
            {/* Header / Intro Banner */}
            <div className="panel p-6 rounded-2xl bg-gradient-to-r from-gray-900 via-[#0d1117] to-gray-900 border border-cyan-500/30 relative overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
                    <Terminal size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-bold text-white">Panel de Depuración & Diagnóstico OpenAI</h3>
                      <span className="px-2 py-0.5 text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-full font-mono uppercase tracking-wider font-semibold animate-pulse">
                        Tiempo Real
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 max-w-2xl">
                      Monitorea las llamadas a la API de OpenAI/Gemini, audita el consumo exacto de tokens (Prompt & Completion), mide latencias y diagnostica errores HTTP en vivo.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => setAutoRefreshDebugLogs(!autoRefreshDebugLogs)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                      autoRefreshDebugLogs
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                        : 'bg-gray-800/80 text-gray-400 border-gray-700'
                    }`}
                  >
                    <RefreshCw size={13} className={autoRefreshDebugLogs ? 'animate-spin' : ''} />
                    {autoRefreshDebugLogs ? 'Auto-refresh Activo' : 'Pausado'}
                  </button>
                  <button
                    onClick={fetchDebugLogs}
                    className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-gray-700"
                  >
                    <RefreshCw size={13} />
                    Refrescar
                  </button>
                  <button
                    onClick={handleClearDebugLogs}
                    className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Trash2 size={13} />
                    Limpiar Logs
                  </button>
                </div>
              </div>
            </div>

            {/* Metrics Dashboard Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Active Provider & Key Status */}
              <div className="panel p-5 rounded-2xl bg-[#0f1117] border border-gray-800 hover:border-gray-700 transition-all">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Proveedor Principal</span>
                  <span className={`w-2.5 h-2.5 rounded-full ${hasCustomKeySet ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-amber-500 animate-ping'}`} />
                </div>
                <div className="text-xl font-bold text-white capitalize flex items-center gap-2 mb-1">
                  {debugActiveProvider === 'openai' ? 'OpenAI (ChatGPT)' : debugActiveProvider === 'gemini' ? 'Google Gemini' : debugActiveProvider}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span className="bg-gray-800 px-2 py-0.5 rounded text-[11px] font-mono text-cyan-300">{debugActiveModel}</span>
                  <span className="text-[11px]">{hasCustomKeySet ? '🔑 API Key propia' : '⚠️ Clave genérica'}</span>
                </div>
              </div>

              {/* Total Tokens Consumed */}
              <div className="panel p-5 rounded-2xl bg-[#0f1117] border border-gray-800 hover:border-gray-700 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Tokens Usados</span>
                  <Zap size={14} className="text-yellow-400" />
                </div>
                <div className="text-xl font-bold text-white mb-1">
                  {debugTokens.total.toLocaleString()} <span className="text-xs text-gray-500 font-normal">/ {(debugMaxTokens / 1000).toFixed(0)}k max</span>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-gray-800 rounded-full h-1.5 mb-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-yellow-500 to-amber-400 h-1.5 rounded-full transition-all"
                    style={{ width: `${Math.min(100, ((debugTokens.total / debugMaxTokens) * 100)).toFixed(1)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-gray-400 font-mono">
                  <span>Prompt: {debugTokens.prompt.toLocaleString()}</span>
                  <span>Respuestas: {debugTokens.candidates.toLocaleString()}</span>
                </div>
              </div>

              {/* Total API Requests Logged */}
              <div className="panel p-5 rounded-2xl bg-[#0f1117] border border-gray-800 hover:border-gray-700 transition-all">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Total Peticiones</span>
                  <Bot size={14} className="text-blue-400" />
                </div>
                <div className="text-xl font-bold text-white mb-1">
                  {debugLogs.length} <span className="text-xs text-gray-500 font-normal">registradas</span>
                </div>
                <div className="flex items-center gap-3 text-[11px]">
                  <span className="text-emerald-400 font-semibold">
                    ✓ {debugLogs.filter(l => l.status === 'success').length} Exitosas
                  </span>
                  <span className="text-red-400 font-semibold">
                    ✗ {debugLogs.filter(l => l.status === 'error').length} Errores
                  </span>
                </div>
              </div>

              {/* Last API Health Status */}
              <div className="panel p-5 rounded-2xl bg-[#0f1117] border border-gray-800 hover:border-gray-700 transition-all">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Diagnóstico de Red</span>
                  {debugLastError ? (
                    <AlertTriangle size={14} className="text-red-400 animate-pulse" />
                  ) : (
                    <CheckCircle2 size={14} className="text-emerald-400" />
                  )}
                </div>
                {debugLastError ? (
                  <div>
                    <span className="text-xs font-semibold text-red-400 block truncate" title={debugLastError}>
                      🚨 Error de API
                    </span>
                    <span className="text-[10px] text-gray-500 truncate block mt-0.5">{debugLastError}</span>
                  </div>
                ) : (
                  <div>
                    <span className="text-xs font-semibold text-emerald-400 block">
                      ✅ API Operacional
                    </span>
                    <span className="text-[10px] text-gray-500 block mt-0.5">Respuestas normales y fluidas</span>
                  </div>
                )}
              </div>
            </div>

            {/* Interactive Live Connection Test Box */}
            <div className="panel p-6 rounded-2xl bg-[#0e1017] border border-blue-500/20 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <Zap size={18} className="text-blue-400" />
                  <h4 className="font-semibold text-white text-sm">Prueba Directa de API (Live Connection Tester)</h4>
                </div>
                <span className="text-[11px] text-gray-400">Verifica tu API Key sin enviar mensajes de WhatsApp</span>
              </div>

              <div className="flex flex-col md:flex-row gap-3">
                <input
                  type="text"
                  value={testPrompt}
                  onChange={(e) => setTestPrompt(e.target.value)}
                  placeholder="Escribe una pregunta para probar la API de OpenAI..."
                  className="flex-1 bg-black/60 border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-white focus:border-blue-500 outline-none font-mono"
                />
                <button
                  onClick={handleTestAiConnection}
                  disabled={isTestingAi}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shrink-0 shadow-[0_0_15px_rgba(79,70,229,0.3)]"
                >
                  {isTestingAi ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      Ejecutando Prueba...
                    </>
                  ) : (
                    <>
                      <Play size={14} />
                      Ejecutar Prueba con {activeProvider.toUpperCase()}
                    </>
                  )}
                </button>
              </div>

              {testResult && (
                <div className={`p-4 rounded-xl border text-xs font-mono transition-all ${
                  testResult.success
                    ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                    : 'bg-red-950/20 border-red-500/30 text-red-200'
                }`}>
                  <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      {testResult.success ? (
                        <CheckCircle2 size={16} className="text-emerald-400" />
                      ) : (
                        <AlertTriangle size={16} className="text-red-400" />
                      )}
                      <span className="font-bold">
                        {testResult.success ? '✅ Petición Exitosa (200 OK)' : '🚨 Fallo en la Petición'}
                      </span>
                    </div>
                    {testResult.durationMs && (
                      <span className="bg-black/40 px-2 py-0.5 rounded text-[10px] text-gray-300">
                        ⚡ Latencia: {testResult.durationMs} ms
                      </span>
                    )}
                  </div>

                  {testResult.success ? (
                    <div className="space-y-2">
                      <div>
                        <span className="text-gray-400 uppercase text-[10px] block font-sans font-semibold">Respuesta Generada por el Modelo ({testResult.model}):</span>
                        <div className="mt-1 bg-black/60 p-3 rounded-lg border border-emerald-500/20 text-gray-200 whitespace-pre-wrap max-h-40 overflow-y-auto">
                          {testResult.rawResponse}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <span className="text-gray-400 uppercase text-[10px] block font-sans font-semibold">Detalle del Error:</span>
                      <p className="mt-1 bg-black/60 p-3 rounded-lg border border-red-500/20 text-red-300 font-mono">
                        {testResult.error}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Live API Call Logs Table */}
            <div className="panel p-6 rounded-2xl bg-[#0c0d12] border border-gray-800 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-4">
                <div>
                  <h4 className="font-bold text-white text-sm flex items-center gap-2">
                    <Terminal size={16} className="text-cyan-400" />
                    Registro de Llamadas a la API en Tiempo Real (Live Traffic)
                  </h4>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Historial cronológico con código de respuesta, latencia en ms, consumo de tokens y payloads de entrada/salida.
                  </p>
                </div>

                {/* Filter Controls */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center bg-black border border-gray-800 rounded-xl p-1">
                    <button
                      onClick={() => setLogFilterStatus('all')}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors ${logFilterStatus === 'all' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                      Todos ({debugLogs.length})
                    </button>
                    <button
                      onClick={() => setLogFilterStatus('success')}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors ${logFilterStatus === 'success' ? 'bg-emerald-500/20 text-emerald-300' : 'text-gray-400 hover:text-white'}`}
                    >
                      Exitosos ({debugLogs.filter(l => l.status === 'success').length})
                    </button>
                    <button
                      onClick={() => setLogFilterStatus('error')}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors ${logFilterStatus === 'error' ? 'bg-red-500/20 text-red-300' : 'text-gray-400 hover:text-white'}`}
                    >
                      Errores ({debugLogs.filter(l => l.status === 'error').length})
                    </button>
                  </div>

                  <select
                    value={logFilterProvider}
                    onChange={(e: any) => setLogFilterProvider(e.target.value)}
                    className="bg-black border border-gray-800 rounded-xl px-3 py-1.5 text-xs text-gray-300 outline-none"
                  >
                    <option value="all">Todos los Proveedores</option>
                    <option value="openai">OpenAI</option>
                    <option value="gemini">Google Gemini</option>
                    <option value="openrouter">OpenRouter</option>
                  </select>
                </div>
              </div>

              {/* Log List */}
              {debugLogs.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-gray-800 rounded-2xl bg-black/20 space-y-3">
                  <Terminal size={32} className="mx-auto text-gray-600" />
                  <p className="text-xs text-gray-400">Aún no hay llamadas API registradas en esta sesión.</p>
                  <button
                    onClick={handleTestAiConnection}
                    className="px-4 py-2 bg-blue-600/20 text-blue-300 border border-blue-500/30 rounded-xl text-xs font-semibold hover:bg-blue-600/30 transition-colors"
                  >
                    Haz clic aquí para realizar la primera llamada de prueba
                  </button>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                  {debugLogs
                    .filter(log => logFilterStatus === 'all' || log.status === logFilterStatus)
                    .filter(log => logFilterProvider === 'all' || log.provider === logFilterProvider)
                    .map((log) => {
                      const isExpanded = expandedLogId === log.id;
                      return (
                        <div
                          key={log.id}
                          className={`rounded-xl border transition-all text-xs ${
                            log.status === 'success'
                              ? 'bg-[#0d1217] border-gray-800/80 hover:border-emerald-500/30'
                              : 'bg-red-950/10 border-red-500/30 hover:border-red-500/50'
                          }`}
                        >
                          {/* Item Header */}
                          <div
                            onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                            className="p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer select-none"
                          >
                            <div className="flex items-center gap-3">
                              {log.status === 'success' ? (
                                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                              ) : (
                                <span className="w-2 h-2 rounded-full bg-red-400 shrink-0 shadow-[0_0_8px_rgba(248,113,113,0.8)]" />
                              )}

                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-mono font-bold text-white uppercase text-[11px] bg-gray-800 px-2 py-0.5 rounded">
                                    {log.provider}
                                  </span>
                                  <span className="font-mono text-cyan-300 text-[11px]">
                                    {log.model}
                                  </span>
                                  <span className="text-gray-500 text-[10px] font-mono">
                                    {log.timeFormatted || log.timestamp}
                                  </span>
                                </div>
                                <p className="text-gray-300 text-xs mt-1 font-mono truncate max-w-md">
                                  {log.promptSnippet || log.promptFull}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0 text-right">
                              <div className="text-right font-mono text-[11px]">
                                <span className="text-gray-400 block">⚡ {log.durationMs} ms</span>
                                <span className="text-yellow-400 text-[10px]">
                                  {log.tokens?.total_tokens ? `${log.tokens.total_tokens} tokens` : 'N/A'}
                                </span>
                              </div>

                              <span className={`px-2 py-1 rounded-lg font-bold text-[10px] uppercase font-mono ${
                                log.status === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                              }`}>
                                {log.status === 'success' ? '200 OK' : 'ERROR'}
                              </span>

                              <span className="text-gray-500 text-xs hover:text-white transition-colors">
                                {isExpanded ? '▲' : '▼'}
                              </span>
                            </div>
                          </div>

                          {/* Expanded Content */}
                          {isExpanded && (
                            <div className="p-4 border-t border-gray-800/80 bg-black/50 space-y-3 font-mono text-[11px]">
                              {/* Token details */}
                              {log.tokens && (
                                <div className="grid grid-cols-3 gap-2 bg-gray-900/60 p-2.5 rounded-lg border border-gray-800 text-center font-sans text-xs">
                                  <div>
                                    <span className="text-[10px] text-gray-500 uppercase block">Prompt Tokens</span>
                                    <span className="font-bold text-gray-200">{log.tokens.prompt_tokens || 0}</span>
                                  </div>
                                  <div>
                                    <span className="text-[10px] text-gray-500 uppercase block">Completion Tokens</span>
                                    <span className="font-bold text-gray-200">{log.tokens.completion_tokens || 0}</span>
                                  </div>
                                  <div>
                                    <span className="text-[10px] text-gray-500 uppercase block">Total Petición</span>
                                    <span className="font-bold text-yellow-400">{log.tokens.total_tokens || 0}</span>
                                  </div>
                                </div>
                              )}

                              <div>
                                <span className="text-gray-400 text-[10px] uppercase block font-sans font-semibold mb-1">Prompt Enviado a la API:</span>
                                <div className="bg-black p-3 rounded-lg border border-gray-800 text-gray-300 max-h-48 overflow-y-auto whitespace-pre-wrap">
                                  {log.promptFull}
                                </div>
                              </div>

                              {log.status === 'success' ? (
                                <div>
                                  <span className="text-emerald-400 text-[10px] uppercase block font-sans font-semibold mb-1">Respuesta Retornada por la API:</span>
                                  <div className="bg-black p-3 rounded-lg border border-emerald-500/20 text-emerald-200 max-h-48 overflow-y-auto whitespace-pre-wrap">
                                    {log.responseFull || log.responseSnippet}
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  <span className="text-red-400 text-[10px] uppercase block font-sans font-semibold mb-1">Mensaje de Error Retornado:</span>
                                  <div className="bg-red-950/30 p-3 rounded-lg border border-red-500/30 text-red-300">
                                    {log.error}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        )}


        {currentViewTab === 'training' && trainingSubTab === 'ai_models' && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-white mb-4">Integraciones de IA y Plataformas</h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* OpenAI Integration */}
              <div className="panel p-6 rounded-2xl flex flex-col space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400">
                    <Database size={20} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">OpenAI (ChatGPT)</h4>
                    <p className="text-[10px] text-gray-500">Modelos GPT-4o, GPT-3.5</p>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-gray-400 uppercase tracking-widest mb-1 block">API Key</label>
                  <input type="password" placeholder="sk-..." value={openAiKey} onChange={(e) => setOpenAiKey(e.target.value)} className="w-full bg-[#111] border border-gray-800 rounded-xl p-2 text-xs text-white focus:border-green-500 outline-none" />
                </div>

                <div className="flex gap-2">
                  <button onClick={() => handleSaveAIConfig('openai')} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white text-xs font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-2">
                    <Shield size={14} /> Guardar
                  </button>
                  <button onClick={() => { setTrainingSubTab('debug'); handleTestAiConnection(); }} className="flex-1 bg-cyan-600/20 text-cyan-400 border border-cyan-600/30 hover:bg-cyan-600/30 text-xs font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-2">
                    <Terminal size={14} /> Probar & Depurar API
                  </button>
                </div>
              </div>

              {/* Google Integration */}
              <div className="panel p-6 rounded-2xl flex flex-col space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                    <Database size={20} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Google AI Studio</h4>
                    <p className="text-[10px] text-gray-500">Modelos Gemini 1.5 Pro, Flash</p>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-gray-400 uppercase tracking-widest mb-1 block">API Key</label>
                  <input type="password" placeholder="AIzaSy..." value={googleAiKey} onChange={(e) => setGoogleAiKey(e.target.value)} className="w-full bg-[#111] border border-gray-800 rounded-xl p-2 text-xs text-white focus:border-blue-500 outline-none" />
                </div>

                <div className="flex gap-2">
                  <button onClick={() => handleSaveAIConfig('gemini')} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white text-xs font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-2">
                    <Shield size={14} /> Guardar
                  </button>
                  <button className="flex-1 bg-blue-600/20 text-blue-400 border border-blue-600/30 hover:bg-blue-600/30 text-xs font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-2">
                    <Zap size={14} /> Verificar API
                  </button>
                </div>
              </div>
            </div>

            <div className="panel p-6 rounded-2xl">
              <h4 className="font-semibold text-white mb-4">Configuración del Agente</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-gray-400 uppercase tracking-widest mb-1 block">Proveedor Activo</label>
                  <select value={activeProvider} onChange={(e) => setActiveProvider(e.target.value)} className="w-full bg-[#111] border border-gray-800 rounded-xl p-2 text-xs text-white outline-none">
                    <option value="openai">OpenAI</option>
                    <option value="gemini">Google Gemini</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 uppercase tracking-widest mb-1 block">Modelo Activo</label>
                  <select value={activeModel} onChange={(e) => setActiveModel(e.target.value)} className="w-full bg-[#111] border border-gray-800 rounded-xl p-2 text-xs text-white outline-none">
                    <option value="gpt-4o">GPT-4o (Recomendado)</option>
                    <option value="gpt-4o-mini">GPT-4o Mini</option>
                    <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                    <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="panel p-6 rounded-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-10">
                 <Database size={100} />
               </div>
               <h4 className="font-semibold text-white mb-6 flex items-center gap-2"><Zap size={18} className="text-yellow-500" /> Consumo y Tokens</h4>

               <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative z-10">
                  <div className="bg-[#111] border border-gray-800 rounded-xl p-4">
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Tokens Entrada (Mes)</p>
                    <p className="text-xl font-bold font-mono text-white">{apiTokens?.prompt?.toLocaleString() || '0'}</p>
                    <p className="text-[10px] text-gray-400 mt-1">~$0.00 USD</p>
                  </div>
                  <div className="bg-[#111] border border-gray-800 rounded-xl p-4">
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Tokens Salida (Mes)</p>
                    <p className="text-xl font-bold font-mono text-white">{apiTokens?.candidates?.toLocaleString() || '0'}</p>
                    <p className="text-[10px] text-gray-400 mt-1">~$0.00 USD</p>
                  </div>
                  <div className="bg-[#111] border border-gray-800 rounded-xl p-4">
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Total Tokens</p>
                    <p className="text-xl font-bold font-mono text-blue-400">{(apiTokens?.total || 0).toLocaleString()}</p>
                  </div>
                  <div className="bg-[#111] border border-gray-800 rounded-xl p-4 flex flex-col justify-between">
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Saldo Disponible</p>
                      <p className="text-xl font-bold font-mono text-green-400">$89.22 <span className="text-xs">USD</span></p>
                    </div>
                    <div className="mt-2 text-right">
                      <button className="text-[10px] bg-green-600 hover:bg-green-500 text-white px-2 py-1 rounded transition-colors">
                        Recargar Saldo
                      </button>
                    </div>
                  </div>
               </div>

               <div className="mt-6">
                 <div className="flex justify-between items-center mb-1">
                   <span className="text-[10px] text-gray-400">Porcentaje de consumo (Limite mensual: $100)</span>
                   <span className="text-[10px] font-bold text-white">10.78%</span>
                 </div>
                 <div className="w-full bg-gray-900 rounded-full h-2.5 overflow-hidden">
                   <div className="bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 h-2.5 rounded-full" style={{ width: '10.78%' }}></div>
                 </div>
               </div>
            </div>

            <h3 className="text-lg font-bold text-white mt-8 mb-4">Sistemas Exteriores de E-commerce</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { name: 'Dropi', status: 'Conectado', color: 'bg-green-500', icon: '📦' },
                { name: 'MasterShop', status: 'Desconectado', color: 'bg-gray-600', icon: '🛒' },
                { name: 'Effix', status: 'Desconectado', color: 'bg-gray-600', icon: '🚀' },
                { name: 'Shopify API', status: 'Configure API Key', color: 'bg-blue-500', icon: '🛍️' },
              ].map((platform, i) => (
                <div key={i} className="panel p-5 rounded-2xl flex flex-col items-center text-center group cursor-pointer hover:border-gray-600 transition-colors">
                  <div className="text-3xl mb-3 opacity-90 group-hover:scale-110 transition-transform">{platform.icon}</div>
                  <h4 className="font-semibold text-white text-sm mb-1">{platform.name}</h4>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${platform.color}`}></div>
                    <span className="text-[10px] text-gray-400">{platform.status}</span>
                  </div>
                </div>
              ))}

              <div className="col-span-1 sm:col-span-2 lg:col-span-4 panel p-6 rounded-2xl bg-gradient-to-r from-[#111] to-black border-gray-800 mt-4">
                 <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2"><Zap size={16} className="text-green-500" /> Webhooks Dinámicos</h3>
                 <p className="text-xs text-gray-400 mb-4">Conecta eventos y pedidos del bot hacia cualquier CRM, Google Sheets, o plataforma de fulfillment mediante HTTP POST.</p>
                 <div className="bg-black border border-gray-800 rounded p-3 flex items-center justify-between">
                    <code className="text-xs text-green-400 font-mono focus:outline-none bg-transparent">https://api.tu-app.com/webhooks/bot-1293</code>
                    <button className="text-xs bg-gray-800 hover:bg-gray-700 text-white px-3 py-1 rounded transition">Copiar URL</button>
                 </div>
              </div>
            </div>
          </div>
        )}

        {false && (
          <div className="space-y-6 animate-fade-in text-left">
            {/* Header Banner */}
            <div className="bg-[#0c0c0c] border border-gray-800 rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-5">
                <Smartphone size={120} />
              </div>
              <div className="max-w-2xl relative z-10 text-left">
                <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>
                  API de WhatsApp Cloud & Canales Sociales Reales
                </h3>
                <p className="text-sm text-gray-400">
                  Vincule su cuenta comercial de Meta (WABA) de forma directa sin necesidad de introducir códigos manuales o configuraciones tediosas. También podrá integrar sus cuentas reales de Facebook, Instagram y TikTok para automatizar sus bandejas de entrada.
                </p>
              </div>
            </div>

            {/* Connection Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* WhatsApp Cloud API Connection Block */}
              <div className="lg:col-span-2 panel p-6 rounded-2xl space-y-4 text-left border border-gray-800">
                <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                  <h4 className="font-bold text-white flex items-center gap-2 text-sm">
                    <Smartphone size={16} className="text-green-500" /> 1. Conexión de WhatsApp al Portafolio Comercial
                  </h4>
                  <span className="text-[10px] bg-green-500/10 text-green-400 px-2.5 py-0.5 rounded-full border border-green-500/20 font-bold">Oficial & Directo</span>
                </div>

                {!isOfficialConnected ? (
                  <div className="space-y-4">
                    <p className="text-xs text-gray-400">
                      Seleccione cómo desea registrar su número de WhatsApp en su Portafolio Comercial de Meta (Business Manager) antes de iniciar sesión:
                    </p>

                    {/* Quick Mode Options Selection */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* Coexistente */}
                      <button
                        onClick={() => setWhatsappMode('coexistente')}
                        className={`p-4 rounded-xl border text-left transition-all ${
                          whatsappMode === 'coexistente'
                            ? 'bg-green-500/5 border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.1)]'
                            : 'bg-[#111] border-gray-800 hover:border-gray-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-white">Número Coexistente</span>
                          <span className={`w-3 h-3 rounded-full border ${whatsappMode === 'coexistente' ? 'bg-green-500 border-green-500' : 'border-gray-600'}`}></span>
                        </div>
                        <p className="text-[10px] text-gray-400 leading-relaxed">
                          Usa tu número activo actual. Sigue chateando desde el celular, conviviendo con el Bot AI sin pérdida de chats ni códigos SMS.
                        </p>
                      </button>

                      {/* Nuevo */}
                      <button
                        onClick={() => setWhatsappMode('nuevo')}
                        className={`p-4 rounded-xl border text-left transition-all ${
                          whatsappMode === 'nuevo'
                            ? 'bg-green-500/5 border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.1)]'
                            : 'bg-[#111] border-gray-800 hover:border-gray-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-white">Línea Nueva</span>
                          <span className={`w-3 h-3 rounded-full border ${whatsappMode === 'nuevo' ? 'bg-green-500 border-green-500' : 'border-gray-600'}`}></span>
                        </div>
                        <p className="text-[10px] text-gray-400 leading-relaxed">
                          Crea o asigna un número limpio y exclusivo para que la IA atienda al 100% las ventas de tu tienda.
                        </p>
                      </button>

                      {/* Transferir */}
                      <button
                        onClick={() => setWhatsappMode('transferir')}
                        className={`p-4 rounded-xl border text-left transition-all ${
                          whatsappMode === 'transferir'
                            ? 'bg-green-500/5 border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.1)]'
                            : 'bg-[#111] border-gray-800 hover:border-gray-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-white">Transferir Número</span>
                          <span className={`w-3 h-3 rounded-full border ${whatsappMode === 'transferir' ? 'bg-green-500 border-green-500' : 'border-gray-600'}`}></span>
                        </div>
                        <p className="text-[10px] text-gray-400 leading-relaxed">
                          Migra tu número de WhatsApp Messenger clásico hacia la API oficial de la nube automáticamente.
                        </p>
                      </button>
                    </div>

                    {/* Connection Action Button */}
                    <div className="bg-[#111] border border-gray-800 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="space-y-1 text-center sm:text-left">
                        <h5 className="text-xs font-bold text-white">Método Recomendado: Embedded Signup</h5>
                        <p className="text-[10px] text-gray-400">Inicia sesión en Facebook, elige tu portafolio y listo. Meta genera las llaves automáticamente.</p>
                      </div>
                      <button
                        onClick={() => {
                          const w = 550, h = 680;
                          const left = window.screen.width / 2 - w / 2;
                          const top = window.screen.height / 2 - h / 2;
                          window.open(`${window.location.origin}/auth/meta-whatsapp?mode=${whatsappMode}`, 'MetaWabaConnection', `width=${w},height=${h},top=${top},left=${left}`);
                        }}
                        className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-5 py-3 rounded-xl flex items-center gap-2 transition shadow-lg shadow-blue-600/15"
                      >
                        <Facebook size={16} /> Vincular con Facebook
                      </button>
                    </div>

                    {/* Developer Manual Toggle */}
                    <div className="border-t border-gray-850 pt-4">
                      <details className="group">
                        <summary className="text-xs text-gray-500 hover:text-gray-400 cursor-pointer outline-none list-none flex items-center gap-1">
                          <span className="transition-transform group-open:rotate-90">▶</span> Configuración Manual Avanzada (Para Desarrolladores)
                        </summary>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 pl-3">
                          <div className="md:col-span-2">
                            <label className="text-[9px] text-gray-500 uppercase tracking-wider mb-1 block">Token de Acceso Permanente (System User Token)</label>
                            <input
                              type="password"
                              value={apiToken}
                              onChange={(e) => setApiToken(e.target.value)}
                              className="w-full bg-black border border-gray-800 rounded-xl p-3 text-xs text-white focus:border-green-500 outline-none font-mono"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] text-gray-500 uppercase tracking-wider mb-1 block">Phone Number ID</label>
                            <input
                              type="text"
                              value={phoneNumberId}
                              onChange={(e) => setPhoneNumberId(e.target.value)}
                              className="w-full bg-black border border-gray-800 rounded-xl p-3 text-xs text-white focus:border-green-500 outline-none font-mono"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] text-gray-500 uppercase tracking-wider mb-1 block">WABA ID (ID de Cuenta Comercial)</label>
                            <input
                              type="text"
                              value={wabaId}
                              onChange={(e) => setWabaId(e.target.value)}
                              className="w-full bg-black border border-gray-800 rounded-xl p-3 text-xs text-white focus:border-green-500 outline-none font-mono"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <button
                              onClick={() => {
                                setIsOfficialConnected(true);
                                setWhatsappConnectedNumber('+57 300 000 0000');
                              }}
                              className="w-full bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold py-2.5 rounded-xl transition"
                            >
                              Guardar Parámetros Manuales
                            </button>
                          </div>
                        </div>
                      </details>
                    </div>
                  </div>
                ) : (
                  // Connected State Status Board
                  <div className="space-y-4 animate-scale-up">
                    <div className="bg-green-500/10 border border-green-500/20 p-5 rounded-2xl flex items-center justify-between flex-wrap gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center text-green-400">
                          <CheckCircle2 size={24} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h5 className="font-bold text-white text-sm">WhatsApp Cloud API Conectado</h5>
                            <span className="text-[9px] bg-green-500/20 text-green-300 border border-green-500/30 px-2 py-0.5 rounded font-mono font-bold uppercase">Activo</span>
                          </div>
                          <p className="text-xs text-green-400/80 font-semibold mt-0.5">
                            Línea: {whatsappConnectedNumber || '+57 300 123 4567'} • Modo {whatsappMode.toUpperCase()}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setIsOfficialConnected(false);
                          setWhatsappConnectedNumber('');
                          // Clear remote
                          fetch('/api/integrations/meta-tiktok/save-whatsapp-oauth', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ connectedUser: null })
                          });
                        }}
                        className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-bold px-4 py-2 rounded-xl transition"
                      >
                        Desconectar Canal
                      </button>
                    </div>

                    {/* Metadata Board */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="bg-[#111] border border-gray-850 p-3 rounded-xl text-left">
                        <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">WABA ID</p>
                        <p className="text-xs font-mono text-gray-300 mt-1">{wabaId}</p>
                      </div>
                      <div className="bg-[#111] border border-gray-850 p-3 rounded-xl text-left">
                        <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">Phone Number ID</p>
                        <p className="text-xs font-mono text-gray-300 mt-1">{phoneNumberId}</p>
                      </div>
                      <div className="bg-[#111] border border-gray-850 p-3 rounded-xl text-left">
                        <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">Token de Conexión</p>
                        <p className="text-xs font-mono text-gray-300 mt-1 truncate">{apiToken}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Real Multichannel Channels */}
              <div className="panel p-6 rounded-2xl space-y-4 text-left border border-gray-800">
                <div className="border-b border-gray-800 pb-3">
                  <h4 className="font-bold text-white flex items-center gap-2 text-sm">
                    <Globe size={16} className="text-blue-400" /> 2. Redes Sociales Reales
                  </h4>
                  <p className="text-xs text-gray-400 mt-0.5">Vincule sus cuentas comerciales para automatizar mensajes privados de inmediato.</p>
                </div>

                <div className="space-y-3">
                  {/* Facebook Messenger */}
                  <div className="bg-[#111] border border-gray-850 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-600/10 border border-blue-600/20 flex items-center justify-center text-blue-500">
                        <Facebook size={18} />
                      </div>
                      <div className="text-left">
                        <h5 className="text-xs font-bold text-white">Facebook Messenger</h5>
                        <p className="text-[10px] text-gray-400">{facebookConnected ? 'Conectado a Página Real' : 'Desconectado'}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (facebookConnected) {
                          setFacebookConnected(false);
                        } else {
                          const w = 550, h = 650;
                          const left = window.screen.width / 2 - w / 2;
                          const top = window.screen.height / 2 - h / 2;
                          window.open(`${window.location.origin}/auth/meta`, 'MetaConnection', `width=${w},height=${h},top=${top},left=${left}`);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                        facebookConnected
                          ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20'
                          : 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm'
                      }`}
                    >
                      {facebookConnected ? 'Desconectar' : 'Conectar'}
                    </button>
                  </div>

                  {/* Instagram Direct */}
                  <div className="bg-[#111] border border-gray-850 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-600/10 border border-blue-600/20 flex items-center justify-center text-blue-500">
                        <Instagram size={18} />
                      </div>
                      <div className="text-left">
                        <h5 className="text-xs font-bold text-white">Instagram Direct</h5>
                        <p className="text-[10px] text-gray-400">{instagramConnected ? 'Conectado a Cuenta IG Real' : 'Desconectado'}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (instagramConnected) {
                          setInstagramConnected(false);
                        } else {
                          const w = 550, h = 650;
                          const left = window.screen.width / 2 - w / 2;
                          const top = window.screen.height / 2 - h / 2;
                          window.open(`${window.location.origin}/auth/meta`, 'MetaConnection', `width=${w},height=${h},top=${top},left=${left}`);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                        instagramConnected
                          ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20'
                          : 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm'
                      }`}
                    >
                      {instagramConnected ? 'Desconectar' : 'Conectar'}
                    </button>
                  </div>

                  {/* TikTok DM */}
                  <div className="bg-[#111] border border-gray-850 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-600/10 border border-blue-600/20 flex items-center justify-center text-blue-400">
                        <Video size={18} />
                      </div>
                      <div className="text-left">
                        <h5 className="text-xs font-bold text-white">TikTok Business</h5>
                        <p className="text-[10px] text-gray-400">{tiktokConnected ? 'Conectado a TikTok API Real' : 'Desconectado'}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (tiktokConnected) {
                          setTiktokConnected(false);
                        } else {
                          const w = 550, h = 650;
                          const left = window.screen.width / 2 - w / 2;
                          const top = window.screen.height / 2 - h / 2;
                          window.open(`${window.location.origin}/auth/tiktok`, 'TikTokConnection', `width=${w},height=${h},top=${top},left=${left}`);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                        tiktokConnected
                          ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20'
                          : 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm'
                      }`}
                    >
                      {tiktokConnected ? 'Desconectar' : 'Conectar'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Template management and testing section (WhatsApp Cloud API specific) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

              {/* Plantillas oficiales columns */}
              <div className="lg:col-span-7 panel p-6 rounded-2xl space-y-6 border border-gray-800 text-left">
                <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                  <div className="space-y-1">
                    <h4 className="font-bold text-white flex items-center gap-2 text-sm">
                      <FileText size={16} className="text-green-500" /> Plantillas de Mensajes Autorizadas (HSM)
                    </h4>
                    <p className="text-xs text-gray-400">Selecciona o haz clic en una plantilla para editarla o visualizarla en el smartphone en tiempo real.</p>
                  </div>
                  <span className="text-[10px] bg-green-500/10 text-green-400 px-2.5 py-0.5 rounded-full border border-green-500/20 font-bold font-mono shrink-0">Meta Aprobado</span>
                </div>

                {/* Templates list with Media Indicators */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[320px] overflow-y-auto pr-1">
                  {templates.map((tpl: any) => {
                    const isSelected = selectedTemplate === tpl.name;
                    return (
                      <div
                        key={tpl.id}
                        onClick={() => {
                          setSelectedTemplate(tpl.name);
                          setTemplateFormMode('edit');
                        }}
                        className={`border rounded-xl p-3.5 space-y-2 text-left transition-all cursor-pointer relative group ${
                          isSelected
                            ? 'bg-green-500/5 border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.08)]'
                            : 'bg-[#111] border-gray-850 hover:border-gray-700 hover:bg-[#141414]'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px] gap-2">
                          <span className="font-bold text-white font-mono truncate max-w-[130px]">{tpl.name}</span>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-[9px] bg-gray-850 px-1.5 py-0.5 rounded text-gray-400 uppercase tracking-wider font-semibold">{tpl.category}</span>
                            <span className="text-[9px] bg-green-500/15 text-green-400 px-1.5 py-0.5 rounded font-bold uppercase">Aprobado</span>
                          </div>
                        </div>

                        <p className="text-[11px] text-gray-400 bg-black/40 p-2.5 rounded-lg leading-relaxed border border-gray-900 line-clamp-2">
                          {tpl.body}
                        </p>

                        {/* Footer indicator */}
                        <div className="flex items-center justify-between pt-1 border-t border-gray-900 text-[10px]">
                          <span className="text-gray-500 flex items-center gap-1">
                            {tpl.headerType === 'NONE' && <span className="text-gray-600">❌ Sin multimedia</span>}
                            {tpl.headerType === 'IMAGE' && <span className="text-blue-400 flex items-center gap-1"><ImageIcon size={10} /> 🖼️ Imagen</span>}
                            {tpl.headerType === 'VIDEO' && <span className="text-blue-400 flex items-center gap-1"><Video size={10} /> 🎥 Video</span>}
                            {tpl.headerType === 'DOCUMENT' && <span className="text-red-400 flex items-center gap-1"><FileText size={10} /> 📄 Documento</span>}
                          </span>
                          <span className="text-[9px] text-gray-500 font-mono group-hover:text-green-400 transition-colors">
                            {isSelected ? 'Seleccionado ✓' : 'Ver / Editar'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Form and Drag & Drop Workspace */}
                <div className="border-t border-gray-800 pt-5 space-y-4">

                  {/* Mode Toggles */}
                  <div className="flex bg-black/40 p-1 rounded-xl border border-gray-850">
                    <button
                      type="button"
                      onClick={() => setTemplateFormMode('create')}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition ${
                        templateFormMode === 'create'
                          ? 'bg-green-600/10 text-green-400 border border-green-500/20'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <Plus size={14} /> Crear Nueva Plantilla (Meta API)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTemplateFormMode('edit')}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition ${
                        templateFormMode === 'edit'
                          ? 'bg-green-600/10 text-green-400 border border-green-500/20'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <Settings size={14} /> Gestionar y Editar Seleccionada
                    </button>
                  </div>

                  {templateFormMode === 'create' ? (
                    /* CREATE MODE FORM */
                    <div className="space-y-4 animate-fade-in">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] text-gray-400 block mb-1 font-bold uppercase tracking-wider">Nombre de la Plantilla</label>
                          <input
                            type="text"
                            placeholder="ej: confirmacion_entrega"
                            value={newTemplateName}
                            onChange={(e) => setNewTemplateName(e.target.value)}
                            className="w-full bg-[#111] border border-gray-800 rounded-xl p-2.5 text-xs text-white focus:border-green-500 outline-none font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-400 block mb-1 font-bold uppercase tracking-wider">Categoría Meta HSM</label>
                          <select
                            value={newTemplateCategory}
                            onChange={(e) => setNewTemplateCategory(e.target.value)}
                            className="w-full bg-[#111] border border-gray-800 rounded-xl p-2.5 text-xs text-white focus:border-green-500 outline-none"
                          >
                            <option value="UTILITY">Utilidad (Pedidos, Alertas, Soporte)</option>
                            <option value="MARKETING">Marketing (Promociones, Descuentos)</option>
                          </select>
                        </div>
                      </div>

                      {/* Drag and Drop Zone */}
                      <div className="space-y-2">
                        <label className="text-[10px] text-gray-400 block font-bold uppercase tracking-wider">Cabecera de Plantilla (Multimedia Drag & Drop)</label>
                        <div
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                          onClick={() => fileInputRef.current?.click()}
                          className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all relative overflow-hidden ${
                            isDragging
                              ? 'border-green-500 bg-green-500/10 shadow-[0_0_15px_rgba(34,197,94,0.15)]'
                              : 'border-gray-800 bg-black/40 hover:border-gray-750 hover:bg-black/60'
                          }`}
                        >
                          <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            accept="image/*,video/*,application/pdf"
                            className="hidden"
                          />
                          <UploadCloud className={`mx-auto mb-2 w-8 h-8 transition-colors ${isDragging ? 'text-green-400 animate-pulse' : 'text-gray-500'}`} />
                          <p className="text-xs font-bold text-gray-200">
                            {isDragging ? '¡Suelta tu archivo aquí mismo!' : 'Arrastra y suelta tu archivo multimedia o haz clic aquí'}
                          </p>
                          <p className="text-[10px] text-gray-400 mt-1">
                            Formatos soportados: <span className="text-gray-300 font-semibold">Imágenes, Videos (MP4) o Documentos (PDF)</span> de hasta 16 MB.
                          </p>
                        </div>
                      </div>

                      {/* Display Selected Media Indicator in Creation Form */}
                      {newTemplateHeaderType !== 'NONE' && newTemplateHeaderUrl && (
                        <div className="bg-[#111] border border-gray-850 rounded-xl p-3 flex items-center justify-between gap-3 animate-scale-up">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {newTemplateHeaderType === 'IMAGE' && (
                              <img src={newTemplateHeaderUrl} alt="New Thumbnail" className="w-10 h-10 rounded object-cover border border-gray-800" referrerPolicy="no-referrer" />
                            )}
                            {newTemplateHeaderType === 'VIDEO' && (
                              <div className="w-10 h-10 rounded bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
                                <Video size={16} />
                              </div>
                            )}
                            {newTemplateHeaderType === 'DOCUMENT' && (
                              <div className="w-10 h-10 rounded bg-red-500/10 flex items-center justify-center text-red-400 border border-red-500/20">
                                <FileText size={16} />
                              </div>
                            )}
                            <div className="text-left min-w-0">
                              <p className="text-xs font-bold text-white truncate">
                                {newTemplateHeaderUrl.startsWith('blob:') ? '📂 Archivo Multimedia Cargado' : 'URL Remota Cargada'}
                              </p>
                              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold font-mono">
                                {newTemplateHeaderType} • Vinculado
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setNewTemplateHeaderType('NONE');
                              setNewTemplateHeaderUrl('');
                            }}
                            className="bg-red-500/10 hover:bg-red-500/20 text-red-400 p-1.5 rounded-lg border border-red-500/20 transition"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      )}

                      {/* Advanced Manual Header URLs Collapse */}
                      <div>
                        <details className="group">
                          <summary className="text-[10px] text-gray-500 hover:text-gray-400 cursor-pointer outline-none list-none flex items-center gap-1 select-none">
                            <span className="transition-transform group-open:rotate-90 text-[8px]">▶</span> Usar URL de Archivo Remoto (Manual / Alternativo)
                          </summary>
                          <div className="space-y-3 mt-2.5 pl-3 border-l border-gray-850">
                            <div className="flex gap-2">
                              {[
                                { type: 'IMAGE', label: 'Imagen Preset 🖼️', url: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=400&q=80' },
                                { type: 'VIDEO', label: 'Video Preset 🎥', url: 'https://assets.mixkit.co/videos/preview/mixkit-card-payment-in-a-shop-40243-large.mp4' },
                                { type: 'DOCUMENT', label: 'PDF Preset 📄', url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' }
                              ].map((opt) => (
                                <button
                                  key={opt.type}
                                  type="button"
                                  onClick={() => {
                                    setNewTemplateHeaderType(opt.type as any);
                                    setNewTemplateHeaderUrl(opt.url);
                                  }}
                                  className="p-1.5 rounded bg-[#111] hover:bg-[#151515] text-[10px] font-bold text-gray-400 border border-gray-850 flex-1 hover:border-gray-700"
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                            <input
                              type="text"
                              placeholder="Pega la URL de tu archivo (ej: https://...)"
                              value={newTemplateHeaderUrl}
                              onChange={(e) => {
                                setNewTemplateHeaderUrl(e.target.value);
                                if (e.target.value) {
                                  // Auto-detect header type from URL
                                  const lowercaseUrl = e.target.value.toLowerCase();
                                  if (lowercaseUrl.match(/\.(jpg|jpeg|png|webp|gif)/)) {
                                    setNewTemplateHeaderType('IMAGE');
                                  } else if (lowercaseUrl.match(/\.(mp4|mov|webm)/)) {
                                    setNewTemplateHeaderType('VIDEO');
                                  } else if (lowercaseUrl.includes('.pdf')) {
                                    setNewTemplateHeaderType('DOCUMENT');
                                  }
                                }
                              }}
                              className="w-full bg-[#111] border border-gray-800 rounded-lg p-2.5 text-xs text-white focus:border-green-500 outline-none font-mono"
                            />
                          </div>
                        </details>
                      </div>

                      <div>
                        <label className="text-[10px] text-gray-400 block mb-1 font-bold uppercase tracking-wider">Cuerpo del Mensaje (Soporta variables con {"{{1}}"}, {"{{2}}"})</label>
                        <textarea
                          placeholder="Ej: Hola {{1}}! Tu orden de {{2}} fue aprobada con éxito. Código: {{3}}."
                          value={newTemplateBody}
                          onChange={(e) => setNewTemplateBody(e.target.value)}
                          className="w-full bg-[#111] border border-gray-800 rounded-xl p-3 text-xs text-white focus:border-green-500 outline-none h-20 resize-none font-sans"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (!newTemplateName || !newTemplateBody) {
                            alert('Por favor complete el nombre y el cuerpo del mensaje.');
                            return;
                          }
                          const formattedName = newTemplateName.toLowerCase().replace(/\s+/g, '_');
                          const nextId = String(templates.length + 1);
                          setTemplates([...templates, {
                            id: nextId,
                            name: formattedName,
                            category: newTemplateCategory,
                            language: 'es',
                            status: 'APPROVED',
                            body: newTemplateBody,
                            headerType: newTemplateHeaderType,
                            headerUrl: newTemplateHeaderUrl
                          }]);
                          setSelectedTemplate(formattedName);
                          setNewTemplateName('');
                          setNewTemplateBody('');
                          setNewTemplateHeaderType('NONE');
                          setNewTemplateHeaderUrl('');
                          setTemplateFormMode('edit');
                        }}
                        className="w-full bg-green-600 hover:bg-green-500 text-white text-xs font-bold py-3 rounded-xl transition-all shadow-lg shadow-green-600/10 flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 size={16} /> Crear y Enviar Plantilla a Meta (Aprobación Instantánea)
                      </button>
                    </div>
                  ) : (
                    /* EDIT MODE FORM */
                    (() => {
                      const activeTpl = templates.find((t: any) => t.name === selectedTemplate) || templates[0];
                      if (!activeTpl) {
                        return (
                          <div className="bg-[#111] border border-gray-800 p-6 rounded-xl text-center text-xs text-gray-500">
                            No hay ninguna plantilla seleccionada. Elige una de la lista superior para editarla.
                          </div>
                        );
                      }
                      return (
                        <div className="space-y-4 animate-fade-in text-left">
                          <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-3 flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-300">
                              Editando Plantilla: <span className="font-mono text-green-400">{activeTpl.name}</span>
                            </span>
                            <span className="text-[10px] bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded-full font-bold">Autoguardado</span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="text-[10px] text-gray-400 block mb-1 font-bold uppercase tracking-wider">Nombre de Plantilla (Meta ID)</label>
                              <input
                                type="text"
                                value={activeTpl.name}
                                onChange={(e) => {
                                  const updatedVal = e.target.value.toLowerCase().replace(/\s+/g, '_');
                                  setTemplates(prev => prev.map(t => t.id === activeTpl.id ? { ...t, name: updatedVal } : t));
                                  setSelectedTemplate(updatedVal);
                                }}
                                className="w-full bg-[#111] border border-gray-800 rounded-xl p-2.5 text-xs text-white focus:border-green-500 outline-none font-mono"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-gray-400 block mb-1 font-bold uppercase tracking-wider">Categoría Meta HSM</label>
                              <select
                                value={activeTpl.category}
                                onChange={(e) => {
                                  const updatedVal = e.target.value;
                                  setTemplates(prev => prev.map(t => t.id === activeTpl.id ? { ...t, category: updatedVal } : t));
                                }}
                                className="w-full bg-[#111] border border-gray-800 rounded-xl p-2.5 text-xs text-white focus:border-green-500 outline-none"
                              >
                                <option value="UTILITY">Utilidad (Pedidos, Alertas, Soporte)</option>
                                <option value="MARKETING">Marketing (Promociones, Descuentos)</option>
                              </select>
                            </div>
                          </div>

                          {/* Drag and Drop Zone for Edit Mode */}
                          <div className="space-y-2">
                            <label className="text-[10px] text-gray-400 block font-bold uppercase tracking-wider">Actualizar Multimedia (Suelte un nuevo archivo)</label>
                            <div
                              onDragOver={handleDragOver}
                              onDragLeave={handleDragLeave}
                              onDrop={handleDrop}
                              onClick={() => fileInputRef.current?.click()}
                              className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all relative overflow-hidden ${
                                isDragging
                                  ? 'border-green-500 bg-green-500/10 shadow-[0_0_15px_rgba(34,197,94,0.15)]'
                                  : 'border-gray-800 bg-black/40 hover:border-gray-750 hover:bg-black/60'
                              }`}
                            >
                              <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileSelect}
                                accept="image/*,video/*,application/pdf"
                                className="hidden"
                              />
                              <UploadCloud className={`mx-auto mb-2 w-8 h-8 transition-colors ${isDragging ? 'text-green-400 animate-pulse' : 'text-gray-500'}`} />
                              <p className="text-xs font-bold text-gray-200">
                                {isDragging ? '¡Suelte el archivo aquí para actualizar!' : 'Suelte un archivo multimedia para asociarlo a esta plantilla o haga clic'}
                              </p>
                              <p className="text-[10px] text-gray-400 mt-1">
                                Reemplaza el archivo actual. Soporta <span className="text-gray-300 font-semibold">Imágenes, Videos o PDF</span>.
                              </p>
                            </div>
                          </div>

                          {/* Media preview/indicator inside edit mode */}
                          {activeTpl.headerType && activeTpl.headerType !== 'NONE' && (
                            <div className="bg-[#111] border border-gray-850 rounded-xl p-3 flex items-center justify-between gap-3 animate-scale-up">
                              <div className="flex items-center gap-2.5 min-w-0">
                                {activeTpl.headerType === 'IMAGE' && (
                                  <img src={activeTpl.headerUrl} alt="Active Thumbnail" className="w-10 h-10 rounded object-cover border border-gray-800" referrerPolicy="no-referrer" />
                                )}
                                {activeTpl.headerType === 'VIDEO' && (
                                  <div className="w-10 h-10 rounded bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
                                    <Video size={16} />
                                  </div>
                                )}
                                {activeTpl.headerType === 'DOCUMENT' && (
                                  <div className="w-10 h-10 rounded bg-red-500/10 flex items-center justify-center text-red-400 border border-red-500/20">
                                    <FileText size={16} />
                                  </div>
                                )}
                                <div className="text-left min-w-0">
                                  <p className="text-xs font-bold text-white truncate">
                                    {activeTpl.headerUrl?.startsWith('blob:') ? '📂 Archivo Multimedia Cargado' : 'URL Remota Cargada'}
                                  </p>
                                  <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold font-mono">
                                    {activeTpl.headerType} • En vista previa smartphone
                                  </p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setTemplates(prev => prev.map(t => t.id === activeTpl.id ? { ...t, headerType: 'NONE', headerUrl: '' } : t));
                                }}
                                className="bg-red-500/10 hover:bg-red-500/20 text-red-400 p-1.5 rounded-lg border border-red-500/20 transition"
                              >
                                <X size={14} /> Quitar Cabecera
                              </button>
                            </div>
                          )}

                          <div>
                            <label className="text-[10px] text-gray-400 block mb-1 font-bold uppercase tracking-wider">Cuerpo del Mensaje (Actualización en tiempo real)</label>
                            <textarea
                              value={activeTpl.body}
                              onChange={(e) => {
                                const updatedVal = e.target.value;
                                setTemplates(prev => prev.map(t => t.id === activeTpl.id ? { ...t, body: updatedVal } : t));
                              }}
                              className="w-full bg-[#111] border border-gray-800 rounded-xl p-3 text-xs text-white focus:border-green-500 outline-none h-24 resize-none font-sans"
                            />
                          </div>

                          <div className="flex gap-3">
                            <button
                              type="button"
                              onClick={() => {
                                // Simulate saving to backend or just show beautiful toast simulation
                                alert(`La plantilla ${activeTpl.name} se ha sincronizado con el portafolio comercial de Meta.`);
                              }}
                              className="flex-1 bg-green-600 hover:bg-green-500 text-white text-xs font-bold py-2.5 rounded-xl transition"
                            >
                              Sincronizar Cambios con Meta
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (templates.length <= 1) {
                                  alert('Debes mantener al menos una plantilla de WhatsApp Business.');
                                  return;
                                }
                                if (confirm(`¿Estás seguro de que deseas eliminar la plantilla "${activeTpl.name}" de Meta?`)) {
                                  const updatedTpls = templates.filter(t => t.id !== activeTpl.id);
                                  setTemplates(updatedTpls);
                                  setSelectedTemplate(updatedTpls[0].name);
                                }
                              }}
                              className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-bold px-4 py-2.5 rounded-xl transition"
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                      );
                    })()
                  )}
                </div>
              </div>

              {/* Chat smartphone visual preview */}
              <div className="lg:col-span-5 flex flex-col justify-between space-y-4">

                {/* Test Options Box */}
                <div className="panel p-5 rounded-2xl border border-gray-800 text-left space-y-4">
                  <h4 className="font-bold text-white flex items-center gap-2 text-sm border-b border-gray-800 pb-3">
                    <Send size={16} className="text-green-500" /> Consola de Prueba (API Cloud)
                  </h4>

                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] text-gray-400 uppercase tracking-widest block font-bold mb-1">Elegir Plantilla</label>
                      <select
                        value={selectedTemplate}
                        onChange={(e) => setSelectedTemplate(e.target.value)}
                        className="w-full bg-[#111] border border-gray-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-green-500"
                      >
                        {templates.map((t: any) => (
                          <option key={t.id} value={t.name}>{t.name} ({t.category})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-gray-400 uppercase tracking-widest block font-bold mb-1">Destinatario</label>
                      <input
                        type="text"
                        value={testRecipient}
                        onChange={(e) => setTestRecipient(e.target.value)}
                        className="w-full bg-[#111] border border-gray-800 rounded-xl p-2.5 text-xs text-white focus:border-green-500 outline-none font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-gray-400 uppercase tracking-widest block font-bold mb-1">Variables (Separadas por Comas)</label>
                      <input
                        type="text"
                        value={testVariables}
                        onChange={(e) => setTestVariables(e.target.value)}
                        placeholder="Juan, Smartwatch Ultra, COL-9821"
                        className="w-full bg-[#111] border border-gray-800 rounded-xl p-2.5 text-xs text-white focus:border-green-500 outline-none"
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (!isOfficialConnected) {
                        setTemplateSendingStatus('error');
                        return;
                      }
                      setTemplateSendingStatus('sending');
                      setTimeout(() => {
                        setTemplateSendingStatus('success');
                      }, 1200);
                    }}
                    className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-2.5 rounded-xl transition text-xs shadow-lg shadow-green-600/10"
                  >
                    Probar Envío por API Oficial
                  </button>

                  {templateSendingStatus === 'sending' && (
                    <p className="text-center text-[10px] text-gray-400 animate-pulse">Llamando API de Graph Meta...</p>
                  )}
                  {templateSendingStatus === 'success' && (
                    <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] p-2.5 rounded-xl flex items-center gap-2">
                      <CheckCircle2 size={14} /> ¡Enviado con éxito! ID: wamid.HBgLNTczMD...
                    </div>
                  )}
                  {templateSendingStatus === 'error' && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] p-2.5 rounded-xl text-left space-y-1">
                      <p className="font-bold flex items-center gap-1"><X size={14} /> Requiere Conexión</p>
                      <p>Primero debe conectar su WhatsApp arriba vía Facebook antes de enviar.</p>
                    </div>
                  )}
                </div>

                {/* Smartphone Preview Mockup */}
                <div className="border border-gray-800 bg-[#000] rounded-[36px] p-4 shadow-2xl relative w-full max-w-[340px] mx-auto overflow-hidden ring-4 ring-gray-900 flex flex-col h-[520px]">
                  {/* Speaker and Camera notch */}
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-5 bg-black rounded-b-2xl z-20 flex items-center justify-center">
                    <div className="w-10 h-1 bg-gray-800 rounded-full mb-1"></div>
                  </div>

                  {/* WhatsApp screen mock */}
                  <div className="flex-1 bg-[#0b141a] rounded-[24px] overflow-hidden flex flex-col relative pt-5">

                    {/* Top bar */}
                    <div className="bg-[#075e54] p-3 text-white flex items-center gap-2.5 shrink-0 select-none">
                      <div className="w-8 h-8 rounded-full bg-emerald-700 flex items-center justify-center font-bold text-xs">
                        E3
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-bold flex items-center gap-1">
                          Xorbit 360 <span className="text-[10px] text-sky-400">●</span>
                        </p>
                        <p className="text-[8px] text-gray-200">En línea / Canal de Pruebas</p>
                      </div>
                    </div>

                    {/* Chat Area */}
                    <div className="flex-1 p-3 overflow-y-auto space-y-3 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc2214-75b6-11e7-8118-ef4cd70659cb.png')] bg-repeat bg-contain">

                      {/* Interactive Bubble */}
                      <div className="max-w-[85%] bg-[#056162] text-white p-2 rounded-2xl rounded-tl-none shadow-sm ml-1 text-left relative space-y-2">

                        {/* Render Header media type if any */}
                        {(() => {
                          const activeTpl = templates.find((t: any) => t.name === selectedTemplate) || templates[0];
                          if (!activeTpl.headerType || activeTpl.headerType === 'NONE') return null;

                          if (activeTpl.headerType === 'IMAGE') {
                            return (
                              <div className="rounded-xl overflow-hidden bg-black/25 relative aspect-video border border-[#0d7375]">
                                <img
                                  src={activeTpl.headerUrl || "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=400&q=80"}
                                  alt="Preview Header"
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                                <span className="absolute bottom-1 right-1 text-[8px] bg-black/60 text-white px-1.5 py-0.5 rounded">Imagen JPG</span>
                              </div>
                            );
                          }

                          if (activeTpl.headerType === 'VIDEO') {
                            return (
                              <div className="rounded-xl overflow-hidden bg-black/40 aspect-video relative flex flex-col items-center justify-center border border-[#0d7375]">
                                <div className="w-10 h-10 rounded-full bg-black/60 flex items-center justify-center text-white border border-white/20">
                                  <Play size={16} fill="white" className="ml-0.5" />
                                </div>
                                <span className="absolute bottom-1 right-1 text-[8px] bg-black/60 text-white px-1.5 py-0.5 rounded">Video MP4</span>
                              </div>
                            );
                          }

                          if (activeTpl.headerType === 'DOCUMENT') {
                            return (
                              <div className="bg-black/30 p-2 rounded-xl flex items-center gap-3 border border-[#0d7375]">
                                <div className="w-10 h-10 bg-red-600/20 text-red-400 rounded-lg flex items-center justify-center shrink-0 border border-red-500/10">
                                  <FileText size={20} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[10px] font-bold text-gray-200 truncate">documento_comercial.pdf</p>
                                  <p className="text-[8px] text-gray-400">1.2 MB • PDF Documento</p>
                                </div>
                              </div>
                            );
                          }

                          return null;
                        })()}

                        {/* Message body with variables replaced dynamically */}
                        <p className="text-xs leading-relaxed whitespace-pre-wrap">
                          {(() => {
                            const activeTpl = templates.find((t: any) => t.name === selectedTemplate) || templates[0];
                            const vars = testVariables.split(',').map(v => v.trim());
                            let bodyText = activeTpl.body;

                            // Replaces variables with high-contrast colored markers
                            const parts: React.ReactNode[] = [];
                            let lastIdx = 0;
                            const regex = /\{\{(\d+)\}\}/g;
                            let match;

                            while ((match = regex.exec(bodyText)) !== null) {
                              const matchIndex = match.index;
                              const varNum = parseInt(match[1]);
                              const varVal = vars[varNum - 1] || `{{${varNum}}}`;

                              // Push static text before variable
                              if (matchIndex > lastIdx) {
                                parts.push(bodyText.substring(lastIdx, matchIndex));
                              }

                              // Push variable wrapper
                              parts.push(
                                <span key={matchIndex} className="bg-[#1877f2] text-white font-bold px-1 rounded mx-0.5 shadow-sm border border-blue-400/20">
                                  {varVal}
                                </span>
                              );
                              lastIdx = regex.lastIndex;
                            }

                            if (lastIdx < bodyText.length) {
                              parts.push(bodyText.substring(lastIdx));
                            }

                            return parts.length > 0 ? parts : bodyText;
                          })()}
                        </p>

                        {/* Bubble footer */}
                        <div className="flex items-center justify-between text-[8px] text-gray-300 border-t border-[#0c787a] pt-1.5 mt-1">
                          <span className="flex items-center gap-0.5">
                            🛡️ Oficial Meta HSM
                          </span>
                          <span>13:12</span>
                        </div>
                      </div>

                      {/* Quick action buttons mockup */}
                      <div className="space-y-1.5 w-[85%] ml-1">
                        <button className="w-full bg-[#1e2a30] hover:bg-[#2c3e46] text-sky-400 text-[10px] font-bold py-2 rounded-xl border border-[#2b3c43] flex items-center justify-center gap-1.5">
                          Confirmar Pedido 📦
                        </button>
                        <button className="w-full bg-[#1e2a30] hover:bg-[#2c3e46] text-sky-400 text-[10px] font-bold py-2 rounded-xl border border-[#2b3c43] flex items-center justify-center gap-1.5">
                          Hablar con Soporte 💬
                        </button>
                      </div>

                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}
      </div>

      {isWizardOpen && (
        <div className="fixed inset-0 top-0 left-0 right-0 bottom-0 bg-black/90 backdrop-blur-md z-[100] flex flex-col sm:items-center sm:justify-center p-0 sm:p-4 animate-fade-in overflow-hidden">
          <div className="bg-[#0a0a0a] border-0 sm:border sm:border-gray-800 rounded-none sm:rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl relative flex flex-col h-full sm:h-[650px] sm:max-h-[800px] transition-all min-h-0">
            {/* Top Modal Bar */}
            <div className="p-2 sm:p-3.5 border-b border-gray-800 flex items-center justify-between bg-[#111] shrink-0">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Wand2 size={16} className="text-blue-400 shrink-0" />
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-bold text-white truncate">Chat Interactivo de Entrenamiento IA</h3>
                  <p className="text-[10px] sm:text-[11px] text-gray-400 truncate hidden xs:block">Entrena a la IA conversando con voz, texto, imágenes o archivos.</p>
                </div>
              </div>
              <button
                onClick={() => setIsWizardOpen(false)}
                className="text-gray-400 hover:text-white p-1.5 rounded-lg bg-[#222] shrink-0 ml-1.5 active:scale-95 transition"
                title="Cerrar Chat"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-hidden p-0 sm:p-3 bg-[#070a0d] flex flex-col min-h-0 flex-grow h-[80vh] sm:h-full">
              <div className="bg-[#0b141a] border-0 sm:border sm:border-gray-800 rounded-none sm:rounded-2xl overflow-hidden shadow-2xl flex flex-col h-full min-h-0 w-full">
                {/* Chat Header */}
                <div className="bg-[#202c33] p-2 sm:p-3 text-white flex items-center justify-between border-b border-gray-800 shrink-0 gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="relative shrink-0">
                      <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-blue-600 to-blue-600 flex items-center justify-center font-bold text-white shadow-lg border border-white/10">
                        <Bot size={15} className="sm:w-[18px] sm:h-[18px]" />
                      </div>
                      <span className="absolute bottom-0 right-0 w-2 h-2 sm:w-2.5 sm:h-2.5 bg-emerald-500 border-2 border-[#202c33] rounded-full"></span>
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-[11px] sm:text-xs font-bold text-white flex items-center gap-1 truncate">
                        Consultor e Instructor IA
                      </h4>
                      <p className="text-[9px] sm:text-[10px] text-emerald-400 font-medium truncate">Capacita tu bot</p>
                    </div>
                  </div>

                  <button
                    onClick={async () => {
                      try {
                        localStorage.setItem('whatsapp_bot_prompt_v1', botPrompt);
                        await fetch('/api/backoffice/state', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ botPrompt, lastTrainingUpdate: Date.now() })
                        });
                      } catch(e) {}
                      setIsWizardOpen(false);
                      alert('✅ ¡Prompt Definitivo generado y guardado en el servidor exitosamente!');
                    }}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] sm:text-[11px] font-bold px-2 sm:px-3 py-1.5 rounded-lg flex items-center gap-1 transition shadow-sm shrink-0 active:scale-95"
                  >
                    <CheckCircle2 size={13} className="shrink-0" />
                    <span>Aplicar Prompt</span>
                  </button>
                </div>

                {/* Interactive Remarketing Controls Bar */}
                <div className="bg-[#111b21] border-b border-gray-800/80 p-1.5 sm:p-2.5 flex items-center justify-between gap-1.5 shrink-0 overflow-x-auto scrollbar-none">
                  <div className="flex items-center gap-1 text-[10px] sm:text-xs text-amber-400 font-bold shrink-0">
                    <Bell size={12} className="animate-pulse text-amber-400 shrink-0" />
                    <span className="truncate">Remarketing:</span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {[0, 1, 2, 3].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => handleConfigureRemarketing(num, remarketingInterval)}
                        className={`px-1.5 py-0.5 sm:px-2 sm:py-1 rounded text-[9px] sm:text-[10px] font-bold transition shrink-0 ${
                          remarketingCount === num
                            ? 'bg-amber-500 text-black shadow-sm'
                            : 'bg-[#202c33] text-gray-300 hover:bg-[#2a3942]'
                        }`}
                      >
                        {num === 0 ? 'Off' : `${num} ${num === 1 ? 'rec' : 'recs'}`}
                      </button>
                    ))}

                    <span className="text-gray-700 text-xs shrink-0">|</span>

                    <select
                      value={remarketingInterval}
                      onChange={(e) => handleConfigureRemarketing(remarketingCount, e.target.value)}
                      className="bg-[#202c33] border border-gray-700 text-amber-300 text-[9px] sm:text-[10px] font-bold rounded px-1.5 py-0.5 sm:py-1 focus:outline-none shrink-0 cursor-pointer"
                    >
                      <option value="15 minutos">15 min</option>
                      <option value="1 hora">1 Hora</option>
                      <option value="2 horas">2 Horas</option>
                      <option value="24 horas">24 Horas</option>
                    </select>
                  </div>
                </div>

                {/* Chat Body */}
                <div className="flex-1 p-3 sm:p-4 overflow-y-auto space-y-3 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc2214-75b6-11e7-8118-ef4cd70659cb.png')] bg-repeat bg-contain">
                  {trainerMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
                    >
                      <div
                        className={`max-w-[88%] sm:max-w-[85%] rounded-2xl p-3 shadow-md text-xs relative ${
                          msg.sender === 'user'
                            ? 'bg-[#005c4b] text-white rounded-tr-none'
                            : 'bg-[#202c33] text-gray-100 rounded-tl-none border border-gray-700/50'
                        }`}
                      >
                        {msg.attachment && (
                          <div className="mb-2 p-1.5 rounded-xl bg-black/30 border border-white/10">
                            {msg.attachment.type === 'audio' ? (
                              <VoiceNotePlayer
                                src={msg.attachment.url || 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'}
                                isPtt={true}
                                title="Nota de Voz PTT (Entrenamiento)"
                                sender={msg.sender === 'user' ? 'user' : 'agent'}
                              />
                            ) : msg.attachment.type === 'imagen' ? (
                              <div className="flex items-center gap-2 truncate p-1">
                                <ImageIcon size={18} className="text-blue-400 shrink-0" />
                                <span className="text-[11px] text-gray-200 font-semibold truncate">{msg.attachment.name}</span>
                              </div>
                            ) : msg.attachment.type === 'video' ? (
                              <div className="flex items-center gap-2 truncate p-1">
                                <Video size={18} className="text-blue-400 shrink-0" />
                                <span className="text-[11px] text-gray-200 font-semibold truncate">{msg.attachment.name}</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 truncate p-1">
                                <FileText size={18} className="text-amber-400 shrink-0" />
                                <span className="text-[11px] text-gray-200 font-semibold truncate">{msg.attachment.name}</span>
                              </div>
                            )}
                          </div>
                        )}

                        <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                        <span className="block text-[9px] text-gray-400 text-right mt-1 font-mono">{formatLocalTime(msg.timestamp || msg.time)}</span>
                      </div>
                    </div>
                  ))}

                  {isTrainerThinking && (
                    <div className="flex justify-start">
                      <div className="bg-[#202c33] p-3 rounded-2xl rounded-tl-none border border-gray-700/50 text-xs text-gray-400 flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-ping shrink-0"></div>
                        Analizando indicación e integrando al Prompt Definitivo...
                      </div>
                    </div>
                  )}
                </div>

                {/* Live Audio Recorder Overlay for Trainer */}
                {showTrainerLiveRecorder && (
                  <div className="p-3 bg-[#111b21] border-t border-emerald-500/30 shrink-0">
                    <LiveAudioRecorder
                      onSendVoiceNote={(voice) => {
                        handleSendTrainerMessage('🎤 Nota de voz enviada con instrucciones del negocio.', {
                          name: voice.name || 'Nota_de_voz_PTT.ogg',
                          type: 'audio',
                          url: voice.dataUrl,
                          size: `${Math.round(voice.duration)}s`
                        });
                        setShowTrainerLiveRecorder(false);
                      }}
                      onCancel={() => setShowTrainerLiveRecorder(false)}
                      title="Grabar Nota de Voz PTT para Entrenamiento IA"
                    />
                  </div>
                )}

                {/* Input Bar */}
                <div className="bg-[#202c33] p-2 sm:p-3 border-t border-gray-800 shrink-0">
                  {trainerAttachment && (
                    <div className="mb-2 p-1.5 bg-black/40 rounded-lg flex items-center justify-between text-xs text-blue-300 border border-blue-500/20">
                      <span className="truncate max-w-[200px]">📎 Adjunto: {trainerAttachment.name}</span>
                      <button onClick={() => setTrainerAttachment(null)} className="text-gray-400 hover:text-white p-0.5">
                        <X size={14} />
                      </button>
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                      <label className="p-1.5 sm:p-2 text-gray-400 hover:text-blue-400 hover:bg-[#2a3942] rounded-full cursor-pointer transition" title="Adjuntar Imagen">
                        <ImageIcon size={18} />
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files?.[0]) {
                              const file = e.target.files[0];
                              setTrainerAttachment({ name: file.name, type: 'imagen', url: '' });
                            }
                          }}
                        />
                      </label>
                      <label className="p-1.5 sm:p-2 text-gray-400 hover:text-blue-400 hover:bg-[#2a3942] rounded-full cursor-pointer transition" title="Adjuntar Video">
                        <Video size={18} />
                        <input
                          type="file"
                          accept="video/*"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files?.[0]) {
                              const file = e.target.files[0];
                              setTrainerAttachment({ name: file.name, type: 'video', url: '' });
                            }
                          }}
                        />
                      </label>
                      <label className="p-1.5 sm:p-2 text-gray-400 hover:text-blue-400 hover:bg-[#2a3942] rounded-full cursor-pointer transition" title="Adjuntar Archivo o PDF">
                        <Paperclip size={18} />
                        <input
                          type="file"
                          accept="*"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files?.[0]) {
                              const file = e.target.files[0];
                              setTrainerAttachment({ name: file.name, type: 'archivo', url: '' });
                            }
                          }}
                        />
                      </label>
                    </div>

                    <input
                      type="text"
                      placeholder="Escribe instrucciones, preguntas frecuentes o bienvenida..."
                      className="flex-1 min-w-0 bg-[#2a3942] border border-gray-700/50 rounded-xl px-2.5 sm:px-3 py-2 text-xs text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                      value={trainerInput}
                      onChange={(e) => setTrainerInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSendTrainerMessage();
                      }}
                    />

                    <button
                      type="button"
                      onClick={() => setShowTrainerLiveRecorder(!showTrainerLiveRecorder)}
                      className={`p-2 rounded-xl transition shrink-0 ${
                        showTrainerLiveRecorder
                          ? 'bg-emerald-600 text-white border border-emerald-400'
                          : 'bg-[#2a3942] text-gray-300 hover:text-emerald-400 hover:bg-[#344550]'
                      }`}
                      title="Grabar Nota de Voz PTT"
                    >
                      <Mic size={18} />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSendTrainerMessage()}
                      className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-xl transition shadow-md shrink-0"
                      title="Enviar mensaje"
                    >
                      <Send size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {currentViewTab === 'catalogo' && (
        <div className="pt-4"><CatalogoView /></div>
      )}
      {currentViewTab === 'comentarios_sociales' && (
        <div className="pt-4"><ComentariosSocialesView /></div>
      )}
      {currentViewTab === 'reportes' && (
        <div className="pt-4"><ReportesView businessType={businessType} currentUser={currentUser} /></div>
      )}
      {currentViewTab === 'integrations' && (
        <div className="pt-4"><ChatbotIntegracionesView /></div>
      )}
      {currentViewTab === 'alertas' && (
        <div className="pt-4"><AlertasView /></div>
      )}
      {currentViewTab === 'programaciones' && (
        <div className="pt-4"><ProgramacionesBotView /></div>
      )}
      {currentViewTab === 'fidelizacion' && (
        <div className="pt-4"><FidelizacionView /></div>
      )}
      {currentViewTab === 'campanas' && (
        <div className="pt-4"><CampanasView /></div>
      )}
      {currentViewTab === 'citas' && (
        <div className="pt-4"><CitasView /></div>
      )}
      {currentViewTab === 'clientes' && (
        <div className="pt-4"><ClientesView currentUser={currentUser} /></div>
      )}
      {currentViewTab === 'pedidos' && (
        <div className="pt-4"><PedidosView currentUser={currentUser} /></div>
      )}
      {currentViewTab === 'recargas' && (
        <div className="pt-4"><RecargasView /></div>
      )}
      {currentViewTab === 'referidos' && (
        <div className="pt-4"><ReferidosView currentUser={currentUser} /></div>
      )}

      {/* Lightbox Modal for Fullscreen Image Viewing */}
      {selectedImageLightbox && (
        <div
          className="fixed inset-0 z-[99999] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-fade-in"
          onClick={() => setSelectedImageLightbox(null)}
        >
          <div className="absolute top-4 right-4 flex items-center gap-3 z-10" onClick={(e) => e.stopPropagation()}>
            <a
              href={selectedImageLightbox.url}
              download={selectedImageLightbox.name}
              target="_blank"
              rel="noreferrer"
              className="bg-gray-800/80 hover:bg-gray-700 text-white p-2.5 rounded-full border border-gray-600 transition flex items-center gap-1.5 text-xs"
              title="Descargar imagen"
            >
              <UploadCloud size={16} className="rotate-180 text-emerald-400" />
              <span>Descargar</span>
            </a>
            <button
              type="button"
              onClick={() => setSelectedImageLightbox(null)}
              className="bg-gray-800/80 hover:bg-red-900/80 text-white p-2.5 rounded-full border border-gray-600 transition cursor-pointer"
              title="Cerrar"
            >
              <X size={18} />
            </button>
          </div>
          <div className="max-w-4xl max-h-[85vh] flex flex-col items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <img
              src={selectedImageLightbox.url}
              alt={selectedImageLightbox.name}
              className="max-w-full max-h-[78vh] object-contain rounded-lg shadow-2xl border border-white/10"
              referrerPolicy="no-referrer"
            />
            <p className="text-gray-300 text-sm mt-3 font-medium bg-black/50 px-4 py-1.5 rounded-full border border-gray-800">
              {selectedImageLightbox.name}
            </p>
          </div>
        </div>
      )}

      {/* Modal: Conexión oficial WhatsApp Business Cloud */}
      {showHeadlessModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-scale-up">
            <div className="p-5 border-b border-zinc-850 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl">
                  <Smartphone size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">Conectar WABA Directa (BYO-WABA)</h4>
                  <p className="text-[10px] text-zinc-400">Meta Cloud API oficial sin pasar por OAuth</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowHeadlessModal(false)}
                className="text-zinc-500 hover:text-white p-1 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div>
                <label className="text-zinc-300 font-bold block mb-1">Token de Acceso Permanente (System User Token)</label>
                <input
                  type="password"
                  value={guideToken}
                  onChange={(e) => setGuideToken(e.target.value)}
                  placeholder="EAAG..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono text-xs focus:border-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-300 font-bold block mb-1">WABA ID (WhatsApp Business)</label>
                  <input
                    type="text"
                    value={guideWabaId}
                    onChange={(e) => setGuideWabaId(e.target.value)}
                    placeholder="109283918239"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono text-xs focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-zinc-300 font-bold block mb-1">Phone Number ID</label>
                  <input
                    type="text"
                    value={guidePhoneId}
                    onChange={(e) => setGuidePhoneId(e.target.value)}
                    placeholder="982349823491"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono text-xs focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-zinc-300 font-bold">PIN de 2 Pasos (2FA)</label>
                  <span className="text-[10px] text-amber-400">Evita error 133005 de Meta</span>
                </div>
                <input
                  type="text"
                  maxLength={6}
                  value={guidePin}
                  onChange={(e) => setGuidePin(e.target.value)}
                  placeholder="123456 (opcional si no tiene 2FA)"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono text-xs focus:border-blue-500 outline-none"
                />
              </div>

              {verificationResult && (
                <div className={`p-3 rounded-xl border text-xs ${
                  verificationResult.success
                    ? 'bg-green-500/10 border-green-500/30 text-green-300'
                    : 'bg-red-500/10 border-red-500/30 text-red-300'
                }`}>
                  {verificationResult.msg}
                </div>
              )}
            </div>

            <div className="p-4 bg-zinc-900/50 border-t border-zinc-850 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowHeadlessModal(false)}
                className="px-4 py-2 text-xs font-bold text-zinc-400 hover:text-white"
              >
                Cerrar
              </button>
              <button
                type="button"
                disabled={isVerifyingCreds}
                onClick={handleConnectHeadlessWaba}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition"
              >
                {isVerifyingCreds ? 'Conectando WABA...' : 'Vincular WABA Oficial'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Plantillas de Logística (Dropi, MasterShop, Effix) */}
      {showLogisticsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-scale-up">
            <div className="p-5 border-b border-zinc-850 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl">
                  <Zap size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">Disparador de Plantillas de Logística Meta Oficial</h4>
                  <p className="text-[10px] text-zinc-400">Automatización para Dropi, MasterShop y Effix</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLogisticsModal(false)}
                className="text-zinc-500 hover:text-white p-1 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              {/* Plataforma */}
              <div>
                <label className="text-zinc-400 block mb-1.5 font-bold">Plataforma Logística</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['dropi', 'mastershop', 'effix'] as const).map((plat) => (
                    <button
                      key={plat}
                      type="button"
                      onClick={() => setLogisticsPlatform(plat)}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold uppercase transition ${
                        logisticsPlatform === plat
                          ? 'bg-amber-500/10 border-amber-500 text-amber-300'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {plat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tipo de Plantilla */}
              <div>
                <label className="text-zinc-400 block mb-1.5 font-bold">Acción / Estado de Plantilla</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'confirm', label: '1. Confirmación' },
                    { id: 'dispatch', label: '2. Despacho & Guía' },
                    { id: 'novelty', label: '3. Novedad' },
                    { id: 'delivered', label: '4. Entregado' }
                  ].map((act) => (
                    <button
                      key={act.id}
                      type="button"
                      onClick={() => setLogisticsAction(act.id as any)}
                      className={`py-2 px-2.5 rounded-xl border text-[11px] font-bold transition text-center ${
                        logisticsAction === act.id
                          ? 'bg-blue-500/10 border-blue-500 text-blue-300'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {act.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Formulario */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="text-zinc-400 block mb-1">Teléfono Cliente (con indicativo)</label>
                  <input
                    type="text"
                    value={logisticsData.customerPhone}
                    onChange={(e) => setLogisticsData({ ...logisticsData, customerPhone: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono text-xs focus:border-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1">Nombre del Cliente</label>
                  <input
                    type="text"
                    value={logisticsData.customerName}
                    onChange={(e) => setLogisticsData({ ...logisticsData, customerName: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white text-xs focus:border-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1">Número de Pedido ({logisticsPlatform.toUpperCase()})</label>
                  <input
                    type="text"
                    value={logisticsData.orderId}
                    onChange={(e) => setLogisticsData({ ...logisticsData, orderId: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono text-xs focus:border-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1">Producto</label>
                  <input
                    type="text"
                    value={logisticsData.productName}
                    onChange={(e) => setLogisticsData({ ...logisticsData, productName: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white text-xs focus:border-amber-500 outline-none"
                  />
                </div>

                {logisticsAction === 'confirm' && (
                  <>
                    <div>
                      <label className="text-zinc-400 block mb-1">Valor Total Contra Entrega</label>
                      <input
                        type="text"
                        value={logisticsData.totalPrice}
                        onChange={(e) => setLogisticsData({ ...logisticsData, totalPrice: e.target.value })}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white text-xs focus:border-amber-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-zinc-400 block mb-1">Ciudad de Entrega</label>
                      <input
                        type="text"
                        value={logisticsData.city}
                        onChange={(e) => setLogisticsData({ ...logisticsData, city: e.target.value })}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white text-xs focus:border-amber-500 outline-none"
                      />
                    </div>
                  </>
                )}

                {logisticsAction === 'dispatch' && (
                  <>
                    <div>
                      <label className="text-zinc-400 block mb-1">Transportadora</label>
                      <input
                        type="text"
                        value={logisticsData.carrierName}
                        onChange={(e) => setLogisticsData({ ...logisticsData, carrierName: e.target.value })}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white text-xs focus:border-amber-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-zinc-400 block mb-1">Número de Guía</label>
                      <input
                        type="text"
                        value={logisticsData.trackingNumber}
                        onChange={(e) => setLogisticsData({ ...logisticsData, trackingNumber: e.target.value })}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono text-xs focus:border-amber-500 outline-none"
                      />
                    </div>
                  </>
                )}

                {logisticsAction === 'novelty' && (
                  <div className="col-span-1 sm:col-span-2">
                    <label className="text-zinc-400 block mb-1">Causa de la Novedad</label>
                    <input
                      type="text"
                      value={logisticsData.noveltyReason}
                      onChange={(e) => setLogisticsData({ ...logisticsData, noveltyReason: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white text-xs focus:border-amber-500 outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Vista Previa de la Plantilla WhatsApp */}
              <div className="p-3.5 bg-emerald-950/20 border border-emerald-800/40 rounded-xl">
                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block mb-1">
                  Vista Previa Plantilla Oficial WhatsApp Meta ({logisticsAction})
                </span>
                <p className="text-zinc-200 text-xs leading-relaxed font-sans">
                  {logisticsAction === 'confirm' && (
                    `¡Hola ${logisticsData.customerName}! Hemos recibido tu pedido #${logisticsData.orderId} de "${logisticsData.productName}" por un total de $${logisticsData.totalPrice} en modalidad contra entrega. Para despacharlo a ${logisticsData.city || 'tu dirección'}, por favor confirma si tus datos son correctos.`
                  )}
                  {logisticsAction === 'dispatch' && (
                    `¡Buenas noticias ${logisticsData.customerName}! Tu pedido #${logisticsData.orderId} de "${logisticsData.productName}" ya fue despachado con la transportadora ${logisticsData.carrierName}. Tu número de guía es ${logisticsData.trackingNumber}.`
                  )}
                  {logisticsAction === 'novelty' && (
                    `Hola ${logisticsData.customerName}, la transportadora ${logisticsData.carrierName} reportó una novedad con tu pedido #${logisticsData.orderId}: "${logisticsData.noveltyReason}". Por favor respóndenos para coordinar la entrega exitosa.`
                  )}
                  {logisticsAction === 'delivered' && (
                    `¡Hola ${logisticsData.customerName}! La transportadora nos confirma que tu pedido #${logisticsData.orderId} ha sido entregado exitosamente. ¡Gracias por tu compra!`
                  )}
                </p>
              </div>

              {logisticsResultMsg && (
                <div className={`p-3 rounded-xl border text-xs ${
                  logisticsResultMsg.success
                    ? 'bg-green-500/10 border-green-500/30 text-green-300'
                    : 'bg-red-500/10 border-red-500/30 text-red-300'
                }`}>
                  {logisticsResultMsg.text}
                </div>
              )}
            </div>

            <div className="p-4 bg-zinc-900/50 border-t border-zinc-850 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowLogisticsModal(false)}
                className="px-4 py-2 text-xs font-bold text-zinc-400 hover:text-white"
              >
                Cerrar
              </button>
              <button
                type="button"
                disabled={isSendingLogistics}
                onClick={handleSendLogisticsTemplate}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition shadow-sm"
              >
                {isSendingLogistics ? 'Enviando a Meta...' : 'Enviar Plantilla por WhatsApp'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Guía Generada */}
      {showGuiaModal && lastGeneratedGuia && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-scale-up text-left">
            <div className="p-5 border-b border-zinc-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-gold/15 text-gold rounded-xl border border-gold/30">
                  <Truck size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">Guía de Envío Generada</h4>
                  <p className="text-[11px] text-zinc-400">Integración Dropi • Pago Contra Entrega</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuiaModal(false)}
                className="text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-zinc-900 transition"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Número de Guía Dropi</span>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-medium">
                    Lista para despacho
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-base font-bold text-gold tracking-wider">{lastGeneratedGuia.trackingCode}</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(lastGeneratedGuia.trackingCode);
                      setGuiaCopied(true);
                      setTimeout(() => setGuiaCopied(false), 2000);
                    }}
                    className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition font-medium cursor-pointer"
                  >
                    {guiaCopied ? (
                      <>
                        <CheckCircle size={12} className="text-emerald-400" />
                        <span className="text-emerald-400">Copiada</span>
                      </>
                    ) : (
                      <>
                        <Copy size={12} />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-zinc-300">
                <div className="p-3 bg-zinc-900/60 border border-zinc-850 rounded-xl">
                  <span className="text-[10px] text-zinc-500 block mb-0.5 font-medium">Destinatario</span>
                  <p className="font-semibold text-white truncate">{captureName}</p>
                  <p className="text-[11px] text-zinc-400">{captureCity}, {captureDept}</p>
                </div>
                <div className="p-3 bg-zinc-900/60 border border-zinc-850 rounded-xl">
                  <span className="text-[10px] text-zinc-500 block mb-0.5 font-medium">Transportadora</span>
                  <p className="font-semibold text-white">{lastGeneratedGuia.carrier}</p>
                  <p className="text-[11px] text-gold font-bold">${captureTicket.toLocaleString()} COP</p>
                </div>
              </div>

              <div className="p-3 bg-zinc-900/40 border border-zinc-850 rounded-xl text-zinc-400 text-[11px] flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                <span>Cliente y pedido vinculados automáticamente en el CRM (Clientes y Pedidos).</span>
              </div>

              {guiaSentToChat && (
                <div className="p-2.5 bg-emerald-950/40 border border-emerald-800/40 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle size={14} className="text-emerald-400 shrink-0" />
                  <span>¡Mensaje con número de guía y rastreo enviado al chat de WhatsApp!</span>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-zinc-800/80 bg-zinc-950 flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={handleSendGuiaToChat}
                className="flex-1 bg-gold hover:bg-gold-light text-black font-bold py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-2 text-xs shadow-md shadow-gold/10 cursor-pointer"
              >
                <Send size={13} />
                <span>Enviar Guía por WhatsApp</span>
              </button>
              <button
                type="button"
                onClick={() => setShowGuiaModal(false)}
                className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-white rounded-xl text-xs font-semibold border border-zinc-800 transition cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

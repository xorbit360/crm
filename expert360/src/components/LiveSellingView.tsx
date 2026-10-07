import React, { useState, useEffect, useRef } from 'react';
import {
  Radio,
  Video,
  Tv,
  Play,
  Pause,
  ShoppingBag,
  MessageSquare,
  Zap,
  Globe,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Sparkles,
  Flame,
  Eye,
  Users,
  RefreshCw,
  Send,
  Plus,
  Trash2,
  ExternalLink,
  QrCode,
  Smartphone,
  ArrowRight,
  ShieldCheck,
  DollarSign,
  Clock,
  Tag,
  Share2,
  Camera,
  CameraOff,
  Mic,
  MicOff,
  Sliders,
  Filter,
  CheckCheck,
  Percent,
  Layers,
  ChevronRight,
  ChevronDown,
  Lock,
  Server,
  FileSpreadsheet,
  Repeat,
  FileVideo,
  Film,
  BookOpen,
  Download,
  Volume2,
  VolumeX,
  CircleDot,
  RotateCcw,
  Upload,
  HelpCircle
} from 'lucide-react';

export interface LiveProduct {
  id: string;
  name: string;
  code: string; // ej: #L1, #L2
  price: number;
  livePrice: number;
  image: string;
  stock: number;
  soldCount: number;
  description?: string;
  category?: string;
  badge?: string;
}

export interface LiveComment {
  id: string;
  sender: string;
  platform: 'tiktok' | 'facebook' | 'instagram' | 'whatsapp' | 'web';
  avatar?: string;
  text: string;
  timestamp: string;
  isOrderDetected?: boolean;
  orderId?: string;
  isPinned?: boolean;
}

export interface LiveOrder {
  id: string;
  customerName: string;
  phone: string;
  channel: 'TikTok Live' | 'Facebook Live' | 'Instagram Live' | 'WhatsApp' | 'Tienda Web';
  productName: string;
  productCode: string;
  price: number;
  status: 'Capturado por Comentario' | 'Confirmado WhatsApp' | 'Pago Pendiente' | 'Pagado' | 'Contra Entrega';
  city?: string;
  address?: string;
  createdAt: string;
}

export interface PreRecordedVideo {
  id: string;
  title: string;
  description: string;
  url: string;
  durationLabel: string;
  badge?: string;
  isCustom?: boolean;
}

const PRESET_VIDEOS: PreRecordedVideo[] = [
  {
    id: 'demo-fashion',
    title: 'Live Moda: Vestidos Bohemios y Outfits (#L1)',
    description: 'Demostración de tela, probador en vivo y llamado a comentar QUIERO #L1',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    durationLabel: '15 min (Bucle continuo 24/7)',
    badge: '🔥 ALTA CONVERSIÓN'
  },
  {
    id: 'demo-gadgets',
    title: 'Live Lanzamiento: Smartwatch Deportivo Ultra (#L2)',
    description: 'Unboxing, funciones de salud, resistencia al agua y cupón flash en vivo',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
    durationLabel: '12 min (Bucle continuo 24/7)',
    badge: '⭐ TOP VENTAS'
  },
  {
    id: 'demo-beauty',
    title: 'Live Skincare: Serum Antiedad Vitamina C (#L3)',
    description: 'Aplicación en piel, prueba de absorción y cierre de pedidos contra entrega',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    durationLabel: '10 min (Bucle continuo 24/7)',
    badge: '💎 BELLEZA'
  }
];

const LIVE_SELLING_SCRIPT = [
  {
    step: '1. Gancho & Bienvenida (00:00 - 01:00)',
    content: '¡Hola a todos y bienvenidos a esta transmisión especial! Hoy tenemos liquidación flash y precios de bodega exclusivos para este Live. Escribe en los comentarios desde qué ciudad te conectas y quédate hasta el final porque tenemos unidades limitadas con pago contra entrega y envío prioritario a todo el país.'
  },
  {
    step: '2. Demostración Producto #L1: Vestido Bohemio (01:00 - 03:30)',
    content: 'Empecemos con nuestra joya de hoy: el Vestido Bohemio Floral (#L1). Miren la caída de la tela, es 100% transpirable y tiene ajuste perfecto en cintura. Normalmente cuesta $159.000, pero solo durante esta transmisión te queda en $119.000. Si lo quieres con envío gratis, comenta ahora mismo: "QUIERO #L1" o "LO QUIERO" y el sistema te enviará el link por WhatsApp para confirmar tu talla y dirección.'
  },
  {
    step: '3. Demostración Producto #L2: Smartwatch Ultra (03:30 - 06:00)',
    content: 'Pasemos al Smartwatch Deportivo Ultra Pro X (#L2). Monitorea ritmo cardíaco, recibe tus mensajes de WhatsApp y la batería dura 7 días completos. De $249.000 lo bajamos hoy a $179.000. ¡Atención! Los primeros 10 en comentar "QUIERO #L2" se llevan cargador magnético de regalo.'
  },
  {
    step: '4. Cierre con Escasez & Urgencia (06:00 - 08:00)',
    content: 'Recuerda que todas las compras de hoy tienen garantía total y pago contra entrega (pagas cuando el mensajero toque tu puerta). Escribe tu comentario ya con la palabra QUIERO o el código del producto antes de que se agote el stock disponible.'
  }
];

const DEFAULT_PRODUCTS: LiveProduct[] = [
  {
    id: 'prod-1',
    name: 'Vestido Bohemio Estampado Floral',
    code: '#L1',
    price: 159000,
    livePrice: 119000,
    image: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=500&auto=format&fit=crop&q=60',
    stock: 24,
    soldCount: 9,
    description: 'Tela fresca transpirable, corte en A con ajuste en cintura. Ideal para ocasiones casuales y eventos.',
    category: 'Moda Femenina',
    badge: '🔥 MÁS VENDIDO'
  },
  {
    id: 'prod-2',
    name: 'Smartwatch Deportivo Ultra Pro X',
    code: '#L2',
    price: 249000,
    livePrice: 179000,
    image: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=500&auto=format&fit=crop&q=60',
    stock: 15,
    soldCount: 6,
    description: 'Monitoreo cardíaco 24/7, sumergible IP68, batería de 7 días y notificaciones de WhatsApp en tiempo real.',
    category: 'Tecnología',
    badge: '⚡ OFERTA RELÁMPAGO'
  },
  {
    id: 'prod-3',
    name: 'Serum Antiedad Ácido Hialurónico + Vitamina C',
    code: '#L3',
    price: 115000,
    livePrice: 85000,
    image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=500&auto=format&fit=crop&q=60',
    stock: 30,
    soldCount: 14,
    description: 'Hidratación profunda, combate líneas de expresión y unifica el tono de la piel en 14 días.',
    category: 'Belleza y Cuidado',
    badge: '⭐ RECOMENDADO IA'
  }
];

export default function LiveSellingView() {
  const [activeTab, setActiveTab] = useState<'studio' | 'automation' | 'orders' | 'storefront' | 'domain' | 'analytics'>('studio');
  const [isLive, setIsLive] = useState(true); // Default to live active for instant impact
  const [streamDuration, setStreamDuration] = useState(342);
  const [viewersCount, setViewersCount] = useState(148);
  const [selectedPlatform, setSelectedPlatform] = useState<'recorded_loop' | 'record_studio' | 'camera' | 'tiktok' | 'facebook' | 'instagram' | 'youtube'>('recorded_loop');
  const [streamUrl, setStreamUrl] = useState('');
  const [streamKey, setStreamKey] = useState('live_sec_99481726x');

  // Pre-recorded video in continuous loop 24/7
  const [preRecordedVideos, setPreRecordedVideos] = useState<PreRecordedVideo[]>(PRESET_VIDEOS);
  const [selectedVideoId, setSelectedVideoId] = useState<string>(PRESET_VIDEOS[0].id);
  const selectedVideo = preRecordedVideos.find(v => v.id === selectedVideoId) || preRecordedVideos[0];
  const [isVideoMuted, setIsVideoMuted] = useState(true);
  const [autoRotatePins, setAutoRotatePins] = useState(true);
  const [autoRotateSeconds, setAutoRotateSeconds] = useState(120); // 2 minutes

  // Studio Recording ("Grabar Mi Live 1 Sola Vez")
  const [showRecordingModal, setShowRecordingModal] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [showTeleprompter, setShowTeleprompter] = useState(true);
  const [showStrategyGuide, setShowStrategyGuide] = useState(false);

  // Video and Recording refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const recordPreviewRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordStreamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [micActive, setMicActive] = useState(true);
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('user');

  // Products and Pinned Product
  const [products, setProducts] = useState<LiveProduct[]>(DEFAULT_PRODUCTS);
  const [pinnedProductId, setPinnedProductId] = useState<string>(DEFAULT_PRODUCTS[0].id);
  const [flashOfferSeconds, setFlashOfferSeconds] = useState(240);

  // Comments feed
  const [comments, setComments] = useState<LiveComment[]>([
    { id: 'c1', sender: 'Valentina Gomez', platform: 'tiktok', text: '¿Tienen talla M del vestido #L1?', timestamp: 'Hace 1m' },
    { id: 'c2', sender: 'Carlos_MKT', platform: 'instagram', text: 'QUIERO #L2 en color negro porfa!!', timestamp: 'Hace 45s', isOrderDetected: true, orderId: 'LIVE-49821' },
    { id: 'c3', sender: 'Camila Rios', platform: 'facebook', text: 'PIDO el serum #L3 pago contraentrega en Bogotá', timestamp: 'Hace 20s', isOrderDetected: true, orderId: 'LIVE-49822' },
    { id: 'c4', sender: 'Andrea Morales', platform: 'web', text: '¿Hacen envíos a Medellín?', timestamp: 'Ahora' }
  ]);
  const [newCommentText, setNewCommentText] = useState('');

  // Orders captured
  const [orders, setOrders] = useState<LiveOrder[]>([
    {
      id: 'LIVE-49821',
      customerName: 'Carlos MKT',
      phone: '+57 312 456 7890',
      channel: 'Instagram Live',
      productName: 'Smartwatch Deportivo Ultra Pro X',
      productCode: '#L2',
      price: 179000,
      status: 'Confirmado WhatsApp',
      city: 'Medellín',
      createdAt: 'Hace 45s'
    },
    {
      id: 'LIVE-49822',
      customerName: 'Camila Rios',
      phone: '+57 301 987 6543',
      channel: 'Facebook Live',
      productName: 'Serum Antiedad Ácido Hialurónico + Vitamina C',
      productCode: '#L3',
      price: 85000,
      status: 'Contra Entrega',
      city: 'Bogotá',
      createdAt: 'Hace 20s'
    }
  ]);

  // Comment-to-Order Automation Settings
  const [automationEnabled, setAutomationEnabled] = useState(true);
  const [triggerKeywords, setTriggerKeywords] = useState('QUIERO, PIDO, COMPRO, LO QUIERO, 1, PROMO, ME LO LLEVO, ORDENAR');
  const [autoReplyWhatsApp, setAutoReplyWhatsApp] = useState(true);
  const [autoReplyInChat, setAutoReplyInChat] = useState(true);
  const [waMessageTemplate, setWaMessageTemplate] = useState('¡Hola {{nombre}}! 🎁 Tu pedido en vivo para "{{producto}}" ha sido apartado exitosamente con precio especial de Live por ${{precio}}. Confirma tu dirección de entrega aquí: {{link_checkout}}');
  const [chatReplyTemplate, setChatReplyTemplate] = useState('¡Excelente @{{usuario}}! Pedido apartado 🎉 Te acabamos de enviar el link privado por WhatsApp con tu descuento exclusivo de Live.');
  const [testCommentInput, setTestCommentInput] = useState('QUIERO 2 del producto fijado pago contra entrega');
  const [testSimulationLog, setTestSimulationLog] = useState<string | null>(null);

  // Custom Domain state
  const [customDomain, setCustomDomain] = useState('live.mitienda.com');
  const [dnsResult, setDnsResult] = useState<{
    checked: boolean;
    domain: string;
    recordsFound: string[];
    isConfigured: boolean;
    sslStatus: string;
    details: string;
  } | null>(null);
  const [isVerifyingDns, setIsVerifyingDns] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Timer simulation
  useEffect(() => {
    let interval: any = null;
    if (isLive) {
      interval = setInterval(() => {
        setStreamDuration(prev => prev + 1);
        // Random slight fluctuation in viewers
        setViewersCount(prev => Math.max(80, prev + Math.floor(Math.random() * 5) - 2));
      }, 1000);
    } else {
      setStreamDuration(0);
    }
    return () => clearInterval(interval);
  }, [isLive]);

  // Flash offer countdown
  useEffect(() => {
    let timer: any = null;
    if (flashOfferSeconds > 0) {
      timer = setInterval(() => setFlashOfferSeconds(prev => (prev > 0 ? prev - 1 : 0)), 1000);
    }
    return () => clearInterval(timer);
  }, [flashOfferSeconds]);

  // Auto rotate PIN product every X seconds if enabled in loop mode
  useEffect(() => {
    let rotInterval: any = null;
    if (isLive && autoRotatePins && selectedPlatform === 'recorded_loop') {
      rotInterval = setInterval(() => {
        setPinnedProductId(prev => {
          const idx = products.findIndex(p => p.id === prev);
          const nextIdx = (idx + 1) % products.length;
          return products[nextIdx].id;
        });
        setFlashOfferSeconds(300); // restart 5 min countdown
      }, autoRotateSeconds * 1000);
    }
    return () => clearInterval(rotInterval);
  }, [isLive, autoRotatePins, selectedPlatform, autoRotateSeconds, products]);

  // Recording seconds timer
  useEffect(() => {
    let recTimer: any = null;
    if (isRecording) {
      recTimer = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    } else {
      setRecordingSeconds(0);
    }
    return () => clearInterval(recTimer);
  }, [isRecording]);

  // Recording studio session handlers
  const openRecordingStudio = async () => {
    setShowRecordingModal(true);
    setRecordedVideoUrl(null);
    setIsRecording(false);
    setRecordingSeconds(0);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: cameraFacing },
        audio: true
      });
      recordStreamRef.current = stream;
      if (recordPreviewRef.current) {
        recordPreviewRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn('Error accessing media for recording:', err);
    }
  };

  const closeRecordingStudio = () => {
    if (recordStreamRef.current) {
      recordStreamRef.current.getTracks().forEach(t => t.stop());
      recordStreamRef.current = null;
    }
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setShowRecordingModal(false);
  };

  const startRecordingSession = () => {
    if (!recordStreamRef.current) return;
    setCountdown(3);
    const countInt = setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(countInt);
          try {
            recordedChunksRef.current = [];
            const mimeType = typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
              ? 'video/webm;codecs=vp9'
              : (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : 'video/mp4');
            const mr = new MediaRecorder(recordStreamRef.current!, { mimeType });
            mediaRecorderRef.current = mr;
            mr.ondataavailable = (e) => {
              if (e.data && e.data.size > 0) {
                recordedChunksRef.current.push(e.data);
              }
            };
            mr.onstop = () => {
              const blob = new Blob(recordedChunksRef.current, { type: mimeType });
              const url = URL.createObjectURL(blob);
              setRecordedVideoUrl(url);
            };
            mr.start();
            setIsRecording(true);
          } catch (e) {
            console.error('Recording start error', e);
          }
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopRecordingSession = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const applyRecordedVideoToLoop = () => {
    if (!recordedVideoUrl) return;
    const newVideoItem: PreRecordedVideo = {
      id: 'rec-' + Date.now(),
      title: `Mi Live Grabado (${new Date().toLocaleDateString('es-CO')})`,
      description: 'Grabado desde el estudio con teleprompter de Live Selling',
      url: recordedVideoUrl,
      durationLabel: `${formatTime(recordingSeconds)} (Bucle continuo 24/7)`,
      badge: '🎬 GRABADO POR TI',
      isCustom: true
    };
    setPreRecordedVideos(prev => [newVideoItem, ...prev]);
    setSelectedVideoId(newVideoItem.id);
    setSelectedPlatform('recorded_loop');
    setIsLive(true);
    closeRecordingStudio();
  };

  const handleCustomVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      const newVideoItem: PreRecordedVideo = {
        id: 'upload-' + Date.now(),
        title: file.name.replace(/\.[^/.]+$/, ''),
        description: 'Video subido desde tu computador o celular',
        url: url,
        durationLabel: 'Bucle continuo 24/7',
        badge: '📁 ARCHIVO SUBIDO',
        isCustom: true
      };
      setPreRecordedVideos(prev => [newVideoItem, ...prev]);
      setSelectedVideoId(newVideoItem.id);
      setSelectedPlatform('recorded_loop');
      setIsLive(true);
    }
  };

  // Handle camera start/stop
  const toggleCamera = async () => {
    if (cameraActive) {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
      setCameraActive(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: cameraFacing },
          audio: micActive
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraActive(true);
      } catch (err) {
        console.warn('Could not access camera/mic directly:', err);
        alert('No se pudo acceder a la cámara. Revisa los permisos del navegador o usa una URL de transmisión externa.');
      }
    }
  };

  // Switch front/back camera
  const switchCameraFacing = async () => {
    const nextFacing = cameraFacing === 'user' ? 'environment' : 'user';
    setCameraFacing(nextFacing);
    if (cameraActive) {
      if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: nextFacing },
          audio: micActive
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.warn(err);
      }
    }
  };

  // Get active pinned product
  const pinnedProduct = products.find(p => p.id === pinnedProductId) || products[0];

  // Format currency
  const formatCOP = (val: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);
  };

  // Format seconds to mm:ss
  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle comment submission (Live or simulated)
  const handleSendComment = (textToSend?: string) => {
    const text = textToSend || newCommentText;
    if (!text.trim()) return;

    const lower = text.toLowerCase();
    const keywordsList = triggerKeywords.split(',').map(k => k.trim().toLowerCase()).filter(Boolean);
    const hasOrderIntent = keywordsList.some(kw => lower.includes(kw));

    let detectedProduct = pinnedProduct;
    // Check if there is a specific code mentioned like #L1, #L2
    for (const prod of products) {
      if (lower.includes(prod.code.toLowerCase())) {
        detectedProduct = prod;
        break;
      }
    }

    const orderId = hasOrderIntent ? 'LIVE-' + Math.floor(10000 + Math.random() * 90000) : undefined;

    const newComm: LiveComment = {
      id: 'c_' + Date.now(),
      sender: 'Cliente_EnVivo_' + Math.floor(Math.random() * 900),
      platform: selectedPlatform === 'camera' ? 'web' : selectedPlatform,
      text: text.trim(),
      timestamp: 'Ahora',
      isOrderDetected: hasOrderIntent,
      orderId
    };

    setComments(prev => [newComm, ...prev]);
    if (!textToSend) setNewCommentText('');

    if (hasOrderIntent && orderId && automationEnabled) {
      // Create order
      const newOrd: LiveOrder = {
        id: orderId,
        customerName: newComm.sender,
        phone: '+57 300 ' + Math.floor(1000000 + Math.random() * 9000000),
        channel: selectedPlatform === 'camera' ? 'Tienda Web' : (selectedPlatform === 'tiktok' ? 'TikTok Live' : (selectedPlatform === 'facebook' ? 'Facebook Live' : 'Instagram Live')),
        productName: detectedProduct.name,
        productCode: detectedProduct.code,
        price: detectedProduct.livePrice,
        status: 'Capturado por Comentario',
        city: 'Por confirmar',
        createdAt: 'Ahora'
      };

      setOrders(prev => [newOrd, ...prev]);

      // Decrement stock, increment sold
      setProducts(prev => prev.map(p => {
        if (p.id === detectedProduct.id) {
          return {
            ...p,
            stock: Math.max(0, p.stock - 1),
            soldCount: p.soldCount + 1
          };
        }
        return p;
      }));

      // Post to backend
      fetch('/api/live-selling/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOrd)
      }).catch(err => console.warn('Sync live order note:', err));
    }
  };

  // Test Simulation Engine
  const runSimulationTest = () => {
    if (!testCommentInput.trim()) return;
    const lower = testCommentInput.toLowerCase();
    const keywordsList = triggerKeywords.split(',').map(k => k.trim().toLowerCase()).filter(Boolean);
    const match = keywordsList.find(kw => lower.includes(kw));

    if (match) {
      setTestSimulationLog(`✅ ¡Intención de compra detectada con la palabra "${match.toUpperCase()}"!
• Producto asignado: ${pinnedProduct.name} (${pinnedProduct.code})
• Precio exclusivo Live: ${formatCOP(pinnedProduct.livePrice)}
• Mensaje de WhatsApp despachado al cliente:
"${waMessageTemplate.replace('{{nombre}}', 'Cliente').replace('{{producto}}', pinnedProduct.name).replace('{{precio}}', formatCOP(pinnedProduct.livePrice)).replace('{{link_checkout}}', `https://${customDomain || 'tienda.com'}/checkout/LIVE-9921`)}"
• Respuesta automática enviada en el chat:
"${chatReplyTemplate.replace('{{usuario}}', 'Cliente')}"`);
      handleSendComment(testCommentInput);
    } else {
      setTestSimulationLog(`ℹ️ El comentario "${testCommentInput}" no contiene ninguna de las palabras clave de compra (${triggerKeywords}). Se procesó como una consulta regular.`);
      handleSendComment(testCommentInput);
    }
  };

  // Verify Custom DNS
  const handleVerifyDns = async () => {
    const clean = customDomain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!clean) {
      alert('Ingresa un dominio o subdominio válido.');
      return;
    }

    setIsVerifyingDns(true);
    setDnsResult(null);

    try {
      const res = await fetch('/api/domain/verify-dns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: clean,
          isSubdomain: clean.split('.').length > 2
        })
      });
      const data = await res.json();
      setDnsResult(data);
    } catch (err: any) {
      setDnsResult({
        checked: true,
        domain: clean,
        recordsFound: [],
        isConfigured: false,
        sslStatus: 'Pendiente',
        details: 'No se pudo conectar con el verificador DNS.'
      });
    } finally {
      setIsVerifyingDns(false);
    }
  };

  // Copy shareable live link
  const copyLiveLink = () => {
    const url = `https://${customDomain || 'live.tudominio.com'}/live/estreno-especial`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Total sales calculation
  const totalSalesRevenue = orders.reduce((sum, o) => sum + (o.price || 0), 0);

  return (
    <div className="space-y-6 w-full pb-16 text-gray-100 animate-fade-in">

      {/* Top Main Banner - Effi + Pancake style */}
      <div className="p-6 rounded-2xl border border-red-500/20 bg-gradient-to-r from-gray-950 via-gray-900 to-red-950/20 relative overflow-hidden shadow-xl">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-red-600 to-amber-600 text-white shadow-lg shadow-red-600/30 shrink-0">
              <Radio size={28} className={isLive ? 'animate-pulse' : ''} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs uppercase font-extrabold tracking-wider px-2.5 py-0.5 rounded-md bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-red-500 animate-ping' : 'bg-gray-500'}`} />
                  {isLive ? 'EN VIVO AHORA' : 'SALA DE TRANSMISIÓN LISTA'}
                </span>
                <span className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <Sparkles size={12} /> Motor Pancake + Effi Live Selling
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold font-display text-white mt-1.5 flex items-center gap-2">
                Live Selling & Automatización de Pedidos
              </h1>
              <p className="text-gray-400 text-xs sm:text-sm mt-1 max-w-2xl">
                Transmite en vivo, fija productos en pantalla con ofertas relámpago, convierte comentarios de Facebook, TikTok, Instagram y Web en pedidos automáticos y envía checkout por WhatsApp en segundos con tu propio dominio.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => setIsLive(!isLive)}
              className={`px-5 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 shadow-lg cursor-pointer ${
                isLive
                  ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/40 animate-pulse'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
              }`}
            >
              {isLive ? (
                <>
                  <Pause size={16} /> Finalizar Transmisión
                </>
              ) : (
                <>
                  <Play size={16} fill="currentColor" /> Iniciar Live Selling
                </>
              )}
            </button>

            <button
              onClick={copyLiveLink}
              className="px-4 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm font-semibold border border-gray-700 transition flex items-center gap-2"
              title="Copiar enlace público del Live"
            >
              {copiedLink ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
              <span>{copiedLink ? '¡Enlace Copiado!' : 'Enlace del Live'}</span>
            </button>
          </div>
        </div>

        {/* Live Counters strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-gray-800/80">
          <div className="bg-gray-900/60 p-3 rounded-xl border border-gray-800 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10 text-red-400">
              <Eye size={18} />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase font-bold">Espectadores</p>
              <p className="text-lg font-bold text-white">{isLive ? viewersCount : '0'} en vivo</p>
            </div>
          </div>

          <div className="bg-gray-900/60 p-3 rounded-xl border border-gray-800 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <DollarSign size={18} />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase font-bold">Ventas del Live</p>
              <p className="text-lg font-bold text-emerald-400">{formatCOP(totalSalesRevenue)}</p>
            </div>
          </div>

          <div className="bg-gray-900/60 p-3 rounded-xl border border-gray-800 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <ShoppingBag size={18} />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase font-bold">Pedidos Capturados</p>
              <p className="text-lg font-bold text-white">{orders.length} pedidos</p>
            </div>
          </div>

          <div className="bg-gray-900/60 p-3 rounded-xl border border-gray-800 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <Clock size={18} />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase font-bold">Tiempo en el Aire</p>
              <p className="text-lg font-bold text-amber-400 font-mono">{formatTime(streamDuration)}</p>
            </div>
          </div>
        </div>

        {/* STRATEGY BANNER: "GRABAR 1 SOLA VEZ & VENDER 24/7" (EFFI + PANCAKE METHOD) */}
        <div className="mt-5 p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-red-500/10 to-blue-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0 mt-0.5">
              <Repeat size={20} className="animate-spin" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded">
                  Metodología Secreta Effi + Pancake
                </span>
                <span className="text-xs font-bold text-emerald-400">🔥 Graba 1 sola vez, vende 24/7</span>
              </div>
              <p className="text-xs text-gray-200 mt-1 font-medium leading-relaxed">
                <strong>No tienes que estar en vivo 8 horas al día.</strong> Te grabas <strong>una sola vez</strong> haciendo tu mejor presentación de 10 a 20 minutos con tu gancho y ofertas relámpago. El sistema lo reproduce en bucle continuo 24/7 simulando un Live real, mientras Pancake e IA escanean comentarios y cierran pedidos por WhatsApp automáticamente.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0 w-full sm:w-auto">
            <button
              onClick={openRecordingStudio}
              className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-extrabold shadow-md shadow-red-600/30 transition flex items-center gap-1.5 cursor-pointer"
            >
              <CircleDot size={14} className="text-white animate-pulse" /> Grabar Mi Video (1 Sola Vez)
            </button>
            <button
              onClick={() => {
                setSelectedPlatform('recorded_loop');
                setIsLive(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-amber-300 text-xs font-bold border border-amber-500/30 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Repeat size={14} /> Activar Bucle 24/7
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex overflow-x-auto scrollbar-none gap-2 p-1.5 rounded-xl bg-gray-900/90 border border-gray-800">
        {[
          { id: 'studio', label: 'Estudio en Vivo & PIN', icon: <Video size={16} /> },
          { id: 'automation', label: 'Automatización de Comentarios', icon: <Zap size={16} /> },
          { id: 'orders', label: `Pedidos en Vivo (${orders.length})`, icon: <ShoppingBag size={16} /> },
          { id: 'storefront', label: 'Escaparate del Cliente', icon: <Tv size={16} /> },
          { id: 'domain', label: 'Conectar Dominio Propio', icon: <Globe size={16} /> },
          { id: 'analytics', label: 'Métricas & Conversión', icon: <Flame size={16} /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === tab.id
                ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: STUDIO EN VIVO & PINNED PRODUCTS */}
      {activeTab === 'studio' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Main Video Live Broadcast Stage (Col 7) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="panel p-4 rounded-2xl border border-gray-800 bg-gray-900/80 space-y-3">

              {/* Controls bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-800">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-gray-300">Modo de Transmisión:</span>
                  <select
                    value={selectedPlatform}
                    onChange={(e) => setSelectedPlatform(e.target.value as any)}
                    className="bg-gray-800 border border-amber-500/40 text-amber-300 text-xs rounded-lg px-2.5 py-1.5 font-bold focus:outline-none focus:border-red-500"
                  >
                    <option value="recorded_loop">🔄 Video Pregrabado en Bucle 24/7 (Graba 1 sola vez)</option>
                    <option value="camera">📹 Cámara Web / Celular Directo</option>
                    <option value="tiktok">🎵 TikTok Live (RTMP)</option>
                    <option value="facebook">📘 Facebook Live (RTMP)</option>
                    <option value="instagram">📸 Instagram Live (RTMP)</option>
                    <option value="youtube">▶️ YouTube Live</option>
                  </select>
                </div>

                {selectedPlatform === 'recorded_loop' && (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={openRecordingStudio}
                      className="px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition flex items-center gap-1 shadow-sm cursor-pointer"
                    >
                      <CircleDot size={13} className="text-white animate-pulse" /> Grabar Nuevo Live
                    </button>
                    <label className="px-2.5 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold border border-gray-700 cursor-pointer flex items-center gap-1">
                      <Upload size={13} /> Subir MP4
                      <input type="file" accept="video/mp4,video/webm" onChange={handleCustomVideoUpload} className="hidden" />
                    </label>
                  </div>
                )}

                {selectedPlatform === 'camera' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={toggleCamera}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                        cameraActive ? 'bg-red-500/20 text-red-400 border border-red-500/40' : 'bg-gray-800 hover:bg-gray-700 text-gray-200'
                      }`}
                    >
                      {cameraActive ? <CameraOff size={14} /> : <Camera size={14} />}
                      {cameraActive ? 'Apagar Cámara' : 'Encender Cámara'}
                    </button>
                    {cameraActive && (
                      <button
                        onClick={switchCameraFacing}
                        className="px-2.5 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold border border-gray-700"
                        title="Cambiar Cámara Frontal / Trasera"
                      >
                        🔄 Rotar
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* In Pre-recorded Loop mode: Video selection banner */}
              {selectedPlatform === 'recorded_loop' && (
                <div className="p-3 rounded-xl bg-gray-950/80 border border-amber-500/20 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <Film size={14} className="text-amber-400 shrink-0" />
                    <span className="font-bold text-gray-300">Video en Bucle:</span>
                    <select
                      value={selectedVideoId}
                      onChange={(e) => setSelectedVideoId(e.target.value)}
                      className="bg-gray-900 border border-gray-700 text-white rounded-lg px-2 py-1 font-medium focus:outline-none focus:border-amber-400 max-w-xs truncate"
                    >
                      {preRecordedVideos.map(vid => (
                        <option key={vid.id} value={vid.id}>
                          {vid.title} ({vid.durationLabel})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 text-[11px] text-gray-400 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={autoRotatePins}
                        onChange={(e) => setAutoRotatePins(e.target.checked)}
                        className="rounded bg-gray-800 border-gray-700 text-amber-500 focus:ring-0"
                      />
                      <span>Rotar PIN auto ({Math.round(autoRotateSeconds / 60)}m)</span>
                    </label>

                    <button
                      onClick={() => setIsVideoMuted(!isVideoMuted)}
                      className={`px-2 py-1 rounded-lg border text-xs font-bold flex items-center gap-1 transition ${
                        isVideoMuted ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                      }`}
                    >
                      {isVideoMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
                      <span>{isVideoMuted ? 'Audio Silenciado' : 'Audio Activo'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Video Player / Camera Feed Viewport */}
              <div className="relative aspect-video w-full rounded-xl bg-black border border-gray-800 overflow-hidden flex items-center justify-center group shadow-2xl">
                {selectedPlatform === 'recorded_loop' ? (
                  <div className="relative w-full h-full flex items-center justify-center bg-black">
                    <video
                      key={selectedVideo.url}
                      src={selectedVideo.url}
                      autoPlay
                      loop
                      playsInline
                      muted={isVideoMuted}
                      className="w-full h-full object-cover"
                    />
                    {/* Floating Audio Unmute reminder if muted */}
                    {isVideoMuted && (
                      <button
                        onClick={() => setIsVideoMuted(false)}
                        className="absolute top-14 right-3 z-20 px-2.5 py-1 rounded-full bg-black/80 hover:bg-black text-amber-300 text-[11px] font-bold border border-amber-400/40 backdrop-blur-md flex items-center gap-1.5 transition shadow-lg cursor-pointer"
                      >
                        <VolumeX size={13} /> Activar audio
                      </button>
                    )}
                  </div>
                ) : selectedPlatform === 'camera' ? (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className={`w-full h-full object-cover ${cameraFacing === 'user' ? '-scale-x-100' : ''} ${!cameraActive ? 'hidden' : ''}`}
                    />
                    {!cameraActive && (
                      <div className="text-center p-6 space-y-3">
                        <div className="w-16 h-16 rounded-full bg-gray-900 border border-gray-800 flex items-center justify-center mx-auto text-gray-500">
                          <Camera size={28} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-200">Cámara en Espera</p>
                          <p className="text-xs text-gray-500 mt-1 max-w-xs">Haz clic en &quot;Encender Cámara&quot; o conecta tu software de transmisión (OBS / Restream / StreamYard).</p>
                        </div>
                        <button
                          onClick={toggleCamera}
                          className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/30"
                        >
                          Encender Cámara Ahora
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center p-6 space-y-3 w-full max-w-md">
                    <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mx-auto border border-red-500/20">
                      <Tv size={24} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white capitalize">Conexión con {selectedPlatform} Live</p>
                      <p className="text-xs text-gray-400 mt-1">Ingresa tu Clave de Stream para recibir la señal en vivo:</p>
                    </div>
                    <div className="space-y-2 text-left">
                      <input
                        type="text"
                        placeholder={`URL del Live en ${selectedPlatform}...`}
                        value={streamUrl}
                        onChange={(e) => setStreamUrl(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
                      />
                      <div className="flex items-center gap-2">
                        <input
                          type="password"
                          value={streamKey}
                          readOnly
                          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-400 font-mono"
                        />
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(streamKey);
                            alert('Clave de Stream copiada');
                          }}
                          className="px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-gray-200 border border-gray-700"
                        >
                          Copiar
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* OVERLAYS ON TOP OF VIDEO */}
                {/* Live Badge top left */}
                <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
                  <div className="bg-black/70 backdrop-blur-md px-3 py-1 rounded-full border border-red-500/40 flex items-center gap-2 shadow-lg">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                    <span className="text-[11px] font-extrabold text-white tracking-wider">LIVE</span>
                    <span className="text-[11px] font-mono text-gray-300 border-l border-gray-700 pl-2">{formatTime(streamDuration)}</span>
                  </div>

                  <div className="bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 flex items-center gap-1.5 text-gray-300 text-[11px] font-bold shadow-lg">
                    <Users size={12} className="text-red-400" />
                    <span>{viewersCount}</span>
                  </div>
                </div>

                {/* Brand water mark top right */}
                <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-lg border border-white/10 text-[10px] font-extrabold text-amber-400 tracking-widest uppercase z-10">
                  ⚡ LIVE SHOPPING
                </div>

                {/* PINNED PRODUCT FLOATING OVERLAY (BOTTOM OF VIDEO - PANCAKE STYLE) */}
                {pinnedProduct && (
                  <div className="absolute bottom-3 left-3 right-3 bg-gray-950/90 backdrop-blur-md border border-amber-500/40 p-3 rounded-2xl flex items-center justify-between gap-3 shadow-2xl z-10 animate-slide-up">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-gray-900 border border-gray-800 shrink-0">
                        <img src={pinnedProduct.image} alt={pinnedProduct.name} className="w-full h-full object-cover" />
                        <span className="absolute top-0.5 left-0.5 bg-amber-500 text-black text-[9px] font-extrabold px-1.5 py-0.5 rounded">
                          {pinnedProduct.code}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] uppercase font-black bg-red-600 text-white px-1.5 py-0.2 rounded animate-pulse">
                            OFERTA EN VIVO
                          </span>
                          <span className="text-[10px] text-amber-400 font-mono font-bold flex items-center gap-0.5">
                            <Clock size={10} /> {formatTime(flashOfferSeconds)}
                          </span>
                        </div>
                        <h4 className="text-xs sm:text-sm font-bold text-white truncate mt-0.5">{pinnedProduct.name}</h4>
                        <div className="flex items-baseline gap-2 mt-0.5">
                          <span className="text-sm sm:text-base font-extrabold text-emerald-400">{formatCOP(pinnedProduct.livePrice)}</span>
                          <span className="text-[11px] text-gray-500 line-through">{formatCOP(pinnedProduct.price)}</span>
                          <span className="text-[10px] text-gray-400">({pinnedProduct.stock} disp.)</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <div className="text-[10px] text-amber-300 font-extrabold bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30">
                        Comenta: &quot;{pinnedProduct.code}&quot;
                      </div>
                      <button
                        onClick={() => handleSendComment(`QUIERO ${pinnedProduct.code} para mí!`)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shadow-md shadow-emerald-600/30 transition flex items-center gap-1"
                      >
                        <ShoppingBag size={12} /> Comprar Ya
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Flash Offer & Pinned Actions */}
              <div className="p-3 bg-gray-900/90 rounded-xl border border-gray-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-amber-400 flex items-center gap-1">
                    <Flame size={14} /> Oferta Relámpago:
                  </span>
                  <span className="text-gray-300">Descuento aplicado: <strong>25% OFF</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setFlashOfferSeconds(300)}
                    className="px-2.5 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium"
                  >
                    +5 min
                  </button>
                  <button
                    onClick={() => {
                      const nextIdx = (products.findIndex(p => p.id === pinnedProductId) + 1) % products.length;
                      setPinnedProductId(products[nextIdx].id);
                      setFlashOfferSeconds(300);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-extrabold flex items-center gap-1 shadow-md shadow-amber-500/20"
                  >
                    Siguiente Producto PIN →
                  </button>
                </div>
              </div>
            </div>

            {/* Catalog of Products assigned to the Live */}
            <div className="panel p-4 rounded-2xl border border-gray-800 bg-gray-900/80 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Tag size={16} className="text-amber-400" />
                  Catálogo del Live ({products.length} productos listados)
                </h3>
                <span className="text-[11px] text-gray-400">Haz clic en &quot;Fijar PIN&quot; para destacarlo en vivo</span>
              </div>

              <div className="space-y-2">
                {products.map(prod => {
                  const isPinned = prod.id === pinnedProductId;
                  return (
                    <div
                      key={prod.id}
                      className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                        isPinned
                          ? 'bg-amber-500/10 border-amber-500/50 shadow-md shadow-amber-500/5'
                          : 'bg-gray-950/60 border-gray-800 hover:border-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <img src={prod.image} alt={prod.name} className="w-12 h-12 rounded-lg object-cover bg-gray-900 shrink-0" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/30">
                              {prod.code}
                            </span>
                            <p className="text-xs font-bold text-white truncate">{prod.name}</p>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-[11px]">
                            <span className="text-emerald-400 font-bold">{formatCOP(prod.livePrice)}</span>
                            <span className="text-gray-500 line-through">{formatCOP(prod.price)}</span>
                            <span className="text-gray-400">Stock: <strong className="text-white">{prod.stock}</strong></span>
                            <span className="text-amber-400">Vendidos: <strong>{prod.soldCount}</strong></span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isPinned ? (
                          <span className="px-3 py-1.5 rounded-lg bg-amber-500 text-black font-extrabold text-xs flex items-center gap-1 shadow-sm">
                            <CheckCheck size={14} /> FIJADO EN VIVO
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              setPinnedProductId(prod.id);
                              setFlashOfferSeconds(300);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-bold border border-gray-700 transition"
                          >
                            Fijar PIN
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Live Comments Feed & Real-Time Order Capture (Col 5) */}
          <div className="lg:col-span-5 space-y-4 flex flex-col">
            <div className="panel p-4 rounded-2xl border border-gray-800 bg-gray-900/80 flex-1 flex flex-col">

              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-gray-800 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
                    <MessageSquare size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Comentarios en Tiempo Real</h3>
                    <p className="text-[10px] text-gray-400">Escaneo automático de pedidos tipo Pancake</p>
                  </div>
                </div>

                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Auto-Captura ON
                </span>
              </div>

              {/* Comments Stream */}
              <div className="space-y-2.5 my-3 flex-1 overflow-y-auto max-h-[440px] pr-1">
                {comments.map(comm => (
                  <div
                    key={comm.id}
                    className={`p-3 rounded-xl border text-xs transition-all ${
                      comm.isOrderDetected
                        ? 'bg-emerald-950/30 border-emerald-500/40 shadow-sm'
                        : 'bg-gray-950/60 border-gray-800/80'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-extrabold uppercase px-1.5 py-0.2 rounded ${
                          comm.platform === 'tiktok' ? 'bg-black text-white border border-gray-700' :
                          comm.platform === 'facebook' ? 'bg-blue-600 text-white' :
                          comm.platform === 'instagram' ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white'
                        }`}>
                          {comm.platform}
                        </span>
                        <span className="font-bold text-gray-200">{comm.sender}</span>
                      </div>
                      <span className="text-[10px] text-gray-500 font-mono">{comm.timestamp}</span>
                    </div>

                    <p className="text-gray-300">{comm.text}</p>

                    {comm.isOrderDetected && (
                      <div className="mt-2 pt-2 border-t border-emerald-500/20 flex items-center justify-between gap-2">
                        <span className="text-[10px] font-extrabold text-emerald-400 flex items-center gap-1">
                          <Zap size={12} className="fill-emerald-400" />
                          ¡Pedido Generado ({comm.orderId})!
                        </span>
                        <span className="text-[10px] text-gray-400 bg-black/40 px-2 py-0.5 rounded">
                          📲 WA Despachado
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Quick simulation buttons to test comment automation */}
              <div className="pt-2 border-t border-gray-800 shrink-0 space-y-2">
                <p className="text-[10px] uppercase font-bold text-gray-400 flex items-center gap-1">
                  <Sparkles size={11} className="text-amber-400" /> Simular Comentario de Cliente:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => handleSendComment('QUIERO el vestido #L1 para entrega mañana en Cali!')}
                    className="px-2.5 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-[10px] font-medium border border-gray-700 transition"
                  >
                    &quot;QUIERO #L1...&quot;
                  </button>
                  <button
                    onClick={() => handleSendComment('PIDO el smartwatch #L2 pago contraentrega')}
                    className="px-2.5 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-[10px] font-medium border border-gray-700 transition"
                  >
                    &quot;PIDO #L2...&quot;
                  </button>
                  <button
                    onClick={() => handleSendComment('COMPRO 2 del producto fijado')}
                    className="px-2.5 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-[10px] font-medium border border-gray-700 transition"
                  >
                    &quot;COMPRO producto fijado&quot;
                  </button>
                </div>

                {/* Input to send manual comment or response */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendComment();
                  }}
                  className="flex items-center gap-2 pt-1"
                >
                  <input
                    type="text"
                    placeholder="Escribe un comentario en vivo..."
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    className="flex-1 bg-gray-950 border border-gray-700 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
                  />
                  <button
                    type="submit"
                    className="p-2 rounded-xl bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-600/30 transition"
                  >
                    <Send size={14} />
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: AUTOMATIZACIÓN DE COMENTARIOS A PEDIDOS (PANCAKE STYLE) */}
      {activeTab === 'automation' && (
        <div className="space-y-6">
          <div className="panel p-6 rounded-2xl border border-gray-800 bg-gray-900/80 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Zap size={20} />
                  </span>
                  <div>
                    <h2 className="text-lg font-bold text-white">Motor Comment-to-Order (Estilo Pancake)</h2>
                    <p className="text-xs text-gray-400">Captura pedidos en tiempo real analizando los comentarios del Live</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-300">Estado de Automatización:</span>
                <button
                  onClick={() => setAutomationEnabled(!automationEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                    automationEnabled ? 'bg-emerald-600' : 'bg-gray-700'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                    automationEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Keywords Configuration */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-200 mb-1">
                    Palabras Clave de Detección de Compra:
                  </label>
                  <p className="text-[11px] text-gray-400 mb-2">
                    Si un espectador escribe cualquiera de estas palabras en Facebook, TikTok o Instagram, se creará el pedido automáticamente.
                  </p>
                  <textarea
                    rows={3}
                    value={triggerKeywords}
                    onChange={(e) => setTriggerKeywords(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {triggerKeywords.split(',').map((k, i) => (
                      <span key={i} className="text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded-full font-mono">
                        {k.trim()}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Auto Reply on WhatsApp */}
                <div className="p-4 rounded-xl bg-gray-950/60 border border-gray-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <Smartphone size={14} /> Envío Inmediato de Checkout por WhatsApp
                    </label>
                    <input
                      type="checkbox"
                      checked={autoReplyWhatsApp}
                      onChange={(e) => setAutoReplyWhatsApp(e.target.checked)}
                      className="rounded accent-emerald-500"
                    />
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Dispara un mensaje privado con el enlace de pago o confirmación con dirección al cliente.
                  </p>
                  <textarea
                    rows={3}
                    value={waMessageTemplate}
                    onChange={(e) => setWaMessageTemplate(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                  <p className="text-[10px] text-gray-500">Variables disponibles: &#123;&#123;nombre&#125;&#125;, &#123;&#123;producto&#125;&#125;, &#123;&#123;precio&#125;&#125;, &#123;&#123;link_checkout&#125;&#125;</p>
                </div>

                {/* Auto Reply in Chat */}
                <div className="p-4 rounded-xl bg-gray-950/60 border border-gray-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                      <MessageSquare size={14} /> Respuesta Pública en el Chat del Live
                    </label>
                    <input
                      type="checkbox"
                      checked={autoReplyInChat}
                      onChange={(e) => setAutoReplyInChat(e.target.checked)}
                      className="rounded accent-blue-500"
                    />
                  </div>
                  <textarea
                    rows={2}
                    value={chatReplyTemplate}
                    onChange={(e) => setChatReplyTemplate(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Interactive Simulator and Tester */}
              <div className="space-y-4">
                <div className="p-5 rounded-2xl bg-gradient-to-br from-gray-950 to-amber-950/20 border border-amber-500/30 space-y-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sparkles size={16} className="text-amber-400" />
                    Simulador Interactivo de Comentarios
                  </h3>
                  <p className="text-xs text-gray-400">
                    Escribe un comentario como si fueras un espectador en Facebook, TikTok o Instagram para comprobar cómo el motor reacciona en vivo.
                  </p>

                  <div className="space-y-2">
                    <input
                      type="text"
                      value={testCommentInput}
                      onChange={(e) => setTestCommentInput(e.target.value)}
                      placeholder="Ej: QUIERO el vestido talla M pago en casa..."
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                    <button
                      onClick={runSimulationTest}
                      className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs shadow-md shadow-amber-500/20 transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Zap size={14} /> Probar Automatización Ahora
                    </button>
                  </div>

                  {testSimulationLog && (
                    <div className="p-3.5 rounded-xl bg-black/60 border border-gray-800 text-xs text-gray-300 font-mono whitespace-pre-line">
                      {testSimulationLog}
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-xl bg-gray-950 border border-gray-800 space-y-2">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-emerald-400" /> Reglas Anti-Duplicados
                  </h4>
                  <ul className="text-xs text-gray-400 space-y-1 list-disc list-inside">
                    <li>Si un usuario comenta múltiples veces en menos de 2 minutos, se agrupa en un solo pedido.</li>
                    <li>Detección inteligente de números telefónicos en comentarios.</li>
                    <li>Soporte de códigos rápidos (#L1, #L2, #PROMO) independientemente de mayúsculas/minúsculas.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PEDIDOS DEL LIVE EN TIEMPO REAL */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <div className="panel p-6 rounded-2xl border border-gray-800 bg-gray-900/80 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <ShoppingBag size={20} className="text-emerald-400" />
                  Pedidos Capturados en Vivo ({orders.length})
                </h2>
                <p className="text-xs text-gray-400">Órdenes generadas automáticamente por comentarios y compras del Live</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const csvContent = "data:text/csv;charset=utf-8,"
                      + ["ID,Cliente,Teléfono,Canal,Producto,Total,Estado,Fecha"]
                        .concat(orders.map(o => `${o.id},"${o.customerName}",${o.phone},${o.channel},"${o.productName}",${o.price},${o.status},${o.createdAt}`))
                        .join("\n");
                    const encodedUri = encodeURI(csvContent);
                    const link = document.createElement("a");
                    link.setAttribute("href", encodedUri);
                    link.setAttribute("download", `pedidos_live_${new Date().toISOString().slice(0,10)}.csv`);
                    document.body.appendChild(link);
                    link.click();
                  }}
                  className="px-3.5 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-bold border border-gray-700 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <FileSpreadsheet size={14} className="text-emerald-400" /> Exportar a CSV / Excel
                </button>
              </div>
            </div>

            {/* Orders Table */}
            <div className="overflow-x-auto rounded-xl border border-gray-800">
              <table className="w-full text-left text-xs text-gray-300">
                <thead className="bg-gray-950 text-gray-400 uppercase text-[10px] font-bold border-b border-gray-800">
                  <tr>
                    <th className="p-3">ID Pedido</th>
                    <th className="p-3">Cliente</th>
                    <th className="p-3">Canal</th>
                    <th className="p-3">Producto</th>
                    <th className="p-3">Total</th>
                    <th className="p-3">Estado</th>
                    <th className="p-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60 bg-gray-900/40">
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center p-6 text-gray-500">
                        No hay pedidos registrados en esta sesión. Simula comentarios o inicia el Live.
                      </td>
                    </tr>
                  ) : (
                    orders.map(order => (
                      <tr key={order.id} className="hover:bg-gray-800/30 transition">
                        <td className="p-3 font-mono font-bold text-amber-400">{order.id}</td>
                        <td className="p-3">
                          <p className="font-bold text-white">{order.customerName}</p>
                          <p className="text-[11px] text-gray-400 font-mono">{order.phone}</p>
                        </td>
                        <td className="p-3">
                          <span className="bg-gray-800 px-2 py-0.5 rounded text-[11px] text-gray-300 border border-gray-700">
                            {order.channel}
                          </span>
                        </td>
                        <td className="p-3 font-medium text-gray-200">
                          {order.productName} <span className="text-amber-400 font-mono font-bold">({order.productCode})</span>
                        </td>
                        <td className="p-3 font-bold text-emerald-400">{formatCOP(order.price)}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            order.status === 'Confirmado WhatsApp' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                            order.status === 'Contra Entrega' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                            order.status === 'Pagado' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                            'bg-gray-800 text-gray-300 border-gray-700'
                          }`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <a
                            href={`https://wa.me/${order.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`¡Hola ${order.customerName}! Confirmamos tu pedido #${order.id} en vivo.`)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold"
                          >
                            <Smartphone size={12} /> WhatsApp
                          </a>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: ESCAPARATE / TIENDA PÚBLICA DEL LIVE */}
      {activeTab === 'storefront' && (
        <div className="space-y-6">
          <div className="panel p-6 rounded-2xl border border-gray-800 bg-gray-900/80 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Tv size={20} className="text-blue-400" />
                  Escaparate Público en Tiempo Real (Live Storefront)
                </h2>
                <p className="text-xs text-gray-400">
                  Esta es la página pública donde tus espectadores ven el stream, el producto fijado y compran contra-entrega o tarjeta.
                </p>
              </div>

              <button
                onClick={() => {
                  window.open(`https://${customDomain || 'live.tudominio.com'}/live/estreno`, '_blank');
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-blue-600/20"
              >
                <ExternalLink size={14} /> Abrir Tienda Pública en Nueva Ventana
              </button>
            </div>

            {/* Mock View of the Mobile Storefront */}
            <div className="max-w-md mx-auto bg-black rounded-3xl border-4 border-gray-800 overflow-hidden shadow-2xl space-y-0">

              {/* Video Screen */}
              <div className="relative aspect-[9/14] bg-gray-900 overflow-hidden flex flex-col justify-between p-4">
                {selectedPlatform === 'recorded_loop' ? (
                  <video
                    src={selectedVideo.url}
                    autoPlay
                    loop
                    playsInline
                    muted={true}
                    className="absolute inset-0 w-full h-full object-cover filter brightness-90"
                  />
                ) : (
                  <img
                    src={pinnedProduct.image}
                    alt={pinnedProduct.name}
                    className="absolute inset-0 w-full h-full object-cover opacity-60 filter brightness-75"
                  />
                )}

                {/* Header in mobile */}
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-red-500/40">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                    <span className="text-[10px] font-extrabold text-white">LIVE</span>
                    <span className="text-[10px] text-gray-300 font-mono">142 viendo</span>
                  </div>

                  <span className="text-[10px] font-bold text-amber-400 bg-black/60 px-2 py-0.5 rounded-full">
                    {customDomain || 'live.mitienda.com'}
                  </span>
                </div>

                {/* Floating comments over video in mobile */}
                <div className="relative z-10 space-y-1.5 max-h-36 overflow-hidden">
                  <div className="bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-lg text-[10px] text-white max-w-xs">
                    <span className="font-bold text-amber-400">@maria_p: </span>
                    ¿Tienen envío gratis?
                  </div>
                  <div className="bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-lg text-[10px] text-white max-w-xs">
                    <span className="font-bold text-emerald-400">@carlos: </span>
                    QUIERO 1 pago contra entrega!
                  </div>
                </div>

                {/* Pinned Product Card in Mobile */}
                <div className="relative z-10 bg-gray-950/95 backdrop-blur-md border border-amber-500/50 p-3 rounded-2xl space-y-2 shadow-2xl">
                  <div className="flex items-center gap-2">
                    <img src={pinnedProduct.image} alt={pinnedProduct.name} className="w-12 h-12 rounded-lg object-cover bg-gray-900 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] text-red-400 font-extrabold uppercase animate-pulse">OFERTA ESPECIAL LIVE</p>
                      <h4 className="text-xs font-bold text-white truncate">{pinnedProduct.name}</h4>
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-extrabold text-emerald-400">{formatCOP(pinnedProduct.livePrice)}</span>
                        <span className="text-[10px] text-gray-500 line-through">{formatCOP(pinnedProduct.price)}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      alert(`¡Gracias! Pedido para "${pinnedProduct.name}" registrado con pago contra entrega.`);
                      handleSendComment(`QUIERO ${pinnedProduct.code} compra rápida web`);
                    }}
                    className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-1.5"
                  >
                    <ShoppingBag size={14} /> Comprar Ahora (Contra Entrega)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: CONECTAR DOMINIO PROPIO (CUSTOM DOMAIN PARA LIVE SELLING) */}
      {activeTab === 'domain' && (
        <div className="space-y-6">
          <div className="panel p-6 sm:p-8 rounded-2xl border border-gray-800 bg-gray-900/80 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-5">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <Globe size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Dominio Propio para Live Selling</h2>
                  <p className="text-xs text-gray-400">
                    Transmite y comparte tus enlaces de Live Selling bajo tu propio dominio (ej: <strong>live.mitienda.com</strong>)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                  <ShieldCheck size={14} /> SSL Automático Incluido
                </span>
              </div>
            </div>

            {/* Step 1: Input Domain */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-200 mb-1">
                    Tu Dominio o Subdominio para Live Selling:
                  </label>
                  <p className="text-[11px] text-gray-400 mb-2">
                    Recomendado: un subdominio como <code className="text-amber-400">live.tumarca.com</code> o <code className="text-amber-400">envivo.tumarca.com</code>
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="live.mitienda.com"
                      value={customDomain}
                      onChange={(e) => setCustomDomain(e.target.value)}
                      className="flex-1 bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
                    />
                    <button
                      onClick={handleVerifyDns}
                      disabled={isVerifyingDns}
                      className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition shadow-lg shadow-blue-600/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isVerifyingDns ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" /> Verificando...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={14} /> Verificar DNS en Vivo
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* DNS Instructions Table */}
                <div className="p-4 rounded-xl bg-gray-950/80 border border-gray-800 space-y-3">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Server size={14} className="text-blue-400" /> Registros DNS Requeridos en tu Proveedor
                  </h4>
                  <p className="text-[11px] text-gray-400">
                    Ingresa al panel de tu dominio (Cloudflare, GoDaddy, Namecheap, Hostinger) y agrega:
                  </p>

                  <div className="overflow-x-auto text-[11px] font-mono">
                    <table className="w-full text-left">
                      <thead className="bg-gray-900 text-gray-400">
                        <tr>
                          <th className="p-2">Tipo</th>
                          <th className="p-2">Nombre / Host</th>
                          <th className="p-2">Valor / Destino</th>
                          <th className="p-2">TTL</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800 text-gray-300">
                        <tr>
                          <td className="p-2 font-bold text-amber-400">CNAME</td>
                          <td className="p-2 text-white">live</td>
                          <td className="p-2 text-emerald-400">crm.xorbit360.com</td>
                          <td className="p-2 text-gray-500">Auto / 300</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Verification result box */}
                {dnsResult && (
                  <div className={`p-4 rounded-xl border text-xs space-y-2 ${
                    dnsResult.isConfigured
                      ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-300'
                      : 'bg-amber-950/30 border-amber-500/50 text-amber-300'
                  }`}>
                    <div className="flex items-center gap-2 font-bold">
                      {dnsResult.isConfigured ? <CheckCircle2 size={16} className="text-emerald-400" /> : <AlertCircle size={16} className="text-amber-400" />}
                      <span>{dnsResult.isConfigured ? '¡DNS Propagado y Listo!' : 'Verificación de DNS Pendiente'}</span>
                    </div>
                    <p className="text-gray-300">{dnsResult.details}</p>
                    <div className="text-[11px] font-mono text-gray-400">
                      Estado SSL: <strong className="text-white">{dnsResult.sslStatus}</strong>
                    </div>
                  </div>
                )}
              </div>

              {/* Shareable Links with the Custom Domain */}
              <div className="space-y-4">
                <div className="p-5 rounded-2xl bg-gradient-to-br from-gray-950 to-blue-950/20 border border-blue-500/30 space-y-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Share2 size={16} className="text-blue-400" />
                    Tus Enlaces de Live Selling
                  </h3>

                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-gray-400">URL Pública de tu Live:</label>
                    <div className="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-xl p-2.5">
                      <span className="text-xs font-mono text-blue-300 truncate flex-1">
                        https://{customDomain || 'live.mitienda.com'}/live/estreno-especial
                      </span>
                      <button
                        onClick={copyLiveLink}
                        className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300"
                        title="Copiar"
                      >
                        {copiedLink ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-black/60 border border-gray-800 flex items-center gap-4">
                    <div className="p-2 rounded-xl bg-white text-black shrink-0">
                      <QrCode size={48} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">Código QR para tu Live</h4>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Proyéctalo en tu pantalla o historias de Instagram para que los espectadores escaneen y compren en 1 clic.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: ANALÍTICA Y MÉTRICAS DEL LIVE */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="panel p-6 rounded-2xl border border-gray-800 bg-gray-900/80 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Flame size={20} className="text-amber-400" />
                Métricas de Conversión del Live Selling
              </h2>
              <p className="text-xs text-gray-400">Rendimiento en tiempo real de tu streaming y automatizaciones</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-gray-950 border border-gray-800 space-y-1">
                <span className="text-[11px] font-bold text-gray-400 uppercase">Facturación Total</span>
                <p className="text-2xl font-bold text-emerald-400">{formatCOP(totalSalesRevenue)}</p>
                <p className="text-[10px] text-emerald-500">100% capturado por el sistema</p>
              </div>

              <div className="p-4 rounded-xl bg-gray-950 border border-gray-800 space-y-1">
                <span className="text-[11px] font-bold text-gray-400 uppercase">Tasa de Conversión</span>
                <p className="text-2xl font-bold text-amber-400">
                  {comments.length > 0 ? ((orders.length / comments.length) * 100).toFixed(1) : '0'}%
                </p>
                <p className="text-[10px] text-gray-400">De comentarios a pedidos cerrados</p>
              </div>

              <div className="p-4 rounded-xl bg-gray-950 border border-gray-800 space-y-1">
                <span className="text-[11px] font-bold text-gray-400 uppercase">Pico de Espectadores</span>
                <p className="text-2xl font-bold text-blue-400">{viewersCount + 38}</p>
                <p className="text-[10px] text-gray-400">En simultáneo en redes + web</p>
              </div>

              <div className="p-4 rounded-xl bg-gray-950 border border-gray-800 space-y-1">
                <span className="text-[11px] font-bold text-gray-400 uppercase">Ticket Promedio</span>
                <p className="text-2xl font-bold text-blue-400">
                  {orders.length > 0 ? formatCOP(Math.round(totalSalesRevenue / orders.length)) : '$0'}
                </p>
                <p className="text-[10px] text-gray-400">Por pedido generado en vivo</p>
              </div>
            </div>

            {/* Best performing products */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white">Top Productos Más Vendidos en la Sesión</h3>
              <div className="space-y-2">
                {products.map((prod, idx) => (
                  <div key={prod.id} className="p-3 rounded-xl bg-gray-950 border border-gray-800 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center">
                        #{idx + 1}
                      </span>
                      <img src={prod.image} alt={prod.name} className="w-10 h-10 rounded-lg object-cover" />
                      <div>
                        <p className="font-bold text-white">{prod.name} ({prod.code})</p>
                        <p className="text-[11px] text-gray-400">{formatCOP(prod.livePrice)} cada uno</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-emerald-400">{prod.soldCount} vendidos</p>
                      <p className="text-[11px] text-gray-400">{formatCOP(prod.soldCount * prod.livePrice)} en ventas</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ESTUDIO DE GRABACIÓN "GRABA 1 SOLA VEZ" (CON TELEPROMPTER INTEGRADO) */}
      {showRecordingModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fade-in">
          <div className="bg-gray-950 border border-gray-800 rounded-3xl w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">

            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-gray-800 flex items-center justify-between bg-gray-900/80">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-red-600/20 text-red-400 border border-red-500/30">
                  <CircleDot size={20} className={isRecording ? 'animate-pulse text-red-500' : ''} />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    Estudio de Grabación: Graba tu Live 1 Sola Vez
                  </h3>
                  <p className="text-xs text-gray-400">
                    Sigue el teleprompter, grábate 10 a 15 minutos y ponlo a vender en bucle infinito 24/7.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowTeleprompter(!showTeleprompter)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition flex items-center gap-1.5 ${
                    showTeleprompter ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' : 'bg-gray-800 border-gray-700 text-gray-400'
                  }`}
                >
                  <BookOpen size={14} /> Teleprompter {showTeleprompter ? 'Activo' : 'Oculto'}
                </button>
                <button
                  onClick={closeRecordingStudio}
                  className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body: Two Columns */}
            <div className="p-4 sm:p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">

              {/* Left Column: Camera View & Recording Controls */}
              <div className={showTeleprompter ? 'lg:col-span-7 space-y-4' : 'lg:col-span-12 max-w-3xl mx-auto w-full space-y-4'}>
                <div className="relative aspect-video w-full rounded-2xl bg-black border border-gray-800 overflow-hidden flex items-center justify-center shadow-xl">

                  {/* If video was recorded, show playback preview */}
                  {recordedVideoUrl ? (
                    <video
                      src={recordedVideoUrl}
                      controls
                      autoPlay
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <>
                      <video
                        ref={recordPreviewRef}
                        autoPlay
                        playsInline
                        muted
                        className={`w-full h-full object-cover ${cameraFacing === 'user' ? '-scale-x-100' : ''}`}
                      />

                      {/* Countdown Overlay (3.. 2.. 1..) */}
                      {countdown !== null && (
                        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-30">
                          <div className="text-7xl sm:text-9xl font-black text-amber-400 animate-ping">
                            {countdown}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Overlays during camera/recording */}
                  <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
                    {isRecording ? (
                      <div className="bg-red-600 text-white text-[11px] font-black px-3 py-1 rounded-full flex items-center gap-1.5 shadow-lg animate-pulse">
                        <CircleDot size={12} /> GRABANDO {formatTime(recordingSeconds)}
                      </div>
                    ) : recordedVideoUrl ? (
                      <div className="bg-emerald-600 text-white text-[11px] font-black px-3 py-1 rounded-full flex items-center gap-1.5 shadow-lg">
                        <CheckCircle2 size={12} /> VIDEO LISTO
                      </div>
                    ) : (
                      <div className="bg-black/70 text-gray-300 text-[11px] font-bold px-3 py-1 rounded-full border border-gray-700 backdrop-blur-md">
                        Cámara en Espera
                      </div>
                    )}
                  </div>

                  {/* Top Right: Switch camera */}
                  {!recordedVideoUrl && !isRecording && (
                    <div className="absolute top-3 right-3 z-20">
                      <button
                        onClick={switchCameraFacing}
                        className="px-2.5 py-1 rounded-lg bg-black/70 hover:bg-black text-white text-xs font-bold border border-white/20 backdrop-blur-md flex items-center gap-1"
                      >
                        <RotateCcw size={12} /> Rotar Cámara
                      </button>
                    </div>
                  )}
                </div>

                {/* Recording Control Buttons */}
                <div className="p-4 rounded-xl bg-gray-900/90 border border-gray-800 space-y-3">
                  {!recordedVideoUrl ? (
                    <div className="flex flex-wrap items-center justify-center gap-3">
                      {!isRecording ? (
                        <button
                          onClick={startRecordingSession}
                          disabled={countdown !== null}
                          className="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-extrabold text-sm shadow-lg shadow-red-600/30 transition flex items-center gap-2 cursor-pointer"
                        >
                          <CircleDot size={18} /> Iniciar Grabación (3 seg)
                        </button>
                      ) : (
                        <button
                          onClick={stopRecordingSession}
                          className="px-6 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-extrabold text-sm border border-red-500/40 shadow-lg transition flex items-center gap-2 cursor-pointer animate-pulse"
                        >
                          <Pause size={18} className="text-red-500" /> Detener Grabación ({formatTime(recordingSeconds)})
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                        <CheckCircle2 size={16} className="shrink-0" />
                        <span>¡Excelente! Tu video de {formatTime(recordingSeconds)} fue grabado exitosamente. Ya puedes ponerlo a transmitir en bucle 24/7.</span>
                      </div>

                      <div className="flex flex-wrap items-center justify-center gap-3">
                        <button
                          onClick={applyRecordedVideoToLoop}
                          className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm shadow-lg shadow-emerald-600/30 transition flex items-center gap-2 cursor-pointer"
                        >
                          <Repeat size={16} /> 🚀 Poner a Vender en Bucle 24/7
                        </button>

                        <a
                          href={recordedVideoUrl}
                          download={`mi_live_${Date.now()}.webm`}
                          className="px-4 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-bold border border-gray-700 transition flex items-center gap-1.5"
                        >
                          <Download size={15} /> Descargar Archivo
                        </a>

                        <button
                          onClick={() => {
                            setRecordedVideoUrl(null);
                            setRecordingSeconds(0);
                            openRecordingStudio();
                          }}
                          className="px-4 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white text-xs font-bold border border-gray-700 transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <RotateCcw size={15} /> Grabar de Nuevo
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Teleprompter Guide */}
              {showTeleprompter && (
                <div className="lg:col-span-5 space-y-3 flex flex-col">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-800">
                    <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                      <BookOpen size={14} /> Teleprompter: Guión Ganador
                    </span>
                    <span className="text-[10px] text-gray-500">Léelo mientras miras a la cámara</span>
                  </div>

                  <div className="space-y-3 overflow-y-auto pr-1 flex-1 max-h-[480px]">
                    {LIVE_SELLING_SCRIPT.map((block, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl bg-gray-900 border border-gray-800 hover:border-amber-500/30 transition space-y-1.5"
                      >
                        <span className="text-[11px] font-extrabold text-amber-400 block">
                          {block.step}
                        </span>
                        <p className="text-xs text-gray-200 leading-relaxed font-normal">
                          &quot;{block.content}&quot;
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300">
                    💡 <strong>Tip del Experto:</strong> Menciona con frecuencia los códigos (#L1, #L2) y la palabra &quot;QUIERO&quot;. Esto entrena a los espectadores para que el bot de Pancake cree sus pedidos automáticamente.
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

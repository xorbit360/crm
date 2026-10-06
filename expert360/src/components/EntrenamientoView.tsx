import React, { useState } from 'react';
import { 
  BookOpen, Play, CheckCircle, GraduationCap, Award, Compass, ArrowRight,
  TrendingUp, Star, HelpCircle, FileText, Check, Clock, User, Calendar,
  Users, Trophy, MessageSquare, ThumbsUp, Search, Video, Link, ChevronDown,
  ChevronUp, ChevronLeft, ChevronRight, Plus, Filter, Pin, MoreVertical,
  Share2, Send, List, Grid, Flame, Sparkles, MessageCircle, X, ShoppingBag,
  Zap, Lock, ShieldCheck, Menu, Download, Folder, UploadCloud, Layers,
  Globe, PhoneCall, ExternalLink, Lightbulb, DollarSign, Image as ImageIcon,
  CheckCircle2, Film, Loader2, Maximize2, Minimize2
} from 'lucide-react';

type TabType = 'community' | 'classroom' | 'resources' | 'calendar' | 'members' | 'leaderboard';

interface LessonAttachment {
  id: string;
  name: string;
  type: 'pdf' | 'excel' | 'video' | 'link' | 'supplier';
  size?: string;
  url: string;
}

interface Lesson {
  id: string;
  title: string;
  duration: string;
  category: string;
  difficulty: 'Básico' | 'Intermedio' | 'Avanzado';
  instructor: string;
  description: string;
  videoUrl: string;
  isCompleted: boolean;
  attachments?: LessonAttachment[];
}

interface CourseModule {
  id: string;
  title: string;
  lessons: Lesson[];
}

interface Course {
  id: string;
  communityId?: string;
  title: string;
  subtitle: string;
  bannerImage: string;
  progressPercentage: number;
  modules: CourseModule[];
  author?: string;
}

interface CustomCommunity {
  id: string;
  name: string;
  tagline: string;
  category: string;
  accessType: 'Gratis' | 'Privada (Invitación)' | 'VIP Premium ($29/mes)';
  bannerGradient: string;
  membersCount: number;
  creatorName: string;
  isCustom?: boolean;
}

interface DropshipperResource {
  id: string;
  communityId?: string;
  title: string;
  category: 'Plantillas Excel' | 'Creativos & UGC' | 'Guías PDF' | 'Bodegas & Contactos';
  format: 'XLSX' | 'PDF' | 'MP4 Drive' | 'WhatsApp Directo';
  author: string;
  downloadsCount: number;
  description: string;
  downloadUrl: string;
}

interface PostComment {
  id: string;
  author: string;
  avatar: string;
  timeAgo: string;
  text: string;
}

interface CommunityPost {
  id: string;
  communityId?: string;
  author: string;
  avatar: string;
  level: number;
  timeAgo: string;
  category: string;
  isPinned?: boolean;
  title: string;
  content: string;
  image?: string;
  videoUrl?: string;
  likes: number;
  isLiked?: boolean;
  commentsCount: number;
  commentsList: PostComment[];
  lastCommentText?: string;
}

interface CalendarEvent {
  id: string;
  communityId?: string;
  title: string;
  time: string;
  type: 'Meet' | 'Link';
  badgeText: string;
  image: string;
  date: string; // YYYY-MM-DD
}

interface CommunityMember {
  id: string;
  communityId?: string;
  name: string;
  avatar: string;
  level: number;
  role: string;
  joinedDate: string;
  points: number;
  location: string;
  isOnline: boolean;
}

interface EntrenamientoViewProps {
  onOpenSidebar?: () => void;
}

export default function EntrenamientoView({ onOpenSidebar }: EntrenamientoViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>('community');

  // Communities State
  const [userCommunities, setUserCommunities] = useState<CustomCommunity[]>([
    {
      id: 'comm_global',
      name: 'Expert360 Global',
      tagline: 'Comunidad Oficial de Escalado e IA',
      category: 'E-commerce & Dropshipping',
      accessType: 'Gratis',
      bannerGradient: 'from-purple-600 to-indigo-600',
      membersCount: 1420,
      creatorName: 'Equipo Expert360'
    },
    {
      id: 'comm_trading_pro',
      name: 'Academia Trading & Forex Pro',
      tagline: 'Señales diarias, gestión de riesgo Smart Money y psicotrading para fondear cuentas',
      category: 'Trading & Cripto',
      accessType: 'VIP Premium ($29/mes)',
      bannerGradient: 'from-emerald-600 to-cyan-600',
      membersCount: 640,
      creatorName: 'Master Trader Alpha',
      isCustom: true
    },
    {
      id: 'comm_vip_col',
      name: 'Club Dropshipper Elite Latam',
      tagline: 'Estrategias de pauta con Meta Ads y productos con stock en Dropi & Effix',
      category: 'Dropshipping VIP',
      accessType: 'VIP Premium ($29/mes)',
      bannerGradient: 'from-amber-600 to-rose-600',
      membersCount: 285,
      creatorName: 'Comunidad Dropshipper VIP',
      isCustom: true
    },
    {
      id: 'comm_realestate',
      name: 'Inmobiliarios & Captación 360',
      tagline: 'Estrategias de pauta para captación de propiedades y embudos de alta conversión',
      category: 'Bienes Raíces',
      accessType: 'Privada (Invitación)',
      bannerGradient: 'from-blue-600 to-slate-800',
      membersCount: 190,
      creatorName: 'Agencia Inmobiliaria Pro',
      isCustom: true
    }
  ]);

  const [activeCommunityId, setActiveCommunityId] = useState<string>('comm_global');

  // Community Feed State
  const [activePostCategory, setActivePostCategory] = useState<string>('all');
  const [newPostText, setNewPostText] = useState<string>('');
  const [newPostTitle, setNewPostTitle] = useState<string>('');
  const [showNewPostModal, setShowNewPostModal] = useState<boolean>(false);
  const [postMediaFile, setPostMediaFile] = useState<File | null>(null);
  const [postMediaPreviewUrl, setPostMediaPreviewUrl] = useState<string>('');
  const [postMediaType, setPostMediaType] = useState<'image' | 'video' | 'none'>('none');
  const [expandedCommentsPostId, setExpandedCommentsPostId] = useState<string | null>(null);
  const [commentInput, setCommentInput] = useState<string>('');

  const [posts, setPosts] = useState<CommunityPost[]>([
    {
      id: 'p1',
      communityId: 'comm_global',
      author: 'Equipo Expert360',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      level: 6,
      timeAgo: '6d',
      category: 'E-commerce Expert360',
      isPinned: true,
      title: '🔵 ⚠️ ALERTA DE LANZAMIENTO: El piloto automático está por llegar...',
      content: 'Prepárate, porque el juego está a punto de cambiar para siempre. Estamos en la cuenta regresiva para el lanzamiento oficial del nuevo bot conversacional multitarea. ¡Automatiza tus cierres en WhatsApp 24/7 con Expert360!',
      image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
      likes: 36,
      isLiked: false,
      commentsCount: 2,
      lastCommentText: 'Nuevo comentario hace 6h',
      commentsList: [
        { id: 'c1', author: 'Carlos Pérez', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100', timeAgo: '6h', text: '¡Excelente noticia! Esperando impaciente la actualización.' },
        { id: 'c2', author: 'Andrea Gómez', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100', timeAgo: '4h', text: '¿Estará integrado directamente con el catálogo de Dropi?' }
      ]
    },
    {
      id: 'p2',
      communityId: 'comm_global',
      author: 'Mentor Expert360',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      level: 6,
      timeAgo: '15 de Mayo',
      category: 'E-commerce Expert360',
      isPinned: true,
      title: '🚨 ACTUALIZACIÓN RECURRENTE: Sincroniza Meta Pixel con CRM',
      content: 'En esta clase explicamos cómo sincronizar tu Meta Pixel con el CRM de WhatsApp para reducir el costo por adquisición (CPA) hasta en un 40%.',
      image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=80',
      likes: 52,
      isLiked: true,
      commentsCount: 1,
      lastCommentText: 'Nuevo comentario hace 1d',
      commentsList: [
        { id: 'c3', author: 'Oscar Molina', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100', timeAgo: '1d', text: 'Súper recomendado aplicar esta estrategia hoy mismo.' }
      ]
    },
    {
      id: 'p_trade_1',
      communityId: 'comm_trading_pro',
      author: 'Master Trader Alpha',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      level: 9,
      timeAgo: '2h',
      category: 'Trading & Forex',
      isPinned: true,
      title: '📈 Análisis Semanal XAUUSD (Oro) & EURUSD - Imbalances y Liquidez',
      content: 'Equipo, marcamos las zonas de mayor probabilidad para la sesión de Nueva York. Observen el Order Block en 2380.00 con confluencia FVG.',
      image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&auto=format&fit=crop&q=80',
      likes: 48,
      isLiked: true,
      commentsCount: 5,
      lastCommentText: 'Gracias por el mapa de liquidez',
      commentsList: [
        { id: 'c_tr1', author: 'Felipe Ruiz Forex', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100', timeAgo: '1h', text: 'Excelente zona de reentrada en 2382, adentro con 0.5 lotes.' }
      ]
    },
    {
      id: 'p_drop_1',
      communityId: 'comm_vip_col',
      author: 'Carlos Pérez',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      level: 5,
      timeAgo: '4h',
      category: 'Dropshipping VIP',
      isPinned: true,
      title: '🔥 Top 5 Productos Ganadores en Dropi con Stock en Colombia y México',
      content: 'Comparto los artículos que están convirtiendo sobre el 3% en Meta Ads esta semana con pago contra entrega asegurado.',
      image: 'https://images.unsplash.com/photo-1556742049-0a67f2d429d3?w=800&auto=format&fit=crop&q=80',
      likes: 64,
      isLiked: true,
      commentsCount: 8,
      lastCommentText: '¿El flete incluye devoluciones?',
      commentsList: [
        { id: 'c_dr1', author: 'Sofia Rodríguez', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100', timeAgo: '2h', text: 'Confirmado el producto #2, despaché 40 unidades ayer.' }
      ]
    },
    {
      id: 'p_re_1',
      communityId: 'comm_realestate',
      author: 'Agencia Inmobiliaria Pro',
      avatar: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=150&auto=format&fit=crop&q=80',
      level: 8,
      timeAgo: '1d',
      category: 'Bienes Raíces',
      isPinned: true,
      title: '🏢 Guión de Anuncios en Meta Ads para Captar 15 Propiedades en 30 Días',
      content: 'Aquí está la plantilla de guión para captar inmuebles en exclusividad mediante formularios instantáneos y WhatsApp.',
      likes: 29,
      isLiked: false,
      commentsCount: 3,
      commentsList: []
    }
  ]);

  // Classroom Courses State
  const [courses, setCourses] = useState<Course[]>([
    {
      id: 'c1',
      communityId: 'comm_global',
      title: 'Conecta tus canales y IAs de forma segura',
      subtitle: '🚀 Canales e IA: ¡Tu Máquina 24/7! En este módulo conectarás el motor de tu bot conversacional Expert360.',
      bannerImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
      progressPercentage: 20,
      modules: [
        {
          id: 'm1',
          title: 'Conexión de canales',
          lessons: [
            {
              id: 'l1_1',
              title: 'Conectar WhatsApp Business API y Meta Cloud',
              duration: '15 min',
              category: 'whatsapp',
              difficulty: 'Básico',
              instructor: 'Oscar Molina',
              description: 'Configura las credenciales principales para vincular la API oficial de WhatsApp en Expert360.',
              videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
              isCompleted: true
            },
            {
              id: 'l1_2',
              title: 'Vincular Instagram Direct y Facebook Messenger',
              duration: '18 min',
              category: 'whatsapp',
              difficulty: 'Intermedio',
              instructor: 'Rodrigo Díaz',
              description: 'Activa la unificación de conversaciones multitarea desde el panel omnicanal.',
              videoUrl: 'https://www.w3schools.com/html/movie.mp4',
              isCompleted: false
            }
          ]
        },
        {
          id: 'm2',
          title: 'Utilidad y Flujos de Conversión',
          lessons: [
            {
              id: 'l2_1',
              title: 'Configuración de Respuestas Automáticas y Catálogo',
              duration: '22 min',
              category: 'whatsapp',
              difficulty: 'Intermedio',
              instructor: 'Laura Gómez',
              description: 'Sincroniza el catálogo de productos con fotos, precios y enlaces directos de pago.',
              videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
              isCompleted: false
            }
          ]
        }
      ]
    },
    {
      id: 'c2',
      communityId: 'comm_global',
      title: 'PLANTILLA de Ecommerce V3 con Expert360 Sales',
      subtitle: '🛒 Plantilla de alta conversión lista para importar con embudos, creativos y respuestas prediseñadas.',
      bannerImage: 'https://images.unsplash.com/photo-1556742049-0a67f2d429d3?w=800&auto=format&fit=crop&q=80',
      progressPercentage: 40,
      modules: [
        {
          id: 'm4',
          title: 'Instalación de Plantilla',
          lessons: [
            {
              id: 'l4_1',
              title: 'Importación en 1-Clic de la Plantilla V3',
              duration: '12 min',
              category: 'dropshipping',
              difficulty: 'Básico',
              instructor: 'Mentor Expert360',
              description: 'Cómo duplicar la estructura ganadora directamente en tu cuenta de Expert360.',
              videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
              isCompleted: true
            }
          ]
        }
      ]
    },
    {
      id: 'c4_trading',
      communityId: 'comm_trading_pro',
      title: 'Masterclass Trading, Forex & Smart Money Concepts 2026',
      subtitle: '📈 Estrategia institucional para operar divisas, Cripto y pruebas de fondeo sin arriesgar capital propio.',
      bannerImage: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&auto=format&fit=crop&q=80',
      progressPercentage: 40,
      author: 'Master Trader Alpha',
      modules: [
        {
          id: 'm_trade_1',
          title: 'Módulo 1: Fundamentos Institucionales & Estructura',
          lessons: [
            {
              id: 'l_tr_1',
              title: 'Estructura de Mercado e Imbalances en Temporalidades Mayores',
              duration: '22 min',
              category: 'trading',
              difficulty: 'Avanzado',
              instructor: 'Master Trader Alpha',
              description: 'Cómo identificar zonas de alta probabilidad (Order Blocks) y liquidez expuesta en EURUSD y XAUUSD.',
              videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
              isCompleted: true,
              attachments: [
                {
                  id: 'att_tr_1',
                  name: 'Plantilla_Gestion_Riesgo_SmartMoney.xlsx',
                  type: 'excel',
                  size: '2.1 MB',
                  url: '#'
                }
              ]
            }
          ]
        }
      ]
    },
    {
      id: 'c_drop_1',
      communityId: 'comm_vip_col',
      title: 'Masterclass Dropshipping Contra Entrega & Meta Ads Scaling',
      subtitle: '📦 Dominio total de fletes, tasa de entrega, escalado CBO y validación express con Dropi.',
      bannerImage: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=80',
      progressPercentage: 55,
      author: 'Comunidad Dropshipper VIP',
      modules: [
        {
          id: 'm_dr_1',
          title: 'Módulo 1: Elección de Producto & Meta Ads',
          lessons: [
            {
              id: 'l_dr_1',
              title: 'Lanzamiento de Anuncios CBO en Facebook Ads',
              duration: '25 min',
              category: 'dropshipping',
              difficulty: 'Intermedio',
              instructor: 'Carlos Pérez',
              description: 'Paso a paso para configurar públicas similares y creativos en video.',
              videoUrl: 'https://www.w3schools.com/html/movie.mp4',
              isCompleted: true
            }
          ]
        }
      ]
    },
    {
      id: 'c_re_1',
      communityId: 'comm_realestate',
      title: 'Captación de Inmuebles & Embudos Inmobiliarios 360',
      subtitle: '🏢 Sistema automatizado de captación en exclusividad para agentes e inmobiliarias.',
      bannerImage: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&auto=format&fit=crop&q=80',
      progressPercentage: 30,
      author: 'Agencia Inmobiliaria Pro',
      modules: [
        {
          id: 'm_re_1',
          title: 'Módulo 1: Estrategia Digital',
          lessons: [
            {
              id: 'l_re_1',
              title: 'Formularios Lead Ads para Propietarios',
              duration: '19 min',
              category: 'inmobiliaria',
              difficulty: 'Intermedio',
              instructor: 'Agencia Inmobiliaria Pro',
              description: 'Captación directa sin intermediarios mediante pauta segmentada.',
              videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
              isCompleted: false
            }
          ]
        }
      ]
    }
  ]);

  // Classroom Player Selection State
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [completedLessons, setCompletedLessons] = useState<string[]>(['l1_1', 'l_re_1']);
  const [isFocusMode, setIsFocusMode] = useState<boolean>(false);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({
    m1: true,
    m2: true,
    m_trade_1: true,
    m_dr_1: true
  });

  // Calculate Course Progress
  const totalCourseLessons = selectedCourse
    ? selectedCourse.modules.reduce((acc, m) => acc + m.lessons.length, 0)
    : 0;
  const completedCourseLessons = selectedCourse
    ? selectedCourse.modules.reduce((acc, m) => acc + m.lessons.filter(l => completedLessons.includes(l.id)).length, 0)
    : 0;
  const courseProgressPct = totalCourseLessons > 0 ? Math.round((completedCourseLessons / totalCourseLessons) * 100) : 0;

  // Interactive Monthly Calendar State
  const [calendarViewMode, setCalendarViewMode] = useState<'list' | 'grid'>('grid');
  const [currentCalYear, setCurrentCalYear] = useState<number>(2026);
  const [currentCalMonth, setCurrentCalMonth] = useState<number>(6); // 0-indexed: 6 = Julio
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>('2026-07-21');

  // Schedule New Event Modal State
  const [showAddEventModal, setShowAddEventModal] = useState<boolean>(false);
  const [newEventTitle, setNewEventTitle] = useState<string>('');
  const [newEventDate, setNewEventDate] = useState<string>('2026-07-21');
  const [newEventTime, setNewEventTime] = useState<string>('10:00 AM - 11:30 AM');
  const [newEventBadge, setNewEventBadge] = useState<string>('CLASE EN VIVO');
  const [newEventMeetingUrl, setNewEventMeetingUrl] = useState<string>('');
  const [newEventImage, setNewEventImage] = useState<string>('');

  const MONTH_NAMES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const getMonthCalendarDays = (year: number, month: number) => {
    const firstDayOfMonth = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    let startingDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startingDayOfWeek === -1) startingDayOfWeek = 6; // Sunday = 6

    const daysPrevMonth = new Date(year, month, 0).getDate();
    const days: { dateStr: string; dayNumber: number; isCurrentMonth: boolean; isToday: boolean }[] = [];

    // Prev month padding
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const dayNum = daysPrevMonth - i;
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      days.push({ dateStr, dayNumber: dayNum, isCurrentMonth: false, isToday: false });
    }

    // Current month days
    const todayStr = '2026-07-21';
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({
        dateStr,
        dayNumber: i,
        isCurrentMonth: true,
        isToday: dateStr === todayStr
      });
    }

    // Next month padding to complete 35/42 matrix
    const totalSoFar = days.length;
    const remaining = (7 - (totalSoFar % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const nextMonth = month === 11 ? 0 : month + 1;
      const nextYear = month === 11 ? year + 1 : year;
      const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({ dateStr, dayNumber: i, isCurrentMonth: false, isToday: false });
    }

    return days;
  };

  const handlePrevMonth = () => {
    if (currentCalMonth === 0) {
      setCurrentCalMonth(11);
      setCurrentCalYear(prev => prev - 1);
    } else {
      setCurrentCalMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentCalMonth === 11) {
      setCurrentCalMonth(0);
      setCurrentCalYear(prev => prev + 1);
    } else {
      setCurrentCalMonth(prev => prev + 1);
    }
  };

  const handleGoToday = () => {
    setCurrentCalYear(2026);
    setCurrentCalMonth(6); // Julio
    setSelectedCalendarDate('2026-07-21');
  };

  const handleAddCalendarEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle.trim()) return;

    const newEv: CalendarEvent = {
      id: 'ev_' + Date.now(),
      communityId: activeCommunityId,
      title: newEventTitle.trim(),
      time: newEventTime.trim() || '10:00 AM - 11:30 AM',
      type: 'Meet',
      badgeText: newEventBadge.toUpperCase(),
      image: newEventImage.trim() || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=300&auto=format&fit=crop&q=80',
      date: newEventDate || '2026-07-21'
    };

    setCalendarEvents(prev => [...prev, newEv]);
    setNewEventTitle('');
    setNewEventMeetingUrl('');
    setShowAddEventModal(false);
    showNotification(`📆 Clase "${newEv.title}" agendada exitosamente en el calendario`);
  };

  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([
    {
      id: 'ev1',
      communityId: 'comm_global',
      title: 'Conexión de canales grupal',
      time: '9:00 AM - 12:00 PM',
      type: 'Meet',
      badgeText: 'SOPORTE EN VIVO',
      image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=300&auto=format&fit=crop&q=80',
      date: '2026-07-21'
    },
    {
      id: 'ev2',
      communityId: 'comm_global',
      title: 'Soporte básico Expert360 grupal',
      time: '2:00 PM - 4:00 PM',
      type: 'Meet',
      badgeText: 'MENTORÍA 360',
      image: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=300&auto=format&fit=crop&q=80',
      date: '2026-07-21'
    },
    {
      id: 'ev3',
      communityId: 'comm_global',
      title: 'Bienvenida a Nuevos Miembros & Networking',
      time: '10:00 AM - 11:30 AM',
      type: 'Meet',
      badgeText: 'NETWORKING',
      image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=300&auto=format&fit=crop&q=80',
      date: '2026-07-23'
    },
    {
      id: 'ev4',
      communityId: 'comm_global',
      title: 'Masterclass: Automatización de WhatsApp Bot',
      time: '4:00 PM - 5:30 PM',
      type: 'Meet',
      badgeText: 'MASTERCLASS',
      image: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=300&auto=format&fit=crop&q=80',
      date: '2026-07-25'
    },
    {
      id: 'ev_tr_1',
      communityId: 'comm_trading_pro',
      title: 'Trading en Vivo NY Open & Señales Forex',
      time: '8:30 AM - 10:30 AM',
      type: 'Meet',
      badgeText: 'TRADING EN VIVO',
      image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=300&auto=format&fit=crop&q=80',
      date: '2026-07-21'
    },
    {
      id: 'ev_tr_2',
      communityId: 'comm_trading_pro',
      title: 'Análisis de Ordenes Smart Money (XAUUSD)',
      time: '7:00 PM - 8:30 PM',
      type: 'Meet',
      badgeText: 'ANÁLISIS TÉCNICO',
      image: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=300&auto=format&fit=crop&q=80',
      date: '2026-07-22'
    },
    {
      id: 'ev_tr_3',
      communityId: 'comm_trading_pro',
      title: 'Sesión Especial: Gestión de Riesgo & Psicotrading',
      time: '6:00 PM - 7:30 PM',
      type: 'Meet',
      badgeText: 'MENTORÍA VIP',
      image: 'https://images.unsplash.com/photo-1642543492481-44e81e3914a7?w=300&auto=format&fit=crop&q=80',
      date: '2026-07-29'
    },
    {
      id: 'ev_drop_1',
      communityId: 'comm_vip_col',
      title: 'Auditoría de Anuncios Meta Ads & Campañas CBO',
      time: '4:00 PM - 6:00 PM',
      type: 'Meet',
      badgeText: 'MASTERCLASS COD',
      image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=300&auto=format&fit=crop&q=80',
      date: '2026-07-28'
    },
    {
      id: 'ev_drop_2',
      communityId: 'comm_vip_col',
      title: 'Optimización de Fletes & Convenios Dropi / Effix',
      time: '3:00 PM - 4:30 PM',
      type: 'Meet',
      badgeText: 'LOGÍSTICA COD',
      image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=300&auto=format&fit=crop&q=80',
      date: '2026-07-30'
    }
  ]);

  // Members State
  const [memberSearch, setMemberSearch] = useState<string>('');
  const [activeMessageMember, setActiveMessageMember] = useState<CommunityMember | null>(null);
  const [directMessageText, setDirectMessageText] = useState<string>('');

  const [members, setMembers] = useState<CommunityMember[]>([
    {
      id: 'm1',
      communityId: 'comm_global',
      name: 'Mentor Expert360',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      level: 9,
      role: 'Fundador & Mentor Master 360',
      joinedDate: 'Enero 2024',
      points: 8420,
      location: 'Bogotá, Colombia',
      isOnline: true
    },
    {
      id: 'm2',
      communityId: 'comm_global',
      name: 'Oscar Molina',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      level: 7,
      role: 'Lead Growth Hacker',
      joinedDate: 'Marzo 2024',
      points: 5210,
      location: 'Medellín, Colombia',
      isOnline: true
    },
    {
      id: 'm_tr_1',
      communityId: 'comm_trading_pro',
      name: 'Master Trader Alpha',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      level: 9,
      role: 'Líder de Trading & Cripto',
      joinedDate: 'Febrero 2025',
      points: 9150,
      location: 'Santiago, Chile',
      isOnline: true
    },
    {
      id: 'm4',
      communityId: 'comm_vip_col',
      name: 'Carlos Pérez',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      level: 5,
      role: 'Dropshipper VIP Elite',
      joinedDate: 'Junio 2025',
      points: 3840,
      location: 'Lima, Perú',
      isOnline: true
    },
    {
      id: 'm_re_1',
      communityId: 'comm_realestate',
      name: 'Agencia Inmobiliaria Pro',
      avatar: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=150&auto=format&fit=crop&q=80',
      level: 8,
      role: 'Director Captación Inmobiliaria',
      joinedDate: 'Mayo 2025',
      points: 6200,
      location: 'Ciudad de México, México',
      isOnline: true
    }
  ]);

  // Leaderboard Timeframe
  const [leaderboardFilter, setLeaderboardFilter] = useState<'7d' | '30d' | 'all'>('30d');

  // Publishing & Feedback States
  const [isPublishingPost, setIsPublishingPost] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Modals visibility state
  const [showCreateCommunityModal, setShowCreateCommunityModal] = useState<boolean>(false);
  const [newCommunityName, setNewCommunityName] = useState<string>('');
  const [newCommunityTagline, setNewCommunityTagline] = useState<string>('');
  const [newCommunityCategory, setNewCommunityCategory] = useState<string>('Trading & Cripto');
  const [newCommunityAccess, setNewCommunityAccess] = useState<'Gratis' | 'Privada (Invitación)' | 'VIP Premium ($29/mes)'>('Gratis');

  // Modal State for Uploading New Lesson (With DIRECT VIDEO UPLOAD Support!)
  const [showUploadLessonModal, setShowUploadLessonModal] = useState<boolean>(false);
  const [newLessonTitle, setNewLessonTitle] = useState<string>('');
  const [videoUploadType, setVideoUploadType] = useState<'file' | 'url'>('file');
  const [uploadedVideoFileName, setUploadedVideoFileName] = useState<string>('');
  const [uploadedVideoPreviewUrl, setUploadedVideoPreviewUrl] = useState<string>('');
  const [newLessonVideoUrl, setNewLessonVideoUrl] = useState<string>('');
  const [newLessonDescription, setNewLessonDescription] = useState<string>('');
  const [newLessonAttachmentName, setNewLessonAttachmentName] = useState<string>('');
  const [newLessonAttachmentUrl, setNewLessonAttachmentUrl] = useState<string>('');

  // Resources Vault State
  const [resourcesCategoryFilter, setResourcesCategoryFilter] = useState<string>('todos');
  const [showAddResourceModal, setShowAddResourceModal] = useState<boolean>(false);
  const [newResourceTitle, setNewResourceTitle] = useState<string>('');
  const [newResourceCategory, setNewResourceCategory] = useState<'Plantillas Excel' | 'Creativos & UGC' | 'Guías PDF' | 'Bodegas & Contactos'>('Plantillas Excel');
  const [newResourceDescription, setNewResourceDescription] = useState<string>('');
  const [newResourceUrl, setNewResourceUrl] = useState<string>('');

  const [resources, setResources] = useState<DropshipperResource[]>([
    {
      id: 'res_1',
      communityId: 'comm_global',
      title: 'Calculadora de Margen de Ganancia Real & Fletes (Excel)',
      category: 'Plantillas Excel',
      format: 'XLSX',
      author: 'Comunidad Dropshipper VIP',
      downloadsCount: 1240,
      description: 'Calcula tu costo por adquisición objetivo (CPA Max), comisión de plataforma (Dropi/Effix) y porcentaje de devoluciones.',
      downloadUrl: '#'
    },
    {
      id: 'res_trading_1',
      communityId: 'comm_trading_pro',
      title: 'Plantilla Bitácora de Trading & Calculadora de Lotaje / Riesgo %',
      category: 'Plantillas Excel',
      format: 'XLSX',
      author: 'Academia Trading Pro',
      downloadsCount: 980,
      description: 'Bitácora automática en Excel para registrar operaciones en Forex, Índices Sintéticos y Cripto. Control de Drawdown y Win Rate.',
      downloadUrl: '#'
    },
    {
      id: 'res_2',
      communityId: 'comm_global',
      title: 'Pack de 15 Videos UGC Hooks Ganadores para TikTok Ads',
      category: 'Creativos & UGC',
      format: 'MP4 Drive',
      author: 'Equipo Expert360',
      downloadsCount: 890,
      description: 'Ganchos visuales de alta conversión en HD listos para adaptar a productos de belleza, hogar y tecnología.',
      downloadUrl: '#'
    },
    {
      id: 'res_3',
      communityId: 'comm_vip_col',
      title: 'Directorio Directo de 20 Bodegas Verificadas con Stock Local',
      category: 'Bodegas & Contactos',
      format: 'WhatsApp Directo',
      author: 'Mentor Expert360',
      downloadsCount: 1560,
      description: 'Contactos oficiales con coordinadores de despacho inmediato en Colombia, México, Chile y Ecuador.',
      downloadUrl: '#'
    },
    {
      id: 'res_4',
      communityId: 'comm_vip_col',
      title: 'Guía PDF: Flujo de Cierre Automatizado en WhatsApp para Pedidos Contra Entrega',
      category: 'Guías PDF',
      format: 'PDF',
      author: 'Expert360 Tech',
      downloadsCount: 710,
      description: 'Paso a paso para configurar los scripts de venta directa e IA que disminuyen la tasa de cancelación.',
      downloadUrl: '#'
    }
  ]);

  // File Change Handlers for Direct Video/Media Upload
  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedVideoFileName(`${file.name} (${(file.size / (1024 * 1024)).toFixed(1)} MB)`);
      const url = URL.createObjectURL(file);
      setUploadedVideoPreviewUrl(url);
    }
  };

  const handlePostMediaFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPostMediaFile(file);
      const url = URL.createObjectURL(file);
      setPostMediaPreviewUrl(url);
      setPostMediaType(file.type.startsWith('video/') ? 'video' : 'image');
    }
  };

  // Actions
  const handleLikePost = (postId: string) => {
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        const isLiked = !p.isLiked;
        return {
          ...p,
          isLiked,
          likes: isLiked ? p.likes + 1 : p.likes - 1
        };
      }
      return p;
    }));
  };

  const handleAddPost = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Ensure content fallback so empty text with title/media doesn't get blocked
    const finalTitle = newPostTitle.trim() || '💡 Nueva publicación en la comunidad';
    const finalContent = newPostText.trim() || (postMediaFile ? '📷 Contenido multimedia compartido en la comunidad.' : finalTitle);

    setIsPublishingPost(true);

    setTimeout(() => {
      try {
        const newPostObj: CommunityPost = {
          id: 'p_' + Date.now(),
          communityId: activeCommunityId || 'comm_global',
          author: 'Tú (Usuario)',
          avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
          level: 1,
          timeAgo: 'Hace un momento',
          category: 'General',
          title: finalTitle,
          content: finalContent,
          image: postMediaType === 'image' ? postMediaPreviewUrl : undefined,
          videoUrl: postMediaType === 'video' ? postMediaPreviewUrl : undefined,
          likes: 1,
          isLiked: true,
          commentsCount: 0,
          commentsList: []
        };

        setPosts(prev => [newPostObj, ...prev]);
        setNewPostText('');
        setNewPostTitle('');
        setPostMediaFile(null);
        setPostMediaPreviewUrl('');
        setPostMediaType('none');
        setShowNewPostModal(false);
        showNotification('🎉 ¡Publicación creada exitosamente en la comunidad!');
      } catch (err) {
        console.error("Error al publicar post:", err);
      } finally {
        setIsPublishingPost(false);
      }
    }, 300);
  };

  const handleCreateCommunity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommunityName.trim()) return;

    const gradients = [
      'from-emerald-600 to-teal-600',
      'from-blue-600 to-indigo-600',
      'from-purple-600 to-pink-600',
      'from-amber-600 to-orange-600'
    ];
    const randomGrad = gradients[Math.floor(Math.random() * gradients.length)];

    const newCommId = 'comm_' + Date.now();

    const createdComm: CustomCommunity = {
      id: newCommId,
      name: newCommunityName.trim(),
      tagline: newCommunityTagline.trim() || 'Comunidad especializada y privada de aprendizaje',
      category: newCommunityCategory,
      accessType: newCommunityAccess,
      bannerGradient: randomGrad,
      membersCount: 1,
      creatorName: 'Tú (Líder / Creador)',
      isCustom: true
    };

    // Pre-populate exclusive initial content for the newly created community
    const welcomePost: CommunityPost = {
      id: 'post_w_' + Date.now(),
      communityId: newCommId,
      author: 'Tú (Creador)',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      level: 1,
      timeAgo: 'Hace un momento',
      category: newCommunityCategory,
      isPinned: true,
      title: `🎉 ¡Bienvenidos a la Comunidad Oficial de ${createdComm.name}!`,
      content: `¡Hola a todos! Este es nuestro espacio privado para compartir conocimientos, clases en vivo, estrategias y resolver dudas en ${newCommunityCategory}. Presentate respondiendo a esta publicación.`,
      likes: 1,
      isLiked: true,
      commentsCount: 0,
      commentsList: []
    };

    const starterCourse: Course = {
      id: 'c_start_' + Date.now(),
      communityId: newCommId,
      title: `Programa de Entrenamiento Inicial: ${createdComm.name}`,
      subtitle: `Módulo introductorio y guía de inicio rápido para dominar ${newCommunityCategory}.`,
      bannerImage: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80',
      progressPercentage: 0,
      modules: [
        {
          id: 'm_start_' + Date.now(),
          title: 'Módulo 1: Fundamentos & Configuración',
          lessons: [
            {
              id: 'l_start_' + Date.now(),
              title: `Lección 1: Bienvenida e Instalación de Herramientas`,
              duration: '10 min',
              category: newCommunityCategory,
              difficulty: 'Básico',
              instructor: 'Tú (Creador)',
              description: 'Explicación general de las metas y primeros pasos prácticos.',
              videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
              isCompleted: false
            }
          ]
        }
      ]
    };

    const starterMember: CommunityMember = {
      id: 'm_user_' + Date.now(),
      communityId: newCommId,
      name: 'Tú (Fundador)',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      level: 1,
      role: 'Líder / Fundador',
      joinedDate: 'Hoy',
      points: 500,
      location: 'Latinoamérica',
      isOnline: true
    };

    setUserCommunities(prev => [createdComm, ...prev]);
    setPosts(prev => [welcomePost, ...prev]);
    setCourses(prev => [starterCourse, ...prev]);
    setMembers(prev => [starterMember, ...prev]);

    setActiveCommunityId(createdComm.id);
    setNewCommunityName('');
    setNewCommunityTagline('');
    setShowCreateCommunityModal(false);
    showNotification(`✨ ¡Comunidad "${createdComm.name}" creada exitosamente!`);
  };

  const handleUploadLesson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLessonTitle.trim()) return;

    const videoSource = videoUploadType === 'file' 
      ? (uploadedVideoPreviewUrl || 'https://www.w3schools.com/html/mov_bbb.mp4')
      : (newLessonVideoUrl.trim() || 'https://www.w3schools.com/html/mov_bbb.mp4');

    const newLessonObj: Lesson = {
      id: 'l_' + Date.now(),
      title: newLessonTitle.trim(),
      duration: '12 min',
      category: 'general',
      difficulty: 'Intermedio',
      instructor: 'Tú (Creador)',
      description: newLessonDescription.trim() || 'Aprende los conceptos clave y aplica los archivos adjuntos.',
      videoUrl: videoSource,
      isCompleted: false,
      attachments: newLessonAttachmentName.trim() ? [
        {
          id: 'att_' + Date.now(),
          name: newLessonAttachmentName.trim(),
          type: 'excel',
          size: '1.4 MB',
          url: newLessonAttachmentUrl.trim() || '#'
        }
      ] : []
    };

    // Add lesson to the active community course
    setCourses(prev => prev.map(c => {
      if (c.communityId === activeCommunityId || (!c.communityId && activeCommunityId === 'comm_global')) {
        const updatedCourse = { ...c };
        if (updatedCourse.modules.length > 0) {
          updatedCourse.modules[0].lessons.unshift(newLessonObj);
        } else {
          updatedCourse.modules.push({
            id: 'mod_' + Date.now(),
            title: 'Módulo Principal',
            lessons: [newLessonObj]
          });
        }
        if (selectedCourse?.id === c.id) {
          setSelectedCourse(updatedCourse);
          setSelectedLesson(newLessonObj);
        }
        return updatedCourse;
      }
      return c;
    }));

    setNewLessonTitle('');
    setNewLessonDescription('');
    setNewLessonAttachmentName('');
    setNewLessonAttachmentUrl('');
    setUploadedVideoFileName('');
    setUploadedVideoPreviewUrl('');
    setNewLessonVideoUrl('');
    setShowUploadLessonModal(false);
    showNotification('🎥 ¡Video-lección publicada exitosamente en el curso!');
  };

  const handleAddResource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newResourceTitle.trim()) return;

    const newRes: DropshipperResource = {
      id: 'res_' + Date.now(),
      communityId: activeCommunityId,
      title: newResourceTitle.trim(),
      category: newResourceCategory,
      format: newResourceCategory === 'Plantillas Excel' ? 'XLSX' : newResourceCategory === 'Creativos & UGC' ? 'MP4 Drive' : newResourceCategory === 'Bodegas & Contactos' ? 'WhatsApp Directo' : 'PDF',
      author: 'Tú (Comunidad)',
      downloadsCount: 1,
      description: newResourceDescription.trim() || 'Recurso optimizado para la comunidad.',
      downloadUrl: newResourceUrl.trim() || '#'
    };

    setResources([newRes, ...resources]);
    setNewResourceTitle('');
    setNewResourceDescription('');
    setNewResourceUrl('');
    setShowAddResourceModal(false);
    showNotification('📁 ¡Recurso compartido exitosamente en la bóveda!');
  };

  const handleAddComment = (postId: string) => {
    if (!commentInput.trim()) return;

    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        const newC: PostComment = {
          id: 'c_' + Date.now(),
          author: 'Tú (Usuario)',
          avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100',
          timeAgo: 'Ahora mismo',
          text: commentInput.trim()
        };
        return {
          ...p,
          commentsCount: p.commentsCount + 1,
          commentsList: [...p.commentsList, newC],
          lastCommentText: 'Nuevo comentario ahora mismo'
        };
      }
      return p;
    }));

    setCommentInput('');
  };

  const toggleLessonComplete = (lessonId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (completedLessons.includes(lessonId)) {
      setCompletedLessons(completedLessons.filter(id => id !== lessonId));
    } else {
      setCompletedLessons([...completedLessons, lessonId]);
    }
  };

  const toggleModuleAccordion = (moduleId: string) => {
    setExpandedModules(prev => ({
      ...prev,
      [moduleId]: !prev[moduleId]
    }));
  };

  // FILTER DATA STRICTLY BY ACTIVE COMMUNITY ID!
  const activeCommunity = userCommunities.find(c => c.id === activeCommunityId) || userCommunities[0];

  const communityPosts = posts.filter(p => (p.communityId || 'comm_global') === activeCommunityId);

  const activeCategoryFilteredPosts = communityPosts.filter(p => {
    if (activePostCategory === 'all') return true;
    if (activePostCategory === 'general') return p.category === 'General';
    if (activePostCategory === 'ecommerce') return p.category.includes('E-commerce') || p.category.includes('Dropshipping');
    if (activePostCategory === 'traffiker') return p.category.includes('Traffiker') || p.category.includes('Ads') || p.category.includes('Trading');
    return true;
  });

  const communityCourses = courses.filter(c => (c.communityId || 'comm_global') === activeCommunityId);

  const communityResources = resources.filter(r => (r.communityId || 'comm_global') === activeCommunityId);

  const activeCategoryFilteredResources = communityResources.filter(r => {
    if (resourcesCategoryFilter === 'todos') return true;
    if (resourcesCategoryFilter === 'excel') return r.category === 'Plantillas Excel';
    if (resourcesCategoryFilter === 'ugc') return r.category === 'Creativos & UGC';
    if (resourcesCategoryFilter === 'bodegas') return r.category === 'Bodegas & Contactos';
    if (resourcesCategoryFilter === 'pdf') return r.category === 'Guías PDF';
    return true;
  });

  const communityEvents = calendarEvents.filter(ev => (ev.communityId || 'comm_global') === activeCommunityId);

  const communityMembers = members.filter(m => (m.communityId || 'comm_global') === activeCommunityId);

  const filteredSearchMembers = communityMembers.filter(m => 
    m.name.toLowerCase().includes(memberSearch.toLowerCase()) || 
    m.role.toLowerCase().includes(memberSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#090909] text-slate-100 font-sans relative">
      
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-400/40 animate-bounce">
          <CheckCircle2 size={18} />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}
      
      {/* Top Navbar Header - Skool Style with Dark Theme */}
      <header className="sticky top-0 z-40 bg-[#111115]/95 backdrop-blur border-b border-gray-800/80 shadow-md">
        <div className="w-full px-3 sm:px-6">
          <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
            
            {/* Community Title, Logo & Switcher */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              {onOpenSidebar && (
                <button 
                  onClick={onOpenSidebar}
                  className="p-2 text-gray-300 hover:text-white bg-[#18181c] rounded-xl border border-gray-700/60 md:hidden active:scale-95 transition-transform shrink-0"
                  title="Abrir menú de módulos"
                  aria-label="Abrir menú"
                >
                  <Menu size={18} />
                </button>
              )}
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-purple-900/40 shrink-0">
                <GraduationCap size={20} className="sm:w-[22px] sm:h-[22px]" />
              </div>
              
              {/* Community Selector Dropdown */}
              <div className="relative flex-1 min-w-0">
                <select 
                  value={activeCommunityId}
                  onChange={(e) => {
                    if (e.target.value === 'create_new') {
                      setShowCreateCommunityModal(true);
                    } else {
                      setActiveCommunityId(e.target.value);
                      setSelectedCourse(null);
                    }
                  }}
                  className="bg-[#18181c] hover:bg-[#202026] text-white text-xs sm:text-sm font-bold py-1.5 px-2.5 sm:px-3 rounded-xl border border-purple-500/40 focus:outline-none focus:border-purple-500 cursor-pointer w-full max-w-[220px] sm:max-w-[280px] truncate pr-7"
                >
                  {userCommunities.map(comm => (
                    <option key={comm.id} value={comm.id}>
                      {comm.name} {comm.isCustom ? '⭐ (Comunidad Activa)' : ''}
                    </option>
                  ))}
                  <option value="create_new" className="text-purple-400 font-bold bg-[#111115]">
                    ➕ Crear Mi Comunidad Nueva...
                  </option>
                </select>
              </div>
            </div>

            {/* Right Header Controls */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <button 
                onClick={() => setShowCreateCommunityModal(true)}
                className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-[#1a1a22] hover:bg-[#22222d] text-amber-400 rounded-xl font-bold text-xs border border-amber-500/30 transition-colors"
              >
                <Sparkles size={14} /> Crear Comunidad
              </button>

              <button 
                onClick={() => setShowNewPostModal(true)}
                className="px-3.5 sm:px-4 py-1.5 sm:py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-full font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-md shadow-purple-900/30 active:scale-95"
              >
                <Plus size={16} /> <span className="hidden sm:inline">Publicar</span><span className="sm:hidden">Nuevo</span>
              </button>

              <div className="relative flex items-center cursor-pointer">
                <img 
                  src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100" 
                  alt="Perfil" 
                  className="w-8 h-8 rounded-full object-cover border border-gray-700"
                />
                <span className="absolute -bottom-1 -right-1 bg-amber-500 text-black text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-[#090909]">
                  1
                </span>
              </div>
            </div>

          </div>

          {/* Navigation Tabs Bar */}
          <nav className="flex space-x-2 sm:space-x-8 border-t border-gray-800/80 overflow-x-auto no-scrollbar scroll-smooth py-0.5">
            {[
              { id: 'community', label: 'Comunidad', icon: <MessageSquare size={16} /> },
              { id: 'classroom', label: 'Aulas & Cursos', icon: <BookOpen size={16} /> },
              { id: 'resources', label: 'Bóveda de Recursos', icon: <Folder size={16} /> },
              { id: 'calendar', label: 'Calendario', icon: <Calendar size={16} /> },
              { id: 'members', label: 'Miembros', icon: <Users size={16} /> },
              { id: 'leaderboard', label: 'Clasificación', icon: <Trophy size={16} /> },
            ].map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as TabType);
                    if (tab.id !== 'classroom') setSelectedCourse(null);
                  }}
                  className={`py-3 px-2 sm:px-1 font-semibold text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 border-b-2 transition-all whitespace-nowrap min-h-[44px] shrink-0 ${
                    isActive 
                      ? 'border-purple-500 text-purple-400 font-bold' 
                      : 'border-transparent text-gray-400 hover:text-slate-200'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              );
            })}
          </nav>

        </div>
      </header>

      {/* Main Container */}
      <main className="w-full px-3 sm:px-6 py-4 sm:py-6">

        {/* Current Active Community Header Badge */}
        <div className="bg-gradient-to-r from-purple-950/80 via-[#141418] to-indigo-950/80 border border-purple-800/40 rounded-2xl p-4 mb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
          <div className="space-y-0.5">
            <div className="inline-flex items-center gap-2 text-purple-300 text-[11px] font-bold uppercase tracking-wider">
              <Globe size={13} className="text-purple-400" /> Comunidad Seleccionada Exclusiva
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">{activeCommunity.name}</h2>
            <p className="text-xs text-gray-400">{activeCommunity.tagline} • Categoría: <strong className="text-purple-300">{activeCommunity.category}</strong></p>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-gray-300 bg-[#18181c] px-3.5 py-2 rounded-xl border border-gray-800">
            <Users size={15} className="text-purple-400" /> {activeCommunity.membersCount} Miembros Unidos
          </div>
        </div>

        {/* TAB 1: COMMUNITY FEED */}
        {activeTab === 'community' && (
          <div className="space-y-5">
            
            {/* Create Post Input Bar */}
            <div className="bg-[#121215] rounded-2xl border border-gray-800 p-4 shadow-md flex items-center gap-3">
              <img 
                src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100" 
                alt="Avatar" 
                className="w-10 h-10 rounded-full object-cover border border-gray-700"
              />
              <button 
                onClick={() => setShowNewPostModal(true)}
                className="flex-1 text-left px-4 py-2.5 bg-[#18181c] hover:bg-[#202026] border border-gray-700/60 rounded-full text-xs text-gray-400 transition-colors flex items-center justify-between"
              >
                <span>Escribe algo exclusivo para {activeCommunity.name}...</span>
                <div className="flex items-center gap-2 text-gray-500">
                  <Film size={16} className="hover:text-purple-400" />
                  <ImageIcon size={16} className="hover:text-purple-400" />
                </div>
              </button>
            </div>

            {/* Live Chat & Category Filters Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[#121215] p-3 rounded-2xl border border-gray-800 shadow-md">
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                <button className="px-3.5 py-1.5 bg-red-600/90 text-white rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm shrink-0 border border-red-500/30">
                  <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                  LIVE Soporte por chat
                </button>

                {[
                  { id: 'all', label: 'Todos' },
                  { id: 'general', label: 'General' },
                  { id: 'ecommerce', label: 'E-commerce & Drop' },
                  { id: 'traffiker', label: 'Pauta & Trading' }
                ].map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setActivePostCategory(cat.id)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 ${
                      activePostCategory === cat.id
                        ? 'bg-purple-600 text-white font-semibold'
                        : 'bg-[#1a1a1e] text-gray-400 hover:bg-[#222228] hover:text-white'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              <button className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-[#1a1a1e]">
                <Filter size={18} />
              </button>
            </div>

            {/* Feed Posts List (Isolated for activeCommunityId) */}
            <div className="space-y-4">
              {activeCategoryFilteredPosts.length === 0 ? (
                <div className="bg-[#121215] border border-gray-800 rounded-2xl p-8 text-center space-y-3">
                  <MessageSquare size={32} className="mx-auto text-purple-400 opacity-60" />
                  <h3 className="font-bold text-white text-base">Aún no hay publicaciones en esta comunidad</h3>
                  <p className="text-xs text-gray-400 max-w-md mx-auto">Sé el primero en iniciar la conversación en {activeCommunity.name}.</p>
                  <button 
                    onClick={() => setShowNewPostModal(true)}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold"
                  >
                    Crear primera publicación
                  </button>
                </div>
              ) : (
                activeCategoryFilteredPosts.map(post => (
                  <article key={post.id} className="bg-[#121215] rounded-2xl border border-gray-800 p-5 shadow-md transition-all hover:border-gray-700">
                    
                    {/* Post Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <img 
                            src={post.avatar} 
                            alt={post.author} 
                            className="w-11 h-11 rounded-full object-cover border border-gray-700"
                          />
                          <span className="absolute -bottom-1 -right-1 bg-purple-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-[#121215]">
                            {post.level}
                          </span>
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-bold text-white text-sm">{post.author}</h3>
                            <span className="text-xs text-gray-500">• {post.timeAgo}</span>
                            <span className="text-[11px] text-purple-400 bg-purple-950/50 font-medium px-2.5 py-0.5 rounded-md border border-purple-800/50">
                              {post.category}
                            </span>
                          </div>
                        </div>
                      </div>

                      {post.isPinned && (
                        <span className="flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                          <Pin size={12} /> Fijado
                        </span>
                      )}
                    </div>

                    {/* Post Content */}
                    <div className="mt-4 space-y-2">
                      <h2 className="font-bold text-white text-base leading-snug">{post.title}</h2>
                      <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">{post.content}</p>

                      {post.image && (
                        <div className="mt-3 rounded-xl overflow-hidden border border-gray-800 max-h-80 bg-black">
                          <img src={post.image} alt="Media" className="w-full h-full object-cover opacity-90 hover:opacity-100 transition-opacity" />
                        </div>
                      )}

                      {post.videoUrl && (
                        <div className="mt-3 rounded-xl overflow-hidden border border-purple-800/50 bg-black">
                          <video src={post.videoUrl} controls className="w-full max-h-96" />
                        </div>
                      )}
                    </div>

                    {/* Post Actions Footer */}
                    <div className="mt-4 pt-3 border-t border-gray-800/80 flex items-center justify-between text-xs text-gray-400">
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => handleLikePost(post.id)}
                          className={`flex items-center gap-1.5 font-medium px-3 py-1.5 rounded-lg transition-colors ${
                            post.isLiked ? 'text-purple-400 font-bold bg-purple-950/60 border border-purple-800/50' : 'hover:bg-[#1a1a1e] text-gray-400'
                          }`}
                        >
                          <ThumbsUp size={15} /> {post.likes}
                        </button>

                        <button 
                          onClick={() => setExpandedCommentsPostId(expandedCommentsPostId === post.id ? null : post.id)}
                          className="flex items-center gap-1.5 font-medium hover:bg-[#1a1a1e] px-3 py-1.5 rounded-lg transition-colors text-gray-400"
                        >
                          <MessageSquare size={15} /> {post.commentsCount}
                        </button>
                      </div>

                      {post.lastCommentText && (
                        <span className="text-gray-500 italic text-[11px] hidden sm:inline">{post.lastCommentText}</span>
                      )}
                    </div>

                    {/* Expanded Comments Section */}
                    {expandedCommentsPostId === post.id && (
                      <div className="mt-4 pt-4 border-t border-gray-800 space-y-3 bg-[#18181c] p-4 rounded-xl">
                        <h4 className="font-bold text-xs text-gray-300">Comentarios ({post.commentsList.length})</h4>
                        
                        <div className="space-y-2.5">
                          {post.commentsList.map(c => (
                            <div key={c.id} className="flex items-start gap-2.5 bg-[#121215] p-3 rounded-xl border border-gray-800">
                              <img src={c.avatar} alt={c.author} className="w-7 h-7 rounded-full object-cover" />
                              <div className="flex-1 text-xs">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-white">{c.author}</span>
                                  <span className="text-[10px] text-gray-500">{c.timeAgo}</span>
                                </div>
                                <p className="text-gray-300 mt-1">{c.text}</p>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Add Comment Input */}
                        <div className="flex gap-2 pt-2">
                          <input 
                            type="text"
                            value={commentInput}
                            onChange={(e) => setCommentInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddComment(post.id)}
                            placeholder="Escribe un comentario..."
                            className="flex-1 px-3.5 py-2 bg-[#121215] border border-gray-700/80 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                          />
                          <button 
                            onClick={() => handleAddComment(post.id)}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-colors"
                          >
                            Comentar
                          </button>
                        </div>
                      </div>
                    )}

                  </article>
                ))
              )}
            </div>

          </div>
        )}

        {/* TAB 2: CLASSROOM */}
        {activeTab === 'classroom' && (
          <div>
            {!selectedCourse ? (
              /* Courses Hub Cards Grid (Filtered for activeCommunity) */
              <div className="space-y-6">
                
                {/* Creator Upload Bar & Recommendations */}
                <div className="bg-gradient-to-r from-purple-950/60 via-[#16161a] to-indigo-950/60 rounded-2xl border border-purple-800/40 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-600/30 border border-purple-500/50 flex items-center justify-center text-purple-300 shrink-0">
                      <UploadCloud size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm">¿Eres Creador o Mentor en {activeCommunity.name}?</h3>
                      <p className="text-xs text-gray-400">Subes videos directamente desde tu equipo o pega URLs opcionales de YouTube/Vimeo.</p>
                    </div>
                  </div>

                  <button 
                    onClick={() => setShowUploadLessonModal(true)}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-xs transition-colors flex items-center gap-2 shadow-lg shadow-purple-950 shrink-0 w-full sm:w-auto justify-center"
                  >
                    <Plus size={16} /> Subir VideoDirecto & Recursos
                  </button>
                </div>

                <div className="flex flex-wrap justify-between items-center gap-2 pt-2">
                  <div>
                    <h2 className="text-xl font-bold text-white">Módulos & Cursos de {activeCommunity.name}</h2>
                    <p className="text-xs text-gray-400">Capacitación exclusiva para los miembros de esta comunidad.</p>
                  </div>
                  <span className="text-xs font-semibold bg-[#1a1a1e] text-purple-400 border border-purple-900/50 px-3 py-1 rounded-full">
                    {communityCourses.length} Cursos Disponibles
                  </span>
                </div>

                {communityCourses.length === 0 ? (
                  <div className="bg-[#121215] border border-gray-800 rounded-2xl p-8 text-center space-y-3">
                    <BookOpen size={32} className="mx-auto text-purple-400 opacity-60" />
                    <h3 className="font-bold text-white text-base">Esta comunidad aún no tiene cursos publicados</h3>
                    <p className="text-xs text-gray-400 max-w-md mx-auto">Publica tu primer video-módulo para tus miembros.</p>
                    <button 
                      onClick={() => setShowUploadLessonModal(true)}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold"
                    >
                      Subir Primer Video
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {communityCourses.map(course => (
                      <div 
                        key={course.id}
                        onClick={() => {
                          setSelectedCourse(course);
                          setSelectedLesson(course.modules[0]?.lessons[0] || null);
                        }}
                        className="bg-[#121215] rounded-2xl border border-gray-800 overflow-hidden shadow-md hover:border-purple-500/50 transition-all cursor-pointer group flex flex-col justify-between"
                      >
                        <div>
                          {/* Course Banner Image */}
                          <div className="relative h-44 bg-slate-950 overflow-hidden">
                            <img 
                              src={course.bannerImage} 
                              alt={course.title} 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80"
                            />
                            <div className="absolute top-3 right-3 bg-black/70 backdrop-blur text-white p-1.5 rounded-full hover:bg-black">
                              <MoreVertical size={16} />
                            </div>
                          </div>

                          {/* Course Body Info */}
                          <div className="p-5 space-y-2">
                            <h3 className="font-bold text-white text-lg group-hover:text-purple-400 transition-colors leading-snug">
                              {course.title}
                            </h3>
                            <p className="text-xs text-gray-400 leading-relaxed line-clamp-3">
                              {course.subtitle}
                            </p>
                          </div>
                        </div>

                        {/* Course Progress Bar */}
                        <div className="p-5 pt-0">
                          <div className="bg-[#18181c] rounded-full h-2 w-full overflow-hidden mt-2 border border-gray-800">
                            <div 
                              className="bg-purple-500 h-full rounded-full transition-all duration-500" 
                              style={{ width: `${course.progressPercentage}%` }}
                            ></div>
                          </div>
                          <div className="flex justify-between items-center mt-2.5 text-xs font-semibold text-gray-400">
                            <span>{course.progressPercentage}% Completado</span>
                            <span className="text-purple-400 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                              Ver Módulos <ArrowRight size={14} />
                            </span>
                          </div>
                        </div>

                      </div>
                    ))}
                  </div>
                )}

              </div>
            ) : (
              /* Course Module Accordions & Lesson Player */
              <div className="space-y-6">
                
                {/* Back Header */}
                <div className="flex flex-wrap items-center justify-between border-b border-gray-800 pb-4 gap-3">
                  <button 
                    onClick={() => setSelectedCourse(null)}
                    className="flex items-center gap-2 text-xs font-bold text-purple-400 bg-purple-950/40 border border-purple-800/40 px-3.5 py-2 rounded-xl hover:bg-purple-900/60 transition-colors"
                  >
                    <ChevronLeft size={16} /> Volver a Cursos de {activeCommunity.name}
                  </button>

                  <div className="flex flex-wrap items-center gap-3">
                    <button 
                      onClick={() => setIsFocusMode(true)}
                      className="px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md shadow-purple-950/50 transition-all border border-purple-400/30"
                    >
                      <Maximize2 size={15} /> Modo Lectura Focus
                    </button>

                    <div className="flex items-center gap-3 bg-[#18181c] px-3.5 py-1.5 rounded-xl border border-gray-800">
                      <span className="text-xs font-semibold text-gray-300">
                        {completedCourseLessons}/{totalCourseLessons} Lecciones ({courseProgressPct}%)
                      </span>
                      <div className="w-28 bg-[#121215] border border-gray-700 h-2 rounded-full overflow-hidden">
                        <div className="bg-purple-500 h-full rounded-full transition-all duration-300" style={{ width: `${courseProgressPct}%` }}></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Left Column: Accordion Modules */}
                  <div className="lg:col-span-1 space-y-3">
                    <h3 className="font-bold text-gray-300 text-xs uppercase tracking-wider mb-2">
                      Estructura del Curso
                    </h3>

                    {selectedCourse.modules.map(module => {
                      const isExpanded = expandedModules[module.id] ?? true;
                      return (
                        <div key={module.id} className="bg-[#121215] border border-gray-800 rounded-2xl overflow-hidden shadow-sm">
                          <button
                            onClick={() => toggleModuleAccordion(module.id)}
                            className="w-full p-4 text-left font-bold text-xs text-white flex items-center justify-between bg-[#18181c] hover:bg-[#202026] transition-colors"
                          >
                            <span className="truncate">{module.title}</span>
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>

                          {isExpanded && (
                            <div className="divide-y divide-gray-800/50">
                              {module.lessons.map(lesson => {
                                const isSelected = selectedLesson?.id === lesson.id;
                                const isDone = completedLessons.includes(lesson.id);
                                return (
                                  <div
                                    key={lesson.id}
                                    onClick={() => setSelectedLesson(lesson)}
                                    className={`p-3.5 flex items-start gap-3 cursor-pointer transition-colors text-xs ${
                                      isSelected ? 'bg-purple-950/40 border-l-4 border-purple-500 text-white font-bold' : 'hover:bg-[#18181c]/60 text-gray-300'
                                    }`}
                                  >
                                    <button 
                                      onClick={(e) => toggleLessonComplete(lesson.id, e)}
                                      className={`mt-0.5 rounded-full p-0.5 border ${
                                        isDone ? 'bg-emerald-500 border-emerald-400 text-black' : 'border-gray-600 text-transparent hover:border-gray-400'
                                      }`}
                                    >
                                      <Check size={12} />
                                    </button>

                                    <div className="flex-1 min-w-0">
                                      <p className="line-clamp-2 leading-snug">{lesson.title}</p>
                                      <span className="text-[10px] text-gray-500 font-mono mt-1 block">{lesson.duration}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Right Column: Video Player & Lesson Content */}
                  <div className="lg:col-span-2 space-y-4">
                    {selectedLesson ? (
                      <div className="bg-[#121215] border border-gray-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
                        
                        {/* Video Container */}
                        <div className="relative rounded-2xl overflow-hidden border border-purple-800/40 bg-black aspect-video shadow-2xl">
                          <video 
                            src={selectedLesson.videoUrl} 
                            controls 
                            autoPlay={false} 
                            className="w-full h-full object-contain"
                          />
                        </div>

                        {/* Title & Instructor */}
                        <div className="space-y-2 border-b border-gray-800 pb-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <h2 className="text-xl font-bold text-white leading-tight">{selectedLesson.title}</h2>
                            <button
                              onClick={() => toggleLessonComplete(selectedLesson.id)}
                              className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                                completedLessons.includes(selectedLesson.id)
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : 'bg-purple-600 hover:bg-purple-500 text-white shadow-md'
                              }`}
                            >
                              <CheckCircle size={14} /> {completedLessons.includes(selectedLesson.id) ? 'Completado' : 'Marcar como Completado'}
                            </button>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-gray-400">
                            <span>instructor: <strong className="text-purple-300">{selectedLesson.instructor}</strong></span>
                            <span>•</span>
                            <span>Dificultad: <strong>{selectedLesson.difficulty}</strong></span>
                          </div>
                        </div>

                        {/* Lesson Description */}
                        <div className="space-y-2 text-xs text-gray-300 leading-relaxed">
                          <h4 className="font-bold text-white text-sm">Resumen de la Clase</h4>
                          <p>{selectedLesson.description}</p>
                        </div>

                        {/* Attachments Section */}
                        {selectedLesson.attachments && selectedLesson.attachments.length > 0 && (
                          <div className="bg-[#18181c] rounded-2xl p-4 border border-gray-800 space-y-2">
                            <h4 className="font-bold text-xs text-purple-300 flex items-center gap-1.5">
                              <FileText size={15} /> Archivos Descargables Adjuntos
                            </h4>

                            <div className="space-y-2 pt-1">
                              {selectedLesson.attachments.map(att => (
                                <a 
                                  key={att.id}
                                  href={att.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center justify-between p-3 bg-[#121215] border border-gray-700/60 rounded-xl hover:border-purple-500 transition-colors text-xs text-white group"
                                >
                                  <div className="flex items-center gap-2">
                                    <FileText size={16} className="text-purple-400" />
                                    <span className="font-semibold group-hover:text-purple-300">{att.name}</span>
                                    {att.size && <span className="text-[10px] text-gray-500">({att.size})</span>}
                                  </div>
                                  <span className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-[11px] font-bold flex items-center gap-1">
                                    <Download size={12} /> Descargar
                                  </span>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                      </div>
                    ) : (
                      <div className="bg-[#121215] border border-gray-800 rounded-2xl p-12 text-center text-gray-400">
                        Selecciona una lección del menú izquierdo para reproducir el video.
                      </div>
                    )}
                  </div>

                </div>

              </div>
            )}
          </div>
        )}

        {/* TAB 3: RESOURCES VAULT */}
        {activeTab === 'resources' && (
          <div className="space-y-5">
            <div className="bg-gradient-to-r from-purple-950/60 via-[#16161a] to-pink-950/60 rounded-2xl border border-purple-800/40 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white">Bóveda de Recursos de {activeCommunity.name}</h2>
                <p className="text-xs text-gray-400">Descarga plantillas en Excel, guías en PDF y paquetes de creativos de esta comunidad.</p>
              </div>

              <button 
                onClick={() => setShowAddResourceModal(true)}
                className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-purple-950 flex items-center gap-2 shrink-0"
              >
                <Plus size={16} /> Compartir Recurso
              </button>
            </div>

            {/* Category Pill Filters */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {[
                { id: 'todos', label: 'Todos los Archivos' },
                { id: 'excel', label: 'Plantillas Excel / Sheets' },
                { id: 'ugc', label: 'Creativos & UGC MP4' },
                { id: 'bodegas', label: 'Bodegas & Contactos' },
                { id: 'pdf', label: 'Guías PDF' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setResourcesCategoryFilter(f.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
                    resourcesCategoryFilter === f.id
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-[#121215] text-gray-400 border border-gray-800 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Resources Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeCategoryFilteredResources.length === 0 ? (
                <div className="col-span-2 bg-[#121215] border border-gray-800 rounded-2xl p-8 text-center space-y-2">
                  <Folder size={32} className="mx-auto text-purple-400 opacity-60" />
                  <p className="font-bold text-white text-sm">No hay recursos en esta categoría para {activeCommunity.name}</p>
                </div>
              ) : (
                activeCategoryFilteredResources.map(res => (
                  <div key={res.id} className="bg-[#121215] border border-gray-800 rounded-2xl p-5 space-y-3 hover:border-purple-500/50 transition-colors flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-md bg-purple-950/80 text-purple-300 border border-purple-800/50">
                          {res.format}
                        </span>
                        <span className="text-xs text-gray-500 font-mono">{res.downloadsCount} descargas</span>
                      </div>

                      <h3 className="font-bold text-white text-base leading-snug">{res.title}</h3>
                      <p className="text-xs text-gray-400 leading-relaxed">{res.description}</p>
                    </div>

                    <div className="pt-3 border-t border-gray-800/80 flex items-center justify-between">
                      <span className="text-[11px] text-gray-500">Por: <strong>{res.author}</strong></span>
                      <a 
                        href={res.downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-xs flex items-center gap-1.5"
                      >
                        <Download size={14} /> Obtener
                      </a>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 4: CALENDAR */}
        {activeTab === 'calendar' && (
          <div className="space-y-6">
            
            {/* Top Calendar Control Header */}
            <div className="bg-[#121215] border border-gray-800 rounded-3xl p-5 shadow-xl space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Calendar className="text-purple-400" size={22} />
                    <h2 className="text-xl font-bold text-white">Calendario de Eventos & Clases ({activeCommunity.name})</h2>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Revisa las sesiones programadas en vivo, masterclasses y mentorías grupales.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Month Navigator */}
                  <div className="flex items-center bg-[#18181c] border border-gray-700/80 rounded-2xl p-1">
                    <button 
                      onClick={handlePrevMonth} 
                      className="p-1.5 hover:bg-gray-800 text-gray-300 rounded-xl transition-colors"
                      title="Mes Anterior"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <span className="px-3 text-xs font-bold text-white min-w-[110px] text-center">
                      {MONTH_NAMES[currentCalMonth]} {currentCalYear}
                    </span>
                    <button 
                      onClick={handleNextMonth} 
                      className="p-1.5 hover:bg-gray-800 text-gray-300 rounded-xl transition-colors"
                      title="Mes Siguiente"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>

                  <button 
                    onClick={handleGoToday}
                    className="px-3 py-2 bg-[#18181c] hover:bg-gray-800 text-purple-300 border border-purple-500/30 rounded-2xl text-xs font-bold transition-all"
                  >
                    Hoy
                  </button>

                  {/* View Mode Toggle */}
                  <div className="flex items-center bg-[#18181c] border border-gray-700/80 rounded-2xl p-1">
                    <button 
                      onClick={() => setCalendarViewMode('grid')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                        calendarViewMode === 'grid' 
                          ? 'bg-purple-600 text-white shadow-md' 
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <Grid size={14} /> Vista Mes
                    </button>
                    <button 
                      onClick={() => setCalendarViewMode('list')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                        calendarViewMode === 'list' 
                          ? 'bg-purple-600 text-white shadow-md' 
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <List size={14} /> Lista Agenda
                    </button>
                  </div>

                  {/* Schedule Event Button */}
                  <button
                    onClick={() => {
                      setNewEventDate(selectedCalendarDate);
                      setShowAddEventModal(true);
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-2xl shadow-lg shadow-purple-950 flex items-center gap-1.5 transition-all"
                  >
                    <Plus size={16} /> Agendar Evento
                  </button>
                </div>
              </div>
            </div>

            {/* GRID MODE: MONTHLY CALENDAR MATRIX */}
            {calendarViewMode === 'grid' ? (
              <div className="space-y-6">
                
                {/* 7-column Calendar Container */}
                <div className="bg-[#121215] border border-gray-800 rounded-3xl p-4 sm:p-6 shadow-2xl overflow-x-auto">
                  
                  {/* Days of Week Header */}
                  <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center border-b border-gray-800 pb-3 min-w-[650px]">
                    {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day, idx) => (
                      <div key={day} className={`text-xs font-bold uppercase tracking-wider ${idx >= 5 ? 'text-purple-400' : 'text-gray-400'}`}>
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Days Matrix */}
                  <div className="grid grid-cols-7 gap-1 sm:gap-2 min-w-[650px]">
                    {getMonthCalendarDays(currentCalYear, currentCalMonth).map((dayObj, index) => {
                      const dayEvents = communityEvents.filter(ev => ev.date === dayObj.dateStr);
                      const isSelected = selectedCalendarDate === dayObj.dateStr;

                      return (
                        <div
                          key={index}
                          onClick={() => setSelectedCalendarDate(dayObj.dateStr)}
                          className={`min-h-[100px] sm:min-h-[115px] p-2 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                            !dayObj.isCurrentMonth 
                              ? 'bg-[#0d0d0f]/50 border-gray-900/60 text-gray-600 opacity-40' 
                              : isSelected 
                                ? 'bg-purple-950/40 border-purple-500 shadow-lg shadow-purple-950/40' 
                                : dayObj.isToday
                                  ? 'bg-[#181820] border-purple-500/80 shadow-md ring-1 ring-purple-500'
                                  : 'bg-[#16161b] border-gray-800/80 hover:border-gray-700 text-gray-200'
                          }`}
                        >
                          {/* Day Header */}
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-bold font-mono ${
                              dayObj.isToday 
                                ? 'bg-purple-600 text-white px-2 py-0.5 rounded-full text-[11px]' 
                                : dayObj.isCurrentMonth ? 'text-gray-300' : 'text-gray-600'
                            }`}>
                              {dayObj.dayNumber}
                            </span>

                            {dayObj.isToday && (
                              <span className="text-[9px] font-black uppercase text-purple-300 tracking-wider">Hoy</span>
                            )}
                          </div>

                          {/* Day Event Badges */}
                          <div className="space-y-1 my-1 overflow-hidden max-h-[65px]">
                            {dayEvents.map(ev => (
                              <div 
                                key={ev.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedCalendarDate(ev.date);
                                }}
                                className="p-1 rounded-lg bg-purple-900/60 hover:bg-purple-800 border border-purple-500/40 text-white text-[10px] leading-tight truncate font-semibold flex items-center gap-1 shadow-sm"
                                title={`${ev.time} - ${ev.title}`}
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
                                <span className="truncate">{ev.title}</span>
                              </div>
                            ))}
                          </div>

                          {/* Event Counter Pill */}
                          {dayEvents.length > 0 ? (
                            <div className="text-[9px] font-bold text-emerald-400 bg-emerald-950/50 border border-emerald-800/40 px-1.5 py-0.5 rounded-md text-center">
                              {dayEvents.length} {dayEvents.length === 1 ? 'evento' : 'eventos'}
                            </div>
                          ) : (
                            <div className="h-3" />
                          )}
                        </div>
                      );
                    })}
                  </div>

                </div>

                {/* Selected Day Inspector Panel */}
                <div className="bg-[#121215] border border-gray-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Calendar className="text-purple-400" size={18} />
                      Eventos para el <span className="text-purple-300 font-mono underline">{selectedCalendarDate}</span>
                    </h3>
                    <span className="text-xs text-gray-400 font-mono">
                      {communityEvents.filter(ev => ev.date === selectedCalendarDate).length} programados
                    </span>
                  </div>

                  {communityEvents.filter(ev => ev.date === selectedCalendarDate).length === 0 ? (
                    <div className="p-8 text-center text-gray-500 space-y-2 bg-[#16161b] rounded-2xl border border-gray-800/60">
                      <Clock size={28} className="mx-auto text-purple-400/50" />
                      <p className="text-xs font-semibold text-gray-400">No hay eventos ni clases agendadas para esta fecha.</p>
                      <button
                        onClick={() => {
                          setNewEventDate(selectedCalendarDate);
                          setShowAddEventModal(true);
                        }}
                        className="mt-2 px-3.5 py-1.5 bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 border border-purple-500/40 rounded-xl text-xs font-bold transition-all"
                      >
                        + Agendar clase para este día
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {communityEvents.filter(ev => ev.date === selectedCalendarDate).map(ev => (
                        <div key={ev.id} className="bg-[#16161b] border border-gray-800 rounded-2xl overflow-hidden shadow-lg hover:border-purple-500/50 transition-all flex flex-col justify-between">
                          <div>
                            <div className="h-36 bg-slate-950 relative">
                              <img src={ev.image} alt={ev.title} className="w-full h-full object-cover opacity-85" />
                              <span className="absolute top-3 left-3 bg-red-600 text-white text-[10px] font-black px-2.5 py-1 rounded-md uppercase shadow-md">
                                {ev.badgeText}
                              </span>
                            </div>

                            <div className="p-4 space-y-2">
                              <div className="flex items-center gap-1.5 text-xs text-purple-400 font-mono font-bold">
                                <Clock size={14} /> {ev.time}
                              </div>
                              <h4 className="font-bold text-white text-base leading-snug">{ev.title}</h4>
                            </div>
                          </div>

                          <div className="p-4 pt-0">
                            <button 
                              onClick={() => alert(`Uniéndote a la sala de Zoom/Meet para: ${ev.title}`)}
                              className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md shadow-purple-950 transition-all"
                            >
                              <Video size={16} /> Unirse a la Sesión en Vivo
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            ) : (
              /* LIST MODE: CHRONOLOGICAL AGENDA */
              <div className="space-y-4">
                {communityEvents.length === 0 ? (
                  <div className="bg-[#121215] border border-gray-800 rounded-2xl p-12 text-center text-gray-400 space-y-2">
                    <Calendar size={32} className="mx-auto text-purple-400 opacity-60" />
                    <p className="font-bold text-white">No hay llamadas programadas para esta comunidad.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {communityEvents.map(ev => (
                      <div key={ev.id} className="bg-[#121215] border border-gray-800 rounded-2xl overflow-hidden shadow-md space-y-3 hover:border-purple-500/50 transition-all">
                        <div className="h-36 bg-slate-950 relative">
                          <img src={ev.image} alt={ev.title} className="w-full h-full object-cover opacity-80" />
                          <span className="absolute top-3 left-3 bg-red-600 text-white text-[10px] font-black px-2.5 py-1 rounded-md uppercase shadow-md">
                            {ev.badgeText}
                          </span>
                          <span className="absolute bottom-3 right-3 bg-black/80 backdrop-blur text-purple-300 text-[10px] font-mono px-2 py-0.5 rounded-md border border-purple-500/40">
                            📅 {ev.date}
                          </span>
                        </div>

                        <div className="p-4 space-y-3">
                          <span className="text-[11px] text-purple-400 font-mono font-bold block">{ev.time}</span>
                          <h3 className="font-bold text-white text-base leading-snug">{ev.title}</h3>

                          <button 
                            onClick={() => alert(`Uniéndote a la sala de Zoom/Meet para: ${ev.title}`)}
                            className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md"
                          >
                            <Video size={14} /> Unirse a la Sesión
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        )}

        {/* TAB 5: MEMBERS */}
        {activeTab === 'members' && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-white">Miembros de {activeCommunity.name} ({communityMembers.length})</h2>
                <p className="text-xs text-gray-400">Conecta e intercambia mensajes con otros miembros.</p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search size={16} className="absolute left-3 top-2.5 text-gray-500" />
                <input 
                  type="text"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Buscar miembro..."
                  className="w-full pl-9 pr-3.5 py-2 bg-[#121215] border border-gray-700/80 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSearchMembers.map(m => (
                <div key={m.id} className="bg-[#121215] border border-gray-800 rounded-2xl p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative">
                      <img src={m.avatar} alt={m.name} className="w-12 h-12 rounded-full object-cover border border-gray-700" />
                      {m.isOnline && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-[#121215] rounded-full"></span>
                      )}
                    </div>

                    <div className="min-w-0">
                      <h4 className="font-bold text-white text-sm truncate">{m.name}</h4>
                      <p className="text-xs text-purple-400 font-medium truncate">{m.role}</p>
                      <span className="text-[10px] text-gray-500">{m.location}</span>
                    </div>
                  </div>

                  <button 
                    onClick={() => setActiveMessageMember(m)}
                    className="p-2.5 bg-[#18181c] hover:bg-[#22222a] text-purple-400 rounded-xl border border-gray-700/60 shrink-0"
                    title="Mensaje directo"
                  >
                    <Send size={15} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: LEADERBOARD */}
        {activeTab === 'leaderboard' && (
          <div className="space-y-5">
            <div className="bg-gradient-to-r from-amber-950/60 via-[#16161a] to-purple-950/60 rounded-2xl border border-amber-800/40 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Trophy size={20} className="text-amber-400" /> Tabla de Clasificación ({activeCommunity.name})
                </h2>
                <p className="text-xs text-gray-400">Gana puntos aportando comentarios, respondiendo dudas y completando lecciones.</p>
              </div>

              <div className="flex items-center gap-2 bg-[#121215] p-1 rounded-xl border border-gray-800">
                {(['7d', '30d', 'all'] as const).map(tf => (
                  <button
                    key={tf}
                    onClick={() => setLeaderboardFilter(tf)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold ${
                      leaderboardFilter === tf ? 'bg-amber-500 text-black' : 'text-gray-400'
                    }`}
                  >
                    {tf === '7d' ? '7 Días' : tf === '30d' ? '30 Días' : 'Histórico'}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-[#121215] border border-gray-800 rounded-2xl overflow-hidden shadow-md">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#18181c] text-gray-400 font-bold uppercase text-[10px] border-b border-gray-800">
                  <tr>
                    <th className="p-3">Posición</th>
                    <th className="p-3">Miembro</th>
                    <th className="p-3">Rol</th>
                    <th className="p-3">Puntos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60 bg-[#121215]">
                  {communityMembers.map((m, i) => (
                    <tr key={m.id} className="hover:bg-[#18181c] transition-colors">
                      <td className="p-3 font-bold text-white">#{i + 1}</td>
                      <td className="p-3 flex items-center gap-2.5 font-bold text-white">
                        <img src={m.avatar} alt={m.name} className="w-7 h-7 rounded-full object-cover" />
                        {m.name}
                      </td>
                      <td className="p-3 text-gray-400">{m.role}</td>
                      <td className="p-3 font-mono font-bold text-purple-400">{m.points.toLocaleString()} pts</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        )}

      </main>

      {/* NEW POST MODAL (With Image/Video File Picker) */}
      {showNewPostModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121215] border border-gray-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 relative max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setShowNewPostModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-2 text-purple-400">
              <MessageSquare size={20} />
              <h3 className="font-bold text-lg text-white">Publicar en {activeCommunity.name}</h3>
            </div>

            <form onSubmit={handleAddPost} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Título de la publicación</label>
                <input 
                  type="text"
                  value={newPostTitle}
                  onChange={(e) => setNewPostTitle(e.target.value)}
                  placeholder="Ej: Estrategia de cierre por WhatsApp con IA..."
                  className="w-full px-3.5 py-2.5 bg-[#18181c] border border-gray-700/80 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Contenido</label>
                <textarea 
                  rows={4}
                  value={newPostText}
                  onChange={(e) => setNewPostText(e.target.value)}
                  placeholder="Escribe tu duda, aprendizaje o consejo para esta comunidad..."
                  className="w-full px-3.5 py-2.5 bg-[#18181c] border border-gray-700/80 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Direct Media File Upload for Post */}
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Adjuntar Imagen o Video Directo (Opcional)</label>
                <div className="p-3.5 bg-[#18181c] border-2 border-dashed border-gray-700 rounded-xl text-center cursor-pointer hover:border-purple-500 relative transition-colors">
                  <input 
                    type="file" 
                    accept="image/*,video/*"
                    onChange={handlePostMediaFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <div className="flex items-center justify-center gap-2 text-xs font-bold text-purple-300">
                    <UploadCloud size={16} /> Seleccionar Imagen o Video de tu Equipo
                  </div>
                </div>

                {postMediaPreviewUrl && (
                  <div className="mt-2 relative rounded-xl overflow-hidden border border-purple-800 max-h-40 bg-black">
                    {postMediaType === 'video' ? (
                      <video src={postMediaPreviewUrl} controls className="w-full h-full max-h-40 object-contain" />
                    ) : (
                      <img src={postMediaPreviewUrl} alt="Preview" className="w-full h-full max-h-40 object-cover" />
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button 
                  type="button"
                  onClick={() => setShowNewPostModal(false)}
                  className="px-4 py-2 bg-[#18181c] hover:bg-[#202026] text-gray-300 rounded-xl text-xs font-bold"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={isPublishingPost}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-950 flex items-center gap-2 transition-all"
                >
                  {isPublishingPost ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Publicando...
                    </>
                  ) : (
                    <>
                      <Send size={14} /> Publicar ahora
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DIRECT MESSAGE MODAL */}
      {activeMessageMember && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121215] border border-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 relative">
            <button 
              onClick={() => setActiveMessageMember(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3">
              <img src={activeMessageMember.avatar} alt={activeMessageMember.name} className="w-10 h-10 rounded-full object-cover border border-gray-700" />
              <div>
                <h3 className="font-bold text-white text-base">{activeMessageMember.name}</h3>
                <span className="text-xs text-purple-400">{activeMessageMember.role}</span>
              </div>
            </div>

            <textarea 
              rows={3}
              value={directMessageText}
              onChange={(e) => setDirectMessageText(e.target.value)}
              placeholder={`Escribe un mensaje privado para ${activeMessageMember.name}...`}
              className="w-full px-3.5 py-2.5 bg-[#18181c] border border-gray-700/80 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
            />

            <div className="flex justify-end gap-2">
              <button 
                onClick={() => {
                  alert(`Mensaje enviado con éxito a ${activeMessageMember.name}`);
                  setDirectMessageText('');
                  setActiveMessageMember(null);
                }}
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-purple-950"
              >
                <Send size={14} /> Enviar Mensaje
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: CREAR NUEVA COMUNIDAD */}
      {showCreateCommunityModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121215] border border-gray-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 relative">
            <button 
              onClick={() => setShowCreateCommunityModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-2 text-purple-400">
              <Sparkles size={20} />
              <h3 className="font-bold text-lg text-white">Crear Comunidad Independiente</h3>
            </div>
            <p className="text-xs text-gray-400">
              Toda la información, lecciones, archivos y miembros de esta comunidad estarán 100% aislados de otras comunidades.
            </p>

            <form onSubmit={handleCreateCommunity} className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Nombre de la Comunidad</label>
                <input 
                  type="text"
                  required
                  value={newCommunityName}
                  onChange={(e) => setNewCommunityName(e.target.value)}
                  placeholder="Ej: Academia Trading Forex Pro / Club Dropshipper Elite"
                  className="w-full px-3.5 py-2.5 bg-[#18181c] border border-gray-700/80 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Nicho / Categoría de la Comunidad</label>
                <select 
                  value={newCommunityCategory}
                  onChange={(e) => setNewCommunityCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#18181c] border border-gray-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500 font-medium"
                >
                  <option value="Trading & Cripto">📈 Trading, Forex & Cripto</option>
                  <option value="E-commerce & Dropshipping">🛒 E-commerce & Dropshipping</option>
                  <option value="Bienes Raíces">🏢 Bienes Raíces e Inmobiliarias</option>
                  <option value="High Ticket & Ventas">💎 High Ticket & Cierre de Ventas</option>
                  <option value="Agencias SMMA">🚀 Agencias Digitales & SMMA</option>
                  <option value="Fitness & Salud">🏋️ Fitness, Salud & Nutrición</option>
                  <option value="Finanzas & Inversiones">💰 Finanzas Personales & Negocios</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Eslogan / Descripción Breve</label>
                <input 
                  type="text"
                  value={newCommunityTagline}
                  onChange={(e) => setNewCommunityTagline(e.target.value)}
                  placeholder="Ej: Clases de trading en vivo, señales y plantillas de gestión de riesgo"
                  className="w-full px-3.5 py-2.5 bg-[#18181c] border border-gray-700/80 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Tipo de Acceso & Monetización</label>
                <select 
                  value={newCommunityAccess}
                  onChange={(e) => setNewCommunityAccess(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-[#18181c] border border-gray-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="Gratis">Pública / Abierta (Gratis)</option>
                  <option value="Privada (Invitación)">Privada (Solo por Invitación)</option>
                  <option value="VIP Premium ($29/mes)">VIP Premium / Membresía ($29 USD/mes)</option>
                </select>
              </div>

              <div className="p-3 bg-[#18181c] rounded-xl border border-purple-900/40 text-[11px] text-purple-300 space-y-1">
                <p className="font-bold">✨ Aislamiento Completo Garantizado:</p>
                <p className="text-gray-400">Los posts, cursos, archivos y miembros creados aquí no se mezclarán con otras comunidades.</p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button 
                  type="button"
                  onClick={() => setShowCreateCommunityModal(false)}
                  className="px-4 py-2 bg-[#18181c] hover:bg-[#202026] text-gray-300 rounded-xl text-xs font-bold"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-950"
                >
                  Crear Comunidad Ahora
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: SUBIR VIDEO-CLASE & RECURSOS ADJUNTOS (WITH DIRECT VIDEO FILE UPLOAD!) */}
      {showUploadLessonModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121215] border border-gray-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 relative max-h-[90vh] overflow-y-auto no-scrollbar">
            <button 
              onClick={() => setShowUploadLessonModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-2 text-purple-400">
              <UploadCloud size={20} />
              <h3 className="font-bold text-lg text-white">Subir Video-Lección a {activeCommunity.name}</h3>
            </div>

            <form onSubmit={handleUploadLesson} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Título de la Clase / Lección</label>
                <input 
                  type="text"
                  required
                  value={newLessonTitle}
                  onChange={(e) => setNewLessonTitle(e.target.value)}
                  placeholder="Ej: Cómo validar un producto ganador en TikTok con $10 USD"
                  className="w-full px-3.5 py-2.5 bg-[#18181c] border border-gray-700/80 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* DIRECT VIDEO UPLOAD OR OPTIONAL URL TOGGLE */}
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1.5">Origen del Video</label>
                
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setVideoUploadType('file')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors flex items-center justify-center gap-1.5 ${
                      videoUploadType === 'file'
                        ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-950'
                        : 'bg-[#18181c] text-gray-400 border-gray-800 hover:text-white'
                    }`}
                  >
                    <UploadCloud size={15} /> Subir Video Directo (.MP4)
                  </button>
                  <button
                    type="button"
                    onClick={() => setVideoUploadType('url')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors flex items-center justify-center gap-1.5 ${
                      videoUploadType === 'url'
                        ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-950'
                        : 'bg-[#18181c] text-gray-400 border-gray-800 hover:text-white'
                    }`}
                  >
                    <Video size={15} /> URL Externa (Opcional)
                  </button>
                </div>

                {videoUploadType === 'file' ? (
                  <div className="p-4 bg-[#18181c] border-2 border-dashed border-purple-800/60 hover:border-purple-500 rounded-2xl text-center space-y-2 cursor-pointer transition-colors relative">
                    <input 
                      type="file" 
                      accept="video/*"
                      onChange={handleVideoFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <Video size={30} className="mx-auto text-purple-400" />
                    <div>
                      <p className="text-xs font-bold text-white">Haz clic o arrastra un archivo de video MP4/MOV de tu equipo</p>
                      <p className="text-[10px] text-gray-400">Soporta videos grabados desde tu celular o computadora</p>
                    </div>
                    {uploadedVideoFileName && (
                      <div className="mt-2 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 p-2 rounded-xl flex items-center justify-center gap-2">
                        <CheckCircle2 size={14} /> Archivo Seleccionado: {uploadedVideoFileName}
                      </div>
                    )}
                  </div>
                ) : (
                  <input 
                    type="url"
                    value={newLessonVideoUrl}
                    onChange={(e) => setNewLessonVideoUrl(e.target.value)}
                    placeholder="https://www.w3schools.com/html/mov_bbb.mp4 (Opcional)"
                    className="w-full px-3.5 py-2.5 bg-[#18181c] border border-gray-700/80 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  />
                )}

                {/* Instant Video Player Preview */}
                {(uploadedVideoPreviewUrl || newLessonVideoUrl) && (
                  <div className="mt-3 space-y-1">
                    <span className="text-[10px] text-gray-400 font-bold uppercase">Previsualización del Video:</span>
                    <video 
                      src={uploadedVideoPreviewUrl || newLessonVideoUrl} 
                      controls 
                      className="w-full max-h-44 rounded-xl bg-black border border-purple-800/50 object-contain"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Descripción & Explicación</label>
                <textarea 
                  rows={3}
                  value={newLessonDescription}
                  onChange={(e) => setNewLessonDescription(e.target.value)}
                  placeholder="Detalla los puntos aprendidos y pasos prácticos..."
                  className="w-full px-3.5 py-2.5 bg-[#18181c] border border-gray-700/80 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Adjuntar Archivo o Recurso Descargable */}
              <div className="p-3.5 bg-[#18181c] rounded-xl border border-gray-800 space-y-2">
                <span className="font-bold text-xs text-purple-300 flex items-center gap-1.5">
                  <FileText size={15} /> Adjuntar Archivo Descargable (Opcional)
                </span>
                
                <div>
                  <input 
                    type="text"
                    value={newLessonAttachmentName}
                    onChange={(e) => setNewLessonAttachmentName(e.target.value)}
                    placeholder="Nombre del archivo (Ej: Plantilla Excel Calculadora.xlsx)"
                    className="w-full px-3 py-2 bg-[#121215] border border-gray-700/80 rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 mb-2"
                  />
                  <input 
                    type="text"
                    value={newLessonAttachmentUrl}
                    onChange={(e) => setNewLessonAttachmentUrl(e.target.value)}
                    placeholder="URL de descarga (Google Drive / Dropi Link)"
                    className="w-full px-3 py-2 bg-[#121215] border border-gray-700/80 rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button 
                  type="button"
                  onClick={() => setShowUploadLessonModal(false)}
                  className="px-4 py-2 bg-[#18181c] hover:bg-[#202026] text-gray-300 rounded-xl text-xs font-bold"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-950"
                >
                  Publicar Lección
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: COMPARTIR RECURSO EN BÓVEDA */}
      {showAddResourceModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121215] border border-gray-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 relative">
            <button 
              onClick={() => setShowAddResourceModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-2 text-purple-400">
              <Folder size={20} />
              <h3 className="font-bold text-lg text-white">Compartir Recurso en {activeCommunity.name}</h3>
            </div>

            <form onSubmit={handleAddResource} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Título del Recurso</label>
                <input 
                  type="text"
                  required
                  value={newResourceTitle}
                  onChange={(e) => setNewResourceTitle(e.target.value)}
                  placeholder="Ej: Plantilla de Control de Fletes y Devoluciones 2026"
                  className="w-full px-3.5 py-2.5 bg-[#18181c] border border-gray-700/80 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Categoría</label>
                <select 
                  value={newResourceCategory}
                  onChange={(e) => setNewResourceCategory(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-[#18181c] border border-gray-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="Plantillas Excel">Plantillas Excel / Sheets</option>
                  <option value="Creativos & UGC">Creativos & Packs de Anuncios</option>
                  <option value="Bodegas & Contactos">Bodegas & Proveedores Verificados</option>
                  <option value="Guías PDF">Guías PDF & Manuales</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Descripción Breve</label>
                <textarea 
                  rows={3}
                  value={newResourceDescription}
                  onChange={(e) => setNewResourceDescription(e.target.value)}
                  placeholder="Explica qué incluye y cómo le ayuda a esta comunidad..."
                  className="w-full px-3.5 py-2.5 bg-[#18181c] border border-gray-700/80 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Enlace de Descarga o Acceso</label>
                <input 
                  type="text"
                  value={newResourceUrl}
                  onChange={(e) => setNewResourceUrl(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="w-full px-3.5 py-2.5 bg-[#18181c] border border-gray-700/80 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button 
                  type="button"
                  onClick={() => setShowAddResourceModal(false)}
                  className="px-4 py-2 bg-[#18181c] hover:bg-[#202026] text-gray-300 rounded-xl text-xs font-bold"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-950"
                >
                  Compartir Recurso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: AGENDAR NUEVO EVENTO / CLASE EN VIVO EN EL CALENDARIO */}
      {showAddEventModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121215] border border-gray-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 relative">
            <button 
              onClick={() => setShowAddEventModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-2 text-purple-400">
              <Calendar size={20} />
              <h3 className="font-bold text-lg text-white">Agendar Clase / Evento en {activeCommunity.name}</h3>
            </div>

            <form onSubmit={handleAddCalendarEvent} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Título de la Sesión en Vivo</label>
                <input 
                  type="text"
                  required
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  placeholder="Ej: Sesión de Preguntas & Respuestas sobre Meta Ads"
                  className="w-full px-3.5 py-2.5 bg-[#18181c] border border-gray-700/80 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">Fecha</label>
                  <input 
                    type="date"
                    required
                    value={newEventDate}
                    onChange={(e) => setNewEventDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#18181c] border border-gray-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">Horario / Hora</label>
                  <input 
                    type="text"
                    required
                    value={newEventTime}
                    onChange={(e) => setNewEventTime(e.target.value)}
                    placeholder="Ej: 10:00 AM - 11:30 AM"
                    className="w-full px-3.5 py-2.5 bg-[#18181c] border border-gray-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">Etiqueta / Badge</label>
                  <select 
                    value={newEventBadge}
                    onChange={(e) => setNewEventBadge(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#18181c] border border-gray-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="CLASE EN VIVO">CLASE EN VIVO</option>
                    <option value="SOPORTE Y MENTORÍA">SOPORTE Y MENTORÍA</option>
                    <option value="MASTERCLASS COD">MASTERCLASS COD</option>
                    <option value="TRADING EN VIVO">TRADING EN VIVO</option>
                    <option value="NETWORKING">NETWORKING</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">Imagen de Portada (URL)</label>
                  <input 
                    type="text"
                    value={newEventImage}
                    onChange={(e) => setNewEventImage(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3.5 py-2.5 bg-[#18181c] border border-gray-700/80 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Enlace de Zoom / Google Meet</label>
                <input 
                  type="text"
                  value={newEventMeetingUrl}
                  onChange={(e) => setNewEventMeetingUrl(e.target.value)}
                  placeholder="https://zoom.us/j/... o https://meet.google.com/..."
                  className="w-full px-3.5 py-2.5 bg-[#18181c] border border-gray-700/80 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button 
                  type="button"
                  onClick={() => setShowAddEventModal(false)}
                  className="px-4 py-2 bg-[#18181c] hover:bg-[#202026] text-gray-300 rounded-xl text-xs font-bold"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-950 flex items-center gap-1.5"
                >
                  <Calendar size={14} /> Agendar Clase
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FULLSCREEN DISTRACTION-FREE FOCUS MODE (MODO LECTURA SIN DISTRACCIONES) */}
      {isFocusMode && selectedCourse && selectedLesson && (
        <div className="fixed inset-0 z-50 bg-[#08080a] text-white flex flex-col overflow-hidden">
          {/* Focus Mode Top Header */}
          <div className="bg-[#121216] border-b border-gray-800/80 px-6 py-3 flex items-center justify-between gap-4 shrink-0 shadow-lg">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsFocusMode(false)}
                className="px-3.5 py-1.5 bg-[#1c1c22] hover:bg-purple-950/80 text-purple-300 hover:text-white rounded-xl text-xs font-bold flex items-center gap-2 border border-purple-800/50 transition-colors"
              >
                <Minimize2 size={16} /> Salir del Modo Lectura
              </button>

              <div className="hidden sm:block border-l border-gray-800 pl-3">
                <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block">{selectedCourse.title}</span>
                <h3 className="font-bold text-white text-sm truncate max-w-md">{selectedLesson.title}</h3>
              </div>
            </div>

            {/* Progress indicator */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 bg-[#18181c] px-4 py-1.5 rounded-xl border border-gray-800">
                <span className="text-xs text-gray-300 font-medium">
                  Lecciones Completadas: <strong className="text-purple-400 font-bold">{completedCourseLessons} de {totalCourseLessons}</strong> ({courseProgressPct}%)
                </span>
                <div className="w-32 bg-gray-900 border border-gray-700 h-2 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-purple-500 to-indigo-500 h-full rounded-full transition-all duration-300" style={{ width: `${courseProgressPct}%` }}></div>
                </div>
              </div>

              <button
                onClick={() => toggleLessonComplete(selectedLesson.id)}
                className={`px-4 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                  completedLessons.includes(selectedLesson.id)
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-purple-600 hover:bg-purple-500 text-white shadow-md'
                }`}
              >
                <CheckCircle size={14} /> {completedLessons.includes(selectedLesson.id) ? 'Completado' : 'Marcar Completado'}
              </button>
            </div>
          </div>

          {/* Focus Mode Workspace Layout */}
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            {/* Video & Notes Workspace */}
            <div className="flex-1 p-6 overflow-y-auto space-y-6">
              <div className="max-w-4xl mx-auto space-y-6">
                {/* Cinema Video Box */}
                <div className="relative rounded-2xl overflow-hidden border border-purple-900/50 bg-black aspect-video shadow-2xl">
                  <video 
                    src={selectedLesson.videoUrl} 
                    controls 
                    autoPlay={false} 
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* Lesson Info Card */}
                <div className="bg-[#121215] border border-gray-800/80 rounded-2xl p-6 space-y-4 shadow-xl">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-800 pb-4">
                    <div>
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-purple-950 text-purple-300 border border-purple-800/50 uppercase">
                        {selectedLesson.difficulty} • {selectedLesson.category}
                      </span>
                      <h1 className="text-2xl font-bold text-white mt-2 leading-tight">{selectedLesson.title}</h1>
                    </div>

                    <div className="text-xs text-gray-400 bg-[#18181c] px-3.5 py-2 rounded-xl border border-gray-800">
                      Instructor: <strong className="text-purple-300">{selectedLesson.instructor}</strong>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-gray-200 mb-2">Resumen y Guía de Clase</h4>
                    <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">{selectedLesson.description}</p>
                  </div>

                  {selectedLesson.attachments && selectedLesson.attachments.length > 0 && (
                    <div className="border-t border-gray-800/80 pt-4 space-y-2">
                      <h4 className="font-bold text-xs text-purple-300 flex items-center gap-1.5">
                        <FileText size={15} /> Archivos Adjuntos para Descargar
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {selectedLesson.attachments.map(att => (
                          <a 
                            key={att.id}
                            href={att.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-3 bg-[#18181c] border border-gray-700/60 rounded-xl hover:border-purple-500 flex items-center justify-between text-xs text-white group"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <FileText size={15} className="text-purple-400 shrink-0" />
                              <span className="truncate group-hover:text-purple-300">{att.name}</span>
                            </div>
                            <Download size={14} className="text-gray-400 hover:text-white shrink-0" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Course Syllabus Accordion Sidebar */}
            <div className="w-full lg:w-80 bg-[#121216] border-t lg:border-t-0 lg:border-l border-gray-800 p-4 overflow-y-auto space-y-3 shrink-0">
              <h4 className="font-bold text-xs text-purple-400 uppercase tracking-wider mb-3 flex items-center justify-between">
                <span>Estructura del Curso</span>
                <span className="text-[10px] text-gray-400">{courseProgressPct}% Listo</span>
              </h4>

              {selectedCourse.modules.map(module => (
                <div key={module.id} className="bg-[#18181c] border border-gray-800 rounded-xl overflow-hidden">
                  <div className="p-3 font-bold text-xs text-white bg-[#1c1c22]">
                    {module.title}
                  </div>
                  <div className="divide-y divide-gray-800/50">
                    {module.lessons.map(lesson => {
                      const isCur = selectedLesson.id === lesson.id;
                      const isDone = completedLessons.includes(lesson.id);
                      return (
                        <button
                          key={lesson.id}
                          onClick={() => setSelectedLesson(lesson)}
                          className={`w-full p-3 text-left text-xs flex items-center gap-2.5 transition-colors ${
                            isCur ? 'bg-purple-950/70 text-white font-bold border-l-2 border-purple-500' : 'text-gray-400 hover:bg-[#202028] hover:text-gray-200'
                          }`}
                        >
                          <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] shrink-0 border ${
                            isDone ? 'bg-emerald-500 border-emerald-400 text-black font-bold' : 'border-gray-600 text-transparent'
                          }`}>
                            ✓
                          </span>
                          <span className="truncate flex-1">{lesson.title}</span>
                          <span className="text-[10px] text-gray-500 shrink-0">{lesson.duration}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

import React from 'react';

export type Language = 'es' | 'en';
export type Theme = 'dark' | 'light';

export const translations = {
  es: {
    dashboard: 'Dashboard',
    dashboardPrincipal: 'Dashboard Principal',
    module: 'Módulo',
    searchPlaceholder: 'Buscar herramienta o módulo...',
    welcomeTitle: '¡Hola! Soy tu Agente Expert 360° 🚀',
    welcomeDesc: 'Soy tu Mentor & Copiloto IA en la plataforma. Estoy listo para ayudarte a configurar tu Bot de WhatsApp, estructurar campañas de Ads, diseñar tu Landing Page o armar tu marca en automático. ¿Qué quieres lograr hoy en tu negocio?',
    startAIAssistant: 'Hablar con mi Mentor Agente 360°',
    setupProgress: 'Progreso del SETUP',
    waitingInstructions: 'Esperando instrucciones...',
    organigram: 'Organigrama & Flujo',
    metrics: 'Métricas de Negocio',
    settings: 'Ajustes',
    logout: 'Cerrar sesión',
    strategyAndAI: '🚀 Estrategia & IA',
    salesAndChannels: '💬 Ventas & Canales',
    marketingAndGrowth: '📈 Marketing & Crecimiento',
    operationsAndTeam: '📦 Operaciones & Equipo',
    notifications: 'Notificaciones',
    noNotifications: 'Sin notificaciones pendientes',
    notificationsTitle: 'Alertas del Sistema',
    language: 'Idioma',
    theme: 'Tema',
    lightMode: 'Modo Claro',
    darkMode: 'Modo Oscuro',
    spanish: 'Español',
    english: 'Inglés',
    sidebarToggle: 'Alternar menú lateral',
    // Notifications list
    notif1Title: 'WhatsApp Bot Conectado',
    notif1Body: 'La línea de WhatsApp API está lista para enviar respuestas automáticas.',
    notif2Title: 'Campaña Meta Ads Activa',
    notif2Body: 'Las métricas en tiempo real han sido actualizadas.',
    // Module labels
    branding: 'Branding e Identidad',
    mercado: 'Estudio de Mercado',
    contenido: 'Generador de Contenido',
    landing: 'Landing Pages',
    ads: 'Ads & Traficker',
    whatsapp: 'WhatsApp Bot',
    automatizaciones: 'Automatizaciones',
    integraciones: 'Integraciones',
    comunidad: 'Referidos',
    entrenamiento: 'Academia & Cursos',
    proveedores: 'Proveedores COD',
    llamadas: 'Llamadas IA',
    email: 'Email Marketing',
    usuarios: 'Usuarios y Roles',
    recargas: 'Recargas de Créditos',
    referidos: 'Sistema de Referidos (20%)',
    dominio: 'Dominio Personalizado',
    live_selling: 'Live Selling',
    proyectos: 'Proyectos',
    mcp_api: 'MCP y API',
    configuracion: 'Configuración',
    configuracionGeneral: 'Configuración General',
  },
  en: {
    dashboard: 'Dashboard',
    dashboardPrincipal: 'Main Dashboard',
    module: 'Module',
    searchPlaceholder: 'Search tool or module...',
    welcomeTitle: 'Welcome to Expert 360°!',
    welcomeDesc: 'Your all-in-one AI-powered business platform. Use interactive chat to research niches, brainstorm products, design branding, or launch Facebook Ads directly.',
    startAIAssistant: 'Start with AI Assistant',
    setupProgress: 'SETUP Progress',
    waitingInstructions: 'Waiting for instructions...',
    organigram: 'Org Chart & Flow',
    metrics: 'Business Metrics',
    settings: 'Settings',
    logout: 'Log out',
    strategyAndAI: '🚀 Strategy & AI',
    salesAndChannels: '💬 Sales & Channels',
    marketingAndGrowth: '📈 Marketing & Growth',
    operationsAndTeam: '📦 Operations & Team',
    notifications: 'Notifications',
    noNotifications: 'No pending notifications',
    notificationsTitle: 'System Notifications',
    language: 'Language',
    theme: 'Theme',
    lightMode: 'Light Mode',
    darkMode: 'Dark Mode',
    spanish: 'Spanish',
    english: 'English',
    sidebarToggle: 'Toggle sidebar menu',
    // Notifications list
    notif1Title: 'WhatsApp Bot Connected',
    notif1Body: 'WhatsApp API line is connected and ready for auto-replies.',
    notif2Title: 'Meta Ads Campaign Active',
    notif2Body: 'Real-time performance metrics updated.',
    // Module labels
    branding: 'Branding & Identity',
    mercado: 'Market Research',
    contenido: 'Content Generator',
    landing: 'Landing Pages',
    ads: 'Ads & Trafficker',
    whatsapp: 'WhatsApp Bot',
    automatizaciones: 'Automations',
    integraciones: 'Integrations',
    comunidad: 'Referrals',
    entrenamiento: 'Academy & Courses',
    proveedores: 'COD Suppliers',
    llamadas: 'AI Calls',
    email: 'Email Marketing',
    usuarios: 'Users & Roles',
    recargas: 'Credit Recharges',
    dominio: 'Custom Domain',
    live_selling: 'Live Selling',
    proyectos: 'Projects',
    mcp_api: 'MCP & API',
    configuracion: 'Settings',
    configuracionGeneral: 'General Settings',
  }
};

export function FlagES({ className = "w-5 h-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 640 480" className={`rounded-[2px] object-cover ${className}`}>
      <path fill="#c60b1e" d="M0 0h640v480H0z"/>
      <path fill="#ffc400" d="M0 120h640v240H0z"/>
    </svg>
  );
}

export function FlagUK({ className = "w-5 h-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 640 480" className={`rounded-[2px] object-cover ${className}`}>
      <path fill="#012169" d="M0 0h640v480H0z"/>
      <path fill="#fff" d="m75 0 245 180L565 0h75v55L395 240l245 185v55h-75L320 300 75 480H0v-55l245-185L0 55V0h75z"/>
      <path fill="#C8102E" d="m424 281 216 163v36h-48L376 317l48-36zM216 199 0 36v-36h48l216 163-48 36zM0 444l216-163 48 36L48 480H0v-36zm640-408L424 199l-48-36L592 0h48v36z"/>
      <path fill="#fff" d="M240 0h160v480H240zM0 160h640v160H0z"/>
      <path fill="#C8102E" d="M267 0h106v480H267zM0 187h640v106H0z"/>
    </svg>
  );
}

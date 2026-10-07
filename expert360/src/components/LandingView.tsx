import React, { useState } from 'react';
import { Layout, Wand2, Eye, Code, Smartphone, Monitor, Download, Edit3, Trash2, Check, ArrowRight, Loader2, Sparkles, Globe, CreditCard, ShoppingBag, ShieldCheck, CheckCircle2, Copy, ExternalLink, Settings2 } from 'lucide-react';

interface LandingPage {
  id: string;
  name: string;
  niche: string;
  style: string;
  title: string;
  subtitle: string;
  price: string;
  benefit1: string;
  benefit2: string;
  benefit3: string;
  ctaText: string;
  imageUrl: string;
  customDomain?: string;
  domainStatus?: 'active' | 'pending' | 'unverified';
  checkoutType?: 'cod' | 'mercadopago' | 'whatsapp' | 'hybrid';
  whatsappNumber?: string;
  orderBumpTitle?: string;
  orderBumpPrice?: string;
  orderBumpEnabled?: boolean;
  fieldsConfig?: {
    requireName: boolean;
    requirePhone: boolean;
    requireCity: boolean;
    requireAddress: boolean;
    requireDni: boolean;
  };
}

import RastreadorVisitas from './RastreadorVisitas';

interface LandingViewProps { activeTab?: 'plantillas' | 'rastreador' }

export default function LandingView({ activeTab = 'plantillas' }: LandingViewProps) {
  const [internalTab, setInternalTab] = useState<'generar' | 'checkout' | 'dominio' | 'lista'>('generar');
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [copied, setCopied] = useState(false);
  const [domainSaveToast, setDomainSaveToast] = useState(false);

  // Landing form states
  const [formData, setFormData] = useState({
    name: 'Smartwatch Ultra X9',
    niche: 'Tecnología / Salud',
    style: 'dark',
    title: 'El Reloj Inteligente del Futuro, Hoy en Tu Muñeca',
    subtitle: 'Monitorea tu salud en tiempo real, recibe notificaciones, y lleva tu rendimiento físico al siguiente nivel con batería de 10 días.',
    price: '$129.900 COP',
    benefit1: '🩺 Medición de ritmo cardíaco y oxígeno las 24 horas',
    benefit2: '🔋 Batería de ultra duración de hasta 10 días continuos',
    benefit3: '📱 Compatible con Android y iPhone (Llamadas vía Bluetooth)',
    ctaText: 'Ordenar con Envío Gratis y Pago Contra Entrega',
    imageUrl: 'https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?auto=format&fit=crop&q=80&w=800',
    customDomain: 'oferta.smartwatchx9.com',
    domainStatus: 'active' as 'active' | 'pending' | 'unverified',
    checkoutType: 'cod' as 'cod' | 'mercadopago' | 'whatsapp' | 'hybrid',
    whatsappNumber: '573001234567',
    orderBumpTitle: '🛡️ GARANTÍA EXTENDIDA DE 1 AÑO CONTRA TODO RIESGO',
    orderBumpPrice: '+$15.000 COP',
    orderBumpEnabled: true,
    fieldsConfig: {
      requireName: true,
      requirePhone: true,
      requireCity: true,
      requireAddress: true,
      requireDni: false,
    }
  });

  const [generatedPages, setGeneratedPages] = useState<LandingPage[]>([
    {
      id: 'lp-1',
      name: 'Smartwatch Ultra X9',
      niche: 'Tecnología / Salud',
      style: 'dark',
      title: 'El Reloj Inteligente del Futuro, Hoy en Tu Muñeca',
      subtitle: 'Monitorea tu salud en tiempo real, recibe notificaciones, y lleva tu rendimiento físico al siguiente nivel con batería de 10 días.',
      price: '$129.900 COP',
      benefit1: '🩺 Medición de ritmo cardíaco y oxígeno las 24 horas',
      benefit2: '🔋 Batería de ultra duración de hasta 10 días continuos',
      benefit3: '📱 Compatible con Android y iPhone (Llamadas vía Bluetooth)',
      ctaText: 'Ordenar con Envío Gratis y Pago Contra Entrega',
      imageUrl: 'https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?auto=format&fit=crop&q=80&w=800',
      customDomain: 'oferta.smartwatchx9.com',
      domainStatus: 'active',
      checkoutType: 'cod',
      whatsappNumber: '573001234567',
      orderBumpTitle: '🛡️ GARANTÍA EXTENDIDA DE 1 AÑO CONTRA TODO RIESGO',
      orderBumpPrice: '+$15.000 COP',
      orderBumpEnabled: true,
      fieldsConfig: {
        requireName: true,
        requirePhone: true,
        requireCity: true,
        requireAddress: true,
        requireDni: false,
      }
    }
  ]);

  const [activePage, setActivePage] = useState<LandingPage | null>(generatedPages[0]);

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);

    setTimeout(() => {
      const newPage: LandingPage = {
        id: 'lp-' + Date.now(),
        name: formData.name,
        niche: formData.niche,
        style: formData.style,
        title: formData.title,
        subtitle: formData.subtitle,
        price: formData.price,
        benefit1: formData.benefit1,
        benefit2: formData.benefit2,
        benefit3: formData.benefit3,
        ctaText: formData.ctaText,
        imageUrl: formData.imageUrl,
        customDomain: formData.customDomain,
        domainStatus: formData.domainStatus,
        checkoutType: formData.checkoutType,
        whatsappNumber: formData.whatsappNumber,
        orderBumpTitle: formData.orderBumpTitle,
        orderBumpPrice: formData.orderBumpPrice,
        orderBumpEnabled: formData.orderBumpEnabled,
        fieldsConfig: formData.fieldsConfig
      };
      setGeneratedPages([newPage, ...generatedPages]);
      setActivePage(newPage);
      setIsGenerating(false);
      setInternalTab('generar');
    }, 2500);
  };

  const handleUpdateActivePage = () => {
    if (!activePage) return;
    const updated: LandingPage = {
      ...activePage,
      ...formData
    };
    setActivePage(updated);
    setGeneratedPages(generatedPages.map(p => p.id === updated.id ? updated : p));
    setDomainSaveToast(true);
    setTimeout(() => setDomainSaveToast(false), 3000);
  };

  const generateHtml = (page: LandingPage) => {
    const isDark = page.style === 'dark';
    const bgClass = isDark ? '#09090b' : '#ffffff';
    const textClass = isDark ? '#f4f4f5' : '#18181b';
    const cardBg = isDark ? '#18181b' : '#f4f4f5';
    const borderClass = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
    const goldColor = '#D4AF37';

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${page.name} - Oferta Especial Contra Entrega</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    body {
      background-color: ${bgClass};
      color: ${textClass};
      font-family: 'Plus Jakarta Sans', sans-serif;
    }
  </style>
</head>
<body class="min-h-screen">

  <!-- Announcement Bar (Urgency Header) -->
  <div class="bg-gradient-to-r from-blue-700 via-blue-600 to-blue-600 text-white text-center py-2 px-4 text-xs font-black tracking-wide flex items-center justify-center gap-2 shadow-md">
    <span>🔥 OFERTA DE LANZAMIENTO: Paga al recibir en tu puerta + Envío Gratis Hoy</span>
    <span class="bg-black/30 px-2 py-0.5 rounded font-mono text-[11px]" id="timer-header">14:59</span>
  </div>

  <!-- Hero Section -->
  <header class="py-12 md:py-16 px-4 max-w-5xl mx-auto text-center">
    <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-extrabold uppercase tracking-wider mb-6">
      ✨ 100% Pago Contra Entrega • Sin Tarjetas de Crédito
    </div>
    <h1 class="text-3xl md:text-5xl font-black tracking-tight mb-4 leading-tight text-white">${page.title}</h1>
    <p class="text-base md:text-lg text-gray-300 max-w-2xl mx-auto mb-8 leading-relaxed">${page.subtitle}</p>

    <div class="flex justify-center gap-4 flex-wrap">
      <button onclick="openRivoCheckout()" class="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 transition-all text-black font-black rounded-2xl text-lg shadow-xl shadow-emerald-950 flex items-center gap-3">
        🛒 ${page.ctaText}
      </button>
    </div>
  </header>

  <!-- Product Gallery & Conversion Benefits -->
  <main class="py-8 md:py-12 px-4 max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
    <div class="relative group">
      <div class="absolute -inset-1 bg-gradient-to-r from-blue-600 to-blue-600 rounded-3xl blur opacity-30 group-hover:opacity-60 transition duration-500"></div>
      <img src="${page.imageUrl}" alt="${page.name}" class="relative rounded-2xl shadow-2xl border border-[${borderClass}] w-full object-cover aspect-square" />
      <div class="absolute top-4 right-4 bg-rose-600 text-white text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-md">
        -40% OFF
      </div>
    </div>

    <div class="space-y-5">
      <div class="border-b border-gray-800 pb-3">
        <h2 class="text-2xl font-black text-white">${page.name}</h2>
        <p class="text-xs text-blue-400 font-bold uppercase tracking-widest mt-1">${page.niche}</p>
      </div>

      <ul class="space-y-3">
        <li class="flex items-start gap-3 p-3.5 rounded-2xl bg-[${cardBg}] border border-[${borderClass}]">
          <span class="text-emerald-400 font-bold text-lg">✓</span>
          <p class="font-bold text-white text-sm">${page.benefit1}</p>
        </li>
        <li class="flex items-start gap-3 p-3.5 rounded-2xl bg-[${cardBg}] border border-[${borderClass}]">
          <span class="text-emerald-400 font-bold text-lg">✓</span>
          <p class="font-bold text-white text-sm">${page.benefit2}</p>
        </li>
        <li class="flex items-start gap-3 p-3.5 rounded-2xl bg-[${cardBg}] border border-[${borderClass}]">
          <span class="text-emerald-400 font-bold text-lg">✓</span>
          <p class="font-bold text-white text-sm">${page.benefit3}</p>
        </li>
      </ul>

      {/* Price & Express Order CTA */}
      <div class="p-5 rounded-2xl bg-gradient-to-r from-[#18181c] to-[#121215] border border-gray-700 space-y-3">
        <div class="flex items-center justify-between">
          <div>
            <span class="text-[10px] text-gray-400 uppercase font-black tracking-wider">Precio Especial Hoy</span>
            <p class="text-3xl font-black text-emerald-400">${page.price}</p>
            <span class="text-xs text-gray-500 line-through">Antes $199.900 COP</span>
          </div>
          <span class="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-black px-3 py-1.5 rounded-xl uppercase">
            Envío Gratis
          </span>
        </div>

        <button onclick="openRivoCheckout()" class="w-full py-4 bg-emerald-500 hover:bg-emerald-400 transition text-black font-black rounded-xl text-base shadow-lg shadow-emerald-950 flex items-center justify-center gap-2">
          ⚡ Pedir Ahora y Pagar en Casa
        </button>
      </div>
    </div>
  </main>

  <!-- SHOPIFY / RIVO STYLE EXPRESS CHECKOUT MODAL (COD) -->
  <div id="checkout-modal" class="fixed inset-0 z-50 bg-black/80 backdrop-blur-md hidden items-center justify-center p-4">
    <div class="bg-[#121215] border border-blue-800/40 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative space-y-4 text-white max-h-[90vh] overflow-y-auto">

      <button onclick="closeRivoCheckout()" class="absolute top-4 right-4 text-gray-400 hover:text-white font-black text-xl">✕</button>

      <div className="border-b border-gray-800 pb-3">
        <div class="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
          🔒 Express Checkout Rivo Style (Contra Entrega)
        </div>
        <h3 class="text-xl font-black text-white mt-1">Completa tu Dirección de Envío</h3>
        <p class="text-xs text-gray-400">Pagas en efectivo únicamente cuando el paquete llegue a tu casa.</p>
      </div>

      <!-- Order Summary Card -->
      <div class="bg-[#18181c] p-3.5 rounded-2xl border border-gray-800 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <img src="${page.imageUrl}" class="w-12 h-12 rounded-xl object-cover border border-gray-700" />
          <div>
            <h4 class="font-bold text-white text-xs">${page.name}</h4>
            <span class="text-[10px] text-emerald-400 font-bold">1x Cantidad • Envío Gratis</span>
          </div>
        </div>
        <span class="font-black text-sm text-white">${page.price}</span>
      </div>

      <!-- COD Form -->
      <form onsubmit="submitRivoOrder(event)" class="space-y-3">
        <div>
          <label class="block text-[11px] font-bold text-gray-300 mb-1">Nombre Completo *</label>
          <input id="cod-name" type="text" required placeholder="Ej: Juan Carlos Pérez" class="w-full bg-[#18181c] border border-gray-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500" />
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-[11px] font-bold text-gray-300 mb-1">Teléfono / WhatsApp *</label>
            <input id="cod-phone" type="tel" required placeholder="Ej: 300 123 4567" class="w-full bg-[#18181c] border border-gray-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500" />
          </div>
          <div>
            <label class="block text-[11px] font-bold text-gray-300 mb-1">Departamento / Ciudad *</label>
            <input id="cod-city" type="text" required placeholder="Ej: Medellín, Antioquia" class="w-full bg-[#18181c] border border-gray-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500" />
          </div>
        </div>

        <div>
          <label class="block text-[11px] font-bold text-gray-300 mb-1">Dirección Exacta de Residencia *</label>
          <input id="cod-address" type="text" required placeholder="Ej: Calle 10 # 45-20, Apt 301, Barrio El Poblado" class="w-full bg-[#18181c] border border-gray-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500" />
        </div>

        <!-- Order Bump Up-Sell -->
        <div class="p-3.5 bg-amber-950/30 border border-amber-500/40 rounded-2xl space-y-1.5">
          <label class="flex items-start gap-2.5 cursor-pointer">
            <input type="checkbox" id="cod-bump" class="mt-0.5 accent-amber-500 w-4 h-4" />
            <div>
              <span class="font-black text-amber-300 text-xs block">🛡️ AÑADIR GARANTÍA EXTENDIDA DE 1 AÑO (+$15.000 COP)</span>
              <p class="text-[10px] text-gray-300">Protección completa contra fallas, roturas o cambios directos sin costo de flete.</p>
            </div>
          </label>
        </div>

        <button type="submit" class="w-full py-4 bg-emerald-500 hover:bg-emerald-400 transition text-black font-black rounded-2xl text-sm shadow-xl shadow-emerald-950 flex items-center justify-center gap-2">
          ✅ CONFIRMAR Y ENVIAR MI PEDIDO
        </button>
      </form>

      <div class="text-center pt-1 border-t border-gray-800">
        <span class="text-[10px] text-gray-400 font-medium">🛡️ Envío asegurado por Servientrega, Coordinadora, Interrapidísimo & Envía</span>
      </div>
    </div>
  </div>

  <script>
    function openRivoCheckout() {
      document.getElementById('checkout-modal').style.display = 'flex';
    }
    function closeRivoCheckout() {
      document.getElementById('checkout-modal').style.display = 'none';
    }
    function submitRivoOrder(e) {
      e.preventDefault();
      const name = document.getElementById('cod-name').value;
      const phone = document.getElementById('cod-phone').value;
      const city = document.getElementById('cod-city').value;
      const address = document.getElementById('cod-address').value;
      const bump = document.getElementById('cod-bump').checked;

      const bumpText = bump ? '%0A🛡️ *Garantía Extendida Añadida* (+15.000 COP)' : '';
      const text = \`¡Hola! Quiero confirmar mi pedido Contra Entrega de *${page.name}* (${page.price}):%0A%0A👤 *Nombre:* \${name}%0A📱 *Teléfono:* \${phone}%0A🏙️ *Ciudad:* \${city}%0A🏠 *Dirección:* \${address}\${bumpText}%0A%0A¡Espero la guía de envío!\`;

      window.open('https://api.whatsapp.com/send?phone=573001234567&text=' + text, '_blank');
      closeRivoCheckout();
    }

    // Urgency Timer Script
    let seconds = 899;
    setInterval(() => {
      if (seconds > 0) seconds--;
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      const timerStr = (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
      const el = document.getElementById('timer-header');
      if (el) el.innerText = timerStr;
    }, 1000);
  </script>

  <footer class="py-8 text-center text-xs text-gray-500 border-t border-gray-800/80 mt-12">
    &copy; 2026 ${page.name}. Tienda Oficial con Pago Contra Entrega.
  </footer>
</body>
</html>`;
  };

  const handleCopyCode = () => {
    if (!activePage) return;
    const code = generateHtml(activePage);
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!activePage) return;
    const html = generateHtml(activePage);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activePage.name.toLowerCase().replace(/\s+/g, '-')}-landing.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (activeTab === "rastreador") return <RastreadorVisitas />;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between border-b border-gray-800 pb-4 flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center text-gold shrink-0">
            <Layout size={20} />
          </div>
          <div>
            <h2 className="text-xl font-display text-white">Generador de Landing Pages IA</h2>
            <p className="text-xs text-gray-500">Crea embudos de venta hiper-optimizados para dropshipping</p>
          </div>
        </div>

        <div className="flex bg-[#111] p-1 rounded-xl border border-gray-800 shrink-0 gap-1 overflow-x-auto">
          <button
            onClick={() => setInternalTab('generar')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              internalTab === 'generar' ? 'bg-gold text-black shadow font-bold' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Edit3 size={13} />
            <span>Creador & Copy</span>
          </button>

          <button
            onClick={() => setInternalTab('checkout')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              internalTab === 'checkout' ? 'bg-emerald-500 text-black shadow font-bold' : 'text-emerald-400 hover:text-white hover:bg-emerald-950/30'
            }`}
          >
            <CreditCard size={13} />
            <span>Formulario Checkout</span>
          </button>

          <button
            onClick={() => setInternalTab('dominio')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              internalTab === 'dominio' ? 'bg-blue-500 text-white shadow font-bold' : 'text-blue-400 hover:text-white hover:bg-blue-950/30'
            }`}
          >
            <Globe size={13} />
            <span>Dominio Landing</span>
          </button>

          <button
            onClick={() => setInternalTab('lista')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              internalTab === 'lista' ? 'bg-gold text-black shadow font-bold' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <ShoppingBag size={13} />
            <span>Mis Páginas ({generatedPages.length})</span>
          </button>
        </div>
      </div>

      {/* DOMINIO PERSONALIZADO DE LA LANDING VIEW */}
      {internalTab === 'dominio' && activePage && (
        <div className="panel p-6 sm:p-8 rounded-2xl border border-blue-500/30 bg-gradient-to-br from-gray-900 via-gray-900/90 to-blue-950/30 space-y-6">
          <div className="flex items-center justify-between border-b border-gray-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-500/20 text-blue-400 rounded-xl border border-blue-500/30">
                <Globe size={22} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Dominio Personalizado de tu Landing Page</h3>
                <p className="text-xs text-gray-400">Conecta tu propio dominio o subdominio registrado para publicar esta Landing directamente.</p>
              </div>
            </div>
            {domainSaveToast && (
              <span className="text-xs text-emerald-400 font-bold bg-emerald-500/20 px-3 py-1.5 rounded-lg border border-emerald-500/30 flex items-center gap-1">
                <CheckCircle2 size={14} /> Dominio Guardado Correctamente
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
                  Dominio o Subdominio de la Landing
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.customDomain}
                    onChange={(e) => setFormData({ ...formData, customDomain: e.target.value })}
                    placeholder="ej: oferta.mitienda.com o www.calzadovip.com"
                    className="flex-1 bg-black/80 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 font-mono"
                  />
                  <button
                    onClick={handleUpdateActivePage}
                    className="px-5 py-2.5 bg-blue-500 hover:bg-blue-400 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-blue-500/20 flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <Check size={16} /> Guardar Dominio
                  </button>
                </div>
                <p className="text-[11px] text-gray-400 mt-2">
                  Puedes usar cualquier dominio propio o subdominio ilimitado creado desde tu proveedor de DNS (Cloudflare, GoDaddy, Namecheap).
                </p>
              </div>

              <div className="p-4 rounded-xl bg-gray-950 border border-gray-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400 font-bold uppercase">Estado de la Conexión DNS:</span>
                  <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-full text-xs font-black flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Dominio Activo & SSL Conectado
                  </span>
                </div>
                <div className="text-xs space-y-1 font-mono text-gray-300 bg-black p-3 rounded-lg border border-gray-900">
                  <p><span className="text-gray-500">URL Publicada:</span> https://{formData.customDomain || 'subdominio.tudominio.com'}</p>
                  <p><span className="text-gray-500">Certificado SSL:</span> <span className="text-emerald-400">Válido (256-bit HTTPS Auto-renew)</span></p>
                </div>
              </div>
            </div>

            {/* CNAME DNS Setup Instructions */}
            <div className="p-5 rounded-2xl bg-black/60 border border-gray-800 space-y-3 text-xs">
              <h4 className="font-bold text-white flex items-center gap-2">
                <Settings2 size={16} className="text-blue-400" /> Registros DNS Necesarios en tu Dominio
              </h4>
              <p className="text-gray-400">Agrega el siguiente registro CNAME o Registro A en el panel DNS de tu proveedor:</p>

              <div className="space-y-2 font-mono">
                <div className="p-3 bg-gray-900 rounded-xl border border-gray-800 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] text-blue-400 font-bold block uppercase">Registro CNAME (Recomendado)</span>
                    <span className="text-gray-200">Host: <strong className="text-white">subdominio</strong> → Valor: <strong className="text-emerald-400">crm.xorbit360.com</strong></span>
                  </div>
                  <button
                    onClick={() => navigator.clipboard.writeText('crm.xorbit360.com')}
                    className="p-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-[10px] flex items-center gap-1"
                  >
                    <Copy size={12} /> Copiar
                  </button>
                </div>

                <div className="p-3 bg-gray-900 rounded-xl border border-gray-800 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] text-blue-400 font-bold block uppercase">Registro A (Para Dominio Raíz @)</span>
                    <span className="text-gray-200">Host: <strong className="text-white">@</strong> → IP: <strong className="text-emerald-400">34.120.88.10</strong></span>
                  </div>
                  <button
                    onClick={() => navigator.clipboard.writeText('34.120.88.10')}
                    className="p-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-[10px] flex items-center gap-1"
                  >
                    <Copy size={12} /> Copiar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIGURADOR DE FORMULARIO DE CHECKOUT */}
      {internalTab === 'checkout' && activePage && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 space-y-6">
            <div className="panel p-6 rounded-2xl border border-emerald-500/30 space-y-5 bg-gradient-to-b from-gray-900 via-gray-900 to-emerald-950/20">
              <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                <h3 className="text-sm font-black text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                  <CreditCard size={16} /> Personalizar Formulario Checkout COD
                </h3>
                {domainSaveToast && (
                  <span className="text-[10px] text-emerald-400 font-bold">¡Guardado!</span>
                )}
              </div>

              {/* Payment Type Selection */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-300">Método de Pago Principal</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, checkoutType: 'cod' })}
                    className={`p-3 rounded-xl border text-left text-xs font-bold transition-all ${
                      formData.checkoutType === 'cod' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300' : 'bg-black border-gray-800 text-gray-400'
                    }`}
                  >
                    📦 Pago Contra Entrega (COD)
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, checkoutType: 'mercadopago' })}
                    className={`p-3 rounded-xl border text-left text-xs font-bold transition-all ${
                      formData.checkoutType === 'mercadopago' ? 'bg-blue-500/20 border-blue-500 text-blue-300' : 'bg-black border-gray-800 text-gray-400'
                    }`}
                  >
                    💳 Pasarela Digital (MercadoPago/Bold)
                  </button>
                </div>
              </div>

              {/* Form Fields Toggle */}
              <div className="space-y-3 pt-2">
                <span className="block text-xs font-bold text-gray-300 uppercase tracking-wider">
                  Campos del Formulario de Envíos
                </span>

                <div className="space-y-2 bg-black/60 p-3.5 rounded-xl border border-gray-800">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-xs text-gray-300 font-semibold">Nombre y Apellido Completo</span>
                    <input
                      type="checkbox"
                      checked={formData.fieldsConfig.requireName}
                      onChange={(e) => setFormData({
                        ...formData,
                        fieldsConfig: { ...formData.fieldsConfig, requireName: e.target.checked }
                      })}
                      className="accent-emerald-500 w-4 h-4"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer border-t border-gray-800 pt-2">
                    <span className="text-xs text-gray-300 font-semibold">Teléfono / WhatsApp</span>
                    <input
                      type="checkbox"
                      checked={formData.fieldsConfig.requirePhone}
                      onChange={(e) => setFormData({
                        ...formData,
                        fieldsConfig: { ...formData.fieldsConfig, requirePhone: e.target.checked }
                      })}
                      className="accent-emerald-500 w-4 h-4"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer border-t border-gray-800 pt-2">
                    <span className="text-xs text-gray-300 font-semibold">Departamento y Ciudad</span>
                    <input
                      type="checkbox"
                      checked={formData.fieldsConfig.requireCity}
                      onChange={(e) => setFormData({
                        ...formData,
                        fieldsConfig: { ...formData.fieldsConfig, requireCity: e.target.checked }
                      })}
                      className="accent-emerald-500 w-4 h-4"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer border-t border-gray-800 pt-2">
                    <span className="text-xs text-gray-300 font-semibold">Dirección Exacta con Barrio / Apto</span>
                    <input
                      type="checkbox"
                      checked={formData.fieldsConfig.requireAddress}
                      onChange={(e) => setFormData({
                        ...formData,
                        fieldsConfig: { ...formData.fieldsConfig, requireAddress: e.target.checked }
                      })}
                      className="accent-emerald-500 w-4 h-4"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer border-t border-gray-800 pt-2">
                    <span className="text-xs text-gray-300 font-semibold">Cédula / DNI (Para Guias de Envío)</span>
                    <input
                      type="checkbox"
                      checked={formData.fieldsConfig.requireDni}
                      onChange={(e) => setFormData({
                        ...formData,
                        fieldsConfig: { ...formData.fieldsConfig, requireDni: e.target.checked }
                      })}
                      className="accent-emerald-500 w-4 h-4"
                    />
                  </label>
                </div>
              </div>

              {/* Order Bump Settings */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                    <ShieldCheck size={14} /> Order Bump (Venta Cruzada)
                  </span>
                  <input
                    type="checkbox"
                    checked={formData.orderBumpEnabled}
                    onChange={(e) => setFormData({ ...formData, orderBumpEnabled: e.target.checked })}
                    className="accent-amber-500 w-4 h-4"
                  />
                </div>

                {formData.orderBumpEnabled && (
                  <div className="space-y-2 p-3 bg-amber-950/20 border border-amber-500/30 rounded-xl">
                    <div>
                      <label className="block text-[11px] text-gray-400 font-medium mb-1">Título de la Oferta Extra</label>
                      <input
                        type="text"
                        value={formData.orderBumpTitle}
                        onChange={(e) => setFormData({ ...formData, orderBumpTitle: e.target.value })}
                        className="w-full bg-black border border-gray-800 rounded-lg px-3 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-400 font-medium mb-1">Precio Adicional</label>
                      <input
                        type="text"
                        value={formData.orderBumpPrice}
                        onChange={(e) => setFormData({ ...formData, orderBumpPrice: e.target.value })}
                        className="w-full bg-black border border-gray-800 rounded-lg px-3 py-1.5 text-xs text-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* WhatsApp Notification Number */}
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">WhatsApp para Recibir Notificación Instantánea de Pedidos</label>
                <input
                  type="text"
                  value={formData.whatsappNumber}
                  onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
                  placeholder="Ej: 573001234567"
                  className="w-full bg-black border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-white font-mono"
                />
              </div>

              <button
                onClick={handleUpdateActivePage}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs rounded-xl transition-all shadow-lg shadow-emerald-950 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Check size={16} /> Guardar Configuración de Checkout
              </button>
            </div>
          </div>

          {/* Live Preview of Landing with Checkout Modal */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between bg-[#111] p-3 rounded-2xl border border-gray-800">
              <span className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <Eye size={14} className="text-emerald-400" /> Vista Previa con Checkout Integrado
              </span>
              <div className="flex bg-black rounded-lg p-1 border border-gray-800 shrink-0">
                <button
                  onClick={() => setPreviewDevice('desktop')}
                  className={`p-1.5 rounded ${previewDevice === 'desktop' ? 'bg-gray-800 text-white' : 'text-gray-500'}`}
                >
                  <Monitor size={14} />
                </button>
                <button
                  onClick={() => setPreviewDevice('mobile')}
                  className={`p-1.5 rounded ${previewDevice === 'mobile' ? 'bg-gray-800 text-white' : 'text-gray-500'}`}
                >
                  <Smartphone size={14} />
                </button>
              </div>
            </div>

            <div className="flex justify-center bg-gray-950/80 rounded-3xl border border-gray-800 p-4 min-h-[550px] overflow-hidden relative">
              <div
                className={`transition-all duration-300 ${
                  previewDevice === 'mobile' ? 'w-[360px] max-w-full rounded-[40px] border-[12px] border-gray-900 shadow-2xl h-[650px]' : 'w-full h-[650px] rounded-xl'
                } bg-[#09090b] overflow-y-auto relative custom-scrollbar`}
              >
                <iframe
                  title="landing-checkout-preview"
                  srcDoc={generateHtml(activePage)}
                  className="w-full h-full border-none bg-white"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {internalTab === 'generar' && activePage ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Editor Form */}
          <div className="lg:col-span-5 space-y-6">
            <div className="panel p-6 rounded-2xl border border-gray-800 space-y-4">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Edit3 size={14} /> Redacción & Datos de Landing
              </h3>

              <form onSubmit={handleGenerate} className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-500 font-semibold mb-1">Nombre del Producto</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-[#161616] border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-gold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 font-semibold mb-1">Nicho</label>
                    <input
                      type="text"
                      value={formData.niche}
                      onChange={(e) => setFormData({ ...formData, niche: e.target.value })}
                      className="w-full bg-[#161616] border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-gold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 font-semibold mb-1">Precio de Oferta</label>
                    <input
                      type="text"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="w-full bg-[#161616] border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-gold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 font-semibold mb-1">Título Gancho (Copywriting)</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full bg-[#161616] border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-gold"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-500 font-semibold mb-1">Subtítulo Descriptivo</label>
                  <textarea
                    rows={3}
                    value={formData.subtitle}
                    onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                    className="w-full bg-[#161616] border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-gold resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs text-gray-500 font-semibold">Beneficios Clave</label>
                  <input
                    type="text"
                    value={formData.benefit1}
                    onChange={(e) => setFormData({ ...formData, benefit1: e.target.value })}
                    className="w-full bg-[#161616] border border-gray-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-gold"
                    placeholder="Beneficio 1"
                  />
                  <input
                    type="text"
                    value={formData.benefit2}
                    onChange={(e) => setFormData({ ...formData, benefit2: e.target.value })}
                    className="w-full bg-[#161616] border border-gray-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-gold"
                    placeholder="Beneficio 2"
                  />
                  <input
                    type="text"
                    value={formData.benefit3}
                    onChange={(e) => setFormData({ ...formData, benefit3: e.target.value })}
                    className="w-full bg-[#161616] border border-gray-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-gold"
                    placeholder="Beneficio 3"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-500 font-semibold mb-1">Texto del Botón (CTA)</label>
                  <input
                    type="text"
                    value={formData.ctaText}
                    onChange={(e) => setFormData({ ...formData, ctaText: e.target.value })}
                    className="w-full bg-[#161616] border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-gold"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-500 font-semibold mb-1">URL de Imagen del Producto</label>
                  <input
                    type="text"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    className="w-full bg-[#161616] border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-gold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs text-gray-500 font-semibold mb-1">Estilo Visual</label>
                    <select
                      value={formData.style}
                      onChange={(e) => setFormData({ ...formData, style: e.target.value })}
                      className="w-full bg-[#161616] border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-gold"
                    >
                      <option value="dark">Fondo Oscuro (Premium)</option>
                      <option value="light">Fondo Claro (Limpio)</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button
                      type="submit"
                      disabled={isGenerating}
                      className="w-full py-2.5 bg-gold text-black hover:bg-yellow-400 font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 size={16} className="animate-spin" /> Regenerando...
                        </>
                      ) : (
                        <>
                          <Sparkles size={16} /> Aplicar Cambios
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>

          {/* Live Preview Screen */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between bg-[#111] p-3 rounded-2xl border border-gray-800 flex-wrap gap-2">
              <div className="flex items-center gap-4">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Eye size={14} /> Vista Previa En Vivo
                </span>
                <div className="flex bg-black rounded-lg p-1 border border-gray-800 shrink-0">
                  <button
                    onClick={() => setPreviewDevice('desktop')}
                    className={`p-1.5 rounded ${previewDevice === 'desktop' ? 'bg-gray-800 text-white' : 'text-gray-500'}`}
                    title="Escritorio"
                  >
                    <Monitor size={14} />
                  </button>
                  <button
                    onClick={() => setPreviewDevice('mobile')}
                    className={`p-1.5 rounded ${previewDevice === 'mobile' ? 'bg-gray-800 text-white' : 'text-gray-500'}`}
                    title="Móvil"
                  >
                    <Smartphone size={14} />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyCode}
                  className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-white text-xs font-medium rounded-lg flex items-center gap-1 transition"
                >
                  {copied ? <Check size={12} className="text-green-400" /> : <Code size={12} />}
                  {copied ? '¡Copiado!' : 'Copiar Código'}
                </button>
                <button
                  onClick={handleDownload}
                  className="px-3 py-1.5 bg-gold text-black hover:bg-yellow-400 text-xs font-bold rounded-lg flex items-center gap-1 transition"
                >
                  <Download size={12} /> Descargar HTML
                </button>
              </div>
            </div>

            {/* Simulated Live Frame */}
            <div className="flex justify-center bg-gray-950/80 rounded-3xl border border-gray-800 p-4 min-h-[550px] overflow-hidden relative">
              <div
                className={`transition-all duration-300 ${
                  previewDevice === 'mobile' ? 'w-[360px] max-w-full rounded-[40px] border-[12px] border-gray-900 shadow-2xl h-[650px]' : 'w-full h-[650px] rounded-xl'
                } bg-[#09090b] overflow-y-auto relative custom-scrollbar`}
              >
                {/* Embedded HTML preview inside iframe or direct rendering */}
                <iframe
                  title="landing-preview"
                  srcDoc={generateHtml(activePage)}
                  className="w-full h-full border-none bg-white"
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Pages List */
        <div className="panel p-6 rounded-2xl border border-gray-800">
          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-white mb-4">Páginas de Aterrizaje Creadas</h3>
            {generatedPages.length === 0 ? (
              <p className="text-center text-gray-500 py-12">No has generado ninguna página de aterrizaje todavía.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {generatedPages.map((page) => (
                  <div key={page.id} className="p-4 bg-[#111] border border-gray-800 rounded-xl hover:border-gold/30 transition group flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] bg-gold/10 text-gold px-2 py-0.5 rounded border border-gold/20 uppercase font-semibold">{page.niche}</span>
                        <span className="text-xs text-gray-500 font-mono">ID: {page.id}</span>
                      </div>
                      <h4 className="font-bold text-white text-base group-hover:text-gold transition-colors">{page.name}</h4>
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2">{page.title}</p>
                    </div>
                    <div className="flex items-center justify-between border-t border-gray-800 mt-4 pt-3 flex-wrap gap-2">
                      <span className="text-xs font-semibold text-emerald-400">{page.price}</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setActivePage(page);
                            setFormData({
                              name: page.name,
                              niche: page.niche,
                              style: page.style,
                              title: page.title,
                              subtitle: page.subtitle,
                              price: page.price,
                              benefit1: page.benefit1,
                              benefit2: page.benefit2,
                              benefit3: page.benefit3,
                              ctaText: page.ctaText,
                              imageUrl: page.imageUrl
                            });
                            setInternalTab('generar');
                          }}
                          className="p-1.5 bg-gray-800 text-gray-300 hover:text-white rounded-lg hover:bg-gray-700 transition"
                          title="Editar"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => {
                            setGeneratedPages(generatedPages.filter(p => p.id !== page.id));
                            if (activePage?.id === page.id) setActivePage(null);
                          }}
                          className="p-1.5 bg-red-950/20 text-red-400 hover:bg-red-900/30 rounded-lg transition border border-red-900/20"
                          title="Eliminar"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

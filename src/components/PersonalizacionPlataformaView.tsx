import React, { useState, useEffect } from 'react';
import {
  Palette, Eye, EyeOff, Layout, Shield, Check, Sparkles, Globe,
  UploadCloud, Copy, ExternalLink, Bot, Phone, Mail, Image,
  Briefcase, TrendingUp, Monitor, Megaphone, Users, Package, RefreshCw, CreditCard
} from 'lucide-react';
import {
  WhiteLabelConfig, getCachedWhiteLabel, saveWhiteLabelConfig,
  getEffectiveDomain, getReferralLink
} from '../lib/whitelabel';

interface PersonalizacionPlataformaViewProps {
  currentUser?: { name: string; role: string; email: string; plan?: string } | null;
  hiddenItems: string[];
  onToggleVisibility: (id: string) => void;
  onCustomizationApplied?: (config: WhiteLabelConfig) => void;
}

const COLOR_PRESETS = [
  { name: 'Dorado Imperial (Predeterminado)', hex: '#d4af37', border: 'border-yellow-500/50' },
  { name: 'Esmeralda Neón', hex: '#10b981', border: 'border-emerald-500/50' },
  { name: 'Azul Zafiro', hex: '#3b82f6', border: 'border-blue-500/50' },
  { name: 'Púrpura Cyber', hex: '#a855f7', border: 'border-blue-500/50' },
  { name: 'Carmesí Intenso', hex: '#ef4444', border: 'border-red-500/50' },
  { name: 'Naranja Fuego', hex: '#f97316', border: 'border-orange-500/50' }
];

const AVAILABLE_TOOLS = [
  { id: 'whatsapp', name: 'Bot de WhatsApp & CRM Multicanal', icon: <Bot size={18} className="text-green-400" />, desc: 'Respuestas automáticas con IA y gestión de chats' },
  { id: 'llamadas', name: 'Llamadas de Voz IA', icon: <Phone size={18} className="text-blue-400" />, desc: 'Agentes telefónicos para cierres y confirmaciones' },
  { id: 'email', name: 'Email Marketing & Secuencias', icon: <Mail size={18} className="text-amber-400" />, desc: 'Campañas automatizadas y carritos abandonados' },
  { id: 'contenido', name: 'Creación & Contenido UGC', icon: <Sparkles size={18} className="text-blue-400" />, desc: 'Guiones virales, clones de video y copys' },
  { id: 'branding', name: 'Branding & Identidad de Marca', icon: <Briefcase size={18} className="text-yellow-400" />, desc: 'Manual de marca, logos y propuesta de valor' },
  { id: 'mercado', name: 'Estudio de Mercado & Ganadores', icon: <TrendingUp size={18} className="text-orange-400" />, desc: 'Análisis de nichos, competencia y precios' },
  { id: 'landing', name: 'Landing Pages & Editor Web', icon: <Monitor size={18} className="text-cyan-400" />, desc: 'Embudos de alta conversión y rastreador de visitas' },
  { id: 'ads', name: 'Gestión de Campañas Ads', icon: <Megaphone size={18} className="text-red-400" />, desc: 'Traffiker IA y métricas en Meta & TikTok Ads' },
  { id: 'comunidad', name: 'Comunidad & Mentor 360°', icon: <Users size={18} className="text-blue-400" />, desc: 'Chat con copiloto de negocios y red de miembros' },
  { id: 'proveedores', name: 'Catálogo de Proveedores COD', icon: <Package size={18} className="text-emerald-400" />, desc: 'Bodegas Dropi / MasterShop y productos en stock' },
  { id: 'recargas', name: 'Recargas y Saldo de Billetera', icon: <CreditCard size={18} className="text-amber-400" />, desc: 'Planes de saldo, pasarelas de pago y consumo de IA' }
];

export default function PersonalizacionPlataformaView({
  currentUser,
  hiddenItems,
  onToggleVisibility,
  onCustomizationApplied
}: PersonalizacionPlataformaViewProps) {
  const isAdmin = currentUser?.role === 'superadmin' || currentUser?.role === 'admin';
  const userEmail = currentUser?.email || 'usuario@xorbit360.com';

  const [config, setConfig] = useState<WhiteLabelConfig>(() => getCachedWhiteLabel(userEmail));
  const [scope, setScope] = useState<'global' | 'user'>(isAdmin ? 'global' : 'user');
  const [hideDashboard, setHideDashboard] = useState<boolean>(config.hideDashboard || false);
  const [defaultTool, setDefaultTool] = useState<string>(config.defaultTool || 'whatsapp');
  const [customDomain, setCustomDomain] = useState<string>(config.customDomain || '');
  const [brandName, setBrandName] = useState<string>(config.brandName || 'Xorbit 360');
  const [tagline, setTagline] = useState<string>(config.tagline || 'Marketing & Ventas AI');
  const [logoUrl, setLogoUrl] = useState<string>(config.logoUrl || '');
  const [primaryColor, setPrimaryColor] = useState<string>(config.primaryColor || '#d4af37');

  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Sync state if cached whitelabel updates
  useEffect(() => {
    const cached = getCachedWhiteLabel(userEmail);
    setConfig(cached);
    setBrandName(cached.brandName || 'Xorbit 360');
    setTagline(cached.tagline || 'Marketing & Ventas AI');
    setLogoUrl(cached.logoUrl || '');
    setCustomDomain(cached.customDomain || '');
    setPrimaryColor(cached.primaryColor || '#d4af37');
    setHideDashboard(!!cached.hideDashboard);
    if (cached.defaultTool) setDefaultTool(cached.defaultTool);
  }, [userEmail]);

  const referralSlug = (currentUser?.name || 'afiliado').toLowerCase().replace(/\s+/g, '_');
  const effectiveBaseUrl = getEffectiveDomain({ ...config, customDomain });
  const liveReferralUrl = getReferralLink(referralSlug, { ...config, customDomain });

  const handleCopyLink = () => {
    navigator.clipboard.writeText(liveReferralUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setLogoUrl(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    const updatedConfig: WhiteLabelConfig = {
      ...config,
      brandName,
      tagline,
      logoUrl,
      customDomain,
      primaryColor,
      hideDashboard,
      defaultTool,
      hiddenMenus: hiddenItems,
      scope,
      userEmail
    };

    const isGlobal = isAdmin && scope === 'global';
    await saveWhiteLabelConfig(updatedConfig, userEmail, isGlobal);
    setConfig(updatedConfig);

    // Apply primary color to root CSS variable
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--color-gold', primaryColor);
      document.documentElement.style.setProperty('--primary-accent', primaryColor);
    }

    if (onCustomizationApplied) {
      onCustomizationApplied(updatedConfig);
    }

    setIsSaving(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3500);
  };

  return (
    <div className="space-y-6 w-full animate-fade-in pb-12">
      {/* Header Banner */}
      <div className="panel p-6 sm:p-8 rounded-2xl relative overflow-hidden border border-gray-800 bg-[#0a0a0a]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-gold/10 text-gold border border-gold/20 shadow-lg shadow-gold/5">
              <Palette size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold font-display text-white">Personalización de la Plataforma</h2>
                <span className="text-[10px] bg-gold/20 text-gold font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Marca Blanca
                </span>
              </div>
              <p className="text-gray-400 text-xs sm:text-sm mt-1">
                Personaliza la apariencia, visibilidad de herramientas, colores y dominio propio para tu estructura.
              </p>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gold hover:bg-gold-light text-black font-bold text-sm transition shadow-lg shadow-gold/20 cursor-pointer shrink-0 disabled:opacity-50"
          >
            {isSaving ? (
              <RefreshCw size={16} className="animate-spin" />
            ) : (
              <Check size={16} />
            )}
            {isSaving ? 'Guardando...' : 'Guardar y Aplicar Cambios'}
          </button>
        </div>

        {savedSuccess && (
          <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs flex items-center gap-2 animate-fade-in">
            <Check size={16} />
            <span>¡Personalización guardada exitosamente! Los cambios ya están activos en tu vista y estructura de usuarios.</span>
          </div>
        )}
      </div>

      {/* Scope Alert: Admin vs Normal User */}
      <div className={`p-4 rounded-2xl border text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
        isAdmin
          ? 'bg-blue-950/20 border-blue-800/40 text-blue-200'
          : 'bg-blue-950/20 border-blue-800/40 text-blue-200'
      }`}>
        <div className="flex items-start gap-2.5">
          <Shield className="w-5 h-5 shrink-0 mt-0.5 text-gold" />
          <div>
            <span className="font-bold block text-sm">
              {isAdmin ? 'Modo Administrador: Control de Ámbito' : 'Marca Blanca de Usuario (Hacia abajo)'}
            </span>
            <span className="text-gray-400">
              {isAdmin
                ? 'Como Administrador, puedes aplicar estos ajustes a nivel Global (afectando a todos los usuarios y revendedores sin marca propia) o guardarlos únicamente para tu propia cuenta.'
                : 'Esta personalización se aplicará exclusivamente a tu cuenta y a todos los clientes o afiliados que se registren a través de tu dominio y enlace de referidos.'}
            </span>
          </div>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-1 bg-black/60 p-1 rounded-xl border border-gray-800 shrink-0">
            <button
              onClick={() => setScope('global')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                scope === 'global' ? 'bg-gold text-black font-bold' : 'text-gray-400 hover:text-white'
              }`}
            >
              Global (Todos)
            </button>
            <button
              onClick={() => setScope('user')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                scope === 'user' ? 'bg-blue-600 text-white font-bold' : 'text-gray-400 hover:text-white'
              }`}
            >
              Solo Mi Cuenta
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1 & 2: Main Customization Controls */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section 1: Dashboard Visibility */}
          <div className="panel p-6 rounded-2xl border border-gray-800 bg-[#0d0d0d] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Layout size={18} className="text-gold" />
                  Visibilidad del Panel Principal (Dashboard)
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Elige si deseas ver el panel general con métricas o ir directo a tu herramienta de trabajo sin distracciones.
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={hideDashboard}
                  onChange={(e) => setHideDashboard(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold"></div>
              </label>
            </div>

            <div className="p-4 rounded-xl bg-black/40 border border-gray-800/80 flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-bold text-gray-200">
                  {hideDashboard ? 'Modo Herramienta Directa (Dashboard Oculto)' : 'Modo Estándar (Dashboard Visible)'}
                </div>
                <div className="text-[11px] text-gray-400 mt-0.5">
                  {hideDashboard
                    ? 'La plataforma ocultará el panel principal y cargará directamente la herramienta seleccionada a continuación:'
                    : 'La plataforma mostrará el menú del Dashboard y el asistente Mentor al iniciar sesión.'}
                </div>
              </div>

              {hideDashboard && (
                <select
                  value={defaultTool}
                  onChange={(e) => setDefaultTool(e.target.value)}
                  className="bg-gray-900 border border-gray-700 text-xs text-white rounded-xl px-3 py-2 outline-none focus:border-gold"
                >
                  <option value="whatsapp">Bot de WhatsApp</option>
                  <option value="llamadas">Llamadas IA</option>
                  <option value="email">Email Marketing</option>
                  <option value="landing">Landing Pages</option>
                  <option value="ads">Gestión de Ads</option>
                </select>
              )}
            </div>
          </div>

          {/* Section 2: Show/Hide Modules and Tools */}
          <div className="panel p-6 rounded-2xl border border-gray-800 bg-[#0d0d0d] space-y-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Eye size={18} className="text-gold" />
                Ocultar / Mostrar Herramientas en el Menú
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Desmarca las herramientas que no utilices para simplificar la barra lateral y mantenerla limpia para nuevos usuarios.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {AVAILABLE_TOOLS.map((tool) => {
                const isHidden = hiddenItems.includes(tool.id);
                return (
                  <div
                    key={tool.id}
                    onClick={() => onToggleVisibility(tool.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 select-none ${
                      isHidden
                        ? 'bg-black/30 border-gray-800/60 opacity-60 hover:opacity-100'
                        : 'bg-black/70 border-gray-750 hover:border-gray-600 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="p-2 rounded-lg bg-gray-900 border border-gray-800 shrink-0">
                        {tool.icon}
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-bold text-gray-200 truncate">{tool.name}</div>
                        <div className="text-[10px] text-gray-500 truncate">{tool.desc}</div>
                      </div>
                    </div>

                    <div className={`p-1.5 rounded-lg shrink-0 ${
                      isHidden ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'
                    }`}>
                      {isHidden ? <EyeOff size={15} /> : <Eye size={15} />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: Color Palette Customization */}
          <div className="panel p-6 rounded-2xl border border-gray-800 bg-[#0d0d0d] space-y-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Palette size={18} className="text-gold" />
                Color de Acento de la Plataforma
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Selecciona la tonalidad primaria para botones, bordes, menús e indicadores visuales.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              {COLOR_PRESETS.map((preset) => {
                const isSelected = primaryColor.toLowerCase() === preset.hex.toLowerCase();
                return (
                  <button
                    key={preset.hex}
                    type="button"
                    onClick={() => setPrimaryColor(preset.hex)}
                    className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                      isSelected
                        ? `bg-gray-900 border-2 ${preset.border} shadow-lg`
                        : 'bg-black/50 border-gray-800 hover:border-gray-700'
                    }`}
                  >
                    <div
                      className="w-5 h-5 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: preset.hex }}
                    />
                    <div className="truncate">
                      <div className="text-xs font-semibold text-gray-200 truncate">{preset.name}</div>
                      <div className="text-[10px] text-gray-500 font-mono">{preset.hex}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <span className="text-xs text-gray-400">Color personalizado (HEX):</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-8 h-8 rounded-lg bg-transparent border border-gray-700 cursor-pointer"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="bg-gray-900 border border-gray-700 text-xs font-mono text-white rounded-lg px-2.5 py-1.5 w-28 outline-none focus:border-gold uppercase"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Column 3: Brand Identity, Logo, Custom Domain & Live Preview */}
        <div className="space-y-6">
          {/* Brand Identity Card */}
          <div className="panel p-6 rounded-2xl border border-gray-800 bg-[#0d0d0d] space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Briefcase size={18} className="text-gold" />
              Identidad de Marca Propia
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-400 block mb-1">Nombre de la Plataforma / Negocio:</label>
                <input
                  type="text"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="Ej: NovaScale 360°"
                  className="w-full bg-black border border-gray-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-gold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-400 block mb-1">Eslogan o Subtítulo:</label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="Ej: Automatización & IA para Dropshipping"
                  className="w-full bg-black border border-gray-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-gold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-400 block mb-1">Logo de tu Empresa:</label>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo" className="w-12 h-12 object-contain rounded-xl bg-black border border-gray-800 p-1" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-gold/20 text-gold flex items-center justify-center font-bold text-lg border border-gold/30">
                        {brandName.charAt(0)}
                      </div>
                    )}
                    <label className="flex-1 border border-dashed border-gray-700 hover:border-gold rounded-xl p-2.5 flex items-center justify-center gap-2 text-gray-400 hover:text-white cursor-pointer transition text-xs">
                      <UploadCloud size={16} />
                      <span>Subir Imagen PNG/SVG</span>
                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    </label>
                  </div>
                  <input
                    type="url"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="O pega la URL del logo: https://..."
                    className="w-full bg-black border border-gray-800 rounded-xl px-3 py-1.5 text-[11px] text-gray-300 outline-none focus:border-gold"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Custom Domain & Referral Link */}
          <div className="panel p-6 rounded-2xl border border-gray-800 bg-[#0d0d0d] space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Globe size={18} className="text-blue-400" />
              Dominio Propio y Referidos
            </h3>

            <div>
              <label className="text-xs font-semibold text-gray-400 block mb-1">Tu Dominio Personalizado (DNS):</label>
              <input
                type="text"
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value)}
                placeholder="app.tumarca.com"
                className="w-full bg-black border border-gray-800 rounded-xl px-3 py-2 text-xs font-mono text-white outline-none focus:border-blue-500"
              />
              <p className="text-[10px] text-gray-500 mt-1">
                La URL oficial de respaldo siempre es <span className="font-mono text-gray-400">https://crm.xorbit360.com/</span>
              </p>
            </div>

            {/* Generated Referral Link with User's Domain */}
            <div className="p-3 bg-black/60 rounded-xl border border-gray-800 space-y-2">
              <div className="text-[11px] font-bold text-gray-400 flex items-center justify-between">
                <span>Tu Enlace de Afiliado con Marca Propia:</span>
                {copiedLink && <span className="text-emerald-400 text-[10px]">¡Copiado!</span>}
              </div>
              <div className="p-2 bg-[#111] rounded-lg border border-gray-800 font-mono text-[11px] text-gold truncate flex items-center justify-between gap-2">
                <span className="truncate">{liveReferralUrl}</span>
                <button
                  onClick={handleCopyLink}
                  className="p-1 text-gray-400 hover:text-white transition shrink-0"
                  title="Copiar enlace"
                >
                  <Copy size={13} />
                </button>
              </div>
              <p className="text-[10px] text-gray-500 leading-relaxed">
                Cualquier usuario que ingrese por este enlace verá tu logotipo, tu nombre de marca y quedará registrado bajo tu estructura de revendedor.
              </p>
            </div>
          </div>

          {/* Live Preview Card */}
          <div className="panel p-5 rounded-2xl border border-gray-800 bg-[#070707] space-y-3">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles size={14} className="text-gold" /> Previsualización en Tiempo Real
            </div>

            <div className="border border-gray-800 rounded-xl p-3 bg-black space-y-3">
              {/* Header Mock */}
              <div className="flex items-center justify-between pb-2 border-b border-gray-800/80">
                <div className="flex items-center gap-2">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="w-6 h-6 object-contain" />
                  ) : (
                    <div
                      className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold text-black"
                      style={{ backgroundColor: primaryColor }}
                    >
                      {brandName.charAt(0)}
                    </div>
                  )}
                  <div>
                    <div className="text-xs font-bold text-white truncate max-w-[130px]">{brandName}</div>
                    <div className="text-[9px] text-gray-500 truncate max-w-[130px]">{tagline}</div>
                  </div>
                </div>

                <div
                  className="text-[10px] px-2 py-0.5 rounded-full font-bold text-black"
                  style={{ backgroundColor: primaryColor }}
                >
                  PRO
                </div>
              </div>

              {/* Mini Toolbar Mock */}
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {AVAILABLE_TOOLS.filter(t => !hiddenItems.includes(t.id)).slice(0, 4).map(t => (
                  <div key={t.id} className="text-[10px] px-2 py-1 bg-gray-900 rounded-lg text-gray-300 border border-gray-800 shrink-0">
                    {t.name.split(' ')[0]}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

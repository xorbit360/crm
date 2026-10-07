import React, { useState, useEffect } from 'react';
import {
  Globe,
  ShieldCheck,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Lock,
  Server,
  Zap,
  Info,
  ArrowRight,
  HelpCircle,
  Image as ImageIcon,
  Sparkles,
  Share2,
  Save,
  CheckCheck
} from 'lucide-react';
import {
  WhiteLabelConfig,
  DEFAULT_WHITELABEL,
  fetchWhiteLabelConfig,
  saveWhiteLabelConfig,
  getEffectiveDomain,
  getReferralLink
} from '../lib/whitelabel';

export default function DominioView() {
  const [config, setConfig] = useState<WhiteLabelConfig>(DEFAULT_WHITELABEL);
  const [isSubdomain, setIsSubdomain] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Real DNS Verification states (No mock timeouts!)
  const [isVerifying, setIsVerifying] = useState(false);
  const [dnsResult, setDnsResult] = useState<{
    checked: boolean;
    domain: string;
    isApex: boolean;
    recordsFound: string[];
    isConfigured: boolean;
    cnameFound?: string;
    targetMatch: boolean;
    sslStatus: string;
    details: string;
    rawError?: string;
  } | null>(null);

  const officialAppUrl = 'https://crm.xorbit360.com/';

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    const loaded = await fetchWhiteLabelConfig();
    setConfig(loaded);
    if (loaded.customDomain) {
      const parts = loaded.customDomain.split('.');
      if (parts.length > 2 && !loaded.customDomain.startsWith('www.')) {
        setIsSubdomain(true);
      }
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(id);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleSaveBrand = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const res = await saveWhiteLabelConfig(config);
      if (res.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (e) {
      console.error('Error saving brand config:', e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setConfig(prev => ({ ...prev, logoUrl: base64 }));
    };
    reader.readAsDataURL(file);
  };

  // REAL DNS CHECK VIA BACKEND
  const handleVerifyDnsReal = async () => {
    const cleanDomain = (config.customDomain || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!cleanDomain) {
      alert('Por favor introduce un nombre de dominio para verificar.');
      return;
    }

    setIsVerifying(true);
    setDnsResult(null);

    try {
      const res = await fetch('/api/domain/verify-dns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: cleanDomain,
          isSubdomain
        })
      });

      const data = await res.json();
      setDnsResult(data);

      if (data.isConfigured) {
        const updated = { ...config, dnsVerified: true };
        setConfig(updated);
        await saveWhiteLabelConfig(updated);
      }
    } catch (err: any) {
      setDnsResult({
        checked: true,
        domain: cleanDomain,
        isApex: !isSubdomain,
        recordsFound: [],
        isConfigured: false,
        targetMatch: false,
        sslStatus: 'Pendiente de propagación',
        details: 'No se pudo conectar con el verificador de DNS en tiempo real.',
        rawError: err.message
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const cleanDomain = (config.customDomain || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  const displaySubdomain = cleanDomain.startsWith('www.') ? cleanDomain : `www.${cleanDomain || 'midominio.com'}`;
  const sampleReferralLink = getReferralLink('oscar360', config);

  return (
    <div className="space-y-8 w-full pb-16 animate-fade-in text-gray-100">

      {/* Header Banner */}
      <div className="panel p-6 sm:p-8 rounded-2xl border border-gray-800 bg-gradient-to-r from-gray-900 via-gray-900/90 to-blue-950/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-lg shadow-blue-500/5 shrink-0">
              <Globe size={32} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-md bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  Marca Blanca & Dominio en Tiempo Real
                </span>
                <span className="text-xs text-gold font-semibold flex items-center gap-1">
                  <Sparkles size={12} />
                  Modo Revendedor / White-Label
                </span>
              </div>
              <h1 className="text-2xl font-bold font-display text-white mt-1">
                Personalización de Marca y Dominio Propio
              </h1>
              <p className="text-gray-400 text-sm mt-1 max-w-2xl">
                Configura el nombre de tu plataforma, sube tu logotipo y conecta tu dominio en tiempo real. Todos los enlaces de referidos y de tus clientes mostrarán tu propia marca, manteniendo la infraestructura central de <strong className="text-white">Xorbit 360</strong> por detrás.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 shrink-0">
            <div className="px-3.5 py-2 rounded-xl bg-gray-950/80 border border-gray-800 text-[11px] text-gray-400">
              <span className="text-gray-500 block text-[10px] uppercase font-bold">Respaldo Oficial Activo</span>
              <a href={officialAppUrl} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline flex items-center gap-1 font-mono">
                {officialAppUrl} <ExternalLink size={10} />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 1: MARCA Y LOGOTIPO (WHITE-LABEL PARA REVENDEDORES) */}
      <div className="panel p-6 sm:p-8 rounded-2xl border border-gray-800 bg-gray-900/80 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-4">
          <div>
            <h2 className="text-lg font-bold font-display text-white flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gold/20 text-gold text-xs font-black border border-gold/30">
                1
              </span>
              Identidad de Marca Propia (White-Label)
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              Personaliza el nombre de la página, el eslogan y el logotipo para que tus clientes y afiliados vean tu marca.
            </p>
          </div>

          <button
            onClick={handleSaveBrand}
            disabled={isSaving}
            className="px-5 py-2.5 rounded-xl bg-gold hover:bg-amber-400 text-black font-bold text-xs transition shadow-lg shadow-gold/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                <span>Guardando...</span>
              </>
            ) : saveSuccess ? (
              <>
                <CheckCheck size={14} className="text-black" />
                <span>¡Marca Guardada!</span>
              </>
            ) : (
              <>
                <Save size={14} />
                <span>Guardar Cambios de Marca</span>
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Brand Form */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block">
                Nombre de la Plataforma / Marca
              </label>
              <input
                type="text"
                value={config.brandName}
                onChange={(e) => setConfig({ ...config, brandName: e.target.value })}
                placeholder="Ej. Xorbit 360, Xorbit 360, Nova AI..."
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white font-medium focus:outline-none focus:border-gold transition"
              />
              <span className="text-[11px] text-gray-500">
                Se mostrará en la barra lateral, títulos y pantallas de inicio de sesión.
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block">
                Eslogan o Subtítulo de la Plataforma
              </label>
              <input
                type="text"
                value={config.tagline}
                onChange={(e) => setConfig({ ...config, tagline: e.target.value })}
                placeholder="Ej. Soluciones de Inteligencia Artificial & Ventas"
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-gold transition"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block">
                Logotipo de la Plataforma
              </label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <input
                  type="text"
                  value={config.logoUrl}
                  onChange={(e) => setConfig({ ...config, logoUrl: e.target.value })}
                  placeholder="URL del logo (https://...) o sube un archivo"
                  className="flex-1 bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-gold transition"
                />
                <label className="px-4 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold cursor-pointer border border-gray-700 flex items-center justify-center gap-1.5 shrink-0 transition">
                  <ImageIcon size={14} />
                  <span>Subir Imagen</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </label>
              </div>
              <span className="text-[11px] text-gray-500 block">
                Formatos recomendados: PNG transparente o SVG, proporción cuadrada o rectangular.
              </span>
            </div>
          </div>

          {/* Live Preview Box */}
          <div className="p-5 rounded-2xl bg-black border border-gray-800 flex flex-col justify-between space-y-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 block mb-3">
                Vista Previa en Vivo de tu Marca
              </span>

              {/* Mock Sidebar Header */}
              <div className="p-4 rounded-xl bg-gray-900 border border-gray-800 flex items-center gap-3">
                {config.logoUrl ? (
                  <img
                    src={config.logoUrl}
                    alt="Logo"
                    className="w-10 h-10 rounded-lg object-contain bg-black/40 border border-gray-800 p-1"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-gold flex items-center justify-center font-bold text-black font-display text-xl shadow-lg shadow-gold/20">
                    {config.brandName ? config.brandName.charAt(0).toUpperCase() : 'E'}
                  </div>
                )}
                <div className="overflow-hidden">
                  <div className="font-bold text-base text-gold truncate">
                    {config.brandName || 'Xorbit 360'}
                  </div>
                  <div className="text-[10px] text-gray-400 uppercase tracking-widest truncate">
                    {config.tagline || 'Marketing & Ventas AI'}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-gray-950 border border-gray-800/80 text-xs space-y-1">
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 size={13} /> Sincronización Inmediata
              </span>
              <p className="text-gray-400 text-[11px] leading-relaxed">
                Al guardar, el logotipo y nombre se actualizan automáticamente en toda la interfaz sin recargar la página.
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* SECTION 2: DOMINIO PERSONALIZADO EN TIEMPO REAL */}
      <div className="panel p-6 sm:p-8 rounded-2xl border border-gray-800 bg-gray-900/80 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-4">
          <div>
            <h2 className="text-lg font-bold font-display text-white flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 text-xs font-black border border-blue-500/30">
                2
              </span>
              Conexión de Dominio en Tiempo Real (DNS Real)
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              Ingresa el dominio que compraste en tu proveedor (Namecheap, GoDaddy, Cloudflare, etc.).
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-gray-400">¿Es un subdominio? (ej: app.midominio.com):</label>
            <button
              onClick={() => setIsSubdomain(!isSubdomain)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isSubdomain ? 'bg-blue-500' : 'bg-gray-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  isSubdomain ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch gap-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
              <Globe size={18} />
            </div>
            <input
              type="text"
              value={config.customDomain}
              onChange={(e) => setConfig({ ...config, customDomain: e.target.value })}
              placeholder="midominio.com o app.midominio.com"
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-950 border border-gray-800 text-white font-mono text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </div>

          <button
            onClick={handleVerifyDnsReal}
            disabled={isVerifying || !cleanDomain}
            className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isVerifying ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                <span>Consultando Servidores DNS Reales...</span>
              </>
            ) : (
              <>
                <ShieldCheck size={18} />
                <span>Verificar DNS en Tiempo Real</span>
              </>
            )}
          </button>
        </div>

        {/* Real DNS Verification Response Box */}
        {dnsResult && (
          <div className={`p-5 rounded-2xl border transition-all animate-fade-in ${
            dnsResult.isConfigured
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
          }`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                {dnsResult.isConfigured ? (
                  <CheckCircle2 size={24} className="text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle size={24} className="text-amber-400 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <h4 className="font-bold text-white text-sm">
                    {dnsResult.isConfigured
                      ? '¡Dominio Conectado y Apuntando Correctamente!'
                      : 'Verificación en Tiempo Real: Registros DNS aún no detectados o en propagación'}
                  </h4>
                  <p className="text-xs leading-relaxed">
                    {dnsResult.details}
                  </p>

                  {dnsResult.recordsFound && dnsResult.recordsFound.length > 0 && (
                    <div className="mt-2 text-xs font-mono bg-gray-950/80 p-2.5 rounded-lg border border-gray-800 text-gray-300">
                      <strong>Registros detectados actualmente en DNS públicos:</strong> {dnsResult.recordsFound.join(', ')}
                    </div>
                  )}

                  {dnsResult.rawError && (
                    <p className="text-[11px] text-red-400 font-mono mt-1">
                      Nota técnica: {dnsResult.rawError}
                    </p>
                  )}
                </div>
              </div>

              <span className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold shrink-0 uppercase ${
                dnsResult.isConfigured ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
              }`}>
                {dnsResult.sslStatus}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 3: URL DE REFERIDOS CON DOMINIO PROPIO */}
      <div className="panel p-6 sm:p-8 rounded-2xl border border-gray-800 bg-gray-900/80 space-y-4">
        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
              <Share2 size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">URL de Referidos & Afiliados con tu Marca</h3>
              <p className="text-xs text-gray-400">
                Tus prospectos y revendedores se registrarán directamente a través de tu dominio personalizado.
              </p>
            </div>
          </div>

          <span className="text-xs px-2.5 py-1 rounded bg-blue-500/20 text-blue-300 font-mono font-bold">
            White-Label Afiliados
          </span>
        </div>

        <div className="space-y-3 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-950 p-3.5 rounded-xl border border-gray-800 text-xs font-mono">
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="text-gray-500">Ejemplo de Enlace:</span>
              <span className="text-gold font-bold truncate">{sampleReferralLink}</span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => copyToClipboard(sampleReferralLink, 'ref_link')}
                className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-sans font-semibold transition flex items-center gap-1.5"
              >
                {copiedIndex === 'ref_link' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                <span>Copiar Enlace con mi Dominio</span>
              </button>
            </div>
          </div>

          <p className="text-xs text-gray-400 leading-relaxed">
            Cuando compartas o vendas este sistema a revendedores, la URL oficial <code className="text-gray-300">{officialAppUrl}</code> permanecerá en el servidor ejecutando toda la lógica e inteligencia artificial, pero tu cliente siempre interactuará y verá tu dominio <span className="font-mono text-gold">{cleanDomain || 'tudominio.com'}</span>.
          </p>
        </div>
      </div>

      {/* SECTION 4: DNS RECORDS TABLE */}
      <div className="panel p-6 sm:p-8 rounded-2xl border border-gray-800 bg-gray-900/80 space-y-6">
        <div>
          <h2 className="text-lg font-bold font-display text-white flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 text-xs font-black border border-amber-500/30">
              3
            </span>
            Registros DNS Exactos que debes agregar en tu Proveedor
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Entra a tu proveedor (Cloudflare, GoDaddy, Namecheap, Hostinger) y coloca estos registros:
          </p>
        </div>

        {!isSubdomain ? (
          /* Apex / Root Domain Records */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Info size={14} />
                Registros de Tipo A (Para el dominio raíz @)
              </span>
              <span className="text-[11px] text-gray-400">Recomendado para dominios principales</span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-800 bg-gray-950">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-900/80 text-gray-400 uppercase font-bold text-[10px] border-b border-gray-800">
                  <tr>
                    <th className="p-3">Tipo</th>
                    <th className="p-3">Nombre / Host</th>
                    <th className="p-3">Valor / Destino IP (Google Cloud Run)</th>
                    <th className="p-3">TTL</th>
                    <th className="p-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60 font-mono text-gray-200">
                  {[
                    { type: 'A', host: '@', value: '216.239.32.21', id: 'ip1' },
                    { type: 'A', host: '@', value: '216.239.34.21', id: 'ip2' },
                    { type: 'A', host: '@', value: '216.239.36.21', id: 'ip3' },
                    { type: 'A', host: '@', value: '216.239.38.21', id: 'ip4' },
                  ].map((rec) => (
                    <tr key={rec.id} className="hover:bg-gray-900/40">
                      <td className="p-3 font-bold text-amber-400">{rec.type}</td>
                      <td className="p-3 text-gray-300">{rec.host}</td>
                      <td className="p-3 font-bold text-white">{rec.value}</td>
                      <td className="p-3 text-gray-500">Automático / 3600</td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => copyToClipboard(rec.value, rec.id)}
                          className="px-2.5 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-[11px] font-sans font-semibold transition-all inline-flex items-center gap-1 cursor-pointer"
                        >
                          {copiedIndex === rec.id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                          <span>{copiedIndex === rec.id ? 'Copiado' : 'Copiar IP'}</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* CNAME for WWW */}
            <div className="pt-2">
              <span className="text-xs font-bold text-gray-300 block mb-2">
                Registro adicional CNAME para redirección WWW ({displaySubdomain}):
              </span>
              <div className="p-3.5 rounded-xl bg-gray-950 border border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-bold">CNAME</span>
                  <span className="text-gray-400">Host: <strong className="text-white">www</strong></span>
                  <span className="text-gray-400">Destino: <strong className="text-emerald-400">ghs.googlehosted.com</strong></span>
                </div>
                <button
                  onClick={() => copyToClipboard('ghs.googlehosted.com', 'cname1')}
                  className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-sans font-semibold transition-all flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                >
                  {copiedIndex === 'cname1' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  <span>{copiedIndex === 'cname1' ? 'Copiado' : 'Copiar CNAME'}</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Subdomain CNAME record */
          <div className="space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
              <Info size={14} />
              Registro de Tipo CNAME (Para subdominio)
            </span>

            <div className="p-4 rounded-xl bg-gray-950 border border-gray-800 space-y-3 font-mono text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-gray-400">Tipo de Registro: <strong className="text-blue-400 font-bold">CNAME</strong></p>
                  <p className="text-gray-400">Nombre / Host: <strong className="text-white">{cleanDomain.split('.')[0] || 'app'}</strong></p>
                  <p className="text-gray-400">Valor / Apunta a: <strong className="text-emerald-400 font-bold">ghs.googlehosted.com</strong></p>
                </div>

                <button
                  onClick={() => copyToClipboard('ghs.googlehosted.com', 'cname_sub')}
                  className="px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-sans font-semibold transition-all flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                >
                  {copiedIndex === 'cname_sub' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  <span>{copiedIndex === 'cname_sub' ? '¡Copiado!' : 'Copiar ghs.googlehosted.com'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* STEP 4: Provider instructions */}
      <div className="panel p-6 sm:p-8 rounded-2xl border border-gray-800 bg-gray-900/80 space-y-6">
        <h2 className="text-lg font-bold font-display text-white flex items-center gap-2">
          <HelpCircle size={20} className="text-blue-400" />
          Instrucciones Rápidas por Proveedor
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-gray-950 border border-gray-800 space-y-2">
            <div className="flex items-center justify-between border-b border-gray-800 pb-2">
              <span className="font-bold text-white text-sm">Cloudflare</span>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-bold">DNS Only</span>
            </div>
            <ol className="list-decimal pl-4 space-y-1.5 text-gray-300 leading-relaxed">
              <li>Inicia sesión y selecciona tu dominio.</li>
              <li>Ve a la pestaña <strong>DNS → Registros</strong>.</li>
              <li>Añade los 4 registros <strong>A</strong> con las IPs provistas arriba.</li>
              <li>Desactiva el proxy naranja (cámbialo a <strong>DNS Only</strong>).</li>
            </ol>
          </div>

          <div className="p-4 rounded-xl bg-gray-950 border border-gray-800 space-y-2">
            <div className="flex items-center justify-between border-b border-gray-800 pb-2">
              <span className="font-bold text-white text-sm">GoDaddy</span>
              <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded font-bold">DNS Management</span>
            </div>
            <ol className="list-decimal pl-4 space-y-1.5 text-gray-300 leading-relaxed">
              <li>Ve a "Mis Productos" y selecciona tu Dominio.</li>
              <li>Haz clic en <strong>Administrar DNS</strong>.</li>
              <li>En la sección Registros, haz clic en <strong>Agregar nuevo registro</strong>.</li>
              <li>Selecciona Tipo <strong>A</strong>, Host <strong>@</strong> e ingresa las IPs.</li>
            </ol>
          </div>

          <div className="p-4 rounded-xl bg-gray-950 border border-gray-800 space-y-2">
            <div className="flex items-center justify-between border-b border-gray-800 pb-2">
              <span className="font-bold text-white text-sm">Namecheap / Hostinger</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-bold">Advanced DNS</span>
            </div>
            <ol className="list-decimal pl-4 space-y-1.5 text-gray-300 leading-relaxed">
              <li>Abre el panel de control de tu dominio.</li>
              <li>Ve a <strong>Advanced DNS / Editor de Zonas DNS</strong>.</li>
              <li>Añade los registros de tipo <strong>A Record</strong>.</li>
              <li>Guarda los cambios y verifica arriba con un clic.</li>
            </ol>
          </div>
        </div>
      </div>

    </div>
  );
}

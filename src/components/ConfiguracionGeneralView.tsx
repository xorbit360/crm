import React, { useState } from 'react';
import { Settings, Globe, Sun, Moon, Bell, Shield, Check, Sparkles, Volume2, Save, Users, Network, Link as LinkIcon, Zap, HelpCircle, Calculator, CreditCard, Terminal, Palette, FolderKanban } from 'lucide-react';
import { Language, Theme, FlagES, FlagUK, translations } from '../lib/i18n';
import UsuariosView from './UsuariosView';
import AutomatizacionesView from './AutomatizacionesView';
import IntegracionesView from './IntegracionesView';
import RecargasView from './RecargasView';
import ReferidosView from './ReferidosView';
import DominioView from './DominioView';
import SoporteTicketsView from './SoporteTicketsView';
import CostosSaasView from './CostosSaasView';
import PasarelaPagoView from './PasarelaPagoView';
import McpApiView from './McpApiView';
import PersonalizacionPlataformaView from './PersonalizacionPlataformaView';
import ProyectosView from './ProyectosView';

interface ConfiguracionGeneralViewProps {
  currentLanguage: Language;
  onLanguageChange: (lang: Language) => void;
  currentTheme: Theme;
  onThemeChange: (theme: Theme) => void;
  hiddenItems?: string[];
  toggleVisibility?: (id: string) => void;
  currentUser?: { name: string; role: string; email: string; plan?: string } | null;
  onCustomizationApplied?: (config: any) => void;
  initialTab?: 'personalizacion' | 'general' | 'usuarios' | 'automatizaciones' | 'integraciones' | 'recargas' | 'referidos' | 'dominio' | 'tickets' | 'costos' | 'pasarela' | 'mcp_api' | 'embudos';
}

export default function ConfiguracionGeneralView({
  currentLanguage,
  onLanguageChange,
  currentTheme,
  onThemeChange,
  hiddenItems = [],
  toggleVisibility = () => {},
  currentUser,
  onCustomizationApplied,
  initialTab = 'general',
}: ConfiguracionGeneralViewProps) {
  const t = translations[currentLanguage];
  const [activeTab, setActiveTab] = useState<'personalizacion' | 'general' | 'usuarios' | 'automatizaciones' | 'integraciones' | 'recargas' | 'referidos' | 'dominio' | 'tickets' | 'costos' | 'pasarela' | 'mcp_api' | 'embudos'>(initialTab);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoSave, setAutoSave] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [savedToast, setSavedToast] = useState(false);

  const handleSave = () => {
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 3000);
  };

  return (
    <div className="space-y-6 w-full pb-12 animate-fade-in">
      {/* Top Banner */}
      <div className="panel p-6 sm:p-8 rounded-2xl relative overflow-hidden border border-gray-800">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gold/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-gold/10 text-gold border border-gold/20 shadow-lg shadow-gold/5">
              <Settings size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-bold font-display text-white">{t.configuracion}</h2>
              <p className="text-gray-400 text-sm mt-1">
                Centro de control: Personalización de marca blanca, ocultar herramientas, ajustes generales, usuarios registrados, costos operativos e integraciones.
              </p>
            </div>
          </div>
        </div>

        {/* Configuration Navigation Tabs */}
        <div className="mt-6 pt-4 border-t border-gray-800/80 flex items-center gap-2 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('personalizacion')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'personalizacion'
                ? 'bg-gold text-black shadow-lg shadow-gold/20 font-bold'
                : 'text-gold hover:text-white hover:bg-gold/10 border border-gold/30'
            }`}
          >
            <Palette size={16} />
            Personalización (Marca Blanca)
          </button>

          <button
            onClick={() => setActiveTab('general')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'general'
                ? 'bg-gold text-black shadow-lg shadow-gold/20 font-bold'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
            }`}
          >
            <Settings size={16} />
            {t.configuracionGeneral}
          </button>

          <button
            onClick={() => setActiveTab('usuarios')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'usuarios'
                ? 'bg-gold text-black shadow-lg shadow-gold/20 font-bold'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
            }`}
          >
            <Users size={16} />
            {t.usuarios}
          </button>

          <button
            onClick={() => setActiveTab('tickets')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'tickets'
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20 font-bold'
                : 'text-amber-400 hover:text-white hover:bg-amber-950/40 border border-amber-500/20'
            }`}
          >
            <HelpCircle size={16} />
            Tickets de Soporte
          </button>

          <button
            onClick={() => setActiveTab('pasarela')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'pasarela'
                ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20 font-bold'
                : 'text-emerald-400 hover:text-white hover:bg-emerald-950/40 border border-emerald-500/20'
            }`}
          >
            <CreditCard size={16} />
            Pasarela de Pago
          </button>

          <button
            onClick={() => setActiveTab('costos')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'costos'
                ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20 font-bold'
                : 'text-cyan-400 hover:text-white hover:bg-cyan-950/40 border border-cyan-500/20'
            }`}
          >
            <Calculator size={16} />
            Costos Operativos SaaS
          </button>

          <button
            onClick={() => setActiveTab('dominio')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'dominio'
                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20 font-bold'
                : 'text-blue-400 hover:text-white hover:bg-blue-950/40 border border-blue-500/20'
            }`}
          >
            <Globe size={16} />
            {t.dominio}
          </button>

          <button
            onClick={() => setActiveTab('recargas')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'recargas'
                ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20 font-bold'
                : 'text-emerald-400 hover:text-white hover:bg-emerald-950/40 border border-emerald-500/20'
            }`}
          >
            <Zap size={16} />
            {t.recargas}
          </button>

          <button
            onClick={() => setActiveTab('referidos')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'referidos'
                ? 'bg-[#00E676] text-black shadow-lg shadow-emerald-500/20 font-bold'
                : 'text-[#00E676] hover:text-white hover:bg-emerald-950/40 border border-emerald-500/30'
            }`}
          >
            <Users size={16} />
            {t.referidos || 'Referidos (20%)'}
          </button>

          <button
            onClick={() => setActiveTab('automatizaciones')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'automatizaciones'
                ? 'bg-gold text-black shadow-lg shadow-gold/20 font-bold'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
            }`}
          >
            <Network size={16} />
            {t.automatizaciones}
          </button>

          <button
            onClick={() => setActiveTab('integraciones')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'integraciones'
                ? 'bg-gold text-black shadow-lg shadow-gold/20 font-bold'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
            }`}
          >
            <LinkIcon size={16} />
            {t.integraciones}
          </button>

          <button
            onClick={() => setActiveTab('embudos')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'embudos'
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20 font-bold'
                : 'text-amber-400 hover:text-white hover:bg-amber-950/40 border border-amber-500/20'
            }`}
          >
            <FolderKanban size={16} />
            Embudos & Proyectos
          </button>

          <button
            onClick={() => setActiveTab('mcp_api')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'mcp_api'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 font-bold'
                : 'text-blue-400 hover:text-white hover:bg-blue-950/40 border border-blue-500/20'
            }`}
          >
            <Terminal size={16} />
            MCP y API
          </button>
        </div>
      </div>

      {/* Tab Contents */}
      {activeTab === 'embudos' && (
        <ProyectosView />
      )}
      {activeTab === 'personalizacion' && (
        <PersonalizacionPlataformaView
          currentUser={currentUser}
          hiddenItems={hiddenItems}
          onToggleVisibility={toggleVisibility}
          onCustomizationApplied={onCustomizationApplied}
        />
      )}

      {activeTab === 'mcp_api' && (
        <McpApiView />
      )}

      {activeTab === 'dominio' && (
        <DominioView />
      )}

      {activeTab === 'recargas' && (
        <RecargasView />
      )}

      {activeTab === 'referidos' && (
        <ReferidosView currentUser={currentUser} />
      )}

      {activeTab === 'usuarios' && (
        <UsuariosView
          hiddenItems={hiddenItems}
          toggleVisibility={toggleVisibility}
          currentUser={currentUser}
        />
      )}

      {activeTab === 'tickets' && (
        <SoporteTicketsView />
      )}

      {activeTab === 'costos' && (
        <CostosSaasView />
      )}

      {activeTab === 'pasarela' && (
        <PasarelaPagoView />
      )}

      {activeTab === 'automatizaciones' && (
        <AutomatizacionesView />
      )}

      {activeTab === 'integraciones' && (
        <IntegracionesView />
      )}

      {activeTab === 'general' && (
        <div className="space-y-8 animate-fade-in">
          {savedToast && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-4 rounded-xl flex items-center justify-between animate-fade-in">
              <div className="flex items-center gap-2">
                <Check size={18} />
                <span className="text-sm font-semibold">Configuración guardada correctamente en tu dispositivo.</span>
              </div>
            </div>
          )}

          {/* Grid of Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Language Box */}
            <div className="panel p-6 rounded-2xl border border-gray-800 space-y-5">
              <div className="flex items-center gap-3 border-b border-gray-800/80 pb-4">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <Globe size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">{t.language}</h3>
                  <p className="text-xs text-gray-400">Selecciona el idioma principal de la interfaz</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => onLanguageChange('es')}
                  className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2.5 transition-all cursor-pointer ${
                    currentLanguage === 'es'
                      ? 'border-gold bg-gold/10 text-white shadow-lg shadow-gold/5 font-bold'
                      : 'border-gray-800 bg-gray-900/40 text-gray-400 hover:border-gray-700 hover:text-gray-200'
                  }`}
                >
                  <FlagES className="w-8 h-5 rounded shadow" />
                  <div className="text-center">
                    <span className="text-sm block">{t.spanish}</span>
                    <span className="text-[10px] text-gray-400 font-normal">Español (Latinoamérica)</span>
                  </div>
                  {currentLanguage === 'es' && (
                    <span className="mt-1 px-2 py-0.5 rounded-full bg-gold/20 text-gold text-[10px] uppercase tracking-wider font-bold">
                      Activo
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => onLanguageChange('en')}
                  className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2.5 transition-all cursor-pointer ${
                    currentLanguage === 'en'
                      ? 'border-gold bg-gold/10 text-white shadow-lg shadow-gold/5 font-bold'
                      : 'border-gray-800 bg-gray-900/40 text-gray-400 hover:border-gray-700 hover:text-gray-200'
                  }`}
                >
                  <FlagUK className="w-8 h-5 rounded shadow" />
                  <div className="text-center">
                    <span className="text-sm block">{t.english}</span>
                    <span className="text-[10px] text-gray-400 font-normal">English (US)</span>
                  </div>
                  {currentLanguage === 'en' && (
                    <span className="mt-1 px-2 py-0.5 rounded-full bg-gold/20 text-gold text-[10px] uppercase tracking-wider font-bold">
                      Active
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Theme Box */}
            <div className="panel p-6 rounded-2xl border border-gray-800 space-y-5">
              <div className="flex items-center gap-3 border-b border-gray-800/80 pb-4">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Sun size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">{t.theme}</h3>
                  <p className="text-xs text-gray-400">Alterna entre el modo oscuro y claro del panel</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => onThemeChange('dark')}
                  className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2.5 transition-all cursor-pointer ${
                    currentTheme === 'dark'
                      ? 'border-gold bg-gold/10 text-white shadow-lg shadow-gold/5 font-bold'
                      : 'border-gray-800 bg-gray-900/40 text-gray-400 hover:border-gray-700 hover:text-gray-200'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-black border border-gray-700 flex items-center justify-center text-gold">
                    <Moon size={18} />
                  </div>
                  <div className="text-center">
                    <span className="text-sm block">{t.darkMode}</span>
                    <span className="text-[10px] text-gray-400 font-normal">Estética Oscura Pro</span>
                  </div>
                  {currentTheme === 'dark' && (
                    <span className="mt-1 px-2 py-0.5 rounded-full bg-gold/20 text-gold text-[10px] uppercase tracking-wider font-bold">
                      Activo
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => onThemeChange('light')}
                  className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2.5 transition-all cursor-pointer ${
                    currentTheme === 'light'
                      ? 'border-amber-400 bg-amber-500/10 text-white shadow-lg shadow-amber-500/5 font-bold'
                      : 'border-gray-800 bg-gray-900/40 text-gray-400 hover:border-gray-700 hover:text-gray-200'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-white text-amber-600 flex items-center justify-center shadow">
                    <Sun size={18} />
                  </div>
                  <div className="text-center">
                    <span className="text-sm block">{t.lightMode}</span>
                    <span className="text-[10px] text-gray-400 font-normal">Estética Clara</span>
                  </div>
                  {currentTheme === 'light' && (
                    <span className="mt-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] uppercase tracking-wider font-bold">
                      Activo
                    </span>
                  )}
                </button>
              </div>
            </div>

          </div>

          {/* Preferences Section */}
          <div className="panel p-6 rounded-2xl border border-gray-800 space-y-6">
            <div className="flex items-center gap-3 border-b border-gray-800/80 pb-4">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Sparkles size={20} />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Preferencias del Sistema</h3>
                <p className="text-xs text-gray-400">Opciones adicionales de interacción y notificaciones</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-gray-900/40 border border-gray-800">
                <div className="flex items-center gap-3">
                  <Bell size={18} className="text-gray-400" />
                  <div>
                    <p className="text-sm font-semibold text-gray-200">Notificaciones de Escritorio</p>
                    <p className="text-xs text-gray-500">Recibe alertas sobre leads, llamadas y campañas</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={notifications}
                  onChange={(e) => setNotifications(e.target.checked)}
                  className="w-5 h-5 accent-gold cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-gray-900/40 border border-gray-800">
                <div className="flex items-center gap-3">
                  <Volume2 size={18} className="text-gray-400" />
                  <div>
                    <p className="text-sm font-semibold text-gray-200">Efectos de Audio e Interacción</p>
                    <p className="text-xs text-gray-500">Sonido de confirmación al completar acciones o recibir chats</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={soundEnabled}
                  onChange={(e) => setSoundEnabled(e.target.checked)}
                  className="w-5 h-5 accent-gold cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-gray-900/40 border border-gray-800">
                <div className="flex items-center gap-3">
                  <Shield size={18} className="text-gray-400" />
                  <div>
                    <p className="text-sm font-semibold text-gray-200">Autoguardado Automático</p>
                    <p className="text-xs text-gray-500">Guarda borradores de formularios y configuraciones en tiempo real</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={autoSave}
                  onChange={(e) => setAutoSave(e.target.checked)}
                  className="w-5 h-5 accent-gold cursor-pointer"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={handleSave}
                className="px-6 py-2.5 bg-gold hover:bg-yellow-400 text-black font-bold text-sm rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-gold/20 cursor-pointer"
              >
                <Save size={18} />
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

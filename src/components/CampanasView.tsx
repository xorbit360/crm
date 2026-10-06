import React, { useState } from 'react';
import { Send, Upload, Users, FileText, CheckCircle2, MessageSquare, Plus, ArrowRight, Sparkles, Layers } from 'lucide-react';
import PlantillasMetaView from './PlantillasMetaView';

export default function CampanasView() {
  const [activeTab, setActiveTab] = useState<'plantillas' | 'campana'>('plantillas');
  const [step, setStep] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState('Confirmacion de pedido');

  return (
    <div className="space-y-6 animate-fade-in text-left">
      {/* Top Main Navigation Bar for Campañas & Plantillas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
            <span>WhatsApp Bot AI</span>
            <span>/</span>
            <span className="text-zinc-300 font-medium">Difusión & Mensajería</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2.5">
            {activeTab === 'plantillas' ? (
              <>
                <FileText className="text-[#00c950]" size={26} /> Plantillas de WhatsApp
              </>
            ) : (
              <>
                <Send className="text-gold" size={26} /> Campañas Masivas de Difusión
              </>
            )}
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            {activeTab === 'plantillas' 
              ? 'Gestiona, diseña y sincroniza tus plantillas aprobadas por Meta y automatizaciones de seguimiento Dropi.'
              : 'Envía mensajes y promociones masivas a tu base de clientes usando plantillas oficiales.'}
          </p>
        </div>

        {/* Buttons to switch between Plantillas and Nueva Campaña */}
        <div className="flex items-center gap-2 bg-zinc-900/90 p-1.5 rounded-2xl border border-zinc-800 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('plantillas')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'plantillas'
                ? 'bg-[#00c950] text-zinc-950 shadow-md'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FileText size={15} />
            <span>Plantillas</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('campana')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'campana'
                ? 'bg-gold text-black shadow-md'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Send size={15} />
            <span>Lanzar Campaña</span>
          </button>
        </div>
      </div>

      {/* Render Plantillas Meta View */}
      {activeTab === 'plantillas' ? (
        <PlantillasMetaView onBackToCampaigns={() => setActiveTab('campana')} />
      ) : (
        /* Render Campaign Wizard */
        <div className="bg-zinc-950 rounded-2xl border border-zinc-800 overflow-hidden shadow-xl">
          <div className="flex border-b border-zinc-800 bg-zinc-900/50">
            <div className={`flex-1 p-3.5 text-center text-xs font-bold transition ${step >= 1 ? 'text-gold border-b-2 border-gold bg-gold/5' : 'text-zinc-500'}`}>
              1. Audiencia y Contactos
            </div>
            <div className={`flex-1 p-3.5 text-center text-xs font-bold transition ${step >= 2 ? 'text-gold border-b-2 border-gold bg-gold/5' : 'text-zinc-500'}`}>
              2. Plantilla de WhatsApp
            </div>
            <div className={`flex-1 p-3.5 text-center text-xs font-bold transition ${step >= 3 ? 'text-gold border-b-2 border-gold bg-gold/5' : 'text-zinc-500'}`}>
              3. Resumen & Disparo
            </div>
          </div>

          <div className="p-6">
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-bold text-white text-base">Seleccionar o cargar base de datos de clientes</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">Elige los destinatarios para tu campaña masiva.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button 
                    type="button"
                    onClick={() => setStep(2)}
                    className="p-6 border-2 border-dashed border-zinc-800 hover:border-gold/60 bg-zinc-900/40 hover:bg-zinc-900/80 rounded-2xl flex flex-col items-center justify-center gap-3 transition text-zinc-400 hover:text-gold cursor-pointer group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-zinc-800 group-hover:bg-gold/10 flex items-center justify-center text-gold transition">
                      <Users size={24} />
                    </div>
                    <div className="text-center">
                      <span className="font-bold text-sm text-white block">Base de Datos de Clientes CRM</span>
                      <span className="text-xs text-zinc-500 mt-0.5 block">Sincroniza con los 1,250 clientes registrados</span>
                    </div>
                  </button>

                  <button 
                    type="button"
                    onClick={() => setStep(2)}
                    className="p-6 border-2 border-dashed border-zinc-800 hover:border-emerald-500/60 bg-zinc-900/40 hover:bg-zinc-900/80 rounded-2xl flex flex-col items-center justify-center gap-3 transition text-zinc-400 hover:text-emerald-400 cursor-pointer group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-zinc-800 group-hover:bg-emerald-500/10 flex items-center justify-center text-emerald-400 transition">
                      <Upload size={24} />
                    </div>
                    <div className="text-center">
                      <span className="font-bold text-sm text-white block">Subir Archivo Excel o CSV</span>
                      <span className="text-xs text-zinc-500 mt-0.5 block">Carga una lista externa con columnas de teléfono y nombre</span>
                    </div>
                  </button>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-zinc-900">
                  <button 
                    type="button"
                    onClick={() => setActiveTab('plantillas')}
                    className="text-xs text-zinc-400 hover:text-white font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <FileText size={13} /> Gestionar Plantillas Primero
                  </button>
                  <button 
                    type="button"
                    onClick={() => setStep(2)} 
                    className="bg-gold hover:bg-gold-light text-black px-6 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer shadow-lg shadow-gold/10"
                  >
                    Continuar al Paso 2
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-white text-base">Seleccionar Plantilla de WhatsApp</h3>
                    <p className="text-xs text-zinc-400 mt-0.5">Selecciona una de tus plantillas preconfiguradas o ve al panel de plantillas.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('plantillas')}
                    className="text-xs text-[#00c950] hover:underline font-bold flex items-center gap-1"
                  >
                    <Plus size={13} /> Crear Nueva Plantilla
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { name: 'Confirmacion con imagen', slug: 'confirmacion_con_imagen', cat: 'Utilidad', desc: 'Recibimos tu pedido de {{producto}} por {{valor_pedido}}...' },
                    { name: 'Confirmacion de pedido', slug: 'confirmacion_sin_imagen', cat: 'Utilidad', desc: '¡Gracias por tu compra! Recibimos tu pedido: Producto {{producto}}...' },
                    { name: 'Carrito abandonado #1', slug: 'carritos_mensaje_1', cat: 'Marketing', desc: 'Notamos que dejaste {{producto}} en tu carrito. ¿Te lo apartamos?' },
                    { name: 'Aviso: un cliente necesita ayuda', slug: 'asesor_necesario', cat: 'Utilidad', desc: 'El asistente no supo responderle a {{nombre_cliente}}...' },
                    { name: 'Promo Flash Black Friday', slug: 'promo_black_friday', cat: 'Marketing', desc: '¡Hola {{nombre}}! 50% de descuento en todo el catálogo solo por 24h...' }
                  ].map((tpl) => (
                    <label 
                      key={tpl.slug} 
                      className={`flex items-start gap-3.5 p-4 border rounded-2xl cursor-pointer transition select-none ${
                        selectedTemplate === tpl.name
                          ? 'bg-zinc-900 border-[#00c950] ring-1 ring-[#00c950]/30'
                          : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <input 
                        type="radio" 
                        name="plantilla" 
                        checked={selectedTemplate === tpl.name}
                        onChange={() => setSelectedTemplate(tpl.name)}
                        className="mt-1 accent-[#00c950]" 
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-bold text-xs text-white flex items-center gap-1.5 truncate">
                            <FileText size={13} className="text-[#00c950]" /> {tpl.name}
                          </p>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
                            {tpl.cat}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed line-clamp-2">
                          {tpl.desc}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-zinc-900">
                  <button 
                    type="button"
                    onClick={() => setStep(1)} 
                    className="text-zinc-400 hover:text-white px-4 py-2 font-semibold text-xs transition cursor-pointer"
                  >
                    Atrás
                  </button>
                  <button 
                    type="button"
                    onClick={() => setStep(3)} 
                    className="bg-gold hover:bg-gold-light text-black px-6 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer shadow-lg shadow-gold/10"
                  >
                    Continuar al Resumen
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6 text-center max-w-lg mx-auto py-4">
                <div className="w-16 h-16 bg-emerald-500/15 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto border border-emerald-500/30">
                  <CheckCircle2 size={32} />
                </div>

                <div>
                  <h3 className="font-bold text-xl text-white">Campaña Lista para Disparo</h3>
                  <p className="text-zinc-400 text-xs mt-1.5 leading-relaxed">
                    Estás a punto de enviar la plantilla <strong className="text-white font-semibold">"{selectedTemplate}"</strong> a <strong className="text-white font-semibold">1,250 clientes</strong> de tu base de datos mediante la API de WhatsApp.
                  </p>
                </div>

                <div className="p-4 bg-zinc-900/90 rounded-2xl border border-zinc-800 text-left space-y-2 text-xs">
                  <div className="flex justify-between text-zinc-400">
                    <span>Plantilla seleccionada:</span>
                    <span className="text-white font-bold">{selectedTemplate}</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Audiencia total:</span>
                    <span className="text-emerald-400 font-bold">1,250 contactos</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Velocidad de despacho:</span>
                    <span className="text-white font-bold">50 mensajes / min (Anti-ban)</span>
                  </div>
                </div>

                <div className="flex justify-center gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setStep(2)} 
                    className="text-zinc-400 hover:text-white px-5 py-2.5 font-semibold text-xs rounded-xl border border-zinc-800 hover:bg-zinc-900 transition cursor-pointer"
                  >
                    Volver
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      alert(`🚀 Campaña de difusión con plantilla "${selectedTemplate}" iniciada con éxito.`);
                      setStep(1);
                    }} 
                    className="bg-[#00c950] hover:bg-[#00a843] text-zinc-950 px-8 py-3 rounded-xl font-bold text-xs shadow-xl shadow-emerald-500/20 flex items-center gap-2 cursor-pointer transition active:scale-[0.99]"
                  >
                    <Send size={15} /> Iniciar Envío Masivo
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

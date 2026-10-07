import React, { useState } from 'react';
import { Eye, MousePointer2, TrendingUp, AlertCircle, CheckCircle2, Zap, ArrowRight, Layout, Activity, Clock } from 'lucide-react';

export default function RastreadorVisitas() {
  const [isApplying, setIsApplying] = useState(false);
  const [applied, setApplied] = useState(false);

  const handleApplyImprovements = () => {
    setIsApplying(true);
    setTimeout(() => {
      setIsApplying(false);
      setApplied(true);
    }, 2500);
  };

  return (
    <div className="space-y-6 animate-fade-in text-gray-200">
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Eye className="text-blue-500" />
          Rastreador de Visitas & Mapa de Calor IA
        </h2>
        <p className="text-sm text-gray-400 mt-1 max-w-2xl">
          Visualiza el comportamiento de tus usuarios, dónde hacen clic, dónde abandonan y recibe sugerencias automáticas de optimización de conversión (CRO) para tu plantilla.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Main Analytics Panel */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="panel p-4 rounded-xl border border-gray-800 bg-[#0a0a0a]">
              <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase mb-2">
                <Activity size={14} className="text-blue-400" /> Tasa de Rebote
              </div>
              <p className="text-2xl font-black font-mono text-white">68.4%</p>
              <p className="text-[10px] text-red-400 font-bold mt-1">↑ +5% (Requiere atención)</p>
            </div>
            <div className="panel p-4 rounded-xl border border-gray-800 bg-[#0a0a0a]">
              <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase mb-2">
                <MousePointer2 size={14} className="text-emerald-400" /> CTR del Botón
              </div>
              <p className="text-2xl font-black font-mono text-white">3.2%</p>
              <p className="text-[10px] text-orange-400 font-bold mt-1">Promedio</p>
            </div>
            <div className="panel p-4 rounded-xl border border-gray-800 bg-[#0a0a0a]">
              <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase mb-2">
                <Clock size={14} className="text-blue-400" /> Tiempo Promedio
              </div>
              <p className="text-2xl font-black font-mono text-white">00:45</p>
              <p className="text-[10px] text-gray-500 font-bold mt-1">Minutos</p>
            </div>
          </div>

          <div className="panel p-6 rounded-2xl border border-gray-800 bg-[#0a0a0a] relative overflow-hidden">
            <h3 className="text-sm font-bold text-white mb-4">Análisis de Comportamiento (Mapa de Calor)</h3>
            <div className="w-full aspect-[16/9] bg-gray-900 rounded-lg border border-gray-800 relative overflow-hidden flex items-center justify-center group">
              {/* Fake Landing Background */}
              <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1460925895917-afdab827c52f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80')] bg-cover bg-center opacity-20"></div>

              {/* Heatmap overlay simulation */}
              <div className="absolute top-[20%] left-[10%] w-32 h-32 bg-red-500/40 rounded-full blur-3xl"></div>
              <div className="absolute top-[40%] right-[20%] w-40 h-40 bg-yellow-500/30 rounded-full blur-3xl"></div>
              <div className="absolute bottom-[20%] left-[30%] w-24 h-24 bg-blue-500/40 rounded-full blur-2xl"></div>

              {/* Data points */}
              <div className="absolute top-[25%] left-[15%] flex flex-col items-center animate-bounce">
                <div className="w-4 h-4 bg-red-500 rounded-full shadow-[0_0_15px_rgba(239,68,68,0.8)] border-2 border-white"></div>
                <div className="mt-2 px-2 py-1 bg-black/80 rounded text-[9px] font-bold text-white border border-red-500/50">
                  Alto interés en Título
                </div>
              </div>

              <div className="absolute top-[45%] right-[25%] flex flex-col items-center">
                <div className="w-4 h-4 bg-yellow-500 rounded-full shadow-[0_0_15px_rgba(234,179,8,0.8)] border-2 border-white"></div>
                <div className="mt-2 px-2 py-1 bg-black/80 rounded text-[9px] font-bold text-white border border-yellow-500/50">
                  Fuga en Formulario (45%)
                </div>
              </div>

              <div className="absolute bottom-[25%] left-[35%] flex flex-col items-center">
                <div className="w-4 h-4 bg-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.8)] border-2 border-white"></div>
                <div className="mt-2 px-2 py-1 bg-black/80 rounded text-[9px] font-bold text-white border border-blue-500/50">
                  Click fallido en CTA secundario
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Recommendations Panel */}
        <div className="space-y-6">
          <div className="panel p-6 rounded-2xl border border-blue-500/20 bg-[#0a0a0a] shadow-[0_0_20px_rgba(59,130,246,0.05)] relative overflow-hidden h-full flex flex-col">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>

            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
              <Zap className="text-blue-400" size={18} />
              Mejoras IA Recomendadas
            </h3>

            <div className="flex-1 space-y-4">
              <div className="p-3 bg-red-500/5 border border-red-500/20 rounded-xl space-y-2">
                <div className="flex items-start gap-2">
                  <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-red-400">Punto de Fuga Detectado</p>
                    <p className="text-[11px] text-gray-400 leading-relaxed">
                      El 45% de los usuarios abandona al llegar al formulario de contacto porque solicita demasiados campos.
                    </p>
                  </div>
                </div>
                <div className="pt-2 border-t border-red-500/10">
                  <p className="text-[11px] text-gray-300"><span className="text-emerald-400 font-bold">Solución propuesta:</span> Ocultar campos opcionales y cambiar botón a color naranja para generar urgencia.</p>
                </div>
              </div>

              <div className="p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-xl space-y-2">
                <div className="flex items-start gap-2">
                  <TrendingUp size={14} className="text-yellow-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-yellow-400">Oportunidad de Click</p>
                    <p className="text-[11px] text-gray-400 leading-relaxed">
                      Muchos usuarios intentan hacer click en la imagen del producto pero no está enlazada al CTA de compra.
                    </p>
                  </div>
                </div>
                <div className="pt-2 border-t border-yellow-500/10">
                  <p className="text-[11px] text-gray-300"><span className="text-emerald-400 font-bold">Solución propuesta:</span> Envolver la imagen principal con el enlace de Checkout.</p>
                </div>
              </div>
            </div>

            <div className="pt-6 mt-4 border-t border-gray-800">
              {applied ? (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center">
                  <CheckCircle2 size={24} className="text-emerald-400 mx-auto mb-2" />
                  <p className="text-xs font-bold text-emerald-400">¡Plantilla Optimizada!</p>
                  <p className="text-[10px] text-gray-500">Los cambios han sido aplicados automáticamente a la plantilla activa.</p>
                </div>
              ) : (
                <button
                  onClick={handleApplyImprovements}
                  disabled={isApplying}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                >
                  {isApplying ? (
                    <><Zap className="animate-spin" size={16} /> Aplicando cambios...</>
                  ) : (
                    <><Layout size={16} /> Aplicar Mejoras a la Plantilla</>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

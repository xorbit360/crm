import React, { useState } from 'react';
import { Send, Upload, Users, FileText, CheckCircle2 } from 'lucide-react';

export default function CampanasView() {
  const [step, setStep] = useState(1);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
          <Send className="text-gold" /> Campañas Masivas
        </h2>
        <p className="text-gray-400 text-sm mt-1">Envía mensajes de WhatsApp de forma masiva usando plantillas aprobadas.</p>
      </div>

      <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 overflow-hidden">
         <div className="flex border-b border-gray-800">
            <div className={`flex-1 p-4 text-center text-sm font-bold ${step >= 1 ? 'text-gold border-b-2 border-gold' : 'text-gray-500'}`}>1. Audiencia</div>
            <div className={`flex-1 p-4 text-center text-sm font-bold ${step >= 2 ? 'text-gold border-b-2 border-gold' : 'text-gray-500'}`}>2. Plantilla</div>
            <div className={`flex-1 p-4 text-center text-sm font-bold ${step >= 3 ? 'text-gold border-b-2 border-gold' : 'text-gray-500'}`}>3. Resumen</div>
         </div>

         <div className="p-6">
            {step === 1 && (
               <div className="space-y-6">
                  <h3 className="font-bold text-gray-200">Seleccionar o cargar usuarios</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <button className="p-6 border-2 border-dashed border-gray-700 hover:border-gold rounded-xl flex flex-col items-center justify-center gap-3 transition-colors text-gray-400 hover:text-gold">
                        <Users size={32} />
                        <span className="font-semibold text-sm">Seleccionar de Base de Datos</span>
                     </button>
                     <button className="p-6 border-2 border-dashed border-gray-700 hover:border-gold rounded-xl flex flex-col items-center justify-center gap-3 transition-colors text-gray-400 hover:text-gold">
                        <Upload size={32} />
                        <span className="font-semibold text-sm">Subir Excel/CSV</span>
                     </button>
                  </div>
                  <div className="flex justify-end mt-6">
                     <button onClick={() => setStep(2)} className="bg-gold text-black px-6 py-2 rounded-lg font-bold">Continuar</button>
                  </div>
               </div>
            )}

            {step === 2 && (
               <div className="space-y-6">
                  <h3 className="font-bold text-gray-200">Seleccionar Plantilla de WhatsApp</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {['Promo Black Friday', 'Invitación Evento', 'Lanzamiento Producto'].map((tpl, i) => (
                       <label key={i} className="flex items-start gap-3 p-4 border border-gray-700 rounded-xl cursor-pointer hover:bg-gray-900">
                          <input type="radio" name="plantilla" className="mt-1" />
                          <div>
                             <p className="font-bold text-sm text-white flex items-center gap-2"><FileText size={14} className="text-gold" /> {tpl}</p>
                             <p className="text-xs text-gray-500 mt-1 line-clamp-2">Hola {"{{1}}"}, tenemos una oferta especial para ti...</p>
                          </div>
                       </label>
                     ))}
                  </div>
                  <div className="flex justify-between mt-6">
                     <button onClick={() => setStep(1)} className="text-gray-400 hover:text-white px-6 py-2 font-bold">Atrás</button>
                     <button onClick={() => setStep(3)} className="bg-gold text-black px-6 py-2 rounded-lg font-bold">Continuar</button>
                  </div>
               </div>
            )}

            {step === 3 && (
               <div className="space-y-6 text-center">
                  <div className="flex justify-center mb-4">
                     <div className="w-16 h-16 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center">
                        <CheckCircle2 size={32} />
                     </div>
                  </div>
                  <h3 className="font-bold text-xl text-gray-100">Campaña Lista</h3>
                  <p className="text-gray-400 text-sm max-w-md mx-auto">Estás a punto de enviar la plantilla "Promo Black Friday" a 1,250 usuarios seleccionados.</p>
                  
                  <div className="flex justify-center gap-4 mt-8">
                     <button onClick={() => setStep(2)} className="text-gray-400 hover:text-white px-6 py-2 font-bold">Volver</button>
                     <button onClick={() => alert('¡Campaña iniciada!')} className="bg-gold text-black px-8 py-3 rounded-lg font-bold shadow-lg shadow-gold/20 flex items-center gap-2">
                        <Send size={18} /> Iniciar Campaña
                     </button>
                  </div>
               </div>
            )}
         </div>
      </div>
    </div>
  );
}

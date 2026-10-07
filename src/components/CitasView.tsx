import React, { useState } from 'react';
import { Calendar, Clock, Bell, Settings2, Plus, CalendarDays, List } from 'lucide-react';

export default function CitasView() {
  const [view, setView] = useState<'lista' | 'calendario'>('lista');

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
            <Calendar className="text-gold" /> Citas y Reservas
          </h2>
          <p className="text-gray-400 text-sm mt-1">Gestiona las citas programadas y configura los recordatorios automáticos.</p>
        </div>
        <div className="flex gap-2 bg-gray-900 p-1 rounded-lg">
           <button onClick={() => setView('lista')} className={`p-2 rounded ${view === 'lista' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-white'}`}>
              <List size={18} />
           </button>
           <button onClick={() => setView('calendario')} className={`p-2 rounded ${view === 'calendario' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-white'}`}>
              <CalendarDays size={18} />
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         <div className="lg:col-span-2 space-y-4">
            <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 overflow-hidden">
               <div className="p-4 border-b border-gray-800 bg-black/50 flex justify-between items-center">
                  <h3 className="font-bold text-gray-100">Próximas Citas</h3>
                  <button className="bg-gold text-black px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-yellow-400">
                    <Plus size={14} /> Nueva Cita
                  </button>
               </div>
               {view === 'lista' ? (
                 <div className="divide-y divide-gray-800">
                    {[1,2,3].map(i => (
                       <div key={i} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-900/50 transition-colors">
                          <div className="flex items-center gap-4">
                             <div className="bg-gray-800 text-center rounded-lg p-2 min-w-[60px]">
                                <p className="text-xs text-gray-400 uppercase">Oct</p>
                                <p className="text-lg font-bold text-white">{10 + i}</p>
                             </div>
                             <div>
                                <h4 className="font-bold text-sm text-gray-200">Reunión con Cliente {i}</h4>
                                <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                                   <span className="flex items-center gap-1"><Clock size={12} /> 10:00 AM</span>
                                   <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full">Confirmada</span>
                                </div>
                             </div>
                          </div>
                          <button className="text-xs border border-gray-700 px-3 py-1.5 rounded hover:bg-gray-800 text-gray-300">
                             Ver Detalles
                          </button>
                       </div>
                    ))}
                 </div>
               ) : (
                 <div className="p-8 text-center text-gray-500 text-sm">
                    Vista de calendario en construcción...
                 </div>
               )}
            </div>
         </div>

         <div className="space-y-4">
            <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 p-6">
               <h3 className="font-bold text-gray-100 flex items-center gap-2 mb-4">
                  <Bell className="text-gold" /> Configuración de Recordatorios
               </h3>
               <p className="text-xs text-gray-400 mb-4">Envía mensajes automáticos por WhatsApp antes de la cita.</p>

               <div className="space-y-4">
                  <div className="space-y-2 border-b border-gray-800 pb-4">
                     <label className="flex items-center justify-between">
                        <span className="text-sm text-gray-300">Recordatorio 24h antes</span>
                        <input type="checkbox" className="w-4 h-4 rounded text-gold bg-gray-800 border-gray-700 focus:ring-gold" defaultChecked />
                     </label>
                     <select className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-xs text-gray-300">
                        <option>Plantilla: "Cita_Manana"</option>
                     </select>
                  </div>

                  <div className="space-y-2 pb-2">
                     <label className="flex items-center justify-between">
                        <span className="text-sm text-gray-300">Recordatorio 30m antes</span>
                        <input type="checkbox" className="w-4 h-4 rounded text-gold bg-gray-800 border-gray-700 focus:ring-gold" defaultChecked />
                     </label>
                     <select className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-xs text-gray-300">
                        <option>Plantilla: "Cita_Pronto"</option>
                     </select>
                  </div>

                  <button className="w-full flex items-center justify-center gap-2 bg-gray-800 text-white text-xs font-semibold py-2 rounded-lg hover:bg-gray-700 transition">
                     <Settings2 size={14} /> Ajustes Avanzados
                  </button>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}

import React from 'react';
import { HeartHandshake, Filter, Users, Calendar, Plus, MessageSquare } from 'lucide-react';

export default function FidelizacionView() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
          <HeartHandshake className="text-gold" /> Fidelización
        </h2>
        <p className="text-gray-400 text-sm mt-1">Configura mensajes automáticos para retener y premiar a tus clientes.</p>
      </div>

      <div className="bg-[#1a1a1a] p-6 rounded-xl border border-gray-800 space-y-4">
        <h3 className="font-bold text-gray-100 border-b border-gray-800 pb-2">Filtros de Segmentación</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
           <div>
             <label className="block text-xs text-gray-400 mb-1">Tipo de Cliente</label>
             <select className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-sm text-gray-200">
               <option>Todos</option>
               <option>Cliente Nuevo</option>
               <option>Cliente Recurrente</option>
             </select>
           </div>
           <div>
             <label className="block text-xs text-gray-400 mb-1">Producto Comprado</label>
             <select className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-sm text-gray-200">
               <option>Cualquier producto</option>
               <option>Producto A</option>
               <option>Producto B</option>
             </select>
           </div>
           <div className="flex items-end">
             <button className="w-full bg-gray-800 text-gray-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 flex items-center justify-center gap-2">
               <Filter size={16} /> Aplicar Filtros
             </button>
           </div>
        </div>
      </div>

      <div className="bg-[#1a1a1a] p-6 rounded-xl border border-gray-800 space-y-4">
        <div className="flex items-center justify-between border-b border-gray-800 pb-4">
           <h3 className="font-bold text-gray-100">Reglas de Fidelización (Plantillas)</h3>
           <button className="bg-gold text-black px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-yellow-400">
             <Plus size={14} /> Nueva Regla
           </button>
        </div>

        <div className="space-y-3">
           <div className="bg-gray-900 p-4 rounded-lg border border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                 <p className="font-bold text-sm text-white flex items-center gap-2">
                    <Calendar size={14} className="text-gold" /> Enviar a los 7 días de la compra
                 </p>
                 <p className="text-xs text-gray-500 mt-1">Aplica a: Clientes Nuevos • Cualquier producto</p>
              </div>
              <div className="flex items-center gap-3">
                 <div className="px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded text-xs flex items-center gap-1">
                    <MessageSquare size={12} /> Plantilla: "Agradecimiento_y_Descuento"
                 </div>
                 <button className="text-xs text-gold hover:underline">Editar</button>
              </div>
           </div>

           <div className="bg-gray-900 p-4 rounded-lg border border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                 <p className="font-bold text-sm text-white flex items-center gap-2">
                    <Calendar size={14} className="text-gold" /> Enviar a los 30 días de la compra
                 </p>
                 <p className="text-xs text-gray-500 mt-1">Aplica a: Clientes Recurrentes • Producto A</p>
              </div>
              <div className="flex items-center gap-3">
                 <div className="px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded text-xs flex items-center gap-1">
                    <MessageSquare size={12} /> Plantilla: "Recompra_Promo"
                 </div>
                 <button className="text-xs text-gold hover:underline">Editar</button>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

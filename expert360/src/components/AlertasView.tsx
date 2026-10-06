
import React, { useState } from 'react';
import { Bell, Plus, Trash2, Smartphone, Save, X } from 'lucide-react';

export default function AlertasView() {
  const [alerts, setAlerts] = useState([
    { id: 1, trigger: 'Venta realizada', action: 'WhatsApp', target: '573001234567', active: true }
  ]);
  const [isAdding, setIsAdding] = useState(false);
  const [newAlert, setNewAlert] = useState({ trigger: 'Venta realizada', action: 'WhatsApp', target: '' });

  const handleAddAlert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAlert.target) return;
    
    setAlerts([...alerts, {
      id: Date.now(),
      trigger: newAlert.trigger,
      action: newAlert.action,
      target: newAlert.target,
      active: true
    }]);
    setNewAlert({ trigger: 'Venta realizada', action: 'WhatsApp', target: '' });
    setIsAdding(false);
  };

  const removeAlert = (id: number) => {
    setAlerts(alerts.filter(a => a.id !== id));
  };

  const toggleAlert = (id: number) => {
    setAlerts(alerts.map(a => a.id === id ? { ...a, active: !a.active } : a));
  };

  return (
    <div className="p-6 bg-black/50 border border-gray-800 rounded-2xl animate-fade-in">
      <div className="flex items-center justify-between mb-6 border-b border-gray-800 pb-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-500">
            <Bell size={20} />
          </div>
          Configuración de Alertas
        </h2>
        {!isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-yellow-500 hover:bg-yellow-400 text-black px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2"
          >
            <Plus size={16} /> Nueva Alerta
          </button>
        )}
      </div>

      {isAdding && (
        <div className="bg-[#111] border border-gray-800 rounded-xl p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-white text-sm">Crear Nueva Alerta</h3>
            <button onClick={() => setIsAdding(false)} className="text-gray-500 hover:text-white">
              <X size={16} />
            </button>
          </div>
          <form onSubmit={handleAddAlert} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Evento (Trigger)</label>
                <select 
                  value={newAlert.trigger}
                  onChange={e => setNewAlert({...newAlert, trigger: e.target.value})}
                  className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-yellow-500 focus:outline-none"
                >
                  <option>Venta realizada</option>
                  <option>Stock bajo</option>
                  <option>Nuevo lead</option>
                  <option>Error de integración</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Acción</label>
                <select 
                  value={newAlert.action}
                  onChange={e => setNewAlert({...newAlert, action: e.target.value})}
                  className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-yellow-500 focus:outline-none"
                >
                  <option>WhatsApp</option>
                  <option>Email</option>
                  <option>Telegram</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Destinatario</label>
                <input 
                  type="text" 
                  value={newAlert.target}
                  onChange={e => setNewAlert({...newAlert, target: e.target.value})}
                  placeholder={newAlert.action === 'Email' ? 'ejemplo@correo.com' : '+573001234567'} 
                  className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-yellow-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button 
                type="button" 
                onClick={() => setIsAdding(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-colors border border-gray-700 hover:bg-gray-800"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                className="bg-yellow-500 hover:bg-yellow-400 text-black px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2"
              >
                <Save size={16} /> Guardar Alerta
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {alerts.length === 0 && !isAdding && (
          <div className="p-8 border border-dashed border-gray-800 rounded-xl text-center">
            <p className="text-gray-400">No tienes alertas configuradas.</p>
          </div>
        )}
        
        {alerts.map(alert => (
          <div key={alert.id} className="bg-[#111] border border-gray-800 p-4 rounded-xl flex items-center justify-between group">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => toggleAlert(alert.id)}
                className={`w-10 h-6 rounded-full transition-colors relative ${alert.active ? 'bg-yellow-500' : 'bg-gray-700'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${alert.active ? 'left-5' : 'left-1'}`} />
              </button>
              <div>
                <p className="text-white font-bold text-sm">{alert.trigger}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-400 bg-black px-2 py-0.5 rounded border border-gray-800">
                    {alert.action}
                  </span>
                  <span className="text-xs text-gray-500 font-mono">
                    {alert.target}
                  </span>
                </div>
              </div>
            </div>
            <button 
              onClick={() => removeAlert(alert.id)}
              className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-red-400/10 rounded-lg"
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

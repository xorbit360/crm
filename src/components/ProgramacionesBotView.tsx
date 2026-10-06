import React, { useState } from 'react';
import { Calendar, Plus, Trash2, Bot, Play, Settings2, Link } from 'lucide-react';

export default function ProgramacionesBotView() {
  const [tasks, setTasks] = useState([
    { id: 1, title: 'Reporte de ventas diario', time: '18:00', api: 'GET /api/v1/sales/today', description: 'Envia el resumen de ventas a las 6pm' },
    { id: 2, title: 'Prompt Orquestador Principal', time: 'Sistema', api: 'INTERNAL/Orchestrator', description: 'Define la intención del usuario y la enruta a funciones específicas sin llamar IA repetidamente' },
    { id: 3, title: 'Prompt de Ventas y Embudos', time: 'Módulo', api: 'INTERNAL/Funnels', description: 'Prompt individualizado para gestionar respuestas de ventas' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', text: '¡Hola! Soy tu asistente de programaciones e integraciones. He sincronizado la plataforma para optimizar el consumo de tokens, usando Prompts Orquestadores (para enrutar) y Prompts Individuales (para ejecutar). ¿Qué deseas programar?' }
  ]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMessage = chatInput.trim();
    setChatMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setChatInput('');

    // Simulate AI response for API connection or scheduling
    setTimeout(() => {
      const lowerInput = userMessage.toLowerCase();
      let aiResponse = 'Entendido. Estoy procesando tu solicitud para configurar la programación.';
      
      if (lowerInput.includes('ventas') || lowerInput.includes('reporte')) {
        aiResponse = '¡Claro! He detectado tu solicitud de reporte de ventas. Me conectaré a la API externa mediante una solicitud GET sobre las ventas de ese día y realizaré la lógica en automático. Puedes hacerme preguntas como "¿qué ciudades vendieron más?" o "en esta semana qué día se vendió más". ¿Deseas que programe este envío diario?';
        setTasks(prev => [...prev, {
          id: Date.now(),
          title: 'Nuevo Reporte Programado',
          time: 'Automático',
          api: 'GET /api/external/sales',
          description: 'Generado desde el asistente de IA'
        }]);
      } else if (lowerInput.includes('api') || lowerInput.includes('conectar')) {
        aiResponse = 'Para conectar esa API, he preparado el endpoint y los parámetros necesarios. Enviaremos un GET/POST con los datos en formato JSON. ¿Quieres que activemos esta integración ahora?';
      }

      setChatMessages(prev => [...prev, { role: 'assistant', text: aiResponse }]);
    }, 1000);
  };

  return (
    <div className="space-y-6">
      {/* Bot Header */}
      <div className="bg-black/50 border border-gray-800 p-6 rounded-2xl flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-green-900/30 rounded-xl flex items-center justify-center border border-green-500/30 text-green-400">
            <Bot size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Asistente de Programaciones AI</h2>
            <p className="text-gray-400 text-sm">Configura tareas, CRON jobs e integraciones con APIs externas conversando.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chatbot Interface */}
        <div className="bg-black/40 border border-gray-800 rounded-2xl flex flex-col h-[500px]">
          <div className="p-4 border-b border-gray-800 bg-gray-900/50 rounded-t-2xl flex items-center gap-2">
            <Bot className="text-green-400" size={18} />
            <h3 className="font-semibold text-white">Chat de Configuración</h3>
          </div>
          
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {chatMessages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-green-600 text-white rounded-br-none' : 'bg-gray-800 text-gray-200 rounded-bl-none border border-gray-700'}`}>
                  {msg.text}
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-gray-800 bg-gray-900/30 rounded-b-2xl">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ej. Envía un reporte de ventas todos los días a las 8am..."
                className="flex-1 bg-black border border-gray-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-green-500"
              />
              <button 
                type="submit"
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-500 transition-colors"
              >
                <Play size={16} />
              </button>
            </form>
          </div>
        </div>

        {/* Task List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-white flex items-center gap-2">
              <Calendar className="text-gray-400" size={18} /> Tareas Programadas
            </h3>
            <button className="text-sm bg-gray-800 text-white px-3 py-1.5 rounded-lg border border-gray-700 flex items-center gap-1 hover:bg-gray-700">
              <Plus size={14} /> Crear Manual
            </button>
          </div>

          {tasks.map(task => (
            <div key={task.id} className="bg-black/40 border border-gray-800 p-4 rounded-xl space-y-3 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="text-red-400 hover:text-red-300 p-1 bg-red-400/10 rounded-md">
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-white">{task.title}</h4>
                  <p className="text-sm text-gray-400">{task.description}</p>
                </div>
                <div className="px-2 py-1 bg-gray-900 border border-gray-700 text-gray-300 text-xs rounded font-mono">
                  {task.time}
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-xs font-mono text-blue-400 bg-blue-900/10 p-2 rounded-lg border border-blue-900/30">
                <Link size={12} /> {task.api}
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-gray-800">
                <span className="text-[10px] uppercase font-bold text-green-500 tracking-wider flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div> Activo
                </span>
                <button className="ml-auto text-xs text-gray-400 hover:text-white flex items-center gap-1">
                  <Settings2 size={12} /> Ajustes
                </button>
              </div>
            </div>
          ))}
          
          {tasks.length === 0 && (
            <div className="p-8 border border-dashed border-gray-800 rounded-2xl text-center">
              <p className="text-gray-500 text-sm">No hay tareas programadas.</p>
              <p className="text-xs text-gray-600 mt-1">Pídele a la IA que cree una por ti.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

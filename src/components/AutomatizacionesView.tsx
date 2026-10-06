import React, { useState, useCallback, useRef } from 'react';
import { Network, Zap, Play, Save, Plus, Database, Bot as BotIcon, Activity, Webhook, MousePointer2, Calendar, Clock, Trash2, Link, History, CheckCircle2, XCircle, Search, Copy, Bell, MessageSquare, AlertTriangle } from 'lucide-react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  ReactFlowProvider,
  useReactFlow
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// ... (keep initial generic nodes and edges) ...
const initialNodes = [
  { 
    id: '1', 
    position: { x: 250, y: 50 }, 
    data: { label: '💬 Chatbot Disparador' }, 
    type: 'input',
    style: { background: '#111', color: '#fff', border: '1px solid #d4af37', borderRadius: '8px', padding: '10px' }
  },
  { 
    id: '2', 
    position: { x: 100, y: 150 }, 
    data: { label: '🧠 LLM Agent (Gemini)' },
    style: { background: '#1a1a2e', color: '#fff', border: '1px solid #4f80f0', borderRadius: '8px', padding: '10px' }
  },
  { 
    id: '3', 
    position: { x: 400, y: 150 }, 
    data: { label: '📦 Dropi Pedido POST' },
    style: { background: '#0a2e15', color: '#fff', border: '1px solid #22c55e', borderRadius: '8px', padding: '10px' }
  },
  { 
    id: '4', 
    position: { x: 250, y: 250 }, 
    data: { label: '💾 Guardar Memoria BD' },
    style: { background: '#2d1a04', color: '#fff', border: '1px solid #f97316', borderRadius: '8px', padding: '10px' }
  },
];

const initialEdges = [
  { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: '#fff' } },
  { id: 'e1-3', source: '1', target: '3', animated: true, style: { stroke: '#22c55e' } },
  { id: 'e2-4', source: '2', target: '4', style: { stroke: '#fff' } },
  { id: 'e3-4', source: '3', target: '4', style: { stroke: '#fff' } },
];

let id = 5;
const getId = () => `${id++}`;

const FlowEditor = () => {
//...

  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [workflows, setWorkflows] = useState<{ id: string; name: string; nodes: any[]; edges: any[] }[]>([
    { id: 'wf1', name: 'Flujo de Ventas Inicial', nodes: initialNodes, edges: initialEdges }
  ]);
  const [activeWorkflowId, setActiveWorkflowId] = useState('wf1');
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  
  const currentWorkflow = workflows.find(w => w.id === activeWorkflowId);

  const saveWorkflow = () => {
    setWorkflows(prev => prev.map(w => w.id === activeWorkflowId ? { ...w, nodes, edges } : w));
  };

  const createWorkflow = () => {
    const newWf = { id: `wf_${Date.now()}`, name: 'Nuevo Flujo', nodes: [], edges: [] };
    setWorkflows([...workflows, newWf]);
    setActiveWorkflowId(newWf.id);
    setNodes([]);
    setEdges([]);
  };

  const deleteWorkflow = (id: string) => {
    if (workflows.length === 1) return;
    const nextWorkflows = workflows.filter(w => w.id !== id);
    setWorkflows(nextWorkflows);
    setActiveWorkflowId(nextWorkflows[0].id);
    setNodes(nextWorkflows[0].nodes);
    setEdges(nextWorkflows[0].edges);
  };
  const { screenToFlowPosition } = useReactFlow();

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#d4af37' } } as any, eds)),
    [setEdges],
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow/type');
      const label = event.dataTransfer.getData('application/reactflow/label');
      const bgColor = event.dataTransfer.getData('application/reactflow/bgColor');
      const borderColor = event.dataTransfer.getData('application/reactflow/borderColor');

      if (typeof type === 'undefined' || !type) {
        return;
      }

      if (!reactFlowWrapper.current) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode = {
        id: getId(),
        type,
        position,
        data: { label: label },
        style: { background: bgColor, color: '#fff', border: `1px solid ${borderColor}`, borderRadius: '8px', padding: '10px' }
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition, setNodes],
  );

  const onDragStart = (event: React.DragEvent, nodeType: string, label: string, bgColor: string, borderColor: string) => {
    event.dataTransfer.setData('application/reactflow/type', nodeType);
    event.dataTransfer.setData('application/reactflow/label', label);
    event.dataTransfer.setData('application/reactflow/bgColor', bgColor);
    event.dataTransfer.setData('application/reactflow/borderColor', borderColor);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row gap-4 h-[500px] md:h-[600px] min-h-[500px]">
      {/* Node Library Sidebar */}
      <div className="w-full md:w-64 bg-[#0d0d0d] border border-gray-800 rounded-2xl flex flex-col overflow-hidden shrink-0">
        <div className="p-4 border-b border-gray-800 bg-[#161616]">
          <h3 className="text-sm font-bold text-white mb-1">Biblioteca de Nodos</h3>
          <p className="text-[10px] text-gray-500">Arrastra los nodos al lienzo</p>
        </div>
        <div className="p-4 flex-1 overflow-y-auto space-y-4 max-h-[150px] md:max-h-none">
          <div>
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
              <Zap size={12} /> Disparadores (Triggers)
            </h4>
            <div className="space-y-2">
              <div 
                className="bg-[#111] border border-[#d4af37] p-3 rounded-lg text-xs text-white cursor-grab active:cursor-grabbing hover:bg-[#1a1a1a] transition-colors flex items-center gap-2"
                onDragStart={(event) => onDragStart(event, 'input', '💬 Webhook / Bot', '#111', '#d4af37')}
                draggable
              >
                <Webhook size={14} className="text-[#d4af37] shrink-0" /> <span className="truncate">Webhook / Bot</span>
              </div>
              <div 
                className="bg-[#111] border border-blue-500 p-3 rounded-lg text-xs text-white cursor-grab active:cursor-grabbing hover:bg-[#1a1a1a] transition-colors flex items-center gap-2"
                onDragStart={(event) => onDragStart(event, 'input', '⏱️ Cron (Reloj)', '#111', '#3b82f6')}
                draggable
              >
                <Activity size={14} className="text-blue-500 shrink-0" /> <span className="truncate">Cron (Programado)</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
              <BotIcon size={12} /> Inteligencia Artificial
            </h4>
            <div className="space-y-2">
              <div 
                className="bg-[#1a1a2e] border border-indigo-500 p-3 rounded-lg text-xs text-white cursor-grab active:cursor-grabbing hover:bg-[#222240] transition-colors flex items-center gap-2"
                onDragStart={(event) => onDragStart(event, 'default', '🧠 LLM Base', '#1a1a2e', '#6366f1')}
                draggable
              >
                <BotIcon size={14} className="text-indigo-500 shrink-0" /> <span className="truncate">LLM Agent (Gemini/OpenAI)</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
              <Database size={12} /> Acciones / BDD
            </h4>
            <div className="space-y-2">
              <div 
                className="bg-[#0a2e15] border border-green-500 p-3 rounded-lg text-xs text-white cursor-grab active:cursor-grabbing hover:bg-[#0c3c1b] transition-colors flex items-center gap-2"
                onDragStart={(event) => onDragStart(event, 'default', '🌐 Petición HTTP', '#0a2e15', '#22c55e')}
                draggable
              >
                <Network size={14} className="text-green-500 shrink-0" /> <span className="truncate">Petición HTTP (API)</span>
              </div>
              <div 
                className="bg-[#2d1a04] border border-orange-500 p-3 rounded-lg text-xs text-white cursor-grab active:cursor-grabbing hover:bg-[#382005] transition-colors flex items-center gap-2"
                onDragStart={(event) => onDragStart(event, 'default', '💾 Operación BDD', '#2d1a04', '#f97316')}
                draggable
              >
                <Database size={14} className="text-orange-500 shrink-0" /> <span className="truncate">PostgreSQL / Supabase</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 panel rounded-2xl relative overflow-hidden bg-[#0d0d0d] min-h-[300px]" ref={reactFlowWrapper}>
        {/* Editor Wrapper */}
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDragOver={onDragOver}
          onDrop={onDrop}
          fitView
          colorMode="dark"
        >
          <Controls className="bg-gray-900 border-gray-700 !text-white" />
          <MiniMap 
             nodeStrokeColor={(n) => {
               if (n.type === 'input') return '#d4af37';
               return '#444';
             }}
             nodeColor={(n) => {
               return '#222';
             }}
             maskColor="rgba(0,0,0,0.7)"
             className="bg-black border border-gray-800 rounded-lg overflow-hidden" 
          />
          <Background gap={16} color="#333" className="opacity-40" />
        </ReactFlow>

        {/* Floating properties overlay for selected node (mockup) */}
        <div className="absolute right-4 top-4 bottom-4 w-64 bg-black/80 backdrop-blur-md border border-gray-800 rounded-xl p-4 flex flex-col shadow-2xl z-10 pointer-events-auto hidden md:flex">
           <h3 className="text-sm font-bold text-white mb-4 border-b border-gray-800 pb-2 flex items-center gap-2"><MousePointer2 size={14}/> Propiedades</h3>
           <div className="flex-1 overflow-y-auto space-y-4">
              <div>
                <label className="text-[10px] text-gray-500 uppercase mb-1 block">Nombre de Caja</label>
                <input type="text" className="w-full bg-[#161616] border border-gray-700 rounded p-2 text-xs text-white" defaultValue="Petición HTTP (API)" />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 uppercase mb-1 block">Método HTTP</label>
                <select className="w-full bg-[#161616] border border-gray-700 rounded p-2 text-xs text-white">
                   <option>GET</option>
                   <option>POST</option>
                   <option>PUT</option>
                   <option>DELETE</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-gray-500 uppercase mb-1 block">URL del Endpoint</label>
                <input type="text" className="w-full bg-[#161616] border border-gray-700 rounded p-2 text-xs text-white font-mono" defaultValue="https://api.example.com/v1/data" />
              </div>
              <div className="p-3 bg-indigo-900/10 border border-indigo-500/20 rounded-lg mt-4">
                 <h4 className="text-[10px] text-indigo-400 font-semibold mb-1 flex items-center gap-1"><Network size={12}/> Configuración de Headers</h4>
                 <p className="text-[10px] text-gray-400 mb-2">Añade credenciales de autorización o content-type.</p>
                 <button className="text-[10px] text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 px-2 py-1 rounded w-full flex items-center justify-center gap-1">
                   <Plus size={10} /> Añadir Header
                 </button>
              </div>
           </div>
           
           <div className="mt-4 pt-4 border-t border-gray-800 shrink-0">
             <button className="shrink-0 w-full bg-green-600 hover:bg-green-500 text-white font-semibold text-xs py-2 rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-green-600/20 transition-colors">
                <Play size={14} /> Ejecutar Nodo (Test)
             </button>
           </div>
        </div>
      </div>
    </div>
  );
};

const CronTasksPanel = () => {
  const [tasks, setTasks] = useState([
    { id: 1, title: 'Enviar reporte de ventas', frequency: 'Diaria (18:00)', api: 'GET /api/v1/sales/today' },
    { id: 2, title: 'Limpiar caché', frequency: 'Semanal (Domingo 00:00)', api: 'POST /api/v1/system/clean' }
  ]);
  const [newTask, setNewTask] = useState({ title: '', frequency: 'Diaria', time: '08:00', api: '', method: 'GET' });

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title || !newTask.api) return;
    
    setTasks([...tasks, {
      id: Date.now(),
      title: newTask.title,
      frequency: `${newTask.frequency} (${newTask.time})`,
      api: `${newTask.method} ${newTask.api}`
    }]);
    setNewTask({ title: '', frequency: 'Diaria', time: '08:00', api: '', method: 'GET' });
  };

  const removeTask = (id: number) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
      <div className="lg:col-span-1 space-y-4">
        <div className="bg-[#111] border border-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Plus size={18} className="text-blue-500" /> Nueva Tarea Programada
          </h3>
          <form onSubmit={handleAddTask} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Nombre de la Tarea</label>
              <input 
                type="text" 
                value={newTask.title}
                onChange={e => setNewTask({...newTask, title: e.target.value})}
                placeholder="Ej. Enviar reporte de ventas" 
                className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Frecuencia</label>
                <select 
                  value={newTask.frequency}
                  onChange={e => setNewTask({...newTask, frequency: e.target.value})}
                  className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                >
                  <option>Diaria</option>
                  <option>Semanal</option>
                  <option>Mensual</option>
                  <option>Horaria</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Hora</label>
                <input 
                  type="time" 
                  value={newTask.time}
                  onChange={e => setNewTask({...newTask, time: e.target.value})}
                  className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Endpoint API</label>
              <div className="flex gap-2">
                <select 
                  value={newTask.method}
                  onChange={e => setNewTask({...newTask, method: e.target.value})}
                  className="w-24 bg-black border border-gray-700 rounded-lg px-2 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                >
                  <option>GET</option>
                  <option>POST</option>
                  <option>PUT</option>
                  <option>DELETE</option>
                </select>
                <input 
                  type="text" 
                  value={newTask.api}
                  onChange={e => setNewTask({...newTask, api: e.target.value})}
                  placeholder="/api/v1/endpoint" 
                  className="flex-1 bg-black border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm py-2.5 rounded-lg transition-colors mt-2">
              Programar Tarea
            </button>
          </form>
        </div>
      </div>

      <div className="lg:col-span-2 space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2 px-2">
          <Calendar size={18} className="text-gray-400" /> Tareas Programadas Activas
        </h3>
        
        {tasks.length === 0 ? (
          <div className="p-10 border border-dashed border-gray-800 rounded-2xl text-center">
            <Clock size={32} className="mx-auto text-gray-600 mb-3" />
            <p className="text-gray-400 font-medium">No hay tareas programadas</p>
            <p className="text-sm text-gray-500 mt-1">Crea una nueva tarea en el panel para comenzar.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {tasks.map((task) => (
              <div key={task.id} className="bg-[#111] border border-gray-800 rounded-xl p-4 flex items-center justify-between group">
                <div>
                  <h4 className="font-bold text-white text-sm">{task.title}</h4>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="flex items-center gap-1 text-xs text-gray-400 bg-black px-2 py-1 rounded border border-gray-800">
                      <Clock size={12} className="text-blue-400" /> {task.frequency}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-gray-400 bg-black px-2 py-1 rounded border border-gray-800 font-mono">
                      <Link size={12} className="text-green-400" /> {task.api}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => removeTask(task.id)}
                  className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-red-400/10 rounded-lg"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const CronHistoryPanel = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState('7days');

  const history = [
    { id: 1, taskTitle: 'Enviar reporte de ventas', date: '2026-07-11', time: '18:00', status: 'success', api: 'GET /api/v1/sales/today', response: '{ "status": "ok", "sales_processed": 45, "total": 12500 }' },
    { id: 2, taskTitle: 'Limpiar caché', date: '2026-07-11', time: '00:00', status: 'error', api: 'POST /api/v1/system/clean', response: '{ "error": "timeout", "message": "The request timed out after 30s" }' },
    { id: 3, taskTitle: 'Sincronizar leads', date: '2026-07-10', time: '12:00', status: 'success', api: 'POST /api/v1/leads/sync', response: '{ "status": "success", "synced": 12 }' },
    { id: 4, taskTitle: 'Enviar reporte de ventas', date: '2026-07-10', time: '18:00', status: 'success', api: 'GET /api/v1/sales/today', response: '{ "status": "ok", "sales_processed": 42, "total": 11800 }' }
  ];

  const filteredHistory = history.filter(log => 
    log.taskTitle.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <History size={18} className="text-gray-400" /> Historial de Ejecuciones
        </h3>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input 
              type="text" 
              placeholder="Buscar por nombre de tarea..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-64 bg-black border border-gray-800 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:border-blue-500 focus:outline-none transition-colors"
            />
          </div>
          <select 
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="bg-black border border-gray-800 rounded-lg px-4 py-2 text-sm text-white focus:border-blue-500 focus:outline-none transition-colors"
          >
            <option value="today">Hoy</option>
            <option value="24h">Últimas 24 horas</option>
            <option value="7days">Últimos 7 días</option>
            <option value="30days">Últimos 30 días</option>
            <option value="all">Todo el tiempo</option>
          </select>
        </div>
      </div>
      
      <div className="grid gap-3">
        {filteredHistory.length > 0 ? (
          filteredHistory.map((log) => (
            <div key={log.id} className="bg-[#111] border border-gray-800 rounded-xl p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {log.status === 'success' ? (
                      <CheckCircle2 size={20} className="text-green-500" />
                    ) : (
                      <XCircle size={20} className="text-red-500" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">{log.taskTitle}</h4>
                    <p className="text-xs text-gray-500">{log.date} {log.time} • <span className="font-mono text-gray-400">{log.api}</span></p>
                  </div>
                </div>
                <div className={`self-start sm:self-auto px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                  log.status === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}>
                  {log.status === 'success' ? 'Éxito' : 'Fallo'}
                </div>
              </div>
              
              <div className="mt-3 bg-black border border-gray-800 rounded-lg p-3">
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2">Respuesta API</p>
                <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap overflow-x-auto max-h-40">
                  {JSON.stringify(JSON.parse(log.response), null, 2)}
                </pre>
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 border border-dashed border-gray-800 rounded-xl text-center">
            <p className="text-gray-400">No se encontraron ejecuciones que coincidan con la búsqueda.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const WebhooksPanel = () => {
  const [webhooks, setWebhooks] = useState([
    { id: 1, name: 'Shopify Nuevo Pedido', url: 'https://api.expert360.ai/webhooks/shopify/1234', active: true, events: 'orders/create', payloadMapping: 'order.amount -> venta_total\norder.id -> transaction_id' },
    { id: 2, name: 'Stripe Pago Exitoso', url: 'https://api.expert360.ai/webhooks/stripe/5678', active: true, events: 'charge.succeeded', payloadMapping: 'data.object.amount -> cobro_realizado' }
  ]);
  const [newWebhook, setNewWebhook] = useState({ name: '', events: '', payloadMapping: '' });

  const handleAddWebhook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWebhook.name) return;
    
    setWebhooks([...webhooks, {
      id: Date.now(),
      name: newWebhook.name,
      url: `https://api.expert360.ai/webhooks/custom/${Date.now()}`,
      events: newWebhook.events || 'all',
      payloadMapping: newWebhook.payloadMapping,
      active: true
    }]);
    setNewWebhook({ name: '', events: '', payloadMapping: '' });
  };

  const removeWebhook = (id: number) => {
    setWebhooks(webhooks.filter(w => w.id !== id));
  };

  const toggleWebhook = (id: number) => {
    setWebhooks(webhooks.map(w => w.id === id ? { ...w, active: !w.active } : w));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
      <div className="lg:col-span-1 space-y-4">
        <div className="bg-[#111] border border-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Plus size={18} className="text-purple-500" /> Nuevo Webhook Entrante
          </h3>
          <form onSubmit={handleAddWebhook} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Nombre del Webhook</label>
              <input 
                type="text" 
                value={newWebhook.name}
                onChange={e => setNewWebhook({...newWebhook, name: e.target.value})}
                placeholder="Ej. WooCommerce Sales" 
                className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Eventos (Opcional)</label>
              <input 
                type="text" 
                value={newWebhook.events}
                onChange={e => setNewWebhook({...newWebhook, events: e.target.value})}
                placeholder="Ej. order.created" 
                className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1 flex items-center justify-between">
                <span>Mapeo de Datos (JSON)</span>
                <span className="text-[10px] bg-purple-500/10 text-purple-400 px-1.5 py-0.5 rounded border border-purple-500/20">Opcional</span>
              </label>
              <textarea 
                value={newWebhook.payloadMapping}
                onChange={e => setNewWebhook({...newWebhook, payloadMapping: e.target.value})}
                placeholder="Ej. payload.amount -> total_venta&#10;payload.customer -> cliente_id" 
                rows={3}
                className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:border-purple-500 focus:outline-none resize-none"
              />
              <p className="text-[10px] text-gray-500 mt-1">Mapea campos del JSON entrante a variables internas.</p>
            </div>

            <button type="submit" className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm py-2.5 rounded-lg transition-colors mt-2">
              Generar URL
            </button>
          </form>
        </div>
      </div>

      <div className="lg:col-span-2 space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2 px-2">
          <Webhook size={18} className="text-gray-400" /> Webhooks Activos
        </h3>
        
        {webhooks.length === 0 ? (
          <div className="p-10 border border-dashed border-gray-800 rounded-2xl text-center">
            <Webhook size={32} className="mx-auto text-gray-600 mb-3" />
            <p className="text-gray-400 font-medium">No hay webhooks configurados</p>
            <p className="text-sm text-gray-500 mt-1">Crea un nuevo webhook para recibir eventos externos.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {webhooks.map((webhook) => (
              <div key={webhook.id} className="bg-[#111] border border-gray-800 rounded-xl p-4 flex flex-col gap-3 group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => toggleWebhook(webhook.id)}
                      className={`w-10 h-6 rounded-full transition-colors relative ${webhook.active ? 'bg-purple-500' : 'bg-gray-700'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${webhook.active ? 'left-5' : 'left-1'}`} />
                    </button>
                    <div>
                      <h4 className="font-bold text-white text-sm">{webhook.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-400 bg-black px-2 py-0.5 rounded border border-gray-800">
                          {webhook.events}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => removeWebhook(webhook.id)}
                    className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-red-400/10 rounded-lg"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {webhook.payloadMapping && (
                  <div className="bg-black border border-gray-800 rounded-lg p-3 mt-1">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                      <Database size={10} /> Mapeo de Variables Activo
                    </p>
                    <pre className="text-xs text-purple-300/80 font-mono whitespace-pre-wrap">
                      {webhook.payloadMapping}
                    </pre>
                  </div>
                )}
                
                <div className="flex items-center gap-2 bg-black border border-gray-800 rounded-lg p-2 mt-1">
                  <code className="text-xs text-gray-300 flex-1 overflow-hidden text-ellipsis whitespace-nowrap font-mono">
                    {webhook.url}
                  </code>
                  <button 
                    onClick={() => copyToClipboard(webhook.url)}
                    className="text-gray-500 hover:text-white p-1.5 bg-gray-900 rounded-md transition-colors border border-gray-800"
                    title="Copiar URL"
                  >
                    <Copy size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const NotificationsPanel = () => {
  const [notifications, setNotifications] = useState([
    { id: 1, name: 'Alerta de fallo en CRON', condition: 'on_error', channel: 'whatsapp', target: '+573001234567', active: true },
    { id: 2, name: 'Reporte exitoso', condition: 'on_success', channel: 'dashboard', target: 'Admin', active: true }
  ]);
  const [newNotification, setNewNotification] = useState({ name: '', condition: 'on_error', channel: 'whatsapp', target: '' });

  const handleAddNotification = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNotification.name || !newNotification.target) return;
    
    setNotifications([...notifications, {
      id: Date.now(),
      name: newNotification.name,
      condition: newNotification.condition,
      channel: newNotification.channel,
      target: newNotification.target,
      active: true
    }]);
    setNewNotification({ name: '', condition: 'on_error', channel: 'whatsapp', target: '' });
  };

  const removeNotification = (id: number) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const toggleNotification = (id: number) => {
    setNotifications(notifications.map(n => n.id === id ? { ...n, active: !n.active } : n));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
      <div className="lg:col-span-1 space-y-4">
        <div className="bg-[#111] border border-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Bell size={18} className="text-pink-500" /> Nueva Notificación
          </h3>
          <form onSubmit={handleAddNotification} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Nombre</label>
              <input 
                type="text" 
                value={newNotification.name}
                onChange={e => setNewNotification({...newNotification, name: e.target.value})}
                placeholder="Ej. Alerta CRON Ventas" 
                className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-pink-500 focus:outline-none"
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Condición</label>
              <select 
                value={newNotification.condition}
                onChange={e => setNewNotification({...newNotification, condition: e.target.value})}
                className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-pink-500 focus:outline-none"
              >
                <option value="on_error">Cuando falle una tarea</option>
                <option value="on_success">Éxito en integración/flujo</option>
                <option value="always">Siempre</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Canal de Envío</label>
              <select 
                value={newNotification.channel}
                onChange={e => setNewNotification({...newNotification, channel: e.target.value})}
                className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-pink-500 focus:outline-none"
              >
                <option value="whatsapp">WhatsApp</option>
                <option value="email">Email</option>
                <option value="messenger">Messenger</option>
                <option value="push">Notificación Push (App/Web)</option>
                <option value="dashboard">Alerta en Dashboard</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Destinatario / Canal ID</label>
              <input 
                type="text" 
                value={newNotification.target}
                onChange={e => setNewNotification({...newNotification, target: e.target.value})}
                placeholder={newNotification.channel === 'whatsapp' ? '+57...' : newNotification.channel === 'email' ? 'admin@empresa.com' : 'Usuario'} 
                className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-pink-500 focus:outline-none"
              />
            </div>

            <button type="submit" className="w-full bg-pink-600 hover:bg-pink-500 text-white font-bold text-sm py-2.5 rounded-lg transition-colors mt-2">
              Crear Regla
            </button>
          </form>
        </div>
      </div>

      <div className="lg:col-span-2 space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2 px-2">
          <MessageSquare size={18} className="text-gray-400" /> Reglas Activas
        </h3>
        
        {notifications.length === 0 ? (
          <div className="p-10 border border-dashed border-gray-800 rounded-2xl text-center">
            <Bell size={32} className="mx-auto text-gray-600 mb-3" />
            <p className="text-gray-400 font-medium">No hay notificaciones configuradas</p>
            <p className="text-sm text-gray-500 mt-1">Crea una regla para recibir alertas de tus flujos.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {notifications.map((notification) => (
              <div key={notification.id} className="bg-[#111] border border-gray-800 rounded-xl p-4 flex flex-col gap-3 group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => toggleNotification(notification.id)}
                      className={`w-10 h-6 rounded-full transition-colors relative ${notification.active ? 'bg-pink-500' : 'bg-gray-700'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${notification.active ? 'left-5' : 'left-1'}`} />
                    </button>
                    <div>
                      <h4 className="font-bold text-white text-sm">{notification.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded border ${
                          notification.condition === 'on_error' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                          notification.condition === 'on_success' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                          'bg-blue-500/10 text-blue-400 border-blue-500/20'
                        }`}>
                          {notification.condition === 'on_error' ? 'Si Falla' : notification.condition === 'on_success' ? 'Si es Exitoso' : 'Siempre'}
                        </span>
                        <span className="text-xs text-gray-400 bg-black px-2 py-0.5 rounded border border-gray-800 flex items-center gap-1">
                          {notification.channel === 'whatsapp' ? <MessageSquare size={10} /> : notification.channel === 'email' ? '@' : notification.channel === 'messenger' ? <MessageSquare size={10} /> : notification.channel === 'push' ? <Bell size={10} /> : <AlertTriangle size={10} />}
                          {notification.channel}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => removeNotification(notification.id)}
                    className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-red-400/10 rounded-lg"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                
                <div className="flex items-center gap-2 bg-black border border-gray-800 rounded-lg p-2 mt-1">
                  <span className="text-xs text-gray-500 font-bold uppercase">Destino:</span>
                  <code className="text-xs text-gray-300 flex-1 overflow-hidden text-ellipsis whitespace-nowrap font-mono">
                    {notification.target}
                  </code>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default function AutomatizacionesView() {
  const [activeTab, setActiveTab] = useState<'flow' | 'cron' | 'history' | 'webhooks' | 'notifications'>('flow');

  return (
    <div className="animate-fade-in flex flex-col h-full space-y-4">
      <div className="flex items-center justify-between border-b border-gray-800 pb-4 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Network size={20} />
          </div>
          <div>
            <h2 className="text-xl font-display text-white">Automatizaciones</h2>
            <p className="text-xs text-gray-500 uppercase tracking-widest">Flow Studio y Tareas Programadas</p>
          </div>
        </div>
        <div className="flex gap-2">
          {activeTab === 'flow' && (
            <button className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
              <Save size={14} /> Guardar Flujo
            </button>
          )}
        </div>
      </div>
      
      <div className="flex gap-4 border-b border-gray-800 overflow-x-auto no-scrollbar pb-1">
        <button
          onClick={() => setActiveTab('flow')}
          className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
            activeTab === 'flow' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-gray-500 hover:text-gray-300'
          }`}
        >
          Flujo Visual
        </button>
        <button
          onClick={() => setActiveTab('cron')}
          className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
            activeTab === 'cron' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-300'
          }`}
        >
          Tareas Programadas (CRON)
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
            activeTab === 'history' ? 'border-green-500 text-green-400' : 'border-transparent text-gray-500 hover:text-gray-300'
          }`}
        >
          Historial de Ejecuciones
        </button>
        <button
          onClick={() => setActiveTab('webhooks')}
          className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
            activeTab === 'webhooks' ? 'border-purple-500 text-purple-400' : 'border-transparent text-gray-500 hover:text-gray-300'
          }`}
        >
          Webhooks Entrantes
        </button>
        <button
          onClick={() => setActiveTab('notifications')}
          className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
            activeTab === 'notifications' ? 'border-pink-500 text-pink-400' : 'border-transparent text-gray-500 hover:text-gray-300'
          }`}
        >
          Notificaciones
        </button>
      </div>

      <div className="flex-1 overflow-hidden">
        {activeTab === 'flow' ? (
          <ReactFlowProvider>
            <FlowEditor />
          </ReactFlowProvider>
        ) : activeTab === 'cron' ? (
          <div className="h-full overflow-y-auto">
            <CronTasksPanel />
          </div>
        ) : activeTab === 'history' ? (
          <div className="h-full overflow-y-auto">
            <CronHistoryPanel />
          </div>
        ) : activeTab === 'webhooks' ? (
          <div className="h-full overflow-y-auto">
            <WebhooksPanel />
          </div>
        ) : (
          <div className="h-full overflow-y-auto">
            <NotificationsPanel />
          </div>
        )}
      </div>
    </div>
  );
}

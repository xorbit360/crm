import React, { useState } from 'react';
import { HelpCircle, Plus, Send, CheckCircle2, Clock, AlertCircle, MessageSquare, Paperclip, Search, Filter } from 'lucide-react';

export interface Ticket {
  id: string;
  subject: string;
  category: 'tecnico' | 'facturacion' | 'sugerencia' | 'integracion' | 'otro';
  priority: 'baja' | 'media' | 'alta' | 'urgente';
  status: 'abierto' | 'en_proceso' | 'resuelto';
  createdAt: string;
  updatedAt: string;
  description: string;
  messages: {
    sender: 'user' | 'agent' | 'admin';
    name: string;
    text: string;
    time: string;
  }[];
}

const initialTickets: Ticket[] = [
  {
    id: 'TCK-8921',
    subject: 'Problema al sincronizar webhook de WhatsApp Business',
    category: 'integracion',
    priority: 'alta',
    status: 'en_proceso',
    createdAt: '2026-07-28 14:30',
    updatedAt: '2026-07-28 15:10',
    description: 'Generé el token permanente en Meta for Developers pero me sale error HTTP 403 al recibir mensajes en vivo.',
    messages: [
      { sender: 'user', name: 'Oscar Molina', text: 'Generé el token permanente en Meta for Developers pero me sale error HTTP 403 al recibir mensajes en vivo.', time: '14:30' },
      { sender: 'agent', name: 'Soporte Agente Xorbit 360', text: '¡Hola Oscar! Revisa que la URL del Webhook termine en /api/whatsapp/webhook y contenga la clave de verificación configurada.', time: '14:45' }
    ]
  },
  {
    id: 'TCK-8904',
    subject: 'Solicitud de verificación de CNAME en dominio personalizado',
    category: 'tecnico',
    priority: 'media',
    status: 'resuelto',
    createdAt: '2026-07-25 09:12',
    updatedAt: '2026-07-25 11:00',
    description: 'Apunté ofertas.midominio.com hacia crm.xorbit360.com, quisiera confirmar si el certificado SSL ya está activo.',
    messages: [
      { sender: 'user', name: 'Laura Gómez', text: 'Apunté ofertas.midominio.com hacia crm.xorbit360.com, quisiera confirmar si el certificado SSL ya está activo.', time: '09:12' },
      { sender: 'admin', name: 'Soporte Técnico Xorbit 360', text: 'Verificación completada. Tu certificado SSL Let\'s Encrypt de 256-bit fue emitido con éxito.', time: '11:00' }
    ]
  }
];

export default function SoporteTicketsView() {
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets);
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(tickets[0]);
  const [showNewModal, setShowNewModal] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // New ticket form
  const [newSubject, setNewSubject] = useState('');
  const [newCategory, setNewCategory] = useState<Ticket['category']>('tecnico');
  const [newPriority, setNewPriority] = useState<Ticket['priority']>('media');
  const [newDescription, setNewDescription] = useState('');

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim() || !newDescription.trim()) return;

    const created: Ticket = {
      id: 'TCK-' + Math.floor(1000 + Math.random() * 9000),
      subject: newSubject,
      category: newCategory,
      priority: newPriority,
      status: 'abierto',
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      description: newDescription,
      messages: [
        {
          sender: 'user',
          name: 'Usuario Actual',
          text: newDescription,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]
    };

    setTickets([created, ...tickets]);
    setActiveTicket(created);
    setShowNewModal(false);
    setNewSubject('');
    setNewDescription('');
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !activeTicket) return;

    const newMessage = {
      sender: 'user' as const,
      name: 'Usuario Actual',
      text: replyText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const updated = {
      ...activeTicket,
      messages: [...activeTicket.messages, newMessage],
      updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };

    setActiveTicket(updated);
    setTickets(tickets.map(t => t.id === updated.id ? updated : t));
    setReplyText('');
  };

  const getStatusBadge = (status: Ticket['status']) => {
    switch (status) {
      case 'abierto':
        return <span className="px-2.5 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full text-xs font-bold flex items-center gap-1"><Clock size={12} /> Abierto</span>;
      case 'en_proceso':
        return <span className="px-2.5 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full text-xs font-bold flex items-center gap-1"><AlertCircle size={12} /> En Proceso</span>;
      case 'resuelto':
        return <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-xs font-bold flex items-center gap-1"><CheckCircle2 size={12} /> Resuelto</span>;
    }
  };

  const getPriorityBadge = (priority: Ticket['priority']) => {
    switch (priority) {
      case 'urgente': return <span className="text-[10px] bg-red-950 text-red-400 px-2 py-0.5 rounded font-black border border-red-800">URGENTE</span>;
      case 'alta': return <span className="text-[10px] bg-amber-950 text-amber-400 px-2 py-0.5 rounded font-black border border-amber-800">ALTA</span>;
      case 'media': return <span className="text-[10px] bg-blue-950 text-blue-400 px-2 py-0.5 rounded font-black border border-blue-800">MEDIA</span>;
      case 'baja': return <span className="text-[10px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded font-black">BAJA</span>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner */}
      <div className="panel p-6 rounded-2xl border border-gray-800 bg-gradient-to-r from-gray-900 via-gray-900 to-amber-950/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <HelpCircle size={26} />
          </div>
          <div>
            <h2 className="text-2xl font-bold font-display text-white">Centro de Soporte & Tickets</h2>
            <p className="text-gray-400 text-xs mt-0.5">
              ¿Tienes dudas o inconsistencias? Envía un ticket y nuestro equipo de soporte atenderá tu caso inmediatamente.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="px-5 py-3 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs rounded-xl transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <Plus size={18} /> Crear Nuevo Ticket
        </button>
      </div>

      {/* Main Ticket Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Ticket List Panel */}
        <div className="lg:col-span-5 space-y-4">
          <div className="panel p-4 rounded-2xl border border-gray-800 bg-black/40 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 text-gray-500" size={16} />
              <input
                type="text"
                placeholder="Buscar por asunto o ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-black border border-gray-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
              {tickets
                .filter(t => t.subject.toLowerCase().includes(searchQuery.toLowerCase()) || t.id.toLowerCase().includes(searchQuery.toLowerCase()))
                .map(t => (
                  <div
                    key={t.id}
                    onClick={() => setActiveTicket(t)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      activeTicket?.id === t.id
                        ? 'bg-amber-500/10 border-amber-500/50 shadow-md'
                        : 'bg-gray-900/60 border-gray-800/80 hover:bg-gray-800/50'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[11px] font-mono text-amber-400 font-bold">{t.id}</span>
                      <div className="flex items-center gap-1.5">
                        {getPriorityBadge(t.priority)}
                        {getStatusBadge(t.status)}
                      </div>
                    </div>

                    <h4 className="font-bold text-white text-xs line-clamp-1 mb-1">{t.subject}</h4>
                    <p className="text-[11px] text-gray-400 line-clamp-2">{t.description}</p>

                    <div className="mt-3 pt-2 border-t border-gray-800/60 flex items-center justify-between text-[10px] text-gray-500">
                      <span>Categoría: <strong className="text-gray-300 capitalize">{t.category}</strong></span>
                      <span>{t.updatedAt}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Ticket Detail / Thread Panel */}
        <div className="lg:col-span-7">
          {activeTicket ? (
            <div className="panel p-6 rounded-2xl border border-gray-800 bg-black/40 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-800 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-amber-400 font-bold">{activeTicket.id}</span>
                    <span className="text-xs text-gray-500">• Creado: {activeTicket.createdAt}</span>
                  </div>
                  <h3 className="text-lg font-bold text-white">{activeTicket.subject}</h3>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {getStatusBadge(activeTicket.status)}
                  {getPriorityBadge(activeTicket.priority)}
                </div>
              </div>

              {/* Message History */}
              <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                {activeTicket.messages.map((m, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-2xl border space-y-1.5 ${
                      m.sender === 'user'
                        ? 'bg-gray-900 border-gray-800 ml-6'
                        : 'bg-amber-950/20 border-amber-500/30 mr-6'
                    }`}
                  >
                    <div className="flex justify-between items-center text-xs">
                      <span className={`font-bold ${m.sender === 'user' ? 'text-white' : 'text-amber-400'}`}>
                        {m.name}
                      </span>
                      <span className="text-[10px] text-gray-500">{m.time}</span>
                    </div>
                    <p className="text-xs text-gray-300 leading-relaxed">{m.text}</p>
                  </div>
                ))}
              </div>

              {/* Reply Box */}
              <form onSubmit={handleSendReply} className="space-y-3 pt-3 border-t border-gray-800">
                <textarea
                  rows={3}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Escribe un mensaje de seguimiento para el soporte..."
                  className="w-full bg-black border border-gray-800 rounded-xl p-3.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 resize-none"
                />

                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-gray-500 flex items-center gap-1">
                    <Clock size={12} className="text-amber-400" /> Tiempo estimado de respuesta: &lt; 15 mins
                  </span>

                  <button
                    type="submit"
                    disabled={!replyText.trim()}
                    className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold text-xs rounded-xl transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Send size={14} /> Responder Ticket
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="panel p-12 rounded-2xl border border-gray-800 text-center text-gray-500">
              Selecciona un ticket de la izquierda para ver el historial de atención.
            </div>
          )}
        </div>
      </div>

      {/* CREATE TICKET MODAL */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121215] border border-amber-500/30 rounded-2xl max-w-lg w-full p-6 space-y-4 text-white shadow-2xl relative">
            <button
              onClick={() => setShowNewModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white font-bold"
            >
              ✕
            </button>

            <div className="border-b border-gray-800 pb-3">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Plus size={18} className="text-amber-400" /> Montar Nuevo Ticket de Soporte
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Describe detalladamente tu caso para que el equipo de soporte técnico lo atienda.
              </p>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Asunto del Ticket *</label>
                <input
                  type="text"
                  required
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder="ej: Inconveniente con conexión de dominio en Landing"
                  className="w-full bg-black border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">Categoría</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as Ticket['category'])}
                    className="w-full bg-black border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="tecnico">Técnico / Plataforma</option>
                    <option value="integracion">Integraciones (WhatsApp/Ads)</option>
                    <option value="facturacion">Facturación & Créditos</option>
                    <option value="sugerencia">Sugerencia de Mejora</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">Prioridad</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as Ticket['priority'])}
                    className="w-full bg-black border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="baja">Baja</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Descripción Detallada *</label>
                <textarea
                  rows={4}
                  required
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Explica qué estaba sucediendo, pasos para reproducir o adjunta enlaces de referencia..."
                  className="w-full bg-black border border-gray-800 rounded-xl p-3.5 text-xs text-white focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold text-xs rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs rounded-xl shadow-lg shadow-amber-500/20"
                >
                  Enviar Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Users, Shield, UserCog, MoreVertical, Search, Check, X, Wallet, Save, Plus, Edit3, Trash2, CheckCircle2, Clock, AlertCircle, Sliders, Layers, Crown, Award, Network } from 'lucide-react';

type RoleType = 'superadmin' | 'admin' | 'droshipper' | 'lider_networker';
type SubscriptionStatus = 'activo' | 'inactivo' | 'pendiente';

interface UserData {
  id: number;
  name: string;
  email: string;
  role: RoleType;
  status: SubscriptionStatus;
  plan: string;
  joined: string;
  enabledTools: string[];
}

const availableToolsList = [
  'Branding & Marca',
  'Búsqueda Mercado COD',
  'Creador de Contenido Copy',
  'Creador Landing Pages',
  'Generador Meta Ads',
  'Bot de WhatsApp',
  'Bandeja Conversaciones',
  'Llamadas e IA Voz',
  'Email Marketing',
  'Flujos & Automatizaciones',
  'Integraciones Webhooks',
  'Catálogo Proveedores COD',
  'Gestión Pedidos & Guías',
  'Calculadora COD'
];

const initialUsers: UserData[] = [
  {
    id: 1,
    name: 'Oscar Molina',
    email: 'oscar@expert360.ai',
    role: 'superadmin',
    status: 'activo',
    plan: 'Enterprise 360°',
    joined: '2024-01-10',
    enabledTools: ['Branding & Marca', 'Búsqueda Mercado COD', 'Creador Landing Pages', 'Generador Meta Ads', 'Bot de WhatsApp', 'Llamadas e IA Voz', 'Email Marketing', 'Flujos & Automatizaciones', 'Calculadora COD']
  },
  {
    id: 2,
    name: 'Laura Gómez',
    email: 'laura.g@email.com',
    role: 'admin',
    status: 'activo',
    plan: 'PRO 360°',
    joined: '2024-02-15',
    enabledTools: ['Branding & Marca', 'Creador Landing Pages', 'Generador Meta Ads', 'Bot de WhatsApp', 'Flujos & Automatizaciones', 'Catálogo Proveedores COD']
  },
  {
    id: 3,
    name: 'Jose Martinez',
    email: 'jose.m@email.com',
    role: 'droshipper',
    status: 'activo',
    plan: 'Starter COD',
    joined: '2026-07-22',
    enabledTools: ['Branding & Marca', 'Búsqueda Mercado COD', 'Creador Landing Pages', 'Generador Meta Ads', 'Calculadora COD']
  },
  {
    id: 4,
    name: 'Carlos Díaz',
    email: 'carlos.d@email.com',
    role: 'droshipper',
    status: 'inactivo',
    plan: 'Starter COD',
    joined: '2024-03-22',
    enabledTools: ['Branding & Marca', 'Creador Landing Pages', 'Generador Meta Ads']
  },
  {
    id: 5,
    name: 'Ana Silva',
    email: 'ana.s@email.com',
    role: 'droshipper',
    status: 'pendiente',
    plan: 'PRO 360°',
    joined: '2026-07-28',
    enabledTools: ['Búsqueda Mercado COD', 'Bot de WhatsApp', 'Catálogo Proveedores COD']
  }
];

export default function UsuariosView({ 
  hiddenItems, 
  toggleVisibility,
  currentUser 
}: { 
  hiddenItems: string[]; 
  toggleVisibility: (id: string) => void;
  currentUser?: { name: string; role: string; email: string; plan?: string } | null;
}) {
  const isAdmin = !currentUser || currentUser.role === 'superadmin' || currentUser.role === 'admin';
  const [activeTab, setActiveTab] = useState<'lista' | 'roles' | 'modulos'>('lista');
  const [users, setUsers] = useState<UserData[]>(initialUsers);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | SubscriptionStatus>('todos');
  const [roleFilter, setRoleFilter] = useState<'todos' | RoleType>('todos');

  // Modal State for adding/editing user tools
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [showAddUserModal, setShowAddUserModal] = useState(false);

  // New user form state
  const [showDroshipperPermissions, setShowDroshipperPermissions] = useState(false);
  const [droshipperModules, setDroshipperModules] = useState<{id: string, label: string, active: boolean}[]>([
    { id: "1", label: "Búsqueda Mercado COD", active: true },
    { id: "2", label: "Catálogo Proveedores COD", active: true },
    { id: "3", label: "Gestión Pedidos & Guías", active: true },
    { id: "4", label: "Calculadora COD", active: true }
  ]);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<RoleType>('droshipper');
  const [newUserPlan, setNewUserPlan] = useState('PRO 360°');
  const [newUserStatus, setNewUserStatus] = useState<SubscriptionStatus>('activo');
  const [selectedTools, setSelectedTools] = useState<string[]>(['Branding & Marca', 'Creador Landing Pages', 'Generador Meta Ads', 'Bot de WhatsApp']);

  const [showSuperAdminSettings, setShowSuperAdminSettings] = useState(false);
  const [masterWallet, setMasterWallet] = useState('UQCL7H-UGIwxtwONsAaSWdBECdXLOZJbJkXK4qjatvXNqKNI');
  const [telegramBotUsername, setTelegramBotUsername] = useState('expertecom_bot');
  const [telegramBotToken, setTelegramBotToken] = useState('');
  const [superAdminMnemonic, setSuperAdminMnemonic] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  useEffect(() => {
    fetch('/api/telegram-pay/config')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          if (data.masterWallet) setMasterWallet(data.masterWallet);
          if (data.botUsername) setTelegramBotUsername(data.botUsername);
          if (data.botToken) setTelegramBotToken(data.botToken);
          if (data.superAdminMnemonic) setSuperAdminMnemonic(data.superAdminMnemonic);
        }
      })
      .catch(err => console.error('Error fetching config:', err));
  }, []);

  const toggleUserStatus = (userId: number) => {
    setUsers(prev => prev.map(u => {
      if (u.id === userId) {
        const nextStatus: SubscriptionStatus = u.status === 'activo' ? 'inactivo' : u.status === 'inactivo' ? 'pendiente' : 'activo';
        return { ...u, status: nextStatus };
      }
      return u;
    }));
  };

  const handleToolToggleForEditingUser = (tool: string) => {
    if (!editingUser) return;
    const exists = editingUser.enabledTools.includes(tool);
    const updatedTools = exists
      ? editingUser.enabledTools.filter(t => t !== tool)
      : [...editingUser.enabledTools, tool];

    const updatedUser = { ...editingUser, enabledTools: updatedTools };
    setEditingUser(updatedUser);
    setUsers(users.map(u => u.id === editingUser.id ? updatedUser : u));
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) return;

    const created: UserData = {
      id: Date.now(),
      name: newUserName,
      email: newUserEmail,
      role: newUserRole,
      status: newUserStatus,
      plan: newUserPlan,
      joined: new Date().toISOString().substring(0, 10),
      enabledTools: selectedTools
    };

    setUsers([created, ...users]);
    setShowAddUserModal(false);
    setNewUserName('');
    setNewUserEmail('');
  };

  const getRoleBadge = (role: RoleType) => {
    switch(role) {
      case 'superadmin':
        return <span className="px-2.5 py-1 bg-red-950/60 text-red-400 border border-red-800 rounded-full text-[11px] font-bold flex items-center gap-1 w-fit"><Shield size={12}/> Super Admin</span>;
      case 'admin':
        return <span className="px-2.5 py-1 bg-blue-950/60 text-blue-400 border border-blue-800 rounded-full text-[11px] font-bold flex items-center gap-1 w-fit"><UserCog size={12}/> Admin</span>;
      case 'lider_networker':
        return <span className="px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full text-[11px] font-bold flex items-center gap-1 w-fit"><Crown size={12}/> Líder Networker (+10%)</span>;
      case 'droshipper':
        return <span className="px-2.5 py-1 bg-gray-800 text-gray-300 border border-gray-700 rounded-full text-[11px] font-bold flex items-center gap-1 w-fit"><Users size={12}/> Droshipper</span>;
    }
  };

  const getStatusBadge = (status: SubscriptionStatus) => {
    switch(status) {
      case 'activo':
        return (
          <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-[11px] font-bold flex items-center gap-1 w-fit cursor-pointer hover:bg-emerald-500/30 transition" title="Haz clic para cambiar estado">
            <CheckCircle2 size={12} /> Activo
          </span>
        );
      case 'inactivo':
        return (
          <span className="px-2.5 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded-full text-[11px] font-bold flex items-center gap-1 w-fit cursor-pointer hover:bg-red-500/30 transition" title="Haz clic para cambiar estado">
            <AlertCircle size={12} /> Inactivo
          </span>
        );
      case 'pendiente':
        return (
          <span className="px-2.5 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full text-[11px] font-bold flex items-center gap-1 w-fit cursor-pointer hover:bg-amber-500/30 transition" title="Haz clic para cambiar estado">
            <Clock size={12} /> Pendiente
          </span>
        );
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'todos' || u.status === statusFilter;
    const matchesRole = roleFilter === 'todos' || u.role === roleFilter;
    return matchesSearch && matchesStatus && matchesRole;
  });

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-display text-white mb-1">
              {isAdmin ? 'Usuarios y Roles de la Plataforma' : 'Mi Cuenta y Estructura de Usuarios'}
            </h2>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
              isAdmin ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-gold/20 text-gold border border-gold/30'
            }`}>
              {isAdmin ? 'Vista Administrador' : 'Mi Estructura (Usuario)'}
            </span>
          </div>
          <p className="text-gray-400 text-xs">
            {isAdmin 
              ? 'Como Administrador, puedes ver a todos los usuarios del sistema, sus planes, roles y las herramientas que tienen habilitadas.' 
              : 'Información de tu suscripción, perfil y clientes/referidos registrados bajo tu estructura.'}
          </p>
        </div>
      </div>

      {/* User Statistics Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 bg-gray-900/80 border border-gray-800 rounded-xl space-y-1">
          <span className="text-[10px] text-gray-400 font-bold uppercase block">Total Registrados</span>
          <span className="text-xl font-black text-white">{users.length}</span>
        </div>
        <div className="p-3.5 bg-emerald-950/30 border border-emerald-500/30 rounded-xl space-y-1">
          <span className="text-[10px] text-emerald-400 font-bold uppercase block flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Suscripciones Activas
          </span>
          <span className="text-xl font-black text-emerald-400">{users.filter(u => u.status === 'activo').length}</span>
        </div>
        <div className="p-3.5 bg-red-950/20 border border-red-500/30 rounded-xl space-y-1">
          <span className="text-[10px] text-red-400 font-bold uppercase block">Inactivos</span>
          <span className="text-xl font-black text-red-400">{users.filter(u => u.status === 'inactivo').length}</span>
        </div>
        <div className="p-3.5 bg-amber-950/20 border border-amber-500/30 rounded-xl space-y-1">
          <span className="text-[10px] text-amber-400 font-bold uppercase block">Pendientes de Pago</span>
          <span className="text-xl font-black text-amber-400">{users.filter(u => u.status === 'pendiente').length}</span>
        </div>
        <div className="p-3.5 bg-blue-950/20 border border-blue-500/30 rounded-xl space-y-1">
          <span className="text-[10px] text-blue-400 font-bold uppercase block">Herramientas Habilitadas</span>
          <span className="text-xl font-black text-blue-400">
            {Math.round(users.reduce((acc, u) => acc + u.enabledTools.length, 0) / (users.length || 1))} prom.
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-gray-800 pb-2">
        <button 
          onClick={() => setActiveTab('lista')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'lista' ? 'text-gold border-b-2 border-gold -mb-[9px]' : 'text-gray-500 hover:text-gray-300'}`}
        >
          Lista Detallada de Usuarios
        </button>
        <button 
          onClick={() => setActiveTab('roles')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'roles' ? 'text-gold border-b-2 border-gold -mb-[9px]' : 'text-gray-500 hover:text-gray-300'}`}
        >
          Gestión de Permisos (Roles)
        </button>
        <button 
          onClick={() => setActiveTab('modulos')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'modulos' ? 'text-gold border-b-2 border-gold -mb-[9px]' : 'text-gray-500 hover:text-gray-300'}`}
        >
          Módulos y Menús
        </button>
      </div>

      {activeTab === 'lista' && (
        <div className="panel p-6 rounded-2xl border border-gray-800 bg-black/40 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800/80 pb-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por nombre o correo..." 
                  className="bg-black border border-gray-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-gold w-64" 
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-black border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-gold"
              >
                <option value="todos">Todos los Estados</option>
                <option value="activo">Solo Activos</option>
                <option value="inactivo">Solo Inactivos</option>
                <option value="pendiente">Solo Pendientes</option>
              </select>

              {/* Role Filter */}
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as any)}
                className="bg-black border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-gold"
              >
                <option value="todos">Todos los Roles</option>
                <option value="superadmin">Super Admin</option>
                <option value="admin">Admin</option>
                <option value="droshipper">Droshipper</option>
              </select>
            </div>

            <button 
              onClick={() => setShowAddUserModal(true)}
              className="bg-gold text-black px-4 py-2.5 rounded-xl font-bold hover:bg-yellow-400 transition-all text-xs shadow-lg shadow-gold/20 flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              <Plus size={16} /> Registrar Nuevo Usuario
            </button>
          </div>
           
          {/* Main Users Table */}
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-900/80 text-gray-400 border-b border-gray-800 uppercase tracking-wider font-mono">
                <tr>
                  <th className="px-4 py-3.5">Usuario & Plan</th>
                  <th className="px-4 py-3.5">Rol Asignado</th>
                  <th className="px-4 py-3.5">Estado Suscripción</th>
                  <th className="px-4 py-3.5">Fecha Registro</th>
                  <th className="px-4 py-3.5">Herramientas Personalizadas Habilitadas</th>
                  <th className="px-4 py-3.5 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60 font-sans">
                {filteredUsers.map(u => (
                  <tr key={u.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-4 text-white font-medium">
                      <div className="font-bold text-sm text-white">{u.name}</div>
                      <div className="text-[11px] text-gray-400 font-mono">{u.email}</div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-gray-800 text-gold border border-gold/20 inline-block mt-1 font-semibold">
                        {u.plan}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      {getRoleBadge(u.role)}
                    </td>

                    <td className="px-4 py-4" onClick={() => toggleUserStatus(u.id)}>
                      {getStatusBadge(u.status)}
                    </td>

                    <td className="px-4 py-4 text-gray-400 font-mono text-xs">
                      {u.joined}
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-1 max-w-md">
                        {u.enabledTools.map((tool, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 bg-gray-900 border border-gray-800 rounded text-[10px] text-gray-300 font-medium"
                          >
                            {tool}
                          </span>
                        ))}
                      </div>
                      <button
                        onClick={() => setEditingUser(u)}
                        className="mt-1.5 text-[10px] text-gold hover:underline font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Sliders size={12} /> Personalizar Herramientas ({u.enabledTools.length})
                      </button>
                    </td>

                    <td className="px-4 py-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setEditingUser(u)}
                          className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition"
                          title="Editar Herramientas"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          onClick={() => setUsers(users.filter(x => x.id !== u.id))}
                          className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-950/40 rounded-lg transition"
                          title="Eliminar Usuario"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL EDITING TOOLS FOR USER */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121215] border border-gold/30 rounded-2xl max-w-lg w-full p-6 space-y-4 text-white shadow-2xl relative">
            <button
              onClick={() => setEditingUser(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white font-bold"
            >
              ✕
            </button>

            <div className="border-b border-gray-800 pb-3">
              <span className="text-[10px] text-gold font-mono uppercase font-bold">Personalización de Acceso</span>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Sliders size={18} className="text-gold" /> Herramientas de {editingUser.name}
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Selecciona o desmarca los módulos e instrumentos habilitados para la cuenta ({editingUser.email}).
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[350px] overflow-y-auto custom-scrollbar pr-1">
              {availableToolsList.map((tool) => {
                const isEnabled = editingUser.enabledTools.includes(tool);
                return (
                  <div
                    key={tool}
                    onClick={() => handleToolToggleForEditingUser(tool)}
                    className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between text-xs ${
                      isEnabled
                        ? 'bg-gold/10 border-gold/40 text-white font-bold'
                        : 'bg-gray-900/60 border-gray-800 text-gray-400 hover:bg-gray-800'
                    }`}
                  >
                    <span>{tool}</span>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                      isEnabled ? 'bg-gold text-black border-gold' : 'border-gray-700'
                    }`}>
                      {isEnabled && <Check size={12} strokeWidth={3} />}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 border-t border-gray-800 flex justify-between items-center">
              <span className="text-xs text-gray-400">
                Total habilitadas: <strong className="text-gold">{editingUser.enabledTools.length}</strong>
              </span>

              <button
                onClick={() => setEditingUser(null)}
                className="px-5 py-2.5 bg-gold hover:bg-yellow-400 text-black font-black text-xs rounded-xl shadow-md transition"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CREATE NEW USER */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121215] border border-gold/30 rounded-2xl max-w-md w-full p-6 space-y-4 text-white shadow-2xl relative">
            <button
              onClick={() => setShowAddUserModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white font-bold"
            >
              ✕
            </button>

            <div className="border-b border-gray-800 pb-3">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Plus size={18} className="text-gold" /> Registrar Nuevo Usuario
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Completa la información inicial y asigna el plan de suscripción.
              </p>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              <div>
                <label className="block text-gray-300 font-bold mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="ej: Andres Perez"
                  className="w-full bg-black border border-gray-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-gold"
                />
              </div>

              <div>
                <label className="block text-gray-300 font-bold mb-1">Correo Electrónico *</label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="ej: andres@midominio.com"
                  className="w-full bg-black border border-gray-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-gold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-bold mb-1">Rol de Acceso</label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as RoleType)}
                    className="w-full bg-black border border-gray-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-gold"
                  >
                    <option value="droshipper">Droshipper</option>
                    <option value="admin">Administrador</option>
                    <option value="superadmin">Super Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-300 font-bold mb-1">Plan Suscripción</label>
                  <select
                    value={newUserPlan}
                    onChange={(e) => setNewUserPlan(e.target.value)}
                    className="w-full bg-black border border-gray-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-gold"
                  >
                    <option value="Starter COD">Starter COD ($29/m)</option>
                    <option value="PRO 360°">PRO 360° ($59/m)</option>
                    <option value="Enterprise 360°">Enterprise ($149/m)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-300 font-bold mb-1">Estado de la Cuenta</label>
                <select
                  value={newUserStatus}
                  onChange={(e) => setNewUserStatus(e.target.value as SubscriptionStatus)}
                  className="w-full bg-black border border-gray-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-gold"
                >
                  <option value="activo">Activo</option>
                  <option value="pendiente">Pendiente de Pago</option>
                  <option value="inactivo">Inactivo</option>
                </select>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-gold hover:bg-yellow-400 text-black font-black rounded-xl shadow-lg shadow-gold/20"
                >
                  Crear Usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'modulos' && (
        <div className="panel p-6 rounded-2xl border border-gray-800 bg-black/40 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-4">
            <div>
              <h3 className="text-lg font-bold text-white">Personalizar Entorno de Trabajo (Módulos & Visibilidad)</h3>
              <p className="text-xs text-gray-400 mt-1">
                Los usuarios y Dropshippers pueden encender o apagar las herramientas y submenús que desean ver en su panel.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold flex items-center gap-2 max-w-md">
              <span className="text-base">💬</span>
              <span>
                <strong>Tip de Automatización:</strong> También puedes pedirle al Agente 360° en el chat: <em>"oculta el módulo de llamadas"</em> o <em>"muestra solo WhatsApp y Landing Pages"</em> y los cambios se aplicarán al instante.
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { id: 'branding', label: 'Branding & Marca' },
              { id: 'mercado', label: 'Búsqueda de Mercado COD' },
              { id: 'contenido', label: 'Creador de Contenido Copy' },
              { id: 'landing', label: 'Creador de Landing Pages' },
              { id: 'ads', label: 'Generador de Meta Ads' },
              { id: 'whatsapp', label: 'Bot de WhatsApp' },
              { id: 'conversaciones', label: 'Bandeja de Conversaciones' },
              { id: 'llamadas', label: 'Llamadas e IA de Voz' },
              { id: 'email', label: 'Email Marketing & Secuencias' },
              { id: 'automatizaciones', label: 'Flujos & Automatizaciones' },
              { id: 'integraciones', label: 'Integraciones & Webhooks' },
              { id: 'catalogo', label: 'Catálogo de Proveedores COD' },
              { id: 'pedidos', label: 'Gestión de Pedidos & Guías' },
              { id: 'clientes', label: 'CRM de Clientes' },
              { id: 'calculadora', label: 'Calculadora de Costos COD' },
              { id: 'comunidad', label: 'Comunidad & Networking' },
              { id: 'entrenamiento', label: 'Universidad & Entrenamiento' },
              { id: 'organigrama', label: 'Organigrama & Flujos' },
              { id: 'recargas', label: 'Recargas y Saldo de Billetera' },
            ].map(item => (
              <div key={item.id} className="flex items-center justify-between p-3.5 bg-gray-900/80 border border-gray-800 rounded-xl hover:border-gray-700 transition">
                <span className="text-xs text-gray-200 font-semibold">{item.label}</span>
                <button 
                  onClick={() => toggleVisibility(item.id)}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${!hiddenItems.includes(item.id) ? 'bg-emerald-500' : 'bg-gray-700'}`}
                  title={!hiddenItems.includes(item.id) ? 'Módulo Visible' : 'Módulo Oculto'}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${!hiddenItems.includes(item.id) ? 'left-6' : 'left-1'}`} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'roles' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           {/* Super Admin */}
           <div className="panel p-6 rounded-2xl border flex flex-col border-red-900/30 bg-gradient-to-b from-red-950/20 to-black relative">
              <div className="absolute top-0 right-4 px-3 py-1 bg-red-900/50 text-red-400 text-xs font-bold rounded-b-lg">Máxima Autoridad</div>
              <div className="w-12 h-12 rounded-xl bg-red-900/20 text-red-500 flex items-center justify-center mb-4 border border-red-900/50">
                 <Shield size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Súper Administrador</h3>
              <p className="text-gray-400 text-sm mb-6 pb-6 border-b border-gray-800 flex-1">
                Control total del sistema. El único rol capaz de crear, modificar o eliminar permisos a los demás roles (Admin y Droshipper). Administra las Wallets root.
              </p>
              <div className="space-y-3 pb-6 border-b border-gray-800 mb-6">
                 <h4 className="text-xs font-bold text-red-500 uppercase tracking-widest mb-3">Permisos Destacados</h4>
                 <div className="flex items-center gap-2 text-sm text-gray-300"><Check size={16} className="text-red-500" /> Modificar roles de usuarios</div>
                 <div className="flex items-center gap-2 text-sm text-gray-300"><Check size={16} className="text-red-500" /> Gestionar Wallet Principal (25%)</div>
                 <div className="flex items-center gap-2 text-sm text-gray-300"><Check size={16} className="text-red-500" /> Ver estructura de red global</div>
                 <div className="flex items-center gap-2 text-sm text-gray-300"><Check size={16} className="text-red-500" /> Configuración Master del Smart Contract</div>
              </div>
              <button 
                 onClick={() => setShowSuperAdminSettings(true)}
                 className="w-full py-2 bg-red-900/20 border border-red-900/50 text-red-400 text-sm font-semibold rounded-lg hover:bg-red-900/40 transition-colors"
              >
                 Configurar Wallet y Sistema
              </button>
           </div>
           
           {/* Admin */}
           <div className="panel p-6 rounded-2xl border flex flex-col border-blue-900/30 bg-gradient-to-b from-blue-950/10 to-black">
              <div className="w-12 h-12 rounded-xl bg-blue-900/20 text-blue-500 flex items-center justify-center mb-4 border border-blue-900/50">
                 <UserCog size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Administrador</h3>
              <p className="text-gray-400 text-sm mb-6 pb-6 border-b border-gray-800 flex-1">
                Personal de gestión de la plataforma. Pueden crear automatizaciones, manejar catálogos de productos y ver métricas generales, pero no alteran contratos ni roles globales.
              </p>
              <div className="space-y-3 pb-6 border-b border-gray-800 mb-6">
                 <h4 className="text-xs font-bold text-blue-500 uppercase tracking-widest mb-3">Permisos Destacados</h4>
                 <div className="flex items-center gap-2 text-sm text-gray-300"><Check size={16} className="text-blue-500" /> Aprobar/Rechazar contenido</div>
                 <div className="flex items-center gap-2 text-sm text-gray-300"><Check size={16} className="text-blue-500" /> Ver métricas de ventas agregadas</div>
                 <div className="flex items-center gap-2 text-sm text-gray-500"><X size={16} className="text-gray-600" /> Modificar contrato inteligente</div>
                 <div className="flex items-center gap-2 text-sm text-gray-500"><X size={16} className="text-gray-600" /> Asignar roles a usuarios</div>
              </div>
              <button className="w-full py-2 bg-gray-900 border border-gray-800 text-white text-sm font-semibold rounded-lg hover:bg-gray-800 transition-colors">
                 Configurar Permisos
              </button>
           </div>
           
           {/* Droshipper */}
           <div className="panel p-6 rounded-2xl border flex flex-col border-gray-800 bg-black/50">
              <div className="w-12 h-12 rounded-xl bg-gray-800 text-gray-300 flex items-center justify-center mb-4 border border-gray-700">
                 <Users size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Droshipper (Afiliado)</h3>
              <p className="text-gray-400 text-sm mb-6 pb-6 border-b border-gray-800 flex-1">
                El usuario final base de la comunidad. Tienen su link de referido, acceden a los módulos educativos y ganan comisiones por sus 5 niveles de red.
              </p>
              <div className="space-y-3 pb-6 border-b border-gray-800 mb-6">
                 <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Permisos Destacados</h4>
                 <div className="flex items-center gap-2 text-sm text-gray-300"><Check size={16} className="text-gray-400" /> Red de 5 Niveles (20% / 5% / 5% / 5% / 5%)</div>
                 <div className="flex items-center gap-2 text-sm text-gray-300"><Check size={16} className="text-gray-400" /> Compartir Link de Referidos</div>
                 <div className="flex items-center gap-2 text-sm text-gray-500"><X size={16} className="text-gray-600" /> Ver comisiones de otros</div>
              </div>
              <button 
                onClick={() => setShowDroshipperPermissions(true)}
                className="w-full py-2 bg-gray-900 border border-gray-800 text-white text-sm font-semibold rounded-lg hover:bg-gray-800 transition-colors"
              >
                 Configurar Permisos
              </button>
            </div>
          </div>
       )}

       {/* Droshipper Permissions Modal */}
       {showDroshipperPermissions && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
           <div className="bg-[#111] border border-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in relative text-left">
             <div className="p-6 border-b border-gray-800 flex items-center justify-between">
               <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2"><UserCog className="text-blue-500" size={20} /> Permisos de Droshipper</h3>
                  <p className="text-xs text-gray-400 mt-1">Selecciona qué módulos están visibles para este rol.</p>
               </div>
               <button onClick={() => setShowDroshipperPermissions(false)} className="text-gray-500 hover:text-white transition-colors">
                 <X size={20} />
               </button>
             </div>
             <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3">
                {droshipperModules.map((module) => (
                  <div key={module.id} className="flex items-center justify-between p-3 bg-gray-900 border border-gray-800 rounded-xl">
                    <span className="text-sm text-gray-300 font-medium">{module.label}</span>
                    <button 
                      onClick={() => {
                        setDroshipperModules(prev => prev.map(m => m.id === module.id ? { ...m, active: !m.active } : m));
                      }}
                      className={`w-12 h-6 rounded-full transition-colors relative ${module.active ? 'bg-green-500' : 'bg-gray-700'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${module.active ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>
                ))}
             </div>
             <div className="p-6 border-t border-gray-800 bg-black/50 flex justify-end gap-3">
               <button
                 onClick={() => setShowDroshipperPermissions(false)}
                 className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-lg transition-colors flex items-center gap-2"
               >
                 Guardar Configuración
               </button>
             </div>
           </div>
         </div>
       )}

       {/* Super Admin Modal */}
      {showSuperAdminSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#111] border border-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in relative text-left">
            <div className="p-6 border-b border-gray-800 flex items-center justify-between">
              <div>
                 <h3 className="text-xl font-bold text-white flex items-center gap-2"><Shield className="text-red-500" size={20} /> Configuración de Super Admin</h3>
                 <p className="text-xs text-gray-400 mt-1">Gestión de wallets principales y contratos inteligentes.</p>
              </div>
              <button onClick={() => setShowSuperAdminSettings(false)} className="text-gray-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="bg-blue-900/10 border border-blue-900/30 p-4 rounded-xl flex gap-3 text-sm text-blue-200">
                 <Wallet className="flex-shrink-0 mt-0.5" size={18} />
                 <div>
                    <span className="font-bold block mb-1">Wallet Principal (Fee Administrativo 25%)</span>
                    <p className="opacity-80">Por cada suscripción dentro de la red, el Smart Contract distribuye un 25% directo a esta wallet. Debe ser una billetera compatible de Telegram.</p>
                 </div>
              </div>
              
              <div className="space-y-2">
                 <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block">Dirección Telegram Wallet (@wallet)</label>
                 <input 
                    type="text" 
                    value={masterWallet}
                    onChange={(e) => setMasterWallet(e.target.value)}
                    className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-sm text-gray-200 focus:border-red-500 focus:outline-none transition-colors"
                    placeholder="Ej. UQDv_h-hY... (Telegram TON Wallet)" />
              </div>

              
              <div className="space-y-2">
                 <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block">Frase Semilla (Mnemonic) - 24 Palabras</label>
                 <textarea
                    value={superAdminMnemonic}
                    onChange={(e) => setSuperAdminMnemonic(e.target.value)}
                    className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-sm text-gray-200 focus:border-red-500 focus:outline-none transition-colors font-mono min-h-[80px]"
                    placeholder="palabra1 palabra2 palabra3..."
                 />
                 <p className="text-xs text-gray-400 mt-1">Requerido para la distribución real on-chain. Mantenlo seguro.</p>
              </div>

              {saveStatus === 'success' && (
                <div className="p-3 bg-emerald-950/40 border border-emerald-900/50 text-emerald-400 rounded-lg text-xs font-medium animate-fade-in text-center">
                  ✓ Configuración guardada correctamente en el servidor.
                </div>
              )}
              {saveStatus === 'error' && (
                <div className="p-3 bg-red-950/40 border border-red-950/50 text-red-400 rounded-lg text-xs font-medium animate-fade-in text-center">
                  ✗ Error al intentar guardar la configuración en el servidor.
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-gray-800 bg-black/50 flex justify-end gap-3">
               <button 
                 onClick={() => {
                   setShowSuperAdminSettings(false);
                   setSaveStatus('idle');
                 }}
                 className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
               >
                  Cancelar
               </button>
               <button 
                 disabled={saveStatus === 'saving'}
                 onClick={() => {
                   setSaveStatus('saving');
                   fetch('/api/telegram-pay/save-config', {
                     method: 'POST',
                     headers: { 'Content-Type': 'application/json' },
                     body: JSON.stringify({ masterWallet, telegramBotUsername, telegramBotToken, superAdminMnemonic })
                   })
                   .then(res => res.json())
                   .then(data => {
                     if (data.success) {
                       setSaveStatus('success');
                       setTimeout(() => {
                         setShowSuperAdminSettings(false);
                         setSaveStatus('idle');
                       }, 1500);
                     } else {
                       setSaveStatus('error');
                     }
                   })
                   .catch(err => {
                     console.error(err);
                     setSaveStatus('error');
                   });
                 }}
                 className="px-6 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-bold rounded-lg transition-colors flex items-center gap-2"
               >
                  <Save size={16} /> {saveStatus === 'saving' ? 'Guardando...' : 'Guardar Cambios'}
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

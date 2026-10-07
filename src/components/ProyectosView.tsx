import React, { useState, useEffect } from 'react';
import {
  FolderKanban,
  FolderPlus,
  Folder,
  Plus,
  Search,
  Filter,
  MoreVertical,
  ExternalLink,
  Bot,
  Megaphone,
  Layout,
  MessageSquare,
  Globe,
  FileText,
  CheckCircle2,
  Clock,
  Building2,
  Edit3,
  Trash2,
  ChevronRight,
  Sparkles,
  Layers,
  Briefcase,
  Tag,
  Calendar,
  Share2,
  Copy,
  Check,
  Zap,
  ArrowUpRight,
  FolderOpen
} from 'lucide-react';
import type { ModuleId } from '../types';

export interface ProjectBrand {
  id: string;
  name: string;
  category: string; // e.g. E-commerce, B2B, Marca Personal, Servicios, SaaS
  description: string;
  color: string;
  emoji: string;
  status: 'active' | 'paused' | 'completed';
  createdAt: string;
  updatedAt: string;
  website?: string;
  assignedTools: {
    id: string;
    type: 'whatsapp' | 'landing' | 'ads' | 'branding' | 'contenido' | 'email';
    name: string;
    detail: string;
    status: 'active' | 'draft' | 'paused';
  }[];
  notes?: string[];
  metrics?: {
    leads: number;
    sales: string;
    conversions: string;
  };
}

const DEFAULT_PROJECTS: ProjectBrand[] = [
  {
    id: 'proj-1',
    name: 'E-commerce Calzado VIP',
    category: 'E-commerce',
    description: 'Tienda en línea de calzado de cuero artesanal. Campañas de Facebook Ads y Bot de WhatsApp 24/7.',
    color: '#10B981', // Emerald
    emoji: '👟',
    status: 'active',
    createdAt: '2026-05-10',
    updatedAt: '2026-07-28',
    website: 'https://calzadovip.com',
    metrics: {
      leads: 342,
      sales: '$12,450',
      conversions: '4.8%'
    },
    assignedTools: [
      { id: 't1', type: 'whatsapp', name: 'Bot de Ventas WhatsApp', detail: 'Atención automática de catálogo y pedidos', status: 'active' },
      { id: 't2', type: 'landing', name: 'Landing Colección Verano', detail: 'Página de alta conversión con pasarela', status: 'active' },
      { id: 't3', type: 'ads', name: 'Meta Ads Retargeting', detail: 'Anuncios dinámicos en Instagram y Facebook', status: 'active' },
      { id: 't4', type: 'branding', name: 'Manual de Marca e Identidad', detail: 'Colores, tipografía y tono de voz', status: 'active' },
    ],
    notes: [
      'Lanzamiento de nueva colección en agosto.',
      'Aumentar presupuesto de retargeting un 20%.'
    ]
  },
  {
    id: 'proj-2',
    name: 'Marca Personal - Consultoría AI',
    category: 'Marca Personal',
    description: 'Servicios de asesoría estratégica en automatización e inteligencia artificial para directivos.',
    color: '#F59E0B', // Amber / Gold
    emoji: '💼',
    status: 'active',
    createdAt: '2026-06-01',
    updatedAt: '2026-07-25',
    website: 'https://oscarconsulting.io',
    metrics: {
      leads: 89,
      sales: '$28,000',
      conversions: '12.3%'
    },
    assignedTools: [
      { id: 't5', type: 'email', name: 'Secuencia Agendamiento High-Ticket', detail: 'Embudos fríos a llamadas de ventas', status: 'active' },
      { id: 't6', type: 'contenido', name: 'Estrategia LinkedIn & Reels', detail: '12 publicaciones semanales generadas con IA', status: 'active' },
      { id: 't7', type: 'landing', name: 'Agendador de Citas VIP', detail: 'Página con integración Calendly y preguntas filtro', status: 'active' },
    ],
    notes: [
      'Preparar webinar de automatizaciones para septiembre.'
    ]
  },
  {
    id: 'proj-3',
    name: 'Restaurante Gourmet Bistro',
    category: 'Restaurantes & Gastronomía',
    description: 'Reservas automáticas por WhatsApp, menú digital en landing page e email marketing de fidelización.',
    color: '#EC4899', // Pink
    emoji: '🍷',
    status: 'active',
    createdAt: '2026-06-20',
    updatedAt: '2026-07-29',
    website: 'https://bistro-gourmet.com',
    metrics: {
      leads: 512,
      sales: '$18,900',
      conversions: '8.1%'
    },
    assignedTools: [
      { id: 't8', type: 'whatsapp', name: 'Bot Reservas & Mesa VIP', detail: 'Confirmación e integración de mesa', status: 'active' },
      { id: 't9', type: 'ads', name: 'Anuncios Locales Google & IG', detail: 'Geolocalizados a 5km a la redonda', status: 'active' }
    ],
    notes: [
      'Ofrecer copa de bienvenida los jueves en promociones de Instagram.'
    ]
  }
];

interface ProyectosViewProps {
  onNavigateToModule?: (moduleId: ModuleId) => void;
}

export default function ProyectosView({ onNavigateToModule }: ProyectosViewProps) {
  const [projects, setProjects] = useState<ProjectBrand[]>(() => {
    const saved = localStorage.getItem('app_projects_data');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return DEFAULT_PROJECTS;
  });

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modal create/edit project
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectBrand | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('E-commerce');
  const [formDescription, setFormDescription] = useState('');
  const [formColor, setFormColor] = useState('#10B981');
  const [formEmoji, setFormEmoji] = useState('📁');
  const [formWebsite, setFormWebsite] = useState('');

  // Save projects to localStorage
  useEffect(() => {
    localStorage.setItem('app_projects_data', JSON.stringify(projects));
  }, [projects]);

  const selectedProject = projects.find(p => p.id === selectedProjectId) || null;

  const handleOpenCreateModal = () => {
    setEditingProject(null);
    setFormName('');
    setFormCategory('E-commerce');
    setFormDescription('');
    setFormColor('#10B981');
    setFormEmoji('🚀');
    setFormWebsite('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (p: ProjectBrand, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProject(p);
    setFormName(p.name);
    setFormCategory(p.category);
    setFormDescription(p.description);
    setFormColor(p.color);
    setFormEmoji(p.emoji);
    setFormWebsite(p.website || '');
    setIsModalOpen(true);
  };

  const handleSaveProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    if (editingProject) {
      setProjects(prev => prev.map(p => p.id === editingProject.id ? {
        ...p,
        name: formName.trim(),
        category: formCategory,
        description: formDescription,
        color: formColor,
        emoji: formEmoji,
        website: formWebsite.trim() || undefined,
        updatedAt: new Date().toISOString().split('T')[0]
      } : p));
    } else {
      const newProj: ProjectBrand = {
        id: `proj-${Date.now()}`,
        name: formName.trim(),
        category: formCategory,
        description: formDescription,
        color: formColor,
        emoji: formEmoji,
        status: 'active',
        createdAt: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString().split('T')[0],
        website: formWebsite.trim() || undefined,
        assignedTools: [],
        notes: [],
        metrics: {
          leads: 0,
          sales: '$0',
          conversions: '0%'
        }
      };
      setProjects(prev => [newProj, ...prev]);
      setSelectedProjectId(newProj.id);
    }

    setIsModalOpen(false);
  };

  const handleDeleteProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('¿Estás seguro de eliminar esta carpeta de proyecto y su contenido?')) {
      setProjects(prev => prev.filter(p => p.id !== id));
      if (selectedProjectId === id) setSelectedProjectId(null);
    }
  };

  const handleAddQuickTool = (toolType: 'whatsapp' | 'landing' | 'ads' | 'branding' | 'contenido' | 'email') => {
    if (!selectedProjectId) return;

    const typeNames = {
      whatsapp: 'Bot de WhatsApp IA',
      landing: 'Landing Page de Captación',
      ads: 'Campaña de Anuncios Ads',
      branding: 'Manual de Identidad & Marca',
      contenido: 'Plan de Contenido Redes',
      email: 'Flujo de Email Marketing'
    };

    const newTool = {
      id: `tool-${Date.now()}`,
      type: toolType,
      name: `${typeNames[toolType]} - ${selectedProject?.name}`,
      detail: 'Creado para este proyecto de marca',
      status: 'active' as const
    };

    setProjects(prev => prev.map(p => p.id === selectedProjectId ? {
      ...p,
      assignedTools: [newTool, ...p.assignedTools],
      updatedAt: new Date().toISOString().split('T')[0]
    } : p));
  };

  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const categoriesList = Array.from(new Set(projects.map(p => p.category)));

  return (
    <div className="space-y-8 w-full pb-16 animate-fade-in text-gray-100">

      {/* Header Banner */}
      <div className="panel p-6 sm:p-8 rounded-2xl border border-gray-800 bg-gradient-to-r from-gray-900 via-gray-900/90 to-amber-950/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-xl shadow-amber-500/5 shrink-0">
              <FolderKanban size={32} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-extrabold tracking-widest px-2.5 py-0.5 rounded-md bg-amber-500 text-black shadow-sm">
                  Gestor de Carpetas
                </span>
                <span className="text-xs text-gray-400">Organización Multimarca</span>
              </div>
              <h1 className="text-2xl font-bold font-display text-white mt-1">
                Proyectos & Carpetas Independientes
              </h1>
              <p className="text-gray-400 text-sm mt-1 max-w-2xl">
                Organiza tus clientes, marcas o negocios en carpetas separadas. Así no mezclarás los bots de WhatsApp, campañas de Ads y landing pages entre diferentes proyectos.
              </p>
            </div>
          </div>

          <button
            onClick={handleOpenCreateModal}
            className="self-start md:self-center px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <FolderPlus size={18} />
            <span>Crear Nueva Carpeta / Proyecto</span>
          </button>
        </div>
      </div>

      {/* Main Layout: Project Details vs Project Grid */}
      {selectedProject ? (
        /* PROJECT DETAIL VIEW */
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={() => setSelectedProjectId(null)}
              className="px-3.5 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border border-gray-700"
            >
              <ChevronRight size={16} className="rotate-180" />
              <span>Volver a Todas las Carpetas</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={(e) => handleOpenEditModal(selectedProject, e)}
                className="px-3.5 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Edit3 size={14} />
                <span>Editar Proyecto</span>
              </button>
            </div>
          </div>

          {/* Active Project Banner */}
          <div
            className="panel p-6 sm:p-8 rounded-2xl border bg-gray-900/90 relative overflow-hidden"
            style={{ borderColor: `${selectedProject.color}40` }}
          >
            <div
              className="absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none opacity-20"
              style={{ backgroundColor: selectedProject.color }}
            ></div>

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shrink-0 shadow-lg border border-white/10"
                  style={{ backgroundColor: `${selectedProject.color}25` }}
                >
                  {selectedProject.emoji}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[10px] font-black uppercase px-2 py-0.5 rounded text-white"
                      style={{ backgroundColor: selectedProject.color }}
                    >
                      {selectedProject.category}
                    </span>
                    <span className="text-xs text-gray-400 font-mono">ID: {selectedProject.id}</span>
                  </div>
                  <h2 className="text-2xl font-black text-white mt-1">{selectedProject.name}</h2>
                  <p className="text-sm text-gray-300 mt-1 max-w-3xl">{selectedProject.description}</p>

                  {selectedProject.website && (
                    <a
                      href={selectedProject.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 hover:underline mt-2"
                    >
                      <Globe size={14} />
                      <span>{selectedProject.website}</span>
                      <ArrowUpRight size={12} />
                    </a>
                  )}
                </div>
              </div>

              {/* Quick Metrics */}
              {selectedProject.metrics && (
                <div className="flex items-center gap-4 bg-gray-950/80 p-4 rounded-xl border border-gray-800 shrink-0">
                  <div className="text-center px-3 border-r border-gray-800">
                    <p className="text-[10px] uppercase font-bold text-gray-400">Leads Captados</p>
                    <p className="text-lg font-black text-white">{selectedProject.metrics.leads}</p>
                  </div>
                  <div className="text-center px-3 border-r border-gray-800">
                    <p className="text-[10px] uppercase font-bold text-gray-400">Ventas Generadas</p>
                    <p className="text-lg font-black text-emerald-400">{selectedProject.metrics.sales}</p>
                  </div>
                  <div className="text-center px-3">
                    <p className="text-[10px] uppercase font-bold text-gray-400">Conversión</p>
                    <p className="text-lg font-black text-amber-400">{selectedProject.metrics.conversions}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Assigned Tools & Assets inside this project */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Layers size={20} className="text-amber-400" />
                  Herramientas y Activos en esta Carpeta ({selectedProject.assignedTools.length})
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Herramientas vinculadas específicamente a esta marca o proyecto.
                </p>
              </div>

              {/* Add Tool Quick Selector */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-400 font-semibold">Vincular Herramienta:</span>
                <button
                  onClick={() => handleAddQuickTool('whatsapp')}
                  className="px-2.5 py-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/30 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Bot size={14} /> + WhatsApp
                </button>
                <button
                  onClick={() => handleAddQuickTool('landing')}
                  className="px-2.5 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Globe size={14} /> + Landing
                </button>
                <button
                  onClick={() => handleAddQuickTool('ads')}
                  className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Megaphone size={14} /> + Ads
                </button>
              </div>
            </div>

            {selectedProject.assignedTools.length === 0 ? (
              <div className="panel p-8 text-center rounded-2xl border border-gray-800 bg-gray-900/40 space-y-3">
                <FolderOpen size={40} className="mx-auto text-gray-600" />
                <h4 className="text-base font-bold text-white">Esta carpeta está vacía</h4>
                <p className="text-xs text-gray-400 max-w-md mx-auto">
                  Agrega tus bots de WhatsApp, landing pages, campañas o estrategias asociadas a esta marca usando los botones superiores.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedProject.assignedTools.map((tool) => (
                  <div
                    key={tool.id}
                    className="panel p-5 rounded-2xl border border-gray-800 bg-gray-900/70 hover:border-gray-700 transition-all flex items-start justify-between gap-4 group"
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="p-3 rounded-xl bg-gray-800 border border-gray-700 text-amber-400 shrink-0 mt-0.5">
                        {tool.type === 'whatsapp' && <Bot size={20} className="text-green-400" />}
                        {tool.type === 'landing' && <Globe size={20} className="text-blue-400" />}
                        {tool.type === 'ads' && <Megaphone size={20} className="text-amber-400" />}
                        {tool.type === 'branding' && <Sparkles size={20} className="text-blue-400" />}
                        {tool.type === 'contenido' && <FileText size={20} className="text-blue-400" />}
                        {tool.type === 'email' && <MessageSquare size={20} className="text-cyan-400" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                            {tool.type}
                          </span>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                          <span className="text-[10px] font-semibold text-emerald-400 uppercase">Activo</span>
                        </div>
                        <h4 className="text-sm font-bold text-white mt-0.5 group-hover:text-amber-400 transition-colors">
                          {tool.name}
                        </h4>
                        <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                          {tool.detail}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (onNavigateToModule) onNavigateToModule(tool.type as ModuleId);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-amber-500 hover:text-black text-gray-200 border border-gray-700 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <span>Abrir</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* PROJECTS GRID VIEW */
        <div className="space-y-6">

          {/* Controls: Search & Category Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar carpeta, marca o cliente..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-900 border border-gray-800 text-white text-xs focus:outline-none focus:border-amber-500 transition-all"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setCategoryFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  categoryFilter === 'all'
                    ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                    : 'bg-gray-900 text-gray-400 hover:text-white border border-gray-800'
                }`}
              >
                Todas
              </button>
              {categoriesList.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    categoryFilter === cat
                      ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                      : 'bg-gray-900 text-gray-400 hover:text-white border border-gray-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Folders / Projects Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <div
                key={project.id}
                onClick={() => setSelectedProjectId(project.id)}
                className="panel p-6 rounded-2xl border border-gray-800/80 bg-gray-900/60 hover:bg-gray-900 hover:border-gray-700 transition-all duration-200 cursor-pointer group relative overflow-hidden flex flex-col justify-between space-y-4"
              >
                {/* Accent Top Border */}
                <div
                  className="absolute top-0 left-0 right-0 h-1"
                  style={{ backgroundColor: project.color }}
                ></div>

                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 border border-white/10"
                        style={{ backgroundColor: `${project.color}20` }}
                      >
                        {project.emoji}
                      </div>
                      <div>
                        <span
                          className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded text-white inline-block"
                          style={{ backgroundColor: project.color }}
                        >
                          {project.category}
                        </span>
                        <h3 className="text-base font-bold text-white group-hover:text-amber-400 transition-colors mt-0.5">
                          {project.name}
                        </h3>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handleOpenEditModal(project, e)}
                        className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
                        title="Editar carpeta"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={(e) => handleDeleteProject(project.id, e)}
                        className="p-1.5 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
                        title="Eliminar carpeta"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                    {project.description}
                  </p>
                </div>

                {/* Footer Info */}
                <div className="pt-3 border-t border-gray-800/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-gray-400 font-medium">
                    <Layers size={14} className="text-amber-400" />
                    <span>{project.assignedTools.length} herramientas en uso</span>
                  </div>

                  <span className="text-amber-400 font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    <span>Abrir Folder</span>
                    <ChevronRight size={14} />
                  </span>
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* CREATE / EDIT PROJECT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="panel p-6 sm:p-8 rounded-2xl border border-gray-800 bg-gray-900 max-w-lg w-full space-y-6 animate-scale-up">
            <div className="flex items-center justify-between border-b border-gray-800 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FolderPlus size={20} className="text-amber-400" />
                {editingProject ? 'Editar Carpeta de Proyecto' : 'Crear Nueva Carpeta de Proyecto'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProject} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block">
                  Nombre de la Marca / Proyecto *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ej: Cliente Nike Store, Marca Personal, Tienda X..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-gray-950 border border-gray-800 text-white text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block">
                    Categoría / Tipo
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-gray-950 border border-gray-800 text-white text-xs focus:outline-none focus:border-amber-500"
                  >
                    <option value="E-commerce">E-commerce</option>
                    <option value="Marca Personal">Marca Personal</option>
                    <option value="Servicios & Agencia">Servicios & Agencia</option>
                    <option value="Restaurantes & Gastronomía">Restaurantes & Gastronomía</option>
                    <option value="SaaS & Software">SaaS & Software</option>
                    <option value="Educación & Cursos">Educación & Cursos</option>
                    <option value="Inmobiliaria">Inmobiliaria</option>
                    <option value="Salud & Bienestar">Salud & Bienestar</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block">
                    Emoji Representativo
                  </label>
                  <input
                    type="text"
                    value={formEmoji}
                    onChange={(e) => setFormEmoji(e.target.value)}
                    placeholder="👟"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-gray-950 border border-gray-800 text-white text-center text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block">
                  Descripción Corta
                </label>
                <textarea
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Objetivos principales, productos clave, tono de voz o notas de la marca..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-gray-950 border border-gray-800 text-white text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block">
                  Sitio Web o URL (Opcional)
                </label>
                <input
                  type="url"
                  value={formWebsite}
                  onChange={(e) => setFormWebsite(e.target.value)}
                  placeholder="https://midominio.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-gray-950 border border-gray-800 text-white text-xs focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div className="pt-4 border-t border-gray-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-black shadow-lg shadow-amber-500/20"
                >
                  {editingProject ? 'Guardar Cambios' : 'Crear Carpeta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

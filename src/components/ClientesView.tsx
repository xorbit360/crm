import React, { useState, useEffect } from 'react';
import { Search, Plus, Filter, ArrowDownToLine, Users, RefreshCw, Sparkles, AlertCircle, ShoppingBag, MapPin, Tag, Calendar, DollarSign, UserCheck, Trash2, Edit3, X, HelpCircle, ShieldAlert, TrendingUp, TrendingDown, Truck, ThumbsUp, ThumbsDown, Eye, Clock } from 'lucide-react';
import { buildAdminDemoClients, isPrincipalAdmin, scopedStorageKey } from '../lib/demoSales';

export interface OrderHistoryItem {
  id: string;
  product: string;
  total: number;
  date: string;
  status: 'Entregado' | 'Devuelto' | 'Cancelado' | 'En camino';
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  city: string;
  department: string;
  product: string;
  campaign: string;
  isRecurring: boolean;
  registrationDate: string;
  totalTicket: number;
  // Logistics history fields
  totalOrdersCount: number;
  deliveredCount: number;
  returnedCount: number;
  cancelledCount: number;
  logisticsRisk: 'low' | 'medium' | 'high';
  orderHistory?: OrderHistoryItem[];
  notes?: string;
  tags?: string[];
}

export default function ClientesView({ currentUser }: { currentUser?: { role?: string; email?: string } | null }) {
  const [clients, setClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState('ALL');
  const [filterRecur, setFilterRecur] = useState('ALL');
  const [filterCampaign, setFilterCampaign] = useState('ALL');
  const [filterRisk, setFilterRisk] = useState('ALL');
  const clientsStorageKey = scopedStorageKey('crm_clients', currentUser);

  // Selected client for history detail modal
  const [historyModalClient, setHistoryModalClient] = useState<Client | null>(null);

  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formDept, setFormDept] = useState('');
  const [formProduct, setFormProduct] = useState('');
  const [formCampaign, setFormCampaign] = useState('');
  const [formIsRecurring, setFormIsRecurring] = useState(false);
  const [formDate, setFormDate] = useState('');
  const [formTicket, setFormTicket] = useState(0);

  // AI Extractor states
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiText, setAiText] = useState('');
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);

  // Load clients
  useEffect(() => {
    if (isPrincipalAdmin(currentUser)) {
      const demoClients = buildAdminDemoClients();
      const taggedClients = demoClients.map((client, index) => ({
        ...client,
        tags: [index % 4 === 0 ? 'Clientes recuperados' : index % 4 === 1 ? 'Clientes nuevos' : index % 4 === 2 ? 'Clientes perdidos' : 'Post-Venta', 'Combo Polos']
      }));
      setClients(taggedClients);
      localStorage.setItem(clientsStorageKey, JSON.stringify(taggedClients));
      return;
    }
    setClients([]);
    localStorage.setItem(clientsStorageKey, JSON.stringify([]));
    return;
    /* Legacy mock data remains below for reference only. */
    const stored = localStorage.getItem('crm_clients');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);

        // Forced reset if they contain the old high return rates (> 7%) or old CLI-1003 mock data
        const hasHighReturns = parsed.some((c: any) => (c.returnedCount / (c.totalOrdersCount || 1)) > 0.07);
        if (hasHighReturns) {
          initializeMockData();
          return;
        }

        // Ensure all loaded clients have the logistics properties
        const migration = parsed.map((c: any) => {
          if (c.totalOrdersCount !== undefined) return c;

          // Generate defaults if they don't exist
          const totalCount = c.isRecurring ? 15 : 1;
          const returned = c.id === 'CLI-1003' ? 1 : (c.id === 'CLI-1002' ? 1 : 0);
          const delivered = totalCount - returned;
          const risk = 'low';

          return {
            ...c,
            totalOrdersCount: totalCount,
            deliveredCount: delivered,
            returnedCount: returned,
            cancelledCount: 0,
            logisticsRisk: risk,
            notes: c.id === 'CLI-1003' ? 'Cliente de alta recurrencia con excelente tasa de entrega.' : '',
            orderHistory: [
              { id: `PED-${Math.floor(1000 + Math.random() * 9000)}`, product: c.product, total: c.totalTicket, date: c.registrationDate, status: 'Entregado' }
            ]
          };
        });
        setClients(migration);
      } catch (e) {
        initializeMockData();
      }
    } else {
      initializeMockData();
    }
  }, [currentUser?.email, clientsStorageKey]);

  const initializeMockData = () => {
    const mock: Client[] = [
      {
        id: "CLI-1001",
        name: "María Camila Restrepo",
        phone: "+57 300 123 4567",
        city: "Medellín",
        department: "Antioquia",
        product: "Smartwatch Ultra X8",
        campaign: "Anuncio Facebook - 30% Off",
        isRecurring: true,
        registrationDate: "2026-07-05",
        totalTicket: 360000,
        totalOrdersCount: 25,
        deliveredCount: 24,
        returnedCount: 0,
        cancelledCount: 1,
        logisticsRisk: "low",
        notes: "Excelente cliente recurrente. Responde llamadas de confirmación de inmediato y valora el envío rápido.",
        orderHistory: [
          { id: "PED-8721", product: "Smartwatch Ultra X8", total: 120000, date: "2026-07-05", status: "Entregado" },
          { id: "PED-8210", product: "Auriculares Pro 4", total: 190000, date: "2026-06-20", status: "Entregado" },
          { id: "PED-7988", product: "Licuadora Portátil ShakeGo", total: 50000, date: "2026-05-15", status: "Cancelado" }
        ]
      },
      {
        id: "CLI-1002",
        name: "Juan Pérez",
        phone: "+57 312 444 5566",
        city: "Cali",
        department: "Valle del Cauca",
        product: "Auriculares Pro 4",
        campaign: "Google Search - Orgánico",
        isRecurring: true,
        registrationDate: "2026-07-04",
        totalTicket: 380000,
        totalOrdersCount: 15,
        deliveredCount: 14,
        returnedCount: 1,
        cancelledCount: 0,
        logisticsRisk: "low",
        notes: "Un pedido devuelto debido a error fortuito del transportista (dirección no encontrada). Los otros 14 entregados perfectamente.",
        orderHistory: [
          { id: "PED-8644", product: "Auriculares Pro 4", total: 190000, date: "2026-07-04", status: "Entregado" },
          { id: "PED-8332", product: "Auriculares Pro 4", total: 190000, date: "2026-06-18", status: "Devuelto" },
          { id: "PED-7411", product: "Smartwatch Ultra X8", total: 120000, date: "2026-04-10", status: "Entregado" }
        ]
      },
      {
        id: "CLI-1003",
        name: "Carlos Ruiz",
        phone: "+57 315 888 9900",
        city: "Bogotá",
        department: "Cundinamarca",
        product: "Aspiradora Robot CleanMax",
        campaign: "Instagram Stories - Influencer",
        isRecurring: true,
        registrationDate: "2026-07-03",
        totalTicket: 1050000,
        totalOrdersCount: 20,
        deliveredCount: 19,
        returnedCount: 1,
        cancelledCount: 0,
        logisticsRisk: "low",
        notes: "Cliente muy fiel con alto ticket promedio. Solo un pedido devuelto por viaje imprevisto, reprogramado y entregado.",
        orderHistory: [
          { id: "PED-8551", product: "Aspiradora Robot CleanMax", total: 350000, date: "2026-07-03", status: "Devuelto" },
          { id: "PED-8002", product: "Aspiradora Robot CleanMax", total: 350000, date: "2026-06-01", status: "Entregado" },
          { id: "PED-7231", product: "Aspiradora Robot CleanMax", total: 350000, date: "2026-03-22", status: "Entregado" }
        ]
      },
      {
        id: "CLI-1004",
        name: "Estefanía Gómez",
        phone: "+57 322 777 4433",
        city: "Barranquilla",
        department: "Atlántico",
        product: "Licuadora Portátil ShakeGo",
        campaign: "TikTok Ads - Campaña Dropshipping",
        isRecurring: false,
        registrationDate: "2026-07-05",
        totalTicket: 85000,
        totalOrdersCount: 12,
        deliveredCount: 11,
        returnedCount: 0,
        cancelledCount: 1,
        logisticsRisk: "low",
        notes: "Excelente comportamiento de entrega, con un solo pedido cancelado previamente por cambio de color.",
        orderHistory: [
          { id: "PED-8812", product: "Licuadora Portátil ShakeGo", total: 85000, date: "2026-07-05", status: "Entregado" }
        ]
      }
    ];
    localStorage.setItem(clientsStorageKey, JSON.stringify(mock));
    setClients(mock);
  };

  const saveToStorage = (updated: Client[]) => {
    localStorage.setItem(clientsStorageKey, JSON.stringify(updated));
    setClients(updated);
  };

  const resetForm = () => {
    setFormName('');
    setFormPhone('');
    setFormCity('');
    setFormDept('');
    setFormProduct('');
    setFormCampaign('');
    setFormIsRecurring(false);
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormTicket(0);
    setSelectedClientId(null);
    setIsEditMode(false);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const handleOpenEdit = (client: Client) => {
    setFormName(client.name);
    setFormPhone(client.phone);
    setFormCity(client.city);
    setFormDept(client.department);
    setFormProduct(client.product);
    setFormCampaign(client.campaign);
    setFormIsRecurring(client.isRecurring);
    setFormDate(client.registrationDate);
    setFormTicket(client.totalTicket);
    setSelectedClientId(client.id);
    setIsEditMode(true);
    setIsFormOpen(true);
  };

  const handleDeleteClient = (id: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar este cliente?')) {
      const updated = clients.filter(c => c.id !== id);
      saveToStorage(updated);
    }
  };

  const handleSaveClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formPhone) {
      alert('Nombre y Teléfono son requeridos.');
      return;
    }

    if (isEditMode && selectedClientId) {
      const updated = clients.map(c => c.id === selectedClientId ? {
        ...c,
        name: formName,
        phone: formPhone,
        city: formCity,
        department: formDept,
        product: formProduct,
        campaign: formCampaign,
        isRecurring: formIsRecurring,
        registrationDate: formDate,
        totalTicket: Number(formTicket)
      } : c);
      saveToStorage(updated);
    } else {
      const newClient: Client = {
        id: `CLI-${Math.floor(1000 + Math.random() * 9000)}`,
        name: formName,
        phone: formPhone,
        city: formCity,
        department: formDept,
        product: formProduct,
        campaign: formCampaign || 'Manual / Orgánico',
        isRecurring: formIsRecurring,
        registrationDate: formDate || new Date().toISOString().split('T')[0],
        totalTicket: Number(formTicket) || 0,
        // Default logistics fields
        totalOrdersCount: 1,
        deliveredCount: 1,
        returnedCount: 0,
        cancelledCount: 0,
        logisticsRisk: 'low',
        notes: 'Ficha registrada de manera manual.',
        orderHistory: [
          {
            id: `PED-${Math.floor(1000 + Math.random() * 9000)}`,
            product: formProduct || 'Producto Desconocido',
            total: Number(formTicket) || 0,
            date: formDate || new Date().toISOString().split('T')[0],
            status: 'Entregado'
          }
        ]
      };
      saveToStorage([...clients, newClient]);
    }

    setIsFormOpen(false);
    resetForm();
  };

  const handleAiExtract = () => {
    if (!aiText.trim()) {
      alert('Por favor ingresa un fragmento de conversación para analizar.');
      return;
    }

    setIsAiAnalyzing(true);

    // Simulate AI extraction logic
    setTimeout(() => {
      const text = aiText.toLowerCase();

      // Heuristic extraction
      let name = '';
      const nameMatch = aiText.match(/me llamo\s+([A-Za-zñáéíóúÁÉÍÓÚ\s]{2,20})/i) ||
                        aiText.match(/nombre:\s*([A-Za-zñáéíóúÁÉÍÓÚ\s]{2,20})/i) ||
                        aiText.match(/soy\s+([A-Za-zñáéíóúÁÉÍÓÚ\s]{2,20})/i);
      if (nameMatch) {
        name = nameMatch[1].trim();
      } else {
        name = 'Cliente Extraído';
      }

      let city = 'Medellín';
      let department = 'Antioquia';
      if (text.includes('bogota') || text.includes('bogotá') || text.includes('cundinamarca')) {
        city = 'Bogotá';
        department = 'Cundinamarca';
      } else if (text.includes('cali') || text.includes('valle')) {
        city = 'Cali';
        department = 'Valle del Cauca';
      } else if (text.includes('barranquilla') || text.includes('atlantico') || text.includes('atlántico')) {
        city = 'Barranquilla';
        department = 'Atlántico';
      } else if (text.includes('bucaramanga') || text.includes('santander')) {
        city = 'Bucaramanga';
        department = 'Santander';
      }

      let phone = '+57 300 ' + Math.floor(1000000 + Math.random() * 9000000);
      const phoneMatch = aiText.match(/(3\d{2}\s?\d{3}\s?\d{4})/);
      if (phoneMatch) phone = '+57 ' + phoneMatch[1];

      let product = 'Smartwatch Ultra X8';
      if (text.includes('aspiradora') || text.includes('robot')) {
        product = 'Aspiradora Robot CleanMax';
      } else if (text.includes('audifonos') || text.includes('auriculares') || text.includes('pro')) {
        product = 'Auriculares Pro 4';
      } else if (text.includes('licuadora') || text.includes('shake')) {
        product = 'Licuadora Portátil ShakeGo';
      }

      let campaign = 'WhatsApp Bot IA - Autodetectado';
      if (text.includes('anuncio') || text.includes('facebook') || text.includes('fb')) {
        campaign = 'Anuncio Facebook - 30% Off';
      } else if (text.includes('instagram') || text.includes('influencer') || text.includes('ig')) {
        campaign = 'Instagram Stories - Influencer';
      } else if (text.includes('tiktok') || text.includes('video')) {
        campaign = 'TikTok Ads - Campaña Dropshipping';
      }

      let isRecurring = text.includes('recurrente') || text.includes('otra vez') || text.includes('segunda vez');

      let ticket = 120000;
      if (product.includes('Aspiradora')) ticket = 350000;
      if (product.includes('Auriculares')) ticket = 190000;
      if (product.includes('Licuadora')) ticket = 85000;

      // Fill form with AI detected fields
      setFormName(name);
      setFormPhone(phone);
      setFormCity(city);
      setFormDept(department);
      setFormProduct(product);
      setFormCampaign(campaign);
      setFormIsRecurring(isRecurring);
      setFormDate(new Date().toISOString().split('T')[0]);
      setFormTicket(ticket);

      setIsAiAnalyzing(false);
      setIsAiOpen(false);
      setIsFormOpen(true);
      setIsEditMode(false);
      setAiText('');
      alert('✨ IA ha completado el análisis y extraído los datos. Revisa la ficha generada antes de guardar.');
    }, 1500);
  };

  // Unique departments for filter list
  const departments = ['ALL', ...Array.from(new Set(clients.map(c => c.department)))];
  // Unique campaigns for filter list
  const campaigns = ['ALL', ...Array.from(new Set(clients.map(c => c.campaign)))];

  // Filtering clients
  const filteredClients = clients.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.phone.includes(searchTerm) ||
                          c.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.product.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDept = filterDept === 'ALL' || c.department === filterDept;
    const matchesCampaign = filterCampaign === 'ALL' || c.campaign === filterCampaign;

    let matchesRecur = true;
    if (filterRecur === 'YES') matchesRecur = c.isRecurring;
    if (filterRecur === 'NO') matchesRecur = !c.isRecurring;

    const matchesRisk = filterRisk === 'ALL' || c.logisticsRisk === filterRisk;

    return matchesSearch && matchesDept && matchesCampaign && matchesRecur && matchesRisk;
  });

  // Export CSV Simulation
  const handleExportCSV = () => {
    const headers = 'ID,Nombre,Telefono,Ciudad,Departamento,Producto Interesado,Campana Origen,Recurrente,Fecha Registro,Ticket de Compra\n';
    const rows = filteredClients.map(c =>
      `"${c.id}","${c.name}","${c.phone}","${c.city}","${c.department}","${c.product}","${c.campaign}","${c.isRecurring ? 'SI' : 'NO'}","${c.registrationDate}",${c.totalTicket}`
    ).join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `crm_clientes_xorbit360_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculate Metrics
  const totalClients = clients.length;
  const recurrentCount = clients.filter(c => c.isRecurring).length;
  const recurrenceRate = totalClients > 0 ? ((recurrentCount / totalClients) * 100).toFixed(0) : '0';
  const totalRevenue = clients.reduce((sum, c) => sum + c.totalTicket, 0);
  const avgTicket = totalClients > 0 ? (totalRevenue / totalClients).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }) : '$0';

  // Find top product
  const productCount: Record<string, number> = {};
  clients.forEach(c => {
    productCount[c.product] = (productCount[c.product] || 0) + 1;
  });
  let topProduct = 'Ninguno';
  let maxCount = 0;
  Object.entries(productCount).forEach(([p, count]) => {
    if (count > maxCount) {
      maxCount = count;
      topProduct = p;
    }
  });

  return (
    <div className="space-y-6 animate-fade-in text-left">

      {/* Header Info */}
      <div className="bg-[#0c0c0c] border border-gray-800 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-6 opacity-5">
          <Users size={120} />
        </div>
        <div className="max-w-2xl relative z-10">
          <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
            CRM de Clientes Inteligente
          </h3>
          <p className="text-xs text-gray-400">
            Base de datos unificada de clientes capturados automáticamente por el Bot de WhatsApp en sus conversaciones.
            Permite clasificar leads, guardar ciudades, departamentos, tickets de compra, recurrencias, productos interesados y procedencia publicitaria.
          </p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="panel p-5 rounded-xl border border-gray-800 bg-[#111] flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Users size={20} />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Total Clientes</p>
            <p className="text-xl font-bold font-mono text-white mt-0.5">{totalClients}</p>
          </div>
        </div>

        <div className="panel p-5 rounded-xl border border-gray-800 bg-[#111] flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400">
            <UserCheck size={20} />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Tasa Recurrencia</p>
            <p className="text-xl font-bold font-mono text-white mt-0.5">{recurrenceRate}%</p>
          </div>
        </div>

        <div className="panel p-5 rounded-xl border border-gray-800 bg-[#111] flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-400">
            <DollarSign size={20} />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Ticket Promedio</p>
            <p className="text-lg font-bold font-mono text-white mt-0.5">{avgTicket}</p>
          </div>
        </div>

        <div className="panel p-5 rounded-xl border border-gray-800 bg-[#111] flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <ShoppingBag size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Producto de Interés Top</p>
            <p className="text-xs font-bold text-white mt-1 truncate">{topProduct}</p>
          </div>
        </div>
      </div>

      {/* Search and Actions */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-[#111] p-4 rounded-xl border border-gray-800">
        <div className="flex-1 w-full relative">
          <Search size={16} className="text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nombre, teléfono, ciudad, producto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-black border border-gray-800 rounded-xl py-2 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-green-500 transition-colors"
          />
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <button
            onClick={() => setIsAiOpen(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-2 transition"
          >
            <Sparkles size={14} /> Extraer con IA
          </button>
          <button
            onClick={handleOpenCreate}
            className="bg-green-600 hover:bg-green-500 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-2 transition"
          >
            <Plus size={14} /> Nuevo Cliente
          </button>
          <button
            onClick={handleExportCSV}
            className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-2 transition"
          >
            <ArrowDownToLine size={14} /> Exportar CSV
          </button>
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-[#111] p-4 rounded-xl border border-gray-800/60 text-xs text-gray-400">
        <div>
          <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1.5">Filtrar por Departamento</label>
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="w-full bg-black border border-gray-800 rounded-lg p-2 text-white focus:border-green-500 outline-none cursor-pointer"
          >
            {departments.map((d) => (
              <option key={d} value={d}>{d === 'ALL' ? 'Todos los Departamentos' : d}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1.5">Filtrar por Recurrencia</label>
          <select
            value={filterRecur}
            onChange={(e) => setFilterRecur(e.target.value)}
            className="w-full bg-black border border-gray-800 rounded-lg p-2 text-white focus:border-green-500 outline-none cursor-pointer"
          >
            <option value="ALL">Todas las Recurrencias</option>
            <option value="YES">Es Recurrente (Varios pedidos)</option>
            <option value="NO">Primer Contacto / Nuevo</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1.5">Semaforo de Riesgo (Logística)</label>
          <select
            value={filterRisk}
            onChange={(e) => setFilterRisk(e.target.value)}
            className="w-full bg-black border border-gray-800 rounded-lg p-2 text-white focus:border-green-500 outline-none cursor-pointer"
          >
            <option value="ALL">Todos los Riesgos</option>
            <option value="low">Riesgo Bajo (Buen Cliente) ✅</option>
            <option value="medium">Riesgo Medio ⚠️</option>
            <option value="high">Riesgo Alto (Muchas Devoluciones) 🚨</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1.5">Filtrar por Campaña/Anuncio</label>
          <select
            value={filterCampaign}
            onChange={(e) => setFilterCampaign(e.target.value)}
            className="w-full bg-black border border-gray-800 rounded-lg p-2 text-white focus:border-green-500 outline-none cursor-pointer"
          >
            {campaigns.map((c) => (
              <option key={c} value={c}>{c === 'ALL' ? 'Todas las Fuentes' : c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="panel bg-[#0c0c0c] rounded-xl border border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-800 bg-[#111] text-[10px] text-gray-500 uppercase font-bold">
                <th className="p-4">ID / Nombre</th>
                <th className="p-4">Contacto</th>
                <th className="p-4">Ubicación</th>
                <th className="p-4">Interés / Campaña</th>
                <th className="p-4">Reputación Logística</th>
                <th className="p-4">Tickets Acumulados</th>
                <th className="p-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-850 text-xs">
              {filteredClients.length > 0 ? (
                filteredClients.map((client) => {
                  const returnRate = client.totalOrdersCount > 0
                    ? Math.round((client.returnedCount / client.totalOrdersCount) * 100)
                    : 0;

                  return (
                    <tr key={client.id} className="hover:bg-gray-900/30 transition-colors">
                      <td className="p-4">
                        <div>
                          <span className="font-bold text-white text-sm block">{client.name}</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {(client.tags || []).map(tag => <span key={tag} className="rounded px-1.5 py-0.5 text-[8px] font-bold bg-zinc-800 text-zinc-300">{tag}</span>)}
                          </div>
                          <span className="font-mono text-[9px] text-gray-500 mt-0.5 block flex items-center gap-1">
                            {client.id}
                            {client.isRecurring && (
                              <span className="bg-emerald-500/10 text-emerald-400 text-[8px] px-1 rounded font-sans font-bold">Recurrente</span>
                            )}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 font-mono text-gray-300">{client.phone}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          <MapPin size={12} className="text-red-400 shrink-0" />
                          <div>
                            <span className="text-gray-200 block">{client.city}</span>
                            <span className="text-[10px] text-gray-500 block">{client.department}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div>
                          <span className="text-gray-200 block font-medium">{client.product}</span>
                          <span className="text-[10px] text-gold/70 block mt-0.5">{client.campaign}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="space-y-1">
                          {client.logisticsRisk === 'high' ? (
                            <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 w-fit">
                              <ShieldAlert size={10} /> Alto Riesgo ({returnRate}% Dev)
                            </span>
                          ) : client.logisticsRisk === 'medium' ? (
                            <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 w-fit">
                              <AlertCircle size={10} /> Riesgo Medio ({returnRate}% Dev)
                            </span>
                          ) : client.totalOrdersCount > 1 ? (
                            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 w-fit">
                              <UserCheck size={10} /> Excelente ({returnRate}% Dev)
                            </span>
                          ) : (
                            <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 w-fit">
                              <Clock size={10} /> Nuevo ({returnRate}% Dev)
                            </span>
                          )}
                          <p className="text-[10px] text-gray-500 font-mono">
                            {client.deliveredCount} Ent / {client.returnedCount} Dev ({client.totalOrdersCount} tot)
                          </p>
                        </div>
                      </td>
                      <td className="p-4">
                        <div>
                          <span className="font-bold font-mono text-green-400 block">
                            {client.totalTicket.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}
                          </span>
                          <span className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
                            <Calendar size={10} /> {client.registrationDate}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setHistoryModalClient(client)}
                            className="p-1.5 bg-blue-950/30 hover:bg-blue-900/40 text-blue-400 hover:text-blue-300 rounded border border-blue-900/20 transition flex items-center gap-1"
                            title="Ver Perfil Logístico e Historial"
                          >
                            <Eye size={13} />
                            <span className="text-[9px] font-bold">Historial</span>
                          </button>
                          <button
                            onClick={() => handleOpenEdit(client)}
                            className="p-1.5 bg-gray-800 hover:bg-gray-750 text-gray-400 hover:text-white rounded transition"
                            title="Editar Ficha"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            onClick={() => handleDeleteClient(client.id)}
                            className="p-1.5 bg-red-950/20 hover:bg-red-900/20 text-red-400 hover:text-red-300 rounded border border-red-900/10 transition"
                            title="Eliminar"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500 italic bg-[#0f0f0f]/50">
                    No se encontraron clientes con los filtros aplicados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE & EDIT FORM MODAL */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0c0c0c] border border-gray-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-scale-up relative">
            <button
              onClick={() => setIsFormOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white transition"
            >
              <X size={18} />
            </button>
            <div className="p-6 border-b border-gray-800 bg-[#111]">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Users size={18} className="text-green-500" />
                {isEditMode ? 'Editar Ficha de Cliente' : 'Registrar Nuevo Cliente'}
              </h3>
              <p className="text-[10px] text-gray-400 mt-1">Ingresa los datos para mantener el historial de ventas del chatbot actualizado.</p>
            </div>

            <form onSubmit={handleSaveClient} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar text-left">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Nombre Completo</label>
                  <input
                    type="text"
                    required
                    placeholder="ej. María Camila Restrepo"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full bg-black border border-gray-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Número de Teléfono</label>
                  <input
                    type="text"
                    required
                    placeholder="ej. +57 300 123 4567"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full bg-black border border-gray-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-green-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Ciudad</label>
                  <input
                    type="text"
                    placeholder="ej. Medellín"
                    value={formCity}
                    onChange={(e) => setFormCity(e.target.value)}
                    className="w-full bg-black border border-gray-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Departamento</label>
                  <input
                    type="text"
                    placeholder="ej. Antioquia"
                    value={formDept}
                    onChange={(e) => setFormDept(e.target.value)}
                    className="w-full bg-black border border-gray-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-green-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Producto Interesado</label>
                  <input
                    type="text"
                    placeholder="ej. Smartwatch Ultra X8"
                    value={formProduct}
                    onChange={(e) => setFormProduct(e.target.value)}
                    className="w-full bg-black border border-gray-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Campaña / Anuncio Origen</label>
                  <input
                    type="text"
                    placeholder="ej. Facebook Ads - Campaña 3"
                    value={formCampaign}
                    onChange={(e) => setFormCampaign(e.target.value)}
                    className="w-full bg-black border border-gray-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-green-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Fecha de Registro</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full bg-black border border-gray-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Ticket de Compra Acumulado (COP)</label>
                  <input
                    type="number"
                    placeholder="ej. 120000"
                    value={formTicket}
                    onChange={(e) => setFormTicket(Number(e.target.value))}
                    className="w-full bg-black border border-gray-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-green-500"
                  />
                </div>
              </div>

              <div className="bg-[#111] p-3 rounded-xl border border-gray-800 flex items-center justify-between">
                <div className="text-left">
                  <p className="text-xs font-bold text-white">¿Es Cliente Recurrente?</p>
                  <p className="text-[10px] text-gray-500">¿Ha registrado múltiples compras o contactos repetidos?</p>
                </div>
                <input
                  type="checkbox"
                  checked={formIsRecurring}
                  onChange={(e) => setFormIsRecurring(e.target.checked)}
                  className="w-4 h-4 text-green-500 bg-black border-gray-800 rounded"
                />
              </div>

              <div className="flex gap-2 pt-4 border-t border-gray-850">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="flex-1 bg-gray-900 hover:bg-gray-850 text-gray-400 hover:text-white transition font-bold py-2.5 rounded-lg text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-green-600 hover:bg-green-500 text-white transition font-bold py-2.5 rounded-lg text-xs"
                >
                  {isEditMode ? 'Guardar Cambios' : 'Registrar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI EXTRACTOR MODAL */}
      {isAiOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0c0c0c] border border-gray-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-scale-up relative">
            <button
              onClick={() => setIsAiOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white transition"
            >
              <X size={18} />
            </button>
            <div className="p-6 border-b border-gray-800 bg-[#111]">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles size={18} className="text-blue-400" />
                Extraer Ficha de Cliente con IA
              </h3>
              <p className="text-[10px] text-gray-400 mt-1">
                Pega el log de la conversación de WhatsApp con tu cliente.
                Nuestra IA analizará el texto para extraer automáticamente el nombre, ciudad, producto, campaña y ticket de compra.
              </p>
            </div>

            <div className="p-6 space-y-4 text-left">
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1.5">Conversación / Chat Log</label>
                <textarea
                  value={aiText}
                  onChange={(e) => setAiText(e.target.value)}
                  placeholder="Pegue aquí el chat. Ej:
[10:01] Cliente: Hola me llamo María Camila Restrepo, vi un anuncio en Facebook del Smartwatch Ultra y me interesa. Tienen envío a Bogotá?
[10:02] Bot: ¡Hola María! Sí claro, tenemos envío a Bogotá, departamento de Cundinamarca por $120,000 con pago contra entrega."
                  className="w-full bg-black border border-gray-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-blue-500 h-40 resize-none font-mono placeholder:text-gray-600"
                />
              </div>

              <div className="flex gap-2 pt-4 border-t border-gray-850">
                <button
                  type="button"
                  onClick={() => setIsAiOpen(false)}
                  className="flex-1 bg-gray-900 hover:bg-gray-850 text-gray-400 hover:text-white transition font-bold py-2.5 rounded-lg text-xs"
                >
                  Cerrar
                </button>
                <button
                  onClick={handleAiExtract}
                  disabled={isAiAnalyzing}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white transition font-bold py-2.5 rounded-lg text-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isAiAnalyzing ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" /> Analizando...
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} /> Analizar con IA
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL & LOGISTICS PROFILE MODAL */}
      {historyModalClient && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0c0c0c] border border-gray-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-scale-up relative flex flex-col max-h-[90vh]">
            <button
              onClick={() => setHistoryModalClient(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition bg-gray-900/60 p-1.5 rounded-full z-10"
            >
              <X size={16} />
            </button>

            {/* Header */}
            <div className="p-6 border-b border-gray-800 bg-[#111] flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${
                historyModalClient.logisticsRisk === 'high'
                  ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                  : historyModalClient.logisticsRisk === 'medium'
                  ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                  : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
              }`}>
                <Truck size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  Historial Logístico y Reputación de Fletes
                </h3>
                <p className="text-xs text-gray-400">
                  Análisis de fletes, entregas, cancelaciones y riesgos de devolución para {historyModalClient.name}
                </p>
              </div>
            </div>

            {/* Content (Scrollable) */}
            <div className="p-6 space-y-6 overflow-y-auto text-left flex-1">

              {/* Profile Card & Traffic Light */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#111] border border-gray-800 rounded-xl p-4 flex flex-col justify-between">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Semaforo de Riesgo</span>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className={`w-3.5 h-3.5 rounded-full ${historyModalClient.logisticsRisk === 'high' ? 'bg-red-500 shadow-lg shadow-red-500/30' : 'bg-red-950'}`}></div>
                      <div className={`w-3.5 h-3.5 rounded-full ${historyModalClient.logisticsRisk === 'medium' ? 'bg-amber-500 shadow-lg shadow-amber-500/30' : 'bg-amber-950'}`}></div>
                      <div className={`w-3.5 h-3.5 rounded-full ${historyModalClient.logisticsRisk === 'low' ? 'bg-emerald-500 shadow-lg shadow-emerald-500/30' : 'bg-emerald-950'}`}></div>
                    </div>
                    <span className={`text-xs font-bold uppercase tracking-wider ml-1 ${
                      historyModalClient.logisticsRisk === 'high' ? 'text-red-400' :
                      historyModalClient.logisticsRisk === 'medium' ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                      {historyModalClient.logisticsRisk === 'high' ? 'Alto Riesgo' :
                       historyModalClient.logisticsRisk === 'medium' ? 'Riesgo Medio' : 'Buen Cliente'}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-2 italic">Calculado según tasa de fletes rehusados.</p>
                </div>

                <div className="bg-[#111] border border-gray-800 rounded-xl p-4 flex flex-col justify-between">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Efectividad de Entrega</span>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-2xl font-bold font-mono text-white">
                      {historyModalClient.totalOrdersCount > 0
                        ? Math.round((historyModalClient.deliveredCount / historyModalClient.totalOrdersCount) * 100)
                        : 100}%
                    </span>
                    <span className="text-[10px] text-gray-400">éxito</span>
                  </div>
                  <div className="w-full bg-gray-800 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        historyModalClient.logisticsRisk === 'high' ? 'bg-red-500' :
                        historyModalClient.logisticsRisk === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${historyModalClient.totalOrdersCount > 0 ? (historyModalClient.deliveredCount / historyModalClient.totalOrdersCount) * 100 : 100}%` }}
                    ></div>
                  </div>
                </div>

                <div className="bg-[#111] border border-gray-800 rounded-xl p-4 flex flex-col justify-between">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Métricas de Envío</span>
                  <div className="mt-2 grid grid-cols-3 gap-1 font-mono text-center">
                    <div className="bg-emerald-950/20 rounded p-1">
                      <span className="text-emerald-400 text-xs font-bold block">{historyModalClient.deliveredCount}</span>
                      <span className="text-[8px] text-gray-500 block uppercase">Entregas</span>
                    </div>
                    <div className="bg-red-950/20 rounded p-1">
                      <span className="text-red-400 text-xs font-bold block">{historyModalClient.returnedCount}</span>
                      <span className="text-[8px] text-gray-500 block uppercase">Devueltos</span>
                    </div>
                    <div className="bg-gray-900 rounded p-1">
                      <span className="text-gray-400 text-xs font-bold block">{historyModalClient.cancelledCount}</span>
                      <span className="text-[8px] text-gray-500 block uppercase">Canc</span>
                    </div>
                  </div>
                  <p className="text-[9px] text-gray-500 mt-2 font-mono">Pedidos totales: {historyModalClient.totalOrdersCount}</p>
                </div>
              </div>

              {/* Logistical Advice Banner */}
              <div className={`p-4 rounded-xl border flex gap-3 ${
                historyModalClient.logisticsRisk === 'high'
                  ? 'bg-red-950/15 border-red-900/30 text-red-300'
                  : historyModalClient.logisticsRisk === 'medium'
                  ? 'bg-amber-950/15 border-amber-900/30 text-amber-300'
                  : 'bg-emerald-950/15 border-emerald-900/30 text-emerald-300'
              }`}>
                <div className="mt-0.5">
                  {historyModalClient.logisticsRisk === 'high' ? (
                    <ShieldAlert size={18} className="text-red-400" />
                  ) : historyModalClient.logisticsRisk === 'medium' ? (
                    <AlertCircle size={18} className="text-amber-400" />
                  ) : (
                    <UserCheck size={18} className="text-emerald-400" />
                  )}
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider">
                    {historyModalClient.logisticsRisk === 'high' ? 'Alerta: Exigir Pago Anticipado de Envío' :
                     historyModalClient.logisticsRisk === 'medium' ? 'Recomendación: Doble Confirmación Telefónica' :
                     'Estatus: Cliente Estrella de Alta Confianza'}
                  </h4>
                  <p className="text-[11px] leading-relaxed opacity-90">
                    {historyModalClient.logisticsRisk === 'high'
                      ? 'Este cliente tiene una alta tasa de devoluciones en envíos contra entrega. Se recomienda encarecidamente NO despachar sin cobrar el valor del flete por adelantado vía transferencia, de lo contrario asumirá pérdidas por flete de retorno.'
                      : historyModalClient.logisticsRisk === 'medium'
                      ? 'Registra un historial mixto. Antes de despachar por transportadoras (Servientrega, Envía, Coordinadora), llame personalmente para validar la dirección, disponibilidad del dinero e interés del cliente en recibir.'
                      : 'Cliente impecable con efectividad del 100%. Despachar de inmediato de forma prioritaria, este tipo de cliente es excelente para la salud financiera de tu operación de dropshipping.'}
                  </p>
                </div>
              </div>

              {/* Order History Timeline */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500 flex items-center gap-1.5">
                  <ShoppingBag size={12} /> Historial de Pedidos ({historyModalClient.orderHistory?.length || 0})
                </h4>

                <div className="bg-[#111] border border-gray-800 rounded-xl divide-y divide-gray-850">
                  {historyModalClient.orderHistory && historyModalClient.orderHistory.length > 0 ? (
                    historyModalClient.orderHistory.map((item) => (
                      <div key={item.id} className="p-3.5 flex items-center justify-between text-xs">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-gray-300">{item.id}</span>
                            <span className="text-gray-500">•</span>
                            <span className="text-gray-400">{item.date}</span>
                          </div>
                          <p className="font-medium text-white">{item.product}</p>
                        </div>
                        <div className="text-right space-y-1">
                          <span className="font-bold text-gray-200 block">
                            {item.total.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                            item.status === 'Entregado' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            item.status === 'Devuelto' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                            item.status === 'Cancelado' ? 'bg-gray-800 text-gray-400 border border-gray-700' :
                            'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          }`}>
                            {item.status}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-gray-500 italic text-[11px]">
                      No hay registros históricos de pedidos para este cliente.
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-800 bg-[#111] flex items-center justify-between">
              <span className="text-[10px] text-gray-500 font-mono">ID Cliente: {historyModalClient.id}</span>
              <button
                onClick={() => setHistoryModalClient(null)}
                className="bg-gray-800 hover:bg-gray-750 text-white font-bold px-5 py-2 rounded-xl text-xs transition"
              >
                Cerrar Historial
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

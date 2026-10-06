import React, { useState } from 'react';
import { DollarSign, Server, Cpu, MessageSquare, Database, TrendingUp, Users, PieChart, ShieldCheck, Zap, Calculator, ArrowUpRight, Plus, Edit3, Trash2, Check, CheckCircle2, Download, Layers } from 'lucide-react';

interface ModuleCost {
  id: string;
  moduleName: string;
  category: 'ia' | 'whatsapp' | 'hosting' | 'landings' | 'voz' | 'email';
  unitCostUSD: number;
  billingUnit: string;
  estimatedUsagePerUser: number;
  monthlyTotalPerUser: number;
}

interface AccountTier {
  id: string;
  tierName: string;
  usersCount: number;
  monthlyFeeUSD: number;
  modulesIncluded: string[];
  estimatedCostPerUserUSD: number;
}

const initialModuleCosts: ModuleCost[] = [
  {
    id: 'mc-1',
    moduleName: 'Motor IA Gemini 2.5 Flash',
    category: 'ia',
    unitCostUSD: 0.0000005, // $0.50 per 1M tokens
    billingUnit: 'Token procesado',
    estimatedUsagePerUser: 120000,
    monthlyTotalPerUser: 0.06
  },
  {
    id: 'mc-2',
    moduleName: 'WhatsApp Business API (Meta)',
    category: 'whatsapp',
    unitCostUSD: 0.0035,
    billingUnit: 'Conversación iniciada',
    estimatedUsagePerUser: 350,
    monthlyTotalPerUser: 1.225
  },
  {
    id: 'mc-3',
    moduleName: 'Infraestructura Cloud Run & DB',
    category: 'hosting',
    unitCostUSD: 0.85,
    billingUnit: 'Usuario activo / mes',
    estimatedUsagePerUser: 1,
    monthlyTotalPerUser: 0.85
  },
  {
    id: 'mc-4',
    moduleName: 'CDN & SSL Certs para Landings',
    category: 'landings',
    unitCostUSD: 0.15,
    billingUnit: 'Dominio / landing activa',
    estimatedUsagePerUser: 3,
    monthlyTotalPerUser: 0.45
  },
  {
    id: 'mc-5',
    moduleName: 'Llamadas & Sintetizador de Voz IA',
    category: 'voz',
    unitCostUSD: 0.02,
    billingUnit: 'Minuto de llamada',
    estimatedUsagePerUser: 15,
    monthlyTotalPerUser: 0.30
  }
];

const initialTiers: AccountTier[] = [
  {
    id: 't-1',
    tierName: 'Dropshipper Starter',
    usersCount: 820,
    monthlyFeeUSD: 29,
    modulesIncluded: ['Branding', 'Landings COD', 'Meta Ads', 'WhatsApp Bot'],
    estimatedCostPerUserUSD: 1.85
  },
  {
    id: 't-2',
    tierName: 'Dropshipper PRO 360°',
    usersCount: 360,
    monthlyFeeUSD: 59,
    modulesIncluded: ['Todos los módulos', 'Llamadas IA', 'Secuencias Email', 'Dominios Ilimitados'],
    estimatedCostPerUserUSD: 3.20
  },
  {
    id: 't-3',
    tierName: 'Agencia & Escalado Enterprise',
    usersCount: 70,
    monthlyFeeUSD: 149,
    modulesIncluded: ['Múltiples Usuarios', 'Soporte VIP', 'API Dedicada', 'High-Volume Tokens'],
    estimatedCostPerUserUSD: 8.50
  }
];

export default function CostosSaasView() {
  const [moduleCosts, setModuleCosts] = useState<ModuleCost[]>(initialModuleCosts);
  const [accountTiers, setAccountTiers] = useState<AccountTier[]>(initialTiers);
  const [showAddModal, setShowAddModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New module cost form state
  const [newModuleName, setNewModuleName] = useState('');
  const [newCategory, setNewCategory] = useState<ModuleCost['category']>('ia');
  const [newUnitCost, setNewUnitCost] = useState('0.005');
  const [newBillingUnit, setNewBillingUnit] = useState('Petición API');
  const [newUsagePerUser, setNewUsagePerUser] = useState('100');

  // Overall totals
  const totalUsers = accountTiers.reduce((acc, t) => acc + t.usersCount, 0);
  const totalCostPerUserOverall = moduleCosts.reduce((acc, mc) => acc + mc.monthlyTotalPerUser, 0);

  const totalMonthlyRevenue = accountTiers.reduce((acc, t) => acc + (t.usersCount * t.monthlyFeeUSD), 0);
  const totalMonthlyCost = accountTiers.reduce((acc, t) => acc + (t.usersCount * t.estimatedCostPerUserUSD), 0);
  const netProfitMonthly = totalMonthlyRevenue - totalMonthlyCost;
  const profitMargin = totalMonthlyRevenue > 0 ? ((netProfitMonthly / totalMonthlyRevenue) * 100).toFixed(1) : '0';

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleAddModuleCost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModuleName.trim()) return;

    const unitPrice = parseFloat(newUnitCost) || 0;
    const usage = parseFloat(newUsagePerUser) || 0;
    const monthlyTotal = unitPrice * usage;

    const newEntry: ModuleCost = {
      id: 'mc-' + Date.now(),
      moduleName: newModuleName,
      category: newCategory,
      unitCostUSD: unitPrice,
      billingUnit: newBillingUnit,
      estimatedUsagePerUser: usage,
      monthlyTotalPerUser: monthlyTotal
    };

    setModuleCosts([...moduleCosts, newEntry]);
    setShowAddModal(false);
    setNewModuleName('');
    triggerToast('¡Nuevo costo operativo registrado exitosamente!');
  };

  const handleDeleteCost = (id: string) => {
    setModuleCosts(moduleCosts.filter(m => m.id !== id));
    triggerToast('Costo operativo eliminado de la tabla.');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="panel p-6 sm:p-8 rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-gray-900 via-gray-900 to-cyan-950/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
            <Calculator size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-black px-2.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                PANEL ADMINISTRADOR DE COSTOS OPERATIVOS SAAS
              </span>
              {toastMessage && (
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-bold flex items-center gap-1">
                  <CheckCircle2 size={12} /> {toastMessage}
                </span>
              )}
            </div>
            <h2 className="text-2xl font-bold font-display text-white mt-1">Costos por Módulo & Rentabilidad Real de Cuentas</h2>
            <p className="text-gray-400 text-xs mt-0.5">
              Registra, ajusta y analiza los costos unitarios de infraestructura (Tokens IA, WhatsApp API, Hosting, Dominios) para calcular automáticamente la ganancia neta por usuario y por nivel de suscripción.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-5 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs rounded-xl transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <Plus size={18} /> Registrar Costo / Módulo
        </button>
      </div>

      {/* Top Level KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="panel p-5 rounded-2xl border border-gray-800 bg-gray-900/60 space-y-2">
          <span className="text-[11px] text-gray-400 uppercase font-bold flex items-center gap-1.5">
            <Users size={14} className="text-cyan-400" /> Cuentas Activas Totales
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">{totalUsers.toLocaleString()}</span>
            <span className="text-xs text-gray-400">usuarios</span>
          </div>
          <p className="text-[11px] text-gray-400">Sumatoria de todos los planes SaaS</p>
        </div>

        <div className="panel p-5 rounded-2xl border border-gray-800 bg-gray-900/60 space-y-2">
          <span className="text-[11px] text-gray-400 uppercase font-bold flex items-center gap-1.5">
            <DollarSign size={14} className="text-amber-400" /> Costo Directo Promedio / Usuario
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-400">${totalCostPerUserOverall.toFixed(2)}</span>
            <span className="text-xs text-gray-400 font-mono">USD/mes</span>
          </div>
          <p className="text-[11px] text-gray-400">Suma de consumo por módulos activos</p>
        </div>

        <div className="panel p-5 rounded-2xl border border-gray-800 bg-gray-900/60 space-y-2">
          <span className="text-[11px] text-gray-400 uppercase font-bold flex items-center gap-1.5">
            <TrendingUp size={14} className="text-blue-400" /> Facturación Recurrente (MRR)
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">${totalMonthlyRevenue.toLocaleString('en-US')}</span>
            <span className="text-xs text-gray-400 font-mono">USD/mes</span>
          </div>
          <p className="text-[11px] text-gray-400">Ingresos por suscripciones de usuarios</p>
        </div>

        <div className="panel p-5 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 space-y-2">
          <span className="text-[11px] text-emerald-400 uppercase font-bold flex items-center gap-1.5">
            <DollarSign size={14} className="text-emerald-400" /> Utilidad Limpia Real ({profitMargin}%)
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-300">${netProfitMonthly.toLocaleString('en-US')}</span>
            <span className="text-xs text-emerald-400 font-mono">USD/mes</span>
          </div>
          <p className="text-[11px] text-emerald-300/80">Ganancia neta libre de costos de servidor e IA</p>
        </div>
      </div>

      {/* Operational Cost Table per Module */}
      <div className="panel p-6 rounded-2xl border border-gray-800 space-y-4 bg-black/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-800 pb-3">
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Layers size={16} className="text-cyan-400" /> Registro de Costos Directos por Módulo
            </h3>
            <p className="text-xs text-gray-400">Ajusta los precios unitarios de proveedores externos (Google AI, Meta API, Cloud Run, Twilio).</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-cyan-400 border border-cyan-500/30 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} /> Añadir Módulo
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-900 text-gray-400 uppercase tracking-wider border-b border-gray-800">
              <tr>
                <th className="p-3">Módulo / Servicio</th>
                <th className="p-3">Categoría</th>
                <th className="p-3">Costo Unitario</th>
                <th className="p-3">Unidad de Medida</th>
                <th className="p-3">Uso Estimado / Usuario / Mes</th>
                <th className="p-3 text-right">Costo Mensual / Usuario</th>
                <th className="p-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60 font-mono">
              {moduleCosts.map((mc) => (
                <tr key={mc.id} className="hover:bg-gray-900/50 transition">
                  <td className="p-3 font-sans font-bold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                    {mc.moduleName}
                  </td>
                  <td className="p-3 font-sans">
                    <span className="px-2 py-0.5 bg-gray-800 text-gray-300 rounded text-[10px] font-bold uppercase">
                      {mc.category}
                    </span>
                  </td>
                  <td className="p-3 text-cyan-300">${mc.unitCostUSD < 0.01 ? mc.unitCostUSD.toFixed(6) : mc.unitCostUSD.toFixed(3)} USD</td>
                  <td className="p-3 font-sans text-gray-400">{mc.billingUnit}</td>
                  <td className="p-3 text-amber-400 font-bold">{mc.estimatedUsagePerUser.toLocaleString()} {mc.billingUnit}s</td>
                  <td className="p-3 text-right text-emerald-400 font-black text-sm">${mc.monthlyTotalPerUser.toFixed(2)} USD</td>
                  <td className="p-3 text-center font-sans">
                    <button
                      onClick={() => handleDeleteCost(mc.id)}
                      className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-950/40 rounded transition"
                      title="Eliminar registro"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Profitability Breakdown by Subscription Tier */}
      <div className="panel p-6 rounded-2xl border border-emerald-500/30 space-y-4 bg-gradient-to-b from-gray-900 via-gray-900 to-emerald-950/20">
        <div className="border-b border-gray-800 pb-3">
          <h3 className="text-sm font-black text-emerald-400 uppercase tracking-wider flex items-center gap-2">
            <PieChart size={16} /> Rentabilidad Real por Tipo de Cuenta / Plan SaaS
          </h3>
          <p className="text-xs text-gray-400">Compara el cobro mensual contra el costo operativo real por cada grupo de usuarios registrados.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {accountTiers.map((tier) => {
            const revenueTier = tier.usersCount * tier.monthlyFeeUSD;
            const costTier = tier.usersCount * tier.estimatedCostPerUserUSD;
            const profitTier = revenueTier - costTier;
            const marginTier = revenueTier > 0 ? ((profitTier / revenueTier) * 100).toFixed(1) : '0';

            return (
              <div key={tier.id} className="p-5 rounded-2xl bg-black/60 border border-gray-800 space-y-4 relative overflow-hidden">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-black text-white text-base">{tier.tierName}</h4>
                    <span className="text-[11px] text-cyan-400 font-mono font-bold">{tier.usersCount} usuarios activos</span>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-xs font-black">
                    {marginTier}% Margen
                  </span>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-gray-800 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Suscripción Mensual:</span>
                    <strong className="text-white font-mono">${tier.monthlyFeeUSD} USD / user</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Costo Operativo Promedio:</span>
                    <strong className="text-amber-400 font-mono">${tier.estimatedCostPerUserUSD.toFixed(2)} USD / user</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Utilidad Limpia por Usuario:</span>
                    <strong className="text-emerald-400 font-mono">${(tier.monthlyFeeUSD - tier.estimatedCostPerUserUSD).toFixed(2)} USD</strong>
                  </div>
                </div>

                <div className="p-3 bg-gray-900 rounded-xl border border-gray-800 flex justify-between items-center text-xs">
                  <span className="text-gray-400 font-bold uppercase text-[10px]">Utilidad Total Plan:</span>
                  <span className="text-lg font-black text-emerald-300 font-mono">${profitTier.toLocaleString('en-US')} USD/mes</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL: REGISTRAR NUEVO COSTO OPERATIVO */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121215] border border-cyan-500/30 rounded-2xl max-w-md w-full p-6 space-y-4 text-white shadow-2xl relative">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white font-bold"
            >
              ✕
            </button>

            <div className="border-b border-gray-800 pb-3">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Plus size={18} className="text-cyan-400" /> Registrar Costo Operativo de Módulo
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Ingresa los datos de cobro del proveedor externo para calcular el gasto por usuario.
              </p>
            </div>

            <form onSubmit={handleAddModuleCost} className="space-y-4 text-xs">
              <div>
                <label className="block text-gray-300 font-bold mb-1">Nombre del Módulo / Servicio *</label>
                <input
                  type="text"
                  required
                  value={newModuleName}
                  onChange={(e) => setNewModuleName(e.target.value)}
                  placeholder="ej: Pasarela de Pagos Stripe / Servidor Redis"
                  className="w-full bg-black border border-gray-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-bold mb-1">Categoría</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as ModuleCost['category'])}
                    className="w-full bg-black border border-gray-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="ia">Inteligencia Artificial</option>
                    <option value="whatsapp">WhatsApp API</option>
                    <option value="hosting">Hosting / Cloud</option>
                    <option value="landings">Landings & CDN</option>
                    <option value="voz">Voz e IA Telefónica</option>
                    <option value="email">Email & SMS</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-300 font-bold mb-1">Unidad de Medida</label>
                  <input
                    type="text"
                    value={newBillingUnit}
                    onChange={(e) => setNewBillingUnit(e.target.value)}
                    placeholder="ej: Petición, Minuto, GB"
                    className="w-full bg-black border border-gray-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-bold mb-1">Costo Unitario USD *</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={newUnitCost}
                    onChange={(e) => setNewUnitCost(e.target.value)}
                    className="w-full bg-black border border-gray-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 font-bold mb-1">Uso Est. por Usuario / Mes</label>
                  <input
                    type="number"
                    value={newUsagePerUser}
                    onChange={(e) => setNewUsagePerUser(e.target.value)}
                    className="w-full bg-black border border-gray-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="p-3 bg-gray-900 rounded-xl border border-gray-800 flex justify-between items-center">
                <span className="text-gray-400 font-bold">Costo Estimado Resultante:</span>
                <span className="text-emerald-400 font-black font-mono">
                  ${((parseFloat(newUnitCost) || 0) * (parseFloat(newUsagePerUser) || 0)).toFixed(2)} USD / usuario
                </span>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-black rounded-xl shadow-lg shadow-cyan-500/20"
                >
                  Guardar Registro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


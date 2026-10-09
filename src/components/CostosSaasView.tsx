import React, { useState, useEffect, useMemo } from 'react';
import { DollarSign, Server, Cpu, MessageSquare, Database, TrendingUp, Users, PieChart, ShieldCheck, Zap, Calculator, ArrowUpRight, Plus, Edit3, Trash2, Check, CheckCircle2, Download, Layers, AlertCircle, RefreshCw, Activity } from 'lucide-react';

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

// Precios oficiales de IA (USD por 1M tokens) - verificables en proveedores
const AI_PRICING = {
  gpt4o: { label: 'GPT-4o (actual)', input: 2.50, output: 10.00 },
  geminiFlash: { label: 'Gemini 2.5 Flash', input: 0.30, output: 2.50 },
  gpt4oMini: { label: 'GPT-4o mini (todo)', input: 0.15, output: 0.60 },
} as const;
type AiModelKey = keyof typeof AI_PRICING;

// Medido de aiDebugLogs reales (49 logs, 2026-10-09): clasificacion ~184-301 prompt / 2-15 comp; respuesta ~2327 prompt / 43 comp
const MEASURED = {
  clasifPrompt: 220, clasifCompletion: 6,
  respPrompt: 2327, respCompletion: 43,
};
function costPerBotMessage(model: AiModelKey): number {
  const p = AI_PRICING[model];
  const clasif = (MEASURED.clasifPrompt / 1e6) * p.input + (MEASURED.clasifCompletion / 1e6) * p.output;
  const resp = (MEASURED.respPrompt / 1e6) * p.input + (MEASURED.respCompletion / 1e6) * p.output;
  return clasif + resp;
}
function costPerCallAvg(model: AiModelKey, avgPrompt: number, avgCompletion: number): number {
  const p = AI_PRICING[model];
  return (avgPrompt / 1e6) * p.input + (avgCompletion / 1e6) * p.output;
}

// Planes REALES de RecargasView / landing (no los tiers demo anteriores)
const REAL_PLANS = [
  { id: 'starter', name: 'Starter', price: 19, conversations: 500, aiMessagesPerConv: 25, channelsIncluded: 1 },
  { id: 'standard', name: 'Standard', price: 33, conversations: 1000, aiMessagesPerConv: 40, channelsIncluded: 2 },
  { id: 'pro', name: 'Pro', price: 69, conversations: 3000, aiMessagesPerConv: 50, channelsIncluded: 3, popular: true },
  { id: 'enterprise', name: 'Enterprise', price: 319, conversations: 20000, aiMessagesPerConv: 65, channelsIncluded: 5 },
];
const BOLD_FEE_PCT = 0.0359;
const BOLD_FEE_FIXED_COP = 900;
const TRM_EST = 4000;
function boldFeeUSD(priceUSD: number): number {
  return priceUSD * BOLD_FEE_PCT + BOLD_FEE_FIXED_COP / TRM_EST;
}
const WHATSAPP_PER_MSG_USD = 0.001; // rango CO utility/service $0.0008-$0.0010 por mensaje (Meta, desde jul-2025 cobra por mensaje)
const WHATSAPP_MSGS_PER_CONV = 10;
const INFRA_PER_USER_USD = 0.85;

const initialModuleCosts: ModuleCost[] = [
  {
    id: 'mc-1',
    moduleName: 'Motor IA GPT-4o (actual: clasif. + respuesta)',
    category: 'ia',
    unitCostUSD: 0.0068,
    billingUnit: 'Mensaje de usuario (2 llamadas IA)',
    estimatedUsagePerUser: 100,
    monthlyTotalPerUser: 0.68
  },
  {
    id: 'mc-2',
    moduleName: 'Motor IA Gemini 2.5 Flash (alternativa)',
    category: 'ia',
    unitCostUSD: 0.00088,
    billingUnit: 'Mensaje de usuario (2 llamadas IA)',
    estimatedUsagePerUser: 100,
    monthlyTotalPerUser: 0.088
  },
  {
    id: 'mc-3',
    moduleName: 'WhatsApp Business API (Meta CO)',
    category: 'whatsapp',
    unitCostUSD: WHATSAPP_PER_MSG_USD,
    billingUnit: 'Mensaje entregado (utility/service)',
    estimatedUsagePerUser: 3500,
    monthlyTotalPerUser: 3.50
  },
  {
    id: 'mc-4',
    moduleName: 'Infraestructura VPS + Supabase (prorrateo est.)',
    category: 'hosting',
    unitCostUSD: INFRA_PER_USER_USD,
    billingUnit: 'Usuario activo / mes',
    estimatedUsagePerUser: 1,
    monthlyTotalPerUser: 0.85
  },
  {
    id: 'mc-5',
    moduleName: 'CDN & SSL Certs para Landings',
    category: 'landings',
    unitCostUSD: 0.15,
    billingUnit: 'Dominio / landing activa',
    estimatedUsagePerUser: 3,
    monthlyTotalPerUser: 0.45
  },
  {
    id: 'mc-6',
    moduleName: 'Llamadas & Sintetizador de Voz IA',
    category: 'voz',
    unitCostUSD: 0.02,
    billingUnit: 'Minuto de llamada',
    estimatedUsagePerUser: 15,
    monthlyTotalPerUser: 0.30
  },
  {
    id: 'mc-7',
    moduleName: 'Pasarela Bold (3.59% + $900 COP)',
    category: 'email',
    unitCostUSD: BOLD_FEE_PCT,
    billingUnit: '% por transacción + fijo',
    estimatedUsagePerUser: 1,
    monthlyTotalPerUser: 0.91
  }
];

// Tiers demo ANTERIORES (820/360/70 a $29/$59/$149) NO coinciden con planes reales ni con users=0 del servidor.
// Se conservan solo como referencia editable; la rentabilidad oficial se calcula abajo con REAL_PLANS.
const initialTiers: AccountTier[] = [
  {
    id: 't-1',
    tierName: 'Starter (real $19)',
    usersCount: 0,
    monthlyFeeUSD: 19,
    modulesIncluded: ['500 conv', '25 msg IA/conv', '1 canal'],
    estimatedCostPerUserUSD: 1.85
  },
  {
    id: 't-2',
    tierName: 'Pro (real $69)',
    usersCount: 0,
    monthlyFeeUSD: 69,
    modulesIncluded: ['3.000 conv', '50 msg IA/conv', '3 canales'],
    estimatedCostPerUserUSD: 3.20
  },
  {
    id: 't-3',
    tierName: 'Enterprise (real $319)',
    usersCount: 0,
    monthlyFeeUSD: 319,
    modulesIncluded: ['20.000 conv', '65 msg IA/conv', '5 canales'],
    estimatedCostPerUserUSD: 8.50
  }
];

interface LiveMetrics {
  balance: { conversations: number; aiMessagesPerConv: number; audioMinutes: number; packagesBought: number; lastUsageAt?: string } | null;
  usageCounts: Record<string, number>;
  totalChats: number;
  demoChats: number;
  realChats: number;
  historyKeys: number;
  totalMessages: number;
  logsCount: number;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  avgTokensPerCall: number;
  avgPromptPerCall: number;
  avgCompletionPerCall: number;
  avgDurationMs: number;
  rechargeTotal: number;
  rechargeCompleted: number;
  rechargeProcessing: number;
  rechargeSaasRevenueUSD: number;
  rechargeTestRevenueUSD: number;
  channelsConnected: number;
  channelsTotal: number;
  fetchedAt: string;
}

export default function CostosSaasView() {
  const [moduleCosts, setModuleCosts] = useState<ModuleCost[]>(initialModuleCosts);
  const [accountTiers, setAccountTiers] = useState<AccountTier[]>(initialTiers);
  const [showAddModal, setShowAddModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [live, setLive] = useState<LiveMetrics | null>(null);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [liveLoading, setLiveLoading] = useState(false);
  const [aiModel, setAiModel] = useState<AiModelKey>('gpt4o');
  const [usageScenario, setUsageScenario] = useState<0.1 | 0.4 | 1>(0.4);

  // New module cost form state
  const [newModuleName, setNewModuleName] = useState('');
  const [newCategory, setNewCategory] = useState<ModuleCost['category']>('ia');
  const [newUnitCost, setNewUnitCost] = useState('0.005');
  const [newBillingUnit, setNewBillingUnit] = useState('Petición API');
  const [newUsagePerUser, setNewUsagePerUser] = useState('100');

  // Overall totals (tiers editables, referencia)
  const totalUsers = accountTiers.reduce((acc, t) => acc + t.usersCount, 0);
  const totalCostPerUserOverall = moduleCosts.reduce((acc, mc) => acc + mc.monthlyTotalPerUser, 0);

  const totalMonthlyRevenue = accountTiers.reduce((acc, t) => acc + (t.usersCount * t.monthlyFeeUSD), 0);
  const totalMonthlyCost = accountTiers.reduce((acc, t) => acc + (t.usersCount * t.estimatedCostPerUserUSD), 0);
  const netProfitMonthly = totalMonthlyRevenue - totalMonthlyCost;
  const profitMargin = totalMonthlyRevenue > 0 ? ((netProfitMonthly / totalMonthlyRevenue) * 100).toFixed(1) : '0';

  const loadLive = async () => {
    setLiveLoading(true);
    setLiveError(null);
    try {
      const [stateRes, balRes] = await Promise.all([
        fetch('/api/backoffice/state', { cache: 'no-store' }),
        fetch('/api/credits/balance', { cache: 'no-store' }),
      ]);
      if (!stateRes.ok) throw new Error('No se pudo leer /api/backoffice/state (' + stateRes.status + ')');
      const state: any = await stateRes.json();
      const balJson: any = balRes.ok ? await balRes.json() : null;

      const chats: any[] = Array.isArray(state.chats) ? state.chats : [];
      let demoChats = 0;
      chats.forEach((c: any) => { if (String(c?.id || '').startsWith('demo')) demoChats++; });
      const mh = state.messagesHistory && typeof state.messagesHistory === 'object' ? state.messagesHistory : {};
      const historyKeys = Object.keys(mh).length;
      let totalMessages = 0;
      Object.values(mh).forEach((v: any) => { if (Array.isArray(v)) totalMessages += v.length; });

      const logs: any[] = Array.isArray(state.aiDebugLogs) ? state.aiDebugLogs : [];
      let promptTokens = 0, completionTokens = 0, totalTokens = 0, durSum = 0, durN = 0;
      logs.forEach((l: any) => {
        const t = l?.tokens || {};
        promptTokens += Number(t.prompt_tokens || 0);
        completionTokens += Number(t.completion_tokens || 0);
        totalTokens += Number(t.total_tokens || 0);
        if (l?.durationMs) { durSum += Number(l.durationMs); durN++; }
      });

      const rec: any[] = Array.isArray(state.rechargeTransactions) ? state.rechargeTransactions : [];
      let saasRev = 0, testRev = 0, completed = 0, processing = 0;
      rec.forEach((r: any) => {
        if (r?.status === 'Completado') completed++;
        if (r?.status === 'Procesando') processing++;
        if (r?.status !== 'Completado') return;
        const name = String(r?.packageName || '');
        const amt = Number(r?.amount || 0);
        if (/prueba/i.test(name)) testRev += amt; else saasRev += amt;
      });

      const channels: any[] = Array.isArray(state.channels) ? state.channels : [];
      setLive({
        balance: balJson?.balance || state.aiBalance || null,
        usageCounts: state.aiUsageCounts || {},
        totalChats: chats.length,
        demoChats,
        realChats: chats.length - demoChats,
        historyKeys,
        totalMessages,
        logsCount: logs.length,
        totalTokens, promptTokens, completionTokens,
        avgTokensPerCall: logs.length ? totalTokens / logs.length : 0,
        avgPromptPerCall: logs.length ? promptTokens / logs.length : 0,
        avgCompletionPerCall: logs.length ? completionTokens / logs.length : 0,
        avgDurationMs: durN ? durSum / durN : 0,
        rechargeTotal: rec.length,
        rechargeCompleted: completed,
        rechargeProcessing: processing,
        rechargeSaasRevenueUSD: saasRev,
        rechargeTestRevenueUSD: testRev,
        channelsConnected: channels.filter((c: any) => c?.connected).length,
        channelsTotal: channels.length,
        fetchedAt: new Date().toLocaleString(),
      });
    } catch (e: any) {
      setLiveError(e?.message || 'Error cargando métricas en vivo');
    } finally {
      setLiveLoading(false);
    }
  };

  useEffect(() => { loadLive(); }, []);

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

  const cpm = costPerBotMessage(aiModel);
  const liveCostPerCall = live ? costPerCallAvg(aiModel, live.avgPromptPerCall, live.avgCompletionPerCall) : 0;
  const liveTotalCost = live ? costPerCallAvg(aiModel, live.promptTokens, live.completionTokens) : 0;

  const planRows = useMemo(() => REAL_PLANS.map((plan) => {
    const totalIncludedMsgs = plan.conversations * plan.aiMessagesPerConv;
    const usedMsgs = totalIncludedMsgs * usageScenario;
    const costIA = usedMsgs * cpm;
    const costWA = plan.conversations * usageScenario * WHATSAPP_MSGS_PER_CONV * WHATSAPP_PER_MSG_USD;
    const fee = boldFeeUSD(plan.price);
    const margen = plan.price - fee - costIA - costWA - INFRA_PER_USER_USD;
    return { ...plan, totalIncludedMsgs, usedMsgs, costIA, costWA, fee, margen, margenPct: plan.price ? (margen / plan.price) * 100 : 0, pricePerIncludedMsg: totalIncludedMsgs ? plan.price / totalIncludedMsgs : 0 };
  }), [aiModel, usageScenario, cpm]);

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
              Métricas en vivo del servidor + costos unitarios reales (Tokens IA, WhatsApp API, Hosting, Pasarela) para calcular la ganancia neta por usuario y por plan. Los tiers demo anteriores (820/360/70) fueron corregidos: hoy el servidor reporta el workspace principal; el costo exacto por cliente requiere ledger por tenant (ver checklist al final).
            </p>
          </div>
        </div>

        <div className="flex gap-2 shrink-0">
          <button
            onClick={loadLive}
            className="px-4 py-3 bg-gray-800 hover:bg-gray-700 text-cyan-300 border border-cyan-500/30 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshCw size={16} className={liveLoading ? 'animate-spin' : ''} /> {liveLoading ? 'Cargando…' : 'Actualizar métricas'}
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-5 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs rounded-xl transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus size={18} /> Registrar Costo / Módulo
          </button>
        </div>
      </div>

      {/* Alertas de veracidad */}
      {liveError && (
        <div className="panel p-4 rounded-2xl border border-red-500/40 bg-red-950/30 text-xs text-red-200 flex items-start gap-2">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>No se pudieron cargar las métricas en vivo: {liveError}. Revisa la conexión con /api/backoffice/state y pulsa “Actualizar métricas”. Los cálculos por plan siguen disponibles con los supuestos medidos.</span>
        </div>
      )}
      {live && (
        <div className="panel p-4 rounded-2xl border border-amber-500/40 bg-amber-950/20 text-xs text-amber-100 space-y-1">
          <p className="font-bold flex items-center gap-2"><AlertCircle size={14} /> Lectura honesta de los datos ({live.fetchedAt})</p>
          <p>• Servidor: {live.totalChats.toLocaleString()} chats en el estado, de los cuales <strong>{live.demoChats.toLocaleString()} son demo</strong> y {live.realChats} no-demo; solo {live.historyKeys} historiales tienen mensajes reales ({live.totalMessages} mensajes). No hay todavía un ledger por cliente/tenant: “ganancia por usuario” = modelo por plan, no contabilidad cerrada.</p>
          <p>• Recargas completadas: {live.rechargeCompleted} de {live.rechargeTotal} ({live.rechargeProcessing} en “Procesando” no cuentan como ingreso). Ingreso SaaS por paquetes (sin pruebas): <strong>${live.rechargeSaasRevenueUSD.toFixed(2)} USD</strong>; pruebas $100/$1.000 COP: ${live.rechargeTestRevenueUSD.toFixed(2)} USD.</p>
          <p>• Con GPT-4o en las 2 llamadas por mensaje (${costPerBotMessage('gpt4o').toFixed(5)}/mensaje medido), los planes incluyen más mensajes IA de los que el precio puede pagar en uso medio/alto. Cambiar clasificación a reglas + modelo barato es la palanca #1 (ver tabla por plan).</p>
        </div>
      )}

      {/* KPI Cards REALES en vivo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="panel p-5 rounded-2xl border border-gray-800 bg-gray-900/60 space-y-2">
          <span className="text-[11px] text-gray-400 uppercase font-bold flex items-center gap-1.5">
            <Zap size={14} className="text-cyan-400" /> Saldo IA del workspace
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">{live ? (live.balance?.conversations ?? 0).toLocaleString() : '—'}</span>
            <span className="text-xs text-gray-400">conv. disponibles</span>
          </div>
          <p className="text-[11px] text-gray-400">{live ? `${live.balance?.packagesBought ?? 0} paquetes comprados · ${live.balance?.audioMinutes ?? 0} min audio · ${live.balance?.aiMessagesPerConv ?? 0} msg IA/conv` : 'Cargando saldo…'}</p>
        </div>

        <div className="panel p-5 rounded-2xl border border-gray-800 bg-gray-900/60 space-y-2">
          <span className="text-[11px] text-gray-400 uppercase font-bold flex items-center gap-1.5">
            <Cpu size={14} className="text-amber-400" /> Uso IA registrado (logs)
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-400">{live ? live.logsCount : '—'}</span>
            <span className="text-xs text-gray-400 font-mono">llamadas</span>
          </div>
          <p className="text-[11px] text-gray-400">{live ? `${live.totalTokens.toLocaleString()} tokens (${live.promptTokens.toLocaleString()} prompt / ${live.completionTokens.toLocaleString()} salida) · prom. ${Math.round(live.avgTokensPerCall)} tok/llamada · ${Math.round(live.avgDurationMs)} ms` : 'Cargando logs…'}</p>
        </div>

        <div className="panel p-5 rounded-2xl border border-gray-800 bg-gray-900/60 space-y-2">
          <span className="text-[11px] text-gray-400 uppercase font-bold flex items-center gap-1.5">
            <MessageSquare size={14} className="text-blue-400" /> Conversaciones reales vs demo
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">{live ? live.historyKeys : '—'}</span>
            <span className="text-xs text-gray-400">historiales con mensajes</span>
          </div>
          <p className="text-[11px] text-gray-400">{live ? `${live.totalMessages} mensajes reales · ${live.demoChats.toLocaleString()} chats demo de ${live.totalChats.toLocaleString()} · Canales WhatsApp: ${live.channelsConnected}/${live.channelsTotal} conectados · Llamadas por proveedor: ${Object.entries(live.usageCounts).map(([k, v]) => k + ' ' + v).join(' · ') || '—'}` : 'Cargando…'}</p>
        </div>

        <div className="panel p-5 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 space-y-2">
          <span className="text-[11px] text-emerald-400 uppercase font-bold flex items-center gap-1.5">
            <DollarSign size={14} className="text-emerald-400" /> Costo IA de lo registrado ({AI_PRICING[aiModel].label})
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-300">${live ? liveTotalCost.toFixed(4) : '—'}</span>
            <span className="text-xs text-emerald-400 font-mono">USD total logs</span>
          </div>
          <p className="text-[11px] text-emerald-300/80">{live ? `≈ $${liveCostPerCall.toFixed(5)} por llamada prom. · $${cpm.toFixed(5)} por mensaje de usuario (clasif. + respuesta medidos) · Ingreso SaaS completado: $${live.rechargeSaasRevenueUSD.toFixed(2)}` : 'Cargando…'}</p>
        </div>
      </div>

      {/* Selectores de escenario */}
      <div className="panel p-4 rounded-2xl border border-gray-800 bg-black/40 flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-400 font-bold uppercase">Modelo IA para el cálculo:</span>
          {(Object.keys(AI_PRICING) as AiModelKey[]).map((k) => (
            <button key={k} onClick={() => setAiModel(k)} className={`px-3 py-1.5 rounded-lg font-bold border cursor-pointer ${aiModel === k ? 'bg-cyan-500 text-black border-cyan-400' : 'bg-gray-900 text-gray-300 border-gray-700'}`}>{AI_PRICING[k].label}</button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-400 font-bold uppercase">Uso de lo incluido:</span>
          {([0.1, 0.4, 1] as const).map((v) => (
            <button key={v} onClick={() => setUsageScenario(v)} className={`px-3 py-1.5 rounded-lg font-bold border cursor-pointer ${usageScenario === v ? 'bg-emerald-500 text-black border-emerald-400' : 'bg-gray-900 text-gray-300 border-gray-700'}`}>{v === 0.1 ? 'Bajo 10%' : v === 0.4 ? 'Medio 40%' : 'Máximo 100%'}</button>
          ))}
        </div>
        <p className="text-[11px] text-gray-500 md:ml-auto">Costo por mensaje con el modelo elegido: <strong className="text-white font-mono">${cpm.toFixed(5)} USD</strong> (clasificación + respuesta, tokens medidos de logs reales). WhatsApp estimado: ${WHATSAPP_PER_MSG_USD}/mensaje × {WHATSAPP_MSGS_PER_CONV} por conv. Infra prorrateada: ${INFRA_PER_USER_USD}/usuario.</p>
      </div>

      {/* Rentabilidad REAL por plan */}
      <div className="panel p-6 rounded-2xl border border-emerald-500/30 space-y-4 bg-gradient-to-b from-gray-900 via-gray-900 to-emerald-950/20">
        <div className="border-b border-gray-800 pb-3">
          <h3 className="text-sm font-black text-emerald-400 uppercase tracking-wider flex items-center gap-2">
            <PieChart size={16} /> Rentabilidad por Plan Real — ¿los precios son viables?
          </h3>
          <p className="text-xs text-gray-400">Precios e incluidos oficiales de Recargas (Starter $19 · Standard $33 · Pro $69 · Enterprise $319). Margen libre = precio − comisión Bold (3.59% + $900 COP) − IA del escenario − WhatsApp estimado − infra. Si el margen es negativo en uso medio/máximo, el plan pierde plata cuando el cliente usa lo que compró.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {planRows.map((plan) => (
            <div key={plan.id} className={`p-5 rounded-2xl bg-black/60 border space-y-4 relative overflow-hidden ${plan.margen < 0 ? 'border-red-500/50' : 'border-gray-800'}`}>
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-black text-white text-base">{plan.name} {plan.popular ? '· Más elegido' : ''}</h4>
                  <span className="text-[11px] text-cyan-400 font-mono font-bold">{plan.conversations.toLocaleString()} conv · {plan.aiMessagesPerConv} msg IA/conv · {plan.channelsIncluded} canal(es)</span>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-black border ${plan.margen < 0 ? 'bg-red-500/20 text-red-300 border-red-500/40' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'}`}>
                  {plan.margenPct.toFixed(1)}% margen
                </span>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-gray-800 text-xs">
                <div className="flex justify-between"><span className="text-gray-400">Precio:</span><strong className="text-white font-mono">${plan.price} USD</strong></div>
                <div className="flex justify-between"><span className="text-gray-400">Mensajes IA incluidos:</span><strong className="text-white font-mono">{plan.totalIncludedMsgs.toLocaleString()}</strong></div>
                <div className="flex justify-between"><span className="text-gray-400">Precio por mensaje incluido:</span><strong className="text-amber-300 font-mono">${plan.pricePerIncludedMsg.toFixed(5)}</strong></div>
                <div className="flex justify-between"><span className="text-gray-400">Costo IA ({usageScenario * 100}% usado):</span><strong className="text-amber-400 font-mono">-${plan.costIA.toFixed(2)}</strong></div>
                <div className="flex justify-between"><span className="text-gray-400">WhatsApp est. + Bold + infra:</span><strong className="text-gray-300 font-mono">-${(plan.costWA + plan.fee + INFRA_PER_USER_USD).toFixed(2)}</strong></div>
                <div className="flex justify-between"><span className="text-gray-400">Mensajes IA usados en escenario:</span><strong className="text-white font-mono">{Math.round(plan.usedMsgs).toLocaleString()}</strong></div>
              </div>

              <div className={`p-3 rounded-xl border flex justify-between items-center text-xs ${plan.margen < 0 ? 'bg-red-950/40 border-red-500/40' : 'bg-gray-900 border-gray-800'}`}>
                <span className="text-gray-400 font-bold uppercase text-[10px]">Margen libre / usuario:</span>
                <span className={`text-lg font-black font-mono ${plan.margen < 0 ? 'text-red-300' : 'text-emerald-300'}`}>${plan.margen.toFixed(2)}</span>
              </div>
              {plan.margen < 0 && <p className="text-[11px] text-red-300 flex items-start gap-1"><AlertCircle size={12} className="mt-0.5 shrink-0" /> Pierde plata en este escenario: hay que bajar costo IA (modelo barato/reglas), recortar mensajes incluidos o cobrar excedente.</p>}
            </div>
          ))}
        </div>
        <p className="text-[11px] text-gray-500">Lectura rápida con GPT-4o (${costPerBotMessage('gpt4o').toFixed(5)}/msg): solo Starter en uso bajo queda positivo; Pro/Enterprise pierden incluso al 10%. Con Gemini Flash (${costPerBotMessage('geminiFlash').toFixed(5)}/msg) o GPT-4o mini (${costPerBotMessage('gpt4oMini').toFixed(5)}/msg) mejora, pero Pro/Enterprise siguen negativos al 100% porque incluyen 150 mil y 1,3 millones de mensajes: el precio por mensaje incluido ($0.00046 y $0.00025) queda por debajo del costo. Recomendación: tope total de mensajes IA por plan (no solo por conversación), excedente pago y clasificación con reglas primero.</p>
      </div>

      {/* Operational Cost Table per Module */}
      <div className="panel p-6 rounded-2xl border border-gray-800 space-y-4 bg-black/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-800 pb-3">
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Layers size={16} className="text-cyan-400" /> Registro de Costos Directos por Módulo (corregido)
            </h3>
            <p className="text-xs text-gray-400">Precios unitarios actualizados: IA medida de logs reales; WhatsApp Meta CO por mensaje (no por conversación); Bold 3.59% + $900 COP. Edita los estimados de uso según tu operación.</p>
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
                  <td className="p-3 font-sans font-bold text-white">
                    <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0"></span>{mc.moduleName}</span>
                  </td>
                  <td className="p-3 font-sans">
                    <span className="px-2 py-0.5 bg-gray-800 text-gray-300 rounded text-[10px] font-bold uppercase">
                      {mc.category}
                    </span>
                  </td>
                  <td className="p-3 text-cyan-300">${mc.unitCostUSD < 0.01 ? mc.unitCostUSD.toFixed(5) : mc.unitCostUSD.toFixed(3)} USD</td>
                  <td className="p-3 font-sans text-gray-400">{mc.billingUnit}</td>
                  <td className="p-3 text-amber-400 font-bold">{mc.estimatedUsagePerUser.toLocaleString()} / mes</td>
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

      {/* Tiers editables de referencia (ya no son la rentabilidad oficial) */}
      <div className="panel p-6 rounded-2xl border border-gray-800 space-y-4 bg-black/40">
        <div className="border-b border-gray-800 pb-3">
          <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
            <Users size={16} className="text-cyan-400" /> Cuentas por Nivel (editable — hoy en 0 hasta que exista registro real de clientes)
          </h3>
          <p className="text-xs text-gray-400">El servidor aún no devuelve una lista real de clientes SaaS (app_state_summary: users 0 en el workspace principal; UsuariosView usa datos iniciales del frontend). Cuando se cree el registro por tenant, esta tabla debe alimentarse de ahí. Totales de referencia: {totalUsers.toLocaleString()} usuarios · costo directo prom. ${totalCostPerUserOverall.toFixed(2)}/usuario · MRR ${totalMonthlyRevenue.toLocaleString('en-US')} · utilidad ${netProfitMonthly.toLocaleString('en-US')} ({profitMargin}%).</p>
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
                  <div className="flex justify-between"><span className="text-gray-400">Suscripción Mensual:</span><strong className="text-white font-mono">${tier.monthlyFeeUSD} USD / user</strong></div>
                  <div className="flex justify-between"><span className="text-gray-400">Costo Operativo Promedio:</span><strong className="text-amber-400 font-mono">${tier.estimatedCostPerUserUSD.toFixed(2)} USD / user</strong></div>
                  <div className="flex justify-between"><span className="text-gray-400">Utilidad Limpia por Usuario:</span><strong className="text-emerald-400 font-mono">${(tier.monthlyFeeUSD - tier.estimatedCostPerUserUSD).toFixed(2)} USD</strong></div>
                  <div className="flex justify-between"><span className="text-gray-400">Incluye:</span><strong className="text-gray-300 font-sans text-right">{tier.modulesIncluded.join(' · ')}</strong></div>
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

      {/* Checklist para costo exacto por usuario */}
      <div className="panel p-6 rounded-2xl border border-cyan-500/30 bg-cyan-950/10 space-y-3">
        <h3 className="text-sm font-black text-cyan-300 uppercase tracking-wider flex items-center gap-2"><ShieldCheck size={16} /> Para dejar de estar ciego: datos que el CRM debe guardar por cliente</h3>
        <ul className="text-xs text-gray-300 space-y-1.5 list-disc pl-5">
          <li><strong>Identidad y plan:</strong> tenant_id, usuario, plan contratado, fecha de cobro, monto neto recibido y comisión de pasarela por transacción (hoy las recargas mezclan pruebas de $100/$1.000 COP y quedan en “Procesando”).</li>
          <li><strong>Uso IA por tenant:</strong> en cada llamada guardar tenant, proveedor/modelo, tokens de entrada/salida, costo calculado, latencia y conversación/mensaje asociado (hoy aiDebugLogs es global, máximo 100, sin tenant ni costo).</li>
          <li><strong>WhatsApp por tenant:</strong> mensajes por categoría Meta (marketing/utility/service/auth), país, número/canal y costo; hoy solo hay saldo global de conversaciones.</li>
          <li><strong>Voz:</strong> minutos de audio/transcripción por cliente y su costo.</li>
          <li><strong>Soporte y fijos:</strong> tiempo de soporte/onboarding por cliente y prorrateo real de VPS, Supabase, dominios, Zernio/Evolution y herramientas.</li>
          <li><strong>Regla de oro:</strong> ningún plan debería incluir mensajes IA ilimitados en la práctica: tope total por plan + precio de excedente por mensaje/conversación/minuto, y alertas al 70/90% del cupo.</li>
        </ul>
        <p className="text-[11px] text-gray-500 flex items-center gap-1"><Activity size={12} /> Este panel ya lee en vivo saldo, logs IA, chats y recargas del servidor. El siguiente paso técnico es crear la tabla/eventos por tenant y alimentar aquí el costo exacto por usuario.</p>
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

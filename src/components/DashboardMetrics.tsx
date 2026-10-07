import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  TrendingUp, ShoppingCart, Activity, AlertCircle, Truck, CheckCircle, RefreshCcw,
  CreditCard, Zap, ArrowRight
} from 'lucide-react';

const dailySalesData = [
  { name: 'Lun', sales: 25.4, orders: 181 },
  { name: 'Mar', sales: 30.2, orders: 215 },
  { name: 'Mié', sales: 38.5, orders: 275 },
  { name: 'Jue', sales: 34.0, orders: 242 },
  { name: 'Vie', sales: 45.8, orders: 327 },
  { name: 'Sáb', sales: 55.2, orders: 394 },
  { name: 'Dom', sales: 60.4, orders: 432 },
];

const orderStatusData = [
  { name: 'Entregado', value: 1700, color: '#22c55e' },
  { name: 'En Tránsito', value: 130, color: '#3b82f6' },
  { name: 'Guía Generada', value: 60, color: '#a855f7' },
  { name: 'Novedades', value: 50, color: '#f59e0b' },
  { name: 'Devoluciones', value: 120, color: '#ef4444' },
  { name: 'Cancelados', value: 90, color: '#6b7280' },
];

const adAttributionData = [
  { name: 'Facebook Ads', value: 45 },
  { name: 'Instagram', value: 30 },
  { name: 'TikTok Ads', value: 15 },
  { name: 'Orgánico', value: 10 },
];

export default function DashboardMetrics({
  currentUser,
  onNavigateToRecargas,
  hiddenItems = []
}: {
  currentUser?: { name: string, role: string, email: string } | null,
  onNavigateToRecargas?: () => void,
  hiddenItems?: string[]
}) {
  const isZeroStats = currentUser?.role === 'droshipper' && currentUser?.name?.toLowerCase() !== 'oscar';

  // Read AI Credit balance and alert threshold state
  const [aiBalance, setAiBalance] = useState<{ conversations: number; audioMinutes: number }>(() => {
    const saved = localStorage.getItem('app_ai_balance');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return { conversations: 2500, audioMinutes: 15 };
  });

  const [alertThreshold, setAlertThreshold] = useState<number>(() => {
    const saved = localStorage.getItem('app_ai_alert_threshold');
    return saved ? parseInt(saved, 10) : 100;
  });

  const [alertsEnabled, setAlertsEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('app_ai_alert_enabled');
    return saved !== null ? saved === 'true' : true;
  });

  useEffect(() => {
    const handleCreditsUpdate = () => {
      const savedBal = localStorage.getItem('app_ai_balance');
      if (savedBal) {
        try { setAiBalance(JSON.parse(savedBal)); } catch (e) { /* ignore */ }
      }
      const savedThresh = localStorage.getItem('app_ai_alert_threshold');
      if (savedThresh) setAlertThreshold(parseInt(savedThresh, 10));

      const savedEn = localStorage.getItem('app_ai_alert_enabled');
      if (savedEn !== null) setAlertsEnabled(savedEn === 'true');
    };

    window.addEventListener('credits_updated', handleCreditsUpdate);
    return () => window.removeEventListener('credits_updated', handleCreditsUpdate);
  }, []);

  const isLowBalance = alertsEnabled && aiBalance.conversations <= alertThreshold;

  const metrics = isZeroStats ? {
    sales: "$0",
    orders: "0",
    pending: "0",
    abandoned: "0"
  } : {
    sales: "$60,480,000",
    orders: "432",
    pending: "45",
    abandoned: "12"
  };

  const currentDailySalesData = isZeroStats ? dailySalesData.map(d => ({ ...d, sales: 0, orders: 0 })) : dailySalesData;
  const currentOrderStatusData = isZeroStats ? orderStatusData.map(d => ({ ...d, value: 0 })) : orderStatusData;
  const currentAdAttributionData = isZeroStats ? adAttributionData.map(d => ({ ...d, value: 0 })) : adAttributionData;

  return (
    <div className="animate-fade-in space-y-6">

      {/* LOW BALANCE ALERT BANNER ON DASHBOARD */}
      {isLowBalance && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-950/80 via-amber-900/60 to-red-950/80 border-2 border-amber-500/60 text-amber-200 shadow-2xl shadow-amber-950/50 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-pulse">
          <div className="flex items-start md:items-center gap-3.5">
            <div className="p-3 rounded-xl bg-amber-500/20 text-amber-400 shrink-0 border border-amber-500/40 shadow-inner">
              <AlertCircle size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-md bg-amber-500 text-black shadow-sm">
                  ⚠️ Alerta Crítica de IA
                </span>
                <span className="text-xs text-amber-300 font-medium">
                  Límite de alerta: {alertThreshold} conv.
                </span>
              </div>
              <h4 className="text-base font-extrabold text-white mt-1">
                Saldo de Créditos Bajo: Te quedan <span className="text-amber-400 text-lg font-black underline decoration-amber-500">{aiBalance.conversations.toLocaleString()} conversaciones</span>
              </h4>
              <p className="text-xs text-amber-200/90 mt-0.5">
                Tus respuestas automáticas de WhatsApp e IA se detendrán pronto. Recarga tu paquete para garantizar continuidad sin interrupciones.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              if (onNavigateToRecargas) onNavigateToRecargas();
            }}
            className="self-start md:self-center px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2 shrink-0 cursor-pointer group"
          >
            <Zap size={16} className="fill-black" />
            <span>Recargar Créditos Ahora</span>
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      )}

      {/* AI CREDIT BALANCE WIDGET CARD IN DASHBOARD */}
      <div className={`panel p-5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
        isLowBalance
          ? 'bg-amber-950/30 border-amber-500/40 shadow-lg shadow-amber-900/10'
          : 'bg-gradient-to-r from-gray-900 via-gray-900/90 to-emerald-950/20 border-gray-800'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-xl border ${
            isLowBalance
              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
          }`}>
            <Zap size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-white">Estado de Créditos de IA</h4>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                isLowBalance
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                  : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
              }`}>
                {isLowBalance ? '¡SALDO BAJO!' : 'SALDO SALUDABLE'}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Sin claves API externas necesarias (OpenAI, Gemini, Grok, Claude incluidos en automático).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6 self-start sm:self-center">
          <div>
            <p className="text-[10px] uppercase font-bold text-gray-400">Conversaciones IA</p>
            <p className={`text-xl font-black font-display ${isLowBalance ? 'text-amber-400' : 'text-emerald-400'}`}>
              {aiBalance.conversations.toLocaleString()}
            </p>
          </div>
          <div className="h-8 w-px bg-gray-800"></div>
          <div>
            <p className="text-[10px] uppercase font-bold text-gray-400">Minutos Audio</p>
            <p className="text-xl font-black font-display text-white">
              {aiBalance.audioMinutes} min
            </p>
          </div>

          <button
            onClick={() => {
              if (onNavigateToRecargas) onNavigateToRecargas();
            }}
            className="px-3.5 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ml-2"
          >
            <CreditCard size={14} className="text-emerald-400" />
            Recargar
          </button>
        </div>
      </div>

      <h3 className="text-xl font-bold text-white flex items-center gap-2 pt-2">
        <Activity className="text-gold" /> Resumen de Rendimiento
      </h3>

      {/* KPI Cards */}
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${!hiddenItems.includes('pedidos') ? 4 : 1} gap-4`}>
        <MetricCard
          title="Ventas Totales (Hoy)"
          value={metrics.sales}
          trend={isZeroStats ? "0%" : "+15%"}
          isPositive={true}
          icon={<TrendingUp className="text-green-500" size={20} />}
        />
        {!hiddenItems.includes('pedidos') && (
          <>
            <MetricCard
              title="Pedidos Confirmados"
              value={metrics.orders}
              trend={isZeroStats ? "0%" : "+5%"}
              isPositive={true}
              icon={<CheckCircle className="text-blue-500" size={20} />}
            />
            <MetricCard
              title="Pedidos Pendientes"
              value={metrics.pending}
              trend={isZeroStats ? "0%" : "-2%"}
              isPositive={false}
              icon={<ShoppingCart className="text-yellow-500" size={20} />}
            />
            <MetricCard
              title="Carritos Recuperados"
              value={metrics.abandoned}
              trend={isZeroStats ? "0%" : "+12%"}
              isPositive={true}
              icon={<RefreshCcw className="text-emerald-500" size={20} />}
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Sales Chart */}
        {!hiddenItems.includes('pedidos') && (
        <>
        <div className="panel p-6 rounded-2xl bg-[#0d0d0d] border border-gray-800">
          <h4 className="text-sm font-semibold text-gray-300 mb-6">Ventas Diarias vs Pedidos</h4>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={currentDailySalesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                <XAxis dataKey="name" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis yAxisId="left" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis yAxisId="right" orientation="right" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="sales" name="Ventas (Millones $)" stroke="#d4af37" strokeWidth={3} dot={{ r: 4, fill: '#d4af37' }} activeDot={{ r: 6 }} />
                <Line yAxisId="right" type="monotone" dataKey="orders" name="Pedidos" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Order Status Pie Chart */}
        <div className="panel p-6 rounded-2xl bg-[#0d0d0d] border border-gray-800">
          <h4 className="text-sm font-semibold text-gray-300 mb-6">Estado de Pedidos (Mensual)</h4>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={currentOrderStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                  fontSize={10}
                >
                  {currentOrderStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip
                  contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ad Attribution */}
        {!hiddenItems.includes('ads') && (
        <div className="panel p-6 rounded-2xl bg-[#0d0d0d] border border-gray-800">
          <h4 className="text-sm font-semibold text-gray-300 mb-6">Atribución de Ventas por Anuncio</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={currentAdAttributionData} layout="vertical" margin={{ top: 0, right: 0, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={true} vertical={false} />
                <XAxis type="number" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" stroke="#888" fontSize={12} tickLine={false} axisLine={false} width={80} />
                <RechartsTooltip
                  cursor={{ fill: '#1a1a1a' }}
                  contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Bar dataKey="value" name="% de Ventas" fill="#a855f7" radius={[0, 4, 4, 0]}>
                  {currentAdAttributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.name === 'Facebook Ads' ? '#3b82f6' : entry.name === 'Instagram' ? '#ec4899' : entry.name === 'TikTok Ads' ? '#000000' : '#22c55e'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        )}

        {/* Detailed Logistics Status Grid */}
        {!hiddenItems.includes('pedidos') && (
        <div className="panel p-6 rounded-2xl bg-[#0d0d0d] border border-gray-800">
          <h4 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2"><Truck size={16}/> Resumen Logístico</h4>
          <div className="space-y-4">
             <div className="grid grid-cols-2 gap-4">
               {currentOrderStatusData.map((status, i) => (
                 <div key={i} className="bg-[#161616] border border-gray-800 p-3 rounded-xl flex items-center justify-between">
                   <div className="flex items-center gap-2">
                     <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: status.color }}></span>
                     <span className="text-xs text-gray-400">{status.name}</span>
                   </div>
                   <span className="text-sm font-bold text-white">{status.value}</span>
                 </div>
               ))}
             </div>
          </div>
        </div>
        )}
      </div>

    </div>
  );
}

function MetricCard({ title, value, trend, isPositive, icon }: { title: string, value: string, trend: string, isPositive: boolean, icon: React.ReactNode }) {
  return (
    <div className="panel p-5 rounded-2xl bg-[#0d0d0d] border border-gray-800 hover:border-gray-700 transition flex flex-col justify-between h-32">
      <div className="flex justify-between items-start">
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{title}</h4>
        <div className="p-2 bg-[#1a1a1a] rounded-lg border border-gray-800">{icon}</div>
      </div>
      <div className="flex items-end justify-between mt-4">
        <span className="text-3xl font-bold font-display text-white">{value}</span>
        <span className={`text-xs font-bold px-2 py-1 rounded border ${isPositive ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
          {trend}
        </span>
      </div>
    </div>
  );
}

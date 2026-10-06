import React, { useState } from 'react';
import { Calculator, Save, Settings as SettingsIcon, RefreshCcw, DollarSign, Percent, Info, AlertTriangle, ArrowRight } from 'lucide-react';

export default function CalculadoraCOD() {
  const [productName, setProductName] = useState('Limpiador Nasal x 2');
  const [currency, setCurrency] = useState('COP');
  
  // Inputs
  const [units, setUnits] = useState(1);
  const [costPerUnit, setCostPerUnit] = useState(0);
  const [baseFreight, setBaseFreight] = useState(15000);
  const [deliveryRate, setDeliveryRate] = useState(80); // %
  const [adminCost, setAdminCost] = useState(0);
  const [fulfillment, setFulfillment] = useState(0);
  const [cpa, setCpa] = useState(14000);
  const [finalDeliveryRate, setFinalDeliveryRate] = useState(70); // %
  const [desiredMargin, setDesiredMargin] = useState(20); // %

  // Calculation Logic
  const fleteDevoluciones = deliveryRate > 0 ? (baseFreight / (deliveryRate / 100)) : 0;
  const cpaCosteado = finalDeliveryRate > 0 ? (cpa / (finalDeliveryRate / 100)) : 0;
  
  const proveedorCosto = costPerUnit * units;
  
  const totalCost = proveedorCosto + fleteDevoluciones + adminCost + fulfillment + cpaCosteado;
  
  // PV = CT / (1 - margin)
  const marginDecimal = desiredMargin / 100;
  const rawPrice = marginDecimal < 1 ? (totalCost / (1 - marginDecimal)) : totalCost;
  
  // Round to nearest 900 for typical pricing
  const precioVenta = Math.ceil(rawPrice / 100) * 100; 
  
  const utilityValue = precioVenta - totalCost;
  const actualMargin = precioVenta > 0 ? (utilityValue / precioVenta) * 100 : 0;
  
  const marginCT = totalCost > 0 ? (utilityValue / totalCost) * 100 : 0;
  const precioComparacion = precioVenta * 2;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="space-y-6 animate-fade-in text-gray-200">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Calculator className="text-orange-500" />
            Calculadora de Precios COD
          </h2>
          <p className="text-sm text-gray-400 mt-1 max-w-2xl">
            El modelo real: el flete se divide por la entrega de despacho y el CPA por la entrega final. Te arma el precio de venta, la utilidad, la distribución del costo y el precio ancla.
          </p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 border border-gray-700 hover:bg-gray-800 rounded-lg text-sm font-medium transition flex items-center gap-2">
            <RefreshCcw size={16} /> Limpiar
          </button>
          <button className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-sm font-bold transition flex items-center gap-2">
            <Save size={16} /> Guardar Historial
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* INPUTS PANEL */}
        <div className="panel p-6 rounded-2xl border border-orange-500/20 bg-[#0d0d0d] shadow-[0_0_20px_rgba(249,115,22,0.05)]">
          <h3 className="text-xs font-bold uppercase tracking-widest text-orange-500 mb-6 flex items-center gap-2">
            <SettingsIcon size={14} className="hidden" /> Producto y Costos
          </h3>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Nombre del producto</label>
                <input 
                  type="text" 
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full bg-black border border-gray-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Moneda</label>
                <select 
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full bg-black border border-gray-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-orange-500"
                >
                  <option value="COP">Peso Colombiano (COP)</option>
                  <option value="USD">Dólares (USD)</option>
                  <option value="MXN">Peso Mexicano (MXN)</option>
                </select>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between gap-4">
                <label className="text-sm font-medium text-gray-300 w-1/2">Unidades por pack</label>
                <input type="number" min="1" value={units} onChange={e => setUnits(Number(e.target.value))} className="w-1/2 bg-black border border-gray-800 rounded-lg p-2 text-sm text-white text-right" />
              </div>
              <div className="flex items-center justify-between gap-4">
                <label className="text-sm font-medium text-gray-300 w-1/2">Costo por unidad</label>
                <input type="number" min="0" value={costPerUnit} onChange={e => setCostPerUnit(Number(e.target.value))} className="w-1/2 bg-black border border-gray-800 rounded-lg p-2 text-sm text-white text-right" />
              </div>
              <div className="flex items-center justify-between gap-4">
                <label className="text-sm font-medium text-gray-300 w-1/2">Flete base</label>
                <input type="number" min="0" value={baseFreight} onChange={e => setBaseFreight(Number(e.target.value))} className="w-1/2 bg-black border border-gray-800 rounded-lg p-2 text-sm text-white text-right" />
              </div>
              <div className="flex items-center justify-between gap-4">
                <label className="text-sm font-medium text-gray-300 w-1/2">% Entrega despacho (Dropi)</label>
                <div className="relative w-1/2">
                  <input type="number" min="1" max="100" value={deliveryRate} onChange={e => setDeliveryRate(Number(e.target.value))} className="w-full bg-black border border-gray-800 rounded-lg p-2 text-sm text-white text-right pr-8" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                </div>
              </div>
              <div className="flex items-center justify-between gap-4">
                <label className="text-sm font-medium text-gray-300 w-1/2">Costos administrativos</label>
                <input type="number" min="0" value={adminCost} onChange={e => setAdminCost(Number(e.target.value))} className="w-1/2 bg-black border border-gray-800 rounded-lg p-2 text-sm text-white text-right" />
              </div>
              <div className="flex items-center justify-between gap-4">
                <label className="text-sm font-medium text-gray-300 w-1/2">Fulfillment</label>
                <input type="number" min="0" value={fulfillment} onChange={e => setFulfillment(Number(e.target.value))} className="w-1/2 bg-black border border-gray-800 rounded-lg p-2 text-sm text-white text-right" />
              </div>
              <div className="flex items-center justify-between gap-4">
                <label className="text-sm font-medium text-gray-300 w-1/2">CPA Ads Manager</label>
                <input type="number" min="0" value={cpa} onChange={e => setCpa(Number(e.target.value))} className="w-1/2 bg-black border border-gray-800 rounded-lg p-2 text-sm text-white text-right" />
              </div>
              <div className="flex items-center justify-between gap-4">
                <label className="text-sm font-medium text-gray-300 w-1/2">% Tasa entrega final (General)</label>
                <div className="relative w-1/2">
                  <input type="number" min="1" max="100" value={finalDeliveryRate} onChange={e => setFinalDeliveryRate(Number(e.target.value))} className="w-full bg-black border border-gray-800 rounded-lg p-2 text-sm text-white text-right pr-8" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                </div>
              </div>
              <div className="flex items-center justify-between gap-4 pt-4 border-t border-gray-800 mt-4">
                <label className="text-sm font-bold text-orange-400 w-1/2">Utilidad Deseada (%)</label>
                <div className="relative w-1/2">
                  <input type="number" min="1" max="100" value={desiredMargin} onChange={e => setDesiredMargin(Number(e.target.value))} className="w-full bg-black border border-orange-500/50 rounded-lg p-2 text-sm text-white text-right pr-8" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-orange-500 font-bold">%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* OUTPUTS PANEL */}
        <div className="panel p-6 rounded-2xl border border-gray-800 bg-[#0d0d0d] flex flex-col justify-between shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="relative z-10 space-y-6">
            
            <div className="space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-gray-800/50">
                <span className="text-sm text-gray-400">Proveedor x {units}</span>
                <span className="font-mono text-white">{formatCurrency(proveedorCosto)}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-gray-800/50">
                <span className="text-sm text-gray-400 flex items-center gap-2">Flete c/dev <span className="px-1.5 py-0.5 bg-gray-800 text-[9px] rounded text-gray-300">AUTO</span></span>
                <span className="font-mono text-white">{formatCurrency(fleteDevoluciones)}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-gray-800/50">
                <span className="text-sm text-gray-400 flex items-center gap-2">CPA costeado <span className="px-1.5 py-0.5 bg-gray-800 text-[9px] rounded text-gray-300">AUTO</span></span>
                <span className="font-mono text-white">{formatCurrency(cpaCosteado)}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-gray-800/50">
                <span className="text-sm text-gray-400">Admin</span>
                <span className="font-mono text-white">{formatCurrency(adminCost)}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-gray-800/50">
                <span className="text-sm text-gray-400">Fulfillment</span>
                <span className="font-mono text-white">{formatCurrency(fulfillment)}</span>
              </div>
            </div>

            <div className="bg-black/50 border border-gray-800 p-4 rounded-xl space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-gray-400">COSTOS TOTALES</span>
                <span className="text-sm font-bold font-mono text-red-400">{formatCurrency(totalCost)}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-800">
                <span className="text-xs font-bold text-orange-400">UTILIDAD ({actualMargin.toFixed(1)}%)</span>
                <span className="text-sm font-bold font-mono text-green-400">{formatCurrency(utilityValue)}</span>
              </div>
              
              {/* Margin visual bar */}
              <div className="mt-4 pt-2">
                <div className="flex justify-between text-[9px] font-mono text-gray-500 mb-1">
                  <span>0%</span>
                  <span>15%</span>
                  <span>30%</span>
                  <span>45%</span>
                </div>
                <div className="h-3 bg-gray-900 rounded-full overflow-hidden flex relative">
                  <div className={`h-full ${actualMargin < 15 ? 'bg-red-500' : actualMargin < 25 ? 'bg-orange-500' : 'bg-green-500'}`} style={{ width: `${Math.min(actualMargin, 100)}%` }}></div>
                  <div className="absolute top-0 bottom-0 left-[20%] w-0.5 bg-white/20 z-10"></div>
                  <div className="absolute top-0 bottom-0 left-[40%] w-0.5 bg-white/20 z-10"></div>
                </div>
                <p className="text-[10px] mt-2 flex items-center gap-1.5 text-gray-400">
                  {actualMargin >= 20 ? (
                    <><span className="text-green-500">👍 Óptimo</span> - Margen saludable para escalar.</>
                  ) : actualMargin >= 10 ? (
                    <><span className="text-orange-500">⚠️ Riesgo</span> - Ajustado, requiere mucha optimización de Ads.</>
                  ) : (
                    <><span className="text-red-500">❌ Inviable</span> - Reevalúa proveedor o precio.</>
                  )}
                </p>
              </div>
            </div>

          </div>
          
          <div className="mt-6">
            <div className="bg-orange-500/10 border border-orange-500/30 p-5 rounded-xl text-center shadow-[inset_0_0_20px_rgba(249,115,22,0.1)] relative overflow-hidden">
              <p className="text-[10px] font-bold uppercase tracking-widest text-orange-500 mb-1">Precio de Venta Sugerido</p>
              <p className="text-3xl font-black font-mono text-white">{formatCurrency(precioVenta)}</p>
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-3 px-2">
              <span>Precio comparación (x2)</span>
              <span className="line-through">{formatCurrency(precioComparacion)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI CARDS (Fórmulas Clave) */}
      <div className="space-y-4 pt-4 border-t border-gray-800">
        <h3 className="text-xs font-bold uppercase tracking-widest text-orange-500">Fórmulas Clave del Modelo</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-[#0f1115] border border-gray-800">
            <p className="text-xs font-bold text-white mb-1">Precio de Venta</p>
            <p className="text-[10px] text-gray-500 leading-relaxed">Precio final al cliente. Incluye todos los costos más tu utilidad.</p>
          </div>
          <div className="p-4 rounded-xl bg-[#0f1115] border border-gray-800">
            <p className="text-xs font-bold text-white mb-1">Costos Totales (CT)</p>
            <p className="text-[10px] text-gray-500 leading-relaxed">Suma de todos los costos (proveedor + flete + admin + fulfillment + CPA) antes de la utilidad.</p>
          </div>
          <div className="p-4 rounded-xl bg-[#0f1115] border border-gray-800">
            <p className="text-xs font-bold text-white mb-1">Flete con devoluciones</p>
            <p className="text-[10px] text-gray-500 leading-relaxed">Flete base ÷ % entrega despacho</p>
          </div>
          <div className="p-4 rounded-xl bg-[#0f1115] border border-gray-800">
            <p className="text-xs font-bold text-white mb-1">CPA costeado</p>
            <p className="text-[10px] text-gray-500 leading-relaxed">CPA Ads Manager ÷ % entrega final</p>
          </div>
        </div>
      </div>
    </div>
  );
}

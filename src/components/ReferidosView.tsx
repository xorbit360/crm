import React, { useState } from 'react';
import {
  Users,
  DollarSign,
  Clock,
  Copy,
  Check,
  UserPlus,
  Wallet,
  X,
  AlertCircle,
  CheckCircle2,
  Layers,
  Network
} from 'lucide-react';

interface ReferralItem {
  id: string;
  email: string;
  name?: string;
  level: 1 | 2 | 3 | 4 | 5;
  registeredAt: string;
  purchasesCount: number;
  totalSpent: number;
  commissionEarned: number;
  commissionRate: number;
  status: 'Activo' | 'Pendiente';
}

interface WithdrawalRequest {
  id: string;
  date: string;
  amount: number;
  method: string;
  accountDetails: string;
  status: 'Pendiente' | 'Procesado' | 'Rechazado';
}

export default function ReferidosView({ currentUser }: { currentUser?: any }) {
  // Generate or retrieve persistent referral code
  const [referralCode] = useState<string>(() => {
    const saved = localStorage.getItem('xorbit_referral_code');
    if (saved) return saved;
    const base = currentUser?.email ? currentUser.email.split('@')[0].toUpperCase().slice(0, 4) : '8650';
    const code = `${base}A73D`;
    try { localStorage.setItem('xorbit_referral_code', code); } catch (_) {}
    return code;
  });

  const referralLink = `https://xorbit360.com/register?ref=${referralCode}`;

  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [selectedLevelTab, setSelectedLevelTab] = useState<number | 'all'>('all');

  // Withdrawal form
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState<'nequi' | 'daviplata' | 'bancolombia' | 'usdt' | 'saldo_crm'>('nequi');
  const [accountDetails, setAccountDetails] = useState('');
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);

  // Balances and Data
  const [referrals] = useState<ReferralItem[]>(() => {
    const saved = localStorage.getItem('xorbit_referrals_list');
    if (saved) {
      try { return JSON.parse(saved); } catch (_) {}
    }
    return [];
  });

  const [balance, setBalance] = useState(() => {
    const saved = localStorage.getItem('xorbit_referral_balance');
    if (saved) {
      try { return JSON.parse(saved); } catch (_) {}
    }
    return {
      available: 0,
      pendingWithdraw: 0,
      totalEarned: 0
    };
  });

  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>(() => {
    const saved = localStorage.getItem('xorbit_referral_withdrawals');
    if (saved) {
      try { return JSON.parse(saved); } catch (_) {}
    }
    return [];
  });

  const showNotification = (text: string, error = false) => {
    setToast({ text, error });
    setTimeout(() => setToast(null), 3500);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopiedLink(true);
    showNotification('¡Enlace de referido copiado al portapapeles!');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopiedCode(true);
    showNotification('¡Código de referido copiado!');
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleRequestWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(withdrawAmount);
    if (!amountNum || amountNum <= 0) {
      showNotification('Ingresa un monto válido para retirar', true);
      return;
    }
    if (amountNum > balance.available) {
      showNotification('El monto supera tu balance disponible', true);
      return;
    }
    if (!accountDetails.trim() && withdrawMethod !== 'saldo_crm') {
      showNotification('Por favor ingresa los datos de tu cuenta / billetera', true);
      return;
    }

    const newRequest: WithdrawalRequest = {
      id: `RET-${Date.now().toString().slice(-6)}`,
      date: new Date().toISOString().split('T')[0],
      amount: amountNum,
      method: withdrawMethod.toUpperCase(),
      accountDetails: withdrawMethod === 'saldo_crm' ? 'Acreditación en Saldo CRM' : accountDetails,
      status: 'Pendiente'
    };

    const newWithdrawals = [newRequest, ...withdrawals];
    const newBalance = {
      ...balance,
      available: balance.available - amountNum,
      pendingWithdraw: balance.pendingWithdraw + amountNum
    };

    setWithdrawals(newWithdrawals);
    setBalance(newBalance);

    try {
      localStorage.setItem('xorbit_referral_withdrawals', JSON.stringify(newWithdrawals));
      localStorage.setItem('xorbit_referral_balance', JSON.stringify(newBalance));
    } catch (_) {}

    setShowWithdrawModal(false);
    setWithdrawAmount('');
    setAccountDetails('');
    showNotification('¡Solicitud de retiro enviada con éxito!');
  };

  const filteredReferrals = selectedLevelTab === 'all'
    ? referrals
    : referrals.filter(r => r.level === selectedLevelTab);

  const totalCommissions = referrals.reduce((sum, r) => sum + (r.commissionEarned || 0), 0);

  const countByLevel = {
    1: referrals.filter(r => r.level === 1).length,
    2: referrals.filter(r => r.level === 2).length,
    3: referrals.filter(r => r.level === 3).length,
    4: referrals.filter(r => r.level === 4).length,
    5: referrals.filter(r => r.level === 5).length,
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-12 animate-fade-in text-gray-100">

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border text-sm font-semibold animate-scale-up ${
          toast.error
            ? 'bg-red-950/90 text-red-300 border-red-800/80 shadow-red-950/50'
            : 'bg-emerald-950/90 text-emerald-300 border-emerald-700/80 shadow-emerald-950/50'
        }`}>
          {toast.error ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Header View */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-display">
            Referidos
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Gana comisiones en <span className="text-emerald-400 font-semibold">5 niveles</span> por cada compra de recargas de tus referidos.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setShowWithdrawModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-950/70 hover:bg-emerald-900/90 text-emerald-400 border border-emerald-700/60 font-medium text-sm transition shadow-sm cursor-pointer"
          >
            <Wallet size={16} className="text-emerald-400" />
            <span>Retiro de comisiones</span>
          </button>

          <button
            onClick={handleCopyLink}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#00E676] hover:bg-[#00c864] text-black font-bold text-sm transition shadow-lg shadow-emerald-500/20 cursor-pointer"
          >
            {copiedLink ? <Check size={16} /> : <Copy size={16} />}
            <span>Copiar enlace de referido</span>
          </button>
        </div>
      </div>

      {/* Top 4 Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Card 1: Total Referidos */}
        <div className="bg-[#121418] border border-gray-800/90 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden group hover:border-gray-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-300">Total Referidos</span>
            <div className="w-9 h-9 rounded-full bg-emerald-950/80 border border-emerald-800/50 flex items-center justify-center text-emerald-400">
              <Users size={18} />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              {referrals.length}
            </div>
            <p className="text-xs text-gray-500 mt-1">En tus 5 niveles de red</p>
          </div>
        </div>

        {/* Card 2: Balance disponible */}
        <div className="bg-[#121418] border border-gray-800/90 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden group hover:border-gray-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-300">Balance disponible</span>
            <div className="w-9 h-9 rounded-full bg-emerald-950/80 border border-emerald-800/50 flex items-center justify-center text-emerald-400">
              <DollarSign size={18} />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              {balance.available} $
            </div>
            <p className="text-xs text-gray-500 mt-1">Balance disponible para retirar</p>
          </div>
        </div>

        {/* Card 3: Retiro Pendiente */}
        <div className="bg-[#121418] border border-gray-800/90 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden group hover:border-gray-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-300">Retiro Pendiente</span>
            <div className="w-9 h-9 rounded-full bg-emerald-950/80 border border-emerald-800/50 flex items-center justify-center text-emerald-400">
              <Clock size={18} />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              {balance.pendingWithdraw} $
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {balance.pendingWithdraw > 0 ? 'En proceso de verificación' : 'No hay retiros pendientes'}
            </p>
          </div>
        </div>

        {/* Card 4: Tu código de referido */}
        <div className="bg-[#121418] border border-gray-800/90 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden group hover:border-gray-700 transition">
          <div>
            <span className="text-sm font-medium text-gray-300">Tu código de referido</span>
            <div className="mt-3 flex items-center justify-between bg-black/60 border border-gray-800 rounded-xl px-4 py-2.5">
              <span className="font-mono font-black text-white text-base tracking-widest">{referralCode}</span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="text-gray-400 hover:text-white p-1 transition cursor-pointer"
                title="Copiar código"
              >
                {copiedCode ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
              </button>
            </div>
          </div>
          <p className="text-[11px] text-gray-500 mt-3 leading-snug">
            Comparte este código o enlace y gana un 20% de comisión por cada referido directo.
          </p>
        </div>

      </div>

      {/* Multi-level Commission Structure Overview */}
      <div className="bg-[#121418] border border-gray-800/90 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2 font-display">
              <Layers size={18} className="text-emerald-400" />
              Estructura de Comisiones (5 Niveles)
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">Porcentaje de ganancia sobre cada compra de recarga en tu red</p>
          </div>
          <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-3 py-1 rounded-full w-fit">
            Total Repartido: 40%
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">

          {/* Level 1 */}
          <div className="bg-black/50 border border-emerald-500/40 rounded-xl p-3.5 text-center space-y-1">
            <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Nivel 1 (Directos)</div>
            <div className="text-2xl font-black text-emerald-400">20%</div>
            <p className="text-[10px] text-gray-400">{countByLevel[1]} referidos</p>
          </div>

          {/* Level 2 */}
          <div className="bg-black/50 border border-gray-800 rounded-xl p-3.5 text-center space-y-1">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Nivel 2</div>
            <div className="text-2xl font-black text-white">5%</div>
            <p className="text-[10px] text-gray-400">{countByLevel[2]} referidos</p>
          </div>

          {/* Level 3 */}
          <div className="bg-black/50 border border-gray-800 rounded-xl p-3.5 text-center space-y-1">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Nivel 3</div>
            <div className="text-2xl font-black text-white">5%</div>
            <p className="text-[10px] text-gray-400">{countByLevel[3]} referidos</p>
          </div>

          {/* Level 4 */}
          <div className="bg-black/50 border border-gray-800 rounded-xl p-3.5 text-center space-y-1">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Nivel 4</div>
            <div className="text-2xl font-black text-white">5%</div>
            <p className="text-[10px] text-gray-400">{countByLevel[4]} referidos</p>
          </div>

          {/* Level 5 */}
          <div className="bg-black/50 border border-gray-800 rounded-xl p-3.5 text-center space-y-1">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Nivel 5</div>
            <div className="text-2xl font-black text-white">5%</div>
            <p className="text-[10px] text-gray-400">{countByLevel[5]} referidos</p>
          </div>

        </div>
      </div>

      {/* Mis Referidos Section */}
      <div className="bg-[#121418] border border-gray-800/90 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-bold text-white">Mis Referidos</h2>

          {/* Filter Level Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              onClick={() => setSelectedLevelTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                selectedLevelTab === 'all'
                  ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20'
                  : 'bg-black/60 text-gray-400 hover:text-white border border-gray-800'
              }`}
            >
              Todos ({referrals.length})
            </button>
            {[1, 2, 3, 4, 5].map((lvl) => (
              <button
                key={lvl}
                onClick={() => setSelectedLevelTab(lvl)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                  selectedLevelTab === lvl
                    ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20'
                    : 'bg-black/60 text-gray-400 hover:text-white border border-gray-800'
                }`}
              >
                Nivel {lvl} ({countByLevel[lvl as keyof typeof countByLevel]})
              </button>
            ))}
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-400">
            <thead>
              <tr className="border-b border-gray-800 text-xs font-semibold text-gray-400">
                <th className="pb-3 px-2">Usuario</th>
                <th className="pb-3 px-2">Nivel</th>
                <th className="pb-3 px-2">Fecha Registro</th>
                <th className="pb-3 px-2 text-center">Tasa Comisión</th>
                <th className="pb-3 px-2 text-right">Comisión Ganada</th>
              </tr>
            </thead>
            <tbody>
              {filteredReferrals.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-sm text-gray-500">
                    No tienes referidos en este nivel aún. Comparte tu enlace para comenzar a ganar comisiones.
                  </td>
                </tr>
              ) : (
                filteredReferrals.map((ref) => (
                  <tr key={ref.id} className="border-b border-gray-850 hover:bg-gray-900/40 transition">
                    <td className="py-3 px-2 font-medium text-white">{ref.email}</td>
                    <td className="py-3 px-2">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        ref.level === 1 ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-gray-800 text-gray-300'
                      }`}>
                        Nivel {ref.level}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-gray-400">{ref.registeredAt}</td>
                    <td className="py-3 px-2 text-center font-bold text-gray-300">{ref.commissionRate}%</td>
                    <td className="py-3 px-2 text-right font-bold text-emerald-400">
                      ${ref.commissionEarned.toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-800">
                <td colSpan={4} className="pt-3 px-2 text-right font-semibold text-gray-400">
                  Total Comisiones:
                </td>
                <td className="pt-3 px-2 text-right font-bold text-white text-base">
                  ${totalCommissions.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Cómo funciona Section */}
      <div className="bg-[#121418] border border-gray-800/90 rounded-2xl p-6 sm:p-8">
        <h2 className="text-lg font-bold text-white mb-8">Cómo funciona</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">

          {/* Step 1 */}
          <div className="flex flex-col items-center space-y-3.5">
            <div className="w-16 h-16 rounded-full bg-emerald-950/60 border border-emerald-800/50 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-950/40">
              <Copy size={26} />
            </div>
            <h3 className="font-bold text-base text-white">1. Comparte tu enlace</h3>
            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed max-w-xs">
              Copia y comparte tu enlace de referidos personalizado con tus contactos a través de redes sociales, email o WhatsApp.
            </p>
          </div>

          {/* Step 2 */}
          <div className="flex flex-col items-center space-y-3.5">
            <div className="w-16 h-16 rounded-full bg-emerald-950/60 border border-emerald-800/50 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-950/40">
              <UserPlus size={26} />
            </div>
            <h3 className="font-bold text-base text-white">2. Tus contactos se registran</h3>
            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed max-w-xs">
              Cuando alguien se registra usando tu enlace, queda vinculado automáticamente a tu cuenta como referido.
            </p>
          </div>

          {/* Step 3 */}
          <div className="flex flex-col items-center space-y-3.5">
            <div className="w-16 h-16 rounded-full bg-emerald-950/60 border border-emerald-800/50 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-950/40">
              <DollarSign size={26} />
            </div>
            <h3 className="font-bold text-base text-white">3. Recibe comisiones</h3>
            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed max-w-xs">
              Obtén comisiones automáticas por cada compra de recargas realizada por tus referidos en los 5 niveles.
            </p>
          </div>

        </div>
      </div>

      {/* Modal: Retiro de Comisiones */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121418] border border-gray-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-scale-up">
            <div className="p-5 border-b border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-950/80 border border-emerald-800/50 text-emerald-400 rounded-xl">
                  <Wallet size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Solicitar Retiro de Comisiones</h3>
                  <p className="text-xs text-gray-400">Balance disponible: <span className="text-emerald-400 font-bold">${balance.available} USD</span></p>
                </div>
              </div>
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRequestWithdraw} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Monto a Retirar ($ USD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="5"
                  max={balance.available}
                  placeholder={`Ej: 50.00 (Mínimo $5 USD)`}
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="w-full bg-black/60 border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Método de Pago
                </label>
                <select
                  value={withdrawMethod}
                  onChange={(e: any) => setWithdrawMethod(e.target.value)}
                  className="w-full bg-black/60 border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="nequi">Nequi (Colombia)</option>
                  <option value="daviplata">Daviplata (Colombia)</option>
                  <option value="bancolombia">Bancolombia (Cuenta Ahorros)</option>
                  <option value="usdt">USDT (Cripto TRC20 / BEP20)</option>
                  <option value="saldo_crm">Convertir a Saldo de Recarga IA (+10% Bono Gratis)</option>
                </select>
              </div>

              {withdrawMethod !== 'saldo_crm' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    {withdrawMethod === 'usdt' ? 'Dirección de Billetera USDT & Red' : 'Número de Celular / Cuenta Bancaria'}
                  </label>
                  <input
                    type="text"
                    placeholder={withdrawMethod === 'usdt' ? 'Ej: TXYZ... (Red TRC20)' : 'Ej: 3101234567 / CC 12345678'}
                    value={accountDetails}
                    onChange={(e) => setAccountDetails(e.target.value)}
                    className="w-full bg-black/60 border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowWithdrawModal(false)}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-white rounded-xl hover:bg-gray-800 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={balance.available <= 0}
                  className="px-5 py-2 text-sm font-bold text-black bg-[#00E676] hover:bg-[#00c864] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition shadow-lg shadow-emerald-500/20 cursor-pointer"
                >
                  Confirmar Retiro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

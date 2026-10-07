import React, { useState, useEffect } from 'react';
import {
  Users, DollarSign, Share2, Wallet,
  CreditCard, ShieldCheck, Gift, Copy, CheckCircle, Network, ArrowRight, Smartphone, Compass, ArrowDownRight, RefreshCw, Send, Radio, X, Globe
} from 'lucide-react';
import { ReactFlow, Background, Controls } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { getReferralLink, getEffectiveDomain } from '../lib/whitelabel';

interface CommissionTx {
  txId: string;
  source: string;
  plan: string;
  totalMonto: number;
  level: string;
  dest: string;
  percent: number;
  share: number;
  status: 'Completado' | 'Procesando';
  timestamp: string;
}

const initialNodes = [
  { id: '1', position: { x: 400, y: 50 }, data: { label: 'Tú (Líder)' }, type: 'input' },

  { id: '2', position: { x: 200, y: 150 }, data: { label: 'María G. (Nivel 1)\nVentas: $1.2k' } },
  { id: '3', position: { x: 600, y: 150 }, data: { label: 'Carlos L. (Nivel 1)\nVentas: $800' } },

  { id: '4', position: { x: 50, y: 250 }, data: { label: 'Ana M. (Nivel 2)\nVentas: $300' } },
  { id: '5', position: { x: 350, y: 250 }, data: { label: 'Luis P. (Nivel 2)\nVentas: $450' } },
  { id: '6', position: { x: 500, y: 250 }, data: { label: 'Sara V. (Nivel 2)\nVentas: $200' } },
  { id: '7', position: { x: 700, y: 250 }, data: { label: 'Juan D. (Nivel 2)\nVentas: $150' } },
];
const initialEdges = [
  { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: '#D4AF37' } },
  { id: 'e1-3', source: '1', target: '3', animated: true, style: { stroke: '#D4AF37' } },
  { id: 'e2-4', source: '2', target: '4', animated: true, style: { stroke: '#4285F4' } },
  { id: 'e2-5', source: '2', target: '5', animated: true, style: { stroke: '#4285F4' } },
  { id: 'e3-6', source: '3', target: '6', animated: true, style: { stroke: '#4285F4' } },
  { id: 'e3-7', source: '3', target: '7', animated: true, style: { stroke: '#4285F4' } },
];

interface ComunidadViewProps {
  currentUser?: { name: string; email: string; role: string; plan?: string } | null;
  onUpdateUser?: (user: any) => void;
}

export default function ComunidadView({ currentUser, onUpdateUser }: ComunidadViewProps) {
  const [activeTab, setActiveTab] = useState('red');
  const [copied, setCopied] = useState(false);
  const [walletAddress, setWalletAddress] = useState(() => {
    return currentUser?.role === 'superadmin'
      ? 'UQCL7H-UGIwxtwONsAaSWdBECdXLOZJbJkXK4qjatvXNqKNI'
      : 'UQDv_h-hYV_X_kZ92kLw7N45a7r2e3d4f5g6h';
  });
  const [packages, setPackages] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/packages')
      .then(res => res.json())
      .then(data => setPackages(data))
      .catch(err => console.error('Error fetching packages:', err));
  }, []);

  useEffect(() => {
    if (localStorage.getItem('redirect_to_packages') === 'true') {
      setActiveTab('suscripcion');
      localStorage.removeItem('redirect_to_packages');
    }
  }, []);

  const isDroshipperClean = currentUser?.role === 'droshipper' && currentUser?.name?.toLowerCase() !== 'oscar';

  // Dynamic stats
  const [totalEarnings, setTotalEarnings] = useState(isDroshipperClean ? 0.00 : 4250.00);
  const [totalNetworkVolume, setTotalNetworkVolume] = useState(isDroshipperClean ? 0.00 : 18400.00);

  // Commision log starting data
  const [transactions, setTransactions] = useState<CommissionTx[]>(isDroshipperClean ? [] : [
    {
      txId: '0x8a92f7ca62bf7',
      source: 'Droshipper 1',
      plan: 'Master 360 ($899 USD)',
      totalMonto: 899,
      level: 'Nivel 1 (Patrocinador)',
      dest: 'Tú (Líder)',
      percent: 50,
      share: 449.50,
      status: 'Completado',
      timestamp: 'Hace 10 minutos'
    },
    {
      txId: '0xf1b892ad11cb1',
      source: 'Sub 1',
      plan: 'Pro Droshipper ($300 USD)',
      totalMonto: 300,
      level: 'Nivel 2',
      dest: 'Tú (Líder)',
      percent: 10,
      share: 30.00,
      status: 'Completado',
      timestamp: 'Hace 1 hora'
    },
    {
      txId: '0x73cf11fa83bb2',
      source: 'Red Global',
      plan: 'Master 360 ($899 USD)',
      totalMonto: 899,
      level: 'Admin Fee',
      dest: 'SuperAdmin (UQCL7H-UGIwxtwONsAaSWdBECdXLOZJbJkXK4qjatvXNqKNI)',
      percent: 25,
      share: 224.75,
      status: 'Completado',
      timestamp: 'Hace 3 horas'
    }
  ]);

  // Simulation states
  const [showSimModal, setShowSimModal] = useState(false);
  const [selectedPlanValue, setSelectedPlanValue] = useState<number>(300);
  const [selectedPlanName, setSelectedPlanName] = useState('Pro Droshipper');
  const [simStep, setSimStep] = useState(0); // 0: Start, 1: Connecting, 2: Executing Smart Contract MLM Split, 3: Completed
  const [paymentSource, setPaymentSource] = useState('Droshipper_Referido_0x4');
  const [payCurrency, setPayCurrency] = useState<'USDT' | 'TON'>('USDT');
  const [paymentMethod, setPaymentMethod] = useState<'onchain' | 'bot'>('onchain');
  const TON_RATE = 7.25; // 1 TON = $7.25 USD

  const [createdInvoice, setCreatedInvoice] = useState<any>(null);
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
  const [botUsername, setBotUsername] = useState('expertecom_bot');

  // Fetch bot configuration
  useEffect(() => {
    fetch('/api/telegram-pay/config')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.botUsername) {
          setBotUsername(data.botUsername);
        }
      })
      .catch(err => console.error('Error fetching bot config:', err));
  }, []);

  // Sync transactions count and statistics with real backend persistent ledger
  useEffect(() => {
    fetch('/api/telegram-pay/transactions')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.transactions && data.transactions.length > 0) {
          setTransactions(data.transactions);

          let earnings = 4250.00;
          let volume = 18400.00;
          data.transactions.forEach((tx: any) => {
            if (tx.dest === 'Tú (@wallet)' || tx.dest === 'Tú (Líder)') {
              earnings += (tx.share || 0);
            }
            volume += (tx.totalMonto || 0);
          });
          setTotalEarnings(earnings);
          setTotalNetworkVolume(volume);
        }
      })
      .catch(err => console.error('Error fetching transactions ledger:', err));
  }, []);

  const tabs = [
    { id: 'red', label: 'Red (Unilevel)', icon: <Network size={16} /> },
    { id: 'comisiones', label: 'Comisiones', icon: <DollarSign size={16} /> },
    { id: 'smart-contract', label: 'Link Telegram & Smart Contract', icon: <Share2 size={16} /> },
    { id: 'wallet', label: 'Wallet', icon: <Wallet size={16} /> },
    { id: 'suscripcion', label: 'Suscripción', icon: <CreditCard size={16} /> },
  ];

  const [copiedPlatform, setCopiedPlatform] = useState(false);
  const effectiveReferralLink = getReferralLink(walletAddress);
  const effectiveDomain = getEffectiveDomain();

  const handleCopyPlatform = () => {
    const link = effectiveReferralLink;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(link)
        .then(() => {
          setCopiedPlatform(true);
          setTimeout(() => setCopiedPlatform(false), 2000);
        })
        .catch((err) => {
          console.error('Failed to copy platform link:', err);
          fallbackCopyTextPlatform(link);
        });
    } else {
      fallbackCopyTextPlatform(link);
    }
  };

  const fallbackCopyTextPlatform = (text: string) => {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.top = "0";
      textArea.style.left = "0";
      textArea.style.position = "fixed";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedPlatform(true);
      setTimeout(() => setCopiedPlatform(false), 2000);
    } catch (err) {
      console.error('Fallback copy method failed', err);
    }
  };

  const handleCopy = () => {
    const link = `https://t.me/${botUsername}?start=ref_${walletAddress}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(link)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch((err) => {
          console.error('Failed to copy with navigator.clipboard', err);
          fallbackCopyText(link);
        });
    } else {
      fallbackCopyText(link);
    }
  };

  const fallbackCopyText = (text: string) => {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      // Shield against UI scrolls
      textArea.style.top = "0";
      textArea.style.left = "0";
      textArea.style.position = "fixed";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Fallback copy method failed', err);
    }
  };

   const startSimulation = async (planName: string, planValue: number) => {
    setSelectedPlanName(planName);
    setSelectedPlanValue(planValue);
    setSimStep(0);
    setCreatedInvoice(null);
    setShowSimModal(true);
    setIsCreatingInvoice(true);

    const userSponsorWallet = localStorage.getItem(`sponsor_wallet_${(currentUser?.email || '').toLowerCase().trim()}`) || '';

    try {
      const res = await fetch('/api/telegram-pay/create-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          planName,
          planValue,
          email: currentUser?.email || 'usuario@email.com',
          telegramWallet: walletAddress,
          sponsorWallet: userSponsorWallet
        })
      });
      const data = await res.json();
      if (data.success && data.invoice) {
        setCreatedInvoice(data.invoice);
      }
    } catch (e) {
      console.error("Error creating telegram pay invoice:", e);
    } finally {
      setIsCreatingInvoice(false);
    }
  };

  const runSmartContractSplit = async () => {
    if (!createdInvoice) return;
    setSimStep(1);

    // Step 1: Connecting to bot and validating TG session
    setTimeout(async () => {
      setSimStep(2);

      try {
        const res = await fetch('/api/telegram-pay/confirm', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            invoiceId: createdInvoice.invoiceId,
            email: currentUser?.email || 'usuario@email.com'
          })
        });
        const data = await res.json();
        if (data.success) {
          // Success! Re-fetch transactions to sync state with backend database
          const txRes = await fetch('/api/telegram-pay/transactions');
          const txData = await txRes.json();
          if (txData.success && txData.transactions) {
            setTransactions(txData.transactions);

            let earnings = 4250.00;
            let volume = 18400.00;
            txData.transactions.forEach((tx: any) => {
              if (tx.dest === 'Tú (@wallet)' || tx.dest === 'Tú (Líder)') {
                earnings += (tx.share || 0);
              }
              volume += (tx.totalMonto || 0);
            });
            setTotalEarnings(earnings);
            setTotalNetworkVolume(volume);
          }

          // Force local state parent update
          if (onUpdateUser && currentUser) {
            onUpdateUser({ ...currentUser, plan: data.planName });
          }

          setSimStep(3);
        } else {
          setSimStep(0);
          alert('Hubo un error confirmando el pago con Telegram: ' + data.error);
        }
      } catch (e) {
        console.error("Error confirming telegram pay invoice:", e);
        setSimStep(0);
      }
    }, 2000);
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display text-white mb-2">Red de Referidos</h2>
          <p className="text-gray-400">Gestiona tu red, ganancias y contratos inteligentes en un solo lugar.</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-900/10 border border-blue-900/30 text-xs text-blue-400">
           <Radio size={14} className="animate-pulse" /> Servidor Telegram Smart Contract Activo
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-gray-800">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg transition-colors whitespace-nowrap text-sm font-medium ${
              activeTab === tab.id
                ? 'bg-gold/10 text-gold border-b-2 border-gold -mb-[1px]'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900/50'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div className="panel p-6 rounded-2xl min-h-[500px]">
        {activeTab === 'red' && (
          <div className="h-full flex flex-col">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
              <div>
                <h3 className="text-xl font-bold text-white mb-1">Tu Red Unilevel</h3>
                <p className="text-sm text-gray-400 font-mono border-l-2 border-gold pl-3">
                  Estructura de compensación automatizada: N1 (50%), N2 (10%), N3 (5%), N4 (5%), N5 (5%).
                  {currentUser?.role !== 'droshipper' && ' Soporte Admin Wallet (25%).'}
                </p>
              </div>
              <button
                onClick={() => startSimulation('Pro Droshipper', 300)}
                className="bg-gold text-black px-4 py-2 rounded-lg text-xs font-bold hover:bg-yellow-400 transition"
              >
                Realizar Pago On-Chain
              </button>
            </div>
            <div className="flex-1 bg-black/50 border border-gray-800 rounded-xl overflow-hidden min-h-[400px]">
              <ReactFlow
                nodes={isDroshipperClean ? [{ id: '1', position: { x: 400, y: 150 }, data: { label: `Tú (${currentUser?.name || 'Jose'})` }, type: 'input' }] : initialNodes}
                edges={isDroshipperClean ? [] : initialEdges}
                fitView
                colorMode="dark"
              >
                <Background color="#333" gap={16} />
                <Controls />
              </ReactFlow>
            </div>
          </div>
        )}

        {activeTab === 'comisiones' && (
          <div className="space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 bg-black/40 border border-gray-800 rounded-2xl text-left">
                  <span className="text-gray-400 text-sm font-medium">Mis Comisiones Unilevel (Tú @wallet)</span>
                  <div className="text-3xl font-display text-gold mt-2">${totalEarnings.toFixed(2)} USDT</div>
                  <div className="text-xs text-green-400 mt-2 flex items-center gap-1">+15.8% distribuido al instante</div>
                </div>
                <div className="p-6 bg-black/40 border border-gray-800 rounded-2xl text-left">
                  <span className="text-gray-400 text-sm font-medium">Volumen de Red Total</span>
                  <div className="text-3xl font-display text-white mt-2">${totalNetworkVolume.toFixed(2)} USDT</div>
                  <div className="text-xs text-gray-500 mt-2 flex items-center gap-1">Participación activa: 15 usuarios</div>
                </div>
                <div className="p-6 bg-black/40 border border-gray-800 rounded-2xl relative overflow-hidden group text-left">
                   <div className="absolute top-0 right-0 w-24 h-24 bg-gold/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none group-hover:bg-gold/10 transition-colors"></div>
                   <div className="relative z-10 flex flex-col h-full justify-between">
                     <span className="text-gray-400 text-sm font-medium">Billetera Telegram (@wallet)</span>
                     <div className="text-xs text-yellow-500 font-mono mt-1 w-full truncate">{walletAddress}</div>
                     <button className="flex items-center justify-center bg-gray-900 border border-gray-800 hover:border-gold/40 text-gold text-xs font-bold py-2 rounded-lg mt-4 transition-all">
                        Retiros Automáticos Activos
                     </button>
                   </div>
                </div>
             </div>

             <div className="flex justify-between items-center mt-8 mb-4">
                <h3 className="text-lg font-bold text-white">Transacciones Recientes del Smart Contract en Telegram</h3>
                <div className="text-xs text-gray-500 font-mono flex items-center gap-1">
                   <RefreshCw size={12} className="animate-spin" /> Escaneando Ton / Telegram Blockchain
                </div>
             </div>

             <div className="overflow-x-auto border border-gray-800 rounded-xl bg-black/20">
               <table className="w-full text-left text-sm">
                 <thead className="bg-gray-900/80 text-gray-400">
                   <tr>
                     <th className="px-4 py-3 font-medium">Hash / TxID</th>
                     <th className="px-4 py-3 font-medium">Origen / Plan</th>
                     <th className="px-4 py-3 font-medium">Nivel</th>
                     <th className="px-4 py-3 font-medium">Destinatario</th>
                     <th className="px-4 py-3 font-medium">Comisión</th>
                     <th className="px-4 py-3 font-medium">Estado</th>
                     <th className="px-4 py-3 font-medium">Tiempo</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-800">
                   {transactions.filter(tx => currentUser?.role !== 'droshipper' || (tx.level !== 'Admin Fee' && tx.level !== 'Admin Principal')).map((tx, index) => (
                     <tr key={index} className="hover:bg-white/5 transition-colors">
                       <td className="px-4 py-3 font-mono text-xs text-blue-400">{tx.txId}</td>
                       <td className="px-4 py-3 text-gray-300">
                          <span className="block font-medium">{tx.source}</span>
                          <span className="block text-[10px] text-gray-500">{tx.plan}</span>
                       </td>
                       <td className="px-4 py-3 text-gray-400 text-xs">{tx.level}</td>
                       <td className="px-4 py-3 text-gray-400 text-xs font-mono">{tx.dest}</td>
                       <td className="px-4 py-3 text-gold font-medium">
                          ${tx.share.toFixed(2)} USDT <span className="text-[10px] text-gray-500 font-normal">({tx.percent}%)</span>
                       </td>
                       <td className="px-4 py-3 font-normal">
                          <span className="px-2 py-1 bg-green-905/30 text-green-400 text-[10px] rounded-full border border-green-800/50">
                             {tx.status}
                          </span>
                       </td>
                       <td className="px-4 py-3 text-gray-500 text-xs">{tx.timestamp}</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
          </div>
        )}

        {activeTab === 'smart-contract' && (
          <div className="max-w-3xl space-y-6">
            <div className="bg-gradient-to-br from-gray-900 to-black p-6 rounded-2xl border border-gray-800 relative overflow-hidden text-left">
               <ShieldCheck className="absolute -bottom-6 -right-6 w-48 h-48 text-white/5" />
               <div className="relative z-10 space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">Enlaces de Referido y Patrocinio Activo</h3>
                    <p className="text-gray-400 text-sm">Comparte cualquiera de estos dos enlaces. El sistema asocia en automático tu Wallet de Telegram para que recibas comisiones en tu billetera de forma inmediata on-chain al adquirirse cualquier plan.</p>
                  </div>

                  {/* Opción 1: Enlace de la Plataforma */}
                  <div className="bg-gold/5 p-4 rounded-xl border border-gold/20 space-y-3">
                     <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-gold uppercase tracking-wider block">OPCIÓN 1: Enlace de la Plataforma Web ({effectiveDomain})</label>
                        <span className="text-[10px] bg-gold/20 text-gold px-2 py-0.5 rounded font-bold font-mono">MARCA & DOMINIO ACTIVO</span>
                     </div>
                     <p className="text-xs text-gray-400">Tus referidos se registrarán en tu dominio personalizado o enlace oficial ({effectiveDomain}), su cuenta quedará vinculada en automático a tu patrocinio, y al seleccionar el plan se generará el pago instantáneo en Telegram con tu wallet configurada.</p>
                     <div className="flex gap-2">
                        <input
                          readOnly
                          value={effectiveReferralLink}
                          onFocus={(e) => e.target.select()}
                          className="flex-1 bg-black border border-gray-800 rounded-lg px-4 py-3 text-sm text-gray-200 focus:outline-none font-mono text-xs cursor-pointer"
                        />
                       <button onClick={handleCopyPlatform} className="bg-gold hover:bg-yellow-400 text-black px-4 py-3 rounded-lg transition-colors flex items-center justify-center min-w-[120px] font-bold text-xs shrink-0">
                         {copiedPlatform ? <span className="flex items-center gap-1.5"><CheckCircle size={14} className="text-black" /> Copiado</span> : <span className="flex items-center gap-1.5"><Copy size={14} /> Copiar Link</span>}
                       </button>
                    </div>
                  </div>

                  {/* Opción 2: Enlace de Telegram */}
                  <div className="bg-black/40 p-4 rounded-xl border border-gray-800 space-y-3">
                     <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">OPCIÓN 2: Enlace Directo al Bot de Telegram</label>
                     </div>
                     <p className="text-xs text-gray-500 font-sans">Abre directamente el bot oficial en su celular, guardando tu dirección como patrocinador dentro de Telegram.</p>
                     <div className="flex gap-2">
                        <input
                          readOnly
                          value={`https://t.me/${botUsername}?start=ref_${walletAddress}`}
                          className="flex-1 bg-black border border-gray-900 rounded-lg px-4 py-3 text-sm text-gray-450 focus:outline-none font-mono text-xs"
                        />
                       <button onClick={handleCopy} className="bg-gray-805 hover:bg-gray-750 text-white px-4 py-3 rounded-lg transition-colors flex items-center justify-center min-w-[120px] text-xs shrink-0 border border-gray-800">
                         {copied ? <span className="flex items-center gap-1.5"><CheckCircle size={14} className="text-green-400" /> Copiado</span> : <span className="flex items-center gap-1.5"><Copy size={14} /> Copiar Bot</span>}
                       </button>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-gray-800 grid grid-cols-2 gap-4 text-sm font-mono">
                     <div className="space-y-1">
                        <span className="text-gray-500 font-medium block">Pasarela Integrada En:</span>
                        <span className="text-blue-400 flex items-center gap-2 block"><span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span> Telegram TON / Pagos Nativos</span>
                     </div>
                     <div className="space-y-1">
                        <span className="text-gray-500 font-medium block">Distribución Automática:</span>
                        <span className="text-green-400 flex items-center gap-2 block"><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> Smart Contract Activo</span>
                     </div>
                  </div>
               </div>
            </div>

            <div className="panel p-6 rounded-2xl border border-gray-800 bg-black/30">
               <h4 className="font-bold text-white mb-3 text-left">Diagrama de Reparto de Comisión Telegram Smart Contract {currentUser?.role === 'droshipper' ? '(75%)' : '(100%)'}</h4>
               <div className={`grid grid-cols-1 ${currentUser?.role === 'droshipper' ? 'md:grid-cols-5' : 'md:grid-cols-6'} gap-4`}>
                  <div className="bg-gold/10 border border-gold/30 p-4 rounded-xl text-center">
                     <p className="text-xs text-gray-400">Nivel 1</p>
                     <p className="text-lg font-bold text-gold font-sans font-semibold">50%</p>
                  </div>
                  <div className="bg-white/5 border border-white/10 p-4 rounded-xl text-center">
                     <p className="text-xs text-gray-400">Nivel 2</p>
                     <p className="text-lg font-bold text-white font-sans font-semibold">10%</p>
                  </div>
                  <div className="bg-white/5 border border-white/10 p-4 rounded-xl text-center">
                     <p className="text-xs text-gray-400">Nivel 3</p>
                     <p className="text-lg font-bold text-white font-sans font-semibold">5%</p>
                  </div>
                  <div className="bg-white/5 border border-white/10 p-4 rounded-xl text-center">
                     <p className="text-xs text-gray-400">Nivel 4</p>
                     <p className="text-lg font-bold text-white font-sans font-semibold">5%</p>
                  </div>
                  <div className="bg-white/5 border border-white/10 p-4 rounded-xl text-center">
                     <p className="text-xs text-gray-400">Nivel 5</p>
                     <p className="text-lg font-bold text-white font-sans font-semibold">5%</p>
                  </div>
                  {currentUser?.role !== 'droshipper' && (
                    <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl text-center">
                       <p className="text-xs text-gray-400">Admins</p>
                       <p className="text-lg font-bold text-red-400 font-sans font-semibold">25%</p>
                    </div>
                  )}
               </div>
            </div>
          </div>
        )}

        {activeTab === 'wallet' && (
          <div className="max-w-2xl space-y-6">
             <div className="flex items-start gap-6 bg-black/40 p-6 rounded-2xl border border-gray-800">
                <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0 border border-blue-500/20">
                   <img src="https://cryptologos.cc/logos/tether-usdt-logo.svg?v=024" alt="USDT" className="w-8 h-8 opacity-90" />
                </div>
                <div className="space-y-4 flex-1 text-left">
                   <div>
                     <h3 className="text-xl font-bold text-white mb-1">Banco Breve / Wallet Personal</h3>
                     <p className="text-gray-400 text-sm">Dirección donde recibes tus ganancias automáticas de la red.</p>
                   </div>

                   <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Wallet de Recepción (Telegram Wallet)</label>
                      <input
                         type="text"
                         value={walletAddress}
                         onChange={(e) => setWalletAddress(e.target.value)}
                         placeholder="Ingresa tu dirección de Telegram Wallet (@wallet)"
                         className="w-full bg-black border border-gray-800 rounded-lg px-4 py-3 text-sm text-gray-200 focus:border-gold focus:outline-none transition-colors font-mono"
                      />
                   </div>
                   <button className="bg-gold text-black px-6 py-2 rounded-lg font-semibold hover:bg-yellow-400 transition-colors w-full sm:w-auto mt-2">
                     Vincular Telegram Wallet
                   </button>

                   <div className="p-4 bg-blue-900/10 border border-blue-900/30 rounded-lg mt-4 flex gap-3 text-sm text-blue-200 items-start">
                      <ShieldCheck size={18} className="mt-0.5 text-blue-400 flex-shrink-0" />
                      <p>Sugerencia: Todas las comisiones de tu Unilevel se depositan automáticamente e instantáneamente en esta wallet de Telegram cuando un referido adquiere un paquete.</p>
                   </div>
                </div>
             </div>
          </div>
        )}

        {activeTab === 'suscripcion' && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-left">
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Paquetes de Suscripción (Pagos Telegram)</h3>
                <p className="text-gray-400 text-sm max-w-2xl font-sans">Al invitar a otros, las ganancias se distribuyen automáticamente mediante el Smart Contract de Telegram. Un usuario adquiere su paquete desde el bot y tú recibes la comisión directo a tu wallet sin intervención humana.</p>
              </div>
              <div className="bg-yellow-500/10 border border-yellow-500/20 px-3 py-1.5 rounded-lg text-yellow-500 text-xs font-bold flex items-center gap-1">
                 🚀 Modo Real/Test Habilitado
              </div>
            </div>

            {/* Dinámica de Patrocinador Vinculado */}
            {(() => {
              const userSponsor = localStorage.getItem(`sponsor_wallet_${(currentUser?.email || '').toLowerCase().trim()}`);
              if (userSponsor) {
                return (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between text-left gap-3">
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="text-yellow-500 w-6 h-6 flex-shrink-0 animate-pulse" />
                      <div>
                        <p className="text-xs text-yellow-500 font-bold uppercase tracking-wider">Patrocinador Vinculado por Smart Contract</p>
                        <p className="text-xs font-mono text-gray-300 select-all">{userSponsor}</p>
                      </div>
                    </div>
                    <span className="text-[10px] bg-green-500/20 text-green-400 font-bold px-2.5 py-1 rounded border border-green-500/30 font-mono self-start sm:self-auto uppercase tracking-wide">
                      ¡Comisión Directa 50% Enlazada!
                    </span>
                  </div>
                );
              } else {
                return (
                  <div className="bg-gray-900/40 border border-gray-800 p-4 rounded-xl text-left flex items-start gap-3 text-xs text-gray-500">
                    <ShieldCheck className="text-gray-600 w-4 h-4 mt-0.5" />
                    <div>
                      <p className="text-gray-400 font-semibold">Registro sin patrocinador directo</p>
                      <p>Tus compras o renovación de licencia se destinarán por defecto a la administración al no poseer un patrocinador directo asignado en la red web.</p>
                    </div>
                  </div>
                );
              }
            })()}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {packages.map((sub, i) => {
                const isActive = (currentUser?.plan || 'Gratuito') === sub.title;
                return (
                  <div key={i} className={`p-6 rounded-2xl border relative flex flex-col h-full bg-black transition-transform hover:-translate-y-1 text-left ${isActive ? 'border-green-500/60 shadow-[0_0_20px_rgba(34,197,94,0.15)] ring-1 ring-green-500/40' : sub.premium ? 'border-gold shadow-[0_0_20px_rgba(212,175,55,0.15)] ring-1 ring-gold/20' : 'border-gray-800'}`}>
                    {sub.highlight && (
                       <div className="absolute top-0 right-6 -translate-y-1/2 bg-gold text-black text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                         {sub.highlight}
                       </div>
                    )}
                    <h4 className={`text-lg font-bold mb-2 flex justify-between items-center ${isActive ? 'text-green-400 font-bold' : sub.premium ? 'text-gold' : 'text-white'}`}>
                      <span>{sub.title}</span>
                      {isActive && <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded font-mono font-bold border border-green-500/30">ACTIVO</span>}
                    </h4>
                    <div className="text-3xl font-display text-white mb-2">${sub.price} USD</div>
                    <p className="text-gray-500 text-sm mb-6 pb-6 border-b border-gray-800">{sub.desc}</p>

                    <ul className="space-y-3 mb-8 flex-1">
                      {sub.features.map((feat, fi) => (
                        <li key={fi} className="flex items-center gap-2 text-sm text-gray-300">
                          <CheckCircle size={14} className={isActive ? 'text-green-500' : sub.premium ? 'text-gold' : 'text-gray-600'} /> {feat}
                        </li>
                      ))}
                    </ul>

                    {isActive ? (
                       <div className="w-full py-3 rounded-lg font-bold bg-green-950/30 border border-green-500/30 text-green-400 text-center tracking-wide text-sm flex items-center justify-center gap-1.5">
                          <CheckCircle size={16} /> Suscripción Activa
                       </div>
                    ) : (
                       <button
                         onClick={() => startSimulation(sub.title, sub.price)}
                         className={`w-full py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${sub.premium ? 'bg-gold text-black hover:bg-yellow-400' : 'bg-gray-800 text-white hover:bg-gray-700'}`}
                       >
                          Seleccionar Plan
                       </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Interactive Telegram Smart Contract Simulator Modal */}
      {showSimModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4">
          <div className="bg-[#0f172a] border border-blue-900/40 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in relative text-left">

            {/* Simulation Header */}
            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-[#1e293b]/50">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white">
                    <Smartphone size={20} />
                 </div>
                 <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                       Pasarela Oficial de Pagos Telegram TON Contract
                    </h3>
                    <p className="text-xs text-slate-400 font-sans">Procesador de Pago Automatizado y Dispersión Inmediata on-chain para Licencia: {selectedPlanName}</p>
                 </div>
              </div>
              <button onClick={() => setShowSimModal(false)} className="text-slate-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">

              {/* Phone interface body */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 relative min-h-[350px] flex flex-col justify-between">

                 {/* Step 0: Ready to pay */}
                 {simStep === 0 && (
                    <div className="space-y-6 text-center py-4 flex-1 flex flex-col justify-center items-center">
                       {isCreatingInvoice ? (
                          <div className="space-y-4">
                             <RefreshCw className="text-blue-400 w-12 h-12 animate-spin mx-auto" />
                             <p className="text-sm text-slate-400 font-mono">Iniciando pasarela de pagos on-chain, firmando factura...</p>
                          </div>
                       ) : createdInvoice ? (
                          <>
                             <div className="space-y-2 text-center">
                                 <h4 className="text-lg font-bold text-white flex items-center justify-center gap-2 font-sans">
                                   <ShieldCheck className="text-blue-400" size={20} /> {payCurrency === 'USDT' ? 'Pasarela Telegram Payments (USDT)' : 'Pasarela Telegram Payments (TON)'}
                                  </h4>

                                  {/* Selector de Moneda */}
                                  <div className="flex gap-2 justify-center bg-slate-900/60 p-1.5 rounded-xl border border-slate-800 my-2.5 max-w-[280px] mx-auto">
                                    <button
                                      onClick={() => setPayCurrency('USDT')}
                                      className={`flex-1 py-1 px-2 text-[11px] font-mono rounded-lg transition-all ${payCurrency === 'USDT' ? 'bg-gold text-black font-bold shadow' : 'text-slate-400 hover:text-white'}`}
                                    >
                                      USDT (Red TON)
                                    </button>
                                    <button
                                      onClick={() => setPayCurrency('TON')}
                                      className={`flex-1 py-1 px-2 text-[11px] font-mono rounded-lg transition-all ${payCurrency === 'TON' ? 'bg-gold text-black font-bold shadow' : 'text-slate-400 hover:text-white'}`}
                                    >
                                      TON Nativo
                                    </button>
                                  </div>


                                 <div className="bg-slate-900 border border-slate-800 rounded p-3 mb-2 text-left">
                                    <div className="flex justify-between mb-1">
                                      <span className="text-slate-400 text-[10px] uppercase">Cantidad a enviar:</span>
                                      <span className="text-gold font-bold text-xs">{payCurrency === 'USDT' ? `${selectedPlanValue} USDT` : `${(selectedPlanValue / TON_RATE).toFixed(2)} TON`}</span>
                                    </div>
                                    <div className="flex justify-between mb-1">
                                      <span className="text-slate-400 text-[10px] uppercase">Red:</span>
                                      <span className="text-white font-bold text-xs">TON (The Open Network)</span>
                                    </div>
                                    <div className="flex justify-between flex-col mt-1 pt-1 border-t border-slate-800">
                                      <span className="text-slate-400 text-[10px] uppercase mb-1">Billetera de Destino:</span>
                                      <span className="text-white font-mono text-[10px] break-all">{createdInvoice?.superAdminWallet}</span>
                                    </div>
                                 </div>

                                 <p className="text-[11px] text-slate-400 max-w-md mx-auto font-sans leading-relaxed">
                                   Escanea el código QR desde tu billetera compatible (Ej. Tonkeeper o Wallet de Telegram).
                                   <strong className="text-green-400 block mt-2 text-xs">Este pago es REAL y los fondos se dispersarán en blockchain inmediatamente.</strong>
                                 </p>

                             </div>

                             {/* Real dynamically generated base64 QR Code */}
                             <div className="bg-white p-3 rounded-2xl border border-slate-700 shadow-xl inline-block max-w-[170px] mx-auto">
                                <img src={createdInvoice.qrCodeValue} alt="Telegram Payment URL QR" className="w-36 h-36" />
                             </div>

                             <div className="space-y-3 w-full">
                                <a
                                  href={payCurrency === 'USDT' ? createdInvoice.usdtTransferLink : createdInvoice.tonTransferLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-400 underline hover:text-blue-300 break-all font-mono block max-w-md mx-auto font-sans font-semibold"
                                >
                                  {payCurrency === 'USDT' ? `🚀 Abrir Enlace TON/USDT Directo en Wallet` : `🚀 Abrir Enlace TON Nativo Directo en Wallet`}
                                </a>

                                <div className="flex gap-4 w-full justify-center pt-2">
                                   <button
                                     onClick={runSmartContractSplit}
                                     className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/30 w-full sm:w-auto"
                                   >
                                      Confirmar Pago <Send size={16} />
                                   </button>
                                </div>
                             </div>
                          </>
                       ) : (
                          <div className="space-y-4">
                             <RefreshCw className="text-red-400 w-12 h-12 animate-pulse mx-auto" />
                             <p className="text-sm text-red-400">Error al contactar con la pasarela. Intente de nuevo.</p>
                          </div>
                       )}
                    </div>
                 )}

                 {/* Step 1: Connecting */}
                 {simStep === 1 && (
                    <div className="space-y-6 text-center py-4 flex-1 flex flex-col justify-center items-center text-center">
                       <RefreshCw className="text-sky-400 w-12 h-12 animate-spin mx-auto" />
                       <div className="space-y-2">
                          <h4 className="text-lg font-bold text-white">Procesando pago real en la red de TON...</h4>
                          <p className="text-xs text-slate-500 font-mono">Verificando balance y preparando transferencia on-chain</p>
                       </div>
                    </div>
                 )}

                 {/* Step 2: Executing Split */}
                 {simStep === 2 && (
                    <div className="space-y-4 py-4 flex-1 flex flex-col justify-center text-left">
                       <div className="text-center space-y-1 mb-4">
                          <h4 className="text-lg font-bold text-yellow-500 animate-pulse">¡Pago Confirmado! Ejecutando Distribución Real</h4>
                          <p className="text-xs text-slate-400">Transfiriendo USDT / TON en tiempo real a las wallets registradas</p>
                       </div>

                       {/* Animated distribution diagram */}
                       <div className="space-y-3">
                          <div className="p-3 bg-blue-950/40 border border-blue-900/40 rounded-lg flex justify-between items-center text-sm">
                             <span className="text-slate-300">Patrocinador Nivel 1 (Tú - 50%):</span>
                             <span className="font-bold text-gold">+${(selectedPlanValue * 0.50).toFixed(2)} USDT</span>
                          </div>
                          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg flex justify-between items-center text-sm">
                             <span className="text-slate-300 font-mono">Nivel 2 Referente (10%):</span>
                             <span className="font-bold text-white">+${(selectedPlanValue * 0.10).toFixed(2)} USDT</span>
                          </div>
                          <div className="p-3 bg-slate-900/40 border border-slate-800 rounded-lg flex justify-between items-center text-sm">
                             <span className="text-slate-400 font-mono font-normal">Niveles 3, 4 y 5 (5% c/u):</span>
                             <span className="font-semibold text-slate-400">+${(selectedPlanValue * 0.05).toFixed(2)} USDT</span>
                          </div>
                          <div className={`p-3 rounded-lg flex justify-between items-center text-sm ${currentUser?.role !== 'droshipper' ? 'bg-red-950/30 border border-red-950/20' : 'bg-slate-900/40 border border-slate-850'}`}>
                             {currentUser?.role !== 'droshipper' ? (
                               <>
                                 <span className="text-red-400 font-bold">Plataforma (Admin - 25%):</span>
                                 <span className="font-bold text-red-500">+${(selectedPlanValue * 0.25).toFixed(2)} USDT</span>
                               </>
                             ) : (
                               <>
                                 <span className="text-slate-500 font-mono text-xs">Mantenimiento de Red:</span>
                                 <span className="font-mono text-xs text-slate-500">Operación Descentralizada</span>
                               </>
                             )}
                          </div>
                       </div>
                    </div>
                 )}

                 {/* Step 3: Complete */}
                 {simStep === 3 && (
                    <div className="space-y-6 text-center py-4 flex-1 flex flex-col justify-center items-center text-center">
                       <CheckCircle className="text-green-400 w-16 h-16 animate-bounce mx-auto" />
                       <div className="space-y-2">
                          <h4 className="text-xl font-bold text-white">Smart Contract Ejecutado de Manera Exitosa</h4>
                          <p className="text-sm text-slate-400">Las wallets de Telegram han recibido las comisiones de manera inmediata on-chain.</p>
                       </div>

                       <div className="bg-slate-905 border border-slate-800 rounded-xl w-full max-w-md p-4">
                          <div className="flex justify-between text-xs text-slate-405 py-1">
                             <span>ID Transacción:</span>
                             <span className="font-mono text-slate-300">0x{Math.random().toString(16).substring(3, 15)}</span>
                          </div>
                          <div className="flex justify-between text-xs text-slate-405 py-1 font-semibold text-white">
                             <span>Total Pagado:</span>
                             <span>${selectedPlanValue}.00 USDT</span>
                          </div>
                          <div className="flex justify-between text-xs text-slate-500 py-1">
                             <span>Estado:</span>
                             <span className="text-green-500 font-bold">Distribución Unilevel Concluida (100%)</span>
                          </div>
                       </div>

                       <button
                         onClick={() => {
                            setShowSimModal(false);
                            setActiveTab('comisiones');
                         }}
                         className="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold rounded-lg transition-all mx-auto"
                       >
                          Ver Mis Comisiones
                       </button>
                    </div>
                 )}

                 {/* Bottom bar inside phone */}
                 <div className="border-t border-slate-900 pt-3 flex justify-between items-center text-[10px] text-slate-500 font-mono">
                    <span>STATUS: ONLINE</span>
                    <span>SECURE CONTRACT v1.0.2</span>
                 </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import { 
  PhoneCall, PhoneOutgoing, PhoneIncoming, Mic, Volume2, Play, Pause, 
  Settings, Bot, Sparkles, CheckCircle2, XCircle, AlertCircle, RefreshCw, 
  Plus, Search, UserCheck, Calendar, Clock, ArrowUpRight, Zap, ShieldCheck, 
  MessageSquareText, BarChart3, Radio, FileText, Download, Sliders, Smartphone, Check
} from 'lucide-react';

interface CallRecord {
  id: string;
  clientName: string;
  phone: string;
  type: 'Confirmación COD' | 'Carrito Abandonado' | 'Cita Agendada' | 'Reactivación';
  status: 'Completada - Confirmado' | 'Completada - Cancelado' | 'No Contestó' | 'En Curso';
  duration: string;
  date: string;
  sentiment: 'Positivo' | 'Neutro' | 'Sarcástico / Molesto';
  transcriptSnippet: string;
  audioUrl?: string;
}

interface VoiceAgent {
  id: string;
  name: string;
  language: string;
  accent: string;
  gender: 'Femenino' | 'Masculino';
  provider: 'ElevenLabs' | 'Vapi' | 'Retell AI' | 'OpenAI Realtime';
  objective: string;
  isActive: boolean;
}

export default function LlamadasView() {
  const [activeTab, setActiveTab] = useState<'simulador' | 'campanas' | 'agentes' | 'historial' | 'telefonia'>('simulador');
  
  // Call Simulator States
  const [simState, setSimState] = useState<'idle' | 'calling' | 'connected' | 'ended'>('idle');
  const [simDuration, setSimDuration] = useState<number>(0);
  const [simMessages, setSimMessages] = useState<Array<{ sender: 'bot' | 'user'; text: string; time: string }>>([
    { sender: 'bot', text: '¡Hola Carlos! Te habla Valeria de Tienda Express. Vemos un pedido de un Reloj Smartwatch por $129.900 COP para pago Contra Entrega en Medellín. ¿Nos confirmas el envío?', time: '00:02' }
  ]);
  const [simUserInput, setSimUserInput] = useState<string>('');
  const [isMuted, setIsMuted] = useState(false);

  // Voice Agents State
  const [agents, setAgents] = useState<VoiceAgent[]>([
    {
      id: 'ag_1',
      name: 'Valeria - Confirmación COD',
      language: 'Español',
      accent: 'Latam Neutro (Colombia/México)',
      gender: 'Femenino',
      provider: 'ElevenLabs',
      objective: 'Confirmar dirección y disponibilidad de dinero para envíos Contra Entrega',
      isActive: true
    },
    {
      id: 'ag_2',
      name: 'Mateo - Recobro Carritos',
      language: 'Español',
      accent: 'Latam Rioplatense / Neutro',
      gender: 'Masculino',
      provider: 'Vapi',
      objective: 'Ofrecer cupón del 10% adicional a compradores con carrito abandonado en el checkout',
      isActive: true
    }
  ]);

  // Selected Agent Config
  const [selectedAgent, setSelectedAgent] = useState<VoiceAgent>(agents[0]);
  const [speed, setSpeed] = useState<number>(1.0);
  const [pitch, setPitch] = useState<number>(1.0);
  const [customPrompt, setCustomPrompt] = useState<string>(
    'Eres una asistente virtual amigable y profesional llamada Valeria. Tu meta principal es saludar al cliente por su nombre, confirmar la dirección registrada para el despacho Contra Entrega y resolver cualquier duda sobre el tiempo de llegada (2 a 4 días hábiles).'
  );

  // Call Records State
  const [calls, setCalls] = useState<CallRecord[]>([
    {
      id: 'call_101',
      clientName: 'Carlos Mario Restrepo',
      phone: '+57 312 456 7890',
      type: 'Confirmación COD',
      status: 'Completada - Confirmado',
      duration: '0:48 min',
      date: 'Hoy, 2:15 PM',
      sentiment: 'Positivo',
      transcriptSnippet: 'Cliente: Sí, confirmo el envío. Estaré en casa mañana en la tarde. / Bot: Perfecto Carlos, tu pedido fue despachado.'
    },
    {
      id: 'call_102',
      clientName: 'Andrea Gómez',
      phone: '+52 55 9876 5432',
      type: 'Carrito Abandonado',
      status: 'Completada - Confirmado',
      duration: '1:12 min',
      date: 'Hoy, 1:40 PM',
      sentiment: 'Positivo',
      transcriptSnippet: 'Cliente: ¿Tienen pago contra entrega? / Bot: Sí Andrea, pagas al recibir en tu puerta. Te envié el link con el 10% de descuento a tu WhatsApp.'
    },
    {
      id: 'call_103',
      clientName: 'Felipe Jaramillo',
      phone: '+57 300 111 2233',
      type: 'Confirmación COD',
      status: 'Completada - Cancelado',
      duration: '0:35 min',
      date: 'Hoy, 11:20 AM',
      sentiment: 'Sarcástico / Molesto',
      transcriptSnippet: 'Cliente: No, ya compré en otra tienda, cancelen ese pedido por favor.'
    },
    {
      id: 'call_104',
      clientName: 'Mariana Silva',
      phone: '+56 9 8877 6655',
      type: 'Cita Agendada',
      status: 'No Contestó',
      duration: '0:00 min',
      date: 'Ayer, 4:50 PM',
      sentiment: 'Neutro',
      transcriptSnippet: 'Llamada enviada a buzón de voz tras 4 tonos.'
    }
  ]);

  // Handle Call Simulation start/stop
  const handleStartSimCall = () => {
    setSimState('calling');
    setTimeout(() => {
      setSimState('connected');
    }, 2000);
  };

  const handleEndSimCall = () => {
    setSimState('ended');
  };

  const handleSendSimUserResponse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!simUserInput.trim()) return;

    const userText = simUserInput.trim();
    const newMsgList = [
      ...simMessages,
      { sender: 'user' as const, text: userText, time: '00:' + (simMessages.length * 8 < 10 ? '0' : '') + simMessages.length * 8 }
    ];
    setSimMessages(newMsgList);
    setSimUserInput('');

    // Simulated Bot AI Voice Response
    setTimeout(() => {
      let botAnswer = '¡Excelente! He registrado tus indicaciones. Tu número de guía de envío te llegará por WhatsApp tan pronto la transportadora recoja el paquete.';
      if (userText.toLowerCase().includes('cancelar') || userText.toLowerCase().includes('no')) {
        botAnswer = 'Entiendo perfectamente. He cancelado la orden en nuestro sistema. ¡Muchas gracias por avisarnos!';
      } else if (userText.toLowerCase().includes('cambiar') || userText.toLowerCase().includes('dirección')) {
        botAnswer = 'Entendido, tomé nota del cambio de dirección. ¿El pago seguirá siendo de $129.900 COP en efectivo?';
      }

      setSimMessages([
        ...newMsgList,
        { sender: 'bot' as const, text: botAnswer, time: '00:' + ((newMsgList.length + 1) * 8) }
      ]);
    }, 1500);
  };

  return (
    <div className="p-4 sm:p-6 bg-[#0c0c0e] text-white min-h-screen space-y-6">
      
      {/* Top Banner & Title */}
      <div className="bg-gradient-to-r from-indigo-950 via-[#121216] to-purple-950 border border-indigo-800/40 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 border border-indigo-500/30 rounded-full text-indigo-300 text-xs font-bold uppercase tracking-wider">
            <Radio size={14} className="animate-pulse text-emerald-400" /> Agente Telefónico de Voz IA 24/7
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Módulo de Llamadas Inteligentes
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 max-w-2xl">
            Automatiza la confirmación de pedidos Contra Entrega (COD), recuperación de carritos por voz y agendamiento con agentes que hablan con voz humana hiperrealista.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button 
            onClick={() => setActiveTab('simulador')}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs transition-colors flex items-center gap-2 shadow-lg shadow-indigo-950"
          >
            <PhoneCall size={16} /> Probar Simulador de Voz
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-[#121215] border border-gray-800 rounded-2xl p-4 space-y-1">
          <span className="text-xs text-gray-400 font-medium flex items-center justify-between">
            Llamadas Realizadas <PhoneOutgoing size={16} className="text-indigo-400" />
          </span>
          <p className="text-2xl font-black text-white">1,428</p>
          <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
            <ArrowUpRight size={12} /> +18.4% este mes
          </span>
        </div>

        <div className="bg-[#121215] border border-gray-800 rounded-2xl p-4 space-y-1">
          <span className="text-xs text-gray-400 font-medium flex items-center justify-between">
            Tasa de Confirmación COD <CheckCircle2 size={16} className="text-emerald-400" />
          </span>
          <p className="text-2xl font-black text-emerald-400">88.5%</p>
          <span className="text-[11px] text-gray-400">Reducción de devoluciones en 32%</span>
        </div>

        <div className="bg-[#121215] border border-gray-800 rounded-2xl p-4 space-y-1">
          <span className="text-xs text-gray-400 font-medium flex items-center justify-between">
            Duración Promedio <Clock size={16} className="text-purple-400" />
          </span>
          <p className="text-2xl font-black text-white">0:52 min</p>
          <span className="text-[11px] text-gray-400">Optimizado para ahorro de minutos</span>
        </div>

        <div className="bg-[#121215] border border-gray-800 rounded-2xl p-4 space-y-1">
          <span className="text-xs text-gray-400 font-medium flex items-center justify-between">
            Costo Ahorrado en Call Center <Zap size={16} className="text-amber-400" />
          </span>
          <p className="text-2xl font-black text-amber-400">$1,850 USD</p>
          <span className="text-[11px] text-gray-400">Equivalente a 3 operadores full-time</span>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex space-x-2 border-b border-gray-800 pb-1 overflow-x-auto no-scrollbar">
        {[
          { id: 'simulador', label: '📞 Simulador de Llamada en Vivo', icon: PhoneCall },
          { id: 'agentes', label: '🤖 Agentes & Entrenamiento de Voz', icon: Bot },
          { id: 'campanas', label: '🚀 Campañas de Confirmación COD', icon: Zap },
          { id: 'historial', label: '📊 Historial & Transcripciones', icon: FileText },
          { id: 'telefonia', label: '⚙️ Conexión de Telefonía / Twilio', icon: Settings }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2.5 px-4 rounded-xl font-bold text-xs flex items-center gap-2 transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950'
                  : 'bg-[#141418] text-gray-400 hover:text-white border border-gray-800'
              }`}
            >
              <Icon size={15} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: SIMULADOR DE LLAMADA EN VIVO */}
      {activeTab === 'simulador' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Phone Screen Mockup */}
          <div className="bg-[#121215] border border-gray-800 rounded-3xl p-6 shadow-2xl flex flex-col items-center justify-between min-h-[520px] relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute -top-20 -left-20 w-48 h-48 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

            {/* Top Phone Info */}
            <div className="text-center space-y-2 z-10 w-full pt-4">
              <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 p-1 shadow-xl shadow-indigo-950/60 flex items-center justify-center">
                <Bot size={40} className="text-white" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white">{selectedAgent.name}</h3>
                <p className="text-xs text-indigo-400 font-semibold">{selectedAgent.accent}</p>
              </div>

              {/* Status Indicator */}
              <div className="pt-2">
                {simState === 'idle' && (
                  <span className="px-3 py-1 bg-gray-800 text-gray-300 rounded-full text-xs font-bold">
                    Listo para llamar
                  </span>
                )}
                {simState === 'calling' && (
                  <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full text-xs font-bold animate-pulse">
                    Marcando al cliente...
                  </span>
                )}
                {simState === 'connected' && (
                  <div className="flex items-center justify-center gap-2">
                    <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
                    <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-xs font-bold">
                      Llamada en Vivo • 0:24 min
                    </span>
                  </div>
                )}
                {simState === 'ended' && (
                  <span className="px-3 py-1 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-full text-xs font-bold">
                    Llamada Finalizada
                  </span>
                )}
              </div>
            </div>

            {/* Audio Waveform Graphic */}
            <div className="w-full py-8 flex items-center justify-center gap-1.5 z-10">
              {[40, 65, 25, 90, 45, 80, 30, 100, 50, 70, 35, 85].map((h, i) => (
                <div 
                  key={i} 
                  style={{ height: simState === 'connected' ? `${h}%` : '8px' }} 
                  className={`w-1.5 rounded-full transition-all duration-300 ${
                    simState === 'connected' ? 'bg-indigo-500 animate-pulse' : 'bg-gray-800'
                  }`}
                />
              ))}
            </div>

            {/* Phone Call Controls */}
            <div className="w-full z-10 pb-2">
              {simState === 'idle' && (
                <button 
                  onClick={handleStartSimCall}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold text-sm shadow-xl shadow-emerald-950 flex items-center justify-center gap-2 transition-transform active:scale-95"
                >
                  <PhoneCall size={18} /> Iniciar Llamada de Prueba
                </button>
              )}

              {simState === 'calling' && (
                <button 
                  onClick={handleEndSimCall}
                  className="w-full py-3.5 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl font-bold text-sm shadow-xl flex items-center justify-center gap-2"
                >
                  <XCircle size={18} /> Cancelar Marcación
                </button>
              )}

              {simState === 'connected' && (
                <div className="flex items-center justify-center gap-4">
                  <button 
                    onClick={() => setIsMuted(!isMuted)}
                    className={`p-4 rounded-full border transition-all ${
                      isMuted ? 'bg-amber-600 text-white border-amber-500' : 'bg-gray-800 text-gray-300 border-gray-700'
                    }`}
                  >
                    <Mic size={20} />
                  </button>

                  <button 
                    onClick={handleEndSimCall}
                    className="p-5 bg-rose-600 hover:bg-rose-500 text-white rounded-full shadow-xl shadow-rose-950 transition-transform active:scale-95"
                  >
                    <PhoneIncoming size={24} className="rotate-[135deg]" />
                  </button>
                </div>
              )}

              {simState === 'ended' && (
                <button 
                  onClick={() => { setSimState('idle'); setSimMessages([]); }}
                  className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2"
                >
                  <RefreshCw size={15} /> Reiniciar Prueba
                </button>
              )}
            </div>

          </div>

          {/* Real-time Transcription & Audio Log */}
          <div className="lg:col-span-2 bg-[#121215] border border-gray-800 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-gray-800">
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <MessageSquareText size={18} className="text-indigo-400" /> Transcripción en Tiempo Real (IA Voice Log)
                </h3>
                <span className="text-xs text-gray-400 bg-gray-800 px-2.5 py-1 rounded-md">
                  Latencia: <strong className="text-emerald-400">320ms</strong>
                </span>
              </div>

              {/* Chat-like Transcript Feed */}
              <div className="mt-4 space-y-3 max-h-[340px] overflow-y-auto pr-1 no-scrollbar">
                {simMessages.map((msg, index) => (
                  <div 
                    key={index} 
                    className={`flex items-start gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                      msg.sender === 'bot' ? 'bg-indigo-600 text-white' : 'bg-purple-600 text-white'
                    }`}>
                      {msg.sender === 'bot' ? <Bot size={16} /> : 'Tú'}
                    </div>

                    <div className={`max-w-[80%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                      msg.sender === 'bot' 
                        ? 'bg-[#18181d] text-gray-200 border border-gray-800' 
                        : 'bg-indigo-600 text-white'
                    }`}>
                      <p>{msg.text}</p>
                      <span className="text-[10px] opacity-60 block text-right mt-1 font-mono">{msg.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Text Input Simulation for testing AI voice responses */}
            <form onSubmit={handleSendSimUserResponse} className="pt-2 border-t border-gray-800 flex gap-2">
              <input 
                type="text"
                disabled={simState !== 'connected'}
                value={simUserInput}
                onChange={(e) => setSimUserInput(e.target.value)}
                placeholder={simState === 'connected' ? "Responde como si fueras el cliente (ej: Sí confirmo mi dirección...)" : "Conecta la llamada para simular voz..."}
                className="flex-1 px-4 py-2.5 bg-[#18181c] border border-gray-700/80 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
              />
              <button 
                type="submit"
                disabled={simState !== 'connected'}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold disabled:opacity-50 transition-colors shadow-md shadow-indigo-950"
              >
                Responder
              </button>
            </form>
          </div>

        </div>
      )}

      {/* TAB 2: AGENTES & ENTRENAMIENTO DE VOZ */}
      {activeTab === 'agentes' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Agent Selection List */}
          <div className="bg-[#121215] border border-gray-800 rounded-3xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-sm">Tus Agentes de Voz</h3>
              <button className="p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1">
                <Plus size={14} /> Nuevo
              </button>
            </div>

            <div className="space-y-3">
              {agents.map(ag => (
                <div 
                  key={ag.id}
                  onClick={() => setSelectedAgent(ag)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    selectedAgent.id === ag.id 
                      ? 'bg-indigo-950/40 border-indigo-500' 
                      : 'bg-[#18181c] border-gray-800 hover:border-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-bold text-white text-sm">{ag.name}</h4>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded-full">
                      {ag.provider}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 line-clamp-2">{ag.objective}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Agent Fine-Tuning Settings */}
          <div className="lg:col-span-2 bg-[#121215] border border-gray-800 rounded-3xl p-6 space-y-5">
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Sliders size={18} className="text-indigo-400" /> Ajustes del Agente: {selectedAgent.name}
              </h3>
              <p className="text-xs text-gray-400">Personaliza el todo, acento y las instrucciones clave para la llamada.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Proveedor de Voz Neural</label>
                <select className="w-full px-3.5 py-2.5 bg-[#18181c] border border-gray-700/80 rounded-xl text-xs text-white">
                  <option>ElevenLabs Ultra-Realist</option>
                  <option>Vapi AI (Low Latency)</option>
                  <option>Retell AI Custom</option>
                  <option>OpenAI Realtime Voice API</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Acento & Tono Regional</label>
                <select className="w-full px-3.5 py-2.5 bg-[#18181c] border border-gray-700/80 rounded-xl text-xs text-white">
                  <option>Latinoamérica Neutro (Colombia / México)</option>
                  <option>Español Rioplatense (Argentina / Uruguay)</option>
                  <option>Español España (Castellano)</option>
                  <option>Inglés US Commercial</option>
                </select>
              </div>
            </div>

            {/* Sliders Speed & Pitch */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-gray-300 font-bold">
                  <span>Velocidad de Habla</span>
                  <span>{speed}x</span>
                </div>
                <input 
                  type="range" 
                  min="0.8" 
                  max="1.3" 
                  step="0.05" 
                  value={speed}
                  onChange={(e) => setSpeed(parseFloat(e.target.value))}
                  className="w-full accent-indigo-500" 
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs text-gray-300 font-bold">
                  <span>Tono / Tono Vocal</span>
                  <span>{pitch}x</span>
                </div>
                <input 
                  type="range" 
                  min="0.8" 
                  max="1.2" 
                  step="0.05" 
                  value={pitch}
                  onChange={(e) => setPitch(parseFloat(e.target.value))}
                  className="w-full accent-indigo-500" 
                />
              </div>
            </div>

            {/* System Prompt for the Voice Agent */}
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">Prompt / Instrucciones Base para la IA</label>
              <textarea 
                rows={4}
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#18181c] border border-gray-700/80 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 leading-relaxed font-mono"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-950">
                Guardar Cambios del Agente
              </button>
            </div>
          </div>

        </div>
      )}

      {/* TAB 3: CAMPAÑAS DE CONFIRMACIÓN COD */}
      {activeTab === 'campanas' && (
        <div className="space-y-6">
          <div className="bg-[#121215] border border-gray-800 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-base">Campañas de Llamadas Automatizadas</h3>
                <p className="text-xs text-gray-400">Configura triggers automáticos cuando un pedido se crea en Shopify, WooCommerce o Dropi.</p>
              </div>
              <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5">
                <Plus size={16} /> Crear Campaña
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              
              <div className="bg-[#18181c] border border-gray-800 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Activa • Auto Trigger
                  </span>
                  <Bot size={18} className="text-indigo-400" />
                </div>
                <h4 className="font-bold text-white text-base">Confirmación COD Inmediata</h4>
                <p className="text-xs text-gray-400">Llama automáticamente 5 minutos después de recibir un pedido con método 'Pago Contra Entrega'.</p>
                <div className="pt-2 border-t border-gray-800/80 flex items-center justify-between text-xs">
                  <span className="text-gray-400">Llamadas realizadas: <strong>890</strong></span>
                  <span className="text-emerald-400 font-bold">92% Éxito</span>
                </div>
              </div>

              <div className="bg-[#18181c] border border-gray-800 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Activa • 15 min delay
                  </span>
                  <Zap size={18} className="text-amber-400" />
                </div>
                <h4 className="font-bold text-white text-base">Recuperación de Carritos Abandonados</h4>
                <p className="text-xs text-gray-400">Llama a compradores que dejaron datos en el checkout pero no completaron la orden.</p>
                <div className="pt-2 border-t border-gray-800/80 flex items-center justify-between text-xs">
                  <span className="text-gray-400">Llamadas realizadas: <strong>340</strong></span>
                  <span className="text-emerald-400 font-bold">24% Recuperados</span>
                </div>
              </div>

              <div className="bg-[#18181c] border border-gray-800 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-md bg-gray-700 text-gray-300">
                    Pausada
                  </span>
                  <Calendar size={18} className="text-purple-400" />
                </div>
                <h4 className="font-bold text-white text-base">Re-agendamiento de Pedidos Rechazados</h4>
                <p className="text-xs text-gray-400">Llama cuando la transportadora reporta 'Dirección Errónea' para coordinar entrega.</p>
                <div className="pt-2 border-t border-gray-800/80 flex items-center justify-between text-xs">
                  <span className="text-gray-400">Llamadas realizadas: <strong>198</strong></span>
                  <span className="text-indigo-400 font-bold">68% Reagendados</span>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* TAB 4: HISTORIAL DE LLAMADAS */}
      {activeTab === 'historial' && (
        <div className="bg-[#121215] border border-gray-800 rounded-3xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <h3 className="font-bold text-white text-base">Registro & Transcripciones de Llamadas</h3>
            <div className="relative w-full sm:w-64">
              <Search size={16} className="absolute left-3 top-2.5 text-gray-500" />
              <input 
                type="text"
                placeholder="Buscar por cliente o teléfono..."
                className="w-full pl-9 pr-3 py-1.5 bg-[#18181c] border border-gray-700/80 rounded-xl text-xs text-white focus:outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-300">
              <thead className="bg-[#18181c] text-gray-400 font-bold uppercase text-[10px] border-b border-gray-800">
                <tr>
                  <th className="py-3 px-4">Cliente / Teléfono</th>
                  <th className="py-3 px-4">Campaña</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4">Duración</th>
                  <th className="py-3 px-4">Sentimiento</th>
                  <th className="py-3 px-4">Resumen / Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {calls.map(c => (
                  <tr key={c.id} className="hover:bg-[#18181c]/60">
                    <td className="py-3 px-4">
                      <strong className="text-white block">{c.clientName}</strong>
                      <span className="text-[11px] text-gray-500 font-mono">{c.phone}</span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-indigo-300">{c.type}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        c.status.includes('Confirmado') 
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                          : c.status.includes('Cancelado') 
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-gray-400">{c.duration}</td>
                    <td className="py-3 px-4">
                      <span className="text-[11px] text-gray-300">{c.sentiment}</span>
                    </td>
                    <td className="py-3 px-4">
                      <button 
                        onClick={() => alert(`Transcripción completa:\n\n${c.transcriptSnippet}`)}
                        className="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1"
                      >
                        <FileText size={12} /> Ver Transcripción
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: TELEFONÍA & INTEGRACIONES */}
      {activeTab === 'telefonia' && (
        <div className="bg-[#121215] border border-gray-800 rounded-3xl p-6 space-y-5">
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <Settings size={18} className="text-indigo-400" /> Configuración de SIP & Números Virtuales
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#18181c] border border-gray-800 rounded-2xl p-5 space-y-2">
              <span className="text-xs text-gray-400 font-bold uppercase">Número Virtual Asignado</span>
              <p className="text-xl font-mono text-emerald-400 font-bold">+57 (601) 987-6543</p>
              <p className="text-xs text-gray-400">Asignado con identificador de llamadas oficial (Caller ID habilitado).</p>
            </div>

            <div className="bg-[#18181c] border border-gray-800 rounded-2xl p-5 space-y-2">
              <span className="text-xs text-gray-400 font-bold uppercase">Estado de la Integración Vapi / Twilio</span>
              <p className="text-xl font-bold text-white flex items-center gap-2">
                <CheckCircle2 size={20} className="text-emerald-400" /> Conectado & Operativo
              </p>
              <p className="text-xs text-gray-400">Crédito restante: <strong>$142.50 USD</strong> (Aproximadamente 3,500 minutos).</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

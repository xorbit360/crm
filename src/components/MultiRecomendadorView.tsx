import React, { useState, useEffect } from 'react';
import {
  Bot,
  Sparkles,
  Sliders,
  Settings,
  Save,
  Play,
  Eye,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Plus,
  Terminal,
  RefreshCw,
  Layers,
  Database,
  Link,
  Search,
  ArrowRight,
  HelpCircle,
  Package,
  ShoppingCart,
  Check
} from 'lucide-react';

export interface MultiRecommenderQuestion {
  id: string;
  text: string;
  options: {
    id: string;
    text: string;
  }[];
}

export interface MultiRecommenderRule {
  id: string;
  conditions: { [questionId: string]: string }; // questionId -> optionId
  recommendProductId: string;
}

export interface MultiRecommender {
  id: string;
  name: string;
  keyword: string;
  description: string;
  questions: MultiRecommenderQuestion[];
  rules: MultiRecommenderRule[];
  queryType: 'internal' | 'external_api';
  externalPlatform?: 'mastershop' | 'shopify' | 'kommo' | 'respond_io' | 'ghl' | 'effix';
  apiToken?: string;
  apiEndpoint?: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  description: string;
  category: string;
  image?: string;
  matchReason?: string;
}

export default function MultiRecomendadorView() {
  const [recommenders, setRecommenders] = useState<MultiRecommender[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [products, setProducts] = useState<Product[]>([]);

  // Tab within recommender settings
  const [settingsTab, setSettingsTab] = useState<'questions' | 'rules' | 'api'>('questions');

  // Form and active state values
  const [activeRecommender, setActiveRecommender] = useState<MultiRecommender | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // API Testing Simulation States
  const [apiTesting, setApiTesting] = useState(false);
  const [apiTestLogs, setApiTestLogs] = useState<{ type: 'sent' | 'received' | 'info'; text: string }[]>([]);
  const [apiSuccess, setApiSuccess] = useState<boolean | null>(null);

  // Initialize and load default data if needed
  useEffect(() => {
    // 1. Ensure we have the standard or additional products
    let storedProds = localStorage.getItem('crm_products');
    let parsedProds: Product[] = [];
    if (storedProds) {
      try {
        parsedProds = JSON.parse(storedProds);
      } catch (e) {
        parsedProds = getDefaultProducts();
      }
    } else {
      parsedProds = getDefaultProducts();
    }

    // Add Shampoo specific products if they don't exist
    const hasShampoo = parsedProds.some(p => p.name.toLowerCase().includes('shampoo') || p.name.toLowerCase().includes('champú'));
    if (!hasShampoo) {
      const extraShampoos = [
        {
          id: "PROD-SH-01",
          name: "Shampoo de Romero & Coco (Rubio & Volumen)",
          price: 45000,
          stock: 120,
          category: "Belleza",
          description: "Fórmula orgánica ultra-nutritiva para cabellos claros y delgados. Aporta volumen y brillo natural.",
          matchReason: "Recomendado para cabellos claros y finos que necesitan volumen y revitalización orgánica."
        },
        {
          id: "PROD-SH-02",
          name: "Shampoo de Ortiga & Árbol de Té (Control Grasa)",
          price: 42000,
          stock: 85,
          category: "Belleza",
          description: "Tratamiento sebo-regulador profundo para cueros cabelludos grasos. Purifica y fortalece desde la raíz.",
          matchReason: "Recomendado para regular la grasa en el cuero cabelludo graso manteniendo hidratada la fibra capilar."
        },
        {
          id: "PROD-SH-03",
          name: "Shampoo de Argán & Keratina (Nutrición Extrema)",
          price: 48000,
          stock: 64,
          category: "Belleza",
          description: "Reparación intensiva para cabellos gruesos, secos o maltratados. Hidratación premium con sellado de cutícula.",
          matchReason: "La mejor opción para cabellos gruesos y secos que buscan reparación profunda y control del frizz."
        }
      ];
      parsedProds = [...parsedProds, ...extraShampoos];
      localStorage.setItem('crm_products', JSON.stringify(parsedProds));
    }
    setProducts(parsedProds);

    // 2. Load Multi-Recommenders from local storage or initialize default
    const storedRecs = localStorage.getItem('crm_multi_recommenders');
    let parsedRecs: MultiRecommender[] = [];
    if (storedRecs) {
      try {
        parsedRecs = JSON.parse(storedRecs);
      } catch (e) {
        parsedRecs = getDefaultRecommenders();
      }
    } else {
      parsedRecs = getDefaultRecommenders();
    }

    setRecommenders(parsedRecs);
    if (parsedRecs.length > 0) {
      setSelectedId(parsedRecs[0].id);
      setActiveRecommender(JSON.parse(JSON.stringify(parsedRecs[0]))); // deep copy for editing
    }
  }, []);

  const getDefaultProducts = (): Product[] => {
    return [
      {
        id: "PROD-001",
        name: "Smartwatch Ultra X8",
        price: 120000,
        stock: 45,
        category: "Tecnología",
        description: "Reloj inteligente de última generación con sensor de ritmo cardíaco, notificaciones de WhatsApp, modo de deporte y batería de 5 días."
      },
      {
        id: "PROD-002",
        name: "Auriculares Pro 4",
        price: 190000,
        stock: 28,
        category: "Audio",
        description: "Auriculares inalámbricos con cancelación de ruido activa, sonido estéreo de alta fidelidad, estuche de carga rápida y micrófono integrado."
      }
    ];
  };

  const getDefaultRecommenders = (): MultiRecommender[] => {
    return [
      {
        id: "REC-001",
        name: "Asesor Capilar Inteligente (Champú)",
        keyword: "champú",
        description: "Recomienda la variante de champú óptima según color, grosor capilar y tipo de cuero cabelludo.",
        queryType: "internal",
        questions: [
          {
            id: "Q-1",
            text: "¿De qué color es tu cabello?",
            options: [
              { id: "OPT-1", text: "Rubio / Claro / Decolorado" },
              { id: "OPT-2", text: "Oscuro / Castaño / Negro" },
              { id: "OPT-3", text: "Rojo / Pelirrojo / Tinturado" }
            ]
          },
          {
            id: "Q-2",
            text: "¿Cuál es el grosor o espesor de tu hebra capilar?",
            options: [
              { id: "OPT-4", text: "Fino / Delgado / Poco Volumen" },
              { id: "OPT-5", text: "Grueso / Abundante" }
            ]
          },
          {
            id: "Q-3",
            text: "¿Cómo clasificarías tu tipo de cuero cabelludo?",
            options: [
              { id: "OPT-6", text: "Graso (requiere lavado diario)" },
              { id: "OPT-7", text: "Seco / Sensible (tiende a picar)" },
              { id: "OPT-8", text: "Normal / Mixto" }
            ]
          }
        ],
        rules: [
          {
            id: "RULE-1",
            conditions: { "Q-1": "OPT-1", "Q-2": "OPT-4" },
            recommendProductId: "PROD-SH-01" // Rubio & volumen
          },
          {
            id: "RULE-2",
            conditions: { "Q-3": "OPT-6" },
            recommendProductId: "PROD-SH-02" // Control grasa
          },
          {
            id: "RULE-3",
            conditions: { "Q-2": "OPT-5", "Q-3": "OPT-7" },
            recommendProductId: "PROD-SH-03" // Nutricion extrema
          }
        ]
      },
      {
        id: "REC-002",
        name: "Asistente de Tecnología y Sonido",
        keyword: "audífonos",
        description: "Pregunta al cliente sus hábitos de uso diario para sugerir audífonos o smartwatches ideales de AliExpress/Shopify.",
        queryType: "external_api",
        externalPlatform: "shopify",
        apiToken: "shpat_98a76bc3d1209ef4c89281aef0a9911",
        apiEndpoint: "https://mi-tienda-shopify.myshopify.com/admin/api/2026-04/products.json",
        questions: [
          {
            id: "Q-T1",
            text: "¿Cuál es tu principal necesidad de audio o dispositivo?",
            options: [
              { id: "OPT-T1", text: "Aislarme del ruido en trabajo o viajes" },
              { id: "OPT-T2", text: "Monitorear mi deporte y notificaciones de salud" }
            ]
          }
        ],
        rules: [
          {
            id: "RULE-T1",
            conditions: { "Q-T1": "OPT-T1" },
            recommendProductId: "PROD-002"
          },
          {
            id: "RULE-T2",
            conditions: { "Q-T1": "OPT-T2" },
            recommendProductId: "PROD-001"
          }
        ]
      }
    ];
  };

  const saveToStorage = (updatedList: MultiRecommender[]) => {
    localStorage.setItem('crm_multi_recommenders', JSON.stringify(updatedList));
    setRecommenders(updatedList);
  };

  const handleSelectRecommender = (id: string) => {
    setSelectedId(id);
    const found = recommenders.find(r => r.id === id);
    if (found) {
      setActiveRecommender(JSON.parse(JSON.stringify(found)));
    }
  };

  const handleCreateNew = () => {
    const newRec: MultiRecommender = {
      id: `REC-${Date.now()}`,
      name: "Nuevo Multi-Recomendador IA",
      keyword: "clave",
      description: "Define preguntas interconectadas para personalizar sugerencias del catálogo.",
      queryType: "internal",
      questions: [
        {
          id: `Q-${Date.now()}-1`,
          text: "¿Pregunta de ejemplo 1?",
          options: [
            { id: `OPT-${Date.now()}-1`, text: "Opción A" },
            { id: `OPT-${Date.now()}-2`, text: "Opción B" }
          ]
        }
      ],
      rules: []
    };
    const updated = [...recommenders, newRec];
    saveToStorage(updated);
    setSelectedId(newRec.id);
    setActiveRecommender(newRec);
    alert("Nuevo recomendador creado. Configura sus preguntas y reglas abajo.");
  };

  const handleDeleteRecommender = (id: string) => {
    if (recommenders.length <= 1) {
      alert("Debes mantener al menos un recomendador configurado en la plataforma.");
      return;
    }
    if (confirm("¿Estás seguro de eliminar este recomendador?")) {
      const filtered = recommenders.filter(r => r.id !== id);
      saveToStorage(filtered);
      setSelectedId(filtered[0].id);
      setActiveRecommender(JSON.parse(JSON.stringify(filtered[0])));
    }
  };

  const handleSaveActiveConfig = () => {
    if (!activeRecommender) return;
    setSaveStatus('saving');

    setTimeout(() => {
      const index = recommenders.findIndex(r => r.id === activeRecommender.id);
      let updated = [...recommenders];
      if (index !== -1) {
        updated[index] = activeRecommender;
      } else {
        updated.push(activeRecommender);
      }
      saveToStorage(updated);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 800);
  };

  // Questions Editor helpers
  const handleUpdateRecommenderName = (val: string) => {
    if (!activeRecommender) return;
    setActiveRecommender({ ...activeRecommender, name: val });
  };

  const handleUpdateRecommenderKeyword = (val: string) => {
    if (!activeRecommender) return;
    setActiveRecommender({ ...activeRecommender, keyword: val.toLowerCase().trim() });
  };

  const handleUpdateRecommenderDesc = (val: string) => {
    if (!activeRecommender) return;
    setActiveRecommender({ ...activeRecommender, description: val });
  };

  const handleUpdateQueryType = (val: 'internal' | 'external_api') => {
    if (!activeRecommender) return;
    setActiveRecommender({ ...activeRecommender, queryType: val });
  };

  const handleUpdateExternalPlatform = (val: MultiRecommender['externalPlatform']) => {
    if (!activeRecommender) return;
    setActiveRecommender({ ...activeRecommender, externalPlatform: val });
  };

  const handleUpdateApiToken = (val: string) => {
    if (!activeRecommender) return;
    setActiveRecommender({ ...activeRecommender, apiToken: val });
  };

  const handleUpdateApiEndpoint = (val: string) => {
    if (!activeRecommender) return;
    setActiveRecommender({ ...activeRecommender, apiEndpoint: val });
  };

  // Add Question
  const handleAddQuestion = () => {
    if (!activeRecommender) return;
    const qId = `Q-${Date.now()}`;
    const newQ: MultiRecommenderQuestion = {
      id: qId,
      text: "Nueva pregunta para el usuario...",
      options: [
        { id: `OPT-${Date.now()}-1`, text: "Opción de respuesta 1" },
        { id: `OPT-${Date.now()}-2`, text: "Opción de respuesta 2" }
      ]
    };
    setActiveRecommender({
      ...activeRecommender,
      questions: [...activeRecommender.questions, newQ]
    });
  };

  const handleRemoveQuestion = (qId: string) => {
    if (!activeRecommender) return;
    setActiveRecommender({
      ...activeRecommender,
      questions: activeRecommender.questions.filter(q => q.id !== qId),
      // Clean up rules that depend on this question
      rules: activeRecommender.rules.map(rule => {
        const cleanedConditions = { ...rule.conditions };
        delete cleanedConditions[qId];
        return { ...rule, conditions: cleanedConditions };
      })
    });
  };

  const handleUpdateQuestionText = (qId: string, text: string) => {
    if (!activeRecommender) return;
    setActiveRecommender({
      ...activeRecommender,
      questions: activeRecommender.questions.map(q => q.id === qId ? { ...q, text } : q)
    });
  };

  // Option actions
  const handleAddOption = (qId: string) => {
    if (!activeRecommender) return;
    const optId = `OPT-${Date.now()}`;
    setActiveRecommender({
      ...activeRecommender,
      questions: activeRecommender.questions.map(q => {
        if (q.id === qId) {
          return {
            ...q,
            options: [...q.options, { id: optId, text: "Nueva opción..." }]
          };
        }
        return q;
      })
    });
  };

  const handleRemoveOption = (qId: string, optId: string) => {
    if (!activeRecommender) return;
    setActiveRecommender({
      ...activeRecommender,
      questions: activeRecommender.questions.map(q => {
        if (q.id === qId) {
          return {
            ...q,
            options: q.options.filter(o => o.id !== optId)
          };
        }
        return q;
      }),
      // Remove conditions pointing to this option
      rules: activeRecommender.rules.map(rule => {
        if (rule.conditions[qId] === optId) {
          const cleaned = { ...rule.conditions };
          delete cleaned[qId];
          return { ...rule, conditions: cleaned };
        }
        return rule;
      })
    });
  };

  const handleUpdateOptionText = (qId: string, optId: string, text: string) => {
    if (!activeRecommender) return;
    setActiveRecommender({
      ...activeRecommender,
      questions: activeRecommender.questions.map(q => {
        if (q.id === qId) {
          return {
            ...q,
            options: q.options.map(o => o.id === optId ? { ...o, text } : o)
          };
        }
        return q;
      })
    });
  };

  // Rules Editor Actions
  const handleAddRule = () => {
    if (!activeRecommender) return;
    const newRule: MultiRecommenderRule = {
      id: `RULE-${Date.now()}`,
      conditions: {},
      recommendProductId: products[0]?.id || ''
    };
    setActiveRecommender({
      ...activeRecommender,
      rules: [...activeRecommender.rules, newRule]
    });
  };

  const handleRemoveRule = (ruleId: string) => {
    if (!activeRecommender) return;
    setActiveRecommender({
      ...activeRecommender,
      rules: activeRecommender.rules.filter(r => r.id !== ruleId)
    });
  };

  const handleUpdateRuleCondition = (ruleId: string, qId: string, optId: string) => {
    if (!activeRecommender) return;
    setActiveRecommender({
      ...activeRecommender,
      rules: activeRecommender.rules.map(r => {
        if (r.id === ruleId) {
          const updatedConditions = { ...r.conditions };
          if (optId === "") {
            delete updatedConditions[qId];
          } else {
            updatedConditions[qId] = optId;
          }
          return { ...r, conditions: updatedConditions };
        }
        return r;
      })
    });
  };

  const handleUpdateRuleProduct = (ruleId: string, prodId: string) => {
    if (!activeRecommender) return;
    setActiveRecommender({
      ...activeRecommender,
      rules: activeRecommender.rules.map(r => r.id === ruleId ? { ...r, recommendProductId: prodId } : r)
    });
  };

  // Test API Token / Connection Simulation
  const handleTestAPIConnection = () => {
    if (!activeRecommender) return;
    setApiTesting(true);
    setApiSuccess(null);

    const platform = activeRecommender.externalPlatform || 'mastershop';
    const endpoint = activeRecommender.apiEndpoint || `https://api.${platform}.com/v1/catalog`;
    const token = activeRecommender.apiToken || 'N/A';

    setApiTestLogs([
      { type: 'info', text: `Iniciando consulta de diagnóstico a través del túnel MCP...` },
      { type: 'sent', text: `GET ${endpoint}` },
      { type: 'sent', text: `Headers: {\n  "Authorization": "Bearer ${token.substring(0, 10)}...",\n  "Content-Type": "application/json",\n  "X-Integration-Source": "Xorbit 360-MCP-Hub"\n}` }
    ]);

    setTimeout(() => {
      setApiTestLogs(prev => [
        ...prev,
        { type: 'info', text: `Enrutando solicitud mediante pasarela de tokens externa...` },
        { type: 'info', text: `Conectando con el servidor de ${platform.toUpperCase()}...` }
      ]);
    }, 600);

    setTimeout(() => {
      if (!activeRecommender.apiToken || activeRecommender.apiToken.length < 5) {
        setApiTestLogs(prev => [
          ...prev,
          { type: 'received', text: `HTTP/1.1 401 Unauthorized\nContent-Type: application/json\n\n{\n  "error": "invalid_token",\n  "message": "El Token de acceso MCP / API ingresado es inválido o ha expirado."\n}` }
        ]);
        setApiSuccess(false);
        setApiTesting(false);
      } else {
        // Success payload matching the selected platform
        const mockProducts = platform === 'shopify'
          ? [
              { title: "Shampoo Anticaída Cafeína Orgánica", price: "48000", inventory: 240 },
              { title: "Suero Revitalizador Capilar Pro", price: "55000", inventory: 110 }
            ]
          : [
              { name: "Shampoo Efecto Liso Perfecto (Mastershop)", price: "46000", stock: 150 },
              { name: "Tratamiento Reparación Extrema", price: "49000", stock: 80 }
            ];

        setApiTestLogs(prev => [
          ...prev,
          { type: 'received', text: `HTTP/1.1 200 OK\nContent-Type: application/json\n\n{\n  "status": "success",\n  "integration": "${platform}",\n  "synchronized_at": "${new Date().toISOString()}",\n  "products_count": ${mockProducts.length},\n  "items": ${JSON.stringify(mockProducts, null, 2)}\n}` },
          { type: 'info', text: `✅ ¡Conectado con éxito! El bot de WhatsApp tiene acceso inmediato a consultar el stock en tiempo real.` }
        ]);
        setApiSuccess(true);
        setApiTesting(false);
      }
    }, 1500);
  };

  return (
    <div className="space-y-6 animate-fade-in text-gray-200">

      {/* Intro block */}
      <div className="panel p-6 rounded-2xl bg-gradient-to-r from-orange-500/10 to-transparent border border-orange-500/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-400 border border-orange-500/30">
            <Bot size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Multi-Recomendador de Productos Capas (IA & MCP)</h3>
            <p className="text-xs text-gray-400 mt-1 leading-relaxed">
              Define una lógica secuencial de preguntas interconectadas (color, grosor, textura) para que el chatbot asesore al cliente y sugiera el producto ideal del catálogo, con opción de sincronizar inventario mediante Tokens/MCP con plataformas externas como MasterShop, Shopify o Kommo.
            </p>
          </div>
        </div>
      </div>

      {/* Main Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Column - Recommender Selector */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sliders size={14} className="text-orange-500" /> Mis Recomendadores
            </h4>
            <button
              onClick={handleCreateNew}
              className="px-2 py-1 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/30 rounded text-[10px] font-bold text-orange-400 transition flex items-center gap-1"
            >
              <Plus size={10} /> Nuevo
            </button>
          </div>

          <div className="space-y-2.5">
            {recommenders.map(rec => {
              const isSelected = selectedId === rec.id;
              return (
                <div
                  key={rec.id}
                  onClick={() => handleSelectRecommender(rec.id)}
                  className={`p-4 rounded-xl border text-left cursor-pointer transition relative group ${
                    isSelected
                      ? 'bg-orange-500/10 border-orange-500/40 shadow-md'
                      : 'bg-[#121212] border-gray-800 hover:border-gray-700'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <h5 className="font-bold text-sm text-white group-hover:text-orange-400 transition-colors">{rec.name}</h5>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteRecommender(rec.id); }}
                      className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5 line-clamp-2 leading-relaxed">{rec.description}</p>

                  <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-gray-900/60 text-[10px] font-mono">
                    <span className="text-gray-500">Activación: <span className="text-orange-400 font-bold bg-black px-1.5 py-0.5 rounded border border-gray-800">"{rec.keyword}"</span></span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      rec.queryType === 'external_api'
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}>
                      {rec.queryType === 'external_api' ? '🔌 API / Token' : '📦 Catálogo'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>


        </div>

        {/* Right Column - Editor Configurator */}
        <div className="lg:col-span-8">
          {activeRecommender ? (
            <div className="panel p-6 rounded-2xl bg-[#0e0e0e] border border-gray-800 space-y-6">

              {/* Header and Save actions */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-gray-800/80">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest font-mono">Editor de Flujo de Asesoría</span>
                  <h4 className="text-base font-bold text-white">{activeRecommender.name}</h4>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    onClick={handleSaveActiveConfig}
                    disabled={saveStatus === 'saving'}
                    className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
                      saveStatus === 'saved'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-orange-500 hover:bg-orange-400 text-black'
                    }`}
                  >
                    {saveStatus === 'saving' ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" /> Guardando...
                      </>
                    ) : saveStatus === 'saved' ? (
                      <>
                        <CheckCircle2 size={13} /> ¡Configuración Guardada!
                      </>
                    ) : (
                      <>
                        <Save size={13} /> Guardar Configuración
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* General Metadata Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-black/40 p-4 rounded-xl border border-gray-900 text-xs">
                <div className="space-y-1.5">
                  <label className="block text-[10px] text-gray-500 font-bold uppercase">Nombre del Recomendador:</label>
                  <input
                    type="text"
                    value={activeRecommender.name}
                    onChange={(e) => handleUpdateRecommenderName(e.target.value)}
                    className="w-full bg-black border border-gray-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] text-gray-500 font-bold uppercase flex items-center gap-1">
                    Palabra Clave Activador Chatbot:
                    <span className="text-gray-600 text-[9px] cursor-help" title="Cuando el cliente mencione esta palabra, se activa la recomendación inteligente.">ⓘ</span>
                  </label>
                  <input
                    type="text"
                    value={activeRecommender.keyword}
                    onChange={(e) => handleUpdateRecommenderKeyword(e.target.value)}
                    className="w-full bg-black border border-gray-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500 font-mono"
                    placeholder="ej. champu, cabello"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] text-gray-500 font-bold uppercase">Origen de Inventario / Stock:</label>
                  <select
                    value={activeRecommender.queryType}
                    onChange={(e) => handleUpdateQueryType(e.target.value as any)}
                    className="w-full bg-black border border-gray-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="internal">Catálogo Interno (CRM Local)</option>
                    <option value="external_api">Ecosistema Externo (API / Token / MCP)</option>
                  </select>
                </div>
                <div className="md:col-span-3 space-y-1.5">
                  <label className="block text-[10px] text-gray-500 font-bold uppercase">Descripción interna:</label>
                  <input
                    type="text"
                    value={activeRecommender.description}
                    onChange={(e) => handleUpdateRecommenderDesc(e.target.value)}
                    className="w-full bg-black border border-gray-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Configurations Tab Menu */}
              <div className="flex border-b border-gray-800 pb-px gap-6">
                <button
                  onClick={() => setSettingsTab('questions')}
                  className={`pb-2 px-1 text-xs font-semibold transition-all relative cursor-pointer flex items-center gap-1.5 ${
                    settingsTab === 'questions'
                      ? 'text-orange-400 font-bold border-b-2 border-orange-400'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <Layers size={13} /> 1. Cuestionario de Preguntas y Opciones ({activeRecommender.questions.length})
                </button>
                <button
                  onClick={() => setSettingsTab('rules')}
                  className={`pb-2 px-1 text-xs font-semibold transition-all relative cursor-pointer flex items-center gap-1.5 ${
                    settingsTab === 'rules'
                      ? 'text-orange-400 font-bold border-b-2 border-orange-400'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <Sliders size={13} /> 2. Reglas de Asignación de Productos ({activeRecommender.rules.length})
                </button>
                <button
                  onClick={() => setSettingsTab('api')}
                  className={`pb-2 px-1 text-xs font-semibold transition-all relative cursor-pointer flex items-center gap-1.5 ${
                    settingsTab === 'api'
                      ? 'text-orange-400 font-bold border-b-2 border-orange-400'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <Link size={13} /> 3. Configuración de API / MCP (Tokens)
                </button>
              </div>

              {/* Tab 1: Questions & Options Editor */}
              {settingsTab === 'questions' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-gray-400 leading-normal">
                      Crea preguntas claras y directas. Cada opción de respuesta guiará la lógica de la IA para sugerir el producto del catálogo.
                    </p>
                    <button
                      onClick={handleAddQuestion}
                      className="px-3 py-1.5 bg-orange-500 hover:bg-orange-400 text-black font-bold text-xs rounded-xl transition flex items-center gap-1.5"
                    >
                      <Plus size={13} /> Añadir Pregunta
                    </button>
                  </div>

                  <div className="space-y-4">
                    {activeRecommender.questions.map((q, qIndex) => (
                      <div key={q.id} className="p-4 rounded-xl bg-black border border-gray-800 space-y-4">

                        {/* Question Header */}
                        <div className="flex items-center gap-3 justify-between">
                          <div className="flex items-center gap-2 flex-1">
                            <span className="w-5 h-5 rounded-full bg-gray-900 border border-gray-800 flex items-center justify-center text-[10px] text-gray-400 font-bold">
                              {qIndex + 1}
                            </span>
                            <input
                              type="text"
                              value={q.text}
                              onChange={(e) => handleUpdateQuestionText(q.id, e.target.value)}
                              placeholder="Escribe la pregunta..."
                              className="bg-transparent text-sm font-semibold text-white focus:outline-none border-b border-transparent focus:border-orange-500/50 pb-0.5 flex-1"
                            />
                          </div>

                          <button
                            onClick={() => handleRemoveQuestion(q.id)}
                            className="text-gray-500 hover:text-red-400 p-1"
                            title="Eliminar Pregunta"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        {/* Options Section */}
                        <div className="pl-7 space-y-2">
                          <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Opciones de Respuesta Múltiple:</p>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {q.options.map((opt, oIdx) => (
                              <div key={opt.id} className="flex items-center gap-2 bg-gray-900/60 p-2 rounded-lg border border-gray-850">
                                <span className="text-[10px] text-gray-600 font-mono">#{oIdx + 1}</span>
                                <input
                                  type="text"
                                  value={opt.text}
                                  onChange={(e) => handleUpdateOptionText(q.id, opt.id, e.target.value)}
                                  placeholder="Opción de respuesta..."
                                  className="bg-transparent text-xs text-gray-300 focus:outline-none flex-1"
                                />
                                <button
                                  onClick={() => handleRemoveOption(q.id, opt.id)}
                                  className="text-gray-600 hover:text-red-400 p-0.5"
                                  title="Eliminar Opción"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            ))}
                          </div>

                          <button
                            onClick={() => handleAddOption(q.id)}
                            className="mt-1.5 text-[10px] font-bold text-orange-400 hover:text-orange-300 flex items-center gap-1 transition"
                          >
                            <Plus size={11} /> Añadir Otra Opción
                          </button>
                        </div>
                      </div>
                    ))}

                    {activeRecommender.questions.length === 0 && (
                      <div className="text-center py-12 text-gray-500 border border-dashed border-gray-800 rounded-xl">
                        <HelpCircle size={24} className="mx-auto text-gray-600 mb-2" />
                        <p className="text-xs">No hay preguntas configuradas todavía. Haz clic en "Añadir Pregunta" para empezar.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 2: Decision Rules Builder */}
              {settingsTab === 'rules' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex justify-between items-center">
                    <div className="space-y-1">
                      <p className="text-xs text-gray-400 leading-normal">
                        Mapea combinaciones de respuestas específicas para recomendar un producto del catálogo.
                      </p>
                    </div>
                    <button
                      onClick={handleAddRule}
                      className="px-3 py-1.5 bg-orange-500 hover:bg-orange-400 text-black font-bold text-xs rounded-xl transition flex items-center gap-1.5"
                    >
                      <Plus size={13} /> Añadir Regla de Lógica
                    </button>
                  </div>

                  <div className="space-y-3.5">
                    {activeRecommender.rules.map((rule, rIdx) => (
                      <div key={rule.id} className="p-4 rounded-xl bg-black border border-gray-800 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">

                        {/* Conditions setup */}
                        <div className="space-y-2 flex-1 w-full">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-orange-400 uppercase font-mono">Regla #{rIdx + 1}</span>
                            <span className="text-[10px] text-gray-500">SI el cliente responde:</span>
                          </div>

                          <div className="space-y-1.5">
                            {activeRecommender.questions.map(q => {
                              const activeOptId = rule.conditions[q.id] || "";
                              return (
                                <div key={q.id} className="flex flex-col md:flex-row md:items-center gap-2 text-xs bg-gray-950 p-2 rounded border border-gray-900">
                                  <span className="text-gray-500 font-medium md:w-1/3 truncate text-[11px]">{q.text}</span>
                                  <span className="text-gray-600 text-[10px] hidden md:inline">es igual a</span>
                                  <select
                                    value={activeOptId}
                                    onChange={(e) => handleUpdateRuleCondition(rule.id, q.id, e.target.value)}
                                    className="bg-black border border-gray-800 rounded px-2 py-1 text-xs text-gray-300 focus:outline-none flex-1 focus:border-orange-500"
                                  >
                                    <option value="">-- Ignorar pregunta para esta regla --</option>
                                    {q.options.map(o => (
                                      <option key={o.id} value={o.id}>{o.text}</option>
                                    ))}
                                  </select>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Arrow indicator */}
                        <div className="self-center hidden md:block text-gray-600">
                          <ArrowRight size={20} />
                        </div>

                        {/* Suggested product output */}
                        <div className="space-y-1.5 w-full md:w-72 bg-orange-500/5 p-3 rounded-xl border border-orange-500/10">
                          <label className="block text-[10px] text-orange-400 font-bold uppercase">Sugerir el Producto:</label>
                          <select
                            value={rule.recommendProductId}
                            onChange={(e) => handleUpdateRuleProduct(rule.id, e.target.value)}
                            className="w-full bg-black border border-gray-800 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500"
                          >
                            {products.map(p => (
                              <option key={p.id} value={p.id}>{p.name} (${p.price.toLocaleString()} COP)</option>
                            ))}
                          </select>
                          <div className="flex justify-between items-center pt-2 text-[10px] text-gray-500 font-mono">
                            <span>Inventario: {products.find(p => p.id === rule.recommendProductId)?.stock || 0} unidades</span>
                            <button
                              onClick={() => handleRemoveRule(rule.id)}
                              className="text-red-500 hover:text-red-400 flex items-center gap-0.5"
                              title="Eliminar Regla"
                            >
                              <Trash2 size={12} /> Eliminar
                            </button>
                          </div>
                        </div>

                      </div>
                    ))}

                    {activeRecommender.rules.length === 0 && (
                      <div className="text-center py-12 text-gray-500 border border-dashed border-gray-800 rounded-xl">
                        <Sliders size={24} className="mx-auto text-gray-600 mb-2" />
                        <p className="text-xs">No hay reglas lógicas configuradas. Haz clic en "Añadir Regla de Lógica" para mapear respuestas a productos.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 3: External API / Token Config (Shopify/Mastershop/Kommo) */}
              {settingsTab === 'api' && (
                <div className="space-y-5 animate-fade-in">
                  <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl text-xs space-y-2 text-gray-300">
                    <p className="font-bold text-white flex items-center gap-1.5">
                      <Link size={14} className="text-blue-400" /> Sincronización Avanzada con Plataformas Externas
                    </p>
                    <p className="leading-relaxed">
                      Conecta tus CRM (Kommo, Respond.io) o plataformas de Dropshipping (MasterShop, Shopify, Dropi, Effix) mediante tokens. Esto permite a la Inteligencia Artificial de la plataforma consultar el inventario, verificar disponibilidad local y actualizar existencias directamente mediante el túnel seguro de la plataforma.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">

                    {/* Platform selectors & inputs */}
                    <div className="space-y-4">
                      <h5 className="font-bold text-white text-xs uppercase tracking-wider">Credenciales de Acceso</h5>

                      <div className="space-y-3.5 bg-black p-4 rounded-xl border border-gray-850">
                        <div className="space-y-1.5">
                          <label className="block text-[10px] text-gray-500 font-bold uppercase">Plataforma Externa Destino:</label>
                          <select
                            value={activeRecommender.externalPlatform || 'mastershop'}
                            onChange={(e) => handleUpdateExternalPlatform(e.target.value as any)}
                            className="w-full bg-black border border-gray-800 rounded px-2.5 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                          >
                            <option value="shopify">Shopify Store API</option>
                            <option value="mastershop">MasterShop Dropshipping API</option>
                            <option value="kommo">Kommo CRM (Anteriormente amoCRM)</option>
                            <option value="respond_io">respond.io Omnichannel Hub</option>
                            <option value="ghl">GoHighLevel (GHL) OAuth API</option>
                            <option value="effix">Effix Logística & ERP</option>
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-[10px] text-gray-500 font-bold uppercase flex items-center justify-between">
                            <span>Token de Autenticación API / MCP:</span>
                            <span className="text-[9px] text-gray-500 lowercase">mantenlo privado</span>
                          </label>
                          <input
                            type="password"
                            value={activeRecommender.apiToken || ''}
                            onChange={(e) => handleUpdateApiToken(e.target.value)}
                            placeholder="Ingrese token de portadora de API..."
                            className="w-full bg-black border border-gray-800 rounded px-2.5 py-2 text-xs text-white focus:outline-none focus:border-orange-500 font-mono"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-[10px] text-gray-500 font-bold uppercase">Ruta / Endpoint URL de Inventario:</label>
                          <input
                            type="text"
                            value={activeRecommender.apiEndpoint || ''}
                            onChange={(e) => handleUpdateApiEndpoint(e.target.value)}
                            placeholder="https://api.mastershop.com/v1/products"
                            className="w-full bg-black border border-gray-800 rounded px-2.5 py-2 text-xs text-white focus:outline-none focus:border-orange-500 font-mono"
                          />
                        </div>

                        <div className="pt-2">
                          <button
                            onClick={handleTestAPIConnection}
                            disabled={apiTesting}
                            className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            {apiTesting ? (
                              <>
                                <RefreshCw size={13} className="animate-spin" /> Conectando...
                              </>
                            ) : (
                              <>
                                <Terminal size={13} /> Probar Diagnóstico de Token
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* API Terminal Diagnostic Log */}
                    <div className="space-y-3 flex flex-col h-full justify-between">
                      <h5 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <Terminal size={14} className="text-gray-400" /> Terminal MCP de Sincronización en Tiempo Real
                      </h5>

                      <div className="flex-1 bg-black text-[#00ff00] font-mono p-4 rounded-xl border border-gray-850 h-56 md:h-72 overflow-y-auto space-y-2 scrollbar-thin text-[11px] leading-relaxed select-all">
                        <p className="text-gray-500">// Terminal iniciada para la pasarela: {activeRecommender.externalPlatform || 'mastershop'}</p>

                        {apiTestLogs.map((log, idx) => (
                          <div key={idx} className={
                            log.type === 'sent'
                              ? 'text-blue-400'
                              : log.type === 'received'
                              ? 'text-yellow-300 whitespace-pre-wrap'
                              : 'text-gray-400'
                          }>
                            {log.type === 'sent' && '>>> '}
                            {log.type === 'received' && '<<< '}
                            {log.text}
                          </div>
                        ))}

                        {apiTestLogs.length === 0 && (
                          <p className="text-gray-600 italic">// Esperando solicitud de diagnóstico de Token...</p>
                        )}
                      </div>

                      {apiSuccess !== null && (
                        <div className={`p-3.5 rounded-lg border text-xs flex items-center gap-3.5 ${
                          apiSuccess
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                            : 'bg-red-500/10 border-red-500/20 text-red-400'
                        }`}>
                          {apiSuccess ? (
                            <>
                              <CheckCircle2 size={16} />
                              <div>
                                <p className="font-bold">Sincronización MCP Activa</p>
                                <p className="text-[10px] text-gray-400 mt-0.5">La IA puede leer stock y generar sugerencias automáticamente desde la plataforma de {activeRecommender.externalPlatform}.</p>
                              </div>
                            </>
                          ) : (
                            <>
                              <AlertCircle size={16} />
                              <div>
                                <p className="font-bold">Error de Sincronización</p>
                                <p className="text-[10px] text-gray-400 mt-0.5">Por favor verifica el token ingresado y los permisos asignados en el panel de desarrollador externo.</p>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className="panel p-12 text-center text-gray-500 border border-dashed border-gray-800 rounded-2xl">
              <Sliders size={32} className="mx-auto text-gray-600 mb-3" />
              <p className="text-sm">Por favor selecciona un recomendador de la lista o crea uno nuevo para empezar a personalizar las respuestas de tus clientes.</p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, 
  Plus, 
  Image as ImageIcon, 
  MessageCircle, 
  Package, 
  AlertCircle, 
  CheckCircle2, 
  RotateCcw, 
  Clock, 
  Bot, 
  Sparkles, 
  Send, 
  Smartphone, 
  Trash2, 
  Check, 
  X, 
  DollarSign, 
  ExternalLink,
  ThumbsUp,
  Sliders
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  description: string;
  category: string;
  image?: string;
  matchReason: string;
}

interface Order {
  id: string;
  clientName: string;
  clientPhone: string;
  product: string;
  total: number;
  status: 'Confirmado' | 'Por Confirmar' | 'Novedad' | 'Carrito Abandonado';
  date: string;
  city: string;
}

interface RecommendationQuestion {
  id: string;
  text: string;
  options: {
    text: string;
    pointsTo: string; // product ID
  }[];
}

export default function CatalogoView() {
  const [activeTab, setActiveTab] = useState<'catalogo' | 'pedidos' | 'recomendador'>('catalogo');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  // Recommendation flow states
  const [questions, setQuestions] = useState<RecommendationQuestion[]>([]);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState<number>(-1); // -1 means not started
  const [answersLog, setAnswersLog] = useState<{ question: string; answer: string; pointsTo: string }[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recommendedProduct, setRecommendedProduct] = useState<Product | null>(null);
  const [recommenderSubTab, setRecommenderSubTab] = useState<'visualizar' | 'editar'>('visualizar');

  // New product form states
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newProdPrice, setNewProdPrice] = useState(0);
  const [newProdStock, setNewProdStock] = useState(10);
  const [newProdDesc, setNewProdDesc] = useState('');
  const [newProdCat, setNewProdCat] = useState('Tecnología');
  const [newProdReason, setNewProdReason] = useState('Ideal para el estilo de vida activo del cliente.');

  // Initialize data
  useEffect(() => {
    // 1. Products
    const storedProducts = localStorage.getItem('crm_products');
    if (storedProducts) {
      try {
        setProducts(JSON.parse(storedProducts));
      } catch (e) {
        initializeDefaultProducts();
      }
    } else {
      initializeDefaultProducts();
    }

    // 2. Orders
    const storedOrders = localStorage.getItem('crm_orders');
    if (storedOrders) {
      try {
        setOrders(JSON.parse(storedOrders));
      } catch (e) {
        initializeDefaultOrders();
      }
    } else {
      initializeDefaultOrders();
    }

    // 3. Recommender Questions
    const storedQuestions = localStorage.getItem('crm_questions');
    if (storedQuestions) {
      try {
        setQuestions(JSON.parse(storedQuestions));
      } catch (e) {
        initializeDefaultQuestions();
      }
    } else {
      initializeDefaultQuestions();
    }
  }, []);

  const initializeDefaultProducts = () => {
    const defaultProds: Product[] = [
      {
        id: "PROD-001",
        name: "Smartwatch Ultra X8",
        price: 120000,
        stock: 45,
        category: "Tecnología",
        description: "Reloj inteligente de última generación con sensor de ritmo cardíaco, notificaciones de WhatsApp, modo de deporte y batería de 5 días.",
        matchReason: "Buscas mantenerte conectado, monitorear tu salud física diaria y prefieres un dispositivo práctico de precio moderado."
      },
      {
        id: "PROD-002",
        name: "Auriculares Pro 4",
        price: 190000,
        stock: 28,
        category: "Audio",
        description: "Auriculares inalámbricos con cancelación de ruido activa, sonido estéreo de alta fidelidad, estuche de carga rápida y micrófono integrado.",
        matchReason: "Priorizas disfrutar de tu música favorita con aislamiento del entorno, buscas comodidad para viajes largos y valoras sonido de alta fidelidad."
      },
      {
        id: "PROD-003",
        name: "Aspiradora Robot CleanMax",
        price: 350000,
        stock: 15,
        category: "Hogar",
        description: "Robot aspiradora programable para todo tipo de suelos. Sensor anticaídas, carga automática, ideal para hogares con mascotas.",
        matchReason: "Deseas optimizar el tiempo de limpieza en el hogar, tienes mascotas que sueltan pelo frecuentemente y prefieres automatización inteligente."
      }
    ];
    localStorage.setItem('crm_products', JSON.stringify(defaultProds));
    setProducts(defaultProds);
  };

  const initializeDefaultOrders = () => {
    const defaultOrders: Order[] = [
      {
        id: "PED-9821",
        clientName: "María Camila Restrepo",
        clientPhone: "+57 300 123 4567",
        product: "Smartwatch Ultra X8",
        total: 120000,
        status: "Confirmado",
        date: "2026-07-05",
        city: "Medellín"
      },
      {
        id: "PED-8812",
        clientName: "Estefanía Gómez",
        clientPhone: "+57 322 777 4433",
        product: "Licuadora Portátil ShakeGo",
        total: 85000,
        status: "Confirmado",
        date: "2026-07-05",
        city: "Barranquilla"
      },
      {
        id: "PED-8644",
        clientName: "Juan Pérez",
        clientPhone: "+57 312 444 5566",
        product: "Auriculares Pro 4",
        total: 190000,
        status: "Confirmado",
        date: "2026-07-04",
        city: "Cali"
      },
      {
        id: "PED-8551",
        clientName: "Carlos Ruiz",
        clientPhone: "+57 315 888 9900",
        product: "Aspiradora Robot CleanMax",
        total: 350000,
        status: "Novedad",
        date: "2026-07-03",
        city: "Bogotá"
      }
    ];
    localStorage.setItem('crm_orders', JSON.stringify(defaultOrders));
    setOrders(defaultOrders);
  };

  const initializeDefaultQuestions = () => {
    const defaultQuestions: RecommendationQuestion[] = [
      {
        id: "Q-1",
        text: "¿Cuál de estos beneficios consideras indispensable para tu rutina diaria?",
        options: [
          { text: "Monitorear mi salud física, pasos y recibir alertas de WhatsApp", pointsTo: "PROD-001" },
          { text: "Escuchar música aislándome del ruido de la oficina o la calle", pointsTo: "PROD-002" },
          { text: "Mantener los pisos de mi casa limpios sin tener que barrer yo mismo", pointsTo: "PROD-003" }
        ]
      },
      {
        id: "Q-2",
        text: "¿Cuál es tu principal entorno de uso o prioridad de compra?",
        options: [
          { text: "Gadgets de uso personal cómodos y al mejor precio posible", pointsTo: "PROD-001" },
          { text: "Trabajo o viajes donde necesito concentración y buen audio", pointsTo: "PROD-002" },
          { text: "Optimizar el hogar, sobre todo si tengo mascotas que sueltan pelo", pointsTo: "PROD-003" }
        ]
      }
    ];
    localStorage.setItem('crm_questions', JSON.stringify(defaultQuestions));
    setQuestions(defaultQuestions);
  };

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName || !newProdPrice) {
      alert('Nombre y Precio son requeridos.');
      return;
    }

    const newProd: Product = {
      id: `PROD-${Math.floor(100 + Math.random() * 900)}`,
      name: newProdName,
      price: Number(newProdPrice),
      stock: Number(newProdStock),
      category: newProdCat,
      description: newProdDesc || 'Sin descripción',
      matchReason: newProdReason
    };

    const updated = [...products, newProd];
    localStorage.setItem('crm_products', JSON.stringify(updated));
    setProducts(updated);
    setIsAddProductOpen(false);
    
    // Reset fields
    setNewProdName('');
    setNewProdPrice(0);
    setNewProdStock(10);
    setNewProdDesc('');
    setNewProdReason('Ideal para el estilo de vida activo del cliente.');
  };

  const handleDeleteProduct = (id: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar este producto del catálogo?')) {
      const updated = products.filter(p => p.id !== id);
      localStorage.setItem('crm_products', JSON.stringify(updated));
      setProducts(updated);
    }
  };

  const updateOrderStatus = (orderId: string, newStatus: Order['status']) => {
    const updated = orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o);
    localStorage.setItem('crm_orders', JSON.stringify(updated));
    setOrders(updated);
  };

  // QUESTION MANAGER OPERATIONS
  const saveQuestions = (updatedQuestions: RecommendationQuestion[]) => {
    localStorage.setItem('crm_questions', JSON.stringify(updatedQuestions));
    setQuestions(updatedQuestions);
  };

  const handleEditQuestionText = (id: string, newText: string) => {
    const updated = questions.map(q => q.id === id ? { ...q, text: newText } : q);
    saveQuestions(updated);
  };

  const handleEditOptionText = (qId: string, optIdx: number, newText: string) => {
    const updated = questions.map(q => {
      if (q.id === qId) {
        const updatedOpts = q.options.map((opt, oIdx) => 
          oIdx === optIdx ? { ...opt, text: newText } : opt
        );
        return { ...q, options: updatedOpts };
      }
      return q;
    });
    saveQuestions(updated);
  };

  const handleEditOptionPointsTo = (qId: string, optIdx: number, pointsToProdId: string) => {
    const updated = questions.map(q => {
      if (q.id === qId) {
        const updatedOpts = q.options.map((opt, oIdx) => 
          oIdx === optIdx ? { ...opt, pointsTo: pointsToProdId } : opt
        );
        return { ...q, options: updatedOpts };
      }
      return q;
    });
    saveQuestions(updated);
  };

  const handleAddQuestionOption = (qId: string) => {
    const updated = questions.map(q => {
      if (q.id === qId) {
        return {
          ...q,
          options: [...q.options, { text: 'Nueva opción de respuesta', pointsTo: products[0]?.id || 'PROD-001' }]
        };
      }
      return q;
    });
    saveQuestions(updated);
  };

  const handleDeleteQuestionOption = (qId: string, optIdx: number) => {
    const updated = questions.map(q => {
      if (q.id === qId) {
        return {
          ...q,
          options: q.options.filter((_, oIdx) => oIdx !== optIdx)
        };
      }
      return q;
    });
    saveQuestions(updated);
  };

  const handleCreateNewQuestion = () => {
    const newQ: RecommendationQuestion = {
      id: `Q-${Date.now()}`,
      text: '¿Nueva pregunta para el diagnóstico?',
      options: [
        { text: 'Opción A', pointsTo: products[0]?.id || 'PROD-001' },
        { text: 'Opción B', pointsTo: products[1]?.id || 'PROD-002' }
      ]
    };
    const updated = [...questions, newQ];
    saveQuestions(updated);
  };

  const handleDeleteQuestion = (id: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar esta pregunta del recomendador?')) {
      const updated = questions.filter(q => q.id !== id);
      saveQuestions(updated);
    }
  };

  // RECOMMENDATION SIMULATOR ENGINE
  const startRecommendation = () => {
    setCurrentQuestionIdx(0);
    setAnswersLog([]);
    setRecommendedProduct(null);
    setIsAnalyzing(false);
  };

  const selectOption = (optionText: string, pointsToProdId: string) => {
    const currentQuestion = questions[currentQuestionIdx];
    const newLog = [
      ...answersLog,
      {
        question: currentQuestion.text,
        answer: optionText,
        pointsTo: pointsToProdId
      }
    ];
    setAnswersLog(newLog);

    if (currentQuestionIdx + 1 < questions.length) {
      setCurrentQuestionIdx(currentQuestionIdx + 1);
    } else {
      // Finished all questions! Calculate the ideal product
      setCurrentQuestionIdx(-2); // Special index for calculating/analyzing
      setIsAnalyzing(true);

      setTimeout(() => {
        // Tally points
        const tallies: { [key: string]: number } = {};
        newLog.forEach(log => {
          tallies[log.pointsTo] = (tallies[log.pointsTo] || 0) + 1;
        });

        // Find product with max points, fallback to first product if tied or empty
        let winnerId = "PROD-001";
        let maxPoints = -1;
        Object.entries(tallies).forEach(([prodId, pts]) => {
          if (pts > maxPoints) {
            maxPoints = pts;
            winnerId = prodId;
          }
        });

        const matched = products.find(p => p.id === winnerId) || products[0];
        setRecommendedProduct(matched);
        setIsAnalyzing(false);
      }, 1500);
    }
  };

  const createOrderFromRecommendation = () => {
    if (!recommendedProduct) return;
    
    // Prompt for client name
    const nameInput = prompt("Ingresa el nombre del cliente para registrar el pedido:", "Cliente Nuevo");
    if (nameInput === null) return; // cancelled
    
    const newOrder: Order = {
      id: `PED-${Math.floor(1000 + Math.random() * 9000)}`,
      clientName: nameInput || 'Cliente Recomendador',
      clientPhone: '+57 300 ' + Math.floor(1000000 + Math.random() * 9000000),
      product: recommendedProduct.name,
      total: recommendedProduct.price,
      status: 'Confirmado',
      date: new Date().toISOString().split('T')[0],
      city: 'Medellín'
    };

    const updatedOrders = [newOrder, ...orders];
    localStorage.setItem('crm_orders', JSON.stringify(updatedOrders));
    setOrders(updatedOrders);

    // Decrement stock
    const updatedProducts = products.map(p => 
      p.id === recommendedProduct.id ? { ...p, stock: Math.max(0, p.stock - 1) } : p
    );
    localStorage.setItem('crm_products', JSON.stringify(updatedProducts));
    setProducts(updatedProducts);

    alert(`🎉 ¡Pedido ${newOrder.id} creado exitosamente! Se ha cargado a la pestaña de "Gestión de Pedidos" y descontado una unidad del inventario.`);
    setActiveTab('pedidos');
  };

  // Computed metrics for Orders
  const confirmedCount = orders.filter(o => o.status === 'Confirmado').length;
  const pendingCount = orders.filter(o => o.status === 'Por Confirmar').length;
  const newsCount = orders.filter(o => o.status === 'Novedad').length;
  const abandonedCount = orders.filter(o => o.status === 'Carrito Abandonado').length;

  return (
    <div className="space-y-6 animate-fade-in text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
            <ShoppingCart className="text-amber-500" /> Catálogo y Recomendador Multiproducto IA
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Gestiona productos, configura el recomendador conversacional de IA y controla la logística de pedidos.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800 scrollbar-none overflow-x-auto">
        <button
          onClick={() => setActiveTab('catalogo')}
          className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'catalogo' ? 'border-amber-500 text-amber-500' : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          Catálogo de Productos
        </button>
        <button
          onClick={() => setActiveTab('pedidos')}
          className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'pedidos' ? 'border-amber-500 text-amber-500' : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          Gestión de Pedidos y Fletes ({orders.length})
        </button>
        <button
          onClick={() => {
            setActiveTab('recomendador');
            startRecommendation();
          }}
          className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'recomendador' ? 'border-amber-500 text-amber-500 font-bold' : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <Sparkles size={14} className="text-purple-400 animate-pulse" /> Multirecomendador Conversacional IA
        </button>
      </div>

      {/* TAB 1: CATALOGO */}
      {activeTab === 'catalogo' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
             <div className="bg-[#111] border border-gray-800 rounded-lg p-2.5 flex items-center gap-4 text-xs text-gray-300 w-full sm:w-auto">
               <span className="flex items-center gap-2 text-gray-400"><Package size={14} /> Fuente de Inventario:</span>
               <select className="bg-transparent text-white border-none focus:ring-0 cursor-pointer font-bold outline-none">
                 <option>Manual (Local)</option>
                 <option>Shopify Dropshipping</option>
                 <option>WooCommerce ERP</option>
                 <option>Odoo Connector</option>
               </select>
             </div>
             <button 
               onClick={() => setIsAddProductOpen(true)}
               className="bg-amber-600 text-white text-xs px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-amber-500 transition w-full sm:w-auto justify-center"
             >
                <Plus size={16} /> Nuevo Producto
             </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((prod) => (
              <div key={prod.id} className="bg-[#111] rounded-xl overflow-hidden border border-gray-800 flex flex-col hover:border-gray-700 transition">
                <div className="h-40 bg-gray-900/60 flex flex-col items-center justify-center border-b border-gray-800/80 relative">
                  <div className="absolute top-3 left-3 bg-gray-950/80 border border-gray-800 px-2 py-0.5 rounded text-[10px] font-mono text-gray-400">
                    {prod.id}
                  </div>
                  <ImageIcon size={36} className="text-gray-700 mb-1" />
                  <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500">{prod.category}</span>
                </div>
                
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-bold text-gray-100 text-sm leading-tight">{prod.name}</h3>
                      <span className={`border text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider shrink-0 ${
                        prod.stock > 10 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                          : 'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}>
                        {prod.stock} stock
                      </span>
                    </div>
                    <p className="text-green-400 font-mono font-bold text-sm mb-2">
                      {prod.price.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}
                    </p>
                    <p className="text-xs text-gray-400 leading-relaxed line-clamp-3">{prod.description}</p>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-gray-850">
                    <div className="bg-black/40 p-2.5 rounded-lg border border-gray-850 text-[11px]">
                      <span className="text-purple-400 font-bold block mb-0.5 flex items-center gap-1">
                        <Bot size={12} /> Criterio Recomendador IA:
                      </span>
                      <p className="text-gray-400 italic">"{prod.matchReason}"</p>
                    </div>

                    <div className="flex gap-1.5 pt-1">
                      <button 
                        onClick={() => handleDeleteProduct(prod.id)}
                        className="p-2 text-xs font-semibold bg-red-950/25 hover:bg-red-900/30 text-red-400 rounded-lg border border-red-900/10 transition"
                        title="Eliminar producto"
                      >
                        <Trash2 size={13} />
                      </button>
                      <button 
                        onClick={() => {
                          alert('Función de edición rápida. Puedes configurar más características o sincronizar con tu Shopify en producción.');
                        }}
                        className="flex-1 py-2 text-xs font-bold bg-gray-900 hover:bg-gray-850 text-gray-300 rounded-lg transition border border-gray-800"
                      >
                        Sincronizar Inventario
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-amber-500/5 border border-amber-500/10 p-4 rounded-xl text-xs text-amber-300 flex gap-3">
             <Bot size={20} className="shrink-0 text-amber-400" />
             <p className="leading-relaxed">
               La inteligencia artificial del recomendador mapea las respuestas del cliente contra los <strong>Criterios de Recomendación</strong> configurados en cada ficha. Puedes añadir nuevos productos con criterios específicos para ampliar el rango de sugerencias de la IA en tus conversaciones.
             </p>
          </div>
        </div>
      )}

      {/* TAB 2: PEDIDOS */}
      {activeTab === 'pedidos' && (
        <div className="space-y-6">
          {/* Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#111] p-4 rounded-xl border border-gray-800">
              <div className="flex items-center gap-2 text-emerald-400 mb-1.5">
                <CheckCircle2 size={16} />
                <h3 className="text-xs uppercase tracking-wider font-bold">Confirmados</h3>
              </div>
              <p className="text-2xl font-mono font-bold text-white">{confirmedCount}</p>
            </div>
            <div className="bg-[#111] p-4 rounded-xl border border-gray-800">
              <div className="flex items-center gap-2 text-amber-400 mb-1.5">
                <Clock size={16} />
                <h3 className="text-xs uppercase tracking-wider font-bold">Por Confirmar</h3>
              </div>
              <p className="text-2xl font-mono font-bold text-white">{pendingCount}</p>
            </div>
            <div className="bg-[#111] p-4 rounded-xl border border-gray-800">
              <div className="flex items-center gap-2 text-blue-400 mb-1.5">
                <RotateCcw size={16} />
                <h3 className="text-xs uppercase tracking-wider font-bold">Novedades / Fletes</h3>
              </div>
              <p className="text-2xl font-mono font-bold text-white">{newsCount}</p>
            </div>
            <div className="bg-[#111] p-4 rounded-xl border border-gray-800">
              <div className="flex items-center gap-2 text-red-400 mb-1.5">
                <AlertCircle size={16} />
                <h3 className="text-xs uppercase tracking-wider font-bold">Abandonados</h3>
              </div>
              <p className="text-2xl font-mono font-bold text-white">{abandonedCount}</p>
            </div>
          </div>
          
          {/* Orders Table */}
          <div className="bg-[#111] rounded-xl border border-gray-800 overflow-hidden">
             <div className="p-4 border-b border-gray-800 bg-black/40 flex justify-between items-center">
                <h3 className="font-bold text-white text-sm">Listado General de Despachos y Pedidos</h3>
                <span className="text-[10px] text-gray-500 font-mono">Persistencia Local (crm_orders)</span>
             </div>
             
             {orders.length > 0 ? (
               <div className="overflow-x-auto">
                 <table className="w-full text-left border-collapse text-xs">
                   <thead>
                     <tr className="border-b border-gray-800 bg-black/30 text-[10px] text-gray-500 uppercase font-bold">
                       <th className="p-3.5">ID / Fecha</th>
                       <th className="p-3.5">Cliente / Ciudad</th>
                       <th className="p-3.5">Producto Adquirido</th>
                       <th className="p-3.5">Total de Compra</th>
                       <th className="p-3.5">Estado del Envío</th>
                       <th className="p-3.5 text-center">Modificar Logística</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-850">
                     {orders.map((o) => (
                       <tr key={o.id} className="hover:bg-gray-900/10">
                         <td className="p-3.5 font-mono">
                           <span className="font-bold text-white block">{o.id}</span>
                           <span className="text-gray-500 text-[10px] mt-0.5 block">{o.date}</span>
                         </td>
                         <td className="p-3.5">
                           <span className="font-bold text-gray-200 block">{o.clientName}</span>
                           <span className="text-gray-500 text-[10px] block">{o.city}</span>
                         </td>
                         <td className="p-3.5 font-medium text-gray-300">{o.product}</td>
                         <td className="p-3.5 font-bold font-mono text-green-400">
                           {o.total.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}
                         </td>
                         <td className="p-3.5">
                           <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${
                             o.status === 'Confirmado' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                             o.status === 'Por Confirmar' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                             o.status === 'Novedad' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                             'bg-red-500/10 text-red-400 border-red-500/20'
                           }`}>
                             {o.status}
                           </span>
                         </td>
                         <td className="p-3.5 text-center">
                           <select 
                             value={o.status} 
                             onChange={(e) => updateOrderStatus(o.id, e.target.value as Order['status'])}
                             className="bg-black border border-gray-800 text-[11px] text-gray-300 rounded px-2 py-1 outline-none focus:border-amber-500 cursor-pointer"
                           >
                             <option value="Confirmado">Confirmado</option>
                             <option value="Por Confirmar">Por Confirmar</option>
                             <option value="Novedad">Novedad / Flete</option>
                             <option value="Carrito Abandonado">Abandonado</option>
                           </select>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
             ) : (
               <div className="p-8 text-center text-gray-500 text-sm">
                  Aún no hay pedidos registrados. Usa el multirecomendador conversacional para registrar uno.
               </div>
             )}
          </div>
        </div>
      )}

      {/* TAB 3: RECOMMENDATION ENGINE (CONVERSATIONAL MOCK WHATSAPP) */}
      {activeTab === 'recomendador' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left: Explanatory Column / Question Manager */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-[#111] border border-gray-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sliders className="text-amber-500" size={18} />
                  <h3 className="font-bold text-white text-sm uppercase tracking-wider">Configurador de Diagnóstico IA</h3>
                </div>
                <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-mono font-bold animate-pulse">Auto-Guardado</span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Define las preguntas de diagnóstico y asigna qué producto específico de tu catálogo se debe recomendar según cada respuesta elegida.
              </p>

              {/* Sub tabs inside the Question Manager */}
              <div className="flex bg-black/40 p-1 rounded-xl border border-gray-850">
                <button
                  onClick={() => setRecommenderSubTab('visualizar')}
                  className={`flex-1 text-center py-1.5 rounded-lg text-xs font-semibold transition ${
                    recommenderSubTab === 'visualizar' 
                      ? 'bg-amber-600/20 border border-amber-600/30 text-amber-400 font-bold' 
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  Ver Resumen
                </button>
                <button
                  onClick={() => setRecommenderSubTab('editar')}
                  className={`flex-1 text-center py-1.5 rounded-lg text-xs font-semibold transition ${
                    recommenderSubTab === 'editar' 
                      ? 'bg-amber-600/20 border border-amber-600/30 text-amber-400 font-bold' 
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  Configurar Preguntas ({questions.length})
                </button>
              </div>

              {recommenderSubTab === 'visualizar' ? (
                <div className="space-y-3 pt-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Esquema Actual</span>
                    <button 
                      onClick={() => setRecommenderSubTab('editar')}
                      className="text-amber-500 hover:text-amber-400 text-xs font-bold"
                    >
                      Editar Preguntas
                    </button>
                  </div>
                  <div className="space-y-2">
                    {questions.map((q, idx) => (
                      <div key={q.id} className="bg-black/50 border border-gray-800 p-3 rounded-lg text-xs space-y-2">
                        <p className="font-bold text-gray-200">Pregunta {idx+1}: <span className="font-normal text-gray-400">{q.text}</span></p>
                        <div className="space-y-1 pl-2 border-l border-gray-800">
                          {q.options.map((opt, oIdx) => {
                            const associatedProd = products.find(p => p.id === opt.pointsTo);
                            return (
                              <p key={oIdx} className="text-[11px] text-gray-500">
                                • Opción {oIdx + 1}: "{opt.text}" <span className="text-amber-500/80">➜ ({associatedProd?.name || 'Desconocido'})</span>
                              </p>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4 pt-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Editor Inteligente</span>
                    <button
                      onClick={handleCreateNewQuestion}
                      className="bg-amber-600/25 hover:bg-amber-600/40 text-amber-300 border border-amber-500/20 text-[11px] px-2.5 py-1 rounded-lg transition font-bold flex items-center gap-1"
                    >
                      <Plus size={12} /> Nueva Pregunta
                    </button>
                  </div>

                  <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1 scrollbar-none">
                    {questions.length === 0 ? (
                      <div className="p-6 text-center text-gray-500 italic text-xs">
                        No hay preguntas en el diagnóstico. Crea una con el botón de arriba.
                      </div>
                    ) : (
                      questions.map((q, idx) => (
                        <div key={q.id} className="bg-black/40 border border-gray-800 p-4 rounded-xl text-xs space-y-3">
                          <div className="flex justify-between items-center border-b border-gray-800 pb-1.5">
                            <span className="font-bold text-amber-500/90 uppercase tracking-wider text-[10px]">Pregunta {idx+1}</span>
                            <button
                              onClick={() => handleDeleteQuestion(q.id)}
                              className="text-red-500 hover:text-red-400 transition flex items-center gap-1 font-bold text-[10px]"
                              title="Eliminar pregunta"
                            >
                              <Trash2 size={11} /> Eliminar
                            </button>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] text-gray-400 uppercase font-bold tracking-wider block">Texto de la Pregunta:</label>
                            <input
                              type="text"
                              value={q.text}
                              onChange={(e) => handleEditQuestionText(q.id, e.target.value)}
                              className="w-full bg-black/60 border border-gray-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-amber-500"
                              placeholder="Ej: ¿Qué tipo de piel tienes?"
                            />
                          </div>

                          <div className="space-y-2 pt-1">
                            <div className="flex justify-between items-center">
                              <span className="text-[9px] text-purple-400 font-bold uppercase tracking-wider">Opciones de Respuesta</span>
                            </div>

                            <div className="space-y-2 pl-2 border-l border-purple-900/30">
                              {q.options.map((opt, oIdx) => (
                                <div key={oIdx} className="bg-black/30 p-2.5 rounded-lg border border-gray-850 space-y-1.5">
                                  <div className="flex justify-between items-center text-[9px] text-gray-500">
                                    <span>Respuesta {oIdx+1}</span>
                                    {q.options.length > 1 && (
                                      <button
                                        onClick={() => handleDeleteQuestionOption(q.id, oIdx)}
                                        className="text-red-500/80 hover:text-red-400 transition font-bold"
                                        title="Eliminar opción"
                                      >
                                        Eliminar
                                      </button>
                                    )}
                                  </div>

                                  <input
                                    type="text"
                                    value={opt.text}
                                    onChange={(e) => handleEditOptionText(q.id, oIdx, e.target.value)}
                                    className="w-full bg-black/60 border border-gray-850 rounded p-1.5 text-xs text-gray-200 focus:outline-none focus:border-amber-500"
                                    placeholder="Ej: Piel grasa o mixta"
                                  />

                                  <div className="space-y-1">
                                    <span className="text-[8px] text-gray-400 block font-medium">Asigna y Recomienda:</span>
                                    <select
                                      value={opt.pointsTo}
                                      onChange={(e) => handleEditOptionPointsTo(q.id, oIdx, e.target.value)}
                                      className="w-full bg-black border border-gray-850 rounded p-1.5 text-xs text-white focus:outline-none cursor-pointer font-bold text-amber-500/90"
                                    >
                                      {products.map(p => (
                                        <option key={p.id} value={p.id}>
                                          {p.name} (${p.price.toLocaleString('es-CO', { maximumFractionDigits: 0 })})
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                              ))}
                            </div>

                            <button
                              onClick={() => handleAddQuestionOption(q.id)}
                              className="text-[10px] text-amber-500 hover:text-amber-400 transition font-bold flex items-center gap-1.5 mt-1 ml-2"
                            >
                              <Plus size={11} /> Añadir Opción de Respuesta
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: WhatsApp Phone Simulator */}
          <div className="lg:col-span-7 flex justify-center">
            <div className="w-full max-w-md bg-[#090e11] border border-gray-800 rounded-[32px] overflow-hidden shadow-2xl relative flex flex-col h-[580px] text-xs">
              
              {/* Phone Header / WhatsApp bar */}
              <div className="bg-[#075e54] p-4 text-white flex items-center justify-between shadow">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping absolute"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 relative"></div>
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-bold text-xs text-amber-300">
                    IA
                  </div>
                  <div>
                    <h4 className="font-bold text-xs leading-none">Asesor Inteligente de Compra</h4>
                    <span className="text-[9px] text-emerald-200 leading-none">en línea • bot activo</span>
                  </div>
                </div>
                <div className="bg-[#128c7e] px-2.5 py-1 rounded-full text-[9px] font-bold">
                  WhatsApp Bot
                </div>
              </div>

              {/* Chat Canvas (Messages Area) */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#0b141a]">
                
                {/* Intro welcome message */}
                <div className="bg-[#1f2c34] text-gray-200 p-3 rounded-xl rounded-tl-none max-w-[85%] self-start border border-gray-800/20 shadow">
                  <p className="font-bold text-amber-400 text-[10px] mb-1">¡Hola! Bienvenido a nuestra tienda inteligente 👋</p>
                  <p className="leading-relaxed">Soy tu asesor personal. Responderé unas sencillas preguntas para recomendarte el dispositivo ideal para ti. ¿Iniciamos?</p>
                </div>

                {/* If simulation not started */}
                {currentQuestionIdx === -1 && (
                  <div className="flex justify-center py-6">
                    <button 
                      onClick={startRecommendation}
                      className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-6 py-2.5 rounded-full shadow-lg text-xs uppercase tracking-wider flex items-center gap-2 animate-bounce"
                    >
                      <Smartphone size={14} /> Iniciar Diagnóstico de IA
                    </button>
                  </div>
                )}

                {/* Answers timeline rendering */}
                {answersLog.map((log, lIdx) => (
                  <React.Fragment key={lIdx}>
                    {/* System Question block in chat log */}
                    {lIdx > 0 && (
                      <div className="bg-[#1f2c34] text-gray-200 p-3 rounded-xl rounded-tl-none max-w-[85%] self-start border border-gray-800/20 shadow">
                        <p className="leading-relaxed">{log.question}</p>
                      </div>
                    )}
                    {/* User Answer block in chat log */}
                    <div className="bg-[#005c4b] text-white p-3 rounded-xl rounded-tr-none max-w-[85%] ml-auto self-end shadow text-right">
                      <p className="leading-relaxed">{log.answer}</p>
                      <span className="text-[8px] text-emerald-300/80 mt-1 block font-mono">Enviado • 10:3{lIdx} AM</span>
                    </div>
                  </React.Fragment>
                ))}

                {/* Current Active Question */}
                {currentQuestionIdx >= 0 && currentQuestionIdx < questions.length && (
                  <div className="bg-[#1f2c34] text-gray-200 p-3 rounded-xl rounded-tl-none max-w-[85%] self-start border border-gray-800/20 shadow animate-fade-in">
                    <p className="font-bold text-purple-400 text-[10px] mb-1">Pregunta del Asesor de IA:</p>
                    <p className="leading-relaxed">{questions[currentQuestionIdx].text}</p>
                  </div>
                )}

                {/* Analyzing Loader */}
                {isAnalyzing && (
                  <div className="bg-[#1f2c34] text-gray-200 p-4 rounded-xl rounded-tl-none max-w-[85%] self-start border border-gray-800/20 shadow space-y-2 animate-pulse">
                    <div className="flex items-center gap-2 text-purple-400 font-bold">
                      <Bot size={14} className="animate-spin" />
                      <span>IA Procesando Perfil...</span>
                    </div>
                    <p className="text-[10px] text-gray-500 leading-none">Mapeando preferencias del cliente...</p>
                    <div className="h-1 w-full bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-500 animate-[loading_1.5s_ease-in-out_infinite]"></div>
                    </div>
                  </div>
                )}

                {/* Final Recommendation Result Card inside WhatsApp */}
                {recommendedProduct && (
                  <div className="bg-[#1f2c34] text-gray-100 p-4 rounded-xl border border-purple-900/30 shadow-xl space-y-4 animate-scale-up">
                    <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs uppercase tracking-wider bg-purple-950/40 p-1.5 rounded border border-purple-900/20 justify-center">
                      <Sparkles size={13} className="animate-pulse" /> Recomendación Ideal Calculada
                    </div>
                    
                    <div className="bg-black/50 border border-gray-850 p-3 rounded-lg space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h5 className="font-bold text-white text-sm">{recommendedProduct.name}</h5>
                          <span className="text-green-400 font-bold font-mono text-[11px] block mt-0.5">
                            {recommendedProduct.price.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}
                          </span>
                        </div>
                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] px-1.5 py-0.5 rounded uppercase font-bold">98% Match</span>
                      </div>
                      <p className="text-[11px] text-gray-400 leading-relaxed">{recommendedProduct.description}</p>
                    </div>

                    <div className="bg-[#0b141a] p-3 rounded-lg border border-purple-950/20">
                      <span className="text-[10px] font-bold text-purple-400 block mb-1">¿Por qué este producto?</span>
                      <p className="text-gray-300 italic text-[11px] leading-relaxed">"{recommendedProduct.matchReason}"</p>
                    </div>

                    <div className="space-y-2">
                      <button
                        onClick={createOrderFromRecommendation}
                        className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-2.5 rounded-lg transition text-xs flex items-center justify-center gap-2 shadow"
                      >
                        <Check size={14} /> Registrar Pedido del Cliente
                      </button>
                      <button
                        onClick={startRecommendation}
                        className="w-full bg-gray-900 hover:bg-gray-800 text-gray-400 font-bold py-2 rounded-lg transition text-xs border border-gray-800"
                      >
                        Reiniciar Recomendador
                      </button>
                    </div>
                  </div>
                )}

              </div>

              {/* Chat Input Options (WhatsApp Keyboard Replacer) */}
              <div className="p-4 border-t border-gray-850 bg-[#1f2c34] space-y-2.5">
                
                {/* If questions are active, show options as clickable bubbles */}
                {currentQuestionIdx >= 0 && currentQuestionIdx < questions.length ? (
                  <div className="space-y-2">
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Selecciona una respuesta:</p>
                    <div className="flex flex-col gap-2">
                      {questions[currentQuestionIdx].options.map((opt, oIdx) => (
                        <button
                          key={oIdx}
                          onClick={() => selectOption(opt.text, opt.pointsTo)}
                          className="w-full bg-[#0b141a] hover:bg-black/60 border border-gray-800 text-left text-gray-200 px-3.5 py-2.5 rounded-xl text-xs hover:border-emerald-500 transition font-medium flex items-center justify-between group"
                        >
                          <span className="flex-1 leading-snug">{opt.text}</span>
                          <Send size={12} className="text-gray-500 group-hover:text-emerald-400 ml-2 shrink-0 transition" />
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-gray-500 italic py-2 justify-center">
                    {currentQuestionIdx === -1 ? 'Inicia la prueba para habilitar respuestas.' : 
                     recommendedProduct ? 'Recomendación completada. Puedes iniciar una nueva consulta.' : 'Procesando consulta...'}
                  </div>
                )}

              </div>

            </div>
          </div>
        </div>
      )}

      {/* NEW PRODUCT DIALOG MODAL */}
      {isAddProductOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0c0c0c] border border-gray-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-scale-up relative text-left">
            <button 
              onClick={() => setIsAddProductOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white transition"
            >
              <X size={18} />
            </button>
            
            <div className="p-6 border-b border-gray-800 bg-[#111]">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShoppingCart size={18} className="text-amber-500" />
                Registrar Producto en Catálogo
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Añade productos locales a tu catálogo para que el recomendador IA de WhatsApp los incluya en sus análisis y respuestas conversacionales.
              </p>
            </div>

            <form onSubmit={handleAddProduct} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1.5">Nombre del Producto</label>
                  <input 
                    type="text" 
                    value={newProdName}
                    onChange={(e) => setNewProdName(e.target.value)}
                    placeholder="Ej: Parlante Portátil Bose" 
                    className="w-full bg-black border border-gray-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500 font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1.5">Precio de Venta (COP)</label>
                  <input 
                    type="number" 
                    value={newProdPrice || ''}
                    onChange={(e) => setNewProdPrice(Number(e.target.value))}
                    placeholder="Ej: 150000" 
                    className="w-full bg-black border border-gray-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1.5">Stock Inicial</label>
                  <input 
                    type="number" 
                    value={newProdStock}
                    onChange={(e) => setNewProdStock(Number(e.target.value))}
                    className="w-full bg-black border border-gray-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1.5">Categoría</label>
                  <select 
                    value={newProdCat}
                    onChange={(e) => setNewProdCat(e.target.value)}
                    className="w-full bg-black border border-gray-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="Tecnología">Tecnología</option>
                    <option value="Audio">Audio</option>
                    <option value="Hogar">Hogar</option>
                    <option value="Accesorios">Accesorios</option>
                    <option value="Belleza / Salud">Belleza / Salud</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1.5">Recomendación IA ID</label>
                  <span className="text-[10px] text-gray-400 bg-gray-900 border border-gray-800/50 p-2 rounded block leading-normal mt-1 font-mono">
                    PROD-{Math.floor(100+Math.random()*900)} (Auto)
                  </span>
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1.5">Descripción del Producto</label>
                <textarea 
                  value={newProdDesc}
                  onChange={(e) => setNewProdDesc(e.target.value)}
                  placeholder="Detalles del producto, características clave, etc." 
                  className="w-full bg-black border border-gray-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500 h-20 resize-none"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-purple-400 block mb-1.5 flex items-center gap-1">
                  <Bot size={12} /> Criterio de Recomendación de IA
                </label>
                <textarea 
                  value={newProdReason}
                  onChange={(e) => setNewProdReason(e.target.value)}
                  placeholder="Ej: Buscas un gadget deportivo, que tenga buen monitoreo y que sea resistente al agua." 
                  className="w-full bg-black border border-gray-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 h-16 resize-none italic placeholder:text-gray-600"
                />
                <p className="text-[9px] text-gray-500 mt-1">Este criterio se mostrará al cliente en la conversación de WhatsApp como justificación de la IA para recomendar este artículo.</p>
              </div>

              <div className="flex gap-2 pt-4 border-t border-gray-850">
                <button 
                  type="button" 
                  onClick={() => setIsAddProductOpen(false)}
                  className="flex-1 bg-gray-900 hover:bg-gray-850 text-gray-400 hover:text-white transition font-bold py-2.5 rounded-xl text-xs"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-1 bg-amber-600 hover:bg-amber-500 text-white transition font-bold py-2.5 rounded-xl text-xs"
                >
                  Registrar Producto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

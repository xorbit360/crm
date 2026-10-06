import React, { useState } from 'react';
import { 
  Package, Search, Filter, Globe, DollarSign, ArrowUpRight, CheckCircle, 
  RefreshCw, TrendingUp, ShieldAlert, ShoppingBag, Layers, Truck, HelpCircle
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  image: string;
  stock: number;
  costPrice: number;
  suggestedPrice: number;
  profitMargin: number;
  countries: string[];
  supplier: 'Dropi' | 'MasterShop' | 'Hoko' | 'Local Warehouse' | 'Shopify Local';
  rating: number;
  imported?: boolean;
}

export default function ProveedoresView() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [selectedCountry, setSelectedCountry] = useState<string>('todos');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [importingId, setImportingId] = useState<string | null>(null);

  // Simulated live suppliers products catalog
  const [products, setProducts] = useState<Product[]>([
    {
      id: 'p1',
      name: 'Humidificador Ultrasónico Antigravedad RGB LED',
      sku: 'DROP-HUM-09',
      category: 'Hogar',
      image: 'https://images.unsplash.com/photo-1519183071298-a2962feb14f4?auto=format&fit=crop&w=300&q=80',
      stock: 485,
      costPrice: 8.50,
      suggestedPrice: 24.99,
      profitMargin: 65,
      countries: ['Colombia', 'México', 'Perú'],
      supplier: 'Dropi',
      rating: 4.8,
      imported: true
    },
    {
      id: 'p2',
      name: 'Audífonos Bluetooth Pro Max con Cancelación de Ruido',
      sku: 'MS-AUD-77',
      category: 'Tecnología',
      image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=300&q=80',
      stock: 1200,
      costPrice: 12.00,
      suggestedPrice: 35.00,
      profitMargin: 60,
      countries: ['Colombia', 'México'],
      supplier: 'MasterShop',
      rating: 4.9,
      imported: false
    },
    {
      id: 'p3',
      name: 'Sérum Rejuvenecedor de Ácido Hialurónico Orgánico',
      sku: 'HK-SER-54',
      category: 'Belleza',
      image: 'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?auto=format&fit=crop&w=300&q=80',
      stock: 310,
      costPrice: 4.20,
      suggestedPrice: 19.99,
      profitMargin: 72,
      countries: ['México', 'Perú'],
      supplier: 'Hoko',
      rating: 4.7,
      imported: false
    },
    {
      id: 'p4',
      name: 'Afilador de Cuchillos de Cocina Pro 3 Niveles',
      sku: 'DROP-KNI-12',
      category: 'Hogar',
      image: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?auto=format&fit=crop&w=300&q=80',
      stock: 95,
      costPrice: 3.10,
      suggestedPrice: 14.99,
      profitMargin: 70,
      countries: ['Colombia', 'Perú'],
      supplier: 'Dropi',
      rating: 4.5,
      imported: false
    },
    {
      id: 'p5',
      name: 'Cepillo Alisador de Cabello de Cerámica Iónica',
      sku: 'MS-CEPI-99',
      category: 'Belleza',
      image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=300&q=80',
      stock: 670,
      costPrice: 9.50,
      suggestedPrice: 29.99,
      profitMargin: 63,
      countries: ['Colombia', 'México', 'Perú'],
      supplier: 'MasterShop',
      rating: 4.6,
      imported: false
    },
    {
      id: 'p6',
      name: 'Lámpara de Escritorio Inteligente USB C / Carga Qi',
      sku: 'HK-LAMP-01',
      category: 'Tecnología',
      image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=300&q=80',
      stock: 240,
      costPrice: 15.00,
      suggestedPrice: 39.99,
      profitMargin: 58,
      countries: ['México'],
      supplier: 'Hoko',
      rating: 4.8,
      imported: false
    }
  ]);

  const categories = ['todos', 'Tecnología', 'Belleza', 'Hogar'];
  const countries = ['todos', 'Colombia', 'México', 'Perú'];

  const refreshCatalog = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      alert('Sincronizados 3 nuevos productos de las APIs de Dropi y MasterShop.');
    }, 1200);
  };

  const handleImportProduct = (productId: string) => {
    setImportingId(productId);
    setTimeout(() => {
      setProducts(prev => 
        prev.map(p => p.id === productId ? { ...p, imported: !p.imported } : p)
      );
      setImportingId(null);
    }, 1500);
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'todos' || p.category === selectedCategory;
    const matchesCountry = selectedCountry === 'todos' || p.countries.includes(selectedCountry);
    return matchesSearch && matchesCategory && matchesCountry;
  });

  return (
    <div className="p-6 md:p-8 space-y-8 bg-black/40 min-h-full">
      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-800 pb-6">
        <div>
          <span className="text-xs font-bold font-mono text-gold tracking-widest uppercase bg-gold/10 px-3 py-1.5 rounded-md border border-gold/20 flex w-fit items-center gap-1.5 mb-2">
            <Truck size={14} /> CATÁLOGOS E INTEGRACIÓN DE PROVEEDORES
          </span>
          <h2 className="text-3xl font-display font-bold text-white mt-2">Inventarios y Proveedores Dropshipping</h2>
          <p className="text-gray-400 mt-1 max-w-2xl text-sm leading-relaxed">
            Conexión directa con bodegas locales en Latinoamérica (Dropi, MasterShop, Hoko). Sincroniza stock real e importa productos ganadores a tu WhatsApp de ventas en un clic.
          </p>
        </div>
        
        <button 
          onClick={refreshCatalog}
          disabled={isRefreshing}
          className="bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-800 text-gray-300 px-5 py-3 rounded-xl text-xs font-bold font-mono tracking-wide flex items-center gap-2 transition-all"
        >
          <RefreshCw size={14} className={isRefreshing ? 'animate-spin text-gold' : ''} />
          {isRefreshing ? 'Sincronizando APIS...' : 'Sincronizar Stock Bodegas'}
        </button>
      </div>

      {/* Integration Quick View Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { name: 'Dropi API', status: 'CONECTADO', class: 'bg-green-500/10 border-green-500/20 text-green-400', desc: 'Bodegas Co, Mx, Pe' },
          { name: 'MasterShop Pro', status: 'CONECTADO', class: 'bg-green-500/10 border-green-500/20 text-green-400', desc: 'Surtido Preferencial' },
          { name: 'Hoko Dropship', status: 'ACTIVO', class: 'bg-green-500/10 border-green-500/20 text-green-400', desc: 'Despachos Locales' },
          { name: 'Shopify / WooCommerce', status: 'NO VINCULADO', class: 'bg-red-500/10 border-red-500/20 text-red-400', desc: 'Enlace de Tiendas Externas' }
        ].map((sup, i) => (
          <div key={i} className="p-4 rounded-xl border border-slate-900 bg-slate-950/45 flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-white font-sans">{sup.name}</h4>
              <p className="text-[11px] text-gray-500 mt-0.5">{sup.desc}</p>
            </div>
            <div className={`text-[10px] uppercase font-mono font-bold px-2 py-1 rounded border ${sup.class}`}>
              {sup.status}
            </div>
          </div>
        ))}
      </div>

      {/* Control Bar: Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between p-4 rounded-xl bg-slate-950/20 border border-slate-900">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
          <input
            type="text"
            placeholder="Buscar por Sku, Nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900/60 border border-slate-900 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-gold/30 transition-colors"
          />
        </div>

        <div className="flex flex-wrap gap-3 w-full sm:w-auto">
          {/* Categories select tab */}
          <div className="flex items-center gap-1.5 border border-slate-900 bg-[#0c0c0f] rounded-xl p-1">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize font-mono ${
                  selectedCategory === cat 
                    ? 'bg-gold text-black' 
                    : 'text-gray-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                {cat === 'todos' ? 'Categorías' : cat}
              </button>
            ))}
          </div>

          {/* Countries select filter */}
          <div className="flex items-center gap-1.5 border border-slate-900 bg-[#0c0c0f] rounded-xl p-1">
            {countries.map(country => (
              <button
                key={country}
                onClick={() => setSelectedCountry(country)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize font-mono ${
                  selectedCountry === country 
                    ? 'bg-gold text-black' 
                    : 'text-gray-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                {country === 'todos' ? 'Países' : country}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Products Catalog grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {filteredProducts.map((product) => {
          const isImported = product.imported;
          const loadingThis = importingId === product.id;
          
          return (
            <div key={product.id} className="rounded-2xl border border-slate-900 bg-slate-950/30 overflow-hidden hover:border-slate-800 transition-all flex flex-col h-full text-left">
              {/* Product Card Image Banner */}
              <div className="relative aspect-video w-full bg-slate-900 overflow-hidden border-b border-slate-900">
                <img 
                  src={product.image} 
                  alt={product.name} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1">
                  {product.countries.map(c => (
                    <span key={c} className="text-[9px] bg-black/85 backdrop-blur text-white border border-slate-800 font-mono font-bold px-2 py-0.5 rounded flex items-center gap-1">
                      <Globe size={9} className="text-blue-400" /> {c}
                    </span>
                  ))}
                </div>
                <div className="absolute bottom-2.5 right-2.5 bg-black/85 backdrop-blur px-2 py-1 rounded border border-slate-800 text-[10px] font-mono text-gold font-bold">
                  Provee: {product.supplier}
                </div>
              </div>

              {/* Product Spec Details */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-mono text-gray-500 font-bold uppercase">{product.category} • SKU: {product.sku}</span>
                    <div className="flex items-center gap-1 text-[11px] font-mono font-extrabold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                       ★ {product.rating}
                    </div>
                  </div>
                  <h3 className="text-md font-bold text-white line-clamp-2 leading-snug">{product.name}</h3>
                </div>

                {/* Stock bar indicator */}
                <div className="space-y-1 bg-slate-900/40 p-2.5 rounded-xl border border-slate-900">
                  <div className="flex justify-between text-[11px] font-mono text-gray-400">
                    <span>Stock Disponible</span>
                    <span className={product.stock < 100 ? 'text-red-400 font-bold' : 'text-green-400'}>{product.stock} unids</span>
                  </div>
                  <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${product.stock < 100 ? 'bg-red-500' : 'bg-green-500'}`} 
                      style={{ width: `${Math.min((product.stock / 1500) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Pricing / Markup Matrix */}
                <div className="grid grid-cols-3 gap-2 bg-[#09090b]/80 p-3 rounded-xl border border-slate-900 text-center">
                  <div>
                    <span className="text-[10px] text-gray-500 font-mono uppercase block">COSTO</span>
                    <span className="text-xs font-bold text-slate-300 font-mono">${product.costPrice.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 font-mono uppercase block">SUGERIDO</span>
                    <span className="text-xs font-bold text-slate-300 font-mono">${product.suggestedPrice.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gold font-mono uppercase block font-semibold">MARGEN</span>
                    <span className="text-xs font-bold text-gold font-mono">+{product.profitMargin}%</span>
                  </div>
                </div>

                {/* Import tool handler */}
                <button
                  onClick={() => handleImportProduct(product.id)}
                  disabled={loadingThis}
                  className={`w-full py-2.5 rounded-xl font-bold font-mono text-xs transition-all flex items-center justify-center gap-1.5 border ${
                    isImported 
                      ? 'bg-green-950/20 text-green-400 border-green-500/35 hover:bg-green-950/10' 
                      : 'bg-gold text-black hover:bg-yellow-400 border-transparent shadow shadow-amber-500/5'
                  }`}
                >
                  {loadingThis ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" /> Importando de {product.supplier}...
                    </>
                  ) : isImported ? (
                    <>
                      <CheckCircle size={14} /> Importador al Catálogo WhatsApp
                    </>
                  ) : (
                    <>
                      Importar Producto Ganador <ArrowUpRight size={14} />
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom explanation */}
      <div className="p-6 rounded-2xl border border-gray-800 bg-slate-900/20 flex flex-col sm:flex-row gap-5 items-start sm:items-center justify-between text-left">
        <div className="space-y-1">
          <h4 className="font-bold text-white text-md flex items-center gap-1.5"><Layers size={18} className="text-gold" /> ¿Cómo funciona la sincronización automática de catálogos?</h4>
          <p className="text-xs text-gray-400 max-w-2xl leading-relaxed">
            Al hacer clic en "Importar Producto Ganador", Expert 360° crea automáticamente la ficha técnica en tu bot local, asocia el webhook de inventario y optimiza las respuestas de la Inteligencia Artificial con los detalles, SKU y precios de venta.
          </p>
        </div>
        <button 
          onClick={() => alert("Consulta por favor el Campus de Entrenamiento o a tu Administrador (@wallet) para habilitar bodegas VIP.")}
          className="px-5 py-3 rounded-xl bg-slate-900 text-xs font-bold font-mono border border-slate-800 hover:border-gray-700 hover:text-white transition-all whitespace-nowrap self-stretch sm:self-center text-center justify-center"
        >
          Solicitar Bodega Personalizada
        </button>
      </div>

    </div>
  );
}

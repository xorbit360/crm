import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Image as ImageIcon,
  Sparkles,
  Trash2,
  Check,
  X,
  Search,
  Download,
  Upload,
  ArrowLeft,
  CheckCircle2,
  PauseCircle,
  DollarSign,
  Puzzle,
  Zap,
  FileText,
  Edit3,
  HelpCircle,
  Smile,
  Paperclip,
  Layers,
  Bot,
  Truck,
  Sliders,
  ChevronRight,
  AlertTriangle,
  RotateCcw,
  Copy,
  ExternalLink
} from 'lucide-react';

export interface CatalogProduct {
  id: string;
  name: string;
  basicDescription: string;
  features: string;
  problemsSolved?: string;
  benefits: string;
  differentiators?: string;
  price: number;
  offerPrice: number;
  stock: string | number;
  isActive: boolean;
  isAvailableForBot: boolean;
  showInBotList: boolean;
  productType: 'simple' | 'variantes';
  isPack: boolean;
  shippingProvider: string;
  shippingType: 'gratis' | 'fijo' | 'condicional';
  fixedShippingCost?: number;
  quantityOffers: Array<{ id: string; qty: number; price: number; label: string }>;
  image?: string;
  gallery: string[];
  welcomeMessage: string;
  welcomeMedia: string[];
  entryQuestion: string;
  dataCollectionMode: 'single_message' | 'step_by_step';
  botPersonality: string;
  rules: Array<{ id: string; title: string; trigger: string; response: string; icon?: string }>;
  creationMode?: 'guiado' | 'prompt';
  customPrompt?: string;
  createdAt: string;
}

const CATALOG_STORAGE_KEY = 'xorbit_catalog_v2';
const LEGACY_CATALOG_STORAGE_KEY = 'crm_products_v2';

const normalizeCatalogProduct = (product: any): CatalogProduct => ({
  id: String(product?.id || product?.sku || `PROD-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
  name: String(product?.name || 'Producto sin nombre'),
  basicDescription: String(product?.basicDescription || product?.description || ''),
  features: String(product?.features || ''),
  problemsSolved: String(product?.problemsSolved || ''),
  benefits: String(product?.benefits || ''),
  differentiators: String(product?.differentiators || ''),
  price: Number(product?.price ?? product?.basePrice ?? 0) || 0,
  offerPrice: Number(product?.offerPrice ?? product?.price ?? product?.basePrice ?? 0) || 0,
  stock: product?.stock ?? 'Sin control',
  isActive: product?.isActive !== false,
  isAvailableForBot: product?.isAvailableForBot !== false,
  showInBotList: product?.showInBotList !== false,
  productType: product?.productType === 'variantes' ? 'variantes' : 'simple',
  isPack: Boolean(product?.isPack),
  shippingProvider: String(product?.shippingProvider || 'Ninguno (no sincronizar pedidos)'),
  shippingType: ['gratis', 'fijo', 'condicional'].includes(product?.shippingType) ? product.shippingType : 'gratis',
  fixedShippingCost: Number(product?.fixedShippingCost ?? 0) || 0,
  quantityOffers: Array.isArray(product?.quantityOffers) ? product.quantityOffers : [],
  image: product?.image || undefined,
  gallery: Array.isArray(product?.gallery) ? product.gallery : [],
  welcomeMessage: String(product?.welcomeMessage || ''),
  welcomeMedia: Array.isArray(product?.welcomeMedia) ? product.welcomeMedia : [],
  entryQuestion: String(product?.entryQuestion || ''),
  dataCollectionMode: product?.dataCollectionMode === 'single_message' ? 'single_message' : 'step_by_step',
  botPersonality: String(product?.botPersonality || ''),
  rules: Array.isArray(product?.rules) ? product.rules : [],
  creationMode: product?.creationMode === 'prompt' ? 'prompt' : 'guiado',
  customPrompt: String(product?.customPrompt || ''),
  createdAt: String(product?.createdAt || new Date().toISOString()),
});

export default function CatalogoView() {
  const [products, setProducts] = useState<CatalogProduct[]>(() => {
    try {
      const saved = localStorage.getItem(CATALOG_STORAGE_KEY) || localStorage.getItem(LEGACY_CATALOG_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed.map(normalizeCatalogProduct);
      }
    } catch (_) {}
    return [];
  });
  const [isCatalogHydrated, setIsCatalogHydrated] = useState(false);

  // Navigation & View States
  // 'list' | 'mode_select' | 'wizard_step1' | 'wizard_step2' | 'wizard_step3' | 'prompt_mode'
  const [viewState, setViewState] = useState<'list' | 'mode_select' | 'wizard_step1' | 'wizard_step2' | 'wizard_step3' | 'prompt_mode'>('list');
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [hasDismissedOnboarding, setHasDismissedOnboarding] = useState(() => {
    return localStorage.getItem('XORBIT 360_CATALOG_ONBOARDING_DISMISSED') === 'true';
  });

  // Filter & Search
  const [filterTab, setFilterTab] = useState<'todos' | 'activos' | 'inactivos'>('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  // Form State for New / Edit Product
  const [formName, setFormName] = useState('');
  const [formBasicDesc, setFormBasicDesc] = useState('');
  const [formFeatures, setFormFeatures] = useState('');
  const [formProblemsSolved, setFormProblemsSolved] = useState('');
  const [formBenefits, setFormBenefits] = useState('');
  const [formDifferentiators, setFormDifferentiators] = useState('');
  const [formPrice, setFormPrice] = useState<number>(0);
  const [formOfferPrice, setFormOfferPrice] = useState<number>(0);
  const [formStock, setFormStock] = useState<string>('Sin track');
  const [formIsAvailableForBot, setFormIsAvailableForBot] = useState(true);
  const [formShowInBotList, setFormShowInBotList] = useState(true);
  const [formProductType, setFormProductType] = useState<'simple' | 'variantes'>('simple');
  const [formIsPack, setFormIsPack] = useState(false);
  const [formShippingProvider, setFormShippingProvider] = useState('Ninguno (no sincronizar pedidos)');
  const [formShippingType, setFormShippingType] = useState<'gratis' | 'fijo' | 'condicional'>('gratis');
  const [formFixedShippingCost, setFormFixedShippingCost] = useState<number>(15000);
  const [formQuantityOffers, setFormQuantityOffers] = useState<Array<{ id: string; qty: number; price: number; label: string }>>([]);
  const [formImage, setFormImage] = useState<string>('');
  const [formGallery, setFormGallery] = useState<string[]>([]);

  // Step 2 States
  const [formWelcomeMessage, setFormWelcomeMessage] = useState('');
  const [formWelcomeMedia, setFormWelcomeMedia] = useState<string[]>([]);
  const [formEntryQuestion, setFormEntryQuestion] = useState('');

  // Step 3 States
  const [formDataCollectionMode, setFormDataCollectionMode] = useState<'single_message' | 'step_by_step'>('step_by_step');
  const [formBotPersonality, setFormBotPersonality] = useState(
    'Sé cercano y cálido, tuteá al cliente y usá emojis con moderación. Somos una marca colombiana enfocada en resolver sus necesidades con confianza y garantía de 1 año. Nunca presiones.'
  );
  const [formRules, setFormRules] = useState<Array<{ id: string; title: string; trigger: string; response: string; icon?: string }>>([
    {
      id: 'r1',
      title: 'Objeción de precio',
      trigger: 'Cuando el cliente dice que está caro o pide descuento',
      response: 'Resalta el valor, la garantía oficial de 1 año y ofrece la promoción de 2 unidades con envío gratis.',
      icon: '💰'
    },
    {
      id: 'r2',
      title: 'Objeción de duda / desconfianza',
      trigger: 'Cuando desconfía de la calidad o pide garantía',
      response: 'Explica que tenemos pago contra entrega en toda Colombia: paga en efectivo solo cuando reciba el producto en su casa.',
      icon: '🧐'
    },
    {
      id: 'r3',
      title: 'No responde / desapareció',
      trigger: 'Cuando dejó de responder por más de 1 hora',
      response: 'Enviar recordatorio amable reservando su unidad por tiempo limitado.',
      icon: '😴'
    }
  ]);
  const [formCustomPrompt, setFormCustomPrompt] = useState('');

  // Dropi & Import Modals
  const [showDropiModal, setShowDropiModal] = useState(false);
  const [dropiProductId, setDropiProductId] = useState('64917');
  const [dropiWorkMode, setDropiWorkMode] = useState<'guiado' | 'prompt'>('guiado');
  const [isImportingDropi, setIsImportingDropi] = useState(false);

  // El servidor es la fuente única del catálogo para WhatsApp y los demás módulos.
  useEffect(() => {
    let cancelled = false;

    const loadCatalog = async () => {
      try {
        const response = await fetch('/api/backoffice/state');
        if (!response.ok) throw new Error('No fue posible cargar el catálogo central');
        const state = await response.json();
        if (!cancelled && Array.isArray(state?.products)) {
          setProducts(state.products.map(normalizeCatalogProduct));
        }
      } catch (error) {
        console.warn('[Catálogo] Se usará la copia local hasta recuperar la conexión con el servidor.', error);
      } finally {
        if (!cancelled) setIsCatalogHydrated(true);
      }
    };

    loadCatalog();
    return () => { cancelled = true; };
  }, []);

  // Mantiene servidor, módulos abiertos y caché local con el mismo catálogo.
  useEffect(() => {
    if (!isCatalogHydrated) return;

    try {
      localStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify(products));
      localStorage.setItem(LEGACY_CATALOG_STORAGE_KEY, JSON.stringify(products));
      // Also update legacy format for backward compatibility
      const legacy = products.map(p => ({
        id: p.id,
        name: p.name,
        price: p.offerPrice || p.price,
        stock: typeof p.stock === 'number' ? p.stock : 15,
        description: p.basicDescription,
        category: 'General',
        image: p.image
      }));
      localStorage.setItem('crm_products', JSON.stringify(legacy));
      window.dispatchEvent(new CustomEvent('xorbit:catalog-updated', { detail: { products, legacy } }));
    } catch (_) {}

    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch('/api/backoffice/state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ products, catalogUpdatedAt: Date.now() }),
        });
        if (!response.ok) throw new Error('El servidor rechazó la sincronización del catálogo');
      } catch (error) {
        console.error('[Catálogo] Error sincronizando con el servidor:', error);
      }
    }, 400);

    return () => window.clearTimeout(timer);
  }, [products, isCatalogHydrated]);

  const resetForm = () => {
    setFormName('');
    setFormBasicDesc('');
    setFormFeatures('');
    setFormProblemsSolved('');
    setFormBenefits('');
    setFormDifferentiators('');
    setFormPrice(0);
    setFormOfferPrice(0);
    setFormStock('Sin track');
    setFormIsAvailableForBot(true);
    setFormShowInBotList(true);
    setFormProductType('simple');
    setFormIsPack(false);
    setFormShippingProvider('Ninguno (no sincronizar pedidos)');
    setFormShippingType('gratis');
    setFormFixedShippingCost(15000);
    setFormQuantityOffers([]);
    setFormImage('');
    setFormGallery([]);
    setFormWelcomeMessage('');
    setFormWelcomeMedia([]);
    setFormEntryQuestion('');
    setFormDataCollectionMode('step_by_step');
    setFormBotPersonality('Sé cercano y cálido, tuteá al cliente y usá emojis con moderación. Somos una marca colombiana enfocada en resolver sus necesidades con confianza y garantía.');
    setFormCustomPrompt('');
    setEditingProductId(null);
  };

  const handleStartNewProduct = () => {
    resetForm();
    if (!hasDismissedOnboarding) {
      setShowOnboardingModal(true);
    } else {
      setViewState('mode_select');
    }
  };

  const handleDismissOnboarding = (neverShowAgain: boolean) => {
    setShowOnboardingModal(false);
    if (neverShowAgain) {
      setHasDismissedOnboarding(true);
      localStorage.setItem('XORBIT 360_CATALOG_ONBOARDING_DISMISSED', 'true');
    }
    setViewState('mode_select');
  };

  const handleEditProduct = (prod: CatalogProduct) => {
    setEditingProductId(prod.id);
    setFormName(prod.name);
    setFormBasicDesc(prod.basicDescription);
    setFormFeatures(prod.features);
    setFormProblemsSolved(prod.problemsSolved || '');
    setFormBenefits(prod.benefits);
    setFormDifferentiators(prod.differentiators || '');
    setFormPrice(prod.price);
    setFormOfferPrice(prod.offerPrice);
    setFormStock(String(prod.stock));
    setFormIsAvailableForBot(prod.isAvailableForBot);
    setFormShowInBotList(prod.showInBotList);
    setFormProductType(prod.productType);
    setFormIsPack(prod.isPack);
    setFormShippingProvider(prod.shippingProvider);
    setFormShippingType(prod.shippingType);
    setFormFixedShippingCost(prod.fixedShippingCost || 15000);
    setFormQuantityOffers(prod.quantityOffers || []);
    setFormImage(prod.image || '');
    setFormGallery(prod.gallery || []);
    setFormWelcomeMessage(prod.welcomeMessage);
    setFormWelcomeMedia(prod.welcomeMedia || []);
    setFormEntryQuestion(prod.entryQuestion);
    setFormDataCollectionMode(prod.dataCollectionMode);
    setFormBotPersonality(prod.botPersonality);
    setFormRules(prod.rules || []);
    setFormCustomPrompt(prod.customPrompt || '');

    if (prod.creationMode === 'prompt') {
      setViewState('prompt_mode');
    } else {
      setViewState('wizard_step1');
    }
  };

  const handleDeleteProduct = (id: string) => {
    if (confirm('¿Estás seguro de eliminar este producto del catálogo?')) {
      setProducts(prev => prev.filter(p => p.id !== id));
    }
  };

  const handleToggleProductStatus = (id: string) => {
    setProducts(prev => prev.map(p => {
      if (p.id === id) {
        return { ...p, isActive: !p.isActive };
      }
      return p;
    }));
  };

  const handleSaveProductFinal = () => {
    if (!formName.trim()) {
      alert('Por favor ingresa el nombre del producto.');
      setViewState('wizard_step1');
      return;
    }

    const newProductObj: CatalogProduct = {
      id: editingProductId || `PROD-${Date.now()}`,
      name: formName.trim(),
      basicDescription: formBasicDesc.trim() || formName,
      features: formFeatures.trim(),
      problemsSolved: formProblemsSolved.trim(),
      benefits: formBenefits.trim(),
      differentiators: formDifferentiators.trim(),
      price: Number(formPrice) || 0,
      offerPrice: Number(formOfferPrice) || Number(formPrice) || 0,
      stock: formStock,
      isActive: true,
      isAvailableForBot: formIsAvailableForBot,
      showInBotList: formShowInBotList,
      productType: formProductType,
      isPack: formIsPack,
      shippingProvider: formShippingProvider,
      shippingType: formShippingType,
      fixedShippingCost: formFixedShippingCost,
      quantityOffers: formQuantityOffers,
      image: formImage || undefined,
      gallery: formGallery,
      welcomeMessage: formWelcomeMessage || `¡Hola! Soy tu asesor virtual para ${formName}. ¿En qué te puedo colaborar hoy?`,
      welcomeMedia: formWelcomeMedia,
      entryQuestion: formEntryQuestion || `¿Deseas conocer más detalles o apartar tu pedido contra entrega?`,
      dataCollectionMode: formDataCollectionMode,
      botPersonality: formBotPersonality,
      rules: formRules,
      creationMode: viewState === 'prompt_mode' ? 'prompt' : 'guiado',
      customPrompt: formCustomPrompt,
      createdAt: new Date().toISOString()
    };

    if (editingProductId) {
      setProducts(prev => prev.map(p => p.id === editingProductId ? newProductObj : p));
    } else {
      setProducts(prev => [newProductObj, ...prev]);
    }

    setViewState('list');
    resetForm();
    alert('✅ ¡Producto guardado y sincronizado con el Bot de WhatsApp exitosamente!');
  };

  // AI helper generators
  const handleGenerateAIWelcome = () => {
    const prodName = formName || 'nuestro producto estrella';
    setFormWelcomeMessage(`¡Hola! 👋 Te habla Laura, asesora de ventas. Qué gusto saludarte. Vi que te interesó el *${prodName}*. ¿Quieres que te muestre los videos demostrativos y las promociones disponibles hoy?`);
  };

  const handleGenerateAIQuestion = () => {
    setFormEntryQuestion(`Te hablo no solo como asesora, sino como usuaria feliz del producto. ¿Lo usarás para uso personal o para un regalo especial? 😊`);
  };

  // Import Dropi Product by ID (Image 1)
  const handleImportDropi = () => {
    const idToUse = dropiProductId.trim() || '64917';
    setIsImportingDropi(true);
    setTimeout(() => {
      const dropiMock: CatalogProduct = {
        id: `DROPI-${idToUse}`,
        name: `Producto Dropi #${idToUse} - Smartwatch Ultra X8`,
        basicDescription: 'Reloj inteligente resistente al agua con monitor de salud, llamadas Bluetooth y pantalla HD importado desde Dropi.',
        features: 'Pantalla AMOLED 1.9", Batería 7 días, Resistencia IP68, Medidor de presión arterial, Notificaciones de WhatsApp.',
        problemsSolved: 'Monitorea tu salud 24/7 y atiende llamadas sin sacar tu celular del bolsillo.',
        benefits: 'Comodidad total al entrenar, estilo elegante y batería de larga duración.',
        differentiators: 'Incluye 2 correas de regalo y garantía de 1 año en Colombia con despacho Dropi.',
        price: 150000,
        offerPrice: 119900,
        stock: '35 unidades en bodega Dropi',
        isActive: true,
        isAvailableForBot: true,
        showInBotList: true,
        productType: 'simple',
        isPack: false,
        shippingProvider: 'Dropi (Despacho Automático)',
        shippingType: 'gratis',
        quantityOffers: [
          { id: '1', qty: 1, price: 119900, label: '1 Unidad x $119.900' },
          { id: '2', qty: 2, price: 199900, label: '2 Unidades x $199.900 (Ahorra $40.000)' }
        ],
        image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=400&q=80',
        gallery: [
          'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&w=400&q=80',
          'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=400&q=80'
        ],
        welcomeMessage: '¡Hola! ⌚ Te habla el asesor de ventas. Tenemos disponible el producto de Dropi con despacho inmediato y pago contra entrega en toda Colombia.',
        welcomeMedia: [],
        entryQuestion: '¿En qué ciudad te encuentras para confirmar cobertura de flete gratis?',
        dataCollectionMode: 'step_by_step',
        botPersonality: 'Asesor amable y profesional con enfoque en pago contra entrega y logística Dropi.',
        rules: [
          { id: 'r1', title: 'Objeción de precio', trigger: 'Cuando el cliente dice que está caro o pide descuento', response: 'Resalta el valor, la garantía oficial de 1 año y ofrece la promoción de 2 unidades con envío gratis.', icon: '💰' },
          { id: 'r2', title: 'Objeción de duda / desconfianza', trigger: 'Cuando desconfía de la calidad o pide garantía', response: 'Explica que tenemos pago contra entrega en toda Colombia: paga en efectivo solo cuando reciba el producto en su casa.', icon: '🧐' }
        ],
        creationMode: dropiWorkMode,
        customPrompt: `PRODUCTO: Smartwatch Ultra X8 Pro (ID Dropi: ${idToUse})
PRECIO: $119.900 COP con ENVÍO GRATIS y PAGO CONTRA ENTREGA en toda Colombia.
PROMO 2 UNIDADES: $199.900 COP (Ahorro de $40.000 COP).
CARACTERÍSTICAS: Pantalla AMOLED 1.9", Batería 7 días, Resistencia IP68, Medidor de presión arterial, Notificaciones de WhatsApp.
LOGÍSTICA: Despacho automático Dropi con Servientrega, Coordinadora, Envía o Interrapidísimo.
OBJETIVO: Pedir Ciudad, Nombre, Dirección y Teléfono para generar la guía Dropi contra entrega inmediatamente.`,
        createdAt: new Date().toISOString()
      };

      setProducts(prev => [dropiMock, ...prev]);
      setIsImportingDropi(false);
      setShowDropiModal(false);

      // Populate form and open appropriate mode
      setEditingProductId(dropiMock.id);
      setFormName(dropiMock.name);
      setFormBasicDesc(dropiMock.basicDescription);
      setFormFeatures(dropiMock.features);
      setFormProblemsSolved(dropiMock.problemsSolved || '');
      setFormBenefits(dropiMock.benefits);
      setFormDifferentiators(dropiMock.differentiators || '');
      setFormPrice(dropiMock.price);
      setFormOfferPrice(dropiMock.offerPrice);
      setFormStock(String(dropiMock.stock));
      setFormShippingProvider(dropiMock.shippingProvider);
      setFormShippingType(dropiMock.shippingType);
      setFormQuantityOffers(dropiMock.quantityOffers);
      setFormImage(dropiMock.image || '');
      setFormGallery(dropiMock.gallery || []);
      setFormWelcomeMessage(dropiMock.welcomeMessage);
      setFormEntryQuestion(dropiMock.entryQuestion);
      setFormDataCollectionMode(dropiMock.dataCollectionMode);
      setFormBotPersonality(dropiMock.botPersonality);
      setFormRules(dropiMock.rules);
      setFormCustomPrompt(dropiMock.customPrompt || '');

      if (dropiWorkMode === 'prompt') {
        setViewState('prompt_mode');
      } else {
        setViewState('wizard_step1');
      }
    }, 800);
  };

  // Metrics
  const totalCount = products.length;
  const activeCount = products.filter(p => p.isActive).length;
  const inactiveCount = products.filter(p => !p.isActive).length;
  const avgPrice = totalCount > 0
    ? Math.round(products.reduce((acc, p) => acc + (p.offerPrice || p.price), 0) / totalCount)
    : 0;

  // Filtered List
  const filteredProducts = products.filter(p => {
    if (filterTab === 'activos' && !p.isActive) return false;
    if (filterTab === 'inactivos' && p.isActive) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.basicDescription.toLowerCase().includes(q);
    }
    return true;
  });

  // Calculate pending items in wizard for the floating indicator
  const calculatePendingCount = () => {
    let count = 0;
    if (!formName.trim()) count++;
    if (!formBasicDesc.trim()) count++;
    if (!formFeatures.trim()) count++;
    if (!formBenefits.trim()) count++;
    if (formPrice <= 0) count++;
    return count;
  };

  const pendingCount = calculatePendingCount();

  // ==========================================
  // VIEW: 3-STEP ONBOARDING MODAL (IMAGE 3)
  // ==========================================
  const renderOnboardingModal = () => {
    if (!showOnboardingModal) return null;
    return (
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
        <div className="bg-zinc-950 border border-zinc-800 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl text-left relative space-y-6">
          <button
            onClick={() => setShowOnboardingModal(false)}
            className="absolute right-5 top-5 text-zinc-500 hover:text-white p-1 rounded-lg"
          >
            <X size={18} />
          </button>

          <div className="text-center space-y-2">
            <div className="text-4xl">🚀</div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Vamos a crear tu producto en 3 pasos
            </h2>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-md mx-auto">
              Hay 4 cosas que el bot necesita SÍ O SÍ para vender bien este producto. Sin ellas, puede dar precios mal o no contestar a tus clientes. Te las dejamos a la vista en el panel lateral mientras completás el wizard.
            </p>
          </div>

          <div className="space-y-3">
            <div className="p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-full bg-[#00c950]/15 text-[#00c950] flex items-center justify-center shrink-0 font-bold text-sm">
                $
              </div>
              <div className="text-xs">
                <h4 className="font-bold text-white">Precio y precio en oferta</h4>
                <p className="text-zinc-400 text-[11px] mt-0.5 leading-relaxed">
                  Son obligatorios los dos. Si no querés mostrar descuento, poné el mismo valor en ambos. Sin precio, el bot puede inventar cifras al cliente.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-full bg-[#00c950]/15 text-[#00c950] flex items-center justify-center shrink-0 font-bold text-sm">
                <ImageIcon size={15} />
              </div>
              <div className="text-xs">
                <h4 className="font-bold text-white">Al menos 1 foto del producto</h4>
                <p className="text-zinc-400 text-[11px] mt-0.5 leading-relaxed">
                  El bot la usa para mostrarle el producto al cliente desde el primer mensaje.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-full bg-[#00c950]/15 text-[#00c950] flex items-center justify-center shrink-0 font-bold text-sm">
                <Bot size={15} />
              </div>
              <div className="text-xs">
                <h4 className="font-bold text-white">Mensaje y fotos de bienvenida</h4>
                <p className="text-zinc-400 text-[11px] mt-0.5 leading-relaxed">
                  Es lo primero que ve el cliente cuando entra desde WhatsApp. Configurar esto sube mucho la conversión.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-full bg-[#00c950]/15 text-[#00c950] flex items-center justify-center shrink-0 font-bold text-sm">
                <Sparkles size={15} />
              </div>
              <div className="text-xs">
                <h4 className="font-bold text-white">Generar el guion con IA</h4>
                <p className="text-zinc-400 text-[11px] mt-0.5 leading-relaxed">
                  En el Paso 3 hay un botón "Generar con IA". Sin guion, el bot no tiene contexto del producto y suele inventar.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 gap-3">
            <button
              type="button"
              onClick={() => handleDismissOnboarding(true)}
              className="text-xs text-zinc-400 hover:text-white px-4 py-2.5 rounded-xl hover:bg-zinc-900 transition cursor-pointer"
            >
              Saltar (no mostrar más)
            </button>
            <button
              type="button"
              onClick={() => handleDismissOnboarding(false)}
              className="bg-[#00c950] hover:bg-[#00a843] text-zinc-950 font-bold text-xs px-6 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-emerald-500/10 cursor-pointer"
            >
              <span>Entendido, empezar</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ==========================================
  // VIEW: MODE SELECTION (IMAGE 4)
  // ==========================================
  if (viewState === 'mode_select') {
    return (
      <div className="space-y-6 animate-fade-in text-left max-w-4xl mx-auto py-4">
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
          <button
            type="button"
            onClick={() => setViewState('list')}
            className="flex items-center gap-2 text-zinc-400 hover:text-white text-xs font-semibold cursor-pointer"
          >
            <ArrowLeft size={16} /> Volver a Productos
          </button>
          <button
            type="button"
            onClick={() => setViewState('list')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white text-xs transition cursor-pointer"
          >
            <X size={14} /> Cancelar
          </button>
        </div>

        {/* Title */}
        <div className="text-center space-y-2 py-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            ¿Cómo querés crear este producto?
          </h1>
          <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
            Elegí el modo de trabajo. <strong className="text-zinc-200">No se puede cambiar después</strong> — si querés probar el otro modo, creá otro producto.
          </p>
        </div>

        {/* 2 Mode Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Guiado */}
          <div
            onClick={() => setViewState('wizard_step1')}
            className="bg-zinc-950 hover:bg-zinc-900/60 border border-zinc-800 hover:border-emerald-500/60 p-6 rounded-3xl transition cursor-pointer shadow-xl space-y-4 relative group"
          >
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                <Puzzle size={24} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                RECOMENDADO
              </span>
            </div>

            <div>
              <h3 className="text-lg font-bold text-white">Guiado</h3>
              <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                Cargás precio, ofertas, variantes, descripción y reglas en <strong>formularios paso a paso</strong>. El sistema arma el bot por vos, valida los datos y los mantiene siempre actualizados.
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t border-zinc-900 text-xs text-zinc-300">
              <div className="flex items-center gap-2">
                <Check size={14} className="text-emerald-400" />
                <span>Precios y ofertas validados por el sistema</span>
              </div>
              <div className="flex items-center gap-2">
                <Check size={14} className="text-emerald-400" />
                <span>Variantes con fotos por color/talla</span>
              </div>
              <div className="flex items-center gap-2">
                <Check size={14} className="text-emerald-400" />
                <span>Reglas personalizadas y generación del guion con IA</span>
              </div>
            </div>
          </div>

          {/* Card 2: Solo Prompt */}
          <div
            onClick={() => setViewState('prompt_mode')}
            className="bg-zinc-950 hover:bg-zinc-900/60 border border-zinc-800 hover:border-amber-500/60 p-6 rounded-3xl transition cursor-pointer shadow-xl space-y-4 relative group"
          >
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
                <Zap size={24} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                AVANZADO
              </span>
            </div>

            <div>
              <h3 className="text-lg font-bold text-white">Solo Prompt</h3>
              <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                Escribís <strong>UN solo prompt</strong> con toda la información: precios, ofertas por cantidad, variaciones, producto adicional y fotos (por URL). Ideal si ya tenés un prompt probado de otra plataforma.
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t border-zinc-900 text-xs text-zinc-300">
              <div className="flex items-center gap-2">
                <Check size={14} className="text-emerald-400" />
                <span>Control total: el bot sigue tu prompt al pie de la letra</span>
              </div>
              <div className="flex items-center gap-2">
                <Check size={14} className="text-emerald-400" />
                <span>Subís archivos y los llamás por URL dentro del prompt</span>
              </div>
              <div className="flex items-center gap-2 text-amber-300">
                <AlertTriangle size={14} className="shrink-0" />
                <span>Los precios los escribís vos — el sistema no los valida</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW: SOLO PROMPT MODE (AVANZADO)
  // ==========================================
  if (viewState === 'prompt_mode') {
    return (
      <div className="space-y-6 animate-fade-in text-left max-w-4xl mx-auto py-2">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <button onClick={() => setViewState('mode_select')} className="hover:text-white flex items-center gap-1">
              <ArrowLeft size={14} /> Volver
            </button>
            <span>/</span>
            <span className="text-white font-bold">Modo Solo Prompt</span>
          </div>
          <button
            onClick={() => setViewState('list')}
            className="text-xs text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800"
          >
            Cancelar
          </button>
        </div>

        <div className="bg-zinc-950 p-6 rounded-3xl border border-zinc-800 space-y-5">
          <div>
            <h2 className="text-xl font-bold text-white">Configuración mediante Prompt Completo</h2>
            <p className="text-xs text-zinc-400 mt-1">Escribe las instrucciones completas que el bot utilizará para vender este producto.</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1.5">Nombre del Producto *</label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Ej: Smartwatch Ultra X8"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:border-emerald-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">Precio Normal ($)</label>
              <input
                type="number"
                value={formPrice || ''}
                onChange={(e) => setFormPrice(Number(e.target.value))}
                placeholder="120000"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:border-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">Precio Oferta ($)</label>
              <input
                type="number"
                value={formOfferPrice || ''}
                onChange={(e) => setFormOfferPrice(Number(e.target.value))}
                placeholder="89900"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:border-emerald-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1.5">Prompt y Reglas de Venta *</label>
            <textarea
              rows={12}
              value={formCustomPrompt}
              onChange={(e) => setFormCustomPrompt(e.target.value)}
              placeholder="Escribe aquí todas las instrucciones, preguntas frecuentes, precios por cantidad, política de envío contra entrega y links de fotos..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-xs text-white font-mono focus:border-emerald-500 outline-none leading-relaxed"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-900">
            <button
              onClick={() => setViewState('list')}
              className="px-5 py-2.5 rounded-xl border border-zinc-800 text-xs font-semibold text-zinc-400 hover:text-white"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveProductFinal}
              className="px-6 py-2.5 rounded-xl bg-[#00c950] hover:bg-[#00a843] text-zinc-950 font-bold text-xs transition shadow-lg shadow-emerald-500/10"
            >
              Guardar Producto
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // WIZARD STEPPER HEADER (SHARED ACROSS STEPS)
  // ==========================================
  const renderWizardHeader = (currentStep: number) => {
    return (
      <div className="space-y-4 border-b border-zinc-800 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <button
              type="button"
              onClick={() => setViewState('list')}
              className="hover:text-white flex items-center gap-1.5 font-medium cursor-pointer"
            >
              <ArrowLeft size={16} /> Nuevo Producto
            </button>
            <span>•</span>
            <span className="text-zinc-500">Cambios sin guardar</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setViewState('list')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white text-xs transition cursor-pointer"
            >
              <X size={14} /> Cancelar
            </button>
          </div>
        </div>

        {/* Stepper Tabs (Images 5, 8, 10) */}
        <div className="flex items-center gap-6 text-xs font-semibold border-b border-zinc-850 pt-2 pb-px overflow-x-auto">
          <button
            type="button"
            onClick={() => setViewState('wizard_step1')}
            className={`pb-2.5 transition flex items-center gap-1.5 border-b-2 ${
              currentStep === 1
                ? 'border-[#00c950] text-[#00c950] font-bold'
                : currentStep > 1
                ? 'border-transparent text-emerald-400'
                : 'border-transparent text-zinc-500'
            }`}
          >
            {currentStep > 1 && <Check size={13} />}
            <span>Paso 1: Información del producto</span>
          </button>

          <button
            type="button"
            onClick={() => setViewState('wizard_step2')}
            className={`pb-2.5 transition flex items-center gap-1.5 border-b-2 ${
              currentStep === 2
                ? 'border-[#00c950] text-[#00c950] font-bold'
                : currentStep > 2
                ? 'border-transparent text-emerald-400'
                : 'border-transparent text-zinc-500'
            }`}
          >
            {currentStep > 2 && <Check size={13} />}
            <span>Paso 2: Mensaje de bienvenida</span>
          </button>

          <button
            type="button"
            onClick={() => setViewState('wizard_step3')}
            className={`pb-2.5 transition flex items-center gap-1.5 border-b-2 ${
              currentStep === 3
                ? 'border-[#00c950] text-[#00c950] font-bold'
                : 'border-transparent text-zinc-500'
            }`}
          >
            <span>Paso 3: Reglas y estilo del bot</span>
          </button>
        </div>
      </div>
    );
  };

  // ==========================================
  // VIEW: WIZARD STEP 1 (IMAGES 5, 6, 7)
  // ==========================================
  if (viewState === 'wizard_step1') {
    return (
      <div className="space-y-6 animate-fade-in text-left">
        {renderWizardHeader(1)}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Media & Gallery */}
          <div className="lg:col-span-4 space-y-5">
            <div className="bg-zinc-950 p-5 rounded-3xl border border-zinc-800 space-y-4 shadow-xl">
              <h3 className="text-sm font-bold text-white">Imágenes</h3>

              {/* Cover Photo */}
              <div
                onClick={() => {
                  const url = prompt('URL de la foto de portada:', formImage || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=400&q=80');
                  if (url) setFormImage(url);
                }}
                className="w-full h-48 rounded-2xl border-2 border-dashed border-zinc-800 hover:border-emerald-500/60 bg-zinc-900/60 flex flex-col items-center justify-center text-zinc-400 gap-2 cursor-pointer transition overflow-hidden relative group"
              >
                {formImage ? (
                  <>
                    <img src={formImage} alt="Portada" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition">
                      Cambiar foto
                    </div>
                  </>
                ) : (
                  <>
                    <ImageIcon size={32} className="text-zinc-600" />
                    <span className="text-xs font-semibold">Agregar imagen</span>
                  </>
                )}
              </div>

              {/* Gallery (0 / 50) */}
              <div className="space-y-2 pt-2 border-t border-zinc-900">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-300">Archivos del producto ({formGallery.length} / 50)</span>
                  <button
                    type="button"
                    onClick={() => {
                      const url = prompt('URL de imagen o archivo de galería:');
                      if (url) setFormGallery([...formGallery, url]);
                    }}
                    className="text-[11px] text-[#00c950] font-bold flex items-center gap-1 hover:underline"
                  >
                    + Agregar
                  </button>
                </div>

                <p className="text-[11px] text-zinc-500 leading-tight">
                  Subí la <strong className="text-amber-400">foto de portada</strong> y pulsá "Guardar y continuar" para habilitar esta galería.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Form Fields */}
          <div className="lg:col-span-8 space-y-6 bg-zinc-950 p-6 sm:p-8 rounded-3xl border border-zinc-800 shadow-xl">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white">Información Básica</h3>
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Nombre *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ej: Smartwatch Ultra X8"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:border-emerald-500 outline-none"
                  required
                />
              </div>
            </div>

            {/* How to describe product */}
            <div className="space-y-4 pt-4 border-t border-zinc-900">
              <div>
                <h4 className="text-sm font-bold text-white">Cómo describir tu producto</h4>
                <p className="text-xs text-zinc-400 mt-0.5">Mientras más completa esta info, mejor responde el bot. Las reglas custom van en el Paso 3.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Descripción básica *</label>
                <textarea
                  rows={2}
                  value={formBasicDesc}
                  onChange={(e) => setFormBasicDesc(e.target.value)}
                  placeholder="Ej: Smartwatch resistente al agua con monitor de pulso y GPS."
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-emerald-500 rounded-xl p-3 text-xs text-white outline-none"
                />
                <p className="text-[10px] text-zinc-500 mt-1">Una línea para que cualquiera entienda qué es el producto. Como si se lo dijeras a alguien que nunca lo ha visto.</p>
                <p className="text-[10px] text-red-400 font-medium">Este campo es obligatorio para que el bot tenga contexto.</p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-zinc-300">Características principales *</label>
                  <span className="text-[10px] text-zinc-500">{formFeatures.length} / 24000</span>
                </div>
                <textarea
                  rows={3}
                  value={formFeatures}
                  onChange={(e) => setFormFeatures(e.target.value)}
                  placeholder="Ej: Pantalla AMOLED 1.4&quot;. Batería 7 días. Resistente al agua IP68. Monitor de pulso 24/7."
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-emerald-500 rounded-xl p-3 text-xs text-white outline-none"
                />
                <p className="text-[10px] text-zinc-500 mt-1">Las características que importan. El bot las usa para responder dudas técnicas.</p>
                <p className="text-[10px] text-red-400 font-medium">Este campo es obligatorio para que el bot tenga contexto.</p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-zinc-300">Qué problemas resuelve <span className="text-zinc-500 font-normal">(Opcional)</span></label>
                  <span className="text-[10px] text-zinc-500">{formProblemsSolved.length} / 24000</span>
                </div>
                <textarea
                  rows={2}
                  value={formProblemsSolved}
                  onChange={(e) => setFormProblemsSolved(e.target.value)}
                  placeholder="Ej: No tenés que cargarlo todos los días. Cuidás tu corazón sin ir al médico. Recibís notificaciones sin sacar el celular."
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-emerald-500 rounded-xl p-3 text-xs text-white outline-none"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-zinc-300">Beneficios para el cliente *</label>
                  <span className="text-[10px] text-zinc-500">{formBenefits.length} / 24000</span>
                </div>
                <textarea
                  rows={2}
                  value={formBenefits}
                  onChange={(e) => setFormBenefits(e.target.value)}
                  placeholder="Ej: Más libertad para entrenar. Tranquilidad de saber tu pulso siempre. Te ves bien en cualquier outfit."
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-emerald-500 rounded-xl p-3 text-xs text-white outline-none"
                />
                <p className="text-[10px] text-zinc-500 mt-1">Qué gana tu cliente al comprar. En primera persona del cliente.</p>
                <p className="text-[10px] text-red-400 font-medium">Este campo es obligatorio para que el bot tenga contexto.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Diferenciales frente a la competencia <span className="text-zinc-500 font-normal">(Opcional)</span></label>
                <textarea
                  rows={2}
                  value={formDifferentiators}
                  onChange={(e) => setFormDifferentiators(e.target.value)}
                  placeholder="Ej: La batería dura el doble que otros del mismo precio. Único con garantía de 1 año en Colombia."
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-emerald-500 rounded-xl p-3 text-xs text-white outline-none"
                />
              </div>
            </div>

            {/* Pricing & Stock */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-zinc-900">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Precio $*</label>
                <input
                  type="number"
                  value={formPrice || ''}
                  onChange={(e) => setFormPrice(Number(e.target.value))}
                  placeholder="0"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:border-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Precio en oferta $*</label>
                <input
                  type="number"
                  value={formOfferPrice || ''}
                  onChange={(e) => setFormOfferPrice(Number(e.target.value))}
                  placeholder="0"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:border-emerald-500 outline-none"
                />
                <p className="text-[10px] text-red-400 mt-1">Obligatorio. Si no hay descuento, poné el mismo valor que el precio normal.</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Stock</label>
                <input
                  type="text"
                  value={formStock}
                  onChange={(e) => setFormStock(e.target.value)}
                  placeholder="Sin track"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:border-emerald-500 outline-none"
                />
              </div>
            </div>

            {/* Product Type (Simple vs Variantes) */}
            <div className="space-y-3 pt-4 border-t border-zinc-900">
              <label className="block text-xs font-bold text-zinc-300">Tipo de producto</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div
                  onClick={() => setFormProductType('simple')}
                  className={`p-4 rounded-2xl border transition cursor-pointer ${
                    formProductType === 'simple'
                      ? 'bg-zinc-900 border-[#00c950] ring-1 ring-[#00c950]/40'
                      : 'bg-zinc-950 border-zinc-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-white">Producto simple</span>
                    {formProductType === 'simple' && <span className="w-2 h-2 rounded-full bg-[#00c950]"></span>}
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-1">Un solo precio y stock. Ej: una taza, un libro.</p>
                </div>

                <div
                  onClick={() => setFormProductType('variantes')}
                  className={`p-4 rounded-2xl border transition cursor-pointer ${
                    formProductType === 'variantes'
                      ? 'bg-zinc-900 border-[#00c950] ring-1 ring-[#00c950]/40'
                      : 'bg-zinc-950 border-zinc-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-white">Producto con variantes</span>
                    {formProductType === 'variantes' && <span className="w-2 h-2 rounded-full bg-[#00c950]"></span>}
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-1">Color, talla, diseño. Cada combinación con su precio, stock y foto.</p>
                </div>
              </div>
            </div>

            {/* Carrier & Shipping Options */}
            <div className="space-y-4 pt-4 border-t border-zinc-900">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Proveedor de envío</label>
                <select
                  value={formShippingProvider}
                  onChange={(e) => setFormShippingProvider(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:border-emerald-500 outline-none"
                >
                  <option value="Ninguno (no sincronizar pedidos)">Ninguno (no sincronizar pedidos)</option>
                  <option value="Dropi">Dropi (Contra Entrega Oficial)</option>
                  <option value="Effix">Effix</option>
                  <option value="Hoko">Hoko</option>
                  <option value="Servientrega">Servientrega</option>
                  <option value="Coordinadora">Coordinadora</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-2">Envío</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'gratis', label: 'Envío gratis', desc: 'El cliente no paga flete.' },
                    { id: 'fijo', label: 'Costo fijo', desc: 'Un flete fijo que vos definís.' },
                    { id: 'condicional', label: 'Gratis con condición', desc: 'Gratis si compra cierta cantidad o monto.' }
                  ].map((st) => (
                    <div
                      key={st.id}
                      onClick={() => setFormShippingType(st.id as any)}
                      className={`p-3 rounded-2xl border transition cursor-pointer ${
                        formShippingType === st.id
                          ? 'bg-zinc-900 border-[#00c950] ring-1 ring-[#00c950]/40'
                          : 'bg-zinc-950 border-zinc-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-white">{st.label}</span>
                        {formShippingType === st.id && <span className="w-1.5 h-1.5 rounded-full bg-[#00c950]"></span>}
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-1">{st.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quantity Offers */}
            <div className="space-y-3 pt-4 border-t border-zinc-900">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-zinc-300">Ofertas por cantidad</label>
                <button
                  type="button"
                  onClick={() => {
                    const qty = Number(prompt('Cantidad de unidades (ej: 2):', '2'));
                    const price = Number(prompt('Precio total de la oferta (ej: 139900):', '139900'));
                    if (qty && price) {
                      setFormQuantityOffers([
                        ...formQuantityOffers,
                        { id: `off-${Date.now()}`, qty, price, label: `${qty} Unidades x $${price.toLocaleString()} COP` }
                      ]);
                    }
                  }}
                  className="text-[11px] text-[#00c950] font-bold flex items-center gap-1 hover:underline"
                >
                  + Agregar oferta
                </button>
              </div>

              {formQuantityOffers.length === 0 ? (
                <p className="text-xs text-zinc-500 italic py-2">Sin ofertas. Pulsa "+ Agregar oferta" para añadir descuentos por 2 o 3 unidades.</p>
              ) : (
                <div className="space-y-2">
                  {formQuantityOffers.map((off) => (
                    <div key={off.id} className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs">
                      <span className="text-white font-bold">{off.label}</span>
                      <button
                        type="button"
                        onClick={() => setFormQuantityOffers(formQuantityOffers.filter(o => o.id !== off.id))}
                        className="text-red-400 hover:text-red-300 text-xs"
                      >
                        Eliminar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bot Configuration Switches */}
            <div className="space-y-4 pt-4 border-t border-zinc-900">
              <h4 className="text-sm font-bold text-white">Configuración Bot</h4>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800/80">
                <div>
                  <span className="font-bold text-xs text-white block">Disponible para el bot</span>
                  <span className="text-[11px] text-zinc-400 block mt-0.5">Permite que el bot reconozca este producto, responda consultas y tome pedidos sobre él.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setFormIsAvailableForBot(!formIsAvailableForBot)}
                  className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 shrink-0 cursor-pointer ${
                    formIsAvailableForBot ? 'bg-[#00c950]' : 'bg-zinc-800'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white transition-transform duration-200 ${formIsAvailableForBot ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800/80">
                <div>
                  <span className="font-bold text-xs text-white block">Mostrar en listado del bot</span>
                  <span className="text-[11px] text-zinc-400 block mt-0.5">Cuando el bot no sabe qué producto quiere el cliente, mostrará este producto en el menú de opciones.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setFormShowInBotList(!formShowInBotList)}
                  className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 shrink-0 cursor-pointer ${
                    formShowInBotList ? 'bg-[#00c950]' : 'bg-zinc-800'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white transition-transform duration-200 ${formShowInBotList ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex justify-between items-center pt-6 border-t border-zinc-900">
              <button
                type="button"
                onClick={() => setViewState('list')}
                className="text-xs text-zinc-400 hover:text-white px-4 py-2.5 font-semibold transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!formName.trim()) {
                    alert('Ingresa el nombre del producto para continuar.');
                    return;
                  }
                  setViewState('wizard_step2');
                }}
                className="bg-[#00c950] hover:bg-[#00a843] text-zinc-950 font-bold text-xs px-6 py-2.5 rounded-xl transition flex items-center gap-2 shadow-lg shadow-emerald-500/10 cursor-pointer"
              >
                <span>Guardar y continuar</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW: WIZARD STEP 2 (IMAGES 8, 9)
  // ==========================================
  if (viewState === 'wizard_step2') {
    return (
      <div className="space-y-6 animate-fade-in text-left max-w-4xl mx-auto py-2">
        {renderWizardHeader(2)}

        <div className="bg-zinc-950 p-6 sm:p-8 rounded-3xl border border-zinc-800 shadow-xl space-y-6">
          <div>
            <h2 className="text-xl font-bold text-white">Mensaje de bienvenida</h2>
            <p className="text-xs text-zinc-400 mt-1">Configura la secuencia de bienvenida que el bot enviará cuando un cliente nuevo escriba por este producto.</p>
          </div>

          {/* Mensaje Inicial */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-xs font-bold text-zinc-300">Mensaje inicial</label>
                <span className="text-[11px] text-zinc-500">El primer texto que verá el cliente</span>
              </div>
              <button
                type="button"
                onClick={handleGenerateAIWelcome}
                className="bg-[#00c950] hover:bg-[#00a843] text-zinc-950 text-[11px] font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-sm"
              >
                <Sparkles size={12} /> Generar con IA
              </button>
            </div>

            <textarea
              rows={4}
              value={formWelcomeMessage}
              onChange={(e) => setFormWelcomeMessage(e.target.value)}
              placeholder="Ej: Hola, soy Laura. Espero que estés súper. ¿En qué te colaboro hoy con tu compra?"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 text-xs text-white focus:border-emerald-500 outline-none leading-relaxed"
            />
            <div className="text-right text-[10px] text-zinc-500">{formWelcomeMessage.length} / 1000</div>
          </div>

          {/* Multimedia Inicial Callout */}
          <div className="space-y-3 pt-2">
            <label className="block text-xs font-bold text-zinc-300">Contenido multimedia inicial</label>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              👆 Hacé click en cada miniatura para elegir qué fotos/videos envía el bot después del saludo. Aparecerá un número verde indicando el orden. Después podés arrastrarlas para reordenar.
            </p>

            <div className="p-4 rounded-2xl bg-[#091e3a]/80 border border-blue-500/30 text-blue-200 text-xs flex items-start gap-3">
              <span className="text-lg">👇</span>
              <div>
                <p className="font-bold text-blue-100">Tocá las miniaturas de abajo para elegir cuáles se envían al cliente</p>
                <p className="text-[11px] text-blue-300/80 mt-0.5">
                  Si no elegís ninguna, el bot enviará solo el mensaje de texto sin archivos. Podés elegir varias (en el orden que quieras) y reordenarlas arrastrando.
                </p>
              </div>
            </div>

            {formImage && (
              <div className="p-3 bg-zinc-900 border border-emerald-500/50 rounded-2xl inline-flex items-center gap-3">
                <img src={formImage} alt="Foto portada" className="w-14 h-14 object-cover rounded-xl border border-zinc-700" />
                <div className="text-xs">
                  <span className="font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 size={13} /> Foto principal seleccionada
                  </span>
                  <span className="text-[10px] text-zinc-400">Se enviará como imagen adjunta</span>
                </div>
              </div>
            )}
          </div>

          {/* Pregunta de Entrada */}
          <div className="space-y-2 pt-4 border-t border-zinc-900">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-xs font-bold text-zinc-300">Pregunta de entrada</label>
                <span className="text-[11px] text-zinc-500">Pregunta que invita al cliente a conversar</span>
              </div>
              <button
                type="button"
                onClick={handleGenerateAIQuestion}
                className="bg-[#00c950] hover:bg-[#00a843] text-zinc-950 text-[11px] font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-sm"
              >
                <Sparkles size={12} /> Generar con IA
              </button>
            </div>

            <textarea
              rows={3}
              value={formEntryQuestion}
              onChange={(e) => setFormEntryQuestion(e.target.value)}
              placeholder="Ej: Te hablo no solo como asesora, sino como mamá. ¿Lo usarás para tu bebé o para un familiar?"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 text-xs text-white focus:border-emerald-500 outline-none leading-relaxed"
            />
            <div className="text-right text-[10px] text-zinc-500">{formEntryQuestion.length} / 1000</div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center pt-6 border-t border-zinc-900">
            <button
              type="button"
              onClick={() => setViewState('wizard_step1')}
              className="text-xs text-zinc-400 hover:text-white px-4 py-2.5 font-semibold rounded-xl border border-zinc-800 hover:bg-zinc-900 transition flex items-center gap-1.5"
            >
              <ArrowLeft size={14} /> Anterior
            </button>
            <button
              type="button"
              onClick={() => setViewState('wizard_step3')}
              className="bg-[#00c950] hover:bg-[#00a843] text-zinc-950 font-bold text-xs px-6 py-2.5 rounded-xl transition flex items-center gap-2 shadow-lg shadow-emerald-500/10 cursor-pointer"
            >
              <span>Guardar y continuar</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW: WIZARD STEP 3 (IMAGES 10, 11, 12, 13)
  // ==========================================
  if (viewState === 'wizard_step3') {
    return (
      <div className="space-y-6 animate-fade-in text-left max-w-4xl mx-auto py-2">
        {renderWizardHeader(3)}

        <div className="bg-zinc-950 p-6 sm:p-8 rounded-3xl border border-zinc-800 shadow-xl space-y-7">
          {/* Data Collection Mode (Image 10) */}
          <div className="space-y-3">
            <h3 className="text-base font-bold text-white">¿Cómo pide el bot los datos del cliente?</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Cuando el cliente está listo para cerrar el pedido, el bot necesita recolectar nombres, apellidos, teléfono, departamento, ciudad, dirección y complemento. Elegí cómo los pide.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div
                onClick={() => setFormDataCollectionMode('single_message')}
                className={`p-4 rounded-2xl border transition cursor-pointer ${
                  formDataCollectionMode === 'single_message'
                    ? 'bg-zinc-900 border-[#00c950] ring-1 ring-[#00c950]/40'
                    : 'bg-zinc-950 border-zinc-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-white">Todos los datos en un solo mensaje</span>
                  {formDataCollectionMode === 'single_message' && <span className="w-2 h-2 rounded-full bg-[#00c950]"></span>}
                </div>
                <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                  El bot pide todos los datos juntos con bullets. Más rápido para cerrar pero el cliente puede saltearse campos (se preguntan los faltantes).
                </p>
              </div>

              <div
                onClick={() => setFormDataCollectionMode('step_by_step')}
                className={`p-4 rounded-2xl border transition cursor-pointer ${
                  formDataCollectionMode === 'step_by_step'
                    ? 'bg-zinc-900 border-[#00c950] ring-1 ring-[#00c950]/40'
                    : 'bg-zinc-950 border-zinc-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-white">Paso a paso</span>
                  {formDataCollectionMode === 'step_by_step' && <span className="w-2 h-2 rounded-full bg-[#00c950]"></span>}
                </div>
                <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                  El bot pide los datos uno por uno, en orden. Más conversacional pero toma más turnos.
                </p>
              </div>
            </div>
          </div>

          {/* Info callout on how guided mode works (Image 11) */}
          <div className="p-4 rounded-2xl bg-[#091e3a]/80 border border-blue-500/30 text-blue-200 text-xs leading-relaxed space-y-1">
            <p className="font-bold text-blue-100 flex items-center gap-1.5">
              <span>ℹ️</span> Cómo funciona el modo guiado
            </p>
            <p className="text-[11px] text-blue-300/90 leading-relaxed">
              El bot ya sabe <strong>vender tu producto</strong> con los datos del Paso 1 (precio, ofertas, variantes) — no necesitás escribir ningún prompt.
            </p>
            <p className="text-[11px] text-blue-300/90 leading-relaxed">
              Acá configurás <strong>reglas</strong>: "cuando pase X, que el bot envíe Y" — un texto, un texto con archivo, o solo un archivo. Y opcionalmente la <strong>personalidad</strong> (tono y estilo) del asistente.
            </p>
          </div>

          {/* Personalidad y estilo de venta (Image 12) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-base">💬</span>
              <h4 className="text-sm font-bold text-white">Personalidad y estilo de venta</h4>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30 uppercase">
                SIEMPRE ACTIVO
              </span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Definí <strong>cómo suena</strong> tu asistente: tono, actitud, forma de vender y datos extra de la marca. Aplica al estilo de TODAS las respuestas — funciona con el Modo Router IA encendido o apagado. No escribas precios ni variantes acá (esos viven en el Paso 1).
            </p>

            <textarea
              rows={4}
              value={formBotPersonality}
              onChange={(e) => setFormBotPersonality(e.target.value)}
              placeholder="Ej: Sé cercano y cálido, tuteá al cliente y usá emojis con moderación. Somos una marca colombiana enfocada en bienestar femenino natural..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 text-xs text-white focus:border-emerald-500 outline-none leading-relaxed"
            />
            <div className="flex justify-between items-center text-[10px] text-zinc-500">
              <span>Tip: hablale al bot como le explicarías a un vendedor nuevo cómo es tu marca.</span>
              <span>{formBotPersonality.length} / 2000</span>
            </div>
          </div>

          {/* Reglas de comportamiento (Image 13) */}
          <div className="space-y-4 pt-4 border-t border-zinc-900">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white">Reglas</h4>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Definí qué hace el bot ante situaciones puntuales: <strong>cuando pase X, que envíe Y</strong>. La respuesta puede ser un texto, un texto con un archivo, o solo un archivo.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const title = prompt('Nombre de la regla (ej: Pregunta por envíos gratis):');
                  const trigger = prompt('¿Cuándo se dispara esta regla?:');
                  const response = prompt('¿Qué debe responder el bot?:');
                  if (title && response) {
                    setFormRules([...formRules, { id: `rule-${Date.now()}`, title, trigger: trigger || '', response, icon: '✏️' }]);
                  }
                }}
                className="bg-[#00c950] hover:bg-[#00a843] text-zinc-950 text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-sm shrink-0"
              >
                <Plus size={14} /> Agregar regla custom
              </button>
            </div>

            {/* 6 Grid rule cards as in screenshot 13 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {[
                { title: 'Objeción de precio', desc: 'Cuando el cliente dice que está caro o pide descuento', icon: '💰' },
                { title: 'Objeción de duda / desconfianza', desc: 'Cuando desconfía de la calidad o pide garantía', icon: '🧐' },
                { title: 'No responde / desapareció', desc: 'Cuando dejó de responder por más de 1 hora', icon: '😴' },
                { title: 'Enviar archivo específico', desc: 'Cuando pide catálogo, ficha técnica o foto específica', icon: '📎' },
                { title: 'Contar historia / testimonio', desc: 'Para dar testimonios o casos reales cuando duda al cerrar', icon: '📖' },
                { title: 'Regla personalizada (libre)', desc: 'Para casos específicos no cubiertos arriba', icon: '✏️' }
              ].map((rc, i) => (
                <div
                  key={i}
                  onClick={() => {
                    const customResp = prompt(`Respuesta para "${rc.title}":`);
                    if (customResp) {
                      setFormRules([...formRules, { id: `r-${i}-${Date.now()}`, title: rc.title, trigger: rc.desc, response: customResp, icon: rc.icon }]);
                      alert(`Regla "${rc.title}" guardada.`);
                    }
                  }}
                  className="p-4 rounded-2xl bg-zinc-900/80 hover:bg-zinc-900 border border-zinc-800 hover:border-emerald-500/60 transition cursor-pointer space-y-2 shadow-sm"
                >
                  <div className="text-xl">{rc.icon}</div>
                  <h5 className="font-bold text-xs text-white leading-tight">{rc.title}</h5>
                  <p className="text-[11px] text-zinc-400 leading-snug">{rc.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Final Navigation Buttons */}
          <div className="flex justify-between items-center pt-6 border-t border-zinc-900">
            <button
              type="button"
              onClick={() => setViewState('wizard_step2')}
              className="text-xs text-zinc-400 hover:text-white px-4 py-2.5 font-semibold rounded-xl border border-zinc-800 hover:bg-zinc-900 transition flex items-center gap-1.5"
            >
              <ArrowLeft size={14} /> Anterior
            </button>
            <button
              type="button"
              onClick={handleSaveProductFinal}
              className="bg-[#00c950] hover:bg-[#00a843] text-zinc-950 font-bold text-xs px-8 py-3 rounded-xl transition flex items-center gap-2 shadow-xl shadow-emerald-500/20 cursor-pointer active:scale-[0.99]"
            >
              <Check size={16} /> Guardar y finalizar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // MAIN VIEW: PRODUCTOS · CATÁLOGO (IMAGE 2)
  // ==========================================
  return (
    <div className="space-y-6 animate-fade-in text-left">
      {/* View Header (Image 2) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-baseline gap-2">
            <span>Productos</span>
            <span className="text-zinc-600 font-light">•</span>
            <span className="font-serif italic font-normal text-emerald-400">Catálogo</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            {products.length} productos • el bot usa esta info para vender.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowDropiModal(true)}
            className="px-3.5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-xs font-semibold transition flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <Download size={14} />
            <span>Importar Dropi</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const dummyUrl = prompt('Ingresa la URL de catálogo o carga de archivo CSV:');
              if (dummyUrl) alert('Catálogo procesado con éxito.');
            }}
            className="px-3.5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-xs font-semibold transition flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <Upload size={14} />
            <span>Importar</span>
          </button>

          <button
            type="button"
            onClick={handleStartNewProduct}
            className="px-4 py-2.5 rounded-xl bg-[#00c950] hover:bg-[#00a843] text-zinc-950 font-bold text-xs transition flex items-center gap-1.5 shadow-lg shadow-emerald-500/10 cursor-pointer"
          >
            <Plus size={15} />
            <span>Nuevo producto</span>
          </button>
        </div>
      </div>

      {/* 4 Top Metric Cards (Image 2) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Productos */}
        <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between shadow-md">
          <div>
            <p className="text-[11px] font-medium text-zinc-400">Total Productos</p>
            <p className="text-2xl font-bold text-white mt-1 font-mono">{totalCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <Package size={18} />
          </div>
        </div>

        {/* Card 2: Productos Activos */}
        <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between shadow-md">
          <div>
            <p className="text-[11px] font-medium text-zinc-400">Productos Activos</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1 font-mono">{activeCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <CheckCircle2 size={18} />
          </div>
        </div>

        {/* Card 3: Productos Inactivos */}
        <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between shadow-md">
          <div>
            <p className="text-[11px] font-medium text-zinc-400">Productos Inactivos</p>
            <p className="text-2xl font-bold text-zinc-400 mt-1 font-mono">{inactiveCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
            <PauseCircle size={18} />
          </div>
        </div>

        {/* Card 4: Precio Promedio */}
        <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between shadow-md">
          <div>
            <p className="text-[11px] font-medium text-zinc-400">Precio Promedio</p>
            <p className="text-2xl font-bold text-blue-400 mt-1 font-mono">${avgPrice.toLocaleString()} COP</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
            <DollarSign size={18} />
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar (Image 2) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFilterTab('todos')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
              filterTab === 'todos'
                ? 'bg-white text-zinc-950 font-bold shadow-sm'
                : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
            }`}
          >
            Todos • {totalCount}
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('activos')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
              filterTab === 'activos'
                ? 'bg-white text-zinc-950 font-bold shadow-sm'
                : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
            }`}
          >
            Activos • {activeCount}
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('inactivos')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
              filterTab === 'inactivos'
                ? 'bg-white text-zinc-950 font-bold shadow-sm'
                : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
            }`}
          >
            Inactivos • {inactiveCount}
          </button>
        </div>

        <div className="relative min-w-[260px]">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar producto..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Main Content: Empty State vs Products Grid (Image 2) */}
      {filteredProducts.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center text-center space-y-4 bg-zinc-950/40 border border-zinc-900 rounded-3xl">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 shadow-lg">
            <Package size={30} />
          </div>

          <div className="space-y-1">
            <h3 className="text-xl font-serif italic text-white">No hay productos aún</h3>
            <p className="text-xs text-zinc-400 max-w-sm">
              Crea tu primer producto y el bot lo usará para vender automáticamente.
            </p>
          </div>

          <button
            type="button"
            onClick={handleStartNewProduct}
            className="px-5 py-2.5 rounded-xl bg-[#00c950] hover:bg-[#00a843] text-zinc-950 font-bold text-xs transition flex items-center gap-1.5 shadow-lg shadow-emerald-500/10 cursor-pointer"
          >
            <Plus size={15} />
            <span>Crear primer producto</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProducts.map((prod) => (
            <div
              key={prod.id}
              className="bg-zinc-950 border border-zinc-800/90 rounded-2xl p-5 space-y-4 shadow-xl flex flex-col justify-between hover:border-zinc-700 transition"
            >
              <div>
                <div className="flex items-start gap-3">
                  <img
                    src={prod.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=150&q=80'}
                    alt={prod.name}
                    className="w-16 h-16 rounded-xl object-cover bg-zinc-900 border border-zinc-800 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="font-bold text-sm text-white truncate">{prod.name}</h4>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        prod.isActive
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}>
                        {prod.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                      {prod.basicDescription}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-zinc-900 text-xs">
                  <div>
                    <span className="text-[10px] text-zinc-500 block">Precio Oferta</span>
                    <span className="font-bold text-emerald-400 font-mono text-sm">
                      ${(prod.offerPrice || prod.price).toLocaleString()} COP
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 block">Stock</span>
                    <span className="text-zinc-300 font-medium truncate block">
                      {prod.stock}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-zinc-900 text-xs">
                <button
                  type="button"
                  onClick={() => handleToggleProductStatus(prod.id)}
                  className="text-xs font-semibold text-zinc-400 hover:text-white flex items-center gap-1.5"
                >
                  <span className={`w-2 h-2 rounded-full ${prod.isActive ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                  <span>{prod.isActive ? 'Pausar' : 'Activar'}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleEditProduct(prod)}
                    className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900 transition"
                    title="Editar producto"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteProduct(prod.id)}
                    className="p-1.5 text-zinc-400 hover:text-red-400 rounded-lg hover:bg-zinc-900 transition"
                    title="Eliminar producto"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Render Onboarding Modal */}
      {renderOnboardingModal()}

      {/* Dropi Import Modal (Image 1 Exact Replication) */}
      {showDropiModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#0b0f14] border border-zinc-800 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-5 text-left relative">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Importar desde Dropi
                </h2>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  Ingresa el ID del producto en Dropi para importarlo directamente con todas sus imagenes y variaciones.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDropiModal(false)}
                className="text-zinc-500 hover:text-white p-1 rounded-lg transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Input: ID del producto en Dropi */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-zinc-200">
                ID del producto en Dropi
              </label>
              <input
                type="text"
                value={dropiProductId}
                onChange={(e) => setDropiProductId(e.target.value)}
                placeholder="Ej: 64917"
                className="w-full bg-[#111923] border-2 border-emerald-500 rounded-xl px-4 py-3 text-sm text-white font-medium focus:outline-none focus:border-emerald-400 font-mono shadow-inner"
              />
            </div>

            {/* Info box (Como obtener el ID) */}
            <div className="p-4 rounded-2xl bg-[#091527] border border-[#1e3b68] flex items-start gap-3 text-xs">
              <div className="w-5 h-5 rounded-full bg-[#3b82f6]/20 text-[#60a5fa] flex items-center justify-center shrink-0 mt-0.5">
                <HelpCircle size={13} />
              </div>
              <div className="space-y-1 text-blue-200/90 text-xs">
                <h5 className="font-bold text-[#60a5fa]">Como obtener el ID</h5>
                <ul className="space-y-1 text-[11px] text-blue-100/80">
                  <li>• Ve a <strong className="text-white font-semibold">app.dropi.co</strong> y abre el producto</li>
                  <li>• El ID aparece arriba (ej: ID: 64917) o en la URL: <span className="font-mono text-blue-300">.../product-details/{dropiProductId || '64917'}/...</span></li>
                </ul>
              </div>
            </div>

            {/* Selection: ¿Cómo querés trabajar este producto? */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-white">
                ¿Cómo querés trabajar este producto?
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Card 1: Guiado */}
                <div
                  onClick={() => setDropiWorkMode('guiado')}
                  className={`p-4 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between space-y-2 ${
                    dropiWorkMode === 'guiado'
                      ? 'border-[#00c950] bg-emerald-950/20 shadow-md shadow-emerald-500/10'
                      : 'border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <Puzzle size={16} />
                    </div>
                    <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      RECOMENDADO
                    </span>
                  </div>

                  <div>
                    <h5 className="font-bold text-xs text-white">Guiado</h5>
                    <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                      Cargás precio, ofertas y variantes en formularios paso a paso.
                    </p>
                  </div>
                </div>

                {/* Card 2: Solo Prompt */}
                <div
                  onClick={() => setDropiWorkMode('prompt')}
                  className={`p-4 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between space-y-2 ${
                    dropiWorkMode === 'prompt'
                      ? 'border-[#00c950] bg-emerald-950/20 shadow-md shadow-emerald-500/10'
                      : 'border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                      <Zap size={16} />
                    </div>
                    <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-400 border border-zinc-700">
                      AVANZADO
                    </span>
                  </div>

                  <div>
                    <h5 className="font-bold text-xs text-white">Solo Prompt</h5>
                    <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                      Todo en un prompt. Armamos uno base con los datos de Dropi y lo editás.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-900">
              <button
                type="button"
                onClick={() => setShowDropiModal(false)}
                className="px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-300 hover:text-white transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleImportDropi}
                disabled={isImportingDropi}
                className="px-6 py-2.5 rounded-xl bg-[#00c950] hover:bg-[#00a843] text-zinc-950 font-bold text-xs flex items-center gap-1.5 transition shadow-lg shadow-emerald-500/10 cursor-pointer disabled:opacity-50"
              >
                {isImportingDropi ? (
                  <>
                    <RotateCcw size={14} className="animate-spin" />
                    <span>Importando...</span>
                  </>
                ) : (
                  <span>Importar producto</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

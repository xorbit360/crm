import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  RefreshCw, 
  MessageSquare, 
  Zap, 
  Package, 
  AlertTriangle, 
  Search, 
  Check, 
  X, 
  Edit3, 
  Trash2, 
  Image as ImageIcon, 
  Smile, 
  Paperclip, 
  Send, 
  CornerDownRight, 
  Clock, 
  FileText, 
  ArrowLeft, 
  Save, 
  Sliders, 
  Sparkles,
  ExternalLink,
  ChevronRight,
  Truck
} from 'lucide-react';
import { formatLocalTime } from '../utils/timezone';

export interface MetaTemplate {
  id: string;
  name: string;
  slug: string;
  category: 'Utilidad' | 'Marketing' | 'Autenticación';
  status: 'Sin enviar' | 'Pendiente' | 'Aprobada' | 'Rechazada';
  version: string;
  hasImage?: boolean;
  headerText?: string;
  bodyText: string;
  footerText?: string;
  buttons?: Array<{ id: string; text: string; type: 'QUICK_REPLY' | 'URL' | 'PHONE'; value?: string }>;
  language: string;
  createdAt: string;
}

export interface TrackingTrigger {
  id: string;
  dropiStatus: string;
  label: string;
  templateSlug: string;
  templateName: string;
  enabled: boolean;
  metaApproved: boolean;
}

const DEFAULT_TEMPLATES: MetaTemplate[] = [
  {
    id: 'tpl-01',
    name: 'Aviso: un cliente necesita ayuda',
    slug: 'asesor_necesario',
    category: 'Utilidad',
    status: 'Sin enviar',
    version: 'v1 en revisión',
    hasImage: false,
    headerText: 'Un cliente necesita tu ayuda',
    bodyText: 'Hola 👋\n\nEl asistente no supo responderle a {{nombre_cliente}} y le dijo que iba a consultar.\n\nSu pregunta fue: "{{pregunta_cliente}}"\n\nEntra a Xorbit CRM para responderle antes de que se enfrie la venta.',
    footerText: 'Xorbit CRM - Aviso automatico',
    language: 'es',
    createdAt: new Date().toISOString()
  },
  {
    id: 'tpl-02',
    name: 'Confirmacion con imagen',
    slug: 'confirmacion_con_imagen',
    category: 'Utilidad',
    status: 'Sin enviar',
    version: 'v1 en revisión',
    hasImage: true,
    bodyText: 'Hola {{nombre_contacto}} 👋\n\nRecibimos tu pedido de {{producto}} por {{valor_pedido}} .\n\n📍 Direccion de envio: {{ciudad}}\n\nPor favor confirma que todos los datos son correctos para poder despachar tu pedido lo antes posible.',
    footerText: 'Tienda - Gestion de pedidos',
    buttons: [
      { id: 'b1', text: 'Confirmar envio', type: 'QUICK_REPLY' },
      { id: 'b2', text: 'Corregir datos', type: 'QUICK_REPLY' }
    ],
    language: 'es',
    createdAt: new Date().toISOString()
  },
  {
    id: 'tpl-03',
    name: 'Confirmacion de pedido',
    slug: 'confirmacion_sin_imagen',
    category: 'Utilidad',
    status: 'Sin enviar',
    version: 'v1 en revisión',
    hasImage: false,
    headerText: 'Confirmación de pedido',
    bodyText: 'Hola {{nombre_contacto}} 👋\n\n¡Gracias por tu compra! Recibimos tu pedido:\n\n📦 Producto: {{producto}}\n💰 Total: {{valor_pedido}}\n📍 Envio a: {{ciudad}}\n\nNecesitamos que confirmes tus datos para proceder con el envio.\n\nResponde para confirmar o corregir',
    buttons: [
      { id: 'b1', text: 'Confirmar envio', type: 'QUICK_REPLY' },
      { id: 'b2', text: 'Corregir datos', type: 'QUICK_REPLY' }
    ],
    language: 'es',
    createdAt: new Date().toISOString()
  },
  {
    id: 'tpl-04',
    name: 'Carrito abandonado #1',
    slug: 'carritos_mensaje_1',
    category: 'Marketing',
    status: 'Sin enviar',
    version: 'v1 en revisión',
    hasImage: false,
    bodyText: 'Hola {{nombre_contacto}} 👋\n\nNotamos que dejaste {{producto}} en tu carrito de compras. Todavia esta disponible, pero las unidades son limitadas.\n\n¿Te lo apartamos antes de que se agote? 🛒',
    buttons: [
      { id: 'b1', text: 'Si, lo quiero', type: 'QUICK_REPLY' },
      { id: 'b2', text: 'No, gracias', type: 'QUICK_REPLY' }
    ],
    language: 'es',
    createdAt: new Date().toISOString()
  },
  {
    id: 'tpl-05',
    name: 'Carrito abandonado #2',
    slug: 'carritos_mensaje_2',
    category: 'Marketing',
    status: 'Sin enviar',
    version: 'v1 en revisión',
    hasImage: false,
    bodyText: 'Hola {{nombre_contacto}} , tu {{producto}} sigue esperandote en el carrito ⏳\n\nSolo quedan pocas unidades disponibles y no queremos que te quedes sin el tuyo.\n\n¿Completamos tu pedido?',
    buttons: [
      { id: 'b1', text: 'Completar compra', type: 'QUICK_REPLY' },
      { id: 'b2', text: 'Ya no me interesa', type: 'QUICK_REPLY' }
    ],
    language: 'es',
    createdAt: new Date().toISOString()
  },
  {
    id: 'tpl-06',
    name: 'Carrito abandonado #3',
    slug: 'carritos_mensaje_3',
    category: 'Marketing',
    status: 'Sin enviar',
    version: 'v1 en revisión',
    hasImage: false,
    bodyText: '🔥 Ultima oportunidad, {{nombre_contacto}} .\n\nTu {{producto}} esta a punto de agotarse y no podemos reservarlo por mas tiempo.\n\nEsta es tu ultima oportunidad para completar la compra. Despues de hoy, no podemos garantizar disponibilidad.',
    buttons: [
      { id: 'b1', text: 'Lo quiero ya', type: 'QUICK_REPLY' },
      { id: 'b2', text: 'No, gracias', type: 'QUICK_REPLY' }
    ],
    language: 'es',
    createdAt: new Date().toISOString()
  },
  {
    id: 'tpl-07',
    name: 'Recordatorio de confirmación #1',
    slug: 'confirmaciones_recordatorio_1',
    category: 'Utilidad',
    status: 'Sin enviar',
    version: 'v1 en revisión',
    hasImage: false,
    bodyText: 'Hola {{nombre_contacto}} 👋\n\nAun no hemos recibido tu confirmacion para el pedido de {{producto}} por {{valor_pedido}} .\n\nNecesitamos tu respuesta para poder preparar y despachar tu envio. ¿Podemos proceder?',
    buttons: [
      { id: 'b1', text: 'Confirmar', type: 'QUICK_REPLY' },
      { id: 'b2', text: 'Cancelar pedido', type: 'QUICK_REPLY' }
    ],
    language: 'es',
    createdAt: new Date().toISOString()
  },
  {
    id: 'tpl-08',
    name: 'Recordatorio de confirmación #2',
    slug: 'confirmaciones_recordatorio_2',
    category: 'Marketing',
    status: 'Sin enviar',
    version: 'v1 en revisión',
    hasImage: false,
    bodyText: 'Hola {{nombre_contacto}} , este es nuestro ultimo recordatorio ⚠️\n\nTu pedido de {{producto}} sera cancelado automaticamente si no confirmas antes de que termine el dia.\n\nNo queremos que pierdas tu producto. Responde ahora para que lo despachemos.',
    buttons: [
      { id: 'b1', text: 'Confirmar ahora', type: 'QUICK_REPLY' },
      { id: 'b2', text: 'Cancelar', type: 'QUICK_REPLY' }
    ],
    language: 'es',
    createdAt: new Date().toISOString()
  },
  {
    id: 'tpl-09',
    name: 'Guia de envio generada',
    slug: 'seguimiento_guia_generada',
    category: 'Utilidad',
    status: 'Sin enviar',
    version: 'v1 en revisión',
    hasImage: false,
    headerText: 'Tu pedido fue despachado',
    bodyText: '¡Hola {{nombre_contacto}} ! Tu pedido ya salio en camino 🚀\n\n📦 Producto: {{producto}}\n🚚 Transportadora: {{transportadora}}\n📑 Numero de guia: {{numero_guia}}\n\nPuedes rastrear tu envio en tiempo real con el boton de abajo.\n\nTe avisaremos cuando este cerca.',
    buttons: [
      { id: 'b1', text: 'Rastrear envio', type: 'QUICK_REPLY' }
    ],
    language: 'es',
    createdAt: new Date().toISOString()
  },
  {
    id: 'tpl-10',
    name: 'Pedido en reparto',
    slug: 'seguimiento_en_reparto',
    category: 'Utilidad',
    status: 'Sin enviar',
    version: 'v1 en revisión',
    hasImage: false,
    bodyText: '¡Buenas noticias, {{nombre_contacto}} ! 🛵\n\nTu pedido de {{producto}} ya esta en reparto en {{ciudad}} .\n\nLa transportadora {{transportadora}} lo entregara hoy. Asegurate de estar disponible para recibirlo en la direccion que registraste.\n\nSi tienes alguna pregunta, respondenos por aqui.',
    language: 'es',
    createdAt: new Date().toISOString()
  },
  {
    id: 'tpl-11',
    name: 'Pedido entregado',
    slug: 'seguimiento_entregado',
    category: 'Marketing',
    status: 'Sin enviar',
    version: 'v1 en revisión',
    hasImage: false,
    bodyText: '¡Hola {{nombre_contacto}} ! 🥳\n\nTu pedido de {{producto}} fue entregado exitosamente.\n\nEsperamos que lo disfrutes mucho. Si tienes alguna pregunta o necesitas ayuda, estamos aqui para ti.\n\n¡Gracias por tu compra! ⭐',
    language: 'es',
    createdAt: new Date().toISOString()
  },
  {
    id: 'tpl-12',
    name: 'Pedido en oficina',
    slug: 'seguimiento_en_oficina',
    category: 'Marketing',
    status: 'Sin enviar',
    version: 'v1 en revisión',
    hasImage: false,
    bodyText: 'Hola {{nombre_contacto}} 📦\n\nTu pedido de {{producto}} llego a la oficina de la transportadora en {{ciudad}} .\n\nPuedes recogerlo directamente o esperar a que intenten entregartelo nuevamente. Si necesitas ayuda con la direccion, respondenos y te ayudamos.',
    language: 'es',
    createdAt: new Date().toISOString()
  },
  {
    id: 'tpl-13',
    name: 'Reclamo generado',
    slug: 'seguimiento_reclamo_en_oficina',
    category: 'Utilidad',
    status: 'Sin enviar',
    version: 'v1 en revisión',
    hasImage: false,
    bodyText: 'Hola {{nombre_contacto}} 📑\n\nHemos generado un reclamo a la transportadora por tu pedido de {{producto}} que se encuentra en la oficina de {{ciudad}} .\n\nTe mantendremos informado sobre la resolucion. Si tienes alguna novedad, no dudes en escribirnos.',
    language: 'es',
    createdAt: new Date().toISOString()
  },
  {
    id: 'tpl-14',
    name: 'Novedad en pedido',
    slug: 'novedad_generica',
    category: 'Utilidad',
    status: 'Sin enviar',
    version: 'v1 en revisión',
    hasImage: false,
    headerText: 'Novedad en tu pedido',
    bodyText: 'Hola {{nombre_contacto}} , hay una novedad con tu pedido # {{numero_pedido}} de {{producto}} .\n\n⚠️ Motivo: {{motivo_novedad}}\n🚚 Transportadora: {{transportadora}}\n\n{{instruccion_cliente}}\n\nRespondenos si tienes alguna pregunta.',
    buttons: [
      { id: 'b1', text: 'Entendido', type: 'QUICK_REPLY' }
    ],
    language: 'es',
    createdAt: new Date().toISOString()
  },
  {
    id: 'tpl-15',
    name: 'Recordatorio de novedad',
    slug: 'novedad_recordatorio',
    category: 'Utilidad',
    status: 'Sin enviar',
    version: 'v1 en revisión',
    hasImage: false,
    bodyText: 'Hola {{nombre_contacto}} 🔔\n\nTe recordamos que tienes una novedad pendiente en tu pedido de {{producto}} .\n\nNecesitamos tu respuesta para poder resolver la situacion. Por favor respondenos lo antes posible para avanzar con el envio.',
    language: 'es',
    createdAt: new Date().toISOString()
  },
  {
    id: 'tpl-16',
    name: 'Pedido confirmado',
    slug: 'pedido_confirmado',
    category: 'Utilidad',
    status: 'Sin enviar',
    version: 'v1 en revisión',
    hasImage: false,
    headerText: 'Pedido confirmado',
    bodyText: '¡Hola {{nombre_contacto}} ! 🥳\n\nTu pedido de {{producto}} por {{valor_pedido}} ha sido confirmado exitosamente.\n\nEstamos preparando tu envio y te avisaremos cuando sea despachado con el numero de guia para que puedas rastrearlo.\n\n¡Gracias por tu compra!',
    footerText: 'Tienda - Gestion de pedidos',
    language: 'es',
    createdAt: new Date().toISOString()
  },
  {
    id: 'tpl-17',
    name: 'Respuesta de precio',
    slug: 'respuesta_precio_producto',
    category: 'Utilidad',
    status: 'Sin enviar',
    version: 'v1 en revisión',
    hasImage: false,
    headerText: 'Precio del producto',
    bodyText: '¡Hola {{nombre_contacto}} ! 👋\n\nTe quedé debiendo el precio que me preguntaste: el {{producto}} cuesta {{precio_producto}} con envio gratis a tu ciudad.\n\n¿Te lo envio?\n\nSi no te interesa, ignora este mensaje.',
    language: 'es',
    createdAt: new Date().toISOString()
  },
  {
    id: 'tpl-18',
    name: 'Pedido pendiente de confirmacion',
    slug: 'seguimiento_pendiente_confirmacion',
    category: 'Utilidad',
    status: 'Sin enviar',
    version: 'v1 en revisión',
    hasImage: false,
    bodyText: 'Hola {{nombre_contacto}} , tu pedido de {{producto}} esta pendiente de confirmacion. Te avisaremos cada avance por este medio.',
    language: 'es',
    createdAt: new Date().toISOString()
  },
  {
    id: 'tpl-19',
    name: 'Pedido confirmado por logistica',
    slug: 'seguimiento_pendiente',
    category: 'Utilidad',
    status: 'Sin enviar',
    version: 'v1 en revisión',
    hasImage: false,
    bodyText: 'Hola {{nombre_contacto}} , tu pedido de {{producto}} fue confirmado y esta pendiente de preparacion.',
    language: 'es',
    createdAt: new Date().toISOString()
  },
  {
    id: 'tpl-20',
    name: 'Pedido preparado para transportadora',
    slug: 'seguimiento_preparado_transportadora',
    category: 'Utilidad',
    status: 'Sin enviar',
    version: 'v1 en revisión',
    hasImage: false,
    bodyText: 'Hola {{nombre_contacto}} , tu pedido de {{producto}} ya esta preparado para ser recibido por {{transportadora}} . Te avisaremos cuando inicie el traslado.',
    language: 'es',
    createdAt: new Date().toISOString()
  },
  {
    id: 'tpl-21',
    name: 'Pedido en procesamiento o en camino',
    slug: 'seguimiento_en_camino',
    category: 'Utilidad',
    status: 'Sin enviar',
    version: 'v1 en revisión',
    hasImage: false,
    bodyText: 'Hola {{nombre_contacto}} , tu pedido de {{producto}} esta siendo procesado y avanza con {{transportadora}} . Te mantendremos informado sobre su avance.',
    language: 'es',
    createdAt: new Date().toISOString()
  },
  {
    id: 'tpl-22',
    name: 'Pedido en bodega de transportadora',
    slug: 'seguimiento_bodega_transportadora',
    category: 'Utilidad',
    status: 'Sin enviar',
    version: 'v1 en revisión',
    hasImage: false,
    bodyText: 'Hola {{nombre_contacto}} , tu pedido de {{producto}} ya se encuentra en la bodega de {{transportadora}} y sigue avanzando hacia su destino.',
    language: 'es',
    createdAt: new Date().toISOString()
  }
];

const DEFAULT_TRACKING_TRIGGERS: TrackingTrigger[] = [
  {
    id: 'trig-1',
    dropiStatus: 'PENDING_CONFIRMATION',
    label: 'Pendiente confirmación',
    templateSlug: 'pedido_pendiente_confirmacion',
    templateName: 'Pedido pendiente de confirmacion',
    enabled: true,
    metaApproved: false
  },
  {
    id: 'trig-2',
    dropiStatus: 'PENDING',
    label: 'Pendiente',
    templateSlug: 'pedido_confirmado_logistica',
    templateName: 'Pedido confirmado por logistica',
    enabled: true,
    metaApproved: false
  },
  {
    id: 'trig-3',
    dropiStatus: 'GUIDE_GENERATED',
    label: 'Guía generada',
    templateSlug: 'guia_envio_generada',
    templateName: 'Guia de envio generada',
    enabled: true,
    metaApproved: false
  },
  {
    id: 'trig-4',
    dropiStatus: 'READY_FOR_CARRIER',
    label: 'Preparado para transportadora',
    templateSlug: 'pedido_preparado_transportadora',
    templateName: 'Pedido preparado para transportadora',
    enabled: true,
    metaApproved: false
  },
  {
    id: 'trig-5',
    dropiStatus: 'IN_TRANSIT',
    label: 'En procesamiento / en camino',
    templateSlug: 'pedido_en_procesamiento_o_camino',
    templateName: 'Pedido en procesamiento o en camino',
    enabled: true,
    metaApproved: false
  },
  {
    id: 'trig-6',
    dropiStatus: 'AT_WAREHOUSE',
    label: 'En bodega transportadora',
    templateSlug: 'pedido_en_bodega_transportadora',
    templateName: 'Pedido en bodega transportadora',
    enabled: false,
    metaApproved: false
  },
  {
    id: 'trig-7',
    dropiStatus: 'OUT_FOR_DELIVERY',
    label: 'En reparto hoy con mensajero',
    templateSlug: 'pedido_en_reparto_hoy',
    templateName: 'Pedido en reparto hoy',
    enabled: true,
    metaApproved: false
  },
  {
    id: 'trig-8',
    dropiStatus: 'DELIVERED',
    label: 'Entregado con éxito',
    templateSlug: 'pedido_entregado_gracias',
    templateName: 'Pedido entregado y gracias',
    enabled: true,
    metaApproved: false
  },
  {
    id: 'trig-9',
    dropiStatus: 'FAILED_ATTEMPT',
    label: 'Novedad / Intento fallido',
    templateSlug: 'novedad_entrega_pedido',
    templateName: 'Novedad en entrega de pedido',
    enabled: true,
    metaApproved: false
  }
];

export default function PlantillasMetaView({ onBackToCampaigns }: { onBackToCampaigns?: () => void }) {
  const [activeTab, setActiveTab] = useState<'meta' | 'rapidas' | 'seguimiento'>('meta');
  const [templates, setTemplates] = useState<MetaTemplate[]>(() => {
    try {
      const saved = localStorage.getItem('EXPERT360_META_TEMPLATES');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= DEFAULT_TEMPLATES.length) {
          return parsed;
        }
      }
      return DEFAULT_TEMPLATES;
    } catch {
      return DEFAULT_TEMPLATES;
    }
  });

  const [triggers, setTriggers] = useState<TrackingTrigger[]>(() => {
    try {
      const saved = localStorage.getItem('EXPERT360_TRACKING_TRIGGERS');
      return saved ? JSON.parse(saved) : DEFAULT_TRACKING_TRIGGERS;
    } catch {
      return DEFAULT_TRACKING_TRIGGERS;
    }
  });

  const [statusFilter, setStatusFilter] = useState<'Todas' | 'Sin enviar' | 'Pendientes' | 'Aprobadas' | 'Rechazadas'>('Todas');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MetaTemplate | null>(null);

  // Form states for New / Edit Template
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<'Utilidad' | 'Marketing' | 'Autenticación'>('Utilidad');
  const [formHeaderText, setFormHeaderText] = useState('');
  const [formHasImage, setFormHasImage] = useState(false);
  const [formMessages, setFormMessages] = useState<string[]>(['']);
  const [formFooterText, setFormFooterText] = useState('');
  const [formButtons, setFormButtons] = useState<Array<{ id: string; text: string; type: 'QUICK_REPLY'; value?: string }>>([]);

  // Save templates on change
  useEffect(() => {
    try {
      localStorage.setItem('EXPERT360_META_TEMPLATES', JSON.stringify(templates));
    } catch (_) {}
  }, [templates]);

  // Save triggers on change
  useEffect(() => {
    try {
      localStorage.setItem('EXPERT360_TRACKING_TRIGGERS', JSON.stringify(triggers));
    } catch (_) {}
  }, [triggers]);

  const handleRefreshMeta = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      alert('Estados de Meta sincronizados con éxito. (API Meta Graph v18.0)');
    }, 900);
  };

  const handleStartCreate = () => {
    setFormName('');
    setFormCategory('Utilidad');
    setFormHeaderText('');
    setFormHasImage(false);
    setFormMessages(['']);
    setFormFooterText('');
    setFormButtons([]);
    setEditingTemplate(null);
    setIsCreatingNew(true);
  };

  const handleStartEdit = (tpl: MetaTemplate) => {
    setFormName(tpl.name);
    setFormCategory(tpl.category);
    setFormHeaderText(tpl.headerText || '');
    setFormHasImage(Boolean(tpl.hasImage));
    setFormMessages([tpl.bodyText || '']);
    setFormFooterText(tpl.footerText || '');
    setFormButtons((tpl.buttons || []).map(b => ({ id: b.id, text: b.text, type: 'QUICK_REPLY' })));
    setEditingTemplate(tpl);
    setIsCreatingNew(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formMessages[0]?.trim()) {
      alert('Por favor ingresa el nombre de la plantilla y al menos un mensaje.');
      return;
    }

    const slug = formName.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 35);
    const updatedTemplate: MetaTemplate = {
      id: editingTemplate ? editingTemplate.id : `tpl-${Date.now()}`,
      name: formName.trim(),
      slug,
      category: formCategory,
      status: editingTemplate ? editingTemplate.status : 'Sin enviar',
      version: editingTemplate ? editingTemplate.version : 'v1 en revisión',
      hasImage: formHasImage,
      headerText: formHeaderText.trim() || undefined,
      bodyText: formMessages.join('\n\n').trim(),
      footerText: formFooterText.trim() || undefined,
      buttons: formButtons.length > 0 ? formButtons : undefined,
      language: 'es',
      createdAt: editingTemplate ? editingTemplate.createdAt : new Date().toISOString()
    };

    if (editingTemplate) {
      setTemplates(prev => prev.map(t => t.id === editingTemplate.id ? updatedTemplate : t));
    } else {
      setTemplates(prev => [updatedTemplate, ...prev]);
    }

    setIsCreatingNew(false);
    setEditingTemplate(null);
  };

  const handleDeleteTemplate = (id: string) => {
    if (confirm('¿Estás seguro de eliminar esta plantilla?')) {
      setTemplates(prev => prev.filter(t => t.id !== id));
    }
  };

  const handleSendToMeta = (id: string) => {
    setTemplates(prev => prev.map(t => {
      if (t.id === id) {
        return { ...t, status: 'Pendiente' };
      }
      return t;
    }));
    alert('Plantilla enviada a revisión en Meta. Te notificaremos cuando sea aprobada por Meta for Developers.');
  };

  const toggleTrigger = (id: string) => {
    setTriggers(prev => prev.map(tr => tr.id === id ? { ...tr, enabled: !tr.enabled } : tr));
  };

  // Helper to highlight variables like {{nombre_contacto}} with green pills
  const renderFormattedText = (text: string) => {
    const parts = text.split(/(\{\{[a-zA-Z0-9_-]+\}\})/g);
    return (
      <span className="whitespace-pre-line leading-relaxed">
        {parts.map((part, index) => {
          if (part.startsWith('{{') && part.endsWith('}}')) {
            const rawVar = part.replace(/[{}]/g, '');
            const readableVar = rawVar
              .replace('nombre_contacto', 'Nombre del contacto')
              .replace('nombre_cliente', 'Nombre del cliente')
              .replace('pregunta_cliente', 'Pregunta del cliente')
              .replace('valor_pedido', 'Valor del pedido')
              .replace('precio_producto', 'Precio del producto')
              .replace('producto', 'Producto')
              .replace('ciudad', 'Ciudad')
              .replace('transportadora', 'Transportadora')
              .replace('numero_guia', 'Numero de guia')
              .replace('numero_pedido', 'Numero de pedido')
              .replace('motivo_novedad', 'Motivo de la novedad')
              .replace('instruccion_cliente', 'Instruccion al cliente');

            return (
              <span 
                key={index}
                className="inline-block px-1.5 py-0.5 mx-0.5 rounded-md bg-[#005c4b]/90 text-[#25d366] font-semibold text-[11px] select-none align-middle"
              >
                {readableVar}
              </span>
            );
          }
          return <span key={index}>{part}</span>;
        })}
      </span>
    );
  };

  // Filter templates
  const filteredTemplates = templates.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.bodyText.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    if (statusFilter === 'Todas') return true;
    if (statusFilter === 'Sin enviar') return t.status === 'Sin enviar';
    if (statusFilter === 'Pendientes') return t.status === 'Pendiente';
    if (statusFilter === 'Aprobadas') return t.status === 'Aprobada';
    if (statusFilter === 'Rechazadas') return t.status === 'Rechazada';
    return true;
  });

  const counts = {
    Todas: templates.length,
    'Sin enviar': templates.filter(t => t.status === 'Sin enviar').length,
    Pendientes: templates.filter(t => t.status === 'Pendiente').length,
    Aprobadas: templates.filter(t => t.status === 'Aprobada').length,
    Rechazadas: templates.filter(t => t.status === 'Rechazada').length,
  };

  // VIEW 1: CREAR / EDITAR PLANTILLA (IMAGE 3)
  if (isCreatingNew) {
    return (
      <div className="space-y-6 animate-fade-in text-left">
        {/* Breadcrumb & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
              <button 
                type="button" 
                onClick={() => setIsCreatingNew(false)}
                className="hover:text-zinc-300 transition cursor-pointer"
              >
                Plantillas
              </button>
              <ChevronRight size={12} />
              <span className="text-zinc-300 font-medium">
                {editingTemplate ? 'Editar plantilla' : 'Nueva plantilla'}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {editingTemplate ? 'Editar plantilla' : 'Nueva plantilla'}
            </h1>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsCreatingNew(false)}
              className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
            >
              <X size={14} /> Cancelar
            </button>
            <button
              type="button"
              onClick={handleSaveForm}
              className="px-4 py-2 rounded-xl bg-[#00c950] hover:bg-[#00a843] text-zinc-950 text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-emerald-500/10 cursor-pointer"
            >
              <Save size={14} /> Guardar
            </button>
          </div>
        </div>

        {/* 2-Column Form & Live Chat Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Form Settings */}
          <div className="lg:col-span-6 space-y-6 bg-zinc-950 p-5 sm:p-6 rounded-2xl border border-zinc-800/90 shadow-xl">
            <div>
              <h3 className="text-sm font-bold text-white">Información de la plantilla</h3>
              <p className="text-xs text-zinc-400 mt-0.5">Configura los detalles de tu plantilla</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">Nombre</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Nombre de la plantilla"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1.5">Categoría</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as any)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Utilidad">Utilidad</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Autenticación">Autenticación</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1.5">Encabezado Opcional</label>
                  <input
                    type="text"
                    value={formHeaderText}
                    onChange={(e) => setFormHeaderText(e.target.value)}
                    placeholder="Ej: Confirmación de pedido"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-zinc-300">Mensajes</label>
                  <span className="text-[11px] text-zinc-500">Agrega los mensajes que formarán parte de esta plantilla</span>
                </div>

                {formMessages.map((msg, index) => (
                  <div key={index} className="p-4 rounded-xl bg-zinc-900/90 border border-zinc-800 space-y-3 mb-3 relative">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-zinc-300">Mensaje {index + 1}</span>
                      {formMessages.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setFormMessages(formMessages.filter((_, i) => i !== index))}
                          className="text-red-400 hover:text-red-300 p-1 text-xs"
                          title="Eliminar mensaje"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    <textarea
                      rows={4}
                      value={msg}
                      onChange={(e) => {
                        const next = [...formMessages];
                        next[index] = e.target.value;
                        setFormMessages(next);
                      }}
                      placeholder="Escribe el cuerpo del mensaje aquí..."
                      className="w-full bg-zinc-950 border border-zinc-800/80 rounded-lg p-3 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 transition resize-y"
                    />

                    {/* Toolbar with helper actions */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setFormHasImage(!formHasImage)}
                        className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition cursor-pointer ${
                          formHasImage 
                            ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-400' 
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        <Paperclip size={13} />
                        <span>{formHasImage ? 'Con imagen de cabecera' : 'Adjuntar archivo (imagen, video, PDF)'}</span>
                      </button>

                      <div className="flex items-center gap-1 bg-zinc-900 px-2 py-1 rounded-lg border border-zinc-800">
                        <Smile size={13} className="text-zinc-400" />
                        <span className="text-[11px] text-zinc-400">Emoji</span>
                      </div>

                      {/* Quick variable insertion pills */}
                      <div className="flex flex-wrap items-center gap-1">
                        {[
                          { label: '+ Nombre', val: '{{nombre_contacto}}' },
                          { label: '+ Producto', val: '{{producto}}' },
                          { label: '+ Total', val: '{{valor_pedido}}' },
                          { label: '+ Ciudad', val: '{{ciudad}}' }
                        ].map((v) => (
                          <button
                            key={v.val}
                            type="button"
                            onClick={() => {
                              const next = [...formMessages];
                              next[index] = (next[index] || '') + ' ' + v.val;
                              setFormMessages(next);
                            }}
                            className="text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2 py-1 rounded border border-zinc-700 transition"
                          >
                            {v.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => setFormMessages([...formMessages, ''])}
                  className="w-full py-2.5 rounded-xl border border-zinc-800 hover:bg-zinc-900 text-zinc-300 hover:text-white text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus size={14} /> Agregar mensaje
                </button>
              </div>

              {/* Footer text */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Pie de Página (Opcional)</label>
                <input
                  type="text"
                  value={formFooterText}
                  onChange={(e) => setFormFooterText(e.target.value)}
                  placeholder="Ej: Tienda - Gestión de pedidos"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Interactive buttons */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-zinc-300">Botones de Respuesta Rápida (Opcional)</label>
                  <button
                    type="button"
                    onClick={() => {
                      if (formButtons.length < 3) {
                        const newBtnName = prompt('Texto del botón (ej: Confirmar pedido):', 'Confirmar envío');
                        if (newBtnName) {
                          setFormButtons([...formButtons, { id: `b-${Date.now()}`, text: newBtnName, type: 'QUICK_REPLY' }]);
                        }
                      } else {
                        alert('Meta permite un máximo de 3 botones de respuesta rápida.');
                      }
                    }}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1"
                  >
                    <Plus size={12} /> Agregar botón
                  </button>
                </div>

                {formButtons.length > 0 && (
                  <div className="space-y-2">
                    {formButtons.map((b, i) => (
                      <div key={b.id} className="flex items-center justify-between p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs">
                        <span className="text-emerald-400 font-medium flex items-center gap-1.5">
                          <CornerDownRight size={13} /> {b.text}
                        </span>
                        <button
                          type="button"
                          onClick={() => setFormButtons(formButtons.filter(item => item.id !== b.id))}
                          className="text-red-400 hover:text-red-300 text-xs"
                        >
                          Eliminar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Live Chat Preview (Image 3) */}
          <div className="lg:col-span-6 bg-[#0c1317] p-6 rounded-2xl border border-zinc-800/90 shadow-xl flex flex-col">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-white">Vista previa</h3>
              <p className="text-xs text-zinc-400">Así se verán tus mensajes en el chat</p>
            </div>

            <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full py-6">
              {/* WhatsApp Bubble Preview */}
              <div className="bg-[#1f2c34] text-zinc-100 rounded-2xl rounded-tl-sm p-4 border border-zinc-800/60 shadow-2xl relative space-y-3">
                {formHasImage && (
                  <div className="w-full h-40 rounded-xl bg-zinc-900/90 border border-zinc-700/40 flex flex-col items-center justify-center text-zinc-500 gap-2">
                    <ImageIcon size={36} className="text-zinc-600" />
                    <span className="text-[11px] text-zinc-400 font-medium">Imagen del producto o pedido</span>
                  </div>
                )}

                {formHeaderText && (
                  <h4 className="font-bold text-sm text-white">{formHeaderText}</h4>
                )}

                <div className="text-xs leading-relaxed text-zinc-200">
                  {formMessages[0] ? renderFormattedText(formMessages[0]) : (
                    <span className="text-zinc-500 italic">Escribe el mensaje en el formulario para previsualizar aquí...</span>
                  )}
                </div>

                {formFooterText && (
                  <p className="text-[10px] text-zinc-400 pt-1 border-t border-zinc-700/40">
                    {formFooterText}
                  </p>
                )}

                <div className="text-right text-[10px] text-zinc-400 font-mono">
                  {formatLocalTime()}
                </div>
              </div>

              {/* Action Quick Reply Buttons below the bubble */}
              {formButtons.length > 0 && (
                <div className="space-y-1.5 mt-2">
                  {formButtons.map((b) => (
                    <div 
                      key={b.id}
                      className="bg-[#1f2c34]/90 hover:bg-[#1f2c34] border border-zinc-800/80 rounded-xl py-2.5 text-center text-xs font-semibold text-[#25d366] flex items-center justify-center gap-1.5 shadow-md"
                    >
                      <CornerDownRight size={13} /> {b.text}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // MAIN VIEW
  return (
    <div className="space-y-6 animate-fade-in text-left">
      {/* View Header (Image 1 & 4) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {onBackToCampaigns && (
              <button
                type="button"
                onClick={onBackToCampaigns}
                className="text-xs text-gold hover:text-gold-light flex items-center gap-1 font-semibold mr-2 transition cursor-pointer"
              >
                <ArrowLeft size={13} /> Volver a Campañas Masivas
              </button>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Plantillas</h1>
          <p className="text-xs text-zinc-400 mt-0.5">Gestiona tus plantillas de mensajes de WhatsApp</p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleRefreshMeta}
            disabled={isRefreshing}
            className="px-3.5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-xs font-semibold transition flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            <span>Refrescar estados de Meta</span>
          </button>

          <button
            type="button"
            onClick={handleStartCreate}
            className="px-4 py-2.5 rounded-xl bg-[#00c950] hover:bg-[#00a843] text-zinc-950 font-bold text-xs transition flex items-center gap-1.5 shadow-lg shadow-emerald-500/10 cursor-pointer"
          >
            <Plus size={15} />
            <span>Crear plantilla</span>
          </button>
        </div>
      </div>

      {/* Main Tabs (Plantillas Meta | Plantillas Rápidas | Seguimiento) */}
      <div className="flex items-center gap-2 border-b border-zinc-800/60 pb-3 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('meta')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'meta'
              ? 'bg-[#00c950] text-zinc-950 shadow-md'
              : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
          }`}
        >
          <MessageSquare size={14} />
          <span>Plantillas Meta</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('rapidas')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'rapidas'
              ? 'bg-[#00c950] text-zinc-950 shadow-md'
              : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
          }`}
        >
          <Zap size={14} />
          <span>Plantillas Rápidas</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('seguimiento')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'seguimiento'
              ? 'bg-[#00c950] text-zinc-950 shadow-md'
              : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
          }`}
        >
          <Package size={14} />
          <span>Seguimiento</span>
        </button>
      </div>

      {/* TAB 1: PLANTILLAS META (IMAGE 1 & 2) */}
      {activeTab === 'meta' && (
        <div className="space-y-6">
          {/* Warning Banner (Image 1) */}
          <div className="p-4 rounded-xl bg-[#2a1b07]/80 border border-amber-500/40 flex items-start gap-3 text-amber-300 text-xs">
            <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-200">Sin numero de WhatsApp conectado</p>
              <p className="text-[11px] text-amber-300/80 mt-0.5 leading-relaxed">
                Puedes editar las plantillas ahora. Cuando conectes un numero, se asociaran automaticamente y podras enviarlas a Meta para aprobacion.
              </p>
            </div>
          </div>

          {/* Status Filter Bar & Search Input (Image 1) */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {(['Todas', 'Sin enviar', 'Pendientes', 'Aprobadas', 'Rechazadas'] as const).map((st) => {
                const isActive = statusFilter === st;
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                      isActive 
                        ? 'bg-zinc-800 text-white border-b-2 border-emerald-400' 
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                    }`}
                  >
                    <span>{st}</span>
                    <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-zinc-900 text-zinc-400 font-mono">
                      {counts[st]}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="relative min-w-[240px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar plantilla..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Templates Grid (2 Columns as shown in Image 1 & 2) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {filteredTemplates.map((tpl) => (
              <div 
                key={tpl.id}
                className="bg-zinc-950 rounded-2xl border border-zinc-800/90 p-5 flex flex-col justify-between shadow-xl space-y-4 hover:border-zinc-700 transition"
              >
                {/* Header info */}
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-white text-sm leading-snug">{tpl.name}</h3>
                      <p className="font-mono text-[11px] text-zinc-500 mt-0.5">{tpl.slug}</p>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          tpl.category === 'Utilidad' 
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                            : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                        }`}>
                          {tpl.category}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                          {tpl.status}
                        </span>
                      </div>
                      <span className="text-[10px] text-zinc-500">{tpl.version}</span>
                    </div>
                  </div>

                  {/* Dark WhatsApp Chat Bubble Preview (Exact style as Images 1 & 2) */}
                  <div className="mt-4 p-4 rounded-xl bg-[#0c1317] border border-zinc-800/80 space-y-3">
                    {tpl.hasImage && (
                      <div className="w-full h-36 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-600">
                        <ImageIcon size={32} />
                      </div>
                    )}

                    {tpl.headerText && (
                      <h4 className="font-bold text-xs text-white">{tpl.headerText}</h4>
                    )}

                    <div className="text-xs text-zinc-200">
                      {renderFormattedText(tpl.bodyText)}
                    </div>

                    {tpl.footerText && (
                      <p className="text-[10px] text-zinc-400 pt-1 border-t border-zinc-800/60">
                        {tpl.footerText}
                      </p>
                    )}

                    <div className="text-right text-[10px] text-zinc-500 font-mono">
                      {formatLocalTime()}
                    </div>

                    {/* Quick Reply Buttons (Image 1 & 2) */}
                    {tpl.buttons && tpl.buttons.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        {tpl.buttons.map((b) => (
                          <div 
                            key={b.id}
                            className="w-full py-2 px-3 rounded-lg bg-[#111b21] hover:bg-[#1a2730] border border-zinc-800 text-center text-xs font-semibold text-[#25d366] flex items-center justify-center gap-1.5 transition select-none"
                          >
                            <CornerDownRight size={13} /> {b.text}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions (Image 2) */}
                <div className="space-y-2 pt-2 border-t border-zinc-900">
                  <button
                    type="button"
                    onClick={() => handleSendToMeta(tpl.id)}
                    className="w-full py-2.5 rounded-xl bg-[#00c950] hover:bg-[#00a843] text-zinc-950 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    <AlertTriangle size={14} /> Enviar a Meta para aprobación
                  </button>

                  <div className="flex items-center justify-end gap-3 text-xs text-zinc-400 pt-1">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(tpl)}
                      className="hover:text-white flex items-center gap-1 transition cursor-pointer"
                    >
                      <Edit3 size={13} /> Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteTemplate(tpl.id)}
                      className="hover:text-red-400 flex items-center gap-1 transition cursor-pointer"
                    >
                      <Trash2 size={13} /> Eliminar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: PLANTILLAS RÁPIDAS (AGENT SHORTCUTS) */}
      {activeTab === 'rapidas' && (
        <div className="space-y-6">
          <div className="bg-zinc-950 p-6 rounded-2xl border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-base">Respuestas Rápidas para Asesores</h3>
                <p className="text-xs text-zinc-400 mt-0.5">Atajos de texto que los asesores pueden insertar en 1 clic durante el chat en vivo.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const shortcut = prompt('Comando (ej: /envio):', '/envio');
                  const text = prompt('Texto completo a enviar:');
                  if (shortcut && text) {
                    alert(`Respuesta rápida "${shortcut}" creada con éxito.`);
                  }
                }}
                className="bg-[#00c950] text-zinc-950 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5"
              >
                <Plus size={14} /> Nueva Rápida
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {[
                { cmd: '/catalogo', label: 'Catálogo de Productos', text: '¡Hola! Aquí tienes nuestro catálogo digital con fotos y precios actualizados: https://expert360.store' },
                { cmd: '/precio', label: 'Precios y Descuentos', text: 'El valor de la unidad es de $85.000 COP. Si llevas la promoción de 2 unidades te queda en $139.900 con envío gratis.' },
                { cmd: '/pago', label: 'Cuentas y Contra Entrega', text: 'Puedes pagar en efectivo al recibir en tu casa o transferir por Nequi / Bancolombia al 315 888 9900.' },
                { cmd: '/guia', label: 'Consulta de Guía Dropi', text: 'Tu pedido ya fue despachado. Puedes rastrear tu paquete en ServiEntrega con tu número de guía.' }
              ].map((qr, idx) => (
                <div key={idx} className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-emerald-400">{qr.cmd}</span>
                    <span className="text-[10px] text-zinc-500">{qr.label}</span>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed">{qr.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SEGUIMIENTO AUTOMÁTICO DROPI (IMAGE 4) */}
      {activeTab === 'seguimiento' && (
        <div className="space-y-4">
          {/* Blue Info Callout (Image 4) */}
          <div className="p-4 rounded-xl bg-[#091e3a]/90 border border-blue-500/40 text-blue-200 text-xs leading-relaxed flex items-start gap-3">
            <Package size={18} className="text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p>
                📦 Estas notificaciones se envían <strong>automáticamente</strong> al cliente por WhatsApp cuando el pedido cambia de estado en Dropi (guía generada, en reparto, entregado...). Requieren que la plantilla esté <strong>aprobada en Meta</strong> (pestaña “Plantillas Meta”). Si no está aprobada, no se envía y queda registrado.
              </p>
            </div>
          </div>

          {/* Trigger list items with switches & selector (Image 4) */}
          <div className="space-y-3">
            {triggers.map((trig) => (
              <div 
                key={trig.id}
                className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md hover:border-zinc-700 transition"
              >
                <div className="flex items-center gap-4">
                  {/* Switch toggle */}
                  <button
                    type="button"
                    onClick={() => toggleTrigger(trig.id)}
                    className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 shrink-0 cursor-pointer ${
                      trig.enabled ? 'bg-[#00c950]' : 'bg-zinc-800'
                    }`}
                  >
                    <div 
                      className={`w-5 h-5 rounded-full bg-white transition-transform duration-200 shadow-md ${
                        trig.enabled ? 'translate-x-5' : 'translate-x-0'
                      }`} 
                    />
                  </button>

                  <div>
                    <h4 className="font-bold text-white text-sm">{trig.label}</h4>
                    <p className="text-xs text-zinc-400 mt-0.5">Plantilla: {trig.templateName}</p>
                    {!trig.metaApproved && (
                      <p className="text-[11px] text-red-400 mt-1 flex items-center gap-1 font-medium">
                        <AlertTriangle size={12} /> La plantilla no está aprobada en Meta — no se enviará hasta aprobarla.
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2">
                    <span className="text-xs text-zinc-300 font-medium truncate max-w-[200px]">
                      {trig.templateName}
                    </span>
                    <span className="text-[10px] bg-amber-500/15 text-amber-400 font-bold px-2 py-0.5 rounded border border-amber-500/30">
                      Pendiente
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

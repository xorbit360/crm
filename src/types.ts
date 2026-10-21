export type ModuleId = 'dashboard' | 'ads' | 'whatsapp' | 'automatizaciones' | 'integraciones' | 'comunidad' | 'usuarios' | 'entrenamiento' | 'proveedores' | 'llamadas' | 'configuracion_general' | 'recargas' | 'referidos' | 'dominio' | 'proyectos' | 'mcp_api' | 'live_selling' | 'difusiones' | 'video' | 'radar' | 'contenido';

export interface AIResponse {
  content: string;
  actions?: AIAction[];
}

export interface AIAction {
  label: string;
  type: 'fill_canvas' | 'generate_image' | 'update_module';
  payload: any;
}

export interface AppState {
  companyName: string;
  niche: string;
  productDescription: string;
  marketInsights: string[];
  contents: ContentAsset[];
}

export interface ContentAsset {
  id: string;
  type: 'image' | 'video' | 'copy';
  url?: string;
  text?: string;
  platform: 'instagram' | 'facebook' | 'tiktok';
}

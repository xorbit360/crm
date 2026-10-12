// Paleta de marca Xorbit 360 — REGLA PERMANENTE: nunca colores pastel ni arcoíris.
// Superficies oscuras + acentos dorado/ámbar. Los semáforos funcionales (verde/rojo)
// se conservan solo donde comunican estado, en tonos sobrios.
// Definida también en src/index.css (@theme --color-gold-*). Usar estas constantes
// para estilos inline y gráficos en vez de inventar colores.
export const PALETTE = {
  surface: { s0: '#050607', s1: '#0b0d10', s2: '#11151a', s3: '#171c22' },
  border: '#252b33',
  text: { primary: '#f4f4f5', secondary: '#a1a1aa' },
  gold: { 300: '#fceea7', 400: '#f5d76e', 500: '#d4af37', 600: '#b5952f', 700: '#8f7524' },
  amber: '#f59e0b',
  // Semáforos sobrios (solo estado)
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  // Serie categórica sobria para gráficos (sin pastel)
  chart: ['#d4af37', '#f59e0b', '#10b981', '#ef4444', '#71717a', '#2563eb'],
} as const;

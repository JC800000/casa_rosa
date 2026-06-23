// Paleta de temas para el showcase de la página de inicio.
// Cada entrada tiene: key, label, swatch (color hex para el admin), bg, accent, glow, flotantes.

export const PALETA = {
  rosa_suave: {
    label: 'Rosa Suave',
    swatch: '#f9a8d4',
    bg: 'linear-gradient(135deg, #2d0a1a, #9d3163)',
    accent: '#f9a8d4',
    glow: 'rgba(249,168,212,0.55)',
    flotantes: ['🌸', '✨', '🌷', '💗', '🌺'],
  },
  rosa_fuerte: {
    label: 'Rosa Fuerte',
    swatch: '#f43f5e',
    bg: 'linear-gradient(135deg, #1a0511, #7c1f45)',
    accent: '#f43f5e',
    glow: 'rgba(244,63,94,0.55)',
    flotantes: ['🌸', '✨', '🌹', '💫', '🌺'],
  },
  fucsia: {
    label: 'Fucsia',
    swatch: '#ec4899',
    bg: 'linear-gradient(135deg, #1a0516, #831843)',
    accent: '#ec4899',
    glow: 'rgba(236,72,153,0.55)',
    flotantes: ['🌸', '💖', '✨', '🌺', '🌷'],
  },
  coral: {
    label: 'Coral',
    swatch: '#fb7185',
    bg: 'linear-gradient(135deg, #1f0a0a, #7c2d2d)',
    accent: '#fb7185',
    glow: 'rgba(251,113,133,0.55)',
    flotantes: ['🍓', '🌸', '✨', '💝', '🌺'],
  },
  lila: {
    label: 'Lila',
    swatch: '#c084fc',
    bg: 'linear-gradient(135deg, #0f0a1f, #4a1d96)',
    accent: '#c084fc',
    glow: 'rgba(192,132,252,0.55)',
    flotantes: ['💜', '✨', '🌸', '🫐', '💫'],
  },
  violeta: {
    label: 'Violeta',
    swatch: '#818cf8',
    bg: 'linear-gradient(135deg, #0a0a1a, #2d2d7c)',
    accent: '#818cf8',
    glow: 'rgba(129,140,248,0.55)',
    flotantes: ['💜', '✨', '🫐', '🌸', '💫'],
  },
  cafe: {
    label: 'Café',
    swatch: '#d97706',
    bg: 'linear-gradient(135deg, #1c0e06, #6b3614)',
    accent: '#d97706',
    glow: 'rgba(217,119,6,0.55)',
    flotantes: ['☕', '🫘', '🍃', '✨', '🌿'],
  },
  dorado: {
    label: 'Dorado',
    swatch: '#f59e0b',
    bg: 'linear-gradient(135deg, #1a1000, #7c5200)',
    accent: '#f59e0b',
    glow: 'rgba(245,158,11,0.55)',
    flotantes: ['⭐', '✨', '🌟', '💛', '🌻'],
  },
  chocolate: {
    label: 'Chocolate',
    swatch: '#b45309',
    bg: 'linear-gradient(135deg, #0f0a06, #3d1a00)',
    accent: '#b45309',
    glow: 'rgba(180,83,9,0.55)',
    flotantes: ['🍫', '✨', '🫘', '🍬', '☕'],
  },
  turquesa: {
    label: 'Turquesa',
    swatch: '#2dd4bf',
    bg: 'linear-gradient(135deg, #001a1a, #0f5c5c)',
    accent: '#2dd4bf',
    glow: 'rgba(45,212,191,0.55)',
    flotantes: ['🌊', '✨', '🐚', '💎', '🌿'],
  },
  azul: {
    label: 'Azul',
    swatch: '#60a5fa',
    bg: 'linear-gradient(135deg, #050d1a, #1e3a5f)',
    accent: '#60a5fa',
    glow: 'rgba(96,165,250,0.55)',
    flotantes: ['💙', '✨', '⭐', '🌊', '💫'],
  },
  verde: {
    label: 'Verde',
    swatch: '#4ade80',
    bg: 'linear-gradient(135deg, #051a0a, #1a5c2d)',
    accent: '#4ade80',
    glow: 'rgba(74,222,128,0.55)',
    flotantes: ['🍃', '✨', '🌿', '🌱', '💚'],
  },
}

export const PALETA_LISTA = Object.entries(PALETA).map(([key, val]) => ({ key, ...val }))

export const TEMA_DEFAULT = {
  bg: 'linear-gradient(135deg, #1a0511, #7c1f45)',
  accent: '#f43f5e',
  glow: 'rgba(244,63,94,0.55)',
  flotantes: ['🌸', '✨', '🌹', '💫', '🌺'],
}

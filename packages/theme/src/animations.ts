/**
 * Анимационные токены
 * Короткие, плавные, премиальные анимации
 */

export const animations = {
  // ===== ДЛИТЕЛЬНОСТИ =====
  duration: {
    instant: 0,
    fast: 100,
    normal: 200,
    slow: 300,
    slower: 500,
  },

  // ===== ПРЕСЕТЫ АНИМАЦИЙ =====
  presets: {
    // Появление элементов
    fadeIn: {
      from: { opacity: 0 },
      to: { opacity: 1 },
      duration: 200,
      easing: 'ease-out',
    },
    fadeOut: {
      from: { opacity: 1 },
      to: { opacity: 0 },
      duration: 200,
      easing: 'ease-in',
    },

    // Слайд анимации
    slideUp: {
      from: { opacity: 0, y: 20 },
      to: { opacity: 1, y: 0 },
      duration: 300,
      easing: 'cubic-bezier(0, 0, 0.2, 1)',
    },
    slideDown: {
      from: { opacity: 0, y: -20 },
      to: { opacity: 1, y: 0 },
      duration: 300,
      easing: 'cubic-bezier(0, 0, 0.2, 1)',
    },
    slideLeft: {
      from: { opacity: 0, x: 20 },
      to: { opacity: 1, x: 0 },
      duration: 300,
      easing: 'cubic-bezier(0, 0, 0.2, 1)',
    },
    slideRight: {
      from: { opacity: 0, x: -20 },
      to: { opacity: 1, x: 0 },
      duration: 300,
      easing: 'cubic-bezier(0, 0, 0.2, 1)',
    },

    // Масштаб
    scaleIn: {
      from: { opacity: 0, scale: 0.95 },
      to: { opacity: 1, scale: 1 },
      duration: 200,
      easing: 'cubic-bezier(0, 0, 0.2, 1)',
    },
    scaleOut: {
      from: { opacity: 1, scale: 1 },
      to: { opacity: 0, scale: 0.95 },
      duration: 200,
      easing: 'cubic-bezier(0.4, 0, 1, 1)',
    },

    // Hover эффекты
    hoverLift: {
      from: { y: 0 },
      to: { y: -2 },
      duration: 150,
      easing: 'ease-out',
    },
    hoverGlow: {
      from: { boxShadow: '0 0 0 rgba(255, 214, 0, 0)' },
      to: { boxShadow: '0 0 20px rgba(255, 214, 0, 0.15)' },
      duration: 200,
      easing: 'ease-out',
    },

    // Фокус
    focusRing: {
      from: { boxShadow: '0 0 0 0 rgba(255, 214, 0, 0)' },
      to: { boxShadow: '0 0 0 3px rgba(255, 214, 0, 0.3)' },
      duration: 100,
      easing: 'ease-out',
    },

    // Микро-взаимодействия
    tap: {
      from: { scale: 1 },
      to: { scale: 0.97 },
      duration: 100,
      easing: 'ease-out',
    },
    pulse: {
      keyframes: [
        { opacity: 1, scale: 1 },
        { opacity: 0.8, scale: 1.05 },
        { opacity: 1, scale: 1 },
      ],
      duration: 1000,
      easing: 'ease-in-out',
      iterations: 'infinite',
    },
  },

  // ===== СПЕЦИАЛЬНЫЕ АНИМАЦИИ (ТАКСИ-ТЕМАТИКА) =====
  thematic: {
    // Краткий проезд такси (для открытия чата)
    taxiDrive: {
      from: { x: '-100%', opacity: 0 },
      to: { x: '0%', opacity: 1 },
      duration: 600,
      easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    },

    // Курьер с посылкой
    courierWalk: {
      keyframes: [
        { transform: 'translateX(-10px)' },
        { transform: 'translateX(10px)' },
        { transform: 'translateX(-10px)' },
      ],
      duration: 800,
      easing: 'ease-in-out',
      iterations: 2,
    },

    // Велосипедный курьер
    bikeRoll: {
      from: { x: '100%', opacity: 0 },
      to: { x: '0%', opacity: 1 },
      duration: 500,
      easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    },

    // Грузовой автомобиль
    cargoMove: {
      from: { x: '-100%', opacity: 0 },
      to: { x: '0%', opacity: 1 },
      duration: 800,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },

    // Премиум седан
    premiumGlide: {
      from: { x: '100%', opacity: 0, scale: 1.1 },
      to: { x: '0%', opacity: 1, scale: 1 },
      duration: 700,
      easing: 'cubic-bezier(0, 0, 0.2, 1)',
    },

    // Сигнал/уведомление
    signal: {
      keyframes: [
        { transform: 'scale(1)', opacity: 1 },
        { transform: 'scale(1.2)', opacity: 0.8 },
        { transform: 'scale(1)', opacity: 1 },
      ],
      duration: 300,
      easing: 'ease-out',
    },
  },

  // ===== SPRING ФИЗИКА (для framer motion) =====
  springs: {
    gentle: {
      stiffness: 100,
      damping: 20,
      mass: 1,
    },
    normal: {
      stiffness: 170,
      damping: 26,
      mass: 1,
    },
    stiff: {
      stiffness: 300,
      damping: 30,
      mass: 1,
    },
    wobbly: {
      stiffness: 50,
      damping: 10,
      mass: 1,
    },
  },
} as const;

export type Animations = typeof animations;

// Shared constants for Control4Explainer

export const COLORS = {
  BG: '#050d1a',
  BLUE: '#1F6FB2',
  BLUE_L: '#4da6e8',
  GRAY: '#A6A8AB',
  WHITE: '#FFFFFF',
  CARD: '#0b1929',
  GREEN: '#22c55e',
} as const;

export const SAFE = {
  TOP: 150,
  BOTTOM: 170,
  SIDE: 60,
} as const;

export const FONT = {
  FAMILY: "'Inter', 'Helvetica Neue', Arial, sans-serif",
  H1: 80,
  H2: 72,
  BODY: 40,
  LABEL: 30,
  SMALL: 28,
} as const;

export const SPRING_CONFIG = {
  damping: 200,
  stiffness: 100,
  mass: 1,
} as const;

export const CANVAS = {
  WIDTH: 1080,
  HEIGHT: 1920,
} as const;

export const fadeIn = (frame: number, start = 0, end = 12): number => {
  if (frame <= start) return 0;
  if (frame >= end) return 1;
  return (frame - start) / (end - start);
};

export const fadeOut = (frame: number, duration: number, fadeLen = 12): number => {
  const start = duration - fadeLen;
  if (frame <= start) return 1;
  if (frame >= duration) return 0;
  return 1 - (frame - start) / fadeLen;
};

export const sceneFade = (frame: number, duration: number): number => {
  return fadeIn(frame, 0, 12) * fadeOut(frame, duration, 12);
};

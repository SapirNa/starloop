import type { StarType } from '../types/star';

// Every color/motion parameter a star's visual identity needs, in one
// data-driven map - gameplay/StarVisual.tsx and gameplay/useStarAnimations.ts
// read from here rather than branching on `star.type` themselves. Shape is
// the OTHER half of each type's identity (see StarVisual.tsx: BOMB and TIME
// render fundamentally different silhouettes, not just different colors -
// gameplay types are never distinguished by color alone).
export interface StarVisualConfig {
  fill: string;
  glow: string;
  highlight: string;
  particleColor: string;
  // How many of the shared MAX_PARTICLE_COUNT-sized particle pool actually
  // animate on capture for this type - GOLD/BOMB use more for a bigger
  // moment, TINY fewer to match its small size.
  particleCount: number;
  particleDistanceFactor: number;
  // Peak scale of the capture "pop" before the star shrinks away.
  popScale: number;
  // Capture flash color - white for a normal reward, red for danger.
  flashColor: string;
}

export const STAR_VISUALS: Record<StarType, StarVisualConfig> = {
  NORMAL: {
    fill: '#8FD8FF',
    glow: '#5B8CFF',
    highlight: '#FFFFFF',
    particleColor: '#8FD8FF',
    particleCount: 4,
    particleDistanceFactor: 2.4,
    popScale: 1.6,
    flashColor: '#FFFFFF',
  },
  GOLD: {
    fill: '#FFD84A',
    glow: '#FFB020',
    highlight: '#FFF6D8',
    particleColor: '#FFD84A',
    particleCount: 7,
    particleDistanceFactor: 3.2,
    popScale: 1.9,
    flashColor: '#FFF3C4',
  },
  RAINBOW: {
    fill: '#C77DFF',
    glow: '#9B6BFF',
    highlight: '#FFFFFF',
    particleColor: '#C77DFF',
    particleCount: 5,
    particleDistanceFactor: 2.6,
    popScale: 1.7,
    flashColor: '#FFFFFF',
  },
  SPEED: {
    fill: '#5BFFB0',
    glow: '#2FE39A',
    highlight: '#FFFFFF',
    particleColor: '#5BFFB0',
    particleCount: 4,
    particleDistanceFactor: 2.4,
    popScale: 1.6,
    flashColor: '#FFFFFF',
  },
  TINY: {
    fill: '#B8C4FF',
    glow: '#8FA0FF',
    highlight: '#FFFFFF',
    particleColor: '#B8C4FF',
    particleCount: 3,
    particleDistanceFactor: 2.0,
    popScale: 1.5,
    flashColor: '#FFFFFF',
  },
  BOMB: {
    fill: '#2A1520',
    glow: '#FF4D4D',
    highlight: '#FF8A8A',
    particleColor: '#FF4D4D',
    particleCount: 8,
    particleDistanceFactor: 3.6,
    popScale: 1.4,
    flashColor: '#FF3B3B',
  },
  TIME: {
    fill: '#9AF7FF',
    glow: '#4FD8E8',
    highlight: '#FFFFFF',
    particleColor: '#9AF7FF',
    particleCount: 4,
    particleDistanceFactor: 2.4,
    popScale: 1.6,
    flashColor: '#FFFFFF',
  },
  MAGNET: {
    fill: '#FF9E5B',
    glow: '#FF7A2E',
    highlight: '#FFFFFF',
    particleColor: '#FF9E5B',
    particleCount: 4,
    particleDistanceFactor: 2.4,
    popScale: 1.6,
    flashColor: '#FFFFFF',
  },
};

// Fixed-size particle pool every star allocates, regardless of its own
// type's particleCount - keeps the per-star shared-value budget constant
// and predictable (see useStarAnimations.ts) instead of varying array
// shapes per star.
export const MAX_PARTICLE_COUNT = 8;

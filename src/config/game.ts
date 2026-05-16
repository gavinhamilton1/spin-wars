export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

export const ARENA = {
  cx: GAME_WIDTH / 2,
  cy: GAME_HEIGHT / 2,
  radius: 320,
} as const;

export const SPINNER_DEFAULTS = {
  radius: 36,
  mass: 1,
  frictionAir: 0.008,
  friction: 0.02,
  restitution: 0.85,
  omegaDecayPerSec: 0.25,
  omegaMin: 0.4,
  maxLaunchSpeed: 14,
  maxLaunchOmega: 45,
} as const;

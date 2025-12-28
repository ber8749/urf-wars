/**
 * Game configuration - single source of truth for core game settings.
 */
export const GAME_CONFIG = {
  /** Fixed timestep for physics and game logic (60 FPS) */
  FIXED_TIMESTEP: 1 / 60,

  /** Maximum frame time to prevent spiral of death */
  MAX_FRAME_TIME: 0.1,

  /** Default spawn height offset above terrain */
  SPAWN_HEIGHT_OFFSET: 15,
} as const;

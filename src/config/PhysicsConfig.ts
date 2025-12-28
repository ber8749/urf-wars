/**
 * Physics configuration - single source of truth for all physics-related constants.
 */
export const PHYSICS_CONFIG = {
  /** World gravity vector */
  GRAVITY: { x: 0, y: -20, z: 0 },

  /** Ground movement acceleration (units/s²) */
  GROUND_ACCELERATION: 8.0,

  /** Ground movement deceleration (units/s²) */
  GROUND_DECELERATION: 12.0,

  /** Air movement acceleration (units/s²) */
  AIR_ACCELERATION: 2.0,

  /** Air movement deceleration (units/s²) */
  AIR_DECELERATION: 1.0,

  /** Distance below entity to check for ground contact */
  GROUND_CHECK_DISTANCE: 1.0,

  /** Linear damping for dynamic bodies */
  LINEAR_DAMPING: 0.5,

  /** Angular damping for dynamic bodies */
  ANGULAR_DAMPING: 2.0,

  /** Default friction for colliders */
  DEFAULT_FRICTION: 0.7,

  /** Default restitution (bounciness) for colliders */
  DEFAULT_RESTITUTION: 0.1,
} as const;

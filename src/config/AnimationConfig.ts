/**
 * Animation configuration - single source of truth for animation timing and parameters.
 */
export const ANIMATION_CONFIG = {
  /** Walk cycle animation settings */
  WALK: {
    /** Base rate multiplier for walk animation */
    rateMultiplier: 8,
    /** Maximum speed value for animation calculations */
    maxSpeedForAnimation: 1.5,
    /** Leg swing amplitude multiplier */
    legSwingAmplitude: 0.35,
    /** Body bob amplitude multiplier */
    bodyBobAmplitude: 0.08,
    /** Torso sway amplitude */
    torsoSwayAmplitude: 0.015,
    /** Arm counter-swing multiplier */
    armCounterSwing: 0.4,
  },

  /** Torso base Y position */
  TORSO_BASE_Y: 5.5,

  /** Speed threshold below which mech is considered stationary */
  IDLE_SPEED_THRESHOLD: 0.02,
} as const;

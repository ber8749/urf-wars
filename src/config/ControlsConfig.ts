/**
 * Controls configuration - single source of truth for input sensitivity and control settings.
 */
export const CONTROLS_CONFIG = {
  /** Mouse sensitivity for torso/head rotation */
  MOUSE_SENSITIVITY: 0.002,

  /** Keyboard torso rotation speed (radians per second when using arrow keys) */
  KEYBOARD_TORSO_SPEED: 1.5,

  /** Keyboard pitch speed (radians per second when using arrow keys) */
  KEYBOARD_PITCH_SPEED: 1.0,

  /** Weapon slot range */
  WEAPON_SLOTS: {
    min: 1,
    max: 4,
  },
} as const;

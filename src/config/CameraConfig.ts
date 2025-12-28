/**
 * Camera configuration - single source of truth for all camera-related constants.
 */
export const CAMERA_CONFIG = {
  /** Near clipping plane */
  NEAR: 0.1,

  /** Far clipping plane */
  FAR: 2000,

  /** Third-person camera settings */
  THIRD_PERSON: {
    /** Distance behind the mech */
    distance: 25,
    /** Height above the mech */
    height: 12,
    /** Height of the look-at target */
    lookAtHeight: 8,
    /** Field of view in degrees */
    fov: 75,
    /** Look distance for target calculation */
    lookDistance: 50,
  },

  /** First-person camera settings */
  FIRST_PERSON: {
    /** Eye offset above cockpit position */
    eyeOffset: 0.2,
    /** Field of view in degrees */
    fov: 90,
    /** Look distance for target calculation */
    lookDistance: 100,
  },

  /** Camera transition settings */
  TRANSITION: {
    /** Duration of camera mode transitions in seconds */
    duration: 0.3,
  },

  /** Smoothing factors for camera follow */
  SMOOTHING: {
    /** Position lerp factor for third-person */
    position: 0.1,
    /** Target lerp factor for third-person */
    target: 0.15,
  },
} as const;

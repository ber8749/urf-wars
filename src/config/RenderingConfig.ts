/**
 * Rendering configuration - single source of truth for rendering and post-processing settings.
 */
export const RENDERING_CONFIG = {
  /** Post-processing settings */
  POST_PROCESSING: {
    scanlines: false,
    scanlineIntensity: 0.15,
    vignette: false,
    vignetteIntensity: 0.4,
    bloom: false,
    bloomIntensity: 0.5,
    chromaticAberration: false,
    aberrationAmount: 0.003,
    colorGrading: false,
  },

  /** Renderer settings */
  RENDERER: {
    /** Maximum pixel ratio (capped for performance) */
    maxPixelRatio: 2,
    /** Tone mapping exposure */
    toneMappingExposure: 3.0,
  },

  /** Shadow settings */
  SHADOWS: {
    mapSize: 2048,
    cameraNear: 10,
    cameraFar: 500,
    cameraSize: 150,
    bias: -0.0005,
  },

  /** Lighting settings */
  LIGHTING: {
    ambient: {
      color: 0xffffff,
      intensity: 0.6,
    },
    directional: {
      color: 0xffffff,
      intensity: 1.0,
      position: { x: 100, y: 200, z: 50 },
    },
  },

  /** Scene settings */
  SCENE: {
    backgroundColor: 0x87ceeb, // Light sky blue
  },
} as const;

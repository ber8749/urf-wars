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
    /** Cel-shading outline effect */
    outline: true,
    outlineThickness: 1.0,
    outlineColor: { r: 0.0, g: 0.0, b: 0.0 },
    /** Depth edge detection sensitivity */
    outlineDepthSensitivity: 0.5,
    /** Normal edge detection sensitivity */
    outlineNormalSensitivity: 0.5,
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
      intensity: 1.2,
    },
    directional: {
      color: 0xffffff,
      intensity: 2.0,
      position: { x: 50, y: 150, z: 100 }, // More frontal lighting
    },
  },

  /** Scene settings */
  SCENE: {
    backgroundColor: 0x87ceeb, // Light sky blue
  },
} as const;

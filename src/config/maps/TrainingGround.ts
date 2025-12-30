import type { MapConfig } from './MapConfig';
import { LIGHTING_PRESETS } from './MapConfig';

/**
 * Training Ground - A structured practice area with cover and multiple engagement ranges.
 * Good for learning movement and weapon mechanics.
 */
export const TRAINING_GROUND: MapConfig = {
  id: 'training-ground',
  name: 'Training Ground',
  description:
    'Structured practice area with cover and varied engagement ranges',

  terrain: {
    type: 'flat',
    size: 800,
    groundColor: 0xc2b280, // Sandy tan
    gridColorMajor: 0x8b7355,
    gridColorMinor: 0xa89070,
    showDebugMarkers: false,
  },

  environment: {
    skyColor: 0xdee8f0, // Pale blue-gray
    fogColor: 0xdee8f0,
    fogDensity: 0.002,
    lighting: LIGHTING_PRESETS.OVERCAST,
  },

  playerSpawn: {
    position: { x: 0, y: 15, z: 100 },
    facing: 180, // Face into the training area
  },

  targets: [
    // Close range targets (25m)
    { position: { x: -20, y: 6, z: 75 }, faceToward: { x: 0, y: 0, z: 100 } },
    { position: { x: 20, y: 6, z: 75 }, faceToward: { x: 0, y: 0, z: 100 } },

    // Medium range targets (50m)
    { position: { x: -40, y: 6, z: 50 }, faceToward: { x: 0, y: 0, z: 100 } },
    { position: { x: 0, y: 6, z: 50 }, faceToward: { x: 0, y: 0, z: 100 } },
    { position: { x: 40, y: 6, z: 50 }, faceToward: { x: 0, y: 0, z: 100 } },

    // Long range targets (100m)
    { position: { x: -60, y: 6, z: 0 }, faceToward: { x: 0, y: 0, z: 100 } },
    { position: { x: 0, y: 6, z: 0 }, faceToward: { x: 0, y: 0, z: 100 } },
    { position: { x: 60, y: 6, z: 0 }, faceToward: { x: 0, y: 0, z: 100 } },
  ],

  turrets: [
    // Defensive turrets at the far end
    {
      position: { x: -80, y: 0, z: -50 },
      detectionRange: 60,
      weaponType: 'autocannon',
    },
    {
      position: { x: 80, y: 0, z: -50 },
      detectionRange: 60,
      weaponType: 'autocannon',
    },
  ],

  obstacles: [
    // Cover barriers - player side
    {
      type: 'box',
      position: { x: -30, y: 4, z: 85 },
      size: { x: 6, y: 8, z: 2 },
      color: 0x505050,
    },
    {
      type: 'box',
      position: { x: 30, y: 4, z: 85 },
      size: { x: 6, y: 8, z: 2 },
      color: 0x505050,
    },

    // Mid-field cover
    {
      type: 'box',
      position: { x: -50, y: 5, z: 60 },
      size: { x: 8, y: 10, z: 3 },
      color: 0x606060,
    },
    {
      type: 'box',
      position: { x: 50, y: 5, z: 60 },
      size: { x: 8, y: 10, z: 3 },
      color: 0x606060,
    },
    {
      type: 'box',
      position: { x: 0, y: 3, z: 65 },
      size: { x: 12, y: 6, z: 2 },
      color: 0x505050,
    },

    // Long range cover positions
    {
      type: 'box',
      position: { x: -70, y: 6, z: 30 },
      size: { x: 10, y: 12, z: 4 },
      color: 0x707070,
    },
    {
      type: 'box',
      position: { x: 70, y: 6, z: 30 },
      size: { x: 10, y: 12, z: 4 },
      color: 0x707070,
    },
    {
      type: 'box',
      position: { x: -35, y: 4, z: 25 },
      size: { x: 6, y: 8, z: 3 },
      color: 0x606060,
    },
    {
      type: 'box',
      position: { x: 35, y: 4, z: 25 },
      size: { x: 6, y: 8, z: 3 },
      color: 0x606060,
    },

    // Boundary walls
    {
      type: 'wall',
      position: { x: -100, y: 7.5, z: 25 },
      size: { x: 4, y: 15, z: 200 },
      color: 0x404040,
    },
    {
      type: 'wall',
      position: { x: 100, y: 7.5, z: 25 },
      size: { x: 4, y: 15, z: 200 },
      color: 0x404040,
    },
    {
      type: 'wall',
      position: { x: 0, y: 7.5, z: -75 },
      size: { x: 200, y: 15, z: 4 },
      color: 0x404040,
    },
  ],
};

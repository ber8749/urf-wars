import type { MapConfig } from './MapConfig';
import { LIGHTING_PRESETS } from './MapConfig';

/**
 * Debug Arena - The original flat testing ground with grid markers.
 * Ideal for testing mechanics and debugging.
 */
export const DEBUG_ARENA: MapConfig = {
  id: 'debug-arena',
  name: 'Debug Arena',
  description: 'Flat testing ground with grid markers and reference objects',

  terrain: {
    type: 'flat',
    size: 1000,
    groundColor: 0xffffff,
    gridColorMajor: 0x000000,
    gridColorMinor: 0x888888,
    showDebugMarkers: true,
  },

  environment: {
    skyColor: 0x87ceeb, // Light sky blue
    lighting: LIGHTING_PRESETS.DAYLIGHT,
  },

  playerSpawn: {
    position: { x: 0, y: 15, z: 0 },
    facing: 180, // Face south (toward targets)
  },

  targets: [
    { position: { x: 0, y: 6, z: -20 }, faceToward: { x: 0, y: 0, z: 0 } },
    { position: { x: -15, y: 6, z: -40 }, faceToward: { x: 0, y: 0, z: 0 } },
    { position: { x: 15, y: 6, z: -40 }, faceToward: { x: 0, y: 0, z: 0 } },
    { position: { x: 0, y: 6, z: -60 }, faceToward: { x: 0, y: 0, z: 0 } },
    { position: { x: -25, y: 6, z: -80 }, faceToward: { x: 0, y: 0, z: 0 } },
  ],

  turrets: [
    {
      position: { x: 200, y: 0, z: -20 },
      detectionRange: 80,
      weaponType: 'autocannon',
    },
    {
      position: { x: 200, y: 0, z: 0 },
      detectionRange: 80,
      weaponType: 'laser',
    },
    {
      position: { x: 200, y: 0, z: 20 },
      detectionRange: 80,
      weaponType: 'autocannon',
    },
  ],

  obstacles: [],
};

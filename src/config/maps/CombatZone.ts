import type { MapConfig } from './MapConfig';

/**
 * Combat Zone - An industrial battlefield with multiple turret threats.
 * Tests combat skills against active enemies with cover options.
 */
export const COMBAT_ZONE: MapConfig = {
  id: 'combat-zone',
  name: 'Combat Zone',
  description: 'Industrial battlefield with active turret defenses',

  terrain: {
    type: 'flat',
    size: 600,
    groundColor: 0x5a5a5a, // Concrete gray
    gridColorMajor: 0x4a4a4a,
    gridColorMinor: 0x555555,
    showDebugMarkers: false,
  },

  environment: {
    skyColor: 0x8b5a2b, // Warm orange-brown dusk sky
    fogColor: 0x6b4a2b,
    fogDensity: 0.0015, // Light atmospheric fog
    lighting: {
      // Bright dusk lighting - visible but moody
      ambientColor: 0xffeedd,
      ambientIntensity: 1.6,
      directionalColor: 0xffcc88,
      directionalIntensity: 2.5,
      sunPosition: { x: -100, y: 80, z: 60 },
    },
  },

  playerSpawn: {
    position: { x: 0, y: 15, z: 150 },
    facing: 180,
  },

  targets: [
    // Strategic targets to destroy
    {
      position: { x: 0, y: 8, z: -100 },
      faceToward: { x: 0, y: 0, z: 150 },
      health: 200,
    },
    {
      position: { x: -60, y: 8, z: -80 },
      faceToward: { x: 0, y: 0, z: 150 },
      health: 150,
    },
    {
      position: { x: 60, y: 8, z: -80 },
      faceToward: { x: 0, y: 0, z: 150 },
      health: 150,
    },
  ],

  turrets: [
    // Front line turrets
    {
      position: { x: -40, y: 0, z: 50 },
      detectionRange: 70,
      weaponType: 'autocannon',
    },
    {
      position: { x: 40, y: 0, z: 50 },
      detectionRange: 70,
      weaponType: 'autocannon',
    },

    // Mid-field turrets
    {
      position: { x: -80, y: 0, z: 0 },
      detectionRange: 80,
      weaponType: 'laser',
    },
    {
      position: { x: 80, y: 0, z: 0 },
      detectionRange: 80,
      weaponType: 'laser',
    },
    {
      position: { x: 0, y: 0, z: -20 },
      detectionRange: 60,
      weaponType: 'autocannon',
    },

    // Rear defense turrets (protecting targets)
    {
      position: { x: -30, y: 0, z: -60 },
      detectionRange: 90,
      weaponType: 'laser',
      health: 75,
    },
    {
      position: { x: 30, y: 0, z: -60 },
      detectionRange: 90,
      weaponType: 'laser',
      health: 75,
    },
    {
      position: { x: 0, y: 0, z: -80 },
      detectionRange: 100,
      weaponType: 'autocannon',
      health: 100,
    },
  ],

  obstacles: [
    // Industrial buildings - player side cover
    {
      type: 'box',
      position: { x: -25, y: 8, z: 120 },
      size: { x: 15, y: 16, z: 12 },
      color: 0x707070,
    },
    {
      type: 'box',
      position: { x: 25, y: 8, z: 120 },
      size: { x: 15, y: 16, z: 12 },
      color: 0x707070,
    },

    // Forward cover positions
    {
      type: 'box',
      position: { x: -60, y: 5, z: 80 },
      size: { x: 10, y: 10, z: 8 },
      color: 0x808080,
    },
    {
      type: 'box',
      position: { x: 60, y: 5, z: 80 },
      size: { x: 10, y: 10, z: 8 },
      color: 0x808080,
    },
    {
      type: 'box',
      position: { x: 0, y: 4, z: 90 },
      size: { x: 20, y: 8, z: 6 },
      color: 0x757575,
    },

    // Central structures (rusty industrial)
    {
      type: 'cylinder',
      position: { x: -50, y: 10, z: 30 },
      size: { x: 8, y: 20, z: 8 },
      color: 0xa08070,
    },
    {
      type: 'cylinder',
      position: { x: 50, y: 10, z: 30 },
      size: { x: 8, y: 20, z: 8 },
      color: 0xa08070,
    },

    // Mid-field debris/cover
    {
      type: 'box',
      position: { x: -30, y: 3, z: 20 },
      size: { x: 8, y: 6, z: 6 },
      color: 0x6a6a6a,
      rotation: 15,
    },
    {
      type: 'box',
      position: { x: 30, y: 3, z: 20 },
      size: { x: 8, y: 6, z: 6 },
      color: 0x6a6a6a,
      rotation: -15,
    },
    {
      type: 'box',
      position: { x: 0, y: 4, z: 10 },
      size: { x: 12, y: 8, z: 8 },
      color: 0x606060,
    },

    // Large industrial structure (rear)
    {
      type: 'box',
      position: { x: -70, y: 12, z: -40 },
      size: { x: 20, y: 24, z: 30 },
      color: 0x6a6a6a,
    },
    {
      type: 'box',
      position: { x: 70, y: 12, z: -40 },
      size: { x: 20, y: 24, z: 30 },
      color: 0x6a6a6a,
    },

    // Target bunker structure
    {
      type: 'wall',
      position: { x: 0, y: 5, z: -110 },
      size: { x: 80, y: 10, z: 6 },
      color: 0x5a5a5a,
    },

    // Perimeter walls
    {
      type: 'wall',
      position: { x: -120, y: 8, z: 0 },
      size: { x: 4, y: 16, z: 300 },
      color: 0x555555,
    },
    {
      type: 'wall',
      position: { x: 120, y: 8, z: 0 },
      size: { x: 4, y: 16, z: 300 },
      color: 0x555555,
    },
    {
      type: 'wall',
      position: { x: 0, y: 8, z: -130 },
      size: { x: 240, y: 16, z: 4 },
      color: 0x555555,
    },
  ],
};

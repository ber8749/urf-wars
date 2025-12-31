import type { MissionConfig } from './MissionConfig';

/**
 * Mission 3: Turret Gauntlet
 * Destroy all enemy turrets in the Combat Zone.
 * First mission with active enemy threats.
 */
export const MISSION_03_TURRET_GAUNTLET: MissionConfig = {
  id: 'mission-03-turret-gauntlet',
  name: 'Turret Gauntlet',
  description: 'Eliminate all enemy turret emplacements',

  terrain: {
    type: 'flat',
    size: 600,
    groundColor: 0x5a5a5a,
    gridColorMajor: 0x4a4a4a,
    gridColorMinor: 0x555555,
    showDebugMarkers: false,
  },

  environment: {
    skyColor: 0x8b5a2b,
    fogColor: 0x6b4a2b,
    fogDensity: 0.0015,
    lighting: {
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

  // No passive targets - focus on turrets
  targets: [],

  turrets: [
    // Front line - light turrets
    {
      position: { x: -50, y: 0, z: 80 },
      detectionRange: 65,
      weaponType: 'autocannon',
      health: 60,
    },
    {
      position: { x: 50, y: 0, z: 80 },
      detectionRange: 65,
      weaponType: 'autocannon',
      health: 60,
    },

    // Second line - medium turrets
    {
      position: { x: -80, y: 0, z: 30 },
      detectionRange: 75,
      weaponType: 'laser',
      health: 80,
    },
    {
      position: { x: 0, y: 0, z: 20 },
      detectionRange: 70,
      weaponType: 'autocannon',
      health: 80,
    },
    {
      position: { x: 80, y: 0, z: 30 },
      detectionRange: 75,
      weaponType: 'laser',
      health: 80,
    },

    // Back line - heavy turrets
    {
      position: { x: -40, y: 0, z: -40 },
      detectionRange: 90,
      weaponType: 'laser',
      health: 120,
    },
    {
      position: { x: 40, y: 0, z: -40 },
      detectionRange: 90,
      weaponType: 'laser',
      health: 120,
    },
    {
      position: { x: 0, y: 0, z: -70 },
      detectionRange: 100,
      weaponType: 'autocannon',
      health: 150,
    },
  ],

  obstacles: [
    // Forward cover
    {
      type: 'box',
      position: { x: -30, y: 5, z: 110 },
      size: { x: 10, y: 10, z: 6 },
      color: 0x707070,
    },
    {
      type: 'box',
      position: { x: 30, y: 5, z: 110 },
      size: { x: 10, y: 10, z: 6 },
      color: 0x707070,
    },

    // Mid-field structures
    {
      type: 'cylinder',
      position: { x: -60, y: 10, z: 50 },
      size: { x: 8, y: 20, z: 8 },
      color: 0xa08070,
    },
    {
      type: 'cylinder',
      position: { x: 60, y: 10, z: 50 },
      size: { x: 8, y: 20, z: 8 },
      color: 0xa08070,
    },
    {
      type: 'box',
      position: { x: 0, y: 6, z: 60 },
      size: { x: 16, y: 12, z: 8 },
      color: 0x606060,
    },

    // Rear cover positions
    {
      type: 'box',
      position: { x: -70, y: 8, z: -10 },
      size: { x: 14, y: 16, z: 10 },
      color: 0x6a6a6a,
    },
    {
      type: 'box',
      position: { x: 70, y: 8, z: -10 },
      size: { x: 14, y: 16, z: 10 },
      color: 0x6a6a6a,
    },

    // Perimeter
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
      position: { x: 0, y: 8, z: -100 },
      size: { x: 240, y: 16, z: 4 },
      color: 0x555555,
    },
  ],

  // Mission metadata
  missionNumber: 3,
  title: 'Turret Gauntlet',
  briefing: [
    'Intel reports an enemy forward operating base with automated turret defenses.',
    'Your mission: neutralize all eight turret emplacements.',
    'The enemy has deployed turrets in three defensive lines. Front turrets are lightly armored, but the rear defenses are heavily fortified.',
    'Use cover wisely - these turrets will fire back. Approach carefully and pick your targets.',
    'This is live combat, pilot. Stay frosty.',
  ],

  objectives: [
    {
      id: 'destroy-turrets',
      type: 'destroy_all',
      description: 'Destroy all enemy turrets',
      required: true,
      showProgress: true,
    },
    {
      id: 'armor-bonus',
      type: 'survive',
      description: 'Complete with 50%+ armor remaining',
      required: false,
    },
  ],

  victoryCondition: 'destroy_all',
  defeatCondition: 'player_destroyed',
  showTimer: true,

  // Unlock the MADCAT after this mission
  unlocksMech: 'MADCAT',
  recommendedMechs: ['ATLAS'],
};

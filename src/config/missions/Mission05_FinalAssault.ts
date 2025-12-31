import type { MissionConfig } from './MissionConfig';

/**
 * Mission 5: Final Assault
 * Attack the enemy Command Base and destroy their HQ.
 * Final campaign mission with all enemy types.
 */
export const MISSION_05_FINAL_ASSAULT: MissionConfig = {
  id: 'mission-05-final-assault',
  name: 'Final Assault',
  description: 'Destroy the enemy command center',

  terrain: {
    type: 'flat',
    size: 800,
    groundColor: 0x4a4a4a,
    gridColorMajor: 0x3a3a3a,
    gridColorMinor: 0x444444,
    showDebugMarkers: false,
  },

  environment: {
    skyColor: 0x4a3020,
    fogColor: 0x3a2515,
    fogDensity: 0.001,
    lighting: {
      ambientColor: 0xffddbb,
      ambientIntensity: 1.4,
      directionalColor: 0xff9955,
      directionalIntensity: 2.2,
      sunPosition: { x: -150, y: 60, z: 100 },
    },
  },

  playerSpawn: {
    position: { x: 0, y: 15, z: 250 },
    facing: 180,
  },

  targets: [
    // Command HQ - Primary target (center back)
    {
      position: { x: 0, y: 15, z: -180 },
      health: 500,
      faceToward: { x: 0, y: 0, z: 250 },
    },

    // Secondary objectives - Power generators
    {
      position: { x: -80, y: 8, z: -120 },
      health: 200,
      faceToward: { x: 0, y: 0, z: 250 },
    },
    {
      position: { x: 80, y: 8, z: -120 },
      health: 200,
      faceToward: { x: 0, y: 0, z: 250 },
    },

    // Comm towers
    {
      position: { x: -120, y: 8, z: -60 },
      health: 150,
    },
    {
      position: { x: 120, y: 8, z: -60 },
      health: 150,
    },
  ],

  turrets: [
    // Outer perimeter - light defense
    {
      position: { x: -100, y: 0, z: 150 },
      detectionRange: 80,
      weaponType: 'autocannon',
      health: 70,
    },
    {
      position: { x: 100, y: 0, z: 150 },
      detectionRange: 80,
      weaponType: 'autocannon',
      health: 70,
    },

    // Mid perimeter - medium defense
    {
      position: { x: -140, y: 0, z: 50 },
      detectionRange: 90,
      weaponType: 'laser',
      health: 90,
    },
    {
      position: { x: 140, y: 0, z: 50 },
      detectionRange: 90,
      weaponType: 'laser',
      health: 90,
    },
    {
      position: { x: -60, y: 0, z: 80 },
      detectionRange: 75,
      weaponType: 'autocannon',
      health: 80,
    },
    {
      position: { x: 60, y: 0, z: 80 },
      detectionRange: 75,
      weaponType: 'autocannon',
      health: 80,
    },

    // Inner defense ring - heavy turrets
    {
      position: { x: -100, y: 0, z: -30 },
      detectionRange: 100,
      weaponType: 'laser',
      health: 120,
    },
    {
      position: { x: 100, y: 0, z: -30 },
      detectionRange: 100,
      weaponType: 'laser',
      health: 120,
    },
    {
      position: { x: 0, y: 0, z: 0 },
      detectionRange: 85,
      weaponType: 'autocannon',
      health: 100,
    },

    // HQ Defense - elite turrets
    {
      position: { x: -50, y: 0, z: -100 },
      detectionRange: 110,
      weaponType: 'laser',
      health: 150,
    },
    {
      position: { x: 50, y: 0, z: -100 },
      detectionRange: 110,
      weaponType: 'laser',
      health: 150,
    },
    {
      position: { x: 0, y: 0, z: -140 },
      detectionRange: 120,
      weaponType: 'autocannon',
      health: 180,
    },
  ],

  obstacles: [
    // Approach cover
    {
      type: 'box',
      position: { x: -50, y: 6, z: 180 },
      size: { x: 12, y: 12, z: 8 },
      color: 0x6a6a6a,
    },
    {
      type: 'box',
      position: { x: 50, y: 6, z: 180 },
      size: { x: 12, y: 12, z: 8 },
      color: 0x6a6a6a,
    },
    {
      type: 'box',
      position: { x: 0, y: 5, z: 200 },
      size: { x: 20, y: 10, z: 6 },
      color: 0x5a5a5a,
    },

    // Mid-field structures
    {
      type: 'box',
      position: { x: -80, y: 8, z: 100 },
      size: { x: 16, y: 16, z: 12 },
      color: 0x707070,
    },
    {
      type: 'box',
      position: { x: 80, y: 8, z: 100 },
      size: { x: 16, y: 16, z: 12 },
      color: 0x707070,
    },
    {
      type: 'cylinder',
      position: { x: -120, y: 12, z: 80 },
      size: { x: 10, y: 24, z: 10 },
      color: 0x8a7060,
    },
    {
      type: 'cylinder',
      position: { x: 120, y: 12, z: 80 },
      size: { x: 10, y: 24, z: 10 },
      color: 0x8a7060,
    },

    // Forward positions
    {
      type: 'box',
      position: { x: -40, y: 5, z: 40 },
      size: { x: 10, y: 10, z: 8 },
      color: 0x606060,
    },
    {
      type: 'box',
      position: { x: 40, y: 5, z: 40 },
      size: { x: 10, y: 10, z: 8 },
      color: 0x606060,
    },

    // Base structures
    {
      type: 'box',
      position: { x: -60, y: 10, z: -50 },
      size: { x: 20, y: 20, z: 16 },
      color: 0x5a5a5a,
    },
    {
      type: 'box',
      position: { x: 60, y: 10, z: -50 },
      size: { x: 20, y: 20, z: 16 },
      color: 0x5a5a5a,
    },

    // HQ building (visual representation)
    {
      type: 'box',
      position: { x: 0, y: 20, z: -180 },
      size: { x: 40, y: 40, z: 30 },
      color: 0x8a0000, // Red command building
    },

    // Generator buildings
    {
      type: 'cylinder',
      position: { x: -80, y: 12, z: -120 },
      size: { x: 12, y: 24, z: 12 },
      color: 0x4080ff,
    },
    {
      type: 'cylinder',
      position: { x: 80, y: 12, z: -120 },
      size: { x: 12, y: 24, z: 12 },
      color: 0x4080ff,
    },

    // Perimeter walls
    {
      type: 'wall',
      position: { x: -180, y: 10, z: 0 },
      size: { x: 4, y: 20, z: 500 },
      color: 0x4a4a4a,
    },
    {
      type: 'wall',
      position: { x: 180, y: 10, z: 0 },
      size: { x: 4, y: 20, z: 500 },
      color: 0x4a4a4a,
    },
    {
      type: 'wall',
      position: { x: 0, y: 10, z: -220 },
      size: { x: 360, y: 20, z: 4 },
      color: 0x4a4a4a,
    },
  ],

  // Mission metadata
  missionNumber: 5,
  title: 'Final Assault',
  briefing: [
    'This is it, pilot. The enemy command center has been located.',
    'Your primary objective is to destroy the Command HQ building at the center of their base.',
    'Intelligence suggests heavy turret coverage in three defensive rings.',
    'Secondary objectives include the two power generators and communication towers. Destroying these will weaken base defenses.',
    "This will be the toughest fight yet. Choose your heaviest mech and bring everything you've got.",
    'Good hunting, pilot. End this war.',
  ],

  objectives: [
    {
      id: 'destroy-hq',
      type: 'destroy',
      description: 'Destroy the Command HQ',
      required: true,
      targetIds: ['target-1'], // First target is the HQ
      targetCount: 1,
    },
    {
      id: 'destroy-generators',
      type: 'destroy',
      description: 'Destroy power generators (0/2)',
      required: false,
      targetIds: ['target-2', 'target-3'],
      targetCount: 2,
      showProgress: true,
    },
    {
      id: 'destroy-comms',
      type: 'destroy',
      description: 'Destroy comm towers (0/2)',
      required: false,
      targetIds: ['target-4', 'target-5'],
      targetCount: 2,
      showProgress: true,
    },
    {
      id: 'destroy-defenses',
      type: 'destroy_all',
      description: 'Eliminate all turret defenses',
      required: false,
      showProgress: true,
    },
  ],

  victoryCondition: 'destroy_targets',
  defeatCondition: 'player_destroyed',
  showTimer: true,

  difficulty: {
    enemyAccuracy: 1.1,
    enemyDamage: 1.1,
    playerDamage: 1.0,
    enemyHealth: 1.1,
  },

  // Unlock combat zone for instant action
  unlocksMap: 'combat-zone',

  recommendedMechs: ['ATLAS', 'MADCAT'],
};

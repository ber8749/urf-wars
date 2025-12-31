import type { MissionConfig } from './MissionConfig';

/**
 * Mission 2: Target Practice
 * Destroy all targets under a time limit in the Debug Arena.
 * Tests weapon accuracy and speed.
 */
export const MISSION_02_TARGET_PRACTICE: MissionConfig = {
  id: 'mission-02-target-practice',
  name: 'Target Practice',
  description: 'Timed target elimination exercise',

  terrain: {
    type: 'flat',
    size: 500,
    groundColor: 0x1a1a1a,
    gridColorMajor: 0x00ff88,
    gridColorMinor: 0x004422,
    showDebugMarkers: true,
  },

  environment: {
    skyColor: 0x000d0d,
    lighting: {
      ambientColor: 0x88ffaa,
      ambientIntensity: 0.8,
      directionalColor: 0x00ff88,
      directionalIntensity: 1.5,
      sunPosition: { x: 0, y: 200, z: 0 },
    },
  },

  playerSpawn: {
    position: { x: 0, y: 15, z: 0 },
    facing: 0,
  },

  // Targets arranged in a circle around the player
  targets: [
    // Ring 1 - Close (40m)
    { position: { x: 0, y: 6, z: -40 }, health: 80 },
    { position: { x: 40, y: 6, z: 0 }, health: 80 },
    { position: { x: 0, y: 6, z: 40 }, health: 80 },
    { position: { x: -40, y: 6, z: 0 }, health: 80 },

    // Ring 2 - Medium (70m)
    { position: { x: 50, y: 6, z: -50 }, health: 100 },
    { position: { x: 50, y: 6, z: 50 }, health: 100 },
    { position: { x: -50, y: 6, z: 50 }, health: 100 },
    { position: { x: -50, y: 6, z: -50 }, health: 100 },

    // Ring 3 - Far (100m)
    { position: { x: 0, y: 6, z: -100 }, health: 120 },
    { position: { x: 100, y: 6, z: 0 }, health: 120 },
    { position: { x: 0, y: 6, z: 100 }, health: 120 },
    { position: { x: -100, y: 6, z: 0 }, health: 120 },
  ],

  turrets: [],

  obstacles: [
    // Corner pillars for reference
    {
      type: 'cylinder',
      position: { x: 80, y: 8, z: 80 },
      size: { x: 4, y: 16, z: 4 },
      color: 0x00ff88,
    },
    {
      type: 'cylinder',
      position: { x: -80, y: 8, z: 80 },
      size: { x: 4, y: 16, z: 4 },
      color: 0x00ff88,
    },
    {
      type: 'cylinder',
      position: { x: 80, y: 8, z: -80 },
      size: { x: 4, y: 16, z: 4 },
      color: 0x00ff88,
    },
    {
      type: 'cylinder',
      position: { x: -80, y: 8, z: -80 },
      size: { x: 4, y: 16, z: 4 },
      color: 0x00ff88,
    },
  ],

  // Mission metadata
  missionNumber: 2,
  title: 'Target Practice',
  briefing: [
    'Time to put your skills to the test, pilot.',
    'Twelve target drones have been deployed around the arena in three concentric rings.',
    'You have 90 seconds to destroy them all. The clock starts when you fire your first shot.',
    'Inner targets are weaker, outer targets are more heavily armored.',
    'Accuracy and weapon selection will be key. Choose your mech wisely.',
  ],

  objectives: [
    {
      id: 'destroy-all-targets',
      type: 'destroy_all',
      description: 'Destroy all 12 target drones',
      required: true,
      showProgress: true,
    },
    {
      id: 'bonus-time',
      type: 'survive',
      description: 'Complete in under 60 seconds',
      required: false,
      duration: 60,
    },
  ],

  victoryCondition: 'destroy_all',
  defeatCondition: 'time_limit',
  timeLimit: 90,
  parTime: 60,
  showTimer: true,

  recommendedMechs: ['MADCAT', 'ATLAS'],
};

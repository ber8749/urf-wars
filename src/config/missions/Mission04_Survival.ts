import type { MissionConfig } from './MissionConfig';
import { LIGHTING_PRESETS } from '../maps/MapConfig';

/**
 * Mission 4: Survival
 * Survive for 3 minutes against waves of enemies in a night combat scenario.
 * Tests defensive combat and heat management.
 */
export const MISSION_04_SURVIVAL: MissionConfig = {
  id: 'mission-04-survival',
  name: 'Survival',
  description: 'Survive against overwhelming odds',

  terrain: {
    type: 'flat',
    size: 500,
    groundColor: 0x2a2a2a,
    gridColorMajor: 0x3a3a3a,
    gridColorMinor: 0x333333,
    showDebugMarkers: false,
  },

  environment: {
    skyColor: 0x0a0a1a,
    fogColor: 0x0a0a15,
    fogDensity: 0.003,
    lighting: LIGHTING_PRESETS.NIGHT,
  },

  playerSpawn: {
    position: { x: 0, y: 15, z: 0 },
    facing: 0,
  },

  // Wave targets - spawned around the perimeter
  // Note: In a full implementation, these would spawn in waves via ObjectiveSystem
  targets: [
    // Wave 1 - Light targets
    { position: { x: -80, y: 6, z: -80 }, health: 60 },
    { position: { x: 80, y: 6, z: -80 }, health: 60 },
    { position: { x: -80, y: 6, z: 80 }, health: 60 },
    { position: { x: 80, y: 6, z: 80 }, health: 60 },

    // Wave 2 - Medium targets (closer)
    { position: { x: 0, y: 6, z: -60 }, health: 100 },
    { position: { x: 60, y: 6, z: 0 }, health: 100 },
    { position: { x: 0, y: 6, z: 60 }, health: 100 },
    { position: { x: -60, y: 6, z: 0 }, health: 100 },

    // Wave 3 - Heavy targets
    { position: { x: -40, y: 6, z: -40 }, health: 150 },
    { position: { x: 40, y: 6, z: -40 }, health: 150 },
    { position: { x: 40, y: 6, z: 40 }, health: 150 },
    { position: { x: -40, y: 6, z: 40 }, health: 150 },
  ],

  turrets: [
    // Perimeter turrets that activate over time
    {
      position: { x: -100, y: 0, z: 0 },
      detectionRange: 120,
      weaponType: 'autocannon',
      health: 80,
    },
    {
      position: { x: 100, y: 0, z: 0 },
      detectionRange: 120,
      weaponType: 'autocannon',
      health: 80,
    },
    {
      position: { x: 0, y: 0, z: -100 },
      detectionRange: 120,
      weaponType: 'laser',
      health: 80,
    },
    {
      position: { x: 0, y: 0, z: 100 },
      detectionRange: 120,
      weaponType: 'laser',
      health: 80,
    },
  ],

  obstacles: [
    // Central defensive position
    {
      type: 'box',
      position: { x: -15, y: 4, z: -15 },
      size: { x: 6, y: 8, z: 6 },
      color: 0x4a4a4a,
    },
    {
      type: 'box',
      position: { x: 15, y: 4, z: -15 },
      size: { x: 6, y: 8, z: 6 },
      color: 0x4a4a4a,
    },
    {
      type: 'box',
      position: { x: -15, y: 4, z: 15 },
      size: { x: 6, y: 8, z: 6 },
      color: 0x4a4a4a,
    },
    {
      type: 'box',
      position: { x: 15, y: 4, z: 15 },
      size: { x: 6, y: 8, z: 6 },
      color: 0x4a4a4a,
    },

    // Outer ring cover
    {
      type: 'cylinder',
      position: { x: -50, y: 6, z: 0 },
      size: { x: 5, y: 12, z: 5 },
      color: 0x5a5a5a,
    },
    {
      type: 'cylinder',
      position: { x: 50, y: 6, z: 0 },
      size: { x: 5, y: 12, z: 5 },
      color: 0x5a5a5a,
    },
    {
      type: 'cylinder',
      position: { x: 0, y: 6, z: -50 },
      size: { x: 5, y: 12, z: 5 },
      color: 0x5a5a5a,
    },
    {
      type: 'cylinder',
      position: { x: 0, y: 6, z: 50 },
      size: { x: 5, y: 12, z: 5 },
      color: 0x5a5a5a,
    },

    // Arena walls
    {
      type: 'wall',
      position: { x: -130, y: 10, z: 0 },
      size: { x: 4, y: 20, z: 260 },
      color: 0x3a3a3a,
    },
    {
      type: 'wall',
      position: { x: 130, y: 10, z: 0 },
      size: { x: 4, y: 20, z: 260 },
      color: 0x3a3a3a,
    },
    {
      type: 'wall',
      position: { x: 0, y: 10, z: -130 },
      size: { x: 260, y: 20, z: 4 },
      color: 0x3a3a3a,
    },
    {
      type: 'wall',
      position: { x: 0, y: 10, z: 130 },
      size: { x: 260, y: 20, z: 4 },
      color: 0x3a3a3a,
    },
  ],

  // Mission metadata
  missionNumber: 4,
  title: 'Survival',
  briefing: [
    'Your extraction has been delayed. Enemy forces are closing in from all directions.',
    'You must hold your position for 3 minutes until reinforcements arrive.',
    'The enemy will attack in waves - each wave more aggressive than the last.',
    'Night conditions limit visibility. Watch your heat levels - overheating in combat is fatal.',
    'Use the central defensive position and manage your resources. Survive at all costs.',
  ],

  objectives: [
    {
      id: 'survive',
      type: 'survive',
      description: 'Survive for 3 minutes',
      required: true,
      duration: 180, // 3 minutes
    },
    {
      id: 'destroy-bonus',
      type: 'destroy_all',
      description: 'Destroy all enemies (bonus)',
      required: false,
      showProgress: true,
    },
  ],

  victoryCondition: 'survive_time',
  defeatCondition: 'player_destroyed',
  timeLimit: 180,
  showTimer: true,

  difficulty: {
    enemyAccuracy: 0.9,
    enemyDamage: 0.9,
    playerDamage: 1.1,
    enemyHealth: 1.0,
  },

  recommendedMechs: ['ATLAS', 'URBANMECH'],
};

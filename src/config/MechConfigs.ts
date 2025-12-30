import type { MechConfig } from '../types';

/**
 * Mech constants - single source of truth for mech-wide settings.
 */
export const MECH_CONSTANTS = {
  /** Head pitch limits (radians) - negative = look down, positive = look up */
  HEAD_PITCH: {
    /** Maximum downward pitch (negative value) */
    min: -0.4,
    /** Maximum upward pitch (positive value) */
    max: 0.3,
  },

  /** Mesh rendering offsets (tied to MechModel geometry) */
  MESH: {
    /**
     * Position offset from physics body to mesh.
     * Calculated so mesh feet (-2.4 in mesh space) align with collision bottom (-5.0).
     * Offset = -5.0 + 2.4 = -2.6
     */
    positionOffset: { x: 0, y: -2.6, z: 0 },
    /** Rotation offset (180° Y rotation for mesh facing) */
    rotationOffset: { x: 0, y: Math.PI, z: 0 },
  },

  /** Physics body collision shape dimensions */
  COLLISION: {
    /** Main torso capsule */
    torso: {
      halfHeight: 2.5,
      radius: 1.5,
      offsetY: 3,
    },
    /** Leg capsule */
    legs: {
      halfHeight: 2.0,
      radius: 1.0,
      offsetY: -2,
    },
  },
} as const;

/**
 * Predefined mech configurations.
 */
export const MechConfigs: Record<string, MechConfig> = {
  ATLAS: {
    name: 'Atlas',
    maxSpeed: 25,
    turnRate: 1.5,
    torsoTurnRate: 2.0,
    mass: 100,
    maxHeat: 100,
    heatDissipation: 5,
    baseArmor: {
      head: 100,
      torso: 100,
      leftArm: 100,
      rightArm: 100,
      leftLeg: 100,
      rightLeg: 100,
    },
    hardpoints: [
      { slot: 1, position: { x: -2.4, y: 0, z: 1 }, weaponType: 'laser' },
      { slot: 2, position: { x: 2.4, y: 0, z: 1 }, weaponType: 'autocannon' },
      { slot: 3, position: { x: -1.5, y: 1.5, z: 1 }, weaponType: 'ppc' },
      { slot: 4, position: { x: 1.5, y: 1.5, z: 1 }, weaponType: 'missile' },
    ],
  },

  MADCAT: {
    name: 'Mad Cat',
    maxSpeed: 35,
    turnRate: 2.0,
    torsoTurnRate: 2.5,
    mass: 75,
    maxHeat: 80,
    heatDissipation: 6,
    baseArmor: {
      head: 80,
      torso: 90,
      leftArm: 70,
      rightArm: 70,
      leftLeg: 85,
      rightLeg: 85,
    },
    hardpoints: [
      { slot: 1, position: { x: -2.0, y: 0, z: 1 }, weaponType: 'laser' },
      { slot: 2, position: { x: 2.0, y: 0, z: 1 }, weaponType: 'laser' },
      { slot: 3, position: { x: -1.8, y: 1.2, z: 1 }, weaponType: 'missile' },
      { slot: 4, position: { x: 1.8, y: 1.2, z: 1 }, weaponType: 'missile' },
    ],
  },

  URBANMECH: {
    name: 'UrbanMech',
    maxSpeed: 15,
    turnRate: 1.0,
    torsoTurnRate: 1.5,
    mass: 30,
    maxHeat: 50,
    heatDissipation: 3,
    baseArmor: {
      head: 40,
      torso: 60,
      leftArm: 30,
      rightArm: 30,
      leftLeg: 40,
      rightLeg: 40,
    },
    hardpoints: [
      { slot: 1, position: { x: 1.5, y: 0, z: 1 }, weaponType: 'autocannon' },
      { slot: 2, position: { x: -1.5, y: 0, z: 1 }, weaponType: 'laser' },
    ],
  },
};

/**
 * Get list of available mech IDs.
 */
export function getAvailableMechIds(): string[] {
  return Object.keys(MechConfigs);
}

/**
 * Get a mech config by ID with fallback to ATLAS.
 */
export function getMechById(id: string): MechConfig {
  return MechConfigs[id] ?? MechConfigs.ATLAS;
}

import type { MechConfig } from '../types';

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

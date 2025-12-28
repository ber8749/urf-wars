// Core types used throughout the game

export interface Vector3Like {
  x: number;
  y: number;
  z: number;
}

export interface EulerLike {
  x: number;
  y: number;
  z: number;
}

// Entity system types
export type EntityType = 'mech' | 'projectile' | 'terrain' | 'prop';

export interface SerializableState {
  position: Vector3Like;
  rotation: EulerLike;
  velocity: Vector3Like;
  [key: string]: unknown;
}

// Input types
export interface InputSnapshot {
  timestamp: number;
  // Movement (W/S)
  forward: boolean;
  backward: boolean;
  // Turning (A/D)
  turnLeft: boolean;
  turnRight: boolean;
  // Torso/Head control (Arrow keys)
  torsoLeft: boolean;
  torsoRight: boolean;
  lookUp: boolean;
  lookDown: boolean;
  // Actions
  fire: boolean;
  altFire: boolean;
  // Mouse
  mouseX: number;
  mouseY: number;
  mouseDeltaX: number;
  mouseDeltaY: number;
  weaponSlot: number;
}

// Mech types
export interface ArmorZones {
  head: number;
  torso: number;
  leftArm: number;
  rightArm: number;
  leftLeg: number;
  rightLeg: number;
}

export interface MechConfig {
  name: string;
  maxSpeed: number;
  turnRate: number;
  torsoTurnRate: number;
  mass: number;
  maxHeat: number;
  heatDissipation: number;
  baseArmor: ArmorZones;
  hardpoints: HardpointConfig[];
}

export interface HardpointConfig {
  slot: number;
  position: Vector3Like;
  weaponType: WeaponType;
}

export type WeaponType = 'laser' | 'ppc' | 'missile' | 'autocannon';

export interface WeaponConfig {
  type: WeaponType;
  damage: number;
  heatGenerated: number;
  cooldown: number;
  projectileSpeed: number;
  range: number;
  ammo?: number;
  /** If true, weapon only fires once per button press (not continuous) */
  semiAuto?: boolean;
}

// Camera types
export type CameraMode = 'first-person' | 'third-person';

// Network types (for future multiplayer)
export interface NetworkMessage {
  type: string;
  timestamp: number;
  payload: unknown;
}

export interface PlayerState extends SerializableState {
  id: string;
  heat: number;
  armor: ArmorZones;
  weapons: WeaponState[];
}

export interface WeaponState {
  slot: number;
  type: WeaponType;
  cooldownRemaining: number;
  ammo?: number;
}

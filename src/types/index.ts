// Color palette from design spec
export const COLORS = {
  ground: 0xe0e0e0,
  gridLines: 0xb0b0b0,
  obstacles: 0x404040,
  playerMech: 0x2563eb,
  enemy: 0xdc2626,
  weaponFire: 0xf59e0b,
  damageFlash: 0xef4444,
  skyTop: 0x87ceeb,
  skyBottom: 0xffffff,
} as const;

// Mech component locations
export const ComponentLocation = {
  Head: 'head',
  CenterTorso: 'centerTorso',
  LeftTorso: 'leftTorso',
  RightTorso: 'rightTorso',
  LeftArm: 'leftArm',
  RightArm: 'rightArm',
  LeftLeg: 'leftLeg',
  RightLeg: 'rightLeg',
} as const;

export type ComponentLocation = typeof ComponentLocation[keyof typeof ComponentLocation];

// Component damage state
export interface ComponentState {
  location: ComponentLocation;
  maxArmor: number;
  currentArmor: number;
  maxStructure: number;
  currentStructure: number;
  destroyed: boolean;
}

// Weapon types
export const WeaponType = {
  Laser: 'laser',
  Autocannon: 'autocannon',
} as const;

export type WeaponType = typeof WeaponType[keyof typeof WeaponType];

// Weapon configuration
export interface WeaponConfig {
  name: string;
  type: WeaponType;
  damage: number;
  cooldown: number; // seconds
  range: number;
  projectileSpeed?: number; // for ballistic weapons
  mountLocation: ComponentLocation;
}

// Input state
export interface InputState {
  forward: boolean;
  backward: boolean;
  strafeLeft: boolean;
  strafeRight: boolean;
  turnLeft: boolean;
  turnRight: boolean;
  fire1: boolean;
  fire2: boolean;
  switchCamera: boolean;
  mouseX: number;
  mouseY: number;
  mouseDeltaX: number;
  mouseDeltaY: number;
}

// Camera modes
export const CameraMode = {
  Cockpit: 'cockpit',
  ThirdPerson: 'thirdPerson',
} as const;

export type CameraMode = typeof CameraMode[keyof typeof CameraMode];

// Game events
export type GameEvent =
  | { type: 'damage'; target: string; location: ComponentLocation; amount: number }
  | { type: 'componentDestroyed'; target: string; location: ComponentLocation }
  | { type: 'mechDestroyed'; target: string }
  | { type: 'weaponFired'; weapon: string; position: [number, number, number] };

// Mech configuration
export interface MechConfig {
  name: string;
  maxSpeed: number; // m/s
  turnRate: number; // rad/s for legs
  torsoTwistRate: number; // rad/s
  torsoTwistLimit: number; // max radians from center
  torsoPitchLimit: number; // max pitch up/down
  components: Record<ComponentLocation, { armor: number; structure: number }>;
}


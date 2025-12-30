import type { WeaponType } from '../../types';

/**
 * 3D position for map objects
 */
export interface MapPosition {
  x: number;
  y: number;
  z: number;
}

/**
 * Lighting preset for a map
 */
export interface MapLighting {
  /** Ambient light color */
  ambientColor: number;
  /** Ambient light intensity */
  ambientIntensity: number;
  /** Directional (sun) light color */
  directionalColor: number;
  /** Directional light intensity */
  directionalIntensity: number;
  /** Sun position */
  sunPosition: MapPosition;
}

/**
 * Environment/atmosphere settings
 */
export interface MapEnvironment {
  /** Sky/background color */
  skyColor: number;
  /** Optional fog color (if undefined, no fog) */
  fogColor?: number;
  /** Fog density (0-1) */
  fogDensity?: number;
  /** Lighting configuration */
  lighting: MapLighting;
}

/**
 * Terrain configuration
 */
export interface MapTerrain {
  /** Terrain generation type */
  type: 'flat' | 'heightfield';
  /** Size of the terrain (square) */
  size: number;
  /** Ground color */
  groundColor: number;
  /** Grid line color (major) */
  gridColorMajor: number;
  /** Grid line color (minor) */
  gridColorMinor: number;
  /** Whether to show debug markers (cardinal directions, distance rings) */
  showDebugMarkers: boolean;
}

/**
 * Player spawn configuration
 */
export interface PlayerSpawn {
  /** Spawn position (y is height offset above terrain) */
  position: MapPosition;
  /** Initial facing direction in degrees (0 = north/+Z, 90 = east/+X) */
  facing: number;
}

/**
 * Target (bullseye) spawn configuration
 */
export interface TargetSpawn {
  /** Position (y is height offset above terrain) */
  position: MapPosition;
  /** Face toward position (usually player spawn) */
  faceToward?: MapPosition;
  /** Optional health override */
  health?: number;
}

/**
 * Turret spawn configuration
 */
export interface TurretSpawn {
  /** Position (y is height above terrain, usually 0) */
  position: MapPosition;
  /** Detection range in meters */
  detectionRange?: number;
  /** Weapon type */
  weaponType?: WeaponType;
  /** Optional health override */
  health?: number;
}

/**
 * Obstacle configuration
 */
export interface ObstacleConfig {
  /** Obstacle type */
  type: 'box' | 'cylinder' | 'wall';
  /** Position (y is center height above terrain) */
  position: MapPosition;
  /** Size/scale (interpretation depends on type) */
  size: MapPosition;
  /** Color */
  color: number;
  /** Rotation in degrees (Y axis only) */
  rotation?: number;
}

/**
 * Complete map configuration
 */
export interface MapConfig {
  /** Unique map identifier */
  id: string;
  /** Display name */
  name: string;
  /** Short description */
  description: string;

  /** Terrain settings */
  terrain: MapTerrain;

  /** Environment/atmosphere */
  environment: MapEnvironment;

  /** Player spawn point */
  playerSpawn: PlayerSpawn;

  /** Target spawns */
  targets: TargetSpawn[];

  /** Turret spawns */
  turrets: TurretSpawn[];

  /** Static obstacles */
  obstacles: ObstacleConfig[];
}

/**
 * Default lighting preset - bright daylight
 */
export const LIGHTING_PRESETS = {
  DAYLIGHT: {
    ambientColor: 0xffffff,
    ambientIntensity: 1.2,
    directionalColor: 0xffffff,
    directionalIntensity: 2.0,
    sunPosition: { x: 50, y: 150, z: 100 },
  },
  SUNSET: {
    ambientColor: 0xffd4a3,
    ambientIntensity: 0.8,
    directionalColor: 0xff8c42,
    directionalIntensity: 1.5,
    sunPosition: { x: -100, y: 30, z: 50 },
  },
  OVERCAST: {
    ambientColor: 0xb8c4ce,
    ambientIntensity: 1.5,
    directionalColor: 0xd4d4d4,
    directionalIntensity: 0.8,
    sunPosition: { x: 0, y: 200, z: 0 },
  },
  NIGHT: {
    ambientColor: 0x1a1a2e,
    ambientIntensity: 0.4,
    directionalColor: 0x4a6fa5,
    directionalIntensity: 0.3,
    sunPosition: { x: -50, y: 100, z: -50 },
  },
} as const;

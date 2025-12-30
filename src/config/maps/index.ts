// Map configuration types
export type {
  MapConfig,
  MapPosition,
  MapTerrain,
  MapEnvironment,
  MapLighting,
  PlayerSpawn,
  TargetSpawn,
  TurretSpawn,
  ObstacleConfig,
} from './MapConfig';
export { LIGHTING_PRESETS } from './MapConfig';

// Individual map configurations
export { DEBUG_ARENA } from './DebugArena';
export { TRAINING_GROUND } from './TrainingGround';
export { COMBAT_ZONE } from './CombatZone';

// Map registry - all available maps
import type { MapConfig } from './MapConfig';
import { DEBUG_ARENA } from './DebugArena';
import { TRAINING_GROUND } from './TrainingGround';
import { COMBAT_ZONE } from './CombatZone';

/**
 * Registry of all available maps, keyed by map ID.
 */
export const MAP_REGISTRY: Record<string, MapConfig> = {
  [DEBUG_ARENA.id]: DEBUG_ARENA,
  [TRAINING_GROUND.id]: TRAINING_GROUND,
  [COMBAT_ZONE.id]: COMBAT_ZONE,
};

/**
 * Get a map by ID, with fallback to debug arena.
 */
export function getMapById(id: string): MapConfig {
  return MAP_REGISTRY[id] ?? DEBUG_ARENA;
}

/**
 * Get list of all available map IDs.
 */
export function getAvailableMapIds(): string[] {
  return Object.keys(MAP_REGISTRY);
}

/**
 * Default map to load
 */
export const DEFAULT_MAP_ID = DEBUG_ARENA.id;

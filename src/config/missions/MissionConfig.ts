import type { MapConfig, MapPosition } from '../maps/MapConfig';

/**
 * Types of victory conditions for missions
 */
export type VictoryCondition =
  | 'destroy_all' // Destroy all enemies
  | 'destroy_targets' // Destroy specific targets
  | 'survive_time' // Survive for a duration
  | 'reach_zone' // Reach a specific location
  | 'defend' // Protect something for a duration
  | 'custom'; // Custom condition checked by ObjectiveSystem

/**
 * Types of defeat conditions for missions
 */
export type DefeatCondition =
  | 'player_destroyed' // Player mech destroyed
  | 'time_limit' // Time runs out
  | 'objective_failed' // A required objective failed
  | 'custom'; // Custom condition

/**
 * Types of mission objectives
 */
export type ObjectiveType =
  | 'destroy' // Destroy specific targets
  | 'destroy_all' // Destroy all enemies
  | 'protect' // Keep something alive
  | 'reach' // Reach a location
  | 'survive' // Survive for duration
  | 'collect'; // Collect/interact with objects

/**
 * Status of an objective during gameplay
 */
export type ObjectiveStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'failed';

/**
 * Configuration for a single mission objective
 */
export interface ObjectiveConfig {
  /** Unique identifier for this objective */
  id: string;
  /** Type of objective */
  type: ObjectiveType;
  /** Player-facing description */
  description: string;
  /** Whether this is required for mission success */
  required: boolean;
  /** Entity IDs this objective tracks (for destroy/protect) */
  targetIds?: string[];
  /** Target position (for reach objectives) */
  position?: MapPosition;
  /** Radius for position-based objectives */
  radius?: number;
  /** Duration in seconds (for survive/protect) */
  duration?: number;
  /** Count required (for destroy X of Y) */
  targetCount?: number;
  /** Whether to show progress (e.g., "2/5 destroyed") */
  showProgress?: boolean;
}

/**
 * Mission difficulty settings
 */
export interface MissionDifficulty {
  /** Enemy accuracy multiplier (1.0 = normal) */
  enemyAccuracy: number;
  /** Enemy damage multiplier */
  enemyDamage: number;
  /** Player damage multiplier */
  playerDamage: number;
  /** Enemy health multiplier */
  enemyHealth: number;
}

/**
 * Default difficulty presets
 */
export const DIFFICULTY_PRESETS: Record<string, MissionDifficulty> = {
  easy: {
    enemyAccuracy: 0.6,
    enemyDamage: 0.7,
    playerDamage: 1.2,
    enemyHealth: 0.8,
  },
  normal: {
    enemyAccuracy: 1.0,
    enemyDamage: 1.0,
    playerDamage: 1.0,
    enemyHealth: 1.0,
  },
  hard: {
    enemyAccuracy: 1.3,
    enemyDamage: 1.3,
    playerDamage: 0.9,
    enemyHealth: 1.3,
  },
  veteran: {
    enemyAccuracy: 1.5,
    enemyDamage: 1.5,
    playerDamage: 0.8,
    enemyHealth: 1.5,
  },
};

/**
 * Complete mission configuration extending MapConfig
 */
export interface MissionConfig extends MapConfig {
  // ========== Campaign Metadata ==========

  /** Mission number in campaign sequence (1-based) */
  missionNumber: number;

  /** Mission title displayed in UI */
  title: string;

  /** Briefing paragraphs shown before mission */
  briefing: string[];

  // ========== Objectives ==========

  /** List of mission objectives */
  objectives: ObjectiveConfig[];

  // ========== Victory/Defeat Conditions ==========

  /** Primary victory condition */
  victoryCondition: VictoryCondition;

  /** Primary defeat condition */
  defeatCondition: DefeatCondition;

  /** Time limit in seconds (optional) */
  timeLimit?: number;

  /** Par time for bonus (optional) */
  parTime?: number;

  // ========== Rewards/Progression ==========

  /** Mech ID unlocked on completion */
  unlocksMech?: string;

  /** Map ID unlocked for instant action */
  unlocksMap?: string;

  // ========== Mission-specific Settings ==========

  /** Recommended mech IDs for this mission */
  recommendedMechs?: string[];

  /** Difficulty overrides for this mission */
  difficulty?: Partial<MissionDifficulty>;

  /** Whether to show the mission timer in HUD */
  showTimer?: boolean;

  /** Custom data for special mission mechanics */
  customData?: Record<string, unknown>;
}

/**
 * Runtime state for tracking objective progress
 */
export interface ObjectiveState {
  config: ObjectiveConfig;
  status: ObjectiveStatus;
  /** Current progress (e.g., enemies killed) */
  progress: number;
  /** Target progress for completion */
  targetProgress: number;
  /** Time remaining for timed objectives */
  timeRemaining?: number;
}

/**
 * Runtime state for the entire mission
 */
export interface MissionState {
  config: MissionConfig;
  objectives: Map<string, ObjectiveState>;
  startTime: number;
  elapsedTime: number;
  isComplete: boolean;
  isVictory: boolean;
}

/**
 * Helper to create a basic "destroy all" objective
 */
export function createDestroyAllObjective(
  id: string = 'destroy-all',
  description: string = 'Destroy all enemies'
): ObjectiveConfig {
  return {
    id,
    type: 'destroy_all',
    description,
    required: true,
    showProgress: true,
  };
}

/**
 * Helper to create a survive objective
 */
export function createSurviveObjective(
  duration: number,
  id: string = 'survive',
  description?: string
): ObjectiveConfig {
  return {
    id,
    type: 'survive',
    description:
      description ??
      `Survive for ${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}`,
    required: true,
    duration,
  };
}

/**
 * Helper to create a destroy specific targets objective
 */
export function createDestroyTargetsObjective(
  targetIds: string[],
  id: string = 'destroy-targets',
  description?: string
): ObjectiveConfig {
  return {
    id,
    type: 'destroy',
    description:
      description ?? `Destroy designated targets (${targetIds.length})`,
    required: true,
    targetIds,
    targetCount: targetIds.length,
    showProgress: true,
  };
}

// Mission configuration types
export type {
  MissionConfig,
  ObjectiveConfig,
  ObjectiveState,
  MissionState,
  MissionDifficulty,
  VictoryCondition,
  DefeatCondition,
  ObjectiveType,
  ObjectiveStatus,
} from './MissionConfig';

export {
  DIFFICULTY_PRESETS,
  createDestroyAllObjective,
  createSurviveObjective,
  createDestroyTargetsObjective,
} from './MissionConfig';

// Individual mission configurations
import type { MissionConfig } from './MissionConfig';

// Mission imports (will be added as missions are created)
import { MISSION_01_FIRST_CONTACT } from './Mission01_FirstContact';
import { MISSION_02_TARGET_PRACTICE } from './Mission02_TargetPractice';
import { MISSION_03_TURRET_GAUNTLET } from './Mission03_TurretGauntlet';
import { MISSION_04_SURVIVAL } from './Mission04_Survival';
import { MISSION_05_FINAL_ASSAULT } from './Mission05_FinalAssault';

/**
 * Registry of all campaign missions, keyed by mission number
 */
export const MISSION_REGISTRY: Record<number, MissionConfig> = {
  1: MISSION_01_FIRST_CONTACT,
  2: MISSION_02_TARGET_PRACTICE,
  3: MISSION_03_TURRET_GAUNTLET,
  4: MISSION_04_SURVIVAL,
  5: MISSION_05_FINAL_ASSAULT,
};

/**
 * Get mission by number
 */
export function getMissionByNumber(num: number): MissionConfig | undefined {
  return MISSION_REGISTRY[num];
}

/**
 * Get all available mission numbers in order
 */
export function getMissionNumbers(): number[] {
  return Object.keys(MISSION_REGISTRY)
    .map(Number)
    .sort((a, b) => a - b);
}

/**
 * Get total number of missions
 */
export function getTotalMissions(): number {
  return Object.keys(MISSION_REGISTRY).length;
}

/**
 * Check if a mission number is valid
 */
export function isValidMission(num: number): boolean {
  return num in MISSION_REGISTRY;
}

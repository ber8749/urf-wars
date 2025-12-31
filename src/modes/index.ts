// Game mode types and interfaces
export type {
  GameMode,
  GameModeType,
  GameModeConfig,
  GameResult,
  GameModeCallbacks,
} from './GameMode';

// Game mode manager
export { GameModeManager } from './GameModeManager';
export type { CampaignProgress } from './GameModeManager';

// Mode implementations (will be added)
export { InstantActionMode } from './InstantActionMode';
export { CampaignMode } from './CampaignMode';

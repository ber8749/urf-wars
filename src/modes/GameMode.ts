/**
 * Game mode types
 */
export type GameModeType = 'instant-action' | 'campaign';

/**
 * Result of a completed game session
 */
export interface GameResult {
  /** Whether the player won */
  victory: boolean;
  /** Time played in seconds */
  timePlayed: number;
  /** Enemies destroyed count */
  enemiesDestroyed: number;
  /** Damage dealt */
  damageDealt: number;
  /** Damage taken */
  damageTaken: number;
  /** Objectives completed (for campaign) */
  objectivesCompleted?: string[];
  /** Custom data for specific modes */
  customData?: Record<string, unknown>;
}

/**
 * Configuration passed to a game mode when starting
 */
export interface GameModeConfig {
  /** Container element for rendering */
  container: HTMLElement;
  /** Map ID to load */
  mapId: string;
  /** Mech ID to use */
  mechId: string;
  /** Mission number (for campaign) */
  missionNumber?: number;
  /** Additional mode-specific settings */
  settings?: Record<string, unknown>;
}

/**
 * Base interface for all game modes.
 * Each mode manages its own lifecycle and UI flow.
 */
export interface GameMode {
  /** Unique identifier for this mode type */
  readonly type: GameModeType;

  /**
   * Initialize the mode (load assets, setup state)
   */
  init(): Promise<void>;

  /**
   * Start the mode (show UI, begin gameplay)
   */
  start(): void;

  /**
   * Pause the mode
   */
  pause(): void;

  /**
   * Resume from pause
   */
  resume(): void;

  /**
   * End the mode and return results
   */
  end(): GameResult | null;

  /**
   * Clean up resources
   */
  dispose(): void;

  /**
   * Check if the mode is currently active/running
   */
  isActive(): boolean;
}

/**
 * Callback types for mode manager events
 */
export interface GameModeCallbacks {
  onModeStart?: (mode: GameMode) => void;
  onModeEnd?: (mode: GameMode, result: GameResult | null) => void;
  onReturnToMenu?: () => void;
}

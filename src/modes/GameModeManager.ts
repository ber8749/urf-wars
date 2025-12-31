import { EventBus } from '../core/EventBus';
import type {
  GameMode,
  GameModeConfig,
  GameResult,
  GameModeCallbacks,
} from './GameMode';

/**
 * Campaign progress state persisted to localStorage
 */
export interface CampaignProgress {
  /** Completed mission numbers */
  completedMissions: number[];
  /** Unlocked mech IDs */
  unlockedMechs: string[];
  /** Unlocked map IDs */
  unlockedMaps: string[];
  /** Best times per mission (in seconds) */
  bestTimes: Record<number, number>;
  /** Last played mission number */
  lastMission: number;
}

const CAMPAIGN_STORAGE_KEY = 'urf-wars-campaign-progress';

/**
 * Manages game mode lifecycle, transitions, and state persistence.
 * Acts as a coordinator between the main menu and active game modes.
 */
export class GameModeManager {
  private currentMode: GameMode | null = null;
  private callbacks: GameModeCallbacks = {};
  private campaignProgress: CampaignProgress;

  constructor() {
    this.campaignProgress = this.loadCampaignProgress();
    this.setupEventListeners();
  }

  /**
   * Set callbacks for mode lifecycle events
   */
  setCallbacks(callbacks: GameModeCallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * Start a new game mode
   */
  async startMode(mode: GameMode, _config: GameModeConfig): Promise<void> {
    // End current mode if active
    if (this.currentMode) {
      this.endCurrentMode();
    }

    this.currentMode = mode;

    try {
      await mode.init();
      mode.start();
      this.callbacks.onModeStart?.(mode);
      EventBus.emit('mode:started', mode.type);
    } catch (error) {
      console.error('Failed to start game mode:', error);
      this.currentMode = null;
      throw error;
    }
  }

  /**
   * End the current mode and return to menu
   */
  endCurrentMode(): GameResult | null {
    if (!this.currentMode) return null;

    const result = this.currentMode.end();
    this.callbacks.onModeEnd?.(this.currentMode, result);
    EventBus.emit('mode:ended', this.currentMode.type, result);

    this.currentMode.dispose();
    this.currentMode = null;

    return result;
  }

  /**
   * Return to main menu
   */
  returnToMenu(): void {
    this.endCurrentMode();
    this.callbacks.onReturnToMenu?.();
    EventBus.emit('mode:return-to-menu');
  }

  /**
   * Get the currently active mode
   */
  getCurrentMode(): GameMode | null {
    return this.currentMode;
  }

  /**
   * Check if a mode is currently running
   */
  hasActiveMode(): boolean {
    return this.currentMode !== null && this.currentMode.isActive();
  }

  // ========== Campaign Progress Management ==========

  /**
   * Get current campaign progress
   */
  getCampaignProgress(): CampaignProgress {
    return { ...this.campaignProgress };
  }

  /**
   * Mark a mission as completed
   */
  completeMission(missionNumber: number, time: number): void {
    if (!this.campaignProgress.completedMissions.includes(missionNumber)) {
      this.campaignProgress.completedMissions.push(missionNumber);
    }

    // Update best time
    const currentBest = this.campaignProgress.bestTimes[missionNumber];
    if (!currentBest || time < currentBest) {
      this.campaignProgress.bestTimes[missionNumber] = time;
    }

    this.campaignProgress.lastMission = missionNumber;
    this.saveCampaignProgress();
  }

  /**
   * Unlock a mech for use in campaign
   */
  unlockMech(mechId: string): void {
    if (!this.campaignProgress.unlockedMechs.includes(mechId)) {
      this.campaignProgress.unlockedMechs.push(mechId);
      this.saveCampaignProgress();
      EventBus.emit('campaign:mech-unlocked', mechId);
    }
  }

  /**
   * Unlock a map for instant action
   */
  unlockMap(mapId: string): void {
    if (!this.campaignProgress.unlockedMaps.includes(mapId)) {
      this.campaignProgress.unlockedMaps.push(mapId);
      this.saveCampaignProgress();
      EventBus.emit('campaign:map-unlocked', mapId);
    }
  }

  /**
   * Check if a mission is unlocked
   */
  isMissionUnlocked(missionNumber: number): boolean {
    // Mission 1 is always unlocked
    if (missionNumber === 1) return true;
    // Other missions require previous mission to be completed
    return this.campaignProgress.completedMissions.includes(missionNumber - 1);
  }

  /**
   * Check if a mission is completed
   */
  isMissionCompleted(missionNumber: number): boolean {
    return this.campaignProgress.completedMissions.includes(missionNumber);
  }

  /**
   * Reset campaign progress
   */
  resetCampaignProgress(): void {
    this.campaignProgress = this.getDefaultProgress();
    this.saveCampaignProgress();
    EventBus.emit('campaign:progress-reset');
  }

  // ========== Private Methods ==========

  private setupEventListeners(): void {
    // Listen for mission events
    EventBus.on('mission:victory', (missionNumber: number, time: number) => {
      this.completeMission(missionNumber, time);
    });

    EventBus.on('game:return-to-menu', () => {
      this.returnToMenu();
    });
  }

  private loadCampaignProgress(): CampaignProgress {
    try {
      const stored = localStorage.getItem(CAMPAIGN_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored) as CampaignProgress;
      }
    } catch (error) {
      console.warn('Failed to load campaign progress:', error);
    }
    return this.getDefaultProgress();
  }

  private saveCampaignProgress(): void {
    try {
      localStorage.setItem(
        CAMPAIGN_STORAGE_KEY,
        JSON.stringify(this.campaignProgress)
      );
    } catch (error) {
      console.warn('Failed to save campaign progress:', error);
    }
  }

  private getDefaultProgress(): CampaignProgress {
    return {
      completedMissions: [],
      unlockedMechs: ['ATLAS'], // Default mech always available
      unlockedMaps: ['debug-arena', 'training-ground'], // Default maps
      bestTimes: {},
      lastMission: 0,
    };
  }
}

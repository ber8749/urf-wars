import { Game } from '../core/Game';
import { MissionSelectScreen } from '../rendering/MissionSelectScreen';
import type { GameMode, GameResult } from './GameMode';

/**
 * Instant Action mode - quick battles with customizable settings.
 * Wraps the existing game flow with map/mech selection.
 */
export class InstantActionMode implements GameMode {
  readonly type = 'instant-action' as const;

  private container: HTMLElement;
  private game: Game | null = null;
  private missionSelect: MissionSelectScreen | null = null;
  private active: boolean = false;
  private startTime: number = 0;
  private onComplete: ((result: GameResult | null) => void) | null = null;

  constructor(
    container: HTMLElement,
    onComplete?: (result: GameResult | null) => void
  ) {
    this.container = container;
    this.onComplete = onComplete ?? null;
  }

  async init(): Promise<void> {
    // Nothing to pre-initialize for instant action
  }

  start(): void {
    this.active = true;
    this.showMissionSelect();
  }

  pause(): void {
    // Pause is handled by the Game's pause menu
  }

  resume(): void {
    // Resume is handled by the Game's pause menu
  }

  end(): GameResult | null {
    this.active = false;
    const result = this.createResult();

    if (this.game) {
      this.game.stop();
    }

    return result;
  }

  dispose(): void {
    this.active = false;

    if (this.missionSelect) {
      this.missionSelect.dispose();
      this.missionSelect = null;
    }

    // Note: Game cleanup would need to be added to Game class
    this.game = null;
  }

  isActive(): boolean {
    return this.active;
  }

  /**
   * Show the mission/mech selection screen
   */
  private showMissionSelect(): void {
    this.missionSelect = new MissionSelectScreen(
      this.container,
      async (mapId, mechId) => {
        await this.startGame(mapId, mechId);
      }
    );
  }

  /**
   * Start the actual game with selected map and mech
   */
  private async startGame(mapId: string, mechId: string): Promise<void> {
    // Clean up mission select screen
    if (this.missionSelect) {
      this.missionSelect.dispose();
      this.missionSelect = null;
    }

    // Create and start the game
    this.game = new Game(this.container, mapId, mechId);
    await this.game.init();
    this.startTime = Date.now();
    this.game.start();
  }

  /**
   * Create a game result from current state
   */
  private createResult(): GameResult {
    const timePlayed =
      this.startTime > 0 ? (Date.now() - this.startTime) / 1000 : 0;

    return {
      victory: true, // Instant action doesn't track victory
      timePlayed,
      enemiesDestroyed: 0, // Would need to track this
      damageDealt: 0,
      damageTaken: 0,
    };
  }
}

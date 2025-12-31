import { Game } from '../core/Game';
import { MapSelectScreen } from '../rendering/MapSelectScreen';
import { MechSelectScreen } from '../rendering/MechSelectScreen';
import type { GameMode, GameResult } from './GameMode';

/**
 * Instant Action mode - quick battles with customizable settings.
 * Flow: Map Select -> Mech Select -> Game
 */
export class InstantActionMode implements GameMode {
  readonly type = 'instant-action' as const;

  private container: HTMLElement;
  private game: Game | null = null;
  private mapSelectScreen: MapSelectScreen | null = null;
  private mechSelectScreen: MechSelectScreen | null = null;
  private selectedMapId: string | null = null;
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
    this.showMapSelect();
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

    if (this.mapSelectScreen) {
      this.mapSelectScreen.dispose();
      this.mapSelectScreen = null;
    }

    if (this.mechSelectScreen) {
      this.mechSelectScreen.dispose();
      this.mechSelectScreen = null;
    }

    this.game = null;
  }

  isActive(): boolean {
    return this.active;
  }

  /**
   * Step 1: Show map selection screen
   */
  private showMapSelect(): void {
    this.mapSelectScreen = new MapSelectScreen(
      this.container,
      (mapId) => {
        this.selectedMapId = mapId;
        this.showMechSelect(mapId);
      },
      () => {
        // Back button - return to main menu
        this.active = false;
        if (this.onComplete) {
          this.onComplete(null);
        }
      }
    );
  }

  /**
   * Step 2: Show mech selection screen
   */
  private showMechSelect(mapId: string): void {
    if (this.mapSelectScreen) {
      this.mapSelectScreen = null;
    }

    this.mechSelectScreen = new MechSelectScreen(
      this.container,
      mapId,
      async (mechId) => {
        await this.startGame(mapId, mechId);
      },
      () => {
        // Back button - return to map select
        if (this.mechSelectScreen) {
          this.mechSelectScreen = null;
        }
        this.showMapSelect();
      }
    );
  }

  /**
   * Step 3: Start the actual game with selected map and mech
   */
  private async startGame(mapId: string, mechId: string): Promise<void> {
    if (this.mechSelectScreen) {
      this.mechSelectScreen = null;
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

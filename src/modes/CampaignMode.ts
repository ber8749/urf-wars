import { Game } from '../core/Game';
import { EventBus } from '../core/EventBus';
import type { GameMode, GameResult } from './GameMode';
import type { GameModeManager } from './GameModeManager';
import type { MissionConfig } from '../config/missions/MissionConfig';
import { getMissionByNumber, getMissionNumbers } from '../config/missions';
import { CampaignScreen } from '../rendering/CampaignScreen';
import { BriefingScreen } from '../rendering/BriefingScreen';
import { DebriefingScreen } from '../rendering/DebriefingScreen';

/**
 * Campaign mode - story-driven missions with progression.
 * Manages mission flow: selection -> briefing -> gameplay -> debriefing.
 */
export class CampaignMode implements GameMode {
  readonly type = 'campaign' as const;

  private container: HTMLElement;
  private modeManager: GameModeManager;
  private game: Game | null = null;
  private active: boolean = false;
  private startTime: number = 0;
  private currentMission: MissionConfig | null = null;
  private selectedMechId: string = 'ATLAS';

  // UI Screens
  private campaignScreen: CampaignScreen | null = null;
  private briefingScreen: BriefingScreen | null = null;
  private debriefingScreen: DebriefingScreen | null = null;

  // Track game stats for debriefing
  private enemiesDestroyed: number = 0;
  private damageDealt: number = 0;
  private damageTaken: number = 0;

  constructor(container: HTMLElement, modeManager: GameModeManager) {
    this.container = container;
    this.modeManager = modeManager;
  }

  async init(): Promise<void> {
    this.setupEventListeners();
  }

  start(): void {
    this.active = true;
    this.showCampaignScreen();
  }

  pause(): void {
    // Pause handled by Game's pause menu
  }

  resume(): void {
    // Resume handled by Game's pause menu
  }

  end(): GameResult | null {
    this.active = false;
    return this.createResult();
  }

  dispose(): void {
    this.active = false;
    this.cleanupScreens();
    this.removeEventListeners();
    this.game = null;
    this.currentMission = null;
  }

  isActive(): boolean {
    return this.active;
  }

  // ========== Campaign Flow Methods ==========

  /**
   * Show the campaign mission selection screen
   */
  private showCampaignScreen(): void {
    // Clean up any existing screens
    this.cleanupScreens();

    this.campaignScreen = new CampaignScreen(
      this.container,
      this.modeManager,
      (mission) => this.showBriefing(mission),
      () => this.returnToMainMenu()
    );
  }

  /**
   * Show mission briefing with objectives and mech selection
   */
  private showBriefing(mission: MissionConfig): void {
    this.currentMission = mission;

    // Clean up campaign screen
    this.cleanupCampaignScreen();

    this.briefingScreen = new BriefingScreen(
      this.container,
      mission,
      this.modeManager,
      (mechId) => this.launchMission(mechId),
      () => this.showCampaignScreen()
    );
  }

  /**
   * Launch the mission with selected mech
   */
  private async launchMission(mechId: string): Promise<void> {
    if (!this.currentMission) return;

    this.selectedMechId = mechId;
    this.cleanupBriefingScreen();

    // Reset stats
    this.enemiesDestroyed = 0;
    this.damageDealt = 0;
    this.damageTaken = 0;

    // Show loading indicator
    const loading = document.getElementById('loading');
    if (loading) {
      loading.textContent = 'Deploying Mech...';
      loading.style.display = 'flex';
    }

    try {
      // Create and start the game
      this.game = new Game(this.container, this.currentMission.id, mechId);
      await this.game.init();

      if (loading) {
        loading.style.display = 'none';
      }

      this.startTime = Date.now();
      this.game.start();
    } catch (error) {
      console.error('Failed to launch mission:', error);
      if (loading) {
        loading.textContent = 'Failed to load mission';
        loading.style.color = '#ff4444';
      }
    }
  }

  /**
   * Show debriefing after mission completion
   */
  private showDebriefing(result: GameResult): void {
    if (!this.currentMission) return;

    // Clean up game
    if (this.game) {
      this.game.stop();
      this.game = null;
    }

    this.debriefingScreen = new DebriefingScreen(
      this.container,
      this.currentMission,
      result,
      () => this.handleNextMission(),
      () => this.showCampaignScreen()
    );
  }

  /**
   * Handle continuing to next mission after victory
   */
  private handleNextMission(): void {
    this.cleanupDebriefingScreen();

    if (!this.currentMission) {
      this.showCampaignScreen();
      return;
    }

    // Get next mission
    const missionNumbers = getMissionNumbers();
    const currentIndex = missionNumbers.indexOf(
      this.currentMission.missionNumber
    );
    const nextMissionNum = missionNumbers[currentIndex + 1];

    if (nextMissionNum) {
      const nextMission = getMissionByNumber(nextMissionNum);
      if (nextMission && this.modeManager.isMissionUnlocked(nextMissionNum)) {
        // Go directly to next mission briefing
        this.showBriefing(nextMission);
        return;
      }
    }

    // No next mission or not unlocked, return to campaign screen
    this.showCampaignScreen();
  }

  /**
   * Return to main menu
   */
  private returnToMainMenu(): void {
    this.cleanupScreens();
    EventBus.emit('game:return-to-menu');
  }

  // ========== Event Handlers ==========

  private handleMissionVictory = (
    missionNumber: number,
    timePlayed: number
  ): void => {
    if (
      !this.currentMission ||
      this.currentMission.missionNumber !== missionNumber
    )
      return;

    const result = this.createResult();
    result.victory = true;
    result.timePlayed = timePlayed;

    // Handle unlocks
    if (this.currentMission.unlocksMech) {
      this.modeManager.unlockMech(this.currentMission.unlocksMech);
    }
    if (this.currentMission.unlocksMap) {
      this.modeManager.unlockMap(this.currentMission.unlocksMap);
    }

    // Record completion
    this.modeManager.completeMission(missionNumber, timePlayed);

    // Show debriefing
    this.showDebriefing(result);
  };

  private handleMissionDefeat = (reason: string): void => {
    if (!this.currentMission) return;

    const result = this.createResult();
    result.victory = false;
    result.customData = { defeatReason: reason };

    // Show debriefing
    this.showDebriefing(result);
  };

  private handleEntityDestroyed = (): void => {
    this.enemiesDestroyed++;
  };

  private handleDamageDealt = (amount: number): void => {
    this.damageDealt += amount;
  };

  private handleDamageTaken = (amount: number): void => {
    this.damageTaken += amount;
  };

  private setupEventListeners(): void {
    EventBus.on('mission:victory', this.handleMissionVictory);
    EventBus.on('mission:defeat', this.handleMissionDefeat);
    EventBus.on('entity:destroyed', this.handleEntityDestroyed);
    EventBus.on('damage:dealt', this.handleDamageDealt);
    EventBus.on('damage:taken', this.handleDamageTaken);
  }

  private removeEventListeners(): void {
    EventBus.off('mission:victory', this.handleMissionVictory);
    EventBus.off('mission:defeat', this.handleMissionDefeat);
    EventBus.off('entity:destroyed', this.handleEntityDestroyed);
    EventBus.off('damage:dealt', this.handleDamageDealt);
    EventBus.off('damage:taken', this.handleDamageTaken);
  }

  // ========== Cleanup Methods ==========

  private cleanupScreens(): void {
    this.cleanupCampaignScreen();
    this.cleanupBriefingScreen();
    this.cleanupDebriefingScreen();
  }

  private cleanupCampaignScreen(): void {
    if (this.campaignScreen) {
      this.campaignScreen.dispose();
      this.campaignScreen = null;
    }
  }

  private cleanupBriefingScreen(): void {
    if (this.briefingScreen) {
      this.briefingScreen.dispose();
      this.briefingScreen = null;
    }
  }

  private cleanupDebriefingScreen(): void {
    if (this.debriefingScreen) {
      this.debriefingScreen.dispose();
      this.debriefingScreen = null;
    }
  }

  // ========== Helper Methods ==========

  private createResult(): GameResult {
    const timePlayed =
      this.startTime > 0 ? (Date.now() - this.startTime) / 1000 : 0;

    return {
      victory: false,
      timePlayed,
      enemiesDestroyed: this.enemiesDestroyed,
      damageDealt: this.damageDealt,
      damageTaken: this.damageTaken,
      objectivesCompleted: [],
    };
  }
}

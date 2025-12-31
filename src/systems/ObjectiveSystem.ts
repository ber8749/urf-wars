import { System } from '../core/System';
import { EventBus } from '../core/EventBus';
import type { ComponentClass } from '../core/Component';
import type { Entity } from '../core/Entity';
import type {
  MissionConfig,
  ObjectiveConfig,
  ObjectiveState,
  MissionState,
} from '../config/missions/MissionConfig';
import { TurretComponent } from '../components/TurretComponent';

/**
 * System for tracking mission objectives and determining victory/defeat.
 * Listens for game events and updates objective state accordingly.
 */
export class ObjectiveSystem extends System {
  readonly requiredComponents: ComponentClass[] = [];

  private missionConfig: MissionConfig | null = null;
  private missionState: MissionState | null = null;
  private isActive: boolean = false;
  private missionStartTime: number = 0;

  // Track entities for objectives
  private targetEntityIds: Set<string> = new Set();
  private turretEntityIds: Set<string> = new Set();
  private destroyedEntityIds: Set<string> = new Set();

  constructor() {
    super();
    this.setupEventListeners();
  }

  /**
   * Start tracking objectives for a mission
   */
  startMission(config: MissionConfig): void {
    this.missionConfig = config;
    this.missionStartTime = Date.now();
    this.isActive = true;
    this.destroyedEntityIds.clear();

    // Initialize mission state
    this.missionState = {
      config,
      objectives: new Map(),
      startTime: this.missionStartTime,
      elapsedTime: 0,
      isComplete: false,
      isVictory: false,
    };

    // Initialize objective states
    for (const objective of config.objectives) {
      const state = this.createObjectiveState(objective);
      this.missionState.objectives.set(objective.id, state);
    }

    EventBus.emit('objectives:initialized', this.getObjectiveStates());
  }

  /**
   * Stop tracking objectives
   */
  stopMission(): void {
    this.isActive = false;
    this.missionConfig = null;
    this.missionState = null;
    this.targetEntityIds.clear();
    this.turretEntityIds.clear();
    this.destroyedEntityIds.clear();
  }

  /**
   * Get current objective states for HUD display
   */
  getObjectiveStates(): ObjectiveState[] {
    if (!this.missionState) return [];
    return Array.from(this.missionState.objectives.values());
  }

  /**
   * Get mission state
   */
  getMissionState(): MissionState | null {
    return this.missionState;
  }

  /**
   * Check if mission is complete
   */
  isMissionComplete(): boolean {
    return this.missionState?.isComplete ?? false;
  }

  /**
   * Check if mission was a victory
   */
  isMissionVictory(): boolean {
    return this.missionState?.isVictory ?? false;
  }

  init(): void {
    // Scan for trackable entities
    this.scanEntities();
  }

  update(dt: number): void {
    if (!this.isActive || !this.missionState || !this.missionConfig) return;

    // Update elapsed time
    this.missionState.elapsedTime = (Date.now() - this.missionStartTime) / 1000;

    // Update survive objectives
    this.updateSurviveObjectives(dt);

    // Check time limit defeat
    if (this.missionConfig.timeLimit) {
      if (this.missionState.elapsedTime >= this.missionConfig.timeLimit) {
        this.handleTimeExpired();
        return;
      }
    }

    // Check for victory
    this.checkVictoryCondition();
  }

  onEntityAdded(entity: Entity): void {
    // Track new entities for objectives
    if (entity.id.startsWith('target-')) {
      this.targetEntityIds.add(entity.id);
    }
    if (entity.hasComponent(TurretComponent)) {
      this.turretEntityIds.add(entity.id);
    }
  }

  onEntityRemoved(entity: Entity): void {
    // Remove from tracking
    this.targetEntityIds.delete(entity.id);
    this.turretEntityIds.delete(entity.id);
  }

  private setupEventListeners(): void {
    // Listen for entity destruction
    EventBus.on('entity:destroyed', (entityId: string) => {
      this.handleEntityDestroyed(entityId);
    });

    // Listen for player death
    EventBus.on('player:destroyed', () => {
      this.handlePlayerDestroyed();
    });
  }

  private scanEntities(): void {
    this.targetEntityIds.clear();
    this.turretEntityIds.clear();

    for (const entity of this.world.getAllEntities()) {
      if (entity.id.startsWith('target-')) {
        this.targetEntityIds.add(entity.id);
      }
      if (entity.hasComponent(TurretComponent)) {
        this.turretEntityIds.add(entity.id);
      }
    }
  }

  private createObjectiveState(config: ObjectiveConfig): ObjectiveState {
    let targetProgress = 1;

    switch (config.type) {
      case 'destroy_all':
        // Count all enemies
        targetProgress = this.targetEntityIds.size + this.turretEntityIds.size;
        break;
      case 'destroy':
        targetProgress = config.targetCount ?? config.targetIds?.length ?? 1;
        break;
      case 'survive':
        targetProgress = config.duration ?? 60;
        break;
      default:
        targetProgress = 1;
    }

    return {
      config,
      status: 'pending',
      progress: 0,
      targetProgress,
      timeRemaining: config.duration,
    };
  }

  private handleEntityDestroyed(entityId: string): void {
    if (!this.isActive || !this.missionState) return;

    this.destroyedEntityIds.add(entityId);

    // Update relevant objectives
    for (const [objId, state] of this.missionState.objectives) {
      if (state.status === 'completed' || state.status === 'failed') continue;

      switch (state.config.type) {
        case 'destroy_all':
          state.progress = this.destroyedEntityIds.size;
          this.checkObjectiveCompletion(state);
          break;

        case 'destroy':
          if (state.config.targetIds?.includes(entityId)) {
            state.progress++;
            this.checkObjectiveCompletion(state);
          }
          break;
      }

      EventBus.emit('objective:updated', objId, state);
    }
  }

  private handlePlayerDestroyed(): void {
    if (!this.isActive || !this.missionState) return;

    this.missionState.isComplete = true;
    this.missionState.isVictory = false;

    EventBus.emit('mission:defeat', 'player_destroyed');
  }

  private handleTimeExpired(): void {
    if (!this.isActive || !this.missionState || !this.missionConfig) return;

    // Check if survive was the victory condition
    if (this.missionConfig.victoryCondition === 'survive_time') {
      this.handleVictory();
    } else {
      this.missionState.isComplete = true;
      this.missionState.isVictory = false;
      EventBus.emit('mission:defeat', 'time_limit');
    }
  }

  private updateSurviveObjectives(_dt: number): void {
    if (!this.missionState) return;

    for (const state of this.missionState.objectives.values()) {
      if (state.config.type === 'survive' && state.status !== 'completed') {
        state.status = 'in_progress';
        state.progress = this.missionState.elapsedTime;

        if (
          state.config.duration &&
          this.missionState.elapsedTime >= state.config.duration
        ) {
          state.status = 'completed';
          state.progress = state.config.duration;
          EventBus.emit('objective:complete', state.config.id);
        }

        if (state.timeRemaining !== undefined) {
          state.timeRemaining = Math.max(
            0,
            (state.config.duration ?? 0) - this.missionState.elapsedTime
          );
        }
      }
    }
  }

  private checkObjectiveCompletion(state: ObjectiveState): void {
    if (state.progress >= state.targetProgress) {
      state.status = 'completed';
      EventBus.emit('objective:complete', state.config.id);
    } else if (state.status === 'pending') {
      state.status = 'in_progress';
    }
  }

  private checkVictoryCondition(): void {
    if (!this.missionState || !this.missionConfig) return;

    let victory = false;

    switch (this.missionConfig.victoryCondition) {
      case 'destroy_all': {
        // Check if all targets and turrets are destroyed
        const totalEnemies =
          this.targetEntityIds.size + this.turretEntityIds.size;
        victory =
          this.destroyedEntityIds.size >= totalEnemies && totalEnemies > 0;
        break;
      }

      case 'destroy_targets':
        // Check if specific targets are destroyed (primary objectives)
        victory = this.areRequiredObjectivesComplete();
        break;

      case 'survive_time':
        // Handled in handleTimeExpired
        break;

      default:
        victory = this.areRequiredObjectivesComplete();
    }

    if (victory) {
      this.handleVictory();
    }
  }

  private areRequiredObjectivesComplete(): boolean {
    if (!this.missionState) return false;

    for (const state of this.missionState.objectives.values()) {
      if (state.config.required && state.status !== 'completed') {
        return false;
      }
    }
    return true;
  }

  private handleVictory(): void {
    if (!this.missionState || !this.missionConfig) return;

    this.missionState.isComplete = true;
    this.missionState.isVictory = true;

    const timePlayed = this.missionState.elapsedTime;
    EventBus.emit(
      'mission:victory',
      this.missionConfig.missionNumber,
      timePlayed
    );
  }

  dispose(): void {
    this.stopMission();
  }
}

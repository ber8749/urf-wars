import type { Component } from '../core/Component';
import { HEAT_CONFIG } from '../config/HeatConfig';

/**
 * Heat component for entities with heat management.
 */
export class HeatComponent implements Component {
  static readonly type = 'Heat';
  readonly type = HeatComponent.type;

  /** Current heat level */
  current: number = 0;

  /** Maximum heat capacity */
  max: number;

  /** Heat dissipation rate per second */
  dissipationRate: number;

  /** Whether the entity is in overheat state */
  isOverheated: boolean = false;

  /** Heat level at which warning triggers (uses centralized HEAT_CONFIG) */
  warningThreshold: number;

  /** Heat level at which shutdown triggers (uses centralized HEAT_CONFIG) */
  shutdownThreshold: number;

  /** Track if warning was already triggered this frame */
  warningTriggered: boolean = false;

  constructor(max: number, dissipationRate: number) {
    this.max = max;
    this.dissipationRate = dissipationRate;
    // Use centralized heat thresholds
    this.warningThreshold = max * HEAT_CONFIG.WARNING_THRESHOLD;
    this.shutdownThreshold = max * HEAT_CONFIG.SHUTDOWN_THRESHOLD;
  }

  /**
   * Add heat to the system
   */
  addHeat(amount: number): void {
    this.current = Math.min(this.max, this.current + amount);

    // Check overheat
    if (this.current >= this.shutdownThreshold && !this.isOverheated) {
      this.isOverheated = true;
    }
  }

  /**
   * Remove heat from the system
   */
  removeHeat(amount: number): void {
    this.current = Math.max(0, this.current - amount);
  }

  /**
   * Get heat as a percentage (0-100)
   */
  getHeatPercentage(): number {
    return (this.current / this.max) * 100;
  }

  /**
   * Check if heat is at warning level
   */
  isWarning(): boolean {
    return this.current >= this.warningThreshold;
  }

  /**
   * Check if a heat-generating action can be performed
   */
  canAddHeat(amount: number): boolean {
    return !this.isOverheated && this.current + amount < this.max;
  }
}

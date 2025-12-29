import type { Component } from '../core/Component';

/**
 * Targeting component for tracking and locking enemies.
 */
export class TargetingComponent implements Component {
  static readonly type = 'Targeting';
  readonly type = TargetingComponent.type;

  /** Detection range in meters */
  detectionRange: number;

  /** Array of detected enemy entity IDs (in range) */
  detectedTargets: string[] = [];

  /** Currently locked target entity ID (null if none) */
  lockedTargetId: string | null = null;

  /** Index of locked target in detectedTargets array */
  lockedTargetIndex: number = -1;

  /** Screen positions of detected targets (updated by system) */
  targetScreenPositions: Map<
    string,
    { x: number; y: number; distance: number; healthPercent: number }
  > = new Map();

  /** Whether the locked target is visible on screen */
  lockedTargetVisible: boolean = false;

  constructor(detectionRange: number = 150) {
    this.detectionRange = detectionRange;
  }

  /**
   * Lock onto a specific target by entity ID
   */
  lockTarget(entityId: string): boolean {
    const index = this.detectedTargets.indexOf(entityId);
    if (index >= 0) {
      this.lockedTargetId = entityId;
      this.lockedTargetIndex = index;
      return true;
    }
    return false;
  }

  /**
   * Cycle to the next target
   */
  cycleNextTarget(): void {
    if (this.detectedTargets.length === 0) {
      this.lockedTargetId = null;
      this.lockedTargetIndex = -1;
      return;
    }

    this.lockedTargetIndex =
      (this.lockedTargetIndex + 1) % this.detectedTargets.length;
    this.lockedTargetId = this.detectedTargets[this.lockedTargetIndex];
  }

  /**
   * Cycle to the previous target
   */
  cyclePreviousTarget(): void {
    if (this.detectedTargets.length === 0) {
      this.lockedTargetId = null;
      this.lockedTargetIndex = -1;
      return;
    }

    this.lockedTargetIndex =
      (this.lockedTargetIndex - 1 + this.detectedTargets.length) %
      this.detectedTargets.length;
    this.lockedTargetId = this.detectedTargets[this.lockedTargetIndex];
  }

  /**
   * Clear target lock
   */
  clearLock(): void {
    this.lockedTargetId = null;
    this.lockedTargetIndex = -1;
  }

  /**
   * Check if a target is currently locked
   */
  hasLockedTarget(): boolean {
    return this.lockedTargetId !== null;
  }

  /**
   * Update detected targets list
   */
  updateDetectedTargets(targets: string[]): void {
    this.detectedTargets = targets;

    // Auto-lock first target if none locked
    if (this.lockedTargetId === null && targets.length > 0) {
      this.lockedTargetId = targets[0];
      this.lockedTargetIndex = 0;
    }

    // Verify locked target is still in range
    if (this.lockedTargetId !== null) {
      const newIndex = targets.indexOf(this.lockedTargetId);
      if (newIndex === -1) {
        // Locked target out of range, clear lock or switch
        if (targets.length > 0) {
          this.lockedTargetIndex = Math.min(
            this.lockedTargetIndex,
            targets.length - 1
          );
          this.lockedTargetId = targets[this.lockedTargetIndex];
        } else {
          this.clearLock();
        }
      } else {
        this.lockedTargetIndex = newIndex;
      }
    }
  }
}

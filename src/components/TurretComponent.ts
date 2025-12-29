import type { Component } from '../core/Component';

/**
 * Turret component for stationary enemy turrets.
 */
export class TurretComponent implements Component {
  static readonly type = 'Turret';
  readonly type = TurretComponent.type;

  /** Detection range - how far the turret can see the player */
  detectionRange: number;

  /** Rotation speed in radians per second */
  rotationSpeed: number;

  /** Current turret yaw rotation (world space) */
  currentYaw: number = 0;

  /** Target yaw to rotate toward */
  targetYaw: number = 0;

  /** Whether the turret currently has a target in range */
  hasTarget: boolean = false;

  /** Aim tolerance - fire when within this angle (radians) of target */
  aimTolerance: number;

  /** Time since last target check (for optimization) */
  lastTargetCheckTime: number = 0;

  constructor(
    detectionRange: number = 100,
    rotationSpeed: number = 1.5,
    aimTolerance: number = 0.1
  ) {
    this.detectionRange = detectionRange;
    this.rotationSpeed = rotationSpeed;
    this.aimTolerance = aimTolerance;
  }

  /**
   * Check if turret is aimed at target within tolerance
   */
  isAimedAtTarget(): boolean {
    if (!this.hasTarget) return false;
    const angleDiff = Math.abs(
      this.normalizeAngle(this.targetYaw - this.currentYaw)
    );
    return angleDiff <= this.aimTolerance;
  }

  /**
   * Normalize angle to -PI to PI range
   */
  private normalizeAngle(angle: number): number {
    while (angle > Math.PI) angle -= Math.PI * 2;
    while (angle < -Math.PI) angle += Math.PI * 2;
    return angle;
  }
}

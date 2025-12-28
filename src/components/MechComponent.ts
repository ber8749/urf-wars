import type { Component } from '../core/Component';
import type { MechConfig } from '../types';

/**
 * Mech-specific component for mech entities.
 * Stores mech configuration and animation state.
 */
export class MechComponent implements Component {
  static readonly type = 'Mech';
  readonly type = MechComponent.type;

  /** Mech configuration */
  config: MechConfig;

  /** Current torso yaw rotation relative to legs (radians) */
  torsoYaw: number = 0;

  /** Current head pitch (radians) */
  headPitch: number = 0;

  /** Walk animation time accumulator */
  walkTime: number = 0;

  /** Track walk cycle for footstep sounds */
  lastWalkCycleSign: number = 1;

  constructor(config: MechConfig) {
    this.config = config;
  }

  /**
   * Rotate the torso by a delta amount
   */
  rotateTorso(yawDelta: number, pitchDelta: number): void {
    // Clamp torso yaw to ±90 degrees
    this.torsoYaw += yawDelta * this.config.torsoTurnRate;
    this.torsoYaw = Math.max(
      -Math.PI / 2,
      Math.min(Math.PI / 2, this.torsoYaw)
    );

    // Clamp head pitch
    this.headPitch += pitchDelta;
    this.headPitch = Math.max(-0.4, Math.min(0.3, this.headPitch));
  }

  /**
   * Get the combined world rotation for the torso
   * @param baseRotationY The Y rotation of the physics body/legs
   */
  getTorsoWorldYaw(baseRotationY: number): number {
    return baseRotationY + this.torsoYaw + Math.PI;
  }
}

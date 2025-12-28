import type { Component } from '../core/Component';
import type { MechConfig } from '../types';
import { MECH_CONSTANTS } from '../config/MechConfigs';

/**
 * Mech-specific component for mech entities.
 * Stores mech configuration and animation state.
 */
export class MechComponent implements Component {
  static readonly type = 'Mech';
  readonly type = MechComponent.type;

  /** Mech configuration */
  config: MechConfig;

  /** Current torso yaw in world coordinates (radians) - independent of leg rotation */
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
   * Rotate the torso by a delta amount (in world space)
   */
  rotateTorso(yawDelta: number, pitchDelta: number): void {
    // Allow full 360-degree torso rotation, normalize to -π to π
    this.torsoYaw += yawDelta * this.config.torsoTurnRate;
    while (this.torsoYaw > Math.PI) this.torsoYaw -= Math.PI * 2;
    while (this.torsoYaw < -Math.PI) this.torsoYaw += Math.PI * 2;

    // Clamp head pitch using centralized constants
    this.headPitch += pitchDelta;
    this.headPitch = Math.max(
      MECH_CONSTANTS.HEAD_PITCH.min,
      Math.min(MECH_CONSTANTS.HEAD_PITCH.max, this.headPitch)
    );
  }
}

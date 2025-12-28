import type { Component } from '../core/Component';
import type { InputSnapshot } from '../types';

/**
 * Input component for player-controlled entities.
 * Stores the last input snapshot for processing by systems.
 */
export class InputComponent implements Component {
  static readonly type = 'Input';
  readonly type = InputComponent.type;

  /** Whether this is the local player (vs remote in multiplayer) */
  isLocalPlayer: boolean;

  /** Last captured input snapshot */
  lastInput: InputSnapshot | null = null;

  /** Previous frame's fire state (for semi-auto weapons) */
  wasFiring: boolean = false;

  constructor(isLocalPlayer: boolean = true) {
    this.isLocalPlayer = isLocalPlayer;
  }

  /**
   * Create an empty input snapshot
   */
  static createEmptySnapshot(): InputSnapshot {
    return {
      timestamp: performance.now(),
      forward: false,
      backward: false,
      turnLeft: false,
      turnRight: false,
      torsoLeft: false,
      torsoRight: false,
      lookUp: false,
      lookDown: false,
      fire: false,
      altFire: false,
      mouseX: 0,
      mouseY: 0,
      mouseDeltaX: 0,
      mouseDeltaY: 0,
      weaponSlot: 1,
    };
  }
}

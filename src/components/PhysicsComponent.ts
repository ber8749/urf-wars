import * as THREE from 'three';
import type { Component } from '../core/Component';

/**
 * Physics component for entities with physics bodies.
 * Stores only runtime physics state - configuration lives in MechComponent.config.
 */
export class PhysicsComponent implements Component {
  static readonly type = 'Physics';
  readonly type = PhysicsComponent.type;

  /** ID of the physics body in PhysicsWorld */
  bodyId: string;

  /** Whether the entity is touching the ground */
  isGrounded: boolean = false;

  /** Current velocity (synced from physics body each frame) */
  velocity: THREE.Vector3 = new THREE.Vector3();

  constructor(bodyId: string) {
    this.bodyId = bodyId;
  }

  /**
   * Get horizontal speed (ignoring Y component)
   */
  getHorizontalSpeed(): number {
    return Math.sqrt(
      this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z
    );
  }
}

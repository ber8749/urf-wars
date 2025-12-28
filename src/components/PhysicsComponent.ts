import * as THREE from 'three';
import type { Component } from '../core/Component';

/**
 * Physics component for entities with physics bodies.
 * Stores a reference to the physics body ID and physics state.
 */
export class PhysicsComponent implements Component {
  static readonly type = 'Physics';
  readonly type = PhysicsComponent.type;

  /** ID of the physics body in PhysicsWorld */
  bodyId: string;

  /** Mass of the body */
  mass: number;

  /** Whether the entity is touching the ground */
  isGrounded: boolean = false;

  /** Current velocity */
  velocity: THREE.Vector3 = new THREE.Vector3();

  /** Maximum speed (for clamping) */
  maxSpeed: number;

  /** Turn rate in radians per second */
  turnRate: number;

  constructor(
    bodyId: string,
    mass: number,
    maxSpeed: number = 25,
    turnRate: number = 1.5
  ) {
    this.bodyId = bodyId;
    this.mass = mass;
    this.maxSpeed = maxSpeed;
    this.turnRate = turnRate;
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

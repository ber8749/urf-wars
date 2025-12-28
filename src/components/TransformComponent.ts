import * as THREE from 'three';
import type { Component } from '../core/Component';

/**
 * Transform component for position, rotation, and scale.
 * Used by entities that exist in 3D space.
 */
export class TransformComponent implements Component {
  static readonly type = 'Transform';
  readonly type = TransformComponent.type;

  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;

  // Previous frame values for interpolation
  previousPosition: THREE.Vector3;
  previousRotation: THREE.Euler;

  constructor(
    position?: THREE.Vector3,
    rotation?: THREE.Euler,
    scale?: THREE.Vector3
  ) {
    this.position = position?.clone() ?? new THREE.Vector3();
    this.rotation = rotation?.clone() ?? new THREE.Euler();
    this.scale = scale?.clone() ?? new THREE.Vector3(1, 1, 1);

    this.previousPosition = this.position.clone();
    this.previousRotation = this.rotation.clone();
  }

  /**
   * Store current values as previous (call before physics update)
   */
  storePrevious(): void {
    this.previousPosition.copy(this.position);
    this.previousRotation.copy(this.rotation);
  }

  /**
   * Set position
   */
  setPosition(x: number, y: number, z: number): this {
    this.position.set(x, y, z);
    return this;
  }

  /**
   * Set position from vector
   */
  setPositionV(position: THREE.Vector3): this {
    this.position.copy(position);
    return this;
  }

  /**
   * Get interpolated position for smooth rendering
   */
  getInterpolatedPosition(alpha: number): THREE.Vector3 {
    return new THREE.Vector3().lerpVectors(
      this.previousPosition,
      this.position,
      alpha
    );
  }
}

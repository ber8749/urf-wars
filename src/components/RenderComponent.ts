import * as THREE from 'three';
import type { Component } from '../core/Component';

/**
 * Interface for models with animation methods (like MechModel).
 */
export interface AnimatableModel {
  mesh: THREE.Object3D;
  animateWalk?(time: number, speed: number): void;
  resetPose?(): void;
  setTorsoRotation?(yaw: number): void;
  setHeadPitch?(pitch: number): void;
  dispose?(): void;
}

/**
 * Render component for entities with visual representation.
 * Stores the Three.js mesh and rendering options.
 */
export class RenderComponent implements Component {
  static readonly type = 'Render';
  readonly type = RenderComponent.type;

  /** The Three.js mesh or group */
  mesh: THREE.Object3D;

  /** Optional reference to the model instance with animation methods */
  model?: AnimatableModel;

  /** Offset from transform position to mesh position */
  meshOffset: THREE.Vector3;

  /** Additional rotation offset (e.g., for the 180° flip) */
  rotationOffset: THREE.Euler;

  /** Whether the mesh is visible */
  visible: boolean = true;

  /** Whether this entity has been added to the scene */
  addedToScene: boolean = false;

  constructor(
    mesh: THREE.Object3D,
    meshOffset?: THREE.Vector3,
    rotationOffset?: THREE.Euler,
    model?: AnimatableModel
  ) {
    this.mesh = mesh;
    this.meshOffset = meshOffset?.clone() ?? new THREE.Vector3();
    this.rotationOffset = rotationOffset?.clone() ?? new THREE.Euler();
    this.model = model;
  }

  /**
   * Set mesh visibility
   */
  setVisible(visible: boolean): this {
    this.visible = visible;
    this.mesh.visible = visible;
    return this;
  }
}

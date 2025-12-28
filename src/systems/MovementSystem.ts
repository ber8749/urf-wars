import * as THREE from 'three';
import { System } from '../core/System';
import type { ComponentClass } from '../core/Component';
import { InputComponent } from '../components/InputComponent';
import { MechComponent } from '../components/MechComponent';
import { PhysicsComponent } from '../components/PhysicsComponent';
import { TransformComponent } from '../components/TransformComponent';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import { PHYSICS_CONFIG } from '../config/PhysicsConfig';

/**
 * Movement system handles mech locomotion with tank controls.
 * - W/S: Move forward/backward in leg-facing direction
 * - A/D: Turn legs left/right
 * - Uses direct velocity control for responsive movement
 * - All config read from MechComponent.config (single source of truth)
 */
export class MovementSystem extends System {
  readonly requiredComponents: ComponentClass[] = [
    InputComponent,
    MechComponent,
    PhysicsComponent,
    TransformComponent,
  ];

  private physicsWorld: PhysicsWorld;

  constructor(physicsWorld: PhysicsWorld) {
    super();
    this.physicsWorld = physicsWorld;
  }

  update(dt: number): void {
    for (const entity of this.getEntities()) {
      const input = entity.getComponent(InputComponent)!;
      const mech = entity.getComponent(MechComponent)!;
      const physics = entity.getComponent(PhysicsComponent)!;
      const transform = entity.getComponent(TransformComponent)!;

      if (!input.lastInput) continue;

      // Store previous transform for interpolation
      transform.storePrevious();

      const body = this.physicsWorld.getBody(physics.bodyId);
      if (!body) continue;

      // Handle turning (A/D keys rotate the physics body)
      this.handleTurning(input.lastInput, mech, body, dt);

      // Handle forward/backward movement
      this.handleMovement(input.lastInput, mech, physics, body, dt);
    }
  }

  private handleTurning(
    input: { turnLeft: boolean; turnRight: boolean },
    mech: MechComponent,
    body: import('@dimforge/rapier3d').RigidBody,
    dt: number
  ): void {
    // Calculate turn direction from input
    let turnInput = 0;
    if (input.turnLeft) turnInput -= 1;
    if (input.turnRight) turnInput += 1;

    if (turnInput === 0) return;

    // Get turn rate from config (single source of truth)
    const { turnRate } = mech.config;
    const turnDelta = turnInput * turnRate * dt;

    // Get current rotation and apply turn
    const rotation = body.rotation();
    const quat = new THREE.Quaternion(
      rotation.x,
      rotation.y,
      rotation.z,
      rotation.w
    );

    // Rotate around Y axis
    const deltaQuat = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      -turnDelta
    );
    quat.multiply(deltaQuat);

    body.setRotation({ x: quat.x, y: quat.y, z: quat.z, w: quat.w }, true);
  }

  private handleMovement(
    input: { forward: boolean; backward: boolean },
    mech: MechComponent,
    physics: PhysicsComponent,
    body: import('@dimforge/rapier3d').RigidBody,
    dt: number
  ): void {
    // Calculate forward/backward input
    let forwardInput = 0;
    if (input.forward) forwardInput += 1;
    if (input.backward) forwardInput -= 1;

    // Get config from single source of truth
    const { maxSpeed } = mech.config;

    // Get current velocity
    const currentVel = body.linvel();
    const currentHorizontalVel = new THREE.Vector2(currentVel.x, currentVel.z);

    // Get facing direction from physics body rotation
    const rotation = body.rotation();
    const quat = new THREE.Quaternion(
      rotation.x,
      rotation.y,
      rotation.z,
      rotation.w
    );

    // Standard forward direction (-Z in Three.js)
    const facingDir = new THREE.Vector3(0, 0, -1)
      .applyQuaternion(quat)
      .setY(0)
      .normalize();

    // Calculate target velocity
    const targetSpeed = forwardInput * maxSpeed;
    const targetVel = new THREE.Vector2(
      facingDir.x * targetSpeed,
      facingDir.z * targetSpeed
    );

    // Choose acceleration based on grounded state and input (using centralized config)
    let acceleration: number;
    if (physics.isGrounded) {
      acceleration =
        forwardInput !== 0
          ? PHYSICS_CONFIG.GROUND_ACCELERATION
          : PHYSICS_CONFIG.GROUND_DECELERATION;
    } else {
      acceleration =
        forwardInput !== 0
          ? PHYSICS_CONFIG.AIR_ACCELERATION
          : PHYSICS_CONFIG.AIR_DECELERATION;
    }

    // Lerp toward target velocity
    const newVel = new THREE.Vector2().lerpVectors(
      currentHorizontalVel,
      targetVel,
      Math.min(1, acceleration * dt)
    );

    // Apply new velocity, preserving Y component
    body.setLinvel({ x: newVel.x, y: currentVel.y, z: newVel.y }, true);
  }
}

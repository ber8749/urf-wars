import * as THREE from 'three';
import { System } from '../core/System';
import type { ComponentClass } from '../core/Component';
import type { Entity } from '../core/Entity';
import { InputComponent } from '../components/InputComponent';
import { MechComponent } from '../components/MechComponent';
import { PhysicsComponent } from '../components/PhysicsComponent';
import { TransformComponent } from '../components/TransformComponent';
import { WeaponComponent } from '../components/WeaponComponent';
import { EventBus } from '../core/EventBus';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import type { InputSnapshot } from '../types';

/**
 * Movement system processes input and applies movement to mech entities.
 */
export class MovementSystem extends System {
  readonly requiredComponents: ComponentClass[] = [
    InputComponent,
    MechComponent,
    PhysicsComponent,
    TransformComponent,
  ];

  private physicsWorld: PhysicsWorld;

  // Control settings
  private readonly mouseSensitivity: number = 0.002;
  private readonly torsoRotateSpeed: number = 1.5;
  private readonly headPitchSpeed: number = 1.0;
  private readonly turnSpeed: number = 2.0;

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

      // Handle movement
      this.handleMovement(input.lastInput, mech, physics, dt);

      // Handle turning (A/D keys)
      this.handleTurning(input.lastInput, physics, dt);

      // Handle torso/head rotation
      this.handleTorsoRotation(input.lastInput, mech, dt);

      // Handle weapon firing
      this.handleFiring(entity, input.lastInput);

      // Handle weapon selection
      this.handleWeaponSelection(entity, input.lastInput);
    }
  }

  private handleMovement(
    input: InputSnapshot,
    mech: MechComponent,
    physics: PhysicsComponent,
    _dt: number
  ): void {
    // Calculate forward/backward movement
    let forward = 0;
    if (input.forward) forward += 1;
    if (input.backward) forward -= 1;

    if (forward === 0) return;
    if (!physics.isGrounded && Math.abs(forward) < 0.1) return;

    const body = this.physicsWorld.getBody(physics.bodyId);
    if (!body) return;

    // Get current rotation
    const rotation = body.rotation();
    const euler = new THREE.Euler().setFromQuaternion(
      new THREE.Quaternion(rotation.x, rotation.y, rotation.z, rotation.w)
    );

    // Calculate movement direction based on legs (not torso)
    const moveDir = new THREE.Vector3(0, 0, -forward);
    moveDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), euler.y);
    moveDir.normalize();

    // Apply force
    const force = moveDir.multiplyScalar(physics.mass * 30);

    // Reduce air control
    if (!physics.isGrounded) {
      force.multiplyScalar(0.3);
    }

    body.applyImpulse({ x: force.x, y: 0, z: force.z }, true);

    // Clamp velocity
    const linvel = body.linvel();
    const horizontalSpeed = Math.sqrt(
      linvel.x * linvel.x + linvel.z * linvel.z
    );

    if (horizontalSpeed > mech.config.maxSpeed) {
      const scale = mech.config.maxSpeed / horizontalSpeed;
      body.setLinvel(
        { x: linvel.x * scale, y: linvel.y, z: linvel.z * scale },
        true
      );
    }
  }

  private handleTurning(
    input: InputSnapshot,
    physics: PhysicsComponent,
    dt: number
  ): void {
    let turnDelta = 0;
    if (input.turnLeft) turnDelta -= this.turnSpeed * dt;
    if (input.turnRight) turnDelta += this.turnSpeed * dt;

    if (turnDelta === 0) return;

    const body = this.physicsWorld.getBody(physics.bodyId);
    if (!body) return;

    // Rotate the physics body (legs)
    const rotation = body.rotation();
    const quat = new THREE.Quaternion(
      rotation.x,
      rotation.y,
      rotation.z,
      rotation.w
    );
    const deltaQuat = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      -turnDelta * physics.turnRate
    );
    quat.multiply(deltaQuat);

    body.setRotation({ x: quat.x, y: quat.y, z: quat.z, w: quat.w }, true);
  }

  private handleTorsoRotation(
    input: InputSnapshot,
    mech: MechComponent,
    dt: number
  ): void {
    // Keyboard torso rotation (Left/Right arrow keys)
    let torsoYawDelta = 0;
    if (input.torsoLeft) torsoYawDelta += this.torsoRotateSpeed * dt;
    if (input.torsoRight) torsoYawDelta -= this.torsoRotateSpeed * dt;

    // Keyboard head pitch (Up/Down arrow keys)
    let headPitchDelta = 0;
    if (input.lookUp) headPitchDelta += this.headPitchSpeed * dt;
    if (input.lookDown) headPitchDelta -= this.headPitchSpeed * dt;

    // Mouse look - additional torso/head control
    if (input.mouseDeltaX !== 0 || input.mouseDeltaY !== 0) {
      torsoYawDelta += -input.mouseDeltaX * this.mouseSensitivity;
      headPitchDelta += -input.mouseDeltaY * this.mouseSensitivity;
    }

    // Apply rotation
    if (torsoYawDelta !== 0 || headPitchDelta !== 0) {
      mech.rotateTorso(torsoYawDelta, headPitchDelta);
    }
  }

  private handleFiring(entity: Entity, input: InputSnapshot): void {
    const inputComp = entity.getComponent(InputComponent);
    const weapons = entity.getComponent(WeaponComponent);
    if (!weapons || !inputComp) return;

    const selectedWeapon = weapons.getSelectedWeapon();
    const isSemiAuto = selectedWeapon?.config.semiAuto ?? false;

    // For semi-auto weapons, only fire on initial press (not hold)
    if (isSemiAuto) {
      const justPressed = input.fire && !inputComp.wasFiring;
      inputComp.wasFiring = input.fire;
      if (!justPressed) return;
    } else {
      // For automatic weapons, fire while held
      inputComp.wasFiring = input.fire;
      if (!input.fire) return;
    }

    // Emit event for WeaponSystem to handle actual firing
    EventBus.emit('weapon:fire_request', entity.id, weapons.selectedSlot);
  }

  private handleWeaponSelection(entity: Entity, input: InputSnapshot): void {
    const weapons = entity.getComponent(WeaponComponent);
    if (!weapons) return;

    if (input.weaponSlot !== weapons.selectedSlot) {
      if (weapons.selectSlot(input.weaponSlot)) {
        EventBus.emit('weapon:selected', entity.id, input.weaponSlot);
      }
    }
  }
}

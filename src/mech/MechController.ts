import * as THREE from 'three';
import { Mech } from './Mech';
import { InputManager } from '../core/InputManager';
import { WeaponSystem } from '../weapons/WeaponSystem';

export class MechController {
  private mech: Mech;
  private input: InputManager;
  private weapons: WeaponSystem;

  // Movement smoothing
  private targetVelocity = new THREE.Vector3();
  private readonly friction = 8;

  constructor(mech: Mech, input: InputManager, weapons: WeaponSystem) {
    this.mech = mech;
    this.input = input;
    this.weapons = weapons;
  }

  update(dt: number): void {
    // Don't allow control if mech is destroyed
    if (this.mech.components.isMechDestroyed()) return;

    this.handleMovement(dt);
    this.handleTorsoAim(dt);
    this.handleWeapons(dt);
    this.mech.updateRotation();
  }

  private handleMovement(dt: number): void {
    const state = this.input.getState();
    
    // Check if immobile (both legs destroyed)
    if (this.mech.components.isImmobile()) {
      this.mech.velocity.set(0, 0, 0);
      return;
    }

    // Leg turning (Q/E keys)
    if (state.turnLeft) {
      this.mech.legRotation += this.mech.turnRate * dt;
    }
    if (state.turnRight) {
      this.mech.legRotation -= this.mech.turnRate * dt;
    }

    // Calculate movement direction in leg-local space
    const moveDir = new THREE.Vector3();
    
    if (state.forward) moveDir.z -= 1;
    if (state.backward) moveDir.z += 1;
    if (state.strafeLeft) moveDir.x -= 1;
    if (state.strafeRight) moveDir.x += 1;

    if (moveDir.lengthSq() > 0) {
      moveDir.normalize();
      
      // Apply leg rotation to movement
      moveDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.mech.legRotation);
      
      // Set target velocity
      this.targetVelocity.copy(moveDir).multiplyScalar(this.mech.maxSpeed);
    } else {
      this.targetVelocity.set(0, 0, 0);
    }

    // Smoothly interpolate velocity (simulates mech weight/inertia)
    this.mech.velocity.lerp(this.targetVelocity, 1 - Math.exp(-this.friction * dt));

    // Apply velocity to position
    const movement = this.mech.velocity.clone().multiplyScalar(dt);
    this.mech.mesh.position.add(movement);

    // Keep mech on ground (simple ground clamping)
    this.mech.mesh.position.y = 0;

    // Arena bounds (500m x 500m centered at origin)
    const bounds = 250;
    this.mech.mesh.position.x = THREE.MathUtils.clamp(this.mech.mesh.position.x, -bounds, bounds);
    this.mech.mesh.position.z = THREE.MathUtils.clamp(this.mech.mesh.position.z, -bounds, bounds);
  }

  private handleTorsoAim(_dt: number): void {
    const state = this.input.getState();
    
    // Only process mouse input when pointer is locked
    if (!this.input.isLocked()) return;

    // Mouse sensitivity
    const sensitivity = 0.002;

    // Horizontal aiming (torso twist)
    const twistDelta = -state.mouseDeltaX * sensitivity;
    let newTwist = this.mech.torsoTwist + twistDelta;

    // Clamp torso twist to limits
    newTwist = THREE.MathUtils.clamp(
      newTwist,
      -this.mech.torsoTwistLimit,
      this.mech.torsoTwistLimit
    );

    // If at twist limit, rotate legs to follow
    if (Math.abs(newTwist) >= this.mech.torsoTwistLimit * 0.95) {
      const overflow = twistDelta * 0.5;
      this.mech.legRotation += overflow;
      // Reduce twist slightly to stay within limits
      newTwist = THREE.MathUtils.clamp(
        newTwist,
        -this.mech.torsoTwistLimit * 0.95,
        this.mech.torsoTwistLimit * 0.95
      );
    }

    this.mech.torsoTwist = newTwist;

    // Vertical aiming (torso pitch)
    const pitchDelta = -state.mouseDeltaY * sensitivity;
    this.mech.torsoPitch = THREE.MathUtils.clamp(
      this.mech.torsoPitch + pitchDelta,
      -this.mech.torsoPitchLimit,
      this.mech.torsoPitchLimit
    );
  }

  private handleWeapons(_dt: number): void {
    const state = this.input.getState();

    // Fire weapon group 1 (left arm - laser) on left click
    if (state.fire1 && !this.mech.components.isLeftArmDestroyed()) {
      this.weapons.fireWeaponGroup(1, this.mech);
    }

    // Fire weapon group 2 (right arm - autocannon) on right click
    if (state.fire2 && !this.mech.components.isRightArmDestroyed()) {
      this.weapons.fireWeaponGroup(2, this.mech);
    }
  }
}


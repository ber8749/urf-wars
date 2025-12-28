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
  
  // Leg auto-rotation settings
  private readonly legAutoTurnRate = 2.0; // rad/s - how fast legs turn to face movement
  private readonly minSpeedForAutoTurn = 2.0; // m/s - minimum speed to trigger auto-turn

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

    // Auto-rotate legs to face movement direction
    this.autoRotateLegsToMovement(dt);

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

  private autoRotateLegsToMovement(dt: number): void {
    const speed = this.mech.velocity.length();
    
    // Only auto-turn if moving fast enough
    if (speed < this.minSpeedForAutoTurn) return;
    
    // Calculate the angle of movement direction (in world space)
    // atan2 gives angle from +Z axis, but we want angle from -Z (forward)
    const moveAngle = Math.atan2(-this.mech.velocity.x, -this.mech.velocity.z);
    
    // Calculate the difference between current leg rotation and movement direction
    let angleDiff = moveAngle - this.mech.legRotation;
    
    // Normalize to -PI to PI
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    
    // If difference is small enough, snap to target
    const snapThreshold = 0.02;
    if (Math.abs(angleDiff) < snapThreshold) {
      return;
    }
    
    // Calculate how much to rotate this frame
    const maxRotation = this.legAutoTurnRate * dt;
    const rotation = THREE.MathUtils.clamp(angleDiff, -maxRotation, maxRotation);
    
    // Store current world torso direction (legs + twist)
    const worldTorsoDir = this.mech.legRotation + this.mech.torsoTwist;
    
    // Rotate legs toward movement direction
    this.mech.legRotation += rotation;
    
    // Normalize leg rotation
    while (this.mech.legRotation > Math.PI) this.mech.legRotation -= Math.PI * 2;
    while (this.mech.legRotation < -Math.PI) this.mech.legRotation += Math.PI * 2;
    
    // Adjust torso twist to maintain the same world aim direction
    this.mech.torsoTwist = worldTorsoDir - this.mech.legRotation;
    
    // Normalize torso twist
    while (this.mech.torsoTwist > Math.PI) this.mech.torsoTwist -= Math.PI * 2;
    while (this.mech.torsoTwist < -Math.PI) this.mech.torsoTwist += Math.PI * 2;
  }

  private handleTorsoAim(_dt: number): void {
    const state = this.input.getState();
    
    // Only process mouse input when pointer is locked
    if (!this.input.isLocked()) return;

    // Mouse sensitivity
    const sensitivity = 0.002;

    // Horizontal aiming (torso twist) - full 360 degree rotation
    const twistDelta = -state.mouseDeltaX * sensitivity;
    this.mech.torsoTwist += twistDelta;

    // Normalize angle to -PI to PI range to prevent floating point issues
    while (this.mech.torsoTwist > Math.PI) this.mech.torsoTwist -= Math.PI * 2;
    while (this.mech.torsoTwist < -Math.PI) this.mech.torsoTwist += Math.PI * 2;

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


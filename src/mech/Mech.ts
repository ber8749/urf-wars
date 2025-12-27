import * as THREE from 'three';
import { MechModel } from './MechModel';
import { WeaponSystem } from './WeaponSystem';
import { HeatSystem } from './HeatSystem';
import { PhysicsWorld, getRapier } from '../physics/PhysicsWorld';
import type { Entity, ArmorZones, MechConfig, SerializableState } from '../types';

type RigidBody = import('@dimforge/rapier3d').RigidBody;

const DEFAULT_MECH_CONFIG: MechConfig = {
  name: 'Atlas',
  maxSpeed: 25,
  turnRate: 1.5,
  torsoTurnRate: 2.0,
  mass: 100,
  jumpJetForce: 400,
  maxHeat: 100,
  heatDissipation: 5,
  baseArmor: {
    head: 100,
    torso: 100,
    leftArm: 100,
    rightArm: 100,
    leftLeg: 100,
    rightLeg: 100,
  },
  hardpoints: [
    { slot: 1, position: { x: -2.4, y: 0, z: 1 }, weaponType: 'laser' },
    { slot: 2, position: { x: 2.4, y: 0, z: 1 }, weaponType: 'laser' },
    { slot: 3, position: { x: -1.5, y: 1.5, z: 1 }, weaponType: 'ppc' },
    { slot: 4, position: { x: 1.5, y: 1.5, z: 1 }, weaponType: 'missile' },
  ],
};

export class Mech implements Entity {
  public readonly id: string;
  public readonly type = 'mech' as const;
  public mesh: THREE.Object3D;
  
  private model: MechModel;
  private config: MechConfig;
  private physicsBody: RigidBody;
  private physicsWorld: PhysicsWorld;
  
  // State
  private armor: ArmorZones;
  private torsoYaw: number = 0;
  private headPitch: number = 0;
  private isGrounded: boolean = true;
  private walkTime: number = 0;
  
  // Systems
  public weaponSystem: WeaponSystem;
  public heatSystem: HeatSystem;
  
  constructor(
    id: string,
    scene: THREE.Scene,
    physicsWorld: PhysicsWorld,
    config: MechConfig = DEFAULT_MECH_CONFIG
  ) {
    this.id = id;
    this.config = config;
    this.physicsWorld = physicsWorld;
    
    // Initialize armor from config
    this.armor = { ...config.baseArmor };
    
    // Create visual model
    this.model = new MechModel();
    this.mesh = this.model.mesh;
    this.mesh.position.set(0, 6, 0);
    
    // Create physics body
    const startPos = new THREE.Vector3(0, 8, 0);
    this.physicsBody = physicsWorld.createDynamicBody(
      `${id}-body`,
      startPos,
      config.mass
    );
    
    // Add collision shapes
    // Main body capsule
    physicsWorld.addCapsuleCollider(
      this.physicsBody,
      `${id}-torso`,
      2.5,
      1.5,
      new THREE.Vector3(0, 3, 0)
    );
    
    // Leg colliders
    physicsWorld.addCapsuleCollider(
      this.physicsBody,
      `${id}-legs`,
      2.0,
      1.0,
      new THREE.Vector3(0, -2, 0)
    );
    
    // Lock rotation on X and Z axes (mech stays upright)
    this.physicsBody.setEnabledRotations(false, true, false, true);
    
    // Initialize systems
    this.weaponSystem = new WeaponSystem(this, scene, config.hardpoints);
    this.heatSystem = new HeatSystem(config.maxHeat, config.heatDissipation);
  }
  
  update(dt: number): void {
    // Sync mesh with physics
    const position = this.physicsBody.translation();
    const rotation = this.physicsBody.rotation();
    
    this.mesh.position.set(position.x, position.y - 5, position.z);
    this.mesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
    
    // Update torso and head rotation
    this.model.setTorsoRotation(this.torsoYaw);
    this.model.setHeadPitch(this.headPitch);
    
    // Check if grounded
    this.isGrounded = this.physicsWorld.isGrounded(
      new THREE.Vector3(position.x, position.y, position.z),
      1.0
    );
    
    // Update walk animation
    const linvel = this.physicsBody.linvel();
    const horizontalSpeed = Math.sqrt(linvel.x * linvel.x + linvel.z * linvel.z);
    
    if (horizontalSpeed > 0.5 && this.isGrounded) {
      this.walkTime += dt;
      this.model.animateWalk(this.walkTime, horizontalSpeed / this.config.maxSpeed);
    } else {
      this.model.resetPose();
    }
    
    // Update systems
    this.heatSystem.update(dt);
    this.weaponSystem.update(dt);
  }
  
  // Movement methods
  move(forward: number, strafe: number): void {
    if (!this.isGrounded && Math.abs(forward) + Math.abs(strafe) < 0.1) return;
    
    // Get current rotation
    const rotation = this.physicsBody.rotation();
    const euler = new THREE.Euler().setFromQuaternion(
      new THREE.Quaternion(rotation.x, rotation.y, rotation.z, rotation.w)
    );
    
    // Calculate movement direction based on legs (not torso)
    const moveDir = new THREE.Vector3(strafe, 0, -forward);
    moveDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), euler.y);
    moveDir.normalize();
    
    // Apply force
    const force = moveDir.multiplyScalar(this.config.mass * 30);
    
    // Reduce air control
    if (!this.isGrounded) {
      force.multiplyScalar(0.3);
    }
    
    this.physicsBody.applyImpulse(
      { x: force.x, y: 0, z: force.z },
      true
    );
    
    // Clamp velocity
    const linvel = this.physicsBody.linvel();
    const horizontalSpeed = Math.sqrt(linvel.x * linvel.x + linvel.z * linvel.z);
    
    if (horizontalSpeed > this.config.maxSpeed) {
      const scale = this.config.maxSpeed / horizontalSpeed;
      this.physicsBody.setLinvel(
        { x: linvel.x * scale, y: linvel.y, z: linvel.z * scale },
        true
      );
    }
  }
  
  turn(yawDelta: number): void {
    // Rotate the physics body (legs)
    const rotation = this.physicsBody.rotation();
    const quat = new THREE.Quaternion(rotation.x, rotation.y, rotation.z, rotation.w);
    const deltaQuat = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      -yawDelta * this.config.turnRate
    );
    quat.multiply(deltaQuat);
    
    this.physicsBody.setRotation(
      { x: quat.x, y: quat.y, z: quat.z, w: quat.w },
      true
    );
  }
  
  rotateTorso(yawDelta: number, pitchDelta: number): void {
    // Torso rotation is relative to legs
    this.torsoYaw += yawDelta * this.config.torsoTurnRate;
    this.torsoYaw = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.torsoYaw));
    
    this.headPitch += pitchDelta;
    this.headPitch = Math.max(-0.4, Math.min(0.3, this.headPitch));
  }
  
  jump(): void {
    if (!this.isGrounded) return;
    
    // Add heat for jump jets
    this.heatSystem.addHeat(5);
    
    this.physicsBody.applyImpulse(
      { x: 0, y: this.config.jumpJetForce, z: 0 },
      true
    );
  }
  
  fireWeapon(slot: number): void {
    const weapon = this.weaponSystem.getWeapon(slot);
    if (!weapon) return;
    
    // Check heat
    if (this.heatSystem.getCurrentHeat() + weapon.config.heatGenerated > this.config.maxHeat) {
      return; // Would overheat
    }
    
    if (this.weaponSystem.fire(slot)) {
      this.heatSystem.addHeat(weapon.config.heatGenerated);
    }
  }
  
  // Damage handling
  takeDamage(zone: keyof ArmorZones, amount: number): void {
    this.armor[zone] = Math.max(0, this.armor[zone] - amount);
    
    // Check for critical damage
    if (this.armor[zone] <= 0) {
      this.onZoneDestroyed(zone);
    }
  }
  
  private onZoneDestroyed(zone: keyof ArmorZones): void {
    // Handle zone destruction effects
    switch (zone) {
      case 'head':
        // Critical - mech destroyed
        console.log('Mech destroyed - head destroyed');
        break;
      case 'torso':
        // Critical - mech destroyed
        console.log('Mech destroyed - torso destroyed');
        break;
      case 'leftArm':
      case 'rightArm':
        // Lose weapons on that arm
        console.log(`${zone} destroyed - weapons offline`);
        break;
      case 'leftLeg':
      case 'rightLeg':
        // Reduced mobility
        console.log(`${zone} destroyed - mobility impaired`);
        break;
    }
  }
  
  // Setters
  setPosition(position: THREE.Vector3): void {
    this.physicsBody.setTranslation(
      { x: position.x, y: position.y, z: position.z },
      true
    );
    // Reset velocity when teleporting
    this.physicsBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
  }
  
  // Getters
  getPosition(): THREE.Vector3 {
    const pos = this.physicsBody.translation();
    return new THREE.Vector3(pos.x, pos.y, pos.z);
  }
  
  getRotation(): THREE.Euler {
    const rot = this.physicsBody.rotation();
    return new THREE.Euler().setFromQuaternion(
      new THREE.Quaternion(rot.x, rot.y, rot.z, rot.w)
    );
  }
  
  getTorsoWorldRotation(): THREE.Euler {
    const baseRotation = this.getRotation();
    return new THREE.Euler(
      this.headPitch,
      baseRotation.y + this.torsoYaw,
      0
    );
  }
  
  getVelocity(): THREE.Vector3 {
    const vel = this.physicsBody.linvel();
    return new THREE.Vector3(vel.x, vel.y, vel.z);
  }
  
  getSpeed(): number {
    const vel = this.physicsBody.linvel();
    return Math.sqrt(vel.x * vel.x + vel.z * vel.z);
  }
  
  getMaxSpeed(): number {
    return this.config.maxSpeed;
  }
  
  getArmor(): ArmorZones {
    return { ...this.armor };
  }
  
  getBaseArmor(): ArmorZones {
    return { ...this.config.baseArmor };
  }
  
  getHeat(): number {
    return this.heatSystem.getCurrentHeat();
  }
  
  getMaxHeat(): number {
    return this.config.maxHeat;
  }
  
  isOnGround(): boolean {
    return this.isGrounded;
  }
  
  getCockpitPosition(): THREE.Vector3 {
    return this.model.getCockpitPosition();
  }
  
  getTorsoYaw(): number {
    return this.torsoYaw;
  }
  
  getModel(): MechModel {
    return this.model;
  }
  
  // Serialization for networking
  serialize(): SerializableState {
    const pos = this.physicsBody.translation();
    const rot = this.physicsBody.rotation();
    const vel = this.physicsBody.linvel();
    
    return {
      position: { x: pos.x, y: pos.y, z: pos.z },
      rotation: { x: rot.x, y: rot.y, z: rot.z },
      velocity: { x: vel.x, y: vel.y, z: vel.z },
      torsoYaw: this.torsoYaw,
      headPitch: this.headPitch,
      armor: this.armor,
      heat: this.heatSystem.getCurrentHeat(),
    };
  }
  
  deserialize(state: SerializableState): void {
    this.physicsBody.setTranslation(
      { x: state.position.x, y: state.position.y, z: state.position.z },
      true
    );
    
    if (state.velocity) {
      this.physicsBody.setLinvel(
        { x: state.velocity.x, y: state.velocity.y, z: state.velocity.z },
        true
      );
    }
  }
  
  dispose(): void {
    this.model.dispose();
    this.weaponSystem.dispose();
    this.physicsWorld.removeBody(`${this.id}-body`);
  }
}


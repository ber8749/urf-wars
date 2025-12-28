import * as THREE from 'three';
import { Weapon } from './Weapon';
import { Laser } from './Laser';
import { Autocannon } from './Autocannon';
import { DamageSystem } from '../combat/DamageSystem';
import { Mech } from '../mech/Mech';
import { TargetDummy } from '../world/TargetDummy';

export class WeaponSystem {
  private scene: THREE.Scene;
  private damageSystem: DamageSystem;
  private weapons: Map<number, Weapon[]> = new Map();
  private allWeapons: Weapon[] = [];
  private targets: THREE.Object3D[] = [];

  constructor(scene: THREE.Scene, damageSystem: DamageSystem) {
    this.scene = scene;
    this.damageSystem = damageSystem;
  }

  setupMechWeapons(_mech: Mech): void {
    // Group 1: Laser on left arm
    const laser = new Laser(this.scene, this.damageSystem);
    this.addWeaponToGroup(1, laser);
    
    // Group 2: Autocannon on right arm
    const autocannon = new Autocannon(this.scene, this.damageSystem);
    this.addWeaponToGroup(2, autocannon);
  }

  private addWeaponToGroup(group: number, weapon: Weapon): void {
    if (!this.weapons.has(group)) {
      this.weapons.set(group, []);
    }
    this.weapons.get(group)!.push(weapon);
    this.allWeapons.push(weapon);
    
    // Update weapon targets
    if (weapon instanceof Laser) {
      weapon.setTargets(this.targets);
    } else if (weapon instanceof Autocannon) {
      weapon.setTargets(this.targets);
    }
  }

  addTarget(target: TargetDummy): void {
    this.targets.push(target.mesh);
    
    // Update all weapons with new target list
    for (const weapon of this.allWeapons) {
      if (weapon instanceof Laser) {
        weapon.setTargets(this.targets);
      } else if (weapon instanceof Autocannon) {
        weapon.setTargets(this.targets);
      }
    }
  }

  removeTarget(target: THREE.Object3D): void {
    const index = this.targets.indexOf(target);
    if (index !== -1) {
      this.targets.splice(index, 1);
    }
  }

  addObstacle(obstacle: THREE.Mesh): void {
    // Obstacles can be hit by weapons (for visual feedback)
    this.targets.push(obstacle);
    
    // Update all weapons
    for (const weapon of this.allWeapons) {
      if (weapon instanceof Laser) {
        weapon.setTargets(this.targets);
      } else if (weapon instanceof Autocannon) {
        weapon.setTargets(this.targets);
      }
    }
  }

  fireWeaponGroup(group: number, mech: Mech, aimPoint: THREE.Vector3): void {
    const groupWeapons = this.weapons.get(group);
    if (!groupWeapons) return;

    for (const weapon of groupWeapons) {
      if (!weapon.canFire()) continue;

      // Get firing position based on weapon mount
      let position: THREE.Vector3;
      if (group === 1) {
        position = mech.getLeftWeaponPosition();
      } else {
        position = mech.getRightWeaponPosition();
      }

      // Fire toward the aim point (weapons calculate their own direction)
      weapon.fire(position, aimPoint);
    }
  }

  /**
   * Get all objects that can be hit (for aim raycasting)
   */
  getAllTargets(): THREE.Object3D[] {
    return this.targets;
  }

  update(dt: number): void {
    for (const weapon of this.allWeapons) {
      weapon.update(dt);
    }
  }

  getWeaponGroups(): Map<number, Weapon[]> {
    return this.weapons;
  }

  getWeaponCooldown(group: number): number {
    const groupWeapons = this.weapons.get(group);
    if (!groupWeapons || groupWeapons.length === 0) return 0;
    
    // Return max cooldown of weapons in group
    return Math.max(...groupWeapons.map(w => w.getCooldownPercent()));
  }
}


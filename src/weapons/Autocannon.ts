import * as THREE from 'three';
import { Weapon } from './Weapon';
import type { WeaponConfig } from './Weapon';
import { WeaponType, ComponentLocation } from '../types';
import { Projectile } from './Projectile';
import { DamageSystem } from '../combat/DamageSystem';

export class Autocannon extends Weapon {
  private damageSystem: DamageSystem;
  private targets: THREE.Object3D[] = [];
  private projectiles: Projectile[] = [];
  private readonly projectileLifetime = 3; // seconds

  constructor(scene: THREE.Scene, damageSystem: DamageSystem) {
    const config: WeaponConfig = {
      name: 'AC/10',
      type: WeaponType.Autocannon,
      damage: 15,
      cooldown: 1.5,
      range: 400,
      projectileSpeed: 150, // m/s
      mountLocation: ComponentLocation.RightArm,
    };
    super(config, scene);
    this.damageSystem = damageSystem;
  }

  setTargets(targets: THREE.Object3D[]): void {
    this.targets = targets;
  }

  update(dt: number): void {
    super.update(dt);
    
    // Update projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const isDead = this.projectiles[i].update(dt);
      if (isDead) {
        this.projectiles.splice(i, 1);
      }
    }
  }

  fire(position: THREE.Vector3, direction: THREE.Vector3): void {
    if (!this.canFire()) return;
    
    this.startCooldown();
    
    // Create muzzle flash
    this.createMuzzleFlash(position);
    
    // Create projectile
    const projectile = new Projectile(
      this.scene,
      position.clone(),
      direction.clone(),
      this.projectileSpeed,
      this.damage,
      this.projectileLifetime,
      this.damageSystem,
      this.targets
    );
    
    this.projectiles.push(projectile);
  }

  private createMuzzleFlash(position: THREE.Vector3): void {
    // Create a quick flash at the weapon barrel
    const flashGeo = new THREE.SphereGeometry(0.5, 8, 8);
    const flashMat = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 1,
    });
    const flash = new THREE.Mesh(flashGeo, flashMat);
    flash.position.copy(position);
    
    this.scene.add(flash);
    
    // Remove after short duration
    setTimeout(() => {
      this.scene.remove(flash);
      flashGeo.dispose();
      flashMat.dispose();
    }, 50);
  }
}


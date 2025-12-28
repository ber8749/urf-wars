import * as THREE from 'three';
import { WeaponType, ComponentLocation } from '../types';

export interface WeaponConfig {
  name: string;
  type: WeaponType;
  damage: number;
  cooldown: number;
  range: number;
  projectileSpeed?: number;
  mountLocation: ComponentLocation;
}

export abstract class Weapon {
  public readonly name: string;
  public readonly type: WeaponType;
  public readonly damage: number;
  public readonly cooldown: number;
  public readonly range: number;
  public readonly projectileSpeed: number;
  public readonly mountLocation: ComponentLocation;
  
  protected currentCooldown = 0;
  protected scene: THREE.Scene;

  constructor(config: WeaponConfig, scene: THREE.Scene) {
    this.name = config.name;
    this.type = config.type;
    this.damage = config.damage;
    this.cooldown = config.cooldown;
    this.range = config.range;
    this.projectileSpeed = config.projectileSpeed || 0;
    this.mountLocation = config.mountLocation;
    this.scene = scene;
  }

  update(dt: number): void {
    if (this.currentCooldown > 0) {
      this.currentCooldown -= dt;
    }
  }

  canFire(): boolean {
    return this.currentCooldown <= 0;
  }

  abstract fire(position: THREE.Vector3, direction: THREE.Vector3): void;

  protected startCooldown(): void {
    this.currentCooldown = this.cooldown;
  }

  getCooldownPercent(): number {
    return Math.max(0, this.currentCooldown / this.cooldown);
  }
}


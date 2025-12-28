import * as THREE from 'three';
import type { Component } from '../core/Component';
import type { WeaponType } from '../types';

/**
 * Projectile component for projectile entities.
 */
export class ProjectileComponent implements Component {
  static readonly type = 'Projectile';
  readonly type = ProjectileComponent.type;

  /** Type of weapon that fired this projectile */
  weaponType: WeaponType;

  /** Damage dealt on impact */
  damage: number;

  /** Maximum range before despawn */
  range: number;

  /** Distance traveled so far */
  distanceTraveled: number = 0;

  /** Velocity vector */
  velocity: THREE.Vector3;

  /** Entity ID of the owner that fired this projectile */
  ownerId: string;

  /** Time accumulator for PPC sparkle animation */
  sparkleTime: number = 0;

  constructor(
    weaponType: WeaponType,
    damage: number,
    range: number,
    velocity: THREE.Vector3,
    ownerId: string
  ) {
    this.weaponType = weaponType;
    this.damage = damage;
    this.range = range;
    this.velocity = velocity.clone();
    this.ownerId = ownerId;
  }

  /**
   * Check if projectile has exceeded its range
   */
  isExpired(): boolean {
    return this.distanceTraveled >= this.range;
  }

  /**
   * Move the projectile by velocity * dt
   * @returns Distance moved
   */
  move(dt: number): number {
    const distance = this.velocity.length() * dt;
    this.distanceTraveled += distance;
    return distance;
  }
}

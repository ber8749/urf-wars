import * as THREE from 'three';
import type { Component } from '../core/Component';
import type { HardpointConfig, WeaponConfig, WeaponType } from '../types';

/**
 * Weapon configuration with defaults
 */
export const WEAPON_CONFIGS: Record<WeaponType, WeaponConfig> = {
  laser: {
    type: 'laser',
    damage: 15,
    heatGenerated: 8,
    cooldown: 0.5,
    projectileSpeed: 0, // Instant hitscan
    range: 400,
  },
  ppc: {
    type: 'ppc',
    damage: 35,
    heatGenerated: 20,
    cooldown: 2.0,
    projectileSpeed: 300,
    range: 500,
  },
  missile: {
    type: 'missile',
    damage: 8,
    heatGenerated: 0,
    cooldown: 0,
    projectileSpeed: 100,
    range: 600,
    ammo: 16,
    semiAuto: true,
  },
  autocannon: {
    type: 'autocannon',
    damage: 20,
    heatGenerated: 0,
    cooldown: 0.1,
    projectileSpeed: 400,
    range: 350,
    ammo: 500,
  },
};

/**
 * Individual weapon state
 */
export interface Weapon {
  slot: number;
  config: WeaponConfig;
  cooldownRemaining: number;
  ammo?: number;
  position: THREE.Vector3;
}

/**
 * Weapon component for entities that can fire weapons.
 */
export class WeaponComponent implements Component {
  static readonly type = 'Weapon';
  readonly type = WeaponComponent.type;

  /** All weapons on this entity */
  weapons: Weapon[];

  /** Currently selected weapon slot */
  selectedSlot: number = 1;

  constructor(hardpoints: HardpointConfig[]) {
    this.weapons = hardpoints.map((hp) => {
      const config = WEAPON_CONFIGS[hp.weaponType];
      return {
        slot: hp.slot,
        config: { ...config },
        cooldownRemaining: 0,
        ammo: config.ammo,
        position: new THREE.Vector3(
          hp.position.x,
          hp.position.y,
          hp.position.z
        ),
      };
    });
  }

  /**
   * Get a weapon by slot number
   */
  getWeapon(slot: number): Weapon | undefined {
    return this.weapons.find((w) => w.slot === slot);
  }

  /**
   * Get the currently selected weapon
   */
  getSelectedWeapon(): Weapon | undefined {
    return this.getWeapon(this.selectedSlot);
  }

  /**
   * Select a weapon slot
   */
  selectSlot(slot: number): boolean {
    const weapon = this.getWeapon(slot);
    if (weapon) {
      this.selectedSlot = slot;
      return true;
    }
    return false;
  }

  /**
   * Check if a weapon can fire (not on cooldown, has ammo)
   */
  canFire(slot: number): boolean {
    const weapon = this.getWeapon(slot);
    if (!weapon) return false;
    if (weapon.cooldownRemaining > 0) return false;
    if (weapon.ammo !== undefined && weapon.ammo <= 0) return false;
    return true;
  }

  /**
   * Update weapon cooldowns
   */
  updateCooldowns(dt: number): void {
    for (const weapon of this.weapons) {
      if (weapon.cooldownRemaining > 0) {
        weapon.cooldownRemaining = Math.max(0, weapon.cooldownRemaining - dt);
      }
    }
  }
}

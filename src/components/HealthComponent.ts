import type { Component } from '../core/Component';
import type { ArmorZones } from '../types';

/**
 * Health component for entities with armor zones.
 */
export class HealthComponent implements Component {
  static readonly type = 'Health';
  readonly type = HealthComponent.type;

  /** Current armor values for each zone */
  armor: ArmorZones;

  /** Base (maximum) armor values for each zone */
  baseArmor: ArmorZones;

  constructor(baseArmor: ArmorZones) {
    this.baseArmor = { ...baseArmor };
    this.armor = { ...baseArmor };
  }

  /**
   * Apply damage to a specific zone
   */
  takeDamage(zone: keyof ArmorZones, amount: number): boolean {
    const previousValue = this.armor[zone];
    this.armor[zone] = Math.max(0, this.armor[zone] - amount);

    // Return true if zone was destroyed
    return previousValue > 0 && this.armor[zone] <= 0;
  }

  /**
   * Get armor percentage for a zone (0-100)
   */
  getArmorPercentage(zone: keyof ArmorZones): number {
    return (this.armor[zone] / this.baseArmor[zone]) * 100;
  }

  /**
   * Check if entity is destroyed (head or torso at 0, only if they had armor)
   */
  isDestroyed(): boolean {
    // Only consider a zone destroyed if it had base armor and is now depleted
    const headDestroyed = this.baseArmor.head > 0 && this.armor.head <= 0;
    const torsoDestroyed = this.baseArmor.torso > 0 && this.armor.torso <= 0;
    return headDestroyed || torsoDestroyed;
  }

  /**
   * Get total remaining armor percentage
   */
  getTotalArmorPercentage(): number {
    const totalCurrent = Object.values(this.armor).reduce((a, b) => a + b, 0);
    const totalBase = Object.values(this.baseArmor).reduce((a, b) => a + b, 0);
    return (totalCurrent / totalBase) * 100;
  }
}

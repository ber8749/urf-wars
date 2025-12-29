import { System } from '../core/System';
import type { ComponentClass } from '../core/Component';
import { EventBus } from '../core/EventBus';
import type { SoundManager } from '../audio/SoundManager';
import type { WeaponType } from '../types';

/**
 * Audio system handles all game audio via events.
 * It doesn't query entities directly, instead it listens to events from other systems.
 */
export class AudioSystem extends System {
  readonly requiredComponents: ComponentClass[] = []; // Event-driven, no entity queries

  private soundManager: SoundManager;

  constructor(soundManager: SoundManager) {
    super();
    this.soundManager = soundManager;
  }

  init(): void {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Weapon sounds
    EventBus.on('weapon:fired', (type: WeaponType) => {
      this.playWeaponSound(type);
    });

    EventBus.on('weapon:selected', () => {
      this.soundManager.playWeaponSwitch();
    });

    // Heat sounds
    EventBus.on('heat:warning', (_entityId: string, level: number) => {
      this.soundManager.playHeatWarning(level);
    });

    EventBus.on('heat:overheat', () => {
      this.soundManager.playOverheatAlarm();
    });

    // Mech movement sounds
    EventBus.on(
      'mech:footstep',
      (_entityId: string, intensity: number, isLeft: boolean) => {
        this.soundManager.playFootstep(intensity, isLeft);
      }
    );

    EventBus.on('mech:servo', (_entityId: string, speed: number) => {
      this.soundManager.playServoWhine(speed);
    });

    // Damage sounds
    EventBus.on('damage:impact', (_entityId: string, severity: number) => {
      this.soundManager.playDamageImpact(severity);
    });

    // Projectile hit sounds
    EventBus.on(
      'projectile:hit',
      (weaponType: WeaponType, _hitPoint: unknown, _targetId: string) => {
        this.playImpactSound(weaponType);
      }
    );

    // Entity damaged sound
    EventBus.on(
      'entity:damaged',
      (
        _targetId: string,
        damage: number,
        _zone: string,
        _hitPoint: unknown
      ) => {
        // Scale severity based on damage amount (assuming ~100 HP targets)
        const severity = Math.min(1, damage / 50);
        this.soundManager.playDamageImpact(severity);
      }
    );

    // Entity destroyed sound
    EventBus.on('entity:destroyed', (_targetId: string, _hitPoint: unknown) => {
      this.soundManager.playExplosion();
    });
  }

  private playImpactSound(weaponType: WeaponType): void {
    // Different impact sounds based on weapon type
    switch (weaponType) {
      case 'ppc':
        this.soundManager.playDamageImpact(0.9);
        break;
      case 'autocannon':
        this.soundManager.playDamageImpact(0.5);
        break;
      case 'missile':
        this.soundManager.playDamageImpact(0.7);
        break;
      case 'laser':
        this.soundManager.playDamageImpact(0.4);
        break;
    }
  }

  private playWeaponSound(type: WeaponType): void {
    switch (type) {
      case 'laser':
        this.soundManager.playLaser();
        break;
      case 'autocannon':
        this.soundManager.playAutocannon();
        break;
      case 'ppc':
        this.soundManager.playPPC();
        break;
      case 'missile':
        this.soundManager.playMissile();
        break;
    }
  }

  update(_dt: number): void {
    // No per-frame updates needed, purely event-driven
  }

  dispose(): void {
    // Clear event listeners
    EventBus.clear();
  }
}

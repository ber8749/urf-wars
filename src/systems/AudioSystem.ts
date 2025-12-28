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

import { System } from '../core/System';
import type { ComponentClass } from '../core/Component';
import { InputComponent } from '../components/InputComponent';
import { WeaponComponent } from '../components/WeaponComponent';
import { EventBus } from '../core/EventBus';

/**
 * WeaponControlSystem handles weapon input and selection.
 * - Fire input (mouse/space): Emits weapon:fire_request events
 * - Weapon slot selection (1-4 keys, scroll wheel)
 * - Semi-auto vs auto-fire logic
 */
export class WeaponControlSystem extends System {
  readonly requiredComponents: ComponentClass[] = [
    InputComponent,
    WeaponComponent,
  ];

  update(_dt: number): void {
    for (const entity of this.getEntities()) {
      const input = entity.getComponent(InputComponent)!;
      const weapons = entity.getComponent(WeaponComponent)!;

      if (!input.lastInput) continue;

      const snapshot = input.lastInput;

      // Handle weapon selection
      this.handleWeaponSelection(entity.id, snapshot, weapons, input);

      // Handle firing
      this.handleFiring(entity.id, snapshot, weapons, input);
    }
  }

  private handleWeaponSelection(
    entityId: string,
    snapshot: { weaponSlot: number },
    weapons: WeaponComponent,
    _input: InputComponent
  ): void {
    if (snapshot.weaponSlot !== weapons.selectedSlot) {
      if (weapons.selectSlot(snapshot.weaponSlot)) {
        EventBus.emit('weapon:selected', entityId, snapshot.weaponSlot);
      }
    }
  }

  private handleFiring(
    entityId: string,
    snapshot: { fire: boolean },
    weapons: WeaponComponent,
    input: InputComponent
  ): void {
    const selectedWeapon = weapons.getSelectedWeapon();
    if (!selectedWeapon) return;

    const isSemiAuto = selectedWeapon.config.semiAuto ?? false;

    if (isSemiAuto) {
      // For semi-auto weapons, only fire on initial press (not hold)
      const justPressed = snapshot.fire && !input.wasFiring;
      input.wasFiring = snapshot.fire;

      if (!justPressed) return;
    } else {
      // For automatic weapons, fire while held
      input.wasFiring = snapshot.fire;
      if (!snapshot.fire) return;
    }

    // Emit fire request for WeaponSystem to handle
    EventBus.emit('weapon:fire_request', entityId, weapons.selectedSlot);
  }
}

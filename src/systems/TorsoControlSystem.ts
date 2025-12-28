import { System } from '../core/System';
import type { ComponentClass } from '../core/Component';
import { InputComponent } from '../components/InputComponent';
import { MechComponent } from '../components/MechComponent';

/**
 * TorsoControlSystem handles independent torso and head rotation.
 * - Mouse movement: Torso yaw and head pitch
 * - Arrow keys: Torso left/right, head up/down
 * - Updates MechComponent.torsoYaw and MechComponent.headPitch
 */
export class TorsoControlSystem extends System {
  readonly requiredComponents: ComponentClass[] = [
    InputComponent,
    MechComponent,
  ];

  // Control settings
  private readonly mouseSensitivity = 0.002;
  private readonly keyboardTorsoSpeed = 1.5;
  private readonly keyboardPitchSpeed = 1.0;

  update(dt: number): void {
    for (const entity of this.getEntities()) {
      const input = entity.getComponent(InputComponent)!;
      const mech = entity.getComponent(MechComponent)!;

      if (!input.lastInput) continue;

      const snapshot = input.lastInput;

      // Calculate torso yaw delta from keyboard
      let torsoYawDelta = 0;
      if (snapshot.torsoLeft) torsoYawDelta += this.keyboardTorsoSpeed * dt;
      if (snapshot.torsoRight) torsoYawDelta -= this.keyboardTorsoSpeed * dt;

      // Calculate head pitch delta from keyboard
      let headPitchDelta = 0;
      if (snapshot.lookUp) headPitchDelta += this.keyboardPitchSpeed * dt;
      if (snapshot.lookDown) headPitchDelta -= this.keyboardPitchSpeed * dt;

      // Add mouse input
      if (snapshot.mouseDeltaX !== 0 || snapshot.mouseDeltaY !== 0) {
        torsoYawDelta += -snapshot.mouseDeltaX * this.mouseSensitivity;
        headPitchDelta += -snapshot.mouseDeltaY * this.mouseSensitivity;
      }

      // Apply rotation via MechComponent (which handles clamping)
      if (torsoYawDelta !== 0 || headPitchDelta !== 0) {
        mech.rotateTorso(torsoYawDelta, headPitchDelta);
      }
    }
  }
}

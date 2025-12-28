import { System } from '../core/System';
import type { ComponentClass } from '../core/Component';
import { InputComponent } from '../components/InputComponent';
import { MechComponent } from '../components/MechComponent';
import { CONTROLS_CONFIG } from '../config/ControlsConfig';

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

  update(dt: number): void {
    for (const entity of this.getEntities()) {
      const input = entity.getComponent(InputComponent)!;
      const mech = entity.getComponent(MechComponent)!;

      if (!input.lastInput) continue;

      const snapshot = input.lastInput;

      // Calculate torso yaw delta from keyboard (using centralized config)
      let torsoYawDelta = 0;
      if (snapshot.torsoLeft)
        torsoYawDelta += CONTROLS_CONFIG.KEYBOARD_TORSO_SPEED * dt;
      if (snapshot.torsoRight)
        torsoYawDelta -= CONTROLS_CONFIG.KEYBOARD_TORSO_SPEED * dt;

      // Calculate head pitch delta from keyboard
      let headPitchDelta = 0;
      if (snapshot.lookUp)
        headPitchDelta += CONTROLS_CONFIG.KEYBOARD_PITCH_SPEED * dt;
      if (snapshot.lookDown)
        headPitchDelta -= CONTROLS_CONFIG.KEYBOARD_PITCH_SPEED * dt;

      // Add mouse input
      if (snapshot.mouseDeltaX !== 0 || snapshot.mouseDeltaY !== 0) {
        torsoYawDelta +=
          -snapshot.mouseDeltaX * CONTROLS_CONFIG.MOUSE_SENSITIVITY;
        headPitchDelta +=
          -snapshot.mouseDeltaY * CONTROLS_CONFIG.MOUSE_SENSITIVITY;
      }

      // Apply rotation via MechComponent (which handles clamping)
      if (torsoYawDelta !== 0 || headPitchDelta !== 0) {
        mech.rotateTorso(torsoYawDelta, headPitchDelta);
      }
    }
  }
}

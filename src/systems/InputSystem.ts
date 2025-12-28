import { System } from '../core/System';
import type { ComponentClass } from '../core/Component';
import { InputComponent } from '../components/InputComponent';
import type { InputManager } from '../core/InputManager';

/**
 * Input system captures input and assigns it to player-controlled entities.
 */
export class InputSystem extends System {
  readonly requiredComponents: ComponentClass[] = [InputComponent];

  private inputManager: InputManager;

  constructor(inputManager: InputManager) {
    super();
    this.inputManager = inputManager;
  }

  update(_dt: number): void {
    // Update input manager to capture current state
    this.inputManager.update();
    const snapshot = this.inputManager.getSnapshot();

    // Assign input to all local player entities
    for (const entity of this.getEntities()) {
      const input = entity.getComponent(InputComponent)!;
      if (input.isLocalPlayer) {
        input.lastInput = snapshot;
      }
    }
  }
}

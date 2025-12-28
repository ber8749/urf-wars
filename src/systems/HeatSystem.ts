import { System } from '../core/System';
import type { ComponentClass } from '../core/Component';
import { HeatComponent } from '../components/HeatComponent';
import { EventBus } from '../core/EventBus';

/**
 * Heat system manages heat dissipation and overheat states.
 */
export class HeatSystem extends System {
  readonly requiredComponents: ComponentClass[] = [HeatComponent];

  update(dt: number): void {
    for (const entity of this.getEntities()) {
      const heat = entity.getComponent(HeatComponent)!;

      // Dissipate heat
      if (heat.current > 0) {
        heat.current = Math.max(0, heat.current - heat.dissipationRate * dt);
      }

      // Check for recovery from overheat
      if (heat.isOverheated && heat.current < heat.max * 0.5) {
        heat.isOverheated = false;
        heat.warningTriggered = false;
        EventBus.emit('heat:cooldown', entity.id);
      }

      // Check for warning threshold
      if (heat.isWarning() && !heat.isOverheated) {
        if (!heat.warningTriggered) {
          heat.warningTriggered = true;
          EventBus.emit(
            'heat:warning',
            entity.id,
            heat.getHeatPercentage() / 100
          );
        }
      } else {
        heat.warningTriggered = false;
      }

      // Check for overheat
      if (heat.current >= heat.shutdownThreshold && !heat.isOverheated) {
        heat.isOverheated = true;
        EventBus.emit('heat:overheat', entity.id);
      }
    }
  }
}

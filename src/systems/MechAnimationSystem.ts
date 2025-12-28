import { System } from '../core/System';
import type { ComponentClass } from '../core/Component';
import { MechComponent } from '../components/MechComponent';
import { PhysicsComponent } from '../components/PhysicsComponent';
import { RenderComponent } from '../components/RenderComponent';
import { EventBus } from '../core/EventBus';

/**
 * Mech animation system handles walk cycles and torso rotation.
 */
export class MechAnimationSystem extends System {
  readonly requiredComponents: ComponentClass[] = [
    MechComponent,
    PhysicsComponent,
    RenderComponent,
  ];

  update(dt: number): void {
    for (const entity of this.getEntities()) {
      const mech = entity.getComponent(MechComponent)!;
      const physics = entity.getComponent(PhysicsComponent)!;
      const render = entity.getComponent(RenderComponent)!;

      // Check if render has an animatable model
      const model = render.model;
      if (!model?.animateWalk) continue;

      // Calculate normalized speed
      const speed = physics.getHorizontalSpeed() / mech.config.maxSpeed;

      if (speed > 0.02 && physics.isGrounded) {
        // Accumulate walk time
        mech.walkTime += dt;

        // Animate walk cycle
        model.animateWalk(mech.walkTime, speed);

        // Check for footstep sounds
        this.checkFootsteps(entity.id, mech, speed);
      } else {
        // Reset to idle pose
        model.resetPose?.();
      }

      // Pass world torso yaw + PI (for mesh flip compensation) to model
      // Model uses quaternions internally to avoid gimbal lock
      const torsoWorldYaw = mech.torsoYaw + Math.PI;
      model.setTorsoRotation?.(torsoWorldYaw);
      model.setHeadPitch?.(mech.headPitch);
    }
  }

  private checkFootsteps(
    entityId: string,
    mech: MechComponent,
    speed: number
  ): void {
    // Calculate walk cycle phase
    const animationRate = 8 * Math.sqrt(Math.max(0, Math.min(1.5, speed)));
    const walkCycle = Math.sin(mech.walkTime * animationRate);
    const currentSign = walkCycle >= 0 ? 1 : -1;

    // Trigger footstep on sign change (foot hits ground)
    if (currentSign !== mech.lastWalkCycleSign) {
      const isLeftFoot = currentSign === 1;
      const intensity = Math.min(1, speed);

      EventBus.emit('mech:footstep', entityId, intensity, isLeftFoot);
      EventBus.emit('mech:servo', entityId, speed * 0.5);

      mech.lastWalkCycleSign = currentSign;
    }
  }
}

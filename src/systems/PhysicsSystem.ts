import * as THREE from 'three';
import { System } from '../core/System';
import type { ComponentClass } from '../core/Component';
import { PhysicsComponent } from '../components/PhysicsComponent';
import { TransformComponent } from '../components/TransformComponent';
import type { PhysicsWorld } from '../physics/PhysicsWorld';

/**
 * Physics system steps the physics world and syncs transforms.
 */
export class PhysicsSystem extends System {
  readonly requiredComponents: ComponentClass[] = [
    PhysicsComponent,
    TransformComponent,
  ];

  private physicsWorld: PhysicsWorld;

  constructor(physicsWorld: PhysicsWorld) {
    super();
    this.physicsWorld = physicsWorld;
  }

  update(dt: number): void {
    // Step physics world
    this.physicsWorld.step(dt);

    // Sync transforms from physics bodies
    for (const entity of this.getEntities()) {
      const physics = entity.getComponent(PhysicsComponent)!;
      const transform = entity.getComponent(TransformComponent)!;

      const body = this.physicsWorld.getBody(physics.bodyId);
      if (!body) continue;

      // Get position and rotation from physics body
      const pos = body.translation();
      const rot = body.rotation();

      transform.position.set(pos.x, pos.y, pos.z);
      transform.rotation.setFromQuaternion(
        new THREE.Quaternion(rot.x, rot.y, rot.z, rot.w)
      );

      // Update velocity
      const linvel = body.linvel();
      physics.velocity.set(linvel.x, linvel.y, linvel.z);

      // Check if grounded
      physics.isGrounded = this.physicsWorld.isGrounded(
        transform.position,
        1.0
      );
    }
  }
}

import * as THREE from 'three';
import { System } from '../core/System';
import type { ComponentClass } from '../core/Component';
import type { Entity } from '../core/Entity';
import { RenderComponent } from '../components/RenderComponent';
import { TransformComponent } from '../components/TransformComponent';

/**
 * Render system syncs mesh positions with transforms.
 */
export class RenderSystem extends System {
  readonly requiredComponents: ComponentClass[] = [
    RenderComponent,
    TransformComponent,
  ];

  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    super();
    this.scene = scene;
  }

  update(_dt: number): void {
    for (const entity of this.getEntities()) {
      const render = entity.getComponent(RenderComponent)!;
      const transform = entity.getComponent(TransformComponent)!;

      // Add mesh to scene if not already added
      if (!render.addedToScene) {
        this.scene.add(render.mesh);
        render.addedToScene = true;
      }

      // Sync mesh position with transform + offset
      render.mesh.position.copy(transform.position).add(render.meshOffset);

      // Sync mesh rotation with transform + offset
      render.mesh.rotation.set(
        transform.rotation.x + render.rotationOffset.x,
        transform.rotation.y + render.rotationOffset.y,
        transform.rotation.z + render.rotationOffset.z
      );

      // Update visibility
      render.mesh.visible = render.visible;
    }
  }

  onEntityAdded(entity: Entity): void {
    const render = entity.getComponent(RenderComponent);
    if (render && !render.addedToScene) {
      this.scene.add(render.mesh);
      render.addedToScene = true;
    }
  }

  onEntityRemoved(entity: Entity): void {
    const render = entity.getComponent(RenderComponent);
    if (render && render.addedToScene) {
      this.scene.remove(render.mesh);
      render.addedToScene = false;
    }
  }

  /**
   * Interpolate render positions for smooth rendering
   */
  interpolate(alpha: number): void {
    for (const entity of this.getEntities()) {
      const render = entity.getComponent(RenderComponent)!;
      const transform = entity.getComponent(TransformComponent)!;

      // Interpolate position
      const interpolatedPos = transform.getInterpolatedPosition(alpha);
      render.mesh.position.copy(interpolatedPos).add(render.meshOffset);
    }
  }
}

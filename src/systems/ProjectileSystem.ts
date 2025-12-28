import * as THREE from 'three';
import { System } from '../core/System';
import type { ComponentClass } from '../core/Component';
import type { Entity } from '../core/Entity';
import { ProjectileComponent } from '../components/ProjectileComponent';
import { TransformComponent } from '../components/TransformComponent';
import { RenderComponent } from '../components/RenderComponent';

/**
 * Projectile system moves projectiles and handles their lifecycle.
 */
export class ProjectileSystem extends System {
  readonly requiredComponents: ComponentClass[] = [
    ProjectileComponent,
    TransformComponent,
    RenderComponent,
  ];

  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    super();
    this.scene = scene;
  }

  update(dt: number): void {
    for (const entity of this.getEntities()) {
      const projectile = entity.getComponent(ProjectileComponent)!;
      const transform = entity.getComponent(TransformComponent)!;
      const render = entity.getComponent(RenderComponent)!;

      // Store previous position for interpolation (prevents ghosting)
      transform.storePrevious();

      // Move projectile
      const movement = projectile.velocity.clone().multiplyScalar(dt);
      transform.position.add(movement);
      projectile.distanceTraveled += movement.length();

      // Update mesh position (will be overwritten by RenderSystem.interpolate)
      render.mesh.position.copy(transform.position);

      // Check if out of range
      if (projectile.isExpired()) {
        this.removeProjectile(entity.id, render);
        continue;
      }

      // Update visual effects based on projectile type
      this.updateEffects(projectile, render, dt);
    }
  }

  private updateEffects(
    projectile: ProjectileComponent,
    render: RenderComponent,
    dt: number
  ): void {
    switch (projectile.weaponType) {
      case 'ppc':
        this.updatePPCEffects(projectile, render, dt);
        break;
      case 'missile':
        this.updateMissileEffects(render);
        break;
    }
  }

  private updatePPCEffects(
    projectile: ProjectileComponent,
    render: RenderComponent,
    dt: number
  ): void {
    projectile.sparkleTime += dt;

    // Find sparkles in the group
    const group = render.mesh as THREE.Group;
    const sparkles = group.children.find((c) => c instanceof THREE.Points);

    if (sparkles) {
      // Rotate sparkles around the core
      sparkles.rotation.x += dt * 5;
      sparkles.rotation.y += dt * 7;
      sparkles.rotation.z += dt * 3;

      // Pulsate sparkle size
      const scale = 1 + Math.sin(projectile.sparkleTime * 15) * 0.3;
      sparkles.scale.setScalar(scale);
    }
  }

  private updateMissileEffects(render: RenderComponent): void {
    // Find flame in the group
    const group = render.mesh as THREE.Group;
    const flame = group.children.find((c) => c.name === 'flame') as THREE.Mesh;

    if (flame) {
      // Random flicker intensity
      const flicker = 0.7 + Math.random() * 0.3;
      flame.scale.set(flicker, 1 + Math.random() * 0.5, flicker);

      // Slight color variation
      const material = flame.material as THREE.MeshBasicMaterial;
      material.color.setHex(Math.random() > 0.5 ? 0xff6600 : 0xffaa00);
    }
  }

  private removeProjectile(entityId: string, render: RenderComponent): void {
    // Remove mesh from scene
    if (render.addedToScene) {
      this.scene.remove(render.mesh);

      // Dispose geometry
      if (render.mesh instanceof THREE.Mesh) {
        render.mesh.geometry.dispose();
      } else if (render.mesh instanceof THREE.Group) {
        render.mesh.traverse((child) => {
          if (child instanceof THREE.Mesh || child instanceof THREE.Points) {
            child.geometry.dispose();
          }
        });
      }
    }

    // Remove entity from world
    this.world.removeEntity(entityId);
  }

  onEntityRemoved(entity: Entity): void {
    const render = entity.getComponent(RenderComponent);
    if (render && render.addedToScene) {
      this.scene.remove(render.mesh);
    }
  }
}

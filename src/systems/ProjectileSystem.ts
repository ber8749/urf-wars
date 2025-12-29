import * as THREE from 'three';
import { System } from '../core/System';
import type { ComponentClass } from '../core/Component';
import type { Entity } from '../core/Entity';
import { ProjectileComponent } from '../components/ProjectileComponent';
import { TransformComponent } from '../components/TransformComponent';
import { RenderComponent } from '../components/RenderComponent';
import { HealthComponent } from '../components/HealthComponent';
import { EventBus } from '../core/EventBus';
import type { PhysicsWorld } from '../physics/PhysicsWorld';

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
  private physicsWorld: PhysicsWorld;

  // Reusable vectors to avoid per-frame allocations
  private readonly _movement = new THREE.Vector3();
  private readonly _prevPosition = new THREE.Vector3();
  private readonly _rayDirection = new THREE.Vector3();

  constructor(scene: THREE.Scene, physicsWorld: PhysicsWorld) {
    super();
    this.scene = scene;
    this.physicsWorld = physicsWorld;
  }

  update(dt: number): void {
    for (const entity of this.getEntities()) {
      const projectile = entity.getComponent(ProjectileComponent)!;
      const transform = entity.getComponent(TransformComponent)!;
      const render = entity.getComponent(RenderComponent)!;

      // Store previous position for collision detection and interpolation
      this._prevPosition.copy(transform.position);
      transform.storePrevious();

      // Calculate movement
      this._movement.copy(projectile.velocity).multiplyScalar(dt);
      const moveDistance = this._movement.length();

      // Cast ray from previous position in movement direction to detect hits
      if (moveDistance > 0) {
        this._rayDirection.copy(this._movement).normalize();
        const hit = this.physicsWorld.castRay(
          this._prevPosition,
          this._rayDirection,
          moveDistance + 0.5 // Slight overshoot to catch edge cases
        );

        if (hit && hit.entityId && hit.entityId !== projectile.ownerId) {
          // Hit something! Apply damage and remove projectile
          this.handleHit(
            entity.id,
            projectile,
            hit.entityId,
            hit.point,
            render
          );
          continue;
        }
      }

      // No hit - move projectile
      transform.position.add(this._movement);
      projectile.distanceTraveled += moveDistance;

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

  /**
   * Handle a projectile hit on an entity
   */
  private handleHit(
    projectileId: string,
    projectile: ProjectileComponent,
    targetEntityId: string,
    hitPoint: THREE.Vector3,
    render: RenderComponent
  ): void {
    const targetEntity = this.world.getEntity(targetEntityId);
    if (!targetEntity) {
      this.removeProjectile(projectileId, render);
      return;
    }

    const health = targetEntity.getComponent(HealthComponent);
    if (health) {
      // Apply damage to torso zone (simplified - could add zone detection later)
      const wasDestroyed = health.takeDamage('torso', projectile.damage);

      // Emit damage event
      EventBus.emit(
        'entity:damaged',
        targetEntityId,
        projectile.damage,
        'torso',
        hitPoint
      );

      // Check if entity was destroyed
      if (health.isDestroyed()) {
        EventBus.emit('entity:destroyed', targetEntityId, hitPoint);
        this.world.removeEntity(targetEntityId);
      } else if (wasDestroyed) {
        // Zone was destroyed but entity survives
        EventBus.emit(
          'entity:zone_destroyed',
          targetEntityId,
          'torso',
          hitPoint
        );
      }
    }

    // Emit hit event for VFX/SFX
    EventBus.emit(
      'projectile:hit',
      projectile.weaponType,
      hitPoint,
      targetEntityId
    );

    // Remove the projectile
    this.removeProjectile(projectileId, render);
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

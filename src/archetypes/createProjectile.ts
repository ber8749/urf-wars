import * as THREE from 'three';
import { Entity } from '../core/Entity';
import { TransformComponent } from '../components/TransformComponent';
import { RenderComponent } from '../components/RenderComponent';
import { ProjectileComponent } from '../components/ProjectileComponent';
import type { Weapon } from '../components/WeaponComponent';
import {
  createAutocannonMesh,
  createPPCMesh,
  createMissileMesh,
} from '../config/ProjectileVisuals';

/**
 * Create a projectile entity.
 */
export function createProjectile(
  ownerId: string,
  weapon: Weapon,
  position: THREE.Vector3,
  direction: THREE.Vector3
): Entity {
  const id = `projectile-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const entity = new Entity(id);

  const mesh = createProjectileMeshForType(weapon.config.type);
  mesh.position.copy(position);
  mesh.lookAt(position.clone().add(direction));

  const transformComp = new TransformComponent(position);
  const renderComp = new RenderComponent(mesh);
  const projectileComp = new ProjectileComponent(
    weapon.config.type,
    weapon.config.damage,
    weapon.config.range,
    direction.normalize().multiplyScalar(weapon.config.projectileSpeed),
    ownerId
  );

  entity.addComponent(transformComp);
  entity.addComponent(renderComp);
  entity.addComponent(projectileComp);

  return entity;
}

/**
 * Create the appropriate mesh for a projectile type.
 * Uses shared mesh factories from ProjectileVisuals config.
 */
function createProjectileMeshForType(type: string): THREE.Object3D {
  switch (type) {
    case 'autocannon':
      return createAutocannonMesh();
    case 'ppc':
      return createPPCMesh();
    case 'missile':
      return createMissileMesh();
    default:
      return createAutocannonMesh();
  }
}

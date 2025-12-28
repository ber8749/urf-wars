import * as THREE from 'three';
import { Entity } from '../core/Entity';
import { TransformComponent } from '../components/TransformComponent';
import { PhysicsComponent } from '../components/PhysicsComponent';
import { RenderComponent } from '../components/RenderComponent';
import { MechComponent } from '../components/MechComponent';
import { WeaponComponent } from '../components/WeaponComponent';
import { HeatComponent } from '../components/HeatComponent';
import { HealthComponent } from '../components/HealthComponent';
import { InputComponent } from '../components/InputComponent';
import { MechModel } from '../rendering/MechModel';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import type { MechConfig } from '../types';

/**
 * Create a mech entity with all required components.
 */
export function createMech(
  id: string,
  config: MechConfig,
  physicsWorld: PhysicsWorld,
  spawnPosition: THREE.Vector3,
  isPlayer: boolean = false
): Entity {
  const entity = new Entity(id);

  // Create physics body
  const bodyId = `${id}-body`;
  const body = physicsWorld.createDynamicBody(
    bodyId,
    spawnPosition,
    config.mass
  );

  // Add collision shapes
  // Main body capsule: halfHeight=2.5, radius=1.5, offset Y=3
  physicsWorld.addCapsuleCollider(
    body,
    `${id}-torso`,
    2.5,
    1.5,
    new THREE.Vector3(0, 3, 0)
  );

  // Leg colliders: halfHeight=2.0, radius=1.0, offset Y=-2
  physicsWorld.addCapsuleCollider(
    body,
    `${id}-legs`,
    2.0,
    1.0,
    new THREE.Vector3(0, -2, 0)
  );

  // Lock rotation on X and Z axes (mech stays upright)
  body.setEnabledRotations(false, true, false, true);

  // Create visual model
  const model = new MechModel();

  // Create components
  const transformComp = new TransformComponent(spawnPosition);

  // PhysicsComponent only holds runtime state - config comes from MechComponent
  const physicsComp = new PhysicsComponent(bodyId);

  // Mesh offset: -1 matches torso collider bottom
  // Pass the model instance for animation methods
  const renderComp = new RenderComponent(
    model.mesh,
    new THREE.Vector3(0, -1, 0),
    new THREE.Euler(0, Math.PI, 0), // 180° rotation for mesh facing
    model // Pass MechModel for animation access
  );

  const mechComp = new MechComponent(config);
  const weaponComp = new WeaponComponent(config.hardpoints);
  const heatComp = new HeatComponent(config.maxHeat, config.heatDissipation);
  const healthComp = new HealthComponent(config.baseArmor);

  // Add all components to entity
  entity.addComponent(transformComp);
  entity.addComponent(physicsComp);
  entity.addComponent(renderComp);
  entity.addComponent(mechComp);
  entity.addComponent(weaponComp);
  entity.addComponent(heatComp);
  entity.addComponent(healthComp);

  // Add input component for player
  if (isPlayer) {
    entity.addComponent(new InputComponent(true));
  }

  return entity;
}

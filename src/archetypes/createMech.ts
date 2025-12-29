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
import { TargetingComponent } from '../components/TargetingComponent';
import { MechModel } from '../rendering/MechModel';
import { PostProcessing } from '../rendering/PostProcessing';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import type { MechConfig } from '../types';
import { MECH_CONSTANTS } from '../config/MechConfigs';

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

  // Add collision shapes using centralized constants
  const { torso, legs } = MECH_CONSTANTS.COLLISION;

  // Main body capsule - pass entity ID for hit resolution
  physicsWorld.addCapsuleCollider(
    body,
    `${id}-torso`,
    torso.halfHeight,
    torso.radius,
    new THREE.Vector3(0, torso.offsetY, 0),
    id
  );

  // Leg colliders - pass entity ID for hit resolution
  physicsWorld.addCapsuleCollider(
    body,
    `${id}-legs`,
    legs.halfHeight,
    legs.radius,
    new THREE.Vector3(0, legs.offsetY, 0),
    id
  );

  // Lock rotation on X and Z axes (mech stays upright)
  body.setEnabledRotations(false, true, false, true);

  // Create visual model
  const model = new MechModel();

  // Mark mech for cel-shading outline
  PostProcessing.markForOutline(model.mesh);

  // Create components
  const transformComp = new TransformComponent(spawnPosition);

  // PhysicsComponent only holds runtime state - config comes from MechComponent
  const physicsComp = new PhysicsComponent(bodyId);

  // Mesh offset and rotation from centralized constants
  const { positionOffset, rotationOffset } = MECH_CONSTANTS.MESH;
  const renderComp = new RenderComponent(
    model.mesh,
    new THREE.Vector3(positionOffset.x, positionOffset.y, positionOffset.z),
    new THREE.Euler(rotationOffset.x, rotationOffset.y, rotationOffset.z),
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

  // Add input and targeting components for player
  if (isPlayer) {
    entity.addComponent(new InputComponent(true));
    entity.addComponent(new TargetingComponent(150)); // 150m detection range
  }

  return entity;
}

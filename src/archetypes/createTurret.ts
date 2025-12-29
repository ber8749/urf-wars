import * as THREE from 'three';
import { Entity } from '../core/Entity';
import { TransformComponent } from '../components/TransformComponent';
import { PhysicsComponent } from '../components/PhysicsComponent';
import { RenderComponent } from '../components/RenderComponent';
import { HealthComponent } from '../components/HealthComponent';
import { WeaponComponent, WEAPON_CONFIGS } from '../components/WeaponComponent';
import { TurretComponent } from '../components/TurretComponent';
import { TurretModel } from '../rendering/TurretModel';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import type { ArmorZones, WeaponType } from '../types';

/** Turret configuration */
export interface TurretConfig {
  /** Health points for the turret */
  health: number;
  /** Detection range in meters */
  detectionRange: number;
  /** Rotation speed in radians per second */
  rotationSpeed: number;
  /** Aim tolerance - fire when within this angle (radians) */
  aimTolerance: number;
  /** Weapon type for the turret */
  weaponType: WeaponType;
}

/** Default turret configuration */
const DEFAULT_TURRET_CONFIG: TurretConfig = {
  health: 50,
  detectionRange: 100,
  rotationSpeed: 1.5,
  aimTolerance: 0.1,
  weaponType: 'autocannon',
};

/**
 * Create a turret entity.
 * @param id Unique entity identifier
 * @param physicsWorld Physics world for collider creation
 * @param position World position for the turret
 * @param config Optional turret configuration
 */
export function createTurret(
  id: string,
  physicsWorld: PhysicsWorld,
  position: THREE.Vector3,
  config: Partial<TurretConfig> = {}
): Entity {
  const finalConfig = { ...DEFAULT_TURRET_CONFIG, ...config };
  const entity = new Entity(id);

  // Create static physics body
  const bodyId = `${id}-body`;
  const body = physicsWorld.createStaticBody(bodyId, position);

  // Add cylinder collider for the turret base (radius 1.5, height 3.0 to cover base + platform)
  physicsWorld.addCylinderCollider(
    body,
    `${id}-collider`,
    1.5, // half height
    1.5, // radius
    new THREE.Vector3(0, 1.5, 0), // offset up
    id // Pass entity ID for hit resolution
  );

  // Create visual model
  const turretModel = new TurretModel();
  turretModel.mesh.position.copy(position);

  // Create components
  const transformComp = new TransformComponent(position);
  const physicsComp = new PhysicsComponent(bodyId);
  const renderComp = new RenderComponent(turretModel.mesh);

  // Store the turret model on the render component for animation updates
  (renderComp as unknown as { turretModel: TurretModel }).turretModel =
    turretModel;

  // Create health component - turrets only use torso zone
  const turretArmor: ArmorZones = {
    head: 0,
    torso: finalConfig.health,
    leftArm: 0,
    rightArm: 0,
    leftLeg: 0,
    rightLeg: 0,
  };
  const healthComp = new HealthComponent(turretArmor);

  // Create weapon component - single weapon at barrel position
  const weaponConfig = WEAPON_CONFIGS[finalConfig.weaponType];
  const weaponComp = new WeaponComponent([
    {
      slot: 1,
      weaponType: finalConfig.weaponType,
      position: { x: 0, y: 2.1, z: 3.0 }, // Barrel muzzle position
    },
  ]);
  // Override weapon config for turrets (slower fire rate)
  weaponComp.weapons[0].config = {
    ...weaponConfig,
    cooldown: weaponConfig.cooldown * 1.5, // Turrets fire slightly slower
  };

  // Create turret AI component
  const turretComp = new TurretComponent(
    finalConfig.detectionRange,
    finalConfig.rotationSpeed,
    finalConfig.aimTolerance
  );

  // Add all components
  entity.addComponent(transformComp);
  entity.addComponent(physicsComp);
  entity.addComponent(renderComp);
  entity.addComponent(healthComp);
  entity.addComponent(weaponComp);
  entity.addComponent(turretComp);

  return entity;
}

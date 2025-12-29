import * as THREE from 'three';
import { Entity } from '../core/Entity';
import { TransformComponent } from '../components/TransformComponent';
import { PhysicsComponent } from '../components/PhysicsComponent';
import { RenderComponent } from '../components/RenderComponent';
import { HealthComponent } from '../components/HealthComponent';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import type { ArmorZones } from '../types';

/** Target configuration */
export interface TargetConfig {
  /** Health points for the target */
  health: number;
  /** Radius of the target */
  radius: number;
  /** Height of the target (thickness) */
  height: number;
  /** Wall width */
  wallWidth: number;
  /** Wall height */
  wallHeight: number;
  /** Wall thickness */
  wallThickness: number;
}

/** Default target configuration */
const DEFAULT_TARGET_CONFIG: TargetConfig = {
  health: 100,
  radius: 2,
  height: 0.3,
  wallWidth: 8,
  wallHeight: 12, // Matches mech height (~12m from feet to head)
  wallThickness: 1,
};

/**
 * Create a bullseye mesh with concentric rings mounted on a wall
 * Built as a standing target facing positive Z by default
 */
function createBullseyeMesh(
  radius: number,
  height: number,
  wallWidth: number,
  wallHeight: number,
  wallThickness: number
): THREE.Group {
  const group = new THREE.Group();

  // Create the wall behind the target
  // Target entity is positioned 6m above terrain (center of wall), so wall needs to extend down 6m to reach ground
  const targetHeightAboveGround = 6; // matches Game.ts: terrainHeight + 6
  const wallGeometry = new THREE.BoxGeometry(
    wallWidth,
    wallHeight,
    wallThickness
  );
  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0x808080, // Gray concrete
    roughness: 0.95,
    metalness: 0.0,
  });
  const wall = new THREE.Mesh(wallGeometry, wallMaterial);
  // Position wall so bottom is at ground level and it extends up from there
  // Wall center Y = -targetHeightAboveGround + wallHeight/2
  wall.position.y = -targetHeightAboveGround + wallHeight / 2;
  wall.position.z = -wallThickness / 2 - height / 2; // Behind the target
  wall.castShadow = true;
  wall.receiveShadow = true;
  group.add(wall);

  // Create concentric rings from outside to inside
  // Rings face positive Z (toward viewer) in local space
  const ringColors = [0xffffff, 0xff0000, 0xffffff, 0xff0000, 0xffffff];
  const ringRadii = [1.0, 0.8, 0.6, 0.4, 0.2];

  for (let i = 0; i < ringColors.length; i++) {
    const outerRadius = radius * ringRadii[i];
    const innerRadius =
      i < ringColors.length - 1 ? radius * ringRadii[i + 1] : 0;

    const geometry = new THREE.RingGeometry(innerRadius, outerRadius, 32);
    const material = new THREE.MeshStandardMaterial({
      color: ringColors[i],
      side: THREE.DoubleSide,
      roughness: 0.8,
      metalness: 0.1,
    });

    const ring = new THREE.Mesh(geometry, material);
    // Position rings in front of backing with enough offset to prevent z-fighting
    // Each ring is 0.01 further forward than the previous (inner rings in front)
    ring.position.z = height / 2 + 0.02 + 0.01 * i;
    ring.castShadow = true;
    ring.receiveShadow = true;
    group.add(ring);
  }

  // Add a backing cylinder (rotated to be horizontal, facing Z)
  const backingGeometry = new THREE.CylinderGeometry(
    radius,
    radius,
    height,
    32
  );
  const backingMaterial = new THREE.MeshStandardMaterial({
    color: 0x8b4513, // Brown wood color
    roughness: 0.9,
    metalness: 0.0,
  });
  const backing = new THREE.Mesh(backingGeometry, backingMaterial);
  backing.rotation.x = Math.PI / 2; // Rotate cylinder to face Z axis
  backing.castShadow = true;
  backing.receiveShadow = true;
  group.add(backing);

  return group;
}

/**
 * Create a target entity for testing damage.
 * @param faceToward Optional position for the target to face towards
 */
export function createTarget(
  id: string,
  physicsWorld: PhysicsWorld,
  position: THREE.Vector3,
  config: Partial<TargetConfig> = {},
  faceToward?: THREE.Vector3
): Entity {
  const finalConfig = { ...DEFAULT_TARGET_CONFIG, ...config };
  const entity = new Entity(id);

  // Create static physics body
  const bodyId = `${id}-body`;
  const body = physicsWorld.createStaticBody(bodyId, position);

  // Add cylinder collider for the target face
  physicsWorld.addCylinderCollider(
    body,
    `${id}-collider`,
    finalConfig.height / 2,
    finalConfig.radius,
    undefined,
    id // Pass entity ID for hit resolution
  );

  // Create visual mesh (built facing positive Z by default)
  const mesh = createBullseyeMesh(
    finalConfig.radius,
    finalConfig.height,
    finalConfig.wallWidth,
    finalConfig.wallHeight,
    finalConfig.wallThickness
  );
  mesh.position.copy(position);

  // Orient the target to face towards a point
  if (faceToward) {
    // Calculate direction to target point (at same height)
    const lookAtPoint = new THREE.Vector3(
      faceToward.x,
      position.y,
      faceToward.z
    );

    // Rotate around Y to face the target point
    const direction = new THREE.Vector3()
      .subVectors(lookAtPoint, position)
      .normalize();
    const angle = Math.atan2(direction.x, direction.z);
    mesh.rotation.y = angle;
  }
  // Default: already faces positive Z

  // Create components
  const transformComp = new TransformComponent(position);
  const physicsComp = new PhysicsComponent(bodyId);
  const renderComp = new RenderComponent(mesh);

  // Create health component - targets only use torso zone
  const targetArmor: ArmorZones = {
    head: 0,
    torso: finalConfig.health,
    leftArm: 0,
    rightArm: 0,
    leftLeg: 0,
    rightLeg: 0,
  };
  const healthComp = new HealthComponent(targetArmor);

  // Add all components
  entity.addComponent(transformComp);
  entity.addComponent(physicsComp);
  entity.addComponent(renderComp);
  entity.addComponent(healthComp);

  return entity;
}

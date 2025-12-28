import * as THREE from 'three';
import { Entity } from '../core/Entity';
import { TransformComponent } from '../components/TransformComponent';
import { RenderComponent } from '../components/RenderComponent';
import { ProjectileComponent } from '../components/ProjectileComponent';
import type { Weapon } from '../components/WeaponComponent';

/**
 * Create materials for projectiles (shared across all projectiles)
 */
const autocannonMaterial = new THREE.MeshBasicMaterial({
  color: 0xff0000,
  transparent: true,
  opacity: 0.9,
});

const ppcCoreMaterial = new THREE.MeshBasicMaterial({
  color: 0x00aaff,
  transparent: true,
  opacity: 0.9,
});

const ppcSparkleMaterial = new THREE.PointsMaterial({
  color: 0x88ffff,
  size: 0.15,
  transparent: true,
  opacity: 0.8,
  blending: THREE.AdditiveBlending,
});

const missileMaterial = new THREE.MeshBasicMaterial({
  color: 0xffffff,
});

const flameMaterial = new THREE.MeshBasicMaterial({
  color: 0xff6600,
  transparent: true,
  opacity: 0.9,
  blending: THREE.AdditiveBlending,
});

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

  const mesh = createProjectileMesh(weapon.config.type);
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
 */
function createProjectileMesh(type: string): THREE.Object3D {
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

function createAutocannonMesh(): THREE.Mesh {
  const geometry = new THREE.CylinderGeometry(0.12, 0.12, 5, 6);
  geometry.rotateX(Math.PI / 2);
  return new THREE.Mesh(geometry, autocannonMaterial);
}

function createPPCMesh(): THREE.Group {
  const group = new THREE.Group();

  // Core sphere
  const coreGeometry = new THREE.SphereGeometry(0.25, 8, 8);
  const core = new THREE.Mesh(coreGeometry, ppcCoreMaterial);
  group.add(core);

  // Outer glow
  const glowGeometry = new THREE.SphereGeometry(0.4, 8, 8);
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0x0066ff,
    transparent: true,
    opacity: 0.3,
    blending: THREE.AdditiveBlending,
  });
  const glow = new THREE.Mesh(glowGeometry, glowMaterial);
  group.add(glow);

  // Sparkles
  const sparkleCount = 20;
  const sparklePositions = new Float32Array(sparkleCount * 3);
  for (let i = 0; i < sparkleCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const radius = 0.3 + Math.random() * 0.2;
    sparklePositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    sparklePositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    sparklePositions[i * 3 + 2] = radius * Math.cos(phi);
  }
  const sparkleGeometry = new THREE.BufferGeometry();
  sparkleGeometry.setAttribute(
    'position',
    new THREE.BufferAttribute(sparklePositions, 3)
  );
  const sparkles = new THREE.Points(sparkleGeometry, ppcSparkleMaterial);
  group.add(sparkles);

  return group;
}

function createMissileMesh(): THREE.Group {
  const group = new THREE.Group();

  // Body
  const bodyGeometry = new THREE.ConeGeometry(0.25, 1.5, 8);
  bodyGeometry.rotateX(Math.PI / 2);
  bodyGeometry.translate(0, 0, 0.4);
  const body = new THREE.Mesh(bodyGeometry, missileMaterial);
  group.add(body);

  // Fins
  const finGeometry = new THREE.BoxGeometry(0.05, 0.4, 0.25);
  for (let i = 0; i < 4; i++) {
    const fin = new THREE.Mesh(finGeometry, missileMaterial);
    const angle = (i / 4) * Math.PI * 2;
    fin.position.set(Math.cos(angle) * 0.2, Math.sin(angle) * 0.2, -0.25);
    fin.rotation.z = angle;
    group.add(fin);
  }

  // Flame
  const flameGeometry = new THREE.ConeGeometry(0.2, 0.8, 6);
  flameGeometry.rotateX(-Math.PI / 2);
  flameGeometry.translate(0, 0, -0.6);
  const flame = new THREE.Mesh(flameGeometry, flameMaterial.clone());
  flame.name = 'flame';
  group.add(flame);

  return group;
}

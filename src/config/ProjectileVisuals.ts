import * as THREE from 'three';

/**
 * Projectile visual configuration - single source of truth for projectile materials and mesh creation.
 */

// ============ Shared Materials ============

/** Create autocannon projectile material */
export function createAutocannonMaterial(): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color: 0xff0000,
    transparent: true,
    opacity: 0.9,
  });
}

/** Create PPC core material */
export function createPPCCoreMaterial(): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color: 0x00aaff,
    transparent: true,
    opacity: 0.9,
  });
}

/** Create PPC sparkle material */
export function createPPCSparkleMaterial(): THREE.PointsMaterial {
  return new THREE.PointsMaterial({
    color: 0x88ffff,
    size: 0.15,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
  });
}

/** Create PPC glow material */
export function createPPCGlowMaterial(): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color: 0x0066ff,
    transparent: true,
    opacity: 0.3,
    blending: THREE.AdditiveBlending,
  });
}

/** Create missile body material */
export function createMissileMaterial(): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color: 0xffffff,
  });
}

/** Create missile flame material */
export function createFlameMaterial(): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color: 0xff6600,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
  });
}

/** Create laser beam outer material - bright red glow */
export function createLaserBeamMaterial(): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color: 0xff2200,
    transparent: true,
    opacity: 1.0,
    blending: THREE.AdditiveBlending,
  });
}

/** Create laser beam core material - intense white-hot core */
export function createLaserBeamCoreMaterial(): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 1.0,
    blending: THREE.AdditiveBlending,
  });
}

/** Create muzzle flash material - bright orange-yellow flash */
export function createMuzzleFlashMaterial(): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color: 0xffdd44,
    transparent: true,
    opacity: 1.0,
    blending: THREE.AdditiveBlending,
  });
}

// ============ Mesh Factories ============

/**
 * Create autocannon projectile mesh
 * @param material - Optional material, creates new one if not provided
 */
export function createAutocannonMesh(
  material?: THREE.MeshBasicMaterial
): THREE.Mesh {
  const geometry = new THREE.CylinderGeometry(0.12, 0.12, 5, 6);
  geometry.rotateX(-Math.PI / 2); // Point along -Z for lookAt compatibility
  return new THREE.Mesh(geometry, material ?? createAutocannonMaterial());
}

/**
 * Create PPC projectile mesh (group with core, glow, and sparkles)
 * @param coreMaterial - Optional core material
 * @param sparkleMaterial - Optional sparkle material
 */
export function createPPCMesh(
  coreMaterial?: THREE.MeshBasicMaterial,
  sparkleMaterial?: THREE.PointsMaterial
): THREE.Group {
  const group = new THREE.Group();

  // Core sphere
  const coreGeometry = new THREE.SphereGeometry(0.25, 8, 8);
  const core = new THREE.Mesh(
    coreGeometry,
    coreMaterial ?? createPPCCoreMaterial()
  );
  group.add(core);

  // Outer glow
  const glowGeometry = new THREE.SphereGeometry(0.4, 8, 8);
  const glow = new THREE.Mesh(glowGeometry, createPPCGlowMaterial());
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
  const sparkles = new THREE.Points(
    sparkleGeometry,
    sparkleMaterial ?? createPPCSparkleMaterial()
  );
  group.add(sparkles);

  return group;
}

/**
 * Create missile projectile mesh (group with body, base cap, and flame)
 * @param bodyMaterial - Optional body material
 * @param flameMaterial - Optional flame material
 */
export function createMissileMesh(
  bodyMaterial?: THREE.MeshBasicMaterial,
  flameMaterial?: THREE.MeshBasicMaterial
): THREE.Group {
  const group = new THREE.Group();

  // Body - solid filled cone pointing along -Z for lookAt compatibility
  const bodyGeometry = new THREE.ConeGeometry(0.25, 1.5, 8);
  bodyGeometry.rotateX(-Math.PI / 2); // Tip points along -Z
  bodyGeometry.translate(0, 0, -0.4);
  const body = new THREE.Mesh(
    bodyGeometry,
    bodyMaterial ?? createMissileMaterial()
  );
  group.add(body);

  // Red base cap at the back of the cone
  const baseGeometry = new THREE.CircleGeometry(0.25, 8);
  baseGeometry.rotateX(Math.PI / 2); // Face backwards (+Z)
  baseGeometry.translate(0, 0, 0.35); // Position at cone base
  const baseMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  const base = new THREE.Mesh(baseGeometry, baseMaterial);
  group.add(base);

  // Flame - at the back (positive Z now)
  const flameGeometry = new THREE.ConeGeometry(0.2, 0.8, 6);
  flameGeometry.rotateX(Math.PI / 2); // Flame points backwards (+Z)
  flameGeometry.translate(0, 0, 0.6);
  const flame = new THREE.Mesh(
    flameGeometry,
    flameMaterial ?? createFlameMaterial()
  );
  flame.name = 'flame';
  group.add(flame);

  return group;
}

// ============ Projectile Visual Constants ============

export const PROJECTILE_VISUALS = {
  /** Laser beam settings */
  LASER: {
    outerRadius: 0.2,
    innerRadius: 0.08,
    lifetime: 0.15,
  },

  /** Muzzle flash settings */
  MUZZLE_FLASH: {
    autocannon: {
      coreRadius: 0.4,
      glowRadius: 0.8,
      lifetime: 0.08,
    },
    laser: {
      coreRadius: 0.4,
      glowRadius: 0.8,
      lifetime: 0.1,
    },
    ppc: {
      coreRadius: 0.5,
      glowRadius: 1.0,
      lifetime: 0.12,
    },
  },
} as const;

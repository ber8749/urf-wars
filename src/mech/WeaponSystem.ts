import * as THREE from 'three';
import type { Mech } from './Mech';
import type { HardpointConfig, WeaponConfig, WeaponType } from '../types';
import type { SoundManager } from '../audio/SoundManager';

const WEAPON_CONFIGS: Record<WeaponType, WeaponConfig> = {
  laser: {
    type: 'laser',
    damage: 15,
    heatGenerated: 8,
    cooldown: 0.5,
    projectileSpeed: 0, // Instant hitscan
    range: 400,
  },
  ppc: {
    type: 'ppc',
    damage: 35,
    heatGenerated: 20,
    cooldown: 2.0,
    projectileSpeed: 300,
    range: 500,
  },
  missile: {
    type: 'missile',
    damage: 8,
    heatGenerated: 4,
    cooldown: 1.5,
    projectileSpeed: 100,
    range: 600,
    ammo: 120,
  },
  autocannon: {
    type: 'autocannon',
    damage: 20,
    heatGenerated: 3,
    cooldown: 0.3,
    projectileSpeed: 400,
    range: 350,
    ammo: 200,
  },
};

export interface Weapon {
  slot: number;
  config: WeaponConfig;
  cooldownRemaining: number;
  ammo?: number;
  position: THREE.Vector3;
}

interface Projectile {
  mesh: THREE.Group | THREE.Mesh;
  velocity: THREE.Vector3;
  damage: number;
  range: number;
  distanceTraveled: number;
  type: WeaponType;
  // For PPC sparkle animation
  sparkleTime?: number;
  sparkles?: THREE.Points;
  // For missile flame
  flame?: THREE.Mesh;
}

interface LaserBeamEffect {
  outerMesh: THREE.Mesh;
  innerMesh: THREE.Mesh;
  lifetime: number;
  maxLifetime: number;
}

interface MuzzleFlash {
  mesh: THREE.Mesh;
  lifetime: number;
  maxLifetime: number;
}

export class WeaponSystem {
  private mech: Mech;
  private scene: THREE.Scene;
  private weapons: Map<number, Weapon> = new Map();
  private projectiles: Projectile[] = [];
  private laserBeams: LaserBeamEffect[] = [];
  private muzzleFlashes: MuzzleFlash[] = [];
  private selectedSlot: number = 1;
  private soundManager?: SoundManager;

  // Visual effects materials
  private autocannonMaterial: THREE.MeshBasicMaterial;
  private ppcCoreMaterial: THREE.MeshBasicMaterial;
  private ppcSparkleMaterial: THREE.PointsMaterial;
  private missileMaterial: THREE.MeshBasicMaterial;
  private flameMaterial: THREE.MeshBasicMaterial;
  private laserBeamMaterial: THREE.MeshBasicMaterial;
  private laserBeamCoreMaterial: THREE.MeshBasicMaterial;
  private muzzleFlashMaterial: THREE.MeshBasicMaterial;

  constructor(
    mech: Mech,
    scene: THREE.Scene,
    hardpoints: HardpointConfig[],
    soundManager?: SoundManager
  ) {
    this.mech = mech;
    this.scene = scene;
    this.soundManager = soundManager;

    // Autocannon - red tracer (like old laser)
    this.autocannonMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0.9,
    });

    // PPC core - bright blue glowing sphere
    this.ppcCoreMaterial = new THREE.MeshBasicMaterial({
      color: 0x00aaff,
      transparent: true,
      opacity: 0.9,
    });

    // PPC sparkles - bright cyan points
    this.ppcSparkleMaterial = new THREE.PointsMaterial({
      color: 0x88ffff,
      size: 0.15,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });

    // Missile body - white
    this.missileMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
    });

    // Missile flame - bright orange/yellow
    this.flameMaterial = new THREE.MeshBasicMaterial({
      color: 0xff6600,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
    });

    // Laser beam - bright red continuous beam
    this.laserBeamMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });

    // Muzzle flash - bright yellow/orange burst
    this.muzzleFlashMaterial = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
    });

    // Laser beam inner core - white/pink hot center
    this.laserBeamCoreMaterial = new THREE.MeshBasicMaterial({
      color: 0xffcccc,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
    });

    // Initialize weapons from hardpoints
    for (const hardpoint of hardpoints) {
      const config = WEAPON_CONFIGS[hardpoint.weaponType];
      const weapon: Weapon = {
        slot: hardpoint.slot,
        config: { ...config },
        cooldownRemaining: 0,
        ammo: config.ammo,
        position: new THREE.Vector3(
          hardpoint.position.x,
          hardpoint.position.y,
          hardpoint.position.z
        ),
      };
      this.weapons.set(hardpoint.slot, weapon);
    }
  }

  update(dt: number): void {
    // Update weapon cooldowns
    for (const weapon of this.weapons.values()) {
      if (weapon.cooldownRemaining > 0) {
        weapon.cooldownRemaining -= dt;
      }
    }

    // Update projectiles
    this.updateProjectiles(dt);

    // Update laser beams (fade out)
    this.updateLaserBeams(dt);

    // Update muzzle flashes (fade out)
    this.updateMuzzleFlashes(dt);
  }

  private updateProjectiles(dt: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];

      // Move projectile
      const movement = proj.velocity.clone().multiplyScalar(dt);
      proj.mesh.position.add(movement);
      proj.distanceTraveled += movement.length();

      // Check if out of range
      if (proj.distanceTraveled >= proj.range) {
        this.removeProjectile(i);
        continue;
      }

      // PPC sparkle animation
      if (
        proj.type === 'ppc' &&
        proj.sparkles &&
        proj.sparkleTime !== undefined
      ) {
        proj.sparkleTime += dt;
        // Rotate sparkles around the core
        proj.sparkles.rotation.x += dt * 5;
        proj.sparkles.rotation.y += dt * 7;
        proj.sparkles.rotation.z += dt * 3;

        // Pulsate sparkle size
        const scale = 1 + Math.sin(proj.sparkleTime * 15) * 0.3;
        proj.sparkles.scale.setScalar(scale);
      }

      // Missile flame flicker
      if (proj.type === 'missile' && proj.flame) {
        // Random flicker intensity
        const flicker = 0.7 + Math.random() * 0.3;
        proj.flame.scale.set(flicker, 1 + Math.random() * 0.5, flicker);

        // Slight color variation
        (proj.flame.material as THREE.MeshBasicMaterial).color.setHex(
          Math.random() > 0.5 ? 0xff6600 : 0xffaa00
        );
      }
    }
  }

  private updateLaserBeams(dt: number): void {
    for (let i = this.laserBeams.length - 1; i >= 0; i--) {
      const beam = this.laserBeams[i];
      beam.lifetime -= dt;

      if (beam.lifetime <= 0) {
        this.scene.remove(beam.outerMesh);
        this.scene.remove(beam.innerMesh);
        beam.outerMesh.geometry.dispose();
        beam.innerMesh.geometry.dispose();
        this.laserBeams.splice(i, 1);
        continue;
      }

      // Fade out both beams
      const t = beam.lifetime / beam.maxLifetime;
      (beam.outerMesh.material as THREE.MeshBasicMaterial).opacity = t * 0.8;
      (beam.innerMesh.material as THREE.MeshBasicMaterial).opacity = t * 0.9;
    }
  }

  private updateMuzzleFlashes(dt: number): void {
    for (let i = this.muzzleFlashes.length - 1; i >= 0; i--) {
      const flash = this.muzzleFlashes[i];
      flash.lifetime -= dt;

      if (flash.lifetime <= 0) {
        this.scene.remove(flash.mesh);
        flash.mesh.geometry.dispose();
        (flash.mesh.material as THREE.Material).dispose();
        this.muzzleFlashes.splice(i, 1);
        continue;
      }

      // Fade out and shrink
      const t = flash.lifetime / flash.maxLifetime;
      (flash.mesh.material as THREE.MeshBasicMaterial).opacity = t;
      flash.mesh.scale.setScalar(0.5 + t * 0.5); // Shrink from 1.0 to 0.5
    }
  }

  private removeProjectile(index: number): void {
    const proj = this.projectiles[index];
    this.scene.remove(proj.mesh);

    // Dispose geometry
    if (proj.mesh instanceof THREE.Mesh) {
      proj.mesh.geometry.dispose();
    } else if (proj.mesh instanceof THREE.Group) {
      proj.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh || child instanceof THREE.Points) {
          child.geometry.dispose();
        }
      });
    }

    this.projectiles.splice(index, 1);
  }

  fire(slot: number): boolean {
    const weapon = this.weapons.get(slot);
    if (!weapon) return false;

    // Check cooldown
    if (weapon.cooldownRemaining > 0) return false;

    // Check ammo
    if (weapon.ammo !== undefined && weapon.ammo <= 0) return false;

    // Get firing position and direction from mech model
    const mechModel = this.mech.getModel();
    const firingPos = mechModel.getWeaponPosition(slot);

    // Get aim direction from torso
    // Use (0, 0, 1) because getTorsoWorldRotation includes PI rotation for mesh flip
    // When rotated by PI, (0, 0, 1) becomes (0, 0, -1) which is forward
    const torsoRotation = this.mech.getTorsoWorldRotation();
    const direction = new THREE.Vector3(0, 0, 1);
    direction.applyEuler(torsoRotation);

    // Create projectile based on weapon type
    if (weapon.config.type === 'laser') {
      this.createLaserBeam(weapon, firingPos, direction);
    } else {
      this.createProjectile(weapon, firingPos, direction);
    }

    // Play weapon sound
    if (this.soundManager) {
      switch (weapon.config.type) {
        case 'laser':
          this.soundManager.playLaser();
          break;
        case 'autocannon':
          this.soundManager.playAutocannon();
          break;
        case 'ppc':
          this.soundManager.playPPC();
          break;
        case 'missile':
          this.soundManager.playMissile();
          break;
      }
    }

    // Start cooldown
    weapon.cooldownRemaining = weapon.config.cooldown;

    // Use ammo
    if (weapon.ammo !== undefined) {
      weapon.ammo--;
    }

    return true;
  }

  private createLaserBeam(
    weapon: Weapon,
    position: THREE.Vector3,
    direction: THREE.Vector3
  ): void {
    // Create continuous beam from position to max range
    const beamLength = weapon.config.range;

    // Outer beam - red glow
    const outerGeometry = new THREE.CylinderGeometry(0.1, 0.1, beamLength, 6);
    outerGeometry.translate(0, beamLength / 2, 0);
    outerGeometry.rotateX(Math.PI / 2);

    const outerMaterial = this.laserBeamMaterial.clone();
    const outerMesh = new THREE.Mesh(outerGeometry, outerMaterial);
    outerMesh.position.copy(position);
    outerMesh.lookAt(position.clone().add(direction));

    // Inner core - white/pink hot center
    const innerGeometry = new THREE.CylinderGeometry(0.04, 0.04, beamLength, 6);
    innerGeometry.translate(0, beamLength / 2, 0);
    innerGeometry.rotateX(Math.PI / 2);

    const innerMaterial = this.laserBeamCoreMaterial.clone();
    const innerMesh = new THREE.Mesh(innerGeometry, innerMaterial);
    innerMesh.position.copy(position);
    innerMesh.lookAt(position.clone().add(direction));

    this.scene.add(outerMesh);
    this.scene.add(innerMesh);

    this.laserBeams.push({
      outerMesh,
      innerMesh,
      lifetime: 0.15,
      maxLifetime: 0.15,
    });

    // Create red/orange muzzle flash for laser
    this.createLaserMuzzleFlash(position.clone());
  }

  private createLaserMuzzleFlash(position: THREE.Vector3): void {
    // Red-orange flash for laser
    const coreGeometry = new THREE.SphereGeometry(0.25, 8, 8);
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: 0xff6644,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
    });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);

    const glowGeometry = new THREE.SphereGeometry(0.5, 8, 8);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xff2200,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.add(core);
    glow.position.copy(position);

    this.scene.add(glow);

    this.muzzleFlashes.push({
      mesh: glow,
      lifetime: 0.08,
      maxLifetime: 0.08,
    });
  }

  private createProjectile(
    weapon: Weapon,
    position: THREE.Vector3,
    direction: THREE.Vector3
  ): void {
    let mesh: THREE.Group | THREE.Mesh;

    switch (weapon.config.type) {
      case 'autocannon':
        // Autocannon - red tracer cylinder (like old laser)
        mesh = this.createAutocannonProjectile();
        // Create muzzle flash at firing position
        this.createMuzzleFlash(position.clone());
        break;

      case 'ppc':
        // PPC - blue sparkling sphere
        mesh = this.createPPCProjectile();
        // Create blue electrical muzzle flash
        this.createPPCMuzzleFlash(position.clone());
        break;

      case 'missile':
        // Missile - cone with flame
        mesh = this.createMissileProjectile();
        break;

      default:
        return;
    }

    mesh.position.copy(position);
    mesh.lookAt(position.clone().add(direction));

    this.scene.add(mesh);

    const projectile: Projectile = {
      mesh,
      velocity: direction
        .normalize()
        .multiplyScalar(weapon.config.projectileSpeed),
      damage: weapon.config.damage,
      range: weapon.config.range,
      distanceTraveled: 0,
      type: weapon.config.type,
    };

    // Add type-specific data
    if (weapon.config.type === 'ppc') {
      projectile.sparkleTime = 0;
      projectile.sparkles = (mesh as THREE.Group).children.find(
        (c) => c instanceof THREE.Points
      ) as THREE.Points;
    }

    if (weapon.config.type === 'missile') {
      projectile.flame = (mesh as THREE.Group).children.find(
        (c) => c instanceof THREE.Mesh && c.name === 'flame'
      ) as THREE.Mesh;
    }

    this.projectiles.push(projectile);
  }

  private createAutocannonProjectile(): THREE.Mesh {
    // Red tracer - elongated cylinder, bigger and more visible
    const geometry = new THREE.CylinderGeometry(0.12, 0.12, 5, 6);
    geometry.rotateX(Math.PI / 2);
    return new THREE.Mesh(geometry, this.autocannonMaterial);
  }

  private createMuzzleFlash(position: THREE.Vector3): void {
    // Create a bright flash using multiple overlapping planes for a starburst effect

    // Core bright sphere
    const coreGeometry = new THREE.SphereGeometry(0.3, 8, 8);
    const coreMaterial = this.muzzleFlashMaterial.clone();
    coreMaterial.color.setHex(0xffffcc); // Bright white-yellow core
    const core = new THREE.Mesh(coreGeometry, coreMaterial);

    // Outer glow sphere
    const glowGeometry = new THREE.SphereGeometry(0.6, 8, 8);
    const glowMaterial = this.muzzleFlashMaterial.clone();
    glowMaterial.opacity = 0.6;
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);

    // Use glow mesh as the main flash mesh (simpler cleanup)
    glow.add(core);
    glow.position.copy(position);

    this.scene.add(glow);

    this.muzzleFlashes.push({
      mesh: glow,
      lifetime: 0.06, // Very brief flash
      maxLifetime: 0.06,
    });
  }

  private createPPCMuzzleFlash(position: THREE.Vector3): void {
    // Blue electrical burst for PPC
    const coreGeometry = new THREE.SphereGeometry(0.4, 8, 8);
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: 0xaaffff,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
    });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);

    // Outer electrical glow
    const glowGeometry = new THREE.SphereGeometry(0.8, 8, 8);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x0088ff,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.add(core);
    glow.position.copy(position);

    this.scene.add(glow);

    this.muzzleFlashes.push({
      mesh: glow,
      lifetime: 0.1, // Slightly longer for PPC
      maxLifetime: 0.1,
    });
  }

  private createPPCProjectile(): THREE.Group {
    const group = new THREE.Group();

    // Core sphere - bright blue
    const coreGeometry = new THREE.SphereGeometry(0.25, 8, 8);
    const core = new THREE.Mesh(coreGeometry, this.ppcCoreMaterial);
    group.add(core);

    // Outer glow sphere
    const glowGeometry = new THREE.SphereGeometry(0.4, 8, 8);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x0066ff,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    group.add(glow);

    // Sparkle particles orbiting the core
    const sparkleCount = 20;
    const sparklePositions = new Float32Array(sparkleCount * 3);

    for (let i = 0; i < sparkleCount; i++) {
      // Random positions on a sphere surface
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

    const sparkles = new THREE.Points(sparkleGeometry, this.ppcSparkleMaterial);
    group.add(sparkles);

    return group;
  }

  private createMissileProjectile(): THREE.Group {
    const group = new THREE.Group();

    // Missile body - larger white cone pointing forward
    const bodyGeometry = new THREE.ConeGeometry(0.25, 1.5, 8);
    bodyGeometry.rotateX(Math.PI / 2);
    bodyGeometry.translate(0, 0, 0.4); // Offset so base is at origin
    const body = new THREE.Mesh(bodyGeometry, this.missileMaterial);
    group.add(body);

    // Fins on the missile - larger
    const finGeometry = new THREE.BoxGeometry(0.05, 0.4, 0.25);
    for (let i = 0; i < 4; i++) {
      const fin = new THREE.Mesh(finGeometry, this.missileMaterial);
      const angle = (i / 4) * Math.PI * 2;
      fin.position.set(Math.cos(angle) * 0.2, Math.sin(angle) * 0.2, -0.25);
      fin.rotation.z = angle;
      group.add(fin);
    }

    // Flame effect - cone pointing backward (larger)
    const flameGeometry = new THREE.ConeGeometry(0.2, 0.8, 6);
    flameGeometry.rotateX(-Math.PI / 2);
    flameGeometry.translate(0, 0, -0.6); // Position behind missile
    const flame = new THREE.Mesh(flameGeometry, this.flameMaterial.clone());
    flame.name = 'flame';
    group.add(flame);

    // Inner flame (brighter core)
    const innerFlameGeometry = new THREE.ConeGeometry(0.1, 0.5, 6);
    innerFlameGeometry.rotateX(-Math.PI / 2);
    innerFlameGeometry.translate(0, 0, -0.45);
    const innerFlameMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffaa,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
    });
    const innerFlame = new THREE.Mesh(innerFlameGeometry, innerFlameMaterial);
    group.add(innerFlame);

    return group;
  }

  selectWeapon(slot: number): void {
    if (this.weapons.has(slot) && slot !== this.selectedSlot) {
      this.selectedSlot = slot;
      this.soundManager?.playWeaponSwitch();
    }
  }

  getSelectedSlot(): number {
    return this.selectedSlot;
  }

  getWeapon(slot: number): Weapon | undefined {
    return this.weapons.get(slot);
  }

  getAllWeapons(): Weapon[] {
    return Array.from(this.weapons.values());
  }

  getProjectiles(): Projectile[] {
    return this.projectiles;
  }

  dispose(): void {
    // Clean up all projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      this.removeProjectile(i);
    }

    // Clean up laser beams
    for (const beam of this.laserBeams) {
      this.scene.remove(beam.outerMesh);
      this.scene.remove(beam.innerMesh);
      beam.outerMesh.geometry.dispose();
      beam.innerMesh.geometry.dispose();
    }
    this.laserBeams = [];

    // Clean up muzzle flashes
    for (const flash of this.muzzleFlashes) {
      this.scene.remove(flash.mesh);
      flash.mesh.geometry.dispose();
      (flash.mesh.material as THREE.Material).dispose();
    }
    this.muzzleFlashes = [];

    // Dispose materials
    this.autocannonMaterial.dispose();
    this.ppcCoreMaterial.dispose();
    this.ppcSparkleMaterial.dispose();
    this.missileMaterial.dispose();
    this.flameMaterial.dispose();
    this.laserBeamMaterial.dispose();
    this.laserBeamCoreMaterial.dispose();
    this.muzzleFlashMaterial.dispose();
  }
}

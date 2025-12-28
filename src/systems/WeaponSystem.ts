import * as THREE from 'three';
import { System } from '../core/System';
import type { ComponentClass } from '../core/Component';
import { Entity } from '../core/Entity';
import { WeaponComponent } from '../components/WeaponComponent';
import { TransformComponent } from '../components/TransformComponent';
import { MechComponent } from '../components/MechComponent';
import { HeatComponent } from '../components/HeatComponent';
import { RenderComponent } from '../components/RenderComponent';
import { ProjectileComponent } from '../components/ProjectileComponent';
import { EventBus } from '../core/EventBus';
import type { MechModel } from '../rendering/MechModel';
import type { Weapon } from '../components/WeaponComponent';

/**
 * Weapon system handles weapon cooldowns and firing.
 */
export class WeaponSystem extends System {
  readonly requiredComponents: ComponentClass[] = [
    WeaponComponent,
    TransformComponent,
  ];

  private scene: THREE.Scene;

  // Materials for projectiles
  private autocannonMaterial!: THREE.MeshBasicMaterial;
  private ppcCoreMaterial!: THREE.MeshBasicMaterial;
  private ppcSparkleMaterial!: THREE.PointsMaterial;
  private missileMaterial!: THREE.MeshBasicMaterial;
  private flameMaterial!: THREE.MeshBasicMaterial;
  private laserBeamMaterial!: THREE.MeshBasicMaterial;
  private laserBeamCoreMaterial!: THREE.MeshBasicMaterial;
  private muzzleFlashMaterial!: THREE.MeshBasicMaterial;

  // Active laser beams and muzzle flashes
  private laserBeams: Array<{
    outerMesh: THREE.Mesh;
    innerMesh: THREE.Mesh;
    lifetime: number;
    maxLifetime: number;
  }> = [];

  private muzzleFlashes: Array<{
    mesh: THREE.Mesh;
    lifetime: number;
    maxLifetime: number;
  }> = [];

  // Reusable objects to avoid per-frame allocations
  private readonly _aimDirection = new THREE.Vector3();
  private readonly _torsoRotation = new THREE.Euler(0, 0, 0, 'YXZ');

  constructor(scene: THREE.Scene) {
    super();
    this.scene = scene;
    this.createMaterials();
  }

  init(): void {
    // Listen for fire requests from MovementSystem
    EventBus.on('weapon:fire_request', (entityId: string, slot: number) => {
      const entity = this.world.getEntity(entityId);
      if (entity) {
        this.fire(entity, slot);
      }
    });
  }

  private createMaterials(): void {
    this.autocannonMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0.9,
    });

    this.ppcCoreMaterial = new THREE.MeshBasicMaterial({
      color: 0x00aaff,
      transparent: true,
      opacity: 0.9,
    });

    this.ppcSparkleMaterial = new THREE.PointsMaterial({
      color: 0x88ffff,
      size: 0.15,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });

    this.missileMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
    });

    this.flameMaterial = new THREE.MeshBasicMaterial({
      color: 0xff6600,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
    });

    this.laserBeamMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });

    this.laserBeamCoreMaterial = new THREE.MeshBasicMaterial({
      color: 0xffcccc,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
    });

    this.muzzleFlashMaterial = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
    });
  }

  update(dt: number): void {
    // Update weapon cooldowns
    for (const entity of this.getEntities()) {
      const weapons = entity.getComponent(WeaponComponent)!;
      weapons.updateCooldowns(dt);
    }

    // Update laser beams (fade out)
    this.updateLaserBeams(dt);

    // Update muzzle flashes (fade out)
    this.updateMuzzleFlashes(dt);
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
      flash.mesh.scale.setScalar(0.5 + t * 0.5);
    }
  }

  fire(entity: Entity, slot: number): boolean {
    const weapons = entity.getComponent(WeaponComponent);
    const heat = entity.getComponent(HeatComponent);
    const transform = entity.getComponent(TransformComponent);
    const mech = entity.getComponent(MechComponent);
    const render = entity.getComponent(RenderComponent);

    if (!weapons || !transform) return false;

    const weapon = weapons.getWeapon(slot);
    if (!weapon) return false;

    // Check cooldown and ammo
    if (!weapons.canFire(slot)) return false;

    // Check heat
    if (heat && !heat.canAddHeat(weapon.config.heatGenerated)) {
      return false;
    }

    // Get firing position from mech model
    let firingPos = transform.position.clone();
    if (render?.model) {
      const model = render.model as MechModel;
      if (model.getWeaponPosition) {
        firingPos = model.getWeaponPosition(slot);
      }
    }

    // Get aim direction from torso
    const direction = this.getAimDirection(transform, mech);

    // Create projectile based on weapon type
    if (weapon.config.type === 'laser') {
      this.createLaserBeam(weapon, firingPos, direction);
    } else {
      this.createProjectile(entity, weapon, firingPos, direction);
    }

    // Add heat
    if (heat) {
      heat.addHeat(weapon.config.heatGenerated);
    }

    // Start cooldown
    weapon.cooldownRemaining = weapon.config.cooldown;

    // Use ammo
    if (weapon.ammo !== undefined) {
      weapon.ammo--;
    }

    // Emit event for audio
    EventBus.emit('weapon:fired', weapon.config.type, entity.id);

    return true;
  }

  private getAimDirection(
    transform: TransformComponent,
    mech?: MechComponent
  ): THREE.Vector3 {
    this._aimDirection.set(0, 0, 1);

    if (mech) {
      // Use torso rotation with mesh flip compensation
      this._torsoRotation.set(
        -mech.headPitch,
        transform.rotation.y + mech.torsoYaw + Math.PI,
        0
      );
      this._aimDirection.applyEuler(this._torsoRotation);
    } else {
      this._aimDirection.applyEuler(transform.rotation);
    }

    return this._aimDirection;
  }

  private createLaserBeam(
    weapon: Weapon,
    position: THREE.Vector3,
    direction: THREE.Vector3
  ): void {
    const beamLength = weapon.config.range;

    // Outer beam - red glow
    const outerGeometry = new THREE.CylinderGeometry(0.1, 0.1, beamLength, 6);
    outerGeometry.translate(0, beamLength / 2, 0);
    outerGeometry.rotateX(Math.PI / 2);

    const outerMaterial = this.laserBeamMaterial.clone();
    const outerMesh = new THREE.Mesh(outerGeometry, outerMaterial);
    outerMesh.position.copy(position);
    outerMesh.lookAt(position.clone().add(direction));

    // Inner core
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

    // Create muzzle flash
    this.createLaserMuzzleFlash(position);
  }

  private createLaserMuzzleFlash(position: THREE.Vector3): void {
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
    entity: Entity,
    weapon: Weapon,
    position: THREE.Vector3,
    direction: THREE.Vector3
  ): void {
    let mesh: THREE.Object3D;

    switch (weapon.config.type) {
      case 'autocannon':
        mesh = this.createAutocannonMesh();
        this.createMuzzleFlash(position);
        break;
      case 'ppc':
        mesh = this.createPPCMesh();
        this.createPPCMuzzleFlash(position);
        break;
      case 'missile':
        mesh = this.createMissileMesh();
        break;
      default:
        return;
    }

    mesh.position.copy(position);
    mesh.lookAt(position.clone().add(direction));

    this.scene.add(mesh);

    // Create projectile entity
    const projectileEntity = new (entity.constructor as typeof Entity)(
      `projectile-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    );

    // Extract the rotation from the mesh after lookAt() so RenderSystem preserves it
    const transformComponent = new TransformComponent(
      position,
      mesh.rotation.clone()
    );
    const renderComponent = new RenderComponent(mesh);
    renderComponent.addedToScene = true;

    const projectileComponent = new ProjectileComponent(
      weapon.config.type,
      weapon.config.damage,
      weapon.config.range,
      direction.normalize().multiplyScalar(weapon.config.projectileSpeed),
      entity.id
    );

    projectileEntity.addComponent(transformComponent);
    projectileEntity.addComponent(renderComponent);
    projectileEntity.addComponent(projectileComponent);

    this.world.addEntity(projectileEntity);
  }

  private createAutocannonMesh(): THREE.Mesh {
    const geometry = new THREE.CylinderGeometry(0.12, 0.12, 5, 6);
    geometry.rotateX(-Math.PI / 2); // Point along -Z for lookAt compatibility
    return new THREE.Mesh(geometry, this.autocannonMaterial);
  }

  private createPPCMesh(): THREE.Group {
    const group = new THREE.Group();

    // Core sphere
    const coreGeometry = new THREE.SphereGeometry(0.25, 8, 8);
    const core = new THREE.Mesh(coreGeometry, this.ppcCoreMaterial);
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
    const sparkles = new THREE.Points(sparkleGeometry, this.ppcSparkleMaterial);
    group.add(sparkles);

    return group;
  }

  private createMissileMesh(): THREE.Group {
    const group = new THREE.Group();

    // Body - solid filled cone pointing along -Z for lookAt compatibility
    const bodyGeometry = new THREE.ConeGeometry(0.25, 1.5, 8);
    bodyGeometry.rotateX(-Math.PI / 2); // Tip points along -Z
    bodyGeometry.translate(0, 0, -0.4);
    const body = new THREE.Mesh(bodyGeometry, this.missileMaterial);
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
    const flame = new THREE.Mesh(flameGeometry, this.flameMaterial.clone());
    flame.name = 'flame';
    group.add(flame);

    return group;
  }

  private createMuzzleFlash(position: THREE.Vector3): void {
    const coreGeometry = new THREE.SphereGeometry(0.3, 8, 8);
    const coreMaterial = this.muzzleFlashMaterial.clone();
    coreMaterial.color.setHex(0xffffcc);
    const core = new THREE.Mesh(coreGeometry, coreMaterial);

    const glowGeometry = new THREE.SphereGeometry(0.6, 8, 8);
    const glowMaterial = this.muzzleFlashMaterial.clone();
    glowMaterial.opacity = 0.6;
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);

    glow.add(core);
    glow.position.copy(position);

    this.scene.add(glow);

    this.muzzleFlashes.push({
      mesh: glow,
      lifetime: 0.06,
      maxLifetime: 0.06,
    });
  }

  private createPPCMuzzleFlash(position: THREE.Vector3): void {
    const coreGeometry = new THREE.SphereGeometry(0.4, 8, 8);
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: 0xaaffff,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
    });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);

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
      lifetime: 0.1,
      maxLifetime: 0.1,
    });
  }

  dispose(): void {
    // Clean up materials
    this.autocannonMaterial.dispose();
    this.ppcCoreMaterial.dispose();
    this.ppcSparkleMaterial.dispose();
    this.missileMaterial.dispose();
    this.flameMaterial.dispose();
    this.laserBeamMaterial.dispose();
    this.laserBeamCoreMaterial.dispose();
    this.muzzleFlashMaterial.dispose();

    // Clean up active effects
    for (const beam of this.laserBeams) {
      this.scene.remove(beam.outerMesh);
      this.scene.remove(beam.innerMesh);
      beam.outerMesh.geometry.dispose();
      beam.innerMesh.geometry.dispose();
    }

    for (const flash of this.muzzleFlashes) {
      this.scene.remove(flash.mesh);
      flash.mesh.geometry.dispose();
    }
  }
}

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
import { HealthComponent } from '../components/HealthComponent';
import { EventBus } from '../core/EventBus';
import type { MechModel } from '../rendering/MechModel';
import type { Weapon } from '../components/WeaponComponent';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import {
  createAutocannonMaterial,
  createPPCCoreMaterial,
  createPPCSparkleMaterial,
  createMissileMaterial,
  createFlameMaterial,
  createLaserBeamMaterial,
  createLaserBeamCoreMaterial,
  createMuzzleFlashMaterial,
  createAutocannonMesh,
  createPPCMesh,
  createMissileMesh,
  PROJECTILE_VISUALS,
} from '../config/ProjectileVisuals';

/** Default aim distance when no target is hit */
const DEFAULT_AIM_DISTANCE = 500;

/**
 * Weapon system handles weapon cooldowns and firing.
 */
export class WeaponSystem extends System {
  readonly requiredComponents: ComponentClass[] = [
    WeaponComponent,
    TransformComponent,
  ];

  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private physicsWorld: PhysicsWorld;

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
  private readonly _raycaster = new THREE.Raycaster();
  private readonly _screenCenter = new THREE.Vector2(0, 0);
  private readonly _aimTarget = new THREE.Vector3();

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    physicsWorld: PhysicsWorld
  ) {
    super();
    this.scene = scene;
    this.camera = camera;
    this.physicsWorld = physicsWorld;
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
    // Use centralized material factory functions from ProjectileVisuals
    this.autocannonMaterial = createAutocannonMaterial();
    this.ppcCoreMaterial = createPPCCoreMaterial();
    this.ppcSparkleMaterial = createPPCSparkleMaterial();
    this.missileMaterial = createMissileMaterial();
    this.flameMaterial = createFlameMaterial();
    this.laserBeamMaterial = createLaserBeamMaterial();
    this.laserBeamCoreMaterial = createLaserBeamCoreMaterial();
    this.muzzleFlashMaterial = createMuzzleFlashMaterial();
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

    // Get aim target from reticle raycast, then calculate direction from weapon to target
    const aimTarget = this.getAimTarget();
    const direction = this.getAimDirectionToTarget(firingPos, aimTarget);

    // Create projectile based on weapon type
    if (weapon.config.type === 'laser') {
      this.createLaserBeam(entity.id, weapon, firingPos, direction);
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

  /**
   * Get the aim target point by raycasting from camera through screen center (reticle)
   */
  private getAimTarget(): THREE.Vector3 {
    // Cast ray from camera through screen center
    this._raycaster.setFromCamera(this._screenCenter, this.camera);

    // Use physics world raycast to find target point
    const rayOrigin = this._raycaster.ray.origin;
    const rayDirection = this._raycaster.ray.direction;

    const hit = this.physicsWorld.castRay(
      rayOrigin,
      rayDirection,
      DEFAULT_AIM_DISTANCE
    );

    if (hit) {
      this._aimTarget.copy(hit.point);
    } else {
      // No hit - aim at default distance along ray
      this._aimTarget
        .copy(rayDirection)
        .multiplyScalar(DEFAULT_AIM_DISTANCE)
        .add(rayOrigin);
    }

    return this._aimTarget;
  }

  /**
   * Calculate direction from weapon position to aim target
   */
  private getAimDirectionToTarget(
    weaponPosition: THREE.Vector3,
    aimTarget: THREE.Vector3
  ): THREE.Vector3 {
    this._aimDirection.copy(aimTarget).sub(weaponPosition).normalize();
    return this._aimDirection;
  }

  /**
   * Legacy method for fallback - get aim direction from torso rotation
   */
  private getAimDirectionFromTorso(
    transform: TransformComponent,
    mech?: MechComponent
  ): THREE.Vector3 {
    this._aimDirection.set(0, 0, 1);

    if (mech) {
      // Use torso world rotation with mesh flip compensation
      this._torsoRotation.set(-mech.headPitch, mech.torsoYaw + Math.PI, 0);
      this._aimDirection.applyEuler(this._torsoRotation);
    } else {
      this._aimDirection.applyEuler(transform.rotation);
    }

    return this._aimDirection;
  }

  private createLaserBeam(
    ownerId: string,
    weapon: Weapon,
    position: THREE.Vector3,
    direction: THREE.Vector3
  ): void {
    const maxRange = weapon.config.range;
    const { outerRadius, innerRadius, lifetime } = PROJECTILE_VISUALS.LASER;

    // Hitscan: raycast to find what we hit
    const hit = this.physicsWorld.castRay(position, direction, maxRange);

    // Determine beam length - stop at hit point or max range
    let beamLength = maxRange;

    if (hit && hit.entityId && hit.entityId !== ownerId) {
      beamLength = hit.distance;

      // Apply damage to hit entity
      const targetEntity = this.world.getEntity(hit.entityId);
      if (targetEntity) {
        const health = targetEntity.getComponent(HealthComponent);
        if (health) {
          health.takeDamage('torso', weapon.config.damage);

          // Emit damage event
          EventBus.emit(
            'entity:damaged',
            hit.entityId,
            weapon.config.damage,
            'torso',
            hit.point
          );

          // Check if destroyed
          if (health.isDestroyed()) {
            EventBus.emit('entity:destroyed', hit.entityId, hit.point);
            this.world.removeEntity(hit.entityId);
          }
        }
      }

      // Emit hit event for VFX/SFX
      EventBus.emit('projectile:hit', 'laser', hit.point, hit.entityId);
    } else if (hit) {
      // Hit terrain or something without an entity - still shorten beam
      beamLength = hit.distance;
    }

    // Outer beam - red glow
    const outerGeometry = new THREE.CylinderGeometry(
      outerRadius,
      outerRadius,
      beamLength,
      6
    );
    outerGeometry.translate(0, beamLength / 2, 0);
    outerGeometry.rotateX(Math.PI / 2);

    const outerMaterial = this.laserBeamMaterial.clone();
    const outerMesh = new THREE.Mesh(outerGeometry, outerMaterial);
    outerMesh.position.copy(position);
    outerMesh.lookAt(position.clone().add(direction));

    // Inner core
    const innerGeometry = new THREE.CylinderGeometry(
      innerRadius,
      innerRadius,
      beamLength,
      6
    );
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
      lifetime,
      maxLifetime: lifetime,
    });

    // Create muzzle flash
    this.createLaserMuzzleFlash(position);
  }

  private createLaserMuzzleFlash(position: THREE.Vector3): void {
    const { coreRadius, glowRadius, lifetime } =
      PROJECTILE_VISUALS.MUZZLE_FLASH.laser;

    const coreGeometry = new THREE.SphereGeometry(coreRadius, 8, 8);
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: 0xff6644,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
    });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);

    const glowGeometry = new THREE.SphereGeometry(glowRadius, 8, 8);
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
      lifetime,
      maxLifetime: lifetime,
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
        mesh = this.createAutocannonMeshLocal();
        this.createMuzzleFlash(position);
        break;
      case 'ppc':
        mesh = this.createPPCMeshLocal();
        this.createPPCMuzzleFlash(position);
        break;
      case 'missile':
        mesh = this.createMissileMeshLocal();
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

  // Use shared mesh factory functions from ProjectileVisuals
  private createAutocannonMeshLocal(): THREE.Mesh {
    return createAutocannonMesh(this.autocannonMaterial);
  }

  private createPPCMeshLocal(): THREE.Group {
    return createPPCMesh(this.ppcCoreMaterial, this.ppcSparkleMaterial);
  }

  private createMissileMeshLocal(): THREE.Group {
    return createMissileMesh(this.missileMaterial, this.flameMaterial);
  }

  private createMuzzleFlash(position: THREE.Vector3): void {
    const { coreRadius, glowRadius, lifetime } =
      PROJECTILE_VISUALS.MUZZLE_FLASH.autocannon;

    const coreGeometry = new THREE.SphereGeometry(coreRadius, 8, 8);
    const coreMaterial = this.muzzleFlashMaterial.clone();
    coreMaterial.color.setHex(0xffffcc);
    const core = new THREE.Mesh(coreGeometry, coreMaterial);

    const glowGeometry = new THREE.SphereGeometry(glowRadius, 8, 8);
    const glowMaterial = this.muzzleFlashMaterial.clone();
    glowMaterial.opacity = 0.6;
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);

    glow.add(core);
    glow.position.copy(position);

    this.scene.add(glow);

    this.muzzleFlashes.push({
      mesh: glow,
      lifetime,
      maxLifetime: lifetime,
    });
  }

  private createPPCMuzzleFlash(position: THREE.Vector3): void {
    const { coreRadius, glowRadius, lifetime } =
      PROJECTILE_VISUALS.MUZZLE_FLASH.ppc;

    const coreGeometry = new THREE.SphereGeometry(coreRadius, 8, 8);
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: 0xaaffff,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
    });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);

    const glowGeometry = new THREE.SphereGeometry(glowRadius, 8, 8);
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
      lifetime,
      maxLifetime: lifetime,
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

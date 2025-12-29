import * as THREE from 'three';
import { System } from '../core/System';
import type { ComponentClass } from '../core/Component';
import { TurretComponent } from '../components/TurretComponent';
import { TransformComponent } from '../components/TransformComponent';
import { RenderComponent } from '../components/RenderComponent';
import { WeaponComponent } from '../components/WeaponComponent';
import { InputComponent } from '../components/InputComponent';
// TODO: Re-enable when turret firing is restored
// import { EventBus } from '../core/EventBus';
import type { TurretModel } from '../rendering/TurretModel';
import type { Entity } from '../core/Entity';

/**
 * TurretAISystem handles turret behavior:
 * - Player detection
 * - Tracking/rotation
 * - Firing at player
 */
export class TurretAISystem extends System {
  readonly requiredComponents: ComponentClass[] = [
    TurretComponent,
    TransformComponent,
  ];

  // Cached player entity reference
  private playerEntity: Entity | null = null;

  // Reusable vectors to avoid per-frame allocations
  private readonly _toPlayer = new THREE.Vector3();
  private readonly _playerPos = new THREE.Vector3();
  private readonly _turretPos = new THREE.Vector3();

  init(): void {
    // Player detection will happen on first update
  }

  update(dt: number): void {
    // Find player entity if not cached
    if (!this.playerEntity || !this.world.getEntity(this.playerEntity.id)) {
      this.playerEntity = this.findPlayerEntity();
    }

    if (!this.playerEntity) return;

    // Get player position
    const playerTransform = this.playerEntity.getComponent(TransformComponent);
    if (!playerTransform) return;

    this._playerPos.copy(playerTransform.position);

    // Process each turret
    for (const entity of this.getEntities()) {
      this.updateTurret(entity, dt);
    }
  }

  private findPlayerEntity(): Entity | null {
    // Player is the entity with InputComponent
    const entities = this.world.getEntitiesWithComponents(
      InputComponent,
      TransformComponent
    );
    return entities.length > 0 ? entities[0] : null;
  }

  private updateTurret(entity: Entity, dt: number): void {
    const turret = entity.getComponent(TurretComponent)!;
    const transform = entity.getComponent(TransformComponent)!;
    const render = entity.getComponent(RenderComponent);
    const weapons = entity.getComponent(WeaponComponent);

    this._turretPos.copy(transform.position);

    // Calculate distance and direction to player
    this._toPlayer.copy(this._playerPos).sub(this._turretPos);
    const distanceToPlayer = this._toPlayer.length();

    // Check if player is in detection range
    turret.hasTarget = distanceToPlayer <= turret.detectionRange;

    if (!turret.hasTarget) {
      return;
    }

    // Calculate target yaw (angle to face player)
    turret.targetYaw = Math.atan2(this._toPlayer.x, this._toPlayer.z);

    // Smoothly rotate toward target
    const angleDiff = this.normalizeAngle(turret.targetYaw - turret.currentYaw);
    const maxRotation = turret.rotationSpeed * dt;

    if (Math.abs(angleDiff) <= maxRotation) {
      turret.currentYaw = turret.targetYaw;
    } else {
      turret.currentYaw += Math.sign(angleDiff) * maxRotation;
    }

    // Normalize current yaw
    turret.currentYaw = this.normalizeAngle(turret.currentYaw);

    // Update visual model rotation
    if (render) {
      const turretModel = (render as unknown as { turretModel?: TurretModel })
        .turretModel;
      if (turretModel) {
        turretModel.setYaw(turret.currentYaw);
      }
    }

    // Fire when aimed at player (temporarily disabled)
    // TODO: Re-enable turret firing
    // if (turret.isAimedAtTarget() && weapons) {
    //   // Update weapon cooldowns
    //   weapons.updateCooldowns(dt);
    //
    //   // Try to fire
    //   if (weapons.canFire(1)) {
    //     // Emit fire request - WeaponSystem will handle it
    //     EventBus.emit('turret:fire_request', entity.id, 1, {
    //       position: this.getMuzzlePosition(entity),
    //       direction: this.getAimDirection(turret.currentYaw),
    //     });
    //   }
    // }
    void weapons; // Suppress unused variable warning
  }

  /**
   * Get muzzle position for turret in world space
   */
  private getMuzzlePosition(entity: Entity): THREE.Vector3 {
    const transform = entity.getComponent(TransformComponent)!;
    const turret = entity.getComponent(TurretComponent)!;

    // Base position + turret offset + barrel offset in facing direction
    const muzzlePos = transform.position.clone();
    muzzlePos.y += 2.1; // Gun platform height

    // Offset forward in facing direction
    const forwardOffset = 3.0;
    muzzlePos.x += Math.sin(turret.currentYaw) * forwardOffset;
    muzzlePos.z += Math.cos(turret.currentYaw) * forwardOffset;

    return muzzlePos;
  }

  /**
   * Get aim direction from turret yaw
   */
  private getAimDirection(yaw: number): THREE.Vector3 {
    return new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)).normalize();
  }

  /**
   * Normalize angle to -PI to PI range
   */
  private normalizeAngle(angle: number): number {
    while (angle > Math.PI) angle -= Math.PI * 2;
    while (angle < -Math.PI) angle += Math.PI * 2;
    return angle;
  }
}

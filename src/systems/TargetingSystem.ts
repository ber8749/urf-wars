import * as THREE from 'three';
import { System } from '../core/System';
import type { ComponentClass } from '../core/Component';
import { TargetingComponent } from '../components/TargetingComponent';
import { TransformComponent } from '../components/TransformComponent';
import { InputComponent } from '../components/InputComponent';
import { TurretComponent } from '../components/TurretComponent';
import { HealthComponent } from '../components/HealthComponent';

/**
 * TargetingSystem handles enemy detection and target cycling.
 * Projects 3D target positions to 2D screen coordinates for HUD display.
 */
export class TargetingSystem extends System {
  readonly requiredComponents: ComponentClass[] = [
    TargetingComponent,
    TransformComponent,
    InputComponent,
  ];

  private camera: THREE.PerspectiveCamera;

  // Track previous frame's input for edge detection
  private wasTargetPrevious: boolean = false;
  private wasTargetNext: boolean = false;

  // Reusable vectors
  private readonly _playerPos = new THREE.Vector3();
  private readonly _targetPos = new THREE.Vector3();
  private readonly _screenPos = new THREE.Vector3();

  constructor(camera: THREE.PerspectiveCamera) {
    super();
    this.camera = camera;
  }

  update(_dt: number): void {
    // Process player entities with targeting
    for (const entity of this.getEntities()) {
      const targeting = entity.getComponent(TargetingComponent)!;
      const transform = entity.getComponent(TransformComponent)!;
      const input = entity.getComponent(InputComponent)!;

      if (!input.lastInput) continue;

      this._playerPos.copy(transform.position);

      // Find all enemies within detection range
      const enemiesInRange = this.findEnemiesInRange(
        this._playerPos,
        targeting.detectionRange
      );

      // Update detected targets
      targeting.updateDetectedTargets(enemiesInRange);

      // Handle target cycling input (edge-triggered)
      if (input.lastInput.targetPrevious && !this.wasTargetPrevious) {
        targeting.cyclePreviousTarget();
      }
      if (input.lastInput.targetNext && !this.wasTargetNext) {
        targeting.cycleNextTarget();
      }

      this.wasTargetPrevious = input.lastInput.targetPrevious;
      this.wasTargetNext = input.lastInput.targetNext;

      // Update screen positions for all detected targets
      this.updateScreenPositions(targeting, this._playerPos);
    }
  }

  /**
   * Find all enemy entities within range
   */
  private findEnemiesInRange(
    playerPos: THREE.Vector3,
    range: number
  ): string[] {
    const enemies: Array<{ id: string; distance: number }> = [];

    // Find all entities with TurretComponent (enemies)
    const turretEntities = this.world.getEntitiesWithComponents(
      TurretComponent,
      TransformComponent
    );

    for (const entity of turretEntities) {
      // Skip destroyed entities
      const health = entity.getComponent(HealthComponent);
      if (health && health.isDestroyed()) continue;

      const transform = entity.getComponent(TransformComponent)!;
      this._targetPos.copy(transform.position);

      const distance = this._playerPos.distanceTo(this._targetPos);

      if (distance <= range) {
        enemies.push({ id: entity.id, distance });
      }
    }

    // Sort by distance (closest first)
    enemies.sort((a, b) => a.distance - b.distance);

    return enemies.map((e) => e.id);
  }

  /**
   * Project target positions to screen coordinates
   */
  private updateScreenPositions(
    targeting: TargetingComponent,
    playerPos: THREE.Vector3
  ): void {
    targeting.targetScreenPositions.clear();

    for (const targetId of targeting.detectedTargets) {
      const targetEntity = this.world.getEntity(targetId);
      if (!targetEntity) continue;

      const transform = targetEntity.getComponent(TransformComponent);
      if (!transform) continue;

      // Get target center (add some height offset for turrets)
      this._targetPos.copy(transform.position);
      this._targetPos.y += 2; // Center of turret

      // Project to screen space
      this._screenPos.copy(this._targetPos);
      this._screenPos.project(this.camera);

      // Check if target is in front of camera
      const isVisible =
        this._screenPos.z < 1 &&
        Math.abs(this._screenPos.x) < 1.2 &&
        Math.abs(this._screenPos.y) < 1.2;

      if (isVisible) {
        // Convert to screen coordinates (0-1 range)
        const screenX = (this._screenPos.x + 1) / 2;
        const screenY = (-this._screenPos.y + 1) / 2;
        const distance = playerPos.distanceTo(this._targetPos);

        // Get health percentage
        const health = targetEntity.getComponent(HealthComponent);
        const healthPercent = health ? health.getTotalArmorPercentage() : 100;

        targeting.targetScreenPositions.set(targetId, {
          x: screenX,
          y: screenY,
          distance,
          healthPercent,
        });
      }

      // Track if locked target is visible
      if (targetId === targeting.lockedTargetId) {
        targeting.lockedTargetVisible = isVisible;
      }
    }
  }
}

import * as THREE from 'three';
import { System } from '../core/System';
import type { ComponentClass } from '../core/Component';
import { InputComponent } from '../components/InputComponent';
import { TransformComponent } from '../components/TransformComponent';
import { MechComponent } from '../components/MechComponent';
import { RenderComponent } from '../components/RenderComponent';
import type { CameraMode } from '../types';
import type { MechModel } from '../rendering/MechModel';

/**
 * Camera system handles first-person and third-person camera views.
 */
export class CameraSystem extends System {
  readonly requiredComponents: ComponentClass[] = [
    InputComponent,
    TransformComponent,
    MechComponent,
  ];

  private camera: THREE.PerspectiveCamera;
  private currentMode: CameraMode = 'third-person';
  private isTransitioning: boolean = false;
  private transitionProgress: number = 0;
  private transitionDuration: number = 0.3;

  // Third-person camera settings
  private distance: number = 25;
  private height: number = 12;
  private lookAtHeight: number = 8;

  // Smoothed camera values
  private currentPosition: THREE.Vector3 = new THREE.Vector3();
  private currentTarget: THREE.Vector3 = new THREE.Vector3();
  private previousPosition: THREE.Vector3 = new THREE.Vector3();
  private previousTarget: THREE.Vector3 = new THREE.Vector3();

  // Reusable objects to avoid per-frame allocations
  private readonly _firstPersonPos = new THREE.Vector3();
  private readonly _firstPersonTarget = new THREE.Vector3();
  private readonly _thirdPersonPos = new THREE.Vector3();
  private readonly _thirdPersonTarget = new THREE.Vector3();
  private readonly _forward = new THREE.Vector3();
  private readonly _torsoRotation = new THREE.Euler(0, 0, 0, 'YXZ');
  private readonly _idealOffset = new THREE.Vector3();
  private readonly _interpPosition = new THREE.Vector3();
  private readonly _interpTarget = new THREE.Vector3();

  constructor(camera: THREE.PerspectiveCamera) {
    super();
    this.camera = camera;
  }

  init(): void {
    // Setup key listener for view toggle
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyV') {
        this.toggleMode();
      }
    });
  }

  toggleMode(): void {
    if (this.isTransitioning) return;

    this.isTransitioning = true;
    this.transitionProgress = 0;
    this.currentMode =
      this.currentMode === 'first-person' ? 'third-person' : 'first-person';

    // Adjust FOV for first person
    if (this.currentMode === 'first-person') {
      this.camera.fov = 90;
    } else {
      this.camera.fov = 75;
    }
    this.camera.updateProjectionMatrix();
  }

  getMode(): CameraMode {
    return this.currentMode;
  }

  update(dt: number): void {
    // Store previous positions for interpolation
    this.previousPosition.copy(this.currentPosition);
    this.previousTarget.copy(this.currentTarget);

    // Handle transition
    if (this.isTransitioning) {
      this.transitionProgress += dt / this.transitionDuration;
      if (this.transitionProgress >= 1) {
        this.transitionProgress = 1;
        this.isTransitioning = false;
      }
    }

    // Find player entity
    const player = this.getEntities().find(
      (e) => e.getComponent(InputComponent)?.isLocalPlayer
    );

    if (!player) return;

    const transform = player.getComponent(TransformComponent)!;
    const mech = player.getComponent(MechComponent)!;
    const render = player.getComponent(RenderComponent);

    // Calculate camera positions for both modes (using cached vectors)
    this.getFirstPersonPosition(transform, mech, render, this._firstPersonPos);
    this.getFirstPersonTarget(
      this._firstPersonPos,
      transform,
      mech,
      this._firstPersonTarget
    );
    this.getThirdPersonPosition(transform, mech, this._thirdPersonPos);
    this.getThirdPersonTarget(transform, mech, this._thirdPersonTarget);

    // Apply transition or direct position
    if (this.isTransitioning) {
      const t = this.smoothstep(this.transitionProgress);

      if (this.currentMode === 'first-person') {
        this.currentPosition.lerpVectors(
          this._thirdPersonPos,
          this._firstPersonPos,
          t
        );
        this.currentTarget.lerpVectors(
          this._thirdPersonTarget,
          this._firstPersonTarget,
          t
        );
      } else {
        this.currentPosition.lerpVectors(
          this._firstPersonPos,
          this._thirdPersonPos,
          t
        );
        this.currentTarget.lerpVectors(
          this._firstPersonTarget,
          this._thirdPersonTarget,
          t
        );
      }
    } else {
      if (this.currentMode === 'first-person') {
        this.currentPosition.copy(this._firstPersonPos);
        this.currentTarget.copy(this._firstPersonTarget);
      } else {
        this.currentPosition.lerp(this._thirdPersonPos, 0.1);
        this.currentTarget.lerp(this._thirdPersonTarget, 0.15);
      }
    }
  }

  private getFirstPersonPosition(
    transform: TransformComponent,
    mech: MechComponent,
    render: RenderComponent | undefined,
    out: THREE.Vector3
  ): void {
    // Get cockpit position from mech model if available
    if (render?.mesh) {
      const model = render.mesh as unknown as MechModel;
      if (model.getCockpitPosition) {
        const cockpitPos = model.getCockpitPosition();
        out.copy(cockpitPos);
        out.y += 0.2; // Small eye offset
        return;
      }
    }

    // Fallback: estimate cockpit position
    out.copy(transform.position);
    out.y += 8; // Head height
  }

  private getFirstPersonTarget(
    position: THREE.Vector3,
    transform: TransformComponent,
    mech: MechComponent,
    out: THREE.Vector3
  ): void {
    // Look direction based on torso/head rotation
    this._forward.set(0, 0, 1);
    this._torsoRotation.set(
      -mech.headPitch,
      transform.rotation.y + mech.torsoYaw + Math.PI,
      0
    );
    this._forward.applyEuler(this._torsoRotation);

    out.copy(position).add(this._forward.multiplyScalar(100));
  }

  private getThirdPersonPosition(
    transform: TransformComponent,
    mech: MechComponent,
    out: THREE.Vector3
  ): void {
    // Camera locked directly behind torso
    const combinedYaw = transform.rotation.y + mech.torsoYaw;

    // Calculate ideal camera position behind the mech
    this._idealOffset.set(
      Math.sin(combinedYaw) * this.distance,
      this.height,
      Math.cos(combinedYaw) * this.distance
    );

    out.copy(transform.position).add(this._idealOffset);
  }

  private getThirdPersonTarget(
    transform: TransformComponent,
    mech: MechComponent,
    out: THREE.Vector3
  ): void {
    const combinedYaw = transform.rotation.y + mech.torsoYaw;

    // Look at a point in front of the mech, adjusted by head pitch
    const lookDistance = 50;
    out.copy(transform.position);
    out.y += this.lookAtHeight;

    // Apply head pitch to look target
    out.x -= Math.sin(combinedYaw) * Math.cos(mech.headPitch) * lookDistance;
    out.y += Math.sin(mech.headPitch) * lookDistance;
    out.z -= Math.cos(combinedYaw) * Math.cos(mech.headPitch) * lookDistance;
  }

  /**
   * Interpolate camera position for smooth rendering
   */
  interpolate(alpha: number): void {
    this._interpPosition.lerpVectors(
      this.previousPosition,
      this.currentPosition,
      alpha
    );

    this._interpTarget.lerpVectors(
      this.previousTarget,
      this.currentTarget,
      alpha
    );

    this.camera.position.copy(this._interpPosition);
    this.camera.lookAt(this._interpTarget);
  }

  private smoothstep(t: number): number {
    return t * t * (3 - 2 * t);
  }

  isFirstPerson(): boolean {
    return this.currentMode === 'first-person';
  }
}

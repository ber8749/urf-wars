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

    // Calculate camera positions for both modes
    const firstPersonPos = this.getFirstPersonPosition(transform, mech, render);
    const firstPersonTarget = this.getFirstPersonTarget(
      firstPersonPos,
      transform,
      mech
    );
    const thirdPersonPos = this.getThirdPersonPosition(transform, mech);
    const thirdPersonTarget = this.getThirdPersonTarget(transform, mech);

    // Apply transition or direct position
    if (this.isTransitioning) {
      const t = this.smoothstep(this.transitionProgress);

      if (this.currentMode === 'first-person') {
        this.currentPosition.lerpVectors(thirdPersonPos, firstPersonPos, t);
        this.currentTarget.lerpVectors(thirdPersonTarget, firstPersonTarget, t);
      } else {
        this.currentPosition.lerpVectors(firstPersonPos, thirdPersonPos, t);
        this.currentTarget.lerpVectors(firstPersonTarget, thirdPersonTarget, t);
      }
    } else {
      if (this.currentMode === 'first-person') {
        this.currentPosition.copy(firstPersonPos);
        this.currentTarget.copy(firstPersonTarget);
      } else {
        this.currentPosition.lerp(thirdPersonPos, 0.1);
        this.currentTarget.lerp(thirdPersonTarget, 0.15);
      }
    }
  }

  private getFirstPersonPosition(
    transform: TransformComponent,
    mech: MechComponent,
    render?: RenderComponent
  ): THREE.Vector3 {
    // Get cockpit position from mech model if available
    if (render?.mesh) {
      const model = render.mesh as unknown as MechModel;
      if (model.getCockpitPosition) {
        const cockpitPos = model.getCockpitPosition();
        cockpitPos.y += 0.2; // Small eye offset
        return cockpitPos;
      }
    }

    // Fallback: estimate cockpit position
    const pos = transform.position.clone();
    pos.y += 8; // Head height
    return pos;
  }

  private getFirstPersonTarget(
    position: THREE.Vector3,
    transform: TransformComponent,
    mech: MechComponent
  ): THREE.Vector3 {
    // Look direction based on torso/head rotation
    const forward = new THREE.Vector3(0, 0, 1);
    const torsoRotation = new THREE.Euler(
      -mech.headPitch,
      transform.rotation.y + mech.torsoYaw + Math.PI,
      0,
      'YXZ'
    );
    forward.applyEuler(torsoRotation);

    return position.clone().add(forward.multiplyScalar(100));
  }

  private getThirdPersonPosition(
    transform: TransformComponent,
    mech: MechComponent
  ): THREE.Vector3 {
    const mechPos = transform.position.clone();

    // Camera follows torso direction with some lag
    const combinedYaw = transform.rotation.y + mech.torsoYaw * 0.5;

    // Calculate ideal camera position behind the mech
    const idealOffset = new THREE.Vector3(
      Math.sin(combinedYaw) * this.distance,
      this.height,
      Math.cos(combinedYaw) * this.distance
    );

    return mechPos.add(idealOffset);
  }

  private getThirdPersonTarget(
    transform: TransformComponent,
    mech: MechComponent
  ): THREE.Vector3 {
    const mechPos = transform.position.clone();
    const combinedYaw = transform.rotation.y + mech.torsoYaw;

    // Look at a point in front of the mech, adjusted by head pitch
    const lookDistance = 50;
    const idealLookAt = mechPos.clone();
    idealLookAt.y += this.lookAtHeight;

    // Apply head pitch to look target
    idealLookAt.x -=
      Math.sin(combinedYaw) * Math.cos(mech.headPitch) * lookDistance;
    idealLookAt.y += Math.sin(mech.headPitch) * lookDistance;
    idealLookAt.z -=
      Math.cos(combinedYaw) * Math.cos(mech.headPitch) * lookDistance;

    return idealLookAt;
  }

  /**
   * Interpolate camera position for smooth rendering
   */
  interpolate(alpha: number): void {
    const position = new THREE.Vector3().lerpVectors(
      this.previousPosition,
      this.currentPosition,
      alpha
    );

    const target = new THREE.Vector3().lerpVectors(
      this.previousTarget,
      this.currentTarget,
      alpha
    );

    this.camera.position.copy(position);
    this.camera.lookAt(target);
  }

  private smoothstep(t: number): number {
    return t * t * (3 - 2 * t);
  }

  isFirstPerson(): boolean {
    return this.currentMode === 'first-person';
  }
}

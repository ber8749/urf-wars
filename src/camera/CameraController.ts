import * as THREE from 'three';
import type { Mech } from '../mech/Mech';
import type { InputManager } from '../core/InputManager';
import { FirstPersonCam } from './FirstPersonCam';
import { ThirdPersonCam } from './ThirdPersonCam';
import type { CameraMode } from '../types';

export class CameraController {
  private camera: THREE.PerspectiveCamera;
  
  private firstPersonCam: FirstPersonCam;
  private thirdPersonCam: ThirdPersonCam;
  
  private currentMode: CameraMode = 'third-person';
  private isTransitioning: boolean = false;
  private transitionProgress: number = 0;
  private transitionDuration: number = 0.3;
  
  // Stored positions for interpolation
  private previousPosition: THREE.Vector3 = new THREE.Vector3();
  private previousTarget: THREE.Vector3 = new THREE.Vector3();
  private currentPosition: THREE.Vector3 = new THREE.Vector3();
  private currentTarget: THREE.Vector3 = new THREE.Vector3();
  
  constructor(
    camera: THREE.PerspectiveCamera,
    mech: Mech,
    _inputManager: InputManager
  ) {
    this.camera = camera;
    
    this.firstPersonCam = new FirstPersonCam(mech);
    this.thirdPersonCam = new ThirdPersonCam(mech);
    
    // Setup key listener for view toggle
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyV') {
        this.toggleMode();
      }
    });
    
    // Initialize positions
    this.updateCameraPositions();
    this.previousPosition.copy(this.currentPosition);
    this.previousTarget.copy(this.currentTarget);
  }
  
  toggleMode(): void {
    if (this.isTransitioning) return;
    
    this.isTransitioning = true;
    this.transitionProgress = 0;
    this.currentMode = this.currentMode === 'first-person' ? 'third-person' : 'first-person';
    
    // Adjust FOV for first person
    if (this.currentMode === 'first-person') {
      this.camera.fov = 90;
    } else {
      this.camera.fov = 75;
    }
    this.camera.updateProjectionMatrix();
  }
  
  setMode(mode: CameraMode): void {
    if (this.currentMode === mode) return;
    this.toggleMode();
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
    
    // Update camera positions
    this.updateCameraPositions();
  }
  
  private updateCameraPositions(): void {
    const firstPersonPos = this.firstPersonCam.getPosition();
    const firstPersonTarget = this.firstPersonCam.getTarget();
    const thirdPersonPos = this.thirdPersonCam.getPosition();
    const thirdPersonTarget = this.thirdPersonCam.getTarget();
    
    if (this.isTransitioning) {
      // Smooth transition between modes
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
        this.currentPosition.copy(thirdPersonPos);
        this.currentTarget.copy(thirdPersonTarget);
      }
    }
  }
  
  // Called during render for smooth camera movement
  interpolate(alpha: number): void {
    // Interpolate between previous and current positions
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
  
  getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }
  
  isFirstPerson(): boolean {
    return this.currentMode === 'first-person';
  }
}


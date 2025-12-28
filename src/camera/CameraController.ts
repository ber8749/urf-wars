import * as THREE from 'three';
import { Mech } from '../mech/Mech';
import { InputManager } from '../core/InputManager';
import { CameraMode } from '../types';

export class CameraController {
  private camera: THREE.PerspectiveCamera;
  private mech: Mech;
  private input: InputManager;
  private mode: CameraMode = CameraMode.ThirdPerson;
  
  // Third person camera settings
  private readonly thirdPersonDistance = 25;
  private readonly thirdPersonHeight = 12;
  private readonly cameraLag = 8; // Smoothing factor
  
  // Camera position tracking
  private currentPosition = new THREE.Vector3();
  private targetPosition = new THREE.Vector3();
  
  // Tab key debounce
  private canSwitchCamera = true;

  constructor(camera: THREE.PerspectiveCamera, mech: Mech, input: InputManager) {
    this.camera = camera;
    this.mech = mech;
    this.input = input;
    
    // Initialize camera position
    this.updateThirdPersonTarget();
    this.currentPosition.copy(this.targetPosition);
    this.camera.position.copy(this.currentPosition);
  }

  update(dt: number): void {
    // Handle camera switching
    this.handleCameraSwitch();
    
    // Update camera based on mode
    if (this.mode === CameraMode.Cockpit) {
      this.updateCockpitCamera();
    } else {
      this.updateThirdPersonCamera(dt);
    }
  }

  private handleCameraSwitch(): void {
    const state = this.input.getState();
    
    if (state.switchCamera && this.canSwitchCamera) {
      this.mode = this.mode === CameraMode.Cockpit 
        ? CameraMode.ThirdPerson 
        : CameraMode.Cockpit;
      this.canSwitchCamera = false;
      
      // Adjust FOV for different modes
      if (this.mode === CameraMode.Cockpit) {
        this.camera.fov = 90; // Wider FOV for cockpit
      } else {
        this.camera.fov = 75;
      }
      this.camera.updateProjectionMatrix();
    }
    
    if (!state.switchCamera) {
      this.canSwitchCamera = true;
    }
  }

  private updateCockpitCamera(): void {
    // Position camera inside the cockpit
    const cockpitPos = this.mech.getCockpitPosition();
    this.camera.position.copy(cockpitPos);
    
    // Look in the direction the torso is facing
    const lookDir = this.mech.getAimDirection();
    const lookTarget = cockpitPos.clone().add(lookDir.multiplyScalar(100));
    this.camera.lookAt(lookTarget);
  }

  private updateThirdPersonCamera(dt: number): void {
    this.updateThirdPersonTarget();
    
    // Smooth camera movement
    this.currentPosition.lerp(this.targetPosition, 1 - Math.exp(-this.cameraLag * dt));
    this.camera.position.copy(this.currentPosition);
    
    // Look at mech torso
    const lookTarget = this.mech.mesh.position.clone();
    lookTarget.y += 6; // Look at torso height
    this.camera.lookAt(lookTarget);
  }

  private updateThirdPersonTarget(): void {
    // Calculate camera position behind and above the mech
    // Camera follows leg rotation, not torso
    const offset = new THREE.Vector3(0, this.thirdPersonHeight, this.thirdPersonDistance);
    offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.mech.legRotation);
    
    this.targetPosition.copy(this.mech.mesh.position).add(offset);
  }

  getMode(): CameraMode {
    return this.mode;
  }

  setMode(mode: CameraMode): void {
    this.mode = mode;
  }
}


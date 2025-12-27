import { Mech } from './Mech';
import { InputManager } from '../core/InputManager';

export class MechController {
  private mech: Mech;
  private inputManager: InputManager;
  
  private readonly mouseSensitivity: number = 0.002;
  
  constructor(mech: Mech, inputManager: InputManager) {
    this.mech = mech;
    this.inputManager = inputManager;
  }
  
  // Torso/head rotation speeds (radians per second)
  private readonly torsoRotateSpeed: number = 1.5;
  private readonly headPitchSpeed: number = 1.0;
  
  update(dt: number): void {
    const input = this.inputManager.getSnapshot();
    
    // Movement (WASD)
    let forward = 0;
    let strafe = 0;
    
    if (input.forward) forward += 1;
    if (input.backward) forward -= 1;
    if (input.strafeLeft) strafe -= 1;
    if (input.strafeRight) strafe += 1;
    
    if (forward !== 0 || strafe !== 0) {
      this.mech.move(forward, strafe);
    }
    
    // Torso rotation (Left/Right arrow keys)
    let torsoYawDelta = 0;
    if (input.torsoLeft) torsoYawDelta += this.torsoRotateSpeed * dt;
    if (input.torsoRight) torsoYawDelta -= this.torsoRotateSpeed * dt;
    
    // Head pitch (Up/Down arrow keys)
    let headPitchDelta = 0;
    if (input.lookUp) headPitchDelta += this.headPitchSpeed * dt;
    if (input.lookDown) headPitchDelta -= this.headPitchSpeed * dt;
    
    // Apply torso/head rotation
    if (torsoYawDelta !== 0 || headPitchDelta !== 0) {
      this.mech.rotateTorso(torsoYawDelta, headPitchDelta);
    }
    
    // Mouse look - additional torso/head control
    if (this.inputManager.isPointerLocked()) {
      const mouseDelta = this.inputManager.getMouseDelta();
      
      if (mouseDelta.x !== 0 || mouseDelta.y !== 0) {
        const mouseYaw = -mouseDelta.x * this.mouseSensitivity;
        const mousePitch = -mouseDelta.y * this.mouseSensitivity;
        this.mech.rotateTorso(mouseYaw, mousePitch);
      }
    }
    
    // Jump
    if (input.jump) {
      this.mech.jump();
    }
    
    // Firing
    if (input.fire) {
      const selectedWeapon = this.mech.weaponSystem.getSelectedSlot();
      this.mech.fireWeapon(selectedWeapon);
    }
    
    // Weapon selection
    if (input.weaponSlot !== this.mech.weaponSystem.getSelectedSlot()) {
      this.mech.weaponSystem.selectWeapon(input.weaponSlot);
    }
  }
}


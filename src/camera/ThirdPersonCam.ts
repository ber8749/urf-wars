import * as THREE from 'three';
import { Mech } from '../mech/Mech';

export class ThirdPersonCam {
  private mech: Mech;
  
  // Camera settings
  private distance: number = 25;
  private height: number = 12;
  private lookAtHeight: number = 8;
  
  // Smoothing
  private currentPosition: THREE.Vector3 = new THREE.Vector3();
  private currentLookAt: THREE.Vector3 = new THREE.Vector3();
  
  constructor(mech: Mech) {
    this.mech = mech;
    
    // Initialize camera position
    const mechPos = mech.getPosition();
    this.currentPosition.set(
      mechPos.x,
      mechPos.y + this.height,
      mechPos.z + this.distance
    );
    this.currentLookAt.copy(mechPos);
    this.currentLookAt.y += this.lookAtHeight;
  }
  
  getPosition(): THREE.Vector3 {
    const mechPos = this.mech.getPosition();
    const mechRotation = this.mech.getRotation();
    const torsoYaw = this.mech.getTorsoYaw();
    
    // Camera follows torso direction with some lag
    // NO PI here - the mesh is already flipped, so camera should use raw physics rotation
    const combinedYaw = mechRotation.y + torsoYaw * 0.5;
    
    // Calculate ideal camera position behind the mech
    const idealOffset = new THREE.Vector3(
      Math.sin(combinedYaw) * this.distance,
      this.height,
      Math.cos(combinedYaw) * this.distance
    );
    
    const idealPosition = mechPos.clone().add(idealOffset);
    
    // Smooth camera movement
    this.currentPosition.lerp(idealPosition, 0.1);
    
    return this.currentPosition.clone();
  }
  
  getTarget(): THREE.Vector3 {
    const mechPos = this.mech.getPosition();
    const headPitch = this.mech.getHeadPitch();
    const torsoYaw = this.mech.getTorsoYaw();
    const mechRotation = this.mech.getRotation();
    
    // Calculate look direction based on torso yaw and head pitch
    // NO PI here - mesh is already flipped
    const combinedYaw = mechRotation.y + torsoYaw;
    
    // Look at a point in front of the mech, adjusted by head pitch
    const lookDistance = 50;
    const idealLookAt = mechPos.clone();
    idealLookAt.y += this.lookAtHeight;
    
    // Apply head pitch to look target (negative pitch = look up)
    idealLookAt.x -= Math.sin(combinedYaw) * Math.cos(headPitch) * lookDistance;
    idealLookAt.y += Math.sin(headPitch) * lookDistance;
    idealLookAt.z -= Math.cos(combinedYaw) * Math.cos(headPitch) * lookDistance;
    
    // Smooth the look-at point
    this.currentLookAt.lerp(idealLookAt, 0.15);
    
    return this.currentLookAt.clone();
  }
  
  // Adjust camera distance (for zoom)
  setDistance(distance: number): void {
    this.distance = Math.max(10, Math.min(50, distance));
  }
  
  getDistance(): number {
    return this.distance;
  }
  
  // Adjust camera height
  setHeight(height: number): void {
    this.height = Math.max(5, Math.min(30, height));
  }
}


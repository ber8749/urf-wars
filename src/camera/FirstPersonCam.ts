import * as THREE from 'three';
import { Mech } from '../mech/Mech';

export class FirstPersonCam {
  private mech: Mech;
  
  // Camera offset from cockpit center
  private offset: THREE.Vector3 = new THREE.Vector3(0, 0.2, 0);
  
  constructor(mech: Mech) {
    this.mech = mech;
  }
  
  getPosition(): THREE.Vector3 {
    // Get cockpit position from mech
    const cockpitPos = this.mech.getCockpitPosition();
    
    // Add small offset for eye position
    cockpitPos.add(this.offset);
    
    return cockpitPos;
  }
  
  getTarget(): THREE.Vector3 {
    const position = this.getPosition();
    const torsoRotation = this.mech.getTorsoWorldRotation();
    
    // Look direction based on torso/head rotation
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyEuler(torsoRotation);
    
    return position.clone().add(forward.multiplyScalar(100));
  }
  
  // Get the look direction for aiming
  getLookDirection(): THREE.Vector3 {
    const torsoRotation = this.mech.getTorsoWorldRotation();
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyEuler(torsoRotation);
    return direction.normalize();
  }
}


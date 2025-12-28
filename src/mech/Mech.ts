import * as THREE from 'three';
import { MechComponents } from './MechComponents';
import { ComponentLocation, COLORS } from '../types';

export class Mech {
  public readonly name: string;
  public readonly mesh: THREE.Group;
  public readonly components: MechComponents;
  
  // Separate groups for legs and torso (independent rotation)
  public readonly legs: THREE.Group;
  public readonly torso: THREE.Group;
  public readonly leftArm: THREE.Mesh;
  public readonly rightArm: THREE.Mesh;
  public readonly head: THREE.Mesh;
  
  // Component meshes for hit detection
  public readonly componentMeshes: Map<ComponentLocation, THREE.Mesh> = new Map();

  // Movement state
  public legRotation = 0; // Y-axis rotation of legs
  public torsoTwist = 0; // Relative to legs (-PI/2 to PI/2)
  public torsoPitch = 0; // Up/down aim (-PI/6 to PI/6)
  
  // Physics state
  public velocity = new THREE.Vector3();

  // Mech specs
  public readonly maxSpeed = 20; // m/s
  public readonly acceleration = 40; // m/s²
  public readonly turnRate = 1.5; // rad/s for legs
  public readonly torsoTwistRate = 2.5; // rad/s
  public readonly torsoTwistLimit = Math.PI / 2; // 90 degrees
  public readonly torsoPitchLimit = Math.PI / 6; // 30 degrees

  private isPlayer: boolean;

  constructor(name: string, isPlayer: boolean = false) {
    this.name = name;
    this.isPlayer = isPlayer;
    this.components = new MechComponents();
    
    // Create main mesh group
    this.mesh = new THREE.Group();
    
    // Create legs group (contains lower body)
    this.legs = new THREE.Group();
    this.mesh.add(this.legs);
    
    // Create torso group (rotates independently)
    this.torso = new THREE.Group();
    this.torso.position.y = 4; // Torso sits on top of legs
    this.legs.add(this.torso);

    // Build the mech geometry
    const color = isPlayer ? COLORS.playerMech : COLORS.enemy;
    this.buildLegs(color);
    const { leftArm, rightArm, head } = this.buildTorso(color);
    this.leftArm = leftArm;
    this.rightArm = rightArm;
    this.head = head;

    // Setup component destruction callbacks
    this.setupComponentCallbacks();
  }

  private buildLegs(color: number): void {
    const legMaterial = new THREE.MeshStandardMaterial({ 
      color,
      roughness: 0.7,
      metalness: 0.3,
    });

    // Hip/pelvis
    const hipGeo = new THREE.BoxGeometry(3, 1.5, 2);
    const hip = new THREE.Mesh(hipGeo, legMaterial);
    hip.position.y = 3;
    hip.castShadow = true;
    hip.receiveShadow = true;
    this.legs.add(hip);

    // Left leg
    const leftLegGeo = new THREE.BoxGeometry(1, 3, 1.2);
    const leftLeg = new THREE.Mesh(leftLegGeo, legMaterial);
    leftLeg.position.set(-1.2, 1.5, 0);
    leftLeg.castShadow = true;
    leftLeg.receiveShadow = true;
    this.legs.add(leftLeg);
    this.componentMeshes.set(ComponentLocation.LeftLeg, leftLeg);

    // Left foot
    const leftFootGeo = new THREE.BoxGeometry(1.2, 0.5, 2);
    const leftFoot = new THREE.Mesh(leftFootGeo, legMaterial);
    leftFoot.position.set(-1.2, 0.25, 0.3);
    leftFoot.castShadow = true;
    leftFoot.receiveShadow = true;
    this.legs.add(leftFoot);

    // Right leg
    const rightLegGeo = new THREE.BoxGeometry(1, 3, 1.2);
    const rightLeg = new THREE.Mesh(rightLegGeo, legMaterial);
    rightLeg.position.set(1.2, 1.5, 0);
    rightLeg.castShadow = true;
    rightLeg.receiveShadow = true;
    this.legs.add(rightLeg);
    this.componentMeshes.set(ComponentLocation.RightLeg, rightLeg);

    // Right foot
    const rightFootGeo = new THREE.BoxGeometry(1.2, 0.5, 2);
    const rightFoot = new THREE.Mesh(rightFootGeo, legMaterial);
    rightFoot.position.set(1.2, 0.25, 0.3);
    rightFoot.castShadow = true;
    rightFoot.receiveShadow = true;
    this.legs.add(rightFoot);
  }

  private buildTorso(color: number): { leftArm: THREE.Mesh; rightArm: THREE.Mesh; head: THREE.Mesh } {
    const torsoMaterial = new THREE.MeshStandardMaterial({ 
      color,
      roughness: 0.6,
      metalness: 0.4,
    });

    // Center torso
    const centerTorsoGeo = new THREE.BoxGeometry(2.5, 3, 2);
    const centerTorso = new THREE.Mesh(centerTorsoGeo, torsoMaterial);
    centerTorso.position.y = 1.5;
    centerTorso.castShadow = true;
    centerTorso.receiveShadow = true;
    this.torso.add(centerTorso);
    this.componentMeshes.set(ComponentLocation.CenterTorso, centerTorso);

    // Left torso (side)
    const leftTorsoGeo = new THREE.BoxGeometry(1, 2.5, 1.8);
    const leftTorso = new THREE.Mesh(leftTorsoGeo, torsoMaterial);
    leftTorso.position.set(-1.75, 1.5, 0);
    leftTorso.castShadow = true;
    leftTorso.receiveShadow = true;
    this.torso.add(leftTorso);
    this.componentMeshes.set(ComponentLocation.LeftTorso, leftTorso);

    // Right torso (side)
    const rightTorsoGeo = new THREE.BoxGeometry(1, 2.5, 1.8);
    const rightTorso = new THREE.Mesh(rightTorsoGeo, torsoMaterial);
    rightTorso.position.set(1.75, 1.5, 0);
    rightTorso.castShadow = true;
    rightTorso.receiveShadow = true;
    this.torso.add(rightTorso);
    this.componentMeshes.set(ComponentLocation.RightTorso, rightTorso);

    // Head/cockpit
    const headGeo = new THREE.BoxGeometry(1.5, 1.2, 1.5);
    const headMaterial = new THREE.MeshStandardMaterial({ 
      color: this.isPlayer ? 0x1e40af : 0x991b1b,
      roughness: 0.3,
      metalness: 0.6,
    });
    const head = new THREE.Mesh(headGeo, headMaterial);
    head.position.set(0, 3.6, 0.2);
    head.castShadow = true;
    head.receiveShadow = true;
    this.torso.add(head);
    this.componentMeshes.set(ComponentLocation.Head, head);

    // Cockpit glass
    const glassGeo = new THREE.BoxGeometry(1.2, 0.6, 0.1);
    const glassMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x88ccff,
      transparent: true,
      opacity: 0.7,
      roughness: 0.1,
      metalness: 0.9,
    });
    const glass = new THREE.Mesh(glassGeo, glassMaterial);
    glass.position.set(0, 3.5, 0.95);
    this.torso.add(glass);

    // Left arm
    const leftArmGeo = new THREE.BoxGeometry(0.8, 2.5, 0.8);
    const leftArm = new THREE.Mesh(leftArmGeo, torsoMaterial);
    leftArm.position.set(-2.65, 1.5, 0);
    leftArm.castShadow = true;
    leftArm.receiveShadow = true;
    this.torso.add(leftArm);
    this.componentMeshes.set(ComponentLocation.LeftArm, leftArm);

    // Left weapon mount (laser)
    const leftWeaponGeo = new THREE.CylinderGeometry(0.15, 0.15, 2, 8);
    const weaponMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const leftWeapon = new THREE.Mesh(leftWeaponGeo, weaponMaterial);
    leftWeapon.rotation.x = Math.PI / 2;
    leftWeapon.position.set(-2.65, 1.2, -1.2);
    this.torso.add(leftWeapon);

    // Right arm  
    const rightArmGeo = new THREE.BoxGeometry(0.8, 2.5, 0.8);
    const rightArm = new THREE.Mesh(rightArmGeo, torsoMaterial);
    rightArm.position.set(2.65, 1.5, 0);
    rightArm.castShadow = true;
    rightArm.receiveShadow = true;
    this.torso.add(rightArm);
    this.componentMeshes.set(ComponentLocation.RightArm, rightArm);

    // Right weapon mount (autocannon)
    const rightWeaponGeo = new THREE.BoxGeometry(0.4, 0.4, 2.5);
    const rightWeapon = new THREE.Mesh(rightWeaponGeo, weaponMaterial);
    rightWeapon.position.set(2.65, 1.2, -1.4);
    this.torso.add(rightWeapon);

    return { leftArm, rightArm, head };
  }

  private setupComponentCallbacks(): void {
    this.components.onComponentDestroyed = (location) => {
      // Visual feedback when component is destroyed
      const mesh = this.componentMeshes.get(location);
      if (mesh) {
        // Darken destroyed components
        const material = mesh.material as THREE.MeshStandardMaterial;
        material.color.setHex(0x333333);
        material.emissive.setHex(0x110000);
      }
      console.log(`${this.name}: ${location} destroyed!`);
    };

    this.components.onMechDestroyed = () => {
      console.log(`${this.name} has been destroyed!`);
      // Could trigger explosion effect, disable controls, etc.
    };
  }

  // Get world position of weapon mounts for firing
  getLeftWeaponPosition(): THREE.Vector3 {
    const pos = new THREE.Vector3(-2.65, 5.2, -1.2);
    pos.applyQuaternion(this.torso.getWorldQuaternion(new THREE.Quaternion()));
    pos.add(this.mesh.position);
    return pos;
  }

  getRightWeaponPosition(): THREE.Vector3 {
    const pos = new THREE.Vector3(2.65, 5.2, -1.4);
    pos.applyQuaternion(this.torso.getWorldQuaternion(new THREE.Quaternion()));
    pos.add(this.mesh.position);
    return pos;
  }

  // Get aim direction (where torso is pointing)
  getAimDirection(): THREE.Vector3 {
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(this.torso.getWorldQuaternion(new THREE.Quaternion()));
    return direction.normalize();
  }

  // Get cockpit position for first-person camera
  getCockpitPosition(): THREE.Vector3 {
    const pos = new THREE.Vector3(0, 7.6, 0.5);
    this.torso.localToWorld(pos);
    return pos;
  }

  // Update visual rotation based on state
  updateRotation(): void {
    // Legs rotation (Y-axis in world space)
    this.legs.rotation.y = this.legRotation;
    
    // Torso twist (relative to legs) + pitch
    this.torso.rotation.y = this.torsoTwist;
    this.torso.rotation.x = this.torsoPitch;
  }
}


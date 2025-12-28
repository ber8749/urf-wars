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
  public readonly torsoTwistLimit = Math.PI * 2; // Full 360 degrees
  public readonly torsoPitchLimit = Math.PI / 6; // 30 degrees

  private isPlayer: boolean;

  // Color scheme for different sections (makes debugging easier)
  private readonly MECH_COLORS = {
    legs: 0x4a4a4a,       // Dark gray for legs
    joints: 0x666666,     // Metallic gray for joints
    torso: 0x2563eb,      // Primary blue (player)
    torsoEnemy: 0xdc2626, // Red (enemy)
    arms: 0x3b82f6,       // Lighter blue for arms
    armsEnemy: 0xef4444,  // Lighter red for enemy arms
    head: 0x1e40af,       // Darker blue for head
    headEnemy: 0x991b1b,  // Darker red for enemy head
    marker: 0x22c55e,     // Bright green for direction markers
    weapon: 0x333333,     // Dark for weapons
  };

  // Walk animation - leg pivot groups
  private leftLegPivot!: THREE.Group;
  private leftKneePivot!: THREE.Group;
  private leftAnklePivot!: THREE.Group;
  private rightLegPivot!: THREE.Group;
  private rightKneePivot!: THREE.Group;
  private rightAnklePivot!: THREE.Group;

  // Walk animation state
  private walkCyclePhase = 0;
  private readonly walkCycleSpeed = 10; // Cycles per second at max speed
  private readonly hipSwingAngle = 0.35; // Max hip rotation in radians (~20 deg)
  private readonly kneeSwingAngle = 0.5; // Max knee bend in radians (~29 deg)

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

  private buildLegs(_color: number): void {
    const legMaterial = new THREE.MeshStandardMaterial({ 
      color: this.MECH_COLORS.legs,
      roughness: 0.7,
      metalness: 0.3,
    });

    const jointMaterial = new THREE.MeshStandardMaterial({
      color: this.MECH_COLORS.joints,
      roughness: 0.4,
      metalness: 0.6,
    });

    const markerMaterial = new THREE.MeshStandardMaterial({
      color: this.MECH_COLORS.marker,
      roughness: 0.5,
      metalness: 0.2,
      emissive: this.MECH_COLORS.marker,
      emissiveIntensity: 0.3,
    });

    // === HIP/PELVIS (static) ===
    const hipGeo = new THREE.BoxGeometry(3.5, 1.2, 2.2);
    const hip = new THREE.Mesh(hipGeo, legMaterial);
    hip.position.y = 3.2;
    hip.castShadow = true;
    hip.receiveShadow = true;
    this.legs.add(hip);

    // Hip forward direction marker
    const hipMarkerGeo = new THREE.ConeGeometry(0.3, 0.8, 4);
    const hipMarker = new THREE.Mesh(hipMarkerGeo, markerMaterial);
    hipMarker.rotation.x = -Math.PI / 2;
    hipMarker.position.set(0, 3.2, -1.5);
    this.legs.add(hipMarker);

    // Shared geometries
    const upperLegGeo = new THREE.BoxGeometry(0.9, 1.8, 1.0);
    const kneeGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.6, 8);
    const lowerLegGeo = new THREE.BoxGeometry(0.8, 1.6, 0.9);
    const ankleGeo = new THREE.SphereGeometry(0.3, 8, 8);
    const footGeo = new THREE.BoxGeometry(1.0, 0.4, 2.0);
    const toeGeo = new THREE.BoxGeometry(0.8, 0.3, 0.6);
    const hipJointGeo = new THREE.SphereGeometry(0.5, 8, 8);

    // === LEFT LEG (hierarchical for animation) ===
    // Hip joint visual (attached to main legs group, doesn't animate)
    const leftHipJoint = new THREE.Mesh(hipJointGeo, jointMaterial);
    leftHipJoint.position.set(-1.5, 2.8, 0);
    leftHipJoint.castShadow = true;
    this.legs.add(leftHipJoint);

    // Leg pivot at hip joint position
    this.leftLegPivot = new THREE.Group();
    this.leftLegPivot.position.set(-1.5, 2.6, 0);
    this.legs.add(this.leftLegPivot);

    // Upper leg (relative to leg pivot)
    const leftUpperLeg = new THREE.Mesh(upperLegGeo, legMaterial);
    leftUpperLeg.position.set(0, -0.9, 0);
    leftUpperLeg.castShadow = true;
    leftUpperLeg.receiveShadow = true;
    this.leftLegPivot.add(leftUpperLeg);

    // Knee pivot (at bottom of upper leg)
    this.leftKneePivot = new THREE.Group();
    this.leftKneePivot.position.set(0, -1.9, 0);
    this.leftLegPivot.add(this.leftKneePivot);

    // Knee joint visual
    const leftKnee = new THREE.Mesh(kneeGeo, jointMaterial);
    leftKnee.rotation.z = Math.PI / 2;
    leftKnee.castShadow = true;
    this.leftKneePivot.add(leftKnee);

    // Lower leg (relative to knee pivot)
    const leftLowerLeg = new THREE.Mesh(lowerLegGeo, legMaterial);
    leftLowerLeg.position.set(0, -0.9, 0.2);
    leftLowerLeg.castShadow = true;
    leftLowerLeg.receiveShadow = true;
    this.leftKneePivot.add(leftLowerLeg);
    this.componentMeshes.set(ComponentLocation.LeftLeg, leftLowerLeg);

    // Ankle pivot (at bottom of lower leg)
    this.leftAnklePivot = new THREE.Group();
    this.leftAnklePivot.position.set(0, -1.7, 0.3);
    this.leftKneePivot.add(this.leftAnklePivot);

    // Ankle joint visual
    const leftAnkle = new THREE.Mesh(ankleGeo, jointMaterial);
    leftAnkle.castShadow = true;
    this.leftAnklePivot.add(leftAnkle);

    // Foot (relative to ankle pivot)
    const leftFoot = new THREE.Mesh(footGeo, legMaterial);
    leftFoot.position.set(0, -0.3, 0.2);
    leftFoot.castShadow = true;
    leftFoot.receiveShadow = true;
    this.leftAnklePivot.add(leftFoot);

    // Toe
    const leftToe = new THREE.Mesh(toeGeo, legMaterial);
    leftToe.position.set(0, -0.35, -1.2);
    leftToe.castShadow = true;
    this.leftAnklePivot.add(leftToe);

    // === RIGHT LEG (hierarchical for animation) ===
    // Hip joint visual
    const rightHipJoint = new THREE.Mesh(hipJointGeo, jointMaterial);
    rightHipJoint.position.set(1.5, 2.8, 0);
    rightHipJoint.castShadow = true;
    this.legs.add(rightHipJoint);

    // Leg pivot at hip joint position
    this.rightLegPivot = new THREE.Group();
    this.rightLegPivot.position.set(1.5, 2.6, 0);
    this.legs.add(this.rightLegPivot);

    // Upper leg
    const rightUpperLeg = new THREE.Mesh(upperLegGeo, legMaterial);
    rightUpperLeg.position.set(0, -0.9, 0);
    rightUpperLeg.castShadow = true;
    rightUpperLeg.receiveShadow = true;
    this.rightLegPivot.add(rightUpperLeg);

    // Knee pivot
    this.rightKneePivot = new THREE.Group();
    this.rightKneePivot.position.set(0, -1.9, 0);
    this.rightLegPivot.add(this.rightKneePivot);

    // Knee joint visual
    const rightKnee = new THREE.Mesh(kneeGeo, jointMaterial);
    rightKnee.rotation.z = Math.PI / 2;
    rightKnee.castShadow = true;
    this.rightKneePivot.add(rightKnee);

    // Lower leg
    const rightLowerLeg = new THREE.Mesh(lowerLegGeo, legMaterial);
    rightLowerLeg.position.set(0, -0.9, 0.2);
    rightLowerLeg.castShadow = true;
    rightLowerLeg.receiveShadow = true;
    this.rightKneePivot.add(rightLowerLeg);
    this.componentMeshes.set(ComponentLocation.RightLeg, rightLowerLeg);

    // Ankle pivot
    this.rightAnklePivot = new THREE.Group();
    this.rightAnklePivot.position.set(0, -1.7, 0.3);
    this.rightKneePivot.add(this.rightAnklePivot);

    // Ankle joint visual
    const rightAnkle = new THREE.Mesh(ankleGeo, jointMaterial);
    rightAnkle.castShadow = true;
    this.rightAnklePivot.add(rightAnkle);

    // Foot
    const rightFoot = new THREE.Mesh(footGeo, legMaterial);
    rightFoot.position.set(0, -0.3, 0.2);
    rightFoot.castShadow = true;
    rightFoot.receiveShadow = true;
    this.rightAnklePivot.add(rightFoot);

    // Toe
    const rightToe = new THREE.Mesh(toeGeo, legMaterial);
    rightToe.position.set(0, -0.35, -1.2);
    rightToe.castShadow = true;
    this.rightAnklePivot.add(rightToe);
  }

  private buildTorso(_color: number): { leftArm: THREE.Mesh; rightArm: THREE.Mesh; head: THREE.Mesh } {
    const torsoColor = this.isPlayer ? this.MECH_COLORS.torso : this.MECH_COLORS.torsoEnemy;
    const armColor = this.isPlayer ? this.MECH_COLORS.arms : this.MECH_COLORS.armsEnemy;
    const headColor = this.isPlayer ? this.MECH_COLORS.head : this.MECH_COLORS.headEnemy;

    const torsoMaterial = new THREE.MeshStandardMaterial({ 
      color: torsoColor,
      roughness: 0.6,
      metalness: 0.4,
    });

    const armMaterial = new THREE.MeshStandardMaterial({
      color: armColor,
      roughness: 0.6,
      metalness: 0.4,
    });

    const jointMaterial = new THREE.MeshStandardMaterial({
      color: this.MECH_COLORS.joints,
      roughness: 0.4,
      metalness: 0.6,
    });

    const markerMaterial = new THREE.MeshStandardMaterial({
      color: this.MECH_COLORS.marker,
      roughness: 0.5,
      metalness: 0.2,
      emissive: this.MECH_COLORS.marker,
      emissiveIntensity: 0.3,
    });

    const weaponMaterial = new THREE.MeshStandardMaterial({ 
      color: this.MECH_COLORS.weapon,
      roughness: 0.8,
      metalness: 0.2,
    });

    // === CENTER TORSO ===
    const centerTorsoGeo = new THREE.BoxGeometry(2.5, 3, 2);
    const centerTorso = new THREE.Mesh(centerTorsoGeo, torsoMaterial);
    centerTorso.position.y = 1.5;
    centerTorso.castShadow = true;
    centerTorso.receiveShadow = true;
    this.torso.add(centerTorso);
    this.componentMeshes.set(ComponentLocation.CenterTorso, centerTorso);

    // Torso forward direction marker (arrow on chest)
    const torsoMarkerGeo = new THREE.ConeGeometry(0.4, 1.0, 4);
    const torsoMarker = new THREE.Mesh(torsoMarkerGeo, markerMaterial);
    torsoMarker.rotation.x = -Math.PI / 2;
    torsoMarker.position.set(0, 1.5, -1.5);
    this.torso.add(torsoMarker);

    // Chest detail (reactor housing)
    const reactorGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 8);
    const reactorMaterial = new THREE.MeshStandardMaterial({
      color: 0x444444,
      emissive: 0x3366ff,
      emissiveIntensity: 0.5,
    });
    const reactor = new THREE.Mesh(reactorGeo, reactorMaterial);
    reactor.rotation.x = Math.PI / 2;
    reactor.position.set(0, 2.2, -1.05);
    this.torso.add(reactor);

    // === SIDE TORSOS ===
    const sideTorsoGeo = new THREE.BoxGeometry(1.2, 2.5, 1.8);
    
    const leftTorso = new THREE.Mesh(sideTorsoGeo, torsoMaterial);
    leftTorso.position.set(-1.85, 1.5, 0);
    leftTorso.castShadow = true;
    leftTorso.receiveShadow = true;
    this.torso.add(leftTorso);
    this.componentMeshes.set(ComponentLocation.LeftTorso, leftTorso);

    const rightTorso = new THREE.Mesh(sideTorsoGeo, torsoMaterial);
    rightTorso.position.set(1.85, 1.5, 0);
    rightTorso.castShadow = true;
    rightTorso.receiveShadow = true;
    this.torso.add(rightTorso);
    this.componentMeshes.set(ComponentLocation.RightTorso, rightTorso);

    // === HEAD/COCKPIT ===
    const headGeo = new THREE.BoxGeometry(1.6, 1.4, 1.6);
    const headMaterial = new THREE.MeshStandardMaterial({ 
      color: headColor,
      roughness: 0.3,
      metalness: 0.6,
    });
    const head = new THREE.Mesh(headGeo, headMaterial);
    head.position.set(0, 3.7, 0.1);
    head.castShadow = true;
    head.receiveShadow = true;
    this.torso.add(head);
    this.componentMeshes.set(ComponentLocation.Head, head);

    // Cockpit glass (angled)
    const glassGeo = new THREE.BoxGeometry(1.3, 0.7, 0.1);
    const glassMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x88ccff,
      transparent: true,
      opacity: 0.7,
      roughness: 0.1,
      metalness: 0.9,
    });
    const glass = new THREE.Mesh(glassGeo, glassMaterial);
    glass.position.set(0, 3.6, 0.9);
    glass.rotation.x = -0.2;
    this.torso.add(glass);

    // Antenna
    const antennaGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.8, 6);
    const antenna = new THREE.Mesh(antennaGeo, jointMaterial);
    antenna.position.set(0.5, 4.8, 0);
    this.torso.add(antenna);

    // === LEFT ARM (ARTICULATED) ===
    // Shoulder joint
    const shoulderGeo = new THREE.SphereGeometry(0.5, 8, 8);
    const leftShoulder = new THREE.Mesh(shoulderGeo, jointMaterial);
    leftShoulder.position.set(-2.6, 2.6, 0);
    leftShoulder.castShadow = true;
    this.torso.add(leftShoulder);

    // Upper arm
    const upperArmGeo = new THREE.BoxGeometry(0.7, 1.4, 0.7);
    const leftUpperArm = new THREE.Mesh(upperArmGeo, armMaterial);
    leftUpperArm.position.set(-2.6, 1.7, 0);
    leftUpperArm.castShadow = true;
    leftUpperArm.receiveShadow = true;
    this.torso.add(leftUpperArm);

    // Elbow joint
    const elbowGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.5, 8);
    const leftElbow = new THREE.Mesh(elbowGeo, jointMaterial);
    leftElbow.rotation.z = Math.PI / 2;
    leftElbow.position.set(-2.6, 0.9, 0);
    leftElbow.castShadow = true;
    this.torso.add(leftElbow);

    // Lower arm (forearm)
    const lowerArmGeo = new THREE.BoxGeometry(0.6, 1.2, 0.6);
    const leftLowerArm = new THREE.Mesh(lowerArmGeo, armMaterial);
    leftLowerArm.position.set(-2.6, 0.1, 0);
    leftLowerArm.castShadow = true;
    leftLowerArm.receiveShadow = true;
    this.torso.add(leftLowerArm);
    this.componentMeshes.set(ComponentLocation.LeftArm, leftLowerArm);

    // Left weapon mount (laser barrel)
    const laserBarrelGeo = new THREE.CylinderGeometry(0.12, 0.15, 2.2, 8);
    const leftWeapon = new THREE.Mesh(laserBarrelGeo, weaponMaterial);
    leftWeapon.rotation.x = Math.PI / 2;
    leftWeapon.position.set(-2.6, 0.0, -1.3);
    this.torso.add(leftWeapon);

    // Laser housing
    const laserHousingGeo = new THREE.BoxGeometry(0.5, 0.4, 0.8);
    const laserHousing = new THREE.Mesh(laserHousingGeo, weaponMaterial);
    laserHousing.position.set(-2.6, 0.0, -0.6);
    this.torso.add(laserHousing);

    // === RIGHT ARM (ARTICULATED) ===
    // Shoulder joint
    const rightShoulder = new THREE.Mesh(shoulderGeo, jointMaterial);
    rightShoulder.position.set(2.6, 2.6, 0);
    rightShoulder.castShadow = true;
    this.torso.add(rightShoulder);

    // Upper arm
    const rightUpperArm = new THREE.Mesh(upperArmGeo, armMaterial);
    rightUpperArm.position.set(2.6, 1.7, 0);
    rightUpperArm.castShadow = true;
    rightUpperArm.receiveShadow = true;
    this.torso.add(rightUpperArm);

    // Elbow joint
    const rightElbow = new THREE.Mesh(elbowGeo, jointMaterial);
    rightElbow.rotation.z = Math.PI / 2;
    rightElbow.position.set(2.6, 0.9, 0);
    rightElbow.castShadow = true;
    this.torso.add(rightElbow);

    // Lower arm (forearm)
    const rightLowerArm = new THREE.Mesh(lowerArmGeo, armMaterial);
    rightLowerArm.position.set(2.6, 0.1, 0);
    rightLowerArm.castShadow = true;
    rightLowerArm.receiveShadow = true;
    this.torso.add(rightLowerArm);
    this.componentMeshes.set(ComponentLocation.RightArm, rightLowerArm);

    // Right weapon mount (autocannon)
    const acBarrelGeo = new THREE.BoxGeometry(0.35, 0.35, 2.8);
    const rightWeapon = new THREE.Mesh(acBarrelGeo, weaponMaterial);
    rightWeapon.position.set(2.6, 0.0, -1.6);
    this.torso.add(rightWeapon);

    // Autocannon housing/ammo feed
    const acHousingGeo = new THREE.BoxGeometry(0.6, 0.5, 0.8);
    const acHousing = new THREE.Mesh(acHousingGeo, weaponMaterial);
    acHousing.position.set(2.6, 0.0, -0.5);
    this.torso.add(acHousing);

    // Ammo drum on side torso
    const ammoDrumGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.8, 8);
    const ammoDrum = new THREE.Mesh(ammoDrumGeo, weaponMaterial);
    ammoDrum.rotation.z = Math.PI / 2;
    ammoDrum.position.set(2.0, 0.8, -0.5);
    this.torso.add(ammoDrum);

    return { leftArm: leftLowerArm, rightArm: rightLowerArm, head };
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
    // Laser barrel tip position (adjusted for new articulated arm)
    const pos = new THREE.Vector3(-2.6, 4.0, -2.4);
    pos.applyQuaternion(this.torso.getWorldQuaternion(new THREE.Quaternion()));
    pos.add(this.mesh.position);
    return pos;
  }

  getRightWeaponPosition(): THREE.Vector3 {
    // Autocannon barrel tip position (adjusted for new articulated arm)
    const pos = new THREE.Vector3(2.6, 4.0, -3.0);
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
    // Adjusted for new head position
    const pos = new THREE.Vector3(0, 3.8, 0.6);
    this.torso.localToWorld(pos);
    return pos;
  }

  // Update walk animation based on velocity
  updateWalkAnimation(dt: number): void {
    const speed = this.velocity.length();
    const speedRatio = speed / this.maxSpeed;
    
    // Minimum speed to animate (prevents twitching when nearly stopped)
    if (speed < 0.5) {
      // Smoothly return to neutral pose
      this.leftLegPivot.rotation.x *= 0.9;
      this.leftKneePivot.rotation.x *= 0.9;
      this.leftAnklePivot.rotation.x *= 0.9;
      this.rightLegPivot.rotation.x *= 0.9;
      this.rightKneePivot.rotation.x *= 0.9;
      this.rightAnklePivot.rotation.x *= 0.9;
      return;
    }
    
    // Advance walk cycle based on speed
    this.walkCyclePhase += dt * this.walkCycleSpeed * speedRatio;
    if (this.walkCyclePhase > Math.PI * 2) {
      this.walkCyclePhase -= Math.PI * 2;
    }
    
    // Calculate leg swing angles (left and right are opposite phase)
    const leftPhase = this.walkCyclePhase;
    const rightPhase = this.walkCyclePhase + Math.PI;
    
    // Hip rotation (swing leg forward/back)
    const leftHipAngle = Math.sin(leftPhase) * this.hipSwingAngle * speedRatio;
    const rightHipAngle = Math.sin(rightPhase) * this.hipSwingAngle * speedRatio;
    
    // Knee bend (more bend when leg is forward, straighten when back)
    // Knee only bends backward (positive X rotation)
    const leftKneeAngle = (Math.sin(leftPhase - 0.5) * 0.5 + 0.5) * this.kneeSwingAngle * speedRatio;
    const rightKneeAngle = (Math.sin(rightPhase - 0.5) * 0.5 + 0.5) * this.kneeSwingAngle * speedRatio;
    
    // Ankle compensation (keeps foot roughly level)
    const leftAnkleAngle = -leftHipAngle * 0.5 - leftKneeAngle * 0.3;
    const rightAnkleAngle = -rightHipAngle * 0.5 - rightKneeAngle * 0.3;
    
    // Apply rotations
    this.leftLegPivot.rotation.x = leftHipAngle;
    this.leftKneePivot.rotation.x = leftKneeAngle;
    this.leftAnklePivot.rotation.x = leftAnkleAngle;
    
    this.rightLegPivot.rotation.x = rightHipAngle;
    this.rightKneePivot.rotation.x = rightKneeAngle;
    this.rightAnklePivot.rotation.x = rightAnkleAngle;
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


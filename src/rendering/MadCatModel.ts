import * as THREE from 'three';
import { MECH_CONSTANTS } from '../config/MechConfigs';
import { ANIMATION_CONFIG } from '../config/AnimationConfig';

/**
 * Mad Cat (Timber Wolf) mech model
 * Distinctive features: Forward-leaning stance, prominent missile pods,
 * angular design, reverse-jointed legs
 */
export class MadCatModel {
  public mesh: THREE.Group;
  public torsoGroup: THREE.Group;
  public headGroup: THREE.Group;
  public leftArmGroup: THREE.Group;
  public rightArmGroup: THREE.Group;
  public leftLegGroup: THREE.Group;
  public rightLegGroup: THREE.Group;

  public leftFootTarget: THREE.Vector3 = new THREE.Vector3();
  public rightFootTarget: THREE.Vector3 = new THREE.Vector3();

  private armPitch: number = 0;
  private materials: Map<string, THREE.MeshStandardMaterial> = new Map();

  constructor() {
    this.mesh = new THREE.Group();
    this.mesh.name = 'MadCat';

    this.createMaterials();

    this.torsoGroup = this.createTorso();
    this.headGroup = this.createHead();
    this.leftArmGroup = this.createArm('left');
    this.rightArmGroup = this.createArm('right');
    this.leftLegGroup = this.createLeg('left');
    this.rightLegGroup = this.createLeg('right');

    this.mesh.add(this.torsoGroup);
    this.torsoGroup.add(this.headGroup);
    this.torsoGroup.add(this.leftArmGroup);
    this.torsoGroup.add(this.rightArmGroup);
    this.mesh.add(this.leftLegGroup);
    this.mesh.add(this.rightLegGroup);

    // Position parts - Mad Cat has forward lean
    this.headGroup.position.set(0, 2.0, 0.3);
    this.leftArmGroup.position.set(-2.0, 0.8, 0.5);
    this.rightArmGroup.position.set(2.0, 0.8, 0.5);
    this.leftLegGroup.position.set(-1.2, 3.5, 0);
    this.rightLegGroup.position.set(1.2, 3.5, 0);
    this.torsoGroup.position.set(0, 5.5, 0);

    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }

  private createMaterials(): void {
    // Main armor - olive green military
    const armorMain = new THREE.MeshStandardMaterial({
      color: 0x5a6b4a,
      roughness: 0.7,
      metalness: 0.3,
      flatShading: true,
      emissive: 0x2a3520,
      emissiveIntensity: 0.25,
    });
    this.materials.set('armor', armorMain);

    // Secondary armor - tan/khaki
    const armorSecondary = new THREE.MeshStandardMaterial({
      color: 0x8b7d5c,
      roughness: 0.7,
      metalness: 0.2,
      flatShading: true,
      emissive: 0x453e2e,
      emissiveIntensity: 0.2,
    });
    this.materials.set('armorSecondary', armorSecondary);

    // Joint/mechanical parts
    const joint = new THREE.MeshStandardMaterial({
      color: 0x4a4a4a,
      roughness: 0.5,
      metalness: 0.5,
      flatShading: true,
      emissive: 0x222222,
      emissiveIntensity: 0.15,
    });
    this.materials.set('joint', joint);

    // Accent - bright red warning
    const accent = new THREE.MeshStandardMaterial({
      color: 0xcc2200,
      roughness: 0.4,
      metalness: 0.5,
      emissive: 0xaa1100,
      emissiveIntensity: 0.5,
      flatShading: true,
    });
    this.materials.set('accent', accent);

    // Cockpit glass - amber/gold
    const glass = new THREE.MeshStandardMaterial({
      color: 0xffaa00,
      roughness: 0.1,
      metalness: 0.9,
      emissive: 0xff8800,
      emissiveIntensity: 0.7,
      flatShading: true,
    });
    this.materials.set('glass', glass);

    // Weapon - dark gunmetal
    const weapon = new THREE.MeshStandardMaterial({
      color: 0x3a3a3a,
      roughness: 0.3,
      metalness: 0.7,
      flatShading: true,
      emissive: 0x111111,
      emissiveIntensity: 0.1,
    });
    this.materials.set('weapon', weapon);

    // Missile pods - distinct color
    const missile = new THREE.MeshStandardMaterial({
      color: 0x6b5b4a,
      roughness: 0.6,
      metalness: 0.4,
      flatShading: true,
      emissive: 0x332b22,
      emissiveIntensity: 0.2,
    });
    this.materials.set('missile', missile);
  }

  private createTorso(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'Torso';

    // Main torso - angular, forward-leaning design
    const torsoGeom = new THREE.BoxGeometry(3.5, 2.5, 3);
    const positions = torsoGeom.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const y = positions.getY(i);
      const z = positions.getZ(i);
      // Taper top
      if (y > 0) {
        positions.setX(i, positions.getX(i) * 0.75);
        positions.setZ(i, z * 0.85);
      }
      // Angle front more aggressively
      if (z > 0) {
        positions.setY(i, y + z * 0.15);
      }
    }
    torsoGeom.computeVertexNormals();

    const torso = new THREE.Mesh(torsoGeom, this.materials.get('armor'));
    group.add(torso);

    // Angular chest plate
    const chestGeom = new THREE.BoxGeometry(2.5, 1.5, 0.4);
    const chest = new THREE.Mesh(
      chestGeom,
      this.materials.get('armorSecondary')
    );
    chest.position.set(0, 0.3, 1.6);
    chest.rotation.x = -0.2;
    group.add(chest);

    // Missile pods on shoulders (distinctive Mad Cat feature)
    for (let side = -1; side <= 1; side += 2) {
      const podGroup = new THREE.Group();

      // Pod housing
      const podGeom = new THREE.BoxGeometry(1.2, 1.8, 1.5);
      const pod = new THREE.Mesh(podGeom, this.materials.get('missile'));
      podGroup.add(pod);

      // Missile tubes (2x3 array)
      const tubeGeom = new THREE.CylinderGeometry(0.12, 0.12, 0.4, 6);
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 2; col++) {
          const tube = new THREE.Mesh(tubeGeom, this.materials.get('joint'));
          tube.rotation.x = Math.PI / 2;
          tube.position.set(-0.2 + col * 0.4, 0.5 - row * 0.4, 0.85);
          podGroup.add(tube);
        }
      }

      podGroup.position.set(side * 2.3, 1.5, -0.2);
      podGroup.rotation.z = side * -0.1;
      group.add(podGroup);
    }

    // Back thrusters
    for (let i = -1; i <= 1; i += 2) {
      const thrusterGeom = new THREE.CylinderGeometry(0.3, 0.4, 0.8, 6);
      const thruster = new THREE.Mesh(
        thrusterGeom,
        this.materials.get('joint')
      );
      thruster.position.set(i * 0.8, 0.5, -1.8);
      thruster.rotation.x = Math.PI / 2;
      group.add(thruster);
    }

    return group;
  }

  private createHead(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'Head';

    // Sleek, angular cockpit
    const headGeom = new THREE.BoxGeometry(1.4, 1.0, 1.8);
    const positions = headGeom.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const y = positions.getY(i);
      const z = positions.getZ(i);
      // Sharp angle at front
      if (z > 0) {
        positions.setY(i, y * 0.6);
        positions.setX(i, positions.getX(i) * 0.7);
      }
      // Taper top
      if (y > 0) {
        positions.setX(i, positions.getX(i) * 0.8);
      }
    }
    headGeom.computeVertexNormals();

    const head = new THREE.Mesh(headGeom, this.materials.get('armor'));
    group.add(head);

    // Angular visor
    const visorGeom = new THREE.BoxGeometry(1.0, 0.35, 0.5);
    const visor = new THREE.Mesh(visorGeom, this.materials.get('glass'));
    visor.position.set(0, 0, 0.75);
    visor.rotation.x = -0.2;
    group.add(visor);

    // Twin antennae
    for (let side = -1; side <= 1; side += 2) {
      const antennaGeom = new THREE.CylinderGeometry(0.04, 0.06, 0.6, 4);
      const antenna = new THREE.Mesh(antennaGeom, this.materials.get('accent'));
      antenna.position.set(side * 0.5, 0.6, -0.4);
      antenna.rotation.z = side * 0.15;
      group.add(antenna);
    }

    return group;
  }

  private createArm(side: 'left' | 'right'): THREE.Group {
    const group = new THREE.Group();
    group.name = side === 'left' ? 'LeftArm' : 'RightArm';
    const mirror = side === 'left' ? 1 : -1;

    // Upper arm - angular
    const upperArmGeom = new THREE.BoxGeometry(0.7, 1.8, 0.7);
    const upperArm = new THREE.Mesh(upperArmGeom, this.materials.get('armor'));
    upperArm.position.set(mirror * 0.15, -0.9, 0);
    group.add(upperArm);

    // Elbow
    const elbowGeom = new THREE.SphereGeometry(0.35, 6, 6);
    const elbow = new THREE.Mesh(elbowGeom, this.materials.get('joint'));
    elbow.position.set(mirror * 0.15, -2.0, 0);
    group.add(elbow);

    // Lower arm / weapon housing - large laser pod
    const lowerArmGeom = new THREE.BoxGeometry(0.9, 2.2, 1.0);
    const lowerPositions = lowerArmGeom.attributes.position;
    for (let i = 0; i < lowerPositions.count; i++) {
      const y = lowerPositions.getY(i);
      if (y < 0) {
        lowerPositions.setX(i, lowerPositions.getX(i) * 0.75);
        lowerPositions.setZ(i, lowerPositions.getZ(i) * 0.8);
      }
    }
    lowerArmGeom.computeVertexNormals();

    const lowerArm = new THREE.Mesh(
      lowerArmGeom,
      this.materials.get('armorSecondary')
    );
    lowerArm.position.set(mirror * 0.15, -3.4, 0);
    group.add(lowerArm);

    // Twin laser barrels
    for (let offset = -0.15; offset <= 0.15; offset += 0.3) {
      const barrelGeom = new THREE.CylinderGeometry(0.1, 0.12, 1.8, 6);
      const barrel = new THREE.Mesh(barrelGeom, this.materials.get('weapon'));
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(mirror * 0.15 + offset, -4.0, 1.1);
      group.add(barrel);
    }

    return group;
  }

  private createLeg(side: 'left' | 'right'): THREE.Group {
    const group = new THREE.Group();
    group.name = side === 'left' ? 'LeftLeg' : 'RightLeg';

    // Hip
    const hipGeom = new THREE.SphereGeometry(0.55, 6, 6);
    const hip = new THREE.Mesh(hipGeom, this.materials.get('joint'));
    group.add(hip);

    // Upper leg - more angular
    const thighGeom = new THREE.BoxGeometry(0.9, 2.2, 1.1);
    const thighPositions = thighGeom.attributes.position;
    for (let i = 0; i < thighPositions.count; i++) {
      const y = thighPositions.getY(i);
      if (y < 0) {
        thighPositions.setX(i, thighPositions.getX(i) * 0.75);
      }
    }
    thighGeom.computeVertexNormals();

    const thigh = new THREE.Mesh(thighGeom, this.materials.get('armor'));
    thigh.position.set(0, -1.4, 0);
    group.add(thigh);

    // Knee - larger, more prominent
    const kneeGeom = new THREE.BoxGeometry(0.7, 0.7, 0.8);
    const knee = new THREE.Mesh(kneeGeom, this.materials.get('armorSecondary'));
    knee.position.set(0, -2.7, 0.1);
    group.add(knee);

    // Lower leg - distinctive reverse-joint
    const shinGeom = new THREE.BoxGeometry(0.8, 2.8, 1.0);
    const shinPositions = shinGeom.attributes.position;
    for (let i = 0; i < shinPositions.count; i++) {
      const y = shinPositions.getY(i);
      const z = shinPositions.getZ(i);
      if (y < 0) {
        shinPositions.setZ(i, z - 0.5);
        shinPositions.setX(i, shinPositions.getX(i) * 0.7);
      }
    }
    shinGeom.computeVertexNormals();

    const shin = new THREE.Mesh(shinGeom, this.materials.get('armor'));
    shin.position.set(0, -4.3, 0.3);
    group.add(shin);

    // Ankle
    const ankleGeom = new THREE.CylinderGeometry(0.2, 0.25, 0.35, 6);
    const ankle = new THREE.Mesh(ankleGeom, this.materials.get('joint'));
    ankle.position.set(0, -5.5, 0.6);
    group.add(ankle);

    // Foot - bird-like
    const footGeom = new THREE.BoxGeometry(1.0, 0.35, 2.2);
    const footPositions = footGeom.attributes.position;
    for (let i = 0; i < footPositions.count; i++) {
      const z = footPositions.getZ(i);
      if (z > 0) {
        footPositions.setX(i, footPositions.getX(i) * 0.5);
      }
    }
    footGeom.computeVertexNormals();

    const foot = new THREE.Mesh(footGeom, this.materials.get('armorSecondary'));
    foot.position.set(0, -5.85, 0.9);
    group.add(foot);

    // Toe claws
    for (let i = -1; i <= 1; i += 2) {
      const clawGeom = new THREE.BoxGeometry(0.12, 0.15, 0.5);
      const claw = new THREE.Mesh(clawGeom, this.materials.get('joint'));
      claw.position.set(i * 0.25, -5.9, 2.1);
      claw.rotation.x = 0.25;
      group.add(claw);
    }

    return group;
  }

  setTorsoRotation(worldYaw: number): void {
    const desiredWorldQuat = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      worldYaw
    );
    const parentWorldQuat = new THREE.Quaternion();
    this.mesh.getWorldQuaternion(parentWorldQuat);
    const parentInverse = parentWorldQuat.clone().invert();
    const localQuat = parentInverse.clone().multiply(desiredWorldQuat);
    this.torsoGroup.quaternion.copy(localQuat);
  }

  setHeadPitch(pitch: number): void {
    const clampedPitch = Math.max(
      -MECH_CONSTANTS.HEAD_PITCH.max,
      Math.min(-MECH_CONSTANTS.HEAD_PITCH.min, -pitch)
    );
    this.headGroup.rotation.x = clampedPitch;
    this.armPitch = clampedPitch;
  }

  animateWalk(time: number, speed: number): void {
    const { WALK, TORSO_BASE_Y } = ANIMATION_CONFIG;

    const clampedSpeed = Math.max(
      0,
      Math.min(speed, WALK.maxSpeedForAnimation)
    );
    const animationRate = WALK.rateMultiplier * Math.sqrt(clampedSpeed);
    const walkCycle = time * animationRate;

    const legSwingAmplitude =
      WALK.legSwingAmplitude * Math.min(clampedSpeed, 1);
    const legSwing = Math.sin(walkCycle) * legSwingAmplitude;

    const bobAmount =
      Math.abs(Math.sin(walkCycle * 2)) *
      WALK.bodyBobAmplitude *
      Math.min(clampedSpeed, 1);

    this.leftLegGroup.rotation.x = legSwing;
    this.rightLegGroup.rotation.x = -legSwing;
    this.torsoGroup.position.y = TORSO_BASE_Y + bobAmount;
    this.torsoGroup.rotation.z =
      Math.sin(walkCycle) * WALK.torsoSwayAmplitude * Math.min(clampedSpeed, 1);

    this.leftArmGroup.rotation.x =
      this.armPitch + -legSwing * WALK.armCounterSwing;
    this.rightArmGroup.rotation.x =
      this.armPitch + legSwing * WALK.armCounterSwing;
  }

  resetPose(): void {
    this.leftLegGroup.rotation.x = 0;
    this.rightLegGroup.rotation.x = 0;
    this.torsoGroup.position.y = ANIMATION_CONFIG.TORSO_BASE_Y;
    this.torsoGroup.rotation.z = 0;
    this.leftArmGroup.rotation.x = this.armPitch;
    this.rightArmGroup.rotation.x = this.armPitch;
  }

  getWeaponPosition(slot: number): THREE.Vector3 {
    const worldPos = new THREE.Vector3();
    const localOffset = new THREE.Vector3();
    let sourceGroup: THREE.Group;

    switch (slot) {
      case 1:
        sourceGroup = this.leftArmGroup;
        localOffset.set(0, -4.0, 1.8);
        break;
      case 2:
        sourceGroup = this.rightArmGroup;
        localOffset.set(0, -4.0, 1.8);
        break;
      case 3:
        sourceGroup = this.torsoGroup;
        localOffset.set(-2.3, 2.2, 0.8);
        break;
      case 4:
        sourceGroup = this.torsoGroup;
        localOffset.set(2.3, 2.2, 0.8);
        break;
      default:
        sourceGroup = this.torsoGroup;
        localOffset.set(0, 0, 1.0);
    }

    sourceGroup.getWorldPosition(worldPos);
    const worldQuat = new THREE.Quaternion();
    sourceGroup.getWorldQuaternion(worldQuat);
    localOffset.applyQuaternion(worldQuat);
    worldPos.add(localOffset);

    return worldPos;
  }

  getCockpitPosition(): THREE.Vector3 {
    const worldPos = new THREE.Vector3();
    this.headGroup.getWorldPosition(worldPos);
    worldPos.z += 0.6;
    return worldPos;
  }

  dispose(): void {
    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
      }
    });
    for (const material of this.materials.values()) {
      material.dispose();
    }
  }
}

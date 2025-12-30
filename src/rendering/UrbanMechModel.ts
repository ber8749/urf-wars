import * as THREE from 'three';
import { MECH_CONSTANTS } from '../config/MechConfigs';
import { ANIMATION_CONFIG } from '../config/AnimationConfig';

/**
 * UrbanMech model
 * Distinctive features: Round/cylindrical body, short stumpy legs,
 * single large autocannon arm, industrial appearance
 */
export class UrbanMechModel {
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
    this.mesh.name = 'UrbanMech';

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

    // Position parts - UrbanMech is short and squat
    this.headGroup.position.set(0, 2.0, 0);
    this.leftArmGroup.position.set(-1.8, 0.5, 0);
    this.rightArmGroup.position.set(1.8, 0.5, 0);
    this.leftLegGroup.position.set(-0.9, 3.0, 0);
    this.rightLegGroup.position.set(0.9, 3.0, 0);
    this.torsoGroup.position.set(0, 5.5, 0);

    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }

  private createMaterials(): void {
    // Main armor - industrial yellow
    const armorMain = new THREE.MeshStandardMaterial({
      color: 0xd4a520,
      roughness: 0.6,
      metalness: 0.3,
      flatShading: true,
      emissive: 0x6a5210,
      emissiveIntensity: 0.25,
    });
    this.materials.set('armor', armorMain);

    // Secondary armor - dark gray/black stripes
    const armorSecondary = new THREE.MeshStandardMaterial({
      color: 0x2a2a2a,
      roughness: 0.7,
      metalness: 0.4,
      flatShading: true,
      emissive: 0x111111,
      emissiveIntensity: 0.15,
    });
    this.materials.set('armorSecondary', armorSecondary);

    // Joint/mechanical parts
    const joint = new THREE.MeshStandardMaterial({
      color: 0x555555,
      roughness: 0.5,
      metalness: 0.5,
      flatShading: true,
      emissive: 0x222222,
      emissiveIntensity: 0.15,
    });
    this.materials.set('joint', joint);

    // Accent - warning red/orange
    const accent = new THREE.MeshStandardMaterial({
      color: 0xff4400,
      roughness: 0.4,
      metalness: 0.4,
      emissive: 0xcc2200,
      emissiveIntensity: 0.5,
      flatShading: true,
    });
    this.materials.set('accent', accent);

    // Cockpit glass - green HUD
    const glass = new THREE.MeshStandardMaterial({
      color: 0x44ff44,
      roughness: 0.1,
      metalness: 0.9,
      emissive: 0x22cc22,
      emissiveIntensity: 0.8,
      flatShading: true,
    });
    this.materials.set('glass', glass);

    // Weapon - heavy gunmetal
    const weapon = new THREE.MeshStandardMaterial({
      color: 0x4a4a4a,
      roughness: 0.4,
      metalness: 0.6,
      flatShading: true,
      emissive: 0x1a1a1a,
      emissiveIntensity: 0.1,
    });
    this.materials.set('weapon', weapon);
  }

  private createTorso(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'Torso';

    // Main body - cylindrical "trash can" design
    const bodyGeom = new THREE.CylinderGeometry(1.8, 2.0, 3.5, 8);
    const body = new THREE.Mesh(bodyGeom, this.materials.get('armor'));
    group.add(body);

    // Hazard stripes band
    const stripeGeom = new THREE.CylinderGeometry(2.05, 2.05, 0.4, 8);
    const stripe = new THREE.Mesh(
      stripeGeom,
      this.materials.get('armorSecondary')
    );
    stripe.position.set(0, -0.8, 0);
    group.add(stripe);

    // Top rim
    const rimGeom = new THREE.TorusGeometry(1.7, 0.15, 6, 8);
    const rim = new THREE.Mesh(rimGeom, this.materials.get('joint'));
    rim.rotation.x = Math.PI / 2;
    rim.position.set(0, 1.8, 0);
    group.add(rim);

    // Exhaust pipes on back
    for (let i = -1; i <= 1; i += 2) {
      const pipeGeom = new THREE.CylinderGeometry(0.2, 0.25, 1.2, 6);
      const pipe = new THREE.Mesh(pipeGeom, this.materials.get('joint'));
      pipe.position.set(i * 0.6, 0.5, -1.9);
      group.add(pipe);

      // Smoke cap
      const capGeom = new THREE.CylinderGeometry(0.28, 0.2, 0.2, 6);
      const cap = new THREE.Mesh(capGeom, this.materials.get('armorSecondary'));
      cap.position.set(i * 0.6, 1.2, -1.9);
      group.add(cap);
    }

    // Armor plates/rivets for industrial look
    const rivetGeom = new THREE.SphereGeometry(0.08, 4, 4);
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 3) {
      for (let h = -1; h <= 1; h++) {
        const rivet = new THREE.Mesh(rivetGeom, this.materials.get('joint'));
        rivet.position.set(
          Math.sin(angle) * 2.0,
          h * 0.8,
          Math.cos(angle) * 2.0
        );
        group.add(rivet);
      }
    }

    return group;
  }

  private createHead(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'Head';

    // Dome head - simple rounded top
    const headGeom = new THREE.SphereGeometry(
      1.2,
      8,
      6,
      0,
      Math.PI * 2,
      0,
      Math.PI / 2
    );
    const head = new THREE.Mesh(headGeom, this.materials.get('armor'));
    head.position.set(0, 0, 0);
    group.add(head);

    // Visor band wrapping around
    const visorGeom = new THREE.TorusGeometry(1.0, 0.2, 6, 8, Math.PI);
    const visor = new THREE.Mesh(visorGeom, this.materials.get('glass'));
    visor.rotation.x = Math.PI / 2;
    visor.rotation.z = Math.PI;
    visor.position.set(0, 0.3, 0.4);
    group.add(visor);

    // Single searchlight on top
    const lightGeom = new THREE.CylinderGeometry(0.15, 0.2, 0.3, 6);
    const light = new THREE.Mesh(lightGeom, this.materials.get('accent'));
    light.position.set(0, 0.8, 0);
    group.add(light);

    // Warning beacon base
    const beaconBaseGeom = new THREE.CylinderGeometry(0.25, 0.25, 0.15, 8);
    const beaconBase = new THREE.Mesh(
      beaconBaseGeom,
      this.materials.get('armorSecondary')
    );
    beaconBase.position.set(0, 0.95, 0);
    group.add(beaconBase);

    return group;
  }

  private createArm(side: 'left' | 'right'): THREE.Group {
    const group = new THREE.Group();
    group.name = side === 'left' ? 'LeftArm' : 'RightArm';

    if (side === 'right') {
      // Right arm - MASSIVE autocannon

      // Shoulder mount
      const shoulderGeom = new THREE.CylinderGeometry(0.5, 0.5, 0.6, 6);
      const shoulder = new THREE.Mesh(
        shoulderGeom,
        this.materials.get('joint')
      );
      shoulder.rotation.z = Math.PI / 2;
      shoulder.position.set(0.3, 0, 0);
      group.add(shoulder);

      // Autocannon housing
      const housingGeom = new THREE.BoxGeometry(1.4, 2.8, 1.4);
      const housing = new THREE.Mesh(housingGeom, this.materials.get('armor'));
      housing.position.set(0.4, -1.8, 0);
      group.add(housing);

      // Giant barrel
      const barrelGeom = new THREE.CylinderGeometry(0.4, 0.45, 3.0, 8);
      const barrel = new THREE.Mesh(barrelGeom, this.materials.get('weapon'));
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0.4, -2.5, 1.8);
      group.add(barrel);

      // Barrel shroud/heat sink
      const shroudGeom = new THREE.CylinderGeometry(0.55, 0.5, 1.0, 8);
      const shroud = new THREE.Mesh(
        shroudGeom,
        this.materials.get('armorSecondary')
      );
      shroud.rotation.x = Math.PI / 2;
      shroud.position.set(0.4, -2.5, 0.8);
      group.add(shroud);

      // Ammo feed
      const feedGeom = new THREE.BoxGeometry(0.4, 1.5, 0.3);
      const feed = new THREE.Mesh(feedGeom, this.materials.get('joint'));
      feed.position.set(0.9, -1.5, -0.6);
      group.add(feed);
    } else {
      // Left arm - smaller utility/laser arm

      // Shoulder
      const shoulderGeom = new THREE.CylinderGeometry(0.4, 0.4, 0.5, 6);
      const shoulder = new THREE.Mesh(
        shoulderGeom,
        this.materials.get('joint')
      );
      shoulder.rotation.z = Math.PI / 2;
      shoulder.position.set(-0.2, 0, 0);
      group.add(shoulder);

      // Simple arm segment
      const armGeom = new THREE.BoxGeometry(0.8, 2.0, 0.7);
      const arm = new THREE.Mesh(armGeom, this.materials.get('armor'));
      arm.position.set(-0.2, -1.3, 0);
      group.add(arm);

      // Small laser barrel
      const laserGeom = new THREE.CylinderGeometry(0.12, 0.15, 1.2, 6);
      const laser = new THREE.Mesh(laserGeom, this.materials.get('weapon'));
      laser.rotation.x = Math.PI / 2;
      laser.position.set(-0.2, -2.0, 0.8);
      group.add(laser);

      // Utility claw/hand
      for (let i = -1; i <= 1; i += 2) {
        const clawGeom = new THREE.BoxGeometry(0.15, 0.4, 0.3);
        const claw = new THREE.Mesh(clawGeom, this.materials.get('joint'));
        claw.position.set(-0.2 + i * 0.25, -2.5, 0.3);
        claw.rotation.x = 0.3;
        group.add(claw);
      }
    }

    return group;
  }

  private createLeg(side: 'left' | 'right'): THREE.Group {
    const group = new THREE.Group();
    group.name = side === 'left' ? 'LeftLeg' : 'RightLeg';

    // Hip - simple cylinder
    const hipGeom = new THREE.CylinderGeometry(0.45, 0.45, 0.5, 6);
    const hip = new THREE.Mesh(hipGeom, this.materials.get('joint'));
    hip.rotation.z = Math.PI / 2;
    group.add(hip);

    // Stubby upper leg
    const thighGeom = new THREE.BoxGeometry(0.9, 1.5, 0.9);
    const thigh = new THREE.Mesh(thighGeom, this.materials.get('armor'));
    thigh.position.set(0, -1.0, 0);
    group.add(thigh);

    // Knee joint
    const kneeGeom = new THREE.CylinderGeometry(0.35, 0.35, 0.5, 6);
    const knee = new THREE.Mesh(kneeGeom, this.materials.get('joint'));
    knee.rotation.z = Math.PI / 2;
    knee.position.set(0, -1.9, 0);
    group.add(knee);

    // Lower leg - short and thick
    const shinGeom = new THREE.BoxGeometry(0.8, 1.8, 0.9);
    const shin = new THREE.Mesh(shinGeom, this.materials.get('armor'));
    shin.position.set(0, -3.0, 0.1);
    group.add(shin);

    // Ankle piston
    const ankleGeom = new THREE.CylinderGeometry(0.15, 0.2, 0.5, 6);
    const ankle = new THREE.Mesh(ankleGeom, this.materials.get('joint'));
    ankle.position.set(0, -4.0, 0.3);
    group.add(ankle);

    // Big flat foot
    const footGeom = new THREE.BoxGeometry(1.3, 0.4, 1.8);
    const foot = new THREE.Mesh(footGeom, this.materials.get('armorSecondary'));
    foot.position.set(0, -4.4, 0.4);
    group.add(foot);

    // Foot tread/grip pads
    for (let i = -0.5; i <= 0.5; i += 0.5) {
      const padGeom = new THREE.BoxGeometry(1.2, 0.1, 0.25);
      const pad = new THREE.Mesh(padGeom, this.materials.get('joint'));
      pad.position.set(0, -4.65, 0.2 + i * 0.5);
      group.add(pad);
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
    // UrbanMech has a waddling gait - slightly slower animation
    const animationRate = WALK.rateMultiplier * 0.8 * Math.sqrt(clampedSpeed);
    const walkCycle = time * animationRate;

    // Shorter leg swing for stubby legs
    const legSwingAmplitude =
      WALK.legSwingAmplitude * 0.7 * Math.min(clampedSpeed, 1);
    const legSwing = Math.sin(walkCycle) * legSwingAmplitude;

    // More pronounced body bob for the waddling effect
    const bobAmount =
      Math.abs(Math.sin(walkCycle * 2)) *
      WALK.bodyBobAmplitude *
      1.3 *
      Math.min(clampedSpeed, 1);

    this.leftLegGroup.rotation.x = legSwing;
    this.rightLegGroup.rotation.x = -legSwing;
    this.torsoGroup.position.y = TORSO_BASE_Y + bobAmount;

    // More side-to-side sway for the waddle
    this.torsoGroup.rotation.z =
      Math.sin(walkCycle) *
      WALK.torsoSwayAmplitude *
      1.5 *
      Math.min(clampedSpeed, 1);

    this.leftArmGroup.rotation.x =
      this.armPitch + -legSwing * WALK.armCounterSwing * 0.5;
    this.rightArmGroup.rotation.x =
      this.armPitch + legSwing * WALK.armCounterSwing * 0.5;
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
      case 1: // Big autocannon on right arm
        sourceGroup = this.rightArmGroup;
        localOffset.set(0.4, -2.5, 3.0);
        break;
      case 2: // Small laser on left arm
        sourceGroup = this.leftArmGroup;
        localOffset.set(-0.2, -2.0, 1.2);
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
    worldPos.z += 0.4;
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

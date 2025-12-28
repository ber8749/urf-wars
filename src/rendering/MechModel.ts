import * as THREE from 'three';

// Procedurally generated mech geometry in a retro low-poly style
// Inspired by MechWarrior 2 and Earth Siege aesthetics

export class MechModel {
  public mesh: THREE.Group;
  public torsoGroup: THREE.Group;
  public headGroup: THREE.Group;
  public leftArmGroup: THREE.Group;
  public rightArmGroup: THREE.Group;
  public leftLegGroup: THREE.Group;
  public rightLegGroup: THREE.Group;

  // For animation
  public leftFootTarget: THREE.Vector3 = new THREE.Vector3();
  public rightFootTarget: THREE.Vector3 = new THREE.Vector3();

  // Track arm pitch for aiming (separate from walk animation)
  private armPitch: number = 0;

  private materials: Map<string, THREE.MeshStandardMaterial> = new Map();

  constructor() {
    this.mesh = new THREE.Group();
    this.mesh.name = 'Mech';

    // Create materials
    this.createMaterials();

    // Build mech parts
    this.torsoGroup = this.createTorso();
    this.headGroup = this.createHead();
    this.leftArmGroup = this.createArm('left');
    this.rightArmGroup = this.createArm('right');
    this.leftLegGroup = this.createLeg('left');
    this.rightLegGroup = this.createLeg('right');

    // Assemble mech
    this.mesh.add(this.torsoGroup);
    this.torsoGroup.add(this.headGroup);
    this.torsoGroup.add(this.leftArmGroup);
    this.torsoGroup.add(this.rightArmGroup);
    this.mesh.add(this.leftLegGroup);
    this.mesh.add(this.rightLegGroup);

    // Position parts
    this.headGroup.position.set(0, 2.5, 0);
    this.leftArmGroup.position.set(-2.2, 1.5, 0);
    this.rightArmGroup.position.set(2.2, 1.5, 0);
    // Legs attach below the torso (torso bottom is at Y=4.0, hip radius is 0.5)
    this.leftLegGroup.position.set(-1.0, 3.5, 0);
    this.rightLegGroup.position.set(1.0, 3.5, 0);
    this.torsoGroup.position.set(0, 5.5, 0);

    // Enable shadows
    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }

  private createMaterials(): void {
    // Main armor - bright steel blue (high visibility!)
    const armorMain = new THREE.MeshStandardMaterial({
      color: 0x7799bb,
      roughness: 0.5,
      metalness: 0.6,
      flatShading: true,
      emissive: 0x223344,
      emissiveIntensity: 0.15,
    });
    this.materials.set('armor', armorMain);

    // Secondary armor - lighter gray-blue
    const armorSecondary = new THREE.MeshStandardMaterial({
      color: 0x99aabb,
      roughness: 0.6,
      metalness: 0.4,
      flatShading: true,
      emissive: 0x334455,
      emissiveIntensity: 0.1,
    });
    this.materials.set('armorSecondary', armorSecondary);

    // Joint/mechanical parts - visible dark gray
    const joint = new THREE.MeshStandardMaterial({
      color: 0x556677,
      roughness: 0.4,
      metalness: 0.7,
      flatShading: true,
    });
    this.materials.set('joint', joint);

    // Accent color - bright warning orange (glowing)
    const accent = new THREE.MeshStandardMaterial({
      color: 0xff8800,
      roughness: 0.4,
      metalness: 0.5,
      emissive: 0xff4400,
      emissiveIntensity: 0.6,
      flatShading: true,
    });
    this.materials.set('accent', accent);

    // Cockpit glass - bright cyan glow
    const glass = new THREE.MeshStandardMaterial({
      color: 0x00ffee,
      roughness: 0.1,
      metalness: 0.9,
      emissive: 0x00ffcc,
      emissiveIntensity: 0.8,
      flatShading: true,
    });
    this.materials.set('glass', glass);

    // Weapon barrel - metallic
    const weapon = new THREE.MeshStandardMaterial({
      color: 0x667788,
      roughness: 0.3,
      metalness: 0.9,
      flatShading: true,
    });
    this.materials.set('weapon', weapon);
  }

  private createTorso(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'Torso';

    // Main torso body - angular box
    const torsoGeom = new THREE.BoxGeometry(4, 3, 2.5);
    // Modify vertices for more angular look
    const positions = torsoGeom.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const y = positions.getY(i);
      const z = positions.getZ(i);
      // Taper top
      if (y > 0) {
        positions.setX(i, positions.getX(i) * 0.85);
      }
      // Angle front
      if (z > 0 && y > 0) {
        positions.setZ(i, z * 0.7);
      }
    }
    torsoGeom.computeVertexNormals();

    const torso = new THREE.Mesh(torsoGeom, this.materials.get('armor'));
    group.add(torso);

    // Chest vents
    const ventGeom = new THREE.BoxGeometry(0.3, 0.8, 0.3);
    for (let i = -1; i <= 1; i += 2) {
      const vent = new THREE.Mesh(ventGeom, this.materials.get('joint'));
      vent.position.set(i * 1.2, 0.2, 1.3);
      group.add(vent);
    }

    // Back reactor housing
    const reactorGeom = new THREE.CylinderGeometry(0.8, 1.0, 2, 6);
    const reactor = new THREE.Mesh(
      reactorGeom,
      this.materials.get('armorSecondary')
    );
    reactor.position.set(0, 0, -1.5);
    reactor.rotation.x = Math.PI / 2;
    group.add(reactor);

    // Shoulder mounts
    const shoulderGeom = new THREE.BoxGeometry(0.8, 0.6, 1.2);
    for (let i = -1; i <= 1; i += 2) {
      const shoulder = new THREE.Mesh(
        shoulderGeom,
        this.materials.get('armorSecondary')
      );
      shoulder.position.set(i * 2.4, 1.2, 0);
      group.add(shoulder);
    }

    return group;
  }

  private createHead(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'Head';

    // Main head structure - angular
    const headGeom = new THREE.BoxGeometry(1.8, 1.2, 1.5);
    const positions = headGeom.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const y = positions.getY(i);
      const z = positions.getZ(i);
      // Angle the front
      if (z > 0) {
        positions.setY(i, y * 0.7);
        positions.setZ(i, z * 0.8);
      }
    }
    headGeom.computeVertexNormals();

    const head = new THREE.Mesh(headGeom, this.materials.get('armor'));
    group.add(head);

    // Cockpit visor
    const visorGeom = new THREE.BoxGeometry(1.4, 0.4, 0.3);
    const visor = new THREE.Mesh(visorGeom, this.materials.get('glass'));
    visor.position.set(0, 0.1, 0.7);
    group.add(visor);

    // Antenna
    const antennaGeom = new THREE.CylinderGeometry(0.05, 0.08, 0.8, 4);
    const antenna = new THREE.Mesh(antennaGeom, this.materials.get('joint'));
    antenna.position.set(0.6, 0.8, -0.3);
    antenna.rotation.z = -0.2;
    group.add(antenna);

    // Sensor pod
    const sensorGeom = new THREE.SphereGeometry(0.15, 4, 4);
    const sensor = new THREE.Mesh(sensorGeom, this.materials.get('accent'));
    sensor.position.set(0, 0.4, 0.6);
    group.add(sensor);

    return group;
  }

  private createArm(side: 'left' | 'right'): THREE.Group {
    const group = new THREE.Group();
    group.name = side === 'left' ? 'LeftArm' : 'RightArm';
    const mirror = side === 'left' ? 1 : -1;

    // Upper arm
    const upperArmGeom = new THREE.BoxGeometry(0.8, 2.0, 0.8);
    const upperArm = new THREE.Mesh(upperArmGeom, this.materials.get('armor'));
    upperArm.position.set(mirror * 0.2, -1.0, 0);
    group.add(upperArm);

    // Elbow joint
    const elbowGeom = new THREE.SphereGeometry(0.45, 6, 6);
    const elbow = new THREE.Mesh(elbowGeom, this.materials.get('joint'));
    elbow.position.set(mirror * 0.2, -2.2, 0);
    group.add(elbow);

    // Lower arm / weapon housing
    const lowerArmGeom = new THREE.BoxGeometry(1.0, 2.5, 1.2);
    const positions = lowerArmGeom.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const y = positions.getY(i);
      // Taper towards wrist
      if (y < 0) {
        positions.setX(i, positions.getX(i) * 0.7);
        positions.setZ(i, positions.getZ(i) * 0.7);
      }
    }
    lowerArmGeom.computeVertexNormals();

    const lowerArm = new THREE.Mesh(lowerArmGeom, this.materials.get('armor'));
    lowerArm.position.set(mirror * 0.2, -3.8, 0);
    group.add(lowerArm);

    // Weapon barrel
    const barrelGeom = new THREE.CylinderGeometry(0.15, 0.2, 1.5, 6);
    const barrel = new THREE.Mesh(barrelGeom, this.materials.get('weapon'));
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(mirror * 0.2, -4.5, 1.0);
    group.add(barrel);

    // Missile pod on outer arm
    if (side === 'right') {
      const podGeom = new THREE.BoxGeometry(0.6, 0.8, 0.8);
      const pod = new THREE.Mesh(podGeom, this.materials.get('armorSecondary'));
      pod.position.set(0.7, -1.0, 0);
      group.add(pod);

      // Missile tubes
      const tubeGeom = new THREE.CylinderGeometry(0.08, 0.08, 0.3, 6);
      for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 2; col++) {
          const tube = new THREE.Mesh(tubeGeom, this.materials.get('joint'));
          tube.rotation.x = Math.PI / 2;
          tube.position.set(0.5 + col * 0.2, -0.8 + row * 0.25, 0.5);
          group.add(tube);
        }
      }
    }

    return group;
  }

  private createLeg(side: 'left' | 'right'): THREE.Group {
    const group = new THREE.Group();
    group.name = side === 'left' ? 'LeftLeg' : 'RightLeg';
    const mirror = side === 'left' ? 1 : -1;

    // Hip joint
    const hipGeom = new THREE.SphereGeometry(0.5, 6, 6);
    const hip = new THREE.Mesh(hipGeom, this.materials.get('joint'));
    group.add(hip);

    // Upper leg (thigh)
    const thighGeom = new THREE.BoxGeometry(1.0, 2.0, 1.0);
    const positions = thighGeom.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const y = positions.getY(i);
      // Taper towards knee
      if (y < 0) {
        positions.setX(i, positions.getX(i) * 0.8);
        positions.setZ(i, positions.getZ(i) * 0.8);
      }
    }
    thighGeom.computeVertexNormals();

    const thigh = new THREE.Mesh(thighGeom, this.materials.get('armor'));
    thigh.position.set(0, -1.3, 0);
    group.add(thigh);

    // Knee joint
    const kneeGeom = new THREE.CylinderGeometry(0.4, 0.4, 0.5, 6);
    const knee = new THREE.Mesh(kneeGeom, this.materials.get('joint'));
    knee.rotation.z = Math.PI / 2;
    knee.position.set(0, -2.5, 0);
    group.add(knee);

    // Lower leg (shin) - reverse joint style like in MechWarrior
    const shinGeom = new THREE.BoxGeometry(0.9, 2.5, 1.2);
    const shinPositions = shinGeom.attributes.position;
    for (let i = 0; i < shinPositions.count; i++) {
      const y = shinPositions.getY(i);
      const z = shinPositions.getZ(i);
      // Angle backwards (reverse joint)
      if (y < 0) {
        shinPositions.setZ(i, z - 0.3);
      }
    }
    shinGeom.computeVertexNormals();

    const shin = new THREE.Mesh(shinGeom, this.materials.get('armor'));
    shin.position.set(0, -4.0, 0.2);
    group.add(shin);

    // Ankle actuator
    const ankleGeom = new THREE.CylinderGeometry(0.25, 0.3, 0.4, 6);
    const ankle = new THREE.Mesh(ankleGeom, this.materials.get('joint'));
    ankle.position.set(0, -5.3, 0.4);
    group.add(ankle);

    // Foot
    const footGeom = new THREE.BoxGeometry(1.2, 0.4, 2.0);
    const footPositions = footGeom.attributes.position;
    for (let i = 0; i < footPositions.count; i++) {
      const z = footPositions.getZ(i);
      // Taper front of foot
      if (z > 0) {
        footPositions.setX(i, footPositions.getX(i) * 0.6);
        footPositions.setY(i, footPositions.getY(i) * 0.7);
      }
    }
    footGeom.computeVertexNormals();

    const foot = new THREE.Mesh(footGeom, this.materials.get('armorSecondary'));
    foot.position.set(0, -5.7, 0.8);
    group.add(foot);

    // Toe claws
    const clawGeom = new THREE.BoxGeometry(0.15, 0.2, 0.4);
    for (let i = -1; i <= 1; i += 2) {
      const claw = new THREE.Mesh(clawGeom, this.materials.get('joint'));
      claw.position.set(i * 0.35, -5.8, 1.9);
      claw.rotation.x = 0.3;
      group.add(claw);
    }

    // Armor plate on shin
    const plateGeom = new THREE.BoxGeometry(0.7, 1.5, 0.2);
    const plate = new THREE.Mesh(
      plateGeom,
      this.materials.get('armorSecondary')
    );
    plate.position.set(mirror * 0.1, -3.8, 0.85);
    plate.rotation.x = -0.2;
    group.add(plate);

    return group;
  }

  // Animation methods
  setTorsoRotation(yaw: number): void {
    this.torsoGroup.rotation.y = yaw;
  }

  setHeadPitch(pitch: number): void {
    // Negate pitch because Three.js rotation.x positive = tilt DOWN, but we want positive pitch = look UP
    // Clamp to reasonable values (note: limits are swapped due to negation)
    const clampedPitch = Math.max(-0.3, Math.min(0.4, -pitch));
    this.headGroup.rotation.x = clampedPitch;

    // Store arm pitch for aiming (walk animation will add to this)
    this.armPitch = clampedPitch;
  }

  animateWalk(time: number, speed: number): void {
    // Clamp speed to valid range and use sqrt for more natural animation scaling
    const clampedSpeed = Math.max(0, Math.min(speed, 1.5));

    // Animation rate increases with speed, but use sqrt for smoother scaling at high speeds
    // Base rate of 8 gives good leg turnover, sqrt(speed) prevents it from getting too fast
    const animationRate = 8 * Math.sqrt(clampedSpeed);
    const walkCycle = time * animationRate;

    // Leg swing amplitude scales with speed but caps at reasonable maximum
    const legSwingAmplitude = 0.35 * Math.min(clampedSpeed, 1);
    const legSwing = Math.sin(walkCycle) * legSwingAmplitude;

    // Body bob - double frequency, scaled to speed
    const bobAmount =
      Math.abs(Math.sin(walkCycle * 2)) * 0.08 * Math.min(clampedSpeed, 1);

    // Leg swing
    this.leftLegGroup.rotation.x = legSwing;
    this.rightLegGroup.rotation.x = -legSwing;

    // Body bob
    this.torsoGroup.position.y = 5.5 + bobAmount;

    // Slight torso sway
    this.torsoGroup.rotation.z =
      Math.sin(walkCycle) * 0.015 * Math.min(clampedSpeed, 1);

    // Arm pitch (from aiming) + walk counter-swing
    this.leftArmGroup.rotation.x = this.armPitch + -legSwing * 0.4;
    this.rightArmGroup.rotation.x = this.armPitch + legSwing * 0.4;
  }

  resetPose(): void {
    this.leftLegGroup.rotation.x = 0;
    this.rightLegGroup.rotation.x = 0;
    this.torsoGroup.position.y = 5.5;
    this.torsoGroup.rotation.z = 0;
    this.leftArmGroup.rotation.x = this.armPitch;
    this.rightArmGroup.rotation.x = this.armPitch;
  }

  // Get positions for hardpoints
  getWeaponPosition(slot: number): THREE.Vector3 {
    const worldPos = new THREE.Vector3();
    const localOffset = new THREE.Vector3();
    let sourceGroup: THREE.Group;

    switch (slot) {
      case 1: // Left arm - weapon at end of arm barrel
        sourceGroup = this.leftArmGroup;
        localOffset.set(0, -4.5, 1.5); // Down and forward in local space
        break;
      case 2: // Right arm - weapon at end of arm barrel
        sourceGroup = this.rightArmGroup;
        localOffset.set(0, -4.5, 1.5); // Down and forward in local space
        break;
      case 3: // Left torso - shoulder mounted
        sourceGroup = this.torsoGroup;
        localOffset.set(-1.5, 0, 1.5); // Left and forward in local space
        break;
      case 4: // Right torso - missile rack
        sourceGroup = this.torsoGroup;
        localOffset.set(1.5, 0, 1.5); // Right and forward in local space
        break;
      default:
        sourceGroup = this.torsoGroup;
        localOffset.set(0, 0, 1.0);
    }

    // Get the world position of the source group
    sourceGroup.getWorldPosition(worldPos);

    // Get the world quaternion of the source group to rotate the offset
    const worldQuat = new THREE.Quaternion();
    sourceGroup.getWorldQuaternion(worldQuat);

    // Rotate the local offset by the group's world rotation
    localOffset.applyQuaternion(worldQuat);

    // Add the rotated offset to the world position
    worldPos.add(localOffset);

    return worldPos;
  }

  getCockpitPosition(): THREE.Vector3 {
    const worldPos = new THREE.Vector3();
    this.headGroup.getWorldPosition(worldPos);
    worldPos.z += 0.5;
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

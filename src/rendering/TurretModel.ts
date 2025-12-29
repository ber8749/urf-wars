import * as THREE from 'three';

/**
 * Procedurally generated turret model in retro low-poly style.
 * Matches the MechModel aesthetic.
 */
export class TurretModel {
  public mesh: THREE.Group;

  /** The rotating gun platform (yaw rotation) */
  public gunPlatform: THREE.Group;

  /** The barrel group (for potential pitch aiming) */
  public barrelGroup: THREE.Group;

  private materials: Map<string, THREE.MeshStandardMaterial> = new Map();

  constructor() {
    this.mesh = new THREE.Group();
    this.mesh.name = 'Turret';

    // Create materials matching mech style
    this.createMaterials();

    // Build turret parts
    const base = this.createBase();
    this.gunPlatform = this.createGunPlatform();
    this.barrelGroup = this.createBarrel();

    // Assemble turret
    this.mesh.add(base);
    this.mesh.add(this.gunPlatform);
    this.gunPlatform.add(this.barrelGroup);

    // Position the gun platform on top of base
    this.gunPlatform.position.set(0, 1.8, 0);
    this.barrelGroup.position.set(0, 0.3, 1.2);

    // Enable shadows
    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }

  private createMaterials(): void {
    // Base armor - dark gunmetal
    const armorBase = new THREE.MeshStandardMaterial({
      color: 0x4a5568,
      roughness: 0.7,
      metalness: 0.4,
      flatShading: true,
      emissive: 0x222233,
      emissiveIntensity: 0.2,
    });
    this.materials.set('armorBase', armorBase);

    // Gun platform - hostile red-tinted armor
    const armorPlatform = new THREE.MeshStandardMaterial({
      color: 0x8b4444,
      roughness: 0.6,
      metalness: 0.4,
      flatShading: true,
      emissive: 0x441111,
      emissiveIntensity: 0.3,
    });
    this.materials.set('armorPlatform', armorPlatform);

    // Joint/mechanical parts
    const joint = new THREE.MeshStandardMaterial({
      color: 0x606770,
      roughness: 0.5,
      metalness: 0.5,
      flatShading: true,
      emissive: 0x222222,
      emissiveIntensity: 0.15,
    });
    this.materials.set('joint', joint);

    // Accent - warning red glow
    const accent = new THREE.MeshStandardMaterial({
      color: 0xff3333,
      roughness: 0.3,
      metalness: 0.6,
      emissive: 0xff0000,
      emissiveIntensity: 0.7,
      flatShading: true,
    });
    this.materials.set('accent', accent);

    // Sensor/optic - bright red eye
    const sensor = new THREE.MeshStandardMaterial({
      color: 0xff0044,
      roughness: 0.1,
      metalness: 0.9,
      emissive: 0xff0022,
      emissiveIntensity: 1.0,
      flatShading: true,
    });
    this.materials.set('sensor', sensor);

    // Weapon barrel - dark metallic
    const weapon = new THREE.MeshStandardMaterial({
      color: 0x555555,
      roughness: 0.4,
      metalness: 0.7,
      flatShading: true,
      emissive: 0x111111,
      emissiveIntensity: 0.1,
    });
    this.materials.set('weapon', weapon);
  }

  private createBase(): THREE.Group {
    const baseGroup = new THREE.Group();
    baseGroup.name = 'Base';

    const armorBase = this.materials.get('armorBase')!;
    const joint = this.materials.get('joint')!;

    // Main pedestal - octagonal prism for retro look
    const pedestalGeom = new THREE.CylinderGeometry(1.2, 1.5, 1.5, 8);
    const pedestal = new THREE.Mesh(pedestalGeom, armorBase);
    pedestal.position.y = 0.75;
    baseGroup.add(pedestal);

    // Base plate - wider foundation
    const basePlateGeom = new THREE.CylinderGeometry(1.8, 2.0, 0.3, 8);
    const basePlate = new THREE.Mesh(basePlateGeom, armorBase);
    basePlate.position.y = 0.15;
    baseGroup.add(basePlate);

    // Rotation ring - where platform rotates
    const ringGeom = new THREE.TorusGeometry(1.0, 0.15, 6, 8);
    const ring = new THREE.Mesh(ringGeom, joint);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 1.6;
    baseGroup.add(ring);

    return baseGroup;
  }

  private createGunPlatform(): THREE.Group {
    const platformGroup = new THREE.Group();
    platformGroup.name = 'GunPlatform';

    const armorPlatform = this.materials.get('armorPlatform')!;
    const accent = this.materials.get('accent')!;
    const sensor = this.materials.get('sensor')!;

    // Main housing - angular box shape
    const housingGeom = new THREE.BoxGeometry(1.8, 1.0, 2.0);
    const housing = new THREE.Mesh(housingGeom, armorPlatform);
    platformGroup.add(housing);

    // Front face - sloped armor
    const frontGeom = new THREE.BoxGeometry(1.6, 0.8, 0.4);
    const front = new THREE.Mesh(frontGeom, armorPlatform);
    front.position.set(0, 0.1, 1.1);
    front.rotation.x = -0.3;
    platformGroup.add(front);

    // Side panels - angled armor plates
    const sidePanelGeom = new THREE.BoxGeometry(0.2, 0.8, 1.6);
    const leftPanel = new THREE.Mesh(sidePanelGeom, armorPlatform);
    leftPanel.position.set(-1.0, 0, 0.2);
    leftPanel.rotation.z = 0.2;
    platformGroup.add(leftPanel);

    const rightPanel = new THREE.Mesh(sidePanelGeom, armorPlatform);
    rightPanel.position.set(1.0, 0, 0.2);
    rightPanel.rotation.z = -0.2;
    platformGroup.add(rightPanel);

    // Sensor eye - menacing red glow
    const sensorGeom = new THREE.SphereGeometry(0.2, 8, 8);
    const sensorMesh = new THREE.Mesh(sensorGeom, sensor);
    sensorMesh.position.set(0, 0.3, 1.15);
    platformGroup.add(sensorMesh);

    // Accent strips on sides
    const stripGeom = new THREE.BoxGeometry(0.05, 0.3, 1.0);
    const leftStrip = new THREE.Mesh(stripGeom, accent);
    leftStrip.position.set(-0.85, 0.35, 0.3);
    platformGroup.add(leftStrip);

    const rightStrip = new THREE.Mesh(stripGeom, accent);
    rightStrip.position.set(0.85, 0.35, 0.3);
    platformGroup.add(rightStrip);

    return platformGroup;
  }

  private createBarrel(): THREE.Group {
    const barrelGroup = new THREE.Group();
    barrelGroup.name = 'Barrel';

    const weapon = this.materials.get('weapon')!;
    const accent = this.materials.get('accent')!;

    // Main barrel - dual cannon style
    const barrelGeom = new THREE.CylinderGeometry(0.12, 0.15, 2.0, 6);

    const leftBarrel = new THREE.Mesh(barrelGeom, weapon);
    leftBarrel.rotation.x = Math.PI / 2;
    leftBarrel.position.set(-0.25, 0, 0.8);
    barrelGroup.add(leftBarrel);

    const rightBarrel = new THREE.Mesh(barrelGeom, weapon);
    rightBarrel.rotation.x = Math.PI / 2;
    rightBarrel.position.set(0.25, 0, 0.8);
    barrelGroup.add(rightBarrel);

    // Barrel housing - connects to platform
    const housingGeom = new THREE.BoxGeometry(0.8, 0.4, 0.6);
    const housing = new THREE.Mesh(housingGeom, weapon);
    housing.position.set(0, 0, -0.2);
    barrelGroup.add(housing);

    // Muzzle flash guards
    const muzzleGeom = new THREE.CylinderGeometry(0.18, 0.12, 0.15, 6);

    const leftMuzzle = new THREE.Mesh(muzzleGeom, accent);
    leftMuzzle.rotation.x = Math.PI / 2;
    leftMuzzle.position.set(-0.25, 0, 1.85);
    barrelGroup.add(leftMuzzle);

    const rightMuzzle = new THREE.Mesh(muzzleGeom, accent);
    rightMuzzle.rotation.x = Math.PI / 2;
    rightMuzzle.position.set(0.25, 0, 1.85);
    barrelGroup.add(rightMuzzle);

    return barrelGroup;
  }

  /**
   * Set the turret's yaw rotation (gun platform)
   * @param yaw Rotation in radians around Y axis
   */
  setYaw(yaw: number): void {
    this.gunPlatform.rotation.y = yaw;
  }

  /**
   * Get muzzle position in world space for spawning projectiles
   */
  getMuzzlePosition(): THREE.Vector3 {
    const worldPos = new THREE.Vector3();
    // Get position of barrel tip
    const barrelTip = new THREE.Vector3(0, 0, 2.0);
    this.barrelGroup.localToWorld(barrelTip.clone());

    // Actually compute from the barrel group's world matrix
    this.barrelGroup.getWorldPosition(worldPos);

    // Offset forward to barrel tip
    const forward = new THREE.Vector3(0, 0, 2.0);
    forward.applyQuaternion(
      this.gunPlatform.getWorldQuaternion(new THREE.Quaternion())
    );
    worldPos.add(forward);

    return worldPos;
  }

  /**
   * Get the firing direction in world space
   */
  getFiringDirection(): THREE.Vector3 {
    const direction = new THREE.Vector3(0, 0, 1);
    direction.applyQuaternion(
      this.gunPlatform.getWorldQuaternion(new THREE.Quaternion())
    );
    return direction.normalize();
  }

  /**
   * Update materials when damaged (optional visual feedback)
   */
  showDamage(healthPercent: number): void {
    const sensor = this.materials.get('sensor');
    if (sensor) {
      // Flicker the sensor when damaged
      sensor.emissiveIntensity =
        healthPercent < 0.3 ? 0.5 + Math.random() * 0.5 : 1.0;
    }
  }
}

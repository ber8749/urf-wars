import * as THREE from 'three';
import { Weapon } from './Weapon';
import type { WeaponConfig } from './Weapon';
import { WeaponType, ComponentLocation, COLORS } from '../types';
import { DamageSystem } from '../combat/DamageSystem';

export class Laser extends Weapon {
  private damageSystem: DamageSystem;
  private targets: THREE.Object3D[] = [];
  private beamDuration = 0.1; // How long beam visual lasts
  private activeBeams: { mesh: THREE.Mesh; lifetime: number }[] = [];

  constructor(scene: THREE.Scene, damageSystem: DamageSystem) {
    const config: WeaponConfig = {
      name: 'Medium Laser',
      type: WeaponType.Laser,
      damage: 5,
      cooldown: 0.5,
      range: 300,
      mountLocation: ComponentLocation.LeftArm,
    };
    super(config, scene);
    this.damageSystem = damageSystem;
  }

  setTargets(targets: THREE.Object3D[]): void {
    this.targets = targets;
  }

  update(dt: number): void {
    super.update(dt);
    
    // Update active beams
    for (let i = this.activeBeams.length - 1; i >= 0; i--) {
      this.activeBeams[i].lifetime -= dt;
      if (this.activeBeams[i].lifetime <= 0) {
        this.scene.remove(this.activeBeams[i].mesh);
        this.activeBeams[i].mesh.geometry.dispose();
        (this.activeBeams[i].mesh.material as THREE.Material).dispose();
        this.activeBeams.splice(i, 1);
      }
    }
  }

  fire(position: THREE.Vector3, aimPoint: THREE.Vector3): void {
    if (!this.canFire()) return;
    
    this.startCooldown();

    // Calculate direction from weapon position toward aim point
    const direction = aimPoint.clone().sub(position).normalize();

    // Raycast for hit detection
    const raycaster = new THREE.Raycaster(position, direction, 0, this.range);
    
    // Check hits against targets
    let hitPoint = position.clone().add(direction.clone().multiplyScalar(this.range));
    let hitTarget: THREE.Object3D | null = null;
    let hitDistance = this.range;

    for (const target of this.targets) {
      const intersects = raycaster.intersectObject(target, true);
      if (intersects.length > 0 && intersects[0].distance < hitDistance) {
        hitDistance = intersects[0].distance;
        hitPoint = intersects[0].point;
        hitTarget = target;
      }
    }

    // Create beam visual
    this.createBeamVisual(position, hitPoint);

    // Apply damage if hit
    if (hitTarget) {
      this.damageSystem.applyDamageToTarget(hitTarget, this.damage, hitPoint);
      this.createHitEffect(hitPoint);
    }
  }

  private createBeamVisual(start: THREE.Vector3, end: THREE.Vector3): void {
    const distance = start.distanceTo(end);
    const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    
    // Create beam cylinder
    const beamGeo = new THREE.CylinderGeometry(0.05, 0.05, distance, 8);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0.8,
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    
    // Position and orient beam
    beam.position.copy(midPoint);
    beam.lookAt(end);
    beam.rotateX(Math.PI / 2);
    
    this.scene.add(beam);
    this.activeBeams.push({ mesh: beam, lifetime: this.beamDuration });

    // Add glow effect
    const glowGeo = new THREE.CylinderGeometry(0.15, 0.15, distance, 8);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xff4444,
      transparent: true,
      opacity: 0.3,
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.copy(midPoint);
    glow.lookAt(end);
    glow.rotateX(Math.PI / 2);
    
    this.scene.add(glow);
    this.activeBeams.push({ mesh: glow, lifetime: this.beamDuration });
  }

  private createHitEffect(position: THREE.Vector3): void {
    // Create a flash/spark at hit point
    const sparkGeo = new THREE.SphereGeometry(0.3, 8, 8);
    const sparkMat = new THREE.MeshBasicMaterial({
      color: COLORS.weaponFire,
      transparent: true,
      opacity: 1,
    });
    const spark = new THREE.Mesh(sparkGeo, sparkMat);
    spark.position.copy(position);
    
    this.scene.add(spark);
    this.activeBeams.push({ mesh: spark, lifetime: 0.15 });
  }
}


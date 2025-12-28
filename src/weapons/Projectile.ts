import * as THREE from 'three';
import { COLORS } from '../types';
import { DamageSystem } from '../combat/DamageSystem';

export class Projectile {
  public readonly mesh: THREE.Mesh;
  public readonly velocity: THREE.Vector3;
  public readonly damage: number;
  public readonly maxLifetime: number;
  
  private lifetime = 0;
  private scene: THREE.Scene;
  private damageSystem: DamageSystem;
  private targets: THREE.Object3D[];
  private hasHit = false;
  private trail: THREE.Points;

  constructor(
    scene: THREE.Scene,
    position: THREE.Vector3,
    direction: THREE.Vector3,
    speed: number,
    damage: number,
    maxLifetime: number,
    damageSystem: DamageSystem,
    targets: THREE.Object3D[]
  ) {
    this.scene = scene;
    this.damage = damage;
    this.maxLifetime = maxLifetime;
    this.damageSystem = damageSystem;
    this.targets = targets;
    
    // Create projectile mesh
    const geo = new THREE.SphereGeometry(0.2, 8, 8);
    const mat = new THREE.MeshBasicMaterial({
      color: COLORS.weaponFire,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.copy(position);
    
    // Set velocity
    this.velocity = direction.clone().normalize().multiplyScalar(speed);
    
    // Create trail
    this.trail = this.createTrail();
    
    scene.add(this.mesh);
    scene.add(this.trail);
  }

  private createTrail(): THREE.Points {
    const trailGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(30 * 3); // 10 trail points
    trailGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const trailMat = new THREE.PointsMaterial({
      color: COLORS.weaponFire,
      size: 0.15,
      transparent: true,
      opacity: 0.6,
    });
    
    return new THREE.Points(trailGeo, trailMat);
  }

  update(dt: number): boolean {
    if (this.hasHit) return true;
    
    this.lifetime += dt;
    
    // Check lifetime
    if (this.lifetime >= this.maxLifetime) {
      this.destroy();
      return true;
    }
    
    // Store previous position for collision
    const prevPos = this.mesh.position.clone();
    
    // Move projectile
    const movement = this.velocity.clone().multiplyScalar(dt);
    this.mesh.position.add(movement);
    
    // Update trail
    this.updateTrail();
    
    // Check for collisions
    if (this.checkCollisions(prevPos, this.mesh.position)) {
      return true;
    }
    
    // Check ground collision
    if (this.mesh.position.y <= 0) {
      this.createImpactEffect(this.mesh.position);
      this.destroy();
      return true;
    }
    
    return false;
  }

  private updateTrail(): void {
    const positions = this.trail.geometry.attributes.position.array as Float32Array;
    
    // Shift existing positions back
    for (let i = positions.length - 3; i >= 3; i -= 3) {
      positions[i] = positions[i - 3];
      positions[i + 1] = positions[i - 2];
      positions[i + 2] = positions[i - 1];
    }
    
    // Add current position at front
    positions[0] = this.mesh.position.x;
    positions[1] = this.mesh.position.y;
    positions[2] = this.mesh.position.z;
    
    this.trail.geometry.attributes.position.needsUpdate = true;
  }

  private checkCollisions(start: THREE.Vector3, end: THREE.Vector3): boolean {
    const direction = end.clone().sub(start);
    const distance = direction.length();
    
    if (distance === 0) return false;
    
    direction.normalize();
    
    const raycaster = new THREE.Raycaster(start, direction, 0, distance + 0.5);
    
    for (const target of this.targets) {
      const intersects = raycaster.intersectObject(target, true);
      if (intersects.length > 0) {
        const hitPoint = intersects[0].point;
        this.damageSystem.applyDamageToTarget(target, this.damage, hitPoint);
        this.createImpactEffect(hitPoint);
        this.hasHit = true;
        this.destroy();
        return true;
      }
    }
    
    return false;
  }

  private createImpactEffect(position: THREE.Vector3): void {
    // Create explosion particles
    const particleCount = 12;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const radius = 0.5;
      positions[i * 3] = position.x + Math.cos(angle) * radius;
      positions[i * 3 + 1] = position.y + Math.random() * 0.5;
      positions[i * 3 + 2] = position.z + Math.sin(angle) * radius;
    }
    
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const particleMat = new THREE.PointsMaterial({
      color: COLORS.weaponFire,
      size: 0.4,
      transparent: true,
      opacity: 1,
    });
    
    const particles = new THREE.Points(particleGeo, particleMat);
    this.scene.add(particles);
    
    // Remove after short time
    setTimeout(() => {
      this.scene.remove(particles);
      particleGeo.dispose();
      particleMat.dispose();
    }, 200);
  }

  destroy(): void {
    this.scene.remove(this.mesh);
    this.scene.remove(this.trail);
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.trail.geometry.dispose();
    (this.trail.material as THREE.Material).dispose();
  }
}


import * as THREE from 'three';
import type { Mech } from './Mech';
import type { HardpointConfig, WeaponConfig, WeaponType } from '../types';

const WEAPON_CONFIGS: Record<WeaponType, WeaponConfig> = {
  laser: {
    type: 'laser',
    damage: 15,
    heatGenerated: 8,
    cooldown: 0.5,
    projectileSpeed: 500,
    range: 400,
  },
  ppc: {
    type: 'ppc',
    damage: 35,
    heatGenerated: 20,
    cooldown: 2.0,
    projectileSpeed: 300,
    range: 500,
  },
  missile: {
    type: 'missile',
    damage: 8,
    heatGenerated: 4,
    cooldown: 1.5,
    projectileSpeed: 100,
    range: 600,
    ammo: 120,
  },
  autocannon: {
    type: 'autocannon',
    damage: 20,
    heatGenerated: 3,
    cooldown: 0.3,
    projectileSpeed: 400,
    range: 350,
    ammo: 200,
  },
};

export interface Weapon {
  slot: number;
  config: WeaponConfig;
  cooldownRemaining: number;
  ammo?: number;
  position: THREE.Vector3;
}

interface Projectile {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  damage: number;
  range: number;
  distanceTraveled: number;
  type: WeaponType;
}

export class WeaponSystem {
  private mech: Mech;
  private scene: THREE.Scene;
  private weapons: Map<number, Weapon> = new Map();
  private projectiles: Projectile[] = [];
  private selectedSlot: number = 1;
  
  // Visual effects
  private laserMaterial: THREE.MeshBasicMaterial;
  private ppcMaterial: THREE.MeshBasicMaterial;
  private missileMaterial: THREE.MeshBasicMaterial;
  
  constructor(mech: Mech, scene: THREE.Scene, hardpoints: HardpointConfig[]) {
    this.mech = mech;
    this.scene = scene;
    
    // Create materials for projectiles
    this.laserMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0.9,
    });
    
    this.ppcMaterial = new THREE.MeshBasicMaterial({
      color: 0x00aaff,
      transparent: true,
      opacity: 0.8,
    });
    
    this.missileMaterial = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
    });
    
    // Initialize weapons from hardpoints
    for (const hardpoint of hardpoints) {
      const config = WEAPON_CONFIGS[hardpoint.weaponType];
      const weapon: Weapon = {
        slot: hardpoint.slot,
        config: { ...config },
        cooldownRemaining: 0,
        ammo: config.ammo,
        position: new THREE.Vector3(
          hardpoint.position.x,
          hardpoint.position.y,
          hardpoint.position.z
        ),
      };
      this.weapons.set(hardpoint.slot, weapon);
    }
  }
  
  update(dt: number): void {
    // Update weapon cooldowns
    for (const weapon of this.weapons.values()) {
      if (weapon.cooldownRemaining > 0) {
        weapon.cooldownRemaining -= dt;
      }
    }
    
    // Update projectiles
    this.updateProjectiles(dt);
  }
  
  private updateProjectiles(dt: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      
      // Move projectile
      const movement = proj.velocity.clone().multiplyScalar(dt);
      proj.mesh.position.add(movement);
      proj.distanceTraveled += movement.length();
      
      // Check if out of range
      if (proj.distanceTraveled >= proj.range) {
        this.removeProjectile(i);
        continue;
      }
      
      // Missile trail effect
      if (proj.type === 'missile') {
        // Could add smoke trail here
      }
    }
  }
  
  private removeProjectile(index: number): void {
    const proj = this.projectiles[index];
    this.scene.remove(proj.mesh);
    proj.mesh.geometry.dispose();
    this.projectiles.splice(index, 1);
  }
  
  fire(slot: number): boolean {
    const weapon = this.weapons.get(slot);
    if (!weapon) return false;
    
    // Check cooldown
    if (weapon.cooldownRemaining > 0) return false;
    
    // Check ammo
    if (weapon.ammo !== undefined && weapon.ammo <= 0) return false;
    
    // Get firing position and direction from mech model
    const mechModel = this.mech.getModel();
    const firingPos = mechModel.getWeaponPosition(slot);
    
    // Get aim direction from torso
    const torsoRotation = this.mech.getTorsoWorldRotation();
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyEuler(torsoRotation);
    
    // Create projectile based on weapon type
    this.createProjectile(weapon, firingPos, direction);
    
    // Start cooldown
    weapon.cooldownRemaining = weapon.config.cooldown;
    
    // Use ammo
    if (weapon.ammo !== undefined) {
      weapon.ammo--;
    }
    
    return true;
  }
  
  private createProjectile(
    weapon: Weapon,
    position: THREE.Vector3,
    direction: THREE.Vector3
  ): void {
    let geometry: THREE.BufferGeometry;
    let material: THREE.Material;
    
    switch (weapon.config.type) {
      case 'laser':
        // Laser is a long thin cylinder
        geometry = new THREE.CylinderGeometry(0.05, 0.05, 3, 4);
        geometry.rotateX(Math.PI / 2);
        material = this.laserMaterial;
        break;
        
      case 'ppc':
        // PPC is a glowing sphere
        geometry = new THREE.SphereGeometry(0.3, 6, 6);
        material = this.ppcMaterial;
        break;
        
      case 'missile':
        // Missile is a small elongated shape
        geometry = new THREE.ConeGeometry(0.1, 0.5, 4);
        geometry.rotateX(Math.PI / 2);
        material = this.missileMaterial;
        break;
        
      case 'autocannon':
        // Autocannon rounds are small and fast
        geometry = new THREE.SphereGeometry(0.08, 4, 4);
        material = this.laserMaterial;
        break;
        
      default:
        return;
    }
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    
    // Orient projectile along direction
    mesh.lookAt(position.clone().add(direction));
    
    this.scene.add(mesh);
    
    const projectile: Projectile = {
      mesh,
      velocity: direction.normalize().multiplyScalar(weapon.config.projectileSpeed),
      damage: weapon.config.damage,
      range: weapon.config.range,
      distanceTraveled: 0,
      type: weapon.config.type,
    };
    
    this.projectiles.push(projectile);
  }
  
  selectWeapon(slot: number): void {
    if (this.weapons.has(slot)) {
      this.selectedSlot = slot;
    }
  }
  
  getSelectedSlot(): number {
    return this.selectedSlot;
  }
  
  getWeapon(slot: number): Weapon | undefined {
    return this.weapons.get(slot);
  }
  
  getAllWeapons(): Weapon[] {
    return Array.from(this.weapons.values());
  }
  
  getProjectiles(): Projectile[] {
    return this.projectiles;
  }
  
  dispose(): void {
    // Clean up all projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      this.removeProjectile(i);
    }
    
    this.laserMaterial.dispose();
    this.ppcMaterial.dispose();
    this.missileMaterial.dispose();
  }
}


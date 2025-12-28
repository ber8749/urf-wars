import * as THREE from 'three';
import { COLORS } from '../types';

export class TargetDummy {
  public readonly mesh: THREE.Group;
  private health: number;
  private maxHealth: number;
  private destroyed = false;
  
  // Visual feedback
  private flashMaterial: THREE.MeshStandardMaterial;
  private baseMaterial: THREE.MeshStandardMaterial;
  private flashTimer = 0;

  constructor(position: THREE.Vector3, maxHealth: number = 50) {
    this.maxHealth = maxHealth;
    this.health = maxHealth;
    
    this.mesh = new THREE.Group();
    this.mesh.position.copy(position);
    
    // Create materials
    this.baseMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.enemy,
      roughness: 0.7,
      metalness: 0.3,
    });
    
    this.flashMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xff0000,
      emissiveIntensity: 0.5,
    });
    
    this.buildDummy();
  }

  private buildDummy(): void {
    // Humanoid mech silhouette
    
    // Body
    const bodyGeo = new THREE.BoxGeometry(3, 5, 2);
    const body = new THREE.Mesh(bodyGeo, this.baseMaterial);
    body.position.y = 5;
    body.castShadow = true;
    body.receiveShadow = true;
    this.mesh.add(body);
    
    // Head
    const headGeo = new THREE.BoxGeometry(1.5, 1.5, 1.5);
    const head = new THREE.Mesh(headGeo, this.baseMaterial);
    head.position.y = 8.5;
    head.castShadow = true;
    this.mesh.add(head);
    
    // Left arm
    const leftArmGeo = new THREE.BoxGeometry(1, 4, 1);
    const leftArm = new THREE.Mesh(leftArmGeo, this.baseMaterial);
    leftArm.position.set(-2.5, 5.5, 0);
    leftArm.castShadow = true;
    this.mesh.add(leftArm);
    
    // Right arm
    const rightArmGeo = new THREE.BoxGeometry(1, 4, 1);
    const rightArm = new THREE.Mesh(rightArmGeo, this.baseMaterial);
    rightArm.position.set(2.5, 5.5, 0);
    rightArm.castShadow = true;
    this.mesh.add(rightArm);
    
    // Left leg
    const leftLegGeo = new THREE.BoxGeometry(1.2, 4, 1.2);
    const leftLeg = new THREE.Mesh(leftLegGeo, this.baseMaterial);
    leftLeg.position.set(-1, 2, 0);
    leftLeg.castShadow = true;
    this.mesh.add(leftLeg);
    
    // Right leg
    const rightLegGeo = new THREE.BoxGeometry(1.2, 4, 1.2);
    const rightLeg = new THREE.Mesh(rightLegGeo, this.baseMaterial);
    rightLeg.position.set(1, 2, 0);
    rightLeg.castShadow = true;
    this.mesh.add(rightLeg);
    
    // Base/feet
    const baseGeo = new THREE.BoxGeometry(4, 0.5, 2);
    const base = new THREE.Mesh(baseGeo, this.baseMaterial);
    base.position.y = 0.25;
    base.castShadow = true;
    base.receiveShadow = true;
    this.mesh.add(base);

    // Health bar backing
    const healthBarBackGeo = new THREE.PlaneGeometry(4, 0.5);
    const healthBarBackMat = new THREE.MeshBasicMaterial({ color: 0x333333 });
    const healthBarBack = new THREE.Mesh(healthBarBackGeo, healthBarBackMat);
    healthBarBack.position.set(0, 11, 0);
    healthBarBack.name = 'healthBarBack';
    this.mesh.add(healthBarBack);

    // Health bar fill
    const healthBarFillGeo = new THREE.PlaneGeometry(3.8, 0.4);
    const healthBarFillMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const healthBarFill = new THREE.Mesh(healthBarFillGeo, healthBarFillMat);
    healthBarFill.position.set(0, 11, 0.01);
    healthBarFill.name = 'healthBarFill';
    this.mesh.add(healthBarFill);
  }

  takeDamage(amount: number): void {
    if (this.destroyed) return;
    
    this.health -= amount;
    this.flashTimer = 0.15; // Flash for 150ms
    
    // Flash white on hit
    this.setMaterial(this.flashMaterial);
    
    // Update health bar
    this.updateHealthBar();
    
    if (this.health <= 0) {
      this.health = 0;
      this.destroy();
    }
  }

  private updateHealthBar(): void {
    const healthPercent = this.health / this.maxHealth;
    const healthBar = this.mesh.getObjectByName('healthBarFill') as THREE.Mesh;
    
    if (healthBar) {
      healthBar.scale.x = healthPercent;
      healthBar.position.x = (1 - healthPercent) * -1.9; // Shift left as health decreases
      
      // Color based on health
      const mat = healthBar.material as THREE.MeshBasicMaterial;
      if (healthPercent > 0.6) {
        mat.color.setHex(0x00ff00); // Green
      } else if (healthPercent > 0.3) {
        mat.color.setHex(0xffff00); // Yellow
      } else {
        mat.color.setHex(0xff0000); // Red
      }
    }
  }

  private setMaterial(material: THREE.Material): void {
    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh && child.name !== 'healthBarBack' && child.name !== 'healthBarFill') {
        child.material = material;
      }
    });
  }

  private destroy(): void {
    this.destroyed = true;
    
    // Darken the mesh
    const destroyedMat = new THREE.MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.9,
      metalness: 0.1,
    });
    this.setMaterial(destroyedMat);
    
    // Tilt over (destroyed pose)
    this.mesh.rotation.x = Math.PI / 6;
    this.mesh.position.y = -1;
    
    // Hide health bar
    const healthBarBack = this.mesh.getObjectByName('healthBarBack');
    const healthBarFill = this.mesh.getObjectByName('healthBarFill');
    if (healthBarBack) healthBarBack.visible = false;
    if (healthBarFill) healthBarFill.visible = false;
  }

  update(dt: number): void {
    // Handle damage flash
    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      if (this.flashTimer <= 0 && !this.destroyed) {
        this.setMaterial(this.baseMaterial);
      }
    }
    
    // Make health bars face camera (billboard effect)
    const healthBarBack = this.mesh.getObjectByName('healthBarBack');
    const healthBarFill = this.mesh.getObjectByName('healthBarFill');
    if (healthBarBack && healthBarFill) {
      // This would need camera reference for proper billboarding
      // For now they face forward
    }
  }

  isDestroyed(): boolean {
    return this.destroyed;
  }

  getHealth(): number {
    return this.health;
  }

  getMaxHealth(): number {
    return this.maxHealth;
  }

  getHealthPercent(): number {
    return this.health / this.maxHealth;
  }
}


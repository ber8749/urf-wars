import * as THREE from 'three';
import { ComponentLocation } from '../types';
import { TargetDummy } from '../world/TargetDummy';

export class DamageSystem {
  private targets: Map<THREE.Object3D, TargetDummy> = new Map();
  
  // Callbacks for game events
  public onTargetDamaged?: (target: TargetDummy, damage: number) => void;
  public onTargetDestroyed?: (target: TargetDummy) => void;

  registerTarget(target: TargetDummy): void {
    this.targets.set(target.mesh, target);
  }

  unregisterTarget(target: TargetDummy): void {
    this.targets.delete(target.mesh);
  }

  applyDamageToTarget(targetMesh: THREE.Object3D, damage: number, _hitPoint: THREE.Vector3): void {
    // Find the root target object (might be a child mesh that was hit)
    let target: TargetDummy | undefined;
    let current: THREE.Object3D | null = targetMesh;
    
    while (current && !target) {
      target = this.targets.get(current);
      current = current.parent;
    }

    if (target) {
      target.takeDamage(damage);
      this.onTargetDamaged?.(target, damage);
      
      if (target.isDestroyed()) {
        this.onTargetDestroyed?.(target);
      }
    }
  }

  // For mech-to-mech combat (future use)
  applyDamageToMech(
    mechId: string,
    location: ComponentLocation,
    damage: number
  ): void {
    // This would integrate with a mech registry
    console.log(`Applying ${damage} damage to ${mechId} at ${location}`);
  }
}


import * as THREE from 'three';
import { ComponentLocation } from '../types';
import { Mech } from '../mech/Mech';

export interface HitResult {
  hit: boolean;
  point?: THREE.Vector3;
  distance?: number;
  target?: THREE.Object3D;
  componentLocation?: ComponentLocation;
}

export class HitDetection {
  private raycaster: THREE.Raycaster;

  constructor() {
    this.raycaster = new THREE.Raycaster();
  }

  // Raycast hit detection (for lasers, hitscan weapons)
  raycast(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    targets: THREE.Object3D[],
    maxDistance: number = 1000
  ): HitResult {
    this.raycaster.set(origin, direction.normalize());
    this.raycaster.far = maxDistance;

    const intersects = this.raycaster.intersectObjects(targets, true);

    if (intersects.length > 0) {
      return {
        hit: true,
        point: intersects[0].point,
        distance: intersects[0].distance,
        target: intersects[0].object,
      };
    }

    return { hit: false };
  }

  // Sphere collision detection (for projectiles)
  sphereIntersect(
    center: THREE.Vector3,
    radius: number,
    targets: THREE.Object3D[]
  ): HitResult {
    const sphere = new THREE.Sphere(center, radius);

    for (const target of targets) {
      // Get bounding box
      const box = new THREE.Box3().setFromObject(target);
      
      if (box.intersectsSphere(sphere)) {
        // Get closest point on box to sphere center
        const closestPoint = new THREE.Vector3();
        box.clampPoint(center, closestPoint);

        return {
          hit: true,
          point: closestPoint,
          distance: center.distanceTo(closestPoint),
          target: target,
        };
      }
    }

    return { hit: false };
  }

  // Determine which mech component was hit
  getMechComponentFromHit(mech: Mech, hitObject: THREE.Object3D): ComponentLocation | null {
    // Check each component mesh
    for (const [location, mesh] of mech.componentMeshes) {
      if (hitObject === mesh || this.isDescendantOf(hitObject, mesh)) {
        return location;
      }
    }
    return null;
  }

  private isDescendantOf(child: THREE.Object3D, parent: THREE.Object3D): boolean {
    let current: THREE.Object3D | null = child;
    while (current) {
      if (current === parent) return true;
      current = current.parent;
    }
    return false;
  }
}


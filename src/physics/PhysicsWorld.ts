import * as THREE from 'three';

// RAPIER module stored after initialization
let RAPIER: typeof import('@dimforge/rapier3d');
let rapierInitialized = false;

export async function initPhysics(): Promise<void> {
  if (rapierInitialized) return;
  RAPIER = await import('@dimforge/rapier3d');
  rapierInitialized = true;
}

export function getRapier(): typeof import('@dimforge/rapier3d') {
  if (!rapierInitialized) {
    throw new Error('Physics not initialized. Call initPhysics() first.');
  }
  return RAPIER;
}

// Type aliases for cleaner code
type RigidBody = import('@dimforge/rapier3d').RigidBody;
type Collider = import('@dimforge/rapier3d').Collider;
type World = import('@dimforge/rapier3d').World;

export class PhysicsWorld {
  private world: World;
  private bodies: Map<string, RigidBody> = new Map();
  private colliders: Map<string, Collider> = new Map();
  
  constructor() {
    if (!rapierInitialized) {
      throw new Error('Physics not initialized. Call initPhysics() first.');
    }
    const gravity = { x: 0.0, y: -20.0, z: 0.0 };
    this.world = new RAPIER.World(gravity);
  }
  
  step(dt: number): void {
    this.world.timestep = dt;
    this.world.step();
  }
  
  createDynamicBody(
    id: string,
    position: THREE.Vector3,
    mass: number = 1.0
  ): RigidBody {
    const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(position.x, position.y, position.z)
      .setLinearDamping(0.5)
      .setAngularDamping(2.0);
    
    const body = this.world.createRigidBody(bodyDesc);
    body.setAdditionalMass(mass, true);
    this.bodies.set(id, body);
    
    return body;
  }
  
  createKinematicBody(
    id: string,
    position: THREE.Vector3
  ): RigidBody {
    const bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
      .setTranslation(position.x, position.y, position.z);
    
    const body = this.world.createRigidBody(bodyDesc);
    this.bodies.set(id, body);
    
    return body;
  }
  
  createStaticBody(id: string, position: THREE.Vector3): RigidBody {
    const bodyDesc = RAPIER.RigidBodyDesc.fixed()
      .setTranslation(position.x, position.y, position.z);
    
    const body = this.world.createRigidBody(bodyDesc);
    this.bodies.set(id, body);
    
    return body;
  }
  
  addBoxCollider(
    body: RigidBody,
    id: string,
    halfExtents: THREE.Vector3,
    offset?: THREE.Vector3
  ): Collider {
    const colliderDesc = RAPIER.ColliderDesc.cuboid(
      halfExtents.x,
      halfExtents.y,
      halfExtents.z
    );
    
    if (offset) {
      colliderDesc.setTranslation(offset.x, offset.y, offset.z);
    }
    
    colliderDesc.setFriction(0.7);
    colliderDesc.setRestitution(0.1);
    
    const collider = this.world.createCollider(colliderDesc, body);
    this.colliders.set(id, collider);
    
    return collider;
  }
  
  addCapsuleCollider(
    body: RigidBody,
    id: string,
    halfHeight: number,
    radius: number,
    offset?: THREE.Vector3
  ): Collider {
    const colliderDesc = RAPIER.ColliderDesc.capsule(halfHeight, radius);
    
    if (offset) {
      colliderDesc.setTranslation(offset.x, offset.y, offset.z);
    }
    
    colliderDesc.setFriction(0.5);
    colliderDesc.setRestitution(0.0);
    
    const collider = this.world.createCollider(colliderDesc, body);
    this.colliders.set(id, collider);
    
    return collider;
  }
  
  addHeightfieldCollider(
    body: RigidBody,
    id: string,
    heights: Float32Array,
    rows: number,
    cols: number,
    scale: THREE.Vector3
  ): Collider {
    const colliderDesc = RAPIER.ColliderDesc.heightfield(
      rows - 1,
      cols - 1,
      heights,
      { x: scale.x, y: scale.y, z: scale.z }
    );
    
    colliderDesc.setFriction(0.8);
    colliderDesc.setRestitution(0.0);
    
    const collider = this.world.createCollider(colliderDesc, body);
    this.colliders.set(id, collider);
    
    return collider;
  }
  
  addTrimeshCollider(
    body: RigidBody,
    id: string,
    vertices: Float32Array,
    indices: Uint32Array
  ): Collider | null {
    const colliderDesc = RAPIER.ColliderDesc.trimesh(vertices, indices);
    
    if (!colliderDesc) {
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/dcc429e4-22aa-4df5-a72d-c19fdddc0775',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'PhysicsWorld.ts:addTrimeshCollider',message:'FAILED to create trimesh collider',data:{id,vertexCount:vertices.length/3,indexCount:indices.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
      return null;
    }
    
    colliderDesc.setFriction(0.8);
    colliderDesc.setRestitution(0.0);
    
    const collider = this.world.createCollider(colliderDesc, body);
    this.colliders.set(id, collider);
    
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/dcc429e4-22aa-4df5-a72d-c19fdddc0775',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'PhysicsWorld.ts:addTrimeshCollider',message:'Trimesh collider created',data:{id,vertexCount:vertices.length/3,indexCount:indices.length,colliderHandle:collider.handle},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    
    return collider;
  }
  
  getBody(id: string): RigidBody | undefined {
    return this.bodies.get(id);
  }
  
  removeBody(id: string): void {
    const body = this.bodies.get(id);
    if (body) {
      this.world.removeRigidBody(body);
      this.bodies.delete(id);
    }
  }
  
  castRay(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    maxDistance: number
  ): { point: THREE.Vector3; normal: THREE.Vector3; distance: number } | null {
    const ray = new RAPIER.Ray(
      { x: origin.x, y: origin.y, z: origin.z },
      { x: direction.x, y: direction.y, z: direction.z }
    );
    
    const hit = this.world.castRay(ray, maxDistance, true);
    
    if (hit) {
      const hitPoint = ray.pointAt(hit.timeOfImpact);
      const normal = hit.collider.castRayAndGetNormal(ray, maxDistance, true);
      
      return {
        point: new THREE.Vector3(hitPoint.x, hitPoint.y, hitPoint.z),
        normal: normal 
          ? new THREE.Vector3(normal.normal.x, normal.normal.y, normal.normal.z)
          : new THREE.Vector3(0, 1, 0),
        distance: hit.timeOfImpact,
      };
    }
    
    return null;
  }
  
  // Check if a point is grounded (for jump detection)
  isGrounded(
    position: THREE.Vector3,
    checkDistance: number = 0.5
  ): boolean {
    const origin = new THREE.Vector3(position.x, position.y + 0.1, position.z);
    const direction = new THREE.Vector3(0, -1, 0);
    
    const hit = this.castRay(origin, direction, checkDistance + 0.1);
    return hit !== null;
  }
  
  getWorld(): World {
    return this.world;
  }
  
  dispose(): void {
    this.world.free();
    this.bodies.clear();
    this.colliders.clear();
  }
}

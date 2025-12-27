import * as THREE from 'three';
import type { Entity, EntityType } from '../types';

export class EntityManager {
  private scene: THREE.Scene;
  private entities: Map<string, Entity> = new Map();
  private entitiesByType: Map<EntityType, Set<string>> = new Map();
  
  constructor(scene: THREE.Scene) {
    this.scene = scene;
    
    // Initialize type sets
    this.entitiesByType.set('mech', new Set());
    this.entitiesByType.set('projectile', new Set());
    this.entitiesByType.set('terrain', new Set());
    this.entitiesByType.set('prop', new Set());
  }
  
  addEntity(entity: Entity): void {
    if (this.entities.has(entity.id)) {
      console.warn(`Entity with id ${entity.id} already exists`);
      return;
    }
    
    this.entities.set(entity.id, entity);
    this.entitiesByType.get(entity.type)?.add(entity.id);
    
    if (entity.mesh) {
      this.scene.add(entity.mesh);
    }
  }
  
  removeEntity(id: string): void {
    const entity = this.entities.get(id);
    if (!entity) return;
    
    if (entity.mesh) {
      this.scene.remove(entity.mesh);
    }
    
    entity.dispose();
    this.entities.delete(id);
    this.entitiesByType.get(entity.type)?.delete(id);
  }
  
  getEntity(id: string): Entity | undefined {
    return this.entities.get(id);
  }
  
  getEntitiesByType(type: EntityType): Entity[] {
    const ids = this.entitiesByType.get(type);
    if (!ids) return [];
    
    return Array.from(ids)
      .map(id => this.entities.get(id))
      .filter((e): e is Entity => e !== undefined);
  }
  
  getAllEntities(): Entity[] {
    return Array.from(this.entities.values());
  }
  
  update(dt: number): void {
    for (const entity of this.entities.values()) {
      entity.update(dt);
    }
  }
  
  // For network synchronization
  getSerializableState(): Map<string, unknown> {
    const state = new Map<string, unknown>();
    
    for (const [id, entity] of this.entities) {
      if ('serialize' in entity && typeof entity.serialize === 'function') {
        state.set(id, entity.serialize());
      }
    }
    
    return state;
  }
  
  dispose(): void {
    for (const entity of this.entities.values()) {
      if (entity.mesh) {
        this.scene.remove(entity.mesh);
      }
      entity.dispose();
    }
    this.entities.clear();
    for (const set of this.entitiesByType.values()) {
      set.clear();
    }
  }
}




import type { Component, ComponentClass } from './Component';
import type { Entity } from './Entity';
import type { System } from './System';

/**
 * The World is the main container for the ECS.
 * It manages entities, systems, and component indices.
 */
export class World {
  private entities: Map<string, Entity> = new Map();
  private systems: System[] = [];
  private componentIndex: Map<string, Set<string>> = new Map();
  private entitiesToRemove: Set<string> = new Set();

  /**
   * Add an entity to the world
   */
  addEntity(entity: Entity): void {
    if (this.entities.has(entity.id)) {
      console.warn(`Entity with id ${entity.id} already exists in world`);
      return;
    }

    this.entities.set(entity.id, entity);
    entity.setWorld(this);

    // Index existing components
    for (const component of entity.getAllComponents()) {
      this.indexComponent(entity.id, component);
    }

    // Notify systems
    for (const system of this.systems) {
      system.onEntityAdded(entity);
    }
  }

  /**
   * Remove an entity from the world (deferred until end of update)
   */
  removeEntity(id: string): void {
    this.entitiesToRemove.add(id);
  }

  /**
   * Immediately remove an entity from the world
   */
  private removeEntityImmediate(id: string): void {
    const entity = this.entities.get(id);
    if (!entity) return;

    // Notify systems
    for (const system of this.systems) {
      system.onEntityRemoved(entity);
    }

    // Remove from component indices
    for (const component of entity.getAllComponents()) {
      this.removeFromIndex(id, component);
    }

    entity.setWorld(null);
    this.entities.delete(id);
  }

  /**
   * Get an entity by ID
   */
  getEntity(id: string): Entity | undefined {
    return this.entities.get(id);
  }

  /**
   * Get all entities in the world
   */
  getAllEntities(): Entity[] {
    return Array.from(this.entities.values());
  }

  /**
   * Add a system to the world
   */
  addSystem(system: System): void {
    system.setWorld(this);
    this.systems.push(system);
    system.init();
  }

  /**
   * Get a system by its class
   */
  getSystem<T extends System>(
    systemClass: new (...args: unknown[]) => T
  ): T | undefined {
    return this.systems.find((s) => s instanceof systemClass) as T | undefined;
  }

  /**
   * Update all systems
   */
  update(dt: number): void {
    // Update all systems
    for (const system of this.systems) {
      system.update(dt);
    }

    // Process deferred entity removals
    for (const id of this.entitiesToRemove) {
      this.removeEntityImmediate(id);
    }
    this.entitiesToRemove.clear();
  }

  /**
   * Get all entities that have all the specified components
   */
  getEntitiesWithComponents(...componentClasses: ComponentClass[]): Entity[] {
    if (componentClasses.length === 0) {
      return this.getAllEntities();
    }

    // Start with entities that have the first component
    const firstType = componentClasses[0].type;
    const candidateIds = this.componentIndex.get(firstType);

    if (!candidateIds || candidateIds.size === 0) {
      return [];
    }

    // Filter to entities that have all required components
    const results: Entity[] = [];
    for (const id of candidateIds) {
      const entity = this.entities.get(id);
      if (entity && entity.hasComponents(...componentClasses)) {
        results.push(entity);
      }
    }

    return results;
  }

  /**
   * Called when a component is added to an entity
   */
  onComponentAdded(entity: Entity, component: Component): void {
    this.indexComponent(entity.id, component);
  }

  /**
   * Called when a component is removed from an entity
   */
  onComponentRemoved(entity: Entity, component: Component): void {
    this.removeFromIndex(entity.id, component);
  }

  /**
   * Add entity to component index
   */
  private indexComponent(entityId: string, component: Component): void {
    let index = this.componentIndex.get(component.type);
    if (!index) {
      index = new Set();
      this.componentIndex.set(component.type, index);
    }
    index.add(entityId);
  }

  /**
   * Remove entity from component index
   */
  private removeFromIndex(entityId: string, component: Component): void {
    this.componentIndex.get(component.type)?.delete(entityId);
  }

  /**
   * Get the number of entities in the world
   */
  get entityCount(): number {
    return this.entities.size;
  }

  /**
   * Clean up the world
   */
  dispose(): void {
    // Dispose all systems
    for (const system of this.systems) {
      system.dispose();
    }
    this.systems = [];

    // Clear all entities
    for (const entity of this.entities.values()) {
      entity.clearComponents();
      entity.setWorld(null);
    }
    this.entities.clear();
    this.componentIndex.clear();
    this.entitiesToRemove.clear();
  }
}

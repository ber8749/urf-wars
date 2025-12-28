import type { ComponentClass } from './Component';
import type { Entity } from './Entity';
import type { World } from './World';

/**
 * Base class for all ECS systems.
 * Systems contain the logic that operates on entities with specific components.
 */
export abstract class System {
  protected world!: World;

  /**
   * Array of component classes that entities must have for this system to process them.
   * Override in subclasses to define required components.
   */
  abstract readonly requiredComponents: ComponentClass[];

  /**
   * Set the world reference (called by World when system is added)
   */
  setWorld(world: World): void {
    this.world = world;
  }

  /**
   * Called once when the system is added to the world.
   * Override for initialization logic.
   */
  init(): void {
    // Override in subclass if needed
  }

  /**
   * Called every frame to update the system.
   * @param dt Delta time in seconds
   */
  abstract update(dt: number): void;

  /**
   * Get all entities that have the required components for this system.
   */
  getEntities(): Entity[] {
    return this.world.getEntitiesWithComponents(...this.requiredComponents);
  }

  /**
   * Called when an entity is added to the world.
   * Override to handle entity addition.
   */
  onEntityAdded(_entity: Entity): void {
    // Override in subclass if needed
  }

  /**
   * Called when an entity is removed from the world.
   * Override to handle entity removal.
   */
  onEntityRemoved(_entity: Entity): void {
    // Override in subclass if needed
  }

  /**
   * Called when the system is removed from the world.
   * Override for cleanup logic.
   */
  dispose(): void {
    // Override in subclass if needed
  }
}

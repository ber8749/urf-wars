import type { Component, ComponentClass } from './Component';
import type { World } from './World';

/**
 * Entity class representing a game object.
 * Entities are containers for components and have a unique ID.
 */
export class Entity {
  readonly id: string;
  private components: Map<string, Component> = new Map();
  private _world: World | null = null;

  constructor(id: string) {
    this.id = id;
  }

  /**
   * Set the world reference (called by World when entity is added)
   */
  setWorld(world: World | null): void {
    this._world = world;
  }

  /**
   * Get the world this entity belongs to
   */
  get world(): World | null {
    return this._world;
  }

  /**
   * Add a component to this entity
   */
  addComponent<T extends Component>(component: T): this {
    this.components.set(component.type, component);
    this._world?.onComponentAdded(this, component);
    return this;
  }

  /**
   * Remove a component from this entity
   */
  removeComponent<T extends Component>(
    componentClass: ComponentClass<T>
  ): this {
    const component = this.components.get(componentClass.type);
    if (component) {
      this.components.delete(componentClass.type);
      this._world?.onComponentRemoved(this, component);
    }
    return this;
  }

  /**
   * Get a component by its class
   */
  getComponent<T extends Component>(
    componentClass: ComponentClass<T>
  ): T | undefined {
    return this.components.get(componentClass.type) as T | undefined;
  }

  /**
   * Check if entity has a specific component
   */
  hasComponent(componentClass: ComponentClass): boolean {
    return this.components.has(componentClass.type);
  }

  /**
   * Check if entity has all specified components
   */
  hasComponents(...componentClasses: ComponentClass[]): boolean {
    return componentClasses.every((c) => this.hasComponent(c));
  }

  /**
   * Get all components on this entity
   */
  getAllComponents(): Component[] {
    return Array.from(this.components.values());
  }

  /**
   * Remove all components from this entity
   */
  clearComponents(): void {
    for (const component of this.components.values()) {
      this._world?.onComponentRemoved(this, component);
    }
    this.components.clear();
  }
}

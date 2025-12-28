/**
 * Base interface for all ECS components.
 * Components are pure data containers with no logic.
 */
export interface Component {
  readonly type: string;
}

/**
 * Type for component class constructors.
 * Used for type-safe component queries.
 */
export type ComponentClass<T extends Component = Component> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  new (...args: any[]): T;
  readonly type: string;
};

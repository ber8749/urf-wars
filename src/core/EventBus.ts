// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EventCallback = (...args: any[]) => void;

/**
 * Simple event bus for cross-system communication.
 * Uses static methods for global access.
 */
export class EventBus {
  private static listeners: Map<string, EventCallback[]> = new Map();

  /**
   * Subscribe to an event
   */
  static on(event: string, callback: EventCallback): void {
    let callbacks = this.listeners.get(event);
    if (!callbacks) {
      callbacks = [];
      this.listeners.set(event, callbacks);
    }
    callbacks.push(callback);
  }

  /**
   * Unsubscribe from an event
   */
  static off(event: string, callback: EventCallback): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Emit an event with optional arguments
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static emit(event: string, ...args: any[]): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      for (const callback of callbacks) {
        try {
          callback(...args);
        } catch (error) {
          console.error(`Error in event listener for "${event}":`, error);
        }
      }
    }
  }

  /**
   * Remove all listeners for an event
   */
  static clearEvent(event: string): void {
    this.listeners.delete(event);
  }

  /**
   * Remove all event listeners
   */
  static clear(): void {
    this.listeners.clear();
  }

  /**
   * Get the number of listeners for an event
   */
  static listenerCount(event: string): number {
    return this.listeners.get(event)?.length ?? 0;
  }
}

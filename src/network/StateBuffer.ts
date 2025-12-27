import type { PlayerState, Vector3Like, EulerLike } from '../types';

interface BufferedState {
  state: PlayerState;
  timestamp: number;
}

/**
 * StateBuffer - Manages state history for interpolation
 * 
 * Used for smooth rendering of remote players by interpolating
 * between received states. This provides a consistent visual
 * experience despite network jitter.
 */
export class StateBuffer {
  private buffers: Map<string, BufferedState[]> = new Map();
  private interpolationDelay: number;
  private maxBufferSize: number = 30;
  
  constructor(interpolationDelayMs: number = 100) {
    this.interpolationDelay = interpolationDelayMs;
  }
  
  /**
   * Add a new state snapshot to the buffer
   */
  addState(playerId: string, state: PlayerState, timestamp: number): void {
    if (!this.buffers.has(playerId)) {
      this.buffers.set(playerId, []);
    }
    
    const buffer = this.buffers.get(playerId)!;
    buffer.push({ state, timestamp });
    
    // Keep buffer size manageable
    while (buffer.length > this.maxBufferSize) {
      buffer.shift();
    }
  }
  
  /**
   * Get interpolated state for a player at the current render time
   */
  getInterpolatedState(playerId: string, renderTime: number): PlayerState | null {
    const buffer = this.buffers.get(playerId);
    if (!buffer || buffer.length < 2) {
      return buffer?.[0]?.state || null;
    }
    
    // Render time is behind real time by interpolation delay
    const targetTime = renderTime - this.interpolationDelay;
    
    // Find the two states to interpolate between
    let beforeState: BufferedState | null = null;
    let afterState: BufferedState | null = null;
    
    for (let i = 0; i < buffer.length - 1; i++) {
      if (buffer[i].timestamp <= targetTime && buffer[i + 1].timestamp >= targetTime) {
        beforeState = buffer[i];
        afterState = buffer[i + 1];
        break;
      }
    }
    
    // If no suitable states found, return latest
    if (!beforeState || !afterState) {
      return buffer[buffer.length - 1].state;
    }
    
    // Calculate interpolation factor
    const timeDiff = afterState.timestamp - beforeState.timestamp;
    const t = timeDiff > 0 ? (targetTime - beforeState.timestamp) / timeDiff : 0;
    
    // Interpolate the state
    return this.lerpState(beforeState.state, afterState.state, t);
  }
  
  /**
   * Interpolate between two player states
   */
  private lerpState(a: PlayerState, b: PlayerState, t: number): PlayerState {
    return {
      id: b.id,
      position: this.lerpVector(a.position, b.position, t),
      rotation: this.lerpEuler(a.rotation, b.rotation, t),
      velocity: this.lerpVector(a.velocity, b.velocity, t),
      heat: this.lerp(a.heat, b.heat, t),
      armor: {
        head: this.lerp(a.armor.head, b.armor.head, t),
        torso: this.lerp(a.armor.torso, b.armor.torso, t),
        leftArm: this.lerp(a.armor.leftArm, b.armor.leftArm, t),
        rightArm: this.lerp(a.armor.rightArm, b.armor.rightArm, t),
        leftLeg: this.lerp(a.armor.leftLeg, b.armor.leftLeg, t),
        rightLeg: this.lerp(a.armor.rightLeg, b.armor.rightLeg, t),
      },
      weapons: b.weapons, // Weapons don't interpolate smoothly
    };
  }
  
  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }
  
  private lerpVector(a: Vector3Like, b: Vector3Like, t: number): Vector3Like {
    return {
      x: this.lerp(a.x, b.x, t),
      y: this.lerp(a.y, b.y, t),
      z: this.lerp(a.z, b.z, t),
    };
  }
  
  private lerpEuler(a: EulerLike, b: EulerLike, t: number): EulerLike {
    // Simple lerp for euler angles (may need slerp for better results)
    return {
      x: this.lerpAngle(a.x, b.x, t),
      y: this.lerpAngle(a.y, b.y, t),
      z: this.lerpAngle(a.z, b.z, t),
    };
  }
  
  private lerpAngle(a: number, b: number, t: number): number {
    // Handle angle wraparound
    let diff = b - a;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return a + diff * t;
  }
  
  /**
   * Remove a player's state buffer
   */
  removePlayer(playerId: string): void {
    this.buffers.delete(playerId);
  }
  
  /**
   * Clear all buffers
   */
  clear(): void {
    this.buffers.clear();
  }
  
  /**
   * Get buffer stats for debugging
   */
  getStats(): Map<string, { size: number; latestTimestamp: number }> {
    const stats = new Map<string, { size: number; latestTimestamp: number }>();
    
    for (const [id, buffer] of this.buffers) {
      stats.set(id, {
        size: buffer.length,
        latestTimestamp: buffer[buffer.length - 1]?.timestamp || 0,
      });
    }
    
    return stats;
  }
}

/**
 * Input Prediction Buffer
 * 
 * Stores unacknowledged inputs for client-side prediction.
 * When server confirms an input, we can discard it and reconcile
 * any differences between predicted and actual state.
 */
export class InputBuffer {
  private inputs: Map<number, { input: object; predictedState: object }> = new Map();
  private nextInputId: number = 0;
  
  /**
   * Store an input with its predicted resulting state
   */
  addInput(input: object, predictedState: object): number {
    const inputId = this.nextInputId++;
    this.inputs.set(inputId, { input, predictedState });
    return inputId;
  }
  
  /**
   * Remove acknowledged inputs and return any that need reconciliation
   */
  acknowledgeInput(inputId: number, _actualState: object): object[] {
    const unacknowledged: object[] = [];
    
    // Remove all inputs up to and including the acknowledged one
    for (const [id, data] of this.inputs) {
      if (id <= inputId) {
        this.inputs.delete(id);
      } else {
        unacknowledged.push(data.input);
      }
    }
    
    return unacknowledged;
  }
  
  /**
   * Get all pending inputs for re-simulation
   */
  getPendingInputs(): object[] {
    return Array.from(this.inputs.values()).map(data => data.input);
  }
  
  /**
   * Clear all inputs
   */
  clear(): void {
    this.inputs.clear();
    this.nextInputId = 0;
  }
  
  get size(): number {
    return this.inputs.size;
  }
}


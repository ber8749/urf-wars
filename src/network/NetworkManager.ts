import type { NetworkMessage, PlayerState, InputSnapshot } from '../types';
import { StateBuffer } from './StateBuffer';

export type ConnectionState = 'disconnected' | 'connecting' | 'connected';

export interface NetworkConfig {
  serverUrl?: string;
  tickRate?: number;
  interpolationDelay?: number;
}

/**
 * NetworkManager - Stub for future multiplayer implementation
 * 
 * This provides the interface and basic structure for client-server
 * communication. When implementing multiplayer:
 * 
 * 1. Replace WebSocket stub with actual connection
 * 2. Implement server-side game state authority
 * 3. Add client-side prediction and reconciliation
 * 4. Implement lag compensation for hit detection
 */
export class NetworkManager {
  private config: NetworkConfig;
  private connectionState: ConnectionState = 'disconnected';
  private socket: WebSocket | null = null;
  
  // Player data
  private localPlayerId: string | null = null;
  private remotePlayers: Map<string, PlayerState> = new Map();
  
  // State management
  private stateBuffer: StateBuffer;
  private pendingInputs: InputSnapshot[] = [];
  
  // Callbacks
  public onConnect?: () => void;
  public onDisconnect?: () => void;
  public onPlayerJoin?: (playerId: string) => void;
  public onPlayerLeave?: (playerId: string) => void;
  public onStateUpdate?: (states: Map<string, PlayerState>) => void;
  public onError?: (error: Error) => void;
  
  // Timing
  private serverTime: number = 0;
  private clientTime: number = 0;
  private pingMs: number = 0;
  private lastPingTime: number = 0;
  
  constructor(config: NetworkConfig = {}) {
    this.config = {
      serverUrl: config.serverUrl || 'ws://localhost:8080',
      tickRate: config.tickRate || 60,
      interpolationDelay: config.interpolationDelay || 100, // ms
    };
    
    this.stateBuffer = new StateBuffer(this.config.interpolationDelay);
  }
  
  /**
   * Connect to game server
   * STUB: Currently does nothing - implement with actual WebSocket
   */
  async connect(): Promise<void> {
    if (this.connectionState !== 'disconnected') {
      return;
    }
    
    this.connectionState = 'connecting';
    
    // STUB: Replace with actual WebSocket connection
    console.log('[Network] Connection stub - multiplayer not yet implemented');
    console.log(`[Network] Would connect to: ${this.config.serverUrl}`);
    
    // Simulate connection for development
    // In production, this would be:
    // this.socket = new WebSocket(this.config.serverUrl);
    // this.setupSocketHandlers();
    
    // For now, stay disconnected
    this.connectionState = 'disconnected';
  }
  
  /**
   * Disconnect from server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    
    this.connectionState = 'disconnected';
    this.localPlayerId = null;
    this.remotePlayers.clear();
    this.pendingInputs = [];
    
    this.onDisconnect?.();
  }
  
  /**
   * Send input to server
   * STUB: Inputs are stored but not sent
   */
  sendInput(input: InputSnapshot): void {
    if (this.connectionState !== 'connected') {
      return;
    }
    
    // Store for client-side prediction reconciliation
    this.pendingInputs.push(input);
    
    // Limit pending inputs buffer
    if (this.pendingInputs.length > 60) {
      this.pendingInputs.shift();
    }
    
    // STUB: Would send to server
    // this.send({ type: 'input', payload: input });
  }
  
  /**
   * Send local player state to server
   * STUB: State is not actually sent
   */
  sendState(_state: PlayerState): void {
    if (this.connectionState !== 'connected') {
      return;
    }
    
    // STUB: Would send to server
    // this.send({ type: 'state', payload: state });
  }
  
  /**
   * Get interpolated state for a remote player
   */
  getInterpolatedState(playerId: string): PlayerState | null {
    return this.stateBuffer.getInterpolatedState(playerId, this.clientTime);
  }
  
  /**
   * Get all remote player IDs
   */
  getRemotePlayerIds(): string[] {
    return Array.from(this.remotePlayers.keys());
  }
  
  /**
   * Check if a player exists
   */
  hasPlayer(playerId: string): boolean {
    return playerId === this.localPlayerId || this.remotePlayers.has(playerId);
  }
  
  // Private methods
  
  /* istanbul ignore next */
  private setupSocketHandlers(): void {
    if (!this.socket) return;
    
    this.socket.onopen = () => {
      this.connectionState = 'connected';
      this.onConnect?.();
      this.startPing();
    };
    
    this.socket.onclose = () => {
      this.connectionState = 'disconnected';
      this.onDisconnect?.();
    };
    
    this.socket.onerror = (error) => {
      this.onError?.(new Error('WebSocket error'));
      console.error('[Network] WebSocket error:', error);
    };
    
    this.socket.onmessage = (event) => {
      try {
        const message: NetworkMessage = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (e) {
        console.error('[Network] Failed to parse message:', e);
      }
    };
  }
  
  private handleMessage(message: NetworkMessage): void {
    switch (message.type) {
      case 'welcome':
        this.handleWelcome(message.payload as { playerId: string; serverTime: number });
        break;
        
      case 'playerJoin':
        this.handlePlayerJoin(message.payload as { playerId: string });
        break;
        
      case 'playerLeave':
        this.handlePlayerLeave(message.payload as { playerId: string });
        break;
        
      case 'stateUpdate':
        this.handleStateUpdate(message.payload as { states: Record<string, PlayerState> });
        break;
        
      case 'pong':
        this.handlePong(message.timestamp);
        break;
        
      default:
        console.warn('[Network] Unknown message type:', message.type);
    }
  }
  
  private handleWelcome(payload: { playerId: string; serverTime: number }): void {
    this.localPlayerId = payload.playerId;
    this.serverTime = payload.serverTime;
    console.log(`[Network] Connected as player: ${this.localPlayerId}`);
  }
  
  private handlePlayerJoin(payload: { playerId: string }): void {
    console.log(`[Network] Player joined: ${payload.playerId}`);
    this.onPlayerJoin?.(payload.playerId);
  }
  
  private handlePlayerLeave(payload: { playerId: string }): void {
    this.remotePlayers.delete(payload.playerId);
    console.log(`[Network] Player left: ${payload.playerId}`);
    this.onPlayerLeave?.(payload.playerId);
  }
  
  private handleStateUpdate(payload: { states: Record<string, PlayerState> }): void {
    const states = new Map<string, PlayerState>();
    
    for (const [id, state] of Object.entries(payload.states)) {
      if (id !== this.localPlayerId) {
        this.remotePlayers.set(id, state);
        this.stateBuffer.addState(id, state, this.serverTime);
        states.set(id, state);
      }
    }
    
    this.onStateUpdate?.(states);
  }
  
  private handlePong(serverTimestamp: number): void {
    const now = performance.now();
    this.pingMs = now - this.lastPingTime;
    this.serverTime = serverTimestamp + this.pingMs / 2;
  }
  
  private send(message: NetworkMessage): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    }
  }
  
  private startPing(): void {
    setInterval(() => {
      if (this.connectionState === 'connected') {
        this.lastPingTime = performance.now();
        this.send({ type: 'ping', timestamp: this.lastPingTime, payload: null });
      }
    }, 1000);
  }
  
  // Update timing - call once per frame
  update(dt: number): void {
    this.clientTime += dt * 1000; // Convert to ms
  }
  
  // Getters
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }
  
  getLocalPlayerId(): string | null {
    return this.localPlayerId;
  }
  
  getPing(): number {
    return this.pingMs;
  }
  
  isConnected(): boolean {
    return this.connectionState === 'connected';
  }
  
  dispose(): void {
    this.disconnect();
  }
}


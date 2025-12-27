import type { InputSnapshot } from '../types';

export class InputManager {
  private container: HTMLElement;
  private keys: Map<string, boolean> = new Map();
  private mouseX: number = 0;
  private mouseY: number = 0;
  private mouseDeltaX: number = 0;
  private mouseDeltaY: number = 0;
  private mouseButtons: Map<number, boolean> = new Map();
  private weaponSlot: number = 1;
  private isLocked: boolean = false;
  
  // For network - stores the last snapshot
  private currentSnapshot: InputSnapshot;
  
  constructor(container: HTMLElement) {
    this.container = container;
    this.currentSnapshot = this.createEmptySnapshot();
    this.setupEventListeners();
  }
  
  private createEmptySnapshot(): InputSnapshot {
    return {
      timestamp: performance.now(),
      // Movement (WASD)
      forward: false,
      backward: false,
      strafeLeft: false,
      strafeRight: false,
      // Torso/Head control (Arrow keys)
      torsoLeft: false,
      torsoRight: false,
      lookUp: false,
      lookDown: false,
      // Actions
      jump: false,
      fire: false,
      altFire: false,
      // Mouse
      mouseX: 0,
      mouseY: 0,
      mouseDeltaX: 0,
      mouseDeltaY: 0,
      weaponSlot: 1,
    };
  }
  
  private setupEventListeners(): void {
    // Keyboard events
    window.addEventListener('keydown', this.onKeyDown.bind(this));
    window.addEventListener('keyup', this.onKeyUp.bind(this));
    
    // Mouse events
    window.addEventListener('mousemove', this.onMouseMove.bind(this));
    window.addEventListener('mousedown', this.onMouseDown.bind(this));
    window.addEventListener('mouseup', this.onMouseUp.bind(this));
    
    // Pointer lock - only request on user click (required by browsers)
    this.container.addEventListener('click', () => {
      if (!this.isLocked) {
        this.container.requestPointerLock().catch(() => {
          // Silently fail if pointer lock is denied
        });
      }
    });
    
    document.addEventListener('pointerlockchange', () => {
      this.isLocked = document.pointerLockElement === this.container;
      
      // Hide/show click prompt
      const prompt = document.getElementById('click-prompt');
      if (prompt) {
        prompt.classList.toggle('hidden', this.isLocked);
      }
    });
  }
  
  private onKeyDown(event: KeyboardEvent): void {
    this.keys.set(event.code, true);
    
    // Weapon slot selection
    if (event.code >= 'Digit1' && event.code <= 'Digit4') {
      this.weaponSlot = parseInt(event.code.replace('Digit', ''));
    }
  }
  
  private onKeyUp(event: KeyboardEvent): void {
    this.keys.set(event.code, false);
  }
  
  private onMouseMove(event: MouseEvent): void {
    if (this.isLocked) {
      this.mouseDeltaX += event.movementX;
      this.mouseDeltaY += event.movementY;
    }
    this.mouseX = event.clientX;
    this.mouseY = event.clientY;
  }
  
  private onMouseDown(event: MouseEvent): void {
    this.mouseButtons.set(event.button, true);
  }
  
  private onMouseUp(event: MouseEvent): void {
    this.mouseButtons.set(event.button, false);
  }
  
  lock(): void {
    // Only works after user gesture
    this.container.requestPointerLock().catch(() => {
      // Silently fail - pointer lock requires user gesture
    });
  }
  
  unlock(): void {
    document.exitPointerLock();
  }
  
  isPointerLocked(): boolean {
    return this.isLocked;
  }
  
  // Call once per fixed update
  update(): void {
    this.currentSnapshot = {
      timestamp: performance.now(),
      // Movement: WASD
      forward: this.keys.get('KeyW') || false,
      backward: this.keys.get('KeyS') || false,
      strafeLeft: this.keys.get('KeyA') || false,
      strafeRight: this.keys.get('KeyD') || false,
      // Torso/Head: Arrow keys
      torsoLeft: this.keys.get('ArrowLeft') || false,
      torsoRight: this.keys.get('ArrowRight') || false,
      lookUp: this.keys.get('ArrowUp') || false,
      lookDown: this.keys.get('ArrowDown') || false,
      // Actions
      jump: this.keys.get('Space') || false,
      fire: this.mouseButtons.get(0) || false,
      altFire: this.mouseButtons.get(2) || false,
      // Mouse
      mouseX: this.mouseX,
      mouseY: this.mouseY,
      mouseDeltaX: this.mouseDeltaX,
      mouseDeltaY: this.mouseDeltaY,
      weaponSlot: this.weaponSlot,
    };
    
    // Reset mouse delta after capturing
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
  }
  
  getSnapshot(): InputSnapshot {
    return { ...this.currentSnapshot };
  }
  
  // Direct key checks for non-networked actions
  isKeyPressed(code: string): boolean {
    return this.keys.get(code) || false;
  }
  
  isKeyJustPressed(code: string): boolean {
    // For edge detection, we'd need previous frame state
    // For now, just return current state
    return this.keys.get(code) || false;
  }
  
  getMouseDelta(): { x: number; y: number } {
    return {
      x: this.currentSnapshot.mouseDeltaX,
      y: this.currentSnapshot.mouseDeltaY,
    };
  }
  
  dispose(): void {
    this.unlock();
  }
}


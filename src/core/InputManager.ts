import type { InputState } from '../types';

export class InputManager {
  private keys: Set<string> = new Set();
  private mouseButtons: Set<number> = new Set();
  private mouseX = 0;
  private mouseY = 0;
  private mouseDeltaX = 0;
  private mouseDeltaY = 0;
  private isPointerLocked = false;
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Keyboard events
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      // Prevent default for game keys
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyV', 'KeyC', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });

    // Mouse events
    window.addEventListener('mousedown', (e) => {
      this.mouseButtons.add(e.button);
      // Request pointer lock on click
      if (!this.isPointerLocked) {
        this.canvas.requestPointerLock();
      }
    });

    window.addEventListener('mouseup', (e) => {
      this.mouseButtons.delete(e.button);
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isPointerLocked) {
        this.mouseDeltaX += e.movementX;
        this.mouseDeltaY += e.movementY;
      }
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
    });

    // Pointer lock events
    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === this.canvas;
    });

    // Prevent context menu on right click
    window.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  getState(): InputState {
    return {
      forward: this.keys.has('KeyW'),
      backward: this.keys.has('KeyS'),
      strafeLeft: this.keys.has('KeyA'),
      strafeRight: this.keys.has('KeyD'),
      fire1: this.mouseButtons.has(0), // Left click
      fire2: this.mouseButtons.has(2), // Right click
      switchCamera: this.keys.has('KeyV'),
      toggleControls: this.keys.has('KeyC'),
      mouseX: this.mouseX,
      mouseY: this.mouseY,
      mouseDeltaX: this.mouseDeltaX,
      mouseDeltaY: this.mouseDeltaY,
    };
  }

  // Call this after processing input each frame
  resetDeltas(): void {
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
  }

  // Check if a key was just pressed (for one-shot actions)
  private previousKeys: Set<string> = new Set();
  
  wasKeyJustPressed(code: string): boolean {
    return this.keys.has(code) && !this.previousKeys.has(code);
  }

  // Call at end of frame to track previous state
  endFrame(): void {
    this.previousKeys = new Set(this.keys);
    this.resetDeltas();
  }

  isLocked(): boolean {
    return this.isPointerLocked;
  }
}

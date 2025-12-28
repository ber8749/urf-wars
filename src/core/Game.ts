import * as THREE from 'three';
import { InputManager } from './InputManager';
import { Mech } from '../mech/Mech';
import { MechController } from '../mech/MechController';
import { CameraController } from '../camera/CameraController';
import { Arena } from '../world/Arena';
import { WeaponSystem } from '../weapons/WeaponSystem';
import { DamageSystem } from '../combat/DamageSystem';
import { HUD } from '../hud/HUD';
import { TargetDummy } from '../world/TargetDummy';
import { COLORS } from '../types';

export class Game {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private inputManager: InputManager;
  private cameraController: CameraController;
  private arena: Arena;
  private playerMech: Mech;
  private mechController: MechController;
  private weaponSystem: WeaponSystem;
  private damageSystem: DamageSystem;
  private hud: HUD;
  private targets: TargetDummy[] = [];

  // Fixed timestep
  private readonly TICK_RATE = 60;
  private readonly TICK_DELTA = 1 / this.TICK_RATE;
  private accumulator = 0;
  private lastTime = 0;

  constructor(canvas: HTMLCanvasElement) {
    // Setup renderer
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Setup scene
    this.scene = new THREE.Scene();
    this.setupSkybox();
    this.setupLighting();

    // Setup camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );

    // Setup input
    this.inputManager = new InputManager(canvas);

    // Create arena
    this.arena = new Arena(this.scene);

    // Create player mech
    this.playerMech = new Mech('Player', true);
    this.playerMech.mesh.position.set(0, 0, 0);
    this.scene.add(this.playerMech.mesh);

    // Setup damage system
    this.damageSystem = new DamageSystem();

    // Setup weapon system
    this.weaponSystem = new WeaponSystem(this.scene, this.damageSystem);
    this.weaponSystem.setupMechWeapons(this.playerMech);

    // Setup mech controller (pass camera for aim raycasting)
    this.mechController = new MechController(
      this.playerMech, 
      this.inputManager, 
      this.weaponSystem,
      this.camera
    );

    // Setup camera controller
    this.cameraController = new CameraController(this.camera, this.playerMech, this.inputManager);

    // Create target dummies
    this.createTargets();

    // Setup HUD
    this.hud = new HUD(this.playerMech);
    this.hud.setWeaponSystem(this.weaponSystem);

    // Handle resize
    window.addEventListener('resize', this.onResize.bind(this));
  }

  private setupSkybox(): void {
    // Create gradient sky using a large sphere
    const skyGeo = new THREE.SphereGeometry(1000, 32, 32);
    const skyMat = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(COLORS.skyTop) },
        bottomColor: { value: new THREE.Color(COLORS.skyBottom) },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition).y;
          gl_FragColor = vec4(mix(bottomColor, topColor, max(h, 0.0)), 1.0);
        }
      `,
      side: THREE.BackSide,
    });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(sky);
  }

  private setupLighting(): void {
    // Ambient light
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambient);

    // Directional light (sun)
    const sun = new THREE.DirectionalLight(0xffffff, 1.0);
    sun.position.set(100, 200, 100);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 10;
    sun.shadow.camera.far = 500;
    sun.shadow.camera.left = -200;
    sun.shadow.camera.right = 200;
    sun.shadow.camera.top = 200;
    sun.shadow.camera.bottom = -200;
    this.scene.add(sun);
  }

  private createTargets(): void {
    // Create target dummies in the arena
    const targetPositions = [
      new THREE.Vector3(0, 0, -80),
      new THREE.Vector3(-30, 0, -80),
      new THREE.Vector3(30, 0, -80),
    ];

    for (const pos of targetPositions) {
      const target = new TargetDummy(pos);
      this.targets.push(target);
      this.scene.add(target.mesh);
      this.damageSystem.registerTarget(target);
      this.weaponSystem.addTarget(target);
    }
    
    // Add arena obstacles as potential laser targets
    for (const obstacle of this.arena.getObstacles()) {
      this.weaponSystem.addObstacle(obstacle);
    }
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  start(): void {
    this.lastTime = performance.now();
    this.gameLoop();
  }

  private gameLoop(): void {
    requestAnimationFrame(() => this.gameLoop());

    const currentTime = performance.now();
    const frameTime = (currentTime - this.lastTime) / 1000; // Convert to seconds
    this.lastTime = currentTime;

    // Cap frame time to prevent spiral of death
    this.accumulator += Math.min(frameTime, 0.25);

    // Fixed timestep updates
    while (this.accumulator >= this.TICK_DELTA) {
      this.update(this.TICK_DELTA);
      this.accumulator -= this.TICK_DELTA;
    }

    // Render
    this.render();

    // End frame input processing
    this.inputManager.endFrame();
  }

  private update(dt: number): void {
    // Update mech controller (handles input -> mech actions)
    this.mechController.update(dt);

    // Update weapon system (projectiles, cooldowns)
    this.weaponSystem.update(dt);

    // Update camera
    this.cameraController.update(dt);

    // Update targets
    for (const target of this.targets) {
      target.update(dt);
    }

    // Update HUD
    this.hud.update();
  }

  private render(): void {
    this.renderer.render(this.scene, this.camera);
  }
}


import * as THREE from 'three';
import { World } from './World';
import { InputManager } from './InputManager';
import { PhysicsWorld, initPhysics } from '../physics/PhysicsWorld';
import { Skybox } from '../world/Skybox';
import { HUD } from '../rendering/HUD';
import { PostProcessing } from '../rendering/PostProcessing';
import { SoundManager } from '../audio/SoundManager';

// Import systems
import {
  InputSystem,
  MovementSystem,
  PhysicsSystem,
  HeatSystem,
  WeaponSystem,
  ProjectileSystem,
  RenderSystem,
  CameraSystem,
  MechAnimationSystem,
  AudioSystem,
  TerrainSystem,
  DayNightSystem,
} from '../systems';

// Import archetypes and config
import { createMech } from '../archetypes/createMech';
import { MechConfigs } from '../config/MechConfigs';

// Import components for HUD access
import { HeatComponent } from '../components/HeatComponent';
import { PhysicsComponent } from '../components/PhysicsComponent';
import { MechComponent } from '../components/MechComponent';
import { WeaponComponent } from '../components/WeaponComponent';
import { HealthComponent } from '../components/HealthComponent';
import type { Entity } from './Entity';

export class Game {
  private container: HTMLElement;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;

  private world!: World;
  private inputManager!: InputManager;
  private physicsWorld!: PhysicsWorld;
  private soundManager!: SoundManager;

  private playerEntity!: Entity;
  private hud!: HUD;
  private postProcessing!: PostProcessing;
  private skybox!: Skybox;

  // Lights (stored for day/night cycle updates)
  private sunLight!: THREE.DirectionalLight;
  private ambientLight!: THREE.AmbientLight;
  private hemiLight!: THREE.HemisphereLight;

  // Systems that need special access
  private cameraSystem!: CameraSystem;
  private renderSystem!: RenderSystem;
  private terrainSystem!: TerrainSystem;

  private lastTime: number = 0;
  private accumulator: number = 0;
  private readonly FIXED_TIMESTEP: number = 1 / 60;
  private isRunning: boolean = false;
  private audioInitialized: boolean = false;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  async init(): Promise<void> {
    // Initialize Rapier WASM
    await initPhysics();

    // Setup Three.js
    this.setupRenderer();
    this.setupScene();
    this.setupLighting();

    // Setup core services
    this.inputManager = new InputManager(this.container);
    this.physicsWorld = new PhysicsWorld();
    this.soundManager = new SoundManager();
    this.camera.add(this.soundManager.getListener());

    // Create ECS world
    this.world = new World();

    // Create skybox (needed for DayNightSystem)
    this.skybox = new Skybox(this.scene);

    // Register systems in correct order
    this.world.addSystem(new InputSystem(this.inputManager));
    this.world.addSystem(new MovementSystem(this.physicsWorld));
    this.world.addSystem(new PhysicsSystem(this.physicsWorld));
    this.world.addSystem(new HeatSystem());
    this.world.addSystem(new WeaponSystem(this.scene));
    this.world.addSystem(new ProjectileSystem(this.scene));
    this.world.addSystem(new MechAnimationSystem());

    this.renderSystem = new RenderSystem(this.scene);
    this.world.addSystem(this.renderSystem);

    this.cameraSystem = new CameraSystem(this.camera);
    this.world.addSystem(this.cameraSystem);

    this.world.addSystem(new AudioSystem(this.soundManager));

    this.terrainSystem = new TerrainSystem(this.scene, this.physicsWorld);
    this.world.addSystem(this.terrainSystem);

    this.world.addSystem(
      new DayNightSystem(
        this.scene,
        this.skybox,
        this.sunLight,
        this.ambientLight,
        this.hemiLight
      )
    );

    // Get initial terrain height for spawn
    const terrainHeight = this.terrainSystem.getHeightAt(0, 0);
    const spawnHeight = terrainHeight + 15;

    // Create player mech entity
    this.playerEntity = createMech(
      'player-1',
      MechConfigs.ATLAS,
      this.physicsWorld,
      new THREE.Vector3(0, spawnHeight, 0),
      true
    );
    this.world.addEntity(this.playerEntity);

    // Setup HUD with entity reference wrapper
    this.hud = new HUD(this.container, this.createMechInterface());

    // Setup post processing
    this.postProcessing = new PostProcessing(
      this.renderer,
      this.scene,
      this.camera
    );

    // Handle window resize
    window.addEventListener('resize', this.onResize.bind(this));
  }

  /**
   * Create an interface compatible with the existing HUD
   */
  private createMechInterface() {
    const entity = this.playerEntity;
    const cameraSystem = this.cameraSystem;

    return {
      getHeatSystem: () => {
        const heat = entity.getComponent(HeatComponent);
        return {
          getCurrentHeat: () => heat?.current ?? 0,
          getMaxHeat: () => heat?.max ?? 100,
          isOverheated: () => heat?.isOverheated ?? false,
        };
      },
      getSpeed: () => {
        const physics = entity.getComponent(PhysicsComponent);
        return physics?.getHorizontalSpeed() ?? 0;
      },
      getMaxSpeed: () => {
        const mech = entity.getComponent(MechComponent);
        return mech?.config.maxSpeed ?? 25;
      },
      getWeaponSystem: () => {
        const weapons = entity.getComponent(WeaponComponent);
        return {
          getSelectedSlot: () => weapons?.selectedSlot ?? 1,
          getWeapons: () =>
            (weapons?.weapons ?? []).map((w) => ({
              slot: w.slot,
              config: { type: w.config.type },
              cooldownRemaining: w.cooldownRemaining,
              ammo: w.ammo,
            })),
        };
      },
      getArmorStatus: () => {
        const health = entity.getComponent(HealthComponent);
        const baseArmor = health?.baseArmor ?? {
          head: 100,
          torso: 100,
          leftArm: 100,
          rightArm: 100,
          leftLeg: 100,
          rightLeg: 100,
        };
        const armor = health?.armor ?? baseArmor;
        return {
          head: Math.round((armor.head / baseArmor.head) * 100),
          torso: Math.round((armor.torso / baseArmor.torso) * 100),
          leftArm: Math.round((armor.leftArm / baseArmor.leftArm) * 100),
          rightArm: Math.round((armor.rightArm / baseArmor.rightArm) * 100),
          leftLeg: Math.round((armor.leftLeg / baseArmor.leftLeg) * 100),
          rightLeg: Math.round((armor.rightLeg / baseArmor.rightLeg) * 100),
        };
      },
      getCameraController: () => ({
        isFirstPerson: () => cameraSystem.isFirstPerson(),
      }),
    };
  }

  private setupRenderer(): void {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 3.0;
    this.container.appendChild(this.renderer.domElement);
  }

  private setupScene(): void {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x889999, 0.0005);

    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );
    this.camera.position.set(0, 15, 30);
  }

  private setupLighting(): void {
    // Ambient light for base illumination
    this.ambientLight = new THREE.AmbientLight(0xccddff, 2.0);
    this.scene.add(this.ambientLight);

    // Main directional light (sun/moon)
    this.sunLight = new THREE.DirectionalLight(0xffffff, 5.0);
    this.sunLight.position.set(100, 200, 100);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 500;
    this.sunLight.shadow.camera.left = -150;
    this.sunLight.shadow.camera.right = 150;
    this.sunLight.shadow.camera.top = 150;
    this.sunLight.shadow.camera.bottom = -150;
    this.sunLight.shadow.bias = -0.0005;
    this.scene.add(this.sunLight);

    // Hemisphere light for sky/ground color variation
    this.hemiLight = new THREE.HemisphereLight(0xeeffff, 0xccbbaa, 1.5);
    this.scene.add(this.hemiLight);
  }

  start(): void {
    this.isRunning = true;
    this.lastTime = performance.now();
    this.gameLoop();

    // Initialize audio on first user interaction
    this.container.addEventListener('click', () => this.initAudio(), {
      once: false,
    });
  }

  private async initAudio(): Promise<void> {
    if (this.audioInitialized) {
      await this.soundManager.resume();
      return;
    }

    await this.soundManager.init();
    this.audioInitialized = true;
    this.soundManager.startCockpitAmbience();
  }

  stop(): void {
    this.isRunning = false;
  }

  private gameLoop(): void {
    if (!this.isRunning) return;

    requestAnimationFrame(() => this.gameLoop());

    const currentTime = performance.now();
    const frameTime = Math.min((currentTime - this.lastTime) / 1000, 0.1);
    this.lastTime = currentTime;

    // Fixed timestep physics/game logic
    this.accumulator += frameTime;
    while (this.accumulator >= this.FIXED_TIMESTEP) {
      this.fixedUpdate(this.FIXED_TIMESTEP);
      this.accumulator -= this.FIXED_TIMESTEP;
    }

    // Variable timestep rendering
    const alpha = this.accumulator / this.FIXED_TIMESTEP;
    this.render(alpha);
  }

  private fixedUpdate(dt: number): void {
    // Update all systems via the world
    this.world.update(dt);
  }

  private render(alpha: number): void {
    // Update HUD
    this.hud.update();

    // Interpolate render positions
    this.renderSystem.interpolate(alpha);

    // Interpolate camera
    this.cameraSystem.interpolate(alpha);

    // Render with post processing
    this.postProcessing.render();
  }

  private onResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.postProcessing.resize(width, height);
    this.hud.resize();
  }

  /**
   * Get the ECS world
   */
  getWorld(): World {
    return this.world;
  }

  /**
   * Get player entity
   */
  getPlayer(): Entity {
    return this.playerEntity;
  }
}

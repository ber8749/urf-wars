import * as THREE from 'three';
import { World } from './World';
import { InputManager } from './InputManager';
import { PhysicsWorld, initPhysics } from '../physics/PhysicsWorld';
import { HUD } from '../rendering/HUD';
import { PostProcessing } from '../rendering/PostProcessing';
import { PauseMenu } from '../rendering/PauseMenu';
import { SoundManager } from '../audio/SoundManager';

// Import systems
import {
  InputSystem,
  MovementSystem,
  TorsoControlSystem,
  WeaponControlSystem,
  PhysicsSystem,
  HeatSystem,
  WeaponSystem,
  ProjectileSystem,
  RenderSystem,
  CameraSystem,
  MechAnimationSystem,
  AudioSystem,
  MapSystem,
  TurretAISystem,
  TargetingSystem,
} from '../systems';

// Import archetypes and config
import { createMech } from '../archetypes/createMech';
import { createTarget } from '../archetypes/createTarget';
import { createTurret } from '../archetypes/createTurret';
import { getMechById } from '../config/MechConfigs';
import { GAME_CONFIG } from '../config/GameConfig';
import { CAMERA_CONFIG } from '../config/CameraConfig';
import { RENDERING_CONFIG } from '../config/RenderingConfig';
import { getMapById } from '../config/maps';
import type { MapConfig } from '../config/maps';

// Import components for HUD access
import { HeatComponent } from '../components/HeatComponent';
import { PhysicsComponent } from '../components/PhysicsComponent';
import { MechComponent } from '../components/MechComponent';
import { WeaponComponent } from '../components/WeaponComponent';
import { HealthComponent } from '../components/HealthComponent';
import { TargetingComponent } from '../components/TargetingComponent';
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
  private pauseMenu!: PauseMenu;
  private isPaused: boolean = false;

  // Simple global lighting
  private directionalLight!: THREE.DirectionalLight;
  private ambientLight!: THREE.AmbientLight;

  // Systems that need special access
  private cameraSystem!: CameraSystem;
  private renderSystem!: RenderSystem;
  private mapSystem!: MapSystem;

  // Map configuration
  private mapConfig!: MapConfig;

  // Mech selection
  private mechId: string;

  private lastTime: number = 0;
  private accumulator: number = 0;
  private isRunning: boolean = false;
  private audioInitialized: boolean = false;

  constructor(container: HTMLElement, mapId: string, mechId: string = 'ATLAS') {
    this.container = container;
    // Load map config from provided ID
    this.mapConfig = getMapById(mapId);
    // Store mech selection
    this.mechId = mechId;
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

    // Register systems in correct order
    // 1. Input capture
    this.world.addSystem(new InputSystem(this.inputManager));
    // 2. Movement (tank controls, direct velocity)
    this.world.addSystem(new MovementSystem(this.physicsWorld));
    // 3. Torso/head rotation (mouse/keyboard)
    this.world.addSystem(new TorsoControlSystem());
    // 4. Weapon input handling
    this.world.addSystem(new WeaponControlSystem());
    // 5. Targeting system (enemy detection, target cycling)
    this.world.addSystem(new TargetingSystem(this.camera));
    // 6. Physics simulation
    this.world.addSystem(new PhysicsSystem(this.physicsWorld));
    // 6. Heat management
    this.world.addSystem(new HeatSystem());
    // 7. Weapon firing logic (with camera for reticle aiming)
    this.world.addSystem(
      new WeaponSystem(this.scene, this.camera, this.physicsWorld)
    );
    // 8. Projectile updates (with physics for collision detection)
    this.world.addSystem(new ProjectileSystem(this.scene, this.physicsWorld));
    // 9. Turret AI (detection, tracking, firing)
    this.world.addSystem(new TurretAISystem());
    // 10. Mech animations
    this.world.addSystem(new MechAnimationSystem());

    this.renderSystem = new RenderSystem(this.scene);
    this.world.addSystem(this.renderSystem);

    this.cameraSystem = new CameraSystem(this.camera);
    this.world.addSystem(this.cameraSystem);

    this.world.addSystem(new AudioSystem(this.soundManager));

    // Create map system with loaded config
    this.mapSystem = new MapSystem(
      this.scene,
      this.physicsWorld,
      this.mapConfig
    );
    this.world.addSystem(this.mapSystem);

    // Log loaded map and mech
    const mechConfig = getMechById(this.mechId);
    console.log(`Loaded map: ${this.mapConfig.name} (${this.mapConfig.id})`);
    console.log(`Deploying mech: ${mechConfig.name}`);

    // Spawn player at map-defined position
    const playerSpawn = this.mapConfig.playerSpawn;
    const terrainHeight = this.mapSystem.getHeightAt(
      playerSpawn.position.x,
      playerSpawn.position.z
    );
    const spawnHeight = terrainHeight + playerSpawn.position.y;

    this.playerEntity = createMech(
      'player-1',
      mechConfig,
      this.physicsWorld,
      new THREE.Vector3(
        playerSpawn.position.x,
        spawnHeight,
        playerSpawn.position.z
      ),
      true
    );
    this.world.addEntity(this.playerEntity);

    // Spawn entities defined in map config
    this.spawnMapTargets();
    this.spawnMapTurrets();

    // Setup HUD with entity reference wrapper
    this.hud = new HUD(this.container, this.createMechInterface());

    // Setup post processing
    this.postProcessing = new PostProcessing(
      this.renderer,
      this.scene,
      this.camera
    );

    // Setup pause menu
    this.pauseMenu = new PauseMenu(
      this.container,
      this.postProcessing,
      (paused) => {
        this.isPaused = paused;
      }
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
      getTargeting: () => {
        const targeting = entity.getComponent(TargetingComponent);
        return {
          getTargets: () => {
            if (!targeting) return [];
            const targets: Array<{
              x: number;
              y: number;
              distance: number;
              isLocked: boolean;
              healthPercent: number;
            }> = [];
            for (const [
              targetId,
              pos,
            ] of targeting.targetScreenPositions.entries()) {
              targets.push({
                x: pos.x,
                y: pos.y,
                distance: pos.distance,
                isLocked: targetId === targeting.lockedTargetId,
                healthPercent: pos.healthPercent,
              });
            }
            return targets;
          },
          hasLockedTarget: () => targeting?.hasLockedTarget() ?? false,
        };
      },
    };
  }

  private setupRenderer(): void {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(
      Math.min(window.devicePixelRatio, RENDERING_CONFIG.RENDERER.maxPixelRatio)
    );
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure =
      RENDERING_CONFIG.RENDERER.toneMappingExposure;
    this.container.appendChild(this.renderer.domElement);
  }

  private setupScene(): void {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(
      RENDERING_CONFIG.SCENE.backgroundColor
    );

    this.camera = new THREE.PerspectiveCamera(
      CAMERA_CONFIG.THIRD_PERSON.fov,
      window.innerWidth / window.innerHeight,
      CAMERA_CONFIG.NEAR,
      CAMERA_CONFIG.FAR
    );
    this.camera.position.set(0, 15, 30);
  }

  private setupLighting(): void {
    const { SHADOWS } = RENDERING_CONFIG;
    const { lighting } = this.mapConfig.environment;

    // Use map-specific lighting configuration
    this.ambientLight = new THREE.AmbientLight(
      lighting.ambientColor,
      lighting.ambientIntensity
    );
    this.scene.add(this.ambientLight);

    // Main directional light (sun) with map-specific settings
    this.directionalLight = new THREE.DirectionalLight(
      lighting.directionalColor,
      lighting.directionalIntensity
    );
    this.directionalLight.position.set(
      lighting.sunPosition.x,
      lighting.sunPosition.y,
      lighting.sunPosition.z
    );
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.width = SHADOWS.mapSize;
    this.directionalLight.shadow.mapSize.height = SHADOWS.mapSize;
    this.directionalLight.shadow.camera.near = SHADOWS.cameraNear;
    this.directionalLight.shadow.camera.far = SHADOWS.cameraFar;
    this.directionalLight.shadow.camera.left = -SHADOWS.cameraSize;
    this.directionalLight.shadow.camera.right = SHADOWS.cameraSize;
    this.directionalLight.shadow.camera.top = SHADOWS.cameraSize;
    this.directionalLight.shadow.camera.bottom = -SHADOWS.cameraSize;
    this.directionalLight.shadow.bias = SHADOWS.bias;
    this.scene.add(this.directionalLight);
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
    const frameTime = Math.min(
      (currentTime - this.lastTime) / 1000,
      GAME_CONFIG.MAX_FRAME_TIME
    );
    this.lastTime = currentTime;

    // Skip game logic when paused, but still render
    if (!this.isPaused) {
      // Fixed timestep physics/game logic (using centralized config)
      this.accumulator += frameTime;
      while (this.accumulator >= GAME_CONFIG.FIXED_TIMESTEP) {
        this.fixedUpdate(GAME_CONFIG.FIXED_TIMESTEP);
        this.accumulator -= GAME_CONFIG.FIXED_TIMESTEP;
      }
    }

    // Variable timestep rendering (always render to show pause menu)
    const alpha = this.accumulator / GAME_CONFIG.FIXED_TIMESTEP;
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
   * Spawn targets defined in the map configuration
   */
  private spawnMapTargets(): void {
    const { playerSpawn, targets } = this.mapConfig;
    const playerPos = new THREE.Vector3(
      playerSpawn.position.x,
      0,
      playerSpawn.position.z
    );

    targets.forEach((targetConfig, index) => {
      const terrainHeight = this.mapSystem.getHeightAt(
        targetConfig.position.x,
        targetConfig.position.z
      );
      const targetHeight = terrainHeight + targetConfig.position.y;

      const faceToward = targetConfig.faceToward
        ? new THREE.Vector3(
            targetConfig.faceToward.x,
            targetConfig.faceToward.y,
            targetConfig.faceToward.z
          )
        : playerPos;

      // Only include health in config if explicitly set
      const config =
        targetConfig.health !== undefined
          ? { health: targetConfig.health }
          : {};

      const target = createTarget(
        `target-${index + 1}`,
        this.physicsWorld,
        new THREE.Vector3(
          targetConfig.position.x,
          targetHeight,
          targetConfig.position.z
        ),
        config,
        faceToward
      );
      this.world.addEntity(target);
    });
  }

  /**
   * Spawn turrets defined in the map configuration
   */
  private spawnMapTurrets(): void {
    const { turrets } = this.mapConfig;

    turrets.forEach((turretConfig, index) => {
      const terrainHeight = this.mapSystem.getHeightAt(
        turretConfig.position.x,
        turretConfig.position.z
      );

      // Build config with only defined values
      const config: Parameters<typeof createTurret>[3] = {};
      if (turretConfig.detectionRange !== undefined)
        config.detectionRange = turretConfig.detectionRange;
      if (turretConfig.weaponType !== undefined)
        config.weaponType = turretConfig.weaponType;
      if (turretConfig.health !== undefined)
        config.health = turretConfig.health;

      const turret = createTurret(
        `turret-${index + 1}`,
        this.physicsWorld,
        new THREE.Vector3(
          turretConfig.position.x,
          terrainHeight + turretConfig.position.y,
          turretConfig.position.z
        ),
        config
      );
      this.world.addEntity(turret);
    });
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

  /**
   * Get the current map configuration
   */
  getMapConfig(): MapConfig {
    return this.mapConfig;
  }

  /**
   * Get the map system for terrain queries
   */
  getMapSystem(): MapSystem {
    return this.mapSystem;
  }
}

import * as THREE from 'three';
import { EntityManager } from './EntityManager';
import { InputManager } from './InputManager';
import { PhysicsWorld, initPhysics } from '../physics/PhysicsWorld';
import { TerrainGenerator } from '../world/TerrainGenerator';
import { Skybox } from '../world/Skybox';
import { Mech } from '../mech/Mech';
import { MechController } from '../mech/MechController';
import { CameraController } from '../camera/CameraController';
import { HUD } from '../rendering/HUD';
import { PostProcessing } from '../rendering/PostProcessing';

export class Game {
  private container: HTMLElement;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  
  private entityManager!: EntityManager;
  private inputManager!: InputManager;
  private physicsWorld!: PhysicsWorld;
  private terrainGenerator!: TerrainGenerator;
  private cameraController!: CameraController;
  private hud!: HUD;
  private postProcessing!: PostProcessing;
  
  private playerMech!: Mech;
  private mechController!: MechController;
  
  private lastTime: number = 0;
  private accumulator: number = 0;
  private readonly FIXED_TIMESTEP: number = 1 / 60; // 60Hz fixed update
  private isRunning: boolean = false;
  
  constructor(container: HTMLElement) {
    this.container = container;
  }
  
  async init(): Promise<void> {
    // Initialize Rapier WASM - dynamic import for WASM compatibility
    await initPhysics();
    
    // Setup Three.js
    this.setupRenderer();
    this.setupScene();
    this.setupLighting();
    
    // Setup game systems
    this.entityManager = new EntityManager(this.scene);
    this.inputManager = new InputManager(this.container);
    this.physicsWorld = new PhysicsWorld();
    
    // Setup world
    this.terrainGenerator = new TerrainGenerator(this.scene, this.physicsWorld);
    new Skybox(this.scene);
    
    // Create player mech
    this.playerMech = new Mech('player-1', this.scene, this.physicsWorld);
    this.entityManager.addEntity(this.playerMech);
    
    // Setup mech controller
    this.mechController = new MechController(this.playerMech, this.inputManager);
    
    // Setup camera
    this.cameraController = new CameraController(
      this.camera,
      this.playerMech,
      this.inputManager
    );
    
    // Setup HUD
    this.hud = new HUD(this.container, this.playerMech);
    
    // Setup post processing
    this.postProcessing = new PostProcessing(this.renderer, this.scene, this.camera);
    
    // Generate initial terrain
    this.terrainGenerator.generateAroundPosition(new THREE.Vector3(0, 0, 0));
    
    // Position mech on top of terrain
    const terrainHeight = this.terrainGenerator.getHeightAt(0, 0);
    const spawnHeight = terrainHeight + 10;
    
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/dcc429e4-22aa-4df5-a72d-c19fdddc0775',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Game.ts:init',message:'Spawn height calculation',data:{terrainHeight,spawnHeight,offset:10},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    
    this.playerMech.setPosition(new THREE.Vector3(0, spawnHeight, 0));
    
    // Handle window resize
    window.addEventListener('resize', this.onResize.bind(this));
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
    this.renderer.toneMappingExposure = 2.0;
    this.container.appendChild(this.renderer.domElement);
  }
  
  private setupScene(): void {
    this.scene = new THREE.Scene();
    // Light fog matching the sky horizon
    this.scene.fog = new THREE.FogExp2(0x667788, 0.001);
    
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );
    this.camera.position.set(0, 15, 30);
  }
  
  private setupLighting(): void {
    // Ambient light for base illumination - bright
    const ambientLight = new THREE.AmbientLight(0x8899bb, 1.2);
    this.scene.add(ambientLight);
    
    // Main directional light (sun) - very bright
    const sunLight = new THREE.DirectionalLight(0xffffff, 3.0);
    sunLight.position.set(100, 200, 100);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 500;
    sunLight.shadow.camera.left = -150;
    sunLight.shadow.camera.right = 150;
    sunLight.shadow.camera.top = 150;
    sunLight.shadow.camera.bottom = -150;
    sunLight.shadow.bias = -0.0005;
    this.scene.add(sunLight);
    
    // Hemisphere light for sky/ground color variation - bright
    const hemiLight = new THREE.HemisphereLight(0xccddff, 0x998866, 1.0);
    this.scene.add(hemiLight);
  }
  
  start(): void {
    this.isRunning = true;
    this.lastTime = performance.now();
    // Don't auto-lock pointer - wait for user click (handled in InputManager)
    this.gameLoop();
  }
  
  stop(): void {
    this.isRunning = false;
  }
  
  private gameLoop(): void {
    if (!this.isRunning) return;
    
    requestAnimationFrame(() => this.gameLoop());
    
    const currentTime = performance.now();
    const frameTime = Math.min((currentTime - this.lastTime) / 1000, 0.1); // Cap at 100ms
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
    // Update input
    this.inputManager.update();
    
    // Update mech controller
    this.mechController.update(dt);
    
    // Update physics
    this.physicsWorld.step(dt);
    
    // Update all entities
    this.entityManager.update(dt);
    
    // Update terrain chunks around player
    const mechPosition = this.playerMech.getPosition();
    this.terrainGenerator.generateAroundPosition(mechPosition);
    
    // Update camera
    this.cameraController.update(dt);
  }
  
  private render(alpha: number): void {
    // Update HUD
    this.hud.update();
    
    // Interpolate camera for smooth rendering
    this.cameraController.interpolate(alpha);
    
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
}


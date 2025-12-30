import * as THREE from 'three';
import { System } from '../core/System';
import type { ComponentClass } from '../core/Component';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import type { MapConfig, ObstacleConfig } from '../config/maps/MapConfig';

/**
 * MapSystem creates and manages the game environment based on a MapConfig.
 * Handles terrain, obstacles, lighting updates, and physics colliders.
 */
export class MapSystem extends System {
  readonly requiredComponents: ComponentClass[] = [];

  private scene: THREE.Scene;
  private physicsWorld: PhysicsWorld;
  private mapConfig: MapConfig;
  private initialized: boolean = false;

  // Track created objects for potential cleanup
  private createdMeshes: THREE.Object3D[] = [];
  private obstacleCount: number = 0;

  constructor(
    scene: THREE.Scene,
    physicsWorld: PhysicsWorld,
    mapConfig: MapConfig
  ) {
    super();
    this.scene = scene;
    this.physicsWorld = physicsWorld;
    this.mapConfig = mapConfig;
  }

  update(_dt: number): void {
    if (!this.initialized) {
      this.createMap();
      this.initialized = true;
    }
  }

  /**
   * Create the complete map environment
   */
  private createMap(): void {
    this.createTerrain();
    this.createObstacles();

    if (this.mapConfig.terrain.showDebugMarkers) {
      this.createDebugMarkers();
    }

    this.applyEnvironment();
  }

  /**
   * Create terrain (ground plane and grid)
   */
  private createTerrain(): void {
    const { terrain } = this.mapConfig;

    // Ground plane
    const groundGeometry = new THREE.PlaneGeometry(terrain.size, terrain.size);
    groundGeometry.rotateX(-Math.PI / 2);

    const groundMaterial = new THREE.MeshStandardMaterial({
      color: terrain.groundColor,
      roughness: 0.9,
      metalness: 0.0,
    });

    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.receiveShadow = true;
    ground.position.y = 0;
    this.scene.add(ground);
    this.createdMeshes.push(ground);

    // Major grid (every 50 units)
    const majorGridSpacing = 50;
    const majorGrid = new THREE.GridHelper(
      terrain.size,
      terrain.size / majorGridSpacing,
      terrain.gridColorMajor,
      terrain.gridColorMajor
    );
    majorGrid.position.y = 0.01;
    this.scene.add(majorGrid);
    this.createdMeshes.push(majorGrid);

    // Minor grid (every 10 units)
    const minorGridSpacing = 10;
    const minorGrid = new THREE.GridHelper(
      terrain.size,
      terrain.size / minorGridSpacing,
      terrain.gridColorMinor,
      terrain.gridColorMinor
    );
    minorGrid.position.y = 0.005;
    this.scene.add(minorGrid);
    this.createdMeshes.push(minorGrid);

    // Ground physics collider
    this.createGroundPhysics(terrain.size);
  }

  /**
   * Create ground physics collider
   */
  private createGroundPhysics(size: number): void {
    const physicsId = 'map-ground';
    const body = this.physicsWorld.createStaticBody(
      physicsId,
      new THREE.Vector3(0, -0.5, 0)
    );

    const halfExtents = new THREE.Vector3(size / 2, 0.5, size / 2);
    this.physicsWorld.addBoxCollider(body, physicsId, halfExtents);
  }

  /**
   * Create all obstacles defined in the map config
   */
  private createObstacles(): void {
    for (const obstacle of this.mapConfig.obstacles) {
      this.createObstacle(obstacle);
    }
  }

  /**
   * Create a single obstacle with visual and physics
   */
  private createObstacle(config: ObstacleConfig): void {
    const obstacleId = `obstacle-${this.obstacleCount++}`;
    let mesh: THREE.Mesh;
    let geometry: THREE.BufferGeometry;

    const material = new THREE.MeshStandardMaterial({
      color: config.color,
      roughness: 0.8,
      metalness: 0.1,
    });

    switch (config.type) {
      case 'cylinder': {
        // size.x = radius, size.y = height
        geometry = new THREE.CylinderGeometry(
          config.size.x,
          config.size.x,
          config.size.y,
          16
        );
        mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(
          config.position.x,
          config.position.y,
          config.position.z
        );

        // Physics
        const cylinderBody = this.physicsWorld.createStaticBody(
          obstacleId,
          new THREE.Vector3(
            config.position.x,
            config.position.y,
            config.position.z
          )
        );
        this.physicsWorld.addCylinderCollider(
          cylinderBody,
          `${obstacleId}-collider`,
          config.size.y / 2,
          config.size.x
        );
        break;
      }

      case 'wall':
      case 'box':
      default: {
        geometry = new THREE.BoxGeometry(
          config.size.x,
          config.size.y,
          config.size.z
        );
        mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(
          config.position.x,
          config.position.y,
          config.position.z
        );

        if (config.rotation) {
          mesh.rotation.y = (config.rotation * Math.PI) / 180;
        }

        // Physics
        const boxBody = this.physicsWorld.createStaticBody(
          obstacleId,
          new THREE.Vector3(
            config.position.x,
            config.position.y,
            config.position.z
          )
        );
        this.physicsWorld.addBoxCollider(
          boxBody,
          `${obstacleId}-collider`,
          new THREE.Vector3(
            config.size.x / 2,
            config.size.y / 2,
            config.size.z / 2
          )
        );
        break;
      }
    }

    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    this.createdMeshes.push(mesh);
  }

  /**
   * Apply environment settings (sky, fog)
   */
  private applyEnvironment(): void {
    const { environment } = this.mapConfig;

    // Sky color
    this.scene.background = new THREE.Color(environment.skyColor);

    // Fog
    if (
      environment.fogColor !== undefined &&
      environment.fogDensity !== undefined
    ) {
      this.scene.fog = new THREE.FogExp2(
        environment.fogColor,
        environment.fogDensity
      );
    } else {
      this.scene.fog = null;
    }
  }

  /**
   * Create debug markers (cardinal directions, distance rings, etc.)
   * Based on the original DebugTerrainSystem
   */
  private createDebugMarkers(): void {
    const markerDistance = 400;
    const markerHeight = 30;
    const markerRadius = 3;

    // Origin marker
    this.createOriginMarker();

    // Cardinal direction markers
    const markers = [
      {
        dir: 'N',
        pos: new THREE.Vector3(0, 0, markerDistance),
        color: 0x4488ff,
      },
      {
        dir: 'S',
        pos: new THREE.Vector3(0, 0, -markerDistance),
        color: 0xff4444,
      },
      {
        dir: 'E',
        pos: new THREE.Vector3(markerDistance, 0, 0),
        color: 0x44ff44,
      },
      {
        dir: 'W',
        pos: new THREE.Vector3(-markerDistance, 0, 0),
        color: 0xffff44,
      },
    ];

    for (const marker of markers) {
      // Pillar
      const pillarGeometry = new THREE.CylinderGeometry(
        markerRadius,
        markerRadius,
        markerHeight,
        8
      );
      const pillarMaterial = new THREE.MeshStandardMaterial({
        color: marker.color,
        emissive: marker.color,
        emissiveIntensity: 0.3,
      });
      const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
      pillar.position.set(marker.pos.x, markerHeight / 2, marker.pos.z);
      pillar.castShadow = true;
      this.scene.add(pillar);
      this.createdMeshes.push(pillar);

      // Arrow pointing toward origin
      const arrowLength = 15;
      const arrowDir = new THREE.Vector3(
        -marker.pos.x,
        0,
        -marker.pos.z
      ).normalize();
      const arrow = new THREE.ArrowHelper(
        arrowDir,
        new THREE.Vector3(marker.pos.x, markerHeight + 5, marker.pos.z),
        arrowLength,
        marker.color,
        5,
        3
      );
      this.scene.add(arrow);
      this.createdMeshes.push(arrow);

      // Text label
      this.createTextSprite(
        marker.dir,
        new THREE.Vector3(marker.pos.x, markerHeight + 15, marker.pos.z),
        marker.color
      );
    }

    // Distance rings
    this.createDistanceMarkers();

    // Scale reference
    this.createScaleReference();

    // Axis helper at origin
    const axisHelper = new THREE.AxesHelper(20);
    axisHelper.position.y = 0.1;
    this.scene.add(axisHelper);
    this.createdMeshes.push(axisHelper);
  }

  /**
   * Create origin marker ring
   */
  private createOriginMarker(): void {
    const ringGeometry = new THREE.RingGeometry(3, 6, 32);
    ringGeometry.rotateX(-Math.PI / 2);
    const ringMaterial = new THREE.MeshStandardMaterial({
      color: 0xff6600,
      emissive: 0xff6600,
      emissiveIntensity: 0.3,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.position.y = 0.02;
    this.scene.add(ring);
    this.createdMeshes.push(ring);
  }

  /**
   * Create distance ring markers
   */
  private createDistanceMarkers(): void {
    const distances = [50, 100, 150, 200, 300, 400];

    for (const distance of distances) {
      const ringGeometry = new THREE.RingGeometry(
        distance - 0.5,
        distance + 0.5,
        64
      );
      ringGeometry.rotateX(-Math.PI / 2);

      const ringMaterial = new THREE.MeshBasicMaterial({
        color: distance === 100 ? 0x000000 : 0x444444,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7,
      });

      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.position.y = 0.03;
      this.scene.add(ring);
      this.createdMeshes.push(ring);

      // Distance labels at cardinal points
      if (
        distance === 100 ||
        distance === 200 ||
        distance === 300 ||
        distance === 400
      ) {
        const labelPositions = [
          new THREE.Vector3(distance, 0, 0),
          new THREE.Vector3(-distance, 0, 0),
          new THREE.Vector3(0, 0, distance),
          new THREE.Vector3(0, 0, -distance),
        ];

        for (const pos of labelPositions) {
          this.createDistanceLabel(distance.toString(), pos);
        }
      }
    }
  }

  /**
   * Create a text sprite for labels
   */
  private createTextSprite(
    text: string,
    position: THREE.Vector3,
    color: number
  ): void {
    const canvas = document.createElement('canvas');
    const size = 256;
    canvas.width = size;
    canvas.height = size;

    const context = canvas.getContext('2d')!;
    context.fillStyle = 'transparent';
    context.fillRect(0, 0, size, size);

    context.font = 'bold 180px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';

    // Outline
    context.strokeStyle = '#000000';
    context.lineWidth = 12;
    context.strokeText(text, size / 2, size / 2);

    // Fill
    const colorStr = '#' + color.toString(16).padStart(6, '0');
    context.fillStyle = colorStr;
    context.fillText(text, size / 2, size / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
    });

    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.position.copy(position);
    sprite.scale.set(20, 20, 1);
    this.scene.add(sprite);
    this.createdMeshes.push(sprite);
  }

  /**
   * Create distance label sprite
   */
  private createDistanceLabel(text: string, position: THREE.Vector3): void {
    const canvas = document.createElement('canvas');
    const size = 128;
    canvas.width = size;
    canvas.height = size / 2;

    const context = canvas.getContext('2d')!;
    context.fillStyle = 'transparent';
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.font = 'bold 48px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = '#333333';
    context.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
    });

    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.position.set(position.x, 5, position.z);
    sprite.scale.set(15, 7.5, 1);
    this.scene.add(sprite);
    this.createdMeshes.push(sprite);
  }

  /**
   * Create scale reference objects
   */
  private createScaleReference(): void {
    // 10m wireframe cube
    const cubeSize = 10;
    const cubeGeometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
    const cubeEdges = new THREE.EdgesGeometry(cubeGeometry);
    const cubeMaterial = new THREE.LineBasicMaterial({ color: 0x00ffff });
    const cubeWireframe = new THREE.LineSegments(cubeEdges, cubeMaterial);
    cubeWireframe.position.set(30, cubeSize / 2, 30);
    this.scene.add(cubeWireframe);
    this.createdMeshes.push(cubeWireframe);

    this.createDistanceLabel('10m', new THREE.Vector3(30, cubeSize + 3, 30));

    // Height reference cylinders
    const heights = [
      { h: 5, label: '5m', x: 50, z: 30 },
      { h: 10, label: '10m', x: 60, z: 30 },
      { h: 15, label: '15m', x: 70, z: 30 },
    ];

    for (const ref of heights) {
      const cylGeometry = new THREE.CylinderGeometry(1, 1, ref.h, 8);
      const cylMaterial = new THREE.MeshStandardMaterial({
        color: 0x888888,
        transparent: true,
        opacity: 0.7,
      });
      const cylinder = new THREE.Mesh(cylGeometry, cylMaterial);
      cylinder.position.set(ref.x, ref.h / 2, ref.z);
      cylinder.castShadow = true;
      this.scene.add(cylinder);
      this.createdMeshes.push(cylinder);
    }
  }

  /**
   * Get the map configuration
   */
  getMapConfig(): MapConfig {
    return this.mapConfig;
  }

  /**
   * Get terrain height at a position (always 0 for flat terrain)
   */
  getHeightAt(_x: number, _z: number): number {
    // Flat terrain for now
    return 0;
  }

  /**
   * Get terrain seed (for API compatibility)
   */
  getSeed(): number {
    return 0;
  }
}

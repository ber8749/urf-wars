import * as THREE from 'three';
import { System } from '../core/System';
import type { ComponentClass } from '../core/Component';
import type { PhysicsWorld } from '../physics/PhysicsWorld';

/**
 * Debug terrain system creates a simple flat environment with grid,
 * cardinal direction markers, and reference objects for debugging.
 */
export class DebugTerrainSystem extends System {
  readonly requiredComponents: ComponentClass[] = [];

  private scene: THREE.Scene;
  private physicsWorld: PhysicsWorld;
  private initialized: boolean = false;

  // Configuration
  private readonly groundSize: number = 1000;
  private readonly majorGridSpacing: number = 50;
  private readonly minorGridSpacing: number = 10;
  private readonly markerDistance: number = 400;

  constructor(scene: THREE.Scene, physicsWorld: PhysicsWorld) {
    super();
    this.scene = scene;
    this.physicsWorld = physicsWorld;
  }

  update(_dt: number): void {
    if (!this.initialized) {
      this.createDebugEnvironment();
      this.initialized = true;
    }
  }

  private createDebugEnvironment(): void {
    this.createGroundPlane();
    this.createGridLines();
    this.createOriginMarker();
    this.createCardinalMarkers();
    this.createDistanceMarkers();
    this.createScaleReference();
    this.createGroundPhysics();
  }

  private createGroundPlane(): void {
    const geometry = new THREE.PlaneGeometry(this.groundSize, this.groundSize);
    geometry.rotateX(-Math.PI / 2);

    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.9,
      metalness: 0.0,
    });

    const ground = new THREE.Mesh(geometry, material);
    ground.receiveShadow = true;
    ground.position.y = 0;
    this.scene.add(ground);
  }

  private createGridLines(): void {
    // Major grid (every 50 units) - black
    const majorGrid = new THREE.GridHelper(
      this.groundSize,
      this.groundSize / this.majorGridSpacing,
      0x000000,
      0x333333
    );
    majorGrid.position.y = 0.01;
    this.scene.add(majorGrid);

    // Minor grid (every 10 units) - dark gray
    const minorGrid = new THREE.GridHelper(
      this.groundSize,
      this.groundSize / this.minorGridSpacing,
      0x666666,
      0x888888
    );
    minorGrid.position.y = 0.005;
    this.scene.add(minorGrid);
  }

  private createOriginMarker(): void {
    // Orange base ring (visible on white)
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

    // XYZ axis indicator at origin
    const axisHelper = new THREE.AxesHelper(20);
    axisHelper.position.y = 0.1;
    this.scene.add(axisHelper);
  }

  private createCardinalMarkers(): void {
    const markerHeight = 30;
    const markerRadius = 3;

    const markers = [
      {
        dir: 'N',
        pos: new THREE.Vector3(0, 0, this.markerDistance),
        color: 0x4488ff,
      },
      {
        dir: 'S',
        pos: new THREE.Vector3(0, 0, -this.markerDistance),
        color: 0xff4444,
      },
      {
        dir: 'E',
        pos: new THREE.Vector3(this.markerDistance, 0, 0),
        color: 0x44ff44,
      },
      {
        dir: 'W',
        pos: new THREE.Vector3(-this.markerDistance, 0, 0),
        color: 0xffff44,
      },
    ];

    for (const marker of markers) {
      // Create pillar
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

      // Create arrow pointing toward origin
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

      // Create text label using sprite
      this.createTextSprite(
        marker.dir,
        new THREE.Vector3(marker.pos.x, markerHeight + 15, marker.pos.z),
        marker.color
      );
    }
  }

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

    // Draw outline
    context.strokeStyle = '#000000';
    context.lineWidth = 12;
    context.strokeText(text, size / 2, size / 2);

    // Draw fill
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
  }

  private createDistanceMarkers(): void {
    const distances = [50, 100, 150, 200, 300, 400];

    for (const distance of distances) {
      // Create ring at this distance
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

      // Add distance label at cardinal points
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
  }

  private createScaleReference(): void {
    // Create a 10x10x10 wireframe cube near origin for scale reference
    const cubeSize = 10;
    const cubeGeometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
    const cubeEdges = new THREE.EdgesGeometry(cubeGeometry);
    const cubeMaterial = new THREE.LineBasicMaterial({ color: 0x00ffff });
    const cubeWireframe = new THREE.LineSegments(cubeEdges, cubeMaterial);
    cubeWireframe.position.set(30, cubeSize / 2, 30);
    this.scene.add(cubeWireframe);

    // Label for the cube
    this.createDistanceLabel('10m', new THREE.Vector3(30, cubeSize + 3, 30));

    // Create some reference cylinders showing typical heights
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
    }
  }

  private createGroundPhysics(): void {
    const physicsId = 'debug-ground';
    const body = this.physicsWorld.createStaticBody(
      physicsId,
      new THREE.Vector3(0, -0.5, 0)
    );

    // Half extents for the ground box collider
    const halfExtents = new THREE.Vector3(
      this.groundSize / 2,
      0.5,
      this.groundSize / 2
    );

    this.physicsWorld.addBoxCollider(body, physicsId, halfExtents);
  }

  /**
   * Always returns 0 for flat terrain
   */
  getHeightAt(_x: number, _z: number): number {
    return 0;
  }

  /**
   * Returns a seed value (for API compatibility with old terrain system)
   */
  getSeed(): number {
    return 0;
  }
}

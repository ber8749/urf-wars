import * as THREE from 'three';
import { System } from '../core/System';
import type { ComponentClass } from '../core/Component';
import { Entity } from '../core/Entity';
import { TransformComponent } from '../components/TransformComponent';
import { RenderComponent } from '../components/RenderComponent';
import { TerrainChunkComponent } from '../components/TerrainChunkComponent';
import { InputComponent } from '../components/InputComponent';
import { BiomeManager } from '../world/BiomeManager';
import { TerrainChunk } from '../world/TerrainChunk';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import type { ChunkCoord } from '../types';

/**
 * Terrain system manages procedural terrain chunk generation and loading.
 */
export class TerrainSystem extends System {
  readonly requiredComponents: ComponentClass[] = [
    InputComponent,
    TransformComponent,
  ];

  private scene: THREE.Scene;
  private physicsWorld: PhysicsWorld;
  private biomeManager: BiomeManager;

  private chunks: Map<string, string> = new Map(); // chunk key -> entity ID
  private loadingChunks: Set<string> = new Set();
  private chunkQueue: Array<{ x: number; z: number; priority: number }> = [];
  private readonly MAX_CHUNKS_PER_FRAME = 1;

  // Configuration
  public readonly chunkSize: number = 64;
  public readonly chunkScale: number = 2;
  private viewDistance: number = 6;
  private unloadDistance: number = 8;

  private seed: number;

  constructor(scene: THREE.Scene, physicsWorld: PhysicsWorld, seed?: number) {
    super();
    this.scene = scene;
    this.physicsWorld = physicsWorld;
    this.seed = seed ?? Math.random() * 10000;
    this.biomeManager = new BiomeManager(this.seed);
  }

  update(_dt: number): void {
    // Find player entity to generate terrain around
    const player = this.getEntities().find(
      (e) => e.getComponent(InputComponent)?.isLocalPlayer
    );

    if (!player) return;

    const transform = player.getComponent(TransformComponent)!;
    this.generateAroundPosition(transform.position);
  }

  private generateAroundPosition(position: THREE.Vector3): void {
    const centerChunk = this.worldToChunkCoord(position);

    // Queue chunks that need to be loaded
    for (let x = -this.viewDistance; x <= this.viewDistance; x++) {
      for (let z = -this.viewDistance; z <= this.viewDistance; z++) {
        const chunkX = centerChunk.x + x;
        const chunkZ = centerChunk.z + z;
        const key = this.chunkKey(chunkX, chunkZ);

        if (!this.chunks.has(key) && !this.loadingChunks.has(key)) {
          const priority = Math.abs(x) + Math.abs(z);
          this.loadingChunks.add(key);
          this.chunkQueue.push({ x: chunkX, z: chunkZ, priority });
        }
      }
    }

    // Sort by priority
    this.chunkQueue.sort((a, b) => a.priority - b.priority);

    // Process limited chunks per frame
    let chunksGenerated = 0;
    while (
      this.chunkQueue.length > 0 &&
      chunksGenerated < this.MAX_CHUNKS_PER_FRAME
    ) {
      const next = this.chunkQueue.shift()!;
      this.generateChunk(next.x, next.z);
      chunksGenerated++;
    }

    // Clean up queue
    this.chunkQueue = this.chunkQueue.filter((item) => {
      const dx = Math.abs(item.x - centerChunk.x);
      const dz = Math.abs(item.z - centerChunk.z);
      if (dx > this.viewDistance || dz > this.viewDistance) {
        this.loadingChunks.delete(this.chunkKey(item.x, item.z));
        return false;
      }
      return true;
    });

    // Unload distant chunks
    for (const [key, entityId] of this.chunks) {
      const entity = this.world.getEntity(entityId);
      if (!entity) {
        this.chunks.delete(key);
        continue;
      }

      const chunkComp = entity.getComponent(TerrainChunkComponent);
      if (!chunkComp) continue;

      const dx = Math.abs(chunkComp.coord.x - centerChunk.x);
      const dz = Math.abs(chunkComp.coord.z - centerChunk.z);

      if (dx > this.unloadDistance || dz > this.unloadDistance) {
        this.unloadChunk(key, entityId, chunkComp);
      }
    }
  }

  private generateChunk(chunkX: number, chunkZ: number): void {
    const key = this.chunkKey(chunkX, chunkZ);
    this.loadingChunks.add(key);

    // Calculate world position
    const worldX = chunkX * this.chunkSize * this.chunkScale;
    const worldZ = chunkZ * this.chunkSize * this.chunkScale;

    // Generate heightmap
    const heights = this.generateHeightmap(chunkX, chunkZ);

    // Get biome
    const biome = this.biomeManager.getBiomeAt(worldX, worldZ);

    // Create chunk mesh
    const chunkMesh = new TerrainChunk(
      { x: chunkX, z: chunkZ },
      this.chunkSize,
      this.chunkScale,
      heights,
      biome
    );

    // Position chunk mesh
    const halfSize = (this.chunkSize * this.chunkScale) / 2;
    const position = new THREE.Vector3(worldX + halfSize, 0, worldZ + halfSize);

    // Create physics collider
    const physicsId = `terrain-${key}`;
    const physicsBody = this.physicsWorld.createStaticBody(physicsId, position);

    // Extract geometry for physics
    const geometry = chunkMesh.mesh.geometry;
    const posAttr = geometry.getAttribute('position');
    const vertices = new Float32Array(posAttr.count * 3);
    for (let i = 0; i < posAttr.count; i++) {
      vertices[i * 3] = posAttr.getX(i);
      vertices[i * 3 + 1] = posAttr.getY(i);
      vertices[i * 3 + 2] = posAttr.getZ(i);
    }

    let indices: Uint32Array;
    if (geometry.index) {
      indices = new Uint32Array(geometry.index.array);
    } else {
      indices = new Uint32Array(posAttr.count);
      for (let i = 0; i < posAttr.count; i++) {
        indices[i] = i;
      }
    }

    this.physicsWorld.addTrimeshCollider(
      physicsBody,
      physicsId,
      vertices,
      indices
    );

    // Create entity
    const entity = new Entity(`terrain-chunk-${key}`);

    const transformComp = new TransformComponent(position);
    const renderComp = new RenderComponent(chunkMesh.mesh);
    const terrainComp = new TerrainChunkComponent(
      { x: chunkX, z: chunkZ },
      heights,
      this.chunkSize,
      this.chunkScale
    );
    terrainComp.physicsId = physicsId;

    entity.addComponent(transformComp);
    entity.addComponent(renderComp);
    entity.addComponent(terrainComp);

    // Add to world and scene
    this.world.addEntity(entity);
    this.scene.add(chunkMesh.mesh);
    renderComp.addedToScene = true;

    this.chunks.set(key, entity.id);
    this.loadingChunks.delete(key);
  }

  private generateHeightmap(chunkX: number, chunkZ: number): Float32Array {
    const size = this.chunkSize;
    // Use size+1 vertices so edge vertices overlap with adjacent chunks
    const vertexCount = size + 1;
    const heights = new Float32Array(vertexCount * vertexCount);

    // Get biome once per chunk (all vertices use same biome for performance)
    const chunkCenterX = (chunkX * size + size / 2) * this.chunkScale;
    const chunkCenterZ = (chunkZ * size + size / 2) * this.chunkScale;
    const biome = this.biomeManager.getBiomeAt(chunkCenterX, chunkCenterZ);
    const heightScale = biome.heightScale;

    for (let z = 0; z < vertexCount; z++) {
      for (let x = 0; x < vertexCount; x++) {
        // World coordinates: chunk's starting corner + vertex offset
        // Edge vertices now share coordinates: chunk N's last vertex = chunk N+1's first vertex
        const worldX = (chunkX * size + x) * this.chunkScale;
        const worldZ = (chunkZ * size + z) * this.chunkScale;

        let height = 0;
        height += this.noise(worldX * 0.001, worldZ * 0.001) * 25;
        height += this.noise(worldX * 0.004, worldZ * 0.004) * 10;
        height += this.noise(worldX * 0.015, worldZ * 0.015) * 3;
        height += this.noise(worldX * 0.05, worldZ * 0.05) * 1;

        height *= heightScale;

        heights[z * vertexCount + x] = height;
      }
    }

    return heights;
  }

  private noise(x: number, y: number): number {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;

    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);

    const n00 = this.hash(ix, iy);
    const n10 = this.hash(ix + 1, iy);
    const n01 = this.hash(ix, iy + 1);
    const n11 = this.hash(ix + 1, iy + 1);

    const nx0 = n00 * (1 - sx) + n10 * sx;
    const nx1 = n01 * (1 - sx) + n11 * sx;

    return nx0 * (1 - sy) + nx1 * sy;
  }

  private hash(x: number, y: number): number {
    let h = this.seed + x * 374761393 + y * 668265263;
    h = (h ^ (h >> 13)) * 1274126177;
    h = h ^ (h >> 16);
    return ((h & 0x7fffffff) / 0x7fffffff) * 2 - 1;
  }

  private unloadChunk(
    key: string,
    entityId: string,
    chunkComp: TerrainChunkComponent
  ): void {
    const entity = this.world.getEntity(entityId);
    if (!entity) return;

    const render = entity.getComponent(RenderComponent);

    // Remove from scene
    if (render?.addedToScene) {
      this.scene.remove(render.mesh);
    }

    // Remove physics
    if (chunkComp.physicsId) {
      this.physicsWorld.removeBody(chunkComp.physicsId);
    }

    // Remove entity
    this.world.removeEntity(entityId);
    this.chunks.delete(key);
  }

  private worldToChunkCoord(position: THREE.Vector3): ChunkCoord {
    return {
      x: Math.floor(position.x / (this.chunkSize * this.chunkScale)),
      z: Math.floor(position.z / (this.chunkSize * this.chunkScale)),
    };
  }

  private chunkKey(x: number, z: number): string {
    return `${x},${z}`;
  }

  getHeightAt(x: number, z: number): number {
    // Generate height on the fly
    let height = 0;
    height += this.noise(x * 0.001, z * 0.001) * 25;
    height += this.noise(x * 0.004, z * 0.004) * 10;
    height += this.noise(x * 0.015, z * 0.015) * 3;
    height += this.noise(x * 0.05, z * 0.05) * 1;
    return height;
  }

  getSeed(): number {
    return this.seed;
  }
}

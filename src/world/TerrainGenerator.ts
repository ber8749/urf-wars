import * as THREE from 'three';
import { TerrainChunk } from './TerrainChunk';
import { BiomeManager } from './BiomeManager';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import type { ChunkCoord } from '../types';

export class TerrainGenerator {
  private scene: THREE.Scene;
  private physicsWorld: PhysicsWorld;
  private biomeManager: BiomeManager;

  private chunks: Map<string, TerrainChunk> = new Map();
  private loadingChunks: Set<string> = new Set();
  private chunkQueue: Array<{ x: number; z: number; priority: number }> = [];
  private readonly MAX_CHUNKS_PER_FRAME = 1; // Limit to prevent stutters

  // Configuration
  public readonly chunkSize: number = 64;
  public readonly chunkScale: number = 2; // World units per vertex
  private viewDistance: number = 6; // Chunks in each direction
  private unloadDistance: number = 8;

  // Noise parameters for procedural generation
  private seed: number;

  constructor(scene: THREE.Scene, physicsWorld: PhysicsWorld, seed?: number) {
    this.scene = scene;
    this.physicsWorld = physicsWorld;
    this.seed = seed ?? Math.random() * 10000;
    this.biomeManager = new BiomeManager(this.seed);
  }

  generateAroundPosition(position: THREE.Vector3): void {
    const centerChunk = this.worldToChunkCoord(position);

    // Queue chunks that need to be loaded (sorted by distance for priority)
    for (let x = -this.viewDistance; x <= this.viewDistance; x++) {
      for (let z = -this.viewDistance; z <= this.viewDistance; z++) {
        const chunkX = centerChunk.x + x;
        const chunkZ = centerChunk.z + z;
        const key = this.chunkKey(chunkX, chunkZ);

        // Check if chunk needs to be loaded and isn't already queued
        if (!this.chunks.has(key) && !this.loadingChunks.has(key)) {
          // Calculate priority based on distance (closer = higher priority)
          const priority = Math.abs(x) + Math.abs(z);
          this.loadingChunks.add(key); // Mark as pending to avoid re-queuing
          this.chunkQueue.push({ x: chunkX, z: chunkZ, priority });
        }
      }
    }

    // Sort queue by priority (closest chunks first)
    this.chunkQueue.sort((a, b) => a.priority - b.priority);

    // Process only a limited number of chunks per frame to prevent stutters
    let chunksGenerated = 0;
    while (
      this.chunkQueue.length > 0 &&
      chunksGenerated < this.MAX_CHUNKS_PER_FRAME
    ) {
      const next = this.chunkQueue.shift()!;
      this.generateChunk(next.x, next.z);
      chunksGenerated++;
    }

    // Clean up queued chunks that are now too far away
    this.chunkQueue = this.chunkQueue.filter((item) => {
      const dx = Math.abs(item.x - centerChunk.x);
      const dz = Math.abs(item.z - centerChunk.z);
      if (dx > this.viewDistance || dz > this.viewDistance) {
        // Remove from loadingChunks since we're not going to generate it
        this.loadingChunks.delete(this.chunkKey(item.x, item.z));
        return false;
      }
      return true;
    });

    // Unload distant chunks
    for (const [key, chunk] of this.chunks) {
      const dx = Math.abs(chunk.coord.x - centerChunk.x);
      const dz = Math.abs(chunk.coord.z - centerChunk.z);

      if (dx > this.unloadDistance || dz > this.unloadDistance) {
        this.unloadChunk(key);
      }
    }
  }

  private generateChunk(chunkX: number, chunkZ: number): void {
    const key = this.chunkKey(chunkX, chunkZ);
    this.loadingChunks.add(key);

    // Calculate world position of chunk corner
    const worldX = chunkX * this.chunkSize * this.chunkScale;
    const worldZ = chunkZ * this.chunkSize * this.chunkScale;

    // Generate heightmap
    const heights = this.generateHeightmap(chunkX, chunkZ);

    // Determine biome for this chunk
    const biome = this.biomeManager.getBiomeAt(worldX, worldZ);

    // Create chunk
    const chunk = new TerrainChunk(
      { x: chunkX, z: chunkZ },
      this.chunkSize,
      this.chunkScale,
      heights,
      biome
    );

    // Position chunk mesh (PlaneGeometry is centered by default)
    const halfSize = (this.chunkSize * this.chunkScale) / 2;
    chunk.mesh.position.set(worldX + halfSize, 0, worldZ + halfSize);

    // Add physics collider using trimesh (more reliable than heightfield)
    const physicsId = `terrain-${key}`;
    const physicsBody = this.physicsWorld.createStaticBody(
      physicsId,
      new THREE.Vector3(worldX + halfSize, 0, worldZ + halfSize)
    );

    // Extract geometry data for physics
    const geometry = chunk.mesh.geometry;
    const posAttr = geometry.getAttribute('position');
    const vertices = new Float32Array(posAttr.count * 3);
    for (let i = 0; i < posAttr.count; i++) {
      vertices[i * 3] = posAttr.getX(i);
      vertices[i * 3 + 1] = posAttr.getY(i);
      vertices[i * 3 + 2] = posAttr.getZ(i);
    }

    // Get or generate indices
    let indices: Uint32Array;
    if (geometry.index) {
      indices = new Uint32Array(geometry.index.array);
    } else {
      // Generate indices for non-indexed geometry
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

    chunk.physicsId = physicsId;

    // Add to scene
    this.scene.add(chunk.mesh);
    this.chunks.set(key, chunk);
    this.loadingChunks.delete(key);
  }

  private generateHeightmap(chunkX: number, chunkZ: number): Float32Array {
    const size = this.chunkSize;
    const heights = new Float32Array(size * size);

    for (let z = 0; z < size; z++) {
      for (let x = 0; x < size; x++) {
        const worldX = (chunkX * size + x) * this.chunkScale;
        const worldZ = (chunkZ * size + z) * this.chunkScale;

        // Multi-octave noise for natural terrain (flattened)
        let height = 0;

        // Large scale features (gentle rolling hills)
        height += this.noise(worldX * 0.001, worldZ * 0.001) * 25;

        // Medium scale (subtle hills)
        height += this.noise(worldX * 0.004, worldZ * 0.004) * 10;

        // Small scale (minor bumps)
        height += this.noise(worldX * 0.015, worldZ * 0.015) * 3;

        // Fine detail (minimal)
        height += this.noise(worldX * 0.05, worldZ * 0.05) * 1;

        // Apply biome height modifier
        const biome = this.biomeManager.getBiomeAt(worldX, worldZ);
        height *= biome.heightScale;

        heights[z * size + x] = height;
      }
    }

    return heights;
  }

  // Simple noise function (would use a proper noise library in production)
  private noise(x: number, y: number): number {
    // Basic value noise implementation
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;

    // Smoothstep interpolation
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);

    // Get corner values
    const n00 = this.hash(ix, iy);
    const n10 = this.hash(ix + 1, iy);
    const n01 = this.hash(ix, iy + 1);
    const n11 = this.hash(ix + 1, iy + 1);

    // Bilinear interpolation
    const nx0 = n00 * (1 - sx) + n10 * sx;
    const nx1 = n01 * (1 - sx) + n11 * sx;

    return nx0 * (1 - sy) + nx1 * sy;
  }

  private hash(x: number, y: number): number {
    // Simple hash function for reproducible pseudo-random values
    const seed = this.seed;
    let h = seed + x * 374761393 + y * 668265263;
    h = (h ^ (h >> 13)) * 1274126177;
    h = h ^ (h >> 16);
    return ((h & 0x7fffffff) / 0x7fffffff) * 2 - 1;
  }

  private unloadChunk(key: string): void {
    const chunk = this.chunks.get(key);
    if (!chunk) return;

    // Remove from scene
    this.scene.remove(chunk.mesh);

    // Remove physics
    if (chunk.physicsId) {
      this.physicsWorld.removeBody(chunk.physicsId);
    }

    // Dispose
    chunk.dispose();
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
    const chunkCoord = this.worldToChunkCoord(new THREE.Vector3(x, 0, z));
    const key = this.chunkKey(chunkCoord.x, chunkCoord.z);
    const chunk = this.chunks.get(key);

    if (!chunk) {
      // Generate height on the fly if chunk not loaded (use same values as generateHeightmap)
      let height = 0;
      height += this.noise(x * 0.001, z * 0.001) * 25;
      height += this.noise(x * 0.004, z * 0.004) * 10;
      height += this.noise(x * 0.015, z * 0.015) * 3;
      height += this.noise(x * 0.05, z * 0.05) * 1;
      return height;
    }

    return chunk.getHeightAt(x, z);
  }

  setViewDistance(chunks: number): void {
    this.viewDistance = chunks;
    this.unloadDistance = chunks + 2;
  }

  getSeed(): number {
    return this.seed;
  }

  dispose(): void {
    for (const chunk of this.chunks.values()) {
      this.scene.remove(chunk.mesh);
      chunk.dispose();
    }
    this.chunks.clear();
  }
}

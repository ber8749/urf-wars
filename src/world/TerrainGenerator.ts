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
    
    // Generate chunks in view distance
    for (let x = -this.viewDistance; x <= this.viewDistance; x++) {
      for (let z = -this.viewDistance; z <= this.viewDistance; z++) {
        const chunkX = centerChunk.x + x;
        const chunkZ = centerChunk.z + z;
        const key = this.chunkKey(chunkX, chunkZ);
        
        // Check if chunk needs to be loaded
        if (!this.chunks.has(key) && !this.loadingChunks.has(key)) {
          this.generateChunk(chunkX, chunkZ);
        }
      }
    }
    
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
    
    // Position chunk mesh at corner (PlaneGeometry is centered by default, but we shift it)
    const halfSize = (this.chunkSize * this.chunkScale) / 2;
    chunk.mesh.position.set(worldX + halfSize, 0, worldZ + halfSize);
    
    // Add physics collider
    // Rapier heightfield is centered at body position
    const physicsId = `terrain-${key}`;
    const physicsBody = this.physicsWorld.createStaticBody(
      physicsId,
      new THREE.Vector3(worldX + halfSize, 0, worldZ + halfSize)
    );
    
    this.physicsWorld.addHeightfieldCollider(
      physicsBody,
      physicsId,
      heights,
      this.chunkSize,
      this.chunkSize,
      new THREE.Vector3(
        this.chunkSize * this.chunkScale,
        1.0,  // Heights are already in world units
        this.chunkSize * this.chunkScale
      )
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
        
        // Multi-octave noise for natural terrain
        let height = 0;
        
        // Large scale features (mountains, valleys)
        height += this.noise(worldX * 0.002, worldZ * 0.002) * 80;
        
        // Medium scale (hills)
        height += this.noise(worldX * 0.008, worldZ * 0.008) * 30;
        
        // Small scale (bumps)
        height += this.noise(worldX * 0.03, worldZ * 0.03) * 8;
        
        // Fine detail
        height += this.noise(worldX * 0.1, worldZ * 0.1) * 2;
        
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
    return (h & 0x7fffffff) / 0x7fffffff * 2 - 1;
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
      // Generate height on the fly if chunk not loaded
      let height = 0;
      height += this.noise(x * 0.002, z * 0.002) * 80;
      height += this.noise(x * 0.008, z * 0.008) * 30;
      height += this.noise(x * 0.03, z * 0.03) * 8;
      height += this.noise(x * 0.1, z * 0.1) * 2;
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


import type { Component } from '../core/Component';
import type { ChunkCoord } from '../types';

/**
 * Terrain chunk component for terrain entities.
 */
export class TerrainChunkComponent implements Component {
  static readonly type = 'TerrainChunk';
  readonly type = TerrainChunkComponent.type;

  /** Chunk coordinates in the terrain grid */
  coord: ChunkCoord;

  /** Physics body ID for this chunk */
  physicsId: string | null = null;

  /** Height data for the chunk */
  heights: Float32Array;

  /** Chunk size in vertices */
  chunkSize: number;

  /** World scale per vertex */
  chunkScale: number;

  constructor(
    coord: ChunkCoord,
    heights: Float32Array,
    chunkSize: number,
    chunkScale: number
  ) {
    this.coord = coord;
    this.heights = heights;
    this.chunkSize = chunkSize;
    this.chunkScale = chunkScale;
  }

  /**
   * Get world position of chunk corner
   */
  getWorldPosition(): { x: number; z: number } {
    return {
      x: this.coord.x * this.chunkSize * this.chunkScale,
      z: this.coord.z * this.chunkSize * this.chunkScale,
    };
  }

  /**
   * Get height at a local position within the chunk
   */
  getHeightAt(localX: number, localZ: number): number {
    // Vertex count is chunkSize + 1 (size segments = size+1 vertices)
    const vertexCount = this.chunkSize + 1;
    // Clamp to valid range
    const x = Math.max(0, Math.min(this.chunkSize, Math.floor(localX)));
    const z = Math.max(0, Math.min(this.chunkSize, Math.floor(localZ)));
    return this.heights[z * vertexCount + x];
  }
}

import * as THREE from 'three';
import type { ChunkCoord, BiomeConfig } from '../types';

export class TerrainChunk {
  public coord: ChunkCoord;
  public mesh: THREE.Mesh;
  public physicsId?: string;

  private size: number;
  private scale: number;
  private heights: Float32Array;
  private biome: BiomeConfig;

  constructor(
    coord: ChunkCoord,
    size: number,
    scale: number,
    heights: Float32Array,
    biome: BiomeConfig
  ) {
    this.coord = coord;
    this.size = size;
    this.scale = scale;
    this.heights = heights;
    this.biome = biome;

    this.mesh = this.createMesh();
  }

  private createMesh(): THREE.Mesh {
    const geometry = new THREE.PlaneGeometry(
      this.size * this.scale,
      this.size * this.scale,
      this.size - 1,
      this.size - 1
    );

    // Rotate to be horizontal
    geometry.rotateX(-Math.PI / 2);

    // Apply heightmap
    const positions = geometry.attributes.position;
    const colors = new Float32Array(positions.count * 3);

    for (let i = 0; i < positions.count; i++) {
      const x = i % this.size;
      const z = Math.floor(i / this.size);
      const height = this.heights[z * this.size + x];

      positions.setY(i, height);

      // Calculate vertex color based on height
      const color = this.getHeightColor(height);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.computeVertexNormals();

    // Create material with vertex colors and flat shading for retro look
    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      flatShading: true,
      roughness: 0.9,
      metalness: 0.1,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = false;
    mesh.receiveShadow = true;

    return mesh;
  }

  private getHeightColor(_height: number): THREE.Color {
    // Uniform terrain color - earthy brown/tan
    return new THREE.Color(0x8b7355);
  }

  getHeightAt(worldX: number, worldZ: number): number {
    // Convert world position to local chunk position
    // Chunk is centered at its position, so we need to offset
    const halfSize = (this.size * this.scale) / 2;
    const chunkCenterX = this.coord.x * this.size * this.scale + halfSize;
    const chunkCenterZ = this.coord.z * this.size * this.scale + halfSize;

    // Convert from world to local (0 to size range)
    const localX = (worldX - chunkCenterX) / this.scale + this.size / 2;
    const localZ = (worldZ - chunkCenterZ) / this.scale + this.size / 2;

    // Bilinear interpolation
    const x0 = Math.floor(localX);
    const z0 = Math.floor(localZ);
    const x1 = Math.min(x0 + 1, this.size - 1);
    const z1 = Math.min(z0 + 1, this.size - 1);

    const fx = localX - x0;
    const fz = localZ - z0;

    const h00 = this.heights[z0 * this.size + x0] || 0;
    const h10 = this.heights[z0 * this.size + x1] || 0;
    const h01 = this.heights[z1 * this.size + x0] || 0;
    const h11 = this.heights[z1 * this.size + x1] || 0;

    const h0 = h00 * (1 - fx) + h10 * fx;
    const h1 = h01 * (1 - fx) + h11 * fx;

    return h0 * (1 - fz) + h1 * fz;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    if (this.mesh.material instanceof THREE.Material) {
      this.mesh.material.dispose();
    }
  }
}

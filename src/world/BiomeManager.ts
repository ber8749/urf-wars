import * as THREE from 'three';
import type { BiomeConfig } from '../types';

// Biome definitions - BRIGHT colors for visibility
const BIOMES: BiomeConfig[] = [
  {
    name: 'Desert',
    groundColor: new THREE.Color(0xddcc88),  // Bright sandy tan
    hillColor: new THREE.Color(0xccbb77),    // Light sand
    peakColor: new THREE.Color(0xbbaa66),    // Light rocky
    heightScale: 0.7,
  },
  {
    name: 'Tundra',
    groundColor: new THREE.Color(0xaabbaa),  // Pale green
    hillColor: new THREE.Color(0xbbccdd),    // Ice blue
    peakColor: new THREE.Color(0xeeffff),    // Bright snow
    heightScale: 1.0,
  },
  {
    name: 'Volcanic',
    groundColor: new THREE.Color(0x776666),  // Gray (not black!)
    hillColor: new THREE.Color(0x886666),    // Reddish gray
    peakColor: new THREE.Color(0xaa7777),    // Light red
    heightScale: 1.3,
  },
  {
    name: 'Forest',
    groundColor: new THREE.Color(0x77aa77),  // Bright green
    hillColor: new THREE.Color(0x88bb77),    // Light forest green
    peakColor: new THREE.Color(0xaaaaaa),    // Light gray rock
    heightScale: 0.9,
  },
  {
    name: 'Badlands',
    groundColor: new THREE.Color(0xcc8855),  // Bright orange-brown
    hillColor: new THREE.Color(0xdd9966),    // Light orange
    peakColor: new THREE.Color(0xeeaa77),    // Bright tan
    heightScale: 1.1,
  },
];

export class BiomeManager {
  private seed: number;
  private biomeScale: number = 0.0005; // How large biome regions are
  
  constructor(seed: number) {
    this.seed = seed;
  }
  
  getBiomeAt(worldX: number, worldZ: number): BiomeConfig {
    // Use noise to determine biome
    const biomeNoise = this.biomeNoise(worldX, worldZ);
    
    // Map noise to biome index
    const normalizedNoise = (biomeNoise + 1) / 2; // 0 to 1
    const biomeIndex = Math.floor(normalizedNoise * BIOMES.length);
    
    return BIOMES[Math.min(biomeIndex, BIOMES.length - 1)];
  }
  
  // Get interpolated biome values for smooth transitions
  getBlendedBiomeAt(worldX: number, worldZ: number): BiomeConfig {
    // For now, just return center biome
    // Could implement smooth blending between biomes
    return this.getBiomeAt(worldX, worldZ);
  }
  
  private biomeNoise(x: number, z: number): number {
    // Simple noise for biome selection
    const nx = x * this.biomeScale;
    const nz = z * this.biomeScale;
    
    // Use different seed offset for biome noise
    return this.noise2D(nx, nz, this.seed + 1000);
  }
  
  private noise2D(x: number, y: number, seed: number): number {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;
    
    // Smoothstep
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    
    const n00 = this.hash2D(ix, iy, seed);
    const n10 = this.hash2D(ix + 1, iy, seed);
    const n01 = this.hash2D(ix, iy + 1, seed);
    const n11 = this.hash2D(ix + 1, iy + 1, seed);
    
    const nx0 = n00 * (1 - sx) + n10 * sx;
    const nx1 = n01 * (1 - sx) + n11 * sx;
    
    return nx0 * (1 - sy) + nx1 * sy;
  }
  
  private hash2D(x: number, y: number, seed: number): number {
    let h = seed + x * 374761393 + y * 668265263;
    h = (h ^ (h >> 13)) * 1274126177;
    h = h ^ (h >> 16);
    return (h & 0x7fffffff) / 0x7fffffff * 2 - 1;
  }
  
  getAllBiomes(): BiomeConfig[] {
    return [...BIOMES];
  }
  
  getBiomeByName(name: string): BiomeConfig | undefined {
    return BIOMES.find(b => b.name === name);
  }
}


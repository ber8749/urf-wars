import * as THREE from 'three';
import { COLORS } from '../types';

export class Arena {
  private scene: THREE.Scene;
  public obstacles: THREE.Mesh[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.createGround();
    this.createObstacles();
  }

  private createGround(): void {
    // Main ground plane
    const groundGeo = new THREE.PlaneGeometry(500, 500, 50, 50);
    const groundMat = new THREE.MeshStandardMaterial({
      color: COLORS.ground,
      roughness: 0.9,
      metalness: 0.1,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Grid lines
    const gridHelper = new THREE.GridHelper(500, 50, COLORS.gridLines, COLORS.gridLines);
    gridHelper.position.y = 0.01; // Slightly above ground to prevent z-fighting
    (gridHelper.material as THREE.Material).opacity = 0.3;
    (gridHelper.material as THREE.Material).transparent = true;
    this.scene.add(gridHelper);

    // Arena boundary markers
    this.createBoundaryMarkers();
  }

  private createBoundaryMarkers(): void {
    const markerMaterial = new THREE.MeshStandardMaterial({
      color: 0xff4444,
      emissive: 0x441111,
    });

    // Corner posts
    const corners = [
      [-245, -245], [-245, 245], [245, -245], [245, 245]
    ];

    for (const [x, z] of corners) {
      const postGeo = new THREE.CylinderGeometry(1, 1, 15, 8);
      const post = new THREE.Mesh(postGeo, markerMaterial);
      post.position.set(x, 7.5, z);
      post.castShadow = true;
      this.scene.add(post);
    }
  }

  private createObstacles(): void {
    const obstacleMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.obstacles,
      roughness: 0.8,
      metalness: 0.2,
    });

    // Define obstacle configurations: [x, z, width, height, depth]
    const obstacleConfigs: [number, number, number, number, number][] = [
      // Tall obstacles (6m) - corners
      [-80, -80, 8, 12, 8],
      [80, -80, 8, 12, 8],
      [-80, 80, 8, 12, 8],
      [80, 80, 8, 12, 8],

      // Medium obstacles (3m) - mid positions
      [0, -40, 15, 6, 6],
      [-50, 0, 6, 6, 15],
      [50, 0, 6, 6, 15],
      [0, 40, 15, 6, 6],

      // Low cover (1m) - scattered
      [-30, -30, 4, 2, 4],
      [30, -30, 4, 2, 4],
      [-30, 30, 4, 2, 4],
      [30, 30, 4, 2, 4],
      [-60, -40, 3, 2, 6],
      [60, -40, 3, 2, 6],
      [-60, 40, 3, 2, 6],
      [60, 40, 3, 2, 6],

      // Additional cover near targets
      [-40, -60, 5, 4, 3],
      [40, -60, 5, 4, 3],
      [0, -60, 3, 3, 8],
    ];

    for (const [x, z, w, h, d] of obstacleConfigs) {
      const geo = new THREE.BoxGeometry(w, h, d);
      const obstacle = new THREE.Mesh(geo, obstacleMaterial);
      obstacle.position.set(x, h / 2, z);
      obstacle.castShadow = true;
      obstacle.receiveShadow = true;
      this.obstacles.push(obstacle);
      this.scene.add(obstacle);
    }

    // Add a ramp
    this.createRamp();
  }

  private createRamp(): void {
    const rampMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.obstacles,
      roughness: 0.8,
      metalness: 0.2,
    });

    // Create a simple ramp using a rotated box
    const rampGeo = new THREE.BoxGeometry(20, 1, 15);
    const ramp = new THREE.Mesh(rampGeo, rampMaterial);
    ramp.position.set(0, 1.5, -100);
    ramp.rotation.x = -Math.PI / 12; // Slight incline
    ramp.castShadow = true;
    ramp.receiveShadow = true;
    this.obstacles.push(ramp);
    this.scene.add(ramp);
  }

  // Get all obstacle meshes for collision detection
  getObstacles(): THREE.Mesh[] {
    return this.obstacles;
  }
}


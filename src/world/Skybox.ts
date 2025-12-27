import * as THREE from 'three';

export class Skybox {
  private scene: THREE.Scene;
  private skyMesh: THREE.Mesh;
  
  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.skyMesh = this.createSky();
    this.scene.add(this.skyMesh);
  }
  
  private createSky(): THREE.Mesh {
    // Create a large sphere for the sky
    const geometry = new THREE.SphereGeometry(1500, 32, 32);
    
    // Create gradient shader for sky
    const material = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x2244aa) },      // Sky blue
        horizonColor: { value: new THREE.Color(0x88aadd) },  // Bright horizon
        bottomColor: { value: new THREE.Color(0x556677) },   // Ground reflection
        sunColor: { value: new THREE.Color(0xffeebb) },      // Sun glow
        sunDirection: { value: new THREE.Vector3(0.4, 0.6, 0.3).normalize() },
        fogColor: { value: new THREE.Color(0x667788) },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 horizonColor;
        uniform vec3 bottomColor;
        uniform vec3 sunColor;
        uniform vec3 sunDirection;
        uniform vec3 fogColor;
        
        varying vec3 vWorldPosition;
        
        void main() {
          // Calculate height factor
          vec3 pointOnSphere = normalize(vWorldPosition);
          float heightFactor = pointOnSphere.y;
          
          // Sky gradient
          vec3 skyColor;
          if (heightFactor > 0.0) {
            // Above horizon
            float t = pow(heightFactor, 0.5);
            skyColor = mix(horizonColor, topColor, t);
          } else {
            // Below horizon (ground reflection)
            float t = pow(-heightFactor, 0.3);
            skyColor = mix(horizonColor, bottomColor, t);
          }
          
          // Add sun glow
          float sunDot = max(0.0, dot(pointOnSphere, sunDirection));
          float sunGlow = pow(sunDot, 32.0);
          float sunHalo = pow(sunDot, 4.0) * 0.3;
          skyColor += sunColor * (sunGlow + sunHalo);
          
          // Add stars in upper sky
          if (heightFactor > 0.2) {
            // Simple star pattern using noise
            float starNoise = fract(sin(dot(pointOnSphere.xz * 100.0, vec2(12.9898, 78.233))) * 43758.5453);
            float starIntensity = step(0.998, starNoise) * (heightFactor - 0.2);
            skyColor += vec3(starIntensity);
          }
          
          // Subtle horizon line
          float horizonLine = 1.0 - smoothstep(0.0, 0.05, abs(heightFactor));
          skyColor = mix(skyColor, horizonColor * 1.2, horizonLine * 0.3);
          
          gl_FragColor = vec4(skyColor, 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false,
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.renderOrder = -1000; // Render first
    
    return mesh;
  }
  
  // Update sun position (for time of day effects)
  setSunDirection(direction: THREE.Vector3): void {
    const material = this.skyMesh.material as THREE.ShaderMaterial;
    material.uniforms.sunDirection.value.copy(direction).normalize();
  }
  
  setColors(top: THREE.Color, horizon: THREE.Color, bottom: THREE.Color): void {
    const material = this.skyMesh.material as THREE.ShaderMaterial;
    material.uniforms.topColor.value.copy(top);
    material.uniforms.horizonColor.value.copy(horizon);
    material.uniforms.bottomColor.value.copy(bottom);
  }
  
  dispose(): void {
    this.skyMesh.geometry.dispose();
    (this.skyMesh.material as THREE.Material).dispose();
    this.scene.remove(this.skyMesh);
  }
}


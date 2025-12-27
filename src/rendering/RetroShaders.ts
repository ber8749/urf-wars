import * as THREE from 'three';

// Custom shader materials for retro aesthetic

export const FlatShadedMaterial = (color: THREE.Color): THREE.MeshStandardMaterial => {
  return new THREE.MeshStandardMaterial({
    color,
    flatShading: true,
    roughness: 0.8,
    metalness: 0.2,
  });
};

// Low-poly terrain material with vertex colors
export const TerrainMaterial = (): THREE.MeshStandardMaterial => {
  return new THREE.MeshStandardMaterial({
    vertexColors: true,
    flatShading: true,
    roughness: 0.9,
    metalness: 0.0,
  });
};

// Glowing material for energy weapons
export const EnergyMaterial = (color: THREE.Color): THREE.ShaderMaterial => {
  return new THREE.ShaderMaterial({
    uniforms: {
      color: { value: color },
      time: { value: 0 },
      intensity: { value: 1.0 },
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vPosition;
      
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 color;
      uniform float time;
      uniform float intensity;
      
      varying vec3 vNormal;
      varying vec3 vPosition;
      
      void main() {
        // Fresnel effect for edge glow
        vec3 viewDir = normalize(cameraPosition - vPosition);
        float fresnel = 1.0 - abs(dot(viewDir, vNormal));
        fresnel = pow(fresnel, 2.0);
        
        // Pulsing effect
        float pulse = sin(time * 5.0) * 0.2 + 0.8;
        
        vec3 finalColor = color * intensity * pulse;
        finalColor += color * fresnel * 0.5;
        
        gl_FragColor = vec4(finalColor, 0.9);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
  });
};

// Holographic material for UI elements in 3D
export const HologramMaterial = (color: THREE.Color): THREE.ShaderMaterial => {
  return new THREE.ShaderMaterial({
    uniforms: {
      color: { value: color },
      time: { value: 0 },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vPosition;
      
      void main() {
        vUv = uv;
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 color;
      uniform float time;
      
      varying vec2 vUv;
      varying vec3 vPosition;
      
      void main() {
        // Scanline effect
        float scanline = sin(vUv.y * 100.0 + time * 2.0) * 0.1 + 0.9;
        
        // Flickering
        float flicker = sin(time * 30.0) * 0.05 + 0.95;
        
        // Edge fade
        float edge = smoothstep(0.0, 0.1, vUv.x) * smoothstep(1.0, 0.9, vUv.x);
        edge *= smoothstep(0.0, 0.1, vUv.y) * smoothstep(1.0, 0.9, vUv.y);
        
        vec3 finalColor = color * scanline * flicker;
        float alpha = edge * 0.7;
        
        gl_FragColor = vec4(finalColor, alpha);
      }
    `,
    transparent: true,
    side: THREE.DoubleSide,
  });
};

// Shield/energy barrier material
export const ShieldMaterial = (color: THREE.Color): THREE.ShaderMaterial => {
  return new THREE.ShaderMaterial({
    uniforms: {
      color: { value: color },
      time: { value: 0 },
      hitPoint: { value: new THREE.Vector3(0, 0, 0) },
      hitTime: { value: -10.0 },
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vWorldPosition;
      
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 color;
      uniform float time;
      uniform vec3 hitPoint;
      uniform float hitTime;
      
      varying vec3 vNormal;
      varying vec3 vWorldPosition;
      
      void main() {
        // Fresnel edge glow
        vec3 viewDir = normalize(cameraPosition - vWorldPosition);
        float fresnel = 1.0 - abs(dot(viewDir, vNormal));
        fresnel = pow(fresnel, 3.0);
        
        // Hexagonal pattern
        vec2 hexUv = vWorldPosition.xz * 0.5;
        float hex = sin(hexUv.x * 10.0) * sin(hexUv.y * 10.0);
        hex = smoothstep(0.3, 0.5, hex);
        
        // Hit ripple
        float hitDist = distance(vWorldPosition, hitPoint);
        float ripple = sin((hitDist - (time - hitTime) * 5.0) * 10.0);
        ripple = ripple * 0.5 + 0.5;
        ripple *= smoothstep(2.0, 0.0, time - hitTime);
        ripple *= smoothstep(5.0, 0.0, hitDist);
        
        vec3 finalColor = color * (fresnel + hex * 0.2 + ripple);
        float alpha = fresnel * 0.5 + hex * 0.1 + ripple * 0.3;
        
        gl_FragColor = vec4(finalColor, alpha);
      }
    `,
    transparent: true,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
};

// Update shader time uniforms
export function updateShaderTime(material: THREE.ShaderMaterial, time: number): void {
  if (material.uniforms.time) {
    material.uniforms.time.value = time;
  }
}

// Utility to create a wireframe overlay
export const WireframeMaterial = (color: THREE.Color): THREE.LineBasicMaterial => {
  return new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: 0.3,
  });
};


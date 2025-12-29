import * as THREE from 'three';
import { RENDERING_CONFIG } from '../config/RenderingConfig';

export class PostProcessing {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.Camera;

  // Render targets for post processing
  private renderTarget: THREE.WebGLRenderTarget;
  private normalTarget: THREE.WebGLRenderTarget;
  private outputTarget: THREE.WebGLRenderTarget;

  // Normal rendering material (for edge detection on geometry edges)
  private normalMaterial: THREE.MeshNormalMaterial;
  private originalMaterials: Map<
    THREE.Mesh,
    THREE.Material | THREE.Material[]
  > = new Map();

  // Post processing materials
  private compositeMaterial: THREE.ShaderMaterial;
  private fullscreenQuad: THREE.Mesh;
  private postScene: THREE.Scene;
  private postCamera: THREE.OrthographicCamera;

  // Settings - initialized from centralized config (mutable copy)
  private settings: {
    scanlines: boolean;
    scanlineIntensity: number;
    vignette: boolean;
    vignetteIntensity: number;
    bloom: boolean;
    bloomIntensity: number;
    chromaticAberration: boolean;
    aberrationAmount: number;
    colorGrading: boolean;
    outline: boolean;
    outlineThickness: number;
    outlineColor: { r: number; g: number; b: number };
    outlineDepthSensitivity: number;
    outlineNormalSensitivity: number;
  } = { ...RENDERING_CONFIG.POST_PROCESSING };

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera
  ) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;

    const width = window.innerWidth;
    const height = window.innerHeight;

    // Create render target with depth texture
    const depthTexture = new THREE.DepthTexture(width, height);
    depthTexture.format = THREE.DepthFormat;
    depthTexture.type = THREE.UnsignedIntType;

    this.renderTarget = new THREE.WebGLRenderTarget(width, height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      depthTexture: depthTexture,
    });

    // Create normal render target with depth for outlined objects only
    const outlineDepthTexture = new THREE.DepthTexture(width, height);
    outlineDepthTexture.format = THREE.DepthFormat;
    outlineDepthTexture.type = THREE.UnsignedIntType;

    this.normalTarget = new THREE.WebGLRenderTarget(width, height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      depthTexture: outlineDepthTexture,
    });

    this.outputTarget = new THREE.WebGLRenderTarget(width, height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
    });

    // Normal material for edge detection
    this.normalMaterial = new THREE.MeshNormalMaterial();

    // Create post processing scene
    this.postScene = new THREE.Scene();
    this.postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    // Create composite shader
    this.compositeMaterial = this.createCompositeMaterial();

    // Fullscreen quad
    const quadGeometry = new THREE.PlaneGeometry(2, 2);
    this.fullscreenQuad = new THREE.Mesh(quadGeometry, this.compositeMaterial);
    this.postScene.add(this.fullscreenQuad);
  }

  private createCompositeMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        tDepth: { value: null },
        tNormal: { value: null },
        tOutlineDepth: { value: null },
        resolution: {
          value: new THREE.Vector2(window.innerWidth, window.innerHeight),
        },
        time: { value: 0 },
        cameraNear: { value: 0.1 },
        cameraFar: { value: 1000 },
        scanlineIntensity: {
          value: this.settings.scanlines ? this.settings.scanlineIntensity : 0,
        },
        vignetteIntensity: {
          value: this.settings.vignette ? this.settings.vignetteIntensity : 0,
        },
        bloomIntensity: {
          value: this.settings.bloom ? this.settings.bloomIntensity : 0,
        },
        aberrationAmount: {
          value: this.settings.chromaticAberration
            ? this.settings.aberrationAmount
            : 0,
        },
        outlineEnabled: { value: this.settings.outline ? 1.0 : 0.0 },
        outlineThickness: { value: this.settings.outlineThickness },
        outlineColor: {
          value: new THREE.Vector3(
            this.settings.outlineColor.r,
            this.settings.outlineColor.g,
            this.settings.outlineColor.b
          ),
        },
        outlineDepthSensitivity: {
          value: this.settings.outlineDepthSensitivity,
        },
        outlineNormalSensitivity: {
          value: this.settings.outlineNormalSensitivity,
        },
      },
      vertexShader: `
        varying vec2 vUv;
        
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform sampler2D tDepth;
        uniform sampler2D tNormal;
        uniform sampler2D tOutlineDepth;
        uniform vec2 resolution;
        uniform float time;
        uniform float cameraNear;
        uniform float cameraFar;
        uniform float scanlineIntensity;
        uniform float vignetteIntensity;
        uniform float bloomIntensity;
        uniform float aberrationAmount;
        uniform float outlineEnabled;
        uniform float outlineThickness;
        uniform vec3 outlineColor;
        uniform float outlineDepthSensitivity;
        uniform float outlineNormalSensitivity;
        
        varying vec2 vUv;
        
        // Pseudo-random function
        float rand(vec2 co) {
          return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
        }
        
        // Linearize depth value and normalize to 0-1 range
        float linearizeDepth(float depth) {
          float z = depth * 2.0 - 1.0;
          float linearZ = (2.0 * cameraNear * cameraFar) / (cameraFar + cameraNear - z * (cameraFar - cameraNear));
          // Normalize to 0-1 range based on camera near/far
          return (linearZ - cameraNear) / (cameraFar - cameraNear);
        }
        
        // Sobel edge detection on depth (uses outline-only depth buffer)
        float sobelDepth(vec2 uv, vec2 texelSize) {
          float d00 = linearizeDepth(texture2D(tOutlineDepth, uv + texelSize * vec2(-1.0, -1.0)).r);
          float d01 = linearizeDepth(texture2D(tOutlineDepth, uv + texelSize * vec2(-1.0,  0.0)).r);
          float d02 = linearizeDepth(texture2D(tOutlineDepth, uv + texelSize * vec2(-1.0,  1.0)).r);
          float d10 = linearizeDepth(texture2D(tOutlineDepth, uv + texelSize * vec2( 0.0, -1.0)).r);
          float d11 = linearizeDepth(texture2D(tOutlineDepth, uv).r); // Center sample for distance falloff
          float d12 = linearizeDepth(texture2D(tOutlineDepth, uv + texelSize * vec2( 0.0,  1.0)).r);
          float d20 = linearizeDepth(texture2D(tOutlineDepth, uv + texelSize * vec2( 1.0, -1.0)).r);
          float d21 = linearizeDepth(texture2D(tOutlineDepth, uv + texelSize * vec2( 1.0,  0.0)).r);
          float d22 = linearizeDepth(texture2D(tOutlineDepth, uv + texelSize * vec2( 1.0,  1.0)).r);
          
          float gx = -d00 - 2.0 * d01 - d02 + d20 + 2.0 * d21 + d22;
          float gy = -d00 - 2.0 * d10 - d20 + d02 + 2.0 * d12 + d22;
          
          float edge = sqrt(gx * gx + gy * gy);
          
          // Apply distance-based falloff - edges fade out at distance
          float distanceFalloff = 1.0 - smoothstep(0.0, 0.3, d11);
          return edge * distanceFalloff;
        }
        
        // Sobel edge detection on normals
        float sobelNormal(vec2 uv, vec2 texelSize, float depth) {
          vec3 n00 = texture2D(tNormal, uv + texelSize * vec2(-1.0, -1.0)).rgb;
          vec3 n01 = texture2D(tNormal, uv + texelSize * vec2(-1.0,  0.0)).rgb;
          vec3 n02 = texture2D(tNormal, uv + texelSize * vec2(-1.0,  1.0)).rgb;
          vec3 n10 = texture2D(tNormal, uv + texelSize * vec2( 0.0, -1.0)).rgb;
          vec3 n12 = texture2D(tNormal, uv + texelSize * vec2( 0.0,  1.0)).rgb;
          vec3 n20 = texture2D(tNormal, uv + texelSize * vec2( 1.0, -1.0)).rgb;
          vec3 n21 = texture2D(tNormal, uv + texelSize * vec2( 1.0,  0.0)).rgb;
          vec3 n22 = texture2D(tNormal, uv + texelSize * vec2( 1.0,  1.0)).rgb;
          
          vec3 gx = -n00 - 2.0 * n01 - n02 + n20 + 2.0 * n21 + n22;
          vec3 gy = -n00 - 2.0 * n10 - n20 + n02 + 2.0 * n12 + n22;
          
          float edge = length(gx) + length(gy);
          
          // Apply distance-based falloff
          float distanceFalloff = 1.0 - smoothstep(0.0, 0.3, depth);
          return edge * distanceFalloff;
        }
        
        void main() {
          vec2 uv = vUv;
          vec2 texelSize = outlineThickness / resolution;
          
          // Chromatic aberration
          vec2 aberration = (uv - 0.5) * aberrationAmount;
          float r = texture2D(tDiffuse, uv + aberration).r;
          float g = texture2D(tDiffuse, uv).g;
          float b = texture2D(tDiffuse, uv - aberration).b;
          vec3 color = vec3(r, g, b);
          
          // Edge detection for cel-shading outline
          if (outlineEnabled > 0.5) {
            // Get center depth for distance-based falloff (from outline-only depth)
            float centerDepth = linearizeDepth(texture2D(tOutlineDepth, uv).r);
            
            float depthEdge = sobelDepth(uv, texelSize) * outlineDepthSensitivity;
            float normalEdge = sobelNormal(uv, texelSize, centerDepth) * outlineNormalSensitivity;
            
            // Combine edges with clamping
            float edge = min(max(depthEdge, normalEdge), 1.0);
            edge = smoothstep(0.02, 0.15, edge);
            
            // Apply outline color
            color = mix(color, outlineColor, edge);
          }
          
          // Simple bloom (brighten bright areas)
          vec3 bloom = vec3(0.0);
          float bloomThreshold = 0.7;
          if (length(color) > bloomThreshold) {
            bloom = (color - bloomThreshold) * bloomIntensity;
          }
          color += bloom;
          
          // Scanlines
          float scanline = sin(uv.y * resolution.y * 1.5) * 0.5 + 0.5;
          scanline = pow(scanline, 1.5);
          color = mix(color, color * scanline, scanlineIntensity);
          
          // Horizontal scanline flicker
          float flicker = sin(time * 10.0 + uv.y * 100.0) * 0.005;
          color += flicker;
          
          // Vignette
          vec2 vignetteUv = uv * (1.0 - uv.yx);
          float vignette = vignetteUv.x * vignetteUv.y * 15.0;
          vignette = pow(vignette, vignetteIntensity);
          color *= vignette;
          
          // Color grading - boost greens and teals for retro CRT look
          color.g *= 1.05;
          color.b *= 0.95;
          
          // Slight noise for analog feel
          float noise = rand(uv + time) * 0.02;
          color += noise;
          
          // Slight contrast boost (less aggressive)
          color = (color - 0.5) * 1.05 + 0.5;
          
          // Brightness boost
          color *= 1.1;
          
          gl_FragColor = vec4(color, 1.0);
        }
      `,
    });
  }

  render(): void {
    // Update time uniform
    this.compositeMaterial.uniforms.time.value = performance.now() / 1000;

    // Update camera uniforms
    if (this.camera instanceof THREE.PerspectiveCamera) {
      this.compositeMaterial.uniforms.cameraNear.value = this.camera.near;
      this.compositeMaterial.uniforms.cameraFar.value = this.camera.far;
    }

    // Render scene to render target (color + depth)
    this.renderer.setRenderTarget(this.renderTarget);
    this.renderer.render(this.scene, this.camera);

    // Render normals pass for edge detection
    if (this.settings.outline) {
      this.renderNormals();
    }

    // Apply post processing
    this.compositeMaterial.uniforms.tDiffuse.value = this.renderTarget.texture;
    this.compositeMaterial.uniforms.tDepth.value =
      this.renderTarget.depthTexture;
    this.compositeMaterial.uniforms.tNormal.value = this.normalTarget.texture;
    this.compositeMaterial.uniforms.tOutlineDepth.value =
      this.normalTarget.depthTexture;

    // Render to screen
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.postScene, this.postCamera);
  }

  private renderNormals(): void {
    // Store original materials and visibility for outlined objects only
    const hiddenObjects: THREE.Object3D[] = [];

    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.material) {
        // Check if this object or any parent is marked for outlining
        const shouldOutline = this.shouldObjectHaveOutline(obj);

        if (shouldOutline) {
          // Swap material for outlined objects
          this.originalMaterials.set(obj, obj.material);
          obj.material = this.normalMaterial;
        } else if (obj.visible) {
          // Hide non-outlined objects during normal pass
          obj.visible = false;
          hiddenObjects.push(obj);
        }
      }
    });

    // Clear to a neutral normal color (facing camera = blue)
    this.renderer.setRenderTarget(this.normalTarget);
    this.renderer.setClearColor(0x8080ff, 1); // Neutral normal pointing at camera
    this.renderer.clear();

    // Render normals of outlined objects only
    this.renderer.render(this.scene, this.camera);

    // Restore original materials
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh && this.originalMaterials.has(obj)) {
        obj.material = this.originalMaterials.get(obj)!;
      }
    });
    this.originalMaterials.clear();

    // Restore visibility of hidden objects
    for (const obj of hiddenObjects) {
      obj.visible = true;
    }

    // Reset clear color
    this.renderer.setClearColor(0x000000, 1);
  }

  /**
   * Check if an object should have outline applied.
   * Walks up the parent hierarchy to find outline flag.
   */
  private shouldObjectHaveOutline(obj: THREE.Object3D): boolean {
    let current: THREE.Object3D | null = obj;
    while (current) {
      if (current.userData.outline === true) {
        return true;
      }
      current = current.parent;
    }
    return false;
  }

  /**
   * Static helper to mark an object (and all children) for outlining
   */
  static markForOutline(object: THREE.Object3D): void {
    object.userData.outline = true;
  }

  resize(width: number, height: number): void {
    this.renderTarget.setSize(width, height);
    this.normalTarget.setSize(width, height);
    this.outputTarget.setSize(width, height);

    // Resize depth textures
    if (this.renderTarget.depthTexture) {
      this.renderTarget.depthTexture.image.width = width;
      this.renderTarget.depthTexture.image.height = height;
      this.renderTarget.depthTexture.needsUpdate = true;
    }
    if (this.normalTarget.depthTexture) {
      this.normalTarget.depthTexture.image.width = width;
      this.normalTarget.depthTexture.image.height = height;
      this.normalTarget.depthTexture.needsUpdate = true;
    }

    this.compositeMaterial.uniforms.resolution.value.set(width, height);
  }

  // Settings methods
  setScanlines(enabled: boolean, intensity?: number): void {
    this.settings.scanlines = enabled;
    if (intensity !== undefined) {
      this.settings.scanlineIntensity = intensity;
    }
    this.compositeMaterial.uniforms.scanlineIntensity.value = enabled
      ? this.settings.scanlineIntensity
      : 0;
  }

  setVignette(enabled: boolean, intensity?: number): void {
    this.settings.vignette = enabled;
    if (intensity !== undefined) {
      this.settings.vignetteIntensity = intensity;
    }
    this.compositeMaterial.uniforms.vignetteIntensity.value = enabled
      ? this.settings.vignetteIntensity
      : 0;
  }

  setBloom(enabled: boolean, intensity?: number): void {
    this.settings.bloom = enabled;
    if (intensity !== undefined) {
      this.settings.bloomIntensity = intensity;
    }
    this.compositeMaterial.uniforms.bloomIntensity.value = enabled
      ? this.settings.bloomIntensity
      : 0;
  }

  setChromaticAberration(enabled: boolean, amount?: number): void {
    this.settings.chromaticAberration = enabled;
    if (amount !== undefined) {
      this.settings.aberrationAmount = amount;
    }
    this.compositeMaterial.uniforms.aberrationAmount.value = enabled
      ? this.settings.aberrationAmount
      : 0;
  }

  setOutline(enabled: boolean, thickness?: number): void {
    this.settings.outline = enabled;
    if (thickness !== undefined) {
      this.settings.outlineThickness = thickness;
    }
    this.compositeMaterial.uniforms.outlineEnabled.value = enabled ? 1.0 : 0.0;
    this.compositeMaterial.uniforms.outlineThickness.value =
      this.settings.outlineThickness;
  }

  setOutlineColor(r: number, g: number, b: number): void {
    this.settings.outlineColor = { r, g, b };
    this.compositeMaterial.uniforms.outlineColor.value.set(r, g, b);
  }

  setOutlineSensitivity(depth: number, normal: number): void {
    this.settings.outlineDepthSensitivity = depth;
    this.settings.outlineNormalSensitivity = normal;
    this.compositeMaterial.uniforms.outlineDepthSensitivity.value = depth;
    this.compositeMaterial.uniforms.outlineNormalSensitivity.value = normal;
  }

  getSettings(): typeof this.settings {
    return { ...this.settings };
  }

  dispose(): void {
    this.renderTarget.dispose();
    this.normalTarget.dispose();
    this.outputTarget.dispose();
    this.compositeMaterial.dispose();
    this.normalMaterial.dispose();
    this.fullscreenQuad.geometry.dispose();
    if (this.renderTarget.depthTexture) {
      this.renderTarget.depthTexture.dispose();
    }
    if (this.normalTarget.depthTexture) {
      this.normalTarget.depthTexture.dispose();
    }
  }
}

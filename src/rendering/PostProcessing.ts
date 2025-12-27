import * as THREE from 'three';

export class PostProcessing {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  
  // Render targets for post processing
  private renderTarget: THREE.WebGLRenderTarget;
  private outputTarget: THREE.WebGLRenderTarget;
  
  // Post processing materials
  private compositeMaterial: THREE.ShaderMaterial;
  private fullscreenQuad: THREE.Mesh;
  private postScene: THREE.Scene;
  private postCamera: THREE.OrthographicCamera;
  
  // Settings - kept minimal to maintain brightness
  private settings = {
    scanlines: true,
    scanlineIntensity: 0.02,  // Very subtle
    vignette: true,
    vignetteIntensity: 0.1,   // Minimal vignette
    bloom: true,
    bloomIntensity: 0.15,
    chromaticAberration: true,
    aberrationAmount: 0.0005,
    colorGrading: true,
  };
  
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
    
    // Create render targets
    this.renderTarget = new THREE.WebGLRenderTarget(width, height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
    });
    
    this.outputTarget = new THREE.WebGLRenderTarget(width, height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
    });
    
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
        resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        time: { value: 0 },
        scanlineIntensity: { value: this.settings.scanlineIntensity },
        vignetteIntensity: { value: this.settings.vignetteIntensity },
        bloomIntensity: { value: this.settings.bloomIntensity },
        aberrationAmount: { value: this.settings.aberrationAmount },
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
        uniform vec2 resolution;
        uniform float time;
        uniform float scanlineIntensity;
        uniform float vignetteIntensity;
        uniform float bloomIntensity;
        uniform float aberrationAmount;
        
        varying vec2 vUv;
        
        // Pseudo-random function
        float rand(vec2 co) {
          return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
        }
        
        void main() {
          vec2 uv = vUv;
          
          // Chromatic aberration
          vec2 aberration = (uv - 0.5) * aberrationAmount;
          float r = texture2D(tDiffuse, uv + aberration).r;
          float g = texture2D(tDiffuse, uv).g;
          float b = texture2D(tDiffuse, uv - aberration).b;
          vec3 color = vec3(r, g, b);
          
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
    
    // Render scene to render target
    this.renderer.setRenderTarget(this.renderTarget);
    this.renderer.render(this.scene, this.camera);
    
    // Apply post processing
    this.compositeMaterial.uniforms.tDiffuse.value = this.renderTarget.texture;
    
    // Render to screen
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.postScene, this.postCamera);
  }
  
  resize(width: number, height: number): void {
    this.renderTarget.setSize(width, height);
    this.outputTarget.setSize(width, height);
    this.compositeMaterial.uniforms.resolution.value.set(width, height);
  }
  
  // Settings methods
  setScanlines(enabled: boolean, intensity?: number): void {
    this.settings.scanlines = enabled;
    if (intensity !== undefined) {
      this.settings.scanlineIntensity = intensity;
    }
    this.compositeMaterial.uniforms.scanlineIntensity.value = 
      enabled ? this.settings.scanlineIntensity : 0;
  }
  
  setVignette(enabled: boolean, intensity?: number): void {
    this.settings.vignette = enabled;
    if (intensity !== undefined) {
      this.settings.vignetteIntensity = intensity;
    }
    this.compositeMaterial.uniforms.vignetteIntensity.value = 
      enabled ? this.settings.vignetteIntensity : 0;
  }
  
  setBloom(enabled: boolean, intensity?: number): void {
    this.settings.bloom = enabled;
    if (intensity !== undefined) {
      this.settings.bloomIntensity = intensity;
    }
    this.compositeMaterial.uniforms.bloomIntensity.value = 
      enabled ? this.settings.bloomIntensity : 0;
  }
  
  setChromaticAberration(enabled: boolean, amount?: number): void {
    this.settings.chromaticAberration = enabled;
    if (amount !== undefined) {
      this.settings.aberrationAmount = amount;
    }
    this.compositeMaterial.uniforms.aberrationAmount.value = 
      enabled ? this.settings.aberrationAmount : 0;
  }
  
  getSettings(): typeof this.settings {
    return { ...this.settings };
  }
  
  dispose(): void {
    this.renderTarget.dispose();
    this.outputTarget.dispose();
    this.compositeMaterial.dispose();
    this.fullscreenQuad.geometry.dispose();
  }
}


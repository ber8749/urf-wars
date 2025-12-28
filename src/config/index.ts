// Export all configuration modules
export { MechConfigs, MECH_CONSTANTS } from './MechConfigs';
export { PHYSICS_CONFIG } from './PhysicsConfig';
export { CAMERA_CONFIG } from './CameraConfig';
export { CONTROLS_CONFIG } from './ControlsConfig';
export { HEAT_CONFIG } from './HeatConfig';
export { ANIMATION_CONFIG } from './AnimationConfig';
export { GAME_CONFIG } from './GameConfig';
export { RENDERING_CONFIG } from './RenderingConfig';

// Export projectile visuals
export {
  createAutocannonMaterial,
  createPPCCoreMaterial,
  createPPCSparkleMaterial,
  createPPCGlowMaterial,
  createMissileMaterial,
  createFlameMaterial,
  createLaserBeamMaterial,
  createLaserBeamCoreMaterial,
  createMuzzleFlashMaterial,
  createAutocannonMesh,
  createPPCMesh,
  createMissileMesh,
  PROJECTILE_VISUALS,
} from './ProjectileVisuals';

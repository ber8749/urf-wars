// Export all configuration modules
export { MechConfigs, MECH_CONSTANTS } from './MechConfigs';
export { PHYSICS_CONFIG } from './PhysicsConfig';
export { CAMERA_CONFIG } from './CameraConfig';
export { CONTROLS_CONFIG } from './ControlsConfig';
export { HEAT_CONFIG } from './HeatConfig';
export { ANIMATION_CONFIG } from './AnimationConfig';
export { GAME_CONFIG } from './GameConfig';
export { RENDERING_CONFIG } from './RenderingConfig';

// Export map configurations
export {
  MAP_REGISTRY,
  getMapById,
  getAvailableMapIds,
  DEFAULT_MAP_ID,
  LIGHTING_PRESETS,
  DEBUG_ARENA,
  TRAINING_GROUND,
  COMBAT_ZONE,
} from './maps';
export type {
  MapConfig,
  MapPosition,
  MapTerrain,
  MapEnvironment,
  MapLighting,
  PlayerSpawn,
  TargetSpawn,
  TurretSpawn,
  ObstacleConfig,
} from './maps';

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

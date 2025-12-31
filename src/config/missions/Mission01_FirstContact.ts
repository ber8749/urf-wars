import type { MissionConfig } from './MissionConfig';
import { LIGHTING_PRESETS } from '../maps/MapConfig';

/**
 * Mission 1: First Contact
 * Tutorial mission - destroy 3 stationary targets in the Training Ground.
 * Introduces basic movement and weapon mechanics.
 */
export const MISSION_01_FIRST_CONTACT: MissionConfig = {
  // Map base config
  id: 'mission-01-first-contact',
  name: 'First Contact',
  description: 'Tutorial mission - Basic combat training',

  terrain: {
    type: 'flat',
    size: 600,
    groundColor: 0xc2b280,
    gridColorMajor: 0x8b7355,
    gridColorMinor: 0xa89070,
    showDebugMarkers: false,
  },

  environment: {
    skyColor: 0x87ceeb,
    fogColor: 0x87ceeb,
    fogDensity: 0.001,
    lighting: LIGHTING_PRESETS.DAYLIGHT,
  },

  playerSpawn: {
    position: { x: 0, y: 15, z: 100 },
    facing: 180,
  },

  // Just 3 targets for the tutorial
  targets: [
    {
      position: { x: -30, y: 6, z: 50 },
      faceToward: { x: 0, y: 0, z: 100 },
      health: 100,
    },
    {
      position: { x: 0, y: 6, z: 30 },
      faceToward: { x: 0, y: 0, z: 100 },
      health: 100,
    },
    {
      position: { x: 30, y: 6, z: 50 },
      faceToward: { x: 0, y: 0, z: 100 },
      health: 100,
    },
  ],

  // No turrets in tutorial
  turrets: [],

  // Simple cover for learning
  obstacles: [
    {
      type: 'box',
      position: { x: -50, y: 5, z: 70 },
      size: { x: 8, y: 10, z: 4 },
      color: 0x606060,
    },
    {
      type: 'box',
      position: { x: 50, y: 5, z: 70 },
      size: { x: 8, y: 10, z: 4 },
      color: 0x606060,
    },
  ],

  // Mission metadata
  missionNumber: 1,
  title: 'First Contact',
  briefing: [
    'Welcome to the URF Combat Training Program, pilot.',
    'Your first exercise is simple: destroy the three target drones in the training yard.',
    'Use WASD to move your mech. A and D turn your legs, while the mouse aims your torso.',
    'Press the left mouse button to fire your primary weapon. Destroy all targets to complete the mission.',
    'Good luck, pilot. Show us what you can do.',
  ],

  objectives: [
    {
      id: 'destroy-targets',
      type: 'destroy_all',
      description: 'Destroy all target drones',
      required: true,
      showProgress: true,
    },
  ],

  victoryCondition: 'destroy_all',
  defeatCondition: 'player_destroyed',

  // No time limit for tutorial
  showTimer: false,

  recommendedMechs: ['ATLAS', 'URBANMECH'],
};

# URF Wars - Mech Combat Game

A 3D mech combat game built with Three.js, inspired by classic titles like MechWarrior 2 and Earth Siege. Features procedural terrain generation, physics-based mech movement, and a modern retro aesthetic.

## Features

- **Procedural Terrain**: Infinite chunked terrain with multiple biomes (Desert, Tundra, Volcanic, Forest, Badlands)
- **Mech Simulation**:
  - Armor zones (head, torso, arms, legs)
  - Heat management system
  - Multiple weapon hardpoints (lasers, PPC, missiles)
- **Camera System**: Toggle between first-person cockpit and third-person chase views
- **Retro Aesthetic**: Flat-shaded low-poly graphics with CRT-style post-processing
- **Physics**: Rapier3D physics engine for realistic movement
- **Multiplayer-Ready**: Network layer stubs for future implementation

## Controls

| Key                | Action                                  |
| ------------------ | --------------------------------------- |
| W/S                | Move forward/backward                   |
| A/D                | Turn left/right                         |
| Arrow Keys         | Rotate torso (←/→) and pitch head (↑/↓) |
| Mouse              | Aim torso/head                          |
| Left Click / Space | Fire selected weapon                    |
| 1-4                | Select weapon group                     |
| V                  | Toggle camera view (first/third person) |
| Tab                | Toggle HUD visibility                   |

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Tech Stack

- **Three.js** - 3D rendering
- **Rapier3D** - Physics engine (WASM)
- **TypeScript** - Type-safe code
- **Vite** - Build tool with HMR

## Project Structure

```
src/
├── core/           # Game loop, ECS (Entity, Component, System, World), EventBus, input
├── components/     # ECS data components (Transform, Physics, Mech, Weapon, Heat, etc.)
├── systems/        # ECS logic systems (Movement, Physics, Weapon, Render, Camera, etc.)
├── archetypes/     # Entity factory functions (createMech, createProjectile)
├── config/         # Game configuration (MechConfigs, WeaponConfigs)
├── rendering/      # Visual components (MechModel, HUD, PostProcessing, shaders)
├── world/          # Terrain generation, biomes, skybox, day/night cycle
├── audio/          # Sound manager and procedural synths
├── physics/        # Rapier3D wrapper
└── network/        # Multiplayer stubs (future)
```

## Architecture

The game uses an Entity-Component-System (ECS) architecture with deterministic state updates, designed for future multiplayer support:

- Fixed timestep physics (60Hz)
- Input snapshots for client-side prediction
- State interpolation for smooth rendering
- Serializable entity state for networking

## Acknowledgments

Inspired by:

- MechWarrior 2 (1995)
- Earth Siege (1994)
- The retro 3D aesthetic of 90s mech games

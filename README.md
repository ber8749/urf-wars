# URF Wars - MechWarrior Clone

A browser-based MechWarrior clone built with TypeScript and Three.js.

## Features

- **Mech Combat**: Control a giant mech with independent leg and torso movement
- **Weapons System**: Medium Laser (hitscan) and AC/10 Autocannon (projectile)
- **Damage Model**: Component-based damage system (head, torso, arms, legs)
- **Dual Camera Modes**: First-person cockpit view and third-person chase camera
- **Target Practice**: Destructible target dummies with health bars
- **HUD**: Damage status display, speed indicator, weapon cooldowns

## Controls

| Key | Action |
|-----|--------|
| W/A/S/D | Move mech |
| Q/E | Turn legs |
| Mouse | Aim torso |
| Left Click | Fire Laser |
| Right Click | Fire Autocannon |
| Tab | Switch camera view |

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

Then open http://localhost:5173 in your browser.

## Technical Details

- **Engine**: Three.js for 3D rendering
- **Build**: Vite + TypeScript
- **Physics**: Custom lightweight physics (no external engine)
- **Architecture**: Component-based game systems

## Project Structure

```
src/
├── core/           # Game loop, input management
├── mech/           # Mech class, movement, components
├── weapons/        # Weapon base class, laser, autocannon
├── combat/         # Damage system, hit detection
├── camera/         # First/third person camera controller
├── world/          # Arena, target dummies
├── hud/            # HUD overlay
└── types/          # TypeScript type definitions
```

## Visual Style

Minimalist abstract aesthetic with:
- Clean geometric shapes
- Blue player mech, red enemies
- Flat colors with sharp shadows
- Grid-textured ground
- Gradient sky

## License

MIT

# Sector-7: Tactical FPS

A high-performance tactical first-person shooter built on Three.js 0.187.0 with pure ES modules, deterministic rendering, and no external dependencies or binary assets.

## Setting & Narrative

Operatives of **AeroSec Tactical Defense** hold the fortified **Sector-7 Relay Complex**, a brutalist industrial facility housing quantum communications arrays. **Helix Syndicate** breach units have infiltrated the perimeter attempting to deploy a Quantum Beacon at Site Alpha or Site Bravo. AeroSec must neutralize all hostile breach forces or disarm planted beacons before detonation.

## Key Features

1. **Tactical Gunplay & Ballistics**
   - Headshot body-part precision multiplier (3.5x damage on head hits, 1.0x torso, 0.75x limbs).
   - Recoil curves: continuous firing kicks weapon upward with lateral sway.
   - Dynamic bloom & spread: moving significantly penalizes accuracy (up to 3.8x spread); stopping and crouching delivers laser precision.
   - Distinct arsenal:
     - **Viper-9 Tactical Sidearm**: Lightweight semi-auto sidearm with rapid recovery ($0).
     - **Phalanx-4 Kinetic Carbine**: Versatile standard-issue assault rifle ($2,900).
     - **Specter-9 Pulse SMG**: High-rate-of-fire close-quarters weapon ($1,600).
     - **Longbow-X Rail Sniper**: Heavy bolt-action marksman rifle capable of 1-hit elimination ($4,600).
     - **Aerosol Smoke Utility**: Deployable volumetric concealment canister ($300).
     - **Kevlar Shield**: Ballistic body armor and helmet absorbing up to 60% of incoming damage ($650).

2. **Tactical Bot AI**
   - Sensory perception: Raycast line-of-sight vision cones (110° FOV) obstructed by map geometry and smoke clouds.
   - Auditory detection: Bots react to footstep sprints and gunfire audio within range.
   - Tactical state machine: Waypoint route patrol, angle holding at chokepoints, coordinated crossfires, deliberate human-like aim tracking with dispersion error.
   - Objective play: Bots carry, calibrate, and defend the Quantum Beacon, or push to defuse.

3. **Level Design & Architecture**
   - **Sector-7 Relay Complex**: A classic three-lane competitive map:
     - **Lane Alpha**: Long-range exterior courtyard with elevated sniper catwalk and container cover.
     - **Mid Corridor**: High-stakes central bunker corridor with double blast doors and stacked crates.
     - **Lane Bravo**: Subterranean generator hall with turbine pillars and conduit arches.
     - **Site Alpha & Site Bravo**: Dedicated beacon calibration hubs with holographic emitter pads.
   - Procedural canvas textures: Concrete slabs, diamond-tread metal grates, hazard caution striping, and military stencil crates.

4. **Audio & Effects**
   - Procedural WebAudio synthesis: Synthesized gunshots, Foley reload sounds, footstep thuds, hit pings, headshot chimes, beacon countdown pulses, and detonation rumbles.
   - Visual FX: High-velocity glowing bullet tracers, dynamic muzzle flash illumination, impact wall sparks, and bloodless digital shield dispersal bursts.

5. **Competitive Match Flow & Economy**
   - Tactical freeze buy phase, round timer, living unit counters, and round victory/defeat banners.
   - Economy rewards: Win bonuses ($3,250), loss payouts ($1,400), kill bounties ($300), and objective bonuses.
   - In-game Requisition Shop (`B` key) with live credit balance and equipment specs.

## Controls

| Key / Action | Action |
| --- | --- |
| `W`, `A`, `S`, `D` | Tactical Movement |
| `Mouse` | Look / Precision Aim |
| `Left Click` | Discharge Weapon |
| `R` | Tactical Reload |
| `Ctrl` / `C` | Crouch (enhances stability & accuracy) |
| `Space` | Jump |
| `B` | Requisitions Shop (Buy Menu) |
| `E` | Calibrate / Disarm Quantum Beacon |
| `1`, `2`, `3`, `4` | Select Equipped Weapon |
| `ESC` | Exit Pointer Lock / Close Menus |

## Technical Architecture

- **Engine**: Three.js 0.187.0 loaded via browser import map.
- **Modules**: Pure ES modules separated into dedicated single-responsibility components (`world.js`, `player.js`, `weapon.js`, `bots.js`, `rounds.js`, `hud.js`, `input.js`, `effects.js`, `audio.js`, `textures.js`, `palette.js`, `main.js`).
- **Loop**: Decoupled fixed 60Hz physics and tactical simulation loop feeding smooth render frame updates.
- **Deterministic Captures**: Supports `?shot=<start|fight|plant|end>&seed=<n>` generating byte-identical visual verification renders.

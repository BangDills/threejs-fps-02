# Sector-7: Tactical FPS

A high-performance tactical first-person shooter built on Three.js 0.187.0 with pure ES modules, fixed-step simulation, deterministic rendering, and zero binary assets.

## Setting & Narrative

Operatives of **AeroSec Tactical Defense** hold the fortified **Sector-7 Relay Complex**, an industrial facility housing high-security quantum communications arrays. **Helix Syndicate** breach corps units have infiltrated the perimeter attempting to deploy a Quantum Beacon at Site Alpha (Reactor Core) or Site Bravo (Data Archive). AeroSec must neutralize all hostile breach forces or disarm planted beacons before detonation.

## Key Features

1. **Tactical Ballistics & Hitscan Gunplay**
   - True hitscan raycasting for player and bot agents: rays cast from weapon muzzle through camera/aim direction, checking world colliders and actor hitboxes.
   - Per-part hitboxes (Head, Torso, Limbs) with dynamic damage multipliers (Head 3.5x, Torso 1.0x, Limbs 0.75x) and distance falloff.
   - Armor system: Kevlar vest & helmet absorb 65% of incoming torso and limb damage.
   - Recoil curves & dynamic bloom: continuous automatic fire kicks weapon vertically with horizontal sway; movement expands spread; crouching tightens spread by 45%.
   - Aim Down Sights (ADS) via Right Mouse Button: smooth field-of-view zoom, reduced weapon sway, and stabilized cone of fire.
   - Distinct 5-weapon procedural arsenal:
     - **Viper-9 Tactical Sidearm**: Lightweight semi-auto sidearm with rapid recovery ($0).
     - **Specter-9 Pulse SMG**: High-rate-of-fire (920 RPM) close-quarters submachine gun ($1,600).
     - **Breaker-12 Tactical Shotgun**: 8 pellets per shell (128 max close-range damage), pump-action cadence ($1,800).
     - **Phalanx-4 Assault Carbine**: Versatile standard-issue assault rifle with high lethality ($2,900).
     - **Longbow-X Rail Sniper**: Heavy marksman rifle with high-power optical scope ($4,600).
   - Tactical Throwables:
     - **HE Frag Grenade** (`4` key): Bouncing physical grenade with line-of-sight checked blast radius dealing up to 90 splash damage ($300).
     - **Tactical Aerosol Smoke** (`5` key): Deployable volumetric concealment cloud blocking vision and bot line-of-sight for 15s ($300).

2. **5v5 Team Rosters & Autonomous Bot AI**
   - Full 10-actor matches (5 AeroSec vs 5 Helix Syndicate) with assigned tactical roles (Entry, Support, Anchor).
   - Raycast hitscan ballistics for bots: zero coin-flip accuracy checks (`Math.random() < 0.45` completely eliminated). Bots calculate aim tracking error that smoothly tightens over tracking time, applies weapon spread and recoil, traces rays against world/player hitboxes, and deals body-part scaled damage.
   - Autonomous economy: bots purchase appropriate weapons, armor, and grenades based on team bank and round phase.
   - Objective mechanics: Syndicate bots carry the Quantum Beacon, drop it on elimination as an interactable world entity, pick it up, plant at sites Alpha/Bravo, and AeroSec bots actively navigate to and defuse planted beacons.
   - Tactical awareness: auditory reaction to sprints and gunfire, low-HP retreat to cover, angle-holding off the waypoint graph, and line-of-sight occlusion through smoke clouds.

3. **Zero-Allocation Effect Pooling & Visuals**
   - High-performance pre-allocated object pools in `effects.js`: 32 bullet tracers, 72 impact sparks, 48 digital hit flashes, 24 concrete dust particles, 4 smoke clouds, explosion blast wave, and beacon hologram.
   - Zero runtime `THREE.Object3D`, `BufferGeometry`, or `Material` allocations during combat hot loops.
   - Calibrated daylight-industrial aesthetic: high ambient fill, bright concrete slabs, clear hazard trims, and high-contrast signage for instant scene readability (mean luma 60-100 across all capture modes).
   - Real-time 2D radar minimap in HUD showing level architecture, bomb sites, player orientation cone, teammate markers, and enemy radar pings.

4. **Level Design & Architecture**
   - **Sector-7 Relay Complex**: A classic three-lane competitive map:
     - **Lane Alpha**: Exterior courtyard with elevated catwalk platform, container cover, and Site Alpha (Reactor Core).
     - **Mid Corridor**: High-stakes central bunker corridor with blast doors, signage, and staggered crate stacks.
     - **Lane Bravo**: Subterranean hall with reactor pillar, hazard markings, and Site Bravo (Data Archive).
     - **Two Connectors**: West and East connectors linking lanes with arched bulkheads and facility signs.
   - Procedural canvas textures: Concrete slabs, diamond-tread metal grates, hazard caution striping, military supply crates, and facility signage.

5. **Competitive Match Flow & Economy**
   - 13-round match format with buy phase timer, round clock, and win/loss banners.
   - Economy rewards: Win bonuses ($3,250), loss payouts ($1,400 with escalating loss-streak bonuses up to $2,900), kill rewards ($300), and objective plant/defuse bonuses.
   - Categorized Requisition Terminal (`B` key): Sidearms, Primary Armament, and Tactical Gear.
   - Full 10-player match-end and tab scoreboard with K/D/A, credits, armor status, and ping.
   - Directional damage indicators, dynamic reticle bloom, and tactical killfeed.

## Controls

| Key / Action | Action |
| --- | --- |
| `W`, `A`, `S`, `D` | Tactical Movement |
| `Mouse` | Look / Precision Aim |
| `Left Click` | Discharge Weapon |
| `Right Click` | Aim Down Sights (ADS Zoom) |
| `R` | Tactical Reload |
| `Shift` / `Ctrl` / `C` | Tactical Crouch (stabilizes recoil & spread) |
| `Space` | Vault / Jump |
| `B` | Requisitions Terminal (Buy Menu) |
| `Tab` | Match Scoreboard Telemetry |
| `E` | Plant / Defuse Quantum Beacon |
| `1` | Equip Primary Weapon |
| `2` | Equip Sidearm |
| `4` | Deploy HE Frag Grenade |
| `5` | Deploy Tactical Aerosol Smoke |
| `ESC` | Exit Pointer Lock / Close Menus |

## Technical Architecture

- **Engine**: Three.js 0.187.0 loaded via browser import map.
- **Modules**: Pure ES modules separated into dedicated single-responsibility components (`world.js`, `player.js`, `weapon.js`, `bots.js`, `rounds.js`, `hud.js`, `input.js`, `effects.js`, `audio.js`, `textures.js`, `palette.js`, `main.js`).
- **Loop**: Decoupled fixed 60Hz physics and tactical simulation loop feeding smooth render frame updates.
- **Deterministic Captures**: Supports `?shot=<start|fight|plant|end>&seed=<n>` generating byte-identical visual verification renders.

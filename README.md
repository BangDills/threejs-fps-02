# Sector-7: Tactical FPS

A high-performance tactical first-person shooter built on Three.js 0.187.0 with pure ES modules, fixed-step simulation, deterministic rendering, and zero binary assets.

## Setting & Narrative

Operatives of **AeroSec Tactical Defense** hold the fortified **Sector-7 Relay Complex**, an industrial facility housing high-security quantum communications arrays. **Helix Syndicate** breach corps units have infiltrated the perimeter attempting to deploy a Quantum Beacon at Site Alpha (Reactor Core) or Site Bravo (Data Archive). AeroSec must neutralize all hostile breach forces or disarm planted beacons before detonation.

## Key Features

1. **Tactical Gunplay & Ballistics**
   - Headshot body-part precision multiplier (3.5x damage on head hits, 1.0x torso, 0.75x limbs with distance damage falloff).
   - Recoil curves: continuous firing kicks weapon upward with lateral sway; standing still recovers recoil rapidly.
   - Dynamic bloom & spread: moving significantly penalizes accuracy (up to 3.8x spread on rifles, 8.0x on rail sniper); crouching tightens spread by 45%.
   - Aim Down Sights (ADS) via Right Mouse Button: smooth FOV zoom, reduced weapon sway, and tighter spread.
   - Distinct 5-weapon arsenal with procedural 3D viewmodels:
     - **Viper-9 Tactical Sidearm**: Lightweight semi-auto sidearm with rapid recovery ($0).
     - **Specter-9 Pulse SMG**: High-rate-of-fire (920 RPM) close-quarters submachine gun ($1,600).
     - **Breaker-12 Tactical Shotgun**: 8 pellets per shell (128 max damage close range), pump-action rhythm ($1,800).
     - **Phalanx-4 Assault Carbine**: Versatile standard-issue assault rifle with high lethality ($2,900).
     - **Longbow-X Rail Sniper**: Heavy marksman rifle with high-power optical scope ($4,600).
   - Throwables & Protection:
     - **HE Frag Grenade** (`4` key): High-explosive bounce grenade dealing up to 90 splash damage ($300).
     - **Tactical Aerosol Smoke** (`5` key): Deployable volumetric concealment cloud blocking vision for 15s ($300).
     - **Kevlar Shield & Helmet**: Absorbs up to 65% of incoming torso and limb damage ($650).

2. **Tactical Bot AI**
   - Fixed-step performance budget with zero per-step heap allocation.
   - Assigned tactical roles each round:
     - **Entry**: Aggressive pusher leading site takes and checking angles.
     - **Support**: Follows entry, covers flanks, provides crossfire.
     - **Anchor**: Locks down sites and chokepoints, holding tight crouched angles.
   - Auditory sensing: Bots react to footstep sprints and gunfire within a dynamic sound radius.
   - Smoke & tactical reaction: Bots cannot see through active smoke clouds and avoid blind fire.
   - Low HP retreat: When health drops below 35, bots fall back to cover waypoints.
   - Human-like aim tracking: Error starts large and shrinks smoothly over tracking time.

3. **Level Design & Architecture**
   - **Sector-7 Relay Complex**: A classic three-lane competitive map:
     - **Lane Alpha**: Exterior courtyard with elevated catwalk platform, container cover, and Site Alpha (Reactor Core).
     - **Mid Corridor**: High-stakes central bunker corridor with blast doors, signage, and staggered crate stacks.
     - **Lane Bravo**: Subterranean hall with reactor pillar, hazard markings, and Site Bravo (Data Archive).
     - **Two Connectors**: West and East connectors linking lanes with arched bulkheads and facility signs.
   - Procedural canvas textures: Concrete slabs, diamond-tread metal grates, hazard caution striping, military supply crates, and facility signage.
   - Lighting: Directional sunlight with soft shadows, emerald beacon glow at Alpha, cyan data-hub glow at Bravo, and warm amber illumination in Mid.

4. **Procedural WebAudio Synthesizer**
   - Zero binary audio assets: 100% procedural WebAudio synthesis.
   - Gunshot acoustics for all 5 weapons (pistol, SMG, rifle, shotgun blast+pump, and rail sniper).
   - Dry fire click, reload sequence Foley, grenade bounce thuds, explosion rumbles, smoke canister hiss, concrete footsteps, hit tick & headshot metallic dink, beacon pulses, and victory/defeat stingers.

5. **Competitive Match Flow & Economy**
   - 13-round match format with buy phase timer, round clock, and win/loss banners.
   - Economy rewards: Win bonuses ($3,250), loss payouts ($1,400 with loss-streak bonus), kill rewards ($300), and objective plant/defuse rewards.
   - Categorized Requisition Terminal (`B` key): Sidearms, Primary Armament, and Tactical Gear.
   - Telemetry Scoreboard (`Tab` key): Complete match statistics for AeroSec and Helix Syndicate.
   - Directional damage feedback, dynamic reticle spread bloom, and killfeed.

## Controls

| Key / Action | Action |
| --- | --- |
| `W`, `A`, `S`, `D` | Tactical Movement |
| `Mouse` | Look / Precision Aim |
| `Left Click` | Discharge Weapon |
| `Right Click` | Aim Down Sights (ADS Zoom) |
| `R` | Tactical Reload |
| `Ctrl` / `C` | Crouch (enhances stability & accuracy) |
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

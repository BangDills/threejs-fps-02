// Boot, fixed 60Hz loop, tactical hitscan, recoil/spread, grenades, ADS, and deterministic capture modes.
import * as THREE from 'three';
import { PALETTE } from './palette.js';
import { createWorld } from './world.js';
import { createPlayer } from './player.js';
import { createWeaponSystem } from './weapon.js';
import { createBotManager } from './bots.js';
import { createRoundManager } from './rounds.js';
import { createEffectSystem } from './effects.js';
import { createHud } from './hud.js';
import { createInput } from './input.js';
import { soundEngine } from './audio.js';

const FIXED_STEP = 1 / 60;
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seed = Number.parseInt(params.get('seed') ?? '1', 10) || 1;

// Deterministic PRNG
function mulberry32(initial) {
  let a = initial;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const prng = mulberry32(seed);

// WebGL Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('game').appendChild(renderer.domElement);

// Scene & Camera
const scene = new THREE.Scene();
scene.background = new THREE.Color(PALETTE.canvas);
scene.fog = new THREE.Fog(new THREE.Color(PALETTE.canvas), 24, 75);

const camera = new THREE.PerspectiveCamera(74, window.innerWidth / window.innerHeight, 0.05, 160);
scene.add(camera);

// Subsystems
const world = createWorld(scene);
const effects = createEffectSystem(scene);
const hud = createHud();
const player = createPlayer(world.colliders);
const weapon = createWeaponSystem(camera);
const bots = createBotManager(scene, world, effects);
const rounds = createRoundManager(world, hud, weapon, player);

let frozen = false;
let gameStarted = false;
let accumulator = 0;
let lastTime = performance.now();

const raycaster = new THREE.Raycaster();
raycaster.far = 120;
const hitDirection = new THREE.Vector3();
const farPoint = new THREE.Vector3();

// Input setup
const input = createInput(renderer.domElement, onLockChange);

function onLockChange(locked) {
  if (shot) return;
  if (locked) {
    gameStarted = true;
    hud.hideBuyMenu();
  }
}

hud.onPlay(() => {
  if (shot) return;
  input.requestLock();
  rounds.startNewRound();
  bots.resetBots();
});

hud.onBuy((itemId, cost) => {
  rounds.buyItem(itemId, cost);
});

function syncCamera() {
  const p = player.state.position;
  camera.position.set(p.x, p.y + player.state.eye, p.z);
  camera.rotation.set(
    player.state.pitch + player.state.recoilPitch,
    player.state.yaw + player.state.recoilYaw,
    0,
    'YXZ'
  );
}

function shoot() {
  if (!weapon.pullTrigger()) return;

  const cfg = weapon.state.config;
  const playerSpeed = player.groundSpeed();
  const spread = weapon.getSpread(playerSpeed, player.state.crouching);

  // Recoil kick applied to player camera
  player.recoil(cfg.recoilPitch, (prng() * 2 - 1) * cfg.recoilYaw);

  const muzzlePos = weapon.getMuzzleWorldPos();
  effects.spawnMuzzleFlash(muzzlePos);

  // Sound event reporting for bot acoustic detection
  bots.reportSound(camera.position, cfg.id === 'longbow' ? 50 : 36, 'aero');

  scene.updateMatrixWorld(true);

  // Pellets loop: 1 for standard weapons, 8 for shotgun
  const pelletCount = cfg.pellets || 1;
  const allTargets = world.shootables.concat(bots.hitMeshes);

  for (let i = 0; i < pelletCount; i++) {
    camera.getWorldDirection(hitDirection);
    hitDirection.x += (prng() * 2 - 1) * spread;
    hitDirection.y += (prng() * 2 - 1) * spread;
    hitDirection.z += (prng() * 2 - 1) * spread;
    hitDirection.normalize();

    raycaster.set(camera.position, hitDirection);
    const hits = raycaster.intersectObjects(allTargets, false);

    if (hits.length > 0) {
      const hit = hits[0];
      effects.spawnTracer(muzzlePos, hit.point, false);

      if (hit.object.userData && hit.object.userData.bot) {
        const targetBot = hit.object.userData.bot;
        const part = hit.object.userData.part;
        const isHead = (part === 'head');
        const isLegs = (part === 'legs');
        const dist = camera.position.distanceTo(hit.point);

        const dmg = weapon.calculateHitDamage(dist, isHead, isLegs);
        const killed = bots.damageBot(targetBot, dmg, hit.point, isHead, isLegs);

        hud.triggerHitmarker(isHead, shot ? 2000 : 120);
        soundEngine.playHit(isHead);

        if (killed) {
          rounds.addKillReward();
          hud.addKillCard('Operative', cfg.name, targetBot.name, isHead, false);
        }
      } else {
        effects.spawnWallSparks(hit.point, hit.face ? hit.face.normal : null);
      }
    } else {
      farPoint.copy(camera.position).addScaledVector(hitDirection, 65);
      effects.spawnTracer(muzzlePos, farPoint, false);
    }
  }

  hud.updateAmmo(weapon.state.mag, weapon.state.reserve, cfg.name, cfg.category, weapon.state.heGrenades, weapon.state.smokeGrenades);
}

function handleGrenadeDetonation(type, pos) {
  if (type === 'he') {
    // Deal splash damage to nearby bots
    for (const b of bots.bots) {
      if (b.dead) continue;
      const d = b.mesh.position.distanceTo(pos);
      if (d < 7.5) {
        const dmg = Math.floor(THREE.MathUtils.lerp(90, 15, d / 7.5));
        const killed = bots.damageBot(b, dmg, pos, false, false);
        if (killed) {
          rounds.addKillReward();
          hud.addKillCard('Operative', 'HE Frag', b.name, false, false);
        }
      }
    }

    // Check player splash damage
    const dPlayer = player.state.position.distanceTo(pos);
    if (dPlayer < 7.5) {
      const pDmg = Math.floor(THREE.MathUtils.lerp(80, 10, dPlayer / 7.5));
      player.damage(pDmg, pos, false);
      player.recoil(0.08, 0.04);
      hud.triggerDamageFlash();
    }
  }
}

function step(dt) {
  const wantAds = input.state.aiming;
  player.step(dt, input.state.keys, wantAds, effects);
  player.stepGrenades(dt, effects, handleGrenadeDetonation);

  weapon.update(dt, input.takeLook(), player.groundSpeed(), player.groundSpeed() > 0.8, wantAds);

  // Sniper optical scope overlay
  if (weapon.state.currentWeaponId === 'longbow' && weapon.state.ads > 0.6) {
    hud.setScopeVisible(true);
  } else {
    hud.setScopeVisible(false);
  }

  bots.step(dt, player, (killer, gun, isHead) => {
    hud.addKillCard(killer, gun, 'Operative', isHead, true);
    hud.triggerDamageFlash();
  }, (b) => {
    // Bot fired
  });

  rounds.step(dt, bots, input.state.keys, effects);
  effects.step(dt);

  hud.updateCrosshair(weapon.getSpread(player.groundSpeed(), player.state.crouching));
  hud.updateHealth(player.state.hp);
  hud.updateShield(player.state.shield);
  hud.setScoreboardVisible(input.state.scoreboard);
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;

  if (!frozen) {
    const look = input.takeLook();
    player.look(look.x, look.y);

    if (input.state.firing && weapon.canFire()) {
      shoot();
    }

    // Keyboard Hotkeys
    if (input.state.keys.has('KeyR')) weapon.reload();
    if (input.state.keys.has('KeyB')) {
      if (!rounds.state.buyMenuOpen) rounds.openBuyMenu();
    }

    // Weapon selection
    if (input.state.keys.has('Digit1')) {
      // Primary weapon
      for (const p of ['phalanx', 'specter', 'breaker', 'longbow']) {
        if (rounds.state.ownedWeapons.has(p)) {
          weapon.selectWeapon(p);
          break;
        }
      }
    }
    if (input.state.keys.has('Digit2') && rounds.state.ownedWeapons.has('viper')) {
      weapon.selectWeapon('viper');
    }

    // Grenade throw hotkeys
    if (input.state.keys.has('Digit4') && weapon.state.heGrenades > 0) {
      input.state.keys.delete('Digit4');
      weapon.state.heGrenades -= 1;
      player.throwGrenade('he', camera);
      hud.updateAmmo(weapon.state.mag, weapon.state.reserve, weapon.state.config.name, weapon.state.config.category, weapon.state.heGrenades, weapon.state.smokeGrenades);
    }
    if (input.state.keys.has('Digit5') && weapon.state.smokeGrenades > 0) {
      input.state.keys.delete('Digit5');
      weapon.state.smokeGrenades -= 1;
      player.throwGrenade('smoke', camera);
      hud.updateAmmo(weapon.state.mag, weapon.state.reserve, weapon.state.config.name, weapon.state.config.category, weapon.state.heGrenades, weapon.state.smokeGrenades);
    }

    accumulator += dt;
    let steps = 0;
    while (accumulator >= FIXED_STEP && steps < 5) {
      step(FIXED_STEP);
      accumulator -= FIXED_STEP;
      steps += 1;
    }
    if (accumulator > FIXED_STEP * 5) accumulator = 0;
    syncCamera();
  }

  renderer.render(scene, camera);
}

function settle(steps) {
  for (let i = 0; i < steps; i++) {
    step(FIXED_STEP);
  }
}

function paintTwiceThenReady() {
  let painted = 0;
  function paint() {
    requestAnimationFrame(paint);
    syncCamera();
    renderer.render(scene, camera);
    painted += 1;
    if (painted === 2) {
      window.__shotReady = true;
      frozen = true;
    }
  }
  requestAnimationFrame(paint);
}

// Deterministic Screenshot Scenarios
function runShotScenario(name) {
  bots.resetBots();
  rounds.closeBuyMenu();
  hud.hideEndScreen();
  hud.setScoreboardVisible(false);
  document.getElementById('overlay-start').hidden = true;

  if (name === 'start') {
    // 1-buy: Freeze time, buy menu open showing prices and player's money
    player.respawn(new THREE.Vector3(0, 0, -26));
    player.state.yaw = Math.PI; // Face base interior with crates and signage
    player.state.pitch = 0.05;
    rounds.state.credits = 800;
    rounds.state.phase = 'START_FREEZE';
    rounds.openBuyMenu();
    hud.updateClock('00:05', 'TACTICAL FREEZE', 'ROUND 1 / 13');
    hud.updateCash(800);
    settle(12);
  } else if (name === 'fight') {
    // 2-fight: Mid-round: enemies visible in Lane Alpha, active tracers in flight, full HUD
    player.respawn(new THREE.Vector3(-24, 0, -12));
    player.state.yaw = 0; // Face down Lane Alpha toward Site A
    player.state.pitch = -0.04;
    weapon.selectWeapon('phalanx');

    // Position enemy bots in sightline
    const b1 = bots.bots.find((b) => b.id === 'helix_1');
    if (b1) {
      b1.mesh.position.set(-24, 0, 8);
      b1.yaw = Math.PI;
      b1.mesh.rotation.y = Math.PI;
      b1.state = 'ENGAGE';
    }
    const b2 = bots.bots.find((b) => b.id === 'helix_2');
    if (b2) {
      b2.mesh.position.set(-20, 0, 14);
      b2.yaw = Math.PI;
      b2.mesh.rotation.y = Math.PI;
      b2.state = 'ENGAGE';
    }

    settle(25);

    // Active tracers in mid-air
    const muzzlePos = weapon.getMuzzleWorldPos();
    const enemyTarget = new THREE.Vector3(-24, 1.4, 8);
    effects.spawnTracer(muzzlePos, enemyTarget, false);
    effects.spawnMuzzleFlash(muzzlePos);

    // Enemy return tracer
    const enemyMuzzle = new THREE.Vector3(-24, 1.1, 7.6);
    const playerTarget = new THREE.Vector3(-24, 1.6, -11);
    effects.spawnTracer(enemyMuzzle, playerTarget, true);

    hud.triggerHitmarker(true, 4000); // Amber headshot indicator
    hud.triggerDamageFlash();
    hud.addKillCard('Operative Cruz', 'Phalanx-4', 'Helix Infiltrator', true, false);
    hud.updateAmmo(24, 90, 'PHALANX-4 CARBINE', 'RIFLE // FULL AUTO', 1, 1);
    hud.updateHealth(85);
    hud.updateShield(60);
    hud.updateClock('01:24', 'TACTICAL ASSAULT', 'ROUND 3 / 13');
    rounds.state.credits = 3700;
    hud.updateCash(3700);
  } else if (name === 'plant') {
    // 3-plant: Charge planted at site, defuse progress, bot approaching
    player.respawn(new THREE.Vector3(-24, 0, 1.5));
    player.state.yaw = 0; // Face Site Alpha beacon pad
    player.state.pitch = -0.15;

    // Activate holographic beacon at Site Alpha
    effects.activateBeacon(world.sites.alpha.position);
    effects.spawnSmokeGrenade(new THREE.Vector3(-18, 0, 10)); // Atmospheric smoke cloud
    rounds.state.phase = 'BEACON_PLANTED';
    rounds.state.plantedSite = 'A';
    rounds.state.plantedTime = 28.5;

    // Approaching Helix bot covering the site
    const b1 = bots.bots.find((b) => b.id === 'helix_1');
    if (b1) {
      b1.mesh.position.set(-20, 0, 15);
      b1.yaw = Math.PI;
      b1.mesh.rotation.y = Math.PI;
    }

    hud.showActionPrompt('HOLD [E] TO DISARM BEACON');
    hud.updateActionProgress(0.68); // 68% defuse progress
    hud.updateClock('00:28', 'BEACON ACTIVE AT SITE ALPHA', 'ROUND 4 / 13');
    settle(20);
  } else if (name === 'end') {
    // 4-end: Round decided: win banner, scoreboard overlay, money earned
    player.respawn(new THREE.Vector3(-24, 0, -8));
    player.state.yaw = 0.2;
    player.state.pitch = 0.05;

    rounds.state.scoreAero = 1;
    rounds.state.scoreHelix = 0;
    rounds.state.credits = 4050;
    rounds.state.playerStats.kills = 3;
    rounds.state.playerStats.deaths = 0;
    rounds.state.rosterStats.aero_1.kills = 2;
    rounds.state.rosterStats.helix_1.kills = 1;
    rounds.state.rosterStats.helix_1.deaths = 1;

    hud.updateScores(1, 0);
    hud.updateCash(4050);

    const outcome = {
      title: 'ROUND SECURED',
      won: true,
      reason: 'BEACON DEFUSED & SECTOR SECURED',
      reward: 3250,
    };
    rounds.syncScoreboard(bots);
    hud.showEndScreen(outcome, 1, 0);
    hud.setScoreboardVisible(true); // Show telemetry scoreboard
    settle(15);
  }

  paintTwiceThenReady();
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

syncCamera();

if (shot) {
  runShotScenario(shot);
} else {
  requestAnimationFrame(frame);
}

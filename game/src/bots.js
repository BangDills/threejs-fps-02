// Tactical Bot AI: roles (entry, support, anchor), routes, acoustic sound sensing, smoke reaction, shrinking aim error, and body-part hitscan.
import * as THREE from 'three';
import { PALETTE } from './palette.js';
import { soundEngine } from './audio.js';

export function createBotManager(scene, world, effects) {
  const bots = [];
  const hitMeshes = [];
  const raycaster = new THREE.Raycaster();
  const soundEvents = [];

  // Shared reusable vectors to avoid per-step heap allocation
  const vFrom = new THREE.Vector3();
  const vTo = new THREE.Vector3();
  const vDir = new THREE.Vector3();
  const vEye = new THREE.Vector3();
  const vEnemyEye = new THREE.Vector3();
  const vMuzzle = new THREE.Vector3();
  const vSpread = new THREE.Vector3();

  // Shared materials for bot factions
  const matAeroHead = new THREE.MeshStandardMaterial({ color: PALETTE.aeroSec, roughness: 0.3, metalness: 0.6 });
  const matAeroBody = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.6, metalness: 0.3 });
  const matHelixHead = new THREE.MeshStandardMaterial({ color: PALETTE.helix, roughness: 0.3, metalness: 0.6 });
  const matHelixBody = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.6, metalness: 0.3 });
  const matGun = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.4, metalness: 0.8 });

  function spawnBot(id, name, team, role, initialWaypointId, weaponType = 'rifle') {
    const group = new THREE.Group();

    // 1. Head (Sphere, headshot target)
    const headGeo = new THREE.SphereGeometry(0.24, 12, 12);
    const headMesh = new THREE.Mesh(headGeo, team === 'aero' ? matAeroHead : matHelixHead);
    headMesh.position.y = 1.62;
    headMesh.castShadow = true;
    group.add(headMesh);

    // 2. Torso (Upper body box)
    const torsoGeo = new THREE.BoxGeometry(0.52, 0.72, 0.3);
    const torsoMesh = new THREE.Mesh(torsoGeo, team === 'aero' ? matAeroBody : matHelixBody);
    torsoMesh.position.y = 1.08;
    torsoMesh.castShadow = true;
    group.add(torsoMesh);

    // 3. Legs (Lower body box)
    const legsGeo = new THREE.BoxGeometry(0.44, 0.72, 0.26);
    const legsMesh = new THREE.Mesh(legsGeo, team === 'aero' ? matAeroBody : matHelixBody);
    legsMesh.position.y = 0.36;
    legsMesh.castShadow = true;
    group.add(legsMesh);

    // 4. Weapon
    const weaponMesh = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.5), matGun);
    weaponMesh.position.set(0.26, 1.05, 0.28);
    group.add(weaponMesh);

    const wp = world.waypoints.find((w) => w.id === initialWaypointId) || world.waypoints[0];
    group.position.copy(wp.pos);
    scene.add(group);

    const bot = {
      id,
      name,
      team,
      role, // 'ENTRY', 'SUPPORT', 'ANCHOR'
      weaponType, // 'rifle', 'smg', 'shotgun', 'sniper'
      mesh: group,
      headMesh,
      torsoMesh,
      legsMesh,
      hp: 100,
      shield: 50,
      dead: false,
      state: 'PATROL', // 'PATROL', 'HOLD_ANGLE', 'ENGAGE', 'INVESTIGATE', 'RETREAT'
      currentWaypointId: initialWaypointId,
      targetPos: wp.pos.clone(),
      velocity: new THREE.Vector3(),
      yaw: 0,
      pitch: 0,
      targetEntity: null,
      trackTimer: 0, // Aim tracking duration: error shrinks as this increases
      fireCooldown: 0.2 + Math.random() * 0.3,
      burstRemaining: 3,
      reactionTimer: 0.22,
      holdTimer: 0,
      crouched: false,
      hasBeacon: team === 'helix' && id === 'helix_1',
    };

    headMesh.userData = { bot, part: 'head' };
    torsoMesh.userData = { bot, part: 'torso' };
    legsMesh.userData = { bot, part: 'legs' };

    hitMeshes.push(headMesh, torsoMesh, legsMesh);
    bots.push(bot);
    return bot;
  }

  function resetBots() {
    bots.forEach((b) => scene.remove(b.mesh));
    bots.length = 0;
    hitMeshes.length = 0;
    soundEvents.length = 0;

    // Tactical teams with distinct assigned roles
    // AeroSec Teammates
    spawnBot('aero_1', 'Operative Cruz', 'aero', 'ENTRY', 'lane_a_mid', 'rifle');
    spawnBot('aero_2', 'Operative Vance', 'aero', 'ANCHOR', 'mid_north', 'sniper');

    // Helix Syndicate Opponents
    spawnBot('helix_1', 'Helix Striker', 'helix', 'ENTRY', 'lane_a_south', 'rifle');
    spawnBot('helix_2', 'Helix Breacher', 'helix', 'SUPPORT', 'mid_south', 'shotgun');
    spawnBot('helix_3', 'Helix Infiltrator', 'helix', 'ANCHOR', 'lane_b_south', 'smg');
  }

  function reportSound(pos, radius, team) {
    soundEvents.push({ pos: pos.clone(), radius, team, life: 1.2 });
  }

  function damageBot(bot, amount, hitPoint, isHead = false, isLegs = false) {
    if (bot.dead) return false;

    let rem = amount;
    if (bot.shield > 0 && !isHead) {
      const absorbed = Math.min(bot.shield, rem * 0.65);
      bot.shield -= absorbed;
      rem -= absorbed;
    }
    bot.hp -= rem;

    if (effects && hitPoint) {
      effects.spawnBloodlessHit(hitPoint);
    }

    // Low HP tactical retreat
    if (bot.hp <= 35 && !bot.dead && bot.state !== 'RETREAT') {
      bot.state = 'RETREAT';
      bot.holdTimer = 2.5;
    }

    if (bot.hp <= 0) {
      bot.dead = true;
      bot.hp = 0;
      bot.mesh.rotation.x = -Math.PI / 2;
      bot.mesh.position.y = 0.2;
      return true; // Killed
    }
    return false;
  }

  function checkLineOfSight(fromPos, toPos) {
    vDir.subVectors(toPos, fromPos);
    const dist = vDir.length();
    if (dist < 0.1) return true;
    vDir.normalize();

    raycaster.set(fromPos, vDir);
    raycaster.far = dist;
    const hits = raycaster.intersectObjects(world.shootables, false);
    return hits.length === 0;
  }

  function step(dt, player, onBotKillPlayer, onBotFire) {
    // Decay sound events
    for (let i = soundEvents.length - 1; i >= 0; i--) {
      soundEvents[i].life -= dt;
      if (soundEvents[i].life <= 0) soundEvents.splice(i, 1);
    }

    for (const b of bots) {
      if (b.dead) continue;

      vEye.copy(b.mesh.position);
      vEye.y += 1.6;

      let enemyTarget = null;
      let enemyDist = Infinity;

      // 1. Scan player
      if (b.team === 'helix' && !player.state.dead) {
        vEnemyEye.copy(player.state.position);
        vEnemyEye.y += player.state.eye;

        const d = vEye.distanceTo(vEnemyEye);
        if (d < 46) {
          // Check smoke occlusion
          const blockedBySmoke = effects ? effects.isRayBlockedBySmoke(vEye, vEnemyEye) : false;

          if (!blockedBySmoke) {
            vDir.subVectors(vEnemyEye, vEye).normalize();
            const fwdX = Math.sin(b.yaw);
            const fwdZ = Math.cos(b.yaw);
            const dot = fwdX * vDir.x + fwdZ * vDir.z;

            if (dot > 0.3 || d < 7.5) {
              if (checkLineOfSight(vEye, vEnemyEye)) {
                enemyTarget = { isPlayer: true, pos: vEnemyEye.clone(), ref: player };
                enemyDist = d;
              }
            }
          }
        }
      }

      // 2. Scan rival bots
      if (!enemyTarget) {
        for (const other of bots) {
          if (other.dead || other.team === b.team) continue;
          vEnemyEye.copy(other.mesh.position);
          vEnemyEye.y += 1.5;

          const d = vEye.distanceTo(vEnemyEye);
          if (d < 42) {
            const blockedBySmoke = effects ? effects.isRayBlockedBySmoke(vEye, vEnemyEye) : false;
            if (!blockedBySmoke && checkLineOfSight(vEye, vEnemyEye)) {
              enemyTarget = { isPlayer: false, pos: vEnemyEye.clone(), ref: other };
              enemyDist = d;
              break;
            }
          }
        }
      }

      // 3. Acoustic sensing: hear gunshots and footsteps
      if (!enemyTarget && soundEvents.length > 0) {
        for (const se of soundEvents) {
          if (se.team !== b.team) {
            const dSound = b.mesh.position.distanceTo(se.pos);
            if (dSound <= se.radius) {
              b.state = 'INVESTIGATE';
              b.targetPos.copy(se.pos);
              const angleToSound = Math.atan2(se.pos.x - b.mesh.position.x, se.pos.z - b.mesh.position.z);
              b.yaw += (angleToSound - b.yaw) * Math.min(1, dt * 8);
              b.mesh.rotation.y = b.yaw;
              break;
            }
          }
        }
      }

      // Bot state machine
      if (enemyTarget) {
        b.state = 'ENGAGE';
        b.trackTimer += dt;

        // Turn towards target
        const dx = enemyTarget.pos.x - b.mesh.position.x;
        const dz = enemyTarget.pos.z - b.mesh.position.z;
        const targetYaw = Math.atan2(dx, dz);
        b.yaw += (targetYaw - b.yaw) * Math.min(1, dt * 7.5);
        b.mesh.rotation.y = b.yaw;

        // Shrinking aim error: starts large (~0.5m) and decays to ~0.05m
        const aimAccuracy = Math.min(1.0, b.trackTimer / 0.65);
        const currentError = THREE.MathUtils.lerp(0.5, 0.05, aimAccuracy);

        // Firing logic
        b.fireCooldown -= dt;
        if (b.trackTimer >= b.reactionTimer && b.fireCooldown <= 0) {
          b.burstRemaining -= 1;
          soundEngine.playGunshot(b.weaponType);

          vMuzzle.copy(b.mesh.position);
          vMuzzle.y += 1.1;
          vMuzzle.add(new THREE.Vector3(Math.sin(b.yaw) * 0.4, 0, Math.cos(b.yaw) * 0.4));

          const aimPoint = enemyTarget.pos.clone();
          aimPoint.x += (Math.random() - 0.5) * currentError;
          aimPoint.y += (Math.random() - 0.5) * (currentError * 0.8);
          aimPoint.z += (Math.random() - 0.5) * currentError;

          if (effects) {
            effects.spawnTracer(vMuzzle, aimPoint, b.team === 'helix');
            effects.spawnMuzzleFlash(vMuzzle);
          }

          reportSound(vMuzzle, 32, b.team);

          // Hit determination
          const hitChance = THREE.MathUtils.lerp(0.3, 0.65, aimAccuracy);
          if (Math.random() < hitChance) {
            const isHead = Math.random() < 0.22;
            const dmg = isHead ? 45 : (b.weaponType === 'shotgun' ? 36 : 22);

            if (enemyTarget.isPlayer) {
              const killed = player.damage(dmg, b.mesh.position, isHead);
              if (killed && onBotKillPlayer) {
                onBotKillPlayer(b.name, b.weaponType === 'shotgun' ? 'Breaker-12' : 'Phalanx-4', isHead);
              }
            } else {
              damageBot(enemyTarget.ref, dmg, aimPoint, isHead);
            }
          }

          if (b.burstRemaining <= 0) {
            b.burstRemaining = b.weaponType === 'shotgun' ? 1 : (2 + Math.floor(Math.random() * 3));
            b.fireCooldown = b.weaponType === 'shotgun' ? 0.75 : (0.42 + Math.random() * 0.35);
          } else {
            b.fireCooldown = b.weaponType === 'smg' ? 0.08 : 0.11;
          }

          if (onBotFire) onBotFire(b);
        }
      } else if (b.state === 'RETREAT') {
        b.holdTimer -= dt;
        if (b.holdTimer <= 0) b.state = 'PATROL';
        // Move backward toward previous waypoint
        const currentWp = world.waypoints.find((w) => w.id === b.currentWaypointId);
        if (currentWp && currentWp.neighbors.length > 0) {
          const retreatWp = world.waypoints.find((w) => w.id === currentWp.neighbors[0]);
          if (retreatWp) {
            vDir.subVectors(retreatWp.pos, b.mesh.position);
            vDir.y = 0;
            vDir.normalize();
            b.mesh.position.addScaledVector(vDir, 3.2 * dt);
          }
        }
      } else {
        // Patrol or hold role
        b.trackTimer = 0;
        const currentWp = world.waypoints.find((w) => w.id === b.currentWaypointId);
        if (currentWp) {
          vDir.subVectors(b.targetPos, b.mesh.position);
          vDir.y = 0;
          const distToWp = vDir.length();

          if (distToWp < 1.2) {
            // Anchor role: pause and hold angle for a few seconds
            if (b.role === 'ANCHOR' && Math.random() < 0.4) {
              b.state = 'HOLD_ANGLE';
              b.holdTimer = 3.0 + Math.random() * 2.5;
            }

            const nextId = currentWp.neighbors[Math.floor(Math.random() * currentWp.neighbors.length)];
            const nextWp = world.waypoints.find((w) => w.id === nextId);
            if (nextWp) {
              b.currentWaypointId = nextId;
              b.targetPos.copy(nextWp.pos);
            }
          } else {
            vDir.normalize();
            const moveSpeed = b.role === 'ENTRY' ? 4.2 : 3.5;
            b.mesh.position.x += vDir.x * moveSpeed * dt;
            b.mesh.position.z += vDir.z * moveSpeed * dt;

            const targetYaw = Math.atan2(vDir.x, vDir.z);
            b.yaw += (targetYaw - b.yaw) * Math.min(1, dt * 6);
            b.mesh.rotation.y = b.yaw;
          }
        }
      }
    }
  }

  return {
    bots,
    hitMeshes,
    spawnBot,
    resetBots,
    damageBot,
    reportSound,
    step,
  };
}

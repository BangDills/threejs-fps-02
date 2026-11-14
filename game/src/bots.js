// Tactical Bot AI: routes, sensory vision/sound, angle holds, and body-part hitscan.
import * as THREE from 'three';
import { PALETTE } from './palette.js';
import { soundEngine } from './audio.js';

export function createBotManager(scene, world, effects) {
  const bots = [];
  const hitMeshes = [];
  const raycaster = new THREE.Raycaster();

  // Shared materials for bot factions
  const matAeroHead = new THREE.MeshStandardMaterial({ color: PALETTE.aeroSec, roughness: 0.3, metalness: 0.6 });
  const matAeroBody = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.6, metalness: 0.3 });
  const matHelixHead = new THREE.MeshStandardMaterial({ color: PALETTE.helix, roughness: 0.3, metalness: 0.6 });
  const matHelixBody = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.6, metalness: 0.3 });
  const matGun = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.4, metalness: 0.8 });

  function spawnBot(id, name, team, initialWaypointId) {
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

    // 4. Weapon in hands
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
      mesh: group,
      headMesh,
      torsoMesh,
      legsMesh,
      hp: 100,
      dead: false,
      state: 'PATROL', // PATROL, HOLD_ANGLE, ENGAGE, INVESTIGATE, PLANT, DEFUSE
      currentWaypointId: initialWaypointId,
      targetPos: wp.pos.clone(),
      velocity: new THREE.Vector3(),
      yaw: 0,
      pitch: 0,
      targetEntity: null,
      aimError: new THREE.Vector3(),
      fireCooldown: 0.2 + Math.random() * 0.3,
      burstRemaining: 3,
      reactionTimer: 0.25,
      seeTargetTimer: 0,
      holdTimer: 0,
      hasBeacon: team === 'helix' && id === 'helix_1',
    };

    // Register userData for body-part hit detection
    headMesh.userData = { bot, part: 'head' };
    torsoMesh.userData = { bot, part: 'torso' };
    legsMesh.userData = { bot, part: 'legs' };

    hitMeshes.push(headMesh, torsoMesh, legsMesh);
    bots.push(bot);
    return bot;
  }

  function resetBots() {
    bots.forEach((b) => {
      scene.remove(b.mesh);
    });
    bots.length = 0;
    hitMeshes.length = 0;

    // Spawn tactical teams
    // Teammate: AeroSec
    spawnBot('aero_1', 'Operative Cruz', 'aero', 'lane_a_mid');
    spawnBot('aero_2', 'Operative Vance', 'aero', 'mid_north');

    // Opponents: Helix Syndicate
    spawnBot('helix_1', 'Helix Striker', 'helix', 'lane_a_south');
    spawnBot('helix_2', 'Helix Breacher', 'helix', 'mid_south');
    spawnBot('helix_3', 'Helix Infiltrator', 'helix', 'lane_b_south');
  }

  function damageBot(bot, amount, hitPoint) {
    if (bot.dead) return false;
    bot.hp -= amount;
    if (effects && hitPoint) {
      effects.spawnBloodlessHit(hitPoint);
    }
    if (bot.hp <= 0) {
      bot.dead = true;
      bot.hp = 0;
      // Ragdoll fall effect
      bot.mesh.rotation.x = -Math.PI / 2;
      bot.mesh.position.y = 0.2;
      return true; // Killed
    }
    return false;
  }

  function checkLineOfSight(fromPos, toPos) {
    const dir = new THREE.Vector3().subVectors(toPos, fromPos);
    const dist = dir.length();
    if (dist < 0.1) return true;
    dir.normalize();

    raycaster.set(fromPos, dir);
    raycaster.far = dist;
    const hits = raycaster.intersectObjects(world.shootables, false);
    return hits.length === 0;
  }

  function step(dt, player, onBotKillPlayer, onBotFire) {
    for (const b of bots) {
      if (b.dead) continue;

      // Senses: Scan for enemies
      let enemyTarget = null;
      let enemyDist = Infinity;

      // 1. Scan player if enemy
      if (b.team === 'helix' && !player.state.dead) {
        const pEye = player.state.position.clone();
        pEye.y += player.state.eye;
        const bEye = b.mesh.position.clone();
        bEye.y += 1.6;

        const toPlayer = new THREE.Vector3().subVectors(pEye, bEye);
        const d = toPlayer.length();

        if (d < 45) {
          // Check vision cone (FOV 110 deg)
          const fwd = new THREE.Vector3(Math.sin(b.yaw), 0, Math.cos(b.yaw));
          toPlayer.normalize();
          const dot = fwd.dot(toPlayer);

          if (dot > 0.35 || d < 8) {
            // Check line of sight against walls
            if (checkLineOfSight(bEye, pEye)) {
              enemyTarget = { isPlayer: true, pos: pEye, ref: player };
              enemyDist = d;
            }
          }
        }
      }

      // 2. Scan rival bots
      if (!enemyTarget) {
        for (const other of bots) {
          if (other.dead || other.team === b.team) continue;
          const otherEye = other.mesh.position.clone();
          otherEye.y += 1.5;
          const bEye = b.mesh.position.clone();
          bEye.y += 1.6;

          const toOther = new THREE.Vector3().subVectors(otherEye, bEye);
          const d = toOther.length();
          if (d < 40) {
            if (checkLineOfSight(bEye, otherEye)) {
              enemyTarget = { isPlayer: false, pos: otherEye, ref: other };
              enemyDist = d;
              break;
            }
          }
        }
      }

      // AI State Machine
      if (enemyTarget) {
        b.state = 'ENGAGE';
        b.seeTargetTimer += dt;

        // Aim smoothing with deliberate error
        const dx = enemyTarget.pos.x - b.mesh.position.x;
        const dz = enemyTarget.pos.z - b.mesh.position.z;
        const targetYaw = Math.atan2(dx, dz);
        b.yaw += (targetYaw - b.yaw) * Math.min(1, dt * 7.5);
        b.mesh.rotation.y = b.yaw;

        // Fire weapon in controlled bursts
        b.fireCooldown -= dt;
        if (b.seeTargetTimer >= b.reactionTimer && b.fireCooldown <= 0) {
          // Fire burst
          b.burstRemaining -= 1;
          soundEngine.playGunshot('rifle');
          const muzzlePos = b.mesh.position.clone();
          muzzlePos.y += 1.1;
          muzzlePos.add(new THREE.Vector3(Math.sin(b.yaw) * 0.4, 0, Math.cos(b.yaw) * 0.4));

          // Calculate bullet trajectory with dispersion
          const aimTarget = enemyTarget.pos.clone();
          aimTarget.x += (Math.random() - 0.5) * 0.5;
          aimTarget.y += (Math.random() - 0.5) * 0.4;
          aimTarget.z += (Math.random() - 0.5) * 0.5;

          if (effects) {
            effects.spawnTracer(muzzlePos, aimTarget);
            effects.spawnMuzzleFlash(muzzlePos);
          }

          // Hit determination
          if (Math.random() < 0.45) {
            if (enemyTarget.isPlayer) {
              const killed = player.damage(18 + Math.floor(Math.random() * 8));
              if (killed && onBotKillPlayer) {
                onBotKillPlayer(b.name, 'Phalanx-4');
              }
            } else {
              damageBot(enemyTarget.ref, 25, aimTarget);
            }
          }

          if (b.burstRemaining <= 0) {
            b.burstRemaining = 2 + Math.floor(Math.random() * 3);
            b.fireCooldown = 0.45 + Math.random() * 0.4; // Pause between bursts
          } else {
            b.fireCooldown = 0.11; // Delay within burst
          }

          if (onBotFire) onBotFire(b);
        }
      } else {
        // Patrol or advance towards objective waypoints
        b.state = 'PATROL';
        b.seeTargetTimer = 0;

        const currentWp = world.waypoints.find((w) => w.id === b.currentWaypointId);
        if (currentWp) {
          const toWp = new THREE.Vector3().subVectors(b.targetPos, b.mesh.position);
          toWp.y = 0;
          const distToWp = toWp.length();

          if (distToWp < 1.2) {
            // Pick next neighbor waypoint
            const nextId = currentWp.neighbors[Math.floor(Math.random() * currentWp.neighbors.length)];
            const nextWp = world.waypoints.find((w) => w.id === nextId);
            if (nextWp) {
              b.currentWaypointId = nextId;
              b.targetPos.copy(nextWp.pos);
            }
          } else {
            toWp.normalize();
            const moveSpeed = 3.6;
            b.mesh.position.x += toWp.x * moveSpeed * dt;
            b.mesh.position.z += toWp.z * moveSpeed * dt;

            // Turn towards movement
            const targetYaw = Math.atan2(toWp.x, toWp.z);
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
    step,
  };
}

// Tactical Bot AI: 5v5 rosters, real hitscan bullet traces, aim tracking model,
// economic buy decisions, objective carry/drop/pickup/plant/defuse, and nav waypoint routing.
import * as THREE from 'three';
import { PALETTE } from './palette.js';
import { soundEngine } from './audio.js';

export function createBotManager(scene, world, effects) {
  const bots = [];
  const hitMeshes = [];
  const soundEvents = [];
  const botRaycaster = new THREE.Raycaster();

  const vFrom = new THREE.Vector3();
  const vTo = new THREE.Vector3();
  const vDir = new THREE.Vector3();
  const vEye = new THREE.Vector3();
  const vTarget = new THREE.Vector3();
  const vMuzzle = new THREE.Vector3();
  const vAimDir = new THREE.Vector3();
  const vFar = new THREE.Vector3();

  const matAeroHead = new THREE.MeshStandardMaterial({ color: PALETTE.aeroSec, roughness: 0.35, metalness: 0.5 });
  const matAeroBody = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6, metalness: 0.25 });
  const matHelixHead = new THREE.MeshStandardMaterial({ color: PALETTE.helix, roughness: 0.35, metalness: 0.5 });
  const matHelixBody = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6, metalness: 0.25 });
  const matGun = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4, metalness: 0.8 });
  const matBeaconPack = new THREE.MeshStandardMaterial({ color: PALETTE.siteAlphaGlow, roughness: 0.3, metalness: 0.6 });

  const droppedBeaconGeo = new THREE.BoxGeometry(0.35, 0.45, 0.25);
  const droppedBeaconMesh = new THREE.Mesh(droppedBeaconGeo, matBeaconPack);
  droppedBeaconMesh.visible = false;
  scene.add(droppedBeaconMesh);

  const droppedBeaconRingGeo = new THREE.RingGeometry(0.3, 0.9, 16);
  const droppedBeaconRing = new THREE.Mesh(droppedBeaconRingGeo, new THREE.MeshBasicMaterial({
    color: PALETTE.siteAlphaGlow,
    wireframe: true,
  }));
  droppedBeaconRing.rotation.x = -Math.PI / 2;
  droppedBeaconRing.position.y = 0.04;
  droppedBeaconMesh.add(droppedBeaconRing);

  const droppedBeaconState = {
    dropped: false,
    pos: new THREE.Vector3(),
  };

  function spawnBot(id, name, team, role, initialWaypointId, defaultWeapon = 'rifle') {
    const group = new THREE.Group();

    // 1. Head (headshot hitbox)
    const headGeo = new THREE.SphereGeometry(0.24, 12, 12);
    const headMesh = new THREE.Mesh(headGeo, team === 'aero' ? matAeroHead : matHelixHead);
    headMesh.position.y = 1.62;
    headMesh.castShadow = true;
    group.add(headMesh);

    // 2. Torso (torso hitbox)
    const torsoGeo = new THREE.BoxGeometry(0.52, 0.72, 0.3);
    const torsoMesh = new THREE.Mesh(torsoGeo, team === 'aero' ? matAeroBody : matHelixBody);
    torsoMesh.position.y = 1.08;
    torsoMesh.castShadow = true;
    group.add(torsoMesh);

    // 3. Legs (limbs hitbox)
    const legsGeo = new THREE.BoxGeometry(0.44, 0.72, 0.26);
    const legsMesh = new THREE.Mesh(legsGeo, team === 'aero' ? matAeroBody : matHelixBody);
    legsMesh.position.y = 0.36;
    legsMesh.castShadow = true;
    group.add(legsMesh);

    // 4. Weapon
    const weaponMesh = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.5), matGun);
    weaponMesh.position.set(0.26, 1.05, 0.28);
    group.add(weaponMesh);

    // 5. Objective beacon backpack
    const beaconPackMesh = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.32, 0.14), matBeaconPack);
    beaconPackMesh.position.set(0, 1.12, -0.2);
    beaconPackMesh.visible = false;
    group.add(beaconPackMesh);

    const wp = world.waypoints.find((w) => w.id === initialWaypointId) || world.waypoints[0];
    group.position.copy(wp.pos);
    scene.add(group);

    const bot = {
      id, name, team, role, weaponType: defaultWeapon,
      mesh: group, headMesh, torsoMesh, legsMesh, weaponMesh, beaconPackMesh,
      hp: 100, shield: 50, credits: 800, dead: false,
      state: 'PATROL', currentWaypointId: initialWaypointId,
      targetPos: wp.pos.clone(), yaw: 0, pitch: 0, recoilPitch: 0,
      trackTimer: 0, fireCooldown: 0.2 + Math.random() * 0.2,
      burstRemaining: 3, reactionTimer: 0.2, holdTimer: 0,
      actionProgress: 0, hasBeacon: false,
    };

    headMesh.userData = { bot, part: 'head' };
    torsoMesh.userData = { bot, part: 'torso' };
    legsMesh.userData = { bot, part: 'legs' };

    hitMeshes.push(headMesh, torsoMesh, legsMesh);
    bots.push(bot);
    return bot;
  }

  function buyLoadoutForBot(bot) {
    if (bot.credits >= 4600 && bot.role === 'MARKSMAN') {
      bot.weaponType = 'sniper'; bot.shield = 100; bot.credits -= 4600;
    } else if (bot.credits >= 3550) {
      bot.weaponType = 'rifle'; bot.shield = 100; bot.credits -= 3550;
    } else if (bot.credits >= 2450) {
      bot.weaponType = bot.role === 'ENTRY' ? 'shotgun' : 'smg';
      bot.shield = 100; bot.credits -= 2450;
    } else if (bot.credits >= 1600) {
      bot.weaponType = 'smg'; bot.shield = 50; bot.credits -= 1600;
    } else {
      bot.weaponType = 'pistol'; bot.shield = 0;
    }
  }

  function resetBots() {
    bots.forEach((b) => scene.remove(b.mesh));
    bots.length = 0;
    hitMeshes.length = 0;
    soundEvents.length = 0;
    droppedBeaconMesh.visible = false;
    droppedBeaconState.dropped = false;

    // 5v5 Tactical Match Rosters (4 AeroSec Bots + Player vs 5 Helix Syndicate Bots)
    spawnBot('aero_1', 'Operative Cruz', 'aero', 'ENTRY', 'lane_a_mid', 'rifle');
    spawnBot('aero_2', 'Operative Vance', 'aero', 'ANCHOR', 'mid_north', 'sniper');
    spawnBot('aero_3', 'Operative Reyes', 'aero', 'SUPPORT', 'lane_b_mid', 'smg');
    spawnBot('aero_4', 'Operative Novak', 'aero', 'RECON', 'aero_left', 'rifle');

    const b1 = spawnBot('helix_1', 'Helix Striker', 'helix', 'ENTRY', 'lane_a_south', 'rifle');
    spawnBot('helix_2', 'Helix Breacher', 'helix', 'SUPPORT', 'mid_south', 'shotgun');
    spawnBot('helix_3', 'Helix Infiltrator', 'helix', 'ANCHOR', 'lane_b_south', 'smg');
    spawnBot('helix_4', 'Helix Ghost', 'helix', 'MARKSMAN', 'helix_left', 'sniper');
    spawnBot('helix_5', 'Helix Viper', 'helix', 'FLANKER', 'helix_right', 'rifle');

    b1.hasBeacon = true;
    b1.beaconPackMesh.visible = true;
    bots.forEach(buyLoadoutForBot);
  }

  function reportSound(pos, radius, team) {
    soundEvents.push({ pos: pos.clone(), radius, team, life: 1.2 });
  }

  function dropBeacon(pos) {
    droppedBeaconState.dropped = true;
    droppedBeaconState.pos.copy(pos);
    droppedBeaconState.pos.y = 0.25;
    droppedBeaconMesh.position.copy(droppedBeaconState.pos);
    droppedBeaconMesh.visible = true;
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

    if (effects && hitPoint) effects.spawnBloodlessHit(hitPoint);

    if (bot.hp <= 35 && !bot.dead && bot.state !== 'RETREAT') {
      bot.state = 'RETREAT';
      bot.holdTimer = 2.2;
    }

    if (bot.hp <= 0) {
      bot.dead = true;
      bot.hp = 0;
      bot.mesh.rotation.x = -Math.PI / 2;
      bot.mesh.position.y = 0.22;

      if (bot.hasBeacon) {
        bot.hasBeacon = false;
        bot.beaconPackMesh.visible = false;
        dropBeacon(bot.mesh.position);
      }
      return true;
    }
    return false;
  }

  function checkLineOfSight(fromPos, toPos) {
    vDir.subVectors(toPos, fromPos);
    const dist = vDir.length();
    if (dist < 0.1) return true;
    vDir.normalize();

    botRaycaster.set(fromPos, vDir);
    botRaycaster.far = dist;
    const hits = botRaycaster.intersectObjects(world.shootables, false);
    return hits.length === 0;
  }

  function step(dt, player, onBotKillPlayer, onBotFire) {
    if (droppedBeaconState.dropped && droppedBeaconMesh.visible) {
      droppedBeaconRing.rotation.z += 1.2 * dt;
    }

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
        vTarget.copy(player.state.position);
        vTarget.y += player.state.eye;
        const d = vEye.distanceTo(vTarget);
        if (d < 50) {
          const blockedBySmoke = effects ? effects.isRayBlockedBySmoke(vEye, vTarget) : false;
          if (!blockedBySmoke) {
            vDir.subVectors(vTarget, vEye).normalize();
            const fwdX = Math.sin(b.yaw);
            const fwdZ = Math.cos(b.yaw);
            const dot = fwdX * vDir.x + fwdZ * vDir.z;
            if (dot > 0.25 || d < 8.0) {
              if (checkLineOfSight(vEye, vTarget)) {
                enemyTarget = { isPlayer: true, pos: vTarget.clone(), ref: player };
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
          vTarget.copy(other.mesh.position);
          vTarget.y += 1.5;
          const d = vEye.distanceTo(vTarget);
          if (d < 46) {
            const blockedBySmoke = effects ? effects.isRayBlockedBySmoke(vEye, vTarget) : false;
            if (!blockedBySmoke && checkLineOfSight(vEye, vTarget)) {
              enemyTarget = { isPlayer: false, pos: vTarget.clone(), ref: other };
              enemyDist = d;
              break;
            }
          }
        }
      }

      // 3. Acoustic sensing
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

      // 4. Dropped objective pickup logic for Helix
      if (b.team === 'helix' && !b.hasBeacon && droppedBeaconState.dropped && !enemyTarget) {
        const dDrop = b.mesh.position.distanceTo(droppedBeaconState.pos);
        if (dDrop < 30) {
          b.state = 'PICKUP_BEACON';
          b.targetPos.copy(droppedBeaconState.pos);
          if (dDrop < 1.6) {
            b.hasBeacon = true;
            b.beaconPackMesh.visible = true;
            droppedBeaconState.dropped = false;
            droppedBeaconMesh.visible = false;
            b.state = 'PATROL';
          }
        }
      }

      // 5. Bot State Machine & Real Hitscan Bullet Tracing
      if (enemyTarget) {
        b.state = 'ENGAGE';
        b.trackTimer += dt;

        const dx = enemyTarget.pos.x - b.mesh.position.x;
        const dz = enemyTarget.pos.z - b.mesh.position.z;
        const targetYaw = Math.atan2(dx, dz);
        b.yaw += (targetYaw - b.yaw) * Math.min(1, dt * 7.5);
        b.mesh.rotation.y = b.yaw;

        const aimFactor = Math.min(1.0, b.trackTimer / 0.65);
        const spreadAngle = THREE.MathUtils.lerp(0.065, 0.006, aimFactor);

        b.fireCooldown -= dt;
        if (b.trackTimer >= b.reactionTimer && b.fireCooldown <= 0) {
          b.burstRemaining -= 1;
          soundEngine.playGunshot(b.weaponType);

          vMuzzle.copy(b.mesh.position);
          vMuzzle.y += 1.1;
          vMuzzle.add(new THREE.Vector3(Math.sin(b.yaw) * 0.42, 0, Math.cos(b.yaw) * 0.42));

          vAimDir.subVectors(enemyTarget.pos, vMuzzle).normalize();
          vAimDir.x += (Math.random() - 0.5) * spreadAngle;
          vAimDir.y += (Math.random() - 0.5) * (spreadAngle * 0.7);
          vAimDir.z += (Math.random() - 0.5) * spreadAngle;
          vAimDir.normalize();

          b.recoilPitch = Math.min(0.06, b.recoilPitch + 0.012);

          // Real Hitscan Trace: world architecture + player hitboxes + other bot hitboxes
          botRaycaster.set(vMuzzle, vAimDir);
          botRaycaster.far = 100;

          const traceTargets = world.shootables
            .concat(player.hitMeshes)
            .concat(hitMeshes.filter((m) => m.userData.bot !== b));

          const hits = botRaycaster.intersectObjects(traceTargets, false);

          if (hits.length > 0) {
            const firstHit = hits[0];
            const hitPoint = firstHit.point;

            if (effects) {
              effects.spawnTracer(vMuzzle, hitPoint, b.team === 'helix');
              effects.spawnMuzzleFlash(vMuzzle);
            }

            if (firstHit.object.userData && firstHit.object.userData.isPlayer) {
              const part = firstHit.object.userData.part;
              const isHead = (part === 'head');
              const isLegs = (part === 'legs');
              const dist = vMuzzle.distanceTo(hitPoint);

              let baseDmg = b.weaponType === 'sniper' ? 105 : (b.weaponType === 'shotgun' ? 38 : (b.weaponType === 'smg' ? 22 : 32));
              if (dist > 25) baseDmg = Math.max(12, Math.floor(baseDmg * (1 - (dist - 25) / 60)));
              const finalDmg = isHead ? Math.floor(baseDmg * 2.8) : (isLegs ? Math.floor(baseDmg * 0.75) : baseDmg);

              const killed = player.damage(finalDmg, vMuzzle, isHead);
              if (killed && onBotKillPlayer) {
                const gunName = b.weaponType === 'sniper' ? 'Longbow-X' : (b.weaponType === 'shotgun' ? 'Breaker-12' : (b.weaponType === 'smg' ? 'Specter-9' : 'Phalanx-4'));
                onBotKillPlayer(b.name, gunName, isHead);
              }
            } else if (firstHit.object.userData && firstHit.object.userData.bot) {
              const targetBot = firstHit.object.userData.bot;
              const part = firstHit.object.userData.part;
              const isHead = (part === 'head');
              const isLegs = (part === 'legs');
              const dist = vMuzzle.distanceTo(hitPoint);

              let baseDmg = b.weaponType === 'sniper' ? 105 : (b.weaponType === 'shotgun' ? 38 : (b.weaponType === 'smg' ? 22 : 32));
              if (dist > 25) baseDmg = Math.max(12, Math.floor(baseDmg * (1 - (dist - 25) / 60)));
              const finalDmg = isHead ? Math.floor(baseDmg * 2.8) : (isLegs ? Math.floor(baseDmg * 0.75) : baseDmg);

              damageBot(targetBot, finalDmg, hitPoint, isHead, isLegs);
            } else {
              if (effects) effects.spawnWallSparks(hitPoint, firstHit.face ? firstHit.face.normal : null);
            }
          } else {
            vFar.copy(vMuzzle).addScaledVector(vAimDir, 65);
            if (effects) {
              effects.spawnTracer(vMuzzle, vFar, b.team === 'helix');
              effects.spawnMuzzleFlash(vMuzzle);
            }
          }

          reportSound(vMuzzle, 32, b.team);

          if (b.burstRemaining <= 0) {
            b.burstRemaining = b.weaponType === 'shotgun' ? 1 : (2 + Math.floor(Math.random() * 3));
            b.fireCooldown = b.weaponType === 'sniper' ? 1.2 : (b.weaponType === 'shotgun' ? 0.75 : (0.4 + Math.random() * 0.35));
          } else {
            b.fireCooldown = b.weaponType === 'smg' ? 0.08 : 0.11;
          }

          if (onBotFire) onBotFire(b);
        }
      } else if (b.state === 'RETREAT') {
        b.holdTimer -= dt;
        if (b.holdTimer <= 0) b.state = 'PATROL';
        const currentWp = world.waypoints.find((w) => w.id === b.currentWaypointId);
        if (currentWp && currentWp.neighbors.length > 0) {
          const retreatWp = world.waypoints.find((w) => w.id === currentWp.neighbors[0]);
          if (retreatWp) {
            vDir.subVectors(retreatWp.pos, b.mesh.position);
            vDir.y = 0;
            vDir.normalize();
            b.mesh.position.addScaledVector(vDir, 3.4 * dt);
          }
        }
      } else {
        b.trackTimer = 0;
        b.recoilPitch = Math.max(0, b.recoilPitch - dt * 0.2);

        const currentWp = world.waypoints.find((w) => w.id === b.currentWaypointId);
        if (currentWp) {
          vDir.subVectors(b.targetPos, b.mesh.position);
          vDir.y = 0;
          const distToTarget = vDir.length();

          if (distToTarget < 1.4) {
            if (b.role === 'ANCHOR' && Math.random() < 0.35) {
              b.state = 'HOLD_ANGLE';
              b.holdTimer = 2.8 + Math.random() * 2.2;
            }

            let nextId;
            if (b.hasBeacon) {
              const targetSiteWp = b.id === 'helix_1' ? 'site_a' : 'site_b';
              nextId = currentWp.neighbors.includes(targetSiteWp)
                ? targetSiteWp
                : currentWp.neighbors[Math.floor(Math.random() * currentWp.neighbors.length)];
            } else {
              nextId = currentWp.neighbors[Math.floor(Math.random() * currentWp.neighbors.length)];
            }

            const nextWp = world.waypoints.find((w) => w.id === nextId);
            if (nextWp) {
              b.currentWaypointId = nextId;
              b.targetPos.copy(nextWp.pos);
            }
          } else {
            vDir.normalize();
            const moveSpeed = b.role === 'ENTRY' ? 4.2 : 3.6;
            b.mesh.position.x += vDir.x * moveSpeed * dt;
            b.mesh.position.z += vDir.z * moveSpeed * dt;

            const targetYaw = Math.atan2(vDir.x, vDir.z);
            b.yaw += (targetYaw - b.yaw) * Math.min(1, dt * 6.5);
            b.mesh.rotation.y = b.yaw;
          }
        }
      }
    }
  }

  return {
    bots,
    hitMeshes,
    droppedBeaconState,
    spawnBot,
    buyLoadoutForBot,
    resetBots,
    damageBot,
    reportSound,
    dropBeacon,
    step,
  };
}

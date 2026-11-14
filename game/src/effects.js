// Visual effects engine: 100% pre-allocated object pools for tracers, sparks, dust, smoke, and blasts.
// Hot loops perform zero Object3D, geometry, or material allocations.
import * as THREE from 'three';
import { PALETTE } from './palette.js';

export function createEffectSystem(scene) {
  const matTracerPlayer = new THREE.LineBasicMaterial({ color: PALETTE.tracer, linewidth: 2 });
  const matTracerEnemy = new THREE.LineBasicMaterial({ color: PALETTE.tracerEnemy, linewidth: 2 });
  const matSpark = new THREE.MeshBasicMaterial({ color: PALETTE.spark });
  const matDigitalHit = new THREE.MeshBasicMaterial({ color: PALETTE.aeroSecGlow });
  const matDust = new THREE.MeshBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.65 });
  const matSmoke = new THREE.MeshStandardMaterial({
    color: PALETTE.smoke,
    roughness: 0.9,
    metalness: 0.05,
    transparent: true,
    opacity: 0.75,
  });
  const matBeaconAura = new THREE.MeshBasicMaterial({
    color: PALETTE.siteAlphaGlow,
    transparent: true,
    opacity: 0.65,
    wireframe: true,
  });
  const matBlast = new THREE.MeshBasicMaterial({
    color: PALETTE.blastOrange,
    transparent: true,
    opacity: 0.85,
  });

  const geoSpark = new THREE.BoxGeometry(0.045, 0.045, 0.045);
  const geoHit = new THREE.TetrahedronGeometry(0.065);
  const geoDust = new THREE.SphereGeometry(0.14, 6, 6);
  const geoSmokeSphere = new THREE.SphereGeometry(1.8, 6, 6);
  const geoBlast = new THREE.SphereGeometry(5.5, 12, 12);

  const flashLight = new THREE.PointLight(PALETTE.flash, 0, 16);
  scene.add(flashLight);
  let flashTimer = 0;

  // 1. Tracer Pool (32 pre-allocated lines)
  const MAX_TRACERS = 32;
  const tracerPool = [];
  for (let i = 0; i < MAX_TRACERS; i++) {
    const posArr = new Float32Array(6);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
    const line = new THREE.Line(geo, matTracerPlayer);
    line.visible = false;
    scene.add(line);
    tracerPool.push({
      line, posArr, active: false,
      fromX: 0, fromY: 0, fromZ: 0,
      dirX: 0, dirY: 0, dirZ: 0,
      progress: 0, totalDist: 0, speed: 195.0, length: 5.5,
    });
  }

  // 2. Spark Mesh Pool (72 pre-allocated meshes)
  const MAX_SPARKS = 72;
  const sparkPool = [];
  for (let i = 0; i < MAX_SPARKS; i++) {
    const mesh = new THREE.Mesh(geoSpark, matSpark);
    mesh.visible = false;
    scene.add(mesh);
    sparkPool.push({ mesh, active: false, vx: 0, vy: 0, vz: 0, life: 0, maxLife: 0.28 });
  }

  // 3. Bloodless Hit Mesh Pool (48 pre-allocated meshes)
  const MAX_HITS = 48;
  const hitPool = [];
  for (let i = 0; i < MAX_HITS; i++) {
    const mesh = new THREE.Mesh(geoHit, matDigitalHit);
    mesh.visible = false;
    scene.add(mesh);
    hitPool.push({ mesh, active: false, vx: 0, vy: 0, vz: 0, life: 0, maxLife: 0.35 });
  }

  // 4. Footstep Dust Mesh Pool (24 pre-allocated meshes)
  const MAX_DUST = 24;
  const dustPool = [];
  for (let i = 0; i < MAX_DUST; i++) {
    const mesh = new THREE.Mesh(geoDust, matDust.clone());
    mesh.visible = false;
    scene.add(mesh);
    dustPool.push({ mesh, active: false, vx: 0, vy: 0, vz: 0, life: 0, maxLife: 0.4 });
  }

  // 5. Explosion Blast Mesh
  const blastMesh = new THREE.Mesh(geoBlast, matBlast);
  blastMesh.visible = false;
  scene.add(blastMesh);
  let blastActive = false;
  let blastLife = 0;
  const blastMaxLife = 0.55;

  // 6. Smoke Cloud Pool (4 pre-allocated volumetric clusters)
  const MAX_SMOKES = 4;
  const smokePool = [];
  for (let s = 0; s < MAX_SMOKES; s++) {
    const group = new THREE.Group();
    for (let j = 0; j < 3; j++) {
      const mesh = new THREE.Mesh(geoSmokeSphere, matSmoke);
      mesh.position.set(
        (j === 0 ? -0.9 : (j === 1 ? 0.9 : 0)),
        1.1 + j * 0.4,
        (j === 2 ? 0.9 : -0.5)
      );
      group.add(mesh);
    }
    group.visible = false;
    scene.add(group);
    smokePool.push({
      group, active: false,
      posX: 0, posY: 0, posZ: 0,
      radius: 5.2, life: 0, maxLife: 15.0,
    });
  }

  // 7. Beacon Hologram
  const cylGeo = new THREE.CylinderGeometry(0.8, 1.2, 5.0, 16, 1, true);
  const beaconCyl = new THREE.Mesh(cylGeo, matBeaconAura);
  beaconCyl.visible = false;
  scene.add(beaconCyl);

  const ringGeo = new THREE.RingGeometry(0.8, 3.8, 24);
  const beaconRing = new THREE.Mesh(ringGeo, matBeaconAura);
  beaconRing.rotation.x = -Math.PI / 2;
  beaconRing.visible = false;
  scene.add(beaconRing);

  function spawnTracer(from, to, isEnemy = false) {
    let t = tracerPool.find((item) => !item.active);
    if (!t) t = tracerPool[0];

    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dz = to.z - from.z;
    const dist = Math.hypot(dx, dy, dz) || 0.001;

    t.fromX = from.x; t.fromY = from.y; t.fromZ = from.z;
    t.dirX = dx / dist; t.dirY = dy / dist; t.dirZ = dz / dist;
    t.totalDist = dist; t.progress = 0; t.active = true;
    t.line.material = isEnemy ? matTracerEnemy : matTracerPlayer;

    const arr = t.posArr;
    arr[0] = from.x; arr[1] = from.y; arr[2] = from.z;
    arr[3] = from.x; arr[4] = from.y; arr[5] = from.z;
    t.line.geometry.attributes.position.needsUpdate = true;
    t.line.visible = true;
  }

  function spawnMuzzleFlash(pos) {
    flashLight.position.copy(pos);
    flashLight.intensity = 4.5;
    flashTimer = 0.045;
  }

  function spawnWallSparks(pos, normal = null) {
    const count = 7;
    let spawned = 0;
    const nx = normal ? normal.x * 3.5 : 0;
    const ny = normal ? normal.y * 3.5 : 1.5;
    const nz = normal ? normal.z * 3.5 : 0;

    for (let i = 0; i < MAX_SPARKS && spawned < count; i++) {
      const sp = sparkPool[i];
      if (!sp.active) {
        sp.active = true;
        sp.mesh.position.copy(pos);
        sp.mesh.scale.set(1, 1, 1);
        sp.mesh.visible = true;
        sp.vx = (Math.random() - 0.5) * 4.5 + nx;
        sp.vy = Math.random() * 4.0 + ny;
        sp.vz = (Math.random() - 0.5) * 4.5 + nz;
        sp.life = 0.28;
        sp.maxLife = 0.28;
        spawned += 1;
      }
    }
  }

  function spawnBloodlessHit(pos) {
    const count = 8;
    let spawned = 0;
    for (let i = 0; i < MAX_HITS && spawned < count; i++) {
      const h = hitPool[i];
      if (!h.active) {
        h.active = true;
        h.mesh.position.copy(pos);
        h.mesh.scale.set(1, 1, 1);
        h.mesh.visible = true;
        h.vx = (Math.random() - 0.5) * 5.2;
        h.vy = (Math.random() - 0.5) * 5.2 + 1.6;
        h.vz = (Math.random() - 0.5) * 5.2;
        h.life = 0.35;
        h.maxLife = 0.35;
        spawned += 1;
      }
    }
  }

  function spawnFootstepDust(pos) {
    const count = 3;
    let spawned = 0;
    for (let i = 0; i < MAX_DUST && spawned < count; i++) {
      const d = dustPool[i];
      if (!d.active) {
        d.active = true;
        d.mesh.position.set(pos.x + (Math.random() - 0.5) * 0.4, pos.y + 0.05, pos.z + (Math.random() - 0.5) * 0.4);
        d.mesh.scale.set(1, 1, 1);
        d.mesh.material.opacity = 0.6;
        d.mesh.visible = true;
        d.vx = (Math.random() - 0.5) * 0.6;
        d.vy = 0.35 + Math.random() * 0.3;
        d.vz = (Math.random() - 0.5) * 0.6;
        d.life = 0.4;
        d.maxLife = 0.4;
        spawned += 1;
      }
    }
  }

  function spawnSmokeGrenade(pos) {
    let s = smokePool.find((item) => !item.active);
    if (!s) s = smokePool[0];
    s.active = true;
    s.posX = pos.x; s.posY = pos.y; s.posZ = pos.z;
    s.group.position.copy(pos);
    s.group.visible = true;
    s.life = 15.0; s.maxLife = 15.0;
    return s;
  }

  function isPointInSmoke(point) {
    for (const sm of smokePool) {
      if (!sm.active) continue;
      const dx = sm.posX - point.x;
      const dz = sm.posZ - point.z;
      if (Math.hypot(dx, dz) <= sm.radius) return true;
    }
    return false;
  }

  function isRayBlockedBySmoke(from, to) {
    for (const sm of smokePool) {
      if (!sm.active) continue;
      const dx = to.x - from.x;
      const dz = to.z - from.z;
      const len = Math.hypot(dx, dz);
      if (len < 0.001) continue;
      const ux = dx / len;
      const uz = dz / len;
      const wx = sm.posX - from.x;
      const wz = sm.posZ - from.z;
      const proj = wx * ux + wz * uz;
      if (proj < 0 || proj > len) continue;
      const perpSq = (wx * wx + wz * wz) - (proj * proj);
      if (perpSq <= sm.radius * sm.radius) return true;
    }
    return false;
  }

  function activateBeacon(pos) {
    beaconCyl.position.set(pos.x, pos.y + 2.5, pos.z);
    beaconCyl.visible = true;
    beaconRing.position.set(pos.x, pos.y + 0.05, pos.z);
    beaconRing.visible = true;
  }

  function deactivateBeacon() {
    beaconCyl.visible = false;
    beaconRing.visible = false;
  }

  function spawnExplosion(pos) {
    blastMesh.position.copy(pos);
    blastMesh.scale.set(1, 1, 1);
    blastMesh.visible = true;
    blastActive = true;
    blastLife = blastMaxLife;

    flashLight.position.copy(pos);
    flashLight.intensity = 8.5;
    flashTimer = 0.18;

    const count = 16;
    let spawned = 0;
    for (let i = 0; i < MAX_SPARKS && spawned < count; i++) {
      const sp = sparkPool[i];
      if (!sp.active) {
        sp.active = true;
        sp.mesh.position.copy(pos);
        sp.mesh.scale.set(1.4, 1.4, 1.4);
        sp.mesh.visible = true;
        sp.vx = (Math.random() - 0.5) * 16.0;
        sp.vy = Math.random() * 9.0 + 3.0;
        sp.vz = (Math.random() - 0.5) * 16.0;
        sp.life = 0.65;
        sp.maxLife = 0.65;
        spawned += 1;
      }
    }
  }

  function step(dt) {
    // 1. Tracers
    for (let i = 0; i < MAX_TRACERS; i++) {
      const t = tracerPool[i];
      if (!t.active) continue;
      t.progress += t.speed * dt;
      const headDist = Math.min(t.totalDist, t.progress);
      const tailDist = Math.max(0, t.progress - t.length);

      const arr = t.posArr;
      arr[0] = t.fromX + t.dirX * tailDist;
      arr[1] = t.fromY + t.dirY * tailDist;
      arr[2] = t.fromZ + t.dirZ * tailDist;
      arr[3] = t.fromX + t.dirX * headDist;
      arr[4] = t.fromY + t.dirY * headDist;
      arr[5] = t.fromZ + t.dirZ * headDist;
      t.line.geometry.attributes.position.needsUpdate = true;

      if (tailDist >= t.totalDist) {
        t.active = false;
        t.line.visible = false;
      }
    }

    if (flashTimer > 0) {
      flashTimer -= dt;
      if (flashTimer <= 0) flashLight.intensity = 0;
    }

    // Active Smokes
    for (let i = 0; i < MAX_SMOKES; i++) {
      const sm = smokePool[i];
      if (!sm.active) continue;
      sm.life -= dt;
      sm.group.rotation.y += 0.04 * dt;
      if (sm.life <= 0) {
        sm.active = false;
        sm.group.visible = false;
      }
    }

    // Sparks
    for (let i = 0; i < MAX_SPARKS; i++) {
      const sp = sparkPool[i];
      if (!sp.active) continue;
      sp.life -= dt;
      if (sp.life <= 0) {
        sp.active = false;
        sp.mesh.visible = false;
        continue;
      }
      sp.mesh.position.x += sp.vx * dt;
      sp.mesh.position.y += sp.vy * dt;
      sp.mesh.position.z += sp.vz * dt;
      sp.vy -= 14.0 * dt;
      sp.mesh.scale.multiplyScalar(0.96);
    }

    // Hits
    for (let i = 0; i < MAX_HITS; i++) {
      const h = hitPool[i];
      if (!h.active) continue;
      h.life -= dt;
      if (h.life <= 0) {
        h.active = false;
        h.mesh.visible = false;
        continue;
      }
      h.mesh.position.x += h.vx * dt;
      h.mesh.position.y += h.vy * dt;
      h.mesh.position.z += h.vz * dt;
      h.mesh.scale.multiplyScalar(0.95);
    }

    // Dust
    for (let i = 0; i < MAX_DUST; i++) {
      const d = dustPool[i];
      if (!d.active) continue;
      d.life -= dt;
      if (d.life <= 0) {
        d.active = false;
        d.mesh.visible = false;
        continue;
      }
      d.mesh.position.x += d.vx * dt;
      d.mesh.position.y += d.vy * dt;
      d.mesh.position.z += d.vz * dt;
      d.mesh.scale.multiplyScalar(1 + 1.1 * dt);
      d.mesh.material.opacity = (d.life / d.maxLife) * 0.65;
    }

    if (blastActive) {
      blastLife -= dt;
      if (blastLife <= 0) {
        blastActive = false;
        blastMesh.visible = false;
      } else {
        blastMesh.scale.multiplyScalar(1 + 3.2 * dt);
        matBlast.opacity = (blastLife / blastMaxLife) * 0.85;
      }
    }

    if (beaconCyl.visible) {
      beaconCyl.rotation.y += 0.8 * dt;
      beaconRing.rotation.z += 0.4 * dt;
    }
  }

  function clear() {
    tracerPool.forEach((t) => { t.active = false; t.line.visible = false; });
    sparkPool.forEach((s) => { s.active = false; s.mesh.visible = false; });
    hitPool.forEach((h) => { h.active = false; h.mesh.visible = false; });
    dustPool.forEach((d) => { d.active = false; d.mesh.visible = false; });
    smokePool.forEach((sm) => { sm.active = false; sm.group.visible = false; });
    blastActive = false;
    blastMesh.visible = false;
    deactivateBeacon();
    flashLight.intensity = 0;
  }

  return {
    spawnTracer,
    spawnMuzzleFlash,
    spawnWallSparks,
    spawnBloodlessHit,
    spawnFootstepDust,
    spawnSmokeGrenade,
    isPointInSmoke,
    isRayBlockedBySmoke,
    activateBeacon,
    deactivateBeacon,
    spawnExplosion,
    step,
    clear,
  };
}

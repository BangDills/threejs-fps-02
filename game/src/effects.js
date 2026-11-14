// Visual effects: bullet tracers, muzzle flash, impact sparks, footstep dust, smoke volume, and beacon holograms.
import * as THREE from 'three';
import { PALETTE } from './palette.js';

export function createEffectSystem(scene) {
  const tracers = [];
  const particles = [];
  const flashes = [];
  const beaconMeshes = [];
  const activeSmokes = [];

  const flashLight = new THREE.PointLight(PALETTE.flash, 0, 10);
  scene.add(flashLight);

  // Reusable materials
  const matTracerPlayer = new THREE.LineBasicMaterial({ color: PALETTE.tracer, linewidth: 2 });
  const matTracerEnemy = new THREE.LineBasicMaterial({ color: PALETTE.tracerEnemy, linewidth: 2 });
  const matSpark = new THREE.MeshBasicMaterial({ color: PALETTE.spark });
  const matDigitalHit = new THREE.MeshBasicMaterial({ color: PALETTE.aeroSec });
  const matDust = new THREE.MeshBasicMaterial({ color: 0x64748b, transparent: true, opacity: 0.6 });
  const matSmoke = new THREE.MeshStandardMaterial({
    color: PALETTE.smoke,
    roughness: 0.95,
    metalness: 0.05,
    transparent: true,
    opacity: 0.85,
  });
  const matBeaconAura = new THREE.MeshBasicMaterial({
    color: PALETTE.siteAlphaGlow,
    transparent: true,
    opacity: 0.65,
    wireframe: true,
  });

  function spawnTracer(from, to, isEnemy = false) {
    const geo = new THREE.BufferGeometry().setFromPoints([from.clone(), from.clone()]);
    const line = new THREE.Line(geo, isEnemy ? matTracerEnemy : matTracerPlayer);
    scene.add(line);

    tracers.push({
      line,
      from: from.clone(),
      to: to.clone(),
      progress: 0,
      speed: 190.0,
      length: 5.5,
      totalDist: from.distanceTo(to),
    });
  }

  function spawnMuzzleFlash(pos) {
    flashLight.position.copy(pos);
    flashLight.intensity = 4.0;
    flashes.push({ timer: 0.04 });
  }

  function spawnWallSparks(pos, normal) {
    const count = 7;
    for (let i = 0; i < count; i++) {
      const geo = new THREE.BoxGeometry(0.04, 0.04, 0.04);
      const mesh = new THREE.Mesh(geo, matSpark);
      mesh.position.copy(pos);
      scene.add(mesh);

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 4.5 + (normal ? normal.x * 3.5 : 0),
        Math.random() * 4.5 + (normal ? normal.y * 3.5 : 2),
        (Math.random() - 0.5) * 4.5 + (normal ? normal.z * 3.5 : 0)
      );

      particles.push({ mesh, vel, life: 0.28, maxLife: 0.28 });
    }
  }

  function spawnBloodlessHit(pos) {
    const count = 8;
    for (let i = 0; i < count; i++) {
      const geo = new THREE.TetrahedronGeometry(0.06);
      const mesh = new THREE.Mesh(geo, matDigitalHit);
      mesh.position.copy(pos);
      scene.add(mesh);

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 5,
        (Math.random() - 0.5) * 5 + 1.5,
        (Math.random() - 0.5) * 5
      );

      particles.push({ mesh, vel, life: 0.35, maxLife: 0.35 });
    }
  }

  function spawnFootstepDust(pos) {
    for (let i = 0; i < 3; i++) {
      const geo = new THREE.SphereGeometry(0.12 + Math.random() * 0.08, 6, 6);
      const mesh = new THREE.Mesh(geo, matDust);
      mesh.position.set(
        pos.x + (Math.random() - 0.5) * 0.4,
        pos.y + 0.05,
        pos.z + (Math.random() - 0.5) * 0.4
      );
      scene.add(mesh);
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 0.6,
        0.3 + Math.random() * 0.3,
        (Math.random() - 0.5) * 0.6
      );
      particles.push({ mesh, vel, life: 0.4, maxLife: 0.4, isDust: true });
    }
  }

  function spawnSmokeGrenade(pos) {
    const sphereCount = 9;
    const smokeGroup = new THREE.Group();
    smokeGroup.position.copy(pos);
    scene.add(smokeGroup);

    for (let i = 0; i < sphereCount; i++) {
      const geo = new THREE.SphereGeometry(1.8 + Math.random() * 0.8, 8, 8);
      const mesh = new THREE.Mesh(geo, matSmoke);
      mesh.position.set(
        (Math.random() - 0.5) * 3.2,
        0.8 + Math.random() * 2.2,
        (Math.random() - 0.5) * 3.2
      );
      smokeGroup.add(mesh);
    }

    const smokeObj = {
      group: smokeGroup,
      pos: pos.clone(),
      radius: 5.2,
      life: 15.0,
      maxLife: 15.0,
    };
    activeSmokes.push(smokeObj);
    return smokeObj;
  }

  function isPointInSmoke(point) {
    for (const sm of activeSmokes) {
      if (sm.group.position.distanceTo(point) <= sm.radius) return true;
    }
    return false;
  }

  function isRayBlockedBySmoke(from, to) {
    for (const sm of activeSmokes) {
      // Line to point distance
      const lineDir = new THREE.Vector3().subVectors(to, from);
      const lineLen = lineDir.length();
      if (lineLen < 0.001) continue;
      lineDir.normalize();

      const toSmoke = new THREE.Vector3().subVectors(sm.pos, from);
      const proj = toSmoke.dot(lineDir);
      if (proj < 0 || proj > lineLen) continue;

      const closestPoint = from.clone().addScaledVector(lineDir, proj);
      if (closestPoint.distanceTo(sm.pos) <= sm.radius) {
        return true;
      }
    }
    return false;
  }

  function activateBeacon(pos) {
    // Holographic pillar emitter
    const cylGeo = new THREE.CylinderGeometry(0.8, 1.2, 5.0, 16, 1, true);
    const beaconMesh = new THREE.Mesh(cylGeo, matBeaconAura);
    beaconMesh.position.set(pos.x, pos.y + 2.5, pos.z);
    scene.add(beaconMesh);
    beaconMeshes.push(beaconMesh);

    // Ground wave ring
    const ringGeo = new THREE.RingGeometry(0.8, 3.8, 24);
    const ringMesh = new THREE.Mesh(ringGeo, matBeaconAura);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.set(pos.x, pos.y + 0.05, pos.z);
    scene.add(ringMesh);
    beaconMeshes.push(ringMesh);
  }

  function spawnExplosion(pos) {
    // Expanding blast fireball
    const geo = new THREE.SphereGeometry(5.5, 14, 14);
    const mat = new THREE.MeshBasicMaterial({ color: PALETTE.blastOrange, transparent: true, opacity: 0.9 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    scene.add(mesh);
    particles.push({ mesh, vel: new THREE.Vector3(), life: 0.55, maxLife: 0.55, isBlast: true });

    // Flash light
    flashLight.position.copy(pos);
    flashLight.intensity = 8.0;
    flashes.push({ timer: 0.18 });

    // Shrapnel sparks
    for (let i = 0; i < 18; i++) {
      const spGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
      const spMesh = new THREE.Mesh(spGeo, matSpark);
      spMesh.position.copy(pos);
      scene.add(spMesh);
      const spVel = new THREE.Vector3(
        (Math.random() - 0.5) * 16,
        Math.random() * 10 + 2,
        (Math.random() - 0.5) * 16
      );
      particles.push({ mesh: spMesh, vel: spVel, life: 0.65, maxLife: 0.65 });
    }
  }

  function step(dt) {
    // Tracers
    for (let i = tracers.length - 1; i >= 0; i--) {
      const t = tracers[i];
      t.progress += (t.speed * dt);
      const headDist = Math.min(t.totalDist, t.progress);
      const tailDist = Math.max(0, t.progress - t.length);

      const dir = new THREE.Vector3().subVectors(t.to, t.from).normalize();
      const head = t.from.clone().addScaledVector(dir, headDist);
      const tail = t.from.clone().addScaledVector(dir, tailDist);

      const positions = t.line.geometry.attributes.position.array;
      positions[0] = tail.x;
      positions[1] = tail.y;
      positions[2] = tail.z;
      positions[3] = head.x;
      positions[4] = head.y;
      positions[5] = head.z;
      t.line.geometry.attributes.position.needsUpdate = true;

      if (tailDist >= t.totalDist) {
        scene.remove(t.line);
        t.line.geometry.dispose();
        tracers.splice(i, 1);
      }
    }

    // Flashes
    for (let i = flashes.length - 1; i >= 0; i--) {
      flashes[i].timer -= dt;
      if (flashes[i].timer <= 0) {
        flashLight.intensity = 0;
        flashes.splice(i, 1);
      }
    }

    // Active Smokes
    for (let i = activeSmokes.length - 1; i >= 0; i--) {
      const sm = activeSmokes[i];
      sm.life -= dt;
      sm.group.rotation.y += 0.04 * dt;
      if (sm.life <= 0) {
        scene.remove(sm.group);
        activeSmokes.splice(i, 1);
      }
    }

    // Particles & Sparks
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        particles.splice(i, 1);
        continue;
      }

      if (p.isBlast) {
        p.mesh.scale.multiplyScalar(1 + 3.5 * dt);
        p.mesh.material.opacity = (p.life / p.maxLife);
      } else if (p.isDust) {
        p.mesh.position.addScaledVector(p.vel, dt);
        p.mesh.scale.multiplyScalar(1 + 1.2 * dt);
        p.mesh.material.opacity = (p.life / p.maxLife) * 0.6;
      } else {
        p.mesh.position.addScaledVector(p.vel, dt);
        p.vel.y -= 14.0 * dt;
        p.mesh.scale.multiplyScalar(0.96);
      }
    }

    // Beacon pulsing animation
    for (const b of beaconMeshes) {
      b.rotation.y += 0.8 * dt;
    }
  }

  function clear() {
    tracers.forEach((t) => scene.remove(t.line));
    particles.forEach((p) => scene.remove(p.mesh));
    beaconMeshes.forEach((b) => scene.remove(b));
    activeSmokes.forEach((s) => scene.remove(s.group));
    tracers.length = 0;
    particles.length = 0;
    beaconMeshes.length = 0;
    activeSmokes.length = 0;
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
    spawnExplosion,
    step,
    clear,
  };
}

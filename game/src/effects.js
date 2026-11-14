// Visual effects: bullet tracers, muzzle flash, impact sparks, bloodless shield hits, and beacon aura.
import * as THREE from 'three';
import { PALETTE } from './palette.js';

export function createEffectSystem(scene) {
  const tracers = [];
  const particles = [];
  const flashes = [];
  const beaconMeshes = [];

  // Muzzle flash light
  const flashLight = new THREE.PointLight(PALETTE.flash, 0, 8);
  scene.add(flashLight);

  // Reusable materials
  const matTracer = new THREE.LineBasicMaterial({ color: PALETTE.tracer, linewidth: 2 });
  const matSpark = new THREE.MeshBasicMaterial({ color: PALETTE.spark });
  const matDigitalHit = new THREE.MeshBasicMaterial({ color: PALETTE.aeroSec });
  const matSmoke = new THREE.MeshStandardMaterial({
    color: PALETTE.smoke,
    roughness: 0.9,
    transparent: true,
    opacity: 0.8,
  });
  const matBeaconAura = new THREE.MeshBasicMaterial({
    color: PALETTE.siteAlphaGlow,
    transparent: true,
    opacity: 0.6,
    wireframe: true,
  });

  function spawnTracer(from, to) {
    const geo = new THREE.BufferGeometry().setFromPoints([from.clone(), from.clone()]);
    const line = new THREE.Line(geo, matTracer);
    scene.add(line);

    tracers.push({
      line,
      from: from.clone(),
      to: to.clone(),
      progress: 0,
      speed: 180.0, // High velocity
      length: 5.0,
      totalDist: from.distanceTo(to),
    });
  }

  function spawnMuzzleFlash(pos) {
    flashLight.position.copy(pos);
    flashLight.intensity = 3.5;
    flashes.push({ timer: 0.04 });
  }

  function spawnWallSparks(pos, normal) {
    const count = 6;
    for (let i = 0; i < count; i++) {
      const geo = new THREE.BoxGeometry(0.04, 0.04, 0.04);
      const mesh = new THREE.Mesh(geo, matSpark);
      mesh.position.copy(pos);
      scene.add(mesh);

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 4 + (normal ? normal.x * 3 : 0),
        Math.random() * 4 + (normal ? normal.y * 3 : 2),
        (Math.random() - 0.5) * 4 + (normal ? normal.z * 3 : 0)
      );

      particles.push({ mesh, vel, life: 0.25, maxLife: 0.25 });
    }
  }

  function spawnBloodlessHit(pos) {
    const count = 7;
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

  function spawnSmokeGrenade(pos) {
    const sphereCount = 8;
    for (let i = 0; i < sphereCount; i++) {
      const geo = new THREE.SphereGeometry(1.6 + Math.random() * 0.8, 8, 8);
      const mesh = new THREE.Mesh(geo, matSmoke);
      mesh.position.set(
        pos.x + (Math.random() - 0.5) * 2.5,
        pos.y + 0.8 + Math.random() * 1.8,
        pos.z + (Math.random() - 0.5) * 2.5
      );
      scene.add(mesh);
      particles.push({ mesh, vel: new THREE.Vector3(0, 0.1, 0), life: 14.0, maxLife: 14.0, isSmoke: true });
    }
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
    const geo = new THREE.SphereGeometry(6.0, 16, 16);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffaa22, transparent: true, opacity: 0.9 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    scene.add(mesh);
    particles.push({ mesh, vel: new THREE.Vector3(), life: 0.6, maxLife: 0.6, isBlast: true });
  }

  function step(dt) {
    // Update tracers
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

    // Update muzzle flashes
    for (let i = flashes.length - 1; i >= 0; i--) {
      flashes[i].timer -= dt;
      if (flashes[i].timer <= 0) {
        flashLight.intensity = 0;
        flashes.splice(i, 1);
      }
    }

    // Update sparks and particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        particles.splice(i, 1);
        continue;
      }

      if (p.isSmoke) {
        p.mesh.rotation.y += 0.05 * dt;
        p.mesh.scale.multiplyScalar(1 + 0.03 * dt);
        p.mesh.material.opacity = (p.life / p.maxLife) * 0.75;
      } else if (p.isBlast) {
        p.mesh.scale.multiplyScalar(1 + 4.0 * dt);
        p.mesh.material.opacity = (p.life / p.maxLife);
      } else {
        p.mesh.position.addScaledVector(p.vel, dt);
        p.vel.y -= 14.0 * dt; // gravity
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
    tracers.length = 0;
    particles.length = 0;
    beaconMeshes.length = 0;
    flashLight.intensity = 0;
  }

  return {
    spawnTracer,
    spawnMuzzleFlash,
    spawnWallSparks,
    spawnBloodlessHit,
    spawnSmokeGrenade,
    activateBeacon,
    spawnExplosion,
    step,
    clear,
  };
}

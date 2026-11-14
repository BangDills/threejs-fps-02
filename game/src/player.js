// First-person player physics, tactical movement, collision, ADS movement speed, and grenades.
import * as THREE from 'three';
import { soundEngine } from './audio.js';

const STAND_EYE = 1.65;
const CROUCH_EYE = 0.95;
const STAND_HEIGHT = 1.8;
const CROUCH_HEIGHT = 1.1;
const PLAYER_RADIUS = 0.42;

export function createPlayer(colliders) {
  const state = {
    position: new THREE.Vector3(0, 0, -28),
    velocity: new THREE.Vector3(),
    yaw: 0,
    pitch: 0,
    recoilPitch: 0,
    recoilYaw: 0,
    eye: STAND_EYE,
    height: STAND_HEIGHT,
    crouching: false,
    aiming: false,
    grounded: true,
    hp: 100,
    shield: 100,
    dead: false,
    stepTimer: 0,
    lastHitAngle: null,
    grenades: [],
  };

  const moveDir = new THREE.Vector3();
  const wishVel = new THREE.Vector3();

  function look(dx, dy) {
    if (state.dead) return;
    const sens = state.aiming ? 0.0012 : 0.0022; // Slower sensitivity when aiming
    state.yaw -= dx * sens;
    state.pitch = Math.max(-Math.PI * 0.48, Math.min(Math.PI * 0.48, state.pitch - dy * sens));
  }

  function recoil(pitchKick, yawKick) {
    state.recoilPitch += pitchKick;
    state.recoilYaw += yawKick;
  }

  function groundSpeed() {
    return Math.hypot(state.velocity.x, state.velocity.z);
  }

  function damage(amount, attackerPos = null, isHead = false) {
    if (state.dead) return false;

    // Calculate relative damage angle for HUD indicator
    if (attackerPos) {
      const dx = attackerPos.x - state.position.x;
      const dz = attackerPos.z - state.position.z;
      const hitAngle = Math.atan2(dx, dz) - state.yaw;
      state.lastHitAngle = hitAngle;
    }

    let rem = amount;
    if (state.shield > 0 && !isHead) {
      const absorbed = Math.min(state.shield, rem * 0.65);
      state.shield -= absorbed;
      rem -= absorbed;
    }

    state.hp = Math.max(0, state.hp - rem);
    if (state.hp <= 0) {
      state.dead = true;
      return true; // Fatal
    }
    return false;
  }

  function respawn(spawnPos) {
    state.position.copy(spawnPos);
    state.velocity.set(0, 0, 0);
    state.hp = 100;
    state.shield = 100;
    state.dead = false;
    state.recoilPitch = 0;
    state.recoilYaw = 0;
    state.lastHitAngle = null;
    state.grenades.length = 0;
  }

  function throwGrenade(type, camera) {
    const fwd = new THREE.Vector3();
    camera.getWorldDirection(fwd);

    const startPos = state.position.clone();
    startPos.y += state.eye;
    startPos.addScaledVector(fwd, 0.4);

    const throwVel = fwd.clone().multiplyScalar(18.0);
    throwVel.y += 4.5; // Upward arc

    const grenade = {
      type, // 'he' or 'smoke'
      pos: startPos,
      vel: throwVel,
      timer: type === 'he' ? 1.8 : 1.4,
      bounces: 0,
    };
    state.grenades.push(grenade);
    return grenade;
  }

  function resolveCollisions(nextPos) {
    const pMinY = nextPos.y;
    const pMaxY = nextPos.y + state.height;
    const r = PLAYER_RADIUS;

    for (const box of colliders) {
      if (pMaxY <= box.min.y || pMinY >= box.max.y) continue;

      const cx = Math.max(box.min.x, Math.min(box.max.x, nextPos.x));
      const cz = Math.max(box.min.z, Math.min(box.max.z, nextPos.z));

      const dx = nextPos.x - cx;
      const dz = nextPos.z - cz;
      const distSq = dx * dx + dz * dz;

      if (distSq < r * r) {
        const dist = Math.sqrt(distSq) || 0.0001;
        const overlap = r - dist;
        const nx = dx / dist;
        const nz = dz / dist;

        nextPos.x += nx * overlap;
        nextPos.z += nz * overlap;

        const normalDot = state.velocity.x * nx + state.velocity.z * nz;
        if (normalDot < 0) {
          state.velocity.x -= normalDot * nx;
          state.velocity.z -= normalDot * nz;
        }
      }
    }
  }

  function step(dt, keys, wantAds = false, effects = null) {
    if (state.dead) return;

    state.aiming = wantAds;

    // Crouch handling with smooth eye height lerp
    const wantCrouch = keys.has('ControlLeft') || keys.has('ControlRight') || keys.has('KeyC');
    state.crouching = wantCrouch;
    const targetEye = wantCrouch ? CROUCH_EYE : STAND_EYE;
    const targetHeight = wantCrouch ? CROUCH_HEIGHT : STAND_HEIGHT;
    state.eye += (targetEye - state.eye) * Math.min(1, dt * 14);
    state.height += (targetHeight - state.height) * Math.min(1, dt * 14);

    // Direction vector from input keys
    let forward = 0;
    let right = 0;
    if (keys.has('KeyW')) forward += 1;
    if (keys.has('KeyS')) forward -= 1;
    if (keys.has('KeyD')) right += 1;
    if (keys.has('KeyA')) right -= 1;

    const len = Math.hypot(forward, right);
    if (len > 0) {
      forward /= len;
      right /= len;
    }

    const sin = Math.sin(state.yaw);
    const cos = Math.cos(state.yaw);
    moveDir.set(
      right * cos - forward * sin,
      0,
      forward * -cos - right * sin
    );

    // Movement speed: sprinting 5.6 m/s, crouching 2.6 m/s, ADS aim-walk 3.1 m/s
    let maxSpeed = 5.6;
    if (wantCrouch) {
      maxSpeed = 2.6;
    } else if (state.aiming) {
      maxSpeed = 3.1;
    }

    wishVel.copy(moveDir).multiplyScalar(maxSpeed);

    // Acceleration and ground friction
    if (state.grounded) {
      const currentSpeed = Math.hypot(state.velocity.x, state.velocity.z);
      if (currentSpeed > 0) {
        const drop = currentSpeed * 9.0 * dt;
        const newSpeed = Math.max(0, currentSpeed - drop);
        state.velocity.x = (state.velocity.x / currentSpeed) * newSpeed;
        state.velocity.z = (state.velocity.z / currentSpeed) * newSpeed;
      }
      const accel = 38.0;
      state.velocity.x += (wishVel.x - state.velocity.x) * Math.min(1, accel * dt);
      state.velocity.z += (wishVel.z - state.velocity.z) * Math.min(1, accel * dt);

      // Jump
      if (keys.has('Space')) {
        state.velocity.y = 7.0;
        state.grounded = false;
        if (effects) effects.spawnFootstepDust(state.position);
      }
    } else {
      const airAccel = 8.0;
      state.velocity.x += wishVel.x * airAccel * dt;
      state.velocity.z += wishVel.z * airAccel * dt;
    }

    // Gravity
    state.velocity.y -= 22.0 * dt;

    const nextPos = state.position.clone();
    nextPos.x += state.velocity.x * dt;
    nextPos.z += state.velocity.z * dt;
    nextPos.y += state.velocity.y * dt;

    // Floor and platform collision
    let floorY = 0;
    for (const box of colliders) {
      if (
        nextPos.x >= box.min.x - PLAYER_RADIUS &&
        nextPos.x <= box.max.x + PLAYER_RADIUS &&
        nextPos.z >= box.min.z - PLAYER_RADIUS &&
        nextPos.z <= box.max.z + PLAYER_RADIUS
      ) {
        if (state.position.y >= box.max.y - 0.25 && box.max.y > floorY) {
          floorY = box.max.y;
        }
      }
    }

    if (nextPos.y <= floorY) {
      if (!state.grounded && state.velocity.y < -4.0 && effects) {
        effects.spawnFootstepDust(nextPos);
      }
      nextPos.y = floorY;
      state.velocity.y = 0;
      state.grounded = true;
    } else {
      state.grounded = false;
    }

    resolveCollisions(nextPos);
    state.position.copy(nextPos);

    // Footstep audio: crouching is silent
    if (state.grounded && groundSpeed() > 1.2 && !wantCrouch) {
      state.stepTimer += dt;
      const stepInterval = state.aiming ? 0.48 : 0.35;
      if (state.stepTimer >= stepInterval) {
        state.stepTimer = 0;
        soundEngine.playStep();
        if (effects) effects.spawnFootstepDust(state.position);
      }
    } else {
      state.stepTimer = 0;
    }

    // Recoil recovery: standing still recovers faster!
    const isStationary = groundSpeed() < 0.2;
    const recoverRate = (isStationary ? 24.0 : 16.0) * dt;
    state.recoilPitch = Math.max(0, state.recoilPitch - state.recoilPitch * recoverRate);
    state.recoilYaw += (0 - state.recoilYaw) * recoverRate;
  }

  function stepGrenades(dt, effects, onGrenadeDetonate) {
    for (let i = state.grenades.length - 1; i >= 0; i--) {
      const g = state.grenades[i];
      g.timer -= dt;

      // Gravity & motion
      g.vel.y -= 18.0 * dt;
      g.pos.x += g.vel.x * dt;
      g.pos.y += g.vel.y * dt;
      g.pos.z += g.vel.z * dt;

      // Bounce against floor
      if (g.pos.y <= 0.15) {
        g.pos.y = 0.15;
        g.vel.y = -g.vel.y * 0.45;
        g.vel.x *= 0.65;
        g.vel.z *= 0.65;
        g.bounces += 1;
        if (g.bounces < 3) soundEngine.playGrenadeBounce();
      }

      // Bounce against box colliders
      for (const box of colliders) {
        if (
          g.pos.x >= box.min.x && g.pos.x <= box.max.x &&
          g.pos.z >= box.min.z && g.pos.z <= box.max.z &&
          g.pos.y >= box.min.y && g.pos.y <= box.max.y
        ) {
          g.vel.x = -g.vel.x * 0.5;
          g.vel.z = -g.vel.z * 0.5;
          soundEngine.playGrenadeBounce();
          break;
        }
      }

      // Detonation
      if (g.timer <= 0) {
        state.grenades.splice(i, 1);
        if (g.type === 'he') {
          soundEngine.playExplosion();
          if (effects) effects.spawnExplosion(g.pos);
          if (onGrenadeDetonate) onGrenadeDetonate('he', g.pos);
        } else if (g.type === 'smoke') {
          soundEngine.playSmokeHiss();
          if (effects) effects.spawnSmokeGrenade(g.pos);
          if (onGrenadeDetonate) onGrenadeDetonate('smoke', g.pos);
        }
      }
    }
  }

  return {
    state,
    look,
    recoil,
    groundSpeed,
    damage,
    respawn,
    throwGrenade,
    step,
    stepGrenades,
  };
}

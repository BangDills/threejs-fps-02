// First-person player physics, movement, crouching, collision, and camera tracking.
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
    grounded: true,
    hp: 100,
    shield: 100,
    dead: false,
    stepTimer: 0,
  };

  const moveDir = new THREE.Vector3();
  const wishVel = new THREE.Vector3();

  function look(dx, dy) {
    if (state.dead) return;
    const SENS = 0.0022;
    state.yaw -= dx * SENS;
    state.pitch = Math.max(-Math.PI * 0.48, Math.min(Math.PI * 0.48, state.pitch - dy * SENS));
  }

  function recoil(pitchKick, yawKick) {
    state.recoilPitch += pitchKick;
    state.recoilYaw += yawKick;
  }

  function groundSpeed() {
    return Math.hypot(state.velocity.x, state.velocity.z);
  }

  function damage(amount) {
    if (state.dead) return false;
    let rem = amount;
    if (state.shield > 0) {
      const absorbed = Math.min(state.shield, rem * 0.6);
      state.shield -= absorbed;
      rem -= absorbed;
    }
    state.hp = Math.max(0, state.hp - rem);
    if (state.hp <= 0) {
      state.dead = true;
      return true;
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
  }

  function resolveCollisions(nextPos) {
    const pMinY = nextPos.y;
    const pMaxY = nextPos.y + state.height;
    const r = PLAYER_RADIUS;

    for (const box of colliders) {
      // Check vertical overlap
      if (pMaxY <= box.min.y || pMinY >= box.max.y) continue;

      // Find closest point on box in XZ plane
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

        // Push away from obstacle
        nextPos.x += nx * overlap;
        nextPos.z += nz * overlap;

        // Zero out velocity along normal
        const normalDot = state.velocity.x * nx + state.velocity.z * nz;
        if (normalDot < 0) {
          state.velocity.x -= normalDot * nx;
          state.velocity.z -= normalDot * nz;
        }
      }
    }
  }

  function step(dt, keys) {
    if (state.dead) return;

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

    const maxSpeed = wantCrouch ? 2.6 : 5.6;
    wishVel.copy(moveDir).multiplyScalar(maxSpeed);

    // Acceleration and friction
    if (state.grounded) {
      const currentSpeed = Math.hypot(state.velocity.x, state.velocity.z);
      if (currentSpeed > 0) {
        const drop = currentSpeed * 9.0 * dt;
        const newSpeed = Math.max(0, currentSpeed - drop);
        state.velocity.x = (state.velocity.x / currentSpeed) * newSpeed;
        state.velocity.z = (state.velocity.z / currentSpeed) * newSpeed;
      }
      // Accelerate toward wish velocity
      const accel = 38.0;
      state.velocity.x += (wishVel.x - state.velocity.x) * Math.min(1, accel * dt);
      state.velocity.z += (wishVel.z - state.velocity.z) * Math.min(1, accel * dt);

      // Jump
      if (keys.has('Space')) {
        state.velocity.y = 7.2;
        state.grounded = false;
      }
    } else {
      // Air acceleration
      const airAccel = 8.0;
      state.velocity.x += wishVel.x * airAccel * dt;
      state.velocity.z += wishVel.z * airAccel * dt;
    }

    // Gravity
    state.velocity.y -= 22.0 * dt;

    // Projected position
    const nextPos = state.position.clone();
    nextPos.x += state.velocity.x * dt;
    nextPos.z += state.velocity.z * dt;
    nextPos.y += state.velocity.y * dt;

    // Check floor collision
    let floorY = 0;
    // Check if on a box (like catwalk at Y=2.0)
    for (const box of colliders) {
      if (
        nextPos.x >= box.min.x - PLAYER_RADIUS &&
        nextPos.x <= box.max.x + PLAYER_RADIUS &&
        nextPos.z >= box.min.z - PLAYER_RADIUS &&
        nextPos.z <= box.max.z + PLAYER_RADIUS
      ) {
        if (state.position.y >= box.max.y - 0.2 && box.max.y > floorY) {
          floorY = box.max.y;
        }
      }
    }

    if (nextPos.y <= floorY) {
      nextPos.y = floorY;
      state.velocity.y = 0;
      state.grounded = true;
    } else {
      state.grounded = false;
    }

    // Resolve horizontal obstacle collisions
    resolveCollisions(nextPos);
    state.position.copy(nextPos);

    // Footstep audio
    if (state.grounded && groundSpeed() > 1.2) {
      state.stepTimer += dt;
      const stepInterval = wantCrouch ? 0.55 : 0.36;
      if (state.stepTimer >= stepInterval) {
        state.stepTimer = 0;
        soundEngine.playStep();
      }
    } else {
      state.stepTimer = 0;
    }

    // Smooth recoil recovery
    const recoverRate = 18.0 * dt;
    state.recoilPitch = Math.max(0, state.recoilPitch - state.recoilPitch * recoverRate);
    state.recoilYaw += (0 - state.recoilYaw) * recoverRate;
  }

  return {
    state,
    look,
    recoil,
    groundSpeed,
    damage,
    respawn,
    step,
  };
}

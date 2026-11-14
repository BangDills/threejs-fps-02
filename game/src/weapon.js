// Multi-weapon arsenal, 3D procedural viewmodels, recoil kick, dynamic spread, and reload.
import * as THREE from 'three';
import { soundEngine } from './audio.js';
import { PALETTE } from './palette.js';

export const WEAPON_CONFIGS = {
  viper: {
    id: 'viper',
    name: 'Viper-9 Tactical Sidearm',
    type: 'Sidearm',
    cost: 0,
    magSize: 15,
    reserveMax: 60,
    damage: 28,
    fireRate: 0.14,
    reloadTime: 1.4,
    baseSpread: 0.008,
    moveSpreadMult: 2.2,
    crouchSpreadMult: 0.5,
    recoilPitch: 0.014,
    recoilYaw: 0.006,
    soundType: 'pistol',
    auto: false,
  },
  phalanx: {
    id: 'phalanx',
    name: 'Phalanx-4 Kinetic Carbine',
    type: 'Rifle',
    cost: 2900,
    magSize: 30,
    reserveMax: 90,
    damage: 34,
    fireRate: 0.09,
    reloadTime: 2.1,
    baseSpread: 0.004,
    moveSpreadMult: 3.8,
    crouchSpreadMult: 0.35,
    recoilPitch: 0.022,
    recoilYaw: 0.008,
    soundType: 'rifle',
    auto: true,
  },
  specter: {
    id: 'specter',
    name: 'Specter-9 Pulse SMG',
    type: 'SMG',
    cost: 1600,
    magSize: 35,
    reserveMax: 105,
    damage: 22,
    fireRate: 0.065,
    reloadTime: 1.8,
    baseSpread: 0.012,
    moveSpreadMult: 1.8,
    crouchSpreadMult: 0.6,
    recoilPitch: 0.016,
    recoilYaw: 0.011,
    soundType: 'smg',
    auto: true,
  },
  longbow: {
    id: 'longbow',
    name: 'Longbow-X Rail Sniper',
    type: 'Sniper',
    cost: 4600,
    magSize: 5,
    reserveMax: 20,
    damage: 115,
    fireRate: 1.25,
    reloadTime: 2.8,
    baseSpread: 0.001,
    moveSpreadMult: 7.5,
    crouchSpreadMult: 0.15,
    recoilPitch: 0.065,
    recoilYaw: 0.015,
    soundType: 'sniper',
    auto: false,
  },
};

export function createWeaponSystem(camera) {
  // Container for viewmodels attached to camera
  const weaponMount = new THREE.Group();
  weaponMount.position.set(0.24, -0.22, -0.42);
  camera.add(weaponMount);

  // Procedural viewmodel meshes for each weapon
  const viewmodels = {};

  const matGunMetal = new THREE.MeshStandardMaterial({ color: 0x1c2128, roughness: 0.4, metalness: 0.8 });
  const matGunAccent = new THREE.MeshStandardMaterial({ color: PALETTE.accent, roughness: 0.3, metalness: 0.5 });
  const matGunSteel = new THREE.MeshStandardMaterial({ color: 0x444c56, roughness: 0.3, metalness: 0.9 });

  // 1. Phalanx Carbine Model
  const mCarbine = new THREE.Group();
  // Body receiver
  const bRec = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.46), matGunMetal);
  mCarbine.add(bRec);
  // Barrel
  const bBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.28, 12), matGunSteel);
  bBarrel.rotation.x = Math.PI / 2;
  bBarrel.position.set(0, 0.02, -0.32);
  mCarbine.add(bBarrel);
  // Curved magazine
  const bMag = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.18, 0.09), matGunAccent);
  bMag.position.set(0, -0.11, -0.06);
  bMag.rotation.x = 0.2;
  mCarbine.add(bMag);
  // Red dot holographic sight
  const bSight = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.05, 0.08), matGunMetal);
  bSight.position.set(0, 0.075, -0.04);
  mCarbine.add(bSight);
  mCarbine.visible = true;
  weaponMount.add(mCarbine);
  viewmodels.phalanx = mCarbine;

  // 2. Viper Pistol Model
  const mPistol = new THREE.Group();
  const pSlide = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.06, 0.24), matGunSteel);
  mPistol.add(pSlide);
  const pGrip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.13, 0.06), matGunMetal);
  pGrip.position.set(0, -0.08, 0.05);
  pGrip.rotation.x = -0.25;
  mPistol.add(pGrip);
  mPistol.visible = false;
  weaponMount.add(mPistol);
  viewmodels.viper = mPistol;

  // 3. Specter SMG Model
  const mSmg = new THREE.Group();
  const sBody = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.08, 0.34), matGunMetal);
  mSmg.add(sBody);
  const sMag = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.22, 0.06), matGunSteel);
  sMag.position.set(0, -0.12, 0.02);
  mSmg.add(sMag);
  const sBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.16, 10), matGunSteel);
  sBarrel.rotation.x = Math.PI / 2;
  sBarrel.position.set(0, 0.01, -0.22);
  mSmg.add(sBarrel);
  mSmg.visible = false;
  weaponMount.add(mSmg);
  viewmodels.specter = mSmg;

  // 4. Longbow Rail Sniper Model
  const mSniper = new THREE.Group();
  const snBody = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.11, 0.62), matGunMetal);
  mSniper.add(snBody);
  const snBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.44, 12), matGunSteel);
  snBarrel.rotation.x = Math.PI / 2;
  snBarrel.position.set(0, 0.02, -0.48);
  mSniper.add(snBarrel);
  // Large tactical scope
  const snScope = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.26, 12), matGunAccent);
  snScope.rotation.x = Math.PI / 2;
  snScope.position.set(0, 0.09, -0.08);
  mSniper.add(snScope);
  mSniper.visible = false;
  weaponMount.add(mSniper);
  viewmodels.longbow = mSniper;

  // Current active loadout state
  const state = {
    currentWeaponId: 'phalanx',
    config: WEAPON_CONFIGS.phalanx,
    mag: WEAPON_CONFIGS.phalanx.magSize,
    reserve: WEAPON_CONFIGS.phalanx.reserveMax,
    smokeCount: 1,
    cooldown: 0,
    reloading: false,
    reloadProgress: 0,
    continuousShots: 0,
    swayX: 0,
    swayY: 0,
    kickOffset: 0,
    kickRot: 0,
  };

  function selectWeapon(weaponId) {
    if (!WEAPON_CONFIGS[weaponId]) return;
    state.currentWeaponId = weaponId;
    state.config = WEAPON_CONFIGS[weaponId];
    state.mag = state.config.magSize;
    state.reserve = state.config.reserveMax;
    state.cooldown = 0;
    state.reloading = false;

    // Switch viewmodel visibility
    Object.keys(viewmodels).forEach((id) => {
      viewmodels[id].visible = (id === weaponId);
    });
  }

  function getSpread(playerSpeed, isCrouching) {
    const cfg = state.config;
    let spread = cfg.baseSpread;
    if (isCrouching) spread *= cfg.crouchSpreadMult;
    if (playerSpeed > 1.0) spread *= cfg.moveSpreadMult;
    spread += Math.min(0.06, state.continuousShots * 0.0035);
    return spread;
  }

  function canFire() {
    return state.cooldown <= 0 && !state.reloading && state.mag > 0;
  }

  function pullTrigger() {
    if (!canFire()) {
      if (state.mag <= 0 && !state.reloading) {
        reload();
      }
      return false;
    }
    state.mag -= 1;
    state.cooldown = state.config.fireRate;
    state.continuousShots += 1;

    // Visual kick
    state.kickOffset = 0.05;
    state.kickRot = 0.07;

    // Audio sound
    soundEngine.playGunshot(state.config.soundType);
    return true;
  }

  function reload() {
    if (state.reloading) return;
    if (state.mag >= state.config.magSize || state.reserve <= 0) return;
    state.reloading = true;
    state.reloadProgress = 0;
    soundEngine.playReload();
  }

  function update(dt, lookDelta, playerSpeed, isMoving) {
    if (state.cooldown > 0) {
      state.cooldown -= dt;
    }

    // Decay continuous fire penalty if not firing
    if (state.cooldown <= 0) {
      state.continuousShots = Math.max(0, state.continuousShots - dt * 8);
    }

    // Reload completion
    if (state.reloading) {
      state.reloadProgress += dt;
      if (state.reloadProgress >= state.config.reloadTime) {
        const needed = state.config.magSize - state.mag;
        const available = Math.min(needed, state.reserve);
        state.mag += available;
        state.reserve -= available;
        state.reloading = false;
        state.reloadProgress = 0;
      }
    }

    // Viewmodel sway based on mouse look
    const maxSway = 0.03;
    state.swayX += (-lookDelta.x * 0.0004 - state.swayX) * dt * 10;
    state.swayY += (lookDelta.y * 0.0004 - state.swayY) * dt * 10;
    state.swayX = Math.max(-maxSway, Math.min(maxSway, state.swayX));
    state.swayY = Math.max(-maxSway, Math.min(maxSway, state.swayY));

    // Viewmodel walk bobbing
    const walkBob = isMoving ? Math.sin(performance.now() * 0.008) * 0.008 : 0;
    const walkSway = isMoving ? Math.cos(performance.now() * 0.004) * 0.006 : 0;

    // Recovery from firing kick
    state.kickOffset = Math.max(0, state.kickOffset - dt * 0.35);
    state.kickRot = Math.max(0, state.kickRot - dt * 0.5);

    // Apply translation and rotation to weapon mount
    weaponMount.position.set(
      0.24 + state.swayX + walkSway,
      -0.22 + state.swayY + walkBob,
      -0.42 + state.kickOffset
    );
    weaponMount.rotation.set(
      state.kickRot + state.swayY * 2,
      state.swayX * 2,
      -state.swayX
    );
  }

  function getMuzzleWorldPos() {
    const pos = new THREE.Vector3();
    const activeMesh = viewmodels[state.currentWeaponId];
    if (activeMesh) {
      activeMesh.getWorldPosition(pos);
      // Project forward toward front of barrel
      const fwd = new THREE.Vector3();
      camera.getWorldDirection(fwd);
      pos.addScaledVector(fwd, 0.4);
    } else {
      camera.getWorldPosition(pos);
    }
    return pos;
  }

  return {
    state,
    selectWeapon,
    getSpread,
    canFire,
    pullTrigger,
    reload,
    update,
    getMuzzleWorldPos,
  };
}

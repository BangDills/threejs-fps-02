// Multi-weapon arsenal, procedural viewmodels, recoil patterns, dynamic spread, ADS, and reload.
import * as THREE from 'three';
import { soundEngine } from './audio.js';
import { PALETTE } from './palette.js';

export const WEAPON_CONFIGS = {
  viper: {
    id: 'viper', name: 'Viper-9 Tactical Sidearm', category: 'Sidearm', cost: 0,
    magSize: 15, reserveMax: 60, damage: 28, headshotMult: 2.5,
    falloffStart: 18, falloffEnd: 42, minDamage: 14, fireRate: 0.15, reloadTime: 1.4,
    baseSpread: 0.007, moveSpreadMult: 2.2, crouchSpreadMult: 0.5, adsSpreadMult: 0.45,
    recoilPitch: 0.014, recoilYaw: 0.005, spreadGrowth: 0.002, pellets: 1, zoomFov: 58,
    soundType: 'pistol', auto: false,
    viewPos: new THREE.Vector3(0.22, -0.22, -0.38), adsPos: new THREE.Vector3(0, -0.15, -0.30),
  },
  specter: {
    id: 'specter', name: 'Specter-9 Pulse SMG', category: 'SMG', cost: 1600,
    magSize: 35, reserveMax: 105, damage: 22, headshotMult: 2.4,
    falloffStart: 12, falloffEnd: 32, minDamage: 11, fireRate: 0.065, reloadTime: 1.7,
    baseSpread: 0.011, moveSpreadMult: 1.7, crouchSpreadMult: 0.55, adsSpreadMult: 0.4,
    recoilPitch: 0.015, recoilYaw: 0.009, spreadGrowth: 0.0028, pellets: 1, zoomFov: 54,
    soundType: 'smg', auto: true,
    viewPos: new THREE.Vector3(0.23, -0.21, -0.40), adsPos: new THREE.Vector3(0, -0.145, -0.32),
  },
  phalanx: {
    id: 'phalanx', name: 'Phalanx-4 Assault Carbine', category: 'Rifle', cost: 2900,
    magSize: 30, reserveMax: 90, damage: 34, headshotMult: 3.5,
    falloffStart: 25, falloffEnd: 60, minDamage: 24, fireRate: 0.09, reloadTime: 2.1,
    baseSpread: 0.0035, moveSpreadMult: 3.8, crouchSpreadMult: 0.35, adsSpreadMult: 0.3,
    recoilPitch: 0.022, recoilYaw: 0.008, spreadGrowth: 0.0035, pellets: 1, zoomFov: 50,
    soundType: 'rifle', auto: true,
    viewPos: new THREE.Vector3(0.24, -0.22, -0.42), adsPos: new THREE.Vector3(0, -0.148, -0.34),
  },
  breaker: {
    id: 'breaker', name: 'Breaker-12 Tactical Shotgun', category: 'Shotgun', cost: 1800,
    magSize: 7, reserveMax: 28, damage: 16, headshotMult: 2.0,
    falloffStart: 7, falloffEnd: 22, minDamage: 5, fireRate: 0.65, reloadTime: 2.5,
    baseSpread: 0.036, moveSpreadMult: 1.5, crouchSpreadMult: 0.7, adsSpreadMult: 0.65,
    recoilPitch: 0.046, recoilYaw: 0.012, spreadGrowth: 0.008, pellets: 8, zoomFov: 60,
    soundType: 'shotgun', auto: false,
    viewPos: new THREE.Vector3(0.24, -0.22, -0.42), adsPos: new THREE.Vector3(0, -0.14, -0.32),
  },
  longbow: {
    id: 'longbow', name: 'Longbow-X Rail Sniper', category: 'Sniper', cost: 4600,
    magSize: 5, reserveMax: 20, damage: 115, headshotMult: 3.0,
    falloffStart: 60, falloffEnd: 150, minDamage: 95, fireRate: 1.25, reloadTime: 2.8,
    baseSpread: 0.0008, moveSpreadMult: 8.0, crouchSpreadMult: 0.15, adsSpreadMult: 0.05,
    recoilPitch: 0.065, recoilYaw: 0.015, spreadGrowth: 0.02, pellets: 1, zoomFov: 24,
    soundType: 'sniper', auto: false,
    viewPos: new THREE.Vector3(0.25, -0.23, -0.45), adsPos: new THREE.Vector3(0, -0.155, -0.36),
  },
};

export function createWeaponSystem(camera) {
  const weaponMount = new THREE.Group();
  camera.add(weaponMount);
  const viewmodels = {};

  const matGunMetal = new THREE.MeshStandardMaterial({ color: 0x1b2028, roughness: 0.4, metalness: 0.8 });
  const matGunAccent = new THREE.MeshStandardMaterial({ color: PALETTE.accent, roughness: 0.3, metalness: 0.5 });
  const matGunSteel = new THREE.MeshStandardMaterial({ color: 0x47515e, roughness: 0.3, metalness: 0.9 });
  const matGunGrip = new THREE.MeshStandardMaterial({ color: 0x11141a, roughness: 0.8, metalness: 0.2 });

  // 1. Phalanx Assault Carbine
  const mCarbine = new THREE.Group();
  const bRec = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.46), matGunMetal);
  mCarbine.add(bRec);
  const bBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.28, 12), matGunSteel);
  bBarrel.rotation.x = Math.PI / 2;
  bBarrel.position.set(0, 0.02, -0.32);
  mCarbine.add(bBarrel);
  const bMag = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.18, 0.09), matGunAccent);
  bMag.position.set(0, -0.11, -0.06);
  bMag.rotation.x = 0.2;
  mCarbine.add(bMag);
  const bSight = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.05, 0.08), matGunMetal);
  bSight.position.set(0, 0.075, -0.04);
  mCarbine.add(bSight);
  mCarbine.visible = true;
  weaponMount.add(mCarbine);
  viewmodels.phalanx = mCarbine;

  // 2. Viper Tactical Pistol
  const mPistol = new THREE.Group();
  const pSlide = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.06, 0.24), matGunSteel);
  mPistol.add(pSlide);
  const pGrip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.13, 0.06), matGunGrip);
  pGrip.position.set(0, -0.08, 0.05);
  pGrip.rotation.x = -0.25;
  mPistol.add(pGrip);
  mPistol.visible = false;
  weaponMount.add(mPistol);
  viewmodels.viper = mPistol;

  // 3. Specter Pulse SMG
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

  // 4. Breaker-12 Tactical Shotgun
  const mShotgun = new THREE.Group();
  const shRec = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.09, 0.42), matGunMetal);
  mShotgun.add(shRec);
  const shBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.34, 12), matGunSteel);
  shBarrel.rotation.x = Math.PI / 2;
  shBarrel.position.set(0, 0.02, -0.34);
  mShotgun.add(shBarrel);
  const shMagTube = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.30, 10), matGunMetal);
  shMagTube.rotation.x = Math.PI / 2;
  shMagTube.position.set(0, -0.02, -0.32);
  mShotgun.add(shMagTube);
  const shPump = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.06, 0.14), matGunAccent);
  shPump.position.set(0, -0.02, -0.28);
  mShotgun.add(shPump);
  const shStock = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.08, 0.22), matGunGrip);
  shStock.position.set(0, -0.04, 0.26);
  mShotgun.add(shStock);
  mShotgun.visible = false;
  weaponMount.add(mShotgun);
  viewmodels.breaker = mShotgun;

  // 5. Longbow-X Rail Sniper
  const mSniper = new THREE.Group();
  const snBody = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.11, 0.62), matGunMetal);
  mSniper.add(snBody);
  const snBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.44, 12), matGunSteel);
  snBarrel.rotation.x = Math.PI / 2;
  snBarrel.position.set(0, 0.02, -0.48);
  mSniper.add(snBarrel);
  const snScope = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.26, 12), matGunAccent);
  snScope.rotation.x = Math.PI / 2;
  snScope.position.set(0, 0.09, -0.08);
  mSniper.add(snScope);
  mSniper.visible = false;
  weaponMount.add(mSniper);
  viewmodels.longbow = mSniper;

  const state = {
    currentWeaponId: 'phalanx',
    config: WEAPON_CONFIGS.phalanx,
    mag: WEAPON_CONFIGS.phalanx.magSize,
    reserve: WEAPON_CONFIGS.phalanx.reserveMax,
    cooldown: 0,
    reloading: false,
    reloadProgress: 0,
    continuousShots: 0,
    ads: 0,
    swayX: 0,
    swayY: 0,
    kickOffset: 0,
    kickRot: 0,
    heGrenades: 1,
    smokeGrenades: 1,
  };

  const normalFov = 74;

  function selectWeapon(weaponId) {
    if (!WEAPON_CONFIGS[weaponId]) return;
    state.currentWeaponId = weaponId;
    state.config = WEAPON_CONFIGS[weaponId];
    state.mag = state.config.magSize;
    state.reserve = state.config.reserveMax;
    state.cooldown = 0;
    state.reloading = false;
    state.ads = 0;

    Object.keys(viewmodels).forEach((id) => {
      viewmodels[id].visible = (id === weaponId);
    });
  }

  function getSpread(playerSpeed, isCrouching) {
    const cfg = state.config;
    let spread = cfg.baseSpread;
    if (isCrouching) spread *= cfg.crouchSpreadMult;
    if (playerSpeed > 1.0) spread *= cfg.moveSpreadMult;
    if (state.ads > 0.1) {
      spread *= THREE.MathUtils.lerp(1.0, cfg.adsSpreadMult, state.ads);
    }
    spread += Math.min(0.06, state.continuousShots * cfg.spreadGrowth);
    return spread;
  }

  function canFire() {
    return state.cooldown <= 0 && !state.reloading && state.mag > 0;
  }

  function pullTrigger() {
    if (!canFire()) {
      if (state.mag <= 0 && !state.reloading) {
        soundEngine.playDryFire();
        reload();
      }
      return false;
    }
    state.mag -= 1;
    state.cooldown = state.config.fireRate;
    state.continuousShots += 1;
    state.kickOffset = 0.055;
    state.kickRot = 0.075;
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

  function calculateHitDamage(dist, isHead, isLimbs) {
    const cfg = state.config;
    let dmg = cfg.damage;
    if (dist > cfg.falloffStart) {
      const t = Math.min(1.0, (dist - cfg.falloffStart) / Math.max(1, cfg.falloffEnd - cfg.falloffStart));
      dmg = THREE.MathUtils.lerp(cfg.damage, cfg.minDamage, t);
    }
    if (isHead) dmg *= cfg.headshotMult;
    else if (isLimbs) dmg *= 0.75;
    return Math.max(1, Math.floor(dmg));
  }

  function update(dt, lookDelta, playerSpeed, isMoving, wantAds) {
    if (state.cooldown > 0) state.cooldown -= dt;
    if (state.cooldown <= 0) state.continuousShots = Math.max(0, state.continuousShots - dt * 10);

    const targetAds = wantAds ? 1 : 0;
    state.ads += (targetAds - state.ads) * Math.min(1, dt * 12);

    const targetFov = THREE.MathUtils.lerp(normalFov, state.config.zoomFov, state.ads);
    if (Math.abs(camera.fov - targetFov) > 0.05) {
      camera.fov = targetFov;
      camera.updateProjectionMatrix();
    }

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

    const maxSway = 0.03;
    state.swayX += (-lookDelta.x * 0.0004 - state.swayX) * dt * 10;
    state.swayY += (lookDelta.y * 0.0004 - state.swayY) * dt * 10;
    state.swayX = Math.max(-maxSway, Math.min(maxSway, state.swayX));
    state.swayY = Math.max(-maxSway, Math.min(maxSway, state.swayY));

    const bobFactor = (1 - state.ads * 0.7);
    const walkBob = isMoving ? Math.sin(performance.now() * 0.008) * 0.008 * bobFactor : 0;
    const walkSway = isMoving ? Math.cos(performance.now() * 0.004) * 0.006 * bobFactor : 0;

    state.kickOffset = Math.max(0, state.kickOffset - dt * 0.35);
    state.kickRot = Math.max(0, state.kickRot - dt * 0.5);

    const cfg = state.config;
    const curX = THREE.MathUtils.lerp(cfg.viewPos.x, cfg.adsPos.x, state.ads);
    const curY = THREE.MathUtils.lerp(cfg.viewPos.y, cfg.adsPos.y, state.ads);
    const curZ = THREE.MathUtils.lerp(cfg.viewPos.z, cfg.adsPos.z, state.ads);

    weaponMount.position.set(curX + state.swayX + walkSway, curY + state.swayY + walkBob, curZ + state.kickOffset);
    weaponMount.rotation.set(state.kickRot + state.swayY * 2, state.swayX * 2, -state.swayX);
  }

  function getMuzzleWorldPos() {
    const pos = new THREE.Vector3();
    const activeMesh = viewmodels[state.currentWeaponId];
    if (activeMesh) {
      activeMesh.getWorldPosition(pos);
      const fwd = new THREE.Vector3();
      camera.getWorldDirection(fwd);
      pos.addScaledVector(fwd, 0.42);
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
    calculateHitDamage,
    update,
    getMuzzleWorldPos,
  };
}

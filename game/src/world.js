// Map geometry, colliders, tactical lanes, lighting, and nav waypoints for Sector-7 Relay Complex.
import * as THREE from 'three';
import { PALETTE } from './palette.js';
import {
  createConcreteTexture,
  createHazardTexture,
  createMetalTileTexture,
  createCrateTexture,
  createBeaconSiteTexture,
  createWallPanelTexture,
  createSignageTexture,
} from './textures.js';

export function createWorld(scene) {
  const colliders = [];
  const shootables = [];

  // Textures and shared materials
  const floorTex = createConcreteTexture();
  floorTex.repeat.set(16, 16);
  const wallTex = createWallPanelTexture();
  wallTex.repeat.set(4, 2);
  const metalTex = createMetalTileTexture();
  metalTex.repeat.set(6, 6);
  const hazardTex = createHazardTexture();
  hazardTex.repeat.set(8, 1);
  const crateTexA = createCrateTexture('AERO-SEC', '#0284c7');
  const crateTexB = createCrateTexture('HELIX-7', '#ef4444');
  const crateTexMid = createCrateTexture('SECTOR-7', '#f59e0b');
  const siteATex = createBeaconSiteTexture('A', 'REACTOR CORE');
  const siteBTex = createBeaconSiteTexture('B', 'DATA ARCHIVE');

  const signAlphaTex = createSignageTexture('SITE A', 'REACTOR CORE & CATWALK', 'SEC-07A');
  const signBravoTex = createSignageTexture('SITE B', 'QUANTUM DATA-HUB', 'SEC-07B');
  const signMidTex = createSignageTexture('MID CONDUIT', 'CENTRAL POWER CORRIDOR', 'SEC-07M');

  const matFloor = new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.75, metalness: 0.05 });
  const matWall = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.65, metalness: 0.15 });
  const matCatwalk = new THREE.MeshStandardMaterial({ map: metalTex, roughness: 0.45, metalness: 0.4 });
  const matHazard = new THREE.MeshStandardMaterial({ map: hazardTex, roughness: 0.55, metalness: 0.15 });
  const matCrateA = new THREE.MeshStandardMaterial({ map: crateTexA, roughness: 0.55, metalness: 0.2 });
  const matCrateB = new THREE.MeshStandardMaterial({ map: crateTexB, roughness: 0.55, metalness: 0.2 });
  const matCrateMid = new THREE.MeshStandardMaterial({ map: crateTexMid, roughness: 0.55, metalness: 0.2 });
  const matSiteA = new THREE.MeshStandardMaterial({ map: siteATex, roughness: 0.55, metalness: 0.15 });
  const matSiteB = new THREE.MeshStandardMaterial({ map: siteBTex, roughness: 0.55, metalness: 0.15 });
  const matTrim = new THREE.MeshStandardMaterial({ color: PALETTE.border, roughness: 0.45, metalness: 0.5 });
  const matSteelBeam = new THREE.MeshStandardMaterial({ color: PALETTE.steel, roughness: 0.5, metalness: 0.6 });
  const matSignAlpha = new THREE.MeshBasicMaterial({ map: signAlphaTex });
  const matSignBravo = new THREE.MeshBasicMaterial({ map: signBravoTex });
  const matSignMid = new THREE.MeshBasicMaterial({ map: signMidTex });

  // Main ground plane
  const groundGeo = new THREE.PlaneGeometry(80, 80);
  const groundMesh = new THREE.Mesh(groundGeo, matFloor);
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.receiveShadow = true;
  scene.add(groundMesh);
  shootables.push(groundMesh);

  // Open-air architectural overhead girders and perimeter canopy
  for (let z = -30; z <= 30; z += 15) {
    const beamGeo = new THREE.BoxGeometry(76, 0.45, 0.6);
    const beam = new THREE.Mesh(beamGeo, matSteelBeam);
    beam.position.set(0, 7.2, z);
    beam.castShadow = true;
    scene.add(beam);
  }

  function addBox(x, y, z, w, h, d, mat, addToColliders = true) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y + h / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    shootables.push(mesh);

    if (addToColliders) {
      colliders.push({
        min: new THREE.Vector3(x - w / 2, y, z - d / 2),
        max: new THREE.Vector3(x + w / 2, y + h, z + d / 2),
      });
    }
    return mesh;
  }

  function addSign(x, y, z, w, h, mat, rotY = 0) {
    const geo = new THREE.PlaneGeometry(w, h);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.rotation.y = rotY;
    scene.add(mesh);
    return mesh;
  }

  // --- Outer Perimeter Walls (80x80 area, wall height 6.5) ---
  const wallH = 6.5;
  addBox(0, 0, -38, 76, wallH, 2, matWall); // North
  addBox(0, 0, 38, 76, wallH, 2, matWall);  // South
  addBox(-38, 0, 0, 2, wallH, 76, matWall); // West
  addBox(38, 0, 0, 2, wallH, 76, matWall);  // East

  // --- Lane Dividers (Classic Three-Lane Map) ---
  // West Lane divider (separates Lane Alpha from Mid)
  addBox(-12, 0, -18, 2, wallH, 24, matWall);
  addBox(-12, 0, 18, 2, wallH, 24, matWall);
  // West connector arch / doorway at Z=0
  addBox(-12, 4.0, 0, 2, 2.5, 12, matTrim);

  // East Lane divider (separates Mid from Lane Bravo)
  addBox(12, 0, -18, 2, wallH, 24, matWall);
  addBox(12, 0, 18, 2, wallH, 24, matWall);
  // East connector arch at Z=0
  addBox(12, 4.0, 0, 2, 2.5, 12, matTrim);

  // Connector Signage
  addSign(-10.9, 4.4, 0, 3.6, 1.8, matSignAlpha, -Math.PI / 2);
  addSign(-13.1, 4.4, 0, 3.6, 1.8, matSignMid, Math.PI / 2);
  addSign(10.9, 4.4, 0, 3.6, 1.8, matSignBravo, Math.PI / 2);
  addSign(13.1, 4.4, 0, 3.6, 1.8, matSignMid, -Math.PI / 2);

  // --- Mid Corridor Features ---
  // Mid central bunker pillar
  addBox(0, 0, 0, 5, wallH, 5, matWall);
  // Hazard stripe trim at base of pillar
  addBox(0, 0, -2.6, 5.2, 0.45, 0.2, matHazard, false);
  addBox(0, 0, 2.6, 5.2, 0.45, 0.2, matHazard, false);
  addSign(0, 4.0, -2.6, 3.2, 1.6, matSignMid, 0);

  // Mid cover crates & flanking boxes
  addBox(-3, 0, -8, 2.2, 2.2, 2.2, matCrateA);
  addBox(3.5, 0, -10, 2.2, 2.2, 2.2, matCrateB);
  addBox(3.5, 2.2, -10, 2.0, 2.0, 2.0, matCrateMid);
  addBox(-2.5, 0, 9, 2.2, 2.2, 2.2, matCrateB);
  addBox(3.0, 0, 8, 2.2, 2.2, 2.2, matCrateA);

  // --- Lane Alpha & Site Alpha (West side) ---
  const siteAGround = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), matSiteA);
  siteAGround.rotation.x = -Math.PI / 2;
  siteAGround.position.set(-24, 0.02, 6);
  siteAGround.receiveShadow = true;
  scene.add(siteAGround);

  // Raised catwalk platform in Lane Alpha (height 2.0m)
  addBox(-30, 0, -14, 6, 2.0, 16, matCatwalk);
  // Access ramp from ground to catwalk
  addBox(-30, 0, -3, 6, 1.0, 6, matCatwalk);
  // Safety railing on catwalk
  addBox(-27, 2.0, -14, 0.2, 1.0, 16, matTrim);

  // Site Alpha cover structures
  addBox(-24, 0, 6, 2.6, 1.2, 2.6, matTrim); // Central beacon terminal mount
  addBox(-18, 0, 14, 2.4, 2.4, 4.8, matCrateA); // Cargo container
  addBox(-31, 0, 8, 3.0, 2.4, 3.0, matCrateB);  // Generator stack
  addBox(-26, 0, -22, 2.2, 2.2, 2.2, matCrateA); // Alpha lane corner box
  addSign(-36.9, 4.0, 6, 4.2, 2.1, matSignAlpha, Math.PI / 2);

  // --- Lane Bravo & Site Bravo (East side) ---
  const siteBGround = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), matSiteB);
  siteBGround.rotation.x = -Math.PI / 2;
  siteBGround.position.set(24, 0.02, 6);
  siteBGround.receiveShadow = true;
  scene.add(siteBGround);

  // Site Bravo reactor pillar
  addBox(24, 0, 6, 3.2, 4.5, 3.2, matWall);
  addBox(24, 0, 6, 4.0, 0.6, 4.0, matHazard, false);
  addSign(36.9, 4.0, 6, 4.2, 2.1, matSignBravo, -Math.PI / 2);

  // Bravo tactical cover crates & barriers
  addBox(18, 0, 15, 2.4, 2.4, 2.4, matCrateB);
  addBox(30, 0, -6, 2.2, 2.2, 4.4, matCrateMid);
  addBox(22, 0, -20, 2.2, 2.2, 2.2, matCrateB);
  addBox(31, 0, 14, 2.4, 2.4, 2.4, matCrateA);

  // --- AeroSec Spawn (North Base Z=-30) ---
  addBox(0, 0, -26, 6, 1.4, 1.8, matCrateA);
  addBox(-6, 0, -28, 2.2, 2.2, 2.2, matCrateB);
  addBox(6, 0, -28, 2.2, 2.2, 2.2, matCrateMid);

  // --- Helix Spawn (South Base Z=30) ---
  addBox(0, 0, 26, 6, 1.4, 1.8, matCrateB);
  addBox(-5, 0, 28, 2.2, 2.2, 2.2, matCrateA);
  addBox(5, 0, 28, 2.2, 2.2, 2.2, matCrateB);

  // --- Balanced Tactical Lighting Scheme (Mean Luma 70-85) ---
  const hemiLight = new THREE.HemisphereLight(PALETTE.skyFill, PALETTE.groundHemisphere, 1.25);
  scene.add(hemiLight);

  const dirLight = new THREE.DirectionalLight(PALETTE.sunLight, 1.8);
  dirLight.position.set(24, 42, -20);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 1024;
  dirLight.shadow.mapSize.height = 1024;
  dirLight.shadow.camera.near = 10;
  dirLight.shadow.camera.far = 110;
  dirLight.shadow.camera.left = -42;
  dirLight.shadow.camera.right = 42;
  dirLight.shadow.camera.top = 42;
  dirLight.shadow.camera.bottom = -42;
  dirLight.shadow.bias = -0.0004;
  scene.add(dirLight);

  const fillLight = new THREE.DirectionalLight(0xa0b8ce, 0.55);
  fillLight.position.set(-24, 28, 20);
  scene.add(fillLight);

  const lightSiteA = new THREE.PointLight(PALETTE.siteAlphaGlow, 1.5, 16, 1.2);
  lightSiteA.position.set(-24, 3.5, 6);
  scene.add(lightSiteA);

  const lightSiteB = new THREE.PointLight(PALETTE.siteBravoGlow, 1.8, 18, 1.2);
  lightSiteB.position.set(24, 3.5, 6);
  scene.add(lightSiteB);

  const lightMid = new THREE.PointLight(PALETTE.midLight, 2.0, 16, 1.2);
  lightMid.position.set(0, 4.0, 0);
  scene.add(lightMid);

  const lightConnA = new THREE.PointLight(0x38bdf8, 1.6, 14, 1.2);
  lightConnA.position.set(-12, 3.5, 0);
  scene.add(lightConnA);

  const lightConnB = new THREE.PointLight(0x06b6d4, 1.6, 14, 1.2);
  lightConnB.position.set(12, 3.5, 0);
  scene.add(lightConnB);

  // Objective locations
  const sites = {
    alpha: { id: 'A', name: 'Site Alpha (Reactor)', position: new THREE.Vector3(-24, 0, 6), radius: 5.5 },
    bravo: { id: 'B', name: 'Site Bravo (Data-Hub)', position: new THREE.Vector3(24, 0, 6), radius: 5.5 },
  };

  // Tactical navigation waypoints for Bot AI
  const waypoints = [
    // AeroSec Spawn Area
    { id: 'aero_spawn', pos: new THREE.Vector3(0, 0, -30), neighbors: ['mid_north', 'lane_a_north', 'lane_b_north'] },
    { id: 'aero_left', pos: new THREE.Vector3(-8, 0, -28), neighbors: ['aero_spawn', 'lane_a_north'] },
    { id: 'aero_right', pos: new THREE.Vector3(8, 0, -28), neighbors: ['aero_spawn', 'lane_b_north'] },

    // Lane Alpha
    { id: 'lane_a_north', pos: new THREE.Vector3(-24, 0, -22), neighbors: ['aero_spawn', 'aero_left', 'lane_a_mid', 'catwalk'] },
    { id: 'catwalk', pos: new THREE.Vector3(-30, 2.0, -14), neighbors: ['lane_a_north', 'lane_a_mid'] },
    { id: 'lane_a_mid', pos: new THREE.Vector3(-24, 0, -6), neighbors: ['lane_a_north', 'catwalk', 'site_a', 'mid_west_door'] },
    { id: 'site_a', pos: new THREE.Vector3(-24, 0, 6), neighbors: ['lane_a_mid', 'lane_a_south', 'site_a_cover'] },
    { id: 'site_a_cover', pos: new THREE.Vector3(-19, 0, 10), neighbors: ['site_a', 'lane_a_south'] },
    { id: 'lane_a_south', pos: new THREE.Vector3(-24, 0, 22), neighbors: ['site_a', 'site_a_cover', 'helix_spawn', 'helix_left'] },

    // Mid Corridor
    { id: 'mid_north', pos: new THREE.Vector3(0, 0, -16), neighbors: ['aero_spawn', 'mid_center'] },
    { id: 'mid_west_door', pos: new THREE.Vector3(-10, 0, 0), neighbors: ['lane_a_mid', 'mid_center'] },
    { id: 'mid_center', pos: new THREE.Vector3(0, 0, 0), neighbors: ['mid_north', 'mid_west_door', 'mid_east_door', 'mid_south'] },
    { id: 'mid_east_door', pos: new THREE.Vector3(10, 0, 0), neighbors: ['lane_b_mid', 'mid_center'] },
    { id: 'mid_south', pos: new THREE.Vector3(0, 0, 16), neighbors: ['mid_center', 'helix_spawn'] },

    // Lane Bravo
    { id: 'lane_b_north', pos: new THREE.Vector3(24, 0, -22), neighbors: ['aero_spawn', 'aero_right', 'lane_b_mid'] },
    { id: 'lane_b_mid', pos: new THREE.Vector3(24, 0, -6), neighbors: ['lane_b_north', 'site_b', 'mid_east_door'] },
    { id: 'site_b', pos: new THREE.Vector3(24, 0, 6), neighbors: ['lane_b_mid', 'lane_b_south', 'site_b_cover'] },
    { id: 'site_b_cover', pos: new THREE.Vector3(20, 0, 12), neighbors: ['site_b', 'lane_b_south'] },
    { id: 'lane_b_south', pos: new THREE.Vector3(24, 0, 22), neighbors: ['site_b', 'site_b_cover', 'helix_spawn', 'helix_right'] },

    // Helix Spawn Area
    { id: 'helix_spawn', pos: new THREE.Vector3(0, 0, 30), neighbors: ['mid_south', 'lane_a_south', 'lane_b_south', 'helix_left', 'helix_right'] },
    { id: 'helix_left', pos: new THREE.Vector3(-8, 0, 28), neighbors: ['helix_spawn', 'lane_a_south'] },
    { id: 'helix_right', pos: new THREE.Vector3(8, 0, 28), neighbors: ['helix_spawn', 'lane_b_south'] },
  ];

  return {
    colliders,
    shootables,
    sites,
    waypoints,
    addBox,
  };
}

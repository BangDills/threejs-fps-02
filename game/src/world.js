// Map geometry, colliders, tactical lanes, and lighting for Sector-7 Relay Complex.
import * as THREE from 'three';
import { PALETTE } from './palette.js';
import {
  createConcreteTexture,
  createHazardTexture,
  createMetalTileTexture,
  createCrateTexture,
  createBeaconSiteTexture,
  createWallPanelTexture,
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
  const crateTexA = createCrateTexture('AERO-SEC');
  const crateTexB = createCrateTexture('HELIX-7');
  const siteATex = createBeaconSiteTexture('BEACON ALPHA');
  const siteBTex = createBeaconSiteTexture('BEACON BRAVO');

  const matFloor = new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.85, metalness: 0.1 });
  const matWall = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.7, metalness: 0.3 });
  const matCatwalk = new THREE.MeshStandardMaterial({ map: metalTex, roughness: 0.5, metalness: 0.5 });
  const matHazard = new THREE.MeshStandardMaterial({ map: hazardTex, roughness: 0.6, metalness: 0.2 });
  const matCrateA = new THREE.MeshStandardMaterial({ map: crateTexA, roughness: 0.65, metalness: 0.2 });
  const matCrateB = new THREE.MeshStandardMaterial({ map: crateTexB, roughness: 0.65, metalness: 0.2 });
  const matSiteA = new THREE.MeshStandardMaterial({ map: siteATex, roughness: 0.6, metalness: 0.2 });
  const matSiteB = new THREE.MeshStandardMaterial({ map: siteBTex, roughness: 0.6, metalness: 0.2 });
  const matTrim = new THREE.MeshStandardMaterial({ color: PALETTE.border, roughness: 0.5, metalness: 0.6 });

  // Main ground plane
  const groundGeo = new THREE.PlaneGeometry(80, 80);
  const groundMesh = new THREE.Mesh(groundGeo, matFloor);
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.position.y = 0;
  groundMesh.receiveShadow = true;
  scene.add(groundMesh);
  shootables.push(groundMesh);

  // Ceiling for interior feel with open skylights
  const roofGeo = new THREE.PlaneGeometry(80, 80);
  const roofMesh = new THREE.Mesh(roofGeo, new THREE.MeshStandardMaterial({ color: PALETTE.concreteDark, roughness: 0.9 }));
  roofMesh.rotation.x = Math.PI / 2;
  roofMesh.position.y = 7.0;
  scene.add(roofMesh);

  // Helper to add solid rectangular box with collider
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

  // --- Outer Perimeter Walls (80x80 area, wall height 6.0) ---
  const wallH = 6.0;
  addBox(0, 0, -38, 76, wallH, 2, matWall); // North
  addBox(0, 0, 38, 76, wallH, 2, matWall);  // South
  addBox(-38, 0, 0, 2, wallH, 76, matWall); // West
  addBox(38, 0, 0, 2, wallH, 76, matWall);  // East

  // --- Lane Dividers (Three Lane Architecture) ---
  // West Lane divider (separates Lane Alpha from Mid)
  addBox(-12, 0, -18, 2, wallH, 24, matWall);
  addBox(-12, 0, 18, 2, wallH, 24, matWall);
  // West connector arch / doorway at Z=0 (opening from X=-14 to X=-10, Z=-6 to +6)
  addBox(-12, 3.6, 0, 2, 2.4, 12, matTrim);

  // East Lane divider (separates Mid from Lane Bravo)
  addBox(12, 0, -18, 2, wallH, 24, matWall);
  addBox(12, 0, 18, 2, wallH, 24, matWall);
  // East connector arch at Z=0
  addBox(12, 3.6, 0, 2, 2.4, 12, matTrim);

  // --- Mid Corridor Features ---
  // Mid central bunker pillar
  addBox(0, 0, 0, 5, wallH, 5, matWall);
  // Hazard stripe trim at base of pillar
  addBox(0, 0, -2.6, 5.2, 0.4, 0.2, matHazard, false);
  addBox(0, 0, 2.6, 5.2, 0.4, 0.2, matHazard, false);

  // Mid cover crates
  addBox(-3, 0, -8, 2.2, 2.2, 2.2, matCrateA);
  addBox(3.5, 0, -10, 2.2, 2.2, 2.2, matCrateB);
  addBox(3.5, 2.2, -10, 2.0, 2.0, 2.0, matCrateA);
  addBox(-2.5, 0, 9, 2.2, 2.2, 2.2, matCrateB);
  addBox(3.0, 0, 8, 2.2, 2.2, 2.2, matCrateA);

  // --- Lane Alpha & Site Alpha (West side) ---
  // Site Alpha ground decal pad (at X=-24, Z=6)
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

  // --- Lane Bravo & Site Bravo (East side) ---
  // Site Bravo ground decal pad (at X=24, Z=6)
  const siteBGround = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), matSiteB);
  siteBGround.rotation.x = -Math.PI / 2;
  siteBGround.position.set(24, 0.02, 6);
  siteBGround.receiveShadow = true;
  scene.add(siteBGround);

  // Site Bravo reactor pillar
  addBox(24, 0, 6, 3.2, 4.5, 3.2, matWall);
  addBox(24, 0, 6, 4.0, 0.6, 4.0, matHazard, false);

  // Bravo tactical cover crates & barriers
  addBox(18, 0, 15, 2.4, 2.4, 2.4, matCrateB);
  addBox(30, 0, -6, 2.2, 2.2, 4.4, matCrateA);
  addBox(22, 0, -20, 2.2, 2.2, 2.2, matCrateB);
  addBox(31, 0, 14, 2.4, 2.4, 2.4, matCrateA);

  // --- AeroSec Spawn (North Base Z=-30) ---
  addBox(0, 0, -26, 6, 1.4, 1.8, matCrateA);
  addBox(-6, 0, -28, 2.2, 2.2, 2.2, matCrateB);
  addBox(6, 0, -28, 2.2, 2.2, 2.2, matCrateA);

  // --- Helix Spawn (South Base Z=30) ---
  addBox(0, 0, 26, 6, 1.4, 1.8, matCrateB);
  addBox(-5, 0, 28, 2.2, 2.2, 2.2, matCrateA);
  addBox(5, 0, 28, 2.2, 2.2, 2.2, matCrateB);

  // --- Lighting Scheme ---
  // Ambient illumination
  const ambient = new THREE.AmbientLight(PALETTE.skyLight, 1.3);
  scene.add(ambient);

  // Key directional sun
  const dirLight = new THREE.DirectionalLight(PALETTE.sunLight, 2.4);
  dirLight.position.set(24, 38, -18);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 1024;
  dirLight.shadow.mapSize.height = 1024;
  dirLight.shadow.camera.near = 10;
  dirLight.shadow.camera.far = 100;
  dirLight.shadow.camera.left = -40;
  dirLight.shadow.camera.right = 40;
  dirLight.shadow.camera.top = 40;
  dirLight.shadow.camera.bottom = -40;
  dirLight.shadow.bias = -0.0005;
  scene.add(dirLight);

  // Tactical beacon glow at Site Alpha (Emerald)
  const lightSiteA = new THREE.PointLight(PALETTE.siteAlphaGlow, 3.2, 18, 1.2);
  lightSiteA.position.set(-24, 3.2, 6);
  scene.add(lightSiteA);

  // Tactical beacon glow at Site Bravo (Cyan)
  const lightSiteB = new THREE.PointLight(PALETTE.siteBravoGlow, 3.2, 18, 1.2);
  lightSiteB.position.set(24, 3.2, 6);
  scene.add(lightSiteB);

  // Mid corridor warm accent
  const lightMid = new THREE.PointLight(PALETTE.accent, 2.2, 14, 1.2);
  lightMid.position.set(0, 3.8, 0);
  scene.add(lightMid);

  // Objective locations for plant/defuse
  const sites = {
    alpha: { id: 'A', name: 'Site Alpha', position: new THREE.Vector3(-24, 0, 6), radius: 5.5 },
    bravo: { id: 'B', name: 'Site Bravo', position: new THREE.Vector3(24, 0, 6), radius: 5.5 },
  };

  // Tactical navigation waypoints for Bot AI
  const waypoints = [
    // AeroSec Spawn
    { id: 'aero_spawn', pos: new THREE.Vector3(0, 0, -30), neighbors: ['mid_north', 'lane_a_north', 'lane_b_north'] },
    // Lane Alpha
    { id: 'lane_a_north', pos: new THREE.Vector3(-24, 0, -22), neighbors: ['aero_spawn', 'lane_a_mid', 'catwalk'] },
    { id: 'catwalk', pos: new THREE.Vector3(-30, 2.0, -14), neighbors: ['lane_a_north', 'lane_a_mid'] },
    { id: 'lane_a_mid', pos: new THREE.Vector3(-24, 0, -6), neighbors: ['lane_a_north', 'catwalk', 'site_a', 'mid_west_door'] },
    { id: 'site_a', pos: new THREE.Vector3(-24, 0, 6), neighbors: ['lane_a_mid', 'lane_a_south'] },
    { id: 'lane_a_south', pos: new THREE.Vector3(-24, 0, 22), neighbors: ['site_a', 'helix_spawn'] },
    // Mid Corridor
    { id: 'mid_north', pos: new THREE.Vector3(0, 0, -16), neighbors: ['aero_spawn', 'mid_center'] },
    { id: 'mid_west_door', pos: new THREE.Vector3(-10, 0, 0), neighbors: ['lane_a_mid', 'mid_center'] },
    { id: 'mid_center', pos: new THREE.Vector3(0, 0, 0), neighbors: ['mid_north', 'mid_west_door', 'mid_east_door', 'mid_south'] },
    { id: 'mid_east_door', pos: new THREE.Vector3(10, 0, 0), neighbors: ['lane_b_mid', 'mid_center'] },
    { id: 'mid_south', pos: new THREE.Vector3(0, 0, 16), neighbors: ['mid_center', 'helix_spawn'] },
    // Lane Bravo
    { id: 'lane_b_north', pos: new THREE.Vector3(24, 0, -22), neighbors: ['aero_spawn', 'lane_b_mid'] },
    { id: 'lane_b_mid', pos: new THREE.Vector3(24, 0, -6), neighbors: ['lane_b_north', 'site_b', 'mid_east_door'] },
    { id: 'site_b', pos: new THREE.Vector3(24, 0, 6), neighbors: ['lane_b_mid', 'lane_b_south'] },
    { id: 'lane_b_south', pos: new THREE.Vector3(24, 0, 22), neighbors: ['site_b', 'helix_spawn'] },
    // Helix Spawn
    { id: 'helix_spawn', pos: new THREE.Vector3(0, 0, 30), neighbors: ['mid_south', 'lane_a_south', 'lane_b_south'] },
  ];

  return {
    colliders,
    shootables,
    sites,
    waypoints,
    addBox,
  };
}

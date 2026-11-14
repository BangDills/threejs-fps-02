// Procedural canvas textures: bright, readable daylight-industrial surfaces and tactical stencils.
import * as THREE from 'three';

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

export function createConcreteTexture() {
  const c = makeCanvas(256, 256);
  const ctx = c.getContext('2d');

  // Base industrial concrete
  ctx.fillStyle = '#7d8c9a';
  ctx.fillRect(0, 0, 256, 256);

  // Quadrant slabs with subtle tone variation for depth
  ctx.fillStyle = '#8595a3';
  ctx.fillRect(4, 4, 122, 122);
  ctx.fillRect(130, 130, 122, 122);

  ctx.fillStyle = '#758492';
  ctx.fillRect(130, 4, 122, 122);
  ctx.fillRect(4, 130, 122, 122);

  // Clean recessed expansion joints
  ctx.strokeStyle = '#687787';
  ctx.lineWidth = 4;
  ctx.strokeRect(0, 0, 256, 256);
  ctx.beginPath();
  ctx.moveTo(128, 0);
  ctx.lineTo(128, 256);
  ctx.moveTo(0, 128);
  ctx.lineTo(256, 128);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function createHazardTexture() {
  const c = makeCanvas(128, 128);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(0, 0, 128, 128);

  ctx.fillStyle = '#1e2530';
  ctx.beginPath();
  const stripe = 24;
  for (let x = -128; x < 256; x += stripe * 2) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x + stripe, 0);
    ctx.lineTo(x + stripe + 128, 128);
    ctx.lineTo(x + 128, 128);
    ctx.closePath();
  }
  ctx.fill();

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function createMetalTileTexture() {
  const c = makeCanvas(128, 128);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#8f9fae';
  ctx.fillRect(0, 0, 128, 128);

  ctx.strokeStyle = '#6e7e8e';
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, 128, 128);

  // Cross tread grip bars
  ctx.fillStyle = '#b0c0ce';
  for (let y = 16; y < 128; y += 32) {
    for (let x = 16; x < 128; x += 32) {
      ctx.fillRect(x - 6, y - 2, 12, 4);
      ctx.fillRect(x + 10, y + 14, 4, 12);
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function createCrateTexture(label = 'AERO-SEC', accentColor = '#0284c7') {
  const c = makeCanvas(256, 256);
  const ctx = c.getContext('2d');
  // Metallic base
  ctx.fillStyle = '#6d7c8d';
  ctx.fillRect(0, 0, 256, 256);

  // Outer framing
  ctx.fillStyle = '#4c5b6b';
  ctx.fillRect(0, 0, 256, 18);
  ctx.fillRect(0, 238, 256, 18);
  ctx.fillRect(0, 0, 18, 256);
  ctx.fillRect(238, 0, 18, 256);

  // Inner inset panel
  ctx.fillStyle = '#5c6b7c';
  ctx.fillRect(22, 22, 212, 212);

  // Diagonal support brace
  ctx.strokeStyle = '#5b6b7c';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(24, 24);
  ctx.lineTo(232, 232);
  ctx.moveTo(232, 24);
  ctx.lineTo(24, 232);
  ctx.stroke();

  // Corner steel reinforcements
  ctx.fillStyle = '#445160';
  ctx.fillRect(18, 18, 28, 10);
  ctx.fillRect(18, 18, 10, 28);
  ctx.fillRect(210, 18, 28, 10);
  ctx.fillRect(228, 18, 10, 28);
  ctx.fillRect(18, 228, 28, 10);
  ctx.fillRect(18, 210, 10, 28);
  ctx.fillRect(210, 228, 28, 10);
  ctx.fillRect(228, 210, 10, 28);

  // High-contrast label badge
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(36, 92, 184, 72);
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 3;
  ctx.strokeRect(36, 92, 184, 72);

  // Stencil text label
  ctx.fillStyle = accentColor;
  ctx.font = 'bold 22px ui-monospace, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 128, 120);

  ctx.font = 'bold 11px ui-monospace, monospace';
  ctx.fillStyle = '#e2e8f0';
  ctx.fillText('SECTOR-7 RELAY ARMORY', 128, 144);

  const tex = new THREE.CanvasTexture(c);
  return tex;
}

export function createBeaconSiteTexture(siteLetter = 'A', title = 'REACTOR CORE') {
  const c = makeCanvas(256, 256);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#64748b';
  ctx.fillRect(0, 0, 256, 256);

  const glowColor = siteLetter === 'A' ? '#10b981' : '#06b6d4';

  // Outer border & octagonal ring
  ctx.strokeStyle = glowColor;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(128, 128, 114, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.arc(128, 128, 92, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Center beacon circle
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.arc(128, 128, 62, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = glowColor;
  ctx.font = '900 52px ui-monospace, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(siteLetter, 128, 114);

  ctx.font = 'bold 12px ui-monospace, monospace';
  ctx.fillStyle = '#f8fafc';
  ctx.fillText(title, 128, 150);

  const tex = new THREE.CanvasTexture(c);
  return tex;
}

export function createWallPanelTexture() {
  const c = makeCanvas(256, 256);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#6f7e8e';
  ctx.fillRect(0, 0, 256, 256);

  // Architectural seams and recessed tech grates
  ctx.strokeStyle = '#556473';
  ctx.lineWidth = 3;
  ctx.strokeRect(4, 4, 248, 248);

  ctx.fillStyle = '#5c6b7a';
  ctx.fillRect(20, 36, 216, 44);
  ctx.fillRect(20, 156, 216, 44);

  // Horizontal ventilation slats
  ctx.fillStyle = '#475569';
  for (let y = 42; y < 74; y += 7) {
    ctx.fillRect(32, y, 192, 3);
  }
  for (let y = 162; y < 194; y += 7) {
    ctx.fillRect(32, y, 192, 3);
  }

  // High-visibility status LED indicators
  ctx.fillStyle = '#10b981';
  ctx.beginPath();
  ctx.arc(42, 110, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.arc(66, 110, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.arc(90, 110, 5, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function createSignageTexture(mainText = 'SITE A', subText = 'REACTOR PLATFORM', code = 'SEC-07') {
  const c = makeCanvas(256, 128);
  const ctx = c.getContext('2d');

  // Clean background
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, 256, 128);

  // Bright header bar
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(0, 0, 256, 14);
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 3;
  ctx.strokeRect(0, 0, 256, 128);

  // Code tag
  ctx.font = 'bold 12px ui-monospace, monospace';
  ctx.fillStyle = '#cbd5e1';
  ctx.textAlign = 'right';
  ctx.fillText(code, 244, 30);

  // Main text
  ctx.font = '900 30px ui-monospace, monospace';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.fillText(mainText, 16, 58);

  // Subtext
  ctx.font = '700 13px system-ui, sans-serif';
  ctx.fillStyle = '#38bdf8';
  ctx.fillText(subText, 16, 84);

  // Directional arrow
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.moveTo(16, 102);
  ctx.lineTo(38, 102);
  ctx.lineTo(38, 96);
  ctx.lineTo(50, 105);
  ctx.lineTo(38, 114);
  ctx.lineTo(38, 108);
  ctx.lineTo(16, 108);
  ctx.closePath();
  ctx.fill();

  const tex = new THREE.CanvasTexture(c);
  return tex;
}

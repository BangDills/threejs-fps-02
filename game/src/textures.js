// Canvas procedural texture generation: crisp, clean industrial panels, tactical markings, and facility signage.
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

  // Base concrete tone
  ctx.fillStyle = '#262c34';
  ctx.fillRect(0, 0, 256, 256);

  // Large quadrant slabs with subtle color variation
  ctx.fillStyle = '#2a313a';
  ctx.fillRect(4, 4, 122, 122);
  ctx.fillRect(130, 130, 122, 122);

  ctx.fillStyle = '#232830';
  ctx.fillRect(130, 4, 122, 122);
  ctx.fillRect(4, 130, 122, 122);

  // Recessed joint borders
  ctx.strokeStyle = '#161a20';
  ctx.lineWidth = 4;
  ctx.strokeRect(0, 0, 256, 256);
  ctx.beginPath();
  ctx.moveTo(128, 0);
  ctx.lineTo(128, 256);
  ctx.moveTo(0, 128);
  ctx.lineTo(256, 128);
  ctx.stroke();

  // Subtle corner anchor points
  ctx.fillStyle = '#14181e';
  const anchors = [12, 116, 140, 244];
  for (const ax of anchors) {
    for (const ay of anchors) {
      ctx.beginPath();
      ctx.arc(ax, ay, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function createHazardTexture() {
  const c = makeCanvas(128, 128);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#eab308';
  ctx.fillRect(0, 0, 128, 128);

  ctx.fillStyle = '#111418';
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
  ctx.fillStyle = '#1e242c';
  ctx.fillRect(0, 0, 128, 128);

  ctx.strokeStyle = '#2d3540';
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, 128, 128);

  // Cross tread bars
  ctx.fillStyle = '#2b333e';
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

export function createCrateTexture(label = 'AERO-SEC', accentColor = '#f59e0b') {
  const c = makeCanvas(256, 256);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#323a45';
  ctx.fillRect(0, 0, 256, 256);

  // Outer framing
  ctx.fillStyle = '#1e242b';
  ctx.fillRect(0, 0, 256, 18);
  ctx.fillRect(0, 238, 256, 18);
  ctx.fillRect(0, 0, 18, 256);
  ctx.fillRect(238, 0, 18, 256);

  // Inner inset panel
  ctx.fillStyle = '#282f38';
  ctx.fillRect(22, 22, 212, 212);

  // Diagonal support brace line
  ctx.strokeStyle = '#20262e';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(24, 24);
  ctx.lineTo(232, 232);
  ctx.moveTo(232, 24);
  ctx.lineTo(24, 232);
  ctx.stroke();

  // Corner steel brackets
  ctx.fillStyle = '#14181f';
  ctx.fillRect(18, 18, 28, 10);
  ctx.fillRect(18, 18, 10, 28);
  ctx.fillRect(210, 18, 28, 10);
  ctx.fillRect(228, 18, 10, 28);
  ctx.fillRect(18, 228, 28, 10);
  ctx.fillRect(18, 210, 10, 28);
  ctx.fillRect(210, 228, 28, 10);
  ctx.fillRect(228, 210, 10, 28);

  // Label badge
  ctx.fillStyle = '#181d24';
  ctx.fillRect(40, 96, 176, 64);
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 2;
  ctx.strokeRect(40, 96, 176, 64);

  // Stencil text label
  ctx.fillStyle = accentColor;
  ctx.font = 'bold 20px ui-monospace, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 128, 120);

  ctx.font = 'bold 10px ui-monospace, monospace';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('SECTOR-7 RELAY ARMORY', 128, 142);

  const tex = new THREE.CanvasTexture(c);
  return tex;
}

export function createBeaconSiteTexture(siteLetter = 'A', title = 'REACTOR CORE') {
  const c = makeCanvas(256, 256);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#13171d';
  ctx.fillRect(0, 0, 256, 256);

  const glowColor = siteLetter === 'A' ? '#10b981' : '#06b6d4';

  // Outer border & octagonal ring
  ctx.strokeStyle = glowColor;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(128, 128, 114, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.arc(128, 128, 92, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Center beacon circle
  ctx.fillStyle = '#1e242d';
  ctx.beginPath();
  ctx.arc(128, 128, 62, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = glowColor;
  ctx.font = '900 48px ui-monospace, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(siteLetter, 128, 115);

  ctx.font = 'bold 11px ui-monospace, monospace';
  ctx.fillStyle = '#f0f6fc';
  ctx.fillText(title, 128, 150);

  const tex = new THREE.CanvasTexture(c);
  return tex;
}

export function createWallPanelTexture() {
  const c = makeCanvas(256, 256);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#20252c';
  ctx.fillRect(0, 0, 256, 256);

  // Architectural seams and recessed tech grates
  ctx.strokeStyle = '#14181e';
  ctx.lineWidth = 3;
  ctx.strokeRect(4, 4, 248, 248);

  ctx.fillStyle = '#171b22';
  ctx.fillRect(20, 36, 216, 44);
  ctx.fillRect(20, 156, 216, 44);

  // Horizontal ventilation slats
  ctx.fillStyle = '#0f1216';
  for (let y = 42; y < 74; y += 7) {
    ctx.fillRect(32, y, 192, 3);
  }
  for (let y = 162; y < 194; y += 7) {
    ctx.fillRect(32, y, 192, 3);
  }

  // Status LED indicators
  ctx.fillStyle = '#10b981';
  ctx.beginPath();
  ctx.arc(42, 110, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.arc(62, 110, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.arc(82, 110, 4, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function createSignageTexture(mainText = 'SITE A', subText = 'REACTOR PLATFORM', code = 'SEC-07') {
  const c = makeCanvas(256, 128);
  const ctx = c.getContext('2d');

  // Background
  ctx.fillStyle = '#161b22';
  ctx.fillRect(0, 0, 256, 128);

  // Border & header bar
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(0, 0, 256, 12);
  ctx.strokeStyle = '#30363d';
  ctx.lineWidth = 3;
  ctx.strokeRect(0, 0, 256, 128);

  // Code tag
  ctx.font = 'bold 11px ui-monospace, monospace';
  ctx.fillStyle = '#8b949e';
  ctx.textAlign = 'right';
  ctx.fillText(code, 244, 28);

  // Main text
  ctx.font = '900 28px ui-monospace, monospace';
  ctx.fillStyle = '#f0f6fc';
  ctx.textAlign = 'left';
  ctx.fillText(mainText, 16, 56);

  // Subtext
  ctx.font = '600 13px system-ui, sans-serif';
  ctx.fillStyle = '#38bdf8';
  ctx.fillText(subText, 16, 82);

  // Arrow indicator
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.moveTo(16, 102);
  ctx.lineTo(36, 102);
  ctx.lineTo(36, 96);
  ctx.lineTo(48, 105);
  ctx.lineTo(36, 114);
  ctx.lineTo(36, 108);
  ctx.lineTo(16, 108);
  ctx.closePath();
  ctx.fill();

  const tex = new THREE.CanvasTexture(c);
  return tex;
}

// Canvas procedural texture generation: crisp, clean industrial panels and tactical markings.
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

  // Base smooth concrete tone
  ctx.fillStyle = '#282e36';
  ctx.fillRect(0, 0, 256, 256);

  // Large quadrant slabs
  ctx.fillStyle = '#2b313a';
  ctx.fillRect(4, 4, 122, 122);
  ctx.fillRect(130, 130, 122, 122);

  ctx.fillStyle = '#252a32';
  ctx.fillRect(130, 4, 122, 122);
  ctx.fillRect(4, 130, 122, 122);

  // Recessed joint borders
  ctx.strokeStyle = '#181c22';
  ctx.lineWidth = 4;
  ctx.strokeRect(0, 0, 256, 256);
  ctx.beginPath();
  ctx.moveTo(128, 0);
  ctx.lineTo(128, 256);
  ctx.moveTo(0, 128);
  ctx.lineTo(256, 128);
  ctx.stroke();

  // Subtle corner anchor points
  ctx.fillStyle = '#181c22';
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
  ctx.fillStyle = '#1e232a';
  ctx.fillRect(0, 0, 128, 128);

  ctx.strokeStyle = '#2b313a';
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, 128, 128);

  // Grip tread bars
  ctx.fillStyle = '#262c34';
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

export function createCrateTexture(label = 'AERO-SEC') {
  const c = makeCanvas(256, 256);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#343d48';
  ctx.fillRect(0, 0, 256, 256);

  // Outer framing
  ctx.fillStyle = '#20262e';
  ctx.fillRect(0, 0, 256, 16);
  ctx.fillRect(0, 240, 256, 16);
  ctx.fillRect(0, 0, 16, 256);
  ctx.fillRect(240, 0, 16, 256);

  // Inner inset panel
  ctx.fillStyle = '#29313a';
  ctx.fillRect(20, 20, 216, 216);

  // Corner brackets
  ctx.fillStyle = '#181c22';
  ctx.fillRect(16, 16, 32, 8);
  ctx.fillRect(16, 16, 8, 32);
  ctx.fillRect(208, 16, 32, 8);
  ctx.fillRect(232, 16, 8, 32);
  ctx.fillRect(16, 232, 32, 8);
  ctx.fillRect(16, 208, 8, 32);
  ctx.fillRect(208, 232, 32, 8);
  ctx.fillRect(232, 208, 8, 32);

  // Stencil text label
  ctx.fillStyle = '#f59e0b';
  ctx.font = 'bold 24px ui-monospace, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 128, 120);

  ctx.font = 'bold 12px ui-monospace, monospace';
  ctx.fillStyle = '#8b949e';
  ctx.fillText('SECTOR-7 RELAY SUPPLY', 128, 150);

  const tex = new THREE.CanvasTexture(c);
  return tex;
}

export function createBeaconSiteTexture(text = 'SITE ALPHA') {
  const c = makeCanvas(256, 256);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#161b22';
  ctx.fillRect(0, 0, 256, 256);

  // Concentric tactical rings
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(128, 128, 110, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = '#06b6d4';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(128, 128, 76, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#10b981';
  ctx.font = 'bold 26px ui-monospace, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 124);

  ctx.font = 'bold 13px ui-monospace, monospace';
  ctx.fillStyle = '#f0f6fc';
  ctx.fillText('QUANTUM CALIBRATION', 128, 156);

  const tex = new THREE.CanvasTexture(c);
  return tex;
}

export function createWallPanelTexture() {
  const c = makeCanvas(256, 256);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#21262d';
  ctx.fillRect(0, 0, 256, 256);

  // Architectural seams and technical grates
  ctx.strokeStyle = '#161b22';
  ctx.lineWidth = 3;
  ctx.strokeRect(4, 4, 248, 248);

  ctx.fillStyle = '#181d24';
  ctx.fillRect(20, 36, 216, 44);
  ctx.fillRect(20, 156, 216, 44);

  // Status LED indicators
  ctx.fillStyle = '#10b981';
  ctx.beginPath();
  ctx.arc(40, 58, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.arc(60, 58, 4, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

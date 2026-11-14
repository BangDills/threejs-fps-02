// DOM HUD management: crosshair bloom, hitmarker, killfeed, requisitions buy menu,
// 10-player match scoreboard, status bars, and 2D tactical radar minimap.
import { WEAPON_CONFIGS } from './weapon.js';

export function createHud() {
  const elRetTop = document.getElementById('ret-top');
  const elRetBottom = document.getElementById('ret-bottom');
  const elRetLeft = document.getElementById('ret-left');
  const elRetRight = document.getElementById('ret-right');
  const elHitmarker = document.getElementById('hitmarker');
  const elDamageInd = document.getElementById('damage-indicator');
  const elScope = document.getElementById('scope-overlay');

  const elHp = document.getElementById('hp-val');
  const elAp = document.getElementById('ap-val');
  const elGunCat = document.getElementById('gun-category');
  const elGunName = document.getElementById('gun-name');
  const elMag = document.getElementById('mag-val');
  const elRes = document.getElementById('res-val');
  const elHeCount = document.getElementById('he-count');
  const elSmokeCount = document.getElementById('smoke-count');
  const elCash = document.getElementById('cash-tag');

  const elClock = document.getElementById('round-clock');
  const elPhase = document.getElementById('round-phase');
  const elRoundCounter = document.getElementById('round-counter');
  const elScoreAero = document.getElementById('score-aero');
  const elScoreHelix = document.getElementById('score-helix');

  const elActionPrompt = document.getElementById('action-prompt');
  const elActionText = document.getElementById('action-text');
  const elActionBarFill = document.getElementById('action-bar-fill');
  const elKillfeed = document.getElementById('killfeed');

  const elOverlayBuy = document.getElementById('overlay-buy');
  const elBuyGrid = document.getElementById('buy-grid-container');
  const elBuyCash = document.getElementById('buy-cash-display');
  const elBtnCloseBuy = document.getElementById('btn-close-buy');

  const elOverlayScore = document.getElementById('overlay-score');
  const elScoreBody = document.getElementById('scoreboard-body');

  const elOverlayEnd = document.getElementById('overlay-end');
  const elEndBanner = document.getElementById('round-outcome-banner');
  const elEndSub = document.getElementById('round-outcome-sub');
  const elEndCash = document.getElementById('end-cash-earned');
  const elEndReason = document.getElementById('end-reason');
  const elEndMatchScore = document.getElementById('end-match-score');
  const elBtnNextRound = document.getElementById('btn-next-round');

  const elOverlayStart = document.getElementById('overlay-start');
  const elBtnEnterGame = document.getElementById('btn-enter-game');

  const canvasMinimap = document.getElementById('minimap-canvas');
  const ctxMinimap = canvasMinimap ? canvasMinimap.getContext('2d') : null;

  let hitmarkerTimer = null;
  let damageTimer = null;
  let onBuyCallback = null;

  function updateCrosshair(spread) {
    const gap = Math.min(26, Math.floor(spread * 340));
    elRetTop.style.transform = `translateY(-${gap}px)`;
    elRetBottom.style.transform = `translateY(${gap}px)`;
    elRetLeft.style.transform = `translateX(-${gap}px)`;
    elRetRight.style.transform = `translateX(${gap}px)`;
  }

  function triggerHitmarker(isHeadshot = false, durationMs = 120) {
    if (hitmarkerTimer) clearTimeout(hitmarkerTimer);
    elHitmarker.classList.remove('headshot');
    if (isHeadshot) elHitmarker.classList.add('headshot');
    elHitmarker.classList.add('active');

    hitmarkerTimer = setTimeout(() => {
      elHitmarker.classList.remove('active');
    }, durationMs);
  }

  function triggerDamageFlash() {
    if (damageTimer) clearTimeout(damageTimer);
    elDamageInd.classList.add('active');
    damageTimer = setTimeout(() => {
      elDamageInd.classList.remove('active');
    }, 180);
  }

  function setScopeVisible(visible) {
    elScope.style.display = visible ? 'block' : 'none';
  }

  function updateHealth(hp) {
    elHp.textContent = String(Math.max(0, Math.ceil(hp)));
    elHp.style.color = hp <= 25 ? 'var(--team-helix)' : 'var(--plant)';
  }

  function updateShield(ap) {
    elAp.textContent = String(Math.max(0, Math.ceil(ap)));
  }

  function updateAmmo(mag, reserve, weaponName, weaponCategory = null, heCount = 1, smokeCount = 1) {
    elMag.textContent = String(mag);
    elRes.textContent = `/ ${reserve}`;
    if (weaponName) elGunName.textContent = weaponName.toUpperCase();
    if (weaponCategory) elGunCat.textContent = weaponCategory.toUpperCase();
    elMag.style.color = mag <= 5 ? 'var(--accent)' : 'var(--ink)';
    elHeCount.textContent = `✦ HE FRAG [${heCount}]`;
    elHeCount.className = `gear-item ${heCount > 0 ? 'gear-active' : ''}`;
    elSmokeCount.textContent = `☁ SMOKE [${smokeCount}]`;
    elSmokeCount.className = `gear-item ${smokeCount > 0 ? 'gear-active' : ''}`;
  }

  function updateCash(credits) {
    elCash.textContent = `$${credits.toLocaleString()} CREDITS`;
  }

  function updateClock(timeStr, phaseStr, roundCounterStr = null) {
    elClock.textContent = timeStr;
    if (phaseStr) elPhase.textContent = phaseStr;
    if (roundCounterStr) elRoundCounter.textContent = roundCounterStr;
  }

  function updateScores(scoreAero, scoreHelix) {
    elScoreAero.textContent = String(scoreAero);
    elScoreHelix.textContent = String(scoreHelix);
  }

  function showActionPrompt(text) {
    elActionPrompt.style.display = 'block';
    elActionText.textContent = text;
  }

  function updateActionProgress(ratio) {
    elActionBarFill.style.width = `${Math.min(100, ratio * 100)}%`;
  }

  function hideActionPrompt() {
    elActionPrompt.style.display = 'none';
    elActionBarFill.style.width = '0%';
  }

  function addKillCard(killerName, weaponName, victimName, isHeadshot = false, isEnemyKill = false) {
    const card = document.createElement('div');
    card.className = `kill-card ${isEnemyKill ? 'enemy-kill' : ''}`;
    card.innerHTML = `
      <span>${killerName}</span>
      <span class="kill-weapon">${weaponName}</span>
      ${isHeadshot ? '<span class="kill-head">✦ HEADSHOT</span>' : ''}
      <span>${victimName}</span>
    `;
    elKillfeed.appendChild(card);
    setTimeout(() => {
      if (card.parentNode) card.parentNode.removeChild(card);
    }, 4200);
  }

  function addNotification(msg, isAlert = false) {
    const card = document.createElement('div');
    card.className = 'kill-card';
    card.style.borderLeftColor = isAlert ? 'var(--accent)' : 'var(--plant)';
    card.innerHTML = `<span style="color:var(--accent);">⚠</span> <span>${msg}</span>`;
    elKillfeed.appendChild(card);
    setTimeout(() => {
      if (card.parentNode) card.parentNode.removeChild(card);
    }, 4200);
  }

  function updateMinimap(player, botsManager, world, rounds) {
    if (!ctxMinimap) return;
    const ctx = ctxMinimap;
    const size = 150;
    const center = size / 2;
    const scale = size / 84;

    ctx.clearRect(0, 0, size, size);

    ctx.fillStyle = 'rgba(28, 38, 52, 0.88)';
    ctx.beginPath();
    ctx.arc(center, center, center - 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#5c7088';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.save();
    ctx.translate(center, center);

    ctx.strokeStyle = '#71849a';
    ctx.lineWidth = 1;

    const xWest = -12 * scale;
    ctx.beginPath();
    ctx.moveTo(xWest, -36 * scale); ctx.lineTo(xWest, -6 * scale);
    ctx.moveTo(xWest, 6 * scale); ctx.lineTo(xWest, 36 * scale);
    ctx.stroke();

    const xEast = 12 * scale;
    ctx.beginPath();
    ctx.moveTo(xEast, -36 * scale); ctx.lineTo(xEast, -6 * scale);
    ctx.moveTo(xEast, 6 * scale); ctx.lineTo(xEast, 36 * scale);
    ctx.stroke();

    const posA = world.sites.alpha.position;
    ctx.fillStyle = 'rgba(16, 185, 129, 0.4)';
    ctx.beginPath();
    ctx.arc(posA.x * scale, posA.z * scale, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 9px ui-monospace, monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('A', posA.x * scale, posA.z * scale);

    const posB = world.sites.bravo.position;
    ctx.fillStyle = 'rgba(6, 182, 212, 0.4)';
    ctx.beginPath();
    ctx.arc(posB.x * scale, posB.z * scale, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#06b6d4';
    ctx.fillText('B', posB.x * scale, posB.z * scale);

    if (botsManager.droppedBeaconState && botsManager.droppedBeaconState.dropped) {
      const dbp = botsManager.droppedBeaconState.pos;
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(dbp.x * scale, dbp.z * scale, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const b of botsManager.bots) {
      if (b.dead) continue;
      const bx = b.mesh.position.x * scale;
      const bz = b.mesh.position.z * scale;
      ctx.fillStyle = b.team === 'aero' ? '#38bdf8' : '#ef4444';
      ctx.beginPath();
      ctx.arc(bx, bz, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }

    const px = player.state.position.x * scale;
    const pz = player.state.position.z * scale;
    const pYaw = player.state.yaw;

    ctx.fillStyle = 'rgba(248, 250, 252, 0.22)';
    ctx.beginPath();
    ctx.moveTo(px, pz);
    ctx.arc(px, pz, 16, pYaw - Math.PI / 2 - 0.45, pYaw - Math.PI / 2 + 0.45);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(px, pz, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    ctx.font = 'bold 8px ui-monospace, monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'center';
    ctx.fillText('N', center, 10);
    ctx.fillText('S', center, size - 4);
    ctx.fillText('W', 8, center + 3);
    ctx.fillText('E', size - 8, center + 3);
  }

  function showBuyMenu(currentCash, ownedSet) {
    elBuyCash.textContent = `$${currentCash.toLocaleString()}`;
    elBuyGrid.innerHTML = '';

    const categories = [
      {
        title: 'Tactical Sidearms',
        items: [
          { id: 'viper', name: 'Viper-9 Tactical', type: 'Sidearm', cost: 0, specs: '28 DMG • 400 RPM • 15 MAG' },
        ],
      },
      {
        title: 'Primary Armament',
        items: [
          { id: 'specter', name: 'Specter-9 Pulse', type: 'SMG', cost: 1600, specs: '22 DMG • 920 RPM • 35 MAG' },
          { id: 'breaker', name: 'Breaker-12 Tactical', type: 'Shotgun', cost: 1800, specs: '8x16 DMG • 92 RPM • 7 MAG' },
          { id: 'phalanx', name: 'Phalanx-4 Assault', type: 'Carbine', cost: 2900, specs: '34 DMG • 660 RPM • 30 MAG' },
          { id: 'longbow', name: 'Longbow-X Rail', type: 'Sniper', cost: 4600, specs: '115 DMG • 48 RPM • 5 MAG' },
        ],
      },
      {
        title: 'Tactical Gear & Throwables',
        items: [
          { id: 'shield', name: 'Kevlar Vest + Helmet', type: 'Armor', cost: 650, specs: '+100 ENERGY SHIELD' },
          { id: 'he_grenade', name: 'HE Frag Grenade', type: 'Explosive', cost: 300, specs: 'HIGH EXPLOSIVE BLAST' },
          { id: 'smoke_grenade', name: 'Aerosol Smoke', type: 'Tactical', cost: 300, specs: '15s SMOKE SCREEN' },
        ],
      },
    ];

    categories.forEach((cat) => {
      const catTitle = document.createElement('div');
      catTitle.className = 'buy-section-title';
      catTitle.textContent = cat.title;
      elBuyGrid.appendChild(catTitle);

      const grid = document.createElement('div');
      grid.className = 'buy-grid';

      cat.items.forEach((item) => {
        const card = document.createElement('div');
        card.className = 'buy-card';
        const isOwned = ownedSet && ownedSet.has(item.id);
        const canAfford = currentCash >= item.cost;
        const btnDisabled = !canAfford;

        card.innerHTML = `
          <div>
            <div class="buy-type">${item.type}</div>
            <div class="buy-title">${item.name}</div>
            <div class="buy-specs">${item.specs}</div>
          </div>
          <div class="buy-foot">
            <span class="buy-cost">${item.cost === 0 ? 'FREE' : `$${item.cost}`}</span>
            <button class="btn-buy" type="button" data-id="${item.id}" data-cost="${item.cost}" ${btnDisabled ? 'disabled' : ''}>
              ${isOwned ? 'EQUIP' : 'REQUISITION'}
            </button>
          </div>
        `;

        card.querySelector('.btn-buy').addEventListener('click', (e) => {
          const id = e.target.getAttribute('data-id');
          const cost = Number(e.target.getAttribute('data-cost'));
          if (onBuyCallback) onBuyCallback(id, cost);
        });

        grid.appendChild(card);
      });

      elBuyGrid.appendChild(grid);
    });

    elOverlayBuy.hidden = false;
  }

  function hideBuyMenu() {
    elOverlayBuy.hidden = true;
  }

  function setScoreboardVisible(visible) {
    if (visible) elOverlayScore.classList.add('active');
    else elOverlayScore.classList.remove('active');
  }

  function updateScoreboard(aeroRoster, helixRoster) {
    elScoreBody.innerHTML = '';

    const trAero = document.createElement('tr');
    trAero.className = 'team-header-row';
    trAero.innerHTML = `<td colspan="6" style="color:var(--team-aero);">AERO-SEC DEFENSE FORCE (DEFENDERS)</td>`;
    elScoreBody.appendChild(trAero);

    aeroRoster.forEach((op) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight:600;">${op.name}</td>
        <td style="color:var(--muted);">${op.role}</td>
        <td style="color:${op.alive ? 'var(--plant)' : 'var(--muted)'}; font-weight:600;">${op.alive ? 'OPERATIONAL' : 'NEUTRALIZED'}</td>
        <td class="score-mono">${op.kills}</td>
        <td class="score-mono">${op.deaths}</td>
        <td class="score-mono" style="color:var(--plant);">$${op.credits.toLocaleString()}</td>
      `;
      elScoreBody.appendChild(tr);
    });

    const trHelix = document.createElement('tr');
    trHelix.className = 'team-header-row';
    trHelix.innerHTML = `<td colspan="6" style="color:var(--team-helix); padding-top:18px;">HELIX SYNDICATE BREACH CORPS (INFILTRATORS)</td>`;
    elScoreBody.appendChild(trHelix);

    helixRoster.forEach((op) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight:600;">${op.name}</td>
        <td style="color:var(--muted);">${op.role}</td>
        <td style="color:${op.alive ? 'var(--team-helix)' : 'var(--muted)'}; font-weight:600;">${op.alive ? 'ACTIVE' : 'ELIMINATED'}</td>
        <td class="score-mono">${op.kills}</td>
        <td class="score-mono">${op.deaths}</td>
        <td class="score-mono" style="color:var(--plant);">$${op.credits.toLocaleString()}</td>
      `;
      elScoreBody.appendChild(tr);
    });
  }

  function showEndScreen(outcome, scoreAero, scoreHelix) {
    elEndBanner.textContent = outcome.title;
    elEndBanner.className = outcome.won ? 'win-text' : 'loss-text';
    elEndSub.textContent = outcome.won
      ? 'AeroSec operatives secured the sector and preserved core relay stability.'
      : 'Helix Syndicate forces compromised the relay terminal.';
    elEndCash.textContent = `+$${outcome.reward.toLocaleString()}`;
    elEndReason.textContent = outcome.reason;
    elEndMatchScore.textContent = `${scoreAero} - ${scoreHelix}`;
    elOverlayEnd.hidden = false;
  }

  function hideEndScreen() {
    elOverlayEnd.hidden = true;
  }

  function onBuy(callback) {
    onBuyCallback = callback;
  }

  function onPlay(callback) {
    elBtnEnterGame.addEventListener('click', () => {
      elOverlayStart.hidden = true;
      callback();
    });
    elBtnCloseBuy.addEventListener('click', () => {
      hideBuyMenu();
    });
    elBtnNextRound.addEventListener('click', () => {
      hideEndScreen();
    });
  }

  return {
    updateCrosshair,
    triggerHitmarker,
    triggerDamageFlash,
    setScopeVisible,
    updateHealth,
    updateShield,
    updateAmmo,
    updateCash,
    updateClock,
    updateScores,
    updateMinimap,
    showActionPrompt,
    updateActionProgress,
    hideActionPrompt,
    addKillCard,
    addNotification,
    showBuyMenu,
    hideBuyMenu,
    setScoreboardVisible,
    updateScoreboard,
    showEndScreen,
    hideEndScreen,
    onBuy,
    onPlay,
  };
}

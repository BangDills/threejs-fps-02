// DOM HUD management: crosshair bloom, hitmarker, killfeed, requisitions buy menu, and status bars.
import { WEAPON_CONFIGS } from './weapon.js';

export function createHud() {
  const elRetTop = document.getElementById('ret-top');
  const elRetBottom = document.getElementById('ret-bottom');
  const elRetLeft = document.getElementById('ret-left');
  const elRetRight = document.getElementById('ret-right');
  const elHitmarker = document.getElementById('hitmarker');

  const elHp = document.getElementById('hp-val');
  const elAp = document.getElementById('ap-val');
  const elGunName = document.getElementById('gun-name');
  const elMag = document.getElementById('mag-val');
  const elRes = document.getElementById('res-val');
  const elCash = document.getElementById('cash-tag');

  const elClock = document.getElementById('round-clock');
  const elPhase = document.getElementById('round-phase');
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

  const elOverlayEnd = document.getElementById('overlay-end');
  const elEndBanner = document.getElementById('round-outcome-banner');
  const elEndSub = document.getElementById('round-outcome-sub');
  const elEndCash = document.getElementById('end-cash-earned');
  const elEndReason = document.getElementById('end-reason');
  const elEndMatchScore = document.getElementById('end-match-score');
  const elBtnNextRound = document.getElementById('btn-next-round');

  const elOverlayStart = document.getElementById('overlay-start');
  const elBtnEnterGame = document.getElementById('btn-enter-game');

  let hitmarkerTimer = null;
  let onBuyCallback = null;

  function updateCrosshair(spread) {
    const gap = Math.min(24, Math.floor(spread * 320));
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

  function updateHealth(hp) {
    elHp.textContent = String(Math.max(0, Math.ceil(hp)));
    if (hp <= 25) {
      elHp.style.color = 'var(--team-helix)';
    } else {
      elHp.style.color = 'var(--plant)';
    }
  }

  function updateShield(ap) {
    elAp.textContent = String(Math.max(0, Math.ceil(ap)));
  }

  function updateAmmo(mag, reserve, weaponName) {
    elMag.textContent = String(mag);
    elRes.textContent = `/ ${reserve}`;
    if (weaponName) elGunName.textContent = weaponName.toUpperCase();
    if (mag <= 5) {
      elMag.style.color = 'var(--accent)';
    } else {
      elMag.style.color = 'var(--ink)';
    }
  }

  function updateCash(credits) {
    elCash.textContent = `$${credits.toLocaleString()} CREDITS`;
  }

  function updateClock(timeStr, phaseStr) {
    elClock.textContent = timeStr;
    if (phaseStr) elPhase.textContent = phaseStr;
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

  function showBuyMenu(currentCash, ownedSet) {
    elBuyCash.textContent = `$${currentCash.toLocaleString()}`;
    elBuyGrid.innerHTML = '';

    const items = [
      { id: 'viper', name: 'Viper-9 Tactical', type: 'Sidearm', cost: 0, specs: '28 DMG • 420 RPM • 15 MAG' },
      { id: 'specter', name: 'Specter-9 Pulse', type: 'SMG', cost: 1600, specs: '22 DMG • 920 RPM • 35 MAG' },
      { id: 'phalanx', name: 'Phalanx-4 Kinetic', type: 'Carbine', cost: 2900, specs: '34 DMG • 660 RPM • 30 MAG' },
      { id: 'longbow', name: 'Longbow-X Rail', type: 'Heavy Sniper', cost: 4600, specs: '115 DMG • 45 RPM • 5 MAG' },
      { id: 'shield', name: 'Kevlar Vest + Helmet', type: 'Protection', cost: 650, specs: '+100 SHIELD CAPACITY' },
    ];

    items.forEach((item) => {
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

      elBuyGrid.appendChild(card);
    });

    elOverlayBuy.hidden = false;
  }

  function hideBuyMenu() {
    elOverlayBuy.hidden = true;
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
    updateHealth,
    updateShield,
    updateAmmo,
    updateCash,
    updateClock,
    updateScores,
    showActionPrompt,
    updateActionProgress,
    hideActionPrompt,
    addKillCard,
    addNotification,
    showBuyMenu,
    hideBuyMenu,
    showEndScreen,
    hideEndScreen,
    onBuy,
    onPlay,
  };
}

// Round flow, tactical economy, buy menu requisitions, and Quantum Beacon plant/defuse objectives.
import * as THREE from 'three';
import { soundEngine } from './audio.js';

export function createRoundManager(world, hud, weaponSystem, player) {
  const state = {
    roundNumber: 1,
    maxRounds: 13,
    phase: 'START_FREEZE', // 'START_FREEZE', 'ROUND_LIVE', 'BEACON_PLANTED', 'ROUND_OVER'
    timer: 5.0,
    roundClock: 100,
    plantedTime: 40.0,
    scoreAero: 0,
    scoreHelix: 0,
    credits: 800,
    lossStreak: 0,
    plantedSite: null, // 'A' or 'B'
    plantProgress: 0,
    defuseProgress: 0,
    plantTargetTime: 3.5,
    defuseTargetTime: 5.0,
    roundOutcome: null,
    buyMenuOpen: false,
    ownedWeapons: new Set(['viper', 'phalanx']),
    playerStats: { kills: 0, deaths: 0 },
    rosterStats: {
      aero_1: { kills: 0, deaths: 0, credits: 800 },
      aero_2: { kills: 0, deaths: 0, credits: 800 },
      helix_1: { kills: 0, deaths: 0, credits: 800 },
      helix_2: { kills: 0, deaths: 0, credits: 800 },
      helix_3: { kills: 0, deaths: 0, credits: 800 },
    },
  };

  function openBuyMenu() {
    state.buyMenuOpen = true;
    hud.showBuyMenu(state.credits, state.ownedWeapons);
  }

  function closeBuyMenu() {
    state.buyMenuOpen = false;
    hud.hideBuyMenu();
  }

  function buyItem(itemId, cost) {
    if (state.credits < cost) return false;

    if (itemId === 'shield') {
      if (player.state.shield >= 100) return false;
      state.credits -= cost;
      player.state.shield = 100;
      hud.updateCash(state.credits);
      hud.updateShield(player.state.shield);
      hud.showBuyMenu(state.credits, state.ownedWeapons);
      return true;
    }

    if (itemId === 'he_grenade') {
      if (weaponSystem.state.heGrenades >= 2) return false;
      state.credits -= cost;
      weaponSystem.state.heGrenades += 1;
      hud.updateCash(state.credits);
      hud.updateAmmo(weaponSystem.state.mag, weaponSystem.state.reserve, weaponSystem.state.config.name, weaponSystem.state.config.category, weaponSystem.state.heGrenades, weaponSystem.state.smokeGrenades);
      hud.showBuyMenu(state.credits, state.ownedWeapons);
      return true;
    }

    if (itemId === 'smoke_grenade') {
      if (weaponSystem.state.smokeGrenades >= 2) return false;
      state.credits -= cost;
      weaponSystem.state.smokeGrenades += 1;
      hud.updateCash(state.credits);
      hud.updateAmmo(weaponSystem.state.mag, weaponSystem.state.reserve, weaponSystem.state.config.name, weaponSystem.state.config.category, weaponSystem.state.heGrenades, weaponSystem.state.smokeGrenades);
      hud.showBuyMenu(state.credits, state.ownedWeapons);
      return true;
    }

    state.credits -= cost;
    state.ownedWeapons.add(itemId);
    weaponSystem.selectWeapon(itemId);
    hud.updateCash(state.credits);
    hud.updateAmmo(weaponSystem.state.mag, weaponSystem.state.reserve, weaponSystem.state.config.name, weaponSystem.state.config.category, weaponSystem.state.heGrenades, weaponSystem.state.smokeGrenades);
    hud.showBuyMenu(state.credits, state.ownedWeapons);
    return true;
  }

  function addKillReward() {
    state.credits += 300;
    state.playerStats.kills += 1;
    hud.updateCash(state.credits);
  }

  function syncScoreboard(botsManager) {
    const aeroRoster = [
      {
        name: 'Operative (You)',
        role: 'ASSAULT',
        alive: !player.state.dead,
        kills: state.playerStats.kills,
        deaths: state.playerStats.deaths,
        credits: state.credits,
      },
    ];

    const helixRoster = [];

    botsManager.bots.forEach((b) => {
      const s = state.rosterStats[b.id] || { kills: 0, deaths: 0, credits: 1200 };
      const item = {
        name: b.name,
        role: b.role,
        alive: !b.dead,
        kills: s.kills,
        deaths: s.deaths,
        credits: s.credits,
      };
      if (b.team === 'aero') {
        aeroRoster.push(item);
      } else {
        helixRoster.push(item);
      }
    });

    hud.updateScoreboard(aeroRoster, helixRoster);
  }

  function startNewRound() {
    state.phase = 'START_FREEZE';
    state.timer = 5.0;
    state.roundClock = 100;
    state.plantedTime = 40.0;
    state.plantedSite = null;
    state.plantProgress = 0;
    state.defuseProgress = 0;
    state.roundOutcome = null;

    player.respawn(new THREE.Vector3(0, 0, -28));
    weaponSystem.state.mag = weaponSystem.state.config.magSize;
    weaponSystem.state.reserve = weaponSystem.state.config.reserveMax;

    hud.hideEndScreen();
    hud.updateScores(state.scoreAero, state.scoreHelix);
    hud.updateClock('01:40', 'FREEZE PHASE: SHOP OPEN', `ROUND ${state.roundNumber} / ${state.maxRounds}`);
    hud.updateCash(state.credits);
    hud.updateAmmo(weaponSystem.state.mag, weaponSystem.state.reserve, weaponSystem.state.config.name, weaponSystem.state.config.category, weaponSystem.state.heGrenades, weaponSystem.state.smokeGrenades);
    hud.updateHealth(player.state.hp);
    hud.updateShield(player.state.shield);
    hud.hideActionPrompt();

    openBuyMenu();
  }

  function endRound(winner, reason) {
    if (state.phase === 'ROUND_OVER') return;
    state.phase = 'ROUND_OVER';
    state.timer = 6.0;

    const won = winner === 'aero';
    if (won) {
      state.scoreAero += 1;
      state.lossStreak = 0;
      const reward = 3250;
      state.credits += reward;
      state.roundOutcome = { title: 'ROUND SECURED', won: true, reason, reward };
      soundEngine.playRoundEnd(true);
    } else {
      state.scoreHelix += 1;
      state.lossStreak += 1;
      const reward = Math.min(2400, 1400 + (state.lossStreak - 1) * 500);
      state.credits += reward;
      state.roundOutcome = { title: 'ROUND LOST', won: false, reason, reward };
      soundEngine.playRoundEnd(false);
    }

    if (player.state.dead) state.playerStats.deaths += 1;

    hud.updateScores(state.scoreAero, state.scoreHelix);
    hud.showEndScreen(state.roundOutcome, state.scoreAero, state.scoreHelix);
  }

  function isInsideSite(pos, site) {
    const dx = pos.x - site.position.x;
    const dz = pos.z - site.position.z;
    return Math.hypot(dx, dz) <= site.radius;
  }

  function step(dt, botsManager, keys, effects) {
    syncScoreboard(botsManager);

    if (state.phase === 'START_FREEZE') {
      state.timer -= dt;
      hud.updateClock(`00:0${Math.max(0, Math.ceil(state.timer))}`, 'TACTICAL FREEZE', `ROUND ${state.roundNumber} / ${state.maxRounds}`);
      if (state.timer <= 0) {
        state.phase = 'ROUND_LIVE';
        state.roundClock = 100;
        closeBuyMenu();
      }
      return;
    }

    if (state.phase === 'ROUND_OVER') {
      state.timer -= dt;
      if (state.timer <= 0) {
        state.roundNumber += 1;
        startNewRound();
        botsManager.resetBots();
        if (effects) effects.clear();
      }
      return;
    }

    // Check squad eliminations
    const aliveAero = (!player.state.dead ? 1 : 0) + botsManager.bots.filter((b) => b.team === 'aero' && !b.dead).length;
    const aliveHelix = botsManager.bots.filter((b) => b.team === 'helix' && !b.dead).length;

    if (aliveHelix === 0 && state.phase !== 'BEACON_PLANTED') {
      endRound('aero', 'HOSTILE SQUAD ELIMINATED');
      return;
    }
    if (aliveAero === 0) {
      endRound('helix', 'AERO-SEC SQUAD NEUTRALIZED');
      return;
    }

    // Standard live round
    if (state.phase === 'ROUND_LIVE') {
      state.roundClock -= dt;
      const mins = Math.floor(state.roundClock / 60);
      const secs = Math.floor(state.roundClock % 60);
      hud.updateClock(`${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`, 'TACTICAL ASSAULT', `ROUND ${state.roundNumber} / ${state.maxRounds}`);

      if (state.roundClock <= 0) {
        endRound('aero', 'TIME EXPIRED: RELAY PRESERVED');
        return;
      }

      // Check if Helix bots plant beacon at Site A or Site B
      for (const bot of botsManager.bots) {
        if (bot.team === 'helix' && !bot.dead && bot.hasBeacon) {
          if (isInsideSite(bot.mesh.position, world.sites.alpha)) {
            state.phase = 'BEACON_PLANTED';
            state.plantedSite = 'A';
            state.plantedTime = 40.0;
            if (effects) effects.activateBeacon(world.sites.alpha.position);
            soundEngine.playBeaconBeep(true);
            hud.addNotification('BEACON CALIBRATED AT SITE ALPHA', true);
            break;
          } else if (isInsideSite(bot.mesh.position, world.sites.bravo)) {
            state.phase = 'BEACON_PLANTED';
            state.plantedSite = 'B';
            state.plantedTime = 40.0;
            if (effects) effects.activateBeacon(world.sites.bravo.position);
            soundEngine.playBeaconBeep(true);
            hud.addNotification('BEACON CALIBRATED AT SITE BRAVO', true);
            break;
          }
        }
      }
    }

    // Beacon planted countdown
    if (state.phase === 'BEACON_PLANTED') {
      state.plantedTime -= dt;
      hud.updateClock(`00:${String(Math.max(0, Math.floor(state.plantedTime))).padStart(2, '0')}`, `BEACON ACTIVE AT SITE ${state.plantedSite}`, `ROUND ${state.roundNumber} / ${state.maxRounds}`);

      // Warning beep with accelerating tempo
      const beepInterval = state.plantedTime < 10 ? 0.4 : (state.plantedTime < 20 ? 0.8 : 1.4);
      if (Math.floor(state.plantedTime / beepInterval) !== Math.floor((state.plantedTime + dt) / beepInterval)) {
        soundEngine.playBeaconBeep(state.plantedTime < 10);
      }

      if (state.plantedTime <= 0) {
        soundEngine.playExplosion();
        if (effects) {
          const sitePos = state.plantedSite === 'A' ? world.sites.alpha.position : world.sites.bravo.position;
          effects.spawnExplosion(sitePos);
        }
        endRound('helix', 'QUANTUM BEACON DETONATED');
        return;
      }

      // Player Defusing Check
      const targetSite = state.plantedSite === 'A' ? world.sites.alpha : world.sites.bravo;
      if (isInsideSite(player.state.position, targetSite) && !player.state.dead) {
        hud.showActionPrompt('HOLD [E] TO DISARM BEACON');
        if (keys.has('KeyE')) {
          state.defuseProgress += dt;
          hud.updateActionProgress(state.defuseProgress / state.defuseTargetTime);
          if (state.defuseProgress >= state.defuseTargetTime) {
            hud.hideActionPrompt();
            state.credits += 300;
            endRound('aero', 'QUANTUM BEACON DISARMED');
            return;
          }
        } else {
          state.defuseProgress = 0;
          hud.updateActionProgress(0);
        }
      } else {
        hud.hideActionPrompt();
        state.defuseProgress = 0;
      }
    }
  }

  return {
    state,
    openBuyMenu,
    closeBuyMenu,
    buyItem,
    addKillReward,
    syncScoreboard,
    startNewRound,
    endRound,
    step,
  };
}

// Round flow, economy, buy menu, and Quantum Beacon plant/defuse objectives.
import * as THREE from 'three';
import { soundEngine } from './audio.js';

export function createRoundManager(world, hud, weaponSystem, player) {
  const state = {
    roundNumber: 1,
    phase: 'START_FREEZE', // START_FREEZE, ROUND_LIVE, BEACON_PLANTED, ROUND_OVER
    timer: 5.0,
    roundClock: 105,
    plantedTime: 40.0,
    scoreAero: 0,
    scoreHelix: 0,
    credits: 800,
    plantedSite: null, // 'A' or 'B'
    plantProgress: 0,
    defuseProgress: 0,
    plantTargetTime: 3.5,
    defuseTargetTime: 5.0,
    roundOutcome: null,
    buyMenuOpen: false,
    ownedWeapons: new Set(['viper', 'phalanx']),
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

    state.credits -= cost;
    state.ownedWeapons.add(itemId);
    weaponSystem.selectWeapon(itemId);
    hud.updateCash(state.credits);
    hud.updateAmmo(weaponSystem.state.mag, weaponSystem.state.reserve, weaponSystem.state.config.name);
    hud.showBuyMenu(state.credits, state.ownedWeapons);
    return true;
  }

  function addKillReward() {
    state.credits += 300;
    hud.updateCash(state.credits);
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

    // Reset player position and weapon
    player.respawn(new THREE.Vector3(0, 0, -28));
    weaponSystem.state.mag = weaponSystem.state.config.magSize;
    weaponSystem.state.reserve = weaponSystem.state.config.reserveMax;

    hud.hideEndScreen();
    hud.updateScores(state.scoreAero, state.scoreHelix);
    hud.updateClock('01:40', 'FREEZE PHASE: SHOP OPEN');
    hud.updateCash(state.credits);
    hud.updateAmmo(weaponSystem.state.mag, weaponSystem.state.reserve, weaponSystem.state.config.name);
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
      state.credits += 3250;
      state.roundOutcome = { title: 'ROUND SECURED', won: true, reason, reward: 3250 };
      soundEngine.playRoundEnd(true);
    } else {
      state.scoreHelix += 1;
      state.credits += 1400;
      state.roundOutcome = { title: 'ROUND LOST', won: false, reason, reward: 1400 };
      soundEngine.playRoundEnd(false);
    }

    hud.updateScores(state.scoreAero, state.scoreHelix);
    hud.showEndScreen(state.roundOutcome, state.scoreAero, state.scoreHelix);
  }

  function isInsideSite(pos, site) {
    const dx = pos.x - site.position.x;
    const dz = pos.z - site.position.z;
    return Math.hypot(dx, dz) <= site.radius;
  }

  function step(dt, botsManager, keys, effects) {
    if (state.phase === 'START_FREEZE') {
      state.timer -= dt;
      hud.updateClock(`00:0${Math.max(0, Math.ceil(state.timer))}`, 'TACTICAL FREEZE');
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
      }
      return;
    }

    // Check eliminations
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
      hud.updateClock(`${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`, 'TACTICAL ASSAULT');

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
      hud.updateClock(`00:${String(Math.max(0, Math.floor(state.plantedTime))).padStart(2, '0')}`, `BEACON ACTIVE AT SITE ${state.plantedSite}`);

      // Periodic warning beep
      if (Math.floor(state.plantedTime * 2) % 2 === 0 && Math.random() < 0.15) {
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
    startNewRound,
    endRound,
    step,
  };
}

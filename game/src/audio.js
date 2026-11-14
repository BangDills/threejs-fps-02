// WebAudio procedural sound synthesizer: zero binary audio assets.
let ctx = null;

function getAudioContext() {
  if (!ctx && (typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext))) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    ctx = new AudioCtx();
  }
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
  return ctx;
}

// Generate a noise buffer for gunshot transients and explosions
let cachedNoise = null;
function getNoiseBuffer(ac) {
  if (cachedNoise) return cachedNoise;
  const bufferSize = ac.sampleRate * 2;
  const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  cachedNoise = buffer;
  return buffer;
}

export const soundEngine = {
  playGunshot(type = 'rifle') {
    const ac = getAudioContext();
    if (!ac) return;
    const now = ac.currentTime;

    const noise = ac.createBufferSource();
    noise.buffer = getNoiseBuffer(ac);

    const filter = ac.createBiquadFilter();
    const gain = ac.createGain();

    if (type === 'pistol') {
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400, now);
      filter.Q.setValueAtTime(1.5, now);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      noise.connect(filter).connect(gain).connect(ac.destination);
      noise.start(now);
      noise.stop(now + 0.15);
    } else if (type === 'smg') {
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1800, now);
      filter.Q.setValueAtTime(2.0, now);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
      noise.connect(filter).connect(gain).connect(ac.destination);
      noise.start(now);
      noise.stop(now + 0.12);
    } else if (type === 'sniper') {
      // Heavy boom + high snap
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, now);
      filter.frequency.exponentialRampToValueAtTime(100, now + 0.35);
      gain.gain.setValueAtTime(0.65, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
      noise.connect(filter).connect(gain).connect(ac.destination);
      noise.start(now);
      noise.stop(now + 0.4);

      // Low sub oscillator
      const osc = ac.createOscillator();
      const oscGain = ac.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(130, now);
      osc.frequency.exponentialRampToValueAtTime(35, now + 0.28);
      oscGain.gain.setValueAtTime(0.5, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.connect(oscGain).connect(ac.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    } else {
      // Standard rifle
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2200, now);
      filter.frequency.exponentialRampToValueAtTime(280, now + 0.22);
      gain.gain.setValueAtTime(0.45, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      noise.connect(filter).connect(gain).connect(ac.destination);
      noise.start(now);
      noise.stop(now + 0.24);

      const osc = ac.createOscillator();
      const oscGain = ac.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.18);
      oscGain.gain.setValueAtTime(0.4, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.connect(oscGain).connect(ac.destination);
      osc.start(now);
      osc.stop(now + 0.2);
    }
  },

  playHit(isHeadshot = false) {
    const ac = getAudioContext();
    if (!ac) return;
    const now = ac.currentTime;

    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sine';

    if (isHeadshot) {
      osc.frequency.setValueAtTime(2200, now);
      osc.frequency.exponentialRampToValueAtTime(3200, now + 0.08);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    } else {
      osc.frequency.setValueAtTime(1400, now);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    }

    osc.connect(gain).connect(ac.destination);
    osc.start(now);
    osc.stop(now + (isHeadshot ? 0.14 : 0.08));
  },

  playReload() {
    const ac = getAudioContext();
    if (!ac) return;
    const now = ac.currentTime;

    // Click 1 (mag drop)
    const osc1 = ac.createOscillator();
    const g1 = ac.createGain();
    osc1.type = 'square';
    osc1.frequency.setValueAtTime(800, now);
    g1.gain.setValueAtTime(0.15, now);
    g1.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc1.connect(g1).connect(ac.destination);
    osc1.start(now);
    osc1.stop(now + 0.07);

    // Click 2 (mag insert)
    const osc2 = ac.createOscillator();
    const g2 = ac.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(450, now + 0.6);
    g2.gain.setValueAtTime(0.2, now + 0.6);
    g2.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
    osc2.connect(g2).connect(ac.destination);
    osc2.start(now + 0.6);
    osc2.stop(now + 0.72);

    // Click 3 (bolt rack)
    const osc3 = ac.createOscillator();
    const g3 = ac.createGain();
    osc3.type = 'sawtooth';
    osc3.frequency.setValueAtTime(1100, now + 1.2);
    g3.gain.setValueAtTime(0.2, now + 1.2);
    g3.gain.exponentialRampToValueAtTime(0.001, now + 1.3);
    osc3.connect(g3).connect(ac.destination);
    osc3.start(now + 1.2);
    osc3.stop(now + 1.32);
  },

  playBeaconBeep(fast = false) {
    const ac = getAudioContext();
    if (!ac) return;
    const now = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(fast ? 1900 : 1200, now);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain).connect(ac.destination);
    osc.start(now);
    osc.stop(now + 0.09);
  },

  playStep() {
    const ac = getAudioContext();
    if (!ac) return;
    const now = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(75, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.05);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc.connect(gain).connect(ac.destination);
    osc.start(now);
    osc.stop(now + 0.07);
  },

  playRoundEnd(won = true) {
    const ac = getAudioContext();
    if (!ac) return;
    const now = ac.currentTime;
    const freqs = won ? [440, 554, 659, 880] : [392, 349, 311, 261];
    freqs.forEach((f, idx) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = won ? 'triangle' : 'sawtooth';
      osc.frequency.setValueAtTime(f, now + idx * 0.12);
      gain.gain.setValueAtTime(0.15, now + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.35);
      osc.connect(gain).connect(ac.destination);
      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 0.4);
    });
  },

  playExplosion() {
    const ac = getAudioContext();
    if (!ac) return;
    const now = ac.currentTime;
    const noise = ac.createBufferSource();
    noise.buffer = getNoiseBuffer(ac);
    const filter = ac.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, now);
    filter.frequency.exponentialRampToValueAtTime(60, now + 1.2);
    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.8, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
    noise.connect(filter).connect(gain).connect(ac.destination);
    noise.start(now);
    noise.stop(now + 1.6);
  },
};

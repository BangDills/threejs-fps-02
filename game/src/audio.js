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
      filter.frequency.setValueAtTime(1450, now);
      filter.Q.setValueAtTime(1.6, now);
      gain.gain.setValueAtTime(0.38, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
      noise.connect(filter).connect(gain).connect(ac.destination);
      noise.start(now);
      noise.stop(now + 0.14);
    } else if (type === 'smg') {
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1750, now);
      filter.Q.setValueAtTime(2.1, now);
      gain.gain.setValueAtTime(0.32, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.10);
      noise.connect(filter).connect(gain).connect(ac.destination);
      noise.start(now);
      noise.stop(now + 0.11);
    } else if (type === 'shotgun') {
      // Heavy wide blast: dual filter + low boom + pump action delay
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1600, now);
      filter.frequency.exponentialRampToValueAtTime(120, now + 0.28);
      gain.gain.setValueAtTime(0.65, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      noise.connect(filter).connect(gain).connect(ac.destination);
      noise.start(now);
      noise.stop(now + 0.3);

      const osc = ac.createOscillator();
      const oscGain = ac.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(32, now + 0.25);
      oscGain.gain.setValueAtTime(0.55, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(oscGain).connect(ac.destination);
      osc.start(now);
      osc.stop(now + 0.26);

      // Pump action mechanical cycle at +0.32s
      const pump = ac.createOscillator();
      const pGain = ac.createGain();
      pump.type = 'square';
      pump.frequency.setValueAtTime(420, now + 0.32);
      pump.frequency.exponentialRampToValueAtTime(180, now + 0.42);
      pGain.gain.setValueAtTime(0.18, now + 0.32);
      pGain.gain.exponentialRampToValueAtTime(0.001, now + 0.44);
      pump.connect(pGain).connect(ac.destination);
      pump.start(now + 0.32);
      pump.stop(now + 0.46);
    } else if (type === 'sniper') {
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(950, now);
      filter.frequency.exponentialRampToValueAtTime(90, now + 0.38);
      gain.gain.setValueAtTime(0.7, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      noise.connect(filter).connect(gain).connect(ac.destination);
      noise.start(now);
      noise.stop(now + 0.42);

      const osc = ac.createOscillator();
      const oscGain = ac.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.32);
      oscGain.gain.setValueAtTime(0.5, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
      osc.connect(oscGain).connect(ac.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } else {
      // Standard rifle
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2200, now);
      filter.frequency.exponentialRampToValueAtTime(260, now + 0.22);
      gain.gain.setValueAtTime(0.46, now);
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

  playDryFire() {
    const ac = getAudioContext();
    if (!ac) return;
    const now = ac.currentTime;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(900, now);
    g.gain.setValueAtTime(0.18, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(g).connect(ac.destination);
    osc.start(now);
    osc.stop(now + 0.06);
  },

  playHit(isHeadshot = false) {
    const ac = getAudioContext();
    if (!ac) return;
    const now = ac.currentTime;

    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sine';

    if (isHeadshot) {
      // Crisp metallic headshot "dink"
      osc.frequency.setValueAtTime(2400, now);
      osc.frequency.exponentialRampToValueAtTime(3400, now + 0.1);
      gain.gain.setValueAtTime(0.45, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    } else {
      osc.frequency.setValueAtTime(1400, now);
      gain.gain.setValueAtTime(0.24, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    }

    osc.connect(gain).connect(ac.destination);
    osc.start(now);
    osc.stop(now + (isHeadshot ? 0.16 : 0.08));
  },

  playReload() {
    const ac = getAudioContext();
    if (!ac) return;
    const now = ac.currentTime;

    // Mag drop
    const osc1 = ac.createOscillator();
    const g1 = ac.createGain();
    osc1.type = 'square';
    osc1.frequency.setValueAtTime(750, now);
    g1.gain.setValueAtTime(0.16, now);
    g1.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc1.connect(g1).connect(ac.destination);
    osc1.start(now);
    osc1.stop(now + 0.07);

    // Mag insert
    const osc2 = ac.createOscillator();
    const g2 = ac.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(460, now + 0.55);
    g2.gain.setValueAtTime(0.22, now + 0.55);
    g2.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
    osc2.connect(g2).connect(ac.destination);
    osc2.start(now + 0.55);
    osc2.stop(now + 0.68);

    // Bolt rack
    const osc3 = ac.createOscillator();
    const g3 = ac.createGain();
    osc3.type = 'sawtooth';
    osc3.frequency.setValueAtTime(1150, now + 1.15);
    g3.gain.setValueAtTime(0.2, now + 1.15);
    g3.gain.exponentialRampToValueAtTime(0.001, now + 1.25);
    osc3.connect(g3).connect(ac.destination);
    osc3.start(now + 1.15);
    osc3.stop(now + 1.28);
  },

  playGrenadeBounce() {
    const ac = getAudioContext();
    if (!ac) return;
    const now = ac.currentTime;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);
    g.gain.setValueAtTime(0.3, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.connect(g).connect(ac.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  },

  playSmokeHiss() {
    const ac = getAudioContext();
    if (!ac) return;
    const now = ac.currentTime;
    const noise = ac.createBufferSource();
    noise.buffer = getNoiseBuffer(ac);
    const filter = ac.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(3200, now);
    filter.Q.setValueAtTime(3.0, now);
    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.6);
    noise.connect(filter).connect(gain).connect(ac.destination);
    noise.start(now);
    noise.stop(now + 1.7);
  },

  playBeaconBeep(fast = false) {
    const ac = getAudioContext();
    if (!ac) return;
    const now = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(fast ? 1950 : 1250, now);
    gain.gain.setValueAtTime(0.22, now);
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
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.exponentialRampToValueAtTime(32, now + 0.05);
    gain.gain.setValueAtTime(0.14, now);
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
      gain.gain.setValueAtTime(0.16, now + idx * 0.12);
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
    filter.frequency.setValueAtTime(450, now);
    filter.frequency.exponentialRampToValueAtTime(50, now + 1.2);
    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.85, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
    noise.connect(filter).connect(gain).connect(ac.destination);
    noise.start(now);
    noise.stop(now + 1.6);
  },
};

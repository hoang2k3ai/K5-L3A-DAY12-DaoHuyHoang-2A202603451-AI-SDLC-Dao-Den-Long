// Tiny WebAudio synth for every required sound cue. No external audio assets,
// so CREDITS stays simple and the build has no binary dependencies.
export function createSfx() {
  let ctx = null;
  let master = null;
  let ambience = null;
  let muted = false;
  let volume = 0.7;

  function ensure() {
    if (typeof window === 'undefined') return null;
    if (!ctx) {
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtor) return null;
      ctx = new AudioCtor();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : volume;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function applyGain() {
    if (!master || !ctx) return;
    const target = muted ? 0 : volume;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(target, ctx.currentTime, 0.05);
  }

  function blip({ freq = 440, end = freq, dur = 0.12, type = 'sine', gain = 0.06, when = 0 }) {
    const ac = ensure();
    if (!ac || !master) return;
    const start = ac.currentTime + when;
    const osc = ac.createOscillator();
    const amp = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (end !== freq) osc.frequency.exponentialRampToValueAtTime(Math.max(24, end), start + dur);
    amp.gain.setValueAtTime(0.0001, start);
    amp.gain.exponentialRampToValueAtTime(gain, start + 0.012);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(amp).connect(master);
    osc.start(start);
    osc.stop(start + dur + 0.02);
  }

  function noise({ dur = 0.4, gain = 0.04, freq = 900, when = 0, type = 'bandpass' }) {
    const ac = ensure();
    if (!ac || !master) return;
    const start = ac.currentTime + when;
    const length = Math.max(1, Math.floor(ac.sampleRate * dur));
    const buffer = ac.createBuffer(1, length, ac.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = ac.createBufferSource();
    source.buffer = buffer;
    const filter = ac.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    filter.Q.value = 0.8;
    const amp = ac.createGain();
    amp.gain.setValueAtTime(gain, start);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    source.connect(filter).connect(amp).connect(master);
    source.start(start);
  }

  /** Low wind bed, started once after the first user gesture. */
  function startAmbience() {
    const ac = ensure();
    if (!ac || ambience) return;
    const gain = ac.createGain();
    gain.gain.value = 0.016;
    const filter = ac.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    const oscA = ac.createOscillator();
    const oscB = ac.createOscillator();
    oscA.type = 'sine';
    oscB.type = 'sine';
    oscA.frequency.value = 92;
    oscB.frequency.value = 96.5;
    const lfo = ac.createOscillator();
    const lfoGain = ac.createGain();
    lfo.frequency.value = 0.07;
    lfoGain.gain.value = 140;
    lfo.connect(lfoGain).connect(filter.frequency);
    oscA.connect(filter);
    oscB.connect(filter);
    filter.connect(gain).connect(master);
    oscA.start();
    oscB.start();
    lfo.start();
    ambience = { gain, oscA, oscB, lfo };
  }

  return {
    unlock() {
      try {
        ensure();
        startAmbience();
      } catch {
        /* audio is optional */
      }
    },
    setVolume(value) {
      volume = Math.min(1, Math.max(0, value));
      applyGain();
    },
    setMuted(value) {
      muted = Boolean(value);
      applyGain();
    },
    isMuted() {
      return muted;
    },
    toggle() {
      muted = !muted;
      applyGain();
      return muted;
    },
    pickup() {
      blip({ freq: 900, end: 1380, dur: 0.1, gain: 0.05 });
    },
    deposit() {
      blip({ freq: 320, end: 460, dur: 0.16, gain: 0.05, type: 'triangle' });
    },
    lantern() {
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, index) => {
        blip({ freq, dur: 0.55, gain: 0.04, when: index * 0.07, type: 'triangle' });
      });
    },
    pulse() {
      blip({ freq: 170, end: 640, dur: 0.3, gain: 0.055, type: 'sawtooth' });
      noise({ dur: 0.28, gain: 0.03, freq: 700 });
    },
    dash() {
      noise({ dur: 0.22, gain: 0.05, freq: 1600 });
      blip({ freq: 420, end: 900, dur: 0.14, gain: 0.035, type: 'triangle' });
    },
    jump() {
      blip({ freq: 260, end: 520, dur: 0.15, gain: 0.035, type: 'triangle' });
    },
    countdown(seconds) {
      blip({ freq: seconds <= 3 ? 880 : 587, dur: 0.12, gain: 0.045 });
    },
    music(night) {
      const root = [130.81, 146.83, 110][night - 1];
      [1, 1.5, 2, 1.2].forEach((ratio, index) => {
        blip({ freq: root * ratio, dur: 1.6, gain: 0.017, when: index * 1.4 });
      });
    },
    charm() {
      [880, 1174.66, 1567.98].forEach((freq, index) => {
        blip({ freq, dur: 0.32, gain: 0.035, when: index * 0.06, type: 'sine' });
      });
    },
    steal() {
      blip({ freq: 620, end: 180, dur: 0.34, gain: 0.05, type: 'triangle' });
    },
    drop() {
      [392, 523.25, 659.25].forEach((freq, index) => {
        blip({ freq, dur: 0.2, gain: 0.03, when: index * 0.05, type: 'sine' });
      });
    },
    wind() {
      noise({ dur: 1.1, gain: 0.05, freq: 520, type: 'highpass' });
      blip({ freq: 130, end: 90, dur: 1.2, gain: 0.03, type: 'sine' });
    },
    hit() {
      blip({ freq: 160, end: 65, dur: 0.32, gain: 0.07, type: 'sawtooth' });
    },
    spawn() {
      blip({ freq: 240, end: 100, dur: 0.28, gain: 0.028, type: 'triangle' });
    },
    pause() {
      blip({ freq: 300, end: 200, dur: 0.1, gain: 0.03, type: 'sine' });
    },
    nightStart() {
      [196, 261.63, 329.63, 392].forEach((freq, index) => {
        blip({ freq, dur: 1.1, gain: 0.035, when: index * 0.16, type: 'sine' });
      });
    },
    dawn() {
      noise({ dur: 2.4, gain: 0.045, freq: 1200, type: 'highpass' });
      [261.63, 329.63, 392, 523.25].forEach((freq, index) => {
        blip({ freq, dur: 1.6, gain: 0.03, when: index * 0.25, type: 'sine' });
      });
    },
    end(won) {
      if (won) {
        [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((freq, index) => {
          blip({ freq, dur: 0.6, gain: 0.045, when: index * 0.1, type: 'triangle' });
        });
      } else {
        [392, 329.63, 261.63, 196].forEach((freq, index) => {
          blip({ freq, dur: 0.7, gain: 0.05, when: index * 0.14, type: 'sine' });
        });
      }
    },
  };
}

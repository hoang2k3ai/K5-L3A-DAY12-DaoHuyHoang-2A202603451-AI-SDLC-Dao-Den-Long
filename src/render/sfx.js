// Tiny WebAudio synth. No external audio assets, so CREDITS stays simple.
export function createSfx() {
  let ctx = null;
  let muted = false;

  function ensure() {
    if (typeof window === 'undefined') return null;
    if (!ctx) {
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtor) return null;
      ctx = new AudioCtor();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function blip({ freq = 440, end = freq, dur = 0.12, type = 'sine', gain = 0.06, when = 0 }) {
    const ac = ensure();
    if (!ac || muted) return;
    const start = ac.currentTime + when;
    const osc = ac.createOscillator();
    const amp = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (end !== freq) osc.frequency.exponentialRampToValueAtTime(Math.max(24, end), start + dur);
    amp.gain.setValueAtTime(0.0001, start);
    amp.gain.exponentialRampToValueAtTime(gain, start + 0.012);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(amp).connect(ac.destination);
    osc.start(start);
    osc.stop(start + dur + 0.02);
  }

  return {
    unlock() {
      try {
        ensure();
      } catch {
        /* audio is optional */
      }
    },
    toggle() {
      muted = !muted;
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
    },
    hit() {
      blip({ freq: 160, end: 65, dur: 0.32, gain: 0.07, type: 'sawtooth' });
    },
    spawn() {
      blip({ freq: 240, end: 100, dur: 0.28, gain: 0.028, type: 'triangle' });
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

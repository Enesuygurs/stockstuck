/**
 * Web Audio API synthesizer for instant, zero-dependency audible alert chimes.
 */
export const playAlertChime = (type: 'ALERT' | 'SUCCESS' | 'WARNING' = 'ALERT') => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    if (type === 'ALERT') {
      // Crisp 3-tone notification chime (C5 -> E5 -> G5)
      osc1.type = 'sine';
      osc2.type = 'triangle';

      osc1.frequency.setValueAtTime(523.25, now);
      osc1.frequency.exponentialRampToValueAtTime(659.25, now + 0.12);
      osc1.frequency.exponentialRampToValueAtTime(783.99, now + 0.28);

      osc2.frequency.setValueAtTime(261.63, now);
      osc2.frequency.exponentialRampToValueAtTime(329.63, now + 0.12);
      osc2.frequency.exponentialRampToValueAtTime(392.00, now + 0.28);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.65);
      osc2.stop(now + 0.65);
    } else if (type === 'WARNING') {
      // Dual tone alert
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(440, now);
      osc1.frequency.setValueAtTime(370, now + 0.15);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.25, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

      osc1.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.45);
    } else {
      // Success chime (A4 -> C#5 -> E5)
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(440, now);
      osc1.frequency.exponentialRampToValueAtTime(554.37, now + 0.1);
      osc1.frequency.exponentialRampToValueAtTime(659.25, now + 0.22);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);

      osc1.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.55);
    }
  } catch (err) {
    console.warn('Audio chime could not be played:', err);
  }
};

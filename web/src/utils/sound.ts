/**
 * Elegant synthesized message notification sound using the Web Audio API.
 * Uses a gentle, soft marimba-like double ping (two harmonic sine waves with smooth decay).
 * Requires zero external audio files, zero latency, and works on all modern browsers.
 */
let audioCtx: AudioContext | null = null;

export const playMessageChime = () => {
  try {
    if (!audioCtx) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioContextClass) return;
      audioCtx = new AudioContextClass();
    }

    if (audioCtx.state === "suspended") {
      audioCtx.resume().catch(() => {});
    }

    const now = audioCtx.currentTime;

    // Tone 1: 587.33 Hz (D5) - gentle initial bell
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();

    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, now);

    gain1.gain.setValueAtTime(0.04, now);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);

    osc1.start(now);
    osc1.stop(now + 0.18);

    // Tone 2: 880 Hz (A5) - sweet harmonic ping slightly delayed
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();

    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880, now + 0.08);

    gain2.gain.setValueAtTime(0.05, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);

    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);

    osc2.start(now + 0.08);
    osc2.stop(now + 0.3);
  } catch {
    // Silently ignore if audio context is restricted before user interaction
  }
};

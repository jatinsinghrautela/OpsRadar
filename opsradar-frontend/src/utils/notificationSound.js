/**
 * Soft two-tone chime via Web Audio (no asset file).
 * Browsers may block until a user gesture unlocks AudioContext.
 */
let sharedCtx = null;

function getCtx() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!sharedCtx) sharedCtx = new AC();
  return sharedCtx;
}

export function unlockNotificationAudio() {
  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
}

export function playNotificationChime() {
  const ctx = getCtx();
  if (!ctx) return;

  const run = () => {
    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
    master.connect(ctx.destination);

    const tones = [
      { freq: 880, start: 0, dur: 0.12 },
      { freq: 1174.7, start: 0.1, dur: 0.18 }
    ];

    for (const tone of tones) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(tone.freq, now + tone.start);
      gain.gain.setValueAtTime(0.0001, now + tone.start);
      gain.gain.exponentialRampToValueAtTime(0.5, now + tone.start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + tone.start + tone.dur);
      osc.connect(gain);
      gain.connect(master);
      osc.start(now + tone.start);
      osc.stop(now + tone.start + tone.dur + 0.02);
    }
  };

  if (ctx.state === 'suspended') {
    ctx.resume().then(run).catch(() => {});
  } else {
    run();
  }
}

export const SOUND_PREF_KEY = 'opsradar_notify_sound';

export function isNotificationSoundEnabled() {
  const raw = localStorage.getItem(SOUND_PREF_KEY);
  if (raw === null) return true;
  return raw === 'true';
}

export function setNotificationSoundEnabled(enabled) {
  localStorage.setItem(SOUND_PREF_KEY, enabled ? 'true' : 'false');
}

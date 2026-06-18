let audioContext: AudioContext | null = null;
let alarmTimerId: ReturnType<typeof setInterval> | null = null;

function getContext() {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

export async function unlockAudio() {
  const ctx = getContext();
  if (ctx.state === "suspended") {
    await ctx.resume();
  }
}

function playBeep(ctx: AudioContext, startTime: number) {
  const tones = [880, 660];

  tones.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = freq;
    const t = startTime + i * 0.15;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.3);
  });
}

export function startAlarm() {
  stopAlarm();
  const ctx = getContext();
  void ctx.resume();

  const ring = () => {
    if (ctx.state === "suspended") {
      void ctx.resume();
    }
    playBeep(ctx, ctx.currentTime);
  };

  ring();
  alarmTimerId = setInterval(ring, 1200);
}

export function stopAlarm() {
  if (alarmTimerId !== null) {
    clearInterval(alarmTimerId);
    alarmTimerId = null;
  }
}

export function previewAlarm() {
  const ctx = getContext();
  void ctx.resume();
  playBeep(ctx, ctx.currentTime);
}

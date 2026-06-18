export const DEFAULT_INTERVAL_MINUTES = 45;
export const MIN_INTERVAL_MINUTES = 5;
export const MAX_INTERVAL_MINUTES = 120;

export const INTERVAL_PRESETS = [15, 30, 45, 60, 90] as const;

export const STRETCH_TIPS = [
  "Roll your shoulders back 5 times, then forward 5 times.",
  "Stand up and reach both arms overhead. Hold for 15 seconds.",
  "Gently turn your head left and right, holding each side for 10 seconds.",
  "Stand and do 10 slow neck rolls in each direction.",
  "Wrist circles: 10 forward, 10 backward on each hand.",
  "Stand and march in place for 30 seconds to get blood flowing.",
  "Seated or standing: twist your torso gently left and right.",
  "Stretch your calves — step one foot back, heel down, hold 20 seconds each leg.",
  "Interlace fingers behind your back and lift your chest.",
  "Look away from the screen at something 20 feet away for 20 seconds.",
] as const;

export type TimerStatus = "idle" | "running" | "paused" | "alerting";

export interface TimerState {
  status: TimerStatus;
  endTime: number | null;
  remainingMs: number;
  cycleDurationMs: number;
  intervalMinutes: number;
  stretchCount: number;
  soundEnabled: boolean;
  notificationsEnabled: boolean;
}

export const STORAGE_KEY = "stretch-alarm-state";

export function minutesToMs(minutes: number) {
  return minutes * 60 * 1000;
}

export function clampIntervalMinutes(minutes: number) {
  return Math.min(MAX_INTERVAL_MINUTES, Math.max(MIN_INTERVAL_MINUTES, Math.round(minutes)));
}

export function formatIntervalLabel(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

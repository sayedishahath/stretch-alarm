export const STRETCH_INTERVAL_MS = 45 * 60 * 1000;

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
  stretchCount: number;
  soundEnabled: boolean;
  notificationsEnabled: boolean;
}

export const STORAGE_KEY = "stretch-alarm-state";

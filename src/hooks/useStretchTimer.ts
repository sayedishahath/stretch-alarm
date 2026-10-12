"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_INTERVAL_MINUTES,
  STRETCH_TIPS,
  STORAGE_KEY,
  clampIntervalMinutes,
  minutesToMs,
  type TimerState,
  type TimerStatus,
} from "@/lib/constants";
import { startAlarm, stopAlarm, unlockAudio } from "@/lib/alarmSound";

function loadState(): Partial<TimerState> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Partial<TimerState>) : {};
  } catch {
    return {};
  }
}

function saveState(state: TimerState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function resolveSaved(saved: Partial<TimerState>): TimerState {
  const intervalMinutes = clampIntervalMinutes(
    saved.intervalMinutes ?? DEFAULT_INTERVAL_MINUTES
  );
  const cycleDurationMs = saved.cycleDurationMs ?? minutesToMs(intervalMinutes);

  let status: TimerStatus = (saved.status as TimerStatus) ?? "idle";
  if (saved.endTime && saved.status === "running" && saved.endTime > Date.now()) {
    status = "running";
  } else if (saved.endTime && saved.status === "running" && saved.endTime <= Date.now()) {
    status = "alerting";
  }

  let remainingMs = minutesToMs(intervalMinutes);
  if (saved.endTime && saved.status === "running") {
    remainingMs = Math.max(0, saved.endTime - Date.now());
  } else if (saved.status === "paused" && saved.remainingMs != null) {
    remainingMs = saved.remainingMs;
  }

  return {
    status,
    endTime: saved.endTime ?? null,
    remainingMs,
    cycleDurationMs,
    intervalMinutes,
    stretchCount: saved.stretchCount ?? 0,
    soundEnabled: saved.soundEnabled ?? true,
    notificationsEnabled: saved.notificationsEnabled ?? true,
  };
}

export function useStretchTimer() {
  const initialCycleMs = minutesToMs(DEFAULT_INTERVAL_MINUTES);

  const [status, setStatus] = useState<TimerStatus>("idle");
  const [endTime, setEndTime] = useState<number | null>(null);
  const [intervalMinutes, setIntervalMinutesState] = useState(DEFAULT_INTERVAL_MINUTES);
  const [cycleDurationMs, setCycleDurationMs] = useState(initialCycleMs);
  const [remainingMs, setRemainingMs] = useState(initialCycleMs);
  const [stretchCount, setStretchCount] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [ready, setReady] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);
  const alertedRef = useRef(false);
  const stateRef = useRef<TimerState>({
    status,
    endTime,
    remainingMs,
    cycleDurationMs,
    intervalMinutes,
    stretchCount,
    soundEnabled,
    notificationsEnabled,
  });
  stateRef.current = {
    status,
    endTime,
    remainingMs,
    cycleDurationMs,
    intervalMinutes,
    stretchCount,
    soundEnabled,
    notificationsEnabled,
  };

  const persist = useCallback((patch: Partial<TimerState>) => {
    const next: TimerState = { ...stateRef.current, ...patch };
    stateRef.current = next;
    saveState(next);
  }, []);

  const triggerAlert = useCallback(async () => {
    if (alertedRef.current) return;
    alertedRef.current = true;
    setStatus("alerting");
    setRemainingMs(0);
    setTipIndex(Math.floor(Math.random() * STRETCH_TIPS.length));
    persist({ status: "alerting", endTime: null, remainingMs: 0 });

    const { notificationsEnabled: notify, intervalMinutes: minutes } = stateRef.current;
    if (notify && "Notification" in window && Notification.permission === "granted") {
      new Notification("Time to stretch!", {
        body: `You've been sitting for ${minutes} minutes. Stand up and move for a minute.`,
        icon: "/icon.svg",
        tag: "stretch-alarm",
      });
    }
  }, [persist]);

  useEffect(() => {
    const next = resolveSaved(loadState());
    setStatus(next.status);
    setEndTime(next.endTime);
    setIntervalMinutesState(next.intervalMinutes);
    setCycleDurationMs(next.cycleDurationMs);
    setRemainingMs(next.remainingMs);
    setStretchCount(next.stretchCount);
    setSoundEnabled(next.soundEnabled);
    setNotificationsEnabled(next.notificationsEnabled);
    setReady(true);
  }, []);

  useEffect(() => {
    return () => stopAlarm();
  }, []);

  useEffect(() => {
    if (status !== "alerting") return;
    if (soundEnabled) {
      void unlockAudio().then(() => startAlarm());
    } else {
      stopAlarm();
    }
  }, [status, soundEnabled]);

  useEffect(() => {
    if (status !== "running" || !endTime) return;

    const tick = () => {
      const left = endTime - Date.now();
      if (left <= 0) {
        setRemainingMs(0);
        void triggerAlert();
        return;
      }
      setRemainingMs(left);
    };

    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [status, endTime, triggerAlert]);

  useEffect(() => {
    if (!ready) return;
    persist({});
  }, [
    ready,
    status,
    endTime,
    cycleDurationMs,
    intervalMinutes,
    stretchCount,
    soundEnabled,
    notificationsEnabled,
    persist,
  ]);

  const requestNotifications = async () => {
    if (!("Notification" in window)) return false;
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") return false;
    const result = await Notification.requestPermission();
    return result === "granted";
  };

  const start = async () => {
    alertedRef.current = false;
    stopAlarm();
    await unlockAudio();
    if (notificationsEnabled) {
      await requestNotifications();
    }
    const duration = minutesToMs(intervalMinutes);
    const nextEnd = Date.now() + duration;
    setCycleDurationMs(duration);
    setEndTime(nextEnd);
    setRemainingMs(duration);
    setStatus("running");
    persist({ status: "running", endTime: nextEnd, cycleDurationMs: duration });
  };

  const pause = () => {
    if (status !== "running") return;
    stopAlarm();
    setStatus("paused");
    setEndTime(null);
    persist({ status: "paused", endTime: null, cycleDurationMs, remainingMs });
  };

  const resume = async () => {
    if (status !== "paused") return;
    alertedRef.current = false;
    stopAlarm();
    await unlockAudio();
    const nextEnd = Date.now() + remainingMs;
    setEndTime(nextEnd);
    setStatus("running");
    persist({ status: "running", endTime: nextEnd, cycleDurationMs });
  };

  const reset = () => {
    alertedRef.current = false;
    stopAlarm();
    const duration = minutesToMs(intervalMinutes);
    setStatus("idle");
    setEndTime(null);
    setCycleDurationMs(duration);
    setRemainingMs(duration);
    persist({ status: "idle", endTime: null, cycleDurationMs: duration });
  };

  const acknowledgeStretch = () => {
    alertedRef.current = false;
    stopAlarm();
    const duration = minutesToMs(intervalMinutes);
    const nextEnd = Date.now() + duration;
    setStretchCount((c) => {
      const next = c + 1;
      saveState({
        status: "running",
        endTime: nextEnd,
        remainingMs: duration,
        cycleDurationMs: duration,
        intervalMinutes,
        stretchCount: next,
        soundEnabled,
        notificationsEnabled,
      });
      return next;
    });
    setCycleDurationMs(duration);
    setEndTime(nextEnd);
    setRemainingMs(duration);
    setStatus("running");
  };

  const setIntervalMinutes = (minutes: number) => {
    if (status === "running" || status === "alerting") return;

    const clamped = clampIntervalMinutes(minutes);
    const newMs = minutesToMs(clamped);
    const elapsed = cycleDurationMs - remainingMs;
    const newRemaining = Math.max(0, newMs - elapsed);

    setIntervalMinutesState(clamped);

    if (status === "paused") {
      setCycleDurationMs(newMs);
      setRemainingMs(newRemaining);
      persist({ intervalMinutes: clamped, cycleDurationMs: newMs, remainingMs: newRemaining });
    } else {
      setCycleDurationMs(newMs);
      setRemainingMs(newMs);
      persist({ intervalMinutes: clamped, cycleDurationMs: newMs, remainingMs: newMs });
    }
  };

  const progress = cycleDurationMs > 0 ? 1 - remainingMs / cycleDurationMs : 0;

  return {
    status,
    remainingMs,
    progress,
    intervalMinutes,
    cycleDurationMs,
    stretchCount,
    soundEnabled,
    notificationsEnabled,
    tipIndex,
    setSoundEnabled,
    setNotificationsEnabled,
    setIntervalMinutes,
    start,
    pause,
    resume,
    reset,
    acknowledgeStretch,
  };
}

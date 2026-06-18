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

export function useStretchTimer() {
  const saved = loadState();
  const initialInterval = clampIntervalMinutes(
    saved.intervalMinutes ?? DEFAULT_INTERVAL_MINUTES
  );
  const initialCycleMs = saved.cycleDurationMs ?? minutesToMs(initialInterval);

  const [status, setStatus] = useState<TimerStatus>(() => {
    if (saved.endTime && saved.status === "running" && saved.endTime > Date.now()) {
      return "running";
    }
    if (saved.endTime && saved.status === "running" && saved.endTime <= Date.now()) {
      return "alerting";
    }
    return (saved.status as TimerStatus) ?? "idle";
  });
  const [endTime, setEndTime] = useState<number | null>(saved.endTime ?? null);
  const [intervalMinutes, setIntervalMinutesState] = useState(initialInterval);
  const [cycleDurationMs, setCycleDurationMs] = useState(initialCycleMs);
  const [remainingMs, setRemainingMs] = useState(() => {
    if (saved.endTime && saved.status === "running") {
      return Math.max(0, saved.endTime - Date.now());
    }
    if (saved.status === "paused" && saved.remainingMs != null) {
      return saved.remainingMs;
    }
    return minutesToMs(initialInterval);
  });
  const [stretchCount, setStretchCount] = useState(saved.stretchCount ?? 0);
  const [soundEnabled, setSoundEnabled] = useState(saved.soundEnabled ?? true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    saved.notificationsEnabled ?? true
  );
  const [tipIndex, setTipIndex] = useState(0);
  const alertedRef = useRef(false);

  const persist = useCallback(
    (patch: Partial<TimerState>) => {
      const next: TimerState = {
        status,
        endTime,
        remainingMs,
        cycleDurationMs,
        intervalMinutes,
        stretchCount,
        soundEnabled,
        notificationsEnabled,
        ...patch,
      };
      saveState(next);
    },
    [
      status,
      endTime,
      remainingMs,
      cycleDurationMs,
      intervalMinutes,
      stretchCount,
      soundEnabled,
      notificationsEnabled,
    ]
  );

  const triggerAlert = useCallback(async () => {
    if (alertedRef.current) return;
    alertedRef.current = true;
    setStatus("alerting");
    setRemainingMs(0);
    setTipIndex(Math.floor(Math.random() * STRETCH_TIPS.length));
    persist({ status: "alerting", endTime: null });

    if (notificationsEnabled && "Notification" in window && Notification.permission === "granted") {
      new Notification("Time to stretch!", {
        body: `You've been sitting for ${intervalMinutes} minutes. Stand up and move for a minute.`,
        icon: "/icon.svg",
        tag: "stretch-alarm",
      });
    }
  }, [soundEnabled, notificationsEnabled, intervalMinutes, persist]);

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
    persist({});
  }, [
    status,
    endTime,
    remainingMs,
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

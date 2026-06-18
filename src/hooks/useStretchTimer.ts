"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  STRETCH_INTERVAL_MS,
  STRETCH_TIPS,
  STORAGE_KEY,
  type TimerState,
  type TimerStatus,
} from "@/lib/constants";

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

function playChime() {
  const ctx = new AudioContext();
  const notes = [523.25, 659.25, 783.99];

  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.18);
    gain.gain.linearRampToValueAtTime(0.22, ctx.currentTime + i * 0.18 + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.18 + 0.55);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + i * 0.18);
    osc.stop(ctx.currentTime + i * 0.18 + 0.6);
  });
}

export function useStretchTimer() {
  const saved = loadState();
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
  const [remainingMs, setRemainingMs] = useState(() => {
    if (saved.endTime && saved.status === "running") {
      return Math.max(0, saved.endTime - Date.now());
    }
    return STRETCH_INTERVAL_MS;
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
        stretchCount,
        soundEnabled,
        notificationsEnabled,
        ...patch,
      };
      saveState(next);
    },
    [status, endTime, stretchCount, soundEnabled, notificationsEnabled]
  );

  const triggerAlert = useCallback(async () => {
    if (alertedRef.current) return;
    alertedRef.current = true;
    setStatus("alerting");
    setRemainingMs(0);
    setTipIndex(Math.floor(Math.random() * STRETCH_TIPS.length));
    persist({ status: "alerting", endTime: null });

    if (soundEnabled) {
      try {
        playChime();
      } catch {
        /* audio blocked until user gesture — already started via button */
      }
    }

    if (notificationsEnabled && "Notification" in window && Notification.permission === "granted") {
      new Notification("Time to stretch!", {
        body: "You've been sitting for 45 minutes. Stand up and move for a minute.",
        icon: "/icon.svg",
        tag: "stretch-alarm",
      });
    }
  }, [soundEnabled, notificationsEnabled, persist]);

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
  }, [status, endTime, stretchCount, soundEnabled, notificationsEnabled, persist]);

  const requestNotifications = async () => {
    if (!("Notification" in window)) return false;
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") return false;
    const result = await Notification.requestPermission();
    return result === "granted";
  };

  const start = async () => {
    alertedRef.current = false;
    if (notificationsEnabled) {
      await requestNotifications();
    }
    const nextEnd = Date.now() + STRETCH_INTERVAL_MS;
    setEndTime(nextEnd);
    setRemainingMs(STRETCH_INTERVAL_MS);
    setStatus("running");
    persist({ status: "running", endTime: nextEnd });
  };

  const pause = () => {
    if (status !== "running") return;
    setStatus("paused");
    setEndTime(null);
    persist({ status: "paused", endTime: null });
  };

  const resume = async () => {
    if (status !== "paused") return;
    alertedRef.current = false;
    const nextEnd = Date.now() + remainingMs;
    setEndTime(nextEnd);
    setStatus("running");
    persist({ status: "running", endTime: nextEnd });
  };

  const reset = () => {
    alertedRef.current = false;
    setStatus("idle");
    setEndTime(null);
    setRemainingMs(STRETCH_INTERVAL_MS);
    persist({ status: "idle", endTime: null });
  };

  const acknowledgeStretch = () => {
    alertedRef.current = false;
    const nextEnd = Date.now() + STRETCH_INTERVAL_MS;
    setStretchCount((c) => {
      const next = c + 1;
      saveState({
        status: "running",
        endTime: nextEnd,
        stretchCount: next,
        soundEnabled,
        notificationsEnabled,
      });
      return next;
    });
    setEndTime(nextEnd);
    setRemainingMs(STRETCH_INTERVAL_MS);
    setStatus("running");
  };

  const progress = 1 - remainingMs / STRETCH_INTERVAL_MS;

  return {
    status,
    remainingMs,
    progress,
    stretchCount,
    soundEnabled,
    notificationsEnabled,
    tipIndex,
    setSoundEnabled,
    setNotificationsEnabled,
    start,
    pause,
    resume,
    reset,
    acknowledgeStretch,
  };
}

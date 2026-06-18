"use client";

import {
  INTERVAL_PRESETS,
  MAX_INTERVAL_MINUTES,
  MIN_INTERVAL_MINUTES,
  STRETCH_TIPS,
  formatIntervalLabel,
} from "@/lib/constants";
import { useStretchTimer } from "@/hooks/useStretchTimer";

function formatTime(ms: number) {
  const totalSec = Math.ceil(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

function ProgressRing({
  progress,
  remainingMs,
  intervalMinutes,
  alerting,
}: {
  progress: number;
  remainingMs: number;
  intervalMinutes: number;
  alerting: boolean;
}) {
  const size = 280;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(1, Math.max(0, progress)));

  return (
    <div className="relative flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-white/10"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={`transition-[stroke-dashoffset] duration-300 ${
            alerting ? "text-amber-400 animate-pulse" : "text-emerald-400"
          }`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-xs uppercase tracking-[0.25em] text-white/50">
          {alerting ? "Stretch now" : "Next stretch in"}
        </span>
        <span
          className={`mt-2 font-mono text-5xl font-light tabular-nums tracking-tight ${
            alerting ? "text-amber-300" : "text-white"
          }`}
        >
          {alerting ? "00:00" : formatTime(remainingMs)}
        </span>
        <span className="mt-2 text-sm text-white/40">every {formatIntervalLabel(intervalMinutes)}</span>
      </div>
    </div>
  );
}

function IntervalPicker({
  intervalMinutes,
  onChange,
  disabled,
}: {
  intervalMinutes: number;
  onChange: (minutes: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="mt-8 w-full max-w-sm">
      <div className="flex items-center justify-between text-sm">
        <span className="text-white/50">Stretch interval</span>
        <span className="font-medium text-emerald-400">{formatIntervalLabel(intervalMinutes)}</span>
      </div>

      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {INTERVAL_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            disabled={disabled}
            onClick={() => onChange(preset)}
            className={`rounded-full px-4 py-1.5 text-sm transition ${
              intervalMinutes === preset
                ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/50"
                : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white disabled:opacity-40"
            }`}
          >
            {preset}m
          </button>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <input
          type="range"
          min={MIN_INTERVAL_MINUTES}
          max={MAX_INTERVAL_MINUTES}
          step={5}
          value={intervalMinutes}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-white/10 accent-emerald-400 disabled:opacity-40"
        />
        <input
          type="number"
          min={MIN_INTERVAL_MINUTES}
          max={MAX_INTERVAL_MINUTES}
          value={intervalMinutes}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-16 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-center text-sm tabular-nums text-white outline-none focus:border-emerald-400/50 disabled:opacity-40"
        />
      </div>
    </div>
  );
}

export default function StretchAlarm() {
  const {
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
  } = useStretchTimer();

  const isRunning = status === "running";
  const isPaused = status === "paused";
  const isIdle = status === "idle";
  const isAlerting = status === "alerting";

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0c1117] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-0 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-teal-400/10 blur-3xl" />
        <div className="absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 rounded-full bg-emerald-300/5 blur-3xl" />
      </div>

      <main className="relative mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 py-12">
        <header className="mb-10 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.35em] text-emerald-400/80">
            Stretch Alarm
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">
            Move on your schedule
          </h1>
          <p className="mt-2 text-sm text-white/50">
            Set your interval, start the timer, and we&apos;ll nudge you to stand and stretch.
          </p>
        </header>

        <ProgressRing
          progress={isIdle ? 0 : isAlerting ? 1 : progress}
          remainingMs={isIdle ? cycleDurationMs : remainingMs}
          intervalMinutes={intervalMinutes}
          alerting={isAlerting}
        />

        <IntervalPicker
          intervalMinutes={intervalMinutes}
          onChange={setIntervalMinutes}
          disabled={isAlerting}
        />

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          {isIdle && (
            <button
              type="button"
              onClick={() => void start()}
              className="rounded-full bg-emerald-500 px-8 py-3 text-sm font-semibold text-emerald-950 shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-400"
            >
              Start session
            </button>
          )}

          {isRunning && (
            <>
              <button
                type="button"
                onClick={pause}
                className="rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-medium transition hover:bg-white/10"
              >
                Pause
              </button>
              <button
                type="button"
                onClick={reset}
                className="rounded-full border border-white/10 px-6 py-3 text-sm font-medium text-white/60 transition hover:text-white"
              >
                Stop
              </button>
            </>
          )}

          {isPaused && (
            <>
              <button
                type="button"
                onClick={() => void resume()}
                className="rounded-full bg-emerald-500 px-8 py-3 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400"
              >
                Resume
              </button>
              <button
                type="button"
                onClick={reset}
                className="rounded-full border border-white/10 px-6 py-3 text-sm font-medium text-white/60 transition hover:text-white"
              >
                Stop
              </button>
            </>
          )}
        </div>

        <div className="mt-8 flex items-center gap-6 text-sm text-white/50">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={soundEnabled}
              onChange={(e) => setSoundEnabled(e.target.checked)}
              className="accent-emerald-400"
            />
            Sound
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={notificationsEnabled}
              onChange={(e) => setNotificationsEnabled(e.target.checked)}
              className="accent-emerald-400"
            />
            Notifications
          </label>
        </div>

        {stretchCount > 0 && (
          <p className="mt-6 text-sm text-emerald-400/80">
            {stretchCount} stretch{stretchCount === 1 ? "" : "es"} completed this session
          </p>
        )}

        {!isIdle && !isAlerting && (
          <p className="mt-4 text-xs text-white/30">
            {isPaused
              ? `Paused with ${formatTime(remainingMs)} remaining`
              : isRunning
                ? "Interval adjusts live — elapsed time is preserved"
                : "Keep this tab open for reliable reminders"}
          </p>
        )}
      </main>

      {isAlerting && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center">
          <div
            role="dialog"
            aria-labelledby="stretch-title"
            aria-modal="true"
            className="modal-enter w-full max-w-md rounded-3xl border border-amber-400/30 bg-[#141a22] p-8 shadow-2xl shadow-amber-500/10"
          >
            <div className="mb-2 text-3xl" aria-hidden="true">
              🧘
            </div>
            <h2 id="stretch-title" className="text-2xl font-semibold text-amber-200">
              Time to stretch!
            </h2>
            <p className="mt-2 text-white/60">
              You&apos;ve been at it for {formatIntervalLabel(intervalMinutes)}. Take a short break
              — your body will thank you.
            </p>

            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-wider text-emerald-400/80">Try this</p>
              <p className="mt-2 text-sm leading-relaxed text-white/80">
                {STRETCH_TIPS[tipIndex % STRETCH_TIPS.length]}
              </p>
            </div>

            <button
              type="button"
              onClick={acknowledgeStretch}
              className="mt-8 w-full rounded-full bg-amber-400 py-3.5 text-sm font-semibold text-amber-950 transition hover:bg-amber-300"
            >
              I stretched — restart timer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

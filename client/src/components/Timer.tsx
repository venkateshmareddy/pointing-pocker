import { useState, useCallback, useMemo } from 'react';
import { Play, Square } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTimer } from '@/hooks/useTimer';

interface TimerProps {
  timerSeconds: number | null;
  timerStartedAt: string | null;
  isModeratorOrVoter: boolean;
  onStartTimer: (seconds: number) => void;
  onStopTimer: () => void;
}

const RING_SIZE = 44;
const RING_STROKE = 3;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export default function Timer({
  timerSeconds,
  timerStartedAt,
  isModeratorOrVoter,
  onStartTimer,
  onStopTimer,
}: TimerProps) {
  const { timeLeft, isRunning } = useTimer(timerSeconds, timerStartedAt);
  const [showPresets, setShowPresets] = useState(false);

  const handlePreset = useCallback(
    (seconds: number) => {
      onStartTimer(seconds);
      setShowPresets(false);
    },
    [onStartTimer],
  );

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isWarning = timeLeft !== null && timeLeft <= 30;
  const isCritical = timeLeft !== null && timeLeft <= 10;

  // Calculate ring progress
  const progress = useMemo(() => {
    if (timeLeft === null || timerSeconds === null || timerSeconds === 0) return 0;
    return Math.max(0, Math.min(1, timeLeft / timerSeconds));
  }, [timeLeft, timerSeconds]);

  const ringOffset = RING_CIRCUMFERENCE * (1 - progress);

  // Ring color based on time remaining
  const ringColor = isCritical
    ? 'stroke-red-500'
    : isWarning
      ? 'stroke-amber-500'
      : 'stroke-emerald-500';

  const presets = [
    { label: '1 min', seconds: 60 },
    { label: '2 min', seconds: 120 },
    { label: '5 min', seconds: 300 },
  ];

  return (
    <div className="flex items-center gap-2">
      {timeLeft !== null && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex items-center gap-2"
        >
          {/* Circular progress ring */}
          <div className="relative">
            <svg width={RING_SIZE} height={RING_SIZE} className="transform -rotate-90">
              {/* Background ring */}
              <circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                fill="none"
                strokeWidth={RING_STROKE}
                className="stroke-slate-700"
              />
              {/* Progress ring */}
              <circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                fill="none"
                strokeWidth={RING_STROKE}
                strokeDasharray={RING_CIRCUMFERENCE}
                strokeDashoffset={ringOffset}
                strokeLinecap="round"
                className={`${ringColor} timer-ring`}
              />
            </svg>
            {/* Time text in center */}
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.span
                animate={isCritical ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 0.5, repeat: isCritical ? Infinity : 0 }}
                className={`text-[10px] font-mono font-bold ${
                  isCritical
                    ? 'text-red-400'
                    : isWarning
                      ? 'text-amber-400'
                      : 'text-slate-200'
                }`}
              >
                {formatTime(timeLeft)}
              </motion.span>
            </div>
          </div>
        </motion.div>
      )}

      {isModeratorOrVoter && (
        <div className="flex gap-1">
          {!isRunning && timeLeft === null && (
            <div className="relative">
              <button
                onClick={() => setShowPresets(!showPresets)}
                className="p-2 rounded-lg bg-white/15 hover:bg-white/25 text-white/80 hover:text-white transition-all"
                title="Start timer"
              >
                <Play className="w-4 h-4" />
              </button>

              <AnimatePresence>
                {showPresets && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full mt-1 right-0 bg-white border border-slate-200 rounded-xl shadow-xl z-[200] whitespace-nowrap overflow-hidden"
                  >
                    {presets.map(({ label, seconds }) => (
                      <button
                        key={seconds}
                        onClick={() => handlePreset(seconds)}
                        className="block w-full text-left px-4 py-2.5 hover:bg-slate-50 text-sm text-slate-700 font-medium transition-colors"
                      >
                        {label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {isRunning && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onStopTimer}
              className="p-2 rounded-lg bg-red-600/80 hover:bg-red-500/80 text-white transition-all shadow-lg shadow-red-500/20"
              title="Stop timer"
            >
              <Square className="w-4 h-4" />
            </motion.button>
          )}
        </div>
      )}
    </div>
  );
}

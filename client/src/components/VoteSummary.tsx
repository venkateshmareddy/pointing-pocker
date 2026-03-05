import { useEffect, useState } from 'react';
import { TrendingDown, TrendingUp, PartyPopper, Target, BarChart3 } from 'lucide-react';
import { calculateStats } from '@/lib/stats';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import type { Participant } from '@pointing-poker/shared/types';
import ConfettiEffect from './ConfettiEffect';

interface VoteSummaryProps {
  participants: Record<string, Participant>;
  isRevealed: boolean;
  teamGroups?: string[];
}

function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const motionVal = useMotionValue(0);
  const rounded = useTransform(motionVal, (v) =>
    Number.isInteger(value) ? Math.round(v) : (Math.round(v * 100) / 100).toFixed(2),
  );
  const [display, setDisplay] = useState('0');

  useEffect(() => {
    const controls = animate(motionVal, value, { duration: 0.8, ease: 'easeOut' });
    const unsub = rounded.on('change', (v) => setDisplay(String(v)));
    return () => { controls.stop(); unsub(); };
  }, [value, motionVal, rounded]);

  return <span className={className}>{display}</span>;
}

// ── Reusable stats panel (chips + distribution bar) ──────────────────────────

interface StatsPanelProps {
  participants: Record<string, Participant>;
  animDelay?: number;
  barColor?: string; // tailwind gradient classes for bar
}

function StatsPanel({ participants, animDelay = 0, barColor = 'from-indigo-500 to-violet-500' }: StatsPanelProps) {
  const votes = Object.fromEntries(Object.entries(participants).map(([id, p]) => [id, p.vote]));
  const stats = calculateStats(votes);

  if (stats.numericVotes.length === 0) {
    return <p className="text-xs text-slate-400 italic py-2">No votes yet</p>;
  }

  const maxCount = Math.max(...Array.from(stats.distribution.values()));
  const distributionEntries = Array.from(stats.distribution.entries()).sort(([a], [b]) => {
    return parseFloat(String(a)) - parseFloat(String(b));
  });

  return (
    <>
      {/* Stat chips */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {stats.average !== null && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: animDelay + 0.1 }}
            className="bg-white/80 border border-slate-200 rounded-xl p-2.5 text-center"
          >
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Avg</div>
            <div className="text-lg font-black text-indigo-600"><AnimatedNumber value={stats.average} /></div>
          </motion.div>
        )}
        {stats.min !== null && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: animDelay + 0.15 }}
            className="bg-white/80 border border-slate-200 rounded-xl p-2.5 text-center"
          >
            <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              <TrendingDown className="w-3 h-3" /> Min
            </div>
            <div className="text-lg font-black text-emerald-600"><AnimatedNumber value={stats.min} /></div>
          </motion.div>
        )}
        {stats.max !== null && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: animDelay + 0.2 }}
            className="bg-white/80 border border-slate-200 rounded-xl p-2.5 text-center"
          >
            <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              <TrendingUp className="w-3 h-3" /> Max
            </div>
            <div className="text-lg font-black text-orange-500"><AnimatedNumber value={stats.max} /></div>
          </motion.div>
        )}
        {stats.mode !== null && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: animDelay + 0.25 }}
            className="bg-white/80 border border-slate-200 rounded-xl p-2.5 text-center"
          >
            <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              <Target className="w-3 h-3" /> Mode
            </div>
            <div className="text-lg font-black text-violet-600"><AnimatedNumber value={stats.mode} /></div>
          </motion.div>
        )}
      </div>

      {/* Distribution */}
      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Vote Distribution</div>
      <div className="space-y-1.5">
        {distributionEntries.map(([value, count], i) => (
          <div key={String(value)} className="flex items-center gap-3">
            <div className="w-8 text-right text-sm font-bold text-slate-600 shrink-0">{value}</div>
            <div className="flex-1 bg-slate-200/60 rounded-full h-5 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(count / maxCount) * 100}%` }}
                transition={{ duration: 0.5, delay: animDelay + 0.15 + i * 0.08, ease: [0.4, 0, 0.2, 1] }}
                className={`h-full flex items-center justify-end pr-2 rounded-full bg-gradient-to-r ${
                  count === maxCount ? barColor : 'from-slate-300 to-slate-400'
                }`}
              >
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: animDelay + 0.4 + i * 0.08 }}
                  className="text-xs font-bold text-white"
                >
                  {count}
                </motion.span>
              </motion.div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ── Team color palette ────────────────────────────────────────────────────────

const TEAM_PALETTE = [
  {
    border: 'border-blue-200', bg: 'bg-blue-50',
    dot: 'bg-blue-500', text: 'text-blue-700',
    badgeBg: 'bg-blue-100', badgeBorder: 'border-blue-300',
    bar: 'from-blue-400 to-blue-600',
  },
  {
    border: 'border-emerald-200', bg: 'bg-emerald-50',
    dot: 'bg-emerald-500', text: 'text-emerald-700',
    badgeBg: 'bg-emerald-100', badgeBorder: 'border-emerald-300',
    bar: 'from-emerald-400 to-emerald-600',
  },
  {
    border: 'border-orange-200', bg: 'bg-orange-50',
    dot: 'bg-orange-500', text: 'text-orange-700',
    badgeBg: 'bg-orange-100', badgeBorder: 'border-orange-300',
    bar: 'from-orange-400 to-orange-600',
  },
  {
    border: 'border-violet-200', bg: 'bg-violet-50',
    dot: 'bg-violet-500', text: 'text-violet-700',
    badgeBg: 'bg-violet-100', badgeBorder: 'border-violet-300',
    bar: 'from-violet-400 to-violet-600',
  },
];

// ── Main component ────────────────────────────────────────────────────────────

export default function VoteSummary({ participants, isRevealed, teamGroups }: VoteSummaryProps) {
  if (!isRevealed) return null;

  const hasTeams = teamGroups && teamGroups.length > 0;

  // ── No-team mode: single card (original behaviour) ──────────────────────
  if (!hasTeams) {
    const votes = Object.fromEntries(Object.entries(participants).map(([id, p]) => [id, p.vote]));
    const stats = calculateStats(votes);
    if (stats.numericVotes.length === 0) return null;

    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={
          stats.consensus
            ? {
                opacity: 1, y: 0,
                boxShadow: [
                  '0 1px 3px rgba(0,0,0,0.05)',
                  '0 0 28px rgba(52,211,153,0.5), 0 0 56px rgba(52,211,153,0.2)',
                  '0 1px 3px rgba(0,0,0,0.05)',
                ],
              }
            : { opacity: 1, y: 0 }
        }
        transition={
          stats.consensus
            ? {
                y: { type: 'spring', stiffness: 200, damping: 20 },
                opacity: { duration: 0.4 },
                boxShadow: { duration: 2.4, repeat: Infinity, delay: 0.4 },
              }
            : { type: 'spring', stiffness: 200, damping: 20 }
        }
        className={`relative rounded-xl p-5 shadow-sm border overflow-hidden ${
          stats.consensus ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'
        }`}
      >
        <ConfettiEffect trigger={stats.consensus} />

        {stats.consensus && (
          <div className="absolute inset-0 pointer-events-none">
            {(['✨', '⭐', '🎉', '✨', '🌟', '🎊'] as const).map((emoji, i) => (
              <motion.span
                key={i}
                className="absolute text-base select-none"
                style={{ left: `${8 + i * 16}%`, bottom: '-4px' }}
                animate={{ y: [0, -90], opacity: [0, 1, 0] }}
                transition={{ duration: 2.2, delay: i * 0.35, repeat: Infinity, repeatDelay: 1.2, ease: 'easeOut' }}
              >
                {emoji}
              </motion.span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-indigo-500" />
          <h3 className="text-sm font-semibold text-slate-800">Round Results</h3>
          {stats.consensus && (
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.2 }}
              className="ml-auto"
            >
              <motion.div
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                className="flex items-center gap-1.5 px-3 py-1 bg-emerald-100 border border-emerald-300 rounded-full"
              >
                <PartyPopper className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-xs font-bold text-emerald-700">Consensus!</span>
              </motion.div>
            </motion.div>
          )}
        </div>

        <StatsPanel participants={participants} />
      </motion.div>
    );
  }

  // ── Team mode: team cards side-by-side + combined at bottom ────────────
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {teamGroups.map((team, idx) => {
          const color = TEAM_PALETTE[idx % TEAM_PALETTE.length];
          const teamParticipants = Object.fromEntries(
            Object.entries(participants).filter(([, p]) => p.team === team),
          );
          const teamVotes = Object.fromEntries(Object.entries(teamParticipants).map(([id, p]) => [id, p.vote]));
          const teamStats = calculateStats(teamVotes);
          const hasConsensus = teamStats.consensus && teamStats.numericVotes.length > 0;

          return (
            <motion.div
              key={team}
              initial={{ opacity: 0, y: 16 }}
              animate={hasConsensus
                ? {
                    opacity: 1, y: 0,
                    boxShadow: [
                      '0 1px 3px rgba(0,0,0,0.05)',
                      '0 0 20px rgba(52,211,153,0.45), 0 0 40px rgba(52,211,153,0.15)',
                      '0 1px 3px rgba(0,0,0,0.05)',
                    ],
                  }
                : { opacity: 1, y: 0 }}
              transition={hasConsensus
                ? {
                    y: { type: 'spring', stiffness: 200, damping: 20, delay: idx * 0.08 },
                    opacity: { duration: 0.4, delay: idx * 0.08 },
                    boxShadow: { duration: 2.4, repeat: Infinity, delay: 0.4 },
                  }
                : { delay: idx * 0.08, type: 'spring', stiffness: 200, damping: 20 }}
              className={`relative rounded-xl border ${color.border} ${color.bg} p-4 shadow-sm overflow-hidden`}
            >
              <ConfettiEffect trigger={hasConsensus} scoped />

              {/* Sparkles for consensus */}
              {hasConsensus && (
                <div className="absolute inset-0 pointer-events-none">
                  {(['✨', '🎉', '⭐', '🌟', '🎊'] as const).map((emoji, i) => (
                    <motion.span
                      key={i}
                      className="absolute text-sm select-none"
                      style={{ left: `${10 + i * 18}%`, bottom: '-4px' }}
                      animate={{ y: [0, -70], opacity: [0, 1, 0] }}
                      transition={{ duration: 2, delay: i * 0.3, repeat: Infinity, repeatDelay: 1.5, ease: 'easeOut' }}
                    >
                      {emoji}
                    </motion.span>
                  ))}
                </div>
              )}

              {/* Team header */}
              <div className="flex items-center gap-2 mb-3">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${color.dot}`} />
                <h3 className={`text-sm font-bold ${color.text}`}>{team}</h3>
                {hasConsensus && (
                  <motion.div
                    initial={{ scale: 0, rotate: -15 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                    className="ml-auto"
                  >
                    <motion.div
                      animate={{ scale: [1, 1.07, 1] }}
                      transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                      className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full border ${color.badgeBg} ${color.badgeBorder}`}
                    >
                      <PartyPopper className={`w-3 h-3 ${color.text}`} />
                      <span className={`text-[11px] font-bold ${color.text}`}>Consensus!</span>
                    </motion.div>
                  </motion.div>
                )}
              </div>

              <StatsPanel participants={teamParticipants} animDelay={idx * 0.08} barColor={color.bar} />
            </motion.div>
          );
        })}
      </div>

      {/* Combined card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: teamGroups.length * 0.08, type: 'spring', stiffness: 200, damping: 20 }}
        className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="w-4 h-4 text-indigo-500" />
          <h3 className="text-sm font-bold text-slate-700">Combined</h3>
          <span className="text-[10px] text-slate-400 font-medium ml-1">all teams</span>
        </div>
        <StatsPanel participants={participants} animDelay={teamGroups.length * 0.08} />
      </motion.div>
    </div>
  );
}

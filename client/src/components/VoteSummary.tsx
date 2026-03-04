import { useEffect, useState, useMemo } from 'react';
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

export default function VoteSummary({ participants, isRevealed, teamGroups }: VoteSummaryProps) {
  const [activeTab, setActiveTab] = useState<string>('combined');
  const hasTeams = teamGroups && teamGroups.length > 0;

  const viewParticipants = useMemo(() => {
    if (!hasTeams || activeTab === 'combined') return participants;
    return Object.fromEntries(Object.entries(participants).filter(([, p]) => p.team === activeTab));
  }, [participants, hasTeams, activeTab]);

  if (!isRevealed) return null;

  const votes = Object.fromEntries(
    Object.entries(viewParticipants).map(([id, p]) => [id, p.vote]),
  );
  const stats = calculateStats(votes);
  if (stats.numericVotes.length === 0 && !hasTeams) return null;

  const maxCount = stats.distribution.size > 0 ? Math.max(...Array.from(stats.distribution.values())) : 1;
  const distributionEntries = Array.from(stats.distribution.entries()).sort(([a], [b]) => {
    const aNum = typeof a === 'number' ? a : parseFloat(String(a));
    const bNum = typeof b === 'number' ? b : parseFloat(String(b));
    return aNum - bNum;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={
        stats.consensus
          ? {
              opacity: 1,
              y: 0,
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
        stats.consensus
          ? 'bg-emerald-50 border-emerald-200'
          : 'bg-white border-slate-200'
      }`}
    >
      <ConfettiEffect trigger={stats.consensus} />

      {/* Floating sparkles for unanimous vote */}
      {stats.consensus && (
        <div className="absolute inset-0 pointer-events-none">
          {(['✨', '⭐', '🎉', '✨', '🌟', '🎊'] as const).map((emoji, i) => (
            <motion.span
              key={i}
              className="absolute text-base select-none"
              style={{ left: `${8 + i * 16}%`, bottom: '-4px' }}
              animate={{ y: [0, -90], opacity: [0, 1, 0] }}
              transition={{
                duration: 2.2,
                delay: i * 0.35,
                repeat: Infinity,
                repeatDelay: 1.2,
                ease: 'easeOut',
              }}
            >
              {emoji}
            </motion.span>
          ))}
        </div>
      )}

      {/* Team tabs */}
      {hasTeams && (
        <div className="flex gap-1 mb-4 p-1 bg-slate-100 rounded-lg">
          {(['combined', ...teamGroups] as string[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 text-xs font-semibold py-1.5 px-2 rounded-md transition-all ${
                activeTab === tab
                  ? 'bg-white shadow-sm text-slate-900'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab === 'combined' ? 'Combined' : tab}
            </button>
          ))}
        </div>
      )}

      {/* Title row */}
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

      {/* Stat chips */}
      <div className="grid grid-cols-4 gap-2 mb-5">
        {stats.average !== null && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center"
          >
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Avg</div>
            <div className="text-xl font-black text-indigo-600">
              <AnimatedNumber value={stats.average} />
            </div>
          </motion.div>
        )}
        {stats.min !== null && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center"
          >
            <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              <TrendingDown className="w-3 h-3" /> Min
            </div>
            <div className="text-xl font-black text-emerald-600">
              <AnimatedNumber value={stats.min} />
            </div>
          </motion.div>
        )}
        {stats.max !== null && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center"
          >
            <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              <TrendingUp className="w-3 h-3" /> Max
            </div>
            <div className="text-xl font-black text-orange-500">
              <AnimatedNumber value={stats.max} />
            </div>
          </motion.div>
        )}
        {stats.mode !== null && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center"
          >
            <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              <Target className="w-3 h-3" /> Mode
            </div>
            <div className="text-xl font-black text-violet-600">
              <AnimatedNumber value={stats.mode} />
            </div>
          </motion.div>
        )}
      </div>

      {/* Distribution chart */}
      <div>
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
          Vote Distribution
        </div>
        {stats.numericVotes.length === 0 ? (
          <div className="text-sm text-slate-400 text-center py-4">No votes for this team yet</div>
        ) : (
        <div className="space-y-1.5">
          {distributionEntries.map(([value, count], i) => (
            <div key={String(value)} className="flex items-center gap-3">
              <div className="w-8 text-right text-sm font-bold text-slate-600 shrink-0">{value}</div>
              <div className="flex-1 bg-slate-100 rounded-full h-6 overflow-hidden border border-slate-200">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(count / maxCount) * 100}%` }}
                  transition={{ duration: 0.5, delay: 0.15 + i * 0.08, ease: [0.4, 0, 0.2, 1] }}
                  className={`h-full flex items-center justify-end pr-2.5 rounded-full ${
                    count === maxCount
                      ? 'bg-gradient-to-r from-indigo-500 to-violet-500'
                      : 'bg-gradient-to-r from-slate-300 to-slate-400'
                  }`}
                >
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 + i * 0.08 }}
                    className="text-xs font-bold text-white"
                  >
                    {count}
                  </motion.span>
                </motion.div>
              </div>
            </div>
          ))}
        </div>
        )}
      </div>
    </motion.div>
  );
}

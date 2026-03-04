import { motion, AnimatePresence } from 'framer-motion';
import { Check, Clock, Crown, Eye } from 'lucide-react';
import type { Participant } from '@pointing-poker/shared/types';

interface ParticipantListProps {
  participants: Participant[];
  isRevealed: boolean;
}

const AVATAR_COLORS = [
  'from-indigo-500 to-violet-600',    // indigo-violet
  'from-rose-500 to-pink-600',        // rose-pink
  'from-emerald-500 to-teal-600',     // emerald-teal
  'from-amber-400 to-orange-500',     // amber-orange
  'from-sky-400 to-blue-600',         // sky-blue
  'from-fuchsia-500 to-purple-600',   // fuchsia-purple
  'from-red-400 to-rose-600',         // red-rose
  'from-teal-400 to-cyan-500',        // teal-cyan
  'from-yellow-400 to-amber-500',     // yellow-amber
  'from-lime-400 to-emerald-500',     // lime-emerald
  'from-blue-500 to-indigo-600',      // blue-indigo
  'from-pink-400 to-fuchsia-500',     // pink-fuchsia
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export default function ParticipantList({ participants, isRevealed }: ParticipantListProps) {
  const voters = participants.filter((p) => p.role !== 'spectator');
  const spectators = participants.filter((p) => p.role === 'spectator');
  const votedCount = voters.filter((p) => p.hasVoted).length;

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Team</h3>
        <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold">
          {participants.length}
        </span>
        {!isRevealed && voters.length > 0 && (
          <span className="ml-auto text-xs text-slate-400 font-medium">
            {votedCount}/{voters.length} voted
          </span>
        )}
      </div>

      {/* Voting progress bar */}
      {!isRevealed && voters.length > 0 && (
        <div className="h-1.5 bg-slate-100 rounded-full mb-3 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${(votedCount / voters.length) * 100}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      )}

      {/* Voter rows */}
      <div className="space-y-0.5">
        <AnimatePresence>
          {voters.map((participant, idx) => (
            <motion.div
              key={participant.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ type: 'spring', stiffness: 300, damping: 22 }}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <div className="relative shrink-0">
                <div
                  className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarColor(participant.displayName)} flex items-center justify-center text-white text-[11px] font-bold shadow-sm`}
                >
                  {getInitials(participant.displayName)}
                </div>
                {participant.role === 'moderator' && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 flex items-center justify-center shadow-sm">
                    <Crown className="w-2.5 h-2.5 text-white" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0 text-sm font-medium text-slate-800 truncate">
                {participant.displayName}
              </div>

              {isRevealed ? (
                <motion.div
                  initial={{ rotateY: 90, opacity: 0, scale: 0.5 }}
                  animate={{ rotateY: 0, opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20, delay: idx * 0.08 }}
                  className="min-w-[32px] h-7 flex items-center justify-center rounded-lg bg-indigo-100 border border-indigo-200 text-sm font-bold text-indigo-700 px-2"
                >
                  {participant.vote ?? '—'}
                </motion.div>
              ) : participant.hasVoted ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                </motion.div>
              ) : (
                <div className="w-7 h-7 rounded-full bg-amber-50 flex items-center justify-center">
                  <Clock className="w-3.5 h-3.5 text-amber-500 animate-gentle-pulse" />
                </div>
              )}
            </motion.div>
          ))}

          {spectators.map((participant) => (
            <motion.div
              key={participant.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg opacity-50"
            >
              <div
                className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarColor(participant.displayName)} flex items-center justify-center text-white text-[11px] font-bold`}
              >
                {getInitials(participant.displayName)}
              </div>
              <div className="flex-1 min-w-0 text-sm text-slate-500 truncate">
                {participant.displayName}
              </div>
              <Eye className="w-4 h-4 text-slate-400 shrink-0" />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

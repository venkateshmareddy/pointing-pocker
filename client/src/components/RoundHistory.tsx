import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, ChevronDown, ChevronRight, Trash2, PartyPopper, BarChart2 } from 'lucide-react';
import type { RoundRecord } from '@/hooks/useRoundHistory';

interface RoundHistoryProps {
  history: RoundRecord[];
  onClear: () => void;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function RoundRow({ record }: { record: RoundRecord }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-slate-50 transition-colors text-left"
      >
        {expanded
          ? <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          : <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        }
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-slate-800 truncate">{record.story}</div>
          <div className="text-[10px] text-slate-400">{formatTime(record.timestamp)}</div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {record.consensus && <PartyPopper className="w-3.5 h-3.5 text-emerald-500" />}
          {record.average !== null && (
            <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 text-xs font-bold">
              avg {record.average}
            </span>
          )}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-1 border-t border-slate-100 space-y-1">
              {record.min !== null && record.max !== null && (
                <div className="flex gap-3 text-xs text-slate-500 mb-2">
                  <span>Min: <span className="text-emerald-600 font-semibold">{record.min}</span></span>
                  <span>Max: <span className="text-orange-500 font-semibold">{record.max}</span></span>
                  {record.consensus && <span className="text-emerald-600 font-semibold">Consensus!</span>}
                </div>
              )}
              {record.votes.map((v, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 truncate max-w-[120px]">{v.name}</span>
                  <span className={`font-bold px-1.5 py-0.5 rounded ${
                    v.vote !== null ? 'text-indigo-700 bg-indigo-50' : 'text-slate-400'
                  }`}>
                    {v.vote ?? '—'}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function RoundHistory({ history, onClear }: RoundHistoryProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-3 hover:bg-slate-50 transition-colors"
      >
        <History className="w-4 h-4 text-slate-400" />
        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest flex-1 text-left">
          Previous Rounds
        </span>
        {history.length > 0 && (
          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">
            {history.length}
          </span>
        )}
        <BarChart2 className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-slate-200 px-3 py-3 space-y-2 max-h-72 overflow-y-auto bg-slate-50">
              {history.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">No rounds recorded yet</p>
              ) : (
                <>
                  {history.map((record) => <RoundRow key={record.id} record={record} />)}
                  <button
                    onClick={onClear}
                    className="w-full flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-rose-500 transition-colors py-1.5"
                  >
                    <Trash2 className="w-3 h-3" />
                    Clear history
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

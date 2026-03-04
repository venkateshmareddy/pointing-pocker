import { useCallback, useState } from 'react';
import { Copy, Eye, Trash2, Settings, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DECKS, parseCustomDeck } from '@/lib/decks';

interface SessionControlsProps {
  roomId: string;
  isRevealed: boolean;
  hasVotes: boolean;
  currentDeckType: string;
  isModeratorOrVoter: boolean;
  onReveal: () => void;
  onClear: () => void;
  onSetDeck: (deckType: string, customValues?: string[]) => void;
}

// These deck types show a "Select max value" sub-picker when clicked
const DECKS_WITH_MAX = ['fibonacci', 'modified-fibonacci', 'powers-of-2'];

export default function SessionControls({
  roomId,
  isRevealed,
  hasVotes,
  currentDeckType,
  isModeratorOrVoter,
  onReveal,
  onClear,
  onSetDeck,
}: SessionControlsProps) {
  const [copied, setCopied] = useState(false);
  const [showDeckMenu, setShowDeckMenu] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [customError, setCustomError] = useState('');
  const [pendingDeck, setPendingDeck] = useState<string | null>(null);

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(`${window.location.origin}/room/${roomId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [roomId]);

  const handleSelectDeck = (key: string) => {
    if (key === 'custom') {
      setPendingDeck(null);
      return; // keep menu open, show input
    }
    if (DECKS_WITH_MAX.includes(key)) {
      setPendingDeck(key === pendingDeck ? null : key);
      return; // keep menu open, show max picker
    }
    setPendingDeck(null);
    onSetDeck(key);
    setShowDeckMenu(false);
    setCustomInput('');
    setCustomError('');
  };

  // Max options = all values except the first one (which is always 0/'0')
  const getMaxOptions = (deckKey: string) => {
    const values = DECKS[deckKey as keyof typeof DECKS]?.values ?? [];
    return values
      .map((v, idx) => ({ v, idx }))
      .filter(({ v }) => v !== 0 && v !== '0');
  };

  const handleMaxSelect = (deckKey: string, idx: number) => {
    const values = DECKS[deckKey as keyof typeof DECKS].values;
    const filtered = values.slice(0, idx + 1);
    onSetDeck(deckKey, filtered.map(String));
    setShowDeckMenu(false);
    setPendingDeck(null);
  };

  const handleCustomDeckSubmit = () => {
    const values = parseCustomDeck(customInput);
    if (values.length < 2) { setCustomError('Enter at least 2 values'); return; }
    onSetDeck('custom', values);
    setShowDeckMenu(false);
    setCustomError('');
  };

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 space-y-3">
      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Controls</h3>

      {/* Copy Link */}
      <button
        onClick={handleCopyLink}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-sm font-medium transition-colors"
      >
        {copied
          ? <><Check className="w-4 h-4 text-emerald-500" /><span className="text-emerald-600">Copied!</span></>
          : <><Copy className="w-4 h-4" /><span>Copy Room Link</span></>
        }
      </button>

      {isModeratorOrVoter && (
        <>
          {/* Reveal / Clear */}
          <div className="grid grid-cols-2 gap-2">
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={onReveal}
              disabled={!hasVotes || isRevealed}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 text-white text-sm font-semibold shadow-sm disabled:shadow-none transition-all"
            >
              <Eye className="w-4 h-4" /><span>Reveal</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={onClear}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-400 hover:to-rose-400 text-white text-sm font-semibold shadow-sm transition-all"
            >
              <Trash2 className="w-4 h-4" /><span>Clear</span>
            </motion.button>
          </div>

          {/* Deck Selector */}
          <div className="relative">
            <button
              onClick={() => { setShowDeckMenu(!showDeckMenu); setPendingDeck(null); }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-sm font-medium transition-colors"
            >
              <Settings className="w-4 h-4 text-slate-400" />
              <span>Deck: {DECKS[currentDeckType as keyof typeof DECKS]?.name ?? currentDeckType}</span>
            </button>

            <AnimatePresence>
              {showDeckMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full mt-1.5 left-0 right-0 bg-white rounded-xl shadow-xl border border-slate-200 z-[200] overflow-hidden"
                >
                  {Object.entries(DECKS).map(([key, deck]) => (
                    <div key={key}>
                      <button
                        onClick={() => handleSelectDeck(key)}
                        className={`block w-full text-left px-4 py-2.5 text-sm font-medium transition-colors ${
                          currentDeckType === key
                            ? 'bg-indigo-600 text-white'
                            : pendingDeck === key
                              ? 'bg-indigo-50 text-indigo-700'
                              : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span>{deck.name}</span>
                        {DECKS_WITH_MAX.includes(key) && (
                          <span className="ml-2 text-[10px] font-normal opacity-60">
                            (pick max)
                          </span>
                        )}
                      </button>

                      {/* Max value picker for fibonacci / modified-fibonacci / powers-of-2 */}
                      <AnimatePresence>
                        {pendingDeck === key && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.18 }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-3 pt-2 bg-indigo-50 border-t border-indigo-100">
                              <p className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider mb-2">
                                Select max value
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {getMaxOptions(key).map(({ v, idx }) => (
                                  <button
                                    key={String(v)}
                                    onClick={() => handleMaxSelect(key, idx)}
                                    className="px-2.5 py-1 rounded-md bg-white border border-indigo-200 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 text-indigo-700 text-sm font-semibold transition-colors shadow-sm"
                                  >
                                    {v}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Custom deck input */}
                      {key === 'custom' && (
                        <div className="px-4 pb-3 pt-2 border-t border-slate-100">
                          <input
                            type="text"
                            value={customInput}
                            onChange={(e) => { setCustomInput(e.target.value); setCustomError(''); }}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleCustomDeckSubmit(); }}
                            placeholder="1, 2, 3, 5, 8, 13..."
                            className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30"
                          />
                          {customError && <p className="text-xs text-rose-500 mt-1">{customError}</p>}
                          <button
                            onClick={handleCustomDeckSubmit}
                            className="w-full mt-2 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors"
                          >
                            Apply Custom Deck
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </>
      )}
    </div>
  );
}

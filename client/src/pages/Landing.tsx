import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Users } from 'lucide-react';
import { generateRoomCode } from '@/lib/roomCode';
import { DECKS, parseCustomDeck } from '@/lib/decks';

export default function Landing() {
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState<boolean | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [selectedDeck, setSelectedDeck] = useState('fibonacci');
  const [customDeckInput, setCustomDeckInput] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');

  const handleCreate = useCallback(() => {
    if (!displayName.trim()) { setError('Please enter your name'); return; }
    if (selectedDeck === 'custom') {
      const values = parseCustomDeck(customDeckInput);
      if (values.length < 2) { setError('Enter at least 2 custom values'); return; }
      localStorage.setItem('customDeck', customDeckInput);
    }
    const roomId = generateRoomCode();
    localStorage.setItem('displayName', displayName);
    localStorage.setItem('selectedDeck', selectedDeck);
    navigate(`/room/${roomId}`);
  }, [displayName, selectedDeck, customDeckInput, navigate]);

  const handleJoin = useCallback(() => {
    if (!displayName.trim()) { setError('Please enter your name'); return; }
    if (!joinCode.trim()) { setError('Please enter a room code'); return; }
    localStorage.setItem('displayName', displayName);
    navigate(`/room/${joinCode}`);
  }, [displayName, joinCode, navigate]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') showCreateModal ? handleCreate() : handleJoin();
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-slate-100 overflow-x-hidden">
      {/* Purple header bar */}
      <div className="bg-gradient-to-r from-indigo-700 via-violet-700 to-purple-700 px-6 py-4 shadow-md">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <span className="text-2xl">🃏</span>
          <span className="text-white font-bold text-lg tracking-tight">Pointing Poker</span>
        </div>
      </div>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 py-12 sm:py-20">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          {/* Card fan */}
          <div className="relative flex items-center justify-center mb-8 h-28 sm:h-36">
            {[
              { rotate: -20, delay: 0, bg: 'from-indigo-500 to-violet-600' },
              { rotate: 0,   delay: 0.1, bg: 'from-violet-500 to-purple-600' },
              { rotate: 20,  delay: 0.2, bg: 'from-purple-500 to-pink-600' },
            ].map((card, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, rotate: 0, y: 20 }}
                animate={{ opacity: 1, rotate: card.rotate, y: 0 }}
                transition={{ duration: 0.8, delay: card.delay, type: 'spring', stiffness: 100 }}
                className={`absolute w-20 h-28 sm:w-24 sm:h-32 rounded-xl bg-gradient-to-br ${card.bg} shadow-xl flex items-center justify-center`}
                style={{ transformOrigin: 'bottom center' }}
              >
                <motion.span
                  className="text-4xl font-black text-white"
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 3, repeat: Infinity, delay: card.delay * 2, ease: 'easeInOut' }}
                >
                  {['1', '3', '8'][i]}
                </motion.span>
              </motion.div>
            ))}
          </div>

          <h1 className="text-4xl sm:text-6xl font-bold mb-3 tracking-tight pb-2 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 bg-clip-text text-transparent">
            Pointing Poker
          </h1>
          <p className="text-lg sm:text-xl text-slate-500">
            Agile estimation made simple and fun
          </p>
        </motion.div>

        {/* Action buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex flex-col sm:flex-row gap-4 mb-16"
        >
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => { setShowCreateModal(true); setError(''); setDisplayName(''); }}
            className="px-8 py-3.5 rounded-xl text-white font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 transition-all"
          >
            <Zap className="w-5 h-5" />
            Create Session
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => { setShowCreateModal(false); setError(''); setDisplayName(''); setJoinCode(''); }}
            className="px-8 py-3.5 rounded-xl text-slate-700 font-semibold bg-white hover:bg-slate-50 border border-slate-200 shadow-sm flex items-center justify-center gap-2 transition-all"
          >
            <Users className="w-5 h-5" />
            Join Session
          </motion.button>
        </motion.div>

        {/* How it works */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="w-full max-w-2xl mb-16"
        >
          <h2 className="text-2xl font-bold text-slate-800 mb-8 text-center">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { icon: '🎯', title: 'Create', desc: 'Start a new estimation session' },
              { icon: '🔗', title: 'Share',  desc: 'Invite team members to join' },
              { icon: '✅', title: 'Vote',   desc: 'Everyone votes simultaneously' },
            ].map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 + i * 0.15 }}
                whileHover={{ y: -4, scale: 1.02 }}
                className="bg-white rounded-xl p-6 text-center border border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-default"
              >
                <div className="text-4xl mb-3">{step.icon}</div>
                <h3 className="font-bold text-slate-800 mb-2">{step.title}</h3>
                <p className="text-slate-500 text-sm">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>
      </section>

      {/* Create / Join modal */}
      <AnimatePresence>
        {showCreateModal !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setShowCreateModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl border border-slate-200"
            >
              <h2 className="text-2xl font-bold text-slate-900 mb-6">
                {showCreateModal ? 'Create Session' : 'Join Session'}
              </h2>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-lg mb-4 text-sm"
                >
                  {error}
                </motion.div>
              )}

              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">Your Name</label>
                <input
                  autoFocus type="text" value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter your name"
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
              </div>

              {showCreateModal && (
                <>
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Deck Type</label>
                    <div className="space-y-2">
                      {Object.entries(DECKS).map(([key, deck]) => (
                        <div key={key}>
                          <button
                            onClick={() => setSelectedDeck(key)}
                            className={`w-full text-left px-4 py-2.5 rounded-lg transition-all ${
                              selectedDeck === key
                                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-sm'
                                : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                            }`}
                          >
                            {deck.name}
                          </button>
                          {key === 'custom' && selectedDeck === 'custom' && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mt-2 ml-4"
                            >
                              <input
                                type="text" value={customDeckInput}
                                onChange={(e) => setCustomDeckInput(e.target.value)}
                                placeholder="1, 2, 3, 5, 8, 13..."
                                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                              />
                              <p className="text-xs text-slate-400 mt-1">Enter comma-separated values</p>
                            </motion.div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                    onClick={handleCreate}
                    className="w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold rounded-lg shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all"
                  >
                    <Zap className="w-4 h-4" /> Create Session
                  </motion.button>
                </>
              )}

              {!showCreateModal && (
                <>
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Room Code</label>
                    <input
                      type="text" value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toLowerCase())}
                      onKeyDown={handleKeyDown}
                      placeholder="abc-xyz-123"
                      className="w-full px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    />
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                    onClick={handleJoin}
                    className="w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold rounded-lg shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all"
                  >
                    <Users className="w-4 h-4" /> Join Session
                  </motion.button>
                </>
              )}

              <button
                onClick={() => setShowCreateModal(null)}
                className="w-full mt-3 px-6 py-3 bg-slate-50 hover:bg-slate-100 text-slate-600 font-medium rounded-lg border border-slate-200 transition-colors"
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

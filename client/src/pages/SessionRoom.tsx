import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Volume2, VolumeX } from 'lucide-react';

import { usePartySocket } from '@/hooks/usePartySocket';
import { useRoomState } from '@/hooks/useRoomState';
import { useSounds } from '@/hooks/useSounds';
import { useRoundHistory } from '@/hooks/useRoundHistory';
import { getAllCards } from '@/lib/decks';

import CardDeck from '@/components/CardDeck';
import ParticipantList from '@/components/ParticipantList';
import VoteSummary from '@/components/VoteSummary';
import Timer from '@/components/Timer';
import StoryInput from '@/components/StoryInput';
import SessionControls from '@/components/SessionControls';
import RoundHistory from '@/components/RoundHistory';

export default function SessionRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sounds = useSounds();

  const teamsFromUrl = (() => {
    const t = searchParams.get('teams');
    return t ? t.split(',').filter(Boolean) : [];
  })();

  if (!roomId) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-700">
        Invalid room
      </div>
    );
  }

  const partySocket = usePartySocket(roomId);
  const roomState = useRoomState(partySocket);
  const { history, saveRound, clearHistory } = useRoundHistory(roomId);

  const [showJoinForm, setShowJoinForm] = useState(true);
  const [joinDisplayName, setJoinDisplayName] = useState('');
  const [joinRole, setJoinRole] = useState<'voter' | 'spectator'>('voter');
  const [joinError, setJoinError] = useState('');
  const [showRevealFlash, setShowRevealFlash] = useState(false);
  const [joinTeam, setJoinTeam] = useState('');
  const hasSetTeamsRef = useRef(false);

  const prevRevealedRef = useRef(false);
  const prevParticipantCountRef = useRef(0);

  useEffect(() => {
    const stored = localStorage.getItem('displayName');
    if (stored) setJoinDisplayName(stored);
  }, []);

  useEffect(() => {
    if (roomState.roomState && roomState.myId) {
      const amInRoom = Object.values(roomState.roomState.participants).some(
        (p) => p.id === roomState.myId,
      );
      if (amInRoom) setShowJoinForm(false);
    }
  }, [roomState.roomState, roomState.myId]);

  useEffect(() => {
    if (!roomState.roomState) return;
    const currentRevealed = roomState.roomState.room.revealed;
    const currentParticipantCount = Object.keys(roomState.roomState.participants).length;

    if (currentRevealed && !prevRevealedRef.current) {
      sounds.playReveal();
      saveRound(roomState.roomState.room.currentStory, roomState.roomState.participants);
      setShowRevealFlash(true);
      setTimeout(() => setShowRevealFlash(false), 700);
    }
    if (currentParticipantCount > prevParticipantCountRef.current && prevParticipantCountRef.current > 0) {
      sounds.playJoin();
    }

    prevRevealedRef.current = currentRevealed;
    prevParticipantCountRef.current = currentParticipantCount;
  }, [roomState.roomState, sounds, saveRound]);

  // Effective teams: prefer server state (available to all participants), fall back to URL param (moderator before joining)
  const effectiveTeams =
    roomState.roomState?.room.teamGroups?.length
      ? roomState.roomState.room.teamGroups
      : teamsFromUrl;

  // Auto-send teams config when moderator first joins
  useEffect(() => {
    if (hasSetTeamsRef.current || !roomState.roomState || !roomState.myId || teamsFromUrl.length === 0) return;
    if (roomState.myId === roomState.roomState.room.moderatorId) {
      hasSetTeamsRef.current = true;
      roomState.sendSetTeams(teamsFromUrl);
    }
  }, [roomState.roomState, roomState.myId, teamsFromUrl, roomState.sendSetTeams]);

  const handleJoin = useCallback(() => {
    if (!joinDisplayName.trim()) { setJoinError('Please enter your name'); return; }
    if (effectiveTeams.length > 0 && !joinTeam) { setJoinError('Please select your team'); return; }
    localStorage.setItem('displayName', joinDisplayName);
    roomState.sendJoin(joinDisplayName, joinRole, joinTeam || undefined);
    setShowJoinForm(false);
  }, [joinDisplayName, joinRole, joinTeam, effectiveTeams, roomState]);

  const handleVote = useCallback(
    (value: string | number) => { sounds.playCardSelect(); roomState.sendVote(value); },
    [sounds, roomState],
  );
  const handleReveal = useCallback(() => roomState.sendReveal(), [roomState]);
  const handleClear = useCallback(() => { sounds.playClear(); roomState.sendClear(); }, [sounds, roomState]);

  // ── Join form ────────────────────────────────────────────────────────────────
  if (!roomState.roomState || showJoinForm) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center p-4 bg-slate-100">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="bg-white rounded-2xl p-8 max-w-md w-full shadow-xl border border-slate-200"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">Join Session</h2>

          {(roomState.error || joinError) && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-lg mb-4 text-sm">
              {roomState.error || joinError}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">Your Name</label>
            <input
              autoFocus type="text" value={joinDisplayName}
              onChange={(e) => setJoinDisplayName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              placeholder="Enter your name"
              className="w-full px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">Role</label>
            <div className="space-y-2">
              {(['voter', 'spectator'] as const).map((role) => (
                <button key={role} onClick={() => setJoinRole(role)}
                  className={`w-full text-left px-4 py-2.5 rounded-lg transition-all ${
                    joinRole === role
                      ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-sm'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {role === 'voter' ? 'Voter (can vote and see results)' : 'Spectator (view only)'}
                </button>
              ))}
            </div>
          </div>

          {effectiveTeams.length > 0 && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">Your Team</label>
              <div className="flex gap-2 flex-wrap">
                {effectiveTeams.map((team) => (
                  <button key={team} onClick={() => setJoinTeam(team)}
                    className={`px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${
                      joinTeam === team
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {team}
                  </button>
                ))}
              </div>
            </div>
          )}

          <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
            onClick={handleJoin}
            className="w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold rounded-lg shadow-md shadow-indigo-500/20 transition-all"
          >
            Join Session
          </motion.button>
        </motion.div>
      </div>
    );
  }

  // ── Session room ──────────────────────────────────────────────────────────────
  const currentRoom = roomState.roomState.room;
  const isModerator = roomState.myId === currentRoom.moderatorId;
  const myParticipant = Object.values(roomState.roomState.participants).find((p) => p.id === roomState.myId);
  const isVoter = myParticipant?.role === 'voter' || myParticipant?.role === 'moderator';
  const isModeratorOrVoter = isModerator || isVoter;
  const hasVotes = Object.values(roomState.roomState.participants).some(
    (p) => (p.role === 'voter' || p.role === 'moderator') && p.hasVoted,
  );
  const allCards = getAllCards(currentRoom.deckType, currentRoom.customDeck);

  return (
    <div className="min-h-screen w-full flex flex-col bg-slate-100">
      {/* Reveal flash overlay */}
      <AnimatePresence>
        {showRevealFlash && (
          <motion.div
            className="fixed inset-0 pointer-events-none z-50"
            initial={{ opacity: 0.7 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 40%, rgba(99,102,241,0.35) 0%, transparent 70%)' }}
          />
        )}
      </AnimatePresence>
      {/* Purple gradient header */}
      <div className="bg-gradient-to-r from-indigo-700 via-violet-700 to-purple-700 px-4 py-3 sm:px-6 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <StoryInput
              currentStory={currentRoom.currentStory}
              isEditable={isModerator}
              onUpdate={roomState.sendSetStory}
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Timer
              timerSeconds={currentRoom.timerSeconds}
              timerStartedAt={currentRoom.timerStartedAt}
              isModeratorOrVoter={isModeratorOrVoter}
              onStartTimer={roomState.sendStartTimer}
              onStopTimer={roomState.sendStopTimer}
            />
            <button onClick={sounds.toggleSound}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-all"
              title={sounds.soundEnabled ? 'Mute sounds' : 'Enable sounds'}
            >
              {sounds.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button onClick={() => navigate('/')}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-all"
              title="Leave session"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 py-5 sm:px-6">
          {roomState.error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-5 text-sm">
              {roomState.error}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Left: card deck + results */}
            <div className="lg:col-span-2 space-y-5">
              {isVoter && (
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                  <CardDeck
                    cards={allCards}
                    selectedValue={myParticipant?.vote ?? null}
                    isRevealed={currentRoom.revealed}
                    onSelectCard={handleVote}
                  />
                </motion.div>
              )}
              <AnimatePresence>
                {currentRoom.revealed && (
                  <motion.div
                    key="vote-summary"
                    exit={{ opacity: 0, y: -20, scale: 0.97 }}
                    transition={{ duration: 0.35, ease: 'easeInOut' }}
                  >
                    <VoteSummary participants={roomState.roomState.participants} isRevealed={currentRoom.revealed} teamGroups={currentRoom.teamGroups} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Right sidebar */}
            <div className="space-y-4">
              <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
                <ParticipantList participants={roomState.participants} isRevealed={currentRoom.revealed} teamGroups={currentRoom.teamGroups} />
              </motion.div>
              <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
                <SessionControls
                  roomId={roomId} isRevealed={currentRoom.revealed} hasVotes={hasVotes}
                  currentDeckType={currentRoom.deckType} isModeratorOrVoter={isModeratorOrVoter}
                  isModerator={isModerator}
                  onReveal={handleReveal} onClear={handleClear} onSetDeck={roomState.sendSetDeck}
                />
              </motion.div>
              <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                <RoundHistory history={history} onClear={clearHistory} />
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

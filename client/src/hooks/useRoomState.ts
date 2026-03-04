import { useState, useCallback, useEffect, useRef } from 'react';
import type { FullRoomState, Participant, DeckType } from '@pointing-poker/shared/types';
import type { UsePartySockeReturn } from './usePartySocket';

export interface RoomStateHook {
  roomState: FullRoomState | null;
  participants: Participant[];
  myId: string | null;
  isRevealed: boolean;
  sendVote: (value: string | number) => void;
  sendReveal: () => void;
  sendClear: () => void;
  sendSetStory: (title: string) => void;
  sendStartTimer: (seconds: number) => void;
  sendStopTimer: () => void;
  sendJoin: (displayName: string, role: 'voter' | 'spectator', team?: string) => void;
  sendSetDeck: (deckType: string, customValues?: string[]) => void;
  sendSetTeams: (teams: string[]) => void;
  error: string | null;
}

function getPersistentId(): string {
  let id = localStorage.getItem('persistentUserId');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('persistentUserId', id);
  }
  return id;
}

export function useRoomState(partySocket: UsePartySockeReturn): RoomStateHook {
  const [roomState, setRoomState] = useState<FullRoomState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [myId, setMyId] = useState<string | null>(null);

  const sendMessage = partySocket.sendMessage;
  const hasJoinedRef = useRef(false);
  const prevConnectedRef = useRef(false);

  // Auto-rejoin on reconnect (network blip or browser switch)
  useEffect(() => {
    const isReconnect = partySocket.connected && !prevConnectedRef.current && hasJoinedRef.current;
    prevConnectedRef.current = partySocket.connected;

    if (isReconnect) {
      const displayName = localStorage.getItem('displayName');
      const role = (localStorage.getItem('userRole') as 'voter' | 'spectator') || 'voter';
      const team = localStorage.getItem('userTeam') || undefined;
      const persistentId = getPersistentId();
      if (displayName) {
        sendMessage({ type: 'join', displayName, role, persistentId, team });
      }
    }
  }, [partySocket.connected, sendMessage]);

  // Process incoming messages
  useEffect(() => {
    const message = partySocket.lastMessage;
    if (!message) return;

    switch (message.type) {
      case 'state':
        setMyId(message.yourId);
        setRoomState(message.state);
        break;

      case 'participant-joined':
        setRoomState((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            participants: { ...prev.participants, [message.participant.id]: message.participant },
          };
        });
        break;

      case 'participant-left':
        setRoomState((prev) => {
          if (!prev) return null;
          const { [message.id]: _, ...rest } = prev.participants;
          return { ...prev, participants: rest };
        });
        break;

      case 'vote-cast':
        setRoomState((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            participants: {
              ...prev.participants,
              [message.id]: { ...prev.participants[message.id], hasVoted: true },
            },
          };
        });
        break;

      case 'votes-revealed':
        setRoomState((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            room: { ...prev.room, revealed: true },
            participants: Object.entries(prev.participants).reduce(
              (acc, [id, p]) => {
                acc[id] = { ...p, vote: message.votes[id] ?? p.vote };
                return acc;
              },
              {} as Record<string, Participant>,
            ),
          };
        });
        break;

      case 'votes-cleared':
        setRoomState((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            room: { ...prev.room, revealed: false },
            participants: Object.entries(prev.participants).reduce(
              (acc, [id, p]) => {
                acc[id] = { ...p, vote: null, hasVoted: false };
                return acc;
              },
              {} as Record<string, Participant>,
            ),
          };
        });
        break;

      case 'story-updated':
        setRoomState((prev) => {
          if (!prev) return null;
          return { ...prev, room: { ...prev.room, currentStory: message.title } };
        });
        break;

      case 'deck-updated':
        setRoomState((prev) => {
          if (!prev) return null;
          return { ...prev, room: { ...prev.room, deckType: message.deckType, customDeck: message.customValues } };
        });
        break;

      case 'timer-started':
        setRoomState((prev) => {
          if (!prev) return null;
          return { ...prev, room: { ...prev.room, timerSeconds: message.seconds, timerStartedAt: message.startedAt } };
        });
        break;

      case 'timer-stopped':
        setRoomState((prev) => {
          if (!prev) return null;
          return { ...prev, room: { ...prev.room, timerSeconds: null, timerStartedAt: null } };
        });
        break;

      case 'teams-updated':
        setRoomState((prev) => {
          if (!prev) return null;
          return { ...prev, room: { ...prev.room, teamGroups: message.teams.length > 0 ? message.teams : undefined } };
        });
        break;

      case 'moderator-changed':
        setRoomState((prev) => {
          if (!prev) return null;
          const participants = { ...prev.participants };
          const oldModId = prev.room.moderatorId;
          // Demote old moderator back to voter if still present
          if (participants[oldModId] && oldModId !== message.newModeratorId) {
            participants[oldModId] = { ...participants[oldModId], role: 'voter' };
          }
          // Promote new moderator
          if (participants[message.newModeratorId]) {
            participants[message.newModeratorId] = { ...participants[message.newModeratorId], role: 'moderator' };
          }
          return {
            ...prev,
            room: { ...prev.room, moderatorId: message.newModeratorId },
            participants,
          };
        });
        break;

      case 'kicked':
        setError('You have been kicked from the session');
        break;

      case 'error':
        setError(message.message);
        break;
    }
  }, [partySocket.lastMessage]);

  const sendVote = useCallback((value: string | number) => { sendMessage({ type: 'vote', value }); }, [sendMessage]);
  const sendReveal = useCallback(() => { sendMessage({ type: 'reveal' }); }, [sendMessage]);
  const sendClear = useCallback(() => { sendMessage({ type: 'clear' }); }, [sendMessage]);
  const sendSetStory = useCallback((title: string) => { sendMessage({ type: 'set-story', title }); }, [sendMessage]);
  const sendStartTimer = useCallback((seconds: number) => { sendMessage({ type: 'start-timer', seconds }); }, [sendMessage]);
  const sendStopTimer = useCallback(() => { sendMessage({ type: 'stop-timer' }); }, [sendMessage]);

  const sendJoin = useCallback(
    (displayName: string, role: 'voter' | 'spectator', team?: string) => {
      const persistentId = getPersistentId();
      localStorage.setItem('userRole', role);
      if (team) localStorage.setItem('userTeam', team);
      else localStorage.removeItem('userTeam');
      hasJoinedRef.current = true;
      sendMessage({ type: 'join', displayName, role, persistentId, team });
    },
    [sendMessage],
  );

  const sendSetDeck = useCallback(
    (deckType: string, customValues?: string[]) => {
      sendMessage({ type: 'set-deck', deckType: deckType as DeckType, ...(customValues ? { customValues } : {}) });
    },
    [sendMessage],
  );

  const sendSetTeams = useCallback(
    (teams: string[]) => { sendMessage({ type: 'set-teams', teams }); },
    [sendMessage],
  );

  const participants = roomState ? Object.values(roomState.participants) : [];
  const isRevealed = roomState?.room.revealed ?? false;

  return {
    roomState, participants, myId, isRevealed,
    sendVote, sendReveal, sendClear, sendSetStory,
    sendStartTimer, sendStopTimer, sendJoin, sendSetDeck, sendSetTeams,
    error,
  };
}

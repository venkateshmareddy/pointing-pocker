import { useState, useCallback, useEffect } from 'react';
import type { ClientMessage, FullRoomState, Participant, DeckType } from '@pointing-poker/shared/types';
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
  sendJoin: (displayName: string, role: 'voter' | 'spectator') => void;
  sendSetDeck: (deckType: string, customValues?: string[]) => void;
  error: string | null;
}

export function useRoomState(
  partySocket: UsePartySockeReturn,
): RoomStateHook {
  const [roomState, setRoomState] = useState<FullRoomState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [myId, setMyId] = useState<string | null>(null);

  const sendMessage = partySocket.sendMessage;

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
            participants: {
              ...prev.participants,
              [message.participant.id]: message.participant,
            },
          };
        });
        break;

      case 'participant-left':
        setRoomState((prev) => {
          if (!prev) return null;
          const { [message.id]: _, ...rest } = prev.participants;
          return {
            ...prev,
            participants: rest,
          };
        });
        break;

      case 'vote-cast':
        setRoomState((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            participants: {
              ...prev.participants,
              [message.id]: {
                ...prev.participants[message.id],
                hasVoted: true,
              },
            },
          };
        });
        break;

      case 'votes-revealed':
        setRoomState((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            room: {
              ...prev.room,
              revealed: true,
            },
            participants: Object.entries(prev.participants).reduce(
              (acc, [id, participant]) => {
                acc[id] = {
                  ...participant,
                  vote: message.votes[id] ?? participant.vote,
                };
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
            room: {
              ...prev.room,
              revealed: false,
            },
            participants: Object.entries(prev.participants).reduce(
              (acc, [id, participant]) => {
                acc[id] = {
                  ...participant,
                  vote: null,
                  hasVoted: false,
                };
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
          return {
            ...prev,
            room: {
              ...prev.room,
              currentStory: message.title,
            },
          };
        });
        break;

      case 'deck-updated':
        setRoomState((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            room: {
              ...prev.room,
              deckType: message.deckType,
              customDeck: message.customValues,
            },
          };
        });
        break;

      case 'timer-started':
        setRoomState((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            room: {
              ...prev.room,
              timerSeconds: message.seconds,
              timerStartedAt: message.startedAt,
            },
          };
        });
        break;

      case 'timer-stopped':
        setRoomState((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            room: {
              ...prev.room,
              timerSeconds: null,
              timerStartedAt: null,
            },
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

  const sendVote = useCallback(
    (value: string | number) => {
      const msg: ClientMessage = { type: 'vote', value };
      sendMessage(msg);
    },
    [sendMessage],
  );

  const sendReveal = useCallback(() => {
    const msg: ClientMessage = { type: 'reveal' };
    sendMessage(msg);
  }, [sendMessage]);

  const sendClear = useCallback(() => {
    const msg: ClientMessage = { type: 'clear' };
    sendMessage(msg);
  }, [sendMessage]);

  const sendSetStory = useCallback(
    (title: string) => {
      const msg: ClientMessage = { type: 'set-story', title };
      sendMessage(msg);
    },
    [sendMessage],
  );

  const sendStartTimer = useCallback(
    (seconds: number) => {
      const msg: ClientMessage = { type: 'start-timer', seconds };
      sendMessage(msg);
    },
    [sendMessage],
  );

  const sendStopTimer = useCallback(() => {
    const msg: ClientMessage = { type: 'stop-timer' };
    sendMessage(msg);
  }, [sendMessage]);

  const sendJoin = useCallback(
    (displayName: string, role: 'voter' | 'spectator') => {
      const msg: ClientMessage = { type: 'join', displayName, role };
      sendMessage(msg);
    },
    [sendMessage],
  );

  const sendSetDeck = useCallback(
    (deckType: string, customValues?: string[]) => {
      const msg: ClientMessage = {
        type: 'set-deck',
        deckType: deckType as DeckType,
        ...(customValues ? { customValues } : {}),
      };
      sendMessage(msg);
    },
    [sendMessage],
  );

  const participants = roomState ? Object.values(roomState.participants) : [];
  const isRevealed = roomState?.room.revealed ?? false;

  return {
    roomState,
    participants,
    myId,
    isRevealed,
    sendVote,
    sendReveal,
    sendClear,
    sendSetStory,
    sendStartTimer,
    sendStopTimer,
    sendJoin,
    sendSetDeck,
    error,
  };
}

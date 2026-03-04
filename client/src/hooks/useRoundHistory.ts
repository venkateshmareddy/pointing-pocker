import { useState, useCallback } from 'react';
import type { Participant } from '@pointing-poker/shared/types';
import { calculateStats } from '@/lib/stats';

export interface RoundRecord {
  id: string;
  story: string;
  timestamp: string;
  votes: Array<{ name: string; vote: string | number | null }>;
  average: number | null;
  min: number | null;
  max: number | null;
  consensus: boolean;
}

const storageKey = (roomId: string) => `poker_history_${roomId}`;
const MAX_ROUNDS = 20;

function loadHistory(roomId: string): RoundRecord[] {
  try {
    const stored = localStorage.getItem(storageKey(roomId));
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function useRoundHistory(roomId: string) {
  const [history, setHistory] = useState<RoundRecord[]>(() => loadHistory(roomId));

  const saveRound = useCallback(
    (story: string, participants: Record<string, Participant>) => {
      const voteMap = Object.fromEntries(
        Object.entries(participants).map(([id, p]) => [id, p.vote]),
      );
      const stats = calculateStats(voteMap);

      const record: RoundRecord = {
        id: Date.now().toString(),
        story: story.trim() || 'Untitled Round',
        timestamp: new Date().toISOString(),
        votes: Object.values(participants)
          .filter((p) => p.role !== 'spectator')
          .map((p) => ({ name: p.displayName, vote: p.vote })),
        average: stats.average,
        min: stats.min,
        max: stats.max,
        consensus: stats.consensus,
      };

      setHistory((prev) => {
        const updated = [record, ...prev].slice(0, MAX_ROUNDS);
        localStorage.setItem(storageKey(roomId), JSON.stringify(updated));
        return updated;
      });
    },
    [roomId],
  );

  const clearHistory = useCallback(() => {
    localStorage.removeItem(storageKey(roomId));
    setHistory([]);
  }, [roomId]);

  return { history, saveRound, clearHistory };
}

import { isSpecialCard } from './decks';

export interface VoteStats {
  average: number | null;
  min: number | null;
  max: number | null;
  mode: number | null;
  consensus: boolean;
  distribution: Map<string | number, number>;
  numericVotes: number[];
  hasSpecialCards: boolean;
}

// Cards (special or deck) that map to a numeric value for stats purposes
const CARD_NUMERIC_VALUES: Record<string, number> = {
  '☕': 1,
  '½': 0.5,
};

export function calculateStats(votes: Record<string, string | number | null>): VoteStats {
  const allVotes = Object.values(votes).filter((v) => v !== null && v !== undefined);

  const numericVotes: number[] = [];
  const distribution = new Map<string | number, number>();
  let hasSpecialCards = false;

  for (const vote of allVotes) {
    if (isSpecialCard(vote)) {
      hasSpecialCards = true;
      distribution.set(vote, (distribution.get(vote) || 0) + 1);
      // Count special cards with a known numeric equivalent in the stats
      const numericEquiv = CARD_NUMERIC_VALUES[String(vote)];
      if (numericEquiv !== undefined) {
        numericVotes.push(numericEquiv);
      }
    } else {
      const numericValue = typeof vote === 'number'
        ? vote
        : (CARD_NUMERIC_VALUES[String(vote)] ?? parseFloat(String(vote)));
      if (!isNaN(numericValue)) {
        numericVotes.push(numericValue);
        distribution.set(vote, (distribution.get(vote) || 0) + 1);
      }
    }
  }

  if (numericVotes.length === 0) {
    return {
      average: null,
      min: null,
      max: null,
      mode: null,
      consensus: allVotes.length > 0 && new Set(allVotes).size === 1,
      distribution,
      numericVotes: [],
      hasSpecialCards,
    };
  }

  const average = numericVotes.reduce((a, b) => a + b, 0) / numericVotes.length;
  const min = Math.min(...numericVotes);
  const max = Math.max(...numericVotes);

  // Calculate mode (most frequent numeric value)
  let mode: number | null = null;
  let maxFrequency = 0;
  for (const vote of numericVotes) {
    const freq = numericVotes.filter((v) => v === vote).length;
    if (freq > maxFrequency) {
      maxFrequency = freq;
      mode = vote;
    }
  }

  // Consensus is true if all votes are the same
  const consensus = new Set(allVotes).size === 1;

  return {
    average: Math.round(average * 100) / 100,
    min,
    max,
    mode,
    consensus,
    distribution,
    numericVotes,
    hasSpecialCards,
  };
}

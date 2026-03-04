export type DeckDefinition = {
  name: string;
  values: (string | number)[];
};

export const DECKS: Record<string, DeckDefinition> = {
  fibonacci: {
    name: 'Fibonacci',
    values: [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89],
  },
  'modified-fibonacci': {
    name: 'Modified Fibonacci',
    values: ['0', '½', '1', '2', '3', '5', '8', '13', '20', '40', '100'],
  },
  tshirt: {
    name: 'T-Shirt Size',
    values: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  },
  'powers-of-2': {
    name: 'Powers of 2',
    values: [0, 1, 2, 4, 8, 16, 32, 64],
  },
  custom: {
    name: 'Custom',
    values: [],
  },
};

export const SPECIAL_CARDS = ['☕', '❓', '♾️'];

export function getDeckValues(
  deckType: string,
  customValues?: string[],
): (string | number)[] {
  if (customValues && customValues.length > 0) {
    return customValues;
  }
  if (deckType in DECKS) {
    return DECKS[deckType as keyof typeof DECKS].values;
  }
  return [];
}

export function getDeckName(deckType: string): string {
  if (deckType in DECKS) {
    return DECKS[deckType as keyof typeof DECKS].name;
  }
  return deckType;
}

export function getAllCards(
  deckType: string,
  customValues?: string[],
): (string | number)[] {
  return [...getDeckValues(deckType, customValues), ...SPECIAL_CARDS];
}

export function isSpecialCard(value: string | number): boolean {
  return SPECIAL_CARDS.includes(String(value));
}

export function isNumericCard(value: string | number): boolean {
  return typeof value === 'number' || /^\d+$/.test(String(value));
}

/** Parse a comma-separated string into deck values */
export function parseCustomDeck(input: string): string[] {
  return input
    .split(',')
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
}

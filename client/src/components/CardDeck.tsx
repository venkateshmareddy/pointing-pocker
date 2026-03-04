import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Card from './Card';
import { isSpecialCard } from '@/lib/decks';

interface CardDeckProps {
  cards: (string | number)[];
  selectedValue: string | number | null;
  isRevealed: boolean;
  onSelectCard: (value: string | number) => void;
}

export default function CardDeck({ cards, selectedValue, isRevealed, onSelectCard }: CardDeckProps) {
  const regularCards = cards.filter((c) => !isSpecialCard(c));
  const specialCards = cards.filter((c) => isSpecialCard(c));

  const prevRevealedRef = useRef(isRevealed);
  const [clearCount, setClearCount] = useState(0);
  const [clearMode, setClearMode] = useState(false);

  useEffect(() => {
    if (!isRevealed && prevRevealedRef.current) {
      setClearMode(true);
      setClearCount((c) => c + 1);
    }
    prevRevealedRef.current = isRevealed;
  }, [isRevealed]);

  useEffect(() => {
    if (clearMode) {
      const t = setTimeout(() => setClearMode(false), 700);
      return () => clearTimeout(t);
    }
  }, [clearMode]);

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">
        {isRevealed ? 'Round Complete — Votes Locked' : 'Pick Your Card'}
      </h3>

      <AnimatePresence mode="wait">
        <motion.div key={cards.join(',')} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
            {regularCards.map((card, i) => (
              <motion.div
                key={`${card}-${clearCount}`}
                initial={
                  clearMode
                    ? { opacity: 0, y: -12, rotate: i % 2 === 0 ? -7 : 7, scale: 0.85 }
                    : { opacity: 0, y: 16 }
                }
                animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
                transition={{ delay: i * 0.025, type: 'spring', stiffness: 320, damping: 22 }}
              >
                <Card
                  value={card}
                  isSelected={selectedValue === card}
                  isRevealed={isRevealed}
                  isSpecial={false}
                  onClick={() => onSelectCard(card)}
                />
              </motion.div>
            ))}
          </div>

          {specialCards.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-100 flex gap-3">
              {specialCards.map((card, i) => (
                <motion.div
                  key={`${card}-${clearCount}`}
                  className="w-16"
                  initial={
                    clearMode
                      ? { opacity: 0, y: -12, rotate: i % 2 === 0 ? -7 : 7, scale: 0.85 }
                      : { opacity: 0, y: 16 }
                  }
                  animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
                  transition={{ delay: (regularCards.length + i) * 0.025, type: 'spring', stiffness: 320, damping: 22 }}
                >
                  <Card
                    value={card}
                    isSelected={selectedValue === card}
                    isRevealed={isRevealed}
                    isSpecial={true}
                    onClick={() => onSelectCard(card)}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

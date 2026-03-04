import { motion } from 'framer-motion';
import { twMerge } from 'tailwind-merge';
import { User } from 'lucide-react';

interface CardProps {
  value: string | number;
  isSelected: boolean;
  isRevealed: boolean;
  isSpecial: boolean;
  onClick: () => void;
}

function getCardStyle(value: string | number, isSpecial: boolean) {
  if (isSpecial) return { bg: 'from-amber-500 to-orange-600', text: 'text-white' };
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  if (isNaN(num)) return { bg: 'from-slate-500 to-slate-700', text: 'text-white' };
  if (num === 0)  return { bg: 'from-slate-400 to-slate-600', text: 'text-white' };
  if (num <= 1)   return { bg: 'from-slate-100 to-slate-200', text: 'text-slate-800' };
  if (num <= 2)   return { bg: 'from-teal-400 to-emerald-500', text: 'text-white' };
  if (num <= 3)   return { bg: 'from-yellow-400 to-amber-500', text: 'text-white' };
  if (num <= 5)   return { bg: 'from-orange-400 to-orange-600', text: 'text-white' };
  if (num <= 8)   return { bg: 'from-blue-500 to-indigo-600', text: 'text-white' };
  if (num <= 13)  return { bg: 'from-indigo-500 to-violet-600', text: 'text-white' };
  if (num <= 21)  return { bg: 'from-purple-500 to-fuchsia-600', text: 'text-white' };
  if (num <= 34)  return { bg: 'from-rose-500 to-red-600', text: 'text-white' };
  return { bg: 'from-red-700 to-rose-900', text: 'text-white' };
}

export default function Card({ value, isSelected, isRevealed, isSpecial, onClick }: CardProps) {
  const { bg, text } = getCardStyle(value, isSpecial);

  return (
    <motion.button
      whileHover={
        !isRevealed
          ? { scale: 1.07, y: -6, transition: { type: 'spring', stiffness: 400, damping: 15 } }
          : undefined
      }
      whileTap={!isRevealed ? { scale: 0.96 } : undefined}
      animate={isSelected ? { scale: 1.1, y: -10 } : { scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      onClick={onClick}
      disabled={isRevealed}
      className={twMerge(
        'relative w-full aspect-[2/3] rounded-xl font-bold cursor-pointer select-none',
        `bg-gradient-to-br ${bg}`,
        isSelected
          ? 'ring-[3px] ring-indigo-500 shadow-2xl shadow-indigo-500/40'
          : 'shadow-md hover:shadow-lg border border-black/5',
        'disabled:cursor-not-allowed',
      )}
    >
      {/* Top shine */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-b from-white/25 to-transparent pointer-events-none" />

      {/* Top-left label */}
      <div className={`absolute top-1.5 left-2 text-[11px] font-black leading-none ${text} opacity-80`}>
        {value}
      </div>

      {/* Center value */}
      <div className={`absolute inset-0 flex items-center justify-center text-2xl font-black ${text} drop-shadow-sm`}>
        {value}
      </div>

      {/* Bottom-right label (rotated) */}
      <div className={`absolute bottom-1.5 right-2 text-[11px] font-black leading-none ${text} opacity-80 rotate-180`}>
        {value}
      </div>

      {/* Center bottom icon */}
      <div className={`absolute bottom-2 left-0 right-0 flex justify-center ${text} opacity-25`}>
        <User className="w-2.5 h-2.5" />
      </div>
    </motion.button>
  );
}

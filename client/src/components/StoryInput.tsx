import { useState, useCallback, useEffect } from 'react';
import { Edit2, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface StoryInputProps {
  currentStory: string;
  isEditable: boolean;
  onUpdate: (story: string) => void;
}

export default function StoryInput({
  currentStory,
  isEditable,
  onUpdate,
}: StoryInputProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(currentStory);

  useEffect(() => {
    setValue(currentStory);
  }, [currentStory]);

  const handleSave = useCallback(() => {
    if (value.trim() !== currentStory.trim()) {
      onUpdate(value.trim());
    }
    setIsEditing(false);
  }, [value, currentStory, onUpdate]);

  const handleCancel = useCallback(() => {
    setValue(currentStory);
    setIsEditing(false);
  }, [currentStory]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        {!isEditing ? (
          <motion.div
            key="display"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-between gap-4"
          >
            <div className="flex-1 relative">
              <h2 className="text-xl sm:text-2xl font-bold break-words">
                {currentStory ? (
                  <span className="text-white font-semibold">
                    {currentStory}
                  </span>
                ) : (
                  <span className="text-white/50 italic">
                    Enter a story to estimate...
                  </span>
                )}
              </h2>
              {/* Gradient underline */}
              {currentStory && (
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  className="h-0.5 mt-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-transparent origin-left"
                />
              )}
            </div>
            {isEditable && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsEditing(true)}
                className="p-2 rounded-lg bg-white/15 hover:bg-white/25 text-white/80 hover:text-white transition-all shrink-0"
                title="Edit story"
              >
                <Edit2 className="w-5 h-5" />
              </motion.button>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="editing"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="flex gap-2"
          >
            <input
              autoFocus
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter story or ticket to estimate..."
              className="flex-1 px-4 py-2 rounded-lg bg-white/15 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-white/60 focus:ring-2 focus:ring-white/20 transition-all"
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSave}
              className="p-2 rounded-lg bg-emerald-600/80 hover:bg-emerald-500/80 text-white transition-all shadow-lg shadow-emerald-500/20"
              title="Save"
            >
              <Check className="w-5 h-5" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleCancel}
              className="p-2 rounded-lg bg-white/15 hover:bg-white/25 text-white/80 transition-all"
              title="Cancel"
            >
              <X className="w-5 h-5" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

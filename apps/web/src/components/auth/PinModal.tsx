import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Delete } from 'lucide-react';

interface PinModalProps {
  profileName: string;
  isLoading: boolean;
  error: string | null;
  onSubmit: (pin: string) => void;
  onClose: () => void;
}

const PAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

export default function PinModal({ profileName, isLoading, error, onSubmit, onClose }: PinModalProps) {
  const [pin, setPin] = useState('');

  useEffect(() => {
    if (pin.length === 4) {
      onSubmit(pin);
      setPin('');
    }
  }, [pin, onSubmit]);

  const handleKey = (key: string) => {
    if (isLoading) return;
    if (key === 'del') {
      setPin((prev) => prev.slice(0, -1));
    } else if (pin.length < 4) {
      setPin((prev) => prev + key);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-[1.5vh] shadow-2xl p-[3vh] w-[90%] max-w-[40vh] flex flex-col items-center gap-[2vh]"
        >
          <div className="flex w-full justify-between items-center">
            <h3 className="text-[2.5vh] font-semibold text-gray-800">Enter PIN</h3>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X className="w-[2.5vh] h-[2.5vh]" />
            </button>
          </div>

          <p className="text-[1.9vh] text-gray-500 text-center">
            PIN for <span className="font-medium text-gray-800">{profileName}</span>
          </p>

          {/* PIN dots */}
          <div className="flex gap-[1.5vh]">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className={`w-[2.5vh] h-[2.5vh] rounded-full border-2 transition-all duration-150 ${
                  i < pin.length ? 'bg-gray-800 border-gray-800 scale-110' : 'bg-transparent border-gray-400'
                }`}
              />
            ))}
          </div>

          {error && (
            <p className="text-red-500 text-[1.8vh] text-center">{error}</p>
          )}

          {/* Number pad */}
          <div className="grid grid-cols-3 gap-[1.2vh] w-full">
            {PAD_KEYS.map((key, idx) => {
              if (key === '') return <div key={idx} />;
              return (
                <motion.button
                  key={key}
                  type="button"
                  whileTap={{ scale: 0.88 }}
                  onClick={() => handleKey(key)}
                  disabled={isLoading}
                  className="flex items-center justify-center py-[1.5vh] rounded-[.8vh] text-[2.2vh] font-medium bg-gray-100 hover:bg-gray-200 active:bg-gray-300 transition-colors disabled:opacity-50"
                >
                  {key === 'del' ? <Delete className="w-[2.2vh] h-[2.2vh]" /> : key}
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

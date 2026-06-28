import React, { useEffect, useState, useRef } from 'react';

interface SlotReelProps {
  symbol: string;
  spinning: boolean;
  delay?: number;
}

// Mapowanie angielskich nazw na emoji
const SYMBOL_EMOJI: Record<string, string> = {
  cherry:  '🍒',
  lemon:   '🍋',
  star:    '⭐',
  diamond: '💎',
  seven:   '7️⃣',
  // passthrough jeśli już emoji
  '🍒': '🍒',
  '🍋': '🍋',
  '⭐': '⭐',
  '💎': '💎',
  '7️⃣': '7️⃣',
};

const SPIN_SYMBOLS = ['🍒', '🍋', '⭐', '💎', '7️⃣', '🍒', '🍋', '⭐'];

const SlotReel: React.FC<SlotReelProps> = ({ symbol, spinning, delay = 0 }) => {
  const [displaySymbol, setDisplaySymbol] = useState(SYMBOL_EMOJI[symbol] || symbol);
  const [isAnimating, setIsAnimating] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const indexRef = useRef(0);

  useEffect(() => {
    if (spinning) {
      const timer = setTimeout(() => {
        setIsAnimating(true);
        intervalRef.current = setInterval(() => {
          indexRef.current = (indexRef.current + 1) % SPIN_SYMBOLS.length;
          setDisplaySymbol(SPIN_SYMBOLS[indexRef.current]);
        }, 80);
      }, delay);
      return () => clearTimeout(timer);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setIsAnimating(false);
      setDisplaySymbol(SYMBOL_EMOJI[symbol] || symbol);
    }
  }, [spinning, symbol, delay]);

  return (
    <div style={{
      width: '88px',
      height: '88px',
      background: 'linear-gradient(135deg, #1a1a30, #0a0a1f)',
      border: isAnimating ? '2px solid rgba(212, 175, 55, 0.9)' : '2px solid rgba(212, 175, 55, 0.4)',
      borderRadius: '12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '2.5rem',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: isAnimating 
        ? '0 0 20px rgba(212, 175, 55, 0.6), inset 0 0 15px rgba(0,0,0,0.5)' 
        : 'inset 0 0 10px rgba(0,0,0,0.5)',
      transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
    }}>
      {/* Scanline overlay */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)',
        pointerEvents: 'none',
        zIndex: 1,
      }} />
      
      <span style={{
        display: 'block',
        animation: isAnimating ? 'slot-blur-spin 0.1s linear infinite' : 'none',
        zIndex: 2,
        position: 'relative',
        lineHeight: 1,
      }}>
        {displaySymbol}
      </span>
    </div>
  );
};

export default SlotReel;

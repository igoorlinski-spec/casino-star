import React from 'react';

interface Card {
  suit: string;
  value?: string;
  rank?: string;
  numericValue?: number;
}

interface PlayingCardProps {
  card: Card;
  faceDown?: boolean;
}

// Mapowanie angielskich nazw kolorów na symbole
const SUIT_SYMBOLS: Record<string, string> = {
  hearts:   '♥',
  diamonds: '♦',
  clubs:    '♣',
  spades:   '♠',
  '♥': '♥',
  '♦': '♦',
  '♣': '♣',
  '♠': '♠',
};

const PlayingCard: React.FC<PlayingCardProps> = ({ card, faceDown = false }) => {
  if (faceDown) {
    return (
      <div style={{
        width: '80px',
        height: '110px',
        borderRadius: '10px',
        background: 'linear-gradient(135deg, #1a1a40 25%, #2a2a5a 50%, #1a1a40 75%)',
        border: '2px solid #d4af37',
        boxShadow: '0 4px 12px rgba(0,0,0,0.6)',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.8rem',
      }}>
        🎴
      </div>
    );
  }

  const suitSymbol = SUIT_SYMBOLS[card.suit] || card.suit;
  const rankDisplay = card.rank || card.value || '?';
  const isRed = suitSymbol === '♥' || suitSymbol === '♦';

  return (
    <div style={{
      width: '80px',
      height: '110px',
      background: 'white',
      borderRadius: '10px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '6px 8px',
      color: isRed ? '#cc0000' : '#111',
      fontWeight: '700',
      boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
      position: 'relative',
      userSelect: 'none',
      flexShrink: 0,
      animation: 'card-deal 0.3s ease-out',
    }}>
      {/* Górny lewy róg */}
      <div style={{ fontSize: '0.9rem', lineHeight: '1', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
        <span style={{ fontWeight: '800', fontSize: '1.1rem' }}>{rankDisplay}</span>
        <span style={{ fontSize: '1rem' }}>{suitSymbol}</span>
      </div>

      {/* Środek – duży symbol */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        fontSize: '2rem',
        lineHeight: '1',
      }}>
        {suitSymbol}
      </div>

      {/* Dolny prawy róg (odwrócony) */}
      <div style={{
        fontSize: '0.9rem',
        lineHeight: '1',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        transform: 'rotate(180deg)',
      }}>
        <span style={{ fontWeight: '800', fontSize: '1.1rem' }}>{rankDisplay}</span>
        <span style={{ fontSize: '1rem' }}>{suitSymbol}</span>
      </div>
    </div>
  );
};

export default PlayingCard;

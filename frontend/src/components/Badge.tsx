import React from 'react';

interface BadgeProps {
  wins: number;
}

const Badge: React.FC<BadgeProps> = ({ wins }) => {
  if (wins >= 500) {
    return <span className="badge badge-goat">★ GOAT Blackjack</span>;
  }
  if (wins >= 250) {
    return <span className="badge badge-boss">★ Boss Blackjack</span>;
  }
  if (wins >= 100) {
    return <span className="badge badge-consiliere">★ Consiliere Blackjack</span>;
  }
  if (wins >= 50) {
    return <span className="badge badge-new">★ Nowy Blackjack</span>;
  }
  if (wins >= 20) {
    return <span className="badge badge-amateur">★ Amator Blackjack</span>;
  }
  return <span className="badge" style={{ color: 'var(--text-secondary)' }}>Brak odznak</span>;
};

export default Badge;

import React from 'react';

interface NeedsBarProps {
  label: string;
  icon: string;
  value: number;
}

const NeedsBar: React.FC<NeedsBarProps> = ({ label, icon, value }) => {
  const roundedValue = Math.max(0, Math.min(100, Math.round(value)));
  
  let statusClass = 'high';
  if (roundedValue < 30) {
    statusClass = 'low';
  } else if (roundedValue < 60) {
    statusClass = 'medium';
  }

  return (
    <div className="needs-bar-container">
      <div className="needs-bar-label">
        <span>{icon} {label}</span>
        <span>{roundedValue}%</span>
      </div>
      <div className="needs-bar-track">
        <div 
          className={`needs-bar-fill ${statusClass}`}
          style={{ width: `${roundedValue}%` }}
        />
      </div>
    </div>
  );
};

export default NeedsBar;

import React from 'react';

interface CyberToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const CyberToggle: React.FC<CyberToggleProps> = ({ label, checked, onChange }) => (
  <div className="cyber-control">
    <label>{label}</label>
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="cyber-toggle"
    />
  </div>
);

export default CyberToggle; 
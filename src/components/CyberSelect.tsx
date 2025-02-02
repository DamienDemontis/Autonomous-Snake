import React from 'react';

interface CyberSelectProps {
  label: string;
  options: Array<{ value: 'simple' | 'moderate' | 'advanced'; label: string }>;
  value: string;
  onChange: (value: 'simple' | 'moderate' | 'advanced') => void;
}

const CyberSelect: React.FC<CyberSelectProps> = ({ label, options, value, onChange }) => (
  <div className="cyber-control">
    <label>{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as 'simple' | 'moderate' | 'advanced')}
      className="cyber-select"
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  </div>
);

export default CyberSelect; 
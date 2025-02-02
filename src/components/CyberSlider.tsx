import React from 'react';

interface CyberSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}

const CyberSlider: React.FC<CyberSliderProps> = ({ label, value, min, max, onChange }) => (
  <div className="cyber-control">
    <label>{label}</label>
    <input
      type="range"
      min={min}
      max={max}
      value={value}
      onChange={e => onChange(Number(e.target.value))}
      className="cyber-slider"
    />
    <span>{value}</span>
  </div>
);

export default CyberSlider; 
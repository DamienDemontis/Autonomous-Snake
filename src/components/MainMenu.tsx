import React, { useState } from 'react';
import { DEFAULT_CONFIG } from '../constants';
import type { GameConfig } from '../types';
import CyberSlider from './CyberSlider';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';

const MainMenu = ({ onStart }: { onStart: (config: GameConfig) => void }) => {
  const [config, setConfig] = useState<GameConfig>(() => {
    // Load saved config from localStorage
    const saved = localStorage.getItem('cyberSnakeConfig');
    return saved ? JSON.parse(saved) : DEFAULT_CONFIG;
  });

  const handleStart = () => {
    localStorage.setItem('cyberSnakeConfig', JSON.stringify(config));
    onStart(config);
  };

  return (
    <Router>
      <Routes>
        <Route path="/" element={
          <div className="cyber-container">
            <div className="cyber-frame">
              <div className="cyber-menu">
                <h1 className="cyber-title">
                  <span className="terminal-text">CYBER_SNAKE_v2.0</span>
                </h1>
                
                <div className="cyber-form">
                  <div className="input-group">
                    <span className="input-prefix"> config.grid_size</span>
                    <CyberSlider
                      label="Grid Size"
                      min={10}
                      max={50}
                      value={config.gridSize}
                      onChange={(v: number) => setConfig(c => ({ ...c, gridSize: v }))}
                    />
                  </div>
                  
                  <button 
                    className="cyber-button launch-button"
                    onClick={handleStart}
                  >
                    INITIALIZE_SIMULATION
                  </button>
                </div>
              </div>
            </div>
            <div className="scanline" />
          </div>
        } />
      </Routes>
    </Router>
  );
};

export default MainMenu; 
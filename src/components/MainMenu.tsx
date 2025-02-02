import React, { useState } from 'react';
import { DEFAULT_CONFIG, CELL_SIZE } from '../constants';
import type { GameConfig } from '../types';
import CyberSlider from './CyberSlider';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';

const MainMenu = ({ onStart }: { onStart: (config: GameConfig) => void }) => {
  const [config, setConfig] = useState<GameConfig>(() => {
    // Load saved config from localStorage
    const saved = localStorage.getItem('cyberSnakeConfig');
    return saved ? JSON.parse(saved) : { ...DEFAULT_CONFIG, cellSize: CELL_SIZE };
  });

  const handleStart = () => {
    localStorage.setItem('cyberSnakeConfig', JSON.stringify(config));
    onStart(config);
  };

  // Adjust cell size based on screen size
  React.useEffect(() => {
    const updateCellSize = () => {
      const width = window.innerWidth;
      let newCellSize = CELL_SIZE;
      
      if (width <= 480) { // Mobile phones
        newCellSize = 15;
      } else if (width <= 768) { // Tablets
        newCellSize = 18;
      }
      
      setConfig(c => ({ ...c, cellSize: newCellSize }));
    };

    updateCellSize();
    window.addEventListener('resize', updateCellSize);
    return () => window.removeEventListener('resize', updateCellSize);
  }, []);

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
                    <span className="input-prefix">config.grid_size</span>
                    <CyberSlider
                      label="Grid Size"
                      min={10}
                      max={window.innerWidth <= 480 ? 30 : 50}
                      value={config.gridSize}
                      onChange={(v: number) => setConfig(c => ({ ...c, gridSize: v }))}
                    />
                  </div>

                  <div className="input-group">
                    <span className="input-prefix">config.snake_count</span>
                    <CyberSlider
                      label="Snake Count"
                      min={1}
                      max={window.innerWidth <= 480 ? 6 : 10}
                      value={config.snakeCount}
                      onChange={(v: number) => setConfig(c => ({ ...c, snakeCount: v }))}
                    />
                  </div>

                  <div className="input-group">
                    <span className="input-prefix">config.game_speed</span>
                    <CyberSlider
                      label="Game Speed"
                      min={1}
                      max={20}
                      value={config.gameSpeed}
                      onChange={(v: number) => setConfig(c => ({ ...c, gameSpeed: v }))}
                    />
                    <span className="speed-label">
                      {config.gameSpeed <= 5 ? 'SLOW' : 
                       config.gameSpeed <= 10 ? 'NORMAL' : 
                       config.gameSpeed <= 15 ? 'FAST' : 'EXTREME'}
                    </span>
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
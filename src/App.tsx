import React, { useState } from 'react';
import MainMenu from './components/MainMenu';
import GameBoard from './components/GameBoard';
import { GameConfig } from './types';
import { CELL_SIZE } from './constants';

const App: React.FC = () => {
  const [gameConfig, setGameConfig] = useState<GameConfig | null>(null);

  return (
    <div className="cyber-container">
      {gameConfig ? (
        <GameBoard
          snakeCount={gameConfig.snakeCount}
          gameSpeed={gameConfig.gameSpeed}
          cellSize={gameConfig.cellSize || CELL_SIZE}
        />
      ) : (
        <MainMenu onStart={(config) => setGameConfig(config)} />
      )}
    </div>
  );
};

export default App; 
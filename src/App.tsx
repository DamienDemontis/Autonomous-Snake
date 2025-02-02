import React, { useState } from 'react';
import MainMenu from './components/MainMenu';
import GameBoard from './components/GameBoard';
import { GameConfig } from './types';

const App: React.FC = () => {
  const [gameConfig, setGameConfig] = useState<GameConfig | null>(null);

  return (
    <div className="cyber-container">
      {gameConfig ? (
        <GameBoard
          width={gameConfig.gridSize}
          height={gameConfig.gridSize}
          snakeCount={gameConfig.snakeCount}
          gameSpeed={gameConfig.gameSpeed}
        />
      ) : (
        <MainMenu onStart={(config) => setGameConfig(config)} />
      )}
    </div>
  );
};

export default App; 
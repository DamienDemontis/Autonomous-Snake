import React, { useRef, useEffect, useCallback, useState, useReducer } from 'react';
import { Position, Snake, PowerUp, GameState } from '../types';
import { CELL_SIZE, CYBER_COLORS, DIRECTIONS, POWERUP_COLORS, POWERUP_DURATION } from '../constants';
import { getRandomPosition, moveSnake, checkCollisions, findNearestFruit, calculateBestDirection, checkCollision } from '../gameUtils';
import { generateUniqueColors } from '../constants';
import { gameReducer } from '../gameReducer';

interface GameBoardProps {
  width: number;
  height: number;
  snakeCount: number;
  gameSpeed: number;
}

const initialState: GameState = {
  snakes: [],
  fruits: [],
  powerUps: [],
  width: 0,
  height: 0
};

const GameBoard = ({ width, height, snakeCount, gameSpeed }: GameBoardProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, dispatch] = useReducer(gameReducer, {
    ...initialState,
    width,
    height
  });
  const [scores, setScores] = useState<{ [key: number]: number }>({});
  const [gameOver, setGameOver] = useState(false);
  const [powerUps, setPowerUps] = useState<PowerUp[]>([]);
  const lastUpdate = useRef<number>(0);
  const frameCount = useRef(0);

  const MAX_POWERUPS = 5;

  // Increase minimum distance between snakes
  const MIN_DISTANCE = 8;

  // Initialize game state
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    canvas.width = width * CELL_SIZE;
    canvas.height = height * CELL_SIZE;

    // Initialize snakes with unique colors
    const colors = generateUniqueColors(snakeCount);
    const newSnakes = [];
    const occupiedPositions: Position[] = [];

    for (let i = 0; i < snakeCount; i++) {
      let position: Position;
      let isValidPosition = false;
      let attempts = 0;
      
      do {
        position = getRandomPosition(width, height);
        isValidPosition = 
          position.x >= MIN_DISTANCE && 
          position.x < width - MIN_DISTANCE &&
          position.y >= MIN_DISTANCE && 
          position.y < height - MIN_DISTANCE &&
          !occupiedPositions.some(pos => 
            Math.abs(pos.x - position.x) <= 4 &&  // Increased from 2
            Math.abs(pos.y - position.y) <= 4
          );
        attempts++;
      } while (!isValidPosition && attempts < 100);

      // Get safe initial directions
      const validDirections = DIRECTIONS.filter(dir => {
        const newX = position.x + dir.x;
        const newY = position.y + dir.y;
        const isValid = newX >= 0 && newX < width && newY >= 0 && newY < height;
        console.log(`Snake ${i} direction ${dir.x},${dir.y} valid:`, isValid);
        return isValid;
      });

      occupiedPositions.push(position);
      
      newSnakes.push({
        id: i,
        body: [position],
        direction: validDirections.length > 0 
          ? validDirections[Math.floor(Math.random() * validDirections.length)]
          : DIRECTIONS[0],
        color: colors[i],
        score: 0,
        alive: true,
        powerUps: [],
        speedMultiplier: 1,
        invulnerable: false
      });

      console.log(`Snake ${i} initialized at`, position, 
        'with direction', validDirections[0], 
        'valid directions:', validDirections);
    }
    
    dispatch({ type: 'INIT_SNAKES', payload: newSnakes });
    dispatch({ 
      type: 'UPDATE_FRUITS', 
      payload: Array.from({ length: 3 }, () => 
        getRandomPosition(width, height)
      ) 
    });
  }, []);

  // Move these functions BEFORE the gameLoop declaration
  const checkFruitConsumption = () => {
    dispatch({ type: 'CHECK_FRUIT_CONSUMPTION' });
  };

  const checkPowerUps = () => {
    dispatch({ type: 'CHECK_POWERUPS' });
  };

  const spawnPowerUps = () => {
    if (gameState.powerUps.length >= MAX_POWERUPS) return;
    if (Math.random() < 0.02) {
      const types = Object.keys(POWERUP_COLORS) as PowerUp['type'][];
      const newPowerUp = {
        position: getRandomPosition(width, height),
        type: types[Math.floor(Math.random() * types.length)],
        active: false,
        duration: POWERUP_DURATION
      };
      dispatch({ type: 'ADD_POWERUP', payload: newPowerUp });
    }
  };

  const checkCollisions = () => {
    dispatch({ type: 'CHECK_COLLISIONS' });
  };

  // Then declare gameLoop AFTER these functions
  const gameLoop = useCallback(() => {
    frameCount.current++;
    const now = Date.now();
    if (now - lastUpdate.current > 1000 / gameSpeed) {
      dispatch({ type: 'MOVE_SNAKES' });
      checkCollisions();
      checkFruitConsumption();
      checkPowerUps();
      spawnPowerUps();
      lastUpdate.current = now;
    }
  }, [gameSpeed, checkCollisions, checkFruitConsumption, checkPowerUps, spawnPowerUps]);

  // Optimized draw function
  const draw = useCallback(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    // Batch draw operations
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // Draw all elements in single layers
    drawBackground(ctx);
    drawFruits(ctx, gameState.fruits);
    drawSnakes(ctx, gameState.snakes);
    drawPowerUps(ctx, gameState.powerUps);
  }, [gameState]);

  const spawnFruits = () => {
    dispatch({
      type: 'UPDATE_FRUITS',
      payload: Array.from({ length: 3 }, () => 
        getRandomPosition(width, height)
      )
    });
  };

  useEffect(() => {
    const animate = () => {
      draw();
      requestAnimationFrame(animate);
    };
    animate();
  }, [draw]);

  // Add these drawing functions inside the component
  const drawBackground = (ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // Draw grid lines
    ctx.strokeStyle = '#1a1a2f';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= width; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL_SIZE, 0);
      ctx.lineTo(i * CELL_SIZE, ctx.canvas.height);
      ctx.stroke();
    }
  };

  const drawFruits = (ctx: CanvasRenderingContext2D, fruits: Position[]) => {
    fruits.forEach(fruit => {
      ctx.fillStyle = '#ff4757';
      ctx.beginPath();
      ctx.arc(
        fruit.x * CELL_SIZE + CELL_SIZE/2,
        fruit.y * CELL_SIZE + CELL_SIZE/2,
        CELL_SIZE/2, 0, Math.PI * 2
      );
      ctx.fill();
    });
  };

  const drawSnakes = (ctx: CanvasRenderingContext2D, snakes: Snake[]) => {
    snakes.forEach(snake => {
      if (!snake.alive) return;
      snake.body.forEach(segment => {
        ctx.fillStyle = snake.color;
        ctx.shadowColor = snake.color;
        ctx.shadowBlur = 10;
        ctx.fillRect(segment.x * CELL_SIZE, segment.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      });
    });
  };

  const drawPowerUps = (ctx: CanvasRenderingContext2D, powerUps: PowerUp[]) => {
    powerUps.forEach(powerUp => {
      ctx.fillStyle = POWERUP_COLORS[powerUp.type];
      ctx.beginPath();
      ctx.arc(
        powerUp.position.x * CELL_SIZE + CELL_SIZE/2,
        powerUp.position.y * CELL_SIZE + CELL_SIZE/2,
        CELL_SIZE/2, 0, Math.PI * 2
      );
      ctx.fill();
      ctx.shadowColor = POWERUP_COLORS[powerUp.type];
      ctx.shadowBlur = 15;
    });
  };

  // Add to checkCollisions effect
  console.log(`Frame ${frameCount.current} - Alive snakes:`, 
    gameState.snakes.filter(s => s.alive).map(s => s.id));

  // Add this useEffect to start the game loop
  useEffect(() => {
    const loop = () => {
      gameLoop();
      requestAnimationFrame(loop);
    };
    loop();
  }, [gameLoop]);

  return (
    <div className="game-container">
      <canvas ref={canvasRef} className="cyber-canvas" />
      {gameOver && (
        <div className="cyber-overlay">
          <h2 className="glitch">GAME OVER</h2>
          <div className="score-board">
            {gameState.snakes.map((snake: Snake) => (
              <div key={snake.id} style={{ color: snake.color }}>
                Snake {snake.id + 1}: {snake.score}pts
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="hud">
        <div className="score-display">
          {gameState.snakes.map((snake: Snake) => (
            <div key={snake.id} className="score-item">
              <span style={{ color: snake.color }}>■■</span>
              {snake.score}
            </div>
          ))}
        </div>
      </div>
      <div className="scanline" />
    </div>
  );
};

export default GameBoard; 
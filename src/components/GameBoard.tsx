import React, { useRef, useEffect, useCallback, useState, useReducer, useMemo } from 'react';
import { Position, Snake, PowerUp, GameState } from '../types';
import { CELL_SIZE, CYBER_COLORS, DIRECTIONS, POWERUP_COLORS, POWERUP_DURATION } from '../constants';
import { getRandomPosition, moveSnake, checkCollisions, findNearestFruit, calculateBestDirection, checkCollision } from '../gameUtils';
import { generateUniqueColors } from '../constants';
import { gameReducer } from '../gameReducer';

interface GameBoardProps {
  snakeCount: number;
  gameSpeed: number;
  cellSize?: number;  // New prop for configurable cell size
}

const initialState: GameState = {
  snakes: [],
  fruits: [],
  powerUps: [],
  width: 0,
  height: 0
};

const GameBoard = ({ snakeCount, gameSpeed, cellSize = CELL_SIZE }: GameBoardProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [gameState, dispatch] = useReducer(gameReducer, {
    ...initialState,
    width: 0,
    height: 0
  });
  const [scores, setScores] = useState<{ [key: number]: number }>({});
  const [gameOver, setGameOver] = useState(false);
  const [powerUps, setPowerUps] = useState<PowerUp[]>([]);
  const lastUpdate = useRef<number>(0);
  const frameCount = useRef(0);
  const animationFrameId = useRef<number | undefined>(undefined);
  const lastFrameTime = useRef<number>(0);
  const FPS = 60; // Target FPS for rendering
  const frameInterval = 1000 / FPS;
  const BASE_TPS = 5; // Increased base ticks per second (was 2)
  // Exponential scaling for more dynamic speed range
  const tickInterval = 1000 / (BASE_TPS * Math.pow(1.2, gameSpeed - 1));

  const MAX_POWERUPS = 5;

  // Increase minimum distance between snakes
  const MIN_DISTANCE = 8;

  // Add these refs at the top with other refs
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const backgroundImageRef = useRef<ImageData | null>(null);

  // Replace the grid lines useMemo with this optimized version
  const initializeBackground = useCallback(() => {
    if (!dimensions.width || !dimensions.height) return;
    
    // Create offscreen canvas if it doesn't exist
    if (!offscreenCanvasRef.current) {
      offscreenCanvasRef.current = document.createElement('canvas');
    }
    
    const offscreenCanvas = offscreenCanvasRef.current;
    offscreenCanvas.width = window.innerWidth;
    offscreenCanvas.height = window.innerHeight;
    const ctx = offscreenCanvas.getContext('2d')!;
    
    // Draw background
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);
    
    // Draw grid lines
    ctx.strokeStyle = '#1a1a2f';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    
    // Vertical lines
    for (let i = 0; i <= dimensions.width; i++) {
      const x = i * cellSize;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, offscreenCanvas.height);
    }
    
    // Horizontal lines
    for (let i = 0; i <= dimensions.height; i++) {
      const y = i * cellSize;
      ctx.moveTo(0, y);
      ctx.lineTo(offscreenCanvas.width, y);
    }
    
    ctx.stroke();
    
    // Store the background image
    backgroundImageRef.current = ctx.getImageData(0, 0, offscreenCanvas.width, offscreenCanvas.height);
  }, [dimensions.width, dimensions.height, cellSize]);

  // Call initializeBackground when dimensions change
  useEffect(() => {
    initializeBackground();
  }, [initializeBackground]);

  // Replace the drawBackground function with this optimized version
  const drawBackground = useCallback((ctx: CanvasRenderingContext2D) => {
    if (backgroundImageRef.current) {
      ctx.putImageData(backgroundImageRef.current, 0, 0);
    }
  }, []);

  // Add resize handler
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current) return;
      
      const container = containerRef.current;
      const width = Math.floor(window.innerWidth / cellSize);
      const height = Math.floor(window.innerHeight / cellSize);
      
      setDimensions({ width, height });
      
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }

      // Update game state with new dimensions
      dispatch({
        type: 'UPDATE_DIMENSIONS',
        payload: { width, height }
      });
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [cellSize]);

  // Modify the initialization effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Initialize snakes with unique colors
    const colors = generateUniqueColors(snakeCount);
    const newSnakes: Snake[] = [];
    const occupiedPositions: Position[] = [];

    for (let i = 0; i < snakeCount; i++) {
      let position: Position;
      let isValidPosition = false;
      let attempts = 0;
      
      do {
        position = getRandomPosition(dimensions.width, dimensions.height, gameState.snakes);
        isValidPosition = 
          position.x >= MIN_DISTANCE && 
          position.x < dimensions.width - MIN_DISTANCE &&
          position.y >= MIN_DISTANCE && 
          position.y < dimensions.height - MIN_DISTANCE &&
          !occupiedPositions.some(pos => 
            Math.abs(pos.x - position.x) <= 4 &&
            Math.abs(pos.y - position.y) <= 4
          );
        attempts++;
      } while (!isValidPosition && attempts < 100);

      // Get safe initial directions
      const validDirections = DIRECTIONS.filter(dir => {
        const newX = position.x + dir.x;
        const newY = position.y + dir.y;
        const isValid = newX >= 0 && newX < dimensions.width && newY >= 0 && newY < dimensions.height;
        console.log(`Snake ${i} direction ${dir.x},${dir.y} valid:`, isValid);
        return isValid;
      });

      if (validDirections.length === 0) {
        console.log(`No valid directions found for snake ${i}, retrying position`);
        continue; // Try a new position
      }

      occupiedPositions.push(position);
      
      const initialDirection = validDirections[Math.floor(Math.random() * validDirections.length)];
      
      newSnakes.push({
        id: i,
        body: [
          position,
          { 
            x: position.x - initialDirection.x, 
            y: position.y - initialDirection.y 
          },
          { 
            x: position.x - initialDirection.x * 2, 
            y: position.y - initialDirection.y * 2 
          }
        ],
        direction: initialDirection,
        color: colors[i],
        score: 0,
        alive: true,
        powerUps: [],
        speedMultiplier: 1,
        invulnerable: false
      });

      console.log(`Snake ${i} initialized at`, position, 
        'with direction', initialDirection, 
        'valid directions:', validDirections);
    }
    
    if (newSnakes.length === 0) {
      console.error('Failed to initialize any snakes with valid positions');
      // Initialize at least one snake in the center
      const centerX = Math.floor(dimensions.width / 2);
      const centerY = Math.floor(dimensions.height / 2);
      newSnakes.push({
        id: 0,
        body: [
          { x: centerX, y: centerY },
          { x: centerX - 1, y: centerY },
          { x: centerX - 2, y: centerY }
        ],
        direction: DIRECTIONS[0],
        color: colors[0],
        score: 0,
        alive: true,
        powerUps: [],
        speedMultiplier: 1,
        invulnerable: false
      });
    }

    dispatch({ type: 'INIT_SNAKES', payload: newSnakes });
    dispatch({ 
      type: 'UPDATE_FRUITS', 
      payload: Array.from({ length: 3 }, () => 
        getRandomPosition(dimensions.width, dimensions.height, newSnakes)
      ) 
    });
  }, [dimensions]);

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
        position: getRandomPosition(dimensions.width, dimensions.height, gameState.snakes),
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

  // Optimized draw functions
  const drawFruits = useCallback((ctx: CanvasRenderingContext2D, fruits: Position[]) => {
    ctx.fillStyle = '#ff4757';
    ctx.beginPath();
    
    fruits.forEach(fruit => {
      ctx.moveTo(fruit.x * cellSize + cellSize/2, fruit.y * cellSize + cellSize/2);
      ctx.arc(
        fruit.x * cellSize + cellSize/2,
        fruit.y * cellSize + cellSize/2,
        cellSize/2, 0, Math.PI * 2
      );
    });
    
    ctx.fill();
  }, [cellSize]);

  const drawSnakes = useCallback((ctx: CanvasRenderingContext2D, snakes: Snake[]) => {
    ctx.shadowBlur = 10;
    
    snakes.forEach(snake => {
      if (!snake.alive) return;
      
      ctx.fillStyle = snake.color;
      ctx.shadowColor = snake.color;
      
      // Batch draw snake segments
      ctx.beginPath();
      snake.body.forEach(segment => {
        ctx.rect(
          segment.x * cellSize,
          segment.y * cellSize,
          cellSize,
          cellSize
        );
      });
      ctx.fill();
    });
    
    // Reset shadow for better performance
    ctx.shadowBlur = 0;
  }, [cellSize]);

  const drawPowerUps = useCallback((ctx: CanvasRenderingContext2D, powerUps: PowerUp[]) => {
    powerUps.forEach(powerUp => {
      ctx.fillStyle = POWERUP_COLORS[powerUp.type];
      ctx.shadowColor = POWERUP_COLORS[powerUp.type];
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(
        powerUp.position.x * cellSize + cellSize/2,
        powerUp.position.y * cellSize + cellSize/2,
        cellSize/2, 0, Math.PI * 2
      );
      ctx.fill();
    });
    
    // Reset shadow
    ctx.shadowBlur = 0;
  }, [cellSize]);

  // Optimize the draw function
  const draw = useCallback((timestamp: number) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    // Calculate elapsed time
    const elapsed = timestamp - lastFrameTime.current;

    // Only draw if enough time has passed
    if (elapsed >= frameInterval) {
      // Clear with background
      drawBackground(ctx);
      
      // Draw game elements with batching
      ctx.save(); // Save context state once
      
      // Draw fruits
      drawFruits(ctx, gameState.fruits);
      
      // Draw snakes with optimized shadow
      ctx.shadowBlur = 10;
      gameState.snakes.forEach(snake => {
        if (!snake.alive) return;
        
        ctx.fillStyle = snake.color;
        ctx.shadowColor = snake.color;
        ctx.beginPath();
        
        snake.body.forEach(segment => {
          ctx.rect(
            segment.x * cellSize,
            segment.y * cellSize,
            cellSize,
            cellSize
          );
        });
        ctx.fill();
      });
      
      // Draw power-ups with optimized shadow
      ctx.shadowBlur = 15;
      gameState.powerUps.forEach(powerUp => {
        ctx.fillStyle = POWERUP_COLORS[powerUp.type];
        ctx.shadowColor = POWERUP_COLORS[powerUp.type];
        ctx.beginPath();
        ctx.arc(
          powerUp.position.x * cellSize + cellSize/2,
          powerUp.position.y * cellSize + cellSize/2,
          cellSize/2, 0, Math.PI * 2
        );
        ctx.fill();
      });
      
      ctx.restore(); // Restore context state once
      
      lastFrameTime.current = timestamp;
    }
  }, [gameState, drawBackground, drawFruits, drawSnakes, drawPowerUps]);

  // Implement separate game loop and render loop
  useEffect(() => {
    let lastRenderTime = 0;
    let lastTickTime = 0;
    let gameTickTimeout: NodeJS.Timeout | null = null;
    
    // Separate game logic tick function
    const gameTick = () => {
      const now = Date.now();
      
      // Game logic updates
      dispatch({ type: 'MOVE_SNAKES' });
      
      // Batch all state updates
      checkCollisions();
      checkFruitConsumption();
      checkPowerUps();
      if (Math.random() < 0.02) spawnPowerUps();
      
      // Schedule next tick with fixed interval
      gameTickTimeout = setTimeout(gameTick, tickInterval);
    };
    
    // Render loop
    const renderLoop = (timestamp: number) => {
      // Only render at target FPS
      if (timestamp - lastRenderTime >= frameInterval) {
        draw(timestamp);
        lastRenderTime = timestamp;
      }
      
      animationFrameId.current = requestAnimationFrame(renderLoop);
    };
    
    // Start both loops
    gameTickTimeout = setTimeout(gameTick, tickInterval);
    animationFrameId.current = requestAnimationFrame(renderLoop);
    
    // Cleanup
    return () => {
      if (gameTickTimeout) {
        clearTimeout(gameTickTimeout);
      }
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [gameSpeed, draw, tickInterval]);

  return (
    <div ref={containerRef} className="game-container" style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <canvas ref={canvasRef} className="cyber-canvas" style={{ width: '100%', height: '100%' }} />
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

export default React.memo(GameBoard); 
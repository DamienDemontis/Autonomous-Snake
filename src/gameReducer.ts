import { GameState, Snake, Position, PowerUp } from './types';
import { moveSnake, calculateBestDirection, findNearestFruit, checkCollision, respawnSnake, getRandomPosition } from './gameUtils';

type GameAction =
  | { type: 'INIT_SNAKES'; payload: Snake[] }
  | { type: 'MOVE_SNAKES' }
  | { type: 'CHECK_FRUIT_CONSUMPTION' }
  | { type: 'CHECK_POWERUPS' }
  | { type: 'ADD_POWERUP'; payload: PowerUp }
  | { type: 'CHECK_COLLISIONS' }
  | { type: 'UPDATE_FRUITS'; payload: Position[] }
  | { type: 'UPDATE_POWERUPS'; payload: PowerUp[] }
  | { type: 'UPDATE_DIMENSIONS'; payload: { width: number; height: number } };

function checkHeadCollisions(snakes: Snake[]): string[] {
  const deadSnakes = new Set<string>();
  const headPositions = new Map<string, string>(); // Map of cellKey to snakeId

  // First pass - record all head positions
  for (const snake of snakes) {
    const head = snake.body[0];
    const cellKey = `${head.x},${head.y}`;
    
    // Check if this cell is already claimed by another snake's head
    if (headPositions.has(cellKey)) {
      deadSnakes.add(snake.id.toString());
      deadSnakes.add(headPositions.get(cellKey)!);
    } else {
      headPositions.set(cellKey, snake.id.toString());
    }
  }

  return Array.from(deadSnakes);
}

export const gameReducer = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
    case 'INIT_SNAKES':
      return { ...state, snakes: action.payload };
      
    case 'MOVE_SNAKES':
      const snakes = state.snakes.map(snake => {
        if (!snake.alive) {
          console.log(`Snake ${snake.id} already dead`);
          return snake;
        }
        
        const target = findNearestFruit(snake.body[0], state.fruits);
        const movedSnake = moveSnake(
          snake, 
          calculateBestDirection(
            snake.body[0],
            target,
            state.width,
            state.height,
            state.snakes
          ),
          state.width,
          state.height
        );
        
        console.log(`Snake ${snake.id} new position:`, movedSnake.body[0], 
          'Alive:', movedSnake.alive);
        return movedSnake;
      });

      // Check for head-to-head collisions first
      const headCollisionVictims = checkHeadCollisions(snakes);
      
      // Then check other collisions
      const updatedSnakes = snakes.map(snake => {
        if (!snake.alive || headCollisionVictims.includes(snake.id.toString())) {
          return respawnSnake(snake, state.width, state.height, state.snakes);
        }
        
        const collided = checkCollision(
          snake.body[0], 
          state.snakes,
          state.width,
          state.height,
          snake.id
        );
        
        return collided ? respawnSnake(snake, state.width, state.height, state.snakes) : snake;
      });

      return {
        ...state,
        snakes: updatedSnakes
      };
      
    case 'UPDATE_FRUITS':
      return {
        ...state,
        fruits: [
          ...action.payload as Position[],
          ...Array.from({ length: 3 - state.fruits.length }, () => 
            getRandomPosition(state.width, state.height, state.snakes)
          )
        ].slice(0, 3) // Maintain exactly 3 fruits
      };
    case 'UPDATE_POWERUPS':
      return { 
        ...state, 
        powerUps: action.payload as PowerUp[] 
      };
    case 'CHECK_FRUIT_CONSUMPTION':
      const remainingFruits = state.fruits.filter((_, i) => 
        !state.snakes.some(snake => 
          snake.alive && 
          snake.body[0].x === state.fruits[i].x && 
          snake.body[0].y === state.fruits[i].y
        )
      );
      
      // Add new fruits to maintain 3 total
      const newFruits = [
        ...remainingFruits,
        ...Array.from({ length: 3 - remainingFruits.length }, () => 
          getRandomPosition(state.width, state.height, state.snakes)
        )
      ];

      return {
        ...state,
        snakes: state.snakes.map(snake => {
          if (!snake.alive) return snake;
          
          const head = snake.body[0];
          const eatenFruit = state.fruits.some(f => f.x === head.x && f.y === head.y);
          
          return eatenFruit ? {
            ...snake,
            body: [...snake.body, snake.body[snake.body.length - 1]],
            score: snake.score + 10
          } : snake;
        }),
        fruits: newFruits
      };
    case 'UPDATE_DIMENSIONS':
      return {
        ...state,
        width: action.payload.width,
        height: action.payload.height
      };
    default:
      return state;
  }
}; 
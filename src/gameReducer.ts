import { GameState, GameAction, Position, PowerUp } from './types';
import { moveSnake, calculateBestDirection, findNearestFruit, checkCollision, respawnSnake, getRandomPosition } from './gameUtils';

export const gameReducer = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
    case 'INIT_SNAKES':
      return { ...state, snakes: action.payload };
      
    case 'MOVE_SNAKES':
      return {
        ...state,
        snakes: state.snakes.map(snake => {
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
            state.width,  // Add grid dimensions
            state.height
          );
          
          console.log(`Snake ${snake.id} new position:`, movedSnake.body[0], 
            'Alive:', movedSnake.alive);
          return movedSnake;
        })
      };
      
    case 'CHECK_COLLISIONS':
      return {
        ...state,
        snakes: state.snakes.map(snake => {
          const collided = checkCollision(
            snake.body[0], 
            state.snakes,
            state.width,
            state.height,
            snake.id
          );
          
          return collided ? respawnSnake(snake, state.width, state.height) : snake;
        })
      };
      
    case 'UPDATE_FRUITS':
      return {
        ...state,
        fruits: [
          ...action.payload as Position[],
          ...Array.from({ length: 3 - state.fruits.length }, () => 
            getRandomPosition(state.width, state.height)
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
          getRandomPosition(state.width, state.height)
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
    default:
      return state;
  }
}; 
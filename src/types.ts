export interface Position {
  x: number;
  y: number;
}

export interface Snake {
  id: number;
  body: Position[];
  direction: Position;
  color: string;
  score: number;
  alive: boolean;
  powerUps: PowerUp[];
  speedMultiplier: number;
  invulnerable: boolean;
}

export interface GameConfig {
  gridSize: number;
  snakeCount: number;
  gameSpeed: number;
  cellSize?: number;
}

export interface PowerUp {
  position: Position;
  type: 'speed' | 'shield' | 'multiplier';
  active: boolean;
  duration: number;
}

export interface GameState {
  snakes: Snake[];
  fruits: Position[];
  powerUps: PowerUp[];
  width: number;
  height: number;
}

export type GameAction = 
  | { type: 'INIT_SNAKES'; payload: Snake[] }
  | { type: 'MOVE_SNAKES' }
  | { type: 'CHECK_FRUIT_CONSUMPTION' }
  | { type: 'CHECK_POWERUPS' }
  | { type: 'ADD_POWERUP'; payload: PowerUp }
  | { type: 'CHECK_COLLISIONS' }
  | { type: 'UPDATE_FRUITS'; payload: Position[] }
  | { type: 'UPDATE_POWERUPS'; payload: PowerUp[] }; 
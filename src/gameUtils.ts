import { Position, Snake } from './types';
import { CELL_SIZE, DIRECTIONS } from './constants';

export const getRandomPosition = (width: number, height: number): Position => ({
  x: Math.floor(Math.random() * width),
  y: Math.floor(Math.random() * height),
});

export const moveSnake = (snake: Snake, direction: Position, width: number, height: number): Snake => {
  const newHead = {
    x: snake.body[0].x + direction.x,
    y: snake.body[0].y + direction.y,
  };

  if (newHead.x < 0 || newHead.x >= width || newHead.y < 0 || newHead.y >= height) {
    console.log(`Snake ${snake.id} hit wall - respawning`);
    return respawnSnake(snake, width, height);
  }

  return {
    ...snake,
    body: [newHead, ...snake.body.slice(0, -1)],
    direction,
  };
};

export const checkCollisions = (snakes: Snake[], width: number, height: number): Snake[] => {
  return snakes.map(snake => {
    if (!snake.alive) return snake;
    
    const head = snake.body[0];
    const wallCollision = head.x < 0 || head.x >= width || head.y < 0 || head.y >= height;
    const selfCollision = snake.body.slice(1).some(segment => segment.x === head.x && segment.y === head.y);
    
    return { ...snake, alive: !(wallCollision || selfCollision) };
  });
};

export const findNearestFruit = (head: Position, fruits: Position[]): Position | null => {
  if (fruits.length === 0) return null;
  
  return fruits.reduce((nearest, fruit) => {
    const currentDist = Math.hypot(head.x - nearest.x, head.y - nearest.y);
    const newDist = Math.hypot(head.x - fruit.x, head.y - fruit.y);
    return newDist < currentDist ? fruit : nearest;
  });
};

export const calculateBestDirection = (
  head: Position,
  target: Position | null,
  width: number,
  height: number,
  snakes: Snake[]
): Position => {
  // Get all snake body segments
  const allSegments = snakes.flatMap(s => s.body);
  
  const possibleMoves = DIRECTIONS.map(dir => ({
    dir,
    pos: { x: head.x + dir.x, y: head.y + dir.y }
  }));

  const validMoves = possibleMoves.filter(move => 
    move.pos.x >= 0 && move.pos.x < width &&
    move.pos.y >= 0 && move.pos.y < height
  );

  const scoredMoves = validMoves.map(move => {
    let riskScore = 0;
    
    // Immediate collision check
    const willCollide = allSegments.some(segment => 
      segment.x === move.pos.x && segment.y === move.pos.y
    );
    
    // Nearby snake detection (3x3 area)
    const nearbyDanger = allSegments.some(segment =>
      Math.abs(segment.x - move.pos.x) <= 1 &&
      Math.abs(segment.y - move.pos.y) <= 1
    );

    // Future path prediction
    const futurePosition = {
      x: move.pos.x + move.dir.x,
      y: move.pos.y + move.dir.y
    };
    
    const futureDanger = allSegments.some(segment =>
      segment.x === futurePosition.x && 
      segment.y === futurePosition.y
    );

    riskScore += willCollide ? 1000 : 0;
    riskScore += nearbyDanger ? 50 : 0;
    riskScore += futureDanger ? 30 : 0;

    const targetDist = target ? 
      Math.hypot(target.x - move.pos.x, target.y - move.pos.y) : 0;

    return { 
      move, 
      score: targetDist + riskScore,
      priority: target ? 1 : 0 
    };
  });

  // Find safest move with lowest score
  return scoredMoves.reduce((best, current) => 
    current.score < best.score ? current : best
  ).move.dir;
};

const collisionGrid = new Map<string, boolean>();

export const checkCollision = (
  pos: Position,
  snakes: Snake[],
  width: number,
  height: number,
  currentSnakeId: number
) => {
  const wallCollision = pos.x < 0 || pos.x >= width || pos.y < 0 || pos.y >= height;
  if (wallCollision) {
    console.warn(`Wall collision at ${pos.x},${pos.y} by snake ${currentSnakeId}`);
    return true;
  }

  const collisionDetected = snakes.some(snake => 
    snake.body.some((segment, index) => {
      if (snake.id === currentSnakeId && index === 0) return false;
      const colliding = segment.x === pos.x && segment.y === pos.y;
      if (colliding) {
        console.warn(`Collision between snake ${currentSnakeId} and ${
          snake.id === currentSnakeId ? 'its own body' : `snake ${snake.id}`
        } at ${pos.x},${pos.y}`);
      }
      return colliding;
    })
  );

  return collisionDetected;
};

// Call this at start of each frame
export const resetCollisionGrid = () => collisionGrid.clear();

export const respawnSnake = (snake: Snake, width: number, height: number): Snake => {
  const newPosition = getRandomPosition(width, height);
  const validDirections = DIRECTIONS.filter(dir => {
    const newX = newPosition.x + dir.x;
    const newY = newPosition.y + dir.y;
    return newX >= 0 && newX < width && newY >= 0 && newY < height;
  });
  
  return {
    ...snake,
    body: [newPosition],
    direction: validDirections[Math.floor(Math.random() * validDirections.length)] || DIRECTIONS[0],
    alive: true,
    score: Math.max(0, snake.score - 10), // Penalty for dying
  };
}; 
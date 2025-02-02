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
    body: snake.body.length < 3 
      ? [newHead, ...snake.body] // Grow until 3 segments
      : [newHead, ...snake.body.slice(0, -1)], // Normal movement
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

const posKey = (pos: Position) => `${pos.x},${pos.y}`;

function findPath(
  start: Position,
  goal: Position,
  width: number,
  height: number,
  obstacles: Set<string>
): Position[] | null {
  const heuristic = (a: Position, b: Position) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  const openSet: Position[] = [start];
  const cameFrom: { [key: string]: Position } = {};
  const gScore: { [key: string]: number } = { [posKey(start)]: 0 };
  const fScore: { [key: string]: number } = { [posKey(start)]: heuristic(start, goal) };

  while (openSet.length > 0) {
    let current = openSet.reduce((min, pos) => fScore[posKey(pos)] < fScore[posKey(min)] ? pos : min, openSet[0]);
    
    if (current.x === goal.x && current.y === goal.y) {
      const path = [current];
      while (cameFrom[posKey(current)]) {
        current = cameFrom[posKey(current)];
        path.unshift(current);
      }
      return path;
    }

    openSet.splice(openSet.indexOf(current), 1);
    
    for (const dir of DIRECTIONS) {
      const neighbor = { x: current.x + dir.x, y: current.y + dir.y };
      if (neighbor.x < 0 || neighbor.x >= width || neighbor.y < 0 || neighbor.y >= height) continue;
      if (obstacles.has(posKey(neighbor))) continue;

      const tentativeGScore = gScore[posKey(current)] + 1;
      if (tentativeGScore < (gScore[posKey(neighbor)] ?? Infinity)) {
        cameFrom[posKey(neighbor)] = current;
        gScore[posKey(neighbor)] = tentativeGScore;
        fScore[posKey(neighbor)] = tentativeGScore + heuristic(neighbor, goal);
        if (!openSet.some(p => p.x === neighbor.x && p.y === neighbor.y)) {
          openSet.push(neighbor);
        }
      }
    }
  }
  return null;
}

export const calculateBestDirection = (
  head: Position,
  target: Position | null,
  width: number,
  height: number,
  snakes: Snake[]
): Position => {
  const obstacles = new Set<string>();
  const currentSnake = snakes.find(s => s.body[0].x === head.x && s.body[0].y === head.y);
  
  // Collect all obstacles (other snake bodies and self body except head)
  snakes.forEach(snake => {
    snake.body.forEach((segment, index) => {
      if (snake === currentSnake && index === 0) return;
      obstacles.add(posKey(segment));
    });
  });

  // Try to find path to fruit first
  if (target) {
    const path = findPath(head, target, width, height, obstacles);
    if (path && path.length > 1) {
      const nextStep = path[1];
      return DIRECTIONS.find(d => 
        d.x === (nextStep.x - head.x) && 
        d.y === (nextStep.y - head.y)
      ) || DIRECTIONS[0];
    }
  }

  // Fallback to safe move selection
  const safeMoves = DIRECTIONS.filter(dir => {
    const newPos = { x: head.x + dir.x, y: head.y + dir.y };
    return newPos.x >= 0 && newPos.x < width &&
           newPos.y >= 0 && newPos.y < height &&
           !obstacles.has(posKey(newPos));
  });

  if (safeMoves.length > 0) {
    // Prefer moves with most open space
    const scoredMoves = safeMoves.map(dir => {
      const pos = { x: head.x + dir.x, y: head.y + dir.y };
      const openSpace = DIRECTIONS.filter(d => {
        const check = { x: pos.x + d.x, y: pos.y + d.y };
        return check.x >= 0 && check.x < width &&
               check.y >= 0 && check.y < height &&
               !obstacles.has(posKey(check));
      }).length;
      return { dir, score: openSpace + Math.random() };
    });
    
    return scoredMoves.reduce((best, curr) => curr.score > best.score ? curr : best).dir;
  }

  // No safe moves, try to reverse as last resort
  return currentSnake?.direction || DIRECTIONS[0];
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
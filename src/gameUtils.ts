import { Position, Snake } from './types';
import { CELL_SIZE, DIRECTIONS } from './constants';

// Cache for position strings to avoid repeated string creation
const positionCache = new Map<string, string>();
const getPositionKey = (x: number, y: number): string => {
  const key = `${x},${y}`;
  if (!positionCache.has(key)) {
    positionCache.set(key, key);
  }
  return positionCache.get(key)!;
};

// Optimized random position generation that avoids snake bodies
export const getRandomPosition = (width: number, height: number, snakes: Snake[]): Position => {
  // Create a quick lookup set for snake body positions
  const occupiedPositions = new Set<string>();
  snakes.forEach(snake => {
    snake.body.forEach(pos => {
      occupiedPositions.add(getPositionKey(pos.x, pos.y));
    });
  });

  let attempts = 0;
  let position: Position;
  
  do {
    position = {
      x: Math.floor(Math.random() * width),
      y: Math.floor(Math.random() * height)
    };
    attempts++;
    // Prevent infinite loops
    if (attempts > 100) {
      // Find first available position if random fails
      for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
          if (!occupiedPositions.has(getPositionKey(x, y))) {
            return { x, y };
          }
        }
      }
      // If no position found, return a position anyway (edge case)
      return position;
    }
  } while (occupiedPositions.has(getPositionKey(position.x, position.y)));

  return position;
};

export const moveSnake = (snake: Snake, direction: Position, width: number, height: number): Snake => {
  const newHead = {
    x: snake.body[0].x + direction.x,
    y: snake.body[0].y + direction.y,
  };

  if (newHead.x < 0 || newHead.x >= width || newHead.y < 0 || newHead.y >= height) {
    console.log(`Snake ${snake.id} hit wall - respawning`);
    return respawnSnake(snake, width, height, []);
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

// Add a maximum search distance to limit pathfinding calculations
const MAX_SEARCH_DISTANCE = 20;

export const findNearestFruit = (position: Position, fruits: Position[]): Position => {
  let nearestFruit = fruits[0];
  let minDistance = Number.MAX_VALUE;

  fruits.forEach(fruit => {
    const distance = Math.abs(fruit.x - position.x) + Math.abs(fruit.y - position.y);
    if (distance < minDistance) {
      minDistance = distance;
      nearestFruit = fruit;
    }
  });

  return nearestFruit;
};

const posKey = (pos: Position) => `${pos.x},${pos.y}`;

function findPath(
  start: Position,
  goal: Position,
  width: number,
  height: number,
  snakes: Snake[],
  currentSnakeId: number
): Position[] | null {
  const openSet = new Map<string, Position>();
  const cameFrom = new Map<string, Position>();
  const gScore = new Map<string, number>();
  const fScore = new Map<string, number>();
  
  const posToString = (pos: Position) => `${pos.x},${pos.y}`;
  const startKey = posToString(start);
  
  openSet.set(startKey, start);
  gScore.set(startKey, 0);
  fScore.set(startKey, manhattanDistance(start, goal));
  
  while (openSet.size > 0) {
    const current = getLowestFScore(Array.from(openSet.values()), fScore, posToString);
    const currentKey = posToString(current);
    
    if (currentKey === posToString(goal)) {
      return reconstructPath(cameFrom, current);
    }
    
    openSet.delete(currentKey);
    
    for (const dir of DIRECTIONS) {
      const neighbor = {
        x: current.x + dir.x,
        y: current.y + dir.y
      };
      
      if (
        neighbor.x < 0 || neighbor.x >= width ||
        neighbor.y < 0 || neighbor.y >= height ||
        checkCollision(neighbor, snakes, width, height, currentSnakeId)
      ) {
        continue;
      }
      
      const neighborKey = posToString(neighbor);
      const tentativeGScore = gScore.get(currentKey)! + 1;
      
      if (!gScore.has(neighborKey) || tentativeGScore < gScore.get(neighborKey)!) {
        cameFrom.set(neighborKey, current);
        gScore.set(neighborKey, tentativeGScore);
        fScore.set(neighborKey, tentativeGScore + manhattanDistance(neighbor, goal));
        openSet.set(neighborKey, neighbor);
      }
    }
  }
  
  return null;
}

function manhattanDistance(a: Position, b: Position): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function getLowestFScore(
  positions: Position[],
  fScore: Map<string, number>,
  posToString: (pos: Position) => string
): Position {
  return positions.reduce((lowest, pos) => {
    const score = fScore.get(posToString(pos)) ?? Infinity;
    const lowestScore = fScore.get(posToString(lowest)) ?? Infinity;
    return score < lowestScore ? pos : lowest;
  });
}

function reconstructPath(cameFrom: Map<string, Position>, current: Position): Position[] {
  const path = [current];
  const posToString = (pos: Position) => `${pos.x},${pos.y}`;
  let currentKey = posToString(current);
  
  while (cameFrom.has(currentKey)) {
    current = cameFrom.get(currentKey)!;
    currentKey = posToString(current);
    path.unshift(current);
  }
  
  return path;
}

// Add this helper function to predict potential collisions
function predictHeadCollision(
  myPos: Position,
  myDirection: Position,
  otherSnakeHeads: Position[],
  width: number,
  height: number
): boolean {
  const nextPos = {
    x: myPos.x + myDirection.x,
    y: myPos.y + myDirection.y
  };

  // Check if any other snake could move to our next position
  return otherSnakeHeads.some(head => {
    const distance = Math.abs(head.x - nextPos.x) + Math.abs(head.y - nextPos.y);
    return distance <= 1; // If another snake head is adjacent to our next position
  });
}

// Add this helper function to evaluate space around a position
function evaluateSpace(
  pos: Position,
  snakes: Snake[],
  width: number,
  height: number,
  currentSnakeId: number,
  depth: number = 3
): number {
  if (depth === 0) return 0;
  
  let spaceScore = 0;
  const visited = new Set<string>();
  const queue: [Position, number][] = [[pos, depth]];
  
  while (queue.length > 0) {
    const [current, currentDepth] = queue.shift()!;
    const key = `${current.x},${current.y}`;
    
    if (visited.has(key)) continue;
    visited.add(key);
    
    // Add score based on depth (further spaces worth less)
    spaceScore += currentDepth;
    
    if (currentDepth > 0) {
      for (const dir of DIRECTIONS) {
        const next = { x: current.x + dir.x, y: current.y + dir.y };
        if (next.x < 0 || next.x >= width || next.y < 0 || next.y >= height) continue;
        if (!checkCollision(next, snakes, width, height, currentSnakeId)) {
          queue.push([next, currentDepth - 1]);
        }
      }
    }
  }
  
  return spaceScore;
}

export const calculateBestDirection = (
  current: Position,
  target: Position,
  width: number,
  height: number,
  snakes: Snake[]
): Position => {
  const currentSnake = snakes.find(s => 
    s.body[0].x === current.x && s.body[0].y === current.y
  );
  const currentSnakeId = currentSnake?.id ?? -1;
  
  // Get other snake heads
  const otherSnakeHeads = snakes
    .filter(s => s.id !== currentSnakeId && s.alive)
    .map(s => s.body[0]);
  
  // Calculate distance to target
  const distance = Math.abs(target.x - current.x) + Math.abs(target.y - current.y);
  
  // Get all possible directions and score them
  const scoredDirections = DIRECTIONS.map(dir => {
    const newPos = { x: current.x + dir.x, y: current.y + dir.y };
    
    // Start with a base score
    let score = 0;
    
    // Heavily penalize collisions
    if (checkCollision(newPos, snakes, width, height, currentSnakeId)) {
      return { dir, score: -1000 };
    }
    
    // Penalize head-on collisions
    if (predictHeadCollision(current, dir, otherSnakeHeads, width, height)) {
      score -= 500;
    }
    
    // Evaluate available space in the new position
    const spaceScore = evaluateSpace(newPos, snakes, width, height, currentSnakeId);
    score += spaceScore * 10;
    
    // Add score for moving towards target if not too dangerous
    if (spaceScore > 5) {
      const newDistance = Math.abs(target.x - newPos.x) + Math.abs(target.y - newPos.y);
      if (newDistance < distance) {
        score += 50;
      }
    }
    
    // Penalize moves that could trap the snake
    if (currentSnake && wouldTrapSnake(current, dir, currentSnake, snakes, width, height)) {
      score -= 300;
    }
    
    // Bonus for moves that maintain distance from other snakes
    const minDistanceToOthers = otherSnakeHeads.reduce((minDist, head) => {
      const dist = Math.abs(newPos.x - head.x) + Math.abs(newPos.y - head.y);
      return Math.min(minDist, dist);
    }, Infinity);
    score += minDistanceToOthers * 5;
    
    return { dir, score };
  });
  
  // Sort directions by score and get the best one
  const bestDirection = scoredDirections
    .filter(({ score }) => score > -1000) // Filter out impossible moves
    .sort((a, b) => b.score - a.score)[0];
  
  // If we found a valid direction, use it
  if (bestDirection) {
    return bestDirection.dir;
  }
  
  // Fallback to any safe direction if no good options found
  const safeDirections = DIRECTIONS.filter(dir => {
    const newPos = { x: current.x + dir.x, y: current.y + dir.y };
    return !checkCollision(newPos, snakes, width, height, currentSnakeId);
  });
  
  return safeDirections.length > 0 
    ? safeDirections[Math.floor(Math.random() * safeDirections.length)]
    : DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
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

// Check if a move would trap the snake
function wouldTrapSnake(
  pos: Position,
  direction: Position,
  snake: Snake,
  snakes: Snake[],
  width: number,
  height: number
): boolean {
  // Simulate the move
  const newHead = { x: pos.x + direction.x, y: pos.y + direction.y };
  const newBody = [newHead, ...snake.body.slice(0, -1)];
  
  // Quick check for immediate surroundings after move
  let accessibleSpaces = 0;
  const checked = new Set<string>();
  const queue: Position[] = [newHead];
  
  while (queue.length > 0 && accessibleSpaces < 8) { // Only need to check a few spaces to know it's not trapped
    const current = queue.shift()!;
    const key = getPositionKey(current.x, current.y);
    
    if (checked.has(key)) continue;
    checked.add(key);
    
    for (const dir of DIRECTIONS) {
      const next = { x: current.x + dir.x, y: current.y + dir.y };
      const nextKey = getPositionKey(next.x, next.y);
      
      if (next.x < 0 || next.x >= width || next.y < 0 || next.y >= height) continue;
      if (checked.has(nextKey)) continue;
      
      // Check if position is occupied by any snake
      let isOccupied = false;
      for (const s of snakes) {
        if (s.body.some(segment => segment.x === next.x && segment.y === next.y)) {
          isOccupied = true;
          break;
        }
      }
      
      if (!isOccupied) {
        accessibleSpaces++;
        queue.push(next);
      }
    }
  }
  
  return accessibleSpaces < 3; // Consider trapped if less than 3 spaces accessible
}

// Optimize direction scoring with a cache
const directionScoreCache = new Map<string, number>();

function getDirectionScore(
  pos: Position,
  dir: Position,
  snakes: Snake[],
  width: number,
  height: number,
  currentSnakeId: number
): number {
  const cacheKey = `${pos.x},${pos.y},${dir.x},${dir.y},${currentSnakeId}`;
  if (directionScoreCache.has(cacheKey)) {
    return directionScoreCache.get(cacheKey)!;
  }

  const newPos = { x: pos.x + dir.x, y: pos.y + dir.y };
  let score = 0;

  // Check open spaces
  for (const checkDir of DIRECTIONS) {
    const checkPos = { 
      x: newPos.x + checkDir.x, 
      y: newPos.y + checkDir.y 
    };
    if (!checkCollision(checkPos, snakes, width, height, currentSnakeId)) {
      score += 2;
    }
  }

  // Penalize moves that could trap the snake
  const currentSnake = snakes.find(s => s.id === currentSnakeId);
  if (currentSnake && wouldTrapSnake(pos, dir, currentSnake, snakes, width, height)) {
    score -= 10;
  }

  directionScoreCache.set(cacheKey, score);
  return score;
}

// Clear caches periodically to prevent memory bloat
export const clearCaches = () => {
  if (positionCache.size > 1000) positionCache.clear();
  if (directionScoreCache.size > 1000) directionScoreCache.clear();
};

// Update respawnSnake to use the new getRandomPosition
export const respawnSnake = (snake: Snake, width: number, height: number, snakes: Snake[]): Snake => {
  const newPosition = getRandomPosition(width, height, snakes);
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
    score: Math.max(0, snake.score - 10),
  };
}; 
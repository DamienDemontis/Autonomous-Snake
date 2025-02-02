export const CELL_SIZE = 20;
export const CYBER_COLORS = [
  '#00ff9d', // Neon Green
  '#00ff41', // Matrix Green
  '#39ff14', // Electric Lime
  '#7fff00', // Chartreuse
  '#adff2f'  // Green-Yellow
];
export const DIRECTIONS = [
  { x: 1, y: 0 },  // Right
  { x: 0, y: 1 },  // Down
  { x: -1, y: 0 }, // Left
  { x: 0, y: -1 }, // Up
];

export const DEFAULT_CONFIG = {
  gridSize: 30,
  snakeCount: 4,
  gameSpeed: 10
};

export const POWERUP_COLORS = {
  speed: '#7df9ff',
  shield: '#6a0dad',
  multiplier: '#ff44cc'
};

export const POWERUP_DURATION = 5000; // 5 seconds 

export const generateUniqueColors = (count: number): string[] => {
  const colors = [];
  const hueStep = 360 / count;
  for(let i = 0; i < count; i++) {
    colors.push(`hsl(${i * hueStep}, 100%, 50%)`);
  }
  return colors;
}; 